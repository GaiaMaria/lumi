// Regras da lista de espera: validação, hashes e datas. Sem rede (testado no Node).
// Só dados de quem é responsável. Nada de nome, idade ou escola da criança.

const crypto = require('crypto');

const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
const ANOS = ['4', '5', '6', '7', 'outro'];
const PLANOS = ['gratuito', 'voz_familia', 'indefinido'];
const PLANOS_DE_CLIQUE = ['gratuito', 'voz_familia'];
const CAMPOS_DE_ORIGEM = ['utm_source', 'utm_medium', 'utm_campaign', 'ref'];
const LIMITE_POR_HORA = 5;
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function sha256(texto) {
  return crypto.createHash('sha256').update(String(texto)).digest('hex');
}

// Dia no horário de Brasília (AAAA-MM-DD).
function dia(agora = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(agora);
}

function texto(valor, max) {
  return typeof valor === 'string' ? valor.replace(/[\u0000-\u001f]/g, '').trim().slice(0, max) : '';
}

// Valida e limpa o pedido. Devolve { ok: true, lead } ou { ok: false, erro }.
// O UF só é obrigatório no formulário completo (o front exige); aqui vale se vier na lista.
function validar(corpo) {
  const c = corpo && typeof corpo === 'object' ? corpo : {};
  const email = texto(c.email, 254).toLowerCase();
  if (!EMAIL_VALIDO.test(email)) return { ok: false, erro: 'email' };
  if (c.consentimento !== true) return { ok: false, erro: 'consentimento' };

  const plano = PLANOS.includes(c.plano) ? c.plano : null;
  if (!plano) return { ok: false, erro: 'plano' };

  const uf = texto(c.uf, 2).toUpperCase();
  if (uf && !UFS.includes(uf)) return { ok: false, erro: 'uf' };

  const anos = Array.isArray(c.anos) ? [...new Set(c.anos.map(String))] : [];
  if (anos.some((ano) => !ANOS.includes(ano))) return { ok: false, erro: 'anos' };

  const whatsapp = String(c.whatsapp || '').replace(/\D/g, '');
  if (whatsapp && (whatsapp.length < 10 || whatsapp.length > 11)) return { ok: false, erro: 'whatsapp' };

  const origemBruta = c.origem && typeof c.origem === 'object' ? c.origem : {};
  const origem = {};
  CAMPOS_DE_ORIGEM.forEach((campo) => { origem[campo] = texto(origemBruta[campo], 60); });

  return { ok: true, lead: { email, plano, uf, anos, whatsapp, origem } };
}

// O campo escondido "site" só é preenchido por robôs.
function ehRobo(corpo) {
  return Boolean(corpo && typeof corpo === 'object' && texto(corpo.site, 200));
}

// IP só como hash, com sal que muda todo dia: nunca guardamos o IP puro.
function ipDoPedido(req) {
  const encaminhado = String((req.headers && req.headers['x-forwarded-for']) || '');
  return encaminhado.split(',')[0].trim() || (req.socket && req.socket.remoteAddress) || 'sem-ip';
}

function chaveDeLimite(ip, sal, agora = new Date()) {
  const hora = agora.toISOString().slice(0, 13);
  return `limite:${sha256(`${ip}|${sal}|${dia(agora)}`)}:${hora}`;
}

// ---------- resumo e CSV (api/leads-resumo.js) ----------

// Compara a chave sem vazar o tempo da comparação.
function chaveConfere(enviada, certa) {
  if (typeof enviada !== 'string' || typeof certa !== 'string' || !certa) return false;
  const a = crypto.createHash('sha256').update(enviada).digest();
  const b = crypto.createHash('sha256').update(certa).digest();
  return crypto.timingSafeEqual(a, b);
}

// Os últimos N dias (AAAA-MM-DD, horário de Brasília), do mais antigo para hoje.
function ultimosDias(n, agora = new Date()) {
  const dias = [];
  for (let i = n - 1; i >= 0; i -= 1) dias.push(dia(new Date(agora.getTime() - i * 86400000)));
  return dias;
}

function somar(mapa, chave) {
  mapa[chave] = (mapa[chave] || 0) + 1;
}

// Totais a partir dos leads guardados. leadsPorDia: { 'AAAA-MM-DD': n }.
function resumir(leads, cliques, leadsPorDia) {
  const porPlano = {};
  const porUf = {};
  const porAno = {};
  const porOrigem = {};
  leads.forEach((lead) => {
    somar(porPlano, lead.plano || 'indefinido');
    if (lead.uf) somar(porUf, lead.uf);
    String(lead.anos || '').split(',').filter(Boolean).forEach((ano) => somar(porAno, ano));
    somar(porOrigem, lead.utm_source || lead.ref || 'direto');
  });
  return { total: leads.length, porPlano, porUf, porAno, porOrigem, cliques, leadsPorDia };
}

const COLUNAS_CSV = ['criadoEm', 'email', 'plano', 'uf', 'anos', 'whatsapp', 'utm_source', 'utm_medium', 'utm_campaign', 'ref', 'consentimentoEm'];

// Célula do CSV: aspas quando preciso e proteção contra fórmula no Excel (=, +, -, @).
function celula(valor) {
  let texto = String(valor === undefined || valor === null ? '' : valor);
  if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
  return /[;"\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

// CSV para planilha: separador ";" e BOM, para o Excel em português abrir certo.
function paraCsv(leads) {
  const ordenados = [...leads].sort((a, b) => String(a.criadoEm).localeCompare(String(b.criadoEm)));
  const linhas = [COLUNAS_CSV.join(';'), ...ordenados.map((lead) => COLUNAS_CSV.map((c) => celula(lead[c])).join(';'))];
  return `﻿${linhas.join('\r\n')}\r\n`;
}

module.exports = {
  UFS, ANOS, PLANOS, PLANOS_DE_CLIQUE, CAMPOS_DE_ORIGEM, LIMITE_POR_HORA,
  sha256, dia, validar, ehRobo, ipDoPedido, chaveDeLimite,
  chaveConfere, ultimosDias, resumir, paraCsv,
};
