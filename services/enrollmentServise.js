const { default: mongoose } = require("mongoose");
const Enrollment = require("../modules/enrollmentModel");
const User = require("../modules/userModule");
const Course = require("../modules/courseModule");
const enrollmentModel = require("../modules/enrollmentModel");

exports.createEnrollStudent = async (req, res) => {
    try {
        const { courseId } = req.body;
        const studentId = req.user._id.toHexString();
        const phoneNumber = req.body.phoneNumber;

        console.log(studentId)

        const user = await User.findOne({ _id: studentId });
        if (!user) {
            return res.status(404).json({ message: "الطالب غير موجود." });
        }
        // Check if already enrolled
        const alreadyEnrolled = await Enrollment.findOne({ studentId, courseId });
        if (alreadyEnrolled) {
            return res.status(400).json({ message: "الطالب مشترك بالفعل في الكورس." });
        }


        // Fetch course information to check if it's free
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ message: "الكورس غير موجود." });
        }


        // Determine payment status based on whether the course is free
        const paymentStatus = course.isFree ? "paid" : "pending";
        const price = course.isFree ? 0 : (req.body.price || course.price);

        const enrollment = await Enrollment.create({
            studentId,
            courseId,
            price: price,
            phoneNumber,
            paymentStatus: paymentStatus,
        });

        res.status(201).json({
            message: course.isFree ? "تم الاشتراك في الكورس المجاني بنجاح" : "تم الاشتراك بنجاح",
            enrollment,
        });
    } catch (error) {
        console.error("Enrollment Error:", error);
        res.status(500).json({ message: "حصل خطأ أثناء الاشتراك" });
    }
};
exports.getEnrollById = async (req, res) => {
    try {
        const studentId = req.user._id;
        const courseId = req.params.courseId;

        const enrollment = await enrollmentModel.findOne({
            studentId,
            courseId,
            paymentStatus: "paid"
        }).populate({
            path: 'courseId',
            populate: [
                {
                    path: 'chapters',

                },
                {
                    path: 'exams',
                    select: 'title',
                }
            ]
        });

        // Always return a consistent response structure
        return res.status(200).json({
            success: true,
            isHeEnrolled: !!enrollment,
            enrollment: enrollment || null,
            message: enrollment ? "الطالب مشترك في هذا الكورس" : "الطالب غير مشترك بالكورس"
        });
    } catch (error) {
        console.error("Enrollment Check Error:", error);
        res.status(500).json({
            success: false,
            isHeEnrolled: false,
            enrollment: null,
            message: "حدث خطأ أثناء التحقق من الاشتراك"
        });
    }
};

exports.getAllUserErnollemnts = async (req, res) => {
    try {
        const studentId = req.user._id;
        const coursesAreEnrolled = await enrollmentModel.find({
            studentId,
            paymentStatus: "paid"
        }).populate('courseId');

        // Always return an array, even if empty
        return res.status(200).json({
            coursesAreEnrolled: coursesAreEnrolled || [],
            isHeEnrolled: coursesAreEnrolled && coursesAreEnrolled.length > 0
        });
    } catch (error) {
        console.error("Enrollment Check Error:", error);
        res.status(500).json({
            message: "حدث خطأ أثناء التحقق من الاشتراك",
            coursesAreEnrolled: [],
            isHeEnrolled: false
        });
    }
}

