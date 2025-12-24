const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Import models
const User = require('./models/User');
const Note = require('./models/Note');
const Question = require('./models/Question');
const Quiz = require('./models/Quiz');

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bytebuddy', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('MongoDB connection error:', err);
});

// File upload configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /pdf|jpeg|jpg|png|mp3|mp4|wav|m4a/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('File type not allowed'));
        }
    }
});

// JWT authentication middleware
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        if (!token) return res.status(401).json({ success: false, message: 'Access token required' });
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        // Check if user exists and is active
        const user = await User.findById(decoded.userId);
        if (!user || !user.isActive) {
            return res.status(401).json({ success: false, message: 'User not found or inactive' });
        }
        
        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Token expired' });
        }
        return res.status(403).json({ success: false, message: 'Invalid token' });
    }
};

// ========== AUTH ROUTES ==========
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password, fullName } = req.body;
        
        const existingUser = await User.findOne({ 
            $or: [{ email }, { username }] 
        });
        
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'User with this email or username already exists' 
            });
        }
        
        const user = new User({
            username,
            email,
            password,
            fullName: fullName || username
        });
        
        await user.save();
        
        const token = jwt.sign(
            { userId: user._id, email: user.email, subscription: user.subscription },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '30d' }
        );
        
        res.status(201).json({
            success: true,
            message: 'Registration successful',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                subscription: user.subscription,
                monthlyUsage: user.monthlyUsage
            }
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error during registration' 
        });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { emailOrUsername, password } = req.body;
        
        const user = await User.findOne({
            $or: [
                { email: emailOrUsername },
                { username: emailOrUsername }
            ]
        });
        
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid credentials' 
            });
        }
        
        const isMatch = await user.comparePassword(password);
        
        if (!isMatch) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid credentials' 
            });
        }
        
        // Update last login
        user.lastLogin = new Date();
        await user.save();
        
        const token = jwt.sign(
            { 
                userId: user._id, 
                email: user.email, 
                subscription: user.subscription 
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '30d' }
        );
        
        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                subscription: user.subscription,
                monthlyUsage: user.monthlyUsage,
                toolsData: user.toolsData
            }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error during login' 
        });
    }
});

// ========== TOOL-SPECIFIC ROUTES ==========

// 1. NOTE GENERATOR ROUTES
app.post('/api/notes/generate', authenticateToken, async (req, res) => {
    try {
        const { content, sourceType, format, title } = req.body;
        const userId = req.user._id;
        
        // Check usage limit
        if (!req.user.canUseFeature('notesGenerated')) {
            return res.status(403).json({
                success: false,
                message: 'Monthly note generation limit reached. Upgrade to premium for more.'
            });
        }
        
        // AI Processing Logic (Simulated)
        const summary = content.length > 500 ? content.substring(0, 500) + '...' : content;
        const wordCount = content.split(/\s+/).length;
        const readingTime = Math.ceil(wordCount / 200); // 200 words per minute
        
        // Create note
        const note = new Note({
            userId,
            title: title || `Note ${new Date().toLocaleDateString()}`,
            content,
            summary,
            source: { type: sourceType || 'text' },
            format: format || 'bullet',
            tags: extractTags(content),
            metadata: {
                wordCount,
                readingTime,
                complexity: wordCount > 1000 ? 'high' : wordCount > 500 ? 'medium' : 'low'
            }
        });
        
        await note.save();
        
        // Update user's notes and usage
        req.user.toolsData.noteGenerator.savedNotes.push(note._id);
        req.user.monthlyUsage.notesGenerated += 1;
        req.user.lastActivity = new Date();
        await req.user.save();
        
        res.json({
            success: true,
            message: 'Note generated successfully',
            note: {
                id: note._id,
                title: note.title,
                content: note.content,
                summary: note.summary,
                format: note.format,
                metadata: note.metadata,
                createdAt: note.createdAt
            }
        });
        
    } catch (error) {
        console.error('Note generation error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error generating note' 
        });
    }
});

