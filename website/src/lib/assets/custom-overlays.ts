import { type StyleSpecification } from 'mapbox-gl';
import { type LayerTreeType } from './layers';

export const customOverlays: { [key: string]: string | StyleSpecification } = {
    // custom1: {
    //     version: 8,
    //     sources: {
    //         custom1: {
    //             type: 'raster',
    //             tiles: ['https://custom.domain.com/data/layer1/{z}/{x}/{y}.png'],
    //         },
    //     },
    //     layers: [
    //         {
    //             id: 'custom1',
    //             type: 'raster',
    //             source: 'custom1',
    //             minzoom: 0,
    //             maxzoom: 15,
    //         },
    //     ],
    // },
    // custom2: {
    //     version: 8,
    //     sources: {
    //         custom2: {
    //             type: 'raster',
    //             tiles: ['https://custom.domain.com/data/layer2/{z}/{x}/{y}.png'],
    //         },
    //     },
    //     layers: [
    //         {
    //             id: 'custom2',
    //             type: 'raster',
    //             source: 'custom2',
    //             minzoom: 0,
    //             maxzoom: 15,
    //         },
    //     ],
    // },
    // custom3: {
    //     version: 8,
    //     sources: {
    //         custom3: {
    //             type: 'raster',
    //             tiles: ['https://custom.domain.com/data/layer3/{z}/{x}/{y}.png'],
    //         },
    //     },
    //     layers: [
    //         {
    //             id: 'custom3',
    //             type: 'raster',
    //             source: 'custom3',
    //             minzoom: 0,
    //             maxzoom: 15,
    //         },
    //     ],
    // },
};

export const customOverlayTree: LayerTreeType = {
    // custom: {
    //     custom1: true,
    //     custom2: true,
    //     custom3: true,
    // },
};
