import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

export const alt =
  "Ah-Ha! — Wedding planning, picked up where vendor booking ends.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Fetches a single-weight Google Font and returns the raw font bytes.
// The `text` param trims the font to only the glyphs we actually render,
// keeping the final PNG payload lean.
async function loadGoogleFont(
  family: string,
  weight: 400 | 500 | 600 | 700,
  text: string
) {
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
    family
  )}:wght@${weight}&text=${encodeURIComponent(text)}`;
  const css = await (
    await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    })
  ).text();
  const match = css.match(
    /src: url\((.+?)\) format\('(woff2|woff|truetype|opentype)'\)/
  );
  if (!match) throw new Error(`Could not resolve ${family} ${weight}`);
  return (await fetch(match[1])).arrayBuffer();
}

export default async function OpengraphImage() {
  const text =
    "Ah-Ha! Wedding planning is simpler than they said. Built by someone who survived their own wedding ah-ha-wedding.vercel.app";

  const [photoBytes, playfairBold, inter] = await Promise.all([
    readFileSync(join(process.cwd(), "public", "wedding-hero.jpg")),
    loadGoogleFont("Playfair Display", 700, text),
    loadGoogleFont("Inter", 400, text),
  ]);

  const photoDataUri = `data:image/jpeg;base64,${Buffer.from(
    photoBytes
  ).toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          background: "#F5EFE4",
        }}
      >
        {/* Left 55%: photo */}
        <div
          style={{
            width: 660,
            height: 630,
            display: "flex",
            position: "relative",
            backgroundImage: `url(${photoDataUri})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {/* Subtle cream overlay — softens shadows without washing out photo */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(245, 239, 228, 0.20)",
              display: "flex",
            }}
          />
          {/* Soft right-edge fade into cream */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to right, transparent 72%, rgba(245, 239, 228, 0.30))",
              display: "flex",
            }}
          />
        </div>

        {/* Right 45%: typography — tagline is hero, brand is signature */}
        <div
          style={{
            width: 540,
            height: 630,
            padding: "0 72px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            background: "#F5EFE4",
          }}
        >
          {/* Content block: brand (with heart accent) → hairline → tagline hero → proof */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {/* Brand signature with inline heart as editorial flourish */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: 22,
              }}
            >
              <div
                style={{
                  fontFamily: "Playfair Display",
                  fontSize: 60,
                  fontWeight: 700,
                  color: "#3A322A",
                  lineHeight: 1,
                  letterSpacing: "-0.02em",
                  display: "flex",
                }}
              >
                Ah-Ha!
              </div>
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="#C97A65"
                style={{ marginLeft: 14, marginTop: 6 }}
              >
                <path d="M12 21s-7-4.35-9.5-8.5C.58 9.11 3 5 7 5c2 0 3.5 1 5 3 1.5-2 3-3 5-3 4 0 6.42 4.11 4.5 7.5C19 16.65 12 21 12 21z" />
              </svg>
            </div>

            {/* Hairline divider — editorial structure element */}
            <div
              style={{
                width: 44,
                height: 2,
                background: "#C97A65",
                marginBottom: 26,
                display: "flex",
              }}
            />

            {/* Tagline — now the hero */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                fontFamily: "Playfair Display",
                fontSize: 44,
                fontWeight: 700,
                lineHeight: 1.12,
                letterSpacing: "-0.015em",
                marginBottom: 24,
              }}
            >
              <div style={{ color: "#3A322A", display: "flex" }}>
                Wedding planning
              </div>
              <div style={{ color: "#3A322A", display: "flex" }}>
                is simpler
              </div>
              <div style={{ color: "#C97A65", display: "flex" }}>
                than they said.
              </div>
            </div>

            {/* Proof line */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                fontFamily: "Inter",
                fontSize: 15,
                color: "#7F776E",
                lineHeight: 1.5,
                letterSpacing: "0.01em",
              }}
            >
              <div style={{ display: "flex" }}>Built by someone who survived</div>
              <div style={{ display: "flex" }}>their own wedding</div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Playfair Display",
          data: playfairBold,
          weight: 700,
          style: "normal",
        },
        {
          name: "Inter",
          data: inter,
          weight: 400,
          style: "normal",
        },
      ],
    }
  );
}
