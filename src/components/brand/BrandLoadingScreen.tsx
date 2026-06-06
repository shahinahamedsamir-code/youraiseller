"use client";

import Image from "next/image";
import clsx from "clsx";
import { BRAND_ALT, BRAND_LOGO, BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";

type BrandLoadingScreenProps = {
  message?: string;
  className?: string;
  fullScreen?: boolean;
};

export function BrandLoadingScreen({
  message = "Loading dashboard…",
  className,
  fullScreen = true,
}: BrandLoadingScreenProps) {
  return (
    <div
      className={clsx(
        "brand-loader mesh-bg flex flex-col items-center justify-center gap-7 p-6",
        fullScreen && "min-h-screen",
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="brand-loader-glow" aria-hidden />

      <div className="brand-loader-stage">
        <div className="brand-loader-ring" aria-hidden />
        <div className="brand-loader-logo-wrap">
          <div className="brand-loader-logo-halo" aria-hidden />
          <Image
            src={BRAND_LOGO}
            alt={BRAND_ALT}
            width={80}
            height={80}
            priority
            className="brand-loader-logo-img"
          />
        </div>
      </div>

      <div className="brand-loader-copy">
        <p className="brand-loader-title">{BRAND_NAME}</p>
        <p className="brand-loader-tagline">{BRAND_TAGLINE}</p>
        <p className="brand-loader-message">{message}</p>

        <div className="brand-loader-bar" aria-hidden>
          <div className="brand-loader-bar-fill" />
        </div>
      </div>

      <span className="sr-only">
        {BRAND_NAME} — {message}
      </span>
    </div>
  );
}
