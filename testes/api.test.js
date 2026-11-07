// Testes da função api/questoes.js sem chamar a API de verdade.
// A resposta do Claude é simulada. Rodar com: node --test testes/
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const handler = require(path.join(__dirname, '..', 'api', 'questoes.js'));

const FOTO = Buffer.from('foto-de-teste').toString('base64');

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

function respostaDoModelo(json, parada = 'end_turn') {
  const texto = typeof json === 'string' ? json : JSON.stringify(json);
  return async () => ({
    ok: true,
    status: 200,
    json: async () => ({ stop_reason: parada, content: [{ type: 'text', text: texto }] }),
  });
}

function naoChamar() {
  throw new Error('não deveria chamar a API');
}

async function chamar(corpo, { chave = 'chave-falsa-de-teste', fetchFalso = naoChamar } = {}) {
  const fetchOriginal = global.fetch;
  const chaveOriginal = process.env.ANTHROPIC_API_KEY;
  const erroOriginal = console.error;
  const logs = [];
  let pedidoEnviado = null;

  console.error = (...args) => logs.push(args.join(' '));
  if (chave) process.env.ANTHROPIC_API_KEY = chave;
  else delete process.env.ANTHROPIC_API_KEY;
  global.fetch = async (url, opcoes) => {
    pedidoEnviado = JSON.parse(opcoes.body);
    return fetchFalso(url, opcoes);
  };

  try {
    const res = resFalsa();
    await handler({ method: 'POST', body: corpo }, res);
    return { res, logs, pedidoEnviado };
  } finally {
    global.fetch = fetchOriginal;
    console.error = erroOriginal;
    if (chaveOriginal === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = chaveOriginal;
  }
}

const vf = (n) => ({ tipo: 'verdadeiro_falso', enunciado: `Afirmação ${n}`, gabarito: true, explicacao: 'Explicação.' });
const me = {
  tipo: 'multipla_escolha',
  enunciado: 'Qual é a certa?',
  alternativas: ['Um', 'Dois', 'Três', 'Quatro', 'Cinco'],
  gabarito: 'c',
  explicacao: 'Explicação.',
};
const rel = {
  tipo: 'relacionar',
  enunciado: 'Ligue',
  pares: [{ item: 'a', par: '1' }, { item: 'b', par: '2' }, { item: 'c', par: '3' }],
  explicacao: 'Explicação.',
};
const dis = { tipo: 'dissertativa', enunciado: 'Explique', gabarito: 'Resposta modelo.', explicacao: 'Explicação.' };

test('sem chave: devolve sem_chave (o app usa o modo demonstração)', async () => {
  const { res } = await chamar({ disciplina: 'historia', fotos: [FOTO] }, { chave: null });
  assert.strictEqual(res.statusCode, 503);
  assert.deepStrictEqual(res.corpo, { erro: 'sem_chave' });
});

test('pedido inválido: 11 fotos, disciplina desconhecida, base64 inválido, sem fotos', async () => {
  const pedidos = [
    { disciplina: 'historia', fotos: Array(11).fill(FOTO) },
    { disciplina: 'artes', fotos: [FOTO] },
    { disciplina: 'historia', fotos: ['isto não é base64!'] },
    { disciplina: 'historia', fotos: [] },
  ];
  for (const corpo of pedidos) {
    const { res } = await chamar(corpo);
    assert.strictEqual(res.statusCode, 400);
  }
});

test('pedido certo: usa claude-haiku-5-5, manda todas as fotos e pede JSON', async () => {
  const { res, pedidoEnviado } = await chamar({ disciplina: 'historia', fotos: [FOTO, FOTO] }, {
    fetchFalso: respostaDoModelo({ disciplina_detectada: 'historia', legivel: true, aviso: '', perguntas: [vf(1), me, rel, dis] }),
  });
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(pedidoEnviado.model, 'claude-haiku-5-5');
  assert.strictEqual(pedidoEnviado.messages[0].content.filter((b) => b.type === 'image').length, 2);
  assert.strictEqual(pedidoEnviado.output_config.format.type, 'json_schema');
  assert.strictEqual(res.corpo.perguntas.length, 4);
  assert.ok(!JSON.stringify(res.corpo).includes('chave-falsa'));
});

test('foto ilegível: legivel false vira nao_foi_possivel_ler', async () => {
  const { res } = await chamar({ disciplina: 'ciencias', fotos: [FOTO] }, {
    fetchFalso: respostaDoModelo({ disciplina_detectada: 'outra', legivel: false, aviso: '', perguntas: [] }),
  });
  assert.strictEqual(res.statusCode, 422);
  assert.strictEqual(res.corpo.erro, 'nao_foi_possivel_ler');
});

test('JSON inválido do modelo: erro claro, sem quebrar', async () => {
  const { res } = await chamar({ disciplina: 'ciencias', fotos: [FOTO] }, {
    fetchFalso: respostaDoModelo('isto não é json {'),
  });
  assert.strictEqual(res.statusCode, 502);
  assert.strictEqual(res.corpo.erro, 'resposta_invalida');
});

test('resposta cortada (max_tokens): erro claro', async () => {
  const { res } = await chamar({ disciplina: 'ciencias', fotos: [FOTO] }, {
    fetchFalso: respostaDoModelo({}, 'max_tokens'),
  });
  assert.strictEqual(res.statusCode, 502);
  assert.strictEqual(res.corpo.erro, 'resposta_invalida');
});

test('perguntas fora do formato são descartadas e o total para em 10', async () => {
  const ruins = [
    { ...me, alternativas: ['a', 'b', 'c', 'd'] }, // só 4 alternativas
    { ...rel, pares: rel.pares.slice(0, 2) }, // só 2 pares
    { ...dis, gabarito: '' }, // sem resposta modelo
    { tipo: 'outro', enunciado: 'x' },
  ];
  const muitas = Array.from({ length: 12 }, (_, i) => (i % 2 ? vf(i) : me));
  const { res } = await chamar({ disciplina: 'ciencias', fotos: [FOTO] }, {
    fetchFalso: respostaDoModelo({ disciplina_detectada: 'ciencias', legivel: true, aviso: '', perguntas: [...ruins, ...muitas] }),
  });
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.corpo.perguntas.length, 10);
});

