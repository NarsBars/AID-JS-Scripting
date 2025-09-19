function BlueprintModule() {
    'use strict';

    const MODULE_NAME = 'BlueprintModule';
    const debug = true;

    // Module will receive GameState API during init
    let GameState = null;

    // Create default blueprints for common entity types
    function createDefaultBlueprints() {
        // Check if blueprints already exist
        const characterCard = Utilities.storyCard.get('[SANE:BP] Character');
        if (characterCard) {
            // For now, always update to ensure latest structure
            if (debug) console.log(`${MODULE_NAME}: Updating blueprints to latest structure...`);

            // Remove old blueprints
            Utilities.storyCard.remove('[SANE:BP] Character');
            Utilities.storyCard.remove('[SANE:BP] Location');
            Utilities.storyCard.remove('[SANE:BP] Quest');
            Utilities.storyCard.remove('[SANE:BP] Item');
        }

        if (debug) console.log(`${MODULE_NAME}: Creating default blueprints...`);

        // Character Blueprint
        Utilities.storyCard.add({
            title: '[SANE:BP] Character',
            type: 'blueprint',
            description: JSON.stringify({
                id: 'Character',
                GameplayTags: ['Character'],
                components: ['info', 'stats', 'skills', 'attributes', 'inventory', 'relationships', 'display'],

                // Default values for components
                info: {
                    displayname: null,   // The character's display name (username)
                    realname: null,      // The character's real name (if different from username)
                    gender: null,
                    currentLocation: 'Unknown',
                    description: null,
                    appearance: null,
                    display: [
                        { line: "nameline", priority: 10, format: "## **{displayname}**" },
                        { line: "nameline", priority: 11, format: " [{realname}]", condition: "{realname}" },
                        { line: "infoline", priority: 10, format: "Gender: {gender}" },
                        { line: "infoline", priority: 50, format: "Location: {currentLocation}" },
                        { line: "section", priority: 60, format: "**Appearance**\n{appearance}", condition: "{appearance}" },
                        { line: "section", priority: 70, format: "**Background**\n{description}", condition: "{description}" }
                    ]
                },

                stats: {
                    level: { value: 1, xp: { current: 0, max: 500 } },
                    hp: { current: 100, max: 100 },
                    display: [
                        { line: "infoline", priority: 30, format: "Level {level.value} ({level.xp.current}/{level.xp.max} XP)" },
                        { line: "infoline", priority: 40, format: "HP: {hp.current}/{hp.max}" }
                    ]
                },

                skills: {
                    display: [
                        {
                            line: "section",
                            priority: 30,
                            format: "**Skills**\n{*: • {*}: Level {*.level} ({*.xp.current}/{*.xp.max} XP)}",
                            condition: "Object.keys(skills).length > 0"
                        }
                    ]
                },

                attributes: {
                    STRENGTH: { value: 10 },
                    AGILITY: { value: 10 },
                    VITALITY: { value: 10 },
                    DEXTERITY: { value: 10 },
                    display: [
                        {
                            line: "section",
                            priority: 25,
                            format: "**Attributes**\nSTR: {STRENGTH.value} | AGI: {AGILITY.value} | VIT: {VITALITY.value} | DEX: {DEXTERITY.value}"
                        }
                    ]
                },

                inventory: {
                    display: [
                        {
                            line: "section",
                            priority: 40,
                            format: "**Inventory**\n{*: • {*} x{*.quantity}}",
                            condition: "Object.keys(inventory).length > 0"
                        }
                    ]
                },

                relationships: {},

                display: {
                    active: false,  // Will be set to true when generation completes
                    separators: {
                        nameline: " ",
                        infoline: " | ",
                        section: "\n"
                    }
                },

                // Generation wizard configuration (if used)
                generationwizard: {
                    state: "queued",
                    activeGeneration: "initial",
                    generations: {
                        initial: {
                            blueprint: "Character",
                            stage: "collecting_fields",
                            promptTemplate: "embedded",
                            fields: {
                                displayname: {
                                    path: "info.displayname",
                                    validation: "unique_entity_id",  // Ensure the name is unique
                                    key: "USERNAME",  // Still use USERNAME in the prompt for characters
                                    prompt: {
                                        uncollected: "USERNAME: [Create a unique username/gamertag like SwordMaster2000, DarkKnight92]",
                                        known: "Username: $(value)",
                                        priority: 10
                                    }
                                },
                                realname: {
                                    path: "info.realname",
                                    key: "REALNAME",
                                    prompt: {
                                        uncollected: "REALNAME: [Their real-world name, if different from username]",
                                        known: "Real Name: $(value)",
                                        priority: 15
                                    }
                                },
                                gender: {
                                    path: "info.gender",
                                    key: "GENDER",
                                    prompt: {
                                        uncollected: "GENDER: [Male/Female/Other]",
                                        known: "Gender: $(value)",
                                        priority: 20
                                    }
                                },
                                appearance: {
                                    path: "info.appearance",
                                    key: "APPEARANCE",
                                    prompt: {
                                        uncollected: "APPEARANCE: [Physical characteristics only - height, build, hair, eyes, facial features, distinguishing marks. Do NOT describe clothing or equipment]",
                                        known: "Appearance: $(value)",
                                        priority: 40
                                    }
                                },
                                description: {
                                    path: "info.description",
                                    key: "BACKGROUND",
                                    prompt: {
                                        uncollected: "BACKGROUND: [Their real-world life - occupation, interests, personality traits. Do NOT mention SAO or why they joined]",
                                        known: "Background: $(value)",
                                        priority: 50
                                    }
                                }
                            },
                            promptTemplate: {
                                sectionOrder: ["header", "fields", "footer"],
                                sections: {
                                    header: [
                                        {
                                            text: "=== CARDINAL SYSTEM - Character Generation ===",
                                            priority: 0
                                        },
                                        {
                                            text: "\nThe character \"$(trigger_name)\" was just referenced and needs to be generated.",
                                            priority: 1,
                                            condition: "$(trigger_name)"
                                        },
                                        {
                                            text: "\nA new character needs to be generated.",
                                            priority: 1,
                                            condition: "!$(trigger_name)"
                                        },
                                        {
                                            text: "\n\n==== REQUIRED INFORMATION ====\nProvide the following details:",
                                            priority: 10
                                        }
                                    ],
                                    footer: [
                                        {
                                            text: "\nBe creative and consistent with the game world.\nRespond ONLY with the requested fields. No narrative or additional text.\nRespond with each field on its own line:\nKEY: value",
                                            priority: 100
                                        }
                                    ]
                                }
                            }
                        }
                    }
                }
            }, null, 2)
        });

        // Location Blueprint
        Utilities.storyCard.add({
            title: '[SANE:BP] Location',
            type: 'blueprint',
            description: JSON.stringify({
                id: 'Location',
                GameplayTags: ['Location'],
                components: ['info', 'pathways', 'display'],

                info: {
                    displayname: null,  // The location's display name
                    description: null,
                    atmosphere: null,
                    features: [],
                    display: [
                        { line: "nameline", priority: 10, format: "## **{displayname}**" },
                        { line: "section", priority: 20, format: "**Description**\n{description}", condition: "{description}" },
                        { line: "section", priority: 25, format: "**Atmosphere**\n{atmosphere}", condition: "{atmosphere}" }
                    ]
                },

                pathways: {
                    display: [
                        {
                            line: "section",
                            priority: 30,
                            format: "**Pathways**\n{*→ • {*}: to {*}}",
                            condition: "Object.keys(pathways).length > 0"
                        }
                    ]
                }, // Connections to other locations

                display: {
                    active: false
                },

                // Generation wizard configuration (if used)
                generationwizard: {
                    state: "queued",
                    activeGeneration: "initial",
                    generations: {
                        initial: {
                            blueprint: "Location",
                            stage: "collecting_fields",
                            promptTemplate: "embedded",
                            fields: {
                                // displayname is provided when location is created, not collected
                                description: {
                                    path: "info.description",
                                    key: "DESCRIPTION",
                                    prompt: {
                                        uncollected: "DESCRIPTION: [Describe this location in detail]",
                                        known: "Description: $(value)",
                                        priority: 20
                                    }
                                },
                                atmosphere: {
                                    path: "info.atmosphere",
                                    key: "ATMOSPHERE",
                                    prompt: {
                                        uncollected: "ATMOSPHERE: [What is the atmosphere or mood of this place?]",
                                        known: "Atmosphere: $(value)",
                                        priority: 30
                                    }
                                }
                            },
                            promptTemplate: {
                                sectionOrder: ["header", "fields", "footer"],
                                sections: {
                                    header: [
                                        {
                                            text: "=== CARDINAL SYSTEM - Location Generation ===",
                                            priority: 0
                                        },
                                        {
                                            text: "\nThe location \"$(trigger_name)\" was just referenced and needs to be generated.",
                                            priority: 1,
                                            condition: "$(trigger_name)"
                                        },
                                        {
                                            text: "\nA new location needs to be generated.",
                                            priority: 1,
                                            condition: "!$(trigger_name)"
                                        },
                                        {
                                            text: "\n\n==== REQUIRED INFORMATION ====\nProvide the following details:",
                                            priority: 10
                                        }
                                    ],
                                    footer: [
                                        {
                                            text: "\nBe creative and consistent with the game world.\nRespond ONLY with the requested fields. No narrative or additional text.\nRespond with each field on its own line:\nKEY: value",
                                            priority: 100
                                        }
                                    ]
                                }
                            }
                        }
                    }
                }
            }, null, 2)
        });

        // Quest Blueprint
        Utilities.storyCard.add({
            title: '[SANE:BP] Quest',
            type: 'blueprint',
            description: JSON.stringify({
                id: 'Quest',
                GameplayTags: ['Quest'],
                components: ['info', 'quest', 'objectives', 'rewards', 'display'],

                info: {
                    displayname: null,  // The quest's display name
                    description: null,  // The quest's description
                    display: [
                        { line: "nameline", priority: 10, format: "## **{displayname}**" },
                        { line: "section", priority: 20, format: "**Description**\n{description}", condition: "{description}" }
                    ]
                },

                quest: {
                    giver: null,
                    type: 'Side',
                    display: [
                        { line: "infoline", priority: 15, format: "Given by: {giver}", condition: "{giver}" },
                        { line: "infoline", priority: 16, format: "Type: {type}" },
                        { line: "infoline", priority: 17, format: "Current Stage: {objectives.current}/{objectives.total}" }
                    ]
                },

                objectives: {
                    stages: {},  // Will be populated based on quest type
                    current: 1,
                    total: null,  // Will be set to match stage count
                    display: [
                        { line: "section", priority: 30, format: "**Objectives** ({current}/{total})\n{stages.*→ • Stage {*}: {*.description}}", condition: "Object.keys(stages).length > 0" }
                    ]
                },

                rewards: {
                    xp: null,
                    col: null,  // Using col for SAO currency
                    items: {},
                    display: [
                        { line: "section", priority: 40, format: "**Rewards**\nXP: {xp} | Col: {col}", condition: "{xp} || {col}" },
                        { line: "section", priority: 41, format: "Items:\n{items.*→ • {*} x{*.quantity}}", condition: "Object.keys(items).length > 0" }
                    ]
                },

                display: {
                    active: false,
                    separators: {
                        nameline: " ",
                        infoline: " | ",
                        section: "\n"
                    }
                },

                // Generation wizard configuration (if used)
                generationwizard: {
                    state: "queued",
                    activeGeneration: "initial",
                    generations: {
                        initial: {
                            blueprint: "Quest",
                            stage: "collecting_fields",
                            // Dynamic field generation based on objectives.total
                            dynamicFields: {
                                type: "range",
                                basedOn: "objectives.total",
                                template: {
                                    name: "objective{index}",
                                    path: "objectives.stages.{index}.description",
                                    key: "OBJECTIVE_{index}",
                                    prompt: {
                                        uncollected: "OBJECTIVE_{index}: [Stage {index} objective - what the player needs to do]",
                                        known: "Stage {index}: $(value)",
                                        priorityBase: 30  // Will become 30 + index (31, 32, 33...)
                                    }
                                }
                            },
                            fields: {
                                // displayname, giver, and type are ALWAYS provided when quest is created - never collected
                                description: {
                                    path: "info.description",
                                    key: "DESCRIPTION",
                                    prompt: {
                                        uncollected: "DESCRIPTION: [What needs to be done and why - the quest story and objectives in 1-2 sentences]",
                                        known: "Description: $(value)",
                                        priority: 20
                                    }
                                },
                                reward_xp: {
                                    path: "rewards.xp",
                                    key: "XP_REWARD",
                                    prompt: {
                                        uncollected: "XP_REWARD: [Experience points to award (number only), e.g. 100, 250, 500 - scale based on quest difficulty]",
                                        known: "XP Reward: $(value)",
                                        priority: 60
                                    }
                                },
                                reward_col: {
                                    path: "rewards.col",
                                    key: "COL_REWARD",
                                    prompt: {
                                        uncollected: "COL_REWARD: [Col (currency) to award (number only), e.g. 50, 100, 200 - scale based on quest difficulty]",
                                        known: "Col Reward: $(value)",
                                        priority: 61
                                    }
                                },
                                reward_items: {
                                    path: "rewards.items",
                                    key: "ITEM_REWARDS",
                                    specialType: "itemList",  // Tells GW this needs special parsing
                                    prompt: {
                                        uncollected: "ITEM_REWARDS: [Items to award with quantities. Format: 'item_name x qty, item_name x qty'. E.g., 'health_potion x 3, iron_sword x 1, leather_boots x 1'. Leave null for no items]",
                                        known: "Item Rewards: $(value)",
                                        priority: 62
                                    }
                                }
                            },
                            promptTemplate: {
                                sectionOrder: ["header", "context", "fields", "footer"],
                                sections: {
                                    header: [
                                        {
                                            text: "=== CARDINAL SYSTEM - Quest Generation ===",
                                            priority: 0
                                        },
                                        {
                                            text: "\nGenerate a quest for the SAO game world.",
                                            priority: 1
                                        },
                                        {
                                            text: "\n\n==== REQUIRED INFORMATION ====\nProvide ALL the following details:",
                                            priority: 10
                                        }
                                    ],
                                    footer: [
                                        {
                                            text: "\nBe creative and consistent with the game world.\nRespond ONLY with the requested fields. No narrative or additional text.\nRespond with each field on its own line:\nKEY: value",
                                            priority: 100
                                        }
                                    ]
                                }
                            }
                        }
                    }
                }
            }, null, 2)
        });

        // Item Blueprint (simple, no generation wizard)
        Utilities.storyCard.add({
            title: '[SANE:BP] Item',
            type: 'blueprint',
            description: JSON.stringify({
                id: 'Item',
                GameplayTags: ['Item'],
                components: ['info', 'display'],

                info: {
                    name: null,
                    description: null,
                    type: null,
                    value: 0,
                    weight: 0
                },

                display: {
                    active: true  // Items are usually visible by default
                }
            }, null, 2)
        });

        if (debug) console.log(`${MODULE_NAME}: Created default blueprints`);
    }

    return {
        // Tool definitions - blueprint management tools
        tools: {
            create_blueprint: function(params) {
                const [blueprintName, baseBlueprint] = params;

                if (!blueprintName) return 'malformed';

                const name = String(blueprintName);
                const base = baseBlueprint ? String(baseBlueprint) : 'Character';

                // Check if blueprint already exists
                const existingCard = Utilities.storyCard.get(`[SANE:BP] ${name}`);
                if (existingCard) {
                    if (debug) console.log(`${MODULE_NAME}: Blueprint ${name} already exists`);
                    return 'executed';
                }

                // Load base blueprint
                const baseCard = Utilities.storyCard.get(`[SANE:BP] ${base}`);
                if (!baseCard) {
                    if (debug) console.log(`${MODULE_NAME}: Base blueprint ${base} not found`);
                    return 'malformed';
                }

                try {
                    const baseData = JSON.parse(baseCard.description || '{}');
                    baseData.id = name;

                    // Create new blueprint
                    Utilities.storyCard.add({
                        title: `[SANE:BP] ${name}`,
                        type: 'blueprint',
                        description: JSON.stringify(baseData, null, 2)
                    });

                    if (debug) console.log(`${MODULE_NAME}: Created blueprint ${name} based on ${base}`);
                    return 'executed';
                } catch (e) {
                    if (debug) console.log(`${MODULE_NAME}: Failed to create blueprint: ${e.message}`);
                    return 'malformed';
                }
            },

            list_blueprints: function(params) {
                // Find all blueprint cards
                const blueprintCards = Utilities.storyCard.find(
                    card => card.title && card.title.startsWith('[SANE:BP]'),
                    true
                ) || [];

                const blueprints = [];
                for (const card of blueprintCards) {
                    const name = card.title.replace('[SANE:BP] ', '');
                    blueprints.push(name);
                }

                console.log(`Available blueprints: ${blueprints.join(', ')}`);
                return 'executed';
            }
        },

        // Module initialization
        init: function(api) {
            GameState = api;

            // Create default blueprints on initialization
            createDefaultBlueprints();
        }
    };
}
BlueprintModule.isSANEModule = true;
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BlueprintModule;
}
