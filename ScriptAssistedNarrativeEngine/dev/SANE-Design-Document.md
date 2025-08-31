# SANE Design Document v1.0
## Script-Assisted Narrative Engine for AI Dungeon

---

## Table of Contents
1. [Core Philosophy](#core-philosophy)
2. [Execution Environment & Constraints](#execution-environment--constraints)
3. [Three-Hook Architecture](#three-hook-architecture)
4. [Module System](#module-system)
5. [Storage Architecture](#storage-architecture)
6. [Tool System](#tool-system)
7. [Character Management](#character-management)
8. [Runtime Configuration](#runtime-configuration)
9. [Schema System](#schema-system)
10. [Designer Examples](#designer-examples)
11. [Best Practices](#best-practices)

---

## Core Philosophy

SANE is a **narrative enhancement framework** that provides designers complete control over game mechanics without requiring programming knowledge.

### Fundamental Principles

1. **Designer Sovereignty**: Total runtime control over all game systems
2. **Narrative Truth**: The LLM's output is the only reality players see
3. **Tool Extensibility**: Any function can become a tool, in any hook
4. **Zero Code Required**: All configuration through Story Cards
5. **Graceful Degradation**: Modules work independently, check dependencies

### What SANE Is NOT

- Not a rigid game engine with fixed rules
- Not a code-first system requiring programming
- Not a framework that limits designer creativity
- Not a system where mechanics override narrative

---

## Execution Environment & Constraints

### AI Dungeon Sandbox Limitations

```javascript
// Environment: isolated-vm (sandboxed V8 isolate)
// ES2022 support but older Node.js (no generics)
// No: setTimeout, setInterval, fetch, require, import
// No: console.warn, console.error - only console.log works
```

### Critical Memory Limits

| Storage Type | Between Turns | During Hook | Fatal Error |
|--------------|---------------|-------------|-------------|
| **State** | **90KB max** | Unlimited* | "game state is too large" |
| **Story Cards** | **14MB total** | 14MB | "memory limit" |
| **Variables** | Not preserved | Unlimited | N/A |

*State can grow during execution but MUST be under 90KB when hook ends

**Appropriate state usage:**
- Simple boolean flags (e.g., `state.startingTimeApplied = true`)  
- Tiny session markers
- Single primitive values

**NEVER use state for:**
- Game data (characters, inventory, quests, etc.)
- Complex objects or arrays
- Anything that could grow over time

### Breaking Bugs to Avoid

```javascript
// 1. Special characters in keys - causes disconnection
card.keys = "🔥 fire sword";  // ❌ WILL DISCONNECT

// 2. State over 90KB between turns
state.massiveData = {...};  // ❌ WILL FAIL

// 3. Unhandled errors stop all processing
const card = storyCards.find(...);
card.entry = "text";  // ❌ Error if card is null
```

---

## Three-Hook Architecture

SANE operates through three execution points, each running fresh with no persistence except Story Cards and state:

### 1. Input Hook
**Purpose**: Process player commands before they reach the narrative
```javascript
function processInput(text) {
    // Library.js runs fresh
    // Process player commands (/give, /stats, etc.)
    // Can modify or block input
    return modifiedText;  // or "" to block
}
```

### 2. Context Hook
**Purpose**: Build and modify what the LLM sees
```javascript
function processContext(text) {
    // Library.js runs fresh again
    // Inject scene information
    // Add status messages
    // Modify World Lore organization
    return modifiedText;
}
```

### 3. Output Hook
**Purpose**: Process LLM's response and tool calls
```javascript
function processOutput(text) {
    // Library.js runs fresh again
    // Process tool calls like deal_damage()
    // Clean up output
    // Update game state
    return modifiedText;
}
```

### Hook Isolation

- Each hook completely reinitializes
- No variables persist between hooks
- Only `state` (90KB) and `storyCards` (14MB) persist
- Modules must handle this isolation gracefully

---

## Module System

### Module Communication

Modules interact through three methods:

1. **Direct API Calls** (with existence checks)
```javascript
// GameState calling Calendar
if (typeof Calendar !== 'undefined' && Calendar.getCurrentTime) {
    const time = Calendar.getCurrentTime();
    Calendar.advanceTime('3h');
}
```

2. **Story Cards** (persistent storage)
```javascript
// Shared data through cards
Utilities.storyCard.get('[CHARACTER] Player');
Utilities.storyCard.update('[RPG_RUNTIME] DATA 1', {...});
```

3. **Event Hooks** (optional subscriptions)
```javascript
// GameState exposes hooks
GameState.on('character_moved', (data) => {
    // Other modules can subscribe
});
```

### Core Modules

#### GameState (Primary)
- Manages characters, inventory, progression
- Processes all tool calls
- Provides runtime tool system
- **Dependencies**: None required, uses Calendar/GenerationWizard if available

#### Calendar
- Time and date management
- Event scheduling
- Time-based triggers
- **Dependencies**: None, provides API to other modules

#### GenerationWizard
- AI-assisted entity creation
- Quest generation
- NPC creation
- **Dependencies**: GameState (for character operations)

#### Utilities
- Global constant available to all modules
- String manipulation, parsing, Story Card operations
- **Dependencies**: None, always available

---

## Storage Architecture

### Hierarchy of Storage

```
Story Cards = Primary Database (14MB)
├─ Character Storage
│  ├─ [CHARACTER] Name - NPC sheets
│  └─ [PLAYER] Name - Player sheets
├─ Runtime System (User Space)
│  ├─ [RPG_RUNTIME] Variables - User variable declarations
│  ├─ [RPG_RUNTIME] DATA 1 - User variable values
│  ├─ [RPG_RUNTIME] TOOLS - Custom output tools
│  ├─ [RPG_RUNTIME] INPUT_COMMANDS - Custom player commands
│  ├─ [RPG_RUNTIME] CONTEXT_MODIFIER - Context transformation
│  ├─ [RPG_RUNTIME] INPUT_MODIFIER - Input text transformation
│  └─ [RPG_RUNTIME] OUTPUT_MODIFIER - Output text transformation
├─ System Storage (Core Features)
│  ├─ [RPG_RUNTIME] Entity Tracker Config/Data/Queue
│  ├─ [ENTITY_TEMPLATE] NPC/Monster/Boss - Entity templates
│  └─ [GENERATION_CONFIG] - Generation settings
├─ Game Schemas
│  ├─ [RPG_SCHEMA] Attributes/Core Stats/Skills
│  ├─ [RPG_SCHEMA] Level Progression
│  └─ [RPG_SCHEMA] Character Format
└─ Other Systems
   ├─ [CALENDAR] Configuration/Events
   ├─ [CURRENT SCENE] - Active scene
   └─ [HEADERS CONFIG] - Sort priorities

State = Minimal Session Data (<90KB)
└─ Simple boolean flags only
└─ NEVER game data

Variables = Temporary Processing
└─ Reset every hook
```

### Critical Rule: Story Cards as Database

```javascript
// ❌ WRONG - State is not for game data
state.characters = {...};        // NO!
state.inventory = [...];         // NO!
state.questProgress = {...};     // NO!

// ✅ CORRECT - Story Cards store everything
Utilities.storyCard.update('[CHARACTER] Player', {
    entry: characterSheet
});

Utilities.storyCard.get('[RPG_RUNTIME] DATA 1');
```

---

## Tool & Modifier Systems

### System Categories by Hook

#### Input Commands (Player Commands)
```javascript
// [RPG_RUNTIME] INPUT_COMMANDS card
{
    stats: function(args) {
        const player = this.loadCharacter('player');
        return `HP: ${player.hp.current}/${player.hp.max}`;
    },
    
    give: function(args) {
        // args = ["sword", "5"]
        const item = args[0];
        const qty = parseInt(args[1] || 1);
        const player = this.loadCharacter('player');
        player.inventory[item] = (player.inventory[item] || 0) + qty;
        this.saveCharacter(player);
        return `Gave ${qty} ${item}(s)`;
    }
}
```

#### Context Modifier (Context Transformation)
```javascript
// [RPG_RUNTIME] CONTEXT_MODIFIER card
// Full function body that modifies context text
const weather = this.getRuntimeValue('weather_state') || 'clear';
const weatherText = `[Weather: ${weather}]`;
text = text.replace(/# World Lore:/i, 
    `# World Lore:\n${weatherText}\n`);

const player = this.loadCharacter('player');
if (player && player.hp.current < 20) {
    text = text.replace(/# Recent Story:/i,
        `⚠️ WARNING: Critical Health!\n\n# Recent Story:`);
}

return text;  // MUST return the modified text
```

#### Input Modifier (Pure JavaScript Sandbox)
```javascript
// [RPG_RUNTIME] INPUT_MODIFIER card
// Pure JavaScript - NO access to game functions
if (text.includes('!')) {
    return text.toUpperCase();
}

const shortcuts = {
    'n': 'go north',
    's': 'go south',
    'e': 'go east',
    'w': 'go west'
};
if (shortcuts[text.toLowerCase()]) {
    return shortcuts[text.toLowerCase()];
}

return text;  // MUST return text
```

#### Output Modifier (Pure JavaScript Sandbox)
```javascript
// [RPG_RUNTIME] OUTPUT_MODIFIER card  
// Pure JavaScript - NO access to game functions
if (text.includes('critical hit')) {
    text = text.replace(/critical hit/gi, '💥 CRITICAL HIT 💥');
}

text = text.replace(/\.\.\./g, '...\n\n*pause*\n\n');

return text;  // MUST return text
```

#### Output Tools (LLM Tool Calls)
```javascript
// [RPG_RUNTIME] TOOLS card (standard tools)
{
    deal_damage: function(source, target, amount) {
        // Tool implementation
        return 'executed';
    },
    
    custom_tool: function(param1, param2) {
        // Designer's custom tool
        return 'executed';
    }
}
```

### Tool Return Values

- `'executed'` - Tool ran successfully
- `'malformed'` - Invalid parameters (removes from output)
- `'unknown'` - Tool doesn't exist (removes from output)

### Command Return Values

- `string` - Display this message to the player
- `null` or `undefined` - Pass input through unchanged
- Empty string or `'\n'` - Block the input

### Context Objects

#### Tools & Commands Context
```javascript
this.getRuntimeValue(varName)       // Read USER-DEFINED runtime variable
this.setRuntimeValue(varName, value) // Write USER-DEFINED runtime variable
this.loadAllCharacters()             // Get all characters
this.loadCharacter(name)             // Get specific character
this.saveCharacter(character)        // Save character changes
this.getField(characterName, fieldPath)  // Get character field value
this.setField(characterName, fieldPath, value)  // Set character field
this.Utilities                       // All utility functions
this.Calendar                        // If available
this.debug                           // Debug flag
```

#### Context Modifier Context
```javascript
this.getRuntimeValue(varName)       // Read USER-DEFINED runtime variable
this.setRuntimeValue(varName, value) // Write USER-DEFINED runtime variable
this.loadCharacter(name)             // Get specific character
this.Utilities                       // All utility functions
this.Calendar                        // If available
```

#### Input/Output Modifiers
- Pure JavaScript sandboxes
- NO access to game functions
- Must return modified text

**WARNING**: getRuntimeValue/setRuntimeValue are for USER variables only!

---

## Character Management

### Character Card Format

```
[CHARACTER] Name  or  [PLAYER] Name

## **CharacterName** Full Name
DOB: YYYY-MM-DD | Gender: X | HP: 100/100 | Level 5 (234/500 XP) | Current Location: town_square
### Appearance
[Physical description]
### Personality  
[Traits and mannerisms]
### Background
[History and role]
### Attributes
VITALITY: 10 | STRENGTH: 8 | DEXTERITY: 12 | AGILITY: 14
### Skills
one_handed_sword: Level 3 (45/300 XP)
### Inventory
{col:500, health_potion:2, iron_sword:1}
### Relationships
other_character=25 [Friendly]
```

### Character Operations

```javascript
// Load all characters
const characters = GameState.loadAllCharacters();

// Get specific character (case-insensitive)
const player = characters['player'];

// Modify character
player.hp.current = 50;
player.inventory.health_potion = 3;

// Save changes
GameState.saveCharacter(player);
```

---

## Runtime Configuration

### Runtime Variables (USER-DEFINED ONLY!)

**CRITICAL**: Runtime variables are ONLY for user-created custom mechanics!
- `getRuntimeValue()`/`setRuntimeValue()` are for DESIGNERS, not system code
- Core system functionality MUST use Story Cards or module variables
- Users can delete runtime variables at any time - never depend on them!

Declare in `[RPG_RUNTIME] Variables`:
```
weather_state: string
spawn_multiplier: float
active_events: array
boss_defeated: boolean
```

Store values in `[RPG_RUNTIME] DATA 1`:
```
# weather_state
rainy

# spawn_multiplier
1.5

# active_events
["festival", "double_xp"]

# boss_defeated
false
```

### Dynamic Tool Addition

Designers can add tools at any time by editing cards:

```javascript
// Add to [RPG_RUNTIME] TOOLS for output tools
,
instakill: function(target) {
    const character = this.loadCharacter(target);
    character.hp.current = 0;
    this.saveCharacter(character);
    return 'executed';
}
```

---

## Schema System

### Configurable Game Rules

#### Attributes Schema
```
[RPG_SCHEMA] Attributes

# Master Attributes (required)
* VITALITY
* STRENGTH  
* DEXTERITY
* AGILITY

## Additional Attributes (optional)
* LUCK
* CHARISMA
```

#### Core Stats Schema
```
[RPG_SCHEMA] Core Stats

# HP
default: 100
per_level_formula: 10 + VITALITY/2

# MP
default: 50
per_level_formula: 5 + INTELLIGENCE/3
```

#### Level Progression
```
[RPG_SCHEMA] Level Progression

# Level XP Formula
formula: level * level * 100

# Custom Level Overrides
5: 2000
10: 8000
20: 35000
```

### Schema Changes During Play

When schemas change mid-game:
1. Existing data is preserved
2. New fields added with defaults
3. Formulas recalculate automatically
4. No data loss occurs

---

## Designer Examples

### Custom Combat System

```javascript
// In [RPG_RUNTIME] TOOLS - Override deal_damage
,
deal_damage: function(source, target, amount) {
    const attacker = this.loadCharacter(source);
    const defender = this.loadCharacter(target);
    
    // Add critical hit system
    let damage = amount;
    if (Math.random() < 0.1) {
        damage *= 2;
        this.setRuntimeValue('last_crit', source);
    }
    
    // Add defense calculation
    damage = Math.max(1, damage - defender.attributes.vitality/10);
    
    // Apply damage
    defender.hp.current = Math.max(0, defender.hp.current - damage);
    
    // Custom death handling
    if (defender.hp.current === 0) {
        this.setRuntimeValue('death_count', 
            (this.getRuntimeValue('death_count') || 0) + 1);
    }
    
    this.saveCharacter(defender);
    return 'executed';
}
```

### Weather System

```javascript
// In [RPG_RUNTIME] CONTEXT_TOOLS
{
    weatherSystem: function(text) {
        const weather = this.getRuntimeValue('weather_state') || 'clear';
        const effects = {
            'rainy': 'The rain reduces visibility.',
            'stormy': 'Lightning flashes overhead!',
            'foggy': 'Dense fog obscures distant objects.',
            'clear': 'The weather is pleasant.'
        };
        
        // Add weather to context
        const weatherText = `[Weather: ${weather} - ${effects[weather]}]`;
        return text.replace(/# World Lore:/i, 
            `# World Lore:\n${weatherText}\n`);
    }
}

// In [RPG_RUNTIME] TOOLS - Let LLM change weather
,
change_weather: function(newWeather) {
    const valid = ['clear', 'rainy', 'stormy', 'foggy'];
    if (valid.includes(newWeather)) {
        this.setRuntimeValue('weather_state', newWeather);
        return 'executed';
    }
    return 'malformed';
}
```

### Cheat Commands

```javascript
// In [RPG_RUNTIME] INPUT_TOOLS
{
    godmode: function(args) {
        const player = this.loadCharacter('player');
        player.hp.current = 999999;
        player.hp.max = 999999;
        
        // Give all skills
        const skills = ['sword_mastery', 'magic', 'stealth'];
        skills.forEach(skill => {
            player.skills[skill] = {
                level: 99,
                xp: { current: 0, max: 100 }
            };
        });
        
        this.saveCharacter(player);
        return "\n"; // Block the command from reaching narrative
    }
}
```

---

## Best Practices

### Storage Management
1. **Never use state for game data** - Only for tiny session flags
2. **Story Cards are your database** - All persistent data goes here  
3. **Clean up temporary data** - Don't leave debugging data in state
4. **Runtime variables are USER SPACE** - Never use getRuntimeValue/setRuntimeValue for system data
5. **System data needs dedicated cards** - Create specific Story Cards for system features

### Tool Design
1. **Validate parameters** - Return 'malformed' for invalid input
2. **Check existence** - Characters might not exist
3. **Use snake_case** - All identifiers should be lowercase with underscores
4. **Return proper status** - 'executed', 'malformed', or 'unknown'

### Module Independence
1. **Check for dependencies** - `if (typeof Module !== 'undefined')`
2. **Provide fallbacks** - Don't crash if a module is missing
3. **Use Story Cards for data** - Modules share data through cards

### Performance
1. **Cache within hooks** - But never between them
2. **Batch card updates** - Minimize individual card writes
3. **Keep state tiny** - Under 10KB for safety (90KB limit)
4. **Moderate console.log** - Too much output can crash

### Designer Freedom
1. **Override anything** - Core tools can be completely replaced
2. **Add new mechanics** - Weather, hunger, sanity, anything
3. **Create shortcuts** - Input commands for testing
4. **Break the rules** - If designers want god mode, give them god mode

---

## Summary

SANE empowers designers to create any RPG experience they imagine without writing code. By providing complete control at three critical points (Input, Context, Output) and allowing unlimited runtime modification, SANE transforms AI Dungeon into a designer's sandbox.

The engine manages data. The LLM tells stories. Designers control everything else.

**Your adventure. Your rules. Your tools.**