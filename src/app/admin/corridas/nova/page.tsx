import { RaceForm } from "@/components/RaceForm";
import { requireAuth } from "@/lib/auth";
import { createRace } from "../../actions";

export const dynamic = "force-dynamic";

export default function NovaCorridaPage() {
  requireAuth();
  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-base font-semibold text-neutral-100">Nova corrida</h2>
      <RaceForm action={createRace} />
    </div>
  );
}
