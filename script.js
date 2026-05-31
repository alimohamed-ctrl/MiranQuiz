const API_URL = "https://script.google.com/macros/s/AKfycbxiIoAgbzsfWSc3lCwTW9Dv-TPKyvz0VbYh8fWc_iJPpXL5R9wp3pXpeWExQLvIhqOy4w/exec";
let allQuestionsRaw = [];
let todayQuestions = [];
let timeLeft = 900; // 15 دقيقة = 900 ثانية
let timerInterval = null;
let employeeName = "";
let todayString = "";
let currentQuestionIndex = 0; 
let userAnswers = {}; 
let furthestQuestionReached = 0; // تتبع أقصى سؤال وصل له وحله الموظف لمنع القفز العشوائي للامام

document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('theme') === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.getElementById('themeBtn').innerText = "☀️ وضع مضيء";
    }
    calculateTodayDate();
    preloadQuizData();
});

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const themeBtn = document.getElementById('themeBtn');
    if (currentTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'light');
        themeBtn.innerText = "🌙 وضع داكن";
        localStorage.setItem('theme', 'light');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeBtn.innerText = "☀️ وضع مضيء";
        localStorage.setItem('theme', 'dark');
    }
}

function calculateTodayDate() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0'); 
    const dd = String(now.getDate()).padStart(2, '0');
    todayString = `${yyyy}-${mm}-${dd}`;
    document.getElementById('topDateBadge').innerText = `📅 اختبار اليوم المجدول: ${todayString}`;
}

async function preloadQuizData() {
    try {
        const response = await fetch(API_URL);
        allQuestionsRaw = await response.json();
        
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
    todayQuestions = allQuestionsRaw.filter(q => q.date && q.date.toString().trim() === todayString);

    document.getElementById('login-view').style.display = 'none';
    document.getElementById('quiz-view').style.display = 'block';

    if (todayQuestions.length === 0) {
        document.getElementById('quiz-container').innerHTML = `
            <div style="text-align:center; color:var(--danger); font-weight:700; padding:20px; background:rgba(239,68,68,0.05); border-radius:8px; border:1px solid var(--danger);">
                ⚠️ لا توجد أسئلة مخصصة لتاريخ اليوم (${todayString}) في ملف الإدارة! 
            </div>`;
        document.querySelector('.action-buttons').style.display = 'none';
        document.getElementById('quizHeader').style.display = 'none';
    } else {
        buildQuestionNavCircles(); 
        displayCurrentQuestion(); 
        startTimer(); 
    }
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
            // [شرط أمان مطور]: يسمح له بالانتقال فقط للأسئلة التي مر عليها وحلها، ويقفل القادم
            if (index <= furthestQuestionReached) {
                jumpToQuestion(index);
            }
        };
        container.appendChild(circle);
    });
}

function displayCurrentQuestion() {
    const quizContainer = document.getElementById('quiz-container');
    quizContainer.innerHTML = "";
    
    // أنيميشن تبديل السؤال بسلاسة
    quizContainer.style.animation = 'none';
    quizContainer.offsetHeight; 
    quizContainer.style.animation = 'fadeInUp 0.3s ease-out';

    const q = todayQuestions[currentQuestionIndex];
    let optionsHTML = "";
    
    q.options.forEach(opt => {
        let cleanedOpt = opt.trim();
        if (cleanedOpt) {
            let isChecked = userAnswers[currentQuestionIndex] === cleanedOpt ? 'checked' : '';
            optionsHTML += `
                <label class="option-label">
                    <input type="radio" name="currentQ" value="${cleanedOpt}" ${isChecked} onchange="saveAnswer('${cleanedOpt}')">
                    <span>${cleanedOpt}</span>
                </label>
            `;
        }
    });
    
    quizContainer.innerHTML += `
        <div class="question-block">
            <div style="font-weight:600; margin-bottom:18px; font-size:17px;">سؤال ${currentQuestionIndex + 1}: ${q.question}</div>
            ${optionsHTML}
        </div>
    `;
    
    document.getElementById('prev-btn').style.visibility = currentQuestionIndex === 0 ? 'hidden' : 'visible';
    
    // إدارة ظهور الأزرار بناءً على حل السؤال
    controlNavigationButtons();
    updateCircleStyles();
}

