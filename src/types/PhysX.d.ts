declare module '*.wasm' {
	const value: any;
	export = value;
}

declare namespace PhysX {
	class PxShapeFlag {
		static eSIMULATION_SHAPE: {
			value: number;
		};
		static eSCENE_QUERY_SHAPE: {
			value: number;
		};
		static eTRIGGER_SHAPE: {
			value: number;
		};
		static eVISUALIZATION: {
			value: number;
		};
		static ePARTICLE_DRAIN: {
			value: number;
		};
	}

	class PxControllerCollisionFlags {
		isSet(flag: PxControllerCollisionFlag): boolean;
	}

	class PxControllerCollisionFlag {
		static eCOLLISION_SIDES: {
			value: number;
		};
		static eCOLLISION_UP: {
			value: number;
		};
		static eCOLLISION_DOWN: {
			value: number;
		};
	}

	interface PxPvdInstrumentationFlag {
		eALL: {
			value: number;
		};
		eDEBUG: {
			value: number;
		};
		ePROFILE: {
			value: number;
		};
		eMEMORY: {
			value: number;
		};
	}

	type Constructor<T = {}> = new (...args: any[]) => T;
	type VoidPtr = number;
	const NULL: {};
	const HEAPF32: Float32Array;
	function destroy(obj: PhysX.Type): void;
	function castObject<T1, T2 extends PhysX.Type>(obj: T1, fun: Constructor<T2>): T2;
	function wrapPointer<T extends PhysX.Type>(params: number, obj: Constructor<T>): T;
	function addFunction(params: Function): number;
	function getClass(obj: PhysX.Type): void;
	function getPointer(obj: PhysX.Type): void;
	function getCache(fun: Constructor<PhysX.Type>): void;
	function _malloc(byte: number): number;
	function _free(...args: any): any;
	function compare(obj1: PhysX.Type, obj2: PhysX.Type): boolean;

	class GeometryType {
		Enum: {
			eSPHERE: number;
			ePLANE: number;
			eCAPSULE: number;
			eBOX: number;
			eCONVEXMESH: number;
			eTRIANGLEMESH: number;
			eHEIGHTFIELD: number;
			eGEOMETRY_COUNT: number; //!< internal use only!
			eINVALID: number; //= -1		//!< internal use only!
		};
	}

	const PX_PHYSICS_VERSION: number;
	interface PxAllocatorCallback { }
	class PxDefaultErrorCallback implements PxAllocatorCallback { }
	interface PxErrorCallback { }
	class PxDefaultAllocator implements PxErrorCallback { }

	class PxPvdTransport {
		static implement(pvdTransportImp: PxPvdTransport): PxPvdTransport;

		connect: () => void;
		isConnected: () => boolean;
		write: (inBytesPtr: number, inLength: number) => void;
	}

	class PxFoundation { }

	class PxSimulationEventCallback {
		static implement(imp: PxSimulationEventCallback): PxSimulationEventCallback;

		onContactBegin: (shapeA: PhysX.PxShape, shapeB: PhysX.PxShape) => void;
		onContactEnd: (shapeA: PhysX.PxShape, shapeB: PhysX.PxShape) => void;
		onContactPersist: (shapeA: PhysX.PxShape, shapeB: PhysX.PxShape) => void;
		onTriggerBegin: (shapeA: PhysX.PxShape, shapeB: PhysX.PxShape) => void;
		onTriggerEnd: (shapeA: PhysX.PxShape, shapeB: PhysX.PxShape) => void;
	}

	function PxCreateFoundation(a: number, b: PxAllocatorCallback, c: PxErrorCallback): PxFoundation;
	function getDefaultSceneDesc(scale: PxTolerancesScale, numThreads: number, simulationCallback: PxSimulationEventCallback): PxSceneDesc;
	class PxTransform {
		constructor(p: number[], q: number[]);
		constructor();
		setPosition(t: number[]): void;
		getPosition(): number[];
		setQuaternion(t: number[]): void;
		getQuaternion(): number[];

		translation: {
			x: number;
			y: number;
			z: number;
		};
		rotation: {
			x: number;
			y: number;
			z: number;
			w: number;
		};
	}

	class ClassHandle {
		count: { value: number };
		ptr: number;
	}

	class Base {
		$$: ClassHandle;
	}

	class PxGeometry {
		getType(): number;
	}
	class PxBoxGeometry extends PxGeometry {
		constructor(x: number, y: number, z: number);
	}
	class PxSphereGeometry extends PxGeometry {
		constructor(r: number);
	}
	class PxPlaneGeometry extends PxGeometry {
		constructor();
	}
	class PxTriangleMeshGeometry extends PxGeometry {
		constructor(a: any, b: any, c: any);
	}

