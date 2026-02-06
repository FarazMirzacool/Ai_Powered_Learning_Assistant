// ==================== CONFIGURATION ====================
const OPENROUTER_API_KEY = "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";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// AI Models configuration - Using reliable models
const AI_MODELS = {
    primary: "openai/gpt-3.5-turbo",
    structured: "google/gemma-2-9b-it:free",
    creative: "meta-llama/llama-3.1-8b-instruct:free",
    fallback: "google/gemma-2-9b-it:free"
};

// Global state
let userProfile = {
    name: "",
    email: "",
    skills: [],
    targetRole: "",
    experience: [],
    education: []
};

let selectedTemplate = "professional";
let currentStep = 1;

// ==================== UTILITY FUNCTIONS ====================

// Show notification
function showNotification(message, type = "info", duration = 5000) {
    // Create notification container if it doesn't exist
    let container = document.getElementById('notificationContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notificationContainer';
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
        padding: 15px 20px;
        margin-bottom: 10px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        animation: slideIn 0.3s ease;
    `;
    
    const icon = type === 'success' ? 'fa-check-circle' : 
                 type === 'error' ? 'fa-exclamation-circle' : 
                 type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle';
    
    notification.innerHTML = `
        <i class="fas ${icon}" style="margin-right: 10px; font-size: 1.2rem;"></i>
        <span style="flex: 1;">${escapeHtml(message)}</span>
        <button onclick="this.parentElement.remove()" style="background: none; border: none; color: white; cursor: pointer; margin-left: 10px; font-size: 1.1rem;">
            &times;
        </button>
    `;
    
    container.appendChild(notification);
    
    // Auto remove after duration
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => notification.remove(), 300);
        }
    }, duration);
    
    return notification;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show/hide modal
function showModal(modalId, title = "", message = "") {
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.error(`Modal ${modalId} not found`);
        return;
    }
    
    // Update title if provided
    if (title) {
        const titleEl = modal.querySelector('h3');
        if (titleEl) titleEl.textContent = title;
    }
    
    // Update message if provided
    if (message) {
        const messageEl = modal.querySelector('p');
        if (messageEl) messageEl.textContent = message;
    }
    
    modal.style.display = 'flex';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Call OpenRouter API with better error handling
async function callOpenRouterAPI(prompt, model = AI_MODELS.primary, jsonMode = false) {
    try {
        console.log('Calling OpenRouter API with model:', model);
        
        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.origin,
                'X-Title': 'AI Career Assistant'
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    {
                        role: "system",
                        content: jsonMode ? 
                            "You are a career expert. Always respond with valid JSON in the exact format requested. Do not include any other text." :
                            "You are an expert career coach and resume writer with 20+ years experience. Provide detailed, actionable advice."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 2000,
                ...(jsonMode && { response_format: { type: "json_object" } })
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error Response:', errorText);
            
            if (response.status === 429) {
                throw new Error('Rate limit exceeded. Please try again in a moment.');
            } else if (response.status === 401) {
                throw new Error('API authentication failed. Please check configuration.');
            }
            
            throw new Error(`API Error ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        const content = data.choices[0].message.content;
        console.log('API Response received successfully');
        
        return content;
        
    } catch (error) {
        console.error('API Call Error:', error);
        throw error; // Re-throw for handling in calling function
    }
}

// Parse JSON with fallback
function safeJsonParse(str) {
    if (!str) return createFallbackResponse();
    
    try {
        // Clean the string
        let cleanedStr = str.trim();
        
        // Remove markdown code blocks
        cleanedStr = cleanedStr.replace(/```json\s*/g, '');
        cleanedStr = cleanedStr.replace(/```\s*/g, '');
        
        // Try direct parse
        const parsed = JSON.parse(cleanedStr);
        console.log('Successfully parsed JSON');
        return parsed;
    } catch (e1) {
        console.warn('Direct JSON parse failed, trying to extract...');
        
        try {
            // Try to extract JSON from text
            const jsonMatch = cleanedStr.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const extracted = jsonMatch[0];
                return JSON.parse(extracted);
            }
        } catch (e2) {
            console.error('Extracted JSON parse failed');
        }
        
        // Create fallback response
        return createFallbackResponse();
    }
}

function createFallbackResponse() {
    return {
        overall_score: Math.floor(Math.random() * 20) + 70,
        ats_score: Math.floor(Math.random() * 20) + 70,
        strengths: [
            "Clean and professional formatting",
            "Clear section organization",
            "Relevant technical skills highlighted"
        ],
        weaknesses: [
            "Could add more quantifiable achievements",
            "Consider adding a professional summary section",
            "Include more industry-specific keywords"
        ],
        suggestions: [
            "Add 2-3 specific achievements with measurable results",
            "Include relevant certifications or courses",
            "Tailor skills to match target job description",
            "Add links to portfolio, GitHub, or LinkedIn"
        ],
        keyword_suggestions: ["JavaScript", "React", "Node.js", "TypeScript", "Git", "AWS"],
        formatting_issues: ["No major formatting issues detected"]
    };
}

// ==================== RESUME ANALYSIS ====================

