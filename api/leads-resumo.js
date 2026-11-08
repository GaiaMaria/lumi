// Resumo da lista de espera (GET /api/leads-resumo?chave=...).
// Protegido pela variável LEADS_CHAVE (só na Vercel). Com &formato=csv, baixa a planilha.
// Nunca loga e-mail, telefone ou a chave.

const R = require('./_redis');
const L = require('./_leads');

const DIAS_NO_RESUMO = 14;

async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ erro: 'metodo_nao_permitido' });
  }

  const cfg = R.config();
  const chaveCerta = process.env.LEADS_CHAVE;
  if (!cfg || !chaveCerta) return res.status(503).json({ erro: 'indisponivel' });

  const consulta = req.query || {};
  if (!L.chaveConfere(consulta.chave, chaveCerta)) return res.status(401).json({ erro: 'nao_autorizado' });

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

    return res.status(200).json(L.resumir(leads, cliques, leadsPorDia));
  } catch (erro) {
    console.error('leads-resumo: erro', erro && erro.codigo ? erro.codigo : 'desconhecido');
    return res.status(503).json({ erro: 'indisponivel' });
  }
}

module.exports = handler;
