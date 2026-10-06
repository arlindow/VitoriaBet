require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

// Cria o pool de conexão com o PostgreSQL do Neon
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const app = express();

app.use(cors({ origin: '*' }));
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
  } catch (err) {
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
  } catch (err) {
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
  } catch (err) {
    res.status(500).json({ error: 'Erro ao inicializar sessão do jogo' });
  }
});

module.exports = { app, prisma };


