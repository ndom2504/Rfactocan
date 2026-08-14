"use client";

import Link from "next/link";
import { splitLinkify } from "@/lib/linkify";

const linkClass =
  "break-all font-medium text-[var(--accent)] underline underline-offset-2 hover:opacity-80";

type Props = {
  text: string;
};

export function LinkedText({ text }: Props) {
  const parts = splitLinkify(text);
  return (
    <>
      {parts.map((part, i) => {
        if (part.type === "text") {
          return <span key={i}>{part.value}</span>;
        }
        if (part.type === "internal") {
          return (
            <Link key={i} href={part.href} className={linkClass}>
              {part.value}
            </Link>
          );
        }
        return (
          <a
            key={i}
            href={part.href}
            target={part.type === "email" ? undefined : "_blank"}
            rel={part.type === "email" ? undefined : "noopener noreferrer"}
            className={linkClass}
          >
            {part.value}
          </a>
        );
      })}
    </>
  );
}
