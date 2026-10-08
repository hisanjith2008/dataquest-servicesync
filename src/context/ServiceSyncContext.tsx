import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  AuditLogEntry,
  Machine,
  NotificationItem,
  RequestStatus,
  ServiceRequest,
  Site,
  SparePart,
  Technician,
  UserRole,
  UserAccount,
  SparePartRequest,
  CustomerFeedback,
  ServiceProgressStage,
  BookingStatus,
  ServiceDocument,
  CompletionReport,
  ALLOWED_VIEWS_BY_ROLE,
  Coordinates,
} from '../types';
import { updateBookingStatusInDb } from '../services/trackingService';
import {
  SEED_ACCOUNTS,
  SEED_AUDIT_LOG,
  SEED_FEEDBACKS,
  SEED_MACHINES,
  SEED_PARTS,
  SEED_PARTS_REQUESTS,
  SEED_REQUESTS,
  SEED_SITES,
  SEED_TECHNICIANS,
} from '../data/seedData';
import { createChainedAuditEntry, verifyAuditChain } from '../utils/cryptoAudit';
import { eventBus } from '../utils/eventBus';
import { calculatePreFlightScore, rankEligibleTechnicians } from '../utils/scoring';
import { evaluateRequestConflicts } from '../utils/conflictEngine';
import { validateTransition } from '../utils/stateMachine';
import { geocodeAddress } from '../utils/geocoding';

interface ServiceSyncContextType {
  // Authentication & Security (Strict RBAC, no frontend role-switching)
  currentUserAccount: UserAccount;
  login: (
    accountIdOrEmail: string,
    password?: string
  ) => Promise<{
    success: boolean;
    error?: string;
    requiresVerification?: boolean;
    pendingTechnicianName?: string;
    account?: UserAccount;
  }>;
  logout: () => void;
  createAccount: (data: {
    name: string;
    email: string;
    role: UserRole;
    employeeId?: string;
    password: string;
    phone?: string;
    organization?: string;
    specialty?: string;
    skills?: string[];
    city?: string;
    siteId?: string;
    designation?: string;
  }) => Promise<{
    success: boolean;
    account?: UserAccount;
    error?: string;
    requiresVerification?: boolean;
  }>;
  resetPassword: (
    emailOrId: string,
    newPassword: string
  ) => Promise<{ success: boolean; error?: string }>;
  currentRole: UserRole;
  currentUser: { name: string; email: string; role: UserRole; avatar: string; id: string; siteId?: string; technicianId?: string };
  accounts: UserAccount[];

  // Entities
  sites: Site[];
  machines: Machine[];
  parts: SparePart[];
  technicians: Technician[];
  requests: ServiceRequest[];
  sparePartRequests: SparePartRequest[];
  customerFeedbacks: CustomerFeedback[];
  auditLog: AuditLogEntry[];
  notifications: NotificationItem[];

  // Navigation & Selection
  selectedRequestId: string | null;
  setSelectedRequestId: (id: string | null) => void;
  activeView: string;
  setActiveView: (view: string) => void;
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (open: boolean) => void;
  isRecoveryModalOpen: boolean;
  setIsRecoveryModalOpen: (open: boolean) => void;
  isCopilotOpen: boolean;
  setIsCopilotOpen: (open: boolean) => void;
  demoStep: number;
  setDemoStep: (step: number) => void;
  runDemoStep: (step: number) => Promise<void>;
  scopedRequests: ServiceRequest[];

  // Technician 5-Minute Offer System
  getOfferRemainingSeconds: (requestId: string) => number;
  acceptServiceOffer: (requestId: string) => Promise<{ success: boolean; error?: string }>;
  declineServiceOffer: (requestId: string, reason?: string) => Promise<{ success: boolean; error?: string }>;
  cascadeOfferToNextTechnician: (requestId: string) => Promise<void>;

  // Technician Actions
  updateBookingStatus: (requestId: string, status: BookingStatus) => Promise<{ success: boolean }>;
  updateServiceProgress: (requestId: string, stage: ServiceProgressStage) => Promise<{ success: boolean; error?: string }>;
  raiseSparePartRequest: (data: {
    requestId?: string;
    partId: string;
    siteId: string;
    quantity: number;
    urgency: 'Routine' | 'Urgent' | 'Emergency';
    reason: string;
  }) => Promise<{ success: boolean; id?: string }>;
  uploadServiceDocument: (requestId: string, doc: {
    name: string;
    url: string;
    type: 'photo' | 'report' | 'schematic' | 'compliance';
    caption?: string;
    fileSize?: string;
  }) => void;
  submitCompletionReport: (
    requestId: string,
    report: {
      hoursSpent: number;
      workSummary: string;
      partsUsed: string[];
      finalVibrationRms?: number;
      finalTempC?: number;
      technicianNotes: string;
    }
  ) => Promise<{ success: boolean; error?: string }>;

  // Admin Verification & Approvals
  verifyTechnician: (techId: string, verified: boolean) => Promise<void>;
  updateAccountPassword: (accountId: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  approveSparePartOrder: (partRequestId: string) => Promise<void>;
  approveSparePartStocking: (partRequestId: string) => Promise<void>;
  rejectSparePartRequest: (partRequestId: string, reason?: string) => Promise<void>;
  approveTechnicianPartRequest: (partRequestId: string) => Promise<{ success: boolean; error?: string }>;
  addSparePart: (partData: Omit<SparePart, 'id'>) => Promise<SparePart>;
  updateSparePart: (partId: string, updates: Partial<SparePart>) => Promise<void>;
  deleteSparePart: (partId: string) => Promise<void>;
  adjustSparePartStock: (partId: string, delta: number) => Promise<void>;
  verifyServiceCompletion: (requestId: string) => Promise<{ success: boolean; error?: string }>;
  removeTechnicianRestriction: (techId: string, siteId: string) => Promise<void>;
  resolveCustomerComplaint: (feedbackId: string) => Promise<void>;

  // Customer Actions
  submitCustomerRequest: (data: {
    machineId: string;
    title: string;
    description: string;
    priority: any;
    customerAddress?: string;
    customerCoords?: Coordinates;
    requiredSkills?: string[];
    requiredParts?: { partId: string; partName: string; quantity: number }[];
  }) => Promise<{ success: boolean; id?: string; error?: string }>;
  submitCustomerFeedback: (
    requestId: string,
    feedback: {
      rating: number;
      isDissatisfied: boolean;
      complaintReason?: string;
      comments: string;
    }
  ) => Promise<{ success: boolean; restrictionCreated: boolean }>;

  // General Lifecycle Actions
  transitionRequest: (
    requestId: string,
    targetStatus: RequestStatus,
    notes?: string
  ) => Promise<{ success: boolean; error?: string }>;
  addDocumentToRequest: (requestId: string, doc: { name: string; url: string; caption?: string; type?: any }) => void;
  createRequest: (newReqData: Partial<ServiceRequest>) => Promise<{ success: boolean; id?: string; error?: string }>;
  executeRecoveryPlan: (
    requestId: string,
    replacementTechId: string,
    transferPartSku?: string
  ) => Promise<boolean>;
  triggerSimulatedIotAlert: (machineId?: string) => Promise<string>;
  simulateTechnicianDropout: (techId: string) => Promise<void>;
  updateChecklistItem: (requestId: string, checklistId: string, completed: boolean) => void;
  verifyAuditLedger: () => Promise<{ isValid: boolean; checkedCount: number; message: string }>;
  transferPartBetweenSites: (partSku: string, fromSiteId: string, toSiteId: string, qty: number) => Promise<void>;
  markNotificationAsRead: (id: string) => void;
  clearAllNotifications: () => void;
  resetDemoScenario: () => void;
}

const ServiceSyncContext = createContext<ServiceSyncContextType | undefined>(undefined);

export const ServiceSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Accounts and Authentication
  const [accounts, setAccounts] = useState<UserAccount[]>(SEED_ACCOUNTS);
  // Default logged in user: Admin (Rajesh Sharma)
  const [currentUserAccount, setCurrentUserAccount] = useState<UserAccount>(SEED_ACCOUNTS[0]);

