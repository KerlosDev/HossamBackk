const mongoose = require('mongoose');
const ApiError = require('../utils/apiError');

// Create a schema for wallet settings
const walletSettingsSchema = new mongoose.Schema({
    wallets: {
        vodafone: {
            phone: { type: String, default: '' },
            enabled: { type: Boolean, default: false }
        },
        orange: {
            phone: { type: String, default: '' },
            enabled: { type: Boolean, default: false }
        },
        etisalat: {
            phone: { type: String, default: '' },
            enabled: { type: Boolean, default: false }
        },
        instapay: {
            phone: { type: String, default: '' },
            enabled: { type: Boolean, default: false }
        }
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

// There will only be one document in this collection that stores all settings
walletSettingsSchema.statics.getSettings = async function () {
    // Get the first document or create one if none exists
    const settings = await this.findOne();
    if (!settings) {
        return this.create({});
    }
    return settings;
};

const WalletSettings = mongoose.model('WalletSettings', walletSettingsSchema);

// Get wallet settings
exports.getWalletSettings = async (req, res, next) => {
    try {
        // Get the settings document (creates one if it doesn't exist)
        const settings = await WalletSettings.getSettings();

        res.status(200).json({
            status: 'success',
            wallets: settings.wallets
        });
    } catch (error) {
        return next(new ApiError(`Error getting wallet settings: ${error.message}`, 500));
    }
};

// Update wallet settings
exports.updateWalletSettings = async (req, res, next) => {
    try {
        const { wallets } = req.body;

        // Validate input
        if (!wallets) {
            return next(new ApiError('Wallet data is required', 400));
        }

        // Validate that enabled wallets have valid phone numbers
        const enabledWallets = Object.keys(wallets).filter(key => wallets[key].enabled);

        if (enabledWallets.length === 0) {
            return next(new ApiError('At least one wallet must be enabled', 400));
        }

        for (const wallet of enabledWallets) {
            if (!wallets[wallet].phone) {
                return next(new ApiError(`Phone number is required for enabled wallet: ${wallet}`, 400));
            }

            // Basic Egyptian phone number validation (01 followed by 9 digits)
            const phoneRegex = /^01[0-9]{9}$/;
            if (!phoneRegex.test(wallets[wallet].phone)) {
                return next(new ApiError(`Invalid phone number format for ${wallet}`, 400));
            }
        }

        // Get the settings document (creates one if it doesn't exist)
        const settings = await WalletSettings.getSettings();

        // Update the wallets and last updated timestamp
        settings.wallets = wallets;
        settings.lastUpdated = Date.now();
        await settings.save();

        res.status(200).json({
            status: 'success',
            message: 'Wallet settings updated successfully',
            wallets: settings.wallets
        });
    } catch (error) {
        return next(new ApiError(`Error updating wallet settings: ${error.message}`, 500));
    }
};
