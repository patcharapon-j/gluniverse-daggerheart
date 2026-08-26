/**
 * Build the condition-material fidelity gate as one self-contained page.
 *
 * Both shaders are inlined — the shipped one straight out of src/, so the
 * comparison is against the real program rather than a copy that will
 * drift — and the portrait goes in as a data URI. The result opens with no
 * server and no checkout.
 *
 * Generated, never edited. Run it again after touching either shader.
 */

import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { TOKEN_CONDITION_FRAGMENT } from "../src/module/token-conditions.ts";
import { CONDITION_MATERIAL_REFINED, CONDITIONS, PALETTE } from "../design/qa/condition-fidelity/material.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = process.argv[2] ?? join(root, "design/qa/condition-fidelity/sixteen-materials.html");

/* The shader only ever sees the square crop a live Token mesh already
   contains, so that is what gets embedded — 24KB instead of 3.2MB. */
const source = join(root, "design/assets/art-sample-01.png");
const crop = join(root, "node_modules/.cache-portrait.jpg");
const size = (flag) =>
  Number(execFileSync("sips", ["-g", flag, source]).toString().match(/\d+$/m)[0]);
const [w, h] = [size("pixelWidth"), size("pixelHeight")];
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", source, "-vf",
  `crop=${Math.round(w * .334)}:${Math.round(h * .483)}:${Math.round(w * .313)}:${Math.round(h * .16)},scale=320:320`,
  "-q:v", "3", crop]);
const portrait = `data:image/jpeg;base64,${readFileSync(crop).toString("base64")}`;
rmSync(crop, { force: true });

const COMPOSITES = [
  [["vulnerable", "ablaze"], "Vulnerable + Ablaze",
    "Two conditions whose hot cores are different temperatures, and both survive the roll-off."],
  [["markedForDeath", "charged"], "Marked for Death + Charged",
    "A sigil and a filament. Neither used to have a core; both are now the brightest thing in their own effect."],
  [["hidden", "corroded", "drained"], "Hidden + Corroded + Drained",
    "Three dark conditions. The extra octaves are what stop this reading as one grey fog."],
  [["spectral", "invisible"], "Spectral + Invisible",
    "The two most transparent materials in the set, layered."],
];

const rows = [
  ...CONDITIONS.map(([id, label, copy], i) => ({ ids: [id], label, copy, tint: PALETTE[i] })),
  ...COMPOSITES.map(([ids, label, copy]) => ({ ids, label, copy, tint: null, composite: true })),
];

/* Escaped to pure ASCII. The Artifact wrapper supplies the charset, but a
   file opened straight off disk or a dev server has no head of its own to
   declare one, and an em-dash arriving as three bytes of mojibake in the
   row copy is not a bug worth having twice. */
const j = (value) => JSON.stringify(value)
  .replace(/[\u007f-\uffff]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));
const TILE = 160;
/* Column 2 runs the refined shader with the frame uniforms set to a 40px
   token. tokenUv and sampleArt both divide the frame back out, so the
   mapping is untouched and the only thing that changes is how much detail
   the shader is willing to resolve — which is the whole point of showing
   it. Rendered at full tile size so it can actually be inspected. */
const SMALL = 40;