function initResumeUpload() {
    const fileInput = document.getElementById('resumeFile');
    const uploadArea = document.getElementById('uploadArea');
    const analyzeBtn = document.getElementById('analyzeBtn');
    
    if (!fileInput || !uploadArea) {
        console.error('Resume upload elements not found');
        return;
    }
    
    // File input change handler
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            console.log('File selected:', file.name);
            
            // Validate file size (5MB limit)
            if (file.size > 5 * 1024 * 1024) {
                showNotification('File too large. Max 5MB allowed.', 'error');
                fileInput.value = '';
                return;
            }
            
            // Validate file type
            const validTypes = ['application/pdf', 'application/msword', 
                              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                              'text/plain'];
            const fileExt = file.name.toLowerCase().split('.').pop();
            
            if (!validTypes.includes(file.type) && !['pdf', 'doc', 'docx', 'txt'].includes(fileExt)) {
                showNotification('Please upload PDF, DOC, DOCX, or TXT files only.', 'error');
                fileInput.value = '';
                return;
            }
            
            // Show file info
            uploadArea.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <i class="fas fa-check-circle" style="color: #10b981; font-size: 3rem; margin-bottom: 15px;"></i>
                    <h3 style="color: var(--light); margin-bottom: 5px;">${file.name}</h3>
                    <p style="color: #888; margin-bottom: 20px;">${(file.size / 1024).toFixed(1)} KB • Ready to analyze</p>
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button class="btn btn-primary" onclick="analyzeResume()">
                            <i class="fas fa-chart-line"></i> Analyze Resume
                        </button>
                        <button class="btn btn-outline" onclick="document.getElementById('resumeFile').click()">
                            <i class="fas fa-redo"></i> Change File
                        </button>
                    </div>
                </div>
            `;
            
            showNotification(`File "${file.name}" uploaded successfully`, 'success');
        }
    });
    
    // Drag and drop handlers
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.border = '2px dashed #6a11cb';
        uploadArea.style.background = 'rgba(106, 17, 203, 0.1)';
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.border = '2px dashed rgba(106, 17, 203, 0.3)';
        uploadArea.style.background = 'rgba(255, 255, 255, 0.02)';
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.border = '2px dashed rgba(106, 17, 203, 0.3)';
        uploadArea.style.background = 'rgba(255, 255, 255, 0.02)';
        
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            fileInput.dispatchEvent(new Event('change'));
        }
    });
    //Analyze method
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', analyzeResume);
    }
}
//Analyze 
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
    });
}
async function analyzeResume() {
    const fileInput = document.getElementById('resumeFile');
    if (!fileInput || !fileInput.files[0]) {
        showNotification('Please upload a resume file first', 'error');
        return;
    }
    
    const file = fileInput.files[0];
    showModal('loadingModal', 'Analyzing Resume', 'AI is analyzing your resume...');
    
    try {
        let resumeText = "";
        
        // For PDF files, we'll simulate content since PDF parsing requires external libraries
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            resumeText = `PDF Resume: ${file.name}\n\nNote: For best analysis results with PDF files, please:\n1. Convert to text format\n2. Or copy-paste resume content into a text file\n3. Use the AI Resume Builder for optimal results`;
            showNotification('PDF detected. For best results, consider using text format.', 'info');
        } else {
            resumeText = await readFileAsText(file);
        }
        
        const targetRole = document.getElementById('targetRole').value || 'Software Developer';
        const targetCompany = document.getElementById('targetCompany').value || 'Technology Company';
        
        const prompt = `As a senior hiring manager, analyze this resume for a ${targetRole} position at ${targetCompany}.

RESUME CONTENT:
${resumeText.substring(0, 2000)}

Provide analysis in this exact JSON format only:
{
    "overall_score": 85,
    "ats_score": 90,
    "strengths": ["strength 1", "strength 2", "strength 3"],
    "weaknesses": ["weakness 1", "weakness 2", "weakness 3"],
    "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3", "suggestion 4"],
    "keyword_suggestions": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
    "formatting_issues": ["issue1", "issue2"]
}

IMPORTANT:
- overall_score and ats_score must be numbers 60-95
- Each array must have the specified number of items
- Be specific and actionable`;

        const analysis = await callOpenRouterAPI(prompt, AI_MODELS.structured, true);
        const result = safeJsonParse(analysis);
        
        displayResumeAnalysis(result);
        updateDashboardStats(result);
        
        showNotification('✅ Resume analysis complete!', 'success');
        
    } catch (error) {
        console.error('Analysis error:', error);
        showNotification('Using demo analysis results', 'warning');
        
        const fallbackResult = createFallbackResponse();
        displayResumeAnalysis(fallbackResult);
        updateDashboardStats(fallbackResult);
        
    } finally {
        closeModal('loadingModal');
    }
}

function displayResumeAnalysis(result) {
    const resultsSection = document.getElementById('resultsSection');
    if (!resultsSection) return;
    
    resultsSection.style.display = 'block';
    resultsSection.style.animation = 'fadeIn 0.5s ease';
    
    // Update scores
    const overallScoreEl = document.getElementById('overallScore');
    const atsScoreEl = document.getElementById('atsScore');
    
    if (overallScoreEl) {
        overallScoreEl.textContent = result.overall_score || 75;
        overallScoreEl.style.transform = 'scale(1.2)';
        setTimeout(() => overallScoreEl.style.transform = 'scale(1)', 300);
    }
    
    if (atsScoreEl) {
        atsScoreEl.textContent = result.ats_score || 80;
        atsScoreEl.style.transform = 'scale(1.2)';
        setTimeout(() => atsScoreEl.style.transform = 'scale(1)', 300);
    }
    
    // Update lists
    updateAnalysisList('strengthsList', result.strengths || [], 'check-circle');
    updateAnalysisList('weaknessesList', result.weaknesses || [], 'exclamation-triangle');
    updateAnalysisList('suggestionsList', result.suggestions || [], 'lightbulb');
    
    addActivity(`Resume analyzed - Score: ${result.overall_score || 75}/100`);
    
    // Scroll to results
    setTimeout(() => {
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 500);
}

function updateAnalysisList(elementId, items, iconType) {
    const list = document.getElementById(elementId);
    if (!list) return;
    
    list.innerHTML = '';
    
    items.forEach((item, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div style="display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; border-bottom: 1px solid #333;">
                <i class="fas fa-${iconType}" style="color: #6a11cb; margin-top: 3px;"></i>
                <span>${escapeHtml(item)}</span>
            </div>
        `;
        li.style.animationDelay = `${index * 0.1}s`;
        list.appendChild(li);
    });
}

// Test function for resume analysis
window.testResumeAnalysis = async function() {
    showModal('loadingModal', 'Running Demo Analysis', 'Testing resume analysis with sample data...');
    
    try {
        const sampleResume = `JANE DOE
Senior Software Engineer
jane.doe@email.com | (987) 654-3210 | New York, NY
LinkedIn: linkedin.com/in/janedoe | GitHub: github.com/janedoe

SUMMARY
Full-stack developer with 5+ years experience building scalable web applications.
Expert in JavaScript, React, Node.js, and cloud technologies.

EXPERIENCE
Senior Software Engineer - TechCorp | 2021-Present
- Led development of microservices architecture serving 1M+ users
- Improved application performance by 70% through optimization
- Mentored 3 junior developers and conducted code reviews

Software Developer - Startup Inc | 2019-2021
- Built RESTful APIs handling 100K+ daily requests
- Implemented CI/CD pipelines reducing deployment time by 50%
- Collaborated with product team on agile development

EDUCATION
Master of Science in Computer Science
Stanford University | 2017-2019
GPA: 3.9/4.0

SKILLS
Frontend: React, Vue.js, TypeScript, HTML5, CSS3
Backend: Node.js, Python, Java, Express.js
Cloud: AWS, Docker, Kubernetes, CI/CD
Databases: MongoDB, PostgreSQL, Redis`;

        const prompt = `Analyze this resume for a Senior Software Engineer position.

RESUME CONTENT:
${sampleResume}

Provide analysis in JSON format exactly as specified previously.`;

        const analysis = await callOpenRouterAPI(prompt, AI_MODELS.structured, true);
        const result = safeJsonParse(analysis);
        
        displayResumeAnalysis(result);
        updateDashboardStats(result);
        
        showNotification('✅ Demo analysis successful!', 'success');
        
    } catch (error) {
        console.error('Demo analysis error:', error);
        showNotification('Showing demo results', 'warning');
        
        const fallbackResult = createFallbackResponse();
        displayResumeAnalysis(fallbackResult);
        updateDashboardStats(fallbackResult);
        
    } finally {
        closeModal('loadingModal');
    }
};

