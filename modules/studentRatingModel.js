const mongoose = require('mongoose');

const studentRatingSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    week: {
        type: String, // e.g., '2025-W31'
        required: true
    },
    stars: {
        type: Number,
        min: 1,
        max: 5,
        required: true
    },
    status: {
        type: String,
        enum: ['good', 'bad', 'average', 'excellent'],
        required: true
    },
    comment: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

studentRatingSchema.index({ student: 1, week: 1 }, { unique: true });

module.exports = mongoose.model('StudentRating', studentRatingSchema);
