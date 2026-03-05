const { getPool, sql } = require('../db');
const bcrypt = require('bcryptjs');

async function initializeDatabase() {
    try {
        const pool = await getPool();

        console.log('⏳ Checking and initializing database schema...');

        // 0. Create Users Table & Seed Owner User
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND type = N'U')
            BEGIN
                CREATE TABLE [dbo].[Users] (
                    [Id]           UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
                    [Email]        NVARCHAR(255)   NOT NULL,
                    [PasswordHash] NVARCHAR(255)   NOT NULL,
                    [CreatedAt]    DATETIME        DEFAULT GETDATE(),
                    CONSTRAINT UQ_Users_Email UNIQUE ([Email])
                );
            END
        `);
        console.log('✅ Checked table: Users');

        // Seed owner user if not exists (password will be set below via bcrypt)
        const userCheck = await pool.request()
            .input('email', sql.NVarChar(255), 'sunneed.2555@gmail.com')
            .query('SELECT Id FROM [dbo].[Users] WHERE Email = @email');

        let ownerId;
        if (userCheck.recordset.length === 0) {
            const passwordHash = await bcrypt.hash('sun0155', 10);
            const insertUser = await pool.request()
                .input('email', sql.NVarChar(255), 'sunneed.2555@gmail.com')
                .input('passwordHash', sql.NVarChar(255), passwordHash)
                .query(`
                    INSERT INTO [dbo].[Users] ([Email], [PasswordHash])
                    OUTPUT INSERTED.Id
                    VALUES (@email, @passwordHash)
                `);
            ownerId = insertUser.recordset[0].Id;
            console.log('✅ Seeded owner user: sunneed.2555@gmail.com');
        } else {
            ownerId = userCheck.recordset[0].Id;
            console.log('✅ Owner user already exists, Id:', ownerId);
        }

        // 1. Create Expenses Table & Seed Data
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Expenses]') AND type = N'U')
            BEGIN
                CREATE TABLE [dbo].[Expenses] (
                    [Id]          UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
                    [Title]       NVARCHAR(255)   NOT NULL,
                    [Amount]      DECIMAL(18,2)   NOT NULL,
                    [Category]    NVARCHAR(100)   NOT NULL,
                    [ExpenseDate] DATE            NOT NULL,
                    [GroupId]     UNIQUEIDENTIFIER NULL,
                    [UserId]      UNIQUEIDENTIFIER NULL,
                    [CreatedAt]   DATETIME        DEFAULT GETDATE()
                );
            END
        `);

        // Add UserId column to Expenses if it doesn't exist
        await pool.request().query(`
            IF NOT EXISTS (
                SELECT * FROM sys.columns
                WHERE object_id = OBJECT_ID(N'[dbo].[Expenses]') AND name = 'UserId'
            )
            BEGIN
                ALTER TABLE [dbo].[Expenses] ADD [UserId] UNIQUEIDENTIFIER NULL;
            END
        `);
        console.log('✅ Checked table: Expenses (with UserId column)');

        // Seed Sample Data (if table is empty)
        const expenseCheck = await pool.request().query('SELECT TOP 1 1 AS cnt FROM [dbo].[Expenses]');
        if (expenseCheck.recordset.length === 0) {
            await pool.request()
                .input('userId', sql.UniqueIdentifier, ownerId)
                .query(`
                    INSERT INTO [dbo].[Expenses] ([Title], [Amount], [Category], [ExpenseDate], [UserId])
                    VALUES
                        (N'ค่ากาแฟ',          85.00,   N'อาหารและเครื่องดื่ม', '2026-03-01', @userId),
                        (N'ค่าน้ำมันรถ',       1500.00, N'การเดินทาง',          '2026-03-01', @userId),
                        (N'ค่าอินเทอร์เน็ต',   899.00,  N'สาธารณูปโภค',         '2026-02-28', @userId),
                        (N'ซื้อหนังสือ',       350.00,  N'การศึกษา',            '2026-02-27', @userId),
                        (N'ค่าอาหารกลางวัน',   120.00,  N'อาหารและเครื่องดื่ม', '2026-02-26', @userId)
                `);
            console.log('✅ Seeded sample expenses');
        } else {
            // Update existing expenses that have no UserId to assign to owner
            await pool.request()
                .input('userId', sql.UniqueIdentifier, ownerId)
                .query(`
                    UPDATE [dbo].[Expenses]
                    SET [UserId] = @userId
                    WHERE [UserId] IS NULL
                `);
            console.log('✅ Updated existing expenses with owner UserId');
        }

        // 2. Create Settings Table (For Master Budget)
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Settings]') AND type = N'U')
            BEGIN
                CREATE TABLE [dbo].[Settings] (
                    [Key]         NVARCHAR(100)   PRIMARY KEY,
                    [Value]       NVARCHAR(MAX)   NOT NULL,
                    [UserId]      UNIQUEIDENTIFIER NULL,
                    [UpdatedAt]   DATETIME        DEFAULT GETDATE()
                );
            END
        `);

        // Add UserId column to Settings if it doesn't exist
        await pool.request().query(`
            IF NOT EXISTS (
                SELECT * FROM sys.columns
                WHERE object_id = OBJECT_ID(N'[dbo].[Settings]') AND name = 'UserId'
            )
            BEGIN
                ALTER TABLE [dbo].[Settings] ADD [UserId] UNIQUEIDENTIFIER NULL;
            END
        `);

        // Seed Initial Master Budget (5000) if not exists
        const settingsCheck = await pool.request().query("SELECT TOP 1 1 AS cnt FROM [dbo].[Settings] WHERE [Key] = 'MasterBudget'");
        if (settingsCheck.recordset.length === 0) {
            await pool.request()
                .input('userId', sql.UniqueIdentifier, ownerId)
                .query("INSERT INTO [dbo].[Settings] ([Key], [Value], [UserId]) VALUES ('MasterBudget', '5000', @userId)");
        } else {
            // Update existing settings to assign owner UserId
            await pool.request()
                .input('userId', sql.UniqueIdentifier, ownerId)
                .query("UPDATE [dbo].[Settings] SET [UserId] = @userId WHERE [UserId] IS NULL");
        }
        console.log('✅ Checked table: Settings (with UserId column)');

        // 3. Create Budgets Table (For Custom Monthly Budgets)
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Budgets]') AND type = N'U')
            BEGIN
                CREATE TABLE [dbo].[Budgets] (
                    [Id]          UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
                    [Year]        INT             NOT NULL,
                    [Month]       INT             NOT NULL,
                    [Amount]      DECIMAL(18,2)   NOT NULL,
                    [UserId]      UNIQUEIDENTIFIER NULL,
                    [UpdatedAt]   DATETIME        DEFAULT GETDATE(),
                    CONSTRAINT UQ_Budgets_YearMonth UNIQUE ([Year], [Month])
                );
            END
        `);

        // Add UserId column to Budgets if it doesn't exist
        await pool.request().query(`
            IF NOT EXISTS (
                SELECT * FROM sys.columns
                WHERE object_id = OBJECT_ID(N'[dbo].[Budgets]') AND name = 'UserId'
            )
            BEGIN
                ALTER TABLE [dbo].[Budgets] ADD [UserId] UNIQUEIDENTIFIER NULL;
            END
        `);

        // Update existing budgets to assign owner UserId
        await pool.request()
            .input('userId', sql.UniqueIdentifier, ownerId)
            .query(`
                UPDATE [dbo].[Budgets]
                SET [UserId] = @userId
                WHERE [UserId] IS NULL
            `);
        console.log('✅ Checked table: Budgets (with UserId column)');

        // 4. Create BudgetAuditLog Table
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[BudgetAuditLog]') AND type = N'U')
            BEGIN
                CREATE TABLE [dbo].[BudgetAuditLog] (
                    [Id]          INT IDENTITY(1,1) PRIMARY KEY,
                    [Action]      NVARCHAR(50)    NOT NULL,
                    [SettingKey]  NVARCHAR(100)   NULL,
                    [Year]        INT             NULL,
                    [Month]       INT             NULL,
                    [OldAmount]   DECIMAL(18,2)   NULL,
                    [NewAmount]   DECIMAL(18,2)   NULL,
                    [UserId]      UNIQUEIDENTIFIER NULL,
                    [ChangedAt]   DATETIME        DEFAULT GETDATE()
                );
            END
        `);

        // Add UserId column to BudgetAuditLog if it doesn't exist
        await pool.request().query(`
            IF NOT EXISTS (
                SELECT * FROM sys.columns
                WHERE object_id = OBJECT_ID(N'[dbo].[BudgetAuditLog]') AND name = 'UserId'
            )
            BEGIN
                ALTER TABLE [dbo].[BudgetAuditLog] ADD [UserId] UNIQUEIDENTIFIER NULL;
            END
        `);

        // Update existing audit logs to assign owner UserId
        await pool.request()
            .input('userId', sql.UniqueIdentifier, ownerId)
            .query(`
                UPDATE [dbo].[BudgetAuditLog]
                SET [UserId] = @userId
                WHERE [UserId] IS NULL
            `);
        console.log('✅ Checked table: BudgetAuditLog (with UserId column)');

        // 5. Create Trigger for Budgets
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.triggers WHERE name = N'TRG_Budgets_Audit')
            BEGIN
                EXEC('
                CREATE TRIGGER TRG_Budgets_Audit
                ON Budgets
                AFTER INSERT, UPDATE, DELETE
                AS
                BEGIN
                    IF EXISTS (SELECT * FROM inserted) AND NOT EXISTS (SELECT * FROM deleted) -- INSERT
                    BEGIN
                        INSERT INTO BudgetAuditLog ([Action], [Year], [Month], [NewAmount], [UserId])
                        SELECT ''INSERT'', i.[Year], i.[Month], i.Amount, i.UserId FROM inserted i;
                    END
                    
                    IF EXISTS (SELECT * FROM inserted) AND EXISTS (SELECT * FROM deleted) -- UPDATE
                    BEGIN
                        INSERT INTO BudgetAuditLog ([Action], [Year], [Month], [OldAmount], [NewAmount], [UserId])
                        SELECT ''UPDATE'', i.[Year], i.[Month], d.Amount, i.Amount, i.UserId
                        FROM inserted i JOIN deleted d ON i.Id = d.Id;
                    END
                    
                    IF NOT EXISTS (SELECT * FROM inserted) AND EXISTS (SELECT * FROM deleted) -- DELETE
                    BEGIN
                        INSERT INTO BudgetAuditLog ([Action], [Year], [Month], [OldAmount], [UserId])
                        SELECT ''DELETE'', d.[Year], d.[Month], d.Amount, d.UserId FROM deleted d;
                    END
                END
                ');
            END
        `);

        // 6. Create Trigger for Settings (Master Budget)
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.triggers WHERE name = N'TRG_Settings_Audit')
            BEGIN
                EXEC('
                CREATE TRIGGER TRG_Settings_Audit
                ON Settings
                AFTER UPDATE
                AS
                BEGIN
                    IF UPDATE([Value])
                    BEGIN
                        INSERT INTO BudgetAuditLog ([Action], [SettingKey], [OldAmount], [NewAmount], [UserId])
                        SELECT ''UPDATE'', i.[Key], CAST(d.[Value] AS DECIMAL(18,2)), CAST(i.[Value] AS DECIMAL(18,2)), i.[UserId]
                        FROM inserted i JOIN deleted d ON i.[Key] = d.[Key]
                        WHERE i.[Key] = ''MasterBudget'';
                    END
                END
                ');
            END
        `);

        console.log('✅ Auto-Initialization DB Complete');
    } catch (err) {
        console.error('❌ Database Initialization Failed:', err);
    }
}

module.exports = initializeDatabase;
