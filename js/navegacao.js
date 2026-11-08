// Regras do botão voltar que dependem de onde a pessoa veio.

const Navegacao = (() => {
  // Telas para onde o voltar de Provas pode levar de novo.
  const ORIGENS_DE_PROVAS = ['inicio', 'tabuada', 'pais'];

  // O voltar de Provas leva para a tela de onde a pessoa veio.
  // - Da Narração, volta para a trilha: reabrir a Narração gera uma narração nova
  //   e gastaria uma das 5 do dia.
  // - Sem origem conhecida (por exemplo, na volta do login do Google), vai para a Área dos pais.
  function voltarDeProvas(origem) {
    if (ORIGENS_DE_PROVAS.includes(origem)) return origem;
    if (origem === 'narracao') return 'inicio';
    return 'pais';
  }

  return { voltarDeProvas };
})();
