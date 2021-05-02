#!/usr/bin/env bash

cp -p ./PxWebBindings.cpp ./PhysX/physx/source/physxwebbindings/src/PxWebBindings.cpp
cp -p ./PhysXWebBindingsES5.cmake ./PhysX/physx/source/compiler/cmake/emscripten/PhysXWebBindings.cmake
cd PhysX/physx/compiler/emscripten-release/
make