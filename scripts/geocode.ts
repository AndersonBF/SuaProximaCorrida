import "dotenv/config";
import { prisma } from "../src/lib/prisma";

/**
 * Preenche latitude/longitude das corridas geocodificando a cidade via
 * Nominatim (OpenStreetMap). Geocodifica cada cidade uma única vez (cache),
 * respeitando o limite de ~1 req/s do serviço público.
 *
 * Uso: npm run geocode
 */
const UA = "CorraMelhor/0.1 (agregador de corridas; contato@corramelhor.local)";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function geocodeCity(city: string, state: string) {
  const q = encodeURIComponent(`${city}, ${state}, Brasil`);
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`;
  const res = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" } });
  if (!res.ok) return null;
  const data: Array<{ lat: string; lon: string }> = await res.json();
  if (!data.length) return null;
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
}

async function main() {
  // cidades de corridas ainda sem coordenadas
  const races = await prisma.race.findMany({
    where: { latitude: null },
    select: { city: true, state: true },
  });
  const cities = Array.from(
    new Map(races.map((r) => [`${r.city}|${r.state}`, r])).values()
  );

  console.log(`\n🌍 Geocodificando ${cities.length} cidade(s)...\n`);
  let ok = 0;
  for (const { city, state } of cities) {
    try {
      const geo = await geocodeCity(city, state);
      if (geo) {
        const r = await prisma.race.updateMany({
          where: { city, state, latitude: null },
          data: { latitude: geo.lat, longitude: geo.lon },
        });
        ok++;
        console.log(`  ✓ ${city}/${state} (${geo.lat.toFixed(3)}, ${geo.lon.toFixed(3)}) → ${r.count} corrida(s)`);
      } else {
        console.log(`  ✗ ${city}/${state}: não encontrado`);
      }
    } catch (e) {
      console.log(`  ✗ ${city}/${state}: ${(e as Error).message}`);
    }
    await sleep(1100); // educado com o Nominatim
  }
  console.log(`\n✅ ${ok}/${cities.length} cidades geocodificadas.\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
