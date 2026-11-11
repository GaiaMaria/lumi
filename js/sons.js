// Sons do app: curtos, suaves e gerados no próprio navegador (Web Audio API).
// Sem arquivos de áudio e sem biblioteca. A família liga ou desliga na Área dos pais.
//
// Regras:
// - Volume baixo e duração curta (no máximo cerca de 1 segundo).
// - Toque e troca de tela não tocam enquanto o app lê em voz alta.
// - Sons.tocar(nome, depois) chama "depois" quando o som termina (ou na hora, se o som
//   estiver desligado). Assim a frase gravada pela família não toca por cima do som.

const Sons = (() => {
  const VOLUME_GERAL = 0.5;
  const INTERVALO_DO_TOQUE_MS = 150; // o toque não repete logo depois de outro som

  // Notas usadas (Hz).
  const DO6 = 1046.5;
  const MI6 = 1318.5;
  const SOL6 = 1568;
  const DO7 = 2093;
  const SOL4 = 392;
  const MI4 = 329.6;

  // Cada som é uma lista de notas: início (s), frequência, frequência final (opcional),
  // duração (s), volume (0 a 1) e forma da onda. "ruido" é um sopro leve (troca de tela).
  const SONS = {
    toque: {
      notas: [{ inicio: 0, freq: 1200, ate: 900, dur: 0.06, vol: 0.18, onda: 'triangle' }],
    },
    tela: {
      // Sopro curto subindo, com uma nota bem leve por baixo para dar corpo.
      ruido: { dur: 0.26, vol: 0.5, de: 700, ate: 3200 },
      notas: [{ inicio: 0.02, freq: 520, ate: 880, dur: 0.2, vol: 0.1, onda: 'sine' }],
    },
    acerto: {
      notas: [
        { inicio: 0, freq: DO6, dur: 0.22, vol: 0.32, onda: 'sine' },
        { inicio: 0.09, freq: SOL6, dur: 0.38, vol: 0.32, onda: 'sine' },
        { inicio: 0.09, freq: SOL6 * 2, dur: 0.25, vol: 0.06, onda: 'sine' }, // brilho
      ],
    },
    erro: {
      notas: [
        { inicio: 0, freq: SOL4, ate: MI4, dur: 0.32, vol: 0.22, onda: 'sine' },
      ],
    },
    sequencia: {
      notas: [
        { inicio: 0, freq: DO6, dur: 0.18, vol: 0.26, onda: 'sine' },
        { inicio: 0.07, freq: MI6, dur: 0.18, vol: 0.26, onda: 'sine' },
        { inicio: 0.14, freq: SOL6, dur: 0.2, vol: 0.26, onda: 'sine' },
        { inicio: 0.21, freq: DO7, dur: 0.4, vol: 0.24, onda: 'sine' },
        { inicio: 0.21, freq: DO7 * 2, dur: 0.3, vol: 0.05, onda: 'sine' },
      ],
    },
    medalha: {
      notas: [
        { inicio: 0, freq: SOL4 * 2, dur: 0.2, vol: 0.24, onda: 'triangle' },
        { inicio: 0.1, freq: DO6, dur: 0.2, vol: 0.24, onda: 'triangle' },
        { inicio: 0.2, freq: MI6, dur: 0.2, vol: 0.24, onda: 'triangle' },
        { inicio: 0.32, freq: DO6, dur: 0.7, vol: 0.2, onda: 'sine' },
        { inicio: 0.32, freq: MI6, dur: 0.7, vol: 0.18, onda: 'sine' },
        { inicio: 0.32, freq: SOL6, dur: 0.7, vol: 0.18, onda: 'sine' },
        { inicio: 0.4, freq: DO7 * 2, dur: 0.12, vol: 0.04, onda: 'sine' },
        { inicio: 0.55, freq: SOL6 * 2, dur: 0.12, vol: 0.04, onda: 'sine' },
        { inicio: 0.7, freq: DO7 * 2, dur: 0.15, vol: 0.04, onda: 'sine' },
      ],
    },
    tique: {
      notas: [{ inicio: 0, freq: 1500, dur: 0.04, vol: 0.14, onda: 'square' }],
    },
  };

  // Vibração leve no celular (onde houver), só nos momentos de comemoração.
  const VIBRACAO = { acerto: 15, sequencia: [15, 40, 15], medalha: [20, 50, 20, 50, 40] };

  // Sons que não tocam enquanto o app lê em voz alta.
  const DISCRETOS = ['toque', 'tela', 'tique'];

  let contexto = null;
  let ultimoSom = 0;
  let ligadoNaMemoria = true; // usado quando a família ainda não existe

  function duracao(nome) {
    const som = SONS[nome];
    if (!som) return 0;
    const fins = som.notas.map((n) => n.inicio + n.dur);
    if (som.ruido) fins.push(som.ruido.dur);
    return Math.max(0, ...fins);
  }

  function ligado() {
    if (typeof Familia !== 'undefined' && Familia.som) return Familia.som();
    return ligadoNaMemoria;
  }

  function definir(valor) {
    ligadoNaMemoria = Boolean(valor);
    if (typeof Familia !== 'undefined' && Familia.definirSom) Familia.definirSom(ligadoNaMemoria);
  }

  function lendoEmVozAlta() {
    try {
      return Boolean(window.speechSynthesis && window.speechSynthesis.speaking);
    } catch (erro) {
      return false;
    }
  }

  // O navegador só deixa tocar som depois que a pessoa tocou na página.
  function houveToque() {
    try {
      const ativacao = navigator.userActivation;
      return !ativacao || ativacao.hasBeenActive;
    } catch (erro) {
      return true;
    }
  }

  function obterContexto() {
    if (contexto) return contexto;
    const Classe = window.AudioContext || window.webkitAudioContext;
    if (!Classe) return null;
    try {
      contexto = new Classe();
    } catch (erro) {
      contexto = null;
    }
    return contexto;
  }

  function tocarNota(ctx, saida, agora, nota) {
    const osc = ctx.createOscillator();
    const ganho = ctx.createGain();
    osc.type = nota.onda || 'sine';
    const t0 = agora + nota.inicio;
    const t1 = t0 + nota.dur;
    osc.frequency.setValueAtTime(nota.freq, t0);
    if (nota.ate) osc.frequency.exponentialRampToValueAtTime(nota.ate, t1);
    // Ataque rápido e queda suave, sem estalo.
    ganho.gain.setValueAtTime(0.0001, t0);
    ganho.gain.exponentialRampToValueAtTime(nota.vol, t0 + 0.012);
    ganho.gain.exponentialRampToValueAtTime(0.0001, t1);
    osc.connect(ganho).connect(saida);
    osc.start(t0);
    osc.stop(t1 + 0.02);
  }

  function tocarRuido(ctx, saida, agora, ruido) {
    const amostras = Math.ceil(ctx.sampleRate * ruido.dur);
    const buffer = ctx.createBuffer(1, amostras, ctx.sampleRate);
    const dados = buffer.getChannelData(0);
    for (let i = 0; i < amostras; i += 1) dados[i] = Math.random() * 2 - 1;
    const fonte = ctx.createBufferSource();
    fonte.buffer = buffer;
    const filtro = ctx.createBiquadFilter();
    filtro.type = 'bandpass';
    filtro.Q.value = 1.2;
    filtro.frequency.setValueAtTime(ruido.de, agora);
    filtro.frequency.exponentialRampToValueAtTime(ruido.ate, agora + ruido.dur);
    const ganho = ctx.createGain();
    ganho.gain.setValueAtTime(0.0001, agora);
    ganho.gain.exponentialRampToValueAtTime(ruido.vol, agora + ruido.dur * 0.4);
    ganho.gain.exponentialRampToValueAtTime(0.0001, agora + ruido.dur);
    fonte.connect(filtro).connect(ganho).connect(saida);
    fonte.start(agora);
  }

  function vibrar(nome) {
    try {
      if (VIBRACAO[nome] && navigator.vibrate) navigator.vibrate(VIBRACAO[nome]);
    } catch (erro) {
      // sem vibração
    }
  }

  // Toca um som. Devolve true se tocou. "depois" é chamado quando o som termina.
  function tocar(nome, depois) {
    const seguir = () => { if (typeof depois === 'function') depois(); };
    const som = SONS[nome];
    const agoraMs = Date.now();
    const pular = !som
      || !ligado()
      || !houveToque()
      || (DISCRETOS.includes(nome) && lendoEmVozAlta())
      || (nome === 'toque' && agoraMs - ultimoSom < INTERVALO_DO_TOQUE_MS);
    if (pular) {
      seguir();
      return false;
    }
    const ctx = obterContexto();
    if (!ctx) {
      seguir();
      return false;
    }
    try {
      if (ctx.state === 'suspended') ctx.resume();
      const saida = ctx.createGain();
      saida.gain.value = VOLUME_GERAL;
      saida.connect(ctx.destination);
      const agora = ctx.currentTime + 0.01;
      if (som.ruido) tocarRuido(ctx, saida, agora, som.ruido);
      som.notas.forEach((nota) => tocarNota(ctx, saida, agora, nota));
    } catch (erro) {
      seguir();
      return false;
    }
    ultimoSom = agoraMs;
    vibrar(nome);
    if (typeof depois === 'function') setTimeout(depois, Math.round(duracao(nome) * 1000));
    return true;
  }

  // Acerto comum ou comemoração de sequência (3, 5, 10 e depois a cada 5 seguidas).
  function deAcerto(seguidas) {
    const n = Number(seguidas) || 0;
    return n === 3 || n === 5 || (n >= 10 && n % 5 === 0) ? 'sequencia' : 'acerto';
  }

  // Caixa "Sons do app" na Área dos pais.
  function atualizarCaixa() {
    const caixa = typeof document !== 'undefined' && document.getElementById
      ? document.getElementById('pais-sons')
      : null;
    if (caixa) caixa.checked = ligado();
  }

  if (typeof document !== 'undefined' && document.getElementById) {
    const caixa = document.getElementById('pais-sons');
    if (caixa && caixa.addEventListener) {
      caixa.addEventListener('change', () => {
        definir(caixa.checked);
        if (caixa.checked) tocar('acerto'); // para ouvir que ligou
      });
    }
  }

  // Toque leve em todo botão do app (exceto os marcados com data-som="nao").
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('click', (evento) => {
      const alvo = evento.target && evento.target.closest
        ? evento.target.closest('button, [role="button"], a.botao-principal, a.botao-secundario')
        : null;
      if (!alvo || alvo.disabled || alvo.dataset.som === 'nao') return;
      tocar('toque');
    });
  }

  return { tocar, ligado, definir, duracao, deAcerto, atualizarCaixa, NOMES: Object.keys(SONS) };
})();
