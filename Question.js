const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    question: { type: String, required: true },
    subject: String,
    topic: String,
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    imageUrl: String,
    solution: {
        steps: [{
            stepNumber: Number,
            description: String,
            explanation: String,
            formula: String
        }],
        finalAnswer: String,
        explanationLevel: { type: String, enum: ['basic', 'detailed', 'expert'], default: 'detailed' }
    },
    isSolved: { type: Boolean, default: false },
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Question', questionSchema);