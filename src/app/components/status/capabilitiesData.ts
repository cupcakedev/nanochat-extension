export interface Capability {
	icon: string;
	text: string;
}

export const CAPABILITIES: Capability[] = [
	{ icon: '📝', text: 'Summarize articles & documents' },
	{ icon: '✉️', text: 'Draft & polish emails' },
	{ icon: '🐛', text: 'Debug code & error messages' },
	{ icon: '🌍', text: 'Translate between languages' },
	{ icon: '🧠', text: 'Explain complex topics simply' },
	{ icon: '💡', text: 'Brainstorm ideas for any project' },
	{ icon: '📊', text: 'Create outlines for presentations' },
	{ icon: '🔍', text: 'Explain code line by line' },
	{ icon: '✅', text: 'Proofread & improve your writing' },
	{ icon: '🔤', text: 'Generate regex from examples' },
	{ icon: '💼', text: 'Draft cover letters & resumes' },
	{ icon: '🔀', text: 'Write git commit messages' },
	{ icon: '🧪', text: 'Generate test data & examples' },
	{ icon: '🎨', text: 'Rephrase text in different tones' },
	{ icon: '📌', text: 'Create checklists & action plans' },
];

export const CAPABILITIES_ROTATION_INTERVAL = 4000;
