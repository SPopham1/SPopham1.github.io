/* Interactive Bezier Spline Drawing Exercise */

var canvas;
var gl;
var mMatrix;
var vMatrix;
var mvMatrix;
var pMatrix;
var shaderProgram;

function resize() {
  var side = 500;
  canvas.width = side;
  canvas.height = side;
  gl.viewport(0, 0, side, side);

  glMatrix.mat4.orthoNO(
    pMatrix,
    -side / 2.0,
    side / 2.0,
    -side / 2.0,
    side / 2.0,
    1.0,
    -1.0,
    1.0
  );
}

function init() {
  canvas = document.getElementById("glcanvas");

  mMatrix = glMatrix.mat4.create();
  vMatrix = glMatrix.mat4.create();
  mvMatrix = glMatrix.mat4.create();
  pMatrix = glMatrix.mat4.create();

  try {
    gl = canvas.getContext("webgl");
  } catch (e) {
    alert("Could not initialize WebGL");
    return false;
  }

  resize();
  initShaders();
  createGeometry();

  gl.clearColor(0.1, 0.15, 0.15, 1.0);
  gl.enable(gl.DEPTH_TEST);
  return true;
}

function getShaderFragment(gl, src) {
  var shader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(shader, src);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

function getShaderVertex(gl, src) {
  var shader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(shader, src);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

function getFragmentShaderSource() {
  return `
    precision mediump float;
    varying vec4 vColor;
    void main(void) {
      gl_FragColor = vColor;
    }
  `;
}

function getVertexShaderSource() {
  return `
    attribute vec3 aVertexPosition;
    attribute vec4 aVertexColor;
    uniform mat4 uMVMatrix;
    uniform mat4 uPMatrix;
    varying vec4 vColor;
    void main(void) {
      gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
      vColor = aVertexColor;
    }
  `;
}

function initShaders() {
  var fragmentShader = getShaderFragment(gl, getFragmentShaderSource());
  var vertexShader = getShaderVertex(gl, getVertexShaderSource());

  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Could not initialise shaders");
  }

  gl.useProgram(shaderProgram);

  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(
    shaderProgram,
    "aVertexPosition"
  );
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.vertexColorAttribute = gl.getAttribLocation(
    shaderProgram,
    "aVertexColor"
  );
  gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);

  shaderProgram.pMatrixUniform = gl.getUniformLocation(
    shaderProgram,
    "uPMatrix"
  );
  shaderProgram.mvMatrixUniform = gl.getUniformLocation(
    shaderProgram,
    "uMVMatrix"
  );
}

var triangleVertexPositionBuffer;
var triangleVertexColorBuffer;
var lineVertexPositionBuffer;
var lineVertexColorBuffer;
var splineVertexPositionBuffer;
var splineVertexColorBuffer;

var positions = [-50, -50, 0, -50, 50, 0, 50, 50, 0, 50, -50, 0];

var quad = [
  -4.0, -4.0, 0.0, 4.0, -4.0, 0.0, 4.0, 4.0, 0.0, -4.0, -4.0, 0.0, 4.0, 4.0,
  0.0, -4.0, 4.0, 0.0,
];

var vertices = new Array(3 * 6 * 4);

var tri_colours = [
  0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0,
  1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0,

  0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0,
  1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0,

  0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0,
  1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0,

  0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0,
  1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0,
];

var line_colours = [
  0.5, 0.5, 0.5, 1.0, 0.5, 0.5, 0.5, 1.0, 0.5, 0.5, 0.5, 1.0, 0.5, 0.5, 0.5,
  1.0,
];

var spline_colours = new Array(64 * 4);
for (let i = 0; i < 64; i++) {
  spline_colours[i * 4] = 1.0;
  spline_colours[i * 4 + 1] = 1.0;
  spline_colours[i * 4 + 2] = 0.0;
  spline_colours[i * 4 + 3] = 1.0;
}

var lineStrip = new Array(64 * 3);
var selectedControlPoint = -1;

function createGeometry() {
  triangleVertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexPositionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
  triangleVertexPositionBuffer.itemSize = 3;
  triangleVertexPositionBuffer.numItems = 24;

  triangleVertexColorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexColorBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(tri_colours),
    gl.DYNAMIC_DRAW
  );
  triangleVertexColorBuffer.itemSize = 4;
  triangleVertexColorBuffer.numItems = 24;

  lineVertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, lineVertexPositionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.DYNAMIC_DRAW);
  lineVertexPositionBuffer.itemSize = 3;
  lineVertexPositionBuffer.numItems = 4;

  lineVertexColorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, lineVertexColorBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(line_colours),
    gl.DYNAMIC_DRAW
  );
  lineVertexColorBuffer.itemSize = 4;
  lineVertexColorBuffer.numItems = 4;

  splineVertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, splineVertexPositionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lineStrip), gl.DYNAMIC_DRAW);
  splineVertexPositionBuffer.itemSize = 3;
  splineVertexPositionBuffer.numItems = 64;

  splineVertexColorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, splineVertexColorBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(spline_colours),
    gl.DYNAMIC_DRAW
  );
  splineVertexColorBuffer.itemSize = 4;
  splineVertexColorBuffer.numItems = 64;
}

