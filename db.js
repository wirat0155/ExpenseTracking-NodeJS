const sql = require('mssql');

let pool = null;

async function getPool() {
    if (pool) return pool;

    const connectionString = process.env.DB_CONNECTION_STRING;
    if (!connectionString) {
        throw new Error('DB_CONNECTION_STRING is not defined in environment variables');
    }

    pool = await sql.connect(connectionString);
    console.log('✅ Connected to SQL Server');
    return pool;
}

module.exports = { getPool, sql };
