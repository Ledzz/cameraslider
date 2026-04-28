import { describe, expect, it } from "vitest";

import { __TEST_ONLY__, applyStatusUpdate, useSliderStore } from "@/store/sliderStore";

describe("Gimbal status parsing", () => {
  it("maps nested gm payload into gimbal store state", () => {
    useSliderStore.setState({ gimbalState: { ...__TEST_ONLY__.DEFAULT_GIMBAL_STATE } });

    applyStatusUpdate({
      gm: {
        c: true,
        g: false,
        s: true,
        fk: true,
        fp: 678,
        b: 81,
        y: 12.3,
        r: -4.5,
        p2: 6.7,
        ek: true,
        e: "link_warning",
      },
    });

    const gimbalState = useSliderStore.getState().gimbalState;
    expect(gimbalState.connected).toBe(true);
    expect(gimbalState.connecting).toBe(false);
    expect(gimbalState.sleeping).toBe(true);
    expect(gimbalState.focusInitialized).toBe(true);
    expect(gimbalState.focusEstimate).toBe(678);
    expect(gimbalState.batteryKnown).toBe(true);
    expect(gimbalState.batteryLevel).toBe(81);
    expect(gimbalState.orientationKnown).toBe(true);
    expect(gimbalState.yaw).toBe(12.3);
    expect(gimbalState.roll).toBe(-4.5);
    expect(gimbalState.pitch).toBe(6.7);
    expect(gimbalState.hasError).toBe(true);
    expect(gimbalState.error).toBe("link_warning");
  });
});
