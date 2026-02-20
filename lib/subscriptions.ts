import type { AnnualSubscription } from "./types";

/** Calculate the per-year cost of a subscription based on its renewal span. */
export function yearlyAmount(sub: AnnualSubscription): number {
  if (!sub.nextRenewal) return sub.amount;
  const now = new Date();
  const renewal = new Date(sub.nextRenewal);
  const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
  const yearsUntilRenewal = (renewal.getTime() - now.getTime()) / msPerYear;
  // If renewal is > 1 year away, cost spans multiple years
  const span = Math.max(1, Math.ceil(yearsUntilRenewal));
  return sub.amount / span;
}
