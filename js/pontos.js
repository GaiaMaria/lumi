// Pontos da criança. Ficam guardados nos dados da família, só neste aparelho.

const Pontos = (() => ({
  adicionar: (quantidade) => Familia.adicionarPontos(quantidade),
  total: () => Familia.pontos(),
}))();
