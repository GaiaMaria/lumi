// Narra o fato da missão com a voz digital da família (ElevenLabs).
// Recebe só o texto do fato (criado junto com as perguntas): as fotos não são enviadas de novo.
// Devolve o áudio, o texto e o alinhamento por caractere, para o teleprompter.

const ElevenLabs = require('./_elevenlabs');

const MAX_CARACTERES = 300;
const MODELO = 'eleven_multilingual_v2';
const FORMATO = 'mp3_44100_128';

function responder(res, http, corpo) {
  return res.status(http).json(corpo);
}

// O alinhamento precisa ter três listas do mesmo tamanho.
function alinhamentoValido(a) {
  return a
    && Array.isArray(a.characters)
    && Array.isArray(a.character_start_times_seconds)
    && Array.isArray(a.character_end_times_seconds)
    && a.characters.length > 0
    && a.characters.length === a.character_start_times_seconds.length
    && a.characters.length === a.character_end_times_seconds.length;
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return responder(res, 405, { erro: 'metodo_nao_permitido' });
  }
  if (!ElevenLabs.chave()) {
    return responder(res, 503, { erro: 'sem_chave', mensagem: 'A voz digital não está configurada.' });
  }

  const { familia, idVoz, texto } = req.body || {};
  const fato = typeof texto === 'string' ? texto.replace(/\s+/g, ' ').trim() : '';
  if (!ElevenLabs.familiaValida(familia) || !ElevenLabs.idDeVozValido(idVoz)
    || !fato || fato.length > MAX_CARACTERES) {
    return responder(res, 400, { erro: 'pedido_invalido', mensagem: 'Pedido inválido.' });
  }

  // Só narra com a voz desta família.
  const dona = await ElevenLabs.vozDaFamilia(idVoz, familia);
  if (!dona.ok) {
    if (dona.resultado.ok) return responder(res, 403, { erro: 'permissao', mensagem: 'Esta voz não é desta família.' });
    const falha = ElevenLabs.traduzirFalha(dona.resultado);
    console.error('narrar: voz não conferida', dona.resultado.status);
    return responder(res, falha.http, { erro: falha.erro, mensagem: falha.mensagem });
  }

  const resultado = await ElevenLabs.chamar(
    `/v1/text-to-speech/${encodeURIComponent(idVoz)}/with-timestamps?output_format=${FORMATO}`,
    { metodo: 'POST', json: { text: fato, model_id: MODELO } },
  );
  if (!resultado.ok || !resultado.dados || typeof resultado.dados.audio_base64 !== 'string') {
    const falha = ElevenLabs.traduzirFalha(resultado);
    console.error('narrar: fala falhou', resultado.status, falha.erro);
    return responder(res, falha.http, { erro: falha.erro, mensagem: falha.mensagem });
  }

  // Usa o alinhamento do texto original (o normalizado pode trocar números por palavras).
  const alinhamento = alinhamentoValido(resultado.dados.alignment) ? resultado.dados.alignment : null;

  return responder(res, 200, {
    audio: resultado.dados.audio_base64,
    formato: 'audio/mpeg',
    texto: fato,
    alinhamento: alinhamento && {
      caracteres: alinhamento.characters,
      inicios: alinhamento.character_start_times_seconds,
      fins: alinhamento.character_end_times_seconds,
    },
  });
}

module.exports = handler;
module.exports.config = { maxDuration: 60 };
