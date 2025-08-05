const mongoose = require("mongoose");

const lessonViewSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true,
    },
    chapterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Chapter",
        required: true,
    },
    lessonId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true, // This is the lesson _id within the chapter
    },
    lessonTitle: {
        type: String,
        required: true,
    },
    viewDuration: {
        type: Number, // Duration in seconds
        default: 0,
    },
    isCompleted: {
        type: Boolean,
        default: false,
    },
    ipAddress: {
        type: String,
        required: false,
    },
    userAgent: {
        type: String,
        required: false,
    },
    lastViewedAt: {
        type: Date,
        default: Date.now,
    }
}, {
    timestamps: true,
});

// Create compound index for efficient queries
lessonViewSchema.index({ studentId: 1, courseId: 1, chapterId: 1, lessonId: 1 });
lessonViewSchema.index({ courseId: 1, chapterId: 1, lessonId: 1 });
lessonViewSchema.index({ createdAt: -1 });

module.exports = mongoose.model("LessonView", lessonViewSchema);
