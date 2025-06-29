import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { createNotionDB, type EmojiRequest, getImdb } from './service.js';

const server = new McpServer({
  name: 'imdb-notion-mcp',
  version: '1.0.0',
  capabilities: {
    resources: {},
    tools: {}
  }
});
server.tool(
  'imdb-tmdb-mcp',
  'Gather information(like "movie/tv show/web series title", movie/tv show/web series plot/story/description) from imdb',
  {
    giveTitle: z.string().describe(
      //   'Give The movie/tv show/web series title e.g. for example if user say "get inception movie data from imdb and add the data to my notion db" then value should like this Way "Inception - IMDB" make sure all title always end this IMDB "movie/tv show/web series title - IMDB" like this way'
      'Movie/TV title ending with " - IMDB" (e.g. "Inception - IMDB")'
    )
  },
  async ({ giveTitle }) => {
    const { title, plot } = await getImdb(2, giveTitle);

    return {
      content: [
        {
          type: 'text',
          text: `Movie/Tv series Title : "${title}"\n\nHere Is the "PLOT":\n\n"${plot}"`
        }
      ]
    };
  }
);

server.tool(
  'notion-mcp',
  "After get Info from Imdb/TMDB Using 'imdb-tmdb-mcp' tool now add the title and base on plot One emoji add to your notion Database",
  {
    title: z
      .string()
      .describe(
        "movie/tv series title get from 'imdb-tmdb-mcp' tool return content where movie title mention"
      ),
    emoji: z
      .string()
      .min(1)
      .emoji()
      .describe(
        "Create/Generate ONE Emoji based on movie/tv series 'PLOT' where 'PLOT' information get from 'imdb-tmdb-mcp' tool return content"
      )
  },
  async ({ title, emoji }) => {
    await createNotionDB(title, emoji as EmojiRequest);
    return {
      content: [
        {
          type: 'text',
          text: `Info Grabbed Successfully`
        }
      ]
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('notion is running');
}

main();
