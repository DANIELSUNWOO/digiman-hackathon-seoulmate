import React from "react";
import { View } from "react-native";
import { SvgXml } from "react-native-svg";

// Fluent-style speech balloon SVG asset from design-v4/04_assets/illustrations/speech_balloon.svg.
const SPEECH_BALLOON_SVG =
  '<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">\n<path d="M16 3.5C23.18 3.5 29 8.65 29 15C29 21.35 23.18 26.5 16 26.5C14.47 26.5 13 26.27 11.64 25.84L6.6 28.3C5.82 28.68 4.97 27.94 5.25 27.12L6.62 23.08C4.37 21.03 3 18.16 3 15C3 8.65 8.82 3.5 16 3.5Z" fill="#477EFF"/>\n<path d="M16 3.5C23.18 3.5 29 8.65 29 15C29 15.4 28.98 15.8 28.94 16.19C28.3 10.43 22.76 5.9 16 5.9C9.24 5.9 3.7 10.43 3.06 16.19C3.02 15.8 3 15.4 3 15C3 8.65 8.82 3.5 16 3.5Z" fill="#6E9BFF"/>\n<circle cx="10.5" cy="15" r="2" fill="#fff"/>\n<circle cx="16" cy="15" r="2" fill="#fff"/>\n<circle cx="21.5" cy="15" r="2" fill="#fff"/>\n</svg>\n';

export function ChatIllustration({ size = 96 }: { size?: number }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <SvgXml xml={SPEECH_BALLOON_SVG} width={size} height={size} />
    </View>
  );
}