  // Entities
  const [sites] = useState<Site[]>(SEED_SITES);
  const [machines, setMachines] = useState<Machine[]>(SEED_MACHINES);
  const [parts, setParts] = useState<SparePart[]>(SEED_PARTS);
  const [technicians, setTechnicians] = useState<Technician[]>(SEED_TECHNICIANS);
  const [requests, setRequests] = useState<ServiceRequest[]>(SEED_REQUESTS);
  const [sparePartRequests, setSparePartRequests] = useState<SparePartRequest[]>(SEED_PARTS_REQUESTS);
  const [customerFeedbacks, setCustomerFeedbacks] = useState<CustomerFeedback[]>(SEED_FEEDBACKS);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>(SEED_AUDIT_LOG);

  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'notif-1',
      timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      title: '5-Minute Offer Timer Active: SR-1040',
      message: 'Emergency request SR-1040 offered to verified specialist Priya Patel. Awaiting acceptance.',
      type: 'warning',
      read: false,
      requestId: 'SR-1040',
    },
    {
      id: 'notif-2',
      timestamp: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
      title: 'Customer Restriction Recorded',
      message: 'Technician Rahul Deshmukh restricted from Bharat Precision Works (Site A) due to complaint.',
      type: 'danger',
      read: false,
    },
    {
      id: 'notif-3',
      timestamp: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      title: 'P1 Vibration Alert Raised (IST)',
      message: 'Machine M-104 vibration exceeded 7.8 mm/s threshold at Bharat Precision Works, Peenya, Bengaluru.',
      type: 'warning',
      read: false,
      requestId: 'SR-1040',
    },
  ]);

  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [activeViewState, setActiveViewState] = useState<string>('dashboard');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState<boolean>(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState<boolean>(false);
  const [demoStep, setDemoStep] = useState<number>(4);

  // Current Role strictly derived from authenticated account
  const currentRole: UserRole = currentUserAccount.role;

  // Enforce that activeView cannot be switched to an unauthorized view for currentRole
  const setActiveView = useCallback(
    (view: string) => {
      const allowedViews = ALLOWED_VIEWS_BY_ROLE[currentUserAccount.role] || ['dashboard'];
      if (!allowedViews.includes(view)) {
        console.warn(
          `[RBAC Security Violation Blocked] Role "${currentUserAccount.role}" cannot access view "${view}". Falling back to dashboard.`
        );
        setActiveViewState('dashboard');
        return;
      }
      setActiveViewState(view);
    },
    [currentUserAccount.role]
  );

  const activeView = activeViewState;

  const currentUser = useMemo(() => ({
    id: currentUserAccount.id,
    name: currentUserAccount.name,
    email: currentUserAccount.email,
    role: currentUserAccount.role,
    avatar: currentUserAccount.avatar,
    siteId: currentUserAccount.siteId,
    technicianId: currentUserAccount.technicianId,
  }), [currentUserAccount]);

  // Scoped Requests: Customer sees ONLY requests for their site
  const scopedRequests = useMemo(() => {
    if (currentRole === 'Customer') {
      const userSiteId = currentUserAccount.siteId || 'site-a';
      return requests.filter((r) => r.siteId === userSiteId);
    }
    if (currentRole === 'Technician') {
      const techId = currentUserAccount.technicianId || 'tech-01';
      return requests.filter((r) => r.assignedTechnicianId === techId || r.offeredTechnicianId === techId);
    }
    return requests;
  }, [requests, currentRole, currentUserAccount]);

  // Append Audit Record
  const appendAudit = useCallback(
    async (action: string, entityId: string, entityType: any, details: Record<string, any>) => {
      const lastEntry = auditLog[auditLog.length - 1];

      const newEntry = await createChainedAuditEntry(
        currentUser.name,
        currentUser.role,
        action,
        entityId,
        entityType,
        details,
        lastEntry
      );

      setAuditLog((prev) => [...prev, newEntry]);
    },
    [auditLog, currentUser]
  );

  // Authentication: Login function (Strict credential verification)
  const login = useCallback(
    async (
      accountIdOrEmail: string,
      password?: string
    ): Promise<{
      success: boolean;
      error?: string;
      requiresVerification?: boolean;
      pendingTechnicianName?: string;
      account?: UserAccount;
    }> => {
      const trimmedId = accountIdOrEmail.trim().toLowerCase();
      const acc = accounts.find(
        (a) =>
          a.id.toLowerCase() === trimmedId ||
          a.email.toLowerCase() === trimmedId
      );
      if (!acc) {
        return { success: false, error: 'User ID or Employee ID not found in authorized directory.' };
      }
      if (!password || acc.password !== password) {
        return { success: false, error: 'Invalid password. Please verify your credentials and try again.' };
      }

      // Check Technician Admin Verification
      if (acc.role === 'Technician') {
        const linkedTech = acc.technicianId ? technicians.find((t) => t.id === acc.technicianId) : null;
        const isVerified = (acc.isVerified ?? linkedTech?.isVerified) === true;
        if (!isVerified) {
          return {
            success: false,
            requiresVerification: true,
            pendingTechnicianName: acc.name,
            account: acc,
            error: `Account Pending Admin Verification: Technician profile (${acc.id}) has been created but must be verified by an Administrator before accessing the platform.`
          };
        }
      }

      setCurrentUserAccount(acc);
      setActiveViewState('dashboard');
      eventBus.publish(
        'request.created',
        `User ${acc.name} (${acc.role}) authenticated successfully.`,
        acc.name,
        { accountId: acc.id, role: acc.role }
      );
      return { success: true, account: acc };
    },
    [accounts, technicians]
  );

  // Create new account
  const createAccount = useCallback(
    async (data: {
      name: string;
      email: string;
      role: UserRole;
      employeeId?: string;
      password: string;
      phone?: string;
      organization?: string;
      specialty?: string;
      skills?: string[];
      city?: string;
      siteId?: string;
      designation?: string;
    }): Promise<{ success: boolean; account?: UserAccount; error?: string; requiresVerification?: boolean }> => {
      const emailLower = data.email.trim().toLowerCase();

      // Check existing email
      const existingEmail = accounts.find((a) => a.email.toLowerCase() === emailLower);
      if (existingEmail) {
        return {
          success: false,
          error: 'An account with this email address already exists. Please sign in or reset your password.',
        };
      }

      // Determine ID
      let assignedId = (data.employeeId || '').trim();
      if (!assignedId) {
        if (data.role === 'Technician') {
          const techCount = accounts.filter((a) => a.role === 'Technician').length + 101;
          assignedId = `EMP-TEC-${techCount}`;
        } else if (data.role === 'Customer') {
          const custCount = accounts.filter((a) => a.role === 'Customer').length + 1;
          const cityCode = data.city ? data.city.slice(0, 3).toUpperCase() : 'BLR';
          assignedId = `CUST-${cityCode}-0${custCount}`;
        } else {
          assignedId = `EMP-ADM-0${accounts.filter((a) => a.role === 'Admin').length + 1}`;
        }
      }

      // Check existing ID
      const existingId = accounts.find((a) => a.id.toLowerCase() === assignedId.toLowerCase());
      if (existingId) {
        return {
          success: false,
          error: `Employee / Account ID "${assignedId}" is already taken. Please specify a different ID.`,
        };
      }

      const isTechnician = data.role === 'Technician';
      const techId = isTechnician ? `tech-${Date.now().toString().slice(-4)}` : undefined;

      // Technicians require Admin verification before platform access!
      const isVerified = !isTechnician;
      const verificationStatus: 'verified' | 'pending' = isTechnician ? 'pending' : 'verified';

      const avatar = isTechnician
        ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
        : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80';

      const newAccount: UserAccount = {
        id: assignedId,
        name: data.name.trim(),
        email: emailLower,
        role: data.role,
        avatar,
        phone: data.phone?.trim() || '+91 98000 00000',
        organization:
          data.organization?.trim() ||
          (isTechnician ? 'ServiceSync Field Engineering Hub' : 'Industrial Facility'),
        password: data.password,
        technicianId: techId,
        siteId: data.siteId || (data.role === 'Customer' ? 'site-a' : undefined),
        designation:
          data.designation?.trim() ||
          (isTechnician
            ? `${data.specialty || 'Industrial Field Technician'}`
            : 'Plant Operations Lead'),
        isVerified,
        verificationStatus,
        specialty: data.specialty,
        createdAt: new Date().toISOString(),
      };

      if (isTechnician && techId) {
        const newTech: Technician = {
          id: techId,
          name: data.name.trim(),
          email: emailLower,
          phone: newAccount.phone,
          avatar,
          skills:
            data.skills && data.skills.length > 0
              ? data.skills
              : [data.specialty || 'Industrial Maintenance', 'Vibration Analysis'],
          certifications: ['Certified Field Engineer (ISO 9001:2015)', 'Safety Protocol Clearance'],
          location: { lat: 12.9716, lng: 77.5946 },
          locationName: data.city ? `${data.city} Industrial Zone` : 'Bengaluru Hub',
          shift: 'Standard Field Shift (08:30 - 17:30 IST)',
          activeLoad: 0,
          maxCapacity: 3,
          status: 'Off Duty',
          firstTimeFixRate: 95,
          isVerified: false, // Must be verified by Admin!
          restrictedCustomerIds: [],
          rating: 5.0,
          totalCompletedJobs: 0,
        };
        setTechnicians((prev) => [newTech, ...prev]);
      }

      setAccounts((prev) => [...prev, newAccount]);

      // Add notification for Admin if technician registered
      if (isTechnician) {
        setNotifications((prev) => [
          {
            id: `notif-${Date.now()}`,
            timestamp: new Date().toISOString(),
            title: `New Technician Awaiting Admin Verification`,
            message: `${newAccount.name} (${newAccount.id}) has registered as a technician and requires Admin authorization before dispatch.`,
            type: 'warning',
            read: false,
          },
          ...prev,
        ]);
      }

      await appendAudit('ACCOUNT_REGISTERED', newAccount.id, 'UserAccount', {
        name: newAccount.name,
        email: newAccount.email,
        role: newAccount.role,
        isVerified,
        requiresVerification: isTechnician,
      });

      return {
        success: true,
        account: newAccount,
        requiresVerification: isTechnician,
      };
    },
    [accounts, appendAudit]
  );

  // Reset password
  const resetPassword = useCallback(
    async (emailOrId: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
      const query = emailOrId.trim().toLowerCase();
      const targetAcc = accounts.find(
        (a) => a.email.toLowerCase() === query || a.id.toLowerCase() === query
      );
      if (!targetAcc) {
        return {
          success: false,
          error: 'No registered user found with that email address or Employee ID.',
        };
      }
      setAccounts((prev) =>
        prev.map((a) => (a.id === targetAcc.id ? { ...a, password: newPassword } : a))
      );
      await appendAudit('PASSWORD_RESET', targetAcc.id, 'UserAccount', {
        email: targetAcc.email,
        timestamp: new Date().toISOString(),
      });
      return { success: true };
    },
    [accounts, appendAudit]
  );

  // Logout function
  const logout = useCallback(() => {
    setActiveViewState('dashboard');
  }, []);

  // 5-Minute Offer Timer calculation
  const getOfferRemainingSeconds = useCallback((requestId: string): number => {
    const req = requests.find((r) => r.id === requestId);
    if (!req || !req.offerExpiresAt) return 0;
    const diffMs = new Date(req.offerExpiresAt).getTime() - Date.now();
    return Math.max(0, Math.floor(diffMs / 1000));
  }, [requests]);

  // Cascade offer to next eligible technician
  const cascadeOfferToNextTechnician = useCallback(async (requestId: string) => {
    const req = requests.find((r) => r.id === requestId);
    if (!req) return;

    const currentOffered = req.offeredTechnicianId;
    const declined = [...(req.declinedTechnicianIds || [])];
    if (currentOffered && !declined.includes(currentOffered)) {
      declined.push(currentOffered);
    }

    const site = sites.find((s) => s.id === req.siteId) || sites[0];
    const { ranked } = rankEligibleTechnicians(req, site, technicians, parts, declined);

    if (ranked.length > 0) {
      const nextCandidate = ranked[0];
      const nextTech = nextCandidate.technician;
      const newOfferExpiry = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      setRequests((prev) =>
        prev.map((r) => {
          if (r.id !== requestId) return r;
          return {
            ...r,
            offeredTechnicianId: nextTech.id,
            offerExpiresAt: newOfferExpiry,
            offeredAt: new Date().toISOString(),
            declinedTechnicianIds: declined,
            status: 'Assigned',
            serviceProgressStage: 'Assigned',
            preFlightScore: {
              totalScore: nextCandidate.totalScore,
              breakdown: nextCandidate.breakdown,
              explanation: `Auto-cascaded: Previous technician offer timed out or declined. Offered to next verified technician ${nextTech.name} with 5-minute acceptance timer.`,
              recommendedTechId: nextTech.id,
              recommendedTechName: nextTech.name,
            },
            history: [
              ...r.history,
              {
                status: 'Assigned',
                timestamp: new Date().toISOString(),
                changedBy: 'Assignment Engine (5m Cascade)',
                changedByRole: 'Admin',
                notes: `Offer timed out for previous tech. Auto-routed to ${nextTech.name} (5-min acceptance window).`,
              },
            ],
            updatedAt: new Date().toISOString(),
          };
        })
      );

      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          timestamp: new Date().toISOString(),
          title: `Offer Cascaded to ${nextTech.name}`,
          message: `Request ${req.id} automatically passed to next verified engineer ${nextTech.name}. 5-minute countdown active.`,
          type: 'info',
          read: false,
          requestId: req.id,
        },
        ...prev,
      ]);

      await appendAudit('TECHNICIAN_OFFER_CASCADED', requestId, 'ServiceRequest', {
        previousTechId: currentOffered,
        nextTechId: nextTech.id,
        nextTechName: nextTech.name,
        expiresAt: newOfferExpiry,
      });
    } else {
      // No eligible technicians remain!
      setRequests((prev) =>
        prev.map((r) => {
          if (r.id !== requestId) return r;
          return {
            ...r,
            offeredTechnicianId: undefined,
            offerExpiresAt: undefined,
            declinedTechnicianIds: declined,
            status: 'Exception',
            conflictState: {
              hasConflict: true,
              reason: 'technician_dropout',
              description: 'All eligible verified technicians declined or timed out the 5-minute acceptance window. Manual Admin intervention required.',
              detectedAt: new Date().toISOString(),
              topReplacements: [],
            },
            history: [
              ...r.history,
              {
                status: 'Exception',
                timestamp: new Date().toISOString(),
                changedBy: 'Assignment Engine',
                changedByRole: 'Admin',
                notes: 'All eligible technicians timed out/declined. Exception raised for Admin review.',
              },
            ],
            updatedAt: new Date().toISOString(),
          };
        })
      );

      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          timestamp: new Date().toISOString(),
          title: `CRITICAL: No Technicians Available for ${req.id}`,
          message: 'All eligible verified technicians timed out or declined. Request is now in Exception.',
          type: 'danger',
          read: false,
          requestId: req.id,
        },
        ...prev,
      ]);

      await appendAudit('OFFER_CASCADE_EXHAUSTED', requestId, 'ServiceRequest', {
        declinedTechnicians: declined,
      });
    }
  }, [requests, sites, technicians, parts, appendAudit]);

  // Periodic Timer check for 5-minute acceptance offers
  useEffect(() => {
    const timer = setInterval(() => {
      requests.forEach((req) => {
        if (req.offeredTechnicianId && req.offerExpiresAt && req.status !== 'In Progress' && req.status !== 'Completed' && req.status !== 'Verified' && req.status !== 'Closed') {
          const expires = new Date(req.offerExpiresAt).getTime();
          if (Date.now() >= expires) {
            cascadeOfferToNextTechnician(req.id);
          }
        }
      });
    }, 2000);

    return () => clearInterval(timer);
  }, [requests, cascadeOfferToNextTechnician]);

  // Technician accepts offer
  const acceptServiceOffer = useCallback(async (requestId: string): Promise<{ success: boolean; error?: string }> => {
    const req = requests.find((r) => r.id === requestId);
    if (!req) return { success: false, error: 'Request not found' };

    const acceptingTechId = currentUserAccount.technicianId || req.offeredTechnicianId || 'tech-02';
    const tech = technicians.find((t) => t.id === acceptingTechId);

    setRequests((prev) =>
      prev.map((r) => {
        if (r.id !== requestId) return r;
        return {
          ...r,
          status: 'Assigned',
          bookingStatus: 'Accepted',
          assignedTechnicianId: acceptingTechId,
          offeredTechnicianId: undefined,
          offerExpiresAt: undefined,
          serviceProgressStage: 'Assigned',
          history: [
            ...r.history,
            {
              status: 'Assigned',
              timestamp: new Date().toISOString(),
              changedBy: tech ? tech.name : currentUser.name,
              changedByRole: 'Technician',
              notes: `Offer accepted by technician within 5-minute SLA window. Dispatched.`,
            },
          ],
          updatedAt: new Date().toISOString(),
        };
      })
    );

    setTechnicians((prev) =>
      prev.map((t) =>
        t.id === acceptingTechId
          ? { ...t, activeLoad: t.activeLoad + 1, status: 'En Route' }
          : t
      )
    );

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        timestamp: new Date().toISOString(),
        title: `Offer Accepted by ${tech?.name || 'Technician'}`,
        message: `Technician accepted work order ${requestId}. Status updated to Assigned & Dispatched.`,
        type: 'success',
        read: false,
        requestId,
      },
      ...prev,
    ]);

    await appendAudit('TECHNICIAN_OFFER_ACCEPTED', requestId, 'ServiceRequest', {
      technicianId: acceptingTechId,
      technicianName: tech?.name,
    });

    return { success: true };
  }, [requests, currentUserAccount, technicians, currentUser, appendAudit]);

  // Technician declines offer
  const declineServiceOffer = useCallback(async (requestId: string, reason?: string): Promise<{ success: boolean; error?: string }> => {
    const req = requests.find((r) => r.id === requestId);
    if (!req) return { success: false, error: 'Request not found' };

    const techId = currentUserAccount.technicianId || req.offeredTechnicianId || 'tech-01';
    await appendAudit('TECHNICIAN_OFFER_DECLINED', requestId, 'ServiceRequest', {
      technicianId: techId,
      reason: reason || 'Technician declined dispatch assignment.',
    });

    await cascadeOfferToNextTechnician(requestId);
    return { success: true };
  }, [requests, currentUserAccount, appendAudit, cascadeOfferToNextTechnician]);

  // Update Booking Status (Booked -> Accepted -> On the way -> Arrived -> Completed)
  const updateBookingStatus = useCallback(async (requestId: string, status: BookingStatus): Promise<{ success: boolean }> => {
    const req = requests.find((r) => r.id === requestId);
    if (!req) return { success: false };

    let mappedStatus: RequestStatus = req.status;
    let mappedStage: ServiceProgressStage = req.serviceProgressStage;

    if (status === 'Booked') {
      mappedStatus = 'Approved';
      mappedStage = 'Requested';
    } else if (status === 'Accepted') {
      mappedStatus = 'Assigned';
      mappedStage = 'Assigned';
    } else if (status === 'On the way') {
      mappedStatus = 'Assigned';
      mappedStage = 'En Route';
    } else if (status === 'Arrived') {
      mappedStatus = 'In Progress';
      mappedStage = 'In Progress';
    } else if (status === 'Completed') {
      mappedStatus = 'Completed';
      mappedStage = 'Completed';
    }

    setRequests((prev) =>
      prev.map((r) => {
        if (r.id !== requestId) return r;
        return {
          ...r,
          bookingStatus: status,
          status: mappedStatus,
          serviceProgressStage: mappedStage,
          frozenWindow: status === 'Arrived' || status === 'On the way',
          history: [
            ...r.history,
            {
              status: mappedStatus,
              timestamp: new Date().toISOString(),
              changedBy: currentUser.name,
              changedByRole: currentUser.role,
              notes: `Booking lifecycle stage updated to: ${status}`,
            },
          ],
          updatedAt: new Date().toISOString(),
        };
      })
    );

    // Sync to Firestore
    await updateBookingStatusInDb(requestId, status);

    // Update technician status
    if (req.assignedTechnicianId) {
      setTechnicians((prev) =>
        prev.map((t) => {
          if (t.id !== req.assignedTechnicianId) return t;
          if (status === 'On the way') return { ...t, status: 'En Route' };
          if (status === 'Arrived') return { ...t, status: 'On Site' };
          if (status === 'Completed') return { ...t, status: 'Available' };
          return t;
        })
      );
    }

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        timestamp: new Date().toISOString(),
        title: `Booking Status: ${status}`,
        message: `Work Order ${requestId} is now: ${status}.`,
        type: status === 'Completed' ? 'success' : 'info',
        read: false,
        requestId,
      },
      ...prev,
    ]);

    await appendAudit('BOOKING_STATUS_CHANGED', requestId, 'ServiceRequest', {
      bookingStatus: status,
      updatedBy: currentUser.name,
      role: currentUser.role,
    });

    return { success: true };
  }, [requests, currentUser, appendAudit]);

  // Update Service Progress (Technician En Route -> In Progress -> Testing -> Completed)
  const updateServiceProgress = useCallback(async (requestId: string, stage: ServiceProgressStage): Promise<{ success: boolean; error?: string }> => {
    const req = requests.find((r) => r.id === requestId);
    if (!req) return { success: false, error: 'Request not found' };

    let targetStatus: RequestStatus = req.status;
    if (stage === 'En Route') {
      targetStatus = 'Assigned';
    } else if (stage === 'In Progress' || stage === 'Testing') {
      targetStatus = 'In Progress';
    } else if (stage === 'Completed') {
      targetStatus = 'Completed';
    } else if (stage === 'Verified') {
      targetStatus = 'Verified';
    }

    setRequests((prev) =>
      prev.map((r) => {
        if (r.id !== requestId) return r;
        return {
          ...r,
          status: targetStatus,
          serviceProgressStage: stage,
          frozenWindow: stage === 'In Progress' || stage === 'Testing',
          history: [
            ...r.history,
            {
              status: targetStatus,
              timestamp: new Date().toISOString(),
              changedBy: currentUser.name,
              changedByRole: currentUser.role,
              notes: `Service progress updated: ${stage}`,
            },
          ],
          updatedAt: new Date().toISOString(),
        };
      })
    );

    // Update technician status
    if (req.assignedTechnicianId) {
      setTechnicians((prev) =>
        prev.map((t) => {
          if (t.id !== req.assignedTechnicianId) return t;
          if (stage === 'En Route') return { ...t, status: 'En Route' };
          if (stage === 'In Progress' || stage === 'Testing') return { ...t, status: 'On Site' };
          if (stage === 'Completed') return { ...t, status: 'Available' };
          return t;
        })
      );
    }

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        timestamp: new Date().toISOString(),
        title: `Service Progress: ${stage}`,
        message: `Machine ${req.machineId} at ${req.siteName} is now: ${stage}.`,
        type: 'info',
        read: false,
        requestId,
      },
      ...prev,
    ]);

    await appendAudit('SERVICE_PROGRESS_UPDATED', requestId, 'ServiceRequest', {
      stage,
      status: targetStatus,
    });

    return { success: true };
  }, [requests, currentUser, appendAudit]);

  // Raise Spare Part Request (Technician -> Admin)
  const raiseSparePartRequest = useCallback(async (data: {
    requestId?: string;
    partId: string;
    siteId: string;
    quantity: number;
    urgency: 'Routine' | 'Urgent' | 'Emergency';
    reason: string;
  }): Promise<{ success: boolean; id?: string }> => {
    const part = parts.find((p) => p.id === data.partId);
    const site = sites.find((s) => s.id === data.siteId);
    const techName = currentUser.name;
    const techId = currentUserAccount.technicianId || 'tech-01';

    const newReqId = `PR-${Date.now().toString().slice(-4)}`;
    const newPartReq: SparePartRequest = {
      id: newReqId,
      requestId: data.requestId,
      technicianId: techId,
      technicianName: techName,
      partId: data.partId,
      partSku: part ? part.sku : 'SKU-GEN',
      partName: part ? part.name : 'Spare Part',
      siteId: data.siteId,
      siteName: site ? site.name : 'Customer Site',
      quantity: data.quantity,
      urgency: data.urgency,
      reason: data.reason,
      status: 'Pending Admin Approval',
      requestedAt: new Date().toISOString(),
    };

    setSparePartRequests((prev) => [newPartReq, ...prev]);

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        timestamp: new Date().toISOString(),
        title: `Spare Part Request: ${part?.name}`,
        message: `Technician ${techName} requested ${data.quantity}x ${part?.sku} (${data.urgency}). Requires Admin approval.`,
        type: 'warning',
        read: false,
      },
      ...prev,
    ]);

    await appendAudit('SPARE_PART_REQUESTED', newReqId, 'Part', {
      partSku: part?.sku,
      quantity: data.quantity,
      urgency: data.urgency,
      technician: techName,
    });

    return { success: true, id: newReqId };
  }, [parts, sites, currentUser, currentUserAccount, appendAudit]);

  // Admin approves spare part ordering
  const approveSparePartOrder = useCallback(async (partRequestId: string) => {
    setSparePartRequests((prev) =>
      prev.map((pr) => {
        if (pr.id !== partRequestId) return pr;
        return {
          ...pr,
          status: 'Approved & Ordered',
          approvedAt: new Date().toISOString(),
          approvedBy: currentUser.name,
        };
      })
    );

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        timestamp: new Date().toISOString(),
        title: 'Spare Part Order Approved',
        message: `Admin approved purchase order for request ${partRequestId}. Order placed with vendor.`,
        type: 'success',
        read: false,
      },
      ...prev,
    ]);

    await appendAudit('SPARE_PART_ORDER_APPROVED', partRequestId, 'Part', {
      approvedBy: currentUser.name,
    });
  }, [currentUser, appendAudit]);

  // Admin approves spare part stocking/inventory update
  const approveSparePartStocking = useCallback(async (partRequestId: string) => {
    const partReq = sparePartRequests.find((p) => p.id === partRequestId);
    if (!partReq) return;

    setSparePartRequests((prev) =>
      prev.map((pr) => (pr.id === partRequestId ? { ...pr, status: 'Stocked' } : pr))
    );

    setParts((prevParts) =>
      prevParts.map((p) => {
        if (p.id === partReq.partId || p.sku === partReq.partSku) {
          return { ...p, inStock: p.inStock + partReq.quantity };
        }
        return p;
      })
    );

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        timestamp: new Date().toISOString(),
        title: 'Inventory Stocked & Verified',
        message: `${partReq.quantity}x ${partReq.partSku} received and updated in warehouse stock.`,
        type: 'success',
        read: false,
      },
      ...prev,
    ]);

    await appendAudit('SPARE_PART_STOCKED', partReq.partSku, 'Part', {
      quantity: partReq.quantity,
      approvedBy: currentUser.name,
    });
  }, [sparePartRequests, currentUser, appendAudit]);

  // Admin rejects spare part requisition
  const rejectSparePartRequest = useCallback(async (partRequestId: string, reason?: string) => {
    setSparePartRequests((prev) =>
      prev.map((pr) =>
        pr.id === partRequestId
          ? {
              ...pr,
              status: 'Rejected',
            }
          : pr
      )
    );

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        timestamp: new Date().toISOString(),
        title: 'Spare Part Requisition Rejected',
        message: `Admin rejected requisition ${partRequestId}. ${reason ? `Reason: ${reason}` : ''}`,
        type: 'warning',
        read: false,
      },
      ...prev,
    ]);

    await appendAudit('SPARE_PART_REQUISITION_REJECTED', partRequestId, 'Part', {
      rejectedBy: currentUser.name,
      reason: reason || 'Requisition declined by Admin',
    });
  }, [currentUser, appendAudit]);

  // Admin approves technician spare-part request with stock deduction & verification
  const approveTechnicianPartRequest = useCallback(async (partRequestId: string): Promise<{ success: boolean; error?: string }> => {
    const partReq = sparePartRequests.find((p) => p.id === partRequestId);
    if (!partReq) return { success: false, error: 'Part request not found' };

    const part = parts.find((p) => p.id === partReq.partId || p.sku === partReq.partSku);
    if (!part) return { success: false, error: 'Spare part not found in inventory catalog' };

    const available = part.inStock - part.reserved;
    if (available < partReq.quantity) {
      return {
        success: false,
        error: `Insufficient stock: Requested ${partReq.quantity} units, but only ${Math.max(0, available)} available in stock.`,
      };
    }

    // Deduct stock and record reservation
    setParts((prevParts) =>
      prevParts.map((p) => {
        if (p.id === part.id) {
          const newStock = Math.max(0, p.inStock - partReq.quantity);
          return { ...p, inStock: newStock };
        }
        return p;
      })
    );

    // Update request status
    setSparePartRequests((prev) =>
      prev.map((pr) =>
        pr.id === partRequestId
          ? {
              ...pr,
              status: 'Approved & Ordered',
              approvedAt: new Date().toISOString(),
              approvedBy: currentUser.name,
            }
          : pr
      )
    );

    // If associated with a service request, sync required parts
    if (partReq.requestId) {
      setRequests((prevReqs) =>
        prevReqs.map((r) => {
          if (r.id === partReq.requestId) {
            const existing = r.requiredParts || [];
            const hasPart = existing.some((p) => p.partId === part.id || p.partName === part.name);
            return {
              ...r,
              requiredParts: hasPart
                ? existing
                : [...existing, { partId: part.id, partName: part.name, quantity: partReq.quantity }],
            };
          }
          return r;
        })
      );
    }

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        timestamp: new Date().toISOString(),
        title: 'Spare Part Request Approved',
        message: `Admin approved ${partReq.quantity}x ${part.name} for ${partReq.technicianName}. Stock reduced.`,
        type: 'success',
        read: false,
      },
      ...prev,
    ]);

    await appendAudit('SPARE_PART_REQUEST_APPROVED', partRequestId, 'Part', {
      partSku: part.sku,
      quantity: partReq.quantity,
      technician: partReq.technicianName,
      remainingStock: Math.max(0, part.inStock - partReq.quantity),
      approvedBy: currentUser.name,
    });

    return { success: true };
  }, [sparePartRequests, parts, currentUser, appendAudit]);

  // Admin adds a new spare part
  const addSparePart = useCallback(async (partData: Omit<SparePart, 'id'>): Promise<SparePart> => {
    const newId = `part-${Date.now().toString().slice(-4)}`;
    const newPart: SparePart = {
      ...partData,
      id: newId,
      reserved: partData.reserved || 0,
    };

    setParts((prev) => [newPart, ...prev]);

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        timestamp: new Date().toISOString(),
        title: 'Spare Part Added',
        message: `${newPart.name} (${newPart.sku}) added to inventory.`,
        type: 'success',
        read: false,
      },
      ...prev,
    ]);

    await appendAudit('SPARE_PART_ADDED', newPart.sku, 'Part', {
      name: newPart.name,
      inStock: newPart.inStock,
      unitCost: newPart.unitCost,
      siteName: newPart.siteName,
    });

    return newPart;
  }, [appendAudit]);

  // Admin edits an existing spare part
  const updateSparePart = useCallback(async (partId: string, updates: Partial<SparePart>) => {
    setParts((prev) =>
      prev.map((p) => {
        if (p.id === partId) {
          const updated = { ...p, ...updates };
          if (updated.inStock !== undefined && updated.inStock < 0) {
            updated.inStock = 0;
          }
          return updated;
        }
        return p;
      })
    );

    await appendAudit('SPARE_PART_UPDATED', partId, 'Part', updates);
  }, [appendAudit]);

  // Admin removes a spare part from inventory
  const deleteSparePart = useCallback(async (partId: string) => {
    const target = parts.find((p) => p.id === partId);
    setParts((prev) => prev.filter((p) => p.id !== partId));

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        timestamp: new Date().toISOString(),
        title: 'Spare Part Removed',
        message: `${target ? target.name : partId} removed from inventory catalog.`,
        type: 'warning',
        read: false,
      },
      ...prev,
    ]);

    await appendAudit('SPARE_PART_REMOVED', target ? target.sku : partId, 'Part', {
      deletedPartId: partId,
      name: target?.name,
    });
  }, [parts, appendAudit]);

  // Admin adjusts spare part stock quantity (+ or -)
  const adjustSparePartStock = useCallback(async (partId: string, delta: number) => {
    let partSku = '';
    let oldStock = 0;
    let newStock = 0;

    setParts((prev) =>
      prev.map((p) => {
        if (p.id === partId) {
          partSku = p.sku;
          oldStock = p.inStock;
          newStock = Math.max(0, p.inStock + delta);
          return { ...p, inStock: newStock };
        }
        return p;
      })
    );

    await appendAudit('SPARE_PART_STOCK_ADJUSTED', partSku || partId, 'Part', {
      delta,
      oldStock,
      newStock,
    });
  }, [appendAudit]);

  // Admin verifies technician (Unverified -> Verified)
  const verifyTechnician = useCallback(async (techId: string, verified: boolean) => {
    const tech = technicians.find((t) => t.id === techId);
    setTechnicians((prev) =>
      prev.map((t) => (t.id === techId ? { ...t, isVerified: verified } : t))
    );
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.technicianId === techId || acc.id === techId) {
          return {
            ...acc,
            isVerified: verified,
            verificationStatus: verified ? 'verified' : 'rejected',
          };
        }
        return acc;
      })
    );

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        timestamp: new Date().toISOString(),
        title: `Technician Verification: ${tech?.name || techId}`,
        message: verified
          ? `${tech?.name || techId} has been officially verified by Admin and is authorized to sign in and accept dispatches.`
          : `Verification revoked for ${tech?.name || techId}. Account locked from dispatch and field login.`,
        type: verified ? 'success' : 'danger',
        read: false,
      },
      ...prev,
    ]);

    await appendAudit('TECHNICIAN_VERIFICATION_UPDATED', techId, 'Technician', {
      technicianName: tech?.name,
      verified,
      verifiedBy: currentUser.name,
    });
  }, [technicians, currentUser, appendAudit]);

  // Upload document / photo / service report
  const uploadServiceDocument = useCallback((requestId: string, doc: {
    name: string;
    url: string;
    type: 'photo' | 'report' | 'schematic' | 'compliance';
    caption?: string;
    fileSize?: string;
  }) => {
    const newDoc: ServiceDocument = {
      id: `doc-${Date.now()}`,
      name: doc.name,
      url: doc.url,
      type: doc.type,
      uploadedAt: new Date().toISOString(),
      uploadedBy: currentUser.name,
      caption: doc.caption,
      fileSize: doc.fileSize || '1.5 MB',
    };

    setRequests((prev) =>
      prev.map((r) => {
        if (r.id !== requestId) return r;
        return {
          ...r,
          documents: [...r.documents, newDoc],
          updatedAt: new Date().toISOString(),
        };
      })
    );

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        timestamp: new Date().toISOString(),
        title: `Document Uploaded: ${doc.name}`,
        message: `Field document (${doc.type}) attached to ${requestId} by ${currentUser.name}.`,
        type: 'info',
        read: false,
        requestId,
      },
      ...prev,
    ]);
  }, [currentUser]);

  // Submit Completion Report
  const submitCompletionReport = useCallback(async (
    requestId: string,
    report: {
      hoursSpent: number;
      workSummary: string;
      partsUsed: string[];
      finalVibrationRms?: number;
      finalTempC?: number;
      technicianNotes: string;
    }
  ): Promise<{ success: boolean; error?: string }> => {
    const req = requests.find((r) => r.id === requestId);
    if (!req) return { success: false, error: 'Request not found' };

    const compReport: CompletionReport = {
      completedAt: new Date().toISOString(),
      hoursSpent: report.hoursSpent,
      workSummary: report.workSummary,
      partsUsed: report.partsUsed,
      finalVibrationRms: report.finalVibrationRms,
      finalTempC: report.finalTempC,
      technicianNotes: report.technicianNotes,
    };

    setRequests((prev) =>
      prev.map((r) => {
        if (r.id !== requestId) return r;
        return {
          ...r,
          status: 'Completed',
          serviceProgressStage: 'Completed',
          completionNotes: report.workSummary,
          completionReport: compReport,
          history: [
            ...r.history,
            {
              status: 'Completed',
              timestamp: new Date().toISOString(),
              changedBy: currentUser.name,
              changedByRole: 'Technician',
              notes: `Field completion information submitted. Awaiting Admin verification.`,
            },
          ],
          updatedAt: new Date().toISOString(),
        };
      })
    );

    // Free technician capacity
    if (req.assignedTechnicianId) {
      setTechnicians((prev) =>
        prev.map((t) =>
          t.id === req.assignedTechnicianId
            ? {
                ...t,
                activeLoad: Math.max(0, t.activeLoad - 1),
                status: 'Available',
                totalCompletedJobs: t.totalCompletedJobs + 1,
              }
            : t
        )
      );
    }

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        timestamp: new Date().toISOString(),
        title: `Service Completed: ${requestId}`,
        message: `Technician submitted full completion report. Ready for Admin sign-off and verification.`,
        type: 'warning',
        read: false,
        requestId,
      },
      ...prev,
    ]);

    await appendAudit('SERVICE_COMPLETION_SUBMITTED', requestId, 'ServiceRequest', {
      workSummary: report.workSummary,
      hoursSpent: report.hoursSpent,
      partsUsed: report.partsUsed,
    });

    return { success: true };
  }, [requests, currentUser, appendAudit]);

  // Admin verifies service completion
  const verifyServiceCompletion = useCallback(async (requestId: string): Promise<{ success: boolean; error?: string }> => {
    const req = requests.find((r) => r.id === requestId);
    if (!req) return { success: false, error: 'Request not found' };

    setRequests((prev) =>
      prev.map((r) => {
        if (r.id !== requestId) return r;
        return {
          ...r,
          status: 'Verified',
          serviceProgressStage: 'Verified',
          completionReport: r.completionReport
            ? {
                ...r.completionReport,
                verifiedAt: new Date().toISOString(),
                verifiedBy: currentUser.name,
              }
            : undefined,
          history: [
            ...r.history,
            {
              status: 'Verified',
              timestamp: new Date().toISOString(),
              changedBy: currentUser.name,
              changedByRole: 'Admin',
              notes: `Admin completed technical audit of service report, photos, and checklist. Approved & Verified.`,
            },
          ],
          updatedAt: new Date().toISOString(),
        };
      })
    );

    // Update machine status back to Operational
    setMachines((prev) =>
      prev.map((m) =>
        m.id === req.machineId
          ? {
              ...m,
              status: 'Operational',
              telemetry: {
                ...m.telemetry,
                vibrationRms: 0.82,
                bearingTempC: 38.4,
                lastPing: 'Just now',
              },
            }
          : m
      )
    );

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        timestamp: new Date().toISOString(),
        title: `Service Verified & Closed: ${requestId}`,
        message: `Machine ${req.machineId} returned to service. Customer can now review service experience.`,
        type: 'success',
        read: false,
        requestId,
      },
      ...prev,
    ]);

    await appendAudit('SERVICE_VERIFIED_AND_CLOSED', requestId, 'ServiceRequest', {
      verifiedBy: currentUser.name,
      machineId: req.machineId,
    });

    return { success: true };
  }, [requests, currentUser, appendAudit]);

  // Customer Feedback & Technician Restriction System
  const submitCustomerFeedback = useCallback(async (
    requestId: string,
    feedback: {
      rating: number;
      isDissatisfied: boolean;
      complaintReason?: string;
      comments: string;
    }
  ): Promise<{ success: boolean; restrictionCreated: boolean }> => {
    const req = requests.find((r) => r.id === requestId);
    if (!req) return { success: false, restrictionCreated: false };

    const techId = req.assignedTechnicianId || 'tech-01';
    const tech = technicians.find((t) => t.id === techId);
    const customerName = currentUser.name;

    const isDissatisfied = Boolean(feedback.isDissatisfied || feedback.rating <= 2);
    const customerId = req.customerId || currentUserAccount.id || req.siteId;
    const siteId = req.siteId;

    const newFeedback: CustomerFeedback = {
      id: `fb-${Date.now()}`,
      requestId,
      siteId,
      customerId,
      customerName,
      technicianId: techId,
      technicianName: tech ? tech.name : 'Assigned Technician',
      rating: feedback.rating,
      isDissatisfied,
      complaintReason: feedback.complaintReason || (isDissatisfied ? 'Service dissatisfaction reported by customer' : undefined),
      comments: feedback.comments,
      createdAt: new Date().toISOString(),
      status: 'Open',
      restrictionCreated: isDissatisfied,
    };

    setCustomerFeedbacks((prev) => [newFeedback, ...prev]);

    // Attach to request
    setRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? { ...r, customerFeedback: newFeedback, status: 'Closed' }
          : r
      )
    );

    // CRITICAL REQUIREMENT: If dissatisfied, permanently restrict technician from this customer!
    // Note: Technician is NOT removed from entire system; they remain eligible for other customers.
    if (isDissatisfied && tech) {
      setTechnicians((prev) =>
        prev.map((t) => {
          if (t.id !== techId) return t;
          const currentRestricted = t.restrictedCustomerIds || [];
          const updatedRestricted = [...currentRestricted];
          if (siteId && !updatedRestricted.includes(siteId)) {
            updatedRestricted.push(siteId);
          }
          if (customerId && !updatedRestricted.includes(customerId)) {
            updatedRestricted.push(customerId);
          }
          return {
            ...t,
            restrictedCustomerIds: updatedRestricted,
          };
        })
      );

      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          timestamp: new Date().toISOString(),
          title: `TECHNICIAN RESTRICTION ACTIVE: ${tech.name}`,
          message: `Customer ${customerName} filed dissatisfaction complaint. ${tech.name} is permanently restricted from future assignments to ${req.siteName}. Remains available for other customers.`,
          type: 'danger',
          read: false,
          requestId,
        },
        ...prev,
      ]);

      await appendAudit('TECHNICIAN_CUSTOMER_RESTRICTION_CREATED', techId, 'Technician', {
        technicianName: tech.name,
        siteId,
        customerId,
        siteName: req.siteName,
        customerName,
        reason: newFeedback.complaintReason,
        rating: feedback.rating,
      });

      return { success: true, restrictionCreated: true };
    }

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        timestamp: new Date().toISOString(),
        title: `Customer Rating Received: ${feedback.rating} Stars`,
        message: `Customer ${customerName} rated service for ${req.machineId}.`,
        type: 'success',
        read: false,
        requestId,
      },
      ...prev,
    ]);

    await appendAudit('CUSTOMER_FEEDBACK_RECORDED', requestId, 'Feedback', {
      rating: feedback.rating,
      customerName,
    });

    return { success: true, restrictionCreated: false };
  }, [requests, technicians, currentUser, currentUserAccount, appendAudit]);

  // Admin removes customer restriction
  const removeTechnicianRestriction = useCallback(async (techId: string, siteIdOrCustomerId: string) => {
    setTechnicians((prev) =>
      prev.map((t) => {
        if (t.id !== techId) return t;
        return {
          ...t,
          restrictedCustomerIds: (t.restrictedCustomerIds || []).filter((s) => s !== siteIdOrCustomerId),
        };
      })
    );

    setCustomerFeedbacks((prev) =>
      prev.map((fb) =>
        fb.technicianId === techId && (fb.siteId === siteIdOrCustomerId || fb.customerId === siteIdOrCustomerId)
          ? { ...fb, restrictionCreated: false }
          : fb
      )
    );

    await appendAudit('TECHNICIAN_RESTRICTION_REMOVED', techId, 'Technician', {
      siteId: siteIdOrCustomerId,
      removedBy: currentUser.name,
    });
  }, [currentUser, appendAudit]);

  // Admin updates/resets a technician or user account password directly
  const updateAccountPassword = useCallback(
    async (accountId: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
      if (!newPassword || newPassword.trim().length < 4) {
        return { success: false, error: 'Password must be at least 4 characters long.' };
      }
      const target = accounts.find((a) => a.id === accountId);
      if (!target) {
        return { success: false, error: `Account with ID ${accountId} not found.` };
      }

      setAccounts((prev) =>
        prev.map((acc) => (acc.id === accountId ? { ...acc, password: newPassword.trim() } : acc))
      );

      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          timestamp: new Date().toISOString(),
          title: `Credentials Updated: ${target.name} (${target.id})`,
          message: `Admin ${currentUser.name} reset password for ${target.name}. New credentials are live immediately.`,
          type: 'info',
          read: false,
        },
        ...prev,
      ]);

      await appendAudit('ADMIN_PASSWORD_OVERRIDE', target.id, 'UserAccount', {
        accountName: target.name,
        role: target.role,
        updatedBy: currentUser.name,
        timestamp: new Date().toISOString(),
      });

      return { success: true };
    },
    [accounts, currentUser, appendAudit]
  );

  // Admin resolves complaint
  const resolveCustomerComplaint = useCallback(async (feedbackId: string) => {
    setCustomerFeedbacks((prev) =>
      prev.map((fb) => (fb.id === feedbackId ? { ...fb, status: 'Resolved' } : fb))
    );
  }, []);

  // Customer raises service request
  const submitCustomerRequest = useCallback(async (data: {
    machineId: string;
    title: string;
    description: string;
    priority: any;
    customerAddress?: string;
    customerCoords?: Coordinates;
    requiredSkills?: string[];
    requiredParts?: { partId: string; partName: string; quantity: number }[];
  }): Promise<{ success: boolean; id?: string; error?: string }> => {
    const siteId = currentUserAccount.siteId || 'site-a';
    const site = sites.find((s) => s.id === siteId) || sites[0];
    const machine = machines.find((m) => m.id === data.machineId);
    if (!machine) return { success: false, error: 'Machine not found.' };

    // Resolve address and coordinates: if address is text only, geocode to coordinates and store
    let resolvedCoords: Coordinates = site.coords;
    let resolvedAddress = site.address ? `${site.address}, ${site.city}` : site.name;

    if (data.customerCoords && typeof data.customerCoords.lat === 'number' && typeof data.customerCoords.lng === 'number') {
      resolvedCoords = data.customerCoords;
      resolvedAddress = data.customerAddress || resolvedAddress;
    } else if (data.customerAddress && data.customerAddress.trim()) {
      resolvedAddress = data.customerAddress.trim();
      try {
        const geoResult = await geocodeAddress(resolvedAddress);
        resolvedCoords = { lat: geoResult.lat, lng: geoResult.lng };
        if (geoResult.formattedAddress) {
          resolvedAddress = geoResult.formattedAddress;
        }
      } catch (err) {
        console.warn('Geocoding error in submitCustomerRequest, using default site coords:', err);
      }
    }

    const newId = `SR-${Math.floor(1050 + Math.random() * 899)}`;
    const newReq: ServiceRequest = {
      id: newId,
      title: data.title,
      description: data.description,
      machineId: machine.id,
      siteId: site.id,
      siteName: site.name,
      customerId: currentUserAccount.id,
      customerContactPerson: currentUser.name,
      customerContactPhone: currentUserAccount.phone,
      customerAddress: resolvedAddress,
      customerCoords: resolvedCoords,
      priority: data.priority,
      bookingStatus: 'Booked',
      status: 'Validated',
      serviceProgressStage: 'Requested',
      slaDeadline: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      requiredSkills: data.requiredSkills || ['Spindle Overhaul', 'Vibration Analysis'],
      requiredParts: data.requiredParts || [],
      checklist: [
        { id: 'c1', label: 'Verify electrical LOTO lockout per Indian factory safety standard', completed: false },
        { id: 'c2', label: 'Inspect internal mechanical tolerances and runout', completed: false },
        { id: 'c3', label: 'Execute full sensor telemetry calibration', completed: false },
      ],
      documents: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdByRole: 'Customer',
      history: [
        {
          status: 'Draft',
          timestamp: new Date().toISOString(),
          changedBy: currentUser.name,
          changedByRole: 'Customer',
          notes: 'Customer raised new service request via portal.',
        },
      ],
      frozenWindow: false,
    };

    // Calculate pre-flight score and rank eligible candidates
    const { ranked } = rankEligibleTechnicians(newReq, site, technicians, parts);
    if (ranked.length > 0) {
      const top = ranked[0];
      newReq.offeredTechnicianId = top.technician.id;
      newReq.offerExpiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      newReq.offeredAt = new Date().toISOString();
      newReq.status = 'Assigned';
      newReq.serviceProgressStage = 'Assigned';
      newReq.preFlightScore = {
        totalScore: top.totalScore,
        breakdown: top.breakdown,
        explanation: `Top verified specialist ${top.technician.name} matched. Dispatched with 5-minute acceptance timer.`,
        recommendedTechId: top.technician.id,
        recommendedTechName: top.technician.name,
      };
    } else {
      newReq.preFlightScore = calculatePreFlightScore(newReq, site, technicians, parts);
    }

    setRequests((prev) => [newReq, ...prev]);
    setSelectedRequestId(newId);

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        timestamp: new Date().toISOString(),
        title: `Service Requested: ${newId}`,
        message: `${data.title} raised at ${site.name}. 5-minute technician offer active.`,
        type: 'info',
        read: false,
        requestId: newId,
      },
      ...prev,
    ]);

    await appendAudit('CUSTOMER_SERVICE_REQUEST_CREATED', newId, 'ServiceRequest', {
      title: data.title,
      machineId: machine.id,
      priority: data.priority,
      offeredTechId: newReq.offeredTechnicianId,
    });

    return { success: true, id: newId };
  }, [currentUserAccount, sites, machines, currentUser, technicians, parts, appendAudit]);

  // General Status Transition with validation
  const transitionRequest = useCallback(
    async (
      requestId: string,
      targetStatus: RequestStatus,
      notes?: string
    ): Promise<{ success: boolean; error?: string }> => {
      const req = requests.find((r) => r.id === requestId);
      if (!req) return { success: false, error: 'Request not found' };

      const validation = validateTransition(req, targetStatus, currentUser.role);
      if (!validation.allowed) {
        return { success: false, error: validation.reason };
      }

      // Customer Dissatisfaction Rule Guard: Assigned technician must NOT be restricted from this customer
      if ((targetStatus === 'Assigned' || targetStatus === 'Approved') && req.assignedTechnicianId) {
        const assignedTech = technicians.find((t) => t.id === req.assignedTechnicianId);
        if (assignedTech?.restrictedCustomerIds) {
          const isRestricted =
            assignedTech.restrictedCustomerIds.includes(req.siteId) ||
            (req.customerId && assignedTech.restrictedCustomerIds.includes(req.customerId));
          if (isRestricted) {
            return {
              success: false,
              error: `Technician ${assignedTech.name} cannot be assigned to this customer (${req.siteName}): Permanent restriction recorded due to past customer dissatisfaction complaint.`,
            };
          }
        }
      }

      setRequests((prevReqs) =>
        prevReqs.map((r) => {
          if (r.id !== requestId) return r;
          const newHistory = [
            ...r.history,
            {
              status: targetStatus,
              timestamp: new Date().toISOString(),
              changedBy: currentUser.name,
              changedByRole: currentUser.role,
              notes: notes || `Status changed to ${targetStatus}`,
            },
          ];

          return {
            ...r,
            status: targetStatus,
            previousStatus: r.status,
            frozenWindow: targetStatus === 'In Progress',
            history: newHistory,
            updatedAt: new Date().toISOString(),
          };
        })
      );

      await appendAudit('REQUEST_STATUS_CHANGED', requestId, 'ServiceRequest', {
        fromStatus: req.status,
        toStatus: targetStatus,
        notes,
      });

      return { success: true };
    },
    [requests, currentUser, appendAudit]
  );

  // Recovery Plan Execution
  const executeRecoveryPlan = useCallback(
    async (requestId: string, replacementTechId: string, transferPartSku?: string): Promise<boolean> => {
      const req = requests.find((r) => r.id === requestId);
      const replacementTech = technicians.find((t) => t.id === replacementTechId);
      if (!req || !replacementTech) return false;

      // Customer Dissatisfaction Guard: Block replacement if restricted from this customer
      const isRestricted = Boolean(
        replacementTech.restrictedCustomerIds && (
          replacementTech.restrictedCustomerIds.includes(req.siteId) ||
          (req.customerId && replacementTech.restrictedCustomerIds.includes(req.customerId))
        )
      );
      if (isRestricted) {
        return false;
      }

      // Part Transfer if specified
      if (transferPartSku) {
        setParts((prevParts) =>
          prevParts.map((p) => {
            if (p.sku === transferPartSku && p.siteId === 'site-b') {
              return { ...p, inStock: Math.max(0, p.inStock - 1) };
            }
            if (p.sku === transferPartSku && p.siteId === req.siteId) {
              return { ...p, inStock: p.inStock + 1 };
            }
            return p;
          })
        );
      }

      // Reassign to replacement technician with 5-minute timer
      setRequests((prev) =>
        prev.map((r) => {
          if (r.id !== requestId) return r;
          return {
            ...r,
            status: 'Assigned',
            serviceProgressStage: 'Assigned',
            assignedTechnicianId: replacementTechId,
            offeredTechnicianId: undefined,
            offerExpiresAt: undefined,
            conflictState: undefined,
            history: [
              ...r.history,
              {
                status: 'Assigned',
                timestamp: new Date().toISOString(),
                changedBy: 'Autonomous Conflict Recovery',
                changedByRole: 'Admin',
                notes: `Dispatched ${replacementTech.name}. Parts transferred.`,
              },
            ],
            updatedAt: new Date().toISOString(),
          };
        })
      );

      setTechnicians((prev) =>
        prev.map((t) =>
          t.id === replacementTechId
            ? { ...t, activeLoad: t.activeLoad + 1, status: 'En Route' }
            : t
        )
      );

      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          timestamp: new Date().toISOString(),
          title: `Recovery Executed on ${requestId}`,
          message: `${replacementTech.name} dispatched with hot-shot parts delivery. Conflict resolved.`,
          type: 'success',
          read: false,
          requestId,
        },
        ...prev,
      ]);

      await appendAudit('RECOVERY_PLAN_EXECUTED', requestId, 'ServiceRequest', {
        replacementTechId,
        replacementTechName: replacementTech.name,
        transferPartSku,
      });

      return true;
    },
    [requests, technicians, appendAudit]
  );

  // Trigger Simulated IoT Alert
  const triggerSimulatedIotAlert = useCallback(async (machineId: string = 'M-104'): Promise<string> => {
    setMachines((prev) =>
      prev.map((m) =>
        m.id === machineId
          ? {
              ...m,
              status: 'Critical Fault',
              telemetry: {
                ...m.telemetry,
                vibrationRms: 8.45,
                bearingTempC: 86.2,
                lastPing: 'Just now',
              },
            }
          : m
      )
    );

    const alertId = `notif-${Date.now()}`;
    setNotifications((prev) => [
      {
        id: alertId,
        timestamp: new Date().toISOString(),
        title: `IoT Alert: ${machineId} Threshold Exceeded`,
        message: `High-frequency vibration 8.45 mm/s detected on ${machineId}. Immediate maintenance required.`,
        type: 'danger',
        read: false,
        requestId: 'SR-1040',
      },
      ...prev,
    ]);

    await appendAudit('IOT_TELEMETRY_ALERT', machineId, 'Machine', {
      vibrationRms: 8.45,
      bearingTempC: 86.2,
    });

    return alertId;
  }, [appendAudit]);

  // Simulate Technician Dropout
  const simulateTechnicianDropout = useCallback(async (techId: string) => {
    const tech = technicians.find((t) => t.id === techId);
    setTechnicians((prev) =>
      prev.map((t) => (t.id === techId ? { ...t, status: 'Dropped Out' } : t))
    );

    // Trigger cascade for any active requests
    const activeReqs = requests.filter((r) => r.assignedTechnicianId === techId || r.offeredTechnicianId === techId);
    for (const r of activeReqs) {
      await cascadeOfferToNextTechnician(r.id);
    }
  }, [technicians, requests, cascadeOfferToNextTechnician]);

  // Update Checklist
  const updateChecklistItem = useCallback((requestId: string, checklistId: string, completed: boolean) => {
    setRequests((prev) =>
      prev.map((r) => {
        if (r.id !== requestId) return r;
        return {
          ...r,
          checklist: r.checklist.map((c) => (c.id === checklistId ? { ...c, completed } : c)),
          updatedAt: new Date().toISOString(),
        };
      })
    );
  }, []);

  // Verify Audit Ledger
  const verifyAuditLedger = useCallback(async () => {
    return await verifyAuditChain(auditLog);
  }, [auditLog]);

  // Transfer Part
  const transferPartBetweenSites = useCallback(async (partSku: string, fromSiteId: string, toSiteId: string, qty: number) => {
    setParts((prevParts) =>
      prevParts.map((p) => {
        if (p.sku === partSku && p.siteId === fromSiteId) return { ...p, inStock: Math.max(0, p.inStock - qty) };
        if (p.sku === partSku && p.siteId === toSiteId) return { ...p, inStock: p.inStock + qty };
        return p;
      })
    );

    await appendAudit('PART_TRANSFERRED', partSku, 'Part', { fromSiteId, toSiteId, qty });
  }, [appendAudit]);

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // Demo walkthrough steps
  const runDemoStep = useCallback(async (step: number) => {
    setDemoStep(step);
    setSelectedRequestId('SR-1040');

    if (step === 1) {
      setMachines((prev) =>
        prev.map((m) =>
          m.id === 'M-104'
            ? { ...m, status: 'Critical Fault', telemetry: { ...m.telemetry, vibrationRms: 7.82, bearingTempC: 84.1 } }
            : m
        )
      );
      setRequests((prev) =>
        prev.map((r) => (r.id === 'SR-1040' ? { ...r, status: 'Validated', assignedTechnicianId: undefined, conflictState: undefined } : r))
      );
    } else if (step === 2) {
      setRequests((prev) =>
        prev.map((r) =>
          r.id === 'SR-1040'
            ? {
                ...r,
                status: 'Pending Approval',
                preFlightScore: {
                  totalScore: 42,
                  breakdown: { skillMatch: 35, partsAvailability: 0, distanceScore: 4, loadScore: 3 },
                  explanation: 'Readiness evaluated at 42/100: Ceramic Bearing BRG-CERAMIC-88 is 0 in local Peenya stock.',
                  recommendedTechId: 'tech-02',
                  recommendedTechName: 'Priya Patel',
                },
              }
            : r
        )
      );
    } else if (step === 3) {
      setRequests((prev) =>
        prev.map((r) =>
          r.id === 'SR-1040'
            ? {
                ...r,
                status: 'Assigned',
                assignedTechnicianId: 'tech-01',
                offeredTechnicianId: undefined,
                conflictState: undefined,
              }
            : r
        )
      );
    } else if (step === 4) {
      setTechnicians((prev) =>
        prev.map((t) => (t.id === 'tech-01' ? { ...t, status: 'Dropped Out' } : t))
      );
      setRequests(SEED_REQUESTS);
    } else if (step === 5) {
      await executeRecoveryPlan('SR-1040', 'tech-02', 'BRG-CERAMIC-88');
      setTimeout(() => {
        setRequests((prev) =>
          prev.map((r) =>
            r.id === 'SR-1040'
              ? {
                  ...r,
                  status: 'Verified',
                  serviceProgressStage: 'Verified',
                  checklist: r.checklist.map((c) => ({ ...c, completed: true })),
                  completionNotes: 'All verification tasks signed off by Admin. Spindle laser runout 0.8 µm verified in Peenya cleanroom.',
                }
              : r
          )
        );
      }, 1200);
    }
  }, [executeRecoveryPlan]);

  const resetDemoScenario = () => {
    setMachines(SEED_MACHINES);
    setParts(SEED_PARTS);
    setTechnicians(SEED_TECHNICIANS);
    setRequests(SEED_REQUESTS);
    setSparePartRequests(SEED_PARTS_REQUESTS);
    setCustomerFeedbacks(SEED_FEEDBACKS);
    setDemoStep(4);
    setSelectedRequestId('SR-1040');
  };

  const addDocumentToRequest = useCallback(
    (requestId: string, doc: { name: string; url: string; caption?: string; type?: any }) => {
      uploadServiceDocument(requestId, {
        name: doc.name,
        url: doc.url,
        caption: doc.caption,
        type: doc.type || 'photo',
      });
    },
    [uploadServiceDocument]
  );

  const createRequest = useCallback(
    async (newReqData: Partial<ServiceRequest>): Promise<{ success: boolean; id?: string; error?: string }> => {
      return await submitCustomerRequest({
        machineId: newReqData.machineId || 'M-104',
        title: newReqData.title || 'Service Request',
        description: newReqData.description || 'Equipment servicing requested.',
        priority: newReqData.priority || 'P2 - High',
        customerAddress: newReqData.customerAddress,
        customerCoords: newReqData.customerCoords,
        requiredSkills: newReqData.requiredSkills,
        requiredParts: newReqData.requiredParts,
      });
    },
    [submitCustomerRequest]
  );

  return (
    <ServiceSyncContext.Provider
      value={{
        currentUserAccount,
        login,
        logout,
        currentRole,
        currentUser,
        accounts,
        sites,
        machines,
        parts,
        technicians,
        requests,
        sparePartRequests,
        customerFeedbacks,
        auditLog,
        notifications,
        selectedRequestId,
        setSelectedRequestId,
        activeView,
        setActiveView,
        isCreateModalOpen,
        setIsCreateModalOpen,
        isRecoveryModalOpen,
        setIsRecoveryModalOpen,
        isCopilotOpen,
        setIsCopilotOpen,
        demoStep,
        setDemoStep,
        runDemoStep,
        scopedRequests,
        getOfferRemainingSeconds,
        acceptServiceOffer,
        declineServiceOffer,
        cascadeOfferToNextTechnician,
        updateBookingStatus,
        updateServiceProgress,
        raiseSparePartRequest,
        uploadServiceDocument,
        submitCompletionReport,
        verifyTechnician,
        updateAccountPassword,
        createAccount,
        resetPassword,
        approveSparePartOrder,
        approveSparePartStocking,
        rejectSparePartRequest,
        approveTechnicianPartRequest,
        addSparePart,
        updateSparePart,
        deleteSparePart,
        adjustSparePartStock,
        verifyServiceCompletion,
        removeTechnicianRestriction,
        resolveCustomerComplaint,
        submitCustomerRequest,
        submitCustomerFeedback,
        addDocumentToRequest,
        createRequest,
        transitionRequest,
        executeRecoveryPlan,
        triggerSimulatedIotAlert,
        simulateTechnicianDropout,
        updateChecklistItem,
        verifyAuditLedger,
        transferPartBetweenSites,
        markNotificationAsRead,
        clearAllNotifications,
        resetDemoScenario,
      }}
    >
      {children}
    </ServiceSyncContext.Provider>
  );
};

export const useServiceSync = () => {
  const context = useContext(ServiceSyncContext);
  if (!context) {
    throw new Error('useServiceSync must be used within a ServiceSyncProvider');
  }
  return context;
};
