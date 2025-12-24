const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: String,
    subject: String,
    questions: [{
        question: String,
        options: [String],
        correctAnswer: Number,
        explanation: String,
        userAnswer: Number,
        isCorrect: Boolean
    }],
    score: Number,
    totalQuestions: Number,
    timeTaken: Number, // in seconds
    difficulty: String,
    completedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Quiz', quizSchema);