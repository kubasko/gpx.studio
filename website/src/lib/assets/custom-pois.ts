import { type LayerTreeType } from './layers';

export const customOverpassQueries: Record<string, any> = {
    drinking_water: {
        icon: {
            svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-droplet"><path d="M12 22a7 7 0 0 0 7-7c0-2-2.3-6.9-3-8-4 5.7-8 11.5-8 15a7 7 0 0 0 7 7z"/></svg>',
            color: '#3b82f6',
        },
        tags: {
            amenity: 'drinking_water',
        },
        symbol: 'Drinking Water',
    },
};

export const customOverpassTree: LayerTreeType = {
    custom: {
        drinking_water: true,
    },
};
