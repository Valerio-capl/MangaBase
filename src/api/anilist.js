// src/api/anilist.js
import { HTTPError, NetworkError, ParseError } from '../errors/SourceErrors.js';
const BASE_URL = 'https://graphql.anilist.co';

const cache = new Map();
const CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 ore

const fetchFromAniList = async (query, variables) => {
  const cacheKey = JSON.stringify({ query, variables });
  
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new HTTPError(response.status, `HTTP Error: ${response.status}`);
    }
    const json = await response.json();

    if (json.errors) {
      console.error("Errore query AniList:", json.errors[0].message);
      throw new ParseError(`GraphQL Error: ${json.errors[0].message}`);
    }

    if (!json.data?.Page?.media) {
      throw new ParseError("Dati AniList mancanti o formato non valido");
    }

    const normalizedData = json.data.Page.media.map(item => ({
      id: item.id.toString(),
      title: item.title?.english || item.title?.romaji || "unknown",
      coverUrl: item.coverImage?.extraLarge || item.coverImage?.large || null,
    }));

    cache.set(cacheKey, {
      data: normalizedData,
      timestamp: Date.now()
    });

    return normalizedData;
  } catch (error) {
    const staleCache = cache.get(cacheKey);
    if (staleCache) {
      return staleCache.data;
    }
    if (error instanceof HTTPError || error instanceof ParseError || error instanceof NetworkError) {
      throw error;
    }
    if (error.name === 'AbortError') {
      throw new NetworkError("AniList request timed out");
    }
    throw new NetworkError("No connection to reach AniList");
  }
};

export const getTopOngoingManga = async (limit = 10) => {
  const query = `
    query ($perPage: Int) {
      Page (page: 1, perPage: $perPage) {
        media (type: MANGA, status: RELEASING, sort: [POPULARITY_DESC]) {
          id
          title {
            romaji
            english
          }
          coverImage {
            extraLarge
            large
          }
        }
      }
    }
  `;
  
  return await fetchFromAniList(query, { perPage: limit });
};

export const getTopPopularManga = async (limit = 10) => {
  const query = `
    query ($perPage: Int) {
      Page (page: 1, perPage: $perPage) {
        media (type: MANGA, sort: [POPULARITY_DESC]) {
          id
          title {
            romaji
            english
          }
          coverImage {
            extraLarge
            large
          }
        }
      }
    }
  `;
  
  return await fetchFromAniList(query, { perPage: limit });
};