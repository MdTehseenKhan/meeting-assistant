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

export const urlReaderTool = createTool({
  id: 'read-urls',
  description: 'Read and extract content from one or more URLs. Use this when the user shares links you need to read.',
  inputSchema: z.object({
    urls: z.array(z.string().url()).describe('Array of URLs to read'),
  }),
  execute: async (input) => {
    const exa = getExa();
    const results = await Promise.allSettled(
      input.urls.map(async (url) => {
        const response = await exa.getContents([url], {
          text: { maxCharacters: 5000 },
        });
        const result = response.results[0];
        return {
          url,
          title: result?.title ?? '',
          content: result?.text ?? '',
        };
      })
    );

    return results.map((result, i) => {
      if (result.status === 'fulfilled') return result.value;
      return {
        url: input.urls[i],
        title: '',
        content: `Error reading URL: ${result.reason?.message ?? 'Unknown error'}`,
      };
    });
  },
});
