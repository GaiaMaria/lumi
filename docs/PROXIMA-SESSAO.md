# Prompt para a próxima sessão

Copie o bloco abaixo e cole como primeira mensagem de uma nova conversa com o Claude Code, aberta na pasta `lumi`.

---

```
Projeto Lumi (app de estudo gamificado para crianças de 9 a 12 anos, Demo Day).
Antes de tudo, leia o CONTEXTO.md inteiro. Ele tem as regras, a estrutura, os ambientes e o estado atual.

Regras de trabalho (resumo, o CONTEXTO.md manda):
- Trabalhe na branch estrutura-inicial, nunca na main. A main publica em produção.
- Commits pequenos em português, com as duas linhas de rodapé combinadas:
  Co-Authored-By: Claude Haiku 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01MVYyXg6UiaydGP5yx6gGYm
- Rode node --test testes/ antes de cada commit.
- Mostre o diff e os comandos e aguarde minha confirmação antes de cada push.
- Merge na main só por pull request e depois da minha confirmação. Me mostre o resultado na prévia antes.
- HTML, CSS e JavaScript puros, sem framework nem biblioteca nova sem perguntar.
- Cores e tamanhos só com as variáveis CSS de css/estilo.css.
- Nenhum dado real de criança. Chaves só na Vercel, nunca no código, no frontend ou em log.
- Português do Brasil, frases curtas, sem marcas de jogos.

Estado: tudo da etapa anterior está em produção (PR #6) e funcionando,
inclusive o Google Agenda com o botão que envia todas as provas.

Nova etapa: LAYOUT. Quero melhorar a aparência das telas.
Antes de mudar qualquer coisa, me faça um briefing: o que você entendeu,
quais telas vai mexer primeiro e o que precisa que eu decida.
```
