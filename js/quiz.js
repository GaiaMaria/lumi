// Perguntas, respostas e feedback do quiz.
// Tipos: verdadeiro_falso, multipla_escolha, relacionar e dissertativa.
// A correção é feita aqui no navegador, com o gabarito que vem do JSON.

// Contas conferidas no código, nunca pela IA.
const Contas = (() => {
  // Aceita "7 × 8", "7x8", "7 * 8", "12 + 5", "20 - 4", "20 ÷ 4", "20 : 4", "20 / 4".
  // Menos, dois-pontos e barra só valem com espaços dos dois lados, para não
  // confundir com datas ("1500-1822") ou horas ("10:30").
  const EXPRESSAO = /(\d+(?:,\d+)?)\s*([×xX*÷+])\s*(\d+(?:,\d+)?)|(\d+(?:,\d+)?)\s+([-−:/])\s+(\d+(?:,\d+)?)/;
  const NUMERO = /^\s*-?\d+(?:,\d+)?\s*$/;

  function numero(texto) {
    return Number(String(texto).trim().replace(',', '.'));
  }

  function calcular(a, operador, b) {
    switch (operador) {
      case '+': return a + b;
      case '-': case '−': return a - b;
      case '×': case 'x': case 'X': case '*': return a * b;
      case '÷': case ':': case '/': return b === 0 ? NaN : a / b;
      default: return NaN;
    }
  }

  // Procura a primeira conta no texto e devolve o resultado, ou null.
  function resolver(texto) {
    const m = EXPRESSAO.exec(String(texto));
    if (!m) return null;
    const [a, op, b] = m[1] ? [m[1], m[2], m[3]] : [m[4], m[5], m[6]];
    const valor = calcular(numero(a), op, numero(b));
    if (!Number.isFinite(valor)) return null;
    return { valor, fim: m.index + m[0].length };
  }

  function iguais(x, y) {
    return Math.abs(x - y) < 1e-9;
  }

  // Devolve a pergunta conferida (talvez com o gabarito corrigido) ou null para descartar.
  function conferir(p) {
    if (p.tipo === 'verdadeiro_falso') {
      // Afirmações como "7 × 8 = 54".
      const conta = resolver(p.enunciado);
      if (!conta) return p;
      const depois = /^\s*=\s*(-?\d+(?:,\d+)?)/.exec(p.enunciado.slice(conta.fim));
      if (!depois) return p;
      return { ...p, gabarito: iguais(conta.valor, numero(depois[1])) };
    }

    if (p.tipo === 'multipla_escolha') {
      // Só quando todas as alternativas são números: é uma pergunta de conta.
      const conta = resolver(p.enunciado);
      if (!conta || !p.alternativas.every((alt) => NUMERO.test(alt))) return p;
      const indice = p.alternativas.findIndex((alt) => iguais(numero(alt), conta.valor));
      if (indice === -1) return null; // nenhuma alternativa certa: descarta
      return { ...p, gabarito: 'abcde'[indice] };
    }

    if (p.tipo === 'relacionar') {
      // Pares como "3 × 4" ↔ "12": se algum estiver errado, descarta.
      const errado = p.pares.some((par) => {
        const conta = resolver(par.item);
        return conta && NUMERO.test(par.par) && !iguais(conta.valor, numero(par.par));
      });
      return errado ? null : p;
    }

    return p;
  }

  return { conferir, resolver };
})();

