import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #18181b, #09090b)",
          borderRadius: 36,
        }}
      >
        <span
          style={{
            fontSize: 110,
            fontFamily: "monospace",
            fontWeight: 700,
            color: "#fafafa",
            letterSpacing: "-3px",
            lineHeight: 1,
            marginLeft: -4,
          }}
        >
          f
        </span>
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "#10b981",
            marginTop: 38,
            marginLeft: 2,
            display: "flex",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
