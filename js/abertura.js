// Tela de abertura: aparece só na primeira visita da aba (guardado no sessionStorage).
// Na volta do login do Google (?google=...), não aparece: o app precisa ir direto para Provas.

const Abertura = (() => {
  const CHAVE = 'lumi.abertura.vista';

  // Decide se mostra a abertura. Função pura, testada em testes/abertura.test.js.
  function deveMostrar(busca, jaVista) {
    const parametros = new URLSearchParams(busca || '');
    if (parametros.has('google')) return false;
    return !jaVista;
  }

  function lerVista() {
    try {
      return sessionStorage.getItem(CHAVE) === '1';
    } catch (erro) {
      return false;
    }
  }

  function marcarVista() {
    try {
      sessionStorage.setItem(CHAVE, '1');
    } catch (erro) {
      // Sem sessionStorage (aba privada bloqueada): a abertura pode aparecer de novo, sem problema.
    }
  }

  function iniciar() {
    const mostrar = deveMostrar(window.location.search, lerVista());
    marcarVista();
    if (mostrar) App.mostrarTela('abertura');
  }

  return { CHAVE, deveMostrar, iniciar };
})();
