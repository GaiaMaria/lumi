// Testes do modo vitrine (js/vitrine.js) e da separação dos dados (js/familia.js).
// Rodar com: node --test testes/
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ler = (arquivo) => fs.readFileSync(path.join(__dirname, '..', 'js', arquivo), 'utf8');

// Carrega vitrine.js e familia.js com um endereço e um localStorage falsos.
function carregar(busca) {
  const guardado = {};
  const localStorage = {
    getItem: (k) => (k in guardado ? guardado[k] : null),
    setItem: (k, v) => { guardado[k] = String(v); },
    removeItem: (k) => { delete guardado[k]; },
    key: (i) => Object.keys(guardado)[i] || null,
    get length() { return Object.keys(guardado).length; },
  };
  const contexto = {
    window: { location: { search: busca } },
    document: { body: { classList: { add() {} } } },
    localStorage,
    crypto: { randomUUID: () => 'id-ficticio', getRandomValues: (b) => b },
    URLSearchParams,
    Date,
    Intl,
    JSON,
    console,
  };
  contexto.window.crypto = contexto.crypto;
  vm.createContext(contexto);
  vm.runInContext(`${ler('vitrine.js')}\n${ler('familia.js')}\nthis.Vitrine = Vitrine; this.Familia = Familia;`, contexto);
  return { ...contexto, guardado };
}

test('vitrine: só liga com vitrine=1 no endereço', () => {
  const { Vitrine } = carregar('');
  assert.strictEqual(Vitrine.ativaNa('?vitrine=1'), true);
  assert.strictEqual(Vitrine.ativaNa('?vitrine=0'), false);
  assert.strictEqual(Vitrine.ativaNa('?google=conectado'), false);
  assert.strictEqual(Vitrine.ativaNa(''), false);
});

test('fora da vitrine, os dados ficam nas chaves de sempre', () => {
  const { Familia, guardado } = carregar('');
  Familia.adicionarPontos(10);
  assert.ok(Object.keys(guardado).some((k) => k === 'lumi.familia'));
  assert.ok(!Object.keys(guardado).some((k) => k.startsWith('lumi.vitrine')));
});

test('na vitrine, os dados ficam separados e não tocam a família de verdade', () => {
  const { Familia, guardado } = carregar('?vitrine=1');
  guardado['lumi.familia'] = 'familia-de-verdade';
  guardado['lumi.familia.familia-de-verdade'] = JSON.stringify({ versao: 1, pontos: 99, missoes: [] });
  assert.strictEqual(Familia.pontos(), 0);
  Familia.adicionarPontos(10);
  Familia.apagarTudo();
  assert.strictEqual(guardado['lumi.familia'], 'familia-de-verdade');
  assert.strictEqual(JSON.parse(guardado['lumi.familia.familia-de-verdade']).pontos, 99);
});
