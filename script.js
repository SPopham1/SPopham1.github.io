const canvas = document.getElementById("particleCanvas");
const gl = canvas.getContext("webgl");

if (!gl) {
  console.error("WebGL not supported");
}

let isDark = false;
const particles = [];
const numParticles = 500;
let mouseX = 0;
let mouseY = 0;
let time = 0;

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
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
    this.vx = (Math.random() - 0.5) * 0.002;
    this.vy = (Math.random() - 0.5) * 0.002;
    this.size = Math.random() * 4 + 2;
    this.life = Math.random();
  }

  update() {
    const dx = mouseX - this.x;
    const dy = mouseY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.3) {
      const force = (0.3 - dist) * 0.0001;
      this.vx += dx * force;
      this.vy += dy * force;
    }

    const noiseX = Math.sin(this.x * 3 + time * 0.5) * 0.0002;
    const noiseY = Math.cos(this.y * 3 + time * 0.5) * 0.0002;

    this.vx += noiseX;
    this.vy += noiseY;

    this.vx *= 0.98;
    this.vy *= 0.98;

    this.x += this.vx;
    this.y += this.vy;

    this.life += 0.002;
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
    gl_PointSize = aSize;
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
    if (dist > 0.5) discard;
    
    float alpha = (1.0 - dist * 2.0) * sin(vLife * 3.14159);
    gl_FragColor = vec4(uColor, alpha * 0.4);
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

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);
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
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

function renderParticles() {
  time += 0.016;

  const positions = [];
  const sizes = [];
  const lives = [];

  particles.forEach((p) => {
    p.update();
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

  const color = isDark ? [0.2, 0.4, 0.8] : [0.15, 0.38, 0.92];
  gl.uniform3fv(uColor, color);

  gl.drawArrays(gl.POINTS, 0, particles.length);

  requestAnimationFrame(renderParticles);
}

renderParticles();

const themeToggle = document.getElementById("themeToggle");

function applyTheme(isDarkMode) {
  document.documentElement.setAttribute(
    "data-theme",
    isDarkMode ? "dark" : "light"
  );
  isDark = isDarkMode;
}

// Initial theme
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
