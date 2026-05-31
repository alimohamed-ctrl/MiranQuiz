const API_URL = "https://script.google.com/macros/s/AKfycbxiIoAgbzsfWSc3lCwTW9Dv-TPKyvz0VbYh8fWc_iJPpXL5R9wp3pXpeWExQLvIhqOy4w/exec";
let allQuestionsRaw = [];
let todayQuestions = [];
let timeLeft = 900; 
let timerInterval = null;
let employeeName = "";
let todayString = "";
let currentQuestionIndex = 0; 
let userAnswers = {}; 
let furthestQuestionReached = 0; 

document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('theme') === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.getElementById('themeBtn').innerText = "☀️ الوضع المضئ";
    }
    calculateTodayDate();
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
        themeBtn.innerText = "☀️ الوضع المضئ";
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
        nextBtn.style.display = 'block';
        submitBtn.style.display = 'none';
        nextBtn.disabled = !hasAnsweredCurrent;
    } else {
        nextBtn.style.display = 'none';
        submitBtn.style.display = 'block';
        submitBtn.disabled = !hasSolvedAll;
    }
}

function nextQuestion() {
    if (currentQuestionIndex < todayQuestions.length - 1) {
        currentQuestionIndex++;
        displayCurrentQuestion();
    }
}

// دالة العودة للخلف الفورية مع حفظ خيارات الراديو المعلمة مسبقاً
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

    let score = 0;
    let detailsArray = [];
    let needIdentMistakes = 0;
    let courseMapMistakes = 0;
    
    todayQuestions.forEach((q, index) => {
        let userSelection = userAnswers[index] || "";
        let qNum = index + 1;
        let correctAnswer = q.answer ? q.answer.toString().trim() : "";
        let isCorrect = userSelection === correctAnswer;
        
        // [تصحيح ذكي ومطلق]: الفحص بناء على العبارات الحقيقية المكتوبة في الشيت بالظبط
        let isNeedIdent = q.question.includes("تحديد احتياج");
        let isCourseMap = q.question.includes("أي دورة مناسبة");

        if (!userSelection) {
            detailsArray.push(`س${qNum}: لم يحل`);
            if (isNeedIdent) needIdentMistakes++;
            else if (isCourseMap) courseMapMistakes++;
        } else {
            if (isCorrect) { 
                score++; 
                detailsArray.push(`س${qNum}: صح`); 
            } else { 
                detailsArray.push(`س${qNum}: خطأ`); 
                if (isNeedIdent) needIdentMistakes++;
                else if (isCourseMap) courseMapMistakes++;
            }
        }
    });

    // بناء نص العمود الخامس بدقة مطلقة تمنع التداخل
    let mainProblemValue = "لا يوجد";
    if (needIdentMistakes > 0 && courseMapMistakes === 0) {
        mainProblemValue = "تحديد الاحتياج";
    } else if (needIdentMistakes === 0 && courseMapMistakes > 0) {
        mainProblemValue = "ربط الدورة";
    } else if (needIdentMistakes > 0 && courseMapMistakes > 0) {
        mainProblemValue = "تحديد الاحتياج وربط الدورة";
    }

    const finalResult = `${score} من ${todayQuestions.length}`;
    const reportDetails = detailsArray.join(" | ");
    
    // استدعاء واجهة النتيجة والتحليل الموضوعي بالقيم النظيفة
    showResultsPage(employeeName, score, needIdentMistakes, courseMapMistakes);
    
    // إرسال البيانات فوراً لملف الإكسيل وجوجل شيت بالعمود الخامس المحدث
    try {
        await fetch(API_URL, {
            method: "POST",
            mode: "no-cors", 
            body: JSON.stringify({ 
                name: employeeName, 
                score: finalResult, 
                details: reportDetails,
                mainProblem: mainProblemValue 
            })
        });
        console.log("تمت مزامنة السجلات بالمشكلة الحقيقية: " + mainProblemValue);
    } catch (error) {
        console.error("عطل إرسال السجلات:", error);
    }
}

