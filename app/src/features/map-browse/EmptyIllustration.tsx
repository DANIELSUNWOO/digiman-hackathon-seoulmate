import React from "react";
import { SvgXml } from "react-native-svg";
const ghost =
  '<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">\n<path d="M16 3C10.2 3 6 7.4 6 13.2V27.4C6 28.3 7 28.8 7.7 28.2L9.6 26.6C10 26.3 10.6 26.3 11 26.6L13.2 28.4C13.6 28.7 14.2 28.7 14.6 28.4L16 27.2L17.4 28.4C17.8 28.7 18.4 28.7 18.8 28.4L21 26.6C21.4 26.3 22 26.3 22.4 26.6L24.3 28.2C25 28.8 26 28.3 26 27.4V13.2C26 7.4 21.8 3 16 3Z" fill="#D9E0EB"/>\n<path d="M16 3C21.8 3 26 7.4 26 13.2V15C26 9.4 21.8 5.4 16 5.4C10.2 5.4 6 9.4 6 15V13.2C6 7.4 10.2 3 16 3Z" fill="#E9EDF4"/>\n<circle cx="12" cy="13.5" r="1.8" fill="#3A3F4B"/><circle cx="20" cy="13.5" r="1.8" fill="#3A3F4B"/>\n<ellipse cx="16" cy="19" rx="2.4" ry="2.8" fill="#3A3F4B"/>\n<circle cx="9.6" cy="17" r="1.5" fill="#FFB3C4"/><circle cx="22.4" cy="17" r="1.5" fill="#FFB3C4"/>\n</svg>\n';
export function EmptyIllustration() {
  return <SvgXml xml={ghost} width={96} height={96} />;
}
