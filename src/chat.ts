import { createSlackAdapter } from '@chat-adapter/slack';
import { createMemoryState } from '@chat-adapter/state-memory';
import { Chat } from 'chat';
import { meetingAssistantAgent } from './mastra/agents/meeting-assistant';

export const bot = new Chat({
  userName: 'meeting-assistant',
  adapters: {
    slack: createSlackAdapter({
      botToken: process.env.SLACK_BOT_TOKEN!,
      signingSecret: process.env.SLACK_SIGNING_SECRET!,
    }),
  },
  // In memory state for development env
  // move to redis backend for production env
  state: createMemoryState(),
});

bot.onNewMention(async (thread, message) => {
  await thread.subscribe();
  await thread.startTyping();
  
  // Pass memory to context so the agent remembers this conversation
  // thread: scopes messages to this specific Slack thread
  // resource: scopes to channel (shared context across threads)
  const result = await meetingAssistantAgent.generate(message.text, {
    memory: {
      thread: thread.id,
      resource: thread.channelId
    }
  });
  await thread.post({ markdown: result.text });
});

bot.onSubscribedMessage(async (thread, message) => {
  await thread.startTyping();

  const result = await meetingAssistantAgent.generate(message.text);
  await thread.post({ markdown: result.text });
});