#!/usr/bin/env bash

cp -p ./PxWebBindings.cpp ./PhysX/physx/source/physxwebbindings/src/PxWebBindings.cpp
cp -p ./PhysXWebBindingsES6.cmake ./PhysX/physx/source/compiler/cmake/emscripten/PhysXWebBindings.cmake
cp -p ./linkes6.txt ./PhysX/physx/compiler/emscripten-release/sdk_source_bin/CMakeFiles/PhysXWebBindings.dir/link.txt
cd PhysX/physx/compiler/emscripten-release/
make