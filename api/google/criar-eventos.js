// Envia várias provas de uma vez para o Google Agenda (um login só).
// Recebe { provas: [{ id, materia, nome, data, hora }] } e devolve o resultado de cada uma.
// Sem login (ou com acesso expirado/revogado), devolve "sem_login" para o app pedir o login.

const G = require('./_comum');

const MAX_PROVAS = 60;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return G.responder(res, 405, { erro: 'metodo_nao_permitido' });
  }
  const cfg = G.config();
  if (!cfg) return G.responder(res, 503, { erro: 'nao_configurado', mensagem: 'O Google Agenda não está configurado.' });

  const lista = req.body && Array.isArray(req.body.provas) ? req.body.provas : null;
  if (!lista || !lista.length || lista.length > MAX_PROVAS
    || !lista.every((p) => p && typeof p.id === 'string' && p.id.length <= 64 && G.provaValida(p))) {
    return G.responder(res, 400, { erro: 'pedido_invalido', mensagem: 'Confira as provas antes de enviar.' });
  }

  const sessao = G.decifrar(G.lerCookies(req)[G.COOKIE_TOKEN], cfg.segredo);
  if (!sessao || !sessao.refresh) return G.responder(res, 401, { erro: 'sem_login' });

  const acesso = await G.tokenDeAcesso(sessao.refresh, cfg);
  if (!acesso.ok) {
    if (acesso.revogado) {
      // Token expirado ou acesso cancelado no Google: apaga o cookie e pede login de novo.
      return G.responder(res, 401, { erro: 'sem_login', motivo: 'revogado' }, [G.apagarCookie(G.COOKIE_TOKEN)]);
    }
    console.error('google: token de acesso falhou', acesso.status);
    return G.responder(res, 502, { erro: 'falha', mensagem: 'O Google Agenda não respondeu agora.' });
  }

  // Uma de cada vez, para não estourar o limite do Google.
  const resultados = [];
  for (const prova of lista) {
    const resultado = await G.chamar(G.URL_EVENTOS, {
      method: 'POST',
      headers: { authorization: `Bearer ${acesso.token}`, 'content-type': 'application/json' },
      body: JSON.stringify(G.montarEvento(prova)),
    });
    if (resultado.status === 401) {
      return G.responder(res, 401, { erro: 'sem_login', resultados }, [G.apagarCookie(G.COOKIE_TOKEN)]);
    }
    if (!resultado.ok) console.error('google: criação de evento falhou', resultado.status);
    resultados.push({ id: prova.id, criado: Boolean(resultado.ok) });
  }

  const criados = resultados.filter((r) => r.criado).length;
  return G.responder(res, 200, { criados, total: resultados.length, resultados });
};

module.exports.config = { maxDuration: 60 };
