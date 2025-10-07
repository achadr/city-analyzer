import * as turf from "@turf/turf";

function main(): void {
  const pointA = turf.point([0, 0]);
  const pointB = turf.point([1, 1]);
  const distanceKm = turf.distance(pointA, pointB, { units: "kilometers" });

  console.log(`Distance between A and B: ${distanceKm.toFixed(3)} km`);
}

main();


