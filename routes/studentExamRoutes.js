const express = require("express");
const router = express.Router();
const { getAvailableExamsForStudent, getExamById } = require("../services/examServise");
const { protect } = require("../services/authService");
const Enrollment = require("../modules/enrollmentModel");
const StudentExamResult = require("../modules/examResultSchema");
const Exam = require("../modules/examModel"); // Add missing import

// ✅ Check if exam is available for student
router.get("/check-availability/:id", protect, async (req, res) => {
    try {
        const examId = req.params.id;
        const studentId = req.user.id;

        // Get exam details
        const exam = await getExamById(examId);

        // Check if exam is available
        const now = new Date();
        if (!exam.isActive) {
            return res.json({ available: false, message: "هذا الامتحان غير مفعل حالياً" });
        }

        if (exam.startDate && exam.startDate > now) {
            return res.json({ available: false, message: "الامتحان لم يبدأ بعد" });
        }

        if (exam.endDate && exam.endDate < now) {
            return res.json({ available: false, message: "انتهت فترة إجراء الامتحان" });
        }

        // Check enrollment for course-specific exams
        if (exam.visibility === 'course_only' || (exam.visibility === 'both' && exam.courseId)) {
            const enrollment = await Enrollment.findOne({
                studentId,
                courseId: exam.courseId,
                paymentStatus: "paid"
            });

            if (exam.visibility === 'course_only' && !enrollment) {
                return res.json({ available: false, message: "يجب أن تكون مشترك في الكورس لإجراء هذا الامتحان" });
            }
        }

        // Check if student has exceeded max attempts (only if not unlimited)
        const studentRecord = await StudentExamResult.findOne({ studentId });
        let previousAttempts = 0;

        if (studentRecord) {
            // Count attempts for this specific exam by matching examTitle
            const examTitle = exam.title;
            previousAttempts = studentRecord.results.filter(result =>
                result.examTitle === examTitle
            ).length;
        }

        // Check attempts only if exam has limited attempts
        // Handle backwards compatibility for exams without isUnlimitedAttempts field
        const isUnlimited = exam.isUnlimitedAttempts !== false && (exam.isUnlimitedAttempts === true || exam.maxAttempts === -1);

        if (!isUnlimited && exam.maxAttempts > 0 && previousAttempts >= exam.maxAttempts) {
            return res.json({
                available: false,
                message: `لقد استنفدت العدد المسموح من المحاولات (${exam.maxAttempts})`,
                attemptsUsed: previousAttempts,
                maxAttempts: exam.maxAttempts,
                isUnlimitedAttempts: false
            });
        }

        const responseData = {
            available: true,
            message: "الامتحان متاح",
            attemptsUsed: previousAttempts,
            isUnlimitedAttempts: isUnlimited
        };

        // Add attempt info only for limited attempts
        if (!isUnlimited && exam.maxAttempts > 0) {
            responseData.remainingAttempts = exam.maxAttempts - previousAttempts;
            responseData.maxAttempts = exam.maxAttempts;
        } else {
            responseData.remainingAttempts = "غير محدود";
            responseData.maxAttempts = "غير محدود";
        }

        res.json(responseData);
    } catch (error) {
        console.error('Error checking exam availability:', error);
        res.status(500).json({ available: false, message: error.message });
    }
});

