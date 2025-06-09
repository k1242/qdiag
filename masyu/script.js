const settings = { n: 5, showTimer: true };
let solved = false;

const $ = sel => document.querySelector(sel);
const canvas = $('#board');
const ctx = canvas.getContext('2d');
let cellSize = 50;
const margin = 20;
let circles = [];
let pathCells = [];
let hor = [];
let ver = [];

function calcSize() {
  const max = innerWidth <= 600 ? innerWidth * 0.9 : 500;
  const raw = (max - margin * 2) / settings.n;
  return Math.max(24, Math.min(raw, 60));
}

function applySize() {
  cellSize = calcSize();
  canvas.width = cellSize * settings.n + margin * 2;
  canvas.height = cellSize * settings.n + margin * 2;
}

function generatePath() {
  const n = settings.n;
  pathCells = [];
  for (let i = 0; i < n; i++) {
    if (i % 2 === 0) {
      for (let j = 0; j < n; j++) pathCells.push([i, j]);
    } else {
      for (let j = n - 1; j >= 0; j--) pathCells.push([i, j]);
    }
  }
  pathCells.push([0, 0]);

  circles = Array.from({ length: n }, () => Array(n).fill(null));
  for (let k = 1; k < pathCells.length - 1; k++) {
    const [pi, pj] = pathCells[k - 1];
    const [i, j] = pathCells[k];
    const [ni, nj] = pathCells[k + 1];
    const d1 = [i - pi, j - pj];
    const d2 = [ni - i, nj - j];
    const turn = d1[0] !== d2[0] || d1[1] !== d2[1];
    if (turn) {
      circles[i][j] = 'B';
    } else {
      const prevTurn = k > 1 && (d1[0] !== pathCells[k - 1][0] - pathCells[k - 2][0] || d1[1] !== pathCells[k - 1][1] - pathCells[k - 2][1]);
      const nextIdx = k + 2 >= pathCells.length ? 1 : k + 2;
      const nextTurn = d2[0] !== pathCells[nextIdx][0] - ni || d2[1] !== pathCells[nextIdx][1] - nj;
      if (prevTurn || nextTurn) circles[i][j] = 'W';
    }
  }
}

function initArrays() {
  hor = Array.from({ length: settings.n + 1 }, () => Array(settings.n).fill(false));
  ver = Array.from({ length: settings.n }, () => Array(settings.n + 1).fill(false));
}

function initGame() {
  initArrays();
  generatePath();
  applySize();
  solved = false;
  draw();
  Timer.reset();
  if (settings.showTimer) Timer.start();
  Timer.updateDisplay();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const n = settings.n;

  ctx.strokeStyle = '#888';
  ctx.lineWidth = 1;
  for (let i = 0; i <= n; i++) {
    const y = margin + i * cellSize;
    ctx.beginPath();
    ctx.moveTo(margin, y);
    ctx.lineTo(margin + n * cellSize, y);
    ctx.stroke();
  }
  for (let j = 0; j <= n; j++) {
    const x = margin + j * cellSize;
    ctx.beginPath();
    ctx.moveTo(x, margin);
    ctx.lineTo(x, margin + n * cellSize);
    ctx.stroke();
  }

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const c = circles[i][j];
      if (!c) continue;
      const x = margin + j * cellSize + cellSize / 2;
      const y = margin + i * cellSize + cellSize / 2;
      ctx.beginPath();
      ctx.arc(x, y, cellSize * 0.2, 0, Math.PI * 2);
      if (c === 'B') {
        ctx.fillStyle = '#000';
        ctx.fill();
      } else {
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.stroke();
      }
    }
  }

  ctx.strokeStyle = '#6c63ff';
  ctx.lineWidth = 4;
  for (let i = 0; i <= n; i++) {
    for (let j = 0; j < n; j++) {
      if (hor[i][j]) {
        const x1 = margin + j * cellSize;
        const y = margin + i * cellSize;
        const x2 = margin + (j + 1) * cellSize;
        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.stroke();
      }
    }
  }
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= n; j++) {
      if (ver[i][j]) {
        const x = margin + j * cellSize;
        const y1 = margin + i * cellSize;
        const y2 = margin + (i + 1) * cellSize;
        ctx.beginPath();
        ctx.moveTo(x, y1);
        ctx.lineTo(x, y2);
        ctx.stroke();
      }
    }
  }
}

function toggleEdge(x, y) {
  const n = settings.n;
  const tol = cellSize * 0.3;
  for (let i = 0; i <= n; i++) {
    const y0 = margin + i * cellSize;
    if (Math.abs(y - y0) < tol) {
      for (let j = 0; j < n; j++) {
        const x1 = margin + j * cellSize;
        const x2 = margin + (j + 1) * cellSize;
        if (x >= x1 - tol && x <= x2 + tol) {
          hor[i][j] = !hor[i][j];
          return true;
        }
      }
    }
  }
  for (let j = 0; j <= n; j++) {
    const x0 = margin + j * cellSize;
    if (Math.abs(x - x0) < tol) {
      for (let i = 0; i < n; i++) {
        const y1 = margin + i * cellSize;
        const y2 = margin + (i + 1) * cellSize;
        if (y >= y1 - tol && y <= y2 + tol) {
          ver[i][j] = !ver[i][j];
          return true;
        }
      }
    }
  }
  return false;
}

