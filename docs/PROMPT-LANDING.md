# Prompt: landing page do Lumi (lista de espera + app de vitrine)

Copie o bloco abaixo e cole no Claude Code, aberto na pasta `lumi`, branch `estrutura-inicial`.

---

```
Projeto Lumi. Nova etapa: LANDING PAGE para coletar leads e medir a demanda.
Leia o CONTEXTO.md e depois a especificação completa em docs/PROMPT-LANDING.md
(seções 1 a 10). Antes de codar, me mande um briefing curto com a ordem das etapas
e confirme comigo as 3 decisões da seção 10. Siga todas as regras do CONTEXTO.md:
branch estrutura-inicial, commits pequenos com o rodapé combinado, testes antes de
cada commit, diff e confirmação antes de cada push, nada de framework ou biblioteca
nova, chaves só na Vercel, nenhum dado de criança.
O prazo é hoje à noite: priorize na ordem da seção 9.
```

---

## 1. O negócio em uma frase

- **A dor:** a mãe quer estudar com o filho, mas compete com apps feitos para prender a atenção. Revisar o caderno vira briga, e ela não tem método nem tempo para isso todo dia.
- **A resposta:** o Lumi usa a tela a favor do estudo. A foto do caderno vira uma missão com perguntas, e cada acerto ganha pontos, medalhas e a voz da família torcendo.
- **Público:** mães e responsáveis no **Brasil**, com filhos de 9 a 12 anos (do 4º ao 7º ano).
- **Objetivo da página:**
  1. Coletar e-mails para a lista de espera.
  2. Medir o interesse por plano: Gratuito ou Voz da Família.
  3. Deixar a pessoa **experimentar o app de verdade** dentro da página.

## 2. Direção de design

Pense como um designer sênior, cofundador da Stripe:
- precisão tipográfica, muito espaço em branco, uma ideia por seção e zero enfeite;
- **direto ao ponto:** frases curtas, nada de parágrafos longos.

**Proibido:**
- **"eyebrows"**: os rótulos pequenos em caixa alta acima dos títulos (como "COMO FUNCIONA" ou "PLANOS"). O título já diz o que é;
- emoji, ícones genéricos em excesso, depoimentos ou números inventados, "+10.000 famílias", carrossel e pop-up;
- marcas de jogos e o logotipo da Escola Corujinha.

**Visual:**
- **Cores:** o tema escuro do app, com as variáveis de `css/estilo.css`. O `--gradiente-marca` pode ser usado **só no topo da landing** (regra do CONTEXTO.md), de forma sutil: um brilho atrás do hero, nunca chapado.
- **Fontes:** Fredoka nos títulos e botões, Nunito no texto, as mesmas do app.
- **Botões:** o mesmo estilo "adesivo" do app (contorno `--contorno`, sombra dura e Fredoka).
- **Imagens:** os PNGs de `assets/recortes/` e `assets/rede-neuronios.svg`, sempre soltos, sem moldura quadrada.
- **Ritmo:** cada seção ocupa no máximo uma tela de altura no desktop. Coluna de texto com até 560px de largura. Títulos entre 40 e 56px no desktop e entre 32 e 36px no celular.
- **Celular primeiro:** a maioria das mães vai abrir pelo WhatsApp no celular.

## 3. Onde fica

- Pasta nova `conheca/` com `conheca/index.html`, `conheca/landing.css` e `conheca/landing.js`. O endereço fica `https://lumi-psi-nine.vercel.app/conheca/`.
- **Não mover o app da raiz.** O retorno do Google Agenda volta para `/?google=...` (`api/google/_comum.js`), e mexer nisso hoje é arriscado.
- Os caminhos de dentro de `conheca/` usam `../assets/...` e `../css/estilo.css` (só para importar as variáveis).

## 4. Estrutura da página (só isto)

### 4.1 Hero (seção principal, em uma tela)

**Esquerda no desktop, ou em cima no celular:**
- **Título:** "Use a tela a favor do estudo."
- **Subtítulo:** "O Lumi transforma a foto do caderno em uma missão com perguntas, pontos e a voz da família. Seu filho revisa para a prova jogando, e você acompanha sem virar professora à noite."
- **Formulário curto em linha:**
  - campo de e-mail e botão "Entrar na lista de espera";
  - embaixo, em texto pequeno: "Grátis para começar. Lançamento em breve. Ninguém é cobrado agora.";
  - este formulário curto grava o e-mail com o plano "indefinido" e, em seguida, rola até o formulário completo da seção 4.4, com o e-mail já preenchido, para a pessoa completar se quiser.
