import React, { useEffect, useState, useRef } from 'react';
import {
  Navigation,
  Compass,
  Radio,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  Square,
  ExternalLink,
  ShieldAlert,
  Wifi,
  WifiOff,
  Crosshair,
} from 'lucide-react';
import {
  ServiceRequest,
  Technician,
  BookingStatus,
  Coordinates,
} from '../../types';
import {
  TechnicianLocationTracker,
  TrackingState,
  updateBookingStatusInDb,
} from '../../services/trackingService';
import { TechnicianCustomerRouteMap } from '../map/TechnicianCustomerRouteMap';
import { getGoogleMapsNavigationUrl } from '../../utils/geocoding';

interface TechnicianTrackingControlsProps {
  request: ServiceRequest;
  technician: Technician;
  onStatusChange?: (newStatus: BookingStatus) => void;
  className?: string;
}

const BOOKING_STATUS_SEQUENCE: BookingStatus[] = [
  'Booked',
  'Accepted',
  'On the way',
  'Arrived',
  'Completed',
];

export const TechnicianTrackingControls: React.FC<TechnicianTrackingControlsProps> = ({
  request,
  technician,
  onStatusChange,
  className = '',
}) => {
  const currentStatus: BookingStatus = request.bookingStatus || 'Accepted';

  const [trackingState, setTrackingState] = useState<TrackingState>({
    isSharing: false,
    permissionStatus: 'prompt',
    errorMessage: null,
    lastLocation: null,
  });

  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const trackerRef = useRef<TechnicianLocationTracker | null>(null);

  // Monitor network status
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

  const destinationCoords: Coordinates = request.customerCoords || {
    lat: 13.0358,
    lng: 77.5126,
  };

  const techOriginCoords: Coordinates = technician.location || {
    lat: 13.0280,
    lng: 77.5190,
  };

  // Initialize tracker manager
  useEffect(() => {
    const tracker = new TechnicianLocationTracker({
      requestId: request.id,
      technicianId: technician.id,
      customerId: request.customerId || 'CUST-BLR-01',
      initialStatus: currentStatus,
      targetDestination: destinationCoords,
      onStateChange: (updated) => {
        setTrackingState((prev) => ({ ...prev, ...updated }));
      },
    });

    trackerRef.current = tracker;

    // Automatically start location sharing if booking status is 'On the way'
    if (currentStatus === 'On the way') {
      tracker.start();
    }

    // Stop location sharing and clear listeners when job is completed or user leaves screen
    return () => {
      tracker.stop();
      trackerRef.current = null;
    };
  }, [request.id, technician.id]);

  // Handle status update button click
  const handleSetStatus = (newStatus: BookingStatus) => {
    if (trackerRef.current) {
      trackerRef.current.updateStatus(newStatus);
    } else {
      updateBookingStatusInDb(request.id, newStatus);
    }
    onStatusChange?.(newStatus);
  };

  // Turn-by-Turn Navigation URL
  const navigationUrl = getGoogleMapsNavigationUrl(techOriginCoords, destinationCoords);

  const handleLaunchNavigation = () => {
    window.open(navigationUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSimulateMovement = () => {
    if (trackerRef.current) {
      trackerRef.current.startSimulation(techOriginCoords, destinationCoords);
    }
  };

  const nextStatusIndex = BOOKING_STATUS_SEQUENCE.indexOf(currentStatus) + 1;
  const nextStatus: BookingStatus | null =
    nextStatusIndex < BOOKING_STATUS_SEQUENCE.length
      ? BOOKING_STATUS_SEQUENCE[nextStatusIndex]
      : null;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 1. Status Progress Tracker Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Booking Lifecycle
            </div>
            <div className="text-base font-bold text-slate-900 flex items-center gap-2 mt-0.5">
              <span>Status:</span>
              <span className="text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 text-xs">
                {currentStatus}
              </span>
            </div>
          </div>

          {/* Status Progression Button */}
          {nextStatus && (
            <button
              onClick={() => handleSetStatus(nextStatus)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all active:scale-[0.98] cursor-pointer"
            >
              <span>Advance to: {nextStatus}</span>
              <span>&rarr;</span>
            </button>
          )}
        </div>

        {/* Stepper Dots */}
        <div className="grid grid-cols-5 gap-1.5 text-center">
          {BOOKING_STATUS_SEQUENCE.map((st, i) => {
            const curIdx = BOOKING_STATUS_SEQUENCE.indexOf(currentStatus);
            const isDone = i < curIdx;
            const isCurrent = i === curIdx;

            return (
              <button
                key={st}
                onClick={() => handleSetStatus(st)}
                className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-blue-600 border-blue-600 text-white font-bold shadow-xs'
                    : isDone
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold'
                    : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                }`}
              >
                <div className="text-[10px] uppercase tracking-wider leading-none mb-1">
                  Step {i + 1}
                </div>
                <div className="text-xs truncate font-medium">{st}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Live GPS Location Sharing State & Permission Box */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                trackingState.isSharing
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              <Radio
                className={`w-5 h-5 ${trackingState.isSharing ? 'animate-pulse text-emerald-400' : ''}`}
              />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>GPS Location Broadcast</span>
                {trackingState.isSharing ? (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.2 rounded-full">
                    Broadcasting every 3-5s
                  </span>
                ) : (
                  <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.2 rounded-full">
                    Standby (Starts at 'On the way')
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Writes latitude, longitude, heading, speed &amp; ETA directly to Firestore
              </p>
            </div>
          </div>

          {/* Quick Simulation / Manual Trigger for Demo Testing */}
          <div className="flex items-center gap-2">
            {currentStatus === 'On the way' && (
              <button
                onClick={handleSimulateMovement}
                title="Simulate vehicle moving along Peenya route"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Crosshair className="w-3.5 h-3.5 text-blue-400" />
                <span>Simulate Route GPS</span>
              </button>
            )}

            {trackingState.isSharing ? (
              <button
                onClick={() => trackerRef.current?.stop()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold cursor-pointer"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Pause GPS</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  handleSetStatus('On the way');
                  trackerRef.current?.start();
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Start 'On the way'</span>
              </button>
            )}
          </div>
        </div>

        {/* Permission / GPS error banners */}
        {trackingState.errorMessage && (
          <div className="bg-amber-950/60 border border-amber-800/80 rounded-xl p-3 text-xs text-amber-200 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold">GPS Note:</span> {trackingState.errorMessage}
              <div className="text-[11px] text-amber-300/80">
                Tip: You can click "Simulate Route GPS" above to test real-time customer tracking motion.
              </div>
            </div>
          </div>
        )}

        {isOffline && (
          <div className="bg-rose-950/60 border border-rose-800/80 rounded-xl p-3 text-xs text-rose-200 flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Network disconnected. Location updates will sync once online.</span>
          </div>
        )}
      </div>

      {/* 3. Turn-by-Turn Navigation Map */}
      <TechnicianCustomerRouteMap
        request={request}
        technician={technician}
        heightClass="h-72 sm:h-80"
        onNavigationLaunched={handleLaunchNavigation}
      />
    </div>
  );
};
