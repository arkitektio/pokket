import { pathOf, type ModuleDecl, type NavLinkDecl } from "./catalog";

export type ModuleNavGroup = {
  title: string;
  links: NavLinkDecl[];
  /** No link of the group says more than its name: draw it as chips. */
  chips: boolean;
};

export type ModuleNavLayout = { home?: NavLinkDecl; groups: ModuleNavGroup[] };

/**
 * A module's links as its card shows them — orkestrator's `layoutModuleNav`
 * (ModuleNavHover.tsx): the `home` link becomes the header, the rest are
 * grouped by `group` ("Pages" when unnamed) in the order groups first appear.
 */
export const layoutModuleNav = (module: Pick<ModuleDecl, "navLinks">): ModuleNavLayout => {
  const home = module.navLinks.find((link) => link.home);
  const groups: ModuleNavGroup[] = [];
  for (const link of module.navLinks) {
    if (link.home) continue;
    const title = link.group ?? "Pages";
    let group = groups.find((g) => g.title === title);
    if (!group) {
      group = { title, links: [], chips: true };
      groups.push(group);
    }
    group.links.push(link);
    if (link.description) group.chips = false;
  }
  return { home, groups };
};

/**
 * The links a module's home page lists — `layoutModuleNav` less the ones
 * that are the home page itself under another query (mail's mailboxes,
 * bank's views): the page already switches between those with its own chips.
 * Groups left empty go.
 */
export const homePageLinks = (module: Pick<ModuleDecl, "navLinks">): ModuleNavGroup[] => {
  const { home, groups } = layoutModuleNav(module);
  if (!home) return groups;
  const homePath = pathOf(home.route);
  return groups
    .map((group) => ({ ...group, links: group.links.filter((link) => pathOf(link.route) !== homePath) }))
    .filter((group) => group.links.length > 0);
};
