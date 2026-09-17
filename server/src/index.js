const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

app.get('api/health', (req, res) => {
    res.json({ status: 'ok', app: 'VitoriaBet API '});
});

// 2. Consulta de dados e saldo do usuário logado (usando o jogador1 do seed)
app.get('/api/user/me', async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { username: 'jogador1'},
            select: { id: true, username: true, balance: true}
        });

        if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar dados do usuário' });
  }
});

// 3. Catálogo de jogos com filtro opcional por provedora
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

    res.json(games);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar catálogo de jogos' });
  }
});

// 4. Inicializar sessão de um jogo (Launch Token)
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

    // Token seguro único por sessão
    const sessionToken = crypto.randomBytes(32).toString('hex');

    await prisma.gameSession.create({
      data: {
        token: sessionToken,
        userId: Number(userId),
        gameId: game.id
      }
    });

    // URL simulada de launch (aponta para um ambiente de demonstração)
    const launchUrl = `https://demo.vitoriabet.local/game/${game.gameCode}?token=${sessionToken}`;

    res.json({
      gameTitle: game.title,
      token: sessionToken,
      launchUrl
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao inicializar sessão do jogo' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 VitoriaBet Server rodando na porta ${PORT}`);
});
    