// Headless CLI smoke test for the cadrum_web wasm module — runs the SAME wasm
// the browser loads, but under Node's V8. This is the "catch wasm runtime bugs
// from the command line, not the browser" path (see README §"CLI で早期検知").
//
//   node --experimental-wasm-exnref run_node.mjs
//
// V8 enforces the same constraints a browser does. Because the three runtime
// problems are now fixed upstream in cadrum (in-tree WASI stubs, exnref EH,
// cadrum::wasm_start!()), a correctly built module just works here: init()
// auto-runs OCCT's C++ ctors via the wasm-bindgen start shim, then step_to_glb
// converts the bundled STEP to GLB. Prints "NODETEST:OK …" and exits 0.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const wasmPath = fileURLToPath(new URL("./wasm/pkg/cadrum_web_bg.wasm", import.meta.url));
const stepPath = fileURLToPath(new URL("./public/colored_box_roundtrip.step", import.meta.url));

const mod = await import("./wasm/pkg/cadrum_web.js");
// wasm-pack `--target web` init fetches the .wasm by URL by default; Node's
// fetch can't read file URLs, so hand it the bytes explicitly.
await mod.default({ module_or_path: readFileSync(wasmPath) });

const step = readFileSync(stepPath);
const glb = mod.step_to_glb(new Uint8Array(step));
const dv = new DataView(glb.buffer, glb.byteOffset, glb.byteLength);
const magic = dv.getUint32(0, true);
const ver = dv.getUint32(4, true);
const len = dv.getUint32(8, true);
const ok = magic === 0x46546c67 && ver === 2 && len === glb.length;
console.log(`NODETEST:${ok ? "OK" : "BAD"} glbLen=${glb.length} magic=${magic.toString(16)} ver=${ver}`);
if (!ok) process.exit(1);
