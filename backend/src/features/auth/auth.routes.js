const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { verifyToken, requireRole } = require('../../middleware/auth');

router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/refresh', authController.refresh);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Example protected route for testing (Can be removed later)
router.get('/me', verifyToken, (req, res) => {
    res.json({ success: true, user: req.user });
});

module.exports = router;
