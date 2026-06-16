import Link from "next/link";
import { Bookmark, Navigation } from "lucide-react";
import { getCurrentUser } from "@/lib/currentUser";
import { logoutUser } from "@/app/conta/actions";

const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "Sua Próxima Corrida";

export async function Header() {
  const user = await getCurrentUser();
  const firstName = user?.name?.split(" ")[0] ?? user?.email?.split("@")[0];

  return (
    <header className="sticky top-0 z-20 border-b border-ink-800 bg-ink-950/80 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="text-[18px] font-bold tracking-tight">
          <span className="text-neutral-50">Sua </span>
          <span className="bg-gradient-to-r from-accent to-amber-300 bg-clip-text text-transparent">
            Próxima Corrida
          </span>
        </Link>

        {/* Navegação + auth */}
        <nav className="flex items-center gap-5 text-sm text-neutral-400">
          <Link href="/" className="hidden transition hover:text-neutral-100 sm:inline">
            Corridas
          </Link>
          <Link
            href="/perto"
            className="flex items-center gap-1.5 transition hover:text-neutral-100"
          >
            <Navigation size={14} />
            <span className="hidden sm:inline">Perto de mim</span>
          </Link>

          {user ? (
            <>
              <Link
                href="/minhas-corridas"
                className="flex items-center gap-1.5 transition hover:text-neutral-100"
              >
                <Bookmark size={15} />
                <span className="hidden sm:inline">Minhas corridas</span>
              </Link>
              <span className="hidden text-neutral-500 md:inline">
                Olá, <span className="text-neutral-200">{firstName}</span>
              </span>
              <form action={logoutUser}>
                <button className="transition hover:text-neutral-100">Sair</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/entrar" className="transition hover:text-neutral-100">
                Entrar
              </Link>
              <Link
                href="/cadastro"
                className="rounded-lg bg-gradient-to-br from-accent to-amber-400 px-3.5 py-1.5 font-medium text-ink-950 transition hover:opacity-90"
              >
                Criar conta
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
