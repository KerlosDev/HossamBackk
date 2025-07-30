const StudentRating = require('../modules/studentRatingModel');
const User = require('../modules/userModule');

// Add or update a student's weekly rating
exports.addOrUpdateRating = async (req, res) => {
    try {
        const { studentId, week, stars, status, comment } = req.body;
        if (!studentId || !week || !stars || !status) {
            return res.status(400).json({ message: 'Missing required fields.' });
        }
        // Optionally, check if student exists
        const student = await User.findById(studentId);
        if (!student) return res.status(404).json({ message: 'Student not found.' });

        const rating = await StudentRating.findOneAndUpdate(
            { student: studentId, week },
            { stars, status, comment },
            { new: true, upsert: true }
        );
        return res.status(200).json({ success: true, rating: rating });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get all ratings for a student
exports.getStudentRatings = async (req, res) => {
    try {
        const { studentId } = req.params;
        const ratings = await StudentRating.find({ student: studentId }).sort({ week: -1 });
        res.status(200).json(ratings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get all ratings for all students (admin)
exports.getAllRatings = async (req, res) => {
    try {
        const ratings = await StudentRating.find().populate('student', 'name email');
        res.status(200).json(ratings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


exports.updateRatingById = async (req, res) => {
    try {
        const { ratingId } = req.params;
        const { stars, status, comment } = req.body;

        const updated = await StudentRating.findByIdAndUpdate(
            ratingId,
            { stars, status, comment },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ success: false, message: 'Rating not found' });
        }

        res.status(200).json({ success: true, rating: updated });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
