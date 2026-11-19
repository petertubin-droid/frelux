import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import HowManyAnswer from "@/components/seo/HowManyAnswer";

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <HowManyAnswer />
    </MemoryRouter>,
  );

describe("HowManyAnswer", () => {
  it("answers the quantity question on a calculator route", () => {
    renderAt("/paint-calculator");
    expect(
      screen.getByRole("heading", {
        name: /how many litres of paint do i need/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/whole buckets to buy/i)).toBeInTheDocument();
  });

  it("answers with the trailing slash Netlify actually serves", () => {
    renderAt("/tile-calculator/");
    expect(
      screen.getByRole("heading", { name: /how many tiles and boxes/i }),
    ).toBeInTheDocument();
  });

  it("renders nothing on a route with no quantity answer", () => {
    const { container } = renderAt("/about");
    expect(container).toBeEmptyDOMElement();
  });
});
