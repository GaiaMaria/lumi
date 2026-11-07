// Perguntas, respostas e feedback do quiz.
// Tipos ligados agora: múltipla escolha e verdadeiro ou falso.

const Quiz = (() => {
  // Perguntas de exemplo (formato do CONTEXTO, seção 8), usadas no modo demonstração.
  const QUESTOES_DEMO = [
    {
      tipo: 'verdadeiro_falso',
      enunciado: 'A chuva cai das nuvens.',
      resposta: true,
      explicacao: 'As nuvens guardam gotinhas de água. Quando ficam pesadas, elas caem como chuva.',
    },
    {
      tipo: 'multipla_escolha',
      enunciado: 'Como se chama quando a água vira vapor com o calor?',
      alternativas: ['Condensação', 'Evaporação', 'Congelamento', 'Derretimento'],
      resposta: 'B',
      explicacao: 'Com o calor do Sol, a água evapora e sobe para o céu.',
    },
    {
      tipo: 'verdadeiro_falso',
      enunciado: 'O gelo é água no estado gasoso.',
      resposta: false,
      explicacao: 'O gelo é água no estado sólido. O vapor é que é gasoso.',
    },
    {
      tipo: 'multipla_escolha',
      enunciado: 'Do que as nuvens são feitas?',
      alternativas: ['Fumaça', 'Gotinhas de água', 'Algodão', 'Poeira'],
      resposta: 'B',
      explicacao: 'As nuvens são milhões de gotinhas de água bem pequenas.',
    },
    {
      tipo: 'multipla_escolha',
      enunciado: 'O que esquenta a água dos rios e mares e faz ela evaporar?',
      alternativas: ['A Lua', 'O vento', 'O Sol', 'As estrelas'],
      resposta: 'C',
      explicacao: 'O Sol esquenta a água, e ela começa a subir como vapor.',
    },
  ];

  const PONTOS_PRIMEIRA_TENTATIVA = 10;
  const PONTOS_OUTRA_TENTATIVA = 5;
  const LETRAS = 'ABCDEFGHIJ';

  const el = {
    avisoDemo: document.getElementById('aviso-demo'),
    progresso: document.getElementById('quiz-progresso'),
    enunciado: document.getElementById('quiz-enunciado'),
    opcoes: document.getElementById('quiz-opcoes'),
    feedback: document.getElementById('quiz-feedback'),
    proxima: document.getElementById('quiz-proxima'),
    pontos: document.getElementById('quiz-pontos'),
  };

  let estado = null;

  // Índice da opção certa, ou -1 se a questão não fizer sentido.
  function indiceCorreto(questao) {
    if (questao.tipo === 'verdadeiro_falso') {
      return questao.resposta ? 0 : 1;
    }
    const resposta = String(questao.resposta).trim();
    const letra = resposta.toUpperCase();
    if (letra.length === 1 && LETRAS.includes(letra)) {
      const indice = LETRAS.indexOf(letra);
      if (indice < questao.alternativas.length) return indice;
    }
    return questao.alternativas.findIndex((alt) => String(alt).trim() === resposta);
  }

  function questaoValida(questao) {
    if (!questao || typeof questao.enunciado !== 'string' || !questao.enunciado.trim()) return false;
    if (questao.tipo === 'verdadeiro_falso') return typeof questao.resposta === 'boolean';
    if (questao.tipo === 'multipla_escolha') {
      return Array.isArray(questao.alternativas)
        && questao.alternativas.length >= 2
        && questao.alternativas.length <= LETRAS.length
        && indiceCorreto(questao) !== -1;
    }
    return false; // Outros tipos entram depois.
  }

  // Devolve só as questões que o quiz sabe mostrar agora.
  function suportadas(questoes) {
    return Array.isArray(questoes) ? questoes.filter(questaoValida) : [];
  }

  function textoPontos(valor) {
    return valor === 1 ? '1 ponto' : `${valor} pontos`;
  }

  function iniciar(questoes, { demo = false, aoTerminar } = {}) {
    estado = {
      questoes: suportadas(questoes),
      indice: 0,
      pontos: 0,
      acertosDePrimeira: 0,
      demo,
      aoTerminar,
    };
    el.avisoDemo.hidden = !demo;
    el.pontos.textContent = textoPontos(0);
    mostrarQuestao();
  }

  function mostrarQuestao() {
    const questao = estado.questoes[estado.indice];
    const opcoes = questao.tipo === 'verdadeiro_falso'
      ? ['Verdadeiro', 'Falso']
      : questao.alternativas.map(String);

    estado.tentativas = 0;
    estado.respondida = false;

    el.progresso.textContent = `Pergunta ${estado.indice + 1} de ${estado.questoes.length}`;
    el.enunciado.textContent = questao.enunciado;
    el.feedback.hidden = true;
    el.feedback.className = 'feedback';
    el.proxima.hidden = true;

    el.opcoes.replaceChildren(...opcoes.map((texto, indice) => {
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'opcao';

      if (questao.tipo === 'multipla_escolha') {
        const letra = document.createElement('span');
        letra.className = 'opcao__letra';
        letra.textContent = LETRAS[indice];
        letra.setAttribute('aria-hidden', 'true');
        botao.append(letra);
      }

      const rotulo = document.createElement('span');
      rotulo.textContent = texto;
      botao.append(rotulo);

      botao.addEventListener('click', () => responder(indice, botao));
      return botao;
    }));
  }

  function mostrarFeedback(tipo, titulo, texto) {
    const forte = document.createElement('strong');
    forte.textContent = titulo;
    const partes = [forte];
    if (texto) {
      const detalhe = document.createElement('span');
      detalhe.textContent = texto;
      partes.push(detalhe);
    }
    el.feedback.replaceChildren(...partes);
    el.feedback.className = `feedback feedback--${tipo}`;
    el.feedback.hidden = false;
  }

  function responder(indice, botao) {
    if (estado.respondida) return;
    const questao = estado.questoes[estado.indice];

    if (indice === indiceCorreto(questao)) {
      const ganhos = estado.tentativas === 0 ? PONTOS_PRIMEIRA_TENTATIVA : PONTOS_OUTRA_TENTATIVA;
      if (estado.tentativas === 0) estado.acertosDePrimeira += 1;
      estado.pontos += ganhos;
      estado.respondida = true;
      Pontos.adicionar(ganhos);

      botao.classList.add('opcao--certa');
      el.opcoes.querySelectorAll('.opcao').forEach((b) => { b.disabled = true; });
      el.pontos.textContent = textoPontos(estado.pontos);
      mostrarFeedback('sucesso', `Isso! +${ganhos} pontos`, questao.explicacao);

      const ultima = estado.indice === estado.questoes.length - 1;
      el.proxima.textContent = ultima ? 'Ver resultado' : 'Próxima pergunta';
      el.proxima.hidden = false;
      el.proxima.focus();
    } else {
      estado.tentativas += 1;
      botao.classList.add('opcao--errada');
      botao.disabled = true;
      mostrarFeedback('erro', 'Quase! Tente de novo.');
    }
  }

  el.proxima.addEventListener('click', () => {
    estado.indice += 1;
    if (estado.indice < estado.questoes.length) {
      mostrarQuestao();
      el.enunciado.focus();
      return;
    }
    if (typeof estado.aoTerminar === 'function') {
      estado.aoTerminar({
        pontos: estado.pontos,
        acertosDePrimeira: estado.acertosDePrimeira,
        total: estado.questoes.length,
      });
    }
  });

  el.enunciado.tabIndex = -1;

  return {
    QUESTOES_DEMO,
    iniciar,
    suportadas,
    textoPontos,
  };
})();
