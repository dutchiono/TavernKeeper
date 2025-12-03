# Map Generator Tools

## Map Visualization Tool

`map-visualization-tool.html` - A standalone HTML tool for visualizing and testing the map generator system.

### Usage

1. Open `map-visualization-tool.html` in any modern web browser
2. Adjust parameters in the left sidebar:
   - **World Seed**: Determines the generated map (same seed = same map)
   - **Grid Size**: Size of the visible map grid (10-50 cells)
   - **Feature Density**: How many features appear (Sparse/Normal/Dense)
   - **Center X/Y**: Center coordinates of the visible region
   - **Include Dungeons**: Toggle dungeon entrance generation
3. Click **Generate Map** to create/regenerate the map
4. Click any cell in the main view to see its details in the right sidebar
5. Use **Random Seed** to generate a new random seed

### Features

- **Left Sidebar**: Parameter controls for map generation
- **Main View**: Interactive grid visualization of the map
- **Right Sidebar**: Detailed information about selected cells
- **Cell Types**: Most cells are empty (nothingness), with occasional features:
  - Geography (green) - Forests, mountains, rivers, etc.
  - Organizations (purple) - Kingdoms, towers, hordes, etc.
  - Dungeons (red) - Dungeon entrances
  - Landmarks (yellow-green) - Unique locations
  - Ruins (brown) - Abandoned structures
  - Trading Posts (green-brown) - Commerce locations

### Cell Visualization

- **Empty cells**: Dark gray background (most cells)
- **Geography**: Green background with "G" marker
- **Organization**: Purple background with "O" marker
- **Dungeon**: Red background with "D" marker
- **Landmark**: Yellow-green background with "L" marker
- **Ruin**: Brown background with "R" marker
- **Trading Post**: Green-brown background with "T" marker

### Notes

- The tool is completely standalone - no server or build process required
- All generator code is included inline
- Map generation is deterministic based on seed and coordinates
- Most cells will be empty, representing the vast nothingness of the world
- Features appear based on probability and density settings