- **Link secundário:** "Experimente agora ↓", que leva ao celular ao lado ou abaixo.

**Direita no desktop, ou embaixo no celular: o app funcionando**
- Uma moldura de celular feita em CSS, com cerca de 360×740px no desktop e escalada no celular, com contorno de 3px em `--borda`, raio de 44px e sombra longa.
- Dentro dela, `<iframe src="/?vitrine=1" title="Experimente o app Lumi" allow="microphone; autoplay" loading="lazy">`.
- Atrás do celular, a `rede-neuronios.svg` bem suave, com opacidade em torno de 0.5, e o brilho do gradiente.
- Embaixo do celular, uma linha: "Toque e jogue uma missão de exemplo."

### 4.2 Como funciona (3 passos, uma linha cada)

Um título só: "Do caderno para a missão em um minuto."

Três colunas no desktop (empilhadas no celular), cada uma com uma imagem recortada pequena, um título curto e uma frase:
1. `doris-acenando.png`, **"Fotografe o caderno."** "Até 10 fotos da matéria da prova."
2. `lumi-lapis.png`, **"Responda a missão."** "Perguntas de 5 tipos, criadas a partir do que a criança estudou."
3. `duas-comemorando.png`, **"Cada acerto acende uma luz."** "Pontos, medalhas, tabuada e a voz da família comemorando."

Embaixo, numa linha só, mostrar o que mais vem no app: "Também tem: tabuada com 4 modos · Leia comigo · calendário de provas com Google Agenda."

### 4.3 A voz da família (o diferencial) + Planos

- **Título:** "A voz que ela já conhece, torcendo a cada acerto."
- **Texto (2 frases):** "Grave frases de incentivo com a sua voz. Elas tocam quando seu filho acerta, como se você estivesse ao lado."
- **Frase científica**, em destaque discreto, em `--brilho`: **"Cada acerto acende uma luz e fortalece uma conexão no cérebro."**

**Planos:** dois cartões lado a lado, com o mesmo peso visual. O pago tem a borda em `--primaria` e o selo "Mais completo", que é um selo no cartão, não um eyebrow.

**Gratuito, R$ 0**
- Missões com foto: 3 por semana
- Tabuada ilimitada, com medalhas e níveis
- Leia comigo (voz do aparelho)
- Frases de incentivo gravadas com a voz da família
- Calendário de provas e Google Agenda
- Botão: "Quero o gratuito"

**Voz da Família, R$ 14,90/mês** (preço de lançamento)
- Tudo do Gratuito, com missões ilimitadas
- Voz digital da família, criada a partir de 30 segundos de gravação
- Os fatos das missões e as curiosidades narrados com essa voz (até 5 por dia)
- Botão: "Quero a Voz da Família"

Embaixo dos cartões: "Lista de espera: ninguém é cobrado agora. A voz digital só é criada com autorização de quem grava e pode ser apagada a qualquer momento."

**Os botões dos planos não vendem nada:** rolam até o formulário com o plano já marcado e registram o clique como interesse (seção 5).

### 4.4 Lista de espera (formulário completo)

- **Título:** "Seja das primeiras famílias."
- **Campos:** só os dados de quem é responsável. **Nada de nome, idade exata ou escola da criança.**
  - **E-mail** (obrigatório);
  - **Estado (UF)**: um `select` com as 27 UFs (obrigatório);
  - **Ano escolar dos filhos**: caixas de marcação, "4º ano", "5º ano", "6º ano", "7º ano" e "Outro" (opcional);
  - **Plano de interesse**: duas opções, Gratuito ou Voz da Família, já marcado se a pessoa veio de um botão de plano;
  - **WhatsApp** (opcional), com máscara (00) 00000-0000;
  - **Consentimento** (obrigatório, desmarcado): "Aceito receber novidades do Lumi por e-mail ou WhatsApp. Posso sair quando quiser.", com o link "Como usamos seus dados", que abre um `<details>` com 4 linhas de política.
  - **Campo escondido anti-spam** (honeypot), chamado `site`.
