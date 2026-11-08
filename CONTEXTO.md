# CONTEXTO.md

Briefing do projeto Lumi. Leia este arquivo inteiro antes de criar ou alterar qualquer coisa.

## 1. O projeto

- **Nome do app:** Lumi
- **Frase principal:** "Cada acerto acende uma luz."
- **O que é:** app de estudo gamificado. A criança fotografa o material escolar (caderno, livro ou atividade), o app transforma a foto em uma missão com perguntas, e a criança ganha pontos, medalhas e avança em mundos temáticos.
- **Projeto do curso:** entrega do Demo Day do curso "Fique F*da em IA em 15 dias" (Paradigma). A entrega é um vídeo de 1 a 4 minutos, com o link do projeto no ar.
- **Prazo:** link no ar e vídeo enviado até domingo, 8/11/2026, às 23h59 (horário de Brasília). Link essencial até domingo, 16h.

## 2. Público

- **Usuária final:** criança de 9 a 12 anos, meninos e meninas. Gosta de missões, colecionáveis, mistério, chefões e personalização.
- **Compradora:** mãe ou responsável, que quer que a criança estude sem brigas e veja o progresso.
- **Piloto:** Escola Corujinha, primeira escola a testar o app. Nenhuma marca ou logotipo da escola pode ser usada sem autorização por escrito.

## 3. Identidade visual

**Paleta (usar sempre as variáveis CSS em `css/estilo.css`):**

| Variável | Hex | Uso |
|---|---|---|
| `--fundo` | `#1E1B4B` | Fundo principal |
| `--fundo-escuro` | `#120F33` | Cabeçalho e rodapé |
| `--superficie` | `#2A2663` | Cards e caixas de questão |
| `--borda` | `#3B3680` | Contornos e divisórias |
| `--texto` | `#F8FAFC` | Títulos e enunciados |
| `--texto-suave` | `#C7D2FE` | Legendas e dicas |
| `--primaria` | `#7C3AED` | Botões principais, com texto branco |
| `--primaria-hover` | `#6D28D9` | Botão ao passar o mouse |
| `--sucesso` | `#34D399` | Acertos, pontos e progresso, com texto índigo |
| `--brilho` | `#A7F3D0` | Efeito de luz da Lumi |
| `--doris` | `#FB923C` | Área de fotos e leitura, com texto índigo |
| `--creme` | `#FFF7ED` | Papel de caderno e cards de leitura |
| `--atencao` | `#FACC15` | "Quase lá" e segunda chance, com texto índigo |
| `--erro` | `#F87171` | Resposta errada, sempre com frase de incentivo |
| `--info` | `#38BDF8` | Dicas e links |
| `--gradiente-marca` | `linear-gradient(135deg, #7C3AED, #34D399)` | Só no topo da landing e na tela de conquista |

**Visual "adesivo" (layout de 8/11/2026, também em `css/estilo.css`):**

| Variável | Valor | Uso |
|---|---|---|
| `--contorno` | `#0B0920` | Contorno quase preto dos botões e cartões |
| `--sombra-dura` / `--sombra-dura-pressionada` | `3px 3px 0` / `1px 1px 0` | Sombra dura deslocada; ao tocar, o botão "afunda" |
| `--borda-adesivo` | `2.5px solid var(--contorno)` | Borda dos botões, chips e balões |
| `--texto-escuro` | `var(--fundo)` | Texto índigo sobre cores claras |
| `--balao` | `var(--creme)` | Balões de fala das mascotes |
| `--trilha-apagada` | `var(--borda)` | Pontinhos da trilha do Início |
| `--fundo-ceu` | gradiente radial | Céu de fundo de todas as telas |
| `--fonte-titulo` / `--fonte-texto` | Fredoka / Nunito | Títulos e botões / texto |
| `--largura-coluna` | `480px` | Coluna central do app no desktop |

