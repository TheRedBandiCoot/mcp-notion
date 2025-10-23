// ***🍑🍑🍑 For test change entry-point from "index" to "test" `"main": "dist/src/test"` in "package.json 🍑🍑🍑"
import {
  getImdbInfo,
  getNotionDetail,
  getSearchResult,
  getTMDBDetails,
  updateNotionBlockChildren
} from './service.js';
const aw = false;
const emoji = '😛';
async function main({ giveTitle }: { giveTitle: string }) {
  const { link } = await getSearchResult(2, giveTitle);
  const { title, genre, rating, imdbType } = await getImdbInfo(link);
  const { platform, type, imgArr, imgUrl, number_of_seasons } = await getTMDBDetails(
    link,
    imdbType
  );
  await getNotionDetail(
    {
      title,
      genre,
      rating: Number(rating),
      platform,
      type,
      url: link,
      imgArr,
      imgUrl,
      number_of_seasons
    },
    emoji,
    aw
  );
  await updateNotionBlockChildren(giveTitle, 1);
}

main({ giveTitle: 'platonic - IMDB' });
