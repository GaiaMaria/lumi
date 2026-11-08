// Voz da família: grava a voz da responsável, cria a voz digital (ElevenLabs, pelo
// servidor) e narra o fato da missão estilo teleprompter, destacando a palavra falada
// pelo alinhamento por caractere que o serviço devolve (sem estimar tempo).
// Sem voz digital ou com falha no serviço, lê com a voz do aparelho.

// Limite de narrações com a voz digital por família, por dia. Único lugar desta constante.
const LIMITE_NARRACOES_POR_DIA = 5;

// ---------- partes sem tela (testadas no Node) ----------

const TextoNarrado = (() => {
  const LETRAS_POR_LINHA = 22; // cabe numa linha do celular (375 px)

  // Palavras com a posição de cada uma no texto: [{ palavra, inicio, fim }].
  function palavras(texto) {
    const lista = [];
    const busca = /\S+/g;
    let m = busca.exec(texto);
    while (m) {
      lista.push({ palavra: m[0], inicio: m.index, fim: m.index + m[0].length });
      m = busca.exec(texto);
    }
    return lista;
  }

  // Junta as palavras em linhas curtas: [[índices das palavras], ...].
  function linhas(listaDePalavras, letras = LETRAS_POR_LINHA) {
    const resultado = [];
    let atual = [];
    let tamanho = 0;
    listaDePalavras.forEach((p, i) => {
      const extra = atual.length ? 1 : 0;
      if (atual.length && tamanho + extra + p.palavra.length > letras) {
        resultado.push(atual);
        atual = [];
        tamanho = 0;
      }
      tamanho += (atual.length ? 1 : 0) + p.palavra.length;
      atual.push(i);
    });
    if (atual.length) resultado.push(atual);
    return resultado;
  }

  // Liga cada letra do texto à letra do alinhamento (pulando espaços).
  function mapaDeLetras(texto, caracteres) {
    const mapa = new Array(texto.length).fill(-1);
    let j = 0;
    for (let i = 0; i < texto.length; i += 1) {
      if (/\s/.test(texto[i])) {
        if (j < caracteres.length && /\s/.test(caracteres[j])) j += 1;
        continue;
      }
      while (j < caracteres.length && /\s/.test(caracteres[j])) j += 1;
      if (j < caracteres.length && caracteres[j].toLowerCase() === texto[i].toLowerCase()) {
        mapa[i] = j;
        j += 1;
      }
    }
    return mapa;
  }

  // Início e fim (em segundos) de cada palavra, vindos do alinhamento.
  // Palavra sem alinhamento fica com null (não é destacada; nada de estimar).
  function tempos(texto, alinhamento) {
    const lista = palavras(texto);
    if (!alinhamento || !Array.isArray(alinhamento.caracteres)) return lista.map(() => null);
    const mapa = mapaDeLetras(texto, alinhamento.caracteres);
    return lista.map((p) => {
      const primeira = mapa.slice(p.inicio, p.fim).find((k) => k >= 0);
      const ultima = [...mapa.slice(p.inicio, p.fim)].reverse().find((k) => k >= 0);
      if (primeira === undefined || ultima === undefined) return null;
      const inicio = Number(alinhamento.inicios[primeira]);
      const fim = Number(alinhamento.fins[ultima]);
      return Number.isFinite(inicio) && Number.isFinite(fim) ? { inicio, fim } : null;
    });
  }

  // Palavra sendo falada no instante t (índice), ou -1 antes da primeira.
  function palavraNoTempo(listaDeTempos, t) {
    let atual = -1;
    listaDeTempos.forEach((tempo, i) => {
      if (tempo && tempo.inicio <= t) atual = i;
    });
    return atual;
  }

  // Palavra que contém a posição (para o evento "boundary" da voz do aparelho).
  function palavraNaPosicao(listaDePalavras, posicao) {
    let atual = -1;
    listaDePalavras.forEach((p, i) => {
      if (p.inicio <= posicao) atual = i;
    });
    return atual;
  }

  // Tempo estimado (segundos) pelo número de caracteres do fato.
  function estimativaSegundos(caracteres) {
    return Math.round(4 + caracteres * 0.05);
  }

  return { palavras, linhas, tempos, palavraNoTempo, palavraNaPosicao, estimativaSegundos };
})();