// ==================== RESUME BUILDER ====================

function initResumeBuilder() {
    initSkillsInput();
    setupStepNavigation();
    setupTemplateSelection();
    
    // Add default entries if none exist
    if (document.querySelectorAll('.experience-entry').length === 0) {
        addExperience();
    }
    if (document.querySelectorAll('.education-entry').length === 0) {
        addEducation();
    }
}

function setupStepNavigation() {
    window.nextStep = function(step) {
        if (!validateStep(currentStep)) {
            showNotification('Please fill in all required fields', 'error');
            return;
        }
        
        // Hide current step
        const currentStepEl = document.getElementById(`step${currentStep}`);
        if (currentStepEl) currentStepEl.classList.remove('active');
        
        // Update step indicator
        const currentIndicator = document.querySelector(`.step[data-step="${currentStep}"]`);
        if (currentIndicator) currentIndicator.classList.remove('active');
        
        // Show next step
        const nextStepEl = document.getElementById(`step${step}`);
        if (nextStepEl) nextStepEl.classList.add('active');
        
        // Update step indicator
        const nextIndicator = document.querySelector(`.step[data-step="${step}"]`);
        if (nextIndicator) nextIndicator.classList.add('active');
        
        currentStep = step;
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    
    window.prevStep = function(step) {
        // Hide current step
        const currentStepEl = document.getElementById(`step${currentStep}`);
        if (currentStepEl) currentStepEl.classList.remove('active');
        
        // Update step indicator
        const currentIndicator = document.querySelector(`.step[data-step="${currentStep}"]`);
        if (currentIndicator) currentIndicator.classList.remove('active');
        
        // Show previous step
        const prevStepEl = document.getElementById(`step${step}`);
        if (prevStepEl) prevStepEl.classList.add('active');
        
        // Update step indicator
        const prevIndicator = document.querySelector(`.step[data-step="${step}"]`);
        if (prevIndicator) prevIndicator.classList.add('active');
        
        currentStep = step;
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
}

function validateStep(step) {
    switch(step) {
        case 1:
            const name = document.getElementById('fullName')?.value.trim();
            const email = document.getElementById('email')?.value.trim();
            
            if (!name) {
                document.getElementById('fullName').style.borderColor = '#ff4757';
                return false;
            }
            if (!email) {
                document.getElementById('email').style.borderColor = '#ff4757';
                return false;
            }
            
            // Save to profile
            userProfile.name = name;
            userProfile.email = email;
            userProfile.phone = document.getElementById('phone')?.value.trim() || '';
            userProfile.location = document.getElementById('location')?.value.trim() || '';
            userProfile.summary = document.getElementById('summary')?.value.trim() || '';
            return true;
            
        case 2:
            const experiences = document.querySelectorAll('.experience-entry');
            let hasValidExperience = false;
            
            experiences.forEach(exp => {
                const title = exp.querySelector('.exp-title')?.value.trim();
                const company = exp.querySelector('.exp-company')?.value.trim();
                if (title && company) hasValidExperience = true;
            });
            
            if (!hasValidExperience) {
                showNotification('Please add at least one work experience', 'warning');
                return false;
            }
            return true;
            
        case 3:
            const educations = document.querySelectorAll('.education-entry');
            let hasValidEducation = false;
            
            educations.forEach(edu => {
                const degree = edu.querySelector('.edu-degree')?.value.trim();
                const institution = edu.querySelector('.edu-institution')?.value.trim();
                if (degree && institution) hasValidEducation = true;
            });
            
            if (!hasValidEducation) {
                showNotification('Please add at least one education entry', 'warning');
                return false;
            }
            return true;
            
        case 4:
            if (userProfile.skills.length === 0) {
                showNotification('Please add at least one skill', 'warning');
                return false;
            }
            return true;
            
        default:
            return true;
    }
}

window.addExperience = function() {
    const container = document.getElementById('experienceEntries');
    if (!container) return;
    
    const newEntry = document.createElement('div');
    newEntry.className = 'experience-entry';
    newEntry.innerHTML = `
        <div class="form-grid">
            <div class="form-group">
                <label>Job Title *</label>
                <input type="text" class="exp-title" placeholder="Software Engineer" required>
            </div>
            <div class="form-group">
                <label>Company *</label>
                <input type="text" class="exp-company" placeholder="Tech Corp" required>
            </div>
            <div class="form-group">
                <label>Start Date</label>
                <input type="month" class="exp-start">
            </div>
            <div class="form-group">
                <label>End Date</label>
                <input type="month" class="exp-end" placeholder="Present">
            </div>
            <div class="form-group full-width">
                <label>Responsibilities & Achievements</label>
                <textarea class="exp-desc" rows="3" placeholder="Describe your key achievements..."></textarea>
            </div>
        </div>
        <button class="btn btn-outline" onclick="this.parentElement.remove()" style="margin-top: 10px;">
            <i class="fas fa-trash"></i> Remove
        </button>
    `;
    container.appendChild(newEntry);
    
    newEntry.style.animation = 'slideUp 0.3s ease';
    showNotification('New experience entry added', 'info');
};

window.addEducation = function() {
    const container = document.getElementById('educationEntries');
    if (!container) return;
    
    const newEntry = document.createElement('div');
    newEntry.className = 'education-entry';
    newEntry.innerHTML = `
        <div class="form-grid">
            <div class="form-group">
                <label>Degree *</label>
                <input type="text" class="edu-degree" placeholder="Bachelor of Science" required>
            </div>
            <div class="form-group">
                <label>Field of Study</label>
                <input type="text" class="edu-field" placeholder="Computer Science">
            </div>
            <div class="form-group">
                <label>Institution *</label>
                <input type="text" class="edu-institution" placeholder="University Name" required>
            </div>
            <div class="form-group">
                <label>Graduation Year</label>
                <input type="number" class="edu-year" placeholder="2023" min="1950" max="2030">
            </div>
        </div>
        <button class="btn btn-outline" onclick="this.parentElement.remove()" style="margin-top: 10px;">
            <i class="fas fa-trash"></i> Remove
        </button>
    `;
    container.appendChild(newEntry);
    
    newEntry.style.animation = 'slideUp 0.3s ease';
    showNotification('New education entry added', 'info');
};

function initSkillsInput() {
    const skillInput = document.getElementById('skillInput');
    const skillsTags = document.getElementById('skillsTags');
    
    if (!skillInput || !skillsTags) return;
    
    // Load saved skills
    const savedSkills = localStorage.getItem('userSkills');
    if (savedSkills) {
        try {
            userProfile.skills = JSON.parse(savedSkills);
            updateSkillsDisplay();
        } catch (e) {
            console.error('Failed to parse saved skills:', e);
            userProfile.skills = ['JavaScript', 'HTML', 'CSS', 'React'];
            updateSkillsDisplay();
        }
    }
    
    // Enter key to add skill
    skillInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const skill = skillInput.value.trim();
            if (skill && !userProfile.skills.includes(skill)) {
                userProfile.skills.push(skill);
                updateSkillsDisplay();
                skillInput.value = '';
                localStorage.setItem('userSkills', JSON.stringify(userProfile.skills));
                showNotification(`Skill added: ${skill}`, 'success');
            }
        }
    });
}

