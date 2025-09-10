import axios from 'axios';
import Constants from 'expo-constants';

const extra: any = (Constants.expoConfig?.extra as any) || (Constants.manifest as any)?.extra || {};

// Fallback to hardcoded values if not in config (for development)
const apiKey = extra.tmdbApiKey || '9f4cf057ee3b499f94be2fff0161181f';
const accessToken = extra.tmdbAccessToken || 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI5ZjRjZjA1N2VlM2I0OTlmOTRiZTJmZmYwMTYxMTgxZiIsIm5iZiI6MTc1NzMzNTU5OS4yOTQwMDAxLCJzdWIiOiI2OGJlZDAyZjQ0Y2RlMGU1ODQxZjU1NzkiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.yPUpYhlqBflJXk-CORYGtKLhFEC12O8v1V_XOSMucdk';

const client = axios.create({ 
  baseURL: 'https://api.themoviedb.org/3',
  timeout: 20000, // Allow slower networks before timing out
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  }
});

// Note: We will explicitly add api_key per call in safeGet

function buildUrl(path: string, params?: Record<string, any>) {
  const searchParams = new URLSearchParams({
    api_key: apiKey,
    language: 'en-US',
    ...(Object.fromEntries(Object.entries(params || {}).map(([k, v]) => [k, String(v)])))
  });
  return `https://api.themoviedb.org/3/${path}?${searchParams.toString()}`;
}

async function fetchWithTimeout(input: string, init: RequestInit & { timeoutMs?: number } = {}) {
  const { timeoutMs = 20000, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(input, { ...rest, signal: controller.signal });
    return resp;
  } finally {
    clearTimeout(timer);
  }
}

async function safeGet<T>(url: string, params?: any): Promise<T | null> {
  try {
    const mergedParams = { api_key: apiKey, language: 'en-US', ...(params || {}) };
    const fullUrl = buildUrl(url, mergedParams);

    // Run axios and fetch in parallel, take first success
    const axiosPromise = client.get(url, { params: mergedParams, withCredentials: false })
      .then(r => ({ source: 'axios' as const, ok: true as const, data: r.data }))
      .catch(e => ({ source: 'axios' as const, ok: false as const, error: e }));

    const fetchPromise = fetchWithTimeout(fullUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      timeoutMs: 20000,
    })
      .then(async r => r.ok 
        ? ({ source: 'fetch' as const, ok: true as const, data: await r.json() }) 
        : ({ source: 'fetch' as const, ok: false as const, error: new Error(`HTTP ${r.status}`) }))
      .catch(e => ({ source: 'fetch' as const, ok: false as const, error: e }));

    const first = await Promise.race([axiosPromise, fetchPromise]);
    if (first.ok) return first.data as T;

    // If the first failed, await the other
    const second = await (first.source === 'axios' ? fetchPromise : axiosPromise);
    if (second.ok) return second.data as T;

    // Final retry: fetch without Authorization header
    try {
      const r = await fetchWithTimeout(fullUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        timeoutMs: 20000,
      });
      if (r.ok) return (await r.json()) as T;
      console.warn(`TMDB retry response not OK for ${url}:`, { status: r.status, statusText: r.statusText });
    } catch (retryErr) {
      console.warn(`TMDB retry without auth failed for ${url}:`, retryErr);
    }

    // One more delayed retry without auth in case of transient network hiccup
    try {
      await new Promise(res => setTimeout(res, 1500));
      const r2 = await fetchWithTimeout(fullUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        timeoutMs: 20000,
      });
      if (r2.ok) return (await r2.json()) as T;
      console.warn(`TMDB delayed retry not OK for ${url}:`, { status: r2.status, statusText: r2.statusText });
    } catch (retryErr2) {
      console.warn(`TMDB delayed retry error for ${url}:`, retryErr2);
    }

    throw (first as any).error || (second as any).error || new Error('Unknown TMDB error');
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.warn(`TMDB API call failed for ${url}:`, {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        code: error.code,
      });
    } else {
      console.warn(`TMDB API call error (non-Axios) for ${url}:`, error);
    }
    return null as any;
  }
}

