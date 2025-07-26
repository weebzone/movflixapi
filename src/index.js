import { Router } from 'itty-router';
import index from './routes/index.js';
import search from './routes/search.js';
import title from './routes/title.js';
import reviews from './routes/reviews.js';
import userRoutes from './routes/user/index.js';

const router = Router();

// CORS handler
router.all('*', (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': '*'
      }
    });
  }
});

// Routes
router.get('/', index);
router.get('/search', search);
router.get('/title/:id', title);
router.get('/title/:id/season/:seasonId', title);
router.get('/reviews/:id', reviews);
router.get('/user/:id', userRoutes.info);
router.get('/user/:id/ratings', userRoutes.ratings);

// 404 fallback
router.all('*', () =>
  new Response(JSON.stringify({ error: 'Not Found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  })
);

// Worker export with caching
export default {
  async fetch(request, env, ctx) {
    const cache = caches.default;
    const cacheKey = new Request(request.url, request);
    const isCacheDisabled = env.CACHE_DISABLED === 'true';

    if (!isCacheDisabled) {
      const cached = await cache.match(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const response = await router.handle(request, env, ctx);

      if (
        !isCacheDisabled &&
        request.method === 'GET' &&
        response.status === 200
      ) {
        const cachedResponse = new Response(response.body, response);
        cachedResponse.headers.set('Cache-Control', 's-maxage=600');
        ctx.waitUntil(cache.put(cacheKey, cachedResponse.clone()));
        return cachedResponse;
      }

      return response;
    } catch (err) {
      console.error("Unhandled Worker Error:", err);
      return new Response(JSON.stringify({ error: "Internal error", details: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};
