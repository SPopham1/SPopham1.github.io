const canvas = document.getElementById("particleCanvas");
const gl = canvas.getContext("webgl");

if (!gl) {
  console.error("WebGL not supported");
}

let aspect = window.innerWidth / window.innerHeight;
let isDark = true;
const particles = [];
const numParticles = 500;
let mouseX = 0;
let mouseY = 0;
let time = 0;
let lastTime = null;

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  aspect = canvas.width / canvas.height;
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";
  gl.viewport(0, 0, canvas.width, canvas.height);
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

document.addEventListener("mousemove", (e) => {
  mouseX = (e.clientX / window.innerWidth) * 2 - 1;
  mouseY = -((e.clientY / window.innerHeight) * 2 - 1);
});

class Particle {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = Math.random() * 2 - 1;
    this.y = Math.random() * 2 - 1;
    this.vx = (Math.random() - 0.5) * 0.01;
    this.vy = (Math.random() - 0.5) * 0.01;
    this.size = (Math.random() * 6 + 2) * (window.devicePixelRatio || 1);
    this.life = Math.random();
  }

  update(scale = 1, dt = 0.016) {
    const dx = mouseX - this.x;
    const dy = mouseY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.3) {
      const force = (0.3 - dist) * 0.0001;
      this.vx += dx * force * scale;
      this.vy += dy * force * scale;
    }

    // noise (time is in seconds)
    const angle = Math.sin(this.y * 3.0 + time) + Math.cos(this.x * 3.0 - time);

    this.vx += Math.cos(angle) * 0.0004 * scale;
    this.vy += Math.sin(angle) * 0.0004 * scale;

    // damping (apply per-frame scale)
    const damp = Math.pow(0.98, scale);
    this.vx *= damp;
    this.vy *= damp;
    this.vx += -this.x * 0.00005 * scale;
    this.vy += -this.y * 0.00005 * scale;

    // integrate
    this.x += (this.vx / aspect) * scale;
    this.y += this.vy * scale;

    this.life += 0.002 * scale;
    if (this.life > 1) this.life = 0;

    if (this.x < -1.1 || this.x > 1.1 || this.y < -1.1 || this.y > 1.1) {
      this.reset();
    }
  }
}

for (let i = 0; i < numParticles; i++) {
  particles.push(new Particle());
}

const vsSource = `
  attribute vec2 aPosition;
  attribute float aSize;
  attribute float aLife;
  varying float vLife;
  
  void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
    gl_PointSize = aSize * 1.5;
    // increase point size multiplier for better visibility
    gl_PointSize = aSize * 4.0;
    vLife = aLife;
  }
`;

const fsSource = `
  precision mediump float;
  uniform vec3 uColor;
  varying float vLife;
  
  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if (dist > 0.6) discard;
    
    float alpha = (1.0 - dist * 1.6) * sin(vLife * 3.14159);
    alpha = clamp(alpha, 0.0, 1.0);
    // stronger alpha to contrast with background
    gl_FragColor = vec4(uColor, alpha * 0.95);
  }
`;

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vsSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fsSource);

if (!vertexShader || !fragmentShader) {
  console.error("Shader compilation failed, aborting WebGL setup.");
  throw new Error("Shader compilation failed");
}

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);
if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
  console.error("Program link error:", gl.getProgramInfoLog(program));
}
gl.useProgram(program);

const positionBuffer = gl.createBuffer();
const sizeBuffer = gl.createBuffer();
const lifeBuffer = gl.createBuffer();

const aPosition = gl.getAttribLocation(program, "aPosition");
const aSize = gl.getAttribLocation(program, "aSize");
const aLife = gl.getAttribLocation(program, "aLife");
const uColor = gl.getUniformLocation(program, "uColor");

gl.enableVertexAttribArray(aPosition);
gl.enableVertexAttribArray(aSize);
gl.enableVertexAttribArray(aLife);

gl.enable(gl.BLEND);
// use additive blending so particles glow over the background
gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

function renderParticles(timestamp) {
  // compute delta time (seconds) and frame scale relative to previous fixed-step
  if (lastTime === null) lastTime = timestamp;
  let dt = (timestamp - lastTime) / 1000;
  // clamp dt to avoid big jumps after tab switching
  dt = Math.min(dt, 0.05);
  lastTime = timestamp;
  time += dt;

  const frameBaseline = 0.016; // previous fixed-step baseline (~60fps)
  const scale = dt / frameBaseline;

  const positions = [];
  const sizes = [];
  const lives = [];

  particles.forEach((p) => {
    p.update(scale, dt);
    positions.push(p.x, p.y);
    sizes.push(p.size);
    lives.push(p.life);
  });

  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sizes), gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(aSize, 1, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, lifeBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lives), gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(aLife, 1, gl.FLOAT, false, 0, 0);

  const color = isDark ? [0.35, 0.7, 1.0] : [1.0, 0.5, 0.2];
  gl.uniform3fv(uColor, color);

  gl.drawArrays(gl.POINTS, 0, particles.length);

  requestAnimationFrame(renderParticles);
}

// start animation loop
requestAnimationFrame(renderParticles);

const themeToggle = document.getElementById("themeToggle");

function applyTheme(isDarkMode) {
  document.documentElement.setAttribute(
    "data-theme",
    isDarkMode ? "dark" : "light"
  );
  isDark = isDarkMode;
}

if (themeToggle) {
  // Initial theme from toggle state
  applyTheme(themeToggle.checked);

  themeToggle.addEventListener("change", () => {
    applyTheme(themeToggle.checked);
  });

  const savedTheme = localStorage.getItem("theme");
  if (savedTheme) {
    themeToggle.checked = savedTheme === "dark";
    applyTheme(themeToggle.checked);
  }

  themeToggle.addEventListener("change", () => {
    const mode = themeToggle.checked ? "dark" : "light";
    localStorage.setItem("theme", mode);
    applyTheme(themeToggle.checked);
  });
} else {
  // Fallback: apply saved theme (if any)
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme) {
    applyTheme(savedTheme === "dark");
  }
}
