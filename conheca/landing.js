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

  return { enviarLead, mensagemDeErro, EMAIL_VALIDO, origem };
})();
