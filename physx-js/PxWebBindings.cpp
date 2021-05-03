#include <emscripten.h>
#include <emscripten/bind.h>
#include "PxPhysicsAPI.h"
#include <stdlib.h>
#include <stdio.h>
#include <sys/types.h>
#include <sys/select.h>
#include <sys/socket.h>
#include <fcntl.h>
#include <arpa/inet.h>
#include <errno.h>
#include <PsSocket.h>
#include <unistd.h>
#include <chrono>
#include <ctime>
#include <string>

#include "PsFoundation.h"
using namespace physx;
using namespace emscripten;

	class CustomQueryFilter : public PxSceneQueryFilterCallback
	{
	public:
		PxQueryHitType::Enum	preFilter(const PxFilterData& filterData, const PxShape* shape, const PxRigidActor* actor, PxHitFlags& queryFlags)
		{
      physx::shdfnd::getFoundation().error(PxErrorCode::eDEBUG_INFO, __FILE__, __LINE__, "prefilter");
			// PT: ignore triggers
			if(shape->getFlags() & physx::PxShapeFlag::eTRIGGER_SHAPE)
				return PxQueryHitType::eNONE;

			return PxQueryHitType::eBLOCK;
		}

		PxQueryHitType::Enum	postFilter(const PxFilterData& filterData, const PxQueryHit& hit)
		{
      physx::shdfnd::getFoundation().error(PxErrorCode::eDEBUG_INFO, __FILE__, __LINE__, "postFilter");
			return PxQueryHitType::eBLOCK;
		}
	};

struct PxRaycastCallbackWrapper : public wrapper<PxRaycastCallback>
{
  EMSCRIPTEN_WRAPPER(PxRaycastCallbackWrapper)
  PxAgain processTouches(const PxRaycastHit *buffer, PxU32 nbHits)
  {
    for (PxU32 i = 0; i < nbHits; i++)
    {
      bool again = call<PxAgain>("processTouches", buffer[i]);
      if (!again)
      {
        return false;
      }
    }
    return true;
  }
};

PxRaycastBuffer *allocateRaycastHitBuffers(PxU32 nb)
{
  PxRaycastBuffer *myArray = new PxRaycastBuffer[nb];
  return myArray;
}

struct PxSweepCallbackWrapper : public wrapper<PxSweepCallback>
{
  EMSCRIPTEN_WRAPPER(PxSweepCallbackWrapper)
  PxAgain processTouches(const PxSweepHit *buffer, PxU32 nbHits)
  {
    for (PxU32 i = 0; i < nbHits; i++)
    {
      bool again = call<PxAgain>("processTouches", buffer[i]);
      if (!again)
      {
        return false;
      }
    }
    return true;
  }
};

PxSweepHit *allocateSweepHitBuffers(PxU32 nb)
{
  PxSweepHit *myArray = new PxSweepHit[nb];
  return myArray;
}

struct PxQueryFilterCallbackWrapper : public wrapper<PxQueryFilterCallback>
{
  EMSCRIPTEN_WRAPPER(PxQueryFilterCallbackWrapper)
  PxQueryHitType::Enum postFilter(const PxFilterData &filterData, const PxQueryHit &hit)
  {
    return call<PxQueryHitType::Enum>("postFilter", filterData, hit);
  }
  PxQueryHitType::Enum preFilter(const PxFilterData &filterData, const PxShape *shape, const PxRigidActor *actor, PxHitFlags &)
  {
    PxQueryHitType::Enum hitType = call<PxQueryHitType::Enum>("preFilter", filterData, shape, actor);
    return hitType;
  }
};

struct PxUserControllerHitReportWrapper : public wrapper<PxUserControllerHitReport>
{
  EMSCRIPTEN_WRAPPER(PxUserControllerHitReportWrapper)
  void onShapeHit(const PxControllerShapeHit &hit)
  {
    call<void>("onShapeHit", hit);
  }
  void onControllerHit(const PxControllersHit &hit)
  {
    call<void>("onControllerHit", hit);
  }
  void onObstacleHit(const PxControllerObstacleHit &hit)
  {
    call<void>("onObstacleHit", hit);
  }
};

struct PxSimulationEventCallbackWrapper : public wrapper<PxSimulationEventCallback>
{
  EMSCRIPTEN_WRAPPER(PxSimulationEventCallbackWrapper)
  void onConstraintBreak(PxConstraintInfo *constraints, PxU32 count)
  {
    for (PxU32 i = 0; i < count; i++)
    {
      PxJoint *joint = reinterpret_cast<PxJoint *>(constraints[i].externalReference);
      call<void>("onConstraintBreak", joint);
    }
  }
  void onWake(PxActor **, PxU32) {}
  void onSleep(PxActor **, PxU32) {}
  void onContact(const PxContactPairHeader &, const PxContactPair *pairs, PxU32 nbPairs)
  {
    for (PxU32 i = 0; i < nbPairs; i++)
    {
      const PxContactPair &cp = pairs[i];

      if (cp.flags & (PxContactPairFlag::eREMOVED_SHAPE_0 | PxContactPairFlag::eREMOVED_SHAPE_1))
        continue;

      if (cp.events & PxPairFlag::eNOTIFY_TOUCH_FOUND)
      {
        PxContactStreamIterator iter(cp.contactPatches, cp.contactPoints, cp.getInternalFaceIndices(), cp.patchCount, cp.contactCount);

        PxU32 hasImpulses = (cp.flags & PxContactPairFlag::eINTERNAL_HAS_IMPULSES);
        PxU32 nbContacts = 0;

        std::vector<PxVec3> contactPoints;
        std::vector<PxReal> impulses;
        contactPoints.reserve(cp.contactCount);
        impulses.reserve(cp.contactCount);

        while (iter.hasNextPatch())
        {
          iter.nextPatch();
          while (iter.hasNextContact())
          {
            iter.nextContact();
            PxVec3 point = iter.getContactPoint();
            contactPoints.push_back(point);
            PxReal impulse = hasImpulses ? cp.contactImpulses[nbContacts] : 0.0f;
            impulses.push_back(impulse);
            nbContacts++;
          }
        }

        call<void>("onContactBegin", cp.shapes[0], cp.shapes[1], contactPoints, impulses);
      }
      else if (cp.events & PxPairFlag::eNOTIFY_TOUCH_LOST)
      {
        call<void>("onContactEnd", cp.shapes[0], cp.shapes[1]);
      }
      else if (cp.events & PxPairFlag::eNOTIFY_TOUCH_PERSISTS)
      {
        call<void>("onContactPersist", cp.shapes[0], cp.shapes[1]);
      }
    }
  }
  void onTrigger(PxTriggerPair *pairs, PxU32 count)
  {
    physx::shdfnd::getFoundation().error(PxErrorCode::eDEBUG_INFO, __FILE__, __LINE__, "onTrigger");
    for (PxU32 i = 0; i < count; i++)
    {
      const PxTriggerPair &tp = pairs[i];
      if (tp.flags & (PxTriggerPairFlag::eREMOVED_SHAPE_TRIGGER | PxTriggerPairFlag::eREMOVED_SHAPE_OTHER))
        continue;

      call<void>("onTrigger", tp.triggerShape, tp.otherShape);

      if (tp.status & PxPairFlag::eNOTIFY_TOUCH_FOUND)
      {
        call<void>("onTriggerBegin", tp.triggerShape, tp.otherShape);
      }
      else if (tp.status & PxPairFlag::eNOTIFY_TOUCH_LOST)
      {
        call<void>("onTriggerEnd", tp.triggerShape, tp.otherShape);
      }
    }
  }
  void onAdvance(const PxRigidBody *const *, const PxTransform *, const PxU32) {}
};

PxFilterFlags DefaultFilterShader(
    PxFilterObjectAttributes attributes0, PxFilterData,
    PxFilterObjectAttributes attributes1, PxFilterData,
    PxPairFlags &pairFlags, const void *, PxU32)
{
  if (PxFilterObjectIsTrigger(attributes0) || PxFilterObjectIsTrigger(attributes1))
  {
    pairFlags = PxPairFlag::eTRIGGER_DEFAULT | PxPairFlag::eDETECT_CCD_CONTACT;
    return PxFilterFlag::eDEFAULT;
  }
  pairFlags = PxPairFlag::eCONTACT_DEFAULT | PxPairFlag::eNOTIFY_TOUCH_FOUND | PxPairFlag::eNOTIFY_TOUCH_LOST | PxPairFlag::eNOTIFY_TOUCH_PERSISTS | PxPairFlag::eDETECT_CCD_CONTACT;
  return PxFilterFlag::eDEFAULT;
}

PxFilterFlags LayerMaskFilterShader(
    PxFilterObjectAttributes attributes0, PxFilterData filterData0,
    PxFilterObjectAttributes attributes1, PxFilterData filterData1,
    PxPairFlags &pairFlags, const void *, PxU32)
{
  if (PxFilterObjectIsTrigger(attributes0) || PxFilterObjectIsTrigger(attributes1))
  {
    pairFlags = PxPairFlag::eTRIGGER_DEFAULT | PxPairFlag::eDETECT_CCD_CONTACT;
    return PxFilterFlag::eDEFAULT;
  }

  // Collision group ids. Prevent objects in same collision "object" from self-colliding
  if (filterData0.word2 > 0 && filterData1.word2 > 0 && filterData0.word2 == filterData1.word2)
  {
    return PxFilterFlag::eSUPPRESS;
  }

  // Support collision matrix layers
  // word0: the layer - eg 1 << 16 (16th bit 1 all others 0)
  // word1: the mask - each active bit is a layer that collides with this
  if (!(filterData0.word0 & filterData1.word1) && !(filterData1.word0 & filterData0.word1))
  {
    return PxFilterFlag::eSUPPRESS;
  }

  // pairFlags = PxPairFlag::eCONTACT_DEFAULT | PxPairFlag::eNOTIFY_TOUCH_FOUND | PxPairFlag::eNOTIFY_TOUCH_LOST | PxPairFlag::eNOTIFY_TOUCH_PERSISTS |PxPairFlag::eDETECT_CCD_CONTACT;
  pairFlags = PxPairFlag::eCONTACT_DEFAULT | PxPairFlag::eSOLVE_CONTACT | PxPairFlag::eNOTIFY_TOUCH_FOUND | PxPairFlag::eNOTIFY_TOUCH_LOST | PxPairFlag::eNOTIFY_TOUCH_PERSISTS | PxPairFlag::eDETECT_CCD_CONTACT | PxPairFlag::eDETECT_DISCRETE_CONTACT | PxPairFlag::eNOTIFY_CONTACT_POINTS;
  return PxFilterFlag::eDEFAULT;
}

// TODO: Getting the  global PxDefaultSimulationFilterShader into javascript
// is problematic, so let's provide this custom factory function for now

PxSceneDesc *getDefaultSceneDesc(PxTolerancesScale &scale, int numThreads, PxSimulationEventCallback *callback)
{
  PxSceneDesc *sceneDesc = new PxSceneDesc(scale);
  sceneDesc->gravity = PxVec3(0.0f, -9.81f, 0.0f);
  sceneDesc->cpuDispatcher = PxDefaultCpuDispatcherCreate(numThreads);
  sceneDesc->filterShader = LayerMaskFilterShader;
  sceneDesc->simulationEventCallback = callback;
  sceneDesc->kineKineFilteringMode = PxPairFilteringMode::eKEEP;
  sceneDesc->staticKineFilteringMode = PxPairFilteringMode::eKEEP;
  sceneDesc->flags |= PxSceneFlag::eENABLE_CCD;
  return sceneDesc;
}

