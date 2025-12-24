// Configuration - IMPORTANT: Use your OpenRouter API key
const API_KEY = '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';

// Available career fields
const careerFields = [
    { id: 'data-science', name: 'Data Science', icon: 'fas fa-database', color: '#3B82F6' },
    { id: 'ai-ml', name: 'AI & Machine Learning', icon: 'fas fa-brain', color: '#8B5CF6' },
    { id: 'web-dev', name: 'Web Development', icon: 'fas fa-code', color: '#10B981' },
    { id: 'mobile-dev', name: 'Mobile Development', icon: 'fas fa-mobile-alt', color: '#F59E0B' },
    { id: 'cloud-devops', name: 'Cloud & DevOps', icon: 'fas fa-cloud', color: '#6366F1' },
    { id: 'cybersecurity', name: 'Cybersecurity', icon: 'fas fa-shield-alt', color: '#EF4444' },
    { id: 'data-engineering', name: 'Data Engineering', icon: 'fas fa-server', color: '#06B6D4' },
    { id: 'business-analytics', name: 'Business Analytics', icon: 'fas fa-chart-bar', color: '#8B5CF6' },
    { id: 'ux-ui', name: 'UX/UI Design', icon: 'fas fa-paint-brush', color: '#EC4899' },
    { id: 'digital-marketing', name: 'Digital Marketing', icon: 'fas fa-bullhorn', color: '#F59E0B' }
];

// DOM Elements
const form = document.getElementById('careerForm');
const fieldGrid = document.getElementById('fieldGrid');
const skillInput = document.getElementById('skill-input');
const selectedSkills = document.getElementById('selectedSkills');
const expButtons = document.querySelectorAll('.exp-btn');
const generateBtn = document.getElementById('generateBtn');
const resultsSection = document.getElementById('results');
const cardsGrid = document.getElementById('cardsGrid');
const userProfile = document.getElementById('userProfile');
const loadingState = document.getElementById('loadingState');

// State
let selectedField = null;
let selectedExperience = 'beginner';
let skills = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeFieldGrid();
    initializeEventListeners();
    addExampleSkills();
});

// Initialize field selection grid
function initializeFieldGrid() {
    fieldGrid.innerHTML = careerFields.map(field => `
        <div class="field-option" data-field="${field.id}">
            <i class="${field.icon} field-icon" style="color: ${field.color}"></i>
            <span class="field-name">${field.name}</span>
        </div>
    `).join('');
    
    // Add click event to field options
    document.querySelectorAll('.field-option').forEach(option => {
        option.addEventListener('click', () => {
            // Remove selected class from all options
            document.querySelectorAll('.field-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            
            // Add selected class to clicked option
            option.classList.add('selected');
            selectedField = option.dataset.field;
        });
    });
    
    // Select first field by default
    if (careerFields.length > 0) {
        const firstOption = document.querySelector('.field-option');
        firstOption.classList.add('selected');
        selectedField = careerFields[0].id;
    }
}

// Initialize event listeners
function initializeEventListeners() {
    // Experience level buttons
    expButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            expButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedExperience = btn.dataset.level;
        });
    });
    
    // Skill input - Add on Enter key
    skillInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addSkill();
        }
    });
    
    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            alert('Please fill in all required fields');
            return;
        }
        
        await generateCareerRoadmap();
    });
}

// Add example skills for testing
function addExampleSkills() {
    const exampleSkills = ['Python', 'Pandas', 'NumPy'];
    exampleSkills.forEach(skill => {
        skills.push(skill);
        updateSelectedSkillsDisplay();
    });
}

// Add skill from input
function addSkill() {
    const skill = skillInput.value.trim();
    
    if (skill && !skills.includes(skill)) {
        skills.push(skill);
        updateSelectedSkillsDisplay();
        skillInput.value = '';
    }
}

// Remove skill
function removeSkill(index) {
    skills.splice(index, 1);
    updateSelectedSkillsDisplay();
}

// Update selected skills display
function updateSelectedSkillsDisplay() {
    selectedSkills.innerHTML = skills.map((skill, index) => `
        <div class="skill-tag fade-in">
            <i class="fas fa-tag"></i>
            ${skill}
            <span class="remove" onclick="removeSkill(${index})">
                <i class="fas fa-times"></i>
            </span>
        </div>
    `).join('');
}

