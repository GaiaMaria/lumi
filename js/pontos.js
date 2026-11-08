// Pontos e níveis da criança. Ficam guardados nos dados da família, só neste aparelho.
// Um nível novo a cada 50 pontos (somando missões e tabuada).

const Pontos = (() => {
  const PONTOS_POR_NIVEL = 50;

  function nivel() {
    const total = Familia.pontos();
    const noNivel = total % PONTOS_POR_NIVEL;
    return {
      total,
      nivel: Math.floor(total / PONTOS_POR_NIVEL) + 1,
      noNivel,
      faltam: PONTOS_POR_NIVEL - noNivel,
    };
  }

  return {
    PONTOS_POR_NIVEL,
    adicionar: (quantidade) => Familia.adicionarPontos(quantidade),
    total: () => Familia.pontos(),
    nivel,
  };
})();
