import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** Favicon PNG — replaces the default Vercel triangle in production. */
export default function Icon() {
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
          borderRadius: 6,
        }}
      >
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "#2E8B6A",
            lineHeight: 1,
            fontFamily: "system-ui, sans-serif",
            marginLeft: 2,
          }}
        >
          R
        </div>
        <div
          style={{
            position: "absolute",
            width: 10,
            height: 10,
            background: "#FFFFFF",
            transform: "rotate(45deg)",
            left: 7,
            top: 12,
            borderRadius: 1,
          }}
        />
      </div>
    ),
    { ...size }
  );
}