function saveAnswer(selectedOption) {
    userAnswers[currentQuestionIndex] = selectedOption;
    
    // فتح الخطوة التالية في التنقل العلوي والسفلي
    if (currentQuestionIndex === furthestQuestionReached && furthestQuestionReached < todayQuestions.length - 1) {
        furthestQuestionReached = currentQuestionIndex + 1;
    }
    
    updateProgressBarAndCircles();
    controlNavigationButtons(); // تحديث فوري لظهور زر التالي أو الإرسال
}

// دالة التحكم الصارمة بظهور زر التالي وزر الإرسال بناءً على حل الموظف لجميع الأسئلة
function controlNavigationButtons() {
    const hasAnsweredCurrent = !!userAnswers[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === todayQuestions.length - 1;
    const answeredTotalCount = Object.keys(userAnswers).length;
    const hasSolvedAll = answeredTotalCount === todayQuestions.length;

    // زر التالي يظهر فقط إذا كان السؤال الحالي محلولاً وليس الأخير
    if (hasAnsweredCurrent && !isLastQuestion) {
        document.getElementById('next-btn').style.display = 'block';
    } else {
        document.getElementById('next-btn').style.display = 'none';
    }

    // زر الإرسال يظهر فقط في السؤال الأخير وبشرط حل جميع الأسئلة بلا استثناء
    if (isLastQuestion && hasSolvedAll) {
        document.getElementById('submit-btn').style.display = 'block';
    } else {
        document.getElementById('submit-btn').style.display = 'none';
    }
}

function nextQuestion() {
    if (currentQuestionIndex < todayQuestions.length - 1) {
        currentQuestionIndex++;
        displayCurrentQuestion();
    }
}

function prevQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        displayCurrentQuestion();
    }
}

function jumpToQuestion(index) {
    currentQuestionIndex = index;
    displayCurrentQuestion();
}

function updateProgressBarAndCircles() {
    let answeredCount = 0;
    todayQuestions.forEach((_, index) => {
        const circle = document.getElementById(`nav-circle-${index}`);
        if (userAnswers[index]) {
            answeredCount++;
            if (circle) circle.classList.add('answered');
        } else {
            if (circle) circle.classList.remove('answered');
        }
    });
    
    let percentage = todayQuestions.length > 0 ? Math.round((answeredCount / todayQuestions.length) * 100) : 0;
    document.getElementById('progressBarFill').style.width = `${percentage}%`;
    document.getElementById('progressPercent').innerText = `${percentage}%`;
}

function updateCircleStyles() {
    todayQuestions.forEach((_, index) => {
        const circle = document.getElementById(`nav-circle-${index}`);
        if (circle) {
            // فتح وإغلاق إمكانية الضغط على الدائرة بناءً على وصول الموظف إليها
            if (index <= furthestQuestionReached) {
                circle.classList.add('unlocked');
            } else {
                circle.classList.remove('unlocked');
            }

            if (index === currentQuestionIndex) {
                circle.classList.add('active');
            } else {
                circle.classList.remove('active');
            }
        }
    });
}

function startTimer() {
    renderTimer();
    timerInterval = setInterval(() => {
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            alert("⏰ انتهى وقت الاختبار بالكامل (15 دقيقة)! سيتم حفظ إجاباتك الحالية تلقائياً للفرع.");
            submitQuiz(true);
        } else {
            timeLeft--;
            renderTimer();
            if (timeLeft <= 300) { // 5 دقائق تعادل 300 ثانية
                document.getElementById('timerBox').classList.add('urgent');
            }
        }
    }, 1000);
}

function renderTimer() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    document.getElementById('timerText').innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

