// Testes da integração com o Google Agenda (api/google/*) com o Google simulado.
// Rodar com: node --test testes/
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const pasta = path.join(__dirname, '..', 'api', 'google');
const G = require(path.join(pasta, '_comum.js'));
const login = require(path.join(pasta, 'login.js'));
const callback = require(path.join(pasta, 'callback.js'));
const criarEvento = require(path.join(pasta, 'criar-evento.js'));
const desconectar = require(path.join(pasta, 'desconectar.js'));

const AMBIENTE = {
  GOOGLE_CLIENT_ID: 'id-falso.apps.googleusercontent.com',
  GOOGLE_CLIENT_SECRET: 'segredo-falso-do-cliente',
  GOOGLE_REDIRECT_URI: 'https://lumi-teste.vercel.app/api/google/callback',
};
const REFRESH = 'REFRESH-TOKEN-SECRETO-1234';
const ACESSO = 'ACCESS-TOKEN-SECRETO-5678';

function resFalsa() {
  return {
    statusCode: 200, headers: {}, corpo: null, fim: false,
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    status(c) { this.statusCode = c; return this; },
    json(c) { this.corpo = c; return this; },
    end() { this.fim = true; },
  };
}

function resposta(status, corpo) {
  return { ok: status >= 200 && status < 300, status, json: async () => corpo };
}

// Executa um handler com ambiente, Google simulado e captura de logs.
async function rodar(handler, req, rotas = [], ambiente = AMBIENTE) {
  const guardado = {};
  Object.keys(AMBIENTE).forEach((k) => { guardado[k] = process.env[k]; delete process.env[k]; });
  Object.assign(process.env, ambiente);
  const fetchOriginal = global.fetch;
  const erroOriginal = console.error;
  const logs = [];
  const pedidos = [];
  console.error = (...a) => logs.push(a.join(' '));
  global.fetch = async (url, opcoes = {}) => {
    pedidos.push({ url, opcoes });
    const rota = rotas.find(([trecho]) => url.startsWith(trecho));
    if (!rota) throw new Error(`chamada inesperada: ${url}`);
    return rota[1](url, opcoes);
  };
  try {
    const res = resFalsa();
    await handler({ method: 'GET', query: {}, headers: {}, body: {}, ...req }, res);
    return { res, pedidos, logs };
  } finally {
    global.fetch = fetchOriginal;
    console.error = erroOriginal;
    Object.keys(AMBIENTE).forEach((k) => { if (guardado[k] === undefined) delete process.env[k]; else process.env[k] = guardado[k]; });
  }
}

function cookiesDe(res) {
  const lista = res.headers['set-cookie'] || [];
  return Array.isArray(lista) ? lista : [lista];
}

function valorDoCookie(res, nome) {
  const linha = cookiesDe(res).find((c) => c.startsWith(`${nome}=`));
  return linha ? decodeURIComponent(linha.split(';')[0].slice(nome.length + 1)) : null;
}

// Faz login + callback e devolve o cookie do token (como o navegador guardaria).
async function entrar() {
  const passo1 = await rodar(login, {});
  const url = new URL(passo1.res.headers.location);
  const estadoCookie = valorDoCookie(passo1.res, G.COOKIE_ESTADO);
  const passo2 = await rodar(callback, {
    query: { code: 'codigo-falso', state: url.searchParams.get('state') },
    headers: { cookie: `${G.COOKIE_ESTADO}=${encodeURIComponent(estadoCookie)}` },
  }, [[G.URL_TOKEN, () => resposta(200, { access_token: ACESSO, refresh_token: REFRESH, scope: G.ESCOPO, expires_in: 3599 })]]);
  return { passo1, passo2, url, cookieToken: valorDoCookie(passo2.res, G.COOKIE_TOKEN) };
}

const PROVA = { materia: 'Matemática', nome: 'Prova de frações', data: '2026-11-27', hora: '08:00' };

// ---------- cookie criptografado ----------

test('cookie: cifra e decifra; alterado ou com outra chave vira null', () => {
  const texto = G.cifrar({ refresh: REFRESH }, 'chave-a');
  assert.ok(!texto.includes(REFRESH));
  assert.deepStrictEqual(G.decifrar(texto, 'chave-a'), { refresh: REFRESH });
  assert.strictEqual(G.decifrar(texto, 'chave-b'), null);
  const alterado = `${texto.slice(0, -2)}${texto.endsWith('A') ? 'B' : 'A'}A`;
  assert.strictEqual(G.decifrar(alterado, 'chave-a'), null);
  assert.strictEqual(G.decifrar('', 'chave-a'), null);
});

// ---------- login ----------

