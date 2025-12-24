
// API Configuration
const API_BASE_URL = 'http://localhost:3000/api';

// Tool-specific API functions (GLOBAL SCOPE)
const ToolAPI = {
    // Note Generator
    async generateNote(content, sourceType, format, title) {
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('Please login first');
            
            const response = await fetch(`${API_BASE_URL}/notes/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ content, sourceType, format, title })
            });
            
            const data = await response.json();
            if (!data.success) throw new Error(data.message);
            
            return data.note;
        } catch (error) {
            console.error('Note generation error:', error);
            showNotification(error.message, 'error');
            throw error;
        }
    },
    
    async uploadFile(file) {
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('Please login first');
            
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await fetch(`${API_BASE_URL}/notes/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            
            const data = await response.json();
            if (!data.success) throw new Error(data.message);
            
            return data.note;
        } catch (error) {
            console.error('File upload error:', error);
            showNotification(error.message, 'error');
            throw error;
        }
    },
    
    // Doubt Solver
    async askQuestion(question, subject, topic, difficulty) {
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('Please login first');
            
            const response = await fetch(`${API_BASE_URL}/questions/ask`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ question, subject, topic, difficulty })
            });
            
            const data = await response.json();
            if (!data.success) throw new Error(data.message);
            
            return data.question;
        } catch (error) {
            console.error('Question error:', error);
            showNotification(error.message, 'error');
            throw error;
        }
    },
    
    // Quiz Generator
    async generateQuiz(subject, topic, difficulty, numberOfQuestions) {
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('Please login first');
            
            const response = await fetch(`${API_BASE_URL}/quizzes/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ subject, topic, difficulty, numberOfQuestions })
            });
            
            const data = await response.json();
            if (!data.success) throw new Error(data.message);
            
            return data.quiz;
        } catch (error) {
            console.error('Quiz generation error:', error);
            showNotification(error.message, 'error');
            throw error;
        }
    },
    
    async submitQuiz(quizId, answers) {
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('Please login first');
            
            const response = await fetch(`${API_BASE_URL}/quizzes/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ quizId, answers })
            });
            
            const data = await response.json();
            if (!data.success) throw new Error(data.message);
            
            return data.results;
        } catch (error) {
            console.error('Quiz submission error:', error);
            showNotification(error.message, 'error');
            throw error;
        }
    },
    
    // Career Assistant
    async analyzeCareer(skills, experience, goals) {
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('Please login first');
            
            const response = await fetch(`${API_BASE_URL}/career/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ skills, experience, goals })
            });
            
            const data = await response.json();
            if (!data.success) throw new Error(data.message);
            
            return data;
        } catch (error) {
            console.error('Career analysis error:', error);
            showNotification(error.message, 'error');
            throw error;
        }
    },
    
    // Habit Tracker
    async trackHabit(mood, productivity, studyHours, notes) {
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('Please login first');
            
            const response = await fetch(`${API_BASE_URL}/habits/track`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ mood, productivity, studyHours, notes })
            });
            
            const data = await response.json();
            if (!data.success) throw new Error(data.message);
            
            return data.stats;
        } catch (error) {
            console.error('Habit tracking error:', error);
            showNotification(error.message, 'error');
            throw error;
        }
    },
    
    // Learning Tool
    async practiceLearning(type, content, difficulty) {
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('Please login first');
            
            const response = await fetch(`${API_BASE_URL}/learning/practice`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ type, content, difficulty })
            });
            
            const data = await response.json();
            if (!data.success) throw new Error(data.message);
            
            return data.feedback;
        } catch (error) {
            console.error('Learning practice error:', error);
            showNotification(error.message, 'error');
            throw error;
        }
    },
    
    // User Stats
    async getUserStats() {
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('Please login first');
            
            const response = await fetch(`${API_BASE_URL}/user/stats`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const data = await response.json();
            if (!data.success) throw new Error(data.message);
            
            return data.stats;
        } catch (error) {
            console.error('Stats error:', error);
            throw error;
        }
    }
};

// Make ToolAPI available globally
window.ToolAPI = ToolAPI;

// Tool selection functionality with navigation
document.addEventListener('DOMContentLoaded', function() {
    const selectButtons = document.querySelectorAll('.select-btn');
    const toolDisplay = document.getElementById('tool-display');

    // Tool data for dynamic display
    const toolData = {
        'note-generator': {
            title: 'AI Note Generator',
            description: 'Transform your learning materials into organized, effective notes with our advanced AI processing. Upload lectures, PDFs, videos, or audio and let our AI extract key concepts, create summaries, and generate visual aids like mindmaps and flowcharts. Adjust the complexity level to match your understanding and convert notes into flashcards for efficient revision.',
            features: [
                'Upload lectures, PDFs, videos, or audio',
                'Generate summaries of complex content',
                'Create visual aids like mindmaps and flowcharts',
                'Adjust explanation difficulty levels',
                'Convert notes to flashcards for revision'
            ],
            actions: [
                { text: 'Upload Content', type: 'primary', url: 'note-generator.html' },
                { text: 'Try Sample', type: 'secondary', url: 'note-generator.html#sample' }
            ]
        },
        'doubt-solver': {
            title: 'AI Doubt Solver',
            description: 'Get instant, step-by-step explanations for any academic question using text or image input. Our AI understands context and provides multiple explanation styles - from simple "explain like I\'m 5" to detailed "interview-level depth". Upload images of math problems, coding questions, or circuit diagrams for visual problem recognition and solution.',
            features: [
                'Text-based question answering',
                'Image recognition for math, coding, circuits',
                'Step-by-step solution breakdown',
                'Multiple explanation styles',
                'Save solution history'
            ],
            actions: [
                { text: 'Ask a Question', type: 'primary', url: 'doubt-solver.html' },
                { text: 'Upload Image', type: 'secondary', url: 'doubt-solver.html#upload' }
            ]
        },
        'quizzes': {
            title: 'AI-Powered Interactive Quizzes',
            description: 'Reinforce your knowledge with adaptive quizzes that identify and target your weak areas. Our AI generates questions based on your learning materials and performance history, adjusting difficulty to match your progress. Get instant scoring with detailed feedback and track your improvement over time with comprehensive analytics.',
            features: [
                'Auto-generated questions from your content',
                'Chapter-wise and topic-specific tests',
                'Adjustable difficulty levels',
                'Instant scoring and feedback',
                'Performance tracking over time'
            ],
            actions: [
                { text: 'Start Quiz', type: 'primary', url: 'quiz-generator.html' },
                { text: 'View History', type: 'secondary', url: 'quiz-generator.html#history' }
            ]
        },
        'career-assistant': {
            title: 'AI Resume & Career Assistant',
            description: 'Prepare for your professional journey with AI-powered resume building and career guidance. Our system analyzes your skills, experience, and goals to create optimized resumes and cover letters. Get personalized internship and job recommendations, identify skills gaps, and receive a customized learning roadmap to achieve your career objectives.',
            features: [
                'AI-powered resume builder',
                'Personalized internship/job suggestions',
                'Skills gap analysis',
                'Learning roadmap creation',
                'Cover letter generator'
            ],
            actions: [
                { text: 'Build Resume', type: 'primary', url: 'career-assistant.html' },
                { text: 'Analyze Skills', type: 'secondary', url: 'career-assistant.html#analyze' }
            ]
        },
        'habit-tracker': {
            title: 'AI Habit & Mental Health Companion',
            description: 'Maintain productivity and mental well-being with personalized tracking and insights. Track your study habits, mood, and progress with our AI companion that provides motivational insights and helps you build consistent learning routines. Use the focus mode to minimize distractions and the reflection journal to gain insights into your learning patterns.',
            features: [
                'Daily mood and productivity tracking',
                'Study streak counter',
                'Personalized motivational insights',
                'Reflection journal with AI feedback',
                'Focus mode for distraction-free studying'
            ],
            actions: [
                { text: 'Track Today', type: 'primary', url: 'mental-health-companion.html' },
                { text: 'View Insights', type: 'secondary', url: 'mental-health-companion.html#insights' }
            ]
        },
        'language-tool': {
            title: 'AI Learning Tool',
            description: 'Improve your learning skills for academic, professional, or personal growth. Practice conversations with our AI language partner, get detailed feedback on pronunciation, and improve your writing with advanced grammar correction. Prepare for language proficiency tests like IELTS or enhance your interview communication skills with personalized exercises.',
            features: [
                'Grammar and writing correction',
                'Voice-based conversation practice',
                'Pronunciation analysis and scoring',
                'Essay and email improvement',
                'IELTS and interview preparation'
            ],
            actions: [
                { text: 'Practice Now', type: 'primary', url: 'ai-learning-tool.html' },
                { text: 'Upload Text', type: 'secondary', url: 'ai-learning-tool.html#upload' }
            ]
        }
    };
    
    // Add event listeners to all select buttons
    selectButtons.forEach(button => {
        button.addEventListener('click', function() {
            const featureCard = this.closest('.feature-card');
            const featureId = featureCard.getAttribute('data-feature');
            
            // Update the selected tool display
            displaySelectedTool(featureId);
            
            // Add visual feedback for selected tool
            document.querySelectorAll('.feature-card').forEach(card => {
                card.style.border = '1px solid rgba(106, 17, 203, 0.2)';
            });
            featureCard.style.border = '1px solid rgba(106, 17, 203, 0.7)';
        });
    });
    
    // Function to display the selected tool
    function displaySelectedTool(toolId) {
        const tool = toolData[toolId];
        
        let featuresHTML = '';
        tool.features.forEach(feature => {
            featuresHTML += `<div class="tool-feature">${feature}</div>`;
        });
        
        let actionsHTML = '';
        tool.actions.forEach(action => {
            const btnClass = action.type === 'primary' ? 'primary-btn' : 'secondary-btn';
            actionsHTML += `<button class="action-btn ${btnClass}" onclick="window.location.href='${action.url}'">${action.text}</button>`;
        });
        
        toolDisplay.innerHTML = `
            <div class="tool-content">
                <h3>${tool.title}</h3>
                <p>${tool.description}</p>
                <div class="tool-features">
                    ${featuresHTML}
                </div>
                <div class="tool-actions">
                    ${actionsHTML}
                </div>
            </div>
        `;
        
        toolDisplay.classList.add('tool-active');
    }
    
    // Initialize with project description instead of specific tool
    displayProjectDescription();
    
    // Function to display project description
    function displayProjectDescription() {
        toolDisplay.innerHTML = `
            <div class="tool-content">
                <h3>Welcome to ByteBuddy AI</h3>
                <p>ByteBuddy AI is an advanced AI-powered learning assistant designed to revolutionize how students and professionals learn, grow, and succeed. Our platform combines cutting-edge artificial intelligence with cognitive science principles to create personalized, adaptive learning experiences.</p>
                
                <p>With ByteBuddy AI, you get access to a comprehensive suite of intelligent tools that work together to enhance every aspect of your learning journey. From generating smart notes and solving complex doubts to creating interactive quizzes and providing career guidance - we've got you covered.</p>
                
                <div class="tool-features">
                    <div class="tool-feature">
                        <i class="fas fa-brain"></i>
                        <h4>Intelligent Learning</h4>
                        <p>AI algorithms adapt to your learning style and pace</p>
                    </div>
                    <div class="tool-feature">
                        <i class="fas fa-bolt"></i>
                        <h4>Instant Solutions</h4>
                        <p>Get answers and explanations in real-time</p>
                    </div>
                    <div class="tool-feature">
                        <i class="fas fa-chart-line"></i>
                        <h4>Progress Tracking</h4>
                        <p>Monitor your improvement with detailed analytics</p>
                    </div>
                    <div class="tool-feature">
                        <i class="fas fa-users"></i>
                        <h4>Personalized Experience</h4>
                        <p>Content tailored specifically to your needs</p>
                    </div>
                </div>
                
                <div class="tool-actions">
                    <button class="action-btn primary-btn" onclick="startLearning()">Start Learning Journey</button>
                    <button class="action-btn secondary-btn" onclick="viewAllFeatures()">Explore All Tools</button>
                </div>
            </div>
        `;
        
        toolDisplay.classList.remove('tool-active');
    }
    
    // Check auth status on page load
    checkAuthStatus();
});

// Global functions
function startLearning() {
    displayFirstTool();
}

function displayFirstTool() {
    // Display the first tool (Note Generator) when user clicks Start Learning
    const toolData = {
        'note-generator': {
            title: 'AI Note Generator',
            description: 'Transform your learning materials into organized, effective notes with our advanced AI processing. Upload lectures, PDFs, videos, or audio and let our AI extract key concepts, create summaries, and generate visual aids like mindmaps and flowcharts. Adjust the complexity level to match your understanding and convert notes into flashcards for efficient revision.',
            features: [
                'Upload lectures, PDFs, videos, or audio',
                'Generate summaries of complex content',
                'Create visual aids like mindmaps and flowcharts',
                'Adjust explanation difficulty levels',
                'Convert notes to flashcards for revision'
            ],
            actions: [
                { text: 'Upload Content', type: 'primary', url: 'note-generator.html' },
                { text: 'Try Sample', type: 'secondary', url: 'note-generator.html#sample' }
            ]
        }
    };
    
    const tool = toolData['note-generator'];
    const toolDisplay = document.getElementById('tool-display');
    
    let featuresHTML = '';
    tool.features.forEach(feature => {
        featuresHTML += `<div class="tool-feature">${feature}</div>`;
    });
    
    let actionsHTML = '';
    tool.actions.forEach(action => {
        const btnClass = action.type === 'primary' ? 'primary-btn' : 'secondary-btn';
        actionsHTML += `<button class="action-btn ${btnClass}" onclick="window.location.href='${action.url}'">${action.text}</button>`;
    });
    
    toolDisplay.innerHTML = `
        <div class="tool-content">
            <h3>${tool.title}</h3>
            <p>${tool.description}</p>
            <div class="tool-features">
                ${featuresHTML}
            </div>
            <div class="tool-actions">
                ${actionsHTML}
            </div>
        </div>
    `;
    
    toolDisplay.classList.add('tool-active');
}

function viewAllFeatures() {
    document.querySelector('.features').scrollIntoView({ behavior: 'smooth' });
}

function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Authentication functions for interface.html
function checkAuthStatus() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    
    if (token && user) {
        // User is logged in
        updateUIForLoggedInUser(user);
        return true;
    } else {
        // User is not logged in
        updateUIForGuest();
        return false;
    }
}

function updateUIForLoggedInUser(user) {
    const authButtons = document.querySelector('.auth-buttons');
    
    if (!authButtons) return;
    
    // Create user menu
    authButtons.innerHTML = `
        <div class="user-menu">
            <div class="user-info">
                <div class="user-avatar">
                    ${user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                </div>
                <span>${user.username || 'User'}</span>
                <div class="user-dropdown">
                    <button class="logout-btn" onclick="logout()">
                        <i class="fas fa-sign-out-alt"></i>
                        Logout
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Show welcome banner
    const existingBanner = document.querySelector('.welcome-banner');
    if (!existingBanner) {
        const welcomeBanner = document.createElement('div');
        welcomeBanner.className = 'welcome-banner';
        welcomeBanner.innerHTML = `
            <div class="container">
                <h3>Welcome back, ${user.fullName || user.username || 'User'}!</h3>
                <p>Continue your learning journey with ${user.subscription === 'premium' ? 'Premium' : 'Free'} access</p>
            </div>
        `;
        
        // Insert welcome banner after header
        const header = document.querySelector('header');
        if (header) {
            header.after(welcomeBanner);
        }
    }
}

function updateUIForGuest() {
    const authButtons = document.querySelector('.auth-buttons');
    
    if (!authButtons) return;
    
    // Remove existing welcome banner
    const existingBanner = document.querySelector('.welcome-banner');
    if (existingBanner) {
        existingBanner.remove();
    }
    
    // Show login/register buttons
    authButtons.innerHTML = `
        <button class="btn btn-outline" onclick="window.location.href='auth.html'">Login</button>
        <button class="btn btn-primary" onclick="window.location.href='auth.html#register'">Register</button>
        <button class="btn btn-primary" onclick="window.location.href='subscription.html'">Get Premium</button>
    `;
}

function logout() {
    // Clear local storage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Show notification
    showNotification('Logged out successfully', 'success');
    
    // Redirect to home after delay
    setTimeout(() => {
        window.location.href = 'interface.html';
    }, 1000);
}

// Make functions globally available
window.checkAuthStatus = checkAuthStatus;
window.updateUIForLoggedInUser = updateUIForLoggedInUser;
window.updateUIForGuest = updateUIForGuest;
window.logout = logout;
window.showNotification = showNotification;
window.startLearning = startLearning;
window.viewAllFeatures = viewAllFeatures;