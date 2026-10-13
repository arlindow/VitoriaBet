# VitoriaBet - Documentação Completa do Projeto

## 1. Visão Geral

O VitoriaBet é uma API backend para simular um ambiente de cassino online / jogos de apostas, com foco em:

- catálogo de jogos ativos;
- sessão de jogo por usuário;
- controle de saldo do jogador;
- debito atômico de apostas;
- idempotência de transações para evitar duplicidade de apostas;
- persistência em banco PostgreSQL usando Prisma ORM.

O projeto está em fase de backend funcional, com testes automatizados em nível de API. A parte de frontend ainda não foi implementada dentro do repositório atual.

## 2. Objetivo do Sistema

O sistema foi estruturado para validar o fluxo principal de um cassino digital:

1. o jogador consulta seu perfil e saldo;
2. navega pelo catálogo de jogos;
3. inicia uma sessão de jogo;
4. envia uma aposta com um `referenceId` único;
5. o backend valida saldo e reduz o valor do usuário;
6. registra a transação de forma idempotente.

Esse fluxo é o núcleo de uma solução de gaming / sportsbook, mesmo em uma implementação simplificada e demonstrativa.

## 3. Stack Tecnológica

### Backend
- Node.js
- Express.js
- Prisma ORM
- PostgreSQL
- Dotenv
- CORS
- PostgreSQL driver (`pg`)

### Testes
- Vitest
- Supertest

### Banco de Dados
- PostgreSQL (configurado para uso em Neon.tech, mas compatível com qualquer PostgreSQL)

## 4. Estrutura do Repositório

```text
VitoriaBet/
├── .gitignore
├── doc.md
├── doc01.md
├── sonar-project.properties
├── server/
│   ├── .env.example
│   ├── .setup.ps1
│   ├── package.json
│   ├── package-lock.json
│   ├── seed.js
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   │       └── 20260924204003_init_vitoriabet_tables/
│   │           └── migration.sql
│   ├── src/
│   │   ├── app.js
│   │   └── index.js
│   └── tests/
│       └── api.test.js
└── client/
    └── .gitkeep
```

Observações:
- O diretório `server` contém toda a lógica funcional do projeto.
- O diretório `client` está vazio e serve como espaço futuro para o frontend.
- `doc.md` contém a sequência de criação do projeto e notas de desenvolvimento.
- `doc01.md` é a documentação consolidada e completa do sistema.

## 5. Arquitetura

A aplicação segue uma arquitetura simples em camadas:

### Camada de Entrada
- Express cria a API HTTP.
- CORS habilita acesso externo em origem configurada.
- `express.json()` permite receber payloads em JSON.

### Camada de Negócio
- Rota `/api/games` busca jogos ativos.
- Rota `/api/games/launch` gera uma sessão de jogo.
- Rota `/api/user/me` retorna dados do jogador de demonstração.
- Rota `/api/wallet/bet` processa a aposta.

### Camada de Persistência
- Prisma realiza leitura e gravação no PostgreSQL.
- O banco principal possui tabelas de usuários, jogos, sessões e transações.

### Camada de Testes
- Supertest simula requisições HTTP reais.
- Vitest valida o comportamento das rotas e regras de negócio.

## 6. Modelo de Dados

O schema principal está em `server/prisma/schema.prisma`.

### 6.1 Entidade `User`

```prisma
model User {
    id Int @id @default(autoincrement())
    username String @unique
    email String @unique
    passwordHash String 
    balance Decimal @default(0.00) @db.Decimal(20, 2)
    sessions GameSession[]
    transactions Transaction[]
    createdAt DateTime @default(now())
    updateAt DateTime @updatedAt

    @@map("users")
}
```

Descrição:
- `id`: identificador do usuário.
- `username`: nome de usuário único.
- `email`: e-mail único.
- `passwordHash`: hash de senha (apenas em demo/educacional).
- `balance`: saldo em decimais com duas casas.
- `sessions`: sessões de jogo do usuário.
- `transactions`: transações registradas do usuário.

### 6.2 Entidade `Game`

```prisma
model Game {
    id Int @id @default(autoincrement())
    gameCode String @unique
    title String
    provider String
    category String
    bannerUrl String 
    active Boolean @default(true)
    sessions GameSession[]
    createdAt DateTime @default(now())

    @@map("games") 
}
```

