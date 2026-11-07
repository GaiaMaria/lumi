// Função no servidor (Vercel) que vai chamar o Claude para ler a foto.
// A chave fica só na variável de ambiente ANTHROPIC_API_KEY, nunca no código.
// Nesta etapa a função só confere se a chave existe; a chamada ao Claude
// entra na próxima. Enquanto isso, o app usa o modo demonstração.

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ erro: 'metodo_nao_permitido' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ erro: 'sem_chave' });
  }

  return res.status(501).json({ erro: 'nao_implementado' });
};
