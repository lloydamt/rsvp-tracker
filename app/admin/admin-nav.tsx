import Link from "next/link";

export function AdminNav({ active }: { active: "list" | "find" }) {
  return (
    <nav className="adminNav" aria-label="Admin sections">
      <Link href="/admin" className={active === "list" ? "active" : undefined} aria-current={active === "list" ? "page" : undefined}>Guest list</Link>
      <Link href="/admin/find" className={active === "find" ? "active" : undefined} aria-current={active === "find" ? "page" : undefined}>Find</Link>
    </nav>
  );
}
