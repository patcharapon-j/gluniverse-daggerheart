/**
 * The condition material at a size you can actually judge.
 *
 * The fidelity gate renders every condition at 160px in three columns, which
 * is the right shape for "has anything regressed" and the wrong one for "what
 * is this composite doing". Two hues meeting over a cheekbone is a decision
 * about twenty pixels, and on the gate those twenty pixels are four.
 *
 * So: one case, large, live, with the shipped shader read straight out of src
 * and the same uniform contract Foundry writes. Pick conditions, watch the
 * seams. The rim readout underneath samples the ring the way the eye does at
 * 40px, because the ring is the only part of any of this that survives being
 * small and it is the part hardest to check by looking at a big picture.
 */
import { CONDITION_MATERIALS, TOKEN_CONDITION_FRAGMENT } from '../src/module/token-conditions.ts';
import { CONDITION_MATERIAL_BASELINE, CONDITION_MATERIAL_BASELINE_REF } from './qa/condition-fidelity/baseline.js';

const SIZE = 512;
const byId = new Map(CONDITION_MATERIALS.map((entry, index) => [entry.id, { ...entry, index }]));

const vertex = `attribute vec2 aPosition;varying vec2 vTextureCoord;
void main(){vTextureCoord=vec2(aPosition.x*.5+.5,1.0-(aPosition.y*.5+.5));gl_Position=vec4(aPosition,0.0,1.0);}`;

const compile = (gl, type, source) => {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
  return shader;
};

const link = (gl, fragment) => {
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertex));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  return program;
};

/* Matches Foundry: the shader writes premultiplied colour and a context asking
   for straight alpha un-multiplies it, which is how a premultiplication bug
   hid on the other design page for three review passes. preserveDrawingBuffer
   so the rim readout can read pixels back outside the draw. */
const context = (canvas) => {
  const gl = canvas.getContext('webgl', {
    alpha: true, antialias: true, premultipliedAlpha: true, preserveDrawingBuffer: true,
  });
  if (!gl) throw new Error('WebGL unavailable');
  return gl;
};

async function portrait() {
  const art = new Image();
  /* decode() was tried and hangs here on WebKit for an image that is not in
     the document, with no rejection to catch: the page simply stops between
     the picker and the first draw. load/error is the boring contract that
     works everywhere, and the timeout exists so a harness that cannot get its
     portrait says so instead of showing two empty discs. */
  const ready = new Promise((resolve, reject) => {
    art.addEventListener('load', () => resolve(), { once: true });
    art.addEventListener('error', () => reject(new Error('portrait failed to load')), { once: true });
    setTimeout(() => reject(new Error('portrait timed out')), 8000);
  });
  art.src = '/design/assets/art-sample-01.png';
  await ready;
  /* A live Token mesh already contains the configured square crop, so the
     harness feeds the cropped square rather than the study-page source. */
  const out = document.createElement('canvas');
  out.width = out.height = SIZE;
  out.getContext('2d').drawImage(
    art, art.width * 0.313, art.height * 0.16, art.width * 0.334, art.height * 0.483, 0, 0, SIZE, SIZE);
  return out;
}

function stage(canvas, fragment, texture) {
  const gl = context(canvas);
  const program = link(gl, fragment);
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'aPosition');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const tex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture);

  const names = ['uSampler','inputSize','outputFrame','inputClamp','uCount','uDead','uTime','uSubject',
    'uSeed','uAge0','uAge1','uAge2','uAge3','uAge4',
    'uId0','uId1','uId2','uId3','uId4','uColor0','uColor1','uColor2','uColor3','uColor4'];
  const u = Object.fromEntries(names.map((name) => [name, gl.getUniformLocation(program, name)]));
  gl.uniform1i(u.uSampler, 0);
  gl.viewport(0, 0, canvas.width, canvas.height);
  return { gl, u };
}

/* The quad IS the texture, so the frame and the texture are one square and
   tokenUv() is the identity. The frame size is what the detail budget reads,
   and it is the one thing this page varies on purpose: `frame` is the token's
   width on screen, not the size of the picture on this page. */
