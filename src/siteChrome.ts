import { brandLockup } from "./branding";
import { footerAttribution } from "./sources";

export const navItems = [
  { id: "browser", href: "#/browser", label: "Browser" },
  { id: "how-it-works", href: "#/how-it-works", label: "How it works" },
] as const;
export type NavId = (typeof navItems)[number]["id"];

/** The standard header: brand and site navigation. Every page except the viewer uses it. */
export function siteHeader(current?: NavId) {
  return `<header class="site-header"><div class="site-header-inner"><a class="site-brand" href="#/" aria-label="Fabrica home">${brandLockup}</a><nav class="site-nav" aria-label="Main navigation">${navItems.map(item => `<a href="${item.href}"${item.id === current ? ' aria-current="page"' : ""}>${item.label}</a>`).join("")}</nav></div></header>`;
}

export const siteFooter = `<footer class="site-footer"><p>${footerAttribution}</p><a href="#/credits">Sources &amp; credits</a></footer>`;

/** Skip link for keyboard users. Hash routing owns location.hash, so binding moves focus instead of navigating. */
export const skipLink = (targetId: string) => `<a class="skip-link" href="#${targetId}">Skip to main content</a>`;
export function bindSkipLink(root: HTMLElement) {
  const link = root.querySelector<HTMLAnchorElement>(".skip-link");
  link?.addEventListener("click", event => {
    event.preventDefault();
    const main = root.querySelector<HTMLElement>(`#${link.hash.slice(1)}`);
    main?.setAttribute("tabindex", "-1");
    main?.focus();
  });
}
