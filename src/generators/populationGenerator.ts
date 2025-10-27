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

function weightedChoice<T>(options: { value: T; weight: number }[]): T {
  const totalWeight = options.reduce((sum, opt) => sum + opt.weight, 0);
  let random = Math.random() * totalWeight;

  for (const option of options) {
    if (random < option.weight) return option.value;
    random -= option.weight;
  }

  return options[options.length - 1].value;
}

function getRandomPointInPolygon(polygon: Feature<Polygon> | Polygon): Coordinates {
  let point: Feature<Point> = turf.randomPoint(1, { bbox: turf.bbox(polygon) }).features[0] as Feature<Point>;
  while (!turf.booleanPointInPolygon(point, polygon)) {
    point = turf.randomPoint(1, { bbox: turf.bbox(polygon) }).features[0] as Feature<Point>;
  }
  return { lat: point.geometry.coordinates[1], lng: point.geometry.coordinates[0] };
}

function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const from = turf.point([coord1.lng, coord1.lat]);
  const to = turf.point([coord2.lng, coord2.lat]);
  return turf.distance(from, to, { units: 'kilometers' });
}

function selectTransport(distance: number, age: number): string {
  // Children (< 18) cannot drive personal cars
  if (age < 18) {
    if (distance < 1) return weightedChoice([
      { value: "walk", weight: 60 },
      { value: "bike", weight: 30 },
      { value: "public transport", weight: 10 }
    ]);
    if (distance < 3) return weightedChoice([
      { value: "bike", weight: 40 },
      { value: "public transport", weight: 50 },
      { value: "walk", weight: 10 }
    ]);
    return weightedChoice([
      { value: "public transport", weight: 80 },
      { value: "taxi", weight: 15 },
      { value: "uber", weight: 5 }
    ]);
  }

  // Adults - distance-based transport selection
  if (distance < 0.5) {
    return weightedChoice([
      { value: "walk", weight: 70 },
      { value: "bike", weight: 20 },
      { value: "public transport", weight: 10 }
    ]);
  }

  if (distance < 2) {
    return weightedChoice([
      { value: "walk", weight: 30 },
      { value: "bike", weight: 35 },
      { value: "public transport", weight: 25 },
      { value: "personal car", weight: 10 }
    ]);
  }

  if (distance < 5) {
    return weightedChoice([
      { value: "bike", weight: 25 },
      { value: "public transport", weight: 40 },
      { value: "personal car", weight: 30 },
      { value: "uber", weight: 3 },
      { value: "taxi", weight: 2 }
    ]);
  }

  // Long distance (> 5km)
  return weightedChoice([
    { value: "public transport", weight: 45 },
    { value: "personal car", weight: 40 },
    { value: "uber", weight: 8 },
    { value: "taxi", weight: 5 },
    { value: "bike", weight: 2 }
  ]);
}

