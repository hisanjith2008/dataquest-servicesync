import React, { useState, useEffect } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
} from '@vis.gl/react-google-maps';
import {
  Building2,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Wrench,
  UserCheck,
  ShieldAlert,
} from 'lucide-react';
import { useServiceSync } from '../../context/ServiceSyncContext';
import { Site, Technician } from '../../types';
import { ErrorBoundary } from '../common/ErrorBoundary';
import {
  GOOGLE_MAPS_API_KEY,
  GMP_MAP_ID,
  GMP_ATTRIBUTION_ID,
} from '../../services/googleMapsConfig';

interface EquipmentMapProps {
  heightClass?: string;
  selectedSiteId?: string;
}

// Inner helper component to control camera movements within Map context
const MapCameraController: React.FC<{
  selectedSiteId?: string;
  sites: Site[];
  technicians: Technician[];
}> = ({ selectedSiteId, sites, technicians }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    if (selectedSiteId) {
      const targetSite = sites.find((s) => s.id === selectedSiteId);
      if (targetSite) {
        map.panTo({ lat: targetSite.coords.lat, lng: targetSite.coords.lng });
        map.setZoom(12);
        return;
      }
    }
  }, [map, selectedSiteId, sites]);

  const handleFitAll = () => {
    if (!map) return;
    try {
      const g = typeof window !== 'undefined' ? (window as any).google : null;
      if (!g || !g.maps || !g.maps.LatLngBounds) return;
      const bounds = new g.maps.LatLngBounds();
      sites.forEach((site) => bounds.extend({ lat: site.coords.lat, lng: site.coords.lng }));
      technicians.forEach((t) => bounds.extend({ lat: t.location.lat, lng: t.location.lng }));
      map.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });
    } catch (err) {
      console.warn('Safe map camera fitBounds warning:', err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleFitAll}
      title="Fit All Sites & Technicians"
      className="absolute top-3 right-3 z-10 bg-white/95 hover:bg-white text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-lg shadow-md border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
    >
      <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
      <span>Fit All</span>
    </button>
  );
};

