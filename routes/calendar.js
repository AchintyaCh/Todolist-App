const express = require('express');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// Get calendar events (with optional date range filter)
router.get('/', requireAuth, async (req, res) => {
    try {
        const { start, end, month, year } = req.query;
        const pool = req.app.locals.pool;

        let query = 'SELECT * FROM calendar_events WHERE user_id = ?';
        const values = [req.session.userId];

        if (start && end) {
            query += ' AND start_time >= ? AND end_time <= ?';
            values.push(start, end);
        } else if (month && year) {
            // Get events for a specific month
            const startOfMonth = new Date(year, month - 1, 1);
            const endOfMonth = new Date(year, month, 0, 23, 59, 59);
            query += ' AND ((start_time >= ? AND start_time <= ?) OR (end_time >= ? AND end_time <= ?) OR (start_time <= ? AND end_time >= ?))';
            values.push(startOfMonth, endOfMonth, startOfMonth, endOfMonth, startOfMonth, endOfMonth);
        }

        query += ' ORDER BY start_time ASC';

        const [events] = await pool.execute(query, values);

        res.json(events);
    } catch (error) {
        console.error('Get events error:', error);
        res.status(500).json({ error: 'Failed to get events' });
    }
});

// Get single event
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const pool = req.app.locals.pool;

        const [events] = await pool.execute(
            'SELECT * FROM calendar_events WHERE id = ? AND user_id = ?',
            [id, req.session.userId]
        );

        if (events.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }

        res.json(events[0]);
    } catch (error) {
        console.error('Get event error:', error);
        res.status(500).json({ error: 'Failed to get event' });
    }
});

// Create new event
router.post('/', requireAuth, async (req, res) => {
    try {
        const { title, description, startTime, endTime, color, allDay } = req.body;
        const pool = req.app.locals.pool;

        if (!title || !startTime || !endTime) {
            return res.status(400).json({ error: 'Title, start time, and end time are required' });
        }

        // Validate times
        const start = new Date(startTime);
        const end = new Date(endTime);
        
        if (end < start) {
            return res.status(400).json({ error: 'End time must be after start time' });
        }

        const [result] = await pool.execute(
            'INSERT INTO calendar_events (user_id, title, description, start_time, end_time, color, all_day) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
                req.session.userId,
                title,
                description || null,
                startTime,
                endTime,
                color || '#4285f4',
                allDay || false
            ]
        );

        const [newEvent] = await pool.execute('SELECT * FROM calendar_events WHERE id = ?', [result.insertId]);

        res.status(201).json(newEvent[0]);
    } catch (error) {
        console.error('Create event error:', error);
        res.status(500).json({ error: 'Failed to create event' });
    }
});

// Update event
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, startTime, endTime, color, allDay } = req.body;
        const pool = req.app.locals.pool;

        // Verify event belongs to user
        const [existing] = await pool.execute(
            'SELECT * FROM calendar_events WHERE id = ? AND user_id = ?',
            [id, req.session.userId]
        );

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
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
        if (startTime !== undefined) {
            updates.push('start_time = ?');
            values.push(startTime);
        }
        if (endTime !== undefined) {
            updates.push('end_time = ?');
            values.push(endTime);
        }
        if (color !== undefined) {
            updates.push('color = ?');
            values.push(color);
        }
        if (allDay !== undefined) {
            updates.push('all_day = ?');
            values.push(allDay);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(id);

        await pool.execute(
            `UPDATE calendar_events SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        const [updatedEvent] = await pool.execute('SELECT * FROM calendar_events WHERE id = ?', [id]);

        res.json(updatedEvent[0]);
    } catch (error) {
        console.error('Update event error:', error);
        res.status(500).json({ error: 'Failed to update event' });
    }
});

// Delete event
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const pool = req.app.locals.pool;

        // Verify event belongs to user
        const [existing] = await pool.execute(
            'SELECT * FROM calendar_events WHERE id = ? AND user_id = ?',
            [id, req.session.userId]
        );

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }

        await pool.execute('DELETE FROM calendar_events WHERE id = ?', [id]);

        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error('Delete event error:', error);
        res.status(500).json({ error: 'Failed to delete event' });
    }
});

module.exports = router;