test('login: leva ao consentimento com escopo calendar.events, offline, estado e PKCE', async () => {
  const { res } = await rodar(login, {});
  assert.strictEqual(res.statusCode, 302);
  const url = new URL(res.headers.location);
  assert.strictEqual(url.origin + url.pathname, G.URL_CONSENTIMENTO);
  assert.strictEqual(url.searchParams.get('scope'), 'https://www.googleapis.com/auth/calendar.events');
  assert.strictEqual(url.searchParams.get('access_type'), 'offline');
  assert.strictEqual(url.searchParams.get('code_challenge_method'), 'S256');
  assert.strictEqual(url.searchParams.get('redirect_uri'), AMBIENTE.GOOGLE_REDIRECT_URI);
  assert.ok(url.searchParams.get('state'));
  const cookie = cookiesDe(res).find((c) => c.startsWith(G.COOKIE_ESTADO));
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /Path=\/api\/google/);
});

test('login: sem as variáveis do Google, volta ao app avisando', async () => {
  const { res } = await rodar(login, {}, [], {});
  assert.strictEqual(res.headers.location, '/?google=nao_configurado');
});

// ---------- callback ----------

test('callback: guarda o refresh token só no cookie criptografado (httpOnly, Secure)', async () => {
  const { passo2, cookieToken } = await entrar();
  assert.strictEqual(passo2.res.headers.location, 'https://lumi-teste.vercel.app/?google=conectado');
  const linha = cookiesDe(passo2.res).find((c) => c.startsWith(`${G.COOKIE_TOKEN}=`));
  assert.match(linha, /HttpOnly; Secure; SameSite=Lax/);
  assert.ok(!linha.includes(REFRESH));
  assert.deepStrictEqual(G.decifrar(cookieToken, AMBIENTE.GOOGLE_CLIENT_SECRET), { refresh: REFRESH });
  const troca = passo2.pedidos[0];
  assert.match(String(troca.opcoes.body), /code_verifier=/);
});

test('callback: login cancelado volta com "cancelado" e não chama o Google', async () => {
  const { res, pedidos } = await rodar(callback, { query: { error: 'access_denied', state: 'x' } });
  assert.strictEqual(res.headers.location, 'https://lumi-teste.vercel.app/?google=cancelado');
  assert.strictEqual(pedidos.length, 0);
  assert.ok(!cookiesDe(res).some((c) => c.startsWith(`${G.COOKIE_TOKEN}=`) && !c.includes('Max-Age=0')));
});

test('callback: estado diferente (ou sem cookie) é recusado', async () => {
  const { passo1 } = await (async () => ({ passo1: await rodar(login, {}) }))();
  const estadoCookie = valorDoCookie(passo1.res, G.COOKIE_ESTADO);
  const { res, pedidos } = await rodar(callback, {
    query: { code: 'c', state: 'estado-errado' },
    headers: { cookie: `${G.COOKIE_ESTADO}=${encodeURIComponent(estadoCookie)}` },
  });
  assert.strictEqual(res.headers.location, 'https://lumi-teste.vercel.app/?google=erro&motivo=estado_diferente');
  assert.strictEqual(pedidos.length, 0);
  // Sem o cookie do estado: o login começou em outro endereço.
  const semCookie = await rodar(callback, { query: { code: 'c', state: 'x' } });
  assert.strictEqual(semCookie.res.headers.location, 'https://lumi-teste.vercel.app/?google=outro_endereco');
});

test('callback: permissão da agenda desmarcada volta com "sem_permissao"', async () => {
  const passo1 = await rodar(login, {});
  const url = new URL(passo1.res.headers.location);
  const { res } = await rodar(callback, {
    query: { code: 'c', state: url.searchParams.get('state') },
    headers: { cookie: `${G.COOKIE_ESTADO}=${encodeURIComponent(valorDoCookie(passo1.res, G.COOKIE_ESTADO))}` },
  }, [[G.URL_TOKEN, () => resposta(200, { access_token: ACESSO, refresh_token: REFRESH, scope: 'openid' })]]);
  assert.strictEqual(res.headers.location, 'https://lumi-teste.vercel.app/?google=sem_permissao');
});

// ---------- criar evento ----------

test('criar evento: sem login pede login', async () => {
  const { res, pedidos } = await rodar(criarEvento, { method: 'POST', body: PROVA });
  assert.strictEqual(res.statusCode, 401);
  assert.strictEqual(res.corpo.erro, 'sem_login');
  assert.strictEqual(pedidos.length, 0);
});

