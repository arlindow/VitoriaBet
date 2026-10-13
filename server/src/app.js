require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.app.github.dev')) {
      callback(null, true);
    } else {
      callback(new Error('Bloqueado pela política de CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// Rota raiz
app.get('/', (req, res) => {
  res.send('🎰 VitoriaBet API Online');
});

// F1: Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', app: 'VitoriaBet API' });
});

// F2: Perfil e Saldo do Usuário
app.get('/api/user/me', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { username: 'jogador1' },
      select: { id: true, username: true, balance: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.status(200).json(user);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar dados do usuário' });
  }
});

// F3: Catálogo de Jogos com Filtro
app.get('/api/games', async (req, res) => {
  const { provider } = req.query;
  try {
    const where = { active: true };
    if (provider && provider !== 'ALL') {
      where.provider = provider.toUpperCase();
    }

    const games = await prisma.game.findMany({
      where,
      orderBy: { id: 'asc' }
    });

    res.status(200).json(games);
  } catch {
    res.status(500).json({ error: 'Erro ao carregar catálogo de jogos' });
  }
});

// F4: Launch Game (Sessão de Jogo)
app.post('/api/games/launch', async (req, res) => {
  const { userId, gameId } = req.body;

  if (!userId || !gameId) {
    return res.status(400).json({ error: 'userId e gameId são obrigatórios' });
  }

  try {
    const game = await prisma.game.findUnique({
      where: { id: Number(gameId) }
    });

    if (!game) {
      return res.status(404).json({ error: 'Jogo não encontrado' });
    }

    const sessionToken = crypto.randomBytes(32).toString('hex');

    await prisma.gameSession.create({
      data: {
        token: sessionToken,
        userId: Number(userId),
        gameId: game.id
      }
    });

    const launchUrl = `https://demo.vitoriabet.local/game/${game.gameCode}?token=${sessionToken}`;

    res.status(200).json({
      gameTitle: game.title,
      token: sessionToken,
      launchUrl
    });
  } catch {
    res.status(500).json({ error: 'Erro ao inicializar sessão do jogo' });
  }
});

// F5: Seamless Wallet - Débito de Aposta Atômico & Idempotente
app.post('/api/wallet/bet', async (req, res) => {
  const { token, amount, referenceId } = req.body;

  if (!token || !amount || !referenceId) {
    return res.status(400).json({ error: 'token, amount e referenceId são obrigatórios' });
  }

  const betValue = Number(amount);
  if (isNaN(betValue) || betValue <= 0) {
    return res.status(400).json({ error: 'Valor da aposta inválido' });
  }

  try {
    // 1. Idempotência: impede processar a mesma aposta duas vezes
    const existingTx = await prisma.transaction.findUnique({
      where: { referenceId }
    });

    if (existingTx) {
      return res.status(409).json({ error: 'Transação já processada' });
    }

    // 2. Busca e validação da sessão
    const session = await prisma.gameSession.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!session) {
      return res.status(404).json({ error: 'Sessão de jogo inválida ou expirada' });
    }

    // 3. Execução Atômica via transação
    const result = await prisma.$transaction(async (tx) => {
      const currentUser = await tx.user.findUnique({
        where: { id: session.userId }
      });

      if (Number(currentUser.balance) < betValue) {
        throw new Error('SALDO_INSUFICIENTE');
      }

      const updatedUser = await tx.user.update({
        where: { id: session.userId },
        data: {
          balance: { decrement: betValue }
        }
      });

      const transaction = await tx.transaction.create({
        data: {
          userId: session.userId,
          amount: betValue,
          type: 'BET',
          referenceId
        }
      });

      return {
        newBalance: updatedUser.balance,
        transactionId: transaction.id
      };
    });

    res.status(200).json(result);
  } catch (err) {
    if (err.message === 'SALDO_INSUFICIENTE') {
      return res.status(402).json({ error: 'Saldo insuficiente' });
    }
    res.status(500).json({ error: 'Erro interno ao processar aposta' });
  }
});

module.exports = { app, prisma, pool };