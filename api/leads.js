// Lista de espera do Lumi (POST /api/leads).
// Guarda só o que a pessoa digitou na landing. Nunca loga e-mail, telefone ou IP.

const R = require('./_redis');
const L = require('./_leads');

function responder(res, http, corpo) {
  return res.status(http).json(corpo);
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
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
