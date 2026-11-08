// Testes do banco de curiosidades (data/curiosidades.json e js/curiosidades.js).
// Rodar com: node --test testes/
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const dados = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'curiosidades.json'), 'utf8'));

function carregar() {
  const armazenado = new Map();
  const contexto = {
    sessionStorage: { getItem: (k) => armazenado.get(k) ?? null, setItem: (k, v) => armazenado.set(k, String(v)) },
    fetch: async () => ({ ok: true, json: async () => JSON.parse(JSON.stringify(dados)) }),
    Promise,
  };
  vm.createContext(contexto);
  const codigo = fs.readFileSync(path.join(__dirname, '..', 'js', 'curiosidades.js'), 'utf8');
  vm.runInContext(`${codigo}\nthis.Curiosidades = Curiosidades; this.sortearCuriosidade = sortearCuriosidade; this.buscarCuriosidade = buscarCuriosidade;`, contexto);
  return contexto;
}

test('arquivo: 150 itens com id, tema e texto, ids únicos, todos com até 300 caracteres', () => {
  assert.strictEqual(dados.length, 150);
  assert.strictEqual(new Set(dados.map((c) => c.id)).size, 150);
  dados.forEach((c) => {
    assert.ok(Number.isInteger(c.id) && typeof c.tema === 'string' && typeof c.texto === 'string');
    assert.ok(c.texto.length <= 300, `id ${c.id}`);
  });
});

test('sortear 20 vezes: nunca repete o item imediatamente anterior', async () => {
  for (let rodada = 0; rodada < 25; rodada += 1) {
    const { sortearCuriosidade } = carregar();
    let anterior = null;
    for (let i = 0; i < 20; i += 1) {
      const item = await sortearCuriosidade();
      assert.ok(item);
      assert.notStrictEqual(item.id, anterior, `repetiu o id ${item.id}`);
      anterior = item.id;
    }
  }
});

test('sortear por tema: só itens do tema e sem repetir o anterior', async () => {
  const { sortearCuriosidade } = carregar();
  let anterior = null;
  for (let i = 0; i < 20; i += 1) {
    const item = await sortearCuriosidade('espaco');
    assert.strictEqual(item.tema, 'espaco');
    assert.notStrictEqual(item.id, anterior);
    anterior = item.id;
  }
});

test('sortear com o sorteio sempre no primeiro item ainda alterna', async () => {
  const { Curiosidades, sortearCuriosidade } = carregar();
  Curiosidades._definirSorteio(() => 0);
  const a = await sortearCuriosidade();
  const b = await sortearCuriosidade();
  const c = await sortearCuriosidade();
  assert.notStrictEqual(a.id, b.id);
  assert.notStrictEqual(b.id, c.id);
});

test('tema inexistente devolve null', async () => {
  const { sortearCuriosidade } = carregar();
  assert.strictEqual(await sortearCuriosidade('dinossauros'), null);
});

test('buscar por id devolve o item com o texto exato', async () => {
  const { buscarCuriosidade } = carregar();
  const item = await buscarCuriosidade(56);
  assert.strictEqual(item.tema, 'oceano');
  assert.strictEqual(item.texto, dados.find((c) => c.id === 56).texto);
  assert.strictEqual((await buscarCuriosidade('1')).id, 1);
  assert.strictEqual(await buscarCuriosidade(999), null);
});
