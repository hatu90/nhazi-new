import Image from "next/image";

/** Nhazi house-N mark. Square, so it stays crisp at any size. */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <Image
      src="/icons/logo.png"
      alt=""
      width={size}
      height={size}
      priority
      style={{ borderRadius: Math.round(size * 0.22), flexShrink: 0 }}
    />
  );
}

/** Mark + wordmark, used in headers. */
export function Brand({ size = 28 }: { size?: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
      <Logo size={size} />
      <span>Nhazi</span>
    </span>
  );
}
