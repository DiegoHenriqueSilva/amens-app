/** Legacy requests can have a closing testimony but still be marked active. */
const CLOSING_FEEDBACK = ["success", "grace_received", "not_this_time", "god_knows"] as const;

type PrayerState = { status?: string | null; feedback?: string | null };

export function isPrayerConcluded(prayer: PrayerState): boolean {
  return prayer.status === "completed"
    || CLOSING_FEEDBACK.some(value => value === prayer.feedback);
}

export function isPrayerEligibleForDraw(prayer: PrayerState): boolean {
  return prayer.status === "active" && !isPrayerConcluded(prayer);
}

// Explicit null branch: SQL NOT IN alone would also exclude unanswered requests.
// keep_trying is intentionally eligible: the author chose to keep praying.
export const OPEN_PRAYER_FEEDBACK_FILTER = `feedback.is.null,feedback.not.in.(${CLOSING_FEEDBACK.join(",")})`;