Descrição:
- `gameCode`: identificador único do jogo.
- `title`: nome exibido ao jogador.
- `provider`: provedor do jogo, por exemplo `PRAGMATIC` ou `PGSOFT`.
- `category`: categoria do jogo.
- `bannerUrl`: imagem de capa.
- `active`: indica se o jogo está disponível.

### 6.3 Entidade `GameSession`

```prisma
model GameSession {
    id String @id @default(uuid())
    token String @unique
    userId Int 
    user User @relation(fields: [userId], references: [id], onDelete: Cascade)
    gameId Int 
    game Game @relation(fields: [gameId], references: [id], onDelete: Cascade)
    createdAt DateTime @default(now())

    @@map("game_sessions")
}
```

Descrição:
- `token`: token único da sessão para autenticar a atividade do jogo.
- `userId`: usuário dono da sessão.
- `gameId`: jogo associado.

### 6.4 Entidade `Transaction`

```prisma
model Transaction {
    id Int @id @default(autoincrement())
    userId Int 
    user User @relation(fields: [userId], references: [id], onDelete: Cascade)
    amount Decimal @db.Decimal(20,2)
    type String
    referenceId String @unique
    createdAt DateTime @default(now())

    @@map("transactions")
}
```

Descrição:
- `amount`: valor da transação da aposta ou ganho.
- `type`: tipo da transação (`BET`, `WIN`, `DEPOSIT`).
- `referenceId`: identificador único externo para evitar duplicidade.

## 7. Fluxo Principal de Negócio

### 7.1 Health Check

Rota:
- `GET /api/health`

Resposta:

```json
{
  "status": "ok",
  "app": "VitoriaBet API"
}
```

### 7.2 Perfil do Usuário

Rota:
- `GET /api/user/me`

Exemplo de resposta:

```json
{
  "id": 1,
  "username": "jogador1",
  "balance": "500.00"
}
```

Observações:
- O usuário demo é criado no script de seed (`jogador1`).
- O balance retorna como string em Decimal/Prisma, por convenção do Prisma.

### 7.3 Catálogo de Jogos

Rota:
- `GET /api/games`
- `GET /api/games?provider=PGSOFT`

Comportamento:
- filtra jogos ativos;
- aceita filtro por `provider`;
- retorna lista ordenada por `id`.

Exemplo:

```json
[
  {
    "id": 1,
    "gameCode": "gates-of-olympus",
    "title": "Gates of Olympus",
    "provider": "PRAGMATIC",
    "category": "SLOTS",
    "bannerUrl": "https://...",
    "active": true,
    "createdAt": "2026-..."
  }
]
```

### 7.4 Inicialização de Sessão do Jogo

Rota:
- `POST /api/games/launch`

Body:

```json
{
  "userId": 1,
  "gameId": 2
}
```

Comportamento:
- valida se `userId` e `gameId` existem;
- busca o jogo;
- gera um token único `crypto.randomBytes(32).toString('hex')`;
- cria uma `GameSession` no banco;
- retorna `gameTitle`, `token` e `launchUrl`.

Exemplo de resposta:

```json
{
  "gameTitle": "Sweet Bonanza",
  "token": "a4ee1ca0...",
  "launchUrl": "https://demo.vitoriabet.local/game/sweet-bonanza?token=a4ee1ca0..."
}
```

### 7.5 Aposta / Wallet

Rota:
- `POST /api/wallet/bet`

Body:

```json
{
  "token": "session-token-aqui",
  "amount": 10,
  "referenceId": "bet-uuid-001"
}
```

Comportamento:
- exige `token`, `amount` e `referenceId`;
- valida valor positivo;
- verifica se `referenceId` já foi usado;
- valida se existe a sessão `GameSession`;
- executa a redução de saldo dentro de uma transação `prisma.$transaction`;
- impede saldo negativo;
- retorna erro `409` para transação duplicada;
- retorna erro `402` para saldo insuficiente.

Exemplo de sucesso:

```json
{
  "newBalance": 490,
  "transactionId": 12
}
```

Exemplo de erro de duplicidade:

```json
{
  "error": "Transação já processada"
}
```

Exemplo de erro de saldo:

```json
{
  "error": "Saldo insuficiente"
}
```

## 8. Regras de Negócio Importantes

### 8.1 Idempotência

A API usa `referenceId` como identificador único da transação para evitar processamento duplicado de apostas.

