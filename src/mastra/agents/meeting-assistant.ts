import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { meetingResearchTool } from '../tools/meeting-research-tools';
import { urlReaderTool } from '../tools/url-reader-tool';
import { LibSQLVector } from '@mastra/libsql';
import { fastembed } from '@mastra/fastembed';

export const meetingAssistantAgent = new Agent({
  id: "meeting-assistant",
  name: "Meeting Assistant",
  model: 'openai/gpt-5-chat-latest',
  instructions: `
   You are a personal meeting assistant. Your job is to help your user prepare for meetings by researching the people they're meeting with and providing concise actionable briefings.

  When given information about an upcoming meeting:
  - Research the person and their company
  - Summarize who they are, what they do, and why the meeting matters
  - Highlight any talking points or areas of mutual interest
  - Keep briefs concise and scannable - bullet points over paragraphs
  
  When chatting casually:
  - Be helpful, direct, and low-friction
  - Remember context from previous conversations
  - If you don't know something, say so - don't make things up
  - If the user shares URLs or links, ALWAYS use your URL reader tool to fetch the content first before responding. Never refuse to read a URL - always attempt it with the tool, even for sites like LinkedIn or those that may require authentication. The tool handles extraction on the backend.
  `,
  // Message history: keeps the last 10 messages in memory
  // so the agent remembers what was said earlier in the conversation
  memory: new Memory({
    // Vector store for semantic recall - stores message embeddings
    // so the agent can search past conversations by meaning
    vector: new LibSQLVector({
      id: 'memory-vector',
      url: 'file:./mastra.db'
    }),
    // Local embedding model -- no API key needed
    embedder: fastembed,
    options: {
      lastMessages: 10,
      // Semantic recall: searches past conversations by meaning using embeddings.
      // If someone mentioned a topic weeks ago, the agent can find it.
      semanticRecall: {
        topK: 3, // Retrieve the 3 most relevant past messages
        messageRange: 2 // Include 2 messages of surrounding context per match
      },
      // Working memory: a persistent scratchpad the agent updates over time.
      // The agent automatically fills this in as it learns about you.
      // Scoped to resource - we use a fixed resource ID so your profile
      // persists across all channels and threads.
      workingMemory: {
        enabled: true,
        template: `# User Profile: 
- Name:
- Role:
- Company:

# Preferences
- Communication style:
- Meeting preparation preferences:
- Topics of interest:
`,
      }
    }
  }),
  tools: {
    meetingResearchTool,
    urlReaderTool,
  }
})