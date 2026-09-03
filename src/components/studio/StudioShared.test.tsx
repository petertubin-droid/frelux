import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  parseMarkdown,
  PromptInput,
  AiResponseDisplay,
  RenderedContent,
  CodeOutput,
  ArtifactCard,
  CollapsibleSection,
  SaveBar,
  ToolHeader,
  ChatMessage,
} from "./StudioShared";
import { Cpu } from "lucide-react";

// ── parseMarkdown ──

describe("parseMarkdown", () => {
  it("returns empty array for empty string", () => {
    expect(parseMarkdown("")).toEqual([]);
  });

  it("returns a single text segment for plain text", () => {
    const result = parseMarkdown("Hello world");
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("text");
    expect(result[0].content).toBe("Hello world");
  });

  it("extracts a code block with language", () => {
    const md = "```typescript\nconst x = 1;\n```";
    const result = parseMarkdown(md);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("code");
    expect(result[0].lang).toBe("typescript");
    expect(result[0].content).toBe("const x = 1;\n");
  });

  it("extracts a code block without specified language defaults to typescript", () => {
    const md = "```\nconst x = 1;\n```";
    const result = parseMarkdown(md);
    expect(result[0].type).toBe("code");
    expect(result[0].lang).toBe("typescript");
  });

  it("handles mixed text and code blocks", () => {
    const md = "Here is the code:\n```python\nprint('hello')\n```\nDone.";
    const result = parseMarkdown(md);
    expect(result).toHaveLength(3);
    expect(result[0].type).toBe("text");
    expect(result[0].content).toBe("Here is the code:");
    expect(result[1].type).toBe("code");
    expect(result[1].lang).toBe("python");
    expect(result[2].type).toBe("text");
    expect(result[2].content).toBe("Done.");
  });

  it("handles multiple code blocks", () => {
    const md = "```js\na()\n```\nmiddle\n```ts\nb()\n```";
    const result = parseMarkdown(md);
    expect(result).toHaveLength(3);
    expect(result[0].type).toBe("code");
    expect(result[1].type).toBe("text");
    expect(result[2].type).toBe("code");
  });

  it("handles trailing text after code block", () => {
    const md = "```ts\nx=1\n```\ntrailing text";
    const result = parseMarkdown(md);
    expect(result).toHaveLength(2);
    expect(result[1].type).toBe("text");
    expect(result[1].content).toBe("trailing text");
  });

  it("does not include empty trailing text segment", () => {
    const md = "```ts\nx=1\n```\n\n  \n";
    const result = parseMarkdown(md);
    // The trailing whitespace trims to empty so no extra segment
    expect(
      result.every((s) => s.content.trim() !== "" || s.type === "code"),
    ).toBe(true);
  });
});

// ── PromptInput ──

describe("PromptInput", () => {
  it("renders textarea and button", () => {
    render(
      <PromptInput
        placeholder="Describe…"
        loading={false}
        onGenerate={vi.fn()}
      />,
    );
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByText("Generate")).toBeInTheDocument();
  });

  it("calls onGenerate with trimmed value when button clicked", () => {
    const onGenerate = vi.fn();
    render(
      <PromptInput
        placeholder="test"
        loading={false}
        onGenerate={onGenerate}
      />,
    );
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "  hello  " } });
    fireEvent.click(screen.getByText("Generate"));
    expect(onGenerate).toHaveBeenCalledWith("hello");
  });

  it("does not call onGenerate for empty input", () => {
    const onGenerate = vi.fn();
    render(
      <PromptInput
        placeholder="test"
        loading={false}
        onGenerate={onGenerate}
      />,
    );
    fireEvent.click(screen.getByText("Generate"));
    expect(onGenerate).not.toHaveBeenCalled();
  });

  it("shows loading state", () => {
    render(
      <PromptInput
        placeholder="test"
        loading={true}
        onGenerate={vi.fn()}
        buttonText="Build"
      />,
    );
    expect(screen.getByText("Generating…")).toBeInTheDocument();
    expect(screen.getByText("Generating…")).toBeDisabled();
  });

  it("renders label when provided", () => {
    render(
      <PromptInput
        label="My Label"
        placeholder="test"
        loading={false}
        onGenerate={vi.fn()}
      />,
    );
    expect(screen.getByText("My Label")).toBeInTheDocument();
  });

  it("uses custom button text", () => {
    render(
      <PromptInput
        placeholder="test"
        loading={false}
        onGenerate={vi.fn()}
        buttonText="Run AI"
      />,
    );
    expect(screen.getByText("Run AI")).toBeInTheDocument();
  });
});

// ── AiResponseDisplay ──

