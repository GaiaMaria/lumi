// Volta do Google: confere o estado, troca o código pelos tokens e guarda só o
// refresh token, criptografado, num cookie httpOnly. Depois volta para o app.

const G = require('./_comum');

module.exports = async function handler(req, res) {
  const cfg = G.config();
  if (!cfg) return G.redirecionar(res, '/?google=nao_configurado');

  const consulta = req.query || {};
  const cookies = G.lerCookies(req);
  const estado = G.decifrar(cookies[G.COOKIE_ESTADO], cfg.segredo);
  const limparEstado = G.apagarCookie(G.COOKIE_ESTADO);

  // A pessoa cancelou ou o Google recusou.
  if (consulta.error) {
    const resultado = consulta.error === 'access_denied' ? 'cancelado' : 'erro';
    if (resultado === 'erro') console.error('google: retorno com erro', G.codigoSeguro(consulta.error));
    return G.redirecionar(res, G.urlDoApp(cfg, resultado, resultado === 'erro' ? consulta.error : null), [limparEstado]);
  }

  const valido = estado
    && typeof consulta.state === 'string'
    && consulta.state === estado.estado
    && Date.now() - estado.criadoEm <= G.DURACAO_ESTADO_S * 1000
    && typeof consulta.code === 'string';
  if (!valido) {
    // Sem o cookie do estado: o login começou num endereço diferente do de retorno.
    const resultado = estado ? 'erro' : 'outro_endereco';
    const motivo = !estado ? null : (consulta.state !== estado.estado ? 'estado_diferente' : 'estado_expirado');
    console.error('google: estado inválido no retorno', resultado, motivo || '');
    return G.redirecionar(res, G.urlDoApp(cfg, resultado, motivo), [limparEstado]);
  }

  const resultado = await G.chamar(G.URL_TOKEN, G.formulario({
    code: consulta.code,
    client_id: cfg.id,
    client_secret: cfg.segredo,
    redirect_uri: cfg.redirect,
    grant_type: 'authorization_code',
    code_verifier: estado.verificador,
  }));

  if (!resultado.ok || !resultado.dados || !resultado.dados.refresh_token) {
    // Motivo seguro: o código de erro do Google (ex.: invalid_grant), ou a falta do refresh token.
    let motivo = 'sem_resposta';
    if (resultado.dados && typeof resultado.dados.error === 'string') motivo = resultado.dados.error;
    else if (resultado.ok) motivo = 'sem_refresh_token';
    else if (resultado.status) motivo = `http_${resultado.status}`;
    console.error('google: troca do código falhou', resultado.status, G.codigoSeguro(motivo)); // sem tokens no log
    return G.redirecionar(res, G.urlDoApp(cfg, 'erro', motivo), [limparEstado]);
  }

  // A pessoa pode desmarcar a permissão da agenda na tela do Google.
  const escopos = String(resultado.dados.scope || '').split(' ');
  if (!escopos.includes(G.ESCOPO)) {
    return G.redirecionar(res, G.urlDoApp(cfg, 'sem_permissao'), [limparEstado]);
  }

  const cookieToken = G.criarCookie(
    G.COOKIE_TOKEN,
    G.cifrar({ refresh: resultado.dados.refresh_token }, cfg.segredo),
    G.DURACAO_TOKEN_S,
  );
  return G.redirecionar(res, G.urlDoApp(cfg, 'conectado'), [limparEstado, cookieToken]);
};
