import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
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
  const [scaleKey, setScaleKey] = useState(0);

  const lat = currentLocation?.latitude ?? -6.1952;
  const lon = currentLocation?.longitude ?? 106.8231;

  const handleRecenter = () => {
    setScaleKey((k) => k + 1);
  };

  const handleSurgeClick = (surgeId: string) => {
    const found = surgeAreas.find((s) => s.id === surgeId);
    if (found && onSelectSurge) {
      onSelectSurge(found);
    }
  };

  return (
    <View style={styles.container}>
      <style>{`
        @keyframes pulseRadarWeb {
          0% { transform: scale(0.8); opacity: 0.8; }
          50% { transform: scale(1.5); opacity: 0.25; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes surgePulseWeb {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.1); opacity: 0.9; }
        }
        .radar-wave-web-1 {
          animation: pulseRadarWeb 2.4s ease-out infinite;
          transform-origin: 200px 380px;
        }
        .radar-wave-web-2 {
          animation: pulseRadarWeb 2.4s ease-out infinite 1.2s;
          transform-origin: 200px 380px;
        }
        .surge-heat-web {
          animation: surgePulseWeb 3s ease-in-out infinite;
          transform-origin: 150px 280px;
          cursor: pointer;
        }
      `}</style>

      {/* Direct Native Browser SVG Map */}
      <svg
        key={scaleKey}
        viewBox="0 0 400 700"
        preserveAspectRatio="xMidYMid slice"
        style={{ width: '100%', height: '100%', display: 'block', backgroundColor: '#121517' }}
      >
        <defs>
          <radialGradient id="heatSurgeWeb" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ff3b30" stopOpacity="0.55" />
            <stop offset="60%" stopColor="#ff9500" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#ff3b30" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="driverConeWeb" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#c8ff00" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#c8ff00" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Urban Parcels & Blocks */}
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

        {/* Minor Connecting Streets */}
        <g stroke="#222C34" strokeWidth="8" opacity="0.8">
          <line x1="-10" y1="140" x2="420" y2="140" />
          <line x1="-10" y1="230" x2="420" y2="230" />
          <line x1="-10" y1="340" x2="420" y2="330" />
          <line x1="-10" y1="430" x2="420" y2="420" />
          <line x1="-10" y1="510" x2="420" y2="510" />
          <line x1="-10" y1="610" x2="420" y2="605" />
        </g>

        {/* MAJOR ARTERIAL ROAD: JL. SUDIRMAN / MH THAMRIN */}
        <path d="M200,-20 L200,230 L195,380 L190,720" fill="none" stroke="#161C22" strokeWidth="32" strokeLinejoin="round" />
        <path d="M200,-20 L200,230 L195,380 L190,720" fill="none" stroke="#2A3744" strokeWidth="22" strokeLinejoin="round" />
        <path d="M200,-20 L200,230 L195,380 L190,720" fill="none" stroke="#C8FF00" strokeWidth="2" strokeDasharray="10,8" strokeOpacity="0.75" />

        {/* RASUNA SAID / KUNINGAN */}
        <path d="M350,-20 L320,340 L310,720" fill="none" stroke="#24303C" strokeWidth="16" />
        <path d="M350,-20 L320,340 L310,720" fill="none" stroke="#FFA726" strokeWidth="1.5" strokeDasharray="6,6" strokeOpacity="0.4" />

        {/* BUNDARAN HI ROUNDABOUT */}
        <circle cx="200" cy="230" r="28" fill="#14181D" stroke="#2A3744" strokeWidth="12" />
        <circle cx="200" cy="230" r="28" fill="none" stroke="#C8FF00" strokeWidth="1.5" strokeDasharray="4,4" strokeOpacity="0.9" />
        <circle cx="200" cy="230" r="14" fill="#0C2333" stroke="#16384F" strokeWidth="2" />
        <circle cx="200" cy="230" r="3.5" fill="#C8FF00" />

        {/* SURGE HEATMAP ZONE: Grand Indonesia & Sudirman */}
        <g className="surge-heat-web" onClick={() => handleSurgeClick('surge-1')}>
          <circle cx="150" cy="280" r="85" fill="url(#heatSurgeWeb)" />
          <circle cx="150" cy="280" r="60" fill="none" stroke="#FF3B30" strokeWidth="1.5" strokeDasharray="5,4" opacity="0.5" />
          <rect x="110" y="270" width="76" height="22" rx="11" fill="#1B1C1C" stroke="#7A2222" strokeWidth="1" />
          <circle cx="122" cy="281" r="4" fill="#FF3B30" />
          <text x="132" y="285" fill="#FFFFFF" fontSize="10" fontWeight="bold">1.2x SURGE</text>
        </g>

        {/* Landmark Badges */}
        <g transform="translate(110, 215)">
          <rect x="0" y="0" width="84" height="20" rx="4" fill="#191D21" stroke="#353F47" strokeWidth="1" />
          <circle cx="10" cy="10" r="3" fill="#C8FF00" />
          <text x="18" y="13" fill="#E4E2E1" fontSize="9" fontWeight="600">Grand Indonesia</text>
        </g>

        {/* Street Labels */}
        <text x="212" y="110" fill="#7E8B99" fontSize="9" fontWeight="700" letterSpacing="1.5" transform="rotate(90 212 110)">JL. M.H. THAMRIN</text>
        <text x="206" y="470" fill="#7E8B99" fontSize="9" fontWeight="700" letterSpacing="1.5" transform="rotate(90 206 470)">JL. JEND. SUDIRMAN</text>

        {/* DRIVER GPS POSITION & RADAR PULSE */}
        <g id="driver-pin-web" transform="translate(200, 380)">
          <path d="M0,0 L-28,-75 A75,75 0 0,1 28,-75 Z" fill="url(#driverConeWeb)" />
          
          {isOnline && (
            <>
              <circle className="radar-wave-web-1" cx="0" cy="0" r="30" fill="none" stroke="#C8FF00" strokeWidth="1.5" />
              <circle className="radar-wave-web-2" cx="0" cy="0" r="30" fill="none" stroke="#C8FF00" strokeWidth="1.5" />
            </>
          )}

          <circle cx="0" cy="0" r="20" fill="#1B1C1C" stroke={isOnline ? '#C8FF00' : '#555'} strokeWidth="3" />
          <circle cx="0" cy="0" r="14" fill={isOnline ? '#C8FF00' : '#444'} />
          <polygon points="0,-8 6,6 0,3 -6,6" fill="#000000" />
        </g>
      </svg>

      {/* Floating Control Buttons */}
      <View style={styles.floatingControls}>
        <TouchableOpacity activeOpacity={0.8} onPress={handleRecenter} style={styles.controlBtn}>
          <Ionicons name="locate" size={20} color={colors.primary} />
        </TouchableOpacity>

        {onSimulateOrder && (
          <TouchableOpacity activeOpacity={0.8} onPress={onSimulateOrder} style={styles.simulateBtn}>
            <MaterialIcons name="bolt" size={18} color={colors.black} />
            <Text style={styles.simulateText}>Test Order</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* GPS Status HUD Pill */}
      <View style={styles.locationHud}>
        <Ionicons name="navigate-circle" size={14} color={isOnline ? colors.primary : colors.textSecondary} />
        <Text style={styles.hudText}>
          {lat.toFixed(4)}, {lon.toFixed(4)} • Menteng JKT
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#121517',
    overflow: 'hidden',
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
  locationHud: {
    position: 'absolute',
    left: spacing.lg,
    bottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(25, 26, 26, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: colors.outline,
    zIndex: 20,
  },
  hudText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.white,
    fontFamily: 'monospace',
  },
});

