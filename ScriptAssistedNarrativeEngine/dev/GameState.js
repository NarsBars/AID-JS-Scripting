function GameState(hook, text) {
    'use strict';

    // GenerationWizard state
    let gwActive = false;

    const debug = true;
    const MODULE_NAME = 'GameState';
    const begin = Date.now(); // Start timing execution
    
    // Variable to track current hash
    let currentHash = null;
    
    // Unified data cache for everything - entities, variables, functions, schemas, etc.
    // Keys are the ID
    // Stores data from:
    // - [SANE:E] cards: entities with display
    // - [SANE:D] cards: entities without display, variables
    // - [SANE:S] cards: schemas stored as dataCache['schema.componentName']
    // - [SANE_RUNTIME] LIBRARY: functions stored as dataCache['Library.functionName']
    let dataCache = {};

    // Entity alias mapping for fast lookups
    let entityAliasMap = {}; // alias -> entityId

    // Library functions storage
    let Library = {}; 

    // Normalize entity ID to consistent case for case-insensitive operations
    function normalizeEntityId(entityId) {
        if (!entityId || typeof entityId !== 'string') return entityId;
        return entityId.toLowerCase();
    }

    // ==========================
    // Module Registry System
    // ==========================
    // Allows modules to register tools, schemas, and hooks

    const moduleRegistry = {
        tools: {},          // Tool functions by name
        schemas: {},        // Component schemas
        hooks: {
            preContext: [],   // Run BEFORE context (for greedy modules like GenerationWizard)
            context: [],      // Context modifiers
            input: [],        // Input processors
            output: [],       // Output processors
            init: []          // Initialization hooks
        },
        modules: {}         // Track registered modules by name
    };

    function registerModule(moduleName, module) {
        if (moduleRegistry.modules[moduleName]) {
            if (debug) console.log(`${MODULE_NAME}: Module '${moduleName}' already registered, skipping`);
            return;
        }

        // Register tools
        if (module.tools) {
            for (const [toolName, toolFunc] of Object.entries(module.tools)) {
                if (moduleRegistry.tools[toolName]) {
                    console.log(`${MODULE_NAME}: Warning - tool '${toolName}' already registered, overwriting`);
                }
                moduleRegistry.tools[toolName] = toolFunc;
                // Tool registration is silent to reduce log spam
            }
        }

        // Register schemas
        if (module.schemas) {
            for (const [schemaName, schema] of Object.entries(module.schemas)) {
                if (moduleRegistry.schemas[schemaName]) {
                    console.log(`${MODULE_NAME}: Warning - schema '${schemaName}' already registered, overwriting`);
                }
                moduleRegistry.schemas[schemaName] = schema;
                // Also add to dataCache for universal access
                dataCache[`schema.${schemaName}`] = schema;
                // Schema registration is silent to reduce log spam
            }
        }

        // Register hooks
        if (module.hooks) {
            for (const [hookName, handlers] of Object.entries(module.hooks)) {
                if (!moduleRegistry.hooks[hookName]) {
                    console.log(`${MODULE_NAME}: Warning - unknown hook type '${hookName}'`);
                    continue;
                }
                if (Array.isArray(handlers)) {
                    moduleRegistry.hooks[hookName].push(...handlers);
                } else {
                    moduleRegistry.hooks[hookName].push(handlers);
                }
                // Hook registration is silent to reduce log spam
            }
        }

        // Run module initialization
        if (module.init && typeof module.init === 'function') {
            try {
                module.init(GameStateAPI);
            } catch (e) {
                console.log(`${MODULE_NAME}: Failed to initialize module '${moduleName}': ${e.message}`);
            }
        }

        moduleRegistry.modules[moduleName] = module;
    }

    // Load Library functions from [SANE_RUNTIME] LIBRARY card and add built-in helpers
    function loadLibraryFunctions() {

        Library.Utilities = Utilities;


        // Store all functions in dataCache
        for (const [funcName, func] of Object.entries(Library)) {
            if (typeof func === 'function') {
                dataCache[`Library.${funcName}`] = func;
            }
        }

        // Then load any custom functions from [SANE_RUNTIME] LIBRARY card
        const card = Utilities.storyCard.get('[SANE_RUNTIME] LIBRARY');
        if (!card) {
            if (debug) console.log(`${MODULE_NAME}: No [SANE_RUNTIME] LIBRARY card found, using built-in functions only`);
            return;
        }

        try {
            // Card should contain function definitions
            // Combine both entry and description as they may both contain code
            const libCode = (card.entry || '') + (card.description || '');

            // Check if there's any actual code (not just whitespace or comments)
            const codeWithoutComments = libCode.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
            if (!codeWithoutComments) {
                if (debug) console.log(`${MODULE_NAME}: Library card contains no executable code`);
                return;
            }

            // Execute to populate Library object with custom functions
            // The library code should assign functions to the Library object
            // Example: Library.customFunction = function() { ... }
            // The Library object and all standard globals are available in eval context
            eval(libCode);

            // Store any new library functions in dataCache
            for (const [funcName, func] of Object.entries(Library)) {
                if (typeof func === 'function') {
                    dataCache[`Library.${funcName}`] = func;
                }
            }

            // Universal data access - IMPORTANT: These will be set after functions are defined
            // We'll assign them at the end of GameState initialization
            // Library.get = get;
            // Library.set = set;
            // Library.del = del;

            if (debug) console.log(`${MODULE_NAME}: Loaded ${Object.keys(Library).length} library functions (built-in + custom)`);
        } catch (e) {
            console.log(`${MODULE_NAME}: Failed to load custom library functions: ${e.message}`);
        }
    }

    // Initialize dataCache on startup
    function initializeDataCache() {
        if (debug) console.log(`${MODULE_NAME}: Initializing data cache...`);

        // 1. Load ALL schemas from [SANE:S] cards
        let schemaCount = 0;

        // Use find() to get all schema cards
        if (Utilities?.storyCard?.find) {
            const schemaCards = Utilities.storyCard.find(
                card => card.title && card.title.startsWith('[SANE:S]'),
                true  // Get all matching cards
            ) || [];

            if (schemaCards && Array.isArray(schemaCards)) {
                for (const card of schemaCards) {
                    try {
                        const schema = JSON.parse(card.description || '{}');
                        // Schema MUST have an id field
                        if (!schema.id) {
                            console.log(`${MODULE_NAME}: Schema in card ${card.title} missing required 'id' field`);
                            continue;
                        }
                        // Store ONLY in schema.* namespace
                        dataCache[`schema.${schema.id}`] = schema;
                        schemaCount++;
                    } catch (e) {
                        console.log(`${MODULE_NAME}: Failed to load schema from ${card.title}: ${e.message}`);
                    }
                }
            }
        }

        if (debug) console.log(`${MODULE_NAME}: Loaded ${schemaCount} schemas`);

        // 2. Load Library functions
        loadLibraryFunctions();

        // 3. Load from [SANE:D] Data cards if present
        const allData = loadFromDataCards();
        if (allData && allData.Global) {
            dataCache['Global'] = allData.Global;
            if (debug) console.log(`${MODULE_NAME}: Loaded Global entity from data cards`);
        }

        // 4. Build entity alias map AFTER loading all data
        rebuildEntityAliasMap();

        if (debug) console.log(`${MODULE_NAME}: Data cache initialized`);
    }

    // Rebuild entity alias map from all entity cards
    function rebuildEntityAliasMap() {
        entityAliasMap = {};
        let aliasCount = 0;
        let duplicates = 0;

        // Scan [SANE:E] cards - get ALL cards, not just first
        const entityCards = Utilities.storyCard.find(
            card => card.title && card.title.startsWith('[SANE:E]'),
            true  // Get all matching cards
        ) || [];

        if (entityCards.length > 0) {
            for (const card of entityCards) {
                try {
                    // Parse the structured data from description using parseEntityData
                    const entities = parseEntityData(card.description || '');

                    // Process each entity in the card (there should typically be just one)
                    for (const entityId in entities) {
                        const entity = entities[entityId];

                        if (entity && entity.aliases) {
                            for (const alias of entity.aliases) {
                                const normalizedAlias = normalizeEntityId(alias);
                                const normalizedEntityId = normalizeEntityId(entityId);
                                if (entityAliasMap[normalizedAlias] && entityAliasMap[normalizedAlias] !== normalizedEntityId) {
                                    console.log(`${MODULE_NAME}: WARNING - Duplicate alias '${alias}' - was ${entityAliasMap[normalizedAlias]}, now ${normalizedEntityId}`);
                                    duplicates++;
                                }
                                entityAliasMap[normalizedAlias] = normalizedEntityId;
                                aliasCount++;
                            }
                        }

                        // Always map the entity ID to itself for lookups (normalized)
                        if (entityId) {
                            const normalizedId = normalizeEntityId(entityId);
                            entityAliasMap[normalizedId] = normalizedId;
                        }
                    }

                } catch (e) {
                    console.log(`${MODULE_NAME}: Failed to parse ${card.title}: ${e.message}`);
                }
            }
        }

        // Scan [SANE:D] cards - get ALL cards, not just first
        const dataCards = Utilities.storyCard.find(
            card => card.title && card.title.startsWith('[SANE:D]'),
            true  // Get all matching cards
        ) || [];

        if (dataCards && Array.isArray(dataCards)) {
            for (const card of dataCards) {
                try {
                    const data = JSON.parse(card.description || '{}');
                    for (const [entityId, entity] of Object.entries(data)) {
                        if (entity && entity.aliases) {
                            for (const alias of entity.aliases) {
                                if (entityAliasMap[alias] && entityAliasMap[alias] !== entityId) {
                                    console.warn(`${MODULE_NAME}: Duplicate alias '${alias}' - was ${entityAliasMap[alias]}, now ${entityId}`);
                                    duplicates++;
                                }
                                entityAliasMap[alias] = entityId;
                                aliasCount++;
                            }
                        }

                        // Don't map the entity ID to itself - that's redundant
                    }
                } catch (e) {
                    console.log(`${MODULE_NAME}: Failed to parse ${card.title}: ${e.message}`);
                }
            }
        }

        if (debug) {
            console.log(`${MODULE_NAME}: Built alias map with ${aliasCount} aliases (${duplicates} duplicates)`);
        }
    }
    
    // Debug-only: Initialize execution times array if needed  
    if (debug && !state.times) {
        state.times = []; // Array of {hash, hook, duration}
    }

    const logTime = () => {
        const duration = Date.now() - begin;
        
        if (debug) {
            // Only track times in debug mode
            if (state.times) {
                const timeEntry = {
                    hash: currentHash || 'pending',
                    hook: hook,
                    duration: duration
                };
                
                state.times.push(timeEntry);
            }
            
            // Associate pending CONTEXT entries with current output hash
            // (Input entries keep their own hash from the modified input text)
            if (hook === 'output' && currentHash && state.times) {
            // Only update pending CONTEXT entries, not input entries
            for (let i = state.times.length - 2; i >= 0; i--) {
                if (state.times[i].hash === 'pending' && state.times[i].hook === 'context') {
                    state.times[i].hash = currentHash;
                } else if (state.times[i].hash !== 'pending') {
                    break; // Stop when we hit a non-pending entry
                }
            }
            
            // Clean up timing entries for hashes no longer in history
            // Get all valid hashes from RewindSystem
            const validHashes = new Set();
            validHashes.add('pending'); // Keep pending entries
            
            try {
                const rewindCards = RewindSystem.getAllCards();
                rewindCards.forEach(card => {
                    if (card.data && card.data.entries) {
                        card.data.entries.forEach(entry => {
                            if (entry && entry.h) {
                                validHashes.add(entry.h);
                            }
                        });
                    }
                });
            } catch (e) {
                // If we can't get RewindSystem data, keep all times for safety
                return;
            }
            
            // Filter to keep only times with valid hashes
            state.times = state.times.filter(t => validHashes.has(t.hash));
            }
            
            console.log(`${MODULE_NAME} [${hook}]: Execution time: ${duration} ms`);
        }
    };
    
    // Debug-only state usage
    if (debug) {
        // Check for automatic cleanup FIRST before any processing
        const stateSize = JSON.stringify(state).length;
        if (stateSize > 50000) {
            console.log(`${MODULE_NAME}: State size ${Math.round(stateSize/1000)}KB exceeds 50KB limit - performing automatic cleanup`);
            
            // Reset debug logs
            if (state.debugLog) {
                state.debugLog = {
                    turns: [],
                    allErrors: state.debugLog.allErrors ? state.debugLog.allErrors.slice(-10) : [], // Keep last X errors
                    lastRewindData: null // Clear rewind data backup too
                };
            }
            
            // Clear rewind backups
            if (state.rewindBackups) {
                delete state.rewindBackups;
            }
            
            // Clear execution times
            if (state.times) {
                state.times = [];
            }
        }
    }
    
    // Entity generation tracking
    let currentEntityGeneration = null;

    // Helper functions for generation state tracking
    function hasActiveGeneration() {
        // Check if any entity has generationwizard component that's active (generating or queued)
        const allEntities = loadFromDataCards() || {};
        for (const [id, entity] of Object.entries(allEntities)) {
            const state = entity?.generationwizard?.state;
            if (state === 'generating' || state === 'queued') {
                return true;
            }
        }
        // Also check [SANE:E] cards
        const entityCards = Utilities.storyCard.find(
            card => card.title && card.title.startsWith('[SANE:E]'),
            true
        ) || [];
        for (const card of entityCards) {
            try {
                const entities = parseEntityData(card.description || '');
                for (const entity of Object.values(entities)) {
                    const state = entity?.generationwizard?.state;
                    if (state === 'generating' || state === 'queued') {
                        return true;
                    }
                }
            } catch (e) {}
        }
        return false;
    }

    function findActiveGeneration() {
        // Find entity with generationwizard.state = 'generating'
        const allEntities = loadFromDataCards() || {};
        for (const [id, entity] of Object.entries(allEntities)) {
            if (entity?.generationwizard?.state === 'generating') {
                return { entityId: id, entity };
            }
        }
        // Check [SANE:E] cards too
        const entityCards = Utilities.storyCard.find(
            card => card.title && card.title.startsWith('[SANE:E]'),
            true
        ) || [];
        for (const card of entityCards) {
            try {
                const entities = parseEntityData(card.description || '');
                for (const [id, entity] of Object.entries(entities)) {
                    if (entity?.generationwizard?.state === 'generating') {
                        return { entityId: id, entity };
                    }
                }
            } catch (e) {}
        }
        return null;
    }

    function findQueuedGenerations() {
        const queued = [];
        // Check all entities for queued generations
        const allEntities = loadFromDataCards() || {};
        for (const [id, entity] of Object.entries(allEntities)) {
            if (entity?.generationwizard?.state === 'queued') {
                queued.push({ entityId: id, entity });
            }
        }
        return queued;
    }

    // Tool pattern: standard function calls like tool_name(param1, param2, param3)
    const TOOL_PATTERN = /([a-z_]+)\s*\(([^)]*)\)/gi;
    
    // Universal getter pattern for object data: get(objectType.entityName.field)
    // Examples: get(Bob.level)
    const UNIVERSAL_GETTER_PATTERN = /get\[([^\]]+)\]/gi;
    
    
    // ==========================
    // Debug Logging System
    // ==========================
    const MAX_DEBUG_TURNS = 5; // Keep only last 5 turns to save state space
    
    function initDebugLogging() {
        if (!debug) return;
        
        // Initialize debug log structure in state if needed
        if (!state.debugLog) {
            state.debugLog = {
                turns: [],  // Array of turn data
                allErrors: []  // Track ALL errors throughout the entire adventure
            };
        }
        
        // Ensure allErrors exists even for existing debug logs
        if (!state.debugLog.allErrors) {
            state.debugLog.allErrors = [];
        }
    }
    
    function logError(error, context = '') {
        if (!debug) return;
        
        if (!state.debugLog) {
            initDebugLogging();
        }
        
        const errorEntry = {
            actionCount: state.actionCount || 0,
            error: error.toString(),
            stack: error.stack || '',
            context: context,
            timestamp: new Date().toISOString()
        };
        
        state.debugLog.allErrors.push(errorEntry);
        
        // When we exceed X errors, keep only the last Y
        if (state.debugLog.allErrors.length > 40) {
            state.debugLog.allErrors = state.debugLog.allErrors.slice(-10);
        }
    }
    
    // Track processing events for this turn
    let currentTurnEvents = [];
    
    // Intercept console.log to capture all debug messages
    const originalConsoleLog = console.log;
    console.log = function(...args) {
        // Call the original console.log
        originalConsoleLog.apply(console, args);
        
        // If in debug mode and message contains MODULE_NAME, capture it
        if (debug && args.length > 0) {
            const message = args.join(' ');
            if (message.includes(MODULE_NAME)) {
                currentTurnEvents.push(message);
            }
        }
    };
    
    function logDebugTurn(hook, inputText, outputText, extraData = {}) {
        if (!debug) return;
        
        initDebugLogging();
        
        const turnData = {
            hook: hook,
            actionCount: info?.actionCount || state.actionCount || 0,
            events: [...currentTurnEvents], // Capture all events for this turn
            ...extraData // Include all extra data passed in
        };
        
        // Clear events after capturing
        currentTurnEvents = [];
        
        // Store hook-specific data
        if (hook === 'input') {
            // Track any commands processed
            if (inputText && inputText.includes('/')) {
                turnData.commandDetected = true;
                // Extract command names
                const commandMatches = inputText.match(/\/([a-z_]+)/gi);
                if (commandMatches) {
                    turnData.commands = commandMatches;
                }
            }
        } else if (hook === 'context') {
            // Track context size
            turnData.contextSize = inputText ? inputText.length : 0;
        } else if (hook === 'output') {
            // Check for tools in output
            const toolMatches = outputText ? outputText.match(/([a-z_]+)\s*\([^)]*\)/gi) : [];
            if (toolMatches && toolMatches.length > 0) {
                turnData.toolsInOutput = toolMatches;
            }
            
            // Capture RewindSystem data - store only essential info to prevent memory issues
            let rewindData = {
                cards: [],
                totalEntries: 0,
                position: -1
            };
            
            try {
                const rewindCards = RewindSystem.getAllCards();
                rewindCards.forEach(card => {
                    // For each entry, store only hash and tools (not full text)
                    const compactEntries = (card.data?.entries || []).map(entry => {
                        if (!entry) return null;
                        // Keep only essential fields
                        return {
                            h: entry.h,  // hash
                            t: entry.t   // tools (if any)
                        };
                    }).filter(e => e !== null);
                    
                    const cardData = {
                        title: card.title,
                        entries: compactEntries,
                        position: card.data ? card.data.position : -1
                    };
                    rewindData.cards.push(cardData);
                    rewindData.totalEntries += compactEntries.length;
                    if (cardData.position > rewindData.position) {
                        rewindData.position = cardData.position;
                    }
                });
            } catch (e) {
                // If cards are deleted or corrupted, at least we tried
                rewindData.error = e.toString();
                logError(e, 'Failed to read RewindSystem cards');
            }
            
            // Store the compact RewindSystem data in state as backup
            turnData.rewindData = rewindData;
            
            // Track state size at this point
            turnData.stateSizeAtTurn = JSON.stringify(state).length;
        }
        
        // Only store turns that have meaningful data
        const hasEvents = turnData.events && turnData.events.length > 0;
        const hasTools = turnData.toolsExecuted && turnData.toolsExecuted.length > 0;
        const hasInput = turnData.hook === 'input' && (turnData.commandDetected || turnData.inputSummary?.startsWith('/'));
        const hasBlueprintManager = turnData.generationWizardActive;
        
        // Skip storing empty context hooks and output hooks with only "Loaded 1 runtime tools"
        const isEmptyContext = turnData.hook === 'context' && !hasEvents;
        const isBoringOutput = turnData.hook === 'output' &&
            !hasTools && !hasBlueprintManager &&
            (!hasEvents || (turnData.events.length === 1 && turnData.events[0].includes('Loaded 1 runtime tools')));
        
        if (!isEmptyContext && !isBoringOutput) {
            // This turn has meaningful data, store it
            state.debugLog.turns.push(turnData);
            
            // Keep only last MAX_DEBUG_TURNS
            if (state.debugLog.turns.length > MAX_DEBUG_TURNS) {
                state.debugLog.turns = state.debugLog.turns.slice(-MAX_DEBUG_TURNS);
            }
        }
        
        // Store complete RewindSystem data as backup (includes position info)
        state.debugLog.lastRewindData = turnData.rewindData;
    }
    
    function outputDebugLog() {
        if (!debug) {
            return "Debug mode is not enabled. Set debug = true in GameState.js to enable debug logging.";
        }
        
        if (!state.debugLog || !state.debugLog.turns || state.debugLog.turns.length === 0) {
            return "No debug logs available yet.";
        }
        
        // Build comprehensive debug output
        let output = `# Debug Log Report\n`;
        output += `Generated: ${new Date().toISOString()}\n\n`;
        
        output += `## Recent Actions\n\n`;
        
        state.debugLog.turns.forEach((turn, index) => {
            // Skip input hooks entirely
            if (turn.hook === 'input') {
                return; // Skip all input hooks
            }
            
            // Skip context hooks that have no events or useful info
            if (turn.hook === 'context' && (!turn.events || turn.events.length === 0)) {
                return; // Skip this turn entirely
            }
            
            // Skip output hooks that only loaded runtime tools and nothing else
            if (turn.hook === 'output' && turn.events && turn.events.length === 1 &&
                turn.events[0].includes('Loaded 1 runtime tools') &&
                !turn.generationWizardActive) {
                return; // Skip this turn entirely
            }
            
            output += `### Action ${turn.actionCount} - ${turn.hook.toUpperCase()} Hook\n`;
            
            // Show hook-specific debug info
            if (turn.hook === 'input') {
                if (turn.commands) output += `Commands: ${turn.commands.join(', ')}\n`;
            } else if (turn.hook === 'context') {
                if (turn.contextSize) output += `Context Size: ${turn.contextSize} chars\n`;
                if (turn.triggerNamesReplaced) output += `Trigger Names Replaced: ${turn.triggerNamesReplaced}\n`;
                if (turn.gettersReplaced && Object.keys(turn.gettersReplaced).length > 0) {
                    const getterList = Object.entries(turn.gettersReplaced)
                        .map(([name, count]) => count > 1 ? `${name}(${count})` : name)
                        .join(', ');
                    output += `Getters Replaced: ${getterList}\n`;
                }
                if (turn.variablesReplaced) output += `Variables Replaced: ${turn.variablesReplaced}\n`;
            } else if (turn.hook === 'output') {
                if (turn.toolsInOutput) output += `Tools in Output: ${turn.toolsInOutput.length}\n`;
                if (turn.generationWizardActive) output += `BlueprintManager Active: ${turn.generationWizardActive}\n`;
            }
            
            // Show processing events for this turn
            if (turn.events && turn.events.length > 0) {
                output += `\n#### Processing Events:\n`;
                turn.events.forEach(event => {
                    output += `${event}\n`;
                });
            }
            
            output += `\n---\n`;
        });
        
        // Get COMPLETE RewindSystem data from the separate storage
        let latestRewindData = state.debugLog.lastRewindData;
        
        // Build hash to execution times mapping
        const hashToTimes = {};
        if (state.times && state.times.length > 0) {
            state.times.forEach(entry => {
                if (entry.hash && entry.hash !== 'pending') {
                    if (!hashToTimes[entry.hash]) {
                        hashToTimes[entry.hash] = [];
                    }
                    hashToTimes[entry.hash].push({
                        hook: entry.hook,
                        duration: entry.duration
                    });
                }
            });
        }
        
        // Add RewindSystem data with execution times
        output += `## Rewind System Data (with Execution Times)\n\n`;
        
        if (latestRewindData) {
            if (latestRewindData.error) {
                output += `ERROR: ${latestRewindData.error}\n\n`;
            }
            
            // Show each card and ALL its entries
            latestRewindData.cards.forEach((card, cardIndex) => {
                output += `### ${card.title} (${card.entries.length} entries, position: ${card.position})\n`;
                
                if (card.entries.length > 0) {
                    card.entries.forEach((entry, entryIndex) => {
                        output += `[${entryIndex}]: `;
                        if (entry) {
                            if (entry.h) output += `hash:${entry.h.substring(0, 8)} `;
                            
                            // Check if this is an input entry (has input timing)
                            const hasInputTiming = entry.h && hashToTimes[entry.h] && 
                                                  hashToTimes[entry.h].some(t => t.hook === 'input');
                            
                            if (hasInputTiming) {
                                // Input entries show commands instead of tools
                                output += `(player input)`;
                            } else if (entry.t && entry.t.length > 0) {
                                // Output entries show tools
                                const toolList = entry.t.map(t => {
                                    if (Array.isArray(t)) {
                                        return `${t[0]}(${t[1] ? t[1].join(',') : ''})`;
                                    }
                                    return String(t);
                                }).join(', ');
                                output += `tools:[${toolList}]`;
                            } else {
                                output += `no tools`;
                            }
                            
                            // Add execution times if available
                            if (entry.h && hashToTimes[entry.h]) {
                                const times = hashToTimes[entry.h];
                                const timesStr = times.map(t => `${t.hook}:${t.duration}ms`).join(', ');
                                output += ` | times:[${timesStr}]`;
                            }
                        } else {
                            output += `null entry`;
                        }
                        output += `\n`;
                    });
                } else {
                    output += `(no entries)\n`;
                }
                output += `\n`;
            });
        } else {
            output += `No rewind data found in stored turns.\n\n`;
        }
        
        // Add ALL ERRORS from the entire adventure
        if (state.debugLog.allErrors && state.debugLog.allErrors.length > 0) {
            output += `## Recent Errors (Rolling History)\n\n`;
            output += `Showing: ${state.debugLog.allErrors.length} errors\n\n`;
            
            state.debugLog.allErrors.forEach((err, index) => {
                output += `### Error ${index + 1} (Action ${err.actionCount})\n`;
                output += `Time: ${err.timestamp}\n`;
                output += `Context: ${err.context}\n`;
                output += `Error: ${err.error}\n`;
                if (err.stack) {
                    output += `Stack:\n\`\`\`\n${err.stack}\n\`\`\`\n`;
                }
                output += `\n`;
            });
            output += `---\n`;
        }
        
        // Add execution time averages and context info
        if (state.times && state.times.length > 0) {
            output += `## Execution Time Summary\n\n`;
            
            const byHook = {
                input: state.times.filter(t => t.hook === 'input'),
                context: state.times.filter(t => t.hook === 'context'),  
                output: state.times.filter(t => t.hook === 'output')
            };
            
            ['input', 'context', 'output'].forEach(hookType => {
                const entries = byHook[hookType];
                if (entries && entries.length > 0) {
                    const average = Math.round(entries.reduce((sum, e) => sum + e.duration, 0) / entries.length);
                    const max = Math.max(...entries.map(e => e.duration));
                    const min = Math.min(...entries.map(e => e.duration));
                    output += `${hookType.toUpperCase()}: avg ${average}ms (min ${min}ms, max ${max}ms) from ${entries.length} samples\n`;
                }
            });
            
            // Add context length
            if (state.lastContextLength !== undefined) {
                output += `\nLast Context Length: ${state.lastContextLength} characters\n`;
            }
        }
        
        // Save to Story Card using upsert
        const debugCard = {
            title: '[DEBUG] Debug Log',
            type: 'data',
            description: output,
            entry: `Debug log generated at ${new Date().toISOString()}\nUse /debug_log to update this card.`
        };
        
        Utilities.storyCard.upsert(debugCard);
        
        // Pin debug card after player cards for easy access
        try {
            const debugCardObj = Utilities.storyCard.get('[DEBUG] Debug Log');
            if (debugCardObj && typeof storyCards !== 'undefined' && storyCards.length > 1) {
                // Sort by update time (newest first)
                storyCards.sort((a, b) => {
                    const timeA = a.updatedAt ? Date.parse(a.updatedAt) : 0;
                    const timeB = b.updatedAt ? Date.parse(b.updatedAt) : 0;
                    return timeB - timeA;
                });
                
                // Count player cards at top
                let playerCount = 0;
                for (const card of storyCards) {
                    if (card && card.title && card.title.startsWith('[PLAYER]')) {
                        playerCount++;
                    } else {
                        break; // Stop when we hit non-player cards
                    }
                }

                // Move debug card after player cards
                const debugIndex = storyCards.findIndex(card => card.title === '[DEBUG] Debug Log');
                if (debugIndex >= 0 && debugIndex !== playerCount) {
                    const [debugEntry] = storyCards.splice(debugIndex, 1);
                    storyCards.splice(playerCount, 0, debugEntry);
                }
            }
        } catch (e) {
            // Ignore pinning errors - not critical
        }
        
        return `Debug log saved to [DEBUG] Debug Log story card.`;
    }
    
    // ==========================
    // Universal Data System
    // ==========================
    
    // Universal getter function - access any data via path
    // Resolve dynamic expressions in paths
    // Examples:
    // - "$(party[0]).stats" -> "Kirito.stats"
    function resolve(path) {
        if (!path || typeof path !== 'string') return path;

        // Replace all $(expression) with their evaluated results
        return path.replace(/\$\((.*?)\)/g, function(match, expression) {
            // Parse nested array access iteratively
            // Supports patterns like: array[0][1][2] or matrix[i][j]
            let currentPath = expression;
            let arrayAccesses = [];

            // Extract all array accesses from the end
            while (true) {
                const arrayMatch = currentPath.match(/^(.*)\[([^\]]+)\]$/);
                if (!arrayMatch) break;

                currentPath = arrayMatch[1];
                arrayAccesses.unshift(arrayMatch[2]); // Add to front to maintain order
            }

            // If we found array accesses
            if (arrayAccesses.length > 0) {
                // Split any remainder (e.g., ".stats.hp" after array accesses)
                const dotIndex = expression.indexOf('.', currentPath.length);
                const remainder = dotIndex >= 0 ? expression.substring(dotIndex) : '';

                // Start with the base path
                let value = get(currentPath);

                // Process each array access
                for (let indexExpr of arrayAccesses) {
                    // If index contains $(), resolve it recursively
                    if (indexExpr.includes('$(')) {
                        indexExpr = resolve(indexExpr);
                    }

                    // Check if current value is an array
                    if (!value || !Array.isArray(value)) {
                        if (debug) console.log(`${MODULE_NAME}: Not an array at ${currentPath}, value:`, value);
                        return match;
                    }

                    // Parse index
                    const index = parseInt(indexExpr);
                    // Double-check value is still valid before accessing length
                    if (isNaN(index) || index < 0 || !value || index >= value.length) {
                        if (debug) console.log(`${MODULE_NAME}: Invalid array index ${indexExpr}`);
                        return match;
                    }

                    // Get the value at index
                    value = value[index];
                    currentPath += `[${index}]`;
                }

                // If there's a remainder, append it
                if (remainder && value !== null && value !== undefined) {
                    // If value is a string (like entity ID), append the remainder
                    if (typeof value === 'string' || typeof value === 'number') {
                        return String(value) + remainder;
                    }
                    // If value is an object, try to get the nested field
                    else if (typeof value === 'object') {
                        const nestedValue = getNestedField(value, remainder.substring(1));
                        return nestedValue !== undefined ? String(nestedValue) : match;
                    }
                }

                return value !== undefined && value !== null ? String(value) : match;
            }

            // Standard resolution for non-array expressions
            const resolved = resolve(expression); // Recursive resolution
            const value = get(resolved);
            return value !== undefined && value !== null ? String(value) : match;
        });
    }
    
    function get(path) {
        if (!path) return undefined;

        // First resolve any dynamic expressions in the path
        const resolvedPath = resolve(path);
        if (resolvedPath !== path) {
            path = resolvedPath;
        }

        // Special namespaces first
        if (path.startsWith('Library.')) {
            const funcName = path.substring(8);
            if (Library[funcName]) {
                return Library[funcName];
            }
            return undefined;
        }

        if (path.startsWith('time.')) {
            // Return Calendar functions
            const funcName = path.substring(5);
            if (typeof Calendar !== 'undefined' && Calendar[funcName]) {
                return Calendar[funcName];
            }
            return undefined;
        }

        // Check if it's a schema access
        if (path.startsWith('schema.')) {
            // Direct access to schema data
            const schemaPath = path.substring(7);
            const parts = schemaPath.split('.');
            const schemaName = parts[0];
            const fieldPath = parts.slice(1).join('.');

            // Check dataCache first
            const schemaData = dataCache[`schema.${schemaName}`];
            if (schemaData) {
                return fieldPath ? getNestedField(schemaData, fieldPath) : schemaData;
            }

            // Load from [SANE:S] cards if not cached
            return undefined;
        }

        // Parse path for regular data access
        const parts = path.split('.');

        // Single part = direct dataCache lookup (entity ID or variable)
        if (parts.length === 1) {
            // Check dataCache directly
            if (dataCache[path] !== undefined) {
                return dataCache[path];
            }

            // Check aliases
            for (const [key, data] of Object.entries(dataCache)) {
                if (data && data.aliases && data.aliases.includes(path)) {
                    return data;
                }
            }

            // Try to load entity if not cached
            // First check if it's a known entity type by checking entity card map
            if (!entityCardMap) buildEntityCardMap();

            // Check if path is an alias that maps to a different entity ID (case-insensitive)
            const normalizedPath = normalizeEntityId(path);
            const mappedId = entityAliasMap[normalizedPath];
            const entityId = mappedId || normalizedPath; // Use mapped ID if it exists, otherwise use normalized path

            // Try to load from [SANE:E] card first
            const entityCard = Utilities.storyCard.get(`[SANE:E] ${entityId}`);
            if (entityCard) {
                // Use parseEntityData to handle delimiters properly
                const parsedData = parseEntityData(entityCard.description || '');
                // parseEntityData returns an object with entityId as key
                const entity = parsedData ? parsedData[entityId] : null;
                if (entity) {
                    entity.id = entityId;  // Add the ID field
                    dataCache[entityId] = entity;
                    // Register all aliases
                    if (entity.aliases) {
                        for (const alias of entity.aliases) {
                            entityAliasMap[alias] = entityId;
                        }
                    }
                    // Also cache under the original path if it was an alias
                    if (mappedId) {
                        dataCache[path] = entity;
                    }
                    return entity;
                }
            }

            // If not found in [SANE:E], check data-only entities in [SANE:D] cards
            const dataCardResult = Utilities.storyCard.find(
                card => card.title.startsWith('[SANE:D]'),
                false // Get all matching cards (false for returnFirst)
            );

            // Handle both single card and array of cards
            let allDataCards = [];
            if (dataCardResult) {
                allDataCards = Array.isArray(dataCardResult) ? dataCardResult : [dataCardResult];
            }

            for (const card of allDataCards) {
                try {
                    const data = JSON.parse(card.description || '{}');

                    // Check if entityId exists in this card (either as direct ID or mapped from alias)
                    if (data[entityId]) {
                        const entity = data[entityId];
                        entity.id = entityId;  // Add the ID field

                        // Cache the entity
                        dataCache[entityId] = entity;

                        // Register aliases if present
                        if (entity.aliases) {
                            for (const alias of entity.aliases) {
                                entityAliasMap[alias] = entityId;
                            }
                        }

                        // Also cache under the original path if it was an alias
                        if (mappedId) {
                            dataCache[path] = entity;
                        }

                        return entity;
                    }

                    // If entityId wasn't found and we haven't checked aliases yet,
                    // scan for entities that have our path as an alias
                    if (!mappedId) {
                        for (const [key, entity] of Object.entries(data)) {
                            if (entity && entity.aliases && entity.aliases.includes(path)) {
                                entity.id = key;  // Add the ID field

                                // Cache the entity by its primary ID
                                dataCache[key] = entity;

                                // Register all aliases
                                if (entity.aliases) {
                                    for (const alias of entity.aliases) {
                                        entityAliasMap[alias] = key;
                                }
                            }

                            return entity;
                        }
                    }
                    }
                } catch (e) {
                    console.log(`${MODULE_NAME}: Failed to parse ${card.title}: ${e.message}`);
                }
            }

            return undefined;
        }

        // Multi-part path
        const entityId = parts[0];
        const fieldPath = parts.slice(1).join('.');

        // Special case for Global variables
        if (entityId === 'Global') {
            const varName = parts[1];
            if (!varName) {
                // Return all globals
                return dataCache.Global || {};
            }
            const varFieldPath = parts.slice(2).join('.');
            const value = dataCache.Global?.[varName];
            if (value === undefined) return undefined;
            return varFieldPath ? getNestedField(value, varFieldPath) : value;
        }

        // Load entity from cache
        const entity = dataCache[entityId] || get(entityId);
        if (!entity) return undefined;

        // Return field or entire entity
        return fieldPath ? getNestedField(entity, fieldPath) : entity;

        return undefined;
    }
    
    // Universal setter function - set any data via path
    function set(path, value) {
        if (!path) return false;

        // First resolve any dynamic expressions in the path
        const resolvedPath = resolve(path);
        if (resolvedPath !== path) {
            path = resolvedPath;
        }

        // Parse path: "EntityID.field.subfield" or "Global.variableName"
        const parts = path.split('.');
        if (parts.length < 1) return false;

        const entityName = parts[0];
        const fieldPath = parts.slice(1).join('.');

        // Special case for Global variables (the only "typed" access we keep)
        if (entityName === 'Global') {
            if (!fieldPath) {
                if (debug) console.log(`${MODULE_NAME}: Global requires a variable name`);
                return false;
            }

            // Global.variableName.field format
            const varParts = fieldPath.split('.');
            const varName = varParts[0];
            const varFieldPath = varParts.slice(1).join('.');

            if (varFieldPath) {
                // Setting nested field in global variable
                let currentValue = get(`Global.${varName}`) || {};
                setNestedField(currentValue, varFieldPath, value);
                value = currentValue;
            }

            // Store the global variable
            if (!dataCache.Global) dataCache.Global = {};
            dataCache.Global[varName] = value;

            // Save Global entity to [SANE:D] cards
            saveToDataCards({ Global: dataCache.Global });

            return true;
        }

        // Load the entity
        const entity = get(entityName);
        if (!entity) {
            if (debug) console.log(`${MODULE_NAME}: Entity not found: ${entityName}`);
            return false;
        }

        // Modify the field
        if (fieldPath) {
            setNestedField(entity, fieldPath, value);
        } else {
            // If no field path, we're replacing the entire entity
            Object.assign(entity, value);
        }

        // Save the entity back (unless it's a temporary entity with generationwizard)
        if (entity.components && entity.components.includes('generationwizard')) {
            // Don't save temporary entities - just update cache
            dataCache[entityName] = entity;
            return true;
        }
        return save(entityName, entity);
    }

    // Universal delete function - remove any data via path
    function del(path) {
        if (!path) return false;

        // First resolve any dynamic expressions in the path
        const resolvedPath = resolve(path);

        // Split the path to determine what we're deleting
        const parts = resolvedPath.split('.');

        // Handle Global variables
        if (parts[0] === 'Global' || parts[0] === 'global') {
            const varName = parts.slice(1).join('.');
            const globalVars = loadGlobalVariables();
            if (varName in globalVars) {
                delete globalVars[varName];
                saveGlobalVariables(globalVars);
                // Also remove from cache
                delete dataCache[resolvedPath];
                return true;
            }
            return false;
        }

        // Handle entity field deletion
        if (parts.length >= 2) {
            const entityName = parts[0];
            const fieldPath = parts.slice(1).join('.');

            const entity = get(entityName);
            if (entity) {
                // Delete the nested field
                if (deleteNestedField(entity, fieldPath)) {
                    // Save the updated entity
                    save(entityName, entity);
                    // Update cache
                    dataCache[entityName] = entity;
                    return true;
                }
            }
        }

        // Try to delete from dataCache directly
        if (resolvedPath in dataCache) {
            delete dataCache[resolvedPath];
            return true;
        }

        return false;
    }

    // Helper to delete nested field from any object
    function deleteNestedField(obj, path) {
        if (!obj || !path) return false;

        const parts = path.split('.');
        const lastPart = parts.pop();

        // Navigate to the parent object
        let current = obj;
        for (const part of parts) {
            if (!(part in current)) return false;
            current = current[part];
        }

        // Delete the final property
        if (lastPart in current) {
            delete current[lastPart];
            return true;
        }

        return false;
    }

    // Helper to get nested field from any object
    function getNestedField(obj, path) {
        if (!obj || !path) return obj;
        
        const parts = path.split('.');
        let current = obj;
        
        for (const part of parts) {
            if (current === null || current === undefined) return undefined;
            
            // Handle array index notation [0]
            const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
            if (arrayMatch) {
                current = current[arrayMatch[1]];
                if (Array.isArray(current)) {
                    current = current[parseInt(arrayMatch[2])];
                }
            } else {
                // Try exact match first
                if (current[part] !== undefined) {
                    current = current[part];
                } else if (typeof current === 'object') {
                    // Try case-insensitive match
                    const lowerPart = part.toLowerCase();
                    const key = Object.keys(current).find(k => k.toLowerCase() === lowerPart);
                    current = key ? current[key] : undefined;
                } else {
                    current = undefined;
                }
            }
        }
        
        return current;
    }
    
    // Helper to set nested field in any object
    function setNestedField(obj, path, value) {
        if (!obj || !path) return false;

        const parts = path.split('.');
        let current = obj;

        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];

            // Handle array index notation
            const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
            if (arrayMatch) {
                const fieldName = arrayMatch[1];
                const index = parseInt(arrayMatch[2]);

                if (!current[fieldName]) current[fieldName] = [];
                if (!current[fieldName][index]) current[fieldName][index] = {};
                current = current[fieldName][index];
            } else {
                if (!current[part]) current[part] = {};
                current = current[part];
            }
        }
        
        // Set the final value
        const lastPart = parts[parts.length - 1];
        const arrayMatch = lastPart.match(/^(.+)\[(\d+)\]$/);
        if (arrayMatch) {
            if (!current[arrayMatch[1]]) current[arrayMatch[1]] = [];
            current[arrayMatch[1]][parseInt(arrayMatch[2])] = value;
        } else {
            current[lastPart] = value;
        }
        
        return true;
    }


    // ==========================
    // Location Helper Functions
    // ==========================
    function getOppositeDirection(direction) {
        // Try to get opposites from pathways schema
        const pathwaysSchema = dataCache['schema.pathways'] || loadSchemaIntoCache('pathways');

        if (pathwaysSchema && pathwaysSchema.opposites) {
            const lower = direction.toLowerCase();
            const opposite = pathwaysSchema.opposites[lower];

            if (opposite) {
                // Return with same capitalization as input
                if (direction[0] === direction[0].toUpperCase()) {
                    return opposite.charAt(0).toUpperCase() + opposite.slice(1);
                }
                return opposite;
            }
        }

        // No opposite found - return null to indicate no bidirectional connection
        return null;
    }
    
    function updateLocationPathway(locationName, direction, destinationName, bidirectional = true) {
        // Use universal load function
        const location = get(locationName);
        if (!location) {
            if (debug) console.log(`${MODULE_NAME}: Location not found: ${locationName}`);
            return false;
        }
        
        // Normalize direction
        const dirLower = direction.toLowerCase();
        
        // Update pathways - works with both component and direct property
        if (!location.pathways || typeof location.pathways !== 'object') {
            location.pathways = {};
        }
        location.pathways[dirLower] = destinationName;
        
        // Save the updated location using universal save
        const saved = save(locationName, location);

        if (saved && bidirectional) {
            // Also update the destination location with reverse pathway
            const destination = get(destinationName);
            if (destination) {
                const oppositeDir = getOppositeDirection(direction);

                // Only create bidirectional if opposite direction exists
                if (oppositeDir) {
                    if (!destination.pathways || typeof destination.pathways !== 'object') {
                        destination.pathways = {};
                    }
                    destination.pathways[oppositeDir.toLowerCase()] = locationName;
                    save(destinationName, destination);

                    if (debug) {
                        console.log(`${MODULE_NAME}: Created bidirectional pathway: ${locationName} <-${direction}/${oppositeDir}-> ${destinationName}`);
                    }
                }
            }
        } else if (saved) {
            if (debug) {
                console.log(`${MODULE_NAME}: Updated ${locationName} pathway ${direction} -> ${destinationName}`);
            }
        }
        
        return saved;
    }
    
    // ===============
    // Display System
    // ===============
    // Component-based display system for generating Entry fields
    // Generate keys for entity card based on type
    function generateEntityKeys(entityId, entity) {
        if (!entityId || !entity) return '';

        // Check entity type from GameplayTags
        const isLocation = entity.GameplayTags && entity.GameplayTags.some(tag => tag.startsWith('Location'));

        if (isLocation) {
            // Location format: " Location_ID, Title Case Name"
            const titleCase = entityId.split('_').map(word =>
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            ).join(' ');

            let keys = ` ${entityId}, ${titleCase}`;

            // Add aliases if present
            if (entity.aliases && Array.isArray(entity.aliases)) {
                for (const alias of entity.aliases) {
                    if (alias !== entityId) {
                        // For locations, also add title case version of aliases
                        const aliasTitleCase = alias.split('_').map(word =>
                            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                        ).join(' ');
                        keys += `, ${alias}, ${aliasTitleCase}`;
                    }
                }
            }

            return keys;
        } else {
            // Character/other entity format: " EntityID,(EntityId, trigger_name,(trigger_name"
            let keys = ` ${entityId},(${entityId}`;

            // Add aliases
            if (entity.aliases && Array.isArray(entity.aliases)) {
                for (const alias of entity.aliases) {
                    if (alias !== entityId) {
                        keys += `, ${alias},(${alias}`;
                    }
                }
            }

            // Add trigger_name if present
            const triggerName = entity.info?.trigger_name;
            if (triggerName && triggerName !== entityId) {
                keys += `, ${triggerName},(${triggerName}`;
            }

            return keys;
        }
    }

    // Build the display for an entity using component-embedded display rules
    function buildEntityDisplay(entity) {
        if (!entity || typeof entity !== 'object') {
            if (debug) console.log(`${MODULE_NAME}: buildEntityDisplay: Invalid entity`);
            return '';
        }

        // Collect all display rules from components
        const displayRules = [];

        // Gather display rules embedded in each component's data
        if (entity.components && Array.isArray(entity.components)) {
            for (const componentName of entity.components) {
                const component = entity[componentName];
                if (!component || typeof component !== 'object') continue;

                // Check for display rules in the component
                if (component.display) {
                    // Handle both single rule and array of rules
                    const rules = Array.isArray(component.display) ? component.display : [component.display];
                    for (const rule of rules) {
                        displayRules.push({
                            component: componentName,
                            componentData: component,
                            ...rule
                        });
                    }
                }
            }
        }

        // Sort rules by priority
        displayRules.sort((a, b) => (a.priority || 100) - (b.priority || 100));

        // Initialize display sections
        const sections = {
            prefixline: [],
            nameline: [],
            infoline: [],
            section: [],
            footer: []
        };

        // Get display component configuration
        const displayConfig = entity.display || {
            separators: {
                nameline: ' ',
                infoline: ' | ',
                section: '\n',
                footer: '\n'
            },
            order: ['prefixline', 'nameline', 'infoline', 'section', 'footer']
        };

        // 1. Handle prefixline from display component
        if (displayConfig.prefixline) {
            sections.prefixline.push(displayConfig.prefixline);
        } else {
            // Auto-generate prefix from GameplayTags if not specified
            if (entity.GameplayTags && entity.GameplayTags.length > 0) {
                for (const tag of entity.GameplayTags) {
                    if (tag.startsWith('Character')) {
                        sections.prefixline.push('<$# Characters>');
                        break;
                    } else if (tag.startsWith('User')) {
                        sections.prefixline.push('<$# Users>');
                        break;
                    } else if (tag === 'Location') {
                        sections.prefixline.push('<$# Locations>');
                        break;
                    } else if (tag === 'Quest') {
                        sections.prefixline.push('<$# Quests>');
                        break;
                    }
                }
            }
        }

        // 2. Process all display rules
        for (const rule of displayRules) {
            // Check condition if present
            if (rule.condition) {
                if (!evaluateTemplateCondition(rule.condition, entity, rule.componentData)) {
                    continue;
                }
            }

            // Format the display text using the new template system
            const formatted = formatTemplateString(rule.format, entity, rule.componentData, rule.component);
            if (formatted && formatted.trim()) {
                const targetSection = sections[rule.line] || sections.section;
                targetSection.push(formatted);
            }
        }

        // 3. Compile final output using display component's order and separators
        const output = [];
        const order = displayConfig.order || ['prefixline', 'nameline', 'infoline', 'section', 'footer'];

        for (const sectionName of order) {
            const section = sections[sectionName];
            if (!section || section.length === 0) continue;

            const separator = displayConfig.separators?.[sectionName] || '\n';

            if (sectionName === 'infoline' || sectionName === 'nameline') {
                // Infoline and nameline sections are joined with their separator
                output.push(section.join(separator));
            } else {
                // Other sections are added as individual lines
                output.push(...section);
            }
        }

        // Handle custom footer if specified
        if (displayConfig.footer) {
            output.push(displayConfig.footer);
        }

        return output.join('\n');
    }

    // Evaluate template conditions with enhanced syntax support
    function evaluateTemplateCondition(condition, entity, componentData) {
        if (!condition) return true;

        try {
            // Replace field references with actual values
            const evaluable = condition.replace(/\{([^}]+)\}/g, (match, path) => {
                // Navigate the path starting from component data
                const parts = path.split('.');
                let value = componentData;

                for (const part of parts) {
                    value = value?.[part];
                    if (value === undefined) return 'undefined';
                }

                return JSON.stringify(value);
            });

            // Handle Object.keys().length checks
            if (evaluable.includes('Object.keys')) {
                const match = evaluable.match(/Object\.keys\((\w+)\)\.length\s*>\s*(\d+)/);
                if (match) {
                    const component = entity[match[1]];
                    const threshold = parseInt(match[2]);
                    if (component) {
                        // Exclude 'display' field when counting component keys
                        const dataKeys = Object.keys(component).filter(k => k !== 'display');
                        return dataKeys.length > threshold;
                    }
                    return false;
                }
            }

            // Handle array length checks
            if (evaluable.includes('.length')) {
                const match = evaluable.match(/"([^"]*)"\.length\s*>\s*(\d+)/);
                if (match) {
                    return match[1].length > parseInt(match[2]);
                }
                // Also handle array.length
                const arrayMatch = evaluable.match(/\[([^\]]*)\]\.length\s*>\s*(\d+)/);
                if (arrayMatch) {
                    try {
                        const arr = JSON.parse(`[${arrayMatch[1]}]`);
                        return arr.length > parseInt(arrayMatch[2]);
                    } catch (e) {
                        return false;
                    }
                }
            }

            // Simple truthy/falsy checks
            if (evaluable === 'true') return true;
            if (evaluable === 'false') return false;
            if (evaluable === 'undefined' || evaluable === 'null') return false;

            // Handle logical operators (||, &&, ===, !==, etc.)
            // Safe evaluation for simple expressions
            try {
                // Only allow safe operations - no function calls or complex code
                if (/^[\d\s"'truefalsenuludefined\|\|&&===!==<><=>=\+\-\*\/\(\)]+$/.test(evaluable)) {
                    // Use eval for evaluation (Function constructor not available in AI Dungeon)
                    const result = eval(evaluable);
                    return !!result; // Convert to boolean
                }
            } catch (e) {
                // If evaluation fails, continue to default
            }

            // Default to true if we can't evaluate
            return true;
        } catch (e) {
            if (debug) console.log(`${MODULE_NAME}: Failed to evaluate condition: ${condition}`);
            return true;
        }
    }

    // Format template strings with enhanced wildcard and function support
    function formatTemplateString(format, entity, componentData, componentName) {
        if (!format) return '';

        // First try using TemplateParser for field-based iteration patterns like {field.*→}
        // This handles the new syntax properly
        if (format.includes('.*→') || format.includes('.*|') || format.includes('.*:')) {
            // Create a data context that includes the component data
            const templateData = componentData || {};
            if (debug && componentName === 'rewards') {
                console.log(`${MODULE_NAME}: Parsing rewards format with TemplateParser`);
                console.log(`${MODULE_NAME}: Format: ${format}`);
                console.log(`${MODULE_NAME}: Data keys:`, Object.keys(templateData));
                if (templateData.items) {
                    console.log(`${MODULE_NAME}: Items:`, Object.keys(templateData.items));
                }
            }
            const parser = new TemplateParser(templateData);
            return parser.parse(format);
        }

        let result = format;

        // Legacy: Handle old-style wildcard patterns {*→ template} or {*\: template}
        // These iterate over the current component's data
        const hasArrowPattern = format.includes('{*→');
        const hasLegacyPattern = format.includes('{*\\:');

        if (hasArrowPattern || hasLegacyPattern) {
            const patternToFind = hasArrowPattern ? '{*→' : '{*\\:';
            // Find the complete pattern by counting braces
            const startIndex = format.indexOf(patternToFind);
            if (startIndex !== -1) {
                let braceCount = 0;
                let endIndex = -1;

                for (let i = startIndex; i < format.length; i++) {
                    if (format[i] === '{') braceCount++;
                    if (format[i] === '}') {
                        braceCount--;
                        if (braceCount === 0) {
                            endIndex = i;
                            break;
                        }
                    }
                }

                if (endIndex !== -1) {
                    const fullPattern = format.substring(startIndex, endIndex + 1);
                    const skipLength = hasArrowPattern ? 3 : 4; // Skip '{*→' (3 chars) or '{*\:' (4 chars)
                    const template = format.substring(startIndex + skipLength, endIndex); // Skip pattern prefix and final '}'

                    if (componentData && typeof componentData === 'object') {
                        const items = [];

                        // Iterate over component data entries
                        for (const [key, value] of Object.entries(componentData)) {
                    // Skip the display property itself
                    if (key === 'display') continue;

                    let itemResult = template.trim();

                    // Replace nested wildcards in order of specificity
                    // {*.property.subproperty}
                    itemResult = itemResult.replace(/\{\*\.([^}]+)\}/g, (match, path) => {
                        const parts = path.split('.');
                        let val = value;
                        for (const part of parts) {
                            val = val?.[part];
                            if (val === undefined) return '';
                        }
                        return val !== null && val !== undefined ? val : '';
                    });

                    // {*} represents the key itself
                    itemResult = itemResult.replace(/\{\*\}/g, key);

                    // Replace function calls like {getRelationshipFlavor(*, name, *)}
                    itemResult = itemResult.replace(/\{(\w+)\(([^)]+)\)\}/g, (match, funcName, args) => {
                        return evaluateTemplateFunction(funcName, args, entity, key, value);
                    });

                    if (itemResult.trim()) {
                        items.push(itemResult);
                    }
                }

                        if (items.length > 0) {
                            const separator = '\n'; // Default to newline for wildcard expansions
                            result = result.replace(fullPattern, items.join(separator));
                        } else {
                            return ''; // No items, return empty
                        }
                    }
                }
            }
        }

        // Handle regular field references {field.path}
        result = result.replace(/\{([^}]+)\}/g, (match, expression) => {
            // Check if it's a function call
            const funcMatch = expression.match(/^(\w+)\(([^)]*)\)$/);
            if (funcMatch) {
                const [, funcName, args] = funcMatch;
                return evaluateTemplateFunction(funcName, args, entity, null, null);
            }

            // Regular path navigation
            const parts = expression.split('.');
            let value = componentData;

            for (const part of parts) {
                value = value?.[part];
                if (value === undefined) {
                    // Try looking in entity root
                    value = entity;
                    for (const p of parts) {
                        value = value?.[p];
                        if (value === undefined) return '';
                    }
                    break;
                }
            }

            return value !== null && value !== undefined ? value : '';
        });

        return result;
    }

    // Evaluate template functions
    function evaluateTemplateFunction(funcName, args, entity, currentKey, currentValue) {
        // Parse arguments
        const argList = args.split(',').map(arg => arg.trim());

        // Try to find and call the function dynamically
        let targetFunction = null;

        // Check global scope (GameState functions)
        if (typeof eval !== 'undefined') {
            try {
                targetFunction = eval(funcName);
            } catch (e) {
                // Function doesn't exist in global scope
            }
        }

        // Check Library functions as fallback
        if (!targetFunction && Library[funcName] && typeof Library[funcName] === 'function') {
            targetFunction = Library[funcName];
        }

        if (targetFunction) {
            try {
                // Prepare arguments, replacing * with current values
                const processedArgs = argList.map(arg => {
                    if (arg === '*') return currentKey;
                    if (arg === '*.value' && currentValue && typeof currentValue === 'object') return currentValue.value;
                    if (arg === 'id') return entity.id;
                    if (arg === 'name') return entity.name || entity.id;
                    // Try to parse as number
                    if (typeof arg === 'string' && !isNaN(arg)) return parseFloat(arg);
                    return arg;
                });
                return targetFunction(...processedArgs);
            } catch (e) {
                if (debug) console.log(`${MODULE_NAME}: Error calling ${funcName}: ${e.message}`);
                return '';
            }
        }

        return `[${funcName}?]`;
    }

    // Generate Entry field for a display entity
    function generateEntityEntry(entity) {
        if (!entity) return '';

        // Use buildEntityDisplay to generate the formatted text
        const display = buildEntityDisplay(entity);

        // If no display was generated, create a simple default
        if (!display) {
            const name = (entity.aliases && entity.aliases[0]) || 'Unknown Entity';
            return name;
        }

        return display;
    }

    // Build structured data string for entity storage
    function buildStructuredData(entity) {
        if (!entity) return '<== SANE DATA ==>\n{}\n<== END DATA ==>';

        // Wrap the entity data with SANE DATA markers
        let data = '<== SANE DATA ==>\n';
        data += JSON.stringify(entity, null, 2);
        data += '\n<== END DATA ==>';
        return data;
    }

    // Move entity from [SANE:D] to [SANE:E] when display is added
    function moveToEntityCard(entityId, entity) {
        // Mark that it has display
        if (!entity.components) entity.components = [];
        if (!entity.components.includes('display')) {
            entity.components.push('display');
        }

        // Generate Entry field
        const entry = generateEntityEntry(entity);

        // Save to [SANE:E] card
        const cardTitle = `[SANE:E] ${entityId}`;
        const structuredData = buildStructuredData(entity);

        Utilities.storyCard.upsert({
            title: cardTitle,
            entry: entry,
            description: structuredData,
            type: 'SANE'
        });

        // Update entity card map
        entityCardMap[entityId] = cardTitle;

        // Remove from [SANE:D] if it was there
        const dataCards = loadFromDataCards();
        if (dataCards && dataCards[entityId]) {
            delete dataCards[entityId];
            saveToDataCards(dataCards);
        }

        // Update cache
        dataCache[entityId] = entity;
    }

    // Move entity from [SANE:E] to [SANE:D] when display is removed
    function moveToDataCard(entityId, entity) {
        // Remove display component
        if (entity.components) {
            const index = entity.components.indexOf('display');
            if (index !== -1) {
                entity.components.splice(index, 1);
            }
        }

        // Delete display config
        delete entity.display;


        // Load existing data cards for this type
        const dataCards = loadFromDataCards() || {};

        // Add this entity
        dataCards[entityId] = entity;

        // Save to [SANE:D]
        saveToDataCards(dataCards);

        // Remove [SANE:E] card and any overflow cards
        Utilities.storyCard.remove(`[SANE:E] ${entityId}`);
        cleanupOverflowCards(entityId);

        // Update entity card map
        delete entityCardMap[entityId];

        // Update cache
        dataCache[entityId] = entity;
    }

    // Initialize Display Schema

    // ==========================
    // Blueprint System
    // ==========================
    // Template-based entity creation system with field mapping and inheritance

    // Cache for loaded blueprints
    const blueprintCache = {};

    // Load blueprint from [SANE:BP] card
    function loadBlueprint(blueprintName) {
        // Check cache first
        if (blueprintCache[blueprintName]) {
            return blueprintCache[blueprintName];
        }

        // Load from [SANE:BP] card
        const cardTitle = `[SANE:BP] ${blueprintName}`;
        const card = Utilities.storyCard.get(cardTitle);

        if (!card || !card.description) {
            if (debug) console.log(`${MODULE_NAME}: Blueprint '${blueprintName}' not found`);
            return null;
        }

        // Parse blueprint
        let blueprint;
        try {
            // Extract JSON from between <== SANE DATA ==> tags if present
            let jsonContent = card.description;
            const dataMatch = jsonContent.match(/<==\s*SANE DATA\s*==>([\s\S]*?)<==\s*END DATA\s*==>/);
            if (dataMatch) {
                jsonContent = dataMatch[1];
            }
            blueprint = JSON.parse(jsonContent);
        } catch (e) {
            console.log(`${MODULE_NAME}: Failed to parse blueprint '${blueprintName}': ${e.message}`);
            return null;
        }

        // Validate blueprint structure
        if (!blueprint.id) {
            console.log(`${MODULE_NAME}: Invalid blueprint structure for '${blueprintName}' - missing id`);
            return null;
        }

        // Cache and return
        blueprintCache[blueprintName] = blueprint;
        return blueprint;
    }

    // Create entity from blueprint
    function instantiateBlueprint(blueprintName, data = {}) {
        // Load blueprint
        const blueprint = loadBlueprint(blueprintName);
        if (!blueprint) {
            console.log(`${MODULE_NAME}: Cannot instantiate - blueprint '${blueprintName}' not found`);
            return null;
        }

        // Merge blueprint with provided data
        const entity = Utilities.collection.deepMerge(blueprint, data);

        // Generate unique ID if not provided
        entity.id = data.id || `${blueprintName.toLowerCase()}_${Date.now()}`;

        // Normalize ID to lowercase
        const normalizedId = entity.id.toLowerCase();
        entity.id = normalizedId;

        // Save entity
        save(normalizedId, entity);

        // If entity has generationwizard component with state 'queued',
        // GenerationWizard will pick it up on next context hook
        if (entity.generationwizard?.state === 'queued') {
            if (debug) console.log(`${MODULE_NAME}: Entity ${normalizedId} queued for generation`);
        }

        return normalizedId;
    }

    function saveEntity(entityId, entity) {
        // if (debug) console.log(`${MODULE_NAME}: saveEntity called for ${entityId}`);

        // Clean up any existing overflow cards first
        cleanupOverflowCards(entityId);

        // Determine if entity should have display card (must have active display)
        if (hasDisplayComponent(entity)) {
            // if (debug) console.log(`${MODULE_NAME}: saveEntity: Entity has active display component`);

            // Save to [SANE:E] card with display
            const entry = buildEntityDisplay(entity);
            if (!entry) {
                console.log(`${MODULE_NAME}: saveEntity: buildEntityDisplay returned empty for ${entityId}`);
            }

            // Build data section with markers
            const dataSection = buildEntityData(entityId, entity);
            if (!dataSection) {
                console.log(`${MODULE_NAME}: saveEntity: buildEntityData returned empty for ${entityId}`);
                return false;
            }

            // Handle overflow if entity is too large
            if (dataSection.length > 9500) {
                // Split entity data across overflow cards
                const chunks = [];
                let currentChunk = '';
                const MAX_CHUNK = 9000;

                for (let i = 0; i < dataSection.length; i += MAX_CHUNK) {
                    chunks.push(dataSection.substring(i, i + MAX_CHUNK));
                }

                // Save main card with overflow marker
                const cardTitle = `[SANE:E] ${entityId}`;
                const existingCard = Utilities.storyCard.get(cardTitle);
                const upsertData = {
                    title: cardTitle,
                    entry: entry,
                    description: chunks[0] + '~~1~~',
                    type: 'story'
                };

                // Only set keys if this is a new card
                if (!existingCard) {
                    upsertData.keys = generateEntityKeys(entityId, entity);
                }

                Utilities.storyCard.upsert(upsertData);

                // Save overflow cards
                for (let i = 1; i < chunks.length; i++) {
                    const marker = i < chunks.length - 1 ? `~~${i+1}~~` : '';
                    Utilities.storyCard.upsert({
                        title: `[SANE:E] ${entityId} ~${i}~`,
                        entry: `# ${entityId} Overflow ${i}`,
                        description: chunks[i] + marker,
                        type: 'data'
                    });
                }
            } else {
                // Normal save without overflow
                try {
                    const cardTitle = `[SANE:E] ${entityId}`;
                    const existingCard = Utilities.storyCard.get(cardTitle);
                    const upsertData = {
                        title: cardTitle,
                        entry: entry,
                        description: dataSection,
                        type: 'story'
                    };

                    // Only set keys if this is a new card
                    if (!existingCard) {
                        upsertData.keys = generateEntityKeys(entityId, entity);
                    }

                    Utilities.storyCard.upsert(upsertData);
                } catch (e) {
                    console.log(`${MODULE_NAME}: saveEntity: Failed to upsert card [SANE:E] ${entityId}: ${e.message}`);
                    return false;
                }
            }

            // Update card map
            entityCardMap[entityId] = `[SANE:E] ${entityId}`;
            return true; // Successfully saved to [SANE:E] card
        } else {
            // Save to [SANE:D] collection
            // Load existing data
            const existingData = loadFromDataCards() || {};

            // Add/update this entity
            existingData[entityId] = entity;

            // Save back to cards
            saveToDataCards(existingData);
            return true; // Successfully saved to [SANE:D] card
        }
    }

    // Helper to check if entity has ACTIVE display component
    function hasDisplayComponent(entity) {
        // Check if entity has display in components array
        if (entity.components && Array.isArray(entity.components)) {
            if (!entity.components.includes('display')) {
                return false;
            }
        } else {
            return false;
        }

        // Check if display component is active
        if (entity.display && typeof entity.display === 'object') {
            const active = entity.display.active === true;
            // if (debug) console.log(`${MODULE_NAME}: hasDisplayComponent: display.active = ${entity.display.active}, returning ${active}`);
            return active; // Only true if explicitly set to true
        }

        // Has display component but no display object - consider it inactive
        // if (debug) console.log(`${MODULE_NAME}: hasDisplayComponent: No display object found, returning false`);
        return false;
    }

    function loadEntityFromCard(cardTitle) {
        const mainCard = Utilities.storyCard.get(cardTitle);
        if (!mainCard) return null;

        let dataStr = mainCard.description || '';

        // Check for overflow marker ~~N~~
        const overflowMatch = dataStr.match(/~~(\d+)~~$/);
        if (overflowMatch) {
            // Has overflow cards - load and concatenate them
            const chunks = [dataStr.replace(/~~\d+~~$/, '')];
            let nextIndex = parseInt(overflowMatch[1]);

            // Extract base title for overflow cards
            const baseTitle = cardTitle.replace(/^\[SANE:E\] /, '');

            while (nextIndex) {
                const overflowCard = Utilities.storyCard.get(`[SANE:E] ${baseTitle} ~${nextIndex}~`);
                if (!overflowCard) {
                    console.log(`${MODULE_NAME}: Missing overflow card ${nextIndex} for ${cardTitle}`);
                    break;
                }

                const overflowData = overflowCard.description || '';
                const nextMatch = overflowData.match(/~~(\d+)~~$/);

                if (nextMatch) {
                    chunks.push(overflowData.replace(/~~\d+~~$/, ''));
                    nextIndex = parseInt(nextMatch[1]);
                } else {
                    chunks.push(overflowData);
                    nextIndex = 0; // No more overflow
                }
            }

            dataStr = chunks.join('');
        }

        // Parse entity data from between markers
        return parseEntityData(dataStr);
    }

    // Clean up old overflow cards when updating/deleting entities
    function cleanupOverflowCards(entityId) {
        // Remove any existing overflow cards for this entity
        let overflowIndex = 1;
        let removed = 0;

        while (true) {
            const overflowTitle = `[SANE:E] ${entityId} ~${overflowIndex}~`;
            const card = Utilities.storyCard.get(overflowTitle);

            if (!card) break;

            Utilities.storyCard.remove(overflowTitle);
            removed++;
            overflowIndex++;
        }

        if (removed > 0 && debug) {
            console.log(`${MODULE_NAME}: Cleaned up ${removed} overflow cards for ${entityId}`);
        }
    }

    // Delete entity and clean up all associated data
    function deleteEntity(entityId) {
        // Get entity to find all aliases
        const entity = dataCache[entityId] || loadEntityFromCard(`[SANE:E] ${entityId}`);

        if (!entity) {
            console.log(`${MODULE_NAME}: Entity ${entityId} not found for deletion`);
            return false;
        }

        // Remove from alias map
        if (entity.aliases) {
            for (const alias of entity.aliases) {
                delete entityAliasMap[alias];
            }
        }

        // Remove from cache
        delete dataCache[entityId];

        // Remove main card
        Utilities.storyCard.remove(`[SANE:E] ${entityId}`);

        // Clean up overflow cards
        cleanupOverflowCards(entityId);

        // Remove from card map
        delete entityCardMap[entityId];

        // If entity was in [SANE:D] collection, remove it
        const existingData = loadFromDataCards() || {};
        if (existingData[entityId]) {
            delete existingData[entityId];
            saveToDataCards(existingData);
        }

        if (debug) console.log(`${MODULE_NAME}: Deleted entity ${entityId}`);
        return true;
    }

    // ==========================
    // Entity Management Functions
    // ==========================

    function addComponent(entityId, componentName) {
        // Load entity
        const entity = dataCache[entityId] || loadEntityFromCard(`[SANE:E] ${entityId}`);
        if (!entity) {
            console.log(`${MODULE_NAME}: Entity ${entityId} not found`);
            return false;
        }

        // Check if component already exists
        if (entity[componentName]) {
            console.warn(`${MODULE_NAME}: Component ${componentName} already exists on ${entityId}`);
            return false;
        }

        // Load component schema
        const componentSchema = dataCache[`schema.${componentName}`] || loadSchemaIntoCache(componentName);
        if (!componentSchema) {
            console.log(`${MODULE_NAME}: Component schema ${componentName} not found`);
            return false;
        }

        // Initialize component with defaults
        entity[componentName] = JSON.parse(JSON.stringify(componentSchema.defaults || {}));

        // Update components array
        if (!entity.components) {
            entity.components = [];
        }
        if (!entity.components.includes(componentName)) {
            entity.components.push(componentName);
        }

        // Handle display component special case
        if (componentName === 'display') {
            // Initialize display settings from all existing components
            entity.display = entity.display || {
                active: false  // Default to inactive until explicitly activated
            };

            // Iterate through all components to find *.display properties
            if (entity.components) {
                for (const compName of entity.components) {
                    if (compName === 'display' || !entity[compName]) continue;

                    // Recursively search for display properties in component data
                    const findDisplaySettings = (obj, path = '') => {
                        if (!obj || typeof obj !== 'object') return;

                        for (const [key, value] of Object.entries(obj)) {
                            if (key === 'display' && typeof value === 'object') {
                                // Found a display property - merge it into entity.display
                                const displayPath = path ? `${compName}.${path}` : compName;
                                if (!entity.display[displayPath]) {
                                    entity.display[displayPath] = value;
                                }
                            } else if (typeof value === 'object' && key !== 'display') {
                                // Recurse into nested objects
                                const newPath = path ? `${path}.${key}` : key;
                                findDisplaySettings(value, newPath);
                            }
                        }
                    };

                    findDisplaySettings(entity[compName]);
                }
            }

            // Move from [SANE:D] to [SANE:E]
            moveToEntityCard(entityId, entity);
        } else {
            // Save updated entity using proper save function
            save(entityId, entity);
        }

        if (debug) console.log(`${MODULE_NAME}: Added component ${componentName} to ${entityId}`);
        return true;
    }

    function removeComponent(entityId, componentName) {
        // Load entity
        const entity = dataCache[entityId] || loadEntityFromCard(`[SANE:E] ${entityId}`);
        if (!entity) {
            console.log(`${MODULE_NAME}: Entity ${entityId} not found`);
            return false;
        }

        // Check if component exists
        if (!entity[componentName]) {
            console.warn(`${MODULE_NAME}: Component ${componentName} not found on ${entityId}`);
            return false;
        }

        // Delete the component
        delete entity[componentName];

        // Update components array
        if (entity.components && Array.isArray(entity.components)) {
            const index = entity.components.indexOf(componentName);
            if (index !== -1) {
                entity.components.splice(index, 1);
            }
        }

        // Handle display component special case
        if (componentName === 'display') {
            // Move from [SANE:E] to [SANE:D]
            moveToDataCard(entityId, entity);
        } else {
            // Save updated entity using proper save function
            save(entityId, entity);
        }

        if (debug) console.log(`${MODULE_NAME}: Removed component ${componentName} from ${entityId}`);
        return true;
    }

    // Change the actual entity ID (storage key)
    function changeEntityId(oldId, newId) {
        // Load entity
        const entity = get(oldId);
        if (!entity) {
            console.log(`${MODULE_NAME}: Entity ${oldId} not found`);
            return false;
        }

        // First do a direct check - does a card with this ID already exist?
        const existingCard = Utilities.storyCard.get(`[SANE:E] ${newId}`);
        if (existingCard) {
            console.log(`${MODULE_NAME}: changeEntityId: ERROR - Entity card [SANE:E] ${newId} already exists!`);
            return false;
        }

        // Check if new ID conflicts with existing entities or aliases
        if (entityAliasMap[newId] && entityAliasMap[newId] !== newId) {
            const owningEntity = entityAliasMap[newId];
            console.log(`${MODULE_NAME}: changeEntityId(): ERROR - New ID "${newId}" is already used as an alias for entity "${owningEntity}"`);
            return false;
        }

        // Also check if new ID is already taken via get()
        const existingEntity = get(newId);  // Use get() to load from cards if not cached
        if (existingEntity && existingEntity !== entity) {
            console.log(`${MODULE_NAME}: changeEntityId: Entity ID ${newId} already exists`);
            return false;
        }

        // Delete the old entity card FIRST (before cache cleanup)
        Utilities.storyCard.remove(`[SANE:E] ${oldId}`);
        cleanupOverflowCards(oldId);

        // Also remove from [SANE:D] data cards if it exists there
        const dataCards = loadFromDataCards() || {};
        if (dataCards[oldId]) {
            delete dataCards[oldId];
            saveToDataCards(dataCards);
            if (debug) console.log(`${MODULE_NAME}: Removed ${oldId} from [SANE:D] data cards`);
        }

        // Clean up alias map entries for the old ID
        delete entityAliasMap[oldId];
        if (entity.aliases) {
            for (const alias of entity.aliases) {
                if (entityAliasMap[alias] === oldId) {
                    delete entityAliasMap[alias];
                }
            }
        }

        // DON'T delete cache entries yet - save() needs them for duplicate checking
        // We'll update them after successful save

        // Initialize aliases array if needed, but don't add the ID to its own aliases
        if (!entity.aliases) {
            entity.aliases = [];
        }

        // Update the entity's id field to match the new ID
        entity.id = newId;

        // Save with new ID (this creates the new card)
        const saveResult = save(newId, entity);
        if (!saveResult) {
            console.log(`${MODULE_NAME}: changeEntityId: Failed to save entity with new ID ${newId}`);
            console.log(`${MODULE_NAME}: changeEntityId: Entity aliases at save time:`, entity.aliases);
            console.log(`${MODULE_NAME}: changeEntityId: Save returned:`, saveResult);
            // Restore alias mappings since rename failed
            if (entity.aliases) {
                for (const alias of entity.aliases) {
                    entityAliasMap[alias] = oldId;
                }
            }
            // Save with original ID
            save(oldId, entity);
            return false;
        }

        // NOW clean up the old cache entries after successful save
        delete dataCache[oldId];
        delete entityCardMap[oldId];
        if (entity.aliases) {
            for (const alias of entity.aliases) {
                delete dataCache[alias];
            }
        }

        // Re-register all aliases to point to new ID (but not the ID itself)
        if (entity.aliases) {
            for (const alias of entity.aliases) {
                entityAliasMap[alias] = newId;
            }
        }

        if (debug) console.log(`${MODULE_NAME}: Changed entity ID from ${oldId} to ${newId}`);
        return true;
    }

    function loadSchemaIntoCache(schemaId) {
        // Validate schemaId
        if (!schemaId || typeof schemaId !== 'string') {
            if (debug) console.log(`${MODULE_NAME}: Invalid schemaId: ${schemaId}`);
            return null;
        }

        // Check if already cached (with schema. prefix)
        if (dataCache[`schema.${schemaId}`]) {
            return dataCache[`schema.${schemaId}`];
        }

        // Try to find a schema card containing this schema
        const schemaCards = Utilities.storyCard.find(
            card => card.title && card.title.startsWith('[SANE:S]'),
            true
        ) || [];

        for (const card of schemaCards) {
            try {
                const schema = JSON.parse(card.description || '{}');
                if (schema.id === schemaId) {
                    // Found it - store in schema.* namespace ONLY
                    dataCache[`schema.${schemaId}`] = schema;
                    return schema;
                }
            } catch (e) {
                // Continue searching
            }
        }

        // Schema not found
        return null;
    }

    // Support array syntax in paths
    function parsePathSegment(segment) {
        // Parse segment like "aliases[0]" into {key: "aliases", index: 0}
        const match = segment.match(/^([^\[]+)(?:\[(\d+)\])?$/);
        if (!match) return null;

        return {
            key: match[1],
            index: match[2] !== undefined ? parseInt(match[2], 10) : undefined
        };
    }

    function processEvalDirectives(obj, context) {
        // Process @eval directives in object
        if (!obj || typeof obj !== 'object') return;

        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string' && value.startsWith('@eval ')) {
                const code = value.substring(6);
                try {
                    const evalContext = {
                        entity: context,
                        Math: Math,
                        Date: Date,
                        JSON: JSON,
                        // GameState utilities available
                        // get: (path) => get(path),
                        // set: (path, val) => set(path, val),
                        // resolve: (path) => resolve(path),
                        // random: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
                        // roll: (dice) => rollDice(dice),
                        // tool: (toolStr) => executeToolString(toolStr)
                    };
                    const func = new Function(...Object.keys(evalContext), `return ${code}`);
                    obj[key] = func(...Object.values(evalContext));
                } catch (e) {
                    console.log(`${MODULE_NAME}: Failed to eval '${code}': ${e.message}`);
                    // Keep the @eval string for debugging
                }
            } else if (typeof value === 'object' && !Array.isArray(value)) {
                // Recursively process objects but not arrays
                processEvalDirectives(value, context);
            }
        }
    }

    // ==========================
    // GameplayTags System
    // ==========================
    // Hierarchical tagging system for entities (e.g., Location.Dangerous.Trap)

    function parseGameplayTag(tag) {
        // Parse a gameplay tag into its hierarchy
        // e.g., "Location.Dangerous.Trap" -> ["Location", "Dangerous", "Trap"]
        if (!tag || typeof tag !== 'string') return [];
        return tag.split('.').map(t => t.trim()).filter(t => t);
    }

    function matchesTagPattern(tagParts, searchParts) {
        // Support wildcards (*) in search patterns
        // e.g., ["Location", "*"] matches ["Location", "Dangerous", "Trap"]
        // If search has more parts than tag, can't match
        if (searchParts.length > tagParts.length) return false;

        for (let i = 0; i < searchParts.length; i++) {
            const searchPart = searchParts[i];
            const tagPart = tagParts[i];

            // Wildcard matches anything
            if (searchPart === '*') continue;

            // Case-insensitive exact match
            if (searchPart.toLowerCase() !== tagPart.toLowerCase()) {
                return false;
            }
        }

        return true;
    }

    function hasGameplayTag(entity, searchTag) {
        // Check if entity has a specific tag or parent tag
        // e.g., entity with "Location.Dangerous.Trap" matches "Location.Dangerous"
        // Supports wildcards: "Location.*" matches any Location tag
        if (!entity || !entity.GameplayTags) return false;

        const searchParts = parseGameplayTag(searchTag);
        if (searchParts.length === 0) return false;

        for (const tag of entity.GameplayTags) {
            const tagParts = parseGameplayTag(tag);

            // Check if tag matches the search pattern with wildcard support
            if (matchesTagPattern(tagParts, searchParts)) {
                return true;
            }
        }

        return false;
    }

    function addGameplayTag(entity, tag) {
        // Add a gameplay tag to an entity
        if (!entity) return false;
        if (!entity.GameplayTags) entity.GameplayTags = [];

        const normalized = tag.split('.').map(t => t.trim()).filter(t => t).join('.');
        if (!entity.GameplayTags.includes(normalized)) {
            entity.GameplayTags.push(normalized);
            return true;
        }
        return false;
    }

    // ================================
    // GameplayTag Operations
    // ================================

    // Check if entity has exact tag (no parent matching)
    function hasTagExact(entity, searchTag) {
        if (!entity?.GameplayTags) return false;
        return entity.GameplayTags.includes(searchTag);
    }

    // Check if entity has ANY of the specified tags
    function hasAnyTag(entity, searchTags) {
        if (!entity?.GameplayTags || !Array.isArray(searchTags)) return false;

        for (const searchTag of searchTags) {
            if (hasGameplayTag(entity, searchTag)) return true;
        }
        return false;
    }

    // Check if entity has ALL of the specified tags
    function hasAllTags(entity, searchTags) {
        if (!entity?.GameplayTags || !Array.isArray(searchTags)) return false;

        for (const searchTag of searchTags) {
            if (!hasGameplayTag(entity, searchTag)) return false;
        }
        return true;
    }

    // Remove a specific tag from entity
    function removeTag(entity, tagToRemove) {
        if (!entity?.GameplayTags) return false;

        const index = entity.GameplayTags.indexOf(tagToRemove);
        if (index === -1) return false;

        entity.GameplayTags.splice(index, 1);
        return true;
    }

    // Clear all tags from entity
    function clearTags(entity) {
        if (!entity) return false;
        entity.GameplayTags = [];
        return true;
    }

    // Get parent tag (Character.Player.Hero -> Character.Player)
    function getTagParent(tag) {
        const parts = parseGameplayTag(tag);
        if (parts.length <= 1) return null;

        parts.pop();
        return parts.join('.');
    }

    // Get tag depth (Character.Player.Hero -> 3)
    function getTagDepth(tag) {
        return parseGameplayTag(tag).length;
    }

    // Check if one tag is parent of another
    function isTagParent(parentTag, childTag) {
        const parentParts = parseGameplayTag(parentTag);
        const childParts = parseGameplayTag(childTag);

        if (parentParts.length >= childParts.length) return false;

        for (let i = 0; i < parentParts.length; i++) {
            if (parentParts[i] !== childParts[i]) return false;
        }

        return true;
    }

    // Check if containers share at least one tag
    function hasTagOverlap(container1, container2) {
        if (!container1 || !container2) return false;

        for (const tag of container1) {
            if (container2.includes(tag)) return true;
        }
        return false;
    }

    // Get all unique tags from loaded entities
    function getAllUniqueTags() {
        const tags = new Set();

        for (const entity of Object.values(dataCache)) {
            if (entity?.GameplayTags) {
                for (const tag of entity.GameplayTags) {
                    tags.add(tag);
                }
            }
        }

        return Array.from(tags).sort();
    }

    // Component-level tag support
    function hasComponentTag(entity, componentName, searchTag) {
        const component = entity?.[componentName];
        if (!component?.GameplayTags) return false;

        // Use same hierarchical matching as entity tags
        const searchParts = parseGameplayTag(searchTag);
        for (const tag of component.GameplayTags) {
            const tagParts = parseGameplayTag(tag);
            if (matchesTagPattern(tagParts, searchParts)) {
                return true;
            }
        }
        return false;
    }

    function addComponentTag(entity, componentName, tag) {
        if (!entity) return false;

        const component = entity[componentName];
        if (!component) return false;

        if (!component.GameplayTags) component.GameplayTags = [];
        if (component.GameplayTags.includes(tag)) return false;

        component.GameplayTags.push(tag);
        return true;
    }

    function removeComponentTag(entity, componentName, tag) {
        const component = entity?.[componentName];
        if (!component?.GameplayTags) return false;

        const index = component.GameplayTags.indexOf(tag);
        if (index === -1) return false;

        component.GameplayTags.splice(index, 1);
        return true;
    }

    // Load all entities from both [SANE:D] and [SANE:E] cards into dataCache
    function loadAllEntities() {
        // Load entities from [SANE:D] Data cards
        const dataCardEntities = loadFromDataCards();

        // Store all data card entities in cache
        for (const entityId in dataCardEntities) {
            dataCache[entityId] = dataCardEntities[entityId];
        }

        // Also load entities from [SANE:E] Entity cards
        const entityCards = Utilities.storyCard.find(
            card => card.title && card.title.startsWith('[SANE:E]'),
            true  // Get all matching cards
        ) || [];

        let loadedCount = 0;
        for (const card of entityCards) {
            try {
                const entities = parseEntityData(card.description || '');
                for (const entityId in entities) {
                    // Store in dataCache for querying
                    dataCache[entityId] = entities[entityId];
                    loadedCount++;
                }
            } catch (e) {
                if (debug) console.log(`${MODULE_NAME}: Failed to load entity from ${card.title}: ${e.message}`);
            }
        }

        if (debug) console.log(`${MODULE_NAME}: Loaded ${loadedCount} entities from [SANE:E] cards`);
    }

    function queryTags(query) {

        // Query entities using either a predicate function or tag expression
        // query: function(entity) => boolean OR string tag expression
        // Returns: array of matching entities
        // Examples:
        //   queryTags('Character')                    // All characters
        //   queryTags('Character.NPC')                // All NPCs
        //   queryTags('Character && Elite')           // Characters with Elite tag
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
        // If query is a simple tag string (no operators)
        else if (typeof query === 'string' && !query.includes(' && ') && !query.includes(' || ') &&
                 !query.includes('!') && !query.includes('(') && !query.includes(')')) {
            // Simple tag match
            predicate = entity => hasGameplayTag(entity, query);
        }
        // Complex tag expression
        else if (typeof query === 'string') {
            // Parse tag expression: "Character && !Monster", "Location || Quest", etc.
            predicate = parseTagExpression(query);
        }
        else {
            // Invalid query
            if (debug) console.log(`${MODULE_NAME}: Invalid query type: ${typeof query}`);
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
                if (debug) console.log(`${MODULE_NAME}: Error in queryTags predicate for ${key}: ${e.message}`);
            }
        }

        return results;
    }

    function parseTagExpression(expression) {
        // Parse complex tag expressions like "Character && !Monster" or "Location || Quest"
        // Returns a predicate function

        // Simple implementation - can be expanded for more complex expressions
        const tokens = expression.split(/\s+/);

        return entity => {
            let i = 0;
            let result = true;
            let currentOp = '&&';

            while (i < tokens.length) {
                const token = tokens[i];

                if (token === '&&' || token === '||') {
                    currentOp = token;
                    i++;
                    continue;
                }

                let negate = false;
                let tag = token;

                if (token.startsWith('!')) {
                    negate = true;
                    tag = token.substring(1);
                }

                const hasTag = hasGameplayTag(entity, tag);
                const tagResult = negate ? !hasTag : hasTag;

                if (i === 0) {
                    result = tagResult;
                } else if (currentOp === '&&') {
                    result = result && tagResult;
                } else if (currentOp === '||') {
                    result = result || tagResult;
                }

                i++;
            }

            return result;
        };
    }

    // ==========================
    // Alias Management Functions
    // ==========================
    // Entity IDs and aliases must be globally unique across ALL entities

    function isAliasAvailable(alias) {
        // Check if an alias/ID is available (not used by any entity)
        if (!alias || typeof alias !== 'string') return false;

        const normalized = String(alias).trim().toLowerCase();
        if (!normalized) return false;

        // Check dataCache for any existing entity with this alias
        const existing = dataCache[normalized];
        return !existing; // Available if nothing found
    }

    function addEntityAlias(entityId, newAlias) {
        // Add a new alias to an entity, ensuring global uniqueness
        if (!entityId || !newAlias) return false;

        const entity = get(entityId);
        if (!entity) {
            console.log(`${MODULE_NAME}: Cannot add alias - entity "${entityId}" not found`);
            return false;
        }

        const normalized = String(newAlias).trim();
        if (!normalized) return false;

        // Check if alias is already used
        if (!isAliasAvailable(normalized)) {
            const existing = dataCache[normalized];
            if (existing === entity) {
                // Already has this alias
                return true;
            }
            console.log(`${MODULE_NAME}: Cannot add alias "${normalized}" - already used by entity "${existing.name}"`);
            return false;
        }

        // Add the alias
        if (!entity.aliases) entity.aliases = [];
        if (!entity.aliases.includes(normalized)) {
            entity.aliases.push(normalized);
            // Cache the new alias
            dataCache[normalized] = entity;
        }

        return true;
    }

    function removeEntityAlias(entityId, aliasToRemove) {
        // Remove an alias from an entity
        const entity = get(entityId);
        if (!entity || !entity.aliases) return false;

        const normalized = String(aliasToRemove).trim();

        // Remove from aliases array
        const index = entity.aliases.indexOf(normalized);
        if (index >= 0) {
            entity.aliases.splice(index, 1);
            // Remove from cache
            if (dataCache[normalized] === entity) {
                delete dataCache[normalized];
            }
            return true;
        }

        return false;
    }

    // ==========================
    // Global Variables System
    // ==========================

    // Load variable definitions from [SANE:G] Variables
    function loadVariableDefinitions() {
        // Load from [SANE:G] Variables card
        const vardefCard = Utilities.storyCard.get('[SANE:G] Variables');
        if (!vardefCard) {
            if (debug) console.log(`${MODULE_NAME}: No [SANE:G] Variables card found`);
            return {};
        }

        const vardefs = {};

        // Parse the simple text format:
        // variableName: type // description
        const content = (vardefCard.entry || '') + '\n' + (vardefCard.description || '');
        const lines = content.split('\n');

        for (const line of lines) {
            // Skip empty lines and comments
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;

            // Parse format: "variableName: type = defaultValue // description"
            // or: "variableName: type // description"
            const match = trimmed.match(/^(\w+)\s*:\s*(\w+)(?:\s*=\s*([^\/]+))?(?:\s*\/\/\s*(.*))?$/);
            if (match) {
                const [, varName, type, defaultValue, description] = match;

                // Validate type is recognized
                const validTypes = ['integer', 'float', 'number', 'string', 'boolean', 'array', 'object'];
                if (!validTypes.includes(type)) {
                    console.log(`${MODULE_NAME}: Invalid type '${type}' for variable '${varName}'`);
                    continue;
                }

                // Create variable definition
                const def = {
                    type: type,
                    description: description || ''
                };

                // Parse default value if provided
                if (defaultValue) {
                    const trimmedDefault = defaultValue.trim();
                    switch (type) {
                        case 'integer':
                            def.default = parseInt(trimmedDefault) || 0;
                            break;
                        case 'float':
                            def.default = parseFloat(trimmedDefault) || 0;
                            break;
                        case 'boolean':
                            def.default = trimmedDefault === 'true';
                            break;
                        case 'string':
                            // Remove quotes if present
                            def.default = trimmedDefault.replace(/^["']|["']$/g, '');
                            break;
                        case 'array':
                            try {
                                def.default = JSON.parse(trimmedDefault);
                            } catch {
                                def.default = [];
                            }
                            break;
                        case 'object':
                            try {
                                def.default = JSON.parse(trimmedDefault);
                            } catch {
                                def.default = {};
                            }
                            break;
                    }
                }

                vardefs[varName] = def;

                // Store in dataCache with 'vardef.' prefix
                dataCache['vardef.' + varName] = def;
            }
        }

        if (debug) console.log(`${MODULE_NAME}: Loaded ${Object.keys(vardefs).length} variable definitions`);
        return vardefs;
    }

    function loadGlobalVariables() {
        // Load variable definitions from [SANE:G] Variables
        loadVariableDefinitions();

        // Load or create Global entity from [SANE:D] Data cards
        let globalEntity = dataCache['Global'];
        if (!globalEntity) {
            // Try loading from [SANE:D] cards
            const dataCards = loadFromDataCards();
            if (dataCards && dataCards['Global']) {
                globalEntity = dataCards['Global'];
                dataCache['Global'] = globalEntity;
            } else {
                // Create new Global entity with default structure
                globalEntity = {
                    id: 'Global'  // Use id instead of name, no type field
                };

                // Initialize with defaults from variable definitions
                const vardefs = loadVariableDefinitions();
                for (const [varName, def] of Object.entries(vardefs)) {
                    // Initialize with default value if specified, otherwise use type default
                    if (globalEntity[varName] === undefined) {
                        if (def.default !== undefined) {
                            globalEntity[varName] = def.default;
                        } else {
                            // Use type-based default
                            switch (def.type) {
                                case 'integer':
                                case 'float':
                                    globalEntity[varName] = 0;
                                    break;
                                case 'string':
                                    globalEntity[varName] = '';
                                    break;
                                case 'boolean':
                                    globalEntity[varName] = false;
                                    break;
                                case 'array':
                                    globalEntity[varName] = [];
                                    break;
                                case 'object':
                                    globalEntity[varName] = {};
                                    break;
                            }
                        }
                    }
                }

                dataCache['Global'] = globalEntity;
                // Save to [SANE:D] cards
                saveToDataCards({ Global: globalEntity });
            }
        }

        return globalEntity;
    }
    
    // Save data to [SANE:D] cards with overflow handling
    function saveToDataCards(allData) {
        const dataType = 'Data';

        // Split data into chunks if it exceeds 9500 chars
        const chunks = [];
        let currentChunk = {};
        let currentSize = 0;
        const MAX_SIZE = 9000; // Leave buffer for card metadata

        for (const [key, value] of Object.entries(allData)) {
            const entryStr = JSON.stringify({[key]: value});
            const entrySize = entryStr.length;

            // If single entry is too large, we need to handle overflow
            if (entrySize > MAX_SIZE) {
                console.log(`${MODULE_NAME}: Entity '${key}' is too large (${entrySize} chars) to fit in a single card`);
                // For now, skip it - in future could implement entity splitting
                continue;
            }

            // Check if adding this entry would exceed the limit
            if (currentSize + entrySize > MAX_SIZE) {
                // Save current chunk and start new one
                chunks.push(currentChunk);
                currentChunk = {};
                currentSize = 0;
            }

            currentChunk[key] = value;
            currentSize += entrySize;
        }

        // Add remaining chunk
        if (Object.keys(currentChunk).length > 0) {
            chunks.push(currentChunk);
        }

        // If no data left, save an empty card to clear the old data
        if (chunks.length === 0) {
            Utilities.storyCard.upsert({
                title: `[SANE:D] ${dataType}`,
                entry: `${dataType} data chunk 1 of 1`,
                description: '{}',
                type: 'data'
            });
            if (debug) console.log(`${MODULE_NAME}: Cleared [SANE:D] ${dataType} - no entities remain`);

            // Also clean up any overflow cards since we have no data
            let overflowIndex = 2;
            while (Utilities.storyCard.get(`[SANE:D] ${dataType}~~${overflowIndex}~~`)) {
                Utilities.storyCard.remove(`[SANE:D] ${dataType}~~${overflowIndex}~~`);
                if (debug) console.log(`${MODULE_NAME}: Deleted overflow card [SANE:D] ${dataType}~~${overflowIndex}~~`);
                overflowIndex++;
            }
            return 0;
        }

        // Save chunks to [SANE:D] cards with overflow notation
        chunks.forEach((chunk, index) => {
            const cardTitle = index === 0
                ? `[SANE:D] ${dataType}`
                : `[SANE:D] ${dataType}~~${index + 1}~~`;

            Utilities.storyCard.upsert({
                title: cardTitle,
                entry: `${dataType} data chunk ${index + 1} of ${chunks.length}`,
                description: JSON.stringify(chunk, null, 2),
                type: 'data'
            });

            if (debug) console.log(`${MODULE_NAME}: Saved ${Object.keys(chunk).length} ${dataType} entities to ${cardTitle}`);
        });

        // Clean up old overflow cards
        let overflowIndex = chunks.length + 1;
        let oldCard;
        while ((oldCard = Utilities.storyCard.get(`[SANE:D] ${dataType}~~${overflowIndex}~~`))) {
            Utilities.storyCard.delete(`[SANE:D] ${dataType}~~${overflowIndex}~~`);
            if (debug) console.log(`${MODULE_NAME}: Deleted old overflow card [SANE:D] ${dataType}~~${overflowIndex}~~`);
            overflowIndex++;
        }

        return chunks.length;
    }

    // Load data from all [SANE:D] cards
    function loadFromDataCards() {
        const dataType = 'Data'; // Always use 'Data' for non-display entities

        const allData = {};
        let cardIndex = 0;
        let hasMore = true;

        while (hasMore) {
            const cardTitle = cardIndex === 0
                ? `[SANE:D] ${dataType}`
                : `[SANE:D] ${dataType}~~${cardIndex}~~`;

            const card = Utilities.storyCard.get(cardTitle);
            if (!card) {
                hasMore = false;
                break;
            }

            try {
                const chunkData = JSON.parse(card.description || '{}');
                Object.assign(allData, chunkData);
                if (debug) console.log(`${MODULE_NAME}: Loaded ${Object.keys(chunkData).length} ${dataType} entities from ${cardTitle}`);
            } catch (e) {
                console.log(`${MODULE_NAME}: Failed to parse ${cardTitle}: ${e.message}`);
            }

            cardIndex++;
        }

        return allData;
    }

    // ==========================
    // Custom Tools Loading
    // ==========================
    
    // Store for runtime-loaded tools
    const runtimeTools = {};
    
    function loadRuntimeTools() {
        // Load runtime tools from [SANE_RUNTIME] TOOLS card
        const toolsCard = Utilities.storyCard.get('[SANE_RUNTIME] TOOLS');
        if (!toolsCard) return;
        
        try {
            // Parse the tools from the card (check both entry and description)
            const toolsCode = toolsCard.description || toolsCard.entry || '';
            if (!toolsCode.trim()) return;
            
            // Create context for the tools with proper binding
            const toolContext = {
                GameState: GameState,
                Utilities: Utilities,
                Calendar: typeof Calendar !== 'undefined' ? Calendar : null,
                state: state,
                info: info,
                history: history,
                console: console,
                log: log,
                debug: debug,
                get: get,
                set: set,
                del: del,
                save: save
            };
            
            // Use a simpler approach - just eval the whole tools definition
            // The format should be: toolname: function(...) { ... }, toolname2: function(...) { ... }
            try {
                // Wrap in object literal to make it valid JavaScript
                const wrappedCode = `({${toolsCode}})`;
                const toolDefinitions = eval(wrappedCode);
                
                // Register each tool
                for (const [name, func] of Object.entries(toolDefinitions)) {
                    if (typeof func === 'function') {
                        runtimeTools[name] = (function(toolName, toolFunc) {
                            return function(...args) {
                                try {
                                    // Apply the function with the tool context
                                    const result = toolFunc.apply(toolContext, args);
                                    
                                    if (debug) console.log(`${MODULE_NAME}: Runtime tool ${toolName} returned: ${result}`);
                                    return result;
                                } catch(e) {
                                    if (debug) console.log(`${MODULE_NAME}: Error in runtime tool ${toolName}: ${e.toString()}`);
                                    if (debug && e.stack) console.log(`${MODULE_NAME}: Stack: ${e.stack}`);
                                    return 'malformed';
                                }
                            };
                        })(name, func);
                    }
                }
                
                if (debug) {
                    console.log(`${MODULE_NAME}: Loaded ${Object.keys(runtimeTools).length} runtime tools`);
                }
            } catch(evalError) {
                if (debug) console.log(`${MODULE_NAME}: Failed to eval runtime tools: ${evalError}`);
            }
        } catch(e) {
            if (debug) console.log(`${MODULE_NAME}: Failed to load runtime tools: ${e}`);
        }
    }
    
    // ==========================
    // Input Commands System
    // ==========================
    const inputCommands = {};
    
    function loadInputCommands() {
        const commandsCard = Utilities.storyCard.get('[SANE_RUNTIME] INPUT_COMMANDS');
        if (!commandsCard) {
            if (debug) console.log(`${MODULE_NAME}: No input commands card found`);
            return;
        }
        
        try {
            // Combine entry and description for more space
            const fullCode = (commandsCard.entry || '') + '\n' + (commandsCard.description || '');
            
            // Check if only comments (no actual code)
            const codeWithoutComments = fullCode.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
            if (!codeWithoutComments) {
                if (debug) console.log(`${MODULE_NAME}: No commands defined (only comments)`);
                return;
            }
            
            // Wrap in object literal and eval
            const code = `({${fullCode}})`;
            let commands;
            try {
                commands = eval(code);
            } catch (e) {
                if (debug) console.log(`${MODULE_NAME}: Failed to parse commands, using empty object: ${e}`);
                logError(e, 'Failed to parse INPUT_COMMANDS');
                commands = {};
            }
            
            // Register each command with proper context binding
            for (const [name, func] of Object.entries(commands)) {
                if (typeof func !== 'function') continue;
                
                inputCommands[name] = createCommandHandler(name, func);
            }
            
            if (debug) console.log(`${MODULE_NAME}: Loaded ${Object.keys(commands).length} input commands`);
        } catch(e) {
            if (debug) console.log(`${MODULE_NAME}: Failed to load input commands: ${e}`);
        }
        
    }
    
    function createCommandHandler(name, func, isDebugCommand = false) {
        return function(args) {
            try {
                // Create context object
                const context = {
                    // Direct access to primary APIs
                    get: get,
                    set: set,
                    queryTags: queryTags,
                    save: save,
                    getField: function(characterName, fieldPath) {
                        const character = get(characterName);
                        if (!character) return null;
                        return getNestedField(character, fieldPath);
                    },
                    setField: function(characterName, fieldPath, value) {
                        const character = get(characterName);
                        if (!character) return false;
                        setNestedField(character, fieldPath, value);
                        return save(characterName, character);
                    },
                    Utilities: Utilities,
                    Calendar: typeof Calendar !== 'undefined' ? Calendar : null,
                    BlueprintManager: typeof BlueprintManager !== 'undefined' ? BlueprintManager : null,
                    RewindSystem: RewindSystem,  // Add RewindSystem access
                    debug: debug,
                    // Debug-only functions
                    trackUnknownEntity: isDebugCommand ? trackUnknownEntity : undefined,
                    loadEntityTrackerConfig: isDebugCommand ? loadEntityTrackerConfig : undefined,
                    loadGlobalVariables: isDebugCommand ? loadGlobalVariables : undefined
                };
                
                if (debug) console.log(`${MODULE_NAME}: Executing command /${name} with args:`, args);
                const result = func.apply(context, [args]);
                return result;
            } catch(e) {
                if (debug) console.log(`${MODULE_NAME}: Error in command ${name}: ${e.toString()}`);
                return null;
            }
        };
    }
    
    // ==========================
    // Context Modifier System
    // ==========================
    let contextModifier = null;
    
    function loadContextModifier() {
        const modifierCard = Utilities.storyCard.get('[SANE_RUNTIME] CONTEXT_MODIFIER');
        if (!modifierCard) {
            if (debug) console.log(`${MODULE_NAME}: No context modifier card found`);
            return;
        }
        
        try {
            // Combine entry and description
            const fullCode = (modifierCard.entry || '') + '\n' + (modifierCard.description || '');
            
            // Skip if only comments
            const codeWithoutComments = fullCode.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
            if (!codeWithoutComments) {
                if (debug) console.log(`${MODULE_NAME}: Context modifier is empty (only comments), using pass-through`);
                contextModifier = (text) => text;
                return;
            }
            
            // Create function from code - auto-append return if not present
            const codeWithReturn = fullCode.includes('return ') ? fullCode : fullCode + '\nreturn text;';
            const funcCode = `(function(text) { ${codeWithReturn} })`;
            contextModifier = eval(funcCode);
            
            if (debug) console.log(`${MODULE_NAME}: Loaded context modifier`);
        } catch(e) {
            if (debug) console.log(`${MODULE_NAME}: Failed to load context modifier: ${e}`);
            contextModifier = null;
        }
    }
    
    // ==========================
    // Input/Output Modifiers
    // ==========================
    let inputModifier = null;
    let outputModifier = null;
    
    function loadInputModifier() {
        const modifierCard = Utilities.storyCard.get('[SANE_RUNTIME] INPUT_MODIFIER');
        if (!modifierCard) {
            if (debug) console.log(`${MODULE_NAME}: No input modifier card found`);
            return;
        }
        
        try {
            // Combine entry and description
            const fullCode = (modifierCard.entry || '') + '\n' + (modifierCard.description || '');
            
            // Skip if only comments
            const codeWithoutComments = fullCode.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
            if (!codeWithoutComments) {
                if (debug) console.log(`${MODULE_NAME}: Input modifier is empty (only comments), using pass-through`);
                inputModifier = (text) => text;
                return;
            }
            
            // Create function from code - auto-append return if not present
            const codeWithReturn = fullCode.includes('return ') ? fullCode : fullCode + '\nreturn text;';
            const funcCode = `(function(text) { ${codeWithReturn} })`;
            inputModifier = eval(funcCode);
            
            if (debug) console.log(`${MODULE_NAME}: Loaded input modifier`);
        } catch(e) {
            if (debug) console.log(`${MODULE_NAME}: Failed to load input modifier: ${e}`);
            if (debug) console.log(`${MODULE_NAME}: Input modifier code was: ${modifierCard.entry}`);
            inputModifier = null;
        }
    }
    
    function loadOutputModifier() {
        const modifierCard = Utilities.storyCard.get('[SANE_RUNTIME] OUTPUT_MODIFIER');
        if (!modifierCard) {
            if (debug) console.log(`${MODULE_NAME}: No output modifier card found`);
            return;
        }
        
        try {
            // Combine entry and description
            const fullCode = (modifierCard.entry || '') + '\n' + (modifierCard.description || '');
            
            // Skip if only comments
            const codeWithoutComments = fullCode.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
            if (!codeWithoutComments) {
                outputModifier = (text) => text;
                return;
            }
            
            // Create function from code - auto-append return if not present
            const codeWithReturn = fullCode.includes('return ') ? fullCode : fullCode + '\nreturn text;';
            const funcCode = `(function(text) { ${codeWithReturn} })`;
            outputModifier = eval(funcCode);
            
            if (debug) console.log(`${MODULE_NAME}: Loaded output modifier`);
        } catch(e) {
            if (debug) console.log(`${MODULE_NAME}: Failed to load output modifier: ${e}`);
            if (debug) console.log(`${MODULE_NAME}: Output modifier code was: ${modifierCard.entry}`);
            outputModifier = null;
        }
    }
    
    // ==========================
    // Rewind System
    // ==========================
    const RewindSystem = {
        STORAGE_CARD_PREFIX: '[GS_REWIND] History',
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
                    if (debug) console.log(`${MODULE_NAME}: Failed to parse card ${cardTitle}: ${e}`);
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
            
            // Check for significant data loss
            if (existingData.entries.length > 20 && data.entries.length < existingData.entries.length / 2) {
                shouldBackup = true;
                backupReason = `Data loss: ${data.entries.length} entries replacing ${existingData.entries.length}`;
            }
            
            // Check for hash mismatches (over 30% different)
            if (!shouldBackup && existingData.entries.length > 10 && data.entries.length > 10) {
                let mismatchCount = 0;
                const checkLength = Math.min(existingData.entries.length, data.entries.length);
                
                for (let i = 0; i < checkLength; i++) {
                    if (existingData.entries[i]?.h !== data.entries[i]?.h) {
                        mismatchCount++;
                    }
                }
                
                if (mismatchCount > checkLength * 0.3) {
                    shouldBackup = true;
                    backupReason = `Hash mismatch: ${mismatchCount}/${checkLength} entries differ`;
                }
            }
            
            if (shouldBackup) {
                if (debug) {
                    console.log(`${MODULE_NAME}: WARNING: ${backupReason} - creating backup in state`);
                }
                
                // Store backup in state with turn number
                if (!state.rewindBackups) {
                    state.rewindBackups = [];
                }
                
                state.rewindBackups.push({
                    turn: info?.actionCount || state.actionCount || 0,
                    entries: existingData.entries,
                    position: existingData.position,
                    reason: backupReason
                });
                
                // Keep only last 3 backups to prevent state bloat
                if (state.rewindBackups.length > 3) {
                    state.rewindBackups = state.rewindBackups.slice(-3);
                }
                
                // Log the issue
                logError(new Error('RewindSystem anomaly detected'), backupReason);
            }
            
            // Clean up old backups (older than 20 turns)
            if (state.rewindBackups && state.rewindBackups.length > 0) {
                const currentTurn = info?.actionCount || state.actionCount || 0;
                state.rewindBackups = state.rewindBackups.filter(backup => 
                    currentTurn - backup.turn < 20
                );
                
                if (state.rewindBackups.length === 0) {
                    delete state.rewindBackups; // Clean up empty array
                }
            }
            
            // Clear existing cards first
            let cardNum = 1;
            while (true) {
                const cardTitle = cardNum === 1 
                    ? RewindSystem.STORAGE_CARD_PREFIX 
                    : `${RewindSystem.STORAGE_CARD_PREFIX} ${cardNum}`;
                
                const card = Utilities.storyCard.get(cardTitle);
                if (!card) break;
                
                Utilities.storyCard.remove(cardTitle);
                cardNum++;
            }
            
            // Split entries into cards
            const cards = [];
            let currentCard = { entries: [], position: data.position };
            let currentSize = 50; // Account for JSON structure overhead
            
            for (let i = 0; i < data.entries.length; i++) {
                const entry = data.entries[i];
                const entryStr = JSON.stringify(entry);
                const entrySize = entryStr.length + 2; // +2 for comma and spacing
                
                if (currentSize + entrySize > RewindSystem.MAX_CARD_SIZE && currentCard.entries.length > 0) {
                    // Save current card and start new one
                    cards.push({...currentCard});
                    currentCard = { entries: [], position: data.position };
                    currentSize = 50;
                }
                
                currentCard.entries.push(entry);
                currentSize += entrySize;
            }
            
            // Save last card if it has entries
            if (currentCard.entries.length > 0) {
                cards.push(currentCard);
            }
            
            // Create/update story cards
            for (let i = 0; i < cards.length; i++) {
                const cardTitle = i === 0 
                    ? RewindSystem.STORAGE_CARD_PREFIX 
                    : `${RewindSystem.STORAGE_CARD_PREFIX} ${i + 1}`;
                
                const cardData = cards[i];
                const existing = Utilities.storyCard.get(cardTitle);
                
                if (existing) {
                    Utilities.storyCard.update(cardTitle, {
                        description: JSON.stringify(cardData)
                    });
                } else {
                    Utilities.storyCard.add({
                        title: cardTitle,
                        value: `# Rewind System Data (Part ${i + 1})\nTracks tool execution history for state consistency.`,
                        description: JSON.stringify(cardData),
                        type: 'data'
                    });
                }
            }
            
            if (debug) console.log(`${MODULE_NAME}: Saved ${data.entries.length} entries across ${cards.length} cards`);
        },
        
        // Quick hash function for text comparison
        quickHash: function(text) {
            if (!text) return '';
            let hash = 0;
            // Hash the entire text to detect any changes
            for (let i = 0; i < text.length; i++) {
                const char = text.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32bit integer
            }
            return hash.toString(36);
        },
        
        // Store action at specific position
        recordAction: function(text, tools, position = null) {
            const data = RewindSystem.getStorage();
            const hash = RewindSystem.quickHash(text);
            
            // Position is ALWAYS bounded to 0-99 (for MAX_HISTORY of 100)
            // If no position specified, use current entries length
            if (position === null) {
                position = Math.min(data.entries.length, RewindSystem.MAX_HISTORY - 1);
            }
            
            // Ensure position is within bounds
            position = Math.min(position, RewindSystem.MAX_HISTORY - 1);
            
            // If we're recording at a position that's less than the current array length,
            // and the hash is different, we're creating a new timeline branch
            if (position < data.entries.length && data.entries[position]) {
                const existingHash = data.entries[position].h;
                if (existingHash !== hash) {
                    // CRITICAL: Revert the tools from the entry we're about to replace
                    // Otherwise those tool effects remain in the game state
                    const entryToRevert = data.entries[position];
                    if (entryToRevert && entryToRevert.t && entryToRevert.t.length > 0) {
                        if (debug) console.log(`${MODULE_NAME}: Reverting ${entryToRevert.t.length} tools from position ${position} before overwriting`);
                        
                        // Revert tools in reverse order
                        for (let i = entryToRevert.t.length - 1; i >= 0; i--) {
                            const [tool, params, revertData] = entryToRevert.t[i];
                            
                            // Apply the reversion
                            switch(tool) {
                                case 'add_item':
                                    processToolCall('add_item', [params[0], params[1], -params[2]]);
                                    break;
                                case 'remove_item':
                                    processToolCall('add_item', [params[0], params[1], params[2]]);
                                    break;
                                case 'transfer_item':
                                    processToolCall('transfer_item', [params[1], params[0], params[2], params[3]]);
                                    break;
                                case 'deal_damage':
                                    processToolCall('deal_damage', [params[0], params[1], -params[2]]);
                                    break;
                                case 'update_relationship':
                                    processToolCall('update_relationship', [params[0], params[1], -params[2]]);
                                    break;
                                case 'add_levelxp':
                                    processToolCall('add_levelxp', [params[0], -params[1]]);
                                    break;
                                case 'add_skillxp':
                                    processToolCall('add_skillxp', [params[0], params[1], -params[2]]);
                                    break;
                                case 'update_location':
                                    if (revertData && revertData.oldLocation) {
                                        processToolCall('update_location', [params[0], revertData.oldLocation]);
                                    }
                                    break;
                                default:
                                    if (tool.startsWith('update_') && revertData && revertData.oldValue !== undefined) {
                                        const charName = String(params[0]).toLowerCase();
                                        const char = get(charName);
                                        if (char && char.attributes && char.attributes[revertData.statName]) {
                                            char.attributes[revertData.statName].value = revertData.oldValue;
                                            save(charName, char);
                                        }
                                    }
                                    break;
                            }
                        }
                    }
                    
                    // Different content at this position - truncate everything after it
                    data.entries = data.entries.slice(0, position);
                    if (debug) console.log(`${MODULE_NAME}: New timeline branch at position ${position}, truncated future entries`);
                }
            }
            
            // Store tools with their revert data at the specified position
            data.entries[position] = {
                h: hash,
                t: tools.map(t => [t.tool, t.params, t.revertData || {}])
            };
            
            // Update position to match where we just stored
            data.position = position;
            
            // Maintain max history - when we exceed max, remove oldest entry
            while (data.entries.length > RewindSystem.MAX_HISTORY) {
                data.entries.shift();
                // Adjust position since we removed an entry
                data.position = Math.max(0, data.position - 1);
            }
            
            RewindSystem.saveStorage(data);
            if (debug) console.log(`${MODULE_NAME}: Recorded action at position ${position} with ${tools.length} tools`);
        },
        
        // Find current position by matching history
        findCurrentPosition: function() {
            const data = RewindSystem.getStorage();
            if (!history || history.length === 0) {
                if (debug) console.log(`${MODULE_NAME}: No history available`);
                return { matched: false, position: -1 };
            }
            
            if (data.entries.length === 0) {
                if (debug) console.log(`${MODULE_NAME}: No stored entries yet`);
                return { matched: false, position: -1 };
            }
            
            // The current history length tells us where we are
            // If history has 1 entry, we're at position 0
            // If history has 2 entries, we're at position 1, etc.
            const historyLength = history.length;
            const expectedPosition = historyLength - 1;
            
            // Verify this matches our stored data
            if (expectedPosition >= 0 && expectedPosition < data.entries.length) {
                // Quick verification: check if the last few entries match
                let verified = true;
                const checkCount = Math.min(3, historyLength, data.entries.length);
                
                for (let i = 0; i < checkCount; i++) {
                    const historyIndex = historyLength - 1 - i;
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
                    if (debug) console.log(`${MODULE_NAME}: Current position: ${expectedPosition} (history length: ${historyLength})`);
                    return { matched: true, position: expectedPosition };
                } else {
                    if (debug) console.log(`${MODULE_NAME}: Position mismatch - history doesn't match stored data`);
                }
            }
            
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
            // We should discard those entries and start fresh from the edit point
            if (position < data.entries.length) {
                // Keep entries up to AND including the edit position
                data.entries = data.entries.slice(0, position + 1);
                
                // Update position to match current history length
                data.position = Math.min(position, history.length - 1);
                
                if (debug) console.log(`${MODULE_NAME}: Discarded entries after position ${position}, keeping ${data.entries.length} entries`);
            }
            
            // Now rehash the current history entries from the edit point forward
            for (let i = position; i < history.length; i++) {
                const newHash = RewindSystem.quickHash(history[i].text);
                
                // If this position exists in our data, update its hash
                if (i < data.entries.length) {
                    data.entries[i].h = newHash;
                }
                // Otherwise we'll add new entries as they come in during output processing
            }
            
            RewindSystem.saveStorage(data);
            if (debug) console.log(`${MODULE_NAME}: Rehashed from position ${position}`);
        },
        
        // Get tool reversions for rewinding
        getReversions: function() {
            // Tool-specific reversions
            return {
                'add_item': (params) => ['add_item', [params[0], params[1], -params[2]]],  // Negate quantity
                'remove_item': (params) => ['remove_item', [params[0], params[1], -params[2]]],  // Negate quantity
                'deal_damage': (params) => ['heal', params],
                'heal': (params) => ['deal_damage', params],
                'add_tag': (params) => ['remove_tag', params],
                'remove_tag': (params) => ['add_tag', params],
                'transfer_item': (params) => ['transfer_item', [params[1], params[0], params[2], params[3]]],
                'add_levelxp': (params) => ['add_levelxp', [params[0], -params[1]]],
                'add_skillxp': (params) => ['add_skillxp', [params[0], params[1], -params[2]]],
                'update_relationship': (params) => ['update_relationship', [params[0], params[1], -params[2]]],
                'update_location': () => null,  // Can't revert without stored old location
                // Non-reversible tools return null
                'offer_quest': () => null
            };
        },
        
        // Get revert info for a specific tool
        getRevertInfo: function(toolName, params) {
            const reversions = RewindSystem.getReversions();
            const reverter = reversions[toolName];
            if (reverter) {
                return reverter(params);
            }
            return null;
        },
        
        // Rewind to a specific position
        rewindTo: function(targetPosition) {
            const data = RewindSystem.getStorage();
            const currentPos = data.position;
            
            if (targetPosition >= currentPos) {
                if (debug) console.log(`${MODULE_NAME}: Cannot rewind forward`);
                return false;
            }
            
            // Revert tools from current back to target
            for (let i = currentPos; i > targetPosition; i--) {
                const entry = data.entries[i];
                if (!entry) continue;
                
                // Process tools in reverse order
                for (let j = entry.t.length - 1; j >= 0; j--) {
                    const toolData = entry.t[j];
                    const [tool, params, revertData] = toolData;
                    
                    // Use the captured revert data if available
                    if (revertData && Object.keys(revertData).length > 0) {
                        // Apply the captured revert data directly
                        if (debug) console.log(`${MODULE_NAME}: Reverting ${tool} using captured data:`, revertData);
                        
                        // Different tools need different reversion approaches
                        switch(tool) {
                            case 'update_location':
                                if (revertData.oldLocation) {
                                    const result = processToolCall('update_location', [params[0], revertData.oldLocation]);
                                    if (debug) console.log(`${MODULE_NAME}: Reverted location for ${params[0]} to ${revertData.oldLocation}: ${result}`);
                                }
                                break;
                                
                            case 'add_item':
                                // Simply add the negative amount
                                const result = processToolCall('add_item', [params[0], params[1], -params[2]]);
                                if (debug) console.log(`${MODULE_NAME}: Reverted add_item by adding -${params[2]} ${params[1]} to ${params[0]}: ${result}`);
                                break;
                                
                            case 'remove_item':
                                // Simply add back the removed amount
                                const result2 = processToolCall('add_item', [params[0], params[1], params[2]]);
                                if (debug) console.log(`${MODULE_NAME}: Reverted remove_item by adding ${params[2]} ${params[1]} to ${params[0]}: ${result2}`);
                                break;
                                
                            case 'transfer_item':
                                // Transfer back in reverse (from receiver to giver)
                                const transferResult = processToolCall('transfer_item', [params[1], params[0], params[2], params[3]]);
                                if (debug) console.log(`${MODULE_NAME}: Reverted transfer_item by transferring ${params[2]} x${params[3]} back from ${params[1]} to ${params[0]}: ${transferResult}`);
                                break;
                                
                            case 'deal_damage':
                                // Heal for the damage amount
                                const healResult = processToolCall('deal_damage', [params[0], params[1], -params[2]]);
                                if (debug) console.log(`${MODULE_NAME}: Reverted deal_damage by healing ${params[1]} for ${params[2]}: ${healResult}`);
                                break;
                                
                            case 'update_relationship':
                                // Apply negative change amount
                                const relResult = processToolCall('update_relationship', [params[0], params[1], -params[2]]);
                                if (debug) console.log(`${MODULE_NAME}: Reverted update_relationship by applying -${params[2]}: ${relResult}`);
                                break;
                                
                            case 'add_levelxp':
                                // Apply negative XP (will handle negative XP logic later)
                                const xpResult = processToolCall('add_levelxp', [params[0], -params[1]]);
                                if (debug) console.log(`${MODULE_NAME}: Reverted add_levelxp by applying -${params[1]} XP: ${xpResult}`);
                                break;
                                
                            case 'add_skillxp':
                                // Apply negative skill XP (will handle negative XP logic later)
                                const skillXpResult = processToolCall('add_skillxp', [params[0], params[1], -params[2]]);
                                if (debug) console.log(`${MODULE_NAME}: Reverted add_skillxp by applying -${params[2]} XP to ${params[1]}: ${skillXpResult}`);
                                break;
                                
                            case 'unlock_newskill':
                                // Skip reverting skill unlocks for now - would need to track if it was truly new
                                break;
                                
                            default:
                                // Check if this is an update_[stat] tool
                                if (tool.startsWith('update_') && revertData.statName && revertData.oldValue !== undefined) {
                                    const charName = String(params[0]).toLowerCase();
                                    const char = get(charName);
                                    if (char && char.attributes && char.attributes[revertData.statName]) {
                                        char.attributes[revertData.statName].value = revertData.oldValue;
                                        save(charName, char);
                                        if (debug) console.log(`${MODULE_NAME}: Reverted ${tool} for ${params[0]}, restored ${revertData.statName} to ${revertData.oldValue}`);
                                    }
                                } else {
                                    // For unknown tools
                                    if (debug) console.log(`${MODULE_NAME}: No specific revert handler for ${tool}`);
                                }
                        }
                    } else {
                        // Fallback to old reversion system if no revert data captured
                        const reversions = RewindSystem.getReversions();
                        const reverter = reversions[tool];
                        
                        if (reverter) {
                            const reversion = reverter(params);
                            if (reversion) {
                                const [revertTool, revertParams] = reversion;
                                const result = processToolCall(revertTool, revertParams);
                                if (debug) console.log(`${MODULE_NAME}: Reverted (fallback): ${tool}(${params.join(',')}) -> ${revertTool}(${revertParams.join(',')}): ${result}`);
                            }
                        }
                    }
                }
            }
            
            data.position = targetPosition;
            RewindSystem.saveStorage(data);
            return true;
        },
        
        // Extract and execute tools from text
        extractAndExecuteTools: function(text) {
            const executedTools = [];
            if (!text) return executedTools;
            
            // Find all tool calls in the text using the same pattern as processTools
            let match;
            while ((match = TOOL_PATTERN.exec(text)) !== null) {
                const [fullMatch, toolName, paramString] = match;
                
                // Use the same parameter parser as processTools
                const params = parseParameters(paramString);
                
                // Skip if this is a getter function (get_*)
                if (toolName.startsWith('get')) continue;
                
                // Capture revert data BEFORE executing
                // Skip revert data capture here since captureRevertData is not accessible
                // This is called from RewindSystem which doesn't have access to the main scope
                const revertData = null;
                
                // Execute the tool
                const result = processToolCall(toolName, params);
                
                // Only track if successfully executed (ignore malformed/unknown)
                if (result === 'executed') {
                    executedTools.push({
                        tool: toolName.toLowerCase(),
                        params: params,
                        executed: true,
                        revertData: revertData
                    });
                    
                    if (debug) console.log(`${MODULE_NAME}: Executed tool from history: ${toolName}(${params.join(', ')})`);
                }
            }
            
            return executedTools;
        },
        
        // Process tools and add to history (called from processTools)
        trackTools: function(text, executedTools) {
            if (!executedTools || executedTools.length === 0) return;
            
            RewindSystem.recordAction(text, executedTools);
        },
        
        // Handle context updates (check for edits and rewinds)
        handleContext: function() {
            // Check if history is available
            if (typeof history === 'undefined' || !history) {
                if (debug) console.log(`${MODULE_NAME}: History not available in context`);
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
                // If history[0] doesn't match our entries[0], we've shifted
                if (history[0] && data.entries[0]) {
                    const historyHash = RewindSystem.quickHash(history[0].text);
                    if (data.entries[0].h !== historyHash) {
                        shifted = true;
                        if (debug) console.log(`${MODULE_NAME}: History array shifted - realigning entries`);
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
                    if (debug) console.log(`${MODULE_NAME}: Processing genuinely new entry at position ${i}`);
                    const tools = RewindSystem.extractAndExecuteTools(historyEntry.text);
                    data.entries[i] = {
                        h: hash,
                        t: tools.map(t => [t.tool, t.params, t.revertData || {}])
                    };
                } else {
                    // This is either:
                    // 1. A restored entry from history (middle entries)
                    // 2. Not beyond our last known position
                    // Just track hash, don't execute tools
                    if (debug) console.log(`${MODULE_NAME}: Tracking entry at position ${i} without execution (restored or old)`);
                    
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
                        t: toolMatches  // Tools that were in the text but we're not executing
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
                    if (debug) console.log(`${MODULE_NAME}: History entry ${i} was edited - will revert from current back to ${i}, then replay`);
                    break;
                }
            }
            
            // If an edit was found, revert everything from current position back to the edit
            if (editedPosition >= 0) {
                // Step 1: Revert ALL tools from current position back to edited position (reverse order)
                for (let i = checkLength - 1; i >= editedPosition; i--) {
                    if (!data.entries[i]) continue;
                    
                    const oldTools = data.entries[i].t || [];
                    for (let j = oldTools.length - 1; j >= 0; j--) {
                        const [toolName, params, storedRevertData] = oldTools[j];
                        
                        // Use stored revert data for precise reversions
                        if (toolName === 'add_item' && storedRevertData && storedRevertData.oldQuantity !== undefined) {
                            const addedQty = parseInt(params[2]);
                            const revertQty = -(addedQty);
                            const revertText = `add_item(${params[0]}, ${params[1]}, ${revertQty})`;
                            RewindSystem.extractAndExecuteTools(revertText);
                            if (debug) console.log(`${MODULE_NAME}: Reverting entry ${i}: add_item via ${revertText}`);
                        } else if (toolName === 'update_location' && storedRevertData && storedRevertData.oldLocation) {
                            const revertText = `update_location(${params[0]}, ${storedRevertData.oldLocation})`;
                            RewindSystem.extractAndExecuteTools(revertText);
                            if (debug) console.log(`${MODULE_NAME}: Reverting entry ${i}: location via ${revertText}`);
                        } else {
                            const revertInfo = RewindSystem.getRevertInfo(toolName, params);
                            if (revertInfo) {
                                const [revertTool, revertParams] = revertInfo;
                                const revertText = `${revertTool}(${revertParams.join(',')})`;
                                RewindSystem.extractAndExecuteTools(revertText);
                                if (debug) console.log(`${MODULE_NAME}: Reverting entry ${i}: ${toolName} via ${revertText}`);
                            }
                        }
                    }
                }
                
                // Step 2: Re-execute ALL tools from edited position to current position (forward order)
                for (let i = editedPosition; i < checkLength; i++) {
                    if (!history[i]) continue;
                    
                    const historyHash = RewindSystem.quickHash(history[i].text);
                    const tools = RewindSystem.extractAndExecuteTools(history[i].text);
                    
                    // Update the stored entry with new hash and tool data
                    data.entries[i] = {
                        h: historyHash,
                        t: tools.map(t => [t.tool, t.params, t.revertData || {}])
                    };
                    
                    if (debug && tools.length > 0) {
                        console.log(`${MODULE_NAME}: Re-executed entry ${i} with ${tools.length} tools`);
                    }
                }
            }
            
            // Update position
            data.position = historyLength - 1;
            RewindSystem.saveStorage(data);
            
        }
    };
    
    
    function createEntityTrackerCards() {
        // Create entity tracker config
        if (!Utilities.storyCard.get('[SANE:C] Entity Tracker')) {
            Utilities.storyCard.add({
                title: '[SANE:C] Entity Tracker',
                type: 'data',
                entry: (
                    `# entity_threshold\n` +
                    `3\n` +
                    `# auto_generate\n` +
                    `true\n` +
                    `# entity_blacklist\n` +
                    `player, self, me, you, unknown`
                ),
                description: `// Entity tracking data\n`
            });
        }
        

        
        if (debug) console.log(`${MODULE_NAME}: Created entity tracker cards`);
    }
    
    // ==========================
    // RPG Schema Management
    // ==========================
    
    function calculateLevelXPRequirement(level) {
        // Get stats component for level progression formula
        const statsComp = Utilities.storyCard.get('[SANE:S] stats');
        if (statsComp && statsComp.description) {
            try {
                const schema = JSON.parse(statsComp.description);
                if (schema.level_progression) {
                    // Check for level override first
                    if (schema.level_progression.xp_overrides && schema.level_progression.xp_overrides[String(level)]) {
                        return schema.level_progression.xp_overrides[String(level)];
                    }
                    // Use formula: level * (level - 1) * 500
                    if (schema.level_progression.xp_formula) {
                        // Simple eval replacement for safety
                        if (schema.level_progression.xp_formula === "level * (level - 1) * 500") {
                            return level * (level - 1) * 500;
                        }
                    }
                }
            } catch (e) {
                if (debug) console.log(`${MODULE_NAME}: Failed to parse stats schema`);
            }
        }
        // Fallback formula
        return level * 500;
    }
    
    function calculateMaxHP(level) {
        // Get stats component for HP progression
        const statsComp = Utilities.storyCard.get('[SANE:S] stats');
        if (statsComp && statsComp.description) {
            try {
                const schema = JSON.parse(statsComp.description);
                if (schema.hp_progression) {
                    const base = schema.hp_progression.base || 100;
                    const perLevel = schema.hp_progression.per_level || 20;
                    return base + ((level - 1) * perLevel);
                }
            } catch (e) {
                if (debug) console.log(`${MODULE_NAME}: Failed to parse stats schema`);
            }
        }
        // Fallback: 100 + 20 per level
        return 100 + ((level - 1) * 20);
    }
    
    function calculateSkillXPRequirement(skillName, level) {
        // Check skills component for formula
        const skillsComp = Utilities.storyCard.get('[SANE:S] skills');
        if (skillsComp && skillsComp.description) {
            try {
                const schema = JSON.parse(skillsComp.description);
                if (schema.registry && schema.registry[skillName]) {
                    const skillDef = schema.registry[skillName];
                    
                    // Check for skill-specific formula first
                    if (skillDef.xp_formula) {
                        const match = skillDef.xp_formula.match(/level\s*\*\s*(\d+)/);
                        if (match) {
                            return level * parseInt(match[1]);
                        }
                    }
                    
                    // Check category formula
                    if (skillDef.category && schema.categories && schema.categories[skillDef.category]) {
                        const categoryDef = schema.categories[skillDef.category];
                        if (categoryDef.xp_formula) {
                            const match = categoryDef.xp_formula.match(/level\s*\*\s*(\d+)/);
                            if (match) {
                                return level * parseInt(match[1]);
                            }
                        }
                    }
                }
                
                // Use default category if exists
                if (schema.categories && schema.categories.default && schema.categories.default.xp_formula) {
                    const match = schema.categories.default.xp_formula.match(/level\s*\*\s*(\d+)/);
                    if (match) {
                        return level * parseInt(match[1]);
                    }
                }
            } catch (e) {
                if (debug) console.log(`${MODULE_NAME}: Failed to parse skill registry`);
            }
        }
        // Fallback formula
        return level * 100;
    }
    
    function getSkillRegistry() {
        // Get the list of valid skills from component schema
        const skillsComp = Utilities.storyCard.get('[SANE:S] skills');
        if (skillsComp && skillsComp.description) {
            try {
                const schema = JSON.parse(skillsComp.description);
                return schema.registry || {};
            } catch (e) {
                if (debug) console.log(`${MODULE_NAME}: Failed to parse skill registry`);
            }
        }
        return {};
    }
    
    // ==========================
    // Relationship System
    // ==========================
    function loadRelationshipThresholds() {
        // Load from relationships component schema
        const relationshipSchema = Utilities.storyCard.get('[SANE:S] relationships');
        if (!relationshipSchema || !relationshipSchema.description) {
            // No component = no relationship system
            if (debug) console.log(`${MODULE_NAME}: Relationships component not found - relationship system disabled`);
            return [];
        }
        
        try {
            const schema = JSON.parse(relationshipSchema.description);
            if (schema.thresholds && Array.isArray(schema.thresholds)) {
                return schema.thresholds;
            }
            // Component exists but no thresholds defined
            if (debug) console.log(`${MODULE_NAME}: Relationships component has no thresholds defined`);
            return [];
        } catch (e) {
            if (debug) console.log(`${MODULE_NAME}: Failed to parse relationship schema`);
            return [];
        }
    }
    
    function getRelationshipFlavor(value, fromName, toName) {
        const thresholds = loadRelationshipThresholds();
        
        // Capitalize names for display
        const capitalizeFirst = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';
        const fromDisplay = capitalizeFirst(fromName);
        const toDisplay = capitalizeFirst(toName);
        
        // Find matching threshold
        for (const threshold of thresholds) {
            if (value >= threshold.min && value <= threshold.max) {
                // Replace placeholders in flavor text if present
                return threshold.flavor
                    .replace(/\{from\}/g, fromDisplay)
                    .replace(/\{to\}/g, toDisplay)
                    .replace(/\{value\}/g, value);
            }
        }
        
        // Default if no threshold matches
        return `${value} points`;
    }
    
    
    // ==========================
    // Initialize APIs
    // ==========================
    if (typeof Calendar !== 'undefined' && typeof Calendar === 'function') {
        Calendar('api', null);
    }

    // Initialize BlueprintManager API if available
    if (typeof BlueprintManager !== 'undefined' && typeof BlueprintManager === 'function') {
        BlueprintManager('api', null);
    }
    
    // ==========================
    // Entity Data Parsing
    // ==========================
    
    // Build structured data for DESCRIPTION field
    function buildEntityData(entityId, entity) {
        // Build unified data structure
        // {
        //   "EntityID": {
        //     "aliases": [...],
        //     "GameplayTags": [...],
        //     "components": [...],
        //     // component data with embedded display rules
        //   }
        // }
        const cleanEntity = {};

        // Add primary fields first (in order)
        if (entity._type) cleanEntity.type = entity._type;
        if (entity._usedPrefix) cleanEntity.prefix = entity._usedPrefix;  // Store which prefix was used
        if (entity._tags && entity._tags.length > 0) cleanEntity.tags = entity._tags;  // Store semantic tags
        if (entity.aliases) cleanEntity.aliases = entity.aliases;

        // Add id field to cleanEntity
        if (entity.id) cleanEntity.id = entity.id;

        // Skip these fields entirely
        // Note: aliases is skipped here because it's manually added above for ordering
        // The _* fields are internal tracking fields not meant for persistence
        const skipFields = ['_type', '_usedPrefix', '_tags', 'aliases', '_cardTitle', '_title'];
        
        // Add all other fields
        for (const [key, value] of Object.entries(entity)) {
            // Skip internal fields and already-added fields
            if (skipFields.includes(key) || key.startsWith('_')) continue;
            
            // Skip empty objects and null values
            if (value !== null && value !== undefined && 
                !(typeof value === 'object' && Object.keys(value).length === 0)) {
                cleanEntity[key] = value;
            }
        }
        
        // Wrap the entity data with its ID as the key
        const wrappedData = {
            [entityId]: cleanEntity
        };

        // Build the JSON data with markers
        let data = '<== SANE DATA ==>\n';
        data += JSON.stringify(wrappedData, null, 2);
        data += '\n<== END DATA ==>';
        return data;
    }
    
    
    // Parse structured data from DESCRIPTION field
    function parseEntityData(description) {
        // Extract data between markers
        let dataMatch = description.match(/<== SANE DATA ==>([\s\S]*?)<== END DATA ==>/);
        if (!dataMatch) {
            console.log(`${MODULE_NAME}: ERROR - No data section found in card description`);
            return null; // No data section - entity is invalid
        }

        const dataSection = dataMatch[1].trim();

        try {
            // Simply parse the entire JSON object
            const entity = JSON.parse(dataSection);
            
            return entity;
        } catch (e) {
            console.log(`${MODULE_NAME}: ERROR - Failed to parse entity JSON: ${e.message}`);
            console.log(`${MODULE_NAME}: Data section: ${dataSection.substring(0, 200)}...`);
            return {}; // Return empty entity if parsing fails
        }
    }
    
    // Template Parser Class
    class TemplateParser {
        constructor(data) {
            this.data = data;
            this.pos = 0;
            this.template = '';
        }
        
        // Check if value is truthy for conditionals
        isTruthy(value) {
            if (value === undefined || value === null || value === '') return false;
            if (value === false || value === 0) return false;
            if (typeof value === 'object' && Object.keys(value).length === 0) return false;
            return true;
        }
        
        // Main parse function
        parse(template) {
            this.template = template;
            this.pos = 0;
            return this.parseTemplate();
        }
        
        // Parse the entire template
        parseTemplate() {
            let result = '';
            
            while (this.pos < this.template.length) {
                const char = this.template[this.pos];
                
                // Handle $() dynamic resolution syntax
                if (char === '$' && this.pos + 1 < this.template.length && this.template[this.pos + 1] === '(') {
                    const dollarResult = this.parseDollarExpression();
                    if (dollarResult !== null) {
                        result += dollarResult;
                    } else {
                        result += char;
                        this.pos++;
                    }
                } else if (char === '{') {
                    // Check for escaped braces {{
                    if (this.template[this.pos + 1] === '{') {
                        result += '{';
                        this.pos += 2;
                        continue;
                    }
                    
                    // Parse template expression
                    const expr = this.parseExpression();
                    if (expr !== null) {
                        result += expr;
                    } else {
                        // Failed to parse, treat as literal
                        result += char;
                        this.pos++;
                    }
                } else if (char === '}' && this.template[this.pos + 1] === '}') {
                    // Escaped closing braces
                    result += '}';
                    this.pos += 2;
                } else {
                    result += char;
                    this.pos++;
                }
            }
            
            return result;
        }
        
        // Parse a $() expression
        parseDollarExpression() {
            const start = this.pos;
            
            if (this.template.substring(this.pos, this.pos + 2) !== '$(') {
                return null;
            }
            
            this.pos += 2; // Skip $(
            
            // Find the closing )
            let parenDepth = 1;
            let exprEnd = this.pos;
            
            while (exprEnd < this.template.length && parenDepth > 0) {
                if (this.template[exprEnd] === '(') {
                    parenDepth++;
                } else if (this.template[exprEnd] === ')') {
                    parenDepth--;
                }
                exprEnd++;
            }
            
            if (parenDepth !== 0) {
                // Unmatched parentheses
                this.pos = start;
                return null;
            }
            
            const fieldPath = this.template.substring(this.pos, exprEnd - 1);
            this.pos = exprEnd; // Move past the closing )
            
            // Process as a simple field reference
            return this.processField(fieldPath);
        }
        
        // Parse a template expression {...}
        parseExpression() {
            const start = this.pos;
            
            if (this.template[this.pos] !== '{') {
                return null;
            }
            
            this.pos++; // Skip opening brace
            
            // Find the matching closing brace, accounting for nesting
            let braceDepth = 1;
            let exprEnd = this.pos;
            
            while (exprEnd < this.template.length && braceDepth > 0) {
                if (this.template[exprEnd] === '{') {
                    braceDepth++;
                } else if (this.template[exprEnd] === '}') {
                    braceDepth--;
                }
                exprEnd++;
            }
            
            if (braceDepth !== 0) {
                // Unmatched braces
                this.pos = start;
                return null;
            }
            
            const content = this.template.substring(this.pos, exprEnd - 1);
            this.pos = exprEnd; // Move past the closing brace
            
            
            // Parse the expression content
            return this.parseExpressionContent(content);
        }
        
        // Parse the content inside {...}
        parseExpressionContent(content) {
            
            // Check for loop syntax: field.*→template or field.*|template or field.*:template
            // → is the preferred iteration operator (no conflict with ternary)
            // : still supported for backwards compatibility but discouraged
            const loopMatch = content.match(/^([^.*]+)\.\*([→:|])(.+)$/s);
            if (loopMatch) {
                // Pass the delimiter as part of the template only if it's a pipe
                const template = loopMatch[2] === '|' ? loopMatch[2] + loopMatch[3] : loopMatch[3];
                return this.processLoop(loopMatch[1], template);
            }
            
            // Check for conditional/ternary: field?content or field?true:false
            const condMatch = content.match(/^([^?]+)\?(.+)$/s);
            if (condMatch) {
                return this.processConditional(condMatch[1], condMatch[2]);
            }
            
            // Simple field replacement
            return this.processField(content);
        }
        
        // Process a loop expression
        processLoop(objectPath, template) {
            const obj = getNestedField(this.data, objectPath);
            if (!obj || typeof obj !== 'object') {
                if (debug) console.log(`${MODULE_NAME}: processLoop - no object found at path '${objectPath}'`);
                return '';
            }
            
            // Check for pipe delimiter at start of template
            let delimiter = '\n';
            let actualTemplate = template;
            if (template.startsWith('|')) {
                delimiter = ' | ';
                actualTemplate = template.substring(1);
            }
            
            const results = [];

            for (const [key, value] of Object.entries(obj)) {
                // Create a new parser with loop context
                const loopData = { ...this.data };
                
                // Process template with loop replacements
                let processed = actualTemplate;
                
                // Replace {*} with key (format nicely)
                processed = processed.replace(/\{\*\}/g, () => {
                    // Format snake_case to Title Case, or just capitalize single words
                    if (key.includes('_')) {
                        return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    }
                    // Capitalize first letter of single words
                    return key.charAt(0).toUpperCase() + key.slice(1);
                });
                
                // Handle function calls with *. arguments FIRST
                processed = processed.replace(/\{(\w+)\(([^)]*)\)\}/g, (m, funcName, argsStr) => {
                    // Parse and resolve arguments that use *.
                    const args = argsStr ? argsStr.split(',').map(arg => {
                        arg = arg.trim();
                        
                        // Handle *.value or other *. references
                        if (arg.startsWith('*.')) {
                            const prop = arg.slice(2);
                            if (prop === '') {
                                return value;
                            }
                            return getNestedField(value, prop);
                        }
                        
                        // Handle * (just the key)
                        if (arg === '*') {
                            return key;
                        }
                        
                        // Handle field references from data
                        if (arg && !arg.startsWith('"') && !arg.startsWith("'") && isNaN(arg)) {
                            return getNestedField(loopData, arg);
                        }
                        
                        // Handle string literals
                        if ((arg.startsWith('"') && arg.endsWith('"')) || 
                            (arg.startsWith("'") && arg.endsWith("'"))) {
                            return arg.slice(1, -1);
                        }
                        
                        // Handle numbers
                        if (!isNaN(arg)) {
                            return Number(arg);
                        }
                        
                        return arg;
                    }) : [];
                    
                    // Call the function
                    if (funcName === 'getRelationshipFlavor' && typeof getRelationshipFlavor === 'function') {
                        return getRelationshipFlavor(...args);
                    }
                    
                    return m; // Return unchanged if function not found
                });
                
                // Replace {*.prop} with value properties
                processed = processed.replace(/\{\*\.([^}]*)\}/g, (m, prop) => {
                    // Special case: {*.} means the value itself
                    if (prop === '') {
                        return typeof value === 'object' ? JSON.stringify(value) : String(value);
                    }
                    
                    // Special handling for inventory items
                    if (prop === 'quantity') {
                        // For inventory, the value itself IS the quantity
                        if (typeof value === 'number') {
                            return String(value);
                        } else if (typeof value === 'object' && value !== null && value.hasOwnProperty('quantity')) {
                            // If it's an object with quantity property
                            return String(value.quantity);
                        }
                        // Default to the value itself if it's not an object
                        return String(value);
                    }
                    
                    // For other properties, use normal nested access
                    const propValue = getNestedField(value, prop);
                    return propValue !== undefined ? String(propValue) : '';
                });
                
                // Handle nested conditionals within the loop
                processed = processed.replace(/\{([^?}]+)\?([^}]*)\}/g, (m, condition, condContent) => {
                    const condValue = condition.startsWith('*.') 
                        ? getNestedField(value, condition.slice(2))
                        : getNestedField(this.data, condition);
                    return this.isTruthy(condValue) ? condContent : '';
                });
                
                // Process any remaining field references
                const subParser = new TemplateParser(loopData);
                processed = subParser.parse(processed);

                // Only push non-empty results
                if (processed.trim()) {
                    results.push(processed);
                }
            }
            
            // Join results with the chosen delimiter
            return results.join(delimiter);
        }
        
        // Process a conditional expression
        processConditional(fieldPath, content) {
            const value = getNestedField(this.data, fieldPath.trim());
            const truthy = this.isTruthy(value);
            
            
            // Check for ternary operator
            // Need to find the : that's not inside nested braces and not escaped with \
            let braceDepth = 0;
            let colonIndex = -1;
            
            for (let i = 0; i < content.length; i++) {
                if (content[i] === '{') {
                    braceDepth++;
                } else if (content[i] === '}') {
                    braceDepth--;
                } else if (content[i] === ':' && braceDepth === 0) {
                    // Check if this colon is escaped with a backslash
                    if (i > 0 && content[i - 1] === '\\') {
                        // This is an escaped colon, not a ternary separator
                        continue;
                    }
                    colonIndex = i;
                    break;
                }
            }
            
            if (colonIndex !== -1) {
                // Ternary operator
                const trueContent = content.substring(0, colonIndex);
                const falseContent = content.substring(colonIndex + 1);
                
                
                const selectedContent = truthy ? trueContent : falseContent;
                
                // Process the selected content for nested templates
                const subParser = new TemplateParser(this.data);
                return subParser.parse(selectedContent);
            }
            
            // Simple conditional
            if (truthy) {
                // Remove escaped colons before parsing
                const unescapedContent = content.replace(/\\:/g, ':');
                // Parse the content, which may contain $() or {} expressions
                const subParser = new TemplateParser(this.data);
                return subParser.parse(unescapedContent);
            }
            
            return '';
        }
        
        // Process a simple field reference
        processField(fieldPath) {
            // Handle function calls like getRelationshipFlavor(value, from, to)
            if (fieldPath.includes('(') && fieldPath.includes(')')) {
                const funcMatch = fieldPath.match(/^(\w+)\((.*)\)$/);
                if (funcMatch) {
                    const funcName = funcMatch[1];
                    const argsStr = funcMatch[2];
                    
                    // Parse arguments (simple comma split for now)
                    const args = argsStr ? argsStr.split(',').map(arg => {
                        arg = arg.trim();
                        // If arg is a field path, resolve it
                        if (arg && !arg.startsWith('"') && !arg.startsWith("'") && isNaN(arg)) {
                            return getNestedField(this.data, arg);
                        }
                        // If it's a string literal, remove quotes
                        if ((arg.startsWith('"') && arg.endsWith('"')) || 
                            (arg.startsWith("'") && arg.endsWith("'"))) {
                            return arg.slice(1, -1);
                        }
                        // If it's a number, parse it
                        if (!isNaN(arg)) {
                            return Number(arg);
                        }
                        return arg;
                    }) : [];
                    
                    // Call the function if it exists
                    if (funcName === 'getRelationshipFlavor' && typeof getRelationshipFlavor === 'function') {
                        return getRelationshipFlavor(...args);
                    }
                    // Add more functions here as needed
                    
                    return ''; // Unknown function
                }
            }
            
            // Handle nested resolution like {character.{name}.location}
            if (fieldPath.includes('{') && fieldPath.includes('}')) {
                const innerPattern = /\{([^}]+)\}/;
                const resolved = fieldPath.replace(innerPattern, (m, innerField) => {
                    const innerValue = getNestedField(this.data, innerField);
                    return innerValue || '';
                });
                
                // Now get the value from the resolved path
                // Check if it's an entity reference (character.Name, Location.Name, etc.)
                const parts = resolved.split('.');
                if (parts.length >= 2) {
                    // Try to load as entity.field path
                    const entityName = parts[0];
                    const field = parts.slice(1).join('.');
                    const entity = get(entityName);
                    if (entity) {
                        return field ? getNestedField(entity, field) || '' : JSON.stringify(entity);
                    }
                }
                return getNestedField(this.data, resolved) || '';
            }
            
            // Simple field reference
            const value = getNestedField(this.data, fieldPath);
            
            // Debug logging removed
            
            if (value === undefined || value === null) {
                if (debug && (fieldPath.includes('gender') || fieldPath.includes('level'))) {
                    console.log(`  Returning empty (undefined/null)`);
                }
                return '';
            }
            
            if (typeof value === 'object') {
                // Don't output raw objects unless it's intentional
                if (debug && (fieldPath.includes('gender') || fieldPath.includes('level'))) {
                    console.log(`  Returning empty (object)`);
                }
                return '';
            }
            
            const result = String(value);
            // Debug logging removed
            return result;
        }
    }
    
    // ==========================
    // Inventory Management
    // ==========================
    
    function getItemQuantity(inventory, itemName) {
        if (!inventory || !inventory[itemName]) return 0;
        const item = inventory[itemName];
        return typeof item === 'number' ? item : (item.quantity || 0);
    }
    
    function setItemQuantity(inventory, itemName, quantity) {
        if (!inventory) inventory = {};
        
        if (quantity <= 0) {
            delete inventory[itemName];
        } else {
            // Preserve other properties if they exist
            if (typeof inventory[itemName] === 'object') {
                inventory[itemName].quantity = quantity;
            } else {
                inventory[itemName] = { quantity: quantity };
            }
        }
        return inventory;
    }
    
    // REMOVED: create() function was redundant with save()
    // Use save() directly for all entity storage
    
    // ==========================
    // Player Command Processing
    // ==========================
    function processPlayerCommand(text) {
        const command = text.toLowerCase().trim();
        
        // Handle /GW abort command
        if (command === '/gw abort' || command === '/gw cancel') {
            gwActive = hasActiveGeneration();
            if (typeof BlueprintManager !== 'undefined' && gwActive) {
                BlueprintManager.cancelGeneration();
                if (debug) console.log(`${MODULE_NAME}: Generation aborted by player`);
                // Show message to player but hide from LLM
                return {
                    handled: true,
                    output: '\n<<<Generation cancelled>>>\n'
                };
            }
            // If no generation active, show message to player
            return {
                handled: true,
                output: '\n<<<No generation in progress>>>\n'
            };
        }
        
        // Add other player commands here in the future
        
        return { handled: false };
    }
    
    // ==========================
    // Parse Function Parameters
    // ==========================
    function parseParameters(paramString) {
        if (!paramString || !paramString.trim()) return [];
        
        const params = [];
        let current = '';
        let inQuotes = false;
        let quoteChar = null;
        let depth = 0;
        
        for (let i = 0; i < paramString.length; i++) {
            const char = paramString[i];
            const nextChar = paramString[i + 1];
            
            // Handle quotes
            if ((char === '"' || char === "'") && !inQuotes) {
                inQuotes = true;
                quoteChar = char;
                // Don't include the quote in the parameter
            } else if (char === quoteChar && inQuotes) {
                inQuotes = false;
                quoteChar = null;
                // Don't include the quote in the parameter
            }
            // Handle nested parentheses (for complex expressions)
            else if (char === '(' && !inQuotes) {
                depth++;
                current += char;
            } else if (char === ')' && !inQuotes) {
                depth--;
                current += char;
            }
            // Handle parameter separation
            else if (char === ',' && !inQuotes && depth === 0) {
                params.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        // Add the last parameter
        if (current.trim()) {
            params.push(current.trim());
        }
        
        // Process parameters to handle types
        return params.map(param => {
            // Remove outer quotes if present
            if ((param.startsWith('"') && param.endsWith('"')) ||
                (param.startsWith("'") && param.endsWith("'"))) {
                return param.slice(1, -1);
            }
            
            // Check for numbers
            if (/^-?\d+$/.test(param)) {
                return parseInt(param);
            }
            if (/^-?\d*\.\d+$/.test(param)) {
                return parseFloat(param);
            }
            
            // Check for booleans
            if (param === 'true') return true;
            if (param === 'false') return false;
            
            // Check for fractions (e.g., "3/10")
            if (/^\d+\/\d+$/.test(param)) {
                return param; // Keep as string for special parsing
            }
            
            return param;
        });
    }
    
    // ==========================
    // Getter System - Process Dynamic Placeholders
    // ==========================
    // Helper function to navigate nested object paths
    function navigatePath(obj, path) {
        if (!obj || !path) return obj;
        
        const parts = path.split('.');
        let current = obj;
        
        for (const part of parts) {
            // Handle array notation [0]
            const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
            if (arrayMatch) {
                const field = arrayMatch[1];
                const index = parseInt(arrayMatch[2]);
                current = current?.[field]?.[index];
            } else {
                current = current?.[part];
            }
            
            if (current === undefined || current === null) {
                return null;
            }
        }
        
        return current;
    }
    
    // New flexible getter system with $() syntax
    function processGetters(text) {
        if (!text) return text;
        
        let recursionDepth = 0;
        const MAX_RECURSION = 10;
        
        function resolveGetters(str) {
            if (recursionDepth++ > MAX_RECURSION) {
                console.log(`${MODULE_NAME}: Max recursion depth reached in getter resolution`);
                return str;
            }
            
            // First, resolve any $() dynamic expressions
            str = str.replace(/\$\(([^)]+)\)/g, (match, expr) => {
                const resolved = resolveGetters(`get[${expr}]`);
                return resolved.replace(/^get\[|\]$/g, '');
            });

            // Process get[entity.field] syntax in text output
            // Supports: get[Kirito.stats.level], get[Global.frontline], get[entity.array[0]]
            const FLEX_GETTER = /get\[([^\]]+)\](?:\.([\w\d_.\[\]]+))?/g;
            
            return str.replace(FLEX_GETTER, (match, selector, pathAfterBracket) => {
                // Parse selector (e.g., "character.Bob.level" or "character.Bob")
                const parts = selector.split('.');
                let entity = null;
                let fieldPath = null;
                

                if (parts[0].toLowerCase() === 'global' || parts[0] === 'var') {
                    // Access global variables: Global.VAR_NAME or var.VAR_NAME
                    // Global variables are all stored together, so get all and navigate
                    entity = loadGlobalVariables();
                    if (parts.length > 1) {
                        fieldPath = parts.slice(1).join('.');
                    }
                } else if (parts[0] === 'time' || parts[0] === 'calendar') {
                    // Access time/calendar data: time.current, time.formatted, etc.
                    const timeField = parts[1];
                    switch(timeField) {
                        case 'current':
                        case 'now':
                            entity = getCurrentTime() || '???';
                            break;
                        case 'formatted':
                            entity = getFormattedTime() || '???';
                            break;
                        case 'day':
                        case 'daynumber':
                            entity = getDayNumber() || '???';
                            break;
                        case 'date':
                            entity = getCurrentDate() || '???';
                            break;
                        case 'formatteddate':
                            entity = getFormattedDate() || '???';
                            break;
                        case 'timeofday':
                            entity = getTimeOfDay() || '???';
                            break;
                        case 'season':
                            entity = getSeason() || '???';
                            break;
                        default:
                            entity = getCurrentTime() || '???';
                    }
                    // Time values are already strings, no need for field navigation
                    if (parts.length > 2) {
                        // Ignore additional fields for time
                        console.log(`${MODULE_NAME}: Time getter doesn't support nested fields: ${parts.slice(2).join('.')}`);
                    }
                    return String(entity);
                }
                
                // Combine internal field path with any path after the bracket
                if (pathAfterBracket) {
                    fieldPath = fieldPath ? `${fieldPath}.${pathAfterBracket}` : pathAfterBracket;
                }
                
                // Navigate to the field if specified
                if (fieldPath && entity) {
                    const value = navigatePath(entity, fieldPath);
                    // Convert objects/arrays to JSON, primitives to string
                    if (value !== null && typeof value === 'object') {
                        return JSON.stringify(value);
                    }
                    return value !== null && value !== undefined ? String(value) : '???';
                }
                
                // Return the entity or ??? if not found
                if (entity !== null && entity !== undefined) {
                    if (typeof entity === 'object') {
                        return JSON.stringify(entity);
                    }
                    return String(entity);
                }
                
                return '???';
            });
        }
        
        return resolveGetters(text);
    }
    
    // Time getter functions (Calendar API)
    function getCurrentTime() {
        if (typeof Calendar === 'undefined' || !Calendar.getCurrentTime) return null;
        return Calendar.getCurrentTime();
    }
    
    function getFormattedTime() {
        if (typeof Calendar === 'undefined' || !Calendar.getFormattedTime) return null;
        return Calendar.getFormattedTime();
    }
    
    function getTimeOfDay() {
        if (typeof Calendar === 'undefined' || !Calendar.getTimeOfDay) return null;
        return Calendar.getTimeOfDay();
    }
    
    function getCurrentDate() {
        if (typeof Calendar === 'undefined' || !Calendar.getCurrentDate) return null;
        return Calendar.getCurrentDate();
    }
    
    function getFormattedDate() {
        if (typeof Calendar === 'undefined' || !Calendar.getDayNumber) return null;
        
        const dayNumber = Calendar.getDayNumber();
        const startDate = new Date(2022, 10, 6); // Nov 6, 2022
        const currentDateObj = new Date(startDate);
        currentDateObj.setDate(startDate.getDate() + dayNumber);
        
        const year = currentDateObj.getFullYear();
        const month = String(currentDateObj.getMonth() + 1).padStart(2, '0');
        const day = String(currentDateObj.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    }
    
    function getDayNumber() {
        if (typeof Calendar === 'undefined' || !Calendar.getDayNumber) return null;
        return Calendar.getDayNumber().toString();
    }
    
    function getSeason() {
        if (typeof Calendar === 'undefined' || !Calendar.getCurrentSeason) return null;
        return Calendar.getCurrentSeason();
    }
    
    // ==========================
    // Scene Injection into Context
    // ==========================
    function createDefaultCurrentScene() {
        // Find the first user-controlled entity
        const userControlled = queryTags('UserControlled');

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
        
        if (debug) console.log(`${MODULE_NAME}: Created default Current Scene template with player: ${playerName}`);
        return defaultText;
    }
    
    function moveCurrentSceneCard(contextText) {
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
            if (debug) console.log(`${MODULE_NAME}: No scene content to move`);
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
                if (debug) log(`${MODULE_NAME}: Scene not found in context at all`);
                return contextText;
            }
            
            // Find where the scene ends by looking for the last line
            const endIndex = contextText.indexOf(lastLine, sceneIndex);
            if (endIndex === -1) {
                if (debug) log(`${MODULE_NAME}: Scene end not found, cannot move`);
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
        
        // Try to place scene 6 sentences from the end
        const sentencesFromEnd = 6;
        
        if (sentences.length <= sentencesFromEnd) {
            if (debug) log(`${MODULE_NAME}: Not enough sentences (${sentences.length}), putting scene at start`);
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
        
        return result;
    }
    
    // ========================================
    // Universal Data System
    // ========================================
    
    // Entity card mapping - maps entity names AND aliases directly to card titles
    // Both real names and aliases point to the same card title for single-lookup efficiency
    let entityCardMap = null;
    
    function buildEntityCardMap() {
        // Map all [SANE:E] and [SANE:D] entities
        // 1. Find all [SANE:E] cards (entity cards with display)
        // 2. Find all [SANE:D] cards (Data~~1~~, Data~~2~~, etc.)
        // 3. Parse <== SANE DATA ==> from each
        // 4. Build map: entityID -> card location
        // 5. Also map all aliases -> card location
        const map = {};

        // Find all [SANE:E] entity cards
        const entityCards = Utilities.storyCard.find(
            c => c.title && c.title.startsWith('[SANE:E] '),
            true // return all matches
        ) || [];

        for (const card of entityCards) {
            // Parse DESCRIPTION to get actual entity ID
            if (card.description && card.description.includes('<== SANE DATA ==>')) {
                const wrappedData = parseEntityData(card.description);

                // Skip if parsing failed
                if (!wrappedData) {
                    console.log(`${MODULE_NAME}: Skipping invalid entity card: ${card.title}`);
                    continue;
                }

                // Extract the entity from the wrapper object
                // The data is in format: {"EntityId": {actual entity data}}
                const entityId = Object.keys(wrappedData)[0];
                const data = wrappedData[entityId];

                if (entityId && data) {
                    // Map the entity ID to the card title
                    const normalizedName = entityId.toLowerCase();
                    map[normalizedName] = card.title;

                    // Also map any aliases directly to the card title
                    if (data.aliases) {
                        const aliases = Array.isArray(data.aliases) ? data.aliases :
                                       typeof data.aliases === 'string' ? data.aliases.split(',').map(a => a.trim()) :
                                       [];

                        for (const alias of aliases) {
                            if (alias) {
                                const normalizedAlias = alias.toLowerCase();
                                // Map alias directly to card title (not to real name)
                                map[normalizedAlias] = card.title;

                            }
                        }
                    }
                }
            }
        }

        // Also check [SANE:D] data cards for entities without display
        const dataCards = Utilities.storyCard.find(
            c => c.title && c.title.startsWith('[SANE:D] '),
            true // return all matches
        ) || [];

        for (const card of dataCards) {
            try {
                const data = JSON.parse(card.description || '{}');
                // Each data card can contain multiple entities
                for (const [entityId, entity] of Object.entries(data)) {
                    const normalizedId = entityId.toLowerCase();
                    map[normalizedId] = card.title;

                    // Also map aliases
                    if (entity.aliases) {
                        for (const alias of entity.aliases) {
                            const normalizedAlias = alias.toLowerCase();
                            map[normalizedAlias] = card.title;
                        }
                    }
                }
            } catch (e) {
                if (debug) console.log(`${MODULE_NAME}: Failed to parse data card ${card.title}: ${e.message}`);
            }
        }
        
        entityCardMap = map;
        return map;
    }
    
    function getEntityCardTitle(entityType, entityId) {
        // Build map if not exists
        if (!entityCardMap) buildEntityCardMap();

        const normalizedId = entityId.toLowerCase();
        // Direct lookup - entityCardMap is now flat (not nested by type)
        return entityCardMap[normalizedId] || null;
    }

    // Unified save function
    function save(entityId, entity) {
        // Save based on display component
        // - Handle overflow with ~~N~~ pattern
        if (!entityId || !entity) {
            console.log(`${MODULE_NAME}: ERROR - save() called with invalid parameters`);
            return false;
        }

        // Ensure entityId is a string and normalize case
        entityId = normalizeEntityId(String(entityId).trim());
        if (!entityId) {
            console.log(`${MODULE_NAME}: ERROR - Entity ID cannot be empty!`);
            return false;
        }

        // IMPORTANT: Ensure entity.id matches the entityId we're saving under
        entity.id = entityId;

        // Ensure aliases is an array (can be empty for temporary entities)
        if (!entity.aliases) {
            entity.aliases = []; // Empty array is OK - entity might not have a name yet
        } else if (!Array.isArray(entity.aliases)) {
            entity.aliases = []; // Fix if not array
        }

        // Remove any aliases that duplicate the entity ID
        if (entity.aliases.length > 0) {
            entity.aliases = entity.aliases.filter(alias => alias !== entityId);
        }

        // Note: Alias collision checking only done in create() and changeEntityId()
        // save() assumes the entity ID is already valid

        // Check if entity has ACTIVE display component to determine storage location
        const hasDisplay = hasDisplayComponent(entity);

        if (!hasDisplay) {
            // Save to [SANE:D] cards - entities without display
            // Load existing data
            const existingData = loadFromDataCards() || {};

            // Update or add the entity
            existingData[entityId] = entity;

            // Save back using the proper overflow handling
            saveToDataCards(existingData);

            // Add the ID field and update cache
            entity.id = entityId;
            dataCache[entityId] = entity;

            return true;
        }

        // Add the ID field to the entity
        entity.id = entityId;

        // Update cache (AFTER duplicate check)
        dataCache[entityId] = entity;  // Direct entity ID

        // Cache all aliases
        if (entity.aliases && Array.isArray(entity.aliases)) {
            for (const alias of entity.aliases) {
                dataCache[alias] = entity;
            }
        }


        // Save entity (handles both [SANE:E] and [SANE:D] cards based on display component)
        const saved = saveEntity(entityId, entity);

        // Note: entityAliasMap is maintained during initialization, not individual saves

        return saved;
    }
    
    // ==========================
    // Helper Functions for Tools
    // ==========================
    
    // Process level ups using nested level.xp structure
    function processLevelUp(character, schema) {
        // Check for level up with nested level.xp structure
        if (!character.stats || !character.stats.level || !character.stats.level.xp) return;
        
        while (character.stats.level.xp.current >= character.stats.level.xp.max) {
            // Subtract XP for this level
            character.stats.level.xp.current -= character.stats.level.xp.max;
            
            // Level up!
            character.stats.level.value = (character.stats.level.value || 1) + 1;
            console.log(character.id + ' reached level ' + character.stats.level.value + '!');
            
            // Calculate new max XP for next level
            const nextLevelXP = calculateLevelXPRequirement(character.stats.level.value + 1);
            character.stats.level.xp.max = nextLevelXP;
            
            // Increase max HP based on level
            const newMaxHP = calculateMaxHP(character.stats.level.value);
            if (!character.stats.hp) character.stats.hp = { current: 100, max: 100 };
            
            // Increase current HP by the difference (heal on level up)
            const hpGain = newMaxHP - character.stats.hp.max;
            character.stats.hp.max = newMaxHP;
            character.stats.hp.current = Math.min(character.stats.hp.max, character.stats.hp.current + hpGain);
            
            console.log(`  HP increased to ${character.stats.hp.current}/${character.stats.hp.max}`);
            
            // Process attribute gains if configured
            
            // Continue checking for multiple level ups
        }
    }
    
    // Process skill level ups
    function processSkillLevelUp(skill, skillName, schema) {
        // Simple skill level up processing
        // Calculate XP needed for next level
        let xpNeeded = calculateSkillXPRequirement(skillName, (skill.level || 1) + 1);
        
        // Initialize skill XP if needed
        if (!skill.xp) {
            skill.xp = { current: 0, max: xpNeeded };
        }
        
        // Check for level up
        while (skill.xp.current >= skill.xp.max) {
            skill.xp.current -= skill.xp.max;
            skill.level = (skill.level || 1) + 1;
            
            console.log('  Skill leveled up to ' + skill.level);
            
            // Recalculate XP needed for next level
            xpNeeded = calculateSkillXPRequirement(skillName, skill.level + 1);
            skill.xp.max = xpNeeded;
        }
    }
    
    // ==========================
    // Tool Processors
    // ==========================
    // All tools are now provided by individual modules
    // Modules self-register their tools during auto-discovery
    // Entity Tracking System
    // ==========================
    function loadEntityTrackerConfig() {
        // Use centralized sectioned config loader
        const sections = Utilities.config.loadSectioned('[SANE:C] Entity Tracker', '# ');
        
        if (Object.keys(sections).length === 0) {
            createEntityTrackerCards();
            return {
                threshold: 5,
                autoGenerate: true,
                blacklist: ['player', 'self', 'me', 'you', 'unknown']
            };
        }
        
        return {
            threshold: parseInt(sections.entity_threshold) || 5,
            autoGenerate: (sections.auto_generate || 'true').toLowerCase() === 'true',
            blacklist: sections.entity_blacklist ? 
                sections.entity_blacklist.split(',').map(s => s.trim().toLowerCase()) : 
                ['player', 'self', 'me', 'you', 'unknown']
        };
    }
    
    function trackUnknownEntity(entityName, toolName, turnNumber) {
        if (!entityName) return;
        
        // Normalize entity name to lowercase for consistent tracking
        entityName = entityName.toLowerCase();
        
        // First check if character exists in the loaded character cache
        // This is the most reliable way to check for existing characters
        const allCharacters = queryTags('Character');
        const existingChar = allCharacters.find(c => c.id.toLowerCase() === entityName);
        if (existingChar) {
            if (debug) console.log(`${MODULE_NAME}: Skipping tracking for existing character in cache: ${entityName}`);
            return;
        }

        // Check if any character has this as a trigger_name
        for (const character of allCharacters) {
            if (character.info && character.info.trigger_name) {
                // Check if trigger_name matches (could be string or array)
                const triggers = Array.isArray(character.info.trigger_name) 
                    ? character.info.trigger_name 
                    : [character.info.trigger_name];
                
                const normalizedTriggers = triggers.map(t => String(t).toLowerCase());
                if (normalizedTriggers.includes(entityName)) {
                    if (debug) console.log(`${MODULE_NAME}: Skipping tracking - ${entityName} is trigger_name for character: ${character.id}`);
                    // Clean up any existing tracking data for this entity
                    removeFromTracker(entityName);
                    return;
                }
            }
        }
        
        // Entity tracking handled by universal data system - no old card fallback needed
        
        // Load and check blacklist from config
        const config = loadEntityTrackerConfig();
        if (config.blacklist && config.blacklist.includes(entityName)) return;
        
        // Load tracker from config card's description field
        const configCard = Utilities.storyCard.get('[SANE:C] Entity Tracker');
        if (!configCard) {
            createEntityTrackerCards();
            return;
        }
        
        let tracker = {};
        if (configCard.description) {
            try {
                // Parse tracker data from description
                const lines = configCard.description.split('\n');
                let currentEntity = null;
                
                for (const line of lines) {
                    if (line.startsWith('# ')) {
                        currentEntity = line.substring(2).trim();
                        tracker[currentEntity] = { count: 0, uniqueTurns: [], lastTool: '' };
                    } else if (currentEntity && line.includes(':')) {
                        const [key, value] = line.split(':').map(s => s.trim());
                        if (key === 'turns') {
                            tracker[currentEntity].uniqueTurns = value ? value.split(',').map(Number) : [];
                            tracker[currentEntity].count = tracker[currentEntity].uniqueTurns.length;
                        } else if (key === 'tool') {
                            tracker[currentEntity].lastTool = value || '';
                        }
                    }
                }
            } catch (e) {
                tracker = {};
            }
        }
        
        // Use provided turn number or default to 0
        const currentTurn = turnNumber || 0;
        
        // Clean up old entries (older than 100 turns)
        const cutoffTurn = currentTurn - 100;
        for (const [name, data] of Object.entries(tracker)) {
            // Filter out turns older than cutoff
            const recentTurns = data.uniqueTurns.filter(turn => turn > cutoffTurn);
            
            // If no recent turns remain, remove the entity from tracking
            if (recentTurns.length === 0) {
                delete tracker[name];
                if (debug) console.log(`${MODULE_NAME}: Removed stale entity from tracker: ${name} (all turns older than ${cutoffTurn})`);
            } else if (recentTurns.length < data.uniqueTurns.length) {
                // Update with only recent turns
                tracker[name].uniqueTurns = recentTurns;
                tracker[name].count = recentTurns.length;
                if (debug) console.log(`${MODULE_NAME}: Cleaned up old turns for ${name}: kept ${recentTurns.length} recent turns`);
            }
        }
        
        // Initialize entity tracking if needed
        if (!tracker[entityName]) {
            tracker[entityName] = {
                count: 0,
                uniqueTurns: [],
                lastTool: ''
            };
        }
        
        // Only track if this is a new turn for this entity
        if (!tracker[entityName].uniqueTurns.includes(currentTurn)) {
            tracker[entityName].uniqueTurns.push(currentTurn);
            tracker[entityName].count++;
        }
        
        tracker[entityName].lastTool = toolName;
        
        // Save updated tracker to config card's description
        let description = '// Entity tracking data\n';
        for (const [name, data] of Object.entries(tracker)) {
            description += `# ${name}\n`;
            description += `turns: ${data.uniqueTurns.join(',')}\n`;
            description += `tool: ${data.lastTool}\n`;
        }
        
        Utilities.storyCard.update('[SANE:C] Entity Tracker', {
            description: description
        });
        
        if (debug) {
            console.log(`${MODULE_NAME}: Tracked unknown entity ${entityName} (unique turns: ${tracker[entityName].uniqueTurns.length})`);
        }
    }
    
    function removeFromTracker(entityName) {
        // Load tracker from config card's description field
        const configCard = Utilities.storyCard.get('[SANE:C] Entity Tracker');
        if (!configCard || !configCard.description) return;
        
        let tracker = {};
        try {
            // Parse tracker data from description
            const lines = configCard.description.split('\n');
            let currentEntity = null;
            
            for (const line of lines) {
                if (line.startsWith('# ')) {
                    currentEntity = line.substring(2).trim();
                    tracker[currentEntity] = { count: 0, uniqueTurns: [], lastTool: '' };
                } else if (currentEntity && line.includes(':')) {
                    const [key, value] = line.split(':').map(s => s.trim());
                    if (key === 'turns') {
                        tracker[currentEntity].uniqueTurns = value ? value.split(',').map(Number) : [];
                        tracker[currentEntity].count = tracker[currentEntity].uniqueTurns.length;
                    } else if (key === 'tool') {
                        tracker[currentEntity].lastTool = value || '';
                    }
                }
            }
        } catch (e) {
            return;
        }
        
        // Remove the entity from tracker
        if (tracker[entityName]) {
            delete tracker[entityName];
            
            // Save updated tracker to config card's description
            let description = '// Entity tracking data\n';
            for (const [name, data] of Object.entries(tracker)) {
                description += `# ${name}\n`;
                description += `turns: ${data.uniqueTurns.join(',')}\n`;
                description += `tool: ${data.lastTool}\n`;
            }
            
            Utilities.storyCard.update('[SANE:C] Entity Tracker', {
                description: description
            });
            
            if (debug) console.log(`${MODULE_NAME}: Removed ${entityName} from entity tracker`);
        }
    }
    
    function shouldTriggerGeneration(entityName) {
        const config = loadEntityTrackerConfig();
        if (!config.autoGenerate) return false;
        
        // Normalize entity name
        entityName = entityName.toLowerCase();
        
        // Check if any existing character has this as a trigger_name
        const allCharacters = queryTags('Character');
        for (const character of allCharacters) {
            if (character.info && character.info.trigger_name) {
                const triggers = Array.isArray(character.info.trigger_name) 
                    ? character.info.trigger_name 
                    : [character.info.trigger_name];
                
                const normalizedTriggers = triggers.map(t => String(t).toLowerCase());
                if (normalizedTriggers.includes(entityName)) {
                    if (debug) console.log(`${MODULE_NAME}: Not triggering generation - ${entityName} already exists as trigger_name for: ${character.id}`);
                    removeFromTracker(entityName);
                    return false;
                }
            }
        }
        
        // Load tracker from config card's description
        const configCard = Utilities.storyCard.get('[SANE:C] Entity Tracker');
        if (!configCard || !configCard.description) return false;
        
        let tracker = {};
        try {
            // Parse tracker data from description
            const lines = configCard.description.split('\n');
            let currentEntity = null;
            
            for (const line of lines) {
                if (line.startsWith('# ')) {
                    currentEntity = line.substring(2).trim();
                    tracker[currentEntity] = { count: 0, uniqueTurns: [], lastTool: '' };
                } else if (currentEntity && line.includes(':')) {
                    const [key, value] = line.split(':').map(s => s.trim());
                    if (key === 'turns') {
                        tracker[currentEntity].uniqueTurns = value ? value.split(',').map(Number) : [];
                        tracker[currentEntity].count = tracker[currentEntity].uniqueTurns.length;
                    } else if (key === 'tool') {
                        tracker[currentEntity].lastTool = value || '';
                    }
                }
            }
        } catch (e) {
            return false;
        }
        
        const entityData = tracker[entityName];
        if (!entityData) return false;
        
        // Check if already in queue or being generated
        const queueCard = Utilities.storyCard.get('[SANE:C] Entity Queue');
        let queue = [];
        if (queueCard) {
            try {
                queue = JSON.parse(queueCard.entry || '[]');
            } catch (e) {
                queue = [];
            }
        }
        
        if (queue.includes(entityName) || currentEntityGeneration === entityName) {
            return false;
        }
        
        // Check that we have enough unique turns (not total references)
        const hasEnoughUniqueTurns = entityData.uniqueTurns && entityData.uniqueTurns.length >= config.threshold;
        
        return hasEnoughUniqueTurns;
    }
    
    function addToEntityQueue(entityName) {
        // Normalize entity name
        entityName = entityName.toLowerCase();
        
        // Get entity tracker data to see what tool referenced this entity
        const configCard = Utilities.storyCard.get('[SANE:C] Entity Tracker');
        let lastTool = null;
        if (configCard && configCard.description) {
            try {
                const lines = configCard.description.split('\n');
                let currentEntity = null;
                for (const line of lines) {
                    if (line.startsWith('# ')) {
                        currentEntity = line.substring(2).trim();
                    } else if (currentEntity === entityName && line.startsWith('tool:')) {
                        lastTool = line.substring(5).trim();
                        break;
                    }
                }
            } catch (e) {
                // Continue without tool context
            }
        }
        
        // Create entity using blueprint system
        if (debug) console.log(`${MODULE_NAME}: Creating entity via instantiateBlueprint: ${entityName}`);
        const entityId = instantiateBlueprint('Character', {
            info: {
                trigger_name: entityName
            }
        });
        if (entityId) {
            if (debug) console.log(`${MODULE_NAME}: Created character ${entityId} via instantiateBlueprint`);

            // If BlueprintManager is loaded, it will handle generation
            // Otherwise entity exists but fields won't auto-generate
            if (typeof BlueprintManager !== 'undefined') {
                if (debug) console.log(`${MODULE_NAME}: BlueprintManager will handle field generation`);
            }
            return;
        }

        // Fallback to queue system if blueprint creation fails
        const queueCard = Utilities.storyCard.get('[SANE:C] Entity Queue');
        let queue = [];
        if (queueCard) {
            try {
                queue = JSON.parse(queueCard.entry || '[]');
            } catch (e) {
                queue = [];
            }
        }
        
        // Avoid duplicates
        if (!queue.includes(entityName)) {
            queue.push(entityName);
            
            // Save queue to Story Card
            Utilities.storyCard.update('[SANE:C] Entity Queue', {
                entry: JSON.stringify(queue, null, 2),
                type: 'data'
            });
            
            if (debug) console.log(`${MODULE_NAME}: Added ${entityName} to entity generation queue`);
        }
    }
    
    function completeLocationGeneration(locationName, metadata) {
        // Location generation complete
        if (debug) console.log(`${MODULE_NAME}: Location generation complete for ${locationName}`);
        
        // Could add any location-specific completion logic here
        // For now, just log completion
        return true;
    }
    
    function completeEntityGeneration(entityName) {
        // Normalize entity name
        entityName = entityName.toLowerCase();
        
        // Clear from tracker in config card's description
        const configCard = Utilities.storyCard.get('[SANE:C] Entity Tracker');
        if (configCard && configCard.description) {
            try {
                // Parse tracker data from description
                const lines = configCard.description.split('\n');
                let tracker = {};
                let currentEntity = null;
                
                for (const line of lines) {
                    if (line.startsWith('# ')) {
                        currentEntity = line.substring(2).trim();
                        if (currentEntity !== entityName) {
                            tracker[currentEntity] = { uniqueTurns: [], lastTool: '' };
                        }
                    } else if (currentEntity && currentEntity !== entityName && line.includes(':')) {
                        const [key, value] = line.split(':').map(s => s.trim());
                        if (key === 'turns') {
                            tracker[currentEntity].uniqueTurns = value ? value.split(',').map(Number) : [];
                        } else if (key === 'tool') {
                            tracker[currentEntity].lastTool = value || '';
                        }
                    }
                }
                
                // Rebuild description without the completed entity
                let description = '// Entity tracking data\n';
                for (const [name, data] of Object.entries(tracker)) {
                    description += `# ${name}\n`;
                    description += `turns: ${data.uniqueTurns.join(',')}\n`;
                    description += `tool: ${data.lastTool}\n`;
                }
                
                Utilities.storyCard.update('[SANE:C] Entity Tracker', {
                    description: description
                });
            } catch (e) {
                // Ignore parse errors
            }
        }
        
        // Clear current generation flag
        currentEntityGeneration = null;
        
        if (debug) console.log(`${MODULE_NAME}: Completed generation for ${entityName}`);
        
    }
    
    // ==========================
    // Normalize Tools in Text
    // ==========================
    function normalizeToolsInText(text) {
        // This function normalizes tool syntax BEFORE execution
        // Returns modified text with corrected tool calls
        if (!text) return text;

        let modifiedText = text;
        const modifications = [];

        // Find all tool calls in the text
        let match;
        const toolPattern = /(\w+)\s*\(\s*([^)]*)\s*\)/g;

        while ((match = toolPattern.exec(text)) !== null) {
            const fullMatch = match[0];
            const toolName = match[1];
            const paramString = match[2];
            const matchIndex = match.index;

            // Skip getter functions
            if (toolName.startsWith('get_')) {
                continue;
            }

            // Parse parameters
            const params = parseParameters(paramString);
            if (!params || params.length === 0) continue;

            let displayToolName = toolName;
            let displayParams = [...params];
            let needsModification = false;

            // Handle add_item/remove_item conversion based on quantity sign
            if (toolName.toLowerCase() === 'add_item' && params[2]) {
                const qty = parseInt(params[2]);
                if (!isNaN(qty) && qty < 0) {
                    displayToolName = 'remove_item';
                    displayParams[2] = String(Math.abs(qty));
                    needsModification = true;
                }
            } else if (toolName.toLowerCase() === 'remove_item' && params[2]) {
                const qty = parseInt(params[2]);
                if (!isNaN(qty) && qty < 0) {
                    displayToolName = 'add_item';
                    displayParams[2] = String(Math.abs(qty));
                    needsModification = true;
                }
            }

            // Normalize accept_quest parameters
            if (toolName === 'accept_quest') {
                // Normalize quest name (param 1)
                if (displayParams[1]) {
                    const normalized = String(displayParams[1]).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
                    if (normalized !== displayParams[1]) {
                        displayParams[1] = normalized;
                        needsModification = true;
                    }
                }

                // Normalize quest giver (param 2)
                if (displayParams[2]) {
                    const normalized = String(displayParams[2]).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
                    if (normalized !== displayParams[2]) {
                        displayParams[2] = normalized;
                        needsModification = true;
                    }
                }

                // Normalize quest type (param 3)
                if (displayParams[3]) {
                    let questType = String(displayParams[3]).toLowerCase();
                    // Remove _quest suffix if present
                    if (questType.endsWith('_quest')) {
                        questType = questType.substring(0, questType.length - 6);
                    }
                    if (questType !== displayParams[3]) {
                        displayParams[3] = questType;
                        needsModification = true;
                    }
                }
            }

            // Add more tool normalizations here as needed
            // Example: heal/deal_damage conversion based on negative values
            // Example: transfer_item parameter ordering

            if (needsModification) {
                const normalizedTool = `${displayToolName}(${displayParams.join(', ')})`;
                modifications.push({
                    original: fullMatch,
                    replacement: normalizedTool,
                    index: matchIndex,
                    length: fullMatch.length
                });
                if (debug) console.log(`${MODULE_NAME}: Normalizing tool: ${fullMatch} -> ${normalizedTool}`);
            }
        }

        // Apply modifications in reverse order to maintain indices
        modifications.sort((a, b) => b.index - a.index);
        for (const mod of modifications) {
            const before = modifiedText.substring(0, mod.index);
            const after = modifiedText.substring(mod.index + mod.length);
            modifiedText = before + mod.replacement + after;
        }

        return modifiedText;
    }

    // ==========================
    // Process Tools in Text
    // ==========================
    function processTools(text) {
        if (!text) return text;

        // First normalize all tools in the text
        let modifiedText = normalizeToolsInText(text);

        let toolsToRemove = [];
        let executedTools = [];  // Track for RewindSystem

        // Only load characters if there are actually tools to process
        let charactersLoaded = false;
        
        // First pass: find and execute all tools, track malformed ones and ones to modify
        let match;
        TOOL_PATTERN.lastIndex = 0;
        
        while ((match = TOOL_PATTERN.exec(text)) !== null) {
            const fullMatch = match[0];
            const toolName = match[1];
            const paramString = match[2];
            const matchIndex = match.index;
            
            // Skip getter functions (they're not tools)
            if (toolName.startsWith('get_')) {
                continue;
            }
            
            // Tool found - will log execution result below
            
            // Parse parameters
            const params = parseParameters(paramString);
            
            // Load characters on first tool that needs them
            if (!charactersLoaded) {
                // Set cache for all tools to use
                // Load all characters into entity cache
                try {
                    const allChars = queryTags('Character');
                    for (const char of allChars || []) {
                        const name = char.id.toLowerCase();
                        // Update to use just entity ID
                        dataCache[name] = char;  // New way
                        dataCache[`Character.${name}`] = char;  // Old way
                    }
                } catch(e) {
                    // Fall back to GameState.queryTags if available
                    if (GameState && GameState.queryTags) {
                        const allChars = GameState.queryTags('Character');
                        for (const char of allChars || []) {
                            const name = char.aliases && char.aliases[0] ? char.aliases[0] : char.name;
                            if (name) {
                                dataCache[name] = char;  // New way
                                dataCache[`Character.${name}`] = char;  // Old way
                            }
                        }
                    } else {
                        if (debug) console.log(`${MODULE_NAME}: Unable to load characters: ${e}`);
                    }
                }
                charactersLoaded = true;
            }
            
            // Capture revert data BEFORE executing the tool
            const revertData = captureRevertData(toolName.toLowerCase(), params);

            let result = processToolCall(toolName, params);
            
            // Log tool result
            if (debug) {
                // Convert add_item with negative quantity to remove_item for display
                let displayToolName = toolName;
                let displayParams = [...params];
                const toolCall = `${displayToolName}(${displayParams.join(',')})`;
                if (result === 'executed') {
                    console.log(`${MODULE_NAME}: Tool EXECUTED: ${toolCall}`);
                } else if (result === 'permitted') {
                    console.log(`${MODULE_NAME}: Tool PERMITTED (hallucinated entity): ${toolCall}`);
                } else if (result === 'malformed') {
                    console.log(`${MODULE_NAME}: Tool MALFORMED: ${toolCall}`);
                } else if (result === 'unknown') {
                    console.log(`${MODULE_NAME}: Tool UNKNOWN: ${toolCall}`);
                }
            }
            
            // Track executed tools for RewindSystem
            if (result === 'executed') {
                executedTools.push({
                    tool: toolName.toLowerCase(),
                    params: params,
                    executed: true,
                    revertData: revertData
                });
            }
            
            
            // Only remove if malformed or unknown tool
            // Only remove malformed and unknown tools, keep permitted ones
            if (result === 'malformed' || result === 'unknown') {
                toolsToRemove.push({
                    match: fullMatch,
                    index: matchIndex,
                    length: fullMatch.length,
                    reason: result
                });
                if (debug) {
                    console.log(`${MODULE_NAME}: Marking for removal (${result}): ${fullMatch}`);
                }
            }
            // Permitted tools stay in the text but aren't executed
        }
        
        // Apply removals from end to beginning (modifications already done by normalizeToolsInText)
        toolsToRemove.sort((a, b) => b.index - a.index);

        for (const change of toolsToRemove) {
            const before = modifiedText.substring(0, change.index);
            const after = modifiedText.substring(change.index + change.length);

            // Removal (malformed/unknown)
            if (debug) {
                console.log(`${MODULE_NAME}: Removed ${change.reason} tool: ${change.match}`);
            }
            let cleanedBefore = before;
            let cleanedAfter = after;

            // Handle spacing issues
            if (before.endsWith(' ') && after.startsWith(' ')) {
                cleanedAfter = after.substring(1);
            } else if (before.endsWith(' ') && after.startsWith('.')) {
                cleanedBefore = before.trimEnd();
            }

            modifiedText = cleanedBefore + cleanedAfter;
        }
        
        // Final cleanup: fix any double spaces or weird punctuation spacing
        modifiedText = modifiedText
            .replace(/  +/g, ' ')           // Multiple spaces to single space
            .replace(/ \./g, '.')            // Space before period
            .replace(/ ,/g, ',')             // Space before comma
            .replace(/ !/g, '!')             // Space before exclamation
            .replace(/ \?/g, '?')            // Space before question mark
            .replace(/\( /g, '(')            // Space after opening paren
            .replace(/ \)/g, ')')            // Space before closing paren
            .replace(/\n\n\n+/g, '\n\n');   // Multiple newlines to double newline
        
        // Return both the modified text and executed tools
        // We'll record them in the main output hook
        return { modifiedText, executedTools };
    }
    
    // Helper to convert entity array or object to dict keyed by name/ID
    function entitiesToDict(entities) {
        const dict = {};

        // Handle both array and object inputs
        if (Array.isArray(entities)) {
            // Original array handling
            for (const entity of entities) {
                const entityId = entity.aliases && entity.aliases[0] ? entity.aliases[0] : entity.id || 'unknown';
                if (entityId) {
                    dict[entityId.toLowerCase()] = entity;
                    // Also store by original case for compatibility
                    dict[entityId] = entity;
                }
            }
        } else if (typeof entities === 'object' && entities !== null) {
            // If already an object (from queryTags), just return it
            // queryTags already returns entities keyed by their IDs
            return entities;
        }

        return dict;
    }

    // Capture revert data for specific tools
    function captureRevertData(toolName, params, characters) {
        if (!characters) {
            const entities = queryTags('Character');
            characters = entitiesToDict(entities);
        }
        const revertData = {};
        
        switch(toolName) {
            case 'update_location':
                const char = characters[String(params[0]).toLowerCase()];
                if (char && char.info) {
                    revertData.oldLocation = char.info.currentLocation;
                }
                break;
                
            default:
                // Check if this is an update_[stat] tool
                if (toolName.startsWith('update_')) {
                    const statName = toolName.substring(7); // Remove 'update_'
                    const statChar = characters[String(params[0]).toLowerCase()];
                    if (statChar && statChar.attributes && statChar.attributes[statName]) {
                        // Store old attribute value
                        revertData.oldValue = statChar.attributes[statName].value;
                        revertData.statName = statName;
                    }
                }
                break;
        }
        
        return revertData;
    }
    
    function processToolCall(toolName, params, characters) {
        // Normalize tool name to lowercase for lookup
        const normalizedToolName = toolName.toLowerCase();

        // Characters are already in entityCache, set by processTools

        // Check module tools FIRST (highest priority)
        if (moduleRegistry.tools[normalizedToolName]) {
            try {
                const result = moduleRegistry.tools[normalizedToolName](params);
                return result;
            } catch (e) {
                if (debug) {
                    console.log(`${MODULE_NAME}: Error in module tool ${normalizedToolName}: ${e.message}`);
                }
                return 'malformed';
            }
        }

        // Check runtime tools (second priority - can override built-ins)
        if (runtimeTools[normalizedToolName]) {
            try {
                const result = runtimeTools[normalizedToolName](...params);
                return result;
            } catch (e) {
                if (debug) {
                    console.log(`${MODULE_NAME}: Error in runtime tool ${normalizedToolName}: ${e.message}`);
                }
                return 'malformed';
            }
        }

        // Built-in tools removed - all tools now in modules or runtime

        // Legacy toolProcessors removed - all tools now in built-in or runtime

        // Check for dynamic core stat tools (update_hp, update_mp, etc)
        if (normalizedToolName.startsWith('update_')) {
            // Just try to process it as a core stat tool
            const result = processCoreStatTool(normalizedToolName, params);
            if (result === true) {
                return 'executed';
            } else if (result === 'not_found') {
                // Character doesn't exist - permit the tool to allow hallucination
                return 'permitted';
            }
            // Other failures are malformed
            return 'malformed';
        }

        // Unknown tool
        if (debug) console.log(`${MODULE_NAME}: Unknown tool: ${toolName}`);
        return 'unknown';
    }
    
    function processCoreStatTool(toolName, params) {
        const characterName = String(params[0]).toLowerCase();
        
        // Check for update_max_[stat] pattern
        if (toolName.startsWith('update_max_')) {
            const statName = toolName.substring(11).toLowerCase();
            
            // Load the character
            const character = get(characterName);
            if (!character) {
                if (debug) console.log(`${MODULE_NAME}: Character ${characterName} not found`);
                return 'not_found';
            }
            
            const newMax = parseInt(params[1]);
            if (isNaN(newMax)) {
                if (debug) console.log(`${MODULE_NAME}: Invalid max value: ${params[1]}`);
                return false;
            }
            
            // Update max value using component paths only
            if (!character.stats || !character.stats[statName] || typeof character.stats[statName] !== 'object') {
                if (debug) console.log(`${MODULE_NAME}: Stat ${statName} not found in character.stats component`);
                return false;
            }
            
            character.stats[statName].max = newMax;
            if (character.stats[statName].current > newMax) {
                character.stats[statName].current = newMax;
            }
            
            save(characterName, character);
            if (debug) console.log(`${MODULE_NAME}: Set ${characterName}'s max ${statName} to ${newMax}`);
            return true;
        }
        
        // Check for update_[stat] pattern (current value)
        const statName = toolName.substring(7).toLowerCase();
        
        // Load the character
        const character = get(characterName);
        if (!character) {
            if (debug) console.log(`${MODULE_NAME}: Character ${characterName} not found`);
            return 'not_found';
        }
        
        const current = parseInt(params[1]);
        if (isNaN(current)) {
            if (debug) console.log(`${MODULE_NAME}: Invalid value for ${statName}: ${params[1]}`);
            return false;
        }
        
        // Initialize stats component if missing
        if (!character.stats) {
            character.stats = {};
        }
        
        // Initialize the stat if it doesn't exist
        if (!character.stats[statName]) {
            // Stats like hp/mp have current/max, others might just have value
            if (statName === 'hp' || statName === 'mp' || statName === 'sp' || statName === 'stamina') {
                character.stats[statName] = { current: 100, max: 100 };
            } else {
                character.stats[statName] = { value: current };
            }
            if (debug) console.log(`${MODULE_NAME}: Created new stat ${statName} for ${character.id}`);
        }
        
        // Update the stat value
        if (typeof character.stats[statName] === 'object') {
            // Check if this stat uses current/max or just value
            if ('current' in character.stats[statName]) {
                character.stats[statName].current = current;
                // NO 3rd parameter handling - use update_max_[stat] instead
            } else if ('value' in character.stats[statName]) {
                character.stats[statName].value = current;
            } else {
                // Fallback - assume it's a value-based stat
                character.stats[statName].value = current;
            }
        }
        
        save(characterName, character);
        if (debug) console.log(`${MODULE_NAME}: Updated ${characterName}'s ${statName} to ${current}`);
        return true;
    }
    
    // ==========================
    // Debug Helper Functions (only work when debug = true)
    // ==========================
    
    // Load debug commands from external module if available
    function handleDebugCommand(commandName, args) {
        const debugCommands = [
            'gw_activate', 'gw_npc', 'gw_quest', 'gw_location', 'gw_status', 'gw_blueprints',
            'entity_status', 'char_list', 'schema_all',
            'runtime_test', 'test_footer', 'test_info', 'test_template', 'test_inventory', 'test_all',
            'cleanup', 'fix_format',
            'debug_log', 'debug_help'
        ];

        if (debugCommands.includes(commandName)) {
            if (commandName === 'debug_help') {
                return `\n<<<[DEBUG COMMANDS]\n${debugCommands.filter(c => c !== 'debug_help').map(c => `/${c}`).join('\n')}>>>\n`;
            }

            if (commandName === 'debug_log') {
                return `\n<<<${outputDebugLog()}>>>\n`;
            }

            if (commandName === 'gw_activate') {
                // GenerationWizard module handles activation automatically
                return "\n<<<GenerationWizard module auto-activates queued entities>>>\n";
            }

            if (commandName === 'gw_npc') {
                // Call the gw_npc tool from module registry
                const tool = moduleRegistry.tools['gw_npc'];
                if (!tool) return "<<<gw_npc tool not available (GenerationWizardModule not loaded?)>>>";

                // Generate a random name for the NPC
                const npcName = `npc_${Math.floor(Math.random() * 10000)}`;
                const result = tool([npcName]);

                if (result === 'executed') {
                    console.log(`[DEBUG] Created NPC entity: ${npcName}`);
                    return `\n<<<Created NPC entity: ${npcName} for generation>>>\n`;
                } else {
                    return `\n<<<Failed to create NPC: ${result}>>>\n`;
                }
            }

            if (commandName === 'gw_quest') {
                // Call the gw_quest tool from module registry
                const tool = moduleRegistry.tools['gw_quest'];
                if (!tool) return "<<<gw_quest tool not available (GenerationWizardModule not loaded?)>>>";

                // Use provided name or generate a random one
                const questName = args[0] || `quest_${Math.floor(Math.random() * 10000)}`;
                const result = tool([questName]);

                if (result === 'executed') {
                    console.log(`[DEBUG] Created Quest entity: ${questName}`);
                    return `\n<<<Created Quest entity: ${questName} for generation>>>\n`;
                } else {
                    return `\n<<<Failed to create Quest: ${result}>>>\n`;
                }
            }

            if (commandName === 'gw_location') {
                // Call the gw_location tool from module registry
                const tool = moduleRegistry.tools['gw_location'];
                if (!tool) return "<<<gw_location tool not available (GenerationWizardModule not loaded?)>>>";

                // Use provided name or generate a random one
                const locationName = args[0] || `location_${Math.floor(Math.random() * 10000)}`;
                const result = tool([locationName]);

                if (result === 'executed') {
                    console.log(`[DEBUG] Created Location entity: ${locationName}`);
                    return `\n<<<Created Location entity: ${locationName} for generation>>>\n`;
                } else {
                    return `\n<<<Failed to create Location: ${result}>>>\n`;
                }
            }

            if (commandName === 'gw_status') {
                // Call the gw_status tool from module registry
                const tool = moduleRegistry.tools['gw_status'];
                if (!tool) return "<<<gw_status tool not available (GenerationWizardModule not loaded?)>>>";

                // Execute the tool
                const result = tool([]);

                // The gw_status tool sets state.message with status info
                let status = "=== GenerationWizard Status ===\n";
                if (state && state.message) {
                    status += state.message;
                } else {
                    status += "No active generation\n";
                }

                return `\n<<<${status}>>>\n`;
            }

            if (commandName === 'gw_blueprints') {
                const blueprints = Utilities.storyCard.find(card => card.title && card.title.startsWith('[SANE:BP]'), true) || [];
                const prompts = Utilities.storyCard.find(card => card.title && card.title.startsWith('[GW:P]'), true) || [];

                let output = "=== Blueprints and Prompts ===\n";
                output += "\n[SANE:BP] Blueprints:\n";
                blueprints.forEach(bp => {
                    const name = bp.title.replace('[SANE:BP] ', '');
                    output += `  • ${name}\n`;
                });

                output += "\n[GW:P] Prompts:\n";
                prompts.forEach(p => {
                    const name = p.title.replace('[GW:P] ', '');
                    output += `  • ${name}\n`;
                });

                return output;
            }

            if (commandName === 'cleanup') {
                const testNames = ['Debug_Test_NPC', 'Debug_Test_Monster', 'Debug_Test_Boss',
                                 'DebugFooterTest', 'QuickTest', 'TemplateTest',
                                 'TempNPC_', 'debug_trigger_'];
                let removed = 0;

                for (const name of testNames) {
                    const saneCards = Utilities.storyCard.find(
                        card => card.title && card.title.includes(name),
                        true
                    ) || [];

                    for (const card of saneCards) {
                        Utilities.storyCard.remove(card.title);
                        removed++;
                    }
                }

                return `Cleanup complete. Removed ${removed} debug/test cards.`;
            }

            return null;
        }

        return null;
    }


    // ==========================
    // Hook Processing
    // ==========================

    // Auto-initialize runtime cards on first run
    
    // Auto-initialize entity tracker cards
    if (!Utilities.storyCard.get('[SANE:C] Entity Tracker')) {
        createEntityTrackerCards();
    }

    // Auto-initialize global variables card
    if (!Utilities.storyCard.get('[SANE:G] Variables')) {
        Utilities.storyCard.add({
            title: '[SANE:G] Variables',
            type: 'data',
            entry: '# Global Variables Definition\n' +
                   'frontline: integer = 1 // Current highest floor reached\n' +
                   'currentFloor: integer = 1 // Floor the player is on\n' +
                   'weather: string = "clear" // Current weather conditions',
            description: 'Define variables as: name: type = default // description'
        });
        if (debug) console.log(`${MODULE_NAME}: Created [SANE:G] Variables card`);
    }

    // Auto-initialize [SANE:D] Data card with Global entity
    if (!Utilities.storyCard.get('[SANE:D] Data')) {
        // Create initial Global entity with default values from [SANE:G] Variables
        const globalEntity = {
            id: 'Global',
            frontline: 1,
            currentFloor: 1,
            weather: 'clear'
        };

        // Save to [SANE:D] Data card
        Utilities.storyCard.add({
            title: '[SANE:D] Data',
            type: 'data',
            entry: 'Data chunk 1 of 1',
            description: JSON.stringify({ Global: globalEntity }, null, 2)
        });
        if (debug) console.log(`${MODULE_NAME}: Created initial [SANE:D] Data card with Global entity`);
    }

    function createSANESchemas() {
        // Create schema Story Cards from module registry
        for (const [schemaName, schema] of Object.entries(moduleRegistry.schemas)) {
            const cardTitle = `[SANE:S] ${schemaName}`;
            if (!Utilities.storyCard.get(cardTitle)) {
                const cardDef = {
                    title: cardTitle,
                    description: JSON.stringify(schema, null, 2),
                    type: 'schema'
                };
                Utilities.storyCard.add(cardDef);
                if (debug) console.log(`${MODULE_NAME}: Created ${cardTitle} from module`);
            }
        }
    }

    // Create GameState API for modules to use
    const GameStateAPI = {
        get, set, del, resolve, save,
        debug, MODULE_NAME,
        queryTags,             // Query system
        hasGameplayTag,        // Tag checking utility
        loadAllEntities,       // Load all entities from storage
        registerModule,        // Module system
        instantiateBlueprint,  // Blueprint system
        changeEntityId,        // Rename entities
        trackUnknownEntity, shouldTriggerGeneration, addToEntityQueue,
        getItemQuantity, setItemQuantity,
        calculateLevelXPRequirement,
        calculateMaxHP,
        calculateSkillXPRequirement,
        processLevelUp, processSkillLevelUp,
        getSkillRegistry,
        getRelationshipFlavor,
        Utilities
    };

    // Auto-discover all SANE modules by looking for the isSANEModule marker
    function discoverModules() {
        const discovered = [];

        // Check for any function with our marker
        try {
            // Get all global function names
            const globalKeys = Object.keys(this || globalThis || window || {});

            for (const key of globalKeys) {
                try {
                    const value = (this || globalThis || window)[key];

                    // Check if it's a function with our marker
                    if (typeof value === 'function' && value.isSANEModule === true) {
                        const moduleInstance = value();
                        registerModule(key, moduleInstance);
                        discovered.push(key);
                        if (debug) console.log(`${MODULE_NAME}: Loaded module: ${key}`);
                    }
                } catch (e) {
                    // Not a module or error instantiating, skip
                }
            }
        } catch (e) {
            console.log(`${MODULE_NAME}: Error during module discovery: ${e.message}`);
        }

        if (debug && discovered.length === 0) {
            console.log(`${MODULE_NAME}: No modules discovered. Modules must have .isSANEModule = true marker`);
        }

        return discovered;
    }

    // Discover and load all modules
    const discoveredModules = discoverModules();

    // Create context object for runtime tools (if needed)
    const toolContext = {
        // Logging variables
        debug: debug,
        MODULE_NAME: MODULE_NAME,

        // Core data functions
        get: get,
        set: set,
        del: del,
        save: save,
        resolve: resolve,

        // Query and tag functions
        queryTags: queryTags,
        hasGameplayTag: hasGameplayTag,

        // Entity tracking functions
        trackUnknownEntity: trackUnknownEntity,
        shouldTriggerGeneration: shouldTriggerGeneration,
        addToEntityQueue: addToEntityQueue,

        // Inventory helpers
        getItemQuantity: getItemQuantity,
        setItemQuantity: setItemQuantity,

        // Level/skill progression functions
        calculateLevelXPRequirement: calculateLevelXPRequirement,
        calculateMaxHP: calculateMaxHP,
        calculateSkillXPRequirement: calculateSkillXPRequirement,
        processLevelUp: processLevelUp,
        processSkillLevelUp: processSkillLevelUp,
        getSkillRegistry: getSkillRegistry,

        // Relationship functions
        getRelationshipFlavor: getRelationshipFlavor,

        // Location functions
        getOppositeDirection: getOppositeDirection,
        updateLocationPathway: updateLocationPathway,

        // External modules
        Utilities: Utilities,

        // BlueprintManager check
        BlueprintManager: typeof BlueprintManager !== 'undefined' ? BlueprintManager : undefined,
        Calendar: typeof Calendar !== 'undefined' ? Calendar : undefined,

        // Module tools reference
        moduleTools: moduleRegistry.tools,

        // BlueprintManager active flag
        gwActive: gwActive
    };

    // No built-in tools to create - all provided by modules

    // Auto-initialize SANE schemas on first run
    createSANESchemas();

    // Initialize data cache after creating schemas
    initializeDataCache();

    // Built-in tools removed - all tools provided by modules

    // Public API

    // Universal Data System - NEW PRIMARY API
    GameState.save = save;
    GameState.resolve = resolve;  // Dynamic path resolution

    // Query system
    GameState.queryTags = queryTags;  // Primary query interface
    GameState.hasGameplayTag = hasGameplayTag;  // Tag checking utility
    GameState.loadAllEntities = loadAllEntities;  // Load all entities from storage

    GameState.processTools = processTools;
    GameState.processGetters = processGetters;

    // Display system
    GameState.buildEntityDisplay = buildEntityDisplay;  // Build display text for entity

    // Module system
    GameState.registerModule = registerModule;

    // Universal data access (replaces getGlobalValue/setGlobalValue)
    GameState.get = get;
    GameState.set = set;
    GameState.del = del;

    // Entity management functions
    GameState.instantiateBlueprint = instantiateBlueprint;  // Create entity from blueprint
    GameState.changeEntityId = changeEntityId;  // Change the actual entity ID
    GameState.removeComponent = removeComponent;
    GameState.addComponent = addComponent;
    GameState.deleteEntity = deleteEntity;  // Delete an entity completely

    // Debug functions for DebugCommands module
    GameState.outputDebugLog = outputDebugLog;

    // Activate or deactivate display for an entity
    GameState.setDisplayActive = function(entityId, active = true) {
        const entity = get(entityId);
        if (!entity) {
            console.log(`${MODULE_NAME}: Entity ${entityId} not found`);
            return false;
        }

        // Ensure entity has display component
        if (!entity.components || !entity.components.includes('display')) {
            console.log(`${MODULE_NAME}: Entity ${entityId} doesn't have display component`);
            return false;
        }

        // Initialize display object if needed
        if (!entity.display) {
            entity.display = {};
        }

        // Set active state
        entity.display.active = active;

        // Save the entity - this will move it to/from [SANE:E] based on active state
        const result = save(entityId, entity);

        if (debug) console.log(`${MODULE_NAME}: Set display.active=${active} for ${entityId}`);
        return result;
    };

    // Export TemplateParser for use by other modules
    GameState.TemplateParser = TemplateParser;
    
    GameState.getPlayerName = function() {
        // Find the first user-controlled entity
        const userControlled = queryTags('UserControlled');

        if (userControlled && userControlled.length > 0) {
            return userControlled[0].id;
        }

        if (debug) console.log(`${MODULE_NAME}: No user-controlled entity found`);
        return null;
    };
    
    // Entity tracking API
    GameState.completeEntityGeneration = completeEntityGeneration;
    GameState.completeLocationGeneration = completeLocationGeneration;
    GameState.loadEntityTrackerConfig = loadEntityTrackerConfig;
    
    // Tool processing API
    GameState.processToolCall = processToolCall;
    
    // Rewind System API
    GameState.RewindSystem = RewindSystem;
    
    // Field accessor methods
    GameState.getCharacterField = getNestedField;
    GameState.setCharacterField = setNestedField;
    GameState.getField = function(characterName, fieldPath) {
        const character = GameState.get(characterName);
        if (!character) return null;
        return getNestedField(character, fieldPath);
    };
    GameState.setField = function(characterName, fieldPath, value) {
        const character = GameState.get(characterName);
        if (!character) return false;

        setNestedField(character, fieldPath, value);
        return save(characterName, character);
    };
    GameState.modifyField = function(characterName, fieldPath, delta) {
        const current = GameState.getField(characterName, fieldPath);
        if (current === null || typeof current !== 'number') return false;
        
        return GameState.setField(characterName, fieldPath, current + delta);
    };

    switch(hook) {
        case 'input': {
            try {
                // Initialize debug logging for this turn
                if (debug) initDebugLogging();

                // Initialize all core systems on first run
                loadVariableDefinitions();

            // Data cache is already initialized at module load, no need to re-initialize

            // Store original input for logging
            const originalInput = text;
            
            // Load input systems
            loadInputCommands();
            loadInputModifier();
            
            // Apply INPUT_MODIFIER first
            if (inputModifier) {
                try {
                    text = inputModifier(text);
                    if (debug) console.log(`${MODULE_NAME}: Applied input modifier`);
                } catch(e) {
                    if (debug) console.log(`${MODULE_NAME}: Input modifier error: ${e}`);
                }
            }
            
            // Check for INPUT_COMMANDS in the text
            // Pattern: /commandname or /commandname args
            const commandPattern = /\/([a-z_]+)(?:\s+([^\n/]*))?/gi;
            let commandResults = [];
            let match;
            
            while ((match = commandPattern.exec(text)) !== null) {
                const commandName = match[1].toLowerCase();
                const argsString = match[2] || '';
                const args = argsString.trim().split(/\s+/).filter(arg => arg);
                
                if (debug) console.log(`${MODULE_NAME}: Found command: /${commandName} with args: [${args.join(', ')}]`);
                
                // Check debug commands first (only when debug mode is on)
                if (debug) {
                    const debugResult = handleDebugCommand(commandName, args);
                    if (debugResult) {
                        console.log(`${MODULE_NAME}: Debug command handled: ${commandName}`);
                        console.log(`${MODULE_NAME}: Debug command result: ${debugResult}`);
                        commandResults.push(debugResult);
                        continue;
                    }
                }
                
                // Check custom commands
                if (inputCommands[commandName]) {
                    const result = inputCommands[commandName](args);
                    if (result !== null && result !== undefined) {
                        if (debug) console.log(`${MODULE_NAME}: Command /${commandName} returned: ${result}`);
                        commandResults.push(result);
                        continue;
                    }
                }
                
                // Check built-in commands
                const processed = processPlayerCommand(`/${commandName} ${args.join(' ')}`);
                if (processed.handled) {
                    commandResults.push(processed.output);
                }
            }
            
            // If any commands were processed, return their combined results
            if (commandResults.length > 0) {
                const result = commandResults.join('\n');

                // Show debug messages to player via state.message but don't add to context
                if (result.includes('<<<') && result.includes('>>>')) {
                    // Debug message - show via state.message but consume the input
                    if (state) {
                        state.message = result.replace(/<<<|>>>/g, '').trim();
                    }
                    // Return a zero-width space to consume the input without adding to context
                    currentHash = RewindSystem.quickHash('\u200B');
                    logTime();
                    return '\u200B';  // Zero-width space - effectively hides from AI
                }

                // Regular command output - return as normal
                currentHash = RewindSystem.quickHash(result);
                logTime();
                return result;
            }

            // Run module input hooks
            for (const inputHook of moduleRegistry.hooks.input) {
                try {
                    const result = inputHook(text);
                    if (result && result.active) {
                        // Module consumed the input
                        text = result.text || '\u200B';
                        if (debug) console.log(`${MODULE_NAME}: Module input hook consumed input`);
                        break; // Stop processing after first module that consumes input
                    } else if (result && result.text) {
                        // Module modified but didn't consume the input
                        text = result.text;
                    }
                } catch (e) {
                    console.log(`${MODULE_NAME}: Error in module input hook: ${e.message}`);
                }
            }

            // If BlueprintManager is active, delegate to it
            gwActive = hasActiveGeneration();
            if (typeof BlueprintManager !== 'undefined' && gwActive) {
                const result = BlueprintManager.process('input', text);
                const finalResult = result.active ? '\n' : text;
                
                // Log the input turn
                logDebugTurn('input', originalInput, finalResult, {
                    commandsProcessed: commandResults.length > 0
                });
                
                // Calculate hash of the final result
                currentHash = RewindSystem.quickHash(finalResult);
                logTime();
                return finalResult;  // Block input if wizard is active
            }
            
            // Log the input turn
            logDebugTurn('input', originalInput, text, {
                commandsProcessed: commandResults.length > 0
            });
            
            // Calculate hash of the modified input text (what will be stored in history)
            currentHash = RewindSystem.quickHash(text);

            logTime();
            return text;
            } catch (e) {
                console.log(`${MODULE_NAME}: Error in input hook:`, e);
                console.log(`${MODULE_NAME}: Stack trace:`, e.stack);
                throw e;
            }
        }

        case 'context': {
            // Initialize debug logging for this turn
            if (debug) initDebugLogging();
            
            // Store original context for logging
            const originalContext = text;
            
            // Store context length for debug output
            if (!state.lastContextLength) {
                state.lastContextLength = 0;
            }
            state.lastContextLength = text ? text.length : 0;
            
            // Check for edits in history (RewindSystem)
            RewindSystem.handleContext();
            
            // Load context modifier
            loadContextModifier();
            
            // Remove any hidden message markers from previous turns (including surrounding newlines)
            let modifiedText = text.replace(/\n*<<<[^>]*>>>\n*/g, '');

            // Run preContext hooks FIRST (for greedy modules like GenerationWizard)
            let intercepted = false;
            if (debug && moduleRegistry.hooks.preContext.length > 0) {
                console.log(`${MODULE_NAME}: Running ${moduleRegistry.hooks.preContext.length} preContext hooks`);
            }
            for (const handler of moduleRegistry.hooks.preContext) {
                try {
                    const result = handler(modifiedText);
                    if (result && result.active) {
                        modifiedText = result.text;
                        intercepted = true;
                        if (debug) console.log(`${MODULE_NAME}: preContext hook intercepted context`);
                        break; // Greedy hook - stop processing
                    }
                } catch (e) {
                    console.log(`${MODULE_NAME}: Error in preContext hook: ${e.message}`);
                }
            }

            // Initialize variables for logging (must be accessible outside conditional blocks)
            let triggerNameMap = {};
            let gettersReplaced = {};

            // If intercepted by greedy hook, skip normal context building
            if (!intercepted) {
                // Move current scene card if it exists (before getters)
                modifiedText = moveCurrentSceneCard(modifiedText);
            // Check for universal object getters
            const hasUniversalGetters = UNIVERSAL_GETTER_PATTERN.test(modifiedText);
            
            if (hasUniversalGetters) {
                // Track which getters are being replaced (count only, not every instance)
                const universalMatches = modifiedText.match(UNIVERSAL_GETTER_PATTERN) || [];
                const getterMatches = [...universalMatches];
                
                if (getterMatches.length > 0) {
                    // Check if any getters need character data
                    let needsCharacters = false;
                    getterMatches.forEach(match => {
                        // Check universal getter format
                        if (match.startsWith('get[')) {
                            const path = match.match(/get\[([^\]]+)\]/)?.[1];
                            if (path && path.toLowerCase().includes('character')) {
                                needsCharacters = true;
                            }
                        }
                        // Check function getter format
                        const innerMatch = match.match(/get_([a-z]+)/i);
                        if (innerMatch) {
                            const getterName = innerMatch[1];
                            gettersReplaced[getterName] = (gettersReplaced[getterName] || 0) + 1;
                            
                            // These getters need character data
                            if (['location', 'hp', 'level', 'xp', 'name', 'attribute', 'skill', 'inventory', 'stat'].includes(getterName)) {
                                needsCharacters = true;
                            }
                        }
                    });
                    
                    // Pre-load characters if needed
                    if (needsCharacters) {
                        const allChars = queryTags('Character');
                        for (const char of allChars || []) {
                            const name = char.id.toLowerCase();
                            // Update to use just entity ID
                        dataCache[name] = char;  // New way
                        dataCache[`Character.${name}`] = char;  // Old way
                        }
                    }
                }
                modifiedText = processGetters(modifiedText);
            }
            
            // Build trigger name to username mapping and replace in tool usages
            // triggerNameMap already declared above for logging scope
            const allCharacters = queryTags('Character');

            // Get current action count for cleanup check
            const currentTurn = info?.actionCount || 0;

            // Build the mapping from character data (info.trigger_name)
            for (const character of allCharacters || []) {
                const charName = character.id.toLowerCase();
                if (character.info?.trigger_name) {
                    const triggerName = character.info.trigger_name;
                    const username = character.id.toLowerCase();

                    // Get generation turn if available
                    const generatedTurn = character.info.generation_turn || 0;

                    // Check if trigger name should be cleaned up (10+ turns old and not in context)
                    if (generatedTurn > 0 && currentTurn - generatedTurn >= 10) {
                        // Check if trigger name still exists in the context
                        const triggerPattern = new RegExp(`\\b${triggerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
                        if (!triggerPattern.test(modifiedText)) {
                            // Remove trigger name from character info
                            delete character.info.trigger_name;
                            delete character.info.generation_turn;

                            // Save handles all key regeneration automatically
                            save(charName, character);

                            if (debug) {
                                console.log(`${MODULE_NAME}: Cleaned up trigger name "${triggerName}" for ${username} (${currentTurn - generatedTurn} turns old)`);
                            }
                            continue; // Skip adding to map since we cleaned it up
                        }
                    }
                    
                    // Add to mapping if trigger name differs from character name
                    if (triggerName.toLowerCase() !== username) {
                        triggerNameMap[triggerName] = username;
                    }
                }
            }
            
            // Single pass replacement of all trigger names in tool usages
            if (Object.keys(triggerNameMap).length > 0) {
                // Build regex pattern for all trigger names
                const triggerNames = Object.keys(triggerNameMap).map(name => 
                    name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                ).join('|');
                
                const toolPattern = new RegExp(
                    `(\\w+\\()(\\s*)(${triggerNames})(\\s*)(,|\\))`,
                    'gi'
                );
                
                modifiedText = modifiedText.replace(toolPattern, (match, func, space1, triggerName, space2, delimiter) => {
                    const username = triggerNameMap[triggerName] || triggerName;
                    if (debug && username !== triggerName) {
                        console.log(`${MODULE_NAME}: Replaced trigger name "${triggerName}" with "${username}" in tool usage`);
                    }
                    return `${func}${space1}${username}${space2}${delimiter}`;
                });
            }
            
            // Legacy BlueprintManager support removed - GenerationWizardModule handles this via hooks
            } // End of !intercepted block

            // Run context modifier hooks (unless intercepted by greedy hook)
            if (!intercepted) {
                for (const handler of moduleRegistry.hooks.context) {
                    try {
                        modifiedText = handler(modifiedText);
                    } catch (e) {
                        console.log(`${MODULE_NAME}: Error in context hook: ${e.message}`);
                    }
                }
            }

            // Apply CONTEXT_MODIFIER if available
            if (!intercepted && contextModifier) {
                try {
                    // Create context for the modifier
                    const context = {
                        get: get,
                        set: set,
                        loadCharacter: function(name) {
                            const chars = queryTags('Character');
                            return chars.find(c => c.id.toLowerCase() === name.toLowerCase());
                        },
                        Utilities: Utilities,
                        Calendar: typeof Calendar !== 'undefined' ? Calendar : null
                    };
                    
                    // Apply modifier with context
                    // If it's already a function, just call it with context
                    if (typeof contextModifier === 'function') {
                        modifiedText = contextModifier.call(context, modifiedText);
                    }
                    
                    if (debug) console.log(`${MODULE_NAME}: Applied context modifier`);
                } catch(e) {
                    if (debug) console.log(`${MODULE_NAME}: Context modifier error: ${e}`);
                }
            }
            
            // Log the context turn
            logDebugTurn('context', originalContext, modifiedText, {
                // Don't include actual context text to save state space
                triggerNamesReplaced: Object.keys(triggerNameMap).length,
                gettersReplaced: gettersReplaced
            });
            
            logTime();
            return modifiedText;  // Return the fully modified text
            }

        case 'output': {
            // Initialize debug logging for this turn
            if (debug) initDebugLogging();
            
            // Store original output for logging
            const originalOutput = text;
            
            
            // Load output modifier
            loadOutputModifier();

            // Run output hooks
            for (const handler of moduleRegistry.hooks.output) {
                try {
                    const result = handler(text);
                    if (result && result.active) {
                        text = result.text;
                        // If a greedy output hook intercepts, log and return
                        logDebugTurn('output', null, null, {
                            moduleIntercepted: true
                        });
                        return text;
                    }
                } catch (e) {
                    console.log(`${MODULE_NAME}: Error in output hook: ${e.message}`);
                }
            }

            // Check if BlueprintManager is processing (legacy support)
            gwActive = hasActiveGeneration();
            if (typeof BlueprintManager !== 'undefined' && gwActive) {
                const result = BlueprintManager.process('output', text);
                if (result.active) {
                    // Log early return
                    logDebugTurn('output', null, null, {
                        generationWizardActive: true
                    });
                    return result.text;  // Return wizard's output (hidden message)
                }
            }

            // Process tools in LLM's output
            let modifiedText = text || '';
            if (text) {
                // Check if there are any tool patterns first
                const hasToolPatterns = TOOL_PATTERN.test(text);
                TOOL_PATTERN.lastIndex = 0; // Reset regex state
                
                if (hasToolPatterns) {
                    loadRuntimeTools();
                }
                
                const result = processTools(text);
                modifiedText = result.modifiedText;
                const executedTools = result.executedTools || [];
                
                // Calculate hash AFTER tool removal so it matches what gets stored
                currentHash = RewindSystem.quickHash(modifiedText);
                
                // Position should be current history.length
                const futurePosition = history ? Math.min(history.length, RewindSystem.MAX_HISTORY - 1) : 0;
                RewindSystem.recordAction(text, executedTools, futurePosition);
                
                
                // Check if BlueprintManager was triggered by any tool or entity generation
                gwActive = hasActiveGeneration();
                if (typeof BlueprintManager !== 'undefined' && gwActive) {
                    // Set message via state instead of adding to text
                    state.message = 'The GM will use the next turn to think. Use `/GW abort` if undesired.';
                    // Add zero-width character to preserve text structure
                    modifiedText += '\u200B';
                    if (debug) console.log(`${MODULE_NAME}: BlueprintManager activated, adding warning to output`);
                    modifiedText += '\u200B';
                    if (debug) console.log(`${MODULE_NAME}: Entity generation triggered, adding warning to output`);
                }
                
                // Apply OUTPUT_MODIFIER if available
                if (outputModifier) {
                    try {
                        modifiedText = outputModifier(modifiedText);
                        if (debug) console.log(`${MODULE_NAME}: Applied output modifier`);
                    } catch(e) {
                        if (debug) console.log(`${MODULE_NAME}: Output modifier error: ${e}`);
                    }
                }
                
                // Log the output turn with tools executed
                logDebugTurn('output', null, null, {
                    toolsExecuted: executedTools,
                    generationWizardActive: hasActiveGeneration()
                });
                
                // Clear cache after processing
                dataCache = {};
                
            }

            // Return the processed text (or empty string if text was null)
            logTime();
            return modifiedText;
        }
    }

    // Make GameState globally available
    if (typeof global !== 'undefined') {
        global.GameState = GameState;
    } 

    // Log execution time before returning
    logTime();
    return GameState;
}
// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameState;
}
