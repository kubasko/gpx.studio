import { type LayerTreeType } from './layers';
// We need to import the type, but it's not exported from layers.ts in a way we can easily use if it is defined there.
// Actually OverpassQueryData is exported or defined in layers.ts?
// It is defined in layers.ts: `type OverpassQueryData = ...` and NOT exported.
// I should export it from layers.ts first, or redefine it here (bad), or use `any`.
// Let's modify layers.ts to export it.

export const customOverpassQueries: Record<string, any> = {
    // Example:
    // bakery: {
    //    icon: { svg: "...", color: "..." },
    //    tags: { shop: "bakery" }
    // }
};

export const customOverpassTree: LayerTreeType = {
    // Example:
    // custom: {
    //     bakery: true
    // }
};
