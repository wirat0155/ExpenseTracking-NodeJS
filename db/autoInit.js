const { getPool, sql } = require('../db');

async function initializeDatabase() {
    try {
        const pool = await getPool();

        console.log('⏳ Checking and initializing database schema...');

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
                    [CreatedAt]   DATETIME        DEFAULT GETDATE()
                );
            END

            -- Seed Sample Data (if table is empty)
            IF NOT EXISTS (SELECT TOP 1 1 FROM [dbo].[Expenses])
            BEGIN
                INSERT INTO [dbo].[Expenses] ([Title], [Amount], [Category], [ExpenseDate])
                VALUES
                    (N'ค่ากาแฟ',          85.00,   N'อาหารและเครื่องดื่ม', '2026-03-01'),
                    (N'ค่าน้ำมันรถ',       1500.00, N'การเดินทาง',          '2026-03-01'),
                    (N'ค่าอินเทอร์เน็ต',   899.00,  N'สาธารณูปโภค',         '2026-02-28'),
                    (N'ซื้อหนังสือ',       350.00,  N'การศึกษา',            '2026-02-27'),
                    (N'ค่าอาหารกลางวัน',   120.00,  N'อาหารและเครื่องดื่ม', '2026-02-26');
            END
        `);
        console.log('✅ Checked table: Expenses (with seed data)');

        // 2. Create Settings Table (For Master Budget)
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Settings]') AND type = N'U')
            BEGIN
                CREATE TABLE [dbo].[Settings] (
                    [Key]         NVARCHAR(100)   PRIMARY KEY,
                    [Value]       NVARCHAR(MAX)   NOT NULL,
                    [UpdatedAt]   DATETIME        DEFAULT GETDATE()
                );
                
                -- Seed Initial Master Budget (5000)
                INSERT INTO [dbo].[Settings] ([Key], [Value]) VALUES ('MasterBudget', '5000');
            END
        `);
        console.log('✅ Checked table: Settings');

        // 3. Create Budgets Table (For Custom Monthly Budgets)
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Budgets]') AND type = N'U')
            BEGIN
                CREATE TABLE [dbo].[Budgets] (
                    [Id]          UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
                    [Year]        INT             NOT NULL,
                    [Month]       INT             NOT NULL,
                    [Amount]      DECIMAL(18,2)   NOT NULL,
                    [UpdatedAt]   DATETIME        DEFAULT GETDATE(),
                    CONSTRAINT UQ_Budgets_YearMonth UNIQUE ([Year], [Month])
                );
            END
        `);
        console.log('✅ Checked table: Budgets');

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
                    [ChangedAt]   DATETIME        DEFAULT GETDATE()
                );
            END
        `);
        console.log('✅ Checked table: BudgetAuditLog');

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
                        INSERT INTO BudgetAuditLog ([Action], [Year], [Month], [NewAmount])
                        SELECT ''INSERT'', i.[Year], i.[Month], i.Amount FROM inserted i;
                    END
                    
                    IF EXISTS (SELECT * FROM inserted) AND EXISTS (SELECT * FROM deleted) -- UPDATE
                    BEGIN
                        INSERT INTO BudgetAuditLog ([Action], [Year], [Month], [OldAmount], [NewAmount])
                        SELECT ''UPDATE'', i.[Year], i.[Month], d.Amount, i.Amount 
                        FROM inserted i JOIN deleted d ON i.Id = d.Id;
                    END
                    
                    IF NOT EXISTS (SELECT * FROM inserted) AND EXISTS (SELECT * FROM deleted) -- DELETE
                    BEGIN
                        INSERT INTO BudgetAuditLog ([Action], [Year], [Month], [OldAmount])
                        SELECT ''DELETE'', d.[Year], d.[Month], d.Amount FROM deleted d;
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
                        INSERT INTO BudgetAuditLog ([Action], [SettingKey], [OldAmount], [NewAmount])
                        SELECT ''UPDATE'', i.[Key], CAST(d.[Value] AS DECIMAL(18,2)), CAST(i.[Value] AS DECIMAL(18,2))
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
