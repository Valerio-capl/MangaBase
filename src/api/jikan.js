import { NetworkError, HTTPError } from '../errors/SourceErrors.js';
const BASE_URL = 'https://api.jikan.moe/v4';

const normalizeJikanData = (data) => {
  return data.map((item) => ({
    id: item.mal_id ? item.mal_id.toString() : Date.now().toString(),
    title: item.title,
    coverUrl: item.images?.jpg?.image_url || null,
  }));
};

const cache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 ore

let lastRequestTime = 0;
const MIN_DELAY = 400; 

const waitForRateLimit = async () => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_DELAY) {
    await new Promise(resolve => 
      setTimeout(resolve, MIN_DELAY - timeSinceLastRequest)
    );
  }
  
  lastRequestTime = Date.now();
};

const fetchFromJikan = async (endpoint) => {
  const cached = cache.get(endpoint);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    await waitForRateLimit();
    const response = await fetch(`${BASE_URL}${endpoint}`);
    
    if (response.status === 429) {
      throw new Error("Rate Limit");
    }
    
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }
    
    const data = await response.json();
    const normalized = normalizeJikanData(data.data);
    
    cache.set(endpoint, {
      data: normalized,
      timestamp: Date.now()
    });
    
    return normalized;
  } catch (error) {
    console.error(`API Jikan Error:`, error);
    
    const staleCache = cache.get(endpoint);
    if (staleCache) {
      return staleCache.data;
    }
    
    if (error.message === "Rate Limit") {
       throw new HTTPError(429, "Rate Limit Jikan");
    }
    if (error.message.includes("HTTP Error")) {
       const status = parseInt(error.message.split(":")[1].trim()) || 500;
       throw new HTTPError(status, "Server Jikan Error");
    }
    throw new NetworkError("No connection to reach Jikan");
  }
};

export const getTopOngoingManga = async (limit = 10) => {
  return await fetchFromJikan(`/top/manga?filter=publishing&limit=${limit}`);
};

export const getTopPopularManga = async (limit = 10) => {
  return await fetchFromJikan(`/top/manga?filter=bypopularity&limit=${limit}`);
};
