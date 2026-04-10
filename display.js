// display.js
let isCelebrating = false;
let confettiInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    // Initial Render
    syncDisplay();

    // Listen to changes from the presenter
    window.addEventListener('storage', (e) => {
        if (e.key === 'huroof_state') {
            syncDisplay();
        }
    });

    // Resize listener for background redrawing
    window.addEventListener('resize', updateBackgroundShapes);
});

function syncDisplay() {
    const state = getGameState();
    applyTeamColors(); // from shared.js - sets CSS vars --green-team and --orange-team

    document.getElementById('team1NameDisplay').textContent = state.team1.name;
    document.getElementById('team2NameDisplay').textContent = state.team2.name;

    // We can also color the headers directly
    document.querySelector('.team-1-banner').style.backgroundColor = state.team1.color;
    document.querySelector('.team-2-banner').style.backgroundColor = state.team2.color;

    // Render Grid
    renderGrid(state);

    // Winner State
    if (state.winner) {
        document.getElementById('winnerModal').classList.remove('hidden');
        const winnerName = state.winner === 1 ? state.team1.name : state.team2.name;
        const winnerColor = state.winner === 1 ? state.team1.color : state.team2.color;
        
        const wTeamName = document.getElementById('winnerTeamName');
        wTeamName.textContent = winnerName + ' فاز واكتمل المسار!';
        wTeamName.style.color = winnerColor;
        
        if (!isCelebrating) {
            isCelebrating = true;
            startConfetti();
        }
    } else {
        document.getElementById('winnerModal').classList.add('hidden');
        if (isCelebrating) {
            isCelebrating = false;
            stopConfetti();
        }
    }
}

function startConfetti() {
    var duration = 15 * 1000;
    var animationEnd = Date.now() + duration;
    var defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };

    function randomInRange(min, max) {
      return Math.random() * (max - min) + min;
    }

    confettiInterval = setInterval(function() {
      var timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(confettiInterval);
      }

      var particleCount = 50 * (timeLeft / duration);
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
    }, 250);
}

function stopConfetti() {
    if (confettiInterval) clearInterval(confettiInterval);
}

function renderGrid(state) {
    const hexGrid = document.getElementById('hexGrid');
    hexGrid.innerHTML = '';
    
    // Setting CSS variable for dynamic calculation of honeycomb width based on size
    document.documentElement.style.setProperty('--grid-size', state.gridSize);
    
    // In our new math, rows are drawn straight.
    const size = state.gridSize;

    // Create rows and cells
    for (let r = 0; r < size; r++) {
        const rowDiv = document.createElement('div');
        rowDiv.classList.add('hex-row');
        
        for (let c = 0; c < size; c++) {
            const letterInfo = state.boardLetters.find(l => l.row === r && l.col === c);
            const letter = letterInfo ? letterInfo.char : '';
            
            // Check state
            let teamStateClass = '';
            if (state.boardState[r] && state.boardState[r][c] === 1) teamStateClass = 'state-team-1';
            else if (state.boardState[r] && state.boardState[r][c] === 2) teamStateClass = 'state-team-2';
            
            const cellHtml = `
                <div class="hex-wrapper ${teamStateClass}">
                    <div class="hex-inner">
                        <div class="hex-letter">${letter}</div>
                    </div>
                </div>
            `;
            rowDiv.innerHTML += cellHtml;
        }
        hexGrid.appendChild(rowDiv);
    }
    
    // Position background perfectly based on grid
    setTimeout(updateBackgroundShapes, 50);
}

function updateBackgroundShapes() {
    const grid = document.getElementById('hexGrid');
    if (!grid) return;
    const rect = grid.getBoundingClientRect();
    
    // Window dimensions
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Center of the grid
    const cx = (rect.left + rect.right) / 2;
    const cy = (rect.top + rect.bottom) / 2;

    const polyTop = document.getElementById('polyTop');
    const polyRight = document.getElementById('polyRight');
    const polyBottom = document.getElementById('polyBottom');
    const polyLeft = document.getElementById('polyLeft');

    // Polygons must be drawn clockwise to ensure correct rendering.
    // They meet at the center behind the grid, then go to the grid corners, then screen corners.
    if (polyTop) {
        // Screen Top-Left -> Screen Top-Right -> Grid Top-Right -> Center -> Grid Top-Left
        polyTop.setAttribute('points', `0,0 ${w},0 ${rect.right},${rect.top} ${cx},${cy} ${rect.left},${rect.top}`);
    }
    if (polyRight) {
        // Screen Top-Right -> Screen Bottom-Right -> Grid Bottom-Right -> Center -> Grid Top-Right
        polyRight.setAttribute('points', `${w},0 ${w},${h} ${rect.right},${rect.bottom} ${cx},${cy} ${rect.right},${rect.top}`);
    }
    if (polyBottom) {
        // Screen Bottom-Right -> Screen Bottom-Left -> Grid Bottom-Left -> Center -> Grid Bottom-Right
        polyBottom.setAttribute('points', `${w},${h} 0,${h} ${rect.left},${rect.bottom} ${cx},${cy} ${rect.right},${rect.bottom}`);
    }
    if (polyLeft) {
        // Screen Bottom-Left -> Screen Top-Left -> Grid Top-Left -> Center -> Grid Bottom-Left
        polyLeft.setAttribute('points', `0,${h} 0,0 ${rect.left},${rect.top} ${cx},${cy} ${rect.left},${rect.bottom}`);
    }
}
