const API_URL = "ضَع_رابط_WEB_APP_URL_الخاص_بك_هنا";
let todayQuestions = [];
let timeLeft = 900; // 15 دقيقة
let timerInterval = null;
let employeeName = "";
let currentQuestionIndex = 0; 
let userAnswers = {}; 
let furthestQuestionReached = 0; 

document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('theme') === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.getElementById('themeBtn').innerText = "☀️ الوضع المضيء";
    }
    preloadQuizData();
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
        themeBtn.innerText = "☀️ الوضع المضيء";
        localStorage.setItem('theme', 'dark');
    }
}

async function preloadQuizData() {
    try {
        const response = await fetch(API_URL);
        todayQuestions = await response.json();
        
        const startBtn = document.getElementById('start-btn');
        startBtn.disabled = false;
        startBtn.innerText = "ابدأ الاختبار الآن ⏱️";
        document.getElementById('server-status').innerText = "🟢 تم تحميل أنظمة وقواعد الأسئلة بنجاح.";
        document.getElementById('server-status').style.color = "#22c55e";
    } catch (error) {
        document.getElementById('server-status').innerText = "🔴 فشل الاتصال بقاعدة البيانات! أعد تحديث الصفحة.";
        document.getElementById('server-status').style.color = "#ef4444";
        console.error(error);
    }
}

function startQuiz() {
    const nameInput = document.getElementById('employee-name').value.trim();
    if (!nameInput) {
        alert("تنبيه إدارة مران: يرجى كتابة اسمك الكامل أولاً قبل بدء الاختبار!");
        return;
    }
    employeeName = nameInput;
    document.getElementById('login-view').style.display = 'none';
    document.getElementById('quiz-view').style.display = 'block';

    buildQuestionNavCircles(); 
    displayCurrentQuestion(); 
    startTimer(); 
}

function buildQuestionNavCircles() {
    const container = document.getElementById('navCirclesContainer');
    container.innerHTML = "";
    todayQuestions.forEach((_, index) => {
        const circle = document.createElement('div');
        circle.className = `nav-circle`;
        circle.id = `nav-circle-${index}`;
        circle.innerText = index + 1;
        circle.onclick = () => {
            if (index <= furthestQuestionReached && userAnswers[index]) {
                jumpToQuestion(index);
            } else if (index === furthestQuestionReached) {
                jumpToQuestion(index);
            }
        };
        container.appendChild(circle);
    });
}

function displayCurrentQuestion() {
    const quizContainer = document.getElementById('quiz-container');
    quizContainer.innerHTML = "";
    
    const q = todayQuestions[currentQuestionIndex];
    let optionsHTML = "";
    q.options.forEach(opt => {
        let cleanedOpt = opt.trim();
        if (cleanedOpt) {
            let isChecked = userAnswers[currentQuestionIndex] === cleanedOpt ? 'checked' : '';
            optionsHTML += `<label class="option-label"><input type="radio" name="currentQ" value="${cleanedOpt}" ${isChecked} onchange="saveAnswer('${cleanedOpt}')"><span>${cleanedOpt}</span></label>`;
        }
    });
    
    quizContainer.innerHTML += `<div class="question-block"><div style="font-weight:600; margin-bottom:18px; font-size:17px;">سؤال ${currentQuestionIndex + 1}: ${q.question}</div>${optionsHTML}</div>`;
    document.getElementById('prev-btn').style.visibility = currentQuestionIndex === 0 ? 'hidden' : 'visible';
    controlNavigationButtons();
    updateCircleStyles();
}

function saveAnswer(selectedOption) {
    userAnswers[currentQuestionIndex] = selectedOption;
    if (currentQuestionIndex === furthestQuestionReached && furthestQuestionReached < todayQuestions.length - 1) {
        furthestQuestionReached = currentQuestionIndex + 1;
    }
    updateProgressBarAndCircles();
    controlNavigationButtons(); 
}

