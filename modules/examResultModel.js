const mongoose = require('mongoose');

const examResultSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    examId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Exam',
        required: true
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        default: null
    },
    score: {
        type: Number,
        required: true
    },
    totalQuestions: {
        type: Number,
        required: true
    },
    percentage: {
        type: Number,
        required: true
    },
    passed: {
        type: Boolean,
        required: true
    },
    timeSpent: {
        type: Number, // in seconds
        default: 0
    },
    answers: {
        type: Map,
        of: String, // questionId -> selectedAnswer
        default: new Map()
    },
    questionResults: [{
        questionId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        questionTitle: String,
        studentAnswer: String,
        correctAnswer: String,
        isCorrect: Boolean
    }],
    submittedAt: {
        type: Date,
        default: Date.now
    },
    attemptNumber: {
        type: Number,
        required: true
    }
}, {
    timestamps: true
});

// Compound index to ensure proper querying and prevent duplicate attempts
examResultSchema.index({ studentId: 1, examId: 1, attemptNumber: 1 }, { unique: true });

module.exports = mongoose.model('ExamResult', examResultSchema);
