/**
 * The object itself, in three dimensions, drawn by hand.
 *
 * This renders the exact mesh the 3MF carries: the same triangles, the same
 * two parts, the same relief. Not a stand in, not a stylised model. If the
 * code changes the geometry, this changes with it, because there is no second
 * copy of the geometry to fall out of sync.
 *
 * Written against WebGL directly rather than through a scene graph library.
 * Three.js plus its React bindings is about 700 kB for a flat plate with 23
 * prisms on it, and the mesh is already built here in a form a vertex buffer
 * wants. Flat shading needs a normal per face, so the triangles are expanded
 * rather than indexed, which for a few thousand faces costs nothing.
 */

"use client";

import { useEffect, useRef } from "react";

import type { Mesh } from "@/lib/geom/mesh";
import type { Tag } from "@/lib/tag";

type Part = { mesh: Mesh; colour: [number, number, number] };

const VERTEX = `
attribute vec3 position;
attribute vec3 normal;
uniform mat4 model;
uniform mat4 camera;
varying vec3 vNormal;
varying vec3 vPosition;
void main() {
  vec4 world = model * vec4(position, 1.0);
  vNormal = mat3(model) * normal;
  vPosition = world.xyz;
  gl_Position = camera * world;
}
`;

/**
 * Three fixed lights and a rim, the same idea as a product photograph: a key
 * from the upper left, a fill from the right, a floor bounce. Fixed to the
 * camera rather than the model, so turning the tag lights it differently,
 * which is what makes the relief readable.
 */
const FRAGMENT = `
precision mediump float;
varying vec3 vNormal;
varying vec3 vPosition;
uniform vec3 colour;
void main() {
  vec3 n = normalize(vNormal);
  vec3 key = normalize(vec3(-0.4, 0.75, 0.85));
  vec3 fill = normalize(vec3(0.9, 0.2, 0.4));
  vec3 bounce = normalize(vec3(0.0, -1.0, 0.2));

  float lambert =
      0.95 * max(dot(n, key), 0.0)
    + 0.38 * max(dot(n, fill), 0.0)
    + 0.22 * max(dot(n, bounce), 0.0);

  // Black filament is the default and the panel behind it is nearly black, so
  // the edges have to carry the shape. A rim term does what a photographer
  // does with a strip light: it draws the outline of a dark object.
  vec3 view = normalize(vec3(0.0, 0.0, 1.0));
  float rim = pow(1.0 - max(dot(n, view), 0.0), 2.0) * 0.42;

  // A hard specular on the top face, which is what makes a printed relief read
  // as relief rather than as a drawing.
  float spec = pow(max(dot(reflect(-key, n), view), 0.0), 24.0) * 0.30;

  // A small light term that is added rather than multiplied. Black filament
  // multiplied by any amount of light is still black, and a plate that
  // disappears into the panel is not what the object looks like in a room.
  float sheen = 0.05 + 0.09 * max(dot(n, key), 0.0);

  vec3 lit = colour * (0.30 + lambert) + vec3(rim + spec + sheen);
  gl_FragColor = vec4(lit, 1.0);
}
`;

