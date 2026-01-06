// Programme lifecycle utilities

export type ProgrammeStatus = 'upcoming' | 'completed';

/**
 * Calculate programme status based on start time and duration
 * @param eventDate - The event date (YYYY-MM-DD)
 * @param eventTime - The event time (e.g., "10:00 AM")
 * @param duration - Duration string (e.g., "2 hours", "90 minutes")
 * @returns 'upcoming' or 'completed'
 */
export function getProgrammeStatus(
  eventDate: string | null,
  eventTime: string | null,
  duration: string | null
): ProgrammeStatus {
  if (!eventDate) return 'upcoming';

  const now = new Date();
  
  // Parse the event datetime
  const startDateTime = parseEventDateTime(eventDate, eventTime);
  if (!startDateTime) return 'upcoming';

  // Calculate end time based on duration
  const durationMinutes = parseDuration(duration);
  const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);

  // If current time is after end time, programme is completed
  if (now >= endDateTime) {
    return 'completed';
  }

  return 'upcoming';
}

/**
 * Check if registration is still open (before programme starts)
 */
export function isRegistrationOpen(
  eventDate: string | null,
  eventTime: string | null
): boolean {
  if (!eventDate) return true;

  const now = new Date();
  const startDateTime = parseEventDateTime(eventDate, eventTime);
  
  if (!startDateTime) return true;
  
  return now < startDateTime;
}

/**
 * Parse event date and time into a Date object
 */
function parseEventDateTime(eventDate: string, eventTime: string | null): Date | null {
  try {
    const datePart = new Date(eventDate);
    if (isNaN(datePart.getTime())) return null;

    if (eventTime) {
      // Parse time like "10:00 AM", "2:30 PM", "14:00"
      const timeMatch = eventTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1], 10);
        const minutes = parseInt(timeMatch[2], 10);
        const meridiem = timeMatch[3]?.toUpperCase();

        if (meridiem === 'PM' && hours !== 12) hours += 12;
        if (meridiem === 'AM' && hours === 12) hours = 0;

        datePart.setHours(hours, minutes, 0, 0);
      }
    } else {
      // Default to start of day if no time specified
      datePart.setHours(0, 0, 0, 0);
    }

    return datePart;
  } catch {
    return null;
  }
}

/**
 * Parse duration string into minutes
 * Supports formats like "2 hours", "90 minutes", "1.5 hours", "1 hour 30 minutes"
 */
function parseDuration(duration: string | null): number {
  if (!duration) return 120; // Default 2 hours

  const lowerDuration = duration.toLowerCase();
  let totalMinutes = 0;

  // Match hours
  const hoursMatch = lowerDuration.match(/(\d+\.?\d*)\s*h(ou)?r?s?/);
  if (hoursMatch) {
    totalMinutes += parseFloat(hoursMatch[1]) * 60;
  }

  // Match minutes
  const minutesMatch = lowerDuration.match(/(\d+)\s*min(ute)?s?/);
  if (minutesMatch) {
    totalMinutes += parseInt(minutesMatch[1], 10);
  }

  return totalMinutes > 0 ? totalMinutes : 120; // Default 2 hours if parsing fails
}
