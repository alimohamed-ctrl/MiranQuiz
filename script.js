const API_URL = "https://script.google.com/macros/s/AKfycbxiIoAgbzsfWSc3lCwTW9Dv-TPKyvz0VbYh8fWc_iJPpXL5R9wp3pXpeWExQLvIhqOy4w/exec";
let allQuestionsRaw = [];
let todayQuestions = [];
let timeLeft = 900; // تم زيادة المدة لـ 15 دقيقة تعادل 900 ثانية
let timerInterval = null;
let employeeName = "";
let todayString = "";
let currentQuestionIndex = 0; // مؤشر تتبع السؤال الحالي المعروض
let userAnswers = {}; // كائن لحفظ اختيارات الموظف لكي لا تضيع عند التنقل

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
    } catch (error) {
        document.getElementById('topDateBadge').innerText = "🔴 عطل في الاتصال بالسيرفر! أعد التحديث.";
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
        buildQuestionNavCircles(); // بناء دوائر الأرقام
        displayCurrentQuestion(); // عرض السؤال الأول
        startTimer(); 
    }
}

// بناء الدوائر الرقمية ديناميكياً تحت البروجرس بار
function buildQuestionNavCircles() {
    const container = document.getElementById('navCirclesContainer');
    container.innerHTML = "";
    todayQuestions.forEach((_, index) => {
        const circle = document.createElement('div');
        circle.className = `nav-circle`;
        circle.id = `nav-circle-${index}`;
        circle.innerText = index + 1;
        circle.onclick = () => jumpToQuestion(index); // إمكانية القفز لأي سؤال بالضغط
        container.appendChild(circle);
    });
}

// دالة عرض السؤال الحالي فقط (نظام Paging)
function displayCurrentQuestion() {
    const quizContainer = document.getElementById('quiz-container');
    quizContainer.innerHTML = "";
    
    const q = todayQuestions[currentQuestionIndex];
    let optionsHTML = "";
    
    q.options.forEach(opt => {
        let cleanedOpt = opt.trim();
        if (cleanedOpt) {
            // التحقق إذا كان الموظف قد حل هذا السؤال مسبقاً لعرض اختياره النشط
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
    
    // التحكم بظهور أزرار التالي، السابق، والإرسال
    document.getElementById('prev-btn').style.visibility = currentQuestionIndex === 0 ? 'hidden' : 'visible';
    
    if (currentQuestionIndex === todayQuestions.length - 1) {
        document.getElementById('next-btn').style.display = 'none';
        document.getElementById('submit-btn').style.display = 'block'; // يظهر الإرسال في آخر سؤال فقط
    } else {
        document.getElementById('next-btn').style.display = 'block';
        document.getElementById('submit-btn').style.display = 'none';
    }
    
    // تحديث تلوين الدائرة النشطة حالياً
    updateActiveCircle();
}

// دالة حفظ الاختيار المباشر وتحديث البارات فورا
function saveAnswer(selectedOption) {
    userAnswers[currentQuestionIndex] = selectedOption;
    updateProgressBarAndCircles();
}

// التنقل بين الأزرار
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

// دالة تحديث الألوان للدوائر وشريط البروجرس بار السفلي
function updateProgressBarAndCircles() {
    let answeredCount = 0;
    
    todayQuestions.forEach((_, index) => {
        const circle = document.getElementById(`nav-circle-${index}`);
        if (userAnswers[index]) {
            answeredCount++;
            if (circle) circle.classList.add('answered'); // تلوين بالأخضر لو تم الحل
        } else {
            if (circle) circle.classList.remove('answered');
        }
    });
    
    let percentage = todayQuestions.length > 0 ? Math.round((answeredCount / todayQuestions.length) * 100) : 0;
    document.getElementById('progressBarFill').style.width = `${percentage}%`;
    document.getElementById('progressPercent').innerText = `${percentage}%`;
}

function updateActiveCircle() {
    todayQuestions.forEach((_, index) => {
        const circle = document.getElementById(`nav-circle-${index}`);
        if (circle) {
            if (index === currentQuestionIndex) {
                circle.classList.add('active'); // تمييز السؤال الحالي بإطار أزرق ونبضة كبر حجم
            } else {
                circle.classList.remove('active');
            }
        }
    });
}

// دالة التايمر الـ 15 دقيقة والتنبيه باللون الأحمر عند دقيقة 5
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
            
            // [تعديل مضاف]: لو وصلنا للدقيقة 5 (تساوي 300 ثانية أو أقل) يتحول المؤقت للأحمر
            if (timeLeft <= 300) {
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

    if (!isTimeOut) {
        let answeredCount = Object.keys(userAnswers).length;
        if (answeredCount < todayQuestions.length) {
            const confirmSubmit = confirm(`تنبيه: لقد قمت بحل ${answeredCount} أسئلة فقط من أصل ${todayQuestions.length}. هل تود تأكيد الإرسال للإدارة؟`);
            if (!confirmSubmit) {
                startTimer();
                return;
            }
        }
    }
    
    let score = 0;
    let detailsArray = [];
    
    todayQuestions.forEach((q, index) => {
        let userSelection = userAnswers[index] || "";
        let qNum = index + 1;
        
        if (!userSelection) {
            detailsArray.push(`س${qNum}: لم يحل`);
        } else {
            let isCorrect = userSelection === q.answer.toString().trim();
            if (isCorrect) {
                score++;
                detailsArray.push(`س${qNum}: صح`);
            } else {
                detailsArray.push(`س${qNum}: خطأ`);
            }
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
                
                if (cleanedOpt === correctAnswer) {
                    cssClass = "correct-opt";
                } else if (cleanedOpt === userSelection && !isCorrect) {
                    cssClass = "wrong-opt";
                }
                
                if (cleanedOpt) {
                    optionsHTML += `
                        <div class="option-label ${cssClass}">
                            <input type="radio" disabled ${cleanedOpt === userSelection ? 'checked' : ''}>
                            <span>${cleanedOpt}</span>
                        </div>
                    `;
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
            </div>
        `;
    });
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
