# Prompt: novo layout do Lumi (tema escuro + trilha)

Copie o bloco abaixo e cole como primeira mensagem de uma conversa nova do Claude Code, aberta na pasta `lumi`.

---

```
Projeto Lumi. Nova etapa: LAYOUT. Antes de tudo:

0) Faça git pull na branch estrutura-inicial. Eu enviei arquivos novos:
   - assets/recortes/ (10 PNGs das mascotes sem fundo)
   - assets/rede-neuronios.svg (rede de neurônios da tela de abertura, já com animação)
   - docs/referencias/abertura.png, rascunho-escuro.png e mapa.png (como as telas devem ficar)
   - docs/PROMPT-LAYOUT.md (este prompt, com a especificação completa abaixo)
1) Leia o CONTEXTO.md inteiro e este docs/PROMPT-LAYOUT.md inteiro.
2) Abra e olhe as 3 imagens de docs/referencias/. Atenção: nas imagens as fontes
   aparecem com serifa só porque foram geradas sem internet. As fontes certas são
   Fredoka (títulos e botões) e Nunito (texto).
3) Antes de mudar qualquer código, me mande um briefing curto: o que entendeu,
   a ordem das etapas e qualquer dúvida. Espere meu "pode".

Siga TODAS as regras do CONTEXTO.md (branch estrutura-inicial, commits pequenos em
português com o rodapé combinado, testes antes de cada commit, diff e confirmação
antes de cada push, nada de framework ou biblioteca nova, nenhum dado real de criança).

A especificação completa está em docs/PROMPT-LAYOUT.md, seções A a I.
```

---

## A. Objetivo

Trocar a aparência do app inteiro para o visual aprovado, **sem perder nenhuma função que já funciona**.

- **Tema:** escuro, com as cores da paleta atual (céu índigo).
- **Botões:** estilo "adesivo", com contorno quase preto, sombra dura deslocada e fonte Fredoka.
- **Início em forma de trilha** (estilo Duolingo), feita com as **missões salvas que já existem** (`Familia.missoes()`).
- **Mascotes soltas**, sem moldura quadrada ou redonda, usando os PNGs de `assets/recortes/`.
- **Tela de abertura nova**, com a rede de neurônios e a frase "Cada acerto acende uma luz."

**Regra de ouro:** o layout muda, o comportamento não. Só entram as funções novas e pequenas da seção F, e todas usam dados que já existem.

**Não implementar** (são "Em breve", só aparecem no vídeo): mapa dos Mundos, Chefão, sequência de dias, medalhas de missão, Turminha, login e assinatura, reforço automático.

## B. O que NÃO pode quebrar (manter intacto)

1. **Todos os `id` do `index.html`** (são cerca de 140), os atributos `data-ir`, `data-modo`, `role`, `aria-*` e os `hidden` iniciais. O JavaScript depende deles. Pode mudar a ordem, envolver em novos `div` e trocar classes de estilo, mas **nunca renomear ou apagar um `id`**.
2. **Classes que o JavaScript cria ou procura** (por exemplo `missao`, `missao__nome`, `missao__detalhe`, `cartao-prova*`, `frases`, `modo--*`, `feedback`, `tela`). Antes de renomear uma classe, faça `grep` em `js/`. Se o JS usar a classe, mantenha e só restilize.
3. **Nada em `api/`, `data/`, chaves, rotas, `localStorage`, `IndexedDB`, `sessionStorage` e cookies.** Os nomes de dados ficam iguais.
4. **Os 119 testes passando.** Se `node --test testes/` acusar 1 falha estranha (acontece no Node 22), rode `node --test testes/*.test.js`.
5. **Regras de texto do CONTEXTO.md:**
   - Texto sobre menta, laranja ou sol sempre em índigo.
   - Violeta só com texto branco.
   - Erro sempre com incentivo ("Quase! Tente de novo.").
   - No máximo 3 cores de destaque por tela.
   - Nunca mostrar como funcionando algo que não funciona.

## C. Sistema visual (em `css/estilo.css`)

