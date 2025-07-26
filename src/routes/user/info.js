import { parse } from 'node-html-parser';

export default async function userInfo(req, env, ctx, params) {
  const userId = params.id;
  try {
    const response = await fetch(`https://www.imdb.com/user/${userId}`, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        accept: "text/html",
        "accept-language": "en-US"
      }
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ message: "User not found" }), { status: 404 });
    }

    const rawHtml = await response.text();
    const dom = parse(rawHtml);
    const nameMatch = rawHtml.match(/<h1>(.*?)<\/h1>/);

    const sinceMatch = rawHtml.match(/IMDb member since (.*?)<\/div>/);

    const imageElem = dom.querySelector("#avatar");

    const data = {
      id: userId,
      imdb: `https://www.imdb.com/user/${userId}`,
      ratings_api_path: `/user/${userId}/ratings`,
      name: nameMatch?.[1] ?? null,
      member_since: sinceMatch?.[1] ?? null,
      image: imageElem?.getAttribute("src")?.replace("._V1_SY100_SX100_", "") ?? null,
      badges: []
    };

    const badgeNodes = dom.querySelector(".badges")?.childNodes ?? [];
    for (const node of badgeNodes) {
      try {
        const name = node.querySelector(".name")?.text;
        const value = node.querySelector(".value")?.text;
        if (name && value) {
          data.badges.push({ name, value });
        }
      } catch {}
    }

    return Response.json(data);
  } catch (error) {
    return new Response(JSON.stringify({ message: error.message }), { status: 500 });
  }
}