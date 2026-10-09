import { COMPAT_INTERESTS_MAX, COMPAT_OVERLAP_MAX_DAYS, COMPAT_WEIGHTS } from "@/config/nomad";

/** Same bounded score as compatible_people; eligibility/privacy are enforced by the RPC. */
export function compatScore(overlapDays: number, commonInterests: number, sameRhythm: boolean): number {
  const bounded = (v: number, max: number) => Number.isFinite(v) ? Math.max(0, Math.min(v, max)) / max : 0;
  return Math.round((COMPAT_WEIGHTS.overlap * bounded(overlapDays, COMPAT_OVERLAP_MAX_DAYS)
    + COMPAT_WEIGHTS.interests * bounded(commonInterests, COMPAT_INTERESTS_MAX)
    + COMPAT_WEIGHTS.rhythm * Number(sameRhythm)) * 10) / 10;
}