app.post('/api/notes/upload', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }
        
        // Check usage limit
        if (!req.user.canUseFeature('notesGenerated')) {
            // Delete uploaded file
            fs.unlinkSync(req.file.path);
            return res.status(403).json({
                success: false,
                message: 'Monthly upload limit reached'
            });
        }
        
        // Simulate file processing
        const fileContent = `Content extracted from ${req.file.originalname}...`;
        
        const note = new Note({
            userId: req.user._id,
            title: req.file.originalname,
            content: fileContent,
            source: {
                type: path.extname(req.file.originalname).substring(1),
                filename: req.file.filename,
                originalName: req.file.originalname
            },
            format: 'bullet',
            tags: [path.extname(req.file.originalname).substring(1)]
        });
        
        await note.save();
        
        // Update usage
        req.user.toolsData.noteGenerator.savedNotes.push(note._id);
        req.user.monthlyUsage.notesGenerated += 1;
        req.user.lastActivity = new Date();
        await req.user.save();
        
        res.json({
            success: true,
            message: 'File uploaded and processed',
            note: {
                id: note._id,
                title: note.title,
                fileUrl: `/uploads/${req.file.filename}`,
                format: note.format
            }
        });
        
    } catch (error) {
        console.error('File upload error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error processing file' 
        });
    }
});

// 2. DOUBT SOLVER ROUTES
app.post('/api/questions/ask', authenticateToken, async (req, res) => {
    try {
        const { question, subject, topic, difficulty, imageUrl } = req.body;
        const userId = req.user._id;
        
        // Check usage limit
        if (!req.user.canUseFeature('questionsAsked')) {
            return res.status(403).json({
                success: false,
                message: 'Monthly question limit reached'
            });
        }
        
        // Simulate AI response
        const solution = {
            steps: [
                {
                    stepNumber: 1,
                    description: 'Understand the problem',
                    explanation: 'First, we need to understand what is being asked.',
                    formula: null
                },
                {
                    stepNumber: 2,
                    description: 'Apply relevant concepts',
                    explanation: 'Based on the topic, we apply the appropriate formulas and methods.',
                    formula: 'Relevant formula here'
                },
                {
                    stepNumber: 3,
                    description: 'Solve step by step',
                    explanation: 'Breaking down the solution into manageable steps.',
                    formula: 'Step-by-step calculation'
                }
            ],
            finalAnswer: 'Simulated answer based on the question',
            explanationLevel: 'detailed'
        };
        
        const newQuestion = new Question({
            userId,
            question,
            subject: subject || 'General',
            topic: topic || 'General',
            difficulty: difficulty || 'medium',
            imageUrl,
            solution,
            isSolved: true
        });
        
        await newQuestion.save();
        
        // Update user data
        req.user.toolsData.doubtSolver.recentQuestions.push(newQuestion._id);
        if (topic && !req.user.toolsData.doubtSolver.favoriteTopics.includes(topic)) {
            req.user.toolsData.doubtSolver.favoriteTopics.push(topic);
        }
        req.user.monthlyUsage.questionsAsked += 1;
        req.user.lastActivity = new Date();
        await req.user.save();
        
        res.json({
            success: true,
            message: 'Question answered',
            question: {
                id: newQuestion._id,
                question: newQuestion.question,
                solution: newQuestion.solution,
                createdAt: newQuestion.createdAt
            }
        });
        
    } catch (error) {
        console.error('Question error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error processing question' 
        });
    }
});

// 3. QUIZ GENERATOR ROUTES
app.post('/api/quizzes/generate', authenticateToken, async (req, res) => {
    try {
        const { subject, topic, difficulty, numberOfQuestions } = req.body;
        const userId = req.user._id;
        
        // Check usage limit
        if (!req.user.canUseFeature('quizzesTaken')) {
            return res.status(403).json({
                success: false,
                message: 'Monthly quiz limit reached'
            });
        }
        
        // Generate quiz questions (simulated)
        const questions = Array.from({ length: numberOfQuestions || 10 }, (_, i) => ({
            question: `Sample question ${i + 1} about ${topic || subject || 'general knowledge'}`,
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correctAnswer: Math.floor(Math.random() * 4),
            explanation: 'This is a sample explanation for the correct answer.'
        }));
        
        const quiz = new Quiz({
            userId,
            title: `${subject || 'General'} Quiz - ${new Date().toLocaleDateString()}`,
            subject: subject || 'General',
            questions,
            totalQuestions: questions.length,
            difficulty: difficulty || 'medium'
        });
        
        await quiz.save();
        
        // Update user data
        req.user.toolsData.quizzes.quizHistory.push(quiz._id);
        req.user.monthlyUsage.quizzesTaken += 1;
        req.user.lastActivity = new Date();
        await req.user.save();
        
        res.json({
            success: true,
            message: 'Quiz generated',
            quiz: {
                id: quiz._id,
                title: quiz.title,
                questions: quiz.questions.map(q => ({
                    question: q.question,
                    options: q.options,
                    correctAnswer: q.correctAnswer
                })),
                totalQuestions: quiz.totalQuestions,
                difficulty: quiz.difficulty
            }
        });
        
    } catch (error) {
        console.error('Quiz generation error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error generating quiz' 
        });
    }
});

