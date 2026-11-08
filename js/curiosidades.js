// Banco de curiosidades (data/curiosidades.json): 150 itens com id, tema e texto.
// sortearCuriosidade(tema?) e buscarCuriosidade(id). Os textos não são alterados.

const Curiosidades = (() => {
  const ARQUIVO = 'data/curiosidades.json';
  const CHAVE_ULTIMA = 'lumi.curiosidade.ultima'; // último id mostrado nesta sessão (aba)

  const NOMES_DOS_TEMAS = {
    corpo: 'o corpo humano',
    animais: 'animais',
    espaco: 'o espaço',
    oceano: 'o oceano',
    plantas: 'plantas',
    terra: 'a Terra',
    brasil: 'o Brasil',
    matematica: 'matemática',
    invencoes: 'invenções',
    lingua: 'línguas',
  };

  let lista = null;
  let carregando = null;
  let ultimaId = lerUltima();
  let sortear = Math.random; // trocado nos testes

  function lerUltima() {
    try {
      const valor = Number(sessionStorage.getItem(CHAVE_ULTIMA));
      return Number.isInteger(valor) && valor > 0 ? valor : null;
    } catch (erro) {
      return null;
    }
  }

  function guardarUltima(id) {
    ultimaId = id;
    try {
      sessionStorage.setItem(CHAVE_ULTIMA, String(id));
    } catch (erro) {
      // Sem armazenamento: vale só a memória.
    }
  }

  function itemValido(item) {
    return item && Number.isInteger(item.id) && typeof item.tema === 'string' && typeof item.texto === 'string' && item.texto.trim();
  }

  // Carrega o arquivo uma vez só.
  function carregar() {
    if (lista) return Promise.resolve(lista);
    if (!carregando) {
      carregando = fetch(ARQUIVO)
        .then((resposta) => (resposta.ok ? resposta.json() : []))
        .then((dados) => {
          lista = Array.isArray(dados) ? dados.filter(itemValido) : [];
          return lista;
        })
        .catch(() => {
          carregando = null; // tenta de novo na próxima vez
          return [];
        });
    }
    return carregando;
  }

  // Item aleatório (opcionalmente de um tema), nunca igual ao último mostrado nesta sessão.
  async function sortearCuriosidade(tema) {
    const todas = await carregar();
    const doTema = tema ? todas.filter((item) => item.tema === tema) : todas;
    if (!doTema.length) return null;
    const opcoes = doTema.length > 1 ? doTema.filter((item) => item.id !== ultimaId) : doTema;
    const item = opcoes[Math.floor(sortear() * opcoes.length)];
    guardarUltima(item.id);
    return item;
  }

  async function buscarCuriosidade(id) {
    const todas = await carregar();
    return todas.find((item) => item.id === Number(id)) || null;
  }

  function nomeDoTema(tema) {
    return NOMES_DOS_TEMAS[tema] || tema;
  }

  return {
    carregar,
    sortearCuriosidade,
    buscarCuriosidade,
    nomeDoTema,
    _usarLista: (itens) => { lista = itens.filter(itemValido); },
    _definirSorteio: (fn) => { sortear = fn; },
  };
})();

// Nomes pedidos para as funções.
const { sortearCuriosidade, buscarCuriosidade } = Curiosidades;
