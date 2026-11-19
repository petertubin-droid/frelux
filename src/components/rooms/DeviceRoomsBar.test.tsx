import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DeviceRoomsBar from "@/components/rooms/DeviceRoomsBar";
import { listDeviceRooms, saveDeviceRooms } from "@/lib/rooms/room-store";
import type { HouseRoomRow } from "@/types";

const rooms: HouseRoomRow[] = [
  {
    id: "a",
    label: "Master bedroom",
    length: 4.2,
    width: 3.6,
    height: 2.7,
    quantity: 1,
    doors: 1,
    windows: 2,
  },
];

beforeEach(() => window.localStorage.clear());

describe("DeviceRoomsBar", () => {
  it("saves the calculator's rooms and shows them in the library", () => {
    render(
      <DeviceRoomsBar
        rooms={rooms}
        onImport={() => {}}
        unit="meters"
        market="NG"
      />,
    );
    expect(screen.getByText(/Rooms on this device/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Save these rooms/i }));
    expect(listDeviceRooms().rooms).toHaveLength(1);
    expect(screen.getByText("Master bedroom")).toBeTruthy();
    expect(screen.getByText(/Saved 1 room/)).toBeTruthy();
  });

  it("hands a saved room to the current calculator", () => {
    saveDeviceRooms(rooms, { unit: "meters", market: "NG" });
    const onImport = vi.fn();
    render(
      <DeviceRoomsBar rooms={[]} onImport={onImport} unit="feet" market="US" />,
    );
    fireEvent.click(screen.getByTitle(/Add this room to the calculator/i));
    expect(onImport).toHaveBeenCalledTimes(1);
    const [row] = onImport.mock.calls[0][0];
    // Converted into the calculator's unit, not the digits it was typed in.
    expect(row.length).toBeCloseTo(13.78, 2);
    expect(row.width).toBeCloseTo(11.81, 2);
  });

  it("cannot save when the calculator has no rooms yet", () => {
    render(<DeviceRoomsBar rooms={[]} onImport={() => {}} unit="meters" />);
    const button = screen.getByRole("button", {
      name: /Save these rooms/i,
    }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it("deletes a saved room", () => {
    saveDeviceRooms(rooms, { unit: "meters" });
    render(<DeviceRoomsBar rooms={[]} onImport={() => {}} unit="meters" />);
    fireEvent.click(screen.getByLabelText(/Delete Master bedroom/i));
    expect(listDeviceRooms().rooms).toHaveLength(0);
  });
});
