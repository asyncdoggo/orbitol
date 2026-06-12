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

function readNum(id, defaultValue=0)
{
    const el = document.getElementById(id);
    if (!el) return defaultValue;
    const v = parseFloat(el.value);
    return Number.isFinite(v) ? v : defaultValue;
}

function setInputValue(id, v)
{
    const el = document.getElementById(id);
    if (!el) return;
    el.value = (Math.abs(v) < 1e-12 ? 0 : v);
}

function updateInputsFromCurrentState()
{
    // Keep inputs synced to simulation state (acts like a simple state->UI binding)

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

    // mobile masses: also show ax/ay currently applied (after gravity+keyboard)
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

let mass1 = { pos: vec2(), vel: vec2(), ax: 0, ay: 0, mass: 100, color: rgb(255,0,0) };
let mass2 = { pos: vec2(), vel: vec2(), ax: 0, ay: 0, mass: 100, color: rgb(0,255,0) };
let mass3 = { pos: vec2(), vel: vec2(), ax: 0, ay: 0, mass: 50, color: rgb(0, 255, 149) };
let mass4 = { pos: vec2(), vel: vec2(), ax: 0, ay: 0, mass: 50, color: rgb(4, 0, 253) };
let mass5 = { pos: vec2(), vel: vec2(), ax: 0, ay: 0, mass: 50, color: rgb(0, 0, 0) };


let keyboardAx = 0;
let keyboardAy = 0;

let isPaused = true;

function resetToUserInput()
{
    // Blue object (obj)
    obj.mass = readNum('obj_mass', obj.mass);

    obj.pos.set(
        readNum('obj_x', obj.pos.x),
        readNum('obj_y', obj.pos.y)
    );

    obj.vel.set(
        readNum('obj_vx', obj.vel.x),
        readNum('obj_vy', obj.vel.y)
    );

    // initial accel inputs are applied at Reset time only
    obj.ax = readNum('obj_ax', 0);
    obj.ay = readNum('obj_ay', 0);

    // Apply the initial acceleration immediately into velocity (like a first integration step)
    // so it meaningfully affects the trajectory.
    obj.vel.x += obj.ax * dtScale;
    obj.vel.y += obj.ay * dtScale;

    // Static masses
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

    // Mobile masses: read x/y/vel + initial ax/ay
    for (const [mm, massKey] of [
        [mass3, 'm3'],
        [mass4, 'm4'],
        [mass5, 'm5'],
    ])
    {
        mm.mass = readNum(massKey + '_mass', mm.mass);
        mm.pos.set(
            readNum(massKey + '_x', mm.pos.x),
            readNum(massKey + '_y', mm.pos.y)
        );
        mm.vel.set(
            readNum(massKey + '_vx', mm.vel.x),
            readNum(massKey + '_vy', mm.vel.y)
        );

        mm.ax = readNum(massKey + '_ax', 0);
        mm.ay = readNum(massKey + '_ay', 0);

        // apply initial accel into velocity immediately
        mm.vel.x += mm.ax * dtScale;
        mm.vel.y += mm.ay * dtScale;
    }

    // recompute predictions immediately
    computePredictedPath();

    // keep UI synced to the actual reset state when paused
    // if (isPaused)
        // updateInputsFromCurrentState();
}

// Generic lists so prediction works with N static and N moving masses.
// - staticMasses: masses that do not change position during simulation
// - mobileMasses: masses that move and affect both futureObj and each other?
//   NOTE: to match the original index.js behavior, mobile-mobiles DO NOT attract each other.
const staticMasses = [mass1, mass2];
const mobileMasses = [mass3, mass4, mass5];

let futurePositions = [];
let futureMobilePositions = []; // predicted positions for moving masses

let futureStepsObj = 1000; // prediction steps for blue object
let futureStepsMobiles = 1000; // prediction steps for moving masses
let samplingConstant = 10000; // max number of segments to render for predicted paths (for performance)
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
    // Copy static initial state once for each horizon simulation

    // --- Predict blue object for futureStepsObj (and also move masses along the way) ---
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

    const futureMobileMassesForObj = mobileMasses.map(mm => ({
        pos: mm.pos.copy(),
        vel: mm.vel.copy(),
        ax: 0,
        ay: 0,
        mass: mm.mass,
    }));

    futurePositions = [];
    futurePositions.push(futureObj.pos.copy());

    for (let i = 0; i < futureStepsObj; i++)
    {
        // reset accelerations
        futureObj.ax = 0;
        futureObj.ay = 0;
        for (const mm of futureMobileMassesForObj)
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
        for (const mm of futureMobileMassesForObj)
        {
            const a = calcGravityAccel(futureObj, mm.pos, mm.mass);
            futureObj.ax += a.x;
            futureObj.ay += a.y;
        }

        // (2) apply gravity to each moving mass from STATIC masses only
        for (const mm of futureMobileMassesForObj)
        {
            for (const sm of futureStaticMasses)
            {
                const a = calcMobileGravAccel(mm, sm.pos, sm.mass);
                mm.ax += a.x;
                mm.ay += a.y;
            }
        }

        // (3) integrate moving masses first
        for (let mIndex = 0; mIndex < futureMobileMassesForObj.length; mIndex++)
        {
            const mm = futureMobileMassesForObj[mIndex];
            integratePosition(mm.pos, mm.vel, vec2(mm.ax, mm.ay));
        }

        // (4) integrate futureObj last
        integratePosition(futureObj.pos, futureObj.vel, vec2(futureObj.ax, futureObj.ay));

        futurePositions.push(futureObj.pos.copy());
    }

    // --- Predict moving masses for futureStepsMobiles only (render length should be 1000) ---
    const futureMobileMasses = mobileMasses.map(mm => ({
        pos: mm.pos.copy(),
        vel: mm.vel.copy(),
        ax: 0,
        ay: 0,
        mass: mm.mass,
    }));

    futureMobilePositions = [];
    for (let mIndex = 0; mIndex < futureMobileMasses.length; mIndex++)
        futureMobilePositions.push([futureMobileMasses[mIndex].pos.copy()]);

    for (let i = 0; i < futureStepsMobiles; i++)
    {
        // reset accelerations
        for (const mm of futureMobileMasses)
        {
            mm.ax = 0;
            mm.ay = 0;
        }

        // apply gravity to moving masses from STATIC masses only
        for (const mm of futureMobileMasses)
        {
            for (const sm of futureStaticMasses)
            {
                const a = calcMobileGravAccel(mm, sm.pos, sm.mass);
                mm.ax += a.x;
                mm.ay += a.y;
            }
        }

        // integrate moving masses
        for (let mIndex = 0; mIndex < futureMobileMasses.length; mIndex++)
        {
            const mm = futureMobileMasses[mIndex];
            integratePosition(mm.pos, mm.vel, vec2(mm.ax, mm.ay));
        }

        // record predicted moving positions
        for (let mIndex = 0; mIndex < futureMobileMasses.length; mIndex++)
            futureMobilePositions[mIndex].push(futureMobileMasses[mIndex].pos.copy());
    }
}


