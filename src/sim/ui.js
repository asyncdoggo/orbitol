'use strict';

import { obj, masses, addMass, removeMass, clearMasses, getMobileMasses, getStaticMasses } from './state.js';

const GRID_COLS = '70px 1fr';
const MASS_INPUT_STEP = '0.01';
const POS_INPUT_STEP = '0.1';
const VEL_INPUT_STEP = '0.01';
const ACC_INPUT_STEP = '0.01';

export function readNum(id, defaultValue = 0) {
  const el = document.getElementById(id);
  if (!el) return defaultValue;
  const v = parseFloat(el.value);
  return Number.isFinite(v) ? v : defaultValue;
}

function readNumMass(id, defaultValue = 1) {
  // Mass inputs should default to 1 if empty/NaN.
  return readNum(id, defaultValue);
}

export function setInputValue(id, v) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = v;
}

function massInputId(mId, suffix) {
  // Example: mass-3-mass / mass-3-x / mass-3-vx ...
  return `mass-${mId}-${suffix}`;
}

function ensureMassListUI() {
  const list = document.getElementById('massesList');
  return list;
}

function createLabeledNumberRow(massId, { label, suffix, step }) {
  const row = document.createElement('div');
  row.className = 'row';
  row.style.gridTemplateColumns = GRID_COLS;

  const lab = document.createElement('label');
  lab.textContent = label;
  lab.htmlFor = massInputId(massId, suffix);

  const input = document.createElement('input');
  input.id = massInputId(massId, suffix);
  input.type = 'number';
  input.step = step;

  row.appendChild(lab);
  row.appendChild(input);
  return row;
}

function createMassCard(m) {
  const card = document.createElement('div');
  card.className = 'massCard';
  card.dataset.massId = String(m.id);

  const header = document.createElement('div');
  header.className = 'massCardHeader';

  const title = document.createElement('div');
  title.className = 'massCardTitle';
  title.textContent = `${m.type === 'static' ? 'Static' : 'Mobile'} Mass #${m.id}`;

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'massRemoveBtn';
  removeBtn.textContent = 'Remove';
  removeBtn.addEventListener('click', () => {
    removeMass(m.id);
    rerenderMassCards();
    updateInputsFromCurrentState();
    // prediction/game loop will recompute each frame via computePredictedPath()
  });

  header.appendChild(title);
  header.appendChild(removeBtn);
  card.appendChild(header);

  // mass
  card.appendChild(
    createLabeledNumberRow(m.id, { label: 'mass', suffix: 'mass', step: MASS_INPUT_STEP })
  );

  // position
  const posWrap = document.createElement('div');
  posWrap.className = 'massPosWrap';

  for (const f of [
    { label: 'x', suffix: 'x', step: POS_INPUT_STEP },
    { label: 'y', suffix: 'y', step: POS_INPUT_STEP },
  ]) {
    posWrap.appendChild(createLabeledNumberRow(m.id, f));
  }
  card.appendChild(posWrap);

  // For mobile masses: acc + vel
  if (m.type === 'mobile') {
    const accTitle = document.createElement('div');
    accTitle.className = 'massSectionTitle';
    accTitle.textContent = 'acc (ax, ay)';
    card.appendChild(accTitle);

    for (const f of [
      { label: 'ax', suffix: 'ax', step: ACC_INPUT_STEP },
      { label: 'ay', suffix: 'ay', step: ACC_INPUT_STEP },
    ]) {
      card.appendChild(createLabeledNumberRow(m.id, f));
    }

    const velTitle = document.createElement('div');
    velTitle.className = 'massSectionTitle';
    velTitle.textContent = 'vel (vx, vy)';
    card.appendChild(velTitle);

    for (const f of [
      { label: 'vx', suffix: 'vx', step: VEL_INPUT_STEP },
      { label: 'vy', suffix: 'vy', step: VEL_INPUT_STEP },
    ]) {
      card.appendChild(createLabeledNumberRow(m.id, f));
    }
  }

  // color indicator
  const colorBar = document.createElement('div');
  colorBar.className = 'massColorBar';
  colorBar.style.background = m.color;
  card.appendChild(colorBar);

  return card;
}

export function rerenderMassCards() {
  const list = ensureMassListUI();
  if (!list) return;

  list.innerHTML = '';

  for (const m of masses) {
    list.appendChild(createMassCard(m));
  }
}

export function wireMassButtons() {
  const btnAddStatic = document.getElementById('btnAddStaticMass');
  if (btnAddStatic) {
    btnAddStatic.addEventListener('click', () => {
      const m = addMass('static');
      // default values
      m.mass = 100;
      m.pos.x = obj.pos.x;
      m.pos.y = obj.pos.y;
      rerenderMassCards();
      updateInputsFromCurrentState();
    });
  }

  const btnAddMobile = document.getElementById('btnAddMobileMass');
  if (btnAddMobile) {
    btnAddMobile.addEventListener('click', () => {
      const m = addMass('mobile');
      m.mass = 0.00000001;
      m.pos.x = obj.pos.x;
      m.pos.y = obj.pos.y;
      m.vel.x = 0;
      m.vel.y = 0;
      m.ax = 0;
      m.ay = 0;
      rerenderMassCards();
      updateInputsFromCurrentState();
    });
  }
}

