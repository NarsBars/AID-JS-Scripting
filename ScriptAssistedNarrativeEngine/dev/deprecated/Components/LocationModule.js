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
                defaults: {}  // Connections to other locations - Format: { "north": "location_id", "south": "location_id", etc. }
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

                // Get location - must already exist
                const location = GameState.get(locName);
                if (!location) {
                    if (debug) console.log(`${MODULE_NAME}: Location ${locName} not found - use discover_location first`);
                    // Track unknown location for potential generation
                    if (GameState.trackUnknownEntity) {
                        GameState.trackUnknownEntity(locName, 'update_location');
                    }
                    return 'executed';
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

                // Check if location already exists - if so, it's already discovered!
                let location = GameState.get(locName);
                if (location) {
                    if (debug) console.log(`${MODULE_NAME}: Location ${locName} already exists - cannot discover existing location`);
                    return 'malformed';
                }

                // Create new location using blueprint
                if (debug) console.log(`${MODULE_NAME}: Creating new location ${locName} using blueprint`);

                // Use instantiateBlueprint to create location with GenerationWizard support
                if (GameState.instantiateBlueprint) {
                    const locationData = {
                        info: {
                            displayname: locName,
                            trigger_name: locName,
                            discovered: true
                        },
                        pathways: {}
                    };

                    // If direction specified, set up pathways before creation
                    if (dir && character.info?.currentLocation) {
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

                        // Add reverse pathway in the new location
                        if (opposites[dir]) {
                            locationData.pathways[opposites[dir]] = { destination: character.info.currentLocation };
                        }
                    }

                    const newLocationId = GameState.instantiateBlueprint('Location', locationData);
                    if (newLocationId) {
                        location = GameState.get(newLocationId);
                    }
                }

                // Fallback if blueprint system not available
                if (!location) {
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
                        location.info.displayname = locName;
                        location.info.description = `A location called ${locName}`;
                        location.info.discovered = true;
                        GameState.save(locName, location);
                }

                // If direction specified and character has current location, create connection
                if (dir && character.info?.currentLocation) {
                    const currentLoc = GameState.get(character.info.currentLocation);
                    if (currentLoc) {
                        // Add pathway from current location to new location
                        if (!currentLoc.pathways) currentLoc.pathways = {};
                        currentLoc.pathways[dir] = { destination: locName };

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
                            location.pathways[opposites[dir]] = { destination: character.info.currentLocation };
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

                // Helper function to create location using blueprint
                function getOrCreateLocation(locationName) {
                    let location = GameState.get(locationName);
                    if (!location) {
                        if (debug) console.log(`${MODULE_NAME}: Creating location ${locationName} using blueprint`);

                        // Use instantiateBlueprint to create location with GenerationWizard support
                        if (GameState.instantiateBlueprint) {
                            const locationData = {
                                info: {
                                    displayname: locationName,
                                    trigger_name: locationName,
                                    discovered: true
                                },
                                pathways: {}
                            };

                            const newLocationId = GameState.instantiateBlueprint('Location', locationData);
                            if (newLocationId) {
                                location = GameState.get(newLocationId);
                            }
                        }

                        // Fallback if blueprint system not available
                        if (!location) {
                            location = {
                                id: locationName,
                                GameplayTags: ['Location'],
                                components: ['info', 'pathways', 'display']
                            };
                            if (GameState.initializeEntityComponents) {
                                GameState.initializeEntityComponents(location);
                            }
                            if (!location.info) location.info = {};
                            location.info.displayname = locationName;
                            location.info.description = `A location called ${locationName}`;
                            GameState.save(locationName, location);
                        }
                    }
                    return location;
                }

                // Get or create both locations
                let loc1 = getOrCreateLocation(loc1Name);
                let loc2 = getOrCreateLocation(loc2Name);

                // Ensure pathways component exists
                if (!loc1.pathways) loc1.pathways = {};
                if (!loc2.pathways) loc2.pathways = {};

                // Create directional connection
                loc1.pathways[dir] = { destination: loc2Name };

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
                    loc2.pathways[opposites[dir]] = { destination: loc1Name };
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
