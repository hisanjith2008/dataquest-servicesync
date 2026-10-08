import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
} from '@vis.gl/react-google-maps';
import {
  Car,
  Building2,
  Navigation,
  Clock,
  Wifi,
  WifiOff,
  RotateCw,
  Activity,
  LocateFixed,
} from 'lucide-react';
import {
  ServiceRequest,
  Technician,
  Coordinates,
  LiveTechnicianLocation,
  BookingStatus,
} from '../../types';
import { subscribeToTechnicianLocation } from '../../services/trackingService';
import { estimateDrivingMetrics } from '../../utils/geocoding';
import {
  GOOGLE_MAPS_API_KEY,
  GMP_MAP_ID,
  GMP_ATTRIBUTION_ID,
} from '../../services/googleMapsConfig';

export interface LiveTechnicianCustomerTrackingMapProps {
  request: ServiceRequest;
  technician?: Technician | null;
  className?: string;
  heightClass?: string;
}

// Inner helper component that manages map viewport and tracking path
const LiveTrackingMapController: React.FC<{
  techCoords: Coordinates;
  customerCoords: Coordinates;
  followMode: boolean;
  recenterTrigger: number;
}> = ({ techCoords, customerCoords, followMode, recenterTrigger }) => {
  const map = useMap();
  const polylineRef = useRef<any>(null);

  // Initialize or update tracking polyline
  useEffect(() => {
    if (!map) return;
    try {
      const g = typeof window !== 'undefined' ? (window as any).google : null;
      if (!g || !g.maps || !g.maps.Polyline) return;

      if (!polylineRef.current) {
        polylineRef.current = new g.maps.Polyline({
          path: [
            { lat: techCoords.lat, lng: techCoords.lng },
            { lat: customerCoords.lat, lng: customerCoords.lng },
          ],
          strokeColor: '#2563eb',
          strokeOpacity: 0.85,
          strokeWeight: 4,
          map,
        });

        // Initial fit bounds
        if (g.maps.LatLngBounds) {
          const bounds = new g.maps.LatLngBounds();
          bounds.extend(techCoords);
          bounds.extend(customerCoords);
          map.fitBounds(bounds, { top: 60, bottom: 60, left: 60, right: 60 });
        }
      } else {
        polylineRef.current.setPath([
          { lat: techCoords.lat, lng: techCoords.lng },
          { lat: customerCoords.lat, lng: customerCoords.lng },
        ]);
      }

      if (followMode && typeof map.panTo === 'function') {
        map.panTo(techCoords);
      }
    } catch (err) {
      console.warn('Safe tracking map controller warning:', err);
    }
  }, [map, techCoords.lat, techCoords.lng, customerCoords.lat, customerCoords.lng, followMode]);

  // Handle manual recenter
  useEffect(() => {
    if (!map || recenterTrigger === 0) return;
    try {
      const g = typeof window !== 'undefined' ? (window as any).google : null;
      if (g && g.maps && g.maps.LatLngBounds) {
        const bounds = new g.maps.LatLngBounds();
        bounds.extend(techCoords);
        bounds.extend(customerCoords);
        map.fitBounds(bounds, { top: 60, bottom: 60, left: 60, right: 60 });
      }
    } catch (err) {
      console.warn('Safe tracking recenter warning:', err);
    }
  }, [recenterTrigger, map, techCoords, customerCoords]);

  // Clean up polyline on unmount
  useEffect(() => {
    return () => {
      try {
        if (polylineRef.current) {
          polylineRef.current.setMap(null);
          polylineRef.current = null;
        }
      } catch {
        // Safe cleanup
      }
    };
  }, []);

  return null;
};

