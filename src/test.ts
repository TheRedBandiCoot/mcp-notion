// *** For test change entry-point from "index" to "test" `"main": "dist/src/test"` in "package.json"
import { getImdbInfo, getSearchResult, getTMDBDetails } from './service.js';

async function main({ giveTitle }: { giveTitle: string }) {
  const { link } = await getSearchResult(2, giveTitle);
  const { imdbType } = await getImdbInfo(link);
  const { platform } = await getTMDBDetails(link, imdbType);
  console.log('test', platform);
}
main({ giveTitle: "One Flew Over the Cuckoo's Nest - IMDB" });
