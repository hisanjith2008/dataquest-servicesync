export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export type UserRole = 'Customer' | 'Technician' | 'Admin';

export const ALLOWED_VIEWS_BY_ROLE: Record<UserRole, string[]> = {
  Customer: ['dashboard'],
  Technician: ['dashboard', 'equipment', 'map'],
  Admin: ['dashboard', 'requests', 'technicians', 'inventory', 'equipment', 'map', 'audit', 'architecture'],
};

export type RequestStatus = 
  | 'Draft' 
  | 'Validated' 
  | 'Pending Approval' 
  | 'Approved' 
  | 'Assigned' 
  | 'In Progress' 
  | 'Completed' 
  | 'Verified' 
  | 'Closed' 
  | 'Exception' 
  | 'Reassigning';

export type ServiceProgressStage =
  | 'Requested'
  | 'Assigned'
  | 'En Route'
  | 'In Progress'
  | 'Testing'
  | 'Completed'
  | 'Verified';

export type BookingStatus = 'Booked' | 'Accepted' | 'On the way' | 'Arrived' | 'Completed';

export interface LiveTechnicianLocation {
  requestId: string;
  technicianId: string;
  customerId: string;
  latitude: number;
  longitude: number;
  heading: number;
  speed?: number | null;
  accuracy?: number;
  status: BookingStatus;
  etaMinutes?: number;
  distanceKm?: number;
  timestamp: string;
}

export type Priority = 'P1 - Critical' | 'P2 - High' | 'P3 - Medium' | 'P4 - Low';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface UserAccount {
  id: string; // Employee or Customer ID (e.g., 'EMP-ADM-01', 'EMP-TEC-101', 'CUST-BLR-01')
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  phone: string;
  organization: string;
  password?: string;
  technicianId?: string; // Links to technician entity if role is Technician
  siteId?: string; // Links to site entity if role is Customer
  designation?: string;
  isVerified?: boolean;
  verificationStatus?: 'verified' | 'pending' | 'rejected';
  specialty?: string;
  createdAt?: string;
}

export interface Site {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  state?: string;
  pincode?: string;
  coords: Coordinates;
  contactPerson: string;
  contactPhone: string;
  gstin?: string;
}

export interface ServiceHistoryItem {
  id: string;
  date: string;
  title: string;
  technicianName: string;
  partsReplaced: string[];
  findings: string;
  cost: number; // in INR (₹)
}

export interface Machine {
  id: string; // e.g. M-104
  name: string;
  model: string;
  serialNumber: string;
  siteId: string;
  siteName: string;
  status: 'Operational' | 'Degraded' | 'Critical Fault' | 'Under Maintenance';
  installDate: string;
  operatingHours: number;
  telemetry: {
    vibrationRms: number; // mm/s
    bearingTempC: number; // °C
    pressurePsi: number;
    lastPing: string;
  };
  serviceHistory: ServiceHistoryItem[];
}

export interface SparePart {
  id: string;
  sku: string;
  name: string;
  category?: string;
  description?: string;
  siteId: string;
  siteName: string;
  inStock: number;
  reserved: number;
  minThreshold: number;
  unitCost: number; // in INR (₹)
  leadTimeDays: number;
}

export interface SparePartRequest {
  id: string;
  requestId?: string;
  technicianId: string;
  technicianName: string;
  partId: string;
  partSku: string;
  partName: string;
  siteId: string;
  siteName: string;
  quantity: number;
  urgency: 'Routine' | 'Urgent' | 'Emergency';
  reason: string;
  status: 'Pending Admin Approval' | 'Approved & Ordered' | 'Stocked' | 'Rejected';
  requestedAt: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface CustomerFeedback {
  id: string;
  requestId: string;
  siteId: string;
  customerId: string;
  customerName: string;
  technicianId: string;
  technicianName: string;
  rating: number; // 1 to 5
  isDissatisfied: boolean;
  complaintReason?: string;
  comments: string;
  createdAt: string;
  status: 'Open' | 'Reviewed' | 'Resolved';
  restrictionCreated: boolean;
}

export interface Technician {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  skills: string[];
  certifications: string[];
  location: Coordinates;
  locationName: string;
  shift: string;
  activeLoad: number;
  maxCapacity: number;
  status: 'Available' | 'En Route' | 'On Site' | 'Dropped Out' | 'Off Duty';
  firstTimeFixRate: number; // percentage e.g. 96
  isVerified: boolean; // Admin verification status (must be verified for dispatch)
  restrictedCustomerIds: string[]; // List of siteIds barred due to customer dissatisfaction
  rating: number; // Average rating out of 5
  totalCompletedJobs: number;
}

export interface PreFlightScore {
  totalScore: number; // 0-100
  breakdown: {
    skillMatch: number; // 0-40 (40%)
    partsAvailability: number; // 0-30 (30%)
    distanceScore: number; // 0-15 (15%)
    loadScore: number; // 0-15 (15%)
  };
  explanation: string;
  recommendedTechId: string;
  recommendedTechName: string;
}

export interface ReplacementOption {
  technicianId: string;
  technicianName: string;
  etaMinutes: number;
  skillFitPercent: number;
  slaImpact: 'On-Time' | 'At-Risk' | 'Late';
  distanceKm: number;
  recommendedAction: string;
  isVerified?: boolean;
  isRestricted?: boolean;
}

export interface ConflictState {
  hasConflict: boolean;
  reason: 'technician_dropout' | 'part_unavailable' | 'sla_breach_risk' | 'offer_timeout';
  description: string;
  detectedAt: string;
  topReplacements: ReplacementOption[];
}

export interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
}

