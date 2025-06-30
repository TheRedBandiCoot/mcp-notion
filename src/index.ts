import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { getImdbInfo, getNotionDetail, getSearchResult, getTMDBDetails } from './service.js';
import { EmojiRequest } from '../types/service.types.js';

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
    const { link } = await getSearchResult(2, giveTitle);
    const { title, plot, genre, rating } = await getImdbInfo(link);

    return {
      content: [
        {
          type: 'text',
          text: `Movie/Tv series Title : "${title}"\n\nHere Is the "PLOT":\n\n"${plot}"\n\nGenre : "${genre.join(
            ','
          )}"\n\nRating : "${rating}"\n\nURL : "${link}"`
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
        "movie/tv series title get from 'imdb-tmdb-mcp' tool return content where movie/tv show/web series 'title' mention"
      ),
    rating: z
      .number()
      .describe(
        "Movie/Tv Series Rating/IMDB Rating get from 'imdb-tmdb-mcp' tool return content where movie/tv show/web series 'rating' mention"
      ),
    url: z
      .string()
      .url()
      .describe(
        "Movie/Tv Series IMDB Url get from 'imdb-tmdb-mcp' tool return content where movie/tv show/web series 'URL' mention"
      ),
    genre: z
      .string()
      .array()
      .describe(
        "Movie/Tv Series genre get from 'imdb-tmdb-mcp' tool return content where movie/tv show/web series genre mention this way (e.g. 'Genre : Romance,Action,Drama') so the value for genre should represent this way (e.g. ['Romance','Action','Drama']) genre separate by comma add one by one in an Array as a type string"
      ),
    emoji: z
      .string()
      .min(1)
      .emoji()
      .describe(
        "Create/Generate ONE Emoji based on movie/tv series 'PLOT' where 'PLOT' information get from 'imdb-tmdb-mcp' tool return content"
      ),
    aw: z
      .boolean()
      .default(true)
      .describe(
        "aw - already watch, If user mentioned that he/she didn't watch the movie/tv show/web series then make the value 'false' otherwise default is 'true'"
      )
  },
  async ({ title, emoji, rating, url, genre, aw }) => {
    const { platform, type, imgArr, imgUrl, number_of_seasons } = await getTMDBDetails(url);
    await getNotionDetail(
      { title, genre, rating, platform, type, url, imgArr, imgUrl, number_of_seasons },
      emoji as EmojiRequest,
      aw
    );
    return {
      content: [
        {
          type: 'text',
          text: `Info Grabbed Successfully and ${type} info added to your notion db successfully`
        }
      ]
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('mcp-notion is running');
}

main();
