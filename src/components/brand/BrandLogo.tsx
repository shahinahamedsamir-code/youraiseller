import Image from "next/image";
import clsx from "clsx";
import { BRAND_ALT, BRAND_LOGO, BRAND_TAGLINE } from "@/lib/brand";

const SIZE_MAP = {
  xs: { box: "h-8 w-8 rounded-lg", img: 32, name: "text-sm", tag: "text-[9px]" },
  sm: { box: "h-9 w-9 rounded-xl", img: 36, name: "text-sm", tag: "text-[9px]" },
  md: { box: "h-11 w-11 rounded-2xl", img: 44, name: "text-lg", tag: "text-[10px]" },
  lg: { box: "h-14 w-14 rounded-2xl", img: 56, name: "text-xl", tag: "text-[10px]" },
  xl: { box: "h-20 w-20 rounded-3xl", img: 80, name: "text-2xl", tag: "text-xs" },
} as const;

type BrandLogoProps = {
  size?: keyof typeof SIZE_MAP;
  showText?: boolean;
  subtitle?: string;
  className?: string;
  textClassName?: string;
  priority?: boolean;
};

export function BrandLogo({
  size = "md",
  showText = true,
  subtitle = BRAND_TAGLINE,
  className,
  textClassName,
  priority = false,
}: BrandLogoProps) {
  const s = SIZE_MAP[size];

  return (
    <div className={clsx("flex items-center gap-3", className)}>
      <div
        className={clsx(
          s.box,
          "relative shrink-0 overflow-hidden shadow-lg shadow-indigo-300/30"
        )}
      >
        <Image
          src={BRAND_LOGO}
          alt={BRAND_ALT}
          width={s.img}
          height={s.img}
          priority={priority}
          className="h-full w-full object-cover"
        />
      </div>
      {showText ? (
        <div className={textClassName}>
          <p
            className={clsx(
              s.name,
              "font-extrabold tracking-tight",
              !textClassName && "text-slate-900"
            )}
          >
            Your<span className="text-indigo-600">AI</span> Seller
          </p>
          {subtitle ? (
            <p
              className={clsx(
                s.tag,
                "font-bold uppercase tracking-[0.18em]",
                !textClassName && "text-slate-400"
              )}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function BrandMark({
  size = "md",
  className,
  priority = false,
}: Pick<BrandLogoProps, "size" | "className" | "priority">) {
  const s = SIZE_MAP[size];
  return (
    <div
      className={clsx(
        s.box,
        "relative shrink-0 overflow-hidden shadow-lg shadow-indigo-300/30",
        className
      )}
    >
      <Image
        src={BRAND_LOGO}
        alt={BRAND_ALT}
        width={s.img}
        height={s.img}
        priority={priority}
        className="h-full w-full object-cover"
      />
    </div>
  );
}
