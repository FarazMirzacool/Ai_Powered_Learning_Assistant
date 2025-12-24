const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    summary: String,
    source: {
        type: { type: String, enum: ['pdf', 'text', 'audio', 'video', 'url'] },
        filename: String,
        url: String
    },
    format: { type: String, enum: ['bullet', 'outline', 'mindmap', 'flowchart'], default: 'bullet' },
    tags: [String],
    isPublic: { type: Boolean, default: false },
    sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    metadata: {
        wordCount: Number,
        readingTime: Number,
        complexity: String
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});

module.exports = mongoose.model('Note', noteSchema);