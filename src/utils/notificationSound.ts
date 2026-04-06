import notificationSoundUrl from "../../notification-sound-for-whatsapp.mp3";

let sharedAudio: HTMLAudioElement | null = null;
/** True after a silent play/pause in a user-gesture handler (unlocks autoplay). */
let audioUnlocked = false;

function getSharedAudio(): HTMLAudioElement {
  if (!sharedAudio) {
    sharedAudio = new Audio(notificationSoundUrl as string);
    sharedAudio.preload = "auto";
    sharedAudio.setAttribute("playsinline", "");
  }
  return sharedAudio;
}

let gestureListenersAttached = false;
let onPointerUnlock: (() => void) | null = null;
let onKeyUnlock: (() => void) | null = null;

function removeGestureListeners(): void {
  if (!onPointerUnlock || !onKeyUnlock) return;
  window.removeEventListener("pointerdown", onPointerUnlock, { capture: true });
  window.removeEventListener("keydown", onKeyUnlock, { capture: true });
  onPointerUnlock = null;
  onKeyUnlock = null;
}

function tryUnlockAudioInUserGesture(): void {
  if (audioUnlocked) return;
  try {
    const a = getSharedAudio();
    const targetVol = 0.6;
    a.volume = 0;
    void a
      .play()
      .then(() => {
        a.pause();
        a.currentTime = 0;
        a.volume = targetVol;
        audioUnlocked = true;
        removeGestureListeners();
      })
      .catch(() => {
        a.volume = targetVol;
      });
  } catch {
    /* ignore */
  }
}

/**
 * Browsers block notification audio until the user has interacted with the page.
 * Attach once so the first tap / click / key primes playback for later socket events.
 */
export function initNotificationSoundGestureUnlock(): void {
  if (typeof window === "undefined" || gestureListenersAttached) return;
  gestureListenersAttached = true;
  onPointerUnlock = () => tryUnlockAudioInUserGesture();
  onKeyUnlock = () => tryUnlockAudioInUserGesture();
  window.addEventListener("pointerdown", onPointerUnlock, { passive: true, capture: true });
  window.addEventListener("keydown", onKeyUnlock, { capture: true });
}

/**
 * Plays the notification sound for incoming chat messages (other users only).
 * Until `initNotificationSoundGestureUnlock` has succeeded, `play()` may be ignored by the browser.
 */
export function playNotificationSound(): void {
  try {
    const audio = getSharedAudio();
    audio.volume = 0.6;
    audio.currentTime = 0;
    void audio.play().catch(() => {
      /* autoplay still blocked — ignore */
    });
  } catch {
    /* Audio API unavailable — ignore */
  }
}
