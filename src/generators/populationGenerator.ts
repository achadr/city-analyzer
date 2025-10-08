import * as turf from "@turf/turf";
import fs from "fs";
import path from "path";
import { Feature, FeatureCollection, Point, Polygon } from "geojson";

type Coordinates = { lat: number; lng: number };

type Activity = {
  name: string;
  startTime: string;
  endTime: string;
  zone: string;
  coordinates: Coordinates;
  transport: string;
};

type Person = {
  id: number;
  age: number;
  sex: "male" | "female";
  firstName: string;
  lastName: string;
  activities: Activity[];
};

const transportMethods = ["personal car", "public transport", "taxi", "uber", "bike", "walk"];
const maleFirstNames = ["Liam", "Noah", "Oliver", "Elijah", "James", "Leo", "Lucas", "Mason", "Ethan", "Louis"];
const femaleFirstNames = ["Emma", "Olivia", "Ava", "Sophia", "Isabella", "Mia", "Charlotte", "Amelia", "Evelyn", "Alice"];
const lastNames = ["Martin", "Bernard", "Thomas", "Petit", "Robert", "Richard", "Durand", "Dubois", "Moreau", "Laurent"];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomPointInPolygon(polygon: Feature<Polygon> | Polygon): Coordinates {
  let point: Feature<Point> = turf.randomPoint(1, { bbox: turf.bbox(polygon) }).features[0] as Feature<Point>;
  while (!turf.booleanPointInPolygon(point, polygon)) {
    point = turf.randomPoint(1, { bbox: turf.bbox(polygon) }).features[0] as Feature<Point>;
  }
  return { lat: point.geometry.coordinates[1], lng: point.geometry.coordinates[0] };
}

function generateActivities(age: number, zonesPolygons: Record<string, Feature<Polygon> | Polygon>): Activity[] {
  const activities: Activity[] = [];
  const activityTimes = [
    { name: "home", startTime: "00:00", endTime: "07:00" },
    { name: age >= 5 && age <= 18 ? "school" : "work", startTime: "08:00", endTime: "17:00" },
    { name: "leisure", startTime: "18:00", endTime: "21:00" },
    { name: "home", startTime: "21:00", endTime: "23:59" }
  ];

  // Generate consistent home coordinates for this person
  const homeZone = randomChoice(Object.keys(zonesPolygons));
  const homePolygon = zonesPolygons[homeZone];
  const homeCoordinates = getRandomPointInPolygon(homePolygon);

  for (const activity of activityTimes) {
    let zone: string;
    let coordinates: Coordinates;
    
    if (activity.name === "home") {
      // Use the same home zone and coordinates for all home activities
      zone = homeZone;
      coordinates = homeCoordinates;
    } else {
      // Generate random zone and coordinates for non-home activities
      zone = randomChoice(Object.keys(zonesPolygons));
      const polygon = zonesPolygons[zone];
      coordinates = getRandomPointInPolygon(polygon);
    }
    
    const allowedTransport = age >= 18 ? transportMethods : transportMethods.filter((t) => t !== "personal car");
    activities.push({
      name: activity.name,
      startTime: activity.startTime,
      endTime: activity.endTime,
      zone,
      coordinates,
      transport: randomChoice(allowedTransport)
    });
  }

  return activities;
}

function loadZones(): Record<string, Feature<Polygon> | Polygon> {
  const geojsonPath = path.resolve(__dirname, "../../data/paris-arrondissements.geojson");
  const geojson = JSON.parse(fs.readFileSync(geojsonPath, "utf-8")) as FeatureCollection;
  const zonesPolygons: Record<string, Feature<Polygon> | Polygon> = {};

  geojson.features.forEach((f, idx) => {
    const feature = f as Feature<Polygon>;
    const props = (feature.properties as any) || {};
    // Use common property names found in the dataset; ensure uniqueness to avoid overwrites
    let zoneName = props.nom ?? props.name ?? props.l_ar ?? props.l_aroff ?? `zone-${idx + 1}`;
    if (zonesPolygons[zoneName]) zoneName = `${zoneName}-${idx + 1}`;
    zonesPolygons[zoneName] = feature.geometry;
  });

  return zonesPolygons;
}

export function generatePopulation(numPeople: number): Person[] {
  const zonesPolygons = loadZones();
  const population: Person[] = [];

  for (let i = 0; i < numPeople; i++) {
    const age = Math.floor(Math.random() * 80) + 1; // Age between 1 and 80
    const sex = Math.random() < 0.5 ? "male" : "female";
    const firstName = sex === "male" ? randomChoice(maleFirstNames) : randomChoice(femaleFirstNames);
    const lastName = randomChoice(lastNames);
    population.push({
      id: i + 1,
      age,
      sex,
      firstName,
      lastName,
      activities: generateActivities(age, zonesPolygons)
    });
  }

  return population;
}

if (require.main === module) {
  const population = generatePopulation(10000);
  const outPath = path.resolve(__dirname, "../../data/population.json");
  fs.writeFileSync(outPath, JSON.stringify(population, null, 2));
  console.log(`Population generated: ${outPath}`);
}
