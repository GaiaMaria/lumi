// Regras do botão voltar que dependem de onde a pessoa veio.

const Navegacao = (() => {
  // Telas que abrem Provas: a trilha (chip da próxima prova) e a Área dos pais.
  const ORIGENS_DE_PROVAS = ['inicio', 'pais'];

  // O voltar de Provas leva para a tela de onde a pessoa veio.
  // Sem origem conhecida (por exemplo, na volta do login do Google), vai para a Área dos pais.
  function voltarDeProvas(origem) {
    return ORIGENS_DE_PROVAS.includes(origem) ? origem : 'pais';
  }

  return { voltarDeProvas };
})();
