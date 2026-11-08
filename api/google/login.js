// Leva a família para a tela de consentimento do Google (OAuth 2.0 com PKCE).
// Escopo: só criar e editar eventos da agenda (calendar.events).

const crypto = require('crypto');
const G = require('./_comum');

module.exports = async function handler(req, res) {
  const cfg = G.config();
  if (!cfg) return G.redirecionar(res, '/?google=nao_configurado');

  const estado = crypto.randomBytes(16).toString('base64url');
  const verificador = crypto.randomBytes(32).toString('base64url');
  const desafio = crypto.createHash('sha256').update(verificador).digest('base64url');

  const parametros = new URLSearchParams({
    client_id: cfg.id,
    redirect_uri: cfg.redirect,
    response_type: 'code',
    scope: G.ESCOPO,
    access_type: 'offline', // para receber o refresh token
    prompt: 'consent',
    include_granted_scopes: 'true',
    state: estado,
    code_challenge: desafio,
    code_challenge_method: 'S256',
  });

  // O estado e o verificador ficam num cookie criptografado de 10 minutos.
  const cookie = G.criarCookie(
    G.COOKIE_ESTADO,
    G.cifrar({ estado, verificador, criadoEm: Date.now() }, cfg.segredo),
    G.DURACAO_ESTADO_S,
  );
  return G.redirecionar(res, `${G.URL_CONSENTIMENTO}?${parametros}`, [cookie]);
};
