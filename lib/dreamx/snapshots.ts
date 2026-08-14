import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getDatabase, closeDatabase, reconnectDatabase, getDbPath } from '@/lib/db';
import { pauseSimulation, resumeSimulation, getInFlightCount, invalidateSimulationToken } from './simulation';

/**
 * ARCHITECTURAL CONSTRAINT:
 * The DreamX Snapshot & Rollback system is strictly designed for local-development 
 * environments running a single Node.js process.
 * 
 * The snapshot mutex (`snapshotMutex`), simulation generation token (`globalRunToken`), 
 * and the `isSimulationPaused` state are implemented as process-local coordination primitives. 
 * Therefore, this architecture CANNOT guarantee consistency across multiple Node.js processes. 
 * 
 * Horizontal scaling (e.g., via PM2 clustering or Vercel serverless deployments) is a 
 * hard non-goal. Introducing horizontal scaling will invalidate the rollback guarantees 
 * and cause uncoordinated SQLite file lock collisions.
 */

export interface SnapshotMetadata {
  snapshot_id: string;
  label: string;
  created_at: string;
  database_hash_sha256: string;
  database_size: number;
  schema_version: number;
  post_count: number;
  profile_count: number;
}

const isTestMode = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';

// ----------------------------------------------------
// Mutex Serialization
// ----------------------------------------------------
let snapshotMutex: Promise<any> = Promise.resolve();

function withMutex<T>(task: () => Promise<T>): Promise<T> {
  // Chain the new task onto the existing mutex promise.
  // We use .catch(() => {}) on the current promise to ensure the queue doesn't poison if an earlier task fails.
  const nextLock = snapshotMutex.catch(() => {}).then(() => task());
  snapshotMutex = nextLock.catch(() => {}); // prevent unhandled rejections from blowing up the queue itself
  return nextLock;
}

export function getSnapshotsDir(): string {
  const baseDbDir = path.resolve(process.cwd(), 'data');
  const targetDbDir = isTestMode ? path.resolve(baseDbDir, 'test') : baseDbDir;
  const snapDir = path.resolve(targetDbDir, 'snapshots');
  if (!fs.existsSync(snapDir)) {
    fs.mkdirSync(snapDir, { recursive: true });
  }
  return snapDir;
}

