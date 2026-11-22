"use client";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="btn-secondary flex-1">
      Print
    </button>
  );
}
