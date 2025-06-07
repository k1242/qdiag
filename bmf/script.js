/* ====== PERSISTENCE ====== */
const STORAGE_KEY = 'bmfGame';
let initializing = true;

const saveGame = () => {
  if (typeof Tutorial !== 'undefined' && Tutorial.isActive()) return;
  if (editorMode) return; // don't save in editor mode
  
  const snapshot = {
    settings,
    target,
    state,
    timer: Timer.getState(),
    wasSolved
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch (e) {
    // ignore quota errors
  }
};

const loadSavedGame = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;

  let snap;
  try {
    snap = JSON.parse(raw);
  } catch {
    return false;
  }

  if (!snap.settings || !snap.target || !snap.state) return false;

  Object.assign(settings, snap.settings);
  target = snap.target;
  state = snap.state;
  wasSolved = snap.wasSolved || false;

  // validate structure
  if (!Array.isArray(target) || !Array.isArray(state.U) || !Array.isArray(state.V)) 
    return false;

  applyCSS();
  updateModeButtons();
  updateUIValues();

  // recalc solved state
  solved = matEq(player(), target);

  // restore timer
  if (snap.timer) {
    Timer.setState(snap.timer);
    if (wasSolved) Timer.stop();
  }

  return true;
};

/* ====== SETTINGS & STATE ====== */
const settings = { n: 5, r: 3, mode: 'mod', zoom: 1, showPreview: true, showTimer: false };
let solved = false, wasSolved = false, state, target;
let editorMode = false;
let savedBeforeEditor = null;
const $ = sel => document.querySelector(sel);

/* ====== UI HELPERS ====== */
const updateModeButtons = () => {
  $('#orBtn').classList.toggle('checked', settings.mode === 'bool');
  $('#xorBtn').classList.toggle('checked', settings.mode === 'mod');
};

const updateUIValues = () => {
  $('#nVal').textContent = settings.n;
  $('#rVal').textContent = settings.r;
  $('#zoomVal').textContent = Math.round(settings.zoom * 100) + ' %';
  $('#timerToggle').checked = settings.showTimer;
  $('#previewToggle').checked = settings.showPreview;
};

/* ====== BIT / HEX ====== */
const bitsToHex = b => {
  const pad = (4 - b.length % 4) % 4;
  if (pad) b += '0'.repeat(pad);
  return b.match(/.{4}/g).map(x => parseInt(x, 2).toString(16).toUpperCase()).join('');
};

const hexToBits = h => 
  [...h.toUpperCase()].map(c => parseInt(c, 16).toString(2).padStart(4, '0')).join('');

/* ====== HELPERS ====== */
const matEq = (a, b) => {
  for (let i = 0; i < a.length; i++)
    for (let j = 0; j < a.length; j++)
      if (a[i][j] !== b[i][j]) return false;
  return true;
};

const rnd = () => Math.random() < 0.5 ? 1 : 0;

const calcSize = () => {
  const g = innerWidth <= 600 ? 4 : 6;
  const max = innerWidth <= 600 ? innerWidth * 0.9 : 500;
  const raw = (max - (settings.n - 1) * g) / settings.n;
  return Math.max(22, Math.min(raw, innerWidth <= 600 ? 36 : 46));
};

const applyCSS = () => {
  const root = document.documentElement.style;
  root.setProperty('--n', settings.n);
  root.setProperty('--size', calcSize() + 'px');
  root.setProperty('--gap', (innerWidth <= 600 ? 4 : 6) + 'px');
  root.setProperty('--zoom', settings.zoom);
};

/* grid builder */
const gridHTML = (n, getCls) =>
  Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) =>
      `<div class="tile ${getCls(i, j)}"></div>`
    ).join('')
  ).join('');