test('criar evento: título só com matéria e nome da prova, fuso de Brasília, 1 hora', async () => {
  const { cookieToken } = await entrar();
  const { res, pedidos } = await rodar(criarEvento, {
    method: 'POST',
    body: { ...PROVA, crianca: 'Nome da Criança', escola: 'Nome da Escola' },
    headers: { cookie: `${G.COOKIE_TOKEN}=${encodeURIComponent(cookieToken)}` },
  }, [
    [G.URL_TOKEN, () => resposta(200, { access_token: ACESSO })],
    [G.URL_EVENTOS, () => resposta(200, { id: 'ev1', htmlLink: 'https://calendar.google.com/event?eid=1' })],
  ]);
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.corpo.criado, true);
  const pedido = pedidos.find((p) => p.url === G.URL_EVENTOS);
  assert.strictEqual(pedido.opcoes.headers.authorization, `Bearer ${ACESSO}`);
  const evento = JSON.parse(pedido.opcoes.body);
  assert.strictEqual(evento.summary, 'Matemática – Prova de frações');
  assert.ok(!JSON.stringify(evento).includes('Criança') && !JSON.stringify(evento).includes('Escola'));
  assert.deepStrictEqual(evento.start, { dateTime: '2026-11-27T08:00:00', timeZone: 'America/Sao_Paulo' });
  assert.deepStrictEqual(evento.end, { dateTime: '2026-11-27T09:00:00', timeZone: 'America/Sao_Paulo' });
});

test('criar evento: acesso revogado no Google apaga o cookie e pede login de novo', async () => {
  const { cookieToken } = await entrar();
  const { res } = await rodar(criarEvento, {
    method: 'POST', body: PROVA, headers: { cookie: `${G.COOKIE_TOKEN}=${encodeURIComponent(cookieToken)}` },
  }, [[G.URL_TOKEN, () => resposta(400, { error: 'invalid_grant', error_description: 'Token has been expired or revoked.' })]]);
  assert.strictEqual(res.statusCode, 401);
  assert.deepStrictEqual(res.corpo, { erro: 'sem_login', motivo: 'revogado' });
  assert.ok(cookiesDe(res).some((c) => c.startsWith(`${G.COOKIE_TOKEN}=;`) && c.includes('Max-Age=0')));
});

test('criar evento: falha do Google devolve "falha" (o app oferece o .ics)', async () => {
  const { cookieToken } = await entrar();
  const { res } = await rodar(criarEvento, {
    method: 'POST', body: PROVA, headers: { cookie: `${G.COOKIE_TOKEN}=${encodeURIComponent(cookieToken)}` },
  }, [
    [G.URL_TOKEN, () => resposta(200, { access_token: ACESSO })],
    [G.URL_EVENTOS, () => resposta(500, { error: { message: 'Backend Error' } })],
  ]);
  assert.strictEqual(res.statusCode, 502);
  assert.strictEqual(res.corpo.erro, 'falha');
});

test('criar evento: dados inválidos são recusados', async () => {
  for (const body of [
    { ...PROVA, data: '2026-02-30' },
    { ...PROVA, hora: '25:00' },
    { ...PROVA, materia: '   ' },
  ]) {
    const { res } = await rodar(criarEvento, { method: 'POST', body });
    assert.strictEqual(res.statusCode, 400);
  }
});

test('evento que passa da meia-noite termina no dia seguinte', () => {
  assert.strictEqual(G.somarMinutos('2026-11-30', '23:30', 60), '2026-12-01T00:30:00');
});

// ---------- desconectar ----------

test('desconectar: revoga no Google e apaga o cookie', async () => {
  const { cookieToken } = await entrar();
  const { res, pedidos } = await rodar(desconectar, {
    method: 'POST', headers: { cookie: `${G.COOKIE_TOKEN}=${encodeURIComponent(cookieToken)}` },
  }, [[G.URL_REVOGAR, () => resposta(200, {})]]);
  assert.deepStrictEqual(res.corpo, { desconectado: true, revogado: true });
  assert.match(String(pedidos[0].opcoes.body), /token=REFRESH-TOKEN/);
  assert.ok(cookiesDe(res).some((c) => c.startsWith(`${G.COOKIE_TOKEN}=;`)));
});

// ---------- logs ----------

test('logs nunca têm tokens, código ou segredo', async () => {
  const passo1 = await rodar(login, {});
  const url = new URL(passo1.res.headers.location);
  const falha = await rodar(callback, {
    query: { code: 'CODIGO-SECRETO', state: url.searchParams.get('state') },
    headers: { cookie: `${G.COOKIE_ESTADO}=${encodeURIComponent(valorDoCookie(passo1.res, G.COOKIE_ESTADO))}` },
  }, [[G.URL_TOKEN, () => resposta(400, { error: 'invalid_grant', refresh_token: REFRESH })]]);
  const { cookieToken } = await entrar();
  const falha2 = await rodar(criarEvento, {
    method: 'POST', body: PROVA, headers: { cookie: `${G.COOKIE_TOKEN}=${encodeURIComponent(cookieToken)}` },
  }, [
    [G.URL_TOKEN, () => resposta(200, { access_token: ACESSO })],
    [G.URL_EVENTOS, () => resposta(500, {})],
  ]);
  const tudo = [...falha.logs, ...falha2.logs].join('\n');
  assert.ok(falha.logs.length && falha2.logs.length);
  for (const segredo of [REFRESH, ACESSO, 'CODIGO-SECRETO', AMBIENTE.GOOGLE_CLIENT_SECRET]) {
    assert.ok(!tudo.includes(segredo), segredo);
  }
});