function updateSkillsDisplay() {
    const skillsTags = document.getElementById('skillsTags');
    if (!skillsTags) return;
    
    skillsTags.innerHTML = '';
    
    if (userProfile.skills.length === 0) {
        skillsTags.innerHTML = '<div style="color: #888; font-style: italic; padding: 10px; text-align: center;">No skills added yet. Type a skill and press Enter.</div>';
        return;
    }
    
    userProfile.skills.forEach((skill, index) => {
        const tag = document.createElement('span');
        tag.className = 'skill-tag';
        tag.innerHTML = `
            ${skill}
            <span onclick="removeSkill(${index})" style="margin-left: 6px; cursor: pointer; color: #888;">
                <i class="fas fa-times"></i>
            </span>
        `;
        skillsTags.appendChild(tag);
    });
}

window.removeSkill = function(index) {
    if (index >= 0 && index < userProfile.skills.length) {
        userProfile.skills.splice(index, 1);
        updateSkillsDisplay();
        localStorage.setItem('userSkills', JSON.stringify(userProfile.skills));
    }
};

function setupTemplateSelection() {
    window.selectTemplate = function(template) {
        selectedTemplate = template;
        
        // Update UI
        document.querySelectorAll('.template-card').forEach(card => {
            card.classList.remove('active');
        });
        
        const selectedCard = document.querySelector(`.template-card[data-template="${template}"]`);
        if (selectedCard) {
            selectedCard.classList.add('active');
            showNotification(`Selected ${template} template`, 'info');
        }
    };
}

window.generateResume = async function() {
    // Validate all steps
    for (let i = 1; i <= 4; i++) {
        if (!validateStep(i)) {
            showNotification(`Please complete step ${i}`, 'error');
            nextStep(i);
            return;
        }
    }
    
    showModal('loadingModal', 'Generating Resume', 'AI is crafting your professional resume...');
    
    try {
        const resumeData = collectResumeData();
        
        const prompt = `Create a professional resume in HTML format.

PERSONAL INFORMATION:
- Name: ${resumeData.name}
- Email: ${resumeData.email}
- Phone: ${resumeData.phone || 'Not provided'}
- Location: ${resumeData.location || 'Not provided'}
- Summary: ${resumeData.summary || 'Not provided'}

EXPERIENCE:
${resumeData.experience.map((exp, i) => `${i+1}. ${exp.title} at ${exp.company} (${exp.start} - ${exp.end})
   ${exp.description || ''}`).join('\n')}

EDUCATION:
${resumeData.education.map((edu, i) => `${i+1}. ${edu.degree}${edu.field ? ' in ' + edu.field : ''} from ${edu.institution}${edu.year ? ' (' + edu.year + ')' : ''}`).join('\n')}

SKILLS: ${resumeData.skills.join(', ')}

TEMPLATE: ${selectedTemplate}

Create a clean, professional, ATS-friendly HTML resume.`;

        const aiResume = await callOpenRouterAPI(prompt, AI_MODELS.creative);
        
        // Save and display
        localStorage.setItem('generatedResume', aiResume);
        localStorage.setItem('resumeData', JSON.stringify(resumeData));
        
        updateResumeScore();
        
        closeModal('loadingModal');
        showModal('successModal', 'Resume Generated!', 'Your professional resume has been created. You can now preview or download it.');
        
        addActivity('AI-generated resume created');
        
    } catch (error) {
        console.error('Resume generation error:', error);
        closeModal('loadingModal');
        showNotification('Failed to generate resume. Please try again.', 'error');
    }
};

function collectResumeData() {
    // Personal info
    const name = document.getElementById('fullName')?.value.trim() || '';
    const email = document.getElementById('email')?.value.trim() || '';
    const phone = document.getElementById('phone')?.value.trim() || '';
    const location = document.getElementById('location')?.value.trim() || '';
    const summary = document.getElementById('summary')?.value.trim() || '';
    
    // Experience
    const experience = [];
    document.querySelectorAll('.experience-entry').forEach(entry => {
        const title = entry.querySelector('.exp-title')?.value.trim();
        const company = entry.querySelector('.exp-company')?.value.trim();
        const start = entry.querySelector('.exp-start')?.value || '';
        const end = entry.querySelector('.exp-end')?.value || 'Present';
        const description = entry.querySelector('.exp-desc')?.value.trim() || '';
        
        if (title && company) {
            experience.push({ title, company, start, end, description });
        }
    });
    
    // Education
    const education = [];
    document.querySelectorAll('.education-entry').forEach(entry => {
        const degree = entry.querySelector('.edu-degree')?.value.trim();
        const field = entry.querySelector('.edu-field')?.value.trim() || '';
        const institution = entry.querySelector('.edu-institution')?.value.trim();
        const year = entry.querySelector('.edu-year')?.value || '';
        
        if (degree && institution) {
            education.push({ degree, field, institution, year });
        }
    });
    
    return {
        name,
        email,
        phone,
        location,
        summary,
        experience,
        education,
        skills: userProfile.skills,
        template: selectedTemplate
    };
}

function updateResumeScore() {
    const resumeScoreEl = document.getElementById('resumeScore');
    if (resumeScoreEl) {
        resumeScoreEl.textContent = '85';
        resumeScoreEl.style.animation = 'pulse 0.5s';
    }
    
    const lastUpdateEl = document.getElementById('lastResumeUpdate');
    if (lastUpdateEl) {
        lastUpdateEl.textContent = 'Just now';
    }
}

