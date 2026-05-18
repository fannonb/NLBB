import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import logo from "@/assets/logo.png";

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div
      className="min-h-screen px-4 py-10"
      style={{ background: "var(--gradient-hero)" }}
    >
      <div className="mx-auto max-w-md">
        <Link to="/" className="mx-auto mb-8 flex justify-center">
          <img src={logo} alt="NLBB" className="h-10 w-auto" />
        </Link>
        <div
          className="rounded-2xl border border-border bg-card p-7 shadow-[var(--shadow-elegant)]"
        >
          <h1 className="font-serif text-2xl">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
        {footer ? (
          <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>
        ) : null}
      </div>
    </div>
  );
}
