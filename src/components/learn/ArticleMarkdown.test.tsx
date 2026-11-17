import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ArticleMarkdown } from "./ArticleMarkdown";

describe("ArticleMarkdown URL sanitization", () => {
  it("renders safe HTTP/HTTPS and internal links as anchors", () => {
    render(
      <ArticleMarkdown content="Visit [Frelux](https://frelux.com) or [internal](/learn/pop) for more." />,
    );
    const ext = screen.getByRole("link", { name: "Frelux" });
    expect(ext).toHaveAttribute("href", "https://frelux.com");
    expect(ext).toHaveAttribute("target", "_blank");
    expect(ext).toHaveAttribute("rel", "noopener noreferrer");

    const intLink = screen.getByRole("link", { name: "internal" });
    expect(intLink).toHaveAttribute("href", "/learn/pop");
    expect(intLink).not.toHaveAttribute("target");
  });

  it("neutralizes dangerous javascript: or data: URLs by rendering plain text", () => {
    render(
      <ArticleMarkdown content="Click [Dangerous](javascript:alert(1)) or [Payload](data:text/html,<script>alert(1)</script>)." />,
    );
    expect(screen.queryByRole("link", { name: "Dangerous" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Payload" })).toBeNull();
    expect(screen.getByText(/Dangerous/)).toBeInTheDocument();
    expect(screen.getByText(/Payload/)).toBeInTheDocument();
  });
});