Adicione as variáveis abaixo **junto das que já existem** (não apague nenhuma) e use só variáveis no resto do CSS.

```css
:root {
  /* contorno e sombra dos "botões adesivo" */
  --contorno: #0B0920;
  --sombra-dura: 3px 3px 0 var(--contorno);
  --sombra-dura-pressionada: 1px 1px 0 var(--contorno);
  --borda-adesivo: 2.5px solid var(--contorno);
  --texto-escuro: var(--fundo);            /* índigo sobre cores claras */
  --trilha-apagada: var(--borda);          /* pontinhos do caminho */
  --balao: var(--creme);                   /* balões de fala das mascotes */
  --fonte-titulo: "Fredoka", "Nunito", system-ui, sans-serif;
  --fonte-texto: "Nunito", system-ui, sans-serif;
  --raio-botao: 16px;
  --raio-cartao: 18px;
  --fundo-ceu: radial-gradient(120% 60% at 50% 0%, var(--superficie) 0%, var(--fundo) 55%, var(--fundo-escuro) 100%);
}
```

**Fontes.** Hoje o CSS pede Nunito, mas ninguém carrega a fonte, então aparece a fonte do sistema. Adicione no `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@600;700;800;900&display=swap" rel="stylesheet">
```

Eu autorizo esse link de fontes. Não é uma biblioteca de código.

**Componentes:**

- **Fundo das telas:** `var(--fundo-ceu)`, com texto `var(--texto)` e texto secundário `var(--texto-suave)`.
- **`.botao-principal`:**
  - fundo `var(--primaria)`, texto branco, `border: var(--borda-adesivo)`, `box-shadow: var(--sombra-dura)`;
  - `font-family: var(--fonte-titulo)`, peso 700, altura mínima de 52px, `border-radius: var(--raio-botao)`;
  - no `:active`, `transform: translate(2px,2px)` e `box-shadow: var(--sombra-dura-pressionada)`;
  - no `:disabled`, opacidade de 0.5 e sem sombra.
- **`.botao-secundario`:**
  - fundo `var(--superficie)`, texto `var(--texto)`, `border: var(--borda-adesivo)`, `box-shadow: var(--sombra-dura)`;
  - altura mínima de 48px.
- **Variações coloridas** (crie classes modificadoras, sem mexer nos ids). O texto é sempre `var(--texto-escuro)`:
  - laranja `--doris`: fotos e narração;
  - sol `--atencao`: provas;
  - menta `--sucesso`: continuar e acerto;
  - info `--info`: Leia comigo e tempo.
- **Chips** (matérias e escolhas):
  - altura de 36px, raio de 10px, borda de 2px `var(--contorno)`, fundo `var(--superficie)`;
  - o selecionado fica com fundo `var(--sucesso)`, texto escuro e `var(--sombra-dura)`.
- **Cartões** (antigo `.vidro`): fundo `var(--superficie)`, borda de 2.5px `var(--borda)`, raio `var(--raio-cartao)`.
- **Barra de progresso:**
  - trilho `var(--fundo-escuro)` com borda de 2px `var(--contorno)`, preenchimento `var(--sucesso)`;
  - no tempo da tabuada, o preenchimento é `var(--info)`.
- **Balão de fala:**
  - fundo `var(--balao)`, texto `var(--texto-escuro)`, borda `var(--borda-adesivo)`;
  - raio de 16px, com o canto inferior esquerdo de 4px;
  - fonte Fredoka 500.
- **Mascotes:** sempre `<img>` dos PNGs de `assets/recortes/` com `object-fit: contain`, **sem moldura, círculo ou quadrado**. Pode haver um brilho suave atrás da Lumi (`radial-gradient` menta transparente).
- **Acessibilidade:**
  - área de toque de pelo menos 44px;
  - `:focus-visible` com contorno de 3px `var(--brilho)`;
  - contraste de pelo menos 4.5:1;
  - animações dentro de `@media (prefers-reduced-motion: reduce)` desligadas.
- **Desktop:** o app fica numa coluna central de no máximo 480px, com o céu ocupando a tela toda. Isso é importante para o vídeo.

