const _positionSize = 3; // Vector3
const _quaternionSize = 4; // Quaternion
const _velocity = 3; // Vector3
const _angular = 3; // Vector3
const _deltaTime = 1; // number

export const BODY_DATA_SIZE = _positionSize + _quaternionSize + _velocity + _angular;

export const CONTROLLER_DELTA_SIZE = _positionSize + _deltaTime;
