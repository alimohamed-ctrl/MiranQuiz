const SCENARIO_API = "https://script.google.com/macros/s/AKfycbxiIoAgbzsfWSc3lCwTW9Dv-TPKyvz0VbYh8fWc_iJPpXL5R9wp3pXpeWExQLvIhqOy4w/exec?type=training";
let allScenarios = [];
let currentScenario = null;
let currentNodeId = "start";
let nextTargetNodeId = ""; 
let trustScore = 100;
let conversationStep = 1;

document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('theme') === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.getElementById('themeBtn').innerText = "☀️ الوضع المضيء";
    }
    fetchScenariosFromPool();
});

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const themeBtn = document.getElementById('themeBtn');
    if (currentTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'light');
        themeBtn.innerText = "🌙 الوضع الليلي";
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeBtn.innerText = "☀️ الوضع المضيء";
    }
}

async function fetchScenariosFromPool() {
    try {
        const response = await fetch(SCENARIO_API);
        allScenarios = await response.json();
        if(allScenarios.length === 0) {
            document.getElementById('loading-overlay').innerText = "⚠️ بنك السيناريوهات التدريبية فارغ حالياً بملف الإدارة!";
            return;
        }
        currentScenario = allScenarios[Math.floor(Math.random() * allScenarios.length)];
        document.getElementById('loading-overlay').style.display = 'none';
        document.getElementById('simulator-content').style.display = 'block';
        renderCurrentDialogueNode();
    } catch (error) { console.error(error); }
}

function renderCurrentDialogueNode() {
    const node = currentScenario.nodes[currentNodeId];
    document.getElementById('customerSpeechText').innerText = node.customerSpeech;
    document.getElementById('feedbackBox').style.display = 'none';
    document.getElementById('actionArea').style.display = 'none';
    
    const container = document.getElementById('choicesContainer');
    container.innerHTML = "";
    node.choices.forEach((choice) => {
        if (choice.text && choice.text.trim() !== "") {
            const btn = document.createElement('button'); btn.className = "choice-btn";
            btn.innerText = choice.text; btn.onclick = () => handleChoiceSelection(choice);
            container.appendChild(btn);
        }
    });
    document.getElementById('dealStepVal').innerText = `${conversationStep} / 4`;
}

function handleChoiceSelection(choice) {
    document.querySelectorAll('.choice-btn').forEach(btn => btn.disabled = true);
    nextTargetNodeId = choice.nextNode;
    const feedbackBox = document.getElementById('feedbackBox');
    feedbackBox.style.display = 'block'; feedbackBox.innerText = choice.feedback;
    
    if (nextTargetNodeId === "success") {
        trustScore = Math.min(100, trustScore + 10);
        feedbackBox.style.background = "rgba(34, 197, 94, 0.12)"; feedbackBox.style.color = "var(--success)";
        feedbackBox.innerHTML = `🏆 <strong>رائع جداً! نجحت في إغلاق الصفقة (Deal Closed):</strong><br>` + choice.feedback;
        setupEndGameButton("إغلاق المحاكاة والعودة للرئيسية");
    } else if (nextTargetNodeId === "fail") {
        trustScore = Math.max(0, trustScore - 30);
        feedbackBox.style.background = "rgba(239, 68, 68, 0.12)"; feedbackBox.style.color = "var(--danger)";
        feedbackBox.innerHTML = `❌ <strong>للأسف هرب العميل وضاعت الصفقة (Deal Lost):</strong><br>` + choice.feedback;
        setupEndGameButton("إعادة محاولة سيناريو تفاعلي جديد 🔄");
    } else {
        if(choice.feedback.includes("أحسنت") || choice.feedback.includes("ممتاز") || choice.feedback.includes("صحيح")) {
            feedbackBox.style.background = "rgba(34, 197, 94, 0.08)"; feedbackBox.style.color = "var(--success)";
            trustScore = Math.min(100, trustScore + 5);
        } else {
            feedbackBox.style.background = "rgba(239, 68, 68, 0.06)"; trustScore = Math.max(10, trustScore - 15);
        }
        document.getElementById('actionArea').style.display = 'block';
    }
    document.getElementById('trustVal').innerText = `${trustScore}%`;
}

function proceedToNextNode() { currentNodeId = nextTargetNodeId; conversationStep++; renderCurrentDialogueNode(); }

function setupEndGameButton(btnText) {
    const actionArea = document.getElementById('actionArea'); actionArea.style.display = 'block';
    const actionBtn = actionArea.querySelector('button'); actionBtn.innerText = btnText;
    actionBtn.onclick = () => {
        if (nextTargetNodeId === "success") { window.location.href = "index.html"; } 
        else {
            currentNodeId = "start"; nextTargetNodeId = ""; trustScore = 100; conversationStep = 1;
            document.getElementById('trustVal').innerText = "100%";
            document.getElementById('simulator-content').style.display = 'none';
            document.getElementById('loading-overlay').style.display = 'block';
            fetchScenariosFromPool();
        }
    };
}
