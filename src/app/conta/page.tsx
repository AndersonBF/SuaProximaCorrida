import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/currentUser";
import { ProfileForm, PasswordForm } from "@/components/AccountForms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Minha conta" };

export default async function ContaPage({
  searchParams,
}: {
  searchParams: { ok?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");

  return (
    <div className="container-page flex max-w-xl flex-col gap-7">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">
          Minha conta
        </h1>
        <p className="text-sm text-neutral-500">
          Gerencie seus dados e sua senha.{" "}
          <Link href="/minhas-corridas" className="text-accent hover:text-accent-soft">
            Ver minhas corridas
          </Link>
        </p>
      </div>

      {searchParams.ok === "senha" && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
          Senha redefinida com sucesso. Você já está logado.
        </p>
      )}

      <section className="flex flex-col gap-4 rounded-2xl border border-ink-800 bg-ink-900 p-6">
        <h2 className="text-base font-semibold text-neutral-100">Dados pessoais</h2>
        <ProfileForm name={user.name ?? ""} email={user.email} />
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-ink-800 bg-ink-900 p-6">
        <h2 className="text-base font-semibold text-neutral-100">Alterar senha</h2>
        <PasswordForm />
      </section>
    </div>
  );
}
