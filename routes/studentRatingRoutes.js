const express = require('express');
const router = express.Router();
const studentRatingService = require('../services/studentRatingService');

// Admin: Add or update a student's weekly rating
router.post('/rate', studentRatingService.addOrUpdateRating);

// Admin: Get all ratings for a student
router.get('/student/:studentId', studentRatingService.getStudentRatings);

// Admin: Get all ratings for all students
router.get('/all', studentRatingService.getAllRatings);

router.put('/rate/:ratingId', studentRatingService.updateRatingById);


module.exports = router;