///////////////////////////////////////////////////////////////////////////////
// LittleJS callbacks

function gameInit()
{
    // Layout: index.html uses a 1200x800 container.
    // Force LittleJS canvas to remain fixed-size even when the browser window is narrow.
    setCanvasFixedSize(canvasSize);

    // Force world units == screen pixels so object sizes/positions match index.js.
    // LittleJS camera converts world->screen via cameraScale, so set to 1 and center via cameraPos.
    setCameraScale(1);
    setCameraPos(vec2(canvasSize.x/2, canvasSize.y/2));

    // Default starting state (matches current tuned setup in this file)
    obj.pos.set(canvasSize.x/2, canvasSize.y/2 - 200);
    obj.vel.set(0.23, 0);
    obj.ax = 0;
    obj.ay = 0;
    obj.mass = 1;

    mass1.pos.set(canvasSize.x/2, canvasSize.y/2);
    mass1.vel.set(0, 0);

    mass2.pos.set(canvasSize.x/2 + 200, canvasSize.y/2);
    mass2.vel.set(0, 0);

    mass3.pos.set(500.0, 400.0);
    mass3.vel.set(-0.08, 0.25);

    mass4.pos.set(700.0, 400.0);
    mass4.vel.set(0.08, -0.25);

    mass5.pos.set(900.0, 400.0);
    mass5.vel.set(-0.08, 0.25);

    // ensure ax/ay are 0 at start
    obj.ax = 0; obj.ay = 0;
    mass3.ax = 0; mass3.ay = 0;
    mass4.ax = 0; mass4.ay = 0;
    mass5.ax = 0; mass5.ay = 0;

    // Wire UI buttons
    const btnPausePlay = document.getElementById('btnPausePlay');
    if (btnPausePlay)
    {
        btnPausePlay.addEventListener('click', () => {
            isPaused = !isPaused;
            btnPausePlay.textContent = isPaused ? 'Play' : 'Pause';
            // when pausing, sync inputs to current live values
            if (isPaused)
                updateInputsFromCurrentState();
            computePredictedPath();
        });
    }

    const btnReset = document.getElementById('btnReset');
    if (btnReset)
    {
        btnReset.addEventListener('click', () => {
            resetToUserInput();
        });
    }

    // Populate parameter panel inputs with current state initially
    updateInputsFromCurrentState();

    computePredictedPath();
}