export interface ServiceDocument {
  id: string;
  name: string;
  url: string;
  type: 'photo' | 'report' | 'schematic' | 'compliance';
  uploadedAt: string;
  uploadedBy: string;
  caption?: string;
  fileSize?: string;
}

export interface StatusHistoryEntry {
  status: RequestStatus;
  timestamp: string;
  changedBy: string;
  changedByRole: UserRole;
  notes?: string;
}

export interface CompletionReport {
  completedAt: string;
  hoursSpent: number;
  workSummary: string;
  partsUsed: string[];
  finalVibrationRms?: number;
  finalTempC?: number;
  technicianNotes: string;
  verifiedAt?: string;
  verifiedBy?: string;
}

export interface ServiceRequest {
  id: string;
  title: string;
  description: string;
  machineId: string;
  siteId: string;
  siteName: string;
  customerId?: string;
  customerContactPerson?: string;
  customerContactPhone?: string;
  customerAddress?: string;
  customerCoords?: Coordinates;
  routeInfo?: {
    distanceKm?: number;
    durationMinutes?: number;
    summary?: string;
  };
  priority: Priority;
  bookingStatus?: BookingStatus;
  status: RequestStatus;
  previousStatus?: RequestStatus;
  serviceProgressStage: ServiceProgressStage;
  slaDeadline: string; // ISO string
  requiredSkills: string[];
  requiredParts: {
    partId: string;
    partName: string;
    quantity: number;
  }[];
  assignedTechnicianId?: string;
  // 5-minute Acceptance Countdown for Technician
  offeredTechnicianId?: string;
  offerExpiresAt?: string; // ISO string (now + 5 minutes)
  offeredAt?: string;
  declinedTechnicianIds?: string[];
  preFlightScore?: PreFlightScore;
  conflictState?: ConflictState;
  checklist: ChecklistItem[];
  completionNotes?: string;
  completionReport?: CompletionReport;
  documents: ServiceDocument[];
  customerFeedback?: CustomerFeedback;
  createdAt: string;
  updatedAt: string;
  createdByRole: UserRole;
  history: StatusHistoryEntry[];
  frozenWindow: boolean; // True when 'In Progress' to prevent unintended automated replanning
}

export interface AuditLogEntry {
  id: string;
  sequenceIndex: number;
  timestamp: string;
  actor: string;
  actorRole: UserRole;
  action: string;
  entityId: string;
  entityType: 'ServiceRequest' | 'Technician' | 'Machine' | 'Part' | 'System' | 'Feedback';
  details: Record<string, any>;
  previousHash: string;
  hash: string;
}

export type EventType = 
  | 'request.created'
  | 'request.status_changed'
  | 'technician.offered'
  | 'technician.accepted'
  | 'technician.declined'
  | 'technician.assigned'
  | 'technician.dropped'
  | 'technician.verified'
  | 'technician.restricted'
  | 'part.requested'
  | 'part.ordered'
  | 'part.stocked'
  | 'part.reserved'
  | 'part.low'
  | 'sla.at_risk'
  | 'conflict.detected'
  | 'conflict.resolved'
  | 'iot.telemetry_alert'
  | 'service.completed'
  | 'service.verified'
  | 'customer.feedback_submitted';

export interface AppEvent {
  id: string;
  timestamp: string;
  type: EventType;
  actor: string;
  summary: string;
  payload: Record<string, any>;
}

export interface NotificationItem {
  id: string;
  timestamp: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'danger' | 'success';
  read: boolean;
  requestId?: string;
}
