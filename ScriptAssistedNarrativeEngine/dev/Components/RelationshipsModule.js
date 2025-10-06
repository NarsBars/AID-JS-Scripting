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
        // Debug logging to identify the issue
        if (debug) {
            console.log(`${MODULE_NAME}: getRelationshipFlavor called with:`, {
                value: value,
                fromName: fromName,
                toName: toName,
                fromNameType: typeof fromName,
                toNameType: typeof toName
            });
        }

        // Safety check for undefined names
        if (fromName === undefined || fromName === null || toName === undefined || toName === null) {
            console.log(`${MODULE_NAME}: ERROR: getRelationshipFlavor called with undefined/null names - from: ${fromName}, to: ${toName}`);
            return `Unknown relationship`;
        }

        // Ensure names are strings
        fromName = String(fromName);
        toName = String(toName);

        // Additional safety check after string conversion
        if (!fromName || !toName) {
            console.log(`${MODULE_NAME}: ERROR: Names are empty after string conversion - from: '${fromName}', to: '${toName}'`);
            return `Unknown relationship`;
        }

        // Validate value is a number
        if (typeof value !== 'number' || isNaN(value)) {
            console.log(`${MODULE_NAME}: ERROR: Invalid value type - value: ${value}, type: ${typeof value}`);
            return `${fromName} has an indescribable relationship with ${toName}`;
        }

        for (const threshold of THRESHOLDS) {
            if (value >= threshold.min && value <= threshold.max) {
                // Check if threshold.flavor exists and is a string
                if (!threshold.flavor || typeof threshold.flavor !== 'string') {
                    console.log(`${MODULE_NAME}: ERROR: Threshold missing or invalid flavor text for range ${threshold.min}-${threshold.max}`);
                    console.log(`${MODULE_NAME}: threshold object:`, threshold);
                    return `${fromName} has an indescribable relationship with ${toName}`;
                }

                try {
                    // Ensure we're working with strings
                    const flavorText = String(threshold.flavor);
                    return flavorText
                        .replace('{from}', fromName)
                        .replace('{to}', toName);
                } catch (e) {
                    console.log(`${MODULE_NAME}: ERROR in replace:`, e.message);
                    console.log(`${MODULE_NAME}: threshold.flavor type:`, typeof threshold.flavor);
                    console.log(`${MODULE_NAME}: threshold.flavor value:`, threshold.flavor);
                    return `${fromName} has an indescribable relationship with ${toName}`;
                }
            }
        }
        return `${fromName} has an indescribable relationship with ${toName}`;
    }

    return {
        // Component schema definition
        schemas: {
            relationships: {
                id: 'relationships',
                thresholds: THRESHOLDS,
                defaults: {}  // Relationships are added dynamically, no defaults needed
            }
        },

        // Tool definitions
        tools: {
            update_relationship: function(params) {
                const [name1, name2, changeAmount] = params;

                if (!name1 || !name2) return 'malformed';

                // Convert to strings and normalize for lookup
                const char1Name = String(name1).toLowerCase();
                const char2Name = String(name2).toLowerCase();

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

                // Track unknown entities - pass original case names for tracking
                if (!char1 && GameState.trackUnknownEntity) {
                    GameState.trackUnknownEntity(name1, 'update_relationship');
                }
                if (!char2 && GameState.trackUnknownEntity) {
                    GameState.trackUnknownEntity(name2, 'update_relationship');
                }

                if (!char1 || !char2) {
                    if (debug) {
                        console.log(`${MODULE_NAME}: One or both characters not found: ${char1Name}, ${char2Name}`);
                    }
                    return 'executed';
                }

                // Ensure entities have ID fields (entities should always have IDs from GameState)
                if (!char1.id) {
                    console.log(`${MODULE_NAME}: Warning: Entity missing ID field, using normalized name: ${char1Name}`);
                    // Try to use original input name if available, otherwise use normalized
                    char1.id = name1 || char1Name;
                }
                if (!char2.id) {
                    console.log(`${MODULE_NAME}: Warning: Entity missing ID field, using normalized name: ${char2Name}`);
                    // Try to use original input name if available, otherwise use normalized
                    char2.id = name2 || char2Name;
                }

                // Ensure relationships component exists
                if (!char1.relationships) char1.relationships = {};
                if (!char2.relationships) char2.relationships = {};

                // Use the actual entity IDs for relationship keys (preserves case)
                // Ensure IDs are valid strings
                const char2Id = String(char2.id || name2);
                const char1Id = String(char1.id || name1);

                // Initialize relationship values if needed
                if (!char1.relationships[char2Id]) {
                    char1.relationships[char2Id] = { value: 0 };
                }
                if (!char2.relationships[char1Id]) {
                    char2.relationships[char1Id] = { value: 0 };
                }

                // Update bidirectional relationships
                char1.relationships[char2Id].value += change;
                char2.relationships[char1Id].value += change;

                const value1 = char1.relationships[char2Id].value;
                const value2 = char2.relationships[char1Id].value;

                let flavorText1, flavorText2;
                try {
                    flavorText1 = getRelationshipFlavor(value1, char1.id, char2.id);
                    flavorText2 = getRelationshipFlavor(value2, char2.id, char1.id);
                } catch (e) {
                    console.log(`${MODULE_NAME}: Error getting flavor text: ${e.message}`);
                    flavorText1 = `${value1} points`;
                    flavorText2 = `${value2} points`;
                }

                // Save both characters using their actual IDs
                try {
                    GameState.save(char1.id, char1);
                    GameState.save(char2.id, char2);
                } catch (e) {
                    console.log(`${MODULE_NAME}: Error saving entities: ${e.message}`);
                    console.log(`${MODULE_NAME}: Error stack:`, e.stack);
                    throw e; // Re-throw to make tool malformed
                }

                if (debug) {
                    console.log(`${MODULE_NAME}: ${char1Name}→${char2Name}: ${value1} (${flavorText1})`);
                    console.log(`${MODULE_NAME}: ${char2Name}→${char1Name}: ${value2} (${flavorText2})`);
                }

                return 'executed';
            }
        },

        // Module initialization
        init: function(api) {
            GameState = api;

            // Register the getRelationshipFlavor function with GameState
            if (api && api.registerFunction) {
                api.registerFunction('getRelationshipFlavor', getRelationshipFlavor);
            } else {
                // Fallback: make it globally available for template processing
                if (typeof window !== 'undefined') {
                    window.getRelationshipFlavor = getRelationshipFlavor;
                } else if (typeof global !== 'undefined') {
                    global.getRelationshipFlavor = getRelationshipFlavor;
                } else {
                    // For the AI Dungeon environment
                    this.getRelationshipFlavor = getRelationshipFlavor;
                }
            }
        },

        // Expose the helper function for external use
        getRelationshipFlavor: getRelationshipFlavor
    };
}
RelationshipsModule.isSANEModule = true;
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RelationshipsModule;
}
