// Note Generator JavaScript with Open Router API Integration
const OPENROUTER_API_KEY = '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';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'meta-llama/llama-3.1-8b-instruct';

// Global variables
let currentNotes = '';
let currentPDFContent = '';
let isGenerating = false;
let speechSynthesis = null;
let currentUtterance = null;

// DOM Elements
const topicInput = document.getElementById('topicInput');
const generateBtn = document.getElementById('generateBtn');
const noteTypeSelect = document.getElementById('noteType');
const complexitySelect = document.getElementById('complexityLevel');
const customPrompt = document.getElementById('customPrompt');
const pdfUpload = document.getElementById('pdfUpload');
const uploadArea = document.getElementById('uploadArea');
const uploadInfo = document.getElementById('uploadInfo');
const pdfActions = document.getElementById('pdfActions');
const summarizeBtn = document.getElementById('summarizeBtn');
const extractBtn = document.getElementById('extractBtn');
const qaSection = document.getElementById('qaSection');
const questionInput = document.getElementById('questionInput');
const askBtn = document.getElementById('askBtn');
const notesDisplay = document.getElementById('notesDisplay');
const loadingState = document.getElementById('loadingState');
const qaResults = document.getElementById('qaResults');
const qaContent = document.getElementById('qaContent');
const mindmapSection = document.getElementById('mindmapSection');
const mindmapContainer = document.getElementById('mindmapContainer');
const clearBtn = document.getElementById('clearBtn');
const saveNoteBtn = document.getElementById('saveNoteBtn');
const exportBtn = document.getElementById('exportBtn');
const exportOptionsBtn = document.getElementById('exportOptionsBtn');
const voiceEnabled = document.getElementById('voiceEnabled');
const voiceSpeed = document.getElementById('voiceSpeed');
const speedValue = document.getElementById('speedValue');
const playBtn = document.getElementById('playBtn');
const pauseBtn = document.getElementById('pauseBtn');
const stopBtn = document.getElementById('stopBtn');

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    checkAIStatus();
    
    // Initialize text-to-speech
    if ('speechSynthesis' in window) {
        speechSynthesis = window.speechSynthesis;
    } else {
        voiceEnabled.checked = false;
        voiceEnabled.disabled = true;
        showNotification('Text-to-speech not supported in this browser', 'error');
    }
});

// Initialize all event listeners
function initializeEventListeners() {
    // Generate button
    generateBtn.addEventListener('click', generateNotesFromTopic);
    
    // Topic input enter key
    topicInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            generateNotesFromTopic();
        }
    });
    
    // PDF upload
    pdfUpload.addEventListener('change', handlePDFUpload);
    uploadArea.addEventListener('click', () => pdfUpload.click());
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('drop', handleFileDrop);
    
    // PDF actions
    if (summarizeBtn) summarizeBtn.addEventListener('click', summarizePDF);
    if (extractBtn) extractBtn.addEventListener('click', extractKeyPoints);
    
    // Q&A
    if (askBtn) askBtn.addEventListener('click', askQuestion);
    if (questionInput) {
        questionInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                askQuestion();
            }
        });
    }
    
    // Voice controls
    voiceSpeed.addEventListener('input', updateSpeedValue);
    playBtn.addEventListener('click', playTextToSpeech);
    pauseBtn.addEventListener('click', pauseTextToSpeech);
    stopBtn.addEventListener('click', stopTextToSpeech);
    
    // UI controls
    clearBtn.addEventListener('click', clearNotes);
    saveNoteBtn.addEventListener('click', saveNotes);
    exportOptionsBtn.addEventListener('click', showExportOptions);
    
    // Export options
    document.querySelectorAll('.export-option').forEach(option => {
        option.addEventListener('click', function(e) {
            e.preventDefault();
            const format = this.dataset.format;
            exportNotes(format);
        });
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.export-dropdown')) {
            document.querySelectorAll('.dropdown-menu').forEach(menu => {
                menu.style.display = 'none';
            });
        }
    });
}

