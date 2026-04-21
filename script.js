// script.js
const ARABIC_LETTERS = ['أ', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'هـ', 'و', 'ي'];

// DOM Elements
const hexGrid = document.getElementById('hexGrid');
const gridSizeSelect = document.getElementById('gridSizeSelect');
const startGameBtn = document.getElementById('startGameBtn');
const questionModal = document.getElementById('questionModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const questionText = document.getElementById('questionText');
const modalLetterDisplay = document.getElementById('modalLetterDisplay');
const refreshQuestionBtn = document.getElementById('refreshQuestionBtn');
const awardGreenBtn = document.getElementById('awardGreenBtn');
const awardOrangeBtn = document.getElementById('awardOrangeBtn');
const winnerModal = document.getElementById('winnerModal');
const winnerTeamName = document.getElementById('winnerTeamName');
const playAgainBtn = document.getElementById('playAgainBtn');

// Game State
let gridSize = 5;
let boardState = []; // 2D array: 0=empty, 1=green, 2=orange
let activeHexDetails = null;
let currentQuestionIndex = -1;
let askedQuestions = new Set(); // Track indices of asked questions

// Initialization
function initGame() {
    gridSize = parseInt(gridSizeSelect.value);
    hexGrid.className = 'hex-grid grid-size-' + gridSize;
    generateBoard(gridSize);
    askedQuestions.clear();
    winnerModal.classList.add('hidden');
}

// Generate the Honeycomb Board
function generateBoard(size) {
    hexGrid.innerHTML = '';
    boardState = Array(size).fill(null).map(() => Array(size).fill(0));
    
    // Shuffle alphabets to pick random letters for the board
    let shuffledLetters = [...ARABIC_LETTERS].sort(() => 0.5 - Math.random());
    let letterIndex = 0;

    for (let row = 0; row < size; row++) {
        let rowDiv = document.createElement('div');
        rowDiv.classList.add('hex-row');

        for (let col = 0; col < size; col++) {
            let letter = shuffledLetters[letterIndex % shuffledLetters.length];
            letterIndex++;

            let hexWrapper = document.createElement('div');
            hexWrapper.classList.add('hex-wrapper');
            hexWrapper.dataset.row = row;
            hexWrapper.dataset.col = col;

            let hexInner = document.createElement('div');
            hexInner.classList.add('hex-inner');

            let hexLetter = document.createElement('div');
            hexLetter.classList.add('hex-letter');
            hexLetter.textContent = letter;

            hexInner.appendChild(hexLetter);
            hexWrapper.appendChild(hexInner);

            hexWrapper.addEventListener('click', () => handleHexClick(row, col, hexWrapper, letter));
            rowDiv.appendChild(hexWrapper);
        }
        hexGrid.appendChild(rowDiv);
    }
    
    // Check if we need to add board edges for clarity. For now, the objective is implied in header.
}

// Hex Click Handler
function handleHexClick(row, col, hexElement, letter) {
    // Prevent clicking already won hexagons
    if (boardState[row][col] !== 0) return;

    activeHexDetails = { row, col, element: hexElement, letter };
    modalLetterDisplay.textContent = letter;
    
    loadNewQuestion();
    openModal();
}

// Question Management
function getUnaskedQuestion() {
    if (askedQuestions.size >= questionBank.length) {
        askedQuestions.clear(); // Reset if all used
    }

    let availableIndices = questionBank.map((_, i) => i).filter(i => !askedQuestions.has(i));
    let randomIdx = availableIndices[Math.floor(Math.random() * availableIndices.length)];
    askedQuestions.add(randomIdx);
    return questionBank[randomIdx];
}

function loadNewQuestion() {
    const q = getUnaskedQuestion();
    questionText.textContent = q.text;
}

// Modal Controls
function openModal() {
    questionModal.classList.remove('hidden');
}

function closeModal() {
    questionModal.classList.add('hidden');
    activeHexDetails = null;
}

// Awarding Hexagons
function awardHexagon(teamNumber) { // 1 = Green, 2 = Orange
    if (!activeHexDetails) return;

    const { row, col, element } = activeHexDetails;
    boardState[row][col] = teamNumber;
    
    if (teamNumber === 1) {
        element.classList.add('state-green');
    } else {
        element.classList.add('state-orange');
    }

    closeModal();
    checkWinCondition();
}

// Win Condition Check (Pathfinding)
function checkWinCondition() {
    // Team 1 (Green) needs to connect Left (col 0) to Right (col size-1)
    // Team 2 (Orange) needs to connect Top (row 0) to Bottom (row size-1)
    
    if (checkPath(1, 'left-right')) {
        showWinner('الفريق الأخضر', 'var(--green-team)');
    } else if (checkPath(2, 'top-bottom')) {
        showWinner('الفريق البرتقالي', 'var(--orange-team)');
    }
}

function checkPath(teamId, direction) {
    const size = gridSize;
    let visited = Array(size).fill(null).map(() => Array(size).fill(false));
    let queue = [];

    // Find starting nodes based on direction and honeycomb staggered layout structure
    // Since rows are staggered: 
    // Top is row=0
    // Bottom is row=size-1
    // Leftmost depends on row (since even rows are shifted right graphically) but for topological simplicity: 
    // Left is col=0 for all rows
    // Right is col=size-1 for all rows
    
    if (direction === 'left-right') {
        for (let r = 0; r < size; r++) {
            if (boardState[r][0] === teamId) {
                queue.push({r: r, c: 0});
                visited[r][0] = true;
            }
        }
    } else { // top-bottom
        for (let c = 0; c < size; c++) {
            if (boardState[0][c] === teamId) {
                queue.push({r: 0, c: c});
                visited[0][c] = true;
            }
        }
    }

    // Honeycomb adjacent neighbors:
    // In a flat-topped staggered setup: 
    // Even rows shift right, odd shift left relative to each other...
    // Let's use standard hexagon axial directions or simplify to physical offsets:
    // For a row offset honeycomb (even rows shifted right):
    // Neighbors of (r, c) depend on parity of r.
    const getNeighbors = (r, c) => {
        let neighbors = [];
        // Left and Right are constant
        if (c > 0) neighbors.push({r: r, c: c - 1});
        if (c < size - 1) neighbors.push({r: r, c: c + 1});
        
        // Top and Bottom depend on row parity
        if (r % 2 === 0) {
            // Even row
            if (r > 0) neighbors.push({r: r - 1, c: c}); // top-left
            if (r > 0 && c < size - 1) neighbors.push({r: r - 1, c: c + 1}); // top-right
            if (r < size - 1) neighbors.push({r: r + 1, c: c}); // bottom-left
            if (r < size - 1 && c < size - 1) neighbors.push({r: r + 1, c: c + 1}); // bottom-right
        } else {
            // Odd row
            if (r > 0 && c > 0) neighbors.push({r: r - 1, c: c - 1}); // top-left
            if (r > 0) neighbors.push({r: r - 1, c: c}); // top-right
            if (r < size - 1 && c > 0) neighbors.push({r: r + 1, c: c - 1}); // bottom-left
            if (r < size - 1) neighbors.push({r: r + 1, c: c}); // bottom-right
        }
        return neighbors;
    };

    // BFS
    while (queue.length > 0) {
        let curr = queue.shift();
        
        // Check if reached destination
        if (direction === 'left-right' && curr.c === size - 1) return true;
        if (direction === 'top-bottom' && curr.r === size - 1) return true;

        let neighbors = getNeighbors(curr.r, curr.c);
        for (let n of neighbors) {
            if (boardState[n.r][n.c] === teamId && !visited[n.r][n.c]) {
                visited[n.r][n.c] = true;
                queue.push(n);
            }
        }
    }

    return false;
}

// Winner Logic
function showWinner(teamName, color) {
    winnerTeamName.textContent = teamName + ' فاز واكتمل المسار!';
    winnerTeamName.style.color = color;
    winnerModal.classList.remove('hidden');
    // Implement simple confetti or let the CSS animation handle the pulse
}

// Event Listeners
startGameBtn.addEventListener('click', initGame);
closeModalBtn.addEventListener('click', closeModal);
refreshQuestionBtn.addEventListener('click', loadNewQuestion);

awardGreenBtn.addEventListener('click', () => awardHexagon(1));
awardOrangeBtn.addEventListener('click', () => awardHexagon(2));

playAgainBtn.addEventListener('click', () => {
    winnerModal.classList.add('hidden');
    initGame();
});

// Start initial game
initGame();
