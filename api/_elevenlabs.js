// Ajudantes para falar com a ElevenLabs. Usado por api/voz.js e api/narrar.js.
// O nome começa com "_" para a Vercel não publicar este arquivo como endereço.
// A chave fica só em process.env.ELEVENLABS_API_KEY. Nada de áudio, texto ou chave vai para o log.

const BASE = 'https://api.elevenlabs.io';
const TEMPO_LIMITE_MS = 50000;

const FAMILIA = /^[0-9a-f-]{16,64}$/i;
const ID_VOZ = /^[A-Za-z0-9]{10,40}$/;

function chave() {
  return process.env.ELEVENLABS_API_KEY || '';
}

function nomeDaVoz(familia) {
  return `lumi-${familia}`;
}

function familiaValida(familia) {
  return typeof familia === 'string' && FAMILIA.test(familia);
}

function idDeVozValido(id) {
  return typeof id === 'string' && ID_VOZ.test(id);
}

// Chama a ElevenLabs. Devolve { ok, status, dados } sem nunca lançar erro.
async function chamar(caminho, { metodo = 'GET', json, formulario } = {}) {
  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
  try {
    const headers = { 'xi-api-key': chave() };
    let body;
    if (json) {
      headers['content-type'] = 'application/json';
      body = JSON.stringify(json);
    } else if (formulario) {
      body = formulario; // o fetch monta o multipart sozinho
    }
    const resposta = await fetch(`${BASE}${caminho}`, { method: metodo, headers, body, signal: controle.signal });
    const dados = await resposta.json().catch(() => null);
    return { ok: resposta.ok, status: resposta.status, dados };
  } catch (erro) {
    return { ok: false, status: 0, dados: null, rede: erro && erro.name === 'AbortError' ? 'tempo_esgotado' : 'rede' };
  } finally {
    clearTimeout(relogio);
  }
}

// Mensagem que a ElevenLabs mandou (ex.: plano sem clonagem), sem dados internos.
function mensagemDoServico(dados) {
  const detalhe = dados && dados.detail;
  let texto = '';
  if (typeof detalhe === 'string') texto = detalhe;
  else if (detalhe && typeof detalhe.message === 'string') texto = detalhe.message;
  else if (Array.isArray(detalhe) && detalhe[0] && typeof detalhe[0].msg === 'string') texto = detalhe[0].msg;
  return texto.replace(/\s+/g, ' ').trim().slice(0, 300);
}

function codigoDoServico(dados) {
  const detalhe = dados && dados.detail;
  return detalhe && typeof detalhe.status === 'string' ? detalhe.status : '';
}

// Traduz uma falha da ElevenLabs para { http, erro, mensagem } (mensagem em português + a do serviço).
function traduzirFalha(resultado) {
  const servico = mensagemDoServico(resultado.dados);
  const codigo = codigoDoServico(resultado.dados);
  const com = (texto) => (servico ? `${texto} (ElevenLabs: ${servico})` : texto);

  if (resultado.status === 0) {
    return { http: 502, erro: 'servico_fora', mensagem: 'O serviço de voz não respondeu. Tente de novo daqui a pouco.' };
  }
  // Créditos e plano primeiro: a ElevenLabs às vezes manda esses casos com 401.
  if (/quota|credits|character_limit/i.test(`${codigo} ${servico}`)) {
    return { http: 402, erro: 'creditos', mensagem: com('Os créditos da ElevenLabs acabaram.') };
  }
  if (resultado.status === 402 || /subscription|plan|instant_voice_cloning|can_not_use/i.test(`${codigo} ${servico}`)) {
    return { http: 402, erro: 'plano', mensagem: com('O plano da ElevenLabs não permite esta ação.') };
  }
  if (resultado.status === 401) {
    return { http: 502, erro: 'permissao', mensagem: com('A chave da ElevenLabs não foi aceita ou não tem permissão para esta ação.') };
  }
  if (resultado.status === 403) {
    return { http: 403, erro: 'permissao', mensagem: com('A ElevenLabs não permitiu esta ação.') };
  }
  if (resultado.status === 404) {
    return { http: 404, erro: 'voz_nao_encontrada', mensagem: 'A voz digital não foi encontrada no serviço.' };
  }
  if (resultado.status === 422 || resultado.status === 400) {
    return { http: 422, erro: 'audio_invalido', mensagem: com('A ElevenLabs não aceitou o pedido.') };
  }
  if (resultado.status === 429) {
    return { http: 503, erro: 'ocupado', mensagem: 'O serviço de voz está ocupado. Tente de novo daqui a pouco.' };
  }
  return { http: 502, erro: 'servico_fora', mensagem: 'O serviço de voz falhou. Tente de novo daqui a pouco.' };
}

// Confere se a voz é desta família (pelo nome), para nunca usar ou apagar a voz de outra.
async function vozDaFamilia(idVoz, familia) {
  const resultado = await chamar(`/v1/voices/${encodeURIComponent(idVoz)}`);
  if (!resultado.ok) return { ok: false, resultado };
  return { ok: resultado.dados && resultado.dados.name === nomeDaVoz(familia), resultado };
}

module.exports = {
  chave,
  chamar,
  nomeDaVoz,
  familiaValida,
  idDeVozValido,
  traduzirFalha,
  vozDaFamilia,
};
