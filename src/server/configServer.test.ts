import request from 'supertest';
import express from 'express';
import { archetypeRoute } from './routes/archetypeRoute';
import { archetypeRulesRoute } from './routes/archetypeRulesRoute';
import { archetypeRuleRoute } from './routes/archetypeRuleRoute';
import { telemetryRoute } from './routes/telemetryRoute';
import { clearCacheRoute } from './routes/clearCacheRoute';
import { viewCacheRoute } from './routes/viewCacheRoute';
import { githubWebhookRoute } from './routes/githubWebhookRoute';
import { checkSharedSecret } from './middleware/checkSharedSecret';

jest.mock('./routes/archetypeRoute');
jest.mock('./routes/archetypeRulesRoute');
jest.mock('./routes/archetypeRuleRoute');
jest.mock('./routes/telemetryRoute');
jest.mock('./routes/clearCacheRoute');
jest.mock('./routes/viewCacheRoute');
jest.mock('./routes/githubWebhookRoute');
jest.mock('./middleware/checkSharedSecret');

const app = express();

app.get('/archetypes/:archetype', archetypeRoute);
app.get('/archetypes/:archetype/rules', archetypeRulesRoute);
app.get('/archetypes/:archetype/rules/:rule', archetypeRuleRoute);
app.post('/telemetry', checkSharedSecret, telemetryRoute);
app.post('/clearcache', checkSharedSecret, clearCacheRoute);
app.get('/viewcache', checkSharedSecret, viewCacheRoute);
app.post('/github-webhook', githubWebhookRoute);

describe('configServer', () => {
  it('should route GET /archetypes/:archetype to archetypeRoute', async () => {
    await request(app).get('/archetypes/test-archetype');
    expect(archetypeRoute).toHaveBeenCalled();
  });

  it('should route GET /archetypes/:archetype/rules to archetypeRulesRoute', async () => {
    await request(app).get('/archetypes/test-archetype/rules');
    expect(archetypeRulesRoute).toHaveBeenCalled();
  });

  it('should route GET /archetypes/:archetype/rules/:rule to archetypeRuleRoute', async () => {
    await request(app).get('/archetypes/test-archetype/rules/test-rule');
    expect(archetypeRuleRoute).toHaveBeenCalled();
  });

  it('should route POST /telemetry to telemetryRoute with checkSharedSecret middleware', async () => {
    await request(app).post('/telemetry');
    expect(checkSharedSecret).toHaveBeenCalled();
    expect(telemetryRoute).toHaveBeenCalled();
  });

  it('should route POST /clearcache to clearCacheRoute with checkSharedSecret middleware', async () => {
    await request(app).post('/clearcache');
    expect(checkSharedSecret).toHaveBeenCalled();
    expect(clearCacheRoute).toHaveBeenCalled();
  });

  it('should route GET /viewcache to viewCacheRoute with checkSharedSecret middleware', async () => {
    (checkSharedSecret as jest.Mock).mockImplementation((req, res, next) => next());
    await request(app).get('/viewcache');
    expect(checkSharedSecret).toHaveBeenCalled();
    expect(viewCacheRoute).toHaveBeenCalled();
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  // it('should route POST /github-webhook to handleGithubWebhook', async () => {
  //   await request(app).post('/github-webhook');
  //   expect(githubWebhookRoute).toHaveBeenCalled();
  // });
});
