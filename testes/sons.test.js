// Testes dos sons do app (js/sons.js): duração curta, ligar/desligar,
// frase da família só depois do som e silêncio durante a leitura em voz alta.
// Rodar com: node --test testes/
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Áudio falso: registra quantas notas foram tocadas.
function carregar({ falando = false, ativo = true, familia = null } = {}) {
  const registro = { notas: 0, vibrou: [], cliques: [] };
  const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const no = () => ({ connect(o) { return o; }, start() { registro.notas += 1; }, stop() {}, frequency: param(), gain: param(), Q: param() });
  class Contexto {
    constructor() { this.state = 'running'; this.currentTime = 0; this.sampleRate = 8000; this.destination = {}; }
    createOscillator() { return no(); }
    createGain() { return no(); }
    createBiquadFilter() { return no(); }
    createBufferSource() { return no(); }
    createBuffer(c, n) { return { getChannelData: () => new Float32Array(n) }; }
    resume() {}
  }
  const timers = [];
  const contexto = {
    window: { AudioContext: Contexto, speechSynthesis: { speaking: falando } },
    navigator: { userActivation: { hasBeenActive: ativo }, vibrate: (p) => registro.vibrou.push(p) },
    document: { addEventListener: (tipo, f) => registro.cliques.push(f), getElementById: () => null },
    setTimeout: (f, ms) => timers.push({ f, ms }),
    Date,
  };
  if (familia) contexto.Familia = familia;
  vm.createContext(contexto);
  const codigo = fs.readFileSync(path.join(__dirname, '..', 'js', 'sons.js'), 'utf8');
  vm.runInContext(`${codigo}\nthis.Sons = Sons;`, contexto);
  return { Sons: contexto.Sons, registro, timers };
}

test('sons: todos existem e são curtos (no máximo pouco mais de 1 segundo)', () => {
  const { Sons } = carregar();
  assert.strictEqual(Sons.NOMES.join(','), 'toque,tela,acerto,erro,sequencia,medalha,tique');
  Sons.NOMES.forEach((nome) => {
    assert.ok(Sons.duracao(nome) > 0 && Sons.duracao(nome) <= 1.1, nome);
  });
});

test('sons: a frase da família só toca quando o som termina', () => {
  const { Sons, registro, timers } = carregar();
  let chamou = false;
  assert.strictEqual(Sons.tocar('acerto', () => { chamou = true; }), true);
  assert.ok(registro.notas > 0);
  assert.strictEqual(chamou, false);
  assert.strictEqual(timers[0].ms, Math.round(Sons.duracao('acerto') * 1000));
  timers[0].f();
  assert.strictEqual(chamou, true);
  assert.strictEqual(JSON.stringify(registro.vibrou), '[15]');
});

test('sons: desligado pela família não toca e segue para a frase na hora', () => {
  let guardado = true;
  const familia = { som: () => guardado, definirSom: (v) => { guardado = v; } };
  const { Sons, registro } = carregar({ familia });
  Sons.definir(false);
  assert.strictEqual(guardado, false);
  let chamou = false;
  assert.strictEqual(Sons.tocar('medalha', () => { chamou = true; }), false);
  assert.strictEqual(chamou, true);
  assert.strictEqual(registro.notas, 0);
  Sons.definir(true);
  assert.strictEqual(Sons.tocar('medalha'), true);
});

test('sons: toque e troca de tela ficam quietos enquanto o app lê em voz alta', () => {
  const { Sons } = carregar({ falando: true });
  assert.strictEqual(Sons.tocar('toque'), false);
  assert.strictEqual(Sons.tocar('tela'), false);
  assert.strictEqual(Sons.tocar('acerto'), true);
});

test('sons: nada toca antes de a pessoa tocar na página', () => {
  const { Sons } = carregar({ ativo: false });
  assert.strictEqual(Sons.tocar('tela'), false);
});

test('sons: o toque do botão não repete logo depois de um acerto', () => {
  const { Sons } = carregar();
  assert.strictEqual(Sons.tocar('acerto'), true);
  assert.strictEqual(Sons.tocar('toque'), false);
});

test('sons: sequência em 3, 5, 10 e depois a cada 5 acertos seguidos', () => {
  const { Sons } = carregar();
  const nomes = [1, 2, 3, 4, 5, 6, 10, 12, 15].map((n) => Sons.deAcerto(n));
  assert.strictEqual(nomes.join(','), 'acerto,acerto,sequencia,acerto,sequencia,acerto,sequencia,acerto,sequencia');
});
