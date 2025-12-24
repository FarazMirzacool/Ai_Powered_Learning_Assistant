// Doubt Solver JavaScript with OpenRouter API Integration
document.addEventListener('DOMContentLoaded', function() {
    // API Configuration
    const OPENROUTER_API_KEY = "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";
    const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
    
    // Model mapping based on subject
    const MODEL_MAPPING = {
        "mathematics": "mistralai/mistral-7b-instruct:free",
        "physics": "mistralai/mistral-7b-instruct:free",
        "chemistry": "mistralai/mistral-7b-instruct:free",
        "biology": "mistralai/mistral-7b-instruct:free",
        "computer-science": "mistralai/mistral-7b-instruct:free",
        "engineering": "mistralai/mistral-7b-instruct:free",
        "economics": "mistralai/mistral-7b-instruct:free",
        "general": "mistralai/mistral-7b-instruct:free",
        "other": "mistralai/mistral-7b-instruct:free"
    };

    // DOM Elements
    const elements = {
        // Tabs
        tabs: document.querySelectorAll('.input-tab'),
        textInput: document.getElementById('text-input'),
        imageInput: document.getElementById('image-input'),
        handwritingInput: document.getElementById('handwriting-input'),
        
        // Text Input
        subjectSelect: document.getElementById('subject'),
        questionText: document.getElementById('question-text'),
        charCount: document.getElementById('char-count'),
        styleOptions: document.querySelectorAll('input[name="style"]'),
        
        // Image Input
        imageUpload: document.getElementById('image-upload'),
        browseBtn: document.getElementById('browse-btn'),
        uploadArea: document.getElementById('upload-area'),
        previewArea: document.getElementById('preview-area'),
        imagePreview: document.getElementById('image-preview'),
        fileName: document.getElementById('file-name'),
        fileSize: document.getElementById('file-size'),
        imageSubject: document.getElementById('image-subject'),
        changeImage: document.getElementById('change-image'),
        
        // Handwriting Input
        canvas: document.getElementById('drawing-canvas'),
        canvasTools: document.querySelectorAll('.canvas-tool'),
        penColor: document.getElementById('pen-color'),
        penSize: document.getElementById('pen-size'),
        sizeValue: document.getElementById('size-value'),
        clearCanvas: document.getElementById('clear-canvas'),
        uploadCanvas: document.getElementById('upload-canvas'),
        
        // Buttons
        solveBtn: document.getElementById('solve-btn'),
        clearBtn: document.getElementById('clear-btn'),
        
        // Results
        resultsSection: document.getElementById('results-section'),
        loadingSection: document.getElementById('loading-section'),
        resultsContent: document.querySelector('.results-content'),
        solutionSubject: document.getElementById('solution-subject'),
        solutionStyle: document.getElementById('solution-style'),
        saveSolution: document.getElementById('save-solution'),
        exportSolution: document.getElementById('export-solution'),
        newQuestion: document.getElementById('new-question'),
        
        // User Elements
        welcomeBanner: document.getElementById('welcome-banner'),
        usernameDisplay: document.getElementById('username-display')
    };

    // Canvas Drawing Variables
    let canvasContext = null;
    let isDrawing = false;
    let currentTool = 'pen';
    let lastX = 0;
    let lastY = 0;

    // Initialize the application
    function init() {
        setupEventListeners();
        initializeCanvas();
        checkUserLogin();
        updateCharCount();
    }

    // Check if user is logged in
    function checkUserLogin() {
        const currentUser = localStorage.getItem('currentUser');
        if (currentUser) {
            try {
                const user = JSON.parse(currentUser);
                showWelcomeBanner(user.name);
                loadRecentQuestions(user.id);
            } catch (e) {
                console.error('Error parsing user data:', e);
            }
        }
    }

    // Show welcome banner for logged in users
    function showWelcomeBanner(username) {
        if (elements.welcomeBanner && elements.usernameDisplay) {
            elements.usernameDisplay.textContent = username;
            elements.welcomeBanner.style.display = 'block';
        }
    }

    // Load recent questions
    function loadRecentQuestions(userId) {
        const recentQuestions = JSON.parse(localStorage.getItem(`recent_questions_${userId}`) || '[]');
        displayRecentQuestions(recentQuestions);
    }

    // Display recent questions
    function displayRecentQuestions(questions) {
        const questionsList = document.querySelector('.questions-list');
        if (!questionsList) return;

        if (questions.length === 0) {
            questionsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>No recent questions yet</p>
                    <p class="small">Your solved doubts will appear here</p>
                </div>
            `;
            return;
        }

        let html = '';
        questions.slice(0, 5).forEach((q, index) => {
            html += `
                <div class="question-item" data-index="${index}">
                    <div class="question-text">${q.question.substring(0, 80)}${q.question.length > 80 ? '...' : ''}</div>
                    <div class="question-meta">
                        <span class="subject">${q.subject}</span>
                        <span class="date">${new Date(q.timestamp).toLocaleDateString()}</span>
                    </div>
                </div>
            `;
        });

        questionsList.innerHTML = html;

        // Add click listeners to question items
        document.querySelectorAll('.question-item').forEach(item => {
            item.addEventListener('click', function() {
                const index = this.getAttribute('data-index');
                loadQuestionFromHistory(questions[index]);
            });
        });
    }

    // Load question from history
    function loadQuestionFromHistory(question) {
        // Switch to text input tab
        switchTab('text');
        
        // Fill the form
        elements.subjectSelect.value = question.subject;
        elements.questionText.value = question.question;
        updateCharCount();
        
        // Set the style
        const styleRadio = document.querySelector(`input[name="style"][value="${question.style}"]`);
        if (styleRadio) {
            styleRadio.checked = true;
        }
        
        showNotification('Question loaded from history', 'success');
    }

    // Setup all event listeners
    function setupEventListeners() {
        // Tab switching
        elements.tabs.forEach(tab => {
            tab.addEventListener('click', () => switchTab(tab.dataset.mode));
        });

        // Character count
        elements.questionText.addEventListener('input', updateCharCount);

        // Image upload
        elements.browseBtn.addEventListener('click', () => elements.imageUpload.click());
        elements.imageUpload.addEventListener('change', handleImageUpload);
        elements.changeImage.addEventListener('click', () => elements.imageUpload.click());
        
        // Drag and drop for image upload
        elements.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            elements.uploadArea.style.borderColor = 'var(--primary)';
            elements.uploadArea.style.background = 'rgba(18, 18, 18, 0.5)';
        });

        elements.uploadArea.addEventListener('dragleave', () => {
            elements.uploadArea.style.borderColor = 'rgba(106, 17, 203, 0.3)';
            elements.uploadArea.style.background = 'rgba(18, 18, 18, 0.3)';
        });

        elements.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            elements.uploadArea.style.borderColor = 'rgba(106, 17, 203, 0.3)';
            elements.uploadArea.style.background = 'rgba(18, 18, 18, 0.3)';
            
            if (e.dataTransfer.files.length) {
                elements.imageUpload.files = e.dataTransfer.files;
                handleImageUpload();
            }
        });

        // Solve button
        elements.solveBtn.addEventListener('click', solveQuestion);

        // Clear button
        elements.clearBtn.addEventListener('click', clearAll);

        // Results actions
        elements.saveSolution.addEventListener('click', saveSolution);
        elements.exportSolution.addEventListener('click', exportSolution);
        elements.newQuestion.addEventListener('click', showNewQuestion);

        // Canvas tools
        elements.canvasTools.forEach(tool => {
            tool.addEventListener('click', () => {
                elements.canvasTools.forEach(t => t.classList.remove('active'));
                tool.classList.add('active');
                currentTool = tool.dataset.tool;
            });
        });

        elements.penSize.addEventListener('input', () => {
            elements.sizeValue.textContent = elements.penSize.value;
        });

        elements.clearCanvas.addEventListener('click', clearCanvas);
        elements.uploadCanvas.addEventListener('click', uploadCanvasDrawing);
    }

    // Initialize canvas for drawing
    function initializeCanvas() {
        if (!elements.canvas) return;
        
        canvasContext = elements.canvas.getContext('2d');
        canvasContext.lineCap = 'round';
        canvasContext.lineJoin = 'round';
        canvasContext.strokeStyle = elements.penColor.value;
        canvasContext.lineWidth = elements.penSize.value;
        
        // Set canvas size to match display
        const canvasWrapper = elements.canvas.parentElement;
        elements.canvas.width = canvasWrapper.clientWidth;
        elements.canvas.height = 400;
        
        // Drawing events
        elements.canvas.addEventListener('mousedown', startDrawing);
        elements.canvas.addEventListener('mousemove', draw);
        elements.canvas.addEventListener('mouseup', stopDrawing);
        elements.canvas.addEventListener('mouseout', stopDrawing);
        
        // Touch events for mobile
        elements.canvas.addEventListener('touchstart', handleTouchStart);
        elements.canvas.addEventListener('touchmove', handleTouchMove);
        elements.canvas.addEventListener('touchend', stopDrawing);
        
        elements.penColor.addEventListener('input', () => {
            if (currentTool === 'pen') {
                canvasContext.strokeStyle = elements.penColor.value;
            }
        });
    }

    // Canvas drawing functions
    function startDrawing(e) {
        isDrawing = true;
        [lastX, lastY] = getCoordinates(e);
    }

    function draw(e) {
        if (!isDrawing) return;
        
        canvasContext.globalCompositeOperation = currentTool === 'eraser' ? 'destination-out' : 'source-over';
        canvasContext.strokeStyle = currentTool === 'eraser' ? 'rgba(0,0,0,1)' : elements.penColor.value;
        canvasContext.lineWidth = currentTool === 'eraser' ? elements.penSize.value * 2 : elements.penSize.value;
        
        canvasContext.beginPath();
        canvasContext.moveTo(lastX, lastY);
        [lastX, lastY] = getCoordinates(e);
        canvasContext.lineTo(lastX, lastY);
        canvasContext.stroke();
    }

    function stopDrawing() {
        isDrawing = false;
        canvasContext.beginPath();
    }

    function getCoordinates(e) {
        const rect = elements.canvas.getBoundingClientRect();
        let clientX, clientY;
        
        if (e.type.includes('touch')) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        
        return [
            clientX - rect.left,
            clientY - rect.top
        ];
    }

    function handleTouchStart(e) {
        if (e.touches.length === 1) {
            e.preventDefault();
            startDrawing(e);
        }
    }

    function handleTouchMove(e) {
        if (e.touches.length === 1) {
            e.preventDefault();
            draw(e);
        }
    }

    function clearCanvas() {
        canvasContext.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
    }

    // Switch between input tabs
    function switchTab(tabName) {
        // Update active tab
        elements.tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.mode === tabName);
        });

        // Show active content
        elements.textInput.classList.toggle('active', tabName === 'text');
        elements.imageInput.classList.toggle('active', tabName === 'image');
        elements.handwritingInput.classList.toggle('active', tabName === 'handwriting');

        // Update solve button text based on tab
        const buttonIcons = {
            text: 'fas fa-brain',
            image: 'fas fa-camera',
            handwriting: 'fas fa-paint-brush'
        };
        
        const buttonTexts = {
            text: 'Solve My Doubt',
            image: 'Solve from Image',
            handwriting: 'Solve Drawing'
        };

        const icon = elements.solveBtn.querySelector('i');
        icon.className = buttonIcons[tabName];
        elements.solveBtn.innerHTML = `${icon.outerHTML} ${buttonTexts[tabName]}`;
    }

    // Update character count
    function updateCharCount() {
        const count = elements.questionText.value.length;
        elements.charCount.textContent = count;
        elements.charCount.style.color = count > 1900 ? 'var(--error)' : '#888';
    }

    // Handle image upload
    function handleImageUpload() {
        const file = elements.imageUpload.files[0];
        if (!file) return;

        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
            showNotification('File size must be less than 10MB', 'error');
            return;
        }

        // Validate file type
        if (!file.type.match('image.*') && file.type !== 'application/pdf') {
            showNotification('Please upload an image or PDF file', 'error');
            return;
        }

        // Show preview
        elements.uploadArea.style.display = 'none';
        elements.previewArea.style.display = 'block';
        
        elements.fileName.textContent = file.name;
        elements.fileSize.textContent = formatFileSize(file.size);

        if (file.type.match('image.*')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                elements.imagePreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
            };
            reader.readAsDataURL(file);
        } else {
            elements.imagePreview.innerHTML = `
                <div class="pdf-preview">
                    <i class="fas fa-file-pdf" style="font-size: 5rem; color: var(--primary);"></i>
                    <p>${file.name}</p>
                </div>
            `;
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

    // Upload canvas drawing
    async function uploadCanvasDrawing() {
        if (!elements.canvas) return;
        
        // Convert canvas to blob
        elements.canvas.toBlob(async (blob) => {
            if (!blob) {
                showNotification('Failed to create image from drawing', 'error');
                return;
            }

            showLoading();
            
            try {
                // Convert blob to base64 for OCR
                const base64Image = await blobToBase64(blob);
                
                // For now, we'll simulate OCR with a placeholder
                // In production, you would send this to an OCR API
                const extractedText = "This is a simulated OCR result. In production, integrate with Tesseract.js or similar.";
                
                // Use the extracted text as question
                const subject = elements.subjectSelect.value;
                const style = document.querySelector('input[name="style"]:checked').value;
                
                await getAIResponse(extractedText, subject, style, 'handwriting');
                
            } catch (error) {
                console.error('Error processing drawing:', error);
                showNotification('Failed to process drawing. Please try again.', 'error');
                hideLoading();
            }
        }, 'image/png');
    }

    // Convert blob to base64
    function blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    // Main function to solve question
    async function solveQuestion() {
        const currentTab = document.querySelector('.input-tab.active').dataset.mode;
        
        switch(currentTab) {
            case 'text':
                await solveTextQuestion();
                break;
            case 'image':
                await solveImageQuestion();
                break;
            case 'handwriting':
                await uploadCanvasDrawing();
                break;
        }
    }

    // Solve text-based question
    async function solveTextQuestion() {
        const question = elements.questionText.value.trim();
        const subject = elements.subjectSelect.value;
        const style = document.querySelector('input[name="style"]:checked').value;
        
        // Validation
        if (!question) {
            showNotification('Please enter your question', 'error');
            return;
        }
        
        if (question.length < 10) {
            showNotification('Please provide more details in your question', 'warning');
            return;
        }
        
        showLoading();
        
        try {
            await getAIResponse(question, subject, style, 'text');
        } catch (error) {
            console.error('Error solving question:', error);
            showNotification('Failed to get solution. Please try again.', 'error');
            hideLoading();
        }
    }

    // Solve image-based question
    async function solveImageQuestion() {
        const file = elements.imageUpload.files[0];
        const subject = elements.imageSubject.value;
        const style = 'detailed'; // Default for image questions
        
        if (!file) {
            showNotification('Please upload an image first', 'error');
            return;
        }
        
        showLoading();
        
        try {
            // For now, we'll simulate OCR
            // In production, integrate with Tesseract.js
            const extractedText = "This is a simulated OCR result from image. In production, integrate with Tesseract.js API.";
            
            await getAIResponse(extractedText, subject, style, 'image');
            
        } catch (error) {
            console.error('Error solving image question:', error);
            showNotification('Failed to process image. Please try again.', 'error');
            hideLoading();
        }
    }

    // Get AI response from OpenRouter API
    async function getAIResponse(question, subject, style, inputType) {
        const model = MODEL_MAPPING[subject] || MODEL_MAPPING.general;
        
        // Prepare system prompt based on style and subject
        const systemPrompt = getSystemPrompt(subject, style, inputType);
        
        try {
            const response = await fetch(OPENROUTER_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'AI Doubt Solver'
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        {
                            role: 'system',
                            content: systemPrompt
                        },
                        {
                            role: 'user',
                            content: question
                        }
                    ],
                    max_tokens: 2000,
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }

            const data = await response.json();
            
            if (data.choices && data.choices[0]) {
                const solution = data.choices[0].message.content;
                displaySolution(solution, subject, style, inputType);
                
                // Save to recent questions if user is logged in
                saveToRecentQuestions(question, subject, style, solution);
            } else {
                throw new Error('No response from AI');
            }
            
        } catch (error) {
            console.error('API Error:', error);
            
            // Fallback to mock response if API fails
            const mockResponse = getMockResponse(question, subject, style);
            displaySolution(mockResponse, subject, style, inputType);
        }
    }

    // Get system prompt for AI
    function getSystemPrompt(subject, style, inputType) {
        const styleInstructions = {
            'detailed': 'Provide a detailed step-by-step explanation. Break down each step clearly.',
            'simple': 'Provide a simple, easy-to-understand explanation. Avoid technical jargon.',
            'visual': 'Use visual analogies and describe how things would look. Mention diagrams if helpful.',
            'advanced': 'Provide an advanced, in-depth explanation suitable for college-level understanding.'
        };

        const inputTypeNote = inputType === 'image' ? 
            'The user uploaded an image of their problem. Describe what you see and provide a solution.' :
            inputType === 'handwriting' ?
            'The user drew their problem. Interpret the drawing and provide a solution.' :
            '';

        return `You are an expert ${subject} tutor. ${styleInstructions[style]} 
        
        Important guidelines:
        1. Always show your work and reasoning
        2. Use clear, organized formatting
        3. Highlight key concepts
        4. Check your calculations
        5. Provide final answer clearly
        6. ${inputTypeNote}
        
        Format your response with clear sections using markdown-like formatting.`;
    }

    // Display solution
    function displaySolution(solution, subject, style, inputType) {
        hideLoading();
        
        // Update metadata
        elements.solutionSubject.textContent = subject.charAt(0).toUpperCase() + subject.slice(1);
        elements.solutionStyle.textContent = style.charAt(0).toUpperCase() + style.slice(1);
        
        // Format and display solution
        const formattedSolution = formatSolution(solution);
        elements.resultsContent.innerHTML = formattedSolution;
        
        // Show results section
        elements.resultsSection.style.display = 'block';
        
        // Scroll to results
        elements.resultsSection.scrollIntoView({ behavior: 'smooth' });
        
        showNotification('Solution generated successfully!', 'success');
    }

    // Format solution with better styling
    function formatSolution(solution) {
        // Convert markdown-like formatting to HTML
        let formatted = solution
            // Headers
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            
            // Bold
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            
            // Italic
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            
            // Lists
            .replace(/^\d+\.\s+(.*$)/gim, '<li>$1</li>')
            .replace(/^[-*]\s+(.*$)/gim, '<li>$1</li>')
            
            // Code blocks
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            
            // Line breaks
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');
        
        // Wrap in paragraphs if not already
        if (!formatted.includes('<h') && !formatted.includes('<pre')) {
            formatted = formatted.split('</p><p>').map(p => {
                if (!p.startsWith('<')) return `<p>${p}</p>`;
                return p;
            }).join('');
        }
        
        // Add math formatting
        formatted = formatted.replace(/(\$\$?[^\$]+\$\$?)/g, '<span class="math">$1</span>');
        
        return formatted;
    }

    // Get mock response for testing
    function getMockResponse(question, subject, style) {
        return `## Solution to Your ${subject.charAt(0).toUpperCase() + subject.slice(1)} Question

### **Problem Analysis**
${question}

### **Step-by-Step Solution**

**Step 1: Understanding the Problem**
- First, we identify the key components of the problem
- Determine what is being asked

**Step 2: Applying Relevant Concepts**
- Use appropriate ${subject} concepts
- Break down into manageable parts

**Step 3: Calculations & Reasoning**
- Show all calculations clearly
- Explain each step in detail

**Step 4: Verification**
- Check if the solution makes sense
- Verify calculations

### **Final Answer**
The solution is: **[Your Answer Here]**

### **Key Concepts Learned**
- Concept 1: Important principle
- Concept 2: Related theory
- Concept 3: Application method

*Note: This is a mock response. In production, this would be generated by the AI.*`;
    }

    // Save to recent questions
    function saveToRecentQuestions(question, subject, style, solution) {
        const currentUser = localStorage.getItem('currentUser');
        if (!currentUser) return;
        
        try {
            const user = JSON.parse(currentUser);
            const userId = user.id;
            
            const recentQuestions = JSON.parse(localStorage.getItem(`recent_questions_${userId}`) || '[]');
            
            const newQuestion = {
                question: question.substring(0, 200),
                subject: subject,
                style: style,
                solution: solution.substring(0, 500),
                timestamp: new Date().toISOString()
            };
            
            // Add to beginning and keep only last 10
            recentQuestions.unshift(newQuestion);
            if (recentQuestions.length > 10) {
                recentQuestions.pop();
            }
            
            localStorage.setItem(`recent_questions_${userId}`, JSON.stringify(recentQuestions));
            
            // Refresh display
            displayRecentQuestions(recentQuestions);
            
        } catch (error) {
            console.error('Error saving recent question:', error);
        }
    }

    // Save solution
    function saveSolution() {
        const solutionText = elements.resultsContent.textContent;
        const subject = elements.solutionSubject.textContent;
        
        const blob = new Blob([`Subject: ${subject}\n\n${solutionText}`], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `solution_${subject}_${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('Solution saved successfully!', 'success');
    }

    // Export solution
    function exportSolution() {
        // For now, same as save
        saveSolution();
    }

    // Show new question form
    function showNewQuestion() {
        elements.resultsSection.style.display = 'none';
        clearAll();
        elements.questionText.focus();
    }

    // Clear all inputs
    function clearAll() {
        // Clear text input
        elements.questionText.value = '';
        updateCharCount();
        
        // Clear image input
        elements.imageUpload.value = '';
        elements.uploadArea.style.display = 'block';
        elements.previewArea.style.display = 'none';
        elements.imagePreview.innerHTML = '';
        
        // Clear canvas
        clearCanvas();
        
        // Reset to text tab
        switchTab('text');
        
        // Reset form
        elements.subjectSelect.value = 'general';
        document.querySelector('input[name="style"][value="detailed"]').checked = true;
        
        showNotification('All inputs cleared', 'info');
    }

    // Show loading state
    function showLoading() {
        elements.loadingSection.style.display = 'block';
        elements.resultsSection.style.display = 'none';
        
        // Animate steps
        const steps = document.querySelectorAll('.loading-steps .step');
        let currentStep = 0;
        
        const stepInterval = setInterval(() => {
            steps.forEach(step => step.classList.remove('active'));
            if (currentStep < steps.length) {
                steps[currentStep].classList.add('active');
                currentStep++;
            } else {
                clearInterval(stepInterval);
            }
        }, 1000);
    }

    // Hide loading state
    function hideLoading() {
        elements.loadingSection.style.display = 'none';
    }

    // Show notification
    function showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        if (!container) return;
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        container.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    // Initialize the application
    init();
});