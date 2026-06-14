'use strict';

import { obj, mass1, mass2, mass3, mass4, mass5 } from './state.js';

export function readNum(id, defaultValue = 0) {
  const el = document.getElementById(id);
  if (!el) return defaultValue;
  const v = parseFloat(el.value);
  return Number.isFinite(v) ? v : defaultValue;
}

export function setInputValue(id, v) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = v;
}

export function updateInputsFromCurrentState() {
  setInputValue('obj_mass', obj.mass);

  setInputValue('obj_x', obj.pos.x);
  setInputValue('obj_y', obj.pos.y);

  setInputValue('obj_vx', obj.vel.x);
  setInputValue('obj_vy', obj.vel.y);

  setInputValue('obj_ax', obj.ax);
  setInputValue('obj_ay', obj.ay);

  setInputValue('m1_mass', mass1.mass);
  setInputValue('m1_x', mass1.pos.x);
  setInputValue('m1_y', mass1.pos.y);

  setInputValue('m2_mass', mass2.mass);
  setInputValue('m2_x', mass2.pos.x);
  setInputValue('m2_y', mass2.pos.y);

  setInputValue('m3_mass', mass3.mass);
  setInputValue('m3_x', mass3.pos.x);
  setInputValue('m3_y', mass3.pos.y);
  setInputValue('m3_vx', mass3.vel.x);
  setInputValue('m3_vy', mass3.vel.y);
  setInputValue('m3_ax', mass3.ax);
  setInputValue('m3_ay', mass3.ay);

  setInputValue('m4_mass', mass4.mass);
  setInputValue('m4_x', mass4.pos.x);
  setInputValue('m4_y', mass4.pos.y);
  setInputValue('m4_vx', mass4.vel.x);
  setInputValue('m4_vy', mass4.vel.y);
  setInputValue('m4_ax', mass4.ax);
  setInputValue('m4_ay', mass4.ay);

  setInputValue('m5_mass', mass5.mass);
  setInputValue('m5_x', mass5.pos.x);
  setInputValue('m5_y', mass5.pos.y);
  setInputValue('m5_vx', mass5.vel.x);
  setInputValue('m5_vy', mass5.vel.y);
  setInputValue('m5_ax', mass5.ax);
  setInputValue('m5_ay', mass5.ay);
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

  obj.ax = readNum('obj_ax', 0);
  obj.ay = readNum('obj_ay', 0);

  // apply initial accel into velocity immediately
  obj.vel.x += obj.ax * 2;
  obj.vel.y += obj.ay * 2;

  mass1.mass = readNum('m1_mass', mass1.mass);
  mass1.pos.set(
    readNum('m1_x', mass1.pos.x),
    readNum('m1_y', mass1.pos.y)
  );

  mass2.mass = readNum('m2_mass', mass2.mass);
  mass2.pos.set(
    readNum('m2_x', mass2.pos.x),
    readNum('m2_y', mass2.pos.y)
  );

  for (const [mm, massKey] of [
    [mass3, 'm3'],
    [mass4, 'm4'],
    [mass5, 'm5'],
  ]) {
    mm.mass = readNum(massKey + '_mass', mm.mass);
    mm.pos.set(
      readNum(massKey + '_x', mm.pos.x),
      readNum(massKey + '_y', mm.pos.y)
    );
    mm.vel.set(
      readNum(massKey + '_vx', mm.vel.x),
      readNum(massKey + '_vy', mm.vel.y)
    );

    mm.ax = readNum(massKey + '_ax', mm.ax);
    mm.ay = readNum(massKey + '_ay', mm.ay);
  }
}

export function reseedSimulation(canvasSize) {
  setInputValue('obj_mass', 1);
  setInputValue('obj_x', canvasSize.x / 2);
  setInputValue('obj_y', canvasSize.y / 2 - 200);

  setInputValue('obj_vx', 0.2355);
  setInputValue('obj_vy', -0.1);

  setInputValue('obj_ax', 0);
  setInputValue('obj_ay', 0);

  setInputValue('m1_mass', 100);
  setInputValue('m1_x', canvasSize.x / 2);
  setInputValue('m1_y', canvasSize.y / 2);

  setInputValue('m2_mass', 100);
  setInputValue('m2_x', canvasSize.x / 2 + 200);
  setInputValue('m2_y', canvasSize.y / 2);

  setInputValue('m3_mass', 0.00000001);
  setInputValue('m3_x', 497.00);
  setInputValue('m3_y', 400.0);
  setInputValue('m3_vx', -0.0536);
  setInputValue('m3_vy', 0.25);
  setInputValue('m3_ax', 0);
  setInputValue('m3_ay', 0);

  setInputValue('m4_mass', 0.00000001);
  setInputValue('m4_x', 700.0);
  setInputValue('m4_y', 400.0);
  setInputValue('m4_vx', 0.4406);
  setInputValue('m4_vy', 0.2971);
  setInputValue('m4_ax', 0);
  setInputValue('m4_ay', 0);

  setInputValue('m5_mass', 0.00000001);
  setInputValue('m5_x', 900.0);
  setInputValue('m5_y', 400.0);
  setInputValue('m5_vx', 0.1898);
  setInputValue('m5_vy', 0.2758);
  setInputValue('m5_ax', 0);
  setInputValue('m5_ay', 0);
}
