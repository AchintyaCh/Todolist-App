const express = require('express');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// Get all tasks for current user (grouped by status for Kanban)
router.get('/', requireAuth, async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        const [tasks] = await pool.execute(
            'SELECT * FROM tasks WHERE user_id = ? ORDER BY status, position, created_at DESC',
            [req.session.userId]
        );

        // Group tasks by status for Kanban board
        const groupedTasks = {
            todo: tasks.filter(t => t.status === 'todo'),
            in_progress: tasks.filter(t => t.status === 'in_progress'),
            done: tasks.filter(t => t.status === 'done')
        };

        res.json(groupedTasks);
    } catch (error) {
        console.error('Get tasks error:', error);
        res.status(500).json({ error: 'Failed to get tasks' });
    }
});

// Create new task
router.post('/', requireAuth, async (req, res) => {
    try {
        const { title, description, status, priority, dueDate } = req.body;
        const pool = req.app.locals.pool;

        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }

        // Get max position for the status
        const [maxPos] = await pool.execute(
            'SELECT COALESCE(MAX(position), 0) as maxPosition FROM tasks WHERE user_id = ? AND status = ?',
            [req.session.userId, status || 'todo']
        );

        const position = maxPos[0].maxPosition + 1;

        const [result] = await pool.execute(
            'INSERT INTO tasks (user_id, title, description, status, priority, due_date, position) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
                req.session.userId,
                title,
                description || null,
                status || 'todo',
                priority || 'medium',
                dueDate || null,
                position
            ]
        );

        const [newTask] = await pool.execute('SELECT * FROM tasks WHERE id = ?', [result.insertId]);

        res.status(201).json(newTask[0]);
    } catch (error) {
        console.error('Create task error:', error);
        res.status(500).json({ error: 'Failed to create task' });
    }
});

// Update task
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, status, priority, dueDate, position } = req.body;
        const pool = req.app.locals.pool;

        // Verify task belongs to user
        const [existing] = await pool.execute(
            'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
            [id, req.session.userId]
        );

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }

        // Build update query
        const updates = [];
        const values = [];

        if (title !== undefined) {
            updates.push('title = ?');
            values.push(title);
        }
        if (description !== undefined) {
            updates.push('description = ?');
            values.push(description);
        }
        if (status !== undefined) {
            updates.push('status = ?');
            values.push(status);
        }
        if (priority !== undefined) {
            updates.push('priority = ?');
            values.push(priority);
        }
        if (dueDate !== undefined) {
            updates.push('due_date = ?');
            values.push(dueDate);
        }
        if (position !== undefined) {
            updates.push('position = ?');
            values.push(position);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(id);

        await pool.execute(
            `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        const [updatedTask] = await pool.execute('SELECT * FROM tasks WHERE id = ?', [id]);

        res.json(updatedTask[0]);
    } catch (error) {
        console.error('Update task error:', error);
        res.status(500).json({ error: 'Failed to update task' });
    }
});

// Update task positions (for drag-drop reordering)
router.put('/reorder/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, position } = req.body;
        const pool = req.app.locals.pool;

        // Verify task belongs to user
        const [existing] = await pool.execute(
            'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
            [id, req.session.userId]
        );

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }

        await pool.execute(
            'UPDATE tasks SET status = ?, position = ? WHERE id = ?',
            [status, position, id]
        );

        res.json({ message: 'Task reordered successfully' });
    } catch (error) {
        console.error('Reorder task error:', error);
        res.status(500).json({ error: 'Failed to reorder task' });
    }
});

// Delete task
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const pool = req.app.locals.pool;

        // Verify task belongs to user
        const [existing] = await pool.execute(
            'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
            [id, req.session.userId]
        );

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }

        await pool.execute('DELETE FROM tasks WHERE id = ?', [id]);

        res.json({ message: 'Task deleted successfully' });
    } catch (error) {
        console.error('Delete task error:', error);
        res.status(500).json({ error: 'Failed to delete task' });
    }
});

module.exports = router;
