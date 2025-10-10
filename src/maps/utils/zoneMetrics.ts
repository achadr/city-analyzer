import * as turf from "@turf/turf";
import type { DrawnZone } from "../MapView";

export type ZoneMetrics = {
  totalActivities: number;
  uniqueVisitors: number;
  activitiesByHour: { hour: number; count: number }[];
  ageDistribution: { ageGroup: string; count: number }[];
  activityTypes: { type: string; count: number }[];
};

export function calculateZoneMetrics(
  zone: DrawnZone,
  populationData: any[]
): ZoneMetrics {
  // Type guard to ensure we have a Polygon geometry
  if (zone.geometry.type !== 'Polygon') {
    throw new Error('Zone geometry must be a Polygon');
  }
  const polygon = turf.polygon((zone.geometry as GeoJSON.Polygon).coordinates);
  const activitiesInZone: any[] = [];
  const uniqueVisitorIds = new Set<number>();

  // Filter activities within the zone
  populationData.forEach((person) => {
    const personActivitiesInZone: any[] = [];

    person.activities.forEach((activity: any) => {
      if (activity.coordinates) {
        const point = turf.point([
          activity.coordinates.lng,
          activity.coordinates.lat,
        ]);

        if (turf.booleanPointInPolygon(point, polygon)) {
          personActivitiesInZone.push({
            ...activity,
            personId: person.id,
            age: person.age,
          });
        }
      }
    });

    // Deduplicate consecutive home activities for the same person at the same location
    const deduplicatedActivities: any[] = [];
    for (let i = 0; i < personActivitiesInZone.length; i++) {
      const current = personActivitiesInZone[i];
      const next = personActivitiesInZone[i + 1];

      // Skip if this is "home" and the next activity is also "home" at the same coordinates
      if (
        current.name === "home" &&
        next &&
        next.name === "home" &&
        current.coordinates.lat === next.coordinates.lat &&
        current.coordinates.lng === next.coordinates.lng
      ) {
        // Merge the two home activities into one with combined time range
        deduplicatedActivities.push({
          ...current,
          endTime: next.endTime, // Extend end time to cover both periods
        });
        i++; // Skip the next home activity since we merged it
      } else {
        deduplicatedActivities.push(current);
      }
    }

    // Add deduplicated activities and track unique visitors
    if (deduplicatedActivities.length > 0) {
      activitiesInZone.push(...deduplicatedActivities);
      uniqueVisitorIds.add(person.id);
    }
  });

  // Calculate activities by hour
  const hourCounts = new Array(24).fill(0);
  activitiesInZone.forEach((activity) => {
    const startHour = parseInt(activity.startTime.split(":")[0], 10);
    const endHour = parseInt(activity.endTime.split(":")[0], 10);

    // Handle activities that span across midnight (endHour < startHour)
    if (endHour < startHour) {
      // Count from startHour to 23
      for (let hour = startHour; hour < 24; hour++) {
        hourCounts[hour]++;
      }
      // Count from 0 to endHour
      for (let hour = 0; hour <= endHour; hour++) {
        hourCounts[hour]++;
      }
    } else {
      // Normal case: count from startHour to endHour
      for (let hour = startHour; hour <= endHour; hour++) {
        hourCounts[hour]++;
      }
    }
  });

  const activitiesByHour = hourCounts.map((count, hour) => ({
    hour,
    count,
  }));

  // Calculate age distribution
  const ageGroups = {
    "0-17": 0,
    "18-25": 0,
    "26-34": 0,
    "35-64": 0,
    "65+": 0,
  };

  activitiesInZone.forEach((activity) => {
    const age = activity.age;
    if (age <= 17) ageGroups["0-17"]++;
    else if (age <= 25) ageGroups["18-25"]++;
    else if (age <= 34) ageGroups["26-34"]++;
    else if (age <= 64) ageGroups["35-64"]++;
    else ageGroups["65+"]++;
  });

  const ageDistribution = Object.entries(ageGroups).map(([ageGroup, count]) => ({
    ageGroup,
    count,
  }));

  // Calculate activity types
  const activityTypeCounts: Record<string, number> = {};
  activitiesInZone.forEach((activity) => {
    const type = activity.name || "unknown";
    activityTypeCounts[type] = (activityTypeCounts[type] || 0) + 1;
  });

  const activityTypes = Object.entries(activityTypeCounts).map(
    ([type, count]) => ({
      type,
      count,
    })
  );

  return {
    totalActivities: activitiesInZone.length,
    uniqueVisitors: uniqueVisitorIds.size,
    activitiesByHour,
    ageDistribution,
    activityTypes,
  };
}