export function updateInputsFromCurrentState() {
  setInputValue('obj_mass', obj.mass);
  setInputValue('obj_x', obj.pos.x);
  setInputValue('obj_y', obj.pos.y);
  setInputValue('obj_vx', obj.vel.x);
  setInputValue('obj_vy', obj.vel.y);
  setInputValue('obj_ax', obj.ax);
  setInputValue('obj_ay', obj.ay);

  for (const m of masses) {
    setInputValue(massInputId(m.id, 'mass'), m.mass);
    setInputValue(massInputId(m.id, 'x'), m.pos.x);
    setInputValue(massInputId(m.id, 'y'), m.pos.y);

    if (m.type === 'mobile') {
      setInputValue(massInputId(m.id, 'vx'), m.vel.x);
      setInputValue(massInputId(m.id, 'vy'), m.vel.y);
      setInputValue(massInputId(m.id, 'ax'), m.ax);
      setInputValue(massInputId(m.id, 'ay'), m.ay);
    }
  }
}

export function resetToUserInput() {
  obj.mass = readNum('obj_mass', obj.mass);

  obj.pos.set(
    readNum('obj_x', obj.pos.x),
    readNum('obj_y', obj.pos.y)
  );

  obj.vel.set(
    readNum('obj_vx', obj.vel.x),
    readNum('obj_vy', obj.vel.y)
  );

  obj.ax = readNum('obj_ax', obj.ax);
  obj.ay = readNum('obj_ay', obj.ax);

  // Do not integrate cus its paused

  for (const m of masses) {
    m.mass = readNumMass(massInputId(m.id, 'mass'), m.mass);
    m.pos.set(
      readNum(massInputId(m.id, 'x'), m.pos.x),
      readNum(massInputId(m.id, 'y'), m.pos.y)
    );

    if (m.type === 'mobile') {
      m.vel.set(
        readNum(massInputId(m.id, 'vx'), m.vel.x),
        readNum(massInputId(m.id, 'vy'), m.vel.y)
      );
      m.ax = readNum(massInputId(m.id, 'ax'), m.ax);
      m.ay = readNum(massInputId(m.id, 'ay'), m.ay);
    }
  }
}

const STORAGE_KEY = 'littlejs_orbital_sim_v1';

export function saveSimulationToLocalStorage() {
  // Persist obj + arbitrary number of masses from current state.
  const payload = {
    obj: {
      mass: obj.mass,
      pos: { x: obj.pos.x, y: obj.pos.y },
      vel: { x: obj.vel.x, y: obj.vel.y },
      ax: obj.ax,
      ay: obj.ay,
    },
    masses: masses.map(m => ({
      id: m.id,
      type: m.type,
      mass: m.mass,
      pos: { x: m.pos.x, y: m.pos.y },
      vel: { x: m.vel.x, y: m.vel.y },
      ax: m.ax,
      ay: m.ay,
      color: m.color?.toString ? m.color.toString() : undefined,
    })),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function restoreSimulationFromLocalStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;

  const payload = JSON.parse(raw);

  // Restore obj
  if (payload?.obj) {
    obj.mass = payload.obj.mass ?? obj.mass;

    if (payload.obj.pos) obj.pos.set(payload.obj.pos.x ?? obj.pos.x, payload.obj.pos.y ?? obj.pos.y);
    if (payload.obj.vel) obj.vel.set(payload.obj.vel.x ?? obj.vel.x, payload.obj.vel.y ?? obj.vel.y);

    obj.ax = payload.obj.ax ?? obj.ax;
    obj.ay = payload.obj.ay ?? obj.ay;
  }

  // Restore masses
  clearMasses();

  const savedMasses = Array.isArray(payload?.masses) ? payload.masses : [];
  for (const sm of savedMasses) {
    const m = addMass(sm.type === 'mobile' ? 'mobile' : 'static');
    // addMass auto-assigns ids; override to preserve order where possible
    m.id = typeof sm.id === 'number' ? sm.id : m.id;

    m.mass = sm.mass ?? m.mass;
    if (sm.pos) m.pos.set(sm.pos.x ?? m.pos.x, sm.pos.y ?? m.pos.y);
    if (sm.vel) m.vel.set(sm.vel.x ?? m.vel.x, sm.vel.y ?? m.vel.y);
    m.ax = sm.ax ?? m.ax;
    m.ay = sm.ay ?? m.ay;
    // color is optional; keep whatever was assigned by addMass/colorPool
  }

  rerenderMassCards();
  updateInputsFromCurrentState();
  return true;
}

export function reseedSimulation(canvasSize) {
  // Clear existing masses and rebuild from defaults.
  clearMasses();

  // obj seed
  obj.mass = 1;
  obj.pos.set(canvasSize.x / 2, canvasSize.y / 2 - 200);
  obj.vel.set(0.2355, -0.1);
  obj.ax = 0;
  obj.ay = 0;

  // Create some default masses (no longer hard-coded m1..m5 exports).
  {
    const s1 = addMass('static');
    s1.mass = 100;
    s1.pos.set(canvasSize.x / 2, canvasSize.y / 2);

    const s2 = addMass('static');
    s2.mass = 100;
    s2.pos.set(canvasSize.x / 2 + 200, canvasSize.y / 2);

    const m1 = addMass('mobile');
    m1.mass = 0.00000001;
    m1.pos.set(497.0, 400.0);
    m1.vel.set(-0.0536, 0.25);
    m1.ax = 0;
    m1.ay = 0;

    const m2 = addMass('mobile');
    m2.mass = 0.00000001;
    m2.pos.set(700.0, 400.0);
    m2.vel.set(0.4406, 0.2971);
    m2.ax = 0;
    m2.ay = 0;

    const m3 = addMass('mobile');
    m3.mass = 0.00000001;
    m3.pos.set(900.0, 400.0);
    m3.vel.set(0.1898, 0.2758);
    m3.ax = 0;
    m3.ay = 0;
  }

  rerenderMassCards();
  updateInputsFromCurrentState();
}

