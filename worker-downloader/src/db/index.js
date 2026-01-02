import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

export async function updateDownloadStatus(downloadId, status, error = null) {
    const query = `
    UPDATE downloads 
    SET status = $1, error = $2, updated_at = NOW() 
    WHERE id = $3
  `;
    await pool.query(query, [status, error, downloadId]);
}

export async function updateDownloadProgress(downloadId, progress) {
    const query = `
    UPDATE downloads 
    SET progress = $1, updated_at = NOW() 
    WHERE id = $2
  `;
    await pool.query(query, [progress, downloadId]);
}

export { pool };
