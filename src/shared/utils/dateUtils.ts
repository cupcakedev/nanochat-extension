import type { ChatSummary } from '@shared/types';

export type ChatGroup = 'Today' | 'Yesterday' | 'Previous 7 Days' | 'Older';

export type GroupedChats = Record<ChatGroup, ChatSummary[]>;

export function groupChatsByDate(chatSummaries: ChatSummary[]): GroupedChats {
    const groups: GroupedChats = {
        Today: [],
        Yesterday: [],
        'Previous 7 Days': [],
        Older: [],
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const sortedSummaries = [...chatSummaries].sort((a, b) => b.updatedAt - a.updatedAt);

    for (const summary of sortedSummaries) {
        const date = new Date(summary.updatedAt);
        const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

        if (dateOnly.getTime() === today.getTime()) {
            groups.Today.push(summary);
        } else if (dateOnly.getTime() === yesterday.getTime()) {
            groups.Yesterday.push(summary);
        } else if (dateOnly.getTime() > lastWeek.getTime()) {
            groups['Previous 7 Days'].push(summary);
        } else {
            groups.Older.push(summary);
        }
    }

    return groups;
}
