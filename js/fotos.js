// Fotos do material: conferir o tipo e diminuir no navegador antes do envio.
// A foto original nunca sai do aparelho; só a versão reduzida é enviada.

const Fotos = (() => {
  const MAX_FOTOS = 10;
  const LADO_MAXIMO = 1024;
  const QUALIDADE_JPEG = 0.8;

  const TIPOS_ACEITOS = ['image/jpeg', 'image/png', 'image/heic', 'image/heif'];
  const EXTENSOES_ACEITAS = /\.(jpe?g|png|heic|heif)$/i;

  function tipoAceito(arquivo) {
    return TIPOS_ACEITOS.includes(arquivo.type) || EXTENSOES_ACEITAS.test(arquivo.name || '');
  }

  function ehHeic(arquivo) {
    return /hei[cf]/i.test(arquivo.type) || /\.hei[cf]$/i.test(arquivo.name || '');
  }

  // Abre a imagem já girada conforme a orientação EXIF da câmera.
  async function abrir(arquivo) {
    if (typeof createImageBitmap === 'function') {
      try {
        const bitmap = await createImageBitmap(arquivo, { imageOrientation: 'from-image' });
        return { fonte: bitmap, liberar: () => bitmap.close() };
      } catch (erro) {
        // Tenta pelo elemento <img>, que também respeita o EXIF.
      }
    }
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.src = url;
    try {
      await img.decode();
    } catch (erro) {
      URL.revokeObjectURL(url);
      throw erro;
    }
    return { fonte: img, liberar: () => URL.revokeObjectURL(url) };
  }

  function paraBlob(canvas) {
    return new Promise((resolver, rejeitar) => {
      canvas.toBlob(
        (blob) => (blob ? resolver(blob) : rejeitar(new Error('falha_ao_gerar_jpeg'))),
        'image/jpeg',
        QUALIDADE_JPEG,
      );
    });
  }

  // Devolve um JPEG com no máximo 1024 px no lado maior.
  // Gerar um JPEG novo também apaga os metadados da foto (como localização).
  async function reduzir(arquivo) {
    const { fonte, liberar } = await abrir(arquivo);
    try {
      const largura = fonte.naturalWidth || fonte.width;
      const altura = fonte.naturalHeight || fonte.height;
      if (!largura || !altura) throw new Error('imagem_vazia');

      const escala = Math.min(1, LADO_MAXIMO / Math.max(largura, altura));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(largura * escala));
      canvas.height = Math.max(1, Math.round(altura * escala));

      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'white'; // fundo branco para PNG com transparência
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(fonte, 0, 0, canvas.width, canvas.height);

      const blob = await paraBlob(canvas);
      return { blob, largura: canvas.width, altura: canvas.height };
    } finally {
      liberar();
    }
  }

  function paraBase64(blob) {
    return new Promise((resolver, rejeitar) => {
      const leitor = new FileReader();
      leitor.onload = () => resolver(String(leitor.result).split(',')[1]);
      leitor.onerror = () => rejeitar(leitor.error);
      leitor.readAsDataURL(blob);
    });
  }

  return {
    MAX_FOTOS,
    LADO_MAXIMO,
    tipoAceito,
    ehHeic,
    reduzir,
    paraBase64,
  };
})();