PxConvexMesh *createConvexMeshFromVectors(std::vector<PxVec3> &vertices, PxCooking &cooking, PxPhysics &physics)
{
  PxConvexMeshDesc convexDesc;
  convexDesc.points.count = vertices.size();
  convexDesc.points.stride = sizeof(PxVec3);
  convexDesc.points.data = vertices.data();
  convexDesc.flags = PxConvexFlag::eCOMPUTE_CONVEX | PxConvexFlag::eCHECK_ZERO_AREA_TRIANGLES | PxConvexFlag::eSHIFT_VERTICES | PxConvexFlag::eQUANTIZE_INPUT | PxConvexFlag::eDISABLE_MESH_VALIDATION;

  cooking.validateConvexMesh(convexDesc);

  PxConvexMesh *convexMesh = cooking.createConvexMesh(convexDesc, physics.getPhysicsInsertionCallback());

  return convexMesh;
}

PxConvexMesh *createConvexMesh(int vertices, PxU32 vertCount, PxCooking &cooking, PxPhysics &physics)
{
  PxConvexMeshDesc convexDesc;
  convexDesc.points.count = vertCount;
  convexDesc.points.stride = sizeof(PxVec3);
  convexDesc.points.data = (PxVec3 *)vertices;
  convexDesc.flags = PxConvexFlag::eCOMPUTE_CONVEX | PxConvexFlag::eCHECK_ZERO_AREA_TRIANGLES | PxConvexFlag::eSHIFT_VERTICES | PxConvexFlag::eQUANTIZE_INPUT | PxConvexFlag::eDISABLE_MESH_VALIDATION;

  cooking.validateConvexMesh(convexDesc);

  PxConvexMesh *convexMesh = cooking.createConvexMesh(convexDesc, physics.getPhysicsInsertionCallback());

  return convexMesh;
}

// TODO
PxConvexMesh *createConvexMeshComputeHull(int vertices, PxU32 vertCount, int indices, PxU32 indexCount, PxCooking &cooking, PxPhysics &physics)
{
  PxSimpleTriangleMesh triangleMesh;
  triangleMesh.points.count = vertCount;
  triangleMesh.points.stride = sizeof(PxVec3);
  triangleMesh.points.data = (PxVec3 *)vertices;

  int len = indexCount * 3;
  PxU32* intPtr = new PxU32[len];
  PxF32* ptr = (PxF32 *)indices;

  std::string str;
  // Explicitly cast float values to unsigned int
  for (int i = 0; i < len; i++)
  {
    intPtr[i] = static_cast<unsigned int>(ptr[i]);
  }

  triangleMesh.triangles.count = indexCount;
  triangleMesh.triangles.stride = 3 * sizeof(PxU32);
  triangleMesh.triangles.data = (PxU32 *)intPtr;

  PxDefaultAllocator cb;
  PxU32 nbVerts;
  PxVec3 *hullVertices;
  PxU32 nbIndices;
  PxU32 *hullIndices;
  PxU32 nbPolygons;
  PxHullPolygon *hullPolygons;

  cooking.computeHullPolygons(
      triangleMesh,
      cb,
      nbVerts,
      hullVertices,
      nbIndices,
      hullIndices,
      nbPolygons,
      hullPolygons);

  PxConvexMeshDesc convexDesc;

  convexDesc.points.count = nbVerts;
  convexDesc.points.stride = sizeof(PxVec3);
  convexDesc.points.data = &hullVertices;

  convexDesc.indices.count = nbIndices;
  convexDesc.indices.stride = sizeof(PxVec3);
  convexDesc.indices.data = &hullIndices;

  convexDesc.polygons.count = nbPolygons;
  convexDesc.polygons.stride = sizeof(PxVec3);
  convexDesc.polygons.data = &hullPolygons;

  convexDesc.flags = PxConvexFlag::eCOMPUTE_CONVEX | PxConvexFlag::eCHECK_ZERO_AREA_TRIANGLES | PxConvexFlag::eSHIFT_VERTICES | PxConvexFlag::eQUANTIZE_INPUT | PxConvexFlag::eDISABLE_MESH_VALIDATION;

  cooking.validateConvexMesh(convexDesc);

  PxConvexMesh *convexMesh = cooking.createConvexMesh(convexDesc, physics.getPhysicsInsertionCallback());

  return convexMesh;
}

PxTriangleMesh *createTriMesh(int vertices, PxU32 vertCount, int indices, PxU32 indexCount, bool isU16, PxCooking &cooking, PxPhysics &physics)
{
  PxTriangleMeshDesc meshDesc;
  meshDesc.points.count = vertCount;
  meshDesc.points.stride = sizeof(PxVec3);
  meshDesc.points.data = (PxVec3 *)vertices;

  if(indexCount > 0) {

    int len = indexCount * 3;
    PxU32* intPtr = new PxU32[len];
    PxF32* ptr = (PxF32 *)indices;

    std::string str;
    // Explicitly cast float values to unsigned int
    for (int i = 0; i < len; i++)
    {
      intPtr[i] = static_cast<unsigned int>(ptr[i]);
    }

    meshDesc.triangles.count = indexCount;
    if (isU16)
    {
      meshDesc.triangles.stride = 3 * sizeof(PxU16);
      meshDesc.triangles.data = (PxU16 *)intPtr;
      meshDesc.flags = PxMeshFlag::e16_BIT_INDICES;
    }
    else
    {
      meshDesc.triangles.stride = 3 * sizeof(PxU32);
      meshDesc.triangles.data = (PxU32 *)intPtr;
    }
  }

  cooking.validateTriangleMesh(meshDesc);

  PxTriangleMesh *triangleMesh = cooking.createTriangleMesh(meshDesc, physics.getPhysicsInsertionCallback());
  return triangleMesh;
}

PxTriangleMesh *createTriMeshExt(std::vector<PxVec3> &vertices, std::vector<PxU16> &indices, PxCooking &cooking, PxPhysics &physics)
{
  PxTriangleMeshDesc meshDesc;
  meshDesc.points.count = vertices.size();
  meshDesc.points.stride = sizeof(PxVec3);
  meshDesc.points.data = (PxVec3 *)vertices.data();

  meshDesc.triangles.count = indices.size() / 3;
  meshDesc.triangles.stride = 3 * sizeof(PxU16);
  meshDesc.triangles.data = (PxU16 *)indices.data();
  meshDesc.flags = PxMeshFlag::e16_BIT_INDICES;

  PxTriangleMesh *triangleMesh = cooking.createTriangleMesh(meshDesc, physics.getPhysicsInsertionCallback());
  return triangleMesh;
}

PxHeightField *createHeightFieldExt(PxU32 numCols, PxU32 numRows, std::vector<PxHeightFieldSample> &samples, PxCooking &cooking, PxPhysics &physics)
{
  PxHeightFieldDesc hfDesc;
  // hfDesc.format             = PxHeightFieldFormat::eS16_TM;
  hfDesc.nbColumns = numCols;
  hfDesc.nbRows = numRows;
  hfDesc.samples.data = samples.data();
  hfDesc.samples.stride = sizeof(PxHeightFieldSample);

  PxHeightField *heightField = cooking.createHeightField(hfDesc, physics.getPhysicsInsertionCallback());
  return heightField;
}

