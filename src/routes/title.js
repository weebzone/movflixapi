import getTitle from "../helpers/getTitle.js";
import { getSeason } from "../helpers/seriesFetcher.js";


export default async function title(req) {
    const { id, seasonId } = req.params;
  
    try {
      if (seasonId) {
        const result = await getSeason({ id, seasonId });
        return Response.json({
          id,
          title_api_path: `/title/${id}`,
          imdb: `https://www.imdb.com/title/${id}/episodes?season=${seasonId}`,
          season_id: seasonId,
          ...result
        });
      }
  
      const result = await getTitle(id);
      return Response.json(result);
    } catch (error) {
      return new Response(JSON.stringify({ message: error.message }), { status: 500 });
    }
  }
  