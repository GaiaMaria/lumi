// Ajudantes do Google Agenda (OAuth 2.0 e Calendar API), sem bibliotecas externas.
// O nome começa com "_" para a Vercel não publicar este arquivo como endereço.
//
// Segurança:
// - O refresh token fica só num cookie httpOnly, Secure, SameSite=Lax, limitado a /api/google
//   e criptografado (AES-256-GCM). Nunca vai para o navegador em texto, nem para o log.
// - A chave da criptografia é derivada de GOOGLE_CLIENT_SECRET (HKDF), que só existe no servidor.

const crypto = require('crypto');

const ESCOPO = 'https://www.googleapis.com/auth/calendar.events';
const URL_CONSENTIMENTO = 'https://accounts.google.com/o/oauth2/v2/auth';
const URL_TOKEN = 'https://oauth2.googleapis.com/token';
const URL_REVOGAR = 'https://oauth2.googleapis.com/revoke';
const URL_EVENTOS = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

const COOKIE_TOKEN = 'lumi_google';
const COOKIE_ESTADO = 'lumi_google_estado';
const DURACAO_TOKEN_S = 180 * 24 * 60 * 60; // 180 dias
const DURACAO_ESTADO_S = 10 * 60; // 10 minutos para concluir o login
const TEMPO_LIMITE_MS = 15000;

function config() {
  const id = process.env.GOOGLE_CLIENT_ID;
  const segredo = process.env.GOOGLE_CLIENT_SECRET;
  const redirect = process.env.GOOGLE_REDIRECT_URI;
  return id && segredo && redirect ? { id, segredo, redirect } : null;
}

// Endereço do app (mesma origem do callback), para voltar depois do login.
function urlDoApp(cfg, resultado) {
  const base = new URL(cfg.redirect).origin;
  return `${base}/?google=${encodeURIComponent(resultado)}`;
}

// ---------- criptografia do cookie ----------

function chave(segredo) {
  return Buffer.from(crypto.hkdfSync('sha256', segredo, 'lumi', 'cookie-google-agenda', 32));
}

function cifrar(objeto, segredo) {
  const iv = crypto.randomBytes(12);
  const cifra = crypto.createCipheriv('aes-256-gcm', chave(segredo), iv);
  const dados = Buffer.concat([cifra.update(JSON.stringify(objeto), 'utf8'), cifra.final()]);
  return Buffer.concat([iv, cifra.getAuthTag(), dados]).toString('base64url');
}

function decifrar(texto, segredo) {
  try {
    const bytes = Buffer.from(String(texto || ''), 'base64url');
    if (bytes.length < 29) return null;
    const decifra = crypto.createDecipheriv('aes-256-gcm', chave(segredo), bytes.subarray(0, 12));
    decifra.setAuthTag(bytes.subarray(12, 28));
    return JSON.parse(Buffer.concat([decifra.update(bytes.subarray(28)), decifra.final()]).toString('utf8'));
  } catch (erro) {
    return null; // cookie alterado, antigo ou de outra chave
  }
}

// ---------- cookies ----------

function lerCookies(req) {
  const cabecalho = (req.headers && req.headers.cookie) || '';
  const cookies = {};
  cabecalho.split(';').forEach((parte) => {
    const i = parte.indexOf('=');
    if (i > 0) {
      try {
        cookies[parte.slice(0, i).trim()] = decodeURIComponent(parte.slice(i + 1).trim());
      } catch (erro) {
        // ignora cookie malformado
      }
    }
  });
  return cookies;
}

