import request from 'supertest';
import { startServer } from './configServer';
import { logger } from '../utils/logger';

jest.mock('../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    },
}));

describe('Config Server Integration Tests', () => {
    let server: any;

    beforeAll(() => {
        server = startServer({ customPort: '8888' });
    });

    afterAll((done) => {
        server.close(done);
    });

    it('should respond to GET /archetypes/:archetype', async () => {
        const response = await request(server).get('/archetypes/node-fullstack');
        expect(response.status).toBe(200);
    });

    it('should respond to GET /archetypes/:archetype/rules', async () => {
        const response = await request(server).get('/archetypes/node-fullstack/rules');
        expect(response.status).toBe(200);
    });

    it('should respond to POST /telemetry with shared secret', async () => {
        const response = await request(server)
            .post('/telemetry')
            .set('x-shared-secret', process.env.XFI_SHARED_SECRET || '')
            .send({
                eventType: 'test',
                metadata: {},
                timestamp: new Date().toISOString(),
            });
        expect(response.status).toBe(200);
    });

    it('should reject POST /telemetry without shared secret', async () => {
        const response = await request(server)
            .post('/telemetry')
            .send({
                eventType: 'test',
                metadata: {},
                timestamp: new Date().toISOString(),
            });
        expect(response.status).toBe(403);
    });
});
