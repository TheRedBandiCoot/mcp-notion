import { AppendBlockChildrenResponse, BlockObjectRequest, Client } from '@notionhq/client';
import type {
  AllImgURLType,
  GetTmdbIdType,
  ToggleChildrenType
} from '../../types/service.types.js';
import axios from 'axios';

export function genTodo(number_of_seasons: number, userMentionNumberOfSeason?: number) {
  let todoArr = Array.from({ length: number_of_seasons }, (_, i) => ({
    object: 'block',
    type: 'to_do',
    to_do: {
      rich_text: [
        {
          type: 'text',
          text: {
            content: `Season ${i + 1 > 9 ? i + 1 : `0${i + 1}`}`
          }
        }
      ],
      checked: userMentionNumberOfSeason
        ? userMentionNumberOfSeason >= i + 1
          ? true
          : false
        : false
    }
  }));
  const calloutTempObj = {
    object: 'block',
    type: 'callout',
    callout: {
      icon: { type: 'emoji', emoji: '📋' },
      rich_text: [{ type: 'text', text: { content: 'Seasons Info' } }],
      children: todoArr
    }
  };
  return calloutTempObj;
}
export function genImgColumn(arr: string[][]) {
  // const finalArr: BlockObjectRequest[] = [];
  // const tempChildrenArr: BlockObjectRequest[][] = [];

  // arr.map(arrChild => {
  //   const tempArr: BlockObjectRequest[] = [];
  //   arrChild.map(imgUrl => {
  //     const tempChildrenObj: BlockObjectRequest = {
  //       type: 'column',
  //       object: 'block',
  //       column: {
  //         width_ratio: 0.25,
  //         children: [
  //           {
  //             object: 'block',
  //             type: 'image',
  //             image: {
  //               type: 'external',
  //               external: {
  //                 url: imgUrl
  //               }
  //             }
  //           }
  //         ]
  //       }
  //     };

  //     tempArr.push(tempChildrenObj);
  //   });
  //   tempChildrenArr.push(tempArr);
  // });

  // type ColumnListRequest = Extract<BlockObjectRequest, { type: 'column_list' }>;

  // tempChildrenArr.map(e => {
  //   const tempObj: BlockObjectRequest = {
  //     object: 'block',
  //     type: 'column_list',
  //     column_list: {
  //       children: e as ColumnListRequest
  //     }
  //   };
  //   finalArr.push(tempObj);
  // });

  const imgArr: BlockObjectRequest[] = [];
  arr.flat().map((url, i) => {
    if (i > 99) return;
    const tempImgObj: BlockObjectRequest = {
      object: 'block',
      type: 'image',
      image: { type: 'external', external: { url } }
    };
    imgArr.push(tempImgObj);
  });
  const calloutImgTempObj: BlockObjectRequest = {
    object: 'block',
    type: 'toggle',
    toggle: {
      rich_text: [{ type: 'text', text: { content: 'Posters' } }],
      children: imgArr as ToggleChildrenType
    }
  };
  return calloutImgTempObj;
}
export function returnBlockChildren(imgUrl: string) {
  const blocksChildrenArr: BlockObjectRequest[] = [
    {
      object: 'block',
      type: 'heading_1',
      heading_1: {
        rich_text: [{ type: 'text', text: { content: 'Movie Poster Here' } }]
      }
    },
    {
      object: 'block',
      type: 'divider',
      divider: {}
    },
    {
      object: 'block',
      type: 'image',
      image: {
        type: 'external',
        external: {
          url: imgUrl
        }
      }
    }
  ];
  return blocksChildrenArr;
}

export async function getTmdbId({ imdbURL, options }: GetTmdbIdType) {
  const splitStr = 'https://www.imdb.com/title/';
  const imdbID = imdbURL.split(splitStr)[1]?.split('/')[0];
  const findByIdUrl = `https://api.themoviedb.org/3/find/${imdbID}?external_source=imdb_id`;

  const findByIdResponse = await axios.get(findByIdUrl, options);
  const data = findByIdResponse.data;
  return data;
}

export function genAllImgURL(
  arr: AllImgURLType,
  imgBaseUrl: string = 'https://image.tmdb.org/t/p/original'
) {
  const tempArr: string[][] = [];
  let tempChildArr: string[] = [];
  arr.map((e, i) => {
    tempChildArr.push(`${imgBaseUrl}${e.file_path}`);
    if ((i + 1) % 4 === 0) {
      tempArr.push(tempChildArr);
      tempChildArr = [];
    }
  });
  return tempArr;
}

export async function updateAllImgs(
  isImgBlock: boolean = true,
  notion: Client,
  childBlock: AppendBlockChildrenResponse,
  imgArr: string[][],
  imgUrl?: string
) {
  //@ts-ignore
  const toggleBlockId = childBlock.results.filter(e => e.type === 'toggle')[0].id;

  const response = await notion.blocks.children.list({
    block_id: toggleBlockId,
    page_size: 99
  });
  //@ts-ignore
  const imgBlocksArrId = response.results.filter(e => e.type === 'image').map(j => j.id);
  // console.log('imgBlockId', imgBlocksArrId);

  const imgFlatArr = imgArr.flat();
  await new Promise(r => setTimeout(r, 3000));
  if (isImgBlock) {
    //@ts-ignore
    const imgBlockId = childBlock.results.filter(e => e.type === 'image')[0].id;
    await notion.blocks.update({
      block_id: imgBlockId,
      image: {
        external: { url: imgUrl as string }
      }
    });
  }

  console.log(`🌉 Total image : ${imgBlocksArrId.length}`);
  for (let i = 0; i < imgBlocksArrId.length; i++) {
    try {
      await notion.blocks.update({
        block_id: imgBlocksArrId[i] as string,
        image: {
          external: { url: imgFlatArr[i] as string }
        }
      });
      // console.log(`✅ Updated image ${i + 1}/${imgBlocksArrId.length}`);
    } catch (err: any) {
      // console.warn(`⚠️ Failed image ${i + 1}: ${err.code || err.message}`);
    }
    await new Promise(r => setTimeout(r, 500));
  }
}
