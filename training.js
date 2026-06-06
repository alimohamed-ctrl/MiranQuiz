const SCENARIO_API = "https://script.google.com/macros/s/AKfycbxiIoAgbzsfWSc3lCwTW9Dv-TPKyvz0VbYh8fWc_iJPpXL5R9wp3pXpeWExQLvIhqOy4w/exec?type=training";
let allScenarios = [];
let currentScenario = null;
let currentNodeId = "start";
let nextTargetNodeId = ""; 
let trustScore = 0; 
let conversationStep = 1;
let trainingHistory = []; // مصفوفة لتسجيل خطوات الموظف وتحليل نقاط ضعفه بالكامل

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
            btn.innerText = choice.text; btn.onclick = () => handleChoiceSelection(choice, node.customerSpeech);
            container.appendChild(btn);
        }
    });
    document.getElementById('dealStepVal').innerText = `${conversationStep} / 5`;
}

function handleChoiceSelection(choice, originalSpeech) {
    document.querySelectorAll('.choice-btn').forEach(btn => btn.disabled = true);
    nextTargetNodeId = choice.nextNode;
    
    const feedbackBox = document.getElementById('feedbackBox');
    feedbackBox.style.display = 'block'; feedbackBox.innerText = choice.feedback;
    
    let isOptimal = false;
    
    if (choice.feedback.includes("🏆") || choice.feedback.includes("✔️") || choice.feedback.includes("أحسنت") || choice.feedback.includes("ممتاز")) {
        trustScore = Math.min(100, trustScore + 20);
        feedbackBox.style.background = "rgba(34, 197, 94, 0.08)"; feedbackBox.style.color = "var(--success)";
        isOptimal = true;
    } else if (choice.feedback.includes("🟡") || choice.feedback.includes("مقبول") || choice.feedback.includes("تنبيه")) {
        trustScore = Math.min(100, trustScore + 10);
        feedbackBox.style.background = "rgba(234, 179, 8, 0.08)"; feedbackBox.style.color = "#eab308";
    } else {
        trustScore = Math.max(0, trustScore - 15);
        feedbackBox.style.background = "rgba(239, 68, 68, 0.06)"; feedbackBox.style.color = "var(--text-color)";
    }
    
    // تسجيل الخطوة الحالية في مصفوفة الذاكرة لتحليل الأداء لاحقاً
    trainingHistory.push({
        step: conversationStep,
        customerSpeech: originalSpeech,
        selectedOption: choice.text,
        feedback: choice.feedback,
        isOptimal: isOptimal
    });
    
    document.getElementById('trustVal').innerText = `${trustScore}%`;
    document.getElementById('actionArea').style.display = 'block';
}

function proceedToNextNode() { 
    if (nextTargetNodeId === "finish" || conversationStep >= 5) {
        const feedbackBox = document.getElementById('feedbackBox');
        document.getElementById('choicesContainer').innerHTML = "";
        document.getElementById('actionArea').style.display = 'none';
        
        // 1. عرض النتيجة النهائية للمكالمة الكبرى بناء على مجموع النقاط
        if (trustScore >= 70) {
            feedbackBox.style.background = "rgba(34, 197, 94, 0.12)"; feedbackBox.style.color = "var(--success)";
            feedbackBox.innerHTML = `🏆 <strong>تم إغلاق الصفقة بنجاح (Deal Closed):</strong><br>تهانينا! لقد أدرت مكالمة بيعية استشارية ممتدة وناجحة، وبلغ مؤشر رضا وثقة العميل النهائي <strong>${trustScore}%</strong> مما ساعدك على إقفال البيعة بجدارة رفيعة لمركز مران القادة!`;
            setupEndGameButton("إنهاء وإغلاق المحاكاة الاستشارية", "success");
        } else {
            feedbackBox.style.background = "rgba(239, 68, 68, 0.12)"; feedbackBox.style.color = "var(--danger)";
            feedbackBox.innerHTML = `❌ <strong>لم تكتمل البيعة (Deal Lost):</strong><br>للأسف لم تنجح في إقفال الصفقة البيعية الحالية. مؤشر ثقة ورضا العميل الإجمالي سجل <strong>${trustScore}%</strong> وهو أقل من الحد المطلوب (70%). راجع كروت تحليل الأداء بالأسفل لمعرفة ثغرات المكالمة وتجنبها.`;
            setupEndGameButton("إعادة محاولة مكالمة بيعية جديدة 🔄", "fail");
        }
        
        // 2. بناء وعرض كروت مراجعة الأداء التعليمية وتوضيح نقاط الضعف للموظف
        renderTrainingReviewDashboard();
        return;
    }

    currentNodeId = nextTargetNodeId; 
    conversationStep++; 
    renderCurrentDialogueNode(); 
}

// دالة بناء لوحة تحليل ومراجعة الأخطاء لتطوير الموظف
function renderTrainingReviewDashboard() {
    const reviewSection = document.getElementById('review-section');
    const container = document.getElementById('reviewCardsContainer');
    container.innerHTML = "";
    
    trainingHistory.forEach((item) => {
        const card = document.createElement('div');
        card.className = "review-card";
        
        // تلوين حواف الكارت حسب جودة واحترافية الرد لمساعدة العين على الفرز الصامت
        card.style.borderRightColor = item.isOptimal ? "var(--success)" : "var(--danger)";
        
        let statusBadge = item.isOptimal ? `<span style="color:var(--success); font-weight:700;">[✓ رد استشاري ممتاز]</span>` : `<span style="color:var(--danger); font-weight:700;">[✗ رد يحتاج تحسين وتطوير]</span>`;
        
        card.innerHTML = `
            <div class="review-q">المرحلة ${item.step} - اعتراض العميل: "${item.customerSpeech}"</div>
            <div class="review-choice"><strong>ردك المختار:</strong> ${item.selectedOption} ${statusBadge}</div>
            <div class="review-fb" style="background: ${item.isOptimal ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.03)'}; color: ${item.isOptimal ? 'var(--success)' : 'var(--text-color)'}">
                <strong>التحليل والمقترح البيعي الحل:</strong> ${item.feedback}
            </div>
        `;
        container.appendChild(card);
    });
    
    reviewSection.style.display = "block";
}

// [حل المشكلة الجوهري]: تصفير وإعادة تهيئة كاملة وشاملة لحالة وصلاحيات الزر لمنع تكرار الخطوة الأولى
function setupEndGameButton(btnText, status) {
    const actionArea = document.getElementById('actionArea'); actionArea.style.display = 'block';
    const actionBtn = actionArea.querySelector('button'); actionBtn.innerText = btnText;
    
    actionBtn.onclick = () => {
        if (status === "success") { 
            window.location.href = "index.html"; 
        } else {
            // تصفير الأرقام والمسارات بالكامل
            currentNodeId = "start"; 
            nextTargetNodeId = ""; 
            trustScore = 0; 
            conversationStep = 1;
            trainingHistory = []; 
            
            // إخفاء لوحة التحليل السابقة وإعادة المؤشرات للبداية
            document.getElementById('trustVal').innerText = "0%";
            document.getElementById('review-section').style.display = "none";
            document.getElementById('simulator-content').style.display = 'none';
            document.getElementById('loading-overlay').style.display = 'block';
            
            // [الحل الجراحي للفخ]: إعادة تعيين نص ووظيفة الزر برمجياً لوضعه الأصلي
            actionBtn.innerText = "متابعة الحوار الاستشاري ➡️";
            actionBtn.onclick = proceedToNextNode;
            
            fetchScenariosFromPool();
        }
    };
}
