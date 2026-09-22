import { I18nextProvider } from "react-i18next";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HomePage from "../src/pages/HomePage";
import StarfieldCanvas from "../src/components/StarfieldCanvas";
import { LocationProvider } from "../src/context/LocationContext";
import i18n from "../src/i18n";

function renderHome() {
  return render(
    <I18nextProvider i18n={i18n}>
      <LocationProvider>
        <MemoryRouter initialEntries={["/zh"]}>
          <Routes>
            <Route path="/:locale" element={<HomePage />} />
          </Routes>
        </MemoryRouter>
      </LocationProvider>
    </I18nextProvider>
  );
}

beforeEach(async () => {
  await i18n.changeLanguage("zh");
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    disconnect() {}
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});

describe("immersive home experience", () => {
  it("renders a starfield hero and preserves the functional area below it", () => {
    renderHome();

    expect(screen.getByRole("button", { name: /开始观星/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "从今晚开始计划你的观测" })).toBeInTheDocument();
    expect(screen.getByText("观测地点")).toBeInTheDocument();
    expect(screen.getByText("今晚适合观测吗？")).toBeInTheDocument();
  });

  it("smoothly scrolls to the functional area from the hero CTA", () => {
    const scrollIntoView = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    renderHome();

    fireEvent.click(screen.getByRole("button", { name: /开始观星/ }));

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });

  it("does not require a canvas context to render", () => {
    expect(() => render(<StarfieldCanvas />)).not.toThrow();
    expect(document.querySelector("canvas")).toHaveAttribute("aria-hidden", "true");
  });
});
