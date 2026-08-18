export const FOOTER_COLUMNS = [
  {
    heading: "Services",
    links: [
      { label: "Book Appointment", type: "route", target: "/appointment" },
      { label: "Home Collection", type: "route", target: "/homesample" },
      { label: "View Reports", type: "route", target: "/report" },
      { label: "Test List", type: "route", target: "/medicaltest" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About Us", type: "home-section", target: "about" },
      { label: "Contact", type: "home-section", target: "contact" },
      { label: "Privacy Policy", type: "home-section", target: "privacy" },
      { label: "Terms", type: "home-section", target: "terms" },
    ],
  },
  {
    heading: "Reach Us",
    links: [
      { label: "H-9, Islamabad", type: "map", target: "H-9 Islamabad T-City Lab" },
      { label: "info@tcitylab.pk", type: "mail", target: "info@tcitylab.pk" },
      { label: "+92 300 1234567", type: "tel", target: "+923001234567" },
      { label: "Mon-Sat 8am-8pm", type: "home-section", target: "contact" },
    ],
  },
];

export function performFooterAction(link, navigate) {
  if (!link) return;

  if (link.type === "route") {
    navigate(link.target);
    return;
  }

  if (link.type === "home-section") {
    navigate({ pathname: "/", hash: `#${link.target}` });
    window.setTimeout(() => {
      document.getElementById(link.target)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return;
  }

  if (link.type === "mail") {
    window.location.href = `mailto:${link.target}`;
    return;
  }

  if (link.type === "tel") {
    window.location.href = `tel:${link.target}`;
    return;
  }

  if (link.type === "map") {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(link.target)}`, "_blank", "noopener,noreferrer");
  }
}
