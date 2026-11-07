// Função no servidor (Vercel) que lê as fotos com o Claude e cria as perguntas.
// A chave fica só na variável de ambiente ANTHROPIC_API_KEY, nunca no código.
// Privacidade: as fotos não são gravadas, e nada das fotos ou das respostas
// vai para o log. Só registramos códigos de erro.

const MODELO = 'claude-haiku-5-5';
const URL_API = 'https://api.anthropic.com/v1/messages';
const VERSAO_API = '2026-10-21';
const TEMPO_LIMITE_MS = 55000;

const MAX_FOTOS = 10;
const MAX_PERGUNTAS = 10;
const MAX_CARACTERES_FOTO = 2_000_000; // base64 de um JPEG de até 1024 px
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

const DISCIPLINAS = ['portugues', 'matematica', 'ciencias', 'historia', 'geografia', 'outra'];
const LETRAS = ['a', 'b', 'c', 'd', 'e'];

// Formato que o modelo deve seguir (structured outputs).
const TEXTO = { type: 'string' };
const ESQUEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['disciplina_detectada', 'legivel', 'aviso', 'perguntas'],
  properties: {
    disciplina_detectada: { type: 'string', enum: DISCIPLINAS },
    legivel: { type: 'boolean' },
    aviso: TEXTO,
    perguntas: {
      type: 'array',
      items: {
        anyOf: [
          {
            type: 'object',
            additionalProperties: false,
            required: ['tipo', 'enunciado', 'gabarito', 'explicacao'],
            properties: {
              tipo: { type: 'string', enum: ['verdadeiro_falso'] },
              enunciado: TEXTO,
              gabarito: { type: 'boolean' },
              explicacao: TEXTO,
            },
          },
          {
            type: 'object',
            additionalProperties: false,
            required: ['tipo', 'enunciado', 'alternativas', 'gabarito', 'explicacao'],
            properties: {
              tipo: { type: 'string', enum: ['multipla_escolha'] },
              enunciado: TEXTO,
              alternativas: { type: 'array', items: TEXTO },
              gabarito: { type: 'string', enum: LETRAS },
              explicacao: TEXTO,
            },
          },
          {
            type: 'object',
            additionalProperties: false,
            required: ['tipo', 'enunciado', 'pares', 'explicacao'],
            properties: {
              tipo: { type: 'string', enum: ['relacionar'] },
              enunciado: TEXTO,
              pares: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['item', 'par'],
                  properties: { item: TEXTO, par: TEXTO },
                },
              },
              explicacao: TEXTO,
            },
          },
          {
            type: 'object',
            additionalProperties: false,
            required: ['tipo', 'enunciado', 'gabarito', 'explicacao'],
            properties: {
              tipo: { type: 'string', enum: ['dissertativa'] },
              enunciado: TEXTO,
              gabarito: TEXTO,
              explicacao: TEXTO,
            },
          },
        ],
      },
    },
  },
};

const INSTRUCOES = `Você ajuda crianças de 9 a 12 anos a estudar. Você recebe fotos de cadernos ou materiais escolares e cria perguntas de revisão em português do Brasil.

Leia todas as fotos e siga estas regras:

1. Identifique a disciplina do conteúdo e responda em "disciplina_detectada" com um destes valores: portugues, matematica, ciencias, historia, geografia ou outra.
2. Se as fotos estiverem ilegíveis (borradas, escuras, cortadas ou sem texto), marque "legivel": false e devolva "perguntas" vazia.
3. Ignore nomes de pessoas, rostos, nome de escola e de professora. Nunca coloque esses dados nas perguntas.
4. Ignore atividades já respondidas, páginas de entrevista e instruções ao aluno (como "copie", "pinte", "responda no caderno"). Quando ignorar alguma página por isso, explique em uma frase curta no campo "aviso". Se não ignorar nada, deixe "aviso" vazio.
5. Crie no máximo uma pergunta por página e no máximo 10 perguntas no total. Se houver mais páginas, escolha as de conteúdo mais importante.
6. Escreva as perguntas com suas próprias palavras. Cite no máximo uma frase curta do material por pergunta.
7. Diversifique os tipos e não use o mesmo tipo mais de duas vezes seguidas:
   - "verdadeiro_falso": uma afirmação; "gabarito" é true ou false.
   - "multipla_escolha": exatamente 5 alternativas, só uma correta; "gabarito" é a letra da correta ("a" a "e").
   - "relacionar": de 3 a 5 pares em "pares", cada um com "item" e o "par" correto.
   - "dissertativa": pergunta aberta; "gabarito" é uma resposta modelo de uma ou duas frases.
8. Toda pergunta tem "explicacao": uma frase curta e gentil que ajuda a criança a entender.
9. Use frases curtas e tom de aventura, sem gírias. Não cite marcas nem jogos.
10. Em contas de matemática, só monte o enunciado. O app confere o resultado no código.

Responda somente com o JSON no formato pedido.`;

