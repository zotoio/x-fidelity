import { matchesSatisfyOperator } from './matchesSatisfy';

describe('matchesSatisfyOperator', () => {
  const makeFact = (matches: any[] = [], errors: any[] = [], strategyUsed: any = 'regex') => ({
    strategyUsed,
    matches,
    errors,
    stats: { totalMatches: matches.length, durationMs: 0 },
    file: { path: '/repo/a', ext: '.txt' }
  });

  it('requires matches when requireMatches is true', () => {
    const fv = makeFact([]);
    expect(matchesSatisfyOperator.fn(fv as any, { requireMatches: true } as any)).toBe(false);
  });

  it('checks count operation', () => {
    const fv = makeFact([{ value: 1 }, { value: 2 }]);
    expect(matchesSatisfyOperator.fn(fv as any, { count: { op: '>=', value: 2 } } as any)).toBe(true);
    expect(matchesSatisfyOperator.fn(fv as any, { count: { op: '>', value: 2 } } as any)).toBe(false);
  });

  it('contains value any', () => {
    const fv = makeFact([{ value: 'abc' }, { value: 'xyz' }]);
    expect(matchesSatisfyOperator.fn(fv as any, { contains: { value: 'xyz', mode: 'any' } } as any)).toBe(true);
  });

  it('contains regex all', () => {
    const fv = makeFact([{ value: 'svc-1' }, { value: 'svc-2' }]);
    expect(matchesSatisfyOperator.fn(fv as any, { contains: { regex: '^svc-', flags: 'i', mode: 'all' } } as any)).toBe(true);
  });

  it('countWhere with path and equals', () => {
    const fv = makeFact([{ value: { name: 'y' } }, { value: { name: 'y' } }, { value: { name: 'x' } }]);
    expect(matchesSatisfyOperator.fn(fv as any, { countWhere: { path: 'name', equals: 'y', op: '==', value: 2 } } as any)).toBe(true);
  });

  it('strategyIs filter', () => {
    const fv = makeFact([{ value: 1 }], [], 'jsonpath');
    expect(matchesSatisfyOperator.fn(fv as any, { strategyIs: 'regex' } as any)).toBe(false);
    expect(matchesSatisfyOperator.fn(fv as any, { strategyIs: ['jsonpath', 'regex'] } as any)).toBe(true);
  });
});


