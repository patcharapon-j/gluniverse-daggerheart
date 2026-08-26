import { TOKEN_CHIP } from './token.js';
import { CONDITION_MATERIALS, TOKEN_CONDITION_FRAGMENT } from '../src/module/token-conditions.ts';

const states = [
  { title:'Vulnerable', ids:['vulnerable'], names:['Vulnerable'], copy:'Fracture pressure, colored material, and the repeated sentence share one circular read.' },
  { title:'Marked · Charged', ids:['markedForDeath','charged'], names:['Marked for Death','Charged'], copy:'Red and blue mix before portrait composition, producing a saturated purple material without washing out the face.' },
  { title:'Shattered Effigy', ids:[], names:[], dead:true, copy:'Seven separately displaced portrait fragments, true void between them, no icon and no live condition ring.' },
];

const resource = { hp:{max:12,marked:5}, stress:{max:6,marked:2}, armor:{max:4,marked:1} };
const grid = document.querySelector('#runtime-grid');
grid.innerHTML = states.map((state,index) => `<article><div class="card"><div class="stage"><div class="runtime-token${state.dead?' dead':''}">
  <canvas width="256" height="256" data-index="${index}"></canvas>${TOKEN_CHIP({...resource,conditions:state.names,defeated:state.dead})}
</div></div><div class="copy"><b>${state.title}</b><span>${state.copy}</span></div></div></article>`).join('');

const vertex = `attribute vec2 aPosition;varying vec2 vTextureCoord;void main(){vTextureCoord=vec2(aPosition.x*.5+.5,1.0-(aPosition.y*.5+.5));gl_Position=vec4(aPosition,0.0,1.0);}`;
const compile=(gl,type,source)=>{const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));return shader;};
const materialById = new Map(CONDITION_MATERIALS.map((entry,index)=>[entry.id,{...entry,index}]));

async function boot(canvas,state){
  const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,preserveDrawingBuffer:true});
  if(!gl)throw new Error('WebGL unavailable');
  const program=gl.createProgram();gl.attachShader(program,compile(gl,gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl,gl.FRAGMENT_SHADER,TOKEN_CONDITION_FRAGMENT));gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const position=gl.getAttribLocation(program,'aPosition');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);gl.viewport(0,0,canvas.width,canvas.height);
  const art=new Image();art.src='/design/assets/art-sample-01.png';await art.decode();
  /* A live Token mesh already contains the configured square crop. Recreate
     that input here rather than uploading the uncropped study-page source. */
  const portrait=document.createElement('canvas');portrait.width=256;portrait.height=256;
  portrait.getContext('2d').drawImage(art,art.width*.313,art.height*.16,art.width*.334,art.height*.483,0,0,256,256);
  const texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,portrait);
  const uniform=(name)=>gl.getUniformLocation(program,name);gl.uniform1i(uniform('uSampler'),0);
  /* A live token gets these from PIXI. Here the quad IS the texture, so the
     frame and the texture are the same square and tokenUv() is the identity —
     which is the point: the harness must feed the shader the same contract
     Foundry does, or it verifies a program the canvas never runs. */
  gl.uniform4f(uniform('inputSize'),canvas.width,canvas.height,1/canvas.width,1/canvas.height);
  gl.uniform4f(uniform('outputFrame'),0,0,canvas.width,canvas.height);
  gl.uniform4f(uniform('inputClamp'),0,0,1,1);
  gl.uniform1f(uniform('uCount'),state.ids.length);gl.uniform1f(uniform('uDead'),state.dead?1:0);
  state.ids.slice(0,5).forEach((id,index)=>{const m=materialById.get(id);gl.uniform1f(uniform(`uId${index}`),m.index);gl.uniform3fv(uniform(`uColor${index}`),m.color);});
  const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
  const paint=(now)=>{gl.uniform1f(uniform('uTime'),state.dead||reduced?2.35:now/1000);gl.drawArrays(gl.TRIANGLES,0,6);if(!reduced&&!state.dead)requestAnimationFrame(paint);};requestAnimationFrame(paint);
  return gl.getParameter(gl.RENDERER);
}

try{
  const renderers=await Promise.all([...document.querySelectorAll('canvas')].map((canvas)=>boot(canvas,states[+canvas.dataset.index])));
  document.querySelector('#qa').textContent=`Production shader ready · ${renderers[0]} · 16 unique materials · defeated frozen`;
  document.documentElement.dataset.qa='ready';
}catch(error){document.querySelector('#qa').textContent=`Shader failed · ${error.message}`;document.documentElement.dataset.qa='failed';console.error(error);}
