import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  Navigation,
  ExternalLink,
  MapPin,
  Clock,
  Car,
  Building2,
  Copy,
  Check,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { Coordinates, ServiceRequest, Technician } from '../../types';
import {
  getGoogleMapsNavigationUrl,
  estimateDrivingMetrics,
} from '../../utils/geocoding';
import {
  GOOGLE_MAPS_API_KEY,
  GMP_MAP_ID,
  GMP_ATTRIBUTION_ID,
} from '../../services/googleMapsConfig';

export interface TechnicianCustomerRouteMapProps {
  request: ServiceRequest;
  technician?: Technician | null;
  className?: string;
  heightClass?: string;
  onNavigationLaunched?: () => void;
}

// Inner component to handle Routes API computation and polyline lifecycle
const DirectionsRenderer: React.FC<{
  origin: Coordinates;
  destination: Coordinates;
  onMetricsComputed: (distanceKm: number, etaMinutes: number) => void;
  recenterTrigger: number;
}> = ({ origin, destination, onMetricsComputed, recenterTrigger }) => {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const cachedViewportRef = useRef<google.maps.LatLngBounds | null>(null);

  // Compute Routes via Google Maps Platform Routes API (modern promise-based)
  useEffect(() => {
    if (!routesLib || !map || !origin || !destination) return;

    // Clean up previous polylines
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    const request = {
      origin: { lat: origin.lat, lng: origin.lng },
      destination: { lat: destination.lat, lng: destination.lng },
      travelMode: 'DRIVING' as const,
      fields: ['path', 'distanceMeters', 'durationMillis', 'viewport', 'legs'],
    };

    let isMounted = true;

    // Call modern Routes API SDK wrapper
    const routeClass = (routesLib as any).Route;
    if (routeClass && typeof routeClass.computeRoutes === 'function') {
      routeClass
        .computeRoutes(request)
        .then(({ routes }: { routes: any[] }) => {
          if (!isMounted) return;
          if (routes && routes.length > 0) {
            const primaryRoute = routes[0];
            const newPolylines = primaryRoute.createPolylines();
            newPolylines.forEach((poly: google.maps.Polyline) => {
              poly.setOptions({
                strokeColor: '#2563eb',
                strokeWeight: 5,
                strokeOpacity: 0.9,
              });
              poly.setMap(map);
            });
            polylinesRef.current = newPolylines;

            if (primaryRoute.viewport) {
              cachedViewportRef.current = primaryRoute.viewport;
              map.fitBounds(primaryRoute.viewport, { top: 60, bottom: 60, left: 60, right: 60 });
            }

            const distKm = primaryRoute.distanceMeters
              ? Math.round((primaryRoute.distanceMeters / 1000) * 10) / 10
              : null;
            const durMin = primaryRoute.durationMillis
              ? Math.round(primaryRoute.durationMillis / 60000)
              : null;

            if (distKm !== null && durMin !== null) {
              onMetricsComputed(distKm, durMin);
            }
          } else {
            fallbackPolyline();
          }
        })
        .catch((err: any) => {
          console.warn('Routes API computeRoutes fallback:', err?.message || err);
          if (isMounted) fallbackPolyline();
        });
    } else {
      fallbackPolyline();
    }

    function fallbackPolyline() {
      if (!map) return;
      try {
        const g = typeof window !== 'undefined' ? (window as any).google : null;
        if (!g || !g.maps) return;
        // Direct polyline fallback if routes service is initializing
        if (g.maps.Polyline) {
          const poly = new g.maps.Polyline({
            path: [
              { lat: origin.lat, lng: origin.lng },
              { lat: destination.lat, lng: destination.lng },
            ],
            strokeColor: '#2563eb',
            strokeOpacity: 0.85,
            strokeWeight: 4,
            map,
          });
          polylinesRef.current = [poly];
        }

        if (g.maps.LatLngBounds) {
          const bounds = new g.maps.LatLngBounds();
          bounds.extend({ lat: origin.lat, lng: origin.lng });
          bounds.extend({ lat: destination.lat, lng: destination.lng });
          cachedViewportRef.current = bounds;
          map.fitBounds(bounds, { top: 60, bottom: 60, left: 60, right: 60 });
        }
      } catch (err) {
        console.warn('Fallback polyline safe warning:', err);
      }
    }

    return () => {
      isMounted = false;
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
    };
  }, [routesLib, map, origin.lat, origin.lng, destination.lat, destination.lng]);

  // Recenter handler
  useEffect(() => {
    if (!map || recenterTrigger === 0) return;
    if (cachedViewportRef.current) {
      map.fitBounds(cachedViewportRef.current, { top: 60, bottom: 60, left: 60, right: 60 });
    } else {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: origin.lat, lng: origin.lng });
      bounds.extend({ lat: destination.lat, lng: destination.lng });
      map.fitBounds(bounds, { top: 60, bottom: 60, left: 60, right: 60 });
    }
  }, [recenterTrigger, map, origin, destination]);

  return null;
};

