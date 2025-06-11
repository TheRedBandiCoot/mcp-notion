# TODO

---

## 📝01 - Where To Watch📝

- [Docs for Movie - Watch Provider](https://developer.themoviedb.org/reference/movie-watch-providers)
- [Docs for Tv Series - Watch Provider](https://developer.themoviedb.org/reference/tv-series-watch-providers)

#### 💡Case 01💡

- If false then no error next step, otherwise(if true) then next step webscrape IMDB Data

```js
const objIN = obj.results?.['IN'];
const objINFLAT = objIN?.['flatrate'];
if (
  objIN === undefined ||
  objINFLAT === undefined ||
  !Array.isArray(objINFLAT) ||
  objINFLAT.length === 0
) {
  return 'Found Error GO to Case 2';
} else {
  return 'Okay!!! Next Step';
}
```

```js
obj.results?.['IN'] === undefined ||
  obj.results?.['IN']?.['flatrate'] === undefined ||
  !Array.isArray(obj.results?.['IN']?.['flatrate']) ||
  obj.results?.['IN']?.['flatrate'].length === 0;
```

#### 💡Case 02💡

- 💡imdb webscrape💡
- 💡movie💡

```js
const v = document.querySelectorAll(
  'div.ipc-slate.ipc-slate--baseAlt.ipc-slate--dynamic-width.no-description.ipc-sub-grid-item.ipc-sub-grid-item--span-4>div.ipc-media.ipc-media--slate-16x9.ipc-image-media-ratio--slate-16x9.ipc-media--media-radius.ipc-media--baseAlt.ipc-media--slate-m.ipc-media__img>img.ipc-image'
);
v.forEach(e => console.log(e.alt));
```

- 💡tv💡

```js
const v = document.querySelector("[data-testid='shoveler-items-container']");
const c = v.querySelectorAll(
  'div.ipc-slate.ipc-slate--baseAlt.ipc-slate--dynamic-width.ipc-sub-grid-item.ipc-sub-grid-item--span-4>div.ipc-media.ipc-media--slate-16x9.ipc-image-media-ratio--slate-16x9.ipc-media--media-radius.ipc-media--baseAlt.ipc-media--slate-m.ipc-media__img>img.ipc-image'
);
c.forEach(e => console.log(e.alt));
```

#### 💡Case 03💡

- If **Case 01**(Watch Provider) & **Case 02**(IMDB Web scraping) doesn't work then add default - **`HDToday`** **`OnStream`**

---

## 📝02 - Image URL - Done📝

- Get `IMDB url` from `getSearchResult` func
  - Extract **IMDB ID** from **URL**
    ```js
    // Here Demonstrate Every Way Possibly Extract *IMDB ID* From *IMDB URL*
    const url1 = 'https://www.imdb.com/title/tt1375666/?ref_=fn_all_ttl_1';
    const url2 = 'https://www.imdb.com/title/tt5439796';
    const url3 = 'https://www.imdb.com/title/tt30253473/';
    console.log(url1.split('https://www.imdb.com/title/')[1].split('/')[0]);
    console.log(url2.split('https://www.imdb.com/title/')[1].split('/')[0]);
    console.log(url3.split('https://www.imdb.com/title/')[1].split('/')[0]);
    ```
  - Check Movie or Tv Series
    ```js
    if (data['movie_results'].length === 0) {
      // proceed tv
    } else {
      // proceed movie
    }
    ```
- [Find By `IMDB ID` - Get **TMDB ID**, TMDB - **movie_results/tv_results[0].media_type** : "movie" | "tv"](https://developer.themoviedb.org/reference/find-by-id)
- [~ Movie Get movie image **backdrops[0].file_path** `https://image.tmdb.org/t/p/original - /k5LoZ4nsn1C01NwS0ISHQQa8qp8.jpg`](https://developer.themoviedb.org/reference/movie-images)
- [~ TV Get tv series image same as above](https://developer.themoviedb.org/reference/tv-series-images)
- [Get TV details - specifically **number_of_seasons**](https://developer.themoviedb.org/reference/tv-series-details)

---

## 📝03 - Season Detail

- [Get **TMDB ID** - `number_of_seasons`](https://developer.themoviedb.org/reference/tv-series-details)
