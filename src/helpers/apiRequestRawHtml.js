export default async function apiRequestRawHtml(url) {
  let data = await fetch(url, {
    headers: {
      // Updated to a modern User-Agent
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache",
      "Referer": "https://www.google.com/",
    },
  });
  let text = await data.text();
  return text;
}export default async function apiRequestRawHtml(url) {
  let data = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Safari/537.36",
      accept: "text/html",
      "accept-language": "en-US",
    },
  });
  let text = await data.text();
  return text;
}

export async function apiRequestJson(url) {
  let data = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Safari/537.36",
      accept: "text/html",
      "accept-language": "en-US",
    },
  });
  let text = await data.json();
  return text;
}