## D. Imagens: onde usar cada recorte

| Arquivo em `assets/recortes/` | Onde |
|---|---|
| `lumi-lapis.png` | Início, ao lado do balão |
| `lumi-comemorando.png` | Painel de acerto do quiz e frases de sequência da tabuada |
| `lumi-abraco-lapis.png` | Topo da Tabuada |
| `lumi-lendo.png` | Reserva (por exemplo, esperando a narração) |
| `doris-acenando.png` | FotoQuest, com balão |
| `doris-livro.png` | Tela "Hmm, será a matéria certa?" (tela-disciplina) |
| `doris-olhos-fechados.png` | Narração: esperando e ouvindo |
| `doris-joinha.png` | Área dos pais e Provas |
| `duas-comemorando.png` | Missão completa (resultado) e fim do treino da tabuada |
| `duas-lapis.png` | Narração: gravar a voz |

Os recortes foram feitos de forma automática. Se alguma borda ficar escura demais em cima do fundo, aplique `filter: drop-shadow(0 0 12px rgb(167 243 208 / .25))` nas imagens da Lumi. As imagens antigas de `assets/` continuam no repositório (não apague).

## E. Tela por tela

Use as referências em `docs/referencias/rascunho-escuro.png` e `abertura.png`.

### E1. Abertura (NOVA: `<section class="tela" id="tela-abertura">`)

- **Fundo:** céu, com `assets/rede-neuronios.svg` ocupando a metade de cima. A Lumi (`lumi-comemorando.png`) fica no centro da rede, flutuando de leve (animação de 4s, 8px), **sem nenhuma linha passando por baixo dela**.
- **Título "Lumi":** Fredoka 700, cerca de 68px, com brilho menta (`text-shadow`).
- **Frase:** "Cada acerto acende uma luz." em `var(--brilho)`.
- **Botão `.botao-principal` "Começar"** com seta, `data-ir="inicio"`.
- **Link "Área dos pais"** com `data-ir="pais"`.
- **Quando aparece:** abre na primeira visita da aba. Guarde `lumi.abertura.vista` no `sessionStorage`; nas próximas vezes, abre direto no Início.
- **Exceção importante:** quando a página volta do login do Google (`?google=...`), **não** mostrar a abertura, porque `Calendario.aoVoltarDoGoogle()` precisa levar para Provas como hoje. Teste esse caso.

### E2. Início = trilha (`tela-inicio`)

- **Topo (novo):**
  - pílula "Nível N", barra de progresso do nível (`Pontos.nivel()`: `noNivel` / `PONTOS_POR_NIVEL`) e "X/50" ao lado;
  - pílula menta com o total de pontos;
  - atualizar em `Inicio.atualizar()`.
- **Lumi e balão:** `lumi-lapis.png` à esquerda e o balão "Oi! Bora transformar o caderno em missão?". O cabeçalho antigo (`cabecalho__*`) pode ser restilizado ou escondido, mas **o `h1` com "Lumi" deve continuar existindo** para a acessibilidade (pode ficar visualmente oculto).
- **Botão principal "Nova missão":** o mesmo botão de hoje (`data-ir="fotoquest"`), com o texto curto "Nova missão" e o ícone de câmera.
- **Trilha (reaproveita `#missoes` e `#lista-missoes`):**
  - cada `li.missao` vira uma "parada": um círculo grande com o nome da matéria e o detalhe ao lado;
  - missão nova (`vezes` = 0): círculo `var(--atencao)` com estrela e halo, botão "Começar";
  - missão feita: círculo `var(--sucesso)` com um ✓ em SVG e "melhor: …";
  - o botão continua chamando `FotoQuest.jogar(...)` como hoje, e o círculo inteiro pode ser o botão;
  - zigue-zague com `:nth-child` (deslocar à esquerda e à direita) e pontinhos `var(--trilha-apagada)` ligando as paradas;
  - **sem missões:** em vez de esconder a seção, mostrar uma parada apagada com o texto "Sua primeira missão começa com uma foto".
