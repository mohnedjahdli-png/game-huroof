// presenter.js

// Setup UI elements
const setupScreen = document.getElementById('setupScreen');
const gameScreen = document.getElementById('gameScreen');
const t1ColorPicker = document.getElementById('t1ColorPicker');
const t2ColorPicker = document.getElementById('t2ColorPicker');
const gridSizeSelect = document.getElementById('gridSizeSelect');
const startGameBtn = document.getElementById('startGameBtn');
const resetGameBtn = document.getElementById('resetGameBtn');
const hexGrid = document.getElementById('hexGrid');

const questionModal = document.getElementById('questionModal');
const closeQuestionBtn = document.getElementById('closeQuestionBtn');
const modalLetterDisplay = document.getElementById('modalLetterDisplay');
const questionText = document.getElementById('questionText');
const answerText = document.getElementById('answerText');
const awardT1Btn = document.getElementById('awardT1Btn');
const awardT2Btn = document.getElementById('awardT2Btn');
const refreshQuestionBtn = document.getElementById('refreshQuestionBtn');
const btnT1Name = document.getElementById('btnT1Name');
const btnT2Name = document.getElementById('btnT2Name');

// Setup Colors
let selectedT1Color = PRESET_COLORS[2].hex; // Green default
let selectedT2Color = PRESET_COLORS[4].hex; // Orange default

function initSetup() {
    // Populate Color Pickers
    PRESET_COLORS.forEach(c => {
        let btn1 = document.createElement('div');
        btn1.className = 'color-swatch';
        btn1.style.backgroundColor = c.hex;
        btn1.title = c.name;
        if (c.hex === selectedT1Color) btn1.classList.add('selected');
        btn1.onclick = () => {
            selectedT1Color = c.hex;
            document.querySelectorAll('#t1ColorPicker .color-swatch').forEach(b => b.classList.remove('selected'));
            btn1.classList.add('selected');
            document.querySelector('.team-setup-card.border-green').style.borderColor = c.hex;
        };
        t1ColorPicker.appendChild(btn1);

        let btn2 = document.createElement('div');
        btn2.className = 'color-swatch';
        btn2.style.backgroundColor = c.hex;
        btn2.title = c.name;
        if (c.hex === selectedT2Color) btn2.classList.add('selected');
        btn2.onclick = () => {
            selectedT2Color = c.hex;
            document.querySelectorAll('#t2ColorPicker .color-swatch').forEach(b => b.classList.remove('selected'));
            btn2.classList.add('selected');
            document.querySelector('.team-setup-card.border-orange').style.borderColor = c.hex;
        };
        t2ColorPicker.appendChild(btn2);
    });

    // Check if there is an active game in localstorage
    const saved = localStorage.getItem('huroof_state');
    if (saved) {
        let state = JSON.parse(saved);
        if (state && state.boardState.length > 0) {
            setupScreen.classList.add('hidden');
            gameScreen.classList.remove('hidden');
            renderPresenterBoard();
        }
    }
}

startGameBtn.addEventListener('click', () => {
    const t1Name = document.getElementById('t1Name').value || 'الفريق الأول';
    const t2Name = document.getElementById('t2Name').value || 'الفريق الثاني';
    const size = parseInt(gridSizeSelect.value);

    // Generate random board letters
    let letterArray = [];
    let shuffled = [...ARABIC_LETTERS].sort(() => 0.5 - Math.random());
    let idx = 0;
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            letterArray.push({ row: r, col: c, char: shuffled[idx % shuffled.length] });
            idx++;
        }
    }

    const newState = {
        gridSize: size,
        team1: { name: t1Name, color: selectedT1Color },
        team2: { name: t2Name, color: selectedT2Color },
        boardState: Array(size).fill(null).map(() => Array(size).fill(0)),
        boardLetters: letterArray,
        winner: null,
        usedQuestions: []
    };

    saveGameState(newState);
    
    setupScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    renderPresenterBoard();
});

resetGameBtn.addEventListener('click', () => {
    if(confirm('هل أنت متأكد من مسح اللعبة والبدء من جديد؟')) {
        localStorage.removeItem('huroof_state');
        location.reload();
    }
});


// ---------------------------------
// PRESENTER GAME LOGIC
// ---------------------------------
let activeHex = null; // {r, c, char}

