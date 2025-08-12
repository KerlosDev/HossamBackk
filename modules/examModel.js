const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  options: {
    a: { type: String, required: true },
    b: { type: String, required: true },
    c: { type: String, required: true },
    d: { type: String, required: true },
  },
  correctAnswer: {
    type: String,
    enum: ["a", "b", "c", "d"],
    required: true,
  },
  imageUrl: {
    type: String, // رابط الصورة من Imgur
    default: null,
  }
});

const examSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  duration: {
    type: Number, // بالدقايق مثلاً
    required: true,
  },
  questions: [questionSchema],
  // Visibility and access control options
  visibility: {
    type: String,
    enum: ["public", "course_only", "both"], // public: anyone can take, course_only: only enrolled students, both: available in course and publicly
    default: "public",
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    default: null, // null if it's a public exam
  },
  // Additional exam settings
  passingScore: {
    type: Number,
    default: 60, // minimum percentage to pass
  },
  maxAttempts: {
    type: Number,
    default: -1, // -1 for unlimited attempts, positive number for limited attempts
  },
  isUnlimitedAttempts: {
    type: Boolean,
    default: true, // true for unlimited attempts, false for limited attempts
  },
  showResultsImmediately: {
    type: Boolean,
    default: true, // whether to show results after submission
  },
  shuffleQuestions: {
    type: Boolean,
    default: false, // randomize question order
  },
  isActive: {
    type: Boolean,
    default: true, // allow admin to enable/disable exam
  },
  startDate: {
    type: Date,
    default: null, // when exam becomes available
  },
  endDate: {
    type: Date,
    default: null, // when exam becomes unavailable
  },
  instructions: {
    type: String,
    default: "", // exam instructions for students
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model("Exam", examSchema);