// محرك بناء تقارير الأداء الفردية والموضوعية 100%
function generatePerformanceAnalysis(needIdentMistakes, courseMapMistakes) {
    const container = document.getElementById('performance-analysis-container');
    container.innerHTML = "";

    let analysisHTML = `
        <div style="margin: 25px 0; padding: 25px; background: rgba(148, 163, 184, 0.04); border-radius: 14px; border: 1px solid var(--border-color); text-align: right;">
            <h3 style="margin-top: 0; color: var(--primary); font-size: 18px; border-bottom: 2px solid var(--border-color); padding-bottom: 10px;">📊 التحليل الاستشاري التقييمي لأدائك البيعي:</h3>
    `;

    if (needIdentMistakes === 0 && courseMapMistakes === 0) {
        analysisHTML += `
            <p style="font-weight: 700; color: var(--success); font-size: 16px;">🥇 أداء استثنائي ومثالي بالكامل!</p>
            <p style="font-size: 15px; margin-bottom: 0;"><strong>التحليل الميداني:</strong> مهاراتك في <strong>تحديد احتياج العميل واستخراج الوجع الحقيقي</strong> ممتازة جداً، ولديك دقة متناهية في <strong>ربط العميل الفردي بالدورة والشهادة المهنية المطابقة تماماً لملفه</strong> داخل مركز مران. واصل تقديم هذا المستوى الاستشاري الرفيع في مكالماتك اليومية!</p>
        `;
    } 
    else if (needIdentMistakes > 0 && courseMapMistakes === 0) {
        analysisHTML += `
            <p style="font-weight: 700; color: #eab308; font-size: 16px;">⚠️ مهارة ربط الدورات ممتازة، ولكن توجد فجوة في "تحديد احتياج العميل"</p>
            <p style="font-size: 15px;"><strong>التشخيص الموضوعي:</strong> إجاباتك تدل على أنك تحفظ جيداً قائمة دورات مران وتعرف قيمتها، ولكن لديك تسرع في ترشيح الدورة قبل تشخيص "الخلفية العملية أو متطلبات جهة عمل العميل" (مثل إغفال سنوات خبرة المهندس أو اشتراطات الشركة لشهادات السلامة).</p>
            <p style="font-size: 15px; background: rgba(2, 132, 199, 0.05); padding: 12px; border-radius: 8px; border-right: 4px solid var(--primary); margin-bottom: 0;">
                <strong>💡 الحل التطويري المطلوب:</strong> في أول دقيقتين من المكالمة، لا تتحدث عن الدورات أبداً. اطرح أسئلة استكشافية مفتوحة مثل: (كم سنة خبرة عندك؟، وش المسمى الوظيفي الحالي؟، وش المشكلة الأساسية اللي تعطلك بالعمل؟)، واجعل العميل يشرح مشكلته بالكامل أولاً.
            </p>
        `;
    } 
    else if (needIdentMistakes === 0 && courseMapMistakes > 0) {
        analysisHTML += `
            <p style="font-weight: 700; color: #eab308; font-size: 16px;">⚠️ مهارة الاستماع وتحديد المشكلة ممتازة، ولكن توجد فجوة في "ربط الدورة الحل"</p>
            <p style="font-size: 15px;"><strong>التشخيص الموضوعي:</strong> أنت تستمع بشكل رائع وتستخرج أوجاع الموظف بدقة، ولكن تقع في خطأ اختيار "الأداة التدريبية التقنية الأنسب" لمعالجة مشكلته (مثل الخلط الفني بين مخرجات دورة الـ Power BI والـ Excel المتقدم، أو ترشيح بايثون بدلاً من أدوات الذكاء الاصطناعي السريعة للموظف الإداري).</p>
            <p style="font-size: 15px; background: rgba(2, 132, 199, 0.05); padding: 12px; border-radius: 8px; border-right: 4px solid var(--primary); margin-bottom: 0;">
                <strong>💡 الحل التطويري المطلوب:</strong> تحتاج فوراً لمراجعة "الحقائب التدريبية والمخرجات التفصيلية" لكل دورة على موقع مركز مران. يجب أن تفهم بدقة الفارق بين تجميع البيانات (Excel) وبين بناء لوحات التحكم التفاعلية المرئية (Power BI) لترشح الأداة الصحيحة للعميل.
            </p>
        `;
    } 
    else {
        analysisHTML += `
            <p style="font-weight: 700; color: var(--danger); font-size: 16px;">❌ توجد فجوة تدريبية مركبة في كلا المهارتين (تحديد الاحتياج + ربط الدورة)</p>
            <p style="font-size: 15px;"><strong>التشخيص الموضوعي:</strong> تظهر النتائج وجود استعجال في تقديم الحلول البيعية قبل فهم المشكلة، بالإضافة إلى ضعف في التمييز بين المستويات المهنية للشهادات الدولية المعتمدة بمركز مران (مثل خلط شروط دورة الـ PMP للمدراء ذوي الخبرة، بدورة الـ CAPM المخصصة للمبتدئين والخريجين الجدد).</p>
            <p style="font-size: 15px; background: rgba(239, 68, 68, 0.05); padding: 15px; border-radius: 8px; border-right: 4px solid var(--danger); margin-bottom: 0; line-height: 1.7;">
                <strong>💡 خطة التغيير السريعة:</strong><br>
                1. طبّق قاعدة (80/20) في المكالمات: استمع 80% من الوقت وتحدث 20% فقط لتشخيص الملف بدقة.<br>
                2. ادرس الفروقات الكبرى بين الدورات على الموقع، خاصة الفارق بين دورات المبتدئين ودورات الخبراء، والحلول الذكية للرد على اعتراض السعر بالقيمة المضافة لمران.
            </p>
        `;
    }

    analysisHTML += `</div>`;
    container.innerHTML = analysisHTML;
}

function showResultsPage(name, score, needIdentMistakes, courseMapMistakes) {
    document.getElementById('quiz-view').style.display = 'none';
    document.getElementById('result-view').style.display = 'block';
    
    document.getElementById('employee-greeting').innerText = `أهلاً بك يا ${name}، لقد أتممت الاختبار بنجاح وتم تسجيل النتيجة بمستندات الإدارة.`;
    
    let percentage = todayQuestions.length > 0 ? Math.round((score / todayQuestions.length) * 100) : 0;
    document.getElementById('percentageCircle').innerHTML = `${percentage}% <span>النسبة المئوية</span>`;
    document.getElementById('totalScoreText').innerText = `مجموع إجاباتك الصحيحة هو: ${score} من أصل ${todayQuestions.length} سؤال.`;
    
    generatePerformanceAnalysis(needIdentMistakes, courseMapMistakes);

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

function resetQuizToHome() {
    if (timerInterval) clearInterval(timerInterval);
    
    timeLeft = 900;
    currentQuestionIndex = 0;
    furthestQuestionReached = 0;
    userAnswers = {};
    
    document.getElementById('employee-name').value = "";
    document.getElementById('progressBarFill').style.width = "0%";
    document.getElementById('progressPercent').innerText = "0%";
    document.getElementById('timerBox').classList.remove('urgent');
    
    document.getElementById('result-view').style.display = 'none';
    document.getElementById('login-view').style.display = 'block';
}