app.post('/api/quizzes/submit', authenticateToken, async (req, res) => {
    try {
        const { quizId, answers } = req.body;
        const userId = req.user._id;
        
        const quiz = await Quiz.findById(quizId);
        if (!quiz || quiz.userId.toString() !== userId.toString()) {
            return res.status(404).json({ 
                success: false, 
                message: 'Quiz not found' 
            });
        }
        
        // Calculate score
        let score = 0;
        quiz.questions.forEach((question, index) => {
            const userAnswer = answers[index];
            question.userAnswer = userAnswer;
            question.isCorrect = userAnswer === question.correctAnswer;
            if (question.isCorrect) score++;
        });
        
        quiz.score = score;
        quiz.completedAt = new Date();
        await quiz.save();
        
        // Update user's quiz history and weak areas
        req.user.toolsData.quizzes.averageScore = 
            ((req.user.toolsData.quizzes.averageScore * (req.user.toolsData.quizzes.quizHistory.length - 1)) + score) / 
            req.user.toolsData.quizzes.quizHistory.length;
        
        // Identify weak areas (questions answered incorrectly)
        quiz.questions.forEach(question => {
            if (!question.isCorrect && !req.user.toolsData.quizzes.weakAreas.includes(quiz.subject)) {
                req.user.toolsData.quizzes.weakAreas.push(quiz.subject);
            }
        });
        
        req.user.lastActivity = new Date();
        await req.user.save();
        
        res.json({
            success: true,
            message: 'Quiz submitted',
            results: {
                score,
                totalQuestions: quiz.totalQuestions,
                percentage: Math.round((score / quiz.totalQuestions) * 100),
                timeTaken: quiz.timeTaken,
                weakAreas: req.user.toolsData.quizzes.weakAreas
            }
        });
        
    } catch (error) {
        console.error('Quiz submission error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error submitting quiz' 
        });
    }
});

// 4. CAREER ASSISTANT ROUTES
app.post('/api/career/analyze', authenticateToken, async (req, res) => {
    try {
        const { skills, experience, goals } = req.body;
        
        // Check usage limit
        if (!req.user.canUseFeature('careerSessions')) {
            return res.status(403).json({
                success: false,
                message: 'Monthly career session limit reached'
            });
        }
        
        // AI analysis (simulated)
        const analysis = {
            skillGaps: ['Advanced JavaScript', 'Cloud Computing', 'System Design'],
            recommendedLearning: [
                { topic: 'React Advanced Patterns', resources: ['Documentation', 'YouTube Course'] },
                { topic: 'AWS Certification', resources: ['Official Guide', 'Practice Tests'] }
            ],
            jobMatches: [
                { role: 'Senior Frontend Developer', match: 85 },
                { role: 'Full Stack Developer', match: 78 }
            ],
            roadmap: {
                months: 6,
                milestones: [
                    { month: 1, goal: 'Master React Hooks' },
                    { month: 2, goal: 'Learn TypeScript' },
                    { month: 3, goal: 'Study System Design' }
                ]
            }
        };
        
        // Update user data
        req.user.toolsData.careerAssistant.skills = skills || [];
        req.user.toolsData.careerAssistant.targetRoles = goals?.targetRoles || [];
        req.user.monthlyUsage.careerSessions += 1;
        req.user.lastActivity = new Date();
        await req.user.save();
        
        res.json({
            success: true,
            message: 'Career analysis complete',
            analysis,
            recommendations: {
                immediate: 'Start with React Advanced Patterns',
                longTerm: 'Aim for Senior Developer position in 12 months'
            }
        });
        
    } catch (error) {
        console.error('Career analysis error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error analyzing career profile' 
        });
    }
});

