// Testes das regras do botão voltar (js/navegacao.js).
// Rodar com: node --test testes/
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function carregar() {
  const contexto = {};
  vm.createContext(contexto);
  const codigo = fs.readFileSync(path.join(__dirname, '..', 'js', 'navegacao.js'), 'utf8');
  vm.runInContext(`${codigo}\nthis.Navegacao = Navegacao;`, contexto);
  return contexto.Navegacao;
}

const Navegacao = carregar();

test('voltar de Provas: quem veio da trilha volta para a trilha', () => {
  assert.strictEqual(Navegacao.voltarDeProvas('inicio'), 'inicio');
});

test('voltar de Provas: quem veio da Área dos pais volta para a Área dos pais', () => {
  assert.strictEqual(Navegacao.voltarDeProvas('pais'), 'pais');
});

test('voltar de Provas: sem origem conhecida (volta do Google), vai para a Área dos pais', () => {
  assert.strictEqual(Navegacao.voltarDeProvas(null), 'pais');
  assert.strictEqual(Navegacao.voltarDeProvas('provas'), 'pais');
  assert.strictEqual(Navegacao.voltarDeProvas('quiz'), 'pais');
});
