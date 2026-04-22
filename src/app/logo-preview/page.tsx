export default function LogoPreview() {
  return (
    <div className="min-h-screen bg-[#FAF8F4] py-12 px-6">
      <div className="max-w-5xl mx-auto">
        <header className="mb-10">
          <h1 className="text-3xl font-bold font-[family-name:var(--font-heading)] mb-2">
            Ah-Ha! · Logo Preview
          </h1>
          <p className="text-sm text-foreground/60">
            4 变体都基于 Direction A（以 &quot;!&quot; 为核心）。每个渲染为
            400×400，适用于 IG / TikTok / 小红书 圆形头像。
            右键某个 variant 下方的截图按钮即可导出。
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
          {/* V1 — Editorial Classic: pure "!" on coral */}
          <Variant
            label="V1 · Editorial Classic"
            desc='纯 "!" · 珊瑚底 · 奶白字 · Playfair Black'
            bg="#C97A65"
          >
            <div
              className="font-[family-name:var(--font-heading)] select-none leading-none"
              style={{
                fontSize: 260,
                fontWeight: 900,
                color: "#FAF5EC",
                letterSpacing: "-0.02em",
              }}
            >
              !
            </div>
          </Variant>

          {/* V2 — Wordmark "Ah!" */}
          <Variant
            label='V2 · Wordmark "Ah!"'
            desc="字母组合 · 深森林绿底 · 奶米字 · 低调 editorial"
            bg="#3F4E42"
          >
            <div
              className="font-[family-name:var(--font-heading)] select-none leading-none"
              style={{
                fontSize: 150,
                fontWeight: 900,
                color: "#F5EFE4",
                letterSpacing: "-0.04em",
              }}
            >
              Ah!
            </div>
          </Variant>

          {/* V3 — "!" with ring accent: the dot = subtle ring */}
          <Variant
            label="V3 · Ring Dot"
            desc='"!" 的点换成小圆环（戒指意象）· 米底 · 珊瑚'
            bg="#F5EFE4"
          >
            <div className="relative flex flex-col items-center justify-center">
              {/* vertical stroke only (hide the dot) */}
              <div
                style={{
                  width: 34,
                  height: 170,
                  background: "#C97A65",
                  borderRadius: 4,
                  marginBottom: 28,
                }}
              />
              {/* ring dot */}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  border: "6px solid #C97A65",
                }}
              />
            </div>
          </Variant>

          {/* V4 — "!" inside badge/stamp circle */}
          <Variant
            label="V4 · Badge Stamp"
            desc='"!" 装进圆形 badge 里（像图章）· 珊瑚底 · 奶白'
            bg="#C97A65"
          >
            <div
              className="rounded-full flex items-center justify-center"
              style={{
                width: 280,
                height: 280,
                border: "5px solid #FAF5EC",
              }}
            >
              <div
                className="font-[family-name:var(--font-heading)] select-none leading-none"
                style={{
                  fontSize: 180,
                  fontWeight: 900,
                  color: "#FAF5EC",
                  marginTop: -8,
                }}
              >
                !
              </div>
            </div>
          </Variant>

          {/* V5 — Minimalist AH monogram (ligature) with a small ring below.
              Editorial, aligned with landing's soft-minimalist voice. */}
          <Variant
            label="V5 · AH Ligature"
            desc="极简 serif AH 合字（紧密 interlock）· 下方一个小 ring 作 V3 致敬 + 婚戒意象 · editorial minimalist"
            bg="#F5EFE4"
          >
            <AHMonogram color="#C97A65" />
          </Variant>
        </div>

        {/* Small-size preview row — how each looks at IG profile size */}
        <section className="mt-16">
          <h2 className="text-xl font-bold font-[family-name:var(--font-heading)] mb-2">
            小尺寸预览（IG profile 实际显示 88px 左右）
          </h2>
          <p className="text-sm text-foreground/60 mb-6">
            这是关键测试：缩到 88px 圆框里，还能认出来才算合格。
          </p>
          <div className="flex gap-6 items-center flex-wrap">
            <SmallPreview bg="#C97A65">
              <div
                className="font-[family-name:var(--font-heading)] leading-none"
                style={{ fontSize: 58, fontWeight: 900, color: "#FAF5EC" }}
              >
                !
              </div>
            </SmallPreview>
            <SmallPreview bg="#3F4E42">
              <div
                className="font-[family-name:var(--font-heading)] leading-none"
                style={{ fontSize: 34, fontWeight: 900, color: "#F5EFE4" }}
              >
                Ah!
              </div>
            </SmallPreview>
            <SmallPreview bg="#F5EFE4">
              <div className="flex flex-col items-center">
                <div
                  style={{
                    width: 8,
                    height: 38,
                    background: "#C97A65",
                    borderRadius: 1,
                    marginBottom: 6,
                  }}
                />
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    border: "1.5px solid #C97A65",
                  }}
                />
              </div>
            </SmallPreview>
            <SmallPreview bg="#C97A65">
              <div
                className="rounded-full flex items-center justify-center"
                style={{
                  width: 62,
                  height: 62,
                  border: "1.5px solid #FAF5EC",
                }}
              >
                <div
                  className="font-[family-name:var(--font-heading)] leading-none"
                  style={{
                    fontSize: 40,
                    fontWeight: 900,
                    color: "#FAF5EC",
                    marginTop: -2,
                  }}
                >
                  !
                </div>
              </div>
            </SmallPreview>
            <SmallPreview bg="#F5EFE4">
              <AHMonogram color="#C97A65" size={62} />
            </SmallPreview>
          </div>
        </section>
      </div>
    </div>
  );
}

function AHMonogram({
  color,
  size = 280,
}: {
  color: string;
  size?: number;
}) {
  // Minimalist composition: AH ligature (tight kerning so the letters interlock)
  // + a small ring below as a quiet nod to V3 + wedding-ring symbolism.
  // Geometrically centred because there are no right-side decorations to compensate for.
  const cx = 200;

  return (
    <svg
      viewBox="0 0 400 400"
      width={size}
      height={size}
      aria-label="Ah-Ha! logo — AH ligature monogram with a ring"
    >
      {/* AH ligature — Playfair Display, very tight letter-spacing so A and H interlock */}
      <text
        x={cx}
        y={260}
        fontFamily="var(--font-heading), 'Playfair Display', Georgia, serif"
        fontSize="240"
        fontWeight="700"
        textAnchor="middle"
        fill={color}
        style={{ letterSpacing: "-0.22em" }}
      >
        AH
      </text>

      {/* Small ring below — understated V3 callback + wedding-ring signal */}
      <circle
        cx={cx}
        cy={310}
        r={14}
        stroke={color}
        strokeWidth="4"
        fill="none"
      />
    </svg>
  );
}

function Variant({
  label,
  desc,
  bg,
  children,
}: {
  label: string;
  desc: string;
  bg: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        className="w-[400px] h-[400px] rounded-full flex items-center justify-center mx-auto shadow-lg"
        style={{ background: bg }}
      >
        {children}
      </div>
      <div className="mt-5 text-center">
        <p className="font-semibold text-base">{label}</p>
        <p className="text-xs text-foreground/55 mt-1">{desc}</p>
      </div>
    </div>
  );
}

function SmallPreview({
  bg,
  children,
}: {
  bg: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="w-[88px] h-[88px] rounded-full flex items-center justify-center shadow"
      style={{ background: bg }}
    >
      {children}
    </div>
  );
}
