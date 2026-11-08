// Testes da lista de espera (api/leads.js e api/interesse.js) com um Redis simulado.
// Nenhuma chamada de rede de verdade. Rodar com: node --test testes/
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const leads = require(path.join(__dirname, '..', 'api', 'leads.js'));
const interesse = require(path.join(__dirname, '..', 'api', 'interesse.js'));
const L = require(path.join(__dirname, '..', 'api', '_leads.js'));

// ---------- Redis simulado (só os comandos que usamos) ----------
function criarRedis() {
  const dados = new Map();
  const executar = ([cmd, chave, ...resto]) => {
    switch (cmd) {
      case 'INCR': dados.set(chave, String(Number(dados.get(chave) || 0) + 1)); return Number(dados.get(chave));
      case 'DECR': dados.set(chave, String(Number(dados.get(chave) || 0) - 1)); return Number(dados.get(chave));
      case 'EXPIRE': return 1;
      case 'GET': return dados.has(chave) ? dados.get(chave) : null;
      case 'HSET': {
        const h = dados.get(chave) || {};
        for (let i = 0; i < resto.length; i += 2) h[resto[i]] = resto[i + 1];
        dados.set(chave, h);
        return resto.length / 2;
      }
      case 'HGET': { const h = dados.get(chave); return h && h[resto[0]] !== undefined ? h[resto[0]] : null; }
      case 'HGETALL': { const h = dados.get(chave) || {}; return Object.entries(h).flat(); }
      case 'SADD': { const s = dados.get(chave) || new Set(); s.add(resto[0]); dados.set(chave, s); return 1; }
      case 'SMEMBERS': return [...(dados.get(chave) || [])];
      default: throw new Error(`comando não simulado: ${cmd}`);
    }
  };
  const fetchFalso = async (url, opcoes) => {
    const corpo = JSON.parse(opcoes.body);
    const resultado = url.endsWith('/pipeline')
      ? corpo.map((partes) => ({ result: executar(partes) }))
      : { result: executar(corpo) };
    return { ok: true, status: 200, json: async () => resultado };
  };
  return { dados, fetchFalso };
}

function resFalsa() {
  return {
    statusCode: 0,
    corpo: null,
    headers: {},
    status(codigo) { this.statusCode = codigo; return this; },
    json(corpo) { this.corpo = corpo; return this; },
    setHeader(nome, valor) { this.headers[nome] = valor; },
  };
}

const VARIAVEIS = { KV_REST_API_URL: 'https://redis-falso.exemplo', KV_REST_API_TOKEN: 'token-falso', LEADS_SAL: 'sal-falso' };

// Chama o handler com variáveis, fetch e console simulados. Guarda tudo o que foi logado.
async function chamar(handler, corpo, { redis = criarRedis(), variaveis = VARIAVEIS, ip = '200.1.2.3', metodo = 'POST' } = {}) {
  const originais = { fetch: global.fetch, log: console.log, error: console.error, env: { ...process.env } };
  const logs = [];
  ['KV_REST_API_URL', 'KV_REST_API_TOKEN', 'LEADS_SAL'].forEach((k) => { delete process.env[k]; });
  Object.assign(process.env, variaveis);
  global.fetch = redis.fetchFalso;
  console.log = (...a) => logs.push(a.join(' '));
  console.error = (...a) => logs.push(a.join(' '));
  const res = resFalsa();
  try {
    await handler({ method: metodo, body: corpo, headers: { 'x-forwarded-for': ip } }, res);
  } finally {
    global.fetch = originais.fetch;
    console.log = originais.log;
    console.error = originais.error;
    process.env = originais.env;
  }
  return { res, logs, redis };
}

// Dados fictícios (nenhum dado real).
const BASE = { email: 'Mae.Teste@Exemplo.com', plano: 'gratuito', uf: 'sp', anos: ['5', '6'], whatsapp: '(11) 91234-5678', consentimento: true };

test('validação: aceita um pedido completo e limpa os campos', () => {
  const v = L.validar(BASE);
  assert.strictEqual(v.ok, true);
  assert.strictEqual(v.lead.email, 'mae.teste@exemplo.com');
  assert.strictEqual(v.lead.uf, 'SP');
  assert.strictEqual(v.lead.whatsapp, '11912345678');
});

test('validação: recusa e-mail, plano, UF, anos e WhatsApp fora das regras', () => {
  assert.strictEqual(L.validar({ ...BASE, email: 'sem-arroba' }).erro, 'email');
  assert.strictEqual(L.validar({ ...BASE, consentimento: 'true' }).erro, 'consentimento');
  assert.strictEqual(L.validar({ ...BASE, plano: 'premium' }).erro, 'plano');
  assert.strictEqual(L.validar({ ...BASE, uf: 'XX' }).erro, 'uf');
  assert.strictEqual(L.validar({ ...BASE, anos: ['9'] }).erro, 'anos');
  assert.strictEqual(L.validar({ ...BASE, whatsapp: '123' }).erro, 'whatsapp');
});

