# Install script for directory: /src/PhysX/physx/source/compiler/cmake

# Set the install prefix
if(NOT DEFINED CMAKE_INSTALL_PREFIX)
  set(CMAKE_INSTALL_PREFIX "/src/PhysX/physx/install/emscripten/PhysX")
endif()
string(REGEX REPLACE "/$" "" CMAKE_INSTALL_PREFIX "${CMAKE_INSTALL_PREFIX}")

# Set the install configuration name.
if(NOT DEFINED CMAKE_INSTALL_CONFIG_NAME)
  if(BUILD_TYPE)
    string(REGEX REPLACE "^[^A-Za-z0-9_]+" ""
           CMAKE_INSTALL_CONFIG_NAME "${BUILD_TYPE}")
  else()
    set(CMAKE_INSTALL_CONFIG_NAME "debug")
  endif()
  message(STATUS "Install configuration: \"${CMAKE_INSTALL_CONFIG_NAME}\"")
endif()

# Set the component getting installed.
if(NOT CMAKE_INSTALL_COMPONENT)
  if(COMPONENT)
    message(STATUS "Install component: \"${COMPONENT}\"")
    set(CMAKE_INSTALL_COMPONENT "${COMPONENT}")
  else()
    set(CMAKE_INSTALL_COMPONENT)
  endif()
endif()

# Is this installation the result of a crosscompile?
if(NOT DEFINED CMAKE_CROSSCOMPILING)
  set(CMAKE_CROSSCOMPILING "TRUE")
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xUnspecifiedx" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/source/foundation/include/unix" TYPE FILE FILES
    "/src/PhysX/physx/source/foundation/include/unix/PsUnixAoS.h"
    "/src/PhysX/physx/source/foundation/include/unix/PsUnixFPU.h"
    "/src/PhysX/physx/source/foundation/include/unix/PsUnixInlineAoS.h"
    "/src/PhysX/physx/source/foundation/include/unix/PsUnixIntrinsics.h"
    "/src/PhysX/physx/source/foundation/include/unix/PsUnixTrigConstants.h"
    )
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xUnspecifiedx" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/source/foundation/include/unix/neon" TYPE FILE FILES
    "/src/PhysX/physx/source/foundation/include/unix/neon/PsUnixNeonAoS.h"
    "/src/PhysX/physx/source/foundation/include/unix/neon/PsUnixNeonInlineAoS.h"
    )
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xUnspecifiedx" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/source/foundation/include/unix/sse2" TYPE FILE FILES
    "/src/PhysX/physx/source/foundation/include/unix/sse2/PsUnixSse2AoS.h"
    "/src/PhysX/physx/source/foundation/include/unix/sse2/PsUnixSse2InlineAoS.h"
    )
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xUnspecifiedx" OR NOT CMAKE_INSTALL_COMPONENT)
  list(APPEND CMAKE_ABSOLUTE_DESTINATION_FILES
   "/src/PhysX/physx/install/emscripten/PxShared/include/foundation/unix/PxUnixIntrinsics.h")
  if(CMAKE_WARN_ON_ABSOLUTE_INSTALL_DESTINATION)
    message(WARNING "ABSOLUTE path INSTALL DESTINATION : ${CMAKE_ABSOLUTE_DESTINATION_FILES}")
  endif()
  if(CMAKE_ERROR_ON_ABSOLUTE_INSTALL_DESTINATION)
    message(FATAL_ERROR "ABSOLUTE path INSTALL DESTINATION forbidden (by caller): ${CMAKE_ABSOLUTE_DESTINATION_FILES}")
  endif()
