import { describe, expect, it } from "vitest";
import type { CursorRecordingData, CursorRecordingSample } from "../../../../src/native/contracts";
import { chooseCursorTrack } from "./chooseCursorTrack";

function sample(timeMs: number): CursorRecordingSample {
	return { timeMs, cx: 0.5, cy: 0.5, visible: true, interactionType: "move" };
}

function track(count: number, provider: CursorRecordingData["provider"]): CursorRecordingData {
	return {
		version: 2,
		provider,
		samples: Array.from({ length: count }, (_, i) => sample(i * 33)),
		assets: [],
	};
}

describe("chooseCursorTrack", () => {
	it("keeps the portal's track whenever it has samples", () => {
		const portal = track(10, "native");
		const chosen = chooseCursorTrack(portal, track(99, "none"));
		// Not a count comparison: the portal's track carries cursor bitmaps and
		// follows a moving window, so a longer fallback does not beat it.
		expect(chosen.track).toBe(portal);
		expect(chosen.source).toBe("portal");
	});

	it("falls back when the portal returned nothing", () => {
		// The measured GNOME/X11 monitor case: SPA_META_Cursor present on every
		// buffer, `id` never set, so every sample is dropped.
		const fallback = track(200, "none");
		const chosen = chooseCursorTrack(track(0, "none"), fallback);
		expect(chosen.track).toBe(fallback);
		expect(chosen.source).toBe("x11-fallback");
	});

	it("keeps the portal's track when neither has samples", () => {
		// Wayland with no fallback running, or a take where the pointer never
		// entered the captured area. The caller writes no sidecar either way;
		// reporting "portal" keeps the log honest about where the nothing came from.
		const portal = track(0, "none");
		expect(chooseCursorTrack(portal, null)).toEqual({ track: portal, source: "portal" });
		expect(chooseCursorTrack(portal, track(0, "none")).source).toBe("portal");
	});

	it("does not treat a missing fallback as an empty one", () => {
		// Wayland never starts a fallback at all, so `null` is the normal case
		// there and must not throw.
		const portal = track(3, "native");
		expect(() => chooseCursorTrack(portal, null)).not.toThrow();
		expect(chooseCursorTrack(portal, null).source).toBe("portal");
	});
});
