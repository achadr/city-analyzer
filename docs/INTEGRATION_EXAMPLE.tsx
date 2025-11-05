/**
 * INTEGRATION EXAMPLE
 *
 * This file shows how to integrate the realmMapbox component
 * into RealmsInfoPage.tsx
 *
 * DO NOT COPY THIS FILE - This is just a reference example
 */

import React, { useState, useEffect } from 'react';
import RealmMapbox from '../components/realmMapbox';

// ============================================
// EXAMPLE 1: Basic Integration
// ============================================

function RealmsInfoPageExample1() {
  const [additionalData, setAdditionalData] = useState<any>(null);

  useEffect(() => {
    // Your existing code to fetch realm data
    fetchRealmData().then(data => {
      setAdditionalData(data);
    });
  }, []);

  if (!additionalData) {
    return <div>Loading...</div>;
  }

  return (
    <div className="realms-info-page">
      <h1>Realm Details</h1>

      {/* Your existing content */}
      <div className="realm-info">
        {/* ... your existing realm information ... */}
      </div>

      {/* Map Component */}
      <div className="realm-map-container" style={{ marginTop: '2rem' }}>
        <h2>Observations Map</h2>
        <RealmMapbox polygon={additionalData.polygon} />
      </div>
    </div>
  );
}

// ============================================
// EXAMPLE 2: With Loading States
// ============================================

function RealmsInfoPageExample2() {
  const [additionalData, setAdditionalData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await fetchRealmData();
        setAdditionalData(data);
      } catch (err) {
        console.error('Error fetching realm data:', err);
        setError('Failed to load realm data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div>Loading realm data...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!additionalData?.polygon) {
    return <div>No map data available for this realm</div>;
  }

  return (
    <div className="realms-info-page">
      <h1>Realm Details</h1>

      {/* Map Component */}
      <RealmMapbox polygon={additionalData.polygon} />
    </div>
  );
}

// ============================================
// EXAMPLE 3: With Custom Container Styling
// ============================================

function RealmsInfoPageExample3() {
  const [additionalData, setAdditionalData] = useState<any>(null);

  useEffect(() => {
    fetchRealmData().then(data => {
      setAdditionalData(data);
    });
  }, []);

  if (!additionalData) {
    return <div>Loading...</div>;
  }

  return (
    <div className="realms-info-page">
      <h1>Realm Details</h1>

      {/* Custom styled map container */}
      <div
        className="realm-map-wrapper"
        style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: '#f9fafb',
          borderRadius: '8px'
        }}
      >
        <h2 style={{ marginBottom: '1rem' }}>Observations Map</h2>

        {/*
          The map height is controlled by the realmMapbox component
          Default is 600px, but you can override it with CSS:
        */}
        <div style={{ height: '800px' }}>
          <RealmMapbox polygon={additionalData.polygon} />
        </div>
      </div>
    </div>
  );
}

// ============================================
// EXAMPLE 4: With Conditional Rendering
// ============================================

function RealmsInfoPageExample4() {
  const [additionalData, setAdditionalData] = useState<any>(null);
  const [showMap, setShowMap] = useState(true);

  useEffect(() => {
    fetchRealmData().then(data => {
      setAdditionalData(data);
    });
  }, []);

  if (!additionalData) {
    return <div>Loading...</div>;
  }

  return (
    <div className="realms-info-page">
      <h1>Realm Details</h1>

      {/* Toggle button */}
      <button onClick={() => setShowMap(!showMap)}>
        {showMap ? 'Hide Map' : 'Show Map'}
      </button>

      {/* Conditionally render map */}
      {showMap && additionalData.polygon && (
        <div className="realm-map-container">
          <RealmMapbox polygon={additionalData.polygon} />
        </div>
      )}
    </div>
  );
}

// ============================================
// HELPER FUNCTIONS (for reference)
// ============================================

// Example of how your existing fetchRealmData might look
async function fetchRealmData(): Promise<any> {
  const response = await fetch('/api/realms/123');
  const data = await response.json();
  return data;
}

// ============================================
// SAMPLE POLYGON DATA STRUCTURE
// ============================================

// This is what additionalData.polygon should look like:

const samplePolygon = {
  type: "Polygon",
  coordinates: [
    [
      [-73.935242, 40.730610],  // [lng, lat]
      [-73.935242, 40.740610],
      [-73.925242, 40.740610],
      [-73.925242, 40.730610],
      [-73.935242, 40.730610]   // Close the polygon (first point repeated)
    ]
  ]
};

// Or MultiPolygon:
const sampleMultiPolygon = {
  type: "MultiPolygon",
  coordinates: [
    [
      [
        [-73.935242, 40.730610],
        [-73.935242, 40.740610],
        [-73.925242, 40.740610],
        [-73.925242, 40.730610],
        [-73.935242, 40.730610]
      ]
    ]
  ]
};

// ============================================
// CSS OVERRIDES (optional)
// ============================================

/*
If you want to customize the map height or other styles,
add this to your page's CSS file:

#realmMapbox {
  height: 800px; // Override default 600px height
}

#realmMapbox .realmMapbox__container {
  border-radius: 12px; // More rounded corners
}

#realmMapbox .realmMapbox__popup {
  max-width: 400px; // Wider popups
}
*/

export default RealmsInfoPageExample1;
