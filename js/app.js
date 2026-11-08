// Controle das telas e navegação

const App = (() => {
  const telas = document.querySelectorAll('.tela');
  const nav = document.getElementById('nav-principal');
  // Telas com a barra de navegação de baixo. Na Tabuada, ela some durante o jogo (regra no CSS).
  const TELAS_COM_NAV = ['inicio', 'tabuada', 'narracao', 'pais'];

  // Mostra a barra só nas telas certas e marca o item da tela atual.
  function atualizarNav() {
    const visivel = [...telas].find((tela) => !tela.hidden);
    const nome = visivel ? visivel.id.replace('tela-', '') : '';
    const comNav = TELAS_COM_NAV.includes(nome);
    nav.hidden = !comNav;
    document.body.classList.toggle('com-nav', comNav);
    nav.querySelectorAll('[data-nav]').forEach((item) => {
      if (item.dataset.nav === nome) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });
  }

  // { manter: true } volta para a tela sem limpar o que já foi preenchido.
  function mostrarTela(nome, { manter = false } = {}) {
    telas.forEach((tela) => {
      tela.hidden = tela.id !== `tela-${nome}`;
    });
    window.scrollTo(0, 0);
    Voz.parar(); // não deixa a leitura continuar em outra tela
    if (nome === 'tabuada') Tabuada.abrir();
    else Tabuada.parar(); // para o relógio do desafio ao sair
    if (nome === 'pais') {
      MinhaVoz.abrir();
      Narracao.atualizarAreaDosPais();
    }
    else MinhaVoz.sair(); // para uma gravação em andamento ao sair
    if (nome === 'provas') Calendario.abrir();
    if (nome === 'narracao') Narracao.abrir();
    else Narracao.sair();
    if (nome === 'fotoquest' && !manter) FotoQuest.preparar();
    if (nome === 'inicio') Inicio.atualizar();
    atualizarNav();
  }

  // Botões com data-ir="nome-da-tela" levam para aquela tela.
  document.addEventListener('click', (evento) => {
    const alvo = evento.target.closest('[data-ir]');
    if (alvo) mostrarTela(alvo.dataset.ir);
  });

  return { mostrarTela, atualizarNav };
})();

