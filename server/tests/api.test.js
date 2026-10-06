import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
const { app, prisma, pool } = require('../src/app');

describe('VitoriaBet Core API Suite', () => {

  afterAll(async () => {
    await prisma.$disconnect();
    if (pool) await pool.end();
  });

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
      expect(response.body).toHaveProperty('balance');
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
      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach(game => {
        expect(game.provider).toBe('PGSOFT');
      });
    });
  });

  describe('F4: Launch Game Session', () => {
    it('deve falhar com 400 se faltarem parâmetros', async () => {
      const response = await request(app)
        .post('/api/games/launch')
        .send({});
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('deve criar uma sessão com token único para um jogo válido', async () => {
      const gameRes = await request(app).get('/api/games');
      const targetGame = gameRes.body[0];

      const userRes = await request(app).get('/api/user/me');
      const targetUser = userRes.body;

      const launchRes = await request(app)
        .post('/api/games/launch')
        .send({ userId: targetUser.id, gameId: targetGame.id });

      expect(launchRes.status).toBe(200);
      expect(launchRes.body).toHaveProperty('token');
      expect(launchRes.body.token.length).toBe(64);
      expect(launchRes.body.launchUrl).toContain(targetGame.gameCode);
    });
  });
});

