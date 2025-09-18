function SANEDefaults(GameStateAPI) {
    // all default Story Cards and tool implementations

    // All default Story Cards
    const defaultCards = [
        // Component Schemas
        {
            title: '[SANE:S] stats',
            description: JSON.stringify({
                id: 'stats',
                defaults: {
                    level: { value: 1, xp: { current: 0, max: 500 } },
                    hp: { current: 100, max: 100 },
                    display: [
                        { line: "infoline", priority: 30, format: "Level $(level.value) ($(level.xp.current)/$(level.xp.max))" },
                        { line: "infoline", priority: 40, format: "HP: $(hp.current)/$(hp.max)" }
                    ]
                },
                level_progression: {
                    xp_formula: "level * (level - 1) * 500"
                }
            }, null, 2),
            type: 'schema'
        },
        {
            title: '[SANE:S] info',
            description: JSON.stringify({
                id: 'info',
                defaults: {
                    gender: null,
                    race: null,
                    class: null,
                    currentLocation: null,
                    username: null,
                    realname: null,
                    description: null,
                    appearance: null,
                    display: [
                        { line: "nameline", priority: 10, format: "## **$(id)**" },
                        { line: "nameline", priority: 11, format: " [$(realname)]", condition: "$(realname)" },
                        { line: "infoline", priority: 10, format: "$(gender)" },
                        { line: "infoline", priority: 50, format: "Location: $(currentLocation)" }
                    ]
                }
            }, null, 2),
            type: 'schema'
        },
        {
            title: '[SANE:S] inventory',
            description: JSON.stringify({
                id: 'inventory',
                defaults: {
                    display: {
                        line: "section",
                        priority: 40,
                        format: "**Inventory**\n$(*: • $(*) x$(*.quantity))",
                        condition: "$(Object.keys(inventory).length > 0)"
                    }
                }
            }, null, 2),
            type: 'schema'
        },
        {
            title: '[SANE:S] skills',
            description: JSON.stringify({
                id: 'skills',
                defaults: {
                    display: {
                        line: "section",
                        priority: 30,
                        format: "**Skills**\n$(*: • $(*): Level $(*.level) ($(*.xp.current)/$(*.xp.max) XP))",
                        condition: "$(Object.keys(skills).length > 0)"
                    }
                },
                registry: ["One_Handed_Sword", "Two_Handed_Sword", "Rapier", "Shield", "Parry",
                          "Battle_Healing", "Searching", "Tracking", "Hiding", "Night_Vision",
                          "Sprint", "Acrobatics", "Cooking", "Fishing", "Blacksmithing",
                          "Tailoring", "Alchemy", "Medicine_Mixing"]
            }, null, 2),
            type: 'schema'
        },
        {
            title: '[SANE:S] attributes',
            description: JSON.stringify({
                id: 'attributes',
                defaults: {
                    STRENGTH: { value: 10 },
                    AGILITY: { value: 10 },
                    VITALITY: { value: 10 },
                    display: {
                        line: "infoline",
                        priority: 25,
                        format: "STR: $(STRENGTH.value) | AGI: $(AGILITY.value) | VIT: $(VITALITY.value)"
                    }
                },
                registry: ["STRENGTH", "AGILITY", "VITALITY", "INTELLIGENCE", "WISDOM", "CHARISMA", "LUCK"]
            }, null, 2),
            type: 'schema'
        },
        {
            title: '[SANE:S] relationships',
            description: JSON.stringify({
                id: 'relationships',
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
                    { min: 500, max: 999, flavor: "{from} trusts {to} completely" },
                    { min: 1000, max: 1999, flavor: "{from} considers {to} family" },
                    { min: 2000, max: 9999, flavor: "{from} would do absolutely anything for {to}" }
                ]
            }, null, 2),
            type: 'schema'
        },
        {
            title: '[SANE:S] pathways',
            description: JSON.stringify({
                id: 'pathways',
                defaults: {
                    north: null,
                    south: null,
                    east: null,
                    west: null,
                    up: null,
                    down: null,
                    display: {
                        line: "section",
                        priority: 60,
                        format: "**Exits**\n$(*: • $(*): to $(*))",
                        condition: "$(Object.keys(pathways).length > 0)"
                    }
                },
                opposites: {
                    'north': 'south',
                    'south': 'north',
                    'east': 'west',
                    'west': 'east',
                    'inside': 'outside',
                    'outside': 'inside',
                    'above': 'below',
                    'below': 'above'
                }
            }, null, 2),
            type: 'schema'
        },
        {
            title: '[SANE:S] objectives',
            description: JSON.stringify({
                id: 'objectives',
                defaults: {
                    type: null,
                    status: "active",
                    stages: {},
                    display: {
                        line: "section",
                        priority: 35,
                        format: "**Objectives** [$(type)]\n$(stages: • Stage $(*): $(*))",
                        condition: "$(status === 'active')"
                    }
                }
            }, null, 2),
            type: 'schema'
        },
        {
            title: '[SANE:S] rewards',
            description: JSON.stringify({
                id: 'rewards',
                defaults: {
                    xp: 0,
                    col: 0,
                    items: {},
                    display: {
                        line: "section",
                        priority: 45,
                        format: "**Rewards**\nXP: $(xp) | Col: $(col)\n$(items: • $(*) x$(*.quantity))",
                        condition: "$(xp > 0 || col > 0 || Object.keys(items).length > 0)"
                    }
                }
            }, null, 2),
            type: 'schema'
        },
        {
            title: '[SANE:S] display',
            description: JSON.stringify({
                id: 'display',
                defaults: {
                    prefixline: null,
                    footer: null,
                    separators: {
                        nameline: " ",
                        infoline: " | ",
                        section: "\n",
                        footer: "\n"
                    },
                    order: ["prefixline", "nameline", "infoline", "section", "footer"],
                    active: true
                }
            }, null, 2),
            type: 'schema'
        },
        {
            title: '[SANE:S] generationwizard',
            description: JSON.stringify({
                id: 'generationwizard',
                defaults: {
                    // CLEAN NEW STRUCTURE - no legacy support
                    state: "dormant",                 // ENUM: generating | dormant | queued | deactivated
                    activeGeneration: null,           // Which generation object is currently active
                    generations: {},                  // Generation objects (temporary work packages)

                    // Display is always null for generationwizard (it's not user-visible)
                    display: null
                }
            }, null, 2),
            type: 'schema'
        }
    ];

    // Tool factory functions
    const toolFactories = {
        // Time tools
        advance_time: (ctx) => function(hours, minutes) {
            const { debug, MODULE_NAME, Calendar } = ctx;
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

        // Location tools
        update_location: (ctx) => function(characterName, location) {
            const { debug, MODULE_NAME, get, save, trackUnknownEntity, shouldTriggerGeneration, addToEntityQueue, info } = ctx;
            try {
                if (!characterName || !location) return 'malformed';

                characterName = String(characterName).toLowerCase();
                location = String(location).toLowerCase().replace(/\s+/g, '_');

                // Check if character exists using universal system
                const character = get(characterName);
                if (character) {
                    // Character exists, update location using component structure
                    if (!character.info) {
                        if (debug) console.log(`${MODULE_NAME}: Character ${characterName} missing info component`);
                        return 'malformed';
                    }
                    character.info.currentLocation = location;
                    save(characterName, character);
                    if (debug) console.log(`${MODULE_NAME}: ${characterName} moved to ${location}`);
                    return 'executed';
                }

                // Character not found - track and potentially generate
                trackUnknownEntity(characterName, 'update_location', info?.actionCount);
                if (shouldTriggerGeneration(characterName)) {
                    addToEntityQueue(characterName);
                }
                if (debug) {
                    console.log(`${MODULE_NAME}: Unknown character ${characterName} referenced in update_location`);
                }

                return 'executed';
            } catch (e) {
                console.log(`${MODULE_NAME}: Error in update_location: ${e.message}`);
                if (debug) console.log(`${MODULE_NAME}: Stack trace:`, e.stack);
                return 'malformed';
            }
        },

        // Inventory tools
        add_item: (ctx) => function(characterName, itemName, quantity) {
            const { debug, MODULE_NAME, get, save } = ctx;
            try {
                if (!characterName || !itemName) return 'malformed';

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
                const character = get(characterName);

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

                // Remove item if quantity reaches 0, otherwise store as object
                if (newQty === 0) {
                    delete inventory[itemName];
                } else {
                    inventory[itemName] = { quantity: newQty };
                }

                if (debug) {
                    console.log(`${MODULE_NAME}: ${characterName}'s ${itemName}: ${currentQty} → ${newQty}`);
                }

                save(characterName, character);
                return 'executed';
            } catch (e) {
                console.log(`${MODULE_NAME}: Error in add_item: ${e.message}`);
                if (debug) console.log(`${MODULE_NAME}: Stack trace:`, e.stack);
                return 'malformed';
            }
        },

        remove_item: (ctx) => function(characterName, itemName, quantity) {
            const { debug, MODULE_NAME, builtInTools } = ctx;
            if (!characterName || !itemName) return 'malformed';

            // Allow negative numbers (which would add items)
            const qtyStr = String(quantity).trim();
            if (!/^-?\d+$/.test(qtyStr)) {
                if (debug) console.log(`${MODULE_NAME}: Invalid quantity format for remove_item: ${quantity}`);
                return 'malformed';
            }
            quantity = parseInt(qtyStr);

            // 0 is malformed (use positive to remove, negative to add)
            if (isNaN(quantity) || quantity === 0) {
                if (debug) console.log(`${MODULE_NAME}: Invalid quantity for remove_item: ${quantity}`);
                return 'malformed';
            }

            // Just call add_item with negative quantity
            // Note: We need to get the actual tool function from builtInTools
            return builtInTools.add_item(characterName, itemName, -quantity);
        },

        use_consumable: (ctx) => function(characterName, itemName, quantity) {
            const { builtInTools } = ctx;
            // Identical validation to remove_item
            return builtInTools.remove_item(characterName, itemName, quantity);
        },

        transfer_item: (ctx) => function(giverName, receiverName, itemName, quantity) {
            const { debug, MODULE_NAME, queryTags, trackUnknownEntity, shouldTriggerGeneration, addToEntityQueue, getItemQuantity, setItemQuantity, save, info } = ctx;
            if (!giverName || !receiverName || !itemName) return 'malformed';

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

            const characters = queryTags('Character');
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
                const availableQty = getItemQuantity(giver.inventory, itemName);
                transferQty = Math.min(availableQty, requestedQty);

                if (transferQty > 0) {
                    setItemQuantity(giver.inventory, itemName, availableQty - transferQty);
                    save(giverName, giver);
                    anySuccess = true;

                    if (debug) console.log(`${MODULE_NAME}: Removed ${transferQty} ${itemName} from ${giver.name}`);
                } else {
                    if (debug) console.log(`${MODULE_NAME}: ${giver.name} has no ${itemName} to transfer`);
                    return 'executed'; // Valid attempt, just no items
                }
            }

            if (receiver) {
                const currentReceiverQty = getItemQuantity(receiver.inventory, itemName);
                setItemQuantity(receiver.inventory, itemName, currentReceiverQty + transferQty);

                save(receiverName, receiver);
                anySuccess = true;

                if (debug) console.log(`${MODULE_NAME}: Added ${transferQty} ${itemName} to ${receiver.name}`);
            }

            return anySuccess ? 'executed' : 'executed';
        },

        // Combat tools
        deal_damage: (ctx) => function(sourceName, targetName, damageAmount) {
            const { debug, MODULE_NAME, get, save } = ctx;
            if (!targetName) return 'malformed';

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
            const target = get(targetName);
            if (!target) {
                if (debug) {
                    console.log(`${MODULE_NAME}: Target ${targetName} not found`);
                }
                return 'executed';
            }

            // Only load source if needed and exists
            const source = (sourceName !== 'unknown')
                ? get(sourceName) : null;

            const sourceDisplay = source ? source.name : sourceName;

            // Ensure stats component exists
            if (!target.stats) {
                target.stats = {};
            }
            if (!target.stats.hp) {
                target.stats.hp = { current: 100, max: 100 };
            }

            const oldHP = target.stats.hp.current;
            const maxHP = target.stats.hp.max;
            const newHP = Math.max(0, oldHP - damageAmount);
            const actualDamage = oldHP - newHP;

            // Update HP in stats component
            target.stats.hp.current = newHP;

            if (debug) {
                console.log(`${MODULE_NAME}: ${sourceDisplay} dealt ${actualDamage} damage to ${target.name} (${oldHP} → ${newHP}/${maxHP})`);
            }

            save(targetName, target);
            return 'executed';
        },

        // Character progression tools
        add_levelxp: (ctx) => function(characterName, xpAmount) {
            const { debug, MODULE_NAME, get, save, trackUnknownEntity, shouldTriggerGeneration, addToEntityQueue, calculateLevelXPRequirement, calculateMaxHP, processLevelUp, info } = ctx;
            if (!characterName) return 'malformed';

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
            const character = get(characterName);

            if (!character) {
                trackUnknownEntity(characterName, 'add_levelxp', info?.actionCount);
                if (shouldTriggerGeneration(characterName)) {
                    addToEntityQueue(characterName);
                }
                return 'executed';
            }

            // Update XP using nested level.xp structure
            if (!character.stats || !character.stats.level || !character.stats.level.xp) {
                if (debug) console.log(`${MODULE_NAME}: Character ${characterName} missing stats.level.xp component`);
                return 'malformed';
            }
            character.stats.level.xp.current += xpAmount;

            // Handle negative XP (level down)
            while (character.stats.level.xp.current < 0 && character.stats.level.value > 1) {
                // Level down
                character.stats.level.value--;

                // Get max XP for the new (lower) level
                const newMaxXp = calculateLevelXPRequirement(character.stats.level.value);

                // Add the max XP to current (negative) XP
                character.stats.level.xp.current += newMaxXp;
                character.stats.level.xp.max = newMaxXp;

                // Adjust HP for level down
                const newMaxHp = calculateMaxHP(character.stats.level.value);
                if (character.stats.hp) {
                    character.stats.hp.max = newMaxHp;
                    // Keep current HP proportional if it exceeds new max
                    if (character.stats.hp.current > newMaxHp) {
                        character.stats.hp.current = newMaxHp;
                    }
                }

                if (debug) console.log(`${MODULE_NAME}: ${character.id} leveled DOWN to ${character.stats.level.value}`);
            }

            // Ensure XP doesn't go below 0 at level 1
            if (character.stats.level.xp.current < 0) {
                character.stats.level.xp.current = 0;
            }

            const action = xpAmount > 0 ? 'Added' : 'Removed';
            if (debug) console.log(`${MODULE_NAME}: ${action} ${Math.abs(xpAmount)} XP ${xpAmount > 0 ? 'to' : 'from'} ${characterName} (${character.stats.level.xp.current}/${character.stats.level.xp.max})`);

            // Process level up if XP is positive
            if (xpAmount > 0) {
                processLevelUp(character);
            }
            save(characterName, character);
            return 'executed';
        },

        add_skillxp: (ctx) => function(characterName, skillName, xpAmount) {
            const { debug, MODULE_NAME, get, save, trackUnknownEntity, shouldTriggerGeneration, addToEntityQueue, calculateSkillXPRequirement, processSkillLevelUp, info } = ctx;
            if (!characterName || !skillName) return 'malformed';

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
            const character = get(characterName);

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
                if (debug) console.log(`${MODULE_NAME}: Skill ${skillName} not found on ${character.id}`);
                return 'malformed';
            }

            const skill = character.skills[skillName];
            skill.xp.current += xpAmount;

            // Handle negative skill XP (skill level down)
            while (skill.xp.current < 0 && skill.level > 1) {
                // Level down the skill
                skill.level--;

                // Get max XP for the new (lower) skill level
                const newMaxXp = calculateSkillXPRequirement(skillName, skill.level);

                // Add the max XP to current (negative) XP
                skill.xp.current += newMaxXp;
                skill.xp.max = newMaxXp;

                if (debug) console.log(`${MODULE_NAME}: ${character.id}'s ${skillName} leveled DOWN to ${skill.level}`);
            }

            // Ensure XP doesn't go below 0 at skill level 1
            if (skill.xp.current < 0) {
                skill.xp.current = 0;
            }

            const action = xpAmount > 0 ? 'Added' : 'Removed';
            if (debug) console.log(`${MODULE_NAME}: ${action} ${Math.abs(xpAmount)} XP ${xpAmount > 0 ? 'to' : 'from'} ${character.id}'s ${skillName} (${skill.xp.current}/${skill.xp.max})`);

            // Process skill level up if XP is positive
            if (xpAmount > 0) {
                processSkillLevelUp(skill, skillName);
            }
            save(characterName, character);
            return 'executed';
        },

        unlock_newskill: (ctx) => function(characterName, skillName) {
            const { debug, MODULE_NAME, get, save, trackUnknownEntity, shouldTriggerGeneration, addToEntityQueue, getSkillRegistry, calculateSkillXPRequirement, info } = ctx;
            if (!characterName || !skillName) return 'malformed';

            characterName = String(characterName).toLowerCase();
            skillName = String(skillName).toLowerCase().replace(/\s+/g, '_');

            // Check if skill exists in registry
            const skillRegistry = getSkillRegistry();
            if (!skillRegistry[skillName]) {
                if (debug) console.log(`${MODULE_NAME}: Unknown skill: ${skillName}. Valid skills: ${Object.keys(skillRegistry).join(', ')}`);
                return 'malformed';
            }

            // Selectively load only the character needed
            const character = get(characterName);

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
                if (debug) console.log(`${MODULE_NAME}: ${character.id} already has ${skillName}`);
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

            if (debug) console.log(`${MODULE_NAME}: ${character.id} learned ${skillName}!`);

            save(characterName, character);
            return 'executed';
        },

        update_attribute: (ctx) => function(characterName, attrName, value) {
            const { debug, MODULE_NAME, get, save } = ctx;
            if (!characterName || !attrName) return 'malformed';

            characterName = String(characterName).toLowerCase();
            attrName = String(attrName).toLowerCase();
            value = parseInt(value);

            if (isNaN(value) || value <= 0) {
                if (debug) console.log(`${MODULE_NAME}: Invalid attribute value: ${value}`);
                return 'malformed';
            }

            // Selectively load only the character needed
            const character = get(characterName);

            if (!character) {
                if (debug) console.log(`${MODULE_NAME}: Character ${characterName} not found for update_attribute`);
                return 'permitted'; // Allow hallucinated characters
            }

            // Initialize attributes component if it doesn't exist
            if (!character.attributes) {
                character.attributes = {};
            }

            // Set attribute using proper component structure
            // Attributes use { attributeName: { value: X } } format
            if (!character.attributes[attrName]) {
                character.attributes[attrName] = {};
            }
            character.attributes[attrName].value = value;

            if (debug) console.log(`${MODULE_NAME}: Set ${character.id}'s ${attrName} to ${value}`);

            save(characterName, character);
            return 'executed';
        },

        // Relationship tools
        update_relationship: (ctx) => function(name1, name2, changeAmount) {
            const { debug, MODULE_NAME, get, save, trackUnknownEntity, shouldTriggerGeneration, addToEntityQueue, getRelationshipFlavor, info } = ctx;
            if (!name1 || !name2) return 'malformed';

            // Convert to consistent case for lookup (get() handles case-insensitive resolution)
            name1 = String(name1);
            name2 = String(name2);

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

            // Use get() for proper case-insensitive alias resolution
            const char1 = get(name1);
            const char2 = get(name2);

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

            // Update bidirectional relationships with proper object structure
            if (!char1.relationships[name2]) {
                char1.relationships[name2] = { value: 0 };
            } else if (typeof char1.relationships[name2] === 'number') {
                // Migrate old format
                char1.relationships[name2] = { value: char1.relationships[name2] };
            }

            if (!char2.relationships[name1]) {
                char2.relationships[name1] = { value: 0 };
            } else if (typeof char2.relationships[name1] === 'number') {
                // Migrate old format
                char2.relationships[name1] = { value: char2.relationships[name1] };
            }

            char1.relationships[name2].value += changeAmount;
            char2.relationships[name1].value += changeAmount;

            const flavorText1 = getRelationshipFlavor(char1.relationships[name2].value, name1, name2);
            const flavorText2 = getRelationshipFlavor(char2.relationships[name1].value, name2, name1);

            save(name1, char1);
            save(name2, char2);

            if (debug) {
                console.log(`${MODULE_NAME}: ${name1}→${name2}: ${flavorText1}`);
                console.log(`${MODULE_NAME}: ${name2}→${name1}: ${flavorText2}`);
            }

            return 'executed';
        },

        // Location discovery tools
        discover_location: (ctx) => function(characterName, locationName, direction) {
            const { debug, MODULE_NAME, get, hasGameplayTag, getOppositeDirection, BlueprintManager } = ctx;
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
            // Selectively load only the character needed
            const character = get(characterName);

            if (!character) {
                if (debug) {
                    console.log(`${MODULE_NAME}: Character ${characterName} not found`);
                }
                return 'malformed';
            }

            const currentLocation = character.location;

            // Check if location already exists using universal data system
            const existingLocation = get(locationName);
            if (existingLocation && hasGameplayTag(existingLocation, 'Location')) {
                if (debug) console.log(`${MODULE_NAME}: Location ${locationName} already exists - use connect_locations instead`);
                return 'malformed';
            }

            // Create location using new instantiateBlueprint API
            if (typeof BlueprintManager !== 'undefined' && BlueprintManager.instantiateBlueprint) {
                const oppositeDir = getOppositeDirection(direction);

                // Use new unified API - just provide known data
                const entityId = BlueprintManager.instantiateBlueprint('Location', {
                    aliases: [locationName],  // Set the name
                    info: {
                        trigger_name: locationName,
                        connectedFrom: currentLocation,
                        discovered_by: character.id
                    },
                    pathways: {
                        [oppositeDir || 'unknown']: currentLocation
                    }
                });

                if (debug) console.log(`${MODULE_NAME}: Created location ${entityId} via instantiateBlueprint`);
            }

            if (debug) console.log(`${MODULE_NAME}: ${character.id} discovered ${locationName} to the ${direction}`);
            return 'executed';
        },

        connect_locations: (ctx) => function(locationA, locationB, directionFromA, bidirectional) {
            const { debug, MODULE_NAME, get, hasGameplayTag, updateLocationPathway, getOppositeDirection } = ctx;
            if (!locationA || !locationB || !directionFromA) return 'malformed';

            locationA = String(locationA).replace(/\s+/g, '_');
            locationB = String(locationB).replace(/\s+/g, '_');
            directionFromA = String(directionFromA).toLowerCase();

            // Parse bidirectional parameter - default to true if not specified
            if (bidirectional === undefined || bidirectional === null || bidirectional === '') {
                bidirectional = true;
            } else if (typeof bidirectional === 'string') {
                bidirectional = bidirectional.toLowerCase() === 'true' || bidirectional === '1' || bidirectional === 'yes' || bidirectional === "t";
            } else {
                bidirectional = Boolean(bidirectional);
            }

            // Check both locations exist using universal data system
            const locA = get(locationA);
            const locB = get(locationB);

            if (!locA || !locB) {
                if (debug) console.log(`${MODULE_NAME}: One or both locations not found`);
                return 'malformed';
            }

            // Verify they have Location gameplay tag
            if (!hasGameplayTag(locA, 'Location') || !hasGameplayTag(locB, 'Location')) {
                if (debug) console.log(`${MODULE_NAME}: One or both entities are not locations`);
                return 'malformed';
            }

            // Update pathway from A to B
            updateLocationPathway(locationA, directionFromA, locationB, false); // false = don't auto-bidirectional

            // Update reverse pathway if bidirectional
            if (bidirectional) {
                const oppositeDir = getOppositeDirection(directionFromA);
                if (oppositeDir) {
                    updateLocationPathway(locationB, oppositeDir, locationA, false);
                    if (debug) console.log(`${MODULE_NAME}: Connected ${locationA} <-${directionFromA}/${oppositeDir}-> ${locationB} (bidirectional)`);
                } else {
                    if (debug) console.log(`${MODULE_NAME}: Connected ${locationA} -${directionFromA}-> ${locationB} (one-way, no opposite for '${directionFromA}')`);
                }
            } else {
                if (debug) console.log(`${MODULE_NAME}: Connected ${locationA} -${directionFromA}-> ${locationB} (one-way)`);
            }

            return 'executed';
        },

        // Quest tools
        accept_quest: (ctx) => function(playerName, questName, questGiver, questType) {
            const { debug, MODULE_NAME } = ctx;
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
                // Schema parsing code...
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

            // Check BlueprintManager availability
            if (typeof BlueprintManager === 'undefined') {
                if (debug) console.log(`${MODULE_NAME}: BlueprintManager not available`);
                return 'executed';
            }

            // Check if already generating
            gwActive = Utilities.storyCard.get('[GW_IN_PROGRESS]') !== null;
            if (gwActive) {
                if (debug) console.log(`${MODULE_NAME}: Generation already in progress`);
                return 'executed';
            }

            // Determine stage count based on type (using lowercase)
            const range = stageRanges[normalizedType];
            const stageCount = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;

            if (debug) console.log(`${MODULE_NAME}: Starting quest generation - Name: ${questName}, Type: ${normalizedType}, Stages: ${stageCount}`);

            // Create quest using new instantiateBlueprint API
            if (BlueprintManager.instantiateBlueprint) {
                const entityId = BlueprintManager.instantiateBlueprint('Quest', {
                    aliases: [questName],
                    info: {
                        giver: questGiver,
                        type: normalizedType,
                        stageCount: stageCount
                    }
                });

                if (debug) console.log(`${MODULE_NAME}: Created quest ${entityId} via instantiateBlueprint`);
                return 'executed';
            } else {
                if (debug) console.log(`${MODULE_NAME}: BlueprintManager.instantiateBlueprint not available`);
                return 'executed';
            }
        },

        offer_quest: (ctx) => function(npcName, questName, questGiver, questType) {
            const { debug, MODULE_NAME } = ctx;
            // Dummy tool - does nothing but is recognized as valid
            // NPC quest offering not yet implemented
            if (!npcName || !questName) return 'malformed';

            if (debug) console.log(`${MODULE_NAME}: offer_quest not yet implemented: ${npcName} offers ${questName}`);
            return 'executed';
        },

        update_quest: (ctx) => function(playerName, questName, stage) {
            const { debug, MODULE_NAME } = ctx;
            if (!questName) return 'malformed';

            questName = String(questName).toLowerCase().replace(/\s+/g, '_');

            // Get the quest using universal data system
            const quest = get(questName);
            if (!quest || !hasGameplayTag(quest, 'Quest')) {
                if (debug) console.log(`${MODULE_NAME}: Quest ${questName} not found`);
                return 'unknown';  // Return unknown so it gets removed
            }

            // Parse the new stage number
            const newStage = parseInt(stage) || 1;

            // Update quest stage
            if (!quest.objectives) quest.objectives = {};
            if (!quest.objectives.stages) quest.objectives.stages = {};
            quest.objectives.stages.current = newStage;

            save(questName, quest);

            if (debug) console.log(`${MODULE_NAME}: Updated ${questName} to stage ${newStage}`);
            return 'executed';
        },

        complete_quest: (ctx) => function(characterName, questName) {
            const { debug, MODULE_NAME } = ctx;
            if (!characterName || !questName) return 'malformed';

            try {
                characterName = String(characterName).toLowerCase();
                questName = String(questName).toLowerCase().replace(/\s+/g, '_');

                // Find the quest using universal data system
                const quest = get(questName);
                if (!quest || !hasGameplayTag(quest, 'Quest')) {
                    if (debug) console.log(`${MODULE_NAME}: Quest ${questName} not found`);
                    return 'executed';
                }

                // Update quest status to completed
                if (!quest.state) quest.state = {};
                quest.state.status = 'completed';

                // Save the updated quest
                save(questName, quest);

                if (debug) console.log(`${MODULE_NAME}: Completed quest: ${questName}`);
                return 'executed';
            } catch (e) {
                if (debug) console.log(`${MODULE_NAME}: Error in complete_quest: ${e.message}`);
                return 'malformed';
            }
        },

        abandon_quest: (ctx) => function(characterName, questName) {
            const { debug, MODULE_NAME, get, save, hasGameplayTag } = ctx;
            if (!characterName || !questName) return 'malformed';

            characterName = String(characterName).toLowerCase();
            questName = String(questName).toLowerCase().replace(/\s+/g, '_');

            // Find the quest using universal data system
            const quest = get(questName);
            if (!quest || !hasGameplayTag(quest, 'Quest')) {
                if (debug) console.log(`${MODULE_NAME}: Quest ${questName} not found`);
                return 'executed';
            }

            // Update quest status to abandoned
            if (!quest.state) quest.state = {};
            quest.state.status = 'abandoned';

            // Save the updated quest
            save(questName, quest);

            if (debug) console.log(`${MODULE_NAME}: Abandoned quest: ${questName}`);
            return 'executed';
        },

        death: (ctx) => function(characterName) {
            const { debug, MODULE_NAME } = ctx;
            if (!characterName) return 'malformed';

            characterName = String(characterName).toLowerCase();
            if (debug) console.log(`${MODULE_NAME}: Death recorded for: ${characterName}`);
            return 'executed';
        }
    };

    return {
        defaultCards,
        toolFactories
    };
}
