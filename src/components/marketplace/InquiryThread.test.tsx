import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

/**
 * The thread both sides of a marketplace inquiry see.
 *
 * The behaviour that matters: a buyer's or seller's reply appears, and a send
 * that fails says so while keeping the typed text. A composer that silently
 * swallows a message is exactly what this component replaced.
 */

const state = {
  messages: [] as {
    id: string;
    inquiry_id: string;
    sender_id: string;
    body: string;
    is_read: boolean;
    created_at: string;
  }[],
  sendResult: { ok: true as const, message: null as never },
};

const sendSpy = vi.fn(async () => state.sendResult);

vi.mock("@/lib/marketplace-inquiry-thread", () => ({
  INQUIRY_MESSAGE_MAX: 4000,
  getInquiryMessages: vi.fn(async () => state.messages),
  markInquiryMessagesRead: vi.fn(async () => true),
  sendInquiryMessage: (...args: unknown[]) => sendSpy(...(args as [])),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    channel: () => ({
      on: () => ({ subscribe: () => ({}) }),
    }),
    removeChannel: vi.fn(),
  },
}));

import InquiryThread from "@/components/marketplace/InquiryThread";

const row = (
  id: string,
  sender: string,
  body: string,
  created = "2026-11-19T20:00:00.000Z",
) => ({
  id,
  inquiry_id: "inq-1",
  sender_id: sender,
  body,
  is_read: true,
  created_at: created,
});

beforeEach(() => {
  state.messages = [];
  sendSpy.mockClear();
  state.sendResult = { ok: true, message: null as never };
});

describe("InquiryThread", () => {
  it("shows the conversation in order", async () => {
    state.messages = [
      row("m1", "buyer-1", "Is this cement 42.5N?"),
      row("m2", "seller-1", "Yes, 42.5N. Delivery in 48 hours."),
    ];
    render(<InquiryThread inquiryId="inq-1" viewerId="buyer-1" />);

    await waitFor(() =>
      expect(screen.getByText("Is this cement 42.5N?")).toBeInTheDocument(),
    );
    expect(
      screen.getByText("Yes, 42.5N. Delivery in 48 hours."),
    ).toBeInTheDocument();
  });

  it("says so when there is nothing yet", async () => {
    render(<InquiryThread inquiryId="inq-1" viewerId="buyer-1" />);
    await waitFor(() =>
      expect(screen.getByText(/no replies yet/i)).toBeInTheDocument(),
    );
  });

  it("sends a reply and clears the box", async () => {
    render(<InquiryThread inquiryId="inq-1" viewerId="seller-1" />);
    const input = await screen.findByLabelText(/reply to this inquiry/i);
    fireEvent.change(input, { target: { value: "We deliver on Friday." } });
    fireEvent.click(screen.getByLabelText(/send reply/i));

    await waitFor(() =>
      expect(sendSpy).toHaveBeenCalledWith("inq-1", "We deliver on Friday."),
    );
    await waitFor(() => expect(input).toHaveValue(""));
  });

  it("keeps the typed text and explains a refused send", async () => {
    state.sendResult = { ok: false as never, message: null as never };
    render(<InquiryThread inquiryId="inq-1" viewerId="buyer-1" />);
    const input = await screen.findByLabelText(/reply to this inquiry/i);
    fireEvent.change(input, { target: { value: "Still there?" } });
    fireEvent.click(screen.getByLabelText(/send reply/i));

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toMatch(
        /was not sent|under 4000|sign in again/i,
      ),
    );
    expect(input).toHaveValue("Still there?");
  });

  it("refuses to send an empty box", async () => {
    render(<InquiryThread inquiryId="inq-1" viewerId="buyer-1" />);
    const button = await screen.findByLabelText(/send reply/i);
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(sendSpy).not.toHaveBeenCalled();
  });
});
