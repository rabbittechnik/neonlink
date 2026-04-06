import notificationSoundUrl from "../../notification-sound-for-whatsapp.mp3";

/**
 * Plays the WhatsApp-style notification sound for incoming chat messages.
 * Errors (e.g. browser autoplay policy) are caught silently so the UI is
 * never disrupted by a failed audio play attempt.
 */
export function playNotificationSound(): void {
  try {
    const audio = new Audio(notificationSoundUrl as string);
    audio.volume = 0.6;
    audio.play().catch(() => {
      /* autoplay blocked or audio unavailable – ignore */
    });
  } catch {
    /* Audio API unavailable – ignore */
  }
}
