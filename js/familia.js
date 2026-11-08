// Dados da família guardados só neste aparelho (localStorage).
// A chave é um ID aleatório gerado aqui, sem nome. Nunca guardamos fotos:
// só as perguntas criadas e o progresso.

const Familia = (() => {
  const CHAVE_ID = 'lumi.familia';
  const PREFIXO = 'lumi.familia.';
  const CHAVE_ANTIGA_PONTOS = 'lumi.pontos';
  const MAX_MISSOES = 30;

  // Cópia em memória, para o app funcionar mesmo sem armazenamento (ex.: aba anônima).
  let memoria = null;

  function gerarId() {
    if (window.crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  function lerId() {
    try {
      return localStorage.getItem(CHAVE_ID);
    } catch (erro) {
      return null;
    }
  }

  function garantirId() {
    let id = lerId();
    if (!id) {
      id = gerarId();
      try {
        localStorage.setItem(CHAVE_ID, id);
      } catch (erro) {
        // Sem armazenamento: segue só com a memória.
      }
    }
    return id;
  }

  function vazio() {
    return { versao: 1, pontos: 0, missoes: [] };
  }

  function ler() {
    if (memoria) return memoria;
    const id = lerId();
    let dados = null;
    if (id) {
      try {
        const bruto = JSON.parse(localStorage.getItem(PREFIXO + id));
        if (bruto && Array.isArray(bruto.missoes)) dados = bruto;
      } catch (erro) {
        dados = null;
      }
    }
    memoria = dados || vazio();

    // Traz os pontos da versão anterior, que ficavam fora da família.
    try {
      const antigos = parseInt(localStorage.getItem(CHAVE_ANTIGA_PONTOS), 10);
      if (Number.isFinite(antigos) && antigos > 0) {
        memoria.pontos += antigos;
        localStorage.removeItem(CHAVE_ANTIGA_PONTOS);
        gravar();
      }
    } catch (erro) {
      // Ignora.
    }
    return memoria;
  }

  function gravar() {
    const id = garantirId();
    const dados = memoria;
    for (;;) {
      try {
        localStorage.setItem(PREFIXO + id, JSON.stringify(dados));
        return true;
      } catch (erro) {
        // Sem espaço: tira a missão mais antiga e tenta de novo.
        if (dados.missoes.length <= 1) return false;
        dados.missoes.pop();
      }
    }
  }

  function salvarMissao({ disciplina, disciplinaNome, perguntas, aviso, fato }) {
    const dados = ler();
    const missao = {
      id: gerarId(),
      criadaEm: new Date().toISOString(),
      disciplina,
      disciplinaNome,
      aviso: aviso || '',
      fato: fato || '', // fato curto para a narração (sem a foto)
      perguntas,
      vezes: 0,
      melhorPontuacao: 0,
      ultimaVez: null,
    };
    dados.missoes.unshift(missao);
    dados.missoes = dados.missoes.slice(0, MAX_MISSOES);
    gravar();
    return missao.id;
  }

  function concluirMissao(id, { pontos }) {
    const dados = ler();
    const missao = dados.missoes.find((m) => m.id === id);
    if (!missao) return;
    missao.vezes += 1;
    missao.melhorPontuacao = Math.max(missao.melhorPontuacao, pontos);
    missao.ultimaVez = new Date().toISOString();
    gravar();
  }

  function missoes() {
    return ler().missoes;
  }

  function missao(id) {
    return ler().missoes.find((m) => m.id === id) || null;
  }

  function adicionarPontos(quantidade) {
    const dados = ler();
    dados.pontos += quantidade;
    gravar();
    return dados.pontos;
  }

  function pontos() {
    return ler().pontos;
  }

  // Progresso da tabuada: medalhas por modo, tabuadas concluídas e contas erradas.
  function tabuada() {
    const dados = ler();
    if (!dados.tabuada || typeof dados.tabuada !== 'object') {
      dados.tabuada = { medalhas: {}, numeros: [], erros: [] };
    }
    const t = dados.tabuada;
    if (!t.medalhas || typeof t.medalhas !== 'object') t.medalhas = {};
    if (!Array.isArray(t.numeros)) t.numeros = [];
    if (!Array.isArray(t.erros)) t.erros = [];
    return t;
  }

  function salvar() {
    ler();
    gravar();
  }

  // Remove perguntas, progresso e o próprio ID deste aparelho.
  function apagarTudo() {
    const id = lerId();
    try {
      if (id) localStorage.removeItem(PREFIXO + id);
      localStorage.removeItem(CHAVE_ID);
      localStorage.removeItem(CHAVE_ANTIGA_PONTOS);
    } catch (erro) {
      // Sem armazenamento: só limpa a memória.
    }
    memoria = null;
  }

  // Data em que a responsável autorizou gravar a própria voz.
  function consentimentoVoz() {
    return ler().consentimentoVoz || null;
  }

  function registrarConsentimentoVoz() {
    const dados = ler();
    dados.consentimentoVoz = new Date().toISOString();
    gravar();
    return dados.consentimentoVoz;
  }

  return {
    id: lerId,
    garantirId,
    consentimentoVoz,
    registrarConsentimentoVoz,
    salvarMissao,
    concluirMissao,
    missoes,
    missao,
    adicionarPontos,
    pontos,
    tabuada,
    salvar,
    apagarTudo,
  };
})();
