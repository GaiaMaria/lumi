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

// FotoQuest: escolher a foto e transformar em missão.
const FotoQuest = (() => {
  const MENSAGEM_NAO_LEU = 'Não consegui ler essa foto. Tente de novo com mais luz.';

  const el = {
    entrada: document.getElementById('entrada-foto'),
    rotulo: document.getElementById('rotulo-foto'),
    previa: document.getElementById('previa'),
    previaImagem: document.getElementById('previa-imagem'),
    criar: document.getElementById('botao-criar-missao'),
    mensagem: document.getElementById('mensagem-foto'),
    resultadoPontos: document.getElementById('resultado-pontos'),
    resultadoDetalhe: document.getElementById('resultado-detalhe'),
  };

  let foto = null;
  let urlPrevia = null;

  // Começa sempre do zero: a foto não fica guardada em lugar nenhum.
  function preparar() {
    if (urlPrevia) URL.revokeObjectURL(urlPrevia);
    foto = null;
    urlPrevia = null;
    el.entrada.value = '';
    el.previaImagem.removeAttribute('src');
    el.previa.hidden = true;
    el.rotulo.textContent = 'Tirar ou escolher foto';
    el.criar.disabled = true;
    el.criar.textContent = 'Criar missão';
    el.mensagem.textContent = '';
  }

  el.entrada.addEventListener('change', () => {
    const arquivo = el.entrada.files[0];
    el.mensagem.textContent = '';
    if (!arquivo) return;

    if (!arquivo.type.startsWith('image/')) {
      el.mensagem.textContent = 'Escolha uma imagem, como a foto do caderno.';
      return;
    }

    if (urlPrevia) URL.revokeObjectURL(urlPrevia);
    urlPrevia = URL.createObjectURL(arquivo);
    foto = arquivo;

    el.previaImagem.src = urlPrevia;
    el.previa.hidden = false;
    el.rotulo.textContent = 'Trocar foto';
    el.criar.disabled = false;
  });

  el.criar.addEventListener('click', async () => {
    if (!foto) return;
    el.criar.disabled = true;
    el.criar.textContent = 'Criando missão...';
    el.mensagem.textContent = 'A Dóris está lendo sua foto...';

    const resultado = await buscarQuestoes(foto);

    el.criar.disabled = false;
    el.criar.textContent = 'Criar missão';

    if (resultado.erro === 'nao_foi_possivel_ler') {
      el.mensagem.textContent = MENSAGEM_NAO_LEU;
      return;
    }

    el.mensagem.textContent = '';
    Quiz.iniciar(resultado.questoes, { demo: resultado.demo, aoTerminar: mostrarResultado });
    App.mostrarTela('quiz');
  });

  // Pede as perguntas para api/questoes.js. Se a função não estiver
  // disponível (sem chave configurada, rodando local ou fora do ar),
  // usa as perguntas de exemplo em modo demonstração.
  async function buscarQuestoes(arquivo) {
    try {
      const imagem = await lerComoBase64(arquivo);
      const resposta = await fetch('/api/questoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagem, tipoMidia: arquivo.type }),
      });
      const dados = await resposta.json().catch(() => null);

      if (dados && dados.erro === 'nao_foi_possivel_ler') {
        return { erro: 'nao_foi_possivel_ler' };
      }
      if (resposta.ok && dados && Quiz.suportadas(dados.questoes).length > 0) {
        return { questoes: dados.questoes, demo: false };
      }
    } catch (erro) {
      // Sem conexão com a função: segue para o modo demonstração.
    }
    return { questoes: Quiz.QUESTOES_DEMO, demo: true };
  }

  function lerComoBase64(arquivo) {
    return new Promise((resolver, rejeitar) => {
      const leitor = new FileReader();
      leitor.onload = () => resolver(String(leitor.result).split(',')[1]);
      leitor.onerror = () => rejeitar(leitor.error);
      leitor.readAsDataURL(arquivo);
    });
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
