import {
  db,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  ensureFirebaseAuth,
  Unsubscribe,
} from '../lib/firebase';
import { BookingStatus, LiveTechnicianLocation, Coordinates } from '../types';
import { estimateDrivingMetrics } from '../utils/geocoding';

export interface TrackingState {
  isSharing: boolean;
  permissionStatus: 'prompt' | 'granted' | 'denied' | 'unsupported';
  errorMessage: string | null;
  lastLocation: LiveTechnicianLocation | null;
  isSimulatedMovement?: boolean;
}

// Throttle interval: 3500ms (between 3-5 seconds as requested)
const UPDATE_INTERVAL_MS = 3500;

/**
 * Publish location to Firestore
 */
export async function pushLocationUpdate(
  data: Partial<LiveTechnicianLocation> & {
    requestId: string;
    technicianId: string;
    customerId: string;
    latitude: number;
    longitude: number;
    status: BookingStatus;
  }
): Promise<void> {
  try {
    await ensureFirebaseAuth();
    const docRef = doc(db, 'bookingLocations', data.requestId);
    const payload: LiveTechnicianLocation = {
      requestId: data.requestId,
      technicianId: data.technicianId,
      customerId: data.customerId,
      latitude: data.latitude,
      longitude: data.longitude,
      heading: data.heading ?? 0,
      speed: data.speed ?? null,
      accuracy: data.accuracy ?? 10,
      status: data.status,
      etaMinutes: data.etaMinutes,
      distanceKm: data.distanceKm,
      timestamp: new Date().toISOString(),
    };

    await setDoc(docRef, payload, { merge: true });
  } catch (err) {
    console.warn('Failed to publish location to Firestore:', err);
  }
}

/**
 * Update booking status in Firestore
 */
export async function updateBookingStatusInDb(
  requestId: string,
  status: BookingStatus
): Promise<void> {
  try {
    await ensureFirebaseAuth();
    const docRef = doc(db, 'bookingLocations', requestId);
    await setDoc(
      docRef,
      {
        requestId,
        status,
        timestamp: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Failed to update booking status in Firestore:', err);
  }
}

/**
 * Subscribe in real-time to technician location using Firestore onSnapshot
 */
export function subscribeToTechnicianLocation(
  requestId: string,
  onData: (loc: LiveTechnicianLocation) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const docRef = doc(db, 'bookingLocations', requestId);

  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as LiveTechnicianLocation;
        onData(data);
      }
    },
    (error) => {
      console.warn('Firestore onSnapshot error:', error);
      onError?.(error);
    }
  );
}

/**
 * Technician location sharing manager using Geolocation watchPosition
 * Throttles writes every 3.5 seconds and only runs while status is 'On the way' or 'In progress'
 */
export class TechnicianLocationTracker {
  private watchId: number | null = null;
  private intervalTimer: any = null;
  private simulationTimer: any = null;
  private lastSentTime: number = 0;
  private pendingCoords: { lat: number; lng: number; heading: number; speed?: number; accuracy?: number } | null = null;
  private requestId: string;
  private technicianId: string;
  private customerId: string;
  private targetDestination: Coordinates;
  private currentStatus: BookingStatus;
  private onStateChange: (state: Partial<TrackingState>) => void;

  constructor(config: {
    requestId: string;
    technicianId: string;
    customerId: string;
    initialStatus: BookingStatus;
    targetDestination: Coordinates;
    onStateChange: (state: Partial<TrackingState>) => void;
  }) {
    this.requestId = config.requestId;
    this.technicianId = config.technicianId;
    this.customerId = config.customerId;
    this.currentStatus = config.initialStatus;
    this.targetDestination = config.targetDestination;
    this.onStateChange = config.onStateChange;
  }

  public updateStatus(newStatus: BookingStatus) {
    this.currentStatus = newStatus;
    updateBookingStatusInDb(this.requestId, newStatus);

    if (newStatus === 'On the way') {
      if (!this.watchId) {
        this.start();
      }
    } else if (newStatus === 'Arrived' || newStatus === 'Completed') {
      this.stop();
    }
  }

