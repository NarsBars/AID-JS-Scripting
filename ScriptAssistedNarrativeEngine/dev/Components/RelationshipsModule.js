function RelationshipsModule() {
    'use strict';

    const MODULE_NAME = 'RelationshipsModule';
    const debug = true;

    // Module will receive GameState API during init
    let GameState = null;

    // Relationship thresholds for flavor text
    const THRESHOLDS = [
        { min: -9999, max: -2000, flavor: "{from}'s hatred for {to} consumes their every thought" },
        { min: -1999, max: -1000, flavor: "{from} would sacrifice everything to see {to} destroyed" },
        { min: -999, max: -500, flavor: "{from} actively wishes harm upon {to}" },
        { min: -499, max: -200, flavor: "{from} feels genuine hostility toward {to}" },
        { min: -199, max: -100, flavor: "{from} strongly dislikes {to}" },
        { min: -99, max: -50, flavor: "{from} finds {to} irritating and unpleasant" },
        { min: -49, max: -25, flavor: "{from} feels mild annoyance toward {to}" },
        { min: -24, max: 24, flavor: "{from} feels neutral about {to}" },
        { min: 25, max: 49, flavor: "{from} has slightly positive feelings toward {to}" },
        { min: 50, max: 99, flavor: "{from} enjoys {to}'s company" },
        { min: 100, max: 199, flavor: "{from} considers {to} a friend" },
        { min: 200, max: 499, flavor: "{from} cares deeply about {to}'s wellbeing" },
        { min: 500, max: 999, flavor: "{from} trusts {to} completely" },
        { min: 1000, max: 1999, flavor: "{from} considers {to} family" },
        { min: 2000, max: 9999, flavor: "{from} would do absolutely anything for {to}" }
    ];

    // Helper function to get relationship flavor text
    function getRelationshipFlavor(value, fromName, toName) {
        for (const threshold of THRESHOLDS) {
            if (value >= threshold.min && value <= threshold.max) {
                return threshold.flavor
                    .replace('{from}', fromName)
                    .replace('{to}', toName);
            }
        }
        return `${fromName} has an indescribable relationship with ${toName}`;
    }

    return {
        // Component schema definition
        schemas: {
            relationships: {
                id: 'relationships',
                thresholds: THRESHOLDS
            }
        },

        // Tool definitions
        tools: {
            update_relationship: function(params) {
                const [name1, name2, changeAmount] = params;

                if (!name1 || !name2) return 'malformed';

                // Convert to strings for lookup
                const char1Name = String(name1);
                const char2Name = String(name2);

                // Validate change amount
                const changeStr = String(changeAmount).trim();
                if (!/^-?\d+$/.test(changeStr)) {
                    if (debug) console.log(`${MODULE_NAME}: Invalid change amount format: ${changeAmount}`);
                    return 'malformed';
                }
                const change = parseInt(changeStr);

                // 0 change is malformed
                if (isNaN(change) || change === 0) {
                    if (debug) console.log(`${MODULE_NAME}: Invalid relationship change: ${change}`);
                    return 'malformed';
                }

                // Get both characters
                const char1 = GameState.get(char1Name);
                const char2 = GameState.get(char2Name);

                // Track unknown entities
                if (!char1 && GameState.trackUnknownEntity) {
                    GameState.trackUnknownEntity(char1Name, 'update_relationship');
                }
                if (!char2 && GameState.trackUnknownEntity) {
                    GameState.trackUnknownEntity(char2Name, 'update_relationship');
                }

                if (!char1 || !char2) {
                    if (debug) {
                        console.log(`${MODULE_NAME}: One or both characters not found: ${char1Name}, ${char2Name}`);
                    }
                    return 'executed';
                }

                // Ensure relationships component exists
                if (!char1.relationships) char1.relationships = {};
                if (!char2.relationships) char2.relationships = {};

                // Initialize relationship values if needed
                if (!char1.relationships[char2Name]) {
                    char1.relationships[char2Name] = 0;
                }
                if (!char2.relationships[char1Name]) {
                    char2.relationships[char1Name] = 0;
                }

                // Update bidirectional relationships
                char1.relationships[char2Name] += change;
                char2.relationships[char1Name] += change;

                const value1 = char1.relationships[char2Name];
                const value2 = char2.relationships[char1Name];

                const flavorText1 = getRelationshipFlavor(value1, char1.id || char1Name, char2.id || char2Name);
                const flavorText2 = getRelationshipFlavor(value2, char2.id || char2Name, char1.id || char1Name);

                // Save both characters
                GameState.save(char1Name, char1);
                GameState.save(char2Name, char2);

                if (debug) {
                    console.log(`${MODULE_NAME}: ${char1Name}→${char2Name}: ${value1} (${flavorText1})`);
                    console.log(`${MODULE_NAME}: ${char2Name}→${char1Name}: ${value2} (${flavorText2})`);
                }

                return 'executed';
            },

            set_relationship: function(params) {
                const [name1, name2, value] = params;

                if (!name1 || !name2) return 'malformed';

                // Convert to strings for lookup
                const char1Name = String(name1);
                const char2Name = String(name2);

                // Validate value
                const valueStr = String(value).trim();
                if (!/^-?\d+$/.test(valueStr)) {
                    if (debug) console.log(`${MODULE_NAME}: Invalid value format: ${value}`);
                    return 'malformed';
                }
                const newValue = parseInt(valueStr);

                if (isNaN(newValue)) {
                    if (debug) console.log(`${MODULE_NAME}: Invalid relationship value: ${newValue}`);
                    return 'malformed';
                }

                // Get both characters
                const char1 = GameState.get(char1Name);
                const char2 = GameState.get(char2Name);

                if (!char1 || !char2) {
                    if (debug) {
                        console.log(`${MODULE_NAME}: One or both characters not found: ${char1Name}, ${char2Name}`);
                    }
                    return 'executed';
                }

                // Ensure relationships component exists
                if (!char1.relationships) char1.relationships = {};
                if (!char2.relationships) char2.relationships = {};

                // Set bidirectional relationships to the same value
                char1.relationships[char2Name] = newValue;
                char2.relationships[char1Name] = newValue;

                const flavorText1 = getRelationshipFlavor(newValue, char1.id || char1Name, char2.id || char2Name);
                const flavorText2 = getRelationshipFlavor(newValue, char2.id || char2Name, char1.id || char1Name);

                // Save both characters
                GameState.save(char1Name, char1);
                GameState.save(char2Name, char2);

                if (debug) {
                    console.log(`${MODULE_NAME}: Set ${char1Name}↔${char2Name} relationship to ${newValue}`);
                    console.log(`${MODULE_NAME}: ${flavorText1}`);
                    console.log(`${MODULE_NAME}: ${flavorText2}`);
                }

                return 'executed';
            },

            get_relationship: function(params) {
                const [name1, name2] = params;

                if (!name1 || !name2) return 'malformed';

                const char1Name = String(name1);
                const char2Name = String(name2);

                // Get first character
                const char1 = GameState.get(char1Name);
                if (!char1) {
                    if (debug) console.log(`${MODULE_NAME}: Character ${char1Name} not found`);
                    return 'executed';
                }

                // Check if relationship exists
                const value = char1.relationships?.[char2Name] || 0;
                const flavorText = getRelationshipFlavor(value, char1.id || char1Name, char2Name);

                if (debug) {
                    console.log(`${MODULE_NAME}: ${char1Name}→${char2Name}: ${value} (${flavorText})`);
                }

                return 'executed';
            }
        },

        // Module initialization
        init: function(api) {
            GameState = api;
        }
    };
}
RelationshipsModule.isSANEModule = true;
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RelationshipsModule;
}