function gameUpdate()
{
    if (isPaused)
    {
        // keep live displayed accelerations by recomputing but do not integrate positions
        keyboardAx = 0;
        keyboardAy = 0;

        obj.ax = 0;
        obj.ay = 0;

        for (const mm of mobileMasses)
        {
            mm.ax = 0;
            mm.ay = 0;
        }

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

        for (const mm of mobileMasses)
        {
            for (const sm of staticMasses)
            {
                const a = calcMobileGravAccel(mm, sm.pos, sm.mass);
                mm.ax += a.x;
                mm.ay += a.y;
            }
        }

        return;
    }

    // keyboard acceleration (index.js uses -0.001 / +0.001)
    keyboardAx = 0;
    keyboardAy = 0;

    // WASD + Arrow keys
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

    // Apply gravitational forces to EACH mobile from static masses only
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
    // Keep prediction updated and keep UI synced in realtime while playing
    computePredictedPath();
    if (!isPaused)
        updateInputsFromCurrentState();
}



function gameRender()
{
    // Background: draw a fullscreen rect centered on the world center.
    // cameraScale=1 and cameraPos=(canvasSize/2) makes this map 1:1 to the view.
    drawRect(vec2(canvasSize.x/2, canvasSize.y/2), canvasSize, rgb(255,255,255));

    // Predicted path for blue object (sample to keep it cheap)
    {
        const points = [];
        const sampleStep = Math.max(1, Math.floor(futurePositions.length / samplingConstant));
        for (let i = 0; i < futurePositions.length; i += sampleStep)
            points.push(futurePositions[i]);

        if (points.length > 1)
            drawLineList(points, .5, rgb(0,0,1,.5), false);
    }

    // Predicted paths for moving masses: N separate polylines
    {
        for (let mIndex = 0; mIndex < futureMobilePositions.length; mIndex++)
        {
            const list = futureMobilePositions[mIndex];
            const sampleStep = Math.max(1, Math.floor(list.length / samplingConstant));
            const points = [];
            for (let i = 0; i < list.length; i += sampleStep)
                points.push(list[i]);
            if (points.length > 1)
            {
                const mm = mobileMasses[mIndex];
                drawLineList(points, .5, mm.color, false);
            }
        }
    }

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