function criarCookie(nome, valor, maxAge) {
  return `${nome}=${encodeURIComponent(valor)}; Path=/api/google; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function apagarCookie(nome) {
  return `${nome}=; Path=/api/google; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

// ---------- respostas ----------

function redirecionar(res, url, cookies = []) {
  if (cookies.length) res.setHeader('Set-Cookie', cookies);
  res.setHeader('Cache-Control', 'no-store');
  res.statusCode = 302;
  res.setHeader('Location', url);
  res.end();
}

function responder(res, http, corpo, cookies = []) {
  if (cookies.length) res.setHeader('Set-Cookie', cookies);
  res.setHeader('Cache-Control', 'no-store');
  return res.status(http).json(corpo);
}

// ---------- chamadas ao Google ----------

async function chamar(url, opcoes) {
  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
  try {
    const resposta = await fetch(url, { ...opcoes, signal: controle.signal });
    const dados = await resposta.json().catch(() => null);
    return { ok: resposta.ok, status: resposta.status, dados };
  } catch (erro) {
    return { ok: false, status: 0, dados: null };
  } finally {
    clearTimeout(relogio);
  }
}

function formulario(campos) {
  return {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(campos).toString(),
  };
}

// Troca o refresh token por um token de acesso de curta duração.
// revogado: true quando o acesso foi cancelado no Google (invalid_grant).
async function tokenDeAcesso(refreshToken, cfg) {
  const resultado = await chamar(URL_TOKEN, formulario({
    client_id: cfg.id,
    client_secret: cfg.segredo,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  }));
  if (resultado.ok && resultado.dados && resultado.dados.access_token) {
    return { ok: true, token: resultado.dados.access_token };
  }
  return { ok: false, status: resultado.status, revogado: Boolean(resultado.dados && resultado.dados.error === 'invalid_grant') };
}

// ---------- evento ----------

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^\d{2}:\d{2}$/;

function limpar(texto, maximo) {
  return typeof texto === 'string' ? texto.replace(/\s+/g, ' ').trim().slice(0, maximo) : '';
}

// Título só com a matéria e o nome da prova (nunca nome de criança ou de escola).
// Se o nome já tem a matéria ("Prova de Matemática"), não repete.
function tituloDoEvento(materia, nome) {
  const m = limpar(materia, 40);
  const n = limpar(nome, 60);
  return n.toLowerCase().includes(m.toLowerCase()) ? n : `${m} – ${n}`;
}

function dataValida(data) {
  if (!DATA.test(data)) return false;
  const [a, m, d] = data.split('-').map(Number);
  const teste = new Date(Date.UTC(a, m - 1, d));
  return teste.getUTCFullYear() === a && teste.getUTCMonth() === m - 1 && teste.getUTCDate() === d;
}

function horaValida(hora) {
  if (!HORA.test(hora)) return false;
  const [h, min] = hora.split(':').map(Number);
  return h < 24 && min < 60;
}

// Soma minutos a uma data e hora locais, sem mudar de fuso.
function somarMinutos(data, hora, minutos) {
  const [a, m, d] = data.split('-').map(Number);
  const [h, min] = hora.split(':').map(Number);
  const fim = new Date(Date.UTC(a, m - 1, d, h, min + minutos));
  const doisDigitos = (n) => String(n).padStart(2, '0');
  return `${fim.getUTCFullYear()}-${doisDigitos(fim.getUTCMonth() + 1)}-${doisDigitos(fim.getUTCDate())}T${doisDigitos(fim.getUTCHours())}:${doisDigitos(fim.getUTCMinutes())}:00`;
}

module.exports = {
  ESCOPO,
  URL_CONSENTIMENTO,
  URL_TOKEN,
  URL_REVOGAR,
  URL_EVENTOS,
  COOKIE_TOKEN,
  COOKIE_ESTADO,
  DURACAO_TOKEN_S,
  DURACAO_ESTADO_S,
  config,
  urlDoApp,
  cifrar,
  decifrar,
  lerCookies,
  criarCookie,
  apagarCookie,
  redirecionar,
  responder,
  chamar,
  formulario,
  tokenDeAcesso,
  limpar,
  tituloDoEvento,
  dataValida,
  horaValida,
  somarMinutos,
};