// Check AI service status
function checkAIStatus() {
    const aiStatus = document.querySelector('.ai-status');
    const statusIndicator = aiStatus.querySelector('.status-indicator');
    
    // Check API connectivity
    fetch('https://openrouter.ai/api/v1/models', {
        headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`
        }
    })
    .then(response => {
        if (response.ok) {
            aiStatus.innerHTML = '<span class="status-indicator active"></span><span>AI Service Ready</span>';
        } else {
            aiStatus.innerHTML = '<span class="status-indicator inactive"></span><span>AI Service Offline</span>';
        }
    })
    .catch(() => {
        aiStatus.innerHTML = '<span class="status-indicator inactive"></span><span>AI Service Offline</span>';
    });
}

// Generate notes from topic
async function generateNotesFromTopic() {
    const topic = topicInput.value.trim();
    
    if (!topic) {
        showNotification('Please enter a topic to generate notes', 'error');
        topicInput.focus();
        return;
    }
    
    if (isGenerating) {
        showNotification('Already generating notes. Please wait...', 'info');
        return;
    }
    
    isGenerating = true;
    showLoadingState(true);
    
    try {
        const noteType = noteTypeSelect.value;
        const complexity = complexitySelect.value;
        const customInstructions = customPrompt.value.trim();
        
        // Create prompt based on note type
        const prompt = createNotePrompt(topic, noteType, complexity, customInstructions);
        
        // Call Open Router API
        const notes = await callOpenRouterAPI(prompt, noteType);
        
        // Display the generated notes
        displayNotes(notes, `Notes on: ${topic}`);
        currentNotes = notes;
        
        // Show mind map if selected
        if (noteType === 'mindmap') {
            showMindMap(notes, topic);
        } else {
            mindmapSection.style.display = 'none';
        }
        
        // Hide Q&A results
        qaResults.style.display = 'none';
        
        showNotification('Notes generated successfully!', 'success');
        
    } catch (error) {
        console.error('Error generating notes:', error);
        showNotification('Failed to generate notes. Please try again.', 'error');
        
        // Show fallback notes
        const fallbackNotes = createFallbackNotes(topicInput.value);
        displayNotes(fallbackNotes, `Notes on: ${topic}`);
        currentNotes = fallbackNotes;
        
    } finally {
        isGenerating = false;
        showLoadingState(false);
    }
}

// Create prompt for note generation
function createNotePrompt(topic, noteType, complexity, customInstructions) {
    const noteTypePrompts = {
        'comprehensive': 'Create comprehensive study notes with detailed explanations, examples, and key concepts.',
        'summary': 'Create a concise summary with main points and key takeaways.',
        'exam': 'Create exam preparation notes with important questions, answers, and study tips.',
        'mindmap': 'Create content organized as a mind map with main topics, subtopics, and connections.',
        'flashcards': 'Create flashcards format with questions on one side and answers on the other.'
    };
    
    const complexityPrompts = {
        'beginner': 'Use simple language and basic explanations suitable for beginners.',
        'intermediate': 'Use intermediate level explanations with some technical terms.',
        'advanced': 'Use advanced terminology and in-depth explanations.',
        'expert': 'Use expert-level explanations with technical depth and advanced concepts.'
    };
    
    let prompt = `Topic: ${topic}\n\n`;
    prompt += `Create ${noteTypePrompts[noteType] || 'study notes'} `;
    prompt += `at ${complexity} level: ${complexityPrompts[complexity]}\n\n`;
    
    if (customInstructions) {
        prompt += `Additional instructions: ${customInstructions}\n\n`;
    }
    
    prompt += `Please include:\n`;
    prompt += `1. Clear headings and structure\n`;
    prompt += `2. Key points and main ideas\n`;
    prompt += `3. Important definitions and terms\n`;
    prompt += `4. Examples and applications\n`;
    prompt += `5. Study tips and recommendations\n\n`;
    prompt += `Format the response in markdown with proper headings, bullet points, and sections.`;
    
    return prompt;
}

// Call Open Router API
async function callOpenRouterAPI(prompt, noteType = 'comprehensive') {
    const maxTokens = noteType === 'comprehensive' ? 2000 : 
                     noteType === 'summary' ? 1000 : 1500;
    
    const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://bytebuddy-ai.com',
            'X-Title': 'ByteBuddy AI Note Generator'
        },
        body: JSON.stringify({
            model: MODEL,
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert educational assistant. Create clear, well-structured study notes. Use markdown formatting with headings, bullet points, and emphasis where appropriate. Be accurate and comprehensive.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: maxTokens,
            temperature: 0.7
        })
    });
    
    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.choices && data.choices[0]) {
        return data.choices[0].message.content;
    }
    
    throw new Error('No response from AI');
}

// Create fallback notes (if API fails)
function createFallbackNotes(topic) {
    return `# ${topic}

## Overview
${topic} is an important subject that covers various aspects and applications.

## Key Concepts
- **Core Concept 1**: Explanation of the first key concept
- **Core Concept 2**: Explanation of the second key concept
- **Core Concept 3**: Explanation of the third key concept

## Main Points
1. **Point 1**: Important information about this point
2. **Point 2**: Additional details and explanations
3. **Point 3**: Further insights and applications

## Important Terms
- **Term 1**: Definition and explanation
- **Term 2**: Definition and context
- **Term 3**: Definition and usage

## Applications
- **Application 1**: How this topic is used in real-world scenarios
- **Application 2**: Practical uses and implementations
- **Application 3**: Industry applications and case studies

## Study Tips
• Review the key concepts regularly
• Create flashcards for important terms
• Practice with example problems
• Connect new knowledge to what you already know

## Summary
${topic} is a fundamental concept with wide-ranging applications. Mastering this topic requires understanding the core concepts, practicing applications, and regular review.

*Note: These are sample notes. For more accurate and detailed notes, please ensure the AI service is properly configured.*`;
}

// Display notes in the UI
function displayNotes(notes, title = 'Generated Notes') {
    // Hide empty state
    const emptyState = notesDisplay.querySelector('.empty-state');
    if (emptyState) {
        emptyState.style.display = 'none';
    }
    
    // Clear existing notes
    const existingNotes = notesDisplay.querySelector('.notes-content');
    if (existingNotes) {
        existingNotes.remove();
    }
    
    // Create notes container
    const notesContent = document.createElement('div');
    notesContent.className = 'notes-content';
    notesContent.innerHTML = `
        <div class="notes-header">
            <h3>${title}</h3>
            <div class="notes-meta">
                <span><i class="far fa-clock"></i> ${new Date().toLocaleString()}</span>
                <span><i class="fas fa-file-word"></i> ${notes.split(' ').length} words</span>
            </div>
        </div>
        <div class="notes-body">
            ${markdownToHTML(notes)}
        </div>
    `;
    
    notesDisplay.appendChild(notesContent);
    
    // Scroll to notes
    notesContent.scrollIntoView({ behavior: 'smooth' });
}

// Convert markdown to HTML (simplified)
function markdownToHTML(markdown) {
    return markdown
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^#### (.*$)/gm, '<h4>$1</h4>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/^\* (.*$)/gm, '<li>$1</li>')
        .replace(/^\d+\. (.*$)/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
        .replace(/\n\n/g, '<br><br>');
}

// Handle PDF upload
async function handlePDFUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.name.toLowerCase().endsWith('.pdf')) {
        showNotification('Please upload a PDF file', 'error');
        return;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
        showNotification('File size too large (max 10MB)', 'error');
        return;
    }
    
    // Show file info
    uploadInfo.style.display = 'block';
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = formatFileSize(file.size);
    
    // Show PDF actions
    pdfActions.style.display = 'flex';
    
    // Show Q&A section
    qaSection.style.display = 'block';
    
    showNotification('PDF uploaded successfully', 'success');
    
    // In a real implementation, you would upload to server for processing
    // For demo, we'll use a mock PDF content
    currentPDFContent = `[PDF Content: ${file.name}]\n\nThis is a simulated PDF content extraction. In a real implementation, the PDF would be processed to extract text content.`;
}

// Handle drag over
function handleDragOver(e) {
    e.preventDefault();
    uploadArea.style.backgroundColor = 'rgba(106, 17, 203, 0.1)';
    uploadArea.style.borderColor = 'var(--accent)';
}

// Handle file drop
function handleFileDrop(e) {
    e.preventDefault();
    uploadArea.style.backgroundColor = '';
    uploadArea.style.borderColor = '';
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        const file = files[0];
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        pdfUpload.files = dataTransfer.files;
        
        // Trigger change event
        const event = new Event('change', { bubbles: true });
        pdfUpload.dispatchEvent(event);
    }
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Remove PDF
function removePDF() {
    pdfUpload.value = '';
    uploadInfo.style.display = 'none';
    pdfActions.style.display = 'none';
    qaSection.style.display = 'none';
    currentPDFContent = '';
    showNotification('PDF removed', 'info');
}

// Summarize PDF
async function summarizePDF() {
    if (!currentPDFContent) {
        showNotification('Please upload a PDF first', 'error');
        return;
    }
    
    showLoadingState(true);
    
    try {
        const prompt = `Summarize the following PDF content in a clear, concise way. Focus on main ideas, key points, and important conclusions.\n\nPDF Content:\n${currentPDFContent.substring(0, 2000)}`;
        
        const summary = await callOpenRouterAPI(prompt, 'summary');
        displayNotes(summary, 'PDF Summary');
        currentNotes = summary;
        
        showNotification('PDF summarized successfully', 'success');
    } catch (error) {
        console.error('Error summarizing PDF:', error);
        showNotification('Failed to summarize PDF', 'error');
    } finally {
        showLoadingState(false);
    }
}

// Extract key points from PDF
async function extractKeyPoints() {
    if (!currentPDFContent) {
        showNotification('Please upload a PDF first', 'error');
        return;
    }
    
    showLoadingState(true);
    
    try {
        const prompt = `Extract key points, important facts, and main takeaways from the following PDF content. Present them in a structured format.\n\nPDF Content:\n${currentPDFContent.substring(0, 2000)}`;
        
        const keyPoints = await callOpenRouterAPI(prompt, 'summary');
        displayNotes(keyPoints, 'PDF Key Points');
        currentNotes = keyPoints;
        
        showNotification('Key points extracted successfully', 'success');
    } catch (error) {
        console.error('Error extracting key points:', error);
        showNotification('Failed to extract key points', 'error');
    } finally {
        showLoadingState(false);
    }
}

// Ask question about PDF
async function askQuestion() {
    const question = questionInput.value.trim();
    
    if (!question) {
        showNotification('Please enter a question', 'error');
        return;
    }
    
    if (!currentPDFContent) {
        showNotification('Please upload a PDF first', 'error');
        return;
    }
    
    showLoadingState(true);
    
    try {
        const prompt = `Based on the following PDF content, answer this question: "${question}"\n\nPDF Content:\n${currentPDFContent.substring(0, 2000)}`;
        
        const answer = await callOpenRouterAPI(prompt, 'summary');
        
        // Show Q&A results
        qaResults.style.display = 'block';
        qaContent.innerHTML = `
            <div class="question">
                <strong>Q:</strong> ${question}
            </div>
            <div class="answer">
                <strong>A:</strong> ${answer}
            </div>
        `;
        
        // Add to notes display as well
        displayNotes(`Question: ${question}\n\nAnswer: ${answer}`, 'Q&A Result');
        
        questionInput.value = '';
        showNotification('Question answered successfully', 'success');
        
    } catch (error) {
        console.error('Error answering question:', error);
        showNotification('Failed to answer question', 'error');
    } finally {
        showLoadingState(false);
    }
}

// Show mind map
function showMindMap(notes, topic) {
    mindmapSection.style.display = 'block';
    
    // Simplified mind map visualization
    // In a real implementation, you would use a mind map library
    const lines = notes.split('\n').filter(line => line.trim());
    const mainTopics = lines.filter(line => line.startsWith('# ') || line.startsWith('## '));
    
    let mindmapHTML = '<div class="mindmap">';
    mindmapHTML += `<div class="central-node">${topic}</div>`;
    
    mainTopics.forEach((topic, index) => {
        const level = topic.startsWith('# ') ? 1 : 2;
        const content = topic.replace(/^#+\s*/, '');
        mindmapHTML += `
            <div class="mindmap-node level-${level}">
                <div class="node-content">${content}</div>
            </div>
        `;
    });
    
    mindmapHTML += '</div>';
    mindmapContainer.innerHTML = mindmapHTML;
}

// Show loading state
function showLoadingState(show) {
    if (show) {
        loadingState.style.display = 'flex';
        generateBtn.disabled = true;
        if (summarizeBtn) summarizeBtn.disabled = true;
        if (extractBtn) extractBtn.disabled = true;
        if (askBtn) askBtn.disabled = true;
    } else {
        loadingState.style.display = 'none';
        generateBtn.disabled = false;
        if (summarizeBtn) summarizeBtn.disabled = false;
        if (extractBtn) extractBtn.disabled = false;
        if (askBtn) askBtn.disabled = false;
    }
}

// Update voice speed value
function updateSpeedValue() {
    speedValue.textContent = `${voiceSpeed.value}x`;
}

// Play text-to-speech
function playTextToSpeech() {
    if (!voiceEnabled.checked) {
        showNotification('Enable text-to-speech first', 'info');
        return;
    }
    
    if (!currentNotes) {
        showNotification('No notes to read', 'error');
        return;
    }
    
    if (speechSynthesis) {
        // Stop any ongoing speech
        speechSynthesis.cancel();
        
        // Create new utterance
        currentUtterance = new SpeechSynthesisUtterance(currentNotes.substring(0, 5000)); // Limit to 5000 chars
        currentUtterance.rate = parseFloat(voiceSpeed.value);
        currentUtterance.pitch = 1;
        currentUtterance.volume = 1;
        
        // Speak
        speechSynthesis.speak(currentUtterance);
        
        showNotification('Playing notes...', 'info');
    }
}

// Pause text-to-speech
function pauseTextToSpeech() {
    if (speechSynthesis && speechSynthesis.speaking) {
        speechSynthesis.pause();
        showNotification('Paused', 'info');
    }
}

// Stop text-to-speech
function stopTextToSpeech() {
    if (speechSynthesis) {
        speechSynthesis.cancel();
        showNotification('Stopped', 'info');
    }
}

// Clear notes
function clearNotes() {
    currentNotes = '';
    currentPDFContent = '';
    
    // Reset UI
    notesDisplay.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-lightbulb"></i>
            <h3>No Notes Generated Yet</h3>
            <p>Enter a topic or upload a PDF to generate AI-powered notes</p>
        </div>
    `;
    
    qaResults.style.display = 'none';
    mindmapSection.style.display = 'none';
    
    // Reset upload
    pdfUpload.value = '';
    uploadInfo.style.display = 'none';
    pdfActions.style.display = 'none';
    qaSection.style.display = 'none';
    
    showNotification('Cleared all notes', 'info');
}

// Save notes
function saveNotes() {
    if (!currentNotes) {
        showNotification('No notes to save', 'error');
        return;
    }
    
    // In a real implementation, this would save to a database
    // For now, we'll save to localStorage
    const savedNotes = JSON.parse(localStorage.getItem('savedNotes') || '[]');
    const note = {
        id: Date.now(),
        title: topicInput.value || 'Untitled Notes',
        content: currentNotes,
        timestamp: new Date().toISOString(),
        type: noteTypeSelect.value
    };
    
    savedNotes.unshift(note);
    localStorage.setItem('savedNotes', JSON.stringify(savedNotes.slice(0, 50))); // Keep last 50 notes
    
    showNotification('Notes saved successfully', 'success');
}

// Show export options
function showExportOptions() {
    const dropdown = document.querySelector('.export-dropdown .dropdown-menu');
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
}

// Export notes
function exportNotes(format) {
    if (!currentNotes) {
        showNotification('No notes to export', 'error');
        return;
    }
    
    let content, mimeType, extension;
    
    switch (format) {
        case 'pdf':
            // For PDF, we would typically use a library like jsPDF
            // For demo, we'll create a downloadable HTML file
            content = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>ByteBuddy AI Notes</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; }
                        h1 { color: #6a11cb; }
                        h2 { color: #2575fc; }
                        code { background: #f0f0f0; padding: 2px 4px; }
                    </style>
                </head>
                <body>
                    <h1>ByteBuddy AI Notes</h1>
                    <p>Generated on ${new Date().toLocaleString()}</p>
                    <hr>
                    <div>${markdownToHTML(currentNotes)}</div>
                </body>
                </html>
            `;
            mimeType = 'text/html';
            extension = 'html';
            break;
            
        case 'doc':
            content = currentNotes;
            mimeType = 'application/msword';
            extension = 'doc';
            break;
            
        case 'txt':
            content = currentNotes;
            mimeType = 'text/plain';
            extension = 'txt';
            break;
            
        case 'md':
            content = currentNotes;
            mimeType = 'text/markdown';
            extension = 'md';
            break;
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ByteBuddy_Notes_${Date.now()}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification(`Exported as ${format.toUpperCase()}`, 'success');
}

// Show notification
function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container') || createNotificationContainer();
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;
    
    container.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Create notification container if it doesn't exist
function createNotificationContainer() {
    const container = document.createElement('div');
    container.id = 'notification-container';
    container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
    `;
    document.body.appendChild(container);
    return container;
}

// Add CSS for notifications
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    .notification {
        background: var(--success);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
        animation: slideIn 0.3s ease;
    }
    
    .notification.error {
        background: var(--error);
    }
    
    .notification.info {
        background: var(--accent);
    }
    
    .notification button {
        background: none;
        border: none;
        color: white;
        font-size: 1.2rem;
        cursor: pointer;
        margin-left: 1rem;
    }
    
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(notificationStyles);