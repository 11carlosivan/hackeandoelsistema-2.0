import { describe, expect, it } from 'vitest';
import { createCheck, summarizeChecks } from '../scripts/ops/preflight.mjs';

describe('ops preflight helpers', () => {
  it('builds checks with details', () => {
    expect(createCheck('database:connection', 'PASS', { provider: 'postgresql' })).toEqual({
      name: 'database:connection',
      status: 'PASS',
      details: {
        provider: 'postgresql',
      },
    });
  });

  it('summarizes warnings without failing the preflight', () => {
    expect(summarizeChecks([
      createCheck('env:api', 'PASS'),
      createCheck('auth:admin-login', 'WARN'),
    ])).toEqual({
      status: 'WARN',
      failures: 0,
      warnings: 1,
      passed: 1,
    });
  });

  it('marks the preflight as failed when any check fails', () => {
    expect(summarizeChecks([
      createCheck('env:api', 'PASS'),
      createCheck('database:connection', 'FAIL'),
      createCheck('auth:admin-login', 'WARN'),
    ])).toMatchObject({
      status: 'FAIL',
      failures: 1,
      warnings: 1,
    });
  });
});
