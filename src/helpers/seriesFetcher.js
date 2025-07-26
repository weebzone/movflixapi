import { parse } from "node-html-parser";
import apiRequestRawHtml from "./apiRequest.js";

export default async function seriesFetcher(id) {
  try {
    const firstSeason = await getSeason({ id, seasonId: 1 });
    return {
      all_seasons: firstSeason.all_seasons,
      seasons: [{ ...firstSeason, all_seasons: undefined }]
    };
  } catch {
    return {
      all_seasons: [],
      seasons: []
    };
  }
}

export async function getSeason({ id, seasonId }) {
  const html = await apiRequestRawHtml(`https://www.imdb.com/title/${id}/episodes?season=${seasonId}`);
  const dom = parse(html);
  const nextData = dom.querySelector("#__NEXT_DATA__");
  const json = JSON.parse(nextData.text);

  const episodes = json.props.pageProps.contentData.section.episodes.items;
  const seasons = json.props.pageProps.contentData.section.seasons;

  return {
    name: json.props.pageProps.contentData.entityMetadata.titleText.text,
    episodes: Object.values(episodes).map((e, i) => ({
      idx: i + 1,
      no: e.episode,
      title: e.titleText,
      image: e.image.url,
      image_large: e.image.url,
      image_caption: e.image.caption,
      plot: e.plot,
      publishedDate: new Date(e.releaseDate.year, e.releaseDate.month - 1, e.releaseDate.day).toISOString(),
      rating: {
        count: e.voteCount,
        star: e.aggregateRating
      }
    })),
    all_seasons: seasons.map((s) => ({
      id: s.value,
      name: `Season ${s.value}`,
      api_path: `/title/${id}/season/${s.value}`
    }))
  };
}
