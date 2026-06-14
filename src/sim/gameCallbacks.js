'use strict';

import * as state from './state.js';
import { integratePosition } from './math.js';
import { updateInputsFromCurrentState, resetToUserInput, reseedSimulation, rerenderMassCards, wireMassButtons, saveSimulationToLocalStorage, restoreSimulationFromLocalStorage } from './ui.js';
import { computePredictedPath } from './prediction.js';
import { setCanvasFixedSize, setCameraScale, setCameraPos, vec2, drawRect, rgb, drawLineList, drawCircle, BLUE, keyIsDown  } from 'littlejsengine';
import {
  obj,
  canvasSize,
  futurePositions,
  futureMobilePositions,
  getStaticMasses,
  getMobileMasses,
  samplingConstant
} from './state.js';

function drawObjAt(pos, radius) {
  drawCircle(pos, radius * 2, BLUE);
}

export function gameInit() {
  setCanvasFixedSize(canvasSize);

  setCameraScale(1);
  setCameraPos(vec2(canvasSize.x / 2, canvasSize.y / 2));

  wireMassButtons();
  rerenderMassCards();

  const btnPausePlay = document.getElementById('btnPausePlay');
  if (btnPausePlay) {
    btnPausePlay.addEventListener('click', () => {
      state.togglePaused();
      btnPausePlay.textContent = state.isPaused ? 'Play' : 'Pause';

      if (state.isPaused) updateInputsFromCurrentState();
      computePredictedPath();
    });
  }

  const btnReset = document.getElementById('btnReset');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      reseedSimulation(state.canvasSize);
    });
  }

  const btnSave = document.getElementById('btnSave');
  if (btnSave) {
    btnSave.addEventListener('click', () => {
      saveSimulationToLocalStorage();
    });
  }

  const btnLoad = document.getElementById('btnLoad');
  if (btnLoad) {
    btnLoad.addEventListener('click', () => {
      const ok = restoreSimulationFromLocalStorage();
      if (ok) computePredictedPath();
    });
  }

  reseedSimulation(state.canvasSize);
}

export function gameUpdate() {
  if (state.isPaused) {
    resetToUserInput();
    return;
  }

  // Recompute derived lists each frame (arbitrary number of masses).
  const staticMasses = getStaticMasses();
  const mobileMasses = getMobileMasses();

  state.setKeyboard(0, 0);

  const left = keyIsDown('ArrowLeft') || keyIsDown('KeyA');
  const right = keyIsDown('ArrowRight') || keyIsDown('KeyD');
  const up = keyIsDown('ArrowUp') || keyIsDown('KeyW');
  const down = keyIsDown('ArrowDown') || keyIsDown('KeyS');

  if (left) state.setKeyboard(-0.001, state.keyboardAy);
  else if (right) state.setKeyboard(0.001, state.keyboardAy);
  else state.setKeyboard(state.keyboardAx, state.keyboardAy);

  if (up) state.setKeyboard(state.keyboardAx, 0.001);
  else if (down) state.setKeyboard(state.keyboardAx, -0.001);

  obj.ax = state.keyboardAx;
  obj.ay = state.keyboardAy;

  for (const mm of mobileMasses) {
    mm.ax = 0;
    mm.ay = 0;
  }

  // obj gravity from ALL masses
  for (const sm of staticMasses) {
    const dx = sm.pos.x - obj.pos.x;
    const dy = sm.pos.y - obj.pos.y;
    let distance = (dx * dx + dy * dy) ** 0.5;
    if (distance < state.DIST_MIN) distance = state.DIST_MIN;

    const force = (state.G * obj.mass * sm.mass) / (distance * distance);
    obj.ax += force * (dx / distance) / obj.mass;
    obj.ay += force * (dy / distance) / obj.mass;
  }

  for (const mm of mobileMasses) {
    const dx = mm.pos.x - obj.pos.x;
    const dy = mm.pos.y - obj.pos.y;
    let distance = (dx * dx + dy * dy) ** 0.5;
    if (distance < state.DIST_MIN) distance = state.DIST_MIN;

    const force = (state.G * obj.mass * mm.mass) / (distance * distance);
    obj.ax += force * (dx / distance) / obj.mass;
    obj.ay += force * (dy / distance) / obj.mass;
  }

  // mobiles gravity from static masses only
  for (const mm of mobileMasses) {
    for (const sm of staticMasses) {
      const dx = sm.pos.x - mm.pos.x;
      const dy = sm.pos.y - mm.pos.y;
      let distance = (dx * dx + dy * dy) ** 0.5;
      if (distance < state.DIST_MIN) distance = state.DIST_MIN;

      const force = (state.G * mm.mass * sm.mass) / (distance * distance);
      mm.ax += force * (dx / distance) / mm.mass;
      mm.ay += force * (dy / distance) / mm.mass;
    }
  }

  // mobiles mutual gravity
  for (const sm1 of mobileMasses) {
    for (const sm2 of mobileMasses) {
      if (sm1 !== sm2) {
        const dx = sm2.pos.x - sm1.pos.x;
        const dy = sm2.pos.y - sm1.pos.y;
        let distance = (dx * dx + dy * dy) ** 0.5;
        if (distance < state.DIST_MIN) distance = state.DIST_MIN;

        const force = (state.G * sm1.mass * sm2.mass) / (distance * distance);
        sm1.ax += force * (dx / distance) / sm1.mass;
        sm1.ay += force * (dy / distance) / sm1.mass;
      }
    }
  }

  for (const mm of mobileMasses) {
    integratePosition(mm.pos, mm.vel, vec2(mm.ax, mm.ay));
  }
  integratePosition(obj.pos, obj.vel, vec2(obj.ax, obj.ay));
}

export function gameUpdatePost() {
  if (!state.isPaused) updateInputsFromCurrentState();
  computePredictedPath();
}

export function gameRender() {
  const staticMasses = getStaticMasses();
  const mobileMasses = getMobileMasses();

  drawRect(vec2(canvasSize.x / 2, canvasSize.y / 2), canvasSize, rgb(255, 255, 255));

  // future blue object path
  {
    const points = [];
    const sampleStep = Math.max(1, Math.floor(futurePositions.length / samplingConstant));
    for (let i = 0; i < futurePositions.length; i += sampleStep) points.push(futurePositions[i]);
    if (points.length > 1) drawLineList(points, 0.5, rgb(0, 0, 1, 0.5), false);
  }

  // future mobile paths (index into current mobile list)
  {
    for (let mIndex = 0; mIndex < futureMobilePositions.length; mIndex++) {
      const list = futureMobilePositions[mIndex];
      const sampleStep = Math.max(1, Math.floor(list.length / samplingConstant));
      const points = [];
      for (let i = 0; i < list.length; i += sampleStep) points.push(list[i]);

      if (points.length > 1) {
        const mm = mobileMasses[mIndex];
        if (mm) drawLineList(points, 0.5, mm.color, false);
      }
    }
  }

  // draw all masses dynamically
  for (const sm of staticMasses)
    drawCircle(sm.pos, 40, sm.color);

  for (const mm of mobileMasses)
    drawCircle(mm.pos, 40, mm.color);

  drawObjAt(obj.pos, 10);
}

export function gameRenderPost() {
  // no-op
}
