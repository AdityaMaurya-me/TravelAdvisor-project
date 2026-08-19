import { ImageResponse } from "next/og";

export const alt = "TravelAdvisor — Discover every place worth stopping for";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          color: "white",
          background:
            "radial-gradient(circle at 82% 18%, rgba(24, 212, 238, .35), transparent 28%), linear-gradient(135deg, #031321 0%, #071d2e 52%, #0a343a 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "18px", fontSize: 34, color: "#5eeaf7" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              border: "3px solid #32d4e5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            TA
          </div>
          TravelAdvisor
        </div>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 920 }}>
          <div style={{ fontSize: 74, fontWeight: 700, lineHeight: 1.05 }}>Discover every place worth stopping for.</div>
          <div style={{ fontSize: 30, color: "#b7c9d8", marginTop: 26 }}>Places, routes, local travel ideas, and smarter trip planning.</div>
        </div>
        <div style={{ display: "flex", color: "#5eeaf7", fontSize: 25 }}>traveladvisor</div>
      </div>
    ),
    size,
  );
}
