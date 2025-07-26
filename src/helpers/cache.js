export function withCache() {
    return {
      async fetch(request, env, ctx) {
        const cache = caches.default;
        const cacheKey = new Request(request.url, request);
        const cachedResponse = await cache.match(cacheKey);
  
        const getCacheTTL = () => {
          const url = request.url.toLowerCase();
          if (url.includes("/reviews")) return 86400;
          if (url.includes("/title")) return 86400;
          if (url.includes("/search")) return 172800;
          return 86400;
        };
  
        if (cachedResponse) {
          return cachedResponse;
        }
  
        // ctx.next() does NOT exist — call the next handler manually
        const response = await fetch(request);
  
        if (response.status === 200 && env?.CACHE_DISABLED !== "true") {
          response.headers.set("Cache-Control", `public, max-age=${getCacheTTL()}`);
          ctx.waitUntil(cache.put(cacheKey, response.clone()));
        }
  
        return response;
      }
    };
  }
  