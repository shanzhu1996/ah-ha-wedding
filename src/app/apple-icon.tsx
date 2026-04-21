import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: "#C97A65",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="100" height="100" viewBox="0 0 24 24" fill="#FFFFFF">
          <path d="M12 21s-7-4.35-9.5-8.5C.58 9.11 3 5 7 5c2 0 3.5 1 5 3 1.5-2 3-3 5-3 4 0 6.42 4.11 4.5 7.5C19 16.65 12 21 12 21z" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
