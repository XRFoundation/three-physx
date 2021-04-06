const _positionSize = 3; // Vector3
const _quaternionSize = 4; // Quaternion
const _velocity = 3; // Vector3
const _angular = 3; // Vector3

export const BODY_DATA_SIZE = _positionSize + _quaternionSize + _velocity + _angular;
export const MAX_BODIES = 10000;
export const ARRAY_LENGTH = BODY_DATA_SIZE * MAX_BODIES;