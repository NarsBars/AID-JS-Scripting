function SANE(hook, text) {
    // zzz an attempt to give something I lack
    'use strict';
    // ========================================
    // TABLE OF CONTENTS
    // ========================================
    // SECTION 1: INITIALIZATION & CONFIGURATION
    // SECTION 2: CORE DATA MANAGEMENT
    //   2A: Data Cache & Storage
    //   2B: Universal Data Access (get/set/resolve)
    //   2C: Entity Management (load/save/create)
    //   2D: Component System
    //   2E: GameplayTag System
    //   2F: Query System
    //   2G: Schema Management
    // SECTION 3: REGISTRATION SYSTEM
    // SECTION 5: COMPONENT MODULES
    // SECTION 6: TOOL PROCESSING
    // SECTION 7: COMMAND PROCESSING
    // SECTION 8: HOOK PROCESSING
    // SECTION 9: BLUEPRINT SYSTEM
    // API EXPOSURE
    // RUNTIME CONFIGURATION LOADING
    // MAIN EXECUTION
    // ========================================

    // ========================================
    // SECTION 1: INITIALIZATION & CONFIGURATION
    // ========================================
    //#region SECTION 1

    // Core configuration
    const VERSION = '2.0.0';
    const MODULE_NAME = 'SANE';
    const debug = true;
    const startTime = Date.now();

    // Validate hook and text parameters
    if (!hook || !text) {
        console.log(`${MODULE_NAME}: Invalid parameters - hook: ${hook}, text length: ${text?.length}`);
        return text || '\u200B';  // WHY WOULD IT EVER BE EMPTY THO
    }

    // Optional dependencies
    const Calendar = typeof globalThis.Calendar !== 'undefined' ? globalThis.Calendar : null;

    // AI Dungeon sandbox <3
    const state = globalThis.state || {};
    const history = globalThis.history || [];

    // Core registries
    const schemas = {};
    const tools = {};
    const hooks = {
        preContext: [],  // Greedy modules that run first
        context: [],
        input: [],
        output: []
    };
    const rewindableTools = {};  // Stores rewind strategies for tools

    // Data storage
    let dataCache = {};
    const modifiedEntities = new Set();  // Track entities modified during this hook
    let entityAliasMap = {};
    let Library = {};

    // Runtime configurations (loaded from [SANE_RUNTIME] cards)
    let runtimeTools = {};
    let inputCommands = {};
    let inputModifier = null;
    let contextModifier = null;
    let outputModifier = null;

    // Parsing patterns
    const TOOL_PATTERN = /\b([a-z_]+)\(([^)]*)\)/g;
    const COMMAND_PATTERN = /\/([a-z_]+)(?:\s+([^\n/]*))?/gi;
    const GETTER_PATTERN = /get\[([^\]]+)\]/gi;

    // Zero-width character to prevent empty output errors
    const ZERO_WIDTH_CHAR = '\u200B';

    const HIDE_BEGINNING = '<<<'
    const HIDE_ENDING = '>>>'

    // Scene management
    let currentScene = null;
    let currentHash = null;

    // Entity tracker (must be defined early for tool processing)
    const entityTracker = {
        unknown: {},       // Track entities referenced but not found
        unknownTools: {},  // Track unknown tools from AI
        queue: [],         // Queue for entities pending generation
        threshold: 3,      // Default threshold for auto-generation
        autoGenerate: true // Whether to auto-generate entities
    };

    // Initialize Library with external dependencies
    Library.Utilities = Utilities;
    if (typeof Calendar !== 'undefined') {
        Library.Calendar = Calendar;
    }

    // Debug logging functions
    let debugLogStore, debugLog, getDebugLog, logTime;
    (function initDebugFunctions() {
        debugLogStore = {
            entries: [],
            maxEntries: 100,
            errors: []
        };

        debugLog = function(category, message) {
            if (!debug) return;
            const entry = {
                time: Date.now() - startTime,
                category,
                message
            };
            debugLogStore.entries.push(entry);
            if (debugLogStore.entries.length > debugLogStore.maxEntries) {
                debugLogStore.entries.shift();
            }
            console.log(`${MODULE_NAME} [${category}]: ${message}`);
        };

        getDebugLog = function() {
            return debugLogStore.entries.map(e =>
                `[${e.time}ms] ${e.category}: ${e.message}`
            ).join('\n');
        };

        logTime = function() {
            if (MODULE_CONFIG.debug) {
                const elapsed = Date.now() - startTime;
                debugLog('performance', `Hook ${hook} completed in ${elapsed}ms`);
            }
        };
    })();

    //#endregion SECTION 1

    // ========================================
    // SECTION 2: CORE DATA MANAGEMENT
    // ========================================
    //#region SECTION 2

    // ========================================
    // SECTION 2A: UNIVERSAL DATA ACCESS
    // ========================================
    //#region SECTION 2A

    // Normalize entity ID for case-insensitive operations
    function normalizeEntityId(entityId) {
        if (!entityId || typeof entityId !== 'string') return entityId;
        return entityId.toLowerCase();
    }

    // Resolve dynamic expressions in paths
    function resolve(path) {
        if (!path || typeof path !== 'string') return path;

        // Replace all $(expression) with their evaluated results
        return path.replace(/\$\((.*?)\)/g, function(match, expression) {
            // Handle array access: Global.party[0]
            const arrayMatch = expression.match(/^(.+)\[(\d+)\]$/);
            if (arrayMatch) {
                const arrayPath = arrayMatch[1];
                const index = parseInt(arrayMatch[2]);
                const array = get(arrayPath);

                if (Array.isArray(array) && index >= 0 && index < array.length) {
                    return array[index];
                }
                return match; // Return unchanged if not valid
            }

            // Handle nested resolution: Global.party[$(Global.index)]
            if (expression.includes('$(')) {
                expression = resolve(expression);
            }

            // Simple field resolution
            const value = get(expression);
            if (value !== undefined && value !== null) {
                return String(value);
            }

            return match; // Return unchanged if not found
        });
    }

    // Universal getter function
    function get(path) {
        if (!path) return undefined;

        // Resolve any dynamic expressions first
        path = resolve(path);

        // Parse the path
        const parts = path.split('.');
        if (parts.length === 0) return undefined;

        // First part is the entity ID or special accessor
        let entityId = parts[0];

        // Handle special accessors
        switch(entityId.toLowerCase()) {
            case 'global':
                entityId = 'Global';
                break;
            case 'time':
            case 'calendar':
                if (typeof Calendar !== 'undefined' && Calendar) {
                    if (parts.length === 1) return Calendar.getCurrentTime ? Calendar.getCurrentTime() : null;

                    const timeProp = parts[1]?.toLowerCase();
                    switch(timeProp) {
                        case 'time':
                        case 'current':
                            return Calendar.getCurrentTime ? Calendar.getCurrentTime() : null;
                        case 'formatted':
                            return Calendar.getFormattedTime ? Calendar.getFormattedTime() : null;
                        case 'period':
                        case 'timeofday':
                            return Calendar.getTimeOfDay ? Calendar.getTimeOfDay() : null;
                        case 'date':
                            return Calendar.getCurrentDate ? Calendar.getCurrentDate() : null;
                        case 'formatteddate':
                            if (Calendar.getDayNumber) {
                                const dayNumber = Calendar.getDayNumber();
                                const startDate = new Date(2022, 10, 6); // Nov 6, 2022
                                const currentDateObj = new Date(startDate);
                                currentDateObj.setDate(currentDateObj.getDate() + dayNumber - 1);

                                const monthNames = ["January", "February", "March", "April", "May", "June",
                                    "July", "August", "September", "October", "November", "December"];
                                const month = monthNames[currentDateObj.getMonth()];
                                const day = currentDateObj.getDate();
                                const year = currentDateObj.getFullYear();
                                return `${month} ${day}, ${year}`;
                            }
                            return null;
                        case 'day':
                        case 'daynumber':
                            return Calendar.getDayNumber ? Calendar.getDayNumber().toString() : null;
                        case 'season':
                            return Calendar.getCurrentSeason ? Calendar.getCurrentSeason() : null;
                    }
                }
                return null;
        }

        // Normalize for case-insensitive lookup
        const normalizedId = normalizeEntityId(entityId);

        // Check alias map first
        const resolvedId = entityAliasMap[normalizedId] || entityId;
        const normalizedResolvedId = normalizeEntityId(resolvedId);

        // Get entity from cache using normalized key
        let entity = dataCache[normalizedResolvedId];

        // If not in cache, try to load it
        if (!entity && !dataCache.hasOwnProperty(normalizedResolvedId)) {
            entity = loadEntityFromCache(resolvedId);
            if (entity) {
                dataCache[normalizedResolvedId] = entity;
            }
        }

        // If just getting the entity itself
        if (parts.length === 1) {
            return entity;
        }

        // Navigate the path
        let current = entity;
        for (let i = 1; i < parts.length; i++) {
            if (!current || typeof current !== 'object') return undefined;
            current = current[parts[i]];
        }

        return current;
    }

    // Universal setter function
    function set(path, value) {
        if (!path) return false;

        // Resolve any dynamic expressions
        path = resolve(path);

        const parts = path.split('.');
        if (parts.length === 0) return false;

        // Get or create entity
        let entityId = parts[0];

        // Handle special cases
        if (entityId.toLowerCase() === 'global') {
            entityId = 'Global';
        }

        // Normalize ID
        const normalizedId = normalizeEntityId(entityId);
        const resolvedId = entityAliasMap[normalizedId] || normalizedId;  // Use normalized ID, not original

        // Get or create entity (use normalized key for lookup)
        let entity = dataCache[resolvedId];
        if (!entity) {
            // Create new entity
            entity = { id: entityId };
            dataCache[resolvedId] = entity;
        }

        // If setting the entity itself
        if (parts.length === 1) {
            dataCache[resolvedId] = value;
            return true;
        }

        // Navigate to parent of target field
        let current = entity;
        for (let i = 1; i < parts.length - 1; i++) {
            if (!current[parts[i]] || typeof current[parts[i]] !== 'object') {
                current[parts[i]] = {};
            }
            current = current[parts[i]];
        }

        // Set the value
        const lastPart = parts[parts.length - 1];
        if (value === null || value === undefined) {
            delete current[lastPart];
        } else {
            current[lastPart] = value;
        }

        // Mark entity as modified (would trigger save in full implementation)
        return true;
    }

    //#endregion SECTION 2A

    // ========================================
    // SECTION 2C: ENTITY MANAGEMENT
    // ========================================
    //#region SECTION 2C

    function loadEntityFromCache(entityId) {
        // Since all entities are loaded at initialization, just check cache
        const normalizedId = normalizeEntityId(entityId);
        return dataCache[normalizedId] || null;
    }

    function save(entityId, entity, immediate = false) {
        if (!entityId || !entity) return false;

        const normalizedId = normalizeEntityId(entityId);
        dataCache[normalizedId] = entity;

        // Track this entity for batch saving unless immediate save requested
        if (!immediate) {
            modifiedEntities.add(normalizedId);
            if (debug) console.log(`[SANE save]: Queued entity ${entityId} for batch save`);
            return true;
        }

        if (debug) console.log(`[SANE save]: Immediately saving entity ${entityId}`);

        // Update alias map
        if (entity.aliases && Array.isArray(entity.aliases)) {
            for (const alias of entity.aliases) {
                entityAliasMap[normalizeEntityId(alias)] = normalizedId;
            }
        }

        // Save to Story Cards
        try {
            // Determine if entity should have display card (has display component and it's active)
            const hasDisplay = entity.display && entity.display.active !== false;

            if (hasDisplay) {
                // Find existing card that contains this entity
                let existingCardTitle = null;
                const entityCards = Utilities.storyCard.find(card => card.title && card.title.startsWith('[SANE:E]'), true) || [];

                for (const card of entityCards) {
                    if (card.description) {
                        try {
                            const match = card.description.match(/<== SANE DATA ==>([\s\S]*?)<== END DATA ==>/);
                            if (match) {
                                const parsed = JSON.parse(match[1].trim());
                                if (parsed[entityId] || parsed[normalizedId]) {
                                    existingCardTitle = card.title;
                                    break;
                                }
                            }
                        } catch (e) {
                            // Continue searching
                        }
                    }
                }

                // CLEANUP: Remove entity from [SANE:D] data cards if transitioning from DATA to DISPLAY
                // This happens when display.active gets set to true after generation completes
                const dataCards = Utilities.storyCard.find(card => card.title && card.title.startsWith('[SANE:D]'), true) || [];
                for (const dataCard of dataCards) {
                    if (dataCard.description) {
                        try {
                            const entities = JSON.parse(dataCard.description);
                            // Check if this entity exists in this data card
                            if (entities[entityId] || entities[normalizedId]) {
                                // Remove the entity from the data card
                                delete entities[entityId];
                                delete entities[normalizedId];

                                // Update the data card without this entity
                                const updatedJson = JSON.stringify(entities);
                                Utilities.storyCard.upsert({
                                    title: dataCard.title,
                                    value: dataCard.value || '# Data Storage',
                                    description: updatedJson,
                                    type: 'data'
                                });

                                if (debug) console.log(`[SANE save]: Removed ${entityId} from ${dataCard.title} during transition to display card`);
                            }
                        } catch (e) {
                            // Continue checking other data cards
                        }
                    }
                }

                // Prepare the entity data wrapped in an object
                const wrappedEntity = { [entityId]: entity };
                const dataJson = JSON.stringify(wrappedEntity, null, 2);
                const dataSection = `<== SANE DATA ==>\n${dataJson}\n<== END DATA ==>`;

                // Generate display text using DisplayModule
                let displayText;
                try {
                    displayText = Library.buildEntityDisplay ?
                        Library.buildEntityDisplay(entity) :
                        `# ${entityId}\n${JSON.stringify(entity, null, 2)}`;
                } catch (displayError) {
                    // If display generation fails, use fallback
                    if (debug) console.log(`[SANE save]: Display generation failed for ${entityId}: ${displayError.message}, using fallback`);
                    displayText = `# ${entityId}\n${JSON.stringify(entity, null, 2)}`;
                }

                if (debug) console.log(`[SANE save]: Generated display text (${displayText.length} chars) for ${entityId}`);

                // Generate keys for Story Card triggers
                const keys = generateEntityKeys(entityId, entity);

                // Use existing card title or create a reasonable one
                const cardTitle = existingCardTitle || `[SANE:E] ${entityId}`;

                // Handle overflow if entity is too large
                if (dataSection.length > 9500) {
                    saveEntityWithOverflow(cardTitle, entityId, wrappedEntity, displayText, keys);
                } else {
                    // Normal save without overflow
                    Utilities.storyCard.upsert({
                        title: cardTitle,
                        entry: displayText,  // What the AI sees
                        description: dataSection,  // Data storage
                        keys: keys,
                        type: 'story'
                    });
                }
            } else {
                // Save to [SANE:D] data card (no display)
                saveToDataCard(entityId, entity);
            }
        } catch (e) {
            debugLogStore.errors.push({ error: e.message, context: `save:${entityId}` });
            if (debug) console.log(`[SANE save]: ERROR saving ${entityId}: ${e.message}`);
            return false;
        }

        return true;
    }

    function generateEntityKeys(entityId, entity) {
        if (!entityId || !entity) return '';

        // Check if it's a location
        const isLocation = entity.GameplayTags && entity.GameplayTags.some(tag => tag.startsWith('Location'));

        if (isLocation) {
            // Location format: " Location_ID, Title Case Name"
            const titleCase = entityId.split('_').map(word =>
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            ).join(' ');

            return ` ${entityId}, ${titleCase}`;
        } else {
            // Character/other entity format: " EntityID,(EntityId, trigger_name,(trigger_name"
            let keys = ` ${entityId},(${entityId}`;

            // Add trigger_name if present
            const triggerName = entity.info?.trigger_name;
            if (triggerName && triggerName !== entityId) {
                keys += `, ${triggerName},(${triggerName}`;
            }

            return keys;
        }
    }

    function flushModifiedEntities() {
        if (modifiedEntities.size === 0) return;

        if (debug) console.log(`[SANE]: Flushing ${modifiedEntities.size} modified entities to Story Cards`);

        for (const entityId of modifiedEntities) {
            const entity = dataCache[entityId];
            if (entity) {
                save(entity.id || entityId, entity, true);  // Force immediate save
            }
        }

        modifiedEntities.clear();
    }

    function saveEntityWithOverflow(cardTitle, entityId, wrappedEntity, displayText, keys) {
        const dataJson = JSON.stringify(wrappedEntity);
        const chunks = [];
        const MAX_CHUNK = 9000;

        // Split data into chunks
        for (let i = 0; i < dataJson.length; i += MAX_CHUNK) {
            chunks.push(dataJson.substring(i, i + MAX_CHUNK));
        }

        // Save main card with first chunk
        Utilities.storyCard.upsert({
            title: cardTitle,
            entry: displayText,
            description: `<== SANE DATA ==>\n${chunks[0]}~~1~~\n<== END DATA ==>`,
            keys: keys,
            type: 'story'
        });

        // Save overflow cards - these maintain the same base title with overflow markers
        for (let i = 1; i < chunks.length; i++) {
            const marker = i < chunks.length - 1 ? `~~${i+1}~~` : '';
            Utilities.storyCard.upsert({
                title: `${cardTitle} ~${i}~`,
                value: `# ${entityId} Overflow ${i}`,
                description: chunks[i] + marker,
                type: 'data'
            });
        }
    }

    function saveToDataCard(entityId, entity) {
        // Save entities without display to [SANE:D] cards
        // These can pack multiple entities per card
        const dataCardTitle = '[SANE:D] Data';
        const dataCard = Utilities.storyCard.get(dataCardTitle);

        let entities = {};
        if (dataCard && dataCard.description) {
            try {
                entities = JSON.parse(dataCard.description);
            } catch (e) {
                // Start fresh if corrupted
            }
        }

        entities[entityId] = entity;
        const dataJson = JSON.stringify(entities);

        // Check if we need overflow
        if (dataJson.length > 9500) {
            // Split into multiple data cards
            saveDataWithOverflow(entities);
        } else {
            Utilities.storyCard.upsert({
                title: dataCardTitle,
                value: '# Data Storage',
                description: dataJson,
                type: 'data'
            });
        }
    }

    function saveDataWithOverflow(entities) {
        // Split entities across multiple data cards
        const chunks = [];
        let currentChunk = {};
        let currentSize = 0;

        for (const [id, entity] of Object.entries(entities)) {
            const entrySize = JSON.stringify({ [id]: entity }).length;
            if (currentSize + entrySize > 9000 && Object.keys(currentChunk).length > 0) {
                chunks.push(currentChunk);
                currentChunk = {};
                currentSize = 0;
            }
            currentChunk[id] = entity;
            currentSize += entrySize;
        }
        if (Object.keys(currentChunk).length > 0) {
            chunks.push(currentChunk);
        }

        // Save chunks to separate cards
        for (let i = 0; i < chunks.length; i++) {
            const cardNum = i === 0 ? '' : `~~${i}~~`;
            Utilities.storyCard.upsert({
                title: `[SANE:D] Data${cardNum}`,
                value: `# Data Storage ${i}`,
                description: JSON.stringify(chunks[i]),
                type: 'data'
            });
        }
    }

    function del(entityId) {
        if (!entityId) return false;

        const normalizedId = normalizeEntityId(entityId);

        // Remove from cache
        delete dataCache[normalizedId];

        // Remove from alias map
        for (const [alias, id] of Object.entries(entityAliasMap)) {
            if (id === normalizedId) {
                delete entityAliasMap[alias];
            }
        }

        // Remove from modified entities if queued
        modifiedEntities.delete(normalizedId);

        // Remove from data cards
        const dataCardTitle = '[SANE:D] Data';
        const dataCard = Utilities.storyCard.get(dataCardTitle);

        if (dataCard && dataCard.description) {
            try {
                const entities = JSON.parse(dataCard.description);
                if (entities[entityId] || entities[normalizedId]) {
                    delete entities[entityId];
                    delete entities[normalizedId];

                    // Save updated data card
                    const dataJson = JSON.stringify(entities);
                    Utilities.storyCard.upsert({
                        title: dataCardTitle,
                        value: '# Data Storage',
                        description: dataJson,
                        type: 'data'
                    });

                    if (debug) console.log(`[SANE del]: Removed ${entityId} from data card`);
                }
            } catch (e) {
                if (debug) console.log(`[SANE del]: Error removing from data card: ${e.message}`);
            }
        }

        // Also check for entity cards with display
        const entityCard = Utilities.storyCard.get(`[SANE:E] ${entityId}`);
        if (entityCard) {
            Utilities.storyCard.remove(`[SANE:E] ${entityId}`);
            if (debug) console.log(`[SANE del]: Removed entity card [SANE:E] ${entityId}`);
        }

        return true;
    }

    function create(entityData) {
        if (!entityData || !entityData.id) return null;

        const entity = {
            id: entityData.id,
            aliases: entityData.aliases || [],
            GameplayTags: entityData.GameplayTags || [],
            components: entityData.components || [],
            ...entityData
        };

        save(entity.id, entity);
        return entity.id;
    }

    //#endregion SECTION 2C

    // ========================================
    // SECTION 2D: COMPONENT SYSTEM
    // ========================================
    //#region SECTION 2D

    function initializeEntityComponents(entity) {
        if (!entity || !entity.components) return entity;

        for (const componentId of entity.components) {
            if (!entity[componentId]) {
                const schema = schemas[componentId];
                if (schema && schema.defaults) {
                    entity[componentId] = JSON.parse(JSON.stringify(schema.defaults));
                }
            }
        }

        return entity;
    }

    //#endregion SECTION 2D

    // ========================================
    // SECTION 2E: GAMEPLAY TAG SYSTEM
    // ========================================
    //#region SECTION 2E

    function hasGameplayTag(entity, searchTag) {
        // Check if entity has a specific tag or parent tag
        // e.g., entity with "Location.Dangerous.Trap" matches "Location.Dangerous"
        if (!entity || !entity.GameplayTags) return false;

        for (const tag of entity.GameplayTags) {
            // Simple hierarchical matching
            if (tag === searchTag || tag.startsWith(searchTag + '.')) {
                return true;
            }
        }
        return false;
    }

    function hasTagExact(entity, searchTag) {
        if (!entity?.GameplayTags) return false;
        return entity.GameplayTags.includes(searchTag);
    }

    function hasAnyTag(entity, searchTags) {
        if (!entity?.GameplayTags || !Array.isArray(searchTags)) return false;
        for (const searchTag of searchTags) {
            if (hasGameplayTag(entity, searchTag)) return true;
        }
        return false;
    }

    function hasAllTags(entity, searchTags) {
        if (!entity?.GameplayTags || !Array.isArray(searchTags)) return false;
        for (const searchTag of searchTags) {
            if (!hasGameplayTag(entity, searchTag)) return false;
        }
        return true;
    }

    function addGameplayTag(entity, tag) {
        if (!entity) return false;
        if (!entity.GameplayTags) entity.GameplayTags = [];

        const normalized = tag.split('.').map(t => t.trim()).filter(t => t).join('.');
        if (!entity.GameplayTags.includes(normalized)) {
            entity.GameplayTags.push(normalized);
            return true;
        }
        return false;
    }

    //#endregion SECTION 2E

    // ========================================
    // SECTION 2F: QUERY SYSTEM
    // ========================================
    //#region SECTION 2F

    function queryTags(query) {
        // Query entities using either a predicate function or tag expression
        // Examples:
        //   queryTags('Character')                    // All characters
        //   queryTags('Character.NPC')                // All NPCs
        //   queryTags(e => e.stats.level.value > 10)  // Custom predicate
        //   queryTags('*')                            // ALL entities (loads from storage)

        // Special handling for wildcard - load all entities from storage
        if (query === '*') {
            loadAllEntities();
        }

        let predicate;

        // If query is a function, use it directly
        if (typeof query === 'function') {
            predicate = query;
        }
        // Special case for '*' wildcard - match everything
        else if (query === '*') {
            predicate = entity => true;
        }
        // Simple tag match
        else if (typeof query === 'string') {
            predicate = entity => hasGameplayTag(entity, query);
        }
        else {
            if (MODULE_CONFIG.debug) console.log(`${MODULE_NAME}: Invalid query type: ${typeof query}`);
            return [];
        }

        const results = [];
        for (const [key, entity] of Object.entries(dataCache)) {
            if (!entity || typeof entity !== 'object') continue;

            // Skip schema entries, library functions, and other non-entity data
            if (key.startsWith('schema.') || key.startsWith('Library.') || key.startsWith('_')) continue;

            // Apply predicate
            try {
                if (predicate(entity)) {
                    results.push(entity);
                }
            } catch (e) {
                // Skip entities that cause errors in predicate
                if (MODULE_CONFIG.debug) debugLog('query', `Error in queryTags predicate for ${key}: ${e.message}`);
            }
        }

        return results;
    }

    function loadAllEntities() {
        // Load all entities from Story Cards into cache
        // Card titles are ARBITRARY - we don't care what they're called, just that they start with [SANE:E]
        const entityCards = Utilities.storyCard.find(card => card.title && card.title.startsWith('[SANE:E]'), true) || [];
        if (debug) console.log(`${MODULE_NAME}: Found ${entityCards.length} [SANE:E] cards`);

        for (const card of entityCards) {
            if (card.description) {
                try {
                    const match = card.description.match(/<== SANE DATA ==>([\s\S]*?)<== END DATA ==>/);
                    if (match) {
                        const parsed = JSON.parse(match[1].trim());
                        // The parsed data contains one or more entities - process them all
                        for (const [entityId, entity] of Object.entries(parsed)) {
                            const normalizedId = normalizeEntityId(entityId);
                            dataCache[normalizedId] = entity;

                            // Also update alias mappings
                            if (entity.aliases && Array.isArray(entity.aliases)) {
                                for (const alias of entity.aliases) {
                                    entityAliasMap[normalizeEntityId(alias)] = normalizedId;
                                }
                            }
                        }
                    }
                } catch (e) {
                    if (debug) console.log(`${MODULE_NAME}: Error parsing card '${card.title}': ${e.message}`);
                    debugLogStore.errors.push({ error: e.message, context: `loadAllEntities: ${card.title}` });
                }
            }
        }

        // Also load from data cards
        const dataCards = Utilities.storyCard.find(card => card.title && card.title.startsWith('[SANE:D]'), true) || [];
        if (debug) console.log(`${MODULE_NAME}: Found ${dataCards.length} [SANE:D] cards`);
        for (const card of dataCards) {
            if (card.description) {
                try {
                    const entities = JSON.parse(card.description);
                    for (const [entityId, entity] of Object.entries(entities)) {
                        const normalizedId = normalizeEntityId(entityId);
                        dataCache[normalizedId] = entity;

                        // Update alias mappings
                        if (entity.aliases && Array.isArray(entity.aliases)) {
                            for (const alias of entity.aliases) {
                                entityAliasMap[normalizeEntityId(alias)] = normalizedId;
                            }
                        }
                    }
                } catch (e) {
                    debugLogStore.errors.push({ error: e.message, context: 'loadAllEntities data card' });
                }
            }
        }
    }

    //#endregion SECTION 2F

    // ========================================
    // SECTION 2G: SCHEMA MANAGEMENT
    // ========================================
    //#region SECTION 2G

    function loadSchemaIntoCache(schemaId) {
        // Check module registry first
        if (schemas[schemaId]) {
            dataCache[`schema.${schemaId}`] = schemas[schemaId];
            return schemas[schemaId];
        }

        // Would load from [SANE:S] cards in full implementation
        return null;
    }

    //#endregion SECTION 2G

    //#endregion SECTION 2

    // ========================================
    // SECTION 3: REGISTRATION SYSTEM
    // ========================================
    //#region SECTION 3
    // Simple registration functions that modules call directly

    function registerSchema(id, schema) {
        schemas[id] = schema;

        // Create the Story Card for this schema so it persists
        Utilities.storyCard.upsert({
            title: `[SANE:S] ${id}`,
            entry: `# ${id} Schema\n\nComponent schema for ${id}`,
            description: JSON.stringify(schema),
            type: 'story'
        });
    }

    function registerTool(name, func) {
        tools[name] = func;
    }

    function registerRewindable(toolName, strategy) {
        // Strategy should have:
        // - type: 'inverse' | 'stateful' | null
        // - For inverse: getInverse(params) returns inverse operation
        // - For stateful: captureState(entity, params) and restoreState(entity, state, params)
        rewindableTools[toolName] = strategy;
    }

    function registerHook(type, func) {
        if (hooks[type]) {
            hooks[type].push(func);
        }
    }

    function registerAPI(name, func) {
        Library[name] = func;
        dataCache[`function.${name}`] = func;
        // Also set on ModuleAPI for direct access
        if (ModuleAPI) {
            ModuleAPI[name] = func;
        }
    }

    // ============================
    // SECTION 5: COMPONENT MODULES 
    // ============================
    // ======== START OF MODULES ========
    //#region SECTION 5
    // To add a module: paste its code below
    // To remove a module: delete its code block

    // Interconnected module API - modules can access all core functions
    const ModuleAPI = {
        // Core data functions
        get, set, resolve, save, create, del,

        // Entity management
        loadEntityFromCache,
        generateEntityKeys,

        // Component functions
        initializeEntityComponents,
        loadSchemaIntoCache,

        // GameplayTag functions
        hasGameplayTag,
        hasTagExact,
        hasAnyTag,
        hasAllTags,
        addGameplayTag,

        // Query functions
        queryTags,
        loadAllEntities,

        // Blueprint functions
        instantiateBlueprint,
        deepMerge,

        // Entity tracker (will be provided by EntityTrackerModule)
        trackUnknownEntity: null,  // Will be set by EntityTrackerModule
        entityTracker,

        // Registration functions
        registerSchema, registerTool, registerRewindable, registerHook, registerAPI,

        // Processing functions
        processTool,
        parseToolCall,

        // Utilities
        Utilities: globalThis.Utilities || {},
        Calendar: globalThis.Calendar || {},
        Library,

        // Direct access to registries
        schemas, tools, hooks, rewindableTools,

        // Direct access to caches
        dataCache,
        entityAliasMap,

        // Debug functions
        debugLog, getDebugLog
    };



    // ========================================
    // SHARED MODULE CONFIGURATION & HELPERS
    // ========================================
    //#region MODULE_HELPERS

    // Centralized configuration for all modules
    const MODULE_CONFIG = {
        debug: true,
        maxHistory: 100,
        maxRewind: 99
    };

    // Parameter validation helpers
    const validators = {
        // Check if required parameters are present
        requireParams: (...params) => params.every(p => p !== undefined && p !== null),

        // Normalize string to lowercase
        normalizeString: (str) => str ? String(str).toLowerCase() : '',

        // Parse and validate number
        parseNumber: (val, allowNegative = false) => {
            if (val === undefined || val === null) return null;
            const str = String(val).trim();
            const pattern = allowNegative ? /^-?\d+$/ : /^\d+$/;
            if (!pattern.test(str)) return null;
            return parseInt(str);
        },

        // Validate positive number
        requirePositiveNumber: (val) => {
            const num = validators.parseNumber(val, false);
            return num !== null && num > 0 ? num : null;
        }
    };

    // Common tool patterns
    const toolHelpers = {
        // Get entity or track if not found
        getEntityOrTrack: (entityName, toolName) => {
            const normalized = validators.normalizeString(entityName);
            const entity = get(normalized);
            if (!entity) {
                // Use ModuleAPI if available (will be set up by EntityTrackerModule)
                if (ModuleAPI.trackUnknownEntity) {
                    ModuleAPI.trackUnknownEntity(entityName, toolName);
                }
                if (MODULE_CONFIG.debug) {
                    console.log(`[${toolName}]: Entity ${entityName} not found`);
                }
            }
            return entity;
        },

        // Standard parameter validation
        validateParams: (params, count) => {
            if (!params || params.length < count) return false;
            return params.slice(0, count).every(p => p !== undefined);
        },

        // Create a tool wrapper with common validation
        createTool: (name, minParams, handler) => {
            return function(params) {
                if (!toolHelpers.validateParams(params, minParams)) {
                    if (MODULE_CONFIG.debug) {
                        console.log(`[${name}]: Insufficient parameters (need ${minParams}, got ${params ? params.length : 0})`);
                    }
                    return 'malformed';
                }

                try {
                    return handler(params);
                } catch (e) {
                    if (MODULE_CONFIG.debug) {
                        console.log(`[${name}]: Error - ${e.message}`);
                    }
                    return 'malformed';
                }
            };
        }
    };

    //#endregion MODULE_HELPERS

    // ========================================
    // CRITICAL: Load schemas and entities BEFORE modules execute
    // ========================================
    // Load schemas from [SANE:S] Story Cards
    function loadSchemasFromCards() {
        let schemaCount = 0;
        const schemaCards = Utilities.storyCard.find(
            card => card.title && card.title.startsWith('[SANE:S]'),
            true  // Get all matching cards
        ) || [];

        for (const card of schemaCards) {
            try {
                const schema = JSON.parse(card.description || '{}');
                // Schema MUST have an id field
                if (!schema.id) {
                    if (debug) console.log(`${MODULE_NAME}: Schema in card ${card.title} missing required 'id' field`);
                    continue;
                }
                // Store in schemas registry and dataCache
                schemas[schema.id] = schema;
                dataCache[`schema.${schema.id}`] = schema;
                schemaCount++;
               // if (debug) console.log(`${MODULE_NAME}: Loaded schema '${schema.id}' from ${card.title}`);
            } catch (e) {
                if (debug) console.log(`${MODULE_NAME}: Failed to load schema from ${card.title}: ${e.message}`);
            }
        }
        return schemaCount;
    }

    // Load variable definitions from [SANE:G] Variables card
    function loadVariableDefinitions() {
        const vardefCard = Utilities.storyCard.get('[SANE:G] Variables');
        if (!vardefCard) {
            if (debug) console.log(`${MODULE_NAME}: No [SANE:G] Variables card found`);
            return;
        }

        // Parse the simple text format:
        // variableName: type = defaultValue // description
        const content = (vardefCard.value || '') + '\n' + (vardefCard.description || '');
        const lines = content.split('\n');

        // Ensure Global entity exists
        if (!dataCache.global) {
            dataCache.global = { id: 'Global' };
        }

        let varCount = 0;
        for (const line of lines) {
            // Skip empty lines and comments
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;

            // Parse format: "variableName: type = defaultValue // description"
            const match = trimmed.match(/^(\w+)\s*:\s*(\w+)(?:\s*=\s*([^\/]+))?(?:\s*\/\/\s*(.*))?$/);
            if (match) {
                const [, varName, type, defaultValue, description] = match;

                // Set default value if not already set
                if (defaultValue && !dataCache.global[varName]) {
                    let value = defaultValue.trim();
                    // Convert based on type
                    if (type === 'integer' || type === 'number') {
                        value = parseInt(value) || 0;
                    } else if (type === 'float') {
                        value = parseFloat(value) || 0.0;
                    } else if (type === 'boolean') {
                        value = value === 'true';
                    } else if (type === 'array') {
                        try { value = JSON.parse(value); } catch(e) { value = []; }
                    } else if (type === 'object') {
                        try { value = JSON.parse(value); } catch(e) { value = {}; }
                    }

                    dataCache.global[varName] = value;
                    varCount++;
                    if (debug) console.log(`${MODULE_NAME}: Set Global.${varName} = ${value}`);
                }
            }
        }

        if (debug) console.log(`${MODULE_NAME}: Loaded ${varCount} variable definitions`);
    }

    // Load schemas and entities before modules initialize
    // Load schemas first
    const schemaCount = loadSchemasFromCards();

    // Load variable definitions
    loadVariableDefinitions();

    // Then load entities
    loadAllEntities();
    if (debug) {
        const entityCount = Object.keys(dataCache).filter(k => !k.startsWith('schema.') && !k.startsWith('function.')).length;
    }

    // ========================================
    // InventoryModule - Item management system
    // ========================================
    //#region InventoryModule
    {
        const MODULE_NAME = 'InventoryModule';

        // Define inventory schema
        const inventorySchema = {
            id: 'inventory',
            defaults: {}  // Items added dynamically
        };

        // Create [SANE:S] inventory card if it doesn't exist
        const existingCard = Utilities.storyCard.get('[SANE:S] inventory');
        if (!existingCard) {
            Utilities.storyCard.upsert({
                title: '[SANE:S] inventory',
                value: '# Inventory Component Schema\nDefines the inventory storage structure',
                description: JSON.stringify(inventorySchema, null, 2),
                type: 'data'
            });
            if (debug) console.log(`${MODULE_NAME}: Created [SANE:S] inventory Story Card`);
        }

        // Register the schema (Story Card version takes precedence if loaded)
        ModuleAPI.registerSchema('inventory', inventorySchema);

        // Helper functions
        function getItemQuantity(inventory, itemName) {
            if (!inventory || !itemName) return 0;
            const item = inventory[itemName];
            if (typeof item === 'object') return item.quantity || 0;
            if (typeof item === 'number') return item;
            return 0;
        }

        function setItemQuantity(inventory, itemName, quantity) {
            if (!inventory) return;
            if (quantity <= 0) {
                delete inventory[itemName];
            } else {
                inventory[itemName] = { quantity };
            }
        }

        // Register API functions for other modules
        ModuleAPI.registerAPI('getItemQuantity', getItemQuantity);
        ModuleAPI.registerAPI('setItemQuantity', setItemQuantity);

        // Register add_item tool
        ModuleAPI.registerTool('add_item', toolHelpers.createTool('add_item', 2, function(params) {
            const [characterName, itemName, quantity] = params;

            const charName = validators.normalizeString(characterName);
            const item = validators.normalizeString(itemName);

            const qty = validators.parseNumber(quantity, true);
            if (qty === null || qty === 0) {
                if (MODULE_CONFIG.debug) console.log(`[add_item]: Invalid quantity: ${quantity}`);
                return 'malformed';
            }

            const character = toolHelpers.getEntityOrTrack(charName, 'add_item');
            if (!character) return 'executed';

            // Ensure inventory exists
            if (!character.inventory) character.inventory = {};

            // Update quantity
            const currentQty = getItemQuantity(character.inventory, item);
            const newQty = Math.max(0, currentQty + qty);

            setItemQuantity(character.inventory, item, newQty);

            if (MODULE_CONFIG.debug) {
                const action = qty > 0 ? 'Added' : 'Removed';
                console.log(`[add_item]: ${action} ${Math.abs(qty)} ${item} ${qty > 0 ? 'to' : 'from'} ${charName}'s inventory (now ${newQty})`);
            }

            ModuleAPI.save(charName, character);
            return 'executed';
        }));

        // Register remove_item tool
        ModuleAPI.registerTool('remove_item', toolHelpers.createTool('remove_item', 3, (params) => {
            const [characterName, itemName, quantity] = params;

            const qty = validators.parseNumber(quantity, false);
            if (qty === null || qty === 0) {
                if (MODULE_CONFIG.debug) console.log(`[remove_item]: Invalid quantity: ${quantity}`);
                return 'malformed';
            }

            // Call add_item with negative quantity
            return ModuleAPI.tools['add_item']([characterName, itemName, -qty]);
        }));

        // Register transfer_item tool
        ModuleAPI.registerTool('transfer_item', toolHelpers.createTool('transfer_item', 3, (params) => {
            const [giverName, receiverName, itemName, quantity] = params;

            const giver = validators.normalizeString(giverName);
            const receiver = validators.normalizeString(receiverName);
            const item = validators.normalizeString(itemName);
            const requestedQty = validators.requirePositiveNumber(quantity);

            if (!requestedQty) {
                if (MODULE_CONFIG.debug) console.log(`[transfer_item]: Invalid quantity: ${quantity}`);
                return 'malformed';
            }

            // Get both characters
            const giverChar = toolHelpers.getEntityOrTrack(giver, 'transfer_item');
            const receiverChar = toolHelpers.getEntityOrTrack(receiver, 'transfer_item');

            let transferQty = requestedQty;
            let anySuccess = false;

            // Remove from giver if exists
            if (giverChar) {
                if (!giverChar.inventory) giverChar.inventory = {};
                const availableQty = getItemQuantity(giverChar.inventory, item);
                transferQty = Math.min(availableQty, requestedQty);

                if (transferQty > 0) {
                    setItemQuantity(giverChar.inventory, item, availableQty - transferQty);
                    ModuleAPI.save(giver, giverChar);
                    anySuccess = true;
                    if (MODULE_CONFIG.debug) console.log(`[transfer_item]: Removed ${transferQty} ${item} from ${giver}`);
                }
            }

            // Add to receiver if exists
            if (receiverChar && transferQty > 0) {
                if (!receiverChar.inventory) receiverChar.inventory = {};
                const currentQty = getItemQuantity(receiverChar.inventory, item);
                setItemQuantity(receiverChar.inventory, item, currentQty + transferQty);
                ModuleAPI.save(receiver, receiverChar);
                anySuccess = true;
                if (MODULE_CONFIG.debug) console.log(`[transfer_item]: Added ${transferQty} ${item} to ${receiver}`);
            }

            return anySuccess ? 'executed' : 'permitted';
        }));

        // Register use_consumable tool (alias)
        ModuleAPI.registerTool('use_consumable', toolHelpers.createTool('use_consumable', 3, (params) => {
            return ModuleAPI.tools['remove_item'](params);
        }));

        // Register rewindable strategies for inventory tools
        ModuleAPI.registerRewindable('add_item', {
            type: 'inverse',
            getInverse: function(params, revertData) {
                const [character, item, qty] = params;
                const normalizedItem = validators.normalizeString(item);
                const quantity = validators.parseNumber(qty, true);
                if (quantity === null) return null;
                // Inverse of add is remove
                return ['add_item', [character, normalizedItem, -quantity]];
            }
        });

        ModuleAPI.registerRewindable('remove_item', {
            type: 'inverse',
            getInverse: function(params, revertData) {
                const [character, item, qty] = params;
                const normalizedItem = validators.normalizeString(item);
                const quantity = validators.parseNumber(qty, false);
                if (quantity === null) return null;
                // Inverse of remove is add
                return ['add_item', [character, normalizedItem, quantity]];
            }
        });

        ModuleAPI.registerRewindable('transfer_item', {
            type: 'inverse',
            getInverse: function(params, revertData) {
                const [giver, receiver, item, qty] = params;
                // Inverse of transfer is transfer in opposite direction
                return ['transfer_item', [receiver, giver, item, qty]];
            }
        });

        ModuleAPI.registerRewindable('use_consumable', {
            type: 'inverse',
            getInverse: function(params, revertData) {
                // use_consumable is an alias for remove_item
                const [character, item, qty] = params;
                const normalizedItem = validators.normalizeString(item);
                const quantity = validators.parseNumber(qty, false);
                if (quantity === null) return null;
                return ['add_item', [character, normalizedItem, quantity]];
            }
        });

        ModuleAPI.debugLog('module', 'InventoryModule loaded');
    }
    //#endregion InventoryModule

    // ========================================
    // SkillsModule - Stats, skills, and attributes
    // ========================================
    //#region SkillsModule
    {
        const MODULE_NAME = 'SkillsModule';

        // Define schemas
        const statsSchema = {
            id: 'stats',
            defaults: {
                level: { value: 1, xp: { current: 0, max: 500 } },
                hp: { current: 100, max: 100 }
            },
            level_progression: {
                xp_formula: "level * (level - 1) * 500"
            },
            hp_progression: {
                base: 100,
                per_level: 20
            },
            display: [
                {
                    line: "infoline",
                    priority: 30,
                    format: "`Level ${stats?.level?.value || 1} (${stats?.level?.xp?.current || 0}/${stats?.level?.xp?.max || 0})`"
                },
                {
                    line: "infoline",
                    priority: 40,
                    format: "`HP: ${stats?.hp?.current || 0}/${stats?.hp?.max || 100}`"
                }
            ]
        };

        const skillsSchema = {
            id: 'skills',
            defaults: {},  // Skills are added dynamically via unlock_newskill
            registry: ["One_Handed_Sword", "Two_Handed_Sword", "Rapier", "Shield", "Parry",
                      "Battle_Healing", "Searching", "Tracking", "Hiding", "Night_Vision",
                      "Sprint", "Acrobatics", "Cooking", "Fishing", "Blacksmithing",
                      "Tailoring", "Alchemy", "Medicine_Mixing"],
            skill_progression: {
                xp_formula: "level * 100"
            },
            display: {
                line: "section",
                priority: 60,
                format: "`**Skills**\\n${Object.entries(skills || {}).map(([k,v]) => \`• ${k}: Level ${v.level} (${v.xp?.current || 0}/${v.xp?.max || 0} XP)\`).join('\\n')}`",
                condition: "Object.keys(skills || {}).length > 0"
            }
        };

        const attributesSchema = {
            id: 'attributes',
            defaults: {
                STRENGTH: { value: 10 },
                AGILITY: { value: 10 },
                VITALITY: { value: 10 },
                DEXTERITY: { value: 10 }
            },
            registry: ["STRENGTH", "AGILITY", "VITALITY", "DEXTERITY", "INTELLIGENCE", "WISDOM", "CHARISMA", "LUCK"]
        };

        // Create [SANE:S] cards for each schema if they don't exist
        [
            { name: 'stats', schema: statsSchema },
            { name: 'skills', schema: skillsSchema },
            { name: 'attributes', schema: attributesSchema }
        ].forEach(({ name, schema }) => {
            const existingCard = Utilities.storyCard.get(`[SANE:S] ${name}`);
            if (!existingCard) {
                Utilities.storyCard.upsert({
                    title: `[SANE:S] ${name}`,
                    value: `# ${name.charAt(0).toUpperCase() + name.slice(1)} Component Schema`,
                    description: JSON.stringify(schema, null, 2),
                    type: 'data'
                });
                if (debug) console.log(`${MODULE_NAME}: Created [SANE:S] ${name} Story Card`);
            }
        });

        // Register schemas (Story Card versions take precedence if loaded)
        ModuleAPI.registerSchema('stats', statsSchema);
        ModuleAPI.registerSchema('skills', skillsSchema);
        ModuleAPI.registerSchema('attributes', attributesSchema);

        // Helper functions
        function calculateLevelXPRequirement(level) {
            // Use schema formula: level * (level - 1) * 500
            return level * (level - 1) * 500;
        }

        function calculateMaxHP(level) {
            // Use schema formula: 100 + 20 per level
            return 100 + ((level - 1) * 20);
        }

        function processLevelUp(character) {
            if (!character.stats) return false;

            const stats = character.stats;
            if (!stats.level || typeof stats.level.value !== 'number') return false;

            let leveledUp = false;

            while (stats.level.xp && stats.level.xp.current >= stats.level.xp.max) {
                // Level up
                stats.level.xp.current -= stats.level.xp.max;
                stats.level.value++;
                stats.level.xp.max = calculateLevelXPRequirement(stats.level.value + 1);

                // Update max HP
                const newMaxHP = calculateMaxHP(stats.level.value);
                if (stats.hp) {
                    const hpGain = newMaxHP - stats.hp.max;
                    stats.hp.max = newMaxHP;
                    stats.hp.current = Math.min(stats.hp.current + hpGain, stats.hp.max);
                }

                leveledUp = true;
                ModuleAPI.debugLog('skills', `${character.id} leveled up to ${stats.level.value}!`);
            }

            return leveledUp;
        }

        function processSkillLevelUp(skill, skillName) {
            let leveledUp = false;

            while (skill.xp && skill.xp.current >= skill.xp.max) {
                skill.xp.current -= skill.xp.max;
                skill.level = (skill.level || 0) + 1;
                skill.xp.max = skill.level * 100; // Simple formula for skill XP
                leveledUp = true;
                ModuleAPI.debugLog('skills', `${skillName} leveled up to ${skill.level}!`);
            }

            return leveledUp;
        }

        // Register API functions
        ModuleAPI.registerAPI('calculateLevelXPRequirement', calculateLevelXPRequirement);
        ModuleAPI.registerAPI('calculateMaxHP', calculateMaxHP);
        ModuleAPI.registerAPI('processLevelUp', processLevelUp);
        ModuleAPI.registerAPI('processSkillLevelUp', processSkillLevelUp);

        // Register tools
        ModuleAPI.registerTool('add_levelxp', toolHelpers.createTool('add_levelxp', 2, (params) => {
            const [characterName, xpAmount] = params;

            const charName = validators.normalizeString(characterName);
            const xp = validators.parseNumber(xpAmount, true);

            if (xp === null || xp === 0) {
                if (MODULE_CONFIG.debug) console.log(`[add_levelxp]: Invalid XP amount: ${xpAmount}`);
                return 'malformed';
            }

            const character = toolHelpers.getEntityOrTrack(charName, 'add_levelxp');
            if (!character) return 'executed';

            // Ensure stats component exists
            if (!character.stats) character.stats = {};
            if (!character.stats.level) {
                character.stats.level = {
                    value: 1,
                    xp: { current: 0, max: calculateLevelXPRequirement(2) }
                };
            }

            const oldLevel = character.stats.level.value;
            const oldXP = character.stats.level.xp.current;

            // Apply XP (can be negative)
            character.stats.level.xp.current = Math.max(0, oldXP + xp);

            // Process level up if positive XP
            if (xp > 0) {
                processLevelUp(character);
            }

            const newLevel = character.stats.level.value;
            const action = xp > 0 ? 'gained' : 'lost';

            if (MODULE_CONFIG.debug) {
                console.log(`[add_levelxp]: ${charName} ${action} ${Math.abs(xp)} XP (Level ${oldLevel} → ${newLevel})`);
            }

            // Save character
            ModuleAPI.save(charName, character);
            return 'executed';
        }));

        ModuleAPI.registerTool('add_skillxp', toolHelpers.createTool('add_skillxp', 3, (params) => {
            const [characterName, skillName, xpAmount] = params;

            const charName = validators.normalizeString(characterName);
            const skill = validators.normalizeString(skillName);
            const xp = validators.parseNumber(xpAmount, true);

            if (xp === null || xp === 0) {
                if (MODULE_CONFIG.debug) console.log(`[add_skillxp]: Invalid XP amount: ${xpAmount}`);
                return 'malformed';
            }

            const character = toolHelpers.getEntityOrTrack(charName, 'add_skillxp');
            if (!character) return 'executed';

            // Check if skill is unlocked
            if (!character.skills || !character.skills[skill]) {
                if (MODULE_CONFIG.debug) console.log(`[add_skillxp]: Skill ${skill} not unlocked for ${charName}`);
                return 'executed';
            }

            const skillData = character.skills[skill];
            const oldLevel = skillData.level || 1;
            const oldXP = skillData.xp ? skillData.xp.current : 0;

            // Apply XP (can be negative)
            skillData.xp.current = Math.max(0, oldXP + xp);

            // Process skill level up if positive XP
            if (xp > 0) {
                processSkillLevelUp(skillData, skill);
            }

            const newLevel = skillData.level || 1;
            const action = xp > 0 ? 'gained' : 'lost';

            if (MODULE_CONFIG.debug) {
                console.log(`[add_skillxp]: ${charName}'s ${skill} ${action} ${Math.abs(xp)} XP (Level ${oldLevel} → ${newLevel})`);
            }

            // Save character
            ModuleAPI.save(charName, character);
            return 'executed';
        }));

        ModuleAPI.registerTool('unlock_newskill', toolHelpers.createTool('unlock_newskill', 2, (params) => {
            const [characterName, skillName] = params;

            const charName = validators.normalizeString(characterName);
            const skill = validators.normalizeString(skillName);

            const character = toolHelpers.getEntityOrTrack(charName, 'unlock_newskill');
            if (!character) return 'executed';

            // Ensure skills component exists
            if (!character.skills) character.skills = {};

            // Check if already unlocked
            if (character.skills[skill]) {
                if (MODULE_CONFIG.debug) console.log(`[unlock_newskill]: ${charName} already has ${skill} unlocked`);
                return 'executed';
            }

            // Unlock the skill
            character.skills[skill] = {
                level: 1,
                xp: { current: 0, max: 100 }
            };

            if (MODULE_CONFIG.debug) console.log(`[unlock_newskill]: ${charName} unlocked new skill: ${skill}`);

            // Save character
            ModuleAPI.save(charName, character);
            return 'executed';
        }));

        ModuleAPI.registerTool('modify_attribute', toolHelpers.createTool('modify_attribute', 3, (params) => {
            const [characterName, attributeName, amount] = params;

            const charName = validators.normalizeString(characterName);
            const attribute = attributeName ? String(attributeName).toUpperCase() : '';
            const value = validators.parseNumber(amount, true);

            if (value === null || value === 0) {
                if (MODULE_CONFIG.debug) console.log(`[modify_attribute]: Invalid amount: ${amount}`);
                return 'malformed';
            }

            const character = toolHelpers.getEntityOrTrack(charName, 'modify_attribute');
            if (!character) return 'executed';

            // Ensure attributes component exists
            if (!character.attributes) character.attributes = {};
            if (!character.attributes[attribute]) {
                character.attributes[attribute] = { value: 0 };
            }

            const oldValue = character.attributes[attribute].value;
            const newValue = Math.max(0, oldValue + value);
            character.attributes[attribute].value = newValue;

            if (MODULE_CONFIG.debug) {
                const action = value > 0 ? 'increased' : 'decreased';
                console.log(`[modify_attribute]: ${charName}'s ${attribute} ${action} by ${Math.abs(value)} (${oldValue} → ${newValue})`);
            }

            // Save character
            ModuleAPI.save(charName, character);
            return 'executed';
        }));

        // Register rewindable strategies for skills tools
        ModuleAPI.registerRewindable('add_levelxp', {
            type: 'inverse',
            getInverse: function(params, revertData) {
                const [character, xp] = params;
                const xpAmount = validators.parseNumber(xp, true);
                if (xpAmount === null) return null;
                // Inverse of adding XP is removing XP
                return ['add_levelxp', [character, -xpAmount]];
            }
        });

        ModuleAPI.registerRewindable('add_skillxp', {
            type: 'inverse',
            getInverse: function(params, revertData) {
                const [character, skill, xp] = params;
                const normalizedSkill = validators.normalizeString(skill);
                const xpAmount = validators.parseNumber(xp, true);
                if (xpAmount === null) return null;
                // Inverse of adding XP is removing XP
                return ['add_skillxp', [character, normalizedSkill, -xpAmount]];
            }
        });

        ModuleAPI.registerRewindable('unlock_newskill', {
            type: 'stateful',
            captureState: function(params) {
                const [characterName, skillName] = params;
                const charName = validators.normalizeString(characterName);
                const skill = validators.normalizeString(skillName);
                const character = ModuleAPI.get(charName);

                if (character && character.skills && character.skills[skill]) {
                    // Skill already exists, capture its state
                    return {
                        skillExisted: true,
                        skillData: JSON.stringify(character.skills[skill])
                    };
                }
                return { skillExisted: false };
            },
            restoreState: function(params, state) {
                const [characterName, skillName] = params;
                const charName = validators.normalizeString(characterName);
                const skill = validators.normalizeString(skillName);
                const character = ModuleAPI.get(charName);

                if (character && character.skills) {
                    if (state.skillExisted && state.skillData) {
                        // Restore previous state
                        character.skills[skill] = JSON.parse(state.skillData);
                    } else {
                        // Skill didn't exist, remove it
                        delete character.skills[skill];
                    }
                    ModuleAPI.save(charName, character);
                }
            }
        });

        ModuleAPI.registerRewindable('modify_attribute', {
            type: 'inverse',
            getInverse: function(params, revertData) {
                const [character, attribute, value] = params;
                // Normalize attribute name the same way the tool does
                const normalizedAttr = validators.normalizeString(attribute).toUpperCase();
                const amount = validators.parseNumber(value, true);
                if (amount === null) return null;
                // Inverse of modifying is modifying by negative amount
                return ['modify_attribute', [character, normalizedAttr, -amount]];
            }
        });

        ModuleAPI.debugLog('module', 'SkillsModule loaded');
    }
    //#endregion SkillsModule

    // ========================================
    // DisplayModule - Entity display formatting
    // ========================================
    //#region DisplayModule
    {
        const MODULE_NAME = 'DisplayModule';

        // Register the display schema with minimal defaults
        ModuleAPI.registerSchema('display', {
            id: 'display',
            defaults: {
                active: true
            }
        });

        // Simple template parser - replaces {field.path} with entity values
        function parseTemplate(template, entity) {
            if (!template || !entity) return '';

            // Convert escaped newlines to actual newlines
            let result = template.replace(/\\n/g, '\n');

            // First handle special function calls: {$func:param1,param2,param3}
            result = result.replace(/\{\$(\w+):([^}]+)\}/g, (match, funcName, params) => {
                const paramList = params.split(',').map(p => p.trim());

                // Handle built-in display functions
                if (funcName === 'relFlavor' && paramList.length === 3) {
                    // {$relFlavor:fromPath,toPath,valuePath}
                    const fromName = getFieldValue(entity, paramList[0]);
                    const toName = paramList[1]; // This might be a literal or a path
                    const value = getFieldValue(entity, paramList[2]);

                    if (typeof value === 'number') {
                        // Call the getRelationshipFlavor function from LibraryAPI if available
                        if (ModuleAPI.Library && ModuleAPI.Library.getRelationshipFlavor) {
                            return ModuleAPI.Library.getRelationshipFlavor(value, fromName || entity.id, toName);
                        }
                        // Fallback
                        return `${fromName || entity.id} has an indescribable relationship with ${toName}`;
                    }
                }

                return match; // Return unchanged if function not recognized
            });

            // Then handle iteration patterns with nested braces
            // Match {collection.*→ ...} or {collection.*| ...} including nested braces
            result = result.replace(/\{([^}]*\.\*[→|][^{}]*(?:\{[^}]*\}[^{}]*)*)\}/g, (match, path) => {
                // Handle special iteration syntax: {collection.*→ pattern} or {collection.*| pattern}
                if (path.includes('.*→') || path.includes('.*|')) {
                    // Find the separator type
                    const separator = path.includes('.*→') ? '\n' : ', ';

                    // Split more carefully to handle nested braces in pattern
                    let collectionPath, pattern;
                    if (path.includes('.*→')) {
                        const splitIndex = path.indexOf('.*→');
                        collectionPath = path.substring(0, splitIndex);
                        pattern = path.substring(splitIndex + 4); // 4 = length of '.*→'
                    } else {
                        const splitIndex = path.indexOf('.*|');
                        collectionPath = path.substring(0, splitIndex);
                        pattern = path.substring(splitIndex + 3); // 3 = length of '.*|'
                    }

                    // Get the collection
                    const collection = getFieldValue(entity, collectionPath.trim());
                    if (!collection || typeof collection !== 'object') return '';

                    // Iterate and build output
                    const items = [];
                    for (const [key, value] of Object.entries(collection)) {
                        let itemText = pattern.trim();

                        // Handle special relationship flavor function in iterations
                        itemText = itemText.replace(/\{\$relFlavor:([^,}]+),([^,}]+)\}/g, (m, fromParam, valueParam) => {
                            // fromParam is either 'entity' for the parent entity or a field path
                            // valueParam is typically '*.value' for the relationship value
                            const fromName = fromParam === 'entity' ?
                                (entity.info?.displayname || entity.id) :
                                getFieldValue(entity, fromParam);
                            const toName = key; // The key in the iteration is the target name
                            const relValue = valueParam.startsWith('*.') ?
                                getFieldValue(value, valueParam.substring(2)) :
                                getFieldValue(entity, valueParam);

                            if (typeof relValue === 'number') {
                                // Use ModuleAPI.Library if available, otherwise return a default
                                if (ModuleAPI.Library && ModuleAPI.Library.getRelationshipFlavor) {
                                    return ModuleAPI.Library.getRelationshipFlavor(relValue, fromName, toName);
                                } else {
                                    // Fallback if RelationshipsModule isn't loaded
                                    return `relationship value: ${relValue}`;
                                }
                            }
                            return `${fromName} has an unknown relationship with ${toName}`;
                        });

                        // Replace {*} with key
                        itemText = itemText.replace(/\{\*\}/g, key);
                        // Replace {*.field} with value fields
                        itemText = itemText.replace(/\{\*\.([^}]+)\}/g, (m, field) => {
                            if (typeof value === 'object' && value !== null) {
                                const fieldValue = getFieldValue(value, field);
                                // Handle special values
                                if (fieldValue === null || fieldValue === undefined) return 'None';
                                if (fieldValue === true) return 'Yes';
                                if (fieldValue === false) return 'No';
                                return fieldValue;
                            }
                            return value || '';
                        });
                        items.push(itemText);
                    }
                    return items.join(separator);
                }

                return match; // Should not reach here
            });

            // Then handle normal field replacements
            result = result.replace(/\{([^}]+)\}/g, (match, path) => {
                // Skip iteration patterns (already handled above)
                if (path.includes('.*→') || path.includes('.*|')) {
                    return match;
                }

                // Normal field replacement
                const value = getFieldValue(entity, path.trim());
                // Handle special values for better display
                if (value === null || value === undefined) return '';
                if (value === true) return 'Yes';
                if (value === false) return 'No';
                return value;
            });

            return result;
        }

        // Helper to get nested field values
        function getFieldValue(obj, path) {
            const parts = path.split('.');
            let current = obj;

            for (const part of parts) {
                if (current == null) return undefined;
                current = current[part];
            }

            return current;
        }


        // Build display for an entity
        function buildEntityDisplay(entity) {
            if (!entity || !entity.id) {
                ModuleAPI.debugLog('display', 'Invalid entity for display');
                return '';
            }

            // Check if display is active
            if (!entity.display || entity.display.active === false) {
                return '';
            }

            const sections = {};

            // Process display sections if defined
            if (entity.display.sections) {
                for (const [sectionName, sectionConfig] of Object.entries(entity.display.sections)) {
                    if (!sectionConfig || !sectionConfig.template) continue;

                    // Check condition if specified
                    if (sectionConfig.condition) {
                        // Handle wildcard patterns like "inventory.*" or "relationships.*"
                        if (sectionConfig.condition.endsWith('.*')) {
                            const basePath = sectionConfig.condition.slice(0, -2);
                            const value = getFieldValue(entity, basePath);
                            // Skip if the object doesn't exist or has no properties
                            if (!value || typeof value !== 'object' || Object.keys(value).length === 0) {
                                continue;
                            }
                        } else {
                            // Normal condition - check if field exists and is truthy
                            const value = getFieldValue(entity, sectionConfig.condition);
                            if (!value) {
                                continue;
                            }
                        }
                    }

                    // Parse the template
                    const output = parseTemplate(sectionConfig.template, entity);

                    if (output && output.trim()) {
                        const line = sectionConfig.line || 'section';
                        const priority = sectionConfig.priority || 50;

                        if (!sections[line]) sections[line] = [];
                        sections[line].push({
                            priority,
                            text: output,
                            condition: sectionConfig.condition
                        });
                    }
                }
            }

            // Get separators and order
            const separators = entity.display?.separators || {
                nameline: ' ',
                infoline: ' | ',
                section: '\n',
                footer: '\n'
            };

            const order = entity.display?.order || ['prefixline', 'nameline', 'infoline', 'section', 'footer'];
            const lineSeparator = separators.section || '\n';

            // Build output
            let result = [];

            // Add prefix if defined
            if (entity.display?.prefix) {
                result.push(parseTemplate(entity.display.prefix, entity));
            }

            // Process lines in the defined order
            for (const lineName of order) {
                if (sections[lineName] && sections[lineName].length > 0) {
                    // Sort by priority
                    sections[lineName].sort((a, b) => a.priority - b.priority);

                    // Get separator for this line type
                    const separator = separators[lineName] || '';

                    // Join all items on this line with the line's separator
                    const texts = sections[lineName].map(s => s.text).filter(t => t);
                    if (texts.length > 0) {
                        result.push(texts.join(separator));
                    }
                }
            }

            // Add footer if defined
            if (entity.display?.footer) {
                result.push(parseTemplate(entity.display.footer, entity));
            }

            return result.join(lineSeparator);
        }

        // Register the functions in the API
        ModuleAPI.registerAPI('buildEntityDisplay', buildEntityDisplay);

        // Make them available to save function and external use
        Library.buildEntityDisplay = buildEntityDisplay;

        ModuleAPI.debugLog('module', 'DisplayModule loaded');
    }
    //#endregion DisplayModule

    // ========================================
    // GenerationWizardModule - AI entity generation
    // ========================================
    //#region GenerationWizardModule
    {
        const MODULE_NAME = 'GenerationWizardModule';
        const ZERO_WIDTH_CHAR = '\u200B'; // Prevents AI Dungeon from treating empty output as error

        // Status messages
        const THINKING_MESSAGE = 'The GM will use the next turn to think. Use `/gw_abort` if undesired.';
        const PROCESSING_MESSAGE = 'The GM is processing entity generation... Use `/gw_abort` if needed.';
        const COMPLETION_MESSAGE = 'Generation completed, returning to story.';

        // Response parsing configuration
        const PARSER_CONFIG = {
            maxRetries: 3,
            maxTurnsBeforeAbandoned: 10
        };

        // Value parsers for different field types
        const valueParsers = {
            // Parse "Item x5" format for inventory
            inventory: function(value) {
                // Check for empty/null values first
                const trimmedValue = value ? value.trim().toLowerCase() : '';
                const emptyValues = ['none', 'n/a', 'na', 'null', ''];

                if (emptyValues.includes(trimmedValue)) {
                    // Return special marker for empty inventory
                    return { _empty: true };
                }

                const match = value.match(/^(.+?)\s*x\s*(\d+)$/);
                if (match) {
                    return {
                        item: match[1].trim(),
                        quantity: parseInt(match[2], 10)
                    };
                }
                return { item: value.trim(), quantity: 1 };
            },
            // Parse "SkillName:Level" format
            skill: function(value) {
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
                return { name: value.trim(), level: 1 };
            },
            // Parse "CharacterName:Value" format for relationships
            relationship: function(value) {
                const match = value.match(/^(.+?):(\d+)$/);
                if (match) {
                    return {
                        character: match[1].trim(),
                        value: parseInt(match[2], 10)
                    };
                }
                // Just character name with default value
                return {
                    character: value.trim(),
                    value: 50  // Default relationship value
                };
            },
            // Parse objectives list
            objectives: function(value) {
                // Parse list of objectives from various formats
                const objectives = {};

                // Split by newlines and filter out empty lines
                const lines = value.split('\n').filter(line => line.trim());

                lines.forEach((line, index) => {
                    // Remove common prefixes like "- ", "• ", "1. ", etc.
                    const cleanLine = line.replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, '').trim();

                    if (cleanLine) {
                        const objId = `objective_${index + 1}`;
                        objectives[objId] = {
                            description: cleanLine,
                            completed: false,
                            progress: 0,
                            target: 1
                        };
                    }
                });

                return objectives;
            },
            // Parse pathways/exits
            pathways: function(value) {
                // Parse list of pathways/exits
                const pathways = {};

                // Split by newlines and filter out empty lines
                const lines = value.split('\n').filter(line => line.trim());

                lines.forEach((line, index) => {
                    // Remove common prefixes
                    const cleanLine = line.replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, '').trim();

                    if (cleanLine) {
                        // Try to parse "Direction: Destination" format
                        const colonMatch = cleanLine.match(/^([^:]+):(.+)$/);
                        if (colonMatch) {
                            const direction = colonMatch[1].trim().toLowerCase();
                            const destination = colonMatch[2].trim();

                            // Store pathway keyed by direction
                            pathways[direction] = {
                                destination: destination,
                                description: null
                            };
                        } else {
                            // Just a direction name - use as key with Unknown destination
                            const direction = cleanLine.toLowerCase();
                            pathways[direction] = {
                                destination: 'Unknown',
                                description: null
                            };
                        }
                    }
                });

                return pathways;
            },
            // Parse number
            number: function(value) {
                const num = parseInt(value, 10);
                return isNaN(num) ? 0 : num;
            },
            // Parse text (default)
            text: function(value) {
                return value.trim();
            },
            // Parse select (validate against options)
            select: function(value, options) {
                const normalized = value.trim();
                if (options && options.includes(normalized)) {
                    return normalized;
                }
                // Try case-insensitive match
                const found = options?.find(opt =>
                    opt.toLowerCase() === normalized.toLowerCase()
                );
                return found || normalized;
            }
        };

        // Apply field value to entity using maps_to pattern
        function applyMapsTo(entityId, mapsTo, parsedValue) {
            if (!mapsTo || parsedValue === undefined || parsedValue === null) return false;

            // Special handling for empty inventory marker
            if (parsedValue && parsedValue._empty === true) {
                // This is a valid "no items" response - return true to indicate success
                // but don't actually set anything
                return true;
            }

            // Replace * with entityId directly
            let path = mapsTo.replace('*', entityId);

            // Handle array notation like aliases[0]
            const arrayMatch = path.match(/^(.+)\[(\d+)\]$/);
            if (arrayMatch) {
                const arrayPath = arrayMatch[1];
                const index = parseInt(arrayMatch[2]);

                // Get or create the array
                let array = ModuleAPI.get(arrayPath);
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
                return ModuleAPI.set(arrayPath, array);
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
                    // For item paths, store only quantity (not the full {item, quantity} object)
                    parsedValue = { quantity: parsedValue.quantity || 1 };
                }
                // Replace {character} with parsed character value
                if (parsedValue.character) {
                    path = path.replace('{character}', parsedValue.character);
                }
            }

            // Special handling for objectives - ensure complete structure
            if (path.includes('.objectives.objective_') && path.endsWith('.description')) {
                // Extract the objective parent path
                const objPath = path.substring(0, path.lastIndexOf('.description'));

                // Get or create the objective object
                let objective = ModuleAPI.get(objPath);
                if (!objective || typeof objective !== 'object') {
                    objective = {
                        description: parsedValue,
                        completed: false,
                        progress: 0,
                        target: 1
                    };
                    ModuleAPI.set(objPath, objective);
                    if (debug) console.log(`${MODULE_NAME}: Created complete objective at ${objPath}`);
                    return true;
                } else {
                    // Just update the description
                    objective.description = parsedValue;
                    ModuleAPI.set(objPath, objective);
                    return true;
                }
            }

            // Apply the value using ModuleAPI.set
            try {
                if (debug) console.log(`${MODULE_NAME}: Setting ${path} = ${JSON.stringify(parsedValue)}`);
                return ModuleAPI.set(path, parsedValue);
            } catch (e) {
                console.log(`${MODULE_NAME}: Failed to apply maps_to: ${e.message}`);
                return false;
            }
        }

        // Helper: Evaluate computed fields
        function evaluateComputedField(formula, collectedFields) {
            if (!formula || typeof formula !== 'string') return null;

            // Replace $(fieldName) with collected values
            let expression = formula;
            const fieldPattern = /\$\(([^)]+)\)/g;
            expression = expression.replace(fieldPattern, (match, fieldName) => {
                const value = collectedFields[fieldName];
                if (value === undefined || value === null) {
                    return 'null';
                }
                // Quote strings
                if (typeof value === 'string') {
                    return `"${value.replace(/"/g, '\\"')}"`;
                }
                return String(value);
            });

            // Evaluate the expression using eval (AI Dungeon sandbox doesn't support Function constructor)
            try {
                if (debug) console.log(`${MODULE_NAME}: Evaluating expression: ${expression}`);
                const result = eval(expression);
                if (debug) console.log(`${MODULE_NAME}: Expression result: ${result}`);
                return result;
            } catch (e) {
                if (debug) console.log(`${MODULE_NAME}: Failed to evaluate computed field: ${e.message}`);
                return null;
            }
        }

        // Helper: Expand template fields into concrete fields
        function expandFieldTemplates(generation, collectedFields) {
            if (!generation.fields) return false;

            let anyExpanded = false;

            // Look for fields with type: "expansion"
            for (const [fieldName, fieldDef] of Object.entries(generation.fields)) {
                if (fieldDef.type !== 'expansion') continue;
                if (fieldDef._expanded) continue;  // Already expanded

                // Evaluate the count (can be a number or a formula)
                let count = fieldDef.count;
                if (typeof count === 'string' && count.includes('$(')) {
                    count = evaluateComputedField(count, collectedFields);
                }

                if (typeof count !== 'number' || count < 1) {
                    if (debug) console.log(`${MODULE_NAME}: Invalid count for expansion field ${fieldName}: ${count}`);
                    continue;
                }

                // Expand the template
                const template = fieldDef.template;
                if (!template) {
                    if (debug) console.log(`${MODULE_NAME}: No template for expansion field ${fieldName}`);
                    continue;
                }

                // Create {count} number of fields based on template
                for (let i = 1; i <= count; i++) {
                    const expandedFieldName = template.fieldName ? template.fieldName.replace('{i}', i) : `${fieldName}_${i}`;

                    // Don't overwrite existing fields
                    if (generation.fields[expandedFieldName]) continue;

                    // Create the expanded field
                    generation.fields[expandedFieldName] = {
                        maps_to: template.maps_to ? template.maps_to.replace('{i}', i) : null,
                        key: template.key ? template.key.replace('{i}', i) : expandedFieldName.toUpperCase(),
                        parser: template.parser || 'text',
                        prompt: template.prompt ? {
                            uncollected: template.prompt.uncollected ? template.prompt.uncollected.replace(/{i}/g, i) : null,
                            known: template.prompt.known ? template.prompt.known.replace(/{i}/g, i) : null,
                            priority: template.prompt.priority ? template.prompt.priority + i : 50 + i
                        } : null
                    };

                    if (debug) console.log(`${MODULE_NAME}: Expanded ${fieldName} to ${expandedFieldName}`);
                    anyExpanded = true;
                }

                // Mark as expanded
                fieldDef._expanded = true;
            }

            return anyExpanded;
        }

        // Helper: Process computed fields
        function processComputedFields(generation, collectedFields) {
            if (!generation.fields) return false;

            let anyComputed = false;

            for (const [fieldName, fieldDef] of Object.entries(generation.fields)) {
                if (fieldDef.source !== 'computed') continue;
                if (collectedFields[fieldName] !== undefined) continue;  // Already computed

                // Evaluate the formula
                const result = evaluateComputedField(fieldDef.formula, collectedFields);
                if (result !== null && result !== undefined) {
                    collectedFields[fieldName] = result;
                    anyComputed = true;
                    if (debug) console.log(`${MODULE_NAME}: Computed ${fieldName} = ${result}`);
                }
            }

            return anyComputed;
        }

        // Helper: Find entities with active generation
        function findActiveGenerator() {
            // First check the cache
            for (const [key, entity] of Object.entries(dataCache)) {
                if (entity?.generationwizard?.state === 'generating') {
                    return { entityId: entity.id, entity };
                }
            }

            // If not in cache, scan all entity cards to find active generator
            const entityCards = Utilities.storyCard.find(c => c.title?.startsWith('[SANE:E]'), true) || [];
            for (const card of entityCards) {
                if (card.description) {
                    const entityId = card.title.replace('[SANE:E] ', '');
                    const entity = ModuleAPI.get(entityId);
                    if (entity?.generationwizard?.state === 'generating') {
                        return { entityId: entity.id, entity };
                    }
                }
            }

            return null;
        }

        // Helper: Find queued entities
        function findQueuedGenerators() {
            const queued = [];

            // Check cache first
            for (const [key, entity] of Object.entries(dataCache)) {
                if (entity?.generationwizard?.state === 'queued') {
                    queued.push({ entityId: entity.id, entity });
                }
            }

            // Also scan entity cards if needed
            const entityCards = Utilities.storyCard.find(c => c.title?.startsWith('[SANE:E]'), true) || [];
            for (const card of entityCards) {
                if (card.description) {
                    const entityId = card.title.replace('[SANE:E] ', '');
                    // Skip if already found in cache
                    if (!dataCache[entityId] && !dataCache[entityId.toLowerCase()]) {
                        const entity = ModuleAPI.get(entityId);
                        if (entity?.generationwizard?.state === 'queued') {
                            queued.push({ entityId: entity.id, entity });
                        }
                    }
                }
            }

            return queued;
        }

        // Helper: Set generator state
        function setGeneratorState(entityId, newState) {
            const entity = ModuleAPI.get(entityId);
            if (entity?.generationwizard) {
                entity.generationwizard.state = newState;
                ModuleAPI.save(entityId, entity);
            }
        }

        // Hook: context (process generation in context phase)
        ModuleAPI.registerHook('context', function(text) {
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
                return text;  // No active generation
            }

            // Build prompt from embedded component
            const prompt = preparePromptFromComponent(activeGen.entity);
            if (prompt) {
                // Set thinking message for user
                if (state && typeof state === 'object') {
                    state.message = THINKING_MESSAGE;
                }
                // Append prompt to context
                const modifiedText = text + prompt;
                return modifiedText;
            }

            return text;
        });

        // Hook: output (process AI generation response)
        ModuleAPI.registerHook('output', function(text) {
            // Process AI response for field collection
            const activeGen = findActiveGenerator();
            if (!activeGen) {
                return { active: false, text: text };  // Pass through original text
            }

            // Process the response
            const result = processResponse(text, activeGen);
            let hiddentext = ' ';
            // Set appropriate message based on result
            if (state && typeof state === 'object') {
                if (result === 'completed') {
                    state.message = COMPLETION_MESSAGE;
                    // temp state.message fix
                    hiddentext = HIDE_BEGINNING + COMPLETION_MESSAGE + HIDE_ENDING;
                } else if (result) {
                    state.message = PROCESSING_MESSAGE;
                    // temp state.message fix
                    hiddentext = HIDE_BEGINNING + PROCESSING_MESSAGE + HIDE_ENDING;
                }
            }

            // Hide the output during generation
            return { active: true, text: hiddentext /*ZERO_WIDTH_CHAR*/ };
        });

        // Helper: Process AI response
        function processResponse(responseText, activeGen) {
            try {
                const entity = activeGen.entity;
                const genComponent = entity.generationwizard;
                const activeGenName = genComponent.activeGeneration || 'initial';
                const generation = genComponent.generations?.[activeGenName];

                if (!generation) {
                    console.log(`${MODULE_NAME}: No active generation object found`);
                    return false;
                }

                // Get expected fields
                const expectedKeys = [];
                const keyToFieldMap = {};
                const collectedFields = genComponent.fields_collected || {};

                if (generation.fields) {
                    for (const [fieldName, fieldDef] of Object.entries(generation.fields)) {
                        // Skip computed and expansion fields - they're not collected from AI
                        if (fieldDef.source === 'computed' || fieldDef.type === 'expansion') continue;

                        if (!collectedFields[fieldName]) {
                            const key = fieldDef.key || fieldName.toUpperCase();
                            expectedKeys.push(key);
                            keyToFieldMap[key] = fieldName;
                        }
                    }
                }

                if (expectedKeys.length === 0) {
                    // All fields collected, finalize
                    finalizeEntity(activeGen.entityId, entity);
                    return 'completed';
                }

                if (debug) {
                    console.log(`${MODULE_NAME}: Expected keys: ${expectedKeys.join(', ')}`);
                    console.log(`${MODULE_NAME}: Response length: ${responseText.length}, starts with: "${responseText.substring(0, 50)}"`);
                }

                // Parse response for fields
                const parsed = parseFields(responseText, expectedKeys);

                if (debug) {
                    console.log(`${MODULE_NAME}: Parsed ${Object.keys(parsed).length} fields: ${JSON.stringify(parsed)}`);
                }

                let anyCollected = false;

                for (const [key, value] of Object.entries(parsed)) {
                    const fieldName = keyToFieldMap[key];
                    if (fieldName && generation.fields[fieldName]) {
                        const fieldDef = generation.fields[fieldName];

                        // Parse value based on field type
                        let parsedValue = value;
                        if (fieldDef.parser && valueParsers[fieldDef.parser]) {
                            parsedValue = valueParsers[fieldDef.parser](value, fieldDef.options);
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
                                    const existingEntity = ModuleAPI.get(entityId);
                                    if (existingEntity && existingEntity.id && existingEntity.id !== activeGen.entityId &&
                                        (existingEntity.aliases || existingEntity.GameplayTags || existingEntity.components)) {
                                        validationResult = false;
                                        validationMessage = `Entity '${value}' already exists`;
                                    }
                                }
                            } else if (typeof fieldDef.validation === 'function') {
                                // Custom validation function
                                try {
                                    validationResult = fieldDef.validation(value, entity, ModuleAPI);
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

                            // If validation failed, track rejection and skip this field
                            if (!validationResult) {
                                console.log(`${MODULE_NAME}: Validation failed for ${fieldName}: ${validationMessage}`);

                                // Track rejected values for debugging and avoiding re-suggestions
                                const rejectedPath = `${activeGen.entityId}.generationwizard.rejected_${fieldName}`;
                                let rejectedValues = ModuleAPI.get(rejectedPath) || [];
                                if (!rejectedValues.includes(value)) {
                                    rejectedValues.push(value);
                                    ModuleAPI.set(rejectedPath, rejectedValues);
                                }

                                // Skip storing this field - it will be re-requested
                                continue;
                            }
                        }

                        // Apply to entity using maps_to from blueprint
                        if (fieldDef.maps_to) {
                            const success = applyMapsTo(activeGen.entityId, fieldDef.maps_to, parsedValue);
                            if (!success) {
                                console.log(`${MODULE_NAME}: Failed to apply ${fieldName} to ${fieldDef.maps_to}`);
                            }
                        } else {
                            if (debug) console.log(`${MODULE_NAME}: No maps_to defined for field ${fieldName}`);
                        }

                        // Mark as collected
                        if (!genComponent.fields_collected) {
                            genComponent.fields_collected = {};
                        }
                        // Store the original value for empty inventory items, not the marker
                        if (parsedValue && parsedValue._empty === true) {
                            genComponent.fields_collected[fieldName] = 'None';
                        } else {
                            genComponent.fields_collected[fieldName] = parsedValue;
                        }
                        anyCollected = true;
                    }
                }

                // Save progress
                if (anyCollected) {
                    ModuleAPI.save(activeGen.entityId, entity);

                    // Check if all fields are now collected (expansion already happened in prompt builder)
                    const stillNeeded = [];
                    if (generation.fields) {
                        for (const [fieldName, fieldDef] of Object.entries(generation.fields)) {
                            // Skip expansion templates and computed fields - they don't need to be collected
                            if (fieldDef.type === 'expansion' || fieldDef.source === 'computed') continue;

                            if (!genComponent.fields_collected[fieldName]) {
                                stillNeeded.push(fieldName);
                            }
                        }
                    }

                    if (stillNeeded.length === 0) {
                        // All fields collected, finalize
                        if (debug) console.log(`${MODULE_NAME}: All fields collected, finalizing entity`);
                        finalizeEntity(activeGen.entityId, entity);
                        return 'completed';
                    }
                }

                return anyCollected;
            } catch (e) {
                console.log(`${MODULE_NAME}: Error processing response: ${e.message}`);
                return false;
            }
        }

        // Helper: Parse fields from response text with multiple strategies
        function parseFields(text, expectedKeys) {
            const results = {};

            if (!text || !expectedKeys || expectedKeys.length === 0) {
                return results;
            }

            // Trim the text to remove leading/trailing whitespace
            text = text.trim();

            // Try different parsing strategies
            const strategies = ['keyValue', 'json', 'fuzzy'];

            for (const strategy of strategies) {
                const parsed = parseWithStrategy(text, expectedKeys, strategy);
                if (Object.keys(parsed).length > 0) {
                    // Merge results, prioritizing new findings
                    Object.assign(results, parsed);
                }
            }

            return results;
        }

        // Parse with specific strategy
        function parseWithStrategy(text, expectedKeys, strategy) {
            const results = {};

            if (debug) {
                console.log(`${MODULE_NAME}: Trying strategy: ${strategy}`);
            }

            switch (strategy) {
                case 'keyValue':
                    // Standard KEY: value parsing with multi-line support
                    const lines = text.split('\n');
                    let currentKey = null;
                    let currentValue = [];

                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i];
                        // Check if this line starts with an expected key
                        let foundKey = null;
                        for (const key of expectedKeys) {
                            // Try exact match for this key with multiple patterns
                            const patterns = [
                                `^\\s*${key}:\\s*(.*)$`,           // KEY: value (value optional for multi-line)
                                `^\\s*\\*\\*${key}\\*\\*:\\s*(.*)$`, // **KEY**: value (value optional)
                                `^\\s*${key}\\s*=\\s*(.*)$`         // KEY = value (value optional)
                            ];

                            for (const pattern of patterns) {
                                const regex = new RegExp(pattern, 'i');
                                const match = line.match(regex);
                                if (match) {
                                    // Save previous key-value if exists
                                    if (currentKey) {
                                        results[currentKey] = currentValue.join('\n').trim();
                                    }
                                    // Start new key-value
                                    foundKey = key;
                                    currentKey = key;
                                    const initialValue = match[1] || '';
                                    currentValue = initialValue ? [initialValue] : [];
                                    if (debug && !initialValue) {
                                        console.log(`${MODULE_NAME}: Found key ${key} with no initial value (multi-line expected)`);
                                    }
                                    break;
                                }
                            }
                            if (foundKey) break;
                        }

                        // If no key found and we're collecting a value, append to current
                        if (!foundKey && currentKey) {
                            // Check for multi-line value continuation
                            // Don't include lines that look like new keys (all caps followed by colon)
                            if (line.trim() && !line.match(/^\*{0,2}[A-Z][A-Z_]+\*{0,2}[:=]/)) {
                                currentValue.push(line);
                            }
                        }
                    }

                    // Save the last key-value pair
                    if (currentKey) {
                        results[currentKey] = currentValue.join('\n').trim();
                        if (debug && (currentKey === 'OBJECTIVES' || currentKey === 'ITEM_REWARDS')) {
                            console.log(`${MODULE_NAME}: Collected ${currentKey}: "${results[currentKey].substring(0, 100)}"`);
                        }
                    }
                    break;

                case 'json':
                    // Try to parse as JSON object
                    try {
                        const jsonMatch = text.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            const parsed = JSON.parse(jsonMatch[0]);
                            for (const key of expectedKeys) {
                                // Check various case variations
                                const variations = [
                                    key,
                                    key.toLowerCase(),
                                    key.charAt(0).toLowerCase() + key.slice(1)
                                ];
                                for (const variant of variations) {
                                    if (parsed[variant] !== undefined) {
                                        results[key] = String(parsed[variant]);
                                        break;
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        // JSON parsing failed, that's okay
                    }
                    break;

                case 'fuzzy':
                    // Fuzzy matching - look for keys anywhere in the text
                    for (const key of expectedKeys) {
                        // Skip if we already have this key from a better strategy
                        if (results[key]) continue;

                        // Create a more flexible pattern
                        const fuzzyPattern = new RegExp(
                            `${key}[:\\s=]+([^\\n]+)`,
                            'i'
                        );
                        const match = text.match(fuzzyPattern);
                        if (match) {
                            // Clean up captured value - remove leading markdown asterisks
                            let value = match[1].trim();
                            value = value.replace(/^\*+\s*/, '').replace(/\s*\*+$/, '');
                            results[key] = value;
                        }
                    }
                    break;
            }

            return results;
        }

        // Helper: Prepare prompt from component
        function preparePromptFromComponent(entity) {
            const genComponent = entity.generationwizard;
            if (!genComponent) return null;

            const activeGenName = genComponent.activeGeneration || 'initial';
            const generation = genComponent.generations?.[activeGenName];
            if (!generation) return null;

            // IMPORTANT: Process computed fields and expand templates BEFORE building prompt
            const collectedFields = genComponent.fields_collected || {};

            // Process computed fields first
            processComputedFields(generation, collectedFields);

            // Expand template fields based on computed values
            const expanded = expandFieldTemplates(generation, collectedFields);
            if (expanded && debug) {
                console.log(`${MODULE_NAME}: Expanded template fields in prompt builder`);
            }

            // Build context for variable substitution
            const context = {
                trigger_name: genComponent.trigger || entity.info?.trigger_name || entity.info?.displayname || entity.id,
                currentLocation: entity.info?.currentLocation || 'unknown',
                entityId: entity.id
            };

            // Helper to process text with variable substitution
            function processText(text) {
                if (!text) return '';
                // Support both $(variable) and {variable} syntax
                text = text.replace(/\$\(([^)]+)\)/g, (match, key) => {
                    return context[key] || match;
                });
                text = text.replace(/\{([^}]+)\}/g, (match, key) => {
                    return context[key] || match;
                });
                return text;
            }

            // Build prompt from sections
            let prompt = '\n\n';

            // Add prompt template sections if available
            if (generation.promptTemplate?.sections) {
                const sections = generation.promptTemplate.sections;

                // Header
                if (sections.header) {
                    for (const section of sections.header) {
                        const sectionText = typeof section === 'string' ? section : (section.text || '');
                        if (sectionText) {
                            const processed = processText(sectionText);
                            prompt += processed + '\n';
                        }
                    }
                }

                // Add a single newline before fields if there was header content
                if (sections.header && sections.header.length > 0) {
                    prompt += '\n';
                }

                // Field requests for uncollected fields
                const collectedFields = genComponent.fields_collected || {};
                if (generation.fields) {
                    for (const [fieldName, fieldDef] of Object.entries(generation.fields)) {
                        // Skip computed and expansion fields - they're not collected from AI
                        if (fieldDef.source === 'computed' || fieldDef.type === 'expansion') continue;

                        if (!collectedFields[fieldName]) {
                            const key = fieldDef.key || fieldName.toUpperCase();
                            if (fieldDef.prompt && fieldDef.prompt.uncollected) {
                                prompt += processText(fieldDef.prompt.uncollected) + '\n';
                            } else {
                                prompt += `${key}: [Provide ${fieldName}]\n`;
                            }
                        }
                    }
                }

                // Footer
                if (sections.footer) {
                    prompt += '\n';  // Single newline before footer
                    for (const section of sections.footer) {
                        const sectionText = typeof section === 'string' ? section : (section.text || '');
                        if (sectionText) {
                            const processed = processText(sectionText);
                            prompt += processed + '\n';
                        }
                    }
                }
            } else {
                // Fallback: Simple field listing
                prompt += 'Generate the following entity details:\n\n';
                const collectedFields = genComponent.fields_collected || {};
                if (generation.fields) {
                    for (const [fieldName, fieldDef] of Object.entries(generation.fields)) {
                        if (!collectedFields[fieldName]) {
                            const key = fieldDef.key || fieldName.toUpperCase();
                            prompt += `${key}: [${fieldDef.description || fieldName}]\n`;
                        }
                    }
                }
            }

            return prompt;
        }

        // Helper: Finalize entity generation (GREEDY COMPONENT - never remove)
        function finalizeEntity(entityId, entity = null) {
            // Use provided entity or reload from storage
            if (!entity) {
                entity = ModuleAPI.get(entityId);
            }
            if (!entity?.generationwizard) return;

            const genComponent = entity.generationwizard;
            const activeGen = genComponent.activeGeneration;

            // Delete the completed generation object to save memory (but keep the component)
            if (activeGen && genComponent.generations?.[activeGen]) {
                delete genComponent.generations[activeGen];
            }

            // Set component to dormant state (component persists!)
            genComponent.state = 'dormant';
            genComponent.activeGeneration = null;

            // Clean up temporary data that's no longer needed
            if (genComponent.fields_collected) {
                delete genComponent.fields_collected;
            }
            if (genComponent.trigger) {
                delete genComponent.trigger;
            }
            // Clean up any rejected value tracking
            for (const key of Object.keys(genComponent)) {
                if (key.startsWith('rejected_')) {
                    delete genComponent[key];
                }
            }

            // Activate display when generation is complete
            if (entity.components?.includes('display')) {
                if (!entity.display) entity.display = {};
                entity.display.active = true;
            }

            // Rename entity based on USERNAME (which should be in displayname)
            const finalName = entity.info?.displayname || entity.aliases?.[0];
            if (debug) {
                console.log(`${MODULE_NAME}: Checking rename - displayname: "${entity.info?.displayname}", aliases[0]: "${entity.aliases?.[0]}", finalName: "${finalName}"`);
            }
            if (finalName && finalName !== entityId) {
                // Create renamed entity - use the displayname as-is, no transformation
                const renamedId = finalName;  // No transformation - use displayname directly
                if (renamedId !== entityId && !ModuleAPI.get(renamedId)) {
                    // Copy to new ID
                    entity.id = renamedId;
                    ModuleAPI.save(renamedId, entity);
                    // Delete old ID
                    ModuleAPI.del(entityId);
                    console.log(`${MODULE_NAME}: Renamed entity from ${entityId} to ${renamedId}`);
                    entityId = renamedId;
                }
            }

            ModuleAPI.save(entityId, entity);
            console.log(`${MODULE_NAME}: Completed generation for ${entityId}, component remains dormant`);

            // Check for any queued generators to activate next
            const queued = findQueuedGenerators();
            if (queued.length > 0) {
                console.log(`${MODULE_NAME}: Activating next queued generator: ${queued[0].entityId}`);
                setGeneratorState(queued[0].entityId, 'generating');
            }
        }


        // Register tools
        ModuleAPI.registerTool('gw_abort', function(params) {
            // Abort any active generation
            const activeGen = findActiveGenerator();
            if (activeGen) {
                setGeneratorState(activeGen.entityId, 'aborted');
                console.log(`${MODULE_NAME}: Aborted generation for ${activeGen.entityId}`);
                return 'executed';
            }
            return 'executed';
        });

        ModuleAPI.registerTool('gw_status', function(params) {
            const activeGen = findActiveGenerator();
            if (!activeGen) {
                const queued = findQueuedGenerators();
                if (queued.length > 0) {
                    console.log(`${MODULE_NAME}: ${queued.length} entities queued for generation`);
                } else {
                    console.log(`${MODULE_NAME}: GenerationWizard is idle`);
                }
            } else {
                console.log(`${MODULE_NAME}: Generating entity: ${activeGen.entityId}`);
            }
            return 'executed';
        });

        ModuleAPI.registerTool('gw_npc', function(params) {
            const [name, location] = params;

            // Generate unique ID - use provided name or create timestamp-based one
            const displayName = name || `NPC_${Date.now()}`;
            const characterId = displayName;  // Use displayName as-is, no transformation

            // Check if character already exists
            if (ModuleAPI.get(characterId)) {
                console.log(`${MODULE_NAME}: Character ${characterId} already exists`);
                return 'malformed';
            }

            // Structure data for blueprint
            const entityData = {
                id: characterId,
                info: {
                    trigger_name: displayName  // Store the trigger name that caused generation
                },
                generationwizard: {
                    trigger: displayName  // Store original name for prompt context
                }
            };

            // Add location - use provided location or player's current location
            if (location) {
                entityData.info.currentLocation = location;
            } else {
                // Try to get player's current location
                const player = ModuleAPI.get('player');
                if (player && player.info && player.info.currentLocation) {
                    entityData.info.currentLocation = player.info.currentLocation;
                    console.log(`${MODULE_NAME}: Using player's current location: ${player.info.currentLocation}`);
                }
            }

            // Instantiate from Character blueprint
            const entity = ModuleAPI.instantiateBlueprint('Character', entityData);
            if (entity) {
                console.log(`${MODULE_NAME}: Queued NPC generation for: ${characterId}`);
                return 'executed';
            }
            console.log(`${MODULE_NAME}: Failed to instantiate Character blueprint`);
            return 'malformed';
        });

        ModuleAPI.registerTool('gw_location', function(params) {
            const [name, direction] = params;

            // Generate unique ID - use provided name or create timestamp-based one
            const displayName = name || `Location_${Date.now()}`;
            const locationId = displayName;  // Use displayName as-is, no transformation

            // Check if location already exists
            if (ModuleAPI.get(locationId)) {
                console.log(`${MODULE_NAME}: Location ${locationId} already exists`);
                return 'malformed';
            }

            // Structure data for blueprint
            const entityData = {
                id: locationId,
                info: {
                    displayname: displayName,  // Set the displayname directly
                    trigger_name: displayName
                },
                generationwizard: {
                    trigger: displayName
                }
            };

            // Add connection info if direction provided
            if (direction) {
                entityData.pathways = { [direction]: 'pending' };
            }

            // Instantiate from Location blueprint
            const entity = ModuleAPI.instantiateBlueprint('Location', entityData);
            if (entity) {
                console.log(`${MODULE_NAME}: Queued location generation for: ${locationId}`);
                return 'executed';
            }
            return 'malformed';
        });

        ModuleAPI.registerTool('gw_quest', function(params) {
            const [name, typeParam] = params;

            // Generate unique ID - use provided name or create timestamp-based one
            const displayName = name || `Quest_${Date.now()}`;
            const questId = displayName;  // Use displayName as-is, no transformation

            // Check if quest already exists
            if (ModuleAPI.get(questId)) {
                console.log(`${MODULE_NAME}: Quest ${questId} already exists`);
                return 'malformed';
            }

            // Determine quest type - code decides, not user
            let questType = typeParam;
            if (!questType) {
                // Randomize quest type with weighted distribution
                const rand = Math.random();
                if (rand < 0.05) {
                    questType = "Story";        // 5% chance - Main story quests
                } else if (rand < 0.75) {
                    questType = "Side";         // 70% chance - Side quests
                } else if (rand < 0.90) {
                    questType = "Hidden";       // 15% chance - Hidden quests
                } else {
                    questType = "Raid";         // 10% chance - Raid quests
                }
                if (debug) console.log(`${MODULE_NAME}: Randomized quest type: ${questType}`);
            }

            // Structure data for blueprint
            const entityData = {
                id: questId,
                quest: {
                    type: questType
                },
                generationwizard: {
                    trigger: displayName,
                    fields_collected: {
                        type: questType  // Mark type as already collected
                    }
                }
            };

            // Instantiate from Quest blueprint
            const entity = ModuleAPI.instantiateBlueprint('Quest', entityData);
            if (entity) {
                console.log(`${MODULE_NAME}: Queued quest generation for: ${questId}`);
                return 'executed';
            }
            return 'malformed';
        });
    }
    //#endregion GenerationWizardModule

    // ========================================
    // SceneModule - Current scene card management
    // ========================================
    //#region SceneModule
    {
        const MODULE_NAME = 'SceneModule';

        function createDefaultCurrentScene() {
            // Find the first user-controlled entity
            const userControlled = ModuleAPI.queryTags('UserControlled');

            // Use first user-controlled entity name or default to 'player'
            let playerName = 'player';
            if (userControlled && userControlled.length > 0) {
                playerName = userControlled[0].id.toLowerCase();
            }

            const defaultText = (
                `[**Current Scene** Location: get(player.info.currentLocation) | get(time.formatted) (get(time.period))\n` +
                `**Available Tools:**\n` +
                `• Location: update_location(name, place) discover_location(character, place, direction) connect_locations(placeA, placeB, direction)\n` +
                `  - Directions: north, south, east, west, inside (enter), outside (exit)\n` +
                `• Time: advance_time(hours, minutes)\n` +
                `• Inventory: add_item(name, item, qty) remove_item(name, item, qty) transfer_item(giver, receiver, item, qty)\n` +
                `• Relations: update_relationship(name1, name2, points)\n` +
                `• Quests: offer_quest(npc, quest_name, type) accept_quest(name, quest_name, quest_giver, type) update_quest(name, quest_name, stage) complete_quest(name, quest_name)\n` +
                `• Progression: add_levelxp(name, amount) add_skillxp(name, skill, amount) unlock_newskill(name, skill)\n` +
                `• Stats: update_attribute(name, attribute, value) update_hp(name, current) update_max_hp(name, max)\n` +
                `• Combat: deal_damage(source, target, amount)]`
            );

            Utilities.storyCard.add({
                title: '[CURRENT SCENE]',
                type: 'data',
                entry: defaultText,
                description: 'Edit this card to customize what appears in the scene block. Use get(params) for dynamic values.',
                keys: '.,a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u,v,w,x,y,z,"'
            });

            if (MODULE_CONFIG.debug) console.log(`${MODULE_NAME}: Created default Current Scene template with player: ${playerName}`);
            return defaultText;
        }

        function moveCurrentSceneCard(contextText) {
            // Don't move scene if generation is active
            for (const [key, entity] of Object.entries(dataCache)) {
                if (entity?.generationwizard?.state === 'generating') {
                    // Generation is active, don't modify context
                    return contextText;
                }
            }

            // Get or create the Current Scene card
            let sceneCard = Utilities.storyCard.get('[CURRENT SCENE]');
            if (!sceneCard) {
                // Create the default scene card
                createDefaultCurrentScene();
                sceneCard = Utilities.storyCard.get('[CURRENT SCENE]');
            }

            // Get the scene content
            const sceneContent = sceneCard.entry;
            if (!sceneContent) {
                if (MODULE_CONFIG.debug) console.log(`${MODULE_NAME}: No scene content to move`);
                return contextText;
            }

            // Try to find the exact scene content in the context
            let sceneIndex = contextText.indexOf(sceneContent);
            let sceneToRemove = sceneContent;

            if (sceneIndex === -1) {
                // Exact match not found - try to find it by parts
                const sceneLines = sceneContent.split('\n');
                const firstLine = sceneLines[0];
                const lastLine = sceneLines[sceneLines.length - 1];

                sceneIndex = contextText.indexOf(firstLine);

                if (sceneIndex === -1) {
                    if (MODULE_CONFIG.debug) console.log(`${MODULE_NAME}: Scene not found in context at all`);
                    return contextText;
                }

                // Find where the scene ends by looking for the last line
                const endIndex = contextText.indexOf(lastLine, sceneIndex);
                if (endIndex === -1) {
                    if (MODULE_CONFIG.debug) console.log(`${MODULE_NAME}: Scene end not found, cannot move`);
                    return contextText;
                }

                // Extract what's actually in the context
                sceneToRemove = contextText.substring(sceneIndex, endIndex + lastLine.length);
            }

            // Remove the scene from its current position
            let modifiedContext = contextText.substring(0, sceneIndex) +
                                 contextText.substring(sceneIndex + sceneToRemove.length);

            // Clean up any resulting multiple newlines
            modifiedContext = modifiedContext.replace(/\n\n\n+/g, '\n\n');

            // Split context by sentences to find insertion point
            const sentences = modifiedContext.split(/(?<=[.!?])\s+/);

            // Try to place scene 6 sentences from the end - EXACTLY LIKE GAMESTATE.JS
            const sentencesFromEnd = 6;

            if (sentences.length <= sentencesFromEnd) {
                if (MODULE_CONFIG.debug) console.log(`${MODULE_NAME}: Not enough sentences (${sentences.length}), putting scene at start`);
                return sceneContent + '\n\n' + modifiedContext;
            }

            // Calculate insertion point
            const insertIndex = sentences.length - sentencesFromEnd;

            // Rebuild context with scene inserted
            const beforeSentences = sentences.slice(0, insertIndex);
            const afterSentences = sentences.slice(insertIndex);

            // Join the parts
            let result = beforeSentences.join(' ');
            if (result && !result.endsWith('\n')) {
                result += '\n\n';
            }
            result += sceneContent;
            if (afterSentences.length > 0) {
                result += '\n\n' + afterSentences.join(' ');
            }

            if (MODULE_CONFIG.debug) console.log(`${MODULE_NAME}: Positioned Current Scene 6 sentences from end`);
            return result;
        }

        // Register context hook to move scene card
        ModuleAPI.registerHook('context', function(text) {
            return moveCurrentSceneCard(text);
        });
    }
    //#endregion SceneModule

    // ========================================
    // BlueprintModule - Entity templates
    // ========================================
    //#region BlueprintModule
    {
        const MODULE_NAME = 'BlueprintModule';

        // Create default blueprints if they don't exist
        function createDefaultBlueprints() {
            const blueprints = {
                Character: {
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
                        personality: null
                    },

                    stats: {
                        level: { value: 1, xp: { current: 0, max: 500 } },
                        hp: { current: 100, max: 100 }
                    },

                    skills: {},  // Skills are added dynamically

                    attributes: {
                        STRENGTH: { value: 10 },
                        AGILITY: { value: 10 },
                        VITALITY: { value: 10 },
                        DEXTERITY: { value: 10 }
                    },

                    inventory: {},  // Items are added dynamically

                    relationships: {},  // Relationships are added dynamically
                    display: {
                        active: false,  // Will be set to true when generation completes
                        prefix: "<$# Character>",
                        sections: {
                            header: {
                                line: "nameline",
                                priority: 10,
                                template: "## **{info.displayname}**",
                                condition: "info.displayname"
                            },
                            realname: {
                                line: "nameline",
                                priority: 11,
                                template: "[{info.realname}]",
                                condition: "info.realname"
                            },
                            infoline: {
                                line: "infoline",
                                priority: 10,
                                template: "Gender: {info.gender} | Level: {stats.level.value} ({stats.level.xp.current}/{stats.level.xp.max}) | HP: {stats.hp.current}/{stats.hp.max} | Location: {info.currentLocation}",
                                condition: "info.gender"
                            },
                            attributes: {
                                line: "section",
                                priority: 20,
                                template: "**Attributes**\nVITALITY: {attributes.VITALITY.value} | STRENGTH: {attributes.STRENGTH.value} | DEXTERITY: {attributes.DEXTERITY.value} | AGILITY: {attributes.AGILITY.value}",
                                condition: "attributes"
                            },
                            appearance: {
                                line: "section",
                                priority: 30,
                                template: "**Appearance**\n{info.appearance}",
                                condition: "info.appearance"
                            },
                            personality: {
                                line: "section",
                                priority: 40,
                                template: "**Personality**\n{info.personality}",
                                condition: "info.personality"
                            },
                            background: {
                                line: "section",
                                priority: 50,
                                template: "**Background**\n{info.description}",
                                condition: "info.description"
                            },
                            skills: {
                                line: "section",
                                priority: 60,
                                template: "**Skills**\n{skills.*→ • {*}: Level {*.level} ({*.xp.current}/{*.xp.max} XP)}",
                                condition: "skills"
                            },
                            inventory: {
                                line: "section",
                                priority: 70,
                                template: "**Inventory**\n{inventory.*→ • {*} x{*.quantity}}",
                                condition: "inventory.*"
                            },
                            relationships: {
                                line: "section",
                                priority: 80,
                                template: "**Relationships**\n{relationships.*→ • {*} ({*.value}): {$relFlavor:info.displayname,*.value}}",
                                condition: "relationships.*"
                            }
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
                                        maps_to: "*.info.displayname",
                                        validation: "unique_entity_id",  // Ensure the name is unique
                                        key: "USERNAME",  // Still use USERNAME in the prompt for characters
                                        prompt: {
                                            uncollected: "USERNAME: [Create a unique username/gamertag like SwordMaster2000, DarkKnight92]",
                                            known: "Username: $(value)",
                                            priority: 10
                                        }
                                    },
                                    realname: {
                                        maps_to: "*.info.realname",
                                        key: "REALNAME",
                                        prompt: {
                                            uncollected: "REALNAME: [Their real-world name, if different from username]",
                                            known: "Real Name: $(value)",
                                            priority: 15
                                        }
                                    },
                                    gender: {
                                        maps_to: "*.info.gender",
                                        key: "GENDER",
                                        prompt: {
                                            uncollected: "GENDER: [Male/Female/Other]",
                                            known: "Gender: $(value)",
                                            priority: 20
                                        }
                                    },
                                    appearance: {
                                        maps_to: "*.info.appearance",
                                        key: "APPEARANCE",
                                        prompt: {
                                            uncollected: "APPEARANCE: [Physical characteristics only - height, build, hair, eyes, facial features, distinguishing marks. Do NOT describe clothing or equipment]",
                                            known: "Appearance: $(value)",
                                            priority: 40
                                        }
                                    },
                                    description: {
                                        maps_to: "*.info.description",
                                        key: "BACKGROUND",
                                        prompt: {
                                            uncollected: "BACKGROUND: [Their real-world life - occupation, interests. Do NOT mention SAO or why they joined]",
                                            known: "Background: $(value)",
                                            priority: 50
                                        }
                                    },
                                    personality: {
                                        maps_to: "*.info.personality",
                                        key: "PERSONALITY",
                                        prompt: {
                                            uncollected: "PERSONALITY: [Their personality traits - how they act, think, and interact with others]",
                                            known: "Personality: $(value)",
                                            priority: 55
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
                },

                Location: {
                    GameplayTags: ['Location'],
                    components: ['info', 'pathways', 'display'],
                    info: {
                        displayname: null,
                        description: null,
                        type: null,
                        danger_level: null
                    },
                    pathways: {},  // Format: { "north": { destination: "location_id", description: "optional desc" } }
                    display: {
                        active: false,  // Will be set to true when generation completes
                        prefix: "<$# World Map><$## Floor One>",
                        sections: {
                            header: {
                                line: "nameline",
                                priority: 10,
                                template: "### **{info.displayname}**",
                                condition: "info.displayname"
                            },
                            type: {
                                line: "infoline",
                                priority: 20,
                                template: "Type: {info.type}",
                                condition: "info.type"
                            },
                            danger: {
                                line: "infoline",
                                priority: 30,
                                template: "Danger: {info.danger_level}",
                                condition: "info.danger_level"
                            },
                            description: {
                                line: "section",
                                priority: 10,
                                template: "{info.description}",
                                condition: "info.description"
                            },
                            pathways: {
                                line: "section",
                                priority: 20,
                                template: "**Paths:**\n{pathways.*→ • {*}: {*.destination}}",
                                condition: "pathways.*"
                            }
                        }
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
                                    description: {
                                        maps_to: "*.info.description",
                                        required: true,
                                        key: "DESCRIPTION",
                                        prompt: {
                                            uncollected: "DESCRIPTION: [Detailed description of the location - what it looks like, sounds, smells, notable features. 2-3 sentences]",
                                            known: "Description: $(value)",
                                            priority: 20
                                        }
                                    },
                                    type: {
                                        maps_to: "*.info.type",
                                        key: "TYPE",
                                        prompt: {
                                            uncollected: "TYPE: [Town/Dungeon/Field/Safe Zone/Boss Room/Shop/etc.]",
                                            known: "Type: $(value)",
                                            priority: 40
                                        }
                                    },
                                    danger_level: {
                                        maps_to: "*.info.danger_level",
                                        key: "DANGER_LEVEL",
                                        prompt: {
                                            uncollected: "DANGER_LEVEL: [Safe/Low/Medium/High/Extreme]",
                                            known: "Danger Level: $(value)",
                                            priority: 50
                                        }
                                    },
                                    pathways: {
                                        maps_to: "*.pathways",
                                        parser: "pathways",
                                        key: "EXITS",
                                        prompt: {
                                            uncollected: "EXITS: [List available exits, one per line]\n- [Direction]: [Destination]",
                                            known: "Exits: $(value)",
                                            priority: 60
                                        }
                                    }
                                },
                                promptTemplate: {
                                    sectionOrder: ["header", "fields", "footer"],
                                    sections: {
                                        header: [
                                            {
                                                text: "=== LOCATION GENERATION SYSTEM ===",
                                                priority: 0
                                            },
                                            {
                                                text: "\nThe location \"$(trigger_name)\" needs to be generated for the game world.",
                                                priority: 1
                                            },
                                            {
                                                text: "\n==== REQUIRED LOCATION DETAILS ====\nProvide the following information:",
                                                priority: 10
                                            }
                                        ],
                                        footer: [
                                            {
                                                text: "\nCreate an immersive and atmospheric location.\nMake it feel alive and interesting to explore.\nRespond ONLY with the requested fields, each on its own line:\nKEY: value",
                                                priority: 100
                                            }
                                        ]
                                    }
                                }
                            }
                        }
                    }
                },

                Quest: {
                    GameplayTags: ['Quest'],
                    components: ['info', 'quest', 'objectives', 'rewards', 'display'],
                    info: {
                        displayname: null,
                        description: null,
                        difficulty: null,
                    },
                    quest: {
                        status: 'available',
                        giver: null,
                        location: null,
                        prerequisites: [],
                        type: null
                    },
                    objectives: {},  // Objectives added dynamically
                    rewards: {},     // Rewards added dynamically
                    display: {
                        active: false,  // Will be set to true when generation completes
                        prefix: "<$# Quests>",
                        sections: {
                            header: {
                                line: "nameline",
                                priority: 10,
                                template: "## **{info.displayname}**",
                                condition: "info.displayname"
                            },
                            status: {
                                line: "infoline",
                                priority: 10,
                                template: "Status: {quest.status}",
                                condition: "quest.status"
                            },
                            type: {
                                line: "infoline",
                                priority: 11,
                                template: "Type: {quest.type}",
                                condition: "quest.type"
                            },
                            difficulty: {
                                line: "infoline",
                                priority: 15,
                                template: "Difficulty: {info.difficulty}",
                                condition: "info.difficulty"
                            },
                            giver: {
                                line: "infoline",
                                priority: 20,
                                template: "Giver: {quest.giver}",
                                condition: "quest.giver"
                            },
                            location: {
                                line: "infoline",
                                priority: 30,
                                template: "Location: {quest.location}",
                                condition: "quest.location"
                            },
                            description: {
                                line: "section",
                                priority: 10,
                                template: "{info.description}",
                                condition: "info.description"
                            },
                            objectives: {
                                line: "section",
                                priority: 20,
                                template: "**Objectives:**\n{objectives.*→ • {*.description}}",
                                condition: "objectives.*"
                            },
                            rewards_xp: {
                                line: "section",
                                priority: 30,
                                template: "**Rewards:**\n• Experience: {rewards.xp} XP",
                                condition: "rewards.xp"
                            },
                            rewards_gold: {
                                line: "section",
                                priority: 31,
                                template: "• Gold: {rewards.gold}",
                                condition: "rewards.gold"
                            },
                            rewards_items: {
                                line: "section",
                                priority: 32,
                                template: "{rewards.items.*→ • {*} x{*.quantity}}",
                                condition: "rewards.items.*"
                            }
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
                                promptTemplate: "embedded",
                                fields: {
                                    displayname: {
                                        maps_to: "*.info.displayname",
                                        required: true,
                                        key: "TITLE",
                                        prompt: {
                                            uncollected: "TITLE: [Create an engaging quest title]",
                                            known: "Title: $(value)",
                                            priority: 10
                                        }
                                    },
                                    description: {
                                        maps_to: "*.info.description",
                                        required: true,
                                        key: "DESCRIPTION",
                                        prompt: {
                                            uncollected: "DESCRIPTION: [Detailed quest story - what needs to be done, why it matters, and any background lore. 2-3 sentences]",
                                            known: "Description: $(value)",
                                            priority: 20
                                        }
                                    },
                                    difficulty: {
                                        maps_to: "*.info.difficulty",
                                        key: "DIFFICULTY",
                                        prompt: {
                                            uncollected: "DIFFICULTY: [Easy/Medium/Hard/Legendary]",
                                            known: "Difficulty: $(value)",
                                            priority: 25
                                        }
                                    },
                                    giver: {
                                        maps_to: "*.quest.giver",
                                        key: "GIVER",
                                        prompt: {
                                            uncollected: "GIVER: [NPC name who gives this quest]",
                                            known: "Quest Giver: $(value)",
                                            priority: 40
                                        }
                                    },
                                    location: {
                                        maps_to: "*.quest.location",
                                        key: "LOCATION",
                                        prompt: {
                                            uncollected: "LOCATION: [Where this quest takes place]",
                                            known: "Location: $(value)",
                                            priority: 50
                                        }
                                    },
                                    objective_count: {
                                        source: "computed",
                                        formula: '$(type) === "Story" ? Math.floor(Math.random() * 4) + 4 : $(type) === "Side" ? Math.floor(Math.random() * 3) + 2 : $(type) === "Hidden" ? Math.floor(Math.random() * 3) + 3 : $(type) === "Raid" ? Math.floor(Math.random() * 4) + 5 : Math.floor(Math.random() * 3) + 2'
                                    },
                                    objectives: {
                                        type: "expansion",
                                        count: "$(objective_count)",
                                        template: {
                                            fieldName: "objective_{i}",
                                            maps_to: "*.objectives.objective_{i}.description",
                                            key: "OBJECTIVE_{i}",
                                            parser: "text",
                                            prompt: {
                                                uncollected: "OBJECTIVE_{i}: [Specific objective #{i} for this quest]",
                                                known: "Objective {i}: $(value)",
                                                priority: 60
                                            }
                                        }
                                    },
                                    xp_reward: {
                                        maps_to: "*.rewards.xp",
                                        parser: "number",
                                        key: "XP_REWARD",
                                        prompt: {
                                            uncollected: "XP_REWARD: [Experience points (100-5000 based on difficulty)]",
                                            known: "XP Reward: $(value)",
                                            priority: 70
                                        }
                                    },
                                    gold_reward: {
                                        maps_to: "*.rewards.gold",
                                        parser: "number",
                                        key: "GOLD_REWARD",
                                        prompt: {
                                            uncollected: "GOLD_REWARD: [Gold coins (50-2000 based on difficulty)]",
                                            known: "Gold Reward: $(value)",
                                            priority: 80
                                        }
                                    },
                                    item_rewards: {
                                        maps_to: "*.rewards.items.{item}",
                                        parser: "inventory",
                                        key: "ITEM_REWARDS",
                                        prompt: {
                                            uncollected: "ITEM_REWARDS: [Single item reward as 'item_name x quantity', or 'None']",
                                            known: "Item Rewards: $(value)",
                                            priority: 90
                                        }
                                    }
                                },
                                promptTemplate: {
                                    sectionOrder: ["header", "fields", "footer"],
                                    sections: {
                                        header: [
                                            {
                                                text: "=== QUEST GENERATION SYSTEM ===",
                                                priority: 0
                                            },
                                            {
                                                text: "\nA new quest needs to be generated for the game world.",
                                                priority: 1
                                            },
                                            {
                                                text: "\n==== REQUIRED QUEST DETAILS ====\nProvide the following information:",
                                                priority: 10
                                            }
                                        ],
                                        footer: [
                                            {
                                                text: "\nCreate an engaging quest that fits the game world.\nBalance rewards with difficulty.\nRespond ONLY with the requested fields, each on its own line:\nKEY: value",
                                                priority: 100
                                            }
                                        ]
                                    }
                                }
                            }
                        }
                    }
                }
            };

            // Create blueprint cards if they don't exist
            for (const [name, blueprint] of Object.entries(blueprints)) {
                const cardTitle = `[SANE:BP] ${name}`;
                if (!Utilities?.storyCard?.get(cardTitle)) {
                    Utilities?.storyCard?.upsert({
                        title: cardTitle,
                        value: `# ${name} Blueprint\nTemplate for creating ${name} entities`,
                        description: JSON.stringify(blueprint, null, 2),
                        type: 'blueprint'
                    });
                }
            }
        }

        // Register blueprint tools
        ModuleAPI.registerTool('create_blueprint', function(params) {
            const [name] = params;
            if (!name) return 'malformed';

            // Blueprint creation would be more complex in practice
            // This is a simplified version
            const blueprint = {
                GameplayTags: [name],
                components: ['info'],
                info: {
                    name: null,
                    description: null
                }
            };

            Utilities?.storyCard?.upsert({
                title: `[SANE:BP] ${name}`,
                value: `# ${name} Blueprint\nCustom blueprint`,
                description: JSON.stringify(blueprint, null, 2),
                type: 'blueprint'
            });

            debugLog('blueprint', `Created custom ${name} blueprint`);
            return 'executed';
        });

        ModuleAPI.registerTool('list_blueprints', function(params) {
            const blueprints = [];
            // Would need to iterate story cards to find all [SANE:BP] cards
            // For now, list the default ones
            blueprints.push('Character', 'Location', 'Quest', 'Item');
            debugLog('blueprint', `Available blueprints: ${blueprints.join(', ')}`);
            return 'executed';
        });

        // Create defaults on init
        createDefaultBlueprints();

    }
    //#endregion BlueprintModule

    // ========================================
    // CoreComponentsModule - Core schemas
    // ========================================
    //#region CoreComponentsModule
    {
        const MODULE_NAME = 'CoreComponentsModule';

        // Define core component schemas (no display rules - those belong in entity display components)
        const coreSchemas = [
            {
                name: 'info',
                schema: {
                    id: 'info',
                    defaults: {
                        name: null,
                        description: null,
                        currentLocation: null
                    }
                }
            },
            {
                name: 'display',
                schema: {
                    id: 'display',
                    defaults: {
                        active: true,
                        // Display component contains all formatting for the entity
                        // Structure: display.componentName = [{ line, priority, format, condition }]
                        // Example: display.info = [{ line: 'section', priority: 10, format: '**Description**\n{info.description}' }]
                        separators: {
                            nameline: ' ',
                            infoline: ' | ',
                            section: '\n\n',
                            footer: '\n'
                        },
                        order: ['prefixline', 'nameline', 'infoline', 'section', 'footer']
                    }
                }
            }
        ];

        // Create [SANE:S] cards for core schemas if they don't exist
        for (const { name, schema } of coreSchemas) {
            const existingCard = Utilities.storyCard.get(`[SANE:S] ${name}`);
            if (!existingCard) {
                Utilities.storyCard.upsert({
                    title: `[SANE:S] ${name}`,
                    value: `# ${name.charAt(0).toUpperCase() + name.slice(1)} Component Schema`,
                    description: JSON.stringify(schema, null, 2),
                    type: 'data'
                });
                if (debug) console.log(`${MODULE_NAME}: Created [SANE:S] ${name} Story Card`);
            }

            // Register the schema
            ModuleAPI.registerSchema(name, schema);
        }
    }
    //#endregion CoreComponentsModule

    // ========================================
    // CombatModule - Combat system
    // ========================================
    //#region CombatModule
    {
        const MODULE_NAME = 'CombatModule';

        // Combat tools
        ModuleAPI.registerTool('deal_damage', toolHelpers.createTool('deal_damage', 2, (params) => {
            const [targetName, damage] = params;

            const target = toolHelpers.getEntityOrTrack(targetName, 'deal_damage');
            if (!target) return 'executed';

            if (!target.stats || !target.stats.hp) return 'executed';

            const dmg = validators.requirePositiveNumber(damage);
            if (!dmg) {
                if (MODULE_CONFIG.debug) console.log(`[deal_damage]: Invalid damage: ${damage}`);
                return 'malformed';
            }

            const oldHp = target.stats.hp.current;
            target.stats.hp.current = Math.max(0, oldHp - dmg);

            ModuleAPI.save(targetName, target);
            if (MODULE_CONFIG.debug) console.log(`[deal_damage]: ${targetName} took ${dmg} damage (${oldHp} → ${target.stats.hp.current})`);

            return 'executed';
        }));

        // Register rewindable strategy for combat tools
        ModuleAPI.registerRewindable('deal_damage', {
            type: 'stateful',
            captureState: function(params) {
                const [targetName] = params;
                const target = ModuleAPI.get(targetName);

                if (target && target.stats && target.stats.hp) {
                    return { oldHp: target.stats.hp.current };
                }
                return {};
            },
            restoreState: function(params, state) {
                const [targetName] = params;
                const target = ModuleAPI.get(targetName);

                if (target && target.stats && target.stats.hp && state.oldHp !== undefined) {
                    target.stats.hp.current = state.oldHp;
                    ModuleAPI.save(targetName, target);
                }
            }
        });

    }
    //#endregion CombatModule

    // ========================================
    // RelationshipsModule - Relationship tracking
    // ========================================
    //#region RelationshipsModule
    {
        const MODULE_NAME = 'RelationshipsModule';

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
            // Validate inputs
            if (!fromName || !toName || typeof value !== 'number') {
                return `${fromName || 'Someone'} has an indescribable relationship with ${toName || 'someone'}`;
            }

            // Try to load thresholds from relationships schema
            let thresholds = THRESHOLDS;
            const relationshipSchema = ModuleAPI.get('schema.relationships');
            if (relationshipSchema && relationshipSchema.thresholds) {
                thresholds = relationshipSchema.thresholds;
            }

            for (const threshold of thresholds) {
                if (value >= threshold.min && value <= threshold.max) {
                    return threshold.flavor
                        .replace('{from}', fromName)
                        .replace('{to}', toName);
                }
            }
            return `${fromName} has an indescribable relationship with ${toName}`;
        }

        // Create relationships schema
        const relationshipsSchema = {
            id: 'relationships',
            defaults: {},
            thresholds: THRESHOLDS
        };

        // Create [SANE:S] relationships card if it doesn't exist
        const existingCard = Utilities.storyCard.get('[SANE:S] relationships');
        if (!existingCard) {
            Utilities.storyCard.upsert({
                title: '[SANE:S] relationships',
                value: '# Relationships Component Schema\nDefines relationship tracking with flavor text thresholds',
                description: JSON.stringify(relationshipsSchema, null, 2),
                type: 'data'
            });
            if (MODULE_CONFIG.debug) console.log(`${MODULE_NAME}: Created [SANE:S] relationships Story Card`);
        }

        // Register relationships schema
        ModuleAPI.registerSchema('relationships', relationshipsSchema);

        // Expose the function to ModuleAPI.Library
        if (!ModuleAPI.Library) ModuleAPI.Library = {};
        ModuleAPI.Library.getRelationshipFlavor = getRelationshipFlavor;

        // Relationship tools
        ModuleAPI.registerTool('update_relationship', toolHelpers.createTool('update_relationship', 3, (params) => {
            const [source, target, change] = params;

            const changeVal = validators.parseNumber(change, true);
            if (changeVal === null || changeVal === 0) {
                if (MODULE_CONFIG.debug) console.log(`[update_relationship]: Invalid change value: ${change}`);
                return 'malformed';
            }

            // Update source's relationship to target
            const sourceEntity = ModuleAPI.get(source);
            if (sourceEntity) {
                if (!sourceEntity.relationships) sourceEntity.relationships = {};
                if (!sourceEntity.relationships[target]) {
                    sourceEntity.relationships[target] = { value: 0 };
                }
                sourceEntity.relationships[target].value += changeVal;
                ModuleAPI.save(source, sourceEntity);
            }

            // Bidirectional update
            const targetEntity = ModuleAPI.get(target);
            if (targetEntity) {
                if (!targetEntity.relationships) targetEntity.relationships = {};
                if (!targetEntity.relationships[source]) {
                    targetEntity.relationships[source] = { value: 0 };
                }
                targetEntity.relationships[source].value += changeVal;
                ModuleAPI.save(target, targetEntity);
            }

            if (MODULE_CONFIG.debug) console.log(`[update_relationship]: Updated ${source} <-> ${target} by ${changeVal}`);
            return 'executed';
        }));

    }
    //#endregion RelationshipsModule

    // ========================================
    // LocationModule - Location and pathways management
    // ========================================
    //#region LocationModule
    {
        const MODULE_NAME = 'LocationModule';

        // Register pathways schema
        ModuleAPI.registerSchema('pathways', {
            id: 'pathways',
            defaults: {}  // Connections to other locations - Format: { "north": "location_id", "south": "location_id", etc. }
        });

        // Location management tools
        ModuleAPI.registerTool('update_location', function(params) {
            const [characterName, locationName] = params;

            if (!characterName || !locationName) return 'malformed';

            const charName = String(characterName).toLowerCase();
            const locName = String(locationName).toLowerCase();

            // Get character
            const character = ModuleAPI.get(charName);
            if (!character) {
                if (MODULE_CONFIG.debug) console.log(`${MODULE_NAME}: Character ${charName} not found`);
                if (ModuleAPI.trackUnknownEntity) {
                    ModuleAPI.trackUnknownEntity(charName, 'update_location');
                }
                return 'executed';
            }

            // Ensure info component exists
            if (!character.info) character.info = {};

            // Store old location for reversion
            const oldLocation = character.info.currentLocation;

            // Update character's location
            character.info.currentLocation = locName;

            // Save character
            ModuleAPI.save(charName, character);

            if (MODULE_CONFIG.debug) {
                console.log(`${MODULE_NAME}: ${character.id || charName} moved from ${oldLocation || 'nowhere'} to ${location.id || locName}`);
            }

            return 'executed';
        });

        ModuleAPI.registerTool('discover_location', function(params) {
            const [characterName, locationName, direction] = params;

            if (!characterName || !locationName) return 'malformed';

            const charName = String(characterName).toLowerCase();
            const locName = String(locationName).toLowerCase();
            const dir = direction ? String(direction).toLowerCase() : null;

            // Get character
            const character = ModuleAPI.get(charName);
            if (!character) {
                if (MODULE_CONFIG.debug) console.log(`${MODULE_NAME}: Character ${charName} not found`);
                return 'executed';
            }

            // Check if location already exists - if so, it's already discovered!
            let location = ModuleAPI.get(locName);
            if (location) {
                if (MODULE_CONFIG.debug) console.log(`${MODULE_NAME}: Location ${locName} already exists - cannot discover existing location`);
                return 'malformed';
            }

            // Create new location using blueprint
            if (MODULE_CONFIG.debug) console.log(`${MODULE_NAME}: Creating new location ${locName} using blueprint`);

            // Use instantiateBlueprint to create location with GenerationWizard support
            const locationData = {
                id: locName,
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

            const newLocationId = ModuleAPI.instantiateBlueprint('Location', locationData);
            if (newLocationId) {
                location = ModuleAPI.get(newLocationId);
            }

            // Fallback if blueprint system not available
            if (!location) {
                location = {
                    id: locName,
                    GameplayTags: ['Location'],
                    components: ['info', 'pathways', 'display'],
                    info: {
                        displayname: locName,
                        description: `A location called ${locName}`,
                        discovered: true
                    },
                    pathways: locationData.pathways || {},
                    display: { active: true }
                };
                ModuleAPI.save(locName, location);
            }

            // If direction specified and character has current location, create connection
            if (dir && character.info?.currentLocation) {
                const currentLoc = ModuleAPI.get(character.info.currentLocation);
                if (currentLoc) {
                    // Add pathway from current location to new location
                    if (!currentLoc.pathways) currentLoc.pathways = {};
                    currentLoc.pathways[dir] = { destination: locName };

                    // Save current location with new pathway
                    ModuleAPI.save(character.info.currentLocation, currentLoc);
                }
            }

            // Save location
            ModuleAPI.save(locName, location);

            if (MODULE_CONFIG.debug) {
                console.log(`${MODULE_NAME}: ${character.id || charName} discovered ${location.id || locName}${dir ? ` to the ${dir}` : ''}`);
            }

            return 'executed';
        });

        ModuleAPI.registerTool('connect_locations', function(params) {
            const [location1Name, location2Name, direction] = params;

            if (!location1Name || !location2Name) return 'malformed';

            const loc1Name = String(location1Name).toLowerCase();
            const loc2Name = String(location2Name).toLowerCase();
            const dir = direction ? String(direction).toLowerCase() : 'both';

            // Helper function to create location using blueprint
            function getOrCreateLocation(locationName) {
                let location = ModuleAPI.get(locationName);
                if (!location) {
                    if (MODULE_CONFIG.debug) console.log(`${MODULE_NAME}: Creating location ${locationName} using blueprint`);

                    // Use instantiateBlueprint to create location with GenerationWizard support
                    const locationData = {
                        id: locationName,
                        info: {
                            displayname: locationName,
                            trigger_name: locationName,
                            discovered: true
                        },
                        pathways: {}
                    };

                    const newLocationId = ModuleAPI.instantiateBlueprint('Location', locationData);
                    if (newLocationId) {
                        location = ModuleAPI.get(newLocationId);
                    }

                    // Fallback if blueprint system not available
                    if (!location) {
                        location = {
                            id: locationName,
                            GameplayTags: ['Location'],
                            components: ['info', 'pathways', 'display'],
                            info: {
                                displayname: locationName,
                                description: `A location called ${locationName}`,
                                discovered: true
                            },
                            pathways: {},
                            display: { active: true }
                        };
                        ModuleAPI.save(locationName, location);
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
            ModuleAPI.save(loc1Name, loc1);
            ModuleAPI.save(loc2Name, loc2);

            if (MODULE_CONFIG.debug) {
                if (dir === 'both') {
                    console.log(`${MODULE_NAME}: Connected ${loc1.id || loc1Name} <-> ${loc2.id || loc2Name}`);
                } else {
                    console.log(`${MODULE_NAME}: Connected ${loc1.id || loc1Name} -${dir}-> ${loc2.id || loc2Name}`);
                }
            }

            return 'executed';
        });

        // Register rewindable strategies for location tools
        ModuleAPI.registerRewindable('update_location', {
            type: 'stateful',
            captureState: function(params) {
                const [characterName] = params;
                const charName = validators.normalizeString(characterName);
                const character = ModuleAPI.get(charName);

                if (character && character.info) {
                    return { oldLocation: character.info.currentLocation };
                }
                return {};
            },
            restoreState: function(params, state) {
                const [characterName] = params;
                const charName = validators.normalizeString(characterName);
                const character = ModuleAPI.get(charName);

                if (character && character.info && state.oldLocation !== undefined) {
                    character.info.currentLocation = state.oldLocation;
                    ModuleAPI.save(charName, character);
                }
            }
        });

    }
    //#endregion LocationModule

    // ==============================
    // QuestModule
    // ==============================
    //#region QuestModule
    {
        const MODULE_NAME = 'QuestModule';

        // Register quest schema
        ModuleAPI.registerSchema('quest', {
            id: 'quest',
            defaults: {
                status: 'available',  // available, active, completed, failed, abandoned
                giver: null,
                objectives: {
                    total: 0,
                    completed: 0,
                    stages: {}  // stages.1, stages.2, etc.
                },
                rewards: {
                    xp: 0,
                    gold: 0,
                    items: {}  // { "item_name": { "quantity": N } }
                }
            }
        });

        // Register objectives schema (for non-quest entities that have objectives)
        ModuleAPI.registerSchema('objectives', {
            id: 'objectives',
            defaults: {
                total: 0,
                completed: 0,
                stages: {}  // stages.1, stages.2, etc with { description: "...", completed: false }
            }
        });

        // Register rewards schema (for non-quest entities that have rewards)
        ModuleAPI.registerSchema('rewards', {
            id: 'rewards',
            defaults: {
                xp: 0,
                gold: 0,
                items: {}  // { "item_name": { "quantity": N } }
            }
        });

        // Tool definitions
        const tools = {
            accept_quest: function(params) {
                const [characterName, questName] = params;

                if (!characterName || !questName) return 'malformed';

                const charName = String(characterName).toLowerCase();
                const quest = String(questName).toLowerCase();

                // Get character
                const character = get(charName);
                if (!character) {
                    if (ModuleAPI.trackUnknownEntity) {
                        ModuleAPI.trackUnknownEntity(charName, 'accept_quest');
                    }
                    if (MODULE_CONFIG.debug) console.log(`${MODULE_NAME}: Character ${charName} not found`);
                    return 'executed';
                }

                // Get quest entity
                const questEntity = get(quest);
                if (!questEntity) {
                    if (ModuleAPI.trackUnknownEntity) {
                        ModuleAPI.trackUnknownEntity(quest, 'accept_quest');
                    }
                    if (MODULE_CONFIG.debug) console.log(`${MODULE_NAME}: Quest ${quest} not found`);
                    return 'executed';
                }

                // Check if quest is available
                if (!questEntity.quest || questEntity.quest.status !== 'available') {
                    if (MODULE_CONFIG.debug) console.log(`${MODULE_NAME}: Quest ${quest} is not available (status: ${questEntity.quest?.status || 'no quest component'})`);
                    return 'executed';
                }

                // Update quest status
                questEntity.quest.status = 'active';

                // Link quest to character
                if (!character.quests) character.quests = {};
                character.quests[quest] = {
                    status: 'active',
                    acceptedAt: history.length
                };

                if (MODULE_CONFIG.debug) {
                    console.log(`${MODULE_NAME}: ${charName} accepted quest: ${quest}`);
                }

                // Save updates
                save(charName, character);
                save(quest, questEntity);
                return 'executed';
            },

            offer_quest: function(params) {
                const [questName, giverName] = params;

                if (!questName) return 'malformed';

                const quest = String(questName).toLowerCase();
                const giver = giverName ? String(giverName).toLowerCase() : null;

                // Get or create quest entity
                let questEntity = get(quest);
                if (!questEntity) {
                    // Create new quest entity
                    questEntity = create({
                        id: quest,
                        GameplayTags: ['Quest'],
                        components: ['info', 'quest', 'display']
                    });
                }

                // Ensure quest component exists
                if (!questEntity.quest) {
                    questEntity.quest = { ...questSchema.defaults };
                }

                // Update quest to available status
                questEntity.quest.status = 'available';
                if (giver) {
                    questEntity.quest.giver = giver;
                }

                if (MODULE_CONFIG.debug) {
                    console.log(`${MODULE_NAME}: Quest ${quest} is now available${giver ? ` from ${giver}` : ''}`);
                }

                // Save quest
                save(quest, questEntity);
                return 'executed';
            },

            update_quest: function(params) {
                const [questName, objectiveNum] = params;

                if (!questName) return 'malformed';

                const quest = String(questName).toLowerCase();
                const objNum = objectiveNum ? parseInt(objectiveNum) : 1;

                if (isNaN(objNum) || objNum < 1) {
                    if (MODULE_CONFIG.debug) console.log(`${MODULE_NAME}: Invalid objective number: ${objectiveNum}`);
                    return 'malformed';
                }

                // Get quest entity
                const questEntity = get(quest);
                if (!questEntity || !questEntity.quest) {
                    if (ModuleAPI.trackUnknownEntity) {
                        ModuleAPI.trackUnknownEntity(quest, 'update_quest');
                    }
                    if (MODULE_CONFIG.debug) console.log(`${MODULE_NAME}: Quest ${quest} not found or has no quest component`);
                    return 'executed';
                }

                // Check if quest is active
                if (questEntity.quest.status !== 'active') {
                    if (MODULE_CONFIG.debug) console.log(`${MODULE_NAME}: Quest ${quest} is not active (status: ${questEntity.quest.status})`);
                    return 'executed';
                }

                // Mark objective as completed
                if (!questEntity.quest.objectives) {
                    questEntity.quest.objectives = { total: 0, completed: 0, stages: {} };
                }

                const objectives = questEntity.quest.objectives;
                if (objectives.stages[objNum]) {
                    if (!objectives.stages[objNum].completed) {
                        objectives.stages[objNum].completed = true;
                        objectives.completed = Math.min(objectives.total, objectives.completed + 1);

                        if (MODULE_CONFIG.debug) {
                            console.log(`${MODULE_NAME}: Quest ${quest} objective ${objNum} completed (${objectives.completed}/${objectives.total})`);
                        }

                        // Check if all objectives completed
                        if (objectives.completed >= objectives.total && objectives.total > 0) {
                            if (MODULE_CONFIG.debug) {
                                console.log(`${MODULE_NAME}: Quest ${quest} all objectives completed! Use complete_quest to finish.`);
                            }
                        }
                    }
                }

                // Save quest
                save(quest, questEntity);
                return 'executed';
            },

            complete_quest: function(params) {
                const [characterName, questName] = params;

                if (!characterName || !questName) return 'malformed';

                const charName = String(characterName).toLowerCase();
                const quest = String(questName).toLowerCase();

                // Get character and quest
                const character = get(charName);
                const questEntity = get(quest);

                if (!character) {
                    if (ModuleAPI.trackUnknownEntity) {
                        ModuleAPI.trackUnknownEntity(charName, 'complete_quest');
                    }
                    if (MODULE_CONFIG.debug) console.log(`${MODULE_NAME}: Character ${charName} not found`);
                    return 'executed';
                }

                if (!questEntity || !questEntity.quest) {
                    if (ModuleAPI.trackUnknownEntity) {
                        ModuleAPI.trackUnknownEntity(quest, 'complete_quest');
                    }
                    if (MODULE_CONFIG.debug) console.log(`${MODULE_NAME}: Quest ${quest} not found`);
                    return 'executed';
                }

                // Check if quest is active
                if (questEntity.quest.status !== 'active') {
                    if (MODULE_CONFIG.debug) console.log(`${MODULE_NAME}: Quest ${quest} is not active (status: ${questEntity.quest.status})`);
                    return 'executed';
                }

                // Apply rewards
                const rewards = questEntity.quest.rewards;
                if (rewards) {
                    // Apply XP reward
                    if (rewards.xp > 0 && ModuleAPI.tools['add_levelxp']) {
                        ModuleAPI.tools['add_levelxp']([charName, rewards.xp]);
                    }

                    // Apply gold reward (if currency system exists)
                    if (rewards.gold > 0) {
                        if (!character.currency) character.currency = {};
                        character.currency.gold = (character.currency.gold || 0) + rewards.gold;
                        if (MODULE_CONFIG.debug) console.log(`${MODULE_NAME}: ${charName} received ${rewards.gold} gold`);
                    }

                    // Apply item rewards
                    if (rewards.items && Object.keys(rewards.items).length > 0) {
                        for (const itemName in rewards.items) {
                            const quantity = rewards.items[itemName].quantity || rewards.items[itemName];
                            if (ModuleAPI.tools['add_item']) {
                                ModuleAPI.tools['add_item']([charName, itemName, quantity]);
                            }
                        }
                    }
                }

                // Update quest status
                questEntity.quest.status = 'completed';

                // Update character's quest record
                if (character.quests && character.quests[quest]) {
                    character.quests[quest].status = 'completed';
                    character.quests[quest].completedAt = history.length;
                }

                if (MODULE_CONFIG.debug) {
                    console.log(`${MODULE_NAME}: ${charName} completed quest: ${quest}`);
                }

                // Save updates
                save(charName, character);
                save(quest, questEntity);
                return 'executed';
            },

            abandon_quest: function(params) {
                const [characterName, questName] = params;

                if (!characterName || !questName) return 'malformed';

                const charName = String(characterName).toLowerCase();
                const quest = String(questName).toLowerCase();

                // Get character and quest
                const character = get(charName);
                const questEntity = get(quest);

                if (!character) {
                    if (ModuleAPI.trackUnknownEntity) {
                        ModuleAPI.trackUnknownEntity(charName, 'abandon_quest');
                    }
                    if (MODULE_CONFIG.debug) console.log(`${MODULE_NAME}: Character ${charName} not found`);
                    return 'executed';
                }

                if (!questEntity || !questEntity.quest) {
                    if (ModuleAPI.trackUnknownEntity) {
                        ModuleAPI.trackUnknownEntity(quest, 'abandon_quest');
                    }
                    if (MODULE_CONFIG.debug) console.log(`${MODULE_NAME}: Quest ${quest} not found`);
                    return 'executed';
                }

                // Update quest status
                if (questEntity.quest.status === 'active') {
                    questEntity.quest.status = 'abandoned';
                }

                // Update character's quest record
                if (character.quests && character.quests[quest]) {
                    character.quests[quest].status = 'abandoned';
                    character.quests[quest].abandonedAt = history.length;
                }

                if (MODULE_CONFIG.debug) {
                    console.log(`${MODULE_NAME}: ${charName} abandoned quest: ${quest}`);
                }

                // Save updates
                save(charName, character);
                save(quest, questEntity);
                return 'executed';
            }
        };

        // Register all tools
        Object.entries(tools).forEach(([name, fn]) => {
            ModuleAPI.registerTool(name, fn);
        });

    }
    //#endregion QuestModule

    // ==============================
    // TimeModule
    // ==============================
    //#region TimeModule
    {
        const MODULE_NAME = 'TimeModule';

        // Tools that interface with Calendar module if available
        const tools = {
            advance_time: function(params) {
                // Check if Calendar is available
                if (typeof Calendar === 'undefined' || !Calendar) {
                    if (MODULE_CONFIG.debug) console.log(`${MODULE_NAME}: Calendar module not available`);
                    return 'executed';
                }

                const [hours, minutes] = params;

                if (hours === undefined && minutes === undefined) return 'malformed';

                // Parse time values
                const hoursInt = parseInt(hours) || 0;
                const minutesInt = parseInt(minutes) || 0;

                if (hoursInt < 0 || minutesInt < 0) {
                    if (MODULE_CONFIG.debug) console.log(`${MODULE_NAME}: Cannot advance negative time`);
                    return 'malformed';
                }

                if (hoursInt === 0 && minutesInt === 0) {
                    if (MODULE_CONFIG.debug) console.log(`${MODULE_NAME}: No time to advance`);
                    return 'malformed';
                }

                try {
                    // Build time string for Calendar
                    let timeStr = '';
                    if (hoursInt > 0) timeStr += `${hoursInt}h`;
                    if (minutesInt > 0) {
                        if (timeStr) timeStr += ' ';
                        timeStr += `${minutesInt}m`;
                    }

                    // Use Calendar's advance function if available
                    if (Calendar.advanceTime) {
                        const oldTime = Calendar.getCurrentTime ? Calendar.getCurrentTime() : 'unknown';
                        Calendar.advanceTime(timeStr);
                        const newTime = Calendar.getCurrentTime ? Calendar.getCurrentTime() : 'unknown';

                        if (MODULE_CONFIG.debug) {
                            console.log(`${MODULE_NAME}: Advanced time by ${timeStr} (${oldTime} -> ${newTime})`);
                        }
                    } else {
                        if (MODULE_CONFIG.debug) console.log(`${MODULE_NAME}: Calendar.advanceTime not available`);
                    }

                    return 'executed';
                } catch (e) {
                    if (MODULE_CONFIG.debug) console.log(`${MODULE_NAME}: Error advancing time: ${e.message}`);
                    return 'malformed';
                }
            }
        };

        // Register all tools
        Object.entries(tools).forEach(([name, fn]) => {
            ModuleAPI.registerTool(name, fn);
        });

    }
    //#endregion TimeModule

    // ========================================
    // EntityTrackerModule - Unknown entity tracking and auto-generation
    // ========================================
    //#region EntityTrackerModule
    {
        const MODULE_NAME = 'EntityTrackerModule';

        // Module configuration
        const config = {
            threshold: 3,      // Default threshold for auto-generation
            autoGenerate: true // Whether to auto-generate entities
        };

        // Tracking data
        const trackerData = {
            unknown: {},       // Track entities referenced but not found
            unknownTools: {},  // Track unknown tools from AI
            queue: []         // Queue for entities pending generation
        };

        // Load configuration from Story Card
        function loadTrackerConfig() {
            const trackerCard = Utilities.storyCard.get('[SANE:C] Entity Tracker');
            if (trackerCard && trackerCard.description) {
                try {
                    const loadedConfig = JSON.parse(trackerCard.description || '{}');
                    config.threshold = loadedConfig.threshold || 3;
                    config.autoGenerate = loadedConfig.autoGenerate !== false;
                    debugLog('tracker', `Config loaded: threshold=${config.threshold}, autoGenerate=${config.autoGenerate}`);
                } catch (e) {
                    debugLog('tracker', `Error loading config: ${e.message}`);
                }
            }
        }

        // Load queue from Story Card
        function loadTrackerQueue() {
            const queueCard = Utilities.storyCard.get('[SANE:C] Entity Queue');
            if (queueCard && queueCard.description) {
                try {
                    const queueData = JSON.parse(queueCard.description || '{}');
                    trackerData.queue = queueData.queue || [];
                    trackerData.unknown = queueData.unknown || {};
                    if (trackerData.queue.length > 0) {
                        debugLog('tracker', `Loaded entity queue: ${trackerData.queue.length} pending`);
                    }
                } catch (e) {
                    debugLog('tracker', `Error loading queue: ${e.message}`);
                }
            }
        }

        // Save queue to Story Card
        function saveEntityQueue() {
            const queueData = {
                queue: trackerData.queue,
                unknown: trackerData.unknown
            };

            Utilities.storyCard.upsert({
                title: '[SANE:C] Entity Queue',
                value: '# Entity Generation Queue',
                description: JSON.stringify(queueData),
                type: 'data'
            });
        }

        // Track unknown entity
        function trackUnknownEntity(entityName, toolName, turnNumber) {
            if (!entityName) return;

            const normalizedName = normalizeEntityId(entityName);

            // Check if entity exists
            if (dataCache[normalizedName] || loadEntityFromCache(normalizedName)) {
                return;  // Entity exists, no need to track
            }

            // Track the unknown entity
            if (!trackerData.unknown[normalizedName]) {
                trackerData.unknown[normalizedName] = {
                    name: entityName,  // Preserve original case
                    tools: {},
                    firstSeen: turnNumber || history.length,
                    count: 0
                };
            }

            const tracker = trackerData.unknown[normalizedName];
            tracker.count++;

            // Track which tools referenced this entity
            if (toolName) {
                tracker.tools[toolName] = (tracker.tools[toolName] || 0) + 1;
            }

            // Check if entity should be queued for generation
            if (tracker.count >= config.threshold && !trackerData.queue.includes(normalizedName)) {
                trackerData.queue.push(normalizedName);
                debugLog('tracker', `Entity '${entityName}' queued for generation (count: ${tracker.count})`);

                // Save queue to Story Card
                saveEntityQueue();
            }
        }

        // Track unknown tool
        function trackUnknownTool(toolName) {
            if (!toolName) return;

            const normalizedName = validators.normalizeString(toolName);
            trackerData.unknownTools[normalizedName] = (trackerData.unknownTools[normalizedName] || 0) + 1;
            debugLog('tracker', `Unknown tool '${normalizedName}' tracked (count: ${trackerData.unknownTools[normalizedName]})`);
        }

        // Get next entity from queue
        function getNextQueuedEntity() {
            if (trackerData.queue.length === 0) return null;
            return trackerData.queue[0];
        }

        // Remove entity from queue
        function removeFromQueue(entityName) {
            const normalizedName = normalizeEntityId(entityName);
            const index = trackerData.queue.indexOf(normalizedName);
            if (index !== -1) {
                trackerData.queue.splice(index, 1);
                saveEntityQueue();
                debugLog('tracker', `Entity '${entityName}' removed from queue`);
            }
        }

        // Clear tracking data for entity
        function clearEntityTracking(entityName) {
            const normalizedName = normalizeEntityId(entityName);
            delete trackerData.unknown[normalizedName];
            removeFromQueue(entityName);
        }

        // Register API functions
        ModuleAPI.registerAPI('trackUnknownEntity', trackUnknownEntity);
        ModuleAPI.registerAPI('trackUnknownTool', trackUnknownTool);
        ModuleAPI.registerAPI('getEntityTrackerData', () => trackerData);
        ModuleAPI.registerAPI('getEntityTrackerConfig', () => config);
        ModuleAPI.registerAPI('getNextQueuedEntity', getNextQueuedEntity);
        ModuleAPI.registerAPI('removeFromQueue', removeFromQueue);
        ModuleAPI.registerAPI('clearEntityTracking', clearEntityTracking);

        // Initialize on context hook
        ModuleAPI.registerHook('context', function(text) {
            // Load configuration once per turn
            if (!trackerData.initialized) {
                loadTrackerConfig();
                loadTrackerQueue();
                trackerData.initialized = true;
            }
            return text;
        });

        // Expose legacy entityTracker object for compatibility
        // This maintains backward compatibility with existing code
        Object.defineProperty(entityTracker, 'unknown', {
            get: () => trackerData.unknown,
            set: (val) => { trackerData.unknown = val; }
        });
        Object.defineProperty(entityTracker, 'unknownTools', {
            get: () => trackerData.unknownTools,
            set: (val) => { trackerData.unknownTools = val; }
        });
        Object.defineProperty(entityTracker, 'queue', {
            get: () => trackerData.queue,
            set: (val) => { trackerData.queue = val; }
        });
        Object.defineProperty(entityTracker, 'threshold', {
            get: () => config.threshold,
            set: (val) => { config.threshold = val; }
        });
        Object.defineProperty(entityTracker, 'autoGenerate', {
            get: () => config.autoGenerate,
            set: (val) => { config.autoGenerate = val; }
        });

    }
    //#endregion EntityTrackerModule

    // ==============================
    // RewindModule - Full rewind system with multi-card storage
    // ==============================
    //#region RewindModule
    {
        const MODULE_NAME = 'RewindModule';

        // Rewind system to track and revert tool actions
        const RewindSystem = {
            STORAGE_CARD_PREFIX: '[GS_REWIND] History',  // Keep GS prefix for compatibility
            MAX_HISTORY: 100,  // Store all 100 entries
            MAX_REWIND: 99,    // Can rewind 99 (need 1 for verification)
            MAX_CARD_SIZE: 9000, // Max characters per card

            // Get all rewind cards
            getAllCards: function() {
                const cards = [];
                let cardNum = 1;

                while (true) {
                    const cardTitle = cardNum === 1
                        ? RewindSystem.STORAGE_CARD_PREFIX
                        : `${RewindSystem.STORAGE_CARD_PREFIX} ${cardNum}`;

                    const card = Utilities.storyCard.get(cardTitle);
                    if (!card) break;

                    try {
                        cards.push({
                            title: cardTitle,
                            data: JSON.parse(card.description || '{"entries":[]}')
                        });
                    } catch(e) {
                        if (MODULE_CONFIG.debug) console.log(`${MODULE_NAME}: Failed to parse card ${cardTitle}: ${e}`);
                    }
                    cardNum++;
                }

                return cards;
            },

            // Get merged storage from all cards
            getStorage: function() {
                const cards = RewindSystem.getAllCards();

                if (cards.length === 0) {
                    // Create first card
                    const firstTitle = RewindSystem.STORAGE_CARD_PREFIX;
                    Utilities.storyCard.add({
                        title: firstTitle,
                        value: '# Rewind System Data\nTracks tool execution history for state consistency.',
                        description: JSON.stringify({
                            entries: [],
                            position: -1
                        }),
                        type: 'data'
                    });
                    return { entries: [], position: -1 };
                }

                // Merge all entries from all cards
                let allEntries = [];
                let position = -1;

                for (const card of cards) {
                    allEntries = allEntries.concat(card.data.entries || []);
                    if (card.data.position !== undefined && card.data.position > position) {
                        position = card.data.position;
                    }
                }

                return { entries: allEntries, position: position };
            },

            // Save storage across multiple cards
            saveStorage: function(data) {
                // Ensure we don't exceed max history
                if (data.entries.length > RewindSystem.MAX_HISTORY) {
                    data.entries = data.entries.slice(-RewindSystem.MAX_HISTORY);
                }

                // Check for suspicious data loss or hash mismatches
                const existingData = RewindSystem.getStorage();
                let shouldBackup = false;
                let backupReason = '';

                // Check if we're losing significant data
                if (existingData.entries.length > 50 && data.entries.length < existingData.entries.length * 0.5) {
                    shouldBackup = true;
                    backupReason = `Data loss detected: ${existingData.entries.length} -> ${data.entries.length} entries`;
                }

                // Create backup if needed
                if (shouldBackup) {
                    const backupTitle = `[GS_REWIND] Backup ${Date.now()}`;
                    Utilities.storyCard.add({
                        title: backupTitle,
                        value: `# Rewind Backup\nReason: ${backupReason}`,
                        description: JSON.stringify(existingData),
                        type: 'data'
                    });
                    if (MODULE_CONFIG.debug) console.log(`${MODULE_NAME}: Created backup: ${backupReason}`);
                }

                // Split entries across multiple cards if needed
                const cardsToSave = [];
                let currentCard = { entries: [], position: data.position };
                let currentSize = 0;

                for (const entry of data.entries) {
                    const entrySize = JSON.stringify(entry).length;

                    if (currentSize + entrySize > RewindSystem.MAX_CARD_SIZE && currentCard.entries.length > 0) {
                        // Save current card and start new one
                        cardsToSave.push({...currentCard});
                        currentCard = { entries: [], position: data.position };
                        currentSize = 0;
                    }

                    currentCard.entries.push(entry);
                    currentSize += entrySize;
                }

                // Add the last card
                if (currentCard.entries.length > 0) {
                    cardsToSave.push(currentCard);
                }

                // Update or create cards using upsert
                for (let i = 0; i < cardsToSave.length; i++) {
                    const cardTitle = i === 0
                        ? RewindSystem.STORAGE_CARD_PREFIX
                        : `${RewindSystem.STORAGE_CARD_PREFIX} ${i + 1}`;

                    Utilities.storyCard.upsert({
                        title: cardTitle,
                        value: `# Rewind System Data - Part ${i + 1}/${cardsToSave.length}\nTracks tool execution history.`,
                        description: JSON.stringify(cardsToSave[i]),
                        type: 'data'
                    });
                }

                // Remove any extra cards that are no longer needed
                let cardNum = cardsToSave.length + 1;
                while (true) {
                    const cardTitle = cardNum === 1
                        ? RewindSystem.STORAGE_CARD_PREFIX
                        : `${RewindSystem.STORAGE_CARD_PREFIX} ${cardNum}`;

                    if (!Utilities.storyCard.get(cardTitle)) break;
                    Utilities.storyCard.remove(cardTitle);
                    cardNum++;
                }
            },

            // Quick hash function for text comparison
            quickHash: function(text) {
                if (!text) return '';
                let hash = 0;
                for (let i = 0; i < text.length; i++) {
                    const char = text.charCodeAt(i);
                    hash = ((hash << 5) - hash) + char;
                    hash = hash & hash;
                }
                return hash.toString(36);
            },

            // Verify position using hash
            verifyPosition: function(expectedHash) {
                const data = RewindSystem.getStorage();
                const currentEntry = data.entries[data.position];

                if (!currentEntry || currentEntry.h !== expectedHash) {
                    if (MODULE_CONFIG.debug) {
                        console.log(`${MODULE_NAME}: Hash mismatch at position ${data.position}`);
                        console.log(`Expected: ${expectedHash}, Found: ${currentEntry ? currentEntry.h : 'none'}`);
                    }
                    return false;
                }
                return true;
            },

            // Find position by hash
            findPositionByHash: function(targetHash) {
                const data = RewindSystem.getStorage();

                // Search backwards from current position
                for (let i = data.position; i >= 0; i--) {
                    if (data.entries[i] && data.entries[i].h === targetHash) {
                        return i;
                    }
                }

                // Search forward if not found backwards
                for (let i = data.position + 1; i < data.entries.length; i++) {
                    if (data.entries[i] && data.entries[i].h === targetHash) {
                        return i;
                    }
                }

                return -1;
            },

            // Record action at position with automatic positioning
            recordAction: function(text, tools, hash = null) {
                const data = RewindSystem.getStorage();

                // Use provided hash or calculate it
                if (!hash) {
                    hash = RewindSystem.quickHash(text);
                }

                // Position is based on history length
                const position = Math.min(history.length - 1, RewindSystem.MAX_HISTORY - 1);

                // Check for duplicate hash
                if (position > 0 && data.entries[position - 1]) {
                    const prevEntry = data.entries[position - 1];
                    if (prevEntry.h === hash) {
                        // Duplicate hash, skip recording
                        if (MODULE_CONFIG.debug) {
                            console.log(`${MODULE_NAME}: Duplicate hash detected at position ${position}, skipping`);
                        }
                        return;
                    }
                }

                // Store the action
                data.entries[position] = {
                    h: hash,
                    t: tools || []
                };

                data.position = position;
                RewindSystem.saveStorage(data);

                if (MODULE_CONFIG.debug) {
                    console.log(`${MODULE_NAME}: Recorded action at position ${position} (hash: ${hash.substring(0, 8)})`);
                }
            },

            // Get entries for rewind
            getEntriesForRewind: function(targetPosition) {
                const data = RewindSystem.getStorage();

                if (targetPosition < 0 || targetPosition >= data.entries.length) {
                    return null;
                }

                // Get all entries from target to current position
                const entriesToRevert = [];
                for (let i = data.position; i > targetPosition; i--) {
                    if (data.entries[i] && data.entries[i].t) {
                        entriesToRevert.push({
                            position: i,
                            tools: data.entries[i].t
                        });
                    }
                }

                return entriesToRevert;
            },

            // Revert tools for a rewind
            revertTools: function(tools) {
                if (!tools || tools.length === 0) return;

                // Revert tools in reverse order
                for (let i = tools.length - 1; i >= 0; i--) {
                    const toolData = tools[i];
                    if (!toolData) continue;

                    const [toolName, params, revertData] = toolData;

                    // If we have revert data, use it to restore original values
                    if (revertData && Object.keys(revertData).length > 0) {
                        RewindSystem.applyRevertData(toolName, params, revertData);
                    } else {
                        // Fall back to inverse operations
                        switch(toolName) {
                            case 'add_item':
                                if (ModuleAPI.tools['add_item'] && params && params[2]) {
                                    // Subtract the quantity that was added
                                    ModuleAPI.tools['add_item']([params[0], params[1], -params[2]]);
                                }
                                break;
                            case 'remove_item':
                                if (ModuleAPI.tools['add_item'] && params) {
                                    ModuleAPI.tools['add_item'](params);
                                }
                                break;
                            case 'add_levelxp':
                                // Revert by subtracting the XP
                                if (params && params[1] && ModuleAPI.tools['add_levelxp']) {
                                    ModuleAPI.tools['add_levelxp']([params[0], -params[1]]);
                                }
                                break;
                            case 'add_skillxp':
                                // Revert by subtracting the XP
                                if (params && params[2] && ModuleAPI.tools['add_skillxp']) {
                                    ModuleAPI.tools['add_skillxp']([params[0], params[1], -params[2]]);
                                }
                                break;
                            case 'deal_damage':
                                // Cannot revert damage without heal_damage tool
                                if (MODULE_CONFIG.debug) console.log(`${MODULE_NAME}: Cannot revert damage (heal_damage tool removed)`);
                                break;
                            default:
                                if (MODULE_CONFIG.debug) console.log(`${MODULE_NAME}: Cannot revert tool: ${toolName}`);
                        }
                    }
                }
            },

            // Perform rewind to target position
            rewind: function(targetPosition) {
                const entriesToRevert = RewindSystem.getEntriesForRewind(targetPosition);

                if (!entriesToRevert) {
                    if (MODULE_CONFIG.debug) console.log(`${MODULE_NAME}: Invalid rewind position: ${targetPosition}`);
                    return false;
                }

                // Revert all tools from current to target position
                for (const entry of entriesToRevert) {
                    RewindSystem.revertTools(entry.tools);
                    if (MODULE_CONFIG.debug) console.log(`${MODULE_NAME}: Reverted tools at position ${entry.position}`);
                }

                // Update position
                const data = RewindSystem.getStorage();
                data.position = targetPosition;
                RewindSystem.saveStorage(data);

                if (MODULE_CONFIG.debug) console.log(`${MODULE_NAME}: Rewound to position ${targetPosition}`);
                return true;
            },

            // Find current position by matching history
            findCurrentPosition: function() {
                const data = RewindSystem.getStorage();
                if (!history || history.length === 0) {
                    if (MODULE_CONFIG.debug) console.log(`${MODULE_NAME}: No history available`);
                    return { matched: false, position: -1 };
                }

                if (data.entries.length === 0) {
                    if (MODULE_CONFIG.debug) console.log(`${MODULE_NAME}: No stored entries yet`);
                    return { matched: false, position: -1 };
                }

                // First try to match based on stored position
                const expectedPosition = Math.min(history.length - 1, data.entries.length - 1);

                // Verify by checking the last few hashes
                const checkCount = Math.min(3, history.length, data.entries.length);
                let verified = true;

                for (let i = 0; i < checkCount; i++) {
                    const historyIndex = history.length - 1 - i;
                    const dataIndex = expectedPosition - i;

                    if (historyIndex >= 0 && dataIndex >= 0) {
                        const historyHash = RewindSystem.quickHash(history[historyIndex].text);
                        const storedHash = data.entries[dataIndex].h;

                        if (historyHash !== storedHash) {
                            verified = false;
                            break;
                        }
                    }
                }

                if (verified) {
                    if (MODULE_CONFIG.debug) console.log(`${MODULE_NAME}: Found current position: ${expectedPosition}`);
                    return { matched: true, position: expectedPosition };
                }

                if (MODULE_CONFIG.debug) console.log(`${MODULE_NAME}: Could not verify position`);
                return { matched: false, position: -1 };
            },

            // Detect if history was edited
            detectEdit: function() {
                const data = RewindSystem.getStorage();
                const position = RewindSystem.findCurrentPosition();

                if (!position.matched) {
                    // Can't determine position - possible major edit
                    return { edited: true, position: 0, confidence: 'low' };
                }

                // Check if all hashes match up to current position
                const currentHashes = history.map(h => RewindSystem.quickHash(h.text));

                for (let i = 0; i < Math.min(currentHashes.length, data.entries.length); i++) {
                    if (currentHashes[i] !== data.entries[i].h) {
                        return { edited: true, position: i, confidence: 'high' };
                    }
                }

                return { edited: false };
            },

            // Rehash from a certain position forward (after edit)
            rehashFrom: function(position) {
                const data = RewindSystem.getStorage();

                // When an edit is detected, everything after the edit point is invalid
                if (position < data.entries.length) {
                    // Keep entries up to AND including the edit position
                    data.entries = data.entries.slice(0, position + 1);

                    // Update position to match current history length
                    data.position = Math.min(position, history.length - 1);

                    if (MODULE_CONFIG.debug) console.log(`${MODULE_NAME}: Discarded entries after position ${position}`);
                }

                // Now rehash the current history entries from the edit point forward
                for (let i = position; i < history.length; i++) {
                    const newHash = RewindSystem.quickHash(history[i].text);

                    // If this position exists in our data, update its hash
                    if (i < data.entries.length) {
                        data.entries[i].h = newHash;
                    }
                }

                RewindSystem.saveStorage(data);
                if (MODULE_CONFIG.debug) console.log(`${MODULE_NAME}: Rehashed from position ${position}`);
            },

            // Capture revert data before executing a tool
            captureRevertData: function(toolName, params) {
                const normalizedTool = toolName.toLowerCase();
                const strategy = ModuleAPI.rewindableTools[normalizedTool];

                if (!strategy) {
                    // Tool is not registered as rewindable
                    return {};
                }

                // Handle based on strategy type
                if (strategy.type === 'stateful' && strategy.captureState) {
                    // Capture state using tool-specific logic
                    return strategy.captureState(params);
                } else if (strategy.type === 'inverse') {
                    // Inverse operations don't need state capture
                    return {};
                }

                return {};
            },

            // Apply revert data to restore original state
            applyRevertData: function(toolName, params, revertData) {
                const normalizedTool = toolName.toLowerCase();
                const strategy = ModuleAPI.rewindableTools[normalizedTool];

                if (!strategy) {
                    // Tool is not registered as rewindable
                    if (MODULE_CONFIG.debug) {
                        console.log(`${MODULE_NAME}: Tool ${normalizedTool} is not registered as rewindable`);
                    }
                    return;
                }

                // Handle based on strategy type
                if (strategy.type === 'inverse' && strategy.getInverse) {
                    // Execute inverse operation
                    const inverseOp = strategy.getInverse(params, revertData);
                    if (inverseOp) {
                        const [inverseTool, inverseParams] = inverseOp;
                        const result = ModuleAPI.processTool(inverseTool, inverseParams);
                        if (MODULE_CONFIG.debug) {
                            console.log(`${MODULE_NAME}: Applied inverse operation ${inverseTool} with result: ${result}`);
                        }
                    }
                } else if (strategy.type === 'stateful' && strategy.restoreState) {
                    // Restore captured state
                    strategy.restoreState(params, revertData);
                    if (MODULE_CONFIG.debug) {
                        console.log(`${MODULE_NAME}: Restored state for ${normalizedTool}`);
                    }
                } else {
                    if (MODULE_CONFIG.debug) {
                        console.log(`${MODULE_NAME}: Unknown strategy type for ${normalizedTool}`);
                    }
                }
            },

            // Extract and execute tools from text
            extractAndExecuteTools: function(text) {
                const executedTools = [];
                if (!text) return executedTools;

                // Parse tool calls from text
                const toolCalls = ModuleAPI.parseToolCall(text);

                // Execute each tool and track successful executions
                for (const toolCall of toolCalls) {
                    // Capture revert data BEFORE executing the tool
                    const revertData = RewindSystem.captureRevertData(toolCall.name, toolCall.params);

                    const result = ModuleAPI.processTool(toolCall.name, toolCall.params, 'rewind');

                    // Only track if successfully executed (not malformed or unknown)
                    if (result === 'executed') {
                        executedTools.push([
                            toolCall.name,
                            toolCall.params,
                            revertData  // Store revert data with the tool
                        ]);

                        if (MODULE_CONFIG.debug) {
                            console.log(`${MODULE_NAME}: Executed ${toolCall.name} during rewind`);
                        }
                    }
                }

                return executedTools;
            },

            // Handle context updates (check for edits and rewinds)
            handleContext: function() {
                // Check if history is available
                if (typeof history === 'undefined' || !history) {
                    if (MODULE_CONFIG.debug) console.log(`${MODULE_NAME}: History not available in context`);
                    return;
                }

                const data = RewindSystem.getStorage();
                const historyLength = history.length;
                const oldLength = data.entries.length;
                const oldPosition = data.position || -1;  // Track our last known position

                // Detect if history array has shifted (when at max capacity)
                let shifted = false;
                if (historyLength === 100 && oldLength >= 100) {
                    // Check if the entries have shifted by comparing a few positions
                    if (history[0] && data.entries[0]) {
                        const historyHash = RewindSystem.quickHash(history[0].text);
                        if (data.entries[0].h !== historyHash) {
                            shifted = true;
                            if (MODULE_CONFIG.debug) console.log(`${MODULE_NAME}: History array shifted - realigning entries`);
                        }
                    }
                }

                // If shifted, remove the oldest entry from our data
                if (shifted) {
                    data.entries.shift();
                }

                // Track new entries but DON'T execute tools (assume already executed)
                // Only truly new entries at the very end should execute

                for (let i = data.entries.length; i < historyLength; i++) {
                    const historyEntry = history[i];
                    if (!historyEntry || !historyEntry.text) {
                        data.entries[i] = null;
                        continue;
                    }

                    const hash = RewindSystem.quickHash(historyEntry.text);

                    // Check if this is the LAST entry in the history (genuinely new)
                    // All other entries are assumed to be restored/already executed
                    if (i === historyLength - 1 && i > oldPosition) {
                        // This is the newest entry and it's beyond our last position - execute tools
                        if (MODULE_CONFIG.debug) console.log(`${MODULE_NAME}: Processing genuinely new entry at position ${i}`);
                        const tools = RewindSystem.extractAndExecuteTools(historyEntry.text);
                        data.entries[i] = {
                            h: hash,
                            t: tools,
                            rd: {} // Revert data would be populated if we captured it
                        };

                    } else {
                        // This is either:
                        // 1. A restored entry from history (middle entries)
                        // 2. Not beyond our last known position
                        // Just track hash and tools, don't execute
                        if (MODULE_CONFIG.debug) console.log(`${MODULE_NAME}: Tracking entry at position ${i} without execution (restored or old)`);

                        // Extract tools without executing them (for tracking purposes)
                        const toolMatches = [];
                        const TOOL_PATTERN = /([a-z_]+)\s*\(([^)]*)\)/g;
                        let match;
                        while ((match = TOOL_PATTERN.exec(historyEntry.text)) !== null) {
                            const toolName = match[1];
                            const paramString = match[2];
                            const params = paramString ? paramString.split(',').map(p => p.trim()) : [];
                            toolMatches.push([toolName, params, {}]);
                        }

                        data.entries[i] = {
                            h: hash,
                            t: toolMatches  // Tools tracked but not executed
                        };
                    }
                }

                // Verify existing entries haven't been edited
                const checkLength = Math.min(data.entries.length, historyLength);
                let editedPosition = -1;

                // First, find if any entry was edited
                for (let i = 0; i < checkLength; i++) {
                    if (!history[i] || !data.entries[i]) continue;

                    const historyHash = RewindSystem.quickHash(history[i].text);

                    if (data.entries[i].h !== historyHash) {
                        editedPosition = i;
                        if (MODULE_CONFIG.debug) console.log(`${MODULE_NAME}: History entry ${i} was edited - will revert from current back to ${i}, then replay`);
                        break;
                    }
                }

                // If an edit was found, revert everything from current position back to AND INCLUDING the edit
                if (editedPosition >= 0) {
                    // Step 1: Revert ALL tools from current position back to AND INCLUDING edited position (reverse order)
                    for (let i = checkLength - 1; i >= editedPosition; i--) {
                        if (!data.entries[i]) continue;

                        const oldTools = data.entries[i].t || [];
                        // Revert tools in reverse order
                        RewindSystem.revertTools(oldTools);
                        if (MODULE_CONFIG.debug) console.log(`${MODULE_NAME}: Reverted tools at position ${i}`);
                    }

                    // Step 2: Re-execute ALL tools from edited position to current position (forward order)
                    for (let i = editedPosition; i < checkLength; i++) {
                        if (!history[i]) continue;

                        const historyHash = RewindSystem.quickHash(history[i].text);
                        const tools = RewindSystem.extractAndExecuteTools(history[i].text);

                        // Update the stored entry with new hash and tool data
                        data.entries[i] = {
                            h: historyHash,
                            t: tools
                        };

                        if (MODULE_CONFIG.debug && tools.length > 0) {
                            console.log(`${MODULE_NAME}: Re-executed entry ${i} with ${tools.length} tools`);
                        }
                    }
                }

                // Update position
                data.position = historyLength - 1;
                RewindSystem.saveStorage(data);
            }
        };

        // Tools for manual rewind operations
        const tools = {
            rewind_to_position: function(params) {
                const [position] = params;

                if (position === undefined) return 'malformed';

                const targetPos = parseInt(position);
                if (isNaN(targetPos) || targetPos < 0 || targetPos >= RewindSystem.MAX_HISTORY) {
                    if (MODULE_CONFIG.debug) console.log(`${MODULE_NAME}: Invalid position: ${position}`);
                    return 'malformed';
                }

                if (RewindSystem.rewind(targetPos)) {
                    return 'executed';
                } else {
                    return 'malformed';
                }
            },

            rewind_steps: function(params) {
                const [steps] = params;

                if (steps === undefined) return 'malformed';

                const numSteps = parseInt(steps);
                if (isNaN(numSteps) || numSteps <= 0) {
                    if (MODULE_CONFIG.debug) console.log(`${MODULE_NAME}: Invalid steps: ${steps}`);
                    return 'malformed';
                }

                const data = RewindSystem.getStorage();
                const targetPos = Math.max(0, data.position - numSteps);

                if (RewindSystem.rewind(targetPos)) {
                    return 'executed';
                } else {
                    return 'malformed';
                }
            },

            get_rewind_position: function(params) {
                const data = RewindSystem.getStorage();
                console.log(`${MODULE_NAME}: Current rewind position: ${data.position}/${data.entries.length - 1}`);
                return 'executed';
            }
        };

        // Register all tools
        Object.entries(tools).forEach(([name, fn]) => {
            ModuleAPI.registerTool(name, fn);
        });

        // Export RewindSystem for use by other modules
        ModuleAPI.RewindSystem = RewindSystem;
        ModuleAPI.registerAPI('RewindSystem', RewindSystem);

        // The main output hook will handle recording actions with executed tools
        // Position tracking happens in context hook via handleContext, not in input

    }
    //#endregion RewindModule

    // ======== END OF MODULES ========

    //#endregion SECTION 5

    // ========================================
    // SECTION 6: TOOL PROCESSING
    // ========================================
    //#region SECTION 6

    function processTool(toolName, params, source = 'unknown') {
        // Normalize tool name (snake_case)
        const normalizedName = toolName.toLowerCase().replace(/\s+/g, '_');

        // Check registered tools first
        const tool = tools[normalizedName] || runtimeTools[normalizedName];
        if (!tool) {
            // Check dynamic/generated tools
            if (normalizedName.startsWith('get_')) {
                // Dynamic getter tool for debugging
                const path = normalizedName.substring(4).replace(/_/g, '.');
                const value = get(path);
                if (value !== undefined) {
                    debugLog('tool', `Dynamic getter ${normalizedName}: ${JSON.stringify(value)}`);
                    return 'executed';
                }
            }

            // Track unknown tools from AI output
            if (source === 'output' && ModuleAPI.trackUnknownTool) {
                ModuleAPI.trackUnknownTool(normalizedName);
            }

            return 'unknown';
        }

        try {
            // Track entity references in tool calls (first param is typically entity name)
            if (params && params.length > 0 && typeof params[0] === 'string') {
                const entityName = params[0];
                const normalized = normalizeEntityId(entityName);

                // Check if entity exists, if not track it
                if (!dataCache[normalized] && !loadEntityFromCache(normalized)) {
                    if (ModuleAPI.trackUnknownEntity) {
                        ModuleAPI.trackUnknownEntity(entityName, normalizedName, history.length);
                    }
                }
            }

            // Call tool with params array
            const result = tool(params);

            return result;
        } catch (e) {
            debugLogStore.errors.push({
                error: e.message,
                context: `processTool:${normalizedName}`,
                params: params
            });
            if (MODULE_CONFIG.debug) console.log(`${MODULE_NAME}: Error in tool ${normalizedName}: ${e.message}`);
            return 'malformed';
        }
    }

    function parseToolCall(text) {
        // Use the already-defined TOOL_PATTERN from top of file
        const tools = [];
        const matches = [...text.matchAll(TOOL_PATTERN)];
        for (const match of matches) {
            const toolName = match[1];
            const paramString = match[2] || '';

            // Parse parameters - split by comma and trim
            const params = paramString
                .split(',')
                .map(p => p.trim())
                .filter(p => p.length > 0);

            tools.push({ name: toolName, params, match: match[0] });
        }

        return tools;
    }

    //#endregion SECTION 6

    // ========================================
    // SECTION 7: COMMAND PROCESSING
    // ========================================
    //#region SECTION 7

    // Built-in command handlers
    const builtInCommands = {
        // Debug commands
        debug: function(args) {
            return getDebugLog();
        },

        debug_log: function(args) {
            return getDebugLog();
        },

        entities: function(args) {
            const entities = [];
            for (const [key, value] of Object.entries(dataCache)) {
                if (value && value.id && !key.startsWith('schema.') && !key.startsWith('Library.')) {
                    entities.push(`${value.id} (${value.GameplayTags?.join(', ') || 'no tags'})`);
                }
            }
            return `Loaded entities (${entities.length}):\n${entities.join('\n')}`;
        },

        // Generation Wizard commands
        gw_npc: function(args) {
            // Join args to get the full name if multiple words
            const fullName = args.length > 0 ? args.join(' ') : undefined;
            // Use the registered tool
            const result = processTool('gw_npc', fullName ? [fullName] : []);
            if (result === 'executed') {
                const name = fullName || `NPC_${Date.now()}`;
                return `Queued NPC generation for: ${name}`;
            }
            return 'Failed to queue NPC generation';
        },

        gw_location: function(args) {
            // Join args to get the full name if multiple words
            const fullName = args.length > 0 ? args.join(' ') : undefined;
            // Use the registered tool
            const result = processTool('gw_location', fullName ? [fullName] : []);
            if (result === 'executed') {
                const name = fullName || `Location_${Date.now()}`;
                return `Queued location generation for: ${name}`;
            }
            return 'Failed to queue location generation';
        },

        gw_quest: function(args) {
            // Join args to get the full name if multiple words
            const fullName = args.length > 0 ? args.join(' ') : undefined;
            // Use the registered tool
            const result = processTool('gw_quest', fullName ? [fullName] : []);
            if (result === 'executed') {
                const name = fullName || `Quest_${Date.now()}`;
                return `Queued quest generation for: ${name}`;
            }
            return 'Failed to queue quest generation';
        },

        gw_item: function(args) {
            // Note: No built-in Item blueprint, would need to be added
            const name = args.join(' ') || `Item_${Date.now()}`;
            return 'Item generation not yet implemented';
        },

        gw_abort: function(args) {
            // Find all queued entities and abort them
            let aborted = 0;
            for (const [key, entity] of Object.entries(dataCache)) {
                if (entity && entity.generationwizard &&
                    (entity.generationwizard.state === 'queued' || entity.generationwizard.state === 'collecting')) {
                    entity.generationwizard.state = 'aborted';
                    ModuleAPI.save(entity.id, entity);
                    aborted++;
                }
            }
            return `Aborted ${aborted} generation(s)`;
        },

        gw_status: function(args) {
            const status = {
                queued: [],
                collecting: [],
                complete: []
            };

            for (const [key, entity] of Object.entries(dataCache)) {
                if (entity && entity.generationwizard) {
                    const state = entity.generationwizard.state;
                    if (status[state]) {
                        status[state].push(entity.id);
                    }
                }
            }

            return `Generation Status:\n` +
                   `Queued: ${status.queued.join(', ') || 'none'}\n` +
                   `Collecting: ${status.collecting.join(', ') || 'none'}\n` +
                   `Complete: ${status.complete.join(', ') || 'none'}`;
        },


    };

    function processCommand(command, args = []) {
        // Check built-in commands first
        if (builtInCommands[command]) {
            try {
                const result = builtInCommands[command](args);
                return { handled: true, output: result };
            } catch (e) {
                debugLogStore.errors.push({ error: e.message, context: `command:${command}` });
                return { handled: true, output: `Error executing /${command}: ${e.message}` };
            }
        }

        // Check runtime-loaded commands
        if (inputCommands[command]) {
            try {
                const result = inputCommands[command](args);
                return { handled: true, output: result };
            } catch (e) {
                debugLogStore.errors.push({ error: e.message, context: `runtime command:${command}` });
                return { handled: true, output: `Error executing /${command}: ${e.message}` };
            }
        }

        // Command not found
        return { handled: false, output: '' };
    }

    //#endregion SECTION 7

    // ========================================
    // SECTION 8: HOOK PROCESSING
    // ========================================
    //#region SECTION 8

    function processInputHook(text) {
        let modifiedText = text;

        // Apply input modifier
        if (inputModifier) {
            try {
                modifiedText = inputModifier(modifiedText);
            } catch (e) {
                debugLog('input', `Input modifier error: ${e.message}`);
            }
        }

        // Parse and execute commands using the defined COMMAND_PATTERN
        const commandMatches = [...modifiedText.matchAll(COMMAND_PATTERN)];
        for (const match of commandMatches) {
            const commandName = match[1].toLowerCase();
            const args = match[2] ? match[2].trim().split(/\s+/) : [];

            const result = processCommand(commandName, args);
            if (result.handled) {
                debugLog('input', `Command /${commandName} executed`);

                // Some commands replace the entire input
                if (result.output && (commandName === 'debug' || commandName === 'debug_log' ||
                                      commandName === 'entities' || commandName === 'tracker')) {
                    modifiedText = result.output;
                    return modifiedText;
                }

                // Generation Wizard commands should be consumed (removed from input)
                if (commandName.startsWith('gw_')) {
                    modifiedText = modifiedText.replace(match[0], '').trim();
                    if (result.output) {
                        debugLog('command', result.output);
                    }
                    // Return empty if only command was present
                    return modifiedText || ZERO_WIDTH_CHAR;
                }

                // Other commands just log their output
                if (result.output) {
                    debugLog('command', result.output);
                }
            }
        }

        // Parse and handle getter syntax for debugging: get[entity.path]
        const getterMatches = [...modifiedText.matchAll(GETTER_PATTERN)];
        for (const match of getterMatches) {
            const path = match[1];
            const value = get(path);
            debugLog('input', `get[${path}] = ${JSON.stringify(value)}`);
        }

        // Run module input hooks
        for (const handler of hooks.input) {
            try {
                const result = handler(modifiedText);
                if (result) modifiedText = result;
            } catch (e) {
                debugLog('input', `Module hook error: ${e.message}`);
            }
        }

        // Calculate hash for rewind system
        if (ModuleAPI.RewindSystem && ModuleAPI.RewindSystem.quickHash) {
            currentHash = ModuleAPI.RewindSystem.quickHash(modifiedText);
        }

        return modifiedText;
    }

    function processContextHook(text) {
        let modifiedText = text;

        // Remove content between HIDE_BEGINNING and HIDE_ENDING markers (including the markers)
        // temporary fix for state.message handling
        const hidePattern = /HIDE_BEGINNING[\s\S]*?HIDE_ENDING/g;
        const hideMatches = modifiedText.match(hidePattern);
        if (hideMatches && hideMatches.length > 0) {
            modifiedText = modifiedText.replace(hidePattern, '');
            debugLog('context', `Removed ${hideMatches.length} hidden content block(s)`);
        }

        // Check for edits/rewinds in history (MUST happen first after hidden content removal)
        if (ModuleAPI.RewindSystem && ModuleAPI.RewindSystem.handleContext) {
            try {
                ModuleAPI.RewindSystem.handleContext();
            } catch (e) {
                debugLog('context', `RewindSystem error: ${e.message}`);
            }
        }

        // Replace ((trigger_name)) placeholders with displaynames
        const triggerPattern = /\(\(([^)]+)\)\)/g;
        let triggerReplacements = 0;

        modifiedText = modifiedText.replace(triggerPattern, (match, triggerName) => {
            // Check all loaded entities for matching trigger_name
            for (const [key, entity] of Object.entries(dataCache)) {
                if (entity?.info?.trigger_name === triggerName && entity?.info?.displayname) {
                    triggerReplacements++;
                    return entity.info.displayname;
                }
            }

            // Also check entity cards that might not be in cache
            const entityCards = Utilities.storyCard.find(c => c.title?.startsWith('[SANE:E]'), true) || [];
            for (const card of entityCards) {
                if (card.description) {
                    const entityId = card.title.replace('[SANE:E] ', '');
                    const entity = ModuleAPI.get(entityId);
                    if (entity?.info?.trigger_name === triggerName && entity?.info?.displayname) {
                        triggerReplacements++;
                        return entity.info.displayname;
                    }
                }
            }

            // If no replacement found, leave the placeholder as-is
            return match;
        });

        if (triggerReplacements > 0 && debug) {
            console.log(`SANE: Replaced ${triggerReplacements} trigger name placeholders`);
        }

        // Run pre-context hooks for greedy modules (e.g., GenerationWizard)
        for (const handler of hooks.preContext) {
            try {
                const result = handler(modifiedText);
                if (result && result.consumed) {
                    return result.text || modifiedText;
                }
                if (result && result.text) {
                    modifiedText = result.text;
                }
            } catch (e) {
                debugLog('context', `Pre-context hook error: ${e.message}`);
            }
        }

        // Apply context modifier
        if (contextModifier) {
            try {
                modifiedText = contextModifier(modifiedText);
            } catch (e) {
                debugLog('context', `Context modifier error: ${e.message}`);
            }
        }

        // Run module context hooks (display building happens here)
        for (const handler of hooks.context) {
            try {
                const result = handler(modifiedText);
                if (result) modifiedText = result;
            } catch (e) {
                debugLog('context', `Module hook error: ${e.message}`);
            }
        }

        // Resolve all get() calls in the context text
        modifiedText = modifiedText.replace(/get\(([^)]+)\)/g, (match, path) => {
            try {
                const value = ModuleAPI.get(path.trim());
                return value !== null && value !== undefined ? String(value) : match;
            } catch (e) {
                debugLog('context', `Failed to resolve get(${path}): ${e.message}`);
                return match;  // Keep original if resolution fails
            }
        });

        return modifiedText;
    }

    function processOutputHook(text) {
        let modifiedText = text;
        const executedTools = [];

        // Parse and execute tools from AI output
        const toolCalls = parseToolCall(modifiedText);
        for (const toolCall of toolCalls) {
            // Capture revert data BEFORE executing the tool (if RewindSystem is available)
            let revertData = {};
            if (ModuleAPI.RewindSystem && ModuleAPI.RewindSystem.captureRevertData) {
                revertData = ModuleAPI.RewindSystem.captureRevertData(toolCall.name, toolCall.params);
            }

            const result = processTool(toolCall.name, toolCall.params, 'output');
            if (result === 'executed') {
                debugLog('output', `Tool ${toolCall.name} executed successfully`);
                // Store in format expected by RewindSystem: [name, params, revertData]
                executedTools.push([
                    toolCall.name,
                    toolCall.params,
                    revertData
                ]);
            } else if (result === 'unknown') {
                debugLog('output', `Unknown tool ${toolCall.name} tracked`);
            }
        }

        // Apply output modifier
        if (outputModifier) {
            try {
                modifiedText = outputModifier(modifiedText);
            } catch (e) {
                debugLog('output', `Output modifier error: ${e.message}`);
            }
        }

        // Run module output hooks
        for (const handler of hooks.output) {
            try {
                const result = handler(modifiedText);
                if (result && result.active) {
                    modifiedText = result.text;
                }
            } catch (e) {
                debugLog('output', `Module hook error: ${e.message}`);
            }
        }

        // Calculate hash for RewindSystem
        if (ModuleAPI.RewindSystem && ModuleAPI.RewindSystem.quickHash) {
            currentHash = ModuleAPI.RewindSystem.quickHash(modifiedText);
        }

        // Record action for RewindSystem with executed tools
        if (ModuleAPI.RewindSystem && ModuleAPI.RewindSystem.recordAction && executedTools.length > 0) {
            try {
                ModuleAPI.RewindSystem.recordAction(text, executedTools, currentHash);
            } catch (e) {
                debugLog('output', `RewindSystem record error: ${e.message}`);
            }
        }

        return modifiedText;
    }

    //#endregion SECTION 8

    // ========================================
    // SECTION 9: BLUEPRINT SYSTEM
    // ========================================
    //#region SECTION 9

    function instantiateBlueprint(blueprintName, overrides = {}) {
        // Load blueprint from [SANE:BP] card
        const blueprintCard = Utilities.storyCard.get(`[SANE:BP] ${blueprintName}`);
        if (!blueprintCard || !blueprintCard.description) {
            debugLog('blueprint', `Blueprint '${blueprintName}' not found`);
            return null;
        }

        let blueprint;
        try {
            blueprint = JSON.parse(blueprintCard.description);
        } catch (e) {
            debugLogStore.errors.push({ error: e.message, context: `loadBlueprint:${blueprintName}` });
            return null;
        }

        // Deep merge blueprint with overrides
        let entity = deepMerge(blueprint, overrides);

        // Generate unique ID if not provided
        entity.id = entity.id || overrides.id || `${blueprintName.toLowerCase()}_${Date.now()}`;

        // Initialize components from schemas
        entity = initializeEntityComponents(entity);

        // Special handling for Character blueprint - add random starting skills
        if (blueprintName === 'Character' && entity.skills !== undefined && schemas.skills) {
            // Get available skills from the skills schema registry
            const skillsSchema = schemas.skills;
            const availableSkills = skillsSchema.registry || [];

            if (availableSkills.length > 0) {
                // Randomly select 2 starting skills
                const numStartingSkills = Math.min(2, availableSkills.length);
                const selectedIndices = new Set();

                while (selectedIndices.size < numStartingSkills) {
                    selectedIndices.add(Math.floor(Math.random() * availableSkills.length));
                }

                // Add selected skills to entity with default structure
                for (const index of selectedIndices) {
                    const skillName = availableSkills[index];
                    // Create default skill structure
                    entity.skills[skillName] = {
                        level: 1,
                        xp: { current: 0, max: 100 }
                    };
                }

                if (debug) console.log(`[SANE blueprint]: Added ${selectedIndices.size} random skills to ${entity.id}`);
            }
        }

        // Save entity
        save(entity.id, entity);

        // If entity has generationwizard component with state 'queued',
        // GenerationWizard will pick it up on next context hook
        if (entity.generationwizard?.state === 'queued') {
            debugLog('blueprint', `Entity ${entity.id} queued for generation`);
        }

        return entity.id;
    }

    function deepMerge(target, source) {
        // Deep merge utility for combining objects
        if (!source) return target;
        if (!target) return source;

        const result = { ...target };

        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = deepMerge(target[key], source[key]);
            } else {
                result[key] = source[key];
            }
        }

        return result;
    }

    //#endregion SECTION 9

    // ========================================
    // API EXPOSURE
    // ========================================
    //#region API EXPOSURE

    // API object for compatibility
    const SANEApi = {
        // Core data functions
        get,
        set,
        resolve,
        save,
        create,

        // Entity management
        loadEntityFromCache,
        generateEntityKeys,
        saveEntityWithOverflow,
        saveToDataCard,

        // Component system
        initializeEntityComponents,
        loadSchemaIntoCache,

        // GameplayTag system
        hasGameplayTag,
        hasTagExact,
        hasAnyTag,
        hasAllTags,
        addGameplayTag,

        // Query system
        queryTags,
        loadAllEntities,

        // Blueprint system
        instantiateBlueprint,
        deepMerge,

        // Rewind system (from RewindModule)
        RewindSystem: ModuleAPI.RewindSystem,

        // Entity tracker (removed - now handled by EntityTrackerModule)

        // Registries (direct access)
        schemas,
        tools,
        hooks,

        // Tool processing
        processTool,
        parseToolCall,

        // Utility references
        Utilities: Utilities,
        Calendar: Calendar,

        // State
        debug,
        dataCache,
        entityAliasMap,

        // Helper functions
        normalizeEntityId,

        // Library
        Library
    };

    // Make API available globally for compatibility
    if (typeof global !== 'undefined') {
        global.GameState = SANEApi;
        global.SANE = SANEApi;
    }
    if (typeof window !== 'undefined') {
        window.GameState = SANEApi;
        window.SANE = SANEApi;
    }
    // Only set on 'this' if it exists
    if (typeof this !== 'undefined') {
        this.GameState = SANEApi;
        this.SANE = SANEApi;
    }

    //#endregion API EXPOSURE

    // ========================================
    // RUNTIME CONFIGURATION LOADING
    // ========================================
    //#region RUNTIME CONFIG

    function loadRuntimeConfigurations() {
        // Load runtime tools from [SANE_RUNTIME] TOOLS
        const toolsCard = Utilities?.storyCard?.get('[SANE_RUNTIME] TOOLS');
        if (toolsCard) {
            try {
                const toolsCode = (toolsCard.description || toolsCard.entry || toolsCard.value || '').trim();
                if (!toolsCode) return;

                // Create context for runtime tools
                const toolContext = {
                    GameState: SANEApi,
                    SANE: SANEApi,
                    ModuleAPI: ModuleAPI,
                    Utilities: Utilities,
                    Calendar: Calendar,
                    state: state,
                    history: history,
                    console: console,
                    get: get,
                    set: set,
                    save: save
                };

                // Use same approach as GameState.js - wrap in object literal and eval
                try {
                    const wrappedCode = `({${toolsCode}})`;
                    const toolDefinitions = eval(wrappedCode);

                    // Register each tool
                    for (const [name, func] of Object.entries(toolDefinitions)) {
                        if (typeof func === 'function') {
                            runtimeTools[name] = (function(toolName, toolFunc) {
                                return function(params) {
                                    try {
                                        const result = toolFunc.apply(toolContext, [params]);
                                        debugLog('runtime', `Tool ${toolName} returned: ${result}`);
                                        return result;
                                    } catch(e) {
                                        debugLog('runtime', `Error in tool ${toolName}: ${e.toString()}`);
                                        return 'malformed';
                                    }
                                };
                            })(name, func);
                        }
                    }

                    debugLog('runtime', `Loaded ${Object.keys(runtimeTools).length} runtime tools`);
                } catch(evalError) {
                    debugLog('runtime', `Failed to eval runtime tools: ${evalError}`);
                }
            } catch (e) {
                debugLog('runtime', `Error loading runtime tools: ${e.message}`);
            }
        }

        // Load input commands from [SANE_RUNTIME] INPUT_COMMANDS
        const commandsCard = Utilities?.storyCard?.get('[SANE_RUNTIME] INPUT_COMMANDS');
        if (commandsCard) {
            try {
                const commandsCode = (commandsCard.description || commandsCard.entry || commandsCard.value || '').trim();
                if (!commandsCode) return;

                // Same pattern as tools - wrap in object literal
                try {
                    const wrappedCode = `({${commandsCode}})`;
                    const commandDefinitions = eval(wrappedCode);

                    // Register each command
                    for (const [name, func] of Object.entries(commandDefinitions)) {
                        if (typeof func === 'function') {
                            inputCommands[name] = func;
                        }
                    }

                    debugLog('runtime', `Loaded ${Object.keys(inputCommands).length} input commands`);
                } catch(evalError) {
                    debugLog('runtime', `Failed to eval input commands: ${evalError}`);
                }
            } catch (e) {
                debugLog('runtime', `Error loading input commands: ${e.message}`);
            }
        }

        // Load modifiers - these expect to return a function
        const inputModCard = Utilities?.storyCard?.get('[SANE_RUNTIME] INPUT_MODIFIER');
        if (inputModCard) {
            try {
                const fullCode = (inputModCard.entry || '') + '\n' + (inputModCard.description || '');

                // Skip if only comments
                const codeWithoutComments = fullCode.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
                if (!codeWithoutComments) {
                    debugLog('runtime', 'Input modifier is empty, using pass-through');
                    inputModifier = (text) => text;
                } else {
                    // Create function from code with access to SANE context
                    const codeWithReturn = fullCode.includes('return ') ? fullCode : fullCode + '\nreturn text;';
                    const funcCode = `(function(text) {
                        const SANE = this.SANE || {};
                        const GameState = this.GameState || this.SANE || {};
                        const ModuleAPI = this.ModuleAPI || {};
                        const Utilities = this.Utilities;
                        const Calendar = this.Calendar;
                        const get = this.get;
                        const set = this.set;
                        const state = this.state;
                        const history = this.history;
                        ${codeWithReturn}
                    })`;
                    const baseFunc = eval(funcCode);
                    // Wrap it to provide context (SANEApi will be defined later)
                    inputModifier = (text) => {
                        // Get SANEApi at runtime (it's defined after this loads)
                        const api = typeof SANEApi !== 'undefined' ? SANEApi : {get, set, save};
                        return baseFunc.call({
                            SANE: api,
                            GameState: api,
                            ModuleAPI: ModuleAPI,
                            Utilities: Utilities,
                            Calendar: Calendar,
                            get: get,
                            set: set,
                            save: save,
                            state: state,
                            history: history
                        }, text);
                    };
                    debugLog('runtime', 'Loaded input modifier');
                }
            } catch (e) {
                debugLog('runtime', `Error loading input modifier: ${e.message}`);
                inputModifier = null;
            }
        }

        const contextModCard = Utilities?.storyCard?.get('[SANE_RUNTIME] CONTEXT_MODIFIER');
        if (contextModCard) {
            try {
                const fullCode = (contextModCard.entry || '') + '\n' + (contextModCard.description || '');

                // Skip if only comments
                const codeWithoutComments = fullCode.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
                if (!codeWithoutComments) {
                    debugLog('runtime', 'Context modifier is empty, using pass-through');
                    contextModifier = (text) => text;
                } else {
                    // Create function from code with access to SANE context
                    const codeWithReturn = fullCode.includes('return ') ? fullCode : fullCode + '\nreturn text;';
                    const funcCode = `(function(text) {
                        const SANE = this.SANE || {};
                        const GameState = this.GameState || this.SANE || {};
                        const ModuleAPI = this.ModuleAPI || {};
                        const Utilities = this.Utilities;
                        const Calendar = this.Calendar;
                        const get = this.get;
                        const set = this.set;
                        const state = this.state;
                        const history = this.history;
                        ${codeWithReturn}
                    })`;
                    const baseFunc = eval(funcCode);
                    // Wrap it to provide context (SANEApi will be defined later)
                    contextModifier = (text) => {
                        // Get SANEApi at runtime (it's defined after this loads)
                        const api = typeof SANEApi !== 'undefined' ? SANEApi : {get, set, save};
                        return baseFunc.call({
                            SANE: api,
                            GameState: api,
                            ModuleAPI: ModuleAPI,
                            Utilities: Utilities,
                            Calendar: Calendar,
                            get: get,
                            set: set,
                            save: save,
                            state: state,
                            history: history
                        }, text);
                    };
                    debugLog('runtime', 'Loaded context modifier');
                }
            } catch (e) {
                debugLog('runtime', `Error loading context modifier: ${e.message}`);
                contextModifier = null;
            }
        }

        const outputModCard = Utilities?.storyCard?.get('[SANE_RUNTIME] OUTPUT_MODIFIER');
        if (outputModCard) {
            try {
                const fullCode = (outputModCard.entry || '') + '\n' + (outputModCard.description || '');

                // Skip if only comments
                const codeWithoutComments = fullCode.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
                if (!codeWithoutComments) {
                    debugLog('runtime', 'Output modifier is empty, using pass-through');
                    outputModifier = (text) => text;
                } else {
                    // Create function from code with access to SANE context
                    const codeWithReturn = fullCode.includes('return ') ? fullCode : fullCode + '\nreturn text;';
                    const funcCode = `(function(text) {
                        const SANE = this.SANE || {};
                        const GameState = this.GameState || this.SANE || {};
                        const ModuleAPI = this.ModuleAPI || {};
                        const Utilities = this.Utilities;
                        const Calendar = this.Calendar;
                        const get = this.get;
                        const set = this.set;
                        const state = this.state;
                        const history = this.history;
                        ${codeWithReturn}
                    })`;
                    const baseFunc = eval(funcCode);
                    // Wrap it to provide context (SANEApi will be defined later)
                    outputModifier = (text) => {
                        // Get SANEApi at runtime (it's defined after this loads)
                        const api = typeof SANEApi !== 'undefined' ? SANEApi : {get, set, save};
                        return baseFunc.call({
                            SANE: api,
                            GameState: api,
                            ModuleAPI: ModuleAPI,
                            Utilities: Utilities,
                            Calendar: Calendar,
                            get: get,
                            set: set,
                            save: save,
                            state: state,
                            history: history
                        }, text);
                    };
                    debugLog('runtime', 'Loaded output modifier');
                }
            } catch (e) {
                debugLog('runtime', `Error loading output modifier: ${e.message}`);
                outputModifier = null;
            }
        }

        // Entity tracker configuration is now handled by EntityTrackerModule
    }

    //#endregion RUNTIME CONFIG

    // ========================================
    // MAIN EXECUTION
    // ========================================
    //#region MAIN EXECUTION

    // Load runtime configurations (function is defined above)
    loadRuntimeConfigurations();

    // Process the hook based on type
    let result = text;
    try {
        switch (hook) {
            case 'input':
                result = processInputHook(text);
                break;
            case 'context':
                result = processContextHook(text);
                break;
            case 'output':
                result = processOutputHook(text);
                break;
            default:
                debugLog('error', `Unknown hook type: ${hook}`);
        }
    } catch (e) {
        console.log(`${MODULE_NAME}: Fatal error in hook processing: ${e.message}`);
        debugLogStore.errors.push({
            error: e.message,
            stack: e.stack,
            context: `main hook processing: ${hook}`
        });
        if (MODULE_CONFIG.debug) console.log(e.stack);
    }

    // Flush all modified entities to Story Cards before finishing
    flushModifiedEntities();

    // Log execution time
    logTime();

    return result;

    //#endregion MAIN EXECUTION
}