	class Material extends Base { }

	class PxShape extends Base {
		setContactOffset(contactOffset: number): void;
		setSimulationFilterData(filterData: PxFilterData): void;
		setName(value: string): void;
		getName(): string;
		setFlag(flag: number): void;
	}

	enum PxActorFlags {
    eVISUALIZATION = 1 << 0,
    eDISABLE_GRAVITY = 1 << 1,
    eSEND_SLEEP_NOTIFIES = 1 << 2,
    eDISABLE_SIMULATION = 1 << 3
	}

	class Actor extends Base {
		setActorFlag(flag: number, value: boolean): void;
		setActorFlags(flags: PxActorFlags): void;
		getActorFlags(): number;
		getGlobalPose(): PxTransform;
		setGlobalPose(transform: PxTransform, autoAwake: boolean): void;
		setLinearVelocity(value: PxVec3, autoAwake: boolean): void;
		getLinearVelocity(): PxVec3;
		setAngularVelocity(value: PxVec3, autoAwake: boolean): void;
		getAngularVelocity(): PxVec3;
		addImpulseAtLocalPos(valueA: PxVec3, valueB: PxVec3): void;
	}
	class RigidActor extends Actor {
		attachShape(shape: PxShape): void;
		detachShape(shape: PxShape, wakeOnLostTouch?: boolean | true): void;
		addForce(force: PxVec3 | any, mode: PxForceMode | number, autowake: boolean): void;
	}
	enum PxForceMode { }
	class RigidBody extends RigidActor {
		setRigidBodyFlag(flag: PxRigidBodyFlags, value: boolean): void;
		setRigidBodyFlags(flags: PxRigidBodyFlags): void;
		getRigidBodyFlags(): number;

		setMass(value: number): void;
		getMass(): number;

		setAngularVelocity(value: PxVec3, autoWake: boolean): void;

		setAngularDamping(value: number): void;
		getAngularDamping(): number;

		setLinearDamping(value: number): void;
		getLinearDamping(): number;

		setMassSpaceInertiaTensor(value: PxVec3): void;
	}

	class RigidStatic extends RigidActor { }
	class RigidDynamic extends RigidBody {
		wakeUp(): void; //, &PxRigidDynamic::wakeUp)
		setWakeCounter(): void; //, &PxRigidDynamic::setWakeCounter)
		isSleeping(): boolean; //, &PxRigidDynamic::isSleeping)
		getWakeCounter(): void; //, &PxRigidDynamic::getWakeCounter)
		setSleepThreshold(value: number): void; //, &PxRigidDynamic::setSleepThreshold)
		getSleepThreshold(): number; //, &PxRigidDynamic::getSleepThreshold)
		setKinematicTarget(transform: PxTransform): void; //, &PxRigidDynamic::setKinematicTarget)
		setRigidDynamicLockFlags(): void; //, &PxRigidDynamic::setRigidDynamicLockFlags);
		setSolverIterationCounts(minPositionIters: number, minVelocityIters: number): void;
	}
	class PxVec3 {
		x: number;
		y: number;
		z: number;
	}

	class PxLocationHit {
		position: PxVec3;
		normal: PxVec3;
		distance: number;
	}

	class PxRaycastHit extends PxLocationHit {
		getShape(): PxShape;
	}

	class PxRaycastCallback {
		block: PxRaycastHit;
		hasBlock: boolean;
	}

	class PxRaycastBuffer extends PxRaycastCallback {
		constructor();
		constructor();

		getNbTouches(): number;
		getTouch(index: number): PxRaycastHit;
	}

	class PxSceneDesc {
		gravity: PxVec3;
		flags: any;
		bounceThresholdVelocity: number;
	}
	class PxScene {
		addActor(actor: Actor, unk: any): void;
		removeActor(actor: Actor, unk: any): void;
		simulate(timeStep: number, rando: boolean): void;
		fetchResults(b: boolean): void;
		getActiveActors(len: number): Actor[];
		setGravity(value: PxVec3): void;

		raycast(origin: PxVec3, unitDir: PxVec3, maxDistance: number /*PxReal*/, hit: PxRaycastBuffer): boolean;
		sweep(geometry: PxGeometry, pose: PxTransform, unitDir: PxVec3, maxDistance: number /*PxReal*/, hit: PxRaycastBuffer): boolean;
	}

	class PxCookingParams {
		constructor(scale: PxTolerancesScale);
		public meshPreprocessParams: number;
	}

	class PxMeshScale {
		constructor(a: any, b: any);
	}

	enum PxShapeFlags {
    eSIMULATION_SHAPE = 1 << 0,
    eSCENE_QUERY_SHAPE = 1 << 1,
    eTRIGGER_SHAPE = 1 << 2,
    eVISUALIZATION = 1 << 3,
    ePARTICLE_DRAIN = 1 << 4
	}

