#!/bin/bash

cp -p ./PhysX/physx/bin/emscripten/release/physx.release.js ../example/dist/physx/physx.release.js
cp -p ./PhysX/physx/bin/emscripten/release/physx.release.wasm ../example/dist/physx/physx.release.wasm
cp -p ./PhysX/physx/bin/emscripten/release/physx.release.js ../lib/physx.release.js
cp -p ./PhysX/physx/bin/emscripten/release/physx.release.wasm ../lib/physx.release.wasm