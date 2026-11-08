// Desconecta o Google Agenda: revoga o acesso no Google e apaga o cookie.
// Usado pelo botão "Desconectar" e pelo "Apagar dados da família".

const G = require('./_comum');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return G.responder(res, 405, { erro: 'metodo_nao_permitido' });
  }
  const cfg = G.config();
  const limpar = [G.apagarCookie(G.COOKIE_TOKEN), G.apagarCookie(G.COOKIE_ESTADO)];
  if (!cfg) return G.responder(res, 200, { desconectado: true, revogado: false }, limpar);

  const sessao = G.decifrar(G.lerCookies(req)[G.COOKIE_TOKEN], cfg.segredo);
  if (!sessao || !sessao.refresh) {
    return G.responder(res, 200, { desconectado: true, revogado: false }, limpar);
  }

  const resultado = await G.chamar(G.URL_REVOGAR, G.formulario({ token: sessao.refresh }));
  if (!resultado.ok) console.error('google: revogação falhou', resultado.status);
  // O cookie é apagado de qualquer jeito: o app não usa mais esse acesso.
  return G.responder(res, 200, { desconectado: true, revogado: resultado.ok }, limpar);
};
