// Testes de api/voz.js e api/narrar.js com a ElevenLabs simulada (sem chave real).
// Rodar com: node --test testes/
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const voz = require(path.join(__dirname, '..', 'api', 'voz.js'));
const narrar = require(path.join(__dirname, '..', 'api', 'narrar.js'));

const FAMILIA = 'c793b40e-4e5d-4e70-bf7c-997698fa6b2d';
const OUTRA = '11111111-2222-3333-4444-555555555555';
const ID_VOZ = 'AbCdEf1234567890XyZ';
const CHAVE = 'chave-falsa-elevenlabs';
const AUDIO = Buffer.alloc(60 * 1024, 7).toString('base64');

function resFalsa() {
  return {
    statusCode: 0, corpo: null, headers: {},
    status(c) { this.statusCode = c; return this; },
    json(c) { this.corpo = c; return this; },
    setHeader(k, v) { this.headers[k] = v; },
  };
}

function resposta(status, corpo) {
  return { ok: status >= 200 && status < 300, status, json: async () => corpo };
}

// rotas: lista de [método, trecho da URL, função que devolve resposta]
async function chamar(handler, req, rotas, { chave = CHAVE } = {}) {
  const original = global.fetch;
  const chaveOriginal = process.env.ELEVENLABS_API_KEY;
  const erroOriginal = console.error;
  const logs = [];
  const pedidos = [];
  console.error = (...a) => logs.push(a.join(' '));
  if (chave) process.env.ELEVENLABS_API_KEY = chave; else delete process.env.ELEVENLABS_API_KEY;
  global.fetch = async (url, opcoes = {}) => {
    const metodo = opcoes.method || 'GET';
    pedidos.push({ url, metodo, headers: opcoes.headers, body: opcoes.body });
    const rota = rotas.find(([m, trecho]) => m === metodo && url.includes(trecho));
    if (!rota) throw new Error(`rota inesperada: ${metodo} ${url}`);
    return rota[2](url, opcoes);
  };
  try {
    const res = resFalsa();
    await handler({ method: 'GET', query: {}, body: {}, ...req }, res);
    return { res, pedidos, logs };
  } finally {
    global.fetch = original;
    console.error = erroOriginal;
    if (chaveOriginal === undefined) delete process.env.ELEVENLABS_API_KEY; else process.env.ELEVENLABS_API_KEY = chaveOriginal;
  }
}

const semVoz = ['GET', '/v2/voices', () => resposta(200, { voices: [] })];
const comVoz = ['GET', '/v2/voices', () => resposta(200, { voices: [{ voice_id: ID_VOZ, name: `lumi-${FAMILIA}` }] })];
const vozDaFamilia = ['GET', `/v1/voices/${ID_VOZ}`, () => resposta(200, { voice_id: ID_VOZ, name: `lumi-${FAMILIA}` })];

// ---------- api/voz.js ----------

test('voz: sem chave configurada, avisa e não chama o serviço', async () => {
  const { res, pedidos } = await chamar(voz, { method: 'POST', body: {} }, [], { chave: null });
  assert.strictEqual(res.statusCode, 503);
  assert.strictEqual(res.corpo.erro, 'sem_chave');
  assert.strictEqual(pedidos.length, 0);
});

test('voz: cria a voz com o nome da família e manda o áudio em multipart', async () => {
  const { res, pedidos } = await chamar(voz, { method: 'POST', body: { familia: FAMILIA, audio: AUDIO, tipo: 'audio/webm;codecs=opus' } }, [
    semVoz,
    ['POST', '/v1/voices/add', () => resposta(200, { voice_id: ID_VOZ, requires_verification: false })],
  ]);
  assert.strictEqual(res.statusCode, 200);
  assert.deepStrictEqual(res.corpo, { idVoz: ID_VOZ, jaExistia: false });
  const criacao = pedidos.find((p) => p.url.includes('/v1/voices/add'));
  assert.strictEqual(criacao.headers['xi-api-key'], CHAVE);
  assert.ok(criacao.body instanceof FormData);
  assert.strictEqual(criacao.body.get('name'), `lumi-${FAMILIA}`);
  assert.strictEqual(criacao.body.get('files').type, 'audio/webm');
  assert.ok(!JSON.stringify(res.corpo).includes(CHAVE));
});

