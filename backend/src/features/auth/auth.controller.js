const pool = require('../../config/pg-db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');

// Setup Nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const login = async (req, res) => {
    try {
        const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
        const password = req.body.password;
        if (!email || typeof password !== 'string' || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required.' });
        }

        const result = await pool.query('SELECT * FROM users WHERE email = $1 AND is_active = TRUE', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials or inactive account.' });
        }

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const accessLifetime = parseInt(process.env.JWT_ACCESS_LIFETIME) || 900;
        const refreshLifetime = parseInt(process.env.JWT_REFRESH_LIFETIME) || 604800;

        const accessToken = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_ACCESS_SECRET,
            { expiresIn: accessLifetime }
        );

        const refreshToken = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: refreshLifetime }
        );

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: accessLifetime * 1000 
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: refreshLifetime * 1000
        });

        res.json({
            success: true,
            message: 'Logged in successfully.',
            user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

const signup = async (req, res) => {
    const fullName = typeof req.body.fullName === 'string' ? req.body.fullName.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = req.body.password;

    if (!fullName || fullName.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ success: false, message: 'A valid name and email are required.' });
    }
    if (typeof password !== 'string' || password.length < 8) {
        return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }

    try {
        const passwordHash = await bcrypt.hash(password, 12);
        const result = await pool.query(
            `INSERT INTO users (full_name, email, password_hash, role)
             VALUES ($1, $2, $3, 'staff')
             RETURNING id, full_name, email, role`,
            [fullName, email, passwordHash]
        );
        return res.status(201).json({
            success: true,
            message: 'Account created successfully. You can now sign in.',
            user: result.rows[0],
        });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
        }
        console.error('Signup error:', error);
        return res.status(500).json({ success: false, message: 'Unable to create account.' });
    }
};

const logout = (req, res) => {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.json({ success: true, message: 'Logged out successfully.' });
};

const refresh = (req, res) => {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
        return res.status(401).json({ success: false, message: 'No refresh token provided.' });
    }

    try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const accessLifetime = parseInt(process.env.JWT_ACCESS_LIFETIME) || 900;
        
        const newAccessToken = jwt.sign(
            { id: decoded.id, email: decoded.email, role: decoded.role },
            process.env.JWT_ACCESS_SECRET,
            { expiresIn: accessLifetime }
        );

        res.cookie('accessToken', newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: accessLifetime * 1000
        });

        res.json({ success: true, message: 'Token refreshed successfully.' });
    } catch (error) {
        res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
    }
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required.' });
        }

        const result = await pool.query('SELECT id FROM users WHERE email = $1 AND is_active = TRUE', [email.toLowerCase()]);
        if (result.rows.length === 0) {
            // Returning 200 even if user doesn't exist to prevent email enumeration
            return res.json({ success: true, message: 'If the email exists, a reset link will be sent.' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
        
        // Expiry in 1 hour
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); 

        await pool.query(
            'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
            [tokenHash, expiresAt, result.rows[0].id]
        );

        // In a real app, this would be a frontend URL like: http://localhost:3000/reset-password?token=${resetToken}&email=${email}
        const resetLink = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email.toLowerCase())}`;

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Password Reset Request',
            text: `You requested a password reset. Please use the following link to reset your password: ${resetLink}\n\nThis link will expire in 1 hour.`
        };

        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: 'If the email exists, a reset link will be sent.' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { email, token, newPassword } = req.body;
        if (!email || !token || !newPassword) {
            return res.status(400).json({ success: false, message: 'Email, token, and new password are required.' });
        }

        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        const result = await pool.query(
            'SELECT id, reset_token_expires FROM users WHERE email = $1 AND reset_token = $2 AND is_active = TRUE',
            [email.toLowerCase(), tokenHash]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid or expired reset token.' });
        }

        const user = result.rows[0];
        if (new Date() > new Date(user.reset_token_expires)) {
            return res.status(400).json({ success: false, message: 'Reset token has expired.' });
        }

        const newPasswordHash = await bcrypt.hash(newPassword, 12);

        await pool.query(
            'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
            [newPasswordHash, user.id]
        );

        res.json({ success: true, message: 'Password has been successfully reset.' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

module.exports = {
    login,
    signup,
    logout,
    refresh,
    forgotPassword,
    resetPassword
};
