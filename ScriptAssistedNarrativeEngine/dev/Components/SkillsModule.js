function SkillsModule() {
    'use strict';

    const MODULE_NAME = 'SkillsModule';
    const debug = true;

    // Module will receive GameState API during init
    let GameState = null;

    // Helper functions
    function calculateLevelXPRequirement(level) {
        return level * (level - 1) * 500;
    }

    function calculateMaxHP(level) {
        return 100 + (level - 1) * 50;
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

            if (debug) {
                console.log(`${MODULE_NAME}: ${character.id} leveled up to ${stats.level.value}!`);
            }
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

            if (debug) {
                console.log(`${MODULE_NAME}: ${skillName} leveled up to ${skill.level}!`);
            }
        }

        return leveledUp;
    }

    return {
        // Component schema definitions
        schemas: {
            stats: {
                id: 'stats',
                defaults: {
                    level: { value: 1, xp: { current: 0, max: 500 } },
                    hp: { current: 100, max: 100 },
                    display: [
                        { line: "infoline", priority: 30, format: "Level {level.value} ({level.xp.current}/{level.xp.max} XP)" },
                        { line: "infoline", priority: 40, format: "HP: {hp.current}/{hp.max}" }
                    ]
                },
                level_progression: {
                    xp_formula: "level * (level - 1) * 500"
                }
            },

            skills: {
                id: 'skills',
                defaults: {
                    display: [
                        {
                            line: "section",
                            priority: 30,
                            format: "**Skills**\n{*→ • {*}: Level {*.level} ({*.xp.current}/{*.xp.max} XP)}",
                            condition: "{Object.keys(skills).length > 0}"
                        }
                    ]
                },
                registry: ["One_Handed_Sword", "Two_Handed_Sword", "Rapier", "Shield", "Parry",
                          "Battle_Healing", "Searching", "Tracking", "Hiding", "Night_Vision",
                          "Sprint", "Acrobatics", "Cooking", "Fishing", "Blacksmithing",
                          "Tailoring", "Alchemy", "Medicine_Mixing"]
            },

            attributes: {
                id: 'attributes',
                defaults: {
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
                registry: ["STRENGTH", "AGILITY", "VITALITY", "DEXTERITY", "INTELLIGENCE", "WISDOM", "CHARISMA", "LUCK"]
            }
        },

        // Tool definitions
        tools: {
            add_levelxp: function(params) {
                const [characterName, xpAmount] = params;

                if (!characterName) return 'malformed';

                const charName = String(characterName).toLowerCase();

                // Validate XP amount
                const xpStr = String(xpAmount).trim();
                if (!/^-?\d+$/.test(xpStr)) {
                    if (debug) console.log(`${MODULE_NAME}: Invalid XP format: ${xpAmount}`);
                    return 'malformed';
                }
                const xp = parseInt(xpStr);

                if (isNaN(xp) || xp === 0) {
                    if (debug) console.log(`${MODULE_NAME}: Invalid XP amount: ${xp}`);
                    return 'malformed';
                }

                // Get character
                const character = GameState.get(charName);
                if (!character) {
                    // Track unknown entity
                    if (GameState.trackUnknownEntity) {
                        GameState.trackUnknownEntity(charName, 'add_levelxp');
                    }
                    if (debug) console.log(`${MODULE_NAME}: Character ${charName} not found`);
                    return 'executed';
                }

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
                const newXP = character.stats.level.xp.current;

                if (debug) {
                    if (newLevel > oldLevel) {
                        console.log(`${MODULE_NAME}: ${charName} gained ${xp} XP and leveled up! (${oldLevel} → ${newLevel})`);
                    } else {
                        const action = xp > 0 ? 'gained' : 'lost';
                        console.log(`${MODULE_NAME}: ${charName} ${action} ${Math.abs(xp)} XP (${oldXP} → ${newXP})`);
                    }
                }

                // Save character
                GameState.save(charName, character);
                return 'executed';
            },

            add_skillxp: function(params) {
                const [characterName, skillName, xpAmount] = params;

                if (!characterName || !skillName) return 'malformed';

                const charName = String(characterName).toLowerCase();
                const skill = String(skillName).replace(/\s+/g, '_');

                // Validate XP amount
                const xpStr = String(xpAmount).trim();
                if (!/^-?\d+$/.test(xpStr)) {
                    if (debug) console.log(`${MODULE_NAME}: Invalid XP format: ${xpAmount}`);
                    return 'malformed';
                }
                const xp = parseInt(xpStr);

                if (isNaN(xp) || xp === 0) {
                    if (debug) console.log(`${MODULE_NAME}: Invalid XP amount: ${xp}`);
                    return 'malformed';
                }

                // Get character
                const character = GameState.get(charName);
                if (!character) {
                    // Track unknown entity
                    if (GameState.trackUnknownEntity) {
                        GameState.trackUnknownEntity(charName, 'add_skillxp');
                    }
                    if (debug) console.log(`${MODULE_NAME}: Character ${charName} not found`);
                    return 'executed';
                }

                // Check if skill is unlocked
                if (!character.skills || !character.skills[skill]) {
                    if (debug) console.log(`${MODULE_NAME}: Skill ${skill} not unlocked for ${charName}`);
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
                const newXP = skillData.xp.current;

                if (debug) {
                    if (newLevel > oldLevel) {
                        console.log(`${MODULE_NAME}: ${charName}'s ${skill} gained ${xp} XP and leveled up! (${oldLevel} → ${newLevel})`);
                    } else {
                        const action = xp > 0 ? 'gained' : 'lost';
                        console.log(`${MODULE_NAME}: ${charName}'s ${skill} ${action} ${Math.abs(xp)} XP (${oldXP} → ${newXP})`);
                    }
                }

                // Save character
                GameState.save(charName, character);
                return 'executed';
            },

            unlock_newskill: function(params) {
                const [characterName, skillName] = params;

                if (!characterName || !skillName) return 'malformed';

                const charName = String(characterName).toLowerCase();
                const skill = String(skillName).replace(/\s+/g, '_');

                // Get character
                const character = GameState.get(charName);
                if (!character) {
                    // Track unknown entity
                    if (GameState.trackUnknownEntity) {
                        GameState.trackUnknownEntity(charName, 'unlock_newskill');
                    }
                    if (debug) console.log(`${MODULE_NAME}: Character ${charName} not found`);
                    return 'executed';
                }

                // Ensure skills component exists
                if (!character.skills) character.skills = {};

                // Check if already unlocked
                if (character.skills[skill]) {
                    if (debug) console.log(`${MODULE_NAME}: ${charName} already has ${skill} unlocked`);
                    return 'executed';
                }

                // Unlock the skill
                character.skills[skill] = {
                    level: 1,
                    xp: { current: 0, max: 100 }
                };

                if (debug) {
                    console.log(`${MODULE_NAME}: ${charName} unlocked new skill: ${skill}`);
                }

                // Save character
                GameState.save(charName, character);
                return 'executed';
            },

            add_attribute: function(params) {
                const [characterName, attributeName, amount] = params;

                if (!characterName || !attributeName) return 'malformed';

                const charName = String(characterName).toLowerCase();
                const attribute = String(attributeName).toUpperCase();

                // Validate amount
                const amountStr = String(amount).trim();
                if (!/^-?\d+$/.test(amountStr)) {
                    if (debug) console.log(`${MODULE_NAME}: Invalid amount format: ${amount}`);
                    return 'malformed';
                }
                const value = parseInt(amountStr);

                if (isNaN(value) || value === 0) {
                    if (debug) console.log(`${MODULE_NAME}: Invalid amount: ${value}`);
                    return 'malformed';
                }

                // Get character
                const character = GameState.get(charName);
                if (!character) {
                    if (debug) console.log(`${MODULE_NAME}: Character ${charName} not found`);
                    return 'executed';
                }

                // Ensure attributes component exists
                if (!character.attributes) character.attributes = {};
                if (!character.attributes[attribute]) {
                    character.attributes[attribute] = { value: 0 };
                }

                const oldValue = character.attributes[attribute].value;
                const newValue = Math.max(0, oldValue + value);
                character.attributes[attribute].value = newValue;

                if (debug) {
                    const action = value > 0 ? 'increased' : 'decreased';
                    console.log(`${MODULE_NAME}: ${charName}'s ${attribute} ${action} by ${Math.abs(value)} (${oldValue} → ${newValue})`);
                }

                // Save character
                GameState.save(charName, character);
                return 'executed';
            }
        },

        // Module initialization
        init: function(api) {
            GameState = api;
        }
    };
}
SkillsModule.isSANEModule = true;
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SkillsModule;
}