test('título do evento não repete a matéria quando o nome já tem', () => {
  assert.strictEqual(G.tituloDoEvento('Matemática', 'Prova de Matemática'), 'Prova de Matemática');
  assert.strictEqual(G.tituloDoEvento('Matemática', 'Prova de frações'), 'Matemática – Prova de frações');
});

test('criar evento: token expirado (invalid_grant) também apaga o cookie e pede login', async () => {
  const { cookieToken } = await entrar();
  const { res } = await rodar(criarEvento, {
    method: 'POST', body: PROVA, headers: { cookie: `${G.COOKIE_TOKEN}=${encodeURIComponent(cookieToken)}` },
  }, [[G.URL_TOKEN, () => resposta(400, { error: 'invalid_grant', error_description: 'Token has been expired.' })]]);
  assert.strictEqual(res.statusCode, 401);
  assert.strictEqual(res.corpo.erro, 'sem_login');
  assert.ok(cookiesDe(res).some((c) => c.startsWith(`${G.COOKIE_TOKEN}=;`)));
});

test('criar evento: cookie de outra chave (ex.: segredo trocado) pede login', async () => {
  const falso = G.cifrar({ refresh: REFRESH }, 'outra-chave');
  const { res, pedidos } = await rodar(criarEvento, {
    method: 'POST', body: PROVA, headers: { cookie: `${G.COOKIE_TOKEN}=${encodeURIComponent(falso)}` },
  });
  assert.strictEqual(res.corpo.erro, 'sem_login');
  assert.strictEqual(pedidos.length, 0);
});

// ---------- estado ----------
const estado = require(path.join(pasta, 'estado.js'));

test('estado: diz se está configurado, se o login chegou e o endereço de retorno, sem segredos', async () => {
  const semLogin = await rodar(estado, {});
  assert.deepStrictEqual(semLogin.res.corpo, {
    configurado: true, conectado: false, cookieRecebido: false, enderecoDoRetorno: 'https://lumi-teste.vercel.app',
  });
  const { cookieToken } = await entrar();
  const comLogin = await rodar(estado, { headers: { cookie: `${G.COOKIE_TOKEN}=${encodeURIComponent(cookieToken)}` } });
  assert.strictEqual(comLogin.res.corpo.conectado, true);
  const texto = JSON.stringify(comLogin.res.corpo);
  for (const segredo of [REFRESH, AMBIENTE.GOOGLE_CLIENT_SECRET, AMBIENTE.GOOGLE_CLIENT_ID]) assert.ok(!texto.includes(segredo));
  const semConfig = await rodar(estado, {}, [], {});
  assert.deepStrictEqual(semConfig.res.corpo, { configurado: false, conectado: false, cookieRecebido: false, enderecoDoRetorno: null });
});

test('callback: falha na troca do código volta com o código do motivo (sem tokens)', async () => {
  const passo1 = await rodar(login, {});
  const url = new URL(passo1.res.headers.location);
  const cookieEstado = `${G.COOKIE_ESTADO}=${encodeURIComponent(valorDoCookie(passo1.res, G.COOKIE_ESTADO))}`;
  const casos = [
    [() => resposta(400, { error: 'invalid_grant', error_description: 'Bad Request' }), 'invalid_grant'],
    [() => resposta(400, { error: 'redirect_uri_mismatch' }), 'redirect_uri_mismatch'],
    [() => resposta(200, { access_token: ACESSO, scope: G.ESCOPO }), 'sem_refresh_token'],
  ];
  for (const [respostaDoGoogle, motivo] of casos) {
    const { res, logs } = await rodar(callback, {
      query: { code: 'c', state: url.searchParams.get('state') }, headers: { cookie: cookieEstado },
    }, [[G.URL_TOKEN, respostaDoGoogle]]);
    assert.strictEqual(res.headers.location, `https://lumi-teste.vercel.app/?google=erro&motivo=${motivo}`);
    assert.ok(!res.headers.location.includes(ACESSO));
    assert.ok(logs.join('\n').includes(motivo));
    assert.ok(!logs.join('\n').includes(ACESSO));
  }
});

test('código do motivo só aceita letras, números, _ e -', () => {
  assert.strictEqual(G.codigoSeguro('invalid_grant'), 'invalid_grant');
  assert.strictEqual(G.codigoSeguro('<script>x</script>'), 'scriptxscript');
  assert.strictEqual(G.codigoSeguro(''), 'desconhecido');
});
