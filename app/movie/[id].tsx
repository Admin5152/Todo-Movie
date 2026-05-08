import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { getMovieDetails } from '../../lib/tmdb';
import { useMyList } from '../../lib/useMyList';

const { height: screenHeight } = Dimensions.get('window');

export default function MovieDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [movie, setMovie] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { add, has } = useMyList();

  const loadMovieDetails = useCallback(async () => {
    const start = Date.now();
    try {
      const data = await getMovieDetails(Number(id));
      setMovie(data);
    } catch (error) {
      console.error('Failed to load movie details:', error);
    } finally {
      const elapsed = Date.now() - start;
      const minDuration = 800;
      if (elapsed < minDuration) {
        setTimeout(() => setLoading(false), minDuration - elapsed);
      } else {
        setLoading(false);
      }
    }
  }, [id]);

  useEffect(() => {
    loadMovieDetails();
  }, [loadMovieDetails]);

  const handlePlayPress = useCallback(() => {
    router.push(`/watch/${movie?.id}`);
  }, [movie?.id]);

  const handleAddToList = useCallback(() => {
    if (movie) {
      add(movie);
    }
  }, [movie, add]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>Loading movie details...</Text>
      </View>
    );
  }

  if (!movie) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Ionicons name="film-outline" size={64} color="#666" />
        <Text style={styles.notFoundText}>Movie not found</Text>
      </View>
    );
  }

  const title = movie.title || movie.name;
  const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : '';
  const runtime = movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : '';
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : '';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Header with backdrop */}
      <View style={styles.headerContainer}>
        {movie.backdrop_path && (
          <>
            <Image
              source={{ uri: `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` }}
              style={styles.backdropImage}
            />
            <LinearGradient
              colors={['transparent', 'rgba(11, 11, 15, 0.8)', '#0b0b0f']}
              style={styles.backdropGradient}
            />
          </>
        )}
        
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <BlurView intensity={20} style={styles.blurButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </BlurView>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Movie Details</Text>
          <View style={styles.placeholder} />
        </View>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.posterContainer}>
            <Image 
              source={movie.poster_path ? 
                { uri: `https://image.tmdb.org/t/p/w500${movie.poster_path}` } : 
                require('../../assets/images/Todo.png')
              } 
              style={styles.poster}
              resizeMode="cover"
              loadingIndicatorSource={require('../../assets/images/Todo.png')}
            />
            <View style={styles.posterShadow} />
          </View>
          
          <View style={styles.movieInfo}>
            <Text style={styles.title} numberOfLines={2}>{title}</Text>
            
            {/* Meta Info */}
            <View style={styles.metaContainer}>
              {releaseYear && <Text style={styles.metaText}>{releaseYear}</Text>}
              {rating && (
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={14} color="#FFD700" />
                  <Text style={styles.ratingText}>{rating}</Text>
                </View>
              )}
              {runtime && <Text style={styles.metaText}>{runtime}</Text>}
            </View>
            
            {/* Genres */}
            {movie.genres && movie.genres.length > 0 && (
              <View style={styles.genresContainer}>
                {movie.genres.slice(0, 3).map((genre: any) => (
                  <View key={genre.id} style={styles.genreTag}>
                    <Text style={styles.genreText}>{genre.name}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.playButton} 
            onPress={handlePlayPress}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#FFD700', '#FFA500']}
              style={styles.playButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="play" size={24} color="#000" />
              <Text style={styles.playButtonText}>Play Now</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.listButton} 
            onPress={handleAddToList}
            activeOpacity={0.8}
          >
            <View style={styles.listButtonContent}>
              <Ionicons 
                name={has(movie.id) ? "checkmark-circle" : "add-circle-outline"} 
                size={24} 
                color="#FFD700" 
              />
              <Text style={styles.listButtonText}>
                {has(movie.id) ? 'In My List' : 'My List'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Overview */}
        {movie.overview && (
          <View style={styles.overviewContainer}>
            <Text style={styles.sectionTitle}>Overview</Text>
            <Text style={styles.overview}>{movie.overview}</Text>
          </View>
        )}

        {/* Additional Info */}
        <View style={styles.additionalInfo}>
          {movie.production_companies && movie.production_companies.length > 0 && (
            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>Production</Text>
              <Text style={styles.infoValue}>
                {movie.production_companies.slice(0, 2).map((company: any) => company.name).join(', ')}
              </Text>
            </View>
          )}
          
          {movie.spoken_languages && movie.spoken_languages.length > 0 && (
            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>Languages</Text>
              <Text style={styles.infoValue}>
                {movie.spoken_languages.map((lang: any) => lang.english_name).join(', ')}
              </Text>
            </View>
          )}
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0b0b0f' 
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#9aa0a6',
    fontSize: 16,
    marginTop: 8,
  },
  notFoundText: {
    color: '#9aa0a6',
    fontSize: 18,
    marginTop: 16,
  },
  headerContainer: {
    position: 'relative',
    height: screenHeight * 0.3,
    minHeight: 200,
  },
  backdropImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.6,
  },
  backdropGradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  backButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  blurButton: {
    padding: 12,
    borderRadius: 25,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  placeholder: { width: 50 },
  scrollView: { 
    flex: 1,
    marginTop: -60,
  },
  heroSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 16,
  },
  posterContainer: {
    position: 'relative',
  },
  poster: { 
    width: 120,
    height: 180,
    borderRadius: 16,
    backgroundColor: '#1a1a1f',
  },
  posterShadow: {
    position: 'absolute',
    bottom: -8,
    left: 4,
    right: 4,
    height: 20,
    backgroundColor: '#FFD700',
    opacity: 0.3,
    borderRadius: 16,
    
  },
  movieInfo: {
    flex: 1,
    paddingTop: 10,
  },
  title: { 
    color: '#fff', 
    fontSize: 28, 
    fontWeight: '800',
    lineHeight: 32,
    marginBottom: 8,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  metaText: {
    color: '#9aa0a6',
    fontSize: 14,
    fontWeight: '500',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '700',
  },
  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genreTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  genreText: {
    color: '#dfe3e6',
    fontSize: 12,
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 12,
  },
  playButton: {
    flex: 2,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  playButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  playButtonText: { 
    color: '#000', 
    fontSize: 18,
    fontWeight: '800' 
  },
  listButton: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  listButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  listButtonText: { 
    color: '#FFD700', 
    fontSize: 16,
    fontWeight: '700' 
  },
  overviewContainer: {
    paddingHorizontal: 20,
    paddingTop: 32,
  },
  sectionTitle: {
    color: '#FFD700',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  overview: { 
    color: '#dfe3e6', 
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'justify',
  },
  additionalInfo: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 16,
  },
  infoSection: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700',
  },
  infoLabel: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoValue: {
    color: '#dfe3e6',
    fontSize: 15,
    fontWeight: '500',
  },
  bottomSpacing: {
    height: 40,
  },
});