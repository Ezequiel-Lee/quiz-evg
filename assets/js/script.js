import { quizQuestions as data } from "./data.js";

// DOM Elements
const startScreen = document.getElementById("start-screen");
const quizScreen = document.getElementById("quiz-screen");
const resultScreen = document.getElementById("result-screen");
const startButton = document.getElementById("start-btn");
const questionText = document.getElementById("question-text");
const answersContainer = document.getElementById("answers-container");
const currentQuestionSpan = document.getElementById("current-question");
const totalQuestionsSpan = document.getElementById("total-questions");
const scoreSpan = document.getElementById("score");
const finalScoreSpan = document.getElementById("final-score");
const resultMessage = document.getElementById("result-message");
const restartButton = document.getElementById("restart-btn");
const progressBar = document.getElementById("progress");
const cancelBtn = document.getElementById("cancel-btn");
const cancelBtnResult = document.getElementById("cancel-btn-result");
const diffButtons = document.querySelectorAll(".diff-btn");
const timerRing = document.getElementById("timer-ring");
const timerText = document.getElementById("timer-text");
const rankingBtn = document.getElementById("ranking-btn");
const rankingModal = document.getElementById("ranking-modal");
const closeRanking = document.getElementById("close-ranking");
const rankingList = document.getElementById("ranking-list");
const rulesCard = document.getElementById("rules-card");
const survivalModal = document.getElementById("survival-modal");
const cancelSurvivalBtn = document.getElementById("cancel-survival");
const startSurvivalBtn = document.getElementById("start-survival");
const clearRankingBtn = document.getElementById("clear-ranking");
const confirmClearModal = document.getElementById("confirm-clear-modal");
const confirmClearBtn = document.getElementById("confirm-clear");
const cancelClearBtn = document.getElementById("cancel-clear");
const toastMessage = document.getElementById("toast-message");
const lockHardModal = document.getElementById("lock-hard-modal");
const cancelLockHardBtn = document.getElementById("cancel-lock-hard");
const goMediumBtn = document.getElementById("go-medium");

const correctSound = new Audio("./assets/audio/right.mp3");
correctSound.preload = "auto";

const errorSound = new Audio("./assets/audio/error.mp3");
errorSound.preload = "auto";

const removeSound = new Audio("./assets/audio/remove.mp3");
removeSound.preload = "auto";

// state
let quizQuestions = [];
let allQuestions = data;
let currentQuestionIndex = 0;
let score = 0;
let answersDisabled = false;
let selectedDifficulty = "easy";
let timer;
let timeLeft = 0;
let mediumAlmostDoneToast = false;
let survivalMode = false;

const rulesByDifficulty = {
    easy: `
        🟢 Regras do Iniciante <br><br>
        • 7 perguntas<br>
        • 3 alternativas<br>
        • 7 segundos<br>
        • Perguntas mais simples
    `,
    medium: `
        🟡 Regras do Habilidoso <br><br>
        • 10 perguntas<br>
        • 4 alternativas<br>
        • 10 segundos<br>
        • Perguntas mais complicadas
    `,
    hard: `
        🔴 Regras do Mestre <br><br>
        • 12 perguntas<br>
        • 5 alternativas<br>
        • 15 segundos<br>
        • Perguntas muito mais difíceis<br>
        • Acertar mínimo 70% do Médio<br>
        • Se fizer 100% tem surpresa
    `
};

totalQuestionsSpan.textContent = quizQuestions.length;

// event listeners
diffButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
        diffButtons.forEach((b) => b.classList.remove("active"));

        btn.classList.add("active");
        selectedDifficulty = btn.dataset.diff;

        updateRules();
    });
});

cancelLockHardBtn.addEventListener("click", () => {
    lockHardModal.classList.remove("active");
});

goMediumBtn.addEventListener("click", () => {

    selectedDifficulty = "medium";

    diffButtons.forEach(btn => {
        btn.classList.remove("active");
        if (btn.dataset.diff === "medium") {
            btn.classList.add("active");
        }
    });

    updateRules();

    setTimeout(() => {
        lockHardModal.classList.remove("active");

        setTimeout(() => {
            startQuiz();
        }, 150);

    }, 300);
});

