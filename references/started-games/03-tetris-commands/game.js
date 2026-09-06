'use strict';

const APP_VERSION = '1.0.0';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#9fa8da', // J - pale indigo
  '#ffb74d', // L - orange
];

const COLORS_NEON = [
  null,
  '#00fff9', // I - cyan neon
  '#fff700', // O - yellow neon
  '#ff00ff', // T - magenta neon
  '#39ff14', // S - green neon
  '#ff073a', // Z - red neon
  '#5d5fff', // J - indigo neon
  '#ff9100', // L - orange neon
];

const COLORS_PASTEL = [
  null,
  '#b8e8ec', // I
  '#fff3c4', // O
  '#e3c9e8', // T
  '#c9e8cf', // S
  '#f6cccc', // Z
  '#d3d7f0', // J
  '#fbdcc0', // L
];

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
];

const LINE_SCORES = [0, 100, 300, 500, 800];

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const versionEl = document.getElementById('version');
const themeToggle = document.getElementById('theme-toggle');
const soundToggle = document.getElementById('sound-toggle');
const skinSelect = document.getElementById('skin-select');
const highscoreListEl = document.getElementById('highscore-list');
const bestComboEl = document.getElementById('best-combo');
const maxLinesEl = document.getElementById('max-lines');
const resetRecordsBtn = document.getElementById('reset-records-btn');
const overlayHighscores = document.getElementById('overlay-highscores');
const overlayHighscoreListEl = document.getElementById('overlay-highscore-list');
const overlayBestComboEl = document.getElementById('overlay-best-combo');
const overlayMaxLinesEl = document.getElementById('overlay-max-lines');
const saveScoreSection = document.getElementById('save-score-section');
const nameInput = document.getElementById('player-name-input');
const saveScoreBtn = document.getElementById('save-score-btn');
const pauseMenu = document.getElementById('pause-menu');
const resumeBtn = document.getElementById('resume-btn');
const pauseRestartBtn = document.getElementById('pause-restart-btn');
const toggleControlsBtn = document.getElementById('toggle-controls-btn');
const pauseControls = document.getElementById('pause-controls');
const startLevelSelect = document.getElementById('start-level-select');

versionEl.textContent = `v${APP_VERSION}`;

const THEME_KEY = 'tetris-theme';
const HISCORE_KEY = 'tetris-highscores';
const BEST_COMBO_KEY = 'tetris-best-combo';
const MAX_LINES_KEY = 'tetris-max-lines';
const START_LEVEL_KEY = 'tetris-start-level';
const MAX_START_LEVEL = 10;

function getStartLevel() {
  const saved = parseInt(localStorage.getItem(START_LEVEL_KEY), 10);
  if (Number.isInteger(saved) && saved >= 1 && saved <= MAX_START_LEVEL) return saved;
  return 1;
}

function initStartLevelSelect() {
  for (let lvl = 1; lvl <= MAX_START_LEVEL; lvl++) {
    const opt = document.createElement('option');
    opt.value = lvl;
    opt.textContent = lvl;
    startLevelSelect.appendChild(opt);
  }
  startLevelSelect.value = getStartLevel();
}

startLevelSelect.addEventListener('change', () => {
  localStorage.setItem(START_LEVEL_KEY, startLevelSelect.value);
});

initStartLevelSelect();

function applyTheme(theme) {
  document.body.classList.toggle('light-theme', theme === 'light');
  themeToggle.checked = theme === 'light';
}

function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
  applyTheme(savedTheme);
}

themeToggle.addEventListener('change', () => {
  const theme = themeToggle.checked ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
});

initTheme();

const SKIN_KEY = 'tetris-skin';
let currentSkin = 'retro';
let gameStarted = false;

function getSkinColors() {
  switch (currentSkin) {
    case 'neon': return COLORS_NEON;
    case 'pastel': return COLORS_PASTEL;
    case 'pixel-art': return COLORS;
    default: return COLORS;
  }
}

function applySkin(skin) {
  currentSkin = skin;
  document.body.classList.toggle('skin-neon', skin === 'neon');
  skinSelect.value = skin;
  // redraw if the game has already started
  if (gameStarted) {
    draw();
    drawNext();
  }
}

function initSkin() {
  const savedSkin = localStorage.getItem(SKIN_KEY) || 'retro';
  applySkin(savedSkin);
}

