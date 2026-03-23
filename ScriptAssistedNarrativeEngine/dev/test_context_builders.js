/**
 * Test script comparing XML and JSON context builders using ACTUAL SANE entity format
 * Run with: node test_context_builders.js
 */

const fs = require('fs');

// Load all three builders
const xmlBuilderCode = fs.readFileSync('./XmlContextBuilder.js', 'utf8');
const jsonBuilderCode = fs.readFileSync('./JsonContextBuilder.js', 'utf8');
const mdBuilderCode = fs.readFileSync('./SortHeader.js', 'utf8');
eval(xmlBuilderCode);
eval(jsonBuilderCode);
eval(mdBuilderCode);

// ========================================
// ACTUAL SANE ENTITY FORMAT - Markdown (current production format)
// ========================================
// This is what Story Card `value` fields actually look like
const mdTestInput = `Some preamble text here.

# World Lore:

<$## Currency>
Col is the primary currency of Aincrad. It is the most common drop from monsters and a common reward from quests. NPC Merchants will always trade for Col, however, some players may only barter in equipment or services.

<$# Criminal System>
All players begin as green players, all crimes are prevented by the Cardinal System within safezones and settlements.
**Cursor Colors**:
- Green: Normal player, almost all players remain green.
- Orange: Criminal, committed theft/assault, fades after 3 days without incidents
- Red: Murderer, killed green/orange players, permanent until quest redemption

<$# Character>
## **Diavel**
Gender: Male | Level: 1 (0/1000) | HP: 100/100 | Location: Town_Of_Beginnings
**Attributes**
VITALITY: 11 | STRENGTH: 11 | DEXTERITY: 10 | AGILITY: 10
**Appearance**
Hair: Blue, wavy | Build: Tall, knightly bearing | Eyes: Blue
**Personality**
Charismatic natural leader who inspires confidence. Believes in cooperation over competition.
**Skills**
- One Handed Sword: Level 1 (0/80 XP)
- Leadership: Level 1 (0/80 XP)
**Inventory**
- Starter Sword x1
- Bread x5
- Health Potion x3

<$# Character>
## **Klein** [Ryoutarou Tsuboi]
Gender: Male | Level: 1 (0/1000) | HP: 100/100 | Location: Town_Of_Beginnings
**Attributes**
VITALITY: 12 | STRENGTH: 11 | DEXTERITY: 9 | AGILITY: 8
**Appearance**
Hair: Red spiky with bandana | Build: Tall, sturdy | Eyes: Brown
**Personality**
Cheerful and loyal, uses humor to defuse tension. Natural big brother figure who prioritizes friends over personal advancement.
**Skills**
- One Handed Curved Sword: Level 1 (0/80 XP)
- Leadership: Level 1 (0/80 XP)
**Inventory**
- Starter Scimitar x1
- Bread x4
- Health Potion x3

<$# Character>
## **Silica** [Keiko Ayano]
Gender: Female | Level: 1 (0/1000) | HP: 100/100 | Location: Town_Of_Beginnings
**Attributes**
VITALITY: 8 | STRENGTH: 7 | DEXTERITY: 13 | AGILITY: 12
**Appearance**
Hair: Short light brown with pig tails | Build: Petite | Eyes: Red-brown
**Personality**
Initially timid but naturally cheerful. Seeks validation through helping others. Animal lover with surprising courage when protecting those she cares about.
**Skills**
- Dagger: Level 1 (0/80 XP)
- Hiding: Level 1 (0/80 XP)
**Inventory**
- Starter Dagger x1
- Bread x5
- Health Potion x3

<$# Character>
## **Argo**
Gender: Female | Level: 1 (0/1000) | HP: 100/100 | Location: Town_Of_Beginnings
**Attributes**
VITALITY: 8 | STRENGTH: 7 | DEXTERITY: 14 | AGILITY: 13
**Appearance**
Hair: Curly brown | Build: Short, agile | Eyes: Brown | Distinctive: Whisker marks painted on face
**Personality**
Shrewd information broker with strict business ethics. Never sells information that would directly harm players. Playful yet professional.
**Skills**
- Dagger: Level 1 (0/80 XP)
- Hiding: Level 1 (0/80 XP)
**Inventory**
- Starter Dagger x1
- Bread x3
- Health Potion x1
- Writing Materials x1

<$# Character>
## **Lisbeth** [Rika Shinozaki]
Gender: Female | Level: 1 (0/1000) | HP: 100/100 | Location: Town_Of_Beginnings
**Attributes**
VITALITY: 11 | STRENGTH: 10 | DEXTERITY: 11 | AGILITY: 8
**Appearance**
Hair: Pink (dyed in-game) | Build: Average height, sturdy | Eyes: Brown
**Personality**
Cheerful and outgoing with a mischievous streak. Direct communicator who values honesty. Natural craftswoman who takes pride in quality work.
**Skills**
- Mace: Level 1 (0/80 XP)
- Blacksmithing: Level 1 (0/80 XP)
**Inventory**
- Starter Mace x1
- Bread x4
- Health Potion x2

<$# Locations>
## **Town of Beginnings**
Floor: Floor One | Type: Safezones
**Safe Zone** - No damage can occur
**Description**
Central starting city, massive circular plaza with Black Iron Palace
**Connections**
- East: Wolf Woods
- North: Northern Mountains
- South: Lake Region
- West: West Fields

<$# Locations>
## **Wolf Woods**
Floor: Floor One | Type: Wilderness
**Description**
Forest area east of Town of Beginnings leading toward Tolbana
**Connections**
- West: Town of Beginnings

# Recent Story:
The adventure continues...
`;

