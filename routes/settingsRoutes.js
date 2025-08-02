const express = require('express');
const { getWalletSettings, updateWalletSettings } = require('../services/settingsService');
const { protect } = require('../services/authService');

// Middleware to check if the user is an admin
const protectAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({
            status: 'fail',
            message: 'You do not have permission to perform this action'
        });
    }
};

const router = express.Router();

// Get wallet settings
router.get('/wallets', protect, getWalletSettings);

// Update wallet settings
router.post('/wallets', protect, protectAdmin, updateWalletSettings);

module.exports = router;
