/**
 * Test script for XmlContextBuilder
 * Run with: node test_xml_builder.js
 */

const fs = require('fs');
const builderCode = fs.readFileSync('./XmlContextBuilder.js', 'utf8');
eval(builderCode);

// Mock test input simulating AI Dungeon context
// Note: We intentionally put "trading" before "basics" in the input
// to test that nested priorities reorder them correctly
const testInput = `Some preamble text here.

# World Lore:

<$scene>
<current location="Town_Of_Beginnings" time="16:00" date="11/06/2022"/>
</$scene>

<$characters>
<character id="Diavel" gender="Male" level="1" hp="100/100">
  <personality>Charismatic natural leader who inspires confidence.</personality>
  <location>Town_Of_Beginnings</location>
</character>
</$characters>

<$characters>
<character id="Klein" gender="Male" level="1" hp="100/100">
  <personality>Cheerful and loyal, uses humor to defuse tension.</personality>
  <location>Town_Of_Beginnings</location>
</character>
</$characters>

<$lore><$currency id="trading">
NPC Merchants always trade for Col, but players may barter.
</$currency></$lore>

<$lore><$currency id="basics">
Col is the primary currency of Aincrad. It drops from monsters.
</$currency></$lore>

<$lore><$crime id="system">
All players begin as green players.
</$crime></$lore>

<$locations>
<location id="Town_Of_Beginnings" type="Safezone" floor="1">
  <description>Central starting city with massive circular plaza.</description>
  <connections east="Wolf_Woods" north="Northern_Mountains"/>
</location>
</$locations>

This is pure prose without any markers.
It should go into the uncategorized/general section.

Another prose paragraph here.

# Recent Story:
The adventure continues...
`;

console.log('=== INPUT ===');
console.log(testInput);
console.log('\n=== OUTPUT ===');

const output = BuildXmlContext(testInput);
console.log(output);

console.log('\n=== VERIFICATION ===');

// Check for proper nesting
const openTags = (output.match(/<[a-zA-Z_][^/>]*[^/]>/g) || []).length;
const closeTags = (output.match(/<\/[a-zA-Z_][^>]*>/g) || []).length;
const selfClosing = (output.match(/<[a-zA-Z_][^>]*\/>/g) || []).length;

console.log(`Open tags: ${openTags}`);
console.log(`Close tags: ${closeTags}`);
console.log(`Self-closing: ${selfClosing}`);

// Check for key elements
const checks = [
    ['<world>', output.includes('<world>')],
    ['</world>', output.includes('</world>')],
    ['<characters>', output.includes('<characters>')],
    ['<lore>', output.includes('<lore>')],
    ['<currency>', output.includes('<currency>')],
    ['<crime>', output.includes('<crime>')],
    ['<locations>', output.includes('<locations>')],
    ['<general>', output.includes('<general>')],
    ['<scene> before <world>', output.indexOf('<scene>') < output.indexOf('<world>')],
    ['Recent Story preserved', output.includes('Recent Story')],
];

console.log('\nStructure checks:');
for (const [name, passed] of checks) {
    console.log(`${passed ? '✓' : '✗'} ${name}`);
}

// Check nested priority ordering
console.log('\nNested priority checks:');
const currencyIndex = output.indexOf('<currency>');
const crimeIndex = output.indexOf('<crime>');
const basicsIndex = output.indexOf('<basics>');
const tradingIndex = output.indexOf('<trading>');

console.log(`${currencyIndex < crimeIndex ? '✓' : '✗'} <currency> before <crime> (within lore)`);
console.log(`${basicsIndex < tradingIndex ? '✓' : '✗'} <basics> before <trading> (within currency) - NOTE: requires config`);
