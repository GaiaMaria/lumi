// Testes da correção do quiz e das contas conferidas no código (js/quiz.js).
// Rodar com: node --test testes/
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Carrega js/quiz.js com uma página de mentira, só para ler Contas e Quiz.
function carregarQuiz() {
  const elementoFalso = () => ({
    style: {},
    hidden: false,
    setAttribute() {},
    addEventListener() {},
    replaceChildren() {},
    append() {},
    focus() {},
  });
  const contexto = {
    document: { getElementById: elementoFalso, createElement: elementoFalso },
    Pontos: { adicionar() {} },
    Option: function Option() {},
  };
  vm.createContext(contexto);
  const codigo = fs.readFileSync(path.join(__dirname, '..', 'js', 'quiz.js'), 'utf8');
  vm.runInContext(`${codigo}\nthis.Contas = Contas; this.Quiz = Quiz;`, contexto);
  return contexto;
}

const { Contas, Quiz } = carregarQuiz();

test('contas: calcula as quatro operações', () => {
  assert.strictEqual(Contas.resolver('Quanto é 7 × 8?').valor, 56);
  assert.strictEqual(Contas.resolver('Quanto é 7x8?').valor, 56);
  assert.strictEqual(Contas.resolver('12 + 5').valor, 17);
  assert.strictEqual(Contas.resolver('20 - 4').valor, 16);
  assert.strictEqual(Contas.resolver('20 ÷ 4').valor, 5);
  assert.strictEqual(Contas.resolver('20 : 4').valor, 5);
});

test('contas: não confunde datas e horas com contas', () => {
  assert.strictEqual(Contas.resolver('De 1500-1822 o Brasil foi colônia.'), null);
  assert.strictEqual(Contas.resolver('A aula começa às 10:30.'), null);
});

test('múltipla escolha de conta: o código corrige o gabarito errado da IA', () => {
  const [p] = Quiz.suportadas([{
    tipo: 'multipla_escolha',
    enunciado: 'Quanto é 7 × 8?',
    alternativas: ['54', '56', '58', '63', '64'],
    gabarito: 'a', // errado de propósito
    explicacao: '',
  }]);
  assert.strictEqual(p.gabarito, 'b');
});

test('múltipla escolha de conta sem a resposta certa: pergunta descartada', () => {
  const lista = Quiz.suportadas([{
    tipo: 'multipla_escolha',
    enunciado: 'Quanto é 9 × 9?',
    alternativas: ['72', '79', '80', '90', '99'],
    gabarito: 'c',
    explicacao: '',
  }]);
  assert.strictEqual(lista.length, 0);
});

test('verdadeiro ou falso de conta: o código decide', () => {
  const [certo, errado] = Quiz.suportadas([
    { tipo: 'verdadeiro_falso', enunciado: '6 × 7 = 42', gabarito: false, explicacao: '' },
    { tipo: 'verdadeiro_falso', enunciado: '6 × 7 = 48', gabarito: true, explicacao: '' },
  ]);
  assert.strictEqual(certo.gabarito, true);
  assert.strictEqual(errado.gabarito, false);
});

test('relacionar com conta errada: pergunta descartada', () => {
  const lista = Quiz.suportadas([{
    tipo: 'relacionar',
    enunciado: 'Ligue a conta ao resultado',
    pares: [{ item: '3 × 4', par: '12' }, { item: '5 × 5', par: '30' }, { item: '2 × 9', par: '18' }],
    explicacao: '',
  }]);
  assert.strictEqual(lista.length, 0);
});

test('perguntas que não são de conta ficam como vieram', () => {
  const lista = Quiz.suportadas(Quiz.PERGUNTAS_DEMO);
  assert.strictEqual(lista.length, Quiz.PERGUNTAS_DEMO.length);
});

test('perguntas de exemplo cobrem os quatro tipos', () => {
  const tipos = new Set(Quiz.PERGUNTAS_DEMO.map((p) => p.tipo));
  assert.deepStrictEqual([...tipos].sort(), ['dissertativa', 'multipla_escolha', 'relacionar', 'verdadeiro_falso']);
});

test('formato inválido é descartado no navegador também', () => {
  const lista = Quiz.suportadas([
    { tipo: 'multipla_escolha', enunciado: 'x', alternativas: ['a', 'b'], gabarito: 'a' },
    { tipo: 'verdadeiro_falso', enunciado: 'x', gabarito: 'sim' },
    { tipo: 'dissertativa', enunciado: 'x' },
  ]);
  assert.strictEqual(lista.length, 0);
});