// ========================================
// XML FORMAT - Same data represented as XML
// ========================================
const xmlTestInput = `Some preamble text here.

# World Lore:

<$lore><$currency>
Col is the primary currency of Aincrad. It is the most common drop from monsters and a common reward from quests. NPC Merchants will always trade for Col, however, some players may only barter in equipment or services.
</$currency></$lore>

<$rules><$crime>
<description>All players begin as green players, all crimes are prevented by the Cardinal System within safezones and settlements.</description>
<cursor_colors>
  <green>Normal player, almost all players remain green.</green>
  <orange>Criminal, committed theft/assault, fades after 3 days without incidents</orange>
  <red>Murderer, killed green/orange players, permanent until quest redemption</red>
</cursor_colors>
</$crime></$rules>

<$characters>
<character id="Diavel" gender="Male" level="1" xp="0/1000" hp="100/100" location="Town_Of_Beginnings">
  <attributes vitality="11" strength="11" dexterity="10" agility="10"/>
  <appearance>Hair: Blue, wavy | Build: Tall, knightly bearing | Eyes: Blue</appearance>
  <personality>Charismatic natural leader who inspires confidence. Believes in cooperation over competition.</personality>
  <skills>
    <skill name="One Handed Sword" level="1" xp="0/80"/>
    <skill name="Leadership" level="1" xp="0/80"/>
  </skills>
  <inventory>
    <item name="Starter Sword" qty="1"/>
    <item name="Bread" qty="5"/>
    <item name="Health Potion" qty="3"/>
  </inventory>
</character>
</$characters>

<$characters>
<character id="Klein" realname="Ryoutarou Tsuboi" gender="Male" level="1" xp="0/1000" hp="100/100" location="Town_Of_Beginnings">
  <attributes vitality="12" strength="11" dexterity="9" agility="8"/>
  <appearance>Hair: Red spiky with bandana | Build: Tall, sturdy | Eyes: Brown</appearance>
  <personality>Cheerful and loyal, uses humor to defuse tension. Natural big brother figure who prioritizes friends over personal advancement.</personality>
  <skills>
    <skill name="One Handed Curved Sword" level="1" xp="0/80"/>
    <skill name="Leadership" level="1" xp="0/80"/>
  </skills>
  <inventory>
    <item name="Starter Scimitar" qty="1"/>
    <item name="Bread" qty="4"/>
    <item name="Health Potion" qty="3"/>
  </inventory>
</character>
</$characters>

<$characters>
<character id="Silica" realname="Keiko Ayano" gender="Female" level="1" xp="0/1000" hp="100/100" location="Town_Of_Beginnings">
  <attributes vitality="8" strength="7" dexterity="13" agility="12"/>
  <appearance>Hair: Short light brown with pig tails | Build: Petite | Eyes: Red-brown</appearance>
  <personality>Initially timid but naturally cheerful. Seeks validation through helping others. Animal lover with surprising courage when protecting those she cares about.</personality>
  <skills>
    <skill name="Dagger" level="1" xp="0/80"/>
    <skill name="Hiding" level="1" xp="0/80"/>
  </skills>
  <inventory>
    <item name="Starter Dagger" qty="1"/>
    <item name="Bread" qty="5"/>
    <item name="Health Potion" qty="3"/>
  </inventory>
</character>
</$characters>

<$characters>
<character id="Argo" gender="Female" level="1" xp="0/1000" hp="100/100" location="Town_Of_Beginnings">
  <attributes vitality="8" strength="7" dexterity="14" agility="13"/>
  <appearance>Hair: Curly brown | Build: Short, agile | Eyes: Brown | Distinctive: Whisker marks painted on face</appearance>
  <personality>Shrewd information broker with strict business ethics. Never sells information that would directly harm players. Playful yet professional.</personality>
  <skills>
    <skill name="Dagger" level="1" xp="0/80"/>
    <skill name="Hiding" level="1" xp="0/80"/>
  </skills>
  <inventory>
    <item name="Starter Dagger" qty="1"/>
    <item name="Bread" qty="3"/>
    <item name="Health Potion" qty="1"/>
    <item name="Writing Materials" qty="1"/>
  </inventory>
</character>
</$characters>

<$characters>
<character id="Lisbeth" realname="Rika Shinozaki" gender="Female" level="1" xp="0/1000" hp="100/100" location="Town_Of_Beginnings">
  <attributes vitality="11" strength="10" dexterity="11" agility="8"/>
  <appearance>Hair: Pink (dyed in-game) | Build: Average height, sturdy | Eyes: Brown</appearance>
  <personality>Cheerful and outgoing with a mischievous streak. Direct communicator who values honesty. Natural craftswoman who takes pride in quality work.</personality>
  <skills>
    <skill name="Mace" level="1" xp="0/80"/>
    <skill name="Blacksmithing" level="1" xp="0/80"/>
  </skills>
  <inventory>
    <item name="Starter Mace" qty="1"/>
    <item name="Bread" qty="4"/>
    <item name="Health Potion" qty="2"/>
  </inventory>
</character>
</$characters>

<$locations>
<location id="Town_of_Beginnings" floor="Floor One" type="Safezone" safezone="true">
  <description>Central starting city, massive circular plaza with Black Iron Palace</description>
  <connections east="Wolf_Woods" north="Northern_Mountains" south="Lake_Region" west="West_Fields"/>
</location>
</$locations>

<$locations>
<location id="Wolf_Woods" floor="Floor One" type="Wilderness">
  <description>Forest area east of Town of Beginnings leading toward Tolbana</description>
  <connections west="Town_of_Beginnings"/>
</location>
</$locations>

# Recent Story:
The adventure continues...
`;