// FotoQuest: escolher disciplina e fotos, e transformar em missão.
const FotoQuest = (() => {
  const DISCIPLINAS = {
    portugues: 'Português',
    matematica: 'Matemática',
    ciencias: 'Ciências',
    historia: 'História',
    geografia: 'Geografia',
    outra: 'Outra',
  };

  const MENSAGENS = {
    naoLeu: 'Não consegui ler esta foto. Tente de novo com boa luz, a página reta e o texto inteiro dentro do quadro.',
    semDisciplina: 'Escolha a disciplina antes de enviar.',
    semOutra: 'Escreva qual é a disciplina.',
    semFotos: 'Escolha pelo menos uma foto.',
    tipoInvalido: 'Use fotos em JPG, PNG ou HEIC.',
    heicSemSuporte: 'Este navegador não abre fotos HEIC. Tire a foto direto pelo celular ou salve como JPG.',
    naoAbriu: 'Não consegui abrir uma das fotos. Tente outra foto.',
    muitoGrande: 'As fotos ficaram grandes demais para enviar juntas. Tente com menos fotos.',
    semPerguntas: 'Não encontrei conteúdo para criar perguntas nessas fotos.',
    falhou: 'Não consegui criar as perguntas agora. Tente de novo daqui a pouco.',
  };

  // Limite seguro para o corpo do pedido na Vercel (cerca de 4,5 MB).
  const LIMITE_ENVIO_BYTES = 4 * 1024 * 1024;

  const el = {
    form: document.getElementById('form-fotos'),
    outraCaixa: document.getElementById('campo-outra'),
    outraTexto: document.getElementById('disciplina-outra'),
    entradas: [document.getElementById('entrada-camera'), document.getElementById('entrada-galeria')],
    rotuloCamera: document.getElementById('rotulo-camera'),
    rotulos: [document.getElementById('rotulo-camera'), document.getElementById('rotulo-galeria')],
    contador: document.getElementById('contador-fotos'),
    miniaturas: document.getElementById('miniaturas'),
    declaracao: document.getElementById('declaracao'),
    enviar: document.getElementById('botao-enviar'),
    mensagem: document.getElementById('mensagem-foto'),
    resultadoPontos: document.getElementById('resultado-pontos'),
    resultadoDetalhe: document.getElementById('resultado-detalhe'),
    textoDisciplina: document.getElementById('texto-disciplina'),
    continuar: document.getElementById('botao-continuar'),
    trocar: document.getElementById('botao-trocar'),
  };

  // Fotos já reduzidas, só na memória desta tela: { id, blob, url }.
  let fotos = [];
  let proximoId = 1;
  let preparando = false;
  let enviando = false;

  // Última resposta da API, para não reenviar as mesmas fotos ao trocar a disciplina.
  let ultimaResposta = null;
  // Missão esperando a confirmação da disciplina.
  let pendente = null;

  function chaveDasFotos() {
    return fotos.map((foto) => foto.id).join(',');
  }

  function atualizarBotao() {
    el.enviar.disabled = !el.declaracao.checked || preparando || enviando;
  }

  function avisar(texto) {
    el.mensagem.textContent = texto || '';
  }

  function disciplinaEscolhida() {
    const marcada = el.form.querySelector('input[name="disciplina"]:checked');
    if (!marcada) return null;
    const slug = marcada.value;
    const nome = slug === 'outra' ? el.outraTexto.value.trim() : DISCIPLINAS[slug];
    return { slug, nome };
  }

  function liberarFotos() {
    fotos.forEach((foto) => URL.revokeObjectURL(foto.url));
    fotos = [];
    ultimaResposta = null;
    pendente = null;
  }

  // Começa sempre do zero: nenhuma foto fica guardada.
  function preparar() {
    liberarFotos();
    el.form.reset();
    el.outraCaixa.hidden = true;
    el.entradas.forEach((entrada) => { entrada.value = ''; });
    preparando = false;
    enviando = false;
    el.enviar.textContent = 'Enviar fotos';
    avisar('');
    desenharMiniaturas();
    atualizarBotao();
  }

  function desenharMiniaturas() {
    el.miniaturas.replaceChildren(...fotos.map((foto, indice) => {
      const item = document.createElement('li');
      item.className = 'miniatura';

      const img = document.createElement('img');
      img.src = foto.url;
      img.alt = `Foto ${indice + 1}`;

      const remover = document.createElement('button');
      remover.type = 'button';
      remover.className = 'miniatura__remover';
      remover.textContent = '×';
      remover.setAttribute('aria-label', `Remover foto ${indice + 1}`);
      remover.addEventListener('click', () => {
        URL.revokeObjectURL(foto.url);
        fotos.splice(indice, 1);
        desenharMiniaturas();
      });

      item.append(img, remover);
      return item;
    }));

    el.contador.textContent = fotos.length
      ? `${fotos.length} de ${Fotos.MAX_FOTOS} fotos`
      : '';
    el.rotuloCamera.textContent = fotos.length ? 'Tirar outra foto' : 'Tirar foto';
    const cheio = fotos.length >= Fotos.MAX_FOTOS;
    el.rotulos.forEach((rotulo) => rotulo.classList.toggle('botao-foto--cheio', cheio));
    el.entradas.forEach((entrada) => { entrada.disabled = cheio; });
  }

  el.form.addEventListener('change', (evento) => {
    if (evento.target.name === 'disciplina') {
      const ehOutra = evento.target.value === 'outra';
      el.outraCaixa.hidden = !ehOutra;
      if (ehOutra) el.outraTexto.focus();
    }
    if (evento.target === el.declaracao) atualizarBotao();
  });

  // Câmera e galeria usam o mesmo tratamento.
  el.entradas.forEach((entrada) => {
    entrada.addEventListener('change', () => {
      const escolhidas = Array.from(entrada.files || []);
      entrada.value = '';
      adicionarFotos(escolhidas);
    });
  });

  async function adicionarFotos(escolhidas) {
    if (!escolhidas.length) return;

    const vagas = Fotos.MAX_FOTOS - fotos.length;
    if (vagas <= 0) {
      avisar(`Você já tem ${Fotos.MAX_FOTOS} fotos. Remova uma para trocar.`);
      return;
    }

    const usadas = escolhidas.slice(0, vagas);
    const avisos = [];
    if (escolhidas.length > vagas) {
      avisos.push(`O limite é ${Fotos.MAX_FOTOS} fotos. Usei só as ${vagas} primeiras.`);
    }

    preparando = true;
    atualizarBotao();

    for (let i = 0; i < usadas.length; i += 1) {
      const arquivo = usadas[i];
      avisar(`Preparando fotos... ${i + 1} de ${usadas.length}`);

      if (!Fotos.tipoAceito(arquivo)) {
        avisos.push(MENSAGENS.tipoInvalido);
        continue;
      }
      try {
        const { blob } = await Fotos.reduzir(arquivo);
        fotos.push({ id: proximoId++, blob, url: URL.createObjectURL(blob) });
        desenharMiniaturas();
      } catch (erro) {
        avisos.push(Fotos.ehHeic(arquivo) ? MENSAGENS.heicSemSuporte : MENSAGENS.naoAbriu);
      }
    }

    preparando = false;
    atualizarBotao();
    avisar([...new Set(avisos)].join(' '));
  }

  el.form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    if (el.enviar.disabled) return;

    const disciplina = disciplinaEscolhida();
    if (!disciplina) return avisar(MENSAGENS.semDisciplina);
    if (!disciplina.nome) {
      el.outraTexto.focus();
      return avisar(MENSAGENS.semOutra);
    }
    if (!fotos.length) return avisar(MENSAGENS.semFotos);

    enviando = true;
    atualizarBotao();
    el.enviar.textContent = 'Enviando...';
    avisar('A Dóris está lendo suas fotos...');

    const resultado = await buscarPerguntas(disciplina);

    enviando = false;
    el.enviar.textContent = 'Enviar fotos';
    atualizarBotao();

    if (resultado.erro) return avisar(resultado.mensagem);
    avisar('');

    const missao = { ...resultado, disciplina };
    const detectada = resultado.disciplinaDetectada;
    const diferente = !resultado.demo
      && disciplina.slug !== 'outra'
      && detectada
      && detectada !== 'outra'
      && detectada !== disciplina.slug;

    if (diferente) {
      pendente = missao;
      el.textoDisciplina.textContent =
        `Esta página parece ser de ${DISCIPLINAS[detectada]}. Você escolheu ${disciplina.nome}. Continuar?`;
      App.mostrarTela('disciplina');
      el.continuar.focus();
      return;
    }
    comecarMissao(missao);
  });

  el.continuar.addEventListener('click', () => {
    if (!pendente) return;
    const missao = pendente;
    pendente = null;
    comecarMissao(missao);
  });

  el.trocar.addEventListener('click', () => {
    pendente = null;
    App.mostrarTela('fotoquest', { manter: true });
    avisar('Troque a disciplina ou as fotos e envie de novo.');
    const marcada = el.form.querySelector('input[name="disciplina"]:checked');
    if (marcada) marcada.focus();
  });

  function comecarMissao(missao) {
    // Guarda as perguntas para a família estudar depois. As fotos não são guardadas.
    // As perguntas de exemplo do modo demonstração não são guardadas.
    const id = missao.demo
      ? null
      : Familia.salvarMissao({
        disciplina: missao.disciplina.slug,
        disciplinaNome: missao.disciplina.nome,
        perguntas: missao.perguntas,
        aviso: missao.aviso,
        fato: missao.fato,
      });
    jogar(missao.perguntas, { demo: missao.demo, aviso: missao.aviso, id });
  }

  function jogar(perguntas, { demo = false, aviso = '', id = null } = {}) {
    Quiz.iniciar(perguntas, {
      demo,
      aviso,
      aoTerminar: (resultado) => {
        if (id) Familia.concluirMissao(id, resultado);
        mostrarResultado(resultado);
      },
    });
    App.mostrarTela('quiz');
  }

  async function montarPedido(disciplina) {
    const imagens = await Promise.all(fotos.map((foto) => Fotos.paraBase64(foto.blob)));
    return JSON.stringify({
      disciplina: disciplina.slug,
      disciplinaNome: disciplina.nome,
      fotos: imagens,
    });
  }

  // Pede as perguntas para api/questoes.js. Se a função não estiver
  // disponível (sem chave configurada, rodando local ou fora do ar),
  // usa as perguntas de exemplo em modo demonstração.
  function modoDemonstracao() {
    return { perguntas: Quiz.PERGUNTAS_DEMO, demo: true, aviso: '', fato: Quiz.FATO_DEMO, disciplinaDetectada: null };
  }

  async function buscarPerguntas(disciplina) {
    const chave = chaveDasFotos();
    if (ultimaResposta && ultimaResposta.chave === chave) {
      return ultimaResposta.resultado;
    }

    let corpo;
    try {
      corpo = await montarPedido(disciplina);
    } catch (erro) {
      return { erro: true, mensagem: MENSAGENS.naoAbriu };
    }
    if (corpo.length > LIMITE_ENVIO_BYTES) {
      return { erro: true, mensagem: MENSAGENS.muitoGrande };
    }

    let resposta;
    let dados = null;
    try {
      resposta = await fetch('/api/questoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: corpo,
      });
      dados = await resposta.json().catch(() => null);
    } catch (erro) {
      // Sem conexão com a função: modo demonstração.
      return modoDemonstracao();
    }

    // Função ausente (rodando sem servidor) ou sem chave: modo demonstração.
    if (!dados || dados.erro === 'sem_chave') {
      return [404, 405, 501, 503].includes(resposta.status) || (dados && dados.erro === 'sem_chave')
        ? modoDemonstracao()
        : { erro: true, mensagem: MENSAGENS.falhou };
    }

    if (dados.erro === 'nao_foi_possivel_ler') return { erro: true, mensagem: MENSAGENS.naoLeu };
    if (dados.erro === 'sem_perguntas') {
      return { erro: true, mensagem: [MENSAGENS.semPerguntas, dados.aviso].filter(Boolean).join(' ') };
    }
    if (!resposta.ok || dados.erro) return { erro: true, mensagem: MENSAGENS.falhou };

    const perguntas = Quiz.suportadas(dados.perguntas);
    if (!perguntas.length) return { erro: true, mensagem: MENSAGENS.falhou };

    const resultado = {
      perguntas,
      demo: false,
      aviso: typeof dados.aviso === 'string' ? dados.aviso : '',
      fato: typeof dados.fato === 'string' ? dados.fato.slice(0, 300) : '',
      disciplinaDetectada: dados.disciplina_detectada,
    };
    ultimaResposta = { chave, resultado };
    return resultado;
  }

  function mostrarResultado({ pontos, acertosDePrimeira, corrigiveis }) {
    el.resultadoPontos.textContent = pontos;
    el.resultadoDetalhe.textContent =
      `Você acertou ${acertosDePrimeira} de ${corrigiveis} de primeira. ` +
      `Seu total: ${Quiz.textoPontos(Pontos.total())}.`;
    App.mostrarTela('resultado');
  }

  return { preparar, jogar };
})();

