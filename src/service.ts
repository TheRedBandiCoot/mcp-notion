import axios from 'axios';
import * as cheerio from 'cheerio';
import { BlockObjectRequest, Client, APIErrorCode } from '@notionhq/client';
import puppeteer from 'puppeteer';
import 'dotenv/config';
import {
  AllImgURLType,
  EmojiRequest,
  GetNotionDetailType,
  TimeOutErrorType
} from '../types/service.types.js';

const defaultImdbLink = 'https://www.imdb.com/title/tt14044212/';

const axiosInstance = axios.create({
  baseURL: 'https://www.googleapis.com/customsearch/v1',
  params: {
    key: process.env.GOOGLE_CUSTOM_SEARCH_API_KEY,
    cx: process.env.PROGRAMMABLE_SEARCHENGINE_KEY
  }
});

const notion = new Client({
  auth: process.env.NOTION_API_KEY
});

export async function getSearchResult(min = 2, query: string): Promise<{ link: string }> {
  try {
    const response = await axiosInstance.get('', {
      params: {
        q: query,
        num: Math.min(min, 3)
      }
    });
    const link = response.data.items[0].link;
    return { link };
  } catch (error) {
    console.log(error);
    return { link: defaultImdbLink }; // if error then default predefined link redirected
  }
}

export async function getImdbInfo(url = 'https://www.imdb.com/title/tt14044212/') {
  try {
    const headers = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
    };
    const imdbResponse = await axios.get(url, { headers });
    const imdbPlotResponse = await axios.get(`${url}plotsummary`, { headers });
    const imdbResponseHtml = imdbResponse.data;
    const imdbPlotResponseHtml = imdbPlotResponse.data;
    const $1 = cheerio.load(imdbResponseHtml);
    const $2 = cheerio.load(imdbPlotResponseHtml);

    const ratingEle = $1('span.sc-d541859f-1.imUuxf');
    const titleEle = $1('span.hero__primary-text');
    const plotEle = $2('.ipc-html-content-inner-div');
    const ratingTxt = ratingEle.first().text();
    const titleTxt = titleEle.first().text();
    const plot = plotEle.first().text();

    const listGenre = $1('a.ipc-chip.ipc-chip--on-baseAlt>span.ipc-chip__text');
    const genre: Array<string> = [];
    listGenre.each((i, ele) => {
      genre[i] = $1(ele).first().text();
    });

    const type = $1(
      'ul.ipc-inline-list.ipc-inline-list--show-dividers.sc-d3b78e42-2.etAqcO.baseAlt.baseAlt>li.ipc-inline-list__item'
    );

    const info = {
      title: titleTxt,
      rating: ratingTxt,
      plot,
      type: type.first().text() === 'TV Series' ? 'Web Series' : 'Movie',
      genre
    };
    return info;
  } catch (error) {
    console.log(error);
    const info = {
      title: '',
      rating: 'ratingTxt',
      plot: '',
      type: '',
      genre: []
    };
    return info;
  }
}

