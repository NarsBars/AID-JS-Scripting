function CoreComponentsModule() {
    'use strict';

    const MODULE_NAME = 'CoreComponentsModule';
    const debug = true;

    return {
        // Component schema definitions
        schemas: {
            info: {
                id: 'info',
                defaults: {
                    displayname: null,
                    gender: null,
                    currentLocation: null,
                    username: null,
                    realname: null,
                    description: null,
                    appearance: null
                },
                display: [
                    { line: "nameline", priority: 10, format: "## **{displayname}**", condition: "{displayname}" },
                    { line: "nameline", priority: 10, format: "## **{id}**", condition: "!{displayname}" },
                    { line: "nameline", priority: 11, format: " [{realname}]", condition: "{realname}" },
                    { line: "infoline", priority: 10, format: "Gender: {gender}", condition: "{gender}" },
                    { line: "infoline", priority: 50, format: "Location: {currentLocation}", condition: "{currentLocation}" },
                    { line: "section", priority: 60, format: "**Appearance**\n{appearance}", condition: "{appearance}" },
                    { line: "section", priority: 70, format: "**Background**\n{description}", condition: "{description}" }
                ]
            },

            pathways: {
                id: 'pathways',
                defaults: {
                    north: null,
                    south: null,
                    east: null,
                    west: null,
                    up: null,
                    down: null
                },
                display: [
                    {
                        line: "section",
                        priority: 60,
                        format: "**Pathways**\n{*→ • {*}: to {*}}",
                        condition: "Object.keys(pathways).length > 0"
                    }
                ],
                opposites: {
                    'north': 'south',
                    'south': 'north',
                    'east': 'west',
                    'west': 'east',
                    'inside': 'outside',
                    'outside': 'inside',
                    'above': 'below',
                    'below': 'above',
                    'up': 'down',
                    'down': 'up'
                }
            },

            objectives: {
                id: 'objectives',
                defaults: {
                    type: null,
                    status: "active",
                    stages: {}
                },
                display: [
                    {
                        line: "section",
                        priority: 35,
                        format: "**Objectives** [{type}]\n{stages.*→ • Stage {*}: {*.description}}",
                        condition: "{status === 'active'}"
                    }
                ]
            },

            rewards: {
                id: 'rewards',
                defaults: {
                    xp: 0,
                    col: 0,
                    items: {}
                },
                display: [
                    {
                        line: "section",
                        priority: 45,
                        format: "**Rewards**\nXP: {xp} | Col: {col}\n{items.*→ • {*} x{*.quantity}}",
                        condition: "{xp > 0 || col > 0 || Object.keys(items).length > 0}"
                    }
                ]
            },

            display: {
                id: 'display',
                defaults: {
                    prefixline: null,
                    footer: null,
                    separators: {
                        nameline: " ",
                        infoline: " | ",
                        section: "\n\n"
                    },
                    active: false
                }
            }
        },

        // No tools in this module yet - these components are managed by other tools

        // Module initialization
        init: function(api) {
            if (debug) console.log(`${MODULE_NAME}: Initialized with ${Object.keys(this.schemas).length} component schemas`);
        }
    };
}
CoreComponentsModule.isSANEModule = true;
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CoreComponentsModule;
}
