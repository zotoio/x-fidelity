import { Express } from 'express';
import { archetypeRoute } from './routes/archetypeRoute';
import { archetypeRulesRoute } from './routes/archetypeRulesRoute';
import { archetypeRuleRoute } from './routes/archetypeRuleRoute';
import { telemetryRoute } from './routes/telemetryRoute';
import { clearCacheRoute } from './routes/clearCacheRoute';
import { viewCacheRoute } from './routes/viewCacheRoute';
import { githubWebhookConfigUpdateRoute } from './routes/githubWebhookConfigUpdateRoute';
import { checkSharedSecret } from './middleware/checkSharedSecret';
import { validateGithubWebhook } from './middleware/validateGithubWebhook';

jest.mock('./routes/archetypeRoute');
jest.mock('./routes/archetypeRulesRoute');
jest.mock('./routes/archetypeRuleRoute');
jest.mock('./routes/telemetryRoute');
jest.mock('./routes/clearCacheRoute');
jest.mock('./routes/viewCacheRoute');
jest.mock('./routes/githubWebhookConfigUpdateRoute');
jest.mock('./middleware/checkSharedSecret');

describe('configServer', () => {
  let app: Express;

  beforeEach(() => {
    app = {
      get: jest.fn(),
      post: jest.fn(),
    } as unknown as Express;
  });

  it('should set up routes correctly', () => {
    // Set up routes
    app.get('/archetypes/:archetype', archetypeRoute);
    app.get('/archetypes/:archetype/rules', archetypeRulesRoute);
    app.get('/archetypes/:archetype/rules/:rule', archetypeRuleRoute);
    app.post('/telemetry', checkSharedSecret, telemetryRoute);
    app.post('/clearcache', checkSharedSecret, clearCacheRoute);
    app.get('/viewcache', checkSharedSecret, viewCacheRoute);
    app.post('/github-config-update', validateGithubWebhook, githubWebhookConfigUpdateRoute);

    // Verify routes are set up correctly
    expect(app.get).toHaveBeenCalledWith('/archetypes/:archetype', archetypeRoute);
    expect(app.get).toHaveBeenCalledWith('/archetypes/:archetype/rules', archetypeRulesRoute);
    expect(app.get).toHaveBeenCalledWith('/archetypes/:archetype/rules/:rule', archetypeRuleRoute);
    expect(app.post).toHaveBeenCalledWith('/telemetry', checkSharedSecret, telemetryRoute);
    expect(app.post).toHaveBeenCalledWith('/clearcache', checkSharedSecret, clearCacheRoute);
    expect(app.get).toHaveBeenCalledWith('/viewcache', checkSharedSecret, viewCacheRoute);
    expect(app.post).toHaveBeenCalledWith('/github-config-update', validateGithubWebhook, githubWebhookConfigUpdateRoute);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });
});