	enum PxRigidBodyFlags {
    eKINEMATIC = 1 << 0,
    eUSE_KINEMATIC_TARGET_FOR_SCENE_QUERIES = 1 << 1,
    eENABLE_CCD = 1 << 2,
    eENABLE_CCD_FRICTION = 1 << 3,
    eENABLE_POSE_INTEGRATION_PREVIEW = 1 << 4,
    eENABLE_SPECULATIVE_CCD = 1 << 5,
    eENABLE_CCD_MAX_CONTACT_IMPULSE = 1 << 6,
    eRETAIN_ACCELERATIONS = 1 << 7
	}

  enum PxSceneFlag {
    eENABLE_ACTIVE_ACTORS = 1 << 0,
    eENABLE_CCD = 1 << 1,
    eDISABLE_CCD_RESWEEP = 1 << 2,
    eADAPTIVE_FORCE = 1 << 3,
    eENABLE_PCM = 1 << 6,
    eDISABLE_CONTACT_REPORT_BUFFER_RESIZE = 1 << 7,
    eDISABLE_CONTACT_CACHE = 1 << 8,
    eREQUIRE_RW_LOCK = 1 << 9,
    eENABLE_STABILIZATION = 1 << 10,
    eENABLE_AVERAGE_POINT = 1 << 11,
    eEXCLUDE_KINEMATICS_FROM_ACTIVE_ACTORS = 1 << 12,
    eENABLE_GPU_DYNAMICS = 1 << 13,
    eENABLE_ENHANCED_DETERMINISM = 1 << 14,
    eENABLE_FRICTION_EVERY_ITERATION = 1 << 15
  }

	class PxTriangleMesh {
		constructor(x: number, y: number, z: number);
	}

	class PxMeshGeometryFlags {
		constructor(a: any);
	}

	class PxCooking {
		createTriMesh(
			verticesPtr: number,
			vertCount: number,
			indicesPrt: number,
			indexCount: number,
			isU16: boolean,
			physcis: PxPhysics
		): void;
	}

	class PxPhysics {
		createSceneDesc(): PxSceneDesc;
		createScene(a: PxSceneDesc): PxScene;
		createRigidDynamic(a: PxTransform | any): RigidDynamic;
		createRigidStatic(a: PxTransform | any): RigidStatic;
		createMaterial(staticFriction: number, dynamicFriction: number, restitution: number): Material;
		//shapeFlags = PxShapeFlag:: eVISUALIZATION | PxShapeFlag:: eSCENE_QUERY_SHAPE | PxShapeFlag:: eSIMULATION_SHAPE
		createShape(geometry: PxGeometry, material: Material, isExclusive?: boolean | false, shapeFlags?: number | PxShapeFlags): PxShape;
		getTolerancesScale(): PxTolerancesScale;
	}
	class PxTolerancesScale {
		length: number | 1.0;
		speed: number | 10.0;
	}
	class PxPvd {
		connect(pvdTransport: PxPvdTransport): void;
	}
	function PxCreatePhysics(
		a?: number,
		b?: PxFoundation,
		c?: PxTolerancesScale,
		trackOutstandingAllocations?: boolean,
		e?: PxPvd
	): PxPhysics;
	function PxCreateCooking(version: number, foundation: PxFoundation, params: PxCookingParams): PxCooking;
	function PxCreatePvd(foundation: PxFoundation): PxPvd;

	function allocateRaycastHitBuffers(size: number): PxRaycastBuffer;

	function allocateSweepHitBuffers(size: number): PxRaycastBuffer;

	type Type = {};

	const HEAPU8: Uint8Array;
	const HEAPU16: Uint16Array;
	const HEAPU32: Uint32Array;

	function PxCreateControllerManager(scene: PxScene, lockingEnabled: boolean): PxCreateControllerManager;

	class PxCreateControllerManager {
		createController(desc: PxControllerDesc): PxController;
	}

	class PxControllerDesc {
		isValid(): boolean;
		setMaterial(material: Material): void;
	}

	class PxCapsuleControllerDesc extends PxControllerDesc {
		radius: number;
		height: number;
		stepOffset: number;
		contactOffset: number;
		slopeLimit: number;
		setReportCallback(callbackImp: any): any;
	}

	class PxFilterData {
		word0: number;
		word1: number;
		word2: number;
		word3: number;

		constructor(word0: number, word1: number, word2: number, word3: number);
	}

	class PxQueryFilterCallback {
		static implement(queryFilterCallback: PxQueryFilterCallback): PxQueryFilterCallback;

		postFilter(filterData: any, hit: any): void;
		preFilter(filterData: any, shape: any, actor: any): void;
	}

