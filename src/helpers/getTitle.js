import apiRequestRawHtml from "./apiRequestRawHtml";
import DomParser from "dom-parser";
import seriesFetcher from "./seriesFetcher";

export default async function getTitle(id) {
  const parser = new DomParser();
  const html = await apiRequestRawHtml(`https://www.imdb.com/title/${id}`);
  const dom = parser.parseFromString(html);
  
  // Fix for the "textContent" error
  const nextDataElements = dom.getElementsByAttribute("id", "__NEXT_DATA__");
  if (!nextDataElements || nextDataElements.length === 0) {
    throw new Error("Could not find __NEXT_DATA__ on IMDb page. The page structure may have changed.");
  }

  const json = JSON.parse(nextDataElements[0].textContent);
  const props = json?.props?.pageProps;

  // Helper to safely get credits with optional chaining
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

  // Return object with optional chaining (?.) and nullish coalescing (??)
  return {
    id: id,
    review_api_path: `/reviews/${id}`,
    imdb: `https://www.imdb.com/title/${id}`,
    contentType: props?.aboveTheFoldData?.titleType?.id ?? null,
    contentRating: props?.aboveTheFoldData?.certificate?.rating ?? "N/A",
    isSeries: props?.aboveTheFoldData?.titleType?.isSeries ?? false,
    productionStatus:
      props?.aboveTheFoldData?.productionStatus?.currentProductionStage?.id ?? null,
    isReleased:
      props?.aboveTheFoldData?.productionStatus?.currentProductionStage?.id === "released",
    title: props?.aboveTheFoldData?.titleText?.text ?? "Unknown Title",
    image: props?.aboveTheFoldData?.primaryImage?.url ?? null,
    images: props?.mainColumnData?.titleMainImages?.edges
      ?.filter((e) => e.__typename === "ImageEdge")
      ?.map((e) => e.node?.url) ?? [],
    plot: props?.aboveTheFoldData?.plot?.plotText?.plainText ?? null,
    runtime:
      props?.aboveTheFoldData?.runtime?.displayableProperty?.value?.plainText ?? "",
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
      releaseLocation: {
        country: props?.mainColumnData?.releaseDate?.country?.text ?? null,
        cca2: props?.mainColumnData?.releaseDate?.country?.id ?? null,
      },
      originLocations: props?.mainColumnData?.countriesOfOrigin?.countries?.map(
        (e) => ({
          country: e.text ?? null,
          cca2: e.id ?? null,
        })
      ) ?? [],
    },
    year: props?.aboveTheFoldData?.releaseDate?.year ?? null,
    spokenLanguages: props?.mainColumnData?.spokenLanguages?.spokenLanguages?.map(
      (e) => ({
        language: e.text,
        id: e.id,
      })
    ) ?? [],
    filmingLocations: props?.mainColumnData?.filmingLocations?.edges?.map(
      (e) => e.node?.text
    ) ?? [],
    actors: getCredits("cast"),
    actors_v2: getCredits("cast", "2"),
    creators: getCredits("creator"),
    creators_v2: getCredits("creator", "2"),
    directors: getCredits("director"),
    directors_v2: getCredits("director", "2"),
    writers: getCredits("writer"),
    writers_v2: getCredits("writer", "2"),
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
