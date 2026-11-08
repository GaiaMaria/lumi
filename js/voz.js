// Voz: gravação da voz da família, narração e leitura das perguntas.
// Tudo fica neste aparelho: os áudios vão para o IndexedDB, sem serviço externo
// e sem envio a servidor.
//
// - Frases fixas (começo, acertos, sequências e erro): tocam a gravação da família, se existir.
// - Perguntas (criadas pela IA ou de exemplo): sempre com a voz do navegador em português.
//   A gravação nunca é tocada para uma pergunta.

const Voz = (() => {
  // A ordem aqui é a ordem em que aparecem na área "Minha voz".
  const FRASES = {
    oi: 'Oi! Vamos estudar juntos?',
    vamos_la: 'Vamos lá!',
    muito_bem: 'Muito bem!',
    isso_mesmo: 'Isso mesmo!',
    que_orgulho: 'Que orgulho de você!',
    voce_aprendeu: 'Você aprendeu direitinho!',
    seguidas_3: 'Três seguidas! Continue assim!',
    seguidas_5: 'Cinco seguidas! Você está brilhando!',
    seguidas_10: 'Dez seguidas! Que luz forte!',
    quase: 'Quase! Tente de novo',
  };

  // Quando cada frase toca (texto de ajuda para a família).
  const QUANDO = {
    oi: 'No começo da missão',
    vamos_la: 'No começo da tabuada',
    muito_bem: 'Num acerto (se reveza com as outras de acerto)',
    isso_mesmo: 'Num acerto (se reveza com as outras de acerto)',
    que_orgulho: 'Num acerto (se reveza com as outras de acerto)',
    voce_aprendeu: 'Num acerto (se reveza com as outras de acerto)',
    seguidas_3: 'No 3º acerto seguido',
    seguidas_5: 'No 5º acerto seguido',
    seguidas_10: 'No 10º acerto seguido (e a cada 5 depois disso)',
    quase: 'Num erro',
  };

  const BANCO = 'lumi-voz';
  const LOJA = 'gravacoes';

  // Formatos tentados em ordem: WebM (Chrome, Android) e MP4 (Safari, iPhone).
  const FORMATOS = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4;codecs=mp4a.40.2',
    'audio/mp4',
    'audio/aac',
  ];

  const temSintese = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

  let vozPt = null;
  let verificada = false;
  let audioAtual = null;
  const ouvintes = [];

  // Áudios já carregados na memória (chave → endereço do blob), para tocar na hora do toque.
  const carregadas = new Map();

  // ---------- suporte do aparelho ----------

  // Navegador dentro de outro app (WhatsApp, Instagram, Facebook...).
  function navegadorDentroDeApp() {
    const ua = navigator.userAgent || '';
    if (/FBAN|FBAV|FB_IAB|Instagram|WhatsApp|Line\/|MicroMessenger|TikTok|musical_ly|Snapchat|; wv\)/i.test(ua)) return true;
    // No iPhone, os navegadores de verdade (Safari, Chrome, Firefox, Edge) têm "Safari" no nome.
    return /(iPhone|iPad|iPod)/.test(ua) && /AppleWebKit/.test(ua) && !/Safari/.test(ua);
  }

  function podeGravar() {
    return Boolean(
      navigator.mediaDevices
      && typeof navigator.mediaDevices.getUserMedia === 'function'
      && typeof window.MediaRecorder === 'function'
      && 'indexedDB' in window,
    );
  }

  // Primeiro formato que este aparelho grava, ou '' para usar o padrão do navegador.
  function formatoGravacao() {
    if (typeof window.MediaRecorder !== 'function' || typeof MediaRecorder.isTypeSupported !== 'function') return '';
    return FORMATOS.find((tipo) => MediaRecorder.isTypeSupported(tipo)) || '';
  }

  // ---------- voz do navegador ----------

  function escolherVoz() {
    if (!temSintese) return null;
    const vozes = window.speechSynthesis.getVoices();
    return vozes.find((v) => /^pt[-_]br$/i.test(v.lang))
      || vozes.find((v) => /^pt\b/i.test(v.lang))
      || null;
  }

  function atualizarVoz() {
    vozPt = escolherVoz();
    verificada = true;
    ouvintes.forEach((fn) => fn(disponivel()));
  }

  function iniciarSintese() {
    if (!temSintese) {
      verificada = true;
      return;
    }
    vozPt = escolherVoz();
    if (vozPt) verificada = true;
    const sintese = window.speechSynthesis;
    // As vozes podem chegar depois (Chrome do Android): espera o evento antes de decidir.
    // Se chegarem mais tarde ainda, o botão aparece nessa hora.
    if (typeof sintese.addEventListener === 'function') sintese.addEventListener('voiceschanged', atualizarVoz);
    else sintese.onvoiceschanged = atualizarVoz;
    // Alguns navegadores nunca disparam o evento: decide com o que houver depois de 3 s.
    setTimeout(() => {
      if (!verificada) atualizarVoz();
    }, 3000);
  }

  function disponivel() {
    return Boolean(vozPt);
  }

  function aoVerificar(fn) {
    ouvintes.push(fn);
    if (verificada) fn(disponivel());
  }

  // ---------- IndexedDB ----------

  function abrirBanco() {
    return new Promise((resolver, rejeitar) => {
      if (!('indexedDB' in window)) {
        rejeitar(new Error('sem_indexeddb'));
        return;
      }
      const pedido = indexedDB.open(BANCO, 1);
      pedido.onupgradeneeded = () => pedido.result.createObjectStore(LOJA);
      pedido.onsuccess = () => resolver(pedido.result);
      pedido.onerror = () => rejeitar(pedido.error);
    });
  }

  function transacao(modo, trabalho) {
    return abrirBanco().then((banco) => new Promise((resolver, rejeitar) => {
      const tx = banco.transaction(LOJA, modo);
      let resultado;
      tx.oncomplete = () => {
        banco.close();
        resolver(resultado);
      };
      tx.onerror = () => {
        banco.close();
        rejeitar(tx.error);
      };
      resultado = trabalho(tx.objectStore(LOJA));
    }));
  }

  function chave(familia, frase) {
    return `${familia}:${frase}`;
  }

  async function salvarGravacao(frase, blob) {
    const familia = Familia.garantirId();
    await transacao('readwrite', (loja) => {
      loja.put({ blob, tipo: blob.type, gravadaEm: new Date().toISOString() }, chave(familia, frase));
    });
    await carregarGravacoes();
  }

  async function apagarGravacao(frase) {
    const familia = Familia.id();
    if (!familia) return;
    await transacao('readwrite', (loja) => {
      loja.delete(chave(familia, frase));
    });
    await carregarGravacoes();
  }

  // Apaga todos os áudios de uma família (botão "Apagar dados da família").
  async function apagarDaFamilia(familia) {
    limparCarregadas();
    if (!familia || !('indexedDB' in window)) return;
    await transacao('readwrite', (loja) => {
      const pedido = loja.openCursor();
      pedido.onsuccess = () => {
        const cursor = pedido.result;
        if (!cursor) return;
        if (String(cursor.key).startsWith(`${familia}:`)) cursor.delete();
        cursor.continue();
      };
    });
  }

  function limparCarregadas() {
    carregadas.forEach((item) => URL.revokeObjectURL(item.url));
    carregadas.clear();
  }

  // Carrega as gravações da família na memória, para tocar sem esperar.
  async function carregarGravacoes() {
    limparCarregadas();
    const familia = Familia.id();
    if (!familia || !('indexedDB' in window)) return;
    try {
      const itens = await transacao('readonly', (loja) => {
        const lista = [];
        Object.keys(FRASES).forEach((frase) => {
          const pedido = loja.get(chave(familia, frase));
          pedido.onsuccess = () => {
            const valor = pedido.result;
            if (valor && valor.blob instanceof Blob) lista.push([frase, valor]);
          };
        });
        return lista;
      });
      itens.forEach(([frase, valor]) => {
        carregadas.set(frase, { url: URL.createObjectURL(valor.blob), gravadaEm: valor.gravadaEm });
      });
    } catch (erro) {
      // Sem IndexedDB: segue sem gravações.
    }
  }

  function temGravacao(frase) {
    return carregadas.has(frase);
  }

  // ---------- tocar e falar ----------

  function parar() {
    if (temSintese) window.speechSynthesis.cancel();
    if (audioAtual) {
      audioAtual.pause();
      audioAtual = null;
    }
  }

  // Toca a gravação da família para uma frase fixa. Chamar direto no toque
  // (sem esperar nada antes), para o celular deixar tocar.
  // Devolve uma promessa que termina com o áudio, ou null se não houver gravação.
  function tocarFrase(frase) {
    const item = carregadas.get(frase);
    if (!item) return null;
    parar();
    const audio = new Audio(item.url);
    audioAtual = audio;
    return new Promise((resolver) => {
      const fim = () => {
        if (audioAtual === audio) audioAtual = null;
        resolver();
      };
      audio.addEventListener('ended', fim);
      audio.addEventListener('error', fim);
      audio.play().catch(fim);
    });
  }

  // Deixa o texto bom de ouvir: "7 × ___ = 56" vira "7 vezes ... é igual a 56".
  function limparTexto(texto) {
    return String(texto)
      .replace(/×/g, ' vezes ')
      .replace(/_+/g, ' ... ')
      .replace(/=/g, ' é igual a ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const VELOCIDADE = 0.9;

  // Lê uma pergunta com a voz do navegador. Nunca usa gravação,
  // mesmo que o texto seja igual a uma das frases fixas.
  function lerPergunta(texto) {
    const sintese = temSintese ? window.speechSynthesis : null;
    const estavaFalando = Boolean(sintese && (sintese.speaking || sintese.pending));
    parar(); // cancela a fala anterior
    if (!disponivel()) return Promise.resolve('indisponivel');
    return new Promise((resolver) => {
      const fala = new SpeechSynthesisUtterance(limparTexto(texto));
      fala.lang = vozPt.lang || 'pt-BR';
      fala.voice = vozPt;
      fala.rate = VELOCIDADE;
      fala.onend = () => resolver('sintetizada');
      fala.onerror = () => resolver('sintetizada');
      // Alguns celulares perdem a fala nova se ela vem logo depois do cancelamento.
      if (estavaFalando) setTimeout(() => sintese.speak(fala), 60);
      else sintese.speak(fala);
    });
  }

  function lendo() {
    return Boolean(audioAtual) || (temSintese && window.speechSynthesis.speaking);
  }

  iniciarSintese();
  carregarGravacoes();

  return {
    FRASES,
    QUANDO,
    navegadorDentroDeApp,
    podeGravar,
    formatoGravacao,
    salvarGravacao,
    apagarGravacao,
    apagarDaFamilia,
    carregarGravacoes,
    temGravacao,
    tocarFrase,
    lerPergunta,
    limparTexto,
    parar,
    lendo,
    disponivel,
    aoVerificar,
  };
})();

