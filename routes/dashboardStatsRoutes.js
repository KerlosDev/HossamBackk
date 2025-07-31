const {
    getNewStudentsCount,
    calculateTotalRevenue,
    getPendingEnrollments,
    getStudentsAnalytics,
    getStudentSignupsByDay,
    getAllStudentsProgress
} = require('../services/analyticsService');

const express = require('express');
const { protect, isAdmin } = require('../services/authService');
const router = express.Router();

// Protected routes (require authentication)
router.use(protect);

// Dashboard all-in-one endpoint
router.get('/dashboard', isAdmin, async (req, res) => {
    try {
        // NOTE: getAllStudentsProgress is very heavy and slows down the dashboard.
        // For now, skip it and return a placeholder for completionRate.
        // You can move this to a background job or cache it for real-time dashboards.
        const [
            newStudents,
            totalRevenue,
            pendingEnrollments,
            analytics,
            signups
        ] = await Promise.all([
            getNewStudentsCount(7),
            calculateTotalRevenue(),
            getPendingEnrollments(),
            getStudentsAnalytics(),
            getStudentSignupsByDay(30)
        ]);

        // Placeholder for completionRate (set to 0 or cached value)
        let completionRate = 0;
        // TODO: Calculate and cache completionRate in a background job for better performance

        res.json({
            success: true,
            data: {
                totalStudents: analytics.totalStudents || 0,
                newStudents: newStudents || 0,
                totalRevenue: totalRevenue || 0,
                pendingEnrollments: pendingEnrollments || 0,
                completionRate: completionRate || 0, // Placeholder, see above
                monthlyActiveUsers: analytics.monthlyActiveUsers || 0,
                highEngagement: analytics.highEngagement || 0,
                averageExamScore: analytics.averageExamScore || 0,
                governmentDistribution: analytics.governmentDistribution || [],
                levelDistribution: analytics.levelDistribution || [],
                signups: signups || [],
            }
        });
    } catch (error) {
        console.error('Error in /analytics/dashboard:', error);
        res.status(500).json({ success: false, message: 'Error fetching dashboard stats', error: error.message });
    }
});

module.exports = router;
