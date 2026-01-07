const canvas = document.getElementById("particleCanvas");
const gl = canvas.getContext("webgl");

if (!gl) {
  console.error("WebGL not supported");
}

let aspect = window.innerWidth / window.innerHeight;
let isDark = true;
const particles = [];
const numParticles = 150;
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

// Watch for theme changes
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.attributeName === "class") {
      isDark = document.documentElement.classList.contains("dark");
    }
  });
});

observer.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["class"],
});

class Boid {
  constructor() {
    this.x = Math.random() * 2 - 1;
    this.y = Math.random() * 2 - 1;
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.005;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.size = (Math.random() * 6 + 2) * (window.devicePixelRatio || 1);
    this.life = Math.random();
  }

  update(boids, scale = 1) {
    const perception = 0.15;
    const separationDist = 0.05;

    let sepX = 0,
      sepY = 0;
    let alignX = 0,
      alignY = 0;
    let cohX = 0,
      cohY = 0;
    let sepCount = 0,
      alignCount = 0,
      cohCount = 0;

    for (let other of boids) {
      if (other === this) continue;
      const dx = other.x - this.x;
      const dy = other.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0 && dist < perception) {
        if (dist < separationDist) {
          sepX -= dx / dist;
          sepY -= dy / dist;
          sepCount++;
        }
        alignX += other.vx;
        alignY += other.vy;
        alignCount++;
        cohX += other.x;
        cohY += other.y;
        cohCount++;
      }
    }

    if (sepCount > 0) {
      sepX /= sepCount;
      sepY /= sepCount;
      this.vx += sepX * 0.0015 * scale;
      this.vy += sepY * 0.0015 * scale;
    }

    if (alignCount > 0) {
      alignX /= alignCount;
      alignY /= alignCount;
      this.vx += (alignX - this.vx) * 0.05 * scale;
      this.vy += (alignY - this.vy) * 0.05 * scale;
    }

    if (cohCount > 0) {
      cohX /= cohCount;
      cohY /= cohCount;
      const cohDx = cohX - this.x;
      const cohDy = cohY - this.y;
      this.vx += cohDx * 0.0003 * scale;
      this.vy += cohDy * 0.0003 * scale;
    }

    const dx = mouseX - this.x;
    const dy = mouseY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.25 && dist > 0) {
      const avoidForce = (0.25 - dist) * 0.008;
      this.vx -= (dx / dist) * avoidForce * scale;
      this.vy -= (dy / dist) * avoidForce * scale;
    }

    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    const maxSpeed = 0.01;
    if (speed > maxSpeed) {
      this.vx = (this.vx / speed) * maxSpeed;
      this.vy = (this.vy / speed) * maxSpeed;
    }

    this.x += (this.vx / aspect) * scale;
    this.y += this.vy * scale;

    if (this.x < -1.1) this.x = 1.1;
    if (this.x > 1.1) this.x = -1.1;
    if (this.y < -1.1) this.y = 1.1;
    if (this.y > 1.1) this.y = -1.1;

    this.life += 0.002 * scale;
    if (this.life > 1) this.life = 0;
  }
}

for (let i = 0; i < numParticles; i++) {
  particles.push(new Boid());
}

const vsSource = `
  attribute vec2 aPosition;
  attribute float aSize;
  attribute float aLife;
  varying float vLife;
  
  void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
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
  console.error("Shader compilation failed");
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
gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

function renderParticles(timestamp) {
  if (lastTime === null) lastTime = timestamp;
  let dt = (timestamp - lastTime) / 1000;
  dt = Math.min(dt, 0.05);
  lastTime = timestamp;
  time += dt;

  const frameBaseline = 0.016;
  const scale = dt / frameBaseline;

  const positions = [];
  const sizes = [];
  const lives = [];

  particles.forEach((p) => {
    p.update(particles, scale);
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

requestAnimationFrame(renderParticles);
