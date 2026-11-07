// Controle das telas e navegação

const App = (() => {
  const telas = document.querySelectorAll('.tela');

  function mostrarTela(nome) {
    telas.forEach((tela) => {
      tela.hidden = tela.id !== `tela-${nome}`;
    });
    window.scrollTo(0, 0);
    if (nome === 'fotoquest') FotoQuest.preparar();
  }

  // Botões com data-ir="nome-da-tela" levam para aquela tela.
  document.addEventListener('click', (evento) => {
    const alvo = evento.target.closest('[data-ir]');
    if (alvo) mostrarTela(alvo.dataset.ir);
  });

  return { mostrarTela };
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
  };

  // Limite seguro para o corpo do pedido na Vercel (cerca de 4,5 MB).
  const LIMITE_ENVIO_BYTES = 4 * 1024 * 1024;

  const el = {
    form: document.getElementById('form-fotos'),
    outraCaixa: document.getElementById('campo-outra'),
    outraTexto: document.getElementById('disciplina-outra'),
    entrada: document.getElementById('entrada-foto'),
    rotulo: document.getElementById('rotulo-foto'),
    contador: document.getElementById('contador-fotos'),
    miniaturas: document.getElementById('miniaturas'),
    declaracao: document.getElementById('declaracao'),
    enviar: document.getElementById('botao-enviar'),
    mensagem: document.getElementById('mensagem-foto'),
    resultadoPontos: document.getElementById('resultado-pontos'),
    resultadoDetalhe: document.getElementById('resultado-detalhe'),
  };

  // Fotos já reduzidas, só na memória desta tela: { blob, url }.
  let fotos = [];
  let preparando = false;
  let enviando = false;

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
  }

  // Começa sempre do zero: nenhuma foto fica guardada.
  function preparar() {
    liberarFotos();
    el.form.reset();
    el.outraCaixa.hidden = true;
    el.entrada.value = '';
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
    el.rotulo.textContent = fotos.length ? 'Adicionar mais fotos' : 'Tirar ou escolher fotos';
    el.rotulo.classList.toggle('botao-foto--cheio', fotos.length >= Fotos.MAX_FOTOS);
  }

  el.form.addEventListener('change', (evento) => {
    if (evento.target.name === 'disciplina') {
      const ehOutra = evento.target.value === 'outra';
      el.outraCaixa.hidden = !ehOutra;
      if (ehOutra) el.outraTexto.focus();
    }
    if (evento.target === el.declaracao) atualizarBotao();
  });

  el.entrada.addEventListener('change', async () => {
    const escolhidas = Array.from(el.entrada.files || []);
    el.entrada.value = '';
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
        fotos.push({ blob, url: URL.createObjectURL(blob) });
        desenharMiniaturas();
      } catch (erro) {
        avisos.push(Fotos.ehHeic(arquivo) ? MENSAGENS.heicSemSuporte : MENSAGENS.naoAbriu);
      }
    }

    preparando = false;
    atualizarBotao();
    avisar([...new Set(avisos)].join(' '));
  });

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
    Quiz.iniciar(resultado.perguntas, { demo: resultado.demo, aoTerminar: mostrarResultado });
    App.mostrarTela('quiz');
  });

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
  async function buscarPerguntas(disciplina) {
    let corpo;
    try {
      corpo = await montarPedido(disciplina);
    } catch (erro) {
      return { erro: true, mensagem: MENSAGENS.naoAbriu };
    }
    if (corpo.length > LIMITE_ENVIO_BYTES) {
      return { erro: true, mensagem: MENSAGENS.muitoGrande };
    }

    try {
      const resposta = await fetch('/api/questoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: corpo,
      });
      const dados = await resposta.json().catch(() => null);

      if (dados && dados.erro === 'nao_foi_possivel_ler') {
        return { erro: true, mensagem: MENSAGENS.naoLeu };
      }
      if (resposta.ok && dados && Quiz.suportadas(dados.questoes).length > 0) {
        return { perguntas: dados.questoes, demo: false };
      }
    } catch (erro) {
      // Sem conexão com a função: segue para o modo demonstração.
    }
    return { perguntas: Quiz.QUESTOES_DEMO, demo: true };
  }

  function mostrarResultado({ pontos, acertosDePrimeira, total }) {
    el.resultadoPontos.textContent = pontos;
    el.resultadoDetalhe.textContent =
      `Você acertou ${acertosDePrimeira} de ${total} de primeira. ` +
      `Seu total: ${Quiz.textoPontos(Pontos.total())}.`;
    App.mostrarTela('resultado');
  }

  return { preparar };
})();
