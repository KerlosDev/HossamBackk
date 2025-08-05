const expressAsyncHandler = require("express-async-handler");
const LessonView = require("../modules/lessonViewModel");
const Course = require("../modules/courseModule");
const Chapter = require("../modules/chapterModel");
const User = require("../modules/userModule");

// Track a lesson view
const trackLessonView = async (req, res) => {
    try {
        const { courseId, chapterId, lessonId, lessonTitle, viewDuration, isCompleted } = req.body;
        const studentId = req.user._id;

        // Validate course and chapter exist
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({
                success: false,
                message: "الكورس غير موجود"
            });
        }

        const chapter = await Chapter.findById(chapterId);
        if (!chapter) {
            return res.status(404).json({
                success: false,
                message: "الفصل غير موجود"
            });
        }

        // Check if lesson exists in chapter
        const lesson = chapter.lessons.id(lessonId);
        if (!lesson) {
            return res.status(404).json({
                success: false,
                message: "الدرس غير موجود"
            });
        }

        // Check if view already exists for this user/lesson
        let existingView = await LessonView.findOne({
            studentId,
            courseId,
            chapterId,
            lessonId
        });

        if (existingView) {
            // Update existing view
            existingView.viewDuration = Math.max(existingView.viewDuration, viewDuration || 0);
            existingView.isCompleted = isCompleted || existingView.isCompleted;
            existingView.lastViewedAt = new Date();
            await existingView.save();
        } else {
            // Create new view record
            existingView = await LessonView.create({
                studentId,
                courseId,
                chapterId,
                lessonId,
                lessonTitle: lessonTitle || lesson.title,
                viewDuration: viewDuration || 0,
                isCompleted: isCompleted || false,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            });
        }

        res.status(200).json({
            success: true,
            message: "تم تسجيل المشاهدة بنجاح",
            data: existingView
        });

    } catch (error) {
        console.error("Track Lesson View Error:", error);
        res.status(500).json({
            success: false,
            message: "خطأ في تسجيل المشاهدة",
            error: error.message
        });
    }
};

// Get views for a specific lesson
const getLessonViews = async (req, res) => {
    try {
        const { courseId, chapterId, lessonId } = req.params;

        const views = await LessonView.find({
            courseId,
            chapterId,
            lessonId
        })
            .populate('studentId', 'name email createdAt')
            .sort({ createdAt: -1 });

        const totalViews = views.length;
        const uniqueViewers = [...new Set(views.map(v => v.studentId._id.toString()))].length;
        const completedViews = views.filter(v => v.isCompleted).length;
        const totalDuration = views.reduce((sum, v) => sum + v.viewDuration, 0);
        const avgDuration = totalViews > 0 ? totalDuration / totalViews : 0;

        res.status(200).json({
            success: true,
            data: {
                views,
                analytics: {
                    totalViews,
                    uniqueViewers,
                    completedViews,
                    completionRate: totalViews > 0 ? (completedViews / totalViews * 100).toFixed(2) : 0,
                    totalDuration,
                    avgDuration: avgDuration.toFixed(2)
                }
            }
        });

    } catch (error) {
        console.error("Get Lesson Views Error:", error);
        res.status(500).json({
            success: false,
            message: "خطأ في جلب مشاهدات الدرس",
            error: error.message
        });
    }
};

