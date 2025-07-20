const { checkAndPublishScheduledCourses } = require('../services/coursesService');

/**
 * Middleware to check and publish scheduled courses when needed
 * This runs only when users interact with course-related endpoints
 */
const checkScheduledCourses = async (req, res, next) => {
    try {
        // Check and publish scheduled courses
        await checkAndPublishScheduledCourses();
        next();
    } catch (error) {
        console.error('Error checking scheduled courses:', error);
        // Don't block the request if checking scheduled courses fails
        next();
    }
};

module.exports = {
    checkScheduledCourses
};
