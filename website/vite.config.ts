import { sveltekit } from '@sveltejs/kit/vite';
import { enhancedImages } from '@sveltejs/enhanced-img';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    ssr: {
        noExternal: ['gpx'],
    },
    plugins: [
        nodePolyfills({
            globals: {
                Buffer: true,
            },
            exclude: ['fs', 'path'],
        }),
        enhancedImages(),
        tailwindcss(),
        sveltekit(),
        {
            name: 'serve-gpx',
            configureServer(server) {
                server.middlewares.use('/gpx', (req, res, next) => {
                    const fs = require('fs');
                    const path = require('path');
                    const url = req.url;
                    const filePath = path.join(process.cwd(), 'static/gpx', url);

                    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                        res.setHeader('Content-Type', 'application/gpx+xml');
                        fs.createReadStream(filePath).pipe(res);
                    } else {
                        next();
                    }
                });
            },
        },
    ],
});