export const LiveTechnicianCustomerTrackingMap: React.FC<LiveTechnicianCustomerTrackingMapProps> = ({
  request,
  technician,
  className = '',
  heightClass = 'h-96 sm:h-[420px]',
}) => {
  const [liveLocation, setLiveLocation] = useState<LiveTechnicianLocation | null>(null);
  const [liveDistanceKm, setLiveDistanceKm] = useState<number | null>(null);
  const [liveEtaMinutes, setLiveEtaMinutes] = useState<number | null>(null);
  const [lastHeartbeat, setLastHeartbeat] = useState<Date>(new Date());
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [followMode, setFollowMode] = useState<boolean>(true);
  const [recenterCount, setRecenterCount] = useState<number>(0);

  // Monitor online / offline state
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Customer Destination Coords
  const customerCoords: Coordinates = useMemo(() => {
    if (request.customerCoords) return request.customerCoords;
    if (request.siteId === 'site-b') return { lat: 18.7606, lng: 73.8188 };
    if (request.siteId === 'site-c') return { lat: 13.0878, lng: 80.1609 };
    return { lat: 13.0358, lng: 77.5126 };
  }, [request]);

  // Current Technician Coords (dynamic live coordinates preferred)
  const techCoords: Coordinates = useMemo(() => {
    if (liveLocation) {
      return { lat: liveLocation.latitude, lng: liveLocation.longitude };
    }
    if (technician?.location) {
      return technician.location;
    }
    return { lat: 13.028, lng: 77.519 };
  }, [liveLocation, technician]);

  const heading = liveLocation?.heading || 45;
  const techName = technician?.name || 'Assigned Lead Technician';
  const siteName = request.siteName || 'Customer Industrial Facility';

  // Fallback distance & ETA estimation
  const fallbackMetrics = useMemo(() => {
    return estimateDrivingMetrics(techCoords, customerCoords);
  }, [techCoords, customerCoords]);

  const distanceKm = liveLocation?.distanceKm ?? liveDistanceKm ?? fallbackMetrics.distanceKm;
  const etaMinutes = liveLocation?.etaMinutes ?? liveEtaMinutes ?? fallbackMetrics.durationMinutes;

  // Real-time Firestore Telemetry Subscription
  useEffect(() => {
    const unsubscribe = subscribeToTechnicianLocation(request.id, (loc) => {
      if (loc) {
        setLiveLocation(loc);
        setLastHeartbeat(new Date());
        if (loc.distanceKm !== undefined) setLiveDistanceKm(loc.distanceKm);
        if (loc.etaMinutes !== undefined) setLiveEtaMinutes(loc.etaMinutes);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [request.id]);

  const handleRecenter = () => {
    setRecenterCount((c) => c + 1);
  };

  const currentBookingStatus: BookingStatus =
    liveLocation?.status || request.bookingStatus || 'On the way';

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 1. Live Radar Top Telemetry Header */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white p-4 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Indicator */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-emerald-400">
                Google Maps GPS Telemetry
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-xs text-slate-300">
                Vehicle: <strong>{techName}</strong>
              </span>
              <span className="text-slate-600">·</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600/30 text-blue-300 border border-blue-500/30">
                {currentBookingStatus}
              </span>
            </div>

            <div className="flex items-baseline gap-4 pt-1 flex-wrap">
              {/* ETA Display */}
              <div className="flex items-center gap-1.5">
                <Clock className="w-5 h-5 text-emerald-400" />
                <span className="font-mono text-2xl sm:text-3xl font-black text-white">
                  {etaMinutes}
                </span>
                <span className="text-xs text-slate-300 font-medium">mins ETA</span>
              </div>

              <div className="h-6 w-px bg-slate-800 hidden sm:block" />

              {/* Distance Display */}
              <div className="flex items-center gap-1.5 text-slate-300">
                <Navigation className="w-4 h-4 text-blue-400" />
                <span className="font-mono text-base font-bold text-white">{distanceKm}</span>
                <span className="text-xs">km away</span>
              </div>

              <div className="h-6 w-px bg-slate-800 hidden sm:block" />

              {/* Live Speed */}
              <div className="flex items-center gap-1.5 text-slate-300">
                <Activity className="w-4 h-4 text-amber-400" />
                <span className="font-mono text-sm font-bold text-white">
                  {liveLocation?.speed ? `${Math.round(liveLocation.speed)} km/h` : '38 km/h'}
                </span>
                <span className="text-xs">speed</span>
              </div>
            </div>
          </div>

          {/* Network Health & Recenter Action */}
          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
            <div className="text-right hidden sm:block">
              <div className="flex items-center gap-1 justify-end text-[10px] text-slate-400 font-mono">
                {isOffline ? (
                  <>
                    <WifiOff className="w-3 h-3 text-rose-400" />
                    <span className="text-rose-400">Offline</span>
                  </>
                ) : (
                  <>
                    <Wifi className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Connected</span>
                  </>
                )}
              </div>
              <span className="text-[10px] text-slate-500">
                Ping:{' '}
                {lastHeartbeat.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            </div>

            {/* Follow Toggle */}
            <button
              type="button"
              onClick={() => setFollowMode((f) => !f)}
              title={followMode ? 'Following Vehicle (Click to lock)' : 'Auto-Follow Disabled'}
              className={`p-2.5 rounded-xl border transition-colors cursor-pointer shadow-xs ${
                followMode
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <LocateFixed className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleRecenter}
              title="Recenter Map Viewport"
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors border border-slate-700 cursor-pointer shadow-xs"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Google Maps Platform Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
        <div className={`w-full ${heightClass}`}>
          <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
            <Map
              id="live-technician-tracking-map"
              mapId={GMP_MAP_ID}
              defaultCenter={techCoords}
              defaultZoom={14}
              gestureHandling="greedy"
              disableDefaultUI={false}
              internalUsageAttributionIds={[GMP_ATTRIBUTION_ID]}
              style={{ width: '100%', height: '100%' }}
            >
              <LiveTrackingMapController
                techCoords={techCoords}
                customerCoords={customerCoords}
                followMode={followMode}
                recenterTrigger={recenterCount}
              />

              {/* Live Technician Vehicle Marker with heading orientation */}
              <AdvancedMarker position={techCoords} title={`${techName} (Live GPS)`}>
                <div
                  className="relative group cursor-pointer"
                  style={{
                    transform: `rotate(${heading}deg)`,
                    transition: 'transform 0.4s ease-out',
                  }}
                >
                  <span className="absolute -inset-2.5 rounded-full bg-blue-500/25 animate-ping" />
                  <span className="absolute -inset-1 rounded-full bg-blue-500/40 animate-pulse" />
                  <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xl border-2 border-white">
                    <Car className="w-5 h-5 text-white" />
                  </div>
                </div>
              </AdvancedMarker>

              {/* Customer Facility AdvancedMarker */}
              <AdvancedMarker position={customerCoords} title={siteName}>
                <div className="relative group cursor-pointer">
                  <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-xl border-2 border-white">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                </div>
              </AdvancedMarker>
            </Map>
          </APIProvider>
        </div>

        {/* Floating Telemetry Badge Overlay */}
        <div className="absolute top-3 left-3 z-10 bg-slate-900/90 backdrop-blur-xs text-white p-2.5 rounded-xl border border-slate-800 shadow-md text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-[11px] text-slate-200">
            <Car className="w-3.5 h-3.5 text-blue-400" />
            <span>Telemetry: {techName}</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            Lat: {techCoords.lat.toFixed(4)} · Lng: {techCoords.lng.toFixed(4)}
          </div>
        </div>

        {/* Floating Destination Card */}
        <div className="absolute bottom-3 right-3 z-10 bg-white/95 backdrop-blur-xs text-slate-900 p-2.5 rounded-xl border border-slate-200 shadow-md text-xs max-w-xs space-y-0.5">
          <div className="flex items-center gap-1 font-bold text-[11px] text-slate-900">
            <Building2 className="w-3.5 h-3.5 text-rose-600" />
            <span className="truncate">{siteName}</span>
          </div>
          <div className="text-[10px] text-slate-500 truncate">
            {request.customerAddress || 'Industrial Cleanroom Facility'}
          </div>
        </div>
      </div>
    </div>
  );
};
