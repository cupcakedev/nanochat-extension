import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import webExtension from 'vite-plugin-web-extension';
import {resolve} from 'path';

export default defineConfig({
	plugins: [
		react(),
		webExtension({
			disableAutoLaunch: true,
		}),
	],
	resolve: {
		alias: {
			'@app': resolve(__dirname, 'src/app'),
			'@background': resolve(__dirname, 'src/background'),
			'@content': resolve(__dirname, 'src/content'),
			'@shared': resolve(__dirname, 'src/shared'),
		},
	},
});
