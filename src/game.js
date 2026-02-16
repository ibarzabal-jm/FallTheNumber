const COLS = 5;
const ROWS = 8;
const TICK_MS = 320;
const SPAWN_VALUES = [2, 4, 8, 16, 32, 64, 128];

const boardEl = document.getElementById('board');
const dropLaneEl = document.getElementById('dropLane');
const scoreEl = document.getElementById('score');
const nextTileEl = document.getElementById('nextTile');
const gameOverEl = document.getElementById('gameOver');

const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');
const dropBtn = document.getElementById('dropBtn');
const restartBtn = document.getElementById('restartBtn');

let board;
let active;
let nextValue;
let score;
let timer;
let isGameOver;
let selectedLaneCol = null;

function randomStartValue() {
  const index = Math.floor(Math.random() * SPAWN_VALUES.length);
  return SPAWN_VALUES[index];
}

function newBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function spawnTile() {
  active = { row: 0, col: Math.floor(COLS / 2), value: nextValue };
  nextValue = randomStartValue();
  if (board[0][active.col] !== null) {
    endGame();
  }
}

function canMoveTo(row, col) {
  if (col < 0 || col >= COLS || row >= ROWS) return false;
  return board[row][col] === null;
}

function moveActive(dx) {
  if (isGameOver || !active) return;
  const newCol = active.col + dx;
  if (canMoveTo(active.row, newCol)) {
    active.col = newCol;
    render();
  }
}

function moveToColumn(col) {
  if (isGameOver || !active) return;
  if (col < 0 || col >= COLS) return;
  if (canMoveTo(active.row, col)) {
    active.col = col;
    render();
  }
}

function hardDrop() {
  if (isGameOver || !active) return;
  while (canMoveTo(active.row + 1, active.col)) {
    active.row += 1;
  }
  lockActive();
  render();
}

function tick() {
  if (isGameOver || !active) return;

  if (canMoveTo(active.row + 1, active.col)) {
    active.row += 1;
  } else {
    lockActive();
  }
  render();
}

function lockActive() {
  board[active.row][active.col] = active.value;
  resolveBoard();
  spawnTile();
}

function applyGravity() {
  let moved = false;
  for (let col = 0; col < COLS; col += 1) {
    const stack = [];
    for (let row = ROWS - 1; row >= 0; row -= 1) {
      if (board[row][col] !== null) stack.push(board[row][col]);
      board[row][col] = null;
    }
    for (let row = ROWS - 1, i = 0; i < stack.length; row -= 1, i += 1) {
      board[row][col] = stack[i];
      if (row !== ROWS - 1 - i) moved = true;
    }
  }
  return moved;
}

function mergePass() {
  const consumed = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  let merged = false;

  for (let row = ROWS - 1; row >= 0; row -= 1) {
    for (let col = 0; col < COLS; col += 1) {
      const value = board[row][col];
      if (value === null || consumed[row][col]) continue;

      const options = [
        [row + 1, col],
        [row, col + 1],
        [row, col - 1],
      ];

      for (const [nr, nc] of options) {
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
        if (consumed[nr][nc]) continue;
        if (board[nr][nc] === value) {
          board[row][col] = value * 2;
          board[nr][nc] = null;
          consumed[row][col] = true;
          merged = true;
          score += value * 2;
          break;
        }
      }
    }
  }
  return merged;
}

function resolveBoard() {
  let changed = true;
  while (changed) {
    const grav = applyGravity();
    const mrg = mergePass();
    changed = grav || mrg;
  }
  applyGravity();
}

function endGame() {
  isGameOver = true;
  gameOverEl.classList.remove('hidden');
  clearInterval(timer);
}

function startGame() {
  board = newBoard();
  score = 0;
  isGameOver = false;
  gameOverEl.classList.add('hidden');
  nextValue = randomStartValue();
  spawnTile();
  selectedLaneCol = null;
  render();
  clearInterval(timer);
  timer = setInterval(tick, TICK_MS);
}

function valueClass(value) {
  if (value === null || value === undefined) return '';
  const normalized = Math.min(value, 8192);
  return `v${normalized}`;
}

function renderDropLane() {
  dropLaneEl.innerHTML = '';
  for (let col = 0; col < COLS; col += 1) {
    const laneCell = document.createElement('button');
    laneCell.type = 'button';
    laneCell.className = 'lane-cell';
    laneCell.dataset.col = String(col);
    if (selectedLaneCol === col || (selectedLaneCol === null && active?.col === col)) {
      laneCell.classList.add('selected');
    }
    dropLaneEl.appendChild(laneCell);
  }
}

function render() {
  boardEl.innerHTML = '';

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const cell = document.createElement('div');
      cell.className = 'cell';

      const boardValue = board[row][col];
      let valueToDraw = boardValue;

      if (active && active.row === row && active.col === col) {
        valueToDraw = active.value;
        cell.classList.add('active');
      }

      if (valueToDraw !== null) {
        cell.textContent = valueToDraw;
        const cls = valueClass(valueToDraw);
        if (cls) cell.classList.add(cls);
      }

      boardEl.appendChild(cell);
    }
  }

  renderDropLane();
  scoreEl.textContent = String(score);
  nextTileEl.textContent = String(nextValue);
  nextTileEl.className = `tile preview ${valueClass(nextValue)}`;
}

function laneColFromClientX(clientX) {
  const rect = dropLaneEl.getBoundingClientRect();
  const relativeX = clientX - rect.left;
  const cellWidth = rect.width / COLS;
  const col = Math.floor(relativeX / cellWidth);
  return Math.max(0, Math.min(COLS - 1, col));
}

function bindInput() {
  leftBtn.addEventListener('click', () => moveActive(-1));
  rightBtn.addEventListener('click', () => moveActive(1));
  dropBtn.addEventListener('click', hardDrop);
  restartBtn.addEventListener('click', startGame);

  window.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') moveActive(-1);
    if (event.key === 'ArrowRight') moveActive(1);
    if (event.key === 'ArrowDown' || event.code === 'Space') hardDrop();
  });

  dropLaneEl.addEventListener('pointerdown', (event) => {
    if (isGameOver || !active) return;
    dropLaneEl.setPointerCapture(event.pointerId);
    selectedLaneCol = laneColFromClientX(event.clientX);
    moveToColumn(selectedLaneCol);
  });

  dropLaneEl.addEventListener('pointermove', (event) => {
    if (selectedLaneCol === null || isGameOver || !active) return;
    selectedLaneCol = laneColFromClientX(event.clientX);
    moveToColumn(selectedLaneCol);
  });

  const releaseDrop = () => {
    if (selectedLaneCol === null) return;
    selectedLaneCol = null;
    hardDrop();
  };

  dropLaneEl.addEventListener('pointerup', releaseDrop);
  dropLaneEl.addEventListener('pointercancel', () => {
    selectedLaneCol = null;
    render();
  });
}

bindInput();
startGame();
