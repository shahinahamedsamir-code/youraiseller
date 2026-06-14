/** Marketing home — `/` on production, `/marketing` when previewing locally. */
export function getMarketingHomePath(pathname?: string): string {
  if (pathname?.startsWith("/marketing")) return "/marketing";
  return "/";
}

/** Package page — `/packages` on production, `/marketing/packages` locally. */
export function getPackagesPath(pathname?: string): string {
  if (pathname?.startsWith("/marketing")) return "/marketing/packages";
  return "/packages";
}

/** Feature pages — `/features` on production, `/marketing/features` locally. */
export function getFeaturesPath(pathname?: string): string {
  if (pathname?.startsWith("/marketing")) return "/marketing/features";
  return "/features";
}

export function getMarketingSectionHref(
  section: string,
  pathname?: string
): string {
  return `${getMarketingHomePath(pathname)}#${section}`;
}
