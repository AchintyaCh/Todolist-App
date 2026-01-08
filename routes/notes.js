const express = require('express');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// Get all notes for current user
router.get('/', requireAuth, async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        const [notes] = await pool.execute(
            'SELECT * FROM notes WHERE user_id = ? ORDER BY is_pinned DESC, updated_at DESC',
            [req.session.userId]
        );

        res.json(notes);
    } catch (error) {
        console.error('Get notes error:', error);
        res.status(500).json({ error: 'Failed to get notes' });
    }
});

// Get single note
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const pool = req.app.locals.pool;

        const [notes] = await pool.execute(
            'SELECT * FROM notes WHERE id = ? AND user_id = ?',
            [id, req.session.userId]
        );

        if (notes.length === 0) {
            return res.status(404).json({ error: 'Note not found' });
        }

        res.json(notes[0]);
    } catch (error) {
        console.error('Get note error:', error);
        res.status(500).json({ error: 'Failed to get note' });
    }
});

// Create new note
router.post('/', requireAuth, async (req, res) => {
    try {
        const { title, content, color } = req.body;
        const pool = req.app.locals.pool;

        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }

        const [result] = await pool.execute(
            'INSERT INTO notes (user_id, title, content, color) VALUES (?, ?, ?, ?)',
            [req.session.userId, title, content || '', color || '#ffffff']
        );

        const [newNote] = await pool.execute('SELECT * FROM notes WHERE id = ?', [result.insertId]);

        res.status(201).json(newNote[0]);
    } catch (error) {
        console.error('Create note error:', error);
        res.status(500).json({ error: 'Failed to create note' });
    }
});

// Update note
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, color, isPinned } = req.body;
        const pool = req.app.locals.pool;

        // Verify note belongs to user
        const [existing] = await pool.execute(
            'SELECT * FROM notes WHERE id = ? AND user_id = ?',
            [id, req.session.userId]
        );

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Note not found' });
        }

        // Build update query
        const updates = [];
        const values = [];

        if (title !== undefined) {
            updates.push('title = ?');
            values.push(title);
        }
        if (content !== undefined) {
            updates.push('content = ?');
            values.push(content);
        }
        if (color !== undefined) {
            updates.push('color = ?');
            values.push(color);
        }
        if (isPinned !== undefined) {
            updates.push('is_pinned = ?');
            values.push(isPinned);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(id);

        await pool.execute(
            `UPDATE notes SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        const [updatedNote] = await pool.execute('SELECT * FROM notes WHERE id = ?', [id]);

        res.json(updatedNote[0]);
    } catch (error) {
        console.error('Update note error:', error);
        res.status(500).json({ error: 'Failed to update note' });
    }
});

// Toggle pin status
router.patch('/:id/pin', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const pool = req.app.locals.pool;

        // Verify note belongs to user and get current pin status
        const [existing] = await pool.execute(
            'SELECT * FROM notes WHERE id = ? AND user_id = ?',
            [id, req.session.userId]
        );

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Note not found' });
        }

        const newPinStatus = !existing[0].is_pinned;

        await pool.execute(
            'UPDATE notes SET is_pinned = ? WHERE id = ?',
            [newPinStatus, id]
        );

        res.json({ isPinned: newPinStatus });
    } catch (error) {
        console.error('Toggle pin error:', error);
        res.status(500).json({ error: 'Failed to toggle pin status' });
    }
});

// Delete note
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const pool = req.app.locals.pool;

        // Verify note belongs to user
        const [existing] = await pool.execute(
            'SELECT * FROM notes WHERE id = ? AND user_id = ?',
            [id, req.session.userId]
        );

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Note not found' });
        }

        await pool.execute('DELETE FROM notes WHERE id = ?', [id]);

        res.json({ message: 'Note deleted successfully' });
    } catch (error) {
        console.error('Delete note error:', error);
        res.status(500).json({ error: 'Failed to delete note' });
    }
});

module.exports = router;
