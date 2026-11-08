// Lê a curiosidade de uma imagem enviada pela família (Claude), para a narração.
// Devolve só o texto (até 2 frases e 300 caracteres, sem nomes). A imagem não é guardada
// e nada da imagem ou do texto vai para o log.

const { _interno: { limparFato } } = require('./questoes');

const MODELO = 'claude-haiku-5-5';
const URL_API = 'https://api.anthropic.com/v1/messages';
const VERSAO_API = '2026-10-21';
const TEMPO_LIMITE_MS = 40000;
const MAX_CARACTERES_IMAGEM = 2_000_000; // base64 de um JPEG de até 1024 px
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

const ESQUEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['legivel', 'texto'],
  properties: {
    legivel: { type: 'boolean' },
    texto: { type: 'string' },
  },
};

const INSTRUCOES = `Você ajuda uma família a escolher uma curiosidade para ler em voz alta para uma criança de 9 a 12 anos, em português do Brasil.

Olhe a imagem (pode ser um caderno, um livro, uma revista ou um cartaz) e devolva em "texto" a curiosidade ou o fato mais interessante que aparece nela:
- No máximo duas frases e 300 caracteres.
- Escreva com suas próprias palavras, de um jeito claro para uma criança.
- Nunca coloque nomes de pessoas, escolas ou professoras.
- Se a imagem estiver ilegível ou não tiver nenhuma informação, marque "legivel": false e deixe "texto" vazio.

Responda somente com o JSON no formato pedido.`;

function responder(res, http, corpo) {
  return res.status(http).json(corpo);
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return responder(res, 405, { erro: 'metodo_nao_permitido' });
  }
  const chave = process.env.ANTHROPIC_API_KEY;
  if (!chave) return responder(res, 503, { erro: 'sem_chave', mensagem: 'A leitura de imagens não está configurada.' });

  const imagem = req.body && req.body.imagem;
  if (typeof imagem !== 'string' || !imagem || imagem.length > MAX_CARACTERES_IMAGEM || !BASE64.test(imagem)) {
    return responder(res, 400, { erro: 'pedido_invalido', mensagem: 'Pedido inválido.' });
  }

  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
  try {
    const resposta = await fetch(URL_API, {
      method: 'POST',
      signal: controle.signal,
      headers: { 'content-type': 'application/json', 'x-api-key': chave, 'anthropic-version': VERSAO_API },
      body: JSON.stringify({
        model: MODELO,
        max_tokens: 2000,
        system: INSTRUCOES,
        output_config: { effort: 'low', format: { type: 'json_schema', schema: ESQUEMA } },
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imagem } },
            { type: 'text', text: 'Qual é a curiosidade desta imagem?' },
          ],
        }],
      }),
    });
    if (!resposta.ok) {
      console.error('curiosidade: erro da API', resposta.status);
      return responder(res, 502, { erro: 'falha_api', mensagem: 'Não consegui ler a imagem agora. Tente de novo ou escreva o texto.' });
    }
    const mensagem = await resposta.json();
    const texto = (mensagem.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
    let dados;
    try {
      dados = JSON.parse(texto);
    } catch (erro) {
      console.error('curiosidade: JSON inválido do modelo');
      return responder(res, 502, { erro: 'resposta_invalida', mensagem: 'Não consegui ler a imagem agora. Tente de novo ou escreva o texto.' });
    }
    const curiosidade = dados && dados.legivel ? limparFato(dados.texto) : '';
    if (!curiosidade) {
      return responder(res, 422, { erro: 'nao_foi_possivel_ler', mensagem: 'Não consegui ler esta imagem. Tente de novo com boa luz e o texto inteiro dentro do quadro.' });
    }
    return responder(res, 200, { texto: curiosidade });
  } catch (erro) {
    console.error('curiosidade: falha na chamada', erro.name === 'AbortError' ? 'tempo_esgotado' : 'rede');
    return responder(res, 502, { erro: 'falha_api', mensagem: 'Não consegui ler a imagem agora. Tente de novo ou escreva o texto.' });
  } finally {
    clearTimeout(relogio);
  }
}

module.exports = handler;
module.exports.config = { maxDuration: 60 };
