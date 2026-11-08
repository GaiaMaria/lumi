// Testes das datas de prova (js/calendario.js): grade do mês, próxima prova e arquivo .ics.
// Rodar com: node --test testes/
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function carregar() {
  const elementoFalso = () => ({ hidden: false, addEventListener() {}, replaceChildren() {}, setAttribute() {} });
  const contexto = {
    document: { getElementById: elementoFalso, createElement: elementoFalso },
    window: { location: { search: '' } },
    Date,
  };
  vm.createContext(contexto);
  const codigo = fs.readFileSync(path.join(__dirname, '..', 'js', 'calendario.js'), 'utf8');
  vm.runInContext(`${codigo}\nthis.DatasDeProva = DatasDeProva;`, contexto);
  return contexto.DatasDeProva;
}

const D = carregar();

const provas = [
  { id: 'a', nome: 'Frações', materia: 'matematica', materiaNome: 'Matemática', data: '2026-11-12', hora: '08:00' },
  { id: 'b', nome: 'Leitura', materia: 'portugues', materiaNome: 'Português', data: '2026-11-12', hora: '10:00' },
  { id: 'c', nome: 'Mapas', materia: 'geografia', materiaNome: 'Geografia', data: '2026-11-30', hora: '07:30' },
];

test('grade: novembro de 2026 começa no domingo e tem 30 dias em semanas de 7', () => {
  const semanas = D.grade(2026, 10);
  semanas.forEach((s) => assert.strictEqual(s.length, 7));
  assert.strictEqual(semanas[0][0], 1); // 1º de novembro de 2026 é domingo
  const dias = semanas.flat().filter(Boolean);
  assert.strictEqual(dias.length, 30);
  assert.strictEqual(dias[dias.length - 1], 30);
});

test('grade: fevereiro de 2028 (bissexto) tem 29 dias e começa na terça', () => {
  const semanas = D.grade(2028, 1);
  assert.deepStrictEqual(Array.from(semanas[0]).slice(0, 3), [null, null, 1]);
  assert.strictEqual(semanas.flat().filter(Boolean).length, 29);
});

test('nome do mês em português', () => {
  assert.strictEqual(D.nomeDoMes(2026, 10), 'Novembro de 2026');
});

test('provas por dia: duas no mesmo dia, em ordem de horário', () => {
  const mapa = D.porDia(provas);
  assert.deepStrictEqual(Array.from(mapa['2026-11-12'], (p) => p.id), ['a', 'b']);
  assert.strictEqual(mapa['2026-11-30'].length, 1);
});

test('próxima prova: a mais perto a partir de agora (hoje conta se o horário não passou)', () => {
  assert.strictEqual(D.proxima(provas, new Date(2026, 10, 8, 9, 0)).id, 'a');
  assert.strictEqual(D.proxima(provas, new Date(2026, 10, 12, 9, 0)).id, 'b');
  assert.strictEqual(D.proxima(provas, new Date(2026, 10, 13, 9, 0)).id, 'c');
  assert.strictEqual(D.proxima(provas, new Date(2026, 11, 1, 9, 0)), null);
});

test('título só com a matéria e o nome da prova', () => {
  assert.strictEqual(D.titulo(provas[0]), 'Matemática – Frações');
});

test('.ics: evento com fuso de Brasília, 1 hora, lembrete de 1 dia e texto escapado', () => {
  const ics = D.gerarIcs({ ...provas[2], nome: 'Mapas, rios; e capitais' }, new Date(Date.UTC(2026, 10, 8, 12, 0, 0)));
  assert.ok(ics.includes('\r\n'));
  assert.match(ics, /DTSTART;TZID=America\/Sao_Paulo:20261130T073000/);
  assert.match(ics, /DTEND;TZID=America\/Sao_Paulo:20261130T083000/);
  assert.match(ics, /SUMMARY:Geografia – Mapas\\, rios\\; e capitais/);
  assert.match(ics, /TRIGGER:-P1D/);
  assert.match(ics, /DTSTAMP:20261108T120000Z/);
});

test('.ics: prova às 23:30 termina no dia seguinte', () => {
  const ics = D.gerarIcs({ ...provas[2], hora: '23:30' });
  assert.match(ics, /DTEND;TZID=America\/Sao_Paulo:20261201T003000/);
});