- Botões coloridos: classes `botao--laranja`, `botao--sol`, `botao--menta` e `botao--info`, sempre com texto índigo.
- Fontes Fredoka e Nunito carregadas do Google Fonts por um `<link>` no `index.html` (autorizado; não é biblioteca de código).
- Os demais tamanhos novos (trilha, paradas, barra de baixo etc.) também são variáveis em `:root`.

**Regras de cor:**
- Texto sobre menta, laranja ou sol sempre em índigo, nunca em branco.
- Violeta só como fundo de botão, com texto branco.
- Coral para erro, sempre com incentivo: "Quase! Tente de novo."
- No máximo três cores de destaque na mesma tela.

**Mascotes:**
- **Lumi:** vaga-lume verde-menta, com asas violeta. Aparece nos acertos, nas medalhas e no guia das missões. Arquivos: `assets/lumi.jpg` e `assets/lumi-comemorando.jpg`.
- **Dóris:** coruja laranja com barriga creme, que lê um livro em voz alta. Aparece na área de fotos e na leitura. Arquivo: `assets/doris.jpg`.
- **Referência de cena:** `assets/referencia-cena.jpeg`, com as duas juntas. Usar como base da landing.
- **Recortes sem fundo (`assets/recortes/`):** as mascotes aparecem sempre soltas, sem moldura, círculo ou quadrado.

| Recorte | Onde |
|---|---|
| `lumi-comemorando.png` | Abertura, painel de acerto do quiz e da Tabuada |
| `lumi-lapis.png` | Início, com o balão |
| `lumi-abraco-lapis.png` | Topo da Tabuada |
| `lumi-lendo.png` | Reserva |
| `doris-acenando.png` | FotoQuest, com o balão |
| `doris-livro.png` | Tela "Hmm, será a matéria certa?" |
| `doris-olhos-fechados.png` | Narração: esperando e ouvindo |
| `doris-joinha.png` | Área dos pais e Provas |
| `duas-comemorando.png` | Missão completa e fim do treino da Tabuada |
| `duas-lapis.png` | Narração: gravar a voz |

- **Rede de neurônios:** `assets/rede-neuronios.svg`, com animação própria, na tela de abertura.
- **Referências do layout:** `docs/referencias/` (abertura, rascunho escuro e mapa) e a especificação em `docs/PROMPT-LAYOUT.md`.

## 4. Funções do app

**Essencial (link de domingo, 16h):**
1. FotoQuest: foto → 5 perguntas em JSON pelo Claude
2. Quiz: múltipla escolha e verdadeiro ou falso (os outros tipos entram se der tempo)
3. Pontos e medalhas
4. Landing page com a Lumi
5. Vídeo de 4 minutos

**Desejável:**
6. Tabuada: treino rápido de 10 contas em 60 segundos, desafio por tabuada (do 2 ao 9) e tabuada em contexto, em que o problema da foto vira conta
7. Narração com a voz gravada pela mãe

**Se sobrar tempo:**
8. Calendário de provas: cadastro de matéria e data, lista de revisão diária, check de tarefas feitas com pontos
9. Painel dos pais com dados fictícios

**Em breve (aparece no vídeo com selo "Em breve"):**
- Pagamento e assinatura
- Contas e login completo
- Turminha (conexão entre crianças da mesma turma)
- Reforço automático com base em erros reais

**Regra:** nunca mostrar como funcionando algo que não funciona.

**Nomes:**
- FotoQuest: a tela de foto
- Mundos da Lumi: os universos temáticos (Espaço, Oceano, Floresta, Castelo mágico e Dinossauros)
- Turminha: a função futura de conexão entre crianças

## 5. Regras de conteúdo e de tabuada

- **A conta é sempre calculada no código**, nunca pela IA. A IA só lê a foto e cria o enunciado.
- A tabuada usa números de 1 a 10, e o desafio principal é do 2 ao 9.
- Erros de tabuada são registrados localmente, para sugerir treino só das contas erradas.
- Feedback de erro nunca punitivo. Sempre com incentivo.
- Linguagem: português do Brasil, frases curtas, tom de aventura, sem gírias de meme.
- Não usar nomes de marcas ou jogos existentes no texto do app: Roblox, Minecraft, Pokémon, Among Us e Brawl Stars.

