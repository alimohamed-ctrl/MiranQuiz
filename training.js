const SCENARIO_API = "https://script.google.com/macros/s/AKfycbxiIoAgbzsfWSc3lCwTW9Dv-TPKyvz0VbYh8fWc_iJPpXL5R9wp3pXpeWExQLvIhqOy4w/exec?type=training";
let allScenarios = [];
let currentScenario = null;
let currentNodeId = "start";
let nextTargetNodeId = ""; 
let trustScore = 0; // تم التعديل ليبدأ عداد الثقة والرضا فارغاً بنسبة 0%
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
        
        // إظهار العداد الابتدائي 0% على الشاشة فوراً
        document.getElementById('trustVal').innerText = `${trustScore}%`;
        renderCurrentDialogueNode();
    } catch (error) { console.error(error); }
}

function renderCurrentDialogueNode() {
    const node = currentScenario.nodes[currentNodeId];
    
    if (!node) {
        document.getElementById('customerSpeechText').innerHTML = `
            <span style="color:var(--danger)">⚠️ خطأ في تفرع البيانات داخل الشيت:</span><br>
            السيرفر يحاول البحث عن عقدة حوارية باسم (<strong>${currentNodeId}</strong>) ولكنها غير موجودة بالعمود B بجدول التدريب!<br>
            <small style="color:var(--text-muted); font-weight:400;">يرجى مراجعة عمود NextNode في الخطوة السابقة للتأكد من تطابقه بالملي مع اسم الـ NodeID التالي.</small>
        `;
        document.getElementById('choicesContainer').innerHTML = "";
        document.getElementById('feedbackBox').style.display = 'none';
        document.getElementById('actionArea').style.display = 'none';
        return;
    }
    
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
    
    // [ميكانيكية حساب العداد التراكمي]: زيادة ونقصان النسبة بناءً على جودة واحترافية خيار الرد
    if (choice.feedback.includes("🏆") || choice.feedback.includes("✔️") || choice.feedback.includes("أحسنت") || choice.feedback.includes("ممتاز")) {
        trustScore = Math.min(100, trustScore + 25);
        feedbackBox.style.background = "rgba(34, 197, 94, 0.08)"; feedbackBox.style.color = "var(--success)";
    } else if (choice.feedback.includes("🟡") || choice.feedback.includes("مقبول") || choice.feedback.includes("تنبيه")) {
        trustScore = Math.min(100, trustScore + 10);
        feedbackBox.style.background = "rgba(234, 179, 8, 0.08)"; feedbackBox.style.color = "#eab308";
    } else {
        trustScore = Math.max(0, trustScore - 15);
        feedbackBox.style.background = "rgba(239, 68, 68, 0.06)"; feedbackBox.style.color = "var(--text-color)";
    }
    
    document.getElementById('trustVal').innerText = `${trustScore}%`;
    document.getElementById('actionArea').style.display = 'block';
}

function proceedToNextNode() { 
    // [فحص جدار الإغلاق]: لو وصلنا لنهاية الخطوة الرابعة بالكامل، يتم التقييم بناءً على مجموع النقاط المتراكم
    if (nextTargetNodeId === "finish" || currentNodeId === "close") {
        const feedbackBox = document.getElementById('feedbackBox');
        document.getElementById('choicesContainer').innerHTML = "";
        document.getElementById('actionArea').style.display = 'none';
        
        if (trustScore >= 70) {
            feedbackBox.style.background = "rgba(34, 197, 94, 0.12)";
            feedbackBox.style.color = "var(--success)";
            feedbackBox.innerHTML = `🏆 <strong>تم إغلاق الصفقة بنجاح (Deal Closed):</strong><br>تهانينا! لقد نجحت في إدارة مكالمة بيعية استشارية متكاملة الأركان بمركز مران. قمت باستكشاف الاحتياج، واحتواء اعتراض السعر باحترافية، وربطت الحقيبة المعتمدة المناسبة بوجع العميل، وبلغ مؤشر رضا العميل النهائي <strong>${trustScore}%</strong> مما قادك لإتمام إقفال البيعة بتميز رفيع!`;
            setupEndGameButton("إنهاء وإغلاق المحاكاة السعيدة", "success");
        } else {
            feedbackBox.style.background = "rgba(239, 68, 68, 0.12)";
            feedbackBox.style.color = "var(--danger)";
            feedbackBox.innerHTML = `❌ <strong>لم تكتمل البيعة (Deal Lost):</strong><br>للأسف هرب العميل ولم تنجح في إقفال الصفقة بنجاح. السبب: مؤشر رضا وثقة العميل الإجمالي بلغ <strong>${trustScore}%</strong> وهو أقل من الحد الأدنى المطلوب لإتمام البيع الاستشاري (70%). حاول التركيز في المرة القادمة على مطابقة القيمة بدقة واحتواء العميل بدبلوماسية أعمق.`;
            setupEndGameButton("إعادة محاولة مكالمة بيعية جديدة 🔄", "fail");
        }
        return;
    }

    currentNodeId = nextTargetNodeId; 
    conversationStep++; 
    renderCurrentDialogueNode(); 
}

function setupEndGameButton(btnText, status) {
    const actionArea = document.getElementById('actionArea'); actionArea.style.display = 'block';
    const actionBtn = actionArea.querySelector('button'); actionBtn.innerText = btnText;
    actionBtn.onclick = () => {
        if (status === "success") { 
            window.location.href = "index.html"; 
        } else {
            currentNodeId = "start"; nextTargetNodeId = ""; trustScore = 0; conversationStep = 1;
            document.getElementById('trustVal').innerText = "0%";
            document.getElementById('simulator-content').style.display = 'none';
            document.getElementById('loading-overlay').style.display = 'block';
            fetchScenariosFromPool();
        }
    };
}
