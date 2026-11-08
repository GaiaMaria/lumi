// Testes da narração (js/voz.js): limpeza do texto, escolha da voz e regra da gravação.
// Rodar com: node --test testes/
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Carrega js/voz.js com um navegador de mentira e as vozes pedidas.
function carregar(vozes, { eventoDepois = null } = {}) {
  const falas = [];
  let ouvinteVozes = null;
  let listaAtual = vozes;
  const elementoFalso = () => ({
    hidden: false, checked: false, disabled: false, textContent: '', addEventListener() {}, replaceChildren() {},
  });
  const contexto = {
    window: {},
    navigator: { userAgent: 'teste' },
    document: { getElementById: elementoFalso, createElement: elementoFalso },
    Familia: { id: () => null, garantirId: () => 'f' },
    Intl,
    URL,
    Blob,
    Promise,
    setTimeout,
    clearTimeout,
  };
  contexto.window.speechSynthesis = {
    speaking: false,
    pending: false,
    getVoices: () => listaAtual,
    addEventListener: (nome, fn) => { if (nome === 'voiceschanged') ouvinteVozes = fn; },
    cancel() {},
    speak(fala) { falas.push(fala); if (fala.onend) fala.onend(); },
  };
  contexto.window.SpeechSynthesisUtterance = function Fala(texto) { this.text = texto; };
  contexto.SpeechSynthesisUtterance = contexto.window.SpeechSynthesisUtterance;
  vm.createContext(contexto);
  const codigo = fs.readFileSync(path.join(__dirname, '..', 'js', 'voz.js'), 'utf8');
  vm.runInContext(`${codigo}\nthis.Voz = Voz; this.Incentivo = Incentivo;`, contexto);
  if (eventoDepois) {
    listaAtual = eventoDepois;
    ouvinteVozes();
  }
  return { Voz: contexto.Voz, Incentivo: contexto.Incentivo, falas };
}

const ptBR = { name: 'Maria', lang: 'pt-BR' };
const ptPT = { name: 'Joana', lang: 'pt-PT' };
const enUS = { name: 'Zira', lang: 'en-US' };

test('limpa o texto: ×, lacuna, = e espaços', () => {
  const { Voz } = carregar([ptBR]);
  assert.strictEqual(Voz.limparTexto('7 × ___ = 56'), '7 vezes ... é igual a 56');
  assert.strictEqual(Voz.limparTexto('3×4=12'), '3 vezes 4 é igual a 12');
  assert.strictEqual(Voz.limparTexto('Acontece a   ___  .'), 'Acontece a ... .');
});

test('escolhe pt-BR quando existe', () => {
  const { Voz, falas } = carregar([enUS, ptPT, ptBR]);
  assert.strictEqual(Voz.disponivel(), true);
  return Voz.lerPergunta('Quanto é 2 × 3?').then(() => {
    assert.strictEqual(falas[0].voice.name, 'Maria');
    assert.strictEqual(falas[0].rate, 0.9);
    assert.strictEqual(falas[0].text, 'Quanto é 2 vezes 3?');
  });
});

test('sem pt-BR, usa qualquer voz pt', () => {
  const { Voz, falas } = carregar([enUS, ptPT]);
  return Voz.lerPergunta('Olá').then(() => assert.strictEqual(falas[0].voice.name, 'Joana'));
});

test('sem voz em português: indisponível e não fala', async () => {
  const { Voz, falas } = carregar([enUS]);
  let visivel = null;
  Voz.aoVerificar((ok) => { visivel = ok; });
  // Ainda não decidiu: espera o evento voiceschanged.
  assert.strictEqual(visivel, null);
  assert.strictEqual(await Voz.lerPergunta('Olá'), 'indisponivel');
  assert.strictEqual(falas.length, 0);
});

test('vozes chegando depois pelo evento voiceschanged mostram o botão', () => {
  const { Voz } = carregar([], { eventoDepois: [ptBR] });
  let visivel = null;
  Voz.aoVerificar((ok) => { visivel = ok; });
  assert.strictEqual(visivel, true);
});

test('evento voiceschanged sem português esconde o botão', () => {
  const { Voz } = carregar([], { eventoDepois: [enUS] });
  let visivel = null;
  Voz.aoVerificar((ok) => { visivel = ok; });
  assert.strictEqual(visivel, false);
});

test('pergunta igual a uma frase fixa é falada pela voz do navegador, nunca pela gravação', async () => {
  const { Voz, falas } = carregar([ptBR]);
  assert.strictEqual(await Voz.lerPergunta('Muito bem!'), 'sintetizada');
  assert.strictEqual(falas.length, 1);
});

test('incentivo: frases especiais em 3, 5, 10 e 15 acertos seguidos', () => {
  const { Incentivo } = carregar([ptBR]);
  const frases = Array.from({ length: 15 }, () => Incentivo.acerto().frase);
  assert.strictEqual(frases[2], 'seguidas_3');
  assert.strictEqual(frases[4], 'seguidas_5');
  assert.strictEqual(frases[9], 'seguidas_10');
  assert.strictEqual(frases[14], 'seguidas_10');
});

test('incentivo: acertos comuns nunca repetem a frase anterior', () => {
  const { Incentivo } = carregar([ptBR]);
  for (let rodada = 0; rodada < 20; rodada += 1) {
    Incentivo.reiniciar();
    const frases = Array.from({ length: 30 }, () => Incentivo.acerto().frase);
    for (let i = 1; i < frases.length; i += 1) assert.notStrictEqual(frases[i], frases[i - 1]);
  }
});

test('incentivo: um erro zera a sequência', () => {
  const { Incentivo } = carregar([ptBR]);
  Incentivo.acerto();
  Incentivo.acerto();
  assert.strictEqual(Incentivo.erro().frase, 'quase');
  assert.notStrictEqual(Incentivo.acerto().frase, 'seguidas_3');
  Incentivo.acerto();
  assert.strictEqual(Incentivo.acerto().frase, 'seguidas_3');
});

test('incentivo: prefere as frases de acerto que a família gravou', () => {
  const { Voz, Incentivo } = carregar([ptBR]);
  Voz.temGravacao = (frase) => frase === 'isso_mesmo' || frase === 'que_orgulho';
  const frases = [Incentivo.acerto().frase, Incentivo.acerto().frase];
  frases.forEach((f) => assert.ok(['isso_mesmo', 'que_orgulho'].includes(f), f));
});

test('incentivo: com só uma frase gravada, o texto continua variando', () => {
  const { Voz, Incentivo } = carregar([ptBR]);
  Voz.temGravacao = (frase) => frase === 'muito_bem';
  const frases = Array.from({ length: 8 }, () => Incentivo.acerto().frase);
  assert.ok(new Set(frases.filter((f) => !f.startsWith('seguidas'))).size > 1);
  for (let i = 1; i < frases.length; i += 1) assert.notStrictEqual(frases[i], frases[i - 1]);
});
