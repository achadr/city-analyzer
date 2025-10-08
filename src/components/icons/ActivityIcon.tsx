import React from "react";
import { ICON_SIZE } from "../../constants";

type ActivityIconProps = {
  name: string;
  size?: number;
  style?: React.CSSProperties;
};

const ICON_MAP: Record<string, string> = {
  home: "/src/components/icons/home.svg",
  work: "/src/components/icons/work.svg", 
  school: "/src/components/icons/school.svg",
  education: "/src/components/icons/school.svg",
  leisure: "/src/components/icons/leisure.svg"
};

export default function ActivityIcon({ name, size = ICON_SIZE, style }: ActivityIconProps): React.JSX.Element {
  const key = name.toLowerCase();
  const iconPath = ICON_MAP[key] || "/src/components/icons/default.svg";
  
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
