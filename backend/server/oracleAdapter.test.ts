import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const oracleMocks = vi.hoisted(() => ({
  createPool: vi.fn(),
  getConnection: vi.fn(),
  execute: vi.fn(),
  closeConnection: vi.fn(),
  closePool: vi.fn(),
  getRows: vi.fn(),
  closeResultSet: vi.fn(),
  resultSet: {} as { getRows: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> },
}));

oracleMocks.resultSet = { getRows: oracleMocks.getRows, close: oracleMocks.closeResultSet };

vi.mock('oracledb', () => ({
  default: {
    createPool: oracleMocks.createPool,
    BIND_OUT: 3003,
    CURSOR: 2021,
    OUT_FORMAT_OBJECT: 4002,
  },
}));

import { closeOracle, oracleReport } from './oracleAdapter.js';

beforeEach(async () => {
  await closeOracle();
  vi.clearAllMocks();
  process.env.ORACLE_USER = 'test-user';
  process.env.ORACLE_PASSWORD = 'test-password';
  process.env.ORACLE_CONNECT_STRING = 'test-service';
  oracleMocks.createPool.mockResolvedValue({ getConnection: oracleMocks.getConnection, close: oracleMocks.closePool });
  oracleMocks.getConnection.mockResolvedValue({ execute: oracleMocks.execute, close: oracleMocks.closeConnection });
  oracleMocks.execute.mockResolvedValue({ outBinds: { p_results: oracleMocks.resultSet } });
  oracleMocks.getRows.mockResolvedValue([{ ROUTE_ID: 5, ROUTE_CODE: 'R005' }]);
});

afterEach(async () => {
  await closeOracle();
  delete process.env.ORACLE_USER;
  delete process.env.ORACLE_PASSWORD;
  delete process.env.ORACLE_CONNECT_STRING;
});

describe('Oracle report cursor helper', () => {
  it('binds the top-N argument and maps rows from the OUT REF CURSOR', async () => {
    await expect(oracleReport('most-used-routes', { topN: '5' })).resolves.toEqual([{ routeId: 5, routeCode: 'R005' }]);

    expect(oracleMocks.execute).toHaveBeenCalledWith(
      'BEGIN REPORT_MOST_USED_ROUTES(:p_top_n, :p_results); END;',
      expect.objectContaining({
        p_top_n: 5,
        p_results: { dir: 3003, type: 2021 },
      }),
      { outFormat: 4002 },
    );
    expect(oracleMocks.getRows).toHaveBeenCalledOnce();
    expect(oracleMocks.closeResultSet).toHaveBeenCalledOnce();
    expect(oracleMocks.closeConnection).toHaveBeenCalledOnce();
  });

  it('rejects invalid report parameters before opening a database connection', async () => {
    await expect(oracleReport('passenger-history', { passengerId: null })).rejects.toMatchObject({ statusCode: 400 });
    await expect(oracleReport('revenue', { fromDate: '2026-12-31', toDate: '2026-01-01' })).rejects.toMatchObject({ statusCode: 400 });
    await expect(oracleReport('most-used-routes', { topN: -1 })).rejects.toMatchObject({ statusCode: 400 });
    expect(oracleMocks.createPool).not.toHaveBeenCalled();
  });
});