// ---------- validação ----------

function textoLimpo(valor, maximo) {
  if (typeof valor !== 'string') return '';
  return valor.replace(/\s+/g, ' ').trim().slice(0, maximo);
}

function validarPergunta(p) {
  if (!p || typeof p !== 'object') return null;
  const enunciado = textoLimpo(p.enunciado, 400);
  const explicacao = textoLimpo(p.explicacao, 300);
  if (!enunciado) return null;

  switch (p.tipo) {
    case 'verdadeiro_falso':
      if (typeof p.gabarito !== 'boolean') return null;
      return { tipo: p.tipo, enunciado, gabarito: p.gabarito, explicacao };

    case 'multipla_escolha': {
      if (!Array.isArray(p.alternativas) || p.alternativas.length !== 5) return null;
      const alternativas = p.alternativas.map((a) => textoLimpo(a, 160));
      if (alternativas.some((a) => !a)) return null;
      if (new Set(alternativas.map((a) => a.toLowerCase())).size !== 5) return null;
      const gabarito = String(p.gabarito || '').trim().toLowerCase();
      if (!LETRAS.includes(gabarito)) return null;
      return { tipo: p.tipo, enunciado, alternativas, gabarito, explicacao };
    }

    case 'relacionar': {
      if (!Array.isArray(p.pares) || p.pares.length < 3 || p.pares.length > 5) return null;
      const pares = p.pares.map((par) => ({
        item: textoLimpo(par && par.item, 120),
        par: textoLimpo(par && par.par, 120),
      }));
      if (pares.some((par) => !par.item || !par.par)) return null;
      if (new Set(pares.map((par) => par.par.toLowerCase())).size !== pares.length) return null;
      return { tipo: p.tipo, enunciado, pares, explicacao };
    }

    case 'dissertativa': {
      const gabarito = textoLimpo(p.gabarito, 400);
      if (!gabarito) return null;
      return { tipo: p.tipo, enunciado, gabarito, explicacao };
    }

    default:
      return null;
  }
}

// Reordena para não repetir o mesmo tipo mais de duas vezes seguidas, quando possível.
function variarTipos(perguntas) {
  const restantes = [...perguntas];
  const ordem = [];
  while (restantes.length) {
    const n = ordem.length;
    const repetido = n >= 2 && ordem[n - 1].tipo === ordem[n - 2].tipo ? ordem[n - 1].tipo : null;
    let indice = restantes.findIndex((p) => p.tipo !== repetido);
    if (indice === -1) indice = 0;
    ordem.push(restantes.splice(indice, 1)[0]);
  }
  return ordem;
}

// Confere o JSON do modelo. Devolve { ok, dados } ou { ok: false, erro }.
function validarResposta(bruto) {
  if (!bruto || typeof bruto !== 'object') return { ok: false, erro: 'resposta_invalida' };
  if (typeof bruto.legivel !== 'boolean') return { ok: false, erro: 'resposta_invalida' };

  const aviso = textoLimpo(bruto.aviso, 300);
  if (!bruto.legivel) return { ok: false, erro: 'nao_foi_possivel_ler' };

  const disciplina = DISCIPLINAS.includes(bruto.disciplina_detectada) ? bruto.disciplina_detectada : 'outra';
  const perguntas = Array.isArray(bruto.perguntas)
    ? bruto.perguntas.map(validarPergunta).filter(Boolean).slice(0, MAX_PERGUNTAS)
    : [];

  if (!perguntas.length) {
    return { ok: false, erro: aviso ? 'sem_perguntas' : 'resposta_invalida', aviso };
  }

  return {
    ok: true,
    dados: { disciplina_detectada: disciplina, aviso, perguntas: variarTipos(perguntas) },
  };
}

