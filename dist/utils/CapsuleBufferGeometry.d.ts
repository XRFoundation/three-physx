import { BufferGeometry, BufferAttribute } from 'three';
/**
 * @author maximequiblier
 */
export declare class CapsuleBufferGeometry extends BufferGeometry {
    parameters: any;
    radiusTop: number;
    radiusBottom: number;
    height: number;
    radialSegments: number;
    heightSegments: number;
    capsTopSegments: number;
    capsBottomSegments: number;
    thetaStart: number;
    thetaLength: number;
    alpha: number;
    eqRadii: boolean;
    vertexCount: number;
    indexCount: number;
    indices: BufferAttribute;
    vertices: BufferAttribute;
    normals: BufferAttribute;
    uvs: BufferAttribute;
    _index: number;
    _halfHeight: number;
    _indexArray: number[][];
    _indexOffset: number;
    constructor(radiusTop?: number, radiusBottom?: number, height?: number, radialSegments?: number, heightSegments?: number, capsTopSegments?: number, capsBottomSegments?: number, thetaStart?: number, thetaLength?: number);
    calculateVertexCount(): number;
    calculateIndexCount(): number;
    generateTorso(): void;
}
