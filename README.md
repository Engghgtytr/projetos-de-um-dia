# Projetos de um dia

Projetos curtos de portfólio da Penchel.Dev, inspirados no vídeo "6 coding projects you can code in a day". Cada pasta é um site estático, sem build: dá para abrir o `index.html` ou publicar a pasta na Vercel.

| Pasta | O que é | O que mostra |
|---|---|---|
| `perto-de-mim` | Busca pizzarias, cafés, barbearias e oficinas no mapa e marca quais **não têm site** | API pública (OpenStreetMap), mapa com Leaflet, estados de carregando/vazio/erro |
| `atendente-por-voz` | Atendente que ouve a pergunta e responde falando (hamburgueria fictícia Chapa Sete) | Web Speech API, sem servidor e sem chave. Teste: `node teste.mjs` |
| `pocket-rave` | Bateria eletrônica de 16 passos com telinha estilo OLED | Web Audio (som gerado na hora), agendamento preciso, canvas |
| `vitrine-animada` | Quatro animações de produto só com CSS `@keyframes` | `transform`/`opacity`, reduzir movimento, código ao lado |
| `site-pessoal` | Portfólio do Enzo com os projetos reais | Layout simples, acessível, tema escuro |

O "Pocket Rave" do vídeo é com Arduino de verdade; aqui ele virou uma versão web. A análise de livros com Python ainda falta, porque precisa do arquivo de dados.

Rodar no PC: `python -m http.server 5510` nesta pasta e abrir http://localhost:5510.
