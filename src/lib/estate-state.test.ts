import { beforeEach, describe, expect, it } from "vitest";
import { booking, CONFLICT_SECONDS, pressBooking, tickBooking } from "./estate-state";

describe("the demo booking card", () => {
  beforeEach(() => {
    booking.state = "available";
    booking.since = 0;
    booking.version = 0;
  });

  it("books once, then refuses the same dates", () => {
    pressBooking(10);
    expect(booking.state).toBe("booked");
    pressBooking(11);
    expect(booking.state).toBe("conflict");
    expect(booking.version).toBe(2);
  });

  it("releases the dates after showing the refusal", () => {
    pressBooking(10);
    pressBooking(11);
    tickBooking(11 + CONFLICT_SECONDS - 0.1);
    expect(booking.state).toBe("conflict");
    tickBooking(11 + CONFLICT_SECONDS + 0.1);
    expect(booking.state).toBe("available");
  });

  it("keeps a booking until someone tries to double-book", () => {
    pressBooking(10);
    tickBooking(10_000);
    expect(booking.state).toBe("booked");
  });
});