// Incentivo: escolhe a frase de cada acerto para não ficar repetitivo.
// - 3, 5 e 10 acertos seguidos (e depois a cada 5) têm frase própria.
// - Nos outros acertos, as frases se revezam e nunca repetem a anterior.
// - Um erro zera a sequência.
const Incentivo = (() => {
  const ACERTOS = ['muito_bem', 'isso_mesmo', 'que_orgulho', 'voce_aprendeu'];
  const SEQUENCIAS = { 3: 'seguidas_3', 5: 'seguidas_5', 10: 'seguidas_10' };

  let seguidas = 0;
  let ultima = null;
  let sortear = Math.random; // trocado nos testes

  function fraseDaSequencia(n) {
    if (SEQUENCIAS[n]) return SEQUENCIAS[n];
    if (n > 10 && n % 5 === 0) return 'seguidas_10';
    return null;
  }

  // Com 2 ou mais frases de acerto gravadas, reveza entre elas (a voz da família toca sempre).
  // Com menos, reveza entre todas, para o texto não repetir; a gravação toca quando for a vez dela.
  function escolherAcerto() {
    const gravadas = ACERTOS.filter((f) => Voz.temGravacao(f));
    const base = gravadas.length >= 2 ? gravadas : ACERTOS;
    const opcoes = base.length > 1 ? base.filter((f) => f !== ultima) : base;
    return opcoes[Math.floor(sortear() * opcoes.length)];
  }

  // Devolve { frase, texto, seguidas } para mostrar na tela e tocar.
  function acerto() {
    seguidas += 1;
    const frase = fraseDaSequencia(seguidas) || escolherAcerto();
    ultima = frase;
    return { frase, texto: Voz.FRASES[frase], seguidas };
  }

  function erro() {
    seguidas = 0;
    return { frase: 'quase', texto: Voz.FRASES.quase, seguidas };
  }

  function reiniciar() {
    seguidas = 0;
    ultima = null;
  }

  return {
    acerto,
    erro,
    reiniciar,
    _definirSorteio: (fn) => { sortear = fn; },
  };
})();

