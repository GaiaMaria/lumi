// Testes da tela de abertura (js/abertura.js): quando aparece e quando não aparece.
// Rodar com: node --test testes/
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Carrega o arquivo com um sessionStorage e um App falsos.
function carregar({ busca = '', guardado = {}, semStorage = false } = {}) {
  const telas = [];
  const sessionStorage = {
    getItem(chave) {
      if (semStorage) throw new Error('bloqueado');
      return chave in guardado ? guardado[chave] : null;
    },
    setItem(chave, valor) {
      if (semStorage) throw new Error('bloqueado');
      guardado[chave] = String(valor);
    },
  };
  const contexto = {
    window: { location: { search: busca } },
    sessionStorage,
    URLSearchParams,
    App: { mostrarTela: (nome) => telas.push(nome) },
  };
  vm.createContext(contexto);
  const codigo = fs.readFileSync(path.join(__dirname, '..', 'js', 'abertura.js'), 'utf8');
  vm.runInContext(`${codigo}\nthis.Abertura = Abertura;`, contexto);
  return { Abertura: contexto.Abertura, telas, guardado };
}

test('deveMostrar: primeira visita da aba mostra a abertura', () => {
  const { Abertura } = carregar();
  assert.strictEqual(Abertura.deveMostrar('', false), true);
});

test('deveMostrar: já vista nesta aba, vai direto ao Início', () => {
  const { Abertura } = carregar();
  assert.strictEqual(Abertura.deveMostrar('', true), false);
});

test('deveMostrar: na volta do login do Google, nunca mostra', () => {
  const { Abertura } = carregar();
  assert.strictEqual(Abertura.deveMostrar('?google=conectado', false), false);
  assert.strictEqual(Abertura.deveMostrar('?google=erro&motivo=invalid_client', false), false);
});

test('iniciar: primeira visita abre a abertura e guarda que já viu', () => {
  const { Abertura, telas, guardado } = carregar();
  Abertura.iniciar();
  assert.deepStrictEqual(telas, ['abertura']);
  assert.strictEqual(guardado[Abertura.CHAVE], '1');
});

test('iniciar: segunda vez na mesma aba não abre a abertura', () => {
  const { Abertura, telas } = carregar({ guardado: { 'lumi.abertura.vista': '1' } });
  Abertura.iniciar();
  assert.deepStrictEqual(telas, []);
});

test('iniciar: com ?google= não troca de tela (a volta do Google leva a Provas)', () => {
  const { Abertura, telas, guardado } = carregar({ busca: '?google=conectado' });
  Abertura.iniciar();
  assert.deepStrictEqual(telas, []);
  assert.strictEqual(guardado[Abertura.CHAVE], '1');
});

test('iniciar: sem sessionStorage, mostra a abertura sem dar erro', () => {
  const { Abertura, telas } = carregar({ semStorage: true });
  assert.doesNotThrow(() => Abertura.iniciar());
  assert.deepStrictEqual(telas, ['abertura']);
});
