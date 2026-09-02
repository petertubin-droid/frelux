import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProfessionalCard from "@/components/pro-connect/ProfessionalCard";

const mockProfile = {
  slug: "john-painter",
  display_name: "John Doe",
  business_name: "Doe Painting Ltd",
  profile_image_url: null,
  availability: "available",
  contact_verified_at: "2025-01-01",
  identity_verified_at: null,
  pro_level: false,
  bio: "Professional painter with 10 years experience",
  city: "Lagos",
} as any;

const mockCategory = { name: "Painting", slug: "painting" } as any;
const mockServices = [
  { name: "Interior Painting", slug: "interior" },
  { name: "Exterior Painting", slug: "exterior" },
] as any;

function renderCard(
  props: Partial<Parameters<typeof ProfessionalCard>[0]> = {},
) {
  return render(
    <MemoryRouter>
      <ProfessionalCard
        profile={mockProfile}
        category={mockCategory}
        services={mockServices}
        {...props}
      />
    </MemoryRouter>,
  );
}

describe("ProfessionalCard", () => {
  it("renders display name", () => {
    renderCard();
    expect(screen.getByText("John Doe")).toBeTruthy();
  });

  it("renders business name", () => {
    renderCard();
    expect(screen.getByText("Doe Painting Ltd")).toBeTruthy();
  });

  it("renders category name", () => {
    renderCard();
    expect(screen.getByText("Painting")).toBeTruthy();
  });

  it("links to profile page", () => {
    renderCard();
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/pro-connect/john-painter");
  });

  it("shows availability status as Available", () => {
    renderCard();
    expect(screen.getByText("Available")).toBeTruthy();
  });

  it("shows busy status when profile is busy", () => {
    renderCard({ profile: { ...mockProfile, availability: "busy" } as any });
    expect(screen.getByText("Busy")).toBeTruthy();
  });

  it("shows unavailable status", () => {
    renderCard({
      profile: { ...mockProfile, availability: "unavailable" } as any,
    });
    expect(screen.getByText("Unavailable")).toBeTruthy();
  });

  it("renders initial letter avatar when no image", () => {
    renderCard();
    expect(screen.getByText("J")).toBeTruthy();
  });

  it("renders service names", () => {
    renderCard();
    expect(screen.getByText("Interior Painting")).toBeTruthy();
    expect(screen.getByText("Exterior Painting")).toBeTruthy();
  });
});
