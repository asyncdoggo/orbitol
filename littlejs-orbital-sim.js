'use strict';

/*
  LittleJS Gravitational Orbital Simulation
  Migrated from index.js to LittleJS engine lifecycle.
*/

///////////////////////////////////////////////////////////////////////////////
// constants (match index.js)

const G = 0.1;            // Gravitational constant
const DIST_MIN = 10;     // minimum distance clamp to avoid singularities

// "index.js" uses per-interval (setInterval 6ms). LittleJS uses fixed timestep.
// The math in index.js is effectively scale-less; we keep it as similar as possible.
const dtScale = 2; // start as 1; tweak later if needed

///////////////////////////////////////////////////////////////////////////////
// simulation state

let canvasSize = vec2(1200, 800);

let obj = {
    pos: vec2(),
    vel: vec2(),
    ax: 0,
    ay: 0,
    mass: 1,
};

let mass1 = { pos: vec2(), vel: vec2(), ax: 0, ay: 0, mass: 100, color: rgb(255,0,0) };
let mass2 = { pos: vec2(), vel: vec2(), ax: 0, ay: 0, mass: 100, color: rgb(0,255,0) };
let mass3 = { pos: vec2(), vel: vec2(), ax: 0, ay: 0, mass: 50, color: rgb(255,255,0) };
let mass4 = { pos: vec2(), vel: vec2(), ax: 0, ay: 0, mass: 50, color: rgb(252, 113, 0) };
let mass5 = { pos: vec2(), vel: vec2(), ax: 0, ay: 0, mass: 50, color: rgb(0, 0, 0) };


let keyboardAx = 0;
let keyboardAy = 0;

// Generic lists so prediction works with N static and N moving masses.
// - staticMasses: masses that do not change position during simulation
// - mobileMasses: masses that move and affect both futureObj and each other?
//   NOTE: to match the original index.js behavior, mobile-mobiles DO NOT attract each other.
const staticMasses = [mass1, mass2];
const mobileMasses = [mass3, mass4, mass5];

let futurePositions = [];

let futureSteps = 10000;     // same magnitude as index.js

///////////////////////////////////////////////////////////////////////////////
// helpers

function calcGravityAccel(target, sourcePos, sourceMass)
{
    // index.js: dx = mass.x - obj.x, dy = mass.y - obj.y
    // LittleJS world Y axis is normal (up is +Y), so no inversion hack is needed.
    const dx = sourcePos.x - target.pos.x;
    const dy = sourcePos.y - target.pos.y;
    let distance = (dx*dx + dy*dy)**.5;
    if (distance < DIST_MIN) distance = DIST_MIN;

    const force = (G * target.mass * sourceMass) / (distance * distance);
    // acceleration = force / obj.mass
    const ax = force * (dx / distance) / target.mass;
    const ay = force * (dy / distance) / target.mass;

    return vec2(ax, ay);
}

function calcMobileGravAccel(mobile, sourcePos, sourceMass)
{
    // Same as above but mobile has its own mass
    const dx = sourcePos.x - mobile.pos.x;
    const dy = sourcePos.y - mobile.pos.y;
    let distance = (dx*dx + dy*dy)**.5;
    if (distance < DIST_MIN) distance = DIST_MIN;

    const force = (G * mobile.mass * sourceMass) / (distance * distance);
    const ax = force * (dx / distance) / mobile.mass;
    const ay = force * (dy / distance) / mobile.mass;
    return vec2(ax, ay);
}

function integratePosition(p, v, a)
{
    // Mirrors index.js updatePosition:
    // mass.vx += mass.ax; mass.x += mass.vx;
    // With LittleJS dt, we approximate by scaling acceleration and velocity.
    v.x += a.x * dtScale;
    v.y += a.y * dtScale;
    p.x += v.x * dtScale;
    p.y += v.y * dtScale;
}

function drawMassAt(pos, radius, color)
{
    // LittleJS drawCircle(size) uses diameter.
    // index.js uses arc(..., radius).
    // So pass diameter = radius * 2.
    
    drawCircle(pos, radius * 2, color);
}

function drawObjAt(pos, radius)
{
    // index.js arc radius is "radius"; drawCircle expects diameter
    drawCircle(pos, radius * 2, BLUE);
}

function computePredictedPath()
{
    // Copy initial state
    const futureObj = {
        pos: obj.pos.copy(),
        vel: obj.vel.copy(),
        ax: 0,
        ay: 0,
        mass: obj.mass,
    };

    const futureStaticMasses = staticMasses.map(sm => ({
        pos: sm.pos.copy(),
        mass: sm.mass,
    }));

    const futureMobileMasses = mobileMasses.map(mm => ({
        pos: mm.pos.copy(),
        vel: mm.vel.copy(),
        ax: 0,
        ay: 0,
        mass: mm.mass,
    }));

    futurePositions = [];
    futurePositions.push(futureObj.pos.copy());

    for (let i = 0; i < futureSteps; i++)
    {
        // reset accelerations
        futureObj.ax = 0;
        futureObj.ay = 0;
        for (const mm of futureMobileMasses)
        {
            mm.ax = 0;
            mm.ay = 0;
        }

        // (1) apply gravity from ALL masses to futureObj
        for (const sm of futureStaticMasses)
        {
            const a = calcGravityAccel(futureObj, sm.pos, sm.mass);
            futureObj.ax += a.x;
            futureObj.ay += a.y;
        }
        for (const mm of futureMobileMasses)
        {
            const a = calcGravityAccel(futureObj, mm.pos, mm.mass);
            futureObj.ax += a.x;
            futureObj.ay += a.y;
        }

        // (2) apply gravity to each moving mass from STATIC masses only
        // Matches original index.js: mass3 is attracted by the two static masses.
        for (const mm of futureMobileMasses)
        {
            for (const sm of futureStaticMasses)
            {
                const a = calcMobileGravAccel(mm, sm.pos, sm.mass);
                mm.ax += a.x;
                mm.ay += a.y;
            }
        }

        // (3) integrate moving masses first
        for (const mm of futureMobileMasses)
            integratePosition(mm.pos, mm.vel, vec2(mm.ax, mm.ay));

        // (4) integrate futureObj last
        integratePosition(futureObj.pos, futureObj.vel, vec2(futureObj.ax, futureObj.ay));

        futurePositions.push(futureObj.pos.copy());
    }
}