exports.updatePaymentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { paymentStatus } = req.body;

        // Validate status
        if (!['paid', 'failed', 'pending'].includes(paymentStatus)) {
            return res.status(400).json({
                message: "حالة الدفع غير صالحة. يجب أن تكون 'paid' أو 'failed' أو 'pending'"
            });
        }

        // Find enrollment without updating it first
        const enrollment = await enrollmentModel.findById(id)
            .populate('courseId')
            .populate('studentId', 'email phoneNumber');

        if (!enrollment) {
            return res.status(404).json({ message: "لم يتم العثور على التسجيل" });
        }

        // Keep the existing price when updating
        const updatedEnrollment = await enrollmentModel.findByIdAndUpdate(
            id,
            {
                paymentStatus,
                price: enrollment.price || 0 // Ensure price is maintained
            },
            {
                new: true,
                runValidators: false // Skip validation since we're keeping existing data
            }
        ).populate('courseId')
            .populate('studentId', 'email phoneNumber');

        const formattedEnrollment = {
            _id: updatedEnrollment._id,
            userEmail: updatedEnrollment.studentId.email,
            phoneNumber: updatedEnrollment.studentId.phoneNumber,
            courseName: updatedEnrollment.courseId.name,
            courseId: updatedEnrollment.courseId._id,
            price: updatedEnrollment.price,
            paymentStatus: updatedEnrollment.paymentStatus,
            createdAt: updatedEnrollment.createdAt
        };

        res.status(200).json({
            success: true,
            message: "تم تحديث حالة الدفع بنجاح",
            enrollment: formattedEnrollment
        });
    } catch (error) {
        console.error("Payment Update Error:", error);
        res.status(500).json({
            success: false,
            message: "حدث خطأ أثناء تحديث حالة الدفع",
            error: error.message
        });
    }
};

exports.getAllEnrollments = async (req, res) => {
    try {
        // Extract pagination parameters from query
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Extract search and filter parameters
        const searchQuery = req.query.search || '';
        const status = req.query.status || '';

        // Extract sorting parameters
        const sortBy = req.query.sortBy || 'createdAt';
        const sortOrder = req.query.sortOrder || 'desc';
        const sortOptions = {};

        // Set sort order based on parameters
        if (sortBy === 'date') {
            sortOptions.createdAt = sortOrder === 'desc' ? -1 : 1;
        } else if (sortBy === 'amount') {
            sortOptions.price = sortOrder === 'desc' ? -1 : 1;
        } else {
            // Default to sorting by createdAt
            sortOptions.createdAt = sortOrder === 'desc' ? -1 : 1;
        }

        // Build filter object
        const filter = {};

        // Add status filter if provided
        if (status && ['paid', 'pending', 'failed'].includes(status)) {
            filter.paymentStatus = status;
        }

        // Get total count of enrollments for pagination info
        let countQuery = enrollmentModel.find(filter);


        // If search query exists, apply it to count query
        if (searchQuery) {
            // We need to fetch IDs first since we're searching across related collections
            const studentIds = await User.find({
                $or: [
                    { email: { $regex: searchQuery, $options: 'i' } },
                    { phoneNumber: { $regex: searchQuery, $options: 'i' } }
                ]
            }).distinct('_id');

            const Course = require("../modules/courseModule");
            const courseIds = await Course.find({
                name: { $regex: searchQuery, $options: 'i' }
            }).distinct('_id');

            countQuery = countQuery.or([
                { studentId: { $in: studentIds } },
                { courseId: { $in: courseIds } },
                { phoneNumber: { $regex: searchQuery, $options: 'i' } }
            ]);
        }

        const totalEnrollments = await countQuery.countDocuments();


        // Build the main query
        let query = enrollmentModel.find(filter)
            .populate('courseId')
            .populate('studentId', 'email phoneNumber name')
            .sort(sortOptions)
            .skip(skip)
            .limit(limit);

        // Apply search filter if provided
        if (searchQuery) {
            const studentIds = await User.find({
                $or: [
                    { email: { $regex: searchQuery, $options: 'i' } },
                    { phoneNumber: { $regex: searchQuery, $options: 'i' } }
                ]
            }).distinct('_id');

            const Course = require("../modules/courseModule");
            const courseIds = await Course.find({
                name: { $regex: searchQuery, $options: 'i' }
            }).distinct('_id');

            query = query.or([
                { studentId: { $in: studentIds } },
                { courseId: { $in: courseIds } },
                { phoneNumber: { $regex: searchQuery, $options: 'i' } }
            ]);
        }

        const enrollments = await query;

        const formattedEnrollments = enrollments.map(enrollment => ({
            _id: enrollment._id,
            userEmail: enrollment.studentId?.email || 'N/A',
            phoneNumber: enrollment.phoneNumber,
            studentName: enrollment.studentId?.name || 'N/A',
            courseName: enrollment.courseId?.name || 'N/A',
            courseId: enrollment.courseId?._id || null,
            price: enrollment.price,
            paymentStatus: enrollment.paymentStatus,
            createdAt: enrollment.createdAt
        }));

        res.status(200).json({
            success: true,
            enrollments: formattedEnrollments,
            pagination: {
                totalItems: totalEnrollments,
                totalPages: Math.ceil(totalEnrollments / limit),
                currentPage: page,
                itemsPerPage: limit,
                hasNextPage: page < Math.ceil(totalEnrollments / limit),
                hasPrevPage: page > 1
            }
        });
    } catch (error) {
        console.error("Get Enrollments Error:", error);
        res.status(500).json({ message: "حدث خطأ أثناء جلب البيانات" });
    }
};

