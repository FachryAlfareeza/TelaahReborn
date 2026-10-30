import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TokenShowcase } from "./TokenShowcase";

describe("TokenShowcase", () => {
  it("menampilkan judul dan contoh format", () => {
    render(<TokenShowcase />);
    expect(screen.getByRole("heading", { level: 1, name: "Telaah TOR dan RAB" })).toBeTruthy();
    expect(screen.getByText("Rp 1.500.000")).toBeTruthy();
    expect(screen.getByText("007")).toBeTruthy();
  });
});