test('voz: se a família já tem voz, não cria outra', async () => {
  const { res, pedidos } = await chamar(voz, { method: 'POST', body: { familia: FAMILIA, audio: AUDIO, tipo: 'audio/mp4' } }, [comVoz]);
  assert.deepStrictEqual(res.corpo, { idVoz: ID_VOZ, jaExistia: true });
  assert.ok(!pedidos.some((p) => p.url.includes('/v1/voices/add')));
});

test('voz: gravação curta demais é recusada antes de chamar o serviço', async () => {
  const curta = Buffer.alloc(5 * 1024, 7).toString('base64');
  const { res, pedidos } = await chamar(voz, { method: 'POST', body: { familia: FAMILIA, audio: curta, tipo: 'audio/webm' } }, []);
  assert.strictEqual(res.statusCode, 422);
  assert.strictEqual(res.corpo.erro, 'muito_curta');
  assert.strictEqual(pedidos.length, 0);
});

test('voz: plano sem clonagem devolve erro claro com a mensagem do serviço', async () => {
  const { res } = await chamar(voz, { method: 'POST', body: { familia: FAMILIA, audio: AUDIO, tipo: 'audio/webm' } }, [
    semVoz,
    ['POST', '/v1/voices/add', () => resposta(403, { detail: { status: 'can_not_use_instant_voice_cloning', message: 'Your subscription does not include instant voice cloning.' } })],
  ]);
  assert.strictEqual(res.corpo.erro, 'plano');
  assert.ok(res.corpo.mensagem.includes('plano'));
  assert.ok(res.corpo.mensagem.includes('instant voice cloning'));
});

test('voz: chave sem permissão devolve erro de permissão', async () => {
  const { res } = await chamar(voz, { method: 'POST', body: { familia: FAMILIA, audio: AUDIO, tipo: 'audio/webm' } }, [
    ['GET', '/v2/voices', () => resposta(401, { detail: { status: 'missing_permissions', message: 'The API key is missing the voices_read permission.' } })],
  ]);
  assert.strictEqual(res.corpo.erro, 'permissao');
  assert.ok(res.corpo.mensagem.includes('voices_read'));
});

test('voz: serviço fora do ar devolve erro claro', async () => {
  const { res } = await chamar(voz, { method: 'POST', body: { familia: FAMILIA, audio: AUDIO, tipo: 'audio/webm' } }, [
    ['GET', '/v2/voices', () => { throw new Error('rede'); }],
  ]);
  assert.strictEqual(res.corpo.erro, 'servico_fora');
});

test('voz: pedido inválido (família, tipo de áudio ou base64)', async () => {
  for (const body of [
    { familia: 'abc', audio: AUDIO, tipo: 'audio/webm' },
    { familia: FAMILIA, audio: AUDIO, tipo: 'video/mp4' },
    { familia: FAMILIA, audio: 'não é base64!', tipo: 'audio/webm' },
  ]) {
    const { res } = await chamar(voz, { method: 'POST', body }, []);
    assert.strictEqual(res.statusCode, 400);
  }
});

test('voz: apaga só a voz desta família', async () => {
  const { res, pedidos } = await chamar(voz, { method: 'DELETE', query: { familia: FAMILIA, voz: ID_VOZ } }, [
    vozDaFamilia,
    ['DELETE', `/v1/voices/${ID_VOZ}`, () => resposta(200, { status: 'ok' })],
  ]);
  assert.deepStrictEqual(res.corpo, { apagada: true });
  assert.ok(pedidos.some((p) => p.metodo === 'DELETE'));
});

test('voz: não apaga a voz de outra família', async () => {
  const { res, pedidos } = await chamar(voz, { method: 'DELETE', query: { familia: OUTRA, voz: ID_VOZ } }, [vozDaFamilia]);
  assert.strictEqual(res.statusCode, 403);
  assert.ok(!pedidos.some((p) => p.metodo === 'DELETE'));
});