exports.getAllActiveForUser = async (req, res) => {
    try {
        const studentId = req.params.userid;
        console.log(studentId)
        const enrollment = await enrollmentModel.findOne({
            studentId,
            paymentStatus: "paid"
        }).populate({
            path: 'courseId',
            populate: [
                {
                    path: 'chapters',

                },
                {
                    path: 'exams',
                    select: 'title',
                }
            ]
        });

        // Always return a consistent response structure
        return res.status(200).json({
            success: true,
            isHeEnrolled: !!enrollment,
            enrollment: enrollment || null,
            message: enrollment ? "الطالب مشترك في هذا الكورس" : "الطالب غير مشترك بالكورس"
        });
    } catch (error) {
        console.error("Enrollment Check Error:", error);
        res.status(500).json({
            success: false,
            isHeEnrolled: false,
            enrollment: null,
            message: "حدث خطأ أثناء التحقق من الاشتراك"
        });
    }
};

exports.createEnrollmentByAdmin = async (req, res) => {
    try {
        const { studentId, courseId, price, paymentStatus = "paid" } = req.body;

        // Validate required fields
        if (!studentId || !courseId || !price) {
            return res.status(400).json({
                message: "جميع الحقول مطلوبة: معرف الطالب، معرف الكورس، والسعر"
            });
        }

        // Check if student exists
        const student = await User.findById(studentId);
        if (!student) {
            return res.status(404).json({ message: "الطالب غير موجود" });
        }

        // Check if course exists
        const Course = require("../modules/courseModule");
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ message: "الكورس غير موجود" });
        }

        // Check if already enrolled
        const alreadyEnrolled = await Enrollment.findOne({ studentId, courseId });
        if (alreadyEnrolled) {
            return res.status(400).json({
                message: "الطالب مشترك بالفعل في هذا الكورس"
            });
        }

        // Create enrollment
        const enrollment = await Enrollment.create({
            studentId,
            courseId,
            price,
            phoneNumber: student.phoneNumber,
            paymentStatus,
        });

        // Populate the enrollment data for response
        const populatedEnrollment = await Enrollment.findById(enrollment._id)
            .populate('courseId', 'name')
            .populate('studentId', 'name email phoneNumber');

        res.status(201).json({
            success: true,
            message: "تم إضافة الاشتراك بنجاح",
            enrollment: {
                _id: populatedEnrollment._id,
                userEmail: populatedEnrollment.studentId.email,
                studentName: populatedEnrollment.studentId.name,
                phoneNumber: populatedEnrollment.phoneNumber,
                courseName: populatedEnrollment.courseId.name,
                courseId: populatedEnrollment.courseId._id,
                price: populatedEnrollment.price,
                paymentStatus: populatedEnrollment.paymentStatus,
                createdAt: populatedEnrollment.createdAt
            }
        });
    } catch (error) {
        console.error("Admin Enrollment Creation Error:", error);
        res.status(500).json({
            success: false,
            message: "حصل خطأ أثناء إضافة الاشتراك"
        });
    }
};