import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import TodoImage from '../../assets/images/Todo.png';
import { searchMovies } from '../../lib/tmdb';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { width } = useWindowDimensions();

  const layout = useMemo(() => {
    const minCard = 120;
    const gutter = 16;
    const columns = Math.max(2, Math.min(6, Math.floor((width - gutter) / (minCard + gutter))));
    const cardWidth = Math.floor((width - gutter * (columns + 1)) / columns);
    return { columns, cardWidth, gutter };
  }, [width]);

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const onSearch = useCallback(async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const [data] = await Promise.all([
        searchMovies(query),
        wait(600), // ensure loader is visible for smoother UX
      ]);
      setResults(data);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const handleMoviePress = useCallback((movieId: number) => {
    router.push(`/movie/${movieId}`);
  }, []);

  const renderMovieItem = useCallback(({ item }: { item: any }) => (
    <TouchableOpacity
      style={{ width: layout.cardWidth, marginRight: layout.gutter, marginBottom: layout.gutter }}
      onPress={() => handleMoviePress(item.id)}
      activeOpacity={0.8}
    >
      <Image 
        source={item.poster_path ? { uri: `https://image.tmdb.org/t/p/w500${item.poster_path}` } : (TodoImage as any)} 
        style={{ width: '100%', aspectRatio: 2/3, borderRadius: 12, backgroundColor: '#14141c', borderWidth: 1, borderColor: '#232335' }} 
        resizeMode="cover"
        loadingIndicatorSource={TodoImage as any}
        fadeDuration={200}
      />
      <Text numberOfLines={1} style={{ color: '#dfe3e6', marginTop: 6 }}>{item.title || item.name}</Text>
    </TouchableOpacity>
  ), [layout, handleMoviePress]);

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>
        {query ? 'No movies found' : 'Search for movies'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {query 
          ? 'Try searching with different keywords' 
          : 'Enter a movie title to get started'
        }
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search Movies</Text>
      </View>

      {/* Search Section */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <TextInput
            placeholder="Search for movies..."
            placeholderTextColor="#6b7280"
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={onSearch}
            returnKeyType="search"
          />
          <TouchableOpacity 
            style={[styles.searchButton, !query.trim() && styles.searchButtonDisabled]}
            onPress={onSearch}
            disabled={!query.trim()}
          >
            <Text style={[styles.searchButtonText, !query.trim() && styles.searchButtonTextDisabled]}>
              Search
            </Text>
          </TouchableOpacity>
        </View>
        
        {query && !loading && (
          <Text style={styles.resultsCount}>
            {results.length} {results.length === 1 ? 'result' : 'results'} found
          </Text>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Searching movies...</Text>
          </View>
        ) : results.length > 0 ? (
          <FlatList
            contentContainerStyle={styles.listContainer}
            data={results}
            keyExtractor={(item) => String(item.id)}
            numColumns={layout.columns}
            showsVerticalScrollIndicator={false}
            renderItem={renderMovieItem}
            getItemLayout={(data, index) => {
              const rowHeight = Math.round(layout.cardWidth * 1.5) + layout.gutter;
              const rowIndex = Math.floor(index / layout.columns);
              return {
                length: rowHeight,
                offset: rowHeight * rowIndex,
                index,
              };
            }}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={10}
          />
        ) : (
          renderEmptyState()
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0f',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#0b0b0f',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFD700',
    textAlign: 'center',
  },
  searchSection: {
    padding: 20,
    backgroundColor: '#0b0b0f',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#0b0b0f',
    color: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#475569',
  },
  searchButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  searchButtonDisabled: {
    backgroundColor: '#475569',
  },
  searchButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  searchButtonTextDisabled: {
    color: '#9ca3af',
  },
  resultsCount: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    backgroundColor: '#0b0b0f',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 24,
  },
  listContainer: {
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 16,
  },
  movieCard: {
    marginBottom: 20,
  },
  posterContainer: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0b0b0f',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  poster: {
    width: '100%',
    aspectRatio: 2/3,
    backgroundColor: '#0b0b0f',
  },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ratingText: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '600',
  },
  movieInfo: {
    paddingTop: 12,
    paddingHorizontal: 4,
  },
  movieTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f8fafc',
    lineHeight: 18,
    marginBottom: 4,
  },
  movieYear: {
    fontSize: 12,
    color: '#94a3b8',
  },
});