const express = require('express');
const bcrypt = require('bcrypt');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// Get user profile
router.get('/', requireAuth, async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        const [users] = await pool.execute(
            'SELECT id, username, email, display_name, profile_image, created_at, updated_at FROM users WHERE id = ?',
            [req.session.userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = users[0];
        res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            displayName: user.display_name,
            profileImage: user.profile_image,
            createdAt: user.created_at,
            updatedAt: user.updated_at
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to get profile' });
    }
});

// Update user profile
router.put('/', requireAuth, async (req, res) => {
    try {
        const { displayName, email, profileImage } = req.body;
        const pool = req.app.locals.pool;

        // Build update query dynamically
        const updates = [];
        const values = [];

        if (displayName !== undefined) {
            updates.push('display_name = ?');
            values.push(displayName);
        }
        if (email !== undefined) {
            // Check if email is already taken by another user
            const [existing] = await pool.execute(
                'SELECT id FROM users WHERE email = ? AND id != ?',
                [email, req.session.userId]
            );
            if (existing.length > 0) {
                return res.status(400).json({ error: 'Email already in use' });
            }
            updates.push('email = ?');
            values.push(email);
        }
        if (profileImage !== undefined) {
            updates.push('profile_image = ?');
            values.push(profileImage);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(req.session.userId);

        await pool.execute(
            `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        // Return updated profile
        const [users] = await pool.execute(
            'SELECT id, username, email, display_name, profile_image FROM users WHERE id = ?',
            [req.session.userId]
        );

        res.json({
            message: 'Profile updated successfully',
            user: {
                id: users[0].id,
                username: users[0].username,
                email: users[0].email,
                displayName: users[0].display_name,
                profileImage: users[0].profile_image
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Change password
router.put('/password', requireAuth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const pool = req.app.locals.pool;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new passwords are required' });
        }

        // Verify current password
        const [users] = await pool.execute(
            'SELECT password_hash FROM users WHERE id = ?',
            [req.session.userId]
        );

        const isValid = await bcrypt.compare(currentPassword, users[0].password_hash);
        if (!isValid) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Hash new password
        const saltRounds = 10;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

        // Update password
        await pool.execute(
            'UPDATE users SET password_hash = ? WHERE id = ?',
            [newPasswordHash, req.session.userId]
        );

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

module.exports = router;
