import { Coordinates } from '../types';

export interface GeocodingResult {
  lat: number;
  lng: number;
  formattedAddress: string;
  source: 'google-maps-api' | 'approximated-industrial-hub';
}

/**
 * Geocodes an address string to latitude/longitude coordinates.
 * Invokes the server-side Google Maps Geocoding API proxy (to satisfy CF1 CORS requirements).
 * Falls back to known industrial hub registries if the API is offline or returns empty.
 */
export async function geocodeAddress(addressText: string): Promise<GeocodingResult> {
  const query = addressText.trim();
  if (!query) {
    return {
      lat: 13.0358,
      lng: 77.5126,
      formattedAddress: 'Peenya Industrial Area, Bengaluru, Karnataka',
      source: 'approximated-industrial-hub',
    };
  }

  try {
    const res = await fetch(`/api/maps/geocode?address=${encodeURIComponent(query)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && typeof data.lat === 'number' && typeof data.lng === 'number') {
        return {
          lat: data.lat,
          lng: data.lng,
          formattedAddress: data.formatted_address || query,
          source: data.isApproximated ? 'approximated-industrial-hub' : 'google-maps-api',
        };
      }
    }
  } catch (err) {
    console.warn('Geocoding service network warning, utilizing local industrial GIS registry:', err);
  }

  // Industrial Hub & Metro Fallback Table
  const lower = query.toLowerCase();
  if (lower.includes('peenya') || lower.includes('bengaluru') || lower.includes('bangalore') || lower.includes('karnataka')) {
    return {
      lat: 13.0358,
      lng: 77.5126,
      formattedAddress: `${query} (Peenya Hub, Bengaluru)`,
      source: 'approximated-industrial-hub',
    };
  }
  if (lower.includes('chakan') || lower.includes('pune') || lower.includes('maharashtra') || lower.includes('bhosari')) {
    return {
      lat: 18.7606,
      lng: 73.8188,
      formattedAddress: `${query} (Chakan MIDC Corridor, Pune)`,
      source: 'approximated-industrial-hub',
    };
  }
  if (lower.includes('ambattur') || lower.includes('chennai') || lower.includes('tamil nadu') || lower.includes('guindy') || lower.includes('sriperumbudur')) {
    return {
      lat: 13.0878,
      lng: 80.1609,
      formattedAddress: `${query} (Ambattur Industrial Estate, Chennai)`,
      source: 'approximated-industrial-hub',
    };
  }
  if (lower.includes('whitefield')) {
    return {
      lat: 12.9698,
      lng: 77.7500,
      formattedAddress: `${query} (Whitefield Tech Corridor, Bengaluru)`,
      source: 'approximated-industrial-hub',
    };
  }
  if (lower.includes('electronic') || lower.includes('bommasandra') || lower.includes('hosur')) {
    return {
      lat: 12.8452,
      lng: 77.6602,
      formattedAddress: `${query} (Electronics City Phase 1, Bengaluru)`,
      source: 'approximated-industrial-hub',
    };
  }
  if (lower.includes('gurgaon') || lower.includes('gurugram') || lower.includes('manesar') || lower.includes('haryana') || lower.includes('delhi')) {
    return {
      lat: 28.3687,
      lng: 76.9404,
      formattedAddress: `${query} (IMT Manesar Industrial Hub, Gurugram)`,
      source: 'approximated-industrial-hub',
    };
  }
  if (lower.includes('sanand') || lower.includes('ahmedabad') || lower.includes('gujarat')) {
    return {
      lat: 22.9904,
      lng: 72.3831,
      formattedAddress: `${query} (GIDC Sanand Auto Cluster, Gujarat)`,
      source: 'approximated-industrial-hub',
    };
  }

  // Default Bengaluru Peenya cleanroom coordinates
  return {
    lat: 13.0358,
    lng: 77.5126,
    formattedAddress: query,
    source: 'approximated-industrial-hub',
  };
}

/**
 * Generates turn-by-turn navigation URL for Google Maps app / mobile web.
 * Per specification:
 * https://www.google.com/maps/dir/?api=1&origin=<techLat>,<techLng>&destination=<custLat>,<custLng>&travelmode=driving
 */
export function getGoogleMapsNavigationUrl(
  techCoords: Coordinates,
  customerCoords: Coordinates
): string {
  const tLat = techCoords.lat.toFixed(6);
  const tLng = techCoords.lng.toFixed(6);
  const cLat = customerCoords.lat.toFixed(6);
  const cLng = customerCoords.lng.toFixed(6);
  return `https://www.google.com/maps/dir/?api=1&origin=${tLat},${tLng}&destination=${cLat},${cLng}&travelmode=driving`;
}

/**
 * Calculates straight line distance (Haversine) in kilometers.
 */
export function calculateHaversineKm(p1: Coordinates, p2: Coordinates): number {
  const R = 6371; // Earth radius in km
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Estimates driving distance and ETA when offline or waiting for Google Routes computation.
 * Uses realistic Indian industrial corridor detour index (1.35x) and average speed (32 km/h).
 */
export function estimateDrivingMetrics(
  origin: Coordinates,
  destination: Coordinates
): { distanceKm: number; durationMinutes: number } {
  const rawDist = calculateHaversineKm(origin, destination);
  const drivingKm = Math.max(0.5, Math.round(rawDist * 1.35 * 10) / 10);
  const avgSpeedKmh = 32; // Indian urban/industrial transit average
  const hours = drivingKm / avgSpeedKmh;
  const minutes = Math.max(3, Math.round(hours * 60));
  return {
    distanceKm: drivingKm,
    durationMinutes: minutes,
  };
}
