let currentQuestionIndex = 0;
let score = 0;
let lives = 3;
let selectedAnswer = null;
let totalQuestions = 0;
let quizData = {};

async function fetchQuizData() {
    const maxRetries = 5;
    const baseDelay = 2000; // Start with 2 second delay
    const maxDelay = 32000; // Maximum delay of 32 seconds

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            // Add cache-busting parameter to prevent cached 429 responses
            const timestamp = new Date().getTime();
            const response = await fetch(`https://opentdb.com/api.php?amount=20&_=${timestamp}`);

            if (!response.ok) {
                if (response.status === 429) {
                    // Calculate exponential backoff delay
                    const backoffDelay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
                    console.log(`Rate limit hit. Waiting ${backoffDelay/1000} seconds before retry ${attempt}/${maxRetries}`);
                    
                    // Get retry-after header if available
                    const retryAfter = response.headers.get('Retry-After');
                    const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : backoffDelay;
                    
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    continue;
                } else {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
            }

            const data = await response.json();
            
            if (data.response_code !== 0) {
                throw new Error(`API Error: Response code ${data.response_code}`);
            }

            // Store the fetched data in the global quizData variable
            quizData = {
                id: 60,
                title: "General Knowledge Quiz",
                topic: "General Knowledge",
                duration: 15,
                negative_marks: "1.0",
                correct_answer_marks: "4.0",
                questions_count: data.results.length,
                questions: data.results.map((item, index) => ({
                    id: index + 1,
                    description: decodeHTMLEntities(item.question),
                    options: [
                        ...item.incorrect_answers.map(answer => ({
                            id: Math.random(),
                            description: decodeHTMLEntities(answer),
                            is_correct: false
                        })),
                        {
                            id: Math.random(),
                            description: decodeHTMLEntities(item.correct_answer),
                            is_correct: true
                        }
                    ].sort(() => Math.random() - 0.5)
                }))
            };

            initializeQuiz(); // Now just call initializeQuiz without parameters
            return; // Exit successfully

        } catch (error) {
            console.error(`Attempt ${attempt}/${maxRetries} failed:`, error);
            if (attempt === maxRetries) {
                showError(`Failed to fetch quiz data after ${maxRetries} attempts. Please try again later.`);
            }
        }
    }
}

// Helper function to decode HTML entities in the API response
function decodeHTMLEntities(text) {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
}

// Keep your existing quiz functions but remove the quizData parameter from initializeQuiz()
function initializeQuiz() {
    if (!quizData || !quizData.questions || !Array.isArray(quizData.questions)) {
        showError("Quiz data not properly loaded");
        return;
    }

    totalQuestions = quizData.questions.length;
    document.getElementById('quiz-topic').textContent = quizData.topic || 'General Quiz';
    document.getElementById('total-questions').textContent = totalQuestions;
    document.getElementById('time-limit').textContent = quizData.duration || '--';
    document.getElementById('total-questions-quiz').textContent = totalQuestions;
}

// Show error message
function showError(message) {
    const container = document.querySelector('.container');
    container.innerHTML = `
        <div class="error-message" style="text-align: center; color: red; padding: 20px;">
            <h2>Error</h2>
            <p>${message}</p>
            <button class="start-btn" onclick="location.reload()">Reload Quiz</button>
        </div>
    `;
}

// Start quiz
function startQuiz() {
    if (totalQuestions === 0) {
        showError("No questions available");
        return;
    }
    document.querySelector('.welcome-screen').style.display = 'none';
    document.querySelector('.quiz-container').style.display = 'block';
    loadQuestion();
}

// Load question
function loadQuestion() {
    if (currentQuestionIndex >= totalQuestions) {
        endQuiz();
        return;
    }

    const question = quizData.questions[currentQuestionIndex];
    if (!question || !question.description || !Array.isArray(question.options)) {
        showError("Invalid question data");
        return;
    }

    document.getElementById('question-text').textContent = question.description;
    document.getElementById('current-question').textContent = currentQuestionIndex + 1;

    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';

    question.options.forEach((option, index) => {
        if (option && option.description !== undefined) {
            const button = document.createElement('button');
            button.className = 'option-btn';
            button.textContent = option.description;
            button.onclick = () => selectOption(index, option.is_correct);
            optionsContainer.appendChild(button);
        }
    });

    updateProgress();
}

// Select option
function selectOption(index, isCorrect) {
    if (selectedAnswer !== null) return;
    selectedAnswer = index;

    const options = document.querySelectorAll('.option-btn');
    const selectedButton = options[index];

    options.forEach(button => button.disabled = true);

    if (isCorrect) {
        selectedButton.classList.add('correct');
        updateScore(true);
    } else {
        selectedButton.classList.add('wrong');
        options.forEach((button, i) => {
            if (quizData.questions[currentQuestionIndex].options[i].is_correct) {
                button.classList.add('correct');
            }
        });
        updateLives();
    }

    document.querySelector('.next-btn').style.display = 'block';
}

// Update score
function updateScore(correct) {
    if (correct) {
        const points = parseInt(quizData.correct_answer_marks) || 1;
        score += points;
        document.getElementById('score').textContent = score;
        document.getElementById('score').classList.add('score-animation');
        setTimeout(() => {
            document.getElementById('score').classList.remove('score-animation');
        }, 500);
    }
}

// Update lives
function updateLives() {
    lives--;
    const lifeElements = document.querySelectorAll('.life');
    if (lives >= 0 && lives < lifeElements.length) {
        lifeElements[lives].classList.add('lost');
    }

    if (lives <= 0) {
        endQuiz();
    }
}

// Update progress
function updateProgress() {
    const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;
    document.querySelector('.progress').style.width = `${progress}%`;
}

// Next question
function nextQuestion() {
    selectedAnswer = null;
    currentQuestionIndex++;

    if (currentQuestionIndex >= totalQuestions) {
        endQuiz();
    } else {
        document.querySelector('.next-btn').style.display = 'none';
        loadQuestion();
    }
}

// End quiz
function endQuiz() {
    document.querySelector('.quiz-container').style.display = 'none';
    document.querySelector('.result-screen').style.display = 'block';
    document.getElementById('final-score').textContent = score;
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    const startButton = document.querySelector('.start-btn');
    const nextButton = document.querySelector('.next-btn');

    if (startButton) {
        startButton.addEventListener('click', startQuiz);
    }

    if (nextButton) {
        nextButton.addEventListener('click', nextQuestion);
    }

    fetchQuizData(); // Fetch data from API when page loads
});
