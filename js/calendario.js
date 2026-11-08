// Provas: calendário mensal com as datas de prova da família, cartão do dia,
// Google Agenda (pelo servidor) e arquivo .ics. Sem bibliotecas externas.

// ---------- partes sem tela (testadas no Node) ----------

const DatasDeProva = (() => {
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

  const MATERIAS = {
    portugues: 'Português',
    matematica: 'Matemática',
    ciencias: 'Ciências',
    historia: 'História',
    geografia: 'Geografia',
    outra: 'Outra',
  };

  const dois = (n) => String(n).padStart(2, '0');

  function chaveDoDia(ano, mes, dia) {
    return `${ano}-${dois(mes + 1)}-${dois(dia)}`;
  }

  function hojeTexto(agora = new Date()) {
    return chaveDoDia(agora.getFullYear(), agora.getMonth(), agora.getDate());
  }

  // Semanas do mês (domingo a sábado). Dias fora do mês ficam como null.
  function grade(ano, mes) {
    const primeiro = new Date(ano, mes, 1).getDay();
    const total = new Date(ano, mes + 1, 0).getDate();
    const celulas = [];
    for (let i = 0; i < primeiro; i += 1) celulas.push(null);
    for (let d = 1; d <= total; d += 1) celulas.push(d);
    while (celulas.length % 7) celulas.push(null);
    const semanas = [];
    for (let i = 0; i < celulas.length; i += 7) semanas.push(celulas.slice(i, i + 7));
    return semanas;
  }

  function nomeDoMes(ano, mes) {
    const nome = MESES[mes];
    return `${nome.charAt(0).toUpperCase()}${nome.slice(1)} de ${ano}`;
  }

  function ordenar(lista) {
    return [...lista].sort((a, b) => `${a.data}T${a.hora}`.localeCompare(`${b.data}T${b.hora}`));
  }

  // Provas agrupadas por dia: { 'AAAA-MM-DD': [prova, ...] } (em ordem de horário).
  function porDia(lista) {
    const mapa = {};
    ordenar(lista).forEach((p) => {
      (mapa[p.data] = mapa[p.data] || []).push(p);
    });
    return mapa;
  }

  // Próxima prova a partir de agora (hoje conta se o horário ainda não passou).
  function proxima(lista, agora = new Date()) {
    const agoraTexto = `${hojeTexto(agora)}T${dois(agora.getHours())}:${dois(agora.getMinutes())}`;
    return ordenar(lista).find((p) => `${p.data}T${p.hora}` >= agoraTexto) || null;
  }

  // Título só com a matéria e o nome da prova (a mesma regra do servidor).
  // Se o nome já tem a matéria ("Prova de Matemática"), não repete.
  function titulo(prova) {
    const limpar = (t, max) => String(t || '').replace(/\s+/g, ' ').trim().slice(0, max);
    const materia = limpar(prova.materiaNome, 40);
    const nome = limpar(prova.nome, 60);
    return nome.toLowerCase().includes(materia.toLowerCase()) ? nome : `${materia} – ${nome}`;
  }

  // Quantos dias faltam até a data (AAAA-MM-DD), contando pelo calendário (0 = hoje).
  function diasAte(data, agora = new Date()) {
    const [a, m, d] = data.split('-').map(Number);
    const alvo = Date.UTC(a, m - 1, d);
    const hoje = Date.UTC(agora.getFullYear(), agora.getMonth(), agora.getDate());
    return Math.round((alvo - hoje) / 86400000);
  }

  // Texto do chip da próxima prova no Início: "Prova de Ciências em 4 dias".
  function textoProxima(prova, agora = new Date()) {
    const dias = diasAte(prova.data, agora);
    let quando = `em ${dias} dias`;
    if (dias <= 0) quando = 'hoje';
    else if (dias === 1) quando = 'amanhã';
    return `${prova.nome} ${quando}`;
  }

  function dataPorExtenso(data) {
    const [a, m, d] = data.split('-').map(Number);
    return `${d} de ${MESES[m - 1]} de ${a}`;
  }

  // ---------- arquivo .ics ----------

  function escaparIcs(texto) {
    return String(texto).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  }

  function horaIcs(data, hora) {
    return `${data.replace(/-/g, '')}T${hora.replace(':', '')}00`;
  }

  function somarUmaHora(data, hora) {
    const [a, m, d] = data.split('-').map(Number);
    const [h, min] = hora.split(':').map(Number);
    const fim = new Date(Date.UTC(a, m - 1, d, h + 1, min));
    return {
      data: `${fim.getUTCFullYear()}-${dois(fim.getUTCMonth() + 1)}-${dois(fim.getUTCDate())}`,
      hora: `${dois(fim.getUTCHours())}:${dois(fim.getUTCMinutes())}`,
    };
  }

  function eventoIcs(prova, carimbo) {
    const fim = somarUmaHora(prova.data, prova.hora);
    return [
      'BEGIN:VEVENT',
      `UID:${prova.id}@lumi`,
      `DTSTAMP:${carimbo}`,
      `DTSTART;TZID=America/Sao_Paulo:${horaIcs(prova.data, prova.hora)}`,
      `DTEND;TZID=America/Sao_Paulo:${horaIcs(fim.data, fim.hora)}`,
      `SUMMARY:${escaparIcs(titulo(prova))}`,
      'DESCRIPTION:Data de prova anotada no app Lumi.',
      'BEGIN:VALARM',
      'TRIGGER:-P1D',
      'ACTION:DISPLAY',
      'DESCRIPTION:Prova amanhã',
      'END:VALARM',
      'END:VEVENT',
    ];
  }

  // Arquivo .ics com uma prova ou com várias (lista).
  function gerarIcs(provaOuLista, agora = new Date()) {
    const lista = Array.isArray(provaOuLista) ? provaOuLista : [provaOuLista];
    const carimbo = agora.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Lumi//Datas de prova//PT-BR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VTIMEZONE',
      'TZID:America/Sao_Paulo',
      'BEGIN:STANDARD',
      'DTSTART:19700101T000000',
      'TZOFFSETFROM:-0300',
      'TZOFFSETTO:-0300',
      'TZNAME:-03',
      'END:STANDARD',
      'END:VTIMEZONE',
      ...ordenar(lista).flatMap((prova) => eventoIcs(prova, carimbo)),
      'END:VCALENDAR',
      '',
    ].join('\r\n');
  }

  return { MATERIAS, chaveDoDia, hojeTexto, grade, nomeDoMes, porDia, proxima, diasAte, textoProxima, titulo, dataPorExtenso, gerarIcs };
})();

