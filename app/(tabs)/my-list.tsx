import { useMyList } from '@/lib/useMyList';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { Alert, Image, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';

export default function MyListScreen() {
  const { list, remove } = useMyList();
  const { width, height } = useWindowDimensions();
  
  const layout = useMemo(() => {
    const minCard = 140;
    const gutter = width > 768 ? 20 : 16;
    const horizontalPadding = width > 768 ? 24 : 20;
    const columns = Math.max(2, Math.min(6, Math.floor((width - horizontalPadding * 2 - gutter) / (minCard + gutter))));
    const cardWidth = Math.floor((width - horizontalPadding * 2 - gutter * (columns + 1)) / columns);
    return { columns, cardWidth, gutter, horizontalPadding };
  }, [width]);

  // Enhanced responsive calculations
  const getTitleFontSize = () => {
    if (width < 375) return 24;
    if (width > 768) return 32;
    return 28;
  };

  const getCardTitleFontSize = () => {
    if (width < 375) return 13;
    if (width > 768) return 16;
    return 14;
  };

  const getRemoveButtonHeight = () => {
    if (width < 375) return 36;
    if (width > 768) return 44;
    return 40;
  };

  const handleRemove = useCallback((id: number, title: string) => {
    Alert.alert(
      "Remove from List",
      `Are you sure you want to remove "${title}" from your list?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: () => remove(id) }
      ]
    );
  }, [remove]);

  const handleMoviePress = useCallback((movieId: number) => {
    router.push(`/movie/${movieId}`);
  }, []);

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="library-outline" size={width > 768 ? 88 : 72} color="#FFD700" />
        <View style={styles.emptyIconGlow} />
      </View>
      <Text style={[styles.emptyTitle, { fontSize: getTitleFontSize() - 2 }]}>
        Your Collection Awaits
      </Text>
      <Text style={[styles.emptySubtitle, { fontSize: getCardTitleFontSize() + 2 }]}>
        Discover amazing movies and shows to build your personal library of favorites
      </Text>
      <View style={styles.emptyActions}>
        <TouchableOpacity 
          style={[styles.browseButton, { height: getRemoveButtonHeight() + 8 }]}
          onPress={() => router.push('/search')}
          activeOpacity={0.8}
        >
          <Ionicons name="search" size={20} color="#000" />
          <Text style={styles.browseButtonText}>Start Browsing</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.trendingButton, { height: getRemoveButtonHeight() + 8 }]}
          onPress={() => router.push('/(tabs)')}
          activeOpacity={0.8}
        >
          <Ionicons name="trending-up" size={20} color="#FFD700" />
          <Text style={styles.trendingButtonText}>View Trending</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      
      {/* Enhanced Header */}
      <View style={styles.header}>
        <View style={styles.headerBackground} />
        <View style={styles.headerContent}>
          <View style={styles.titleRow}>
            <View style={styles.titleContainer}>
              <View style={styles.titleIndicator} />
              <Text style={[styles.title, { fontSize: getTitleFontSize() }]}>My Library</Text>
            </View>
            {list.length > 0 && (
              <TouchableOpacity style={styles.sortButton}>
                <Ionicons name="filter" size={18} color="#FFD700" />
              </TouchableOpacity>
            )}
          </View>
          
          {list.length > 0 && (
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Ionicons name="bookmark" size={16} color="#FFD700" />
                <Text style={styles.statsText}>
                  {list.length} {list.length === 1 ? 'Movie' : 'Movies'}
                </Text>
              </View>
              <View style={styles.statsDivider} />
              <View style={styles.statItem}>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={styles.statsText}>Your Collection</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer, 
          { paddingHorizontal: layout.horizontalPadding }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {list.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Quick Stats */}
            <View style={styles.quickStats}>
              <Text style={styles.quickStatsTitle}>Quick Stats</Text>
              <View style={styles.quickStatsGrid}>
                <View style={styles.quickStatItem}>
                  <Text style={styles.quickStatNumber}>{list.length}</Text>
                  <Text style={styles.quickStatLabel}>Total Items</Text>
                </View>
                <View style={styles.quickStatItem}>
                  <Text style={styles.quickStatNumber}>
                    {list.filter(m => m.release_date || m.first_air_date).length}
                  </Text>
                  <Text style={styles.quickStatLabel}>With Release Info</Text>
                </View>
              </View>
            </View>

            {/* Movies Grid */}
            <View style={styles.gridSection}>
              <Text style={styles.sectionTitle}>Your Movies</Text>
              <View style={[styles.grid, { marginHorizontal: -layout.gutter / 2 }]}>
                {list.map((movie: any, index: number) => (
                  <View 
                    key={movie.id} 
                    style={[
                      styles.movieCard, 
                      { 
                        width: layout.cardWidth, 
                        marginHorizontal: layout.gutter / 2, 
                        marginBottom: layout.gutter + 8 
                      }
                    ]}
                  >
                    <TouchableOpacity 
                      onPress={() => router.push(`/movie/${movie.id}`)}
                      activeOpacity={0.85}
                      style={styles.posterContainer}
                    >
                      <Image 
                        source={movie.poster_path 
                          ? { uri: `https://image.tmdb.org/t/p/w500${movie.poster_path}` } 
                          : require('../../assets/images/Todo.png')
                        } 
                        style={styles.poster} 
                        resizeMode="cover"
                      />
                      <View style={styles.posterOverlay}>
                        <View style={styles.playBadge}>
                          <Ionicons name="play" size={14} color="#000" />
                        </View>
                        {movie.vote_average && (
                          <View style={styles.ratingBadge}>
                            <Ionicons name="star" size={10} color="#FFD700" />
                            <Text style={styles.ratingText}>
                              {movie.vote_average.toFixed(1)}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.cardGradient} />
                    </TouchableOpacity>
                    
                    <View style={styles.cardContent}>
                      <Text 
                        numberOfLines={2} 
                        style={[styles.cardTitle, { fontSize: getCardTitleFontSize() }]}
                      >
                        {movie.title || movie.name}
                      </Text>
                      
                      {(movie.release_date || movie.first_air_date) && (
                        <Text style={styles.releaseYear}>
                          {new Date(movie.release_date || movie.first_air_date).getFullYear()}
                        </Text>
                      )}
                      
                      <TouchableOpacity 
                        onPress={() => handleRemove(movie.id, movie.title || movie.name)}
                        style={[styles.removeButton, { height: getRemoveButtonHeight() }]}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={18} color="#ff4757" />
                        <Text style={[styles.removeText, { fontSize: getCardTitleFontSize() }]}>
                          Remove
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0a0a0a' 
  },
  header: {
    position: 'relative',
    backgroundColor: '#1a1a1a',
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 20 : 60,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 215, 0, 0.02)',
  },
  headerContent: {
    paddingHorizontal: 20,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleIndicator: {
    width: 5,
    height: 28,
    backgroundColor: '#FFD700',
    borderRadius: 3,
    marginRight: 16,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  title: { 
    color: '#FFD700', 
    fontWeight: '800', 
    letterSpacing: -0.5,
    textShadowColor: 'rgba(255, 215, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  sortButton: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statsText: {
    color: '#e6e6e6',
    fontSize: 14,
    fontWeight: '600',
  },
  statsDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
    marginHorizontal: 16,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 20,
    paddingBottom: 120,
  },
  quickStats: {
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    padding: 20,
    borderRadius: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
  },
  quickStatsTitle: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  quickStatsGrid: {
    flexDirection: 'row',
    gap: 20,
  },
  quickStatItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 16,
    borderRadius: 16,
  },
  quickStatNumber: {
    color: '#FFD700',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  quickStatLabel: {
    color: '#cccccc',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  gridSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    paddingLeft: 4,
  },
  grid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap',
  },
  movieCard: { 
    backgroundColor: '#1a1a1a', 
    borderRadius: 20, 
    padding: 16, 
    borderWidth: 1, 
    borderColor: 'rgba(255, 215, 0, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  posterContainer: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
  },
  poster: { 
    width: '100%', 
    aspectRatio: 2/3, 
    backgroundColor: '#2a2a2a',
  },
  posterOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    gap: 8,
  },
  playBadge: {
    backgroundColor: '#FFD700',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  ratingBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  ratingText: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '700',
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  cardContent: {
    flex: 1,
    paddingTop: 16,
    gap: 8,
  },
  cardTitle: { 
    color: '#ffffff', 
    fontWeight: '700',
    lineHeight: 18,
  },
  releaseYear: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
  },
  removeButton: { 
    backgroundColor: 'rgba(255, 71, 87, 0.1)', 
    borderRadius: 16, 
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1, 
    borderColor: 'rgba(255, 71, 87, 0.2)',
    flexDirection: 'row',
    gap: 8,
    marginTop: 'auto',
  },
  removeText: { 
    color: '#ff4757', 
    fontWeight: '600',
  },
  
  // Enhanced Empty State
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 20,
  },
  emptyIconContainer: {
    position: 'relative',
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderRadius: 60,
    padding: 32,
    marginBottom: 32,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  emptyIconGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    borderRadius: 70,
    zIndex: -1,
  },
  emptyTitle: {
    color: '#FFD700',
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  emptySubtitle: {
    color: '#cccccc',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
    maxWidth: 300,
  },
  emptyActions: {
    flexDirection: 'row',
    gap: 16,
  },
  browseButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 24,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  browseButtonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 16,
  },
  trendingButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FFD700',
    paddingHorizontal: 24,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  trendingButtonText: {
    color: '#FFD700',
    fontWeight: '700',
    fontSize: 16,
  },
});