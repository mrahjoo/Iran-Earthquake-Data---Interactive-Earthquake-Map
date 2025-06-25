# Real-time and Historical Earthquake Viewer

## Key Features

This application provides:

1. **Real-time Earthquake Data**:

1. Fetches the latest earthquake data from USGS
2. Auto-refreshes every 5 minutes
3. Visualizes earthquakes on an interactive world map



2. **Historical Data Analysis**:

1. Toggle between real-time and historical views
2. Select custom date ranges for historical analysis
3. Filter by minimum magnitude



3. **Interactive UI**:

1. Responsive design that works on mobile, tablet, and desktop
2. Detailed earthquake information panel
3. Color-coded magnitude visualization
4. Searchable earthquake list



4. **Data Visualization**:

1. Circle size represents earthquake magnitude
2. Color indicates intensity (green to red)
3. Popup details on click



5. **Filtering Capabilities**:

1. Filter by time range (hour, day, week)
2. Filter by minimum magnitude
3. Search by location





## Architecture

The application follows a clean architecture with:

1. **API Layer** (`lib/api.ts`):

1. Handles communication with the USGS Earthquake API
2. Formats requests for both real-time and historical data



2. **Type Definitions** (`lib/types.ts`):

1. Strongly typed interfaces for earthquake data
2. Ensures type safety throughout the application



3. **UI Components**:

1. `EarthquakeMap`: Main component with the Mapbox integration
2. `EarthquakeSidebar`: Filtering and earthquake listing
3. `EarthquakeDetails`: Detailed view of selected earthquakes
