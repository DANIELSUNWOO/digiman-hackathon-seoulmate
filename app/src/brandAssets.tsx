import React from "react";
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Path,
  Rect,
  Text as SvgText,
  TextPath,
} from "react-native-svg";
import { theme } from "./theme";

export function LogoMark({
  size = 24,
  variant = "blue",
}: {
  size?: number;
  variant?: "blue" | "white";
}) {
  const strokeColor =
    variant === "white" ? theme.color.surface : theme.color.brand;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      accessibilityElementsHidden
    >
      <Path
        d="M31.5 11.5H21a6.75 6.75 0 0 0 0 13.5h6a6.75 6.75 0 0 1 0 13.5H14.5"
        fill="none"
        stroke={strokeColor}
        strokeWidth={6.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={38.2} cy={11.5} r={3.9} fill={theme.color.accent} />
    </Svg>
  );
}

export function FlagJpIllustration({ size = 44 }: { size?: number }) {
  const height = Math.round((size * 3) / 4);
  return (
    <Svg
      width={size}
      height={height}
      viewBox="0 0 640 480"
      accessibilityElementsHidden
    >
      <Defs>
        <ClipPath id="jpFlagClip">
          <Rect x={0} y={0} width={640} height={480} rx={56} />
        </ClipPath>
      </Defs>
      <G clipPath="url(#jpFlagClip)">
        <Rect x={0} y={0} width={640} height={480} fill="#F4F6FA" />
        <Circle cx={320} cy={240} r={144} fill="#FF8FA8" />
      </G>
    </Svg>
  );
}

export function FlagKrIllustration({ size = 44 }: { size?: number }) {
  const height = Math.round((size * 3) / 4);
  return (
    <Svg
      width={size}
      height={height}
      viewBox="0 0 640 480"
      accessibilityElementsHidden
    >
      <Defs>
        <ClipPath id="krFlagClip">
          <Rect x={0} y={0} width={640} height={480} rx={56} />
        </ClipPath>
      </Defs>
      <G clipPath="url(#krFlagClip)">
        <Rect x={0} y={0} width={640} height={480} fill="#F4F6FA" />
        <G transform="translate(320 240)">
          <G transform="rotate(-56.3)">
            <Path d="M0 -120 A120 120 0 0 1 0 120 Z" fill="#FF8FA8" />
            <Path d="M0 -120 A120 120 0 0 0 0 120 Z" fill="#6E9BFF" />
            <Circle cx={0} cy={-60} r={60} fill="#FF8FA8" />
            <Circle cx={0} cy={60} r={60} fill="#6E9BFF" />
            <Rect x={-48} y={-196} width={96} height={16} fill="#3A3F4B" />
            <Rect x={-48} y={-172} width={96} height={16} fill="#3A3F4B" />
            <Rect x={-48} y={-148} width={96} height={16} fill="#3A3F4B" />
            <Rect x={-48} y={132} width={42} height={16} fill="#3A3F4B" />
            <Rect x={6} y={132} width={42} height={16} fill="#3A3F4B" />
            <Rect x={-48} y={156} width={42} height={16} fill="#3A3F4B" />
            <Rect x={6} y={156} width={42} height={16} fill="#3A3F4B" />
            <Rect x={-48} y={180} width={42} height={16} fill="#3A3F4B" />
            <Rect x={6} y={180} width={42} height={16} fill="#3A3F4B" />
          </G>
          <G transform="rotate(56.3)">
            <Rect x={-48} y={-196} width={42} height={16} fill="#3A3F4B" />
            <Rect x={6} y={-196} width={42} height={16} fill="#3A3F4B" />
            <Rect x={-48} y={-172} width={96} height={16} fill="#3A3F4B" />
            <Rect x={-48} y={-148} width={42} height={16} fill="#3A3F4B" />
            <Rect x={6} y={-148} width={42} height={16} fill="#3A3F4B" />
            <Rect x={-48} y={132} width={96} height={16} fill="#3A3F4B" />
            <Rect x={-48} y={156} width={42} height={16} fill="#3A3F4B" />
            <Rect x={6} y={156} width={42} height={16} fill="#3A3F4B" />
            <Rect x={-48} y={180} width={96} height={16} fill="#3A3F4B" />
          </G>
        </G>
      </G>
    </Svg>
  );
}

