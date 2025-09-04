function GameState(hook, text) {
    'use strict';
    
    const debug = true;
    const MODULE_NAME = 'GameState';
    
    // Entity generation tracking 
    let currentEntityGeneration = null;
    
    // Tool pattern: standard function calls like tool_name(param1, param2, param3)
    const TOOL_PATTERN = /([a-z_]+)\s*\(([^)]*)\)/gi;
    
    // Getter pattern: get_something(parameters)
    const GETTER_PATTERN = /get_[a-z_]+\s*\([^)]*\)/gi;
    
    // ==========================
    // Location Helper Functions
    // ==========================
    function getOppositeDirection(direction) {
        const opposites = {
            'north': 'South',
            'south': 'North',
            'east': 'West',
            'west': 'East',
            'inside': 'Outside',
            'outside': 'Inside'
        };
        return opposites[direction.toLowerCase()] || direction;
    }
    
    function updateLocationPathway(locationName, direction, destinationName) {
        const card = Utilities.storyCard.get(`[LOCATION] ${locationName}`);
        if (!card) {
            if (debug) console.log(`${MODULE_NAME}: Location card not found: ${locationName}`);
            return;
        }
        
        // Parse current entry
        let entry = card.entry || '';
        
        // Find and update the pathway line
        const dirCapitalized = direction.charAt(0).toUpperCase() + direction.slice(1).toLowerCase();
        const pathwayRegex = new RegExp(`^- ${dirCapitalized}: .*$`, 'm');
        
        if (entry.match(pathwayRegex)) {
            entry = entry.replace(pathwayRegex, `- ${dirCapitalized}: ${destinationName}`);
        } else {
            // TODO: Add pathway if it doesn't exist in the expected format
            if (debug) console.log(`${MODULE_NAME}: Could not find pathway line for ${dirCapitalized}`);
        }
        
        Utilities.storyCard.update(card.title, { entry: entry });
        
        if (debug) console.log(`${MODULE_NAME}: Updated ${locationName} pathway ${direction} to ${destinationName}`);
    }
    
    // ==========================
    // Runtime Variables System
    // ==========================
    let runtimeVariablesCache = null;
    
    function loadRuntimeVariables() {
        if (runtimeVariablesCache !== null) return runtimeVariablesCache;
        
        // Use centralized config with custom parser
        runtimeVariablesCache = Utilities.config.load(
            '[RPG_RUNTIME] Variables',
            parseRuntimeVariables,
            createSampleRuntimeCards,
            false  // Don't cache in Utilities (we cache locally)
        ) || {};
        
        if (debug) console.log(`${MODULE_NAME}: Loaded ${Object.keys(runtimeVariablesCache).length} runtime variables`);
        return runtimeVariablesCache;
    }
    
    function parseRuntimeVariables(fullText) {
        const variables = {};
        const lines = fullText.split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            // Skip comments and empty lines
            if (!trimmed || trimmed.startsWith('//')) continue;
            
            const match = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.+)$/);
            if (match) {
                variables[match[1]] = match[2].trim(); // varName: type
            }
        }
        
        return variables;
    }
    
    function getRuntimeValue(varName) {
        // Ensure cache is loaded
        const variables = loadRuntimeVariables();
        
        // Check if variable is declared
        if (!variables[varName]) {
            if (debug) console.log(`${MODULE_NAME}: Runtime variable ${varName} not declared`);
            return null;
        }
        
        const dataCards = Utilities.storyCard.find(
            card => card.title && card.title.startsWith('[RPG_RUNTIME] DATA'),
            true
        );
        
        if (!dataCards || dataCards.length === 0) return null;
        
        // More flexible regex that handles multiline values
        const regex = new RegExp(`^# ${varName}\\s*\\n([^#]*?)(?=\\n# |\\n//|$)`, 'ms');
        
        for (const card of dataCards) {
            // Check both entry and description
            const fullText = (card.entry || '') + '\n' + (card.description || '');
            const match = fullText.match(regex);
            
            if (match) {
                // Filter out comment lines from the value
                const valueLines = match[1].trim().split('\n')
                    .filter(line => !line.trim().startsWith('//'))
                    .join('\n')
                    .trim();
                
                if (debug) console.log(`${MODULE_NAME}: Got runtime value ${varName} = ${valueLines}`);
                return parseRuntimeValue(valueLines, variables[varName]);
            }
        }
        
        if (debug) console.log(`${MODULE_NAME}: Runtime value ${varName} not found`);
        return null;
    }
    
    function setRuntimeValue(varName, value) {
        const variables = loadRuntimeVariables();
        
        // Fail if variable not declared
        if (!variables[varName]) {
            if (debug) console.log(`${MODULE_NAME}: Undefined runtime variable: ${varName}`);
            return false;
        }
        
        const dataCards = Utilities.storyCard.find(
            card => card.title && card.title.startsWith('[RPG_RUNTIME] DATA'),
            true
        );
        
        if (!dataCards || dataCards.length === 0) {
            if (debug) console.log(`${MODULE_NAME}: No DATA cards found`);
            return false;
        }
        
        // More robust regex that captures the entire value section
        const regex = new RegExp(`(# ${varName}\\s*\\n)([^#]*?)(?=\\n# |\\n//|$)`, 'ms');
        const newValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        
        // Try to update existing value
        for (const card of dataCards) {
            let updated = false;
            
            // Check entry first
            if (card.entry && card.entry.includes(`# ${varName}`)) {
                const newEntry = card.entry.replace(regex, `$1${newValue}\n`);
                
                if (newEntry !== card.entry) {
                    Utilities.storyCard.update(card.title, {entry: newEntry});
                    updated = true;
                    if (debug) console.log(`${MODULE_NAME}: Updated ${varName} to ${newValue} in ${card.title} entry`);
                } else {
                    if (debug) console.log(`${MODULE_NAME}: Failed to replace ${varName} in entry`);
                }
            }
            
            // Check description
            if (!updated && card.description && card.description.includes(`# ${varName}`)) {
                const newDesc = card.description.replace(regex, `$1${newValue}\n`);
                
                if (newDesc !== card.description) {
                    Utilities.storyCard.update(card.title, {description: newDesc});
                    updated = true;
                    if (debug) console.log(`${MODULE_NAME}: Updated ${varName} to ${newValue} in ${card.title} description`);
                } else {
                    if (debug) console.log(`${MODULE_NAME}: Failed to replace ${varName} in description`);
                }
            }
            
            if (updated) {
                // Clear the cache to force reload on next access
                runtimeVariablesCache = null;
                return true;
            }
        }
        
        if (debug) console.log(`${MODULE_NAME}: Runtime variable ${varName} not found in any DATA card`);
        return false;
    }
    
    function parseRuntimeValue(valueStr, type) {
        try {
            if (type === 'integer') return parseInt(valueStr);
            if (type === 'float') return parseFloat(valueStr);
            if (type === 'boolean') return valueStr === 'true';
            if (type === 'array' || type === 'object') return Utilities.parsing.parseJSON(valueStr, valueStr);
            return valueStr; // string or unknown type
        } catch(e) {
            if (debug) console.log(`${MODULE_NAME}: Error parsing runtime value: ${e}`);
            return valueStr;
        }
    }
    
    function initializeRuntimeVariables() {
        const variables = loadRuntimeVariables();
        if (Object.keys(variables).length === 0) return;
        
        // Get all DATA cards
        const dataCards = Utilities.storyCard.find(
            card => card.title && card.title.startsWith('[RPG_RUNTIME] DATA'),
            true
        ) || [];
        
        // Check which variables exist (in both entry and description)
        const existingVars = new Set();
        const regex = /^# ([a-zA-Z_][a-zA-Z0-9_]*)\s*$/gm;
        
        for (const card of dataCards) {
            const fullText = (card.entry || '') + '\n' + (card.description || '');
            const matches = [...(fullText.matchAll(regex) || [])];
            matches.forEach(m => existingVars.add(m[1]));
        }
        
        // Initialize missing variables
        const missingVars = [];
        for (const [varName, type] of Object.entries(variables)) {
            if (!existingVars.has(varName)) {
                missingVars.push({name: varName, type: type});
            }
        }
        
        if (missingVars.length === 0) return;
        
        // Find or create DATA 1 card
        let dataCard = Utilities.storyCard.get('[RPG_RUNTIME] DATA 1');
        if (!dataCard) {
            dataCard = Utilities.storyCard.add({
                title: '[RPG_RUNTIME] DATA 1',
                entry: '',
                type: 'data',
                description: '// Runtime variable storage\n// Format: # variableName\nvalue'
            });
        }
        
        // Add missing variables with default values
        let newEntries = [];
        for (const {name, type} of missingVars) {
            let defaultValue = '';
            switch(type) {
                case 'integer': defaultValue = '0'; break;
                case 'float': defaultValue = '0.0'; break;
                case 'boolean': defaultValue = 'false'; break;
                case 'array': defaultValue = '[]'; break;
                case 'object': defaultValue = '{}'; break;
                default: defaultValue = '""'; break;
            }
            newEntries.push(`# ${name}\n${defaultValue}`);
        }
        
        // Check space in entry vs description
        const currentEntryLength = dataCard.entry.length;
        const currentDescLength = dataCard.description.length;
        
        // Use entry first until ~1500 chars, then use description up to 10000
        if (currentEntryLength < 1500) {
            const updatedEntry = dataCard.entry + (dataCard.entry ? '\n\n' : '') + newEntries.join('\n\n');
            Utilities.storyCard.update('[RPG_RUNTIME] DATA 1', {entry: updatedEntry});
        } else if (currentDescLength < 10000) {
            const updatedDesc = dataCard.description + '\n\n' + newEntries.join('\n\n');
            Utilities.storyCard.update('[RPG_RUNTIME] DATA 1', {description: updatedDesc});
        } else {
            // Both entry and description are full, need DATA 2
            // TODO: Auto-create DATA 2 card and add variables there
            if (debug) console.log(`${MODULE_NAME}: DATA 1 card is full, need to implement DATA 2 creation`);
        }
        
        if (debug) console.log(`${MODULE_NAME}: Initialized ${missingVars.length} runtime variables`);
    }
    
    function loadRuntimeTools() {
        // Load all TOOLS cards (TOOLS, TOOLS 2, TOOLS 3, etc.)
        const toolsCards = [];
        
        // Check for base TOOLS card (no number)
        const baseCard = Utilities.storyCard.get('[RPG_RUNTIME] TOOLS');
        if (baseCard) toolsCards.push(baseCard);
        
        // Check for additional TOOLS cards (2 through 10)
        for (let i = 2; i <= 10; i++) {
            const numberedCard = Utilities.storyCard.get('[RPG_RUNTIME] TOOLS ' + i);
            if (numberedCard) toolsCards.push(numberedCard);
        }
        
        if (toolsCards.length === 0) {
            if (debug) console.log(`${MODULE_NAME}: No runtime tools cards found`);
            return;
        }
        
        try {
            // Combine all cards' entries and descriptions
            let fullCode = '';
            for (const card of toolsCards) {
                fullCode += (card.entry || '') + '\n' + (card.description || '') + ',\n';
            }
            
            // Remove trailing comma and wrap in object literal
            fullCode = fullCode.replace(/,\s*$/, '');
            const code = `({${fullCode}})`;
            const customTools = eval(code);
            
            // Wrap each tool in try/catch with proper context binding
            for (const [name, func] of Object.entries(customTools)) {
                if (typeof func !== 'function') continue;
                
                // Create closure to capture the functions
                (function(toolName, toolFunc) {
                    toolProcessors[toolName] = function(...args) {
                        try {
                            // Create context object with all helper functions
                            const context = {
                                getRuntimeValue: getRuntimeValue,
                                setRuntimeValue: setRuntimeValue,
                                loadAllCharacters: loadAllCharacters,
                                loadCharacter: function(name) {
                                    const chars = loadAllCharacters();
                                    return chars[name.toLowerCase()];
                                },
                                saveCharacter: saveCharacter,
                                // Field accessor methods
                                getField: function(characterName, fieldPath) {
                                    const character = this.loadCharacter(characterName);
                                    if (!character) return null;
                                    return getCharacterField(character, fieldPath);
                                },
                                setField: function(characterName, fieldPath, value) {
                                    const character = this.loadCharacter(characterName);
                                    if (!character) return false;
                                    
                                    setCharacterField(character, fieldPath, value);
                                    return this.saveCharacter(character);
                                },
                                modifyField: function(characterName, fieldPath, delta) {
                                    const current = this.getField(characterName, fieldPath);
                                    if (current === null || typeof current !== 'number') return false;
                                    
                                    return this.setField(characterName, fieldPath, current + delta);
                                },
                                getFields: function(characterName, fieldPaths) {
                                    const character = this.loadCharacter(characterName);
                                    if (!character) return {};
                                    
                                    const result = {};
                                    for (const path of fieldPaths) {
                                        result[path] = getCharacterField(character, path);
                                    }
                                    return result;
                                },
                                Utilities: Utilities,
                                Calendar: typeof Calendar !== 'undefined' ? Calendar : null,
                                debug: debug,
                                MODULE_NAME: MODULE_NAME
                            };
                            
                            if (debug) console.log(`${MODULE_NAME}: Executing runtime tool ${toolName} with args:`, args);
                            
                            // Apply the function with the context
                            const result = toolFunc.apply(context, args);
                            
                            if (debug) console.log(`${MODULE_NAME}: Runtime tool ${toolName} returned: ${result}`);
                            return result;
                        } catch(e) {
                            if (debug) console.log(`${MODULE_NAME}: Error in runtime tool ${toolName}: ${e.toString()}`);
                            if (debug && e.stack) console.log(`${MODULE_NAME}: Stack: ${e.stack}`);
                            return false;
                        }
                    };
                })(name, func);
            }
            
            if (debug) console.log(`${MODULE_NAME}: Loaded ${Object.keys(customTools).length} runtime tools`);
        } catch(e) {
            if (debug) console.log(`${MODULE_NAME}: Failed to load runtime tools: ${e}`);
        }
    }
    
    // ==========================
    // Input Commands System
    // ==========================
    const inputCommands = {};
    
    function loadInputCommands() {
        const commandsCard = Utilities.storyCard.get('[RPG_RUNTIME] INPUT_COMMANDS');
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
                    getRuntimeValue: getRuntimeValue,
                    setRuntimeValue: setRuntimeValue,
                    loadAllCharacters: loadAllCharacters,
                    loadCharacter: function(name) {
                        const chars = loadAllCharacters();
                        return chars[name.toLowerCase()];
                    },
                    saveCharacter: saveCharacter,
                    createCharacter: createCharacter,
                    getField: function(characterName, fieldPath) {
                        const character = this.loadCharacter(characterName);
                        if (!character) return null;
                        return getCharacterField(character, fieldPath);
                    },
                    setField: function(characterName, fieldPath, value) {
                        const character = this.loadCharacter(characterName);
                        if (!character) return false;
                        setCharacterField(character, fieldPath, value);
                        return this.saveCharacter(character);
                    },
                    Utilities: Utilities,
                    Calendar: typeof Calendar !== 'undefined' ? Calendar : null,
                    GenerationWizard: typeof GenerationWizard !== 'undefined' ? GenerationWizard : null,
                    RewindSystem: RewindSystem,  // Add RewindSystem access
                    debug: debug,
                    // Debug-only functions
                    trackUnknownEntity: isDebugCommand ? trackUnknownEntity : undefined,
                    loadEntityTrackerConfig: isDebugCommand ? loadEntityTrackerConfig : undefined,
                    loadRuntimeVariables: isDebugCommand ? loadRuntimeVariables : undefined
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
        const modifierCard = Utilities.storyCard.get('[RPG_RUNTIME] CONTEXT_MODIFIER');
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
    // Input/Output Modifiers (Pure JavaScript Sandboxes)
    // ==========================
    let inputModifier = null;
    let outputModifier = null;
    
    function loadInputModifier() {
        const modifierCard = Utilities.storyCard.get('[RPG_RUNTIME] INPUT_MODIFIER');
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
        const modifierCard = Utilities.storyCard.get('[RPG_RUNTIME] OUTPUT_MODIFIER');
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
                if (debug) console.log(`${MODULE_NAME}: Output modifier is empty (only comments), using pass-through`);
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
            
            // If no position specified, append at end
            if (position === null) {
                position = data.entries.length;
            }
            
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
            
            // Update position
            data.position = position;
            
            // Maintain max history - align with AI Dungeon's behavior
            // When we exceed max, remove oldest entry (index 0)
            while (data.entries.length > RewindSystem.MAX_HISTORY) {
                data.entries.shift();
                // All positions shift down by 1
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
            // TODO: Implement tool-specific reversions
            return {
                'deal_damage': (params) => ['heal', params],
                'heal': (params) => ['deal_damage', params],
                'add_tag': (params) => ['remove_tag', params],
                'remove_tag': (params) => ['add_tag', params],
                'transfer_item': (params) => ['transfer_item', [params[1], params[0], params[2], params[3]]],
                'add_levelxp': (params) => ['add_levelxp', [params[0], -params[1]]],
                'add_skillxp': (params) => ['add_skillxp', [params[0], params[1], -params[2]]],
                'update_relationship': (params) => ['update_relationship', [params[0], params[1], -params[2]]],
                // Non-reversible tools return null
                'offer_quest': () => null,
                'check_threshold': () => null
            };
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
                                if (revertData.previousLocation) {
                                    const result = processToolCall('update_location', [params[0], revertData.previousLocation]);
                                    if (debug) console.log(`${MODULE_NAME}: Reverted location for ${params[0]} to ${revertData.previousLocation}: ${result}`);
                                }
                                break;
                                
                            case 'transfer_item':
                                // Reverse the transfer
                                if (revertData.amount > 0) {
                                    const result = processToolCall('transfer_item', [params[1], params[0], params[2], revertData.amount]);
                                    if (debug) console.log(`${MODULE_NAME}: Reverted item transfer: ${params[2]} x${revertData.amount} from ${params[1]} to ${params[0]}: ${result}`);
                                }
                                break;
                                
                            case 'update_relationship':
                                // Reverse the relationship change by negating it
                                const relationshipChange = parseInt(params[2]) || 0;
                                if (relationshipChange !== 0) {
                                    const result = processToolCall('update_relationship', [params[0], params[1], -relationshipChange]);
                                    if (debug) console.log(`${MODULE_NAME}: Reverted relationship ${params[0]}->${params[1]} by ${-relationshipChange}: ${result}`);
                                }
                                break;
                                
                            case 'unlock_newskill':
                                // Skip reverting skill unlocks
                                break;
                                
                            case 'add_levelxp':
                                // Subtract the XP that was added
                                const xpToRemove = parseInt(params[1]) || 0;
                                if (xpToRemove > 0) {
                                    const result = processToolCall('add_levelxp', [params[0], -xpToRemove]);
                                    if (debug) console.log(`${MODULE_NAME}: Reverted level XP for ${params[0]} by ${-xpToRemove}: ${result}`);
                                }
                                break;
                                
                            case 'add_skillxp':
                                // Subtract the skill XP that was added
                                const skillXpToRemove = parseInt(params[2]) || 0;
                                if (skillXpToRemove > 0) {
                                    const result = processToolCall('add_skillxp', [params[0], params[1], -skillXpToRemove]);
                                    if (debug) console.log(`${MODULE_NAME}: Reverted skill XP for ${params[0]}'s ${params[1]} by ${-skillXpToRemove}: ${result}`);
                                }
                                break;
                                
                            case 'add_item':
                                // Remove the item that was added
                                const itemsToRemove = parseInt(params[2]) || 1;
                                if (itemsToRemove > 0) {
                                    const result = processToolCall('remove_item', [params[0], params[1], itemsToRemove]);
                                    if (debug) console.log(`${MODULE_NAME}: Reverted add_item for ${params[0]}: removed ${params[1]} x${itemsToRemove}: ${result}`);
                                }
                                break;
                                
                            case 'remove_item':
                                // Add back the item that was removed
                                const itemsToAdd = parseInt(params[2]) || 1;
                                if (itemsToAdd > 0) {
                                    const result = processToolCall('add_item', [params[0], params[1], itemsToAdd]);
                                    if (debug) console.log(`${MODULE_NAME}: Reverted remove_item for ${params[0]}: added ${params[1]} x${itemsToAdd}: ${result}`);
                                }
                                break;
                                
                            default:
                                if (debug) console.log(`${MODULE_NAME}: No reversion logic for ${tool}`);
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
                if (toolName.startsWith('get_')) continue;
                
                // Capture revert data BEFORE executing
                const revertData = captureRevertData(toolName.toLowerCase(), params);
                
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
            for (let i = 0; i < checkLength; i++) {
                if (!history[i] || !data.entries[i]) continue;
                
                const historyHash = RewindSystem.quickHash(history[i].text);
                
                if (data.entries[i].h !== historyHash) {
                    // This entry was edited - reprocess it
                    if (debug) console.log(`${MODULE_NAME}: History entry ${i} was edited - reprocessing`);
                    
                    const tools = RewindSystem.extractAndExecuteTools(history[i].text);
                    data.entries[i] = {
                        h: historyHash,
                        t: tools.map(t => [t.tool, t.params, t.revertData || {}])
                    };
                }
            }
            
            // Update position
            data.position = historyLength - 1;
            RewindSystem.saveStorage(data);
            
            if (debug) console.log(`${MODULE_NAME}: History check complete - ${data.entries.length} entries tracked`);
        }
    };
    
    function createSampleRuntimeCards() {
        let created = false;
        
        // Create runtime variable declarations if doesn't exist
        if (!Utilities.storyCard.get('[RPG_RUNTIME] Variables')) {
            Utilities.storyCard.add({
                title: '[RPG_RUNTIME] Variables',
            type: 'data',
            entry: (
                `// Declare additional runtime variables here\n` +
                `// Format: variableName: type\n` +
                `// Types: integer, float, boolean, string, array, object\n` +
                `// \n` +
                `// Examples:\n` +
                `// player_karma: integer\n` +
                `// spawn_rate: float\n` +
                `// curses: array\n` +
                `// boss_flags: object\n` +
                `// discovered_locations: array\n` +
                `// quest_progress: object`
            ),
            description: (
                `// Additional variables can be declared here too\n` +
                `// Both entry and description are parsed for variables\n` +
                `// \n` +
                `// More examples:\n` +
                `// weather_state: string\n` +
                `// moon_phase: float\n` +
                `// damage_multiplier: float\n` +
                `// active_events: array\n` +
                `// npc_states: object`
            )
            });
            created = true;
        }
        
        if (!Utilities.storyCard.get('[RPG_RUNTIME] DATA 1')) {
            Utilities.storyCard.add({
                title: '[RPG_RUNTIME] DATA 1',
            type: 'data',
            entry: (
                `// Additional runtime data\n` +
                `// Format: # variableName\n` +
                `// value\n` +
                `// \n` +
                `// Examples:\n` +
                `// # player_karma\n` +
                `// 0\n` +
                `// \n` +
                `// # curses\n` +
                `// []\n` +
                `// \n` 
            ),
            description: (
                `// Additional data storage (both entry and description work)\n` +
                `// Create DATA 2, DATA 3 cards as needed for more space\n` 
            )
            });
            created = true;
        }
        
        if (!Utilities.storyCard.get('[RPG_RUNTIME] TOOLS')) {
            Utilities.storyCard.add({
                title: '[RPG_RUNTIME] TOOLS',
            type: 'data',
            entry: (
                `// Custom tools using standard function syntax\n` +
                `// Available via 'this' context:\n` +
                `// - getRuntimeValue(varName)\n` +
                `// - setRuntimeValue(varName, value)\n` +
                `// - loadAllCharacters()\n` +
                `// - saveCharacter(character)\n` +
                `// - Utilities (all utilities)\n` +
                `// - Calendar (if available)\n` +
                `// - debug (boolean flag)\n` +
                `// \n` +
                `// Tool functions receive parsed arguments\n`
            ),
            description: (
                `// Example custom tool (comma between functions!)\n` +
                `// \n` +
                `/*\n` +
                `,\n` +
                `set_weather: function(weatherType) {\n` +
                `    const validWeather = ['sunny', 'cloudy', 'rainy', 'stormy', 'snowy'];\n` +
                `    if (validWeather.includes(weatherType)) {\n` +
                `        this.setRuntimeValue('weather_state', weatherType);\n` +
                `        return true;\n` +
                `    }\n` +
                `    return false;\n` +
                `}\n` +
                `*/`
            )
            });
            created = true;
        }
        
        // Create INPUT_COMMANDS card if doesn't exist
        if (!Utilities.storyCard.get('[RPG_RUNTIME] INPUT_COMMANDS')) {
            Utilities.storyCard.add({
                title: '[RPG_RUNTIME] INPUT_COMMANDS',
            type: 'data',
            entry: `// Empty - add commands here`,
            description: (
                `// Example commands - copy to entry field and uncomment:\n` +
                `/*\n` +
                `stats: function(args) {\n` +
                `    const player = this.loadCharacter('player');\n` +
                `    if (!player) return "No player character found";\n` +
                `    return \`HP: \${player.hp.current}/\${player.hp.max}\`;\n` +
                `},\n` +
                `\n` +
                `give: function(args) {\n` +
                `    const item = args[0];\n` +
                `    const qty = parseInt(args[1] || 1);\n` +
                `    const player = this.loadCharacter('player');\n` +
                `    if (!player) return "No player character found";\n` +
                `    player.inventory[item] = (player.inventory[item] || 0) + qty;\n` +
                `    this.saveCharacter(player);\n` +
                `    return \`Gave \${qty} \${item}(s)\`;\n` +
                `}\n` +
                `*/`
            )
            });
            created = true;
        }
        
        // Create CONTEXT_MODIFIER card
        if (!Utilities.storyCard.get('[RPG_RUNTIME] CONTEXT_MODIFIER')) {
            Utilities.storyCard.add({
            title: '[RPG_RUNTIME] CONTEXT_MODIFIER', 
            type: 'data',
            entry: `// Context modifier - modify text before LLM sees it`,
            description: (
                `// This function runs in the context hook\n` +
                `// It receives the full context text as 'text'\n` +
                `// 'return text' is automatically added if not present`
            )
            });
            created = true;
        }
        
        // Create INPUT_MODIFIER card
        if (!Utilities.storyCard.get('[RPG_RUNTIME] INPUT_MODIFIER')) {
            Utilities.storyCard.add({
            title: '[RPG_RUNTIME] INPUT_MODIFIER',
            type: 'data', 
            entry: `// Input modifier - modify text before processing`,
            description: (
                `// Runs BEFORE commands are processed\n` +
                `// Pure JavaScript only - no game API access\n` +
                `// 'return text' is automatically added if not present`
            )
            });
            created = true;
        }
        
        // Create OUTPUT_MODIFIER card
        if (!Utilities.storyCard.get('[RPG_RUNTIME] OUTPUT_MODIFIER')) {
            Utilities.storyCard.add({
            title: '[RPG_RUNTIME] OUTPUT_MODIFIER',
            type: 'data',
            entry: `// Output modifier - modify text after processing`,
            description: (
                `// Runs AFTER tool processing\n` +
                `// Pure JavaScript only - no game API access\n` +
                `// 'return text' is automatically added if not present`
            )
            });
            created = true;
        }
        
        if (debug && created) console.log(`${MODULE_NAME}: Created runtime cards with defaults`);
        return created;
    }
    
    function createEntityTrackerCards() {
        // Create entity tracker config
        if (!Utilities.storyCard.get('[RPG_RUNTIME] Entity Tracker Config')) {
            Utilities.storyCard.add({
                title: '[RPG_RUNTIME] Entity Tracker Config',
                type: 'data',
                entry: (
                    `# entity_threshold\n` +
                    `3\n` +
                    `\n` +
                    `# auto_generate\n` +
                    `true\n` +
                    `\n` +
                    `# entity_blacklist\n` +
                    `player, self, me, you, unknown`
                ),
                description: `// Entity tracking data\n`
            });
        }
        
        // Entity templates are now handled by GenerationWizard
        // Remove old template card if it exists
        if (Utilities.storyCard.get('[RPG_RUNTIME] Entity Templates')) {
            Utilities.storyCard.remove('[RPG_RUNTIME] Entity Templates');
            if (debug) console.log(`${MODULE_NAME}: Removed deprecated [RPG_RUNTIME] Entity Templates - now using GenerationWizard`);
        }
        
        // Skip creating entity templates (deprecated)
        if (false) {
            Utilities.storyCard.add({
                title: '[RPG_RUNTIME] Entity Templates',
                type: 'data',
                entry: (
                    `# CLASSIFICATION_QUERY\n` +
                    `Classify the entity "{name}" that was just referenced:\n` +
                    `ENTITY_TYPE: [CHARACTER/MONSTER/BOSS/GROUP]\n` +
                    `FULL_NAME: [Complete name if different from "{name}"]\n` +
                    `GENDER: [Male/Female/Other/Unknown]\n` +
                    `DESCRIPTION: [2-3 sentences about who/what this is]\n` +
                    `\n` +
                    `# CHARACTER_QUERY\n` +
                    `For the character "{name}":\n` +
                    `TYPE: [NPC/NPC_PLAYER]\n` +
                    `APPEARANCE: [Physical description, build, clothing, distinguishing features]\n` +
                    `PERSONALITY: [Key traits, mannerisms, how they interact with others]\n` +
                    `BACKGROUND: [Brief history, role in world, motivations]\n` +
                    `LEVEL: [1-100 based on experience/competence]\n` +
                    `LOCATION: [Where they're typically found]\n` +
                    `PRIMARY_SKILLS: [2-4 relevant skills they would have]\n` +
                    `STARTING_ITEMS: [Key items they would carry]\n` +
                    `RELATIONSHIPS: [Any important connections to other characters]\n` +
                    `\n` +
                    `# MONSTER_QUERY\n` +
                    `For the monster "{name}":\n` +
                    `APPEARANCE: [Physical description, size, features]\n` +
                    `PERSONALITY: [Behavior patterns, intelligence level, temperament]\n` +
                    `BACKGROUND: [Origin, purpose, habitat]\n` +
                    `LEVEL: [1-100 based on danger]\n` +
                    `LOCATION: [Where encountered]\n` +
                    `ABILITIES: [3-5 combat abilities or special powers]\n` +
                    `LOOT: [Items dropped when defeated]\n` +
                    `WEAKNESSES: [Any vulnerabilities]\n` +
                    `\n` +
                    `# BOSS_QUERY\n` +
                    `For the boss "{name}":\n` +
                    `APPEARANCE: [Physical description, size, imposing features]\n` +
                    `PERSONALITY: [Behavior patterns, intelligence, motivations]\n` +
                    `BACKGROUND: [Origin story, rise to power, goals]\n` +
                    `LEVEL: [1-100 based on challenge]\n` +
                    `LOCATION: [Lair or domain]\n` +
                    `ABILITIES: [3-5 combat abilities or special powers]\n` +
                    `PHASES: [Number of combat phases]\n` +
                    `LEGENDARY_ACTIONS: [Special boss abilities]\n` +
                    `LOOT: [Unique items or rewards]\n` +
                    `WEAKNESSES: [Hidden vulnerabilities]\n` +
                    `\n` +
                    `# GROUP_QUERY\n` +
                    `For the group "{name}":\n` +
                    `GROUP_SIZE: [Specific number or range]\n` +
                    `MEMBER_TYPES: [Types of individuals in group]\n` +
                    `APPEARANCE: [How they look as a group, uniforms, etc.]\n` +
                    `ORGANIZATION: [Leadership structure, how they operate]\n` +
                    `PURPOSE: [Why they exist as a group]\n` +
                    `LOCATION: [Where they operate]\n` +
                    `RESOURCES: [What the group possesses collectively]\n` +
                    `REPUTATION: [How they're viewed by others]\n` +
                    `\n` +
                    `# PLAYER_SPECIFICS_QUERY\n` +
                    `For the player character "{name}":\n` +
                    `DOB: [YYYY-MM-DD format]\n` +
                    `STARTING_CLASS: [Fighter/Mage/Rogue/etc.]\n` +
                    `ATTRIBUTE_FOCUS: [Which attributes are highest]\n` +
                    `SKILL_SPECIALIZATION: [Main skill focus areas]\n` +
                    `BACKSTORY_HOOKS: [Plot hooks or quests related to them]`
                ),
                description: (
                    `Query templates for entity classification and generation.\n` +
                    `These templates are used to gather information about unknown entities.\n` +
                    `Edit to customize the questions asked when generating new entities.`
                )
            });
        }
        
        if (debug) console.log(`${MODULE_NAME}: Created entity tracker cards`);
    }
    
    // ==========================
    // RPG Schema Management
    // ==========================
    let schemaCache = null;
    
    function loadRPGSchema() {
        if (schemaCache !== null) return schemaCache;
        
        schemaCache = {
            attributes: { master: [], additional: [] },
            coreStats: {},
            skills: { categories: {}, definitions: {} },
            levelProgression: { formula: 'level * 100', overrides: {} }
        };
        
        // Load or create Attributes Schema
        let attrCard = Utilities.storyCard.get('[RPG_SCHEMA] Attributes');
        if (!attrCard) {
            createDefaultAttributesSchema();
            attrCard = Utilities.storyCard.get('[RPG_SCHEMA] Attributes');
        }
        if (attrCard) {
            parseAttributesSchema(attrCard.entry, schemaCache.attributes);
        }
        
        // Load or create Core Stats Schema
        let statsCard = Utilities.storyCard.get('[RPG_SCHEMA] Core Stats');
        if (!statsCard) {
            createDefaultCoreStatsSchema();
            statsCard = Utilities.storyCard.get('[RPG_SCHEMA] Core Stats');
        }
        if (statsCard) {
            parseCoreStatsSchema(statsCard.entry, schemaCache.coreStats);
        }
        
        // Load or create Skills Schema
        let skillsCard = Utilities.storyCard.get('[RPG_SCHEMA] Skills');
        if (!skillsCard) {
            createDefaultSkillsSchema();
            skillsCard = Utilities.storyCard.get('[RPG_SCHEMA] Skills');
        }
        if (skillsCard) {
            parseSkillsSchema(skillsCard.entry, schemaCache.skills);
        }
        
        // Load or create Level Progression Schema
        let levelCard = Utilities.storyCard.get('[RPG_SCHEMA] Level Progression');
        if (!levelCard) {
            createDefaultLevelProgressionSchema();
            levelCard = Utilities.storyCard.get('[RPG_SCHEMA] Level Progression');
        }
        if (levelCard) {
            parseLevelProgressionSchema(levelCard.entry, schemaCache.levelProgression);
        }
        
        if (debug) console.log(`${MODULE_NAME}: Loaded RPG schema`);
        return schemaCache;
    }
    
    function createDefaultAttributesSchema() {
        const defaultText = (
            `# Master Attributes\n` +
            `* VITALITY\n` +
            `* STRENGTH\n` +
            `* DEXTERITY\n` +
            `* AGILITY\n` +
            `\n` +
            `## Additional Attributes\n` +
            `* LUCK\n` +
            `* CHARISMA`
        );
        
        Utilities.storyCard.add({
            title: '[RPG_SCHEMA] Attributes',
            type: 'data',
            entry: defaultText,
            description: 'Edit master attributes (required for all characters) and additional attributes (optional)'
        });
        
        if (debug) console.log(`${MODULE_NAME}: Created default Attributes schema`);
    }
    
    function createDefaultCoreStatsSchema() {
        const defaultText = (
            `# HP\n` +
            `default: 100\n` +
            `per_level_formula: 10\n` +
            `\n` +
            `# MP\n` +
            `default: 50\n` +
            `per_level_formula: 5\n` +
            `\n` +
            `# STAMINA\n` +
            `default: 100\n` +
            `per_level_formula: 5`
        );
        
        Utilities.storyCard.add({
            title: '[RPG_SCHEMA] Core Stats',
            type: 'data',
            entry: defaultText,
            description: 'Core stats with X/MAX format. per_level_formula is added to max when leveling up'
        });
        
        if (debug) console.log(`${MODULE_NAME}: Created default Core Stats schema`);
    }
    
    function createDefaultSkillsSchema() {
        const defaultText = (
            `# XP Categories (per level formula)\n` +
            `default: level * 100\n` +
            `combat: level * 80\n` +
            `crafting: level * 150\n` +
            `social: level * 120\n` +
            `\n` +
            `## Skill Definitions\n` +
            `* one_handed_sword: combat\n` +
            `* two_handed_sword: combat\n` +
            `* rapier: combat\n` +
            `* cooking: crafting\n` +
            `* blacksmithing: crafting\n` +
            `* fishing: level * 200\n` +
            `* first_aid: default\n` +
            `* tracking: level * 120\n` +
            `* persuasion: social\n` +
            `* intimidation: social\n` +
            `* bartering: social`
        );
        
        Utilities.storyCard.add({
            title: '[RPG_SCHEMA] Skills',
            type: 'data',
            entry: defaultText,
            description: 'Define skill categories and individual skills. Skills can use category or custom formula'
        });
        
        if (debug) console.log(`${MODULE_NAME}: Created default Skills schema`);
    }
    
    function createDefaultLevelProgressionSchema() {
        const defaultText = (
            `# Level XP Formula\n` +
            `formula: level * level * 100\n` +
            `\n` +
            `# Custom Level Overrides\n` +
            `5: 2000\n` +
            `10: 8000\n` +
            `20: 35000\n` +
            `50: 200000\n` +
            `75: 500000`
        );
        
        Utilities.storyCard.add({
            title: '[RPG_SCHEMA] Level Progression',
            type: 'data',
            entry: defaultText,
            description: 'XP required for each level. Use formula for scaling, overrides for specific levels'
        });
        
        if (debug) console.log(`${MODULE_NAME}: Created default Level Progression schema`);
    }
    
    function parseAttributesSchema(text, attributes) {
        const lines = text.split('\n');
        let currentSection = null;
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            if (trimmed.startsWith('# Master Attributes')) {
                currentSection = 'master';
            } else if (trimmed.startsWith('## Additional Attributes')) {
                currentSection = 'additional';
            } else if (trimmed.startsWith('*') && currentSection) {
                const attr = trimmed.substring(1).trim();
                if (attr) {
                    attributes[currentSection].push(attr);
                }
            }
        }
    }
    
    function parseCoreStatsSchema(text, coreStats) {
        const lines = text.split('\n');
        let currentStat = null;
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            if (trimmed.startsWith('#') && !trimmed.startsWith('##')) {
                // New stat section
                currentStat = trimmed.substring(1).trim().toUpperCase();
                if (currentStat) {
                    coreStats[currentStat] = {};
                }
            } else if (currentStat && trimmed.includes(':')) {
                const [key, value] = trimmed.split(':').map(s => s.trim());
                if (key === 'default') {
                    coreStats[currentStat].default = parseInt(value) || 50;
                } else if (key === 'per_level_formula') {
                    coreStats[currentStat].perLevelFormula = value;
                }
            }
        }
    }
    
    function parseSkillsSchema(text, skills) {
        const lines = text.split('\n');
        let inCategories = false;
        let inDefinitions = false;
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            if (trimmed === '# XP Categories' || trimmed.includes('XP Categories')) {
                inCategories = true;
                inDefinitions = false;
            } else if (trimmed === '## Skill Definitions' || trimmed.includes('Skill Definitions')) {
                inCategories = false;
                inDefinitions = true;
            } else if (trimmed.startsWith('*') && inDefinitions) {
                const content = trimmed.substring(1).trim();
                const [skillName, category] = content.split(':').map(s => s.trim());
                if (skillName) {
                    skills.definitions[skillName.toLowerCase()] = category || 'default';
                }
            } else if (inCategories && trimmed.includes(':')) {
                const [category, formula] = trimmed.split(':').map(s => s.trim());
                if (category && formula) {
                    skills.categories[category] = formula;
                }
            }
        }
    }
    
    function parseLevelProgressionSchema(text, progression) {
        const lines = text.split('\n');
        let inOverrides = false;
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            if (trimmed.includes('Level XP Formula')) {
                inOverrides = false;
            } else if (trimmed.includes('Custom Level Overrides')) {
                inOverrides = true;
            } else if (trimmed.startsWith('formula:')) {
                progression.formula = trimmed.substring(8).trim();
            } else if (inOverrides && trimmed.match(/^\d+:/)) {
                const [level, xp] = trimmed.split(':').map(s => s.trim());
                progression.overrides[parseInt(level)] = parseInt(xp);
            }
        }
    }
    
    function calculateXPRequirement(level, formula, overrides) {
        // Check for override first
        if (overrides && overrides[level]) {
            return overrides[level];
        }
        
        // Use formula
        try {
            // Safe eval - only allows basic math operations
            const safeFormula = formula.replace(/level/gi, level);
            return Math.round(eval(safeFormula));
        } catch (e) {
            if (debug) console.log(`${MODULE_NAME}: Error calculating XP for level ${level}: ${e}`);
            return level * 100; // Fallback
        }
    }
    
    function calculateSkillXPRequirement(skillName, level, schema) {
        const definition = schema.skills.definitions[skillName.toLowerCase()];
        if (!definition) return level * 100; // Default if skill not in schema
        
        // Check if it's a number or a category
        const numValue = parseInt(definition);
        if (!isNaN(numValue)) {
            return numValue;
        }
        
        // It's a category or formula
        const formula = schema.skills.categories[definition] || definition;
        
        try {
            const safeFormula = formula.replace(/level/gi, level);
            return Math.round(eval(safeFormula));
        } catch (e) {
            if (debug) console.log(`${MODULE_NAME}: Error calculating skill XP: ${e}`);
            return level * 100;
        }
    }
    
    // ==========================
    // Relationship System
    // ==========================
    function loadRelationshipThresholds() {
        const thresholdCard = Utilities.storyCard.get('[RPG_SCHEMA] Relationship Thresholds');
        if (!thresholdCard) {
            createDefaultRelationshipThresholds();
            return loadRelationshipThresholds();
        }
        
        const thresholds = [];
        const lines = (thresholdCard.entry || '').split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            // Skip comments and headers
            if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) continue;
            
            // Parse: min to max: "flavor text"
            const match = trimmed.match(/^(-?\d+)\s+to\s+(-?\d+):\s*"([^"]+)"/);
            if (match) {
                thresholds.push({
                    min: parseInt(match[1]),
                    max: parseInt(match[2]),
                    flavor: match[3]
                });
            }
        }
        
        // Sort by min value for efficient lookup
        thresholds.sort((a, b) => a.min - b.min);
        return thresholds;
    }
    
    function getRelationshipFlavor(value, fromName, toName) {
        const thresholds = loadRelationshipThresholds();
        
        // Find matching threshold
        for (const threshold of thresholds) {
            if (value >= threshold.min && value <= threshold.max) {
                // Replace placeholders in flavor text
                return threshold.flavor
                    .replace(/\{from\}/g, fromName)
                    .replace(/\{to\}/g, toName)
                    .replace(/\{value\}/g, value);
            }
        }
        
        // Default if no threshold matches
        return `${value} points`;
    }
    
    function createDefaultRelationshipThresholds() {
        const defaultText = (
            `# Relationship Thresholds\n` +
            `// Format: min to max: "flavor text"\n` +
            `// Use {from} for source character, {to} for target, {value} for the number\n` +
            `// Thresholds are checked in order from lowest to highest\n` +
            `\n` +
            `-100 to -80: "Mortal Enemy"\n` +
            `-79 to -60: "Despised"\n` +
            `-59 to -40: "Hostile"\n` +
            `-39 to -20: "Disliked"\n` +
            `-19 to -5: "Unfriendly"\n` +
            `-4 to 4: "Neutral"\n` +
            `5 to 19: "Friendly"\n` +
            `20 to 39: "Liked"\n` +
            `40 to 59: "Trusted"\n` +
            `60 to 79: "Close Friend"\n` +
            `80 to 99: "Best Friend"\n` +
            `100 to 200: "Inseparable"\n` +
            `\n` +
            `// Extended ranges for special cases\n` +
            `201 to 500: "Soul Bonded"\n` +
            `501 to 999: "Legendary Bond"\n` +
            `1000 to 9999: "{from} would die for {to}"\n` +
            `\n` +
            `// Negative extremes\n` +
            `-200 to -101: "Would kill on sight"\n` +
            `-500 to -201: "Vendetta"\n` +
            `-9999 to -501: "Eternal Hatred"`
        );
        
        Utilities.storyCard.add({
            title: '[RPG_SCHEMA] Relationship Thresholds',
            type: 'data',
            entry: defaultText,
            description: 'Configure relationship value ranges and their descriptions. These appear in character sheets and logs.'
        });
        
        if (debug) console.log(`${MODULE_NAME}: Created default Relationship Thresholds schema`);
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
    // Character Format Schema
    // ==========================
    let characterFormatCache = null;
    
    function loadCharacterFormat() {
        if (characterFormatCache !== null) return characterFormatCache;
        
        const formatCard = Utilities.storyCard.get('[RPG_SCHEMA] Character Format');
        if (!formatCard) {
            createDefaultCharacterFormat();
            characterFormatCache = parseCharacterFormatSchema(getDefaultFormatText());
            return characterFormatCache;
        }
        
        characterFormatCache = parseCharacterFormatSchema(formatCard.entry);
        return characterFormatCache;
    }
    
    function parseCharacterFormatSchema(text) {
        const format = {
            sections: [],
            sectionFormats: {},
            sectionOrder: [],
            prefixTemplate: '',
            headerFormat: '## **{name}**{fullName? [{fullName}]}',
            infoLineFormat: 'Gender: {gender} | HP: {hp.current}/{hp.max} | Level {level} ({xp.current}/{xp.max} XP) | Current Location: {location}',
            customFields: {}
        };
        
        if (!text) return getDefaultCharacterFormat();
        
        const lines = text.split('\n');
        let currentSection = null;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Skip empty lines and comments
            if (!line || line.startsWith('//')) continue;
            
            // Section headers
            if (line.startsWith('## ')) {
                currentSection = line.substring(3).trim().toLowerCase();
                continue;
            }
            
            // Parse based on current section
            switch (currentSection) {
                case 'section definitions':
                    // Parse: id -> Display Name (Alt1, Alt2)
                    const defMatch = line.match(/^([a-z_]+)\s*->\s*([^(]+)(?:\(([^)]*)\))?/);
                    if (defMatch) {
                        const id = defMatch[1].trim();
                        const displayName = defMatch[2].trim();
                        const alternates = defMatch[3] ? 
                            defMatch[3].split(',').map(s => s.trim()) : [];
                        
                        format.sections.push({
                            id: id,
                            displayName: displayName,
                            alternateNames: alternates,
                            format: 'plain_text' // default, will be overridden
                        });
                    }
                    break;
                    
                case 'section formats':
                    // Parse: section_id: format_type
                    const formatMatch = line.match(/^([a-z_]+):\s*(.+)/);
                    if (formatMatch) {
                        format.sectionFormats[formatMatch[1]] = formatMatch[2].trim();
                    }
                    break;
                    
                case 'section order':
                    // Each line is a section id
                    if (line && !line.startsWith('#')) {
                        format.sectionOrder.push(line);
                    }
                    break;
                    
                case 'prefix template':
                    // Accumulate lines until next section
                    if (!line.startsWith('#')) {
                        let template = line;
                        while (i + 1 < lines.length) {
                            const nextLine = lines[i + 1].trim();
                            if (!nextLine || nextLine.startsWith('##') || nextLine.startsWith('//')) {
                                break;
                            }
                            i++;
                            template += '\n' + lines[i];
                        }
                        format.prefixTemplate = template;
                    }
                    break;
                    
                case 'header template':
                    // Next non-comment line is the template
                    if (!line.startsWith('#')) {
                        format.headerFormat = line;
                    }
                    break;
                    
                case 'info line template':
                    // Accumulate lines until next section
                    if (!line.startsWith('#')) {
                        // Check if next line is also part of template
                        let template = line;
                        while (i + 1 < lines.length) {
                            const nextLine = lines[i + 1].trim();
                            if (!nextLine || nextLine.startsWith('##') || nextLine.startsWith('//')) {
                                break;
                            }
                            i++;
                            template += ' ' + nextLine;
                        }
                        format.infoLineFormat = template;
                    }
                    break;
                    
                case 'custom field mappings':
                    // Parse: alias -> field.path
                    const fieldMatch = line.match(/^([a-z_]+)\s*->\s*(.+)/);
                    if (fieldMatch) {
                        format.customFields[fieldMatch[1]] = fieldMatch[2].trim();
                    }
                    break;
            }
        }
        
        // Apply formats to sections
        for (const section of format.sections) {
            if (format.sectionFormats[section.id]) {
                section.format = format.sectionFormats[section.id];
            }
        }
        
        // If no section order specified, use section definition order
        if (format.sectionOrder.length === 0) {
            format.sectionOrder = format.sections.map(s => s.id);
        }
        
        return format;
    }
    
    function getDefaultCharacterFormat() {
        return {
            sections: [
                {
                    id: "attributes",
                    displayName: "Attributes",
                    alternateNames: [],
                    format: "pipe_delimited"
                },
                {
                    id: "skills",
                    displayName: "Skills",
                    alternateNames: [],
                    format: "skill_levels"
                },
                {
                    id: "inventory",
                    displayName: "Inventory",
                    alternateNames: [],
                    format: "braced_list"
                },
                {
                    id: "relationships",
                    displayName: "Relationships",
                    alternateNames: [],
                    format: "equals_value"
                },
                {
                    id: "appearance",
                    displayName: "Appearance",
                    alternateNames: [],
                    format: "plain_text"
                },
                {
                    id: "personality",
                    displayName: "Personality",
                    alternateNames: [],
                    format: "plain_text"
                },
                {
                    id: "background",
                    displayName: "Background",
                    alternateNames: [],
                    format: "plain_text"
                }
            ],
            headerFormat: "## **{name}**{fullName}",
            infoLineFormat: "{dob|DOB: $ | }Gender: {gender} | HP: {hp.current}/{hp.max}{coreStats} | Level {level} ({xp.current}/{xp.max} XP) | Current Location: {location}",
            sectionOrder: ["appearance", "personality", "background", "attributes", "skills", "inventory", "relationships"],
            customFields: {}
        };
    }
    
    function getDefaultFormatText() {
        return (
            `# Character Format Configuration\n` +
            `\n` +
            `## Section Definitions\n` +
            `// Format: SectionID -> Display Name (Alternate Names)\n` +
            `// The SectionID is used internally, Display Name shows in character cards\n` +
            `\n` +
            `attributes -> Attributes (Stats, Ability Scores)\n` +
            `skills -> Skills (Abilities, Proficiencies)\n` +
            `inventory -> Inventory (Items, Equipment, Gear)\n` +
            `relationships -> Relationships (Bonds, Connections)\n` +
            `appearance -> Appearance (Description, Physical, Looks)\n` +
            `personality -> Personality (Traits, Nature, Demeanor)\n` +
            `background -> Background (History, Story, Bio, Backstory)\n` +
            `\n` +
            `## Section Formats\n` +
            `// How each section's data should be formatted\n` +
            `// Options: pipe_delimited, skill_levels, braced_list, equals_value, plain_text, key_value, single_value\n` +
            `\n` +
            `attributes: pipe_delimited\n` +
            `skills: skill_levels\n` +
            `inventory: braced_list\n` +
            `relationships: equals_value\n` +
            `appearance: plain_text\n` +
            `personality: plain_text\n` +
            `background: plain_text\n` +
            `\n` +
            `## Section Order\n` +
            `// The order sections appear when saving (one per line)\n` +
            `\n` +
            `appearance\n` +
            `personality\n` +
            `background\n` +
            `attributes\n` +
            `skills\n` +
            `inventory\n` +
            `relationships\n` +
            `\n` +
            `## Prefix Template\n` +
            `// Text to add before the character sheet (for compatibility with other scripts)\n` +
            `// Use conditionals: {isPlayer?<$# User>} or {isNPC?<$# Characters>}\n` +
            `// Leave blank if not needed\n` +
            `{isPlayer?<$# User>}{isNPC?<$# Characters>}\n` +
            `\n` +
            `## Header Template\n` +
            `// Use {fieldname} for values, **text** for bold\n` +
            `// Use {fullName?[{fullName}]} to wrap fullName in brackets only if it exists\n` +
            `\n` +
            `## **{name}**{fullName? [{fullName}]}\n` +
            `\n` +
            `## Info Line Template\n` +
            `// Use {field} for simple values\n` +
            `// Use {field?text with {field}} for optional fields (only shows if field exists)\n` +
            `// Special: {coreStats} inserts all core stats automatically\n` +
            `\n` +
            `{dob?DOB: {dob} | }Gender: {gender} | HP: {hp.current}/{hp.max}{coreStats} | Level {level} ({xp.current}/{xp.max} XP) | Current Location: {location}\n` +
            `\n` +
            `## Custom Field Mappings\n` +
            `// Create shortcuts for commonly accessed fields\n` +
            `// Format: alias -> field.path\n` +
            `\n` +
            `health -> hp.current\n` +
            `max_health -> hp.max\n` +
            `hp -> hp.current\n` +
            `hp_max -> hp.max`
        );
    }
    
    function createDefaultCharacterFormat() {
        Utilities.storyCard.add({
            title: '[RPG_SCHEMA] Character Format',
            type: 'data',
            entry: getDefaultFormatText(),
            description: (
                'Defines how character cards are formatted and parsed. Edit the sections above to customize:\n\n' +
                '• Section Definitions: Define section IDs, display names, and alternate names\n' +
                '• Section Formats: Choose how each section\'s data is formatted\n' +
                '• Section Order: Control the order sections appear\n' +
                '• Header/Info Templates: Customize character header and info line\n' +
                '• Custom Fields: Create aliases for nested field paths\n\n' +
                'Format types:\n' +
                '- pipe_delimited: KEY: VALUE | KEY: VALUE\n' +
                '- skill_levels: skill: Level X (Y/Z XP)\n' +
                '- braced_list: {item:qty, item:qty}\n' +
                '- equals_value: name=value [flavor]\n' +
                '- plain_text: Free-form text\n' +
                '- key_value: key: value (one per line)\n' +
                '- single_value: A single value'
            )
        });
        
        if (debug) console.log(`${MODULE_NAME}: Created default Character Format schema`);
    }
    
    // ==========================
    // Character Field Accessors
    // ==========================
    function getCharacterField(character, fieldPath) {
        if (!character || !fieldPath) return null;
        
        // Check custom field mappings first
        const format = loadCharacterFormat();
        if (format.customFields && format.customFields[fieldPath]) {
            fieldPath = format.customFields[fieldPath];
        }
        
        // Handle nested paths
        return getNestedValue(character, fieldPath);
    }
    
    function setCharacterField(character, fieldPath, value) {
        if (!character || !fieldPath) return false;
        
        // Check custom field mappings
        const format = loadCharacterFormat();
        if (format.customFields && format.customFields[fieldPath]) {
            fieldPath = format.customFields[fieldPath];
        }
        
        return setNestedValue(character, fieldPath, value);
    }
    
    function getNestedValue(obj, path) {
        const parts = path.split('.');
        let current = obj;
        
        for (const part of parts) {
            if (current === null || current === undefined) {
                return null;
            }
            current = current[part];
        }
        
        return current;
    }
    
    function setNestedValue(obj, path, value) {
        const parts = path.split('.');
        let current = obj;
        
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (!current[part]) {
                current[part] = {};
            }
            current = current[part];
        }
        
        current[parts[parts.length - 1]] = value;
        return true;
    }
    
    // ==========================
    // Character Management
    // ==========================
    let characterCache = null;
    
    function loadAllCharacters() {
        if (characterCache !== null) return characterCache;
        
        characterCache = {};
        
        // Load all [CHARACTER] and [PLAYER] cards using find with predicate
        const cards = Utilities.storyCard.find(
            card => card.title && (card.title.startsWith('[CHARACTER]') || card.title.startsWith('[PLAYER]')),
            true // Get all matches
        );
        
        if (!cards || cards.length === 0) return characterCache;
        
        for (const card of cards) {
            const parsed = parseCharacterCard(card);
            if (parsed && parsed.name) {
                // Store with lowercase name as key
                characterCache[parsed.name.toLowerCase()] = parsed;
            }
        }
        
        if (debug) console.log(`${MODULE_NAME}: Loaded ${Object.keys(characterCache).length} characters`);
        return characterCache;
    }
    
    function parseCharacterCard(card) {
        const schema = loadRPGSchema();
        const format = loadCharacterFormat();
        
        const character = {
            title: card.title,
            name: null,
            fullName: null,
            dob: null,
            gender: null,
            hp: { current: 10, max: 10 },
            level: 1,
            xp: { current: 0, max: 100 },
            location: '???',
            coreStats: {},
            attributes: {},
            skills: {},
            inventory: {},
            relationships: {},
            rawSections: {},
            prefixText: ''
        };
        
        // Extract name from title - just [CHARACTER] Name or [PLAYER] Name
        const titleMatch = card.title.match(/\[(CHARACTER|PLAYER)\]\s+(.+)/);
        if (titleMatch) {
            character.name = titleMatch[2].trim();
        }
        
        // Parse the entry text
        const text = card.entry || '';
        const lines = text.split('\n');
        
        // Extract all sections from the text
        const sections = {};
        let currentSection = null;
        let sectionContent = [];
        let foundMainHeader = false;
        let prefixLines = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Check for main character header - try multiple patterns
            if (line.startsWith('## ')) {
                // Try the configured header patterns
                const headerMatch = line.match(/## \*\*(.+?)\*\*(?:\s+(.+))?/) || 
                                  line.match(/## (.+)/);
                if (headerMatch) {
                    foundMainHeader = true;
                    character.name = headerMatch[1].trim().replace(/\*\*/g, '');
                    
                    // If there's text after the name, that's the full name
                    if (headerMatch[2]) {
                        let fullName = headerMatch[2].trim();
                        // Strip any surrounding brackets to prevent accumulation
                        while (fullName.startsWith('[') && fullName.endsWith(']')) {
                            fullName = fullName.slice(1, -1).trim();
                        }
                        if (fullName) {
                            character.fullName = fullName;
                        }
                    }
                    
                    // Store any prefix text (but ignore template-generated prefixes)
                    if (prefixLines.length > 0) {
                        const prefixText = prefixLines.join('\n').trim();
                        // Don't store template-generated prefixes like <$# User> or <$# Characters>
                        if (!prefixText.match(/^<\$#\s+[^>]+>$/)) {
                            character.prefixText = prefixText;
                        }
                    }
                    
                    // Parse the info line (next line after header)
                    if (i + 1 < lines.length) {
                        const infoLine = lines[i + 1];
                        parseCharacterInfoLine(infoLine, character);
                    }
                    i++; // Skip the info line
                }
            }
            // If we haven't found the main header yet, accumulate prefix lines
            else if (!foundMainHeader) {
                prefixLines.push(line);
            }
            // Check for section headers (###)
            else if (line.startsWith('### ')) {
                // Save previous section if exists
                if (currentSection) {
                    sections[currentSection] = sectionContent.join('\n').trim();
                }
                
                currentSection = line.substring(4).trim().toLowerCase();
                sectionContent = [];
            }
            // Accumulate section content
            else if (currentSection) {
                sectionContent.push(line);
            }
        }
        
        // Save last section
        if (currentSection) {
            sections[currentSection] = sectionContent.join('\n').trim();
        }
        
        // Store raw sections for preservation
        character.rawSections = sections;
        
        // Map sections to character properties using schema
        for (const sectionDef of format.sections) {
            // Check display name and all alternate names
            const possibleNames = [sectionDef.displayName, ...sectionDef.alternateNames];
            
            for (const name of possibleNames) {
                const normalizedName = name.toLowerCase();
                if (sections[normalizedName]) {
                    const content = sections[normalizedName];
                    character[sectionDef.id] = parseSectionByFormat(content, sectionDef.format);
                    break;
                }
            }
        }
        
        // Initialize missing master attributes with defaults
        for (const attr of schema.attributes.master) {
            if (!character.attributes[attr.toLowerCase()]) {
                character.attributes[attr.toLowerCase()] = 10; // Default value
            }
        }
        
        // Initialize core stats if missing
        initializeCoreStats(character, schema);
        
        // Set XP requirement for current level
        character.xp.max = calculateXPRequirement(character.level + 1, schema.levelProgression.formula, schema.levelProgression.overrides);
        
        return character;
    }
    
    function initializeCoreStats(character, schema) {
        // HP is stored in the old location for backward compatibility
        if (!character.hp.max || character.hp.max === 10) {
            // Use default from schema
            const hpSchema = schema.coreStats.HP || schema.coreStats.hp;
            if (hpSchema && hpSchema.default) {
                character.hp.max = hpSchema.default;
                character.hp.current = hpSchema.default;
            }
        }
        
        // Initialize other core stats from schema
        for (const [statName, statSchema] of Object.entries(schema.coreStats)) {
            const statKey = statName.toLowerCase();
            if (statKey !== 'hp' && !character.coreStats[statKey]) {
                character.coreStats[statKey] = {
                    current: statSchema.default,
                    max: statSchema.default
                };
            }
        }
    }
    
    function parseCharacterInfoLine(line, character) {
        // Parse: DOB: YYYY-MM-DD | Gender: Female | HP: 10/10 | MP: 50/50 | Level 1 (0/100 XP) | Current Location: Town_of_Beginnings
        // OR the older format without DOB
        
        const parts = line.split('|').map(p => p.trim());
        
        for (const part of parts) {
            if (part.startsWith('DOB:')) {
                character.dob = part.substring(4).trim();
            }
            else if (part.startsWith('Gender:')) {
                character.gender = part.substring(7).trim();
            }
            else if (part.startsWith('HP:')) {
                const hpMatch = part.match(/HP:\s*(\d+)\/(\d+)/);
                if (hpMatch) {
                    character.hp.current = parseInt(hpMatch[1]);
                    character.hp.max = parseInt(hpMatch[2]);
                }
            }
            else if (part.includes('Level')) {
                const levelMatch = part.match(/Level\s+(\d+)\s*\((\d+)\/(\d+)\s*XP\)/);
                if (levelMatch) {
                    character.level = parseInt(levelMatch[1]);
                    character.xp.current = parseInt(levelMatch[2]);
                    character.xp.max = parseInt(levelMatch[3]);
                }
            }
            else if (part.startsWith('Current Location:')) {
                character.location = part.substring(17).trim() || '???';
            }
            // Parse other core stats (MP, STAMINA, etc.)
            else {
                const statMatch = part.match(/^([A-Z]+):\s*(\d+)\/(\d+)$/);
                if (statMatch) {
                    const statName = statMatch[1].toLowerCase();
                    if (statName !== 'hp') {
                        character.coreStats[statName] = {
                            current: parseInt(statMatch[2]),
                            max: parseInt(statMatch[3])
                        };
                    }
                }
            }
        }
    }
    
    function parseSectionByFormat(content, format) {
        switch (format) {
            case 'pipe_delimited':
                return Utilities.parsing.parsePipeDelimited(content);
            case 'skill_levels':
                return parseSkillLevels(content);  // Keep specialized
            case 'braced_list':
                return Utilities.parsing.parseBracedList(content);
            case 'equals_value':
                return Utilities.parsing.parseEqualsValue(content);
            case 'plain_text':
                return content;
            case 'key_value':
                return Utilities.parsing.parseColonKeyValue(content);
            case 'single_value':
                return parseSingleValue(content);
            default:
                return content;
        }
    }
    
    // parsePipeDelimited - moved to Utilities.parsing.parsePipeDelimited
    
    function parseSkillLevels(text) {
        // Parse: skill_name: Level X (current/max XP)
        const skills = {};
        const lines = text.split('\n');
        
        for (const line of lines) {
            const match = line.match(/(.+?):\s*Level\s+(\d+)\s*\((\d+)\/(\d+)\s*XP\)/);
            if (match) {
                const skillName = match[1].trim().toLowerCase();
                skills[skillName] = {
                    level: parseInt(match[2]),
                    xp: {
                        current: parseInt(match[3]),
                        max: parseInt(match[4])
                    }
                };
            }
        }
        
        return skills;
    }
    
    // parseBracedList - moved to Utilities.parsing.parseBracedList
    
    // parseEqualsValue - moved to Utilities.parsing.parseEqualsValue
    
    // parseKeyValue - moved to Utilities.parsing.parseColonKeyValue
    
    function parseSingleValue(text) {
        // Parse a single value (number or string)
        const trimmed = text.trim();
        const numValue = parseFloat(trimmed);
        return isNaN(numValue) ? trimmed : numValue;
    }
    
    function saveCharacter(character) {
        if (!character || !character.name) return false;
        
        const format = loadCharacterFormat();
        let entry = '';
        
        // Add prefix from template (for script compatibility headers)
        if (format.prefixTemplate) {
            const prefix = formatTemplate(format.prefixTemplate, character);
            if (prefix.trim()) {
                entry += prefix + '\n';
            }
        }
        // Legacy support: if character has old prefixText and no template is defined
        else if (character.prefixText) {
            entry += character.prefixText + '\n';
        }
        
        // Format header using template
        entry += formatString(format.headerFormat, character) + '\n';
        
        // Format info line using template
        entry += formatTemplate(format.infoLineFormat, character) + '\n';
        
        // Add sections in configured order
        for (const sectionId of format.sectionOrder) {
            const sectionDef = format.sections.find(s => s.id === sectionId);
            if (!sectionDef) continue;
            
            const data = character[sectionId];
            if (!data || (typeof data === 'object' && Object.keys(data).length === 0 && sectionDef.format !== 'plain_text')) continue;
            if (sectionDef.format === 'plain_text' && !data) continue;
            
            entry += `### ${sectionDef.displayName}\n`;
            entry += formatSectionData(data, sectionDef.format, character) + '\n';
        }
        
        // Build keys array - include all names the character might be known by
        const keys = [character.name];
        if (character.fullName && character.fullName !== character.name) {
            keys.push(character.fullName);
        }
        if (character.triggerName && character.triggerName !== character.name) {
            keys.push(character.triggerName);
        }
        
        // Save the card with multiple keys
        Utilities.storyCard.upsert({
            title: character.title,
            entry: entry,
            keys: keys.join(',')
        });
        
        if (debug) console.log(`${MODULE_NAME}: Saved character ${character.name} with keys: ${keys.join(', ')}`);
        return true;
    }
    
    function formatString(template, data) {
        // First handle conditional formatting like {field?text with {field}}
        let result = template;
        
        // Handle conditional blocks
        result = result.replace(/\{([^?}]+)\?([^}]*\{[^}]+\}[^}]*)\}/g, (match, fieldPath, conditionalText) => {
            const value = getNestedValue(data, fieldPath.trim());
            if (value !== null && value !== undefined && value !== '') {
                // Replace nested field references within the conditional text
                return conditionalText.replace(/\{([^}]+)\}/g, (innerMatch, innerPath) => {
                    const innerValue = getNestedValue(data, innerPath.trim());
                    return innerValue !== null && innerValue !== undefined ? innerValue : '';
                });
            }
            return '';
        });
        
        // Then handle simple field replacements
        result = result.replace(/\{([^}]+)\}/g, (match, path) => {
            const fieldPath = path.trim();
            const value = getNestedValue(data, fieldPath);
            return value !== null && value !== undefined ? value : '';
        });
        
        return result;
    }
    
    function formatTemplate(template, character) {
        // Handle conditional fields with the format {field?text with {field}}
        // Use a more complex regex to handle nested braces
        let result = template;
        
        // First, find and replace all conditional blocks
        // This regex matches {field?...} including nested {} inside
        const conditionalRegex = /\{([^?{}]+)\?([^{}]*(?:\{[^}]*\}[^{}]*)*)\}/g;
        result = result.replace(conditionalRegex, (match, fieldPath, conditionalText) => {
            fieldPath = fieldPath.trim();
            
            // Special check for isPlayer and isNPC
            if (fieldPath === 'isPlayer') {
                const isPlayer = character.title && character.title.startsWith('[PLAYER]');
                return isPlayer ? conditionalText : '';
            }
            if (fieldPath === 'isNPC') {
                const isNPC = character.title && character.title.startsWith('[CHARACTER]');
                return isNPC ? conditionalText : '';
            }
            
            const value = getNestedValue(character, fieldPath);
            
            // If field has no value, remove the entire conditional block
            if (value === null || value === undefined || value === '') {
                return '';
            }
            
            // Replace nested {field} references within the conditional text
            return conditionalText.replace(/\{([^}]+)\}/g, (m, field) => {
                if (field === fieldPath) {
                    return value; // Replace with the main field value
                }
                return getNestedValue(character, field) || '';
            });
        });
        
        // Handle simple field replacements {field}
        result = result.replace(/\{([^}]+)\}/g, (match, fieldPath) => {
            fieldPath = fieldPath.trim();
            
            // Special handling for coreStats
            if (fieldPath === 'coreStats') {
                let statsText = '';
                if (character.coreStats) {
                    for (const [statName, statData] of Object.entries(character.coreStats)) {
                        statsText += ` | ${statName.toUpperCase()}: ${statData.current}/${statData.max}`;
                    }
                }
                return statsText;
            }
            
            const value = getNestedValue(character, fieldPath);
            return value !== null && value !== undefined ? value : '???';
        });
        
        return result;
    }
    
    // Keep formatInfoLine as an alias for backwards compatibility
    function formatInfoLine(template, character) {
        return formatTemplate(template, character);
    }
    
    function formatSectionData(data, format, character) {
        switch (format) {
            case 'pipe_delimited':
                return Object.entries(data)
                    .map(([key, value]) => `${key.toUpperCase()}: ${value}`)
                    .join(' | ');
                
            case 'skill_levels':
                return Object.entries(data)
                    .map(([skill, info]) => 
                        `${skill}: Level ${info.level} (${info.xp.current}/${info.xp.max} XP)`)
                    .join('\n');
                
            case 'braced_list':
                const items = Object.entries(data)
                    .filter(([_, qty]) => qty > 0)
                    .map(([item, qty]) => `${item}:${qty}`);
                return items.length > 0 ? `{${items.join(', ')}}` : '{}';
                
            case 'equals_value':
                return Object.entries(data)
                    .map(([name, value]) => {
                        const flavor = getRelationshipFlavor(value, character.name, name);
                        return `${name}=${value} [${flavor}]`;
                    })
                    .join('\n');
                
            case 'plain_text':
                return data || '';
                
            case 'key_value':
                return Object.entries(data)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join('\n');
                
            case 'single_value':
                return data.toString();
                
            default:
                return typeof data === 'object' ? JSON.stringify(data, null, 2) : data;
        }
    }
    
    function processLevelUp(character, schema) {
        const nextLevel = character.level + 1;
        const requiredXP = calculateXPRequirement(nextLevel, schema.levelProgression.formula, schema.levelProgression.overrides);
        
        if (character.xp.current >= requiredXP) {
            // Level up!
            const overflow = character.xp.current - requiredXP;
            character.level = nextLevel;
            
            // Calculate XP for next level
            const nextRequirement = calculateXPRequirement(nextLevel + 1, schema.levelProgression.formula, schema.levelProgression.overrides);
            character.xp.current = overflow;
            character.xp.max = nextRequirement;
            
            // Calculate HP gain
            const hpSchema = schema.coreStats.HP || schema.coreStats.hp;
            if (hpSchema && hpSchema.perLevelFormula) {
                const hpGain = calculateStatGain(hpSchema.perLevelFormula, character, schema);
                character.hp.max += hpGain;
                character.hp.current = character.hp.max; // Heal to full on level up
            }
            
            // Calculate other stat gains
            for (const [statName, statSchema] of Object.entries(schema.coreStats)) {
                if (statName.toLowerCase() !== 'hp' && statSchema.perLevelFormula) {
                    const statKey = statName.toLowerCase();
                    if (!character.coreStats[statKey]) {
                        character.coreStats[statKey] = {
                            current: statSchema.default || 0,
                            max: statSchema.default || 0
                        };
                    }
                    const gain = calculateStatGain(statSchema.perLevelFormula, character, schema);
                    character.coreStats[statKey].max += gain;
                    character.coreStats[statKey].current = character.coreStats[statKey].max;
                }
            }
            
            if (debug) console.log(`${MODULE_NAME}: ${character.name} leveled up to ${nextLevel}!`);
            
            // Check if we can level up again
            processLevelUp(character, schema);
        }
    }
    
    function calculateStatGain(formula, character, schema) {
        try {
            // Replace attribute references
            let safeFormula = formula;
            for (const [attr, value] of Object.entries(character.attributes || {})) {
                const regex = new RegExp(attr.toUpperCase(), 'g');
                safeFormula = safeFormula.replace(regex, value);
            }
            
            // Replace MaxHP reference if present
            safeFormula = safeFormula.replace(/MaxHP/gi, character.hp.max);
            
            // Replace level reference
            safeFormula = safeFormula.replace(/level/gi, character.level);
            
            // Evaluate and round
            return Math.round(eval(safeFormula));
        } catch (e) {
            if (debug) console.log(`${MODULE_NAME}: Error calculating stat gain: ${e}`);
            return 5; // Default gain
        }
    }
    
    function processSkillLevelUp(skill, skillName, schema) {
        const nextLevel = skill.level + 1;
        const requiredXP = calculateSkillXPRequirement(skillName, nextLevel, schema);
        
        if (skill.xp.current >= requiredXP) {
            const overflow = skill.xp.current - requiredXP;
            skill.level = nextLevel;
            
            // Calculate XP for next level
            const nextRequirement = calculateSkillXPRequirement(skillName, nextLevel + 1, schema);
            skill.xp.current = overflow;
            skill.xp.max = nextRequirement;
            
            if (debug) console.log(`${MODULE_NAME}: Skill ${skillName} leveled up to ${nextLevel}!`);
            
            // Check if we can level up again
            processSkillLevelUp(skill, skillName, schema);
        }
    }
    
    // ==========================
    // Character Creation
    // ==========================
    function createCharacter(characterData) {
        const schema = loadRPGSchema();
        const format = loadCharacterFormat();
        
        // Determine character type (PLAYER or CHARACTER/NPC)
        const isPlayer = characterData.isPlayer || false;
        const cardPrefix = isPlayer ? '[PLAYER]' : '[CHARACTER]';
        
        // Required fields
        if (!characterData.name) {
            if (debug) console.log(`${MODULE_NAME}: Cannot create character without name`);
            return null;
        }
        
        // Build character object with defaults
        const character = {
            title: `${cardPrefix} ${characterData.name}`,
            name: characterData.name,
            fullName: characterData.fullName || null,
            triggerName: characterData.triggerName || null,  // Preserve trigger name if provided
            dob: characterData.dob || null,
            gender: characterData.gender || '???',
            hp: {
                current: characterData.hp?.current || characterData.hp || schema.coreStats.HP?.default || schema.coreStats.hp?.default || 100,
                max: characterData.hp?.max || characterData.hp || schema.coreStats.HP?.default || schema.coreStats.hp?.default || 100
            },
            level: characterData.level || 1,
            xp: {
                current: characterData.xp?.current || 0,
                max: calculateXPRequirement((characterData.level || 1) + 1, schema.levelProgression.formula, schema.levelProgression.overrides)
            },
            location: characterData.location || 'unknown',
            coreStats: {},
            attributes: {},
            skills: {},
            inventory: {},
            relationships: {},
            rawSections: {}
        };
        
        // Initialize attributes from schema
        for (const attr of schema.attributes.master) {
            const attrKey = attr.toLowerCase();
            character.attributes[attrKey] = characterData.attributes?.[attrKey] || 10;
        }
        
        // Add any additional attributes provided
        if (characterData.attributes) {
            for (const [key, value] of Object.entries(characterData.attributes)) {
                character.attributes[key.toLowerCase()] = value;
            }
        }
        
        // Initialize core stats from schema
        for (const [statName, statSchema] of Object.entries(schema.coreStats)) {
            const statKey = statName.toLowerCase();
            if (statKey !== 'hp') {
                const providedStat = characterData.coreStats?.[statKey];
                character.coreStats[statKey] = {
                    current: providedStat?.current || providedStat || statSchema.default || 0,
                    max: providedStat?.max || providedStat || statSchema.default || 0
                };
            }
        }
        
        // Add skills if provided
        if (characterData.skills) {
            for (const [skillName, skillData] of Object.entries(characterData.skills)) {
                const skillKey = skillName.toLowerCase().replace(/\s+/g, '_');
                if (typeof skillData === 'object') {
                    character.skills[skillKey] = {
                        level: skillData.level || 1,
                        xp: {
                            current: skillData.xp?.current || 0,
                            max: skillData.xp?.max || calculateSkillXPRequirement(skillKey, (skillData.level || 1) + 1, schema)
                        }
                    };
                } else {
                    // If just a number, treat as level
                    character.skills[skillKey] = {
                        level: skillData,
                        xp: {
                            current: 0,
                            max: calculateSkillXPRequirement(skillKey, skillData + 1, schema)
                        }
                    };
                }
            }
        }
        
        // Add inventory if provided
        if (characterData.inventory) {
            for (const [item, qty] of Object.entries(characterData.inventory)) {
                const itemKey = item.toLowerCase().replace(/\s+/g, '_');
                character.inventory[itemKey] = qty;
            }
        }
        
        // Add relationships if provided
        if (characterData.relationships) {
            for (const [target, value] of Object.entries(characterData.relationships)) {
                const targetKey = target.toLowerCase().replace(/\s+/g, '_');
                character.relationships[targetKey] = value;
            }
        }
        
        // Add custom sections based on format
        for (const section of format.sections) {
            // Skip standard sections we've already handled
            if (['attributes', 'skills', 'inventory', 'relationships'].includes(section.id)) {
                continue;
            }
            
            // Check if data was provided for this custom section
            if (characterData[section.id]) {
                character[section.id] = characterData[section.id];
            }
        }
        
        // Save the character
        if (saveCharacter(character)) {
            // Clear cache to include new character
            characterCache = null;
            if (debug) console.log(`${MODULE_NAME}: Created character ${character.name}`);
            return character;
        }
        
        return null;
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
    function processGetters(text) {
        if (!text) return text;
        
        // Load runtime variables once for this pass
        const runtimeVars = loadRuntimeVariables();
        
        return text.replace(GETTER_PATTERN, function(match) {
            // Parse the getter: get_something(parameters)
            const innerMatch = match.match(/get_([a-z_]+)\s*\(([^)]*)\)/i);
            if (!innerMatch) return match;
            
            const getterType = innerMatch[1];
            const paramString = innerMatch[2];
            const params = parseParameters(paramString);
            
            // Process different getter types
            switch(getterType) {
                // Character getters
                case 'location':
                    return getCharacterLocation(params[0]) || '???';
                    
                case 'hp':
                    return getCharacterHP(params[0]) || '0/0';
                    
                case 'level':
                    return getCharacterLevel(params[0]) || '1';
                    
                case 'xp':
                    return getCharacterXP(params[0]) || '0/100';
                    
                case 'name':
                    return getCharacterName(params[0]) || 'Unknown';
                    
                case 'attribute':
                    return getCharacterAttribute(params[0], params[1]) || '0';
                    
                case 'skill':
                    return getCharacterSkill(params[0], params[1]) || 'Not learned';
                    
                case 'inventory':
                    return getCharacterInventory(params[0]) || '{}';
                    
                case 'stat':
                    return getCharacterStat(params[0], params[1]) || '0/0';
                    
                // Time getters (Calendar API)
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
                    
                // World state getters
                case 'frontline':
                case 'playersalive':
                case 'playerstotal':
                    // Fall through to default handler
                    
                default:
                    // CHECK RUNTIME VARIABLES using exact getter name (snake_case)
                    const varName = getterType; // Use exact name, no conversion!
                    
                    if (runtimeVars[varName]) {
                        const value = getRuntimeValue(varName);
                        if (value !== null) {
                            return typeof value === 'object' ? JSON.stringify(value) : String(value);
                        }
                    }
                    
                    if (debug) console.log(`${MODULE_NAME}: Unknown getter type: ${getterType}`);
                    return match;
            }
        });
    }
    
    // Character getter functions
    function getCharacterLocation(name) {
        if (!name) return null;
        const characters = loadAllCharacters();
        const character = characters[String(name).toLowerCase()];
        return character ? character.location : null;
    }
    
    function getCharacterHP(name) {
        if (!name) return null;
        const characters = loadAllCharacters();
        const character = characters[String(name).toLowerCase()];
        return character ? `${character.hp.current}/${character.hp.max}` : null;
    }
    
    function getCharacterLevel(name) {
        if (!name) return null;
        const characters = loadAllCharacters();
        const character = characters[String(name).toLowerCase()];
        return character ? character.level.toString() : null;
    }
    
    function getCharacterXP(name) {
        if (!name) return null;
        const characters = loadAllCharacters();
        const character = characters[String(name).toLowerCase()];
        return character ? `${character.xp.current}/${character.xp.max}` : null;
    }
    
    function getCharacterName(name) {
        if (!name) return null;
        const characters = loadAllCharacters();
        const character = characters[String(name).toLowerCase()];
        return character ? character.name : null;
    }
    
    function getCharacterAttribute(characterName, attrName) {
        if (!characterName || !attrName) return null;
        
        const characters = loadAllCharacters();
        const character = characters[String(characterName).toLowerCase()];
        if (!character) return null;
        
        const attrKey = String(attrName).toLowerCase();
        return character.attributes[attrKey] ? character.attributes[attrKey].toString() : null;
    }
    
    function getCharacterSkill(characterName, skillName) {
        if (!characterName || !skillName) return null;
        
        const characters = loadAllCharacters();
        const character = characters[String(characterName).toLowerCase()];
        if (!character) return null;
        
        const skillKey = String(skillName).toLowerCase();
        const skill = character.skills[skillKey];
        return skill ? `Level ${skill.level} (${skill.xp.current}/${skill.xp.max} XP)` : null;
    }
    
    function getCharacterInventory(name) {
        if (!name) return null;
        const characters = loadAllCharacters();
        const character = characters[String(name).toLowerCase()];
        if (!character) return null;
        
        const items = Object.entries(character.inventory || {})
            .filter(([item, qty]) => qty !== 0)
            .map(([item, qty]) => `${item}:${qty}`);
        
        return items.length > 0 ? `{${items.join(', ')}}` : '{}';
    }
    
    function getCharacterStat(characterName, statName) {
        if (!characterName || !statName) return null;
        
        const characters = loadAllCharacters();
        const character = characters[String(characterName).toLowerCase()];
        if (!character) return null;
        
        const statKey = String(statName).toLowerCase();
        
        // Check if it's HP (special case)
        if (statKey === 'hp') {
            return `${character.hp.current}/${character.hp.max}`;
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
            `[**Current Scene** Floor get_current_floor() | get_location(${playerName}) | get_formattedtime() (get_timeofday())\n` +
            `**Available Tools:**\n` +
            `• Location: update_location(name, place) discover_location(character, place, direction) connect_locations(placeA, placeB, direction)\n` +
            `  - Directions: north, south, east, west, inside (enter), outside (exit)\n` +
            `• SAO: advance_to_floor(character, floor) set_current_floor(floor) complete_floor(floor)\n` +
            `• Time: advance_time(hours, minutes)\n` +
            `• Inventory: add_item(name, item, qty) remove_item(name, item, qty) transfer_item(giver, receiver, item, qty)\n` +
            `• Relations: update_relationship(name1, name2, points)\n` +
            `• Quests: offer_quest(npc, quest, type) update_quest(player, quest, stage) complete_quest(player, quest)\n` +
            `• Progression: add_levelxp(name, amount) add_skillxp(name, skill, amount) unlock_newskill(name, skill)\n` +
            `• Stats: update_attribute(name, attribute, value) update_health(name, current, max)\n` +
            `• Combat: deal_damage(source, target, amount) death(name)]`
        );
        
        Utilities.storyCard.add({
            title: '[CURRENT SCENE]',
            type: 'data',
            entry: defaultText,
            description: 'Edit this card to customize what appears in the scene block. Use get_*(params) for dynamic values.'
        });
        
        if (debug) console.log(`${MODULE_NAME}: Created default Current Scene template with player: ${playerName}`);
        return defaultText;
    }
    
    function injectCurrentScene(contextText) {
        // If no history or very early in adventure, don't inject scene yet
        if (!history || history.length < 3) {
            return contextText;
        }
        
        // Get or create the Current Scene card
        let sceneCard = Utilities.storyCard.get('[CURRENT SCENE]');
        if (!sceneCard) {
            createDefaultCurrentScene();
            sceneCard = Utilities.storyCard.get('[CURRENT SCENE]');
        }
        
        // Just use the raw entry text - getters will be processed later
        const sceneText = sceneCard.entry;
        
        // Use -3 to give more breathing room for the actual scene
        const targetIndex = history.length - 3;
        const historyEntry = history[targetIndex];
        
        if (!historyEntry || !historyEntry.text) {
            return contextText;
        }
        
        const lastEntry = historyEntry.text;
        
        // Find where this history entry appears in the context
        const entryIndex = contextText.indexOf(lastEntry);
        if (entryIndex === -1) {
            return sceneText + '\n\n' + contextText;
        }
        
        // Find end of first sentence within that entry
        const firstSentenceMatch = lastEntry.match(/^[^.!?]+[.!?]/);
        if (!firstSentenceMatch) {
            return sceneText + '\n\n' + contextText;
        }
        
        const firstSentence = firstSentenceMatch[0];
        const insertPosition = entryIndex + firstSentence.length;
        
        // Check what comes after the first sentence
        const afterSentence = contextText.substring(insertPosition);
        let separator = '\n\n';
        if (afterSentence.startsWith('\n')) {
            separator = afterSentence.match(/^\n+/)[0].length >= 2 ? '' : '\n';
        }
        
        // Build the new context with scene inserted
        const beforeInsert = contextText.substring(0, insertPosition);
        const afterInsert = contextText.substring(insertPosition).trimStart();
        
        return beforeInsert + separator + sceneText + '\n\n' + afterInsert;
    }
    
    // ==========================
    // Tool Processors (converted to standard syntax)
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
            
            characterName = String(characterName).toLowerCase();
            location = String(location).toLowerCase().replace(/\s+/g, '_');
            
            const characters = loadAllCharacters();
            const character = characters[characterName];
            
            if (!character) {
                trackUnknownEntity(characterName, 'update_location', info?.actionCount);
                if (shouldTriggerGeneration(characterName)) {
                    addToEntityQueue(characterName);
                }
                if (debug) console.log(`${MODULE_NAME}: Unknown character ${characterName} referenced in update_location`);
            } else {
                character.location = location;
                saveCharacter(character);
                if (debug) console.log(`${MODULE_NAME}: ${character.name} moved to ${location}`);
            }
            
            return 'executed';
        },
        
        add_item: function(characterName, itemName, quantity) {
            if (!characterName || !itemName) return 'malformed';
            
            characterName = String(characterName).toLowerCase();
            itemName = String(itemName).toLowerCase().replace(/\s+/g, '_');
            quantity = parseInt(quantity);
            
            // 0 or invalid quantity is malformed
            if (isNaN(quantity) || quantity === 0) {
                if (debug) console.log(`${MODULE_NAME}: Invalid quantity for add_item: ${quantity}`);
                return 'malformed';
            }
            
            const characters = loadAllCharacters();
            const character = characters[characterName];
            
            if (!character) {
                if (debug) console.log(`${MODULE_NAME}: Character ${characterName} not found`);
                return 'executed'; // Still executed, just no character
            }
            
            const currentQty = character.inventory[itemName] || 0;
            const newQty = Math.max(0, currentQty + quantity);
            
            character.inventory[itemName] = newQty;
            if (debug) console.log(`${MODULE_NAME}: ${character.name}'s ${itemName}: ${currentQty} → ${newQty}`);
            
            saveCharacter(character);
            return 'executed';
        },
        
        remove_item: function(characterName, itemName, quantity) {
            if (!characterName || !itemName) return 'malformed';
            
            characterName = String(characterName).toLowerCase();
            itemName = String(itemName).toLowerCase().replace(/\s+/g, '_');
            quantity = parseInt(quantity);
            
            // 0 or invalid quantity is malformed
            if (isNaN(quantity) || quantity <= 0) {
                if (debug) console.log(`${MODULE_NAME}: Invalid quantity for remove_item: ${quantity}`);
                return 'malformed';
            }
            
            const characters = loadAllCharacters();
            const character = characters[characterName];
            
            if (!character) return 'executed';
            
            const currentQty = character.inventory[itemName] || 0;
            const removeQty = Math.min(currentQty, quantity);
            const newQty = currentQty - removeQty;
            
            if (newQty === 0) {
                delete character.inventory[itemName];
                if (debug) console.log(`${MODULE_NAME}: Removed all ${itemName} from ${character.name}`);
            } else {
                character.inventory[itemName] = newQty;
                if (debug) console.log(`${MODULE_NAME}: Removed ${removeQty} ${itemName} from ${character.name} (${currentQty} → ${newQty})`);
            }
            
            saveCharacter(character);
            return 'executed';
        },
        
        use_consumable: function(characterName, itemName, quantity) {
            // Identical validation to remove_item
            return toolProcessors.remove_item(characterName, itemName, quantity);
        },
        
        transfer_item: function(giverName, receiverName, itemName, quantity) {
            if (!giverName || !receiverName || !itemName) return 'malformed';
            
            giverName = String(giverName).toLowerCase();
            receiverName = String(receiverName).toLowerCase();
            itemName = String(itemName).toLowerCase().replace(/\s+/g, '_');
            const requestedQty = parseInt(quantity);
            
            // 0 or invalid quantity is malformed
            if (isNaN(requestedQty) || requestedQty <= 0) {
                if (debug) console.log(`${MODULE_NAME}: Invalid quantity for transfer_item: ${quantity}`);
                return 'malformed';
            }
            
            const characters = loadAllCharacters();
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
                const availableQty = giver.inventory[itemName] || 0;
                transferQty = Math.min(availableQty, requestedQty);
                
                if (transferQty > 0) {
                    const newGiverQty = availableQty - transferQty;
                    if (newGiverQty === 0) {
                        delete giver.inventory[itemName];
                    } else {
                        giver.inventory[itemName] = newGiverQty;
                    }
                    
                    saveCharacter(giver);
                    anySuccess = true;
                    
                    if (debug) console.log(`${MODULE_NAME}: Removed ${transferQty} ${itemName} from ${giver.name}`);
                } else {
                    if (debug) console.log(`${MODULE_NAME}: ${giver.name} has no ${itemName} to transfer`);
                    return 'executed'; // Valid attempt, just no items
                }
            }
            
            if (receiver) {
                const currentReceiverQty = receiver.inventory[itemName] || 0;
                receiver.inventory[itemName] = currentReceiverQty + transferQty;
                
                saveCharacter(receiver);
                anySuccess = true;
                
                if (debug) console.log(`${MODULE_NAME}: Added ${transferQty} ${itemName} to ${receiver.name}`);
            }
            
            return anySuccess ? 'executed' : 'executed';
        },
        
        deal_damage: function(sourceName, targetName, damageAmount) {
            if (!targetName) return 'malformed';
            
            sourceName = sourceName ? String(sourceName).toLowerCase() : 'unknown';
            targetName = String(targetName).toLowerCase();
            damageAmount = parseInt(damageAmount);
            
            // 0 or negative damage is malformed
            if (isNaN(damageAmount) || damageAmount <= 0) {
                if (debug) console.log(`${MODULE_NAME}: Invalid damage amount: ${damageAmount}`);
                return 'malformed';
            }
            
            const characters = loadAllCharacters();
            const target = characters[targetName];
            const source = characters[sourceName];
            
            // Don't track for deal_damage - could be environmental/trap damage
            if (!target) {
                if (debug) console.log(`${MODULE_NAME}: Target ${targetName} not found`);
                return 'executed';
            }
            
            const sourceDisplay = source ? source.name : sourceName;
            
            const oldHP = target.hp.current;
            target.hp.current = Math.max(0, target.hp.current - damageAmount);
            const actualDamage = oldHP - target.hp.current;
            
            if (debug) {
                console.log(`${MODULE_NAME}: ${sourceDisplay} dealt ${actualDamage} damage to ${target.name} (${oldHP} → ${target.hp.current}/${target.hp.max})`);
            }
            
            saveCharacter(target);
            return 'executed';
        },
        
        add_levelxp: function(characterName, xpAmount) {
            if (!characterName) return 'malformed';
            
            characterName = String(characterName).toLowerCase();
            xpAmount = parseInt(xpAmount);
            
            // 0 or invalid XP is malformed
            if (isNaN(xpAmount) || xpAmount <= 0) {
                if (debug) console.log(`${MODULE_NAME}: Invalid XP amount: ${xpAmount}`);
                return 'malformed';
            }
            
            const characters = loadAllCharacters();
            const character = characters[characterName];
            
            if (!character) {
                trackUnknownEntity(characterName, 'add_levelxp', info?.actionCount);
                if (shouldTriggerGeneration(characterName)) {
                    addToEntityQueue(characterName);
                }
                return 'executed';
            }
            
            const schema = loadRPGSchema();
            character.xp.current += xpAmount;
            
            if (debug) console.log(`${MODULE_NAME}: Added ${xpAmount} XP to ${character.name} (${character.xp.current}/${character.xp.max})`);
            
            processLevelUp(character, schema);
            saveCharacter(character);
            return 'executed';
        },
        
        add_skillxp: function(characterName, skillName, xpAmount) {
            if (!characterName || !skillName) return 'malformed';
            
            characterName = String(characterName).toLowerCase();
            skillName = String(skillName).toLowerCase().replace(/\s+/g, '_');
            xpAmount = parseInt(xpAmount);
            
            // 0 or invalid XP is malformed
            if (isNaN(xpAmount) || xpAmount <= 0) {
                if (debug) console.log(`${MODULE_NAME}: Invalid skill XP amount: ${xpAmount}`);
                return 'malformed';
            }
            
            const characters = loadAllCharacters();
            const character = characters[characterName];
            
            if (!character) {
                trackUnknownEntity(characterName, 'add_skillxp', info?.actionCount);
                if (shouldTriggerGeneration(characterName)) {
                    addToEntityQueue(characterName);
                }
                return 'executed';
            }
            
            if (!character.skills[skillName]) {
                if (debug) console.log(`${MODULE_NAME}: Skill ${skillName} not found on ${character.name}`);
                return 'executed';
            }
            
            const schema = loadRPGSchema();
            const skill = character.skills[skillName];
            skill.xp.current += xpAmount;
            
            if (debug) console.log(`${MODULE_NAME}: Added ${xpAmount} XP to ${character.name}'s ${skillName} (${skill.xp.current}/${skill.xp.max})`);
            
            processSkillLevelUp(skill, skillName, schema);
            saveCharacter(character);
            return 'executed';
        },
        
        unlock_newskill: function(characterName, skillName) {
            if (!characterName || !skillName) return 'malformed';
            
            characterName = String(characterName).toLowerCase();
            skillName = String(skillName).toLowerCase().replace(/\s+/g, '_');
            
            const characters = loadAllCharacters();
            const character = characters[characterName];
            
            if (!character) {
                trackUnknownEntity(characterName, 'unlock_newskill', info?.actionCount);
                if (shouldTriggerGeneration(characterName)) {
                    addToEntityQueue(characterName);
                }
                return 'executed';
            }
            
            const schema = loadRPGSchema();
            
            if (!schema.skills.definitions[skillName]) {
                if (debug) console.log(`${MODULE_NAME}: Skill ${skillName} not in schema`);
                return 'executed';
            }
            
            if (character.skills[skillName]) {
                if (debug) console.log(`${MODULE_NAME}: ${character.name} already has ${skillName}`);
                return 'executed';
            }
            
            const maxXP = calculateSkillXPRequirement(skillName, 2, schema);
            character.skills[skillName] = {
                level: 1,
                xp: {
                    current: 0,
                    max: maxXP
                }
            };
            
            if (debug) console.log(`${MODULE_NAME}: ${character.name} learned ${skillName}!`);
            
            saveCharacter(character);
            return 'executed';
        },
        
        update_attribute: function(characterName, attrName, value) {
            if (!characterName || !attrName) return 'malformed';
            
            characterName = String(characterName).toLowerCase();
            attrName = String(attrName).toLowerCase();
            value = parseInt(value);
            
            if (isNaN(value) || value <= 0) {
                if (debug) console.log(`${MODULE_NAME}: Invalid attribute value: ${value}`);
                return 'malformed';
            }
            
            // ONLY validate against schema - data-driven!
            const schema = loadRPGSchema();
            
            if (!schema.attributes || Object.keys(schema.attributes).length === 0) {
                if (debug) console.log(`${MODULE_NAME}: No attributes defined in [RPG_SCHEMA] Attributes card`);
                return 'malformed';
            }
            
            const schemaAttrs = Object.keys(schema.attributes).map(a => a.toLowerCase());
            if (!schemaAttrs.includes(attrName)) {
                if (debug) console.log(`${MODULE_NAME}: Invalid attribute '${attrName}' - must be one of: ${schemaAttrs.join(', ')}`);
                return 'malformed';
            }
            
            const characters = loadAllCharacters();
            const character = characters[characterName];
            
            if (!character) return 'executed';
            
            character.attributes[attrName] = value;
            
            if (debug) console.log(`${MODULE_NAME}: Set ${character.name}'s ${attrName} to ${value}`);
            
            saveCharacter(character);
            return 'executed';
        },
        
        update_relationship: function(name1, name2, changeAmount) {
            if (!name1 || !name2) return 'malformed';
            
            name1 = String(name1).toLowerCase();
            name2 = String(name2).toLowerCase();
            changeAmount = parseInt(changeAmount);
            
            // 0 change is malformed (why call it?)
            if (isNaN(changeAmount) || changeAmount === 0) {
                if (debug) console.log(`${MODULE_NAME}: Invalid relationship change: ${changeAmount}`);
                return 'malformed';
            }
            
            const characters = loadAllCharacters();
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
                if (debug) console.log(`${MODULE_NAME}: One or both characters not found: ${name1}, ${name2}`);
                return 'executed';
            }
            
            // Update bidirectional relationships
            if (!char1.relationships[name2]) char1.relationships[name2] = 0;
            if (!char2.relationships[name1]) char2.relationships[name1] = 0;
            
            char1.relationships[name2] += changeAmount;
            char2.relationships[name1] += changeAmount;
            
            const flavorText1 = getRelationshipFlavor(char1.relationships[name2], char1.name, char2.name);
            const flavorText2 = getRelationshipFlavor(char2.relationships[name1], char2.name, char1.name);
            
            saveCharacter(char1);
            saveCharacter(char2);
            
            if (debug) {
                console.log(`${MODULE_NAME}: ${char1.name}→${char2.name}: ${flavorText1}`);
                console.log(`${MODULE_NAME}: ${char2.name}→${char1.name}: ${flavorText2}`);
            }
            
            return 'executed';
        },
        
        discover_location: function(characterName, locationName, direction) {
            // Validate inputs
            if (!characterName || !locationName || !direction) return 'malformed';
            
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
            const characters = loadAllCharacters();
            const character = characters[characterName];
            
            if (!character) {
                if (debug) console.log(`${MODULE_NAME}: Character ${characterName} not found`);
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
            
            if (playerName) {
                const allChars = loadAllCharacters();
                const player = allChars[playerName.toLowerCase()];
                if (player) {
                    // Get current floor from runtime or default to 1
                    const currentFloor = getRuntimeValue('current_floor') || 1;
                    
                    // Convert floor number to words for header
                    const floorWords = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
                    let floorName;
                    if (currentFloor >= 0 && currentFloor < floorWords.length) {
                        floorName = 'Floor ' + floorWords[currentFloor];
                    } else {
                        floorName = 'Floor ' + currentFloor;
                    }
                    locationHeaders = '<$# Locations>\n<$## ' + floorName + '>';
                }
            }
            
            // Allow override via runtime variable if set
            const customHeader = getRuntimeValue('location_header');
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
            
            const locationEntry = (
                locationHeaders + '\n' +
                '## **' + locationName + '**\n' +
                'Type: Unknown | Terrain: Unexplored\n' +
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
        
        // TODO: Future resident management tools
        // add_resident: function(characterName, locationName, role) { }
        // remove_resident: function(characterName, locationName) { }
        
        accept_quest: function(playerName, questName, questGiver, questType) {
            // Must have all 4 parameters
            if (!playerName || !questName || !questGiver || !questType) return 'malformed';
            
            // Normalize quest type to lowercase - handle both "story" and "story_quest" formats
            let normalizedType = String(questType).toLowerCase();
            
            // Strip "_quest" suffix if present
            if (normalizedType.endsWith('_quest')) {
                normalizedType = normalizedType.substring(0, normalizedType.length - 6);
            }
            
            // Load quest types from schema
            const questSchema = Utilities.storyCard.get('[RPG_SCHEMA] Quest Types');
            let validTypes = ['story', 'side', 'hidden', 'raid']; // Default fallback
            let stageRanges = {};
            
            if (questSchema && questSchema.value) {
                const parsed = Utilities.config.load('[RPG_SCHEMA] Quest Types');
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
            // TODO: Future implementation for NPC offering quests
            if (!npcName || !questName) return 'malformed';
            
            if (debug) console.log(`${MODULE_NAME}: TODO - offer_quest: ${npcName} offers ${questName}`);
            return 'executed';
        },
        
        update_quest: function(characterName, questName, objective, progress, total) {
            if (!questName) return 'malformed';
            
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
            
            characterName = String(characterName).toLowerCase();
            if (debug) console.log(`${MODULE_NAME}: Death recorded for: ${characterName}`);
            return 'executed';
        },
        
        get_player_name: function() {
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
            
            if (debug) console.log(`${MODULE_NAME}: Player name is: ${playerName}`);
            return playerName || 'unknown';
        },
        
        update_character_format: function(section, newTemplate) {
            if (!section || !newTemplate) return 'malformed';
            
            // Get current character format
            const formatCard = Utilities.storyCard.get('[RPG_SCHEMA] Character Format');
            if (!formatCard) {
                if (debug) console.log(`${MODULE_NAME}: Character Format card not found`);
                return 'malformed';
            }
            
            // Parse the current format
            const lines = formatCard.entry.split('\n');
            let inSection = null;
            let updatedLines = [];
            let sectionUpdated = false;
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const trimmed = line.trim();
                
                // Check for section headers
                if (trimmed.startsWith('# ')) {
                    inSection = trimmed.substring(2).toLowerCase().replace(/\s+/g, '_');
                    updatedLines.push(line);
                } else if (inSection === section.toLowerCase().replace(/\s+/g, '_')) {
                    // We're in the target section - replace the template line
                    if (!sectionUpdated && trimmed !== '' && !trimmed.startsWith('#')) {
                        updatedLines.push(newTemplate);
                        sectionUpdated = true;
                        // Skip the original line
                    } else {
                        updatedLines.push(line);
                    }
                } else {
                    updatedLines.push(line);
                }
            }
            
            if (!sectionUpdated) {
                if (debug) console.log(`${MODULE_NAME}: Section ${section} not found in Character Format`);
                return 'malformed';
            }
            
            // Update the card
            Utilities.storyCard.update('[RPG_SCHEMA] Character Format', {
                entry: updatedLines.join('\n')
            });
            
            if (debug) console.log(`${MODULE_NAME}: Updated character format section: ${section}`);
            return 'executed';
        }
    };
    
    // ==========================
    // Entity Tracking System
    // ==========================
    function loadEntityTrackerConfig() {
        // Use centralized sectioned config loader
        const sections = Utilities.config.loadSectioned('[RPG_RUNTIME] Entity Tracker Config', '# ');
        
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
        
        // Check if this character already exists in story cards
        const characterCards = Utilities.storyCard.find(card => {
            if (!card.title.startsWith('[CHARACTER]') && !card.title.startsWith('[PLAYER]')) {
                return false;
            }
            
            // Check if title matches
            const titleMatch = card.title.match(/\[(CHARACTER|PLAYER)\]\s+(.+)/);
            if (titleMatch && titleMatch[2] && titleMatch[2].toLowerCase() === entityName) {
                return true;
            }
            
            // Check if any key matches
            const keyMatch = card.entry.match(/Keys:\s*([^\n]+)/i);
            if (keyMatch) {
                const keys = keyMatch[1].split(',').map(k => k.trim().toLowerCase());
                if (keys.includes(entityName)) {
                    return true;
                }
            }
            
            return false;
        }, true);
        
        // If character already exists, don't track
        if (characterCards && characterCards.length > 0) {
            if (debug) console.log(`${MODULE_NAME}: Skipping tracking for existing character: ${entityName}`);
            return;
        }
        
        // Load and check blacklist from config
        const config = loadEntityTrackerConfig();
        if (config.blacklist && config.blacklist.includes(entityName)) return;
        
        // Load tracker from config card's description field
        const configCard = Utilities.storyCard.get('[RPG_RUNTIME] Entity Tracker Config');
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
        
        Utilities.storyCard.update('[RPG_RUNTIME] Entity Tracker Config', {
            description: description
        });
        
        if (debug) console.log(`${MODULE_NAME}: Tracked unknown entity ${entityName} (unique turns: ${tracker[entityName].uniqueTurns.length})`);
    }
    
    function shouldTriggerGeneration(entityName) {
        const config = loadEntityTrackerConfig();
        if (!config.autoGenerate) return false;
        
        // Normalize entity name
        entityName = entityName.toLowerCase();
        
        // Load tracker from config card's description
        const configCard = Utilities.storyCard.get('[RPG_RUNTIME] Entity Tracker Config');
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
        const queueCard = Utilities.storyCard.get('[RPG_RUNTIME] Entity Queue');
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
        
        // Instead of queuing, directly trigger GenerationWizard if available
        if (typeof GenerationWizard !== 'undefined' && GenerationWizard.startGeneration) {
            if (debug) console.log(`${MODULE_NAME}: Triggering GenerationWizard for entity: ${entityName}`);
            // Start NPC generation for the unknown entity
            GenerationWizard.startGeneration('NPC', {name: entityName});
            return;
        }
        
        // Fallback to queue system if GenerationWizard not available
        const queueCard = Utilities.storyCard.get('[RPG_RUNTIME] Entity Queue');
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
            Utilities.storyCard.update('[RPG_RUNTIME] Entity Queue', {
                entry: JSON.stringify(queue, null, 2),
                type: 'data'
            });
            
            if (debug) console.log(`${MODULE_NAME}: Added ${entityName} to entity generation queue`);
        }
    }
    
    function queuePendingEntities() {
        // Load queue from Story Card
        const queueCard = Utilities.storyCard.get('[RPG_RUNTIME] Entity Queue');
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
        Utilities.storyCard.update('[RPG_RUNTIME] Entity Queue', {
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
    
    function completeEntityGeneration(entityName) {
        // Normalize entity name
        entityName = entityName.toLowerCase();
        
        // Clear from tracker in config card's description
        const configCard = Utilities.storyCard.get('[RPG_RUNTIME] Entity Tracker Config');
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
                
                Utilities.storyCard.update('[RPG_RUNTIME] Entity Tracker Config', {
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
            
            if (debug) console.log(`${MODULE_NAME}: Found tool: ${toolName}(${paramString})`);
            
            // Parse parameters
            const params = parseParameters(paramString);
            
            // Capture revert data BEFORE executing the tool
            const revertData = captureRevertData(toolName.toLowerCase(), params);
            
            let result = processToolCall(toolName, params);
            
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
                // Normalize the quest type parameter in the visible text
                const normalizedParams = [...params];
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
                if (debug) console.log(`${MODULE_NAME}: Marking for removal (${result}): ${fullMatch}`);
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
    function captureRevertData(toolName, params) {
        const characters = loadAllCharacters();
        const revertData = {};
        
        switch(toolName) {
            case 'update_location':
                const char = characters[String(params[0]).toLowerCase()];
                if (char) revertData.oldLocation = char.location;
                break;
                
            case 'add_item':
                // No revert data needed - we just remove it on revert
                revertData.added = true;
                break;
                
            case 'remove_item':
                // Store that we removed it so we can add it back
                revertData.removed = true;
                break;
                
            case 'transfer_item':
                // Store the original transfer direction
                revertData.from = params[0];
                revertData.to = params[1];
                break;
                
            case 'deal_damage':
                const target = characters[String(params[1]).toLowerCase()];
                if (target && target.hp) {
                    revertData.oldHp = target.hp.current;
                }
                break;
                
            case 'update_relationship':
                const char1 = characters[String(params[0]).toLowerCase()];
                if (char1 && char1.relationships) {
                    const char2Name = String(params[1]).toLowerCase();
                    revertData.oldValue = char1.relationships[char2Name] || 0;
                }
                break;
                
            // Add more as needed
        }
        
        return revertData;
    }
    
    function processToolCall(toolName, params) {
        // Normalize tool name to lowercase for lookup
        const normalizedToolName = toolName.toLowerCase();
        
        // Check if it's a known tool
        if (toolProcessors[normalizedToolName]) {
            // Execute the tool
            const result = toolProcessors[normalizedToolName](...params);
            return result;
        }
        
        // Check for dynamic core stat tools (update_hp, update_mp, etc from schema)
        if (normalizedToolName.startsWith('update_')) {
            const schema = loadRPGSchema();
            const format = loadCharacterFormat();
            
            // Special handling for update_max_* pattern
            if (normalizedToolName.startsWith('update_max_')) {
                let statName = normalizedToolName.substring(11);
                
                // Check custom field mappings first (e.g., max_health -> hp.max)
                const customMapping = format.customFields[`max_${statName}`];
                if (customMapping && customMapping.includes('.')) {
                    // Extract the base stat name from mapping (e.g., hp.max -> hp)
                    statName = customMapping.split('.')[0];
                }
                
                // Check if it's a valid core stat from schema (case-insensitive)
                const upperStatName = statName.toUpperCase();
                const coreStatKeys = Object.keys(schema.coreStats).map(k => k.toUpperCase());
                if (coreStatKeys.includes(upperStatName)) {
                    processCoreStatTool(normalizedToolName, params);
                    return 'executed';
                }
            } else {
                // Check for update_[stat] pattern
                let statName = normalizedToolName.substring(7);
                
                // Check custom field mappings first (e.g., health -> hp.current)
                const customMapping = format.customFields[statName];
                if (customMapping && customMapping.includes('.')) {
                    // Extract the base stat name from mapping (e.g., hp.current -> hp)
                    statName = customMapping.split('.')[0];
                }
                
                // Check if it's a valid core stat from schema (case-insensitive)
                const upperStatName = statName.toUpperCase();
                const coreStatKeys = Object.keys(schema.coreStats).map(k => k.toUpperCase());
                if (coreStatKeys.includes(upperStatName)) {
                    processCoreStatTool(normalizedToolName, params);
                    return 'executed';
                }
            }
        }
        
        // Unknown tool
        if (debug) console.log(`${MODULE_NAME}: Unknown tool: ${toolName}`);
        return 'unknown';
    }
    
    function processCoreStatTool(toolName, params) {
        const schema = loadRPGSchema();
        const characterName = String(params[0]).toLowerCase();
        
        // Check for update_max_[stat] pattern
        if (toolName.startsWith('update_max_')) {
            let statName = toolName.substring(11);
            const format = loadCharacterFormat();
            
            // Check custom field mappings first
            const customMapping = format.customFields[`max_${statName}`];
            if (customMapping && customMapping.includes('.')) {
                // Extract the base stat name from mapping
                statName = customMapping.split('.')[0];
            }
            
            // Find the matching core stat (case-insensitive)
            const upperStatName = statName.toUpperCase();
            const matchingStatKey = Object.keys(schema.coreStats).find(k => k.toUpperCase() === upperStatName);
            
            if (!matchingStatKey) {
                if (debug) console.log(`${MODULE_NAME}: Unknown core stat: ${statName}`);
                return false;
            }
            
            const characters = loadAllCharacters();
            const character = characters[characterName];
            if (!character) {
                if (debug) console.log(`${MODULE_NAME}: Character ${characterName} not found`);
                return false;
            }
            
            const newMax = parseInt(params[1]);
            if (isNaN(newMax)) {
                if (debug) console.log(`${MODULE_NAME}: Invalid max value: ${params[1]}`);
                return false;
            }
            
            // Update max value
            if (matchingStatKey.toUpperCase() === 'HP') {
                character.hp.max = newMax;
                if (character.hp.current > newMax) {
                    character.hp.current = newMax;
                }
            } else {
                const statKey = matchingStatKey.toLowerCase();
                if (!character.coreStats[statKey]) {
                    character.coreStats[statKey] = { current: newMax, max: newMax };
                } else {
                    character.coreStats[statKey].max = newMax;
                    if (character.coreStats[statKey].current > newMax) {
                        character.coreStats[statKey].current = newMax;
                    }
                }
            }
            
            saveCharacter(character);
            if (debug) console.log(`${MODULE_NAME}: Set ${character.name}'s max ${statName} to ${newMax}`);
            return true;
        }
        
        // Check for update_[stat] pattern (current/max format)
        let statName = toolName.substring(7);
        const format = loadCharacterFormat();
        
        // Check custom field mappings first
        const customMapping = format.customFields[statName];
        if (customMapping && customMapping.includes('.')) {
            // Extract the base stat name from mapping
            statName = customMapping.split('.')[0];
        }
        
        // Find the matching core stat (case-insensitive)
        const upperStatName = statName.toUpperCase();
        const matchingStatKey = Object.keys(schema.coreStats).find(k => k.toUpperCase() === upperStatName);
        
        if (!matchingStatKey) {
            if (debug) console.log(`${MODULE_NAME}: Unknown core stat: ${statName}`);
            return false;
        }
        
        const characters = loadAllCharacters();
        const character = characters[characterName];
        if (!character) {
            if (debug) console.log(`${MODULE_NAME}: Character ${characterName} not found`);
            return false;
        }
        
        // Parse current/max - can be two params or one "current/max" string
        let current, max;
        if (params[1] && String(params[1]).includes('/')) {
            const parts = String(params[1]).split('/');
            current = parseInt(parts[0]);
            max = parseInt(parts[1]);
        } else {
            current = parseInt(params[1]);
            max = parseInt(params[2]);
        }
        
        if (isNaN(current) || isNaN(max)) {
            if (debug) console.log(`${MODULE_NAME}: Invalid format for ${statName}`);
            return false;
        }
        
        if (matchingStatKey.toUpperCase() === 'HP') {
            character.hp.current = current;
            character.hp.max = max;
        } else {
            const statKey = matchingStatKey.toLowerCase();
            if (!character.coreStats[statKey]) {
                character.coreStats[statKey] = {};
            }
            character.coreStats[statKey].current = current;
            character.coreStats[statKey].max = max;
        }
        
        saveCharacter(character);
        if (debug) console.log(`${MODULE_NAME}: Set ${character.name}'s ${statName} to ${current}/${max}`);
        return true;
    }
    
    // ==========================
    // Debug Helper Functions (only work when debug = true)
    // ==========================
    
    function debugTest(testName) {
        if (!debug) return "Debug mode disabled - set debug = true on line 4";
        
        const tests = {
            // Test GenerationWizard activation
            gw_activate: () => {
                if (typeof GenerationWizard === 'undefined') return "<<<GenerationWizard not available>>>";
                GenerationWizard.activate();
                return "\n<<<GenerationWizard activated - next input triggers selection>>>\n";
            },
            
            // Test entity generation for NPC
            gw_npc: () => {
                if (typeof GenerationWizard === 'undefined') return "<<<GenerationWizard not available>>>";
                const result = GenerationWizard.startGeneration('NPC', {name: 'Debug_Test_NPC'});
                const progressCard = Utilities.storyCard.get('[ENTITY_GEN] In Progress');
                const isActive = GenerationWizard.isActive();
                console.log(`[DEBUG] Started NPC generation for Debug_Test_NPC\nResult: ${result}\nActive: ${isActive}\nProgress card exists: ${progressCard ? 'yes' : 'no'}`);
                return "\n<<<Started NPC generation for Debug_Test_NPC>>>\n";
            },
            
            // Test entity generation for Monster  
            gw_monster: () => {
                if (typeof GenerationWizard === 'undefined') return "<<<GenerationWizard not available>>>";
                GenerationWizard.startGeneration('Monster', {name: 'Debug_Test_Monster'});
                return "\n<<<Started Monster generation for Debug_Test_Monster>>>\n";
            },
            
            // Test entity generation for Boss
            gw_boss: () => {
                if (typeof GenerationWizard === 'undefined') return "<<<GenerationWizard not available>>>";
                GenerationWizard.startGeneration('Boss', {name: 'Debug_Test_Boss'});
                return "\n<<<Started Boss generation for Debug_Test_Boss>>>\n";
            },
            
            // Test entity generation for Item
            gw_item: () => {
                if (typeof GenerationWizard === 'undefined') return "<<<GenerationWizard not available>>>";
                GenerationWizard.startGeneration('Item', {name: 'Debug_Test_Item'});
                return "\n<<<Started Item generation for Debug_Test_Item>>>\n";
            },
            
            // Test entity generation for Location
            gw_location: () => {
                if (typeof GenerationWizard === 'undefined') return "<<<GenerationWizard not available>>>";
                GenerationWizard.startGeneration('Location', null, {NAME: 'Debug_Test_Location'});
                return "\n<<<Started Location generation for Debug_Test_Location>>>\n";
            },
            
            // Test entity generation for Quest
            gw_quest: () => {
                if (typeof GenerationWizard === 'undefined') return "<<<GenerationWizard not available>>>";
                GenerationWizard.startGeneration('Quest', {name: 'Debug_Test_Quest'});
                return "\n<<<Started Quest generation for Debug_Test_Quest>>>\n";
            },
            
            // Force entity tracker trigger
            entity_trigger: () => {
                const testEntity = 'debug_goblin';
                for (let turn = 1; turn <= 5; turn++) {
                    trackUnknownEntity(testEntity, 'deal_damage', turn * 100);
                }
                return `Triggered entity tracking for '${testEntity}' - should queue for generation`;
            },
            
            // Test character creation
            char_create: () => {
                const char = createCharacter({
                    name: 'Debug_Character',
                    type: 'NPC',
                    level: 10,
                    attributes: { vitality: 15, strength: 12, dexterity: 10, agility: 8 },
                    hp: { current: 150, max: 150 },
                    location: 'debug_zone'
                });
                saveCharacter(char);
                return `Created Debug_Character: ${JSON.stringify(char, null, 2)}`;
            },
            
            // List all characters
            char_list: () => {
                const chars = loadAllCharacters();
                const names = Object.keys(chars);
                return `Characters (${names.length}): ${names.join(', ')}`;
            },
            
            // Show entity tracker status
            entity_status: () => {
                const config = loadEntityTrackerConfig();
                const configCard = Utilities.storyCard.get('[RPG_RUNTIME] Entity Tracker Config');
                const queueCard = Utilities.storyCard.get('[RPG_RUNTIME] Entity Queue');
                
                let status = `Entity Tracker Status:\n`;
                status += `- Threshold: ${config.threshold}\n`;
                status += `- Auto Generate: ${config.autoGenerate}\n`;
                status += `- Blacklist: ${config.blacklist.join(', ')}\n`;
                
                if (configCard && configCard.description) {
                    const lines = configCard.description.split('\n').filter(l => l.startsWith('# '));
                    status += `- Tracking ${lines.length} entities\n`;
                }
                
                if (queueCard && queueCard.entry) {
                    const queued = queueCard.entry.split('\n').filter(l => l.trim()).length;
                    status += `- ${queued} entities in queue`;
                }
                
                return status;
            },
            
            // Test runtime variable operations
            runtime_test: () => {
                const vars = loadRuntimeVariables();
                const testVar = 'debug_test_var';
                
                // Try to set a test variable
                if (!vars[testVar]) {
                    return `Variable '${testVar}' not declared. Add '${testVar}: string' to [RPG_RUNTIME] Variables`;
                }
                
                setRuntimeValue(testVar, 'test_value_' + Date.now());
                const value = getRuntimeValue(testVar);
                return `Set ${testVar} = ${value}`;
            },
            
            // Test update_health tool recognition
            health_tool: () => {
                let results = [];
                
                // Create test character if needed
                const testChar = createCharacter({
                    name: 'Debug_Character',
                    isPlayer: false,
                    attributes: { STR: 10 }
                });
                results.push(`Created test character: ${testChar.name}`);
                
                // Test various health tool formats
                const tools = [
                    'update_health',
                    'update_HEALTH',
                    'update_Health',
                    'update_hp',
                    'update_HP',
                    'update_max_health',
                    'update_max_hp'
                ];
                
                for (const tool of tools) {
                    const result = processToolCall(tool, ['debug_character', '50/100']);
                    results.push(`${tool}: ${result}`);
                }
                
                // Check the character's health
                const char = loadCharacter('Debug_Character');
                if (char) {
                    results.push(`Final HP: ${char.hp.current}/${char.hp.max}`);
                }
                
                return results.join('\n');
            },
            
            // Show all schemas
            schema_all: () => {
                const schemas = [
                    '[RPG_SCHEMA] Attributes',
                    '[RPG_SCHEMA] Core Stats', 
                    '[RPG_SCHEMA] Skills',
                    '[RPG_SCHEMA] Character Format',
                    '[RPG_SCHEMA] Level Progression'
                ];
                
                let result = "=== All Schemas ===\n";
                for (const title of schemas) {
                    const card = Utilities.storyCard.get(title);
                    if (card) {
                        result += `\n${title}:\n${card.entry.substring(0, 200)}...\n`;
                    }
                }
                return result;
            },
            
            // Clear all test entities
            cleanup: () => {
                const testNames = ['Debug_Test_NPC', 'Debug_Test_Monster', 'Debug_Test_Boss', 
                                 'Debug_Test_Item', 'Debug_Test_Location', 'Debug_Test_Quest',
                                 'Debug_Character'];
                let removed = 0;
                
                for (const name of testNames) {
                    if (Utilities.storyCard.remove(`[CHARACTER] ${name}`)) removed++;
                    if (Utilities.storyCard.remove(`[PLAYER] ${name}`)) removed++;
                    if (Utilities.storyCard.remove(`[ENTITY_GEN] ${name}`)) removed++;
                }
                
                // Clear entity tracker data
                Utilities.storyCard.update('[RPG_RUNTIME] Entity Tracker Data', {
                    entry: '// Entity tracking data\n// Format: # entity_name\n// tool_name:turn1,turn2,...'
                });
                
                // Clear entity queue
                Utilities.storyCard.update('[RPG_RUNTIME] Entity Queue', {
                    entry: ''
                });
                
                return `Cleanup complete - removed ${removed} test entities, cleared tracker and queue`;
            }
        };
        
        if (!tests[testName]) {
            return `Unknown test: ${testName}\nAvailable tests:\n${Object.keys(tests).join('\n')}`;
        }
        
        try {
            return tests[testName]();
        } catch (e) {
            return `Test failed: ${e.toString()}`;
        }
    }
    
    // Handle debug commands directly
    function handleDebugCommand(commandName, args) {
        const debugCommands = [
            'gw_activate', 'gw_npc', 'gw_monster', 'gw_boss', 
            'gw_item', 'gw_location', 'gw_quest',
            'entity_trigger', 'entity_status', 
            'char_create', 'char_list',
            'runtime_test', 'schema_all', 'cleanup', 'debug_help'
        ];
        
        // Check if it's a debug command
        if (debugCommands.includes(commandName)) {
            if (commandName === 'debug_help') {
                return `\n<<<[DEBUG COMMANDS]\n${debugCommands.filter(c => c !== 'debug_help').map(c => `/${c}`).join('\n')}>>>\n`;
            }
            
            const result = debugTest(commandName);
            // Return the result as-is (already has hidden markers)
            return result;
        }
        
        return null;
    }
    
    // Expose debug function to global API if debug mode is on
    if (debug) {
        GameState.debugTest = debugTest;
        console.log(`${MODULE_NAME}: Debug test functions available - use GameState.debugTest('test_name')`);
        console.log(`${MODULE_NAME}: Available tests: gw_activate, gw_npc, gw_monster, gw_boss, gw_item, gw_location, gw_quest`);
        console.log(`${MODULE_NAME}: Also: entity_trigger, entity_status, char_create, char_list, runtime_test, health_tool, schema_all, cleanup`);
    }
    
    // ==========================
    // Hook Processing
    // ==========================

    // Auto-initialize runtime cards on first run
    if (!Utilities.storyCard.get('[RPG_RUNTIME] Variables') || 
        !Utilities.storyCard.get('[RPG_RUNTIME] INPUT_COMMANDS')) {
        createSampleRuntimeCards();
    }
    
    // Auto-initialize entity tracker cards
    if (!Utilities.storyCard.get('[RPG_RUNTIME] Entity Tracker Config')) {
        createEntityTrackerCards();
    }

    // Auto-initialize schema cards on first run
    if (!Utilities.storyCard.get('[RPG_SCHEMA] Attributes')) {
        createDefaultAttributesSchema();
    }
    if (!Utilities.storyCard.get('[RPG_SCHEMA] Core Stats')) {
        createDefaultCoreStatsSchema();
    }
    if (!Utilities.storyCard.get('[RPG_SCHEMA] Skills')) {
        createDefaultSkillsSchema();
    }
    if (!Utilities.storyCard.get('[RPG_SCHEMA] Level Progression')) {
        createDefaultLevelProgressionSchema();
    }
    if (!Utilities.storyCard.get('[RPG_SCHEMA] Relationship Thresholds')) {
        createDefaultRelationshipThresholds();
    }

    switch(hook) {
        case 'input':
            if (debug) console.log(`${MODULE_NAME}: Input received: "${text}"`);
            
            // Load input systems
            loadInputCommands();
            loadInputModifier();
            
            // Apply INPUT_MODIFIER first (pure JavaScript sandbox)
            if (inputModifier) {
                try {
                    text = inputModifier(text);
                    if (debug) console.log(`${MODULE_NAME}: Applied input modifier`);
                } catch(e) {
                    if (debug) console.log(`${MODULE_NAME}: Input modifier error: ${e}`);
                }
            }
            
            // Check for INPUT_COMMANDS anywhere in the text
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
                return commandResults.join('\n');
            }
            
            // If GenerationWizard is active, delegate to it
            if (typeof GenerationWizard !== 'undefined' && GenerationWizard.isActive()) {
                const result = GenerationWizard.process('input', text);
                return result.active ? '\n' : text;  // Block input if wizard is active
            }
            
            return text;
            
        case 'context':
            // Clear caches for fresh load (before initialization)
            runtimeVariablesCache = null;
            characterCache = null;
            schemaCache = null;
            
            // Initialize runtime system
            initializeRuntimeVariables();
            
            // Check for edits in history (RewindSystem)
            RewindSystem.handleContext();
            
            // Load context modifier
            loadContextModifier();
            
            // Remove any hidden message markers from previous turns (including surrounding newlines)
            let modifiedText = text.replace(/\n*<<<[^>]*>>>\n*/g, '');
            
            // Inject current scene into the context text
            modifiedText = injectCurrentScene(modifiedText);
            
            // Process all getters in the entire context
            modifiedText = processGetters(modifiedText);
            
            // Build trigger name to username mapping and replace in tool usages
            const triggerNameMap = {};
            const charactersWithTriggers = Utilities.storyCard.find((card) => {
                return (card.type === 'character' || card.title?.startsWith('[CHARACTER]')) &&
                       card.description?.includes('Trigger Name:');
            }, true); // true = return all matches
            
            // Get current action count for cleanup check
            const currentTurn = info?.actionCount || 0;
            
            // Build the mapping and clean up old trigger names
            for (const charCard of charactersWithTriggers) {
                const triggerMatch = charCard.description.match(/Trigger Name: ([^\n]+)/);
                const usernameMatch = charCard.entry.match(/^##\s+\*\*([^*]+)\*\*/);
                const turnMatch = charCard.description.match(/Generated by GenerationWizard on turn (\d+)/);
                
                if (triggerMatch && usernameMatch) {
                    const triggerName = triggerMatch[1];
                    const username = usernameMatch[1];
                    const generatedTurn = turnMatch ? parseInt(turnMatch[1]) : 0;
                    
                    // Check if trigger name should be cleaned up (10+ turns old and not in context)
                    if (currentTurn - generatedTurn >= 10) {
                        // Check if trigger name still exists in the context
                        const triggerPattern = new RegExp(`\\b${triggerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
                        if (!triggerPattern.test(modifiedText)) {
                            // Remove trigger name from description
                            const newDescription = charCard.description.replace(/\nTrigger Name: [^\n]+/, '');
                            Utilities.storyCard.update(charCard.title, { description: newDescription });
                            
                            if (debug) {
                                console.log(`${MODULE_NAME}: Cleaned up trigger name "${triggerName}" from ${charCard.title} (${currentTurn - generatedTurn} turns old)`);
                            }
                            continue; // Skip adding to map since we cleaned it up
                        }
                    }
                    
                    if (triggerName !== username) {
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
                    `(\\w+\\()\\s*(${triggerNames})\\s*(,|\\))`,
                    'gi'
                );
                
                modifiedText = modifiedText.replace(toolPattern, (match, func, triggerName, delimiter) => {
                    const username = triggerNameMap[triggerName] || triggerName;
                    if (debug && username !== triggerName) {
                        console.log(`${MODULE_NAME}: Replaced trigger name "${triggerName}" with "${username}" in tool usage`);
                    }
                    return `${func}${username}${delimiter}`;
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
                        getRuntimeValue: getRuntimeValue,
                        setRuntimeValue: setRuntimeValue,
                        loadCharacter: function(name) {
                            const chars = loadAllCharacters();
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
            
            return modifiedText;  // Return the fully modified text
            
        case 'output':
            // Log raw output in debug mode
            if (debug) {
                console.log(`${MODULE_NAME}: Raw output from AI:`);
                console.log(text);
            }
            
            // Load output modifier
            loadOutputModifier();
            
            // Check if GenerationWizard is processing
            if (typeof GenerationWizard !== 'undefined' && GenerationWizard.isActive()) {
                const result = GenerationWizard.process('output', text);
                if (result.active) {
                    return result.text;  // Return wizard's output (hidden message)
                }
            }

            loadRuntimeTools();
            
            // Process tools in LLM's output
            if (text) {
                const result = processTools(text);
                let modifiedText = result.modifiedText;
                const executedTools = result.executedTools || [];
                
                // Record this output immediately - it will become history next turn
                // Use the current data position + 1 if we're tracking, otherwise use history length
                const data = RewindSystem.getStorage();
                const futurePosition = data.position !== undefined ? data.position + 1 : (history ? history.length : 0);
                RewindSystem.recordAction(text, executedTools, futurePosition);
                // Log message removed - recordAction logs internally
                
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
                
                // Apply OUTPUT_MODIFIER if available (pure JavaScript sandbox)
                if (outputModifier) {
                    try {
                        modifiedText = outputModifier(modifiedText);
                        if (debug) console.log(`${MODULE_NAME}: Applied output modifier`);
                    } catch(e) {
                        if (debug) console.log(`${MODULE_NAME}: Output modifier error: ${e}`);
                    }
                }
                
                // Clear caches after processing
                characterCache = null;
                // Clear runtime cache to force refresh on next access
                runtimeVariablesCache = null;
                
                return modifiedText;
            }
            break;
    }
    
    // Public API
    GameState.injectCurrentScene = injectCurrentScene;
    GameState.processTools = processTools;
    GameState.processGetters = processGetters;
    GameState.getRuntimeValue = getRuntimeValue;
    GameState.setRuntimeValue = setRuntimeValue;
    GameState.loadAllCharacters = loadAllCharacters;
    GameState.loadCharacter = function(name) {
        const chars = loadAllCharacters();
        return chars[name.toLowerCase()];
    };
    GameState.saveCharacter = saveCharacter;
    GameState.createCharacter = createCharacter;
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
    GameState.loadEntityTrackerConfig = loadEntityTrackerConfig;
    
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
        return saveCharacter(character);
    };
    GameState.modifyField = function(characterName, fieldPath, delta) {
        const current = GameState.getField(characterName, fieldPath);
        if (current === null || typeof current !== 'number') return false;
        
        return GameState.setField(characterName, fieldPath, current + delta);
    };
    
    return GameState;
}