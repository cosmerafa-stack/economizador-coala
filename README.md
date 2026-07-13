# Economizador Coala 🐨📦

App de comparação de preços de notas fiscais (NFC-e) na Bahia, com dois
públicos: **Consumidor** (economizar na compra) e **Revendedor** (comprar
barato pra revender com lucro). Tem também uma **Área do Gestor** (admin
oculta) e uma **Área Beta** com 8 funções experimentais pro Revendedor.

- **Produção:** https://economizadorcoala.cosmerafa.workers.dev
- **Repositório:** https://github.com/cosmerafa-stack/economizador-coala
- **Pasta local:** `D:\LucroJa`

## Como chamar o Claude de novo neste projeto

Basta abrir uma conversa nova e mencionar **"Economizador Coala"** ou pedir
pra trabalhar na pasta **`D:\LucroJa`** — qualquer um dos dois já é
suficiente pra eu reconhecer que é este projeto. Se quiser deixar ainda
mais explícito, pode falar algo como:

> "Estou no projeto Economizador Coala (D:\LucroJa), o app de comparação
> de preços que já trabalhamos antes."

## Stack

- **Next.js 16** (App Router). Build de produção usa `next build --webpack`
  — o Turbopack tem incompatibilidade conhecida com o adaptador OpenNext.
- **Cloudflare Workers** via `@opennextjs/cloudflare`, deploy com
  `npm run deploy`.
- **Neon Postgres** (região São Paulo), acessado via
  `@neondatabase/serverless`.
- **Zustand** com `persist` (localStorage, chave `solucro-storage`) —
  fonte imediata de UI; dados do revendedor (carrinho, notas, config,
  alertas) também sincronizam com o Neon por conta, não só por aparelho.
- **Gemini** (`gemini-3-flash-preview`) pra leitura de notas fiscais por
  foto/PDF.
- **Google Identity Services** pro login "Continuar com o Google".

## Papéis

- **Consumidor** — busca e compara preços, sem dados de revenda.
- **Revendedor** — cadastro com aprovação do gestor, carrinho com % de
  lucro, notas fiscais organizadas, rota de compra, acesso à Área Beta.
  Login por e-mail/senha ou "Continuar com o Google".
- **Gestor** — acesso oculto: arrastar o ícone do foguete até o ícone de
  tema na tela inicial, depois senha (`GESTOR_PASSWORD`). Aprova
  cadastros, controla limite de dispositivos, tem uma página de
  documentação técnica em `/gestor/documentacao`.

## Área Beta (Revendedor)

🔔 Alerta de preço-alvo · 🧮 Otimizador de lista · 📈 Histórico de preço ·
🎯 Radar de oportunidade · 🤝 Preço colaborativo · 🧾 Comparar suas notas ·
💰 Relatório de economia · ⏳ Prazo de troca/garantia

## Variáveis de ambiente (`.env.local`)

Veja `.env.local.example` para a lista completa. Resumo do que cada uma faz:

| Variável | Pra quê |
|---|---|
| `DATABASE_URL` / `DATABASE_URL_POOLED` | Neon Postgres |
| `GEMINI_API_KEY` | Leitura de notas fiscais por IA |
| `GESTOR_PASSWORD` | Senha de acesso à Área do Gestor |
| `GESTOR_TOKEN_SECRET` | Assinatura do token de sessão do gestor |
| `ALERTAS_CRON_SECRET` | Autoriza o workflow do GitHub Actions a rodar a verificação de alertas em segundo plano |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Login "Continuar com o Google" (Client ID é público, sem problema estar no bundle do cliente) |
| `NEXT_PUBLIC_SUPABASE_*` | Resquício do início do projeto — não é mais usado (migrou pro Neon) |

Essas mesmas variáveis (exceto as `NEXT_PUBLIC_*`, que são embutidas no
build) precisam estar configuradas como *secrets* no Cloudflare Workers
(`wrangler secret put NOME`) pra funcionar em produção.

## Rodando localmente

```bash
npm install
npm run dev
```

## Publicando

```bash
npm run deploy
```

Isso roda `opennextjs-cloudflare build && opennextjs-cloudflare deploy`.
**No Windows**, se der erro `EPERM` ao apagar `.open-next`, é porque algum
processo (geralmente o próprio `npm run dev` ou um preview do navegador)
está com um arquivo daquela pasta aberto — pare o processo e rode
`rm -rf .open-next` antes de tentar de novo.

## Estado atual (última sessão)

Tudo abaixo já está em produção:

- **Persistência do revendedor por conta**: carrinho, notas, configurações
  (% de lucro, raio de busca) e alertas de preço-alvo agora sincronizam
  com o Neon atrelados à conta — sobrevivem a limpar cache ou trocar de
  celular (antes só viviam no `localStorage`).
- **Confiabilidade da busca de preços**: sessão do scraper é invalidada
  na hora quando leva 429 (evita ficar travado por até 10 min repetindo
  falha pra todo mundo); buscas em lote (Otimizador, Comparar notas)
  viraram sequenciais em vez de paralelas, pra não estourar o limite da
  fonte compartilhada com uma única ação.
- **Terceira rota de busca**: quando busca ao vivo e cache de 24h falham,
  reconstrói resultado a partir do próprio histórico acumulado
  (`price_history`, até 7 dias) — com endereço/telefone/coordenadas
  completos, não só uma estatística.
- **Cache local de resultados**: voltar do carrinho pra `/resultados` ou
  trocar a ordenação não refaz a busca à toa (reaproveita por 5 min);
  ordenação agora é espelhada entre `/buscar` e `/resultados`.
- **Alerta de preço-alvo**: só dispara com nota emitida há menos de 24h e
  busca ao vivo (evita mostrar preço já ultrapassado); botão "Verificar
  agora"; mostra endereço/distância/mapa da loja ao disparar; verificação
  em segundo plano configurável (padrão 15 min, via GitHub Actions +
  throttle por dispositivo); resolve o nome do produto quando o alerta é
  criado por código de barras.
- **Código de barras**: não mostra mais números sem sentido quando a
  fonte não tem GTIN real cadastrado.
- **Contato com a loja**: botão de WhatsApp no carrinho, com telefone da
  própria busca ou fallback gratuito (OpenStreetMap → BrasilAPI →
  ReceitaWS) quando não há telefone — sem custo, sem IA paga.
- **Login "Continuar com o Google"**: vincula conta existente pelo
  e-mail, ou cria cadastro novo (passa pela mesma aprovação do gestor e
  mesmo limite de dispositivos do cadastro por senha).
- **PWA**: ícone (coala real + caixa do revendedor na frente, fundo
  branco), manifest, barra de status que acompanha o tema claro/escuro.

### Pendências conhecidas (não bloqueantes)

- Relevância de busca por substring às vezes casa produto errado (ex:
  "macarrao" já trouxe uma peça de borracharia) — não corrigido, é uma
  limitação de como a fonte de dados casa termos.
- Rotas do Gestor (`/api/gestor/*`) e alertas de preço já têm autenticação
  de servidor; se algum dia adicionar mais rotas administrativas, seguir
  o mesmo padrão (`gestorAuth.server.ts` / `revendedorAuth.server.ts`).