// ========================================
// JSON FORMAT - Same data represented as JSON
// ========================================
const jsonTestInput = `Some preamble text here.

# World Lore:

<$lore><$currency>
Col is the primary currency of Aincrad. It is the most common drop from monsters and a common reward from quests. NPC Merchants will always trade for Col, however, some players may only barter in equipment or services.
</$currency></$lore>

<$rules><$crime>
{"description": "All players begin as green players, all crimes are prevented by the Cardinal System within safezones and settlements.", "cursor_colors": {"green": "Normal player, almost all players remain green.", "orange": "Criminal, committed theft/assault, fades after 3 days without incidents", "red": "Murderer, killed green/orange players, permanent until quest redemption"}}
</$crime></$rules>

<$characters>
{"id": "Diavel", "gender": "Male", "level": 1, "xp": "0/1000", "hp": "100/100", "location": "Town_Of_Beginnings", "attributes": {"vitality": 11, "strength": 11, "dexterity": 10, "agility": 10}, "appearance": "Hair: Blue, wavy | Build: Tall, knightly bearing | Eyes: Blue", "personality": "Charismatic natural leader who inspires confidence. Believes in cooperation over competition.", "skills": [{"name": "One Handed Sword", "level": 1, "xp": "0/80"}, {"name": "Leadership", "level": 1, "xp": "0/80"}], "inventory": [{"name": "Starter Sword", "qty": 1}, {"name": "Bread", "qty": 5}, {"name": "Health Potion", "qty": 3}]}
</$characters>

<$characters>
{"id": "Klein", "realname": "Ryoutarou Tsuboi", "gender": "Male", "level": 1, "xp": "0/1000", "hp": "100/100", "location": "Town_Of_Beginnings", "attributes": {"vitality": 12, "strength": 11, "dexterity": 9, "agility": 8}, "appearance": "Hair: Red spiky with bandana | Build: Tall, sturdy | Eyes: Brown", "personality": "Cheerful and loyal, uses humor to defuse tension. Natural big brother figure who prioritizes friends over personal advancement.", "skills": [{"name": "One Handed Curved Sword", "level": 1, "xp": "0/80"}, {"name": "Leadership", "level": 1, "xp": "0/80"}], "inventory": [{"name": "Starter Scimitar", "qty": 1}, {"name": "Bread", "qty": 4}, {"name": "Health Potion", "qty": 3}]}
</$characters>

<$characters>
{"id": "Silica", "realname": "Keiko Ayano", "gender": "Female", "level": 1, "xp": "0/1000", "hp": "100/100", "location": "Town_Of_Beginnings", "attributes": {"vitality": 8, "strength": 7, "dexterity": 13, "agility": 12}, "appearance": "Hair: Short light brown with pig tails | Build: Petite | Eyes: Red-brown", "personality": "Initially timid but naturally cheerful. Seeks validation through helping others. Animal lover with surprising courage when protecting those she cares about.", "skills": [{"name": "Dagger", "level": 1, "xp": "0/80"}, {"name": "Hiding", "level": 1, "xp": "0/80"}], "inventory": [{"name": "Starter Dagger", "qty": 1}, {"name": "Bread", "qty": 5}, {"name": "Health Potion", "qty": 3}]}
</$characters>

<$characters>
{"id": "Argo", "gender": "Female", "level": 1, "xp": "0/1000", "hp": "100/100", "location": "Town_Of_Beginnings", "attributes": {"vitality": 8, "strength": 7, "dexterity": 14, "agility": 13}, "appearance": "Hair: Curly brown | Build: Short, agile | Eyes: Brown | Distinctive: Whisker marks painted on face", "personality": "Shrewd information broker with strict business ethics. Never sells information that would directly harm players. Playful yet professional.", "skills": [{"name": "Dagger", "level": 1, "xp": "0/80"}, {"name": "Hiding", "level": 1, "xp": "0/80"}], "inventory": [{"name": "Starter Dagger", "qty": 1}, {"name": "Bread", "qty": 3}, {"name": "Health Potion", "qty": 1}, {"name": "Writing Materials", "qty": 1}]}
</$characters>

<$characters>
{"id": "Lisbeth", "realname": "Rika Shinozaki", "gender": "Female", "level": 1, "xp": "0/1000", "hp": "100/100", "location": "Town_Of_Beginnings", "attributes": {"vitality": 11, "strength": 10, "dexterity": 11, "agility": 8}, "appearance": "Hair: Pink (dyed in-game) | Build: Average height, sturdy | Eyes: Brown", "personality": "Cheerful and outgoing with a mischievous streak. Direct communicator who values honesty. Natural craftswoman who takes pride in quality work.", "skills": [{"name": "Mace", "level": 1, "xp": "0/80"}, {"name": "Blacksmithing", "level": 1, "xp": "0/80"}], "inventory": [{"name": "Starter Mace", "qty": 1}, {"name": "Bread", "qty": 4}, {"name": "Health Potion", "qty": 2}]}
</$characters>

<$locations>
{"id": "Town_of_Beginnings", "floor": "Floor One", "type": "Safezone", "safezone": true, "description": "Central starting city, massive circular plaza with Black Iron Palace", "connections": {"east": "Wolf_Woods", "north": "Northern_Mountains", "south": "Lake_Region", "west": "West_Fields"}}
</$locations>

<$locations>
{"id": "Wolf_Woods", "floor": "Floor One", "type": "Wilderness", "description": "Forest area east of Town of Beginnings leading toward Tolbana", "connections": {"west": "Town_of_Beginnings"}}
</$locations>

# Recent Story:
The adventure continues...
`;

