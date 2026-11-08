// Testes do teleprompter e do tempo estimado (js/narracao.js).
// Rodar com: node --test testes/
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function carregar() {
  const elementoFalso = () => ({ hidden: false, style: {}, textContent: '', addEventListener() {}, setAttribute() {} });
  const contexto = {
    document: { getElementById: elementoFalso, createElement: elementoFalso },
    window: {},
    Voz: { aoVerificar() {}, disponivel: () => true },
    Familia: { vozDigital: () => null },
    setTimeout, clearTimeout, setInterval, clearInterval,
  };
  vm.createContext(contexto);
  const codigo = fs.readFileSync(path.join(__dirname, '..', 'js', 'narracao.js'), 'utf8');
  vm.runInContext(`${codigo}\nthis.TextoNarrado = TextoNarrado; this.LIMITE = LIMITE_NARRACOES_POR_DIA;`, contexto);
  return contexto;
}

const { TextoNarrado, LIMITE } = carregar();

// Alinhamento falso: cada caractere dura 0,1 s.
function alinhar(texto) {
  const caracteres = [...texto];
  return {
    caracteres,
    inicios: caracteres.map((_, i) => i * 0.1),
    fins: caracteres.map((_, i) => (i + 1) * 0.1),
  };
}

test('limite de narrações por dia é 5', () => {
  assert.strictEqual(LIMITE, 5);
});

test('tempo estimado cresce com o número de caracteres', () => {
  assert.ok(TextoNarrado.estimativaSegundos(300) > TextoNarrado.estimativaSegundos(100));
  assert.strictEqual(TextoNarrado.estimativaSegundos(300), 19);
});

test('palavras e linhas curtas, sem perder nenhuma palavra', () => {
  const texto = 'A água que você bebe hoje já pode ter sido nuvem, chuva e até gelo muitas vezes.';
  const palavras = TextoNarrado.palavras(texto);
  const linhas = TextoNarrado.linhas(palavras);
  assert.strictEqual(linhas.flat().length, palavras.length);
  linhas.forEach((linha) => {
    const tamanho = linha.map((i) => palavras[i].palavra).join(' ').length;
    assert.ok(tamanho <= 22 || linha.length === 1, `linha longa: ${tamanho}`);
  });
});

test('tempo de cada palavra vem do alinhamento por caractere', () => {
  const texto = 'Oi Lumi';
  const tempos = TextoNarrado.tempos(texto, alinhar(texto));
  assert.deepStrictEqual(JSON.parse(JSON.stringify(tempos)), [
    { inicio: 0, fim: 0.2 },
    { inicio: 0.30000000000000004, fim: 0.7000000000000001 },
  ]);
  assert.strictEqual(TextoNarrado.palavraNoTempo(tempos, 0.05), 0);
  assert.strictEqual(TextoNarrado.palavraNoTempo(tempos, 0.45), 1);
});

test('alinhamento com espaços diferentes ainda acha as palavras', () => {
  const texto = 'Oi,  tudo bem?';
  const al = alinhar('Oi, tudo bem?'); // serviço com um espaço só
  const tempos = TextoNarrado.tempos(texto, al);
  assert.ok(tempos.every(Boolean));
});

test('sem alinhamento, nenhuma palavra recebe tempo (nada de estimar)', () => {
  const tempos = TextoNarrado.tempos('Oi Lumi', null);
  assert.strictEqual(tempos.filter(Boolean).length, 0);
  assert.strictEqual(TextoNarrado.palavraNoTempo(tempos, 5), -1);
});

test('posição do navegador (voz do aparelho) aponta a palavra certa', () => {
  const palavras = TextoNarrado.palavras('Cada acerto acende uma luz');
  assert.strictEqual(TextoNarrado.palavraNaPosicao(palavras, 0), 0);
  assert.strictEqual(TextoNarrado.palavraNaPosicao(palavras, 12), 2);
});