const html = `<title>Sixteen Materials</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap">
<style>
/* Committed to one theme, and it is a decision rather than an omission:
   every material here is judged against the black a virtual tabletop
   actually renders on, and a light ground would misreport all sixteen.
   Every colour is explicit so the page holds on any host ground. */
:root{
  --ground:#06080b; --panel:#0c1218; --sunk:#0a0f15;
  --rule:#151d27; --rule-warm:#2b2114;
  --ink:#eef3f8; --ink-2:#96a3b1; --ink-3:#5f6c7a;
  --gold:#e0b647; --gold-dim:#8a6c22;
  --ui:'Lexend',ui-sans-serif,system-ui,sans-serif;
  --mono:'JetBrains Mono',ui-monospace,SFMono-Regular,monospace;
  --tile:${TILE}px;
}
*{box-sizing:border-box}
body{margin:0;background:var(--ground);color:var(--ink);font-family:var(--ui);
  font-weight:300;-webkit-font-smoothing:antialiased}
.page{max-width:1180px;margin:0 auto;padding:56px 32px 96px}

.eyebrow{font-family:var(--mono);font-weight:700;font-size:10px;letter-spacing:.18em;
  text-transform:uppercase;color:var(--gold);margin:0 0 14px}
h1{margin:0 0 18px;font-weight:600;font-size:clamp(32px,4.6vw,50px);line-height:.99;
  letter-spacing:-.035em;text-wrap:balance;color:var(--ink)}
.lede{max-width:62ch;margin:0 0 14px;color:var(--ink-2);font-size:15px;line-height:1.72}
.lede strong{color:var(--ink);font-weight:500}
.lede em{color:var(--ink);font-style:normal;font-weight:500}

.bar{display:flex;gap:16px;align-items:center;margin:30px 0 0;flex-wrap:wrap}
button{border:1px solid var(--rule);border-radius:6px;padding:9px 15px;cursor:pointer;
  background:var(--panel);color:var(--ink-2);font-family:var(--mono);font-weight:700;
  font-size:10px;letter-spacing:.14em;text-transform:uppercase;transition:.15s}
button:hover{background:var(--gold);border-color:var(--gold);color:#12161b}
button:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
.status{font-family:var(--mono);font-weight:500;font-size:10px;letter-spacing:.1em;
  text-transform:uppercase;color:var(--ink-3)}

.heads{display:flex;justify-content:flex-end;margin:36px 0 0}
.heads span{width:var(--tile);text-align:center;font-family:var(--mono);font-weight:700;
  font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-3);
  padding-bottom:9px;line-height:1.5}
.heads span.new{color:var(--gold)}
.heads span i{display:block;font-style:normal;font-weight:500;letter-spacing:.08em;
  color:var(--ink-3);font-size:8px;margin-top:3px}
.ledger{position:relative}
#gl{position:absolute;top:0;right:0;width:calc(var(--tile) * 3);height:auto;
  -webkit-mask-image:radial-gradient(circle closest-side,#000 96%,transparent 99%);
  mask-image:radial-gradient(circle closest-side,#000 96%,transparent 99%);
  -webkit-mask-size:var(--tile) var(--tile);mask-size:var(--tile) var(--tile);
  -webkit-mask-repeat:repeat;mask-repeat:repeat}
.row{height:var(--tile);padding:20px calc(var(--tile) * 3 + 26px) 0 22px;
  border-top:1px solid var(--rule);position:relative}
.row.composite{border-top:1px solid var(--rule-warm)}
.row .sw{position:absolute;left:0;top:26px;width:7px;height:7px;border-radius:2px}
.row b{display:block;font-weight:500;font-size:16px;letter-spacing:-.015em;color:var(--ink)}
.row span{display:block;margin-top:8px;max-width:48ch;color:var(--ink-2);
  font-size:12.5px;line-height:1.62}
.row.composite b{color:var(--gold)}

h2{margin:0 0 18px;font-family:var(--mono);font-weight:700;font-size:10px;
  letter-spacing:.18em;text-transform:uppercase;color:var(--ink-3)}
.section{margin-top:72px}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:40px}
.cols p{margin:0 0 14px;color:var(--ink-2);font-size:13.5px;line-height:1.74}
.cols p strong{color:var(--ink);font-weight:500}
.cols p em{color:var(--ink);font-style:normal;font-weight:500}
code{font-family:var(--mono);font-weight:500;font-size:11.5px;color:#bed0e3;
  background:var(--sunk);padding:2px 6px;border-radius:4px}
.note{margin-top:18px;padding:18px 20px;border-radius:10px;background:var(--sunk);
  border:1px solid var(--rule)}
.note h3{margin:0 0 10px;font-family:var(--mono);font-weight:700;font-size:9.5px;
  letter-spacing:.16em;text-transform:uppercase;color:var(--gold)}
.note p{margin:0;font-size:12.5px;line-height:1.7;color:var(--ink-2)}
.note p + p{margin-top:10px}

@media (max-width:980px){
  .cols{grid-template-columns:1fr;gap:28px}
  .row span{display:none}
}
@media (prefers-reduced-motion:reduce){button{transition:none}}
</style>

<div class="page">
<p class="eyebrow">Design gate &middot; not in production</p>
<h1>The same shader, with something to look at</h1>
<p class="lede">This is not the material-model rewrite. That proposal replaced the composite with
absorb, emit and a key light, and it was rejected on sight, correctly &mdash; it darkened the portrait
and embossed everything, trading the shipped shader's best quality, which is that the material reads as
<em>fused into</em> the artwork rather than laid over it. <strong>The composite is kept.</strong> Every
difference on this page comes from the pattern functions and one roll-off.</p>
<p class="lede">Left column is what ships today; centre is the proposal; right is the centre column at a
40&nbsp;pixel token, which is the case that decides how much detail is safe to add at all.</p>

<div class="bar">
  <button id="pause" type="button">pause</button>
  <span class="status" id="status">compiling&hellip;</span>
</div>

<div class="heads">
  <span>shipped</span>
  <span class="new">proposed<i>full detail</i></span>
  <span class="new">proposed<i>40px token</i></span>
</div>
<div class="ledger"><canvas id="gl"></canvas><div id="table"></div></div>

<div class="section">
<h2>Why sixteen conditions looked like one</h2>
<div class="cols">
<div>
<p><strong>They had no scale hierarchy and no composition.</strong> Each condition was written at a
single frequency, spread evenly, radially symmetric, filling the disc. That is a texture rather than an
effect, and sixteen textures at one frequency are sixteen hazes &mdash; at which point the only thing
separating one condition from another is its hue.</p>
<p>So each one now has a large structure, a medium one, and a fine register that only exists when there
are pixels to carry it. And each has somewhere it comes <em>from</em>. Vulnerable breaks from a point off
centre, so the shards radiate the way glass actually fails. Charged branches from a source instead of
radiating from the middle. Corroded eats in patches, because corrosion everywhere at once is a colour
and corrosion with clean metal beside it is a material.</p>
<p><strong>Four conditions were drawing concentric rings</strong> &mdash; Restrained, Silenced, Stunned
and Marked for Death. Four conditions sharing a primitive is four conditions nobody can tell apart, so
Restrained became angled iron bands with lashings across them, and Marked for Death became a reticle:
sparse, mechanical, the one condition on a token that somebody else put there.</p>
<p>Cloaked had the same problem against Vulnerable &mdash; both drew voronoi seams. It is dazzle now:
flat panels at three values with hard boundaries, on the principle that an outline drawn on a shape
still shows the shape.</p>
</div>
<div>
<p><strong>Nothing was ever incandescent.</strong> The shipped emissive is <code>pow(peak, 3.4) * .3</code>
across the whole pattern, which lifts everything a little and nothing a lot. Bright things are not
uniformly bright: fire has a white base, an arc has a filament inside its glow, and a place where two
lattices cross is brighter than either lattice.</p>
<p>Each condition returns a second, much narrower field now &mdash; the part of itself that is genuinely
incandescent &mdash; and that gets its own near-white pass. The core is always a <em>subset</em> of the
condition's own field rather than another layer over it, which keeps it inside the effect instead of
floating on top.</p>
<p><strong>The noise was the wrong kind.</strong> Bilinear value noise is blobby and carries a visible
axis-aligned lattice, and smoke, fire and corrosion are exactly the subjects where a grid reads as
wrong. The gradient-noise swap is scaled rather than dropped in: value noise is uniform on [0,1] with a
standard deviation of .289 and gradient noise is bell-shaped at about .22, so an unscaled substitution
would quietly flatten every <code>smoothstep</code> already tuned against the old field.</p>
<div class="note">
<h3>Why the right-hand column exists</h3>
<p>Detail added unconditionally is worse, not better: the extra frequencies alias into a crawling
shimmer the moment a token is small. So detail is <em>bought with pixels</em> &mdash;
<code>outputFrame.z</code> is the token's width on screen, and every fine octave is scaled by it.</p>
<p>Centre and right are the same program at the same instant. One is told it has 160 pixels; one is told
it has 40. Nothing else differs.</p>
<p>Everything added to the picture is also gathered into one term and divided down together rather than
added on and clamped. A clamp maps every value above 1 to the same place, so a hot core and a merely
bright glow arrive at the screen identical &mdash; which is precisely the failure a hot core would
otherwise introduce.</p>
</div>
</div>
</div>
</div>

<div class="section">
<h2>Unchanged on purpose</h2>
<div class="cols">
<div>
<p>The composite, the warp tables, the chroma-restore branch for multiple conditions and the token-space
mapping are what ships. One accent entry changed: Restrained's ramp ran to near-white across its whole
range, which was right for a hairline ring and turns a thick band into white tape. Cubing it keeps the
band dark iron and spends the brightness on its lit edge.</p>
</div>
<div>
<p><strong>Shattered Effigy is untouched</strong> beyond inheriting the better noise. The defeated path
passed its own gate against a locked reference and is not part of this proposal.</p>
</div>
</div>
</div>
</div>

<script>
const TILE = ${TILE};
const SMALL = ${SMALL};
const ROWS = ${j(rows)};
const IDS = ${j(CONDITIONS.map(([id]) => id))};
const PALETTE = ${j(PALETTE)};
const PORTRAIT = ${j(portrait)};
const SHIPPED = ${j(TOKEN_CONDITION_FRAGMENT)};
const REFINED = ${j(CONDITION_MATERIAL_REFINED)};

const table = document.getElementById('table');
table.innerHTML = ROWS.map((r) =>
  '<div class="row' + (r.composite ? ' composite' : '') + '">'
  + (r.tint ? '<i class="sw" style="background:' + r.tint + '"></i>' : '')
  + '<b>' + r.label + '</b><span>' + r.copy + '</span></div>').join('');

const canvas = document.getElementById('gl');
canvas.width = TILE * 3;
canvas.height = TILE * ROWS.length;

const VERTEX = 'attribute vec2 aPosition;varying vec2 vTextureCoord;'
  + 'void main(){vTextureCoord=vec2(aPosition.x*.5+.5,1.0-(aPosition.y*.5+.5));'
  + 'gl_Position=vec4(aPosition,0.0,1.0);}';

const status = document.getElementById('status');
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}

function link(gl, fragment) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  return p;
}

async function boot() {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false });
  if (!gl) throw new Error('WebGL unavailable in this browser');

  const shipped = link(gl, SHIPPED);
  const refined = link(gl, REFINED);
  /* slot -> [program, the token width the shader is told it has] */
  const COLUMNS = [[shipped, TILE], [refined, TILE], [refined, SMALL]];

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER,
    new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);

  const art = new Image();
  await new Promise((resolve, reject) => {
    art.onload = resolve;
    art.onerror = () => reject(new Error('portrait failed to decode'));
    art.src = PORTRAIT;
  });

  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, art);

  gl.enable(gl.SCISSOR_TEST);

  const cache = new Map();
  const uniformsFor = (program) => {
    if (!cache.has(program)) {
      const names = ['uSampler','inputSize','outputFrame','inputClamp','uCount','uDead','uTime',
        'uId0','uId1','uId2','uId3','uId4','uColor0','uColor1','uColor2','uColor3','uColor4'];
      const map = {};
      for (const n of names) map[n] = gl.getUniformLocation(program, n);
      map.aPosition = gl.getAttribLocation(program, 'aPosition');
      cache.set(program, map);
    }
    return cache.get(program);
  };

  let clock = 2.4;

  const drawTile = (slot, row, list) => {
    const [program, frame] = COLUMNS[slot];
    gl.useProgram(program);
    const u = uniformsFor(program);
    gl.enableVertexAttribArray(u.aPosition);
    gl.vertexAttribPointer(u.aPosition, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1i(u.uSampler, 0);
    /* One tile is one token, so the frame IS the tile and tokenUv is the
       identity — the same contract PIXI hands the live filter. Setting both
       inputSize and outputFrame to the same number keeps that identity while
       telling the shader how many pixels it is being drawn at. */
    gl.uniform4f(u.inputSize, frame, frame, 1 / frame, 1 / frame);
    gl.uniform4f(u.outputFrame, 0, 0, frame, frame);
    gl.uniform4f(u.inputClamp, 0, 0, 1, 1);
    const x = slot * TILE;
    const y = canvas.height - (row + 1) * TILE;
    gl.viewport(x, y, TILE, TILE);
    gl.scissor(x, y, TILE, TILE);
    gl.uniform1f(u.uCount, list.length);
    gl.uniform1f(u.uDead, 0);
    list.slice(0, 5).forEach((id, i) => {
      const index = IDS.indexOf(id);
      gl.uniform1f(u['uId' + i], index);
      gl.uniform3fv(u['uColor' + i], rgb(PALETTE[index]));
    });
    gl.uniform1f(u.uTime, clock);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };

  const button = document.getElementById('pause');
  let running = !matchMedia('(prefers-reduced-motion:reduce)').matches;
  button.textContent = running ? 'pause' : 'play';
  const start = performance.now();

  const frame = () => {
    if (running) clock = 2.4 + (performance.now() - start) / 1000;
    for (let i = 0; i < ROWS.length; i++)
      for (let slot = 0; slot < COLUMNS.length; slot++) drawTile(slot, i, ROWS[i].ids);
    if (running) requestAnimationFrame(frame);
  };
  frame();

  button.onclick = () => {
    running = !running;
    button.textContent = running ? 'pause' : 'play';
    if (running) requestAnimationFrame(frame); else frame();
  };

  return gl.getParameter(gl.RENDERER);
}

boot().then((renderer) => {
  status.textContent = 'both shaders live \\u00b7 ' + renderer + ' \\u00b7 16 materials + 4 composites';
}).catch((error) => {
  status.textContent = 'failed \\u00b7 ' + error.message;
  console.error(error);
});
</script>
`;

/* The prose between </style> and <script> is entity-encoded so the file is
   pure ASCII on disk. Published as an Artifact it gets a head with a
   charset; opened off disk or from a bare dev server it does not, and an
   em-dash arriving as three bytes of mojibake is not worth having. The
   script is already ASCII by way of j(), and the stylesheet is left alone
   because an entity is not a thing CSS parses. */
const prose = [html.indexOf("</style>"), html.indexOf("<script>")];
writeFileSync(out,
  html.slice(0, prose[0])
  + html.slice(prose[0], prose[1]).replace(/[\u0080-\uffff]/g, (c) => `&#${c.charCodeAt(0)};`)
  + html.slice(prose[1]));
console.log(`condition gate: ${out} · ${(html.length / 1024).toFixed(0)}KB · ${rows.length} rows`);
