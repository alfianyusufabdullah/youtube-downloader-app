import pg from 'pg';
import { CONFIG } from '../config/constants.js';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: CONFIG.DB_POOL_MAX,
  idleTimeoutMillis: CONFIG.DB_IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: CONFIG.DB_CONNECTION_TIMEOUT_MS,
});

pool.on('error', (err, client) => {
  console.error('[Database] Unexpected error on idle client:', err.message);
});

pool.on('connect', () => {
  console.log('[Database] New client connected to pool');
});

export async function updateDownloadStatus(downloadId, status, error = null, title = null) {
  const query = `
    UPDATE downloads 
    SET status = $1, error = $2, title = COALESCE($3, title), updated_at = NOW() 
    WHERE id = $4
  `;
  await pool.query(query, [status, error, title, downloadId]);
}

export async function updateDownloadTitle(downloadId, title) {
  const query = `
    UPDATE downloads 
    SET title = $1, updated_at = NOW() 
    WHERE id = $2
  `;
  await pool.query(query, [title, downloadId]);
}

export async function updateDownloadProgress(downloadId, progress) {
  const query = `
    UPDATE downloads 
    SET progress = $1, updated_at = NOW() 
    WHERE id = $2
  `;
  await pool.query(query, [progress, downloadId]);
}

export async function closePool() {
  console.log('[Database] Closing connection pool...');
  await pool.end();
  console.log('[Database] Pool closed');
}

export { pool };