startButton.addEventListener("click", () => {
    setTimeout(() => {

        if (selectedDifficulty === "hard" && !isHardUnlocked()) {
            playSound(errorSound, 0.5);
            lockHardModal.classList.add("active");
            return;
        }

        startQuiz();
    }, 350);
});

restartButton.addEventListener("click", () => {
    setTimeout(() => {
        restartQuiz();
    }, 350);
});

cancelBtn.addEventListener("click", () => {
    setTimeout(() => {
        goToStart();
        updateRules();
    }, 350);

});

cancelBtnResult.addEventListener("click", () => {
    setTimeout(() => {
        goToStart();
        updateRules();
    }, 350);

});

cancelSurvivalBtn.addEventListener("click", () => {
    survivalModal.classList.remove("active");
    goToStart();
});

startSurvivalBtn.addEventListener("click", () => {
    survivalModal.classList.remove("active");
    startSurvivalMode();
});

rankingBtn.addEventListener("click", () => {
    loadRanking();
    updateClearButtonVisibility();
    rankingModal.classList.add("active");
});

closeRanking.addEventListener("click", () => {
    rankingModal.classList.remove("active");
});

clearRankingBtn.addEventListener("click", () => {
    confirmClearModal.classList.add("active");
});

cancelClearBtn.addEventListener("click", () => {
    rankingModal.classList.remove("active");
    confirmClearModal.classList.remove("active");
});

confirmClearBtn.addEventListener("click", () => {
    playSound(removeSound, 0.3);
    clearRanking();
});

// Functions

// Atualiza o card de regras baseado na dificuldade selecionada
function updateRules() {
    rulesCard.innerHTML = rulesByDifficulty[selectedDifficulty];
}

// Toca um som com volume configurável
function playSound(sound, volume = 1) {
    sound.currentTime = 0;
    sound.volume = volume;
    sound.play().catch(() => {});
}

// Volta para a tela inicial e reseta estado
function goToStart() {
    quizScreen.classList.remove("active");
    resultScreen.classList.remove("active");
    startScreen.classList.add("active");

    selectedDifficulty = "easy";

    diffButtons.forEach((btn) => {
        btn.classList.remove("active");

        if (btn.dataset.diff === "easy") {
            btn.classList.add("active");
        }
    });

    clearInterval(timer);

    timerRing.style.strokeDashoffset = 0;
    timerText.textContent = getTimeByDifficulty(selectedDifficulty);
}

function isHardUnlocked() {
    const history = getRanking();

    return history.some(item => {
        if (item.difficulty !== "medium") return false;

        const total = item.total;
        const percentage = (item.score / total) * 100;

        return percentage >= 70;
    });
}

// Inicia o quiz com perguntas filtradas por dificuldade
function startQuiz() {
    currentQuestionIndex = 0;
    score = 0;
    mediumAlmostDoneToast = false;

    const filteredQuestions = allQuestions.filter(
        (q) => q.difficulty === selectedDifficulty,
    );

    quizQuestions = getQuizQuestionsByDifficulty(
        filteredQuestions,
        selectedDifficulty
    );

    totalQuestionsSpan.textContent = quizQuestions.length;
    scoreSpan.textContent = 0;

    startScreen.classList.remove("active");
    quizScreen.classList.add("active");

    showQuestion();
}

// Renderiza a pergunta atual e suas respostas
function showQuestion() {
    answersDisabled = false;

    const currentQuestion = quizQuestions[currentQuestionIndex];
    if (!currentQuestion) return;

    currentQuestionSpan.textContent = currentQuestionIndex + 1;

    const progressPercent = (currentQuestionIndex / quizQuestions.length) * 100;
    progressBar.style.width = progressPercent + "%";

    questionText.textContent = currentQuestion.question;

    answersContainer.innerHTML = "";

    const answersToShow = survivalMode
        ? getAnswersSurvival(currentQuestion.answers, currentQuestion.difficulty)
        : getAnswersNormal(currentQuestion.answers, selectedDifficulty)
    ;

    answersToShow.forEach((answer) => {
        const button = document.createElement("button");

        button.textContent = answer.text;
        button.classList.add("answer-btn");

        button.dataset.correct = answer.correct;

        button.addEventListener("click", selectAnswer);

        answersContainer.appendChild(button);
    });

    startTimer();
}