- **Chip "próxima prova" (novo):** se `DatasDeProva.proxima(Familia.provas())` existir, mostrar "Prova de <matéria> em N dias" (ou "hoje" ou "amanhã") num chip amarelo com `data-ir="provas"`. Se não existir, esconder.
- **"Leia comigo" (`area-doris`):** mantenha o elemento, mas tire o card grande com a imagem quadrada. Hoje a navegação para a narração é o `#botao-voz-familia`: mantenha esse botão (restilizado e laranja) ou mova a função para a barra de navegação (E10), **respeitando a mesma regra de visibilidade** (`Narracao.atualizarBotaoInicio()`).
- **Mover "Área dos pais" e "Apagar dados da família"** para fora do Início:
  - "Área dos pais" vai para a barra de navegação;
  - o `#botao-apagar` vai para dentro da `tela-pais`, mantendo o mesmo `id` e o mesmo comportamento (o `window.confirm` e a mensagem final);
  - a mensagem `#mensagem-inicio` continua existindo.

### E3. FotoQuest (`tela-fotoquest`)

- **Topo:** botão voltar quadradinho (ícone), com o título "FotoQuest" em Fredoka.
- **Dóris e balão:** `doris-acenando.png` com o balão "Mostra o que você estudou que eu viro missão!".
- **Matérias em chips** (estilo C); o campo "Outra" continua igual.
- **Fotos:**
  - miniaturas com leve rotação e borda;
  - "Tirar foto" em botão laranja, "Galeria" em botão secundário;
  - os inputs de arquivo, os limites (1 a 10 fotos, JPG, PNG ou HEIC) e as mensagens de erro continuam iguais.
- **Privacidade:**
  - mostrar uma linha: "Fotos viram missão e são apagadas.";
  - logo abaixo, `<details>` "Saiba mais" com **o texto completo de hoje, sem cortar nada** (inclui a parte da ElevenLabs).
- **Declaração:** a caixa de marcação continua igual, e o `#botao-enviar` continua desativado até tudo estar certo. Texto do botão: "Criar minha missão".
- **Tela "Hmm, será a matéria certa?"** (`tela-disciplina`): mesmo comportamento, com `doris-livro.png` e os botões no novo estilo.
- **Carregando:** mantenha a lógica de hoje; só restilize.

### E4. Quiz (`tela-quiz`)

- **Barra de progresso** (`#quiz-progresso-barra`): segmentos, um por pergunta. Gere a quantidade a partir do total de perguntas, sem fixar 5 no código.
- **Selo "N seguidas" (novo):**
  - use o `seguidas` que `Incentivo.acerto()` já devolve;
  - aparece a partir de 2 seguidas, em pílula laranja com texto escuro;
  - some no erro, porque `Incentivo.erro()` zera a contagem.
- **Pontos:** o `#quiz-pontos` fica numa pílula menta.
- **Pergunta:** o enunciado fica em Fredoka 600, com cerca de 20px. O botão `#botao-leia` vira um quadrado azul (`--info`) com o ícone de alto-falante ao lado do enunciado, com `aria-label` "Leia comigo". O aviso `#aviso-voz` continua igual.
- **Alternativas:**
  - viram botões grandes no estilo `.botao-secundario`;
  - a resposta certa fica com fundo `var(--brilho)` e texto escuro;
  - a errada fica com borda `var(--erro)`.
- **Os 5 tipos de pergunta continuam funcionando:** verdadeiro ou falso, múltipla escolha, completar lacunas, relacionar e dissertativa. Restilize os campos de cada um.
- **Feedback (`#quiz-feedback`):** vira um painel fixo embaixo, estilo Duolingo:
  - acerto: fundo verde-escuro (mistura de `--fundo` com `--sucesso`), texto `var(--brilho)` e `lumi-comemorando.png` pequena;
  - erro: fundo com `--atencao`, texto escuro e "Quase! Tente de novo." com a explicação;
  - o `#quiz-proxima` fica dentro do painel, em botão menta.
- **Modo demonstração:** o `#aviso-demo` continua aparecendo quando não há API.

