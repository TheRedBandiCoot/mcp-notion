import { PageObjectResponse } from '@notionhq/client';

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
};