Se o mesmo `referenceId` for enviado novamente, a API responde:
- status `409`;
- mensagem: `Transação já processada`.

### 8.2 Consistência do Saldo

O débito de aposta ocorre dentro de uma transação atômica:

1. valida usuário e saldo;
2. decrementa saldo;
3. cria a transação de aposta;
4. confirmando tudo em um único bloco de processamento.

Se qualquer etapa falhar, a transação é revertida.

### 8.3 Segurança Básica

O projeto implementa medidas iniciais de segurança:
- CORS com origem controlada;
- validação de payload obrigatório;
- validação de valores numéricos;
- bloqueio de contas duplicadas por unique constraints;
- sessão com token aleatório para cada jogo.

## 9. Variáveis de Ambiente

Arquivo esperado:
- `server/.env`

Exemplo:

```env
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
PORT=3001
ALLOWED_ORIGINS="http://localhost:5173"
```

Arquivo público de referência:
- `server/.env.example`

```env
DATABASE_URL="******host/neondb?sslmode=require"
PORT=3001
```

## 10. Instalação e Execução

### 10.1 Pré-requisitos

- Node.js 18+
- npm
- PostgreSQL acessível
- banco configurado com URL em `DATABASE_URL`

### 10.2 Instalação

No diretório `server`:

```bash
cd server
npm install
```

### 10.3 Configuração do Banco

Crie o arquivo `.env` a partir do exemplo:

```bash
cp .env.example .env
```

Depois ajuste a variável `DATABASE_URL`.

### 10.4 Execução da Migração

```bash
cd server
npx prisma migrate dev --name init_vitoriabet_tables
```

Esse comando cria as tabelas no banco e sincroniza o cliente Prisma.

### 10.5 População do Banco com Dados Demo

```bash
cd server
node seed.js
```

Esse script cria:
- usuário `jogador1` com saldo inicial;
- catálogo de jogos iniciais.

### 10.6 Iniciar a API

```bash
cd server
npm run dev
```

A aplicação inicia na porta configurada pelo `.env` (por padrão `3001`).

## 11. Testes

O projeto possui suíte automatizada de testes em `server/tests/api.test.js`.

### 11.1 Comando para Rodar os Testes

```bash
cd server
npm test
```

### 11.2 Cobertura da Suíte

A suíte valida:
- health check;
- retorno do usuário e saldo;
- carregamento do catálogo;
- filtro por provedora;
- criação de sessão com token;
- débito de aposta com sucesso;
- idempotência da transação;
- rejeição de aposta com saldo insuficiente.

## 12. Arquivos Chave

### `server/src/app.js`

Implementa a API Express e a lógica principal de negócio.

### `server/src/index.js`

Versão de bootstrap direta da API, com `app.listen()` no arquivo principal.

### `server/prisma/schema.prisma`

Define o modelo do banco de dados e os relacionamentos.

### `server/seed.js`

Cria usuário demo e jogos iniciais.

### `server/tests/api.test.js`

Valida as rotas e regras principais da aplicação.

## 13. Considerações de Projeto e Melhorias Futuras

O projeto atual atende ao objetivo de demonstrar uma arquitetura funcional para um cassino digital, porém ainda há espaço para evoluções, incluindo:

- autenticação real com JWT ou sessões seguras;
- registro de ganhos e payouts;
- endpoint de histórico de transações;
- suporte a múltiplos usuários e admin;
- painel de administração para gestão de jogos;
- front-end em React/Vite;
- integração com provedores de jogos externos;
- rate limiting e proteção contra abuso;
- logs estruturados e observabilidade;
- testes de regressão e integração contínua.

## 14. Conclusão

O VitoriaBet, neste estado, é um backend funcional de demonstração para um cassino online, com estrutura de dados bem definida, rotas essenciais implementadas, persistência real em PostgreSQL e testes automatizados para validar o comportamento principal.

Ele serve como base sólida para evoluir para um produto completo com frontend, autenticação, gestão financeira e operações de cassino mais sofisticadas.

## 15. Resumo Executivo

- Backend em Node.js + Express
- Banco em PostgreSQL via Prisma
- Entidades principais: usuários, jogos, sessões e transações
- Fluxo principal: catálogo → sessão → aposta → débito → transação
- Testes com Vitest + Supertest
- Preparado para expansão com frontend e funcionalidades de produção
