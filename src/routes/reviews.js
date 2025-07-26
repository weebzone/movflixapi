import { parse } from 'node-html-parser';
import { decode } from 'html-entities';
import apiRequestRawHtml from '../helpers/apiRequest.js';

const optionsMapper = [
  { key: "helpfulnessScore", name: "helpfulness" },
  { key: "submissionDate", name: "date" },
  { key: "totalVotes", name: "votes" },
  { key: "userRating", name: "rating" }
];

export default async function reviews(req, env, ctx, params) {
  try {
    const id = params.id;
    const url = new URL(req.url);
    const optionParam = url.searchParams.get("option");
    const sortOrder = url.searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
    const nextKey = url.searchParams.get("nextKey");

    let option = optionsMapper[0];
    const foundOption = optionsMapper.find((opt) => opt.name === optionParam);
    if (foundOption) option = foundOption;

    const fetchUrl = `https://www.imdb.com/title/${id}/reviews/_ajax?sort=${option.key}&dir=${sortOrder}` + (nextKey ? `&paginationKey=${nextKey}` : "");
    const rawHtml = await apiRequestRawHtml(fetchUrl);
    const dom = parse(rawHtml);
    const items = dom.querySelectorAll(".imdb-user-review");

    const reviewsArr = items.map((node) => {
      try {
        const review = {
          id: node.getAttribute("data-review-id") ?? null,
          reviewLink: `https://www.imdb.com/review/${node.getAttribute("data-review-id")}`
        };

        const authorNode = node.querySelector(".display-name-link");
        review.author = decode(authorNode?.text?.trim() || "Anonymous");
        const authorUrl = authorNode?.querySelector("a")?.getAttribute("href");
        review.authorUrl = authorUrl ? `https://www.imdb.com${authorUrl}` : null;
        review.user_api_path = authorUrl?.match(/\/user\/(.*?)\//)?.[1] ? `/user/${authorUrl.match(/\/user\/(.*?)\//)[1]}` : null;

        const dateNode = node.querySelector(".review-date");
        review.date = dateNode ? new Date(dateNode.text.trim()).toISOString() : null;

        const starsText = node.querySelector(".ipl-ratings-bar")?.textContent;
        review.stars = starsText ? parseInt(starsText.match(/\\d+/)?.[0] || "0") : 0;

        review.heading = decode(node.querySelector(".title")?.text?.trim() ?? "");
        review.content = decode(node.querySelector(".text")?.text?.trim() ?? "");

        const helpfulText = node.querySelector(".actions")?.textContent?.trim() ?? "";
        const [helpfulVotes, totalVotes] = helpfulText.match(/\\d+/g) || [0, 0];
        review.helpfulNess = {
          votes: parseInt(totalVotes),
          votedAsHelpful: parseInt(helpfulVotes),
          votedAsHelpfulPercentage: totalVotes > 0 ? Math.round((helpfulVotes / totalVotes) * 100) : 0,
        };

        return review;
      } catch {
        return null;
      }
    }).filter(Boolean);

    let next = null;
    const morePage = dom.querySelector(".load-more-data");
    if (morePage) {
      const nextKeyData = morePage.getAttribute("data-key");
      next = `/reviews/${id}?option=${option.name}&sortOrder=${sortOrder}&nextKey=${nextKeyData}`;
    }

    const result = {
      id,
      imdb: `https://www.imdb.com/title/${id}`,
      option: option.name,
      sortOrder,
      availableOptions: optionsMapper.map((opt) => opt.name),
      availableSortOrders: ["asc", "desc"],
      reviews: reviewsArr,
      next_api_path: next
    };

    return Response.json(result);
  } catch (error) {
    return new Response(JSON.stringify({ message: error.message }), { status: 500 });
  }
}