function draw({ gl, u }, { ids, dead, time, frame, seed, age }) {
  gl.uniform4f(u.inputSize, SIZE, SIZE, 1 / SIZE, 1 / SIZE);
  gl.uniform4f(u.outputFrame, 0, 0, frame, frame);
  gl.uniform4f(u.inputClamp, 0, 0, 1, 1);
  gl.uniform1f(u.uSubject, 1);
  gl.uniform1f(u.uTime, time);
  gl.uniform1f(u.uSeed, seed);
  gl.uniform1f(u.uDead, dead ? 1 : 0);
  gl.uniform1f(u.uCount, dead ? 0 : ids.length);
  for (let i = 0; i < 5; i++) {
    const material = byId.get(ids[i]);
    gl.uniform1f(u['uAge' + i], age);
    gl.uniform1f(u['uId' + i], material ? material.index : 0);
    gl.uniform3fv(u['uColor' + i], material ? material.color : [0, 0, 0]);
  }
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

/* Sixteen samples around the ring, at the radius the rim glow peaks. What this
   answers is the only question that matters at 40px: can you still see more
   than one condition on this creature. */
function rimSwatches(gl) {
  const px = new Uint8Array(SIZE * SIZE * 4);
  gl.readPixels(0, 0, SIZE, SIZE, gl.RGBA, gl.UNSIGNED_BYTE, px);
  const centre = SIZE / 2;
  const radius = SIZE * 0.43;
  return Array.from({ length: 16 }, (_, k) => {
    const angle = (k / 16) * Math.PI * 2;
    const x = Math.round(centre + Math.cos(angle) * radius);
    /* readPixels is bottom-up; the draw is too, so the sign cancels and this
       is the same angle the shader's atan sees. */
    const y = Math.round(centre + Math.sin(angle) * radius);
    const i = (y * SIZE + x) * 4;
    return `rgb(${px[i]},${px[i + 1]},${px[i + 2]})`;
  });
}

const ids = new Set(['markedForDeath', 'charged']);
let paused = false;
let small = false;
let frozenAge = 99;
let onsetAt = null;

const picker = document.querySelector('#picker');
picker.innerHTML = CONDITION_MATERIALS.map((material) => `
  <button type="button" data-id="${material.id}" class="${ids.has(material.id) ? 'on' : ''}">
    <i style="background:${material.hex}"></i>${material.id}
  </button>`).join('');

/* Reported on the page rather than only in the console. A harness that fails
   silently is worse than no harness: two blank discs look like a composite
   that draws nothing, which is a conclusion about the shader rather than about
   the page. Caught explicitly rather than through an unhandledrejection
   listener, because a rejection out of module top-level await does not
   reliably reach one. */
let left, right, swatches;
try {
  const texture = await portrait();
  left = stage(document.querySelector('#before'), CONDITION_MATERIAL_BASELINE, texture);
  right = stage(document.querySelector('#after'), TOKEN_CONDITION_FRAGMENT, texture);
  swatches = document.querySelector('#rim');
  document.querySelector('#ref').textContent = CONDITION_MATERIAL_BASELINE_REF;
} catch (error) {
  document.documentElement.dataset.qa = 'failed';
  document.querySelector('.rimnote').textContent = `harness failed: ${error?.message ?? error}`;
  console.error(error);
  throw error;
}

/**
 * The claim this whole pass rests on: one condition still looks exactly like
 * it shipped.
 *
 * Presence weighting is supposed to change the composite only where more than
 * one condition is present — with a single condition the weight cancels in its
 * own normalisation and every term should come out where it was. "Should" is
 * not evidence, and nothing about a quiet drift in a single-condition material
 * would be visible beside a baseline rendering the same picture. So the two
 * canvases are differenced whenever exactly one condition is selected, and the
 * worst channel is reported. Anything above a rounding step is a regression in
 * the twenty-four cases that are not what this pass is about.
 */
function singleConditionDrift() {
  const pixels = (gl) => {
    const px = new Uint8Array(SIZE * SIZE * 4);
    gl.readPixels(0, 0, SIZE, SIZE, gl.RGBA, gl.UNSIGNED_BYTE, px);
    return px;
  };
  const a = pixels(left.gl);
  const b = pixels(right.gl);
  let worst = 0;
  for (let i = 0; i < a.length; i += 4)
    for (let k = 0; k < 3; k++) worst = Math.max(worst, Math.abs(a[i + k] - b[i + k]));
  return worst;
}

const drift = document.querySelector('#drift');
let frames = 0;

function render(now) {
  const time = paused ? 2.35 : now / 1000;
  const age = onsetAt === null ? frozenAge : (now - onsetAt) / 1000;
  const frame = small ? 40 : SIZE;
  const state = { ids: [...ids], dead: ids.size === 0, time, frame, seed: 0, age };
  /* The baseline has neither uSeed nor uAge and getUniformLocation returns
     null for both, which the uniform calls ignore: the left column is simply
     the shader as it shipped. */
  draw(left, state);
  draw(right, state);
  swatches.replaceChildren(...rimSwatches(right.gl).map((color) => {
    const cell = document.createElement('i');
    cell.style.background = color;
    return cell;
  }));
  /* Not every frame: reading back two full canvases is the most expensive
     thing on this page and the answer does not move. */
  if (frames++ % 30 === 0) {
    if (ids.size !== 1) drift.textContent = '';
    else {
      const worst = singleConditionDrift();
      drift.textContent = worst <= 1
        ? `one condition: identical to ${CONDITION_MATERIAL_BASELINE_REF} (worst channel ${worst}/255)`
        : `one condition: DRIFTED from ${CONDITION_MATERIAL_BASELINE_REF} by ${worst}/255`;
      drift.dataset.state = worst <= 1 ? 'ok' : 'bad';
    }
  }
  requestAnimationFrame(render);
}

picker.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-id]');
  if (!button) return;
  const id = button.dataset.id;
  if (ids.has(id)) ids.delete(id);
  /* Five is the shader's ceiling and the oldest selection is what a sixth
     condition would displace on the canvas, so it is what it displaces here. */
  else { if (ids.size >= 5) ids.delete([...ids][0]); ids.add(id); }
  [...picker.querySelectorAll('button')].forEach((b) => b.classList.toggle('on', ids.has(b.dataset.id)));
  onsetAt = performance.now();
});

document.querySelector('#pause').addEventListener('click', (event) => {
  paused = !paused;
  event.target.textContent = paused ? 'play' : 'pause';
});
document.querySelector('#small').addEventListener('click', (event) => {
  small = !small;
  event.target.textContent = small ? 'full detail' : '40px budget';
});
document.querySelector('#replay').addEventListener('click', () => { onsetAt = performance.now(); });

requestAnimationFrame(render);
document.documentElement.dataset.qa = 'ready';
