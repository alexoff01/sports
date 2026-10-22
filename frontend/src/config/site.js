// Single source of truth for contact and social values.
// Any value set to TODO_CONFIRM is treated as unconfirmed and never rendered.
const TODO_CONFIRM = "TODO_CONFIRM";

export const SITE = {
  person: "Alex Cearnau",
  brand: "Mativo Hub",
  tagline: "Sports Lover. Digital Creator.",
  url: process.env.REACT_APP_SITE_URL,
  city: "Oradea, Romania",
  availability: "Based in Oradea, Romania — open to remote and international opportunities",
  // Stored reversed and split so the address never appears verbatim in HTML or the bundle.
  emailParts: ["uanraecmxela", "moc.liamg"],
  qualification: {
    title: "Social Media in Sports",
    issuer: "FC Barcelona Innovation Hub",
    year: "2025",
  },
  socials: [
    { id: "linkedin", label: "LinkedIn", url: TODO_CONFIRM },
    { id: "instagram", label: "Instagram", url: TODO_CONFIRM },
    { id: "tiktok", label: "TikTok", url: TODO_CONFIRM },
    { id: "x", label: "X", url: TODO_CONFIRM },
  ],
  // TODO_CONFIRM: neutral placeholder until Alex approves a statement.
  quote: "Every match carries a story. The work is finding it and telling it well.",
  cookiePolicyVersion: "1.0",
  legalUpdated: "22 October 2026",
};

export const confirmedSocials = SITE.socials.filter((s) => /^https:\/\/\S+$/.test(s.url));

export const NAV = [
  { to: "/", label: "Home" },
  { to: "/projects", label: "Projects" },
  { to: "/about", label: "About Me" },
  { to: "/contact", label: "Contact" },
];
