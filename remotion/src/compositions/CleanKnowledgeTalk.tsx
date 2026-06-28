import React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type {
  CleanKnowledgeTalkCaptionCue,
  CleanKnowledgeTalkChapter,
  CleanKnowledgeTalkProps,
  CleanKnowledgeTalkQuote,
} from "../clean-knowledge-talk-props";

const cardStyle: React.CSSProperties = {
  borderRadius: 34,
  padding: "36px 34px",
  background: "rgba(255,255,255,0.86)",
  boxShadow: "0 28px 80px rgba(10, 25, 46, 0.14)",
  backdropFilter: "blur(18px)",
};

function buildWaveBars(style: CleanKnowledgeTalkProps["waveformStyle"]) {
  const presets =
    style === "energetic"
      ? [16, 28, 18, 38, 24, 40, 22, 34, 18, 30, 14]
      : style === "calm"
        ? [10, 14, 12, 18, 16, 20, 14, 17, 11, 15, 10]
        : [12, 22, 16, 30, 20, 34, 18, 28, 16, 24, 14];
  return presets;
}

const ChapterRail: React.FC<{
  chapters: CleanKnowledgeTalkChapter[];
  accentColor: string;
}> = ({chapters, accentColor}) => {
  const frame = useCurrentFrame();

  return (
    <div style={{display: "grid", gap: 14}}>
      {chapters.map((chapter, index) => {
        const active = frame >= chapter.startFrame && frame < chapter.endFrame;
        return (
          <div
            key={chapter.title}
            style={{
              borderRadius: 24,
              padding: "18px 18px 18px 20px",
              background: active ? `${accentColor}16` : "rgba(16,32,51,0.04)",
              border: active ? `1px solid ${accentColor}66` : "1px solid rgba(16,32,51,0.06)",
              transition: "all 0.2s ease",
            }}
          >
            <div style={{fontSize: 17, color: active ? accentColor : "#5a6a80", fontWeight: 800, marginBottom: 8}}>
              CHAPTER {index + 1}
            </div>
            <div style={{fontSize: 24, fontWeight: 800, color: "#14233a", lineHeight: 1.2, marginBottom: 6}}>
              {chapter.title}
            </div>
            <div style={{fontSize: 20, lineHeight: 1.45, color: "#42556f"}}>{chapter.summary}</div>
          </div>
        );
      })}
    </div>
  );
};

const QuoteSpotlight: React.FC<{
  quotes: CleanKnowledgeTalkQuote[];
  accentColor: string;
}> = ({quotes, accentColor}) => {
  const frame = useCurrentFrame();
  const activeQuote = quotes.find((quote) => frame >= quote.startFrame && frame < quote.endFrame) ?? quotes[0];

  if (!activeQuote) {
    return null;
  }

  return (
    <div
      style={{
        ...cardStyle,
        position: "absolute",
        left: 72,
        right: 72,
        bottom: 236,
        border: `1px solid ${accentColor}33`,
        background: "rgba(255,252,249,0.9)",
      }}
    >
      <div style={{fontSize: 18, fontWeight: 800, letterSpacing: 1.4, color: accentColor, marginBottom: 12}}>
        HIGHLIGHT QUOTE
      </div>
      <div style={{fontSize: 34, lineHeight: 1.45, color: "#173042", fontWeight: 800, marginBottom: 12}}>
        “{activeQuote.text}”
      </div>
      <div style={{fontSize: 19, lineHeight: 1.5, color: "#526577"}}>{activeQuote.reason}</div>
    </div>
  );
};

const CaptionStrip: React.FC<{
  cues: CleanKnowledgeTalkCaptionCue[];
}> = ({cues}) => {
  const frame = useCurrentFrame();
  const cue = cues.find((item) => frame >= item.startFrame && frame < item.endFrame) ?? null;

  return (
    <div
      style={{
        position: "absolute",
        left: 84,
        right: 84,
        bottom: 78,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          minHeight: 84,
          padding: "20px 28px",
          borderRadius: 28,
          background: "rgba(15, 23, 42, 0.74)",
          color: "#f8fbff",
          fontSize: 30,
          lineHeight: 1.45,
          textAlign: "center",
          fontWeight: 700,
          boxShadow: "0 18px 48px rgba(3, 7, 18, 0.26)",
          width: "100%",
        }}
      >
        {cue?.text ?? "模板准备接入真实字幕数据"}
      </div>
    </div>
  );
};

