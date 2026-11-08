// Lista de espera do Lumi.
// - POST /api/leads: guarda só o que a pessoa digitou na landing.
// - GET /api/leads?chave=...: resumo (protegido por LEADS_CHAVE); &formato=csv baixa a planilha.
// Fica tudo num arquivo só porque o plano gratuito da Vercel aceita no máximo 12 funções.
// Nunca loga e-mail, telefone, IP ou a chave.

const R = require('./_redis');
const L = require('./_leads');

function responder(res, http, corpo) {
  return res.status(http).json(corpo);
}

const DIAS_NO_RESUMO = 14;

// Resumo para a dona do Lumi: totais e CSV. Só com a chave certa.
async function resumo(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const cfg = R.config();
  const chaveCerta = process.env.LEADS_CHAVE;
  if (!cfg || !chaveCerta) return responder(res, 503, { erro: 'indisponivel' });

  const consulta = req.query || {};
  if (!L.chaveConfere(consulta.chave, chaveCerta)) return responder(res, 401, { erro: 'nao_autorizado' });

  try {
    const ids = (await R.comando(cfg, ['SMEMBERS', 'leads'])) || [];
    const brutos = await R.varios(cfg, ids.map((id) => ['HGETALL', `lead:${id}`]));
    const leads = brutos.map(R.paraObjeto).filter((lead) => lead.email);

    if (consulta.formato === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="leads-lumi-${L.dia()}.csv"`);
      return res.status(200).send(L.paraCsv(leads));
    }

    const dias = L.ultimosDias(DIAS_NO_RESUMO);
    const [gratuito, vozFamilia, ...porDia] = await R.varios(cfg, [
      ['GET', 'clique:plano:gratuito'],
      ['GET', 'clique:plano:voz_familia'],
      ...dias.map((d) => ['GET', `contagem:dia:${d}`]),
    ]);
    const leadsPorDia = {};
    dias.forEach((d, i) => { leadsPorDia[d] = Number(porDia[i] || 0); });
    const cliques = { gratuito: Number(gratuito || 0), voz_familia: Number(vozFamilia || 0) };
    return responder(res, 200, L.resumir(leads, cliques, leadsPorDia));
  } catch (erro) {
    console.error('leads-resumo: erro', erro && erro.codigo ? erro.codigo : 'desconhecido');
    return responder(res, 503, { erro: 'indisponivel' });
  }
}

async function handler(req, res) {
  if (req.method === 'GET') return resumo(req, res);
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return responder(res, 405, { erro: 'metodo_nao_permitido' });
  }

  const cfg = R.config();
  const sal = process.env.LEADS_SAL;
  if (!cfg || !sal) return responder(res, 503, { erro: 'indisponivel' });

  const corpo = req.body || {};

  // Robô preencheu o campo escondido: finge que deu certo e não guarda nada.
  if (L.ehRobo(corpo)) return responder(res, 200, { ok: true });

  const validacao = L.validar(corpo);
  if (!validacao.ok) return responder(res, 400, { erro: validacao.erro });
  const { lead } = validacao;

  try {
    // No máximo 5 envios por hora por pessoa (pelo hash do IP com sal do dia).
    const chaveLimite = L.chaveDeLimite(L.ipDoPedido(req), sal);
    const [envios] = await R.varios(cfg, [['INCR', chaveLimite], ['EXPIRE', chaveLimite, 3600]]);
    if (Number(envios) > L.LIMITE_POR_HORA) return responder(res, 429, { erro: 'limite' });

    const id = L.sha256(lead.email);
    const chave = `lead:${id}`;
    const agora = new Date().toISOString();
    const planoAntes = await R.comando(cfg, ['HGET', chave, 'plano']);

    if (planoAntes) {
      // E-mail repetido: não cria outro lead. Atualiza o plano (se veio um plano de verdade) e a data.
      const comandos = [['HSET', chave, 'atualizadoEm', agora]];
      if (lead.plano !== 'indefinido' && lead.plano !== planoAntes) {
        comandos.push(
          ['HSET', chave, 'plano', lead.plano],
          ['DECR', `contagem:plano:${planoAntes}`],
          ['INCR', `contagem:plano:${lead.plano}`],
        );
      }
      // Dados que antes ficaram em branco (ex.: veio do formulário curto) são completados.
      if (lead.uf) comandos.push(['HSET', chave, 'uf', lead.uf]);
      if (lead.anos.length) comandos.push(['HSET', chave, 'anos', lead.anos.join(',')]);
      if (lead.whatsapp) comandos.push(['HSET', chave, 'whatsapp', lead.whatsapp]);
      await R.varios(cfg, comandos);
      console.log('lead atualizado');
      return responder(res, 200, { ok: true });
    }

    const campos = {
      email: lead.email,
      plano: lead.plano,
      uf: lead.uf,
      anos: lead.anos.join(','),
      whatsapp: lead.whatsapp,
      consentimento: 'sim',
      consentimentoEm: agora,
      criadoEm: agora,
      ...lead.origem,
    };
    const comandos = [
      ['HSET', chave, ...Object.entries(campos).flat()],
      ['SADD', 'leads', id],
      ['INCR', `contagem:plano:${lead.plano}`],
      ['INCR', `contagem:dia:${L.dia()}`],
    ];
    if (lead.uf) comandos.push(['INCR', `contagem:uf:${lead.uf}`]);
    await R.varios(cfg, comandos);
    console.log('lead salvo');
    return responder(res, 200, { ok: true });
  } catch (erro) {
    console.error('leads: erro', erro && erro.codigo ? erro.codigo : 'desconhecido');
    return responder(res, 503, { erro: 'indisponivel' });
  }
}

module.exports = handler;
