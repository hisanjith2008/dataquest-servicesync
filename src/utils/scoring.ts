import { PreFlightScore, ServiceRequest, SparePart, Technician, Site } from '../types';

/**
 * Calculates distance between two coordinates in kilometers (Haversine formula)
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export interface CandidateEvaluation {
  technician: Technician;
  totalScore: number;
  distanceKm: number;
  breakdown: {
    skillMatch: number; // 0-40
    partsAvailability: number; // 0-30
    distanceScore: number; // 0-15
    loadScore: number; // 0-15
  };
  disqualifiedReason?: string;
}

/**
 * Evaluates all technicians for a request and returns ranked eligible candidates.
 * Strictly enforces:
 * - Technician Verification: Must be verified by Admin (isVerified === true).
 * - Customer Dissatisfaction Restriction: Must NOT be barred from this customer/site.
 * - Weights: Skill Match 40%, Parts 30%, Distance 15%, Load 15%.
 */
export function rankEligibleTechnicians(
  request: Partial<ServiceRequest>,
  site: Site,
  allTechnicians: Technician[],
  allParts: SparePart[],
  excludedTechIds: string[] = []
): { ranked: CandidateEvaluation[]; partsScore: number; missingPartsCount: number } {
  const requiredSkills = request.requiredSkills || [];
  const requiredParts = request.requiredParts || [];

  // 1. Calculate Parts Availability Score (0-30 points)
  let partsAvailabilityScore = 30;
  let missingPartsCount = 0;

  if (requiredParts.length > 0) {
    let partsFulfilled = 0;
    for (const reqPart of requiredParts) {
      const inventory = allParts.find(
        (p) => p.id === reqPart.partId && p.siteId === site.id
      );
      if (inventory && (inventory.inStock - inventory.reserved) >= reqPart.quantity) {
        partsFulfilled++;
      } else {
        missingPartsCount++;
      }
    }
    partsAvailabilityScore = Math.round((partsFulfilled / requiredParts.length) * 30);
  }

  const evaluations: CandidateEvaluation[] = [];

  for (const tech of allTechnicians) {
    // Check exclusions & state
    if (excludedTechIds.includes(tech.id)) {
      continue;
    }

    // Hard Gate 1: Admin Verification
    if (tech.isVerified === false) {
      continue; // Unverified technicians cannot be assigned
    }

    // Hard Gate 2: Customer Dissatisfaction Restriction
    // Once confirmed/recorded, technician must not be eligible for future service assignments to that same customer
    const isRestrictedFromCustomer = Boolean(
      tech.restrictedCustomerIds && (
        tech.restrictedCustomerIds.includes(site.id) ||
        (request.siteId && tech.restrictedCustomerIds.includes(request.siteId)) ||
        (request.customerId && tech.restrictedCustomerIds.includes(request.customerId))
      )
    );
    if (isRestrictedFromCustomer) {
      continue; // Barred due to past customer dissatisfaction complaint
    }

    // Hard Gate 3: Drop-out or Off-duty
    if (tech.status === 'Dropped Out' || tech.status === 'Off Duty') {
      continue;
    }

    // A. Skill Match Score (0-40 points)
    let skillScore = 0;
    if (requiredSkills.length === 0) {
      skillScore = 40;
    } else {
      const matched = requiredSkills.filter((s) => tech.skills.includes(s));
      const matchRatio = matched.length / requiredSkills.length;
      skillScore = Math.round(matchRatio * 35);
      // Bonus 5 points for relevant certifications
      if (tech.certifications && tech.certifications.length > 0) {
        skillScore = Math.min(40, skillScore + 5);
      }
    }

    // B. Distance Score (0-15 points)
    const distanceKm = calculateDistanceKm(
      tech.location.lat,
      tech.location.lng,
      site.coords.lat,
      site.coords.lng
    );

    let distanceScore = 3;
    if (distanceKm <= 10) distanceScore = 15;
    else if (distanceKm <= 25) distanceScore = 12;
    else if (distanceKm <= 40) distanceScore = 9;
    else if (distanceKm <= 60) distanceScore = 6;

    // C. Technician Load Score (0-15 points)
    const availableSlots = Math.max(0, tech.maxCapacity - tech.activeLoad);
    let loadScore = 2;
    if (availableSlots >= 2) loadScore = 15;
    else if (availableSlots === 1) loadScore = 10;
    else if (availableSlots === 0) loadScore = 2;

    const totalScore = skillScore + partsAvailabilityScore + distanceScore + loadScore;

    evaluations.push({
      technician: tech,
      totalScore,
      distanceKm,
      breakdown: {
        skillMatch: skillScore,
        partsAvailability: partsAvailabilityScore,
        distanceScore,
        loadScore,
      },
    });
  }

  // Sort descending by total score, then by distance
  evaluations.sort((a, b) => {
    if (b.totalScore !== a.totalScore) {
      return b.totalScore - a.totalScore;
    }
    return a.distanceKm - b.distanceKm;
  });

  return { ranked: evaluations, partsScore: partsAvailabilityScore, missingPartsCount };
}

/**
 * Computes Pre-Flight Readiness Score (0-100) for a given service request
 * and finds the optimal matching technician.
 */
export function calculatePreFlightScore(
  request: Partial<ServiceRequest>,
  site: Site,
  allTechnicians: Technician[],
  allParts: SparePart[],
  excludedTechIds: string[] = []
): PreFlightScore {
  const { ranked, missingPartsCount } = rankEligibleTechnicians(
    request,
    site,
    allTechnicians,
    allParts,
    excludedTechIds
  );

  if (ranked.length > 0) {
    const top = ranked[0];
    const explanation = `${top.technician.name} (Verified) achieved top readiness (${top.totalScore}/100) ` +
      `with ${top.breakdown.skillMatch}/40 skill fit, ${top.distanceKm} km proximity (${top.breakdown.distanceScore}/15 pts), ` +
      `and load score ${top.breakdown.loadScore}/15 pts. ` +
      (missingPartsCount > 0
        ? `Warning: ${missingPartsCount} required part(s) are low at ${site.name}.`
        : `All required parts verified in-stock.`);

    return {
      totalScore: Math.min(100, Math.max(0, top.totalScore)),
      breakdown: top.breakdown,
      explanation,
      recommendedTechId: top.technician.id,
      recommendedTechName: top.technician.name,
    };
  }

  return {
    totalScore: 30,
    breakdown: {
      skillMatch: 0,
      partsAvailability: 30,
      distanceScore: 0,
      loadScore: 0,
    },
    explanation: 'No verified, unrestricted technicians currently eligible for dispatch.',
    recommendedTechId: '',
    recommendedTechName: 'None Available',
  };
}
