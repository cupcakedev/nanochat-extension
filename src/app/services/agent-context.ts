import { createLogger } from '@shared/utils';
import type { InteractiveElementSnapshotItem } from '@shared/types';
import type { ActiveTab, GetPageContentOptions } from './tab-bridge';
import { getActiveTab, getPageContent } from './tab-bridge';

const logger = createLogger('agent-context');

export const AGENT_CONTEXT_UNAVAILABLE_MESSAGE =
  'Page context is available only on regular web pages. Open a website tab and try again.';

export class AgentContextUnavailableError extends Error {
  constructor(message = AGENT_CONTEXT_UNAVAILABLE_MESSAGE) {
    super(message);
    this.name = 'AgentContextUnavailableError';
  }
}

export interface AgentPageContext {
  tab: ActiveTab;
  content: string;
}

export interface AgentSystemPromptResult {
  tab: ActiveTab;
  systemPrompt: string;
}

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function isExpectedPageContextError(message: string): boolean {
  return (
    message.includes('Could not establish connection. Receiving end does not exist.') ||
    message.includes('The message port closed before a response was received.')
  );
}

function ensureContentAvailable(content: string): void {
  if (!content.trim()) {
    throw new AgentContextUnavailableError();
  }
}

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

export async function getAgentPageContext(
  pageContentOptions?: GetPageContentOptions,
): Promise<AgentPageContext> {
  const tab = await getActiveTab();
  logger.info('Active tab', { tabId: tab.tabId, url: tab.url, title: tab.title });

  let content = '';
  try {
    content = await getPageContent(tab.tabId, pageContentOptions);
    ensureContentAvailable(content);
    logger.info('Page content fetched', { length: content.length });
  } catch (err) {
    const errorMessage = getErrorMessage(err);
    if (isExpectedPageContextError(errorMessage)) {
      logger.info('Page context unavailable in current tab (service page)', { tabId: tab.tabId, url: tab.url });
    } else {
      logger.warn('Page context fetch failed', { tabId: tab.tabId, url: tab.url, reason: errorMessage });
    }
    return { tab, content: '' };
  }

  return { tab, content };
}

function buildSystemPromptFromPageContext(tab: ActiveTab, content: string): string {
  if (!content.trim()) {
    return [
      'You are a helpful AI assistant. The user\'s current tab is a service page where page content is not accessible.',
      '',
      `Current tab URL: ${tab.url}`,
      '',
      'You can help the user by navigating to a web page using the open_url action, or answer general questions.',
    ].join('\n');
  }
  return [
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
}

export async function buildAgentSystemPrompt(): Promise<string> {
  const { tab, content } = await getAgentPageContext();
  return buildSystemPromptFromPageContext(tab, content);
}

export async function buildAgentSystemPromptWithContext(): Promise<AgentSystemPromptResult> {
  const { tab, content } = await getAgentPageContext();
  return { tab, systemPrompt: buildSystemPromptFromPageContext(tab, content) };
}