// ========================================
// MARKDOWN OUTPUT (original SortHeader)
// ========================================
console.log('='.repeat(80));
console.log('MARKDOWN OUTPUT (using SortHeader)');
console.log('='.repeat(80));

// Mock Utilities for SortHeader with config
const mockConfig = `# Header Priority Configuration
## Level 1 Headers
-10: Character
10: Locations
## Level 2 Headers
10: Currency
## Level 3 Headers
## Settings
uncategorized_header: General
uncategorized_priority: 0
sort_unlisted: true`;

global.Utilities = {
    storyCard: {
        get: (title) => {
            if (title === '[HEADERS CONFIG]') {
                return { entry: mockConfig };
            }
            return null;
        },
        add: () => {}
    }
};
const mdOutput = GiveMeHeaders(mdTestInput);
console.log(mdOutput);

// ========================================
// XML OUTPUT
// ========================================
console.log('\n' + '='.repeat(80));
console.log('XML OUTPUT');
console.log('='.repeat(80));
const xmlOutput = BuildXmlContext(xmlTestInput);
console.log(xmlOutput);

// ========================================
// JSON OUTPUT
// ========================================
console.log('\n' + '='.repeat(80));
console.log('JSON OUTPUT');
console.log('='.repeat(80));
const jsonOutput = BuildJsonContext(jsonTestInput);
console.log(jsonOutput);

// ========================================
// COMPARISON
// ========================================
console.log('\n' + '='.repeat(80));
console.log('COMPARISON');
console.log('='.repeat(80));

