// Testes da trilha do Início (js/trilha.js): parada nova ou feita e seus textos.
// Rodar com: node --test testes/
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function carregar() {
  const contexto = { Intl, Date };
  vm.createContext(contexto);
  const codigo = fs.readFileSync(path.join(__dirname, '..', 'js', 'trilha.js'), 'utf8');
  vm.runInContext(`${codigo}\nthis.Trilha = Trilha;`, contexto);
  return contexto.Trilha;
}

const Trilha = carregar();

// Dados fictícios, no formato salvo por Familia.salvarMissao.
const base = {
  id: 'm1',
  disciplinaNome: 'Matemática',
  perguntas: [{}, {}, {}, {}, {}],
  criadaEm: new Date(2026, 10, 7, 10, 0).toISOString(),
  vezes: 0,
  melhorPontuacao: 0,
};

test('missão nunca jogada é uma parada nova, com "Começar"', () => {
  const p = Trilha.parada(base);
  assert.strictEqual(p.estado, 'nova');
  assert.strictEqual(p.nome, 'Matemática');
  assert.strictEqual(p.detalhe, 'nova · 5 perguntas · 07/11');
  assert.strictEqual(p.acao, 'Começar');
});

test('missão já jogada é uma parada feita, com a melhor pontuação', () => {
  const p = Trilha.parada({ ...base, vezes: 2, melhorPontuacao: 40 });
  assert.strictEqual(p.estado, 'feita');
  assert.strictEqual(p.detalhe, 'melhor: 40 pontos · 07/11');
  assert.strictEqual(p.acao, 'Estudar de novo');
});

test('melhor pontuação de 1 ponto fica no singular', () => {
  const p = Trilha.parada({ ...base, vezes: 1, melhorPontuacao: 1 });
  assert.strictEqual(p.detalhe, 'melhor: 1 ponto · 07/11');
});
