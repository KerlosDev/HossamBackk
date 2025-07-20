const mongoose = require("mongoose");

const lessonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  videoUrl: {
    type: String,
    required: true,
  },
  fileName: {
    type: String,
    required: false,
    default: ''
  },
  fileUrl: {
    type: String,
  },
  isFree: {
    type: Boolean,
    default: false,
  }
});

const chapterSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  lessons: [lessonSchema], // دروس داخل الفصل
}, {
  timestamps: true,
});

module.exports = mongoose.model("Chapter", chapterSchema);