export const TechnicianCustomerRouteMap: React.FC<TechnicianCustomerRouteMapProps> = ({
  request,
  technician,
  className = '',
  heightClass = 'h-80',
  onNavigationLaunched,
}) => {
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [liveDistanceKm, setLiveDistanceKm] = useState<number | null>(null);
  const [liveEtaMinutes, setLiveEtaMinutes] = useState<number | null>(null);
  const [recenterCount, setRecenterCount] = useState<number>(0);

  // Technician coords
  const techCoords: Coordinates = useMemo(() => {
    if (technician?.location) return technician.location;
    return { lat: 13.028, lng: 77.519 };
  }, [technician]);

  // Customer site coords
  const customerCoords: Coordinates = useMemo(() => {
    if (request.customerCoords) return request.customerCoords;
    if (request.siteId === 'site-b') return { lat: 18.7606, lng: 73.8188 };
    if (request.siteId === 'site-c') return { lat: 13.0878, lng: 80.1609 };
    return { lat: 13.0358, lng: 77.5126 };
  }, [request]);

  const techName = technician?.name || 'Assigned Lead Technician';
  const customerAddress =
    request.customerAddress ||
    'Plot 48/B, Phase II, Peenya Industrial Area, Bengaluru, Karnataka 560058';
  const siteName = request.siteName || 'Customer Industrial Facility';

  // Fallback driving metrics
  const fallbackMetrics = useMemo(() => {
    return estimateDrivingMetrics(techCoords, customerCoords);
  }, [techCoords, customerCoords]);

  const displayDistance = liveDistanceKm ?? fallbackMetrics.distanceKm;
  const displayEta = liveEtaMinutes ?? fallbackMetrics.durationMinutes;

  // External turn-by-turn navigation URL
  const navUrl = useMemo(() => {
    return getGoogleMapsNavigationUrl(techCoords, customerCoords);
  }, [techCoords, customerCoords]);

  const handleLaunchNavigation = () => {
    onNavigationLaunched?.();
    window.open(navUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopyNavUrl = () => {
    navigator.clipboard.writeText(navUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleRecenter = () => {
    setRecenterCount((c) => c + 1);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Route Metrics HUD Header */}
      <div className="bg-slate-900 text-white p-3.5 sm:p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-300">
              Field Dispatch Navigation
            </span>
            <span className="text-slate-500">·</span>
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>SLA Target: &lt;60m</span>
            </span>
          </div>

          <div className="flex items-baseline gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span className="font-mono text-xl sm:text-2xl font-black text-white">
                {displayEta}
              </span>
              <span className="text-xs text-slate-300">mins ETA</span>
            </div>

            <div className="h-4 w-px bg-slate-700 hidden sm:block" />

            <div className="flex items-center gap-1.5 text-slate-300 text-xs">
              <Car className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-mono font-bold text-white">{displayDistance}</span>
              <span>km distance</span>
            </div>

            <div className="h-4 w-px bg-slate-700 hidden sm:block" />

            <div className="text-xs text-slate-400 truncate max-w-xs">
              Dest: <span className="text-slate-200 font-medium">{siteName}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleRecenter}
            title="Recenter Map Bounds"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleCopyNavUrl}
            title="Copy Destination Link"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700 cursor-pointer"
          >
            {copiedUrl ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={handleLaunchNavigation}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition-all cursor-pointer"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Open GPS Navigation</span>
            <ExternalLink className="w-3 h-3 opacity-75" />
          </button>
        </div>
      </div>

      {/* Google Maps Container */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
        <div className={`w-full ${heightClass}`}>
          <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
            <Map
              id="technician-route-map"
              mapId={GMP_MAP_ID}
              defaultCenter={customerCoords}
              defaultZoom={12}
              gestureHandling="greedy"
              disableDefaultUI={false}
              internalUsageAttributionIds={[GMP_ATTRIBUTION_ID]}
              style={{ width: '100%', height: '100%' }}
            >
              <DirectionsRenderer
                origin={techCoords}
                destination={customerCoords}
                onMetricsComputed={(dist, eta) => {
                  setLiveDistanceKm(dist);
                  setLiveEtaMinutes(eta);
                }}
                recenterTrigger={recenterCount}
              />

              {/* Technician AdvancedMarker */}
              <AdvancedMarker position={techCoords} title={techName}>
                <div className="relative group cursor-pointer" style={{ transform: 'translate(0, 0)' }}>
                  <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg border-2 border-white">
                    <Car className="w-5 h-5 text-white" />
                  </div>
                  <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-blue-500 border border-white" />
                  </span>
                </div>
              </AdvancedMarker>

              {/* Customer Facility AdvancedMarker */}
              <AdvancedMarker position={customerCoords} title={siteName}>
                <div className="relative group cursor-pointer">
                  <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-lg border-2 border-white">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400 border border-white" />
                  </span>
                </div>
              </AdvancedMarker>
            </Map>
          </APIProvider>
        </div>

        {/* Floating Quick Info Pill */}
        <div className="absolute bottom-3 left-3 z-10 bg-white/95 backdrop-blur-xs border border-slate-200/90 shadow-md rounded-xl p-2.5 max-w-sm text-xs space-y-1">
          <div className="flex items-center gap-1.5 text-slate-900 font-bold">
            <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span className="truncate">{siteName}</span>
          </div>
          <div className="text-[11px] text-slate-600 truncate pl-5">
            {customerAddress}
          </div>
        </div>
      </div>
    </div>
  );
};