// ✅ GET available exams for students
router.get("/available", protect, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const studentId = req.user.id;

        const result = await getAvailableExamsForStudent(studentId, page, limit);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ✅ GET specific exam for student (with enrollment check)
router.get("/exam/:id", protect, async (req, res) => {
    try {
        const examId = req.params.id;
        const studentId = req.user.id;

        // Get exam details
        const exam = await getExamById(examId);

        // Check if exam is available
        const now = new Date();
        if (!exam.isActive) {
            return res.status(403).json({ message: "هذا الامتحان غير مفعل حالياً" });
        }

        if (exam.startDate && exam.startDate > now) {
            return res.status(403).json({ message: "الامتحان لم يبدأ بعد" });
        }

        if (exam.endDate && exam.endDate < now) {
            return res.status(403).json({ message: "انتهت فترة إجراء الامتحان" });
        }

        // Check enrollment for course-specific exams
        if (exam.visibility === 'course_only' || (exam.visibility === 'both' && exam.courseId)) {
            const enrollment = await Enrollment.findOne({
                studentId,
                courseId: exam.courseId,
                paymentStatus: "paid"
            });

            if (exam.visibility === 'course_only' && !enrollment) {
                return res.status(403).json({ message: "يجب أن تكون مشترك في الكورس لإجراء هذا الامتحان" });
            }
        }

        // Check if student has exceeded max attempts (only if not unlimited)
        const studentRecord = await StudentExamResult.findOne({ studentId });
        let previousAttempts = 0;

        if (studentRecord) {
            // Count attempts for this specific exam by matching examTitle
            const examTitle = exam.title;
            previousAttempts = studentRecord.results.filter(result =>
                result.examTitle === examTitle
            ).length;
        }

        // Check attempts only if exam has limited attempts
        // Handle backwards compatibility for exams without isUnlimitedAttempts field
        const isUnlimited = exam.isUnlimitedAttempts !== false && (exam.isUnlimitedAttempts === true || exam.maxAttempts === -1);

        if (!isUnlimited && exam.maxAttempts > 0 && previousAttempts >= exam.maxAttempts) {
            return res.status(403).json({
                message: `لقد استنفدت العدد المسموح من المحاولات (${exam.maxAttempts})`
            });
        }

        // Remove correct answers from response for security
        const examForStudent = {
            ...exam.toObject(),
            questions: exam.questions.map(q => ({
                _id: q._id,
                title: q.title,
                options: q.options,
                imageUrl: q.imageUrl
                // correctAnswer removed for security
            })),
            attemptsRemaining: isUnlimited ? "غير محدود" : exam.maxAttempts - previousAttempts
        };

        res.json(examForStudent);
    } catch (error) {
        console.error('Error getting exam for student:', error);
        res.status(500).json({ message: error.message });
    }
});

// ✅ Submit exam answers
router.post("/submit/:id", protect, async (req, res) => {
    try {
        const examId = req.params.id;
        const studentId = req.user.id;
        const { answers, timeSpent } = req.body; // { questionId: selectedOption }

        // Get exam details
        const exam = await getExamById(examId);

        // Check if exam is still available
        const now = new Date();
        if (!exam.isActive || (exam.endDate && exam.endDate < now)) {
            return res.status(403).json({ message: "انتهت فترة إجراء الامتحان" });
        }

        // Check enrollment for course-specific exams
        if (exam.visibility === 'course_only' || (exam.visibility === 'both' && exam.courseId)) {
            const enrollment = await Enrollment.findOne({
                studentId,
                courseId: exam.courseId,
                paymentStatus: "paid"
            });

            if (exam.visibility === 'course_only' && !enrollment) {
                return res.status(403).json({ message: "غير مسموح لك بإجراء هذا الامتحان" });
            }
        }

        // Check if student has exceeded max attempts (only if not unlimited)
        const studentRecord = await StudentExamResult.findOne({ studentId });
        let previousAttempts = 0;

        if (studentRecord) {
            // Count attempts for this specific exam by matching examTitle
            const examTitle = exam.title;
            previousAttempts = studentRecord.results.filter(result =>
                result.examTitle === examTitle
            ).length;
        }

        // Check attempts only if exam has limited attempts
        // Handle backwards compatibility for exams without isUnlimitedAttempts field
        const isUnlimited = exam.isUnlimitedAttempts !== false && (exam.isUnlimitedAttempts === true || exam.maxAttempts === -1);

        if (!isUnlimited && exam.maxAttempts > 0 && previousAttempts >= exam.maxAttempts) {
            return res.status(403).json({
                message: `لقد استنفدت العدد المسموح من المحاولات (${exam.maxAttempts})`
            });
        }

        // Calculate score
        let score = 0;
        const totalQuestions = exam.questions.length;
        const questionResults = [];

        exam.questions.forEach(question => {
            const studentAnswer = answers[question._id.toString()];
            const isCorrect = studentAnswer === question.correctAnswer;

            if (isCorrect) {
                score++;
            }

            questionResults.push({
                questionId: question._id,
                questionTitle: question.title,
                studentAnswer,
                correctAnswer: question.correctAnswer,
                isCorrect
            });
        });

        const percentage = Math.round((score / totalQuestions) * 100);
        const passed = percentage >= exam.passingScore;

        // Save exam result to the student's record
        const newResult = {
            examTitle: exam.title,
            totalQuestions,
            correctAnswers: score,
            examDate: new Date(),
            attemptNumber: previousAttempts + 1,
            timeSpent: timeSpent || 0
        };

        let studentExamRecord = await StudentExamResult.findOne({ studentId });

        if (!studentExamRecord) {
            // Create new student exam record
            studentExamRecord = await StudentExamResult.create({
                studentId,
                results: [newResult]
            });
        } else {
            // Add result to existing record
            studentExamRecord.results.push(newResult);
            await studentExamRecord.save();
        }

        // Prepare response based on exam settings
        const response = {
            success: true,
            message: passed ? "تهانينا! لقد نجحت في الامتحان" : "للأسف، لم تحصل على الدرجة المطلوبة للنجاح",
            resultId: studentExamRecord._id,
            passed
        };

        // Show results immediately if allowed
        if (exam.showResultsImmediately) {
            response.results = {
                score,
                totalQuestions,
                percentage,
                passingScore: exam.passingScore,
                questionResults
            };
        }

        res.status(201).json(response);
    } catch (error) {
        console.error('Error submitting exam:', error);
        res.status(500).json({ message: error.message });
    }
});

// ✅ Get student's exam results
router.get("/:id/results", protect, async (req, res) => {
    try {
        const examId = req.params.id;
        const studentId = req.user.id;

        // Get exam details to check settings
        const exam = await Exam.findById(examId);
        if (!exam) {
            return res.status(404).json({ message: "الامتحان غير موجود" });
        }

        // Get student's exam record
        const studentRecord = await StudentExamResult.findOne({ studentId });

        if (!studentRecord || !studentRecord.results.length) {
            return res.status(404).json({ message: "لم تقم بإجراء هذا الامتحان بعد" });
        }

        // For now, return the student's results (this might need more logic to filter by exam)
        // Note: The old system doesn't store examId per result, so we return all results
        const filteredResults = studentRecord.results.map(result => ({
            _id: result._id,
            examTitle: result.examTitle,
            score: result.correctAnswers,
            totalQuestions: result.totalQuestions,
            percentage: Math.round((result.correctAnswers / result.totalQuestions) * 100),
            examDate: result.examDate,
            attemptNumber: result.attemptNumber
        }));

        res.json({ results: filteredResults });
    } catch (error) {
        console.error('Error getting exam results:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
