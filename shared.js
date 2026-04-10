// shared.js

// Constants & Data
const ARABIC_LETTERS = ['أ', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'هـ', 'و', 'ي'];

const PRESET_COLORS = [
    { name: 'أحمر', hex: '#E53935' },
    { name: 'أزرق', hex: '#1E88E5' },
    { name: 'أخضر', hex: '#43A047' },
    { name: 'أصفر', hex: '#FDD835' },
    { name: 'برتقالي', hex: '#FB8C00' },
    { name: 'بنفسجي', hex: '#8E24AA' },
    { name: 'وردي', hex: '#D81B60' },
    { name: 'بني', hex: '#6D4C41' },
    { name: 'رمادي', hex: '#757575' },
    { name: 'فيروزي', hex: '#00ACC1' }
];

// Default Game State structure
const defaultState = {
    gridSize: 5,
    team1: { name: 'الفريق الأول', color: '#43A047' }, // Default Green
    team2: { name: 'الفريق الثاني', color: '#FB8C00' }, // Default Orange
    boardState: [], // 2D array, e.g., [[0,0,1],[2,0,0],...]
    boardLetters: [], // 2D array with characters randomly assigned during setup
    winner: null // 1 or 2
};

// State Management
function getGameState() {
    const raw = localStorage.getItem('huroof_state');
    if (raw) {
        try {
            return JSON.parse(raw);
        } catch(e) { console.error('Error parsing state', e); }
    }
    return JSON.parse(JSON.stringify(defaultState));
}

function saveGameState(state) {
    localStorage.setItem('huroof_state', JSON.stringify(state));
}

// Global UI Updater mapping numeric teams to state colors
function applyTeamColors() {
    const state = getGameState();
    document.documentElement.style.setProperty('--green-team', state.team1.color);
    document.documentElement.style.setProperty('--orange-team', state.team2.color);
}
