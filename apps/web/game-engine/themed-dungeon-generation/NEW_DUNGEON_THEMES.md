# New Dungeon Themes Added

This document lists the 7 new dungeon themes that have been added to TavernKeeper for increased content variety.

## Implementation

The new themes are defined in `code/themes/additional-theme-definitions.ts` and can be imported and combined with the existing themes from `theme-definitions.ts`.

## New Themes

### 1. Goblin Caves (Beginner)
**ID:** `goblin_caves`

**Description:** A crude network of tunnels carved by generations of goblins. The walls are rough-hewn and marked with tribal symbols, and the air reeks of goblin cooking fires.

**Monster Types:**
- Goblin
- Goblin Shaman
- Hobgoblin
- Bugbear
- Goblin Warchief
- Cave Troll
- Giant Bat

**Boss Influences:** Goblin King, Bugbear Chief, Cave Troll Lord

**Atmosphere:** Smoke from cooking fires drifts through narrow passages. Tribal drums echo in the distance, and crude traps line the walls. The goblins have made this place their home.

---

### 2. Abandoned Mine (Beginner)
**ID:** `abandoned_mine`

**Description:** Once a thriving mining operation, this dungeon has been abandoned after miners dug too deep and awakened something dark. Rusty equipment and old minecarts remain.

**Monster Types:**
- Giant Rat
- Kobold
- Dark Dwarf
- Earth Elemental
- Cave Fisher
- Rust Monster
- Umber Hulk

**Boss Influences:** Dark Dwarf King, Earth Titan, Ancient Umber Hulk

**Atmosphere:** Ancient mining equipment lies abandoned and rusting. Support beams creak ominously, and the deeper you go, the more unstable the tunnels become. Something lurks in the deepest shafts.

---

### 3. Haunted Crypt (Intermediate)
**ID:** `haunted_crypt`

**Description:** An ancient burial ground where restless spirits walk. The dead here were not laid to rest properly, and now they seek revenge on the living.

**Monster Types:**
- Ghost
- Specter
- Poltergeist
- Shadow
- Wraith
- Banshee
- Phantom

**Boss Influences:** Banshee Queen, Phantom Lord, Death Wraith

**Atmosphere:** Cold spots and spectral wails fill the air. Ghostly apparitions phase through walls, and the temperature drops as you venture deeper. The boundary between life and death is thin here.

---

### 4. Dark Forest Ruins (Intermediate)
**ID:** `dark_forest_ruins`

**Description:** Ancient stone structures consumed by a cursed forest. Dark magic has corrupted the natural growth, creating twisted vegetation and feral beasts.

**Monster Types:**
- Dire Wolf
- Corrupted Ent
- Dark Druid
- Werewolf
- Owlbear
- Displacer Beast
- Shambling Mound

**Boss Influences:** Corrupted Ancient, Werewolf Alpha, Dark Druid Master

**Atmosphere:** Twisted roots break through ancient stonework. The canopy above blocks all natural light, and predatory eyes watch from the shadows. Nature itself has turned hostile.

---

### 5. Bandit Hideout (Intermediate)
**ID:** `bandit_hideout`

**Description:** A fortified stronghold deep in the wilderness, used by a ruthless bandit gang. They have trapped and fortified their base against intruders.

**Monster Types:**
- Bandit
- Bandit Archer
- Bandit Captain
- Mercenary
- Assassin
- Rogue
- Bandit Lord

**Boss Influences:** Bandit King, Master Assassin, Crime Lord

**Atmosphere:** The smell of ale and weapon oil permeates the air. Guards patrol the corridors, and tripwires crisscross the passages. This is a human threat, cunning and organized.

---

### 6. Ancient Temple (Advanced)
**ID:** `ancient_temple`

**Description:** A forgotten temple to dark gods, filled with arcane traps and zealous guardians. The ancient magic here is both powerful and dangerous.

**Monster Types:**
- Cultist
- Dark Priest
- Temple Guardian
- Flesh Golem
- Gargoyle
- Medusa
- Demon

**Boss Influences:** High Priest, Demon Lord, Ancient Guardian

**Atmosphere:** Eldritch symbols glow faintly on stone walls. Ancient machinery still functions, powered by dark rituals. The very air hums with forbidden magic waiting to be unleashed.

---

### 7. Dragon Lair (Advanced)
**ID:** `dragon_lair`

**Description:** The domain of an ancient dragon, carved deep into mountain rock. The dragon has amassed a legendary hoard and commands lesser creatures as servants.

**Monster Types:**
- Kobold Servant
- Dragonborn Warrior
- Wyvern
- Young Dragon
- Dragon Cultist
- Fire Drake
- Ancient Dragon

**Boss Influences:** Ancient Dragon, Dragon Lord, Wyrm King

**Atmosphere:** Heat radiates from deep within the mountain. The scent of sulfur and gold fills the air. Dragon scales and bones litter the passages, trophies of past challengers who failed.

---

## Difficulty Breakdown

- **Beginner:** Goblin Caves, Abandoned Mine
- **Intermediate:** Haunted Crypt, Dark Forest Ruins, Bandit Hideout
- **Advanced:** Ancient Temple, Dragon Lair

## Integration Notes

To use these themes in the game:

```typescript
import { DUNGEON_THEMES } from './themes/theme-definitions';
import { ADDITIONAL_DUNGEON_THEMES } from './themes/additional-theme-definitions';

// Combine all themes
const ALL_THEMES = [...DUNGEON_THEMES, ...ADDITIONAL_DUNGEON_THEMES];

// Or get them via the helper function
import { getAdditionalDungeonThemes } from './themes/additional-theme-definitions';
const allThemes = [...DUNGEON_THEMES, ...getAdditionalDungeonThemes()];
```

This brings the total number of dungeon themes from 5 to 12, more than doubling the content variety for players.
