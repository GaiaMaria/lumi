// Trilha do Início: cada missão salva vira uma "parada" do caminho.
// Só decide os textos e o estado (nova ou feita); quem desenha é o Inicio, em app.js.

const Trilha = (() => {
  const formatoData = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });

  const textoPontos = (valor) => (valor === 1 ? '1 ponto' : `${valor} pontos`);

  // Uma missão já jogada pelo menos uma vez está "feita"; senão, é "nova".
  function estado(missao) {
    return missao.vezes ? 'feita' : 'nova';
  }

  // { estado, nome, detalhe, acao } para desenhar a parada.
  function parada(missao) {
    const feita = estado(missao) === 'feita';
    const data = formatoData.format(new Date(missao.criadaEm));
    const perguntas = `${missao.perguntas.length} perguntas`;
    return {
      estado: estado(missao),
      nome: missao.disciplinaNome,
      detalhe: feita
        ? `melhor: ${textoPontos(missao.melhorPontuacao)} · ${data}`
        : `nova · ${perguntas} · ${data}`,
      acao: feita ? 'Estudar de novo' : 'Começar',
    };
  }

  return { estado, parada };
})();
