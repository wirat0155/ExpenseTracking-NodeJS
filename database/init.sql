-- =============================================
-- Expense Tracking System - Database Setup
-- Safe to run multiple times (idempotent)
-- =============================================

-- 1. Create database if not exists
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'main')
BEGIN
    CREATE DATABASE [main];
END
GO

USE [main];
GO

-- 2. Create Users table if not exists
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
GO

-- 3. Create Expenses table if not exists
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Expenses]') AND type = N'U')
BEGIN
    CREATE TABLE [dbo].[Expenses] (
        [Id]          UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
        [Title]       NVARCHAR(255)   NOT NULL,
        [Amount]      DECIMAL(18,2)   NOT NULL,
        [Category]    NVARCHAR(100)   NOT NULL,
        [ExpenseDate] DATE            NOT NULL,
        [GroupId]     UNIQUEIDENTIFIER NULL,
        [UserId]      UNIQUEIDENTIFIER NULL REFERENCES [dbo].[Users]([Id]),
        [CreatedAt]   DATETIME        DEFAULT GETDATE()
    );
END
GO

-- 4. Create Settings table if not exists
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Settings]') AND type = N'U')
BEGIN
    CREATE TABLE [dbo].[Settings] (
        [Key]         NVARCHAR(100)   PRIMARY KEY,
        [Value]       NVARCHAR(MAX)   NOT NULL,
        [UserId]      UNIQUEIDENTIFIER NULL REFERENCES [dbo].[Users]([Id]),
        [UpdatedAt]   DATETIME        DEFAULT GETDATE()
    );
END
GO

-- 5. Create Budgets table if not exists
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Budgets]') AND type = N'U')
BEGIN
    CREATE TABLE [dbo].[Budgets] (
        [Id]          UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
        [Year]        INT             NOT NULL,
        [Month]       INT             NOT NULL,
        [Amount]      DECIMAL(18,2)   NOT NULL,
        [UserId]      UNIQUEIDENTIFIER NULL REFERENCES [dbo].[Users]([Id]),
        [UpdatedAt]   DATETIME        DEFAULT GETDATE(),
        CONSTRAINT UQ_Budgets_YearMonth UNIQUE ([Year], [Month])
    );
END
GO

-- 6. Create BudgetAuditLog table if not exists
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
        [UserId]      UNIQUEIDENTIFIER NULL REFERENCES [dbo].[Users]([Id]),
        [ChangedAt]   DATETIME        DEFAULT GETDATE()
    );
END
GO

-- NOTE: Seed data (Users, Expenses, Settings) is handled automatically by db/autoInit.js
-- when the server starts. The owner user (sunneed.2555@gmail.com) is seeded with
-- a bcrypt-hashed password via the Node.js initialization script.
GO
