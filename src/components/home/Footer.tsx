import logo from "@/assets/logo.png";
import { Facebook, Instagram, Twitter } from "lucide-react";

const cols = [
  {
    title: "Explore",
    links: ["Barbers", "Nails", "Massage", "Tattoo", "Salons"],
  },
  {
    title: "Company",
    links: ["About", "Careers", "Press", "Contact"],
  },
  {
    title: "Legal",
    links: ["Terms", "Privacy", "Cookies"],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-secondary/40">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <img
              src={logo}
              alt="NLBB — Never Leave Bros Behind"
              className="h-9 w-auto"
            />
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              NLBB helps you find and book trusted beauty pros across Kenya — we
              never leave bros behind.
            </p>
            <div className="mt-5 flex items-center gap-2">
              {[Instagram, Twitter, Facebook].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  aria-label="Social link"
                  className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {cols.map((c) => (
            <div key={c.title}>
              <p className="text-sm font-semibold text-foreground">{c.title}</p>
              <ul className="mt-4 space-y-2.5">
                {c.links.map((l) => (
                  <li key={l}>
                    <a
                      href="#"
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} NLBB. All rights reserved.</p>
          <p>Made with care in Nairobi.</p>
        </div>
      </div>
    </footer>
  );
}