export async function getNotionDetail(
  {
    title,
    rating,
    type,
    genre,
    url,
    imgUrl,
    platform,
    imgArr,
    number_of_seasons
  }: GetNotionDetailType,
  emoji: EmojiRequest,
  aw: boolean = true
) {
  const DATABASE_ID = process.env.DATABASE_ID;

  try {
    const genreObj: Array<{ name: string }> = [];
    genre.map((val, i) => {
      genreObj[i] = {
        name: val
      };
    });

    const platformObj: Array<{ name: string }> = [];
    platform.map((val, i) => {
      platformObj[i] = {
        name: val
      };
    });

    await notion.pages.create({
      parent: {
        type: 'database_id',
        database_id: DATABASE_ID as string
      },
      icon: {
        type: 'emoji',
        emoji
      },
      properties: {
        'Movie & Web Series': {
          title: [{ text: { content: title } }]
        },
        Type: {
          select: { name: type === 'movie' ? 'Movie' : 'Web Series' }
        },
        Rating: {
          number: rating
        },
        'View Detail': {
          url
        },
        Genre: {
          multi_select: genreObj
        },
        AW: {
          checkbox: aw
        },
        Platform: {
          multi_select: platformObj
        }
      }
    });

    const responseQuery = await notion.databases.query({
      database_id: DATABASE_ID as string,
      filter: {
        property: 'Movie & Web Series',
        title: {
          equals: title
        }
      }
    });

    function genImgColumn(arr: string[][]) {
      const finalArr: BlockObjectRequest[] = [];
      const tempChildrenArr: BlockObjectRequest[][] = [];

      arr.map(arrChild => {
        const tempArr: BlockObjectRequest[] = [];
        arrChild.map(imgUrl => {
          const tempChildrenObj: BlockObjectRequest = {
            type: 'column',
            object: 'block',
            column: {
              width_ratio: 0.25,
              children: [
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
              ]
            }
          };

          tempArr.push(tempChildrenObj);
        });
        tempChildrenArr.push(tempArr);
      });

      type ColumnListRequest = Extract<BlockObjectRequest, { type: 'column_list' }>;

      tempChildrenArr.map(e => {
        const tempObj: BlockObjectRequest = {
          object: 'block',
          type: 'column_list',
          column_list: {
            children: e as ColumnListRequest
          }
        };
        finalArr.push(tempObj);
      });

      return finalArr;
    }

    function genTodo(number_of_seasons: number) {
      const todoArr = Array.from({ length: number_of_seasons }, (_, i) => ({
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
          checked: false
        }
      }));
      return todoArr;
    }

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
    if (number_of_seasons > 0)
      genTodo(number_of_seasons).map(e => blocksChildrenArr.push(e as BlockObjectRequest));

    genImgColumn(imgArr).map(e => blocksChildrenArr.push(e));

    await notion.blocks.children.append({
      block_id: responseQuery.results.map(pageObjRes => pageObjRes.id)[0]!,
      children: blocksChildrenArr
    });
  } catch (error) {
    const notionError = error as { code: APIErrorCode.ObjectNotFound };
    if (notionError.code === APIErrorCode.ObjectNotFound) {
      console.log('NOTION_ERROR : Obj not found in Notion');
    } else {
      console.log(error);
    }
  }
}
export async function getTMDBDetails(imdbURL: string): Promise<{
  tmdbId: string;
  type: string;
  imgUrl: string;
  platform: string[];
  imgArr: string[][];
  number_of_seasons: number;
}> {
  const splitStr = 'https://www.imdb.com/title/';
  const imdbID = imdbURL.split(splitStr)[1]?.split('/')[0];
  const imgBaseUrl = 'https://image.tmdb.org/t/p/original';
  try {
    const findByIdUrl = `https://api.themoviedb.org/3/find/${imdbID}?external_source=imdb_id`;
    const options = {
      headers: {
        accept: 'application/json',
        Authorization: `Bearer ${process.env.TMDB_ACCESS_TOKEN}`
      }
    };
    const findByIdResponse = await axios.get(findByIdUrl, options);
    const data = findByIdResponse.data;
    let type: string, tmdbId: string, imgUrl: string, imgArr: string[][];
    let platform: Array<string> = [];
    let number_of_seasons: number = 0;

    function genAllImgURL(arr: AllImgURLType) {
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

    function genIMDBPlatformFixedName(arr: string[]) {
      const tempArr: string[] = [];
      const predefineNameArr = ['JioCinema', 'JioHotstar', 'Netflix'];
      arr.map(e => tempArr.push(e.split('Watch on ')[1]!));
      tempArr.map((e, i) => {
        switch (e) {
          case predefineNameArr[0]:
            tempArr[i] = 'Jio Cinema';
            break;
          case predefineNameArr[1]:
            tempArr[i] = 'Jio Hotstar';
            break;
        }
      });
      return tempArr;
    }
    function genTMDBPlatformFixedName(arr: string[]) {
      const predefineNameArr = ['Amazon Prime Video', 'Zee5'];
      arr.map((e, i) => {
        switch (e) {
          case predefineNameArr[0]:
            arr[i] = 'Prime Video';
            break;
          case predefineNameArr[1]:
            arr[i] = 'ZEE5';
            break;
        }
      });
      return arr;
    }

    if (data['movie_results'].length === 0) {
      const tvData = data?.tv_results[0]; // tv
      tmdbId = tvData.id;
      type = tvData.media_type;
      const tvSeriesImageUrl = `https://api.themoviedb.org/3/tv/${tmdbId}/images`;
      const tvSeriesImageResponse = await axios.get(tvSeriesImageUrl, options);
      const imgPath = tvSeriesImageResponse.data.backdrops[0].file_path; // e.g. "/hZkgoQYus5vegHoetLkCJzb17zJ.jpg"

      // TV Show Number Of Seasons
      const tvSeriesNumberOfSeasonsUrl = `https://api.themoviedb.org/3/tv/${tmdbId}`;
      const tvSeriesNumberOfSeasonsResponse = await axios.get(tvSeriesNumberOfSeasonsUrl, options);
      number_of_seasons = tvSeriesNumberOfSeasonsResponse.data.number_of_seasons;

      // Tv Img Arr
      imgArr = genAllImgURL(tvSeriesImageResponse.data.backdrops);

      const tvSeriesWatchProviderUrl = `https://api.themoviedb.org/3/tv/${tmdbId}/watch/providers`;
      const tvSeriesWatchProviderResponse = await axios.get(tvSeriesWatchProviderUrl, options);
      const tvSeriesWatchProviderData = tvSeriesWatchProviderResponse.data;
      const tvSeriesWatchProviderRegion = tvSeriesWatchProviderData.results?.['IN'];
      const tvSeriesWatchProviderRegionFlatRate = tvSeriesWatchProviderRegion?.['flatrate'];
      if (
        tvSeriesWatchProviderRegion == undefined ||
        tvSeriesWatchProviderRegionFlatRate == undefined ||
        !Array.isArray(tvSeriesWatchProviderRegionFlatRate) ||
        tvSeriesWatchProviderRegionFlatRate.length === 0 /* || true */ // testing
      ) {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.setUserAgent(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
        );
        await page.goto(imdbURL, { waitUntil: 'networkidle2' });
        const selector = 'div.ipc-slate--baseAlt>div.ipc-media>img.ipc-image';
        try {
          await page.waitForSelector(selector, { timeout: 10000 });
          const scrapeResponse = await page.$$eval(selector, imgs => imgs.map(img => img.alt));
          platform = genIMDBPlatformFixedName(scrapeResponse);
          platform.shift();
        } catch (err) {
          const timeOutError = err as TimeOutErrorType;
          if (timeOutError.name === 'TimeoutError') {
            platform = ['HDToday', 'OnStream'];
          } else {
            throw err;
          }
        }
        await browser.close();
      } else {
        tvSeriesWatchProviderRegionFlatRate.map(e => {
          platform.push(e.provider_name);
        });
        platform = genTMDBPlatformFixedName(platform);
      }
      imgUrl = imgBaseUrl + imgPath;
    } else {
      const movieData = data?.movie_results[0]; // movie
      tmdbId = movieData.id;
      type = movieData.media_type;
      const movieImageUrl = `https://api.themoviedb.org/3/movie/${tmdbId}/images`;
      const movieImageResponse = await axios.get(movieImageUrl, options);
      const imgPath = movieImageResponse.data.backdrops[0].file_path;

      // Movie Img Arr
      imgArr = genAllImgURL(movieImageResponse.data.backdrops);

      const movieWatchProviderUrl = `https://api.themoviedb.org/3/movie/${tmdbId}/watch/providers`;
      const movieWatchProviderResponse = await axios.get(movieWatchProviderUrl, options);
      const movieWatchProviderData = movieWatchProviderResponse.data;
      const movieWatchProviderRegion = movieWatchProviderData.results?.['IN'];
      const movieWatchProviderRegionFlatRate = movieWatchProviderRegion?.['flatrate'];
      if (
        movieWatchProviderRegion == undefined ||
        movieWatchProviderRegionFlatRate == undefined ||
        !Array.isArray(movieWatchProviderRegionFlatRate) ||
        movieWatchProviderRegionFlatRate.length === 0
      ) {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.setUserAgent(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
        );
        await page.goto(imdbURL, { waitUntil: 'networkidle2' });
        const selector =
          'div.ipc-slate.ipc-slate--baseAlt.ipc-slate--dynamic-width.no-description.ipc-sub-grid-item.ipc-sub-grid-item--span-4>div.ipc-media.ipc-media--slate-16x9.ipc-image-media-ratio--slate-16x9.ipc-media--media-radius.ipc-media--baseAlt.ipc-media--slate-m.ipc-media__img>img.ipc-image';
        try {
          await page.waitForSelector(selector, { timeout: 10000 });
          const scrapeResponse = await page.$$eval(selector, imgs => imgs.map(img => img.alt));
          platform = genIMDBPlatformFixedName(scrapeResponse);
        } catch (err) {
          const timeOutError = err as TimeOutErrorType;
          if (timeOutError.name === 'TimeoutError') {
            platform = ['HDToday', 'OnStream'];
          } else {
            throw err;
          }
        }
        await browser.close();
      } else {
        movieWatchProviderRegionFlatRate.map(e => {
          platform.push(e.provider_name);
        });
        platform = genTMDBPlatformFixedName(platform);
      }
      imgUrl = imgBaseUrl + imgPath;
    }

    return { tmdbId, type, imgUrl, platform, imgArr, number_of_seasons };
  } catch (error) {
    return { platform: [], imgArr: [], imgUrl: '', number_of_seasons: 0, tmdbId: '', type: '' };
  }
}
