const Exam = require("../modules/examModel");
const axios = require("axios");

// ✅ رفع صورة واحدة إلى ImgBB
const uploadToImgBB = async (buffer) => {
  try {
    const apiKey = process.env.IMGBB_API_KEY || '192530c1c337c43e5cc555d3dfd0ec3d';
    const base64Image = buffer.toString('base64');

    const formData = new URLSearchParams();
    formData.append('key', apiKey);
    formData.append('image', base64Image);

    const response = await axios.post("https://api.imgbb.com/1/upload", formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    return response.data.data.url;
  } catch (error) {
    console.error("ImgBB Upload Error:", error.response?.data || error.message);
    throw new Error("فشل رفع الصورة إلى ImgBB");
  }
};

// ✅ إنشاء امتحان جديد مع رفع الصور (إن وجدت)
const createExamWithImages = async (body, filesMap = {}) => {
  const {
    title,
    duration,
    visibility = "public",
    courseId = null,
    passingScore = 60,
    maxAttempts = -1,
    isUnlimitedAttempts = true,
    showResultsImmediately = true,
    shuffleQuestions = false,
    isActive = true,
    startDate = null,
    endDate = null,
    instructions = ""
  } = body;

  let questions = [];
  try {
    questions = JSON.parse(body.questions);
  } catch (error) {
    throw new Error("صيغة الأسئلة غير صحيحة. يجب أن تكون JSON.");
  }

  const processedQuestions = await Promise.all(
    questions.map(async (q, index) => {
      let imageUrl = null;
      const file = filesMap[String(index)];

      if (file) {
        imageUrl = await uploadToImgBB(file.buffer);
      }

      return {
        title: q.title,
        options: q.options,
        correctAnswer: q.correctAnswer,
        imageUrl,
      };
    })
  );

  const examData = {
    title,
    duration,
    questions: processedQuestions,
    visibility,
    passingScore: parseInt(passingScore),
    maxAttempts: isUnlimitedAttempts === "true" || isUnlimitedAttempts === true ? -1 : parseInt(maxAttempts),
    isUnlimitedAttempts: isUnlimitedAttempts === "true" || isUnlimitedAttempts === true,
    showResultsImmediately: showResultsImmediately === "true" || showResultsImmediately === true,
    shuffleQuestions: shuffleQuestions === "true" || shuffleQuestions === true,
    isActive: isActive === "true" || isActive === true,
    instructions,
  };

  // Add courseId if provided and visibility requires it
  if (courseId && courseId !== '' && courseId !== 'null' && (visibility === "course_only" || visibility === "both")) {
    examData.courseId = courseId;
  } else {
    examData.courseId = null;
  }

  // Add dates if provided
  if (startDate && startDate !== '') {
    examData.startDate = new Date(startDate);
  }
  if (endDate && endDate !== '') {
    examData.endDate = new Date(endDate);
  }

  const exam = await Exam.create(examData);

  // If exam is associated with a course, add it to the course's exams array
  if (courseId && (visibility === "course_only" || visibility === "both")) {
    const Course = require("../modules/courseModule");
    await Course.findByIdAndUpdate(
      courseId,
      { $addToSet: { exams: exam._id } },
      { new: true }
    );
  }

  return exam;
};

// ✅ جلب جميع الامتحانات مع التصفح والبحث
const getAllExams = async (page = 1, limit = 10, searchTerm = '', courseId = null, visibility = null) => {
  try {
    const skip = (page - 1) * limit;

    // Create search query
    let searchQuery = {};

    if (searchTerm) {
      searchQuery.title = { $regex: searchTerm, $options: 'i' };
    }

    if (courseId) {
      searchQuery.courseId = courseId;
    }

    if (visibility) {
      searchQuery.visibility = visibility;
    }

    // Get total count for pagination
    const totalExams = await Exam.countDocuments(searchQuery);

    // Get paginated and filtered exams
    const exams = await Exam.find(searchQuery)
      .populate('courseId', 'name level')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return {
      exams,
      currentPage: page,
      totalPages: Math.ceil(totalExams / limit),
      totalExams
    };
  } catch (error) {
    console.error("Get Exams Error:", error.message);
    throw new Error("فشل في جلب الامتحانات");
  }
};

// ✅ جلب امتحان حسب الـ ID
const getExamById = async (examId) => {
  try {
    const exam = await Exam.findById(examId);
    if (!exam) throw new Error("الامتحان غير موجود");
    return exam;
  } catch (error) {
    console.error("Get Exam By ID Error:", error.message);
    throw new Error("فشل في جلب الامتحان");
  }
};

// ✅ حذف امتحان حسب الـ ID
const deleteExamById = async (examId) => {
  try {
    const exam = await Exam.findByIdAndDelete(examId);
    if (!exam) throw new Error("الامتحان غير موجود");
    return exam;
  } catch (error) {
    console.error("Delete Exam Error:", error.message);
    throw new Error("فشل في حذف الامتحان");
  }
};

// ✅ تحديث امتحان حسب الـ ID
const updateExamById = async (examId, examData, filesMap = {}) => {
  try {
    const {
      title,
      duration,
      visibility,
      courseId,
      passingScore,
      maxAttempts,
      isUnlimitedAttempts,
      showResultsImmediately,
      shuffleQuestions,
      isActive,
      startDate,
      endDate,
      instructions
    } = examData;

    let questions = [];

    try {
      questions = JSON.parse(examData.questions);
    } catch (error) {
      throw new Error("صيغة الأسئلة غير صحيحة. يجب أن تكون JSON.");
    }

    const processedQuestions = await Promise.all(
      questions.map(async (q, index) => {
        let imageUrl = q.imageUrl; // Keep existing image if no new one
        const file = filesMap[String(index)];

        if (file) {
          imageUrl = await uploadToImgBB(file.buffer);
        }

        return {
          title: q.title,
          options: q.options,
          correctAnswer: q.correctAnswer,
          imageUrl,
        };
      })
    );

    const updateData = {
      title,
      duration,
      questions: processedQuestions,
    };

    // Add optional fields if provided
    if (visibility !== undefined) updateData.visibility = visibility;
    if (courseId !== undefined && courseId !== '' && courseId !== 'null') {
      updateData.courseId = courseId;
    } else if (courseId === '' || courseId === 'null' || courseId === undefined) {
      updateData.courseId = null;
    }
    if (passingScore !== undefined) updateData.passingScore = parseInt(passingScore);
    if (maxAttempts !== undefined || isUnlimitedAttempts !== undefined) {
      const isUnlimited = isUnlimitedAttempts === "true" || isUnlimitedAttempts === true;
      updateData.isUnlimitedAttempts = isUnlimited;
      updateData.maxAttempts = isUnlimited ? -1 : parseInt(maxAttempts || 1);
    }
    if (showResultsImmediately !== undefined) updateData.showResultsImmediately = showResultsImmediately === "true" || showResultsImmediately === true;
    if (shuffleQuestions !== undefined) updateData.shuffleQuestions = shuffleQuestions === "true" || shuffleQuestions === true;
    if (isActive !== undefined) updateData.isActive = isActive === "true" || isActive === true;
    if (instructions !== undefined) updateData.instructions = instructions;
    if (startDate && startDate !== '') updateData.startDate = new Date(startDate);
    if (endDate && endDate !== '') updateData.endDate = new Date(endDate);

    const exam = await Exam.findByIdAndUpdate(examId, updateData, { new: true });

    if (!exam) throw new Error("الامتحان غير موجود");

    // Handle course association
    const Course = require("../modules/courseModule");

    // Remove exam from all courses first
    await Course.updateMany(
      { exams: examId },
      { $pull: { exams: examId } }
    );

    // Add to new course if specified and visibility requires it
    if (courseId && courseId !== '' && courseId !== 'null' && (visibility === "course_only" || visibility === "both")) {
      await Course.findByIdAndUpdate(
        courseId,
        { $addToSet: { exams: examId } },
        { new: true }
      );
    }

    return exam;
  } catch (error) {
    console.error("Update Exam Error:", error.message);
    throw new Error("فشل في تحديث الامتحان");
  }
};

// ✅ جلب جميع الكورسات المتاحة للإدمن
const getAllCourses = async () => {
  try {
    const Course = require("../modules/courseModule");
    const courses = await Course.find({ isDraft: false })
      .select('name level description')
      .sort({ name: 1 });
    return courses;
  } catch (error) {
    console.error("Get Courses Error:", error.message);
    throw new Error("فشل في جلب الكورسات");
  }
};

// ✅ جلب الامتحانات المتاحة للطالب
const getAvailableExamsForStudent = async (studentId, page = 1, limit = 10) => {
  try {
    const skip = (page - 1) * limit;
    const Enrollment = require("../modules/enrollmentModel");

    // Get student's enrolled courses
    const enrollments = await Enrollment.find({
      studentId,
      paymentStatus: "paid"
    }).select('courseId');

    const enrolledCourseIds = enrollments.map(e => e.courseId);

    // Get current date for date filtering
    const now = new Date();

    // Build query for available exams
    const query = {
      isActive: true,
      $and: [
        {
          $or: [
            { startDate: null },
            { startDate: { $lte: now } }
          ]
        },
        {
          $or: [
            { endDate: null },
            { endDate: { $gte: now } }
          ]
        },
        {
          $or: [
            { visibility: "public" },
            {
              visibility: "both"
            },
            {
              visibility: "course_only",
              courseId: { $in: enrolledCourseIds }
            }
          ]
        }
      ]
    };

    const totalExams = await Exam.countDocuments(query);
    const exams = await Exam.find(query)
      .populate('courseId', 'name level')
      .select('-questions.correctAnswer') // Hide correct answers from students
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return {
      exams,
      currentPage: page,
      totalPages: Math.ceil(totalExams / limit),
      totalExams
    };
  } catch (error) {
    console.error("Get Available Exams Error:", error.message);
    throw new Error("فشل في جلب الامتحانات المتاحة");
  }
};

module.exports = {
  uploadToImgBB,
  createExamWithImages,
  getAllExams,
  getExamById,
  deleteExamById,
  updateExamById,
  getAllCourses,
  getAvailableExamsForStudent
};
