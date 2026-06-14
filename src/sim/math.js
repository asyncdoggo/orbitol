import {vec2} from 'littlejsengine';

import { G, DIST_MIN, dtScale } from './state.js';

export function calcGravityAccel(target, sourcePos, sourceMass) {
  const dx = sourcePos.x - target.pos.x;
  const dy = sourcePos.y - target.pos.y;
  let distance = (dx * dx + dy * dy) ** 0.5;
  if (distance < DIST_MIN) distance = DIST_MIN;

  const force = (G * target.mass * sourceMass) / (distance * distance);
  const ax = (force * (dx / distance)) / target.mass;
  const ay = (force * (dy / distance)) / target.mass;

  return vec2(ax, ay);
}

export function calcMobileGravAccel(mobile, sourcePos, sourceMass) {
  const dx = sourcePos.x - mobile.pos.x;
  const dy = sourcePos.y - mobile.pos.y;
  let distance = (dx * dx + dy * dy) ** 0.5;
  if (distance < DIST_MIN) distance = DIST_MIN;

  const force = (G * mobile.mass * sourceMass) / (distance * distance);
  const ax = (force * (dx / distance)) / mobile.mass;
  const ay = (force * (dy / distance)) / mobile.mass;
  return vec2(ax, ay);
}

export function integratePosition(p, v, a) {
  v.x += a.x * dtScale;
  v.y += a.y * dtScale;
  p.x += v.x * dtScale;
  p.y += v.y * dtScale;
}