## 6. Privacidade e segurança (obrigatório)

- **Nenhum dado real de criança** no repositório, nos commits, nas imagens de demonstração ou no vídeo. Usar apenas dados fictícios.
- Não mostrar rostos de crianças nem nomes reais de escolas no vídeo.
- **Chave da API do Claude nunca no código.** Fica na variável `ANTHROPIC_API_KEY`, na Vercel, e é lida somente em `api/questoes.js`.
- **Chave da ElevenLabs nunca no código.** Fica na variável `ELEVENLABS_API_KEY`, na Vercel, e é lida somente em `api/voz.js` e `api/narrar.js`. Nunca no frontend, nunca em log, nunca no repositório.
- Arquivo `.env` sempre no `.gitignore`.
- **Google Agenda:** OAuth 2.0 com o escopo `https://www.googleapis.com/auth/calendar.events`, variáveis `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e `GOOGLE_REDIRECT_URI` na Vercel. O refresh token fica só num cookie httpOnly, Secure, SameSite=Lax e criptografado (AES-256-GCM, chave derivada de `GOOGLE_CLIENT_SECRET`), limitado a `/api/google`. Nunca em localStorage e nunca em log. O título do evento tem só a matéria e o nome da prova, nunca o nome da criança nem da escola. Se o envio falhar, o app oferece um arquivo `.ics`. "Apagar dados da família" também revoga o acesso no Google.
- Foto enviada pela criança é processada na função e não é armazenada no servidor na versão de demonstração.
- Para o piloto real (Corujinha), será necessário termo de consentimento dos responsáveis, conforme a LGPD (art. 14). Isso fica fora do link de domingo.

### Voz da responsável

- As frases de incentivo são gravadas no próprio aparelho, sem serviço externo e sem envio a servidor. Voz nunca é compartilhada entre famílias.
- Frases gravadas: "Oi! Vamos estudar juntos?", "Vamos lá!", quatro frases de acerto que se revezam sem repetir ("Muito bem!", "Isso mesmo!", "Que orgulho de você!" e "Você aprendeu direitinho!"), frases para 3, 5 e 10 acertos seguidos ("Três seguidas! Continue assim!", "Cinco seguidas! Você está brilhando!" e "Dez seguidas! Que luz forte!") e "Quase! Tente de novo". Um erro zera a sequência.
- Antes da primeira gravação, a tela pede consentimento com uma caixa de marcação: "Esta é a minha voz. Ela será usada só para narrar as missões da minha família, e posso apagar quando quiser." A data do consentimento é registrada.
- Cada frase pode ser ouvida, regravada e apagada. O botão "Apagar dados da família" também apaga os áudios.
- Os áudios ficam no IndexedDB do navegador, não no localStorage.
- As perguntas criadas pela IA são lidas com a voz do navegador em português. A gravação nunca é tocada para uma pergunta.

### Voz digital da família (ElevenLabs)

- Na página inicial, "Ouvir a voz da sua família": a responsável grava de 30 a 45 segundos (sem os filtros de chamada do navegador), e o app cria uma voz digital instantânea na ElevenLabs para narrar um fato curto da última missão.
- Antes da primeira gravação, a tela exige a marcação da caixa: "Esta é a minha voz. Ela será enviada à ElevenLabs para criar uma voz digital, usada só para narrar as missões da minha família. Posso apagar a voz a qualquer momento, e ela também será apagada no serviço."
- O áudio gravado vai só para a ElevenLabs e não fica guardado no app. No aparelho fica só o ID da voz, ligado à família. Uma família tem no máximo uma voz digital (nome `lumi-<ID da família>`).
- O fato (até duas frases, no máximo 300 caracteres, sem nomes de pessoas, escolas ou professoras) é criado pelo Claude na mesma leitura das fotos que gera as perguntas. As fotos não são enviadas de novo.
- Limite: 5 narrações por família por dia, contado no aparelho (constante em `js/narracao.js`). A chave da ElevenLabs também deve ter limite de crédito no painel do serviço.
- Se a voz digital não existir ou o serviço falhar, o app lê com a voz do aparelho e avisa: "Não consegui usar a voz da sua família agora. Vou ler com a voz do aparelho."
- O botão "Apagar dados da família" também apaga a voz digital na ElevenLabs e o ID guardado no aparelho.

## 7. Estrutura de arquivos

```
lumi/
├── index.html todas as telas (uma <section id="tela-..."> por tela)
├── css/
│ └── estilo.css variáveis da paleta, tamanhos e estilos gerais
├── js/
│ ├── app.js controle das telas e navegação (App.mostrarTela)
│ ├── familia.js dados da família no aparelho (localStorage por família)
│ ├── fotos.js FotoQuest: fotos do material e envio para api/questoes
│ ├── quiz.js perguntas, respostas e feedback
│ ├── pontos.js pontos, níveis e medalhas
│ ├── tabuada.js treinos de multiplicação (contas no código)
│ ├── voz.js Leia comigo, frases gravadas pela família (IndexedDB)
│ ├── narracao.js voz digital da família (ElevenLabs) e teleprompter
│ ├── curiosidades.js sorteio e busca de curiosidades sem repetir
│ ├── calendario.js provas: calendário mensal, Google Agenda e arquivo .ics
│ ├── abertura.js tela de abertura (só na primeira visita da aba)
│ ├── trilha.js textos e estado (nova ou feita) das paradas da trilha
│ └── resultado.js cartões, barra de nível e regra do "Ouvir o fato da Dóris"
├── api/ funções no servidor (Vercel), as únicas que leem chaves
│ ├── questoes.js chama o Claude (perguntas e fato curto)
│ ├── curiosidade.js lê uma curiosidade a partir de imagem (Claude)
│ ├── voz.js cria e apaga a voz digital na ElevenLabs
│ ├── narrar.js narra o fato com a voz digital (ElevenLabs)
│ ├── _elevenlabs.js ajudantes da ElevenLabs (o "_" não vira endereço)
│ └── google/ _comum, login, callback, estado, criar-evento,
│ criar-eventos (todas as provas) e desconectar
├── data/curiosidades.json banco de 150 curiosidades
├── assets/ imagens da Lumi e da Dóris; recortes/ (mascotes sem fundo) e rede-neuronios.svg
├── testes/ testes automáticos: node --test testes/
├── docs/PROXIMA-SESSAO.md prompt para começar uma nova conversa
├── docs/PROMPT-LAYOUT.md especificação do layout (seções A a I)
├── docs/referencias/ imagens de referência do layout
├── CONTEXTO.md este arquivo
└── README.md
```

**Telas em `index.html`:** abertura, inicio (trilha), fotoquest, disciplina, quiz, resultado, tabuada, narracao, pais (Área dos pais) e provas.

**Navegação:** a barra de baixo (`#nav-principal`: Trilha, Tabuada, Ouvir e Pais) aparece só no Início, no menu da Tabuada, na Narração e na Área dos pais, controlada por `App.mostrarTela`. O item "Ouvir" é o `#botao-voz-familia` e segue a regra de `Narracao.atualizarBotaoInicio()`. O botão "Apagar dados da família" (`#botao-apagar`) fica no fim da Área dos pais, longe da criança.

