import { apiRequestJson } from '../helpers/apiRequest.js';

export default async function search(req) {
  const url = new URL(req.url);
  const query = url.searchParams.get("query");

  if (!query) {
    return new Response(JSON.stringify({ message: "Query param is required" }), { status: 400 });
  }

  try {
    const data = await apiRequestJson(`https://v3.sg.media-imdb.com/suggestion/x/${query}.json?includeVideos=0`);

    const titles = [];

    for (const node of data.d || []) {
      if (!["movie", "tvSeries", "tvMovie"].includes(node.qid)) continue;

      const imageObj = {
        image: null,
        image_large: null,
      };

      if (node.i) {
        imageObj.image_large = node.i.imageUrl;
        try {
          const width = Math.floor((396 * node.i.width) / node.i.height);
          imageObj.image = node.i.imageUrl.replace(
            /[.]_.*_[.]/,
            `._V1_UY396_CR6,0,${width},396_AL_.`
          );
        } catch {
          imageObj.image = imageObj.image_large;
        }
      }

      titles.push({
        id: node.id,
        title: node.l,
        year: node.y,
        type: node.qid,
        ...imageObj,
        api_path: `/title/${node.id}`,
        imdb: `https://www.imdb.com/title/${node.id}`,
      });
    }

    return Response.json({
      query,
      message: `Found ${titles.length} titles`,
      results: titles,
    });
  } catch (error) {
    const errorMessage = error.message.includes("Too many")
      ? "Too many requests error from IMDB, please try again later"
      : error.message;

    return new Response(JSON.stringify({
      query: null,
      results: [],
      message: errorMessage,
    }), { status: 500 });
  }
}