// ==================== CONFIGURATION ====================
        const OPENROUTER_API_KEY = "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";
        const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
        
        // Safe models for mental health
        const AI_MODELS = {
            primary: "google/gemma-2-9b-it",               // Safest option
            supportive: "mistralai/mistral-7b-instruct",   // For supportive responses
            analysis: "meta-llama/llama-3.1-70b-instruct", // For pattern analysis
            fallback: "google/gemma-2-9b-it"               // Fallback to safest
        };
        
        // Crisis keywords for detection
        const CRISIS_KEYWORDS = [
            'suicide', 'kill myself', 'end my life', 'want to die',
            'self harm', 'hurt myself', 'no reason to live',
            'hopeless', 'helpless', 'can\'t go on'
        ];
        
        // Emergency response (never use AI for this)
        const EMERGENCY_RESPONSE = `🚨 **Important Notice**

If you're experiencing thoughts of self-harm or suicide, please reach out for immediate help:

📞 **988 Suicide & Crisis Lifeline** (Available 24/7)
🌐 **Crisis Text Line**: Text HOME to 741741
🏥 **Emergency Services**: Call 911

You are not alone, and help is available right now.`;

        // Global state
        let userData = {
            mood: null,
            productivity: null,
            energy: null,
            sleep: null,
            journal: '',
            streak: 0,
            focusSessions: 0,
            achievements: {
                streak7: false,
                focus10: false,
                journal5: false,
                balancedWeek: false
            }
        };
        
        let todayCheckin = false;
        let selectedMood = null;
        let selectedEnergy = null;
        let timerRunning = false;
        let timerInterval = null;
        let timerSeconds = 25 * 60; // 25 minutes default
        
        // ==================== UTILITY FUNCTIONS ====================
        
        // Show notification
        function showNotification(message, type = "info", duration = 5000) {
            const container = document.getElementById('notificationContainer');
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
            
            const removeNotification = () => {
                notification.style.animation = 'slideIn 0.3s ease reverse';
                setTimeout(() => notification.remove(), 300);
            };
            
            notification.querySelector('.notification-close').addEventListener('click', removeNotification);
            setTimeout(removeNotification, duration);
            
            return notification;
        }
        
        // Show/hide loading modal
        function showLoading(title = "Processing...", message = "Please wait") {
            document.getElementById('loadingTitle').textContent = title;
            document.getElementById('loadingMessage').textContent = message;
            document.getElementById('loadingModal').style.display = 'flex';
        }
        
        function hideLoading() {
            document.getElementById('loadingModal').style.display = 'none';
        }
        
        // Check for crisis content
        function checkForCrisis(text) {
            const lowerText = text.toLowerCase();
            for (const keyword of CRISIS_KEYWORDS) {
                if (lowerText.includes(keyword)) {
                    return true;
                }
            }
            return false;
        }
        
        // Save to localStorage
        function saveData() {
            localStorage.setItem('mentalHealthData', JSON.stringify(userData));
            localStorage.setItem('todayCheckin', todayCheckin.toString());
            localStorage.setItem('focusSessions', userData.focusSessions.toString());
        }
        
        // Load from localStorage
        function loadData() {
            const savedData = localStorage.getItem('mentalHealthData');
            if (savedData) {
                userData = JSON.parse(savedData);
            }
            
            todayCheckin = localStorage.getItem('todayCheckin') === 'true';
            userData.focusSessions = parseInt(localStorage.getItem('focusSessions') || '0');
            
            updateDashboard();
        }
        
        // Call OpenRouter API safely
        async function callOpenRouterAPI(prompt, model = AI_MODELS.primary, jsonMode = false) {
            try {
                const response = await fetch(OPENROUTER_API_URL, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': window.location.origin,
                        'X-Title': 'MindCare AI'
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [
                            {
                                role: "system",
                                content: "You are a supportive wellness assistant. Provide gentle, encouraging, and non-medical advice. Focus on self-care, mindfulness, and positive reinforcement. NEVER provide medical diagnosis or treatment advice. If user mentions serious distress, encourage professional help."
                            },
                            {
                                role: "user",
                                content: prompt
                            }
                        ],
                        temperature: 0.7,
                        max_tokens: 1000,
                        ...(jsonMode && { response_format: { type: "json_object" } })
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`API Error: ${response.status}`);
                }
                
                const data = await response.json();
                return data.choices[0].message.content;
                
            } catch (error) {
                console.error('API Error:', error);
                throw error;
            }
        }
        
        // ==================== DAILY CHECK-IN ====================
        
        function initDailyCheckin() {
            // Mood selection
            document.querySelectorAll('.mood-option').forEach(option => {
                option.addEventListener('click', () => {
                    document.querySelectorAll('.mood-option').forEach(o => o.classList.remove('selected'));
                    option.classList.add('selected');
                    selectedMood = option.dataset.mood;
                    
                    const moodText = option.querySelector('span').textContent;
                    showNotification(`Selected mood: ${moodText}`, 'info');
                });
            });
            
            // Productivity slider
            const slider = document.getElementById('productivity-slider');
            const sliderValue = document.getElementById('slider-value');
            
            slider.addEventListener('input', () => {
                sliderValue.textContent = `${slider.value}/10`;
            });
            
            // Energy buttons
            document.querySelectorAll('.energy-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.energy-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    selectedEnergy = btn.dataset.energy;
                });
            });
            
            // Submit check-in
            document.getElementById('submit-checkin').addEventListener('click', submitDailyCheckin);
        }
        
        async function submitDailyCheckin() {
            if (!selectedMood) {
                showNotification('Please select your mood', 'error');
                return;
            }
            
            if (!selectedEnergy) {
                showNotification('Please select your energy level', 'error');
                return;
            }
            
            const productivity = document.getElementById('productivity-slider').value;
            const sleep = document.getElementById('sleep-quality').value;
            
            // Update user data
            userData.mood = parseInt(selectedMood);
            userData.productivity = parseInt(productivity);
            userData.energy = selectedEnergy;
            userData.sleep = parseInt(sleep);
            
            // Update streak
            const lastCheckin = localStorage.getItem('lastCheckinDate');
            const today = new Date().toDateString();
            
            if (lastCheckin !== today) {
                userData.streak++;
                localStorage.setItem('lastCheckinDate', today);
            }
            
            todayCheckin = true;
            
            // Save and update
            saveData();
            updateDashboard();
            
            // Get AI feedback
            getDailyFeedback();
            
            showNotification('Daily check-in completed!', 'success');
        }
        
        async function getDailyFeedback() {
            showLoading('Analyzing your check-in', 'Getting personalized wellness insights...');
            
            try {
                const prompt = `Provide brief, supportive feedback based on this daily check-in:
                Mood: ${userData.mood}/5 (1=Terrible, 5=Great)
                Productivity: ${userData.productivity}/10
                Energy: ${userData.energy}
                Sleep: ${userData.sleep}/10
                
                Provide 2-3 gentle suggestions for maintaining wellness. Focus on self-care, not medical advice.`;
                
                const feedback = await callOpenRouterAPI(prompt, AI_MODELS.supportive);
                
                // Update recommendations
                updateRecommendations(feedback);
                
            } catch (error) {
                console.error('Feedback error:', error);
                showNotification('Could not get AI feedback. Using default tips.', 'warning');
            } finally {
                hideLoading();
            }
        }
        
        // ==================== JOURNAL ANALYSIS ====================
        
        function initJournal() {
            // Save journal
            document.getElementById('save-journal').addEventListener('click', () => {
                const text = document.getElementById('journal-text').value.trim();
                if (!text) {
                    showNotification('Please write something first', 'error');
                    return;
                }
                
                userData.journal = text;
                saveData();
                showNotification('Journal entry saved!', 'success');
            });
            
            // Analyze journal with AI
            document.getElementById('analyze-journal').addEventListener('click', analyzeJournal);
        }
        
        async function analyzeJournal() {
            const journalText = document.getElementById('journal-text').value.trim();
            
            if (!journalText) {
                showNotification('Please write in your journal first', 'error');
                return;
            }
            
            // Crisis check
            if (checkForCrisis(journalText)) {
                showNotification(EMERGENCY_RESPONSE, 'warning', 10000);
                document.getElementById('ai-insights').style.display = 'block';
                document.getElementById('insight-content').innerHTML = `
                    <div class="emergency-notice">
                        <p><strong>🚨 Important Notice</strong></p>
                        <p>If you're experiencing thoughts of self-harm or suicide, please reach out for immediate help:</p>
                        <ul>
                            <li><strong>988 Suicide & Crisis Lifeline</strong> (24/7)</li>
                            <li><strong>Crisis Text Line</strong>: Text HOME to 741741</li>
                            <li><strong>Emergency Services</strong>: Call 911</li>
                        </ul>
                        <p>You are not alone, and help is available right now.</p>
                    </div>
                `;
                return;
            }
            
            showLoading('Analyzing your journal', 'Looking for positive patterns and insights...');
            
            try {
                const prompt = `Analyze this journal entry for general wellness patterns. Focus on:
                1. Positive emotions or achievements mentioned
                2. General self-care opportunities
                3. Gentle encouragement
                
                Journal: ${journalText.substring(0, 1000)}
                
                Response format (plain text, no JSON):
                - Start with a supportive opening
                - Mention 2-3 positive observations
                - Suggest 1-2 gentle self-care ideas
                - End with encouragement
                - Never provide medical advice`;
                
                const insights = await callOpenRouterAPI(prompt, AI_MODELS.analysis);
                
                // Display insights
                document.getElementById('ai-insights').style.display = 'block';
                document.getElementById('insight-content').innerHTML = insights.replace(/\n/g, '<br>');
                
                // Update journal achievement
                userData.achievements.journal5 = (parseInt(localStorage.getItem('journalEntries') || '0') + 1) >= 5;
                localStorage.setItem('journalEntries', (parseInt(localStorage.getItem('journalEntries') || '0') + 1).toString());
                
                updateAchievements();
                showNotification('AI insights generated!', 'success');
                
            } catch (error) {
                console.error('Journal analysis error:', error);
                showNotification('Could not analyze journal. Please try again.', 'error');
            } finally {
                hideLoading();
            }
        }
        
        // ==================== FOCUS TIMER ====================
        
        function initFocusTimer() {
            // Timer buttons
            document.getElementById('start-timer').addEventListener('click', startTimer);
            document.getElementById('pause-timer').addEventListener('click', pauseTimer);
            document.getElementById('reset-timer').addEventListener('click', resetTimer);
            
            // Time options
            document.querySelectorAll('.time-option').forEach(option => {
                option.addEventListener('click', () => {
                    document.querySelectorAll('.time-option').forEach(o => o.classList.remove('active'));
                    option.classList.add('active');
                    
                    const minutes = parseInt(option.dataset.minutes);
                    timerSeconds = minutes * 60;
                    updateTimerDisplay();
                    
                    showNotification(`Timer set to ${minutes} minutes`, 'info');
                });
            });
            
            // Update timer display initially
            updateTimerDisplay();
        }
        
        function updateTimerDisplay() {
            const minutes = Math.floor(timerSeconds / 60);
            const seconds = timerSeconds % 60;
            document.getElementById('timer-display').textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        
        function startTimer() {
            if (timerRunning) return;
            
            timerRunning = true;
            document.getElementById('start-timer').disabled = true;
            document.getElementById('pause-timer').disabled = false;
            
            timerInterval = setInterval(() => {
                timerSeconds--;
                updateTimerDisplay();
                
                if (timerSeconds <= 0) {
                    clearInterval(timerInterval);
                    timerRunning = false;
                    document.getElementById('start-timer').disabled = false;
                    document.getElementById('pause-timer').disabled = true;
                    
                    // Timer completed
                    userData.focusSessions++;
                    saveData();
                    updateDashboard();
                    
                    showNotification('Focus session completed! Great work! 🎉', 'success');
                    playCompletionSound();
                    
                    // Get focus tips
                    getFocusTips();
                }
            }, 1000);
            
            showNotification('Focus timer started! Stay focused! 🎯', 'info');
        }
        
        function pauseTimer() {
            if (!timerRunning) return;
            
            clearInterval(timerInterval);
            timerRunning = false;
            document.getElementById('start-timer').disabled = false;
            document.getElementById('pause-timer').disabled = true;
            
            showNotification('Timer paused', 'warning');
        }
        
        function resetTimer() {
            clearInterval(timerInterval);
            timerRunning = false;
            document.getElementById('start-timer').disabled = false;
            document.getElementById('pause-timer').disabled = true;
            
            // Reset to current selected time
            const activeOption = document.querySelector('.time-option.active');
            const minutes = parseInt(activeOption.dataset.minutes);
            timerSeconds = minutes * 60;
            updateTimerDisplay();
            
            showNotification('Timer reset', 'info');
        }
        
        function playCompletionSound() {
            // Simple notification sound using Web Audio API
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.value = 523.25; // C5
                oscillator.type = 'sine';
                
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 1);
            } catch (e) {
                console.log('Audio not supported');
            }
        }
        
        async function getFocusTips() {
            try {
                const prompt = `Provide 2-3 brief tips for maintaining focus and productivity. Keep it simple and practical.`;
                
                const tips = await callOpenRouterAPI(prompt, AI_MODELS.supportive);
                
                // Update tips section
                const tipsList = document.querySelector('.tips-list');
                const newTips = tips.split('\n').filter(tip => tip.trim().length > 0);
                
                newTips.slice(0, 4).forEach((tip, index) => {
                    if (tipsList.children[index]) {
                        tipsList.children[index].textContent = tip.replace(/^- /, '').trim();
                    }
                });
                
            } catch (error) {
                console.error('Tips error:', error);
            }
        }
        
        // ==================== RECOMMENDATIONS ====================
        
        async function getPersonalizedTips() {
            showLoading('Getting personalized tips', 'AI is analyzing your patterns...');
            
            try {
                let prompt = "Provide 4 wellness tips for maintaining mental well-being and productivity. ";
                
                if (userData.mood && userData.mood < 3) {
                    prompt += "The user has been feeling low recently. Focus on gentle mood-boosting activities. ";
                }
                
                if (userData.sleep && userData.sleep < 6) {
                    prompt += "The user has had poor sleep. Include sleep hygiene tips. ";
                }
                
                prompt += "Format as a JSON array of objects with 'title' and 'description'.";
                
                const tipsJson = await callOpenRouterAPI(prompt, AI_MODELS.primary, true);
                const tips = JSON.parse(tipsJson);
                
                updateRecommendationsList(tips);
                
            } catch (error) {
                console.error('Tips error:', error);
                showNotification('Using default wellness tips', 'info');
            } finally {
                hideLoading();
            }
        }
        
        function updateRecommendationsList(tips) {
            const container = document.getElementById('recommendations-list');
            container.innerHTML = '';
            
            if (Array.isArray(tips)) {
                tips.slice(0, 4).forEach(tip => {
                    const icon = getIconForTip(tip.title);
                    
                    const recommendation = document.createElement('div');
                    recommendation.className = 'recommendation';
                    recommendation.innerHTML = `
                        <i class="fas fa-${icon}"></i>
                        <div class="recommendation-text">
                            <strong>${tip.title}</strong>
                            <p>${tip.description}</p>
                        </div>
                    `;
                    container.appendChild(recommendation);
                });
            }
        }
        
        function getIconForTip(title) {
            const lowerTitle = title.toLowerCase();
            
            if (lowerTitle.includes('walk') || lowerTitle.includes('exercise')) return 'walking';
            if (lowerTitle.includes('water') || lowerTitle.includes('drink')) return 'water';
            if (lowerTitle.includes('sleep') || lowerTitle.includes('rest')) return 'bed';
            if (lowerTitle.includes('eye') || lowerTitle.includes('break')) return 'eye-slash';
            if (lowerTitle.includes('breathe') || lowerTitle.includes('meditate')) return 'wind';
            if (lowerTitle.includes('social') || lowerTitle.includes('talk')) return 'users';
            if (lowerTitle.includes('gratitude') || lowerTitle.includes('journal')) return 'pen-fancy';
            
            return 'heart';
        }
        
        function updateRecommendations(feedback) {
            // This would parse AI feedback and update recommendations
            // For now, we'll just trigger a refresh of tips
            getPersonalizedTips();
        }
        
        // ==================== DASHBOARD UPDATES ====================
        
        function updateDashboard() {
            // Update streak
            document.getElementById('streak-days').textContent = userData.streak;
            
            // Update today's mood
            if (userData.mood) {
                const moodEmoji = ['😔', '😟', '😐', '🙂', '😄'][userData.mood - 1];
                document.getElementById('today-mood').textContent = moodEmoji;
            }
            
            // Update productivity
            if (userData.productivity) {
                document.getElementById('productivity-score').textContent = `${userData.productivity}/10`;
            }
            
            // Update focus time
            const focusHours = Math.floor(userData.focusSessions * 0.5); // Assuming 30min sessions
            document.getElementById('focus-time').textContent = `${focusHours}h`;
            
            // Update focus sessions
            document.getElementById('sessions-today').textContent = userData.focusSessions;
            
            // Update achievements
            updateAchievements();
            
            // Update chart if Chart.js is loaded
            updateChart();
        }
        
        function updateAchievements() {
            // Streak achievement
            if (userData.streak >= 7) {
                userData.achievements.streak7 = true;
                document.getElementById('streak-achievement').textContent = 'Achieved!';
                document.querySelector('#streak-achievement').parentElement.parentElement.querySelector('.achievement-icon').classList.add('completed');
            }
            
            // Focus achievement
            if (userData.focusSessions >= 10) {
                userData.achievements.focus10 = true;
                document.getElementById('focus-achievement').textContent = 'Achieved!';
                document.querySelector('#focus-achievement').parentElement.parentElement.querySelector('.achievement-icon').classList.add('completed');
            } else {
                document.getElementById('focus-achievement').textContent = `${userData.focusSessions}/10 sessions`;
            }
            
            // Journal achievement
            const journalEntries = parseInt(localStorage.getItem('journalEntries') || '0');
            if (journalEntries >= 5) {
                userData.achievements.journal5 = true;
                document.getElementById('journal-achievement').textContent = 'Achieved!';
                document.querySelector('#journal-achievement').parentElement.parentElement.querySelector('.achievement-icon').classList.add('completed');
            } else {
                document.getElementById('journal-achievement').textContent = `${journalEntries}/5 entries`;
            }
            
            // Balanced week (simplified)
            if (userData.mood && userData.mood > 3) {
                document.getElementById('balance-achievement').textContent = 'On track';
            }
            
            saveData();
        }
        
        function updateChart() {
            // Simple mood chart for the week
            const ctx = document.getElementById('mood-chart');
            if (!ctx) return;
            
            // Generate sample data for the week
            const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            const moodData = days.map(() => Math.floor(Math.random() * 3) + 2); // Random moods 2-4
            
            // Use today's mood if available
            if (userData.mood) {
                const today = new Date().getDay();
                moodData[today] = userData.mood;
            }
            
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: days,
                    datasets: [{
                        label: 'Mood',
                        data: moodData,
                        borderColor: '#00f2fe',
                        backgroundColor: 'rgba(0, 242, 254, 0.1)',
                        tension: 0.3
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            min: 1,
                            max: 5,
                            ticks: {
                                callback: function(value) {
                                    return ['😔', '😟', '😐', '🙂', '😄'][value - 1];
                                }
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            });
            
            // Update averages
            const avgMood = moodData.reduce((a, b) => a + b, 0) / moodData.length;
            document.getElementById('avg-mood').textContent = avgMood.toFixed(1);
            
            if (userData.productivity) {
                document.getElementById('avg-productivity').textContent = `${userData.productivity}/10`;
            }
            
            if (userData.sleep) {
                document.getElementById('avg-sleep').textContent = `${userData.sleep}/10`;
            }
        }
        
        // ==================== REPORT MODAL ====================
        
        function initReportModal() {
            // View details button
            document.getElementById('view-details').addEventListener('click', () => {
                document.getElementById('report-modal').style.display = 'flex';
                generateDetailedReport();
            });
            
            // Close buttons
            document.getElementById('close-modal').addEventListener('click', () => {
                document.getElementById('report-modal').style.display = 'none';
            });
            
            document.getElementById('close-report').addEventListener('click', () => {
                document.getElementById('report-modal').style.display = 'none';
            });
            
            // Tab switching
            document.querySelectorAll('.report-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    const tabId = tab.dataset.tab;
                    
                    // Update active tab
                    document.querySelectorAll('.report-tab').forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    
                    // Show corresponding content
                    document.querySelectorAll('.tab-content').forEach(content => {
                        content.classList.remove('active');
                    });
                    document.getElementById(`${tabId}-tab`).classList.add('active');
                });
            });
        }
        
        function generateDetailedReport() {
            // This would generate detailed charts and insights
            // For now, we'll create simple charts
            
            // Mood chart
            const moodCtx = document.getElementById('detailed-mood-chart');
            if (moodCtx) {
                new Chart(moodCtx, {
                    type: 'bar',
                    data: {
                        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                        datasets: [{
                            label: 'Average Mood',
                            data: [3.2, 3.8, 4.1, 3.9],
                            backgroundColor: '#00f2fe'
                        }]
                    }
                });
            }
        }
        
        // ==================== INITIALIZATION ====================
        
        document.addEventListener('DOMContentLoaded', function() {
            // Check authentication
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
            //} else {
                //window.location.href = '/login.html';
                //return;
            }
            
            // Load saved data
            loadData();
            
            // Initialize components
            initDailyCheckin();
            initJournal();
            initFocusTimer();
            initReportModal();
            
            // Refresh tips button
            document.getElementById('refresh-tips').addEventListener('click', getPersonalizedTips);
            
            // Productivity slider update
            document.getElementById('productivity-slider').addEventListener('input', function() {
                document.getElementById('slider-value').textContent = `${this.value}/10`;
            });
            
            // Export report
            document.getElementById('export-report').addEventListener('click', () => {
                showNotification('Report export feature coming soon!', 'info');
            });
            
            // Get initial tips
            setTimeout(getPersonalizedTips, 1000);
            
            // Show welcome notification
            setTimeout(() => {
                showNotification('Welcome to MindCare AI! Start with your daily check-in. 💙', 'info', 8000);
            }, 1500);
        });