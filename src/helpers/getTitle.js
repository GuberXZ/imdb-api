import apiRequestRawHtml from "./apiRequestRawHtml";
import DomParser from "dom-parser";
import seriesFetcher from "./seriesFetcher";

export default async function getTitle(id) {
  const html = await apiRequestRawHtml(`https://www.imdb.com/title/${id}`);
  
  // 1. Extract JSON using Regex (Fastest and most reliable for __NEXT_DATA__)
  let json = null;
  try {
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
    if (match && match[1]) {
      json = JSON.parse(match[1]);
    }
  } catch (e) {
    console.error("Regex parse failed, trying DOM parser...");
  }

  // 2. Fallback to DomParser if Regex fails
  if (!json) {
    const parser = new DomParser();
    const dom = parser.parseFromString(html);
    const nextData = dom.getElementsByAttribute("id", "__NEXT_DATA__")[0];
    if (nextData) {
      try {
        json = JSON.parse(nextData.textContent);
      } catch (e) {
        console.error("DOM textContent parse failed");
      }
    }
  }

  // 3. Last Resort Fallback (Check Meta tags if JSON is completely missing)
  if (!json) {
    const parser = new DomParser();
    const dom = parser.parseFromString(html);
    const metaTitle = dom.getElementsByAttribute("property", "og:title")[0]?.getAttribute("content");
    const metaDesc = dom.getElementsByAttribute("property", "og:description")[0]?.getAttribute("content");
    const metaImage = dom.getElementsByAttribute("property", "og:image")[0]?.getAttribute("content");
    
    if (metaTitle) {
      return {
        id: id,
        imdb: `https://www.imdb.com/title/${id}`,
        title: metaTitle.replace(" - IMDb", ""),
        plot: metaDesc || null,
        image: metaImage || null,
        message: "Retrieved via SEO meta tags (Data blob missing)"
      };
    }
    throw new Error("Unable to parse IMDb page: No data blob or meta tags found.");
  }

  const props = json?.props?.pageProps;

  // Helper to safely get credits
  const getCredits = (lookFor, v) => {
    const result = props?.aboveTheFoldData?.principalCredits?.find(
      (e) => e?.category?.id === lookFor
    );

    return result
      ? result.credits.map((e) => {
          if (v === "2")
            return {
              id: e?.name?.id,
              name: e?.name?.nameText?.text,
            };

          return e?.name?.nameText?.text;
        })
      : [];
  };

  return {
    id: id,
    review_api_path: `/reviews/${id}`,
    imdb: `https://www.imdb.com/title/${id}`,
    contentType: props?.aboveTheFoldData?.titleType?.id ?? null,
    contentRating: props?.aboveTheFoldData?.certificate?.rating ?? "N/A",
    isSeries: props?.aboveTheFoldData?.titleType?.isSeries ?? false,
    productionStatus: props?.aboveTheFoldData?.productionStatus?.currentProductionStage?.id ?? null,
    isReleased: props?.aboveTheFoldData?.productionStatus?.currentProductionStage?.id === "released",
    title: props?.aboveTheFoldData?.titleText?.text ?? "Unknown",
    image: props?.aboveTheFoldData?.primaryImage?.url ?? null,
    images: props?.mainColumnData?.titleMainImages?.edges
      ?.filter((e) => e.__typename === "ImageEdge")
      ?.map((e) => e.node?.url) ?? [],
    plot: props?.aboveTheFoldData?.plot?.plotText?.plainText ?? null,
    runtime: props?.aboveTheFoldData?.runtime?.displayableProperty?.value?.plainText ?? "",
    runtimeSeconds: props?.aboveTheFoldData?.runtime?.seconds ?? 0,
    rating: {
      count: props?.aboveTheFoldData?.ratingsSummary?.voteCount ?? 0,
      star: props?.aboveTheFoldData?.ratingsSummary?.aggregateRating ?? 0,
    },
    award: {
      wins: props?.mainColumnData?.wins?.total ?? 0,
      nominations: props?.mainColumnData?.nominations?.total ?? 0,
    },
    genre: props?.aboveTheFoldData?.genres?.genres?.map((e) => e.id) ?? [],
    releaseDetailed: {
      date: props?.aboveTheFoldData?.releaseDate 
        ? new Date(
            props.aboveTheFoldData.releaseDate.year,
            (props.aboveTheFoldData.releaseDate.month || 1) - 1,
            props.aboveTheFoldData.releaseDate.day || 1
          ).toISOString()
        : null,
      day: props?.aboveTheFoldData?.releaseDate?.day ?? null,
      month: props?.aboveTheFoldData?.releaseDate?.month ?? null,
      year: props?.aboveTheFoldData?.releaseDate?.year ?? null,
    },
    year: props?.aboveTheFoldData?.releaseDate?.year ?? null,
    actors: getCredits("cast"),
    actors_v2: getCredits("cast", "2"),
    directors: getCredits("director"),
    directors_v2: getCredits("director", "2"),
    top_credits: props?.aboveTheFoldData?.principalCredits?.map((e) => ({
      id: e?.category?.id,
      name: e?.category?.text,
      credits: e?.credits?.map((c) => c?.name?.nameText?.text) ?? [],
    })) ?? [],
    ...(props?.aboveTheFoldData?.titleType?.isSeries
      ? await seriesFetcher(id)
      : {}),
  };
}