// Trata o clique do usuário em uma resposta
function selectAnswer(event) {
    if (answersDisabled) return;

    clearInterval(timer);
    answersDisabled = true;

    const selectedButton = event.target;
    const isCorrect = selectedButton.dataset.correct === "true";

    Array.from(answersContainer.children).forEach((button) => {
        if (button.dataset.correct === "true") {
            button.classList.add("correct");
        } else if (button === selectedButton) {
            button.classList.add("incorrect");

            if (!isCorrect) {
                playSound(errorSound, 0.5);

                button.classList.add("shake");
                setTimeout(() => button.classList.remove("shake"), 700);
            }
        }
    });

    if (isCorrect) {
        score++;
        scoreSpan.textContent = score;

        playSound(correctSound, 0.6);

        if (selectedDifficulty === "medium" && !survivalMode && !mediumAlmostDoneToast && !isHardUnlocked()) {
            const total = quizQuestions.length;
            const percentage = (score / total) * 100;

            if (percentage >= 70) {
                showToast("Quase lá vamos, falta pouco...");
                mediumAlmostDoneToast = true;
            }
        }
    }

    if (!isCorrect && survivalMode) {
        setTimeout(() => {
            endSurvivalMode();
        }, 1500);
        return;
    }

    const delay = isCorrect ? 1250 : 2000;

    setTimeout(() => {
        currentQuestionIndex++;

        if (currentQuestionIndex < quizQuestions.length) {
            showQuestion();
        } else {
            if (survivalMode) {
                endSurvivalMode(true);
            } else {
                showResults();
            }
        }

    }, delay);
}