**Onde cada dado fica:**
- `localStorage`: `lumi.familia` guarda o ID da família, e `lumi.familia.<id>` guarda pontos, missões, tabuada, provas e o ID da voz digital.
- `IndexedDB` (`lumi-voz`): frases gravadas pela família.
- `sessionStorage` (`lumi.google.pendente`): lembra de enviar as provas depois do login no Google.
- `sessionStorage` (`lumi.abertura.vista`): a abertura já apareceu nesta aba. Na volta do login do Google (`?google=...`), a abertura não aparece.
- Cookies httpOnly em `/api/google`: estado do login (10 min) e refresh token criptografado (180 dias).

## 8. Contrato da API de questões (`api/questoes.js`)

- **Entrada:** imagem em base64 do material escolar.
- **Saída:** JSON com exatamente 5 questões, neste formato:

```json
{
  "questoes": [
    {
      "tipo": "verdadeiro_falso",
      "enunciado": "texto da afirmação",
      "resposta": true,
      "explicacao": "frase curta de explicação para a criança"
    },
    {
      "tipo": "multipla_escolha",
      "enunciado": "pergunta",
      "alternativas": ["A", "B", "C", "D", "E"],
      "resposta": "C",
      "explicacao": "frase curta"
    },
    {
      "tipo": "relacionar",
      "enunciado": "relacione as colunas",
      "colunaA": ["item 1", "item 2"],
      "colunaB": ["correspondência 1", "correspondência 2"],
      "resposta": [1, 0],
      "explicacao": "frase curta"
    },
    {
      "tipo": "dissertativa",
      "enunciado": "pergunta aberta",
      "gabarito": "resposta esperada em uma ou duas frases",
      "explicacao": "frase curta"
    }
  ]
}
```

