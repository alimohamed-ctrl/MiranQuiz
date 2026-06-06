// نقوم بإضافة وسم التمييز type=training لجلب حزمة السيناريوهات بدلاً من الامتحانات
const SCENARIO_API = "[https://script.google.com/macros/s/AKfycbxiIoAgbzsfWSc3lCwTW9Dv-TPKyvz0VbYh8fWc_iJPpXL5R9wp3pXpeWExQLvIhqOy4w/exec?type=training](https://script.google.com/macros/s/AKfycbxiIoAgbzsfWSc3lCwTW9Dv-TPKyvz0VbYh8fWc_iJPpXL5R9wp3pXpeWExQLvIhqOy4w/exec?type=training)";

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
        localStorage.setItem('theme', 'light');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeBtn.innerText = "☀️ الوضع Mضيء";
        localStorage.setItem('theme', 'dark');
    }
}

// 1. جلب مكتبة السيناريوهات بالكامل واختيار سيناريو عشوائي تفاعلي
async function fetchScenariosFromPool() {
    try {
        const response = await fetch(SCENARIO_API);
        allScenarios = await response.json();
        
        if(allScenarios.length === 0) {
            document.getElementById('loading-overlay').innerText = "⚠️ بنك السيناريوهات التدريبية فارغ حالياً بملف الإدارة!";
            return;
        }
        
        // التقاط سيناريو واحد بشكل عشوائي تماماً في كل مرة يفتح فيها الموظف الموقع
        currentScenario = allScenarios[Math.floor(Math.random() * allScenarios.length)];
        
        document.getElementById('loading-overlay').style.display = 'none';
        document.getElementById('simulator-content').style.display = 'block';
        
        renderCurrentDialogueNode();
    } catch (error) {
        document.getElementById('loading-overlay').innerText = "❌ فشل سحب السيناريوهات، تحقق من إعدادات الـ Deploy بشيت جوجل.";
        console.error(error);
    }
}

// 2. معالجة وعرض عقدة الحوار الحالية من شجرة الخيارات
function renderCurrentDialogueNode() {
    const node = currentScenario.nodes[currentNodeId];
    if (!node) {
        alert("خطأ هندسي: لم يتم العثور على العقدة الحوارية المحددة في الشيت!");
        return;
    }
    
    // عرض كلام واعتراض العميل الحالي
    document.getElementById('customerSpeechText').innerText = node.customerSpeech;
    
    // تصفير وتهيئة صندوق الخيارات والتغذية الراجعة
    document.getElementById('feedbackBox').style.display = 'none';
    document.getElementById('actionArea').style.display = 'none';
    
    const container = document.getElementById('choicesContainer');
    container.innerHTML = "";
    
    // بناء أزرار الردود المتوفرة للموظف
    node.choices.forEach((choice) => {
        if (choice.text && choice.text.trim() !== "") {
            const btn = document.createElement('button');
            btn.className = "choice-btn";
            btn.innerText = choice.text;
            btn.onclick = () => handleChoiceSelection(choice);
            container.appendChild(btn);
        }
    });
    
    // تحديث عداد الخطوات الحوارية على لوحة التحكم
    document.getElementById('dealStepVal').innerText = `${conversationStep} / 4`;
}

// 3. معالجة اختيار الموظف وحساب النتيجة الفورية للرد البيعي
function handleChoiceSelection(choice) {
    // قفل بقية الاختيارات لمنع التلاعب
    const buttons = document.querySelectorAll('.choice-btn');
    buttons.forEach(btn => btn.disabled = true);
    
    nextTargetNodeId = choice.nextNode;
    
    // تحليل دقة الرد وبناء التغذية الراجعة الذكية الملونة
    const feedbackBox = document.getElementById('feedbackBox');
    feedbackBox.style.display = 'block';
    feedbackBox.innerText = choice.feedback;
    
    // [ميكانيكية التلعيب البيعي المحترف]: تعديل مستويات الثقة والمؤشرات بناءً على العقدة القادمة
    if (nextTargetNodeId === "success") {
        trustScore = Math.min(100, trustScore + 10);
        feedbackBox.style.background = "rgba(34, 197, 94, 0.12)";
        feedbackBox.style.color = "var(--success)";
        feedbackBox.innerHTML = `🏆 <strong>رائع جداً! نجحت في إغلاق الصفقة (Deal Closed):</strong><br>` + choice.feedback;
        setupEndGameButton("إغلاق المحاكاة والعودة للرئيسية");
    } else if (nextTargetNodeId === "fail") {
        trustScore = Math.max(0, trustScore - 30);
        feedbackBox.style.background = "rgba(239, 68, 68, 0.12)";
        feedbackBox.style.color = "var(--danger)";
        feedbackBox.innerHTML = `❌ <strong>للأسف هرب العميل وضاعت الصفقة (Deal Lost):</strong><br>` + choice.feedback;
        setupEndGameButton("إعادة محاولة سيناريو تفاعلي جديد 🔄");
    } else {
        // حوار مستمر عادي؛ فحص جودة الرد لضبط التلوين
        if(choice.feedback.includes("أحسنت") || choice.feedback.includes("ممتاز") || choice.feedback.includes("صحيح")) {
            feedbackBox.style.background = "rgba(34, 197, 94, 0.08)";
            feedbackBox.style.color = "var(--success)";
            trustScore = Math.min(100, trustScore + 5);
        } else {
            feedbackBox.style.background = "rgba(239, 68, 68, 0.06)";
            feedbackBox.style.color = "var(--text-color)";
            trustScore = Math.max(10, trustScore - 15);
        }
        document.getElementById('actionArea').style.display = 'block'; // إظهار زر المتابعة
    }
    
    document.getElementById('trustVal').innerText = `${trustScore}%`;
}

// 4. الانتقال للخطوة التالية في شجرة الحوار المتفرعة
function proceedToNextNode() {
    currentNodeId = nextTargetNodeId;
    conversationStep++;
    renderCurrentDialogueNode();
}

// 5. تهيئة زر النهاية لإعادة المحاولة أو العودة
function setupEndGameButton(btnText) {
    const actionArea = document.getElementById('actionArea');
    const actionBtn = document.getElementById('actionBtn');
    
    actionArea.style.display = 'block';
    actionBtn.innerText = btnText;
    
    actionBtn.onclick = () => {
        if (nextTargetNodeId === "success") {
            window.location.href = "index.html"; // عودة للرئيسية
        } else {
            // تصفير كامل لإعادة محاكاة سيناريو عشوائي آخر جديد تماماً
            currentNodeId = "start";
            nextTargetNodeId = "";
            trustScore = 100;
            conversationStep = 1;
            document.getElementById('trustVal').innerText = "100%";
            document.getElementById('simulator-content').style.display = 'none';
            document.getElementById('loading-overlay').style.display = 'block';
            fetchScenariosFromPool();
        }
    };
}