function generateTriangles() {
  for (let t = 0; t < 4; t += 1) {
    for (let v = 0; v < 6; v += 1) {
      vertices[t * 18 + v * 3 + 0] = positions[t * 3 + 0] + quad[v * 3 + 0];
      vertices[t * 18 + v * 3 + 1] = positions[t * 3 + 1] + quad[v * 3 + 1];
      vertices[t * 18 + v * 3 + 2] = quad[v * 3 + 2];
    }
  }
}

function generateSpline() {
  var numSegments = 64;

  for (let i = 0; i < numSegments; i++) {
    var t = i / (numSegments - 1);

    var points = [
      [positions[0], positions[1]],
      [positions[3], positions[4]],
      [positions[6], positions[7]],
      [positions[9], positions[10]],
    ];

    while (points.length > 1) {
      var newPoints = [];
      for (let j = 0; j < points.length - 1; j++) {
        var x = (1 - t) * points[j][0] + t * points[j + 1][0];
        var y = (1 - t) * points[j][1] + t * points[j + 1][1];
        newPoints.push([x, y]);
      }
      points = newPoints;
    }

    lineStrip[i * 3] = points[0][0];
    lineStrip[i * 3 + 1] = points[0][1];
    lineStrip[i * 3 + 2] = 0.0;
  }
}

function drawScene() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  glMatrix.mat4.identity(mvMatrix);
  gl.useProgram(shaderProgram);

  // Draw triangles
  gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexPositionBuffer);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(vertices));
  gl.vertexAttribPointer(
    shaderProgram.vertexPositionAttribute,
    triangleVertexPositionBuffer.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexColorBuffer);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(tri_colours));
  gl.vertexAttribPointer(
    shaderProgram.vertexColorAttribute,
    triangleVertexColorBuffer.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
  gl.drawArrays(gl.TRIANGLES, 0, triangleVertexPositionBuffer.numItems);

  // Draw lines
  gl.bindBuffer(gl.ARRAY_BUFFER, lineVertexPositionBuffer);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(positions));
  gl.vertexAttribPointer(
    shaderProgram.vertexPositionAttribute,
    lineVertexPositionBuffer.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.bindBuffer(gl.ARRAY_BUFFER, lineVertexColorBuffer);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(line_colours));
  gl.vertexAttribPointer(
    shaderProgram.vertexColorAttribute,
    lineVertexColorBuffer.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
  gl.drawArrays(gl.LINE_STRIP, 0, lineVertexPositionBuffer.numItems);

  // Draw spline
  gl.bindBuffer(gl.ARRAY_BUFFER, splineVertexPositionBuffer);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(lineStrip));
  gl.vertexAttribPointer(
    shaderProgram.vertexPositionAttribute,
    splineVertexPositionBuffer.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.bindBuffer(gl.ARRAY_BUFFER, splineVertexColorBuffer);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(spline_colours));
  gl.vertexAttribPointer(
    shaderProgram.vertexColorAttribute,
    splineVertexColorBuffer.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
  gl.drawArrays(gl.LINE_STRIP, 0, splineVertexPositionBuffer.numItems);

  gl.flush();
}

function mouse_pressed(x, y) {
  x = x - 250;
  y = -(y - 250);

  var threshold = 8.0;

  for (let i = 0; i < 4; i++) {
    var px = positions[i * 3];
    var py = positions[i * 3 + 1];
    var dist = Math.sqrt((x - px) * (x - px) + (y - py) * (y - py));

    if (dist < threshold) {
      selectedControlPoint = i;

      for (let v = 0; v < 6; v++) {
        tri_colours[i * 24 + v * 4 + 0] = 1.0;
        tri_colours[i * 24 + v * 4 + 1] = 0.0;
        tri_colours[i * 24 + v * 4 + 2] = 0.0;
      }
      break;
    }
  }

  update();
}

function mouse_moved(x, y) {
  if (selectedControlPoint >= 0) {
    x = x - 250;
    y = -(y - 250);

    positions[selectedControlPoint * 3] = x;
    positions[selectedControlPoint * 3 + 1] = y;

    update();
  }
}

function mouse_released(x, y) {
  if (selectedControlPoint >= 0) {
    for (let v = 0; v < 6; v++) {
      tri_colours[selectedControlPoint * 24 + v * 4 + 0] = 0.0;
      tri_colours[selectedControlPoint * 24 + v * 4 + 1] = 1.0;
      tri_colours[selectedControlPoint * 24 + v * 4 + 2] = 0.0;
    }

    selectedControlPoint = -1;
    update();
  }
}

function update() {
  generateTriangles();
  generateSpline();
  drawScene();
}
function setup_mouse_events(canvasId) {
  var canvas = document.getElementById(canvasId);
  canvas.addEventListener("mousedown", function (e) {
    var rect = canvas.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var y = e.clientY - rect.top;
    mouse_pressed(x, y);
  });
  canvas.addEventListener("mousemove", function (e) {
    var rect = canvas.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var y = e.clientY - rect.top;
    mouse_moved(x, y);
  });
  canvas.addEventListener("mouseup", function (e) {
    var rect = canvas.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var y = e.clientY - rect.top;
    mouse_released(x, y);
  });
}
if (init()) {
  update();
  setup_mouse_events("glcanvas");
}
