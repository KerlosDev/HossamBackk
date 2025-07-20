const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String, // رابط الصورة
    required: true,
  },
  price: {
    type: Number,
    required: function () {
      return !this.isFree;
    },
  },
  isFree: {
    type: Boolean,
    default: false,
  },
  level: {
    type: String,
    enum: ["الصف الأول الثانوي", "الصف الثاني الثانوي", "الصف الثالث الثانوي"],
    required: true,
  },
  chapters: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chapter",
    }
  ],
  exams: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
    }
  ],
  isDraft: {
    type: Boolean,
    default: true,
  },
  scheduledPublishDate: {
    type: Date,
    default: null,
  },
  isScheduled: {
    type: Boolean,
    default: false,
  },
  publishStatus: {
    type: String,
    enum: ["draft", "published", "scheduled"],
    default: "draft",
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model("Course", courseSchema);
