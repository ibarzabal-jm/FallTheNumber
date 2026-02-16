const COLS = 5;
const ROWS = 8;
const SPAWN_VALUES = [2, 4, 8, 16, 32, 64, 128];
const GRAVITY_CELLS_PER_SEC = 0.85;
const MERGE_ANIM_MS = 220;

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
let isGameOver;
let selectedLaneCol = null;
let lastTs = 0;
let rafId;

function randomStartValue() {
  const index = Math.floor(Math.random() * SPAWN_VALUES.length);
  return SPAWN_VALUES[index];
}

function newBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function spawnTile() {
  active = { row: 0, y: 0, col: Math.floor(COLS / 2), value: nextValue };
  nextValue = randomStartValue();
  if (board[0][active.col] !== null) {
    endGame();
  }
}

function canMoveTo(row, col) {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
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
  active.y = active.row;
  lockActive();
  render();
}

function endGame() {
  isGameOver = true;
  gameOverEl.classList.remove('hidden');
  if (rafId) cancelAnimationFrame(rafId);
}

function startGame() {
  board = newBoard();
  score = 0;
  isGameOver = false;
  gameOverEl.classList.add('hidden');
  nextValue = randomStartValue();
  spawnTile();
  selectedLaneCol = null;
  lastTs = 0;
  render();
  if (rafId) cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(loop);
}

function getNeighbors(row, col) {
  return [
    [row - 1, col],
    [row + 1, col],
    [row, col - 1],
    [row, col + 1],
  ].filter(([r, c]) => r >= 0 && r < ROWS && c >= 0 && c < COLS);
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

function addMergeAnimation(fromRow, fromCol, toRow, toCol, value) {
  const metrics = getBoardMetrics();
  if (!metrics) return;

  const fromX = fromCol * (metrics.cell + metrics.gap);
  const fromY = fromRow * (metrics.cell + metrics.gap);
  const toX = toCol * (metrics.cell + metrics.gap);
  const toY = toRow * (metrics.cell + metrics.gap);

  const fly = document.createElement('div');
  fly.className = `cell merge-fly ${valueClass(value)}`;
  fly.textContent = value;
  fly.style.width = `${metrics.cell}px`;
  fly.style.height = `${metrics.cell}px`;
  fly.style.left = `${fromX}px`;
  fly.style.top = `${fromY}px`;
  fly.style.transform = 'translate(0, 0) scale(0.95)';
  boardEl.appendChild(fly);

  requestAnimationFrame(() => {
    fly.style.transform = `translate(${toX - fromX}px, ${toY - fromY}px) scale(0.8)`;
    fly.style.opacity = '0';
  });

  setTimeout(() => fly.remove(), MERGE_ANIM_MS + 40);
}

function mergePass() {
  const consumed = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  let merged = false;

  for (let row = ROWS - 1; row >= 0; row -= 1) {
    for (let col = 0; col < COLS; col += 1) {
      const value = board[row][col];
      if (value === null || consumed[row][col]) continue;

      const equalNeighbors = getNeighbors(row, col).filter(
        ([nr, nc]) => !consumed[nr][nc] && board[nr][nc] === value,
      );

      if (equalNeighbors.length === 0) continue;

      for (const [nr, nc] of equalNeighbors) {
        board[nr][nc] = null;
        consumed[nr][nc] = true;
        addMergeAnimation(nr, nc, row, col, value);
      }

      const power = 2 ** equalNeighbors.length;
      const newValue = value * power;
      board[row][col] = newValue;
      consumed[row][col] = true;
      merged = true;
      score += newValue;
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

function lockActive() {
  board[active.row][active.col] = active.value;
  resolveBoard();
  spawnTile();
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
    if (selectedLaneCol === col || (selectedLaneCol === null && active?.col === col)) {
      laneCell.classList.add('selected');
    }
    dropLaneEl.appendChild(laneCell);
  }
}

function renderBoardCells() {
  boardEl.innerHTML = '';
  const fragment = document.createDocumentFragment();

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const cell = document.createElement('div');
      cell.className = 'cell';

      const boardValue = board[row][col];
      if (boardValue !== null) {
        cell.textContent = boardValue;
        const cls = valueClass(boardValue);
        if (cls) cell.classList.add(cls);
      }

      fragment.appendChild(cell);
    }
  }

  boardEl.appendChild(fragment);
}

function getBoardMetrics() {
  const rect = boardEl.getBoundingClientRect();
  if (!rect.width) return null;
  const style = window.getComputedStyle(boardEl);
  const gap = parseFloat(style.columnGap || style.gap || '0');
  const cell = (rect.width - gap * (COLS - 1)) / COLS;
  return { gap, cell };
}

function renderActiveOverlay() {
  if (!active || isGameOver) return;
  const metrics = getBoardMetrics();
  if (!metrics) return;

  const activeEl = document.createElement('div');
  activeEl.className = `cell active floating ${valueClass(active.value)}`;
  activeEl.textContent = active.value;
  activeEl.style.width = `${metrics.cell}px`;
  activeEl.style.height = `${metrics.cell}px`;
  const x = active.col * (metrics.cell + metrics.gap);
  const y = active.y * (metrics.cell + metrics.gap);
  activeEl.style.transform = `translate(${x}px, ${y}px)`;
  boardEl.appendChild(activeEl);
}

function render() {
  renderBoardCells();
  renderActiveOverlay();
  renderDropLane();

  scoreEl.textContent = String(score);
  nextTileEl.textContent = String(nextValue);
  nextTileEl.className = `tile preview ${valueClass(nextValue)}`;
}

function stepGravity(deltaSeconds) {
  if (isGameOver || !active) return;

  active.y += GRAVITY_CELLS_PER_SEC * deltaSeconds;
  const targetRow = Math.floor(active.y);

  while (active.row < targetRow) {
    if (canMoveTo(active.row + 1, active.col)) {
      active.row += 1;
    } else {
      active.y = active.row;
      lockActive();
      return;
    }
  }

  const maxY = ROWS - 1;
  if (active.y > maxY) {
    active.y = maxY;
  }
}

function loop(ts) {
  if (isGameOver) return;
  if (!lastTs) lastTs = ts;

  const deltaSeconds = Math.min((ts - lastTs) / 1000, 0.05);
  lastTs = ts;

  stepGravity(deltaSeconds);
  render();
  rafId = requestAnimationFrame(loop);
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
