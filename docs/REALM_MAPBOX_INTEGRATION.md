# Realm Mapbox Integration Documentation

## Overview

The `realmMapbox` component is a React + TypeScript Mapbox GL integration that displays observations data with clustering, 3D boundary visualization, and interactive popups.

---

## 📁 Files Included

- `src/components/realmMapbox.tsx` - Main map component
- `src/components/realmMapbox.scss` - Styling file
- `docs/REALM_MAPBOX_INTEGRATION.md` - This documentation

---

## 📦 Required Dependencies

The following dependencies are already included in the project's `package.json`:

```json
{
  "mapbox-gl": "^3.15.0"
}
```

### Additional Dev Dependencies (if using SCSS)

If your project doesn't already support SCSS, you may need to add:

```json
{
  "sass": "^1.x.x"
}
```

**Note:** Vite supports SCSS out of the box, so no additional configuration is needed for this project.

---

## 🔑 Environment Variables

Add your Mapbox token to your `.env` file:

```env
VITE_MAPBOX_TOKEN=your_mapbox_token_here
```

### How to Get a Mapbox Token

1. Go to [https://account.mapbox.com/](https://account.mapbox.com/)
2. Sign in or create an account
3. Navigate to "Access Tokens"
4. Create a new token or use the default public token
5. Copy the token to your `.env` file

---

## 🎯 Required Props

### `polygon` (required)

The component accepts a polygon prop that should be a GeoJSON Polygon or MultiPolygon geometry.

**Type:**
```typescript
polygon: any; // GeoJSON Polygon or MultiPolygon geometry
```

**Expected Structure:**

For a **Polygon**:
```javascript
{
  type: "Polygon",
  coordinates: [
    [
      [lng1, lat1],
      [lng2, lat2],
      [lng3, lat3],
      [lng1, lat1] // Close the polygon
    ]
  ]
}
```

For a **MultiPolygon**:
```javascript
{
  type: "MultiPolygon",
  coordinates: [
    [
      [
        [lng1, lat1],
        [lng2, lat2],
        [lng3, lat3],
        [lng1, lat1]
      ]
    ]
  ]
}
```

### Where to Get the Polygon Data

According to the integration requirements, the polygon comes from the `additionalData` state in `RealmsInfoPage.tsx`:

```typescript
// In RealmsInfoPage.tsx
const [additionalData, setAdditionalData] = useState<any>(null);

// Pass to component
<RealmMapbox polygon={additionalData.polygon} />
```

---

## 🔌 Basic Usage

### Import the Component

```typescript
import RealmMapbox from './components/realmMapbox';
```

### Use in Your Page Component

```typescript
import React, { useState, useEffect } from 'react';
import RealmMapbox from './components/realmMapbox';

function RealmsInfoPage() {
  const [additionalData, setAdditionalData] = useState<any>(null);

  // Fetch your realm data including polygon
  useEffect(() => {
    // Your API call to get realm data
    fetchRealmData().then(data => {
      setAdditionalData(data);
    });
  }, []);

  if (!additionalData) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Realm Map</h1>
      <RealmMapbox polygon={additionalData.polygon} />
    </div>
  );
}
```

---

## 🗺️ Map Styles

The component supports three map styles (viewers cannot change this - it's configured internally):

1. **Standard** (default) - `mapbox://styles/mapbox/standard`
2. **Satellite 3D** - `mapbox://styles/mapbox/satellite-streets-v12`
3. **Outdoor 3D** - `mapbox://styles/mapbox/outdoors-v12`

The default style is **Standard**. To change the default style, modify the `currentStyle` initial state in `realmMapbox.tsx`:

```typescript
const [currentStyle, setCurrentStyle] = useState<string>(MAP_CONFIG.MAP_STYLES.SATELLITE);
```

---

## ⚙️ Default Configuration

The component uses the following default settings (as required):

- **Default Tilt:** 45°
- **Default Zoom:** 14
- **Cluster Radius:** 50px
- **Cluster Max Zoom:** 14
- **Boundary 3D Height:** 30 units
- **Boundary Color:** #3b82f6 (blue)
- **Marker Color:** #22c55e (green)

### Customizing Configuration

All configuration is centralized in the `MAP_CONFIG` constant at the top of `realmMapbox.tsx`:

```typescript
const MAP_CONFIG = {
  MAPBOX_TOKEN: import.meta.env.VITE_MAPBOX_TOKEN || "",
  DEFAULT_TILT: 45,
  DEFAULT_ZOOM: 14,
  MAP_STYLES: {
    STANDARD: "mapbox://styles/mapbox/standard",
    SATELLITE: "mapbox://styles/mapbox/satellite-streets-v12",
    OUTDOOR: "mapbox://styles/mapbox/outdoors-v12"
  },
  // ... more settings
};
```

---

## 📡 API Integration

### Observations Data

The component fetches observations data internally using the `fetchObservations` function in a `useEffect` hook.

**Current Implementation:**

```typescript
// TODO: Replace this with your actual API endpoint
const response = await fetch('/api/observations');
```

### API Response Format

Your API should return an array of observation objects. The component will transform them to match this interface:

```typescript
interface Observation {
  id: string;
  commonName: string;
  scientificName: string;
  species: string;
  observedDate: string; // ISO date string
  spottedBy: string;
  coordinates: {
    lng: number;
    lat: number;
  };
  imageUrl?: string; // Optional - uses placeholder if missing
}
```

### Customizing the API Call

1. **Replace the API endpoint** in `realmMapbox.tsx`:

```typescript
const response = await fetch('https://your-api.com/realms/observations?realmId=' + realmId);
```

2. **Adjust the data transformation** to match your API response structure:

```typescript
const transformedData: Observation[] = data.map((item: any) => ({
  id: item.id,
  commonName: item.common_name,     // Adjust field names
  scientificName: item.scientific_name,
  species: item.species,
  observedDate: item.observed_date,
  spottedBy: item.observer_name,     // Your API might call it differently
  coordinates: {
    lng: item.longitude,              // Or item.coordinates.lng
    lat: item.latitude                // Or item.coordinates.lat
  },
  imageUrl: item.photo_url            // Or item.image
}));
```

---

## 🎨 Features

### ✅ Implemented Features

1. **3D Boundary Wall**
   - Uses the polygon prop to create a 3D extruded boundary
   - Default height: 30 units
   - Blue color (#3b82f6) with 60% opacity

2. **Marker Clustering**
   - Automatically clusters observations at different zoom levels
   - Color-coded by cluster size:
     - Small clusters (< 10): Light blue
     - Medium clusters (10-30): Yellow
     - Large clusters (> 30): Pink
   - Click clusters to zoom in

3. **Observation Popups**
   - Click individual markers to view details:
     - Common name
     - Scientific name
     - Species
     - Observed date
     - Spotted by
     - Image (or placeholder if missing)

4. **Placeholder Images**
   - Observations without images display a camera icon placeholder
   - SVG-based, no external dependencies

5. **Navigation Controls**
   - Zoom in/out buttons
   - Compass/rotation control
   - Located in top-right corner

6. **Error Handling**
   - All API calls wrapped in try/catch blocks
   - User-friendly error messages displayed
   - Graceful fallback to empty array on error

7. **Loading State**
   - Displays spinner while fetching observations
   - Shows "Loading observations..." message

---

## 🎨 Styling

### SCSS Structure

The stylesheet follows the BEM naming convention with an ID for the main container:

```scss
#realmMapbox {
  // Main container styles

  .realmMapbox__container {
    // Map container
  }

  .realmMapbox__popup {
    // Popup styles
  }

  .realmMapbox__loading {
    // Loading state
  }

  .realmMapbox__error {
    // Error state
  }
}
```

### Customizing Styles

You can override styles by targeting the classes in your own stylesheet:

```scss
#realmMapbox {
  height: 800px; // Override default height

  .realmMapbox__popup {
    max-width: 400px; // Wider popups
  }
}
```

---

## 🚨 Error Handling

The component includes comprehensive error handling:

1. **Missing Mapbox Token**
   ```
   Displays: "⚠️ Mapbox token is missing"
   ```

2. **API Fetch Errors**
   ```
   Displays: "⚠️ Failed to fetch observations: [error message]"
   ```

3. **Invalid Polygon Data**
   - Logs error to console
   - Falls back to default center (Paris coordinates)
   - Map still renders without boundary

All errors are logged to the console for debugging while showing user-friendly messages in the UI.

---

## 🧪 Testing Checklist

Before delivery, verify:

- [ ] Component accepts polygon prop (not hardcoded)
- [ ] Observations fetched via API with try/catch
- [ ] Demo controls removed (viewers can't change settings)
- [ ] Placeholder for missing images works
- [ ] Files named in camelCase
- [ ] Styles in separate SCSS file
- [ ] TypeScript types added
- [ ] Environment variable for Mapbox token
- [ ] Clustering works at different zoom levels
- [ ] 3D boundary wall displays correctly
- [ ] Popups show all required fields (no BioCore field)

---

## 🔧 Troubleshooting

### Map doesn't display

1. Check if `VITE_MAPBOX_TOKEN` is set in `.env`
2. Verify the token is valid at [https://account.mapbox.com/](https://account.mapbox.com/)
3. Check browser console for errors

### Boundary doesn't show

1. Verify `polygon` prop is not null/undefined
2. Check polygon structure matches GeoJSON format
3. Ensure coordinates are in [lng, lat] order (not [lat, lng])

### Observations don't display

1. Check API endpoint is correct
2. Verify API response structure matches expected format
3. Check browser console for API errors
4. Ensure coordinates are within the polygon bounds

### SCSS not loading

1. Verify the import statement in `realmMapbox.tsx`:
   ```typescript
   import "./realmMapbox.scss";
   ```
2. Ensure Vite/your bundler supports SCSS

---

## 📝 Code Quality Notes

### TypeScript

- ✅ Props interface defined (`RealmMapboxProps`)
- ✅ Observation interface defined
- ✅ State variables properly typed
- ✅ Map and ref types specified

### Error Handling

- ✅ All API calls in try/catch blocks
- ✅ Error states displayed to users
- ✅ Console logging for debugging
- ✅ Graceful degradation on errors

### Best Practices

- ✅ useRef for map instance (no re-renders)
- ✅ Proper cleanup on unmount
- ✅ Centralized configuration
- ✅ Responsive design considerations
- ✅ Accessibility features (focus states, reduced motion)

---

## 🚀 Next Steps

1. **Replace API endpoint** with your actual observations endpoint
2. **Adjust data transformation** to match your API response structure
3. **Test with real data** to ensure coordinates and images work
4. **Customize styling** if needed for your design system
5. **Integrate into RealmsInfoPage.tsx** by passing the polygon prop

---

## 📞 Support

If you encounter any issues during integration:

1. Check the browser console for error messages
2. Verify all environment variables are set correctly
3. Ensure the polygon prop has valid GeoJSON geometry
4. Test the API endpoint independently to verify response format

---

## 📄 License

This component follows the same license as the parent project.
