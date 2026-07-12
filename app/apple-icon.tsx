import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Apple touch icon — same brand mark as Android. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0B3D2E",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <div
          style={{
            fontSize: 110,
            fontWeight: 700,
            color: "#1A5C45",
            lineHeight: 1,
            fontFamily: "system-ui, sans-serif",
            marginLeft: 12,
          }}
        >
          R
        </div>
        <div
          style={{
            position: "absolute",
            width: 54,
            height: 54,
            background: "#FFFFFF",
            transform: "rotate(45deg)",
            borderRadius: 6,
            left: 42,
            top: 72,
            boxShadow: "0 4px 10px rgba(0,0,0,0.25)",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 14,
            height: 14,
            background: "#0B3D2E",
            left: 62,
            top: 92,
            borderRadius: 2,
          }}
        />
      </div>
    ),
    { ...size }
  );
}