describe("AiResponseDisplay", () => {
  it("renders loading state", () => {
    render(<AiResponseDisplay content={null} loading={true} error={null} />);
    expect(
      screen.getByText("AI is generating your response…"),
    ).toBeInTheDocument();
  });

  it("renders error state", () => {
    render(
      <AiResponseDisplay
        content={null}
        loading={false}
        error="Something broke"
      />,
    );
    expect(screen.getByText("Generation failed")).toBeInTheDocument();
    expect(screen.getByText("Something broke")).toBeInTheDocument();
  });

  it("renders null when no content and not loading/error", () => {
    const { container } = render(
      <AiResponseDisplay content={null} loading={false} error={null} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders content with code blocks", () => {
    render(
      <AiResponseDisplay
        content={"```ts\nconst x = 1;\n```"}
        loading={false}
        error={null}
      />,
    );
    expect(screen.getByText("ts")).toBeInTheDocument();
    expect(screen.getByText("const x = 1;")).toBeInTheDocument();
  });

  it("renders plain text content", () => {
    render(
      <AiResponseDisplay content="Hello there" loading={false} error={null} />,
    );
    expect(screen.getByText("Hello there")).toBeInTheDocument();
  });
});

// ── RenderedContent ──

describe("RenderedContent", () => {
  it("renders mixed markdown", () => {
    render(<RenderedContent content={"Intro\n```js\ncode()\n```\nOutro"} />);
    expect(screen.getByText("Intro")).toBeInTheDocument();
    expect(screen.getByText("Outro")).toBeInTheDocument();
  });
});

// ── CodeOutput ──

describe("CodeOutput", () => {
  it("displays code content", () => {
    render(
      <CodeOutput
        content="const x = 42;"
        language="typescript"
        title="My Code"
      />,
    );
    expect(screen.getByText("const x = 42;")).toBeInTheDocument();
    expect(screen.getByText("My Code")).toBeInTheDocument();
  });

  it("uses language as title when no title provided", () => {
    render(<CodeOutput content="x" language="python" />);
    expect(screen.getByText("python")).toBeInTheDocument();
  });

  it("copy button calls clipboard API", () => {
    const writeText = vi.fn();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    render(<CodeOutput content="hello" />);
    fireEvent.click(screen.getByTitle("Copy"));
    expect(writeText).toHaveBeenCalledWith("hello");
  });
});

// ── ArtifactCard ──

describe("ArtifactCard", () => {
  it("renders title, type, status, and date", () => {
    render(
      <ArtifactCard
        title="My Artifact"
        type="page_builder"
        status="draft"
        updated="2024-01-15T10:00:00Z"
        onClick={vi.fn()}
      />,
    );
    expect(screen.getByText("My Artifact")).toBeInTheDocument();
    expect(screen.getByText("page_builder")).toBeInTheDocument();
    expect(screen.getByText("draft")).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(
      <ArtifactCard
        title="Test"
        type="x"
        status="approved"
        updated="2024-01-15T10:00:00Z"
        onClick={onClick}
      />,
    );
    fireEvent.click(screen.getByText("Test"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("shows delete button and calls onDelete", () => {
    const onDelete = vi.fn();
    const { container } = render(
      <ArtifactCard
        title="Test"
        type="x"
        status="draft"
        updated="2024-01-15T10:00:00Z"
        onClick={vi.fn()}
        onDelete={onDelete}
      />,
    );
    // Delete button is the second button (after the click button)
    const buttons = container.querySelectorAll("button");
    fireEvent.click(buttons[1]);
    expect(onDelete).toHaveBeenCalledOnce();
  });
});

// ── CollapsibleSection ──

describe("CollapsibleSection", () => {
  it("renders title and children when open by default", () => {
    render(
      <CollapsibleSection title="My Section" defaultOpen>
        <div>Content here</div>
      </CollapsibleSection>,
    );
    expect(screen.getByText("My Section")).toBeInTheDocument();
    expect(screen.getByText("Content here")).toBeInTheDocument();
  });

  it("hides children when closed", () => {
    render(
      <CollapsibleSection title="My Section">
        <div>Hidden content</div>
      </CollapsibleSection>,
    );
    expect(screen.getByText("My Section")).toBeInTheDocument();
    expect(screen.queryByText("Hidden content")).toBeNull();
  });

  it("toggles open on click", () => {
    render(
      <CollapsibleSection title="My Section">
        <div>Hidden content</div>
      </CollapsibleSection>,
    );
    expect(screen.queryByText("Hidden content")).toBeNull();
    fireEvent.click(screen.getByText("My Section"));
    expect(screen.getByText("Hidden content")).toBeInTheDocument();
  });
});

// ── SaveBar ──

describe("SaveBar", () => {
  it("renders save button with default label", () => {
    render(<SaveBar onSave={vi.fn()} saving={false} saved={false} />);
    expect(screen.getByText("Save as artifact")).toBeInTheDocument();
  });

  it("renders saving state", () => {
    render(<SaveBar onSave={vi.fn()} saving={true} saved={false} />);
    expect(screen.getByText("Saving…")).toBeInTheDocument();
  });

  it("shows saved indicator", () => {
    render(<SaveBar onSave={vi.fn()} saving={false} saved={true} />);
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });

  it("calls onSave on click", () => {
    const onSave = vi.fn();
    render(
      <SaveBar onSave={onSave} saving={false} saved={false} label="Save" />,
    );
    fireEvent.click(screen.getByText("Save"));
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("button is disabled when saving", () => {
    render(
      <SaveBar onSave={vi.fn()} saving={true} saved={false} label="Save" />,
    );
    expect(screen.getByText("Saving…")).toBeDisabled();
  });
});

// ── ToolHeader ──

describe("ToolHeader", () => {
  it("renders icon, title, and description", () => {
    render(
      <ToolHeader icon={Cpu} title="AI Chat" description="Chat with AI" />,
    );
    expect(screen.getByText("AI Chat")).toBeInTheDocument();
    expect(screen.getByText("Chat with AI")).toBeInTheDocument();
  });
});

// ── ChatMessage ──

describe("ChatMessage", () => {
  it("renders user message", () => {
    render(<ChatMessage role="user" content="Hello AI" />);
    expect(screen.getByText("Hello AI")).toBeInTheDocument();
    expect(screen.getByText("U")).toBeInTheDocument();
  });

  it("renders assistant message with markdown", () => {
    render(<ChatMessage role="assistant" content={"Here:\n```ts\nx=1\n```"} />);
    expect(screen.getByText("Here:")).toBeInTheDocument();
    expect(screen.getByText("x=1")).toBeInTheDocument();
    expect(screen.getByText("ts")).toBeInTheDocument();
  });

  it("renders system message as assistant-style", () => {
    render(<ChatMessage role="system" content="System note" />);
    expect(screen.getByText("System note")).toBeInTheDocument();
  });
});
