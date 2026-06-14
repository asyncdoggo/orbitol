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
  const slowKey = keyIsDown('KeyQ');
  const fastKey = keyIsDown('KeyE');

  // Update dtScale even when paused (for visual feedback & consistent prediction).
  // dtScale is clamped at minimum 0 (no reverse time).
  if (slowKey) state.setDtScale(Math.max(0, state.dtScale - 0.01));
  else if (fastKey) state.setDtScale(state.dtScale + 0.01);

  const dtIndicator = document.getElementById('dtScaleIndicator');
  if (dtIndicator) dtIndicator.textContent = state.dtScale.toFixed(2);

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

  if (left) state.setKeyboard(-state.keyBoardMul, state.keyboardAy);
  else if (right) state.setKeyboard(state.keyBoardMul, state.keyboardAy);
  else state.setKeyboard(state.keyboardAx, state.keyboardAy);

  if (up) state.setKeyboard(state.keyboardAx, state.keyBoardMul);
  else if (down) state.setKeyboard(state.keyboardAx, -state.keyBoardMul);

  // dtScale should be a true time multiplier per rendered frame.
  // To avoid numeric issues and to ensure consistent integration, we split dtScale into substeps.
  const rawTimeScale = state.dtScale;
  const clampedTimeScale = rawTimeScale < 0 ? 0 : rawTimeScale;

  const fullSteps = Math.floor(clampedTimeScale);
  const frac = clampedTimeScale - fullSteps;

  const substepCount = fullSteps > 0 ? fullSteps : 0;

  const runStep = (subDt) => {
    // reset accelerations (keyboard affects obj only)
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

    // integrate mobiles then obj using subDt
    for (const mm of mobileMasses) {
      integratePosition(mm.pos, mm.vel, vec2(mm.ax, mm.ay), subDt);
    }
    integratePosition(obj.pos, obj.vel, vec2(obj.ax, obj.ay), subDt);
  };

  // run full substeps at dt=1
  for (let i = 0; i < substepCount; i++) runStep(1);

  // run fractional remainder if any, or at least one step if dtScale is 0 (keeps behavior sane)
  if (frac > 0) runStep(frac);
  else if (clampedTimeScale === 0) {
    // no movement
  } else if (substepCount === 0) {
    // dtScale between 0 and 1 but rounded down => run one fractional dt
    runStep(clampedTimeScale);
  }
}

export function gameUpdatePost() {
  // Live prediction should update when the "prediction basis" changes.
  // Otherwise, reuse the existing predicted path to avoid visible morphing artifacts.

    // Keep UI->state inputs synchronized before recomputing predictions.
    if (!state.isPaused)
      updateInputsFromCurrentState();

    computePredictedPath();

    return;

  // No recompute: keep existing futurePositions/futureMobilePositions stable while running.
  if (state.isPaused) {
    // When paused, inputs change via UI, so keep them synced, but don't morph unless pausedChanged/dtChanged fired.
    updateInputsFromCurrentState();
  }
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
