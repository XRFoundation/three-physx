#!/usr/bin/env bash

rm -rf ./PhysX/physx/bin/emscripten/release/physx.release.js
cp -p ./PxWebBindings.cpp ./PhysX/physx/source/physxwebbindings/src/PxWebBindings.cpp
cp -p ./PhysXWebBindingsES5.cmake ./PhysX/physx/source/compiler/cmake/emscripten/PhysXWebBindings.cmake
cp -p ./linkes5.txt ./PhysX/physx/compiler/emscripten-release/sdk_source_bin/CMakeFiles/PhysXWebBindings.dir/link.txt
cd PhysX/physx/compiler/emscripten-release/
make