// Função no servidor (Vercel) que lê as fotos com o Claude e cria as perguntas.
// A chave fica só na variável de ambiente ANTHROPIC_API_KEY, nunca no código.
// Privacidade: as fotos não são gravadas, e nada das fotos ou das respostas
// vai para o log. Só registramos códigos de erro.

const MODELO = 'claude-haiku-5-5';
const URL_API = 'https://api.anthropic.com/v1/messages';
const VERSAO_API = '2026-10-21';
const TEMPO_LIMITE_MS = 55000;

const MAX_FOTOS = 10;
const MAX_PERGUNTAS = 15;

// Quantidade de perguntas pelo número de páginas.
// Mais de 5 páginas: de 10 a 15. Até 5 páginas: no mínimo 5 (e no máximo 10).
function limitesDePerguntas(paginas) {
  return paginas > 5 ? { minimo: 10, maximo: 15 } : { minimo: 5, maximo: 10 };
}
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
          {
            type: 'object',
            additionalProperties: false,
            required: ['tipo', 'enunciado', 'gabarito', 'respostas_aceitas', 'explicacao'],
            properties: {
              tipo: { type: 'string', enum: ['completar_lacunas'] },
              enunciado: TEXTO,
              gabarito: TEXTO,
              respostas_aceitas: { type: 'array', items: TEXTO },
              explicacao: TEXTO,
            },
          },
        ],
      },
    },
  },
};

// Instruções ao modelo. A quantidade de perguntas depende do número de páginas.
function instrucoes(paginas) {
  const { minimo, maximo } = limitesDePerguntas(paginas);
  return `Você ajuda crianças de 9 a 12 anos a estudar. Você recebe fotos de cadernos ou materiais escolares e cria perguntas de revisão em português do Brasil.

Você recebeu ${paginas} ${paginas === 1 ? 'página' : 'páginas'}. Leia todas e siga estas regras:

1. Identifique a disciplina do conteúdo e responda em "disciplina_detectada" com um destes valores: portugues, matematica, ciencias, historia, geografia ou outra.
2. Se as fotos estiverem ilegíveis (borradas, escuras, cortadas ou sem texto), marque "legivel": false e devolva "perguntas" vazia.
3. Ignore nomes de pessoas, rostos, nome de escola e de professora. Nunca coloque esses dados nas perguntas.
4. Questões já resolvidas e questionários do material também podem virar perguntas, mas reescreva tudo com suas próprias palavras: não copie o enunciado nem as alternativas originais.
5. Ignore páginas de entrevista e instruções ao aluno (como "copie", "pinte", "responda no caderno"). Quando ignorar alguma página por isso, explique em uma frase curta no campo "aviso". Se não ignorar nada, deixe "aviso" vazio.
6. Quantidade: crie no mínimo ${minimo} e no máximo ${maximo} perguntas no total, distribuídas pelas páginas e priorizando o conteúdo mais importante.
7. Composição:
   - Metade das perguntas é "multipla_escolha".
   - A outra metade mistura os outros tipos, variando entre eles: "verdadeiro_falso", "relacionar", "dissertativa" e "completar_lacunas".
   - Se o total for ímpar, a pergunta a mais é de "multipla_escolha". Exemplo: 11 perguntas = 6 de múltipla escolha + 5 dos outros tipos.
8. Formato de cada tipo:
   - "multipla_escolha": exatamente 5 alternativas, só uma correta; "gabarito" é a letra da correta ("a" a "e").
   - "verdadeiro_falso": uma afirmação; "gabarito" é true ou false.
   - "relacionar": de 3 a 5 pares em "pares", cada um com "item" e o "par" correto.
   - "dissertativa": pergunta aberta; "gabarito" é uma resposta modelo de uma ou duas frases.
   - "completar_lacunas": uma frase com uma única lacuna marcada com "___" no enunciado; "gabarito" é a palavra ou expressão curta que completa a frase; "respostas_aceitas" lista outras formas corretas de escrever a resposta (pode ficar vazia).
9. Escreva com suas próprias palavras. Cite no máximo uma frase curta do material por pergunta.
10. Toda pergunta tem "explicacao": uma frase curta e gentil que ajuda a criança a entender.
11. Use frases curtas e tom de aventura, sem gírias. Não cite marcas nem jogos.
12. Em contas de matemática, só monte o enunciado. O app confere o resultado no código.

Responda somente com o JSON no formato pedido.`;
}

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

    case 'completar_lacunas': {
      // Exatamente uma lacuna "___" e uma resposta curta.
      const lacunas = enunciado.match(/_{3,}/g) || [];
      if (lacunas.length !== 1) return null;
      const gabarito = textoLimpo(p.gabarito, 60);
      if (!gabarito) return null;
      const aceitas = Array.isArray(p.respostas_aceitas)
        ? p.respostas_aceitas.map((r) => textoLimpo(r, 60)).filter(Boolean).slice(0, 5)
        : [];
      return {
        tipo: p.tipo,
        enunciado: enunciado.replace(/_{3,}/, '___'),
        gabarito,
        respostas_aceitas: aceitas,
        explicacao,
      };
    }

    default:
      return null;
  }
}