// ---------- tela ----------

const Calendario = (() => {
  // Ícones das matérias em SVG (24 × 24, traço na cor da matéria).
  const ICONES = {
    portugues: '<path d="M4 20l1-4.5L15.5 5a2.1 2.1 0 0 1 3 0l.5.5a2.1 2.1 0 0 1 0 3L8.5 19z" fill="none" stroke-width="2" stroke-linejoin="round"/><path d="M13.5 7l3.5 3.5" fill="none" stroke-width="2" stroke-linecap="round"/>', // lápis
    matematica: '<rect x="2.5" y="8" width="19" height="8" rx="1.5" fill="none" stroke-width="2"/><path d="M6 8v3.5M9.5 8v2.5M13 8v3.5M16.5 8v2.5" fill="none" stroke-width="1.8" stroke-linecap="round"/>', // régua
    ciencias: '<circle cx="10" cy="10" r="6" fill="none" stroke-width="2.2"/><path d="M14.5 14.5L20 20" stroke-width="2.4" stroke-linecap="round"/>', // lupa
    geografia: '<circle cx="12" cy="12" r="8.5" fill="none" stroke-width="2"/><path d="M3.5 12h17M12 3.5c2.6 2.4 3.8 5.2 3.8 8.5s-1.2 6.1-3.8 8.5c-2.6-2.4-3.8-5.2-3.8-8.5S9.4 5.9 12 3.5z" fill="none" stroke-width="1.6"/>', // globo
    outra: '<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z" fill="none" stroke-width="2" stroke-linejoin="round"/><path d="M5 19l8-8" fill="none" stroke-width="1.8" stroke-linecap="round"/>', // folha
  };

  function chaveDoIcone(materia) {
    return ICONES[materia] ? materia : 'outra'; // História e Outra usam a folha
  }

  function icone(materia, tamanho = 16) {
    const chave = chaveDoIcone(materia);
    return `<svg class="icone-materia icone-materia--${chave}" viewBox="0 0 24 24" width="${tamanho}" height="${tamanho}" aria-hidden="true" focusable="false">${ICONES[chave]}</svg>`;
  }

  const $ = (id) => document.getElementById(id);
  const el = {
    mensagem: $('provas-mensagem'),
    titulo: $('provas-mes'),
    anterior: $('provas-anterior'),
    seguinte: $('provas-seguinte'),
    proxima: $('provas-proxima'),
    grade: $('provas-grade'),
    cartao: $('provas-cartao'),
    novaBotao: $('provas-nova'),
    formulario: $('provas-formulario'),
    materia: $('prova-materia'),
    outraCaixa: $('prova-outra-caixa'),
    outra: $('prova-outra'),
    data: $('prova-data'),
    hora: $('prova-hora'),
    cancelar: $('prova-cancelar'),
    desconectar: $('provas-desconectar'),
    seloGoogle: $('provas-google-conectado'),
    enviarTodas: $('provas-enviar-todas'),
    googleSituacao: $('provas-google-situacao'),
    googleEntrar: $('provas-google-entrar'),
    googleIcs: $('provas-google-ics'),
  };

  const CHAVE_PENDENTE = 'lumi.google.pendente';
  let acabouDeConectar = false; // para não entrar em loop logo depois do login
  const agora = new Date();
  let ano = agora.getFullYear();
  let mes = agora.getMonth();
  let diaAberto = null;

  function avisar(texto) {
    el.mensagem.textContent = texto || '';
    el.mensagem.hidden = !texto;
  }

  // ---------- calendário ----------

  function desenhar() {
    el.titulo.textContent = DatasDeProva.nomeDoMes(ano, mes);
    const mapa = DatasDeProva.porDia(Familia.provas());
    const hoje = DatasDeProva.hojeTexto();
    const linhas = DatasDeProva.grade(ano, mes).map((semana) => {
      const linha = document.createElement('div');
      linha.className = 'calendario__semana';
      linha.setAttribute('role', 'row');
      semana.forEach((dia) => {
        const celula = document.createElement(dia ? 'button' : 'span');
        celula.className = 'calendario__dia';
        celula.setAttribute('role', 'gridcell');
        if (!dia) {
          celula.classList.add('calendario__dia--vazio');
          linha.append(celula);
          return;
        }
        const chave = DatasDeProva.chaveDoDia(ano, mes, dia);
        const doDia = mapa[chave] || [];
        celula.type = 'button';
        celula.dataset.dia = chave;
        if (chave === hoje) celula.classList.add('calendario__dia--hoje');
        if (doDia.length) celula.classList.add('calendario__dia--prova');
        if (chave === diaAberto) celula.classList.add('calendario__dia--aberto');

        const numero = document.createElement('span');
        numero.className = 'calendario__numero';
        numero.textContent = dia;
        celula.append(numero);

        if (doDia.length) {
          const marcas = document.createElement('span');
          marcas.className = 'calendario__marcas';
          // Pequena luz com brilho na cor da primeira matéria + ícones (até 2).
          marcas.innerHTML = `<span class="calendario__luz calendario__luz--${chaveDoIcone(doDia[0].materia)}"></span>${doDia.slice(0, 2).map((p) => icone(p.materia, 14)).join('')}${doDia.length > 2 ? `<span class="calendario__mais">+${doDia.length - 2}</span>` : ''}`;
          celula.append(marcas);
        }
        const descricao = doDia.length ? `, ${doDia.length === 1 ? '1 prova' : `${doDia.length} provas`}` : '';
        celula.setAttribute('aria-label', `${DatasDeProva.dataPorExtenso(chave)}${chave === hoje ? ', hoje' : ''}${descricao}`);
        celula.addEventListener('click', () => tocarDia(chave, doDia.length));
        linha.append(celula);
      });
      return linha;
    });
    el.grade.replaceChildren(...linhas);
    el.proxima.disabled = !DatasDeProva.proxima(Familia.provas());
    atualizarBotaoTodas();
  }

  function irPara(novoAno, novoMes) {
    const data = new Date(novoAno, novoMes, 1);
    ano = data.getFullYear();
    mes = data.getMonth();
    desenhar();
  }

  function tocarDia(chave, quantas) {
    if (quantas) {
      abrirCartao(chave);
    } else {
      // Dia sem prova: abre o formulário com o dia já escolhido.
      fecharCartao();
      abrirFormulario(chave);
    }
  }

  // ---------- cartão do dia ----------

  function fecharCartao() {
    diaAberto = null;
    el.cartao.hidden = true;
    el.cartao.replaceChildren();
  }

  function botao(texto, classe, aoClicar) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = classe;
    b.textContent = texto;
    b.addEventListener('click', aoClicar);
    return b;
  }

  function abrirCartao(chave) {
    diaAberto = chave;
    const doDia = DatasDeProva.porDia(Familia.provas())[chave] || [];
    if (!doDia.length) {
      fecharCartao();
      desenhar();
      return;
    }
    const titulo = document.createElement('h2');
    titulo.className = 'cartao-prova__dia';
    titulo.textContent = DatasDeProva.dataPorExtenso(chave);

    const itens = doDia.map((prova) => {
      const item = document.createElement('article');
      item.className = `cartao-prova cartao-prova--${chaveDoIcone(prova.materia)}`;

      const cabeca = document.createElement('div');
      cabeca.className = 'cartao-prova__cabeca';
      const marca = document.createElement('span');
      marca.className = 'cartao-prova__icone';
      marca.innerHTML = icone(prova.materia, 22);
      const textos = document.createElement('div');
      const nome = document.createElement('h3');
      nome.className = 'cartao-prova__nome';
      nome.textContent = prova.nome;
      const detalhe = document.createElement('p');
      detalhe.className = 'cartao-prova__detalhe';
      detalhe.textContent = `${prova.materiaNome} · ${prova.hora}${prova.noGoogle ? ' · no Google Agenda' : ''}`;
      textos.append(nome, detalhe);
      cabeca.append(marca, textos);

      const acoes = document.createElement('div');
      acoes.className = 'cartao-prova__acoes';
      acoes.append(
        botao('Baixar .ics', 'botao-secundario botao-pequeno', () => baixarIcs(prova)),
        botao('Remover', 'botao-apagar', () => remover(prova)),
      );

      item.append(cabeca, acoes);
      return item;
    });

    el.cartao.replaceChildren(titulo, ...itens);
    el.cartao.hidden = false;
    desenhar();
    el.cartao.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function remover(prova) {
    if (!window.confirm(`Remover a prova "${prova.nome}"?`)) return;
    Familia.removerProva(prova.id);
    abrirCartao(prova.data);
  }

  // ---------- Google Agenda e .ics ----------

  function baixarArquivo(conteudo, nomeDoArquivo) {
    const blob = new Blob([conteudo], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nomeDoArquivo;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function baixarIcs(prova) {
    baixarArquivo(DatasDeProva.gerarIcs(prova), `prova-${prova.data}.ics`);
  }

  function baixarIcsDeTodas() {
    const lista = Familia.provas();
    if (lista.length) baixarArquivo(DatasDeProva.gerarIcs(lista), 'provas-lumi.ics');
  }

  // Situação do Google no servidor (sem segredos). null se não houver resposta.
  async function estadoDoGoogle() {
    try {
      const resposta = await fetch('/api/google/estado', { cache: 'no-store' });
      return resposta.ok ? await resposta.json() : null;
    } catch (erro) {
      return null;
    }
  }

  // Selo "Google Agenda conectado": só aparece quando o servidor confirma a conexão.
  async function atualizarSeloGoogle() {
    if (Vitrine.ativa()) return; // o Google Agenda não funciona dentro da landing
    const estado = await estadoDoGoogle();
    el.seloGoogle.hidden = !(estado && estado.conectado);
  }

  // O Google sempre volta para um endereço fixo. Se o app estiver aberto por outro
  // (por exemplo, o endereço de um deploy), o login não "pega": avisa em vez de entrar em loop.
  function avisoDeEndereco(endereco) {
    return `Para conectar o Google Agenda, abra o app por este endereço: ${endereco}`;
  }

  // Área do botão único: mensagem e, quando preciso, "Entrar com Google" e o .ics de todas.
  function mostrarSituacao(texto, { login = false, ics = false } = {}) {
    el.googleSituacao.textContent = texto || '';
    el.googleSituacao.hidden = !texto;
    el.googleEntrar.hidden = !login;
    el.googleIcs.hidden = !ics;
  }

  function atualizarBotaoTodas() {
    const lista = Familia.provas();
    const faltam = lista.filter((p) => !p.noGoogle).length;
    el.enviarTodas.disabled = faltam === 0;
    if (!lista.length) el.enviarTodas.textContent = 'Enviar todas as provas para o Google Agenda';
    else if (faltam) el.enviarTodas.textContent = `Enviar ${faltam === 1 ? '1 prova' : `${faltam} provas`} para o Google Agenda`;
    else el.enviarTodas.textContent = 'Todas as provas já estão no Google Agenda';
  }

  async function entrarNoGoogle() {
    const estado = await estadoDoGoogle();
    if (estado && !estado.configurado) {
      mostrarSituacao('O Google Agenda ainda não está configurado neste app. Você pode baixar o arquivo .ics com todas as provas.', { ics: true });
      return;
    }
    if (estado && estado.enderecoDoRetorno && estado.enderecoDoRetorno !== window.location.origin) {
      mostrarSituacao(avisoDeEndereco(estado.enderecoDoRetorno));
      return;
    }
    try {
      sessionStorage.setItem(CHAVE_PENDENTE, 'todas'); // para enviar as provas na volta
    } catch (erro) {
      // segue sem lembrar
    }
    window.location.assign('/api/google/login');
  }

  // Envia de uma vez todas as provas que ainda não estão no Google Agenda.
  async function enviarTodas() {
    if (Vitrine.ativa()) return;
    const pendentes = Familia.provas().filter((p) => !p.noGoogle);
    if (!pendentes.length) {
      mostrarSituacao(Familia.provas().length ? 'Todas as provas já estão no Google Agenda.' : 'Adicione uma prova antes de enviar.');
      return;
    }
    el.enviarTodas.disabled = true;
    mostrarSituacao(`Enviando ${pendentes.length === 1 ? '1 prova' : `${pendentes.length} provas`} para o Google Agenda...`);

    let resposta = null;
    let dados = null;
    try {
      resposta = await fetch('/api/google/criar-eventos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provas: pendentes.map((p) => ({ id: p.id, materia: p.materiaNome, nome: p.nome, data: p.data, hora: p.hora })),
        }),
      });
      dados = await resposta.json().catch(() => null);
    } catch (erro) {
      resposta = null;
    }

    // Marca as que foram criadas (mesmo se depois houver falha).
    const criadas = dados && Array.isArray(dados.resultados) ? dados.resultados.filter((r) => r.criado) : [];
    criadas.forEach((r) => Familia.marcarProvaNoGoogle(r.id));
    desenhar();
    if (diaAberto) abrirCartao(diaAberto);

    if (resposta && resposta.ok && dados && dados.criados === dados.total) {
      acabouDeConectar = false;
      mostrarSituacao(`Pronto! ${dados.criados === 1 ? '1 prova foi enviada' : `${dados.criados} provas foram enviadas`} para o Google Agenda.`);
      return;
    }
    if (resposta && resposta.ok && dados) {
      mostrarSituacao(`${dados.criados} de ${dados.total} provas foram enviadas. As outras falharam. Você pode tentar de novo ou baixar o arquivo .ics com todas as provas.`, { ics: true });
      return;
    }
    if (resposta && resposta.status === 401) {
      if (acabouDeConectar) {
        // O login acabou de dar certo, mas o acesso não chegou: evita o loop e explica.
        acabouDeConectar = false;
        const estado = await estadoDoGoogle();
        const texto = estado && estado.enderecoDoRetorno && estado.enderecoDoRetorno !== window.location.origin
          ? avisoDeEndereco(estado.enderecoDoRetorno)
          : 'O login no Google foi feito, mas este navegador não guardou o acesso. Confira se os cookies estão permitidos para este site e tente de novo. Você também pode baixar o arquivo .ics com todas as provas.';
        mostrarSituacao(texto, { ics: true });
        return;
      }
      mostrarSituacao(dados && dados.motivo === 'revogado'
        ? 'O acesso ao Google Agenda expirou ou foi cancelado. Entre de novo com a sua conta Google.'
        : 'Para enviar as provas, entre primeiro com a sua conta Google.', { login: true, ics: true });
      return;
    }
    const motivo = dados && dados.mensagem ? `${dados.mensagem} ` : '';
    mostrarSituacao(`Não consegui enviar ao Google Agenda. ${motivo}Você pode baixar o arquivo .ics com todas as provas e abrir na sua agenda.`, { ics: true });
  }

  // Volta do login do Google (?google=...): mostra o resultado e envia as provas pendentes.
  function aoVoltarDoGoogle() {
    const parametros = new URLSearchParams(window.location.search);
    const resultado = parametros.get('google');
    if (!resultado) return;
    // Código curto do motivo (sem segredos), para entender uma falha.
    const motivo = (parametros.get('motivo') || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 40);
    parametros.delete('google');
    parametros.delete('motivo');
    const busca = parametros.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${busca ? `?${busca}` : ''}${window.location.hash}`);

    let pendente = null;
    try {
      pendente = sessionStorage.getItem(CHAVE_PENDENTE);
      sessionStorage.removeItem(CHAVE_PENDENTE);
    } catch (erro) {
      pendente = null;
    }

    App.mostrarTela('provas');
    const textos = {
      conectado: 'Google Agenda conectado.',
      cancelado: 'O login no Google foi cancelado. Nada foi enviado. Você pode baixar o arquivo .ics com todas as provas.',
      sem_permissao: 'Para enviar as provas, permita o acesso à agenda na tela do Google.',
      nao_configurado: 'O Google Agenda ainda não está configurado neste app. Você pode baixar o arquivo .ics com todas as provas.',
      erro: 'Não consegui conectar ao Google agora. Tente de novo ou baixe o arquivo .ics com todas as provas.',
      outro_endereco: 'O login no Google começou num endereço diferente do app. Abra o app pelo endereço desta página e tente de novo.',
    };
    const texto = `${textos[resultado] || textos.erro}${motivo ? ` (código: ${motivo})` : ''}`;
    if (resultado === 'conectado') {
      acabouDeConectar = true;
      mostrarSituacao(texto);
      if (pendente) enviarTodas();
    } else {
      mostrarSituacao(texto, { login: resultado !== 'cancelado' && resultado !== 'nao_configurado', ics: true });
    }
  }

  async function desconectarGoogle({ silencioso = false } = {}) {
    try {
      await fetch('/api/google/desconectar', { method: 'POST' });
      el.seloGoogle.hidden = true;
      if (!silencioso) avisar('Google Agenda desconectado. O acesso foi cancelado no Google.');
    } catch (erro) {
      if (!silencioso) avisar('Não consegui desconectar agora. Tente de novo.');
    }
  }

  // ---------- formulário ----------

  function abrirFormulario(data = '') {
    el.formulario.hidden = false;
    el.novaBotao.hidden = true;
    el.formulario.reset();
    el.outraCaixa.hidden = true;
    el.data.value = data || DatasDeProva.hojeTexto();
    el.materia.focus();
  }

  function fecharFormulario() {
    el.formulario.hidden = true;
    el.novaBotao.hidden = false;
  }

  el.materia.addEventListener('change', () => {
    el.outraCaixa.hidden = el.materia.value !== 'outra';
    if (el.materia.value === 'outra') el.outra.focus();
  });

  el.formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();
    // Basta escolher a matéria: o nome da prova é "Prova de <matéria>".
    // Em "Outra", a família escreve qual é a prova.
    const materia = el.materia.value;
    const materiaNome = materia === 'outra'
      ? el.outra.value.replace(/\s+/g, ' ').trim()
      : DatasDeProva.MATERIAS[materia];
    const data = el.data.value;
    const hora = el.hora.value;
    if (!materia) {
      avisar('Escolha de qual matéria é a prova.');
      el.materia.focus();
      return;
    }
    if (!materiaNome) {
      avisar('Escreva qual é a prova.');
      el.outra.focus();
      return;
    }
    if (!data || !hora) {
      avisar('Escolha o dia e o horário da prova.');
      return;
    }
    const nome = `Prova de ${materiaNome}`;
    const prova = Familia.salvarProva({ nome, materia, materiaNome, data, hora });
    avisar('');
    fecharFormulario();
    const [a, m] = data.split('-').map(Number);
    irPara(a, m - 1);
    abrirCartao(prova.data);
  });

  el.cancelar.addEventListener('click', fecharFormulario);
  el.novaBotao.addEventListener('click', () => { fecharCartao(); abrirFormulario(); });
  el.anterior.addEventListener('click', () => { fecharCartao(); irPara(ano, mes - 1); });
  el.seguinte.addEventListener('click', () => { fecharCartao(); irPara(ano, mes + 1); });
  el.proxima.addEventListener('click', () => {
    const prova = DatasDeProva.proxima(Familia.provas());
    if (!prova) return;
    const [a, m] = prova.data.split('-').map(Number);
    irPara(a, m - 1);
    abrirCartao(prova.data);
  });
  el.desconectar.addEventListener('click', () => desconectarGoogle());
  el.enviarTodas.addEventListener('click', enviarTodas);
  el.googleEntrar.addEventListener('click', entrarNoGoogle);
  el.googleIcs.addEventListener('click', baixarIcsDeTodas);

  function abrir() {
    avisar('');
    mostrarSituacao('');
    fecharFormulario();
    fecharCartao();
    const hoje = new Date();
    irPara(hoje.getFullYear(), hoje.getMonth());
    atualizarSeloGoogle();
  }

  return { abrir, aoVoltarDoGoogle, desconectarGoogle };
})();
