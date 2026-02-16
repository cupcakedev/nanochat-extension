import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import webExtension from 'vite-plugin-web-extension';
import { resolve } from 'path';

export default defineConfig(({ mode }) => ({
		plugins: [
			react(),
			webExtension({
				disableAutoLaunch: true,
				additionalInputs: ['src/placeholder.html'],
			}),
		],
	build:
		mode === 'development'
			? {
					watch: {
						chokidar: {
							usePolling: true,
							interval: 1000,
						},
					},
				}
			: undefined,
	resolve: {
		alias: {
			'@app': resolve(__dirname, 'src/app'),
			'@background': resolve(__dirname, 'src/background'),
			'@content': resolve(__dirname, 'src/content'),
			'@shared': resolve(__dirname, 'src/shared'),
		},
	},
}));
