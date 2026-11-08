// Voz digital da família na ElevenLabs.
// POST: recebe a gravação (30 a 45 segundos) e cria uma voz instantânea.
//       Se a família já tem voz, devolve a mesma e não cria outra.
// DELETE: apaga a voz da família no serviço.
// O áudio só passa por aqui a caminho da ElevenLabs: não é gravado nem vai para o log.

const ElevenLabs = require('./_elevenlabs');

const TIPOS = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
  'audio/aac': 'aac',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
};
const MIN_BYTES = 40 * 1024; // menos que isso não é uma gravação de 30 segundos
const MAX_CARACTERES_AUDIO = 4 * 1024 * 1024; // base64; o corpo da Vercel aceita até ~4,5 MB
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

function responder(res, http, corpo) {
  return res.status(http).json(corpo);
}

async function procurarVoz(familia) {
  const nome = ElevenLabs.nomeDaVoz(familia);
  const resultado = await ElevenLabs.chamar(`/v2/voices?search=${encodeURIComponent(nome)}&page_size=10`);
  if (!resultado.ok) return { ok: false, resultado };
  const vozes = (resultado.dados && resultado.dados.voices) || [];
  const voz = vozes.find((v) => v && v.name === nome);
  return { ok: true, idVoz: voz ? voz.voice_id : null };
}

async function criar(req, res) {
  const { familia, audio, tipo } = req.body || {};
  const tipoBase = typeof tipo === 'string' ? tipo.split(';')[0].trim().toLowerCase() : '';
  if (!ElevenLabs.familiaValida(familia) || !TIPOS[tipoBase]
    || typeof audio !== 'string' || audio.length > MAX_CARACTERES_AUDIO || !BASE64.test(audio)) {
    return responder(res, 400, { erro: 'pedido_invalido', mensagem: 'Pedido inválido.' });
  }

  const bytes = Buffer.from(audio, 'base64');
  if (bytes.length < MIN_BYTES) {
    return responder(res, 422, { erro: 'muito_curta', mensagem: 'A gravação ficou curta demais. Grave de 30 a 45 segundos.' });
  }

  // Já existe voz para esta família? Então não cria outra.
  const existente = await procurarVoz(familia);
  if (!existente.ok) {
    const falha = ElevenLabs.traduzirFalha(existente.resultado);
    console.error('voz: busca falhou', existente.resultado.status);
    return responder(res, falha.http, { erro: falha.erro, mensagem: falha.mensagem });
  }
  if (existente.idVoz) {
    return responder(res, 200, { idVoz: existente.idVoz, jaExistia: true });
  }

  const formulario = new FormData();
  formulario.append('name', ElevenLabs.nomeDaVoz(familia));
  formulario.append('description', 'Voz digital de uma família no app Lumi.');
  formulario.append('files', new Blob([bytes], { type: tipoBase }), `voz.${TIPOS[tipoBase]}`);

  const resultado = await ElevenLabs.chamar('/v1/voices/add', { metodo: 'POST', formulario });
  if (!resultado.ok || !resultado.dados || typeof resultado.dados.voice_id !== 'string') {
    const falha = ElevenLabs.traduzirFalha(resultado);
    console.error('voz: criação falhou', resultado.status, falha.erro);
    return responder(res, falha.http, { erro: falha.erro, mensagem: falha.mensagem });
  }
  return responder(res, 200, { idVoz: resultado.dados.voice_id, jaExistia: false });
}

async function apagar(req, res) {
  const familia = req.query && req.query.familia;
  const idVoz = req.query && req.query.voz;
  if (!ElevenLabs.familiaValida(familia)) {
    return responder(res, 400, { erro: 'pedido_invalido', mensagem: 'Pedido inválido.' });
  }

  // Sem ID no aparelho, procura pelo nome da família.
  let alvo = ElevenLabs.idDeVozValido(idVoz) ? idVoz : null;
  if (!alvo) {
    const encontrada = await procurarVoz(familia);
    if (!encontrada.ok) {
      const falha = ElevenLabs.traduzirFalha(encontrada.resultado);
      return responder(res, falha.http, { erro: falha.erro, mensagem: falha.mensagem });
    }
    if (!encontrada.idVoz) return responder(res, 200, { apagada: false, motivo: 'nao_havia_voz' });
    alvo = encontrada.idVoz;
  }

  // Só apaga se a voz for mesmo desta família.
  const dona = await ElevenLabs.vozDaFamilia(alvo, familia);
  if (!dona.ok) {
    if (dona.resultado.status === 404) return responder(res, 200, { apagada: false, motivo: 'nao_havia_voz' });
    if (dona.resultado.ok) return responder(res, 403, { erro: 'permissao', mensagem: 'Esta voz não é desta família.' });
    const falha = ElevenLabs.traduzirFalha(dona.resultado);
    return responder(res, falha.http, { erro: falha.erro, mensagem: falha.mensagem });
  }

  const resultado = await ElevenLabs.chamar(`/v1/voices/${encodeURIComponent(alvo)}`, { metodo: 'DELETE' });
  if (!resultado.ok && resultado.status !== 404) {
    const falha = ElevenLabs.traduzirFalha(resultado);
    console.error('voz: exclusão falhou', resultado.status);
    return responder(res, falha.http, { erro: falha.erro, mensagem: falha.mensagem });
  }
  return responder(res, 200, { apagada: true });
}

async function handler(req, res) {
  if (!ElevenLabs.chave()) {
    return responder(res, 503, { erro: 'sem_chave', mensagem: 'A voz digital não está configurada.' });
  }
  if (req.method === 'POST') return criar(req, res);
  if (req.method === 'DELETE') return apagar(req, res);
  res.setHeader('Allow', 'POST, DELETE');
  return responder(res, 405, { erro: 'metodo_nao_permitido' });
}

module.exports = handler;
module.exports.config = { maxDuration: 60 };