function isValidSnapshotId(id: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

function getSnapshotDbPath(id: string): string {
  if (!isValidSnapshotId(id)) throw new Error('Invalid snapshot ID');
  return path.resolve(getSnapshotsDir(), `${id}.db`);
}

function getSnapshotMetaPath(id: string): string {
  if (!isValidSnapshotId(id)) throw new Error('Invalid snapshot ID');
  return path.resolve(getSnapshotsDir(), `${id}.json`);
}

function computeFileHash(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

/**
 * Validates a SQLite database file independently of the application adapter.
 * Uses a native better-sqlite3 instance in read-only mode to prevent sidecars.
 */
function validateSnapshotDatabase(dbPath: string): { postCount: number, profileCount: number } {
  if (!fs.existsSync(dbPath)) throw new Error(`Database file not found: ${dbPath}`);
  
  const Database = require('better-sqlite3');
  // Open strictly read-only to prevent SQLite from creating -wal or -shm sidecars for snapshots
  const tempDb = new Database(dbPath, { readonly: true });
  try {
    const integrity = tempDb.pragma('integrity_check');
    if (!integrity || (Array.isArray(integrity) && integrity[0].integrity_check !== 'ok')) {
      throw new Error('Database failed integrity check');
    }
    
    // Verify expected tables exist and return counts
    const postCount = tempDb.prepare('SELECT COUNT(*) as count FROM dreamx_posts').get().count;
    const profileCount = tempDb.prepare('SELECT COUNT(*) as count FROM dreamx_profiles').get().count;
    
    return { postCount, profileCount };
  } finally {
    tempDb.close();
    // Ensure read-only validation does not leave behind sidecars
    if (fs.existsSync(`${dbPath}-wal`)) fs.unlinkSync(`${dbPath}-wal`);
    if (fs.existsSync(`${dbPath}-shm`)) fs.unlinkSync(`${dbPath}-shm`);
  }
}

async function _createSimulationSnapshot(label: string): Promise<SnapshotMetadata> {
  const id = `snap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const dbPath = getSnapshotDbPath(id);
  const metaPath = getSnapshotMetaPath(id);

  const dbAdapter = getDatabase();
  const rawDb = (dbAdapter as any).client || (dbAdapter as any).db;
  
  if (!rawDb || typeof rawDb.backup !== 'function') {
    throw new Error('Database adapter does not support backup API natively');
  }

  // 1. Asynchronously backup to destination file
  await rawDb.backup(dbPath);

  // 2. Validate artifact read-only (prevents sidecar creation)
  let statsObj: { postCount: number, profileCount: number };
  try {
    statsObj = validateSnapshotDatabase(dbPath);
  } catch (err) {
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    throw new Error(`Failed to validate created snapshot: ${(err as Error).message}`);
  }

  // 3. Compute hash AFTER backup is completely written and closed by validation
  const fileHash = computeFileHash(dbPath);
  const stats = fs.statSync(dbPath);

  const metadata: SnapshotMetadata = {
    snapshot_id: id,
    label,
    created_at: new Date().toISOString(),
    database_hash_sha256: fileHash,
    database_size: stats.size,
    schema_version: 1,
    post_count: statsObj.postCount,
    profile_count: statsObj.profileCount
  };

  fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf-8');

  return metadata;
}

export async function getSnapshots(): Promise<SnapshotMetadata[]> {
  const snapDir = getSnapshotsDir();
  const files = fs.readdirSync(snapDir);
  const metaFiles = files.filter(f => f.endsWith('.json'));

  const snapshots: SnapshotMetadata[] = [];
  for (const f of metaFiles) {
    try {
      const content = fs.readFileSync(path.join(snapDir, f), 'utf-8');
      snapshots.push(JSON.parse(content));
    } catch {
      // Skip invalid
    }
  }

  return snapshots.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

async function _deleteSnapshot(id: string): Promise<void> {
  const dbPath = getSnapshotDbPath(id);
  const metaPath = getSnapshotMetaPath(id);

  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);
}

async function _restoreSimulationSnapshot(id: string): Promise<void> {
  const dbPath = getSnapshotDbPath(id);
  const metaPath = getSnapshotMetaPath(id);

  if (!fs.existsSync(dbPath) || !fs.existsSync(metaPath)) {
    throw new Error('Snapshot files not found');
  }

  const metaContent = fs.readFileSync(metaPath, 'utf-8');
  const metadata: SnapshotMetadata = JSON.parse(metaContent);

  // Validate integrity BEFORE taking action
  const currentHash = computeFileHash(dbPath);
  if (currentHash !== metadata.database_hash_sha256) {
    throw new Error('Snapshot integrity check failed: Hash mismatch');
  }
  
  // Explicit read-only validation of snapshot
  validateSnapshotDatabase(dbPath);

  let databaseUntouched = true;
  let conclusiveDatabaseState = false;

  const prodDbPath = getDbPath();
  const emergencyDbPath = prodDbPath.replace('.db', '.emergency.db');

  try {
    // 1. Quiesce
    pauseSimulation();
    invalidateSimulationToken();

  // 2. Wait for in-flight operations (timeout after 10s to prevent hang)
  let waitStart = Date.now();
  while (getInFlightCount() > 0 && (Date.now() - waitStart) < 10000) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  // Pre-cleanup any stale emergency backups
  if (fs.existsSync(emergencyDbPath)) {
    fs.unlinkSync(emergencyDbPath);
  }

  // 3. Emergency Backup
  const dbAdapter = getDatabase();
  const rawDb = (dbAdapter as any).client || (dbAdapter as any).db;
  if (rawDb && typeof rawDb.backup === 'function') {
     await rawDb.backup(emergencyDbPath);
  } else {
     // If we are already in LibSQL fallback, backup API doesn't exist, we must use copy
     fs.copyFileSync(prodDbPath, emergencyDbPath);
  }

  // 4. Validate Emergency Backup independently
  try {
    validateSnapshotDatabase(emergencyDbPath);
  } catch (err) {
    throw new Error('Emergency backup validation failed, aborting restore: ' + (err as Error).message);
  }

  // 5. Disconnect Production & Purge Stale Sidecars Immediately
  try {
    databaseUntouched = false;
    closeDatabase();
    const walPath = `${prodDbPath}-wal`;
    const shmPath = `${prodDbPath}-shm`;
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
  } catch (err) {
    throw new Error('Failed to cleanly close production database and purge sidecars: ' + (err as Error).message);
  }

  // 6. Restore & Purge using ATOMIC sequence
  const tempRestorePath = `${prodDbPath}.restore.tmp`;
  try {
    // Copy to temporary
    fs.copyFileSync(dbPath, tempRestorePath);
    
    // Validate temporary independently (creates no sidecars due to readonly + cleanup)
    validateSnapshotDatabase(tempRestorePath);

    // Atomic replace (sidecars were already purged in step 5)
    fs.renameSync(tempRestorePath, prodDbPath);

  } catch (err) {
    // FATAL RECOVERY MODE
    closeDatabase(); // Ensure released
    if (fs.existsSync(tempRestorePath)) fs.unlinkSync(tempRestorePath);
    
    try {
      // Purge sidecars
      const walPath = `${prodDbPath}-wal`;
      const shmPath = `${prodDbPath}-shm`;
      if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
      if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
      
      // Copy emergency to temporary, validate, and rename
      const tempEmergPath = `${prodDbPath}.emerg.tmp`;
      fs.copyFileSync(emergencyDbPath, tempEmergPath);
      validateSnapshotDatabase(tempEmergPath);
      fs.renameSync(tempEmergPath, prodDbPath);

      // Reconnect with restore mode (bypasses fallback schema init)
      reconnectDatabase('restore');
      conclusiveDatabaseState = true;
      
      throw new Error(`Rollback failed, but emergency recovery succeeded. Original error: ${(err as Error).message}`);
    } catch (recoveryErr) {
      throw new Error(`FATAL: Rollback failed AND emergency recovery failed. Manual intervention required. Original: ${(err as Error).message} Recovery: ${(recoveryErr as Error).message}`);
    }
  }

  // 7. Reconnect & Validate
  try {
    reconnectDatabase('restore'); // Ensure native SQLite, no schema migrations
    
    // Explicitly verify the restored application singleton connection
    const newDbAdapter = getDatabase();
    const newRawDb = (newDbAdapter as any).client || (newDbAdapter as any).db;
    
    const integrity = newRawDb.pragma('integrity_check');
    if (!integrity || (Array.isArray(integrity) && integrity[0].integrity_check !== 'ok')) {
      throw new Error('Restored database failed integrity check upon reconnection');
    }
    
    // Verify expected tables exist on the live connection
    newRawDb.prepare('SELECT 1 FROM dreamx_posts LIMIT 1').get();
    
    conclusiveDatabaseState = true;
  } catch (err) {
    // Native SQLite failed to open the fully restored DB. Run emergency recovery.
    closeDatabase();
    try {
      const walPath = `${prodDbPath}-wal`;
      const shmPath = `${prodDbPath}-shm`;
      if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
      if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
      
      const tempEmergPath = `${prodDbPath}.emerg.tmp`;
      fs.copyFileSync(emergencyDbPath, tempEmergPath);
      validateSnapshotDatabase(tempEmergPath);
      fs.renameSync(tempEmergPath, prodDbPath);

      reconnectDatabase('restore');
      conclusiveDatabaseState = true;
      
      throw new Error(`Restored database connection failed, but emergency recovery succeeded. Original error: ${(err as Error).message}`);
    } catch (recoveryErr) {
      throw new Error(`FATAL: Restored DB connection failed AND emergency recovery failed. Manual intervention required. Original: ${(err as Error).message} Recovery: ${(recoveryErr as Error).message}`);
    }
  }

  } finally {
    // Deterministic Cleanup of Emergency Backup and Temp Files
    if (fs.existsSync(emergencyDbPath)) fs.unlinkSync(emergencyDbPath);
    const tempRestorePath = `${prodDbPath}.restore.tmp`;
    if (fs.existsSync(tempRestorePath)) fs.unlinkSync(tempRestorePath);
    const tempEmergPath = `${prodDbPath}.emerg.tmp`;
    if (fs.existsSync(tempEmergPath)) fs.unlinkSync(tempEmergPath);

    if (databaseUntouched || conclusiveDatabaseState) {
      resumeSimulation();
    }
  }
}

// ----------------------------------------------------
// Public API Wrappers (Serialized)
// ----------------------------------------------------
export function createSimulationSnapshot(label: string): Promise<SnapshotMetadata> {
  return withMutex(() => _createSimulationSnapshot(label));
}

export function restoreSimulationSnapshot(id: string): Promise<void> {
  return withMutex(() => _restoreSimulationSnapshot(id));
}

export function deleteSnapshot(id: string): Promise<void> {
  return withMutex(() => _deleteSnapshot(id));
}
