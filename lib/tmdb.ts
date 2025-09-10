import axios from 'axios';
import Constants from 'expo-constants';

const extra: any = (Constants.expoConfig?.extra as any) || (Constants.manifest as any)?.extra || {};

// Fallback to hardcoded values if not in config (for development)
const apiKey = extra.tmdbApiKey || '9f4cf057ee3b499f94be2fff0161181f';
const accessToken = extra.tmdbAccessToken || 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI5ZjRjZjA1N2VlM2I0OTlmOTRiZTJmZmYwMTYxMTgxZiIsIm5iZiI6MTc1NzMzNTU5OS4yOTQwMDAxLCJzdWIiOiI2OGJlZDAyZjQ0Y2RlMGU1ODQxZjU1NzkiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.yPUpYhlqBflJXk-CORYGtKLhFEC12O8v1V_XOSMucdk';

const client = axios.create({ 
  baseURL: 'https://api.themoviedb.org/3',
  timeout: 30000, // Increased timeout for better reliability
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  }
});

async function safeGet<T>(url: string, params?: any): Promise<T | null> {
  try {
    const res = await client.get(url, { 
      params: { 
        language: 'en-US',
        ...params 
      } 
    });
    
    return res.data as T;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.warn(`TMDB API call failed for ${url}:`, {
        status: error.response?.status,
        message: error.message,
        code: error.code
      });
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