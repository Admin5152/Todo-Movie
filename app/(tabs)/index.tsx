import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getCategory } from '../../lib/tmdb';

const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;

// Simplified responsive calculations
const posterWidth = Math.round(screenWidth * 0.36);
const posterHeight = Math.round(posterWidth * 1.5);

// Simplified responsive font size
const getResponsiveFontSize = (baseSize: number) => {
  if (screenWidth < 375) return baseSize * 0.9;
  if (screenWidth > 768) return baseSize * 1.2;
  return baseSize;
};

// Simplified responsive padding
const getResponsivePadding = (basePadding: number) => {
  if (screenWidth < 375) return basePadding * 0.8;
  if (screenWidth > 768) return basePadding * 1.3;
  return basePadding;
};

type Movie = { 
  id: number; 
  title?: string; 
  name?: string; 
  poster_path?: string; 
  release_date?: string; 
  first_air_date?: string;
  vote_average?: number;
};

function Row({ title, data, loading }: { title: string; data: Movie[]; loading: boolean }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <Text style={styles.rowTitle}>{title}</Text>
        {data.length > 0 && (
          <TouchableOpacity style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>Loading {title.toLowerCase()}...</Text>
        </View>
      ) : data.length > 0 ? (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {data.map((movie, index) => (
            <TouchableOpacity 
              key={`${title}-${movie.id}`} 
              style={styles.movieCard}
              onPress={() => router.push(`/movie/${movie.id}`)}
              activeOpacity={0.8}
            >
              <View style={styles.posterContainer}>
                <Image
                  source={movie.poster_path 
                    ? { uri: `https://image.tmdb.org/t/p/w500${movie.poster_path}` } 
                    : require('../../assets/images/Todo.png')
                  } 
                  style={styles.poster}
                  resizeMode="cover"
                />
                {movie.vote_average && movie.vote_average > 0 && (
                  <View style={styles.ratingBadge}>
                    <Text style={styles.ratingText}>
                      {movie.vote_average.toFixed(1)}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.movieInfo}>
                <Text numberOfLines={2} style={styles.movieTitle}>
                  {movie.title || movie.name || 'Untitled'}
                </Text>
                {(movie.release_date || movie.first_air_date) && (
                  <Text style={styles.movieYear}>
                    {new Date(movie.release_date || movie.first_air_date || '').getFullYear()}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No {title.toLowerCase()} available</Text>
        </View>
      )}
    </View>
  );
}

export default function HomeTab() {
  const [trending, setTrending] = useState<Movie[]>([]);
  const [popular, setPopular] = useState<Movie[]>([]);
  const [upcoming, setUpcoming] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    const loadData = async () => {
      try {
        console.log('Starting to load movie data...');
        
        const minDelay = new Promise((resolve) => setTimeout(resolve, 800));
        const [t, p, u] = await Promise.all([
          getCategory('trending'),
          getCategory('popular'),
          getCategory('upcoming')
        , minDelay]);
        
        if (!mounted) return;
        
        console.log('Data loaded successfully:', {
          trending: t.length,
          popular: p.length,
          upcoming: u.length
        });
        
        setTrending(t);
        setPopular(p);
        setUpcoming(u);
        
      } catch (error) {
        console.error('Failed to load movie data:', error);
        // Set empty arrays on error so UI still renders
        if (mounted) {
          setTrending([]);
          setPopular([]);
          setUpcoming([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadData();
    
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0b0f" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.heroContent}>
          <Text style={styles.logo}>Todo</Text>
          <Text style={styles.subtitle}>Discover amazing movies & shows</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Row title="🔥 Trending Now" data={trending} loading={loading} />
        <Row title="⭐ Popular" data={popular} loading={loading} />
        <Row title="🎬 New Releases" data={upcoming} loading={loading} />
        
        {/* Footer spacing */}
        <View style={styles.footer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0f',
  },
  header: {
    backgroundColor: '#0b0b0f',
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 20 : 60,
    paddingBottom: 24,
    paddingHorizontal: getResponsivePadding(20),
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f2a',
  },
  heroContent: {
    alignItems: 'center',
  },
  logo: {
    color: '#FFD700',
    fontSize: getResponsiveFontSize(32),
    fontWeight: '900',
    letterSpacing: 1,
    textShadowColor: 'rgba(255, 215, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    color: '#94a3b8',
    marginTop: 8,
    fontSize: getResponsiveFontSize(16),
    fontWeight: '500',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 20,
    paddingBottom: 100,
  },
  row: {
    marginBottom: 32,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: getResponsivePadding(20),
    marginBottom: 16,
  },
  rowTitle: {
    color: '#f8fafc',
    fontSize: getResponsiveFontSize(20),
    fontWeight: '700',
  },
  seeAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFD700',
    borderRadius: 16,
  },
  seeAllText: {
    color: '#000',
    fontSize: getResponsiveFontSize(12),
    fontWeight: '600',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: getResponsiveFontSize(14),
    marginTop: 12,
  },
  scrollContent: {
    paddingLeft: getResponsivePadding(20),
    paddingRight: getResponsivePadding(4),
  },
  movieCard: {
    width: posterWidth,
    marginRight: getResponsivePadding(16),
  },
  posterContainer: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1a1a24',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  poster: {
    width: posterWidth,
    height: posterHeight,
    backgroundColor: '#1a1a24',
  },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  ratingText: {
    color: '#FFD700',
    fontSize: getResponsiveFontSize(11),
    fontWeight: '700',
  },
  movieInfo: {
    paddingTop: 12,
    paddingHorizontal: 4,
  },
  movieTitle: {
    color: '#f8fafc',
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: 4,
  },
  movieYear: {
    color: '#94a3b8',
    fontSize: getResponsiveFontSize(12),
    fontWeight: '500',
  },
  emptyState: {
    paddingVertical: 40,
    paddingHorizontal: getResponsivePadding(20),
    alignItems: 'center',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: getResponsiveFontSize(16),
    textAlign: 'center',
  },
  footer: {
    height: 40,
  },
});