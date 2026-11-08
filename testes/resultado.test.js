// Testes da tela "Missão completa!" (js/resultado.js).
// Rodar com: node --test testes/
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function carregar() {
  const contexto = {};
  vm.createContext(contexto);
  const codigo = fs.readFileSync(path.join(__dirname, '..', 'js', 'resultado.js'), 'utf8');
  vm.runInContext(`${codigo}\nthis.Resultado = Resultado;`, contexto);
  return contexto.Resultado;
}

const Resultado = carregar();

test('cartões: missão nova mostra acertos e não mostra "sua melhor"', () => {
  const c = Resultado.cartoes({ acertosDePrimeira: 4, corrigiveis: 5, vezes: 1, melhorPontuacao: 40 });
  assert.strictEqual(c.acertos, '4/5');
  assert.strictEqual(c.melhor, null);
});

test('cartões: missão repetida mostra a melhor pontuação', () => {
  const c = Resultado.cartoes({ acertosDePrimeira: 3, corrigiveis: 5, vezes: 2, melhorPontuacao: 50 });
  assert.strictEqual(c.melhor, '50');
});

test('cartões: sem perguntas corrigíveis, não mostra acertos', () => {
  const c = Resultado.cartoes({ acertosDePrimeira: 0, corrigiveis: 0 });
  assert.strictEqual(c.acertos, null);
});

test('nível: mostra o próximo nível e quanto falta (singular e plural)', () => {
  assert.deepStrictEqual({ ...Resultado.textoNivel({ nivel: 3, faltam: 10 }) }, { titulo: 'Nível 3 → 4', faltam: 'faltam 10 pontos' });
  assert.strictEqual(Resultado.textoNivel({ nivel: 1, faltam: 1 }).faltam, 'falta 1 ponto');
});

test('fato da Dóris: só aparece se for o fato desta missão e houver narração', () => {
  const fato = 'A água vira nuvem.';
  assert.strictEqual(Resultado.mostrarFato({ fatoDaMissao: fato, fatoMaisRecente: fato, narracaoDisponivel: true }), true);
  assert.strictEqual(Resultado.mostrarFato({ fatoDaMissao: fato, fatoMaisRecente: fato, narracaoDisponivel: false }), false);
  assert.strictEqual(Resultado.mostrarFato({ fatoDaMissao: fato, fatoMaisRecente: 'Outro fato.', narracaoDisponivel: true }), false);
  assert.strictEqual(Resultado.mostrarFato({ fatoDaMissao: '', fatoMaisRecente: fato, narracaoDisponivel: true }), false);
  assert.strictEqual(Resultado.mostrarFato({ fatoDaMissao: fato, fatoMaisRecente: null, narracaoDisponivel: true }), false);
});