skinSelect.addEventListener('change', () => {
  const skin = skinSelect.value;
  localStorage.setItem(SKIN_KEY, skin);
  applySkin(skin);
});

initSkin();

// ---- Audio: efectos de sonido y música de fondo retro (sintetizados con Web Audio API) ----
const SOUND_KEY = 'tetris-sound-enabled';
let soundEnabled = localStorage.getItem(SOUND_KEY) !== 'off';
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AC();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playTone({ freq, duration = 0.12, type = 'square', gain = 0.1, delay = 0 }) {
  if (!soundEnabled) return;
  const ctxA = getAudioCtx();
  const t0 = ctxA.currentTime + delay;
  const osc = ctxA.createOscillator();
  const gainNode = ctxA.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gainNode.gain.setValueAtTime(0.0001, t0);
  gainNode.gain.linearRampToValueAtTime(gain, t0 + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gainNode).connect(ctxA.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

// Tick muy suave al caer/bajar una pieza — deliberadamente discreto para no molestar.
function sfxDescend() {
  playTone({ freq: 220, duration: 0.03, type: 'sine', gain: 0.02 });
}

// Sonido al colocarse (encajar) una pieza.
function sfxLock() {
  playTone({ freq: 150, duration: 0.08, type: 'square', gain: 0.09 });
  playTone({ freq: 90, duration: 0.09, type: 'square', gain: 0.06, delay: 0.02 });
}

// Arpegio ascendente agradable al subir de nivel.
function sfxLevelUp() {
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) =>
    playTone({ freq, duration: 0.14, type: 'triangle', gain: 0.09, delay: i * 0.09 })
  );
}

// Secuencia descendente retro, más larga, al terminar la partida.
function sfxGameOver() {
  [392, 349.23, 293.66, 261.63, 196].forEach((freq, i) =>
    playTone({ freq, duration: 0.35, type: 'square', gain: 0.1, delay: i * 0.22 })
  );
}

// Melodía retro en bucle para la pantalla principal y el menú de pausa.
const MENU_MELODY = [
  [523.25, 0.2], [659.25, 0.2], [783.99, 0.2], [659.25, 0.2],
  [523.25, 0.2], [392.00, 0.2], [440.00, 0.2], [392.00, 0.4],
  [349.23, 0.2], [392.00, 0.2], [440.00, 0.2], [523.25, 0.2],
  [440.00, 0.2], [392.00, 0.2], [349.23, 0.2], [329.63, 0.4],
];

let menuMusicTimer = null;
let menuMusicStep = 0;

function scheduleMenuMusicStep() {
  const [freq, dur] = MENU_MELODY[menuMusicStep % MENU_MELODY.length];
  playTone({ freq, duration: dur * 0.85, type: 'triangle', gain: 0.05 });
  menuMusicStep++;
  menuMusicTimer = setTimeout(scheduleMenuMusicStep, dur * 1000);
}

function startMenuMusic() {
  if (menuMusicTimer) return;
  menuMusicStep = 0;
  scheduleMenuMusicStep();
}

function stopMenuMusic() {
  clearTimeout(menuMusicTimer);
  menuMusicTimer = null;
}

soundToggle.checked = !soundEnabled;
soundToggle.addEventListener('change', () => {
  soundEnabled = !soundToggle.checked;
  localStorage.setItem(SOUND_KEY, soundEnabled ? 'on' : 'off');
});