async function submitQuiz(isTimeOut = false) {
    if (timerInterval) clearInterval(timerInterval);

    let score = 0;
    let detailsArray = [];
    
    todayQuestions.forEach((q, index) => {
        let userSelection = userAnswers[index] || "";
        let qNum = index + 1;
        
        if (!userSelection) {
            detailsArray.push(`س${qNum}: لم يحل`);
        } else {
            let isCorrect = userSelection === q.answer.toString().trim();
            if (isCorrect) { score++; detailsArray.push(`س${qNum}: صح`); } 
            else { detailsArray.push(`س${qNum}: خطأ`); }
        }
    });

    const finalResult = `${score} من ${todayQuestions.length}`;
    const reportDetails = detailsArray.join(" | ");
    
    showResultsPage(employeeName, score);
    
    try {
        await fetch(API_URL, {
            method: "POST",
            mode: "no-cors", 
            body: JSON.stringify({ name: employeeName, score: finalResult, details: reportDetails })
        });
    } catch (error) {
        console.error("عطل إرسال السجلات:", error);
    }
}

function showResultsPage(name, score) {
    document.getElementById('quiz-view').style.display = 'none';
    document.getElementById('result-view').style.display = 'block';
    
    document.getElementById('employee-greeting').innerText = `أهلاً بك يا ${name}، لقد أتممت الاختبار بنجاح وتم تسجيل النتيجة بمستندات الإدارة.`;
    
    let percentage = todayQuestions.length > 0 ? Math.round((score / todayQuestions.length) * 100) : 0;
    document.getElementById('percentageCircle').innerHTML = `${percentage}% <span>النسبة المئوية</span>`;
    document.getElementById('totalScoreText').innerText = `مجموع إجاباتك الصحيحة هو: ${score} من أصل ${todayQuestions.length} سؤال.`;
    
    const reviewContainer = document.getElementById('review-container');
    reviewContainer.innerHTML = "";
    
    todayQuestions.forEach((q, index) => {
        let userSelection = userAnswers[index] || "لم تقم باختيار إجابة";
        let correctAnswer = q.answer ? q.answer.toString().trim() : "";
        let isCorrect = userSelection === correctAnswer;
        
        let optionsHTML = "";
        if (q.options && Array.isArray(q.options)) {
            q.options.forEach(opt => {
                let cleanedOpt = opt.trim();
                let cssClass = "";
                if (cleanedOpt === correctAnswer) cssClass = "correct-opt";
                else if (cleanedOpt === userSelection && !isCorrect) cssClass = "wrong-opt";
                
                if (cleanedOpt) {
                    optionsHTML += `<div class="option-label ${cssClass}"><input type="radio" disabled ${cleanedOpt === userSelection ? 'checked' : ''}><span>${cleanedOpt}</span></div>`;
                }
            });
        }
        
        let feedback = isCorrect 
            ? `<div class="feedback-text text-success">✓ إجابة ممتازة، صحيحة!</div>`
            : `<div class="feedback-text text-danger">✗ إجابة خاطئة! الإجابة الصحيحة هي: ${correctAnswer}</div>`;
            
        reviewContainer.innerHTML += `
            <div class="question-block" style="border-right-color: ${isCorrect ? 'var(--success)' : 'var(--danger)'}">
                <div style="font-weight:600; margin-bottom:12px;">سؤال ${index + 1}: ${q.question}</div>
                ${optionsHTML}
                ${feedback}
            </div>`;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// [دالة جديدة بالكامل]: لتصفير الحالة وإعادة الموظف للرئيسية لإعادة المحاولة بالكامل
function resetQuizToHome() {
    if (timerInterval) clearInterval(timerInterval);
    
    // تصفير جميع المتغيرات البرمجية لتجنب تداخل البيانات القديمة
    timeLeft = 900;
    currentQuestionIndex = 0;
    furthestQuestionReached = 0;
    userAnswers = {};
    
    // تصفير الواجهات وإعادة البارات لوضع البداية
    document.getElementById('employee-name').value = "";
    document.getElementById('progressBarFill').style.width = "0%";
    document.getElementById('progressPercent').innerText = "0%";
    document.getElementById('timerBox').classList.remove('urgent');
    
    // التبديل البصري للرئيسية
    document.getElementById('result-view').style.display = 'none';
    document.getElementById('login-view').style.display = 'block';
}
