import { PhysXInstance } from '../';

PhysXInstance.instance.initPhysX(new Worker('/src/worker.ts'));
