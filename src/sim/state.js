import {vec2, rgb, setCanvasFixedSize} from 'littlejsengine';

export const canvasSize = vec2(1200, 800);

export const G = 0.1;
export const DIST_MIN = 10;
export const dtScale = 2;

export const obj = {
  pos: vec2(),
  vel: vec2(),
  ax: 0,
  ay: 0,
  mass: 1,
};

export const mass1 = { pos: vec2(), vel: vec2(), ax: 0, ay: 0, mass: 100, color: rgb(255, 0, 0) };
export const mass2 = { pos: vec2(), vel: vec2(), ax: 0, ay: 0, mass: 100, color: rgb(0, 255, 0) };
export const mass3 = { pos: vec2(), vel: vec2(), ax: 0, ay: 0, mass: 50, color: rgb(0, 255, 149) };
export const mass4 = { pos: vec2(), vel: vec2(), ax: 0, ay: 0, mass: 50, color: rgb(4, 0, 253) };
export const mass5 = { pos: vec2(), vel: vec2(), ax: 0, ay: 0, mass: 50, color: rgb(0, 0, 0) };

export const staticMasses = [mass1, mass2];
export const mobileMasses = [mass3, mass4, mass5];

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
export const futureStepsMobiles = 5000;
export const samplingConstant = 2000;
