# Contributions

This folder contains code additions and features that are ready for review and testing by the main branch developer.

## 📖 Getting Started

**Before creating your first contribution, please read:**
- **[CONTRIBUTION_GUIDE.md](./CONTRIBUTION_GUIDE.md)** - Comprehensive guide covering:
  - Game structure and scope
  - Technology stack and programming languages
  - Coding conventions and style patterns
  - Integration points and where code should go
  - Testing requirements
  - Common patterns and best practices

## Structure

Each contribution should be organized in its own subfolder with:
- The code files (or references to where they should be integrated)
- A `README.md` file explaining:
  - What the contribution does
  - Where it should be integrated
  - How to test it
  - Any dependencies or requirements
  - Any breaking changes or considerations

**Template**: Use [CONTRIBUTION_TEMPLATE.md](./CONTRIBUTION_TEMPLATE.md) as a starting point for your contribution README.

## Current Contributions

### Game Logging System
**Location**: `contributions/game-logging-system/`

A two-tier logging system that provides:
- **Detailed Log (Temporary)**: Comprehensive in-memory logging for agent summarization of character activity during idle time
- **Key Events Log (Permanent)**: Filtered permanent storage of important events for game history

Includes event importance classification, agent activity summaries, and database integration for permanent event storage.

### World Content Hierarchy System
**Location**: `contributions/world-content-hierarchy/`

A top-down hierarchical system for game world contents that tracks provenance, history, and lore of all game elements. Answers "where did this come from?" by building a persistent world lore database.

Features:
- **Provenance Tracking**: Every element knows its origin, creator, and history
- **Lore Generation**: Automatic generation of narrative stories and significance
- **Hierarchical Structure**: World → Regions → Locations → Dungeons → Items/Bosses
- **Connection Building**: Elements are automatically linked based on relationships
- **Persistent World**: World content grows over time, creating a living world history

### World Generation System
**Location**: `contributions/world-generation-system/`

A comprehensive world generation system that creates a complete game world from cosmic forces down to individual mortals. Generates world content in 9 hierarchical levels following a specific world-building structure.

Features:
- **9-Level Hierarchy**: Primordials → Cosmic Creators → Geography → Conceptual Beings → Demi-Gods → Mortal Races → Organizations → Standout Mortals → Family and Role
- **Deterministic Generation**: Seed-based generation for reproducibility
- **Template-Based**: Uses templates for names, descriptions, and relationships
- **Extensible**: Easy to add new types and expand each level
- **Integrated**: Works with world-content-hierarchy system

## How to Use

1. **Read the Contribution Guide** - Understand the codebase structure and conventions
2. **Create a new subfolder** - Use descriptive names (e.g., `contributions/feature-name/`)
3. **Add your code and documentation** - Follow the template and guide patterns
4. **Update this README** - Add a brief description of your contribution below
5. **The main branch developer** will review, test, and integrate as appropriate

