const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

const { createExamWithImages, getAllExams, getExamById, deleteExamById, updateExamById, getAllCourses, getAvailableExamsForStudent } = require("../services/examServise");
const { isAdmin, isAdminOrInstructor, protect } = require("../services/authService");

// ✅ Controller لإنشاء الامتحان
const createExam = async (req, res) => {
  try {
    const filesMap = {};
    if (req.files && Array.isArray(req.files)) {
      req.files.forEach((file) => {
        const index = file.fieldname.match(/questions\[(\d+)\]/)?.[1];
        if (index !== undefined) {
          filesMap[index] = file;
        }
      });
    }

    const exam = await createExamWithImages(req.body, filesMap);
    res.status(201).json({ message: "تم إنشاء الامتحان بنجاح", exam });
  } catch (error) {
    console.error("Create Exam Error:", error);
    res.status(500).json({ message: error.message || "فشل إنشاء الامتحان" });
  }
};

// ✅ POST /api/exams
router.post("/", upload.any(), protect, isAdminOrInstructor, createExam);

// ✅ GET all exams with pagination and search
router.get("/", protect, isAdminOrInstructor, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const searchTerm = req.query.search || '';
    const courseId = req.query.courseId || null;
    const visibility = req.query.visibility || null;

    const result = await getAllExams(page, limit, searchTerm, courseId, visibility);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ✅ GET available courses for exam creation
router.get("/courses", protect, isAdminOrInstructor, async (req, res) => {
  try {
    const courses = await getAllCourses();
    res.json({ courses });
  } catch (error) {
    res.status(500).json({ message: error.message });
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

// ✅ GET exam by ID
router.get("/:id", async (req, res) => {
  try {
    const exam = await getExamById(req.params.id);
    res.json(exam);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});

// ✅ DELETE exam by ID
router.delete("/:id", protect, isAdminOrInstructor, async (req, res) => {
  try {
    const exam = await deleteExamById(req.params.id);
    res.json({ message: "تم حذف الامتحان بنجاح", exam });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});

// ✅ PUT update exam by ID
router.put("/:id", protect, isAdminOrInstructor, upload.any(), async (req, res) => {
  try {
    const filesMap = {};
    if (req.files && Array.isArray(req.files)) {
      req.files.forEach((file) => {
        const index = file.fieldname.match(/questions\[(\d+)\]/)?.[1];
        if (index !== undefined) {
          filesMap[index] = file;
        }
      });
    }

    const exam = await updateExamById(req.params.id, req.body, filesMap);
    res.json({ message: "تم تحديث الامتحان بنجاح", exam });
  } catch (error) {
    console.error("Update Exam Error:", error);
    res.status(500).json({ message: error.message || "فشل تحديث الامتحان" });
  }
});

module.exports = router;
