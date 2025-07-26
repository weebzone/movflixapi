export default async function index() {
  return new Response(JSON.stringify({
    status: "Running",
    name: "imdb-api",
    version: "1.0.0"
  }), {
    headers: { "Content-Type": "application/json" }
  });
}