// Retorna mensagem personalizada baseada em desempenho e dificuldade
function getResultMessage(percentage, difficulty) {
    const messages = {
        easy: {
            100: "“Bem-aventurados os que ouvem a palavra de Deus e a guardam.”<br><small>(Lucas 11:28)</small>",
            90: "“Aquele que perseverar até o fim será salvo.”<br><small>(Mateus 24:13)</small>",
            80: "“Quem é fiel no pouco, também é fiel no muito.”<br><small>(Lucas 16:10)</small>",
            70: "“Tudo quanto pedirdes em oração, crendo, recebereis.”<br><small>(Mateus 21:22)</small>",
            60: "“Pedi, e dar-se-vos-á; buscai, e encontrareis.”<br><small>(Mateus 7:7)</small>",
            50: "“O céu e a terra passarão, mas as minhas palavras não hão de passar.”<br><small>(Mateus 24:35)</small>",
            40: "“Não temas, crê somente.”<br><small>(Marcos 5:36)</small>",
            30: "“Quem tem ouvidos para ouvir, ouça.”<br><small>(Mateus 11:15)</small>",
            20: "“Aprendei de mim, porque sou manso e humilde de coração.”<br><small>(Mateus 11:29)</small>",
            10: "“Segue-me.”<br><small>(Mateus 9:9)</small>",
            0: "“Vinde a mim, todos os que estais cansados, e eu vos aliviarei.”<br><small>(Mateus 11:28)</small>"
        },
        medium: {
            100: "“Se permanecerdes na minha palavra, verdadeiramente sereis meus discípulos.”<br><small>(João 8:31)</small>",
            90: "“Permanecei no meu amor.”<br><small>(João 15:9)</small>",
            80: "“Conhecereis a verdade, e a verdade vos libertará.”<br><small>(João 8:32)</small>",
            70: "“Eu sou a luz do mundo; quem me segue não andará em trevas.”<br><small>(João 8:12)</small>",
            60: "“Quem me segue terá a luz da vida.”<br><small>(João 8:12)</small>",
            50: "“Bem-aventurados os limpos de coração, porque verão a Deus.”<br><small>(Mateus 5:8)</small>",
            40: "“No mundo tereis aflições; mas tende bom ânimo.”<br><small>(João 16:33)</small>",
            30: "“Vigiai e orai.”<br><small>(Mateus 26:41)</small>",
            20: "“Quem quiser vir após mim, negue-se a si mesmo.”<br><small>(Lucas 9:23)</small>",
            10: "“Onde está o teu tesouro, aí estará também o teu coração.”<br><small>(Mateus 6:21)</small>",
            0: "“Sem fé é impossível agradar a Deus.”<br><small>(base Hebreus 11:6 — princípio alinhado)</small>"
        },
        hard: {
            100: "“Tudo é possível ao que crê.”<br><small>(Marcos 9:23)</small>",
            90: "“Pai, nas tuas mãos entrego o meu espírito.”<br><small>(Lucas 23:46)</small>",
            80: "“Eu sou o caminho, a verdade e a vida.”<br><small>(João 14:6)</small>",
            70: "“Quem crê em mim, ainda que morra, viverá.”<br><small>(João 11:25)</small>",
            60: "“Permanecei em mim, e eu permanecerei em vós.”<br><small>(João 15:4)</small>",
            50: "“Quem perder a sua vida por amor de mim a encontrará.”<br><small>(Mateus 16:25)</small>",
            40: "“Quem perseverar até o fim será salvo.”<br><small>(Mateus 24:13)</small>",
            30: "“O espírito está pronto, mas a carne é fraca.”<br><small>(Mateus 26:41)</small>",
            20: "“Vós sois a luz do mundo.”<br><small>(Mateus 5:14)</small>",
            10: "“Sem mim nada podeis fazer.”<br><small>(João 15:5)</small>",
            0: "“Por que me chamais Senhor, Senhor, e não fazeis o que eu digo?”<br><small>(Lucas 6:46)</small>"
        }
    };

    if (percentage === 100) return messages[difficulty][100];
    if (percentage >= 80) return messages[difficulty][80];
    if (percentage >= 60) return messages[difficulty][60];
    if (percentage >= 40) return messages[difficulty][40];

    return messages[difficulty][0];
}

// Mostra o resultado final e decide mensagens + survival
function showResults() {
    quizScreen.classList.remove("active");
    resultScreen.classList.add("active");

    finalScoreSpan.textContent = formatScoreMessage(score, quizQuestions.length);

    saveScore(score, quizQuestions.length);

    const percentage = (score / quizQuestions.length) * 100;

    if (percentage === 100 && selectedDifficulty === "hard") {
        resultMessage.innerHTML = getResultMessage(percentage, selectedDifficulty);

        launchConfetti();

        setTimeout(() => {
            resultScreen.classList.remove("active");
            survivalModal.classList.add("active");
        }, 2500);

    } else {
        resultMessage.innerHTML = getResultMessage(percentage, selectedDifficulty);

        if (percentage === 100) {
            launchConfetti();
        }
    }
}

// Formata mensagem de pontuação (ex: 3 de 7 acertos)
function formatScoreMessage(score, total) {
    if (score === 0) return "Nenhum acerto!";
    if (score === total) return "Acertou todas!";
    if (score === 1) return "1 acerto";
    return `${score} de ${total} acertos`;
}

// Reinicia o quiz mantendo dificuldade
function restartQuiz() {
    clearInterval(timer);

    resultScreen.classList.remove("active");

    startQuiz();
}

// Seleciona perguntas baseado na dificuldade (7, 8, 10)
function getQuizQuestionsByDifficulty(questions, difficulty) {
    const questionsByDifficulty = {
        easy: 7,
        medium: 10,
        hard: 12
    };

    const total = questionsByDifficulty[difficulty] || 7;

    if (difficulty === "easy") {
        const lastQuestion = questions[questions.length - 1];
        const withoutLast = questions.slice(0, -1);

        const shuffled = shuffleArray(withoutLast);
        const random = shuffled.slice(0, total - 1);

        return [...random, lastQuestion];
    }

    const shuffled = shuffleArray(questions);

    return shuffled.slice(0, total);
}

