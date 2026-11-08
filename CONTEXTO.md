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

**Regras de cor:**
- Texto sobre menta, laranja ou sol sempre em índigo, nunca em branco.
- Violeta só como fundo de botão, com texto branco.
- Coral para erro, sempre com incentivo: "Quase! Tente de novo."
- No máximo três cores de destaque na mesma tela.

**Mascotes:**
- **Lumi:** vaga-lume verde-menta, com asas violeta. Aparece nos acertos, nas medalhas e no guia das missões. Arquivos: `assets/lumi.jpg` e `assets/lumi-comemorando.jpg`.
- **Dóris:** coruja laranja com barriga creme, que lê um livro em voz alta. Aparece na área de fotos e na leitura. Arquivo: `assets/doris.jpg`.
- **Referência de cena:** `assets/referencia-cena.jpeg`, com as duas juntas. Usar como base da landing.

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

- Na página inicial, "Ouvir a voz da sua família": a responsável grava de 1 a 2 minutos, e o app cria uma voz digital instantânea na ElevenLabs para narrar um fato curto da última missão.
- Antes da primeira gravação, a tela exige a marcação da caixa: "Esta é a minha voz. Ela será enviada à ElevenLabs para criar uma voz digital, usada só para narrar as missões da minha família. Posso apagar a voz a qualquer momento, e ela também será apagada no serviço."
- O áudio gravado vai só para a ElevenLabs e não fica guardado no app. No aparelho fica só o ID da voz, ligado à família. Uma família tem no máximo uma voz digital (nome `lumi-<ID da família>`).
- O fato (até duas frases, no máximo 300 caracteres, sem nomes de pessoas, escolas ou professoras) é criado pelo Claude na mesma leitura das fotos que gera as perguntas. As fotos não são enviadas de novo.
- Limite: 5 narrações por família por dia, contado no aparelho (constante em `js/narracao.js`). A chave da ElevenLabs também deve ter limite de crédito no painel do serviço.
- Se a voz digital não existir ou o serviço falhar, o app lê com a voz do aparelho e avisa: "Não consegui usar a voz da sua família agora. Vou ler com a voz do aparelho."
- O botão "Apagar dados da família" também apaga a voz digital na ElevenLabs e o ID guardado no aparelho.

## 7. Estrutura de arquivos

```
lumi/
├── index.html tela inicial e navegação entre telas
├── css/
│ └── estilo.css variáveis da paleta e estilos gerais
├── js/
│ ├── app.js controle das telas e navegação
│ ├── quiz.js perguntas, respostas e feedback
│ ├── tabuada.js treinos de multiplicação (contas no código)
│ ├── pontos.js pontos, níveis e medalhas
│ ├── voz.js gravação, consentimento e narração
│ └── calendario.js provas e revisão (se houver tempo)
├── api/
│ ├── questoes.js função no servidor que chama o Claude (perguntas e fato)
│ ├── voz.js função no servidor que cria e apaga a voz digital na ElevenLabs
│ └── narrar.js função no servidor que narra o fato com a voz digital (ElevenLabs)
├── assets/ imagens da Lumi, da Dóris e da referência
├── CONTEXTO.md este arquivo
└── README.md
```

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

- Construir uma tela por vez, e fazer commit a cada tela pronta.
- Mensagens de commit em português, por exemplo "Adiciona tela de tabuada".
- Antes de qualquer `git push`, mostrar os comandos e aguardar confirmação.
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