### E5. Missão completa (`tela-resultado`)

- **Imagem:** `duas-comemorando.png`, solta.
- **Título e detalhe:** "Missão completa!" e o detalhe de hoje (`#resultado-detalhe`).
- **Três cartões lado a lado:**
  - pontos (menta), com o `#resultado-pontos` mantido;
  - acertos;
  - "sua melhor", quando for uma missão salva repetida (`Familia.missao(id).melhorPontuacao`). Se não houver, mostre só 2 cartões.
- **Barra de nível (nova):** "Nível N → N+1" e "faltam X pontos", com `Pontos.nivel()`.
- **Botões:**
  - "Ouvir o fato da Dóris" (laranja, `data-ir="narracao"`): só aparece se a missão tiver fato e a narração estiver disponível, com a mesma regra do `#botao-voz-familia`;
  - "Voltar à trilha" (`data-ir="inicio"`) e "Nova missão" (`data-ir="fotoquest"`) continuam.

### E6. Tabuada (`tela-tabuada`)

- **Topo:** `lumi-abraco-lapis.png`, o título, a barra de nível de hoje (`#tabuada-nivel*`) e "Nível N · faltam X pontos".
- **Medalhas (`#tabuada-medalhas`):**
  - vitrine com as 4 medalhas reais: Detetive dos números, Mestre da tabuada, Relâmpago e Nunca desisto;
  - ganha: círculo colorido;
  - ainda não ganha: cinza com o nome em `--texto-suave`.
- **Modos:**
  - os 4 botões `data-modo` viram botões grandes coloridos no estilo adesivo, com o texto escuro e a mesma ordem de hoje;
  - cores: falta = laranja, número = sol, desafio = info, revisão = menta;
  - o "Revisão de erros" continua aparecendo e sumindo como hoje.
- **Escolha do número:** botões em grade.
- **Jogo (`#tabuada-jogo`):**
  - a conta em Fredoka grande, com brilho;
  - o campo de resposta grande, com borda menta;
  - o tempo (`#tabuada-tempo`) numa pílula azul;
  - o `#tabuada-conferir` e o `#tabuada-proxima` no estilo novo;
  - o feedback no mesmo estilo do quiz.
  - Teclado numérico na tela: **opcional**. Só faça se sobrar tempo e sem quebrar o `<input>` atual nem o envio com Enter.
- **Fim (`#tabuada-fim`):** `duas-comemorando.png`, a medalha e o nível conquistados, "Jogar de novo" e "Escolher outro modo".
- **Regras do CONTEXTO.md que continuam valendo:**
  - a conta é sempre calculada no código, nunca pela IA;
  - o timer é de 60s;
  - os erros ficam registrados no aparelho.

### E7. Voz da família / narração (`tela-narracao`)

- **Gravar (`#narracao-gravar`):**
  - imagem `duas-lapis.png`;
  - a caixa de consentimento com o texto exato de hoje;
  - o roteiro num cartão creme com texto escuro, para facilitar a leitura;
  - o cronômetro grande;
  - o botão "Começar a gravar" no estilo principal.
- **Esperando:** `doris-olhos-fechados.png` e a barra de progresso no estilo novo.
- **Ouvir:**
  - `doris-olhos-fechados.png`;
  - o teleprompter num cartão com o rótulo "Fato da sua última missão" ou "Curiosidade" (`#narracao-origem`);
  - "Ouvir" num botão grande laranja com ícone de play;
  - "Curiosidade aleatória" em botão secundário;
  - o `#narracao-restantes` mostra o limite diário (5 por dia).
  - O `<details>` "Ler outra curiosidade" continua, com o texto livre de até 300 caracteres, o contador, o envio de imagem e o botão "Ler esta curiosidade".
- **O que não pode mudar:**
  - o fallback "Não consegui usar a voz da sua família agora. Vou ler com a voz do aparelho.";
  - o limite de 5 narrações por dia;
  - a gravação de 30 a 45s;
  - nada de filtros de chamada na gravação.

### E8. Área dos pais (`tela-pais`)

