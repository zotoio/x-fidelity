import { extractValuesFact } from './extractValuesFact';

describe('extractValuesFact', () => {
  const makeAlmanac = (file: { fileName: string; filePath: string; content: string; ast?: any }, runtimeStore: Record<string, any> = {}) => ({
    factValue: jest.fn(async (name: string) => {
      if (name === 'fileData') return file;
      if (name === 'ast') return file.ast;
      return undefined;
    }),
    addRuntimeFact: jest.fn((k: string, v: any) => {
      runtimeStore[k] = v;
    })
  });

  it('extracts jsonpath from json', async () => {
    const runtime: any = {};
    const almanac = makeAlmanac({ fileName: 'package.json', filePath: '/repo/package.json', content: '{"version":"1.2.3"}' }, runtime);
    const res = await extractValuesFact.fn({ resultFact: 'pkgVersion', strategies: { '.json': { type: 'jsonpath', paths: ['$.version'] } } }, almanac);
    expect(res.matches.map(m => m.value)).toEqual(['1.2.3']);
    expect(runtime.pkgVersion.matches[0].value).toBe('1.2.3');
  });

  it('extracts yaml via jsonpath', async () => {
    const runtime: any = {};
    const yaml = 'services:\n  app:\n    image: node:18';
    const almanac = makeAlmanac({ fileName: 'docker-compose.yml', filePath: '/repo/docker-compose.yml', content: yaml }, runtime);
    const res = await extractValuesFact.fn({ resultFact: 'composeImages', strategies: { '.yml': { type: 'yaml-jsonpath', paths: ['$.services.app.image'] } } }, almanac);
    expect(res.matches[0].value).toBe('node:18');
  });

  it('extracts xpath from xml', async () => {
    const runtime: any = {};
    const xml = '<root><service id="svc-1"/><service id="svc-2"/></root>';
    const almanac = makeAlmanac({ fileName: 'services.xml', filePath: '/repo/services.xml', content: xml }, runtime);
    const res = await extractValuesFact.fn({ resultFact: 'xmlIds', strategies: { '.xml': { type: 'xpath', expressions: ['//service/@id'] } } }, almanac);
    expect(res.matches.map(m => m.value)).toEqual(['svc-1', 'svc-2']);
  });

  it('extracts with regex fallback', async () => {
    const runtime: any = {};
    const env = 'API_KEY=abc123\nOTHER=ok';
    const almanac = makeAlmanac({ fileName: '.env', filePath: '/repo/.env', content: env }, runtime);
    const res = await extractValuesFact.fn({ resultFact: 'envKey', defaultStrategy: { type: 'regex', pattern: '^API_KEY=(.*)$', flags: 'm' }, captureContext: true }, almanac);
    expect(res.matches[0].value).toBe('abc123');
    expect(res.matches[0].location?.line).toBe(1);
  });

  it('records error when ast not available for ast-jsonpath', async () => {
    const runtime: any = {};
    const almanac = makeAlmanac({ fileName: 'a.ts', filePath: '/repo/a.ts', content: 'const a=1;' }, runtime);
    const res = await extractValuesFact.fn({ resultFact: 'astRes', strategies: { '.ts': { type: 'ast-jsonpath', paths: ['$.tree'] } } }, almanac);
    expect(res.errors.length).toBeGreaterThan(0);
  });
});