// Embaralha array (Fisher-Yates)
function shuffleArray(array) {
    const arr = [...array];

    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));

        [arr[i], arr[j]] = [arr[j], arr[i]];
    }

    return arr;
}

// Gera respostas no modo normal
function getAnswersNormal(answers, difficulty) {
    let totalAnswers = 3;

    if (difficulty === "medium") totalAnswers = 4;
    if (difficulty === "hard") totalAnswers = 5;

    const correct = answers.find(a => a.correct);

    const incorrect = answers
        .filter(a => !a.correct)
        .sort(() => Math.random() - 0.5)
        .slice(0, totalAnswers - 1);

    return [correct, ...incorrect].sort(() => Math.random() - 0.5);
}

// Gera respostas no modo sobrevivência (variação dinâmica)
function getAnswersSurvival(answers, difficulty) {
    let min = 3;
    let max = 3;

    if (difficulty === "easy") {
        min = 3;
        max = 4;
    }

    if (difficulty === "medium") {
        min = 4;
        max = 5;
    }

    if (difficulty === "hard") {
        min = 5;
        max = 5;
    }

    let totalAnswers = Math.floor(Math.random() * (max - min + 1)) + min;

    totalAnswers = Math.min(totalAnswers, answers.length);

    const correct = answers.find(a => a.correct);
    const incorrect = answers.filter(a => !a.correct)
        .sort(() => Math.random() - 0.5)
        .slice(0, totalAnswers - 1);

    return [correct, ...incorrect].sort(() => Math.random() - 0.5);
}

// Traduz dificuldade para texto
function formatDifficulty(diff) {
    if (diff === "easy") return "Iniciante";
    if (diff === "medium") return "Habilidoso";
    if (diff === "hard") return "Mestre";
    if (diff === "survival") return "survival";
}

// Retorna tempo por dificuldade
function getTimeByDifficulty(difficulty) {
    if (difficulty === "easy") return 7;
    if (difficulty === "medium") return 10;
    if (difficulty === "hard") return 15;
}

// Inicia e controla o timer da pergunta
function startTimer() {
    clearInterval(timer);

    const currentQuestion = quizQuestions[currentQuestionIndex];

    const difficulty = survivalMode
        ? currentQuestion.difficulty
        : selectedDifficulty
    ;

    const totalTime = getTimeByDifficulty(difficulty);
    timeLeft = totalTime;

    const circumference = 2 * Math.PI * 24;

    timerRing.style.strokeDasharray = circumference;
    timerRing.style.strokeDashoffset = 0;

    timerText.textContent = timeLeft;

    timer = setInterval(() => {
        timeLeft--;

        timerText.textContent = timeLeft;

        const offset = circumference * (1 - timeLeft / totalTime);

        timerRing.style.strokeDashoffset = offset;

        if (timeLeft <= 0) {
            clearInterval(timer);
            timeOut();
        }
    }, 1000);
}

// Executa quando o tempo acaba para a pergunta
function timeOut() {
    answersDisabled = true;

    Array.from(answersContainer.children).forEach((button) => {
        if (button.dataset.correct === "true") {
            button.classList.add("correct");
        }
    });

    playSound(errorSound, 0.5);

    if (survivalMode) {
        setTimeout(() => {
            endSurvivalMode();
        }, 1200);
        return;
    }

    setTimeout(() => {
        currentQuestionIndex++;

        if (currentQuestionIndex < quizQuestions.length) {
            showQuestion();
        } else {
            showResults();
        }
    }, 1000);
}

