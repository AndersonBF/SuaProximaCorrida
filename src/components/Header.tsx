import Link from "next/link";
import {
  Bookmark,
  LogOut,
  Navigation,
  Trophy,
  Users,
} from "lucide-react";
import { getCurrentUser } from "@/lib/currentUser";
import { logoutUser } from "@/app/conta/actions";

const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "Sua Próxima Corrida";

const linkCls =
  "flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-1.5 sm:px-3 text-sm text-neutral-400 transition hover:bg-ink-800 hover:text-neutral-50";

export async function Header() {
  const user = await getCurrentUser();
  const firstName = user?.name?.split(" ")[0] ?? user?.email?.split("@")[0];
  const initial = (firstName ?? "?").charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-20 border-b border-ink-800 bg-ink-950/80 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-2 sm:gap-4">
        {/* Logo */}
        <Link
          href="/"
          aria-label={siteName}
          className="shrink-0"
        >
          <span className="whitespace-nowrap text-[15px] font-bold sm:text-[17px] leading-none tracking-tight">
            <span className="text-neutral-50">Sua </span>
            <span className="bg-gradient-to-r from-accent to-amber-300 bg-clip-text text-transparent">
              Próxima Corrida
            </span>
          </span>
        </Link>

        {/* Navegação + auth */}
        <nav className="flex items-center gap-1">
          <Link href="/" className={`${linkCls} hidden sm:flex`}>
            Corridas
          </Link>
          <Link href="/resultados" className={linkCls}>
            <Trophy size={15} />
            <span className="hidden sm:inline">Resultados</span>
          </Link>
          <Link href="/assessorias" className={`${linkCls} hidden md:flex`}>
            <Users size={15} />
            Assessorias
          </Link>
          <Link href="/perto" className={linkCls}>
            <Navigation size={15} />
            <span className="hidden lg:inline">Perto de mim</span>
          </Link>

          <span className="mx-2 hidden h-6 w-px bg-ink-700 sm:block" />

          {user ? (
            <>
              <Link href="/minhas-corridas" className={linkCls}>
                <Bookmark size={15} />
                <span className="hidden lg:inline">Minhas corridas</span>
              </Link>
              <Link
                href="/conta"
                className="ml-1 flex items-center gap-2 rounded-full border border-ink-700 bg-ink-900 py-1 pl-1 pr-3 text-sm text-neutral-200 transition hover:border-accent/50"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-accent to-amber-400 text-xs font-bold text-ink-950">
                  {initial}
                </span>
                <span className="hidden max-w-[90px] truncate md:inline">
                  {firstName}
                </span>
              </Link>
              <form action={logoutUser}>
                <button
                  aria-label="Sair"
                  title="Sair"
                  className="ml-1 flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 transition hover:bg-ink-800 hover:text-neutral-50"
                >
                  <LogOut size={15} />
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/entrar" className={linkCls}>
                Entrar
              </Link>
              <Link
                href="/cadastro"
                className="ml-1 whitespace-nowrap rounded-full bg-gradient-to-br from-accent to-amber-400 px-3 py-1.5 sm:px-4 text-sm font-semibold text-ink-950 transition hover:opacity-90"
              >
                Criar<span className="hidden sm:inline"> conta</span>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
