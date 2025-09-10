import { getMovieVideos } from '@/lib/tmdb';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { WebView } from 'react-native-webview';

export default function WatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [videoKey, setVideoKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { width } = useWindowDimensions();

  const playerSize = useMemo(() => {
    const maxWidth = Math.min(1000, width);
    const height = Math.round((maxWidth * 9) / 16);
    return { width: maxWidth, height };
  }, [width]);

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const loadVideos = useCallback(async () => {
    try {
      const [vids] = await Promise.all([
        getMovieVideos(Number(id)),
        wait(600),
      ]);
      const preferred = vids.find((v) => v.site === 'YouTube' && v.type === 'Trailer') || vids.find((v) => v.site === 'YouTube');
      setVideoKey(preferred?.key ?? null);
    } catch (error) {
      console.error('Failed to load videos:', error);
      setVideoKey(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  const handleBackPress = useCallback(() => {
    router.back();
  }, []);

  const handleSearchPress = useCallback(() => {
    router.push('/(tabs)/search');
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
        <View style={styles.loadingContainer}>
          <View style={styles.loadingSpinner}>
            <ActivityIndicator size="large" color="#FFD700" />
            <View style={styles.loadingGlow} />
          </View>
          <Text style={styles.loadingText}>Loading video...</Text>
          <Text style={styles.loadingSubtext}>Finding the best trailer for you</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      
      {/* Enhanced Header */}
      <View style={styles.header}>
        <View style={styles.headerBackground} />
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Ionicons name="chevron-back" size={24} color="#FFD700" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Watch</Text>
          <Text style={styles.headerSubtitle}>Movie Trailer</Text>
        </View>
        <TouchableOpacity style={styles.fullscreenButton}>
          <Ionicons name="expand-outline" size={20} color="#FFD700" />
        </TouchableOpacity>
      </View>
      
      {videoKey ? (
        <View style={styles.playerContainer}>
          {/* Player Wrapper with Enhanced Styling */}
          <View style={styles.playerFrame}>
            <WebView
              style={[styles.webView, { width: playerSize.width, height: playerSize.height }]}
              source={{ uri: `https://www.youtube.com/embed/${videoKey}?autoplay=1&playsinline=1` }}
              allowsFullscreenVideo
              mediaPlaybackRequiresUserAction={false}
            />
            <View style={styles.playerBorder} />
          </View>
          
          {/* Video Controls Info */}
          <View style={styles.videoInfo}>
            <View style={styles.videoInfoRow}>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>Now Playing</Text>
              </View>
              <View style={styles.qualityBadge}>
                <Text style={styles.qualityText}>HD</Text>
              </View>
            </View>
            <Text style={styles.videoDescription}>
              Enjoy the trailer in high quality. Tap the fullscreen button for the best viewing experience.
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.noVideoContainer}>
          <View style={styles.noVideoIconContainer}>
            <Ionicons name="film-outline" size={80} color="#FFD700" />
            <View style={styles.noVideoIconGlow} />
          </View>
          <Text style={styles.noVideoTitle}>No Trailer Available</Text>
          <Text style={styles.noVideoText}>
            We couldn't find a trailer for this title. Check back later or explore other movies.
          </Text>
          
          <View style={styles.noVideoActions}>
             <TouchableOpacity 
               style={styles.backToDetailsBtn} 
               onPress={handleBackPress}
               activeOpacity={0.8}
             >
               <Ionicons name="arrow-back" size={18} color="#000" />
               <Text style={styles.backToDetailsText}>Back to Details</Text>
             </TouchableOpacity>
             
             <TouchableOpacity 
               style={styles.searchMoreBtn}
               onPress={handleSearchPress}
               activeOpacity={0.8}
             >
              <Ionicons name="search" size={18} color="#FFD700" />
              <Text style={styles.searchMoreText}>Search More</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0a0a0a' 
  },
  
  // Loading State Styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingSpinner: {
    position: 'relative',
    marginBottom: 24,
  },
  loadingGlow: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 40,
    zIndex: -1,
  },
  loadingText: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingSubtext: {
    color: '#888888',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },

  // Header Styles
  header: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.1)',
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 215, 0, 0.02)',
  },
  backButton: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFD700',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    color: '#888888',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  fullscreenButton: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },

  // Player Styles
  playerContainer: {
    flex: 1,
    backgroundColor: '#000000',
    paddingTop: 20,
  },
  playerFrame: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  webView: {
    backgroundColor: '#000000',
    borderRadius: 16,
    overflow: 'hidden',
  },
  playerBorder: {
    position: 'absolute',
    top: -2,
    left: 14,
    right: 14,
    bottom: -2,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    borderRadius: 18,
    zIndex: -1,
  },
  videoInfo: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  videoInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFD700',
    marginRight: 8,
  },
  liveText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
  },
  qualityBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  qualityText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '700',
  },
  videoDescription: {
    color: '#cccccc',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },

  // No Video Styles
  noVideoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noVideoIconContainer: {
    position: 'relative',
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderRadius: 60,
    padding: 32,
    marginBottom: 32,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  noVideoIconGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    borderRadius: 70,
    zIndex: -1,
  },
  noVideoTitle: {
    color: '#FFD700',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  noVideoText: {
    color: '#cccccc',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    maxWidth: 300,
  },
  noVideoActions: {
    flexDirection: 'row',
    gap: 16,
  },
  backToDetailsBtn: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  backToDetailsText: {
    color: '#000000',
    fontWeight: '700',
    fontSize: 16,
  },
  searchMoreBtn: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FFD700',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchMoreText: {
    color: '#FFD700',
    fontWeight: '700',
    fontSize: 16,
  },
});