  public start() {
    if (this.currentStatus !== 'On the way' && (this.currentStatus as any) !== 'In progress') {
      console.log('Location tracking active only when On the way / In progress');
      return;
    }

    if (!('geolocation' in navigator)) {
      this.onStateChange({
        permissionStatus: 'unsupported',
        errorMessage: 'GPS Geolocation is not supported by this browser.',
      });
      return;
    }

    this.onStateChange({
      isSharing: true,
      permissionStatus: 'prompt',
      errorMessage: null,
    });

    // Periodically flush pending coordinates to Firestore every 3-5 seconds
    this.intervalTimer = setInterval(() => {
      this.flushLocation();
    }, UPDATE_INTERVAL_MS);

    try {
      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          this.onStateChange({ permissionStatus: 'granted', errorMessage: null });
          const { latitude, longitude, heading, speed, accuracy } = position.coords;

          this.pendingCoords = {
            lat: latitude,
            lng: longitude,
            heading: heading || 0,
            speed: speed || undefined,
            accuracy: accuracy || 10,
          };

          // If first update or interval elapsed, send immediately
          const now = Date.now();
          if (now - this.lastSentTime >= UPDATE_INTERVAL_MS) {
            this.flushLocation();
          }
        },
        (error) => {
          console.warn('Geolocation watch error:', error.message);
          let errText = 'Could not access device GPS.';
          let permState: TrackingState['permissionStatus'] = 'prompt';

          if (error.code === error.PERMISSION_DENIED) {
            errText = 'Location permission was denied. Please allow location access in your browser.';
            permState = 'denied';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            errText = 'GPS signal unavailable. You can use simulated transit mode.';
          } else if (error.code === error.TIMEOUT) {
            errText = 'GPS location request timed out.';
          }

          this.onStateChange({
            permissionStatus: permState,
            errorMessage: errText,
          });
        },
        {
          enableHighAccuracy: true,
          maximumAge: 2000,
          timeout: 10000,
        }
      );
    } catch (err: any) {
      this.onStateChange({
        permissionStatus: 'denied',
        errorMessage: err.message || 'Error initializing GPS watcher',
      });
    }
  }

  public startSimulation(startCoords: Coordinates, endCoords: Coordinates) {
    this.stop(); // Stop physical GPS watch
    this.onStateChange({
      isSharing: true,
      permissionStatus: 'granted',
      isSimulatedMovement: true,
      errorMessage: null,
    });

    let step = 0;
    const totalSteps = 24;
    let curLat = startCoords.lat;
    let curLng = startCoords.lng;

    this.simulationTimer = setInterval(() => {
      step++;
      const progress = Math.min(step / totalSteps, 1);
      // Interpolate along route with minor natural jitter
      curLat = startCoords.lat + (endCoords.lat - startCoords.lat) * progress;
      curLng = startCoords.lng + (endCoords.lng - startCoords.lng) * progress;

      // Bearing calculation
      const dLng = (endCoords.lng - curLng) * (Math.PI / 180);
      const y = Math.sin(dLng) * Math.cos(endCoords.lat * (Math.PI / 180));
      const x =
        Math.cos(curLat * (Math.PI / 180)) * Math.sin(endCoords.lat * (Math.PI / 180)) -
        Math.sin(curLat * (Math.PI / 180)) * Math.cos(endCoords.lat * (Math.PI / 180)) * Math.cos(dLng);
      const heading = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;

      const metrics = estimateDrivingMetrics({ lat: curLat, lng: curLng }, endCoords);

      const locPayload: LiveTechnicianLocation = {
        requestId: this.requestId,
        technicianId: this.technicianId,
        customerId: this.customerId,
        latitude: curLat,
        longitude: curLng,
        heading: Math.round(heading),
        speed: 12.5, // ~45 km/h
        accuracy: 5,
        status: progress >= 1 ? 'Arrived' : this.currentStatus,
        distanceKm: metrics.distanceKm,
        etaMinutes: Math.max(1, metrics.durationMinutes),
        timestamp: new Date().toISOString(),
      };

      pushLocationUpdate(locPayload);
      this.onStateChange({ lastLocation: locPayload });

      if (progress >= 1) {
        this.updateStatus('Arrived');
        clearInterval(this.simulationTimer);
        this.simulationTimer = null;
      }
    }, UPDATE_INTERVAL_MS);
  }

  private async flushLocation() {
    if (!this.pendingCoords) return;
    this.lastSentTime = Date.now();

    const metrics = estimateDrivingMetrics(
      { lat: this.pendingCoords.lat, lng: this.pendingCoords.lng },
      this.targetDestination
    );

    const locPayload: LiveTechnicianLocation = {
      requestId: this.requestId,
      technicianId: this.technicianId,
      customerId: this.customerId,
      latitude: this.pendingCoords.lat,
      longitude: this.pendingCoords.lng,
      heading: this.pendingCoords.heading,
      speed: this.pendingCoords.speed,
      accuracy: this.pendingCoords.accuracy,
      status: this.currentStatus,
      distanceKm: metrics.distanceKm,
      etaMinutes: metrics.durationMinutes,
      timestamp: new Date().toISOString(),
    };

    await pushLocationUpdate(locPayload);
    this.onStateChange({ lastLocation: locPayload });
  }

  public stop() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    if (this.simulationTimer) {
      clearInterval(this.simulationTimer);
      this.simulationTimer = null;
    }
    this.pendingCoords = null;
    this.onStateChange({ isSharing: false });
  }
}