// Monta a missão: metade múltipla escolha (a sobra do ímpar vai para ela) e
// metade dos outros tipos, sem passar do máximo. Intercala os tipos.
function comporMissao(perguntas, paginas) {
  const { maximo } = limitesDePerguntas(paginas);
  const multipla = perguntas.filter((p) => p.tipo === 'multipla_escolha');
  const outras = perguntas.filter((p) => p.tipo !== 'multipla_escolha');

  // Maior total n em que cabem ceil(n/2) de múltipla escolha e floor(n/2) das outras.
  let total = Math.min(maximo, multipla.length + outras.length);
  while (total > 0 && (Math.ceil(total / 2) > multipla.length || Math.floor(total / 2) > outras.length)) {
    total -= 1;
  }

  // Se não der para respeitar a proporção (ex.: nenhuma múltipla escolha),
  // usa o que veio, até o máximo, em vez de deixar a criança sem missão.
  if (total === 0) return variarTipos(perguntas.slice(0, maximo));

  const escolhidasMultipla = multipla.slice(0, Math.ceil(total / 2));
  const escolhidasOutras = escolherVariadas(outras, Math.floor(total / 2));

  const ordem = [];
  for (let i = 0; i < escolhidasMultipla.length; i += 1) {
    ordem.push(escolhidasMultipla[i]);
    if (escolhidasOutras[i]) ordem.push(escolhidasOutras[i]);
  }
  return ordem;
}

// Pega "quantidade" perguntas alternando entre os tipos, para variar.
function escolherVariadas(perguntas, quantidade) {
  const porTipo = new Map();
  perguntas.forEach((p) => {
    if (!porTipo.has(p.tipo)) porTipo.set(p.tipo, []);
    porTipo.get(p.tipo).push(p);
  });
  const filas = [...porTipo.values()];
  const escolhidas = [];
  while (escolhidas.length < quantidade && filas.some((fila) => fila.length)) {
    filas.forEach((fila) => {
      if (fila.length && escolhidas.length < quantidade) escolhidas.push(fila.shift());
    });
  }
  return escolhidas;
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
function validarResposta(bruto, paginas = 1) {
  if (!bruto || typeof bruto !== 'object') return { ok: false, erro: 'resposta_invalida' };
  if (typeof bruto.legivel !== 'boolean') return { ok: false, erro: 'resposta_invalida' };

  const aviso = textoLimpo(bruto.aviso, 300);
  if (!bruto.legivel) return { ok: false, erro: 'nao_foi_possivel_ler' };

  const disciplina = DISCIPLINAS.includes(bruto.disciplina_detectada) ? bruto.disciplina_detectada : 'outra';
  const validas = Array.isArray(bruto.perguntas)
    ? bruto.perguntas.map(validarPergunta).filter(Boolean)
    : [];

  if (!validas.length) {
    return { ok: false, erro: aviso ? 'sem_perguntas' : 'resposta_invalida', aviso };
  }

  const perguntas = comporMissao(validas, paginas).slice(0, MAX_PERGUNTAS);
  if (perguntas.length < limitesDePerguntas(paginas).minimo) {
    // Só o código, sem conteúdo.
    console.error('questoes: abaixo_do_minimo', perguntas.length);
  }

  return {
    ok: true,
    dados: { disciplina_detectada: disciplina, aviso, perguntas },
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
        system: instrucoes(fotos.length),
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
    return validarResposta(bruto, fotos.length);
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
module.exports._interno = {
  validarResposta,
  validarPedido,
  variarTipos,
  comporMissao,
  limitesDePerguntas,
  instrucoes,
  ESQUEMA,
};
