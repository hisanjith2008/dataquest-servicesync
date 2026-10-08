import {
  ConflictState,
  ReplacementOption,
  ServiceRequest,
  Site,
  SparePart,
  Technician,
} from '../types';
import { calculateDistanceKm } from './scoring';

/**
 * Evaluates whether a service request is in conflict:
 * 1. Technician dropout
 * 2. Part unavailable
 * 3. SLA breach risk
 */
export function evaluateRequestConflicts(
  request: ServiceRequest,
  site: Site,
  allTechnicians: Technician[],
  allParts: SparePart[]
): ConflictState | null {
  // If already closed, no conflict
  if (request.status === 'Closed' || request.status === 'Verified') {
    return null;
  }

  const assignedTech = allTechnicians.find((t) => t.id === request.assignedTechnicianId);
  const now = new Date().getTime();
  const deadline = new Date(request.slaDeadline).getTime();
  const minutesUntilSla = (deadline - now) / (1000 * 60);

  // 1. Check Technician Dropout
  if (
    request.assignedTechnicianId &&
    assignedTech &&
    (assignedTech.status === 'Dropped Out' || assignedTech.status === 'Off Duty')
  ) {
    const replacements = generateTopReplacements(request, site, allTechnicians, assignedTech.id);
    return {
      hasConflict: true,
      reason: 'technician_dropout',
      description: `Assigned technician ${assignedTech.name} has reported an emergency dropout / unavailable status.`,
      detectedAt: new Date().toISOString(),
      topReplacements: replacements,
    };
  }

  // 2. Check Part Unavailable
  if (request.requiredParts && request.requiredParts.length > 0) {
    for (const reqPart of request.requiredParts) {
      const partRecord = allParts.find(
        (p) => p.id === reqPart.partId && p.siteId === site.id
      );
      // If stock is strictly zero or deficit
      if (!partRecord || partRecord.inStock < reqPart.quantity) {
        const replacements = generateTopReplacements(request, site, allTechnicians, request.assignedTechnicianId);
        return {
          hasConflict: true,
          reason: 'part_unavailable',
          description: `Required spare part '${reqPart.partName}' has insufficient physical stock at ${site.name} (Requires ${reqPart.quantity}, On hand: ${partRecord ? partRecord.inStock : 0}).`,
          detectedAt: new Date().toISOString(),
          topReplacements: replacements,
        };
      }
    }
  }

  // 3. Check SLA Breach Risk
  // If less than 60 mins remain and status is not yet 'In Progress' or 'Completed'
  if (minutesUntilSla < 60 && request.status !== 'In Progress' && request.status !== 'Completed') {
    const replacements = generateTopReplacements(request, site, allTechnicians, request.assignedTechnicianId);
    return {
      hasConflict: true,
      reason: 'sla_breach_risk',
      description: `Critical SLA breach risk: Only ${Math.max(0, Math.round(minutesUntilSla))} minutes remain before contractual deadline. Current dispatch progress may fail SLA.`,
      detectedAt: new Date().toISOString(),
      topReplacements: replacements,
    };
  }

  return null;
}

/**
 * Calculates top 3 replacement technicians for conflict recovery
 */
export function generateTopReplacements(
  request: ServiceRequest,
  site: Site,
  allTechnicians: Technician[],
  excludeTechId?: string
): ReplacementOption[] {
  const candidates = allTechnicians.filter(
    (t) =>
      t.id !== excludeTechId &&
      t.isVerified !== false &&
      !(
        t.restrictedCustomerIds &&
        (t.restrictedCustomerIds.includes(site.id) ||
          (request.siteId && t.restrictedCustomerIds.includes(request.siteId)) ||
          (request.customerId && t.restrictedCustomerIds.includes(request.customerId)))
      ) &&
      !(request.declinedTechnicianIds && request.declinedTechnicianIds.includes(t.id)) &&
      t.status !== 'Dropped Out' &&
      t.status !== 'Off Duty'
  );

  const deadline = new Date(request.slaDeadline).getTime();
  const now = new Date().getTime();
  const minutesUntilSla = (deadline - now) / (1000 * 60);

  const options: ReplacementOption[] = candidates.map((tech) => {
    const distanceKm = calculateDistanceKm(
      tech.location.lat,
      tech.location.lng,
      site.coords.lat,
      site.coords.lng
    );

    // Speed approx 45 km/h in metro industrial corridor + 10 min prep
    const travelMinutes = Math.round((distanceKm / 45) * 60 + 10);

    // Skill fit calculation
    const reqSkills = request.requiredSkills || [];
    let skillFitPercent = 100;
    if (reqSkills.length > 0) {
      const matchCount = reqSkills.filter((s) => tech.skills.includes(s)).length;
      skillFitPercent = Math.round((matchCount / reqSkills.length) * 100);
      if (tech.certifications.length > 0) {
        skillFitPercent = Math.min(100, skillFitPercent + 10);
      }
    }

    // Estimated work duration ~ 60 mins
    const totalJobMinutes = travelMinutes + 60;
    let slaImpact: 'On-Time' | 'At-Risk' | 'Late' = 'On-Time';
    if (totalJobMinutes > minutesUntilSla) {
      slaImpact = 'Late';
    } else if (minutesUntilSla - totalJobMinutes < 30) {
      slaImpact = 'At-Risk';
    }

    // Recommendation badge
    let recommendedAction = 'Standard Replacement';
    if (distanceKm <= 12 && skillFitPercent >= 85) {
      recommendedAction = 'Optimal Match (Fast ETA & Top Skills)';
    } else if (distanceKm <= 10) {
      recommendedAction = 'Nearest Available (Fastest ETA)';
    } else if (skillFitPercent >= 95) {
      recommendedAction = 'Highest Qualification Specialist';
    }

    return {
      technicianId: tech.id,
      technicianName: tech.name,
      etaMinutes: travelMinutes,
      skillFitPercent,
      slaImpact,
      distanceKm,
      recommendedAction,
    };
  });

  // Sort by composite score: On-time first, then skill fit, then ETA
  options.sort((a, b) => {
    const slaRank = { 'On-Time': 0, 'At-Risk': 1, Late: 2 };
    if (slaRank[a.slaImpact] !== slaRank[b.slaImpact]) {
      return slaRank[a.slaImpact] - slaRank[b.slaImpact];
    }
    if (b.skillFitPercent !== a.skillFitPercent) {
      return b.skillFitPercent - a.skillFitPercent;
    }
    return a.etaMinutes - b.etaMinutes;
  });

  return options.slice(0, 3);
}

/**
 * Returns time remaining formatted string and severity level
 */
export function getSlaRemainingInfo(deadlineIso: string): {
  formatted: string;
  isBreached: boolean;
  isAtRisk: boolean;
  minutesLeft: number;
} {
  const now = new Date().getTime();
  const deadline = new Date(deadlineIso).getTime();
  const diffMs = deadline - now;
  const minutes = Math.round(diffMs / (1000 * 60));

  if (diffMs <= 0) {
    const overdueMins = Math.abs(minutes);
    return {
      formatted: `BREACHED by ${Math.floor(overdueMins / 60)}h ${overdueMins % 60}m`,
      isBreached: true,
      isAtRisk: true,
      minutesLeft: minutes,
    };
  }

  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;

  return {
    formatted: `${hours > 0 ? `${hours}h ` : ''}${remainingMins}m remaining`,
    isBreached: false,
    isAtRisk: minutes < 90,
    minutesLeft: minutes,
  };
}
