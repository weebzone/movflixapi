export default async function apiRequestRawHtml(url) {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        accept: "text/html",
        "accept-language": "en-US"
      }
    });
    return await res.text();
  }
  
  export async function apiRequestJson(url) {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        accept: "application/json",
        "accept-language": "en-US"
      }
    });
    return await res.json();
  }