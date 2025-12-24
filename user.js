const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    // Basic info
    username: { type: String, required: true, unique: true, trim: true, minlength: 3 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    fullName: { type: String, trim: true },
    
    // Subscription
    subscription: { 
        type: String, 
        enum: ['free', 'premium', 'enterprise'], 
        default: 'free' 
    },
    subscriptionExpiry: { type: Date, default: null },
    
    // Usage limits (reset monthly)
    monthlyUsage: {
        notesGenerated: { type: Number, default: 0 },
        questionsAsked: { type: Number, default: 0 },
        quizzesTaken: { type: Number, default: 0 },
        careerSessions: { type: Number, default: 0 },
        languagePractice: { type: Number, default: 0 },
        habitEntries: { type: Number, default: 0 },
        month: { type: String, default: () => new Date().toISOString().slice(0, 7) }
    },
    
    // Tool-specific data
    toolsData: {
        noteGenerator: {
            savedNotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Note' }],
            preferences: {
                preferredFormat: { type: String, default: 'bullet' },
                complexityLevel: { type: String, default: 'intermediate' }
            }
        },
        doubtSolver: {
            recentQuestions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
            favoriteTopics: [String]
        },
        quizzes: {
            quizHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' }],
            weakAreas: [String],
            averageScore: { type: Number, default: 0 }
        },
        careerAssistant: {
            resumeData: { type: mongoose.Schema.Types.Mixed },
            skills: [String],
            targetRoles: [String]
        },
        habitTracker: {
            dailyEntries: [{ 
                date: Date,
                mood: Number,
                productivity: Number,
                studyHours: Number,
                notes: String
            }],
            currentStreak: { type: Number, default: 0 },
            longestStreak: { type: Number, default: 0 }
        },
        learningTool: {
            practiceHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Practice' }],
            proficiencyLevel: { type: String, default: 'beginner' }
        }
    },
    
    // Timestamps
    createdAt: { type: Date, default: Date.now },
    lastLogin: { type: Date, default: null },
    lastActivity: { type: Date, default: null },
    
    // Account status
    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },
    
    // Settings
    preferences: {
        theme: { type: String, default: 'dark' },
        notifications: { type: Boolean, default: true },
        language: { type: String, default: 'en' }
    }
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Check and reset monthly usage
userSchema.methods.checkAndResetMonthlyUsage = function() {
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    if (this.monthlyUsage.month !== currentMonth) {
        this.monthlyUsage = {
            notesGenerated: 0,
            questionsAsked: 0,
            quizzesTaken: 0,
            careerSessions: 0,
            languagePractice: 0,
            habitEntries: 0,
            month: currentMonth
        };
    }
    return this.monthlyUsage;
};

// Check if user can use feature (based on subscription)
userSchema.methods.canUseFeature = function(feature, increment = 1) {
    this.checkAndResetMonthlyUsage();
    
    const limits = {
        free: {
            notesGenerated: 10,
            questionsAsked: 20,
            quizzesTaken: 5,
            careerSessions: 3,
            languagePractice: 10,
            habitEntries: 30
        },
        premium: {
            notesGenerated: 1000,
            questionsAsked: 5000,
            quizzesTaken: 500,
            careerSessions: 100,
            languagePractice: 500,
            habitEntries: 1000
        },
        enterprise: {
            notesGenerated: 10000,
            questionsAsked: 50000,
            quizzesTaken: 5000,
            careerSessions: 1000,
            languagePractice: 5000,
            habitEntries: 10000
        }
    };
    
    const userLimit = limits[this.subscription][feature];
    const currentUsage = this.monthlyUsage[feature];
    
    return currentUsage + increment <= userLimit;
};

module.exports = mongoose.model('User', userSchema);