const tileCls = (t, p, c) => {
  if (editorMode) {
    // in editor mode, just show current state
    return (c ? 'good' : 'zero');
  }
  return settings.mode === 'bool'
    ? (t ? (c ? 'good' : (p ? 'zero' : 'want')) : (c ? 'bad' : 'zero'))
    : (t ^ (p ^ c) ? (c ? 'good' : 'want') : (c ? 'bad' : 'zero'));
};

/* ====== ENCODE / LOAD ====== */
const encode = () => {
  let bits = [
    settings.n.toString(2).padStart(4, '0'),
    settings.r.toString(2).padStart(4, '0'),
    (settings.mode === 'mod' ? 1 : 0).toString(2).padStart(4, '0')
  ].join('');
  
  // in editor mode, encode player state instead of target
  const source = editorMode ? player() : target;
  for (let i = 0; i < settings.n; i++)
    for (let j = 0; j < settings.n; j++)
      bits += source[i][j];
      
  return bitsToHex(bits);
};

const loadFromCode = code => {
  if (!/^[0-9A-F]+$/i.test(code)) return false;
  const bits = hexToBits(code);
  if (bits.length < 12) return false;

  const n = parseInt(bits.slice(0, 4), 2);
  const r = parseInt(bits.slice(4, 8), 2);
  const modeBit = parseInt(bits.slice(8, 12), 2);

  if (n < 2 || n > 10 || r < 1 || r > 6 || ![0, 1].includes(modeBit)) return false;

  const cells = n * n;
  const boardBits = bits.slice(12, 12 + cells).padEnd(cells, '0');
  target = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => +boardBits[i * n + j])
  );

  Object.assign(settings, { n, r, mode: modeBit ? 'mod' : 'bool' });
  applyCSS();
  initState();
  solved = false;
  wasSolved = false;
  Timer.reset();
  Timer.start();
  updateModeButtons();
  updateUIValues();
  render();
  return true;
};

/* ====== STATE ====== */
const initState = () => {
  state = {
    U: Array.from({ length: settings.r }, () => Array(settings.n).fill(0)),
    V: Array.from({ length: settings.r }, () => Array(settings.n).fill(0)),
    cur: 0
  };
};

const genTarget = () => {
  target = Array.from({ length: settings.n }, () => Array(settings.n).fill(0));
  
  for (let k = 0; k < settings.r; k++) {
    const tU = Array.from({ length: settings.n }, rnd);
    const tV = Array.from({ length: settings.n }, rnd);
    
    for (let i = 0; i < settings.n; i++)
      if (tU[i])
        for (let j = 0; j < settings.n; j++)
          if (tV[j])
            settings.mode === 'bool' ? (target[i][j] = 1) : (target[i][j] ^= 1);
  }
};

const player = () => {
  const P = Array.from({ length: settings.n }, () => Array(settings.n).fill(0));
  for (let k = 0; k < settings.r; k++)
    for (let i = 0; i < settings.n; i++)
      if (state.U[k][i])
        for (let j = 0; j < settings.n; j++)
          if (state.V[k][j])
            settings.mode === 'bool' ? (P[i][j] = 1) : (P[i][j] ^= 1);
  return P;
};

/* ====== EDITOR MODE ====== */
const enterEditorMode = () => {
  // save current state
  savedBeforeEditor = {
    settings: {...settings},
    target: target ? [...target.map(row => [...row])] : null,
    state: state ? JSON.parse(JSON.stringify(state)) : null,
    timerState: Timer.getState(),
    wasSolved,
    solved
  };
  
  editorMode = true;
  Timer.stop();
  correctNotification.hide();
  
  // Force timer off and preview on in editor mode
  settings.showTimer = false;
  settings.showPreview = true;
  $('#timerToggle').checked = false;
  $('#previewToggle').checked = true;
  Timer.updateDisplay();
  
  // Clear all toggles
  state.U.forEach(u => u.fill(0));
  state.V.forEach(v => v.fill(0));
  
  render();
};

