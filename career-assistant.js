// 1. Configuration
const API_KEY = "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"; 
const API_URL = "https://openrouter.ai/api/v1/chat/completions";

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';
let extractedResumeText = "";

function cleanAI(text) {
    if (!text) return "";
    return text.replace(/<\/?[^>]+(>|$)/g, "").replace(/\[INST\]/g, "").replace(/\[\/INST\]/g, "").trim();
}

// 2. Tab Switching
document.querySelectorAll('.sidebar-item').forEach(item => {
    item.addEventListener('click', () => {
        const tabId = item.getAttribute('data-tab');
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.sidebar-item').forEach(s => s.classList.remove('active'));
        document.getElementById(tabId).classList.add('active');
        item.classList.add('active');
    });
});

// 3. PDF Uploads
document.getElementById('resumeFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = async function() {
            try {
                const typedarray = new Uint8Array(this.result);
                const pdf = await pdfjsLib.getDocument(typedarray).promise;
                let text = "";
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const content = await page.getTextContent();
                    text += content.items.map(item => item.str).join(" ");
                }
                extractedResumeText = text;
                alert("✅ Resume read successfully!");
            } catch (err) { alert("❌ PDF Error!"); }
        };
        reader.readAsArrayBuffer(file);
    }
});

// 4. Resume Analysis
async function runResumeAnalysis() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    const resultBox = document.getElementById('analysisResult');
    const resultTextElement = document.getElementById('analysisText');
    const dashboardScore = document.getElementById('lastAtsScore');

    if (!extractedResumeText) return alert("Pehle Resume PDF upload karein!");

    analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
    analyzeBtn.disabled = true;
    resultBox.style.display = "block";
    resultTextElement.innerHTML = "AI Analysis chal raha hai...";

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:5500",
                "X-Title": "Career AI Assistant"
            },
            body: JSON.stringify({
                "model": "mistralai/mistral-7b-instruct:free",
                "messages": [{ 
                    "role": "user", 
                    "content": `Analyze this resume for ATS. Provide a score: "ATS Score: X/100" and 3 tips. Resume: ${extractedResumeText}` 
                }]
            })
        });

        const data = await response.json();
        if (data?.choices?.[0]) {
            const finalResult = cleanAI(data.choices[0].message.content);
            resultTextElement.innerText = finalResult;
            const scoreMatch = finalResult.match(/(\d+)(?:\/100|%)/);
            if (scoreMatch && dashboardScore) dashboardScore.innerText = scoreMatch[1] + "%";
        }
    } catch (error) {
        resultTextElement.innerText = "Error: " + error.message;
    } finally {
        analyzeBtn.innerHTML = '<i class="fas fa-search"></i> Analyze Resume';
        analyzeBtn.disabled = false;
    }
}

// 5. Mock Interview Questions
async function generateMockQuestions() {
    const container = document.getElementById('interviewResult');
    if (!extractedResumeText) return alert("Pehle Resume upload karein!");

    container.style.display = "block";
    container.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> Generating Questions...</p>';

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Authorization": `Bearer ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                "model": "mistralai/mistral-7b-instruct:free",
                "messages": [{ "role": "user", "content": `Generate 5 interview questions for this resume: ${extractedResumeText}` }]
            })
        });
        const data = await response.json();
        if (data?.choices?.[0]) {
            container.innerHTML = `<div style="white-space: pre-wrap;">${cleanAI(data.choices[0].message.content)}</div>`;
        }
    } catch (error) { container.innerHTML = "Error loading questions."; }
}

// 6. Cover Letter Generator
async function generateCoverLetter() {
    const container = document.getElementById('coverPreview');
    const content = document.getElementById('coverLetterContent');
    const jd = document.querySelector('textarea').value;

    if (!extractedResumeText) return alert("Pehle Resume upload karein!");
    if (!jd) return alert("Pehle Job Description daalein!");

    container.style.display = "block";
    content.innerHTML = "AI Writing your cover letter...";

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Authorization": `Bearer ${API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                "model": "mistralai/mistral-7b-instruct:free",
                "messages": [{ "role": "user", "content": `Write a professional cover letter for this JD: ${jd}. Using this resume: ${extractedResumeText}` }]
            })
        });
        const data = await response.json();
        if (data?.choices?.[0]) {
            content.innerHTML = cleanAI(data.choices[0].message.content);
        }
    } catch (error) { content.innerHTML = "Error generating letter."; }
}