// Validate form
function validateForm() {
    const name = document.getElementById('name').value.trim();
    return name && selectedField && skills.length > 0;
}

// Generate career roadmap using AI
async function generateCareerRoadmap() {
    // Get form data
    const name = document.getElementById('name').value.trim();
    const currentSkills = skills.join(', ');
    
    // Show loading state
    showLoadingState();
    
    try {
        // Call AI API to generate career data
        const careerData = await callCareerAI(name, selectedField, currentSkills, selectedExperience);
        
        // Update user profile
        updateUserProfile(name, selectedField, selectedExperience);
        
        // Generate and display cards
        generateCards(careerData);
        
        // Show results
        showResults();
        
    } catch (error) {
        console.error('Error generating career roadmap:', error);
        // Fallback to mock data if API fails
        const mockData = generateMockData(name, selectedField, skills, selectedExperience);
        updateUserProfile(name, selectedField, selectedExperience);
        generateCards(mockData);
        showResults();
    }
}

// Call AI API to generate career data
async function callCareerAI(name, field, currentSkills, experience) {
    // Construct the prompt for AI
    const prompt = `You are an expert career advisor. Generate a personalized career roadmap in JSON format.

USER PROFILE:
- Name: ${name}
- Target Field: ${getFieldName(field)}
- Current Skills: ${currentSkills}
- Experience Level: ${experience}

GENERATE RESPONSE IN THIS EXACT JSON FORMAT:
{
    "current_skills": ["skill1", "skill2", "skill3", "skill4", "skill5", "skill6", "skill7", "skill8", "skill9", "skill10"],
    "skills_to_learn": ["skill1", "skill2", "skill3", "skill4", "skill5", "skill6", "skill7", "skill8", "skill9", "skill10"],
    "target_companies": ["Company1", "Company2", "Company3", "Company4", "Company5", "Company6", "Company7", "Company8", "Company9", "Company10"],
    "career_roles": ["Role1", "Role2", "Role3", "Role4", "Role5", "Role6", "Role7", "Role8", "Role9", "Role10"],
    "timeline": [
        {"period": "Month 1-3", "tasks": ["Task1", "Task2", "Task3"]},
        {"period": "Month 4-6", "tasks": ["Task1", "Task2", "Task3"]},
        {"period": "Month 7-12", "tasks": ["Task1", "Task2", "Task3"]},
        {"period": "Year 2", "tasks": ["Task1", "Task2", "Task3"]}
    ]
}

RULES:
- Return EXACTLY 10 items for each array (current_skills, skills_to_learn, target_companies, career_roles)
- Make skills specific to ${getFieldName(field)} field
- Include both technical and soft skills
- Companies should be real companies hiring in this field
- Career roles should be specific positions in this field
- Timeline tasks should be actionable steps`;

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.origin,
                'X-Title': 'Career AI Roadmap'
            },
            body: JSON.stringify({
                model: 'google/gemma-2-9b-it:free',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a career advisor. Always respond with valid JSON in the exact format requested.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 2000,
                temperature: 0.7,
                response_format: { type: 'json_object' }
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const aiResponse = data.choices[0]?.message?.content;
        
        // Parse JSON response
        const parsedData = JSON.parse(aiResponse);
        
        // Validate data structure
        return validateCareerData(parsedData, field);
        
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Get field name from ID
function getFieldName(fieldId) {
    const field = careerFields.find(f => f.id === fieldId);
    return field ? field.name : fieldId;
}

// Validate and enhance career data
function validateCareerData(data, field) {
    // Ensure we have 10 items in each array
    const defaultData = generateFieldSpecificData(field);
    
    return {
        current_skills: data.current_skills?.slice(0, 10) || defaultData.current_skills,
        skills_to_learn: data.skills_to_learn?.slice(0, 10) || defaultData.skills_to_learn,
        target_companies: data.target_companies?.slice(0, 10) || defaultData.target_companies,
        career_roles: data.career_roles?.slice(0, 10) || defaultData.career_roles,
        timeline: data.timeline || defaultData.timeline
    };
}

// Generate field-specific data (fallback)
function generateFieldSpecificData(field) {
    const data = {
        current_skills: [],
        skills_to_learn: [],
        target_companies: [],
        career_roles: [],
        timeline: [
            {
                period: "Month 1-3: Foundation",
                tasks: ["Master core concepts", "Build 2-3 projects", "Join communities"]
            },
            {
                period: "Month 4-6: Skill Building",
                tasks: ["Learn intermediate skills", "Network professionally", "Update portfolio"]
            },
            {
                period: "Month 7-12: Specialization",
                tasks: ["Choose specialization", "Build complex projects", "Prepare for interviews"]
            },
            {
                period: "Year 2: Career Growth",
                tasks: ["Get certified", "Mentor others", "Lead projects"]
            }
        ]
    };
    
    // Field-specific data
    switch(field) {
        case 'data-science':
            data.current_skills = ['Python', 'Pandas', 'NumPy', 'SQL', 'Excel', 'Statistics', 'Data Cleaning', 'EDA', 'Visualization', 'Jupyter'];
            data.skills_to_learn = ['Machine Learning', 'Deep Learning', 'NLP', 'Big Data', 'Spark', 'TensorFlow', 'PyTorch', 'MLOps', 'Cloud Platforms', 'A/B Testing'];
            data.target_companies = ['Google', 'Amazon', 'Meta', 'Microsoft', 'IBM', 'Netflix', 'Uber', 'Airbnb', 'Spotify', 'LinkedIn'];
            data.career_roles = ['Data Scientist', 'ML Engineer', 'Data Analyst', 'AI Researcher', 'BI Developer', 'Data Engineer', 'Quant Analyst', 'Business Analyst', 'Research Scientist', 'Data Product Manager'];
            break;
            
        case 'ai-ml':
            data.current_skills = ['Python', 'Linear Algebra', 'Calculus', 'Statistics', 'Pandas', 'NumPy', 'Scikit-learn', 'Jupyter', 'Git', 'Basic ML'];
            data.skills_to_learn = ['Deep Learning', 'Neural Networks', 'Computer Vision', 'NLP', 'Transformers', 'PyTorch', 'TensorFlow', 'MLOps', 'Reinforcement Learning', 'Cloud AI'];
            data.target_companies = ['OpenAI', 'DeepMind', 'NVIDIA', 'Tesla', 'Apple', 'Google Brain', 'Microsoft Research', 'Meta AI', 'Amazon AWS AI', 'IBM Watson'];
            data.career_roles = ['AI Engineer', 'ML Engineer', 'Computer Vision Engineer', 'NLP Engineer', 'AI Researcher', 'ML Ops Engineer', 'AI Product Manager', 'Robotics Engineer', 'AI Consultant', 'Research Scientist'];
            break;
            
        case 'web-dev':
            data.current_skills = ['HTML', 'CSS', 'JavaScript', 'React', 'Node.js', 'Git', 'REST APIs', 'Bootstrap', 'Responsive Design', 'Debugging'];
            data.skills_to_learn = ['TypeScript', 'Next.js', 'GraphQL', 'WebSockets', 'Testing', 'DevOps', 'Cloud Deployment', 'Microservices', 'Performance Opt', 'Security'];
            data.target_companies = ['Netflix', 'Airbnb', 'Shopify', 'Spotify', 'Uber', 'Twitter', 'Discord', 'Notion', 'Figma', 'Vercel'];
            data.career_roles = ['Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'DevOps Engineer', 'UX Engineer', 'Web Performance', 'Technical Lead', 'Solutions Architect', 'API Developer', 'E-commerce Developer'];
            break;
            
        default:
            // Generic tech field data
            data.current_skills = skills.slice(0, 10);
            data.skills_to_learn = ['Advanced Programming', 'System Design', 'Cloud Computing', 'Containerization', 'CI/CD', 'Security', 'Testing', 'Performance', 'Architecture', 'Leadership'];
            data.target_companies = ['Google', 'Microsoft', 'Amazon', 'Apple', 'Meta', 'Netflix', 'Uber', 'Airbnb', 'Spotify', 'Salesforce'];
            data.career_roles = ['Software Engineer', 'Tech Lead', 'Architect', 'Engineering Manager', 'Product Manager', 'CTO', 'Consultant', 'Freelancer', 'Startup Founder', 'Technical Writer'];
    }
    
    return data;
}

// Generate mock data for fallback
function generateMockData(name, field, skills, experience) {
    return generateFieldSpecificData(field);
}

// Update user profile display
function updateUserProfile(name, field, experience) {
    const fieldName = getFieldName(field);
    
    userProfile.innerHTML = `
        <div class="profile-item">
            <i class="fas fa-user"></i>
            <span>${name}</span>
        </div>
        <div class="profile-item">
            <i class="fas fa-bullseye"></i>
            <span>${fieldName}</span>
        </div>
        <div class="profile-item">
            <i class="fas fa-chart-line"></i>
            <span>${experience.charAt(0).toUpperCase() + experience.slice(1)} Level</span>
        </div>
        <div class="profile-item">
            <i class="fas fa-code"></i>
            <span>${skills.length} Skills</span>
        </div>
    `;
}

// Generate and display cards
function generateCards(careerData) {
    cardsGrid.innerHTML = '';
    
    // Card 1: Current Skills
    cardsGrid.appendChild(createSkillCard(
        'Current Skills',
        'Skills you already have',
        'fas fa-check-circle',
        '#10B981',
        careerData.current_skills,
        'current'
    ));
    
    // Card 2: Skills to Learn
    cardsGrid.appendChild(createSkillCard(
        'Skills to Learn',
        'Top 10 skills to master',
        'fas fa-graduation-cap',
        '#F59E0B',
        careerData.skills_to_learn,
        'learn'
    ));
    
    // Card 3: Target Companies
    cardsGrid.appendChild(createCompanyCard(
        'Target Companies',
        'Top companies hiring in this field',
        'fas fa-building',
        '#3B82F6',
        careerData.target_companies
    ));
    
    // Card 4: Career Roles
    cardsGrid.appendChild(createRoleCard(
        'Career Roles',
        'Potential job positions',
        'fas fa-briefcase',
        '#8B5CF6',
        careerData.career_roles
    ));
    
    // Card 5: Timeline
    cardsGrid.appendChild(createTimelineCard(
        'Learning Timeline',
        `${selectedExperience.charAt(0).toUpperCase() + selectedExperience.slice(1)} level roadmap`,
        'fas fa-road',
        '#EC4899',
        careerData.timeline
    ));
}

// Create skill card
function createSkillCard(title, subtitle, icon, color, skills, type) {
    const card = document.createElement('div');
    card.className = 'card fade-in';
    card.style.animationDelay = '0.1s';
    
    card.innerHTML = `
        <div class="card-header">
            <div class="card-icon" style="background: ${color}">
                <i class="${icon}"></i>
            </div>
            <div class="card-title">
                <h3>${title}</h3>
                <p>${subtitle}</p>
            </div>
        </div>
        <div class="card-body">
            <div class="skills-grid">
                ${skills.map((skill, index) => `
                    <div class="skill-item ${type}">
                        <i class="fas fa-${type === 'current' ? 'check' : 'arrow-right'}"></i>
                        <span>${skill}</span>
                    </div>
                `).slice(0, 10).join('')}
            </div>
        </div>
        <div class="card-footer">
            <div class="card-stats">
                <div class="stat">
                    <i class="fas fa-list-check"></i>
                    <span>${skills.length} skills</span>
                </div>
                <div class="stat">
                    <i class="fas fa-clock"></i>
                    <span>Priority list</span>
                </div>
            </div>
            <button class="btn-nav" style="padding: 8px 16px; font-size: 0.9rem;">
                <i class="fas fa-download"></i> Save
            </button>
        </div>
    `;
    
    return card;
}

// Create company card
function createCompanyCard(title, subtitle, icon, color, companies) {
    const card = document.createElement('div');
    card.className = 'card fade-in';
    card.style.animationDelay = '0.2s';
    
    card.innerHTML = `
        <div class="card-header">
            <div class="card-icon" style="background: ${color}">
                <i class="${icon}"></i>
            </div>
            <div class="card-title">
                <h3>${title}</h3>
                <p>${subtitle}</p>
            </div>
        </div>
        <div class="card-body">
            <div class="companies-list">
                ${companies.map((company, index) => `
                    <div class="company-item">
                        <div class="company-icon">
                            <i class="fas fa-briefcase"></i>
                        </div>
                        <div class="company-info">
                            <h4>${company}</h4>
                            <p>Hiring for ${getFieldName(selectedField)} roles</p>
                        </div>
                        <i class="fas fa-chevron-right" style="color: var(--gray);"></i>
                    </div>
                `).slice(0, 10).join('')}
            </div>
        </div>
        <div class="card-footer">
            <div class="card-stats">
                <div class="stat">
                    <i class="fas fa-building"></i>
                    <span>${companies.length} companies</span>
                </div>
                <div class="stat">
                    <i class="fas fa-globe"></i>
                    <span>Global opportunities</span>
                </div>
            </div>
            <button class="btn-nav" style="padding: 8px 16px; font-size: 0.9rem;">
                <i class="fas fa-external-link-alt"></i> Apply
            </button>
        </div>
    `;
    
    return card;
}

// Create role card
function createRoleCard(title, subtitle, icon, color, roles) {
    const card = document.createElement('div');
    card.className = 'card fade-in';
    card.style.animationDelay = '0.3s';
    
    card.innerHTML = `
        <div class="card-header">
            <div class="card-icon" style="background: ${color}">
                <i class="${icon}"></i>
            </div>
            <div class="card-title">
                <h3>${title}</h3>
                <p>${subtitle}</p>
            </div>
        </div>
        <div class="card-body">
            <div class="roles-list">
                ${roles.map((role, index) => `
                    <div class="role-item">
                        <div class="role-icon">
                            <i class="fas fa-user-tie"></i>
                        </div>
                        <div class="role-info">
                            <h4>${role}</h4>
                            <p>Average salary: $${(80 + Math.random() * 70).toFixed(0)}k</p>
                        </div>
                    </div>
                `).slice(0, 10).join('')}
            </div>
        </div>
        <div class="card-footer">
            <div class="card-stats">
                <div class="stat">
                    <i class="fas fa-users"></i>
                    <span>${roles.length} roles</span>
                </div>
                <div class="stat">
                    <i class="fas fa-money-bill-wave"></i>
                    <span>High demand</span>
                </div>
            </div>
            <button class="btn-nav" style="padding: 8px 16px; font-size: 0.9rem;">
                <i class="fas fa-search"></i> Explore
            </button>
        </div>
    `;
    
    return card;
}

// Create timeline card
function createTimelineCard(title, subtitle, icon, color, timeline) {
    const card = document.createElement('div');
    card.className = 'card fade-in';
    card.style.animationDelay = '0.4s';
    
    card.innerHTML = `
        <div class="card-header">
            <div class="card-icon" style="background: ${color}">
                <i class="${icon}"></i>
            </div>
            <div class="card-title">
                <h3>${title}</h3>
                <p>${subtitle}</p>
            </div>
        </div>
        <div class="card-body">
            <div class="timeline">
                ${timeline.map((item, index) => `
                    <div class="timeline-item">
                        <div class="timeline-period">${item.period}</div>
                        <ul class="timeline-tasks">
                            ${item.tasks.map(task => `<li>${task}</li>`).join('')}
                        </ul>
                    </div>
                `).join('')}
            </div>
        </div>
        <div class="card-footer">
            <div class="card-stats">
                <div class="stat">
                    <i class="fas fa-calendar-alt"></i>
                    <span>${timeline.length} phases</span>
                </div>
                <div class="stat">
                    <i class="fas fa-hourglass-half"></i>
                    <span>2 year plan</span>
                </div>
            </div>
            <button class="btn-nav" style="padding: 8px 16px; font-size: 0.9rem;">
                <i class="fas fa-calendar-plus"></i> Schedule
            </button>
        </div>
    `;
    
    return card;
}

// Show loading state
function showLoadingState() {
    loadingState.style.display = 'block';
    resultsSection.style.display = 'none';
    
    // Animate loading steps
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
    }, 800);
}

// Show results
function showResults() {
    loadingState.style.display = 'none';
    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

// Reset form
function resetForm() {
    form.reset();
    skills = [];
    updateSelectedSkillsDisplay();
    resultsSection.style.display = 'none';
    
    // Reset to default selections
    document.querySelectorAll('.field-option').forEach((opt, index) => {
        opt.classList.remove('selected');
        if (index === 0) {
            opt.classList.add('selected');
            selectedField = careerFields[0].id;
        }
    });
    
    document.querySelectorAll('.exp-btn').forEach((btn, index) => {
        btn.classList.remove('active');
        if (index === 0) {
            btn.classList.add('active');
            selectedExperience = 'beginner';
        }
    });
    
    addExampleSkills();
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}