function generateRealisticTime(baseHour: number, baseMinute: number, variationMinutes: number): string {
  const totalMinutes = baseHour * 60 + baseMinute + Math.floor(Math.random() * variationMinutes * 2) - variationMinutes;
  // Properly handle negative values and wrap around 24 hours (0-1439 minutes)
  const normalizedMinutes = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalizedMinutes / 60);
  const minutes = normalizedMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function generateActivities(age: number, zonesPolygons: Record<string, Feature<Polygon> | Polygon>): Activity[] {
  const activities: Activity[] = [];

  // Generate consistent home coordinates for this person
  const homeZone = randomChoice(Object.keys(zonesPolygons));
  const homePolygon = zonesPolygons[homeZone];
  const homeCoordinates = getRandomPointInPolygon(homePolygon);

  // Define activity patterns based on age groups
  let activitySchedule: { name: string; baseStart: [number, number]; baseEnd: [number, number]; variation: number }[];

  if (age < 3) {
    // Babies/toddlers - mostly at home
    activitySchedule = [
      { name: "home", baseStart: [0, 0], baseEnd: [23, 59], variation: 0 }
    ];
  } else if (age >= 3 && age <= 5) {
    // Pre-school children
    activitySchedule = [
      { name: "home", baseStart: [0, 0], baseEnd: [8, 30], variation: 30 },
      { name: "school", baseStart: [8, 30], baseEnd: [16, 0], variation: 30 },
      { name: "leisure", baseStart: [16, 30], baseEnd: [19, 0], variation: 60 },
      { name: "home", baseStart: [19, 30], baseEnd: [23, 59], variation: 30 }
    ];
  } else if (age >= 6 && age <= 18) {
    // School-age children and teenagers
    activitySchedule = [
      { name: "home", baseStart: [0, 0], baseEnd: [7, 30], variation: 30 },
      { name: "school", baseStart: [8, 0], baseEnd: [17, 0], variation: 30 },
      { name: "leisure", baseStart: [17, 30], baseEnd: [20, 0], variation: 60 },
      { name: "home", baseStart: [20, 30], baseEnd: [23, 59], variation: 30 }
    ];
  } else if (age >= 19 && age <= 65) {
    // Working adults
    const employmentRate = 0.85; // 85% employment rate
    if (Math.random() < employmentRate) {
      activitySchedule = [
        { name: "home", baseStart: [0, 0], baseEnd: [7, 0], variation: 60 },
        { name: "work", baseStart: [8, 0], baseEnd: [17, 30], variation: 90 },
        { name: "leisure", baseStart: [18, 0], baseEnd: [21, 0], variation: 90 },
        { name: "home", baseStart: [21, 30], baseEnd: [23, 59], variation: 60 }
      ];
    } else {
      // Unemployed - more varied schedule
      activitySchedule = [
        { name: "home", baseStart: [0, 0], baseEnd: [9, 0], variation: 120 },
        { name: "leisure", baseStart: [10, 0], baseEnd: [13, 0], variation: 90 },
        { name: "home", baseStart: [13, 30], baseEnd: [15, 0], variation: 60 },
        { name: "leisure", baseStart: [15, 30], baseEnd: [19, 0], variation: 90 },
        { name: "home", baseStart: [19, 30], baseEnd: [23, 59], variation: 60 }
      ];
    }
  } else {
    // Retired (> 65)
    activitySchedule = [
      { name: "home", baseStart: [0, 0], baseEnd: [9, 0], variation: 90 },
      { name: "leisure", baseStart: [10, 0], baseEnd: [12, 30], variation: 90 },
      { name: "home", baseStart: [13, 0], baseEnd: [15, 0], variation: 60 },
      { name: "leisure", baseStart: [15, 30], baseEnd: [18, 0], variation: 90 },
      { name: "home", baseStart: [18, 30], baseEnd: [23, 59], variation: 60 }
    ];
  }

  let previousCoordinates = homeCoordinates;

  for (const activity of activitySchedule) {
    let zone: string;
    let coordinates: Coordinates;

    if (activity.name === "home") {
      zone = homeZone;
      coordinates = homeCoordinates;
    } else {
      // For non-home activities, sometimes stay in the same zone (especially for leisure)
      const stayInSameZone = activity.name === "leisure" && Math.random() < 0.3;

      if (stayInSameZone && activities.length > 0) {
        zone = homeZone;
      } else {
        zone = randomChoice(Object.keys(zonesPolygons));
      }

      const polygon = zonesPolygons[zone];
      coordinates = getRandomPointInPolygon(polygon);
    }

    const startTime = generateRealisticTime(activity.baseStart[0], activity.baseStart[1], activity.variation);
    const endTime = generateRealisticTime(activity.baseEnd[0], activity.baseEnd[1], activity.variation);

    // Calculate realistic transport based on distance
    const distance = calculateDistance(previousCoordinates, coordinates);
    const transport = selectTransport(distance, age);

    activities.push({
      name: activity.name,
      startTime,
      endTime,
      zone,
      coordinates,
      transport
    });

    previousCoordinates = coordinates;
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
    let zoneName = props.nom ?? props.name ?? props.l_ar ?? props.l_aroff ?? `zone-${idx + 1}`;
    if (zonesPolygons[zoneName]) zoneName = `${zoneName}-${idx + 1}`;
    zonesPolygons[zoneName] = feature.geometry;
  });

  return zonesPolygons;
}

function generateRealisticAgeDistribution(): number {
  // Balanced age distribution for better activity variety
  const ageGroups = [
    { value: { min: 0, max: 5 }, weight: 8 },      // Young children
    { value: { min: 6, max: 18 }, weight: 20 },    // School age (increased)
    { value: { min: 19, max: 30 }, weight: 18 },   // Young adults
    { value: { min: 31, max: 45 }, weight: 18 },   // Adults (reduced)
    { value: { min: 46, max: 60 }, weight: 18 },   // Middle age (reduced)
    { value: { min: 61, max: 75 }, weight: 12 },   // Retirees
    { value: { min: 76, max: 90 }, weight: 6 }     // Elderly
  ];

  const selectedGroup = weightedChoice(ageGroups);
  return selectedGroup.min + Math.floor(Math.random() * (selectedGroup.max - selectedGroup.min + 1));
}

export function generatePopulation(numPeople: number): Person[] {
  const zonesPolygons = loadZones();
  const population: Person[] = [];

  for (let i = 0; i < numPeople; i++) {
    const age = generateRealisticAgeDistribution();
    const sex = Math.random() < 0.49 ? "male" : "female"; // Slightly more females (realistic)
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
  // Default to 5000 people for production, can be overridden via CLI arg
  const numPeople = parseInt(process.argv[2]) || 5000;
  const population = generatePopulation(numPeople);
  const outPath = path.resolve(__dirname, "../../data/population.json");
  fs.writeFileSync(outPath, JSON.stringify(population, null, 2));
  console.log(`Population generated: ${outPath} (${numPeople} people)`);
}
