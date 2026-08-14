import { describe, it, expect } from 'vitest';
import { getDatabase, getDbPath } from './index';
import path from 'path';

describe('Database Isolation Safeguards', () => {
  it('should resolve to a test-scoped database and never the production database', () => {
    // 1. Assert we are in test mode
    expect(process.env.NODE_ENV).toBe('test');

    // 2. Initialize the database connection (this evaluates the path logic)
    const db = getDatabase();
    const resolvedPath = getDbPath();

    const expectedProdPath = path.resolve(process.cwd(), 'data', 'app.db');
    const expectedTestPath = path.resolve(process.cwd(), 'data', 'test', 'app.db');

    // 3. Statically verify the resolved path is correct
    expect(resolvedPath).toBe(expectedTestPath);

    // 4. Statically verify it strictly does NOT match production
    expect(resolvedPath).not.toBe(expectedProdPath);

    // 5. Prove we can execute a destructive command harmlessly
    expect(() => {
      // If this somehow hit prod, it would wipe it!
      db.exec('CREATE TABLE IF NOT EXISTS isolation_check (id TEXT PRIMARY KEY);');
      db.exec('DELETE FROM isolation_check;');
    }).not.toThrow();
  });
});