// 5. HABIT TRACKER ROUTES
app.post('/api/habits/track', authenticateToken, async (req, res) => {
    try {
        const { mood, productivity, studyHours, notes } = req.body;
        
        // Check usage limit
        if (!req.user.canUseFeature('habitEntries')) {
            return res.status(403).json({
                success: false,
                message: 'Monthly habit tracking limit reached'
            });
        }
        
        const today = new Date().toISOString().split('T')[0];
        
        // Check if entry exists for today
        const existingEntryIndex = req.user.toolsData.habitTracker.dailyEntries.findIndex(
            entry => entry.date.toISOString().split('T')[0] === today
        );
        
        if (existingEntryIndex >= 0) {
            // Update existing entry
            req.user.toolsData.habitTracker.dailyEntries[existingEntryIndex] = {
                date: new Date(),
                mood,
                productivity,
                studyHours,
                notes
            };
        } else {
            // Add new entry
            req.user.toolsData.habitTracker.dailyEntries.push({
                date: new Date(),
                mood,
                productivity,
                studyHours,
                notes
            });
            
            // Update streak
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            
            const hasYesterdayEntry = req.user.toolsData.habitTracker.dailyEntries.some(
                entry => entry.date.toISOString().split('T')[0] === yesterdayStr
            );
            
            if (hasYesterdayEntry) {
                req.user.toolsData.habitTracker.currentStreak += 1;
                if (req.user.toolsData.habitTracker.currentStreak > req.user.toolsData.habitTracker.longestStreak) {
                    req.user.toolsData.habitTracker.longestStreak = req.user.toolsData.habitTracker.currentStreak;
                }
            } else {
                req.user.toolsData.habitTracker.currentStreak = 1;
            }
        }
        
        req.user.monthlyUsage.habitEntries += 1;
        req.user.lastActivity = new Date();
        await req.user.save();
        
        res.json({
            success: true,
            message: 'Habit tracked successfully',
            stats: {
                currentStreak: req.user.toolsData.habitTracker.currentStreak,
                longestStreak: req.user.toolsData.habitTracker.longestStreak,
                totalEntries: req.user.toolsData.habitTracker.dailyEntries.length
            }
        });
        
    } catch (error) {
        console.error('Habit tracking error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error tracking habit' 
        });
    }
});

// 6. LEARNING TOOL ROUTES
app.post('/api/learning/practice', authenticateToken, async (req, res) => {
    try {
        const { type, content, difficulty } = req.body;
        
        // Check usage limit
        if (!req.user.canUseFeature('languagePractice')) {
            return res.status(403).json({
                success: false,
                message: 'Monthly practice limit reached'
            });
        }
        
        // Simulate AI feedback
        const feedback = {
            grammarScore: Math.floor(Math.random() * 30) + 70, // 70-100
            suggestions: [
                'Consider using more varied vocabulary',
                'Sentence structure could be improved',
                'Good use of technical terms'
            ],
            correctedText: content + ' (AI-corrected version)',
            areasToImprove: ['Sentence variety', 'Technical accuracy']
        };
        
        req.user.monthlyUsage.languagePractice += 1;
        req.user.lastActivity = new Date();
        await req.user.save();
        
        res.json({
            success: true,
            message: 'Practice session completed',
            feedback,
            nextSteps: 'Practice with more complex sentences'
        });
        
    } catch (error) {
        console.error('Learning practice error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error processing practice session' 
        });
    }
});

// ========== USER DATA ROUTES ==========
app.get('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        // Populate user data with tool-specific data
        const user = await User.findById(req.user._id)
            .select('-password')
            .populate('toolsData.noteGenerator.savedNotes')
            .populate('toolsData.doubtSolver.recentQuestions')
            .populate('toolsData.quizzes.quizHistory');
        
        res.json({
            success: true,
            user
        });
        
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching profile' 
        });
    }
});

app.get('/api/user/stats', authenticateToken, async (req, res) => {
    try {
        const stats = {
            monthlyUsage: req.user.monthlyUsage,
            subscription: req.user.subscription,
            toolsData: {
                noteCount: req.user.toolsData.noteGenerator.savedNotes.length,
                questionCount: req.user.toolsData.doubtSolver.recentQuestions.length,
                quizCount: req.user.toolsData.quizzes.quizHistory.length,
                habitStreak: req.user.toolsData.habitTracker.currentStreak
            },
            lastActivity: req.user.lastActivity
        };
        
        res.json({ success: true, stats });
        
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching stats' 
        });
    }
});

// Helper function
function extractTags(content) {
    const words = content.toLowerCase().split(/\s+/);
    const commonTags = ['important', 'summary', 'key', 'concept', 'formula', 'example'];
    return commonTags.filter(tag => content.toLowerCase().includes(tag));
}

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});