///////////////////////////////////////////////////////////////////////////////
// LittleJS callbacks

function gameInit()
{
    // Layout: index.html uses a 1200x800 container.
    setCanvasFixedSize(canvasSize);

    // Force world units == screen pixels so object sizes/positions match index.js.
    // LittleJS camera converts world->screen via cameraScale, so set to 1 and center via cameraPos.
    setCameraScale(1);
    setCameraPos(vec2(canvasSize.x/2, canvasSize.y/2));

    // Place objects in pixel coordinates (same as index.js).
    obj.pos.set(canvasSize.x/2, canvasSize.y/2 - 200);
    obj.vel.set(0.23, 0);
    obj.ax = 0;
    obj.ay = 0;

    mass1.pos.set(canvasSize.x/2, canvasSize.y/2);
    mass1.vel.set(0, 0);

    mass2.pos.set(canvasSize.x/2 + 200, canvasSize.y/2);
    mass2.vel.set(0, 0);

    mass3.pos.set(500.0, 400.0);
    mass3.vel.set(0.35, 0.15);

    mass4.pos.set(700.0, 400.0);
    mass4.vel.set(0.35, 0.15);

    mass5.pos.set(900.0, 400.0);
    mass5.vel.set(0.35, 0.15);

    computePredictedPath();
}

function gameUpdate()
{
    // keyboard acceleration (index.js uses -0.001 / +0.001)
    keyboardAx = 0;
    keyboardAy = 0;
    // WASD + Arrow keys
    // LittleJS keyIsDown uses named keys (often matching KeyboardEvent.code / key strings).
    // Support both common variants to ensure input works across browsers.
    const left  = keyIsDown('ArrowLeft') || keyIsDown('KeyA');
    const right = keyIsDown('ArrowRight') || keyIsDown('KeyD');
    const up    = keyIsDown('ArrowUp') || keyIsDown('KeyW');
    const down  = keyIsDown('ArrowDown') || keyIsDown('KeyS');

    if (left) keyboardAx = -0.001;
    else if (right) keyboardAx = 0.001;

    if (up) keyboardAy = 0.001;
    else if (down) keyboardAy = -0.001;

    // reset accelerations
    obj.ax = keyboardAx;
    obj.ay = keyboardAy;

    // reset accelerations for mobiles
    for (const mm of mobileMasses)
    {
        mm.ax = 0;
        mm.ay = 0;
    }

    // Apply gravitational forces to obj from ALL masses
    for (const sm of staticMasses)
    {
        const a = calcGravityAccel(obj, sm.pos, sm.mass);
        obj.ax += a.x;
        obj.ay += a.y;
    }
    for (const mm of mobileMasses)
    {
        const a = calcGravityAccel(obj, mm.pos, mm.mass);
        obj.ax += a.x;
        obj.ay += a.y;
    }

    // reset accelerations for mobiles
    for (const mm of mobileMasses)
    {
        mm.ax = 0;
        mm.ay = 0;
    }

    // Apply gravitational forces to EACH mobile from static masses only
    // (matches original index.js where mass3 only attracted by mass1+mass2)
    for (const mm of mobileMasses)
    {
        for (const sm of staticMasses)
        {
            const a = calcMobileGravAccel(mm, sm.pos, sm.mass);
            mm.ax += a.x;
            mm.ay += a.y;
        }
    }

    // update mobiles first (so they affect futureObj for subsequent steps)
    for (const mm of mobileMasses)
        integratePosition(mm.pos, mm.vel, vec2(mm.ax, mm.ay));

    // update obj last
    integratePosition(obj.pos, obj.vel, vec2(obj.ax, obj.ay));
}

function gameUpdatePost()
{
    // recompute prediction each frame (index.js does each render)
    computePredictedPath();
}

function gameRender()
{
    // Background: draw a fullscreen rect centered on the world center.
    // cameraScale=1 and cameraPos=(canvasSize/2) makes this map 1:1 to the view.
    drawRect(vec2(canvasSize.x/2, canvasSize.y/2), canvasSize, rgb(255,255,255));

    // Predicted path (sample to keep it cheap)
    const points = [];
    const sampleStep = Math.max(1, Math.floor(futurePositions.length / 1500));
    for (let i = 0; i < futurePositions.length; i += sampleStep)
        points.push(futurePositions[i]);

    if (points.length > 1)
        drawLineList(points, .5, rgb(0,0,1,.5), false);

    // Draw masses (arc radius in index.js is 20)
    drawMassAt(mass1.pos, 20, mass1.color);
    drawMassAt(mass2.pos, 20, mass2.color);
    drawMassAt(mass3.pos, 20, mass3.color);
    drawMassAt(mass4.pos, 20, mass4.color);
    drawMassAt(mass5.pos, 20, mass5.color);

    // Draw object (arc radius in index.js is 10)
    drawObjAt(obj.pos, 10);
}

function gameRenderPost()
{
    // no-op
}

///////////////////////////////////////////////////////////////////////////////
// Startup

engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost);
