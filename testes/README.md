# Testes do Lumi

## Testes automáticos

```bash
node --test testes/
```

- `api.test.js`: função `api/questoes.js` com a resposta do Claude simulada (sem chave, pedido inválido, JSON inválido, foto ilegível, limite de 10 perguntas, tipos variados, logs sem conteúdo).
- `quiz.test.js`: correção no navegador e contas conferidas no código.

## Imagens de teste (`imagens/`)

Todas foram criadas por nós, com textos próprios e fictícios. Não há páginas de livro didático, apostila, nomes ou rostos.

| Arquivo | Para que serve |
|---|---|
| `caderno-ficticio.jpg` | Foto nítida de caderno (Ciências) |
| `texto-digitado.jpg` | Texto digitado em uma folha (História) |
| `foto-borrada.jpg` | Foto borrada e escura |
| `outra-disciplina-matematica.jpg` | Página de outra disciplina (Matemática) |
