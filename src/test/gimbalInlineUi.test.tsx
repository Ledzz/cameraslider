import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";

import Index from "@/pages/Index";
import { useSliderStore } from "@/store/sliderStore";

const renderIndex = () =>
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Index />
    </MemoryRouter>,
  );

describe("Inline gimbal UI", () => {
  beforeEach(() => {
    act(() => {
      useSliderStore.setState({
        activeMode: "goto",
        error: "",
        isConnected: true,
        isConnecting: false,
        tl1GimbalUi: {
          a: { yaw: 0, roll: 0, pitch: 0, focus: 0 },
          b: { yaw: 0, roll: 0, pitch: 0, focus: 0 },
        },
        tl2GimbalUi: {
          a: { yaw: 0, roll: 0, pitch: 0, focus: 0 },
          b: { yaw: 0, roll: 0, pitch: 0, focus: 0 },
        },
      });
    });
  });

  it("does not render a separate gimbal tab", () => {
    renderIndex();

    expect(screen.queryByRole("tab", { name: /gimbal/i })).not.toBeInTheDocument();
  });

  it("renders gimbal controls inside goto mode", () => {
    renderIndex();

    expect(screen.getByText("Gimbal Status")).toBeInTheDocument();
    expect(screen.getByText("Gimbal Actions")).toBeInTheDocument();
  });

  it("renders gimbal controls inside timelapse modes but not velocity", () => {
    renderIndex();

    act(() => {
      useSliderStore.setState({ activeMode: "timelapse1" });
    });
    expect(screen.getByText("Timelapse Gimbal Endpoints")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /set a from current/i })).toBeInTheDocument();

    act(() => {
      useSliderStore.setState({ activeMode: "timelapse2" });
    });
    expect(screen.getByText("Step Gimbal Endpoints")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /set b from current/i })).toBeInTheDocument();

    act(() => {
      useSliderStore.setState({ activeMode: "velocity" });
    });
    expect(screen.queryByText("Timelapse Gimbal Endpoints")).not.toBeInTheDocument();
    expect(screen.queryByText("Step Gimbal Endpoints")).not.toBeInTheDocument();
  });
});