test('não repete o mesmo tipo mais de duas vezes seguidas quando há como variar', async () => {
  const { res } = await chamar({ disciplina: 'ciencias', fotos: [FOTO] }, {
    fetchFalso: respostaDoModelo({ disciplina_detectada: 'ciencias', legivel: true, aviso: '', perguntas: [vf(1), vf(2), vf(3), vf(4), me, dis] }),
  });
  const tipos = res.corpo.perguntas.map((p) => p.tipo);
  for (let i = 2; i < 5; i += 1) {
    assert.ok(!(tipos[i] === tipos[i - 1] && tipos[i] === tipos[i - 2]), tipos.join(','));
  }
});

test('só atividades prontas: sem_perguntas com o aviso do modelo', async () => {
  const { res } = await chamar({ disciplina: 'portugues', fotos: [FOTO] }, {
    fetchFalso: respostaDoModelo({
      disciplina_detectada: 'portugues',
      legivel: true,
      aviso: 'As páginas eram atividades já respondidas.',
      perguntas: [],
    }),
  });
  assert.strictEqual(res.statusCode, 422);
  assert.strictEqual(res.corpo.erro, 'sem_perguntas');
  assert.ok(res.corpo.aviso);
});

test('disciplina detectada diferente vai para o app decidir', async () => {
  const { res } = await chamar({ disciplina: 'historia', fotos: [FOTO] }, {
    fetchFalso: respostaDoModelo({ disciplina_detectada: 'matematica', legivel: true, aviso: '', perguntas: [vf(1)] }),
  });
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.corpo.disciplina_detectada, 'matematica');
});

test('logs não guardam conteúdo das fotos nem das respostas', async () => {
  const segredo = 'CONTEUDO-SECRETO-DO-CADERNO';
  const a = await chamar({ disciplina: 'historia', fotos: [FOTO] }, {
    fetchFalso: respostaDoModelo(`${segredo} não é json`),
  });
  const b = await chamar({ disciplina: 'historia', fotos: [FOTO] }, {
    fetchFalso: async () => ({ ok: false, status: 500, json: async () => ({ error: segredo }) }),
  });
  const tudo = [...a.logs, ...b.logs].join('\n');
  assert.ok(a.logs.length > 0 && b.logs.length > 0);
  assert.ok(!tudo.includes(segredo));
  assert.ok(!tudo.includes(FOTO));
});