	class PxControllerFilterCallback { }

	class PxControllerFilters {
		constructor(filterData?: PxFilterData, callbacks?: PxQueryFilterCallback, cctFilterCb?: PxControllerFilterCallback);
	}

	class PxObstacleContext { }

	class PxController {
		move(
			displacement: PxVec3,
			minDistance: number,
			elapsedTime: number,
			filters: PxControllerFilters,
			obstacles?: PxObstacleContext
		): PxControllerCollisionFlags;
		setPosition(pos: PxVec3): any;
		getPosition(): PxVec3;
	}

	class PxUserControllerHitReport {
		static implement(userControllerHitReport: PxUserControllerHitReport): PxUserControllerHitReport;

		onShapeHit(event: PxControllerShapeHit): void;
		onControllerHit(event: unknown): void;
		onObstacleHit(event: unknown): void;
	}

	class PxControllerShapeHit {
		getWorldPos(): PxVec3;
		getWorldNormal(): PxVec3;
		getLength(): number;
	}
}

// virtual PxController*		createController(const PxControllerDesc& desc) = 0;

// function("PxCreateControllerManager", &PxCreateControllerManager, allow_raw_pointers());

//   enum_<PxControllerShapeType::Enum>("PxControllerShapeType")
//       .value("eBOX", PxControllerShapeType::Enum::eBOX)
//       .value("eCAPSULE", PxControllerShapeType::Enum::eCAPSULE)
//       .value("eFORCE_DWORD", PxControllerShapeType::Enum::eFORCE_DWORD);

//   enum_<PxCapsuleClimbingMode::Enum>("PxCapsuleClimbingMode")
//       .value("eEASY", PxCapsuleClimbingMode::Enum::eEASY)
//       .value("eCONSTRAINED", PxCapsuleClimbingMode::Enum::eCONSTRAINED)
//       .value("eLAST", PxCapsuleClimbingMode::Enum::eLAST);

//   enum_<PxControllerNonWalkableMode::Enum>("PxControllerNonWalkableMode")
//       .value("ePREVENT_CLIMBING", PxControllerNonWalkableMode::Enum::ePREVENT_CLIMBING)
//       .value("ePREVENT_CLIMBING_AND_FORCE_SLIDING", PxControllerNonWalkableMode::Enum::ePREVENT_CLIMBING_AND_FORCE_SLIDING);

//
//   class_<PxController>("PxController")
//       .function("release", &PxController::release)
//       .function("move", &PxController::move, allow_raw_pointers())
//       .function("setPosition", &PxController::setPosition)
//       .function("getPosition", &PxController::getPosition)
//       .function("setSimulationFilterData", optional_override(
//                                                [](PxController &ctrl, PxFilterData &data) {
//                                                  PxRigidDynamic *actor = ctrl.getActor();
//                                                  PxShape *shape;
//                                                  actor->getShapes(&shape, 1);
//                                                  shape->setSimulationFilterData(data);
//                                                  return;
//                                                }));

//   class_<PxControllerDesc>("PxControllerDesc")
//       .function("isValid", &PxControllerDesc::isValid)
//       .function("getType", &PxControllerDesc::getType)
//       .property("position", &PxControllerDesc::position)
//       .property("upDirection", &PxControllerDesc::upDirection)
//       .property("slopeLimit", &PxControllerDesc::slopeLimit)
//       .property("invisibleWallHeight", &PxControllerDesc::invisibleWallHeight)
//       .property("maxJumpHeight", &PxControllerDesc::maxJumpHeight)
//       .property("contactOffset", &PxControllerDesc::contactOffset)
//       .property("stepOffset", &PxControllerDesc::stepOffset)
//       .property("density", &PxControllerDesc::density)
//       .property("scaleCoeff", &PxControllerDesc::scaleCoeff)
//       .property("volumeGrowth", &PxControllerDesc::volumeGrowth)
//       .property("nonWalkableMode", &PxControllerDesc::nonWalkableMode)
//       // `material` property doesn't work as-is so we create a setMaterial function
//       .function("setMaterial", optional_override([](PxControllerDesc &desc, PxMaterial *material) {
//                   return desc.material = material;
//                 }),
//                 allow_raw_pointers());

//   class_<PxCapsuleControllerDesc, base<PxControllerDesc>>("PxCapsuleControllerDesc")
//       .constructor<>()
//       .function("isValid", &PxCapsuleControllerDesc::isValid)
//       .property("radius", &PxCapsuleControllerDesc::radius)
//       .property("height", &PxCapsuleControllerDesc::height)
//       .property("climbingMode", &PxCapsuleControllerDesc::climbingMode);

declare function PhysX(): Promise<typeof PhysX>;