function controlNavigationButtons() {
    const hasAnsweredCurrent = !!userAnswers[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === todayQuestions.length - 1;
    const answeredTotalCount = Object.keys(userAnswers).length;
    const hasSolvedAll = answeredTotalCount === todayQuestions.length;

    const nextBtn = document.getElementById('next-btn');
    const submitBtn = document.getElementById('submit-btn');

    if (!isLastQuestion) {
        nextBtn.style.display = 'block'; submitBtn.style.display = 'none';
        nextBtn.disabled = !hasAnsweredCurrent;
    } else {
        nextBtn.style.display = 'none'; submitBtn.style.display = 'block';
        submitBtn.disabled = !hasSolvedAll;
    }
}

function nextQuestion() { if (currentQuestionIndex < todayQuestions.length - 1) { currentQuestionIndex++; displayCurrentQuestion(); } }
function prevQuestion() { if (currentQuestionIndex > 0) { currentQuestionIndex--; displayCurrentQuestion(); } }
function jumpToQuestion(index) { currentQuestionIndex = index; displayCurrentQuestion(); }

function updateProgressBarAndCircles() {
    let answeredCount = 0;
    todayQuestions.forEach((_, index) => {
        const circle = document.getElementById(`nav-circle-${index}`);
        if (userAnswers[index]) { answeredCount++; if (circle) circle.classList.add('answered'); } 
        else { if (circle) circle.classList.remove('answered'); }
    });
    let percentage = todayQuestions.length > 0 ? Math.round((answeredCount / todayQuestions.length) * 100) : 0;
    document.getElementById('progressBarFill').style.width = `${percentage}%`;
    document.getElementById('progressPercent').innerText = `${percentage}%`;
}

function updateCircleStyles() {
    todayQuestions.forEach((_, index) => {
        const circle = document.getElementById(`nav-circle-${index}`);
        if (circle) {
            if (index <= furthestQuestionReached) circle.classList.add('unlocked');
            else circle.classList.remove('unlocked');
            if (index === currentQuestionIndex) circle.classList.add('active');
            else circle.classList.remove('active');
        }
    });
}

function startTimer() {
    renderTimer();
    timerInterval = setInterval(() => {
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            alert("⏰ انتهى وقت الاختبار بالكامل! سيتم حفظ إجاباتك الحالية تلقائياً.");
            submitQuiz(true);
        } else {
            timeLeft--; renderTimer();
            if (timeLeft <= 300) document.getElementById('timerBox').classList.add('urgent');
        }
    }, 1000);
}

