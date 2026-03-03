require('dotenv').config();
const { getPool, sql } = require('./db');

async function migrate() {
    try {
        console.log('Migrating ID to UNIQUEIDENTIFIER...');
        const pool = await getPool();

        // 1. Add new column
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Expenses]') AND name = N'TempId')
            BEGIN
                ALTER TABLE [dbo].[Expenses] ADD [TempId] UNIQUEIDENTIFIER DEFAULT NEWID() WITH VALUES;
                PRINT 'Added TempId column.';
            END
        `);

        // 2. Drop PK constraint (Determining it dynamically)
        await pool.request().query(`
            DECLARE @pkName NVARCHAR(255);
            SELECT @pkName = name FROM sys.key_constraints WHERE type = 'PK' AND parent_object_id = OBJECT_ID('[dbo].[Expenses]');
            IF @pkName IS NOT NULL
            BEGIN
                DECLARE @sql NVARCHAR(MAX) = 'ALTER TABLE [dbo].[Expenses] DROP CONSTRAINT ' + @pkName;
                EXEC sp_executesql @sql;
                PRINT 'Dropped PK constraint: ' + @pkName;
            END
        `);

        // 3. Drop old Id column and Rename TempId to Id
        await pool.request().query(`
            IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Expenses]') AND name = N'Id')
            BEGIN
                ALTER TABLE [dbo].[Expenses] DROP COLUMN [Id];
                PRINT 'Dropped old Id column.';
            END
            
            IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Expenses]') AND name = N'TempId')
            BEGIN
                EXEC sp_rename 'Expenses.TempId', 'Id', 'COLUMN';
                PRINT 'Renamed TempId to Id.';
            END
        `);

        // 4. Set Id as primary key and NOT NULL
        await pool.request().query(`
            ALTER TABLE [dbo].[Expenses] ALTER COLUMN [Id] UNIQUEIDENTIFIER NOT NULL;
            ALTER TABLE [dbo].[Expenses] ADD PRIMARY KEY (Id);
            PRINT 'Set Id as Primary Key.';
        `);

        console.log('Migration to UUID completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
