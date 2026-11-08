// Tela "Missão completa!": textos dos cartões, da barra de nível e a regra do botão do fato.
// Só decide o que mostrar; quem desenha é o FotoQuest, em app.js.

const Resultado = (() => {
  // Cartões além dos pontos: acertos de primeira (se houver perguntas corrigíveis)
  // e "sua melhor" (só numa missão salva que já foi jogada antes).
  function cartoes({ acertosDePrimeira, corrigiveis, vezes = 0, melhorPontuacao = 0 }) {
    return {
      acertos: corrigiveis > 0 ? `${acertosDePrimeira}/${corrigiveis}` : null,
      melhor: vezes > 1 ? String(melhorPontuacao) : null,
    };
  }

  // "Nível 3 → 4" e "faltam 10 pontos".
  function textoNivel({ nivel, faltam }) {
    return {
      titulo: `Nível ${nivel} → ${nivel + 1}`,
      faltam: faltam === 1 ? 'falta 1 ponto' : `faltam ${faltam} pontos`,
    };
  }

  // "Ouvir o fato da Dóris" só aparece quando a narração vai ler o fato DESTA missão
  // (a tela de narração lê o fato mais recente) e quando há como narrar.
  function mostrarFato({ fatoDaMissao, fatoMaisRecente, narracaoDisponivel }) {
    const fato = typeof fatoDaMissao === 'string' ? fatoDaMissao.trim() : '';
    return Boolean(fato && narracaoDisponivel && fatoMaisRecente && fatoMaisRecente.trim() === fato);
  }

  return { cartoes, textoNivel, mostrarFato };
})();