export function LiveTag({
  tag,
  bodyColour,
  codeColour,
  spin = true,
}: {
  tag: Tag;
  bodyColour: string;
  codeColour: string;
  /** Turn slowly on its own. Off when the reader prefers reduced motion. */
  spin?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef({ active: false, x: 0, y: 0, yaw: -0.34, pitch: -0.3, spin: 0, clock: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: true, alpha: true });
    if (!gl) return;

    const parts: Part[] = [
      { mesh: tag.parts[0].mesh, colour: rgb(bodyColour) },
      { mesh: tag.parts[1].mesh, colour: rgb(codeColour) },
    ];

    const program = compile(gl, VERTEX, FRAGMENT);
    if (!program) return;
    gl.useProgram(program);

    const positionLoc = gl.getAttribLocation(program, "position");
    const normalLoc = gl.getAttribLocation(program, "normal");
    const modelLoc = gl.getUniformLocation(program, "model");
    const cameraLoc = gl.getUniformLocation(program, "camera");
    const colourLoc = gl.getUniformLocation(program, "colour");

    const centre = centreOf(parts.map((p) => p.mesh));
    const radius = radiusOf(parts.map((p) => p.mesh), centre);

    const buffers = parts.map((part) => {
      const flat = expand(part.mesh);
      const position = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, position);
      gl.bufferData(gl.ARRAY_BUFFER, flat.positions, gl.STATIC_DRAW);
      const normal = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, normal);
      gl.bufferData(gl.ARRAY_BUFFER, flat.normals, gl.STATIC_DRAW);
      return { position, normal, count: flat.positions.length / 3, colour: part.colour };
    });

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    let frame = 0;
    let last = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.clientWidth * dpr;
      const height = canvas.clientHeight * dpr;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const render = (time: number) => {
      const delta = last === 0 ? 0 : Math.min((time - last) / 1000, 0.05);
      last = time;
      // A slow sway rather than a carousel: enough to show that it is an
      // object, never so much that the code turns away from the reader.
      if (spin && !drag.current.active) {
        drag.current.clock += delta;
        drag.current.spin = Math.sin(drag.current.clock * 0.4) * 0.26;
      }

      resize();
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      const aspect = canvas.width / Math.max(canvas.height, 1);
      const model = multiply(
        multiply(rotateX(drag.current.pitch), rotateY(drag.current.yaw + drag.current.spin)),
        translate(-centre[0], -centre[1], -centre[2]),
      );

      // Clip space runs -1 to 1 on both axes while the canvas is `aspect`
      // times wider, so square pixels need the x scale divided by the aspect.
      // z is negated because depth testing keeps the smaller value: without
      // that, the underside of the plate wins against the code standing on top
      // of it and the tag renders as a blank slab.
      // The uniform part is the largest that still fits the model's own radius
      // in both directions, with a margin the sway never eats into.
      const fit = (aspect >= 1 ? 1 : aspect) / (radius * 1.06);
      const camera = new Float32Array([
        fit / aspect, 0, 0, 0,
        0, fit, 0, 0,
        0, 0, -fit / 8, 0,
        0, 0, 0, 1,
      ]);

      gl.uniformMatrix4fv(modelLoc, false, model);
      gl.uniformMatrix4fv(cameraLoc, false, camera);

      for (const buffer of buffers) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer.position);
        gl.enableVertexAttribArray(positionLoc);
        gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer.normal);
        gl.enableVertexAttribArray(normalLoc);
        gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);
        gl.uniform3fv(colourLoc, buffer.colour);
        gl.drawArrays(gl.TRIANGLES, 0, buffer.count);
      }

      frame = requestAnimationFrame(render);
    };

    frame = requestAnimationFrame(render);

    const down = (event: PointerEvent) => {
      drag.current.active = true;
      drag.current.x = event.clientX;
      drag.current.y = event.clientY;
      canvas.setPointerCapture(event.pointerId);
    };
    const move = (event: PointerEvent) => {
      if (!drag.current.active) return;
      drag.current.yaw += (event.clientX - drag.current.x) * 0.008;
      drag.current.pitch = clamp(
        drag.current.pitch + (event.clientY - drag.current.y) * 0.008,
        -1.3,
        1.3,
      );
      drag.current.x = event.clientX;
      drag.current.y = event.clientY;
    };
    const up = (event: PointerEvent) => {
      drag.current.active = false;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    };

    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      for (const buffer of buffers) {
        gl.deleteBuffer(buffer.position);
        gl.deleteBuffer(buffer.normal);
      }
      gl.deleteProgram(program);
    };
  }, [tag, bodyColour, codeColour, spin]);

  return (
    <canvas
      ref={canvasRef}
      className="live-tag"
      aria-label="The tag in three dimensions. Drag to turn it."
      role="img"
    />
  );
}

/** Indexed triangles become independent ones, each with its own face normal. */
function expand(mesh: Mesh): { positions: Float32Array; normals: Float32Array } {
  const count = mesh.triangles.length;
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);

  for (let i = 0; i < count; i += 3) {
    const a = mesh.triangles[i] * 3;
    const b = mesh.triangles[i + 1] * 3;
    const c = mesh.triangles[i + 2] * 3;
    const p = mesh.positions;

    const ux = p[b] - p[a];
    const uy = p[b + 1] - p[a + 1];
    const uz = p[b + 2] - p[a + 2];
    const vx = p[c] - p[a];
    const vy = p[c + 1] - p[a + 1];
    const vz = p[c + 2] - p[a + 2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const length = Math.hypot(nx, ny, nz) || 1;
    nx /= length;
    ny /= length;
    nz /= length;

    [a, b, c].forEach((source, k) => {
      const at = (i + k) * 3;
      positions[at] = p[source];
      positions[at + 1] = p[source + 1];
      positions[at + 2] = p[source + 2];
      normals[at] = nx;
      normals[at + 1] = ny;
      normals[at + 2] = nz;
    });
  }

  return { positions, normals };
}

function centreOf(meshes: readonly Mesh[]): [number, number, number] {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const mesh of meshes) {
    for (let i = 0; i < mesh.positions.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        const value = mesh.positions[i + k];
        if (value < min[k]) min[k] = value;
        if (value > max[k]) max[k] = value;
      }
    }
  }
  return [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
}

function radiusOf(meshes: readonly Mesh[], centre: [number, number, number]): number {
  let worst = 0;
  for (const mesh of meshes) {
    for (let i = 0; i < mesh.positions.length; i += 3) {
      const dx = mesh.positions[i] - centre[0];
      const dy = mesh.positions[i + 1] - centre[1];
      worst = Math.max(worst, Math.hypot(dx, dy));
    }
  }
  return worst || 1;
}

function compile(gl: WebGLRenderingContext, vertex: string, fragment: string): WebGLProgram | null {
  const build = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };

  const vs = build(gl.VERTEX_SHADER, vertex);
  const fs = build(gl.FRAGMENT_SHADER, fragment);
  if (!vs || !fs) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  return program;
}

// Column major 4x4 matrices, the layout WebGL expects.

function multiply(a: Float32Array, b: Float32Array): Float32Array {
  const out = new Float32Array(16);
  for (let column = 0; column < 4; column++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += a[k * 4 + row] * b[column * 4 + k];
      out[column * 4 + row] = sum;
    }
  }
  return out;
}

function rotateY(angle: number): Float32Array {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]);
}

function rotateX(angle: number): Float32Array {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]);
}

function translate(x: number, y: number, z: number): Float32Array {
  return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]);
}

function rgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const value = parseInt(full, 16);
  // Straight to linear, because the shader adds light in linear space.
  return [
    ((value >> 16) & 255) / 255,
    ((value >> 8) & 255) / 255,
    (value & 255) / 255,
  ].map((c) => c ** 2.2) as [number, number, number];
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}
