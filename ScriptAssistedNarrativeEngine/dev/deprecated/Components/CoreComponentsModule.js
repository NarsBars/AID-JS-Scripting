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
                }
            },

            objectives: {
                id: 'objectives',
                defaults: {
                    type: null,
                    status: "active",
                    stages: {}
                }
            },

            rewards: {
                id: 'rewards',
                defaults: {
                    xp: 0,
                    col: 0,
                    items: {}
                }
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
