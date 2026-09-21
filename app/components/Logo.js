import { LOGO_SRC } from "../lib/config";

export default function Logo({ className = "", size = 32, alt = "Fades" }) {
  return (
    <img
      src={LOGO_SRC}
      alt={alt}
      className={`fades-logo ${className}`}
      style={{
        width: size,
        height: "auto",
        objectFit: "contain",
      }}
    />
  );
}