test('validação: formulário curto (só e-mail, plano indefinido e consentimento) é válido', () => {
  const v = L.validar({ email: 'a@b.com', plano: 'indefinido', consentimento: true });
  assert.strictEqual(v.ok, true);
  assert.strictEqual(v.lead.uf, '');
});

test('sem as variáveis do Redis: responde 503 indisponível', async () => {
  const { res } = await chamar(leads, BASE, { variaveis: {} });
  assert.strictEqual(res.statusCode, 503);
  assert.deepStrictEqual(res.corpo, { erro: 'indisponivel' });
});

test('salva o lead com e-mail em hash na chave e soma os contadores', async () => {
  const { res, redis } = await chamar(leads, { ...BASE, origem: { utm_source: 'whatsapp' } });
  assert.strictEqual(res.statusCode, 200);
  const chave = `lead:${L.sha256('mae.teste@exemplo.com')}`;
  const salvo = redis.dados.get(chave);
  assert.strictEqual(salvo.email, 'mae.teste@exemplo.com');
  assert.strictEqual(salvo.plano, 'gratuito');
  assert.strictEqual(salvo.anos, '5,6');
  assert.strictEqual(salvo.utm_source, 'whatsapp');
  assert.ok(salvo.consentimentoEm);
  assert.strictEqual(redis.dados.get('contagem:plano:gratuito'), '1');
  assert.strictEqual(redis.dados.get('contagem:uf:SP'), '1');
  assert.strictEqual(redis.dados.get(`contagem:dia:${L.dia()}`), '1');
});

test('honeypot preenchido: responde 200 e não guarda nada', async () => {
  const { res, redis } = await chamar(leads, { ...BASE, site: 'http://spam.exemplo' });
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(redis.dados.size, 0);
});

test('e-mail repetido não cria outro lead; atualiza o plano e os contadores', async () => {
  const redis = criarRedis();
  await chamar(leads, { email: 'mae@exemplo.com', plano: 'indefinido', consentimento: true }, { redis });
  const { res } = await chamar(leads, { ...BASE, email: 'MAE@exemplo.com', plano: 'voz_familia' }, { redis });
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(redis.dados.get('leads').size, 1);
  const salvo = redis.dados.get(`lead:${L.sha256('mae@exemplo.com')}`);
  assert.strictEqual(salvo.plano, 'voz_familia');
  assert.strictEqual(salvo.uf, 'SP');
  assert.strictEqual(redis.dados.get('contagem:plano:indefinido'), '0');
  assert.strictEqual(redis.dados.get('contagem:plano:voz_familia'), '1');
});

test('limite: no máximo 5 envios por hora para o mesmo IP', async () => {
  const redis = criarRedis();
  for (let i = 0; i < 5; i += 1) {
    const { res } = await chamar(leads, { ...BASE, email: `mae${i}@exemplo.com` }, { redis });
    assert.strictEqual(res.statusCode, 200);
  }
  const { res } = await chamar(leads, { ...BASE, email: 'mae9@exemplo.com' }, { redis });
  assert.strictEqual(res.statusCode, 429);
  assert.deepStrictEqual(res.corpo, { erro: 'limite' });
  // Outro IP continua podendo enviar.
  const outro = await chamar(leads, { ...BASE, email: 'outra@exemplo.com' }, { redis, ip: '200.9.9.9' });
  assert.strictEqual(outro.res.statusCode, 200);
});

test('o IP nunca é guardado puro, só em hash', async () => {
  const { redis } = await chamar(leads, BASE, { ip: '200.1.2.3' });
  const tudo = JSON.stringify([...redis.dados.keys()]);
  assert.ok(!tudo.includes('200.1.2.3'));
});

test('logs não têm e-mail nem telefone', async () => {
  const { logs } = await chamar(leads, BASE);
  const texto = logs.join('\n');
  assert.ok(logs.length > 0);
  assert.ok(!texto.includes('exemplo.com'));
  assert.ok(!texto.toLowerCase().includes('mae.teste'));
  assert.ok(!texto.includes('91234'));
});

test('erro no Redis: responde 503 e o log só tem o código', async () => {
  const quebrado = { dados: new Map(), fetchFalso: async () => ({ ok: false, status: 500, json: async () => ({}) }) };
  const { res, logs } = await chamar(leads, BASE, { redis: quebrado });
  assert.strictEqual(res.statusCode, 503);
  assert.ok(logs.some((l) => l.includes('redis_http_500')));
  assert.ok(!logs.join(' ').includes('exemplo.com'));
});

test('interesse: soma o clique do plano e recusa plano desconhecido', async () => {
  const redis = criarRedis();
  const ok = await chamar(interesse, { plano: 'voz_familia' }, { redis });
  assert.strictEqual(ok.res.statusCode, 200);
  assert.strictEqual(redis.dados.get('clique:plano:voz_familia'), '1');
  const ruim = await chamar(interesse, { plano: 'indefinido' }, { redis });
  assert.strictEqual(ruim.res.statusCode, 400);
});

test('só aceita POST', async () => {
  const { res } = await chamar(leads, BASE, { metodo: 'GET' });
  assert.strictEqual(res.statusCode, 405);
});
