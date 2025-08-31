# Example Scenario Design Document

## Overview
This document outlines the design and setup of our example SAO (Sword Art Online) scenario for the Self-Managing RPG system. It serves as a reference for how the various systems work together and what content is pre-configured.

## Setting
**Game:** Sword Art Online (SAO)  
**Start Date:** November 6, 2022  
**Start Time:** 4:00 PM  
**Start Location:** Town of Beginnings  
**Current Floor:** 1 (Frontline)  

The scenario begins on the day the death game is announced, with 10,000 players trapped in the virtual world of Aincrad.

## Pre-Configured Characters

### Player Characters
These characters have pre-made Story Cards with established backgrounds:

#### Main Characters
- **Kirito** [Kazuto Kirigaya] - Beta tester, solo player
- **Asuna** [Yuuki Asuna] - Complete VRMMO novice
- **Klein** [Ryoutarou Tsuboi] - Guild leader from previous MMO
- **Agil** [Andrew Gilbert Mills] - Business-minded tank player
- **Silica** [Keiko Ayano] - Young beast tamer
- **Lisbeth** [Rika Shinozaki] - Aspiring blacksmith

#### Supporting Characters  
- **Argo** 'the Rat' - Information broker
- **Diabel** - Charismatic raid leader (secretly a beta tester)
- **Sachi** - Timid spear user from computer club

### Character Key Format
Characters use multiple keys for identification:
- Username (no spaces) - for tool usage
- Real name (with spaces) - for natural text matching
- Special aliases where applicable

Example: `"keys": "Kirito, Kazuto Kirigaya "`

## Systems Configuration

### RPG Schema
- **Attributes:** VITALITY, STRENGTH, DEXTERITY, AGILITY
- **Core Stats:** HP (100 default, +10 per level)
- **Level Progression:** XP = level² × 100
- **Skills:** Weapon, Combat Support, Crafting, Gathering, Social, and Passive categories

### Calendar System
- **Actions Per Day:** 200
- **Time Periods:** Late Night, Dawn, Morning, Midday, Afternoon, Evening, Night
- **Seasons:** Winter, Spring, Summer, Autumn
- **Events:** Various daily, weekly, and annual events configured

### Quality Assurance
- Name replacement rules for overused fantasy names
- Filler word reduction
- Cliché pattern detection and replacement

## Locations

### Floor 1 Zones
#### Safezones
- Town of Beginnings (central hub)
- Horunka Village (farming)
- Tolbana (boss raid gathering)
- Medai Village (potions)

#### Wilderness
- West Fields (boar spawns)
- Deep Forest (higher level)
- Lake Region (fishing)
- Northern Mountains (mining)

#### Dungeons
- 1st Floor Labyrinth (20 floors to boss)
- Spider Cavern
- Kobold Mines
- Ruins of Algade

## Monsters

### Wilderness Mobs
- Frenzy Boar (starter mob)
- Dire Wolf (pack hunter)
- Little Nepenthes (plant monster)
- Various kobolds, goblins, and elementals

### Dungeon Mobs
- Kobold Sentinels
- Granite Elementals
- Giant Spiders
- Skeleton Warriors
- **Illfang the Kobold Lord** (Floor Boss)

## Game Mechanics

### Death System
- NerveGear prevents logout
- In-game death = real death
- Revival items must be used within 10 seconds
- Monument of Life tracks deceased players

### Criminal System
- **Green Cursor:** Normal player
- **Orange Cursor:** Criminal (temporary)
- **Red Cursor:** Murderer (permanent)

### Sword Skills
- Activated through pre-motion stances
- System-assisted movement
- Post-motion delay proportional to power

## Story Cards Structure

### Configuration Cards
- `[RPG_SCHEMA]` - Game mechanics configuration
- `[RPG_RUNTIME]` - Variables and tools
- `[CALENDAR]` - Time and event configuration
- `[HEADERS CONFIG]` - Section organization
- `[QA]` - Quality assurance rules

### Content Cards
- `[CHARACTER]` - Individual character data
- `[PLAYER]` - Player character template
- Various lore and location cards

### Self-Populating Cards
The following cards are created automatically by the system:
- `[ENTITY_TEMPLATE]` cards - Created by GenerationWizard
- `[GENERATION_WIZARD] Config and Prompts` - Created on first run
- `[CHARACTER_FORMAT] Configuration` - Created by GameState
- Entity tracking data - Created as needed

## Design Philosophy

### Character Generation
- NPCs can be generated through the GenerationWizard
- Generated NPCs follow the established format
- Multiple keys ensure characters can be found by any known name
- Real names in brackets, aliases in quotes

### Entity Tracking
- Unknown entities mentioned 5+ times trigger generation
- Automatic NPC creation for frequently referenced entities
- Consolidated template system through GenerationWizard

### Modularity
- Each system (GameState, Calendar, GenerationWizard) operates independently
- Story Cards serve as the data persistence layer
- Configuration cards allow customization without code changes

## Usage Notes

### For Developers
- Debug mode can be enabled in GameState.js (line 4)
- Debug commands available: `/gw_npc`, `/gw_monster`, etc.
- Console logging provides detailed operation tracking

### For Players
- The scenario starts with all canon characters at Level 1
- Player creates their character through the `[PLAYER]` template
- Time advances based on actions (200 actions = 1 day)

## File Structure
- `Example-Scenario-Story-Cards.json` - Pre-configured story cards
- Individual `.js` files for each system module
- `CLAUDE.md` - AI assistant instructions
- This design document

## Version History
- Initial creation: Example scenario based on SAO Floor 1
- Systems integrated: GameState, Calendar, GenerationWizard, Utilities
- Character format: Updated to use brackets for real names, quotes for aliases