// ---------- tela ----------

const Narracao = (() => {
  const DURACAO_MINIMA_MS = 30 * 1000;
  const DURACAO_MAXIMA_MS = 45 * 1000;
  const ESTIMATIVA_CRIAR_VOZ_S = 25;
  const BITS_AUDIO = 128000; // qualidade recomendada pela ElevenLabs; 45 s ficam bem abaixo do limite da Vercel

  const MENSAGENS = {
    vozDoAparelho: 'Não consegui usar a voz da sua família agora. Vou ler com a voz do aparelho.',
    negado: 'Para gravar sua voz, permita o uso do microfone nas configurações do navegador.',
    semSuporte: 'Seu navegador não permite gravar a voz. Tente pelo Chrome ou pelo Safari.',
    dentroDeApp: 'Você abriu o Lumi dentro de outro app (como WhatsApp ou Instagram). Para gravar sua voz, abra o link no Chrome ou no Safari.',
    semMicrofone: 'Não encontramos um microfone neste aparelho.',
    curta: 'A gravação ficou curta demais. Grave pelo menos 30 segundos lendo o texto.',
    marqueAceite: 'Marque a caixa de autorização para começar a gravar.',
    limite: `Hoje já foram ${LIMITE_NARRACOES_POR_DIA} narrações com a voz da família. Amanhã tem mais! Agora vou ler com a voz do aparelho.`,
    falhaGravar: 'Não consegui gravar agora. Tente de novo.',
  };

  const $ = (id) => document.getElementById(id);
  const el = {
    mensagem: $('narracao-mensagem'),
    blocoGravar: $('narracao-gravar'),
    semSuporte: $('narracao-sem-suporte'),
    areaGravacao: $('narracao-area-gravacao'),
    aceite: $('narracao-aceite'),
    cronometro: $('narracao-cronometro'),
    gravar: $('narracao-botao-gravar'),
    blocoEsperando: $('narracao-esperando'),
    esperandoTitulo: $('narracao-esperando-titulo'),
    progresso: $('narracao-progresso'),
    progressoBarra: $('narracao-progresso-barra'),
    tempo: $('narracao-tempo'),
    blocoOuvir: $('narracao-ouvir'),
    origem: $('narracao-origem'),
    teleprompter: $('narracao-teleprompter'),
    tocar: $('narracao-tocar'),
    tocarTexto: $('narracao-tocar-texto'),
    restantes: $('narracao-restantes'),
    outro: $('narracao-outro'),
    textoLivre: $('narracao-texto-livre'),
    contador: $('narracao-contador'),
    imagem: $('narracao-imagem'),
    imagemRotulo: $('narracao-imagem-rotulo'),
    lerTexto: $('narracao-ler-texto'),
    apagarVoz: $('narracao-apagar-voz'),
    regravar: $('narracao-regravar'),
    botaoInicio: $('botao-voz-familia'),
  };

  let gravacao = null; // { gravador, fluxo, inicio, relogio, contador, pedacos, tipo }
  let esperaRelogio = null;
  let narracao = null; // { texto, url, tempos, origem, comVozDigital }
  let audio = null;
  let quadro = null;
  let tocando = false;
  let palavrasNaTela = [];
  let linhasNaTela = [];

  // ---------- utilidades ----------

  function avisar(texto) {
    el.mensagem.textContent = texto || '';
    el.mensagem.hidden = !texto;
  }

  function mostrarBloco(qual) {
    el.blocoGravar.hidden = qual !== 'gravar';
    el.blocoEsperando.hidden = qual !== 'esperando';
    el.blocoOuvir.hidden = qual !== 'ouvir';
  }

  function textoCronometro(passou) {
    const falta = passou < DURACAO_MINIMA_MS ? ` (mínimo ${formatarTempo(DURACAO_MINIMA_MS)})` : '';
    return `${formatarTempo(passou)} de ${formatarTempo(DURACAO_MAXIMA_MS)}${falta}`;
  }

  function formatarTempo(ms) {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  function fatoAtual() {
    const fato = Familia.ultimoFato();
    if (fato) return { texto: fato.texto, origem: `Um fato da sua missão de ${fato.disciplinaNome}:` };
    return { texto: Quiz.FATO_DEMO, origem: 'Um fato de exemplo. Faça uma missão para ouvir um fato do seu caderno:' };
  }

  function atualizarRestantes() {
    const usadas = Familia.narracoesHoje();
    const restam = Math.max(0, LIMITE_NARRACOES_POR_DIA - usadas);
    el.restantes.textContent = Familia.vozDigital()
      ? `Narrações com a voz da família hoje: ${usadas} de ${LIMITE_NARRACOES_POR_DIA}${restam ? '' : ' (amanhã tem mais)'}.`
      : '';
    el.apagarVoz.hidden = !Familia.vozDigital();
    el.regravar.hidden = !Familia.vozDigital();
  }

  // Botão da tela inicial: aparece se houver voz em português no aparelho (para o plano B)
  // ou se a família já tem voz digital.
  function atualizarBotaoInicio() {
    if (!el.botaoInicio) return;
    el.botaoInicio.hidden = !(Voz.disponivel() || Familia.vozDigital());
  }

  // ---------- barra de progresso com tempo estimado ----------

  function esperar(titulo, segundos) {
    clearInterval(esperaRelogio);
    mostrarBloco('esperando');
    el.esperandoTitulo.textContent = titulo;
    const inicio = Date.now();
    const atualizar = () => {
      const passou = (Date.now() - inicio) / 1000;
      const porcentagem = Math.min(95, (passou / segundos) * 100);
      el.progressoBarra.style.width = `${porcentagem}%`;
      el.progresso.setAttribute('aria-valuenow', String(Math.round(porcentagem)));
      const faltam = Math.max(0, Math.ceil(segundos - passou));
      el.tempo.textContent = faltam > 0 ? `Tempo estimado: cerca de ${faltam} s` : 'Quase pronto...';
    };
    atualizar();
    esperaRelogio = setInterval(atualizar, 250);
  }

  function pararEspera() {
    clearInterval(esperaRelogio);
    esperaRelogio = null;
    el.progressoBarra.style.width = '100%';
    el.progresso.setAttribute('aria-valuenow', '100');
  }

  // ---------- teleprompter ----------

  // Antes de tocar: uma dica no lugar do texto (as linhas aparecem durante a leitura).
  function mostrarDica() {
    const dica = document.createElement('p');
    dica.className = 'teleprompter__dica';
    dica.textContent = 'Toque em Ouvir. As palavras aparecem aqui enquanto o fato é lido.';
    el.teleprompter.replaceChildren(dica);
  }

  function montarTeleprompter(texto) {
    const lista = TextoNarrado.palavras(texto);
    const grupos = TextoNarrado.linhas(lista);
    palavrasNaTela = [];
    linhasNaTela = grupos.map((indices) => {
      const linha = document.createElement('p');
      linha.className = 'teleprompter__linha teleprompter__linha--oculta';
      indices.forEach((i, posicao) => {
        const span = document.createElement('span');
        span.className = 'teleprompter__palavra';
        span.textContent = lista[i].palavra;
        palavrasNaTela[i] = { span, linha };
        linha.append(span);
        if (posicao < indices.length - 1) linha.append(' ');
      });
      return linha;
    });
    el.teleprompter.replaceChildren(...linhasNaTela);
  }

  function destacar(indice) {
    palavrasNaTela.forEach((p, i) => {
      if (!p) return;
      p.span.classList.toggle('teleprompter__palavra--falada', i < indice);
      p.span.classList.toggle('teleprompter__palavra--agora', i === indice);
      if (i <= indice) p.linha.classList.remove('teleprompter__linha--oculta');
    });
    const atual = palavrasNaTela[indice];
    if (atual) {
      linhasNaTela.forEach((linha) => linha.classList.toggle('teleprompter__linha--atual', linha === atual.linha));
      atual.linha.scrollIntoView({ block: 'nearest' });
    }
  }

  function mostrarTudo() {
    linhasNaTela.forEach((linha) => linha.classList.remove('teleprompter__linha--oculta', 'teleprompter__linha--atual'));
    palavrasNaTela.forEach((p) => p && p.span.classList.remove('teleprompter__palavra--agora'));
  }

  // ---------- tocar ----------

  function pararTudo() {
    cancelAnimationFrame(quadro);
    quadro = null;
    if (audio) {
      audio.pause();
      audio = null;
    }
    Voz.parar();
    tocando = false;
    el.tocarTexto.textContent = 'Ouvir';
  }

  function aoTerminar() {
    tocando = false;
    cancelAnimationFrame(quadro);
    el.tocarTexto.textContent = 'Ouvir de novo';
    mostrarTudo();
  }

  // Precisa ser chamado direto do toque (o celular exige para tocar som).
  function tocar() {
    if (!narracao) return;
    if (tocando) {
      pararTudo();
      mostrarTudo();
      return;
    }
    montarTeleprompter(narracao.texto);
    tocando = true;
    el.tocarTexto.textContent = 'Parar';

    if (narracao.url) {
      // Voz digital: destaque pelo alinhamento por caractere.
      audio = new Audio(narracao.url);
      const tempos = narracao.tempos;
      const passo = () => {
        if (!audio) return;
        destacar(TextoNarrado.palavraNoTempo(tempos, audio.currentTime));
        quadro = requestAnimationFrame(passo);
      };
      audio.addEventListener('ended', aoTerminar);
      audio.addEventListener('error', () => {
        avisar(MENSAGENS.vozDoAparelho);
        narracao.url = null;
        pararTudo();
        tocar();
      });
      audio.play().then(() => { quadro = requestAnimationFrame(passo); }).catch(() => {});
      return;
    }

    // Voz do aparelho: destaque pela posição que o navegador avisa a cada palavra.
    const lista = TextoNarrado.palavras(narracao.texto);
    let recebeuPosicao = false;
    const reserva = setTimeout(() => {
      if (!recebeuPosicao && tocando) mostrarTudo(); // navegador sem aviso de posição: mostra o texto inteiro
    }, 1200);
    Voz.falarComMarcacao(narracao.texto, (posicao) => {
      recebeuPosicao = true;
      destacar(TextoNarrado.palavraNaPosicao(lista, posicao));
    }).then(() => {
      clearTimeout(reserva);
      if (tocando) aoTerminar();
    });
  }

  function prepararOuvir({ texto, origem, url = null, alinhamento = null }) {
    if (narracao && narracao.url && narracao.url !== url) URL.revokeObjectURL(narracao.url);
    narracao = { texto, origem, url, tempos: TextoNarrado.tempos(texto, alinhamento) };
    el.origem.textContent = origem;
    mostrarDica();
    el.tocarTexto.textContent = 'Ouvir';
    atualizarRestantes();
    mostrarBloco('ouvir');
    el.tocar.focus();
  }

  // ---------- servidor ----------

  async function enviarJSON(url, metodo, corpo) {
    try {
      const resposta = await fetch(url, {
        method: metodo,
        headers: corpo ? { 'Content-Type': 'application/json' } : undefined,
        body: corpo ? JSON.stringify(corpo) : undefined,
      });
      const dados = await resposta.json().catch(() => null);
      return { ok: resposta.ok, status: resposta.status, dados };
    } catch (erro) {
      return { ok: false, status: 0, dados: null };
    }
  }

  function base64DoBlob(blob) {
    return new Promise((resolver, rejeitar) => {
      const leitor = new FileReader();
      leitor.onload = () => resolver(String(leitor.result).split(',')[1]);
      leitor.onerror = () => rejeitar(leitor.error);
      leitor.readAsDataURL(blob);
    });
  }

  // Gera a narração com a voz digital. Sem voz, no limite ou com falha, usa a voz do aparelho.
  // fato: { texto, origem }. Sem nada, usa o fato da última missão.
  async function gerarNarracao(fato = fatoAtual()) {
    const voz = Familia.vozDigital();

    if (!voz) {
      prepararOuvir(fato);
      return;
    }
    if (Familia.narracoesHoje() >= LIMITE_NARRACOES_POR_DIA) {
      avisar(MENSAGENS.limite);
      prepararOuvir(fato);
      return;
    }

    esperar('Preparando a narração com a voz da família...', TextoNarrado.estimativaSegundos(fato.texto.length));
    const resposta = await enviarJSON('/api/narrar', 'POST', { familia: Familia.id(), idVoz: voz.id, texto: fato.texto });
    pararEspera();

    if (!resposta.ok || !resposta.dados || typeof resposta.dados.audio !== 'string') {
      if (resposta.dados && resposta.dados.erro === 'voz_nao_encontrada') Familia.removerVozDigital();
      const detalhe = resposta.dados && resposta.dados.mensagem ? ` (${resposta.dados.mensagem})` : '';
      avisar(MENSAGENS.vozDoAparelho + detalhe);
      prepararOuvir(fato);
      return;
    }

    Familia.registrarNarracao();
    const bytes = Uint8Array.from(atob(resposta.dados.audio), (c) => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: resposta.dados.formato || 'audio/mpeg' }));
    avisar('');
    prepararOuvir({ texto: resposta.dados.texto || fato.texto, origem: fato.origem, url, alinhamento: resposta.dados.alinhamento });
  }

  async function criarVoz(blob) {
    esperar('Criando a voz digital da família...', ESTIMATIVA_CRIAR_VOZ_S);
    let audioBase64;
    try {
      audioBase64 = await base64DoBlob(blob);
    } catch (erro) {
      pararEspera();
      avisar(MENSAGENS.falhaGravar);
      mostrarBloco('gravar');
      return;
    }
    const resposta = await enviarJSON('/api/voz', 'POST', {
      familia: Familia.garantirId(),
      audio: audioBase64,
      tipo: blob.type,
    });
    pararEspera();

    if (resposta.ok && resposta.dados && typeof resposta.dados.idVoz === 'string') {
      Familia.salvarVozDigital(resposta.dados.idVoz);
      atualizarBotaoInicio();
      avisar('');
      await gerarNarracao();
      return;
    }

    // Falhou: explica (plano, permissão, gravação curta...) e lê com a voz do aparelho.
    const motivo = resposta.dados && resposta.dados.mensagem ? resposta.dados.mensagem : 'O serviço de voz não respondeu.';
    if (resposta.dados && resposta.dados.erro === 'muito_curta') {
      avisar(MENSAGENS.curta);
      mostrarBloco('gravar');
      return;
    }
    avisar(`${MENSAGENS.vozDoAparelho} ${motivo}`);
    prepararOuvir(fatoAtual());
  }

  // ---------- gravação (30 a 45 segundos) ----------

  async function comecarGravacao() {
    if (gravacao) {
      pararGravacao();
      return;
    }
    if (!el.aceite.checked) {
      avisar(MENSAGENS.marqueAceite);
      return;
    }
    avisar('');

    let fluxo;
    try {
      fluxo = await navigator.mediaDevices.getUserMedia({
        // Sem os filtros de chamada do navegador: eles achatam o timbre e a voz digital fica diferente.
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 },
      });
    } catch (erro) {
      if (erro && (erro.name === 'NotAllowedError' || erro.name === 'SecurityError')) avisar(MENSAGENS.negado);
      else if (erro && (erro.name === 'NotFoundError' || erro.name === 'OverconstrainedError')) avisar(MENSAGENS.semMicrofone);
      else avisar(MENSAGENS.falhaGravar);
      return;
    }

    const tipo = Voz.formatoGravacao();
    let gravador;
    try {
      gravador = new MediaRecorder(fluxo, tipo ? { mimeType: tipo, audioBitsPerSecond: BITS_AUDIO } : { audioBitsPerSecond: BITS_AUDIO });
    } catch (erro) {
      gravador = new MediaRecorder(fluxo);
    }

    const pedacos = [];
    gravador.addEventListener('dataavailable', (evento) => {
      if (evento.data && evento.data.size) pedacos.push(evento.data);
    });
    gravador.addEventListener('stop', () => {
      const atual = gravacao;
      gravacao = null;
      clearTimeout(atual.relogio);
      clearInterval(atual.contador);
      fluxo.getTracks().forEach((faixa) => faixa.stop());
      el.gravar.textContent = 'Começar a gravar';
      el.cronometro.hidden = true;
      if (atual.cancelada) return;
      const duracao = Date.now() - atual.inicio;
      const blob = new Blob(pedacos, { type: (gravador.mimeType || tipo || 'audio/webm').split(';')[0] });
      if (duracao < DURACAO_MINIMA_MS || !blob.size) {
        avisar(MENSAGENS.curta);
        return;
      }
      criarVoz(blob);
    });

    gravacao = {
      gravador,
      fluxo,
      inicio: Date.now(),
      cancelada: false,
      relogio: setTimeout(pararGravacao, DURACAO_MAXIMA_MS),
      contador: setInterval(() => {
        const passou = Date.now() - gravacao.inicio;
        el.cronometro.textContent = textoCronometro(passou);
      }, 250),
    };
    gravador.start();
    el.cronometro.hidden = false;
    el.cronometro.textContent = textoCronometro(0);
    el.gravar.textContent = 'Parar e criar a voz';
  }

  function pararGravacao({ cancelar = false } = {}) {
    if (!gravacao) return;
    gravacao.cancelada = cancelar;
    if (gravacao.gravador.state !== 'inactive') gravacao.gravador.stop();
  }

  // ---------- apagar a voz digital ----------

  // Apaga a voz digital no serviço e o ID no aparelho.
  // Devolve { ok, mensagem }. Sem voz guardada e sem servidor de voz, não há o que apagar.
  async function apagarVozDigital() {
    const familia = Familia.id();
    if (!familia) return { ok: true };
    const voz = Familia.vozDigital();
    const consulta = `familia=${encodeURIComponent(familia)}${voz ? `&voz=${encodeURIComponent(voz.id)}` : ''}`;
    const resposta = await enviarJSON(`/api/voz?${consulta}`, 'DELETE');
    if (resposta.ok) {
      Familia.removerVozDigital();
      return { ok: true };
    }
    if (!voz && [0, 404, 405, 501, 503].includes(resposta.status)) return { ok: true };
    return {
      ok: false,
      mensagem: 'Não consegui apagar a voz digital na ElevenLabs agora. Nada foi apagado. Tente de novo daqui a pouco.',
    };
  }

  // Gravar de novo: apaga a voz atual no serviço (uma voz por família) e volta para a gravação.
  el.regravar.addEventListener('click', async () => {
    if (!window.confirm('Gravar a voz de novo? A voz digital atual será apagada na ElevenLabs.')) return;
    pararTudo();
    const resultado = await apagarVozDigital();
    if (!resultado.ok) {
      avisar(resultado.mensagem);
      return;
    }
    atualizarBotaoInicio();
    abrir();
  });

  el.apagarVoz.addEventListener('click', async () => {
    if (!window.confirm('Apagar a voz digital da família? Ela também será apagada na ElevenLabs.')) return;
    pararTudo();
    const resultado = await apagarVozDigital();
    avisar(resultado.ok ? 'A voz digital foi apagada.' : resultado.mensagem);
    atualizarRestantes();
    atualizarBotaoInicio();
    if (resultado.ok) abrir({ manterMensagem: true });
  });

  // ---------- abrir e sair ----------

  async function abrir({ manterMensagem = false } = {}) {
    pararTudo();
    if (!manterMensagem) avisar('');
    narracao = null;

    if (Familia.vozDigital()) {
      await gerarNarracao();
      return;
    }

    // Sem voz digital: pede a gravação.
    mostrarBloco('gravar');
    let problema = '';
    if (Voz.navegadorDentroDeApp()) problema = MENSAGENS.dentroDeApp;
    else if (!Voz.podeGravar()) problema = MENSAGENS.semSuporte;
    el.semSuporte.textContent = problema;
    el.semSuporte.hidden = !problema;
    el.areaGravacao.hidden = Boolean(problema);
    el.gravar.disabled = !el.aceite.checked;
  }

  function sair() {
    pararGravacao({ cancelar: true });
    pararTudo();
    clearInterval(esperaRelogio);
  }

  el.aceite.addEventListener('change', () => {
    el.gravar.disabled = !el.aceite.checked;
    if (el.aceite.checked) avisar('');
  });
  el.gravar.addEventListener('click', comecarGravacao);
  el.tocar.addEventListener('click', tocar);

  // ---------- outra curiosidade: escrita ou lida de uma imagem ----------

  const MAX_CARACTERES_TEXTO = 300;

  function atualizarContador() {
    el.contador.textContent = String(el.textoLivre.value.length);
  }

  el.textoLivre.addEventListener('input', atualizarContador);

  el.lerTexto.addEventListener('click', () => {
    const texto = el.textoLivre.value.replace(/\s+/g, ' ').trim().slice(0, MAX_CARACTERES_TEXTO);
    if (!texto) {
      avisar('Escreva uma curiosidade ou envie uma imagem.');
      el.textoLivre.focus();
      return;
    }
    pararTudo();
    avisar('');
    el.outro.open = false;
    gerarNarracao({ texto, origem: 'A curiosidade que vocês escolheram:' });
  });

  el.imagem.addEventListener('change', async () => {
    const arquivo = el.imagem.files && el.imagem.files[0];
    el.imagem.value = '';
    if (!arquivo) return;
    const rotulo = el.imagemRotulo.textContent;
    el.imagemRotulo.textContent = 'Lendo a imagem...';
    el.imagemRotulo.classList.add('botao-arquivo--ocupado');
    try {
      // Mesma redução das fotos da missão: 1024 px, JPEG. A imagem não fica guardada.
      const { blob } = await Fotos.reduzir(arquivo);
      const imagem = await base64DoBlob(blob);
      const resposta = await enviarJSON('/api/curiosidade', 'POST', { imagem });
      if (resposta.ok && resposta.dados && typeof resposta.dados.texto === 'string') {
        el.textoLivre.value = resposta.dados.texto.slice(0, MAX_CARACTERES_TEXTO);
        atualizarContador();
        avisar('Confira o texto e toque em "Ler esta curiosidade".');
      } else {
        avisar((resposta.dados && resposta.dados.mensagem) || 'Não consegui ler a imagem agora. Escreva a curiosidade no campo.');
      }
    } catch (erro) {
      avisar(Fotos.ehHeic(arquivo)
        ? 'Este navegador não abre fotos HEIC. Tente uma foto em JPG ou escreva a curiosidade.'
        : 'Não consegui abrir esta imagem. Tente outra ou escreva a curiosidade.');
    } finally {
      el.imagemRotulo.textContent = rotulo;
      el.imagemRotulo.classList.remove('botao-arquivo--ocupado');
    }
  });

  Voz.aoVerificar(atualizarBotaoInicio);

  return { abrir, sair, apagarVozDigital, atualizarBotaoInicio };
})();