window.previewResume = function() {
    const resume = localStorage.getItem('generatedResume');
    if (resume) {
        const newWindow = window.open();
        newWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Resume Preview</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
                    .resume { max-width: 800px; margin: 0 auto; background: white; padding: 40px; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
                    .controls { margin-bottom: 20px; }
                    .print-btn { padding: 10px 20px; background: #6a11cb; color: white; border: none; border-radius: 5px; cursor: pointer; }
                </style>
            </head>
            <body>
                <div class="controls">
                    <button class="print-btn" onclick="window.print()">Print Resume</button>
                    <button class="print-btn" onclick="window.close()" style="background: #666; margin-left: 10px;">Close</button>
                </div>
                <div class="resume">
                    ${resume}
                </div>
            </body>
            </html>
        `);
    } else {
        showNotification('Please generate a resume first', 'warning');
    }
};

// ==================== COVER LETTER GENERATOR ====================

window.generateCoverLetter = async function() {
    const jobTitle = document.getElementById('coverJobTitle')?.value.trim();
    const company = document.getElementById('coverCompany')?.value.trim();
    const jobDescription = document.getElementById('coverJobDescription')?.value.trim();
    const keyPoints = document.getElementById('coverKeyPoints')?.value.trim();
    
    if (!jobTitle || !company) {
        showNotification('Please enter job title and company name', 'error');
        return;
    }
    
    showModal('loadingModal', 'Generating Cover Letter', 'AI is creating a personalized cover letter...');
    
    try {
        // Get user data from resume builder or use defaults
        const userData = JSON.parse(localStorage.getItem('resumeData')) || {};
        
        const prompt = `Write a professional cover letter for ${userData.name || 'a candidate'} applying for ${jobTitle} position at ${company}.

KEY POINTS TO HIGHLIGHT:
${keyPoints || 'Highlight relevant skills and experience'}

JOB DESCRIPTION:
${jobDescription || 'Not provided'}

CANDIDATE BACKGROUND:
Name: ${userData.name || 'Candidate'}
Email: ${userData.email || 'Not provided'}
Summary: ${userData.summary || 'Experienced professional'}
Skills: ${userData.skills ? userData.skills.join(', ') : 'Relevant skills'}
Experience: ${userData.experience ? userData.experience.map(exp => exp.title + ' at ' + exp.company).join(', ') : 'Relevant experience'}

Create a compelling, professional cover letter that:
1. Addresses the hiring manager professionally
2. Highlights relevant qualifications
3. Shows enthusiasm for the role and company
4. Includes a call to action
5. Is concise (3-4 paragraphs)
6. Ends with professional closing`;

        const coverLetter = await callOpenRouterAPI(prompt, AI_MODELS.primary);
        
        // Display cover letter
        const coverPreview = document.getElementById('coverPreview');
        const coverContent = document.getElementById('coverLetterContent');
        
        if (coverPreview && coverContent) {
            coverContent.innerHTML = coverLetter.replace(/\n/g, '<br>');
            coverPreview.style.display = 'block';
            coverPreview.style.animation = 'fadeIn 0.5s ease';
        }
        
        // Save for download
        localStorage.setItem('coverLetter', coverLetter);
        localStorage.setItem('coverLetterData', JSON.stringify({ jobTitle, company }));
        
        closeModal('loadingModal');
        showNotification('✅ Cover letter generated successfully!', 'success');
        addActivity('Cover letter created for ' + jobTitle);
        
    } catch (error) {
        console.error('Cover letter error:', error);
        closeModal('loadingModal');
        showNotification('Failed to generate cover letter. Please try again.', 'error');
    }
};

window.downloadCoverLetter = function() {
    const coverLetter = localStorage.getItem('coverLetter');
    const data = JSON.parse(localStorage.getItem('coverLetterData') || '{}');
    
    if (!coverLetter) {
        showNotification('Please generate a cover letter first', 'warning');
        return;
    }
    
    const filename = `Cover_Letter_${data.jobTitle || 'Position'}_${data.company || 'Company'}.txt`;
    const blob = new Blob([coverLetter], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Cover letter downloaded!', 'success');
};

window.copyCoverLetter = function() {
    const coverLetter = localStorage.getItem('coverLetter');
    if (!coverLetter) {
        showNotification('Please generate a cover letter first', 'warning');
        return;
    }
    
    navigator.clipboard.writeText(coverLetter).then(() => {
        showNotification('Cover letter copied to clipboard!', 'success');
    }).catch(err => {
        showNotification('Failed to copy to clipboard', 'error');
    });
};

// ==================== JOB SUGGESTIONS ====================

window.loadJobSuggestions = async function() {
    const jobType = document.getElementById('jobTypeFilter')?.value || 'all';
    const sortBy = document.getElementById('jobSort')?.value || 'relevance';
    
    showModal('loadingModal', 'Finding Jobs', 'AI is searching for matching job opportunities...');
    
    try {
        // Get user skills and preferences
        const userSkills = userProfile.skills.length > 0 ? userProfile.skills : 
                          JSON.parse(localStorage.getItem('userSkills') || '["JavaScript", "React", "Node.js"]');
        
        const targetRole = userProfile.targetRole || document.getElementById('targetRole')?.value || 'Software Developer';
        
        const prompt = `As a career advisor, suggest 5 job opportunities for someone with these skills: ${userSkills.join(', ')}.
Target role: ${targetRole}
Job type preference: ${jobType}
Sort by: ${sortBy}

Provide results as a JSON array with exactly 5 jobs, each with:
{
    "title": "Job Title",
    "company": "Company Name",
    "location": "Location",
    "type": "job type",
    "description": "brief job description",
    "match_percentage": 85,
    "required_skills": ["skill1", "skill2", "skill3"],
    "salary_range": "$XX,XXX - $XX,XXX"
}`;

        const response = await callOpenRouterAPI(prompt, AI_MODELS.structured, true);
        const jobs = safeJsonParse(response);
        
        displayJobSuggestions(Array.isArray(jobs) ? jobs : []);
        
        // Update job matches count
        const jobMatchesEl = document.getElementById('jobMatches');
        if (jobMatchesEl) {
            jobMatchesEl.textContent = '5+';
        }
        
        closeModal('loadingModal');
        showNotification(`Found ${Array.isArray(jobs) ? jobs.length : 5} job matches`, 'success');
        
    } catch (error) {
        console.error('Job suggestions error:', error);
        closeModal('loadingModal');
        
        // Show demo jobs
        displayDemoJobs();
        showNotification('Showing demo job suggestions', 'info');
    }
};

function displayJobSuggestions(jobs) {
    const jobList = document.getElementById('jobList');
    if (!jobList) return;
    
    jobList.innerHTML = '';
    
    const jobsToShow = Array.isArray(jobs) && jobs.length > 0 ? jobs : getDemoJobs();
    
    jobsToShow.forEach(job => {
        const jobCard = document.createElement('div');
        jobCard.className = 'job-card';
        jobCard.innerHTML = `
            <div class="job-card-header">
                <h3>${escapeHtml(job.title || 'Job Title')}</h3>
                <span class="match-badge">${job.match_percentage || 85}% Match</span>
            </div>
            <div class="job-card-company">
                <i class="fas fa-building"></i>
                <span>${escapeHtml(job.company || 'Company')}</span>
            </div>
            <div class="job-card-details">
                <span><i class="fas fa-map-marker-alt"></i> ${escapeHtml(job.location || 'Remote')}</span>
                <span><i class="fas fa-briefcase"></i> ${escapeHtml(job.type || 'Full-time')}</span>
                <span><i class="fas fa-money-bill-wave"></i> ${escapeHtml(job.salary_range || 'Competitive')}</span>
            </div>
            <div class="job-card-description">
                <p>${escapeHtml(job.description || 'Exciting opportunity for skilled professionals.')}</p>
            </div>
            <div class="job-card-skills">
                ${(job.required_skills || ['JavaScript', 'React', 'Node.js']).map(skill => 
                    `<span class="skill-tag">${escapeHtml(skill)}</span>`
                ).join('')}
            </div>
            <div class="job-card-actions">
                <button class="btn btn-primary" onclick="applyForJob('${escapeHtml(job.title)}', '${escapeHtml(job.company)}')">
                    <i class="fas fa-paper-plane"></i> Apply Now
                </button>
                <button class="btn btn-outline" onclick="generateCoverLetterForJob('${escapeHtml(job.title)}', '${escapeHtml(job.company)}')">
                    <i class="fas fa-envelope"></i> Cover Letter
                </button>
            </div>
        `;
        jobList.appendChild(jobCard);
    });
}

function getDemoJobs() {
    return [
        {
            title: "Full Stack Developer",
            company: "TechCorp",
            location: "San Francisco, CA",
            type: "Full-time",
            description: "Looking for a Full Stack Developer to build scalable web applications using modern technologies.",
            match_percentage: 92,
            required_skills: ["JavaScript", "React", "Node.js", "MongoDB", "AWS"],
            salary_range: "$120,000 - $160,000"
        },
        {
            title: "Frontend Engineer",
            company: "Digital Solutions",
            location: "Remote",
            type: "Remote",
            description: "Join our team to create beautiful, responsive user interfaces for enterprise applications.",
            match_percentage: 88,
            required_skills: ["React", "TypeScript", "HTML5", "CSS3", "Git"],
            salary_range: "$100,000 - $140,000"
        },
        {
            title: "Backend Developer",
            company: "DataSystems Inc",
            location: "New York, NY",
            type: "Full-time",
            description: "Develop robust backend services and APIs for data-intensive applications.",
            match_percentage: 85,
            required_skills: ["Node.js", "Python", "PostgreSQL", "Docker", "Redis"],
            salary_range: "$110,000 - $150,000"
        }
    ];
}

function displayDemoJobs() {
    displayJobSuggestions(getDemoJobs());
}

window.applyForJob = function(jobTitle, company) {
    showNotification(`Application process started for ${jobTitle} at ${company}`, 'info');
    addActivity(`Applied for ${jobTitle} at ${company}`);
};

window.generateCoverLetterForJob = function(jobTitle, company) {
    document.getElementById('coverJobTitle').value = jobTitle;
    document.getElementById('coverCompany').value = company;
    switchTab('cover');
    showNotification(`Ready to create cover letter for ${jobTitle}`, 'info');
};

// ==================== CAREER ROADMAP ====================

window.generateRoadmap = async function() {
    const targetPosition = document.getElementById('targetPosition')?.value.trim();
    const timeline = document.getElementById('timeline')?.value || 12;
    
    if (!targetPosition) {
        showNotification('Please enter a target position', 'error');
        return;
    }
    
    showModal('loadingModal', 'Creating Roadmap', 'AI is building your personalized career roadmap...');
    
    try {
        // Get current skills
        const currentSkills = userProfile.skills.length > 0 ? userProfile.skills : 
                             JSON.parse(localStorage.getItem('userSkills') || '[]');
        
        const prompt = `Create a career roadmap to become a ${targetPosition} in ${timeline} months.

CURRENT SKILLS: ${currentSkills.join(', ')}

Provide a JSON array of roadmap steps, each with:
{
    "month": 1,
    "title": "Step title",
    "description": "Detailed description",
    "skills_to_learn": ["skill1", "skill2"],
    "resources": ["resource1", "resource2"],
    "milestone": "What to achieve"
}

Create ${Math.min(timeline, 12)} steps, one for each major milestone month.`;

        const response = await callOpenRouterAPI(prompt, AI_MODELS.structured, true);
        const roadmap = safeJsonParse(response);
        
        displayRoadmap(Array.isArray(roadmap) ? roadmap : []);
        
        closeModal('loadingModal');
        showNotification('Career roadmap created!', 'success');
        addActivity(`Created roadmap for ${targetPosition}`);
        
    } catch (error) {
        console.error('Roadmap error:', error);
        closeModal('loadingModal');
        displayDemoRoadmap();
        showNotification('Showing sample roadmap', 'info');
    }
};

function displayRoadmap(steps) {
    const roadmapVisual = document.getElementById('roadmapVisual');
    const roadmapTimeline = document.getElementById('roadmapTimeline');
    
    if (!roadmapVisual || !roadmapTimeline) return;
    
    roadmapTimeline.innerHTML = '';
    
    const stepsToShow = Array.isArray(steps) && steps.length > 0 ? steps : getDemoRoadmap();
    
    stepsToShow.forEach(step => {
        const stepEl = document.createElement('div');
        stepEl.className = 'roadmap-step';
        stepEl.innerHTML = `
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
                <span style="background: #6a11cb; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-weight: bold;">
                    M${step.month || 1}
                </span>
                <h4 style="margin: 0; color: var(--light);">${escapeHtml(step.title || 'Step Title')}</h4>
            </div>
            <p style="color: #b0b0b0; margin-bottom: 10px;">${escapeHtml(step.description || 'Description')}</p>
            <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 15px;">
                <div style="flex: 1; min-width: 200px;">
                    <strong style="color: var(--light); font-size: 0.9rem;">Skills to Learn:</strong>
                    <div style="margin-top: 5px;">
                        ${(step.skills_to_learn || ['Skill 1', 'Skill 2']).map(skill => 
                            `<span class="skill-tag">${escapeHtml(skill)}</span>`
                        ).join('')}
                    </div>
                </div>
                <div style="flex: 1; min-width: 200px;">
                    <strong style="color: var(--light); font-size: 0.9rem;">Resources:</strong>
                    <ul style="color: #b0b0b0; font-size: 0.9rem; margin-top: 5px; padding-left: 20px;">
                        ${(step.resources || ['Resource 1', 'Resource 2']).map(resource => 
                            `<li>${escapeHtml(resource)}</li>`
                        ).join('')}
                    </ul>
                </div>
            </div>
            <div style="margin-top: 15px; padding: 10px; background: rgba(106, 17, 203, 0.1); border-radius: 5px;">
                <strong style="color: var(--accent);">Milestone:</strong>
                <span style="color: var(--text); margin-left: 10px;">${escapeHtml(step.milestone || 'Complete this step')}</span>
            </div>
        `;
        roadmapTimeline.appendChild(stepEl);
    });
    
    roadmapVisual.style.display = 'block';
    roadmapVisual.style.animation = 'fadeIn 0.5s ease';
    
    // Update roadmap progress
    const progressEl = document.getElementById('roadmapProgress');
    if (progressEl) {
        progressEl.textContent = '25%';
    }
}

function getDemoRoadmap() {
    return [
        {
            month: 1,
            title: "Learn Fundamentals",
            description: "Master core concepts and set up development environment.",
            skills_to_learn: ["JavaScript", "Git", "HTML/CSS"],
            resources: ["MDN Web Docs", "FreeCodeCamp", "YouTube tutorials"],
            milestone: "Build a basic portfolio website"
        },
        {
            month: 3,
            title: "Advanced Topics",
            description: "Dive deeper into frameworks and tools.",
            skills_to_learn: ["React", "Node.js", "Database Basics"],
            resources: ["React documentation", "Node.js courses", "SQL tutorials"],
            milestone: "Create a full-stack CRUD application"
        },
        {
            month: 6,
            title: "Real Projects",
            description: "Work on complex projects and collaborate with others.",
            skills_to_learn: ["TypeScript", "Testing", "Deployment"],
            resources: ["Open source projects", "GitHub collaboration", "Cloud platforms"],
            milestone: "Deploy a production-ready application"
        }
    ];
}

function displayDemoRoadmap() {
    displayRoadmap(getDemoRoadmap());
}

// ==================== SKILLS ANALYSIS ====================

window.loadSkillsAnalysis = async function() {
    showModal('loadingModal', 'Analyzing Skills', 'AI is analyzing your skills profile...');
    
    try {
        // Get user skills
        const userSkills = userProfile.skills.length > 0 ? userProfile.skills : 
                          JSON.parse(localStorage.getItem('userSkills') || '["JavaScript", "HTML", "CSS", "React"]');
        
        const targetRole = userProfile.targetRole || document.getElementById('targetRole')?.value || 'Software Developer';
        
        const prompt = `Analyze skills for becoming a ${targetRole}.

CURRENT SKILLS: ${userSkills.join(', ')}

Provide analysis as JSON:
{
    "current_skills_count": 8,
    "required_skills_count": 12,
    "skill_gap": 4,
    "current_skills": ["skill1", "skill2"],
    "missing_skills": ["skill3", "skill4"],
    "recommendations": ["rec1", "rec2", "rec3"]
}`;

        const response = await callOpenRouterAPI(prompt, AI_MODELS.structured, true);
        const analysis = safeJsonParse(response);
        
        displaySkillsAnalysis(analysis);
        
        closeModal('loadingModal');
        showNotification('Skills analysis complete!', 'success');
        
    } catch (error) {
        console.error('Skills analysis error:', error);
        closeModal('loadingModal');
        displayDemoSkillsAnalysis();
        showNotification('Showing sample skills analysis', 'info');
    }
};

function displaySkillsAnalysis(data) {
    // Update stats
    const currentSkillsEl = document.getElementById('currentSkills');
    const requiredSkillsEl = document.getElementById('requiredSkills');
    const skillGapEl = document.getElementById('skillGap');
    
    if (currentSkillsEl) currentSkillsEl.textContent = data.current_skills_count || userProfile.skills.length;
    if (requiredSkillsEl) requiredSkillsEl.textContent = data.required_skills_count || 12;
    if (skillGapEl) skillGapEl.textContent = data.skill_gap || 4;
    
    // Update skills lists
    updateSkillsList('currentSkillsList', data.current_skills || userProfile.skills.slice(0, 8));
    updateSkillsList('missingSkillsList', data.missing_skills || ['TypeScript', 'AWS', 'Docker', 'Testing']);
    
    // Update recommendations
    const recommendationsList = document.getElementById('recommendationsList');
    if (recommendationsList) {
        recommendationsList.innerHTML = '';
        const recommendations = data.recommendations || [
            "Take an online course on advanced JavaScript",
            "Build 2-3 projects using the missing skills",
            "Contribute to open source projects",
            "Practice algorithms on coding platforms"
        ];
        
        recommendations.forEach((rec, index) => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.innerHTML = `
                <div class="suggestion-number">${index + 1}</div>
                <div>
                    <strong>${escapeHtml(rec)}</strong>
                    <p style="color: #b0b0b0; margin-top: 5px; font-size: 0.9rem;">Complete within 30 days</p>
                </div>
            `;
            recommendationsList.appendChild(div);
        });
    }
    
    // Update dashboard
    const skillsLevelEl = document.getElementById('skillsLevel');
    if (skillsLevelEl) {
        const current = data.current_skills_count || userProfile.skills.length;
        const required = data.required_skills_count || 12;
        const level = Math.min(Math.floor((current / required) * 100), 100);
        skillsLevelEl.textContent = level + '%';
    }
}

function updateSkillsList(elementId, skills) {
    const list = document.getElementById(elementId);
    if (!list) return;
    
    list.innerHTML = '';
    
    skills.forEach(skill => {
        const div = document.createElement('div');
        div.className = 'skill-item';
        div.innerHTML = `
            <i class="fas fa-check" style="color: #10b981; margin-right: 10px;"></i>
            <span>${escapeHtml(skill)}</span>
        `;
        list.appendChild(div);
    });
}

function displayDemoSkillsAnalysis() {
    displaySkillsAnalysis({
        current_skills_count: userProfile.skills.length || 8,
        required_skills_count: 12,
        skill_gap: 4,
        current_skills: userProfile.skills.length > 0 ? userProfile.skills : ['JavaScript', 'HTML', 'CSS', 'React', 'Node.js', 'Git', 'REST APIs', 'MongoDB'],
        missing_skills: ['TypeScript', 'AWS', 'Docker', 'Testing', 'GraphQL', 'CI/CD'],
        recommendations: [
            "Complete a TypeScript course on Udemy",
            "Build a project using AWS services",
            "Learn Docker containerization",
            "Practice test-driven development"
        ]
    });
}

// ==================== DASHBOARD FUNCTIONS ====================

function updateDashboardStats(resumeAnalysis) {
    // Update resume score
    const resumeScoreEl = document.getElementById('resumeScore');
    if (resumeScoreEl && resumeAnalysis.overall_score) {
        resumeScoreEl.textContent = resumeAnalysis.overall_score;
        resumeScoreEl.style.animation = 'pulse 0.5s';
    }
    
    // Update last update time
    const lastUpdateEl = document.getElementById('lastResumeUpdate');
    if (lastUpdateEl) {
        lastUpdateEl.textContent = new Date().toLocaleDateString();
    }
    
    // Update job matches
    const jobMatchesEl = document.getElementById('jobMatches');
    if (jobMatchesEl) {
        const current = parseInt(jobMatchesEl.textContent) || 0;
        jobMatchesEl.textContent = current + Math.floor(Math.random() * 3) + 1;
    }
    
    // Update roadmap progress if we have data
    const roadmapProgressEl = document.getElementById('roadmapProgress');
    if (roadmapProgressEl && !roadmapProgressEl.textContent.includes('%')) {
        roadmapProgressEl.textContent = '25%';
    }
    
    addActivity('Resume analyzed and dashboard updated');
}

function addActivity(message) {
    const activityList = document.getElementById('activityList');
    if (!activityList) return;
    
    const activityItem = document.createElement('div');
    activityItem.className = 'activity-item';
    activityItem.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <div>
            <strong>${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</strong>
            <p>${escapeHtml(message)}</p>
        </div>
    `;
    
    activityItem.style.animation = 'slideUp 0.3s ease';
    activityList.insertBefore(activityItem, activityList.firstChild);
    
    // Keep only last 5 activities
    if (activityList.children.length > 5) {
        activityList.removeChild(activityList.lastChild);
    }
}

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', function() {
    console.log('Career Assistant Initializing...');
    
    // Load user data
    loadUserData();
    
    // Initialize components
    initResumeUpload();
    initResumeBuilder();
    
    // Setup tab switching
    setupTabSwitching();
    
    // Setup logout
    setupLogout();
    
    // Load demo data for empty state
    loadDemoData();
    
    // Initialize charts when tab is activated
    initializeCharts();
    
    console.log('Career Assistant Initialized Successfully');
    
    // Auto-load jobs when jobs tab is opened
    document.querySelector('.sidebar-item[data-tab="jobs"]').addEventListener('click', () => {
        setTimeout(() => {
            if (document.getElementById('jobList').children.length === 0) {
                loadJobSuggestions();
            }
        }, 500);
    });
    
    // Auto-load skills analysis when skills tab is opened
    document.querySelector('.sidebar-item[data-tab="skills"]').addEventListener('click', () => {
        setTimeout(() => {
            if (document.getElementById('currentSkillsList').children.length === 0) {
                loadSkillsAnalysis();
            }
        }, 500);
    });
});

function loadUserData() {
    try {
        const user = localStorage.getItem('user') || localStorage.getItem('currentUser');
        if (user) {
            const userData = JSON.parse(user);
            const userNameEl = document.getElementById('userName');
            const userAvatarEl = document.getElementById('userAvatar');
            
            if (userNameEl) userNameEl.textContent = userData.name || userData.username || 'User';
            if (userAvatarEl) userAvatarEl.textContent = (userData.name || userData.username || 'U').charAt(0).toUpperCase();
            
            userProfile.name = userData.name || userData.username || '';
            userProfile.targetRole = userData.title || 'Software Developer';
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

function setupTabSwitching() {
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = item.getAttribute('data-tab');
            
            // Hide all tabs
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Show selected tab
            const targetTab = document.getElementById(tabId);
            if (targetTab) {
                targetTab.classList.add('active');
            }
            
            // Update sidebar
            document.querySelectorAll('.sidebar-item').forEach(i => {
                i.classList.remove('active');
            });
            item.classList.add('active');
            
            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
}

function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'interface.html';
        });
    }
}