- Se a foto não tiver conteúdo legível, a função devolve erro com a mensagem `"nao_foi_possivel_ler"`. O front mostra: "Não consegui ler essa foto. Tente de novo com mais luz."
- A função nunca devolve a chave da API nem detalhes internos em caso de erro.

## 9. Regras de trabalho com o código

- Trabalhar na branch `estrutura-inicial`, nunca na `main`. A `main` publica em produção.
- Só fazer o merge na `main` depois da confirmação da usuária, por pull request (como os PRs #1 a #6).
- Construir uma tela por vez, e fazer commits pequenos a cada passo pronto.
- Mensagens de commit em português, por exemplo "Adiciona tela de tabuada", terminando com as duas linhas de rodapé combinadas:
  ```
  Co-Authored-By: Claude Haiku 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01MVYyXg6UiaydGP5yx6gGYm
  ```
- Antes de qualquer `git push`, mostrar o diff e os comandos e aguardar confirmação.
- Rodar `node --test testes/` antes de cada commit (137 testes passando em 8/11/2026). Se aparecer 1 falha estranha no Node 22, rodar `node --test testes/*.test.js`.
- Testar primeiro na prévia da branch e mostrar o resultado antes do merge.
- Não criar bibliotecas novas sem perguntar antes.
- Manter tudo em HTML, CSS e JavaScript puros, sem framework, a menos que a usuária autorize.
- Ao terminar cada tarefa, listar os arquivos alterados e o que falta.

## 10. Critérios do Demo Day

- **Originalidade:** foto que vira missão, mundos temáticos e personagens próprios.
- **Impacto:** educação de crianças, apoio às mães e potencial de piloto em escola.
- **Prova de trabalho:** commits frequentes, versões e pelo menos um teste com usuário real.

## 11. Roteiro do vídeo (1 a 4 minutos)

- **0:00–0:20, problema:** a criança não gosta de revisar o caderno, e a mãe não tem método nem tempo para isso todo dia.
- **0:20–1:20, demonstração:** foto → FotoQuest → quiz → pontos → narração (e tabuada, se estiver pronta).
- **1:20–2:00, como foi construído:** Claude (leitura da foto, perguntas e fato), voz gravada no aparelho e voz digital da família (ElevenLabs), Claude Design ou Lovable (landing), GitHub e Vercel (publicação).
- **2:00–2:30, próximos passos:** Turminha, assinatura, calendário, piloto na Escola Corujinha e adequação à LGPD.
- Marcar "Em breve" nas funções que não estão no link.

## 12. Ambientes e variáveis (Vercel)

| Ambiente | Endereço | Branch |
|---|---|---|
| Produção | https://lumi-psi-nine.vercel.app | `main` |
| Prévia | https://lumi-git-estrutura-inicial-gaia-3fba.vercel.app | `estrutura-inicial` |

- Variáveis (só os nomes; os valores ficam na Vercel): `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e `GOOGLE_REDIRECT_URI`.
- Cada variável precisa estar marcada no ambiente certo (Production e/ou Preview). Depois de mudar uma variável, fazer **Redeploy**.
- `GOOGLE_REDIRECT_URI`: na produção, `https://lumi-psi-nine.vercel.app/api/google/callback`; na prévia, `https://lumi-git-estrutura-inicial-gaia-3fba.vercel.app/api/google/callback`. Os dois endereços estão cadastrados no cliente OAuth "Lumi Web" do Google Cloud.
- `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` precisam vir do **mesmo** cliente ("Lumi Web"). Se não vierem, o login falha com `invalid_client`.
- O app do Google está em modo de teste: só os e-mails de teste cadastrados conseguem entrar.
- `/api/google/estado` mostra, sem segredos, se o Google está configurado, se há login e para qual endereço o Google volta.

## 13. Estado atual (8/11/2026, depois do layout)

**Em produção (merge do PR #6) e funcionando:**
- FotoQuest e quiz com cinco tipos de pergunta, pontos e medalhas.
- Tabuada com quatro modos, medalhas e níveis.
- Leia comigo (voz do aparelho), frases gravadas pela família e voz digital da família (ElevenLabs) com teleprompter.
- Banco de 150 curiosidades e leitura de curiosidade a partir de imagem.
- Tela Provas: calendário mensal com a Dóris, ícones por matéria e cadastro só com a matéria ("Outra" pede o nome).
- Google Agenda: um botão "Enviar N provas para o Google Agenda", um login só, sem duplicar provas já enviadas. Se falhar, oferece `.ics` com todas as provas. Mensagens de erro mostram um código curto (ex.: `invalid_client`).
- Testado na prévia: login, criação dos eventos, login cancelado e token expirado.

**Layout novo (branch `estrutura-inicial`, etapas 1 a 10 de `docs/PROMPT-LAYOUT.md`):**
- Tema escuro com céu índigo, botões "adesivo", fontes Fredoka e Nunito e mascotes soltas (recortes sem fundo).
- Tela de abertura com a rede de neurônios (só na primeira visita da aba).
- Início em forma de trilha: topo com nível e pontos, missões salvas como paradas (nova ou feita), chip da próxima prova e barra de navegação de baixo.
- FotoQuest com a Dóris e balão, privacidade em uma linha com "Saiba mais" (texto completo) e botão "Criar minha missão".
- Quiz com barra em segmentos (um por pergunta), selo "N seguidas" (a partir de 2, some no erro) e painel de resposta preso embaixo.
- Missão completa com cartões (pontos, acertos de primeira e "sua melhor"), barra de nível e "Ouvir o fato da Dóris" (só com voz digital da família e com o fato desta missão).
- Tabuada, Narração, Área dos pais e Provas no visual novo; selo "Google Agenda conectado" em Provas.
- No desktop, o app fica numa coluna central de 480px. Contraste de 4.5:1 ou mais, área de toque de 44px e animações desligadas com movimento reduzido.
- Testado na prévia com foto fictícia e a API real: matéria diferente, quiz, resultado, trilha, Tabuada, Provas e Apagar dados.

**Falta:** testar na prévia o envio ao Google Agenda, a voz digital (ElevenLabs), "Minha voz" e o "Leia comigo"; depois, PR da `estrutura-inicial` para a `main` com a confirmação da usuária.

**Fica para depois ("Em breve" no vídeo):** mapa dos Mundos, Chefão, sequência de dias, medalhas de missão, Turminha, login e assinatura, reforço automático. O teclado numérico na tela da Tabuada (opcional) não foi feito.
