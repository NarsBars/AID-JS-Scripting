function GenerationWizard(hook, text) {
    'use strict';
    
    const debug = false;
    const MODULE_NAME = 'GenerationWizard';
    
    // ==========================
    // Constants
    // ==========================
    const PROGRESS_CARD = '[ENTITY_GEN] In Progress';
    const TEMPLATE_PREFIX = '[GW Template]';
    const CONFIG_AND_PROMPTS_CARD = '[GENERATION_CONFIG]';
    const HIDDEN_OUTPUT = '\n<<<The GM is thinking, please hit continue... (Use `/GW abort` if needed, this prompting is still being worked on)>>>\n';
    const COMPLETION_MESSAGE = '\n<<<Generation complete, please hit continue>>>\n';
    
    // Helper to wrap debug output in markers to hide from LLM
    function wrapDebugOutput(text) {
        return `\n<<<[DEBUG OUTPUT]\n${text}\n>>>\n`;
    }
    // ==========================
    // Runtime Configuration
    // ==========================
    
    function loadConfig() {
        // Use centralized config with custom parser
        return Utilities.config.load(
            CONFIG_AND_PROMPTS_CARD,
            parseConfigSection,  // Custom parser for config section only
            createDefaultConfigAndPrompts,  // Auto-create if missing
            true  // Cache the result
        );
    }
    
    function parseConfigSection(fullText) {
        const config = {
            debug: false
        };
        
        // Parse config section from entry
        const lines = fullText.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            
            // Stop at first section header
            if (trimmed.startsWith('##')) break;
            
            if (trimmed.startsWith('debug:')) {
                config.debug = trimmed.substring(6).trim().toLowerCase() === 'true';
            }
        }
        
        return config;
    }
    
    function createDefaultConfigAndPrompts() {
        Utilities.storyCard.add({
            title: CONFIG_AND_PROMPTS_CARD,
            type: 'data',
            entry: (
                `# Generation Configuration & Prompts\n` +
                `debug: false\n` +
                `\n` +
                `// Set debug to true to see AI responses during generation\n` +
                `// Set debug to false to hide intermediate responses\n` +
                `\n` +
                `## About This Card\n` +
                `Edit the description below to customize generation prompts.\n` +
                `Each ## Section in the description is a different prompt template.\n` +
                `Use {{VARIABLE}} syntax for replacements.`
            ),
            description: (
                `## Entity Selection\n` +
                `<s>\nCARDINAL SYSTEM - Entity Generation Override\n\n` +
                `**What type of entity would you like to create?**\n\n` +
                `Valid options: NPC, Monster, Boss, Item, Location, Quest\n` +
                `Respond with exactly one of the above options.\n` +
                `Do not add any narrative. Only provide the entity type.\n</s>\n\n` +
                `CARDINAL RESPONSE:\n\n` +
                
                `## Field Collection\n` +
                `<s>\nCARDINAL SYSTEM - Entity Generation Override\n\n` +
                `Creating new {{ENTITY_TYPE}}.\n\n` +
                `==== REQUIRED INFORMATION ====\n` +
                `{{FIELD_LIST}}\n\n` +
                `Provide responses in the exact format shown. Do not add narrative.\n</s>\n\n` +
                `CARDINAL RESPONSE:\n\n` +
                
                `## Quest Combined\n` +
                `<s>\nCARDINAL SYSTEM - Quest Generation Override\n\n` +
                `Creating new Quest.\n\n` +
                `{{CONTEXT_SECTION}}\n` +
                `==== REQUIRED INFORMATION ====\n` +
                `{{QUERY_SECTION}}\n` +
                `Provide responses in the exact format shown. Do not add narrative.\n</s>\n\n` +
                `CARDINAL RESPONSE:\n\n` +
                
                `## Quest Stages\n` +
                `<s>\nCARDINAL SYSTEM - Quest Generation Override\n\n` +
                `**What are the objectives for this quest?**\n\n` +
                `{{STAGE_LIST}}\n\n` +
                `Provide clear quest objectives.\n</s>\n\n` +
                `CARDINAL RESPONSE:\n\n` +
                
                `## Quest Rewards\n` +
                `<s>\nCARDINAL SYSTEM - Quest Generation Override\n\n` +
                `**What are the rewards for completing this {{QUEST_TYPE}} quest?**\n\n` +
                `Experience: [XP amount]\n` +
                `Col: [currency amount]\n` +
                `Items: [item rewards or "None"]\n\n` +
                `Provide appropriate rewards for a {{QUEST_TYPE}} quest.\n</s>\n\n` +
                `CARDINAL RESPONSE:\n\n` +
                
                `## Entity Classification\n` +
                `<s>\nCARDINAL SYSTEM - Entity Classification Override\n\n` +
                `{{CLASSIFICATION_QUERY}}\n</s>\n\n` +
                `CARDINAL RESPONSE:\n\n` +
                
                `## Entity Details\n` +
                `<s>\nCARDINAL SYSTEM - Entity Details Override\n\n` +
                `{{DETAILS_QUERY}}\n</s>\n\n` +
                `CARDINAL RESPONSE:\n\n` +
                
                `## NPC Batch\n` +
                `<s>\nCARDINAL SYSTEM - NPC Generation Override\n\n` +
                `The entity "{{NAME}}" was referenced and needs to be created as an NPC.\n\n` +
                `{{CONTEXT}}` +
                `==== REQUIRED INFORMATION ====\n` +
                `Provide the following details:\n\n` +
                `{{FIELD_LIST}}\n\n` +
                `Format: KEY: value\n` +
                `One field per line. Be creative and consistent with the game world.\n` +
                `Respond ONLY with the requested fields. No narrative or additional text.\n</s>\n\n` +
                `CARDINAL RESPONSE:`
            )
        });
        
        if (debug) console.log(`${MODULE_NAME}: Created default configuration and prompts card`);
    }
    
    const config = loadConfig();
    
    // ==========================
    // Template Field Types
    // ==========================
    const FieldTypes = {
        TEXT: 'text',
        CHOICE: 'choice',
        RANGE: 'range',
        NUMBER: 'number',
        BOOLEAN: 'boolean',
        LIST: 'list',
        FORMULA: 'formula',
        GAMESTATE: 'gamestate'
    };
    
    // ==========================
    // Generation Control
    // ==========================
    
    function isGenerationActive() {
        const progressCard = Utilities.storyCard.get(PROGRESS_CARD);
        return progressCard !== null;
    }
    
    function shouldTakeControl() {
        if (!isGenerationActive()) return false;
        
        const progress = loadProgress();
        return progress && !progress.completed;
    }
    
    // ==========================
    // Prompt Template Management
    // ==========================
    
    function loadPromptTemplate(section) {
        const card = Utilities.storyCard.get(CONFIG_AND_PROMPTS_CARD);
        if (!card) {
            createDefaultConfigAndPrompts();
            return Utilities.storyCard.get(CONFIG_AND_PROMPTS_CARD)?.description || '';
        }
        
        // Extract the specific section from description
        const description = card.description || '';
        const sectionRegex = new RegExp(`## ${section}\\s*\\n([^#]+)`, 's');
        const match = description.match(sectionRegex);
        
        return match ? match[1].trim() : '';
    }
    
    function generatePrompt(section, replacements = {}) {
        let prompt = loadPromptTemplate(section);
        
        // Replace all {{VARIABLE}} placeholders
        for (const [key, value] of Object.entries(replacements)) {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            prompt = prompt.replace(regex, value);
        }
        
        return prompt;
    }
    
    // ==========================
    // Location Data Transformation
    // ==========================
    function createLocationFromData(collectedData, metadata) {
        const name = collectedData.NAME || 'Unknown_Location';
        const formattedName = name.replace(/\s+/g, '_');
        
        // Build type string from fields
        let typeString = '';
        if (collectedData.LOCATION_TYPE) typeString += `Type: ${collectedData.LOCATION_TYPE}`;
        if (collectedData.TERRAIN) typeString += ` | Terrain: ${collectedData.TERRAIN}`;
        
        // TODO: Could add implicit danger tags based on LOCATION_TYPE
        // Settlement/Safezone = Safe
        // Wilderness/Landmark = Medium
        // Dungeon/Ruins = Dangerous
        
        // Build pathways section (no header here, added in locationEntry)
        let pathwaysSection = '';
        
        // Add return path if we know where we came from
        if (metadata && metadata.from && metadata.direction) {
            const oppositeDir = getOppositeDirection(metadata.direction);
            pathwaysSection += `- ${oppositeDir}: ${metadata.from}\n`;
        }
        
        // Add unexplored paths for other directions
        const allDirections = ['North', 'South', 'East', 'West'];
        for (const dir of allDirections) {
            if (!metadata || !metadata.direction || dir !== getOppositeDirection(metadata.direction)) {
                pathwaysSection += `- ${dir}: (unexplored)\n`;
            }
        }
        
        // Dynamically determine location header based on player's floor
        let locationHeaders = '<$# Locations>';
        if (typeof GameState !== 'undefined' && GameState.getPlayerName && GameState.loadCharacter) {
            const playerName = GameState.getPlayerName();
            if (playerName) {
                const player = GameState.loadCharacter(playerName);
                if (player && player.location) {
                    // Try to extract floor from player's location (e.g., "Floor_2_Town" or check runtime)
                    const currentFloor = GameState.getRuntimeValue ? 
                        (GameState.getRuntimeValue('current_floor') || 1) : 1;
                    
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
            const customHeader = GameState.getRuntimeValue ? GameState.getRuntimeValue('location_header') : null;
            if (customHeader) {
                locationHeaders = customHeader; // User override takes precedence
            }
        }
        
        // Build the location entry
        const locationEntry = (
            locationHeaders + '\n' +
            '## **' + formattedName + '**\n' +
            typeString + '\n' +
            '### Description\n' +
            (collectedData.DESCRIPTION || 'An unexplored location.') + '\n' +
            '### Pathways\n' +
            pathwaysSection
        );
        
        // Create the card
        const snakeCased = formattedName.toLowerCase();  // Already has underscores
        const spacedName = formattedName.replace(/_/g, ' ');
        
        const card = {
            title: `[LOCATION] ${formattedName}`,
            type: 'Location',
            keys: `${snakeCased}, ${spacedName}`,  // Keys as comma-separated string
            entry: locationEntry,
            description: `Generated on turn ${info?.actionCount || 0}`
        };
        
        Utilities.storyCard.add(card);
        
        // Update the connecting location's pathways if needed
        if (metadata && metadata.from && metadata.direction) {
            updateLocationPathway(metadata.from, metadata.direction, formattedName);
        }
        
        if (debug) console.log(`${MODULE_NAME}: Created location ${formattedName}`);
        
        // Signal completion if GameState has a handler
        if (typeof GameState !== 'undefined' && GameState.completeLocationGeneration) {
            GameState.completeLocationGeneration(formattedName, metadata);
        }
    }
    
    function getOppositeDirection(direction) {
        const opposites = {
            'north': 'South',
            'south': 'North',
            'east': 'West',
            'west': 'East'
        };
        return opposites[direction.toLowerCase()] || direction;
    }
    
    function updateLocationPathway(locationName, direction, destinationName) {
        const card = Utilities.storyCard.get(`[LOCATION] ${locationName}`);
        if (!card) return;
        
        // Parse current entry
        let entry = card.entry || '';
        
        // Find and update the pathway line
        const dirCapitalized = direction.charAt(0).toUpperCase() + direction.slice(1).toLowerCase();
        const pathwayRegex = new RegExp(`^- ${dirCapitalized}: .*$`, 'm');
        
        if (entry.match(pathwayRegex)) {
            entry = entry.replace(pathwayRegex, `- ${dirCapitalized}: ${destinationName}`);
        }
        
        Utilities.storyCard.update(card.title, { entry: entry });
        
        if (debug) console.log(`${MODULE_NAME}: Updated ${locationName} pathway ${direction} to ${destinationName}`);
    }
    
    // ==========================
    // Character Data Transformation
    // ==========================
    function transformToCharacterData(collectedData, triggerName) {
        const characterData = {
            name: collectedData.NAME,
            fullName: collectedData.FULL_NAME || null,
            gender: collectedData.GENDER || '???',
            dob: collectedData.DOB || null,
            level: parseInt(collectedData.LEVEL) || 1,
            location: collectedData.DEFAULT_LOCATION || collectedData.LOCATION || 'unknown',
            isPlayer: false,  // NPCs are not players
            triggerName: triggerName || null,  // Store original trigger name
            attributes: {},
            skills: {},
            inventory: {},
            relationships: {}
        };
        
        // Combine appearance fields into single field for GameState
        if (collectedData.HAIR || collectedData.EYES || collectedData.BUILD) {
            const appearanceParts = [];
            if (collectedData.HAIR) appearanceParts.push(`Hair: ${collectedData.HAIR}`);
            if (collectedData.EYES) appearanceParts.push(`Eyes: ${collectedData.EYES}`);
            if (collectedData.BUILD) appearanceParts.push(`Build: ${collectedData.BUILD}`);
            characterData.appearance = appearanceParts.join(' | ');
        } else if (collectedData.APPEARANCE) {
            // Fallback to old APPEARANCE field if present
            characterData.appearance = collectedData.APPEARANCE;
        }
        
        // Map personality and background
        if (collectedData.PERSONALITY) {
            characterData.personality = collectedData.PERSONALITY;
        }
        if (collectedData.BACKGROUND) {
            characterData.background = collectedData.BACKGROUND;
        }
        
        // Map HP if provided
        if (collectedData.HP || collectedData.MAX_HP) {
            characterData.hp = {
                current: parseInt(collectedData.HP) || parseInt(collectedData.MAX_HP) || 100,
                max: parseInt(collectedData.MAX_HP) || parseInt(collectedData.HP) || 100
            };
        }
        
        // Map attributes
        const attributeNames = ['VITALITY', 'STRENGTH', 'DEXTERITY', 'AGILITY', 'INTELLIGENCE', 'WISDOM', 'CHARISMA', 'LUCK'];
        for (const attr of attributeNames) {
            if (collectedData[attr]) {
                characterData.attributes[attr.toLowerCase()] = parseInt(collectedData[attr]) || 10;
            }
        }
        
        // Parse skills if provided (format: "skill_name: Level X")
        if (collectedData.SKILLS) {
            const skillLines = collectedData.SKILLS.split('\n');
            for (const line of skillLines) {
                const match = line.match(/(.+?):\s*Level\s+(\d+)/i);
                if (match) {
                    const skillName = match[1].trim().toLowerCase().replace(/\s+/g, '_');
                    characterData.skills[skillName] = parseInt(match[2]) || 1;
                }
            }
        }
        
        // Parse inventory if provided
        if (collectedData.INVENTORY) {
            // Handle both {item:qty} format and plain list
            const invText = collectedData.INVENTORY.replace(/[{}]/g, '').trim();
            if (invText) {
                const items = invText.split(',').map(i => i.trim());
                for (const item of items) {
                    const parts = item.split(':');
                    if (parts.length === 2) {
                        const itemName = parts[0].trim().toLowerCase().replace(/\s+/g, '_');
                        const qty = parseInt(parts[1]) || 1;
                        characterData.inventory[itemName] = qty;
                    }
                }
            }
        }
        
        // Add narrative sections
        if (collectedData.APPEARANCE) {
            characterData.appearance = collectedData.APPEARANCE;
        }
        if (collectedData.PERSONALITY) {
            characterData.personality = collectedData.PERSONALITY;
        }
        if (collectedData.BACKGROUND) {
            characterData.background = collectedData.BACKGROUND;
        }
        
        // Add any shop inventory as a custom section
        if (collectedData.SHOP_INVENTORY) {
            characterData.shop_inventory = collectedData.SHOP_INVENTORY;
        }
        
        // Add quest giver info as a custom section
        if (collectedData.QUEST_GIVER) {
            characterData.available_quests = collectedData.QUEST_GIVER;
        }
        
        return characterData;
    }
    
    // ==========================
    // Template Management
    // ==========================
    
    function loadTemplate(entityType) {
        const cardTitle = `${TEMPLATE_PREFIX} ${entityType}`;
        const templateCard = Utilities.storyCard.get(cardTitle);
        
        if (!templateCard) {
            if (debug) console.log(`${MODULE_NAME}: Template not found: ${cardTitle}`);
            createDefaultTemplates();
            return Utilities.storyCard.get(cardTitle);
        }
        
        return templateCard;
    }
    
    function parseTemplateFields(description) {
        const fields = [];
        const lines = description.split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            // Skip comments and empty lines
            if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) continue;
            
            // Parse: FIELD_NAME: requirement, type[params], prompt
            const match = trimmed.match(/^([A-Z_]+):\s*([^,]+),\s*([^,]+)(?:,\s*(.+))?$/);
            if (!match) continue;
            
            const field = {
                name: match[1],
                requirement: match[2].trim(),
                type: null,
                params: null,
                prompt: match[4] ? match[4].trim() : null
            };
            
            // Parse type and params
            const typeMatch = match[3].trim().match(/^([a-z]+)(?:\[([^\]]+)\])?$/);
            if (typeMatch) {
                field.type = typeMatch[1];
                field.params = typeMatch[2] || null;
            }
            
            // Skip formula and gamestate fields from queries
            if (field.type === FieldTypes.FORMULA || field.type === FieldTypes.GAMESTATE) {
                continue;
            }
            
            fields.push(field);
        }
        
        return fields;
    }
    
    // ==========================
    // Generation State Management
    // ==========================
    
    function loadProgress() {
        const progressCard = Utilities.storyCard.get(PROGRESS_CARD);
        if (!progressCard) return null;
        
        try {
            const progress = JSON.parse(progressCard.description || '{}');
            
            // Load template fields if not cached
            if (!progress.templateFields && progress.entityType) {
                const template = loadTemplate(progress.entityType);
                if (template) {
                    progress.templateFields = parseTemplateFields(template.description);
                }
            }
            
            return progress;
        } catch (e) {
            if (debug) console.log(`${MODULE_NAME}: Error loading progress: ${e}`);
            return null;
        }
    }
    
    function saveProgress(progress) {
        // Build a preview in the entry
        let entry = `# Generating ${progress.entityType}\n\n`;
        
        const activeFields = progress.templateFields || [];
        const completedCount = Object.keys(progress.collectedData).filter(key => 
            key !== 'name' && key !== 'QUEST_TYPE' && key !== 'QUEST_GIVER' && key !== 'STAGE_COUNT' && key !== 'REWARDS_PARSED'
        ).length;
        
        // Calculate total fields based on entity type
        let totalFields;
        if (progress.entityType === 'Quest') {
            // For quests, add 2 for STAGES and REWARDS which are handled specially
            totalFields = activeFields.filter(f => f.name !== 'STAGES' && f.name !== 'REWARDS').length + 2;
        } else {
            // For other entities, just count the template fields
            totalFields = activeFields.length;
        }
        
        entry += `**Progress:** ${completedCount} of ~${totalFields} fields collected\n\n`;
        
        // Show collected data
        if (completedCount > 0) {
            entry += `## Collected Data\n`;
            for (const [key, value] of Object.entries(progress.collectedData)) {
                if (key === 'STAGES' || key === 'REWARDS') {
                    entry += `**${key}:**\n${value}\n\n`;
                } else if (key !== 'REWARDS_PARSED') {
                    entry += `**${key}:** ${value}\n`;
                }
            }
        }
        
        // Show what we're waiting for
        if (progress.currentBatch && progress.currentBatch.length > 0) {
            entry += `\n## Waiting For\n`;
            entry += progress.currentBatch.join(', ');
        }
        
        Utilities.storyCard.upsert({
            title: PROGRESS_CARD,
            entry: entry,
            description: JSON.stringify(progress)
        });
    }
    
    function clearProgress() {
        Utilities.storyCard.remove(PROGRESS_CARD);
        if (debug) console.log(`${MODULE_NAME}: Progress cleared`);
    }
    
    // ==========================
    // Quest Batch Collection
    // ==========================
    
    function generateQuestBatchPrompt(fields, stageCount, existingStages, questType, collectedData) {
        // Build the CONTEXT section - what we already know
        let contextSection = '==== CONTEXT (Already Provided) ====\n';
        contextSection += '**Quest Information:**\n';
        contextSection += `Name: ${collectedData.NAME}\n`;
        contextSection += `Giver: ${collectedData.QUEST_GIVER}\n`;
        contextSection += `Type: ${questType}\n`;
        contextSection += `Stages: ${stageCount}\n`;
        
        // Add collected fields to context
        if (collectedData.DESCRIPTION) {
            contextSection += `\nDescription: ${collectedData.DESCRIPTION}\n`;
        }
        
        // Show completed stages in context if any
        const completedStages = Object.keys(existingStages);
        if (completedStages.length > 0) {
            contextSection += '\n**Completed Stages:**\n';
            for (let i = 1; i <= stageCount; i++) {
                if (existingStages[i]) {
                    contextSection += `Stage ${i}: ${existingStages[i]}\n`;
                }
            }
        }
        
        // Show rewards in context if collected
        if (collectedData.REWARDS_PARSED) {
            const rewards = collectedData.REWARDS_PARSED;
            contextSection += '\n**Rewards:**\n';
            contextSection += `Experience: ${rewards.xp} XP\n`;
            contextSection += `Col: ${rewards.col}\n`;
            if (rewards.items) {
                contextSection += `Items: ${rewards.items}\n`;
            }
        }
        
        // Build the QUERY section - what we still need (ALWAYS at bottom)
        let querySection = '**Please provide the following information:**\n\n';
        let queryItems = [];
        
        // Collect all uncompleted items
        for (const field of fields) {
            if (!collectedData.hasOwnProperty(field.name)) {
                const fieldPrompt = field.prompt || field.name.replace(/_/g, ' ').toLowerCase();
                
                // Check if there's a validation error for this field
                const validationError = progress.validationErrors && progress.validationErrors[field.name];
                
                let typeHint = '';
                switch(field.type) {
                    case FieldTypes.CHOICE:
                        typeHint = field.params ? ` (${field.params.replace(/\|/g, '/')})` : '';
                        break;
                    case FieldTypes.RANGE:
                        if (field.params) {
                            const [min, max] = field.params.split('-');
                            typeHint = ` (${min}-${max})`;
                        }
                        break;
                    case FieldTypes.NUMBER:
                        typeHint = ' (number)';
                        break;
                    case FieldTypes.BOOLEAN:
                        typeHint = ' (yes/no)';
                        break;
                    case FieldTypes.LIST:
                        typeHint = ' (comma-separated)';
                        break;
                }
                
                let fieldText = `${field.name}: [${fieldPrompt}${typeHint}]`;
                if (validationError) {
                    fieldText += `\n  ⚠️ ${validationError}`;
                }
                
                queryItems.push({
                    type: 'field',
                    text: fieldText
                });
            }
        }
        
        // Check if we need stages
        const allStagesCollected = Object.keys(existingStages).length === stageCount;
        if (!allStagesCollected) {
            for (let i = 1; i <= stageCount; i++) {
                if (!existingStages[i]) {
                    queryItems.push({
                        type: 'stage',
                        text: `Stage ${i}: [objective]`
                    });
                }
            }
        }
        
        // Check if we need rewards
        if (!collectedData.REWARDS_PARSED) {
            queryItems.push({
                type: 'rewards',
                text: 'Experience: [XP amount]\nCol: [currency amount]\nItems: [item rewards or "None"]'
            });
        }
        
        // Build query section with proper grouping
        let lastType = null;
        for (const item of queryItems) {
            // Add spacing between different types
            if (lastType && lastType !== item.type) {
                querySection += '\n';
            }
            querySection += item.text + '\n';
            lastType = item.type;
        }
        
        // Use the template from config card
        return generatePrompt('Quest Combined', {
            CONTEXT_SECTION: contextSection,
            QUERY_SECTION: querySection
        });
    }
    
    // ==========================
    // Batched Field Collection
    // ==========================
    
    function parseBatchedResponse(response, fields) {
        const collected = {};
        const lines = response.split('\n');
        
        if (debug) {
            console.log(`${MODULE_NAME}: parseBatchedResponse called with ${lines.length} lines`);
            console.log(`${MODULE_NAME}: Raw response: "${response}"`);
            console.log(`${MODULE_NAME}: Fields to parse: ${fields.map(f => f.name).join(', ')}`);
        }
        
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            
            if (debug && line.trim()) {
                console.log(`${MODULE_NAME}: Line ${lineIndex}: "${line}"`);
                console.log(`${MODULE_NAME}: Line length: ${line.length}, trimmed length: ${line.trim().length}`);
            }
            
            // Trim the line before matching to handle leading/trailing spaces
            const trimmedLine = line.trim();
            
            for (const field of fields) {
                // Look for "FIELD_NAME: value" pattern
                const regex = new RegExp(`^${field.name}:\\s*(.+)`, 'i');
                
                if (debug) {
                    console.log(`${MODULE_NAME}: Testing regex /${regex.source}/${regex.flags} against trimmed line`);
                }
                
                const match = trimmedLine.match(regex);
                
                if (match) {
                    collected[field.name] = match[1].trim();
                    if (debug) {
                        console.log(`${MODULE_NAME}: MATCHED ${field.name} = "${match[1].trim()}"`);
                    }
                    break;
                } else if (debug && field.name === 'DESCRIPTION') {
                    // Extra debugging for DESCRIPTION specifically
                    console.log(`${MODULE_NAME}: DESCRIPTION regex failed. Trimmed line starts with: "${trimmedLine.substring(0, 20)}"`);
                    console.log(`${MODULE_NAME}: Original line had leading space: ${line[0] === ' '}`);
                }
            }
        }
        
        if (debug) {
            console.log(`${MODULE_NAME}: Collected fields: ${JSON.stringify(collected)}`);
        }
        
        return collected;
    }
    
    // ==========================
    // Field Validation
    // ==========================
    
    function validateField(field, value) {
        if (!value || value.trim() === '') {
            return { valid: false, error: 'Empty response' };
        }
        
        const trimmedValue = value.trim();
        
        // Special handling for specific fields
        if (field.name === 'NAME') {
            // Check for duplicate usernames in existing characters
            const existingCharacters = Utilities.storyCard.find((card) => {
                return card.type === 'character' || 
                       (card.title && card.title.startsWith('[CHARACTER]'));
            }, true); // true = return all matches
            
            for (const character of existingCharacters) {
                // Extract username from character header (## **Username**)
                const headerMatch = character.entry.match(/^##\s+\*\*([^*]+)\*\*/);
                if (headerMatch && headerMatch[1].toLowerCase() === trimmedValue.toLowerCase()) {
                    return { 
                        valid: false, 
                        error: `Username "${trimmedValue}" already exists. Please provide a different username.` 
                    };
                }
            }
        }
        
        if (field.name === 'GENDER') {
            const normalized = trimmedValue.toLowerCase();
            // Accept various gender formats
            if (normalized === 'm' || normalized === 'male' || normalized === 'man' || normalized === 'boy') {
                return { valid: true, value: 'Male' };
            }
            if (normalized === 'f' || normalized === 'female' || normalized === 'woman' || normalized === 'girl') {
                return { valid: true, value: 'Female' };
            }
            if (normalized === 'other' || normalized === 'non-binary' || normalized === 'nb') {
                return { valid: true, value: 'Other' };
            }
            return { valid: false, error: 'Must be Male, Female, or Other' };
        }
        
        if (field.name === 'DOB') {
            // Accept various date formats and normalize to YYYY-MM-DD
            // Try to parse common formats
            const datePatterns = [
                /^(\d{4})-(\d{1,2})-(\d{1,2})$/,  // YYYY-MM-DD
                /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,  // MM/DD/YYYY
                /^(\w+)\s+(\d{1,2}),?\s+(\d{4})$/,  // Month DD, YYYY
                /^(\d{1,2})\s+(\w+)\s+(\d{4})$/,  // DD Month YYYY
            ];
            
            for (const pattern of datePatterns) {
                if (pattern.test(trimmedValue)) {
                    // For now, just accept the value as-is if it matches a pattern
                    // Could add more sophisticated date parsing if needed
                    return { valid: true, value: trimmedValue };
                }
            }
            
            // If no pattern matches, still accept it if it contains numbers
            if (/\d/.test(trimmedValue)) {
                return { valid: true, value: trimmedValue };
            }
            return { valid: false, error: 'Invalid date format' };
        }
        
        switch(field.type) {
            case FieldTypes.CHOICE:
                if (field.params) {
                    const options = field.params.split('|').map(o => o.trim().toLowerCase());
                    const normalized = trimmedValue.toLowerCase();
                    
                    if (options.includes(normalized)) {
                        // Return the properly cased version
                        const index = options.indexOf(normalized);
                        const properCase = field.params.split('|')[index].trim();
                        return { valid: true, value: properCase };
                    }
                    return { valid: false, error: 'Not a valid option' };
                }
                break;
                
            case FieldTypes.RANGE:
                if (field.params) {
                    const [min, max] = field.params.split('-').map(n => parseInt(n.trim()));
                    const num = parseInt(trimmedValue);
                    
                    if (isNaN(num)) {
                        return { valid: false, error: 'Not a number' };
                    }
                    if (num < min || num > max) {
                        return { valid: false, error: `Out of range ${min}-${max}` };
                    }
                    return { valid: true, value: num };
                }
                break;
                
            case FieldTypes.NUMBER:
                const num = parseFloat(trimmedValue);
                if (isNaN(num)) {
                    return { valid: false, error: 'Not a number' };
                }
                return { valid: true, value: num };
                
            case FieldTypes.BOOLEAN:
                const lower = trimmedValue.toLowerCase();
                if (lower === 'true' || lower === 'yes') {
                    return { valid: true, value: true };
                }
                if (lower === 'false' || lower === 'no') {
                    return { valid: true, value: false };
                }
                return { valid: false, error: 'Must be yes or no' };
                
            case FieldTypes.LIST:
                const items = trimmedValue.split(',')
                    .map(item => item.trim())
                    .filter(item => item.length > 0);
                
                if (items.length === 0) {
                    return { valid: false, error: 'Empty list' };
                }
                return { valid: true, value: items.join(', ') };
                
            case FieldTypes.TEXT:
            default:
                return { valid: true, value: trimmedValue };
        }
        
        return { valid: true, value: trimmedValue };
    }
    
    // ==========================
    // Quest Stage Collection
    // ==========================
    
    function parseStageResponse(response, stageCount, existingStages = {}) {
        const stages = { ...existingStages };
        const lines = response.split('\n');
        
        for (const line of lines) {
            const match = line.match(/Stage\s+(\d+):\s*(.+)/i);
            if (match) {
                const stageNum = parseInt(match[1]);
                const objective = match[2].trim();
                
                if (stageNum >= 1 && stageNum <= stageCount && !stages[stageNum]) {
                    stages[stageNum] = objective;
                }
            }
        }
        
        return stages;
    }
    
    function validateStages(stages, stageCount) {
        // Check which stages are missing or too short
        const missingStages = [];
        
        for (let i = 1; i <= stageCount; i++) {
            if (!stages[i] || stages[i].split(' ').length < 2) {  // Changed to 2 words minimum
                missingStages.push(i);
                // Remove this stage and all subsequent ones
                for (let j = i; j <= stageCount; j++) {
                    delete stages[j];
                }
                break;
            }
        }
        
        return missingStages.length === 0;
    }
    
    function formatStagesForCard(stages, stageCount) {
        let formatted = '';
        for (let i = 1; i <= stageCount; i++) {
            if (stages[i]) {
                formatted += `${i}. ${stages[i]}\n`;
            }
        }
        return formatted.trim();
    }
    
    // ==========================
    // Quest Rewards Collection
    // ==========================
    
    function parseRewardsResponse(response) {
        const rewards = {
            xp: null,
            col: null,
            items: null
        };
        
        const lines = response.split('\n');
        
        for (const line of lines) {
            // Match Experience/XP
            let match = line.match(/(?:Experience|XP):\s*(\d+)/i);
            if (match) {
                rewards.xp = parseInt(match[1]);
                continue;
            }
            
            // Match Col/Currency
            match = line.match(/(?:Col|Currency):\s*(\d+)/i);
            if (match) {
                rewards.col = parseInt(match[1]);
                continue;
            }
            
            // Match Items
            match = line.match(/Items?:\s*(.+)/i);
            if (match) {
                const itemText = match[1].trim();
                if (itemText.toLowerCase() !== 'none' && itemText.length > 0) {
                    rewards.items = itemText;
                }
            }
        }
        
        return rewards;
    }
    
    function formatRewardsForCard(rewards) {
        let formatted = '';
        
        if (rewards.xp) {
            formatted += `- Experience: ${rewards.xp} XP\n`;
        }
        if (rewards.col) {
            formatted += `- Col: ${rewards.col}\n`;
        }
        if (rewards.items) {
            formatted += `- Items: ${rewards.items}`;
        }
        
        return formatted.trim();
    }
    
    // ==========================
    // Main Processing
    // ==========================
    
    function processGeneration(hook, text) {
        const progress = loadProgress();
        if (!progress) return { active: false };
        
        switch(hook) {
            case 'context':
                if (progress.completed) {
                    return { active: true, text: text };
                }
                
                // For quests, NPCs, and Locations, use batched collection
                if (progress.entityType === 'Quest' || progress.entityType === 'NPC' || progress.entityType === 'Location') {
                    // Get fields that need to be collected
                    const activeFields = progress.templateFields.filter(field => 
                        !progress.collectedData.hasOwnProperty(field.name)
                    );
                    
                    // If no more fields to collect, mark as completed
                    if (activeFields.length === 0) {
                        progress.completed = true;
                        saveProgress(progress);
                        return { active: true, text: text };
                    }
                    
                    let batchPrompt;
                    if (progress.entityType === 'NPC') {
                        // Build field list for NPC with descriptions
                        let fieldList = '';
                        for (const field of activeFields) {
                            // Include the field name and its prompt/description
                            if (field.prompt) {
                                fieldList += `${field.name}: [${field.prompt}]\n`;
                            } else {
                                // Fallback to just field name if no prompt
                                fieldList += `${field.name}:\n`;
                            }
                        }
                        
                        // Build context of already collected data
                        let context = '';
                        if (Object.keys(progress.collectedData).length > 0) {
                            context = '==== CONTEXT (Already Provided) ====\n';
                            for (const [key, value] of Object.entries(progress.collectedData)) {
                                context += `${key}: ${value}\n`;
                            }
                            context += '\n';
                        }
                        
                        batchPrompt = generatePrompt('NPC Batch', {
                            NAME: progress.triggerName || progress.collectedData.NAME || 'Unknown',
                            FIELD_LIST: fieldList.trim(),
                            CONTEXT: context
                        });
                        
                        progress.expectingBatch = true;
                    } else if (progress.entityType === 'Quest') {
                        // Quest logic
                        batchPrompt = generateQuestBatchPrompt(
                            activeFields,
                            progress.stageCollection.stageCount,
                            progress.stageCollection.stages,
                            progress.collectedData.QUEST_TYPE,
                            progress.collectedData
                        );
                        progress.expectingQuestBatch = true;
                    } else {
                        // Other entity types (like Location) - just use field list
                        let fieldList = '';
                        for (const field of activeFields) {
                            let fieldDescription = field.prompt || field.type;
                            
                            // If it's a choice field, show the options
                            if (field.type === 'choice' && field.params) {
                                fieldDescription = `(${field.params})`;
                            }
                            
                            fieldList += `${field.name}: ${fieldDescription}\n`;
                        }
                        
                        batchPrompt = generatePrompt('Field Collection', {
                            ENTITY_TYPE: progress.entityType,
                            FIELD_LIST: fieldList
                        });
                        progress.expectingBatch = true;
                    }
                    
                    // Store which fields we're asking about
                    progress.currentBatch = activeFields.map(f => f.name);
                    saveProgress(progress);
                    
                    return {
                        active: true,
                        text: text + batchPrompt
                    };
                }
                
                // Entity classification logic
                if (progress.entityType === 'EntityClassification') {
                    const classificationPrompt = generateEntityClassificationPrompt(progress);
                    return {
                        active: true,
                        text: text + classificationPrompt
                    };
                }
                
                // Non-quest entities - generate prompts for missing fields
                const activeFields = getActiveFields(progress.templateFields, progress.collectedData);
                
                if (activeFields.length > 0) {
                    // Build field list for the prompt template
                    let fieldList = '';
                    for (const field of activeFields) {
                        fieldList += `**${field.name}**: ${field.description || `Please provide the ${field.name.toLowerCase().replace(/_/g, ' ')} for this ${progress.entityType}`}\n`;
                    }
                    
                    // Use the Field Collection template
                    const prompt = generatePrompt('Field Collection', {
                        ENTITY_TYPE: progress.entityType,
                        FIELD_LIST: fieldList.trim()
                    });
                    
                    if (debug) console.log(`${MODULE_NAME}: Adding prompt for ${activeFields.length} fields`);
                    return { active: true, text: text + '\n\n' + prompt };
                }
                
                // All fields collected, mark as completed
                progress.completed = true;
                saveProgress(progress);
                return { active: true, text: text };
                
            case 'output':
                if (progress.completed) {
                    // Apply final template and create card
                    const template = loadTemplate(progress.entityType);
                    if (template) {
                        const finalText = processTemplate(template, progress.collectedData);
                        // Pass triggerName and metadata along with collectedData
                        const dataWithTrigger = { ...progress.collectedData };
                        if (progress.triggerName) {
                            dataWithTrigger.triggerName = progress.triggerName;
                        }
                        if (progress.metadata) {
                            dataWithTrigger.metadata = progress.metadata;
                        }
                        createEntityCard(progress.entityType, finalText, dataWithTrigger);
                    }
                    
                    clearProgress();
                    return { active: false }; // Let normal output through on completion
                }
                
                // Handle batch response for Quest, NPC, or Location
                if ((progress.entityType === 'Quest' && progress.expectingQuestBatch) || 
                    (progress.entityType === 'NPC' && progress.expectingBatch) ||
                    (progress.entityType === 'Location' && progress.expectingBatch)) {
                    let allFieldsCollected = true;
                    
                    if (debug) {
                        console.log(`${MODULE_NAME}: Processing Quest batch response`);
                        console.log(`${MODULE_NAME}: Output text: "${text}"`);
                        console.log(`${MODULE_NAME}: currentBatch: ${JSON.stringify(progress.currentBatch)}`);
                    }
                    
                    // Parse regular fields - use ALL template fields, not just currentBatch
                    const responses = parseBatchedResponse(text, progress.templateFields);
                    
                    if (debug) {
                        console.log(`${MODULE_NAME}: Parsed responses: ${JSON.stringify(responses)}`);
                    }
                    
                    // Process each field
                    for (const field of progress.templateFields) {
                        if (!progress.collectedData.hasOwnProperty(field.name)) {
                            const response = responses[field.name];
                            if (response) {
                                const validation = validateField(field, response);
                                if (validation.valid) {
                                    progress.collectedData[field.name] = validation.value;
                                    // Clear any previous validation errors for this field
                                    if (progress.validationErrors && progress.validationErrors[field.name]) {
                                        delete progress.validationErrors[field.name];
                                    }
                                    if (debug) console.log(`${MODULE_NAME}: Collected ${field.name}: ${validation.value}`);
                                } else {
                                    if (debug) console.log(`${MODULE_NAME}: Validation failed for ${field.name}: ${validation.error}`);
                                    // Store validation error for display in next prompt
                                    if (!progress.validationErrors) progress.validationErrors = {};
                                    progress.validationErrors[field.name] = validation.error;
                                    if (field.requirement === 'required') {
                                        allFieldsCollected = false;
                                    }
                                }
                            } else {
                                if (debug) console.log(`${MODULE_NAME}: No response found for ${field.name}`);
                                if (field.requirement === 'required') {
                                    allFieldsCollected = false;
                                }
                            }
                        }
                    }
                    
                    // Parse stages (Quest only)
                    if (progress.entityType === 'Quest' && !progress.collectedData.STAGES) {
                        const stages = parseStageResponse(
                            text,
                            progress.stageCollection.stageCount,
                            progress.stageCollection.stages
                        );
                        
                        // Validate stages
                        const allValid = validateStages(stages, progress.stageCollection.stageCount);
                        
                        progress.stageCollection.stages = stages;
                        
                        if (allValid) {
                            progress.collectedData.STAGES = formatStagesForCard(
                                stages,
                                progress.stageCollection.stageCount
                            );
                            if (debug) console.log(`${MODULE_NAME}: All ${progress.stageCollection.stageCount} stages collected`);
                        } else {
                            allFieldsCollected = false;
                            if (debug) console.log(`${MODULE_NAME}: Stage validation failed, will retry`);
                        }
                    }
                    
                    // Parse rewards (Quest only)
                    if (progress.entityType === 'Quest' && !progress.collectedData.REWARDS) {
                        const rewards = parseRewardsResponse(text);
                        
                        if (rewards.xp && rewards.col) {
                            progress.collectedData.REWARDS = formatRewardsForCard(rewards);
                            progress.collectedData.REWARDS_PARSED = rewards;
                            if (debug) console.log(`${MODULE_NAME}: Rewards collected: ${rewards.xp} XP, ${rewards.col} Col`);
                        } else {
                            allFieldsCollected = false;
                            if (debug) console.log(`${MODULE_NAME}: Rewards incomplete`);
                        }
                    }
                    
                    // Check if we have everything
                    const requiredFields = progress.templateFields.filter(f => f.requirement === 'required');
                    for (const field of requiredFields) {
                        if (!progress.collectedData.hasOwnProperty(field.name)) {
                            allFieldsCollected = false;
                            if (debug) console.log(`${MODULE_NAME}: Missing required field: ${field.name}`);
                        }
                    }
                    
                    // Check for stages and rewards specifically
                    if (!progress.collectedData.STAGES) {
                        allFieldsCollected = false;
                        if (debug) console.log(`${MODULE_NAME}: Missing STAGES`);
                    }
                    if (!progress.collectedData.REWARDS) {
                        allFieldsCollected = false;
                        if (debug) console.log(`${MODULE_NAME}: Missing REWARDS`);
                    }
                    
                    // Set completed if we have everything
                    if (allFieldsCollected) {
                        progress.completed = true;
                        progress.expectingQuestBatch = false;
                        progress.expectingBatch = false;
                        if (debug) console.log(`${MODULE_NAME}: Quest generation completed!`);
                        
                        // Save progress and return completion message
                        saveProgress(progress);
                        return { active: true, text: config.debug ? wrapDebugOutput(text) : COMPLETION_MESSAGE };
                    }
                    
                    progress.currentBatch = null;
                    saveProgress(progress);
                    return { active: true, text: config.debug ? wrapDebugOutput(text) : HIDDEN_OUTPUT };
                }
                
                // Handle entity classification response
                if (progress.entityType === 'EntityClassification') {
                    return handleEntityClassification(progress, text, config);
                }
                
                return { active: true, text: config.debug ? wrapDebugOutput(text) : HIDDEN_OUTPUT };
        }
        
        return { active: false };
    }
    
    // ==========================
    // Field Management
    // ==========================
    function getActiveFields(templateFields, collectedData) {
        // Return all fields that aren't already collected
        if (!templateFields) return [];
        
        return templateFields.filter(field => {
            // Skip if already collected
            if (collectedData.hasOwnProperty(field.name)) {
                return false;
            }
            
            // Include all non-conditional fields
            return field.requirement === 'required' || field.requirement === 'optional';
        });
    }
    
    // ==========================
    // Entity Branching (for 'Entity' type)
    // ==========================
    function handleEntityBranching(response) {
        // Valid entity types for branching
        const validTypes = ['npc', 'monster', 'boss', 'item', 'location', 'quest'];
        const normalized = response.trim().toLowerCase();
        
        if (validTypes.includes(normalized)) {
            // Capitalize first letter for proper entity type
            const properCase = normalized.charAt(0).toUpperCase() + normalized.slice(1);
            
            // Special case: NPC should be all caps
            if (normalized === 'npc') {
                return 'NPC';
            }
            
            return properCase;
        }
        
        return null;
    }
    
    // ==========================
    // Skill Generation
    // ==========================
    function generateRandomSkills(level = 1) {
        // Parse skill sections from [RPG_SCHEMA] Skills card
        const skillsCard = Utilities.storyCard.get('[RPG_SCHEMA] Skills');
        if (!skillsCard || !skillsCard.entry) return '';
        
        const skillsBySection = {};
        let currentSection = null;
        
        const lines = skillsCard.entry.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            
            // Check for section headers
            if (trimmed.startsWith('## ')) {
                currentSection = trimmed.substring(3);
                skillsBySection[currentSection] = [];
                continue;
            }
            
            // Parse skill definitions
            if (trimmed.startsWith('* ') && currentSection) {
                const skillMatch = trimmed.match(/^\* ([a-z_]+):/);
                if (skillMatch) {
                    skillsBySection[currentSection].push(skillMatch[1]);
                }
            }
        }
        
        // Select 2 random skills (max 1 from Combat)
        const selectedSkills = [];
        const sections = Object.keys(skillsBySection);
        
        // First, decide if we're picking from Combat
        const combatSkills = skillsBySection['Combat'] || [];
        const nonCombatSections = sections.filter(s => s !== 'Combat' && s !== 'XP Categories');
        
        if (combatSkills.length > 0 && Math.random() < 0.5) {
            // Pick one combat skill
            const randomCombat = combatSkills[Math.floor(Math.random() * combatSkills.length)];
            selectedSkills.push(randomCombat);
        }
        
        // Fill remaining slots with non-combat skills
        while (selectedSkills.length < 2 && nonCombatSections.length > 0) {
            const randomSection = nonCombatSections[Math.floor(Math.random() * nonCombatSections.length)];
            const sectionSkills = skillsBySection[randomSection] || [];
            
            if (sectionSkills.length > 0) {
                const randomSkill = sectionSkills[Math.floor(Math.random() * sectionSkills.length)];
                selectedSkills.push(randomSkill);
            }
        }
        
        // Format skills with XP values (always start at Level 1)
        const formattedSkills = selectedSkills.map(skill => {
            const xpMax = 100; // Level 1 XP requirement
            const currentXp = Math.floor(Math.random() * 30); // Random progress up to 30 XP
            return `${skill}: Level 1 (${currentXp}/${xpMax} XP)`;
        });
        
        return formattedSkills.join('\n');
    }
    
    // ==========================
    // Final Template Processing
    // ==========================
    function processTemplate(template, collectedData) {
        let finalText = template.entry;
        
        // Generate random skills for NPCs if not provided
        if (!collectedData.SKILLS) {
            collectedData.SKILLS = generateRandomSkills(1); // Always level 1
        }
        
        // Get location from first [PLAYER] if not provided
        if (!collectedData.LOCATION) {
            const players = Utilities.storyCard.find(c => c.title && c.title.startsWith('[PLAYER]'), true);
            if (players && players.length > 0) {
                const match = players[0].entry.match(/Current Location:\s*([^\n]+)/);
                if (match) {
                    collectedData.LOCATION = match[1].trim();
                }
            }
            // Default if no player found
            if (!collectedData.LOCATION) {
                collectedData.LOCATION = 'Town_Of_Beginnings';
            }
        }
        
        // Replace all {{FIELD_NAME}} placeholders
        for (const [field, value] of Object.entries(collectedData)) {
            const placeholder = new RegExp(`\\{\\{${field}\\}\\}`, 'gi');
            finalText = finalText.replace(placeholder, value);
        }
        
        // Process formulas from the description
        const descFields = parseTemplateDescription(template.description);
        for (const field of descFields) {
            if (field.type === FieldTypes.FORMULA && field.params) {
                const placeholder = new RegExp(`\\{\\{${field.name}\\}\\}`, 'gi');
                const result = calculateFormula(field.params, collectedData);
                finalText = finalText.replace(placeholder, result);
            }
            else if (field.type === FieldTypes.GAMESTATE && field.params) {
                const placeholder = new RegExp(`\\{\\{${field.name}\\}\\}`, 'gi');
                // This will be processed by GameState's processGetters
                finalText = finalText.replace(placeholder, `get_${field.params}`);
            }
        }
        
        // Handle optional sections {{#FIELD}}...{{/FIELD}}
        const optionalPattern = /\{\{#([A-Z_]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
        finalText = finalText.replace(optionalPattern, (match, fieldName, content) => {
            if (collectedData[fieldName]) {
                return content;
            }
            return '';
        });
        
        // Clean up any remaining placeholders for optional fields
        finalText = finalText.replace(/\{\{[A-Z_]+\}\}/g, '');
        
        return finalText;
    }
    
    function parseTemplateDescription(description) {
        // Parse ALL fields including formulas and gamestate
        const fields = [];
        const lines = description.split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) continue;
            
            const match = trimmed.match(/^([A-Z_]+):\s*([^,]+),\s*([^,]+)(?:,\s*(.+))?$/);
            if (!match) continue;
            
            const field = {
                name: match[1],
                requirement: match[2].trim(),
                type: null,
                params: null
            };
            
            const typeMatch = match[3].trim().match(/^([a-z]+)(?:\[([^\]]+)\])?$/);
            if (typeMatch) {
                field.type = typeMatch[1];
                field.params = typeMatch[2] || null;
            }
            
            fields.push(field);
        }
        
        return fields;
    }
    
    function calculateFormula(formula, data) {
        try {
            let calcFormula = formula;
            
            // Replace field references
            for (const [field, value] of Object.entries(data)) {
                const pattern = new RegExp(`\\b${field}\\b`, 'gi');
                calcFormula = calcFormula.replace(pattern, value);
            }
            
            // Safely evaluate
            const result = eval(calcFormula);
            return Math.round(result);
        } catch (e) {
            if (debug) console.log(`${MODULE_NAME}: Formula error: ${e}`);
            return 0;
        }
    }
    
    function createEntityCard(entityType, finalText, collectedData) {
        // Determine card title based on entity type
        let cardTitle = '';
        let cardType = '';
        const name = collectedData.NAME || 'Unknown';
        
        // Special handling for NPCs - use GameState's character creation
        if (entityType.toUpperCase() === 'NPC') {
            // Get trigger name from collectedData if it was passed
            const triggerName = collectedData.triggerName || null;
            
            // Transform collected data to character format
            const characterData = transformToCharacterData(collectedData, triggerName);
            
            // Use GameState to create the character if available
            if (typeof GameState !== 'undefined' && GameState.createCharacter) {
                const character = GameState.createCharacter(characterData);
                if (character) {
                    if (debug) console.log(`${MODULE_NAME}: Created NPC ${name} using GameState`);
                    return; // Character was created successfully
                }
            }
            
            // Fallback to manual creation if GameState not available
            cardTitle = `[CHARACTER] ${name}`;
            cardType = 'character';
        }
        
        switch(entityType.toUpperCase()) {
            case 'NPC':
                // Already handled above
                break;
            case 'MONSTER':
                cardTitle = `[MONSTER] ${name}`;
                cardType = 'monster';
                break;
            case 'BOSS':
                cardTitle = `[BOSS] ${name}`;
                cardType = 'boss';
                break;
            case 'LOCATION':
                // Create location card using collectedData (not progress which isn't available here)
                return createLocationFromData(collectedData, collectedData.metadata);
                break;
            case 'ITEM':
                cardTitle = `[ITEM] ${name}`;
                cardType = 'item';
                break;
            case 'QUEST':
                cardTitle = `[QUEST] ${name}`;
                cardType = 'quest';
                break;
            default:
                cardTitle = `[${entityType.toUpperCase()}] ${name}`;
                cardType = entityType.toLowerCase();
        }
        
        // Create keys - username, real name, and trigger name if available
        let keysList = [name];
        if (collectedData.FULL_NAME && collectedData.FULL_NAME !== name) {
            keysList.push(collectedData.FULL_NAME);
        }
        if (collectedData.triggerName && collectedData.triggerName !== name) {
            keysList.push(collectedData.triggerName);
        }
        const keys = keysList.join(', ') + ' ';
        
        // Create the story card
        let description = `Generated by GenerationWizard on turn ${info?.actionCount || 0}`;
        if (collectedData.triggerName && collectedData.triggerName !== name) {
            description += `\nTrigger Name: ${collectedData.triggerName}`;
        }
        
        Utilities.storyCard.add({
            title: cardTitle,
            entry: finalText,
            type: cardType,
            keys: keys,
            description: description
        });
        
        if (debug) console.log(`${MODULE_NAME}: Created entity card: ${cardTitle} with type: ${cardType}, keys: ${keys}`);
        return cardTitle;
    }
    
    // ==========================
    // Default Template Creation
    // ==========================
    function createDefaultTemplates() {
        // NPC Template (creates [CHARACTER] cards)
        Utilities.storyCard.add({
            title: '[GW Template] NPC',
            type: 'data',
            entry: (
                `## **{{NAME}}**{{#FULL_NAME}} [{{FULL_NAME}}]{{/FULL_NAME}}\n` +
                `DOB: {{DOB}} | Gender: {{GENDER}} | HP: {{HP}}/{{MAX_HP}} | Level {{LEVEL}} (0/{{XP_MAX}} XP) | Current Location: {{LOCATION}}\n` +
                `### Appearance\n` +
                `Hair: {{HAIR}} | Eyes: {{EYES}} | Build: {{BUILD}}\n` +
                `### Personality\n` +
                `{{PERSONALITY}}\n` +
                `### Background\n` +
                `{{BACKGROUND}}\n` +
                `### Attributes\n` +
                `VITALITY: {{VITALITY}} | STRENGTH: {{STRENGTH}} | DEXTERITY: {{DEXTERITY}} | AGILITY: {{AGILITY}}\n` +
                `### Skills\n` +
                `{{SKILLS}}\n` +
                `### Inventory\n` +
                `{}\n` +
                `### Relationships\n`
            ),
            description: (
                `// NPC Generation\n` +
                `NAME: required, text, Username/Gamertag (e.g., xXShadowKillerXx, DragonSlayer42, CrimsonBlade)\n` +
                `FULL_NAME: optional, text, Real name (if known)\n` +
                `GENDER: required, text, Gender (Male/Female/Other)\n` +
                `DOB: required, text, Birth date\n` +
                `HAIR: required, text, Hair color and style\n` +
                `EYES: required, text, Eye color\n` +
                `BUILD: required, text, Body build/physique\n` +
                `PERSONALITY: required, text, Core traits and behavior patterns\n` +
                `BACKGROUND: required, text, Their history and who they are\n` +
                `// Auto-calculated fields (Level 1)\n` +
                `LEVEL: formula, formula[1], Character level\n` +
                `HP: formula, formula[100], Current health\n` +
                `MAX_HP: formula, formula[100], Maximum health\n` +
                `XP_MAX: formula, formula[400], Experience required for Level 2\n` +
                `VITALITY: formula, formula[8+Math.floor(Math.random()*6)], Vitality\n` +
                `STRENGTH: formula, formula[8+Math.floor(Math.random()*6)], Strength\n` +
                `DEXTERITY: formula, formula[8+Math.floor(Math.random()*6)], Dexterity\n` +
                `AGILITY: formula, formula[8+Math.floor(Math.random()*6)], Agility`
            ),
        });
        
        // Location Template
        Utilities.storyCard.add({
            title: '[GW Template] Location',
            type: 'data',
            entry: (
                `<$# Locations>\n` +
                `## **{{NAME}}**\n` +
                `Type: {{LOCATION_TYPE}} | Terrain: {{TERRAIN}}\n` +
                `### Description\n` +
                `{{DESCRIPTION}}\n` +
                `### Pathways\n` +
                `{{PATHWAYS}}`
            ),
            description: (
                `// Location Generation\n` +
                `NAME: required, text, Location name (e.g., Dark_Forest, Mountain_Pass)\n` +
                `LOCATION_TYPE: required, choice[Settlement|Safezone|Wilderness|Dungeon|Landmark|Ruins], Primary location type\n` +
                `TERRAIN: required, text, Terrain type (e.g., Plains, Forest, Cobblestone Plaza, etc.)\n` +
                `ATMOSPHERE: required, text, 2-3 words for inherent mood/vibe (e.g., "dark and ominous", "bustling and lively" - NOT current events/scene)\n` +
                `DESCRIPTION: required, text, 2-3 sentences about the location's permanent characteristics (NOT current scene/events/people present)`
            )
        });
        
        // Quest Template
        Utilities.storyCard.add({
            title: '[GW Template] Quest',
            type: 'data',
            entry: (
                `<\$# Quests><\$## Active Quests>\n` +
                `## **{{NAME}}**\n` +
                `Type: {{QUEST_TYPE}} | Giver: {{QUEST_GIVER}} | Current Stage: 0\n` +
                `### Description\n` +
                `{{DESCRIPTION}}\n` +
                `### Stages\n` +
                `{{STAGES}}\n` +
                `### Rewards\n` +
                `{{REWARDS}}`
            ),
            description: (
                `// Quest Generation\n` +
                `NAME: predefined, text, Quest name from accept_quest\n` +
                `QUEST_TYPE: predefined, text, Quest type from accept_quest\n` +
                `QUEST_GIVER: predefined, text, Quest giver from accept_quest\n` +
                `STAGE_COUNT: predefined, number, Number of stages from accept_quest\n` +
                `DESCRIPTION: required, text, Quest story and context\n` +
                `STAGES: batched, text, Quest objectives (collected separately)\n` +
                `REWARDS: batched, text, Quest rewards (XP, Col, Items - collected together)`
            )
        });
        
        // Add other templates as needed...
        
        if (debug) console.log(`${MODULE_NAME}: Created default templates`);
    }
    
    // ==========================
    // Entity Classification Functions
    // ==========================
    
    function generateEntityClassificationPrompt(progress) {
        // Load entity tracker templates
        const templatesCard = Utilities.storyCard.get('[RPG_RUNTIME] Entity Templates');
        if (!templatesCard) {
            return ''; // No templates configured
        }
        
        // Get the appropriate query based on stage
        const templates = parseEntityTemplates(templatesCard.entry);
        const prompts = loadPrompts();
        
        if (progress.stage === 'classification') {
            // First stage - classify the entity
            const query = templates.CLASSIFICATION_QUERY || 
                `Classify the entity "${progress.entityName}" that was just referenced:\n` +
                `ENTITY_TYPE: [CHARACTER/MONSTER/BOSS/GROUP]\n` +
                `FULL_NAME: [Complete name if different from "${progress.entityName}"]\n` +
                `GENDER: [Male/Female/Other/Unknown]\n` +
                `DESCRIPTION: [2-3 sentences about who/what this is]`;
            
            const prompt = prompts['Entity Classification'] || '';
            return prompt.replace('{{CLASSIFICATION_QUERY}}', query.replace('{name}', progress.entityName));
        } else if (progress.stage === 'details') {
            // Second stage - get type-specific details
            const entityType = progress.collectedData.ENTITY_TYPE;
            const queryKey = `${entityType}_QUERY`;
            const query = templates[queryKey] || '';
            
            const prompt = prompts['Entity Details'] || '';
            return prompt.replace('{{DETAILS_QUERY}}', query.replace('{name}', progress.entityName));
        } else if (progress.stage === 'player_specifics') {
            // Third stage - for NPC_PLAYER only
            const query = templates.PLAYER_SPECIFICS_QUERY || '';
            const prompt = prompts['Entity Details'] || '';
            return prompt.replace('{{DETAILS_QUERY}}', query.replace('{name}', progress.entityName));
        }
        
        return '';
    }
    
    function parseEntityTemplates(text) {
        const templates = {};
        const sections = text.split(/^#\s+/m).filter(s => s.trim());
        
        for (const section of sections) {
            const lines = section.split('\n');
            const key = lines[0].trim().replace(/\s+/g, '_').toUpperCase();
            const content = lines.slice(1).join('\n').trim();
            templates[key] = content;
        }
        
        return templates;
    }
    
    function handleEntityClassification(progress, text, config) {
        const debug = config.debug;
        
        if (progress.stage === 'classification') {
            // Parse classification response
            const parsed = parseEntityClassificationResponse(text);
            
            if (parsed.ENTITY_TYPE) {
                progress.collectedData = parsed;
                progress.stage = 'details';
                saveProgress(progress);
                
                if (debug) console.log(`${MODULE_NAME}: Entity classified as ${parsed.ENTITY_TYPE}`);
                return { active: true, text: config.debug ? wrapDebugOutput(text) : HIDDEN_OUTPUT };
            } else {
                if (debug) console.log(`${MODULE_NAME}: Failed to parse entity classification`);
                return { active: true, text: config.debug ? wrapDebugOutput(text) : HIDDEN_OUTPUT };
            }
        } else if (progress.stage === 'details') {
            // Parse type-specific details
            const entityType = progress.collectedData.ENTITY_TYPE;
            const parsed = parseEntityDetailsResponse(text, entityType);
            
            // Merge with existing data
            Object.assign(progress.collectedData, parsed);
            
            // Check if we need player specifics (for NPC_PLAYER)
            if (entityType === 'CHARACTER' && parsed.TYPE === 'NPC_PLAYER') {
                progress.stage = 'player_specifics';
                saveProgress(progress);
                
                if (debug) console.log(`${MODULE_NAME}: Character is NPC_PLAYER, getting additional details`);
                return { active: true, text: config.debug ? wrapDebugOutput(text) : HIDDEN_OUTPUT };
            } else {
                // We have everything, create the entity
                progress.completed = true;
                saveProgress(progress);
                
                // Create the character using GameState
                if (typeof GameState !== 'undefined' && GameState.createCharacter) {
                    const characterData = transformEntityToCharacter(progress.collectedData, progress.entityName);
                    GameState.createCharacter(characterData);
                    
                    // Signal completion to GameState
                    if (GameState.completeEntityGeneration) {
                        GameState.completeEntityGeneration(progress.entityName);
                    }
                }
                
                if (debug) console.log(`${MODULE_NAME}: Entity generation completed for ${progress.entityName}`);
                return { active: true, text: config.debug ? wrapDebugOutput(text) : COMPLETION_MESSAGE };
            }
        } else if (progress.stage === 'player_specifics') {
            // Parse player-specific details
            const parsed = parsePlayerSpecificsResponse(text);
            
            // Merge with existing data
            Object.assign(progress.collectedData, parsed);
            
            // Create the entity
            progress.completed = true;
            saveProgress(progress);
            
            // Create the character using GameState
            if (typeof GameState !== 'undefined' && GameState.createCharacter) {
                const characterData = transformEntityToCharacter(progress.collectedData);
                GameState.createCharacter(characterData);
                
                // Signal completion to GameState
                if (GameState.completeEntityGeneration) {
                    GameState.completeEntityGeneration(progress.entityName);
                }
            }
            
            if (debug) console.log(`${MODULE_NAME}: Player character generation completed for ${progress.entityName}`);
            return { active: true, text: config.debug ? wrapDebugOutput(text) : COMPLETION_MESSAGE };
        }
        
        return { active: true, text: config.debug ? wrapDebugOutput(text) : HIDDEN_OUTPUT };
    }
    
    function parseEntityClassificationResponse(text) {
        const result = {};
        
        // Parse each expected field
        const typeMatch = text.match(/ENTITY_TYPE:\s*([A-Z_]+)/i);
        if (typeMatch) result.ENTITY_TYPE = typeMatch[1].toUpperCase();
        
        const nameMatch = text.match(/FULL_NAME:\s*([^\n]+)/i);
        if (nameMatch) result.FULL_NAME = nameMatch[1].trim();
        
        const genderMatch = text.match(/GENDER:\s*([^\n]+)/i);
        if (genderMatch) result.GENDER = genderMatch[1].trim();
        
        const descMatch = text.match(/DESCRIPTION:\s*([^\n]+(?:\n[^\n]+)?)/i);
        if (descMatch) result.DESCRIPTION = descMatch[1].trim();
        
        return result;
    }
    
    function parseEntityDetailsResponse(text, entityType) {
        const result = {};
        
        // Common fields
        const levelMatch = text.match(/LEVEL:\s*(\d+)/i);
        if (levelMatch) result.LEVEL = parseInt(levelMatch[1]);
        
        const locationMatch = text.match(/LOCATION:\s*([^\n]+)/i);
        if (locationMatch) result.LOCATION = locationMatch[1].trim();
        
        const appearanceMatch = text.match(/APPEARANCE:\s*([^\n]+(?:\n[^\n]+)?)/i);
        if (appearanceMatch) result.APPEARANCE = appearanceMatch[1].trim();
        
        // Type-specific parsing
        if (entityType === 'CHARACTER') {
            const typeMatch = text.match(/TYPE:\s*(NPC|NPC_PLAYER)/i);
            if (typeMatch) result.TYPE = typeMatch[1].toUpperCase();
            
            const personalityMatch = text.match(/PERSONALITY:\s*([^\n]+(?:\n[^\n]+)?)/i);
            if (personalityMatch) result.PERSONALITY = personalityMatch[1].trim();
            
            const backgroundMatch = text.match(/BACKGROUND:\s*([^\n]+(?:\n[^\n]+)?)/i);
            if (backgroundMatch) result.BACKGROUND = backgroundMatch[1].trim();
            
            const skillsMatch = text.match(/PRIMARY_SKILLS:\s*([^\n]+)/i);
            if (skillsMatch) result.PRIMARY_SKILLS = skillsMatch[1].trim();
            
            const itemsMatch = text.match(/STARTING_ITEMS:\s*([^\n]+)/i);
            if (itemsMatch) result.STARTING_ITEMS = itemsMatch[1].trim();
            
            const relMatch = text.match(/RELATIONSHIPS:\s*([^\n]+)/i);
            if (relMatch) result.RELATIONSHIPS = relMatch[1].trim();
        } else if (entityType === 'MONSTER' || entityType === 'BOSS') {
            const abilitiesMatch = text.match(/ABILITIES:\s*([^\n]+(?:\n[^\n]+)?)/i);
            if (abilitiesMatch) result.ABILITIES = abilitiesMatch[1].trim();
            
            const lootMatch = text.match(/LOOT:\s*([^\n]+)/i);
            if (lootMatch) result.LOOT = lootMatch[1].trim();
            
            const weakMatch = text.match(/WEAKNESSES:\s*([^\n]+)/i);
            if (weakMatch) result.WEAKNESSES = weakMatch[1].trim();
            
            if (entityType === 'BOSS') {
                const phasesMatch = text.match(/PHASES:\s*(\d+)/i);
                if (phasesMatch) result.PHASES = parseInt(phasesMatch[1]);
                
                const legendaryMatch = text.match(/LEGENDARY_ACTIONS:\s*([^\n]+)/i);
                if (legendaryMatch) result.LEGENDARY_ACTIONS = legendaryMatch[1].trim();
            }
        }
        
        return result;
    }
    
    function parsePlayerSpecificsResponse(text) {
        const result = {};
        
        const dobMatch = text.match(/DOB:\s*(\d{4}-\d{2}-\d{2})/i);
        if (dobMatch) result.DOB = dobMatch[1];
        
        const classMatch = text.match(/STARTING_CLASS:\s*([^\n]+)/i);
        if (classMatch) result.STARTING_CLASS = classMatch[1].trim();
        
        const attrMatch = text.match(/ATTRIBUTE_FOCUS:\s*([^\n]+)/i);
        if (attrMatch) result.ATTRIBUTE_FOCUS = attrMatch[1].trim();
        
        const skillMatch = text.match(/SKILL_SPECIALIZATION:\s*([^\n]+)/i);
        if (skillMatch) result.SKILL_SPECIALIZATION = skillMatch[1].trim();
        
        const hooksMatch = text.match(/BACKSTORY_HOOKS:\s*([^\n]+(?:\n[^\n]+)?)/i);
        if (hooksMatch) result.BACKSTORY_HOOKS = hooksMatch[1].trim();
        
        return result;
    }
    
    function transformEntityToCharacter(entityData, entityName) {
        // Transform collected entity data into character format for GameState
        const characterData = {
            name: entityData.FULL_NAME || entityName,
            gender: entityData.GENDER || 'Unknown',
            level: entityData.LEVEL || 1,
            location: entityData.LOCATION || 'unknown',
            appearance: entityData.APPEARANCE || '',
            personality: entityData.PERSONALITY || '',
            background: entityData.BACKGROUND || ''
        };
        
        // Add DOB for player characters
        if (entityData.TYPE === 'NPC_PLAYER' && entityData.DOB) {
            characterData.dob = entityData.DOB;
            characterData.isPlayer = true;
        } else {
            characterData.isNPC = true;
        }
        
        // Parse skills
        if (entityData.PRIMARY_SKILLS) {
            characterData.skills = {};
            const skills = entityData.PRIMARY_SKILLS.split(',').map(s => s.trim());
            for (const skill of skills) {
                const skillKey = skill.toLowerCase().replace(/\s+/g, '_');
                characterData.skills[skillKey] = { level: 1 };
            }
        }
        
        // Parse items
        if (entityData.STARTING_ITEMS) {
            characterData.inventory = {};
            const items = entityData.STARTING_ITEMS.split(',').map(s => s.trim());
            for (const item of items) {
                const itemKey = item.toLowerCase().replace(/\s+/g, '_');
                characterData.inventory[itemKey] = 1;
            }
        }
        
        // Parse relationships
        if (entityData.RELATIONSHIPS) {
            characterData.relationships = {};
            // Simple parsing - could be enhanced
            const rels = entityData.RELATIONSHIPS.split(',').map(s => s.trim());
            for (const rel of rels) {
                if (rel && rel !== 'None') {
                    const relKey = rel.toLowerCase().replace(/\s+/g, '_');
                    characterData.relationships[relKey] = 50; // Default neutral
                }
            }
        }
        
        return characterData;
    }
    
    // ==========================
    // Hook Processing / API Mode
    // ==========================
    
    // Auto-initialize API methods on first call
    if (!GenerationWizard.isActive) {
        // Set up all public API methods
        GenerationWizard.isActive = isGenerationActive;
        GenerationWizard.shouldTakeControl = shouldTakeControl;
        
        GenerationWizard.startGeneration = function(entityType, initialData = {}) {
            if (isGenerationActive()) {
                if (debug) console.log(`${MODULE_NAME}: Generation already in progress`);
                return false;
            }
            
            // Special handling for 'Entity' - it's a branching path
            if (entityType === 'Entity') {
                const progress = {
                    entityType: 'Entity',
                    collectedData: {},
                    templateFields: null,
                    completed: false,
                    currentBatch: null,
                    branchResolved: false,
                    startTurn: info?.actionCount || 0
                };
                
                saveProgress(progress);
                if (debug) console.log(`${MODULE_NAME}: Started Entity branching generation`);
                return true;
            }
            
            // Load the specific template
            const template = loadTemplate(entityType);
            if (!template) {
                if (debug) console.log(`${MODULE_NAME}: No template for ${entityType}`);
                return false;
            }
            
            let templateFields = parseTemplateFields(template.description);
            
            // For quests, handle predefined fields from initialData
            if (entityType === 'Quest' && initialData) {
                // Remove predefined fields from the fields to ask
                templateFields = templateFields.filter(field => {
                    if (field.requirement === 'predefined') {
                        return false;
                    }
                    return true;
                });
            }
            
            if (templateFields.length === 0 && entityType !== 'Quest') {
                if (debug) console.log(`${MODULE_NAME}: Empty template for ${entityType}`);
                return false;
            }
            
            // Store trigger name separately if it exists
            const collectedData = { ...initialData };
            let triggerName = null;
            if (collectedData.name) {
                triggerName = collectedData.name;
                delete collectedData.name; // Remove from collected data to avoid confusion
            }
            
            // Pre-fill default values for optional fields
            for (const field of templateFields) {
                if (field.requirement === 'optional' && field.type === 'default' && field.params) {
                    if (!collectedData.hasOwnProperty(field.name)) {
                        collectedData[field.name] = field.params;
                        if (debug) console.log(`${MODULE_NAME}: Set default for ${field.name}: ${field.params}`);
                    }
                }
            }
            
            // Initialize progress - initialData already contains the predefined values
            const progress = {
                entityType: entityType,
                triggerName: triggerName, // Store the original trigger name
                collectedData: collectedData,
                templateFields: templateFields,
                completed: false,
                currentBatch: null,
                branchResolved: true,
                startTurn: info?.actionCount || 0,
                // Quest-specific fields
                stageCollection: entityType === 'Quest' ? {
                    stageCount: initialData?.STAGE_COUNT || 3,
                    stages: {}
                } : null,
                expectingQuestBatch: entityType === 'Quest'
            };
            
            saveProgress(progress);
            if (debug) console.log(`${MODULE_NAME}: Started ${entityType} generation`);
            return true;
        };
        
        GenerationWizard.cancelGeneration = function() {
            if (!isGenerationActive()) return false;
            clearProgress();
            return true;
        };
        
        GenerationWizard.process = function(hook, text) {
            if (!isGenerationActive()) return { active: false };
            return processGeneration(hook, text);
        };
        
        GenerationWizard.startQuestGeneration = function(questName, questGiver, questType, stageCount) {
            if (!questName || !questGiver || !questType || !stageCount) {
                if (debug) console.log(`${MODULE_NAME}: Invalid quest parameters - missing required fields`);
                return false;
            }
            
            // Validate stage count (minimum 2)
            stageCount = parseInt(stageCount);
            if (isNaN(stageCount) || stageCount < 2) {
                if (debug) console.log(`${MODULE_NAME}: Invalid stage count: ${stageCount} (minimum 2 required)`);
                return false;
            }
            
            // Validate quest type - expect lowercase
            const validTypes = ['story', 'side', 'hidden', 'raid'];
            if (!validTypes.includes(questType)) {
                if (debug) console.log(`${MODULE_NAME}: Invalid quest type: ${questType}`);
                return false;
            }
            
            // Start generation with predefined values
            return GenerationWizard.startGeneration('Quest', {
                NAME: questName,
                QUEST_TYPE: questType,  // Pass through as lowercase
                QUEST_GIVER: questGiver,
                STAGE_COUNT: stageCount
            });
        };
        
        GenerationWizard.startEntityGeneration = function(entityData) {
            if (!entityData || !entityData.name) {
                if (debug) console.log(`${MODULE_NAME}: Invalid entity data - missing name`);
                return false;
            }
            
            if (isGenerationActive()) {
                if (debug) console.log(`${MODULE_NAME}: Generation already in progress`);
                return false;
            }
            
            // Start with entity classification stage
            const progress = {
                entityType: 'EntityClassification',
                entityName: entityData.name,
                stage: entityData.stage || 'classification',
                collectedData: entityData.collectedData || {},
                templateFields: null,
                completed: false,
                currentBatch: null,
                branchResolved: false,
                startTurn: info?.actionCount || 0
            };
            
            saveProgress(progress);
            if (debug) console.log(`${MODULE_NAME}: Started entity classification for ${entityData.name}`);
            return true;
        };
        
        // Generic start generation method for any entity type
        GenerationWizard.startGeneration = function(entityType, triggerName, initialData) {
            if (!entityType) {
                if (debug) console.log(`${MODULE_NAME}: Invalid entity type`);
                return false;
            }
            
            if (isGenerationActive()) {
                if (debug) console.log(`${MODULE_NAME}: Generation already in progress`);
                return false;
            }
            
            // Check if template exists
            const template = loadTemplate(entityType);
            if (!template) {
                if (debug) console.log(`${MODULE_NAME}: Template not found for ${entityType}`);
                return false;
            }
            
            // Parse template fields
            let templateFields = parseTemplateFields(template.description);
            
            // Create progress object
            const progress = {
                entityType: entityType,
                entityName: initialData?.NAME || triggerName || 'Unknown',
                triggerName: triggerName,
                stage: 'generation',
                collectedData: initialData || {},
                templateFields: templateFields,
                metadata: initialData?.metadata || {},
                completed: false,
                currentBatch: null,
                branchResolved: true,
                startTurn: info?.actionCount || 0,
                expectingBatch: entityType === 'NPC' || entityType === 'Location'
            };
            
            saveProgress(progress);
            if (debug) console.log(`${MODULE_NAME}: Started ${entityType} generation`);
            return true;
        };
    }
    
    // Handle hook-based initialization
    if (hook === 'api') {
        return GenerationWizard;
    }
    
    // Create default templates on first run
    if (!Utilities.storyCard.get('[GW Template] NPC')) {
        createDefaultTemplates();
    }
    
    // Create combined config/prompts card on first run
    if (!Utilities.storyCard.get(CONFIG_AND_PROMPTS_CARD)) {
        createDefaultConfigAndPrompts();
    }
    
    return GenerationWizard;
}