file(INSTALL DESTINATION "/src/PhysX/physx/install/emscripten/PxShared/include/foundation/unix" TYPE FILE FILES "/src/PhysX/physx/../pxshared/include/foundation/unix/PxUnixIntrinsics.h")
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xUnspecifiedx" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/include" TYPE FILE FILES "/src/PhysX/physx/include/PxFoundation.h")
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xUnspecifiedx" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/include/foundation" TYPE FILE FILES
    "/src/PhysX/physx/include/foundation/PxAssert.h"
    "/src/PhysX/physx/include/foundation/PxFoundationConfig.h"
    "/src/PhysX/physx/include/foundation/PxMathUtils.h"
    )
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xUnspecifiedx" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/source/foundation/include" TYPE FILE FILES
    "/src/PhysX/physx/source/foundation/include/Ps.h"
    "/src/PhysX/physx/source/foundation/include/PsAlignedMalloc.h"
    "/src/PhysX/physx/source/foundation/include/PsAlloca.h"
    "/src/PhysX/physx/source/foundation/include/PsAllocator.h"
    "/src/PhysX/physx/source/foundation/include/PsAoS.h"
    "/src/PhysX/physx/source/foundation/include/PsArray.h"
    "/src/PhysX/physx/source/foundation/include/PsAtomic.h"
    "/src/PhysX/physx/source/foundation/include/PsBasicTemplates.h"
    "/src/PhysX/physx/source/foundation/include/PsBitUtils.h"
    "/src/PhysX/physx/source/foundation/include/PsBroadcast.h"
    "/src/PhysX/physx/source/foundation/include/PsCpu.h"
    "/src/PhysX/physx/source/foundation/include/PsFoundation.h"
    "/src/PhysX/physx/source/foundation/include/PsFPU.h"
    "/src/PhysX/physx/source/foundation/include/PsHash.h"
    "/src/PhysX/physx/source/foundation/include/PsHashInternals.h"
    "/src/PhysX/physx/source/foundation/include/PsHashMap.h"
    "/src/PhysX/physx/source/foundation/include/PsHashSet.h"
    "/src/PhysX/physx/source/foundation/include/PsInlineAllocator.h"
    "/src/PhysX/physx/source/foundation/include/PsInlineAoS.h"
    "/src/PhysX/physx/source/foundation/include/PsInlineArray.h"
    "/src/PhysX/physx/source/foundation/include/PsIntrinsics.h"
    "/src/PhysX/physx/source/foundation/include/PsMathUtils.h"
    "/src/PhysX/physx/source/foundation/include/PsMutex.h"
    "/src/PhysX/physx/source/foundation/include/PsPool.h"
    "/src/PhysX/physx/source/foundation/include/PsSList.h"
    "/src/PhysX/physx/source/foundation/include/PsSocket.h"
    "/src/PhysX/physx/source/foundation/include/PsSort.h"
    "/src/PhysX/physx/source/foundation/include/PsSortInternals.h"
    "/src/PhysX/physx/source/foundation/include/PsString.h"
    "/src/PhysX/physx/source/foundation/include/PsSync.h"
    "/src/PhysX/physx/source/foundation/include/PsTempAllocator.h"
    "/src/PhysX/physx/source/foundation/include/PsThread.h"
    "/src/PhysX/physx/source/foundation/include/PsTime.h"
    "/src/PhysX/physx/source/foundation/include/PsUserAllocated.h"
    "/src/PhysX/physx/source/foundation/include/PsUtilities.h"
    "/src/PhysX/physx/source/foundation/include/PsVecMath.h"
    "/src/PhysX/physx/source/foundation/include/PsVecMathAoSScalar.h"
    "/src/PhysX/physx/source/foundation/include/PsVecMathAoSScalarInline.h"
    "/src/PhysX/physx/source/foundation/include/PsVecMathSSE.h"
    "/src/PhysX/physx/source/foundation/include/PsVecMathUtilities.h"
    "/src/PhysX/physx/source/foundation/include/PsVecQuat.h"
    "/src/PhysX/physx/source/foundation/include/PsVecTransform.h"
    )
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xUnspecifiedx" OR NOT CMAKE_INSTALL_COMPONENT)
  list(APPEND CMAKE_ABSOLUTE_DESTINATION_FILES
   "/src/PhysX/physx/install/emscripten/PxShared/include/foundation/Px.h;/src/PhysX/physx/install/emscripten/PxShared/include/foundation/PxAllocatorCallback.h;/src/PhysX/physx/install/emscripten/PxShared/include/foundation/PxProfiler.h;/src/PhysX/physx/install/emscripten/PxShared/include/foundation/PxSharedAssert.h;/src/PhysX/physx/install/emscripten/PxShared/include/foundation/PxBitAndData.h;/src/PhysX/physx/install/emscripten/PxShared/include/foundation/PxBounds3.h;/src/PhysX/physx/install/emscripten/PxShared/include/foundation/PxErrorCallback.h;/src/PhysX/physx/install/emscripten/PxShared/include/foundation/PxErrors.h;/src/PhysX/physx/install/emscripten/PxShared/include/foundation/PxFlags.h;/src/PhysX/physx/install/emscripten/PxShared/include/foundation/PxIntrinsics.h;/src/PhysX/physx/install/emscripten/PxShared/include/foundation/PxIO.h;/src/PhysX/physx/install/emscripten/PxShared/include/foundation/PxMat33.h;/src/PhysX/physx/install/emscripten/PxShared/include/foundation/PxMat44.h;/src/PhysX/physx/install/emscripten/PxShared/include/foundation/PxMath.h;/src/PhysX/physx/install/emscripten/PxShared/include/foundation/PxMemory.h;/src/PhysX/physx/install/emscripten/PxShared/include/foundation/PxPlane.h;/src/PhysX/physx/install/emscripten/PxShared/include/foundation/PxPreprocessor.h;/src/PhysX/physx/install/emscripten/PxShared/include/foundation/PxQuat.h;/src/PhysX/physx/install/emscripten/PxShared/include/foundation/PxSimpleTypes.h;/src/PhysX/physx/install/emscripten/PxShared/include/foundation/PxStrideIterator.h;/src/PhysX/physx/install/emscripten/PxShared/include/foundation/PxTransform.h;/src/PhysX/physx/install/emscripten/PxShared/include/foundation/PxUnionCast.h;/src/PhysX/physx/install/emscripten/PxShared/include/foundation/PxVec2.h;/src/PhysX/physx/install/emscripten/PxShared/include/foundation/PxVec3.h;/src/PhysX/physx/install/emscripten/PxShared/include/foundation/PxVec4.h")
  if(CMAKE_WARN_ON_ABSOLUTE_INSTALL_DESTINATION)
    message(WARNING "ABSOLUTE path INSTALL DESTINATION : ${CMAKE_ABSOLUTE_DESTINATION_FILES}")
  endif()
  if(CMAKE_ERROR_ON_ABSOLUTE_INSTALL_DESTINATION)
    message(FATAL_ERROR "ABSOLUTE path INSTALL DESTINATION forbidden (by caller): ${CMAKE_ABSOLUTE_DESTINATION_FILES}")
  endif()
