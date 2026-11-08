// Interesse por plano (POST /api/interesse): conta os cliques nos botões de plano da landing.
// Mede a intenção mesmo sem cadastro. Nenhum dado pessoal.

const R = require('./_redis');
const L = require('./_leads');

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ erro: 'metodo_nao_permitido' });
  }
  const cfg = R.config();
  if (!cfg) return res.status(503).json({ erro: 'indisponivel' });

  const plano = req.body && req.body.plano;
  if (!L.PLANOS_DE_CLIQUE.includes(plano)) return res.status(400).json({ erro: 'plano' });

  try {
    await R.comando(cfg, ['INCR', `clique:plano:${plano}`]);
    return res.status(200).json({ ok: true });
  } catch (erro) {
    console.error('interesse: erro', erro && erro.codigo ? erro.codigo : 'desconhecido');
    return res.status(503).json({ erro: 'indisponivel' });
  }
}

module.exports = handler;