const exitEditorMode = () => {
  editorMode = false;
  $('#editorToggle').checked = false; // обновить состояние toggle
  
  // restore saved state
  if (savedBeforeEditor) {
    Object.assign(settings, savedBeforeEditor.settings);
    target = savedBeforeEditor.target;
    state = savedBeforeEditor.state;
    wasSolved = savedBeforeEditor.wasSolved;
    solved = savedBeforeEditor.solved;
    
    updateUIValues();
    updateModeButtons();
    applyCSS();
    render();
    
    Timer.setState(savedBeforeEditor.timerState);
    if (solved) correctNotification.show();
  }
  
  savedBeforeEditor = null;
};

/* ====== CORRECT NOTIFICATION ====== */
const correctNotification = (() => {
  let element = null;
  
  const show = () => {
    if (!element) {
      element = document.createElement('div');
      element.className = 'correct-badge';
      element.innerHTML = `
        <span class="correct-icon">✓</span>
        <span class="correct-text">Correct!</span>
      `;
      document.body.appendChild(element);
    }
    element.classList.add('show');
  };
  
  const hide = () => {
    if (element) {
      element.classList.remove('show');
    }
  };
  
  return { show, hide };
})();

/* ====== RENDER ====== */
const render = () => {
  const P = player();
  const k = state.cur;

  // main grid
  $('#editGrid').innerHTML = gridHTML(settings.n, (i, j) =>
    tileCls(target[i][j], P[i][j], state.U[k][i] && state.V[k][j])
  );

  // toggles
  $('#rowToggles').innerHTML = state.U[k]
    .map((v, i) => `<button class="toggle ${v ? 'on' : ''}" data-row="${i}"></button>`)
    .join('');

  $('#colToggles').innerHTML = state.V[k]
    .map((v, j) => `<button class="toggle ${v ? 'on' : ''}" data-col="${j}"></button>`)
    .join('');

  // layer cards
  $('#cards').innerHTML = Array.from({ length: settings.r }, (_, d) => {
    const mini = gridHTML(settings.n, (i, j) =>
      tileCls(target[i][j], P[i][j], state.U[d][i] && state.V[d][j])
    );
    return `<div class="card ${d === k ? 'active' : ''}" data-card="${d}">
              <div class="grid mini">${mini}</div>
            </div>`;
  }).join('');

  // previews
  if (editorMode) {
    // in editor mode, only show "You" preview
    $('#previews').innerHTML = settings.showPreview
      ? `<div class="gridCard">
           <div class="label">You</div>
           <div class="grid mini">${gridHTML(settings.n, (i, j) => (P[i][j] ? 'good' : 'zero'))}</div>
         </div>`
      : '';
  } else {
    $('#previews').innerHTML = settings.showPreview
      ? `<div class="gridCard">
           <div class="label">Target</div>
           <div class="grid mini">${gridHTML(settings.n, (i, j) => (target[i][j] ? 'good' : 'zero'))}</div>
         </div>
         <div class="gridCard">
           <div class="label">You</div>
           <div class="grid mini">${gridHTML(settings.n, (i, j) => (P[i][j] ? 'good' : 'zero'))}</div>
         </div>`
      : '';
  }

  // check solution (only in normal mode)
  if (!editorMode) {
    const nowSolved = matEq(P, target);
    if (!solved && nowSolved) {
      solved = true;
      wasSolved = true;
      Timer.stop();
      correctNotification.show();
    } else if (solved && !nowSolved) {
      solved = false;
      correctNotification.hide();
      if (!wasSolved) Timer.start();
    }
  }

  $('#codeInput').value = encode();

  if (!initializing && !editorMode) saveGame();
};

