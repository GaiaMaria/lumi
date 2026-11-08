// Tabuada: treinos de multiplicação.
// Todas as contas são geradas e conferidas aqui no código, nunca pela IA.

// ---------- contas (sem tela) ----------

const ContasTabuada = (() => {
  function embaralhar(lista) {
    const copia = [...lista];
    for (let i = copia.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
  }

  // Todos os pares a × b com a e b entre min e max.
  function pares(min, max) {
    const lista = [];
    for (let a = min; a <= max; a += 1) {
      for (let b = min; b <= max; b += 1) lista.push([a, b]);
    }
    return lista;
  }

  // falta: 'a' (primeiro fator), 'b' (segundo fator) ou 'produto'.
  function conta(a, b, falta = 'produto') {
    return { a, b, falta };
  }

  function texto(c) {
    const produto = c.a * c.b;
    if (c.falta === 'a') return `___ × ${c.b} = ${produto}`;
    if (c.falta === 'b') return `${c.a} × ___ = ${produto}`;
    return `${c.a} × ${c.b} = ___`;
  }

  function esperada(c) {
    if (c.falta === 'a') return c.a;
    if (c.falta === 'b') return c.b;
    return c.a * c.b;
  }

  function completa(c) {
    return `${c.a} × ${c.b} = ${c.a * c.b}`;
  }

  // 1. Qual é o número que falta: tabuadas de 1 a 10, sem repetir conta.
  function gerarFalta(quantidade = 10) {
    return embaralhar(pares(1, 10))
      .slice(0, quantidade)
      .map(([a, b]) => conta(a, b, Math.random() < 0.5 ? 'a' : 'b'));
  }

  // 2. Tabuada de um número: n × 1 até n × 10, em ordem.
  function gerarNumero(n) {
    return Array.from({ length: 10 }, (_, i) => conta(n, i + 1));
  }

  // 3. Desafio contra o tempo: contas aleatórias do 2 ao 9, sem repetir.
  function gerarDesafio(quantidade = 10) {
    return embaralhar(pares(2, 9)).slice(0, quantidade).map(([a, b]) => conta(a, b));
  }

  // 4. Revisão: as contas erradas antes.
  function gerarRevisao(erros) {
    return erros.map((e) => conta(e.a, e.b));
  }

  // Confere a resposta digitada: 'vazia', 'invalida', 'certa' ou 'errada'.
  function conferir(c, resposta) {
    const textoDigitado = String(resposta === undefined || resposta === null ? '' : resposta).trim();
    if (!textoDigitado) return 'vazia';
    if (!/^\d{1,3}$/.test(textoDigitado)) return 'invalida';
    return Number(textoDigitado) === esperada(c) ? 'certa' : 'errada';
  }

  return {
    texto,
    esperada,
    completa,
    conferir,
    gerarFalta,
    gerarNumero,
    gerarDesafio,
    gerarRevisao,
  };
})();

// ---------- tela ----------

const Tabuada = (() => {
  const PONTOS_POR_ACERTO = 5;
  const TEMPO_DESAFIO_SEGUNDOS = 60;
  const MAX_ERROS_GUARDADOS = 30;
  const ESPERA_NO_DESAFIO_MS = 900;

  const MODOS = {
    falta: { nome: 'Qual é o número que falta', medalha: 'Detetive dos números' },
    numero: { nome: 'Tabuada de um número', medalha: 'Mestre da tabuada' },
    desafio: { nome: 'Desafio contra o tempo', medalha: 'Relâmpago' },
    revisao: { nome: 'Revisão de erros', medalha: 'Nunca desisto' },
  };

  const $ = (id) => document.getElementById(id);
  const el = {
    voltar: $('tabuada-voltar'),
    menu: $('tabuada-menu'),
    numeros: $('tabuada-numeros'),
    jogo: $('tabuada-jogo'),
    fim: $('tabuada-fim'),
    nivel: $('tabuada-nivel'),
    nivelBarra: $('tabuada-nivel-barra'),
    nivelPreenchido: $('tabuada-nivel-preenchido'),
    nivelDetalhe: $('tabuada-nivel-detalhe'),
    medalhas: $('tabuada-medalhas'),
    revisao: $('modo-revisao'),
    revisaoDetalhe: $('revisao-detalhe'),
    gradeNumeros: $('grade-numeros'),
    progresso: $('tabuada-progresso'),
    tempo: $('tabuada-tempo'),
    conta: $('tabuada-conta'),
    resposta: $('tabuada-resposta'),
    conferir: $('tabuada-conferir'),
    feedback: $('tabuada-feedback'),
    proxima: $('tabuada-proxima'),
    fimTitulo: $('tabuada-fim-titulo'),
    fimPontos: $('tabuada-fim-pontos'),
    fimDetalhe: $('tabuada-fim-detalhe'),
    fimMedalha: $('tabuada-fim-medalha'),
    fimNivel: $('tabuada-fim-nivel'),
    deNovo: $('tabuada-de-novo'),
    outroModo: $('tabuada-menu-voltar'),
  };

  let rodada = null;
  let relogio = null;
  let espera = null;
  let vista = 'menu';

  function progresso() {
    return Familia.tabuada();
  }

  function mostrar(qual) {
    vista = qual;
    ['menu', 'numeros', 'jogo', 'fim'].forEach((nome) => {
      el[nome].hidden = nome !== qual;
    });
    window.scrollTo(0, 0);
  }

  function parar() {
    clearInterval(relogio);
    clearTimeout(espera);
    relogio = null;
    espera = null;
  }

  // ---------- menu ----------

  function desenharNivel() {
    const { nivel, noNivel, faltam, total } = Pontos.nivel();
    el.nivel.textContent = nivel;
    el.nivelPreenchido.style.width = `${(noNivel / Pontos.PONTOS_POR_NIVEL) * 100}%`;
    el.nivelBarra.setAttribute('aria-valuenow', String(noNivel));
    el.nivelDetalhe.textContent =
      `${Quiz.textoPontos(total)} · faltam ${faltam} para o nível ${nivel + 1}`;
  }

  function desenharMedalhas() {
    const { medalhas } = progresso();
    el.medalhas.replaceChildren(...Object.entries(MODOS).map(([chave, modo]) => {
      const item = document.createElement('li');
      const ganha = Boolean(medalhas[chave]);
      item.className = `medalha ${ganha ? 'medalha--ganha' : 'medalha--bloqueada'}`;
      const nome = document.createElement('strong');
      nome.textContent = modo.medalha;
      const detalhe = document.createElement('span');
      detalhe.textContent = ganha ? 'Conquistada' : 'Ainda não';
      item.append(nome, detalhe);
      return item;
    }));
  }

  function desenharMenu() {
    desenharNivel();
    desenharMedalhas();
    const erros = progresso().erros.length;
    el.revisao.disabled = erros === 0;
    el.revisaoDetalhe.textContent = erros
      ? `${erros} ${erros === 1 ? 'conta para revisar' : 'contas para revisar'}`
      : 'Nenhum erro para revisar';
  }

  function desenharNumeros() {
    const feitos = progresso().numeros;
    el.gradeNumeros.replaceChildren(...Array.from({ length: 10 }, (_, i) => {
      const n = i + 1;
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'numero vidro';
      botao.textContent = n;
      if (feitos.includes(n)) {
        botao.classList.add('numero--feito');
        botao.setAttribute('aria-label', `Tabuada do ${n}, já concluída`);
      } else {
        botao.setAttribute('aria-label', `Tabuada do ${n}`);
      }
      botao.addEventListener('click', () => comecar('numero', n));
      return botao;
    }));
  }

  function abrir() {
    parar();
    rodada = null;
    desenharMenu();
    mostrar('menu');
  }

  // ---------- rodada ----------

  function comecar(modo, numero = null) {
    parar();
    let contas;
    if (modo === 'falta') contas = ContasTabuada.gerarFalta();
    else if (modo === 'numero') contas = ContasTabuada.gerarNumero(numero);
    else if (modo === 'desafio') contas = ContasTabuada.gerarDesafio();
    else contas = ContasTabuada.gerarRevisao(progresso().erros);

    if (!contas.length) {
      abrir();
      return;
    }

    rodada = {
      modo,
      numero,
      contas,
      fila: [...contas], // usada na revisão
      indice: 0,
      acertos: 0,
      erradas: 0,
      respondidas: 0,
      pontos: 0,
      nivelAntes: Pontos.nivel().nivel,
      terminou: false,
      ultimo: null,
    };

    mostrar('jogo');
    el.tempo.hidden = modo !== 'desafio';
    if (modo === 'desafio') iniciarRelogio();
    mostrarConta();
  }

  function contaAtual() {
    return rodada.modo === 'revisao' ? rodada.fila[0] : rodada.contas[rodada.indice];
  }

  function mostrarConta() {
    const c = contaAtual();
    rodada.respondida = false;
    el.progresso.textContent = rodada.modo === 'revisao'
      ? (rodada.fila.length === 1 ? 'Falta 1 conta' : `Faltam ${rodada.fila.length} contas`)
      : `Conta ${rodada.indice + 1} de ${rodada.contas.length}`;
    el.conta.textContent = ContasTabuada.texto(c);
    el.resposta.value = '';
    el.resposta.disabled = false;
    el.resposta.classList.remove('tabuada-resposta--certa', 'tabuada-resposta--errada');
    el.conferir.hidden = false;
    el.feedback.hidden = true;
    el.proxima.hidden = true;
    el.resposta.focus();
  }

  function mostrarFeedback(tipo, titulo, detalhe) {
    const forte = document.createElement('strong');
    forte.textContent = titulo;
    const partes = [forte];
    if (detalhe) {
      const span = document.createElement('span');
      span.textContent = detalhe;
      partes.push(span);
    }
    el.feedback.replaceChildren(...partes);
    el.feedback.className = `feedback feedback--${tipo}`;
    el.feedback.hidden = false;
  }

  function registrarErro(c) {
    const p = progresso();
    if (!p.erros.some((e) => e.a === c.a && e.b === c.b)) {
      p.erros.push({ a: c.a, b: c.b });
      if (p.erros.length > MAX_ERROS_GUARDADOS) p.erros.shift();
    }
  }

  function tirarErro(c) {
    const p = progresso();
    p.erros = p.erros.filter((e) => !(e.a === c.a && e.b === c.b));
  }

  function responder() {
    if (!rodada || rodada.respondida || rodada.terminou) return;
    const c = contaAtual();
    const resultado = ContasTabuada.conferir(c, el.resposta.value);

    if (resultado === 'vazia') {
      mostrarFeedback('neutro', 'Digite um número.');
      el.resposta.focus();
      return;
    }
    if (resultado === 'invalida') {
      mostrarFeedback('neutro', 'Use só números.');
      el.resposta.select();
      return;
    }

    rodada.respondida = true;
    rodada.respondidas += 1;
    rodada.ultimo = resultado;
    el.resposta.disabled = true;
    el.conferir.hidden = true;

    if (resultado === 'certa') {
      rodada.acertos += 1;
      rodada.pontos += PONTOS_POR_ACERTO;
      Pontos.adicionar(PONTOS_POR_ACERTO);
      if (rodada.modo === 'revisao') tirarErro(c);
      el.resposta.classList.add('tabuada-resposta--certa');
      mostrarFeedback('sucesso', `Certo! +${PONTOS_POR_ACERTO} pontos`, ContasTabuada.completa(c));
    } else {
      rodada.erradas += 1;
      registrarErro(c);
      el.resposta.classList.add('tabuada-resposta--errada');
      mostrarFeedback('erro', 'Quase!', `A conta completa é ${ContasTabuada.completa(c)}.`);
    }
    Familia.salvar();

    if (rodada.modo === 'desafio') {
      espera = setTimeout(avancar, ESPERA_NO_DESAFIO_MS);
      return;
    }
    const ultima = rodada.modo === 'revisao'
      ? rodada.fila.length === 1 && resultado === 'certa'
      : rodada.indice === rodada.contas.length - 1;
    el.proxima.textContent = ultima ? 'Ver resultado' : 'Próxima';
    el.proxima.hidden = false;
    el.proxima.focus();
  }

  function avancar() {
    clearTimeout(espera);
    if (!rodada || rodada.terminou || !rodada.respondida) return;
    if (rodada.modo === 'revisao') {
      const c = rodada.fila.shift();
      if (rodada.ultimo !== 'certa') rodada.fila.push(c); // repete até acertar
      if (!rodada.fila.length) {
        terminar(true);
        return;
      }
    } else {
      rodada.indice += 1;
      if (rodada.indice >= rodada.contas.length) {
        terminar(true);
        return;
      }
    }
    mostrarConta();
  }

  function iniciarRelogio() {
    const fim = Date.now() + TEMPO_DESAFIO_SEGUNDOS * 1000;
    const atualizar = () => {
      const restam = Math.max(0, Math.ceil((fim - Date.now()) / 1000));
      el.tempo.textContent = `${restam} s`;
      if (restam <= 0) terminar(false);
    };
    atualizar();
    relogio = setInterval(atualizar, 200);
  }

  // concluiu: true quando a criança respondeu tudo (ou zerou a revisão).
  function terminar(concluiu) {
    if (!rodada || rodada.terminou) return;
    rodada.terminou = true;
    parar();

    const p = progresso();
    const modo = MODOS[rodada.modo];
    let novaMedalha = false;
    if (concluiu) {
      if (!p.medalhas[rodada.modo]) {
        p.medalhas[rodada.modo] = new Date().toISOString();
        novaMedalha = true;
      }
      if (rodada.modo === 'numero' && !p.numeros.includes(rodada.numero)) {
        p.numeros.push(rodada.numero);
        p.numeros.sort((x, y) => x - y);
      }
    }
    Familia.salvar();

    el.fimTitulo.textContent = concluiu ? 'Modo concluído!' : 'O tempo acabou!';
    el.fimPontos.textContent = rodada.pontos;
    if (rodada.modo === 'revisao') {
      el.fimDetalhe.textContent = `Você revisou ${rodada.contas.length} ${rodada.contas.length === 1 ? 'conta' : 'contas'} até acertar.`;
    } else if (!concluiu) {
      el.fimDetalhe.textContent = `Você respondeu ${rodada.respondidas} de ${rodada.contas.length} e acertou ${rodada.acertos}. Tente de novo!`;
    } else {
      el.fimDetalhe.textContent = `Você acertou ${rodada.acertos} de ${rodada.contas.length}.`;
    }

    if (concluiu) {
      el.fimMedalha.textContent = novaMedalha
        ? `Nova medalha: ${modo.medalha}!`
        : `Você já tem a medalha ${modo.medalha}.`;
      el.fimMedalha.hidden = false;
    } else {
      el.fimMedalha.hidden = true;
    }

    const nivelAgora = Pontos.nivel().nivel;
    el.fimNivel.hidden = nivelAgora <= rodada.nivelAntes;
    el.fimNivel.textContent = `Nível novo: você chegou ao nível ${nivelAgora}!`;

    el.deNovo.hidden = rodada.modo === 'revisao' && p.erros.length === 0;
    mostrar('fim');
  }

  // ---------- eventos ----------

  document.querySelectorAll('[data-modo]').forEach((botao) => {
    botao.addEventListener('click', () => {
      const modo = botao.dataset.modo;
      if (modo === 'numero') {
        desenharNumeros();
        mostrar('numeros');
      } else {
        comecar(modo);
      }
    });
  });

  el.jogo.addEventListener('submit', (evento) => {
    evento.preventDefault();
    if (rodada && rodada.respondida) avancar();
    else responder();
  });
  el.proxima.addEventListener('click', avancar);
  el.deNovo.addEventListener('click', () => comecar(rodada.modo, rodada.numero));
  el.outroModo.addEventListener('click', abrir);

  el.voltar.addEventListener('click', () => {
    if (vista === 'menu') {
      parar();
      App.mostrarTela('inicio');
    } else {
      abrir();
    }
  });

  return { abrir, parar };
})();
