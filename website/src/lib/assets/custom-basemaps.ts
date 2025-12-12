import { type StyleSpecification } from 'mapbox-gl';
import { type LayerTreeType } from './layers';
import { PUBLIC_MAPYCOM_TOKEN } from '$env/static/public';

export const customBasemaps: { [key: string]: string | StyleSpecification } = {
    mapyBasic: {
        version: 8,
        sources: {
            mapyBasic: {
                type: 'raster',
                tiles: [
                    `https://api.mapy.cz/v1/maptiles/basic/256/{z}/{x}/{y}?apikey=${PUBLIC_MAPYCOM_TOKEN}`,
                ],
                tileSize: 256,
                maxzoom: 19,
                attribution: '&copy; <a href="https://mapy.cz" target="_blank">Mapy.cz</a>',
            },
        },
        layers: [
            {
                id: 'mapyBasic',
                type: 'raster',
                source: 'mapyBasic',
            },
        ],
    },
    mapyOutdoor: {
        version: 8,
        sources: {
            mapyOutdoor: {
                type: 'raster',
                tiles: [
                    `https://api.mapy.cz/v1/maptiles/outdoor/256/{z}/{x}/{y}?apikey=${PUBLIC_MAPYCOM_TOKEN}`,
                ],
                tileSize: 256,
                maxzoom: 19,
                attribution: '&copy; <a href="https://mapy.cz" target="_blank">Mapy.cz</a>',
            },
        },
        layers: [
            {
                id: 'mapyOutdoor',
                type: 'raster',
                source: 'mapyOutdoor',
            },
        ],
    },
    mapyWinter: {
        version: 8,
        sources: {
            mapyWinter: {
                type: 'raster',
                tiles: [
                    `https://api.mapy.cz/v1/maptiles/winter/256/{z}/{x}/{y}?apikey=${PUBLIC_MAPYCOM_TOKEN}`,
                ],
                tileSize: 256,
                maxzoom: 19,
                attribution: '&copy; <a href="https://mapy.cz" target="_blank">Mapy.cz</a>',
            },
        },
        layers: [
            {
                id: 'mapyWinter',
                type: 'raster',
                source: 'mapyWinter',
            },
        ],
    },
    mapyAerial: {
        version: 8,
        sources: {
            mapyAerial: {
                type: 'raster',
                tiles: [
                    `https://api.mapy.cz/v1/maptiles/aerial/256/{z}/{x}/{y}?apikey=${PUBLIC_MAPYCOM_TOKEN}`,
                ],
                tileSize: 256,
                maxzoom: 19,
                attribution: '&copy; <a href="https://mapy.cz" target="_blank">Mapy.cz</a>',
            },
        },
        layers: [
            {
                id: 'mapyAerial',
                type: 'raster',
                source: 'mapyAerial',
            },
        ],
    },
};

export const customBasemapTree: LayerTreeType = {
    'Mapy.com': {
        mapyBasic: true,
        mapyOutdoor: true,
        mapyWinter: true,
        mapyAerial: true,
    },
};
