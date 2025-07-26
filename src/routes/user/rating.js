import { parse } from 'node-html-parser';
import apiRequestRawHtml from '../../helpers/apiRequest.js';

const SORT_OPTIONS = {
  most_recent: "date_added,desc",
  oldest: "date_added,asc",
  top_rated: "your_rating,desc",
  worst_rated: "your_rating,asc"
};

export default async function userRating(req, env, ctx, params) {
  const userId = params.id;
  const url = new URL(req.url);
  const sortParam = url.searchParams.get("sort");
  const ratingFilter = url.searchParams.get("ratingFilter");

  const sort = SORT_OPTIONS[sortParam] || SORT_OPTIONS.most_recent;

  const queryParams = new URLSearchParams({ sort });
  if (ratingFilter) queryParams.append("ratingFilter", ratingFilter);

  const constructedUrl = `https://www.imdb.com/user/${userId}/ratings?${queryParams.toString()}`;

  try {
    const response = await fetch(constructedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        accept: "text/html",
        "accept-language": "en-US"
      }
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ message: "User rating not found" }), { status: 404 });
    }

    const rawHtml = await response.text();
    const dom = parse(rawHtml);
    let total_ratings = 0;
    let total_filtered_ratings = 0;
    let all_ratings = [];

    try {
      const match = rawHtml.match(/span> [(]of (\d+)[)] titles/);
      total_ratings = match ? parseInt(match[1]) : 0;
    } catch {}

    try {
      const filtered = dom.querySelector("#lister-header-current-size")?.text.trim();
      total_filtered_ratings = filtered ? parseInt(filtered) : 0;
    } catch {}

    try {
      const listNode = dom.querySelector("#ratings-container");
      const lists = listNode?.querySelectorAll(".mode-detail") ?? [];

      for (const node of lists.slice(0, 100)) {
        const parsed = parseContent(node);
        if (parsed) all_ratings.push(parsed);
      }
    } catch {}

    const allReviews = await parseReviews(userId);

    all_ratings = all_ratings.map((rating) => {
      const review = allReviews.find((r) => r.title_id === rating.id);
      if (review) delete review.title_id;
      return { ...rating, review: review || null };
    });

    return Response.json({
      id: userId,
      imdb: constructedUrl,
      user_api_path: `/user/${userId}`,
      allSortOptions: Object.keys(SORT_OPTIONS),
      allRatingFilters: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
      total_user_ratings: total_ratings,
      total_filtered_ratings,
      ratings: all_ratings
    });
  } catch (error) {
    return new Response(JSON.stringify({ message: error.message }), { status: 500 });
  }
}

async function parseReviews(userId) {
  try {
    const rawHtml = await apiRequestRawHtml(`https://www.imdb.com/user/${userId}/reviews`);
    const dom = parse(rawHtml);
    const nodes = dom.querySelectorAll(".lister-item");

    return nodes.map((node) => {
      const id = node.getAttribute("data-review-id");
      const imdb = node.getAttribute("data-vote-url");

      let titleId = null;
      if (imdb) {
        const match = imdb.match(/title\/(.*?)\/review/);
        if (match && match[1]) titleId = match[1];
      }

      const reviewDate = new Date(node.querySelector(".review-date")?.text.trim()).toISOString();

      return {
        title_id: titleId,
        id,
        date: reviewDate,
        heading: node.querySelector(".title")?.text.trim(),
        content: node.querySelector(".show-more__control")?.text.trim(),
        reviewLink: `https://www.imdb.com/review/${id}`
      };
    });
  } catch {
    return [];
  }
}

function parseContent(node) {
  try {
    const titleNode = node.querySelector(".lister-item-header a");
    const titleUrl = titleNode?.getAttribute("href") ?? "";
    const match = titleUrl.match(/title\/(.*?)\//);
    const titleId = match ? match[1] : null;

    const object = {
      id: titleId,
      imdb: `https://www.imdb.com/title/${titleId}`,
      api_path: `/title/${titleId}`,
      review_api_path: `/reviews/${titleId}`,
      title: titleNode?.text.trim()
    };

    const userRating = node.querySelector(".ipl-rating-star--other-user .ipl-rating-star__rating");
    object.userRating = parseInt(userRating?.text.trim());

    const html = node.innerHTML;
    const dateMatch = html.match(/>Rated on (.*?)<\/p>/);
    object.date = dateMatch ? new Date(dateMatch[1]).toISOString() : null;

    const plotMatch = html.match(/<p class(?:=""|)>\s*(.*?)<\/p>/);
    object.plot = plotMatch ? plotMatch[1].trim() : null;

    const imageNode = node.querySelector(".loadlate");
    const img = imageNode?.getAttribute("loadlate");
    object.image = img;
    object.image_large = img?.replace(/._.*_/, "");

    object.genre = (node.querySelector(".genre")?.textContent ?? "")
      .split(",")
      .map((g) => g.trim())
      .filter(Boolean);

    try {
      const ratingElem = node.querySelector(".ipl-rating-star__rating");
      const votes = node.querySelector("[name='nv']")?.getAttribute("data-value");
      object.rating = {
        star: parseFloat(ratingElem?.textContent.trim()),
        count: parseInt(votes ?? "-1")
      };
    } catch {
      object.rating = { count: -1, star: -1 };
    }

    object.contentRating = node.querySelector(".certificate")?.textContent;
    const runtime = node.querySelector(".runtime")?.textContent;
    object.runtime = runtime;
    object.runtimeSeconds = parseRuntimeIntoSeconds(runtime);

    return object;
  } catch {
    return null;
  }
}

function parseRuntimeIntoSeconds(runtime) {
  try {
    let seconds = 0;
    const hr = runtime.match(/(\d+)\shr/);
    const min = runtime.match(/(\d+)\smin/);
    if (hr) seconds += parseInt(hr[1]) * 3600;
    if (min) seconds += parseInt(min[1]) * 60;
    return seconds;
  } catch {
    return -1;
  }
}
