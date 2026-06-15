import { notFound } from "next/navigation";
import { RaceForm } from "@/components/RaceForm";
import { requireAuth } from "@/lib/auth";
import { getRaceById } from "@/lib/races";
import { updateRace } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditarCorridaPage({
  params,
}: {
  params: { id: string };
}) {
  requireAuth();
  const race = await getRaceById(params.id);
  if (!race) notFound();

  const action = updateRace.bind(null, race.id);

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-base font-semibold text-neutral-100">
        Editar: {race.name}
      </h2>
      <RaceForm action={action} race={race} />
    </div>
  );
}