// Get course views analytics with all chapters and lessons
const getCourseViewsAnalytics = async (req, res) => {
    try {
        const { courseId } = req.params;

        // Get course with populated chapters
        const course = await Course.findById(courseId).populate('chapters');
        if (!course) {
            return res.status(404).json({
                success: false,
                message: "الكورس غير موجود"
            });
        }

        // Get all views for this course
        const allViews = await LessonView.find({ courseId })
            .populate('studentId', 'name email')
            .sort({ createdAt: -1 });

        // Build analytics for each chapter and lesson
        const chaptersAnalytics = [];

        for (const chapter of course.chapters) {
            const chapterViews = allViews.filter(v => v.chapterId.toString() === chapter._id.toString());

            const lessonsAnalytics = chapter.lessons.map(lesson => {
                const lessonViews = chapterViews.filter(v => v.lessonId.toString() === lesson._id.toString());
                const uniqueViewers = [...new Set(lessonViews.map(v => v.studentId._id.toString()))].length;
                const completedViews = lessonViews.filter(v => v.isCompleted).length;
                const totalDuration = lessonViews.reduce((sum, v) => sum + v.viewDuration, 0);

                return {
                    lessonId: lesson._id,
                    lessonTitle: lesson.title,
                    totalViews: lessonViews.length,
                    uniqueViewers,
                    completedViews,
                    completionRate: lessonViews.length > 0 ? (completedViews / lessonViews.length * 100).toFixed(2) : 0,
                    totalDuration,
                    avgDuration: lessonViews.length > 0 ? (totalDuration / lessonViews.length).toFixed(2) : 0,
                    isFree: lesson.isFree
                };
            });

            const chapterTotalViews = chapterViews.length;
            const chapterUniqueViewers = [...new Set(chapterViews.map(v => v.studentId._id.toString()))].length;
            const chapterCompletedViews = chapterViews.filter(v => v.isCompleted).length;

            chaptersAnalytics.push({
                chapterId: chapter._id,
                chapterTitle: chapter.title,
                totalViews: chapterTotalViews,
                uniqueViewers: chapterUniqueViewers,
                completedViews: chapterCompletedViews,
                completionRate: chapterTotalViews > 0 ? (chapterCompletedViews / chapterTotalViews * 100).toFixed(2) : 0,
                lessonsCount: chapter.lessons.length,
                lessons: lessonsAnalytics
            });
        }

        // Overall course analytics
        const totalViews = allViews.length;
        const uniqueViewers = [...new Set(allViews.map(v => v.studentId._id.toString()))].length;
        const completedViews = allViews.filter(v => v.isCompleted).length;
        const totalDuration = allViews.reduce((sum, v) => sum + v.viewDuration, 0);

        res.status(200).json({
            success: true,
            data: {
                course: {
                    _id: course._id,
                    name: course.name,
                    chaptersCount: course.chapters.length,
                    totalLessons: course.chapters.reduce((sum, ch) => sum + ch.lessons.length, 0)
                },
                overallAnalytics: {
                    totalViews,
                    uniqueViewers,
                    completedViews,
                    completionRate: totalViews > 0 ? (completedViews / totalViews * 100).toFixed(2) : 0,
                    totalDuration,
                    avgDuration: totalViews > 0 ? (totalDuration / totalViews).toFixed(2) : 0
                },
                chapters: chaptersAnalytics
            }
        });

    } catch (error) {
        console.error("Get Course Views Analytics Error:", error);
        res.status(500).json({
            success: false,
            message: "خطأ في جلب تحليل مشاهدات الكورس",
            error: error.message
        });
    }
};

// Get chapter views analytics
const getChapterViewsAnalytics = async (req, res) => {
    try {
        const { chapterId } = req.params;

        const chapter = await Chapter.findById(chapterId);
        if (!chapter) {
            return res.status(404).json({
                success: false,
                message: "الفصل غير موجود"
            });
        }

        const chapterViews = await LessonView.find({ chapterId })
            .populate('studentId', 'name email')
            .sort({ createdAt: -1 });

        const lessonsAnalytics = chapter.lessons.map(lesson => {
            const lessonViews = chapterViews.filter(v => v.lessonId.toString() === lesson._id.toString());
            return {
                lessonId: lesson._id,
                lessonTitle: lesson.title,
                totalViews: lessonViews.length,
                uniqueViewers: [...new Set(lessonViews.map(v => v.studentId._id.toString()))].length,
                completedViews: lessonViews.filter(v => v.isCompleted).length,
                views: lessonViews
            };
        });

        res.status(200).json({
            success: true,
            data: {
                chapter,
                lessons: lessonsAnalytics
            }
        });

    } catch (error) {
        console.error("Get Chapter Views Analytics Error:", error);
        res.status(500).json({
            success: false,
            message: "خطأ في جلب تحليل مشاهدات الفصل",
            error: error.message
        });
    }
};

// Get user's view history
const getUserViewHistory = async (req, res) => {
    try {
        const { userId } = req.params;
        const requestingUserId = req.user._id.toString();

        // Check if user is requesting their own history or is admin
        if (userId !== requestingUserId && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "غير مصرح لك بالوصول لهذه البيانات"
            });
        }

        const viewHistory = await LessonView.find({ studentId: userId })
            .populate('courseId', 'name imageUrl')
            .populate('chapterId', 'title')
            .sort({ lastViewedAt: -1 })
            .limit(100); // Limit to recent 100 views

        const analytics = {
            totalViews: viewHistory.length,
            completedLessons: viewHistory.filter(v => v.isCompleted).length,
            totalWatchTime: viewHistory.reduce((sum, v) => sum + v.viewDuration, 0),
            coursesViewed: [...new Set(viewHistory.map(v => v.courseId._id.toString()))].length
        };

        res.status(200).json({
            success: true,
            data: {
                viewHistory,
                analytics
            }
        });

    } catch (error) {
        console.error("Get User View History Error:", error);
        res.status(500).json({
            success: false,
            message: "خطأ في جلب تاريخ المشاهدة",
            error: error.message
        });
    }
};

module.exports = {
    trackLessonView: expressAsyncHandler(trackLessonView),
    getLessonViews: expressAsyncHandler(getLessonViews),
    getCourseViewsAnalytics: expressAsyncHandler(getCourseViewsAnalytics),
    getChapterViewsAnalytics: expressAsyncHandler(getChapterViewsAnalytics),
    getUserViewHistory: expressAsyncHandler(getUserViewHistory)
};
