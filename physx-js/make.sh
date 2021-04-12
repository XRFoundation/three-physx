#!/bin/bash

cp -p ./PxWebBindings.cpp ./PhysX/physx/source/physxwebbindings/src/PxWebBindings.cpp
cd PhysX/physx/compiler/emscripten-release/
make