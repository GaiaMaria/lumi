// Cria o evento da prova na agenda principal da família.
// Título: só a matéria e o nome da prova. Sem login (ou com acesso revogado),
// devolve "sem_login" para o app pedir o login. Falhas devolvem "falha", e o app
// oferece o arquivo .ics.

const G = require('./_comum');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return G.responder(res, 405, { erro: 'metodo_nao_permitido' });
  }
  const cfg = G.config();
  if (!cfg) return G.responder(res, 503, { erro: 'nao_configurado', mensagem: 'O Google Agenda não está configurado.' });

  const { materia, nome, data, hora } = req.body || {};
  if (!G.provaValida({ materia, nome, data, hora })) {
    return G.responder(res, 400, { erro: 'pedido_invalido', mensagem: 'Confira a matéria, o nome, o dia e o horário da prova.' });
  }

  const sessao = G.decifrar(G.lerCookies(req)[G.COOKIE_TOKEN], cfg.segredo);
  if (!sessao || !sessao.refresh) {
    return G.responder(res, 401, { erro: 'sem_login' });
  }

  const acesso = await G.tokenDeAcesso(sessao.refresh, cfg);
  if (!acesso.ok) {
    if (acesso.revogado) {
      // Token expirado ou acesso cancelado no Google (invalid_grant): apaga o cookie e pede login de novo.
      return G.responder(res, 401, { erro: 'sem_login', motivo: 'revogado' }, [G.apagarCookie(G.COOKIE_TOKEN)]);
    }
    console.error('google: token de acesso falhou', acesso.status);
    return G.responder(res, 502, { erro: 'falha', mensagem: 'O Google Agenda não respondeu agora.' });
  }

  const evento = G.montarEvento({ materia, nome, data, hora });

  const resultado = await G.chamar(G.URL_EVENTOS, {
    method: 'POST',
    headers: { authorization: `Bearer ${acesso.token}`, 'content-type': 'application/json' },
    body: JSON.stringify(evento),
  });

  if (resultado.status === 401) {
    return G.responder(res, 401, { erro: 'sem_login' }, [G.apagarCookie(G.COOKIE_TOKEN)]);
  }
  if (!resultado.ok || !resultado.dados) {
    console.error('google: criação do evento falhou', resultado.status);
    const semPermissao = resultado.status === 403;
    return G.responder(res, 502, {
      erro: 'falha',
      mensagem: semPermissao
        ? 'O Google não deu permissão para criar o evento.'
        : 'O Google Agenda não criou o evento agora.',
    });
  }

  return G.responder(res, 200, { criado: true, link: resultado.dados.htmlLink || null });
};