function loadHighscores() {
  try {
    const raw = localStorage.getItem(HISCORE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

function saveHighscore(entry) {
  const list = loadHighscores();
  list.push(entry);
  list.sort((a, b) => b.score - a.score);
  const trimmed = list.slice(0, 5);
  try {
    localStorage.setItem(HISCORE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    // ignore persistence failures (e.g. storage disabled/blocked)
  }
  return trimmed;
}

function qualifiesForHighscore(s) {
  const list = loadHighscores();
  if (list.length < 5) return true;
  return s > list[list.length - 1].score;
}

function loadStat(key) {
  try {
    const raw = localStorage.getItem(key);
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch (e) {
    return 0;
  }
}

function saveStat(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch (e) {
    // ignore persistence failures (e.g. storage disabled/blocked)
  }
}

function renderListInto(el, list, highlightIndex) {
  el.innerHTML = '';
  if (list.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'Sin records';
    li.className = 'empty';
    el.appendChild(li);
    return;
  }
  list.forEach((entry, i) => {
    const li = document.createElement('li');
    li.textContent = `${entry.name} — ${entry.score.toLocaleString()}`;
    if (i === highlightIndex) li.classList.add('highlight');
    el.appendChild(li);
  });
}

function renderHighscores(highlightIndex) {
  renderListInto(highscoreListEl, loadHighscores(), highlightIndex);
}

function previewRankFor(s, list) {
  const idx = list.findIndex(e => s > e.score);
  if (idx !== -1) return idx;
  return list.length < 5 ? list.length : -1;
}

function renderOverlayPreview(s) {
  const list = loadHighscores();
  const idx = previewRankFor(s, list);
  if (idx === -1) {
    renderListInto(overlayHighscoreListEl, list, -1);
    return;
  }
  const preview = list.slice();
  preview.splice(idx, 0, { name: '···', score: s });
  renderListInto(overlayHighscoreListEl, preview.slice(0, 5), idx);
}

function renderStats() {
  bestComboEl.textContent = bestCombo;
  maxLinesEl.textContent = maxLines;
  overlayBestComboEl.textContent = bestCombo;
  overlayMaxLinesEl.textContent = maxLines;
}

function resetRecords() {
  try {
    localStorage.removeItem(HISCORE_KEY);
    localStorage.removeItem(BEST_COMBO_KEY);
    localStorage.removeItem(MAX_LINES_KEY);
  } catch (e) {
    // ignore persistence failures (e.g. storage disabled/blocked)
  }
  bestCombo = 0;
  maxLines = 0;
  renderHighscores();
  renderStats();
}

function confirmSaveScore() {
  const name = (nameInput.value || '').trim().slice(0, 12) || 'AAA';
  const entry = { name, score, lines, level };
  const list = saveHighscore(entry);
  const idx = list.indexOf(entry);
  renderHighscores(idx);
  renderListInto(overlayHighscoreListEl, list, idx);
  saveScoreSection.classList.add('hidden');
}

resetRecordsBtn.addEventListener('click', resetRecords);
saveScoreBtn.addEventListener('click', confirmSaveScore);
nameInput.addEventListener('keydown', e => {
  if (e.code === 'Enter' || e.code === 'NumpadEnter') {
    e.stopPropagation();
    confirmSaveScore();
  }
});

let bestCombo = loadStat(BEST_COMBO_KEY);
let maxLines = loadStat(MAX_LINES_KEY);
let comboCount = 0;

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece() {
  const type = Math.floor(Math.random() * 7) + 1;
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    const oldLevel = level;
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = computeDropInterval(level);
    if (level > oldLevel) sfxLevelUp();
    updateHUD();
    if (lines > maxLines) {
      maxLines = lines;
      saveStat(MAX_LINES_KEY, maxLines);
      renderStats();
    }
  }
  return cleared;
}

function computeDropInterval(lvl) {
  return Math.max(100, 1000 - (lvl - 1) * 90);
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    sfxDescend();
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  sfxLock();
  merge();
  const cleared = clearLines();
  if (cleared > 0) {
    comboCount++;
    if (comboCount > bestCombo) {
      bestCombo = comboCount;
      saveStat(BEST_COMBO_KEY, bestCombo);
      renderStats();
    }
  } else {
    comboCount = 0;
  }
  spawn();
}

function spawn() {
  current = next;
  next = randomPiece();
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const color = getSkinColors()[colorIndex];
  const px = x * size + 1;
  const py = y * size + 1;
  const w = size - 2;
  const h = size - 2;

  context.globalAlpha = alpha ?? 1;

  if (currentSkin === 'neon') {
    context.shadowBlur = 12;
    context.shadowColor = color;
    context.fillStyle = color;
    context.fillRect(px, py, w, h);
    context.shadowBlur = 0;
    context.fillStyle = 'rgba(255,255,255,0.18)';
    context.fillRect(px, py, w, 4);
  } else if (currentSkin === 'pastel') {
    const radius = Math.min(6, w / 3, h / 3);
    context.fillStyle = color;
    context.beginPath();
    if (typeof context.roundRect === 'function') {
      context.roundRect(px, py, w, h, radius);
    } else {
      context.moveTo(px + radius, py);
      context.arcTo(px + w, py, px + w, py + h, radius);
      context.arcTo(px + w, py + h, px, py + h, radius);
      context.arcTo(px, py + h, px, py, radius);
      context.arcTo(px, py, px + w, py, radius);
      context.closePath();
    }
    context.fill();
    context.fillStyle = 'rgba(255,255,255,0.25)';
    context.beginPath();
    if (typeof context.roundRect === 'function') {
      context.roundRect(px, py, w, Math.min(4, h), radius);
    } else {
      context.rect(px, py, w, Math.min(4, h));
    }
    context.fill();
  } else if (currentSkin === 'pixel-art') {
    context.fillStyle = color;
    context.fillRect(px, py, w, h);
    // pixel-art texture: 3x3 grid of alternating light/dark mini-squares
    const cell = size / 3;
    context.fillStyle = 'rgba(0,0,0,0.15)';
    for (let gr = 0; gr < 3; gr++) {
      for (let gc = 0; gc < 3; gc++) {
        if ((gr + gc) % 2 === 0) continue;
        context.fillRect(px + gc * cell, py + gr * cell, cell, cell);
      }
    }
    context.fillStyle = 'rgba(255,255,255,0.15)';
    context.fillRect(px, py, w, 3);
  } else {
    // retro
    context.fillStyle = color;
    context.fillRect(px, py, w, h);
    // highlight
    context.fillStyle = 'rgba(255,255,255,0.12)';
    context.fillRect(px, py, w, 4);
  }

  context.globalAlpha = 1;
}

function drawGrid() {
  ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--grid-color').trim();
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  sfxGameOver();
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  pauseMenu.classList.add('hidden');
  restartBtn.classList.remove('hidden');
  overlay.classList.remove('hidden');

  overlayHighscores.classList.remove('hidden');
  renderOverlayPreview(score);
  renderStats();

  if (qualifiesForHighscore(score)) {
    saveScoreSection.classList.remove('hidden');
    nameInput.value = '';
    setTimeout(() => nameInput.focus(), 50);
  } else {
    saveScoreSection.classList.add('hidden');
  }
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    stopMenuMusic();
    pauseMenu.classList.add('hidden');
    overlay.classList.add('hidden');
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    overlayTitle.textContent = 'PAUSA';
    overlayScore.textContent = '';
    restartBtn.classList.add('hidden');
    pauseControls.classList.add('hidden');
    overlayHighscores.classList.add('hidden');
    pauseMenu.classList.remove('hidden');
    overlay.classList.remove('hidden');
    startMenuMusic();
  }
}

function loop(ts) {
  const dt = ts - lastTime;
  lastTime = ts;
  dropAccum += dt;
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
      sfxDescend();
    } else {
      lockPiece();
    }
  }
  if (gameOver) return;
  draw();
  animId = requestAnimationFrame(loop);
}

function init() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = getStartLevel();
  paused = false;
  gameOver = false;
  dropInterval = computeDropInterval(level);
  dropAccum = 0;
  comboCount = 0;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  saveScoreSection.classList.add('hidden');
  overlayHighscores.classList.add('hidden');
  renderHighscores();
  renderStats();
  pauseMenu.classList.add('hidden');
  pauseControls.classList.add('hidden');
  restartBtn.classList.remove('hidden');
  cancelAnimationFrame(animId);
  gameStarted = true;
  animId = requestAnimationFrame(loop);
}

function showStartScreen() {
  overlayTitle.textContent = 'TETRIS';
  overlayScore.textContent = 'Usa las flechas del teclado para jugar';
  restartBtn.classList.add('hidden');
  saveScoreSection.classList.add('hidden');
  pauseControls.classList.add('hidden');
  pauseRestartBtn.classList.add('hidden');
  resumeBtn.textContent = 'Jugar';
  pauseMenu.classList.remove('hidden');
  overlay.classList.remove('hidden');
  startMenuMusic();
}

function startGame() {
  stopMenuMusic();
  resumeBtn.textContent = 'Reanudar';
  pauseRestartBtn.classList.remove('hidden');
  init();
}

resumeBtn.addEventListener('click', () => {
  if (!gameStarted) {
    startGame();
  } else {
    togglePause();
  }
});
pauseRestartBtn.addEventListener('click', init);
toggleControlsBtn.addEventListener('click', () => {
  pauseControls.classList.toggle('hidden');
});

document.addEventListener('keydown', e => {
  if (!gameStarted) return;
  if (e.code === 'KeyP' || e.code === 'Escape') { togglePause(); return; }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', init);

showStartScreen();