export const EquipmentMap: React.FC<EquipmentMapProps> = ({
  heightClass = 'h-96',
  selectedSiteId,
}) => {
  const { sites, machines, technicians, setSelectedRequestId, requests } = useServiceSync();
  const [activeSite, setActiveSite] = useState<Site | null>(null);
  const [activeTech, setActiveTech] = useState<Technician | null>(null);

  // If selectedSiteId changes externally, select that site
  useEffect(() => {
    if (selectedSiteId) {
      const s = sites.find((site) => site.id === selectedSiteId);
      if (s) setActiveSite(s);
    }
  }, [selectedSiteId, sites]);

  const defaultCenter = { lat: 13.03, lng: 77.52 }; // Bengaluru Industrial Hub

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
      <div className={`w-full ${heightClass}`}>
        <ErrorBoundary fallbackTitle="Live Equipment GIS Radar">
          <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
          <Map
            id="equipment-overview-map"
            mapId={GMP_MAP_ID}
            defaultCenter={defaultCenter}
            defaultZoom={7}
            gestureHandling="greedy"
            disableDefaultUI={false}
            internalUsageAttributionIds={[GMP_ATTRIBUTION_ID]}
            style={{ width: '100%', height: '100%' }}
          >
            <MapCameraController
              selectedSiteId={selectedSiteId}
              sites={sites}
              technicians={technicians}
            />

            {/* Customer Sites Markers */}
            {sites.map((site) => {
              const siteMachines = machines.filter((m) => m.siteId === site.id);
              const hasCritical = siteMachines.some((m) => m.status === 'Critical Fault');
              const isSelected = selectedSiteId === site.id || activeSite?.id === site.id;

              return (
                <AdvancedMarker
                  key={site.id}
                  position={{ lat: site.coords.lat, lng: site.coords.lng }}
                  onClick={() => {
                    setActiveSite(site);
                    setActiveTech(null);
                  }}
                  title={site.name}
                >
                  <div
                    className={`relative flex items-center justify-center w-10 h-10 rounded-xl shadow-lg border-2 border-white transition-transform hover:scale-110 cursor-pointer ${
                      hasCritical
                        ? 'bg-rose-600 ring-2 ring-rose-400'
                        : isSelected
                        ? 'bg-indigo-600 ring-2 ring-indigo-400'
                        : 'bg-blue-600 ring-2 ring-blue-300'
                    }`}
                  >
                    <Building2 className="w-5 h-5 text-white" />
                    {hasCritical && (
                      <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500 border border-white" />
                      </span>
                    )}
                  </div>
                </AdvancedMarker>
              );
            })}

            {/* Technician Markers */}
            {technicians.map((tech) => {
              const isDropped = tech.status === 'Dropped Out';
              const isAvailable = tech.status === 'Available';
              const isOnSite = tech.status === 'On Site';
              const isEnRoute = tech.status === 'En Route';

              return (
                <AdvancedMarker
                  key={tech.id}
                  position={{ lat: tech.location.lat, lng: tech.location.lng }}
                  onClick={() => {
                    setActiveTech(tech);
                    setActiveSite(null);
                  }}
                  title={tech.name}
                >
                  <div className="relative group cursor-pointer transition-transform hover:scale-110">
                    <div
                      className={`relative flex items-center justify-center w-9 h-9 rounded-full shadow-md border-2 border-white ${
                        isDropped
                          ? 'bg-rose-500 ring-2 ring-rose-400'
                          : isAvailable
                          ? 'bg-emerald-600 ring-2 ring-emerald-400'
                          : isOnSite
                          ? 'bg-indigo-600 ring-2 ring-indigo-400'
                          : isEnRoute
                          ? 'bg-amber-500 ring-2 ring-amber-400'
                          : 'bg-blue-600'
                      }`}
                    >
                      <img
                        src={tech.avatar}
                        alt={tech.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <span
                        className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                          isDropped
                            ? 'bg-rose-600'
                            : isAvailable
                            ? 'bg-emerald-500'
                            : isOnSite
                            ? 'bg-indigo-500'
                            : isEnRoute
                            ? 'bg-amber-500'
                            : 'bg-blue-500'
                        }`}
                      />
                    </div>
                  </div>
                </AdvancedMarker>
              );
            })}

            {/* Active Site InfoWindow */}
            {activeSite && (
              <InfoWindow
                position={{ lat: activeSite.coords.lat, lng: activeSite.coords.lng }}
                onCloseClick={() => setActiveSite(null)}
              >
                <div className="p-1 max-w-xs text-slate-900">
                  <div className="flex items-center gap-1.5 font-bold text-sm text-slate-900">
                    <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>{activeSite.name}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{activeSite.address}</div>

                  <div className="mt-2 pt-2 border-t border-slate-200">
                    <div className="text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Equipment on Site:</span>
                      <span className="font-mono text-slate-500">
                        {machines.filter((m) => m.siteId === activeSite.id).length} units
                      </span>
                    </div>
                    <ul className="space-y-1 max-h-32 overflow-y-auto">
                      {machines
                        .filter((m) => m.siteId === activeSite.id)
                        .map((m) => (
                          <li
                            key={m.id}
                            className="flex items-center justify-between text-xs bg-slate-50 p-1.5 rounded border border-slate-100"
                          >
                            <span className="font-mono font-medium">{m.id}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                m.status === 'Critical Fault'
                                  ? 'bg-rose-100 text-rose-700'
                                  : m.status === 'Operational'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {m.status}
                            </span>
                          </li>
                        ))}
                    </ul>
                  </div>

                  {/* Active Site Requests Link */}
                  {requests.some((r) => r.siteId === activeSite.id) && (
                    <div className="mt-2 pt-2 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => {
                          const req = requests.find((r) => r.siteId === activeSite.id);
                          if (req) setSelectedRequestId(req.id);
                        }}
                        className="w-full text-center text-xs text-blue-600 hover:text-blue-700 font-semibold py-1 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                      >
                        View Site Service Request →
                      </button>
                    </div>
                  )}
                </div>
              </InfoWindow>
            )}

            {/* Active Technician InfoWindow */}
            {activeTech && (
              <InfoWindow
                position={{ lat: activeTech.location.lat, lng: activeTech.location.lng }}
                onCloseClick={() => setActiveTech(null)}
              >
                <div className="p-1 max-w-xs text-slate-900">
                  <div className="flex items-center gap-2">
                    <img
                      src={activeTech.avatar}
                      alt={activeTech.name}
                      className="w-8 h-8 rounded-full object-cover border border-slate-200"
                    />
                    <div>
                      <div className="font-bold text-sm text-slate-900">{activeTech.name}</div>
                      <div className="text-[11px] text-slate-500">{activeTech.locationName}</div>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-200 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Status:</span>
                      <strong
                        className={
                          activeTech.status === 'Dropped Out'
                            ? 'text-rose-600'
                            : activeTech.status === 'Available'
                            ? 'text-emerald-600'
                            : 'text-indigo-600'
                        }
                      >
                        {activeTech.status}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Active Load:</span>
                      <span className="font-mono">
                        {activeTech.activeLoad} / {activeTech.maxCapacity} jobs
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Fix Rate:</span>
                      <span className="font-mono text-emerald-600 font-bold">
                        {activeTech.firstTimeFixRate}%
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 mt-1">
                      Skills: {activeTech.skills.slice(0, 3).join(', ')}
                    </div>
                  </div>
                </div>
              </InfoWindow>
            )}
          </Map>
        </APIProvider>
        </ErrorBoundary>
      </div>

      {/* Modern Map Legend */}
      <div className="absolute bottom-3 left-3 z-10 bg-white/95 backdrop-blur-xs py-2 px-3 rounded-xl shadow-md border border-slate-200 text-xs flex flex-wrap items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
          <span className="text-slate-600 font-medium">Customer Sites</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
          <span className="text-slate-600 font-medium">Critical Equipment</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-slate-600 font-medium">Available Techs</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          <span className="text-slate-600 font-medium">Dropped Out Tech</span>
        </div>
      </div>
    </div>
  );
};
