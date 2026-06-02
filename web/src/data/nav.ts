// Single source of truth for the site's navigation menus.
//
// These mirror the original WordPress menus exactly. The verbatim `liClass` /
// `id` strings are kept as data (rather than synthesised) so the rendered markup
// stays byte-faithful to the captured theme — several of these classes
// (.site-navigation, .footer-menu, .sub-menu, .menu-item-has-children) are
// styled, so they must be preserved precisely. The numeric `menu-item-NNN`
// tokens are unstyled but harmless and kept for fidelity.
//
// `mainMenu` is shared by the desktop header (SiteHeader) and the mobile
// off-canvas panel (OffCanvasNav) — edit a link once here and both update.

export interface NavItem {
  label: string;
  href: string;
  id: string;            // e.g. "menu-item-136"
  liClass: string;       // exact <li> class, minus the active-state classes
  rel?: string;          // anchor rel attribute, if any
  children?: NavItem[];
}

const POST = 'menu-item menu-item-type-post_type menu-item-object-page';
const CUSTOM = 'menu-item menu-item-type-custom menu-item-object-custom';

// Header primary + mobile off-canvas (header menu).
export const mainMenu: NavItem[] = [
  { label: 'About Fostering', href: '/about-fostering/', id: 'menu-item-136', liClass: `${POST} menu-item-136` },
  { label: 'Become a Foster Parent', href: '/become-a-foster-parent/', id: 'menu-item-137', liClass: `${POST} menu-item-137` },
  { label: 'Our Story', href: '/our-story/', id: 'menu-item-138', liClass: `${POST} menu-item-138` },
  { label: 'Careers', href: '/careers/', id: 'menu-item-443', liClass: `${POST} menu-item-443` },
  {
    label: 'Program Description', href: '/program-description/', id: 'menu-item-576',
    liClass: `${POST} menu-item-has-children menu-item-576`,
    children: [
      { label: 'Complaints', href: '/program-description/complaints/', id: 'menu-item-577', liClass: `${POST} menu-item-577` },
    ],
  },
  { label: 'Resources', href: '/resources/', id: 'menu-item-515', liClass: `${POST} menu-item-515` },
  { label: 'Contact Us', href: '/contact-us/', id: 'menu-item-222', liClass: `${POST} menu-item-222` },
];

// Footer link column (footer menu 1).
export const footerMenu: NavItem[] = [
  { label: 'About Fostering', href: '/about-fostering/', id: 'menu-item-141', liClass: `${POST} menu-item-141` },
  { label: 'Become a Foster Parent', href: '/become-a-foster-parent/', id: 'menu-item-142', liClass: `${POST} menu-item-142` },
  { label: 'Careers', href: '/careers/', id: 'menu-item-256', liClass: `${POST} menu-item-256` },
  { label: 'Resources', href: '/resources/', id: 'menu-item-516', liClass: `${POST} menu-item-516` },
  { label: 'Files', href: 'https://files.safeharbours.ca', id: 'menu-item-files', liClass: CUSTOM },
  { label: 'Terms & Conditions', href: '/terms-conditions/', id: 'menu-item-145', liClass: `terms-item ${POST} menu-item-145` },
  { label: 'Privacy Policy', href: '/privacy-policy/', id: 'menu-item-146', liClass: `${POST} menu-item-privacy-policy menu-item-146`, rel: 'privacy-policy' },
];

// Footer social column (footer menu 2).
export const socialMenu: NavItem[] = [
  { label: 'LinkedIn', href: 'https://ca.linkedin.com/company/safe-harbours-family-treatment-homes?trk=public_profile_topcard-current-company', id: 'menu-item-147', liClass: `${CUSTOM} menu-item-147` },
  { label: 'Facebook', href: 'https://www.facebook.com/profile.php?id=100081716174450', id: 'menu-item-148', liClass: `${CUSTOM} menu-item-148` },
  { label: 'Instagram', href: 'https://www.instagram.com/safe_harbours/', id: 'menu-item-149', liClass: `${CUSTOM} menu-item-149` },
];

// Normalise a path/href for active-state comparison (strip index.html, .html,
// and trailing slash — matching ThemeLayout's cleanPath handling).
export function normalizePath(p: string): string {
  return p.replace(/\/index\.html$/, '/').replace(/\.html$/, '').replace(/\/+$/, '') || '/';
}
