import axios from 'axios';
import * as cheerio from 'cheerio';
import { Client, APIErrorCode } from '@notionhq/client';
import puppeteer from 'puppeteer';
import 'dotenv/config';

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

async function getSearchResult(min = 2, query) {
  try {
    const response = await axiosInstance.get('', {
      params: {
        q: query,
        num: Math.min(min, 3)
      }
    });
    const result = response.data.items[0].link;
    return result;
    // console.log(result);
  } catch (error) {
    console.log(error);
  }
}

async function getImdbInfo(url = 'https://www.imdb.com/title/tt14044212/') {
  try {
    const headers = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
    };
    const response = await axios.get(url, { headers });
    const html = response.data;
    const $ = cheerio.load(html);

    const ratingEle = $('span.sc-d541859f-1.imUuxf');
    const titleEle = $('span.hero__primary-text');
    const ratingTxt = ratingEle.first().text();
    const titleTxt = titleEle.first().text();
    // console.log('Movie IMDB Info: ', {
    //   ratingTxt,
    //   titleTxt
    // });
    const listGenre = $('a.ipc-chip.ipc-chip--on-baseAlt>span.ipc-chip__text');
    const genre = [];
    listGenre.each((i, ele) => {
      genre[i] = $(ele).first().text();
    });

    const type = $(
      'ul.ipc-inline-list.ipc-inline-list--show-dividers.sc-d3b78e42-2.etAqcO.baseAlt.baseAlt>li.ipc-inline-list__item'
    );
    // console.log(type.first().text());

    const info = {
      title: titleTxt,
      rating: ratingTxt,
      type: type.first().text() === 'TV Series' ? 'Web Series' : 'Movie',
      genre
    };
    return info;
    // console.log(genre);
  } catch (error) {
    console.log(error);
    return null;
  }
}

async function getNotionDetail(title, rating, type, genre, url, imgUrl, platform) {
  const DATABASE_ID = process.env.DATABASE_ID;

  try {
    //   const listUsersResponse = await notion.users.list({});
    //   console.log(listUsersResponse);
    // const myPage = await notion.databases.query({
    //   database_id: DATABASE_ID,
    //   filter: {
    //     property: 'Name',
    //     rich_text: {
    //       contains: 'something-name'
    //     }
    //   }
    // });
    // console.log(myPage.results[0].properties.Name.title);
    const genreObj = [];
    genre.map((val, i) => {
      genreObj[i] = {
        name: val
      };
    });

    const platformObj = [];
    platform.map((val, i) => {
      platformObj[i] = {
        name: val
      };
    });

    const createResponse = await notion.pages.create({
      parent: {
        type: 'database_id',
        database_id: DATABASE_ID
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
          checkbox: true
        },
        Platform: {
          multi_select: platformObj
        }
      }
    });
    // console.log(createResponse);

    const responseQuery = await notion.databases.query({
      database_id: DATABASE_ID,
      filter: {
        property: 'Movie & Web Series',
        title: {
          equals: title
        }
      }
    });

    // const updateResponse = await notion.pages.update({
    //   page_id: responseQuery.results[0].id,
    //   properties: {
    //     count: { number: 45 },
    //     Status: { select: { name: 'Done' } }
    //   }
    // });

    const blockChildrenAppendResponse = await notion.blocks.children.append({
      block_id: responseQuery.results[0].id,
      children: [
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
        },
        {
          object: 'block',
          type: 'column_list',
          column_list: {
            children: [
              {
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
                          url: 'https://image.tmdb.org/t/p/original/uL5mDxbGFoRdMgUhI5rv41xBx03.jpg'
                        }
                      }
                    }
                  ]
                }
              },
              {
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
                          url: 'https://image.tmdb.org/t/p/original/froKabJfmCcLC4vcPs8AmRva2T4.jpg'
                        }
                      }
                    }
                  ]
                }
              }
            ]
          }
        }
      ]
    });
    // console.log(blockChildrenAppendResponse);
    console.log('Done');
  } catch (error) {
    if (error.code === APIErrorCode.ObjectNotFound) {
      console.log('NOTION_ERROR : Obj not found in Notion');
    } else {
      console.log(error);
    }
  }
}