file(INSTALL DESTINATION "/src/PhysX/physx/install/emscripten/PxShared/include/foundation" TYPE FILE FILES
    "/src/PhysX/physx/../pxshared/include/foundation/Px.h"
    "/src/PhysX/physx/../pxshared/include/foundation/PxAllocatorCallback.h"
    "/src/PhysX/physx/../pxshared/include/foundation/PxProfiler.h"
    "/src/PhysX/physx/../pxshared/include/foundation/PxSharedAssert.h"
    "/src/PhysX/physx/../pxshared/include/foundation/PxBitAndData.h"
    "/src/PhysX/physx/../pxshared/include/foundation/PxBounds3.h"
    "/src/PhysX/physx/../pxshared/include/foundation/PxErrorCallback.h"
    "/src/PhysX/physx/../pxshared/include/foundation/PxErrors.h"
    "/src/PhysX/physx/../pxshared/include/foundation/PxFlags.h"
    "/src/PhysX/physx/../pxshared/include/foundation/PxIntrinsics.h"
    "/src/PhysX/physx/../pxshared/include/foundation/PxIO.h"
    "/src/PhysX/physx/../pxshared/include/foundation/PxMat33.h"
    "/src/PhysX/physx/../pxshared/include/foundation/PxMat44.h"
    "/src/PhysX/physx/../pxshared/include/foundation/PxMath.h"
    "/src/PhysX/physx/../pxshared/include/foundation/PxMemory.h"
    "/src/PhysX/physx/../pxshared/include/foundation/PxPlane.h"
    "/src/PhysX/physx/../pxshared/include/foundation/PxPreprocessor.h"
    "/src/PhysX/physx/../pxshared/include/foundation/PxQuat.h"
    "/src/PhysX/physx/../pxshared/include/foundation/PxSimpleTypes.h"
    "/src/PhysX/physx/../pxshared/include/foundation/PxStrideIterator.h"
    "/src/PhysX/physx/../pxshared/include/foundation/PxTransform.h"
    "/src/PhysX/physx/../pxshared/include/foundation/PxUnionCast.h"
    "/src/PhysX/physx/../pxshared/include/foundation/PxVec2.h"
    "/src/PhysX/physx/../pxshared/include/foundation/PxVec3.h"
    "/src/PhysX/physx/../pxshared/include/foundation/PxVec4.h"
    )
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xUnspecifiedx" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/include/gpu" TYPE FILE FILES "/src/PhysX/physx/include/gpu/PxGpu.h")
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xUnspecifiedx" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/include/cudamanager" TYPE FILE FILES
    "/src/PhysX/physx/include/cudamanager/PxCudaContextManager.h"
    "/src/PhysX/physx/include/cudamanager/PxCudaMemoryManager.h"
    )
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xUnspecifiedx" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/include" TYPE FILE FILES
    "/src/PhysX/physx/include/PxActor.h"
    "/src/PhysX/physx/include/PxAggregate.h"
    "/src/PhysX/physx/include/PxArticulationReducedCoordinate.h"
    "/src/PhysX/physx/include/PxArticulationBase.h"
    "/src/PhysX/physx/include/PxArticulation.h"
    "/src/PhysX/physx/include/PxArticulationJoint.h"
    "/src/PhysX/physx/include/PxArticulationJointReducedCoordinate.h"
    "/src/PhysX/physx/include/PxArticulationLink.h"
    "/src/PhysX/physx/include/PxBatchQuery.h"
    "/src/PhysX/physx/include/PxBatchQueryDesc.h"
    "/src/PhysX/physx/include/PxBroadPhase.h"
    "/src/PhysX/physx/include/PxClient.h"
    "/src/PhysX/physx/include/PxConstraint.h"
    "/src/PhysX/physx/include/PxConstraintDesc.h"
    "/src/PhysX/physx/include/PxContact.h"
    "/src/PhysX/physx/include/PxContactModifyCallback.h"
    "/src/PhysX/physx/include/PxDeletionListener.h"
    "/src/PhysX/physx/include/PxFiltering.h"
    "/src/PhysX/physx/include/PxForceMode.h"
    "/src/PhysX/physx/include/PxImmediateMode.h"
    "/src/PhysX/physx/include/PxLockedData.h"
    "/src/PhysX/physx/include/PxMaterial.h"
    "/src/PhysX/physx/include/PxPhysics.h"
    "/src/PhysX/physx/include/PxPhysicsAPI.h"
    "/src/PhysX/physx/include/PxPhysicsSerialization.h"
    "/src/PhysX/physx/include/PxPhysicsVersion.h"
    "/src/PhysX/physx/include/PxPhysXConfig.h"
    "/src/PhysX/physx/include/PxPruningStructure.h"
    "/src/PhysX/physx/include/PxQueryFiltering.h"
    "/src/PhysX/physx/include/PxQueryReport.h"
    "/src/PhysX/physx/include/PxRigidActor.h"
    "/src/PhysX/physx/include/PxRigidBody.h"
    "/src/PhysX/physx/include/PxRigidDynamic.h"
    "/src/PhysX/physx/include/PxRigidStatic.h"
    "/src/PhysX/physx/include/PxScene.h"
    "/src/PhysX/physx/include/PxSceneDesc.h"
    "/src/PhysX/physx/include/PxSceneLock.h"
    "/src/PhysX/physx/include/PxShape.h"
    "/src/PhysX/physx/include/PxSimulationEventCallback.h"
    "/src/PhysX/physx/include/PxSimulationStatistics.h"
    "/src/PhysX/physx/include/PxVisualizationParameter.h"
    )
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xUnspecifiedx" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/include/common" TYPE FILE FILES
    "/src/PhysX/physx/include/common/PxBase.h"
    "/src/PhysX/physx/include/common/PxCollection.h"
    "/src/PhysX/physx/include/common/PxCoreUtilityTypes.h"
    "/src/PhysX/physx/include/common/PxMetaData.h"
    "/src/PhysX/physx/include/common/PxMetaDataFlags.h"
    "/src/PhysX/physx/include/common/PxPhysicsInsertionCallback.h"
    "/src/PhysX/physx/include/common/PxPhysXCommonConfig.h"
    "/src/PhysX/physx/include/common/PxRenderBuffer.h"
    "/src/PhysX/physx/include/common/PxSerialFramework.h"
    "/src/PhysX/physx/include/common/PxSerializer.h"
    "/src/PhysX/physx/include/common/PxStringTable.h"
    "/src/PhysX/physx/include/common/PxTolerancesScale.h"
    "/src/PhysX/physx/include/common/PxTypeInfo.h"
    "/src/PhysX/physx/include/common/PxProfileZone.h"
    )
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xUnspecifiedx" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/include/pvd" TYPE FILE FILES
    "/src/PhysX/physx/include/pvd/PxPvdSceneClient.h"
    "/src/PhysX/physx/include/pvd/PxPvd.h"
    "/src/PhysX/physx/include/pvd/PxPvdTransport.h"
    )
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xUnspecifiedx" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/include/collision" TYPE FILE FILES "/src/PhysX/physx/include/collision/PxCollisionDefs.h")
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xUnspecifiedx" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/include/solver" TYPE FILE FILES "/src/PhysX/physx/include/solver/PxSolverDefs.h")
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xUnspecifiedx" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/include" TYPE FILE FILES "/src/PhysX/physx/include/PxConfig.h")
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xUnspecifiedx" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/include/characterkinematic" TYPE FILE FILES
    "/src/PhysX/physx/include/characterkinematic/PxBoxController.h"
    "/src/PhysX/physx/include/characterkinematic/PxCapsuleController.h"
    "/src/PhysX/physx/include/characterkinematic/PxController.h"
    "/src/PhysX/physx/include/characterkinematic/PxControllerBehavior.h"
    "/src/PhysX/physx/include/characterkinematic/PxControllerManager.h"
    "/src/PhysX/physx/include/characterkinematic/PxControllerObstacles.h"
    "/src/PhysX/physx/include/characterkinematic/PxExtended.h"
    )
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xUnspecifiedx" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/include/geometry" TYPE FILE FILES
    "/src/PhysX/physx/include/geometry/PxBoxGeometry.h"
    "/src/PhysX/physx/include/geometry/PxCapsuleGeometry.h"
    "/src/PhysX/physx/include/geometry/PxConvexMesh.h"
    "/src/PhysX/physx/include/geometry/PxConvexMeshGeometry.h"
    "/src/PhysX/physx/include/geometry/PxGeometry.h"
    "/src/PhysX/physx/include/geometry/PxGeometryHelpers.h"
    "/src/PhysX/physx/include/geometry/PxGeometryQuery.h"
    "/src/PhysX/physx/include/geometry/PxHeightField.h"
    "/src/PhysX/physx/include/geometry/PxHeightFieldDesc.h"
    "/src/PhysX/physx/include/geometry/PxHeightFieldFlag.h"
    "/src/PhysX/physx/include/geometry/PxHeightFieldGeometry.h"
    "/src/PhysX/physx/include/geometry/PxHeightFieldSample.h"
    "/src/PhysX/physx/include/geometry/PxMeshQuery.h"
    "/src/PhysX/physx/include/geometry/PxMeshScale.h"
    "/src/PhysX/physx/include/geometry/PxPlaneGeometry.h"
    "/src/PhysX/physx/include/geometry/PxSimpleTriangleMesh.h"
    "/src/PhysX/physx/include/geometry/PxSphereGeometry.h"
    "/src/PhysX/physx/include/geometry/PxTriangle.h"
    "/src/PhysX/physx/include/geometry/PxTriangleMesh.h"
    "/src/PhysX/physx/include/geometry/PxTriangleMeshGeometry.h"
    "/src/PhysX/physx/include/geometry/PxBVHStructure.h"
    )
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xUnspecifiedx" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/include/geomutils" TYPE FILE FILES
    "/src/PhysX/physx/include/geomutils/GuContactBuffer.h"
    "/src/PhysX/physx/include/geomutils/GuContactPoint.h"
    )
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xUnspecifiedx" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/include/cooking" TYPE FILE FILES
    "/src/PhysX/physx/include/cooking/PxBVH33MidphaseDesc.h"
    "/src/PhysX/physx/include/cooking/PxBVH34MidphaseDesc.h"
    "/src/PhysX/physx/include/cooking/Pxc.h"
    "/src/PhysX/physx/include/cooking/PxConvexMeshDesc.h"
    "/src/PhysX/physx/include/cooking/PxCooking.h"
    "/src/PhysX/physx/include/cooking/PxMidphaseDesc.h"
    "/src/PhysX/physx/include/cooking/PxTriangleMeshDesc.h"
    "/src/PhysX/physx/include/cooking/PxBVHStructureDesc.h"
    )
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xUnspecifiedx" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/include/extensions" TYPE FILE FILES
    "/src/PhysX/physx/include/extensions/PxBinaryConverter.h"
    "/src/PhysX/physx/include/extensions/PxBroadPhaseExt.h"
    "/src/PhysX/physx/include/extensions/PxCollectionExt.h"
    "/src/PhysX/physx/include/extensions/PxConstraintExt.h"
    "/src/PhysX/physx/include/extensions/PxContactJoint.h"
    "/src/PhysX/physx/include/extensions/PxConvexMeshExt.h"
    "/src/PhysX/physx/include/extensions/PxD6Joint.h"
    "/src/PhysX/physx/include/extensions/PxD6JointCreate.h"
    "/src/PhysX/physx/include/extensions/PxDefaultAllocator.h"
    "/src/PhysX/physx/include/extensions/PxDefaultCpuDispatcher.h"
    "/src/PhysX/physx/include/extensions/PxDefaultErrorCallback.h"
    "/src/PhysX/physx/include/extensions/PxDefaultSimulationFilterShader.h"
    "/src/PhysX/physx/include/extensions/PxDefaultStreams.h"
    "/src/PhysX/physx/include/extensions/PxDistanceJoint.h"
    "/src/PhysX/physx/include/extensions/PxContactJoint.h"
    "/src/PhysX/physx/include/extensions/PxExtensionsAPI.h"
    "/src/PhysX/physx/include/extensions/PxFixedJoint.h"
    "/src/PhysX/physx/include/extensions/PxJoint.h"
    "/src/PhysX/physx/include/extensions/PxJointLimit.h"
    "/src/PhysX/physx/include/extensions/PxMassProperties.h"
    "/src/PhysX/physx/include/extensions/PxPrismaticJoint.h"
    "/src/PhysX/physx/include/extensions/PxRaycastCCD.h"
    "/src/PhysX/physx/include/extensions/PxRepXSerializer.h"
    "/src/PhysX/physx/include/extensions/PxRepXSimpleType.h"
    "/src/PhysX/physx/include/extensions/PxRevoluteJoint.h"
    "/src/PhysX/physx/include/extensions/PxRigidActorExt.h"
    "/src/PhysX/physx/include/extensions/PxRigidBodyExt.h"
    "/src/PhysX/physx/include/extensions/PxSceneQueryExt.h"
    "/src/PhysX/physx/include/extensions/PxSerialization.h"
    "/src/PhysX/physx/include/extensions/PxShapeExt.h"
    "/src/PhysX/physx/include/extensions/PxSimpleFactory.h"
    "/src/PhysX/physx/include/extensions/PxSmoothNormals.h"
    "/src/PhysX/physx/include/extensions/PxSphericalJoint.h"
    "/src/PhysX/physx/include/extensions/PxStringTableExt.h"
    "/src/PhysX/physx/include/extensions/PxTriangleMeshExt.h"
    )
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xUnspecifiedx" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/include/filebuf" TYPE FILE FILES "/src/PhysX/physx/include/filebuf/PxFileBuf.h")
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xUnspecifiedx" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/include/vehicle" TYPE FILE FILES
    "/src/PhysX/physx/include/vehicle/PxVehicleComponents.h"
    "/src/PhysX/physx/include/vehicle/PxVehicleDrive.h"
    "/src/PhysX/physx/include/vehicle/PxVehicleDrive4W.h"
    "/src/PhysX/physx/include/vehicle/PxVehicleDriveNW.h"
    "/src/PhysX/physx/include/vehicle/PxVehicleDriveTank.h"
    "/src/PhysX/physx/include/vehicle/PxVehicleNoDrive.h"
    "/src/PhysX/physx/include/vehicle/PxVehicleSDK.h"
    "/src/PhysX/physx/include/vehicle/PxVehicleShaders.h"
    "/src/PhysX/physx/include/vehicle/PxVehicleTireFriction.h"
    "/src/PhysX/physx/include/vehicle/PxVehicleUpdate.h"
    "/src/PhysX/physx/include/vehicle/PxVehicleUtil.h"
    "/src/PhysX/physx/include/vehicle/PxVehicleUtilControl.h"
    "/src/PhysX/physx/include/vehicle/PxVehicleUtilSetup.h"
    "/src/PhysX/physx/include/vehicle/PxVehicleUtilTelemetry.h"
    "/src/PhysX/physx/include/vehicle/PxVehicleWheels.h"
    )
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xUnspecifiedx" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/source/fastxml/include" TYPE FILE FILES "/src/PhysX/physx/source/fastxml/include/PsFastXml.h")
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xUnspecifiedx" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/include/task" TYPE FILE FILES
    "/src/PhysX/physx/include/task/PxCpuDispatcher.h"
    "/src/PhysX/physx/include/task/PxTask.h"
    "/src/PhysX/physx/include/task/PxTaskDefine.h"
    "/src/PhysX/physx/include/task/PxTaskManager.h"
    )
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xUnspecifiedx" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/bin/emscripten/debug" TYPE STATIC_LIBRARY FILES "/src/PhysX/physx/bin/emscripten/debug/PhysXFoundation.bc")
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xUnspecifiedx" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/bin/emscripten/debug" TYPE STATIC_LIBRARY FILES "/src/PhysX/physx/bin/emscripten/debug/PhysX_static.bc")
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xUnspecifiedx" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/bin/emscripten/debug" TYPE STATIC_LIBRARY FILES "/src/PhysX/physx/bin/emscripten/debug/PhysXCharacterKinematic_static.bc")
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xUnspecifiedx" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/bin/emscripten/debug" TYPE STATIC_LIBRARY FILES "/src/PhysX/physx/bin/emscripten/debug/PhysXPvdSDK_static.bc")
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xUnspecifiedx" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/bin/emscripten/debug" TYPE STATIC_LIBRARY FILES "/src/PhysX/physx/bin/emscripten/debug/PhysXCommon_static.bc")
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xUnspecifiedx" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/bin/emscripten/debug" TYPE STATIC_LIBRARY FILES "/src/PhysX/physx/bin/emscripten/debug/PhysXCooking_static.bc")
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xUnspecifiedx" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/bin/emscripten/debug" TYPE STATIC_LIBRARY FILES "/src/PhysX/physx/bin/emscripten/debug/PhysXExtensions_static.bc")
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xUnspecifiedx" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/bin/emscripten/debug" TYPE STATIC_LIBRARY FILES "/src/PhysX/physx/bin/emscripten/debug/PhysXVehicle_static.bc")
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xUnspecifiedx" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/bin/emscripten/debug" TYPE EXECUTABLE FILES "/src/PhysX/physx/bin/emscripten/debug/physx.debug.js")
  if(EXISTS "$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}/bin/emscripten/debug/physx.debug.js" AND
     NOT IS_SYMLINK "$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}/bin/emscripten/debug/physx.debug.js")
    if(CMAKE_INSTALL_DO_STRIP)
      execute_process(COMMAND "/usr/bin/strip" "$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}/bin/emscripten/debug/physx.debug.js")
    endif()
  endif()
endif()

