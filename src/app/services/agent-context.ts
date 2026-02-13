import { createLogger } from '@shared/utils';
import type { InteractiveElementSnapshotItem } from '@shared/types';
import { getActiveTab, getPageContent } from './tab-bridge';

const logger = createLogger('agent-context');


export function formatElementLine(element: InteractiveElementSnapshotItem): string {
  const parts: string[] = [`[${element.index}] <${element.tag}>`];
  if (element.role) parts.push(`role=${element.role}`);
  if (element.inputType) parts.push(`type=${element.inputType}`);
  if (element.text) parts.push(`text="${element.text}"`);
  if (element.ariaLabel) parts.push(`aria="${element.ariaLabel}"`);
  if (element.placeholder) parts.push(`placeholder="${element.placeholder}"`);
  if (element.name) parts.push(`name="${element.name}"`);
  if (element.href) parts.push(`href="${element.href}"`);
  if (element.disabled) parts.push('disabled=true');
  return parts.join(' | ');
}

export async function buildAgentSystemPrompt(): Promise<string> {
  logger.info('Building agent system prompt...');

  const tab = await getActiveTab();
  logger.info('Active tab', { tabId: tab.tabId, url: tab.url, title: tab.title });

  let content = '';
  try {
    content = await getPageContent(tab.tabId);
    logger.info('Page content fetched', { length: content.length, content });
  } catch (err) {
    logger.error('Failed to fetch page content', err);
    content = '[Unable to read page content. The content script may not be loaded — try reloading the page.]';
  }

  const systemPrompt = [
    'You are a helpful AI assistant with access to the user\'s current web page.',
    '',
    `Current page:`,
    `URL: ${tab.url}`,
    `Title: ${tab.title}`,
    '',
    'Page content:',
    content,
    '',
    'Answer the user\'s questions based on this page content when relevant. If the user asks about something not on the page, you can still help with general knowledge.',
  ].join('\n');

  logger.info('System prompt built', { totalLength: systemPrompt.length, systemPrompt });
  return systemPrompt;
}
