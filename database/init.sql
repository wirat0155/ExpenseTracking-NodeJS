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

-- 2. Create Expenses table if not exists
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
GO

-- 3. Sample data (insert only if table is empty)
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
GO
