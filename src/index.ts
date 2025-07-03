import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { getImdbInfo, getNotionDetail, getSearchResult, getTMDBDetails } from './service.js';
import { EmojiRequest } from '../types/service.types.js';
import {
  APIErrorCode,
  BlockObjectResponse,
  Client
  // PartialBlockObjectResponse
} from '@notionhq/client';

const server = new McpServer({
  name: 'imdb-tmdb-info-to-notion',
  version: '1.0.0',
  capabilities: {
    resources: {},
    tools: {}
  }
});
server.tool(
  'get-info-from-imdb-and-return',
  'This tool searches IMDb using the provided movie or TV show title (which should end with " - IMDB") and returns important details like the title, plot/description, genre(s), IMDb rating, and the IMDb URL.',
  {
    giveTitle: z
      .string()
      .describe(
        'Please enter the exact name of the movie or TV show you want to fetch information for, and make sure it ends with " - IMDB". For example, "Inception - IMDB". This format helps the tool understand the user intent clearly and search IMDb correctly.'
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
  'add-imdb-info-to-notion-db',
  "This tool takes the information returned by the 'get-info-from-imdb-and-return' tool and adds it to the user's Notion database. It requires the title, rating, IMDb URL, genre list, and one emoji that reflects the mood or theme of the plot. Optionally, it also accepts a flag to indicate whether the user has already watched the movie or show.",
  {
    title: z
      .string()
      .describe(
        "This is the movie or TV show title, extracted from the result returned by the 'get-info-from-imdb-and-return' tool. You can find it in the 'Title' field of the returned content."
      ),
    rating: z
      .number()
      .describe(
        "This is the IMDb rating of the movie or TV show, extracted from the result returned by the 'get-info-from-imdb-and-return' tool. It is a number and should reflect the original IMDb rating."
      ),
    url: z
      .string()
      .url()
      .describe(
        "This is the IMDb URL of the movie or TV show. Extract this from the returned content of the 'get-info-from-imdb-and-return' tool. It should be a full and valid URL (e.g., 'https://www.imdb.com/title/tt1375666/')."
      ),
    genre: z
      .string()
      .array()
      .describe(
        "This is an array of genres (e.g., ['Romance', 'Action', 'Drama']), each representing a category the movie or show falls under. This is extracted from the genre section in the 'get-info-from-imdb-and-return' result where the genre appears like 'Genre : Romance,Action,Drama'. Convert this string into an array of strings."
      ),
    emoji: z
      .string()
      .min(1)
      .emoji()
      .describe(
        "This is a single emoji character that represents the overall plot or emotion of the movie or TV show. It must be selected based on the plot returned from the 'get-info-from-imdb-and-return' tool."
      ),
    aw: z
      .boolean()
      .default(true)
      .describe(
        "This flag indicates whether the user has already watched the movie or show. If the user says they haven't watched it yet, set this to 'false'. Otherwise, the default value is 'true'."
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

server.registerPrompt(
  'movie-tv-data-to-notion',
  {
    title: 'movie/tv series data to notion add prompt',
    description: 'using movie or tv shows name and get data for it and it to notion database',
    argsSchema: {
      title: z.string().describe('Enter The Movie/Tv series Title Here'),
      isWatch: z.string().optional().describe("If You didn't Watch just say 'Not'")
    }
  },
  ({ title, isWatch }) => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `get ${title} info and add to my notion Database ${
            isWatch === undefined ? '' : `and I didn't watch it`
          }`
        }
      }
    ]
  })
);
// @ts-ignore
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(
    '📡 imdb-tmdb-info-to-notion MCP Server is now running and ready to receive user requests.'
  );
}

// main();

const notion = new Client({
  auth: process.env.NOTION_API_KEY
});

async function updateNotionBlockChildren(title: string) {
  try {
    const responseQuery = await notion.databases.query({
      database_id: process.env.DATABASE_ID!,
      filter: {
        property: 'Movie & Web Series',
        title: {
          equals: title
        }
      }
    });
    const blockId = responseQuery.results.map(pageObjRes => pageObjRes.id)[0];
    if (!blockId) throw new Error('Movie Title not found');
    const childrenRes = await notion.blocks.children.list({ block_id: blockId });
    const childrenResult = childrenRes.results as BlockObjectResponse[];
    const childrenBlockId = childrenResult.find(
      e => e.type === 'to_do' && e.to_do.rich_text.some(rt => rt.plain_text.includes('Season 02'))
    );
    if (!childrenBlockId) throw new Error('Todo/children block not found');
    // console.log(childrenBlockId.id);

    console.log('Done');
  } catch (error) {
    const notionError = error as { code: APIErrorCode.ObjectNotFound };
    if (notionError.code === APIErrorCode.ObjectNotFound) {
      console.log('NOTION_ERROR : Obj not found in Notion');
    } else {
      console.log(error);
    }
  }
}

updateNotionBlockChildren('testing');
