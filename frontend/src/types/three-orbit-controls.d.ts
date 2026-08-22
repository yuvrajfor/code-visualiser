declare module "three/examples/jsm/controls/OrbitControls.js" {
  export class OrbitControls {
    constructor(camera: unknown, domElement: HTMLElement);
    enablePan: boolean;
    enableDamping: boolean;
    dampingFactor: number;
    minDistance: number;
    maxDistance: number;
    minPolarAngle: number;
    maxPolarAngle: number;
    update(): void;
    dispose(): void;
  }
}
