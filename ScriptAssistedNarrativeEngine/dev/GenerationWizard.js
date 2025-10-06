function GenerationWizardModule() {
    'use strict';

    // GenerationWizard orchestrates entity creation using unified data system
    // Returns a module object that registers with GameState
    //
    // BLUEPRINT SYSTEM:
    // - [SANE:BP] cards contain complete entity templates with embedded generation
    // - generationwizard component embedded in blueprints (no separate prompt cards)
    //
    // GENERATION LIFECYCLE:
    // 1. instantiateBlueprint() creates entity with generationwizard component
    // 2. Component tracks state: queued → generating → dormant
    // 3. Collect fields via LLM using embedded prompts
    // 4. Finalize: component goes dormant (never removed), entity activated
    // COMMANDS:
    // - /gw_npc [name] [class] [location] - Generate NPC
    // - /gw_location [name] - Generate location
    // - /gw_quest [name] - Generate quest
    // - /gw_abort - Cancel generation
    // - /gw_status - Show generation progress

    // ==========================
    // GREEDY COMPONENT ARCHITECTURE
    // ==========================
    // The generationwizard component is PERSISTENT - never removed from entities
    // Component states:
    // - 'generating': Actively collecting fields (only ONE globally)
    // - 'dormant': Complete, no active generation
    // - 'queued': Has uncollected fields, waiting to activate
    // - 'deactivated': Manually paused/disabled
    //
    // Component structure:
    // {
    //     state: 'dormant',              // Current state
    //     activeGeneration: null,        // Current generation object name
    //     generations: {}                // Temporary generation objects (deleted when done)
    // }
    // ==========================

    const MODULE_NAME = 'GenerationWizard';
    const debug = true;
    const ZERO_WIDTH_CHAR = '\u200B'; // Prevents AI Dungeon from treating empty output as error

    // Store GameState API reference
    let GameState = null;

    // Status messages displayed to user via state.message
    const THINKING_MESSAGE = 'The GM will use the next turn to think. Use `/GW abort` if undesired.';
    const PROCESSING_MESSAGE = 'The GM is processing entity generation... Use `/GW abort` if needed.';
    const COMPLETION_MESSAGE = 'Generation completed, returning to story.';

    // Card prefixes for Story Cards
    const CARD_PREFIXES = {
        blueprint: '[SANE:BP]',
        entity: '[SANE:E]',
        data: '[SANE:D]',
        inProgress: '[GW:InProgress]'  // Card tracking generation in progress
    };

    // ==========================
    // Configuration
    // ==========================

    // Response parsing configuration
    const PARSER_CONFIG = {
        // Different parsing strategies
        strategies: ['keyValue', 'json', 'fuzzy'],
        // Key-value parsing patterns
        keyValuePatterns: [
            /^([A-Z_]+):\s*(.+)$/m,  // Standard KEY: value
            /^([A-Za-z_]+)\s*=\s*(.+)$/m,  // Alternative key = value
            /^\*\*([A-Z_]+)\*\*:\s*(.+)$/m  // Markdown **KEY**: value
        ],
        // Maximum retries for field collection
        maxRetries: 3,
        // Maximum turns before considering generation abandoned
        maxTurnsBeforeAbandoned: 10
    };

    // ==========================
    // Data-Driven Handler System
    // ==========================

    // Field Processing System
    // =============================================================================
    // PURPOSE: Process fields according to [SANE:BP] definitions
    //
    // FIELD DEFINITION PROPERTIES:
    // - source: "tool" (provided) or "llm" (AI generates)
    // - type: "text", "select:Male,Female", "wildcard"
    // - maps_to: Path template like "*.info.currentLocation" (* = entity)
    // - parser: How to parse LLM response (inventory, skill, text)
    // - transformer: How to transform parsed value to final structure
    //
    // WILDCARD FIELDS (objectives.stage_*, rewards.*):
    // {
    //   "type": "wildcard",
    //   "expand": "numeric" or "item",
    //   "limit": {
    //     "condition": "$(TYPE)",  // Reference other field
    //     "Story": 5,              // Conditional limits
    //     "Side": 3,
    //     "Daily": 1
    //   },
    //   "parser": "text" or "inventory",
    //   "maps_to": "*.objectives.stages[]"
    // }
    //
    // VALUE PARSERS:
    // - inventory: "Col x50" → {item: "Col", quantity: 50}
    // - skill: "Linear:890" → {name: "Linear", level: 890}
    // - relationship: "Kirito:85" → {character: "Kirito", value: 85}
    // - text: Direct passthrough with trim
    //
    // PATH TRANSFORMERS:
    // - Apply maps_to pattern: "*.info.class" with * replaced by entity ID
    // - Handle array notation: "*.skills.{name}" uses parsed name
    // - Support nested paths: "*.stats.level.value"
    //
    // IMPLEMENTATION:
    // 1. evaluateConditionalLimit(limit, context) - Calculate dynamic limits
    // 2. expandWildcardField(fieldDef, limit) - Generate field instances
    // 3. parseFieldValue(value, parser) - Parse LLM response
    // 4. applyMapsTo(entityId, mapsTo, value) - Apply to entity path
    // =============================================================================

    // Value parsing strategies
    const valueParsers = {
        // Parse "Item x5" format for inventory
        inventory: function(value) {
            const match = value.match(/^(.+?)\s*x\s*(\d+)$/);
            if (match) {
                return {
                    item: match[1].trim(),
                    quantity: parseInt(match[2], 10)
                };
            }
            // Single item without quantity
            return {
                item: value.trim(),
                quantity: 1
            };
        },
        // Parse text (default)
        text: function(value) {
            return value.trim();
        },
        // Parse number
        number: function(value) {
            return parseInt(value, 10);
        },
        // Parse select (validate against options)
        select: function(value, options) {
            const normalized = value.trim();
            if (options && options.includes(normalized)) {
                return normalized;
            }
            // Try case-insensitive match
            const found = options.find(opt =>
                opt.toLowerCase() === normalized.toLowerCase()
            );
            return found || normalized;
        }
    };

    // ==========================
    // Blueprint Management
    // ==========================

    // Blueprint Loading System
    // =============================================================================
    // UNIFIED BLUEPRINT SYSTEM:
    //
    // [SANE:BP] cards contain EVERYTHING:
    // - Complete entity template with all components
    // - Embedded generationwizard component with:
    //   - generations.initial object containing fields and promptTemplate
    //   - Field definitions with paths, types, validation
    //   - Prompt sections for dynamic compilation
    // - Display configuration
    // - Component defaults
    //
    // NO SEPARATE PROMPT CARDS - everything is self-contained in the blueprint
    // =============================================================================


    // Add skill parser to valueParsers
    valueParsers.skill = function(value) {
        // Handle "SkillName:Level" format
        const colonMatch = value.match(/^(.+?):(\d+)$/);
        if (colonMatch) {
            return {
                name: colonMatch[1].trim(),
                level: parseInt(colonMatch[2], 10)
            };
        }

        // Handle "SkillName Level X" format
        const levelMatch = value.match(/^(.+?)\s+[Ll]evel\s+(\d+)$/);
        if (levelMatch) {
            return {
                name: levelMatch[1].trim(),
                level: parseInt(levelMatch[2], 10)
            };
        }

        // Just skill name
        return {
            name: value.trim(),
            level: 1
        };
    };

    // Add relationship parser
    valueParsers.relationship = function(value) {
        // Handle "CharacterName:Value" format
        const match = value.match(/^(.+?):(\d+)$/);
        if (match) {
            return {
                character: match[1].trim(),
                value: parseInt(match[2], 10)
            };
        }

        // Just character name
        return {
            character: value.trim(),
            value: 50  // Default relationship value
        };
    };

    // Apply field value to entity using maps_to pattern
    function applyMapsTo(entityId, mapsTo, parsedValue) {
        if (!mapsTo || parsedValue === undefined || parsedValue === null) return false;

        // Replace * with entityId directly (no type prefix in unified system)
        let path = mapsTo.replace('*', entityId);

        // Handle array notation like aliases[0]
        const arrayMatch = path.match(/^(.+)\[(\d+)\]$/);
        if (arrayMatch) {
            const arrayPath = arrayMatch[1];
            const index = parseInt(arrayMatch[2]);

            // Get or create the array
            let array = GameState.get(arrayPath);
            if (!array || !Array.isArray(array)) {
                array = [];
            }

            // Ensure array has enough elements
            while (array.length <= index) {
                array.push(null);
            }

            // Set the value at the index
            array[index] = parsedValue;

            // Save the entire array
            return GameState.set(arrayPath, array);
        }

        // Handle dynamic substitutions like {name} or {item}
        if (typeof parsedValue === 'object') {
            // Replace {name} with parsed name value
            if (parsedValue.name) {
                path = path.replace('{name}', parsedValue.name);
            }
            // Replace {item} with parsed item value
            if (parsedValue.item) {
                path = path.replace('{item}', parsedValue.item);
            }
            // Replace {character} with parsed character value
            if (parsedValue.character) {
                path = path.replace('{character}', parsedValue.character);
            }
        }

        // Determine final value to set
        let finalValue = parsedValue;

        // Special handling for different types
        if (path.includes('.skills.') && parsedValue.name) {
            // Skills need special structure
            finalValue = {
                level: parsedValue.level || 1,
                xp: {
                    current: 0,
                    max: 100 * (parsedValue.level || 1)
                }
            };
        } else if (path.includes('.inventory.') && parsedValue.item) {
            // Inventory items just need quantity
            finalValue = {
                quantity: parsedValue.quantity || 1
            };
        } else if (path.includes('.relationships.') && parsedValue.character) {
            // Relationships just need the value
            finalValue = parsedValue.value || 50;
        } else if (typeof parsedValue === 'object' && Object.keys(parsedValue).length === 1) {
            // If parsed value is an object with a single property, might just need the value
            // Keep objects as is for structured data
        }

        // Apply the value using GameState.set
        try {
            if (debug) console.log(`${MODULE_NAME}: Setting ${path} = ${JSON.stringify(finalValue)}`);
            return GameState.set(path, finalValue);
        } catch (e) {
            console.log(`${MODULE_NAME}: Failed to apply maps_to: ${e.message}`);
            return false;
        }
    }

    // Finalize entity creation (set component to dormant, rename, add display)
    // GREEDY COMPONENT: Never remove generationwizard, just set to dormant
    function finalizeEntityCreation(tempId, finalName) {
        if (!tempId || !finalName) return false;

        try {
            const entity = GameState.get(tempId);
            const triggerName = entity?.generationwizard?.trigger;

            // GREEDY COMPONENT: Set to dormant state instead of removing
            if (entity?.generationwizard) {
                const activeGen = entity.generationwizard.activeGeneration;
                if (activeGen && entity.generationwizard.generations) {
                    // Delete the completed generation object to save memory
                    GameState.del(`${tempId}.generationwizard.generations.${activeGen}`);
                }
                // Set component to dormant state (component persists!)
                GameState.set(`${tempId}.generationwizard.state`, 'dormant');
                GameState.set(`${tempId}.generationwizard.activeGeneration`, null);
                // Don't clear generations - it contains the configuration
                // GameState.set(`${tempId}.generationwizard.generations`, {});

                // Activate display when generation is complete
                GameState.set(`${tempId}.display.active`, true);

                // Clean up temporary data that's no longer needed
                // Use GameState.get to check current state, not the old entity object
                if (GameState.get(`${tempId}.generationwizard.fields_collected`)) {
                    GameState.del(`${tempId}.generationwizard.fields_collected`);
                }
                if (GameState.get(`${tempId}.generationwizard.trigger`)) {
                    GameState.del(`${tempId}.generationwizard.trigger`);
                }

                if (debug) console.log(`${MODULE_NAME}: Set generationwizard to dormant state and cleaned up temporary data`);
            }

            // Store trigger name in info component if it exists
            if (triggerName) {
                GameState.set(`${tempId}.info.trigger_name`, triggerName);
            }

            // Try to rename BEFORE activating display
            // This ensures the entity is renamed while still in [SANE:D] storage
            let finalId = tempId;
            try {
                if (!GameState.changeEntityId) {
                    console.log(`${MODULE_NAME}: changeEntityId function not available`);
                } else {
                    const renameResult = GameState.changeEntityId(tempId, finalName);
                    if (debug) console.log(`${MODULE_NAME}: changeEntityId(${tempId}, ${finalName}) returned: ${renameResult}`);
                    if (renameResult) {
                        console.log(`${MODULE_NAME}: Successfully renamed entity from ${tempId} to ${finalName}`);
                        finalId = finalName;
                    } else {
                        // Rename failed - keep the temporary ID
                        // This could happen if an entity with finalName already exists
                        console.log(`${MODULE_NAME}: Could not rename to '${finalName}', keeping temporary ID: ${tempId}`);
                        // Since rename failed, ensure the entity.id matches the actual ID
                        GameState.set(`${tempId}.id`, tempId);
                    }
                }
            } catch (renameError) {
                console.log(`${MODULE_NAME}: Error during rename: ${renameError.message}`);
                // Keep the temporary ID if rename failed
                finalId = tempId;
            }

            // ALWAYS activate the display component (after rename attempt)
            try {
                GameState.set(`${finalId}.display.active`, true);
                console.log(`${MODULE_NAME}: Activated display for ${finalId}`);
            } catch (displayError) {
                console.log(`${MODULE_NAME}: ERROR activating display: ${displayError.message}`);
            }

            return finalId;

        } catch (e) {
            console.log(`${MODULE_NAME}: Error finalizing entity: ${e.message}`);
        }

        return false;
    }

    // Unified Model Functions
    // ====================================================
    //
    // BLUEPRINT LOADING:
    // function loadStructureBlueprint(blueprintName) {
    //     // STEP-BY-STEP:
    //     // 1. Load [SANE:BP] Blueprints card via Utilities.storyCard.get()
    //     // 2. Parse JSON from card.description
    //     // 3. Extract blueprint by name: blueprints[blueprintName]
    //     // 4. Validate required properties exist:
    //     //    - fields: Object with field definitions
    //     //    - template: Object with entity structure
    //     // 5. For each field in fields object:
    //     //    - Ensure has 'source' (tool/llm)
    //     //    - Ensure has 'type' (text/select/wildcard)
    //     //    - If wildcard, ensure has 'expand' and 'limit'
    //     //    - If has maps_to, validate pattern
    //     // 6. Cache parsed blueprint for reuse
    //     // 7. Returns: { fields: {...}, template: {...} }
    //     // EXAMPLE RETURN:
    //     // {
    //     //   fields: {
    //     //     NAME: { source: "llm", type: "text", maps_to: "*.aliases[0]" },
    //     //     SKILL_*: { type: "wildcard", expand: "numeric", limit: 3 }
    //     //   },
    //     //   template: {

    // Compile generation prompt from entity and generation object
    function compileGenerationPrompt(entity, generation) {
        if (!generation || !generation.promptTemplate) {
            if (debug) console.log(`${MODULE_NAME}: No generation or promptTemplate`);
            return '';
        }

        const template = generation.promptTemplate;
        const sections = {};

        // Initialize sections from template
        for (const sectionName of template.sectionOrder || []) {
            sections[sectionName] = [];
        }

        // Check actual entity values and categorize fields
        const knownFields = [];
        const neededFields = [];
        const rejectedValues = {};

        if (generation.fields) {
            if (debug) console.log(`${MODULE_NAME}: Processing ${Object.keys(generation.fields).length} fields`);
            for (const [fieldName, fieldDef] of Object.entries(generation.fields)) {
                // Check if value is already collected in fields_collected
                const collectedValue = entity.generationwizard?.fields_collected?.[fieldName];

                // Get actual value from entity using field's path
                const actualValue = fieldDef.path ? GameState.get(`${entity.id}.${fieldDef.path}`) : null;

                // Special check for empty objects (like rewards.items)
                let isEmptyObject = false;
                if (actualValue && typeof actualValue === 'object' && !Array.isArray(actualValue)) {
                    isEmptyObject = Object.keys(actualValue).length === 0;
                }

                // Use collected value if available, otherwise actual value
                // Treat empty objects as having no value for collection purposes
                const value = collectedValue !== undefined ? collectedValue :
                             (isEmptyObject ? null : actualValue);

                if (debug) console.log(`${MODULE_NAME}: Field ${fieldName}: path=${fieldDef.path}, actualValue=${actualValue}, collectedValue=${collectedValue}, hasPrompt=${!!fieldDef.prompt}`);

                if (value !== null && value !== undefined) {
                    // Field already has value
                    fieldDef.collected = true;
                    fieldDef.value = value;

                    // Add to known section if template exists
                    if (fieldDef.prompt?.known) {
                        knownFields.push({
                            priority: fieldDef.prompt.priority || 50,
                            text: fieldDef.prompt.known.replace('$(value)', value)
                        });
                    }
                } else {
                    // Field needs collection
                    fieldDef.collected = false;

                    // Add to fields section if template exists
                    if (fieldDef.prompt?.uncollected) {
                        if (debug) console.log(`${MODULE_NAME}: Adding field ${fieldName} to needed fields`);
                        neededFields.push({
                            priority: fieldDef.prompt.priority || 50,
                            text: fieldDef.prompt.uncollected
                        });
                    }
                }
            }
        }

        if (debug) console.log(`${MODULE_NAME}: Known fields: ${knownFields.length}, Needed fields: ${neededFields.length}`);

        // Check for rejected values
        if (entity.generationwizard?.rejected_names) {
            rejectedValues.USERNAME = entity.generationwizard.rejected_names;
        }

        // Add context section for pre-provided values (for quests, etc)
        const contextItems = [];

        // Add quest-specific context if available
        if (entity.info?.displayname) {
            contextItems.push({
                priority: 5,
                text: `Quest Name: ${entity.info.displayname}`
            });
        }
        if (entity.quest?.giver) {
            contextItems.push({
                priority: 6,
                text: `Quest Giver: ${entity.quest.giver}`
            });
        }
        if (entity.quest?.type) {
            contextItems.push({
                priority: 7,
                text: `Quest Type: ${entity.quest.type}`
            });
        }

        // Add sections to the compiled prompt
        if (contextItems.length > 0) {
            sections.context = sections.context || [];
            sections.context.push(...contextItems);
        }
        if (knownFields.length > 0) {
            sections.known = sections.known || [];
            sections.known.push(...knownFields);
        }
        if (neededFields.length > 0) {
            sections.fields = sections.fields || [];
            sections.fields.push(...neededFields);
        }

        // Build context for condition evaluation
        const context = {
            trigger_name: entity.generationwizard?.trigger || entity.info?.trigger_name,
            currentLocation: entity.info?.currentLocation,
            hasKnown: knownFields.length > 0,
            hasFields: neededFields.length > 0,
            hasRejected: Object.keys(rejectedValues).length > 0,
            rejectedValues: Object.entries(rejectedValues)
                .map(([field, values]) => `${field}: ${values.join(', ')}`)
                .join('\n')
        };

        // Add static template items to sections
        if (template.sections) {
            for (const [sectionName, templateItems] of Object.entries(template.sections)) {
                if (!sections[sectionName]) sections[sectionName] = [];

                for (const item of templateItems || []) {
                    // Check condition
                    if (item.condition) {
                        // Simple condition evaluation
                        let condition = item.condition;
                        let shouldNegate = false;

                        // Handle !$(variable) or !variable
                        if (condition.startsWith('!')) {
                            shouldNegate = true;
                            condition = condition.substring(1);
                        }

                        // Remove $() wrapper if present
                        condition = condition.replace(/\$\(([^)]+)\)/, '$1');

                        const condValue = context[condition];
                        const evalResult = shouldNegate ? !condValue : !!condValue;

                        if (!evalResult) continue;
                    }

                    // Process text with simple variable substitution
                    let text = item.text || '';
                    // Support both {variable} and $(variable) syntax
                    text = text.replace(/\{([^}]+)\}/g, (match, key) => {
                        return context[key] || '';
                    });
                    text = text.replace(/\$\(([^)]+)\)/g, (match, key) => {
                        return context[key] || '';
                    });

                    sections[sectionName].push({
                        priority: item.priority || 0,
                        text: text
                    });
                }
            }
        }

        // Build final prompt by section order
        const finalPrompt = [];

        if (debug) console.log(`${MODULE_NAME}: Building prompt from sections. Order: ${template.sectionOrder}`);

        for (const sectionName of template.sectionOrder || []) {
            if (!sections[sectionName] || sections[sectionName].length === 0) {
                if (debug) console.log(`${MODULE_NAME}: Skipping empty section: ${sectionName}`);
                continue;
            }

            if (debug) console.log(`${MODULE_NAME}: Processing section ${sectionName} with ${sections[sectionName].length} items`);

            // Sort items within section by priority
            sections[sectionName].sort((a, b) => (a.priority || 0) - (b.priority || 0));

            // Add all items from this section
            finalPrompt.push(...sections[sectionName].map(item => item.text));
        }

        const result = finalPrompt.join('\n');
        if (debug) console.log(`${MODULE_NAME}: Final prompt length: ${result.length}`);

        return result;
    }

    // ==========================
    // GREEDY COMPONENT SYSTEM 
    // ==========================
    // Core functions for the new persistent component system

    // Find the currently active generator (state="generating")
    function findActiveGenerator() {
        // Scan all entities for generationwizard components with state="generating"
        const allEntities = GameState.queryTags('*'); // Get all entities (returns array)
        if (debug) console.log(`${MODULE_NAME}: findActiveGenerator checking ${allEntities.length} entities`);

        // Debug: Log first few entity IDs to see what's loaded
        if (debug && allEntities.length > 0) {
            const sampleIds = allEntities.slice(0, 5).map(e => e.id || 'no-id');
            console.log(`${MODULE_NAME}: Sample entity IDs: ${sampleIds.join(', ')}`);
        }

        for (const entity of allEntities) {
            if (entity.generationwizard) {
                if (debug) console.log(`${MODULE_NAME}: Entity ${entity.id} has generationwizard with state: ${entity.generationwizard.state}`);
                if (entity.generationwizard.state === 'generating') {
                    return {
                        entityId: entity.id,
                        entity: entity,
                        component: entity.generationwizard
                    };
                }
            }
        }
        return null;
    }

    // Find all queued generators
    function findQueuedGenerators() {

        const queued = [];
        const allEntities = GameState.queryTags('*');

        if (debug) console.log(`${MODULE_NAME}: findQueuedGenerators checking ${allEntities.length} entities`);

        for (const entity of allEntities) {
            if (entity.generationwizard) {
                if (debug) console.log(`${MODULE_NAME}: Entity ${entity.id} has generationwizard with state: ${entity.generationwizard.state}`);
            }
            if (entity.generationwizard && entity.generationwizard.state === 'queued') {
                const activeGen = entity.generationwizard.generations[entity.generationwizard.activeGeneration];
                queued.push({
                    entityId: entity.id,
                    entity: entity,
                    component: entity.generationwizard,
                    priority: activeGen?.priority || 0
                });
            }
        }

        return queued;
    }

    // Activate the next generator in queue
    function activateNextGenerator() {
        // 1. Check if any component is currently generating
        const activeGen = findActiveGenerator();
        if (activeGen) return activeGen;

        // 2. Find all queued components
        const queued = findQueuedGenerators();
        if (queued.length === 0) return null;

        // 3. Activate highest priority queued component
        const next = queued.sort((a, b) => b.priority - a.priority)[0];
        setGeneratorState(next.entityId, 'generating');

        if (debug) console.log(`${MODULE_NAME}: Activated generator for ${next.entityId}`);
        return next;
    }

    // Set generator state with single active generation constraint
    function setGeneratorState(entityId, newState) {
        if (newState === 'generating') {
            // Force all other generating components to queued
            const allEntities = GameState.queryTags('*');
            for (const entity of allEntities) {
                if (entity.id !== entityId && entity.generationwizard && entity.generationwizard.state === 'generating') {
                    GameState.set(`${entity.id}.generationwizard.state`, 'queued');
                    if (debug) console.log(`${MODULE_NAME}: Forced ${entity.id} from generating to queued`);
                }
            }
        }

        // Set the new state
        GameState.set(`${entityId}.generationwizard.state`, newState);

        // Update timestamp if starting generation
        if (newState === 'generating') {
            GameState.set(`${entityId}.generationwizard.generations.${GameState.get(entityId + '.generationwizard.activeGeneration')}.startedAt`, new Date().toISOString());
        }
    }

    // DEPRECATED: Old prompts registry system - no longer used
    // Prompts are now embedded in blueprints
    /*
    function createPromptsRegistry() {
        if (Utilities.storyCard.get('[SANE:D] Prompts Registry')) {
            return; // Already exists
        }

        const promptsRegistry = {
            prompts: {
                // Character development/updating
                personality_update: {
                    fields: {
                        PERSONALITY: {
                            key: "PERSONALITY",
                            path: "info.personality",
                            type: "text",
                            collected: false,
                            value: null,
                            prompt: {
                                uncollected: "PERSONALITY: [Updated personality reflecting recent events]",
                                known: "Current: $(value)",
                                priority: 10
                            }
                        },
                        BACKGROUND: {
                            key: "BACKGROUND",
                            path: "info.background",
                            type: "text",
                            collected: false,
                            value: null,
                            prompt: {
                                uncollected: "BACKGROUND: [Updated backstory including this achievement]",
                                known: "Current: $(value)",
                                priority: 20
                            }
                        }
                    },
                    promptTemplate: {
                        sectionOrder: ["header", "context", "fields", "footer"],
                        sections: {
                            header: [
                                { text: "=== Character Development ===", priority: 0 }
                            ],
                            context: [],  // Filled dynamically by tool
                            fields: [],   // Field contributions added automatically
                            footer: [
                                { text: "\\nShow growth while maintaining core identity.", priority: 0 }
                            ]
                        }
                    }
                },

                // Single field regeneration
                regenerate_field: {
                    fields: {},  // Populated dynamically by tool
                    promptTemplate: {
                        sectionOrder: ["header", "known", "rejected", "fields"],
                        sections: {
                            header: [
                                { text: "=== Field Regeneration ===", priority: 0 }
                            ],
                            known: [],
                            rejected: [],
                            fields: []
                        }
                    }
                }
            }
        };

        Utilities.storyCard.add({
            title: '[SANE:D] Prompts Registry',
            description: JSON.stringify(promptsRegistry, null, 2),
            type: 'data'
        });

        if (debug) console.log(`${MODULE_NAME}: Created prompts registry`);
    }
    */

    // ==========================
    // Generation Flow
    // ==========================

    function normalizeGender(genderStr) {
        if (!genderStr) return 'Unknown';

        const normalized = genderStr.toLowerCase().trim();

        // Common variations
        const male = ['male', 'm', 'man', 'boy', 'he', 'him', 'masculine'];
        const female = ['female', 'f', 'woman', 'girl', 'she', 'her', 'feminine'];
        const other = ['other', 'non-binary', 'nonbinary', 'nb', 'they', 'them', 'neutral', 'unknown'];

        if (male.includes(normalized)) return 'Male';
        if (female.includes(normalized)) return 'Female';
        if (other.includes(normalized)) return 'Other';

        // Default to capitalizing first letter if not recognized
        return genderStr.charAt(0).toUpperCase() + genderStr.slice(1).toLowerCase();
    }

    function toSnakeCase(str) {
        if (!str) return '';

        // Replace spaces and special chars with underscores
        // Convert to lowercase
        return str
            .trim()
            .replace(/[^a-zA-Z0-9_]/g, '_')  // Replace non-alphanumeric with _
            .replace(/_+/g, '_')              // Collapse multiple underscores
            .replace(/^_|_$/g, '')            // Remove leading/trailing underscores
            .toLowerCase();
    }

    function normalizeDateFormat(dateStr) {
        if (!dateStr) return '';

        // If already in YYYY-MM-DD format, return as is
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            return dateStr;
        }

        // Try to parse various date formats
        const months = {
            'january': '01', 'jan': '01',
            'february': '02', 'feb': '02',
            'march': '03', 'mar': '03',
            'april': '04', 'apr': '04',
            'may': '05',
            'june': '06', 'jun': '06',
            'july': '07', 'jul': '07',
            'august': '08', 'aug': '08',
            'september': '09', 'sep': '09', 'sept': '09',
            'october': '10', 'oct': '10',
            'november': '11', 'nov': '11',
            'december': '12', 'dec': '12'
        };

        // Try "Month DD, YYYY" or "Month DD YYYY"
        const match1 = dateStr.match(/^(\w+)\s+(\d{1,2}),?\s+(\d{4})$/i);
        if (match1) {
            const month = months[match1[1].toLowerCase()];
            if (month) {
                const day = match1[2].padStart(2, '0');
                return `${match1[3]}-${month}-${day}`;
            }
        }

        // Try "DD Month YYYY"
        const match2 = dateStr.match(/^(\d{1,2})\s+(\w+)\s+(\d{4})$/i);
        if (match2) {
            const month = months[match2[2].toLowerCase()];
            if (month) {
                const day = match2[1].padStart(2, '0');
                return `${match2[3]}-${month}-${day}`;
            }
        }

        // Try MM/DD/YYYY or MM-DD-YYYY
        const match3 = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (match3) {
            const month = match3[1].padStart(2, '0');
            const day = match3[2].padStart(2, '0');
            return `${match3[3]}-${month}-${day}`;
        }

        // Try DD/MM/YYYY (assume day first if day > 12)
        const match4 = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (match4) {
            const first = parseInt(match4[1]);
            const second = parseInt(match4[2]);
            if (first > 12 && second <= 12) {
                // First number must be day
                const month = match4[2].padStart(2, '0');
                const day = match4[1].padStart(2, '0');
                return `${match4[3]}-${month}-${day}`;
            }
        }

        // If we can't parse it, return the original
        return dateStr;
    }

    // ==========================
    // Expression Evaluation
    // ==========================

    function evaluateEntityExpressions(entity) {
        // Recursively evaluate all $() expressions in entity
        // This runs BEFORE generation to compute initial values

        if (!entity || typeof entity !== 'object') return;

        // Create evaluation context with helper functions
        const context = {
            // Entity self-reference
            ...entity,

            // Helper functions from GameState
            randomInt: function(min, max) {
                return Math.floor(Math.random() * (max - min + 1)) + min;
            },
            calculateXPRequired: function(level) {
                return level * (level - 1) * 500;
            },
            calculateMaxHP: function(level) {
                return 100 + (level - 1) * 10;
            },
            selectRandomSkills: function(count) {
                // Select random skills from the registry if available
                const registry = ["One_Handed_Sword", "Two_Handed_Sword", "Rapier", "Shield", "Parry",
                                 "Battle_Healing", "Searching", "Tracking", "Hiding", "Night_Vision"];
                const selected = {};
                for (let i = 0; i < count && i < registry.length; i++) {
                    const idx = Math.floor(Math.random() * registry.length);
                    const skill = registry.splice(idx, 1)[0];
                    selected[skill] = { level: 1, xp: { current: 0, max: 100 } };
                }
                return selected;
            }
        };

        // First, handle $init expressions to merge initial data into components
        for (const key in entity) {
            if (entity.hasOwnProperty(key) && typeof entity[key] === 'object' && entity[key]['$init']) {
                const initExpr = entity[key]['$init'];
                if (typeof initExpr === 'string' && initExpr.includes('$(')) {
                    const value = initExpr;
                    if (value.startsWith('$(') && value.endsWith(')')) {
                        try {
                            const expression = value.slice(2, -1);
                            const evalInContext = function(expr) {
                                const { randomInt, selectRandomSkills } = context;
                                return eval(expr);
                            };

                            const result = evalInContext(expression);
                            if (result && typeof result === 'object') {
                                // Merge the result into the component, preserving display and other metadata
                                Object.assign(entity[key], result);
                            }
                            // Remove $init after processing
                            delete entity[key]['$init'];

                            if (debug) console.log(`${MODULE_NAME}: Initialized ${key} with ${initExpr}`);
                        } catch (e) {
                            if (debug) console.log(`${MODULE_NAME}: Failed to evaluate $init for ${key}: ${e.message}`);
                        }
                    }
                }
            }
        }

        // Recursive evaluation until all expressions are resolved
        let maxIterations = 10; // Safety limit to prevent infinite loops
        let iteration = 0;
        let lastEvaluatedCount = -1;

        while (iteration < maxIterations) {
            iteration++;

            // Count expressions before evaluation
            const beforeCount = countExpressions(entity);

            if (beforeCount === 0) {
                // No more expressions to evaluate
                if (debug) console.log(`${MODULE_NAME}: All expressions evaluated after ${iteration - 1} iterations`);
                break;
            }

            // Evaluate what we can
            const evaluatedCount = evaluateObjectExpressions(entity, context);

            if (debug) console.log(`${MODULE_NAME}: Iteration ${iteration}: Evaluated ${evaluatedCount} of ${beforeCount} expressions`);

            // Update context with newly computed values
            for (const key in entity) {
                if (entity.hasOwnProperty(key)) {
                    context[key] = entity[key];
                }
            }

            // Check if we made progress
            if (evaluatedCount === 0) {
                // No progress made - remaining expressions have unresolvable dependencies
                if (debug) {
                    const remaining = countExpressions(entity);
                    if (remaining > 0) {
                        console.log(`${MODULE_NAME}: ${remaining} expressions could not be evaluated (missing dependencies)`);
                    }
                }
                break;
            }

            lastEvaluatedCount = evaluatedCount;
        }

        if (iteration >= maxIterations) {
            if (debug) console.log(`${MODULE_NAME}: Hit maximum iteration limit (${maxIterations})`);
        }
    }

    // Count how many $() expressions exist in an object
    function countExpressions(obj, skipMeta = true) {
        if (!obj || typeof obj !== 'object') return 0;

        let count = 0;

        for (const key in obj) {
            if (!obj.hasOwnProperty(key)) continue;

            // Skip metadata
            if (skipMeta && (key === 'display' || key === 'promptTemplate' || key === 'generationwizard')) continue;

            const value = obj[key];

            if (typeof value === 'string' && value.includes('$(') && value.startsWith('$(') && value.endsWith(')')) {
                count++;
            } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                count += countExpressions(value, skipMeta);
            }
        }

        return count;
    }

    function evaluateObjectExpressions(obj, context) {
        if (!obj || typeof obj !== 'object') return 0;

        let evaluatedCount = 0;

        for (const key in obj) {
            if (!obj.hasOwnProperty(key)) continue;

            const value = obj[key];

            // Skip display rules and other metadata
            if (key === 'display' || key === 'promptTemplate' || key === 'generationwizard') continue;

            if (typeof value === 'string' && value.includes('$(')) {
                try {
                    // Check if entire value is an expression
                    if (value.startsWith('$(') && value.endsWith(')')) {
                        // Extract expression without $( and )
                        const expression = value.slice(2, -1);

                        // Create a scoped eval with context variables
                        const evalInContext = function(expr) {
                            // Destructure context to make variables available
                            const { stats, info, attributes, inventory, skills,
                                    randomInt, calculateXPRequired, calculateMaxHP, selectRandomSkills } = context;

                            // Direct eval with all context available
                            try {
                                return eval(expr);
                            } catch (e) {
                                // If eval fails, return undefined to skip
                                return undefined;
                            }
                        };

                        const result = evalInContext(expression);

                        if (result !== undefined) {
                            obj[key] = result;
                            evaluatedCount++;
                            if (debug) console.log(`${MODULE_NAME}: Evaluated ${key}: ${value} -> ${obj[key]}`);
                        }
                    }
                } catch (e) {
                    if (debug) console.log(`${MODULE_NAME}: Failed to evaluate expression in ${key}: ${value} - ${e.message}`);
                }
            } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                // Recurse into nested objects
                evaluatedCount += evaluateObjectExpressions(value, context);
            }
        }

        return evaluatedCount;
    }

    // ==========================
    // Response Processing
    // ==========================

    // Build prompt from embedded generationwizard component
    function preparePromptFromComponent(entity) {
        if (!entity || !entity.generationwizard) return null;

        try {
            // Use entity's own generation object - self-contained component
            const activeGen = entity.generationwizard?.activeGeneration || 'initial';
            const generation = entity.generationwizard?.generations?.[activeGen];

            if (!generation) {
                if (debug) console.log(`${MODULE_NAME}: No generation object '${activeGen}' in entity`);
                return null;
            }

            if (debug) {
                console.log(`${MODULE_NAME}: Building prompt for entity: ${entity.id}`);
                console.log(`${MODULE_NAME}: Active generation: ${activeGen}`);
                console.log(`${MODULE_NAME}: Generation object has promptTemplate: ${!!generation.promptTemplate}`);
                if (!generation.promptTemplate) {
                    console.log(`${MODULE_NAME}: Generation object structure:`, JSON.stringify(generation, null, 2).substring(0, 500));
                }
            }

            // Compile prompt from entity's self-contained generation
            const compiledPrompt = compileGenerationPrompt(entity, generation);

            if (debug) {
                console.log(`${MODULE_NAME}: Compiled prompt length: ${compiledPrompt ? compiledPrompt.length : 0}`);
                if (compiledPrompt && compiledPrompt.length < 1000) {
                    console.log(`${MODULE_NAME}: Compiled prompt preview:`, compiledPrompt.substring(0, 500));
                }
            }

            return compiledPrompt;
        } catch (e) {
            if (debug) console.log(`${MODULE_NAME}: Error preparing prompt: ${e.message}`);
            return null;
        }
    }

    function processResponse(responseText) {
        // Process AI response for field collection
        // Returns: 'completed', true, or false
        const activeGen = findActiveGenerator();
        if (!activeGen) {
            if (debug) console.log(`${MODULE_NAME}: No active generation to process`);
            return false;
        }

        try {
            const entity = activeGen.entity;
            const tempEntityId = activeGen.entityId;
            const genComponent = entity.generationwizard;
            const activeGenName = genComponent.activeGeneration || 'initial';
            const generation = genComponent.generations?.[activeGenName];

            if (!generation) {
                console.log(`${MODULE_NAME}: No active generation object found`);
                return false;
            }

            if (debug) console.log(`${MODULE_NAME}: Processing response for generation '${activeGenName}'`);

            // Get expected fields from the generation object
            const expectedKeys = [];
            const keyToFieldMap = {}; // Map from KEY to field name
            const collectedFields = entity.generationwizard?.fields_collected || {};

            if (generation.fields) {
                for (const [fieldName, fieldDef] of Object.entries(generation.fields)) {
                    // Check if field has already been collected in the entity's fields_collected
                    if (!collectedFields[fieldName]) {
                        const key = fieldDef.key || fieldName.toUpperCase();
                        expectedKeys.push(key);
                        keyToFieldMap[key] = fieldName;
                    }
                }
            }

            if (expectedKeys.length === 0) {
                if (debug) console.log(`${MODULE_NAME}: All fields collected`);
                return 'completed';
            }

            // Debug the expectedKeys structure
            if (debug) {
                console.log(`${MODULE_NAME}: expectedKeys type:`, typeof expectedKeys);
                console.log(`${MODULE_NAME}: expectedKeys isArray:`, Array.isArray(expectedKeys));
                console.log(`${MODULE_NAME}: expectedKeys content:`, JSON.stringify(expectedKeys));
            }
            if (debug) console.log(`${MODULE_NAME}: Still need fields: ${expectedKeys.join(', ')}`);
            if (debug) console.log(`${MODULE_NAME}: Response preview:`, responseText.substring(0, 200));

            const parsedValues = parseMultipleKeyValues(responseText, expectedKeys);

            if (debug) {
                console.log(`${MODULE_NAME}: Parsed values:`, JSON.stringify(parsedValues));
            }

            if (Object.keys(parsedValues).length === 0) {
                console.log(`${MODULE_NAME}: Failed to parse any fields from response`);
                console.log(`${MODULE_NAME}: Expected: ${expectedKeys.join(', ')}`);
                return false;
            }

            // Process each parsed field
            if (debug) console.log(`${MODULE_NAME}: Processing ${Object.keys(parsedValues).length} parsed fields`);
            for (const [parsedKey, value] of Object.entries(parsedValues)) {
                // Skip numeric keys or single character keys (parsing artifacts)
                if (/^\d+$/.test(parsedKey) || parsedKey.length === 1) {
                    if (debug) console.log(`${MODULE_NAME}: Skipping invalid field key: ${parsedKey}`);
                    continue;
                }

                // Map the parsed KEY back to the field name
                const fieldName = keyToFieldMap[parsedKey] || parsedKey.toLowerCase();

                // Get field definition from generation object
                const fieldDef = generation.fields?.[fieldName];
                if (!fieldDef) {
                    if (debug) console.log(`${MODULE_NAME}: No field mapping for key '${parsedKey}' (mapped to '${fieldName}')`);
                    continue;
                }

                // Field validation - run validation function if defined
                if (fieldDef.validation) {
                    let validationResult = true;
                    let validationMessage = '';

                    // Handle different validation types
                    if (typeof fieldDef.validation === 'string') {
                        // Built-in validation type
                        if (fieldDef.validation === 'unique_entity_id') {
                            // Check if entity ID already exists
                            const entityId = value.replace(/\s+/g, '_');
                            const existingEntity = GameState.get(entityId);
                            if (existingEntity && existingEntity.id && existingEntity.id !== tempEntityId &&
                                (existingEntity.aliases || existingEntity.GameplayTags || existingEntity.components)) {
                                validationResult = false;
                                validationMessage = `Entity '${value}' already exists`;
                            }
                        }
                    } else if (typeof fieldDef.validation === 'function') {
                        // Custom validation function
                        try {
                            validationResult = fieldDef.validation(value, entity, GameState);
                            if (validationResult !== true && typeof validationResult === 'string') {
                                validationMessage = validationResult;
                                validationResult = false;
                            }
                        } catch (e) {
                            console.log(`${MODULE_NAME}: Validation function error: ${e.message}`);
                            validationResult = false;
                            validationMessage = 'Validation error';
                        }
                    }

                    // If validation failed, don't store the field
                    if (!validationResult) {
                        console.log(`${MODULE_NAME}: Validation failed for ${fieldName}: ${validationMessage}`);

                        // Track rejected values (useful for debugging and avoiding re-suggestions)
                        const rejectedPath = `${tempEntityId}.generationwizard.rejected_${fieldName}`;
                        let rejectedValues = GameState.get(rejectedPath) || [];
                        if (!rejectedValues.includes(value)) {
                            rejectedValues.push(value);
                            GameState.set(rejectedPath, rejectedValues);
                        }

                        // Skip storing this field - it will be re-requested
                        continue;
                    }
                }

                // Apply field to entity AFTER collision check
                if (fieldDef.maps_to) {
                    // Apply to entity using maps_to pattern
                    const success = applyMapsTo(tempEntityId, fieldDef.maps_to, value);
                    if (success) {
                        if (debug) console.log(`${MODULE_NAME}: Applied ${fieldName} = ${value} to ${fieldDef.maps_to}`);
                    } else {
                        console.log(`${MODULE_NAME}: Failed to apply ${fieldName} to ${fieldDef.maps_to}`);
                    }
                }

                // Track this field as collected in generationwizard
                const gwPath = `${tempEntityId}.generationwizard.fields_collected.${fieldName}`;
                GameState.set(gwPath, value);
                if (debug) console.log(`${MODULE_NAME}: Stored ${fieldName} = ${value} in fields_collected`);
            }

            // Check if we should finalize - need to have collected all required fields
            if (debug) console.log(`${MODULE_NAME}: Checking if ready to finalize entity ${tempEntityId}`);
            const updatedEntity = GameState.get(tempEntityId);

            // Entities always have an ID - that's what matters for finalization
            // Check if all required fields have been collected
            // Use the generation.fields from entity's generationwizard component
            const generationFields = generation.fields;
            if (generationFields) {
                // Find all required fields from the generation
                const requiredFields = [];
                for (const [fieldName, fieldDef] of Object.entries(generationFields)) {
                    // All fields are required unless they come from a tool
                    // Skip tool-provided fields (those would have source: 'tool')
                    if (fieldDef.source !== 'tool') {
                        requiredFields.push(fieldName);
                    }
                }

                // Check if all required fields have been collected
                const collectedFieldsCheck = updatedEntity.generationwizard?.fields_collected || {};

                if (debug) {
                    console.log(`${MODULE_NAME}: Required fields:`, requiredFields);
                    console.log(`${MODULE_NAME}: Collected fields:`, Object.keys(collectedFieldsCheck));
                }

                const missingFields = requiredFields.filter(fieldName => !collectedFieldsCheck[fieldName]);

                if (missingFields.length > 0) {
                    if (debug) console.log(`${MODULE_NAME}: Still need fields: ${missingFields.join(', ')}`);
                    return true; // More fields to collect
                }
            }

            // All required fields collected, finalize the entity
            const finalName = updatedEntity?.info?.displayname || updatedEntity?.id || tempEntityId;
            if (debug) console.log(`${MODULE_NAME}: All fields collected, finalizing as: ${finalName}`);
            finalizeEntity(updatedEntity, { tempEntityId });

            // Activate next queued entity after this one completes
            activateNextGenerator();

            return 'completed';
        } catch (e) {
            console.log(`${MODULE_NAME}: Error processing response: ${e.message}`);
            console.log(`${MODULE_NAME}: Stack trace:`, e.stack);
            return false;
        }
    }

    function parseMultipleKeyValues(text, expectedKeys) {
        // Parse multiple KEY: value pairs from response with improved edge case handling
        const results = {};

        if (!text || !expectedKeys) {
            return results;
        }

        // Ensure expectedKeys is an array
        if (!Array.isArray(expectedKeys)) {
            console.log(`${MODULE_NAME}: ERROR - expectedKeys is not an array:`, typeof expectedKeys, expectedKeys);
            return results;
        }

        if (expectedKeys.length === 0) {
            return results;
        }

        // Try different parsing strategies
        for (const strategy of PARSER_CONFIG.strategies) {
            const parsed = parseWithStrategy(text, expectedKeys, strategy);
            if (Object.keys(parsed).length > 0) {
                // Merge results, prioritizing new findings
                Object.assign(results, parsed);
            }
        }

        return results;
    }

    function parseWithStrategy(text, expectedKeys, strategy) {
        const results = {};

        // Safety check - ensure expectedKeys is an array
        if (!Array.isArray(expectedKeys)) {
            console.log(`${MODULE_NAME}: ERROR in parseWithStrategy - expectedKeys is not an array`);
            return results;
        }

        if (debug) {
            console.log(`${MODULE_NAME}: Trying strategy: ${strategy}`);
            console.log(`${MODULE_NAME}: Text to parse (first 100 chars): ${text.substring(0, 100)}`);
        }

        switch (strategy) {
            case 'keyValue':
                // Standard KEY: value parsing with multiple patterns
                for (const pattern of PARSER_CONFIG.keyValuePatterns) {
                    const lines = text.split('\n');
                    let currentKey = null;
                    let currentValue = [];

                    for (const line of lines) {
                        // Check if this line starts with an expected key
                        let foundKey = null;
                        for (const key of expectedKeys) {
                            // Try exact match for this key
                            const keyPattern = `^\\s*${key}:\\s*(.+)$`;
                            const exactRegex = new RegExp(keyPattern, 'i');
                            const match = line.match(exactRegex);
                            if (match) {
                                // Save previous key-value if exists
                                if (currentKey) {
                                    results[currentKey] = currentValue.join('\n').trim();
                                }
                                // Start new key-value
                                foundKey = key;
                                currentKey = key;
                                currentValue = [match[1] || ''];
                                break;
                            }
                        }

                        // If no key found and we're collecting a value, append to current
                        if (!foundKey && currentKey) {
                            // Check for multi-line value continuation
                            if (line.trim() && !line.match(/^[A-Z_]+[:=]/)) {
                                currentValue.push(line);
                            }
                        }
                    }

                    // Save last key-value
                    if (currentKey) {
                        results[currentKey] = currentValue.join('\n').trim();
                    }
                }
                break;

            case 'json':
                // Try to parse as JSON-like structure
                try {
                    // Extract JSON blocks from text (handle malformed JSON)
                    let jsonText = text;

                    // Try to find a JSON-like structure
                    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
                    if (!jsonMatch) break;

                    jsonText = jsonMatch[0];

                    // Fix common JSON issues
                    // Remove trailing commas before } or ]
                    jsonText = jsonText.replace(/,(\s*[}\]])/g, '$1');
                    // Fix empty values (like "inventory":,)
                    jsonText = jsonText.replace(/:,/g, ':null,');
                    jsonText = jsonText.replace(/:\s*,/g, ':null,');
                    // Fix trailing : at end of object
                    jsonText = jsonText.replace(/:(\s*})/g, ':null$1');

                    // Handle incomplete JSON - if it doesn't end with }, try to close it
                    if (!jsonText.trim().endsWith('}')) {
                        // Check if we're in the middle of a string value
                        const lastQuoteIndex = jsonText.lastIndexOf('"');
                        const lastColonIndex = jsonText.lastIndexOf(':');

                        if (lastColonIndex > lastQuoteIndex) {
                            // We're after a colon, might be missing the value
                            jsonText += 'null}';
                        } else {
                            // We're probably in the middle of a string, close it
                            jsonText += '"}';
                        }

                        // Count open braces and close any remaining
                        const openBraces = (jsonText.match(/\{/g) || []).length;
                        const closeBraces = (jsonText.match(/\}/g) || []).length;
                        jsonText += '}'.repeat(Math.max(0, openBraces - closeBraces));
                    }

                    const parsed = JSON.parse(jsonText);

                    // Try case-insensitive matching for each expected key
                    for (const expectedKey of expectedKeys) {
                        // Skip wildcard keys for JSON parsing
                        if (expectedKey.includes('*')) continue;

                        // Look for exact match first
                        if (parsed[expectedKey] !== undefined) {
                            results[expectedKey] = String(parsed[expectedKey]);
                            continue;
                        }

                        // Try lowercase version
                        const lowerKey = expectedKey.toLowerCase();
                        if (parsed[lowerKey] !== undefined) {
                            results[expectedKey] = String(parsed[lowerKey]);
                            continue;
                        }

                        // Try with underscores removed
                        const noUnderscoreKey = lowerKey.replace(/_/g, '');
                        if (parsed[noUnderscoreKey] !== undefined) {
                            results[expectedKey] = String(parsed[noUnderscoreKey]);
                            continue;
                        }
                    }
                } catch (e) {
                    // Not valid JSON or couldn't be fixed, skip
                    if (debug) console.log(`${MODULE_NAME}: JSON parse error: ${e.message}`);
                }
                break;

            case 'fuzzy':
                // Fuzzy matching for keys with variations
                const lines = text.split('\n');
                for (const key of expectedKeys) {
                    // Create variations of the key
                    const variations = [
                        key,
                        key.toLowerCase(),
                        key.replace(/_/g, ' '),
                        key.replace(/_/g, ''),
                        // Convert snake_case to Title Case
                        key.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')
                    ];

                    for (const line of lines) {
                        for (const variant of variations) {
                            const fuzzyRegex = new RegExp(`\\b${variant}\\b[:\\s=]+(.+)`, 'i');
                            const match = line.match(fuzzyRegex);
                            if (match && !results[key]) {
                                results[key] = match[1].trim();
                                break;
                            }
                        }
                    }
                }
                break;
        }

        return results;
    }

    // Entity Lifecycle Management
    // =============================================================================
    // PURPOSE: Manage entity creation through generationwizard component lifecycle
    //
    // ENTITY STATES WITH generationwizard COMPONENT:
    // {
    //   "TempNPC_12345": {
    //     "aliases": ["TempNPC_12345"],
    //     "GameplayTags": ["Character.NPC"],
    //     "components": ["generationwizard", "info", "stats"],
    //     "generationwizard": {
    //       "blueprint": "npc",
    //       "stage": "collecting_fields",
    //       "fields_collected": {
    //         "NAME": "Argo",
    //         "CLASS": "Information_Broker"  // From tool
    //       },
    //       "fields_needed": ["GENDER", "PERSONALITY", "BACKGROUND"],
    //       "trigger": "gw_npc_12345"
    //     }
    //   }
    // }
    //
    // DETAILED LIFECYCLE STAGES:
    //
    // 1. INITIALIZATION (Tool invocation → Temp entity):
    //    a. Tool called: gw_npc("Argo", "Information_Broker", "Town")
    //    b. Generate temp ID: `TempNPC_${Date.now()}`
    //    c. Load [SANE:BP] blueprint for "npc" type
    //    d. Create base entity structure from blueprint.template
    //    e. Add generationwizard component with:
    //       - blueprint: "npc"
    //       - stage: "collecting_fields"
    //       - trigger: original trigger name
    //    f. Process tool-provided fields (source: "tool"):
    //       - Find fields where source="tool" in blueprint
    //       - Apply values using maps_to patterns
    //       - Mark as collected in generationwizard
    //
    // 2. PROMPT GENERATION & COLLECTION:
    //    a. Identify fields still needed from generation object
    //    b. Use embedded promptTemplate from blueprint
    //    c. Evaluate conditional limits for wildcard fields:
    //       - If TYPE="Story", stages limit = 5
    //       - If TYPE="Side", stages limit = 3
    //    d. Expand iterations in template:
    //       - {@stages:STAGE_{i}:} → "STAGE_1: STAGE_2: STAGE_3:"
    //    e. Apply conditionals based on collected fields:
    //       - {NAME?Name\: {NAME}:} → "Name: Argo" or ""
    //    f. Send prompt to LLM and parse response
    //
    // 3. FIELD APPLICATION (Progressive updates):
    //    a. For each field in LLM response:
    //       - Parse value using field.parser
    //       - Apply transformation if field.transformer exists
    //       - Use maps_to pattern to determine path
    //    b. Example: GENDER field
    //       - maps_to: "*.info.gender"
    //       - Replace * with "TempNPC_12345"
    //       - GameState.set("TempNPC_12345.info.gender", "Female")
    //    c. Handle wildcard fields:
    //       - SKILL_1: "Linear" → skills.Linear = {level: 1, xp: {}}
    //       - REWARD_1: "Col x50" → inventory.Col = {quantity: 50}
    //    d. Execute @generate directives:
    //       - Find Library.functionName
    //       - Call with entity context
    //       - Apply returned values
    //
    // 4. FINALIZATION (Temp → Permanent):
    //    a. Verify all required fields collected
    //    b. Remove generationwizard component
    //    c. Extract final name from NAME field (aliases[0])
    //    d. Attempt rename: GameState.renameEntity(tempId, finalName)
    //    e. If name taken, append number: "Argo_2"
    //    f. Add display component (triggers [SANE:E] storage)
    //    g. GameState.save() automatically routes to correct storage
    //
    // STORAGE ROUTING:
    // - Has display component → [SANE:E] EntityName
    // - No display component → [SANE:D] Data~~N~~
    // - Automatic via GameState.save()
    // =============================================================================

    function finalizeEntity(entity, metadata) {
        // Entity is already loaded, metadata has tempEntityId
        const tempEntityId = metadata.tempEntityId;
        if (!tempEntityId) {
            console.log(`${MODULE_NAME}: Cannot finalize - no temp entity ID`);
            return false;
        }

        if (debug) console.log(`${MODULE_NAME}: Finalizing entity ${tempEntityId}`);

        // Apply collected fields to the entity
        const collectedFields = entity.generationwizard?.fields_collected || {};
        const generation = entity.generationwizard?.generations?.initial;

        if (generation?.fields) {
            for (const [fieldName, fieldDef] of Object.entries(generation.fields)) {
                let collectedValue = collectedFields[fieldName];
                if (collectedValue !== undefined && fieldDef.path) {
                    // Type conversion for numeric fields
                    if (fieldDef.path.includes('rewards.xp') ||
                        fieldDef.path.includes('rewards.col') ||
                        fieldDef.path.includes('.value') ||
                        fieldDef.path.includes('.quantity')) {
                        const numValue = parseInt(collectedValue, 10);
                        if (!isNaN(numValue)) {
                            collectedValue = numValue;
                        }
                    }

                    // Special handling for itemList type - parse "item_name x qty" format
                    if (fieldDef.specialType === 'itemList') {
                        if (collectedValue && collectedValue.toLowerCase() !== 'null' && collectedValue.trim() !== '') {
                            const itemsObject = {};
                            const itemPairs = collectedValue.split(',');
                            for (const pair of itemPairs) {
                                // Match "item_name x quantity" format
                                const match = pair.trim().match(/^(.+?)\s*x\s*(\d+)$/i);
                                if (match) {
                                    const itemName = match[1].trim();
                                    const quantity = parseInt(match[2], 10);
                                    if (itemName && !isNaN(quantity)) {
                                        itemsObject[itemName] = { quantity };
                                    }
                                }
                            }
                            collectedValue = itemsObject;
                        } else {
                            // If null or empty, keep the empty object
                            collectedValue = {};
                        }
                    }


                    // Apply the collected value to the entity
                    GameState.set(`${tempEntityId}.${fieldDef.path}`, collectedValue);
                    if (debug) console.log(`${MODULE_NAME}: Applied ${fieldName} = ${JSON.stringify(collectedValue)} to ${fieldDef.path}`);
                }
            }
        }


        // Extract final name from multiple possible sources
        // Priority: fields_collected displayname > aliases[0] > info.displayname
        let finalName = entity.generationwizard?.fields_collected?.displayname ||
                       entity.generationwizard?.fields_collected?.username ||
                       entity.generationwizard?.fields_collected?.USERNAME ||
                       entity.generationwizard?.fields_collected?.name ||
                       entity.generationwizard?.fields_collected?.NAME;

        if (!finalName && entity.aliases && entity.aliases[0]) {
            finalName = entity.aliases[0];
        }

        if (!finalName && entity.info?.displayname) {
            finalName = entity.info.displayname;
        }

        if (!finalName && entity.info?.username) {
            finalName = entity.info.username;
        }

        if (!finalName && entity.info?.name) {
            finalName = entity.info.name;
        }

        if (!finalName) {
            console.log(`${MODULE_NAME}: No name found for entity, using default`);
            finalName = 'Unknown_' + Date.now();
        }

        // Convert spaces to underscores for entity ID
        const entityId = finalName.replace(/\s+/g, '_');

        // Use finalization to remove generationwizard and rename
        const result = finalizeEntityCreation(tempEntityId, entityId);
        if (result) {
            // Show completion message
            if (state) {
                state.message = `✅ Created entity: ${result}`;
            }
            console.log(`${MODULE_NAME}: Successfully created entity: ${result}`);

            // Clear the in-progress card
            Utilities.storyCard.remove(CARD_PREFIXES.inProgress);
        }
        return result;
    }

    // ==========================
    // Command Handling
    // ==========================

    function handleCommand(command, params) {
        // Process /GW commands
        switch(command.toLowerCase()) {
            case 'status':
                return showStatus();

            case 'abort':
            case 'cancel':
                return abortGeneration();

            case 'debug':
                debug = !debug;
                return `Debug mode ${debug ? 'enabled' : 'disabled'}`;

            case 'clear':
                const queue = loadQueue();
                const cleared = queue.length;
                saveQueue([]);
                return `Queue cleared (${cleared} items removed)`;

            default:
                return `Unknown command: ${command}\nAvailable: status, abort, debug, clear`;
        }
    }

    function showStatus() {
        // Display generation queue status
        const status = getQueueStatus();
        let output = '# Generation Status\n\n';

        if (status.inProgress) {
            output += `## Currently Generating\n`;
            output += `- Blueprint: ${status.inProgress.type}\n`;
            output += `- Entity ID: ${status.inProgress.triggerName}\n`;
            output += `- Stage: ${status.inProgress.progress}\n\n`;
        } else {
            output += `## No generation in progress\n\n`;
        }

        if (status.queued.length > 0) {
            output += `## Queue (${status.queued.length} items)\n`;
            status.queued.forEach((item, i) => {
                output += `${i + 1}. ${item.type}: ${item.triggerName}`;
                if (item.priority > 0) output += ` (priority: ${item.priority})`;
                output += `\n`;
            });
        } else {
            output += `## Queue is empty\n`;
        }

        return output;
    }

    function abortGeneration() {
        // Cancel current generation using component state
        const activeGen = findActiveGenerator();
        if (activeGen) {
            // Set state to deactivated
            setGeneratorState(activeGen.entityId, 'deactivated');
            // Clear state message
            if (state && state.message) {
                state.message = '';
            }
            return 'Generation aborted successfully';
        }
        return 'No generation in progress to abort';
    }


    // ==========================
    // Entity Tracker Integration
    // ==========================

    function reportToEntityTracker(entityName, success, reason) {
        // Report generation result to Entity Tracker
        // This allows Entity Tracker to clear the entity from its tracking list
        if (success) {
            // Clear entity from tracker and queue
            GameState.completeEntityGeneration(entityName);
            if (debug) console.log(`${MODULE_NAME}: Reported successful generation of ${entityName} to Entity Tracker`);
        } else {
            // Could implement retry logic or error reporting here
            if (debug) console.log(`${MODULE_NAME}: Generation failed for ${entityName}: ${reason}`);
        }
    }

    // ==========================
    // Public API
    // ==========================

    function getQueueStatus() {
        // Get current queue status using new greedy component system
        const activeGen = findActiveGenerator();
        const queuedGens = findQueuedGenerators();

        const status = {
            queueLength: queuedGens.length,
            inProgress: null,
            queued: []
        };

        // Check active generation
        if (activeGen) {
            const activeGenObj = activeGen.component.generations[activeGen.component.activeGeneration];
            status.inProgress = {
                type: 'Unknown', // Blueprint type not directly available
                triggerName: activeGen.entityId,
                progress: activeGen.component.state || 'generating'
            };
        }

        // List queued items
        status.queued = queuedGens.map(item => ({
            type: 'Unknown', // Blueprint type not directly available
            triggerName: item.entityId,
            priority: item.priority
        }));

        return status;
    };

    // ==========================
    // Public API (for GameState integration)
    // ==========================

    function isActive() {
        // Check if any entity has an active generation using new system
        const activeGen = findActiveGenerator();
        return activeGen !== null;
    }

    // Process function for hook handling
    function process(hook, text) {
        // Called by GameState during context/output hooks
        // Returns {active: bool, text: string}

        if (!isActive()) {
            // Clear any stale message when not active
            if (state && state.message) {
                state.message = '';
            }
            return { active: false, text: text };  // Pass through original text
        }

        switch (hook) {
            case 'context':
                // Find active or transition queued->generating entity
                let activeGen = findActiveGenerator();

                // If no active generator, check for queued ones
                if (!activeGen) {
                    const queued = findQueuedGenerators();
                    if (queued.length > 0) {
                        // Activate the first queued generator
                        activeGen = queued[0];
                        setGeneratorState(activeGen.entityId, 'generating');
                        if (debug) console.log(`${MODULE_NAME}: Activated generation for ${activeGen.entityId}`);
                    }
                }

                if (!activeGen) {
                    return { active: false, text: text };  // No active generation
                }

                // Build prompt from embedded component
                if (debug) {
                    console.log(`${MODULE_NAME}: About to prepare prompt for entity ${activeGen.entityId}`);
                    console.log(`${MODULE_NAME}: Entity has generationwizard: ${!!activeGen.entity.generationwizard}`);
                    if (activeGen.entity.generationwizard) {
                        console.log(`${MODULE_NAME}: - activeGeneration: ${activeGen.entity.generationwizard.activeGeneration}`);
                        const hasGens = activeGen.entity.generationwizard.generations &&
                                      Object.keys(activeGen.entity.generationwizard.generations).length > 0;
                        console.log(`${MODULE_NAME}: - has generations: ${hasGens}`);
                    }
                }
                const prompt = preparePromptFromComponent(activeGen.entity);
                if (prompt) {
                    // Set thinking message for user
                    if (state && typeof state === 'object') {
                        state.message = THINKING_MESSAGE;
                    }
                    // Append prompt to context
                    const modifiedText = text + prompt;
                    return { active: true, text: modifiedText };
                }
                if (debug) console.log(`${MODULE_NAME}: No prompt generated, returning original text`);
                return { active: false, text: text };  // Pass through original text

            case 'output':
                // Process AI response for field collection
                if (!isActive()) {
                    return { active: false, text: text };  // Pass through original text
                }

                // Process the response
                const result = processResponse(text);

                // Set appropriate message based on result
                if (state && typeof state === 'object') {
                    if (result === 'completed') {
                        state.message = COMPLETION_MESSAGE;
                    } else if (result) {
                        state.message = PROCESSING_MESSAGE;
                    }
                }

                // Hide the output during generation
                return { active: true, text: ZERO_WIDTH_CHAR };

            default:
                return { active: false, text: text };  // Pass through original text
        }
    };

    // ==========================
    // Input Processing
    // ==========================
    // Commands are handled by GameState's debug command system
    // This hook is only used for intercepting input during active generation

    function processInput(text) {
        // Only intercept input if we have an active generation
        const activeGen = findActiveGenerator();
        if (activeGen) {
            // Block all input during generation to prevent context pollution
            console.log(`${MODULE_NAME}: Blocking input during active generation for ${activeGen.id}`);
            return { active: true, text: ZERO_WIDTH_CHAR };
        }

        // Pass through all other input
        return { active: false, text: text };
    }

    // ==========================
    // GameState Compatibility API
    // ==========================

    function instantiateBlueprint(blueprintName, data = {}) {
        // Delegate to GameState.instantiateBlueprint for basic entity creation
        if (debug) console.log(`${MODULE_NAME}: Delegating instantiateBlueprint to GameState`);

        // Pre-process data if needed for generation
        const processedData = { ...data };

        // Evaluate template expressions if present
        if (processedData.generationwizard?.generations?.initial) {
            evaluateEntityExpressions(processedData);
        }

        // Call GameState to create the entity
        const entityId = GameState.instantiateBlueprint(blueprintName, processedData);
        if (!entityId) {
            return null;
        }

        // Post-process for generation wizard
        const entity = GameState.get(entityId);
        if (entity?.generationwizard) {
            // Update generation fields based on what's already populated
            updateGenerationFields(entity);
            GameState.save(entityId, entity);

            // Check if we should activate this entity (if no other is generating)
            if (entity.generationwizard.state === 'queued') {
                const activeGen = findActiveGenerator();
                if (!activeGen) {
                    // No active generation, activate this one
                    setGeneratorState(entityId, 'generating');
                    if (debug) console.log(`${MODULE_NAME}: Activated generation for ${entityId}`);
                }
            }
        }

        return entityId;
    };

    // Helper to update generationwizard based on current entity state
    function updateGenerationFields(entity) {
        if (!entity.generationwizard) return;

        // Check each field definition against actual entity
        const activeGen = entity.generationwizard.generations[entity.generationwizard.activeGeneration];
        if (!activeGen) {
            if (debug) console.log(`${MODULE_NAME}: No active generation for entity ${entity.id}`);
            return;
        }

        // Handle dynamic field generation if configured
        if (activeGen.dynamicFields && activeGen.dynamicFields.type === 'range') {
            const basedOnPath = activeGen.dynamicFields.basedOn;
            // Get the value directly from the entity object, not from GameState
            // The entity might not be saved yet
            const parts = basedOnPath.split('.');
            let rangeValue = entity;
            for (const part of parts) {
                rangeValue = rangeValue?.[part];
                if (rangeValue === undefined) break;
            }

            if (rangeValue && !activeGen.dynamicFieldsGenerated) {
                // Generate fields based on the range
                const generatedFields = {};
                const template = activeGen.dynamicFields.template;

                for (let i = 1; i <= rangeValue; i++) {
                    // Replace {index} with the actual index in all template properties
                    const fieldName = template.name.replace(/\{index\}/g, i);
                    const field = {
                        path: template.path.replace(/\{index\}/g, i),
                        key: template.key.replace(/\{index\}/g, i),
                        prompt: {
                            uncollected: template.prompt.uncollected.replace(/\{index\}/g, i),
                            known: template.prompt.known.replace(/\{index\}/g, i),
                            priority: (template.prompt.priorityBase || 30) + i
                        }
                    };
                    generatedFields[fieldName] = field;
                }

                // Merge generated fields with existing fields
                if (!activeGen.fields) {
                    activeGen.fields = {};
                }
                Object.assign(activeGen.fields, generatedFields);

                // Mark as generated so we don't regenerate
                activeGen.dynamicFieldsGenerated = true;

                // Save the entity with the generated fields
                GameState.save(entity.id, entity);

                if (debug) console.log(`${MODULE_NAME}: Generated ${rangeValue} dynamic fields for ${entity.id}`);
            }
        }

        if (!activeGen.fields) return;

        for (const [fieldName, fieldDef] of Object.entries(activeGen.fields)) {
            // Use GameState path resolution to check if field has a value
            const currentValue = GameState ? GameState.get(`${entity.id}.${fieldDef.path}`) : null;

            if (currentValue !== null && currentValue !== undefined) {
                // Field already has a value (from tool/override)
                fieldDef.collected = true;
                fieldDef.value = currentValue;
            }
        }

        // Check if any fields still need collection
        const needsGeneration = Object.values(activeGen.fields)
            .some(f => !f.collected && f.source !== 'tool');

        // Set initial state based on needs
        if (needsGeneration) {
            entity.generationwizard.state = 'queued';
        } else {
            entity.generationwizard.state = 'dormant';
            // Activate display since generation is complete
            if (entity.display) {
                entity.display.active = true;
            }
        }
    }

    function cancelGeneration() {
        // Find active generator and deactivate it
        const activeGen = findActiveGenerator();
        if (activeGen) {
            setGeneratorState(activeGen.entityId, 'deactivated');
            if (state && state.message) {
                state.message = '';
            }
            if (debug) console.log(`${MODULE_NAME}: Cancelled generation for ${activeGen.entityId}`);
            return true;
        }
        return false;
    };

    // ==========================
    // Hook Processors
    // ==========================

    function processPreContext(text) {
        // Process before context (greedy module check)
        // Check for active or queued generators
        if (debug) console.log(`${MODULE_NAME}: processPreContext called, checking for active/queued generators`);
        const activeGen = findActiveGenerator();
        const queued = findQueuedGenerators();

        if (debug) {
            console.log(`${MODULE_NAME}: Active generator: ${activeGen ? activeGen.entityId : 'none'}, Queued: ${queued.length}`);
        }

        if (!activeGen && queued.length === 0) {
            return { active: false, text: text };
        }

        // Delegate to main context processing
        return processContext(text);
    }

    function processContext(text) {
        // Find active or transition queued->generating entity
        let activeGen = findActiveGenerator();

        // If no active generator, check for queued ones
        if (!activeGen) {
            const queued = findQueuedGenerators();
            if (queued.length > 0) {
                // Activate the first queued generator
                activeGen = queued[0];
                setGeneratorState(activeGen.entityId, 'generating');
                if (debug) console.log(`${MODULE_NAME}: Activated generation for ${activeGen.entityId}`);
            }
        }

        if (!activeGen) {
            return { active: false, text: text };  // No active generation
        }

        // Build prompt from embedded component
        if (debug) {
            console.log(`${MODULE_NAME}: About to prepare prompt for entity ${activeGen.entityId}`);
        }
        const prompt = preparePromptFromComponent(activeGen.entity);
        if (prompt) {
            // Set thinking message for user
            if (state && typeof state === 'object') {
                state.message = THINKING_MESSAGE;
            }
            // Append prompt to context
            const modifiedText = text + prompt;
            return { active: true, text: modifiedText };
        }
        if (debug) console.log(`${MODULE_NAME}: No prompt generated, returning original text`);
        return { active: false, text: text };  // Pass through original text
    }

    function processOutput(text) {
        // Process AI response for field collection
        const activeGen = findActiveGenerator();
        if (!activeGen) {
            return { active: false, text: text };  // Pass through original text
        }

        // Process the response
        const result = processResponse(text);

        // Set appropriate message based on result
        if (state && typeof state === 'object') {
            if (result === 'completed') {
                state.message = COMPLETION_MESSAGE;
            } else if (result) {
                state.message = PROCESSING_MESSAGE;
            }
        }

        // Hide the output during generation
        return { active: true, text: ZERO_WIDTH_CHAR };
    }

    // ==========================
    // Tool Functions
    // ==========================

    function gw_npc(params) {
        console.log(`${MODULE_NAME}: gw_npc called with params:`, params);
        console.log(`${MODULE_NAME}: GameState available:`, !!GameState);

        const [name, location] = params;

        if (!name) return 'malformed';

        // Check if character already exists
        const characterId = name.toLowerCase();
        if (GameState.get(characterId)) {
            console.log(`${MODULE_NAME}: Character ${characterId} already exists - cannot generate existing character`);
            return 'malformed';
        }

        // Properly structure the data for the blueprint
        const entityData = {};

        // Set the ID if name is provided
        if (name) {
            entityData.id = characterId;
            // Store the trigger name in generationwizard for prompt context
            entityData.generationwizard = {
                trigger: name  // This will be used in prompt generation
            };
        }

        // Map fields to their proper component locations
        if (location) {
            entityData.info = {};
            if (location) entityData.info.currentLocation = location;
        }

        console.log(`${MODULE_NAME}: Calling instantiateBlueprint('Character', ...)`)
        // Use the internal instantiateBlueprint which handles updateGenerationFields
        const result = instantiateBlueprint('Character', entityData);
        console.log(`${MODULE_NAME}: instantiateBlueprint returned:`, result);
        return result ? 'executed' : 'malformed';
    }

    function gw_location(params) {
        const [name, direction] = params;

        if (!name) return 'malformed';

        // Check if location already exists
        const locationId = name.toLowerCase().replace(/\s+/g, '_');
        if (GameState.get(locationId)) {
            console.log(`${MODULE_NAME}: Location ${locationId} already exists - cannot generate existing location`);
            return 'malformed';
        }

        // Properly structure the data for the blueprint
        const entityData = {};
        if (name) {
            entityData.id = locationId;
            entityData.info = {
                displayname: name,
                trigger_name: name
            };

            // Get player's current location for pathway connection
            const player = GameState.get('player');
            if (player && player.info && player.info.currentLocation) {
                const currentLocation = GameState.get(player.info.currentLocation);
                if (currentLocation) {
                    // Determine opposite direction
                    const opposites = {
                        'north': 'south',
                        'south': 'north',
                        'east': 'west',
                        'west': 'east',
                        'up': 'down',
                        'down': 'up',
                        'inside': 'outside',
                        'outside': 'inside'
                    };

                    // If no direction specified, pick a random one
                    let dir = direction;
                    if (!dir) {
                        const directions = Object.keys(opposites);
                        dir = directions[Math.floor(Math.random() * directions.length)];
                        if (debug) console.log(`${MODULE_NAME}: No direction specified, randomly selected: ${dir}`);
                    }

                    // Set up pathways - will be saved after blueprint instantiation
                    entityData.pathways = {};

                    // Add reverse pathway only if there's a valid opposite direction
                    const reverseDir = opposites[dir];
                    if (reverseDir) {
                        entityData.pathways[reverseDir] = { destination: player.info.currentLocation };
                    }

                    // Update current location's pathways to include new location
                    if (!currentLocation.pathways) currentLocation.pathways = {};
                    currentLocation.pathways[dir] = { destination: entityData.id };
                    GameState.save(player.info.currentLocation, currentLocation);

                    if (debug) console.log(`${MODULE_NAME}: Connecting ${player.info.currentLocation} -${dir}-> ${entityData.id}`);
                }
            }
        }

        // Use the internal instantiateBlueprint which handles updateGenerationFields
        const result = instantiateBlueprint('Location', entityData);
        return result ? 'executed' : 'malformed';
    }

    function gw_quest(params) {
        const [name, giver, type] = params;

        // Random quest name templates if not provided
        const questNames = [
            'The Lost Treasure', 'Dangerous Delivery', 'Monster Hunt',
            'Herb Collection', 'Missing Person', 'Ancient Ruins',
            'The Mysterious Stranger', 'Bandits in the Woods', 'Sacred Artifact',
            'The Broken Bridge', 'Supply Run', 'Escort Mission'
        ];

        // Random NPCs who might give quests
        const questGivers = [
            'Village Elder', 'Merchant', 'Guard Captain',
            'Innkeeper', 'Blacksmith', 'Mysterious Traveler', 'Farmer',
            'Town Mayor', 'Guild Master', 'Priest', 'Scholar'
        ];

        // Quest types
        const questTypes = ['Story', 'Side', 'Side', 'Side']; // Weight toward Side quests

        // Properly structure the data for the blueprint
        const entityData = {};

        // Use provided name or generate random one
        const questName = name || questNames[Math.floor(Math.random() * questNames.length)];
        const questGiver = giver || questGivers[Math.floor(Math.random() * questGivers.length)];
        const questType = type || questTypes[Math.floor(Math.random() * questTypes.length)];

        // Check if quest already exists
        const questId = questName.toLowerCase().replace(/\s+/g, '_');
        if (GameState.get(questId)) {
            console.log(`${MODULE_NAME}: Quest ${questId} already exists - cannot generate existing quest`);
            return 'malformed';
        }

        // Determine number of stages based on quest type (using ranges for variety)
        const stageRanges = {
            'Story': [4, 7],   // Main story quests: 4-7 stages
            'Side': [2, 4],    // Side quests: 2-4 stages
            'Hidden': [3, 5],  // Hidden quests: 3-5 stages
            'Raid': [5, 8]     // Raid quests: 5-8 stages
        };

        const range = stageRanges[questType] || [2, 4];
        const stageCount = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];

        // Set the quest ID and display name
        entityData.id = questId;

        // Pre-fill all known data
        entityData.info = {
            displayname: questName,
            trigger_name: questName  // Used for prompt context
        };

        entityData.quest = {
            giver: questGiver,
            type: questType
        };

        // Just set the objectives structure with the stage count
        // The GenerationWizard will handle creating the dynamic fields
        entityData.objectives = {
            stages: {},  // Dynamic fields will populate this
            current: 1,
            total: stageCount  // This triggers dynamic field generation
        };

        // Don't pre-initialize stages - let dynamic field generation handle it
        // The GenerationWizard will create the stage structure when collecting fields

        // Don't set generationwizard here - let the blueprint handle it
        // The blueprint already has the complete generationwizard configuration
        // including fields, dynamicFields, and promptTemplate

        // Use the internal instantiateBlueprint which handles updateGenerationFields
        const result = instantiateBlueprint('Quest', entityData);
        if (result) {
            console.log(`${MODULE_NAME}: Created ${questType} quest '${questName}' from ${questGiver} with ${stageCount} stages and queued for generation`);
            return 'executed';
        }
        return 'malformed';
    }

    function gw_abort(params) {
        const result = cancelGeneration();
        return result ? 'executed' : 'malformed';
    }

    // ==========================
    // Module API
    // ==========================

    const moduleAPI = {
        // Component schemas
        schemas: {
            generationwizard: {
                id: 'generationwizard',
                defaults: {
                    // CLEAN NEW STRUCTURE - no legacy support
                    state: "dormant",                 // ENUM: generating | dormant | queued | deactivated
                    activeGeneration: null,           // Which generation object is currently active
                    generations: {},                  // Generation objects (temporary work packages)

                    // Display is always null for generationwizard (it's not user-visible)
                    display: null
                }
            }
        },

        // Tool definitions
        tools: {
            gw_npc: gw_npc,
            gw_location: gw_location,
            gw_quest: gw_quest,
            gw_abort: gw_abort,
        },

        // Hook processors
        hooks: {
            preContext: [processPreContext],  // Greedy processing before context
            context: [processContext],        // Context processing
            input: [processInput],            // Process input commands
            output: [processOutput]            // Process AI responses
        },

        // Module initialization
        init: function(api) {
            if (debug) console.log(`${MODULE_NAME}: Initializing with GameState API`);
            // Store GameState API reference
            GameState = api;
            // Blueprints now handled by BlueprintModule
        },

        // Public API functions (for direct access)
        instantiateBlueprint: instantiateBlueprint,
        getQueueStatus: getQueueStatus,
        cancelGeneration: cancelGeneration,
        isActive: isActive,
    };

    return moduleAPI;
}
GenerationWizardModule.isSANEModule = true;
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GenerationWizardModule;
}