EMSCRIPTEN_BINDINGS(physx)
{

  constant("PX_PHYSICS_VERSION", PX_PHYSICS_VERSION);

  // Global functions
  // These are generaly system/scene level initialization
  function("PxCreateFoundation", &PxCreateFoundation, allow_raw_pointers());
  function("PxInitExtensions", &PxInitExtensions, allow_raw_pointers());
  function("PxDefaultCpuDispatcherCreate", &PxDefaultCpuDispatcherCreate, allow_raw_pointers());
  function("PxCreatePvd", &PxCreatePvd, allow_raw_pointers());
  function("PxCreateBasePhysics", &PxCreateBasePhysics, allow_raw_pointers());
  function("PxCreatePhysics", &PxCreateBasePhysics, allow_raw_pointers());
  function("PxRegisterArticulations", &PxRegisterArticulations, allow_raw_pointers());
  function("PxRegisterArticulationsReducedCoordinate", &PxRegisterArticulationsReducedCoordinate, allow_raw_pointers());
  function("PxRegisterHeightFields", &PxRegisterHeightFields, allow_raw_pointers());
  function("PxCreateCooking", &PxCreateCooking, allow_raw_pointers());
  function("PxCreatePlane", &PxCreatePlane, allow_raw_pointers());
  function("getDefaultSceneDesc", &getDefaultSceneDesc, allow_raw_pointers());

  class_<PxUserControllerHitReport>("PxUserControllerHitReport")
      .allow_subclass<PxUserControllerHitReportWrapper>("PxUserControllerHitReportWrapper");

  class_<PxSimulationEventCallback>("PxSimulationEventCallback")
      .allow_subclass<PxSimulationEventCallbackWrapper>("PxSimulationEventCallbackWrapper");

  // Joints
  function("PxFixedJointCreate", &PxFixedJointCreate, allow_raw_pointers());
  function("PxRevoluteJointCreate", &PxRevoluteJointCreate, allow_raw_pointers());
  function("PxSphericalJointCreate", &PxSphericalJointCreate, allow_raw_pointers());
  function("PxDistanceJointCreate", &PxDistanceJointCreate, allow_raw_pointers());
  function("PxPrismaticJointCreate", &PxPrismaticJointCreate, allow_raw_pointers());
  function("PxD6JointCreate", &PxD6JointCreate, allow_raw_pointers());

  enum_<PxConstraintFlag::Enum>("PxConstraintFlag")
      .value("eBROKEN", PxConstraintFlag::Enum::eBROKEN)
      .value("eCOLLISION_ENABLED", PxConstraintFlag::Enum::eCOLLISION_ENABLED)
      .value("ePROJECTION", PxConstraintFlag::ePROJECTION);

  class_<PxSpring>("PxSpring")
      .property("stiffness", &PxSpring::stiffness)
      .property("damping", &PxSpring::damping);

  class_<PxJointLimitParameters>("PxJointLimitParameters")
      .property("restitution", &PxJointLimitParameters::restitution)
      .property("damping", &PxJointLimitParameters::damping)
      .property("stiffness", &PxJointLimitParameters::restitution)
      .property("bounceThreshold", &PxJointLimitParameters::bounceThreshold)
      .property("contactDistance", &PxJointLimitParameters::contactDistance)
      .function("isValid", &PxJointLimitParameters::isValid)
      .function("isSoft", &PxJointLimitParameters::isSoft);

  class_<PxJointLimitCone, base<PxJointLimitParameters>>("PxJointLimitCone")
      .constructor<PxReal, PxReal>()
      .constructor<PxReal, PxReal, PxReal>()
      .property("yAngle", &PxJointLimitCone::yAngle)
      .property("zAngle", &PxJointLimitCone::zAngle);

  class_<PxJointLinearLimitPair, base<PxJointLimitParameters>>("PxJointLinearLimitPair")
      .constructor<const PxTolerancesScale &, PxReal, PxReal>()
      .constructor<const PxTolerancesScale &, PxReal, PxReal, PxReal>()
      .property("upper", &PxJointLinearLimitPair::lower)
      .property("lower", &PxJointLinearLimitPair::upper);

  class_<PxJointAngularLimitPair, base<PxJointLimitParameters>>("PxJointAngularLimitPair")
      .constructor<PxReal, PxReal>()
      .constructor<PxReal, PxReal, PxReal>()
      .property("upper", &PxJointAngularLimitPair::upper)
      .property("lower", &PxJointAngularLimitPair::lower);

  class_<PxConstraint>("PxConstraint")
      .function("getLinearForce", optional_override([](PxConstraint &c) {
                  PxVec3 l;
                  PxVec3 v;
                  c.getForce(l, v);
                  return l;
                }))
      .function("getAngularForce", optional_override([](PxConstraint &c) {
                  PxVec3 l;
                  PxVec3 v;
                  c.getForce(l, v);
                  return v;
                }))
      .function("setBreakForce", optional_override([](PxConstraint &c, PxReal linear, PxReal angular) { c.setBreakForce(linear, angular); }));

  class_<PxJoint>("PxJoint")
      .function("setActors", &PxJoint::setActors, allow_raw_pointers())
      .function("setLocalPose", optional_override([](PxJoint &joint, PxU8 index, PxTransform &pos) {
                  joint.setLocalPose(PxJointActorIndex::Enum(index), pos);
                }))
      .function("setBreakForce", &PxJoint::setBreakForce)
      .function("setConstraintFlag", optional_override([](PxJoint &joint, PxU16 flag, bool v) {
                  joint.setConstraintFlag(PxConstraintFlag::Enum(flag), v);
                }))
      .function("setConstraintFlags", optional_override([](PxJoint &joint, PxU16 flags) {
                  joint.setConstraintFlags(PxConstraintFlags(flags));
                }))
      .function("release", &PxJoint::release)
      .function("getConstraint", &PxJoint::getConstraint, allow_raw_pointers());

  enum_<PxSphericalJointFlag::Enum>("PxSphericalJointFlag")
      .value("eLIMIT_ENABLED", PxSphericalJointFlag::eLIMIT_ENABLED);

  class_<PxSphericalJoint, base<PxJoint>>("PxSphericalJoint")
      .function("setSphericalJointFlag", &PxSphericalJoint::setSphericalJointFlag)
      .function("setLimitCone", &PxSphericalJoint::setLimitCone);

  class_<PxRevoluteJoint, base<PxJoint>>("PxRevoluteJoint")
      .function("getAngle", &PxRevoluteJoint::getAngle)
      .function("getVelocity", &PxRevoluteJoint::getVelocity)
      .function("setLimit", &PxRevoluteJoint::setLimit)
      .function("getLimit", &PxRevoluteJoint::getLimit)
      .function("setDriveVelocity", &PxRevoluteJoint::setDriveVelocity)
      .function("getDriveVelocity", &PxRevoluteJoint::getDriveVelocity)
      .function("setDriveForceLimit", &PxRevoluteJoint::setDriveForceLimit)
      .function("getDriveForceLimit", &PxRevoluteJoint::getDriveForceLimit)
      .function("getDriveGearRatio", &PxRevoluteJoint::getDriveGearRatio)
      .function("setDriveGearRatio", &PxRevoluteJoint::setDriveGearRatio)
      .function("setRevoluteJointFlag", optional_override([](PxRevoluteJoint &joint, PxU16 flag, bool v) {
                  joint.setRevoluteJointFlag(PxRevoluteJointFlag::Enum(flag), v);
                }))
      .function("setRevoluteJointFlags", optional_override([](PxRevoluteJoint &joint, PxU16 flags) {
                  joint.setRevoluteJointFlags(PxRevoluteJointFlags(flags));
                }))
      .function("setProjectionLinearTolerance", &PxRevoluteJoint::setProjectionLinearTolerance)
      .function("getProjectionLinearTolerance", &PxRevoluteJoint::getProjectionLinearTolerance)
      .function("setProjectionAngularTolerance", &PxRevoluteJoint::setProjectionAngularTolerance)
      .function("getProjectionAngularTolerance", &PxRevoluteJoint::getProjectionAngularTolerance);
  class_<PxFixedJoint, base<PxJoint>>("PxFixedJoint")
      .function("setProjectionLinearTolerance", &PxFixedJoint::setProjectionLinearTolerance)
      .function("setProjectionAngularTolerance", &PxFixedJoint::setProjectionAngularTolerance);
  class_<PxDistanceJoint, base<PxJoint>>("PxDistanceJoint")
      .function("getDistance", &PxDistanceJoint::getDistance)
      .function("setMinDistance", &PxDistanceJoint::setMinDistance)
      .function("getMinDistance", &PxDistanceJoint::getMinDistance)
      .function("setMaxDistance", &PxDistanceJoint::setMaxDistance)
      .function("getMaxDistance", &PxDistanceJoint::getMaxDistance)
      .function("setTolerance", &PxDistanceJoint::setTolerance)
      .function("getTolerance", &PxDistanceJoint::getTolerance)
      .function("setStiffness", &PxDistanceJoint::setStiffness)
      .function("getStiffness", &PxDistanceJoint::getStiffness)
      .function("setDamping", &PxDistanceJoint::setDamping)
      .function("getDamping", &PxDistanceJoint::getDamping)
      .function("setDistanceJointFlags", optional_override([](PxDistanceJoint &joint, PxU16 flags) {
                  joint.setDistanceJointFlags(PxDistanceJointFlags(flags));
                }));
  class_<PxPrismaticJoint, base<PxJoint>>("PxPrismaticJoint");

  enum_<PxD6Axis::Enum>("PxD6Axis")
      .value("eX", PxD6Axis::Enum::eX)
      .value("eY", PxD6Axis::Enum::eY)
      .value("eZ", PxD6Axis::Enum::eZ)
      .value("eTWIST", PxD6Axis::Enum::eTWIST)
      .value("eSWING1", PxD6Axis::Enum::eSWING1)
      .value("eSWING2", PxD6Axis::Enum::eSWING2);

  enum_<PxD6Motion::Enum>("PxD6Motion")
      .value("eLOCKED", PxD6Motion::Enum::eLOCKED)
      .value("eLIMITED", PxD6Motion::Enum::eLIMITED)
      .value("eFREE", PxD6Motion::Enum::eFREE);

  class_<PxD6JointDrive, base<PxSpring>>("PxD6JointDrive")
      .constructor<>()
      .constructor<PxReal, PxReal, PxReal, bool>()
      .property("forceLimit", &PxD6JointDrive::forceLimit)
      .function("setAccelerationFlag", optional_override([](PxD6JointDrive &drive, bool enabled) {
                  if (enabled)
                  {
                    drive.flags.set(PxD6JointDriveFlag::Enum::eACCELERATION);
                  }
                  else
                  {
                    drive.flags.clear(PxD6JointDriveFlag::Enum::eACCELERATION);
                  }
                }));

  enum_<PxD6Drive::Enum>("PxD6Drive")
      .value("eX", PxD6Drive::Enum::eX)
      .value("eY", PxD6Drive::Enum::eY)
      .value("eZ", PxD6Drive::Enum::eZ)
      .value("eSWING", PxD6Drive::Enum::eSWING)
      .value("eTWIST", PxD6Drive::Enum::eTWIST)
      .value("eSLERP", PxD6Drive::Enum::eSLERP);

  class_<PxD6Joint, base<PxJoint>>("PxD6Joint")
      .function("setMotion", &PxD6Joint::setMotion)
      .function("getMotion", &PxD6Joint::getMotion)
      .function("setLinearLimit", select_overload<void(PxD6Axis::Enum, const PxJointLinearLimitPair &)>(&PxD6Joint::setLinearLimit))
      .function("setTwistLimit", &PxD6Joint::setTwistLimit)
      .function("setSwingLimit", &PxD6Joint::setSwingLimit)
      .function("setDrive", &PxD6Joint::setDrive)
      .function("setDrivePosition", select_overload<void(const PxTransform &, bool)>(&PxD6Joint::setDrivePosition))
      .function("setDriveVelocity", select_overload<void(const PxVec3 &, const PxVec3 &, bool)>(&PxD6Joint::setDriveVelocity));

  class_<PxAllocatorCallback>("PxAllocatorCallback");
  // .function("allocate", &PxAllocatorCallback::allocate, allow_raw_pointers())
  // .function("deallocate", &PxAllocatorCallback::deallocate, allow_raw_pointers());

  class_<PxDefaultAllocator, base<PxAllocatorCallback>>("PxDefaultAllocator")
      .constructor<>()
      .function("allocate", &PxDefaultAllocator::allocate, allow_raw_pointers())
      .function("deallocate", &PxDefaultAllocator::deallocate, allow_raw_pointers());

  class_<PxTolerancesScale>("PxTolerancesScale")
      .constructor<>()
      .property("speed", &PxTolerancesScale::speed)
      .property("length", &PxTolerancesScale::length);

  // Define PxVec3, PxQuat and PxTransform as value objects to allow sumerian Vector3 and Quaternion to be used directly without the need to free the memory
  value_object<PxVec3>("PxVec3")
      .field("x", &PxVec3::x)
      .field("y", &PxVec3::y)
      .field("z", &PxVec3::z);
  register_vector<PxVec3>("PxVec3Vector");
  value_object<PxQuat>("PxQuat")
      .field("x", &PxQuat::x)
      .field("y", &PxQuat::y)
      .field("z", &PxQuat::z)
      .field("w", &PxQuat::w);
  value_object<PxTransform>("PxTransform")
      .field("translation", &PxTransform::p)
      .field("rotation", &PxTransform::q);
  value_object<PxExtendedVec3>("PxExtendedVec3")
      .field("x", &PxExtendedVec3::x)
      .field("y", &PxExtendedVec3::y)
      .field("z", &PxExtendedVec3::z);

  value_object<PxBounds3>("PxBounds3")
      .field("minimum", &PxBounds3::minimum)
      .field("maximum", &PxBounds3::maximum);

  class_<PxContactPairPoint>("PxContactPairPoint")
      .property("normal", &PxContactPairPoint::normal)
      .property("impulse", &PxContactPairPoint::impulse)
      .property("position", &PxContactPairPoint::position)
      .property("separation", &PxContactPairPoint::separation);
  register_vector<PxContactPairPoint>("PxContactPairPointVector");

  enum_<PxIDENTITY>("PxIDENTITY")
      .value("PxIdentity", PxIDENTITY::PxIdentity);

  enum_<PxPvdInstrumentationFlag::Enum>("PxPvdInstrumentationFlag")
      .value("eALL", PxPvdInstrumentationFlag::Enum::eALL)
      .value("eDEBUG", PxPvdInstrumentationFlag::Enum::eDEBUG)
      .value("ePROFILE", PxPvdInstrumentationFlag::Enum::ePROFILE)
      .value("eMEMORY", PxPvdInstrumentationFlag::Enum::eMEMORY);

  enum_<PxForceMode::Enum>("PxForceMode")
      .value("eFORCE", PxForceMode::Enum::eFORCE)
      .value("eIMPULSE", PxForceMode::Enum::eIMPULSE)
      .value("eVELOCITY_CHANGE", PxForceMode::Enum::eVELOCITY_CHANGE)
      .value("eACCELERATION", PxForceMode::Enum::eACCELERATION);

  class_<PxSceneDesc>("PxSceneDesc")
      .constructor<PxTolerancesScale>()
      .property("gravity", &PxSceneDesc::gravity);

  class_<PxFoundation>("PxFoundation")
      // todo: figure these out
      // .function("getAllocatorCallback", &PxFoundation::getAllocatorCallback, allow_raw_pointers())
      // .function("getErrorCallback", &PxFoundation::getErrorCallback)//, allow_raw_pointers())
      .function("getErrorLevel", &PxFoundation::getErrorLevel) //, allow_raw_pointers())
      .function("getReportAllocationNames", &PxFoundation::getReportAllocationNames)
      .function("release", &PxFoundation::release);

  class_<PxSceneFlags>("PxSceneFlags")
      .constructor<int>()
      .function("isSet", &PxSceneFlags::isSet);
  enum_<PxSceneFlag::Enum>("PxSceneFlag")
      .value("eENABLE_ACTIVE_ACTORS ", PxSceneFlag::Enum::eENABLE_ACTIVE_ACTORS)
      .value("eENABLE_CCD", PxSceneFlag::Enum::eENABLE_CCD)
      .value("eDISABLE_CCD_RESWEEP", PxSceneFlag::Enum::eDISABLE_CCD_RESWEEP)
      .value("eADAPTIVE_FORCE", PxSceneFlag::Enum::eADAPTIVE_FORCE)
      .value("eENABLE_PCM", PxSceneFlag::Enum::eENABLE_PCM)
      .value("eDISABLE_CONTACT_REPORT_BUFFER_RESIZE", PxSceneFlag::Enum::eDISABLE_CONTACT_REPORT_BUFFER_RESIZE)
      .value("eDISABLE_CONTACT_CACHE", PxSceneFlag::Enum::eDISABLE_CONTACT_CACHE)
      .value("eREQUIRE_RW_LOCK", PxSceneFlag::Enum::eREQUIRE_RW_LOCK)
      .value("eENABLE_STABILIZATION", PxSceneFlag::Enum::eENABLE_STABILIZATION)
      .value("eENABLE_AVERAGE_POINT", PxSceneFlag::Enum::eENABLE_AVERAGE_POINT)
      .value("eEXCLUDE_KINEMATICS_FROM_ACTIVE_ACTORS", PxSceneFlag::Enum::eEXCLUDE_KINEMATICS_FROM_ACTIVE_ACTORS)
      .value("eENABLE_ENHANCED_DETERMINISM", PxSceneFlag::Enum::eENABLE_ENHANCED_DETERMINISM)
      .value("eENABLE_FRICTION_EVERY_ITERATION", PxSceneFlag::Enum::eENABLE_FRICTION_EVERY_ITERATION);

  class_<PxScene>("PxScene")
      .function("setGravity", &PxScene::setGravity)
      .function("getGravity", &PxScene::getGravity)
      .function("addActor", &PxScene::addActor, allow_raw_pointers())
      .function("removeActor", &PxScene::removeActor, allow_raw_pointers())
      .function("getScenePvdClient", &PxScene::getScenePvdClient, allow_raw_pointers())
      .function("getActors", &PxScene::getActors, allow_raw_pointers())
      .function("setVisualizationCullingBox", &PxScene::setVisualizationCullingBox)
      .function("simulate", optional_override(
                                [](PxScene &scene, PxReal elapsedTime, bool controlSimulation) {
                                  scene.simulate(elapsedTime, NULL, 0, 0, controlSimulation);
                                  return;
                                }))
      .function("fetchResults", optional_override(
                                    [](PxScene &scene, bool block) {
                                      // fetchResults uses an out pointer
                                      // which embind can't represent
                                      // so let's override.
                                      bool fetched = scene.fetchResults(block);
                                      return fetched;
                                    }))
      .function("raycast", optional_override(
                               [](PxScene &scene, const PxVec3 &origin, const PxVec3 &unitDir, const PxReal distance, PxRaycastCallback &hitCall) {
                                 bool fetched = scene.raycast(origin, unitDir, distance, hitCall);
                                 return fetched;
                               }))
      .function("raycastSingle", optional_override([](PxScene &scene, const PxVec3 &origin, const PxVec3 &unitDir, const PxReal distance, PxU16 flags, PxRaycastHit &hit, const PxSceneQueryFilterData &filterData) {
                  // CustomQueryFilter filterCallback;
                  bool result = PxSceneQueryExt::raycastSingle(scene, origin, unitDir, distance, PxHitFlags(flags), hit, filterData, NULL, NULL);
                  return result;
                }),
                allow_raw_pointers())
      .function("raycastAny", optional_override([](PxScene &scene, const PxVec3 &origin, const PxVec3 &unitDir, const PxReal distance, PxRaycastHit &hit, const PxSceneQueryFilterData &filterData) {
                  return PxSceneQueryExt::raycastAny(scene, origin, unitDir, distance, hit, filterData, NULL, NULL);
                  ;
                }),
                allow_raw_pointers())
      .function("raycastMultiple", optional_override([](PxScene &scene, const PxVec3 &origin, const PxVec3 &unitDir, const PxReal distance, PxU16 flags, std::vector<PxRaycastHit> &hitBuffer, PxU32 hbsize, const PxSceneQueryFilterData &filterData) {
                  bool hitBlock = false;
                  return PxSceneQueryExt::raycastMultiple(scene, origin, unitDir, distance, PxHitFlags(flags), hitBuffer.data(), hbsize, hitBlock, filterData, NULL, NULL);
                }),
                allow_raw_pointers())
      .function("sweep", &PxScene::sweep, allow_raw_pointers());

  class_<PxQueryHit>("PxQueryHit")
      .function("getShape", optional_override([](PxQueryHit &block) { return block.shape; }), allow_raw_pointers())
      .function("getActor", optional_override([](PxQueryHit &block) { return block.actor; }), allow_raw_pointers());

  class_<PxLocationHit>("PxLocationHit")
      .property("position", &PxLocationHit::position)
      .property("normal", &PxLocationHit::normal)
      .property("distance", &PxLocationHit::distance);
      
  class_<PxRaycastHit, base<PxLocationHit>>("PxRaycastHit")
      .constructor<>()
      .function("getShape", optional_override([](PxRaycastHit &block) {
                  return block.shape;
                }),
                allow_raw_pointers());
  register_vector<PxRaycastHit>("PxRaycastHitVector");

  class_<PxRaycastCallback>("PxRaycastCallback")
      .property("block", &PxRaycastCallback::block)
      .property("hasBlock", &PxRaycastCallback::hasBlock)
      .allow_subclass<PxRaycastCallbackWrapper>("PxRaycastCallbackWrapper", constructor<PxRaycastHit *, PxU32>());

  class_<PxRaycastBuffer, base<PxRaycastCallback>>("PxRaycastBuffer")
      .function("getNbAnyHits", &PxRaycastBuffer::getNbAnyHits)
      .function("getAnyHit", &PxRaycastBuffer::getAnyHit)
      .function("getTouches", &PxRaycastBuffer::getTouches, allow_raw_pointers())
      .function("getTouch", &PxRaycastBuffer::getTouch)
      .function("getNbTouches", &PxRaycastBuffer::getNbTouches)
      .constructor<>();

  function("allocateRaycastHitBuffers", &allocateRaycastHitBuffers, allow_raw_pointers());

  class_<PxSweepHit, base<PxLocationHit>>("PxSweepHit")
      .constructor<>()
      .function("getShape", optional_override([](PxSweepHit &block) {
                  return block.shape;
                }),
                allow_raw_pointers())
      .function("getActor", optional_override([](PxSweepHit &block) {
                  return block.actor;
                }),
                allow_raw_pointers());
  class_<PxSweepCallback>("PxSweepCallback")
      .property("block", &PxSweepCallback::block)
      .property("hasBlock", &PxSweepCallback::hasBlock)
      .allow_subclass<PxSweepCallbackWrapper>("PxSweepCallbackWrapper", constructor<PxSweepHit *, PxU32>());
  class_<PxSweepBuffer, base<PxSweepCallback>>("PxSweepBuffer")
      .constructor<>();

  function("allocateSweepHitBuffers", &allocateSweepHitBuffers, allow_raw_pointers());

  class_<PxHitFlags>("PxHitFlags")
      .constructor<int>()
      .function("isSet", &PxHitFlags::isSet);

  enum_<PxHitFlag::Enum>("PxHitFlag")
      .value("eDEFAULT", PxHitFlag::Enum::eDEFAULT)
      .value("eMESH_BOTH_SIDES", PxHitFlag::Enum::eMESH_BOTH_SIDES)
      .value("eMESH_MULTIPLE", PxHitFlag::Enum::eMESH_MULTIPLE);

  class_<PxQueryFilterData>("PxQueryFilterData")
      .constructor<>()
      .property("flags", &PxQueryFilterData::flags)
      .function("setFlags", optional_override([](PxQueryFilterData &qf, const PxU16 f) { qf.flags = PxQueryFlags(f); }))
      .function("setWords", optional_override([](PxQueryFilterData &qf, const PxU32 f, const PxU16 i) {
                  if (i == 0)
                    qf.data.word0 = f;
                  else if (i == 1)
                    qf.data.word1 = f;
                  else if (i == 2)
                    qf.data.word2 = f;
                  else if (i == 3)
                    qf.data.word3 = f;
                }))
      .property("data", &PxQueryFilterData::data)
      .property("flags", &PxQueryFilterData::flags);
  class_<PxQueryFlags>("PxQueryFlags")
      .constructor<int>()
      .function("isSet", &PxQueryFlags::isSet);
  enum_<PxQueryFlag::Enum>("PxQueryFlag")
      .value("eSTATIC", PxQueryFlag::Enum::eSTATIC)
      .value("eDYNAMIC", PxQueryFlag::Enum::eDYNAMIC)
      .value("ePREFILTER", PxQueryFlag::Enum::ePREFILTER)
      .value("ePOSTFILTER", PxQueryFlag::Enum::ePOSTFILTER)
      .value("eANY_HIT", PxQueryFlag::Enum::eANY_HIT)
      .value("eNO_BLOCK", PxQueryFlag::Enum::eNO_BLOCK);
  enum_<PxQueryHitType::Enum>("PxQueryHitType")
      .value("eNONE", PxQueryHitType::Enum::eNONE)
      .value("eBLOCK", PxQueryHitType::Enum::eBLOCK)
      .value("eTOUCH", PxQueryHitType::Enum::eTOUCH);

  class_<PxQueryFilterCallback>("PxQueryFilterCallback")
      .allow_subclass<PxQueryFilterCallbackWrapper>("PxQueryFilterCallbackWrapper", constructor<>());
  class_<PxQueryCache>("PxQueryCache");

  enum_<PxCombineMode::Enum>("PxCombineMode")
      .value("eAVERAGE", PxCombineMode::Enum::eAVERAGE)
      .value("eMIN", PxCombineMode::Enum::eMIN)
      .value("eMULTIPLY", PxCombineMode::Enum::eMULTIPLY)
      .value("eMAX", PxCombineMode::Enum::eMAX)
      .value("eN_VALUES", PxCombineMode::Enum::eN_VALUES)
      .value("ePAD_32", PxCombineMode::Enum::ePAD_32);
  class_<PxMaterial>("PxMaterial")
      .function("setDynamicFriction", &PxMaterial::setDynamicFriction)
      .function("setStaticFriction", &PxMaterial::setStaticFriction)
      .function("setRestitution", &PxMaterial::setRestitution)
      .function("getDynamicFriction", &PxMaterial::getDynamicFriction)
      .function("setFrictionCombineMode", &PxMaterial::setFrictionCombineMode)
      .function("setRestitutionCombineMode", &PxMaterial::setRestitutionCombineMode)
      .function("release", &PxMaterial::release);
  register_vector<PxMaterial *>("PxMaterialVector");
  // setMaterials has 'PxMaterial**' as an input, which is not representable with embind
  // This is overrided to use std::vector<PxMaterial*>
  class_<PxShape>("PxShape")
      .function("release", &PxShape::release)
      .function("getFlags", &PxShape::getFlags)
      .function("setFlag", &PxShape::setFlag)
      .function("setLocalPose", &PxShape::setLocalPose)
      .function("setGeometry", &PxShape::setGeometry)
      .function("getBoxGeometry", &PxShape::getBoxGeometry, allow_raw_pointers())
      .function("getSphereGeometry", &PxShape::getSphereGeometry, allow_raw_pointers())
      .function("getPlaneGeometry", &PxShape::getPlaneGeometry, allow_raw_pointers())
      .function("setSimulationFilterData", &PxShape::setSimulationFilterData, allow_raw_pointers())
      .function("getSimulationFilterData", &PxShape::getSimulationFilterData, allow_raw_pointers())
      .function("setQueryFilterData", &PxShape::setQueryFilterData)
      .function("getQueryFilterData", &PxShape::getQueryFilterData, allow_raw_pointers())
      .function("setContactOffset", &PxShape::setContactOffset)
      .function("setRestOffset", &PxShape::setRestOffset)
      .function("setMaterials", optional_override(
                                    [](PxShape &shape, std::vector<PxMaterial *> materials) {
                                      return shape.setMaterials(materials.data(), materials.size());
                                    }))
      .function("getMaterials", &PxShape::getMaterials, allow_raw_pointers())
      .function("getNbMaterials", &PxShape::getNbMaterials, allow_raw_pointers())
      .function("getWorldBounds", optional_override(
                                      [](PxShape &shape, PxRigidActor &actor, float i) {
                                        return PxShapeExt::getWorldBounds(shape, actor, i);
                                      }));

  class_<PxPhysics>("PxPhysics")
      .function("createAggregate", &PxPhysics::createAggregate, allow_raw_pointers())
      .function("createArticulation", &PxPhysics::createArticulation, allow_raw_pointers())
      .function("createArticulationReducedCoordinate", &PxPhysics::createArticulationReducedCoordinate, allow_raw_pointers())
      .function("createBVHStructure", &PxPhysics::createBVHStructure, allow_raw_pointers())
      .function("createConstraint", &PxPhysics::createConstraint, allow_raw_pointers())
      .function("createConvexMesh", &PxPhysics::createConvexMesh, allow_raw_pointers())
      .function("createHeightField", &PxPhysics::createHeightField, allow_raw_pointers())
      .function("createAggregate", &PxPhysics::createAggregate, allow_raw_pointers())
      .function("createMaterial", &PxPhysics::createMaterial, allow_raw_pointers())
      .function("createPruningStructure", &PxPhysics::createPruningStructure, allow_raw_pointers())
      .function("createRigidDynamic", &PxPhysics::createRigidDynamic, allow_raw_pointers())
      .function("createRigidStatic", &PxPhysics::createRigidStatic, allow_raw_pointers())
      .function("createScene", &PxPhysics::createScene, allow_raw_pointers())
      .function("createShape", select_overload<PxShape *(const PxGeometry &, const PxMaterial &, bool, PxShapeFlags)>(&PxPhysics::createShape), allow_raw_pointers())
      .function("createTriangleMesh", &PxPhysics::createTriangleMesh, allow_raw_pointers())
      .function("getBVHStructures", &PxPhysics::getBVHStructures, allow_raw_pointers())
      .function("getConvexMeshes", &PxPhysics::getConvexMeshes, allow_raw_pointers())
      // .function("getFoundation", &PxPhysics::getFoundation, allow_raw_pointers())
      .function("getHeightFields", &PxPhysics::getHeightFields, allow_raw_pointers())
      .function("getMaterials", &PxPhysics::getMaterials, allow_raw_pointers())
      .function("getNbConvexMeshes", &PxPhysics::getNbConvexMeshes, allow_raw_pointers())
      .function("getNbHeightFields", &PxPhysics::getNbHeightFields, allow_raw_pointers())
      .function("getNbMaterials", &PxPhysics::getNbMaterials, allow_raw_pointers())
      .function("getNbScenes", &PxPhysics::getNbScenes, allow_raw_pointers())
      .function("getNbShapes", &PxPhysics::getNbShapes, allow_raw_pointers())
      .function("getNbTriangleMeshes", &PxPhysics::getNbTriangleMeshes, allow_raw_pointers())
      // .function("getPhysicsInsertionCallback", &PxPhysics::getPhysicsInsertionCallback, allow_raw_pointers())
      .function("getScenes", &PxPhysics::getScenes, allow_raw_pointers())
      .function("getShapes", &PxPhysics::getShapes, allow_raw_pointers())
      .function("getTolerancesScale", &PxPhysics::getTolerancesScale, allow_raw_pointers())
      .function("getTriangleMeshes", &PxPhysics::getTriangleMeshes, allow_raw_pointers())
      .function("registerDeletionListener", &PxPhysics::registerDeletionListener, allow_raw_pointers())
      .function("registerDeletionListenerObjects", &PxPhysics::registerDeletionListenerObjects, allow_raw_pointers())
      .function("release", &PxPhysics::release)
      .function("unregisterDeletionListener", &PxPhysics::unregisterDeletionListener, allow_raw_pointers())
      .function("unregisterDeletionListenerObjects", &PxPhysics::unregisterDeletionListenerObjects, allow_raw_pointers());

  class_<PxPhysicsInsertionCallback>("PxPhysicsInsertionCallback");
  class_<PxPvd>("PxPvd");

  class_<PxShapeFlags>("PxShapeFlags")
      .constructor<int>()
      .function("isSet", &PxShapeFlags::isSet);

  enum_<PxShapeFlag::Enum>("PxShapeFlag")
      .value("eSIMULATION_SHAPE", PxShapeFlag::Enum::eSIMULATION_SHAPE)
      .value("eSCENE_QUERY_SHAPE", PxShapeFlag::Enum::eSCENE_QUERY_SHAPE)
      .value("eTRIGGER_SHAPE", PxShapeFlag::Enum::eTRIGGER_SHAPE)
      .value("eVISUALIZATION", PxShapeFlag::Enum::eVISUALIZATION);

  enum_<PxErrorCode::Enum>("PxErrorCode")
      .value("eNO_ERROR", PxErrorCode::Enum::eNO_ERROR)
      .value("eDEBUG_INFO", PxErrorCode::Enum::eDEBUG_INFO)
      .value("eDEBUG_WARNING", PxErrorCode::Enum::eDEBUG_WARNING)
      .value("eINVALID_PARAMETER", PxErrorCode::Enum::eINVALID_PARAMETER)
      .value("eINVALID_OPERATION", PxErrorCode::Enum::eINVALID_OPERATION)
      .value("eOUT_OF_MEMORY", PxErrorCode::Enum::eOUT_OF_MEMORY)
      .value("eINTERNAL_ERROR", PxErrorCode::Enum::eINTERNAL_ERROR)
      .value("eABORT", PxErrorCode::Enum::eABORT)
      .value("ePERF_WARNING", PxErrorCode::Enum::ePERF_WARNING)
      .value("eMASK_ALL", PxErrorCode::Enum::eMASK_ALL);

  class_<PxErrorCallback>("PxErrorCallback")
      .function("reportError", &PxErrorCallback::reportError, allow_raw_pointers());

  class_<PxDefaultErrorCallback, base<PxErrorCallback>>("PxDefaultErrorCallback")
      .constructor<>()
      .function("reportError", &PxDefaultErrorCallback::reportError, allow_raw_pointers());

  class_<PxBitAndByte>("PxBitAndByte")
      .function("isBitSet", &PxBitAndByte::isBitSet)
      .function("setBit", &PxBitAndByte::setBit)
      .function("clearBit", &PxBitAndByte::clearBit);

  class_<PxHeightFieldSample>("PxHeightFieldSample")
      .constructor()
      .property("height", &PxHeightFieldSample::height)
      .property("materialIndex0", &PxHeightFieldSample::materialIndex0)
      .property("materialIndex1", &PxHeightFieldSample::materialIndex1);
  register_vector<PxHeightFieldSample>("PxHeightFieldSampleVector");

  register_vector<PxU16>("PxU16Vector");

  class_<PxCooking>("PxCooking")
      // .function("computeHullPolygons", &PxCooking::computeHullPolygons, allow_raw_pointers())
      .function("cookBVHStructure", &PxCooking::cookBVHStructure, allow_raw_pointers())
      .function("cookConvexMesh", &PxCooking::cookConvexMesh, allow_raw_pointers())
      .function("cookHeightField", &PxCooking::cookHeightField, allow_raw_pointers())
      .function("cookTriangleMesh", &PxCooking::cookTriangleMesh, allow_raw_pointers())
      .function("createBVHStructure", &PxCooking::createBVHStructure, allow_raw_pointers())
      .function("createConvexMeshFromVectors", optional_override([](PxCooking &cooking, std::vector<PxVec3> &vertices, PxPhysics &physics) {
                  return createConvexMeshFromVectors(vertices, cooking, physics);
                }),
                allow_raw_pointers())
      .function("createConvexMesh", optional_override([](PxCooking &cooking, int vertices, PxU32 vertCount, PxPhysics &physics) {
                  return createConvexMesh(vertices, vertCount, cooking, physics);
                }),
                allow_raw_pointers())
      .function("createTriMesh", optional_override([](PxCooking &cooking, int vertices, PxU32 vertCount, int indices, PxU32 indexCount, bool isU16, PxPhysics &physics) {
                  return createTriMesh(vertices, vertCount, indices, indexCount, isU16, cooking, physics);
                }),
                allow_raw_pointers())
      .function("createTriMeshExt", optional_override([](PxCooking &cooking, std::vector<PxVec3> &vertices, std::vector<PxU16> &indices, PxPhysics &physics) {
                  return createTriMeshExt(vertices, indices, cooking, physics);
                }),
                allow_raw_pointers())
      .function("createHeightFieldExt", optional_override([](PxCooking &cooking, PxU32 numCols, PxU32 numRows, std::vector<PxHeightFieldSample> &samples, PxPhysics &physics) {
                  return createHeightFieldExt(numCols, numRows, samples, cooking, physics);
                }),
                allow_raw_pointers())
      // .function("createHeightField", &PxCooking::createHeightField, allow_raw_pointers())
      // .function("createTriangleMesh", &PxCooking::createTriangleMesh, allow_raw_pointers())
      .function("getParams", &PxCooking::getParams)
      .function("platformMismatch", &PxCooking::platformMismatch)
      .function("release", &PxCooking::release)
      .function("setParams", &PxCooking::setParams)
      .function("validateConvexMesh", &PxCooking::validateConvexMesh)
      .function("validateTriangleMesh", &PxCooking::validateTriangleMesh);

  // these are problematic, so we have our own cooking create mesh functions
  // class_<PxStridedData>("PxStridedData")
  //     .constructor<>();
  // .function("at", &PxStridedData::at)
  // .property("data", &PxStridedData::data, allow_raw_pointers())
  // .property("stride", &PxStridedData::stride);

  // class_<PxBoundedData, base<PxStridedData>>("PxBoundedData");
  // .property("data", &PxBoundedData::data, allow_raw_pointers())
  // .property("stride", &PxBoundedData::stride)
  // .property("count", &PxBoundedData::count);

  class_<PxConvexMeshDesc>("PxConvexMeshDesc")
      .constructor<>()
      .property("points", &PxConvexMeshDesc::points)
      .property("polygons", &PxConvexMeshDesc::polygons)
      .property("indices", &PxConvexMeshDesc::indices)
      .property("flags", &PxConvexMeshDesc::flags)
      .property("vertexLimit", &PxConvexMeshDesc::vertexLimit)
      .property("quantizedCount", &PxConvexMeshDesc::quantizedCount)
      .function("setToDefault", &PxConvexMeshDesc::setToDefault)
      .function("isValid", &PxConvexMeshDesc::isValid);

  class_<PxConvexFlags>("PxConvexFlags")
      .constructor<int>()
      .function("isSet", &PxConvexFlags::isSet);
  enum_<PxConvexFlag::Enum>("PxConvexFlag")
      .value("e16_BIT_INDICES", PxConvexFlag::Enum::e16_BIT_INDICES)
      .value("eCOMPUTE_CONVEX", PxConvexFlag::Enum::eCOMPUTE_CONVEX)
      .value("eCHECK_ZERO_AREA_TRIANGLES", PxConvexFlag::Enum::eCHECK_ZERO_AREA_TRIANGLES)
      .value("eQUANTIZE_INPUT", PxConvexFlag::Enum::eQUANTIZE_INPUT)
      .value("eDISABLE_MESH_VALIDATION", PxConvexFlag::Enum::eDISABLE_MESH_VALIDATION)
      .value("ePLANE_SHIFTING", PxConvexFlag::Enum::ePLANE_SHIFTING)
      .value("eFAST_INERTIA_COMPUTATION", PxConvexFlag::Enum::eFAST_INERTIA_COMPUTATION)
      .value("eGPU_COMPATIBLE", PxConvexFlag::Enum::eGPU_COMPATIBLE)
      .value("eSHIFT_VERTICES", PxConvexFlag::Enum::eSHIFT_VERTICES);

  enum_<PxConvexMeshCookingResult::Enum>("PxConvexMeshCookingResult")
      .value("eSUCCESS", PxConvexMeshCookingResult::Enum::eSUCCESS)
      .value("eZERO_AREA_TEST_FAILED", PxConvexMeshCookingResult::Enum::eZERO_AREA_TEST_FAILED)
      .value("ePOLYGONS_LIMIT_REACHED", PxConvexMeshCookingResult::Enum::ePOLYGONS_LIMIT_REACHED)
      .value("eFAILURE", PxConvexMeshCookingResult::Enum::eFAILURE);

  class_<PxCookingParams>("PxCookingParams")
      .constructor<PxTolerancesScale>();
  class_<PxCpuDispatcher>("PxCpuDispatcher");
  class_<PxBVHStructure>("PxBVHStructure");
  class_<PxBaseTask>("PxBaseTask");
  class_<PxDefaultCpuDispatcher, base<PxCpuDispatcher>>("PxDefaultCpuDispatcher");

  class_<PxFilterData>("PxFilterData")
      .constructor<PxU32, PxU32, PxU32, PxU32>()
      .property("word0", &PxFilterData::word0)
      .property("word1", &PxFilterData::word1)
      .property("word2", &PxFilterData::word2)
      .property("word3", &PxFilterData::word3);
  // todo: figure out if this should be a class or val obj
  // value_object<PxFilterData>("PxFilterData")
  //   .field("word0", &PxFilterData::word0)
  //   .field("word1", &PxFilterData::word1)
  //   .field("word2", &PxFilterData::word2)
  //   .field("word3", &PxFilterData::word3);

  class_<PxPairFlags>("PxPairFlags")
      .constructor<int>()
      .function("isSet", &PxPairFlags::isSet);

  class_<PxFilterFlags>("PxFilterFlags")
      .constructor<int>()
      .function("isSet", &PxFilterFlags::isSet);

  enum_<PxPairFlag::Enum>("PxPairFlag");
  enum_<PxFilterFlag::Enum>("PxFilterFlag");

  class_<PxActor>("PxActor")
      .function("setActorFlag", &PxActor::setActorFlag)
      .function("setActorFlags", &PxActor::setActorFlags)
      .function("getActorFlags", &PxActor::getActorFlags)
      .function("release", &PxActor::release);

  class_<PxActorFlags>("PxActorFlags")
      .constructor<int>()
      .function("isSet", &PxActorFlags::isSet);

  enum_<PxActorFlag::Enum>("PxActorFlag")
      .value("eVISUALIZATION", PxActorFlag::Enum::eVISUALIZATION)
      .value("eDISABLE_GRAVITY", PxActorFlag::Enum::eDISABLE_GRAVITY)
      .value("eSEND_SLEEP_NOTIFIES", PxActorFlag::Enum::eSEND_SLEEP_NOTIFIES)
      .value("eDISABLE_SIMULATION", PxActorFlag::Enum::eDISABLE_SIMULATION);

  register_vector<PxShape *>("PxShapeVector");
  class_<PxRigidActor, base<PxActor>>("PxRigidActor")
      .function("attachShape", &PxRigidActor::attachShape)
      .function("detachShape", &PxRigidActor::detachShape)
      .function("getShapes", optional_override([](PxRigidActor &actor) {
                  PxU32 numShapes = actor.getNbShapes();
                  PxShape *shapes = NULL;
                  actor.getShapes(&shapes, numShapes);
                  return shapes;
                }),
                allow_raw_pointers())
      .function("getGlobalPose", &PxRigidActor::getGlobalPose, allow_raw_pointers())
      .function("setGlobalPose", &PxRigidActor::setGlobalPose, allow_raw_pointers());

  register_vector<PxReal>("VectorPxReal");

  class_<PxRigidBody, base<PxRigidActor>>("PxRigidBody")
      .function("setAngularDamping", &PxRigidBody::setAngularDamping)
      .function("getAngularDamping", &PxRigidBody::getAngularDamping)
      .function("setLinearDamping", &PxRigidBody::setLinearDamping)
      .function("getLinearDamping", &PxRigidBody::getLinearDamping)
      .function("setAngularVelocity", &PxRigidBody::setAngularVelocity)
      .function("getAngularVelocity", &PxRigidBody::getAngularVelocity)
      .function("setMass", &PxRigidBody::setMass)
      .function("getMass", &PxRigidBody::getMass)
      .function("setCMassLocalPose", &PxRigidBody::setCMassLocalPose, allow_raw_pointers())
      .function("setLinearVelocity", &PxRigidBody::setLinearVelocity)
      .function("getLinearVelocity", &PxRigidBody::getLinearVelocity)
      .function("setMaxContactImpulse", &PxRigidBody::setMaxContactImpulse)
      .function("clearForce", &PxRigidBody::clearForce)
      .function("clearTorque", &PxRigidBody::clearTorque)
      .function("addForce", optional_override(
                                     [](PxRigidBody &body, const PxVec3 &force) {
                                       body.addForce(force, PxForceMode::eFORCE, true);
                                     }))
      .function("addForceAtPos", optional_override(
                                     [](PxRigidBody &body, const PxVec3 &force, const PxVec3 &pos) {
                                       PxRigidBodyExt::addForceAtPos(body, force, pos, PxForceMode::eFORCE, true);
                                     }))
      .function("addForceAtLocalPos", optional_override(
                                          [](PxRigidBody &body, const PxVec3 &force, const PxVec3 &pos) {
                                            PxRigidBodyExt::addForceAtLocalPos(body, force, pos, PxForceMode::eFORCE, true);
                                          }))
      .function("addLocalForceAtLocalPos", optional_override(
                                               [](PxRigidBody &body, const PxVec3 &force, const PxVec3 &pos) {
                                                 PxRigidBodyExt::addLocalForceAtLocalPos(body, force, pos, PxForceMode::eFORCE, true);
                                               }))
      .function("addImpulseAtPos", optional_override(
                                       [](PxRigidBody &body, const PxVec3 &impulse, const PxVec3 &pos) {
                                         PxRigidBodyExt::addForceAtPos(body, impulse, pos, PxForceMode::eIMPULSE, true);
                                       }))
      .function("addImpulseAtLocalPos", optional_override(
                                            [](PxRigidBody &body, const PxVec3 &impulse, const PxVec3 &pos) {
                                              PxRigidBodyExt::addForceAtLocalPos(body, impulse, pos, PxForceMode::eIMPULSE, true);
                                            }))
      .function("addLocalImpulseAtLocalPos", optional_override(
                                                 [](PxRigidBody &body, const PxVec3 &impulse, const PxVec3 &pos) {
                                                   PxRigidBodyExt::addLocalForceAtLocalPos(body, impulse, pos, PxForceMode::eIMPULSE, true);
                                                 }))
      .function("applyImpulse", optional_override(
                                    [](PxRigidBody &body, const PxVec3 &impulse, const PxVec3 &pos) {
                                      if (!impulse.isZero())
                                      {
                                        const PxVec3 torque = pos.cross(impulse);
                                        body.addForce(impulse, PxForceMode::eIMPULSE, true);
                                        if (!torque.isZero())
                                          body.addTorque(torque, PxForceMode::eIMPULSE, true);
                                      }
                                    }))
      .function("applyLocalImpulse", optional_override(
                                         [](PxRigidBody &body, const PxVec3 &impulse, const PxVec3 &pos) {
                                           if (!impulse.isZero())
                                           {
                                             // transform vector to world frame
                                             const PxTransform bodyPose = body.getGlobalPose();
                                             const PxVec3 worldImpulse = bodyPose.rotate(impulse);
                                             const PxVec3 worldPos = bodyPose.rotate(pos);
                                             body.addForce(worldImpulse, PxForceMode::eIMPULSE, true);
                                             const PxVec3 torque = worldPos.cross(worldImpulse);
                                             if (!torque.isZero())
                                               body.addTorque(torque, PxForceMode::eIMPULSE, true);
                                           }
                                         }))
      .function("applyForce", optional_override(
                                  [](PxRigidBody &body, const PxVec3 &force, const PxVec3 &pos) {
                                    if (!force.isZero())
                                    {
                                      body.addForce(force, PxForceMode::eFORCE, true);
                                      const PxVec3 torque = pos.cross(force);
                                      if (!torque.isZero())
                                        body.addTorque(torque, PxForceMode::eFORCE, true);
                                    }
                                  }))
      .function("applyLocalForce", optional_override(
                                       [](PxRigidBody &body, const PxVec3 &force, const PxVec3 &pos) {
                                         if (!force.isZero())
                                         {
                                           // transform vector to world frame
                                           const PxTransform bodyPose = body.getGlobalPose();
                                           const PxVec3 worldForce = bodyPose.rotate(force);
                                           const PxVec3 worldPos = bodyPose.rotate(pos);
                                           body.addForce(worldForce, PxForceMode::eFORCE, true);
                                           const PxVec3 torque = worldPos.cross(worldForce);
                                           if (!torque.isZero())
                                             body.addTorque(torque, PxForceMode::eFORCE, true);
                                         }
                                       }))
      .function("addTorque", optional_override(
                                 [](PxRigidBody &body, const PxVec3 &torque) {
                                   body.addTorque(torque, PxForceMode::eFORCE, true);
                                 }))
      .function("setRigidBodyFlag", &PxRigidBody::setRigidBodyFlag)
      .function("setRigidBodyFlags", &PxRigidBody::setRigidBodyFlags)
      .function("getRigidBodyFlags", &PxRigidBody::getRigidBodyFlags) //optional_override(
                                                                      //  [](PxRigidBody &body) {
                                                                      //    return (bool)(body.getRigidBodyFlags() & PxRigidBodyFlag::eKINEMATIC);
                                                                      //  }))
      .function("setMassAndUpdateInertia", optional_override(
                                               [](PxRigidBody &body, PxReal mass) {
                                                 return PxRigidBodyExt::setMassAndUpdateInertia(body, mass, NULL, false);
                                               }))
      .function("setMassSpaceInertiaTensor", &PxRigidBody::setMassSpaceInertiaTensor)
      .function("updateMassAndInertia", optional_override(
                                            [](PxRigidBody &body, std::vector<PxReal> shapeDensities) {
                                              return PxRigidBodyExt::updateMassAndInertia(body, &shapeDensities[0], shapeDensities.size());
                                            }));

  class_<PxRigidBodyFlags>("PxRigidBodyFlags")
      .constructor<int>()
      .function("isSet", &PxRigidBodyFlags::isSet);
  enum_<PxRigidBodyFlag::Enum>("PxRigidBodyFlag")
      .value("eKINEMATIC", PxRigidBodyFlag::Enum::eKINEMATIC)
      .value("eUSE_KINEMATIC_TARGET_FOR_SCENE_QUERIES", PxRigidBodyFlag::Enum::eUSE_KINEMATIC_TARGET_FOR_SCENE_QUERIES)
      .value("eENABLE_CCD", PxRigidBodyFlag::Enum::eENABLE_CCD)
      .value("eENABLE_CCD_FRICTION", PxRigidBodyFlag::Enum::eENABLE_CCD_FRICTION)
      .value("eENABLE_POSE_INTEGRATION_PREVIEW", PxRigidBodyFlag::Enum::eENABLE_POSE_INTEGRATION_PREVIEW)
      .value("eENABLE_SPECULATIVE_CCD", PxRigidBodyFlag::Enum::eENABLE_SPECULATIVE_CCD)
      .value("eENABLE_CCD_MAX_CONTACT_IMPULSE", PxRigidBodyFlag::Enum::eENABLE_CCD_MAX_CONTACT_IMPULSE)
      .value("eRETAIN_ACCELERATIONS", PxRigidBodyFlag::Enum::eRETAIN_ACCELERATIONS);

  class_<PxRigidStatic, base<PxRigidActor>>("PxRigidStatic");
  class_<PxRigidDynamic, base<PxRigidBody>>("PxRigidDynamic")
      .function("wakeUp", &PxRigidDynamic::wakeUp)
      .function("putToSleep", &PxRigidDynamic::putToSleep)
      .function("isSleeping", &PxRigidDynamic::isSleeping)
      .function("setWakeCounter", &PxRigidDynamic::setWakeCounter)
      .function("getWakeCounter", &PxRigidDynamic::getWakeCounter)
      .function("setSleepThreshold", &PxRigidDynamic::setSleepThreshold)
      .function("getSleepThreshold", &PxRigidDynamic::getSleepThreshold)
      .function("setKinematicTarget", &PxRigidDynamic::setKinematicTarget)
      .function("setRigidDynamicLockFlag", &PxRigidDynamic::setRigidDynamicLockFlag)
      .function("setRigidDynamicLockFlags", &PxRigidDynamic::setRigidDynamicLockFlags)
      .function("getRigidDynamicLockFlags", &PxRigidDynamic::getRigidDynamicLockFlags)
      .function("setSolverIterationCounts", &PxRigidDynamic::setSolverIterationCounts);
  class_<PxRigidDynamicLockFlags>("PxRigidDynamicLockFlags")
      .constructor<int>()
      .function("isSet", &PxRigidDynamicLockFlags::isSet);
  enum_<PxRigidDynamicLockFlag::Enum>("PxRigidDynamicLockFlag")
      .value("eLOCK_LINEAR_X", PxRigidDynamicLockFlag::Enum::eLOCK_LINEAR_X)
      .value("eLOCK_LINEAR_Y", PxRigidDynamicLockFlag::Enum::eLOCK_LINEAR_Y)
      .value("eLOCK_LINEAR_Z", PxRigidDynamicLockFlag::Enum::eLOCK_LINEAR_Z)
      .value("eLOCK_ANGULAR_X", PxRigidDynamicLockFlag::Enum::eLOCK_ANGULAR_X)
      .value("eLOCK_ANGULAR_Y", PxRigidDynamicLockFlag::Enum::eLOCK_ANGULAR_Y)
      .value("eLOCK_ANGULAR_Z", PxRigidDynamicLockFlag::Enum::eLOCK_ANGULAR_Z);

  /** Geometry **/
  class_<PxGeometry>("PxGeometry");

  class_<PxBoxGeometry, base<PxGeometry>>("PxBoxGeometry")
      .constructor<>()
      .constructor<float, float, float>()
      .function("isValid", &PxBoxGeometry::isValid)
      .function("setHalfExtents", optional_override([](PxBoxGeometry &geo, PxVec3 hf) { geo.halfExtents = hf; }))
      .property("halfExtents", &PxBoxGeometry::halfExtents);

  class_<PxSphereGeometry, base<PxGeometry>>("PxSphereGeometry")
      .constructor<>()
      .constructor<float>()
      .function("isValid", &PxSphereGeometry::isValid)
      .function("setRadius", optional_override([](PxSphereGeometry &geo, PxReal r) { geo.radius = r; }));

  class_<PxCapsuleGeometry, base<PxGeometry>>("PxCapsuleGeometry")
      .constructor<float, float>()
      .function("isValid", &PxCapsuleGeometry::isValid)
      .function("setRadius", optional_override([](PxCapsuleGeometry &geo, PxReal r) { geo.radius = r; }))
      .function("setHalfHeight", optional_override([](PxCapsuleGeometry &geo, PxReal hf) { geo.halfHeight = hf; }));

  class_<PxTriangleMesh>("PxTriangleMesh")
      .function("release", &PxTriangleMesh::release);

  class_<PxTriangleMeshGeometry, base<PxGeometry>>("PxTriangleMeshGeometry")
      .constructor<>()
      .constructor<PxTriangleMesh *, const PxMeshScale &, PxMeshGeometryFlags>()
      .function("setScale", optional_override([](PxTriangleMeshGeometry &geo, PxMeshScale &scale) {
                  geo.scale.scale = scale.scale;
                  geo.scale.rotation = scale.rotation;
                }))
      .function("isValid", &PxTriangleMeshGeometry::isValid);

  class_<PxMeshGeometryFlags>("PxMeshGeometryFlags")
      .constructor<int>()
      .function("isSet", &PxMeshGeometryFlags::isSet);
  enum_<PxMeshGeometryFlag::Enum>("PxMeshGeometryFlag")
      .value("eDOUBLE_SIDED", PxMeshGeometryFlag::Enum::eDOUBLE_SIDED);

  class_<PxPlaneGeometry, base<PxGeometry>>("PxPlaneGeometry")
      .constructor<>()
      .function("isValid", &PxPlaneGeometry::isValid);

  class_<PxConvexMesh>("PxConvexMesh")
      .function("release", &PxConvexMesh::release);
  class_<PxConvexMeshGeometry, base<PxGeometry>>("PxConvexMeshGeometry")
      .constructor<PxConvexMesh *, const PxMeshScale &, PxConvexMeshGeometryFlags>()
      .function("setScale", optional_override([](PxConvexMeshGeometry &geo, PxMeshScale &scale) {
                  geo.scale.scale = scale.scale;
                  geo.scale.rotation = scale.rotation;
                }))
      .function("isValid", &PxConvexMeshGeometry::isValid);

  class_<PxMeshScale>("PxMeshScale")
      .constructor<const PxVec3 &, const PxQuat &>()
      .function("setScale", optional_override([](PxMeshScale &ms, PxVec3 &scale) { ms.scale = scale; }))
      .function("setRotation", optional_override([](PxMeshScale &ms, PxQuat &rot) { ms.rotation = rot; }));

  class_<PxConvexMeshGeometryFlags>("PxConvexMeshGeometryFlags")
      .constructor<int>()
      .function("isSet", &PxConvexMeshGeometryFlags::isSet);
  enum_<PxConvexMeshGeometryFlag::Enum>("PxConvexMeshGeometryFlag")
      .value("eTIGHT_BOUNDS", PxConvexMeshGeometryFlag::Enum::eTIGHT_BOUNDS);

  class_<PxHeightField>("PxHeightField")
      .function("release", &PxHeightField::release);
  class_<PxHeightFieldGeometry, base<PxGeometry>>("PxHeightFieldGeometry")
      .constructor<PxHeightField *, PxMeshGeometryFlags, PxReal, PxReal, PxReal>()
      .function("isValid", &PxHeightFieldGeometry::isValid);

  /** End Geometry **/

  class_<PxPlane>("PxPlane")
      .constructor<float, float, float, float>();

  /** Character Controller **/

  function("PxCreateControllerManager", &PxCreateControllerManager, allow_raw_pointers());

  enum_<PxControllerShapeType::Enum>("PxControllerShapeType")
      .value("eBOX", PxControllerShapeType::Enum::eBOX)
      .value("eCAPSULE", PxControllerShapeType::Enum::eCAPSULE)
      .value("eFORCE_DWORD", PxControllerShapeType::Enum::eFORCE_DWORD);

  enum_<PxCapsuleClimbingMode::Enum>("PxCapsuleClimbingMode")
      .value("eEASY", PxCapsuleClimbingMode::Enum::eEASY)
      .value("eCONSTRAINED", PxCapsuleClimbingMode::Enum::eCONSTRAINED)
      .value("eLAST", PxCapsuleClimbingMode::Enum::eLAST);

  enum_<PxControllerNonWalkableMode::Enum>("PxControllerNonWalkableMode")
      .value("ePREVENT_CLIMBING", PxControllerNonWalkableMode::Enum::ePREVENT_CLIMBING)
      .value("ePREVENT_CLIMBING_AND_FORCE_SLIDING", PxControllerNonWalkableMode::Enum::ePREVENT_CLIMBING_AND_FORCE_SLIDING);

  class_<PxControllerManager>("PxControllerManager")
      // constructor weirdness, handle types manually
      // .function("createController", &PxControllerManager::createController, allow_raw_pointers())
      .function("createCapsuleController", optional_override([](PxControllerManager &ctrlMng, PxControllerDesc &desc) {
                  return (PxCapsuleController *)ctrlMng.createController(desc);
                }),
                allow_raw_pointers())
      .function("createBoxController", //&PxControllerManager::createController, allow_raw_pointers())
                optional_override([](PxControllerManager &ctrlMng, PxControllerDesc &desc) {
                  return (PxBoxController *)ctrlMng.createController(desc);
                }),
                allow_raw_pointers())
      .function("setTessellation", &PxControllerManager::setTessellation)
      .function("setOverlapRecoveryModule", &PxControllerManager::setOverlapRecoveryModule)
      .function("setPreciseSweeps", &PxControllerManager::setPreciseSweeps)
      .function("setPreventVerticalSlidingAgainstCeiling", &PxControllerManager::setPreventVerticalSlidingAgainstCeiling)
      .function("shiftOrigin", &PxControllerManager::shiftOrigin);

  class_<PxController>("PxController")
      .function("release", &PxController::release)
      .function("resize", &PxController::resize)
      .function("move", &PxController::move, allow_raw_pointers())
      .function("getActor", optional_override([](PxController &controller) {
                  return controller.getActor();
                }),
                allow_raw_pointers())
      .function("setPosition", &PxController::setPosition)
      .function("getPosition", &PxController::getPosition)
      .function("setFootPosition", &PxController::setFootPosition)
      .function("getFootPosition", &PxController::getFootPosition)
      .function("setSimulationFilterData", optional_override(
                                               [](PxController &ctrl, PxFilterData &data) {
                                                 PxRigidDynamic *actor = ctrl.getActor();
                                                 PxShape *shape;
                                                 actor->getShapes(&shape, 1);
                                                 shape->setSimulationFilterData(data);
                                                 return;
                                               }));

  class_<PxCapsuleController, base<PxController>>("PxCapsuleController")
      .function("getRadius", &PxCapsuleController::getRadius)
      .function("setRadius", &PxCapsuleController::setRadius)
      .function("getHeight", &PxCapsuleController::getHeight)
      .function("setHeight", &PxCapsuleController::setHeight)
      .function("getClimbingMode", &PxCapsuleController::getClimbingMode)
      .function("setClimbingMode", &PxCapsuleController::setClimbingMode);

  class_<PxBoxController, base<PxController>>("PxBoxController")
      .function("getHalfForwardExtent", &PxBoxController::getHalfForwardExtent)
      .function("getHalfHeight", &PxBoxController::getHalfHeight)
      .function("getHalfSideExtent", &PxBoxController::getHalfSideExtent)
      .function("setHalfForwardExtent", &PxBoxController::setHalfForwardExtent)
      .function("setHalfHeight", &PxBoxController::setHalfHeight)
      .function("setHalfSideExtent", &PxBoxController::setHalfSideExtent);

  class_<PxControllerDesc>("PxControllerDesc")
      .function("isValid", &PxControllerDesc::isValid)
      .function("getType", &PxControllerDesc::getType)
      .property("position", &PxControllerDesc::position)
      .property("upDirection", &PxControllerDesc::upDirection)
      .property("slopeLimit", &PxControllerDesc::slopeLimit)
      .property("invisibleWallHeight", &PxControllerDesc::invisibleWallHeight)
      .property("maxJumpHeight", &PxControllerDesc::maxJumpHeight)
      .property("contactOffset", &PxControllerDesc::contactOffset)
      .property("stepOffset", &PxControllerDesc::stepOffset)
      .property("density", &PxControllerDesc::density)
      .property("scaleCoeff", &PxControllerDesc::scaleCoeff)
      .property("volumeGrowth", &PxControllerDesc::volumeGrowth)
      .property("nonWalkableMode", &PxControllerDesc::nonWalkableMode)
      .function("setReportCallback", optional_override([](PxControllerDesc &desc, PxUserControllerHitReport *callback) {
                  return desc.reportCallback = callback;
                }),
                allow_raw_pointers())
      // `material` property doesn't work as-is so we create a setMaterial function
      .function("setMaterial", optional_override([](PxControllerDesc &desc, PxMaterial *material) {
                  return desc.material = material;
                }),
                allow_raw_pointers());

  class_<PxControllerHit>("PxControllerHit")
      .constructor<>()
      .function("getWorldPos", optional_override([](PxControllerHit &hit) {
                  return hit.worldPos;
                }),
                allow_raw_pointers())
      .function("getWorldNormal", optional_override([](PxControllerHit &hit) {
                  return hit.worldNormal;
                }),
                allow_raw_pointers())
      .function("getLength", optional_override([](PxControllerHit &hit) {
                  return hit.length;
                }),
                allow_raw_pointers())
      .function("getDirection", optional_override([](PxControllerHit &hit) {
                  return hit.dir;
                }),
                allow_raw_pointers());

  class_<PxControllerShapeHit, base<PxControllerHit>>("PxControllerShapeHit")
      .constructor<>()
      .function("getController", optional_override([](PxControllerShapeHit &hit) {
                  return hit.controller;
                }),
                allow_raw_pointers())
      .function("getShape", optional_override([](PxControllerShapeHit &hit) {
                  return hit.shape;
                }),
                allow_raw_pointers())
      .function("getActor", optional_override([](PxControllerShapeHit &hit) {
                  return hit.actor;
                }),
                allow_raw_pointers())
      .function("getTriangleIndex", optional_override([](PxControllerShapeHit &hit) {
                  return hit.triangleIndex;
                }),
                allow_raw_pointers());

  class_<PxControllersHit, base<PxControllerHit>>("PxControllersHit")
      .constructor<>()
      .function("getOther", optional_override([](PxControllersHit &hit) {
                  return hit.other;
                }),
                allow_raw_pointers());

  class_<PxControllerObstacleHit, base<PxControllerHit>>("PxControllerObstacleHit")
      .constructor<>()
      .function("getUserData", optional_override([](PxControllerObstacleHit &hit) {
                  return hit.userData;
                }),
                allow_raw_pointers());

  class_<PxCapsuleControllerDesc, base<PxControllerDesc>>("PxCapsuleControllerDesc")
      .constructor<>()
      .function("isValid", &PxCapsuleControllerDesc::isValid)
      .property("radius", &PxCapsuleControllerDesc::radius)
      .property("height", &PxCapsuleControllerDesc::height)
      .property("climbingMode", &PxCapsuleControllerDesc::climbingMode);

  class_<PxBoxControllerDesc, base<PxControllerDesc>>("PxBoxControllerDesc")
      .constructor<>()
      .property("halfForwardExtent", &PxBoxControllerDesc::halfForwardExtent)
      .property("halfHeight", &PxBoxControllerDesc::halfHeight)
      .property("halfSideExtent", &PxBoxControllerDesc::halfSideExtent);

  class_<PxObstacleContext>("PxObstacleContext");

  class_<PxControllerFilters>("PxControllerFilters")
      .constructor<const PxFilterData *, PxQueryFilterCallback *, PxControllerFilterCallback *>()
      .property("mFilterFlags", &PxControllerFilters::mFilterFlags);

  class_<PxControllerFilterCallback>("ControllerFilterCallback");

  class_<PxControllerCollisionFlags>("ControllerCollisionFlags")
      .constructor<PxU32>()
      .function("isSet", &PxControllerCollisionFlags::isSet);

  enum_<PxControllerCollisionFlag::Enum>("PxControllerCollisionFlag")
      .value("eCOLLISION_SIDES", PxControllerCollisionFlag::Enum::eCOLLISION_SIDES)
      .value("eCOLLISION_UP", PxControllerCollisionFlag::Enum::eCOLLISION_UP)
      .value("eCOLLISION_DOWN", PxControllerCollisionFlag::Enum::eCOLLISION_DOWN);
}