// Tela inicial: topo com nível e pontos, trilha das missões guardadas e próxima prova.
// O botão de apagar os dados da família agora fica na Área dos pais (mesmo id).
const Inicio = (() => {
  const $ = (id) => document.getElementById(id);
  const el = {
    caixa: $('missoes'),
    lista: $('lista-missoes'),
    apagar: $('botao-apagar'),
    mensagem: $('mensagem-inicio'),
    nivel: $('inicio-nivel'),
    nivelBarra: $('inicio-nivel-barra'),
    nivelPreenchido: $('inicio-nivel-preenchido'),
    nivelConta: $('inicio-nivel-conta'),
    pontos: $('inicio-pontos'),
    prova: $('inicio-prova'),
    provaTexto: $('inicio-prova-texto'),
  };

  const SVG = 'http://www.w3.org/2000/svg';

  // Ícone da parada: estrela (nova) ou ✓ (feita).
  function iconeParada(estado) {
    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const caminho = document.createElementNS(SVG, 'path');
    caminho.setAttribute('d', estado === 'feita'
      ? 'M5 12.5l4.5 4.5L19 7.5'
      : 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z');
    caminho.setAttribute('fill', 'none');
    caminho.setAttribute('stroke', 'currentColor');
    caminho.setAttribute('stroke-width', estado === 'feita' ? '3' : '2.2');
    caminho.setAttribute('stroke-linecap', 'round');
    caminho.setAttribute('stroke-linejoin', 'round');
    svg.append(caminho);
    return svg;
  }

  function texto(tag, classe, conteudo) {
    const elemento = document.createElement(tag);
    elemento.className = classe;
    elemento.textContent = conteudo;
    return elemento;
  }

  function atualizarTopo() {
    const { total, nivel, noNivel } = Pontos.nivel();
    el.nivel.textContent = nivel;
    el.nivelPreenchido.style.width = `${(noNivel / Pontos.PONTOS_POR_NIVEL) * 100}%`;
    el.nivelBarra.setAttribute('aria-valuemax', Pontos.PONTOS_POR_NIVEL);
    el.nivelBarra.setAttribute('aria-valuenow', noNivel);
    el.nivelConta.textContent = `${noNivel}/${Pontos.PONTOS_POR_NIVEL}`;
    el.pontos.textContent = total;
  }

  function atualizarProva() {
    const prova = DatasDeProva.proxima(Familia.provas());
    el.prova.hidden = !prova;
    el.provaTexto.textContent = prova ? DatasDeProva.textoProxima(prova) : '';
  }

  // Cada missão vira uma parada. O círculo é o botão que começa a missão.
  function parada(missao) {
    const info = Trilha.parada(missao);
    const item = document.createElement('li');
    item.className = `missao missao--${info.estado}`;

    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'missao__parada';
    botao.setAttribute('aria-label', `${info.acao}: ${info.nome}`);
    botao.append(iconeParada(info.estado));
    botao.addEventListener('click', () => {
      FotoQuest.jogar(missao.perguntas, { aviso: missao.aviso, id: missao.id });
    });

    const textos = document.createElement('div');
    textos.className = 'missao__textos';
    textos.append(texto('p', 'missao__nome', info.nome), texto('p', 'missao__detalhe', info.detalhe));

    item.append(botao, textos);
    return item;
  }

  // Sem missões: uma parada apagada que convida a tirar a primeira foto.
  function paradaVazia() {
    const item = document.createElement('li');
    item.className = 'missao missao--vazia';
    const circulo = document.createElement('span');
    circulo.className = 'missao__parada';
    circulo.setAttribute('aria-hidden', 'true');
    circulo.append(iconeParada('nova'));
    const textos = document.createElement('div');
    textos.className = 'missao__textos';
    textos.append(texto('p', 'missao__nome', 'Sua primeira missão começa com uma foto'));
    item.append(circulo, textos);
    return item;
  }

  function atualizar() {
    Narracao.atualizarBotaoInicio();
    atualizarTopo();
    atualizarProva();
    const missoes = Familia.missoes();
    el.caixa.hidden = false;
    el.lista.replaceChildren(...(missoes.length ? missoes.map(parada) : [paradaVazia()]));
  }

  el.apagar.addEventListener('click', async () => {
    const ok = window.confirm(
      'Apagar todas as perguntas, o progresso, as provas, as gravações de voz e a voz digital da família (também na ElevenLabs), e desconectar o Google Agenda? Isso não pode ser desfeito.',
    );
    if (!ok) return;
    const familia = Familia.id(); // guarda antes de apagar, para achar os áudios
    Voz.parar();
    // Primeiro a voz digital na ElevenLabs: se falhar, não apaga nada (para não perder o ID dela).
    el.mensagem.textContent = 'Apagando...';
    const vozDigital = await Narracao.apagarVozDigital();
    if (!vozDigital.ok) {
      el.mensagem.textContent = vozDigital.mensagem;
      return;
    }
    await Calendario.desconectarGoogle({ silencioso: true }); // cancela o acesso ao Google Agenda, se houver
    Familia.apagarTudo();
    let audiosApagados = true;
    try {
      await Voz.apagarDaFamilia(familia); // áudios no IndexedDB
    } catch (erro) {
      audiosApagados = false;
    }
    atualizar();
    el.mensagem.textContent = audiosApagados
      ? 'Pronto. Os dados, as provas, as gravações e a voz digital da família foram apagados, e o Google Agenda foi desconectado.'
      : 'Os dados foram apagados, mas não consegui apagar as gravações. Tente de novo.';
  });

  atualizar();
  return { atualizar };
})();

// Abertura na primeira visita da aba. Vem antes da volta do Google,
// que apaga o ?google= do endereço (com ?google=, a abertura não aparece).
Abertura.iniciar();

// Volta do login do Google Agenda (?google=...).
Calendario.aoVoltarDoGoogle();

// A tela inicial já vem visível no HTML: acerta a barra de baixo na primeira carga.
App.atualizarNav();