export async function getCategory(kind: 'trending' | 'popular' | 'upcoming'): Promise<any[]> {
  let data: any = null;
  
  try {
    switch (kind) {
      case 'trending':
        data = await safeGet<{ results: any[] }>('trending/movie/week');
        break;
      case 'popular':
        data = await safeGet<{ results: any[] }>('movie/popular', { page: 1 });
        break;
      case 'upcoming':
        data = await safeGet<{ results: any[] }>('movie/upcoming', { page: 1 });
        break;
      default:
        console.warn(`Unknown category: ${kind}`);
        return [];
    }
    
    const results = data?.results ?? [];
    
    // Filter out movies without posters for better UI
    const filteredResults = results.filter((movie: any) => movie.poster_path);
    
    if (filteredResults.length > 0) {
      return filteredResults.slice(0, 20); // Limit to 20 items for performance
    }
  } catch (error) {
    console.error(`Error fetching ${kind} movies:`, error);
  }
  
  // Enhanced fallback: return realistic placeholders when API is unavailable
  return Array.from({ length: 8 }).map((_, i) => ({ 
    id: 10000 + i, 
    title: `${kind.charAt(0).toUpperCase() + kind.slice(1)} Movie #${i + 1}`, 
    overview: 'Content temporarily unavailable. Please check your internet connection.',
    poster_path: null,
    release_date: new Date().toISOString().split('T')[0],
    vote_average: 7.5 + Math.random() * 2
  }));
}

export async function searchMovies(query: string): Promise<any[]> {
  if (!query?.trim()) return [];
  
  try {
    const data = await safeGet<{ results: any[] }>('search/movie', { 
      query: query.trim(),
      page: 1,
      include_adult: false // Filter out adult content
    });
    
    const results = data?.results ?? [];
    
    // Filter and sort results
    return results
      .filter((movie: any) => movie.poster_path) // Only movies with posters
      .sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0)) // Sort by popularity
      .slice(0, 50); // Limit search results
      
  } catch (error) {
    console.error('Search movies error:', error);
    return [];
  }
}

export async function getMovieDetails(id: number): Promise<any | null> {
  try {
    const data = await safeGet<any>(`movie/${id}`, { 
      append_to_response: 'credits,videos,similar,reviews,keywords'
    });
    
    if (data) {
      // Clean up the data for better UI display
      return {
        ...data,
        genres: data.genres || [],
        credits: {
          cast: (data.credits?.cast || []).slice(0, 20), // Limit cast members
          crew: (data.credits?.crew || []).slice(0, 10)  // Limit crew members
        },
        videos: {
          results: (data.videos?.results || []).filter((video: any) => 
            video.type === 'Trailer' && video.site === 'YouTube'
          )
        },
        similar: {
          results: (data.similar?.results || []).slice(0, 10)
        }
      };
    }
  } catch (error) {
    console.error(`Error fetching movie details for ID ${id}:`, error);
  }
  
  // Enhanced fallback with more realistic data structure
  return { 
    id, 
    title: 'Content Unavailable', 
    overview: 'Movie details are temporarily unavailable. Please check your internet connection and try again.', 
    genres: [],
    release_date: new Date().toISOString().split('T')[0],
    vote_average: 0,
    runtime: 0,
    credits: { cast: [], crew: [] },
    videos: { results: [] },
    poster_path: null,
    backdrop_path: null
  } as any;
}

export async function getMovieVideos(id: number): Promise<any[]> {
  try {
    const data = await safeGet<{ results: any[] }>(`movie/${id}/videos`);
    const results = data?.results ?? [];
    
    // Filter for YouTube trailers and teasers, prioritize official content
    return results
      .filter((video: any) => 
        video.site === 'YouTube' && 
        (video.type === 'Trailer' || video.type === 'Teaser') &&
        video.official !== false
      )
      .sort((a: any, b: any) => {
        // Prioritize trailers over teasers
        if (a.type === 'Trailer' && b.type === 'Teaser') return -1;
        if (a.type === 'Teaser' && b.type === 'Trailer') return 1;
        return 0;
      })
      .slice(0, 5); // Limit to 5 videos
      
  } catch (error) {
    console.error(`Error fetching videos for movie ID ${id}:`, error);
    return [];
  }
}

// New function: Get movie recommendations
export async function getMovieRecommendations(id: number): Promise<any[]> {
  try {
    const data = await safeGet<{ results: any[] }>(`movie/${id}/recommendations`);
    const results = data?.results ?? [];
    
    return results
      .filter((movie: any) => movie.poster_path)
      .slice(0, 10);
      
  } catch (error) {
    console.error(`Error fetching recommendations for movie ID ${id}:`, error);
    return [];
  }
}

// New function: Get top rated movies
export async function getTopRatedMovies(): Promise<any[]> {
  try {
    const data = await safeGet<{ results: any[] }>('movie/top_rated', { page: 1 });
    const results = data?.results ?? [];
    
    return results
      .filter((movie: any) => movie.poster_path)
      .slice(0, 20);
      
  } catch (error) {
    console.error('Error fetching top rated movies:', error);
    return [];
  }
}