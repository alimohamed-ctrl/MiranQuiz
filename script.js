const API_URL = "https://script.google.com/macros/s/AKfycbxiIoAgbzsfWSc3lCwTW9Dv-TPKyvz0VbYh8fWc_iJPpXL5R9wp3pXpeWExQLvIhqOy4w/exec";
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
        document.getElementById('themeBtn').innerText = "☀️ وضع مضيء";
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
        themeBtn.innerText = "☀️ وضع مضيء";
        localStorage.setItem('theme', 'dark');
    }
}

async function preloadQuizData() {
    try {
        const response = await fetch(API_URL);
        const rawData = await response.json();
        allQuestionsRaw = rawData;
        
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

async function startQuiz() {
    const nameInput = document.getElementById('employee-name').value.trim();
    if (!nameInput) {
        alert("تنبيه إدارة مران: يرجى كتابة اسمك الكامل أولاً قبل بدء الاختبار!");
        return;
    }
    
    employeeName = nameInput;
    const startBtn = document.getElementById('start-btn');
    startBtn.disabled = true;
    startBtn.innerText = "جاري تجهيز الاختبار... 🔄";
    document.getElementById('server-status').innerText = "يتم الآن سحب 10 أسئلة عشوائية متوازنة من بنك الأسئلة...";

    try {
        const response = await fetch(API_URL);
        todayQuestions = await response.json();
        
        if (todayQuestions.length === 0) {
            alert("تنبيه: بنك الأسئلة فارغ حالياً بملف الإدارة!");
            startBtn.disabled = false;
            startBtn.innerText = "ابدأ الاختبار الآن ⏱️";
            return;
        }

        document.getElementById('login-view').style.display = 'none';
        document.getElementById('quiz-view').style.display = 'block';

        buildQuestionNavCircles(); 
        displayCurrentQuestion(); 
        startTimer(); 
        
    } catch (error) {
        alert("🔴 عطل في الاتصال بالسيرفر، يرجى التحقق من الإنترنت وإعادة المحاولة.");
        startBtn.disabled = false;
        startBtn.innerText = "ابدأ الاختبار الآن ⏱️";
        console.error(error);
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
    
    // متغيرات رقمية صارمة للحساب الإحصائي العادل والموضوعي
    let needIdentTotal = 0;
    let needIdentMistakes = 0;
    let courseMapTotal = 0;
    let courseMapMistakes = 0;
    
    todayQuestions.forEach((q, index) => {
        let userSelection = userAnswers[index] || "";
        let qNum = index + 1;
        let correctAnswer = q.answer ? q.answer.toString().trim() : "";
        let isCorrect = userSelection === correctAnswer;
        
        // التحقق الدقيق والمطابق للنصوص الفعلية المتواجدة في صورك
        let isNeedIdent = q.question.includes("تحديد احتياج");
        let isCourseMap = q.question.includes("أي دورة مناسبة") || q.question.includes("مناسبة");

        if (isNeedIdent) needIdentTotal++;
        if (isCourseMap) courseMapTotal++;

        if (!userSelection) {
            detailsArray.push(`س${qNum}: لم يحل`);
            if (isNeedIdent) needIdentMistakes++;
            if (isCourseMap) courseMapMistakes++;
        } else {
            if (isCorrect) { 
                score++; 
                detailsArray.push(`س${qNum}: صح`); 
            } else { 
                detailsArray.push(`س${qNum}: خطأ`); 
                if (isNeedIdent) needIdentMistakes++;
                if (isCourseMap) courseMapMistakes++;
            }
        }
    });

    // تأمين صياغة المشكلة الأساسية الأربعة للإرسال السليم لجوجل شيت
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
    
    // استدعاء لوحة التحكم والتحليل الرقمي الجديد بالقيم الحقيقية الفردية للموظف
    showResultsPage(employeeName, score, needIdentTotal, needIdentMistakes, courseMapTotal, courseMapMistakes);
    
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
        console.log("تمت مزامنة السجلات بنجاح بالمشكلة: " + mainProblemValue);
    } catch (error) {
        console.error("عطل إرسال السجلات:", error);
    }
}

// محرك لوحة تحكم التحليل الاستشاري الرقمي الفردي والموضوعي بالكامل
function generatePerformanceAnalysis(needIdentTotal, needIdentMistakes, courseMapTotal, courseMapMistakes) {
    const container = document.getElementById('performance-analysis-container');
    container.innerHTML = "";

    // حساب المعادلات الرقمية لكل موظف على حدة
    let needScore = needIdentTotal > 0 ? (needIdentTotal - needIdentMistakes) : 0;
    let courseScore = courseMapTotal > 0 ? (courseMapTotal - courseMapMistakes) : 0;

    let needPercent = needIdentTotal > 0 ? Math.round((needScore / needIdentTotal) * 100) : 100;
    let coursePercent = courseMapTotal > 0 ? Math.round((courseScore / courseMapTotal) * 100) : 100;

    // تحديد الشارات التقييمية بناءً على الأرقام الحقيقية للموظف
    let needBadge = needPercent === 100 ? "👑 ممتاز (مكتمل)" : needPercent >= 70 ? "🟡 جيد" : "❌ يحتاج تطوير فوري";
    let courseBadge = coursePercent === 100 ? "👑 ممتاز (مكتمل)" : coursePercent >= 70 ? "🟡 جيد" : "❌ يحتاج تطوير فوري";

    let analysisHTML = `
        <div style="margin: 25px 0; padding: 25px; background: rgba(148, 163, 184, 0.04); border-radius: 14px; border: 1px solid var(--border-color); text-align: right;">
            <h3 style="margin-top: 0; color: var(--primary); font-size: 18px; border-bottom: 2px solid var(--border-color); padding-bottom: 10px;">📊 لوحة التحليل ومؤشرات الأداء المباشرة (KPIs):</h3>
            
            <div class="kpi-card">
                <span class="kpi-title">🎯 محور تشخيص وتحديد احتياج العميل:</span>
                <span class="kpi-score" style="color: ${needPercent >= 70 ? 'var(--success)' : 'var(--danger)'}">${needScore} من ${needIdentTotal} صحيح (${needPercent}%) - ${needBadge}</span>
            </div>
            
            <div class="kpi-card">
                <span class="kpi-title">💡 محور ربط وتوجيه الدورة التدريبية الحل:</span>
                <span class="kpi-score" style="color: ${coursePercent >= 70 ? 'var(--success)' : 'var(--danger)'}">${courseScore} من ${courseMapTotal} صحيح (${coursePercent}%) - ${courseBadge}</span>
            </div>
            
            <h4 style="margin: 20px 0 10px 0; color: var(--primary); font-size: 16px;">💡 التوصيات الاستشارية المخصصة لأدائك:</h4>
    `;

    // سيناريو 1: الموظف عبقري وبدون أي أخطاء
    if (needIdentMistakes === 0 && courseMapMistakes === 0) {
        analysisHTML += `
            <p style="font-weight: 700; color: var(--success); font-size: 15px;">🥇 كفاءة استشارية متكاملة ومثالية!</p>
            <p style="font-size: 14px; margin-bottom: 0; color: var(--text-muted);">أنت مستمع رائع وتحدد الفجوة التدريبية للعملاء الأفراد بدقة متناهية، ولديك براعة كاملة في مطابقة تحدياتهم مع الحقائب والاعتمادات الدولية الصحيحة بمركز مران القادة. حافظ على هذا المستوى الرفيع!</p>
        `;
    } 
    // سيناريو 2: أخطاء في تحديد الاحتياج فقط
    else if (needIdentMistakes > 0 && courseMapMistakes === 0) {
        analysisHTML += `
            <p style="font-weight: 700; color: #eab308; font-size: 15px;">⚠️ فجوة موضوعية في مهارة "استكشاف الاحتياج والتشخيص الأولي"</p>
            <p style="font-size: 14px; color: var(--text-muted);">أرقامك تدل على معرفتك الممتازة بكتالوج دورات مران القادة، ولكن تقع في خطأ الاستعجال بترشيح الدورة قبل التغلغل في خلفية العميل المهنية (مثل التسرع في ترشيح دورات مخصصة للخبراء لخريج جديد، أو العكس).</p>
            <p style="font-size: 14px; background: rgba(2, 132, 199, 0.04); padding: 12px; border-radius: 8px; border-right: 4px solid var(--primary); margin-bottom: 0;">
                <strong>💡 الخطة التطويرية:</strong> في مكالماتك القادمة، ركّز على طرح 3 أسئلة استكشافية إجبارية قبل ذكر أي دورة: (وش طبيعة تخصصك أو دراستك؟، كم سنة خبرة عندك بالمنصب؟، وش الهدف الأكبر اللي تبي الشهادة توصله لك؟).
            </p>
        `;
    } 
    // سيناريو 3: أخطاء في ربط الدورة فقط (الحالة الظاهرة في صورتك)
    else if (needIdentMistakes === 0 && courseMapMistakes > 0) {
        analysisHTML += `
            <p style="font-weight: 700; color: #eab308; font-size: 15px;">⚠️ فجوة موضوعية في مهارة "مطابقة وربط الدورة الحل بالوجع الحقيقي"</p>
            <p style="font-size: 14px; color: var(--text-muted);">أنت تستمع بشكل رائع للعميل الفردي وتكتشف مشكلته بدقة، ولكن تقع في خطأ ترشيح "المنتج التدريبي أو الشهادة غير المطابقة هندسياً وتقنياً" لمعالجة وجعه (مثل ترشيح دورة الذكاء الاصطناعي لعميلة تبحث عن إعلانات السوشيال ميديا لزيادة طلبات متجر العطور!).</p>
            <p style="font-size: 14px; background: rgba(2, 132, 199, 0.04); padding: 12px; border-radius: 8px; border-right: 4px solid var(--primary); margin-bottom: 0;">
                <strong>💡 الخطة التطويرية:</strong> تحتاج فوراً إلى دراسة "المخرجات والحلول الدقيقة" لكل دورة بمركز مران. تذكر دائماً: العميل الذي يشكو من ضعف مبيعات متجره الإلكتروني أو حملات السوشيال ميديا؛ يحتاج فوراً إلى <strong>(دورة التسويق الرقمي DMI)</strong> وليس الذكاء الاصطناعي أو تحليل البيانات. ادرس الفروقات الكبرى على موقع المركز لترشح الأداة الحل.
            </p>
        `;
    } 
    // سيناريو 4: فجوة في الاثنين معاً
    else {
        analysisHTML += `
            <p style="font-weight: 700; color: var(--danger); font-size: 15px;">❌ فجوة مركبة تحتاج معالجة سريعة (في تشخيص المشكلة وربط الحل التدريبي)</p>
            <p style="font-size: 14px; color: var(--text-muted);">النتائج الرقمية توضح وجود تسرع في توجيه مكالمة العميل البيعية دون استماع حقيقي، مع ضعف في التمييز الفني بين مخرجات الشهادات المعتمدة بالمركز.</p>
            <p style="font-size: 14px; background: rgba(239, 68, 68, 0.04); padding: 14px; border-radius: 8px; border-right: 4px solid var(--danger); margin-bottom: 0;">
                <strong>💡 الخطة التطويرية الشاملة:</strong><br>
                1. التزم بالاستماع بنسبة 80% من المكالمة، واكتب أوجاع العميل الفردي على ورقة أمَامك قبل الحديث.<br>
                2. ادرس الفروق بين تخصصات المركز (مثل الفارق بين التسويق الرقمي للشركات الناشئة والمتاجر، وبين تحليل البيانات للإداريين، والموارد البشرية للمبتدئين).
            </p>
        `;
    }

    analysisHTML += `</div>`;
    container.innerHTML = analysisHTML;
}

function showResultsPage(name, score, needIdentTotal, needIdentMistakes, courseMapTotal, courseMapMistakes) {
    document.getElementById('quiz-view').style.display = 'none';
    document.getElementById('result-view').style.display = 'block';
    
    document.getElementById('employee-greeting').innerText = `أهلاً بك يا ${name}، لقد أتممت الاختبار بنجاح وتم تسجيل النتيجة بمستندات الإدارة.`;
    
    let percentage = todayQuestions.length > 0 ? Math.round((score / todayQuestions.length) * 100) : 0;
    document.getElementById('percentageCircle').innerHTML = `${percentage}% <span>النسبة المئوية</span>`;
    document.getElementById('totalScoreText').innerText = `مجموع إجاباتك الصحيحة هو: ${score} من أصل ${todayQuestions.length} سؤال.`;
    
    // تمرير المتغيرات الحقيقية لتوليد لوحة تحكم الـ KPI الفردية الصارمة للموظف
    generatePerformanceAnalysis(needIdentTotal, needIdentMistakes, courseMapTotal, courseMapMistakes);

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