canvas.addEventListener('click', e => {
  const r = canvas.getBoundingClientRect();
  const x = e.clientX - r.left;
  const y = e.clientY - r.top;
  if (toggleEdge(x, y)) {
    draw();
    if (checkSolved()) {
      Timer.stop();
      $('#timerDisplay').classList.add('solved');
      setTimeout(() => alert('Solved!'), 50);
      solved = true;
    }
  }
});

$('#newBtn').onclick = () => { initGame(); $('#panel').classList.remove('open'); };
$('#menuBtn').onclick = () => $('#panel').classList.toggle('open');
$('#timerToggle').onchange = e => {
  settings.showTimer = e.target.checked;
  if (!settings.showTimer) Timer.stop();
  else if (!Timer.isRunning && !solved) Timer.start();
  Timer.updateDisplay();
};

document.querySelectorAll('.stepper').forEach(stepper => {
  stepper.onclick = e => {
    const inc = e.target.classList.contains('plus') ? 1 : e.target.classList.contains('minus') ? -1 : 0;
    if (!inc) return;
    settings.n = Math.max(3, Math.min(10, settings.n + inc));
    $('#nVal').textContent = settings.n;
    initGame();
  };
});

window.addEventListener('resize', () => { applySize(); draw(); });

function cellEdges(r, c) {
  return { top: hor[r][c], bottom: hor[r + 1][c], left: ver[r][c], right: ver[r][c + 1] };
}

function cellType(r, c) {
  const e = cellEdges(r, c);
  const cnt = e.top + e.bottom + e.left + e.right;
  if (cnt !== 2) return null;
  if (e.left && e.right) return { kind: 'straight', dir: 'h' };
  if (e.top && e.bottom) return { kind: 'straight', dir: 'v' };
  if (e.top && e.right) return { kind: 'turn', dirs: ['top', 'right'] };
  if (e.right && e.bottom) return { kind: 'turn', dirs: ['right', 'bottom'] };
  if (e.bottom && e.left) return { kind: 'turn', dirs: ['bottom', 'left'] };
  if (e.left && e.top) return { kind: 'turn', dirs: ['left', 'top'] };
  return null;
}

function edgesCount() {
  let c = 0;
  const n = settings.n;
  for (let i = 0; i <= n; i++) for (let j = 0; j < n; j++) if (hor[i][j]) c++;
  for (let i = 0; i < n; i++) for (let j = 0; j <= n; j++) if (ver[i][j]) c++;
  return c;
}

function nodeNeighbors(i, j) {
  const n = settings.n;
  const a = [];
  if (i > 0 && ver[i - 1][j]) a.push([i - 1, j]);
  if (i < n && ver[i][j]) a.push([i + 1, j]);
  if (j > 0 && hor[i][j - 1]) a.push([i, j - 1]);
  if (j < n && hor[i][j]) a.push([i, j + 1]);
  return a;
}

function checkConnectivity() {
  const n = settings.n;
  const visited = new Set();
  let start = null;
  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= n; j++) {
      const deg = nodeNeighbors(i, j).length;
      if (deg === 1 || deg > 2) return false;
      if (deg > 0 && !start) start = [i, j];
    }
  }
  if (!start) return false;
  const stack = [start];
  visited.add(start.toString());
  let edgeVisited = 0;
  while (stack.length) {
    const [i, j] = stack.pop();
    for (const [ni, nj] of nodeNeighbors(i, j)) {
      const key = ni + ',' + nj;
      if (!visited.has(key)) {
        visited.add(key);
        stack.push([ni, nj]);
      }
      edgeVisited++;
    }
  }
  edgeVisited /= 2;
  return edgeVisited === edgesCount();
}

function checkCircles() {
  const n = settings.n;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const type = circles[i][j];
      if (!type) continue;
      const ct = cellType(i, j);
      if (!ct) return false;
      if (type === 'W') {
        if (ct.kind !== 'straight') return false;
        const neigh = ct.dir === 'h' ? [[i, j - 1], [i, j + 1]] : [[i - 1, j], [i + 1, j]];
        let ok = false;
        for (const [ni, nj] of neigh) {
          if (ni < 0 || ni >= n || nj < 0 || nj >= n) continue;
          const nt = cellType(ni, nj);
          if (nt && nt.kind === 'turn') ok = true;
        }
        if (!ok) return false;
      } else if (type === 'B') {
        if (ct.kind !== 'turn') return false;
        const map = {
          'top,right': [[i - 1, j, 'v'], [i, j + 1, 'h']],
          'right,bottom': [[i, j + 1, 'h'], [i + 1, j, 'v']],
          'bottom,left': [[i + 1, j, 'v'], [i, j - 1, 'h']],
          'left,top': [[i, j - 1, 'h'], [i - 1, j, 'v']]
        };
        const key = ct.dirs.sort().join(',');
        const req = map[key];
        for (const [ni, nj, dir] of req) {
          if (ni < 0 || ni >= n || nj < 0 || nj >= n) return false;
          const nt = cellType(ni, nj);
          if (!nt || nt.kind !== 'straight' || nt.dir !== dir) return false;
        }
      }
    }
  }
  return true;
}

function checkSolved() {
  return checkConnectivity() && checkCircles();
}

initGame();
