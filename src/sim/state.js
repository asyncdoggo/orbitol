import {vec2, rgb, setCanvasFixedSize} from 'littlejsengine';

export const canvasSize = vec2(1200, 800);

export const G = 0.1;
export const DIST_MIN = 10;
export let dtScale = 0.1;
export const keyBoardMul = 0.1

// Track last values for prediction refresh control (prevents visible "morphing")

export const obj = {
  pos: vec2(),
  vel: vec2(),
  ax: 0,
  ay: 0,
  mass: 1,
};

// Dynamic masses (UI can add/remove any number of bodies).
// type: 'static' | 'mobile'
export const masses = [];

// Derived views used by simulation and prediction.
export function getStaticMasses() {
  return masses.filter(m => m.type === 'static');
}

export function getMobileMasses() {
  return masses.filter(m => m.type === 'mobile');
}

export function setDtScale(val) {
  dtScale = val
}

function makeMass(type, id, color) {
  return {
    id,
    type,
    pos: vec2(),
    vel: vec2(),
    ax: 0,
    ay: 0,
    mass: 1,
    color,
  };
}

// Simple color pool for added masses.
const colorPool = [
  rgb(255, 0, 0),
  rgb(0, 255, 0),
  rgb(0, 255, 149),
  rgb(4, 0, 253),
  rgb(0, 0, 0),
  rgb(255, 128, 0),
  rgb(255, 0, 255),
  rgb(0, 255, 255),
];

// API for UI
export function addMass(type = 'static') {
  const id = masses.length ? (Math.max(...masses.map(m => m.id)) + 1) : 1;
  const color = colorPool[(masses.length) % colorPool.length];
  const m = makeMass(type, id, color);
  masses.push(m);
  return m;
}

export function removeMass(id) {
  const idx = masses.findIndex(m => m.id === id);
  if (idx >= 0) masses.splice(idx, 1);
}

export function clearMasses() {
  masses.length = 0;
}

export let isPaused = true;

export let keyboardAx = 0;
export let keyboardAy = 0;

export function setPaused(v) {
  isPaused = v;
}

export function setKeyboard(ax, ay) {
  keyboardAx = ax;
  keyboardAy = ay;
}

export function togglePaused() {
  isPaused = !isPaused;
}

export let futurePositions = [];
export let futureMobilePositions = [];

export const futureStepsObj = 1000;
export const futureStepsMobiles = 1000;
export const samplingConstant = 1000;
