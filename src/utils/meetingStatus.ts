export type EffectiveMeetingStatus = "scheduled" | "ongoing" | "completed" | "cancelled";

export type MeetingStatusSource = {
  status?: string | null;
  start_time: string;
  end_time: string;
};

export function getMeetingStatus(
  meeting: MeetingStatusSource,
  now: Date = new Date()
): EffectiveMeetingStatus {
  if (meeting.status === "cancelled") return "cancelled";

  const start = new Date(meeting.start_time);
  const end = new Date(meeting.end_time);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    // Fallback to scheduled if timestamps are invalid
    return "scheduled";
  }

  if (now >= end) return "completed";
  if (now >= start && now < end) return "ongoing";
  return "scheduled";
}
