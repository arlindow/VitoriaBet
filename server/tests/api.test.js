import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
const { app, prisma, pool } = require('../src/app');

describe('VitoriaBet Core API Suite', () => {

  afterAll(async () => {
    await prisma.$disconnect();
    if (pool) await pool.end();
  });

  // Helper para eliminar código duplicado nos testes
  const createTestSession = async () => {
    const userRes = await request(app).get('/api/user/me');
    const gameRes = await request(app).get('/api/games');
    const user = userRes.body;
    const game = gameRes.body[0];

    const sessionRes = await request(app)
      .post('/api/games/launch')
      .send({ userId: user.id, gameId: game.id });

    return { user, game, token: sessionRes.body.token };
  };

  describe('F1: Health Check', () => {
    it('deve responder status 200 e confirmar que a API está online', async () => {
      const response = await request(app).get('/api/health');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok', app: 'VitoriaBet API' });
    });
  });

  describe('F2: Usuário e Saldo', () => {
    it('deve retornar o perfil de jogador1 com saldo cadastrado', async () => {
      const response = await request(app).get('/api/user/me');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body.username).toBe('jogador1');
      expect(Number(response.body.balance)).toBeGreaterThanOrEqual(0);
    });
  });

  describe('F3: Catálogo de Jogos', () => {
    it('deve listar todos os jogos ativos', async () => {
      const response = await request(app).get('/api/games');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('deve filtrar jogos exclusivamente da PGSOFT', async () => {
      const response = await request(app).get('/api/games?provider=PGSOFT');
      expect(response.status).toBe(200);
      response.body.forEach(game => {
        expect(game.provider).toBe('PGSOFT');
      });
    });
  });

  describe('F4: Launch Game Session', () => {
    it('deve falhar com 400 se faltarem parâmetros', async () => {
      const response = await request(app).post('/api/games/launch').send({});
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('deve criar uma sessão com token único para um jogo válido', async () => {
      const { game, token } = await createTestSession();
      expect(token).toBeDefined();
      expect(token.length).toBe(64);
    });
  });

  describe('F5: Seamless Wallet - Débito de Aposta (/api/wallet/bet)', () => {
    it('deve debitar o saldo com sucesso e garantir idempotência', async () => {
      const { user, token } = await createTestSession();
      const initialBalance = Number(user.balance);
      const betAmount = 10.00;
      const referenceId = `bet-${crypto.randomUUID()}`;

      const betRes = await request(app)
        .post('/api/wallet/bet')
        .send({ token, amount: betAmount, referenceId });

      expect(betRes.status).toBe(200);
      expect(Number(betRes.body.newBalance)).toBeCloseTo(initialBalance - betAmount, 2);

      // Idempotência
      const duplicateRes = await request(app)
        .post('/api/wallet/bet')
        .send({ token, amount: betAmount, referenceId });

      expect(duplicateRes.status).toBe(409);
    });

    it('deve rejeitar aposta se o saldo for insuficiente', async () => {
      const { token } = await createTestSession();
      const referenceId = `bet-fail-${crypto.randomUUID()}`;

      const res = await request(app)
        .post('/api/wallet/bet')
        .send({ token, amount: 9999999.00, referenceId });

      expect(res.status).toBe(402);
      expect(res.body.error).toMatch(/insuficiente/i);
    });
  });
});