/** Fired on window to launch a lime signal flare from the HQ beacon (Contact). */
export const FLARE_EVENT = "city:flare";

export function sendFlare() {
  window.dispatchEvent(new Event(FLARE_EVENT));
}
