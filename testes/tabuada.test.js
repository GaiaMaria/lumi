// Testes das contas da tabuada (js/tabuada.js). As contas são do código, nunca da IA.
// Rodar com: node --test testes/
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function carregar() {
  const elementoFalso = () => ({
    style: {}, hidden: false, dataset: {}, classList: { add() {}, remove() {}, toggle() {} },
    setAttribute() {}, addEventListener() {}, replaceChildren() {}, append() {}, focus() {}, select() {},
  });
  const contexto = {
    document: { getElementById: elementoFalso, createElement: elementoFalso, querySelectorAll: () => [] },
    window: { scrollTo() {} },
    setTimeout, clearTimeout, setInterval, clearInterval,
  };
  vm.createContext(contexto);
  const codigo = fs.readFileSync(path.join(__dirname, '..', 'js', 'tabuada.js'), 'utf8');
  vm.runInContext(`${codigo}\nthis.ContasTabuada = ContasTabuada;`, contexto);
  return contexto.ContasTabuada;
}

const Contas = carregar();

test('número que falta: 10 contas de 1 a 10, sem repetir, com uma lacuna', () => {
  for (let vez = 0; vez < 50; vez += 1) {
    const contas = Contas.gerarFalta();
    assert.strictEqual(contas.length, 10);
    assert.strictEqual(new Set(contas.map((c) => `${c.a}x${c.b}`)).size, 10);
    contas.forEach((c) => {
      assert.ok(c.a >= 1 && c.a <= 10 && c.b >= 1 && c.b <= 10);
      assert.ok(['a', 'b'].includes(c.falta));
      assert.strictEqual((Contas.texto(c).match(/___/g) || []).length, 1);
    });
  }
});

test('número que falta: confere o fator, não o produto', () => {
  const c = { a: 7, b: 8, falta: 'b' };
  assert.strictEqual(Contas.texto(c), '7 × ___ = 56');
  assert.strictEqual(Contas.conferir(c, '8'), 'certa');
  assert.strictEqual(Contas.conferir(c, '56'), 'errada');
  const d = { a: 7, b: 8, falta: 'a' };
  assert.strictEqual(Contas.texto(d), '___ × 8 = 56');
  assert.strictEqual(Contas.conferir(d, '7'), 'certa');
});

test('tabuada de um número: n × 1 até n × 10, em ordem', () => {
  const contas = Contas.gerarNumero(7);
  assert.deepStrictEqual(Array.from(contas, (c) => Contas.texto(c)), [
    '7 × 1 = ___', '7 × 2 = ___', '7 × 3 = ___', '7 × 4 = ___', '7 × 5 = ___',
    '7 × 6 = ___', '7 × 7 = ___', '7 × 8 = ___', '7 × 9 = ___', '7 × 10 = ___',
  ]);
  assert.strictEqual(Contas.conferir(contas[7], '56'), 'certa');
});

test('desafio: 10 contas do 2 ao 9, sem repetir', () => {
  for (let vez = 0; vez < 50; vez += 1) {
    const contas = Contas.gerarDesafio();
    assert.strictEqual(contas.length, 10);
    assert.strictEqual(new Set(contas.map((c) => `${c.a}x${c.b}`)).size, 10);
    contas.forEach((c) => assert.ok(c.a >= 2 && c.a <= 9 && c.b >= 2 && c.b <= 9));
  }
});

test('revisão: usa as contas erradas guardadas', () => {
  const contas = Contas.gerarRevisao([{ a: 6, b: 7 }, { a: 8, b: 9 }]);
  assert.deepStrictEqual(Array.from(contas, (c) => Contas.completa(c)), ['6 × 7 = 42', '8 × 9 = 72']);
});

test('respostas certas, erradas, em branco e inválidas', () => {
  const c = { a: 9, b: 9, falta: 'produto' };
  assert.strictEqual(Contas.conferir(c, '81'), 'certa');
  assert.strictEqual(Contas.conferir(c, ' 81 '), 'certa');
  assert.strictEqual(Contas.conferir(c, '72'), 'errada');
  assert.strictEqual(Contas.conferir(c, ''), 'vazia');
  assert.strictEqual(Contas.conferir(c, '   '), 'vazia');
  assert.strictEqual(Contas.conferir(c, undefined), 'vazia');
  assert.strictEqual(Contas.conferir(c, 'oitenta'), 'invalida');
  assert.strictEqual(Contas.conferir(c, '-81'), 'invalida');
  assert.strictEqual(Contas.conferir(c, '8,1'), 'invalida');
});

test('conta completa mostrada depois do erro', () => {
  assert.strictEqual(Contas.completa({ a: 6, b: 8, falta: 'b' }), '6 × 8 = 48');
});
