function GameState(hook, text) {
    'use strict';
    
    const debug = true;
    const MODULE_NAME = 'GameState';
    const begin = Date.now(); // Start timing execution
    
    // Variable to track current hash
    let currentHash = null;
    
    // Entity cache - stores all loaded entities for the current turn
    // Uses entity type + name as cache key
    let entityCache = {};
    
    // Helper to get all cached entities of a type
    function getCachedEntitiesOfType(type) {
        const result = {};
        const prefix = type + '.';
        for (const [key, entity] of Object.entries(entityCache)) {
            if (key.startsWith(prefix)) {
                const name = key.substring(prefix.length);
                result[name] = entity;
            }
        }
        return result;
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
    
    // Tool pattern: standard function calls like tool_name(param1, param2, param3)
    const TOOL_PATTERN = /([a-z_]+)\s*\(([^)]*)\)/gi;
    
    // Universal getter pattern for object data: get[objectType.entityName.field]
    // Examples: get[character.Bob.level], get[location.Somewhere_Over_There.type]
    const UNIVERSAL_GETTER_PATTERN = /get\[([^\]]+)\]/gi;
    
    // Function getter pattern for dynamic/computed values: get_function(parameters)
    // Examples: get_currentdate(), get_formattedtime(), get_daynumber()
    const FUNCTION_GETTER_PATTERN = /get_[a-z]+\s*\([^)]*\)/gi;
    
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
        const hasEntityQueued = turnData.entityQueued;
        const hasGenerationWizard = turnData.generationWizardActive;
        
        // Skip storing empty context hooks and output hooks with only "Loaded 1 runtime tools"
        const isEmptyContext = turnData.hook === 'context' && !hasEvents;
        const isBoringOutput = turnData.hook === 'output' && 
            !hasTools && !hasEntityQueued && !hasGenerationWizard &&
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
                !turn.entityQueued && !turn.generationWizardActive) {
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
                if (turn.entityQueued) output += `Entity Queued: ${turn.entityQueued}\n`;
                if (turn.generationWizardActive) output += `GenerationWizard Active: ${turn.generationWizardActive}\n`;
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
    
    // Cache for discovered schemas
    let schemaRegistry = null;
    
    // Cache for field configurations  
    // REMOVED: fieldConfigCache - part of removed SANE_FIELDS system
    
    // Pre-built alias mapping for efficient lookups
    // Maps lowercase aliases -> canonical schema name
    let schemaAliasMap = null;
    
    // Removed - now combined with entityCardMap for single-lookup efficiency
    
    // Discover all available schemas and build registry
    function initializeSchemaRegistry() {
        if (schemaRegistry !== null) return schemaRegistry;
        
        schemaRegistry = {};
        const componentRegistry = {}; // Store component schemas separately
        
        // First, load component definitions from [SANE_COMP] cards
        const compCards = Utilities.storyCard.find(
            card => card.title && card.title.startsWith('[SANE_COMP]'),
            true // Get all matches
        );
        
        for (const card of compCards || []) {
            const match = card.title.match(/\[SANE_COMP\]\s+(.+)/);
            if (!match) continue;
            
            const compName = match[1].trim();
            try {
                // Parse component definition from description field
                const compDef = JSON.parse(card.description || '{}');
                componentRegistry[compName] = {
                    name: compName,
                    fields: compDef.fields || {},
                    defaults: compDef.defaults || {}
                };
            } catch (e) {
                if (debug) console.log(`${MODULE_NAME}: Failed to parse component ${compName}: ${e.message}`);
            }
        }
        
        // Then load entity types from [SANE_ENTITY] cards
        const entityCards = Utilities.storyCard.find(
            card => card.title && card.title.startsWith('[SANE_ENTITY]'),
            true // Get all matches
        );
        
        for (const card of entityCards || []) {
            const match = card.title.match(/\[SANE_ENTITY\]\s+(.+)/);
            if (!match) continue;
            
            const entityType = match[1].trim();
            try {
                // Parse entity definition from description field
                const entityDef = JSON.parse(card.description || '{}');
                schemaRegistry[entityType] = {
                    name: entityType,
                    type: entityType,
                    components: entityDef.components || [],
                    prefixes: entityDef.prefixes || [entityType.toUpperCase()],
                    dataOnly: entityDef.dataOnly || false,
                    singleton: entityDef.singleton || false
                };
            } catch (e) {
                if (debug) console.log(`${MODULE_NAME}: Failed to parse entity type ${entityType}: ${e.message}`);
            }
        }
        
        // Store component registry globally for access
        schemaRegistry._components = componentRegistry;
        
        // Build aliases map for quick lookup
        const aliasMap = {};
        for (const [name, schema] of Object.entries(schemaRegistry)) {
            if (schema.aliases) {
                for (const alias of schema.aliases) {
                    aliasMap[alias] = name;
                }
            }
        }
        schemaRegistry._aliases = aliasMap;
        
        if (debug) {
            log(`${MODULE_NAME}: Registered ${Object.keys(schemaRegistry).length} entity schemas`);
            log(`${MODULE_NAME}: Registered ${Object.keys(componentRegistry).length} component schemas`);
        }
        
        // Ensure Runtime is always available even without explicit schema
        if (!schemaRegistry['Global']) {
            schemaRegistry['Global'] = {
                name: 'Global',
                prefixes: [],
                storageType: 'global'
            };
        }
        
        // Build the complete alias map for O(1) lookups
        schemaAliasMap = {};
        for (const [schemaName, schema] of Object.entries(schemaRegistry)) {
            // Add the schema name itself (normalized)
            schemaAliasMap[schemaName.toLowerCase()] = schemaName;
            
            // Add all defined aliases
            if (schema.aliases) {
                for (const alias of schema.aliases) {
                    schemaAliasMap[alias.toLowerCase()] = schemaName;
                }
            }
            
            // Add all prefixes as aliases
            if (schema.prefixes) {
                for (const prefix of schema.prefixes) {
                    schemaAliasMap[prefix.toLowerCase()] = schemaName;
                }
            }
        }
        
        if (debug) log(`${MODULE_NAME}: Built alias map with ${Object.keys(schemaAliasMap).length} entries`);
        
        // Create default components and entities if they don't exist
        initializeDefaultComponents();
        
        // Create default FORMAT cards if they don't exist
        initializeDefaultFormatCards();
        
        return schemaRegistry;
    }
    
    // Create default component and entity cards if they don't exist
    function initializeDefaultComponents() {
        // Stats component with level containing xp
        if (!Utilities.storyCard.get('[SANE_COMP] stats')) {
            const statsComponent = {
                title: '[SANE_COMP] stats',
                type: 'component',
                description: JSON.stringify({
                    defaults: {
                        level: {
                            value: 1,
                            xp: { current: 0, max: 500 }
                        },
                        hp: { current: 100, max: 100 }
                    }
                }, null, 2)
            };
            Utilities.storyCard.add(statsComponent);
            if (debug) console.log(`${MODULE_NAME}: Created stats component`);
        }
        
        // Info component
        if (!Utilities.storyCard.get('[SANE_COMP] info')) {
            const infoComponent = {
                title: '[SANE_COMP] info',
                type: 'component',
                description: JSON.stringify({
                    defaults: {
                        gender: 'Unknown',
                        race: 'Human',
                        class: 'Adventurer',
                        location: 'Unknown'
                    }
                }, null, 2)
            };
            Utilities.storyCard.add(infoComponent);
            if (debug) console.log(`${MODULE_NAME}: Created info component`);
        }
        
        // Skills component with registry and formulas
        if (!Utilities.storyCard.get('[SANE_COMP] skills')) {
            const skillsComponent = {
                title: '[SANE_COMP] skills',
                type: 'component', 
                description: JSON.stringify({
                    defaults: {},
                    categories: {
                        "combat": { "xp_formula": "level * 80" },
                        "crafting": { "xp_formula": "level * 150" },
                        "social": { "xp_formula": "level * 120" },
                        "gathering": { "xp_formula": "level * 130" },
                        "support": { "xp_formula": "level * 90" }
                    },
                    registry: {
                        "one_handed_sword": { "category": "combat" },
                        "katana": { "category": "combat", "xp_formula": "level * 200" },
                        "two_handed_sword": { "category": "combat" },
                        "rapier": { "category": "combat" },
                        "dagger": { "category": "combat" },
                        "spear": { "category": "combat" },
                        "shield": { "category": "combat" },
                        "parry": { "category": "combat" },
                        "meditation": { "category": "support" },
                        "detection": { "category": "support" },
                        "hiding": { "category": "support" },
                        "alchemy": { "category": "crafting" },
                        "blacksmithing": { "category": "crafting" },
                        "tailoring": { "category": "crafting" },
                        "cooking": { "category": "crafting" },
                        "fishing": { "category": "gathering" },
                        "herbalism": { "category": "gathering" },
                        "mining": { "category": "gathering" },
                        "woodcutting": { "category": "gathering" },
                        "negotiation": { "category": "social" },
                        "intimidation": { "category": "social" },
                        "persuasion": { "category": "social" },
                        "deception": { "category": "social" },
                        "insight": { "category": "social" },
                        "leadership": { "category": "social" },
                        "first_aid": { "category": "support" },
                        "tracking": { "category": "support" },
                        "stealth": { "category": "support" },
                        "lockpicking": { "category": "support" },
                        "acrobatics": { "category": "support" },
                        "night_vision": { "category": "support" },
                        "battle_healing": { "category": "support" },
                        "emergency_recovery": { "category": "support" },
                        "sprint": { "category": "support" },
                        "extended_weight_limit": { "category": "support" },
                        "martial_arts": { "category": "combat" },
                        "throwing": { "category": "combat" },
                        "archery": { "category": "combat" }
                    }
                }, null, 2)
            };
            Utilities.storyCard.add(skillsComponent);
            if (debug) console.log(`${MODULE_NAME}: Created skills component with registry`);
        }
        
        // Attributes component
        if (!Utilities.storyCard.get('[SANE_COMP] attributes')) {
            const attributesComponent = {
                title: '[SANE_COMP] attributes',
                type: 'component',
                description: JSON.stringify({
                    defaults: {},
                    registry: {
                        "VITALITY": { 
                            "formula": "10 + (level - 1) * 2",
                            "description": "Increases max HP"
                        },
                        "STRENGTH": {
                            "formula": "10 + (level - 1) * 2",
                            "description": "Increases physical damage"
                        },
                        "DEXTERITY": {
                            "formula": "10 + (level - 1) * 2",
                            "description": "Increases accuracy and crit chance"
                        },
                        "AGILITY": {
                            "formula": "10 + (level - 1) * 2",
                            "description": "Increases evasion and speed"
                        }
                    }
                }, null, 2)
            };
            Utilities.storyCard.add(attributesComponent);
            if (debug) console.log(`${MODULE_NAME}: Created attributes component`);
        }
        
        // Inventory component
        if (!Utilities.storyCard.get('[SANE_COMP] inventory')) {
            const inventoryComponent = {
                title: '[SANE_COMP] inventory',
                type: 'component',
                description: JSON.stringify({
                    defaults: {}
                }, null, 2)
            };
            Utilities.storyCard.add(inventoryComponent);
            if (debug) console.log(`${MODULE_NAME}: Created inventory component`);
        }
        
        // Relationships component with thresholds
        if (!Utilities.storyCard.get('[SANE_COMP] relationships')) {
            const relationshipsComponent = {
                title: '[SANE_COMP] relationships',
                type: 'component',
                description: JSON.stringify({
                    defaults: {},
                    thresholds: {
                        "Stranger": 0,
                        "Acquaintance": 10,
                        "Friend": 30,
                        "Close Friend": 60,
                        "Best Friend": 100,
                        "Trusted Ally": 150,
                        "Rival": -10,
                        "Enemy": -30,
                        "Nemesis": -60,
                        "Arch-Enemy": -100
                    }
                }, null, 2)
            };
            Utilities.storyCard.add(relationshipsComponent);
            if (debug) console.log(`${MODULE_NAME}: Created relationships component`);
        }
        
        // Character entity type
        if (!Utilities.storyCard.get('[SANE_ENTITY] Character')) {
            const characterEntity = {
                title: '[SANE_ENTITY] Character',
                type: 'entity',
                description: JSON.stringify({
                    components: ['info', 'stats', 'skills', 'attributes', 'inventory', 'relationships'],
                    prefixes: ['CHARACTER', 'PLAYER'],
                    aliases: ['char', 'c'],
                    dataOnly: false
                }, null, 2)
            };
            Utilities.storyCard.add(characterEntity);
            if (debug) console.log(`${MODULE_NAME}: Created Character entity type`);
        }
        
        // Location entity type
        if (!Utilities.storyCard.get('[SANE_ENTITY] Location')) {
            const locationEntity = {
                title: '[SANE_ENTITY] Location',
                type: 'entity',
                description: JSON.stringify({
                    components: [],
                    prefixes: ['LOCATION'],
                    aliases: ['loc', 'l'],
                    dataOnly: false
                }, null, 2)
            };
            Utilities.storyCard.add(locationEntity);
            if (debug) console.log(`${MODULE_NAME}: Created Location entity type`);
        }
        
        // Global entity type (singleton)
        if (!Utilities.storyCard.get('[SANE_ENTITY] Global')) {
            const globalEntity = {
                title: '[SANE_ENTITY] Global',
                type: 'entity',
                description: JSON.stringify({
                    components: [],
                    prefixes: [],
                    aliases: ['runtime', 'global'],
                    singleton: true,
                    dataOnly: true
                }, null, 2)
            };
            Utilities.storyCard.add(globalEntity);
            if (debug) console.log(`${MODULE_NAME}: Created Global entity type`);
        }
    }
    
    // Create default FORMAT cards for entities that need them
    function initializeDefaultFormatCards() {
        // Default CHARACTER FORMAT (for NPCs)
        if (!Utilities.storyCard.get('[SANE_FORMAT] CHARACTER')) {
            const characterFormat = {
                title: '[SANE_FORMAT] CHARACTER',
                type: 'schema',
                entry: '// Computed fields\n' +
                    'info_line: {info.dob?DOB\\: $(info.dob) | }Gender: $(info.gender) | Level: $(stats.level.value) ($(stats.level.xp.current)/$(stats.level.xp.max)) | HP: $(stats.hp.current)/$(stats.hp.max) | Location: $(info.location)\n',
                description: '<$# Character>\n' +
                    '## **{name}**{info.full_name? [{info.full_name}]}\n' +
                    '{info_line}\n' +
                    '{info.appearance?**Appearance**\n{info.appearance}\n}' +
                    '{info.personality?**Personality**\n{info.personality}\n}' +
                    '{info.background?**Background**\n{info.background}\n}' +
                    '{attributes?**Attributes**\n{attributes.*|{*}: {*.value}}\n}' +
                    '{skills?**Skills**\n{skills.*:• {*}: Level {*.level} ({*.xp.current}/{*.xp.max} XP)}\n}' +
                    '{inventory?**Inventory**\n{inventory.*:• {*} x{*.quantity}}\n}' +
                    '{relationships?**Relationships**\n{relationships.*:• {*}: {*.}}}' +
                    '{misc?{misc}}'
            };
            Utilities.storyCard.add(characterFormat);
            if (debug) console.log(`${MODULE_NAME}: Created default FORMAT card for CHARACTER`);
        }
        
        // Default PLAYER FORMAT
        if (!Utilities.storyCard.get('[SANE_FORMAT] PLAYER')) {
            const playerFormat = {
                title: '[SANE_FORMAT] PLAYER',
                type: 'schema',
                entry: '// Computed fields\n' +
                    'info_line: {info.dob?DOB\\: $(info.dob) | }Gender: $(info.gender) | Level: $(stats.level.value) ($(stats.level.xp.current)/$(stats.level.xp.max)) | HP: $(stats.hp.current)/$(stats.hp.max) | Location: $(info.location)\n',
                description: '<$# User>\n' +
                    '## **{name}**{info.full_name? [{info.full_name}]}\n' +
                    '{info_line}\n' +
                    '{info.appearance?**Appearance**\n{info.appearance}\n}' +
                    '{info.personality?**Personality**\n{info.personality}\n}' +
                    '{info.background?**Background**\n{info.background}\n}' +
                    '**Attributes**\n{attributes.*|{*}: {*.value}}\n' +
                    '**Skills**\n{skills.*:• {*}\\: Level {*.level} ({*.xp.current}/{*.xp.max} XP)}\n' +
                    '**Inventory**\n{inventory.*:• {*} x{*.quantity}}\n' +
                    '==={name} is a USER. Do not act or speak for them.==='
            };
            
            Utilities.storyCard.add(playerFormat);
            if (debug) console.log(`${MODULE_NAME}: Created default FORMAT card for PLAYER`);
        }
        
        // Default Location FORMAT  
        if (!Utilities.storyCard.get('[SANE_FORMAT] Location')) {
            const locationFormat = {
                title: '[SANE_FORMAT] Location',
                type: 'schema',
                entry: '// Computed fields\n' +
                    'info_line: {info.type?Type: {info.type}}{info.floor? | Floor: {info.floor}}{info.district? | District: {info.district}}\n' +
                    '\n' +
                    '// Format hints\n' +
                    'format:connections: directional\n' +
                    'format:inhabitants: bullets',
                description: '<$# Location>\n' +
                    '## **{name}**\n' +
                    '{info_line}\n' +
                    '{info.description?**Description**\n' +
                    '{info.description}}\n' +
                    '{connections?**Connections**\n' +
                    '{connections_formatted}}\n' +
                    '{info.features?**Notable Features**\n' +
                    '{info.features}}'
            };
            Utilities.storyCard.add(locationFormat);
            if (debug) console.log(`${MODULE_NAME}: Created default FORMAT card for Location`);
        }
    }
    
    // Universal getter function - access any data via path
    // Resolve dynamic expressions in paths
    // Examples:
    // "Character.$(player).level" -> "Character.Bob.level" (if player = "Bob")
    // "Location.$(Character.Bob.location).type" -> "Location.Somewhere_Over_There.type"
    function resolve(path) {
        if (!path || typeof path !== 'string') return path;
        
        // Replace all $(expression) with their evaluated results
        return path.replace(/\$\((.*?)\)/g, function(match, expression) {
            // Recursively resolve the expression
            const resolved = resolve(expression);
            // Get the value at that path
            const value = get(resolved);
            // Return the value as a string for path construction
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
        
        // Parse path: "Character.Bob.level" or "Global.currentPlayer"
        const parts = path.split('.');
        if (parts.length < 2) return undefined;
        
        const objectType = parts[0];
        const entityName = parts[1];
        const fieldPath = parts.slice(2).join('.');
        
        // Special case for Global variables
        if (objectType === 'Global') {
            const value = getGlobalValue(entityName);
            if (value === null) return undefined;
            return fieldPath ? getNestedField(value, fieldPath) : value;
        }
        
        // Load the entity using our simplified load function
        const entity = load(objectType, entityName);
        if (!entity) return undefined;
        return fieldPath ? getNestedField(entity, fieldPath) : entity;
    }
    
    // Universal setter function - set any data via path
    function set(path, value) {
        if (!path) return false;
        
        // First resolve any dynamic expressions in the path
        const resolvedPath = resolve(path);
        if (resolvedPath !== path) {
            path = resolvedPath;
        }
        
        // Parse path: "Character.Bob.level" or "Global.currentPlayer"
        const parts = path.split('.');
        if (parts.length < 2) return false;
        
        const objectType = parts[0];
        const entityName = parts[1];
        const fieldPath = parts.slice(2).join('.');
        
        // Special case for Global variables
        if (objectType === 'Global') {
            if (fieldPath) {
                // Get current value, modify nested field, save back
                let currentValue = getGlobalValue(entityName) || {};
                setNestedField(currentValue, fieldPath, value);
                return setGlobalValue(entityName, currentValue);
            } else {
                return setGlobalValue(entityName, value);
            }
        }
        
        // Load the entity
        const entity = load(objectType, entityName);
        if (!entity) {
            if (debug) console.log(`${MODULE_NAME}: Entity not found: ${objectType}.${entityName}`);
            return false;
        }
        
        // Modify the field
        if (fieldPath) {
            setNestedField(entity, fieldPath, value);
        } else {
            Object.assign(entity, value);
        }
        
        // Save the entity back
        return save(objectType, entity);
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
    
    // Aliases for compatibility with old code that used getNestedValue/setNestedValue
    const getNestedValue = getNestedField;
    const setNestedValue = setNestedField;
    
    // ==========================
    // Location Helper Functions
    // ==========================
    function getOppositeDirection(direction) {
        // Simple hardcoded opposites - could be moved to a component if needed
        const opposites = {
            'north': 'south',
            'south': 'north',
            'east': 'west',
            'west': 'east',
            'northeast': 'southwest',
            'northwest': 'southeast',
            'southeast': 'northwest',
            'southwest': 'northeast',
            'up': 'down',
            'down': 'up',
            'in': 'out',
            'out': 'in',
            'inside': 'outside',
            'outside': 'inside',
            'forward': 'back',
            'back': 'forward',
            'left': 'right',
            'right': 'left'
        };
        
        const lower = direction.toLowerCase();
        const opposite = opposites[lower];
        
        // Return with same capitalization as input
        if (opposite) {
            if (direction[0] === direction[0].toUpperCase()) {
                return opposite.charAt(0).toUpperCase() + opposite.slice(1);
            }
            return opposite;
        }
        
        // No opposite found - return original
        return direction;
    }
    
    function getLocationPathways(locationName) {
        // Get all pathways for a location
        const location = load('Location', locationName);
        if (!location) return {};
        
        return location.pathways || {};
    }
    
    function removeLocationPathway(locationName, direction, removeBidirectional = true) {
        // Remove a pathway from a location
        const location = load('Location', locationName);
        if (!location || !location.pathways) {
            return false;
        }
        
        const dirLower = direction.toLowerCase();
        const destinationName = location.pathways[dirLower];
        
        if (!destinationName) {
            return false; // Pathway doesn't exist
        }
        
        // Remove the pathway
        delete location.pathways[dirLower];
        
        // Save the updated location
        const saved = save('Location', location);
        
        if (saved && removeBidirectional && destinationName) {
            // Also remove reverse pathway
            const destination = load('Location', destinationName);
            if (destination && destination.pathways) {
                const oppositeDir = getOppositeDirection(direction).toLowerCase();
                delete destination.pathways[oppositeDir];
                save('Location', destination);
                
                if (debug) {
                    console.log(`${MODULE_NAME}: Removed bidirectional pathway: ${locationName} -X- ${destinationName}`);
                }
            }
        }
        
        return saved;
    }
    
    function updateLocationPathway(locationName, direction, destinationName, bidirectional = true) {
        // Use universal load function
        const location = load('Location', locationName);
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
        const saved = save('Location', location);
        
        if (saved && bidirectional) {
            // Also update the destination location with reverse pathway
            const destination = load('Location', destinationName);
            if (destination) {
                const oppositeDir = getOppositeDirection(direction).toLowerCase();
                
                if (!destination.pathways || typeof destination.pathways !== 'object') {
                    destination.pathways = {};
                }
                destination.pathways[oppositeDir] = locationName;
                save('Location', destination);
                
                if (debug) {
                    console.log(`${MODULE_NAME}: Created bidirectional pathway: ${locationName} <-${direction}/${oppositeDir}-> ${destinationName}`);
                }
            }
        } else if (saved) {
            if (debug) {
                console.log(`${MODULE_NAME}: Updated ${locationName} pathway ${direction} -> ${destinationName}`);
            }
        }
        
        return saved;
    }
    
    // ==========================
    // Global Variables System (Universal Data Integration)
    // ==========================
    // Global variables now use the universal load/save system
    // They are stored as a special 'Global' entity type
    
    function loadGlobalVariables() {
        // Global variables use [GLOBAL] Global card for singleton storage
        const card = Utilities.storyCard.get('[GLOBAL] Global');
        if (!card || !card.description) return {};
        
        try {
            // Try to parse as JSON first for complex data
            return JSON.parse(card.description);
        } catch (e) {
            // Fall back to key:value format
            const globalVars = {};
            const lines = card.description.split('\n');
            for (const line of lines) {
                const colonIndex = line.indexOf(':');
                if (colonIndex > 0) {
                    const key = line.substring(0, colonIndex).trim();
                    const value = line.substring(colonIndex + 1).trim();
                    try {
                        globalVars[key] = JSON.parse(value);
                    } catch {
                        globalVars[key] = value;
                    }
                }
            }
            return globalVars;
        }
    }
    
    function getGlobalValue(varName) {
        const globalVars = loadGlobalVariables();
        return globalVars[varName] !== undefined ? globalVars[varName] : null;
    }
    
    function setGlobalValue(varName, value) {
        const globalVars = loadGlobalVariables();
        globalVars[varName] = value;
        
        // Save back as JSON for complex data support
        return Utilities.storyCard.upsert('[GLOBAL] Global', {
            entry: 'Global variable storage',
            description: JSON.stringify(globalVars, null, 2)
        });
    }
    
    function deleteGlobalValue(varName) {
        const globalVars = loadGlobalVariables();
        if (!globalVars[varName]) return false;
        
        delete globalVars[varName];
        
        // Save back as JSON
        return Utilities.storyCard.upsert('[GLOBAL] Data', {
            entry: 'Global variable storage',
            description: JSON.stringify(globalVars, null, 2)
        });
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
                load: load,
                save: save,
                loadAll: loadAll
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
                    getGlobalValue: getGlobalValue,
                    setGlobalValue: setGlobalValue,
                    loadAllCharacters: () => loadAll('Character'),
                    loadCharacter: function(name) {
                        const chars = loadAll('Character');
                        return chars[name.toLowerCase()];
                    },
                    saveCharacter: saveCharacter,
                    createCharacter: createCharacter,
                    getField: function(characterName, fieldPath) {
                        const character = loadCharacter(characterName);
                        if (!character) return null;
                        return getCharacterField(character, fieldPath);
                    },
                    setField: function(characterName, fieldPath, value) {
                        const character = loadCharacter(characterName);
                        if (!character) return false;
                        setCharacterField(character, fieldPath, value);
                        return save('Character', character);
                    },
                    Utilities: Utilities,
                    Calendar: typeof Calendar !== 'undefined' ? Calendar : null,
                    GenerationWizard: typeof GenerationWizard !== 'undefined' ? GenerationWizard : null,
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
                'offer_quest': () => null,
                'check_threshold': () => null
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
                                if (revertData.oldQuantity !== undefined) {
                                    // Set the item quantity back to what it was
                                    const charName = String(params[0]).toLowerCase();
                                    const itemName = String(params[1]).toLowerCase().replace(/\s+/g, '_');
                                    const quantity = revertData.oldQuantity;
                                    
                                    if (quantity === 0) {
                                        // Remove the item entirely
                                        const result = processToolCall('remove_item', [params[0], params[1], params[2]]);
                                        if (debug) console.log(`${MODULE_NAME}: Reverted add_item by removing ${itemName} from ${charName}: ${result}`);
                                    } else {
                                        // Set to old quantity
                                        const char = load('Character', charName);
                                        if (char && char.inventory) {
                                            if (!char.inventory[itemName]) char.inventory[itemName] = {};
                                            char.inventory[itemName].quantity = quantity;
                                            save('Character', char);
                                            if (debug) console.log(`${MODULE_NAME}: Reverted add_item by setting ${itemName} quantity to ${quantity} for ${charName}`);
                                        }
                                    }
                                }
                                break;
                                
                            case 'remove_item':
                                if (revertData.oldQuantity !== undefined) {
                                    // Restore the item to its old quantity
                                    const result = processToolCall('add_item', [params[0], params[1], revertData.oldQuantity]);
                                    if (debug) console.log(`${MODULE_NAME}: Reverted remove_item by adding ${params[1]} x${revertData.oldQuantity} to ${params[0]}: ${result}`);
                                }
                                break;
                                
                            case 'transfer_item':
                                // Restore both characters to their old quantities
                                if (revertData.fromOldQuantity !== undefined && revertData.toOldQuantity !== undefined) {
                                    const fromChar = load('Character', String(params[0]).toLowerCase());
                                    const toChar = load('Character', String(params[1]).toLowerCase());
                                    const itemName = String(params[2]).toLowerCase().replace(/\s+/g, '_');
                                    
                                    if (fromChar && fromChar.inventory) {
                                        if (!fromChar.inventory[itemName]) fromChar.inventory[itemName] = {};
                                        fromChar.inventory[itemName].quantity = revertData.fromOldQuantity;
                                        save('Character', fromChar);
                                    }
                                    
                                    if (toChar && toChar.inventory) {
                                        if (revertData.toOldQuantity === 0) {
                                            delete toChar.inventory[itemName];
                                        } else {
                                            if (!toChar.inventory[itemName]) toChar.inventory[itemName] = {};
                                            toChar.inventory[itemName].quantity = revertData.toOldQuantity;
                                        }
                                        save('Character', toChar);
                                    }
                                    
                                    if (debug) console.log(`${MODULE_NAME}: Reverted transfer_item: restored ${itemName} quantities`);
                                }
                                break;
                                
                            case 'deal_damage':
                                if (revertData.oldHp !== undefined) {
                                    const targetName = params[1];
                                    const char = load('Character', String(targetName).toLowerCase());
                                    if (char && char.stats && char.stats.hp) {
                                        char.stats.hp.current = revertData.oldHp;
                                        save('Character', char);
                                        if (debug) console.log(`${MODULE_NAME}: Reverted deal_damage for ${targetName}, restored HP to ${revertData.oldHp}`);
                                    }
                                }
                                break;
                                
                            case 'update_relationship':
                                if (revertData.oldValue !== undefined) {
                                    const char = load('Character', String(params[0]).toLowerCase());
                                    if (char && char.relationships) {
                                        const char2Name = String(params[1]).toLowerCase();
                                        char.relationships[char2Name] = revertData.oldValue;
                                        save('Character', char);
                                        if (debug) console.log(`${MODULE_NAME}: Reverted relationship ${params[0]}->${params[1]} to ${revertData.oldValue}`);
                                    }
                                }
                                break;
                                
                            case 'add_levelxp':
                                if (revertData.oldLevel !== undefined && revertData.oldXp !== undefined) {
                                    const char = load('Character', String(params[0]).toLowerCase());
                                    if (char && char.stats && char.stats.level) {
                                        char.stats.level.value = revertData.oldLevel;
                                        if (!char.stats.level.xp) char.stats.level.xp = {};
                                        char.stats.level.xp.current = revertData.oldXp;
                                        save('Character', char);
                                        if (debug) console.log(`${MODULE_NAME}: Reverted level/XP for ${params[0]} to level ${revertData.oldLevel}, XP ${revertData.oldXp}`);
                                    }
                                }
                                break;
                                
                            case 'add_skillxp':
                                if (revertData.oldLevel !== undefined && revertData.oldXp !== undefined) {
                                    const char = load('Character', String(params[0]).toLowerCase());
                                    const skillName = String(params[1]).toLowerCase().replace(/\s+/g, '_');
                                    if (char && char.skills && char.skills[skillName]) {
                                        char.skills[skillName].level = revertData.oldLevel;
                                        if (!char.skills[skillName].xp) char.skills[skillName].xp = {};
                                        char.skills[skillName].xp.current = revertData.oldXp;
                                        save('Character', char);
                                        if (debug) console.log(`${MODULE_NAME}: Reverted skill ${skillName} for ${params[0]} to level ${revertData.oldLevel}, XP ${revertData.oldXp}`);
                                    }
                                }
                                break;
                                
                            case 'unlock_newskill':
                                // Skip reverting skill unlocks for now - would need to track if it was truly new
                                break;
                                
                            default:
                                // Check if this is an update_[stat] tool
                                if (tool.startsWith('update_') && revertData.statName && revertData.oldValue !== undefined) {
                                    const char = load('Character', String(params[0]).toLowerCase());
                                    if (char && char.attributes && char.attributes[revertData.statName]) {
                                        char.attributes[revertData.statName].value = revertData.oldValue;
                                        save('Character', char);
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
            
            if (debug) console.log(`${MODULE_NAME}: History check complete - ${data.entries.length} entries tracked`);
        }
    };
    
    
    function createEntityTrackerCards() {
        // Create entity tracker config
        if (!Utilities.storyCard.get('[SANE_CONFIG] Entity Tracker')) {
            Utilities.storyCard.add({
                title: '[SANE_CONFIG] Entity Tracker',
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
    // schemaCache already declared at top of file
    
    function calculateLevelXPRequirement(level) {
        // Get stats component for level progression formula
        const statsComp = Utilities.storyCard.get('[SANE_COMP] stats');
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
        const statsComp = Utilities.storyCard.get('[SANE_COMP] stats');
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
        const skillsComp = Utilities.storyCard.get('[SANE_COMP] skills');
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
        const skillsComp = Utilities.storyCard.get('[SANE_COMP] skills');
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
        const relationshipSchema = Utilities.storyCard.get('[SANE_COMP] relationships');
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
        
        // Find matching threshold
        for (const threshold of thresholds) {
            if (value >= threshold.min && value <= threshold.max) {
                // Replace placeholders in flavor text if present
                return threshold.flavor
                    .replace(/\{from\}/g, fromName || '')
                    .replace(/\{to\}/g, toName || '')
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

    if (typeof GenerationWizard !== 'undefined' && typeof GenerationWizard === 'function') {
        GenerationWizard('api', null);
    }
    
    // ==========================
    // Universal Format System
    // ==========================
    
    const formatCaches = {}; // Cache for all object formats
    
    // Resolve object type aliases using schema definitions
    function resolveObjectAlias(objectType) {
        if (!objectType) return objectType;
        
        // Initialize schemas and alias map if needed
        if (!schemaAliasMap) initializeSchemaRegistry();
        
        // Simple O(1) lookup in pre-built map
        const lowerType = objectType.toLowerCase();
        const resolved = schemaAliasMap[lowerType];
        
        // Return resolved name or original if not found
        return resolved || objectType;
    }
    
    // REMOVED loadObjectFormat - redundant with direct FORMAT card loading in saveEntityCard
    
    function parseFormatCard(card) {
        const format = {
            template: '',      // The template from description
            fields: {},        // Field parsing patterns from entry (for reading existing cards)
            computed: {},      // Computed field templates from entry (for building new cards)
            formats: {}        // Format hints for how to display specific fields
        };
        
        // Description IS the template
        format.template = card.description || '';
        
        // Entry contains computed fields and format hints
        // Two formats supported:
        // 1. fieldname: template_expression (for computed fields like prefix, info_line)
        // 2. format:fieldname: format_type (for display format hints)
        if (card.entry) {
            const lines = card.entry.split('\n');
            
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) continue;
                
                // Parse field definition - find the first colon
                const colonIdx = trimmed.indexOf(':');
                if (colonIdx === -1) continue;
                
                const fieldName = trimmed.substring(0, colonIdx).trim();
                const rest = trimmed.substring(colonIdx + 1).trim();
                
                // Check if this is a format hint
                if (fieldName.startsWith('format:')) {
                    // format:fieldname: format_type
                    const actualField = fieldName.substring(7); // Remove 'format:'
                    format.formats[actualField] = rest;
                }
                // Check if this looks like a template expression (contains { } or $())
                else if ((rest.includes('{') && rest.includes('}')) || (rest.includes('$(') && rest.includes(')'))) {
                    // This is a computed field template
                    // Keep the original template as-is
                    format.computed[fieldName] = rest;
                } else {
                    // Deprecated: regex patterns for parsing
                    // We now use JSON data storage, so these patterns are no longer used
                    // Skip storing them to avoid confusion
                    if (debug) console.log(`${MODULE_NAME}: Skipping deprecated parsing pattern: ${fieldName}`);
                }
            }
        }
        
        return format;
    }
    
    
    // ==========================
    // Entity Data Parsing
    // ==========================
    
    // Build structured data for DESCRIPTION field
    function buildEntityData(entity) {
        // Build clean entity with proper field order
        const cleanEntity = {};
        
        // Add primary fields first (in order)
        if (entity.name) cleanEntity.name = entity.name;
        if (entity._type) cleanEntity.type = entity._type;
        if (entity._subtype) cleanEntity.subtype = entity._subtype;  // e.g., 'Player' for PLAYER cards
        if (entity.aliases) cleanEntity.aliases = entity.aliases;
        
        // Skip these fields entirely
        const skipFields = ['name', '_type', '_subtype', 'aliases', '_cardTitle', '_isPlayer', '_title', 
                           'info_line', 'attributes_formatted', 'skills_formatted', 
                           'inventory_formatted', 'relationships_formatted'];
        
        // Add all other fields
        for (const [key, value] of Object.entries(entity)) {
            // Skip internal fields, already-added fields, and computed fields
            if (skipFields.includes(key) || key.startsWith('_') || key.endsWith('_formatted')) continue;
            
            // Skip empty objects and null values
            if (value !== null && value !== undefined && 
                !(typeof value === 'object' && Object.keys(value).length === 0)) {
                cleanEntity[key] = value;
            }
        }
        
        // Build the JSON data with markers
        let data = '<== REAL DATA ==>\n';
        data += JSON.stringify(cleanEntity, null, 2);
        data += '\n<== END DATA ==>';
        return data;
    }
    
    
    // Parse structured data from DESCRIPTION field
    function parseEntityData(description) {
        // Extract data between markers
        const dataMatch = description.match(/<== REAL DATA ==>([\s\S]*?)<== END DATA ==>/);
        if (!dataMatch) {
            console.log(`${MODULE_NAME}: WARNING - No data section found in card description`);
            return {}; // No data section - return empty entity
        }
        
        const dataSection = dataMatch[1].trim();
        
        try {
            // Simply parse the entire JSON object
            const entity = JSON.parse(dataSection);
            
            // Convert 'type' back to '_type' for internal use
            if (entity.type) {
                entity._type = entity.type;
                delete entity.type;
            }
            
            return entity;
        } catch (e) {
            console.log(`${MODULE_NAME}: ERROR - Failed to parse entity JSON: ${e.message}`);
            console.log(`${MODULE_NAME}: Data section: ${dataSection.substring(0, 200)}...`);
            return {}; // Return empty entity if parsing fails
        }
    }
    
    // ==========================
    // Display Card Building from Template
    // ==========================
    
    function formatFieldValue(value, formatType) {
        if (!value || !formatType) return value;
        
        switch(formatType.toLowerCase()) {
            case 'braced':
            case 'inventory':
                // Always format inventory as bulleted list for consistency
                if (typeof value === 'object') {
                    const items = [];
                    
                    for (const [key, val] of Object.entries(value)) {
                        const itemName = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                        
                        if (typeof val === 'object') {
                            const qty = val.quantity || 1;
                            const props = [];
                            if (val.equipped) props.push('equipped');
                            if (val.enhancement) props.push(`+${val.enhancement}`);
                            if (val.durability) props.push(`durability: ${val.durability}`);
                            if (val.bound_to) props.push(`bound: ${val.bound_to}`);
                            
                            if (props.length > 0) {
                                items.push(`• ${itemName} x${qty} (${props.join(', ')})`);
                            } else {
                                items.push(`• ${itemName} x${qty}`);
                            }
                        } else if (typeof val === 'number') {
                            items.push(`• ${itemName} x${val}`);
                        } else {
                            items.push(`• ${itemName}: ${val}`);
                        }
                    }
                    
                    return items.join('\n');
                }
                return value;
                
            case 'json':
                // Format as JSON
                return JSON.stringify(value);
                
            case 'bullets':
            case 'bulleted':
                // Format as bulleted list
                if (typeof value === 'object') {
                    const items = [];
                    for (const [key, val] of Object.entries(value)) {
                        if (typeof val === 'object' && val.name) {
                            items.push(`• ${val.name}: ${val.status || val.value || JSON.stringify(val)}`);
                        } else {
                            items.push(`• ${key}: ${val}`);
                        }
                    }
                    return items.join('\n');
                }
                return value;
                
            case 'pipe':
                // Format as pipe-delimited
                if (typeof value === 'object') {
                    const items = [];
                    for (const [key, val] of Object.entries(value)) {
                        if (typeof val === 'object' && val.name) {
                            items.push(`${val.name}: ${val.status || val.value}`);
                        } else {
                            items.push(`${key}: ${val}`);
                        }
                    }
                    return items.join(' | ');
                }
                return value;
                
            case 'multiline':
                // Format as one per line
                if (typeof value === 'object') {
                    const items = [];
                    for (const [key, val] of Object.entries(value)) {
                        if (typeof val === 'object') {
                            items.push(`${key}: ${JSON.stringify(val)}`);
                        } else {
                            items.push(`${key}: ${val}`);
                        }
                    }
                    return items.join('\n');
                }
                return value;
                
            case 'comma':
                // Format as comma-separated list
                if (Array.isArray(value)) {
                    return value.join(', ');
                } else if (typeof value === 'object') {
                    return Object.keys(value).join(', ');
                }
                return value;
                
            case 'skills_with_xp':
                // Format skills with XP progress
                if (typeof value === 'object') {
                    const formatted = [];
                    for (const [skillName, skillData] of Object.entries(value)) {
                        // Format skill names nicely (one_handed_sword -> One Handed Sword)
                        const displayName = skillName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                        if (typeof skillData === 'object' && skillData.level) {
                            const xp = skillData.xp || 0;
                            const maxXp = skillData.max_xp || 100;
                            formatted.push(`• ${displayName}: Level ${skillData.level} (${xp}/${maxXp} XP)`);
                        } else {
                            formatted.push(`• ${displayName}: ${JSON.stringify(skillData)}`);
                        }
                    }
                    return formatted.join('\n');
                }
                return value;
                
            case 'inline_pipes':
                // Format attributes as pipe-separated (VITALITY: 10 | STRENGTH: 10)
                if (typeof value === 'object') {
                    const items = [];
                    for (const [key, val] of Object.entries(value)) {
                        // Keep attributes uppercase
                        const displayKey = key.toUpperCase();
                        items.push(`${displayKey}: ${val}`);
                    }
                    return items.join(' | ');
                }
                return value;
                
            default:
                return value;
        }
    }
    
    function buildDisplayCard(data, template, cardTitle) {
        // The template IS the description field - just parse it directly
        // Debug logging removed for cleaner output
        
        const parser = new TemplateParser(data);
        return parser.parse(template);
    }
    
    // Process the ENTRY field to extract and evaluate computed fields
    // The DESCRIPTION field IS the template, used directly by buildDisplayCard
    
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
                
                // Handle $() syntax ONLY at the top level, not inside {}
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
            
            // Check for loop syntax: field.*:template or field.*|template
            const loopMatch = content.match(/^([^.*]+)\.\*([:|])(.+)$/s);
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
            const obj = getNestedValue(this.data, objectPath);
            if (!obj || typeof obj !== 'object') return '';
            
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
                    const propValue = getNestedValue(value, prop);
                    return propValue !== undefined ? String(propValue) : '';
                });
                
                // Handle nested conditionals within the loop
                processed = processed.replace(/\{([^?}]+)\?([^}]*)\}/g, (m, condition, condContent) => {
                    const condValue = condition.startsWith('*.') 
                        ? getNestedValue(value, condition.slice(2))
                        : getNestedValue(this.data, condition);
                    return this.isTruthy(condValue) ? condContent : '';
                });
                
                // Process any remaining field references
                const subParser = new TemplateParser(loopData);
                processed = subParser.parse(processed);
                
                if (processed.trim()) {
                    results.push(processed);
                }
            }
            
            // Join results with the chosen delimiter
            return results.join(delimiter);
        }
        
        // Process a conditional expression
        processConditional(fieldPath, content) {
            const value = getNestedValue(this.data, fieldPath.trim());
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
            // Handle nested resolution like {character.{name}.location}
            if (fieldPath.includes('{') && fieldPath.includes('}')) {
                const innerPattern = /\{([^}]+)\}/;
                const resolved = fieldPath.replace(innerPattern, (m, innerField) => {
                    const innerValue = getNestedValue(this.data, innerField);
                    return innerValue || '';
                });
                
                // Now get the value from the resolved path
                // Check if it's an entity reference (character.Name, Location.Name, etc.)
                const parts = resolved.split('.');
                if (parts.length >= 2) {
                    // Initialize schema registry if needed
                    if (!schemaRegistry) schemaRegistry = initializeSchemaRegistry();
                    
                    // Check if first part might be an entity type
                    const possibleType = parts[0];
                    const capitalizedType = possibleType.charAt(0).toUpperCase() + possibleType.slice(1).toLowerCase();
                    
                    // Check if this is a valid entity type in the schema registry
                    if (schemaRegistry[capitalizedType]) {
                        const entityName = parts[1];
                        const field = parts.slice(2).join('.');
                        const entity = load(capitalizedType, entityName);
                        if (entity) {
                            return field ? getNestedValue(entity, field) || '' : JSON.stringify(entity);
                        }
                    }
                }
                return getNestedValue(this.data, resolved) || '';
            }
            
            // Handle direct entity references (character.Name.field, Location.Name.field, etc.)
            const parts = fieldPath.split('.');
            if (parts.length >= 2) {
                // Initialize schema registry if needed
                if (!schemaRegistry) schemaRegistry = initializeSchemaRegistry();
                
                const possibleType = parts[0];
                const capitalizedType = possibleType.charAt(0).toUpperCase() + possibleType.slice(1).toLowerCase();
                
                // Check if this is a valid entity type in the schema registry
                if (schemaRegistry[capitalizedType]) {
                    const entityName = parts[1];
                    const field = parts.slice(2).join('.');
                    const entity = load(capitalizedType, entityName);
                    if (entity) {
                        return field ? getNestedValue(entity, field) || '' : JSON.stringify(entity);
                    }
                }
            }
            
            // Simple field reference
            const value = getNestedValue(this.data, fieldPath);
            
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
    // Universal Entity Saving
    // ==========================
    
    function saveEntityCard(entity, objectType) {
        // Normalize object type
        objectType = resolveObjectAlias(objectType || entity._type);
        
        // Get schema for prefixes
        if (!schemaRegistry) schemaRegistry = initializeSchemaRegistry();
        const schema = schemaRegistry[objectType];
        if (!schema || !schema.prefixes || schema.prefixes.length === 0) {
            if (debug) console.log(`${MODULE_NAME}: No schema found for ${objectType}`);
            return false;
        }
        
        // Check if this entity type is data-only (no display cards)
        if (schema.dataOnly) {
            // This entity type doesn't use display cards
            if (debug) console.log(`${MODULE_NAME}: ${objectType} is data-only, no display card needed`);
            return true; // Successfully "saved" (no display card needed)
        }
        
        // Determine card title - check for existing card first
        let title = null;
        let prefix = null;
        
        // Check all possible prefixes for an existing card
        for (const checkPrefix of schema.prefixes) {
            const checkTitle = `[${checkPrefix}] ${entity.name}`;
            if (Utilities.storyCard.get(checkTitle)) {
                prefix = checkPrefix;
                title = checkTitle;
                break;
            }
        }
        
        // If no existing card, we should NOT create one automatically for PLAYER prefix
        // PLAYER cards are only created manually by users
        if (!title) {
            // Use the first non-PLAYER prefix, or just the first prefix if that's all we have
            prefix = schema.prefixes.find(p => p !== 'PLAYER') || schema.prefixes[0];
            title = `[${prefix}] ${entity.name}`;
        }
        
        // Set subtype based on the prefix we're using
        if (prefix === 'PLAYER') {
            entity._subtype = 'Player';
        } else if (prefix !== schema.prefixes[0]) {
            // If using a non-default prefix, store it as subtype
            entity._subtype = prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase();
        }
        
        
        // Load FORMAT card - try prefix-specific first, then fall back to type
        let formatCard = Utilities.storyCard.get(`[SANE_FORMAT] ${prefix}`);
        if (!formatCard) {
            // Try object type as fallback
            formatCard = Utilities.storyCard.get(`[SANE_FORMAT] ${objectType}`);
            if (!formatCard) {
                // No FORMAT card - cannot save display card
                if (debug) console.log(`${MODULE_NAME}: No FORMAT card for ${prefix} or ${objectType} - cannot save display card`);
                return false;
            }
        }
        
        // Parse FORMAT card
        const formatConfig = parseFormatCard(formatCard);
        
        // Always rebuild - no surgical updates in new system
        const existingCard = Utilities.storyCard.get(title);
        
        // Start with entity data
        const mergedData = { ...entity };
        
        // Ensure name is set
        mergedData.name = entity.name;
        
        // Apply format hints to data fields before computing
        if (formatConfig.formats && Object.keys(formatConfig.formats).length > 0) {
            if (debug) {
                console.log(`${MODULE_NAME}: Applying ${Object.keys(formatConfig.formats).length} format hints`);
                console.log(`${MODULE_NAME}: Format config entries:`, Object.entries(formatConfig.formats));
                console.log(`${MODULE_NAME}: MergedData keys:`, Object.keys(mergedData));
            }
            for (const [fieldPath, formatType] of Object.entries(formatConfig.formats)) {
                const value = getNestedField(mergedData, fieldPath);
                if (debug) {
                    console.log(`${MODULE_NAME}: Looking for field '${fieldPath}', found:`, value !== undefined ? 'YES' : 'NO');
                    if (value !== undefined) {
                        console.log(`${MODULE_NAME}: Field value:`, JSON.stringify(value));
                    }
                }
                if (value !== undefined) {
                    const formatted = formatFieldValue(value, formatType);
                    setNestedField(mergedData, fieldPath + '_formatted', formatted);
                    if (debug) {
                        const preview = typeof formatted === 'string' ? formatted.substring(0, 50) : JSON.stringify(formatted);
                        console.log(`${MODULE_NAME}: Formatted ${fieldPath} as ${formatType}: ${preview}...`);
                    }
                } else {
                    if (debug) console.log(`${MODULE_NAME}: Field '${fieldPath}' not found in entity data`);
                }
            }
        }
        
        // Compute fields from ENTRY before building display
        if (formatConfig.computed && Object.keys(formatConfig.computed).length > 0) {
            for (const [fieldName, templateExpr] of Object.entries(formatConfig.computed)) {
                // Evaluate the template expression with current data
                const parser = new TemplateParser(mergedData);
                const computedValue = parser.parse(templateExpr);
                // Add computed field to data
                mergedData[fieldName] = computedValue;
            }
        }
        
        
        // Build new display card from template
        const newCardContent = buildDisplayCard(mergedData, formatConfig.template, title);
        
        // Build structured data for DESCRIPTION field
        const structuredData = buildEntityData(mergedData);
        
        // Generate keys for character cards
        let keys = null;
        if (objectType === 'Character') {
            // Format: " name,(name, trigger_name,(trigger_name" for characters
            // Space before names WITHOUT parenthesis, no space before names WITH parenthesis
            const name = entity.name || '';
            const triggerName = entity.info?.trigger_name || '';
            if (triggerName && triggerName.toLowerCase() !== name.toLowerCase()) {
                keys = ` ${name.toLowerCase()},(${name.toLowerCase()}, ${triggerName.toLowerCase()},(${triggerName.toLowerCase()}`;
            } else {
                keys = ` ${name.toLowerCase()},(${name.toLowerCase()}`;
            }
        } else if (objectType === 'Location') {
            // Format: "Snake_Case, Normal Case" for locations
            const snakeCased = entity.name.replace(/\s+/g, '_');
            const normalCased = entity.name.replace(/_/g, ' ');
            keys = `${snakeCased}, ${normalCased}`;
        }
        
        // Save or update the card
        if (existingCard) {
            // Preserve existing description content outside data markers
            let updatedDescription = existingCard.description || '';
            
            // Check if there's existing data section to replace
            if (updatedDescription.includes('<== REAL DATA ==>')) {
                // Replace just the data section
                updatedDescription = updatedDescription.replace(
                    /<== REAL DATA ==>([\s\S]*?)<== END DATA ==>/,
                    structuredData
                );
            } else {
                // No data section yet - append it
                if (updatedDescription && !updatedDescription.endsWith('\n')) {
                    updatedDescription += '\n';
                }
                updatedDescription += structuredData;
            }
            
            const updateData = { 
                entry: newCardContent.trim(),
                description: updatedDescription
            };
            if (keys) updateData.keys = keys;
            
            Utilities.storyCard.update(title, updateData);
        } else {
            const cardData = {
                title: title,
                type: 'data',
                entry: newCardContent.trim(),
                description: structuredData
            };
            if (keys) cardData.keys = keys;
            
            Utilities.storyCard.add(cardData);
        }
        
        // Update the entity card map
        if (!entityCardMap) entityCardMap = {};
        if (!entityCardMap[objectType]) entityCardMap[objectType] = {};
        entityCardMap[objectType][entity.name.toLowerCase()] = title;
        
        if (debug) console.log(`${MODULE_NAME}: Saved ${objectType} display card for ${entity.name}`);
        return true;
    }
    
    // ==========================
    // Inventory Management
    // ==========================
    
    function normalizeInventory(inventory) {
        // Convert old format to new format if needed
        // Old: { "sword": 1, "potion": 3 }
        // New: { "sword": { "quantity": 1 }, "potion": { "quantity": 3 } }
        
        if (!inventory || typeof inventory !== 'object') return {};
        
        const normalized = {};
        for (const [item, value] of Object.entries(inventory)) {
            if (typeof value === 'number') {
                // Old format - convert to new
                normalized[item] = { quantity: value };
            } else if (typeof value === 'object' && value !== null) {
                // Already new format
                normalized[item] = value;
            }
        }
        return normalized;
    }
    
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
    
    // ==========================
    // Character Field Accessors
    // ==========================
    
    // Simple wrappers for component-based field access
    function getCharacterField(character, fieldPath) {
        if (!character || !fieldPath) return null;
        return getNestedField(character, fieldPath);
    }
    
    function setCharacterField(character, fieldPath, value) {
        if (!character || !fieldPath) return false;
        setNestedField(character, fieldPath, value);
        return true;
    }
    
    
    // ==========================
    // Faction Helper Functions
    // ==========================
    function getFactionMembers(factionName) {
        const faction = load('Faction', factionName);
        return faction?.members || [];
    }
    
    function getCharacterFaction(characterName) {
        // Search all factions for this character
        const factions = loadAll('Faction');
        for (const [name, faction] of Object.entries(factions || {})) {
            if (faction.members && faction.members.includes(characterName)) {
                return name;
            }
        }
        return null;
    }
    
    function getFactionRelations(factionName) {
        const faction = load('Faction', factionName);
        if (!faction) return { allies: [], enemies: [] };
        return {
            allies: faction.allied_factions || faction.allies || [],
            enemies: faction.enemy_factions || faction.enemies || []
        };
    }

    
    // ==========================
    // Unified Entity Creation System
    // ==========================
    
    // Initialize entity with default component values
    function initializeEntityComponents(entityType, data = {}) {
        // Initialize schema registry if needed
        if (!schemaRegistry) {
            initializeSchemaRegistry();
        }
        
        const schema = schemaRegistry[entityType];
        if (!schema) return null;
        
        const entity = {
            name: data.name || 'Unknown',
            type: entityType
        };
        
        // Initialize each component
        if (schema.components && schemaRegistry._components) {
            for (const compName of schema.components) {
                const compSchema = schemaRegistry._components[compName];
                if (!compSchema) continue;
                
                // Initialize component with defaults
                entity[compName] = {};
                
                // Apply defaults from component schema
                if (compSchema.defaults) {
                    entity[compName] = JSON.parse(JSON.stringify(compSchema.defaults));
                }
                
                // Apply data for this component if provided
                if (data[compName]) {
                    // Deep merge data into component
                    entity[compName] = mergeDeep(entity[compName], data[compName]);
                }
            }
        }
        
        // Don't apply root-level data that should be in components
        // Only apply special fields like _triggerName
        for (const [key, value] of Object.entries(data)) {
            if (key.startsWith('_') && !entity[key]) {
                entity[key] = value;
            }
        }
        
        return entity;
    }
    
    // Deep merge helper
    function mergeDeep(target, source) {
        if (!source) return target;
        if (!target) return source;
        
        // If target is not an object, just return source
        if (typeof target !== 'object' || Array.isArray(target)) {
            return source;
        }
        
        // If source is not an object, just return it
        if (typeof source !== 'object' || Array.isArray(source)) {
            return source;
        }
        
        const output = Object.assign({}, target);
        
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                if (target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
                    output[key] = mergeDeep(target[key], source[key]);
                } else {
                    output[key] = source[key];
                }
            } else {
                output[key] = source[key];
            }
        }
        
        return output;
    }
    
    /**
     * Create any entity type with initial data
     * @param {string} entityType - Type of entity (Character, Location, Item, Faction, etc.)
     * @param {object} data - Initial data for the entity (can use flat, component, or dot notation)
     * @returns {object|null} The created entity or null if failed
     */
    function create(entityType, data = {}) {
        // Normalize entity type
        entityType = String(entityType).charAt(0).toUpperCase() + String(entityType).slice(1).toLowerCase();
        const singularType = entityType.replace(/s$/, '');
        
        // Initialize entity with components
        const entity = initializeEntityComponents(singularType, data);
        if (!entity) {
            if (debug) console.log(`${MODULE_NAME}: Failed to initialize entity of type ${singularType}`);
            return null;
        }
        
        // Apply entity-specific initialization
        switch (singularType) {
            case 'Character':
                // Ensure info component exists
                if (!entity.info) entity.info = {};
                
                // Set isPlayer flag if provided
                const isPlayer = data.isPlayer || data['info.isPlayer'] || false;
                entity.info.isPlayer = isPlayer;
                
                // Merge info component fields for backward compatibility
                const infoFields = ['full_name', 'gender', 'race', 'class', 'appearance', 'personality', 'background', 'goals'];
                for (const field of infoFields) {
                    // Check both root level (backward compat) and info.field
                    if (data[field] !== undefined) {
                        entity.info[field] = data[field];
                    } else if (data[`info.${field}`] !== undefined) {
                        entity.info[field] = data[`info.${field}`];
                    }
                }
                break;
                
            case 'Location':
                // Location-specific initialization
                if (!entity.info) entity.info = {};
                
                // Handle location type
                if (data.type !== undefined) {
                    entity.info.type = data.type;
                } else if (data['info.type'] !== undefined) {
                    entity.info.type = data['info.type'];
                }
                break;
                
            case 'Item':
                // Item-specific initialization
                if (!entity.info) entity.info = {};
                
                // Handle item type and properties
                const itemFields = ['type', 'rarity', 'damage', 'defense', 'value'];
                for (const field of itemFields) {
                    if (data[field] !== undefined) {
                        entity.info[field] = data[field];
                    } else if (data[`info.${field}`] !== undefined) {
                        entity.info[field] = data[`info.${field}`];
                    }
                }
                break;
                
            case 'Faction':
                // Faction-specific initialization
                if (!entity.info) entity.info = {};
                
                // Handle faction properties
                const factionFields = ['leader', 'type', 'alignment', 'headquarters'];
                for (const field of factionFields) {
                    if (data[field] !== undefined) {
                        entity.info[field] = data[field];
                    } else if (data[`info.${field}`] !== undefined) {
                        entity.info[field] = data[`info.${field}`];
                    }
                }
                break;
        }
        
        // Save the entity using universal system
        if (save(singularType, entity)) {
            // Clear cached version of this entity
            delete entityCache[`${singularType}.${entity.name}`];
            
            if (debug) console.log(`${MODULE_NAME}: Created ${singularType} '${entity.name}' with components`);
            return entity;
        }
        
        if (debug) console.log(`${MODULE_NAME}: Failed to save ${singularType} '${entity.name}'`);
        return null;
    }
    
    function createCharacter(characterData) {
        // Redirect to unified create function
        return create('Character', characterData);
    }
    
    // ==========================
    // Player Command Processing
    // ==========================
    function processPlayerCommand(text) {
        const command = text.toLowerCase().trim();
        
        // Handle /GW abort command
        if (command === '/gw abort' || command === '/gw cancel') {
            if (typeof GenerationWizard !== 'undefined' && GenerationWizard.isActive()) {
                GenerationWizard.cancelGeneration();
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
    
    // Helper to find first [PLAYER] card
    function loadFirstPlayer() {
        const playerCard = Utilities.storyCard.find(
            card => card.title && card.title.startsWith('[PLAYER]')
        );
        
        if (!playerCard) return null;
        
        const nameMatch = playerCard.title.match(/\[PLAYER\]\s+(.+)/);
        if (!nameMatch) return null;
        
        return loadCharacter(nameMatch[1]);
    }
    
    // New flexible getter system with $() syntax
    function processFlexibleGetters(text) {
        if (!text) return text;
        
        let recursionDepth = 0;
        const MAX_RECURSION = 10;
        
        function resolveGetters(str) {
            if (recursionDepth++ > MAX_RECURSION) {
                console.log(`${MODULE_NAME}: Max recursion depth reached in getter resolution`);
                return str;
            }
            
            // First, resolve any $() expressions
            str = str.replace(/\$\(([^)]+)\)/g, (match, expr) => {
                // Resolve the inner expression as a getter
                const resolved = resolveGetters(`get[${expr}]`);
                // Extract just the value (remove get[] wrapper if present)
                return resolved.replace(/^get\[|\]$/g, '');
            });
            
            // Pattern: get[type.key] or get[key] followed by optional .path.to.field
            const FLEX_GETTER = /get\[([^\]]+)\](?:\.([\w\d_.\[\]]+))?/g;
            
            return str.replace(FLEX_GETTER, (match, selector, pathAfterBracket) => {
                // Parse selector (e.g., "character.Bob.level" or "character.Bob")
                const parts = selector.split('.');
                let entity = null;
                let fieldPath = null;
                
                // Determine the type and entity name
                if (parts[0] === 'character' || parts[0] === 'char') {
                    // For character.NAME.FIELD or character.NAME
                    // Try loading with just the name first
                    entity = loadCharacter(parts[1]);
                    // If there are more parts, they're the field path
                    if (parts.length > 2) {
                        fieldPath = parts.slice(2).join('.');
                    }
                } else if (parts[0] === 'location' || parts[0] === 'loc') {
                    // For location.NAME.FIELD or location.NAME
                    // Use universal load function instead of quick cache
                    entity = load('Location', parts[1]);
                    if (parts.length > 2) {
                        fieldPath = parts.slice(2).join('.');
                    }
                } else if (parts[0] === 'faction') {
                    // For faction.NAME.FIELD or faction.NAME
                    // Use universal load function instead of quick cache
                    entity = load('Faction', parts[1]);
                    if (parts.length > 2) {
                        fieldPath = parts.slice(2).join('.');
                    }
                } else if (parts[0] === 'player') {
                    // Special case: player.FIELD or just player
                    entity = loadFirstPlayer();
                    if (parts.length > 1) {
                        fieldPath = parts.slice(1).join('.');
                    }
                } else if (parts[0] === 'global' || parts[0] === 'var') {
                    // Access global variables: runtime.VAR_NAME or runtime.VAR_NAME.FIELD
                    const varName = parts[1];
                    entity = getGlobalValue(varName);
                    if (parts.length > 2) {
                        fieldPath = parts.slice(2).join('.');
                    }
                } else {
                    // Auto-detect type by trying each loader
                    const name = parts[0];
                    entity = loadCharacter(name);
                    
                    if (!entity) {
                        // Try loading as location
                        entity = load('Location', name);
                    }
                    
                    if (!entity) {
                        // Try loading as faction
                        entity = load('Faction', name);
                    }
                    
                    // If there are more parts, they're the field path
                    if (parts.length > 1) {
                        fieldPath = parts.slice(1).join('.');
                    }
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
    
    function processGetters(text) {
        if (!text) return text;
        
        // First try the new flexible getter system
        text = processFlexibleGetters(text);
        
        // Then handle legacy function-style getters for Calendar API only
        return text.replace(FUNCTION_GETTER_PATTERN, function(match) {
            // Parse the function getter: get_something(parameters)
            const innerMatch = match.match(/get_([a-z_]+)\s*\(([^)]*)\)/i);
            if (!innerMatch) return match;
            
            const getterType = innerMatch[1];
            const paramString = innerMatch[2];
            const params = parseParameters(paramString);
            
            // Process different getter types
            switch(getterType) {
                // Character getters - redirect to flexible getter system
                case 'location':
                case 'hp':
                case 'level':
                case 'xp':
                case 'name':
                case 'attribute':
                case 'skill':
                case 'inventory':
                case 'stat':
                    // These should use get[character.NAME.field] syntax instead
                    // But keep for backward compatibility
                    let charName = params[0];
                    if (!charName) return match;
                    
                    // Special case: resolve "player" to actual player name
                    if (charName.toLowerCase() === 'player') {
                        // Find the first [PLAYER] card
                        const playerCard = Utilities.storyCard.find(card => {
                            return card.title && card.title.startsWith('[PLAYER]');
                        }, false);
                        
                        if (playerCard) {
                            const titleMatch = playerCard.title.match(/\[PLAYER\]\s+(.+)/);
                            if (titleMatch) {
                                charName = titleMatch[1].trim();
                            }
                        }
                    }
                    
                    // Convert to new syntax and process
                    let newGetter;
                    if (getterType === 'attribute' || getterType === 'skill') {
                        newGetter = `get[character.${charName}.${getterType}s.${params[1]}]`;
                    } else if (getterType === 'stat') {
                        newGetter = `get[character.${charName}.stats.${params[1]}]`;
                    } else {
                        // Map to component paths
                        const fieldMap = {
                            'location': 'info.location',
                            'hp': 'stats.hp',
                            'level': 'stats.level', 
                            'xp': 'stats.xp',
                            'name': 'name',
                            'inventory': 'inventory'
                        };
                        newGetter = `get[character.${charName}.${fieldMap[getterType]}]`;
                    }
                    return processFlexibleGetters(newGetter);
                    
                // Time getters (Calendar API) - keep these as they interface with Calendar module
                case 'time':
                case 'currenttime':
                    return getCurrentTime() || '00:00';
                    
                case 'formattedtime':
                    return getFormattedTime() || '12:00 AM';
                    
                case 'timeofday':
                    return getTimeOfDay() || 'Unknown';
                    
                case 'date':
                case 'currentdate':
                    return getCurrentDate() || 'Unknown Date';
                    
                case 'formatteddate':
                    return getFormattedDate() || 'Unknown';
                    
                case 'daynumber':
                    return getDayNumber() || '0';
                    
                case 'season':
                    return getSeason() || 'Unknown';
                    
                default:
                    // For any unknown getter, try to resolve it as a runtime variable
                    // This allows custom getters defined in [SANE_RUNTIME] Variables
                    const value = getGlobalValue(getterType);
                    if (value !== null) {
                        return typeof value === 'object' ? JSON.stringify(value) : String(value);
                    }
                    
                    if (debug) console.log(`${MODULE_NAME}: Unknown getter type: ${getterType}`);
                    return match;
            }
        });
    }
    
    // Character getter functions
    // Helper function to get a character from cache efficiently
    function getCharacterLocation(name) {
        const character = load('Character', name);
        return character?.info?.location || null;
    }
    
    function getCharacterHP(name) {
        const character = load('Character', name);
        if (!character) return null;
        const hp = character.stats?.hp;
        return hp ? `${hp.current}/${hp.max}` : null;
    }
    
    function getCharacterLevel(name) {
        const character = load('Character', name);
        if (!character) return null;
        const level = character.stats?.level?.value;
        return level ? level.toString() : null;
    }
    
    function getCharacterXP(name) {
        const character = load('Character', name);
        if (!character) return null;
        const xp = character.stats?.level?.xp;
        return xp ? `${xp.current}/${xp.max}` : null;
    }
    
    function getCharacterName(name) {
        const character = load('Character', name);
        return character ? character.name : null;
    }
    
    function getCharacterAttribute(characterName, attrName) {
        if (!attrName) return null;
        
        const character = load('Character', characterName);
        if (!character) return null;
        
        const attrKey = String(attrName).toLowerCase();
        const attributes = character.attributes || {};
        const value = attributes[attrKey];
        if (typeof value === 'object' && value.value !== undefined) {
            return value.value.toString();
        }
        return value ? value.toString() : null;
    }
    
    function getCharacterSkill(characterName, skillName) {
        if (!skillName) return null;
        
        const character = load('Character', characterName);
        if (!character) return null;
        
        const skillKey = String(skillName).toLowerCase();
        const skills = character.skills || {};
        const skill = skills[skillKey];
        if (!skill) return null;
        if (typeof skill === 'object' && skill.level !== undefined) {
            return skill.xp ? `Level ${skill.level} (${skill.xp.current}/${skill.xp.max} XP)` : `Level ${skill.level}`;
        }
        return skill.toString();
    }
    
    function getCharacterInventory(name) {
        const character = load('Character', name);
        if (!character) return null;
        
        const items = Object.entries(character.inventory || {})
            .filter(([item, qty]) => qty !== 0)
            .map(([item, qty]) => `${item}:${qty}`);
        
        return items.length > 0 ? `{${items.join(', ')}}` : '{}';
    }
    
    function getCharacterStat(characterName, statName) {
        if (!statName) return null;
        
        const character = load('Character', characterName);
        if (!character) return null;
        
        const statKey = String(statName).toLowerCase();
        
        // Check if it's HP (special case)
        if (statKey === 'hp') {
            const hp = character.stats?.hp;
            return hp ? `${hp.current}/${hp.max}` : null;
        }
        
        // Check other core stats
        const stat = character.coreStats[statKey];
        return stat ? `${stat.current}/${stat.max}` : null;
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
        // Find the first [PLAYER] card to use as default
        const playerCard = Utilities.storyCard.find(
            card => card.title && card.title.startsWith('[PLAYER]'),
            false // Just get the first one
        );
        
        // Extract player name from card title or default to 'player'
        let playerName = 'player';
        if (playerCard) {
            const titleMatch = playerCard.title.match(/\[PLAYER\]\s+(.+)/);
            if (titleMatch) {
                playerName = titleMatch[1].trim().toLowerCase();
            }
        }
        
        const defaultText = (
            `[**Current Scene** Location: get_location(${playerName}) | get_formattedtime() (get_timeofday())\n` +
            `**Available Tools:**\n` +
            `• Location: update_location(name, place) discover_location(character, place, direction) connect_locations(placeA, placeB, direction)\n` +
            `  - Directions: north, south, east, west, inside (enter), outside (exit)\n` +
            `• Time: advance_time(hours, minutes)\n` +
            `• Inventory: add_item(name, item, qty) remove_item(name, item, qty) transfer_item(giver, receiver, item, qty)\n` +
            `• Relations: update_relationship(name1, name2, points)\n` +
            `• Quests: offer_quest(npc, quest, type) update_quest(player, quest, stage) complete_quest(player, quest)\n` +
            `• Progression: add_levelxp(name, amount) add_skillxp(name, skill, amount) unlock_newskill(name, skill)\n` +
            `• Stats: update_attribute(name, attribute, value) update_hp(name, current, max)\n` +
            `• Combat: deal_damage(source, target, amount)]`
        );
        
        Utilities.storyCard.add({
            title: '[CURRENT SCENE]',
            type: 'data',
            entry: defaultText,
            description: 'Edit this card to customize what appears in the scene block. Use get_*(params) for dynamic values.',
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
            return contextText;
        }
        
        // Find where the scene starts in context (look for the pattern)
        const sceneStartPattern = /\[\*\*Current Scene\*\*/;
        const startMatch = contextText.match(sceneStartPattern);
        
        if (!startMatch) {
            // Scene not found in context
            return contextText;
        }
        
        const startIdx = startMatch.index;
        
        // Find the end by looking for the closing bracket and newlines
        // The scene ends with ")] followed by newlines
        let endIdx = contextText.indexOf(')]', startIdx);
        if (endIdx === -1) {
            // Fallback: just remove from start to next double newline
            endIdx = contextText.indexOf('\n\n', startIdx);
            if (endIdx === -1) {
                endIdx = contextText.length;
            }
        } else {
            endIdx += 2; // Include the )]
            // Skip any trailing whitespace/newlines
            while (endIdx < contextText.length && /\s/.test(contextText[endIdx])) {
                endIdx++;
            }
        }
        
        // Remove the scene from context
        let modifiedContext = contextText.substring(0, startIdx) + contextText.substring(endIdx);
        
        // Clean up any resulting double/triple newlines
        modifiedContext = modifiedContext.replace(/\n\n\n+/g, '\n\n');
        
        // If no history or very early in adventure, just return without the scene
        if (!history || history.length < 3) {
            return modifiedContext;
        }
        
        // Now find where to reinsert it (after first sentence of entry at -3)
        const targetIndex = history.length - 3;
        const historyEntry = history[targetIndex];
        
        if (!historyEntry || !historyEntry.text) {
            // If we can't find the target, put it back at the start
            return sceneContent + '\n\n' + modifiedContext;
        }
        
        const lastEntry = historyEntry.text;
        
        // Find where this history entry appears in the modified context
        const entryIndex = modifiedContext.indexOf(lastEntry);
        if (entryIndex === -1) {
            // If we can't find the entry, put scene at the start
            return sceneContent + '\n\n' + modifiedContext;
        }
        
        // Find end of first sentence within that entry
        const firstSentenceMatch = lastEntry.match(/^[^.!?]+[.!?]/);
        if (!firstSentenceMatch) {
            // No sentence found, put scene at start
            return sceneContent + '\n\n' + modifiedContext;
        }
        
        const firstSentence = firstSentenceMatch[0];
        const insertPosition = entryIndex + firstSentence.length;
        
        // Build the new context with scene at new position
        const beforeInsert = modifiedContext.substring(0, insertPosition);
        const afterInsert = modifiedContext.substring(insertPosition);
        
        // Ensure proper spacing (entries should be separated by double \n)
        let separator = '\n\n';
        if (afterInsert.startsWith('\n')) {
            // Already has at least one newline
            separator = afterInsert.startsWith('\n\n') ? '' : '\n';
        }
        
        return beforeInsert + separator + sceneContent + '\n\n' + afterInsert.trimStart();
    }
    
    // ==========================
    // Character Name Validation
    // ==========================
    const INVALID_CHARACTER_NAMES = [
        // Generic references
        'player', 'self', 'me', 'you', 'user', 'myself', 'yourself', 
        'him', 'her', 'them', 'they', 'it', 'this', 'that',
    ];
    
    function isValidCharacterName(name) {
        if (!name || typeof name !== 'string') return false;
        
        // Convert to lowercase for checking
        const normalized = name.toLowerCase().trim();
        
        // Check if empty or just whitespace
        if (!normalized) return false;
        
        // Check against blacklist of generic terms (but allow compound names like "player_unknown")
        if (INVALID_CHARACTER_NAMES.includes(normalized)) {
            if (debug) console.log(`${MODULE_NAME}: Invalid character name detected: "${name}" (blacklisted)`);
            return false;
        }
        
        // Valid syntax - doesn't need to exist yet (allows hallucinated names)
        return true;
    }
    
    // ========================================
    // Universal Data System
    // ========================================
    
    // Entity card mapping - maps entity names AND aliases directly to card titles
    // Both real names and aliases point to the same card title for single-lookup efficiency
    let entityCardMap = null;
    
    function buildEntityCardMap() {
        const map = {};
        
        // Initialize schema registry if needed
        if (!schemaRegistry) schemaRegistry = initializeSchemaRegistry();
        
        // Build map for each entity type
        for (const [entityType, schema] of Object.entries(schemaRegistry)) {
            if (!schema.prefixes || schema.prefixes.length === 0) continue;
            
            map[entityType] = {};
            
            // Check ALL prefixes for this entity type
            for (const prefix of schema.prefixes) {
                const cards = Utilities.storyCard.find(
                    c => c.title && c.title.startsWith(`[${prefix}] `),
                    true // return all matches
                );
                
                for (const card of cards) {
                    // Parse DESCRIPTION to get actual entity ID
                    if (card.description && card.description.includes('<== REAL DATA ==>')) {
                        const data = parseEntityData(card.description);
                        if (data.name) {
                            // Map the entity ID to the card title
                            const normalizedName = data.name.toLowerCase();
                            map[entityType][normalizedName] = card.title;
                            
                            // Also map any aliases directly to the card title
                            if (data.aliases) {
                                const aliases = Array.isArray(data.aliases) ? data.aliases : 
                                               typeof data.aliases === 'string' ? data.aliases.split(',').map(a => a.trim()) :
                                               [];
                                
                                for (const alias of aliases) {
                                    if (alias) {
                                        const normalizedAlias = alias.toLowerCase();
                                        // Map alias directly to card title (not to real name)
                                        map[entityType][normalizedAlias] = card.title;
                                        
                                        if (debug) console.log(`${MODULE_NAME}: Mapped alias '${alias}' directly to card '${card.title}' for ${entityType}`);
                                    }
                                }
                            }
                        } else {
                            console.log(`${MODULE_NAME}: WARNING - Card ${card.title} has no name in data, using fallback`);
                            
                            // Fallback: try to use title without prefix
                            let fallbackId = card.title.replace(/^\[.*?\]\s*/, '').trim().toLowerCase();
                            
                            // If that ID is taken, generate random suffixes until unique
                            let attempts = 0;
                            while (map[entityType][fallbackId] && attempts < 100) {
                                const randomSuffix = Math.random().toString(36).substring(2, 8);
                                fallbackId = `${fallbackId}_${randomSuffix}`;
                                attempts++;
                            }
                            
                            if (attempts >= 100) {
                                console.log(`${MODULE_NAME}: ERROR - Could not generate unique ID for ${card.title}`);
                                continue;
                            }
                            
                            map[entityType][fallbackId] = card.title;
                            console.log(`${MODULE_NAME}: Mapped ${card.title} to fallback ID: ${fallbackId}`);
                        }
                    } else {
                        // Card doesn't have structured data yet - skip it
                        if (debug) console.log(`${MODULE_NAME}: Card ${card.title} has no structured data`);
                    }
                }
            }
        }
        
        entityCardMap = map;
        return map;
    }
    
    function getEntityCardTitle(entityType, entityId) {
        // Build map if not exists
        if (!entityCardMap) buildEntityCardMap();
        
        const normalizedId = entityId.toLowerCase();
        const typeMap = entityCardMap[entityType];
        if (!typeMap) return null;
        
        // Direct lookup - both real names and aliases are in the same map
        return typeMap[normalizedId] || null;
    }
    
    // Unified load function for ANY object type
    function load(objectType, name) {
        if (!objectType || !name) return null;
        
        // Normalize the entity type (Character, Location, etc.)
        const entityType = String(objectType).charAt(0).toUpperCase() + String(objectType).slice(1).toLowerCase();
        const singularType = entityType.replace(/s$/, '');
        
        // Build cache key: "Character.Bob"
        const cacheKey = `${singularType}.${name}`;
        
        // Check entity cache
        if (entityCache[cacheKey]) {
            return entityCache[cacheKey];
        }
        
        // Check if this is a data-only entity type
        if (!schemaRegistry) schemaRegistry = initializeSchemaRegistry();
        const schema = schemaRegistry[singularType];
        if (schema && schema.dataOnly) {
            // Load from [SANE_DATA] card
            const dataCard = Utilities.storyCard.get(`[SANE_DATA] ${singularType}`);
            if (dataCard) {
                try {
                    const allData = JSON.parse(dataCard.description || '{}');
                    const entity = allData[name];
                    if (entity) {
                        entityCache[cacheKey] = entity;
                        return entity;
                    }
                } catch (e) {
                    if (debug) console.log(`${MODULE_NAME}: Failed to parse data-only entity ${singularType}.${name}`);
                }
            }
            return null;
        }
        
        // Get card title from mapping for display entities
        const cardTitle = getEntityCardTitle(singularType, name);
        if (!cardTitle) {
            // Entity not found in mapping
            return null;
        }
        
        // Load the specific card
        const displayCard = Utilities.storyCard.get(cardTitle);
        if (!displayCard) {
            // Card disappeared? Rebuild map
            entityCardMap = null;
            return null;
        }
        
        // Parse structured data from DESCRIPTION field
        let entity = null;
        
        if (displayCard.description && displayCard.description.includes('<== REAL DATA ==>')) {
            entity = parseEntityData(displayCard.description);
        } else {
            // No structured data - this shouldn't happen in new system
            if (debug) console.log(`${MODULE_NAME}: Card missing structured data for ${name}`);
            return null;
        }
        
        // Set metadata
        entity._type = singularType;
        entity._cardTitle = cardTitle; // Store for updates
        
        // For Characters, set subtype based on card prefix
        if (singularType === 'Character') {
            if (!entity.info) entity.info = {};
            entity.info.isPlayer = cardTitle.startsWith('[PLAYER]');
            // Set subtype for special prefixes
            if (cardTitle.startsWith('[PLAYER]')) {
                entity._subtype = 'Player';
            }
        }
        
        // Data comes from JSON.parse() so already in object format
        // No text parsing needed
        
        // Store in cache
        entityCache[cacheKey] = entity;
        return entity;
    }
    
    // Unified save function for ANY object type
    function save(objectType, entity) {
        if (!objectType || !entity) {
            console.log(`${MODULE_NAME}: ERROR - save() called with invalid parameters`);
            return false;
        }
        
        if (!entity.name) {
            console.log(`${MODULE_NAME}: ERROR - Cannot save entity without name field!`);
            console.log('Entity:', JSON.stringify(entity));
            return false;
        }
        
        // Ensure name is a string and not empty
        entity.name = String(entity.name).trim();
        if (!entity.name) {
            console.log(`${MODULE_NAME}: ERROR - Entity name cannot be empty!`);
            return false;
        }
        
        // Normalize entity type
        const entityType = String(objectType).charAt(0).toUpperCase() + String(objectType).slice(1).toLowerCase();
        const singularType = entityType.replace(/s$/, '');
        
        // Check if this is a data-only entity type
        if (!schemaRegistry) schemaRegistry = initializeSchemaRegistry();
        const schema = schemaRegistry[singularType];
        if (schema && schema.dataOnly) {
            // Save to [SANE_DATA] card
            const dataCardTitle = `[SANE_DATA] ${singularType}`;
            let dataCard = Utilities.storyCard.get(dataCardTitle);
            let allData = {};
            
            if (dataCard) {
                try {
                    allData = JSON.parse(dataCard.description || '{}');
                } catch (e) {
                    if (debug) console.log(`${MODULE_NAME}: Failed to parse existing data card ${dataCardTitle}`);
                }
            }
            
            // Update or add the entity
            allData[entity.name] = entity;
            
            // Save back to card
            if (dataCard) {
                Utilities.storyCard.update(dataCardTitle, {
                    description: JSON.stringify(allData, null, 2)
                });
            } else {
                Utilities.storyCard.add({
                    title: dataCardTitle,
                    description: JSON.stringify(allData, null, 2),
                    type: 'data'
                });
            }
            
            // Update cache
            const cacheKey = `${singularType}.${entity.name}`;
            entityCache[cacheKey] = entity;
            
            return true;
        }
        
        // Continue with display entity saving (CHARACTER, LOCATION, etc.)
        
        // Validation removed - components are flexible now
        // const validation = validateEntityComponents(singularType, entity);
        // if (!validation.valid) {
        //     if (debug) {
        //         console.log(`${MODULE_NAME}: Entity validation failed for ${entity.name}:`);
        //         validation.errors.forEach(err => console.log(`  - ${err}`));
        //     }
        //     // Still save but log validation errors
        // }
        
        // Build cache key
        const cacheKey = `${singularType}.${entity.name}`;
        
        // Update cache
        entityCache[cacheKey] = entity;
        
        // Save to display card (the ONLY source of truth)
        return saveEntityCard(entity, singularType);
    }
    
    // Unified loadAll function for ANY object type
    function loadAll(objectType) {
        // Normalize the entity type
        const entityType = String(objectType).charAt(0).toUpperCase() + String(objectType).slice(1).toLowerCase();
        const singularType = entityType.replace(/s$/, '');
        
        // Check if this is a data-only entity type
        if (!schemaRegistry) schemaRegistry = initializeSchemaRegistry();
        const schema = schemaRegistry[singularType];
        if (schema && schema.dataOnly) {
            // Load from [SANE_DATA] card
            const dataCard = Utilities.storyCard.get(`[SANE_DATA] ${singularType}`);
            if (dataCard) {
                try {
                    const allData = JSON.parse(dataCard.description || '{}');
                    // Cache all entities
                    for (const [name, entity] of Object.entries(allData)) {
                        const cacheKey = `${singularType}.${name}`;
                        entityCache[cacheKey] = entity;
                    }
                    return allData;
                } catch (e) {
                    if (debug) console.log(`${MODULE_NAME}: Failed to parse data-only entities for ${singularType}`);
                }
            }
            return {};
        }
        
        // Build map if not exists for display entities
        if (!entityCardMap) buildEntityCardMap();
        
        // Get all entities of this type from the map
        const typeMap = entityCardMap[singularType];
        if (!typeMap) {
            if (debug) console.log(`${MODULE_NAME}: No entities found for type ${singularType}`);
            return {};
        }
        
        // Load all entities
        const entities = {};
        
        for (const [entityId, cardTitle] of Object.entries(typeMap)) {
            // Load each entity using the mapping
            const entity = load(singularType, entityId);
            if (entity) {
                entities[entityId] = entity;
            }
        }
        
        return entities;
    }
    
    function loadCharacter(name) {
        // Delegate to unified load function
        return load('Character', name);
    }
    
    // Queue entity for generation wizard
    function queueEntityGeneration(entity) {
        // This would interface with GenerationWizard
        // For now, just log that it needs generation
        if (debug) console.log(`${MODULE_NAME}: Queued ${entity.name} for display card generation`);
        
        // Could add to [SANE_CONFIG] Entity Queue card
        const queueCard = Utilities.storyCard.get('[SANE_CONFIG] Entity Queue');
        if (queueCard) {
            const lines = (queueCard.description || '').split('\n').filter(l => l.trim());
            lines.push(`${entity.type}:${entity.name}`);
            Utilities.storyCard.update('[SANE_CONFIG] Entity Queue', {
                description: lines.join('\n')
            });
        }
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
            console.log(character.name + ' reached level ' + character.stats.level.value + '!');
            
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
            
            // TODO: Process attribute gains if configured
            
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
    const toolProcessors = {
        advance_time: function(hours, minutes) {
            hours = parseInt(hours) || 0;
            minutes = parseInt(minutes) || 0;
            
            // Both being 0 is malformed
            if (hours === 0 && minutes === 0) {
                if (debug) console.log(`${MODULE_NAME}: Invalid advance_time (0h 0m) - removing`);
                return 'malformed';
            }
            
            if (debug) console.log(`${MODULE_NAME}: Advancing time by ${hours}h ${minutes}m`);
            
            if (typeof Calendar !== 'undefined' && Calendar.advanceTime) {
                let timeStr = '';
                if (hours > 0) timeStr += hours + 'h';
                if (minutes > 0) timeStr += (timeStr ? ', ' : '') + minutes + 'm';
                
                const result = Calendar.advanceTime(timeStr);
                return result ? 'executed' : 'malformed';
            }
            return 'executed';
        },
        
        update_location: function(characterName, location) {
            if (!characterName || !location) return 'malformed';
            
            // Validate character name before processing
            if (!isValidCharacterName(characterName)) {
                return 'malformed';
            }
            
            characterName = String(characterName).toLowerCase();
            location = String(location).toLowerCase().replace(/\s+/g, '_');
            
            // Check if character exists using universal system
            const character = loadCharacter(characterName);
            if (character) {
                // Character exists, update location using component structure
                if (!character.info) {
                    if (debug) console.log(`${MODULE_NAME}: Character ${character.name} missing info component`);
                    return 'malformed';
                }
                character.info.location = location;
                save('Character', character);
                if (debug) console.log(`${MODULE_NAME}: ${character.name} moved to ${location}`);
                return 'executed';
            }
            
            // Character not found - do a full check
            const fullCheckCharacter = loadCharacter(characterName);
            
            if (!fullCheckCharacter) {
                // Character doesn't exist
                trackUnknownEntity(characterName, 'update_location', info?.actionCount);
                if (shouldTriggerGeneration(characterName)) {
                    addToEntityQueue(characterName);
                }
                if (debug) {
                    console.log(`${MODULE_NAME}: Unknown character ${characterName} referenced in update_location`);
                }
            } else {
                // Found character - update location
                if (fullCheckCharacter.info) {
                    fullCheckCharacter.info.location = location;
                } else {
                    fullCheckCharacter.location = location;
                }
                save('Character', fullCheckCharacter);
                if (debug) console.log(`${MODULE_NAME}: ${fullCheckCharacter.name} moved to ${location}`);
            }
            
            return 'executed';
        },
        
        add_item: function(characterName, itemName, quantity) {
            if (!characterName || !itemName) return 'malformed';
            
            // Validate character name before processing
            if (!isValidCharacterName(characterName)) {
                return 'malformed';
            }
            
            characterName = String(characterName).toLowerCase();
            itemName = String(itemName).toLowerCase().replace(/\s+/g, '_');
            
            // Strict number validation
            const qtyStr = String(quantity).trim();
            if (!/^-?\d+$/.test(qtyStr)) {
                if (debug) console.log(`${MODULE_NAME}: Invalid quantity format for add_item: ${quantity}`);
                return 'malformed';
            }
            quantity = parseInt(qtyStr);
            
            // 0 or invalid quantity is malformed
            if (isNaN(quantity) || quantity === 0) {
                if (debug) console.log(`${MODULE_NAME}: Invalid quantity for add_item: ${quantity}`);
                return 'malformed';
            }
            
            // Selectively load only the character needed
            const character = loadCharacter(characterName);
            
            if (!character) {
                if (debug) {
                    console.log(`${MODULE_NAME}: Character ${characterName} not found`);
                }
                return 'executed'; // Still executed, just no character
            }
            
            // Access inventory through component or fallback to direct access
            if (!character.inventory) character.inventory = {};
            const inventory = character.inventory;
            
            // Always convert to object format
            let currentQty = 0;
            if (typeof inventory[itemName] === 'object') {
                currentQty = inventory[itemName].quantity || 0;
            } else if (typeof inventory[itemName] === 'number') {
                currentQty = inventory[itemName];
            }
            
            const newQty = Math.max(0, currentQty + quantity);
            
            // Always store as object with quantity
            inventory[itemName] = { quantity: newQty };
            
            if (debug) {
                console.log(`${MODULE_NAME}: ${character.name}'s ${itemName}: ${currentQty} → ${newQty}`);
            }
            
            save('Character', character);
            return 'executed';
        },
        
        remove_item: function(characterName, itemName, quantity) {
            if (!characterName || !itemName) return 'malformed';
            
            // Validate character name before processing
            if (!isValidCharacterName(characterName)) {
                return 'malformed';
            }
            
            characterName = String(characterName).toLowerCase();
            itemName = String(itemName).toLowerCase().replace(/\s+/g, '_');
            
            // Strict number validation
            const qtyStr = String(quantity).trim();
            if (!/^\d+$/.test(qtyStr)) {
                if (debug) console.log(`${MODULE_NAME}: Invalid quantity format for remove_item: ${quantity}`);
                return 'malformed';
            }
            quantity = parseInt(qtyStr);
            
            // 0 or invalid quantity is malformed
            if (isNaN(quantity) || quantity <= 0) {
                if (debug) console.log(`${MODULE_NAME}: Invalid quantity for remove_item: ${quantity}`);
                return 'malformed';
            }
            
            // Selectively load only the character needed
            const character = loadCharacter(characterName);
            
            if (!character) return 'executed';
            
            // Access inventory through component or fallback to direct access
            const inventory = character.inventory || {};
            
            // Always convert to object format for reading
            let currentQty = 0;
            if (typeof inventory[itemName] === 'object') {
                currentQty = inventory[itemName].quantity || 0;
            } else if (typeof inventory[itemName] === 'number') {
                currentQty = inventory[itemName];
            }
            
            const removeQty = Math.min(currentQty, quantity);
            const newQty = currentQty - removeQty;
            
            if (newQty === 0) {
                delete inventory[itemName];
                if (debug) console.log(`${MODULE_NAME}: Removed all ${itemName} from ${character.name}`);
            } else {
                // Always store as object with quantity
                inventory[itemName] = { quantity: newQty };
                if (debug) console.log(`${MODULE_NAME}: Removed ${removeQty} ${itemName} from ${character.name} (${currentQty} → ${newQty})`);
            }
            
            // Ensure inventory is set back on character
            character.inventory = inventory;
            
            save('Character', character);
            return 'executed';
        },
        
        use_consumable: function(characterName, itemName, quantity) {
            // Identical validation to remove_item
            return toolProcessors.remove_item(characterName, itemName, quantity);
        },
        
        transfer_item: function(giverName, receiverName, itemName, quantity) {
            if (!giverName || !receiverName || !itemName) return 'malformed';
            
            // Validate both character names before processing
            if (!isValidCharacterName(giverName) || !isValidCharacterName(receiverName)) {
                return 'malformed';
            }
            
            giverName = String(giverName).toLowerCase();
            receiverName = String(receiverName).toLowerCase();
            itemName = String(itemName).toLowerCase().replace(/\s+/g, '_');
            
            // Strict number validation
            const qtyStr = String(quantity).trim();
            if (!/^\d+$/.test(qtyStr)) {
                if (debug) console.log(`${MODULE_NAME}: Invalid quantity format for transfer_item: ${quantity}`);
                return 'malformed';
            }
            const requestedQty = parseInt(qtyStr);
            
            // 0 or invalid quantity is malformed
            if (isNaN(requestedQty) || requestedQty <= 0) {
                if (debug) console.log(`${MODULE_NAME}: Invalid quantity for transfer_item: ${quantity}`);
                return 'malformed';
            }
            
            const characters = loadAll('Character');
            const giver = characters[giverName];
            const receiver = characters[receiverName];
            
            // Track unknown entities
            if (!giver) {
                trackUnknownEntity(giverName, 'transfer_item', info?.actionCount);
                if (shouldTriggerGeneration(giverName)) {
                    addToEntityQueue(giverName);
                }
            }
            if (!receiver) {
                trackUnknownEntity(receiverName, 'transfer_item', info?.actionCount);
                if (shouldTriggerGeneration(receiverName)) {
                    addToEntityQueue(receiverName);
                }
            }
            
            let anySuccess = false;
            let transferQty = requestedQty;
            
            if (giver) {
                // Normalize inventory to new format if needed
                giver.inventory = normalizeInventory(giver.inventory);
                
                const availableQty = getItemQuantity(giver.inventory, itemName);
                transferQty = Math.min(availableQty, requestedQty);
                
                if (transferQty > 0) {
                    setItemQuantity(giver.inventory, itemName, availableQty - transferQty);
                    
                    save('Character', giver);
                    anySuccess = true;
                    
                    if (debug) console.log(`${MODULE_NAME}: Removed ${transferQty} ${itemName} from ${giver.name}`);
                } else {
                    if (debug) console.log(`${MODULE_NAME}: ${giver.name} has no ${itemName} to transfer`);
                    return 'executed'; // Valid attempt, just no items
                }
            }
            
            if (receiver) {
                // Normalize inventory to new format if needed
                receiver.inventory = normalizeInventory(receiver.inventory);
                
                const currentReceiverQty = getItemQuantity(receiver.inventory, itemName);
                setItemQuantity(receiver.inventory, itemName, currentReceiverQty + transferQty);
                
                save('Character', receiver);
                anySuccess = true;
                
                if (debug) console.log(`${MODULE_NAME}: Added ${transferQty} ${itemName} to ${receiver.name}`);
            }
            
            return anySuccess ? 'executed' : 'executed';
        },
        
        deal_damage: function(sourceName, targetName, damageAmount) {
            if (!targetName) return 'malformed';
            
            // Validate target name syntax (but allow non-existent/hallucinated names)
            if (!isValidCharacterName(targetName)) {
                return 'malformed';
            }
            
            sourceName = sourceName ? String(sourceName).toLowerCase() : 'unknown';
            targetName = String(targetName).toLowerCase();
            
            // Strict number validation - must be a clean integer
            const damageStr = String(damageAmount).trim();
            if (!/^\d+$/.test(damageStr)) {
                if (debug) console.log(`${MODULE_NAME}: Invalid damage amount format: ${damageAmount}`);
                return 'malformed';
            }
            damageAmount = parseInt(damageStr);
            
            // 0 or negative damage is malformed
            if (isNaN(damageAmount) || damageAmount <= 0) {
                if (debug) console.log(`${MODULE_NAME}: Invalid damage amount: ${damageAmount}`);
                return 'malformed';
            }
            
            // Load the target character directly
            const target = loadCharacter(targetName);
            if (!target) {
                if (debug) {
                    console.log(`${MODULE_NAME}: Target ${targetName} not found`);
                }
                return 'executed';
            }
            
            // Only load source if needed and exists
            const source = (sourceName !== 'unknown') 
                ? loadCharacter(sourceName) : null;
            
            const sourceDisplay = source ? source.name : sourceName;
            
            // Support both old (hp) and new (stats.hp) structures
            let currentHP, maxHP;
            if (target.stats && target.stats.hp) {
                currentHP = target.stats.hp.current;
                maxHP = target.stats.hp.max;
            } else if (target.hp) {
                // Migrate from old structure
                currentHP = target.hp.current;
                maxHP = target.hp.max;
                // Initialize new structure
                if (!target.stats) target.stats = {};
                target.stats.hp = { current: currentHP, max: maxHP };
            } else {
                // Initialize if missing
                if (!target.stats) target.stats = {};
                target.stats.hp = { current: 100, max: 100 };
                currentHP = 100;
                maxHP = 100;
            }
            
            const oldHP = currentHP;
            const newHP = Math.max(0, currentHP - damageAmount);
            const actualDamage = oldHP - newHP;
            
            // Update in new structure
            target.stats.hp.current = newHP;
            
            // Also update old structure for backward compatibility
            if (target.hp) {
                target.hp.current = newHP;
            }
            
            if (debug) {
                console.log(`${MODULE_NAME}: ${sourceDisplay} dealt ${actualDamage} damage to ${target.name} (${oldHP} → ${newHP}/${maxHP})`);
            }
            
            save('Character', target);
            return 'executed';
        },
        
        add_levelxp: function(characterName, xpAmount) {
            if (!characterName) return 'malformed';
            
            // Validate character name before processing
            if (!isValidCharacterName(characterName)) {
                return 'malformed';
            }
            
            characterName = String(characterName).toLowerCase();
            
            // Allow negative numbers for XP removal
            const xpStr = String(xpAmount).trim();
            if (!/^-?\d+$/.test(xpStr)) {
                if (debug) console.log(`${MODULE_NAME}: Invalid XP format for add_levelxp: ${xpAmount}`);
                return 'malformed';
            }
            xpAmount = parseInt(xpStr);
            
            // 0 is malformed (use positive/negative for actual changes)
            if (isNaN(xpAmount) || xpAmount === 0) {
                if (debug) console.log(`${MODULE_NAME}: Invalid XP amount: ${xpAmount}`);
                return 'malformed';
            }
            
            // Selectively load only the character needed
            const character = loadCharacter(characterName);
            
            if (!character) {
                trackUnknownEntity(characterName, 'add_levelxp', info?.actionCount);
                if (shouldTriggerGeneration(characterName)) {
                    addToEntityQueue(characterName);
                }
                return 'executed';
            }
            
            // Update XP using nested level.xp structure
            if (!character.stats || !character.stats.level || !character.stats.level.xp) {
                if (debug) console.log(`${MODULE_NAME}: Character ${character.name} missing stats.level.xp component`);
                return 'malformed';
            }
            character.stats.level.xp.current += xpAmount;
            
            // Ensure XP doesn't go below 0
            if (character.stats.level.xp.current < 0) {
                character.stats.level.xp.current = 0;
            }
            
            const action = xpAmount > 0 ? 'Added' : 'Removed';
            if (debug) console.log(`${MODULE_NAME}: ${action} ${Math.abs(xpAmount)} XP ${xpAmount > 0 ? 'to' : 'from'} ${character.name} (${character.stats.level.xp.current}/${character.stats.level.xp.max})`);
            
            processLevelUp(character);
            save('Character', character);
            return 'executed';
        },
        
        add_skillxp: function(characterName, skillName, xpAmount) {
            if (!characterName || !skillName) return 'malformed';
            
            // Validate character name before processing
            if (!isValidCharacterName(characterName)) {
                return 'malformed';
            }
            
            characterName = String(characterName).toLowerCase();
            skillName = String(skillName).toLowerCase().replace(/\s+/g, '_');
            
            // Strict number validation
            const xpStr = String(xpAmount).trim();
            if (!/^\d+$/.test(xpStr)) {
                if (debug) console.log(`${MODULE_NAME}: Invalid XP format for add_skillxp: ${xpAmount}`);
                return 'malformed';
            }
            xpAmount = parseInt(xpStr);
            
            // 0 or invalid XP is malformed
            if (isNaN(xpAmount) || xpAmount <= 0) {
                if (debug) console.log(`${MODULE_NAME}: Invalid skill XP amount: ${xpAmount}`);
                return 'malformed';
            }
            
            // Selectively load only the character needed
            const character = loadCharacter(characterName);
            
            if (!character) {
                trackUnknownEntity(characterName, 'add_skillxp', info?.actionCount);
                if (shouldTriggerGeneration(characterName)) {
                    addToEntityQueue(characterName);
                }
                return 'executed';
            }
            
            // Initialize skills component if needed
            if (!character.skills) {
                character.skills = {};
            }
            
            if (!character.skills[skillName]) {
                if (debug) console.log(`${MODULE_NAME}: Skill ${skillName} not found on ${character.name}`);
                return 'malformed';
            }
            
            const skill = character.skills[skillName];
            skill.xp.current += xpAmount;
            
            if (debug) console.log(`${MODULE_NAME}: Added ${xpAmount} XP to ${character.name}'s ${skillName} (${skill.xp.current}/${skill.xp.max})`);
            
            processSkillLevelUp(skill, skillName);
            save('Character', character);
            return 'executed';
        },
        
        unlock_newskill: function(characterName, skillName) {
            if (!characterName || !skillName) return 'malformed';
            
            // Validate character name before processing
            if (!isValidCharacterName(characterName)) {
                return 'malformed';
            }
            
            characterName = String(characterName).toLowerCase();
            skillName = String(skillName).toLowerCase().replace(/\s+/g, '_');
            
            // Check if skill exists in registry
            const skillRegistry = getSkillRegistry();
            if (!skillRegistry[skillName]) {
                if (debug) console.log(`${MODULE_NAME}: Unknown skill: ${skillName}. Valid skills: ${Object.keys(skillRegistry).join(', ')}`);
                return 'malformed';
            }
            
            // Selectively load only the character needed
            const character = loadCharacter(characterName);
            
            if (!character) {
                trackUnknownEntity(characterName, 'unlock_newskill', info?.actionCount);
                if (shouldTriggerGeneration(characterName)) {
                    addToEntityQueue(characterName);
                }
                return 'executed';
            }
            
            // Initialize skills component if needed
            if (!character.skills) {
                character.skills = {};
            }
            
            // Check if character already has this skill
            if (character.skills[skillName]) {
                if (debug) console.log(`${MODULE_NAME}: ${character.name} already has ${skillName}`);
                return 'malformed';
            }
            
            const maxXP = calculateSkillXPRequirement(skillName, 2);
            character.skills[skillName] = {
                level: 1,
                xp: {
                    current: 0,
                    max: maxXP
                }
            };
            
            if (debug) console.log(`${MODULE_NAME}: ${character.name} learned ${skillName}!`);
            
            save('Character', character);
            return 'executed';
        },
        
        update_attribute: function(characterName, attrName, value) {
            if (!characterName || !attrName) return 'malformed';
            
            // Validate character name before processing
            if (!isValidCharacterName(characterName)) {
                return 'malformed';
            }
            
            characterName = String(characterName).toLowerCase();
            attrName = String(attrName).toLowerCase();
            value = parseInt(value);
            
            if (isNaN(value) || value <= 0) {
                if (debug) console.log(`${MODULE_NAME}: Invalid attribute value: ${value}`);
                return 'malformed';
            }
            
            // Validate against field config
            const attrConfig = null; // Attributes handled by component system
            if (attrConfig && attrConfig.required) {
                const requiredAttrs = attrConfig.required.split(',').map(a => a.trim().toLowerCase());
                const optionalAttrs = attrConfig.optional ? attrConfig.optional.split(',').map(a => a.trim().toLowerCase()) : [];
                const allAttrs = [...requiredAttrs, ...optionalAttrs];
                
                if (!allAttrs.includes(attrName)) {
                    if (debug) console.log(`${MODULE_NAME}: Invalid attribute '${attrName}' - must be one of: ${allAttrs.join(', ')}`);
                    return 'malformed';
                }
            }
            
            // Selectively load only the character needed
            const character = loadCharacter(characterName);
            
            if (!character) return 'executed';
            
            character.attributes[attrName] = value;
            
            if (debug) console.log(`${MODULE_NAME}: Set ${character.name}'s ${attrName} to ${value}`);
            
            save('Character', character);
            return 'executed';
        },
        
        update_relationship: function(name1, name2, changeAmount) {
            if (!name1 || !name2) return 'malformed';
            
            // Validate both character names before processing
            if (!isValidCharacterName(name1) || !isValidCharacterName(name2)) {
                return 'malformed';
            }
            
            name1 = String(name1).toLowerCase();
            name2 = String(name2).toLowerCase();
            
            // Strict number validation (can be negative)
            const changeStr = String(changeAmount).trim();
            if (!/^-?\d+$/.test(changeStr)) {
                if (debug) console.log(`${MODULE_NAME}: Invalid change amount format: ${changeAmount}`);
                return 'malformed';
            }
            changeAmount = parseInt(changeStr);
            
            // 0 change is malformed (why call it?)
            if (isNaN(changeAmount) || changeAmount === 0) {
                if (debug) console.log(`${MODULE_NAME}: Invalid relationship change: ${changeAmount}`);
                return 'malformed';
            }
            
            const characters = loadAll('Character');
            const char1 = characters[name1];
            const char2 = characters[name2];
            
            // Track unknown entities
            if (!char1) {
                trackUnknownEntity(name1, 'update_relationship', info?.actionCount);
                if (shouldTriggerGeneration(name1)) {
                    addToEntityQueue(name1);
                }
            }
            if (!char2) {
                trackUnknownEntity(name2, 'update_relationship', info?.actionCount);
                if (shouldTriggerGeneration(name2)) {
                    addToEntityQueue(name2);
                }
            }
            
            if (!char1 || !char2) {
                if (debug) {
                    console.log(`${MODULE_NAME}: One or both characters not found: ${name1}, ${name2}`);
                }
                return 'executed';
            }
            
            // Ensure relationships is an object (not a string or undefined)
            if (typeof char1.relationships !== 'object' || char1.relationships === null) {
                char1.relationships = {};
                if (debug) {
                    console.log(`${MODULE_NAME}: Fixed relationships for ${char1.name} - was type: ${typeof char1.relationships}`);
                }
            }
            if (typeof char2.relationships !== 'object' || char2.relationships === null) {
                char2.relationships = {};
                if (debug) {
                    console.log(`${MODULE_NAME}: Fixed relationships for ${char2.name} - was type: ${typeof char2.relationships}`);
                }
            }
            
            // Update bidirectional relationships
            if (!char1.relationships[name2]) char1.relationships[name2] = 0;
            if (!char2.relationships[name1]) char2.relationships[name1] = 0;
            
            char1.relationships[name2] += changeAmount;
            char2.relationships[name1] += changeAmount;
            
            const flavorText1 = getRelationshipFlavor(char1.relationships[name2], char1.name, char2.name);
            const flavorText2 = getRelationshipFlavor(char2.relationships[name1], char2.name, char1.name);
            
            save('Character', char1);
            save('Character', char2);
            
            if (debug) {
                console.log(`${MODULE_NAME}: ${char1.name}→${char2.name}: ${flavorText1}`);
                console.log(`${MODULE_NAME}: ${char2.name}→${char1.name}: ${flavorText2}`);
            }
            
            return 'executed';
        },
        
        discover_location: function(characterName, locationName, direction) {
            // Validate inputs
            if (!characterName || !locationName || !direction) return 'malformed';
            
            // Validate character name before processing
            if (!isValidCharacterName(characterName)) {
                return 'malformed';
            }
            
            characterName = String(characterName).toLowerCase();
            locationName = String(locationName).replace(/\s+/g, '_');
            direction = String(direction).toLowerCase();
            
            // Validate direction (cardinal directions + inside/outside for nested locations)
            const validDirections = ['north', 'south', 'east', 'west', 'inside', 'outside'];
            if (!validDirections.includes(direction)) {
                if (debug) console.log(`${MODULE_NAME}: Invalid direction: ${direction}. Valid: ${validDirections.join(', ')}`);
                return 'malformed';
            }
            
            // Get character's current location
            // Selectively load only the character needed
            const character = loadCharacter(characterName);
            
            if (!character) {
                if (debug) {
                    console.log(`${MODULE_NAME}: Character ${characterName} not found`);
                }
                return 'malformed';
            }
            
            const currentLocation = character.location;
            
            // Check if location already exists
            const existingLocation = Utilities.storyCard.get(`[LOCATION] ${locationName}`);
            if (existingLocation) {
                if (debug) console.log(`${MODULE_NAME}: Location ${locationName} already exists - use connect_locations instead`);
                return 'malformed';
            }
            
            // Dynamically determine location header based on player's floor
            let locationHeaders = '<$# Locations>';
            
            // First, check the player's current floor
            // Find the first [PLAYER] card
            const playerCard = Utilities.storyCard.find(card => {
                return card.title && card.title.startsWith('[PLAYER]');
            }, false);
            
            let playerName = null;
            if (playerCard) {
                const match = playerCard.title.match(/\[PLAYER\]\s+(.+)/);
                if (match) {
                    playerName = match[1].trim();
                }
            }
            
            // Allow override via global variable if set
            const customHeader = getGlobalValue('location_header');
            if (customHeader) {
                locationHeaders = customHeader; // User override takes precedence
            }
            
            // Create basic location card (will be enhanced by generation)
            // For inside/outside locations, adjust pathways accordingly
            let pathwaysList;
            if (direction === 'inside') {
                // Interior location - minimal pathways
                pathwaysList = (
                    '- Outside: ' + currentLocation + '\n' +
                    '- Inside: (unexplored)'  // For buildings with multiple rooms
                );
            } else if (direction === 'outside') {
                // Exterior location from interior - include all directions
                pathwaysList = (
                    '- Inside: ' + currentLocation + '\n' +
                    '- North: (unexplored)\n' +
                    '- South: (unexplored)\n' +
                    '- East: (unexplored)\n' +
                    '- West: (unexplored)'
                );
            } else {
                // Standard cardinal direction - include all options
                pathwaysList = (
                    '- ' + getOppositeDirection(direction) + ': ' + currentLocation + '\n' +
                    '- North: (unexplored)\n' +
                    '- South: (unexplored)\n' +
                    '- East: (unexplored)\n' +
                    '- West: (unexplored)\n' +
                    '- Inside: (unexplored)'  // Buildings can have interiors
                );
            }
            
            // Create basic location data
            const locationData = {
                name: locationName,
                type: 'Unknown',
                terrain: 'Unexplored'
            };
            
            // Use default header and info line since we removed formatTemplate
            let headerLine = `## **${locationName}**`;
            let infoLine = 'Type: Unknown | Terrain: Unexplored';
            
            const locationEntry = (
                locationHeaders + '\n' +
                headerLine + '\n' +
                infoLine + '\n' +
                '### Description\n' +
                'An unexplored location. Details will be revealed upon first visit.\n' +
                '### Pathways\n' +
                pathwaysList
            );
            
            const snakeCased = locationName.toLowerCase();
            const spacedName = locationName.replace(/_/g, ' ');
            
            const locationCard = {
                title: `[LOCATION] ${locationName}`,
                type: 'Location',
                keys: `${snakeCased}, ${spacedName}`,  // Keys as comma-separated string
                entry: locationEntry,
                description: `Discovered by ${character.name} on turn ${info?.actionCount || 0}`
            };
            
            Utilities.storyCard.add(locationCard);
            
            // Update current location's pathway
            updateLocationPathway(currentLocation, direction, locationName);
            
            // Queue for generation if GenerationWizard is available
            if (typeof GenerationWizard !== 'undefined' && GenerationWizard.startGeneration) {
                GenerationWizard.startGeneration('Location', null, {
                    NAME: locationName,
                    metadata: {
                        from: currentLocation,
                        direction: direction,
                        discoveredBy: character.name
                    }
                });
            }
            
            if (debug) console.log(`${MODULE_NAME}: ${character.name} discovered ${locationName} to the ${direction}`);
            return 'executed';
        },
        
        connect_locations: function(locationA, locationB, directionFromA) {
            if (!locationA || !locationB || !directionFromA) return 'malformed';
            
            locationA = String(locationA).replace(/\s+/g, '_');
            locationB = String(locationB).replace(/\s+/g, '_');
            directionFromA = String(directionFromA).toLowerCase();
            
            // Validate direction (cardinal directions + inside/outside for nested locations)
            const validDirections = ['north', 'south', 'east', 'west', 'inside', 'outside'];
            if (!validDirections.includes(directionFromA)) {
                if (debug) console.log(`${MODULE_NAME}: Invalid direction: ${directionFromA}. Valid: ${validDirections.join(', ')}`);
                return 'malformed';
            }
            
            // Check both locations exist
            const cardA = Utilities.storyCard.get(`[LOCATION] ${locationA}`);
            const cardB = Utilities.storyCard.get(`[LOCATION] ${locationB}`);
            
            if (!cardA || !cardB) {
                if (debug) console.log(`${MODULE_NAME}: One or both locations not found`);
                return 'malformed';
            }
            
            // Update pathways bidirectionally
            updateLocationPathway(locationA, directionFromA, locationB);
            updateLocationPathway(locationB, getOppositeDirection(directionFromA), locationA);
            
            if (debug) console.log(`${MODULE_NAME}: Connected ${locationA} ${directionFromA} to ${locationB}`);
            return 'executed';
        },
        
        accept_quest: function(playerName, questName, questGiver, questType) {
            // Must have all 4 parameters
            if (!playerName || !questName || !questGiver || !questType) return 'malformed';
            
            // CRITICAL: Convert quest name and giver to snake_case to prevent system breakage
            questName = String(questName).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
            questGiver = String(questGiver).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
            
            // Normalize quest type to lowercase - handle both "story" and "story_quest" formats
            let normalizedType = String(questType).toLowerCase();
            
            // Strip "_quest" suffix if present
            if (normalizedType.endsWith('_quest')) {
                normalizedType = normalizedType.substring(0, normalizedType.length - 6);
            }
            
            // Load quest types from schema
            const questSchema = null; // Quest types handled by scenario
            let validTypes = ['story', 'side', 'hidden', 'raid']; // Default fallback
            let stageRanges = {};
            
            if (questSchema && questSchema.value) {
                try {
                    const parsed = null; // Quest types handled by scenario
                    if (parsed && typeof parsed === 'object') {
                        validTypes = [];
                        
                        // Parse quest types and their stage counts
                        for (const [type, stages] of Object.entries(parsed)) {
                    const typeLower = type.toLowerCase();
                    validTypes.push(typeLower);
                    
                    // Parse stage count - can be "min-max" or single number
                    const stageStr = String(stages);
                    if (stageStr.includes('-')) {
                        const [min, max] = stageStr.split('-').map(s => parseInt(s.trim()));
                        stageRanges[typeLower] = { min, max };
                    } else {
                        const exact = parseInt(stageStr);
                        stageRanges[typeLower] = { min: exact, max: exact };
                    }
                }
                    }
                } catch (e) {
                    if (debug) console.log(`${MODULE_NAME}: Error parsing quest types schema: ${e.message}`);
                    // Keep default fallback values
                }
            } else {
                // Fallback to defaults if schema not found
                stageRanges = {
                    'story': { min: 3, max: 7 },
                    'side': { min: 2, max: 5 },
                    'hidden': { min: 3, max: 7 },
                    'raid': { min: 3, max: 7 }
                };
            }
            
            if (!validTypes.includes(normalizedType)) {
                if (debug) console.log(`${MODULE_NAME}: Invalid quest type: ${questType} (normalized: ${normalizedType}). Valid types: ${validTypes.join(', ')}`);
                return 'malformed';
            }
            
            // Check GenerationWizard availability
            if (typeof GenerationWizard === 'undefined') {
                if (debug) console.log(`${MODULE_NAME}: GenerationWizard not available`);
                return 'executed';
            }
            
            // Check if already generating
            if (GenerationWizard.isActive()) {
                if (debug) console.log(`${MODULE_NAME}: Generation already in progress`);
                return 'executed';
            }
            
            // Determine stage count based on type (using lowercase)
            const range = stageRanges[normalizedType];
            const stageCount = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
            
            if (debug) console.log(`${MODULE_NAME}: Starting quest generation - Name: ${questName}, Type: ${normalizedType}, Stages: ${stageCount}`);
            
            // Start generation with normalized lowercase type
            const started = GenerationWizard.startQuestGeneration(
                questName,
                questGiver,
                normalizedType,  // Pass lowercase version
                stageCount
            );
            
            if (debug) console.log(`${MODULE_NAME}: Quest generation ${started ? 'started' : 'failed to start'}`);
            
            return started ? 'executed' : 'malformed';
        },
        
        offer_quest: function(npcName, questName, questGiver, questType) {
            // Dummy tool - does nothing but is recognized as valid
            // NPC quest offering not yet implemented
            if (!npcName || !questName) return 'malformed';
            
            if (debug) console.log(`${MODULE_NAME}: offer_quest not yet implemented: ${npcName} offers ${questName}`);
            return 'executed';
        },
        
        update_quest: function(characterName, questName, objective, progress, total) {
            if (!questName) return 'malformed';
            
            // If characterName is provided, validate it
            if (characterName && !isValidCharacterName(characterName)) {
                return 'malformed';
            }
            
            questName = String(questName).toLowerCase().replace(/\s+/g, '_');
            
            // Get the quest card
            const questCard = Utilities.storyCard.get(`[QUEST] ${questName}`);
            if (!questCard) {
                if (debug) console.log(`${MODULE_NAME}: Quest ${questName} not found`);
                return 'unknown';  // Return unknown so it gets removed
            }
            
            // Parse the new stage number
            let newStage = 1;
            if (objective && !isNaN(parseInt(objective))) {
                newStage = parseInt(objective);
            } else if (progress && !isNaN(parseInt(progress))) {
                newStage = parseInt(progress);
            }
            
            // Replace "Current Stage: X" with the new value
            let entry = questCard.entry;
            entry = entry.replace(/Current Stage:\s*\d+/i, `Current Stage: ${newStage}`);
            
            // Update the card
            Utilities.storyCard.update(questCard.title, { entry: entry });
            
            if (debug) console.log(`${MODULE_NAME}: Updated ${questName} to stage ${newStage}`);
            return 'executed';
        },
        
        complete_quest: function(characterName, questName) {
            if (!characterName || !questName) return 'malformed';
            
            try {
                // Validate character name before processing
                if (!isValidCharacterName(characterName)) {
                    return 'malformed';
                }
                
                characterName = String(characterName).toLowerCase();
                questName = String(questName).toLowerCase().replace(/\s+/g, '_');
                
                // Find the quest card
                const questCard = Utilities.storyCard.get(`[QUEST] ${questName}`);
                if (!questCard) {
                    if (debug) console.log(`${MODULE_NAME}: Quest ${questName} not found`);
                    return 'executed';
                }
                
                // Replace the first line to mark as completed
                let entry = questCard.entry;
                entry = entry.replace(
                    '<\$# Quests><\$## Active Quests>',
                    '<\$# Quests><\$## Completed Quests>'
                );
                
                // Update the card
                Utilities.storyCard.update(questCard.title, { entry: entry });
                
                if (debug) console.log(`${MODULE_NAME}: Completed quest: ${questName}`);
                return 'executed';
            } catch (e) {
                if (debug) console.log(`${MODULE_NAME}: Error in complete_quest: ${e.message}`);
                return 'malformed';
            }
        },

        abandon_quest: function(characterName, questName) {
            if (!characterName || !questName) return 'malformed';
            
            characterName = String(characterName).toLowerCase();
            questName = String(questName).toLowerCase().replace(/\s+/g, '_');
            
            // Find the quest card
            const questCard = Utilities.storyCard.get(`[QUEST] ${questName}`);
            if (!questCard) {
                if (debug) console.log(`${MODULE_NAME}: Quest ${questName} not found`);
                return 'executed';
            }
            
            // Replace the first line to mark as abandoned
            let entry = questCard.entry;
            entry = entry.replace(
                '<\$# Quests><\$## Active Quests>',
                '<\$# Quests><\$## Abandoned Quests>'
            );
            
            // Update the card
            Utilities.storyCard.update(questCard.title, { entry: entry });
            
            if (debug) console.log(`${MODULE_NAME}: Abandoned quest: ${questName}`);
            return 'executed';
        },
        
        death: function(characterName) {
            if (!characterName) return 'malformed';
            
            // Validate character name before processing
            if (!isValidCharacterName(characterName)) {
                return 'malformed';
            }
            
            characterName = String(characterName).toLowerCase();
            if (debug) console.log(`${MODULE_NAME}: Death recorded for: ${characterName}`);
            return 'executed';
        }
    };
    
    // ==========================
    // Entity Tracking System
    // ==========================
    function loadEntityTrackerConfig() {
        // Use centralized sectioned config loader
        const sections = Utilities.config.loadSectioned('[SANE_CONFIG] Entity Tracker', '# ');
        
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
        const allCharacters = loadAll('Character');
        if (allCharacters[entityName]) {
            if (debug) console.log(`${MODULE_NAME}: Skipping tracking for existing character in cache: ${entityName}`);
            return;
        }
        
        // Check if any character has this as a trigger_name
        for (const charName in allCharacters) {
            const character = allCharacters[charName];
            if (character.info && character.info.trigger_name) {
                // Check if trigger_name matches (could be string or array)
                const triggers = Array.isArray(character.info.trigger_name) 
                    ? character.info.trigger_name 
                    : [character.info.trigger_name];
                
                const normalizedTriggers = triggers.map(t => String(t).toLowerCase());
                if (normalizedTriggers.includes(entityName)) {
                    if (debug) console.log(`${MODULE_NAME}: Skipping tracking - ${entityName} is trigger_name for character: ${character.name}`);
                    // Clean up any existing tracking data for this entity
                    removeFromTracker(entityName);
                    return;
                }
            }
        }
        
        // Also check story cards directly as a fallback
        const characterCards = Utilities.storyCard.find(card => {
            if (!card.title.startsWith('[CHARACTER]') && !card.title.startsWith('[PLAYER]')) {
                return false;
            }
            
            // Check if title matches (case-insensitive)
            const titleMatch = card.title.match(/\[(CHARACTER|PLAYER)\]\s+(.+)/);
            if (titleMatch && titleMatch[2] && titleMatch[2].toLowerCase() === entityName) {
                return true;
            }
            
            // Don't try to parse - just check title
            // (parsing without FORMAT card would fail anyway)
            
            return false;
        }, true);
        
        // If character already exists, don't track
        if (characterCards && characterCards.length > 0) {
            if (debug) console.log(`${MODULE_NAME}: Skipping tracking for existing character card: ${entityName}`);
            return;
        }
        
        // Load and check blacklist from config
        const config = loadEntityTrackerConfig();
        if (config.blacklist && config.blacklist.includes(entityName)) return;
        
        // Load tracker from config card's description field
        const configCard = Utilities.storyCard.get('[SANE_CONFIG] Entity Tracker');
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
        
        Utilities.storyCard.update('[SANE_CONFIG] Entity Tracker', {
            description: description
        });
        
        if (debug) {
            console.log(`${MODULE_NAME}: Tracked unknown entity ${entityName} (unique turns: ${tracker[entityName].uniqueTurns.length})`);
        }
    }
    
    function removeFromTracker(entityName) {
        // Load tracker from config card's description field
        const configCard = Utilities.storyCard.get('[SANE_CONFIG] Entity Tracker');
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
            
            Utilities.storyCard.update('[SANE_CONFIG] Entity Tracker', {
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
        const allCharacters = loadAll('Character');
        for (const charName in allCharacters) {
            const character = allCharacters[charName];
            if (character.info && character.info.trigger_name) {
                const triggers = Array.isArray(character.info.trigger_name) 
                    ? character.info.trigger_name 
                    : [character.info.trigger_name];
                
                const normalizedTriggers = triggers.map(t => String(t).toLowerCase());
                if (normalizedTriggers.includes(entityName)) {
                    if (debug) console.log(`${MODULE_NAME}: Not triggering generation - ${entityName} already exists as trigger_name for: ${character.name}`);
                    removeFromTracker(entityName);
                    return false;
                }
            }
        }
        
        // Load tracker from config card's description
        const configCard = Utilities.storyCard.get('[SANE_CONFIG] Entity Tracker');
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
        const queueCard = Utilities.storyCard.get('[SANE_CONFIG] Entity Queue');
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
        const configCard = Utilities.storyCard.get('[SANE_CONFIG] Entity Tracker');
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
        
        // Instead of queuing, directly trigger GenerationWizard if available
        if (typeof GenerationWizard !== 'undefined' && GenerationWizard.startGeneration) {
            if (debug) console.log(`${MODULE_NAME}: Triggering GenerationWizard for entity: ${entityName}`);
            // Start NPC generation with just the name
            GenerationWizard.startGeneration('NPC', { name: entityName });
            return;
        }
        
        // Fallback to queue system if GenerationWizard not available
        const queueCard = Utilities.storyCard.get('[SANE_CONFIG] Entity Queue');
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
            Utilities.storyCard.update('[SANE_CONFIG] Entity Queue', {
                entry: JSON.stringify(queue, null, 2),
                type: 'data'
            });
            
            if (debug) console.log(`${MODULE_NAME}: Added ${entityName} to entity generation queue`);
        }
    }
    
    function queuePendingEntities() {
        // Load queue from Story Card
        const queueCard = Utilities.storyCard.get('[SANE_CONFIG] Entity Queue');
        if (!queueCard) return false;
        
        let queue = [];
        try {
            queue = JSON.parse(queueCard.entry || '[]');
        } catch (e) {
            return false;
        }
        
        // If already generating something, wait
        if (currentEntityGeneration) {
            if (debug) console.log(`${MODULE_NAME}: Already generating ${currentEntityGeneration}, waiting...`);
            return false;
        }
        
        // If queue is empty, nothing to do
        if (queue.length === 0) {
            return false;
        }
        
        // Pop the first entity from queue
        const nextEntity = queue.shift();
        
        // Save updated queue
        Utilities.storyCard.update('[SANE_CONFIG] Entity Queue', {
            entry: JSON.stringify(queue, null, 2),
            type: 'data'
        });
        
        // Mark as currently generating
        currentEntityGeneration = nextEntity;
        
        if (debug) console.log(`${MODULE_NAME}: Starting generation for ${nextEntity}`);
        
        // Trigger GenerationWizard if available
        if (typeof GenerationWizard !== 'undefined' && GenerationWizard.startEntityGeneration) {
            // Start the classification query process
            const classificationData = {
                name: nextEntity,
                stage: 'classification'
            };
            GenerationWizard.startEntityGeneration(classificationData);
            return true;
        } else {
            if (debug) console.log(`${MODULE_NAME}: GenerationWizard not available for entity generation`);
            // Clear the current generation flag since we can't proceed
            currentEntityGeneration = null;
            return false;
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
        const configCard = Utilities.storyCard.get('[SANE_CONFIG] Entity Tracker');
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
                
                Utilities.storyCard.update('[SANE_CONFIG] Entity Tracker', {
                    description: description
                });
            } catch (e) {
                // Ignore parse errors
            }
        }
        
        // Clear current generation flag
        currentEntityGeneration = null;
        
        if (debug) console.log(`${MODULE_NAME}: Completed generation for ${entityName}`);
        
        // Process next in queue if any
        queuePendingEntities();
    }
    
    // ==========================
    // Process Tools in Text
    // ==========================
    function processTools(text) {
        if (!text) return text;
        
        let modifiedText = text;
        let toolsToRemove = [];
        let toolsToModify = [];
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
                    const allChars = loadAll('Character');
                    for (const [name, char] of Object.entries(allChars || {})) {
                        entityCache[`Character.${name}`] = char;
                    }
                } catch(e) {
                    // Fall back to GameState.loadAll if available
                    if (GameState && GameState.loadAll) {
                        const allChars = GameState.loadAll('Character');
                        for (const [name, char] of Object.entries(allChars || {})) {
                            entityCache[`Character.${name}`] = char;
                        }
                    } else {
                        if (debug) console.log(`${MODULE_NAME}: Unable to load characters: ${e}`);
                    }
                }
                charactersLoaded = true;
            }
            
            // Capture revert data BEFORE executing the tool
            const revertData = captureRevertData(toolName.toLowerCase(), params, getCachedEntitiesOfType('Character'));
            
            let result = processToolCall(toolName, params, getCachedEntitiesOfType('Character'));
            
            // Log tool result
            if (debug) {
                const toolCall = `${toolName}(${params.join(',')})`;
                if (result === 'executed') {
                    console.log(`${MODULE_NAME}: Tool EXECUTED: ${toolCall}`);
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
            
            // Check if this is accept_quest and needs parameter normalization
            if (toolName === 'accept_quest' && result === 'executed') {
                // Normalize ALL parameters in the visible text to teach the LLM proper format
                const normalizedParams = [...params];
                
                // Normalize quest name (param 1)
                if (normalizedParams[1]) {
                    normalizedParams[1] = String(normalizedParams[1]).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
                }
                
                // Normalize quest giver (param 2)
                if (normalizedParams[2]) {
                    normalizedParams[2] = String(normalizedParams[2]).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
                }
                
                // Normalize quest type (param 3)
                if (normalizedParams[3]) {
                    let questType = String(normalizedParams[3]).toLowerCase();
                    // Remove _quest suffix if present
                    if (questType.endsWith('_quest')) {
                        questType = questType.substring(0, questType.length - 6);
                    }
                    normalizedParams[3] = questType;
                }
                
                // Build the normalized tool string
                const normalizedTool = `${toolName}(${normalizedParams.join(', ')})`;
                
                if (normalizedTool !== fullMatch) {
                    toolsToModify.push({
                        match: fullMatch,
                        replacement: normalizedTool,
                        index: matchIndex,
                        length: fullMatch.length
                    });
                    if (debug) console.log(`${MODULE_NAME}: Normalizing: ${fullMatch} -> ${normalizedTool}`);
                }
            }
            
            // Only remove if malformed or unknown tool
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
        }
        
        // Apply modifications and removals from end to beginning
        const allChanges = [...toolsToModify, ...toolsToRemove].sort((a, b) => b.index - a.index);
        
        for (const change of allChanges) {
            const before = modifiedText.substring(0, change.index);
            const after = modifiedText.substring(change.index + change.length);
            
            if (change.replacement) {
                // Modification (normalize parameters)
                modifiedText = before + change.replacement + after;
            } else {
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
    
    // Capture revert data for specific tools
    function captureRevertData(toolName, params, characters) {
        if (!characters) characters = loadAll('Character');
        const revertData = {};
        
        switch(toolName) {
            case 'update_location':
                const char = characters[String(params[0]).toLowerCase()];
                if (char && char.info) {
                    revertData.oldLocation = char.info.location;
                }
                break;
                
            case 'add_item':
                // Store current quantity so we can revert to it
                const addChar = characters[String(params[0]).toLowerCase()];
                if (addChar && addChar.inventory) {
                    const itemName = String(params[1]).toLowerCase().replace(/\s+/g, '_');
                    const currentItem = addChar.inventory[itemName];
                    revertData.oldQuantity = currentItem ? currentItem.quantity : 0;
                }
                break;
                
            case 'remove_item':
                // Store current quantity so we can restore it
                const removeChar = characters[String(params[0]).toLowerCase()];
                if (removeChar && removeChar.inventory) {
                    const itemName = String(params[1]).toLowerCase().replace(/\s+/g, '_');
                    const currentItem = removeChar.inventory[itemName];
                    revertData.oldQuantity = currentItem ? currentItem.quantity : 0;
                }
                break;
                
            case 'transfer_item':
                // Store current quantities for both characters
                const fromChar = characters[String(params[0]).toLowerCase()];
                const toChar = characters[String(params[1]).toLowerCase()];
                const transferItem = String(params[2]).toLowerCase().replace(/\s+/g, '_');
                
                if (fromChar && fromChar.inventory) {
                    const fromItem = fromChar.inventory[transferItem];
                    revertData.fromOldQuantity = fromItem ? fromItem.quantity : 0;
                }
                if (toChar && toChar.inventory) {
                    const toItem = toChar.inventory[transferItem];
                    revertData.toOldQuantity = toItem ? toItem.quantity : 0;
                }
                break;
                
            case 'deal_damage':
                const target = characters[String(params[1]).toLowerCase()];
                if (target && target.stats && target.stats.hp) {
                    revertData.oldHp = target.stats.hp.current;
                }
                break;
                
            case 'update_relationship':
                const char1 = characters[String(params[0]).toLowerCase()];
                if (char1 && char1.relationships) {
                    const char2Name = String(params[1]).toLowerCase();
                    revertData.oldValue = char1.relationships[char2Name] || 0;
                }
                break;
                
            case 'add_levelxp':
                const xpChar = characters[String(params[0]).toLowerCase()];
                if (xpChar && xpChar.stats && xpChar.stats.level) {
                    revertData.oldLevel = xpChar.stats.level.value;
                    revertData.oldXp = xpChar.stats.level.xp ? xpChar.stats.level.xp.current : 0;
                }
                break;
                
            case 'add_skillxp':
                const skillChar = characters[String(params[0]).toLowerCase()];
                const skillName = String(params[1]).toLowerCase().replace(/\s+/g, '_');
                if (skillChar && skillChar.skills && skillChar.skills[skillName]) {
                    const skill = skillChar.skills[skillName];
                    revertData.oldLevel = skill.level || 1;
                    revertData.oldXp = skill.xp ? skill.xp.current : 0;
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
        
        // Check if it's a known tool
        if (toolProcessors[normalizedToolName]) {
            try {
                // Execute the tool (it will use the cached characters)
                const result = toolProcessors[normalizedToolName](...params);
                return result;
            } catch (e) {
                if (debug) {
                    console.log(`${MODULE_NAME}: Error in ${normalizedToolName}: ${e.message}`);
                }
                logError(e, `Tool execution: ${normalizedToolName}(${params.join(', ')})`);
                return 'malformed';
            }
        }
        
        // Check for dynamic core stat tools (update_hp, update_mp, etc)
        if (normalizedToolName.startsWith('update_')) {
            // Just try to process it as a core stat tool
            // The function will handle validation
            if (processCoreStatTool(normalizedToolName, params)) {
                return 'executed';
            }
        }
        
        // Check runtime tools
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
            const character = load('Character', characterName);
            if (!character) {
                if (debug) console.log(`${MODULE_NAME}: Character ${characterName} not found`);
                return false;
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
            
            save('Character', character);
            if (debug) console.log(`${MODULE_NAME}: Set ${character.name}'s max ${statName} to ${newMax}`);
            return true;
        }
        
        // Check for update_[stat] pattern (current value)
        const statName = toolName.substring(7).toLowerCase();
        
        // Load the character
        const character = load('Character', characterName);
        if (!character) {
            if (debug) console.log(`${MODULE_NAME}: Character ${characterName} not found`);
            return false;
        }
        
        const current = parseInt(params[1]);
        if (isNaN(current)) {
            if (debug) console.log(`${MODULE_NAME}: Invalid value for ${statName}: ${params[1]}`);
            return false;
        }
        
        // Update current value using component paths
        // First check stats component
        if (character.stats && character.stats[statName]) {
            if (typeof character.stats[statName] === 'object') {
                character.stats[statName].current = current;
            }
        }
        // Fallback to legacy paths
        else if (character[statName] && typeof character[statName] === 'object') {
            character[statName].current = current;
        }
        // Try coreStats for very old format
        else if (character.coreStats && character.coreStats[statName]) {
            character.coreStats[statName].current = current;
        }
        else {
            if (debug) console.log(`${MODULE_NAME}: Stat ${statName} not found on character`);
            return false;
        }
        
        save('Character', character);
        if (debug) console.log(`${MODULE_NAME}: Set ${character.name}'s current ${statName} to ${current}`);
        return true;
    }
    
    // ==========================
    // Debug Helper Functions (only work when debug = true)
    // ==========================
    
    // Handle debug commands directly
    function handleDebugCommand(commandName, args) {
        const debugCommands = [
            // GenerationWizard tests
            'gw_activate', 'gw_npc', 'gw_quest', 'gw_location',
            // Status and listing commands
            'entity_status', 'char_list', 'schema_all',
            // System tests
            'runtime_test', 'test_footer', 'test_info', 'test_template', 'test_inventory', 'test_all',
            // Maintenance
            'cleanup', 'fix_format',
            // Debug utilities
            'debug_log', 'debug_help'
        ];
        
        // Check if it's a debug command
        if (debugCommands.includes(commandName)) {
            if (commandName === 'debug_help') {
                return `\n<<<[DEBUG COMMANDS]\n${debugCommands.filter(c => c !== 'debug_help').map(c => `/${c}`).join('\n')}>>>\n`;
            }
            
            if (commandName === 'debug_log') {
                const result = outputDebugLog();
                return `\n<<<${result}>>>\n`;
            }
            
            // GenerationWizard tests
            if (commandName === 'gw_activate') {
                if (typeof GenerationWizard === 'undefined') return "<<<GenerationWizard not available>>>";
                GenerationWizard('activate', null);
                return "\n<<<GenerationWizard activated for next turn>>>\n";
            }
            
            if (commandName === 'gw_npc') {
                if (typeof GenerationWizard === 'undefined') return "<<<GenerationWizard not available>>>";
                const result = GenerationWizard.startGeneration('NPC', {name: 'Debug_Test_NPC'});
                const progressCard = Utilities.storyCard.get('[ENTITY_GEN] In Progress');
                const isActive = GenerationWizard.isActive();
                console.log(`[DEBUG] Started NPC generation for Debug_Test_NPC\nResult: ${result}\nActive: ${isActive}\nProgress card exists: ${progressCard ? 'yes' : 'no'}`);
                return "\n<<<Started NPC generation for Debug_Test_NPC>>>\n";
            }
            
            if (commandName === 'gw_quest') {
                if (typeof GenerationWizard === 'undefined') return "<<<GenerationWizard not available>>>";
                GenerationWizard.startGeneration('Quest', {
                    NAME: 'Debug_Test_Quest',
                    QUEST_GIVER: 'Debug_NPC',
                    QUEST_TYPE: 'side',
                    STAGE_COUNT: 3
                });
                return "\n<<<Started Quest generation for Debug_Test_Quest>>>\n";
            }
            
            if (commandName === 'gw_location') {
                if (typeof GenerationWizard === 'undefined') return "<<<GenerationWizard not available>>>";
                GenerationWizard.startGeneration('Location', null, {NAME: 'Debug_Test_Location'});
                return "\n<<<Started Location generation for Debug_Test_Location>>>\n";
            }
            
            // Status and listing commands
            if (commandName === 'entity_status') {
                const config = Utilities.storyCard.get('[SANE_CONFIG] Entity Tracker');
                const queueCard = Utilities.storyCard.get('[SANE_CONFIG] Entity Queue');
                
                let status = `Entity Tracker Status:\n`;
                if (config) {
                    const parsed = parseConfigEntry(config.entry || '');
                    status += `- Threshold: ${parsed.threshold || 3}\n`;
                    status += `- Auto Generate: ${parsed.auto_generate || 'true'}\n`;
                    status += `- Blacklist: ${parsed.blacklist || 'none'}\n`;
                }
                
                if (queueCard && queueCard.entry) {
                    const lines = queueCard.entry.split('\n').filter(l => l.trim());
                    status += `- Queue has ${lines.length} entities\n`;
                }
                
                return status;
            }
            
            if (commandName === 'char_list') {
                const chars = loadAll('Character');
                const names = Object.keys(chars);
                return `Characters (${names.length}): ${names.join(', ')}`;
            }
            
            if (commandName === 'schema_all') {
                const entities = [
                    '[SANE_ENTITY] Character',
                    '[SANE_ENTITY] Location', 
                    '[SANE_ENTITY] Item',
                    '[SANE_ENTITY] Faction',
                    '[SANE_ENTITY] Global'
                ];
                
                let result = "=== All Entity Types ===\n";
                for (const title of entities) {
                    const card = Utilities.storyCard.get(title);
                    if (card) {
                        result += `\n${title}:\n${(card.description || '').substring(0, 200)}...\n`;
                    }
                }
                return result;
            }
            
            // System tests
            if (commandName === 'runtime_test') {
                // Test runtime variables
                const testVar = 'debug_test_var';
                set(`Global.${testVar}`, 'test_value_' + Date.now());
                const value = get(`Global.${testVar}`);
                return `Set Global.${testVar} = ${value}`;
            }
            
            // Maintenance
            if (commandName === 'cleanup') {
                const testNames = ['Debug_Test_NPC', 'Debug_Test_Monster', 'Debug_Test_Boss', 
                                 'Debug_Test_Item', 'Debug_Test_Location', 'Debug_Test_Quest',
                                 'DebugFooterTest', 'QuickTest', 'TemplateTest'];
                let removed = 0;
                
                for (const name of testNames) {
                    // Try both CHARACTER and PLAYER prefixes
                    const titles = [`[CHARACTER] ${name}`, `[PLAYER] ${name}`];
                    for (const title of titles) {
                        if (Utilities.storyCard.get(title)) {
                            Utilities.storyCard.remove(title);
                            removed++;
                        }
                    }
                }
                
                return `Cleanup complete. Removed ${removed} debug cards.`;
            }
            
            
            if (commandName === 'test_datastorage') {
                let result = '=== Testing Data Storage System ===\n\n';
                
                // Create test character with various info fields
                const testChar = {
                    name: 'DataTest',
                    info: {
                        isPlayer: false,
                        gender: 'Male',
                        race: 'Human',
                        class: 'Warrior',
                        location: 'Test_Zone',
                        // Test arbitrary info fields
                        favorite_color: 'blue',
                        secret_fear: 'spiders',
                        battle_cry: 'For glory!',
                        hometown: 'Village_of_Testing'
                    },
                    stats: {
                        level: {
                            value: 5,
                            xp: { current: 2500, max: 3000 }
                        },
                        hp: { current: 85, max: 100 }
                    },
                    inventory: {
                        iron_sword: 1,
                        health_potion: 3
                    }
                };
                
                // Save the character
                save('Character', testChar);
                result += '1. Character saved with arbitrary info fields\n';
                
                // Check the card's DESCRIPTION field
                const card = Utilities.storyCard.get('[CHARACTER] DataTest');
                if (card && card.description) {
                    result += '\n2. DESCRIPTION field contains:\n';
                    if (card.description.includes('<== REAL DATA ==>')) {
                        result += '   ✓ Data markers found\n';
                        if (card.description.includes('favorite_color: blue')) {
                            result += '   ✓ Arbitrary info field saved\n';
                        }
                        if (card.description.includes('secret_fear: spiders')) {
                            result += '   ✓ Another arbitrary field saved\n';
                        }
                    } else {
                        result += '   ✗ No data markers - using old format\n';
                    }
                }
                
                // Load the character back
                const loaded = load('Character', 'DataTest');
                result += '\n3. Loading character back:\n';
                result += `   Level: ${get('Character.DataTest.stats.level')}\n`;
                result += `   Location: ${get('Character.DataTest.info.location')}\n`;
                result += `   Favorite Color: ${get('Character.DataTest.info.favorite_color') || 'undefined'}\n`;
                result += `   Secret Fear: ${get('Character.DataTest.info.secret_fear') || 'undefined'}\n`;
                result += `   Battle Cry: ${get('Character.DataTest.info.battle_cry') || 'undefined'}\n`;
                
                // Test setting a new arbitrary field
                set('Character.DataTest.info.lucky_number', 7);
                result += '\n4. Added new info field via set()\n';
                result += `   Lucky Number: ${get('Character.DataTest.info.lucky_number')}\n`;
                
                // Clean up
                Utilities.storyCard.remove('[CHARACTER] DataTest');
                result += '\n5. Test complete - card cleaned up\n';
                
                return result;
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
    if (!Utilities.storyCard.get('[SANE_CONFIG] Entity Tracker')) {
        createEntityTrackerCards();
    }

    // Test dynamic resolution functionality
    
    // Initialize SANE schemas if they don't exist
    function createSANESchemas() {
        // Create new SANE_ENTITY cards
        if (!Utilities.storyCard.get('[SANE_ENTITY] Character')) {
            Utilities.storyCard.add({
                title: '[SANE_ENTITY] Character',
                description: JSON.stringify({
                    components: ['info', 'stats', 'attributes', 'skills', 'inventory', 'relationships'],
                    prefixes: ['CHARACTER', 'PLAYER'],
                    dataOnly: false
                }, null, 2),
                type: 'schema'
            });
            if (debug) console.log(MODULE_NAME + ': Created [SANE_ENTITY] Character');
        }
    }
    
    // Initialize component definitions using new SANE_COMP cards
    function createComponentSchemas() {
        // Info component
        if (!Utilities.storyCard.get('[SANE_COMP] info')) {
            Utilities.storyCard.add({
                title: '[SANE_COMP] info',
                description: JSON.stringify({
                    fields: {
                        gender: "string",
                        race: "string", 
                        class: "string",
                        location: "reference:Location",
                        faction: "reference:Faction",
                        appearance: "string",
                        personality: "string",
                        background: "string"
                    }
                }, null, 2),
                type: 'schema'
            });
            if (debug) console.log(MODULE_NAME + ': Created [SANE_COMP] info');
        }
        
        // Stats component with progression formulas
        if (!Utilities.storyCard.get('[SANE_COMP] stats')) {
            Utilities.storyCard.add({
                title: '[SANE_COMP] stats',
                description: JSON.stringify({
                    defaults: {
                        level: {
                            value: 1,
                            xp: { current: 0, max: 500 }
                        },
                        hp: { current: 100, max: 100 }
                    },
                    level_progression: {
                        xp_formula: "level * (level - 1) * 500",
                        xp_overrides: {
                            "1": 500,
                            "2": 1000
                        }
                    },
                    hp_progression: {
                        base: 100,
                        per_level: 20
                    }
                }, null, 2),
                type: 'schema'
            });
            if (debug) console.log(MODULE_NAME + ': Created [SANE_COMP] stats with progression formulas');
        }
        
        // Attributes component with master attributes
        if (!Utilities.storyCard.get('[SANE_COMP] attributes')) {
            Utilities.storyCard.add({
                title: '[SANE_COMP] attributes',
                description: JSON.stringify({
                    defaults: {
                        "VITALITY": { "value": 10 },
                        "STRENGTH": { "value": 10 },
                        "DEXTERITY": { "value": 10 },
                        "AGILITY": { "value": 10 }
                    },
                    registry: {
                        "VITALITY": {
                            "description": "Determines max HP and resistance to status effects",
                            "abbreviation": "VIT"
                        },
                        "STRENGTH": {
                            "description": "Physical power for melee damage and carry capacity",
                            "abbreviation": "STR"
                        },
                        "DEXTERITY": {
                            "description": "Precision and accuracy for critical hits",
                            "abbreviation": "DEX"
                        },
                        "AGILITY": {
                            "description": "Speed and evasion capabilities",
                            "abbreviation": "AGI"
                        }
                    }
                }, null, 2),
                type: 'schema'
            });
            if (debug) console.log(MODULE_NAME + ': Created [SANE_COMP] attributes with master attributes');
        }
        
        // Skills component with comprehensive registry and formulas
        if (!Utilities.storyCard.get('[SANE_COMP] skills')) {
            Utilities.storyCard.add({
                title: '[SANE_COMP] skills',
                description: JSON.stringify({
                    defaults: {},  // Skills are dynamic, added as needed
                    categories: {
                        "default": { "xp_formula": "level * 100", "description": "Standard progression" },
                        "combat": { "xp_formula": "level * 80", "description": "Fighting and weapon skills" },
                        "crafting": { "xp_formula": "level * 150", "description": "Creating items and equipment" },
                        "social": { "xp_formula": "level * 120", "description": "Interpersonal abilities" },
                        "gathering": { "xp_formula": "level * 130", "description": "Resource collection" },
                        "support": { "xp_formula": "level * 90", "description": "Combat support abilities" }
                    },
                    registry: {
                        // Combat skills
                        "one_handed_sword": { "category": "combat" },
                        "two_handed_sword": { "category": "combat" },
                        "rapier": { "category": "combat" },
                        "one_handed_curved_sword": { "category": "combat" },
                        "dagger": { "category": "combat" },
                        "blade_throwing": { "xp_formula": "level * 110" },
                        "spear": { "category": "combat" },
                        "mace": { "category": "combat" },
                        "katana": { "xp_formula": "level * 200" },
                        "martial_arts": { "category": "combat" },
                        "scimitar": { "xp_formula": "level * 150" },
                        
                        // Combat Support
                        "parrying": { "category": "support" },
                        "battle_healing": { "category": "support" },
                        "searching": { "category": "support" },
                        "tracking": { "xp_formula": "level * 120" },
                        "hiding": { "category": "support" },
                        "night_vision": { "category": "support" },
                        "extended_weight_limit": { "category": "support" },
                        "straining": { "category": "support" },
                        
                        // Crafting
                        "blacksmithing": { "category": "crafting" },
                        "tailoring": { "category": "crafting" },
                        "cooking": { "category": "crafting" },
                        "alchemy": { "category": "crafting" },
                        "woodcrafting": { "category": "crafting" },
                        
                        // Gathering
                        "fishing": { "xp_formula": "level * 200" },
                        "herbalism": { "category": "gathering" },
                        "mining": { "category": "gathering" },
                        
                        // Social
                        "trading": { "category": "social" },
                        "negotiation": { "category": "social" },
                        "persuasion": { "category": "social" },
                        "intimidation": { "category": "social" },
                        "bartering": { "category": "social" },
                        "leadership": { "xp_formula": "level * 140" },
                        "performing": { "category": "social" }
                    }
                }, null, 2),
                type: 'schema'
            });
            if (debug) console.log(MODULE_NAME + ': Created [SANE_COMP] skills with full registry');
        }
        
        // Inventory component with quantity tracking
        if (!Utilities.storyCard.get('[SANE_COMP] inventory')) {
            Utilities.storyCard.add({
                title: '[SANE_COMP] inventory',
                description: JSON.stringify({
                    defaults: {},  // Items added dynamically
                    structure: {
                        // Each item stored as: "item_name": { "quantity": number }
                        example: {
                            "health_potion": { "quantity": 5 },
                            "iron_sword": { "quantity": 1 },
                            "bread": { "quantity": 10 }
                        }
                    },
                    // Note: Item registry could be added here for validation
                    // registry: { "health_potion": { "max_stack": 99, "type": "consumable" } }
                }, null, 2),
                type: 'schema'
            });
            if (debug) console.log(MODULE_NAME + ': Created [SANE_COMP] inventory with quantity tracking');
        }
        
        // Relationships component with detailed thresholds
        if (!Utilities.storyCard.get('[SANE_COMP] relationships')) {
            Utilities.storyCard.add({
                title: '[SANE_COMP] relationships',
                description: JSON.stringify({
                    defaults: {},  // Relationships are dynamic
                    thresholds: [
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
                        { min: 500, max: 999, flavor: "{from} has strong affection and loyalty toward {to}" },
                        { min: 1000, max: 1999, flavor: "{from} loves {to} deeply" },
                        { min: 2000, max: 9999, flavor: "{from} would do absolutely anything for {to}" }
                    ]
                }, null, 2),
                type: 'schema'
            });
            if (debug) console.log(MODULE_NAME + ': Created [SANE_COMP] relationships with detailed thresholds');
        }
        
        // Pathways component (for locations)
        if (!Utilities.storyCard.get('[SANE_COMP] pathways')) {
            Utilities.storyCard.add({
                title: '[SANE_COMP] pathways',
                description: JSON.stringify({
                    fields: {
                        north: "reference:Location",
                        south: "reference:Location",
                        east: "reference:Location",
                        west: "reference:Location",
                        up: "reference:Location",
                        down: "reference:Location",
                        inside: "reference:Location",
                        outside: "reference:Location"
                    }
                }, null, 2),
                type: 'schema'
            });
            if (debug) console.log(MODULE_NAME + ': Created [SANE_COMP] pathways');
        }
    }
    
    // Auto-initialize SANE schemas on first run
    createSANESchemas();
    createComponentSchemas();
    

    // Public API
    
    // Universal Data System - NEW PRIMARY API
    GameState.load = load;
    GameState.save = save;
    GameState.loadAll = loadAll;
    GameState.get = get;
    GameState.set = set;
    GameState.resolve = resolve;  // Dynamic path resolution
    GameState.create = create;  // Unified entity creator

    GameState.processTools = processTools;
    GameState.processGetters = processGetters;
    GameState.getGlobalValue = getGlobalValue;
    GameState.setGlobalValue = setGlobalValue;
    
    // Character API - redirects to universal functions
    GameState.loadCharacter = (name) => load('Character', name);
    GameState.saveCharacter = (character) => save('Character', character);
    GameState.createCharacter = createCharacter;  // Legacy, redirects to create()
    
    // Location API - redirects to universal functions  
    GameState.loadLocation = (name) => load('Location', name);
    GameState.saveLocation = (location) => save('Location', location);
    
    GameState.getPlayerName = function() {
        // Find the first [PLAYER] card
        const playerCard = Utilities.storyCard.find(card => {
            return card.title && card.title.startsWith('[PLAYER]');
        }, false); // false = return first match only
        
        if (playerCard) {
            // Extract name from title: [PLAYER] Name
            const match = playerCard.title.match(/\[PLAYER\]\s+(.+)/);
            if (match) {
                return match[1].trim();
            }
        }
        
        if (debug) console.log(`${MODULE_NAME}: No [PLAYER] card found`);
        return null;
    };
    
    // Entity tracking API
    GameState.completeEntityGeneration = completeEntityGeneration;
    GameState.completeLocationGeneration = completeLocationGeneration;
    GameState.loadEntityTrackerConfig = loadEntityTrackerConfig;
    
    // Tool processing API (for testing)
    GameState.processToolCall = processToolCall;
    
    // Rewind System API
    GameState.RewindSystem = RewindSystem;
    
    // Field accessor methods
    GameState.getCharacterField = getCharacterField;
    GameState.setCharacterField = setCharacterField;
    GameState.getField = function(characterName, fieldPath) {
        const character = GameState.loadCharacter(characterName);
        if (!character) return null;
        return getCharacterField(character, fieldPath);
    };
    GameState.setField = function(characterName, fieldPath, value) {
        const character = GameState.loadCharacter(characterName);
        if (!character) return false;
        
        setCharacterField(character, fieldPath, value);
        return save('Character', character);
    };
    GameState.modifyField = function(characterName, fieldPath, delta) {
        const current = GameState.getField(characterName, fieldPath);
        if (current === null || typeof current !== 'number') return false;
        
        return GameState.setField(characterName, fieldPath, current + delta);
    };
    
    // Testing functions
    GameState.testComponentTools = function() {
        console.log(`${MODULE_NAME}: Testing component-aware tools...`);
        
        // Create test character with components
        const testChar = createCharacter({
            name: 'ToolTestHero',
            isPlayer: false
        });
        
        if (!testChar) {
            console.log('ERROR: Failed to create test character');
            return false;
        }
        
        console.log('1. Testing HP modification (stats.hp)...');
        // Test damage tool
        const damageResult = toolProcessors.deal_damage('unknown', 'ToolTestHero', 20);
        console.log(`  - deal_damage result: ${damageResult}`);
        console.log(`  - HP after damage: ${get('Character.ToolTestHero.stats.hp.current')}/${get('Character.ToolTestHero.stats.hp.max')}`);
        
        console.log('2. Testing XP addition (stats.level.xp)...');
        const xpResult = toolProcessors.add_levelxp('ToolTestHero', 250);
        console.log(`  - add_levelxp result: ${xpResult}`);
        console.log(`  - XP after: ${get('Character.ToolTestHero.stats.level.xp.current')}/${get('Character.ToolTestHero.stats.level.xp.max')}`);
        
        console.log('3. Testing inventory (component)...');
        const addItemResult = toolProcessors.add_item('ToolTestHero', 'test_sword', 1);
        console.log(`  - add_item result: ${addItemResult}`);
        const inventory = get('Character.ToolTestHero.inventory');
        console.log(`  - Inventory: ${JSON.stringify(inventory)}`);
        
        console.log('4. Testing location update (info.location)...');
        const locResult = toolProcessors.update_location('ToolTestHero', 'Test_Dungeon');
        console.log(`  - update_location result: ${locResult}`);
        console.log(`  - Location: ${get('Character.ToolTestHero.info.location')}`);
        
        console.log('5. Testing attribute update...');
        const attrResult = toolProcessors.update_attribute('ToolTestHero', 'strength', 15);
        console.log(`  - update_attribute result: ${attrResult}`);
        const attributes = get('Character.ToolTestHero.attributes');
        console.log(`  - Attributes: ${JSON.stringify(attributes)}`);
        
        console.log(`${MODULE_NAME}: Component tools test complete!`);
        return true;
    };
    GameState.testComponentSystem = function() {
        console.log(`${MODULE_NAME}: Starting component system test...`);
        
        // 1. Create a new character with components
        console.log('1. Creating character with components...');
        const testChar = createCharacter({
            name: 'TestHero',
            isPlayer: false
        });
        
        if (!testChar) {
            console.log('ERROR: Failed to create character');
            return false;
        }
        
        // 2. Verify components were initialized
        console.log('2. Verifying components...');
        if (!testChar.stats || !testChar.info) {
            console.log('ERROR: Required components missing');
            return false;
        }
        
        console.log(`  - stats.level: ${testChar.stats.level}`);
        console.log(`  - stats.hp: ${JSON.stringify(testChar.stats.hp)}`);
        console.log(`  - info.location: ${testChar.info.location}`);
        
        // 3. Modify using component paths
        console.log('3. Modifying via component paths...');
        set('Character.TestHero.stats.level', 5);
        set('Character.TestHero.info.location', 'Test_Town');
        set('Character.TestHero.stats.hp.current', 150);
        
        // 4. Load and verify changes
        console.log('4. Loading and verifying changes...');
        const loaded = load('Character', 'TestHero');
        
        if (!loaded) {
            console.log('ERROR: Failed to load character');
            return false;
        }
        
        console.log(`  - Loaded level: ${get('Character.TestHero.stats.level')}`);
        console.log(`  - Loaded location: ${get('Character.TestHero.info.location')}`);
        console.log(`  - Loaded HP: ${get('Character.TestHero.stats.hp.current')}`);
        
        // 5. Component check (validation removed)
        console.log('5. Component check...');
        console.log('  - Has stats: ' + !!loaded.stats);
        console.log('  - Has info: ' + !!loaded.info);
        console.log('  - Has inventory: ' + !!loaded.inventory);
        console.log('  - Has skills: ' + !!loaded.skills);
        
        // Migration test removed - no longer needed
        
        console.log(`${MODULE_NAME}: Component system test complete!`);
        return true;
    };
    
    // Test dynamic resolution with components
    GameState.testDynamicResolution = function() {
        console.log(`${MODULE_NAME}: Testing dynamic resolution with components...`);
        
        // 1. Test basic component path access
        console.log('1. Testing basic component paths:');
        const hero = load('Character', 'TestHero');
        if (hero) {
            console.log(`  - Direct: hero.stats.level = ${hero.stats?.level}`);
            console.log(`  - get('Character.TestHero.stats.level') = ${get('Character.TestHero.stats.level')}`);
            console.log(`  - get('Character.TestHero.stats.hp.current') = ${get('Character.TestHero.stats.hp.current')}`);
            console.log(`  - get('Character.TestHero.info.location') = ${get('Character.TestHero.info.location')}`);
        }
        
        // 2. Test dynamic resolution
        console.log('2. Testing dynamic resolution:');
        set('Global.currentPlayer', 'TestHero');
        console.log(`  - Set Global.currentPlayer = 'TestHero'`);
        console.log(`  - get('Character.$(Global.currentPlayer).stats.level') = ${get('Character.$(Global.currentPlayer).stats.level')}`);
        console.log(`  - get('Character.$(Global.currentPlayer).stats.hp.current') = ${get('Character.$(Global.currentPlayer).stats.hp.current')}`);
        
        // 3. Test nested dynamic resolution
        console.log('3. Testing nested dynamic resolution:');
        const playerLocation = get('Character.$(Global.currentPlayer).info.location');
        console.log(`  - Player location: ${playerLocation}`);
        
        // Create a test location if needed
        const testLoc = {
            name: 'Test_Town',
            type: 'town',
            description: 'A test location'
        };
        save('Location', testLoc);
        
        console.log(`  - get('Location.$(Character.$(Global.currentPlayer).info.location).type') = ${get('Location.$(Character.$(Global.currentPlayer).info.location).type')}`);
        
        // 4. Test setting component values via paths
        console.log('4. Testing set() with component paths:');
        set('Character.TestHero.stats.level', 10);
        set('Character.TestHero.stats.hp.current', 200);
        set('Character.TestHero.info.location', 'New_Location');
        
        console.log(`  - After set, level = ${get('Character.TestHero.stats.level')}`);
        console.log(`  - After set, HP = ${get('Character.TestHero.stats.hp.current')}`);
        console.log(`  - After set, location = ${get('Character.TestHero.info.location')}`);
        
        console.log(`${MODULE_NAME}: Dynamic resolution test complete!`);
        return true;
    };
    
    // Test runtime variable functions
    GameState.testRuntimeVariables = function() {
        console.log(`${MODULE_NAME}: Testing runtime variable functions with components...`);
        
        // Create test character if needed
        const testChar = createCharacter({
            name: 'RuntimeTestHero',
            isPlayer: false
        });
        
        if (testChar) {
            // Set some component values
            set('Character.RuntimeTestHero.stats.level', 7);
            set('Character.RuntimeTestHero.stats.hp.current', 140);
            set('Character.RuntimeTestHero.stats.hp.max', 200);
            set('Character.RuntimeTestHero.info.location', 'Test_Village');
            set('Character.RuntimeTestHero.attributes.strength', 18);
            set('Character.RuntimeTestHero.skills.swordsmanship', { level: 5, xp: { current: 250, max: 400 } });
        }
        
        console.log('1. Testing function-style getters:');
        console.log(`  - getCharacterHP('RuntimeTestHero') = ${getCharacterHP('RuntimeTestHero')}`);
        console.log(`  - getCharacterLevel('RuntimeTestHero') = ${getCharacterLevel('RuntimeTestHero')}`);
        console.log(`  - getCharacterLocation('RuntimeTestHero') = ${getCharacterLocation('RuntimeTestHero')}`);
        console.log(`  - getCharacterAttribute('RuntimeTestHero', 'strength') = ${getCharacterAttribute('RuntimeTestHero', 'strength')}`);
        console.log(`  - getCharacterSkill('RuntimeTestHero', 'swordsmanship') = ${getCharacterSkill('RuntimeTestHero', 'swordsmanship')}`);
        
        console.log('2. Testing processGetters with both styles:');
        const testText = '\n' +
            'Current Status:\n' +
            '- HP: get_hp(RuntimeTestHero)\n' +
            '- Level: get_level(RuntimeTestHero)\n' +
            '- Location: get_location(RuntimeTestHero)\n' +
            '- Using new syntax: get[Character.RuntimeTestHero.stats.hp.current]\n' +
            '- Mixed: HP is get_hp(RuntimeTestHero) and level is get[Character.RuntimeTestHero.stats.level]\n' +
            '        ';
        
        const processed = processGetters(testText);
        console.log('Processed text:', processed);
        
        console.log('3. Testing with dynamic resolution:');
        set('Global.testHero', 'RuntimeTestHero');
        const dynamicText = '\n' +
            'Hero: get[Global.testHero]\n' +
            'Hero HP: get[Character.$(Global.testHero).stats.hp.current]/get[Character.$(Global.testHero).stats.hp.max]\n' +
            'Hero Location: get[Character.$(Global.testHero).info.location]\n' +
            '        ';
        
        const dynamicProcessed = processGetters(dynamicText);
        console.log('Dynamic processed:', dynamicProcessed);
        
        console.log(`${MODULE_NAME}: Runtime variables test complete!`);
        return true;
    };
    
    // test of universal get/set system
    GameState.testUniversalSystem = function() {
        console.log(`${MODULE_NAME}: Testing universal get/set system comprehensively...`);
        
        // 1. Test basic get/set
        console.log('1. Testing basic get/set:');
        set('Global.testValue', 42);
        console.log(`  - set('Global.testValue', 42) -> get = ${get('Global.testValue')}`);
        
        // 2. Test nested object creation
        console.log('2. Testing nested object creation:');
        set('Global.nested.deep.value', 'deep value');
        console.log(`  - set('Global.nested.deep.value', 'deep value') -> get = ${get('Global.nested.deep.value')}`);
        
        // 3. Test entity loading and modification
        console.log('3. Testing entity operations:');
        const testChar = createCharacter({ name: 'UniversalTestHero' });
        if (testChar) {
            set('Character.UniversalTestHero.stats.level', 99);
            set('Character.UniversalTestHero.stats.hp.current', 9999);
            set('Character.UniversalTestHero.info.location', 'Test_Zone');
            console.log(`  - Level: ${get('Character.UniversalTestHero.stats.level')}`);
            console.log(`  - HP: ${get('Character.UniversalTestHero.stats.hp.current')}`);
            console.log(`  - Location: ${get('Character.UniversalTestHero.info.location')}`);
        }
        
        // 4. Test dynamic resolution
        console.log('4. Testing dynamic resolution:');
        set('Global.targetChar', 'UniversalTestHero');
        set('Global.targetField', 'stats.level');
        console.log(`  - Single $(): ${get('Character.$(Global.targetChar).stats.level')}`);
        console.log(`  - Nested $(): ${get('Character.$(Global.targetChar).$(Global.targetField)')}`);
        
        // 5. Test error cases
        console.log('5. Testing error handling:');
        console.log(`  - Invalid path 'NoType': ${get('NoType')}`);
        console.log(`  - Missing entity: ${get('Character.DoesNotExist.level')}`);
        console.log(`  - Missing field: ${get('Character.UniversalTestHero.nonexistent.field')}`);
        
        // 6. Test array notation
        console.log('6. Testing array notation:');
        set('Global.testArray[0]', 'first');
        set('Global.testArray[1]', 'second');
        set('Global.nested.array[0].name', 'item1');
        console.log(`  - Array[0]: ${get('Global.testArray[0]')}`);
        console.log(`  - Array[1]: ${get('Global.testArray[1]')}`);
        console.log(`  - Nested array: ${get('Global.nested.array[0].name')}`);
        
        // 7. Test cache behavior
        console.log('7. Testing cache:');
        const before = get('Character.UniversalTestHero.stats.level');
        set('Character.UniversalTestHero.stats.level', 100);
        const after = get('Character.UniversalTestHero.stats.level');
        console.log(`  - Before: ${before}, After: ${after}, Cache updated: ${after === '100'}`);
        
        // 8. Test component paths with missing components
        console.log('8. Testing missing component paths:');
        const noComponents = { name: 'FlatHero', level: 5, hp: 100 };
        save('Character', noComponents);
        console.log(`  - Flat hero level: ${get('Character.FlatHero.level')}`);
        console.log(`  - Flat hero stats.level (missing): ${get('Character.FlatHero.stats.level')}`);
        
        // 9. Test Global special handling
        console.log('9. Testing Global special handling:');
        set('Global.complex', { a: 1, b: { c: 2 } });
        console.log(`  - Complex global: ${JSON.stringify(get('Global.complex'))}`);
        set('Global.complex.b.c', 3);
        console.log(`  - After nested set: ${get('Global.complex.b.c')}`);
        
        // 10. Test resolution edge cases
        console.log('10. Testing resolution edge cases:');
        set('Global.circular', 'Global.circular');
        console.log(`  - Circular reference: ${get('$(Global.circular)')}`);
        set('Global.undefined', undefined);
        console.log(`  - Undefined value: ${get('Global.undefined')}`);
        set('Global.null', null);
        console.log(`  - Null value: ${get('Global.null')}`);
        
        console.log(`${MODULE_NAME}: Universal system test complete!`);
        return true;
    };
    
    // Master test 
    GameState.runAllTests = function() {
        console.log('\n' + '='.repeat(60));
        console.log('SANE COMPREHENSIVE TEST SUITE');
        console.log('='.repeat(60) + '\n');
        
        const tests = [
            { name: 'Component System', fn: GameState.testComponentSystem },
            { name: 'Component Tools', fn: GameState.testComponentTools },
            { name: 'Dynamic Resolution', fn: GameState.testDynamicResolution },
            { name: 'Runtime Variables', fn: GameState.testRuntimeVariables },
            { name: 'Universal System', fn: GameState.testUniversalSystem },
            { name: 'Tool Processing', fn: testToolProcessing },
            { name: 'Entity Validation', fn: testEntityValidation },
            { name: 'Template Processing', fn: testTemplateProcessing }
        ];
        
        let passed = 0;
        let failed = 0;
        
        for (const test of tests) {
            console.log(`\n${'*'.repeat(40)}`);
            console.log(`Running: ${test.name}`);
            console.log('*'.repeat(40));
            
            try {
                const result = test.fn();
                if (result) {
                    console.log(`✓ ${test.name} PASSED`);
                    passed++;
                } else {
                    console.log(`✗ ${test.name} FAILED`);
                    failed++;
                }
            } catch (e) {
                console.log(`✗ ${test.name} ERRORED: ${e.message}`);
                console.log(e.stack);
                failed++;
            }
        }
        
        console.log('\n' + '='.repeat(60));
        console.log(`TEST RESULTS: ${passed} passed, ${failed} failed`);
        console.log('='.repeat(60));
        
        return failed === 0;
    };
    
    // Test tool processing
    function testToolProcessing() {
        console.log(`${MODULE_NAME}: Testing tool processing...`);
        
        // Create test character
        const testChar = createCharacter({ 
            name: 'ToolTestChar',
            isPlayer: false
        });
        
        if (testChar) {
            // Initialize with component values
            set('Character.ToolTestChar.stats.level', 1);
            set('Character.ToolTestChar.stats.hp.current', 100);
            set('Character.ToolTestChar.stats.hp.max', 100);
            set('Character.ToolTestChar.inventory.sword', { quantity: 1 });
        }
        
        // 1. Test damage tool
        console.log('1. Testing deal_damage:');
        const damageResult = processTool('deal_damage', ['Monster', 'ToolTestChar', '30']);
        console.log(`  - Result: ${damageResult}`);
        const afterDamage = get('Character.ToolTestChar.stats.hp.current');
        console.log(`  - HP after damage: ${afterDamage}`);
        
        // 2. Test healing
        console.log('2. Testing heal:');
        const healResult = processTool('heal', ['ToolTestChar', '20']);
        console.log(`  - Result: ${healResult}`);
        const afterHeal = get('Character.ToolTestChar.stats.hp.current');
        console.log(`  - HP after heal: ${afterHeal}`);
        
        // 3. Test item management
        console.log('3. Testing add_item:');
        const addResult = processTool('add_item', ['ToolTestChar', 'potion', '5']);
        console.log(`  - Result: ${addResult}`);
        const potions = get('Character.ToolTestChar.inventory.potion');
        console.log(`  - Potions: ${potions?.quantity || potions}`);
        
        // 4. Test XP addition
        console.log('4. Testing add_levelxp:');
        set('Character.ToolTestChar.stats.level.xp', { current: 0, max: 500 });
        const xpResult = processTool('add_levelxp', ['ToolTestChar', '250']);
        console.log(`  - Result: ${xpResult}`);
        const xp = get('Character.ToolTestChar.stats.level.xp.current');
        console.log(`  - XP: ${xp}`);
        
        console.log(`${MODULE_NAME}: Tool processing test complete!`);
        return true;
    }
    
    // Test entity validation
    function testEntityValidation() {
        console.log(`${MODULE_NAME}: Testing entity validation...`);
        
        // 1. Test valid entity
        console.log('1. Testing valid entity:');
        const validEntity = {
            name: 'ValidHero',
            stats: { 
                level: {
                    value: 5,
                    xp: { current: 2000, max: 2500 }
                },
                hp: { current: 100, max: 100 } 
            },
            info: { location: 'Town' }
        };
        const validResult = validateEntityComponents('Character', validEntity);
        console.log(`  - Valid: ${validResult.valid}`);
        console.log(`  - Errors: ${validResult.errors?.length || 0}`);
        
        // 2. Test missing required component
        console.log('2. Testing missing required component:');
        const missingEntity = {
            name: 'IncompleteHero',
            stats: { 
                level: {
                    value: 1,
                    xp: { current: 0, max: 500 }
                }
            }
            // Missing info component
        };
        const missingResult = validateEntityComponents('Character', missingEntity);
        console.log(`  - Valid: ${missingResult.valid}`);
        console.log(`  - Errors: ${missingResult.errors?.join(', ')}`);
        
        // 3. Test component initialization
        console.log('3. Testing component initialization:');
        const newEntity = initializeEntityComponents('Character', { name: 'NewHero' });
        console.log(`  - Has stats: ${!!newEntity.stats}`);
        console.log(`  - Has info: ${!!newEntity.info}`);
        console.log(`  - Stats.level.value: ${newEntity.stats?.level?.value}`);
        console.log(`  - Info.location: ${newEntity.info?.location}`);
        
        console.log(`${MODULE_NAME}: Entity validation test complete!`);
        return true;
    }
    
    // Test template processing
    function testTemplateProcessing() {
        console.log(`${MODULE_NAME}: Testing template processing...`);
        
        // Create test data
        const testData = {
            name: 'Template Hero',
            stats: {
                level: {
                    value: 10,
                    xp: { current: 4500, max: 5000 }
                },
                hp: { current: 150, max: 200 }
            },
            skills: {
                sword: { level: 5, unlocked: true },
                magic: { level: 3, unlocked: true },
                stealth: { level: 1, unlocked: false }
            },
            isPlayer: false
        };
        
        // 1. Test simple replacements
        console.log('1. Testing simple replacements:');
        let template = 'Name: {name}, Level: {stats.level}';
        let result = processTemplateLine(template, testData);
        console.log(`  - Result: ${result}`);
        
        // 2. Test conditionals
        console.log('2. Testing conditionals:');
        template = '{info.isPlayer?Player Character:NPC Character}';
        result = processTemplateLine(template, testData);
        console.log(`  - Result: ${result}`);
        
        // 3. Test loops
        console.log('3. Testing loops:');
        template = 'Skills: {skills.*:{*.unlocked?{*} (Level {*.level})}}';
        result = processTemplateLine(template, testData);
        console.log(`  - Result: ${result}`);
        
        // 4. Test entity references
        console.log('4. Testing entity references:');
        // Save test character for reference
        save('Character', testData);
        set('Global.currentHero', 'Template Hero');
        
        template = 'Hero Level: {Character.Template Hero.stats.level}';
        result = processTemplateLine(template, {});
        console.log(`  - Direct reference: ${result}`);
        
        template = 'Current Hero Level: {Character.{Global.currentHero}.stats.level}';
        result = processTemplateLine(template, { Global: { currentHero: 'Template Hero' } });
        console.log(`  - Dynamic reference: ${result}`);
        
        console.log(`${MODULE_NAME}: Template processing test complete!`);
        return true;
    }
    
    // Test schema registry
    GameState.testSchemaRegistry = function() {
        console.log(`${MODULE_NAME}: Testing schema registry...`);
        
        // Initialize if needed
        if (!schemaRegistry) schemaRegistry = initializeSchemaRegistry();
        
        console.log('1. Registered entity types:');
        for (const [type, schema] of Object.entries(schemaRegistry)) {
            if (!type.startsWith('_')) {
                console.log(`  - ${type}: ${schema.prefixes?.join(', ')}`);
            }
        }
        
        console.log('2. Component schemas:');
        const components = schemaRegistry._components || {};
        for (const [name, schema] of Object.entries(components)) {
            console.log(`  - ${name}: ${schema.component_of}`);
        }
        
        console.log('3. Schema aliases:');
        const aliases = schemaAliasMap || {};
        console.log(`  - Total aliases: ${Object.keys(aliases).length}`);
        
        console.log(`${MODULE_NAME}: Schema registry test complete!`);
        return true;
    };
    

    switch(hook) {
        case 'input':
            // Initialize debug logging for this turn
            if (debug) initDebugLogging();
            
            
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
                logTime();
                const result = commandResults.join('\n');
                // Calculate hash of the result
                currentHash = RewindSystem.quickHash(result);
                logTime();
                return result;
            }
            
            // If GenerationWizard is active, delegate to it
            if (typeof GenerationWizard !== 'undefined' && GenerationWizard.isActive()) {
                const result = GenerationWizard.process('input', text);
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
            
        case 'context':
            // Initialize debug logging for this turn
            if (debug) initDebugLogging();
            
            // Store original context for logging
            const originalContext = text;
            
            // Store context length for debug output
            if (!state.lastContextLength) {
                state.lastContextLength = 0;
            }
            state.lastContextLength = text ? text.length : 0;
            
            // Cache cards are no longer needed with the universal data system
            // All data is loaded on-demand through load()/loadAll() functions
            
            // Check for edits in history (RewindSystem)
            RewindSystem.handleContext();
            
            // Load context modifier
            loadContextModifier();
            
            // Remove any hidden message markers from previous turns (including surrounding newlines)
            let modifiedText = text.replace(/\n*<<<[^>]*>>>\n*/g, '');
            
            // Move current scene card if it exists (before getters)
            modifiedText = moveCurrentSceneCard(modifiedText);
            
            // Process all getters in the entire context (if getters exist)
            let gettersReplaced = {};
            // Check both universal object getters and function getters
            const hasUniversalGetters = UNIVERSAL_GETTER_PATTERN.test(modifiedText);
            const hasFunctionGetters = FUNCTION_GETTER_PATTERN.test(modifiedText);
            
            if (hasUniversalGetters || hasFunctionGetters) {
                // Track which getters are being replaced (count only, not every instance)
                const universalMatches = hasUniversalGetters ? modifiedText.match(UNIVERSAL_GETTER_PATTERN) : [];
                const functionMatches = hasFunctionGetters ? modifiedText.match(FUNCTION_GETTER_PATTERN) : [];
                const getterMatches = [...(universalMatches || []), ...(functionMatches || [])];
                
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
                        const allChars = loadAll('Character');
                        for (const [name, char] of Object.entries(allChars || {})) {
                            entityCache[`Character.${name}`] = char;
                        }
                    }
                }
                modifiedText = processGetters(modifiedText);
            }
            
            // Build trigger name to username mapping and replace in tool usages
            const triggerNameMap = {};
            const allCharacters = loadAll('Character');
            
            // Get current action count for cleanup check
            const currentTurn = info?.actionCount || 0;
            
            // Build the mapping from character data (info.trigger_name)
            for (const [charName, character] of Object.entries(allCharacters || {})) {
                if (character.info?.trigger_name) {
                    const triggerName = character.info.trigger_name;
                    const username = character.name.toLowerCase();
                    
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
                            
                            // When saving, the keys will be regenerated without the trigger_name
                            // since it's no longer in character.info.trigger_name
                            save('Character', character);
                            
                            // Also need to update the card's keys directly since save() might not regenerate them
                            const cardTitle = `[CHARACTER] ${character.name}`;
                            const card = Utilities.storyCard.get(cardTitle);
                            if (card) {
                                // Regenerate keys without trigger name
                                const newKeys = ` ${character.name.toLowerCase()},(${character.name.toLowerCase()}`;
                                Utilities.storyCard.update(cardTitle, { keys: newKeys });
                            }
                            
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
            
            // Check if GenerationWizard needs to append prompts
            if (typeof GenerationWizard !== 'undefined') {
                const isActive = GenerationWizard.isActive();
                if (debug) console.log(`${MODULE_NAME}: GenerationWizard active check: ${isActive}`);
                
                if (isActive) {
                    const result = GenerationWizard.process('context', modifiedText);
                    if (debug) console.log(`${MODULE_NAME}: GenerationWizard.process result: active=${result.active}, text length before=${modifiedText.length}, after=${result.text ? result.text.length : 'null'}`);
                    if (result.active) {
                        modifiedText = result.text;  // Use wizard's modified context (with prompts appended)
                    }
                }
            } else {
                if (debug) console.log(`${MODULE_NAME}: GenerationWizard not available`);
            }
            
            // Apply CONTEXT_MODIFIER if available
            if (contextModifier) {
                try {
                    // Create context for the modifier
                    const context = {
                        getGlobalValue: getGlobalValue,
                        setGlobalValue: setGlobalValue,
                        loadCharacter: function(name) {
                            const chars = loadAll('Character');
                            return chars[name.toLowerCase()];
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
            
        case 'output':
            // Initialize debug logging for this turn
            if (debug) initDebugLogging();
            
            // Store original output for logging
            const originalOutput = text;
            
            
            // Load output modifier
            loadOutputModifier();
            
            // Check if GenerationWizard is processing
            if (typeof GenerationWizard !== 'undefined' && GenerationWizard.isActive()) {
                const result = GenerationWizard.process('output', text);
                if (result.active) {
                    // Log early return
                    logDebugTurn('output', null, null, {
                        generationWizardActive: true
                    });
                    return result.text;  // Return wizard's output (hidden message)
                }
            }

            // Process tools in LLM's output
            if (text) {
                // Check if there are any tool patterns first
                const hasToolPatterns = TOOL_PATTERN.test(text);
                TOOL_PATTERN.lastIndex = 0; // Reset regex state
                
                if (hasToolPatterns) {
                    loadRuntimeTools();
                }
                
                const result = processTools(text);
                let modifiedText = result.modifiedText;
                const executedTools = result.executedTools || [];
                
                // Calculate hash AFTER tool removal so it matches what gets stored
                currentHash = RewindSystem.quickHash(modifiedText);
                
                // Position should be current history.length
                const futurePosition = history ? Math.min(history.length, RewindSystem.MAX_HISTORY - 1) : 0;
                RewindSystem.recordAction(text, executedTools, futurePosition);
                
                // Check if any entities need generation
                const entityQueued = queuePendingEntities();
                
                // Check if GenerationWizard was triggered by any tool or entity generation
                if (typeof GenerationWizard !== 'undefined' && GenerationWizard.isActive()) {
                    // Add warning that GM will take control next turn
                    modifiedText += '\n\n<<<The GM will use the next turn to think. Use `/GW abort` if undesired.>>>';
                    if (debug) console.log(`${MODULE_NAME}: GenerationWizard activated, adding warning to output`);
                } else if (entityQueued) {
                    // Entity generation was triggered
                    modifiedText += '\n\n<<<The GM will generate a new entity next turn. Use `/GW abort` if undesired.>>>';
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
                    entityQueued: entityQueued,
                    generationWizardActive: typeof GenerationWizard !== 'undefined' && GenerationWizard.isActive()
                });
                
                // Clear entity cache after processing
                entityCache = {};
                
                // Pin important cards to top for fast access
                // [PLAYER] cards go at the very top
                if (typeof storyCards !== 'undefined' && storyCards.length > 0) {
                    const playerCards = [];
                    
                    // Extract all special cards in one pass (backwards to avoid index issues)
                    for (let i = storyCards.length - 1; i >= 0; i--) {
                        const card = storyCards[i];
                        if (!card || !card.title) continue;
                        
                        if (card.title.startsWith('[PLAYER]')) {
                            playerCards.unshift(storyCards.splice(i, 1)[0]);
                        }
                        // Cache cards are obsolete - no longer pinned
                    }
                    
                    // Re-insert in optimal order at the top
                    let insertPos = 0;
                    
                    // Insert player cards at the very top
                    if (playerCards.length > 0) {
                        storyCards.splice(insertPos, 0, ...playerCards);
                        if (debug) console.log(`${MODULE_NAME}: Pinned ${playerCards.length} player card(s) to top`);
                    }

                }
                
                logTime();
                return modifiedText;
            }
            break;
    }
    
    // Log execution time before returning
    logTime();
    return GameState;
}
