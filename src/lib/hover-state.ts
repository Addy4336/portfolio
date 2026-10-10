/** What the cursor is over in the 3D city, shared with the hover label. */
export type CityTarget = {
  id: string;
  /** Shown big in the label. */
  title: string;
  /** Shown small under it. */
  hint: string;
  /** Page element to scroll to on click (the camera follows the scroll). */
  scrollTo?: string;
};

export const hoverState: { target: CityTarget | null } = { target: null };

export const HOVER_CLICK_EVENT = "city:click";
