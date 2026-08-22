declare module "d3-force-3d" {
  type Simulation = {
    force: (name: string, force: unknown) => Simulation;
    stop: () => unknown;
    tick: (iterations?: number) => unknown;
  };
  export const forceSimulation: (nodes?: object[], dimensions?: 1 | 2 | 3) => Simulation;
  export const forceCenter: (x?: number, y?: number, z?: number) => unknown;
  export const forceCollide: (radius?: number) => unknown;
  export const forceManyBody: () => { strength: (value: number) => unknown };
}
