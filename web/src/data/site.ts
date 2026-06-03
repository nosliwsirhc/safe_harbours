// Central site data: nav, contact details, org facts.
// Mirrors the real Safe Harbours content (www.safeharbours.ca).

export const site = {
  name: 'Safe Harbours',
  legalName: 'Safe Harbours Family Treatment Homes',
  tagline: 'Ontario Foster Care',
  url: 'https://www.safeharbours.ca',
  phone: '905-294-2137',
  phoneHref: 'tel:+19052942137',
  email: 'info@safeharbours.ca',
  emailHref: 'mailto:info@safeharbours.ca',
  recruitmentEmail: 'recruitment@safeharbours.ca',
  address: {
    street: '517 Upper Sherman Ave.',
    city: 'Hamilton',
    region: 'Ontario',
    postal: 'L8V 3L7',
  },
  social: {
    facebook: 'https://www.facebook.com/profile.php?id=100081716174450',
    instagram: 'https://www.instagram.com/safe_harbours/',
    linkedin: 'https://www.linkedin.com/company/safe-harbours-family-treatment-homes/',
  },
  // Sister agency (shares the Hamilton office).
  sisterAgency: { name: "Annie's Havens", url: 'https://www.annieshavens.ca' },
} as const;

export type NavItem = {
  label: string;
  href?: string;
  children?: { label: string; href: string }[];
};

export const nav: NavItem[] = [
  { label: 'About Fostering', href: '/about-fostering' },
  { label: 'Become a Foster Parent', href: '/become-a-foster-parent' },
  { label: 'Our Story', href: '/our-story' },
  { label: 'Careers', href: '/careers' },
  {
    label: 'Program Description',
    href: '/program-description',
    children: [
      { label: 'Program Description', href: '/program-description' },
      { label: 'Complaints', href: '/program-description/complaints' },
    ],
  },
  { label: 'Resources', href: '/resources' },
  { label: 'Contact Us', href: '/contact-us' },
];

// Footer link groups.
export const footerNav = {
  explore: [
    { label: 'About Fostering', href: '/about-fostering' },
    { label: 'Become a Foster Parent', href: '/become-a-foster-parent' },
    { label: 'Our Story', href: '/our-story' },
    { label: 'Careers', href: '/careers' },
  ],
  more: [
    { label: 'Program Description', href: '/program-description' },
    { label: 'Complaints', href: '/program-description/complaints' },
    { label: 'Resources', href: '/resources' },
    { label: 'Contact Us', href: '/contact-us' },
  ],
  legal: [
    { label: 'Terms & Conditions', href: '/terms-conditions' },
    { label: 'Privacy Policy', href: '/privacy-policy' },
  ],
};
