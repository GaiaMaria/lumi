// Modo vitrine (/?vitrine=1): o app dentro da landing, sem gastar créditos nem coletar nada.
// - FotoQuest usa a missão de exemplo (as fotos não saem do aparelho).
// - Voz digital (ElevenLabs), leitura de imagem e Google Agenda ficam desligados.
// - Os dados ficam separados dos dados de verdade da família (outra chave no aparelho).
// Fora do modo vitrine, nada muda.

const Vitrine = (() => {
  function ativaNa(busca) {
    return new URLSearchParams(busca || '').get('vitrine') === '1';
  }

  const ATIVA = typeof window !== 'undefined' && window.location ? ativaNa(window.location.search) : false;

  const MENSAGEM_VOZ = 'Na vitrine, a curiosidade é lida com a voz do aparelho. A voz digital da família está disponível no plano Voz da Família.';

  // Marca a página: o CSS mostra a faixa e o aviso e esconde o que não funciona aqui.
  if (ATIVA && typeof document !== 'undefined' && document.body) {
    document.body.classList.add('vitrine');
  }

  return { ativa: () => ATIVA, ativaNa, MENSAGEM_VOZ };
})();
