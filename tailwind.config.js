export default {
	content: ['./src/**/*.{ts,tsx}', './sidepanel.html'],
	theme: {
		extend: {
			colors: {
				brand: {
					800: '#8AB4F8',
					700: '#6FA2F6',
					600: '#4B8AF5',
					500: '#1E6FF1',
					400: '#1A5FD0',
					200: '#072D6B',
				},
				neutral: {
					800: '#EFEFF3',
					700: '#D4D4D8',
					600: '#A8A8AC',
					500: '#89898D',
					400: '#6C6C70',
					300: '#505053',
					200: '#3B3B3E',
					100: '#27272A',
					bg: '#1D1D20',
				},
			},
		},
	},
	plugins: [],
};
