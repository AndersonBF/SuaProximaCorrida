# Corra Melhor 🏃

Agregador de corridas de rua por região. Reúne provas cadastradas em diversos
sites de inscrição (Ticket Sports, Sympla, Doity, etc.) em um só lugar, com
nome, data, local, distâncias, preço e **link oficial de inscrição**.

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Prisma** + **PostgreSQL** (via Docker)
- **Tailwind CSS**
- Painel admin com autenticação por senha (cookie assinado)
- Arquitetura de **scrapers plugável** para coletar dados automaticamente

## Como rodar

```bash
# 1. Instalar dependências
npm install

# 2. Subir o banco (Postgres na porta 5433)
npm run db:up

# 3. Criar as tabelas
npm run db:push

# 4. Popular o banco:
npm run scrape      # corridas REAIS do PR (recomendado) — ver seção Scraping
#   ou
npm run db:seed     # 9 corridas reais fixas (demo offline, sem internet)

# 5. Rodar em desenvolvimento
npm run dev
```

Acesse:
- Site público: http://localhost:3000
- Painel admin: http://localhost:3000/admin (senha em `.env` → `ADMIN_PASSWORD`)

## Variáveis de ambiente (`.env`)

| Variável                   | Descrição                                  |
| -------------------------- | ------------------------------------------ |
| `DATABASE_URL`             | conexão Postgres                           |
| `ADMIN_PASSWORD`           | senha do painel admin                      |
| `ADMIN_SESSION_SECRET`     | segredo para assinar o cookie de sessão    |
| `NEXT_PUBLIC_DEFAULT_STATE`| UF padrão exibida na home (ex: `SP`)       |
| `NEXT_PUBLIC_SITE_NAME`    | nome do site                               |

## Cadastro manual

Tudo é gerenciável pelo painel `/admin`: criar, editar, publicar/arquivar e
excluir corridas. Cada corrida guarda o link de inscrição do site de origem.

## Scraping (coleta automática)

A coleta é plugável: cada site vira um arquivo em `src/scrapers/` implementando
a interface `Scraper` (ver `src/scrapers/types.ts`). Os scrapers ativos ficam
registrados em `src/scrapers/index.ts`.

**Scraper principal: `corridasbr`** (`src/scrapers/corridasbr.ts`)
Lê os calendários estaduais do corridasbr.com.br (`Calendario.asp` + `2` + `3`,
cobrindo vários meses), abre a página de cada evento e extrai nome, data,
cidade, local de largada, distâncias, organizador e o **link real de inscrição**
(Ticket Sports, Sympla, Doity, etc.) — que o site guarda em `siteevento.asp?c=`.
Depois acessa a própria página de inscrição para pegar também:
- **imagem** (cartaz): `og:image` → JSON-LD → primeiro `<img>` de conteúdo
  (validado por HEAD para não gravar imagem quebrada);
- **preço**: valores `R$ X,XX` do HTML, com heurística que ignora taxas (<R$20)
  e premiação (>R$900 ou teto > 5× o piso).

Plataformas 100% JavaScript (ex: Ticket Sports) não expõem preço no HTML, então
nesses casos o preço fica "Sob consulta". Funciona para qualquer UF.

```bash
npm run scrape          # usa a UF de NEXT_PUBLIC_DEFAULT_STATE (PR)
npm run scrape -- SP    # força a UF
CORRA_SCRAPE_LIMIT=5 npm run scrape -- PR   # limita nº de eventos (testes)
```

O runner deduplica por `(source, externalId)` (onde `externalId` é o id do
evento no corridasbr), então rodar várias vezes **atualiza** em vez de
duplicar. A fonte exibida (`source`) é a plataforma real de inscrição.

Agende com cron (Linux) ou Agendador de Tarefas (Windows) para manter
atualizado — ex: diariamente.

> O `src/scrapers/sympla.ts` permanece como exemplo de outra abordagem (API
> JSON), mas não está ativo no registro.

> ⚠️ **Antes de ativar um scraper:** confira os Termos de Uso e o `robots.txt`
> de cada site. Prefira APIs oficiais quando existirem. Os exemplos são
> defensivos (retornam vazio em caso de erro) e os endpoints/seletores podem
> precisar de ajuste conforme os sites mudam.

## Próximos passos sugeridos

- Adicionar mais scrapers (Ticket Sports, Doity, Central da Corrida...)
- Filtro por mês/data e por faixa de preço na home
- Geolocalização ("corridas perto de mim") com lat/long
- Página por cidade (SEO)
- Newsletter / alertas de novas corridas