const Quiz = (() => {
  // Perguntas de exemplo criadas por nós (sem trechos de livros), usadas no modo demonstração.
  const PERGUNTAS_DEMO = [
    {
      tipo: 'verdadeiro_falso',
      enunciado: 'A chuva cai das nuvens.',
      gabarito: true,
      explicacao: 'As nuvens guardam gotinhas de água. Quando ficam pesadas, elas caem como chuva.',
    },
    {
      tipo: 'multipla_escolha',
      enunciado: 'Como se chama quando a água vira vapor com o calor?',
      alternativas: ['Condensação', 'Evaporação', 'Congelamento', 'Derretimento', 'Chuva'],
      gabarito: 'b',
      explicacao: 'Com o calor do Sol, a água evapora e sobe para o céu.',
    },
    {
      tipo: 'relacionar',
      enunciado: 'Ligue cada estado da água ao seu exemplo.',
      pares: [
        { item: 'Sólido', par: 'Gelo' },
        { item: 'Líquido', par: 'Água do rio' },
        { item: 'Gasoso', par: 'Vapor da chaleira' },
      ],
      explicacao: 'A mesma água muda de estado quando esquenta ou esfria.',
    },
    {
      tipo: 'verdadeiro_falso',
      enunciado: 'O gelo é água no estado gasoso.',
      gabarito: false,
      explicacao: 'O gelo é água no estado sólido. O vapor é que é gasoso.',
    },
    {
      tipo: 'dissertativa',
      enunciado: 'Por que as roupas no varal secam mais rápido em dia de sol?',
      gabarito: 'Porque o calor do Sol faz a água das roupas evaporar mais depressa.',
      explicacao: 'Quanto mais calor, mais rápido a água vira vapor.',
    },
    {
      tipo: 'multipla_escolha',
      enunciado: 'Do que as nuvens são feitas?',
      alternativas: ['Fumaça', 'Gotinhas de água', 'Algodão', 'Poeira', 'Areia'],
      gabarito: 'b',
      explicacao: 'As nuvens são milhões de gotinhas de água bem pequenas.',
    },
  ];

  const PONTOS_PRIMEIRA_TENTATIVA = 10;
  const PONTOS_OUTRA_TENTATIVA = 5;
  const LETRAS = 'abcde';

  const el = {
    avisoDemo: document.getElementById('aviso-demo'),
    aviso: document.getElementById('quiz-aviso'),
    progresso: document.getElementById('quiz-progresso'),
    enunciado: document.getElementById('quiz-enunciado'),
    area: document.getElementById('quiz-opcoes'),
    feedback: document.getElementById('quiz-feedback'),
    proxima: document.getElementById('quiz-proxima'),
    pontos: document.getElementById('quiz-pontos'),
    barra: document.getElementById('quiz-progresso-barra'),
    barraPreenchida: document.getElementById('quiz-progresso-preenchido'),
  };

  let estado = null;

  // ---------- validação ----------

  function texto(valor) {
    return typeof valor === 'string' ? valor.trim() : '';
  }

  function valida(p) {
    if (!p || typeof p !== 'object' || !texto(p.enunciado)) return false;
    switch (p.tipo) {
      case 'verdadeiro_falso':
        return typeof p.gabarito === 'boolean';
      case 'multipla_escolha':
        return Array.isArray(p.alternativas)
          && p.alternativas.length === 5
          && p.alternativas.every((a) => texto(a))
          && LETRAS.includes(String(p.gabarito).toLowerCase());
      case 'relacionar':
        return Array.isArray(p.pares)
          && p.pares.length >= 3 && p.pares.length <= 5
          && p.pares.every((par) => par && texto(par.item) && texto(par.par))
          && new Set(p.pares.map((par) => texto(par.par))).size === p.pares.length;
      case 'dissertativa':
        return Boolean(texto(p.gabarito));
      default:
        return false;
    }
  }

  // Só as perguntas que o quiz sabe mostrar, com as contas conferidas no código.
  function suportadas(perguntas) {
    if (!Array.isArray(perguntas)) return [];
    return perguntas
      .filter(valida)
      .map((p) => (p.tipo === 'multipla_escolha' ? { ...p, gabarito: String(p.gabarito).toLowerCase() } : p))
      .map(Contas.conferir)
      .filter(Boolean);
  }

  // ---------- utilidades ----------

  function textoPontos(valor) {
    return valor === 1 ? '1 ponto' : `${valor} pontos`;
  }

  function embaralhar(lista) {
    const copia = [...lista];
    for (let i = copia.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
  }

  function criar(tag, classe, conteudo) {
    const elemento = document.createElement(tag);
    if (classe) elemento.className = classe;
    if (conteudo !== undefined) elemento.textContent = conteudo;
    return elemento;
  }

  function atualizarBarra(respondidas) {
    const total = estado.perguntas.length;
    el.barraPreenchida.style.width = `${(respondidas / total) * 100}%`;
    el.barra.setAttribute('aria-valuemax', String(total));
    el.barra.setAttribute('aria-valuenow', String(respondidas));
  }

  function mostrarFeedback(tipo, titulo, detalhe) {
    const partes = [criar('strong', '', titulo)];
    if (detalhe) partes.push(criar('span', '', detalhe));
    el.feedback.replaceChildren(...partes);
    el.feedback.className = `feedback feedback--${tipo}`;
    el.feedback.hidden = false;
  }

  function mostrarProxima() {
    const ultima = estado.indice === estado.perguntas.length - 1;
    el.proxima.textContent = ultima ? 'Ver resultado' : 'Próxima pergunta';
    el.proxima.hidden = false;
    el.proxima.focus();
  }

  // Acerto: soma pontos, mostra a explicação e libera a próxima.
  function acertou(pergunta) {
    const ganhos = estado.tentativas === 0 ? PONTOS_PRIMEIRA_TENTATIVA : PONTOS_OUTRA_TENTATIVA;
    if (estado.tentativas === 0) estado.acertosDePrimeira += 1;
    estado.pontos += ganhos;
    estado.respondida = true;
    Pontos.adicionar(ganhos);

    el.pontos.textContent = textoPontos(estado.pontos);
    atualizarBarra(estado.indice + 1);
    mostrarFeedback('sucesso', `Isso! +${ganhos} pontos`, pergunta.explicacao);
    mostrarProxima();
  }

  function errou() {
    estado.tentativas += 1;
    mostrarFeedback('erro', 'Quase! Tente de novo.');
  }

  // ---------- tipos ----------

  function botaoOpcao(rotulo, letra) {
    const botao = criar('button', 'opcao');
    botao.type = 'button';
    if (letra) {
      const marca = criar('span', 'opcao__letra', letra.toUpperCase());
      marca.setAttribute('aria-hidden', 'true');
      botao.append(marca);
    }
    botao.append(criar('span', '', rotulo));
    return botao;
  }

  function escolha(pergunta, opcoes, indiceCerto) {
    const botoes = opcoes.map(({ rotulo, letra }, indice) => {
      const botao = botaoOpcao(rotulo, letra);
      botao.addEventListener('click', () => {
        if (estado.respondida) return;
        if (indice === indiceCerto) {
          botao.classList.add('opcao--certa');
          botoes.forEach((b) => { b.disabled = true; });
          acertou(pergunta);
        } else {
          botao.classList.add('opcao--errada');
          botao.disabled = true;
          errou();
        }
      });
      return botao;
    });
    el.area.className = 'quiz-opcoes';
    el.area.replaceChildren(...botoes);
  }

  function mostrarVerdadeiroFalso(p) {
    escolha(p, [{ rotulo: 'Verdadeiro' }, { rotulo: 'Falso' }], p.gabarito ? 0 : 1);
  }

  function mostrarMultiplaEscolha(p) {
    const opcoes = p.alternativas.map((rotulo, i) => ({ rotulo, letra: LETRAS[i] }));
    escolha(p, opcoes, LETRAS.indexOf(p.gabarito));
  }

  function mostrarRelacionar(p) {
    // Embaralha a coluna da direita (sem deixar na ordem certa).
    let ordem = embaralhar(p.pares.map((_, i) => i));
    while (ordem.every((v, i) => v === i)) ordem = embaralhar(ordem);

    const linhas = p.pares.map((par, i) => {
      const linha = criar('div', 'relacionar__linha');
      const idCampo = `relacionar-${estado.indice}-${i}`;
      const rotulo = criar('label', 'relacionar__item', par.item);
      rotulo.htmlFor = idCampo;

      const campo = criar('select', 'relacionar__campo');
      campo.id = idCampo;
      campo.append(new Option('Escolha...', ''));
      ordem.forEach((indicePar) => campo.append(new Option(p.pares[indicePar].par, String(indicePar))));
      campo.addEventListener('change', () => linha.classList.remove('relacionar__linha--errada'));

      linha.append(rotulo, campo);
      return { linha, campo, certo: i };
    });

    const conferir = criar('button', 'botao-principal', 'Conferir');
    conferir.type = 'button';
    conferir.addEventListener('click', () => {
      if (estado.respondida) return;
      if (linhas.some(({ campo }) => campo.value === '')) {
        mostrarFeedback('neutro', 'Escolha um par para cada item.');
        return;
      }
      let todasCertas = true;
      linhas.forEach(({ linha, campo, certo }) => {
        const ok = Number(campo.value) === certo;
        linha.classList.toggle('relacionar__linha--certa', ok);
        linha.classList.toggle('relacionar__linha--errada', !ok);
        if (ok) campo.disabled = true;
        else todasCertas = false;
      });
      if (todasCertas) {
        conferir.hidden = true;
        acertou(p);
      } else {
        errou();
      }
    });

    el.area.className = 'relacionar';
    el.area.replaceChildren(...linhas.map(({ linha }) => linha), conferir);
  }

  function mostrarDissertativa(p) {
    const idCampo = `dissertativa-${estado.indice}`;
    const rotulo = criar('label', 'dissertativa__rotulo', 'Sua resposta (fica só nesta tela):');
    rotulo.htmlFor = idCampo;
    const campo = criar('textarea', 'dissertativa__campo');
    campo.id = idCampo;
    campo.rows = 4;
    campo.maxLength = 600;

    const ver = criar('button', 'botao-principal', 'Ver resposta modelo');
    ver.type = 'button';
    ver.addEventListener('click', () => {
      if (estado.respondida) return;
      estado.respondida = true;
      ver.hidden = true;

      const modelo = criar('div', 'resposta-modelo vidro');
      modelo.append(
        criar('strong', '', 'Resposta modelo'),
        criar('p', '', p.gabarito),
        criar('p', 'resposta-modelo__dica', 'Compare com a sua resposta. Aqui não tem nota.'),
      );
      el.area.append(modelo);
      if (p.explicacao) mostrarFeedback('neutro', 'Para lembrar', p.explicacao);
      atualizarBarra(estado.indice + 1);
      mostrarProxima();
    });

    el.area.className = 'dissertativa';
    el.area.replaceChildren(rotulo, campo, ver);
  }

  // ---------- fluxo ----------

  function iniciar(perguntas, { demo = false, aviso = '', aoTerminar } = {}) {
    estado = {
      perguntas: suportadas(perguntas),
      indice: 0,
      pontos: 0,
      acertosDePrimeira: 0,
      aoTerminar,
    };
    el.avisoDemo.hidden = !demo;
    el.aviso.textContent = aviso || '';
    el.aviso.hidden = !aviso;
    el.pontos.textContent = textoPontos(0);
    mostrarPergunta();
  }

  function mostrarPergunta() {
    const p = estado.perguntas[estado.indice];
    estado.tentativas = 0;
    estado.respondida = false;

    el.progresso.textContent = `Pergunta ${estado.indice + 1} de ${estado.perguntas.length}`;
    el.enunciado.textContent = p.enunciado;
    el.feedback.hidden = true;
    el.feedback.className = 'feedback';
    el.proxima.hidden = true;
    atualizarBarra(estado.indice);

    if (p.tipo === 'verdadeiro_falso') mostrarVerdadeiroFalso(p);
    else if (p.tipo === 'multipla_escolha') mostrarMultiplaEscolha(p);
    else if (p.tipo === 'relacionar') mostrarRelacionar(p);
    else mostrarDissertativa(p);
  }

  el.proxima.addEventListener('click', () => {
    estado.indice += 1;
    if (estado.indice < estado.perguntas.length) {
      mostrarPergunta();
      el.enunciado.focus();
      return;
    }
    if (typeof estado.aoTerminar === 'function') {
      estado.aoTerminar({
        pontos: estado.pontos,
        acertosDePrimeira: estado.acertosDePrimeira,
        corrigiveis: estado.perguntas.filter((p) => p.tipo !== 'dissertativa').length,
        total: estado.perguntas.length,
      });
    }
  });

  el.enunciado.tabIndex = -1;

  return {
    PERGUNTAS_DEMO,
    iniciar,
    suportadas,
    textoPontos,
  };
})();