// Extract ALL structured content (everything between preamble and Recent Story)
const mdStructuredSection = mdOutput.substring(
    mdOutput.indexOf('# Character') > -1 ? mdOutput.indexOf('# Character') : mdOutput.indexOf('# World Lore:'),
    mdOutput.indexOf('# Recent Story')
).trim();

const xmlStructuredSection = xmlOutput.substring(
    xmlOutput.indexOf('<world>') > -1 ? xmlOutput.indexOf('<world>') : 0,
    xmlOutput.indexOf('# Recent Story') > -1 ? xmlOutput.indexOf('# Recent Story') : xmlOutput.length
).trim();

const jsonStructuredSection = jsonOutput.substring(
    jsonOutput.indexOf('{'),
    jsonOutput.indexOf('# Recent Story') > -1 ? jsonOutput.indexOf('# Recent Story') : jsonOutput.length
).trim();

console.log('\n--- Character/Token Counts (All Structured Content) ---');
console.log(`Markdown: ${mdStructuredSection.length} chars (~${Math.round(mdStructuredSection.length/4)} tokens)`);
console.log(`XML:      ${xmlStructuredSection.length} chars (~${Math.round(xmlStructuredSection.length/4)} tokens)`);
console.log(`JSON:     ${jsonStructuredSection.length} chars (~${Math.round(jsonStructuredSection.length/4)} tokens)`);

// Find smallest
const sizes = [
    { name: 'Markdown', size: mdStructuredSection.length },
    { name: 'XML', size: xmlStructuredSection.length },
    { name: 'JSON', size: jsonStructuredSection.length }
];
sizes.sort((a, b) => a.size - b.size);

console.log(`\nSmallest: ${sizes[0].name} (${sizes[0].size} chars)`);
console.log(`Middle:   ${sizes[1].name} (${sizes[1].size} chars)`);
console.log(`Largest:  ${sizes[2].name} (${sizes[2].size} chars)`);

// Percentage comparisons
const smallest = sizes[0].size;
console.log(`\n--- Size Comparison (relative to smallest) ---`);
for (const s of sizes) {
    const diff = s.size - smallest;
    const pct = Math.round((diff / smallest) * 100);
    console.log(`${s.name}: ${diff === 0 ? 'baseline' : `+${diff} chars (+${pct}%)`}`);
}

// Count structural elements
console.log('\n--- Structural Elements ---');
const mdHeaders = (mdOutput.match(/^#{1,6}\s/gm) || []).length;
const mdBold = (mdOutput.match(/\*\*[^*]+\*\*/g) || []).length;
const xmlTags = (xmlOutput.match(/<\/?[a-zA-Z_][^>]*>/g) || []).length;
const jsonBraces = (jsonOutput.match(/[{}\[\]]/g) || []).length;
const jsonQuotes = (jsonOutput.match(/"/g) || []).length;

console.log(`Markdown: ${mdHeaders} headers, ${mdBold} bold markers`);
console.log(`XML: ${xmlTags} tags`);
console.log(`JSON: ${jsonBraces} braces/brackets, ${jsonQuotes} quotes`);

// Data density comparison
console.log('\n--- Data Density Analysis ---');
// Count "meaningful" content vs structural overhead
const mdContent = mdStructuredSection.replace(/#{1,6}\s*/g, '').replace(/\*\*/g, '').replace(/\n+/g, ' ').trim();
const xmlContent = xmlStructuredSection.replace(/<\/?[a-zA-Z_][^>]*>/g, '').replace(/\n+/g, ' ').trim();
const jsonContent = jsonStructuredSection.replace(/[{}\[\]":,]/g, '').replace(/\n+/g, ' ').trim();

console.log(`Markdown content (no headers/bold): ${mdContent.length} chars`);
console.log(`XML content (no tags): ${xmlContent.length} chars`);
console.log(`JSON content (no syntax): ${jsonContent.length} chars`);

const mdOverhead = mdStructuredSection.length - mdContent.length;
const xmlOverhead = xmlStructuredSection.length - xmlContent.length;
const jsonOverhead = jsonStructuredSection.length - jsonContent.length;

console.log(`\nStructural overhead:`);
console.log(`Markdown: ${mdOverhead} chars (${Math.round(mdOverhead/mdStructuredSection.length*100)}%)`);
console.log(`XML: ${xmlOverhead} chars (${Math.round(xmlOverhead/xmlStructuredSection.length*100)}%)`);
console.log(`JSON: ${jsonOverhead} chars (${Math.round(jsonOverhead/jsonStructuredSection.length*100)}%)`);
