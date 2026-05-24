import { useState } from "react";
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { V3Icon } from "./Icon";
import type { V3IconName } from "./Icon";

export type V3Btn3DColor = "yellow" | "mint" | "navy" | "red" | "white" | "grey" | "black" | "copper";

export function V3Btn3D({
  color = "grey",
  size = "md",
  icon,
  iconNode,
  label,
  pressed = false,
  w,
  h,
  maxW,
  fluid = false,
  style,
  className = "",
  onClick,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "color"> & {
  color?: V3Btn3DColor;
  size?: "sm" | "md" | "lg" | "xl";
  icon?: V3IconName;
  iconNode?: ReactNode;
  label?: ReactNode;
  pressed?: boolean;
  w?: number;
  h?: number;
  maxW?: number;
  fluid?: boolean;
  style?: CSSProperties;
}) {
  const [activePress, setActivePress] = useState(false);
  const inlineStyle = {
    ...style,
    "--btn3d-w": w ? `${w}px` : maxW ? `${maxW}px` : undefined,
    "--btn3d-h": h ? `${h}px` : undefined,
    "--btn3d-max-w": maxW ? `${maxW}px` : undefined
  } as CSSProperties;

  return (
    <button
      {...props}
      className={`btn3d btn3d-${color} btn3d-${size}${pressed || activePress ? " is-pressed" : ""}${fluid ? " is-fluid" : ""}${className ? ` ${className}` : ""}`}
      onClick={(event) => {
        setActivePress(true);
        window.setTimeout(() => setActivePress(false), 80);
        onClick?.(event);
      }}
      style={inlineStyle}
      type={props.type || "button"}
    >
      <span className="btn3d-side" />
      <span className="btn3d-face">
        {iconNode || (icon ? <V3Icon name={icon} size={12} /> : null)}
        {label !== undefined && <span className="btn3d-label">{label}</span>}
      </span>
    </button>
  );
}