export const CleanKnowledgeTalk: React.FC<CleanKnowledgeTalkProps> = (props) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const introSpring = spring({
    fps,
    frame,
    config: {damping: 170, stiffness: 120},
  });
  const railOpacity = interpolate(frame, [18, 44], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const waveBars = buildWaveBars(props.waveformStyle);

  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(circle at top left, rgba(255,122,89,0.22), transparent 24%), radial-gradient(circle at bottom right, rgba(31,122,140,0.18), transparent 24%), linear-gradient(180deg, #fff9f3 0%, #f6f8fb 44%, #edf2f9 100%)",
        fontFamily: "ui-sans-serif, -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', sans-serif",
        color: "#14233a",
      }}
    >
      <AbsoluteFill
        style={{
          opacity: introSpring,
          transform: `scale(${0.95 + introSpring * 0.05})`,
          padding: "68px 64px 56px",
        }}
      >
        <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 26}}>
          <div style={{display: "flex", alignItems: "center", gap: 14}}>
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: 999,
                background: props.accentColor,
                boxShadow: `0 0 0 10px ${props.accentColor}24`,
              }}
            />
            <div style={{fontSize: 28, fontWeight: 800, letterSpacing: 1.2}}>video-ops · CleanKnowledgeTalk</div>
          </div>
          <div style={{fontSize: 24, color: "#5a6a80"}}>{props.runtimeLabel}</div>
        </div>

        <div style={{display: "grid", gridTemplateColumns: "1.3fr 0.8fr", gap: 26, flex: 1}}>
          <div style={{display: "grid", gap: 22}}>
            <div style={{...cardStyle, minHeight: 560, position: "relative", overflow: "hidden"}}>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(135deg, rgba(255,122,89,0.14), rgba(255,255,255,0.02) 35%), linear-gradient(180deg, rgba(16,32,51,0.03), transparent)",
                }}
              />
              <div style={{position: "relative", zIndex: 2}}>
                <div
                  style={{
                    display: "inline-flex",
                    padding: "10px 18px",
                    borderRadius: 999,
                    background: `${props.accentColor}18`,
                    color: props.accentColor,
                    fontSize: 22,
                    fontWeight: 800,
                    marginBottom: 18,
                  }}
                >
                  {props.topicLabel}
                </div>
                <div style={{fontSize: 72, lineHeight: 1.05, fontWeight: 900, letterSpacing: -2.2, marginBottom: 24}}>
                  {props.title}
                </div>
                <div style={{fontSize: 36, lineHeight: 1.48, color: "#344860", marginBottom: 24}}>{props.hook}</div>
                <div style={{fontSize: 22, color: "#5a6a80", fontWeight: 700, marginBottom: 18}}>{props.speaker}</div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${waveBars.length}, minmax(0, 1fr))`,
                    gap: 8,
                    alignItems: "end",
                    height: 74,
                    marginTop: 24,
                  }}
                >
                  {waveBars.map((height, index) => {
                    const dynamicHeight = interpolate(frame + index * 2, [0, 20, 40], [height, height + 8, height], {
                      extrapolateLeft: "extend",
                      extrapolateRight: "extend",
                    });
                    return (
                      <div
                        key={`${height}-${index}`}
                        style={{
                          height: dynamicHeight,
                          borderRadius: 999,
                          background: index % 2 === 0 ? props.accentColor : "#1f7a8c",
                          opacity: 0.82,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{...cardStyle, display: "flex", flexDirection: "column", gap: 12}}>
              <div style={{fontSize: 19, color: "#62748a", fontWeight: 800, letterSpacing: 1.4}}>SPEAKER NOTE</div>
              <div style={{fontSize: 26, lineHeight: 1.5, color: "#20324a"}}>{props.speakerFootnote}</div>
            </div>
          </div>

          <div style={{display: "grid", gap: 22, opacity: railOpacity}}>
            <div style={{...cardStyle}}>
              <div style={{fontSize: 20, color: "#62748a", fontWeight: 800, letterSpacing: 1.4, marginBottom: 16}}>
                CHAPTER RAIL
              </div>
              <ChapterRail chapters={props.chapters} accentColor={props.accentColor} />
            </div>
            <div style={{...cardStyle}}>
              <div style={{fontSize: 20, color: "#62748a", fontWeight: 800, letterSpacing: 1.4, marginBottom: 12}}>
                CTA
              </div>
              <div style={{fontSize: 28, lineHeight: 1.45, fontWeight: 700, color: "#19314a"}}>{props.cta}</div>
            </div>
          </div>
        </div>
      </AbsoluteFill>

      <Sequence from={38}>
        <QuoteSpotlight quotes={props.standoutQuotes} accentColor={props.accentColor} />
      </Sequence>

      <CaptionStrip cues={props.captionCues} />
    </AbsoluteFill>
  );
};
