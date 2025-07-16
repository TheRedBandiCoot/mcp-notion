import { BlockObjectRequest, PageObjectResponse } from '@notionhq/client';
import { type AxiosRequestConfig } from 'axios';

export type EmojiRequest = Extract<
  Exclude<PageObjectResponse['icon'], null>,
  { type: 'emoji' }
>['emoji'];

export type ImgURLType = {
  file_path: string;
};
export type AllImgURLType = ImgURLType[];
export type TimeOutErrorType = {
  name: 'TimeoutError';
};
export type GetNotionDetailType = {
  title: string;
  rating: number;
  type: string;
  url: string;
  imgUrl: string;
  number_of_seasons: number;
  genre: string[];
  platform: string[];
  imgArr: string[][];
  userMentionNumberOfSeason?: number;
};

export type ToggleChildrenType = Extract<BlockObjectRequest, { type: 'toggle' }>['children'];
export type GetTmdbIdType = {
  imdbURL: string;
  options?: AxiosRequestConfig<any>;
};
