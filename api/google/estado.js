// Situação da conexão com o Google Agenda, para o app e para diagnóstico.
// Não devolve nenhum segredo: só se está configurado, se o login deste navegador
// chegou (cookie válido) e o endereço para onde o Google devolve depois do login.

const G = require('./_comum');

module.exports = async function handler(req, res) {
  const cfg = G.config();
  const cookies = G.lerCookies(req);
  const temCookie = Boolean(cookies[G.COOKIE_TOKEN]);
  const sessao = cfg && temCookie ? G.decifrar(cookies[G.COOKIE_TOKEN], cfg.segredo) : null;

  return G.responder(res, 200, {
    configurado: Boolean(cfg),
    conectado: Boolean(sessao && sessao.refresh),
    cookieRecebido: temCookie,
    // Endereço do app para onde o Google volta. O login só funciona aberto por ele.
    enderecoDoRetorno: cfg ? new URL(cfg.redirect).origin : null,
  });
};
