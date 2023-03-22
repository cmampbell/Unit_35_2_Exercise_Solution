process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('./app');
const db = require('./db');

describe('Testing 404 handler', () => {
    test('Does server return 404 for route that does not exist', async () => {
        const resp = await request(app).get('/qqqqqqqqqqqqq')

        expect(resp.statusCode).toBe(404);
        expect(resp.body).toEqual({'error': {'message' :'Not Found', 'status': 404}})
    })
})

afterAll(async () => {await db.end()})