namespace emscripten
{
  namespace internal
  {
    // Physx uses private destructors all over the place for its own reference counting
    // embind doesn't deal with this well, so we have to override the destructors to keep them private
    // in the bindings
    // See: https://github.com/emscripten-core/emscripten/issues/5587
    template <>
    void raw_destructor<PxFoundation>(PxFoundation *){};
    template <>
    void raw_destructor<PxPvd>(PxPvd *){};
    template <>
    void raw_destructor<PxPvdTransport>(PxPvdTransport *){};
    template <>
    void raw_destructor<PxMaterial>(PxMaterial *){};
    template <>
    void raw_destructor<PxScene>(PxScene *){};
    template <>
    void raw_destructor<PxRigidDynamic>(PxRigidDynamic *){};
    template <>
    void raw_destructor<PxRigidBody>(PxRigidBody *){};
    template <>
    void raw_destructor<PxRigidActor>(PxRigidActor *){};
    template <>
    void raw_destructor<PxActor>(PxActor *){};
    template <>
    void raw_destructor<PxShape>(PxShape *){};
    template <>
    void raw_destructor<PxBVHStructure>(PxBVHStructure *){};
    template <>
    void raw_destructor<PxRigidStatic>(PxRigidStatic *){};
    template <>
    void raw_destructor<PxJoint>(PxJoint *){};
    template <>
    void raw_destructor<PxPvdSceneClient>(PxPvdSceneClient *){};
    template <>
    void raw_destructor<PxCooking>(PxCooking *){};
    template <>
    void raw_destructor<PxConvexMesh>(PxConvexMesh *){};
    template <>
    void raw_destructor<PxTriangleMesh>(PxTriangleMesh *){};
    template <>
    void raw_destructor<PxController>(PxController *){};
    template <>
    void raw_destructor<PxCapsuleController>(PxCapsuleController *){};
    template <>
    void raw_destructor<PxBoxController>(PxBoxController *){};
    template <>
    void raw_destructor<PxControllerDesc>(PxControllerDesc *){};
    template <>
    void raw_destructor<PxControllerManager>(PxControllerManager *){};
    template <>
    void raw_destructor<PxHeightField>(PxHeightField *){};
    template <>
    void raw_destructor<PxConstraint>(PxConstraint *){};
    template <>
    void raw_destructor<PxJointLimitParameters>(PxJointLimitParameters *){};
    template <>
    void raw_destructor<PxSpring>(PxSpring *){};
    template <>
    void raw_destructor<PxUserControllerHitReport>(PxUserControllerHitReport *){};
    template <>
    void raw_destructor<PxControllerShapeHit>(PxControllerShapeHit *){};
    template <>
    void raw_destructor<PxPhysicsInsertionCallback>(PxPhysicsInsertionCallback *){};
    template <>
    void raw_destructor<PxErrorCallback>(PxErrorCallback *){};
    template <>
    void raw_destructor<PxDefaultErrorCallback>(PxDefaultErrorCallback *){};
    template <>
    void raw_destructor<PxControllerHit>(PxControllerHit *){};
  }
}