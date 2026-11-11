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

    if (p.tipo === 'completar_lacunas') {
      // Frases como "7 × 8 = ___": a resposta vem do código.
      const conta = resolver(p.enunciado);
      if (!conta) return p;
      if (!/^\s*=\s*_{3,}/.test(p.enunciado.slice(conta.fim))) return p;
      const resposta = String(Math.round(conta.valor * 1000) / 1000).replace('.', ',');
      return { ...p, gabarito: resposta, respostas_aceitas: [] };
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
  // Metade múltipla escolha e metade dos outros tipos, intercaladas.
  const PERGUNTAS_DEMO = [
    {
      tipo: 'multipla_escolha',
      enunciado: 'Como se chama quando a água vira vapor com o calor?',
      alternativas: ['Condensação', 'Evaporação', 'Congelamento', 'Derretimento', 'Chuva'],
      gabarito: 'b',
      explicacao: 'Com o calor do Sol, a água evapora e sobe para o céu.',
    },
    {
      tipo: 'verdadeiro_falso',
      enunciado: 'A chuva cai das nuvens.',
      gabarito: true,
      explicacao: 'As nuvens guardam gotinhas de água. Quando ficam pesadas, elas caem como chuva.',
    },
    {
      tipo: 'multipla_escolha',
      enunciado: 'Do que as nuvens são feitas?',
      alternativas: ['Fumaça', 'Gotinhas de água', 'Algodão', 'Poeira', 'Areia'],
      gabarito: 'b',
      explicacao: 'As nuvens são milhões de gotinhas de água bem pequenas.',
    },
    {
      tipo: 'completar_lacunas',
      enunciado: 'Quando o vapor esfria no céu e vira gotinhas, acontece a ___.',
      gabarito: 'condensação',
      respostas_aceitas: [],
      explicacao: 'Condensação é quando o vapor volta a ser água líquida.',
    },
    {
      tipo: 'multipla_escolha',
      enunciado: 'O que esquenta a água dos rios e mares e faz ela evaporar?',
      alternativas: ['A Lua', 'O vento', 'O Sol', 'As estrelas', 'As nuvens'],
      gabarito: 'c',
      explicacao: 'O Sol esquenta a água, e ela começa a subir como vapor.',
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
      tipo: 'multipla_escolha',
      enunciado: 'Como se chama a água que cai do céu como gotas, neve ou granizo?',
      alternativas: ['Evaporação', 'Infiltração', 'Precipitação', 'Condensação', 'Transpiração'],
      gabarito: 'c',
      explicacao: 'Tudo o que cai das nuvens se chama precipitação.',
    },
    {
      tipo: 'dissertativa',
      enunciado: 'Por que as roupas no varal secam mais rápido em dia de sol?',
      gabarito: 'Porque o calor do Sol faz a água das roupas evaporar mais depressa.',
      explicacao: 'Quanto mais calor, mais rápido a água vira vapor.',
    },
  ];

  // Fato de exemplo do modo demonstração (escrito por nós).
  const FATO_DEMO = 'A água que você bebe hoje já pode ter sido nuvem, chuva e até gelo muitas vezes. Ela vive dando voltas pelo planeta!';

  const TENTATIVAS_LACUNA = 3;

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
    leia: document.getElementById('botao-leia'),
    leiaTexto: document.getElementById('botao-leia-texto'),
    avisoVoz: document.getElementById('aviso-voz'),
    seguidas: document.getElementById('quiz-seguidas'),
  };

  // Nome curto de cada tipo, mostrado ao lado do número da pergunta.
  const NOMES_DOS_TIPOS = {
    verdadeiro_falso: 'verdadeiro ou falso',
    multipla_escolha: 'múltipla escolha',
    relacionar: 'relacionar',
    completar_lacunas: 'completar',
    dissertativa: 'resposta livre',
  };

  // Selo de acertos seguidos: aparece a partir de 2 (o erro zera a contagem).
  function textoSeguidas(n) {
    return n >= 2 ? `${n} seguidas` : '';
  }

  let estado = null;

  // ---------- Leia comigo ----------

  const temVoz = typeof Voz !== 'undefined';

  // Texto que a voz lê para a pergunta atual.
  function textoParaLer(p) {
    // A lacuna vira uma pausa na leitura.
    const enunciado = p.enunciado.replace(/\s*_{3,}\s*/g, ' ... ');
    switch (p.tipo) {
      case 'verdadeiro_falso':
        return `${enunciado} Verdadeiro ou falso?`;
      case 'multipla_escolha':
        return `${enunciado} ${p.alternativas.map((alt, i) => `${LETRAS[i].toUpperCase()}: ${alt}.`).join(' ')}`;
      case 'relacionar':
        return `${enunciado} ${p.pares.map((par) => `${par.item}.`).join(' ')}`;
      default:
        return enunciado;
    }
  }

  function mostrarBotaoLeitura(lendo) {
    el.leiaTexto.textContent = lendo ? 'Parar leitura' : 'Leia comigo';
    el.leia.setAttribute('aria-pressed', String(lendo));
  }

  if (temVoz) {
    // Sem voz em português: esconde o botão e mostra o aviso.
    const AVISO_SEM_VOZ = el.avisoVoz.textContent;
    const AVISO_FALHOU = 'Não consegui ler em voz alta agora. Confira o volume e tente de novo.';

    Voz.aoVerificar((disponivel) => {
      el.leia.hidden = !disponivel;
      el.avisoVoz.textContent = AVISO_SEM_VOZ;
      el.avisoVoz.hidden = disponivel;
    });

    el.leia.addEventListener('click', async () => {
      if (!estado) return;
      if (Voz.lendo()) {
        Voz.parar();
        mostrarBotaoLeitura(false);
        return;
      }
      el.avisoVoz.hidden = true;
      mostrarBotaoLeitura(true);
      const indice = estado.indice;
      // Pergunta: sempre a voz do navegador, nunca a gravação da família.
      const resultado = await Voz.lerPergunta(textoParaLer(estado.perguntas[indice]));
      if (estado.indice !== indice) return;
      mostrarBotaoLeitura(false);
      if (resultado === 'erro') {
        el.avisoVoz.textContent = AVISO_FALHOU;
        el.avisoVoz.hidden = false;
      }
    });
  }

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
      case 'completar_lacunas':
        return (texto(p.enunciado).match(/_{3,}/g) || []).length === 1
          && Boolean(texto(p.gabarito))
          && (p.respostas_aceitas === undefined || Array.isArray(p.respostas_aceitas));
      default:
        return false;
    }
  }

  // Compara respostas digitadas sem ligar para maiúsculas, acentos e pontuação.
  function normalizar(valor) {
    return String(valor)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[.,;:!?"'()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
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

  // Um segmento por pergunta, criado a partir do total (nada fixo em 5).
  function criarSegmentos() {
    const segmentos = estado.perguntas.map(() => criar('span', 'progresso__segmento'));
    el.barra.replaceChildren(el.barraPreenchida, ...segmentos);
  }

  function atualizarBarra(respondidas) {
    const total = estado.perguntas.length;
    el.barraPreenchida.style.width = `${(respondidas / total) * 100}%`;
    el.barra.setAttribute('aria-valuemax', String(total));
    el.barra.setAttribute('aria-valuenow', String(respondidas));
    el.barra.querySelectorAll('.progresso__segmento').forEach((segmento, i) => {
      segmento.classList.toggle('progresso__segmento--feito', i < respondidas);
    });
  }

  function atualizarSelo() {
    const texto = textoSeguidas(estado.seguidas);
    el.seguidas.textContent = texto;
    el.seguidas.hidden = !texto;
  }

  function mostrarFeedback(tipo, titulo, detalhe) {
    const partes = [criar('strong', '', titulo)];
    if (detalhe) partes.push(criar('span', '', detalhe));
    if (tipo === 'sucesso') {
      // A Lumi comemora no painel de acerto.
      const lumi = criar('img', 'feedback__lumi mascote mascote--lumi');
      lumi.src = 'assets/recortes/lumi-comemorando.png';
      lumi.alt = '';
      lumi.width = 56;
      lumi.height = 72;
      partes.unshift(lumi);
    }
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
    estado.seguidas += 1;
    Pontos.adicionar(ganhos);
    atualizarSelo();

    el.pontos.textContent = textoPontos(estado.pontos);
    atualizarBarra(estado.indice + 1);
    // Frase de incentivo variada (e especial em 3, 5 e 10 acertos seguidos).
    const incentivo = temVoz ? Incentivo.acerto() : { frase: null, texto: 'Isso!' };
    mostrarFeedback('sucesso', `${incentivo.texto} +${ganhos} pontos`, pergunta.explicacao);
    // Som de acerto e, depois dele, a gravação da família (se existir).
    Sons.tocar(Sons.deAcerto(estado.seguidas), () => { if (temVoz) Voz.tocarFrase(incentivo.frase); });
    mostrarProxima();
  }

  function errou() {
    estado.tentativas += 1;
    estado.seguidas = 0; // o selo some no erro
    atualizarSelo();
    if (temVoz) Incentivo.erro(); // zera a sequência de acertos
    mostrarFeedback('erro', 'Quase! Tente de novo.');
    Sons.tocar('erro', () => { if (temVoz) Voz.tocarFrase('quase'); }); // gravação da família depois do som
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

  function mostrarLacuna(p) {
    const idCampo = `lacuna-${estado.indice}`;
    const rotulo = criar('label', 'dissertativa__rotulo', 'Complete a lacuna:');
    rotulo.htmlFor = idCampo;
    const campo = criar('input', 'lacuna__campo');
    campo.id = idCampo;
    campo.type = 'text';
    campo.maxLength = 60;
    campo.autocomplete = 'off';
    campo.setAttribute('autocapitalize', 'off');
    campo.spellcheck = false;

    const certas = [p.gabarito, ...(p.respostas_aceitas || [])].map(normalizar);
    const conferir = criar('button', 'botao-principal', 'Conferir');
    conferir.type = 'button';

    function responder() {
      if (estado.respondida) return;
      const digitado = normalizar(campo.value);
      if (!digitado) {
        mostrarFeedback('neutro', 'Escreva sua resposta.');
        campo.focus();
        return;
      }
      if (certas.includes(digitado)) {
        campo.disabled = true;
        conferir.hidden = true;
        campo.classList.add('lacuna__campo--certa');
        acertou(p);
        // Mostra a escrita certa quando a criança acertou sem acento ou com outra forma.
        if (campo.value.trim() !== p.gabarito) {
          el.feedback.append(criar('span', '', ` Escreve-se: ${p.gabarito}.`));
        }
        return;
      }
      errou();
      if (estado.tentativas >= TENTATIVAS_LACUNA) {
        // Depois de algumas tentativas, mostra a resposta e segue, sem pontos.
        estado.respondida = true;
        campo.disabled = true;
        conferir.hidden = true;
        mostrarFeedback('neutro', `A resposta era: ${p.gabarito}`, p.explicacao);
        atualizarBarra(estado.indice + 1);
        mostrarProxima();
      } else {
        campo.select();
      }
    }

    conferir.addEventListener('click', responder);
    campo.addEventListener('keydown', (evento) => {
      if (evento.key === 'Enter') {
        evento.preventDefault();
        responder();
      }
    });

    el.area.className = 'dissertativa';
    el.area.replaceChildren(rotulo, campo, conferir);
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
      seguidas: 0,
      aoTerminar,
    };
    criarSegmentos();
    atualizarSelo();
    el.avisoDemo.hidden = !demo;
    el.aviso.textContent = aviso || '';
    el.aviso.hidden = !aviso;
    el.pontos.textContent = textoPontos(0);
    mostrarPergunta();
    if (temVoz) {
      Incentivo.reiniciar(); // cada missão começa uma sequência nova
      Voz.tocarFrase('oi'); // "Oi! Vamos estudar juntos?" na voz da família, se gravada
    }
  }

  function mostrarPergunta() {
    const p = estado.perguntas[estado.indice];
    estado.tentativas = 0;
    estado.respondida = false;
    if (temVoz) {
      Voz.parar();
      if (Voz.disponivel()) el.avisoVoz.hidden = true; // tira o aviso de falha da pergunta anterior
    }
    mostrarBotaoLeitura(false);

    const tipo = NOMES_DOS_TIPOS[p.tipo];
    el.progresso.textContent = `Pergunta ${estado.indice + 1} de ${estado.perguntas.length}${tipo ? ` · ${tipo}` : ''}`;
    el.enunciado.textContent = p.enunciado;
    el.feedback.hidden = true;
    el.feedback.className = 'feedback';
    el.proxima.hidden = true;
    atualizarBarra(estado.indice);

    if (p.tipo === 'verdadeiro_falso') mostrarVerdadeiroFalso(p);
    else if (p.tipo === 'multipla_escolha') mostrarMultiplaEscolha(p);
    else if (p.tipo === 'relacionar') mostrarRelacionar(p);
    else if (p.tipo === 'completar_lacunas') mostrarLacuna(p);
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
    FATO_DEMO,
    textoParaLer,
    iniciar,
    suportadas,
    textoPontos,
    textoSeguidas,
  };
})();
