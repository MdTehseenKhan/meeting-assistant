import { createTool } from "@mastra/core/tools";
import { Exa } from "exa-js";
import z from "zod";

function getExa() {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) {
    throw new Error('EXA_API_KEY is not set');
  }
  return new Exa(apiKey);
}

export const meetingResearchTool = createTool({
  id: 'search-web',
  description: 'Search the web for information about a person, company or topic',
  inputSchema: z.object({
    query: z.string().describe('Search query'),
    numResults: z.number().optional().default(5),
  }),
  execute: async (input) => {
    const exa = getExa();
    const results = await exa.search(input.query, {
      numResults: input.numResults,
      contents: { text: { maxCharacters: 2000 }, livecrawl: 'fallback' },
    });
    return results.results.map((result) => ({
      title: result.title,
      url: result.url,
      text: result.text,
    }));
  },
});