async function main() {
  console.log('starting');
  const url = await getSearchResult(2, 'logan lucky - imdb');
  const { tmdbId, type, imgUrl, platform } = await getTMDBDetails(url);
  const info = await getImdbInfo(url);
  getNotionDetail(info.title, Number(info.rating), type, info.genre, url, imgUrl, platform);
}
main();
async function getTMDBDetails(imdbURL) {
  const imdbID = imdbURL.split('https://www.imdb.com/title/')[1].split('/')[0];
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
    let type, tmdbId, imgUrl;
    let platform = [];

    if (data['movie_results'].length === 0) {
      const tvData = data?.tv_results[0]; // tv
      tmdbId = tvData.id;
      type = tvData.media_type;
      const tvSeriesImageUrl = `https://api.themoviedb.org/3/tv/${tmdbId}/images`;
      const tvSeriesImageResponse = await axios.get(tvSeriesImageUrl, options);
      const imgPath = tvSeriesImageResponse.data.backdrops[0].file_path; // e.g. "/hZkgoQYus5vegHoetLkCJzb17zJ.jpg"

      const tvSeriesWatchProviderUrl = `https://api.themoviedb.org/3/tv/${tmdbId}/watch/providers`;
      const tvSeriesWatchProviderResponse = await axios.get(tvSeriesWatchProviderUrl, options);
      const tvSeriesWatchProviderData = tvSeriesWatchProviderResponse.data;
      const tvSeriesWatchProviderRegion = tvSeriesWatchProviderData.results?.['IN'];
      const tvSeriesWatchProviderRegionFlatRate = tvSeriesWatchProviderRegion?.['flatrate'];
      if (
        tvSeriesWatchProviderRegion == undefined ||
        tvSeriesWatchProviderRegionFlatRate == undefined ||
        !Array.isArray(tvSeriesWatchProviderRegionFlatRate) ||
        tvSeriesWatchProviderRegionFlatRate.length === 0
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
          platform = scrapeResponse;
          platform.shift();
        } catch (err) {
          if (err.name === 'TimeoutError') {
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
      }
      imgUrl = imgBaseUrl + imgPath;
    } else {
      const movieData = data?.movie_results[0]; // movie
      tmdbId = movieData.id;
      type = movieData.media_type;
      const movieImageUrl = `https://api.themoviedb.org/3/movie/${tmdbId}/images`;
      const movieImageResponse = await axios.get(movieImageUrl, options);
      const imgPath = movieImageResponse.data.backdrops[0].file_path;

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
          platform = scrapeResponse;
        } catch (err) {
          if (err.name === 'TimeoutError') {
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
      }
      imgUrl = imgBaseUrl + imgPath;
    }

    return { tmdbId, type, imgUrl, platform };
  } catch (error) {
    console.log(error.message);
    platform = [];
  }
  console.log('Final PlatForm Data : ', platform);
}

async function test(url) {
  let arr = [];

  try {
    const browser = await puppeteer.launch({ headless: true });
    console.log('Done 1');
    const page = await browser.newPage();
    console.log('Done 2');

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
    );
    console.log('Done 3');

    await page.goto(url, { waitUntil: 'networkidle2' });
    console.log('Done 4');

    const tvSeriesSelector = 'div.ipc-slate--baseAlt>div.ipc-media>img.ipc-image';
    const movieSelector =
      'div.ipc-slate.ipc-slate--baseAlt.ipc-slate--dynamic-width.no-description.ipc-sub-grid-item.ipc-sub-grid-item--span-4>div.ipc-media.ipc-media--slate-16x9.ipc-image-media-ratio--slate-16x9.ipc-media--media-radius.ipc-media--baseAlt.ipc-media--slate-m.ipc-media__img>img.ipc-image';
    try {
      await page.waitForSelector(movieSelector, { timeout: 10000 });
      console.log('Done 5');
      const data = await page.$$eval(movieSelector, imgs => imgs.map(img => img.alt));
      console.log('Done 6');
      arr = data;
    } catch (err) {
      console.log('⚠️ Selector not found in time, fallback logic applied');
      if (err.name === 'TimeoutError') {
        arr = ['HDToday', 'OnStream'];
      } else {
        throw err;
      }
    }

    // arr.shift();
    // console.log(arr);

    await browser.close();
    console.log('Done 7');
  } catch (error) {
    console.log(error.name); // TimeoutError - if Time exceed more than 10sec
    arr = []; // fallback to prev.
  }

  console.log('final Arr : ', arr);
}

// test('https://www.imdb.com/title/tt5439796/?ref_=nm_flmg_job_1_cdt_t_6'); // https://www.imdb.com/title/tt1375666/?ref_=nv_sr_srsg_0_tt_4_nm_4_in_0_q_ince