- **Topo:** o título e `doris-joinha.png` pequena.
- **Botão para Provas:** cartão-botão amarelo "Provas: datas e Google Agenda" (`data-ir="provas"`).
- **"Voz digital da família":** cartão com o estado (`#pais-voz-digital-estado`), "Gravar a voz de novo" e "Apagar a voz digital", com as mesmas regras de visibilidade.
- **"Minha voz":** cartão com o consentimento, a data e a lista de frases (`#voz-frases`). Cada frase pode ser ouvida, regravada e apagada, como hoje. O IndexedDB continua igual.
- **No fim:** o `#botao-apagar` "Apagar dados da família", como link vermelho (`--erro`) com área de toque de 44px. Ele faz exatamente o que faz hoje:
  - apaga os dados, as provas, os áudios do IndexedDB e a voz na ElevenLabs;
  - desconecta o Google;
  - mostra a mensagem final.

### E9. Provas (`tela-provas`)

- **Calendário (`#provas-*`):** num cartão, com as setas de mês e os dias com prova marcados em amarelo (texto escuro). Hoje fica em violeta.
- **Botões:** "Próxima prova", "Adicionar prova" e o formulário (matéria; "Outra" pede o nome), com salvar e cancelar no estilo novo.
- **Cartão do dia (`#provas-cartao`):** ícones por matéria (`cartao-prova--*`) mantidos e restilizados.
- **Google Agenda:**
  - o botão "Enviar todas as provas para o Google Agenda" (texto com N, como hoje), o login, o `.ics` de reserva, a situação com o código curto de erro e o "Desconectar Google Agenda";
  - **nada muda no fluxo**, só no estilo;
  - quando estiver conectado, mostrar um selo menta "Google Agenda conectado".
- **Imagem:** troque a `doris-livro.jpg` desta tela por `doris-joinha.png`, ou mantenha a imagem atual sem moldura.

### E10. Barra de navegação de baixo (NOVA: `<nav id="nav-principal">`)

- **Itens:**
  - Trilha (`data-ir="inicio"`);
  - Tabuada (`data-ir="tabuada"`);
  - Ouvir (`data-ir="narracao"`): **some** quando `#botao-voz-familia` estiver escondido (mesma regra);
  - Pais (`data-ir="pais"`).
- **Onde aparece:** só no Início, no menu da Tabuada, na Narração e na Área dos pais. **Não aparece** na Abertura, no FotoQuest, na tela de matéria, no Quiz, no Resultado, no jogo da Tabuada nem em Provas, que tem o botão voltar.
- **Implementação:** controle em `App.mostrarTela`; marque o item ativo com `aria-current="page"`.
- **Estilo:**
  - fundo `var(--fundo-escuro)` com borda `var(--borda)`, altura de 60px e ícones SVG de traço (sem emoji);
  - o item ativo fica em `var(--brilho)`;
  - fixa embaixo, dentro da coluna de 480px;
  - deixe um espaço no fim do conteúdo para a barra não cobrir nada.

## F. Funções novas permitidas (pequenas e isoladas)

1. **Abertura e `sessionStorage`** (E1), com a exceção da volta do Google.
2. **Topo do Início** com nível e pontos (E2).
3. **Trilha:** só muda a marcação das missões salvas e o estado vazio (E2).
4. **Chip da próxima prova** (E2).
5. **Selo "N seguidas"** no quiz (E4).
6. **Barra de nível e "sua melhor"** no resultado (E5).
7. **Barra de navegação** (E10).
8. **Mudança de lugar** do `#botao-apagar` (E2 e E8).

Para cada uma: se der para testar no Node (por exemplo, o texto "em N dias" da próxima prova ou a escolha entre "nova" e "feita"), crie uma função pura e um teste em `testes/`.

## G. Ordem de trabalho (um commit por etapa, testes antes de cada um)

