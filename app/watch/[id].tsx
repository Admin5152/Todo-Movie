import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { getMovieVideos } from '../../lib/tmdb';

export default function WatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [videoKey, setVideoKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { width, height } = useWindowDimensions();

  const playerSize = useMemo(() => {
    const maxWidth = Math.min(width - 32, width * 0.95);
    const playerHeight = Math.round((maxWidth * 9) / 16);
    return { width: maxWidth, height: playerHeight };
  }, [width]);

  const loadVideos = useCallback(async () => {
    try {
      const vids = await getMovieVideos(Number(id));
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
            <View style={styles.loadingPulse} />
          </View>
          <Text style={styles.loadingText}>Loading video...</Text>
          <Text style={styles.loadingSubtext}>Finding the best trailer for you</Text>
          <View style={styles.loadingDots}>
            <View style={[styles.loadingDot, styles.loadingDot1]} />
            <View style={[styles.loadingDot, styles.loadingDot2]} />
            <View style={[styles.loadingDot, styles.loadingDot3]} />
          </View>
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
        <View style={styles.headerGradient} />
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <View style={styles.buttonInner}>
            <Ionicons name="chevron-back" size={24} color="#FFD700" />
          </View>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Watch</Text>
          <Text style={styles.headerSubtitle}>Movie Trailer</Text>
          <View style={styles.headerUnderline} />
        </View>
        <TouchableOpacity style={styles.fullscreenButton}>
          <View style={styles.buttonInner}>
            <Ionicons name="expand-outline" size={20} color="#FFD700" />
          </View>
        </TouchableOpacity>
      </View>
      
      {videoKey ? (
        <View style={styles.playerContainer}>
          {/* Player Wrapper with Enhanced Styling */}
          <View style={styles.playerFrame}>
            <View style={styles.playerShadow} />
            <View style={styles.playerGlow} />
             <WebView
               style={[styles.webView, { width: playerSize.width, height: playerSize.height }]}
               source={{ 
                 html: `
                   <!DOCTYPE html>
                   <html>
                   <head>
                     <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                     <style>
                       * { 
                         margin: 0; 
                         padding: 0; 
                         box-sizing: border-box; 
                       }
                       html, body { 
                         width: 100%; 
                         height: 100%; 
                         background: #000; 
                         overflow: hidden;
                         font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                       }
                       .video-container { 
                         position: relative; 
                         width: 100%; 
                         height: 100%; 
                         background: #000;
                         border-radius: 16px;
                         overflow: hidden;
                         display: flex;
                         align-items: center;
                         justify-content: center;
                       }
                       iframe { 
                         width: 100%; 
                         height: 100%; 
                         border: none;
                         background: #000;
                         border-radius: 16px;
                       }
                       .loading-overlay {
                         position: absolute;
                         top: 0;
                         left: 0;
                         width: 100%;
                         height: 100%;
                         background: #000;
                         display: flex;
                         align-items: center;
                         justify-content: center;
                         color: #FFD700;
                         font-size: 18px;
                         font-weight: 600;
                         z-index: 10;
                         border-radius: 16px;
                       }
                       .loading-overlay.hidden {
                         display: none;
                       }
                     </style>
                   </head>
                   <body>
                     <div class="video-container">
                       <div class="loading-overlay" id="loadingOverlay">
                         <div>Loading video...</div>
                       </div>
                       <iframe 
                         id="youtubeFrame"
                         src="https://www.youtube.com/embed/${videoKey}?autoplay=1&mute=1&playsinline=1&modestbranding=1&rel=0&showinfo=0&controls=1&fs=1&enablejsapi=1&iv_load_policy=3&cc_load_policy=0"
                         frameborder="0"
                         allowfullscreen
                         allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share">
                       </iframe>
                     </div>
                     <script>
                       console.log('Script loaded, video key: ${videoKey}');
                       
                       function hideLoading() {
                         const overlay = document.getElementById('loadingOverlay');
                         if (overlay) {
                           overlay.classList.add('hidden');
                           console.log('Loading overlay hidden');
                         }
                       }
                       
                       // Hide loading after iframe loads
                       const iframe = document.getElementById('youtubeFrame');
                       if (iframe) {
                         iframe.onload = function() {
                           console.log('Iframe loaded successfully');
                           setTimeout(hideLoading, 1500);
                         };
                         
                         iframe.onerror = function() {
                           console.log('Iframe load error');
                           setTimeout(hideLoading, 2000);
                         };
                       }
                       
                       // Fallback to hide loading
                       setTimeout(hideLoading, 3000);
                       
                       // Additional check for iframe content
                       setTimeout(function() {
                         const iframe = document.getElementById('youtubeFrame');
                         if (iframe && iframe.contentDocument) {
                           console.log('Iframe content accessible');
                         } else {
                           console.log('Iframe content not accessible, but that\'s normal for cross-origin');
                         }
                         hideLoading();
                       }, 2000);
                     </script>
                   </body>
                   </html>
                 `
               }}
               allowsFullscreenVideo={true}
               mediaPlaybackRequiresUserAction={false}
               javaScriptEnabled={true}
               domStorageEnabled={true}
               startInLoadingState={false}
               scalesPageToFit={false}
               mixedContentMode="compatibility"
               originWhitelist={['*']}
               allowsInlineMediaPlayback={true}
               bounces={false}
               scrollEnabled={false}
               onLoad={() => console.log('WebView loaded successfully')}
               onError={(syntheticEvent) => {
                 const { nativeEvent } = syntheticEvent;
                 console.warn('WebView error: ', nativeEvent);
               }}
               onHttpError={(syntheticEvent) => {
                 const { nativeEvent } = syntheticEvent;
                 console.warn('WebView HTTP error: ', nativeEvent);
               }}
               onLoadStart={() => console.log('WebView started loading')}
               onLoadEnd={() => console.log('WebView finished loading')}
             />
            <View style={styles.playerBorder} />
            <View style={styles.playerCornerAccents}>
              <View style={[styles.cornerAccent, styles.topLeft]} />
              <View style={[styles.cornerAccent, styles.topRight]} />
              <View style={[styles.cornerAccent, styles.bottomLeft]} />
              <View style={[styles.cornerAccent, styles.bottomRight]} />
            </View>
          </View>
          
          {/* Video Controls Info */}
          <View style={styles.videoInfo}>
            <View style={styles.videoInfoRow}>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <View style={styles.livePulse} />
                <Text style={styles.liveText}>Now Playing</Text>
              </View>
              <View style={styles.qualityBadge}>
                <Text style={styles.qualityText}>HD</Text>
                <View style={styles.qualityShine} />
              </View>
            </View>
            <Text style={styles.videoDescription}>
              Enjoy the trailer in high quality. Tap the fullscreen button for the best viewing experience.
            </Text>
            <View style={styles.videoTips}>
              <View style={styles.tipItem}>
                <Ionicons name="volume-high" size={16} color="#FFD700" />
                <Text style={styles.tipText}>Unmute for audio</Text>
              </View>
              <View style={styles.tipItem}>
                <Ionicons name="expand" size={16} color="#FFD700" />
                <Text style={styles.tipText}>Pinch to zoom</Text>
              </View>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.noVideoContainer}>
          <View style={styles.noVideoIconContainer}>
            <Ionicons name="film-outline" size={80} color="#FFD700" />
            <View style={styles.noVideoIconGlow} />
            <View style={styles.noVideoIconPulse} />
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
               <View style={styles.buttonGradient} />
               <Ionicons name="arrow-back" size={18} color="#000" />
               <Text style={styles.backToDetailsText}>Back to Details</Text>
             </TouchableOpacity>
             
             <TouchableOpacity 
               style={styles.searchMoreBtn}
               onPress={handleSearchPress}
               activeOpacity={0.8}
             >
              <View style={styles.searchBtnBorder} />
              <Ionicons name="search" size={18} color="#FFD700" />
              <Text style={styles.searchMoreText}>Search More</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.suggestionContainer}>
            <Text style={styles.suggestionTitle}>Try these instead:</Text>
            <View style={styles.suggestionTags}>
              <Text style={styles.suggestionTag}>Popular Movies</Text>
              <Text style={styles.suggestionTag}>Latest Releases</Text>
              <Text style={styles.suggestionTag}>Top Rated</Text>
            </View>
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
    marginBottom: 32,
  },
  loadingGlow: {
    position: 'absolute',
    top: -25,
    left: -25,
    right: -25,
    bottom: -25,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderRadius: 50,
    zIndex: -1,
  },
  loadingPulse: {
    position: 'absolute',
    top: -35,
    left: -35,
    right: -35,
    bottom: -35,
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderRadius: 60,
    zIndex: -2,
  },
  loadingText: {
    color: '#FFD700',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  loadingSubtext: {
    color: '#888888',
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 24,
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 8,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFD700',
  },
  loadingDot1: {
    opacity: 1,
  },
  loadingDot2: {
    opacity: 0.7,
  },
  loadingDot3: {
    opacity: 0.4,
  },

  // Header Styles
  header: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.15)',
    ...Platform.select({
      ios: {
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 215, 0, 0.03)',
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'linear-gradient(90deg, rgba(255, 215, 0, 0.05) 0%, transparent 50%, rgba(255, 215, 0, 0.05) 100%)',
  },
  backButton: {
    borderRadius: 18,
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 215, 0, 0.25)',
    overflow: 'hidden',
  },
  buttonInner: {
    padding: 12,
  },
  headerTitleContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  headerTitle: {
    color: '#FFD700',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
    textShadowColor: 'rgba(255, 215, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    color: '#888888',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  headerUnderline: {
    position: 'absolute',
    bottom: -8,
    left: -10,
    right: -10,
    height: 1,
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
  },
  fullscreenButton: {
    borderRadius: 18,
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 215, 0, 0.25)',
    overflow: 'hidden',
  },

  // Player Styles
  playerContainer: {
    flex: 1,
    backgroundColor: '#000000',
    paddingTop: 24,
  },
  playerFrame: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  playerShadow: {
    position: 'absolute',
    top: 8,
    left: 24,
    right: 24,
    bottom: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    zIndex: -3,
  },
  playerGlow: {
    position: 'absolute',
    top: -6,
    left: 10,
    right: 10,
    bottom: -6,
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderRadius: 22,
    zIndex: -2,
  },
  webView: {
    backgroundColor: '#000000',
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  playerBorder: {
    position: 'absolute',
    top: -3,
    left: 13,
    right: 13,
    bottom: -3,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.4)',
    borderRadius: 19,
    zIndex: -1,
  },
  playerCornerAccents: {
    position: 'absolute',
    top: -3,
    left: 13,
    right: 13,
    bottom: -3,
  },
  cornerAccent: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderColor: '#FFD700',
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 19,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 19,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 19,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 19,
  },
  videoInfo: {
    paddingHorizontal: 24,
    paddingTop: 4,
  },
  videoInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  liveIndicator: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 215, 0, 0.25)',
    overflow: 'hidden',
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFD700',
    marginRight: 10,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  livePulse: {
    position: 'absolute',
    left: 9,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
  },
  liveText: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  qualityBadge: {
    position: 'relative',
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  qualityShine: {
    position: 'absolute',
    top: 0,
    left: -20,
    width: 20,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    transform: [{ skewX: '-20deg' }],
  },
  qualityText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  videoDescription: {
    color: '#cccccc',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
  },
  videoTips: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.15)',
  },
  tipText: {
    color: '#888888',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
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
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 70,
    padding: 40,
    marginBottom: 36,
    borderWidth: 2.5,
    borderColor: 'rgba(255, 215, 0, 0.25)',
    overflow: 'hidden',
  },
  noVideoIconGlow: {
    position: 'absolute',
    top: -15,
    left: -15,
    right: -15,
    bottom: -15,
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderRadius: 85,
    zIndex: -1,
  },
  noVideoIconPulse: {
    position: 'absolute',
    top: -25,
    left: -25,
    right: -25,
    bottom: -25,
    backgroundColor: 'rgba(255, 215, 0, 0.04)',
    borderRadius: 95,
    zIndex: -2,
  },
  noVideoTitle: {
    color: '#FFD700',
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(255, 215, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  noVideoText: {
    color: '#cccccc',
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 44,
    maxWidth: 320,
    fontWeight: '500',
  },
  noVideoActions: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 32,
  },
  backToDetailsBtn: {
    position: 'relative',
    backgroundColor: '#FFD700',
    paddingHorizontal: 28,
    paddingVertical: 18,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  buttonGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'linear-gradient(135deg, #FFD700 0%, #FFC107 100%)',
  },
  backToDetailsText: {
    color: '#000000',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  searchMoreBtn: {
    position: 'relative',
    backgroundColor: 'transparent',
    borderWidth: 2.5,
    borderColor: '#FFD700',
    paddingHorizontal: 28,
    paddingVertical: 18,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    overflow: 'hidden',
  },
  searchBtnBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
  },
  searchMoreText: {
    color: '#FFD700',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  suggestionContainer: {
    alignItems: 'center',
  },
  suggestionTitle: {
    color: '#888888',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  suggestionTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  suggestionTag: {
    color: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    fontSize: 13,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
});