export function CountryMapIllustration({
  greeting = "안녕!",
  language = "ko",
}: {
  greeting?: string;
  language?: "ko" | "ja";
} = {}) {
  const textFont =
    language === "ja" ? "NotoSansJP_700Bold" : "NotoSansKR_700Bold";
  return (
    <Svg
      width="100%"
      height={168}
      viewBox="0 0 350 168"
      preserveAspectRatio="xMidYMid meet"
      accessibilityElementsHidden
    >
      <Rect x={0} y={0} width={350} height={168} rx={16} fill="#F0F5FF" />
      <Rect x={14} y={12} width={76} height={54} rx={12} fill="#FFFFFF" />
      <Rect x={102} y={10} width={96} height={48} rx={12} fill="#FFFFFF" />
      <Rect x={212} y={14} width={124} height={58} rx={12} fill="#FFFFFF" />
      <Rect x={18} y={80} width={92} height={74} rx={12} fill="#FFFFFF" />
      <Rect x={122} y={70} width={104} height={82} rx={12} fill="#FFFFFF" />
      <Rect x={240} y={84} width={96} height={70} rx={12} fill="#FFFFFF" />
      <Path
        d="M54 52 C88 120, 178 140, 214 64 C232 26, 266 78, 294 114"
        fill="none"
        stroke="#9DBBFF"
        strokeWidth={3}
        strokeDasharray="6 6"
        strokeLinecap="round"
      />
      <G transform="translate(38 22)">
        <Path
          d="M16 0 C7.2 0 0 7.2 0 16 C0 27 16 40 16 40 C16 40 32 27 32 16 C32 7.2 24.8 0 16 0 Z"
          fill="#FFD84D"
        />
        <Circle cx={16} cy={15} r={5.5} fill="#FFFFFF" />
      </G>
      <G transform="translate(200 18)">
        <Path
          d="M18 0 C8.1 0 0 8.1 0 18 C0 30 18 44 18 44 C18 44 36 30 36 18 C36 8.1 27.9 0 18 0 Z"
          fill="#477EFF"
        />
        <Circle cx={18} cy={17} r={6} fill="#FFFFFF" />
      </G>
      <G transform="translate(278 96)">
        <Path
          d="M15 0 C6.7 0 0 6.7 0 15 C0 25 15 37 15 37 C15 37 30 25 30 15 C30 6.7 23.3 0 15 0 Z"
          fill="#6E9BFF"
        />
        <Circle cx={15} cy={14} r={5} fill="#FFFFFF" />
      </G>
      <Rect x={226} y={66} width={96} height={28} rx={14} fill="#477EFF" />
      <SvgText
        x={274}
        y={85}
        fill="#FFFFFF"
        fontFamily={textFont}
        fontSize={12}
        fontWeight="700"
        textAnchor="middle"
      >
        {greeting}
      </SvgText>
    </Svg>
  );
}

export function SplashArcSlogan({
  text,
  fontFamily,
  color = theme.color.labelDesc,
}: {
  text: string;
  fontFamily: string;
  color?: string;
}) {
  return (
    <Svg width={290} height={54} viewBox="0 0 290 54" accessible={false}>
      <Defs>
        <Path id="splashSloganArc" d="M 16 46 Q 145 10 274 46" />
      </Defs>
      <SvgText
        fill={color}
        fontFamily={fontFamily}
        fontSize={16}
        fontWeight="700"
        letterSpacing={1.2}
      >
        <TextPath href="#splashSloganArc" startOffset="50%" textAnchor="middle">
          {text}
        </TextPath>
      </SvgText>
    </Svg>
  );
}