1. Variáveis, fontes, botões, chips, cartões, barras e fundo, em todas as telas de uma vez (só CSS e o `<link>` das fontes).
2. Abertura.
3. Início: topo, trilha, chip e navegação de baixo, e a mudança de lugar do apagar.
4. FotoQuest e tela da matéria.
5. Quiz: os 5 tipos, o painel de feedback e o selo de seguidas.
6. Resultado.
7. Tabuada: menu, jogo e fim.
8. Narração: gravar, esperando e ouvir.
9. Área dos pais e Provas.
10. Desktop (coluna de 480px) e revisão de acessibilidade (foco, contraste, 44px, animações reduzidas).
11. Prévia na Vercel e checklist da seção H. Depois, me mostre os prints de cada tela.

Depois de cada etapa: liste os arquivos alterados, mostre o diff e espere meu "pode" para o push.

## H. Checklist de regressão (testar na prévia antes do merge)

**Abertura e navegação**
- [ ] A abertura aparece na primeira visita da aba e não reaparece ao voltar ao Início.
- [ ] Voltar do login do Google leva a Provas, sem passar pela abertura.
- [ ] Todos os `data-ir` funcionam, e a barra de baixo aparece só onde deve.

**Missão com foto**
- [ ] Sem API, o modo demonstração funciona e mostra o aviso.
- [ ] Foto ilegível mostra a mensagem de hoje.
- [ ] Matéria diferente mostra "Hmm, será a matéria certa?" com os botões Continuar e Trocar.
- [ ] As validações de fotos funcionam: de 1 a 10, só JPG, PNG ou HEIC, HEIC sem suporte, foto grande demais.
- [ ] A declaração bloqueia o envio até ser marcada.

**Quiz**
- [ ] Os 5 tipos de pergunta funcionam e são corrigidos.
- [ ] Os pontos sobem.
- [ ] "Leia comigo" lê a pergunta com a voz do aparelho, e a gravação da família nunca toca na pergunta.
- [ ] As frases gravadas pela família tocam no acerto, revezando sem repetir; 3, 5 e 10 seguidas têm frase própria; um erro zera a sequência e o selo "N seguidas" some.
- [ ] O erro sempre aparece com incentivo.

**Missões salvas**
- [ ] A missão fica salva, aparece na trilha e "Estudar de novo" funciona.
- [ ] A melhor pontuação é atualizada.

**Tabuada**
- [ ] Os 4 modos funcionam.
- [ ] O desafio de 60s para o relógio ao sair da tela.
- [ ] As medalhas e o nível aparecem certos.
- [ ] A revisão de erros mostra só as contas erradas.

**Voz da família e narração**
- [ ] Gravar exige o consentimento, aceita de 30 a 45s e cria a voz.
- [ ] Ouvir funciona, com o limite de 5 por dia.
- [ ] Se a voz falhar, o app usa a voz do aparelho e mostra o aviso.
- [ ] Curiosidade aleatória funciona.
- [ ] O texto livre aceita até 300 caracteres e a imagem com curiosidade é lida.

**Minha voz**
- [ ] O consentimento é pedido e a data fica registrada.
- [ ] Cada frase pode ser gravada, ouvida, regravada e apagada.

**Provas e Google Agenda**
- [ ] O calendário troca de mês.
- [ ] Adicionar prova funciona, e "Outra" pede o nome.
- [ ] "Próxima prova", o cartão do dia e remover funcionam.
- [ ] "Enviar N provas" faz um login só e não duplica provas já enviadas.
- [ ] Se o envio falhar, o `.ics` é oferecido e o código curto de erro aparece.
- [ ] Desconectar funciona.

**Apagar dados**
- [ ] Apagar dados da família (agora na Área dos pais) apaga tudo, inclusive os áudios, a voz na ElevenLabs e o acesso ao Google.

**Geral**
- [ ] Funciona no celular (375px) e no desktop (coluna central).
- [ ] O app continua usável com animações reduzidas.
- [ ] `node --test testes/*.test.js`: todos passando.

## I. Ao terminar

- Liste os arquivos alterados e o que ficou de fora.
- Atualize a seção 13 ("Estado atual") do `CONTEXTO.md` e a seção 3, com as novas variáveis, as fontes e os recortes.
- Nada de merge na `main` sem a minha confirmação.
