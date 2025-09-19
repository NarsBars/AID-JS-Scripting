function LocationModule() {
    'use strict';

    const MODULE_NAME = 'LocationModule';
    const debug = true;

    // Module will receive GameState API during init
    let GameState = null;

    return {
        // Component schema definitions
        schemas: {
            pathways: {
                id: 'pathways',
                defaults: {
                    // Connections to other locations
                    // Format: { "north": "location_id", "south": "location_id", etc. }
                    display: {
                        line: "section",
                        priority: 40,
                        format: "**Connections**\n$(*: • $(*.direction): $(*.destination))",
                        condition: "$(Object.keys(pathways).length > 0)"
                    }
                }
            }
        },

        // Tool definitions
        tools: {
            update_location: function(params) {
                const [characterName, locationName] = params;

                if (!characterName || !locationName) return 'malformed';

                const charName = String(characterName).toLowerCase();
                const locName = String(locationName).toLowerCase();

                // Get character
                const character = GameState.get(charName);
                if (!character) {
                    if (debug) console.log(`${MODULE_NAME}: Character ${charName} not found`);
                    if (GameState.trackUnknownEntity) {
                        GameState.trackUnknownEntity(charName, 'update_location');
                    }
                    return 'executed';
                }

                // Get location (optional - create if doesn't exist)
                let location = GameState.get(locName);
                if (!location) {
                    // Auto-create basic location if it doesn't exist
                    if (debug) console.log(`${MODULE_NAME}: Location ${locName} not found, creating basic location`);
                    location = {
                        id: locName,
                        GameplayTags: ['Location'],
                        components: ['info', 'pathways', 'display']
                    };
                    // Initialize components with defaults
                    if (GameState.initializeEntityComponents) {
                        GameState.initializeEntityComponents(location);
                    }
                    // Set basic info for the location
                    if (!location.info) location.info = {};
                    location.info.description = `A location called ${locName}`;
                    location.info.discovered = true;
                    location.info.visited = true;

                    GameState.save(locName, location);
                }

                // Ensure info component exists
                if (!character.info) character.info = {};

                // Store old location for reversion
                const oldLocation = character.info.currentLocation;

                // Update character's location
                character.info.currentLocation = locName;

                // Mark location as visited if it has the info component
                if (location.info) {
                    location.info.visited = true;
                    GameState.save(locName, location);
                }

                // Save character
                GameState.save(charName, character);

                if (debug) {
                    console.log(`${MODULE_NAME}: ${character.id || charName} moved from ${oldLocation || 'nowhere'} to ${location.id || locName}`);
                }

                return 'executed';
            },

            discover_location: function(params) {
                const [characterName, locationName, direction] = params;

                if (!characterName || !locationName) return 'malformed';

                const charName = String(characterName).toLowerCase();
                const locName = String(locationName).toLowerCase();
                const dir = direction ? String(direction).toLowerCase() : null;

                // Get character
                const character = GameState.get(charName);
                if (!character) {
                    if (debug) console.log(`${MODULE_NAME}: Character ${charName} not found`);
                    return 'executed';
                }

                // Get or create location
                let location = GameState.get(locName);
                if (!location) {
                    if (debug) console.log(`${MODULE_NAME}: Creating new location ${locName}`);
                    location = {
                        id: locName,
                        GameplayTags: ['Location'],
                        components: ['info', 'pathways', 'display']
                    };
                    // Initialize components with defaults
                    if (GameState.initializeEntityComponents) {
                        GameState.initializeEntityComponents(location);
                    }
                    if (!location.info) location.info = {};
                    location.info.description = `A location called ${locName}`;
                }

                // Mark as discovered
                if (!location.info) location.info = {};
                location.info.discovered = true;

                // If direction specified and character has current location, create connection
                if (dir && character.info?.currentLocation) {
                    const currentLoc = GameState.get(character.info.currentLocation);
                    if (currentLoc) {
                        // Add pathway from current location to new location
                        if (!currentLoc.pathways) currentLoc.pathways = {};
                        currentLoc.pathways[dir] = locName;

                        // Add reverse pathway if opposites are defined
                        const opposites = {
                            'north': 'south',
                            'south': 'north',
                            'east': 'west',
                            'west': 'east',
                            'up': 'down',
                            'down': 'up',
                            'inside': 'outside',
                            'outside': 'inside',
                            'enter': 'exit',
                            'exit': 'enter'
                        };

                        if (opposites[dir]) {
                            if (!location.pathways) location.pathways = {};
                            location.pathways[opposites[dir]] = character.info.currentLocation;
                        }

                        GameState.save(character.info.currentLocation, currentLoc);
                    }
                }

                // Save location
                GameState.save(locName, location);

                if (debug) {
                    console.log(`${MODULE_NAME}: ${character.id || charName} discovered ${location.id || locName}${dir ? ` to the ${dir}` : ''}`);
                }

                return 'executed';
            },

            connect_locations: function(params) {
                const [location1Name, location2Name, direction] = params;

                if (!location1Name || !location2Name) return 'malformed';

                const loc1Name = String(location1Name).toLowerCase();
                const loc2Name = String(location2Name).toLowerCase();
                const dir = direction ? String(direction).toLowerCase() : 'both';

                // Get or create both locations
                let loc1 = GameState.get(loc1Name);
                if (!loc1) {
                    if (debug) console.log(`${MODULE_NAME}: Creating location ${loc1Name}`);
                    loc1 = {
                        id: loc1Name,
                        GameplayTags: ['Location'],
                        components: ['info', 'pathways', 'display']
                    };
                    if (GameState.initializeEntityComponents) {
                        GameState.initializeEntityComponents(loc1);
                    }
                    if (!loc1.info) loc1.info = {};
                    loc1.info.description = `A location called ${loc1Name}`;
                }

                let loc2 = GameState.get(loc2Name);
                if (!loc2) {
                    if (debug) console.log(`${MODULE_NAME}: Creating location ${loc2Name}`);
                    loc2 = {
                        id: loc2Name,
                        GameplayTags: ['Location'],
                        components: ['info', 'pathways', 'display']
                    };
                    if (GameState.initializeEntityComponents) {
                        GameState.initializeEntityComponents(loc2);
                    }
                    if (!loc2.info) loc2.info = {};
                    loc2.info.description = `A location called ${loc2Name}`;
                }

                // Ensure pathways component exists
                if (!loc1.pathways) loc1.pathways = {};
                if (!loc2.pathways) loc2.pathways = {};

                // Handle direction connections
                if (dir === 'both') {
                    // Create bidirectional connection with generic names
                    loc1.pathways[loc2Name] = loc2Name;
                    loc2.pathways[loc1Name] = loc1Name;
                } else {
                    // Create directional connection
                    loc1.pathways[dir] = loc2Name;

                    // Add reverse pathway if opposites are defined
                    const opposites = {
                        'north': 'south',
                        'south': 'north',
                        'east': 'west',
                        'west': 'east',
                        'up': 'down',
                        'down': 'up',
                        'inside': 'outside',
                        'outside': 'inside',
                        'enter': 'exit',
                        'exit': 'enter'
                    };

                    if (opposites[dir]) {
                        loc2.pathways[opposites[dir]] = loc1Name;
                    }
                }

                // Save both locations
                GameState.save(loc1Name, loc1);
                GameState.save(loc2Name, loc2);

                if (debug) {
                    if (dir === 'both') {
                        console.log(`${MODULE_NAME}: Connected ${loc1.id || loc1Name} <-> ${loc2.id || loc2Name}`);
                    } else {
                        console.log(`${MODULE_NAME}: Connected ${loc1.id || loc1Name} -${dir}-> ${loc2.id || loc2Name}`);
                    }
                }

                return 'executed';
            },

            move_to: function(params) {
                // Alias for update_location for convenience
                return LocationModule().tools.update_location(params);
            }
        },

        // Module initialization
        init: function(api) {
            GameState = api;
        }
    };
}
LocationModule.isSANEModule = true;
