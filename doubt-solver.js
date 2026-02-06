// Doubt Solver JavaScript with OpenRouter API Integration
document.addEventListener('DOMContentLoaded', function() {
    // API Configuration - Using your new API key
    const OPENROUTER_API_KEY = "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";
    const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
    
    // Model configuration - using reliable models from OpenRouter
    const MODEL_MAPPING = {
        "mathematics": "openai/gpt-3.5-turbo",
        "physics": "openai/gpt-3.5-turbo",
        "chemistry": "openai/gpt-3.5-turbo",
        "biology": "openai/gpt-3.5-turbo",
        "computer-science": "openai/gpt-3.5-turbo",
        "engineering": "openai/gpt-3.5-turbo",
        "economics": "openai/gpt-3.5-turbo",
        "general": "openai/gpt-3.5-turbo",
        "other": "openai/gpt-3.5-turbo",
        "code": "openai/gpt-3.5-turbo",
        "diagram": "openai/gpt-3.5-turbo"
    };

    // Alternative models in case of failure
    const ALTERNATIVE_MODELS = [
        "meta-llama/llama-3.1-8b-instruct:free",
        "google/gemma-2-2b-it:free",
        "microsoft/phi-3.5-mini-instruct:free"
    ];
    //DOM Element
    const elements = {
        tabs: document.querySelectorAll('.input-tab'),
        textInput: document.getElementById('text-input'),
        imageInput: document.getElementById('image-input'),
        handwritingInput: document.getElementById('handwriting-input'),
        //Text Input
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
        usernameDisplay: document.getElementById('username-display'),
        
        // Recent Questions
        recentQuestions: document.getElementById('recent-questions')
    };

    // State management
    const state = {
        currentTab: 'text',
        isProcessing: false,
        canvasContext: null,
        isDrawing: false,
        currentTool: 'pen',
        lastX: 0,
        lastY: 0,
        loadingInterval: null,
        currentModelIndex: 0
    };

    // Initialize the application
    function init() {
        setupEventListeners();
        initializeCanvas();
        checkUserLogin();
        updateCharCount();
        testAPI();
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
            const subjectDisplay = q.subject.charAt(0).toUpperCase() + q.subject.slice(1);
            const date = new Date(q.timestamp).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            html += `
                <div class="question-item" data-index="${index}">
                    <div class="question-text">${escapeHtml(q.question.substring(0, 80))}${q.question.length > 80 ? '...' : ''}</div>
                    <div class="question-meta">
                        <span class="subject">${subjectDisplay}</span>
                        <span class="date">${date}</span>
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

    // Escape HTML to prevent XSS
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
        elements.questionText.focus();
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
        if (elements.uploadArea) {
            elements.uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                elements.uploadArea.style.borderColor = 'var(--primary)';
                elements.uploadArea.style.background = 'rgba(18, 18, 18, 0.5)';
            });

            elements.uploadArea.addEventListener('dragleave', (e) => {
                e.preventDefault();
                e.stopPropagation();
                elements.uploadArea.style.borderColor = 'rgba(106, 17, 203, 0.3)';
                elements.uploadArea.style.background = 'rgba(18, 18, 18, 0.3)';
            });

            elements.uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                elements.uploadArea.style.borderColor = 'rgba(106, 17, 203, 0.3)';
                elements.uploadArea.style.background = 'rgba(18, 18, 18, 0.3)';
                
                if (e.dataTransfer.files.length) {
                    elements.imageUpload.files = e.dataTransfer.files;
                    handleImageUpload();
                }
            });
        }

        // Solve button
        elements.solveBtn.addEventListener('click', solveQuestion);

        // Clear button
        elements.clearBtn.addEventListener('click', clearAll);

        // Results actions
        if (elements.saveSolution) {
            elements.saveSolution.addEventListener('click', saveSolution);
        }
        if (elements.exportSolution) {
            elements.exportSolution.addEventListener('click', exportSolution);
        }
        if (elements.newQuestion) {
            elements.newQuestion.addEventListener('click', showNewQuestion);
        }

        // Canvas tools
        if (elements.canvasTools) {
            elements.canvasTools.forEach(tool => {
                tool.addEventListener('click', () => {
                    elements.canvasTools.forEach(t => t.classList.remove('active'));
                    tool.classList.add('active');
                    state.currentTool = tool.dataset.tool;
                });
            });
        }

        if (elements.penSize) {
            elements.penSize.addEventListener('input', () => {
                elements.sizeValue.textContent = elements.penSize.value;
                if (state.canvasContext) {
                    state.canvasContext.lineWidth = elements.penSize.value;
                }
            });
        }

        if (elements.penColor) {
            elements.penColor.addEventListener('input', () => {
                if (state.canvasContext && state.currentTool === 'pen') {
                    state.canvasContext.strokeStyle = elements.penColor.value;
                }
            });
        }

        if (elements.clearCanvas) {
            elements.clearCanvas.addEventListener('click', clearCanvas);
        }
        if (elements.uploadCanvas) {
            elements.uploadCanvas.addEventListener('click', uploadCanvasDrawing);
        }

        // Handle Enter key in textarea
        elements.questionText.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                solveQuestion();
            }
        });
    }

    // Initialize canvas for drawing
    function initializeCanvas() {
        if (!elements.canvas) return;
        
        state.canvasContext = elements.canvas.getContext('2d');
        setupCanvas();
        
        // Set initial drawing properties
        state.canvasContext.lineCap = 'round';
        state.canvasContext.lineJoin = 'round';
        state.canvasContext.strokeStyle = elements.penColor.value;
        state.canvasContext.lineWidth = elements.penSize.value;
        
        // Drawing events
        elements.canvas.addEventListener('mousedown', startDrawing);
        elements.canvas.addEventListener('mousemove', draw);
        elements.canvas.addEventListener('mouseup', stopDrawing);
        elements.canvas.addEventListener('mouseout', stopDrawing);
        
        // Touch events for mobile
        elements.canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        elements.canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        elements.canvas.addEventListener('touchend', stopDrawing);
    }

    // Setup canvas dimensions
    function setupCanvas() {
        const canvasWrapper = elements.canvas.parentElement;
        const dpr = window.devicePixelRatio || 1;
        const rect = canvasWrapper.getBoundingClientRect();
        
        elements.canvas.width = rect.width * dpr;
        elements.canvas.height = 400 * dpr;
        
        state.canvasContext.scale(dpr, dpr);
        elements.canvas.style.width = `${rect.width}px`;
        elements.canvas.style.height = '400px';
    }

    // Canvas drawing functions
    function startDrawing(e) {
        e.preventDefault();
        state.isDrawing = true;
        [state.lastX, state.lastY] = getCoordinates(e);
    }

    function draw(e) {
        if (!state.isDrawing) return;
        e.preventDefault();
        
        // Set drawing properties based on tool
        if (state.currentTool === 'eraser') {
            state.canvasContext.globalCompositeOperation = 'destination-out';
            state.canvasContext.strokeStyle = 'rgba(0,0,0,1)';
            state.canvasContext.lineWidth = elements.penSize.value * 3;
        } else {
            state.canvasContext.globalCompositeOperation = 'source-over';
            state.canvasContext.strokeStyle = elements.penColor.value;
            state.canvasContext.lineWidth = elements.penSize.value;
        }
        
        state.canvasContext.beginPath();
        state.canvasContext.moveTo(state.lastX, state.lastY);
        [state.lastX, state.lastY] = getCoordinates(e);
        state.canvasContext.lineTo(state.lastX, state.lastY);
        state.canvasContext.stroke();
    }

    function stopDrawing() {
        state.isDrawing = false;
        state.canvasContext.beginPath();
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
        if (state.canvasContext && elements.canvas) {
            state.canvasContext.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
            showNotification('Canvas cleared', 'info');
        }
    }

    // Switch between input tabs
    function switchTab(tabName) {
        if (state.currentTab === tabName || state.isProcessing) return;
        
        // Update active tab
        elements.tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.mode === tabName);
        });

        // Show active content
        if (elements.textInput) elements.textInput.classList.toggle('active', tabName === 'text');
        if (elements.imageInput) elements.imageInput.classList.toggle('active', tabName === 'image');
        if (elements.handwritingInput) elements.handwritingInput.classList.toggle('active', tabName === 'handwriting');
        
        // Update state
        state.currentTab = tabName;

        // Update solve button text based on tab
        const buttonConfig = {
            text: { icon: 'fas fa-brain', text: 'Solve My Doubt' },
            image: { icon: 'fas fa-camera', text: 'Solve from Image' },
            handwriting: { icon: 'fas fa-paint-brush', text: 'Solve Drawing' }
        };
        
        const config = buttonConfig[tabName];
        if (elements.solveBtn) {
            elements.solveBtn.innerHTML = `<i class="${config.icon}"></i> ${config.text}`;
        }
        
        // Reset canvas if switching to handwriting
        if (tabName === 'handwriting') {
            setTimeout(setupCanvas, 10); // Small delay to ensure DOM is updated
        }
    }

    // Update character count
    function updateCharCount() {
        if (!elements.charCount || !elements.questionText) return;
        
        const count = elements.questionText.value.length;
        elements.charCount.textContent = count;
        elements.charCount.style.color = count > 1900 ? 'var(--error)' : 
                                       count > 1500 ? 'var(--warning)' : '#888';
        
        // Disable solve button if too long
        if (elements.solveBtn) {
            elements.solveBtn.disabled = count > 2000;
        }
    }

    // Handle image upload
    function handleImageUpload() {
        if (!elements.imageUpload || !elements.imageUpload.files[0]) return;
        
        const file = elements.imageUpload.files[0];
        
        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
            showNotification('File size must be less than 10MB', 'error');
            return;
        }

        // Validate file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 'application/pdf'];
        if (!validTypes.includes(file.type)) {
            showNotification('Please upload a valid image or PDF file (JPG, PNG, GIF, BMP, WebP, PDF)', 'error');
            return;
        }

        // Show preview
        if (elements.uploadArea) elements.uploadArea.style.display = 'none';
        if (elements.previewArea) elements.previewArea.style.display = 'block';
        
        if (elements.fileName) elements.fileName.textContent = file.name;
        if (elements.fileSize) elements.fileSize.textContent = formatFileSize(file.size);

        if (file.type.match('image.*')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                if (elements.imagePreview) {
                    elements.imagePreview.innerHTML = `<img src="${e.target.result}" alt="Preview" style="max-width: 100%; border-radius: 10px;">`;
                }
            };
            reader.onerror = function() {
                showNotification('Error loading image', 'error');
                resetImageUpload();
            };
            reader.readAsDataURL(file);
        } else if (file.type === 'application/pdf') {
            if (elements.imagePreview) {
                elements.imagePreview.innerHTML = `
                    <div class="pdf-preview" style="text-align: center; padding: 20px;">
                        <i class="fas fa-file-pdf" style="font-size: 4rem; color: var(--primary); margin-bottom: 10px;"></i>
                        <p style="color: var(--text); font-weight: 500;">${file.name}</p>
                        <p style="color: #888; font-size: 0.9rem;">PDF document</p>
                    </div>
                `;
            }
        }
        
        showNotification('File uploaded successfully', 'success');
    }

    // Reset image upload
    function resetImageUpload() {
        if (!elements.imageUpload) return;
        
        elements.imageUpload.value = '';
        if (elements.uploadArea) elements.uploadArea.style.display = 'block';
        if (elements.previewArea) elements.previewArea.style.display = 'none';
        if (elements.imagePreview) elements.imagePreview.innerHTML = '';
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
        if (!elements.canvas || !state.canvasContext) return;
        
        // Check if canvas has any drawing
        const imageData = state.canvasContext.getImageData(0, 0, elements.canvas.width, elements.canvas.height);
        const isEmpty = !imageData.data.some(channel => channel !== 0);
        
        if (isEmpty) {
            showNotification('Please draw something first', 'warning');
            return;
        }
        
        showLoading();
        setProcessingState(true);
        
        try {
            // Convert canvas to blob
            elements.canvas.toBlob(async (blob) => {
                if (!blob) {
                    throw new Error('Failed to create image from drawing');
                }
                
                try {
                    // For handwritten input, we'll ask the user to describe the problem
                    const extractedText = "Handwritten problem detected. Please describe your problem in the text box and switch to the text input tab for a more accurate solution. You can describe what you drew, such as 'I drew a triangle with sides 3, 4, and 5' or 'This is a chemical structure diagram'.";
                    
                    showNotification(extractedText, 'info');
                    
                    // Switch to text tab and populate with prompt
                    switchTab('text');
                    elements.questionText.value = "I have a handwritten/drawn problem: ";
                    elements.questionText.focus();
                    updateCharCount();
                    
                    setProcessingState(false);
                    hideLoading();
                    
                } catch (error) {
                    console.error('Error processing drawing:', error);
                    showNotification('Failed to process drawing. Please try typing your question instead.', 'error');
                    setProcessingState(false);
                    hideLoading();
                }
            }, 'image/png', 0.8);
        } catch (error) {
            console.error('Error converting canvas to blob:', error);
            showNotification('Failed to process drawing', 'error');
            setProcessingState(false);
            hideLoading();
        }
    }

    // Main function to solve question
    async function solveQuestion() {
        if (state.isProcessing) return;
        
        const currentTab = state.currentTab;
        
        // Validation based on tab
        if (currentTab === 'text') {
            const question = elements.questionText.value.trim();
            if (!question) {
                showNotification('Please enter your question', 'error');
                return;
            }
            if (question.length < 10) {
                showNotification('Please provide more details in your question (minimum 10 characters)', 'warning');
                return;
            }
            if (question.length > 2000) {
                showNotification('Question is too long (maximum 2000 characters)', 'error');
                return;
            }
        } else if (currentTab === 'image') {
            if (!elements.imageUpload || !elements.imageUpload.files[0]) {
                showNotification('Please upload an image first', 'error');
                return;
            }
        }
        
        setProcessingState(true);
        
        try {
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
        } catch (error) {
            console.error('Error solving question:', error);
            showNotification('An unexpected error occurred. Please try again.', 'error');
            setProcessingState(false);
        }
    }

    // Solve text-based question
    async function solveTextQuestion() {
        const question = elements.questionText.value.trim();
        const subject = elements.subjectSelect.value;
        const style = document.querySelector('input[name="style"]:checked')?.value || 'detailed';
        
        showLoading();
        
        try {
            await getAIResponse(question, subject, style, 'text');
        } catch (error) {
            console.error('Error solving question:', error);
            showNotification('Failed to get solution. Please try again.', 'error');
            setProcessingState(false);
            hideLoading();
        }
    }

    // Solve image-based question
    async function solveImageQuestion() {
        const file = elements.imageUpload.files[0];
        const subject = elements.imageSubject.value;
        const style = 'detailed'; // Default for image questions
        
        showLoading();
        
        try {
            // For image input without OCR, we'll ask for description
            const extractedText = `I have uploaded an image of a ${subject} problem. Since image analysis requires OCR, please describe your problem in detail. For example: "The image shows a math equation: 2x + 5 = 15" or "There's a physics diagram showing forces on an inclined plane."`;
            
            showNotification('Image uploaded. Please describe the problem in detail for accurate solution.', 'info');
            
            // Switch to text tab and populate with prompt
            switchTab('text');
            elements.questionText.value = `Image of ${subject} problem: `;
            elements.questionText.focus();
            updateCharCount();
            
            setProcessingState(false);
            hideLoading();
            
        } catch (error) {
            console.error('Error solving image question:', error);
            showNotification('Failed to process image. Please try typing your question instead.', 'error');
            setProcessingState(false);
            hideLoading();
        }
    }

    // Get AI response from OpenRouter API
    async function getAIResponse(question, subject, style, inputType) {
        // Get model based on subject
        const primaryModel = MODEL_MAPPING[subject] || MODEL_MAPPING.general;
        
        // Prepare system prompt
        const systemPrompt = getSystemPrompt(subject, style, inputType, question);
        
        try {
            console.log('Sending request to OpenRouter API...');
            console.log('Model:', primaryModel);
            console.log('Subject:', subject);
            console.log('Style:', style);
            console.log('Input type:', inputType);
            console.log('Question length:', question.length);
            
            const response = await fetch(OPENROUTER_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': window.location.origin || 'https://doubt-solver.com',
                    'X-Title': 'AI Doubt Solver'
                },
                body: JSON.stringify({
                    model: primaryModel,
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
                    temperature: 0.7,
                    stream: false
                })
            });

            console.log('API Response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error response:', errorText);
                let errorMessage = `API request failed with status ${response.status}`;
                
                try {
                    const errorData = JSON.parse(errorText);
                    if (errorData.error && errorData.error.message) {
                        errorMessage = errorData.error.message;
                    }
                } catch (e) {
                    // If response is not JSON, use the text
                }
                
                throw new Error(errorMessage);
            }

            const data = await response.json();
            console.log('API Success response:', data);
            
            if (data.choices && data.choices[0] && data.choices[0].message) {
                const solution = data.choices[0].message.content;
                console.log('Generated solution length:', solution.length);
                
                displaySolution(solution, subject, style, inputType);
                
                // Save to recent questions if user is logged in
                saveToRecentQuestions(question, subject, style, solution);
            } else {
                throw new Error('Invalid response format from AI');
            }
            
        } catch (error) {
            console.error('API Error:', error);
            
            // Check for specific API errors
            if (error.message.includes('401') || error.message.includes('403')) {
                showNotification('API authentication failed. Please check your API key.', 'error');
                await tryAlternativeModels(question, subject, style, inputType);
            } else if (error.message.includes('429')) {
                showNotification('Rate limit exceeded. Please try again in a few moments.', 'warning');
                await tryAlternativeModels(question, subject, style, inputType);
            } else if (error.message.includes('model') || error.message.includes('unavailable')) {
                showNotification('The AI model is currently unavailable. Trying alternative...', 'warning');
                await tryAlternativeModels(question, subject, style, inputType);
            } else {
                showNotification(`Failed to get AI response: ${error.message}`, 'error');
                await tryAlternativeModels(question, subject, style, inputType);
            }
        } finally {
            setProcessingState(false);
        }
    }

    // Try alternative models if primary fails
    async function tryAlternativeModels(question, subject, style, inputType) {
        showNotification('Trying alternative AI models...', 'info');
        
        for (let i = state.currentModelIndex; i < ALTERNATIVE_MODELS.length; i++) {
            const model = ALTERNATIVE_MODELS[i];
            try {
                console.log(`Trying alternative model ${i + 1}: ${model}`);
                
                const systemPrompt = getSystemPrompt(subject, style, inputType, question);
                
                const response = await fetch(OPENROUTER_API_URL, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': window.location.origin || 'https://doubt-solver.com',
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
                        max_tokens: 1500,
                        temperature: 0.7,
                        stream: false
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.choices && data.choices[0] && data.choices[0].message) {
                        const solution = data.choices[0].message.content;
                        displaySolution(solution, subject, style, inputType);
                        saveToRecentQuestions(question, subject, style, solution);
                        state.currentModelIndex = i; // Remember successful model
                        showNotification(`Successfully used ${model.split('/')[0]} model`, 'success');
                        return;
                    }
                }
            } catch (error) {
                console.error(`Alternative model ${model} failed:`, error);
                continue; // Try next model
            }
        }
        
        // If all models fail, show mock response
        showNotification('All AI models failed. Showing example solution format.', 'warning');
        const mockResponse = getMockResponse(question, subject, style);
        displaySolution(mockResponse, subject, style, inputType);
    }

    // Get system prompt for AI
    function getSystemPrompt(subject, style, inputType, question) {
        const styleInstructions = {
            'detailed': 'Provide a detailed step-by-step explanation. Break down each step clearly with explanations for why each step is taken.',
            'simple': 'Provide a simple, easy-to-understand explanation. Avoid technical jargon and use everyday language.',
            'visual': 'Use visual analogies and describe how things would look. Mention diagrams or visual representations if helpful.',
            'advanced': 'Provide an advanced, in-depth explanation suitable for college-level or expert understanding.'
        };

        const subjectExpertise = {
            'mathematics': 'Expert mathematician',
            'physics': 'Expert physicist',
            'chemistry': 'Expert chemist',
            'biology': 'Expert biologist',
            'computer-science': 'Expert computer scientist',
            'engineering': 'Expert engineer',
            'economics': 'Expert economist',
            'general': 'Expert tutor',
            'other': 'Knowledgeable expert',
            'code': 'Expert programmer',
            'diagram': 'Expert analyst'
        };

        // Safely handle question parameter
        const questionPreview = question ? `"${question.substring(0, 200)}${question.length > 200 ? '...' : ''}"` : 'the user\'s question';

        return `You are an ${subjectExpertise[subject] || 'expert tutor'} helping a student with their doubt.

${styleInstructions[style] || styleInstructions.detailed}

Important guidelines for your response:
1. Start with understanding the problem
2. Break down the solution into clear, logical steps
3. Explain the concepts behind each step
4. Provide the final answer clearly
5. Include relevant formulas, equations, or code where applicable
6. Use clear formatting with headings, bullet points, and numbered steps
7. Check for correctness and clarity

Format your response using markdown-like formatting:
- Use ## for main sections
- Use ### for subsections
- Use **bold** for important terms
- Use bullet points for lists
- Use code blocks \`\`\` for equations or code

The user's question is: ${questionPreview}`;
    }

    // Display solution
    function displaySolution(solution, subject, style, inputType) {
        hideLoading();
        
        // Update metadata
        if (elements.solutionSubject) {
            elements.solutionSubject.textContent = subject.charAt(0).toUpperCase() + subject.slice(1);
        }
        if (elements.solutionStyle) {
            elements.solutionStyle.textContent = style.charAt(0).toUpperCase() + style.slice(1);
        }
        
        // Format and display solution
        const formattedSolution = formatSolution(solution);
        if (elements.resultsContent) {
            elements.resultsContent.innerHTML = formattedSolution;
        }
        
        // Show results section
        if (elements.resultsSection) {
            elements.resultsSection.style.display = 'block';
            
            // Scroll to results
            setTimeout(() => {
                elements.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
        
        showNotification('Solution generated successfully!', 'success');
    }

    // Format solution with better styling
    function formatSolution(solution) {
        if (!solution) return '<p>No solution generated.</p>';
        
        // Convert markdown-like formatting to HTML
        let formatted = solution
            // Headers
            .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            
            // Bold and italic
            .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            
            // Code blocks with language
            .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            
            // Lists
            .replace(/^\d+\.\s+(.*$)/gim, '<li>$1</li>')
            .replace(/^[-*+]\s+(.*$)/gim, '<li>$1</li>')
            
            // Horizontal rule
            .replace(/^---$/gim, '<hr>')
            
            // Blockquotes
            .replace(/^>\s+(.*$)/gim, '<blockquote>$1</blockquote>');
        
        // Wrap list items
        formatted = formatted.replace(/(<li>.*<\/li>)+/gms, (match) => {
            // Check if it's ordered (starts with number)
            const isOrdered = match.match(/<li>\d+\./);
            const tag = isOrdered ? 'ol' : 'ul';
            return `<${tag}>${match}</${tag}>`;
        });
        
        // Handle paragraphs
        const lines = formatted.split('\n');
        let inParagraph = false;
        let result = [];
        
        for (let line of lines) {
            const trimmed = line.trim();
            if (!trimmed) {
                if (inParagraph) {
                    result.push('</p>');
                    inParagraph = false;
                }
                continue;
            }
            
            if (trimmed.startsWith('<') && 
                !trimmed.startsWith('<li>') && 
                !trimmed.startsWith('<code>') && 
                !trimmed.startsWith('<pre>') &&
                !trimmed.startsWith('<h') &&
                !trimmed.startsWith('<blockquote>') &&
                !trimmed.startsWith('<hr>')) {
                if (inParagraph) {
                    result.push('</p>');
                }
                result.push(line);
                inParagraph = false;
            } else if (!trimmed.startsWith('<') || trimmed.startsWith('<li>')) {
                if (!inParagraph) {
                    result.push('<p>');
                    inParagraph = true;
                }
                result.push(line);
            } else {
                if (inParagraph) {
                    result.push('</p>');
                    inParagraph = false;
                }
                result.push(line);
            }
        }
        
        if (inParagraph) {
            result.push('</p>');
        }
        
        formatted = result.join('\n');
        
        // Add math formatting
        formatted = formatted.replace(/\$(.*?)\$/g, '<span class="math">$$1$</span>');
        
        // Clean up any empty paragraphs
        formatted = formatted.replace(/<p>\s*<\/p>/g, '');
        
        return formatted;
    }

    // Get mock response for testing or fallback
    function getMockResponse(question, subject, style) {
        const subjects = {
            'mathematics': 'Mathematics',
            'physics': 'Physics',
            'chemistry': 'Chemistry',
            'biology': 'Biology',
            'computer-science': 'Computer Science',
            'engineering': 'Engineering',
            'economics': 'Economics',
            'general': 'General Knowledge',
            'other': 'Academic'
        };
        
        const subjectName = subjects[subject] || subject;
        const shortQuestion = question.length > 100 ? question.substring(0, 100) + '...' : question;
        
        return `## Solution to Your ${subjectName} Question

### **Problem Analysis**
You asked: "${shortQuestion}"

This is a ${subject} problem. Here's how I would approach solving it:

### **Step-by-Step Solution Approach**

**Step 1: Understand the Problem**
- Read the problem carefully
- Identify what is being asked
- Note down all given information
- Determine which ${subjectName} concepts apply

**Step 2: Plan Your Approach**
- Decide on the method to use
- Break the problem into smaller parts
- Recall relevant formulas or theorems
- Consider multiple approaches if possible

**Step 3: Execute the Solution**
- Show all calculations step by step
- Explain each logical step
- Check units and dimensions
- Verify intermediate results

**Step 4: Verify Your Answer**
- Check if the answer makes sense
- Verify calculations
- Consider alternative methods
- Review common mistakes

### **Key Concepts**
- **Concept 1**: Fundamental principle in ${subjectName}
- **Concept 2**: Related theory or formula
- **Concept 3**: Problem-solving technique specific to this subject

### **Example Format for ${subjectName} Solutions**
1. **Given**: [State the given information]
2. **Required**: [State what needs to be found]
3. **Solution Approach**: [Describe your method]
4. **Step-by-Step Calculation**: [Show detailed working]
5. **Answer**: [Present final answer with units]

### **Practice Tips**
1. Understand the underlying concepts, not just formulas
2. Practice similar problems regularly
3. Check your work systematically
4. Review mistakes to learn from them

*Note: This is a structured solution format. With a working API connection, you would receive a specific, detailed solution to your exact question.*`;
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
            
            // Refresh display if user is on this page
            if (elements.recentQuestions) {
                displayRecentQuestions(recentQuestions);
            }
            
        } catch (error) {
            console.error('Error saving recent question:', error);
        }
    }

    // Save solution
    function saveSolution() {
        if (!elements.resultsContent || !elements.solutionSubject || !elements.solutionStyle) return;
        
        const solutionText = elements.resultsContent.textContent;
        const subject = elements.solutionSubject.textContent;
        const style = elements.solutionStyle.textContent;
        
        const content = `AI Doubt Solver - Solution Report
===============================

Subject: ${subject}
Explanation Style: ${style}
Date: ${new Date().toLocaleString()}

SOLUTION:
${solutionText}

---
Generated by AI Doubt Solver
https://doubt-solver.com`;
        
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `solution_${subject.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('Solution saved as text file!', 'success');
    }

    // Export solution
    function exportSolution() {
        if (!elements.resultsContent || !elements.solutionSubject || !elements.solutionStyle) return;
        
        const solutionText = elements.resultsContent.textContent;
        const subject = elements.solutionSubject.textContent;
        const style = elements.solutionStyle.textContent;
        
        const content = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>AI Doubt Solver - ${subject} Solution</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { color: #6a11cb; border-bottom: 2px solid #2575fc; padding-bottom: 10px; }
        h2 { color: #2575fc; margin-top: 30px; }
        h3 { color: #00f2fe; }
        .meta { background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0; }
        pre { background: #2d2d2d; color: #fff; padding: 15px; border-radius: 5px; overflow-x: auto; }
        code { background: #f0f0f0; padding: 2px 5px; border-radius: 3px; }
        .math { font-style: italic; color: #d63384; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <h1>AI Doubt Solver - ${subject} Solution</h1>
    <div class="meta">
        <strong>Subject:</strong> ${subject}<br>
        <strong>Explanation Style:</strong> ${style}<br>
        <strong>Generated:</strong> ${new Date().toLocaleString()}
    </div>
    <div id="solution-content">
        ${elements.resultsContent.innerHTML}
    </div>
    <div class="footer">
        Generated by AI Doubt Solver | https://doubt-solver.com
    </div>
</body>
</html>`;
        
        const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `solution_${subject.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('Solution exported as HTML file!', 'success');
    }

    // Show new question form
    function showNewQuestion() {
        if (elements.resultsSection) {
            elements.resultsSection.style.display = 'none';
        }
        clearAll();
        if (elements.questionText) {
            elements.questionText.focus();
        }
    }

    // Clear all inputs
    function clearAll() {
        // Clear text input
        if (elements.questionText) {
            elements.questionText.value = '';
            updateCharCount();
        }
        
        // Clear image input
        resetImageUpload();
        
        // Clear canvas
        clearCanvas();
        
        // Reset to text tab
        switchTab('text');
        
        // Reset form
        if (elements.subjectSelect) {
            elements.subjectSelect.value = 'general';
        }
        
        const defaultStyle = document.querySelector('input[name="style"][value="detailed"]');
        if (defaultStyle) {
            defaultStyle.checked = true;
        }
        
        if (elements.imageSubject) {
            elements.imageSubject.value = 'mathematics';
        }
        
        // Reset solve button
        if (elements.solveBtn) {
            elements.solveBtn.disabled = false;
            elements.solveBtn.innerHTML = '<i class="fas fa-brain"></i> Solve My Doubt';
        }
        
        showNotification('All inputs cleared', 'info');
    }

    // Set processing state
    function setProcessingState(processing) {
        state.isProcessing = processing;
        
        if (elements.solveBtn) {
            elements.solveBtn.disabled = processing;
            if (processing) {
                elements.solveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            } else {
                const buttonConfig = {
                    text: { icon: 'fas fa-brain', text: 'Solve My Doubt' },
                    image: { icon: 'fas fa-camera', text: 'Solve from Image' },
                    handwriting: { icon: 'fas fa-paint-brush', text: 'Solve Drawing' }
                };
                const config = buttonConfig[state.currentTab];
                elements.solveBtn.innerHTML = `<i class="${config.icon}"></i> ${config.text}`;
            }
        }
        
        if (elements.clearBtn) {
            elements.clearBtn.disabled = processing;
        }
    }

    // Show loading state
    function showLoading() {
        if (elements.loadingSection) {
            elements.loadingSection.style.display = 'block';
        }
        if (elements.resultsSection) {
            elements.resultsSection.style.display = 'none';
        }
        
        // Animate steps
        animateLoadingSteps();
    }

    // Animate loading steps
    function animateLoadingSteps() {
        const steps = document.querySelectorAll('.loading-steps .step');
        if (!steps.length) return;
        
        // Clear any existing interval
        if (state.loadingInterval) {
            clearInterval(state.loadingInterval);
        }
        
        // Reset all steps
        steps.forEach(step => step.classList.remove('active'));
        
        let currentStep = 0;
        state.loadingInterval = setInterval(() => {
            steps.forEach(step => step.classList.remove('active'));
            if (currentStep < steps.length) {
                steps[currentStep].classList.add('active');
                currentStep++;
            } else {
                currentStep = 0;
            }
        }, 800);
    }

    // Hide loading state
    function hideLoading() {
        if (elements.loadingSection) {
            elements.loadingSection.style.display = 'none';
        }
        
        // Stop animation
        if (state.loadingInterval) {
            clearInterval(state.loadingInterval);
            state.loadingInterval = null;
        }
        
        // Reset steps
        const steps = document.querySelectorAll('.loading-steps .step');
        steps.forEach(step => step.classList.remove('active'));
        if (steps[0]) steps[0].classList.add('active');
    }

    // Show notification
    function showNotification(message, type = 'info') {
        let container = document.getElementById('notification-container');
        if (!container) {
            // Create notification container if it doesn't exist
            container = document.createElement('div');
            container.id = 'notification-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 400px;
            `;
            document.body.appendChild(container);
        }
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            background: ${type === 'success' ? '#10b981' : 
                        type === 'error' ? '#ef4444' : 
                        type === 'warning' ? '#f59e0b' : '#3b82f6'};
            color: white;
            padding: 12px 16px;
            margin-bottom: 10px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            animation: slideIn 0.3s ease;
        `;
        
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        
        notification.innerHTML = `
            <i class="fas fa-${icons[type] || 'info-circle'}" style="margin-right: 10px; font-size: 1.2rem;"></i>
            <span style="flex: 1;">${escapeHtml(message)}</span>
            <button onclick="this.parentElement.remove()" style="background: none; border: none; color: white; cursor: pointer; margin-left: 10px;">
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

    // Test API connection
    async function testAPI() {
        console.log('Testing API connection...');
        
        try {
            const response = await fetch(OPENROUTER_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': window.location.origin || 'https://doubt-solver.com',
                    'X-Title': 'AI Doubt Solver'
                },
                body: JSON.stringify({
                    model: "openai/gpt-3.5-turbo",
                    messages: [
                        {
                            role: 'user',
                            content: 'Hello, are you working? Reply with just "Yes" if you are.'
                        }
                    ],
                    max_tokens: 10
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('API Test Success:', data);
                showNotification('API connection successful! Ready to solve doubts.', 'success');
                return true;
            } else {
                const errorText = await response.text();
                console.error('API Test Failed:', response.status, errorText);
                showNotification(`API test failed: ${response.status}. Will try alternative models.`, 'warning');
                return false;
            }
        } catch (error) {
            console.error('API Test Error:', error);
            showNotification(`API test error: ${error.message}. Will try alternative models.`, 'warning');
            return false;
        }
    }

    // Make showNotification available globally for inline onclick handlers
    window.showNotification = showNotification;
    window.escapeHtml = escapeHtml;

    // Add CSS for notifications if not already present
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            .notification.success { background: #10b981; }
            .notification.error { background: #ef4444; }
            .notification.warning { background: #f59e0b; }
            .notification.info { background: #3b82f6; }
        `;
        document.head.appendChild(style);
    }

    // Initialize the application
    init();
});
