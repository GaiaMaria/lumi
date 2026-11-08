// Leitura em voz alta.
// Se a mãe ou responsável gravou uma das frases padrão, toca a gravação.
// Se não, usa a voz do navegador (speechSynthesis) em português do Brasil.
// As gravações ficam no IndexedDB deste aparelho, ligadas à família.

const Voz = (() => {
  // Frases que podem ter gravação da família.
  const FRASES = {
    muito_bem: 'Muito bem!',
    quase: 'Quase! Tente de novo',
    vamos_la: 'Vamos lá!',
  };

  const BANCO = 'lumi-voz';
  const LOJA = 'gravacoes';

  const temSintese = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

  let vozPt = null;
  let verificada = false;
  let audioAtual = null;
  let urlAtual = null;
  const ouvintes = [];

  // ---------- voz do navegador ----------

  function escolherVoz() {
    if (!temSintese) return null;
    const vozes = window.speechSynthesis.getVoices();
    return vozes.find((v) => /^pt[-_]br$/i.test(v.lang))
      || vozes.find((v) => /^pt\b/i.test(v.lang))
      || null;
  }

  function avisarOuvintes() {
    ouvintes.forEach((fn) => fn(disponivel()));
  }

  function atualizarVoz() {
    vozPt = escolherVoz();
    verificada = true;
    avisarOuvintes();
  }

  // As vozes chegam depois no Chrome; no Safari já vêm na hora.
  function iniciar() {
    if (!temSintese) {
      verificada = true;
      return;
    }
    vozPt = escolherVoz();
    if (vozPt) verificada = true;
    const sintese = window.speechSynthesis;
    if (typeof sintese.addEventListener === 'function') {
      sintese.addEventListener('voiceschanged', atualizarVoz);
    } else {
      sintese.onvoiceschanged = atualizarVoz;
    }
    // Se as vozes nunca chegarem, decide assim mesmo.
    setTimeout(() => {
      if (!verificada) atualizarVoz();
    }, 1500);
  }

  function disponivel() {
    return Boolean(vozPt);
  }

  // fn(disponivel) é chamada quando se sabe se há voz em português.
  function aoVerificar(fn) {
    ouvintes.push(fn);
    if (verificada) fn(disponivel());
  }

  // ---------- gravações da família (IndexedDB) ----------

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

  function chaveDaFamilia(frase) {
    const familia = Familia.id();
    return familia ? `${familia}:${frase}` : null;
  }

  async function lerGravacao(frase) {
    const chave = chaveDaFamilia(frase);
    if (!chave) return null;
    try {
      const banco = await abrirBanco();
      return await new Promise((resolver) => {
        const pedido = banco.transaction(LOJA, 'readonly').objectStore(LOJA).get(chave);
        pedido.onsuccess = () => {
          const valor = pedido.result;
          resolver(valor && valor.blob instanceof Blob ? valor.blob : null);
        };
        pedido.onerror = () => resolver(null);
      });
    } catch (erro) {
      return null;
    }
  }

  // Qual frase padrão é este texto (sem ligar para acento e pontuação).
  function normalizar(texto) {
    return String(texto)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z ]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function fraseDoTexto(texto) {
    const alvo = normalizar(texto);
    return Object.keys(FRASES).find((chave) => normalizar(FRASES[chave]) === alvo) || null;
  }

  // ---------- tocar e falar ----------

  function parar() {
    if (temSintese) window.speechSynthesis.cancel();
    if (audioAtual) {
      audioAtual.pause();
      audioAtual = null;
    }
    if (urlAtual) {
      URL.revokeObjectURL(urlAtual);
      urlAtual = null;
    }
  }

  function tocar(blob) {
    return new Promise((resolver) => {
      urlAtual = URL.createObjectURL(blob);
      audioAtual = new Audio(urlAtual);
      const fim = () => {
        parar();
        resolver();
      };
      audioAtual.addEventListener('ended', fim);
      audioAtual.addEventListener('error', fim);
      audioAtual.play().catch(fim);
    });
  }

  function sintetizar(texto) {
    return new Promise((resolver) => {
      const fala = new SpeechSynthesisUtterance(texto);
      fala.lang = 'pt-BR';
      fala.voice = vozPt;
      fala.rate = 0.95;
      fala.onend = resolver;
      fala.onerror = resolver;
      window.speechSynthesis.speak(fala);
    });
  }

  // Lê o texto. Devolve 'gravacao', 'sintetizada' ou 'indisponivel'
  // e termina quando a leitura acaba.
  async function ler(texto) {
    parar();
    const frase = fraseDoTexto(texto);
    if (frase) {
      const gravacao = await lerGravacao(frase);
      if (gravacao) {
        await tocar(gravacao);
        return 'gravacao';
      }
    }
    if (!disponivel()) return 'indisponivel';
    await sintetizar(texto);
    return 'sintetizada';
  }

  function lendo() {
    return Boolean(audioAtual) || (temSintese && window.speechSynthesis.speaking);
  }

  iniciar();

  return {
    FRASES,
    ler,
    parar,
    lendo,
    disponivel,
    aoVerificar,
    // Usados pelo painel "Minha voz".
    abrirBanco,
    chaveDaFamilia,
    LOJA,
  };
})();
