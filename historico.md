# Passo 1: Inicializar a Pasta Raiz e o Git (ok)
Abra o terminal do seu Codespaces e execute:

mkdir vitoriabet-core
cd vitoriabet-core
git init
mkdir server client
Crie o arquivo .gitignore na raiz:

cat << 'EOF' > .gitignore
# Dependências
node_modules/
dist/
build/

# Variáveis sensíveis
.env
.env.*
!.env.example

# Logs
*.log
npm-debug.log*

# Sistema
.DS_Store
EOF

# Passo 2: Criar o Banco no Neon.tech (nok)
Acesse o Neon.tech.
Crie um projeto chamado vitoriabet.
Em Connection details, copie a string de conexão:
postgresql://usuario:senha@ep-exemplo.region.neon.tech/neondb?sslmode=require

# Passo 3: Configurar o Servidor (Node.js + Prisma) (nok)
No terminal, acesse a pasta server e instale as dependências:

cd server
npm init -y
npm install express cors dotenv @prisma/client
npm install prisma --save-dev
npx prisma init

# Passo 4: Configurar as Variáveis de Ambiente (nok)
Abra o arquivo server/.env que acabou de ser gerado e substitua a linha DATABASE_URL pela URL que você copiou do Neon:

DATABASE_URL="postgresql://usuario:senha@ep-exemplo.region.neon.tech/neondb?sslmode=require"
PORT=3001
Crie o arquivo server/.env.example (versão pública sem as senhas):

cat << 'EOF' > .env.example
DATABASE_URL="postgresql://user:password@host/neondb?sslmode=require"
PORT=3001
EOF

# Passo 6: Definir o Schema do Prisma (ok)
Abra o arquivo server/prisma/schema.prisma

# Passo 7: Executar a Migração no Neon.tech (nok)
No terminal, certifique-se de estar dentro da pasta server e rode a migração:

Bash
cd server
npx prisma migrate dev --name init_vitoriabet_tables
Esse comando faz duas coisas:

Conecta no Neon e cria as tabelas reais (users, games, game_sessions, transactions).

Gera a biblioteca cliente do Prisma atualizada para o Node.js.

# Passo 8: Popular o Banco com Jogos Iniciais (Seed)
Para não começar com o catálogo vazio, crie o arquivo server/seed.js: 

* atenção para usuario de teste criado com saldo...

Execute o seed no terminal:

Bash
node seed.js

# Passo 9: Registrar no Git
