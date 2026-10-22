/**
 * The Estate Quarter's two toys, shared between the 3D villa, its booking
 * card and the city's click handling. Plain mutable objects: they change
 * every frame and must never trigger a React render.
 */

/** The villa's cutaway: `open` is the goal, `amount` eases towards it (0 shut, 1 roof lifted). */
export const villa = { open: false, amount: 0 };

/** Fired on window to open or close the villa's roof. */
export const VILLA_TOGGLE_EVENT = "estate:villa";

/**
 * The demo booking card, a small model of NexState's booking rule: the first
 * reservation locks the dates, a second one for the same dates is refused.
 */
export type BookingState = "available" | "booked" | "conflict";
export const booking = {
  state: "available" as BookingState,
  /** performance.now() seconds when the state last changed. */
  since: 0,
  /** Bumped on every change, so the card knows to redraw. */
  version: 0,
};

/** Fired on window when a visitor presses the card's button. */
export const BOOKING_EVENT = "estate:book";

/** How long the "already booked" refusal shows before the demo resets. */
export const CONFLICT_SECONDS = 3.5;

export function pressBooking(now = performance.now() / 1000) {
  booking.state = booking.state === "available" ? "booked" : "conflict";
  booking.since = now;
  booking.version++;
}

/** Called every frame: after a refusal the dates are released and the demo starts over. */
export function tickBooking(now = performance.now() / 1000) {
  if (booking.state === "conflict" && now - booking.since > CONFLICT_SECONDS) {
    booking.state = "available";
    booking.since = now;
    booking.version++;
  }
}