function renderPresenterBoard() {
    const state = getGameState();
    applyTeamColors(); // applies colors to CSS root variables matching presenter view
    
    btnT1Name.textContent = state.team1.name;
    btnT2Name.textContent = state.team2.name;
    awardT1Btn.style.backgroundColor = state.team1.color;
    awardT2Btn.style.backgroundColor = state.team2.color;

    // Added visual banners for presenter screen header
    const pBanner1 = document.getElementById('pTeam1Banner');
    const pBanner2 = document.getElementById('pTeam2Banner');
    if(pBanner1) {
        pBanner1.textContent = state.team1.name;
        pBanner1.style.backgroundColor = state.team1.color;
        pBanner1.style.color = 'white';
        pBanner1.style.borderRadius = '30px';
        pBanner1.style.padding = '10px 30px';
    }
    if(pBanner2) {
        pBanner2.textContent = state.team2.name;
        pBanner2.style.backgroundColor = state.team2.color;
        pBanner2.style.color = 'white';
        pBanner2.style.borderRadius = '30px';
        pBanner2.style.padding = '10px 30px';
    }

    hexGrid.innerHTML = '';
    document.documentElement.style.setProperty('--grid-size', state.gridSize);

    for (let r = 0; r < state.gridSize; r++) {
        const rowDiv = document.createElement('div');
        rowDiv.classList.add('hex-row');
        
        for (let c = 0; c < state.gridSize; c++) {
            const letterInfo = state.boardLetters.find(l => l.row === r && l.col === c);
            const letter = letterInfo ? letterInfo.char : '';
            
            let val = state.boardState[r][c];
            let teamStateClass = val === 1 ? 'state-team-1' : (val === 2 ? 'state-team-2' : '');
            
            const hexWrapper = document.createElement('div');
            hexWrapper.className = `hex-wrapper ${teamStateClass}`;
            
            const cellHtml = `
                <div class="hex-inner">
                    <div class="hex-letter">${letter}</div>
                </div>
            `;
            hexWrapper.innerHTML = cellHtml;

            if (val === 0 && !state.winner) {
                hexWrapper.onclick = () => openQuestionModal(r, c, letter);
            }

            rowDiv.appendChild(hexWrapper);
        }
        hexGrid.appendChild(rowDiv);
    }
}

// ---------------------------------
// MODAL AND QUESTION WORKFLOW
// ---------------------------------

function openQuestionModal(r, c, char) {
    activeHex = { r, c, char };
    loadQuestion(char);
    questionModal.classList.remove('hidden');
}

closeQuestionBtn.onclick = () => {
    questionModal.classList.add('hidden');
    activeHex = null;
};

// Simplified to pick a random question for the target letter
function getUnusedQuestion(targetLetter) {
    let state = getGameState();
    let used = state.usedQuestions || [];
    
    // Helper function for Arabic letter matching
    const normalizeArabicChar = (char) => {
        if (!char) return '';
        char = char.replace(/[\u064B-\u065F]/g, ''); // Remove diacritics
        if (['أ', 'إ', 'آ', 'ا'].includes(char)) return 'ا';
        if (char === 'هـ' || char === 'ة' || char === 'ه') return 'ه';
        if (char === 'ى' || char === 'ي') return 'ي';
        if (char === 'ؤ') return 'و';
        if (char === 'ئ') return 'ي';
        return char;
    };
    
    const matchLetter = (answer, targetLetter) => {
        if (!answer) return false;
        let firstCharOfAnswer = answer.trim().charAt(0);
        if (answer.trim().startsWith('ال') && answer.trim().length > 2) {
            firstCharOfAnswer = answer.trim().charAt(2);
        }
        return normalizeArabicChar(firstCharOfAnswer) === normalizeArabicChar(targetLetter);
    };

    // Attempt 1: Unused questions that have answer starting with the target letter
    let available = questionBank.map((q, i) => ({...q, ogIndex: i}))
                                 .filter(q => !used.includes(q.ogIndex) && matchLetter(q.answer, targetLetter));

    // Attempt 2: If we ran out, reset used questions for this letter
    if (available.length === 0) {
        // Find all indices of questions for this letter in the used list and remove them
        const letterQuestionIndices = questionBank.map((q, i) => ({...q, ogIndex: i}))
                                                  .filter(q => matchLetter(q.answer, targetLetter))
                                                  .map(q => q.ogIndex);
        
        state.usedQuestions = used.filter(idx => !letterQuestionIndices.includes(idx));
        saveGameState(state);
        
        // Fetch again, if still zero it means the question bank has literally NO questions for this letter
        available = questionBank.map((q, i) => ({...q, ogIndex: i}))
                                 .filter(q => matchLetter(q.answer, targetLetter));
                                 
        if (available.length === 0) {
            // Failsafe: just pick ANY random question
            available = questionBank.map((q, i) => ({...q, ogIndex: i}));
        }
    }

    let selected = available[Math.floor(Math.random() * available.length)];
    
    // Save to tracking
    state.usedQuestions.push(selected.ogIndex);
    saveGameState(state);
    
    return selected;
}

