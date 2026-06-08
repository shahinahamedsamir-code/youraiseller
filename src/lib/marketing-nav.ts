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

export function getMarketingSectionHref(
  section: string,
  pathname?: string
): string {
  return `${getMarketingHomePath(pathname)}#${section}`;
}