/* ====== UI EVENTS ====== */
const setupEventHandlers = () => {
  $('#menuBtn').onclick = () => $('#panel').classList.toggle('open');
  
  $('#newBtn').onclick = () => {
    if (editorMode) {
      $('#editorToggle').checked = false;
      exitEditorMode();
    }
    newGame();
    $('#panel').classList.remove('open');
  };

  // editor mode toggle
  $('#editorToggle').onchange = e => {
    if (e.target.checked) {
      enterEditorMode();
    } else {
      exitEditorMode();
    }
  };

  // delegated events for toggles and cards
  $('#app').addEventListener('click', e => {
    const tgt = e.target.closest('[data-row],[data-col],[data-card]');
    if (!tgt) return;

    if (tgt.dataset.row !== undefined)
      state.U[state.cur][+tgt.dataset.row] ^= 1;
    else if (tgt.dataset.col !== undefined)
      state.V[state.cur][+tgt.dataset.col] ^= 1;
    else
      state.cur = +tgt.dataset.card;

    render();
    
    if (!editorMode && !solved && !wasSolved && !Timer.isRunning) Timer.start();
  });

  $('#clearBtn').onclick = () => {
    state.U.forEach(u => u.fill(0));
    state.V.forEach(v => v.fill(0));
    solved = false;
    render();
  };

  // clipboard
  $('#copyCodeBtn').onclick = () => {
    navigator.clipboard.writeText(encode()).then(() => {
      const btn = $('#copyCodeBtn');
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = 'Copy Code';
        btn.classList.remove('copied');
      }, 600);
    });
  };

  // load code
  $('#loadCodeBtn').onclick = () => {
    if (editorMode) {
      $('#editorToggle').checked = false;
      exitEditorMode();
    }
    if (!loadFromCode($('#codeInput').value.trim())) alert('Invalid code');
  };
  
  $('#codeInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') $('#loadCodeBtn').click();
  });

  // mode buttons
  $('#orBtn').onclick = () => {
    settings.mode = 'bool';
    updateModeButtons();
    if (!editorMode) newGame();
    else render();
  };
  
  $('#xorBtn').onclick = () => {
    settings.mode = 'mod';
    updateModeButtons();
    if (!editorMode) newGame();
    else render();
  };

  // steppers
  document.querySelectorAll('.stepper').forEach(stepper => {
    stepper.onclick = e => {
      const inc = e.target.classList.contains('plus') ? 1 
                : e.target.classList.contains('minus') ? -1 : 0;
      if (!inc) return;

      const target = stepper.dataset.target;
      if (target === 'n') {
        settings.n = Math.max(2, Math.min(10, settings.n + inc));
        $('#nVal').textContent = settings.n;
        if (!editorMode) newGame();
        else {
          applyCSS();
          initState();
          render();
        }
      } else if (target === 'r') {
        settings.r = Math.max(1, Math.min(6, settings.r + inc));
        $('#rVal').textContent = settings.r;
        if (!editorMode) newGame();
        else {
          initState();
          render();
        }
      } else if (target === 'zoom') {
        const percent = Math.round(settings.zoom * 100) + inc * 5;
        settings.zoom = Math.max(0.5, Math.min(1, percent / 100));
        $('#zoomVal').textContent = Math.round(settings.zoom * 100) + ' %';
        applyCSS();
        render();
      }
    };
  });

  // toggles
  $('#previewToggle').onchange = e => {
    settings.showPreview = e.target.checked;
    render();
  };

  $('#timerToggle').onchange = e => {
    settings.showTimer = e.target.checked;
    Timer.updateDisplay();
    render();
  };

  $('#helpLink').onclick = e => {
    e.preventDefault();
    if (editorMode) exitEditorMode();
    Tutorial.start();
  };

  addEventListener('resize', () => {
    applyCSS();
    render();
  });
};

/* ====== BOOTSTRAP ====== */
const newGame = () => {
  applyCSS();
  initState();
  genTarget();
  solved = false;
  wasSolved = false;
  Timer.reset();
  Timer.start();
  render();
};

document.addEventListener('DOMContentLoaded', () => {
  setupEventHandlers();
  updateUIValues();
  Timer.updateDisplay();

  if (!loadSavedGame()) {
    newGame();
  } else {
    render();
    if (!wasSolved && !solved) Timer.start();
  }
  
  initializing = false;
});