require('dotenv').config();
const { getPool, sql } = require('./db');

async function migrate() {
    try {
        console.log('Finalizing migration...');
        const pool = await getPool();

        // 1. Ensure NOT NULL
        await pool.request().query(`
            ALTER TABLE [dbo].[Expenses] ALTER COLUMN [Id] UNIQUEIDENTIFIER NOT NULL;
        `);
        console.log('Set Id to NOT NULL.');

        // 2. Add Primary Key
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE type = 'PK' AND parent_object_id = OBJECT_ID('[dbo].[Expenses]'))
            BEGIN
                ALTER TABLE [dbo].[Expenses] ADD PRIMARY KEY (Id);
            END
        `);
        console.log('Set Id as Primary Key.');

        console.log('Migration to UUID completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