- **Botão:** "Entrar na lista de espera".
- **Sucesso:** a Lumi comemorando, a frase "Pronto! Você está na lista." e o botão "Compartilhar com outra mãe", que abre o WhatsApp com o texto pronto e o link da landing (com `utm_source=indicacao`).
- **Erro:** mensagem curta e humana, com uma nova tentativa.

**Política** (texto do `<details>`, em linguagem simples):
- Guardamos só o que você digitou aqui, para avisar do lançamento e entender o interesse.
- Não vendemos nem compartilhamos seus dados.
- Não pedimos dados de crianças.
- Para sair da lista ou apagar seus dados, responda qualquer e-mail nosso. (LGPD)

### 4.5 Rodapé

- "Lumi · Cada acerto acende uma luz."
- Links: "Abrir o app" (`/`) e "Privacidade" (âncora para o `<details>`).
- © 2026. Nada além disso.

**Não há outras seções.** Nada de FAQ grande, depoimentos ou "sobre nós".

## 5. Captura de leads (servidor)

**Armazenamento:** Redis da Upstash, pela integração da Vercel (Marketplace → Upstash for Redis). Ela cria as variáveis `KV_REST_API_URL` e `KV_REST_API_TOKEN` na Vercel. **Use a API REST com `fetch`, sem pacote npm.**

- **`api/leads.js` (POST):**
  - **Validação:**
    - e-mail válido e em minúsculas;
    - UF numa lista fixa de 27;
    - anos numa lista fixa;
    - plano em `gratuito`, `voz_familia` ou `indefinido`;
    - WhatsApp opcional, só com dígitos, entre 10 e 11 dígitos;
    - consentimento igual a `true`;
    - o honeypot `site` precisa vir vazio. Se vier preenchido, responda 200 e não salve nada.
  - **Limite de envios:** no máximo 5 por IP por hora. A chave é o **hash** do IP com sal diário (`LEADS_SAL`); nunca guardar o IP puro.
  - **Duplicados:** e-mail repetido não cria outro lead. Atualiza o plano e a data e responde ok.
  - **O que salvar:** `lead:<sha256 do e-mail>` como hash com e-mail, UF, anos, plano, WhatsApp, consentimento com data e hora, origem (`utm_source`, `utm_medium`, `utm_campaign` e `ref`) e `criadoEm`. Somar contadores `contagem:plano:<plano>`, `contagem:uf:<UF>` e `contagem:dia:<AAAA-MM-DD>`.
  - **Logs:** nunca logar e-mail ou telefone, só "lead salvo" ou o código do erro.
  - **Sem as variáveis do Redis:** responda 503 com `{erro:"indisponivel"}`, e o front mostra "Não conseguimos salvar agora. Tente de novo em instantes."
- **`api/interesse.js` (POST):** soma `clique:plano:<plano>` quando alguém clica num botão de plano. Isso mede a intenção mesmo sem cadastro. Nenhum dado pessoal.
- **`api/leads-resumo.js` (GET):**
  - protegido por `?chave=` igual à variável `LEADS_CHAVE`;
  - devolve o total de leads, os totais por plano, por UF, por ano escolar e por origem, os cliques por plano e os leads por dia nos últimos 14 dias;
  - com `&formato=csv`, devolve o CSV completo para planilha (separador `;`, UTF-8 com BOM, para o Excel em português).
- **Variáveis novas na Vercel** (Production e Preview): `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `LEADS_CHAVE` e `LEADS_SAL`.
- **Medição de visitas:** ative o **Vercel Web Analytics** no painel e inclua `<script defer src="/_vercel/insights/script.js"></script>` na landing. Assim a taxa de conversão é leads ÷ visitantes, sem biblioteca.
- **Testes:** criar `testes/leads.test.js`, com o Redis simulado, cobrindo:
  - validações e honeypot;
  - limite de envios;
  - e-mail duplicado;
  - falta das variáveis;
  - logs sem dados pessoais;
  - o resumo protegido por chave e o CSV.

## 6. App em modo vitrine (`/?vitrine=1`)

Pequena mudança no app, para a landing não gastar créditos nem coletar nada.

**Ao ler `vitrine=1` na URL:**
- **Abertura:** aparece normalmente.
- **FotoQuest:**
  - a pessoa pode escolher a matéria e as fotos, mas **nada é enviado**;
  - "Criar minha missão" abre direto as perguntas de exemplo (`Quiz.PERGUNTAS_DEMO`);
  - aparece o aviso "Na vitrine, usamos uma missão de exemplo. Suas fotos não saem do aparelho.";
  - as fotos não ficam salvas.
- **Narração com a voz digital (ElevenLabs) e criação de voz:** desativadas. Os botões mostram "Disponível no plano Voz da Família", sem chamar `api/voz` nem `api/narrar`. Curiosidades em texto e Leia comigo (voz do aparelho) continuam funcionando.
- **"Minha voz" (frases gravadas no aparelho):** continua liberada. É o recurso do plano gratuito e não custa nada (fica no IndexedDB do próprio visitante).
- **Google Agenda:** oculto. O OAuth não funciona dentro de um iframe.
- **Missões salvas e pontos:** funcionam no aparelho do visitante.
- **Faixa no rodapé do app:** uma faixa fina "Versão de demonstração · Entrar na lista de espera", que abre `/conheca/#lista` em `target="_top"`.

