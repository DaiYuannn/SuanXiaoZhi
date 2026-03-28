import React from "react";

type SurfaceCardTone = "mobile" | "admin";

interface SurfaceCardProps {
  children: React.ReactNode;
  className?: string;
  tone?: SurfaceCardTone;
  interactive?: boolean;
}

const SurfaceCard: React.FC<SurfaceCardProps> = ({
  children,
  className = "",
  tone = "admin",
  interactive = false
}) => {
  const toneClass = tone === "mobile" ? "surface-card-mobile" : "surface-card-admin";
  const interactiveClass = interactive ? "surface-card-interactive" : "";

  return <div className={`${toneClass} ${interactiveClass} ${className}`.trim()}>{children}</div>;
};

export default SurfaceCard;
