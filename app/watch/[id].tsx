import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import {
  ActivityIndicator,
  AppState,
  AppStateStatus,
  GestureResponderEvent,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useIsFocused } from '@react-navigation/native';
import Video from 'react-native-video';
import { getMovieVideos, getMovieDetails } from '../../lib/tmdb';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const FALLBACK_STREAM_URL =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
const VALIDATION_TIMEOUT_MS = 10_000;
const CONTROLS_HIDE_MS = 4_000;
const PROGRESS_THROTTLE_MS = 1_000; // Update timer label at most once per second

// ─────────────────────────────────────────────────────────────────────────────
// Stream URL Validation
// Checks that the URL exists and returns a successful HTTP status before the
// video player ever mounts. This prevents null-source crashes and black screens.
// ─────────────────────────────────────────────────────────────────────────────
type ValidationResult = { valid: true; url: string } | { valid: false; reason: string };

async function validateStreamUrl(url: string): Promise<ValidationResult> {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return { valid: false, reason: 'Stream URL is empty or missing' };
  }
  try { new URL(url); } catch {
    return { valid: false, reason: 'Malformed URL — cannot parse' };
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), VALIDATION_TIMEOUT_MS);
    const res = await fetch(url, { method: 'HEAD', signal: controller.signal });
    clearTimeout(timer);
    if (res.status >= 400) {
      return { valid: false, reason: `Stream returned HTTP ${res.status}` };
    }
    return { valid: true, url };
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return { valid: false, reason: 'Validation timed out — slow connection?' };
    }
    return { valid: false, reason: err?.message ?? 'Network unreachable' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────────────────────
function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Memoised HUD overlay
// Keeping controls in a separate memo component means the parent (and the
// <Video> element) do NOT re-render on every progress tick.
// ─────────────────────────────────────────────────────────────────────────────
interface HUDProps {
  paused: boolean;
  isMuted: boolean;
  currentTime: number;
  duration: number;
  isBuffering: boolean;
  onPlay: () => void;
  onMute: () => void;
  onSkipBack: () => void;
  onSkipForward: () => void;
  onSeek: (e: GestureResponderEvent) => void;
}

const HUDControls = React.memo(function HUDControls({
  paused, isMuted, currentTime, duration, isBuffering,
  onPlay, onMute, onSkipBack, onSkipForward, onSeek,
}: HUDProps) {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      {/* Buffer spinner — separate from HUD so it shows even without controls */}
      {isBuffering && (
        <View style={hudSt.spinnerWrap}>
          <ActivityIndicator size="large" color="#FFD700" />
        </View>
      )}

      {/* Main control overlay */}
      <View style={hudSt.overlay}>
        {/* Top: stream badge + quality */}
        <View style={hudSt.topRow}>
          <View style={hudSt.liveTag}>
            <View style={hudSt.liveDot} />
            <Text style={hudSt.liveText}>STREAMING</Text>
          </View>
          <View style={hudSt.qualityTag}>
            <Text style={hudSt.qualityText}>HD 1080P</Text>
          </View>
        </View>

        {/* Centre: skip / play / skip */}
        <View style={hudSt.centreRow}>
          <TouchableOpacity style={hudSt.skipBtn} onPress={onSkipBack}>
            <Ionicons name="play-back" size={28} color="#fff" />
            <Text style={hudSt.skipLabel}>−10s</Text>
          </TouchableOpacity>

          <TouchableOpacity style={hudSt.playBtn} onPress={onPlay}>
            <Ionicons name={paused ? 'play' : 'pause'} size={44} color="#000" />
          </TouchableOpacity>

          <TouchableOpacity style={hudSt.skipBtn} onPress={onSkipForward}>
            <Ionicons name="play-forward" size={28} color="#fff" />
            <Text style={hudSt.skipLabel}>+10s</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom: seek bar + timer + mute */}
        <View style={hudSt.bottomCol}>
          <TouchableOpacity
            style={hudSt.seekbar}
            activeOpacity={1}
            onPress={onSeek}
          >
            <View style={hudSt.seekTrack}>
              <View style={[hudSt.seekFill, { width: `${progress}%` as any }]} />
            </View>
          </TouchableOpacity>

          <View style={hudSt.timerRow}>
            <Text style={hudSt.timerText}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </Text>
            <TouchableOpacity style={hudSt.muteBtn} onPress={onMute}>
              <Ionicons
                name={isMuted ? 'volume-mute' : 'volume-high'}
                size={20}
                color="#FFD700"
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function WatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isFocused = useIsFocused();
  const { width } = useWindowDimensions();

  // ── Refs ──────────────────────────────────────────────────────────────────
  // mountedRef prevents calling setState after the component has unmounted,
  // which is the most common source of memory leaks in async code.
  const mountedRef        = useRef(true);
  const videoRef          = useRef<any>(null);
  const controlsTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Store currentTime / duration in refs so seek/skip handlers read the latest
  // values WITHOUT needing them in their dependency arrays (prevents stale closures).
  const currentTimeRef    = useRef(0);
  const durationRef       = useRef(0);
  const lastProgressTime  = useRef(0); // throttle progress state updates

  // ── Core state ────────────────────────────────────────────────────────────
  const [movie,       setMovie]       = useState<any>(null);
  const [videoKey,    setVideoKey]    = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError,   setDataError]   = useState(false);
  const [playMode,    setPlayMode]    = useState<'movie' | 'trailer'>('movie');

  // ── Stream validation state ───────────────────────────────────────────────
  const [streamUrl,    setStreamUrl]   = useState<string | null>(null);
  const [validating,   setValidating]  = useState(false);
  const [streamError,  setStreamError] = useState<string | null>(null);

  // ── WebView state ─────────────────────────────────────────────────────────
  const [webViewError, setWebViewError] = useState(false);

  // ── Native video player state ─────────────────────────────────────────────
  // Start paused=true — only auto-play after stream has been validated.
  const [paused,        setPaused]        = useState(true);
  const [currentTime,   setCurrentTime]   = useState(0);
  const [duration,      setDuration]      = useState(0);
  const [isBuffering,   setIsBuffering]   = useState(false);
  const [videoError,    setVideoError]    = useState(false);
  const [isMuted,       setIsMuted]       = useState(false);
  const [showControls,  setShowControls]  = useState(true);

  // ── AppState ──────────────────────────────────────────────────────────────
  const [appActive, setAppActive] = useState(
    () => AppState.currentState === 'active',
  );

  // ── Derived: effective paused ─────────────────────────────────────────────
  // Video MUST be paused when: app is in background, screen is not focused,
  // user explicitly paused, or there's a playback error.
  const effectivePaused =
    paused || !isFocused || !appActive || !!videoError;

  // ── Player dimensions ─────────────────────────────────────────────────────
  const playerSize = useMemo(() => {
    const w = Math.min(width - 32, width * 0.95);
    return { width: w, height: Math.round((w * 9) / 16) };
  }, [width]);

  // ─────────────────────────────────────────────────────────────────────────
  // Lifecycle: cleanup on unmount
  // Clears ALL timers and marks component as dead so no async setState runs.
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Lifecycle: AppState (background / inactive / active)
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (!mountedRef.current) return;
      const isNowActive = next === 'active';
      setAppActive(isNowActive);
      // Force-pause when app goes to background or becomes inactive
      if (!isNowActive) setPaused(true);
    });
    return () => sub.remove();
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Lifecycle: Pause when screen loses focus (navigating away)
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isFocused) setPaused(true);
  }, [isFocused]);

  // ─────────────────────────────────────────────────────────────────────────
  // Stream validation
  // ─────────────────────────────────────────────────────────────────────────
  const validateAndSetStream = useCallback(async (url: string, isFallback = false) => {
    if (!mountedRef.current) return;
    setValidating(true);
    setStreamError(null);
    setStreamUrl(null);
    setVideoError(false);

    const result = await validateStreamUrl(url);

    if (!mountedRef.current) return;
    setValidating(false);

    if (result.valid) {
      setStreamUrl(result.url);
      setPaused(false); // only allow playback now that the URL is confirmed
    } else {
      console.warn('[WatchScreen] Stream validation failed:', result.reason);
      if (!isFallback) {
        // Silently try the reliable fallback before surfacing an error
        await validateAndSetStream(FALLBACK_STREAM_URL, true);
      } else {
        // Both the primary and fallback failed — show error to user
        setStreamError(result.reason);
      }
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Load movie metadata + kick off stream validation
  // ─────────────────────────────────────────────────────────────────────────
  const loadMovieData = useCallback(async () => {
    if (!id || !mountedRef.current) return;
    setDataLoading(true);
    setDataError(false);

    try {
      const [vids, movieData] = await Promise.all([
        getMovieVideos(Number(id)),
        getMovieDetails(Number(id)),
      ]);

      if (!mountedRef.current) return;

      if (movieData) setMovie(movieData);

      const trailer =
        vids.find((v: any) => v.site === 'YouTube' && v.type === 'Trailer') ||
        vids.find((v: any) => v.site === 'YouTube');
      setVideoKey(trailer?.key ?? null);

      // Validate the stream in parallel — player won't mount until this resolves
      validateAndSetStream(FALLBACK_STREAM_URL);
    } catch (err) {
      console.error('[WatchScreen] Failed to load movie data:', err);
      if (mountedRef.current) setDataError(true);
    } finally {
      if (mountedRef.current) setDataLoading(false);
    }
  }, [id, validateAndSetStream]);

  useEffect(() => {
    loadMovieData();
  }, [loadMovieData]);

  // ─────────────────────────────────────────────────────────────────────────
  // Controls auto-hide
  // ─────────────────────────────────────────────────────────────────────────
  const showControlsTemporarily = useCallback(() => {
    if (!mountedRef.current) return;
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      if (mountedRef.current) setShowControls(false);
    }, CONTROLS_HIDE_MS);
  }, []);

  useEffect(() => {
    showControlsTemporarily();
    return () => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, [showControlsTemporarily]);

  // ─────────────────────────────────────────────────────────────────────────
  // Video event handlers
  // ─────────────────────────────────────────────────────────────────────────
  const handleVideoLoad = useCallback((data: any) => {
    if (!mountedRef.current) return;
    durationRef.current = data.duration ?? 0;
    setDuration(data.duration ?? 0);
    setIsBuffering(false);
  }, []);

  // Throttled: only push a re-render once per second so the Video component
  // itself never triggers expensive React reconciliation every 250ms.
  const handleVideoProgress = useCallback((data: any) => {
    if (!mountedRef.current) return;
    currentTimeRef.current = data.currentTime;
    const now = Date.now();
    if (now - lastProgressTime.current >= PROGRESS_THROTTLE_MS) {
      lastProgressTime.current = now;
      setCurrentTime(data.currentTime);
    }
  }, []);

  const handleVideoBuffer = useCallback(({ isBuffering: buf }: { isBuffering: boolean }) => {
    if (!mountedRef.current) return;
    setIsBuffering(buf);
  }, []);

  const handleVideoError = useCallback(() => {
    if (!mountedRef.current) return;
    setVideoError(true);
    setPaused(true);
    setIsBuffering(false);
  }, []);

  const handleVideoEnd = useCallback(() => {
    if (!mountedRef.current) return;
    setPaused(true);
    setCurrentTime(0);
    currentTimeRef.current = 0;
    // Seek back to start so controls show correct position
    try { videoRef.current?.seek(0); } catch { /* no-op */ }
    setShowControls(true);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Playback controls
  // ─────────────────────────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    setPaused(p => !p);
    showControlsTemporarily();
  }, [showControlsTemporarily]);

  const toggleMute = useCallback(() => {
    setIsMuted(m => !m);
    showControlsTemporarily();
  }, [showControlsTemporarily]);

  const skipBackward = useCallback(() => {
    const target = Math.max(0, currentTimeRef.current - 10);
    try { videoRef.current?.seek(target); } catch { /* no-op */ }
    setCurrentTime(target);
    currentTimeRef.current = target;
    showControlsTemporarily();
  }, [showControlsTemporarily]);

  const skipForward = useCallback(() => {
    const target = Math.min(durationRef.current, currentTimeRef.current + 10);
    try { videoRef.current?.seek(target); } catch { /* no-op */ }
    setCurrentTime(target);
    currentTimeRef.current = target;
    showControlsTemporarily();
  }, [showControlsTemporarily]);

  // Touch-to-seek: derive target time from tap X position on the track
  const handleSeek = useCallback((e: GestureResponderEvent) => {
    if (!durationRef.current) return;
    const { locationX } = e.nativeEvent;
    const containerWidth = playerSize.width - 28; // track padding
    const pct = Math.min(1, Math.max(0, locationX / containerWidth));
    const target = pct * durationRef.current;
    try { videoRef.current?.seek(target); } catch { /* no-op */ }
    setCurrentTime(target);
    currentTimeRef.current = target;
    showControlsTemporarily();
  }, [playerSize.width, showControlsTemporarily]);

  const handleContainerPress = useCallback(() => {
    if (showControls) setShowControls(false);
    else showControlsTemporarily();
  }, [showControls, showControlsTemporarily]);

  // ─────────────────────────────────────────────────────────────────────────
  // Mode switching — ensure only ONE player is active at a time
  // ─────────────────────────────────────────────────────────────────────────
  const switchToMovie = useCallback(() => {
    // Always pause native player first, then switch mode
    setPaused(true);
    setWebViewError(false);
    setPlayMode('movie');
    // Resume only if stream is valid and screen is focused
    if (streamUrl && !streamError && !videoError) {
      setTimeout(() => {
        if (mountedRef.current) setPaused(false);
      }, 100);
    }
  }, [streamUrl, streamError, videoError]);

  const switchToTrailer = useCallback(() => {
    // Pause the native player before the WebView mounts
    setPaused(true);
    setWebViewError(false);
    setPlayMode('trailer');
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Global retry
  // ─────────────────────────────────────────────────────────────────────────
  const handleRetry = useCallback(() => {
    setWebViewError(false);
    setVideoError(false);
    setStreamError(null);
    setPaused(true);
    setCurrentTime(0);
    setDuration(0);
    currentTimeRef.current = 0;
    durationRef.current = 0;
    if (dataError) {
      loadMovieData();
    } else if (playMode === 'movie') {
      validateAndSetStream(FALLBACK_STREAM_URL);
    } else {
      setWebViewError(false);
    }
  }, [dataError, playMode, validateAndSetStream, loadMovieData]);

  // ─────────────────────────────────────────────────────────────────────────
  // YouTube embed HTML (memoised on videoKey — only re-generates when the
  // trailer changes, not on every render)
  // ─────────────────────────────────────────────────────────────────────────
  const youTubeHTML = useMemo(() => {
    if (!videoKey) return '';
    return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:100%;height:100%;background:#000;overflow:hidden}
    .w{width:100%;height:100%;display:flex;align-items:center;justify-content:center;position:relative;background:#000}
    iframe{width:100%;height:100%;border:none}
    #ld{position:absolute;top:0;left:0;width:100%;height:100%;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#FFD700;font:16px sans-serif;z-index:9;transition:opacity .4s}
    #ld.h{opacity:0;pointer-events:none}
    .sp{width:36px;height:36px;border:3px solid rgba(255,215,0,.2);border-top:3px solid #FFD700;border-radius:50%;animation:r .8s linear infinite;margin-bottom:14px}
    @keyframes r{to{transform:rotate(360deg)}}
  </style>
</head>
<body>
  <div class="w">
    <div id="ld"><div class="sp"></div><div>Loading Trailer…</div></div>
    <iframe id="p"
      src="https://www.youtube.com/embed/${videoKey}?autoplay=1&mute=0&playsinline=1&modestbranding=1&rel=0&controls=1"
      allowfullscreen
      allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture"
    ></iframe>
  </div>
  <script>
    var p=document.getElementById('p'),l=document.getElementById('ld');
    p.onload=function(){setTimeout(function(){l.classList.add('h')},600)};
    // Safety: always hide loader after 8s to prevent infinite spinner
    setTimeout(function(){l.classList.add('h')},8000);
  </script>
</body>
</html>`;
  }, [videoKey]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  const movieTitle = movie?.title || movie?.name || 'Watch Stream';

  // ── Full-screen loading ──────────────────────────────────────────────────
  if (dataLoading) {
    return (
      <SafeAreaView style={st.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0b0b0f" />
        <View style={st.centreBox}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={st.loadTitle}>Preparing Stream…</Text>
          <Text style={st.loadSub}>Fetching movie info and validating source</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Full-screen error ────────────────────────────────────────────────────
  if (dataError) {
    return (
      <SafeAreaView style={st.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0b0b0f" />
        <View style={st.centreBox}>
          <Ionicons name="cloud-offline-outline" size={64} color="#ff6b6b" />
          <Text style={st.errTitle}>Failed to Load</Text>
          <Text style={st.errDesc}>
            Could not fetch movie data. Check your connection and try again.
          </Text>
          <TouchableOpacity style={st.retryBtn} onPress={handleRetry}>
            <Ionicons name="refresh" size={18} color="#000" />
            <Text style={st.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={st.backLink} onPress={() => router.back()}>
            <Text style={st.backLinkText}>← Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={st.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0b0f" />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={st.header}>
        <TouchableOpacity style={st.headerBtn} onPress={() => router.back()}>
          <View style={st.btnInner}>
            <Ionicons name="chevron-back" size={24} color="#FFD700" />
          </View>
        </TouchableOpacity>

        <View style={st.headerMid}>
          <Text style={st.headerTitle} numberOfLines={1}>{movieTitle}</Text>
          <Text style={st.headerSub}>
            {playMode === 'movie' ? 'Feature Film (HD)' : 'Official Trailer'}
          </Text>
        </View>

        <TouchableOpacity style={st.headerBtn} onPress={handleRetry}>
          <View style={st.btnInner}>
            <Ionicons name="refresh" size={20} color="#FFD700" />
          </View>
        </TouchableOpacity>
      </View>

      {/* ── Mode Toggle (only shown when a trailer exists) ────────────── */}
      {videoKey && (
        <View style={st.segRow}>
          <TouchableOpacity
            style={[st.seg, playMode === 'movie' && st.segActive]}
            onPress={switchToMovie}
          >
            <Ionicons
              name="play-circle"
              size={15}
              color={playMode === 'movie' ? '#000' : '#FFD700'}
            />
            <Text style={[st.segText, playMode === 'movie' && st.segTextActive]}>
              Movie (HD)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[st.seg, playMode === 'trailer' && st.segActive]}
            onPress={switchToTrailer}
          >
            <Ionicons
              name="film"
              size={15}
              color={playMode === 'trailer' ? '#000' : '#FFD700'}
            />
            <Text style={[st.segText, playMode === 'trailer' && st.segTextActive]}>
              Trailer
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Scrollable Content ───────────────────────────────────────────── */}
      <ScrollView
        style={st.scroll}
        contentContainerStyle={st.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Player Frame ─────────────────────────────────────────────── */}
        {/* Only render any media when the screen is focused. On blur, replace
            with a lightweight placeholder so ALL media is fully unmounted. */}
        {isFocused ? (
          <View style={[st.playerFrame, { width: playerSize.width, height: playerSize.height }]}>

            {/* ① Stream validation spinner */}
            {validating && playMode === 'movie' && (
              <View style={st.fullOverlay}>
                <ActivityIndicator size="large" color="#FFD700" />
                <Text style={st.overlayMsg}>Validating stream…</Text>
                <Text style={st.overlaySub}>Checking source availability</Text>
              </View>
            )}

            {/* ② Player-level error overlay (stream / network / video error) */}
            {!validating && (streamError || videoError || (webViewError && playMode === 'trailer')) && (
              <View style={st.fullOverlay}>
                <Ionicons name="warning-outline" size={52} color="#ff6b6b" />
                <Text style={st.overlayErrTitle}>Playback Interrupted</Text>
                <Text style={st.overlayErrDesc}>
                  {streamError ?? 'The video failed to load. Tap retry to reconnect.'}
                </Text>
                <TouchableOpacity style={st.retryBtn} onPress={handleRetry}>
                  <Ionicons name="refresh" size={16} color="#000" />
                  <Text style={st.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ③ YouTube Trailer WebView
                 – Only mounts in 'trailer' mode when there's a valid key
                 – Stable key (webview-{videoKey}) prevents re-creation loops */}
            {playMode === 'trailer' && videoKey && !webViewError && (
              <WebView
                key={`webview-${videoKey}`}
                style={st.webView}
                source={{ html: youTubeHTML }}
                allowsFullscreenVideo
                mediaPlaybackRequiresUserAction={false}
                javaScriptEnabled
                domStorageEnabled
                startInLoadingState={false}
                scalesPageToFit
                originWhitelist={['*']}
                allowsInlineMediaPlayback
                scrollEnabled={false}
                bounces={false}
                onError={() => setWebViewError(true)}
                onHttpError={() => setWebViewError(true)}
              />
            )}

            {/* ④ Native Video Player
                 – ONLY mounts after streamUrl has been validated (not null)
                 – NEVER renders if there is a stream error or video error
                 – effectivePaused merges all pause conditions into one prop */}
            {playMode === 'movie' && streamUrl && !streamError && !videoError && !validating && (
              <TouchableOpacity
                activeOpacity={1}
                style={st.videoWrap}
                onPress={handleContainerPress}
              >
                <Video
                  ref={videoRef}
                  source={{ uri: streamUrl }}
                  style={st.video}
                  paused={effectivePaused}
                  resizeMode="contain"
                  muted={isMuted}
                  playInBackground={false}
                  playWhenInactive={false}
                  progressUpdateInterval={500}
                  onLoad={handleVideoLoad}
                  onProgress={handleVideoProgress}
                  onBuffer={handleVideoBuffer}
                  onError={handleVideoError}
                  onEnd={handleVideoEnd}
                />

                {showControls && (
                  <HUDControls
                    paused={effectivePaused}
                    isMuted={isMuted}
                    currentTime={currentTime}
                    duration={duration}
                    isBuffering={isBuffering}
                    onPlay={togglePlay}
                    onMute={toggleMute}
                    onSkipBack={skipBackward}
                    onSkipForward={skipForward}
                    onSeek={handleSeek}
                  />
                )}
              </TouchableOpacity>
            )}

            {/* Corner tech accents (purely decorative) */}
            <View style={st.cTL} pointerEvents="none" />
            <View style={st.cTR} pointerEvents="none" />
            <View style={st.cBL} pointerEvents="none" />
            <View style={st.cBR} pointerEvents="none" />
          </View>
        ) : (
          /* Screen not focused — render nothing that plays audio/video */
          <View style={[st.playerFrame, st.playerPlaceholder,
            { width: playerSize.width, height: playerSize.height }]}>
            <ActivityIndicator size="small" color="#FFD700" />
            <Text style={st.overlayMsg}>Resuming…</Text>
          </View>
        )}

        {/* ── Details Tray ─────────────────────────────────────────────── */}
        <View style={st.tray}>
          <View style={st.badgeRow}>
            <View style={st.badge}>
              <Text style={st.badgeText}>{movie?.genres?.[0]?.name ?? 'Streaming'}</Text>
            </View>
            <View style={st.badge}>
              <Text style={st.badgeText}>
                {movie?.release_date
                  ? new Date(movie.release_date).getFullYear()
                  : '2026'}
              </Text>
            </View>
            {movie?.vote_average != null && (
              <View style={st.ratingBadge}>
                <Ionicons name="star" size={12} color="#FFD700" />
                <Text style={st.ratingText}>{movie.vote_average.toFixed(1)}</Text>
              </View>
            )}
          </View>

          <Text style={st.synopsis}>
            {movie?.overview ??
              'Enjoy fast, buffer-free streaming. Toggle between the feature film and the official trailer above.'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0b0f' },

  // Full-screen loading / error states
  centreBox: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: 32, gap: 12,
  },
  loadTitle: { color: '#FFD700', fontSize: 20, fontWeight: '900', marginTop: 16 },
  loadSub:   { color: '#888', fontSize: 14, textAlign: 'center' },
  errTitle:  { color: '#ff6b6b', fontSize: 20, fontWeight: '800', marginTop: 16 },
  errDesc: {
    color: '#888', fontSize: 14, textAlign: 'center',
    lineHeight: 20, maxWidth: 280,
  },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFD700', paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 16, marginTop: 8,
  },
  retryBtnText: { color: '#000', fontWeight: '800', fontSize: 15 },
  backLink:     { marginTop: 14 },
  backLinkText: { color: '#9aa0a6', fontSize: 14 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#111118',
    borderBottomWidth: 1, borderBottomColor: '#1d1d2b',
  },
  headerBtn: {
    backgroundColor: 'rgba(255,215,0,0.1)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)',
  },
  btnInner:    { padding: 10 },
  headerMid:   { flex: 1, alignItems: 'center', marginHorizontal: 12 },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '800', textAlign: 'center' },
  headerSub:   { color: '#FFD700', fontSize: 11, fontWeight: '600', marginTop: 2 },

  // Mode toggle
  segRow: {
    flexDirection: 'row', backgroundColor: '#12121c',
    marginHorizontal: 16, marginTop: 14, padding: 4,
    borderRadius: 14, borderWidth: 1, borderColor: '#1d1d2b',
  },
  seg: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 10,
  },
  segActive:     { backgroundColor: '#FFD700' },
  segText:       { color: '#FFD700', fontSize: 13, fontWeight: '700' },
  segTextActive: { color: '#000' },

  // Scrollable area
  scroll:       { flex: 1 },
  scrollContent: { alignItems: 'center', paddingTop: 22, paddingBottom: 48 },

  // Player container
  playerFrame: {
    position: 'relative', backgroundColor: '#000',
    borderRadius: 18, overflow: 'hidden',
    borderWidth: 1.5, borderColor: 'rgba(255,215,0,0.3)',
    ...Platform.select({
      ios: {
        shadowColor: '#FFD700', shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15, shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  playerPlaceholder: { justifyContent: 'center', alignItems: 'center', gap: 10 },

  // In-player overlays
  fullOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0c0c10',
    justifyContent: 'center', alignItems: 'center',
    padding: 24, gap: 10, zIndex: 20,
  },
  overlayMsg:      { color: '#888', fontSize: 14, textAlign: 'center', marginTop: 8 },
  overlaySub:      { color: '#555', fontSize: 12, textAlign: 'center' },
  overlayErrTitle: { color: '#ff6b6b', fontSize: 18, fontWeight: '800' },
  overlayErrDesc: {
    color: '#888', fontSize: 13, textAlign: 'center',
    lineHeight: 18, maxWidth: 260,
  },

  // WebView / Native Video
  webView:  { flex: 1, backgroundColor: '#000' },
  videoWrap: { flex: 1, width: '100%', height: '100%' },
  video:     { width: '100%', height: '100%', backgroundColor: '#000' },

  // Corner accents (decorative)
  cTL: {
    position: 'absolute', top: 0, left: 0, width: 14, height: 14,
    borderLeftWidth: 3, borderTopWidth: 3, borderColor: '#FFD700', borderTopLeftRadius: 18,
  },
  cTR: {
    position: 'absolute', top: 0, right: 0, width: 14, height: 14,
    borderRightWidth: 3, borderTopWidth: 3, borderColor: '#FFD700', borderTopRightRadius: 18,
  },
  cBL: {
    position: 'absolute', bottom: 0, left: 0, width: 14, height: 14,
    borderLeftWidth: 3, borderBottomWidth: 3, borderColor: '#FFD700', borderBottomLeftRadius: 18,
  },
  cBR: {
    position: 'absolute', bottom: 0, right: 0, width: 14, height: 14,
    borderRightWidth: 3, borderBottomWidth: 3, borderColor: '#FFD700', borderBottomRightRadius: 18,
  },

  // Details tray
  tray:        { width: '100%', paddingHorizontal: 20, paddingTop: 24 },
  badgeRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  badge: {
    backgroundColor: '#161622', paddingHorizontal: 11, paddingVertical: 5,
    borderRadius: 8, borderWidth: 1, borderColor: '#232335',
  },
  badgeText:   { color: '#9aa0a6', fontSize: 12, fontWeight: '700' },
  ratingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,215,0,0.1)', paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 8,
  },
  ratingText:  { color: '#FFD700', fontSize: 12, fontWeight: '800' },
  synopsis:    { color: '#a0aec0', fontSize: 14, lineHeight: 22 },
});

// HUD-specific stylesheet (kept separate so tree-shaking keeps the component small)
const hudSt = StyleSheet.create({
  spinnerWrap: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center', zIndex: 5,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'space-between',
    padding: 14, zIndex: 6,
  },
  topRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  liveTag: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.15)',
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 7, borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)',
  },
  liveDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#FFD700', marginRight: 5,
  },
  liveText:    { color: '#FFD700', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  qualityTag:  { backgroundColor: '#fff', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5 },
  qualityText: { color: '#000', fontSize: 8, fontWeight: '900' },

  centreRow: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 34,
  },
  skipBtn:   { alignItems: 'center' },
  skipLabel: { color: '#fff', fontSize: 10, fontWeight: '700', marginTop: 3 },
  playBtn: {
    backgroundColor: '#FFD700', width: 66, height: 66, borderRadius: 33,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#FFD700', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
  },

  bottomCol: { gap: 10 },
  seekbar:   { height: 12, justifyContent: 'center', width: '100%' },
  seekTrack: {
    height: 4, backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 2, overflow: 'hidden',
  },
  seekFill:  { height: '100%', backgroundColor: '#FFD700', borderRadius: 2 },
  timerRow:  {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  timerText: {
    color: '#fff', fontSize: 12, fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  muteBtn: {
    backgroundColor: 'rgba(255,215,0,0.15)', padding: 7, borderRadius: 9,
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)',
  },
});