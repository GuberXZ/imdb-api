import apiRequestRawHtml from "./apiRequestRawHtml";
import DomParser from "dom-parser";
import seriesFetcher from "./seriesFetcher";

export default async function getTitle(id) {
  const parser = new DomParser();
  const html = await apiRequestRawHtml(`https://www.imdb.com/title/${id}`);
  const dom = parser.parseFromString(html);
  
  const nextDataElements = dom.getElementsByAttribute("id", "__NEXT_DATA__");
  
  // --- STRATEGY A: Standard NEXT_DATA Parsing ---
  if (nextDataElements && nextDataElements.length > 0) {
    const json = JSON.parse(nextDataElements[0].textContent);
    const props = json?.props?.pageProps;

    const getCredits = (lookFor, v) => {
      const result = props?.aboveTheFoldData?.principalCredits?.find(e => e?.category?.id === lookFor);
      return result ? result.credits.map((e) => (v === "2" ? { id: e?.name?.id, name: e?.name?.nameText?.text } : e?.name?.nameText?.text)) : [];
    };

    return {
      id: id,
      imdb: `https://www.imdb.com/title/${id}`,
      contentType: props?.aboveTheFoldData?.titleType?.id ?? "movie",
      title: props?.aboveTheFoldData?.titleText?.text || "Unknown",
      image: props?.aboveTheFoldData?.primaryImage?.url || null,
      plot: props?.aboveTheFoldData?.plot?.plotText?.plainText || null,
      rating: {
        count: props?.aboveTheFoldData?.ratingsSummary?.voteCount ?? 0,
        star: props?.aboveTheFoldData?.ratingsSummary?.aggregateRating ?? 0,
      },
      // ... (include other fields from the previous safe version)
      actors: getCredits("cast"),
      directors: getCredits("director"),
    };
  }

  // --- STRATEGY B: HTML Fallback (When NEXT_DATA is missing) ---
  // This extracts basic info from Meta tags which are always there for SEO
  const metaTitle = dom.getElementsByAttribute("property", "og:title")[0]?.getAttribute("content");
  const metaImage = dom.getElementsByAttribute("property", "og:image")[0]?.getAttribute("content");
  const metaDescription = dom.getElementsByAttribute("property", "og:description")[0]?.getAttribute("content");
  const metaType = dom.getElementsByAttribute("property", "og:type")[0]?.getAttribute("content");

  if (metaTitle) {
    return {
      id: id,
      imdb: `https://www.imdb.com/title/${id}`,
      contentType: metaType || "movie",
      title: metaTitle.replace(" - IMDb", ""),
      image: metaImage || null,
      plot: metaDescription || null,
      rating: { count: 0, star: 0 },
      isReleased: false,
      actors: [],
      directors: [],
      genre: [],
      message: "Data retrieved via fallback (standard JSON blob missing on IMDb)"
    };
  }

  throw new Error("Unable to parse IMDb page: No data blob or meta tags found.");
}
