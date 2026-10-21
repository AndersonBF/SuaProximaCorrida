import Link from "next/link";
import { isAuthenticated } from "@/lib/auth";
import { logout } from "./actions";

export const dynamic = "force-dynamic";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authed = isAuthenticated();
  return (
    <div className="container-page">
      <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-ink-800 pb-4">
        <div className="contents">
          <h1 className="w-full text-lg font-semibold tracking-tight text-neutral-100 sm:w-auto">
            Painel Admin
          </h1>
          {authed && (
            <>
              <Link
                href="/admin"
                className="text-sm text-neutral-500 transition hover:text-neutral-200"
              >
                Corridas
              </Link>
              <Link
                href="/admin/assessorias"
                className="text-sm text-neutral-500 transition hover:text-neutral-200"
              >
                Assessorias
              </Link>
              <Link
                href="/admin/acessos"
                className="text-sm text-neutral-500 transition hover:text-neutral-200"
              >
                Acessos
              </Link>
            </>
          )}
          <Link
            href="/"
            className="text-sm text-neutral-500 transition hover:text-neutral-200"
          >
            ver site →
          </Link>
        </div>
        {authed && (
          <form action={logout} className="ml-auto">
            <button className="text-sm text-neutral-500 transition hover:text-neutral-200">
              Sair
            </button>
          </form>
        )}
      </div>
      {children}
    </div>
  );
}
