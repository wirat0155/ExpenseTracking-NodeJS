const { getPool, sql } = require('../db');

// GET /api/categories — get all categories (system + user's)
exports.getCategories = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('userId', sql.UniqueIdentifier, req.userId)
            .query(`
                SELECT Id, Name, IsSystem, CreatedAt
                FROM [dbo].[Categories]
                WHERE [UserId] = @userId OR [IsSystem] = 1
                ORDER BY [IsSystem] DESC, [Name] ASC
            `);
        res.json(result.recordset);
    } catch (err) {
        console.error('getCategories error:', err);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
};

// POST /api/categories — create new user category
exports.createCategory = async (req, res) => {
    const { name } = req.body;

    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Category name is required' });
    }

    const trimmedName = name.trim();

    try {
        const pool = await getPool();

        // Check if name already exists in system categories
        const systemCheck = await pool.request()
            .input('name', sql.NVarChar(100), trimmedName)
            .query('SELECT Id FROM [dbo].[Categories] WHERE LOWER(Name) = LOWER(@name) AND [IsSystem] = 1');

        if (systemCheck.recordset.length > 0) {
            return res.status(400).json({ error: 'ชื่อหมวดหมู่นี้มีอยู่ในระบบแล้ว ไม่สามารถสร้างซ้ำได้' });
        }

        // Check if user already has this category
        const userCheck = await pool.request()
            .input('name', sql.NVarChar(100), trimmedName)
            .input('userId', sql.UniqueIdentifier, req.userId)
            .query('SELECT Id FROM [dbo].[Categories] WHERE LOWER(Name) = LOWER(@name) AND [UserId] = @userId');

        if (userCheck.recordset.length > 0) {
            return res.status(400).json({ error: 'คุณมีหมวดหมู่นี้อยู่แล้ว' });
        }

        // Create new user category
        const result = await pool.request()
            .input('name', sql.NVarChar(100), trimmedName)
            .input('userId', sql.UniqueIdentifier, req.userId)
            .query(`
                INSERT INTO [dbo].[Categories] ([Name], [IsSystem], [UserId])
                OUTPUT INSERTED.*
                VALUES (@name, 0, @userId)
            `);

        res.status(201).json(result.recordset[0]);
    } catch (err) {
        console.error('createCategory error:', err);
        res.status(500).json({ error: 'Failed to create category' });
    }
};

// DELETE /api/categories/:id — delete user category only
exports.deleteCategory = async (req, res) => {
    const { id } = req.params;

    try {
        const pool = await getPool();

        // Check if category exists and belongs to user (not system)
        const checkResult = await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .input('userId', sql.UniqueIdentifier, req.userId)
            .query('SELECT Id, Name, IsSystem FROM [dbo].[Categories] WHERE Id = @id AND [UserId] = @userId AND [IsSystem] = 0');

        if (checkResult.recordset.length === 0) {
            return res.status(404).json({ error: 'หมวดหมู่ไม่พบหรือไม่สามารถลบหมวดหมู่ระบบได้' });
        }

        // Delete the category
        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query('DELETE FROM [dbo].[Categories] WHERE Id = @id');

        res.json({ message: 'ลบหมวดหมู่สำเร็จ' });
    } catch (err) {
        console.error('deleteCategory error:', err);
        res.status(500).json({ error: 'Failed to delete category' });
    }
};