function validarPedido(corpo) {
  if (!corpo || typeof corpo !== 'object') return null;
  const { disciplina, fotos } = corpo;
  if (!DISCIPLINAS.includes(disciplina)) return null;
  if (!Array.isArray(fotos) || fotos.length < 1 || fotos.length > MAX_FOTOS) return null;
  const validas = fotos.every((f) => typeof f === 'string'
    && f.length > 0
    && f.length <= MAX_CARACTERES_FOTO
    && BASE64.test(f));
  if (!validas) return null;
  return { disciplina, fotos };
}

// ---------- chamada ao Claude ----------

async function chamarClaude(fotos, chave) {
  const conteudo = [];
  fotos.forEach((dados, i) => {
    conteudo.push({ type: 'text', text: `Página ${i + 1}:` });
    conteudo.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: dados } });
  });
  conteudo.push({ type: 'text', text: 'Crie as perguntas de revisão a partir destas páginas.' });

  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
  try {
    const resposta = await fetch(URL_API, {
      method: 'POST',
      signal: controle.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': chave,
        'anthropic-version': VERSAO_API,
      },
      body: JSON.stringify({
        model: MODELO,
        max_tokens: 16000,
        system: INSTRUCOES,
        output_config: {
          effort: 'medium',
          format: { type: 'json_schema', schema: ESQUEMA },
        },
        messages: [{ role: 'user', content: conteudo }],
      }),
    });

    if (!resposta.ok) {
      console.error('questoes: erro da API', resposta.status);
      return { ok: false, erro: resposta.status === 429 ? 'ocupado' : 'falha_api' };
    }

    const mensagem = await resposta.json();
    if (mensagem.stop_reason !== 'end_turn') {
      console.error('questoes: parada inesperada', mensagem.stop_reason);
      return { ok: false, erro: 'resposta_invalida' };
    }

    const texto = (mensagem.content || [])
      .filter((bloco) => bloco.type === 'text')
      .map((bloco) => bloco.text)
      .join('');

    let bruto;
    try {
      bruto = JSON.parse(texto);
    } catch (erro) {
      console.error('questoes: JSON inválido do modelo');
      return { ok: false, erro: 'resposta_invalida' };
    }
    return validarResposta(bruto);
  } catch (erro) {
    console.error('questoes: falha na chamada', erro.name === 'AbortError' ? 'tempo_esgotado' : 'rede');
    return { ok: false, erro: 'falha_api' };
  } finally {
    clearTimeout(relogio);
  }
}

// ---------- handler ----------

const STATUS = {
  nao_foi_possivel_ler: 422,
  sem_perguntas: 422,
  resposta_invalida: 502,
  falha_api: 502,
  ocupado: 503,
};

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ erro: 'metodo_nao_permitido' });
  }

  const chave = process.env.ANTHROPIC_API_KEY;
  if (!chave) {
    return res.status(503).json({ erro: 'sem_chave' });
  }

  const pedido = validarPedido(req.body);
  if (!pedido) {
    return res.status(400).json({ erro: 'pedido_invalido' });
  }

  const resultado = await chamarClaude(pedido.fotos, chave);
  if (!resultado.ok) {
    const corpo = { erro: resultado.erro };
    if (resultado.aviso) corpo.aviso = resultado.aviso;
    return res.status(STATUS[resultado.erro] || 502).json(corpo);
  }

  return res.status(200).json(resultado.dados);
}

module.exports = handler;
module.exports.config = { maxDuration: 60 };
// Exportado só para os testes locais.
module.exports._interno = { validarResposta, validarPedido, variarTipos, ESQUEMA };
