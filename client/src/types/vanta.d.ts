declare module "vanta/dist/vanta.fog.min" {
  const createFog: (options: Record<string, unknown>) => {
    destroy: () => void;
    setOptions?: (options: Record<string, number | boolean>) => void;
  };
  export default createFog;
}