// Inicia modo sobrevivência (loop infinito)
function startSurvivalMode() {
    survivalMode = true;
    currentQuestionIndex = 0;
    score = 0;

    const easy = allQuestions.filter(q => q.difficulty === "easy");
    const medium = allQuestions.filter(q => q.difficulty === "medium");
    const hard = allQuestions.filter(q => q.difficulty === "hard");

    quizQuestions = shuffleArray([
        ...easy,
        ...medium,
        ...hard
    ]);

    totalQuestionsSpan.textContent = "∞";
    scoreSpan.textContent = 0;

    resultScreen.classList.remove("active");
    quizScreen.classList.add("active");

    showQuestion();
}

// Finaliza modo sobrevivência e salva score
function endSurvivalMode(completedAll = false) {
    survivalMode = false;

    quizScreen.classList.remove("active");
    resultScreen.classList.add("active");

    finalScoreSpan.textContent = score === 0
        ? "Nenhum acerto!"
        : `Total: ${score} acertos seguidos`
    ;

    if (completedAll) {
        resultMessage.textContent = "🏆 LENDÁRIO! Você zerou o modo sobrevivência!";
        launchConfetti();
        launchConfetti();
        launchConfetti();
    } else {
        resultMessage.textContent = "Modo sobrevivência encerrado!";
    }

    saveScore(score, "∞", true);
}

// Salva score no localStorage (top 7)
function saveScore(score, total, isSurvival = false) {
    const history = getRanking();

    const date = new Date();
    const formattedDate = `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}`;

    history.unshift({
        score,
        total,
        difficulty: isSurvival ? "survival" : selectedDifficulty,
        date: formattedDate
    });

    const lastSeven = history.slice(0, 7);

    localStorage.setItem("quiz_ranking", JSON.stringify(lastSeven));
}

// Carrega ranking na tela
function loadRanking() {
    const history = getRanking();

    rankingList.innerHTML = "";

    if (history.length === 0) {
        rankingList.innerHTML = "<li>Nenhum resultado ainda.</li>";
        return;
    }

    history.forEach((item) => {
        const li = document.createElement("li");
        li.innerHTML = `
            <strong>${formatDifficulty(item.difficulty)}</strong>
            - ${
                item.total === "∞"
                    ? `Total: ${item.score} acertos!`
                    : formatScoreMessage(item.score, item.total)
            }
            <span class="opacity">(${item.date})</span>
        `;
        rankingList.appendChild(li);
    });
}

// Anima confetti visual
function launchConfetti() {
    for (let i = 0; i < 80; i++) {
        const confetti = document.createElement("div");
        confetti.classList.add("confetti");

        confetti.style.left = Math.random() * 100 + "vw";
        confetti.style.background = `hsl(${Math.random() * 360}, 100%, 50%)`;
        confetti.style.animationDuration = (Math.random() * 2 + 1) + "s";

        document.body.appendChild(confetti);

        setTimeout(() => confetti.remove(), 2500);
    }
}

// Pega ranking do localStorage
function getRanking() {
    return JSON.parse(localStorage.getItem("quiz_ranking")) || [];
}

// Mostra/esconde botão de limpar ranking
function updateClearButtonVisibility() {
    const history = getRanking();

    if (history.length === 0) {
        clearRankingBtn.style.display = "none";
    } else {
        clearRankingBtn.style.display = "inline-block";
    }
}

// Limpa ranking com validação
function clearRanking() {
    const history = getRanking();

    if (history.length === 0) {
        confirmClearModal.classList.remove("active");
        rankingModal.classList.remove("active");
        showToast("Nenhum item para remover!");
        return;
    }

    localStorage.removeItem("quiz_ranking");

    confirmClearModal.classList.remove("active");
    rankingModal.classList.remove("active");

    updateClearButtonVisibility();

    showToast("Ranking removido com sucesso!");
}

// Mostra toast temporário
function showToast(message) {
    toastMessage.textContent = message;
    toastMessage.classList.add("show");

    setTimeout(() => {
        toastMessage.classList.remove("show");
    }, 3000);
}

updateRules();

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js")
            .then(() => console.log("SW registrado"))
            .catch((err) => console.log("Erro SW:", err))
        ;
    });
}
