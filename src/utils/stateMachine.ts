import { RequestStatus, UserRole, ServiceRequest } from '../types';

export interface TransitionValidation {
  allowed: boolean;
  reason?: string;
}

// Strict map of allowed status transitions
export const ALLOWED_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  Draft: ['Validated', 'Closed'],
  Validated: ['Pending Approval', 'Draft', 'Approved', 'Assigned'],
  'Pending Approval': ['Approved', 'Validated', 'Exception', 'Assigned'],
  Approved: ['Assigned', 'Exception'],
  Assigned: ['In Progress', 'Reassigning', 'Exception'],
  'In Progress': ['Completed', 'Exception'], // Frozen window! Reassigning is blocked
  Completed: ['Verified', 'In Progress', 'Exception', 'Closed'],
  Verified: ['Closed', 'Completed'],
  Closed: [],
  Exception: ['Reassigning', 'Assigned', 'Closed'],
  Reassigning: ['Assigned', 'Approved', 'Exception'],
};

// Strict Role-based permissions per action transition (Admin, Technician, Customer)
export const ROLE_TRANSITION_PERMISSIONS: Record<RequestStatus, UserRole[]> = {
  Draft: ['Customer', 'Admin'],
  Validated: ['Customer', 'Admin'],
  'Pending Approval': ['Customer', 'Admin'],
  Approved: ['Admin'], // Only Admin can formally approve
  Assigned: ['Admin', 'Technician'], // Technician can accept, Admin can dispatch
  'In Progress': ['Technician', 'Admin'], // Only assigned tech or admin can start work
  Completed: ['Technician', 'Admin'], // Technician submits completion
  Verified: ['Admin'], // Admin verifies completion & uploaded documents
  Closed: ['Customer', 'Admin'],
  Exception: ['Technician', 'Admin'], // Tech can flag emergency, Admin can flag exception
  Reassigning: ['Admin'],
};

/**
 * Customer-facing status terminology:
 * "Change wording so the customer-facing status is clearly shown as 'Service Requested' rather than an internal 'Request' label."
 */
export function getCustomerFacingStatus(status: RequestStatus): string {
  switch (status) {
    case 'Draft':
    case 'Validated':
    case 'Pending Approval':
      return 'Service Requested';
    case 'Approved':
      return 'Service Approved';
    case 'Assigned':
      return 'Technician Assigned & Dispatched';
    case 'In Progress':
      return 'Service In Progress';
    case 'Completed':
      return 'Service Completed (Pending Verification)';
    case 'Verified':
      return 'Service Verified & Handed Over';
    case 'Closed':
      return 'Service Resolved & Closed';
    case 'Exception':
      return 'Service Exception - Action In Progress';
    case 'Reassigning':
      return 'Reallocating Priority Technician';
    default:
      return 'Service Requested';
  }
}

/**
 * Validates whether a state transition is legal according to strict lifecycle rules and role authority
 */
export function validateTransition(
  request: ServiceRequest,
  targetStatus: RequestStatus,
  role: UserRole
): TransitionValidation {
  const currentStatus = request.status;

  // 1. Check if same status
  if (currentStatus === targetStatus) {
    return { allowed: false, reason: `Request is already in state '${currentStatus}'.` };
  }

  // 2. Check lifecycle transition map
  const allowedNext = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowedNext.includes(targetStatus)) {
    return {
      allowed: false,
      reason: `Illegal state transition from '${currentStatus}' to '${targetStatus}'. Workflow requires following the sequential lifecycle: Draft → Validated → Pending Approval → Approved → Assigned → In Progress → Completed → Verified → Closed.`,
    };
  }

  // 3. Frozen-window replanning guard
  if (currentStatus === 'In Progress' && targetStatus === 'Reassigning') {
    return {
      allowed: false,
      reason: `FROZEN WINDOW VIOLATION: Machine servicing is actively 'In Progress'. Technicians cannot be automatically reassigned while on-site active work is underway. Complete or abort the task first.`,
    };
  }

  // 4. Role authority check
  const allowedRoles = ROLE_TRANSITION_PERMISSIONS[targetStatus] || [];
  if (role !== 'Admin' && !allowedRoles.includes(role)) {
    return {
      allowed: false,
      reason: `Role '${role}' is not authorized to transition request to '${targetStatus}'. Required role: ${allowedRoles.join(' or ')}.`,
    };
  }

  // 5. Completion validation check: checklist and notes
  if (targetStatus === 'Completed') {
    const uncompletedChecklist = request.checklist.filter((item) => !item.completed);
    if (uncompletedChecklist.length > 0) {
      return {
        allowed: false,
        reason: `Cannot complete service: ${uncompletedChecklist.length} checklist items remain unchecked. All physical verification tasks must be signed off.`,
      };
    }
  }

  return { allowed: true };
}

/**
 * Returns user-friendly status badge styling
 */
export function getStatusColor(status: RequestStatus): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  switch (status) {
    case 'Draft':
      return { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', dot: 'bg-slate-400' };
    case 'Validated':
      return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' };
    case 'Pending Approval':
      return { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', dot: 'bg-amber-500' };
    case 'Approved':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' };
    case 'Assigned':
      return { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' };
    case 'In Progress':
      return { bg: 'bg-cyan-50', text: 'text-cyan-800', border: 'border-cyan-200', dot: 'bg-cyan-500 animate-pulse' };
    case 'Completed':
      return { bg: 'bg-teal-50', text: 'text-teal-800', border: 'border-teal-200', dot: 'bg-teal-500' };
    case 'Verified':
      return { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-200', dot: 'bg-green-600' };
    case 'Closed':
      return { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300', dot: 'bg-slate-400' };
    case 'Exception':
      return { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-300', dot: 'bg-rose-600 animate-ping' };
    case 'Reassigning':
      return { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200', dot: 'bg-orange-500' };
    default:
      return { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', dot: 'bg-slate-400' };
  }
}