function loadDemoData() {
    // Add initial activities
    setTimeout(() => {
        addActivity('Welcome to AI Career Assistant!');
        addActivity('Get started by uploading your resume or using the AI Resume Builder');
    }, 1000);
}

// Make switchTab globally available
window.switchTab = function(tabId) {
    const tab = document.getElementById(tabId);
    if (tab) {
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(t => {
            t.classList.remove('active');
        });
        
        // Show selected tab
        tab.classList.add('active');
        
        // Update sidebar
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.classList.remove('active');
        });
        const sidebarItem = document.querySelector(`.sidebar-item[data-tab="${tabId}"]`);
        if (sidebarItem) {
            sidebarItem.classList.add('active');
        }
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

// Initialize charts
function initializeCharts() {
    // Skills Chart
    const skillsCtx = document.getElementById('skillsChart');
    if (skillsCtx) {
        new Chart(skillsCtx.getContext('2d'), {
            type: 'radar',
            data: {
                labels: ['Technical', 'Communication', 'Leadership', 'Problem Solving', 'Creativity', 'Teamwork'],
                datasets: [{
                    label: 'Your Skills',
                    data: [85, 70, 60, 90, 75, 80],
                    backgroundColor: 'rgba(106, 17, 203, 0.2)',
                    borderColor: 'rgba(106, 17, 203, 1)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgba(106, 17, 203, 1)'
                }]
            },
            options: {
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            display: false
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
    }
    
    // Progress Chart
    const progressCtx = document.getElementById('progressChart');
    if (progressCtx) {
        new Chart(progressCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Progress',
                    data: [20, 35, 45, 60, 70, 85],
                    borderColor: 'rgba(106, 17, 203, 1)',
                    backgroundColor: 'rgba(106, 17, 203, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes slideUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
    }
    
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    .fade-in {
        animation: fadeIn 0.3s ease forwards;
    }
    
    .skill-item {
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 6px;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
    }
    
    .suggestion-item {
        display: flex;
        align-items: flex-start;
        gap: 15px;
        padding: 15px;
        background: rgba(59, 130, 246, 0.1);
        border-radius: 8px;
        margin-bottom: 10px;
        border-left: 3px solid #6a11cb;
    }
    
    .suggestion-number {
        background: #6a11cb;
        color: white;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        flex-shrink: 0;
    }
`;
document.head.appendChild(style);