// Painel dos pais: área "Minha voz".
const MinhaVoz = (() => {
  const DURACAO_MAXIMA_MS = 10000;

  const MENSAGENS = {
    negado: 'Para gravar sua voz, permita o uso do microfone nas configurações do navegador.',
    semSuporte: 'Seu navegador não permite gravar a voz. Tente pelo Chrome ou pelo Safari.',
    dentroDeApp: 'Você abriu o Lumi dentro de outro app (como WhatsApp ou Instagram). Para gravar sua voz, abra o link no Chrome ou no Safari.',
    semMicrofone: 'Não encontramos um microfone neste aparelho.',
    falhou: 'Não consegui gravar agora. Tente de novo.',
    curta: 'A gravação ficou muito curta. Tente de novo, falando a frase inteira.',
    marqueAceite: 'Marque a caixa de autorização para começar a gravar.',
  };

  const $ = (id) => document.getElementById(id);
  const el = {
    area: $('voz-area'),
    semSuporte: $('voz-sem-suporte'),
    consentimento: $('voz-consentimento'),
    dica: $('voz-dica'),
    aceite: $('voz-aceite'),
    aceiteData: $('voz-aceite-data'),
    lista: $('voz-frases'),
    mensagem: $('voz-mensagem'),
  };

  const formatoData = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  let gravando = null; // { frase, gravador, fluxo, relogio, inicio }

  function avisar(texto) {
    el.mensagem.textContent = texto || '';
  }

  function consentiu() {
    return Boolean(Familia.consentimentoVoz());
  }

  function desenharConsentimento() {
    const data = Familia.consentimentoVoz();
    el.aceite.checked = Boolean(data);
    el.aceite.disabled = Boolean(data);
    el.aceiteData.hidden = !data;
    el.aceiteData.textContent = data ? `Autorizado em ${formatoData.format(new Date(data))}.` : '';
  }

  function botao(texto, classe, aoClicar, desativado = false) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = classe;
    b.textContent = texto;
    b.disabled = desativado;
    b.addEventListener('click', aoClicar);
    return b;
  }

  function desenharFrases() {
    desenharDica();
    const pode = consentiu();
    el.lista.replaceChildren(...Object.entries(Voz.FRASES).map(([frase, texto]) => {
      const item = document.createElement('li');
      item.className = 'frase';

      const titulo = document.createElement('p');
      titulo.className = 'frase__texto';
      titulo.textContent = `“${texto}”`;

      const quando = document.createElement('p');
      quando.className = 'frase__quando';
      quando.textContent = Voz.QUANDO[frase] || '';

      const estado = document.createElement('p');
      estado.className = 'frase__estado';

      const acoes = document.createElement('div');
      acoes.className = 'frase__acoes';

      if (gravando && gravando.frase === frase) {
        item.classList.add('frase--gravando');
        estado.textContent = 'Gravando... toque em Parar quando terminar.';
        acoes.append(botao('Parar', 'botao-principal botao-pequeno', pararGravacao));
      } else {
        const gravada = Voz.temGravacao(frase);
        estado.textContent = gravada ? 'Gravada' : 'Ainda não gravada';
        const ocupado = !pode || Boolean(gravando);
        acoes.append(botao(gravada ? 'Regravar' : 'Gravar', 'botao-principal botao-pequeno', () => comecarGravacao(frase), ocupado));
        if (gravada) {
          acoes.append(
            botao('Ouvir', 'botao-secundario botao-pequeno', () => Voz.tocarFrase(frase), Boolean(gravando)),
            botao('Apagar', 'botao-secundario botao-pequeno', () => apagar(frase, texto), Boolean(gravando)),
          );
        }
      }

      item.append(titulo, quando, estado, acoes);
      return item;
    }));
  }

  function desenhar() {
    desenharConsentimento();
    desenharFrases();
  }

  // A dica de ambiente silencioso aparece até a primeira gravação.
  function desenharDica() {
    el.dica.hidden = Object.keys(Voz.FRASES).some((frase) => Voz.temGravacao(frase));
  }

  // Precisa ser chamada direto do toque no botão "Gravar".
  async function comecarGravacao(frase) {
    if (gravando) return;
    if (!consentiu()) {
      avisar(MENSAGENS.marqueAceite);
      return;
    }
    avisar('');
    Voz.parar();

    let fluxo;
    try {
      fluxo = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (erro) {
      if (erro && (erro.name === 'NotAllowedError' || erro.name === 'SecurityError')) avisar(MENSAGENS.negado);
      else if (erro && (erro.name === 'NotFoundError' || erro.name === 'OverconstrainedError')) avisar(MENSAGENS.semMicrofone);
      else avisar(MENSAGENS.falhou);
      return;
    }

    const tipo = Voz.formatoGravacao();
    let gravador;
    try {
      gravador = tipo ? new MediaRecorder(fluxo, { mimeType: tipo }) : new MediaRecorder(fluxo);
    } catch (erro) {
      gravador = new MediaRecorder(fluxo);
    }

    const pedacos = [];
    gravador.addEventListener('dataavailable', (evento) => {
      if (evento.data && evento.data.size) pedacos.push(evento.data);
    });
    gravador.addEventListener('stop', async () => {
      fluxo.getTracks().forEach((faixa) => faixa.stop());
      const duracao = Date.now() - gravando.inicio;
      clearTimeout(gravando.relogio);
      gravando = null;
      const blob = new Blob(pedacos, { type: gravador.mimeType || tipo || 'audio/webm' });
      if (duracao < 500 || blob.size === 0) {
        avisar(MENSAGENS.curta);
        desenharFrases();
        return;
      }
      try {
        await Voz.salvarGravacao(frase, blob);
        avisar('Gravação salva neste aparelho.');
      } catch (erro) {
        avisar(MENSAGENS.falhou);
      }
      desenharFrases();
    });

    gravando = {
      frase,
      gravador,
      fluxo,
      inicio: Date.now(),
      relogio: setTimeout(pararGravacao, DURACAO_MAXIMA_MS),
    };
    gravador.start();
    desenharFrases();
  }

  function pararGravacao() {
    if (gravando && gravando.gravador.state !== 'inactive') gravando.gravador.stop();
  }

  async function apagar(frase, texto) {
    if (!window.confirm(`Apagar a gravação de “${texto}”?`)) return;
    await Voz.apagarGravacao(frase);
    avisar('Gravação apagada.');
    desenharFrases();
  }

  el.aceite.addEventListener('change', () => {
    if (el.aceite.checked && !consentiu()) {
      Familia.registrarConsentimentoVoz();
      avisar('');
      desenhar();
    }
  });

  // Ao abrir a tela: confere se dá para gravar neste navegador.
  async function abrir() {
    avisar('');
    let problema = '';
    if (Voz.navegadorDentroDeApp()) problema = MENSAGENS.dentroDeApp;
    else if (!Voz.podeGravar()) problema = MENSAGENS.semSuporte;

    el.semSuporte.textContent = problema;
    el.semSuporte.hidden = !problema;
    el.area.hidden = Boolean(problema);
    if (problema) return;

    await Voz.carregarGravacoes();
    desenhar();
  }

  function sair() {
    pararGravacao();
    Voz.parar();
  }

  return { abrir, sair };
})();
