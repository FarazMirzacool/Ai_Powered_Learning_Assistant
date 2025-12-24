 // Configuration
        const OPENROUTER_API_KEY = "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";
        const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
        
        // Use Llama 3.1 70B (free tier) - Fallback to Qwen if needed
        const AI_MODEL = "meta-llama/llama-3.1-70b-instruct";
        const FALLBACK_MODEL = "qwen/qwen-2.5-32b-instruct";
        
        // Global state
        let currentQuiz = {
            topic: "",
            questions: [],
            currentQuestionIndex: 0,
            userAnswers: {},
            score: 0,
            startTime: null,
            timeLimit: 0,
            timerInterval: null
        };
        
        // Notification system
        function showNotification(message, type = "info", duration = 5000) {
            const container = document.getElementById('notification-container');
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            
            const icon = type === 'success' ? 'fa-check-circle' : 
                         type === 'error' ? 'fa-exclamation-circle' : 
                         type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle';
            
            notification.innerHTML = `
                <div class="notification-content">
                    <i class="fas ${icon} notification-icon"></i>
                    <span class="notification-message">${message}</span>
                    <button class="notification-close">&times;</button>
                </div>
            `;
            
            container.appendChild(notification);
            
            // Auto remove after duration
            const removeNotification = () => {
                notification.style.animation = 'slideIn 0.3s ease reverse';
                setTimeout(() => notification.remove(), 300);
            };
            
            // Close button
            notification.querySelector('.notification-close').addEventListener('click', removeNotification);
            
            // Auto remove
            setTimeout(removeNotification, duration);
            
            return notification;
        }
        
        // Validate quiz settings
        function validateQuizSettings() {
            const topic = document.getElementById('quiz-topic').value.trim();
            if (!topic) {
                showNotification('Please enter a topic for your quiz', 'error');
                return false;
            }
            
            const questionTypes = document.querySelectorAll('input[name="question-type"]:checked');
            if (questionTypes.length === 0) {
                showNotification('Please select at least one question type', 'error');
                return false;
            }
            
            return true;
        }
        
        // Generate quiz using OpenRouter AI
        async function generateQuizAI() {
            const topic = document.getElementById('quiz-topic').value.trim();
            const questionCount = parseInt(document.getElementById('question-count').value);
            const difficulty = document.getElementById('difficulty').value;
            const timeLimit = parseInt(document.getElementById('time-limit').value);
            const instructions = document.getElementById('instructions').value.trim();
            
            const questionTypeElements = document.querySelectorAll('input[name="question-type"]:checked');
            const questionTypes = Array.from(questionTypeElements).map(el => el.value);
            
            // Build the prompt for AI
            const prompt = `Generate a quiz about "${topic}" with the following specifications:
            
            Number of questions: ${questionCount}
            Difficulty level: ${difficulty}
            Question types to include: ${questionTypes.join(', ')}
            ${instructions ? `Additional instructions: ${instructions}` : ''}
            
            Please generate the quiz in this exact JSON format:
            {
                "quiz_title": "Quiz about [topic]",
                "questions": [
                    {
                        "id": 1,
                        "type": "mcq|truefalse|fillblank",
                        "question": "The question text here",
                        "options": ["Option A", "Option B", "Option C", "Option D"], // Only for MCQ
                        "correct_answer": "The correct answer",
                        "explanation": "Detailed explanation of the answer",
                        "difficulty": "${difficulty}"
                    }
                ]
            }
            
            Rules:
            1. For MCQ: Provide 4 options
            2. For True/False: Options should be ["True", "False"]
            3. For Fill in Blank: options array should be empty []
            4. Make questions educational and accurate
            5. Include explanations for learning
            6. Questions should be diverse and cover different aspects of "${topic}"`;
            
            // Show loading state
            document.getElementById('quiz-creation').style.display = 'none';
            document.getElementById('loading-section').style.display = 'block';
            
            try {
                // Try primary model first
                let response = await fetch(OPENROUTER_API_URL, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': window.location.origin,
                        'X-Title': 'AI Quiz Generator'
                    },
                    body: JSON.stringify({
                        model: AI_MODEL,
                        messages: [
                            {
                                role: "system",
                                content: "You are an expert educational quiz creator. Generate accurate, engaging quiz questions in the specified JSON format."
                            },
                            {
                                role: "user",
                                content: prompt
                            }
                        ],
                        temperature: 0.7,
                        max_tokens: 4000
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`API Error: ${response.status}`);
                }
                
                const data = await response.json();
                const aiResponse = data.choices[0].message.content;
                
                // Parse AI response
                let quizData;
                try {
                    // Try to extract JSON from response
                    const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/) || 
                                     aiResponse.match(/{[\s\S]*}/);
                    const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : aiResponse;
                    quizData = JSON.parse(jsonString);
                } catch (parseError) {
                    console.error('JSON parse error, trying fallback model...', parseError);
                    
                    // Try fallback model
                    response = await fetch(OPENROUTER_API_URL, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            model: FALLBACK_MODEL,
                            messages: [
                                {
                                    role: "system",
                                    content: "You are an expert educational quiz creator. Generate accurate, engaging quiz questions in JSON format."
                                },
                                {
                                    role: "user",
                                    content: prompt
                                }
                            ],
                            temperature: 0.7,
                            max_tokens: 4000,
                            response_format: { type: "json_object" }
                        })
                    });
                    
                    const fallbackData = await response.json();
                    quizData = JSON.parse(fallbackData.choices[0].message.content);
                }
                
                // Process quiz data
                processGeneratedQuiz(quizData, topic, timeLimit);
                
                // Save to recent quizzes
                saveToRecentQuizzes(topic, quizData);
                
                showNotification('Quiz generated successfully!', 'success');
                
            } catch (error) {
                console.error('Error generating quiz:', error);
                showNotification('Failed to generate quiz. Please try again.', 'error');
                
                // Show backup quiz
                showBackupQuiz(topic, questionCount, difficulty);
                
            } finally {
                // Hide loading state
                document.getElementById('loading-section').style.display = 'none';
            }
        }
        
        // Process generated quiz
        function processGeneratedQuiz(quizData, topic, timeLimit) {
            currentQuiz = {
                topic: topic,
                questions: quizData.questions || [],
                currentQuestionIndex: 0,
                userAnswers: {},
                score: 0,
                startTime: new Date(),
                timeLimit: timeLimit,
                timerInterval: null
            };
            
            // Update UI
            document.getElementById('quiz-title').textContent = quizData.quiz_title || `Quiz: ${topic}`;
            document.getElementById('total-questions').textContent = currentQuiz.questions.length;
            
            // Show quiz taking section
            document.getElementById('quiz-creation').style.display = 'none';
            document.getElementById('quiz-taking').style.display = 'block';
            
            // Initialize quiz
            displayCurrentQuestion();
            updateProgress();
            initializeQuestionIndicators();
            
            // Start timer if time limit is set
            if (timeLimit > 0) {
                startTimer(timeLimit);
            }
        }
        
        // Backup quiz generator (in case API fails)
        function showBackupQuiz(topic, questionCount, difficulty) {
            const backupQuestions = [];
            const questionTypes = ['mcq', 'truefalse', 'fillblank'];
            
            for (let i = 0; i < questionCount; i++) {
                const type = questionTypes[Math.floor(Math.random() * questionTypes.length)];
                
                let question = {};
                question.id = i + 1;
                question.type = type;
                question.difficulty = difficulty;
                
                switch(type) {
                    case 'mcq':
                        question.question = `Sample MCQ question about ${topic}?`;
                        question.options = ['Option A', 'Option B', 'Option C', 'Option D'];
                        question.correct_answer = question.options[Math.floor(Math.random() * 4)];
                        question.explanation = "This is a sample explanation for the correct answer.";
                        break;
                    case 'truefalse':
                        question.question = `Sample True/False statement about ${topic}.`;
                        question.options = ['True', 'False'];
                        question.correct_answer = Math.random() > 0.5 ? 'True' : 'False';
                        question.explanation = "This is a sample explanation for the correct answer.";
                        break;
                    case 'fillblank':
                        question.question = `In ${topic}, _____ is an important concept.`;
                        question.options = [];
                        question.correct_answer = "sample";
                        question.explanation = "This is a sample explanation for the correct answer.";
                        break;
                }
                
                backupQuestions.push(question);
            }
            
            processGeneratedQuiz({
                quiz_title: `Backup Quiz: ${topic}`,
                questions: backupQuestions
            }, topic, 600);
            
            showNotification('Using backup quiz. AI service might be temporarily unavailable.', 'warning');
        }
        
        // Display current question
        function displayCurrentQuestion() {
            const container = document.getElementById('question-container');
            const question = currentQuiz.questions[currentQuiz.currentQuestionIndex];
            
            let questionHTML = '';
            
            switch(question.type) {
                case 'mcq':
                    questionHTML = `
                        <div class="question-card">
                            <div class="question-header">
                                <span class="question-number">Question ${question.id}</span>
                                <span class="question-type">Multiple Choice</span>
                                <span class="question-difficulty">${question.difficulty}</span>
                            </div>
                            <h3 class="question-text">${question.question}</h3>
                            <div class="options-container">
                                ${question.options.map((option, index) => `
                                    <label class="option">
                                        <input type="radio" name="q${question.id}" value="${option}">
                                        <span class="option-text">${option}</span>
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                    `;
                    break;
                    
                case 'truefalse':
                    questionHTML = `
                        <div class="question-card">
                            <div class="question-header">
                                <span class="question-number">Question ${question.id}</span>
                                <span class="question-type">True/False</span>
                                <span class="question-difficulty">${question.difficulty}</span>
                            </div>
                            <h3 class="question-text">${question.question}</h3>
                            <div class="options-container">
                                <label class="option">
                                    <input type="radio" name="q${question.id}" value="True">
                                    <span class="option-text">True</span>
                                </label>
                                <label class="option">
                                    <input type="radio" name="q${question.id}" value="False">
                                    <span class="option-text">False</span>
                                </label>
                            </div>
                        </div>
                    `;
                    break;
                    
                case 'fillblank':
                    questionHTML = `
                        <div class="question-card">
                            <div class="question-header">
                                <span class="question-number">Question ${question.id}</span>
                                <span class="question-type">Fill in Blank</span>
                                <span class="question-difficulty">${question.difficulty}</span>
                            </div>
                            <h3 class="question-text">${question.question}</h3>
                            <div class="fill-blank-container">
                                <input type="text" class="fill-blank-input" 
                                       placeholder="Type your answer here" 
                                       id="q${question.id}">
                            </div>
                        </div>
                    `;
                    break;
            }
            
            container.innerHTML = questionHTML;
            
            // Restore previous answer if exists
            const previousAnswer = currentQuiz.userAnswers[question.id];
            if (previousAnswer) {
                if (question.type === 'fillblank') {
                    document.getElementById(`q${question.id}`).value = previousAnswer;
                } else {
                    const radio = document.querySelector(`input[name="q${question.id}"][value="${previousAnswer}"]`);
                    if (radio) radio.checked = true;
                }
            }
            
            // Update current question display
            document.getElementById('current-question').textContent = currentQuiz.currentQuestionIndex + 1;
            
            // Update navigation buttons
            document.getElementById('prev-btn').disabled = currentQuiz.currentQuestionIndex === 0;
            document.getElementById('next-btn').disabled = currentQuiz.currentQuestionIndex === currentQuiz.questions.length - 1;
        }
        
        // Initialize question indicators
        function initializeQuestionIndicators() {
            const container = document.getElementById('question-indicators');
            container.innerHTML = '';
            
            currentQuiz.questions.forEach((_, index) => {
                const indicator = document.createElement('button');
                indicator.className = 'question-indicator';
                if (index === currentQuiz.currentQuestionIndex) {
                    indicator.classList.add('active');
                }
                indicator.textContent = index + 1;
                indicator.addEventListener('click', () => {
                    saveCurrentAnswer();
                    currentQuiz.currentQuestionIndex = index;
                    displayCurrentQuestion();
                    updateQuestionIndicators();
                });
                container.appendChild(indicator);
            });
        }
        
        // Update question indicators
        function updateQuestionIndicators() {
            const indicators = document.querySelectorAll('.question-indicator');
            indicators.forEach((indicator, index) => {
                indicator.classList.toggle('active', index === currentQuiz.currentQuestionIndex);
                indicator.classList.toggle('answered', currentQuiz.userAnswers[index + 1]);
            });
        }
        
        // Save current answer
        function saveCurrentAnswer() {
            const question = currentQuiz.questions[currentQuiz.currentQuestionIndex];
            
            let answer;
            if (question.type === 'fillblank') {
                const input = document.getElementById(`q${question.id}`);
                answer = input ? input.value.trim() : '';
            } else {
                const selected = document.querySelector(`input[name="q${question.id}"]:checked`);
                answer = selected ? selected.value : '';
            }
            
            if (answer) {
                currentQuiz.userAnswers[question.id] = answer;
                updateQuestionIndicators();
            }
        }
        
        // Start timer
        function startTimer(seconds) {
            let timeLeft = seconds;
            
            updateTimerDisplay(timeLeft);
            
            currentQuiz.timerInterval = setInterval(() => {
                timeLeft--;
                updateTimerDisplay(timeLeft);
                
                if (timeLeft <= 0) {
                    clearInterval(currentQuiz.timerInterval);
                    submitQuiz();
                    showNotification('Time is up! Quiz submitted automatically.', 'warning');
                }
            }, 1000);
        }
        
        // Update timer display
        function updateTimerDisplay(seconds) {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            document.getElementById('timer').textContent = 
                `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
        }
        
        // Update progress
        function updateProgress() {
            const answered = Object.keys(currentQuiz.userAnswers).length;
            const total = currentQuiz.questions.length;
            const progress = (answered / total) * 100;
            
            document.getElementById('progress-fill').style.width = `${progress}%`;
            document.getElementById('progress-percent').textContent = `${Math.round(progress)}%`;
        }
        
        // Submit quiz
        function submitQuiz() {
            // Stop timer
            if (currentQuiz.timerInterval) {
                clearInterval(currentQuiz.timerInterval);
            }
            
            // Calculate score
            let correct = 0;
            currentQuiz.questions.forEach(question => {
                const userAnswer = currentQuiz.userAnswers[question.id];
                if (userAnswer && userAnswer.toLowerCase() === question.correct_answer.toLowerCase()) {
                    correct++;
                }
            });
            
            currentQuiz.score = correct;
            const percentage = (correct / currentQuiz.questions.length) * 100;
            
            // Calculate time taken
            const timeTaken = Math.floor((new Date() - currentQuiz.startTime) / 1000);
            const minutes = Math.floor(timeTaken / 60);
            const seconds = timeTaken % 60;
            
            // Show results
            document.getElementById('quiz-taking').style.display = 'none';
            document.getElementById('quiz-results').style.display = 'block';
            
            // Update results display
            document.getElementById('final-score').textContent = Math.round(percentage);
            document.getElementById('correct-answers').textContent = correct;
            document.getElementById('wrong-answers').textContent = currentQuiz.questions.length - correct;
            document.getElementById('time-taken').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            document.getElementById('accuracy').textContent = `${Math.round(percentage)}%`;
            
            // Set result message
            let resultTitle = '';
            let resultMessage = '';
            
            if (percentage >= 90) {
                resultTitle = 'Excellent!';
                resultMessage = 'You have mastered this topic!';
            } else if (percentage >= 70) {
                resultTitle = 'Great Job!';
                resultMessage = 'You have a good understanding of this topic.';
            } else if (percentage >= 50) {
                resultTitle = 'Good Effort!';
                resultMessage = 'Keep practicing to improve your score.';
            } else {
                resultTitle = 'Keep Learning!';
                resultMessage = 'Review the material and try again.';
            }
            
            document.getElementById('result-title').textContent = resultTitle;
            document.getElementById('result-message').textContent = resultMessage;
            
            // Display question review
            displayQuestionReview();
            
            // Analyze weak areas
            analyzeWeakAreas();
        }
        
        // Display question review
        function displayQuestionReview() {
            const container = document.getElementById('question-review');
            container.innerHTML = '<h3><i class="fas fa-list-ul"></i> Question Review</h3>';
            
            currentQuiz.questions.forEach(question => {
                const userAnswer = currentQuiz.userAnswers[question.id] || 'Not answered';
                const isCorrect = userAnswer && 
                    userAnswer.toLowerCase() === question.correct_answer.toLowerCase();
                
                const reviewCard = document.createElement('div');
                reviewCard.className = `review-card ${isCorrect ? 'correct' : 'incorrect'}`;
                
                let optionsHTML = '';
                if (question.type === 'mcq') {
                    optionsHTML = question.options.map(option => 
                        `<li class="${option === question.correct_answer ? 'correct-option' : ''}">${option}</li>`
                    ).join('');
                }
                
                reviewCard.innerHTML = `
                    <div class="review-question">
                        <span class="review-number">Q${question.id}</span>
                        <span class="review-type">${question.type}</span>
                        <span class="review-status ${isCorrect ? 'correct' : 'incorrect'}">
                            ${isCorrect ? 'Correct' : 'Incorrect'}
                        </span>
                    </div>
                    <p class="review-text">${question.question}</p>
                    ${question.type === 'mcq' ? `<ul class="review-options">${optionsHTML}</ul>` : ''}
                    <div class="review-details">
                        <p><strong>Your Answer:</strong> ${userAnswer}</p>
                        <p><strong>Correct Answer:</strong> ${question.correct_answer}</p>
                        <p><strong>Explanation:</strong> ${question.explanation}</p>
                    </div>
                `;
                
                container.appendChild(reviewCard);
            });
        }
        
        // Analyze weak areas
        async function analyzeWeakAreas() {
            const container = document.getElementById('weakness-list');
            container.innerHTML = '<div class="loading-weakness">Analyzing your performance...</div>';
            
            // Simple local analysis
            setTimeout(() => {
                const wrongQuestions = currentQuiz.questions.filter(question => {
                    const userAnswer = currentQuiz.userAnswers[question.id];
                    return !userAnswer || 
                           userAnswer.toLowerCase() !== question.correct_answer.toLowerCase();
                });
                
                // Group by difficulty
                const weakAreas = {
                    easy: wrongQuestions.filter(q => q.difficulty === 'easy').length,
                    medium: wrongQuestions.filter(q => q.difficulty === 'medium').length,
                    hard: wrongQuestions.filter(q => q.difficulty === 'hard').length
                };
                
                let analysisHTML = '';
                
                if (wrongQuestions.length === 0) {
                    analysisHTML = `
                        <div class="weakness-item success">
                            <i class="fas fa-check-circle"></i>
                            <div>
                                <strong>Excellent!</strong>
                                <p>You answered all questions correctly.</p>
                            </div>
                        </div>
                    `;
                } else {
                    // Identify most problematic area
                    let mainWeakness = '';
                    if (weakAreas.hard > weakAreas.medium && weakAreas.hard > weakAreas.easy) {
                        mainWeakness = 'Difficult concepts';
                    } else if (weakAreas.medium > weakAreas.easy) {
                        mainWeakness = 'Intermediate concepts';
                    } else {
                        mainWeakness = 'Basic concepts';
                    }
                    
                    analysisHTML = `
                        <div class="weakness-item">
                            <i class="fas fa-exclamation-circle"></i>
                            <div>
                                <strong>Focus on ${mainWeakness}</strong>
                                <p>You missed ${wrongQuestions.length} questions. Review these areas:</p>
                                <ul>
                                    ${wrongQuestions.map(q => 
                                        `<li>Question ${q.id}: ${q.question.substring(0, 50)}...</li>`
                                    ).join('')}
                                </ul>
                            </div>
                        </div>
                    `;
                }
                
                container.innerHTML = analysisHTML;
            }, 1000);
        }
        
        // Save to recent quizzes
        function saveToRecentQuizzes(topic, quizData) {
            // Get existing recent quizzes
            const recentQuizzes = JSON.parse(localStorage.getItem('recentQuizzes') || '[]');
            
            // Add new quiz
            const quizSummary = {
                id: Date.now(),
                topic: topic,
                title: quizData.quiz_title || `Quiz: ${topic}`,
                questionCount: (quizData.questions || []).length,
                date: new Date().toLocaleDateString(),
                score: null // Will be updated after completion
            };
            
            recentQuizzes.unshift(quizSummary); // Add to beginning
            
            // Keep only last 5 quizzes
            if (recentQuizzes.length > 5) {
                recentQuizzes.pop();
            }
            
            // Save to localStorage
            localStorage.setItem('recentQuizzes', JSON.stringify(recentQuizzes));
            
            // Update recent quizzes display
            updateRecentQuizzesDisplay();
        }
        
        // Update recent quizzes display
        function updateRecentQuizzesDisplay() {
            const container = document.querySelector('.quizzes-list');
            const recentQuizzes = JSON.parse(localStorage.getItem('recentQuizzes') || '[]');
            
            if (recentQuizzes.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <p>No recent quizzes yet</p>
                        <p class="small">Your generated quizzes will appear here</p>
                    </div>
                `;
                return;
            }
            
            let quizzesHTML = '';
            recentQuizzes.forEach(quiz => {
                quizzesHTML += `
                    <div class="quiz-item" data-quiz-id="${quiz.id}">
                        <div class="quiz-item-icon">
                            <i class="fas fa-file-alt"></i>
                        </div>
                        <div class="quiz-item-info">
                            <h4>${quiz.title}</h4>
                            <p class="quiz-meta">
                                <span><i class="fas fa-question-circle"></i> ${quiz.questionCount} questions</span>
                                <span><i class="fas fa-calendar"></i> ${quiz.date}</span>
                            </p>
                        </div>
                        <button class="quiz-item-action" onclick="loadRecentQuiz(${quiz.id})">
                            <i class="fas fa-redo"></i> Retake
                        </button>
                    </div>
                `;
            });
            
            container.innerHTML = quizzesHTML;
        }
        
        // Initialize the quiz generator
        function initQuizGenerator() {
            // Example tags click handler
            document.querySelectorAll('.example-tag').forEach(tag => {
                tag.addEventListener('click', () => {
                    document.getElementById('quiz-topic').value = tag.dataset.topic;
                });
            });
            
            // Generate quiz button
            document.getElementById('generate-quiz').addEventListener('click', () => {
                if (validateQuizSettings()) {
                    generateQuizAI();
                }
            });
            
            // Quick quiz button
            document.getElementById('quick-quiz').addEventListener('click', () => {
                document.getElementById('question-count').value = '5';
                document.getElementById('quiz-topic').value = 
                    document.getElementById('quiz-topic').value || 'General Knowledge';
                
                if (validateQuizSettings()) {
                    generateQuizAI();
                }
            });
            
            // Navigation buttons
            document.getElementById('prev-btn').addEventListener('click', () => {
                if (currentQuiz.currentQuestionIndex > 0) {
                    saveCurrentAnswer();
                    currentQuiz.currentQuestionIndex--;
                    displayCurrentQuestion();
                    updateQuestionIndicators();
                }
            });
            
            document.getElementById('next-btn').addEventListener('click', () => {
                if (currentQuiz.currentQuestionIndex < currentQuiz.questions.length - 1) {
                    saveCurrentAnswer();
                    currentQuiz.currentQuestionIndex++;
                    displayCurrentQuestion();
                    updateQuestionIndicators();
                }
            });
            
            // Submit quiz button
            document.getElementById('submit-quiz').addEventListener('click', () => {
                if (confirm('Are you sure you want to submit the quiz?')) {
                    saveCurrentAnswer();
                    submitQuiz();
                }
            });
            
            // Pause quiz button
            document.getElementById('pause-quiz').addEventListener('click', () => {
                if (currentQuiz.timerInterval) {
                    clearInterval(currentQuiz.timerInterval);
                    currentQuiz.timerInterval = null;
                    showNotification('Quiz paused. Timer stopped.', 'info');
                    document.getElementById('pause-quiz').innerHTML = 
                        '<i class="fas fa-play"></i> Resume';
                } else {
                    if (currentQuiz.timeLimit > 0) {
                        const timeLeft = parseInt(document.getElementById('timer').textContent.split(':')[0]) * 60 + 
                                       parseInt(document.getElementById('timer').textContent.split(':')[1]);
                        startTimer(timeLeft);
                    }
                    showNotification('Quiz resumed.', 'info');
                    document.getElementById('pause-quiz').innerHTML = 
                        '<i class="fas fa-pause"></i> Pause';
                }
            });
            
            // Results actions
            document.getElementById('new-quiz').addEventListener('click', () => {
                document.getElementById('quiz-results').style.display = 'none';
                document.getElementById('quiz-creation').style.display = 'block';
                currentQuiz = {
                    topic: "",
                    questions: [],
                    currentQuestionIndex: 0,
                    userAnswers: {},
                    score: 0,
                    startTime: null,
                    timeLimit: 0,
                    timerInterval: null
                };
            });
            
            document.getElementById('save-results').addEventListener('click', () => {
                const quizResults = {
                    topic: currentQuiz.topic,
                    score: currentQuiz.score,
                    total: currentQuiz.questions.length,
                    percentage: (currentQuiz.score / currentQuiz.questions.length) * 100,
                    date: new Date().toISOString()
                };
                
                // Save to localStorage
                const savedResults = JSON.parse(localStorage.getItem('savedQuizResults') || '[]');
                savedResults.push(quizResults);
                localStorage.setItem('savedQuizResults', JSON.stringify(savedResults));
                
                showNotification('Results saved successfully!', 'success');
            });
            
            document.getElementById('share-results').addEventListener('click', () => {
                const percentage = (currentQuiz.score / currentQuiz.questions.length) * 100;
                const shareText = `I scored ${Math.round(percentage)}% on "${currentQuiz.topic}" quiz! 
                Test your knowledge with AI Quiz Generator.`;
                
                if (navigator.share) {
                    navigator.share({
                        title: 'My Quiz Results',
                        text: shareText,
                        url: window.location.href
                    });
                } else {
                    navigator.clipboard.writeText(shareText)
                        .then(() => showNotification('Results copied to clipboard!', 'success'))
                        .catch(() => showNotification('Failed to copy results.', 'error'));
                }
            });
            
            // Load recent quizzes
            updateRecentQuizzesDisplay();
        }
        
        // Load recent quiz
        function loadRecentQuiz(quizId) {
            // For now, just set the topic
            const recentQuizzes = JSON.parse(localStorage.getItem('recentQuizzes') || '[]');
            const quiz = recentQuizzes.find(q => q.id === quizId);
            
            if (quiz) {
                document.getElementById('quiz-topic').value = quiz.topic;
                showNotification(`Loaded quiz: ${quiz.title}`, 'info');
            }
        }
        
        // Initialize on page load
        document.addEventListener('DOMContentLoaded', function() {
            const token = localStorage.getItem('token');
            const user = localStorage.getItem('user');
            
            if (token && user) {
                try {
                   const userData = JSON.parse(user);
                    const welcomeBanner = document.getElementById('welcome-banner');
                   if (welcomeBanner) {
                       welcomeBanner.style.display = 'block';
                       document.getElementById('username-display').textContent = userData.name || userData.username;
                   }
                } catch (error) {
                   console.error('Error parsing user data:', error);
                }
            } //else {
                // Not logged in, redirect to login
                //window.location.href = '/login.html';
               // window.location.href = window.location.origin + '/login.html';
                //return;
           // }
            
            // Initialize quiz generator
            initQuizGenerator();
        });