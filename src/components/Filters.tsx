"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

interface Props {
  options: { cities: string[]; states: string[]; distances: string[] };
}

export function Filters({ options }: Props) {
  const router = useRouter();
  const params = useSearchParams();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/?${next.toString()}`);
  }

  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
      <div className="relative sm:col-span-2 lg:col-span-1">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
        />
        <input
          className="field pl-9"
          placeholder="Buscar corrida ou cidade..."
          defaultValue={params.get("q") ?? ""}
          onKeyDown={(e) => {
            if (e.key === "Enter")
              update("q", (e.target as HTMLInputElement).value);
          }}
        />
      </div>

      <select
        className="field"
        value={params.get("city") ?? ""}
        onChange={(e) => update("city", e.target.value)}
      >
        <option value="">Todas as cidades</option>
        {options.cities.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <select
        className="field"
        value={params.get("distance") ?? ""}
        onChange={(e) => update("distance", e.target.value)}
      >
        <option value="">Qualquer distância</option>
        {options.distances.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>

      <select
        className="field"
        value={params.get("state") ?? ""}
        onChange={(e) => update("state", e.target.value)}
      >
        <option value="">Estado (UF)</option>
        {options.states.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}
