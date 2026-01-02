import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
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

export { pool };

