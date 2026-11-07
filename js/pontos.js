// Pontos da criança. Fica salvo só neste navegador.

const Pontos = (() => {
  const CHAVE = 'lumi.pontos';
  let total = ler();

  function ler() {
    try {
      const valor = parseInt(localStorage.getItem(CHAVE), 10);
      return Number.isFinite(valor) && valor >= 0 ? valor : 0;
    } catch (erro) {
      return 0;
    }
  }

  function adicionar(quantidade) {
    total += quantidade;
    try {
      localStorage.setItem(CHAVE, String(total));
    } catch (erro) {
      // Sem armazenamento (ex.: janela anônima): os pontos valem só nesta visita.
    }
    return total;
  }

  return {
    adicionar,
    total: () => total,
  };
})();
