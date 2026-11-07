import React, { useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { colors, rounded, spacing } from '../../constants/theme';
import { useDriver } from '../../hooks/use-driver';
import { SurgeArea } from '../../types/driver';

interface RadarMapViewProps {
  onSelectSurge?: (surge: SurgeArea) => void;
  onSimulateOrder?: () => void;
}

export const RadarMapView: React.FC<RadarMapViewProps> = ({ onSelectSurge, onSimulateOrder }) => {
  const { currentLocation, isOnline, surgeAreas } = useDriver();
  const webViewRef = useRef<WebView<object>>(null);

  const lat = currentLocation?.latitude ?? -6.1952;
  const lon = currentLocation?.longitude ?? 106.8231;

  // Generate self-contained high-contrast Night Mode GPS HUD Map HTML
  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          background-color: #121517;
          overflow: hidden;
          width: 100vw;
          height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          user-select: none;
        }
        svg {
          width: 100%;
          height: 100%;
          display: block;
        }
        @keyframes pulseRadar {
          0% { transform: scale(0.8); opacity: 0.8; }
          50% { transform: scale(1.5); opacity: 0.25; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes surgePulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.1); opacity: 0.9; }
        }
        .radar-wave-1 {
          animation: pulseRadar 2.4s ease-out infinite;
          transform-origin: 200px 380px;
        }
        .radar-wave-2 {
          animation: pulseRadar 2.4s ease-out infinite 1.2s;
          transform-origin: 200px 380px;
        }
        .surge-heat {
          animation: surgePulse 3s ease-in-out infinite;
          transform-origin: 150px 280px;
          cursor: pointer;
        }
      </style>
    </head>
    <body>
      <svg viewBox="0 0 400 700" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="heatSurge" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#ff3b30" stop-opacity="0.55" />
            <stop offset="60%" stop-color="#ff9500" stop-opacity="0.25" />
            <stop offset="100%" stop-color="#ff3b30" stop-opacity="0" />
          </radialGradient>
          <radialGradient id="heatSurgeSecondary" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#c8ff00" stop-opacity="0.35" />
            <stop offset="100%" stop-color="#c8ff00" stop-opacity="0" />
          </radialGradient>
          <linearGradient id="driverCone" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stop-color="#c8ff00" stop-opacity="0.35" />
            <stop offset="100%" stop-color="#c8ff00" stop-opacity="0" />
          </linearGradient>
        </defs>

        <!-- Urban Parcels & Blocks -->
        <g opacity="0.6">
          <rect x="30" y="80" width="70" height="60" rx="4" fill="#182026" stroke="#222C33" />
          <rect x="120" y="75" width="60" height="50" rx="4" fill="#1A2228" stroke="#222C33" />
          <rect x="40" y="160" width="80" height="80" rx="4" fill="#171F24" stroke="#222C33" />
          <rect x="30" y="320" width="90" height="70" rx="4" fill="#1A2228" stroke="#242E36" />
          <rect x="25" y="410" width="95" height="90" rx="4" fill="#182025" stroke="#222A32" />
          <rect x="35" y="520" width="80" height="70" rx="4" fill="#181F25" stroke="#212930" />

          <rect x="270" y="240" width="70" height="60" rx="4" fill="#171E23" stroke="#20272E" />
          <rect x="280" y="320" width="85" height="70" rx="4" fill="#1A2228" stroke="#242E36" />
          <rect x="275" y="410" width="95" height="85" rx="4" fill="#192127" stroke="#222B33" />
          <rect x="280" y="520" width="90" height="80" rx="4" fill="#182025" stroke="#212A32" />
        </g>

        <!-- Minor Connecting Streets -->
        <g stroke="#222C34" stroke-width="8" opacity="0.8">
          <line x1="-10" y1="140" x2="420" y2="140" />
          <line x1="-10" y1="230" x2="420" y2="230" />
          <line x1="-10" y1="340" x2="420" y2="330" />
          <line x1="-10" y1="430" x2="420" y2="420" />
          <line x1="-10" y1="510" x2="420" y2="510" />
          <line x1="-10" y1="610" x2="420" y2="605" />
        </g>

        <!-- MAJOR ARTERIAL ROAD: JL. SUDIRMAN / MH THAMRIN -->
        <path d="M200,-20 L200,230 L195,380 L190,720" fill="none" stroke="#161C22" stroke-width="32" stroke-linejoin="round" />
        <path d="M200,-20 L200,230 L195,380 L190,720" fill="none" stroke="#2A3744" stroke-width="22" stroke-linejoin="round" />
        <path d="M200,-20 L200,230 L195,380 L190,720" fill="none" stroke="#C8FF00" stroke-width="2" stroke-dasharray="10,8" stroke-opacity="0.75" />

        <!-- RASUNA SAID / KUNINGAN -->
        <path d="M350,-20 L320,340 L310,720" fill="none" stroke="#24303C" stroke-width="16" />
        <path d="M350,-20 L320,340 L310,720" fill="none" stroke="#FFA726" stroke-width="1.5" stroke-dasharray="6,6" stroke-opacity="0.4" />

        <!-- BUNDARAN HI ROUNDABOUT -->
        <circle cx="200" cy="230" r="28" fill="#14181D" stroke="#2A3744" stroke-width="12" />
        <circle cx="200" cy="230" r="28" fill="none" stroke="#C8FF00" stroke-width="1.5" stroke-dasharray="4,4" stroke-opacity="0.9" />
        <circle cx="200" cy="230" r="14" fill="#0C2333" stroke="#16384F" stroke-width="2" />
        <circle cx="200" cy="230" r="3.5" fill="#C8FF00" />

        <!-- SURGE HEATMAP ZONE: Grand Indonesia & Sudirman -->
        <g class="surge-heat" onclick="window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({type: 'SURGE_SELECT', id: 'surge-1'}))">
          <circle cx="150" cy="280" r="85" fill="url(#heatSurge)" />
          <circle cx="150" cy="280" r="60" fill="none" stroke="#FF3B30" stroke-width="1.5" stroke-dasharray="5,4" opacity="0.5" />
          <!-- Surge Marker Tag -->
          <rect x="110" y="270" width="76" height="22" rx="11" fill="#1B1C1C" stroke="#7A2222" stroke-width="1" />
          <circle cx="122" cy="281" r="4" fill="#FF3B30" />
          <text x="132" y="285" fill="#FFFFFF" font-size="10" font-weight="bold">1.2x SURGE</text>
        </g>

        <!-- Landmark Badges -->
        <g transform="translate(110, 215)">
          <rect x="0" y="0" width="84" height="20" rx="4" fill="#191D21" stroke="#353F47" stroke-width="1" />
          <circle cx="10" cy="10" r="3" fill="#C8FF00" />
          <text x="18" y="13" fill="#E4E2E1" font-size="9" font-weight="600">Grand Indonesia</text>
        </g>

        <!-- Street Labels -->
        <text x="212" y="110" fill="#7E8B99" font-size="9" font-weight="700" letter-spacing="1.5" transform="rotate(90 212 110)">JL. M.H. THAMRIN</text>
        <text x="206" y="470" fill="#7E8B99" font-size="9" font-weight="700" letter-spacing="1.5" transform="rotate(90 206 470)">JL. JEND. SUDIRMAN</text>

        <!-- DRIVER GPS POSITION & RADAR PULSE -->
        <g id="driver-pin" transform="translate(200, 380)">
          <!-- Heading Cone -->
          <path d="M0,0 L-28,-75 A75,75 0 0,1 28,-75 Z" fill="url(#driverCone)" />
          
          <!-- Radar Rings -->
          ${
            isOnline
              ? `
            <circle class="radar-wave-1" cx="0" cy="0" r="30" fill="none" stroke="#C8FF00" stroke-width="1.5" />
            <circle class="radar-wave-2" cx="0" cy="0" r="30" fill="none" stroke="#C8FF00" stroke-width="1.5" />
          `
              : ''
          }

          <!-- Outer Glow Circle -->
          <circle cx="0" cy="0" r="20" fill="#1B1C1C" stroke="${isOnline ? '#C8FF00' : '#555'}" stroke-width="3" />
          
          <!-- Inner Vehicle Pin -->
          <circle cx="0" cy="0" r="14" fill="${isOnline ? '#C8FF00' : '#444'}" />
          <!-- Motorcycle Arrow Silhouette -->
          <polygon points="0,-8 6,6 0,3 -6,6" fill="#000000" />
        </g>
      </svg>
    </body>
    </html>
  `;

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'SURGE_SELECT' && onSelectSurge) {
        const found = surgeAreas.find((s) => s.id === data.id);
        if (found) onSelectSurge(found);
      }
    } catch (e) {
      // ignore
    }
  };

  const handleRecenter = () => {
    webViewRef.current?.reload();
  };

  return (
    <View style={styles.container}>
      <WebView<object>
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: mapHtml }}
        style={styles.webView}
        scrollEnabled={false}
        bounces={false}
        javaScriptEnabled
        domStorageEnabled
        onMessage={handleMessage}
      />

      {/* Floating Control Buttons */}
      <View style={styles.floatingControls}>
        {/* Recenter Button */}
        <TouchableOpacity activeOpacity={0.8} onPress={handleRecenter} style={styles.controlBtn}>
          <Ionicons name="locate" size={20} color={colors.primary} />
        </TouchableOpacity>

        {/* Demo Test Order Trigger */}
        {onSimulateOrder && (
          <TouchableOpacity activeOpacity={0.8} onPress={onSimulateOrder} style={styles.simulateBtn}>
            <MaterialIcons name="bolt" size={18} color={colors.black} />
            <Text style={styles.simulateText}>Test Order</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#121517',
  },
  webView: {
    flex: 1,
    backgroundColor: '#121517',
  },
  floatingControls: {
    position: 'absolute',
    right: spacing.lg,
    bottom: 24,
    gap: spacing.sm,
    alignItems: 'flex-end',
    zIndex: 20,
  },
  controlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(27, 28, 28, 0.95)',
    borderWidth: 1,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  simulateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: rounded.full,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  simulateText: {
    color: colors.black,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
