// Landing do Lumi: lista de espera e interesse por plano.
// Os preços são hipóteses de teste: troque aqui.
const PRECOS = {
  vozFamilia: 'R$ 14,90/mês',
  gratuito: 'R$ 0',
};

const Landing = (() => {
  const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  // Origem da visita (para medir de onde vêm os leads), sem dados pessoais.
  function origem() {
    const p = new URLSearchParams(window.location.search);
    const pegar = (k) => (p.get(k) || '').slice(0, 60);
    return {
      utm_source: pegar('utm_source'),
      utm_medium: pegar('utm_medium'),
      utm_campaign: pegar('utm_campaign'),
      ref: pegar('ref'),
    };
  }

  async function enviarLead(dados) {
    try {
      const resposta = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...dados, origem: origem() }),
      });
      const corpo = await resposta.json().catch(() => ({}));
      return { ok: resposta.ok && corpo.ok === true, erro: corpo.erro || null, status: resposta.status };
    } catch (erro) {
      return { ok: false, erro: 'rede', status: 0 };
    }
  }

  function mensagemDeErro(resultado) {
    if (resultado.erro === 'limite') return 'Muitas tentativas agora. Tente de novo daqui a pouco.';
    if (resultado.erro === 'email') return 'Confira o e-mail digitado.';
    return 'Não conseguimos salvar agora. Tente de novo em instantes.';
  }

  // ---------- formulário curto do hero ----------
  const curto = {
    form: document.getElementById('form-curto'),
    email: document.getElementById('curto-email'),
    aceite: document.getElementById('curto-aceite'),
    erro: document.getElementById('curto-erro'),
    botao: document.getElementById('curto-enviar'),
  };

  function marcarErro(campo, texto, saida) {
    campo.setAttribute('aria-invalid', 'true');
    saida.textContent = texto;
    campo.focus();
  }

  curto.form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    curto.erro.textContent = '';
    curto.email.removeAttribute('aria-invalid');
    const email = curto.email.value.trim().toLowerCase();
    if (!EMAIL_VALIDO.test(email)) {
      marcarErro(curto.email, 'Digite um e-mail válido, como voce@email.com.', curto.erro);
      return;
    }
    if (!curto.aceite.checked) {
      marcarErro(curto.aceite, 'Marque a caixa para entrar na lista.', curto.erro);
      return;
    }

    const texto = curto.botao.textContent;
    curto.botao.disabled = true;
    curto.botao.textContent = 'Enviando…';
    const resultado = await enviarLead({ email, plano: 'indefinido', consentimento: true });
    curto.botao.disabled = false;
    curto.botao.textContent = texto;

    if (!resultado.ok) {
      curto.erro.textContent = mensagemDeErro(resultado);
      return;
    }
    curto.form.reset();
    // Leva ao formulário completo (se já existir na página), com o e-mail preenchido.
    document.dispatchEvent(new CustomEvent('lumi:lead-curto', { detail: { email } }));
  });

  // ---------- formulário completo ----------
  const $ = (id) => document.getElementById(id);
  const lista = {
    secao: $('lista'),
    conteudo: $('lista-formulario'),
    form: $('form-completo'),
    email: $('lista-email'),
    emailErro: $('lista-email-erro'),
    uf: $('lista-uf'),
    ufErro: $('lista-uf-erro'),
    whatsapp: $('lista-whatsapp'),
    whatsappErro: $('lista-whatsapp-erro'),
    aceite: $('lista-aceite'),
    aceiteErro: $('lista-aceite-erro'),
    site: $('lista-site'),
    botao: $('lista-enviar'),
    erro: $('lista-erro'),
    sucesso: $('lista-sucesso'),
    compartilhar: $('lista-compartilhar'),
    privacidade: $('privacidade'),
  };

  // Máscara do WhatsApp: (00) 00000-0000 ou (00) 0000-0000.
  function mascaraWhatsapp(valor) {
    const d = valor.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2) return d ? `(${d}` : '';
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }

  lista.whatsapp.addEventListener('input', () => {
    lista.whatsapp.value = mascaraWhatsapp(lista.whatsapp.value);
  });

  function limparErros() {
    [lista.email, lista.uf, lista.whatsapp, lista.aceite].forEach((c) => c.removeAttribute('aria-invalid'));
    [lista.emailErro, lista.ufErro, lista.whatsappErro, lista.aceiteErro, lista.erro].forEach((e) => { e.textContent = ''; });
  }

  // Marca o plano no formulário (usado pelos botões dos cartões de plano).
  function escolherPlano(plano) {
    const opcao = lista.form.querySelector(`input[name="plano"][value="${plano}"]`);
    if (opcao) opcao.checked = true;
  }

  function irParaLista(email) {
    if (email && !lista.email.value) lista.email.value = email;
    lista.secao.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    (lista.email.value ? lista.uf : lista.email).focus({ preventScroll: true });
  }

  // Depois do formulário curto: leva ao completo com o e-mail preenchido.
  document.addEventListener('lumi:lead-curto', (evento) => irParaLista(evento.detail.email));

  // Link de indicação para o WhatsApp.
  function linkDeIndicacao() {
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('utm_source', 'indicacao');
    const texto = `Achei um app que transforma a foto do caderno em missão com perguntas e pontos. Entrei na lista de espera do Lumi: ${url.toString()}`;
    return `https://wa.me/?text=${encodeURIComponent(texto)}`;
  }

  lista.form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    limparErros();

    const email = lista.email.value.trim().toLowerCase();
    const uf = lista.uf.value;
    const whatsapp = lista.whatsapp.value.replace(/\D/g, '');
    const anos = [...lista.form.querySelectorAll('input[name="anos"]:checked')].map((c) => c.value);
    const planoMarcado = lista.form.querySelector('input[name="plano"]:checked');

    let primeiroErro = null;
    const erro = (campo, saida, texto) => {
      campo.setAttribute('aria-invalid', 'true');
      saida.textContent = texto;
      primeiroErro = primeiroErro || campo;
    };
    if (!EMAIL_VALIDO.test(email)) erro(lista.email, lista.emailErro, 'Digite um e-mail válido, como voce@email.com.');
    if (!uf) erro(lista.uf, lista.ufErro, 'Escolha o seu estado.');
    if (whatsapp && (whatsapp.length < 10 || whatsapp.length > 11)) erro(lista.whatsapp, lista.whatsappErro, 'Use DDD e número, como (11) 91234-5678.');
    if (!lista.aceite.checked) erro(lista.aceite, lista.aceiteErro, 'Marque a caixa para entrar na lista.');
    if (primeiroErro) {
      primeiroErro.focus();
      return;
    }

    lista.botao.disabled = true;
    lista.botao.textContent = 'Enviando…';
    const resultado = await enviarLead({
      email,
      uf,
      anos,
      whatsapp,
      plano: planoMarcado ? planoMarcado.value : 'indefinido',
      consentimento: true,
      site: lista.site.value,
    });
    lista.botao.disabled = false;
    lista.botao.textContent = 'Entrar na lista de espera';

    if (!resultado.ok) {
      lista.erro.textContent = mensagemDeErro(resultado);
      return;
    }
    lista.compartilhar.href = linkDeIndicacao();
    lista.conteudo.hidden = true;
    lista.sucesso.hidden = false;
    lista.sucesso.focus();
  });

  // "Privacidade" no rodapé abre a política.
  function abrirPrivacidade() {
    if (window.location.hash === '#privacidade') lista.privacidade.open = true;
  }
  window.addEventListener('hashchange', abrirPrivacidade);
  abrirPrivacidade();

  return { enviarLead, mensagemDeErro, EMAIL_VALIDO, origem, escolherPlano, irParaLista, mascaraWhatsapp };
})();
