const mongoose = require('mongoose');

const egyptGovernments = [
    "القاهرة", "الجيزة", "الإسكندرية", "الدقهلية", "البحر الأحمر", "البحيرة",
    "الفيوم", "الغربية", "الإسماعيلية", "المنوفية", "المنيا", "القليوبية",
    "الوادي الجديد", "السويس", "أسوان", "أسيوط", "بني سويف", "بورسعيد",
    "دمياط", "الشرقية", "جنوب سيناء", "كفر الشيخ", "مطروح", "الأقصر",
    "قنا", "شمال سيناء", "سوهاج"
];


const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    phoneNumber: {
        type: String,
        required: true,
        unique: true,
        match: /^[0-9]{10,15}$/
    },
    parentPhoneNumber: {
        type: String,
        required: false,
        match: /^[0-9]{10,15}$/
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        match: /.+\@.+\..+/
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    gender: {
        type: String,
        required: true,
        enum: ['ذكر', 'انثي']
    },
    level: {
        type: String,
        required: true,
        enum: ["الصف الثالث الثانوي", "الصف الثاني الثانوي", "الصف الأول الثانوي"]
    },
    government: {
        type: String,
        required: true,
        enum: egyptGovernments
    },
    isBanned: {
        type: Boolean,
        default: false
    },
    banReason: {
        type: String,
        default: null
    },
    lastActive: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    role: {
        type: String,
        enum: ['user', 'admin','instructor','follow'],
        default: 'user'
    },
    currentSessionToken: {
        type: String,
        default: null
    },
    currentDeviceInfo: {
        type: String,
        default: null
    },
    sessionCreatedAt: {
        type: Date,
        default: null
    }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