test('voz: apagar sem ID no aparelho procura pelo nome da família', async () => {
  const { res } = await chamar(voz, { method: 'DELETE', query: { familia: FAMILIA } }, [
    comVoz, vozDaFamilia,
    ['DELETE', `/v1/voices/${ID_VOZ}`, () => resposta(200, { status: 'ok' })],
  ]);
  assert.deepStrictEqual(res.corpo, { apagada: true });
});

// ---------- api/narrar.js ----------

const ALINHAMENTO = {
  characters: ['O', 'i', '.'],
  character_start_times_seconds: [0, 0.1, 0.2],
  character_end_times_seconds: [0.1, 0.2, 0.3],
};

test('narrar: devolve áudio, texto e alinhamento por caractere', async () => {
  const { res, pedidos } = await chamar(narrar, { method: 'POST', body: { familia: FAMILIA, idVoz: ID_VOZ, texto: 'Oi.' } }, [
    vozDaFamilia,
    ['POST', '/with-timestamps', () => resposta(200, { audio_base64: 'QUJD', alignment: ALINHAMENTO, normalized_alignment: ALINHAMENTO })],
  ]);
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.corpo.audio, 'QUJD');
  assert.strictEqual(res.corpo.texto, 'Oi.');
  assert.deepStrictEqual(res.corpo.alinhamento.caracteres, ['O', 'i', '.']);
  const fala = pedidos.find((p) => p.url.includes('/with-timestamps'));
  assert.ok(fala.url.includes(`/v1/text-to-speech/${ID_VOZ}/with-timestamps`));
  assert.strictEqual(JSON.parse(fala.body).model_id, 'eleven_multilingual_v2');
  assert.strictEqual(JSON.parse(fala.body).voice_settings.similarity_boost, 0.9);
  assert.strictEqual(JSON.parse(fala.body).voice_settings.use_speaker_boost, true);
});

test('narrar: texto com mais de 300 caracteres é recusado', async () => {
  const { res, pedidos } = await chamar(narrar, { method: 'POST', body: { familia: FAMILIA, idVoz: ID_VOZ, texto: 'a'.repeat(301) } }, []);
  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(pedidos.length, 0);
});

test('narrar: voz que não existe mais no serviço', async () => {
  const { res } = await chamar(narrar, { method: 'POST', body: { familia: FAMILIA, idVoz: ID_VOZ, texto: 'Oi.' } }, [
    ['GET', `/v1/voices/${ID_VOZ}`, () => resposta(404, { detail: { status: 'voice_not_found', message: 'Voice not found' } })],
  ]);
  assert.strictEqual(res.corpo.erro, 'voz_nao_encontrada');
});

test('narrar: créditos esgotados devolvem erro claro', async () => {
  const { res } = await chamar(narrar, { method: 'POST', body: { familia: FAMILIA, idVoz: ID_VOZ, texto: 'Oi.' } }, [
    vozDaFamilia,
    ['POST', '/with-timestamps', () => resposta(401, { detail: { status: 'quota_exceeded', message: 'This request exceeds your quota.' } })],
  ]);
  assert.strictEqual(res.corpo.erro, 'creditos');
  assert.ok(res.corpo.mensagem.includes('quota'));
});

test('narrar e voz: logs nunca têm a chave, o áudio ou o texto', async () => {
  const segredo = 'FATO-SECRETO';
  const a = await chamar(narrar, { method: 'POST', body: { familia: FAMILIA, idVoz: ID_VOZ, texto: segredo } }, [
    vozDaFamilia,
    ['POST', '/with-timestamps', () => resposta(500, { detail: { message: segredo } })],
  ]);
  const b = await chamar(voz, { method: 'POST', body: { familia: FAMILIA, audio: AUDIO, tipo: 'audio/webm' } }, [
    semVoz,
    ['POST', '/v1/voices/add', () => resposta(500, {})],
  ]);
  const tudo = [...a.logs, ...b.logs].join('\n');
  assert.ok(a.logs.length && b.logs.length);
  assert.ok(!tudo.includes(segredo));
  assert.ok(!tudo.includes(CHAVE));
  assert.ok(!tudo.includes(AUDIO.slice(0, 50)));
});
