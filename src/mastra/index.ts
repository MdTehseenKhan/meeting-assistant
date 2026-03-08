
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { meetingAssistantAgent } from './agents/meeting-assistant';
import { registerApiRoute } from '@mastra/core/server';
import { bot } from '../chat';
import { initScheduler, registerTaskHandler, scheduleTask } from '../scheduler';

// Boot the scheduler (creates table + starts 30s polling)
initScheduler();

// Register the follow-up handler: posts a message to the Slack thread
registerTaskHandler("follow-up", async (payload) => {
  const { threadId, message } = payload as { threadId: string; message: string };
  const slack = bot.getAdapter("slack");
  await slack.postMessage(threadId, { markdown: message });
});

export const mastra = new Mastra({
  agents: { 
    meetingAssistantAgent 
  },
  storage: new LibSQLStore({
    id: "mastra-storage",
    url: "file:./mastra.db",
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  server: {
    apiRoutes: [
      registerApiRoute('/webhooks/slack', {
        method: 'POST',
        handler: async (c) => {
          return bot.webhooks.slack(c.req.raw);
        }
      }),
      registerApiRoute('/webhooks/cal', {
        method: 'POST',
        handler: async (c) => {
          const payload = await c.req.json();
          const triggerEvent = payload.triggerEvent;

          if (triggerEvent !== 'BOOKING_CREATED') {
            return c.json({ ok: true, skipped: true });
          }

          const attendee = payload.payload.attendees?.[0];
          if (!attendee?.email) {
            return c.json({ error: 'No attendee found' }, 400);
          }

          const channelId = process.env.SLACK_CHANNEL_ID;
          if (!channelId) {
            return c.json({ error: 'SLACK_CHANNEL_ID is not set' }, 500);
          }

          const channel = bot.channel(`slack:${channelId}`);
          console.log('[cal] booking received:', attendee.name, attendee.email);

          const slack = bot.getAdapter('slack');

          channel.post(`Researching *${attendee.name}* for upcoming meeting...`).then(async(sent) => {
            const threadId = `slack:${channelId}:${sent.id}`;
            
            const prompt = [
              `I have a meeting coming up with ${attendee.name} (${attendee.email}).`,
              `Event: ${payload.payload.title ?? 'Meeting'}`,
              `Time: ${payload.payload.startTime}`,
              `Research this person and give me a concise meeting brief.`
            ].join('\n');

            const result = await meetingAssistantAgent.generate(prompt);
            await slack.postMessage(threadId, { markdown: result.text });

            // Schedule a follow-up message for when the meeting ends
            if (payload.payload.endTime) {
              scheduleTask(
                `Follow up: ${attendee.name}`,
                "follow-up",
                payload.payload.endTime,
                { threadId, message: "The meeting should be wrapping up! How did it go?" },
              );
            }
          }).catch(error=> {
            console.error('[cal] failed to post brief:', error);
          });

          return c.json({ ok: true });
        }
      })
    ]
  }
});
