// Ajudante do Redis da Upstash pela API REST, só com fetch (sem pacote npm).
// O "_" no nome impede que a Vercel transforme este arquivo em endereço.
// As variáveis KV_REST_API_URL e KV_REST_API_TOKEN são criadas pela integração
// Upstash for Redis na Vercel. Nunca aparecem no código nem em log.

function config() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/+$/, ''), token };
}

class ErroRedis extends Error {
  constructor(codigo) {
    super(codigo);
    this.codigo = codigo;
  }
}

async function chamar(cfg, caminho, corpo) {
  let resposta;
  try {
    resposta = await fetch(`${cfg.url}${caminho}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    });
  } catch (erro) {
    throw new ErroRedis('redis_rede');
  }
  if (!resposta.ok) throw new ErroRedis(`redis_http_${resposta.status}`);
  return resposta.json();
}

// Um comando: ['INCR', 'chave'] → resultado.
async function comando(cfg, partes) {
  const dados = await chamar(cfg, '', partes.map(String));
  if (dados && dados.error) throw new ErroRedis('redis_comando');
  return dados ? dados.result : null;
}

// Vários comandos de uma vez: [['INCR','a'], ['GET','b']] → [resultado, resultado].
async function varios(cfg, lista) {
  if (!lista.length) return [];
  const dados = await chamar(cfg, '/pipeline', lista.map((partes) => partes.map(String)));
  if (!Array.isArray(dados) || dados.some((item) => item && item.error)) throw new ErroRedis('redis_comando');
  return dados.map((item) => item.result);
}

// HGETALL devolve [campo, valor, campo, valor...]: vira objeto.
function paraObjeto(lista) {
  const objeto = {};
  if (!Array.isArray(lista)) return objeto;
  for (let i = 0; i + 1 < lista.length; i += 2) objeto[lista[i]] = lista[i + 1];
  return objeto;
}

module.exports = { config, comando, varios, paraObjeto, ErroRedis };