function loadQuestion(targetLetter) {
    const q = getUnusedQuestion(targetLetter);
    
    modalLetterDisplay.textContent = activeHex.char;
    questionText.textContent = q.text;
    answerText.textContent = q.answer;
}

refreshQuestionBtn.onclick = () => {
    loadQuestion(activeHex.char);
};

// ---------------------------------
// AWARDING & PATHFINDING
// ---------------------------------

awardT1Btn.onclick = () => grantHex(1);
awardT2Btn.onclick = () => grantHex(2);

function grantHex(teamId) {
    if(!activeHex) return;
    
    let state = getGameState();
    state.boardState[activeHex.r][activeHex.c] = teamId;
    saveGameState(state);
    
    questionModal.classList.add('hidden');
    
    checkWinCondition();
    renderPresenterBoard(); // Re-render to show locally
}

// Exactly the same logic you used, tailored to the strict flat-topped horizontal stagger pattern
function checkWinCondition() {
    let state = getGameState();
    if (checkPath(state.boardState, 1, 'top-bottom')) {
        state.winner = 1;
        saveGameState(state);
        alert('الفريق الأول فاز واكتمل مساره!');
    } else if (checkPath(state.boardState, 2, 'left-right')) {
        state.winner = 2;
        saveGameState(state);
        alert('الفريق الثاني فاز واكتمل مساره!');
    }
}

// Staggered row honeycomb neighbors (flat-topped hexagons)
// Even row: shifted right. Odd row: shifted left.
function checkPath(board, teamId, direction) {
    const size = board.length;
    let visited = Array(size).fill(null).map(() => Array(size).fill(false));
    let queue = [];

    // Left-Right for Team 1
    if (direction === 'left-right') {
        for (let r = 0; r < size; r++) {
            if (board[r][0] === teamId) {
                queue.push({r, c: 0});
                visited[r][0] = true;
            }
        }
    } else { // Top-Bottom for Team 2
        for (let c = 0; c < size; c++) {
            if (board[0][c] === teamId) {
                queue.push({r: 0, c});
                visited[0][c] = true;
            }
        }
    }

    const getNeighbors = (r, c) => {
        let n = [];
        if (c > 0) n.push({r, c: c-1}); // left
        if (c < size - 1) n.push({r, c: c+1}); // right

        // Row parity handles vertical neighbors (even rows shifted right visually but index is 0)
        // Actually, CSS flex with `margin-right` on `even` rows. 
        // This implies: Even rows visually go right. Meaning index `i` on even row sits between `i` and `i+1` on odd row above it.
        // Even row:
        if (r % 2 === 0) {
            if (r > 0) n.push({r: r-1, c: c}); // top-left
            if (r > 0 && c < size - 1) n.push({r: r-1, c: c+1}); // top-right
            if (r < size - 1) n.push({r: r+1, c: c}); // bottom-left
            if (r < size - 1 && c < size - 1) n.push({r: r+1, c: c+1}); // bottom-right
        } else {
            // Odd row:
            if (r > 0 && c > 0) n.push({r: r-1, c: c-1}); // top-left
            if (r > 0) n.push({r: r-1, c: c}); // top-right
            if (r < size - 1 && c > 0) n.push({r: r+1, c: c-1}); // bottom-left
            if (r < size - 1) n.push({r: r+1, c: c}); // bottom-right
        }
        return n;
    };

    while (queue.length > 0) {
        let curr = queue.shift();
        
        if (direction === 'left-right' && curr.c === size - 1) return true;
        if (direction === 'top-bottom' && curr.r === size - 1) return true;

        let neighbors = getNeighbors(curr.r, curr.c);
        for (let nb of neighbors) {
            if (board[nb.r][nb.c] === teamId && !visited[nb.r][nb.c]) {
                visited[nb.r][nb.c] = true;
                queue.push(nb);
            }
        }
    }
    return false;
}

initSetup();
