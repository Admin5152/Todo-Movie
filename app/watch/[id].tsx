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
  const [webViewError, setWebViewError] = useState(false);
  const { width } = useWindowDimensions();

  const playerSize = useMemo(() => {
    const maxWidth = Math.min(width - 32, width * 0.95);
    const playerHeight = Math.round((maxWidth * 9) / 16);
    return { width: maxWidth, height: playerHeight };
  }, [width]);

  const loadVideos = useCallback(async () => {
    try {
      setLoading(true);
      setWebViewError(false);
      const vids = await getMovieVideos(Number(id));
      
      // Prefer trailers, then any YouTube video
      const preferred = vids.find((v) => v.site === 'YouTube' && v.type === 'Trailer') || 
                       vids.find((v) => v.site === 'YouTube');
      
      console.log('Found videos:', vids.length, 'Selected:', preferred?.key);
      setVideoKey(preferred?.key ?? null);
    } catch (error) {
      console.error('Failed to load videos:', error);
      setVideoKey(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadVideos();
    }
  }, [loadVideos, id]);

  const handleBackPress = useCallback(() => {
    router.back();
  }, []);

  const handleSearchPress = useCallback(() => {
    router.push('/(tabs)/search');
  }, []);

  const handleRetry = useCallback(() => {
    setWebViewError(false);
    loadVideos();
  }, [loadVideos]);

  // Enhanced YouTube embed HTML with better error handling and debugging
  const generateYouTubeHTML = useCallback((videoKey: string) => {
    return `
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
            background: linear-gradient(135deg, #000 0%, #1a1a1a 100%);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: #FFD700;
            font-size: 18px;
            font-weight: 600;
            z-index: 10;
            border-radius: 16px;
            transition: opacity 0.5s ease;
          }
          .loading-overlay.hidden {
            opacity: 0;
            pointer-events: none;
          }
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255, 215, 0, 0.3);
            border-top: 3px solid #FFD700;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 20px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .error-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #1a1a1a;
            display: none;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: #ff6b6b;
            font-size: 16px;
            font-weight: 600;
            z-index: 20;
            border-radius: 16px;
            text-align: center;
            padding: 20px;
          }
          .error-overlay.visible {
            display: flex;
          }
          .retry-btn {
            background: #FFD700;
            color: #000;
            border: none;
            padding: 12px 24px;
            border-radius: 12px;
            font-weight: 700;
            margin-top: 20px;
            cursor: pointer;
          }
        </style>
      </head>
      <body>
        <div class="video-container">
          <div class="loading-overlay" id="loadingOverlay">
            <div class="loading-spinner"></div>
            <div>Loading YouTube Player...</div>
          </div>
          
          <div class="error-overlay" id="errorOverlay">
            <div>Failed to load video</div>
            <button class="retry-btn" onclick="retryLoad()">Retry</button>
          </div>
          
          <iframe 
            id="youtubeFrame"
            src="https://www.youtube.com/embed/${videoKey}?autoplay=0&mute=0&playsinline=1&modestbranding=1&rel=0&showinfo=0&controls=1&fs=1&enablejsapi=1&iv_load_policy=3&cc_load_policy=0&origin=${Platform.OS === 'android' ? 'https://localhost' : 'https://example.com'}"
            frameborder="0"
            allowfullscreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerpolicy="strict-origin-when-cross-origin">
          </iframe>
        </div>
        
        <script>
          console.log('YouTube player initializing with video key: ${videoKey}');
          
          let loadTimeout;
          let retryCount = 0;
          const maxRetries = 3;
          
          function hideLoading() {
            const overlay = document.getElementById('loadingOverlay');
            if (overlay && !overlay.classList.contains('hidden')) {
              overlay.classList.add('hidden');
              console.log('Loading overlay hidden');
            }
          }
          
          function showError() {
            const loadingOverlay = document.getElementById('loadingOverlay');
            const errorOverlay = document.getElementById('errorOverlay');
            
            if (loadingOverlay) loadingOverlay.style.display = 'none';
            if (errorOverlay) errorOverlay.classList.add('visible');
            
            // Send error message to React Native
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'error',
                message: 'Failed to load YouTube video'
              }));
            }
          }
          
          function retryLoad() {
            if (retryCount < maxRetries) {
              retryCount++;
              console.log('Retrying load, attempt:', retryCount);
              
              const errorOverlay = document.getElementById('errorOverlay');
              const loadingOverlay = document.getElementById('loadingOverlay');
              
              if (errorOverlay) errorOverlay.classList.remove('visible');
              if (loadingOverlay) {
                loadingOverlay.style.display = 'flex';
                loadingOverlay.classList.remove('hidden');
              }
              
              // Reload iframe
              const iframe = document.getElementById('youtubeFrame');
              if (iframe) {
                iframe.src = iframe.src;
              }
              
              setupLoadHandlers();
            }
          }
          
          function setupLoadHandlers() {
            const iframe = document.getElementById('youtubeFrame');
            if (!iframe) return;
            
            // Clear any existing timeout
            if (loadTimeout) clearTimeout(loadTimeout);
            
            iframe.onload = function() {
              console.log('iframe loaded successfully');
              hideLoading();
              
              // Send success message to React Native
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'loaded',
                  message: 'Video loaded successfully'
                }));
              }
            };
            
            iframe.onerror = function(e) {
              console.log('iframe error:', e);
              showError();
            };
            
            // Fallback timeout
            loadTimeout = setTimeout(() => {
              console.log('Load timeout reached');
              const overlay = document.getElementById('loadingOverlay');
              if (overlay && !overlay.classList.contains('hidden')) {
                showError();
              }
            }, 15000); // 15 second timeout
          }
          
          // Initialize
          setupLoadHandlers();
          
          // Additional fallback to hide loading
          setTimeout(() => {
            const overlay = document.getElementById('loadingOverlay');
            if (overlay && !overlay.classList.contains('hidden')) {
              console.log('Fallback: hiding loading overlay');
              hideLoading();
            }
          }, 8000);
          
          // YouTube API ready callback
          function onYouTubeIframeAPIReady() {
            console.log('YouTube API ready');
            hideLoading();
          }
          
          // Listen for messages from parent
          window.addEventListener('message', function(event) {
            console.log('Received message:', event.data);
          });
          
          console.log('Script setup complete');
        </script>
      </body>
      </html>
    `;
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
        <TouchableOpacity style={styles.fullscreenButton} onPress={handleRetry}>
          <View style={styles.buttonInner}>
            <Ionicons name="refresh-outline" size={20} color="#FFD700" />
          </View>
        </TouchableOpacity>
      </View>
      
      {videoKey && !webViewError ? (
        <View style={styles.playerContainer}>
          {/* Player Wrapper with Enhanced Styling */}
          <View style={styles.playerFrame}>
            <View style={styles.playerShadow} />
            <View style={styles.playerGlow} />
            <WebView
              key={`webview-${videoKey}-${Date.now()}`} // Force re-render on retry
              style={[styles.webView, { width: playerSize.width, height: playerSize.height }]}
              source={{ html: generateYouTubeHTML(videoKey) }}
              allowsFullscreenVideo={true}
              mediaPlaybackRequiresUserAction={Platform.OS === 'ios'}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={false}
              scalesPageToFit={Platform.OS === 'android'}
              mixedContentMode="compatibility"
              originWhitelist={['*']}
              allowsInlineMediaPlayback={true}
              bounces={false}
              scrollEnabled={false}
              onMessage={(event) => {
                try {
                  const data = JSON.parse(event.nativeEvent.data);
                  console.log('WebView message:', data);
                  
                  if (data.type === 'error') {
                    setWebViewError(true);
                  }
                } catch (e) {
                  console.log('Failed to parse WebView message:', e);
                }
              }}
              onLoad={() => {
                console.log('WebView loaded successfully');
              }}
              onError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.warn('WebView error: ', nativeEvent);
                setWebViewError(true);
              }}
              onHttpError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.warn('WebView HTTP error: ', nativeEvent);
                if (nativeEvent.statusCode >= 400) {
                  setWebViewError(true);
                }
              }}
              onLoadStart={() => console.log('WebView started loading')}
              onLoadEnd={() => console.log('WebView finished loading')}
              renderError={() => (
                <View style={styles.webViewError}>
                  <Ionicons name="warning-outline" size={48} color="#ff6b6b" />
                  <Text style={styles.webViewErrorText}>Failed to load video player</Text>
                  <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              )}
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
              Enjoy the trailer in high quality. Tap the refresh button above to reload if needed.
            </Text>
            <View style={styles.videoTips}>
              <View style={styles.tipItem}>
                <Ionicons name="volume-high" size={16} color="#FFD700" />
                <Text style={styles.tipText}>Tap to unmute</Text>
              </View>
              <View style={styles.tipItem}>
                <Ionicons name="expand" size={16} color="#FFD700" />
                <Text style={styles.tipText}>Fullscreen available</Text>
              </View>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.noVideoContainer}>
          <View style={styles.noVideoIconContainer}>
            <Ionicons 
              name={webViewError ? "warning-outline" : "film-outline"} 
              size={80} 
              color={webViewError ? "#ff6b6b" : "#FFD700"} 
            />
            <View style={styles.noVideoIconGlow} />
            <View style={styles.noVideoIconPulse} />
          </View>
          <Text style={styles.noVideoTitle}>
            {webViewError ? "Video Player Error" : "No Trailer Available"}
          </Text>
          <Text style={styles.noVideoText}>
            {webViewError 
              ? "There was a problem loading the video player. Please try again or check your connection."
              : "We couldn't find a trailer for this title. Check back later or explore other movies."
            }
          </Text>
          
          <View style={styles.noVideoActions}>
            {webViewError && (
              <TouchableOpacity 
                style={styles.retryBtn} 
                onPress={handleRetry}
                activeOpacity={0.8}
              >
                <View style={styles.buttonGradient} />
                <Ionicons name="refresh" size={18} color="#000" />
                <Text style={styles.backToDetailsText}>Retry</Text>
              </TouchableOpacity>
            )}
            
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
  webViewError: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
  },
  webViewErrorText: {
    color: '#ff6b6b',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 16,
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
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  retryBtn: {
    position: 'relative',
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 28,
    paddingVertical: 18,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#ff6b6b',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
      },
      android: {
        elevation: 10,
      },
    }),
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
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
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