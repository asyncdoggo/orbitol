import {vec2} from 'littlejsengine';

import { G, DIST_MIN } from './state.js';

export function calcGravityAccel(target, sourcePos, sourceMass) {
  const tx = target?.pos?.x;
  const ty = target?.pos?.y;
  const sx = sourcePos?.x;
  const sy = sourcePos?.y;
  const tm = target?.mass;


  const dx = sx - tx;
  const dy = sy - ty;
  let distance = (dx * dx + dy * dy) ** 0.5;
  if (distance < DIST_MIN) distance = DIST_MIN;

  const force = (G * tm * sourceMass) / (distance * distance);
  const ax = (force * (dx / distance)) / tm;
  const ay = (force * (dy / distance)) / tm;

  if(isNaN(ax) || isNaN(ay)){
    return vec2(0, 0);
  }
  
  return vec2(ax, ay);
}

export function calcMobileGravAccel(mobile, sourcePos, sourceMass) {
  const mx = mobile?.pos?.x;
  const my = mobile?.pos?.y;
  const sx = sourcePos?.x;
  const sy = sourcePos?.y;
  const mm = mobile?.mass;

  // If mobile mass is invalid (NaN) or temporarily 0, avoid division by 0.
  if (!Number.isFinite(mx) || !Number.isFinite(my) || !Number.isFinite(sx) || !Number.isFinite(sy)) return vec2(0, 0);
  if (!Number.isFinite(mm) || mm === 0) return vec2(0, 0);
  if (!Number.isFinite(sourceMass)) return vec2(0, 0);

  const dx = sx - mx;
  const dy = sy - my;

  let distance = (dx * dx + dy * dy) ** 0.5;
  if (!Number.isFinite(distance) || distance < DIST_MIN) distance = DIST_MIN;

  const force = (G * mm * sourceMass) / (distance * distance);
  const ax = (force * (dx / distance)) / mm;
  const ay = (force * (dy / distance)) / mm;

  if (!Number.isFinite(ax) || !Number.isFinite(ay)) return vec2(0, 0);

  return vec2(ax, ay);
}

export function integratePosition(p, v, a) {
  // Fixed dt per substep. `dtScale` is handled at a higher level by running multiple substeps.
  v.x += a.x;
  v.y += a.y;
  p.x += v.x;
  p.y += v.y;
}
