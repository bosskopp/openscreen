// Which of two cursor tracks a Linux recording should keep.
//
// Extracted from the `stop-native-linux-recording` handler for the reason
// `cursorSidecar.ts` was: the decision is worth testing and the handler is not
// reachable from a test — it lives inside an `ipcMain.handle` and drags the
// whole Electron runtime with it. Node-pure on purpose: no `electron` import.

import type { CursorRecordingData } from "../../../../src/native/contracts";

export type CursorTrackSource = "portal" | "x11-fallback";

export interface ChosenCursorTrack {
	track: CursorRecordingData;
	source: CursorTrackSource;
}

/**
 * Prefers the portal's cursor track, falling back to the X11 sampler's.
 *
 * THE PORTAL WINS WHENEVER IT HAS SAMPLES, and the asymmetry is deliberate: its
 * track carries cursor bitmaps (so the editor can draw the real pointer shape)
 * and it follows a window that moves, because the compositor reports the pointer
 * against the captured surface itself. The X11 sampler has neither — it reads a
 * screen-space point and normalises it against a fixed rectangle.
 *
 * The fallback exists for one case, measured on GNOME/X11: for a MONITOR stream
 * mutter ships a `SPA_META_Cursor` block whose `id` is never set, which the spec
 * defines as "nothing new", so every sample is dropped and the portal track
 * comes back empty. The same compositor fills it in correctly for a WINDOW.
 *
 * An empty fallback is not preferred over an empty portal track: the caller
 * writes no sidecar for either, and returning the portal's keeps the reported
 * source honest about where the nothing came from.
 */
export function chooseCursorTrack(
	portal: CursorRecordingData,
	fallback: CursorRecordingData | null,
): ChosenCursorTrack {
	if (portal.samples.length > 0) {
		return { track: portal, source: "portal" };
	}
	if (fallback && fallback.samples.length > 0) {
		return { track: fallback, source: "x11-fallback" };
	}
	return { track: portal, source: "portal" };
}
