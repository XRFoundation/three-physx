export var PhysXModelShapes;
(function (PhysXModelShapes) {
    PhysXModelShapes[PhysXModelShapes["Sphere"] = 0] = "Sphere";
    PhysXModelShapes[PhysXModelShapes["Plane"] = 1] = "Plane";
    // Capsule,
    PhysXModelShapes[PhysXModelShapes["Box"] = 2] = "Box";
    PhysXModelShapes[PhysXModelShapes["ConvexMesh"] = 3] = "ConvexMesh";
    PhysXModelShapes[PhysXModelShapes["TriangleMesh"] = 4] = "TriangleMesh";
    PhysXModelShapes[PhysXModelShapes["HeightField"] = 5] = "HeightField";
})(PhysXModelShapes || (PhysXModelShapes = {}));
export var PhysXBodyType;
(function (PhysXBodyType) {
    PhysXBodyType[PhysXBodyType["STATIC"] = 0] = "STATIC";
    PhysXBodyType[PhysXBodyType["DYNAMIC"] = 1] = "DYNAMIC";
    PhysXBodyType[PhysXBodyType["KINEMATIC"] = 2] = "KINEMATIC";
})(PhysXBodyType || (PhysXBodyType = {}));
//# sourceMappingURL=ThreePhysX.js.map