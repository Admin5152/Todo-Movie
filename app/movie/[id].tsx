import { useMyList } from '@/lib/useMyList';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getMovieDetails } from '../../lib/tmdb';

export default function MovieDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [movie, setMovie] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { add, has } = useMyList();

  const loadMovieDetails = useCallback(async () => {
    try {
      const data = await getMovieDetails(Number(id));
      setMovie(data);
    } catch (error) {
      console.error('Failed to load movie details:', error);
    } finally {
      setLoading(false);
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

  if (loading) return <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator color="#FFD700" /></View>;
  if (!movie) return <View style={styles.container}><Text style={{ color: '#fff' }}>Not found</Text></View>;

  const title = movie.title || movie.name;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFD700" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Movie Details</Text>
        <View style={styles.placeholder} />
      </View>
      
      <ScrollView style={styles.scrollView}>
        <Image 
          source={movie.poster_path ? { uri: `https://image.tmdb.org/t/p/w780${movie.poster_path}` } : require('../../assets/images/Todo.png')} 
          style={styles.poster}
          resizeMode="cover"
          loadingIndicatorSource={require('../../assets/images/Todo.png')}
          fadeDuration={200}
        />
        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>
          {!!movie.genres && <Text style={styles.genres}>{movie.genres.map((g: any) => g.name).join(' • ')}</Text>}
          {!!movie.overview && <Text style={styles.overview}>{movie.overview}</Text>}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.primaryBtn} onPress={handlePlayPress}>
              <Ionicons name="play" size={20} color="#000" />
              <Text style={styles.primaryText}>Play</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleAddToList}>
              <Ionicons name={has(movie.id) ? "checkmark" : "add"} size={20} color="#FFD700" />
              <Text style={styles.secondaryText}>{has(movie.id) ? 'In My List' : 'Add to My List'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0b0f' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3a',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  headerTitle: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: '700',
  },
  placeholder: { width: 40 },
  scrollView: { flex: 1 },
  poster: { width: '100%', aspectRatio: 2/3 },
  content: { padding: 16 },
  title: { color: '#fff', fontSize: 24, fontWeight: '800' },
  genres: { color: '#9aa0a6', marginTop: 6 },
  overview: { color: '#dfe3e6', marginTop: 12, lineHeight: 20 },
  actions: { flexDirection: 'row', marginTop: 16, gap: 12 },
  primaryBtn: { 
    backgroundColor: '#FFD700', 
    paddingVertical: 12, 
    paddingHorizontal: 18, 
    borderRadius: 12, 
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  primaryText: { color: '#000', fontWeight: '800' },
  secondaryBtn: { 
    borderColor: '#FFD700', 
    borderWidth: 1, 
    paddingVertical: 12, 
    paddingHorizontal: 18, 
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  secondaryText: { color: '#FFD700', fontWeight: '700' }
});