function renderTimer() {
    const minutes = Math.floor(timeLeft / 60); const seconds = timeLeft % 60;
    document.getElementById('timerText').innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

async function submitQuiz(isTimeOut = false) {
    if (timerInterval) clearInterval(timerInterval);
    let score = 0; let detailsArray = [];
    let needIdentTotal = 0; let needIdentMistakes = 0;
    let courseMapTotal = 0; let courseMapMistakes = 0;
    
    todayQuestions.forEach((q, index) => {
        let userSelection = userAnswers[index] || "";
        let qNum = index + 1;
        let correctAnswer = q.answer ? q.answer.toString().trim() : "";
        let isCorrect = userSelection === correctAnswer;
        
        let isNeedIdent = q.question.includes("تحديد احتياج");
        let isCourseMap = q.question.includes("أي دورة مناسبة") || q.question.includes("مناسبة");

        if (isNeedIdent) needIdentTotal++;
        if (isCourseMap) courseMapTotal++;

        if (!userSelection) {
            detailsArray.push(`س${qNum}: لم يحل`);
            if (isNeedIdent) needIdentMistakes++;
            if (isCourseMap) courseMapMistakes++;
        } else {
            if (isCorrect) { score++; detailsArray.push(`س${qNum}: صح`); } 
            else { 
                detailsArray.push(`س${qNum}: خطأ`); 
                if (isNeedIdent) needIdentMistakes++;
                if (isCourseMap) courseMapMistakes++;
            }
        }
    });

    let mainProblemValue = "لا يوجد";
    if (needIdentMistakes > 0 && courseMapMistakes === 0) mainProblemValue = "تحديد الاحتياج";
    else if (needIdentMistakes === 0 && courseMapMistakes > 0) mainProblemValue = "ربط الدورة";
    else if (needIdentMistakes > 0 && courseMapMistakes > 0) mainProblemValue = "تحديد الاحتياج وربط الدورة";

    const finalResult = `${score} من ${todayQuestions.length}`;
    const reportDetails = detailsArray.join(" | ");
    
    showResultsPage(employeeName, score, needIdentTotal, needIdentMistakes, courseMapTotal, courseMapMistakes);
    
    try {
        await fetch(API_URL, {
            method: "POST", mode: "no-cors", 
            body: JSON.stringify({ name: employeeName, score: finalResult, details: reportDetails, mainProblem: mainProblemValue })
        });
    } catch (error) { console.error(error); }
}

function generatePerformanceAnalysis(needIdentTotal, needIdentMistakes, courseMapTotal, courseMapMistakes) {
    const container = document.getElementById('performance-analysis-container');
    container.innerHTML = "";

    let needScore = needIdentTotal > 0 ? (needIdentTotal - needIdentMistakes) : 0;
    let courseScore = courseMapTotal > 0 ? (courseMapTotal - courseMapMistakes) : 0;
    let needPercent = needIdentTotal > 0 ? Math.round((needScore / needIdentTotal) * 100) : 100;
    let coursePercent = courseMapTotal > 0 ? Math.round((courseScore / courseMapTotal) * 100) : 100;

    let needBadge = needPercent === 100 ? "👑 ممتاز" : needPercent >= 70 ? "🟡 جيد" : "❌ يحتاج تطوير";
    let courseBadge = coursePercent === 100 ? "👑 ممتاز" : coursePercent >= 70 ? "🟡 جيد" : "❌ يحتاج تطوير";

    let analysisHTML = `<div style="margin: 25px 0; padding: 25px; background: rgba(148, 163, 184, 0.04); border-radius: 14px; border: 1px solid var(--border-color); text-align: right;"><h3 style="margin-top: 0; color: var(--primary); font-size: 18px; border-bottom: 2px solid var(--border-color); padding-bottom: 10px;">📊 لوحة التحليل ومؤشرات الأداء المباشرة (KPIs):</h3><div class="kpi-card"><span class="kpi-title">🎯 محور تشخيص وتحديد احتياج العميل:</span><span class="kpi-score" style="color: ${needPercent >= 70 ? 'var(--success)' : 'var(--danger)'}">${needScore} من ${needIdentTotal} (${needPercent}%) - ${needBadge}</span></div><div class="kpi-card"><span class="kpi-title">💡 محور ربط وتوجيه الدورة التدريبية الحل:</span><span class="kpi-score" style="color: ${coursePercent >= 70 ? 'var(--success)' : 'var(--danger)'}">${courseScore} من ${courseMapTotal} (${coursePercent}%) - ${courseBadge}</span></div><h4 style="margin: 20px 0 10px 0; color: var(--primary); font-size: 16px;">💡 التوصيات الاستشارية المخصصة لأدائك:</h4>`;

    if (needIdentMistakes === 0 && courseMapMistakes === 0) {
        analysisHTML += `<p style="font-size: 14px; color: var(--text-muted);">كفاءة استشارية ممتازة جداً في تلبية طلبات واحتياجات عملاء مركز مران القادة للتدريب!</p>`;
    } else if (needIdentMistakes > 0 && courseMapMistakes === 0) {
        analysisHTML += `<p style="font-size: 14px; color: var(--text-muted);">لديك مهارة ربط دورات ممتازة، ولكن تحتاج إلى تحسين مهارة الاستماع وبناء أسئلة التشخيص وتحديد الاحتياج لعدم التسرع بالحل.</p>`;
    } else if (needIdentMistakes === 0 && courseMapMistakes > 0) {
        analysisHTML += `<p style="font-size: 14px; color: var(--text-muted);">أنت تشخص الوجع بشكل ممتاز، ولكن تقع في مشكلة اختيار الدورة أو الحقيبة التدريبية الفنية غير المطابقة لطلب العميل تماماً من موقع مران القادة.</p>`;
    } else {
        analysisHTML += `<p style="font-size: 14px; color: var(--text-muted);">توجد فجوة مركبة تحتاج لمراجعة حثيثة لكتالوج دورات مران وتطبيق استراتيجية طرح الأسئلة الاستكشافية المفتوحة أولاً.</p>`;
    }
    analysisHTML += `</div>`; container.innerHTML = analysisHTML;
}

function showResultsPage(name, score, needIdentTotal, needIdentMistakes, courseMapTotal, courseMapMistakes) {
    document.getElementById('quiz-view').style.display = 'none'; document.getElementById('result-view').style.display = 'block';
    document.getElementById('employee-greeting').innerText = `أهلاً بك يا ${name}، تم تسجيل وحفظ النتيجة بسجلات الإدارة.`;
    let percentage = todayQuestions.length > 0 ? Math.round((score / todayQuestions.length) * 100) : 0;
    document.getElementById('percentageCircle').innerHTML = `${percentage}% <span>النسبة المئوية</span>`;
    document.getElementById('totalScoreText').innerText = `مجموع إجاباتك الصحيحة هو: ${score} من أصل ${todayQuestions.length} سؤال.`;
    generatePerformanceAnalysis(needIdentTotal, needIdentMistakes, courseMapTotal, courseMapMistakes);

    const reviewContainer = document.getElementById('review-container'); reviewContainer.innerHTML = "";
    todayQuestions.forEach((q, index) => {
        let userSelection = userAnswers[index] || "لم تقم باختيار إجابة";
        let correctAnswer = q.answer ? q.answer.toString().trim() : "";
        let isCorrect = userSelection === correctAnswer;
        let optionsHTML = "";
        q.options.forEach(opt => {
            let cleanedOpt = opt.trim(); let cssClass = "";
            if (cleanedOpt === correctAnswer) cssClass = "correct-opt";
            else if (cleanedOpt === userSelection && !isCorrect) cssClass = "wrong-opt";
            if (cleanedOpt) optionsHTML += `<div class="option-label ${cssClass}"><input type="radio" disabled ${cleanedOpt === userSelection ? 'checked' : ''}><span>${cleanedOpt}</span></div>`;
        });
        reviewContainer.innerHTML += `<div class="question-block" style="border-right-color: ${isCorrect ? 'var(--success)' : 'var(--danger)'}"><div>السؤال ${index + 1}: ${q.question}</div>${optionsHTML}</div>`;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetQuizToHome() {
    if (timerInterval) clearInterval(timerInterval);
    timeLeft = 900; currentQuestionIndex = 0; furthestQuestionReached = 0; userAnswers = {};
    document.getElementById('employee-name').value = "";
    document.getElementById('progressBarFill').style.width = "0%"; document.getElementById('progressPercent').innerText = "0%";
    document.getElementById('result-view').style.display = 'none'; document.getElementById('login-view').style.display = 'block';
    preloadQuizData();
}