**Implementação:** um módulo `Vitrine` com `ativa()` lendo a URL, e checagens pontuais em `fotos.js`, `narracao.js` e `calendario.js`. Fora do modo vitrine, **nada muda**: rode todos os testes e confira que o fluxo normal está igual.

## 7. Detalhes que fazem a página parecer "Stripe"

- **Espaçamento vertical generoso e consistente:** 96 a 128px entre seções no desktop e 64px no celular.
- **Hierarquia por tamanho e peso,** não por cor. No máximo 3 cores de destaque por seção.
- **Formulário caprichado:**
  - rótulo sempre visível (não só placeholder), foco com anel `--brilho`;
  - erros embaixo do campo, em `--erro`, com texto que ajuda;
  - o botão mostra "Enviando…" e fica desativado durante o envio.
- **Animação:** só a Lumi flutuando de leve e os pulsos da rede de neurônios. Tudo desligado em `prefers-reduced-motion`.
- **Desempenho:** imagens com `width` e `height`, `loading="lazy"` abaixo da dobra e o iframe com `loading="lazy"`. Meta: Lighthouse acima de 90 no celular.
- **SEO e compartilhamento:**
  - `<title>`: "Lumi · O caderno vira missão"
  - `meta description`: "App que transforma a foto do caderno em missão com perguntas, pontos e a voz da família. Para crianças de 9 a 12 anos."
  - Open Graph e Twitter com imagem: crie `assets/og-lumi.png` (1200×630) com o fundo índigo, a Lumi e a Dóris recortadas e a frase. Se não der para gerar, use `assets/recortes/duas-comemorando.png` por enquanto.
  - `lang="pt-BR"`.
- **Acessibilidade:** contraste de pelo menos 4.5:1, ordem de tab lógica, `aria-live` nas mensagens do formulário e o iframe com `title`.

## 8. Textos: regras

- Português do Brasil, "você", frases curtas e sem jargão de tecnologia ("IA" aparece no máximo uma vez, se aparecer).
- Nunca prometer o que não existe. Mundos temáticos, Turminha e escolas **não aparecem**, nem como "em breve", para manter a página enxuta.
- **Os preços são hipóteses de teste:** deixe-os em constantes fáceis de trocar no topo de `landing.js` ou num `data-` no HTML.

## 9. Ordem de trabalho (prazo hoje)

1. Hero com o formulário curto, o celular com o iframe e o rodapé, funcionando no celular.
2. `api/leads.js`, `api/interesse.js` e os testes, mais as instruções para eu criar o Upstash e as variáveis na Vercel.
3. Formulário completo, com a tela de sucesso e o compartilhamento no WhatsApp.
4. Modo vitrine no app.
5. Como funciona, Voz da família e Planos.
6. `api/leads-resumo.js`.
7. Open Graph, Analytics e revisão de acessibilidade e desempenho.
8. Prévia na Vercel: me mande o link e prints do celular e do desktop.

Commit a cada etapa. Diff e confirmação antes de cada push. Merge na `main` só com o meu ok.

## 10. Decisões para confirmar comigo no briefing

1. **Preço do plano Voz da Família:** R$ 14,90/mês (sugestão). Alternativa: R$ 19,90/mês ou R$ 149/ano.
2. **Limite do Gratuito:** 3 missões com foto por semana. A tabuada e as frases gravadas são ilimitadas.
3. **Onde guardar os leads:** Upstash Redis pela Vercel (sugestão). Alternativas: planilha do Google ou formulário externo (Tally).
