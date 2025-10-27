import React from "react";
import { ICON_SIZE } from "../../constants";

type ActivityIconProps = {
  name: string;
  size?: number;
  style?: React.CSSProperties;
};

const ICON_MAP: Record<string, string> = {
  home: "/icons/home.svg",
  work: "/icons/work.svg",
  school: "/icons/school.svg",
  education: "/icons/school.svg",
  leisure: "/icons/leisure.svg"
};

export default function ActivityIcon({ name, size = ICON_SIZE, style }: ActivityIconProps): React.JSX.Element {
  const key = name.toLowerCase();
  const iconPath = ICON_MAP[key] || "/icons/default.svg";
  
  const iconStyle: React.CSSProperties = {
    width: size,
    height: size,
    stroke: "currentColor",
    strokeWidth: 2,
    fill: "none",
    ...style
  };

  return (
    <img 
      src={iconPath} 
      alt={name} 
      style={iconStyle}
    />
  );
}
