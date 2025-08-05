const express = require("express");
const router = express.Router();
const {
    trackLessonView,
    getLessonViews,
    getCourseViewsAnalytics,
    getChapterViewsAnalytics,
    getUserViewHistory
} = require("../services/lessonViewService");
const { protect } = require("../services/authService");

// Track a lesson view (protected route for students)
router.post("/track", protect, trackLessonView);

// Get views for a specific lesson (admin only)
router.get("/lesson/:courseId/:chapterId/:lessonId", protect, getLessonViews);

// Get course views analytics (admin only)
router.get("/course/:courseId/analytics", protect, getCourseViewsAnalytics);

// Get chapter views analytics (admin only)
router.get("/chapter/:chapterId/analytics", protect, getChapterViewsAnalytics);

// Get user's view history (for current user or admin)
router.get("/user/:userId/history", protect, getUserViewHistory);

module.exports = router;
