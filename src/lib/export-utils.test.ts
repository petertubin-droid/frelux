import { describe, it, expect } from "vitest";
import { toCsv, type CsvColumn } from "./export-utils";

describe("export-utils", () => {
  it("toCsv converts rows to CSV string", () => {
    const rows = [
      { name: "Cement", price: 8500 },
      { name: "Sand", price: 35000 },
    ];
    const columns: CsvColumn[] = [
      { header: "Name", key: "name" },
      { header: "Price", key: "price" },
    ];
    const csv = toCsv(rows, columns);
    expect(csv).toContain("Name,Price");
    expect(csv).toContain("Cement,8500");
    expect(csv).toContain("Sand,35000");
  });

  it("toCsv handles missing values", () => {
    const rows = [{ name: "Test", price: undefined }];
    const columns: CsvColumn[] = [
      { header: "Name", key: "name" },
      { header: "Price", key: "price" },
    ];
    const csv = toCsv(rows, columns);
    expect(csv).toContain("Test,");
  });

  it("toCsv escapes commas in values", () => {
    const rows = [{ name: "Hello, World", val: 1 }];
    const columns: CsvColumn[] = [
      { header: "Name", key: "name" },
      { header: "Val", key: "val" },
    ];
    const csv = toCsv(rows, columns);
    expect(csv).toContain('"Hello, World"');
  });

  it("toCsv escapes quotes in values", () => {
    const rows = [{ name: 'Say "hi"', val: 1 }];
    const columns: CsvColumn[] = [
      { header: "Name", key: "name" },
      { header: "Val", key: "val" },
    ];
    const csv = toCsv(rows, columns);
    expect(csv).toContain('"Say ""hi"""');
  });

  it("toCsv uses format function when provided", () => {
    const rows = [{ price: 8500 }];
    const columns: CsvColumn[] = [
      { header: "Price", key: "price", format: (v) => `₦${v}` },
    ];
    const csv = toCsv(rows, columns);
    expect(csv).toContain("₦8500");
  });

  it("toCsv handles empty rows", () => {
    const columns: CsvColumn[] = [{ header: "A", key: "a" }];
    const csv = toCsv([], columns);
    expect(csv).toBe("A");
  });
});
