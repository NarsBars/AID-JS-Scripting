// CombatModule.js
// Factory function for combat management module

function CombatModule() {
    'use strict';

    const MODULE_NAME = 'CombatModule';
    const debug = true;

    // Module will receive GameState API during init
    let GameState = null;

    return {
        // Tool definitions
        tools: {
            deal_damage: function(params) {
                const [sourceName, targetName, damageAmount] = params;

                if (!targetName) return 'malformed';

                const source = sourceName ? String(sourceName).toLowerCase() : 'unknown';
                const target = String(targetName).toLowerCase();

                // Validate damage amount
                const damageStr = String(damageAmount).trim();
                if (!/^\d+$/.test(damageStr)) {
                    if (debug) console.log(`${MODULE_NAME}: Invalid damage format: ${damageAmount}`);
                    return 'malformed';
                }
                const damage = parseInt(damageStr);

                if (isNaN(damage) || damage <= 0) {
                    if (debug) console.log(`${MODULE_NAME}: Invalid damage amount: ${damage}`);
                    return 'malformed';
                }

                // Get target character
                const targetChar = GameState.get(target);
                if (!targetChar) {
                    if (debug) console.log(`${MODULE_NAME}: Target ${target} not found`);
                    return 'executed';
                }

                // Get source if it exists (optional)
                const sourceChar = (source !== 'unknown') ? GameState.get(source) : null;
                const sourceDisplay = sourceChar ? (sourceChar.id || source) : source;

                // Ensure stats component exists
                if (!targetChar.stats) targetChar.stats = {};
                if (!targetChar.stats.hp) {
                    targetChar.stats.hp = { current: 100, max: 100 };
                }

                const oldHP = targetChar.stats.hp.current;
                const maxHP = targetChar.stats.hp.max;
                const newHP = Math.max(0, oldHP - damage);
                const actualDamage = oldHP - newHP;

                // Update HP
                targetChar.stats.hp.current = newHP;

                if (debug) {
                    console.log(`${MODULE_NAME}: ${sourceDisplay} dealt ${actualDamage} damage to ${targetChar.id || target} (${oldHP} → ${newHP}/${maxHP})`);
                    if (newHP === 0) {
                        console.log(`${MODULE_NAME}: ${targetChar.id || target} has been defeated!`);
                    }
                }

                // Save target
                GameState.save(target, targetChar);
                return 'executed';
            },

            heal_damage: function(params) {
                const [targetName, healAmount] = params;

                if (!targetName) return 'malformed';

                const target = String(targetName).toLowerCase();

                // Validate heal amount
                const healStr = String(healAmount).trim();
                if (!/^\d+$/.test(healStr)) {
                    if (debug) console.log(`${MODULE_NAME}: Invalid heal format: ${healAmount}`);
                    return 'malformed';
                }
                const heal = parseInt(healStr);

                if (isNaN(heal) || heal <= 0) {
                    if (debug) console.log(`${MODULE_NAME}: Invalid heal amount: ${heal}`);
                    return 'malformed';
                }

                // Get target character
                const targetChar = GameState.get(target);
                if (!targetChar) {
                    if (debug) console.log(`${MODULE_NAME}: Target ${target} not found`);
                    return 'executed';
                }

                // Ensure stats component exists
                if (!targetChar.stats) targetChar.stats = {};
                if (!targetChar.stats.hp) {
                    targetChar.stats.hp = { current: 100, max: 100 };
                }

                const oldHP = targetChar.stats.hp.current;
                const maxHP = targetChar.stats.hp.max;
                const newHP = Math.min(maxHP, oldHP + heal);
                const actualHeal = newHP - oldHP;

                // Update HP
                targetChar.stats.hp.current = newHP;

                if (debug) {
                    console.log(`${MODULE_NAME}: ${targetChar.id || target} healed ${actualHeal} HP (${oldHP} → ${newHP}/${maxHP})`);
                    if (newHP === maxHP) {
                        console.log(`${MODULE_NAME}: ${targetChar.id || target} is fully healed!`);
                    }
                }

                // Save target
                GameState.save(target, targetChar);
                return 'executed';
            },

            set_hp: function(params) {
                const [targetName, currentHP, maxHP] = params;

                if (!targetName) return 'malformed';

                const target = String(targetName).toLowerCase();

                // Validate current HP
                const currentStr = String(currentHP).trim();
                if (!/^\d+$/.test(currentStr)) {
                    if (debug) console.log(`${MODULE_NAME}: Invalid current HP format: ${currentHP}`);
                    return 'malformed';
                }
                const current = parseInt(currentStr);

                if (isNaN(current) || current < 0) {
                    if (debug) console.log(`${MODULE_NAME}: Invalid current HP: ${current}`);
                    return 'malformed';
                }

                // Validate max HP (optional)
                let max = null;
                if (maxHP !== undefined) {
                    const maxStr = String(maxHP).trim();
                    if (!/^\d+$/.test(maxStr)) {
                        if (debug) console.log(`${MODULE_NAME}: Invalid max HP format: ${maxHP}`);
                        return 'malformed';
                    }
                    max = parseInt(maxStr);

                    if (isNaN(max) || max <= 0) {
                        if (debug) console.log(`${MODULE_NAME}: Invalid max HP: ${max}`);
                        return 'malformed';
                    }
                }

                // Get target character
                const targetChar = GameState.get(target);
                if (!targetChar) {
                    if (debug) console.log(`${MODULE_NAME}: Target ${target} not found`);
                    return 'executed';
                }

                // Ensure stats component exists
                if (!targetChar.stats) targetChar.stats = {};
                if (!targetChar.stats.hp) {
                    targetChar.stats.hp = { current: 100, max: 100 };
                }

                const oldCurrent = targetChar.stats.hp.current;
                const oldMax = targetChar.stats.hp.max;

                // Update HP values
                if (max !== null) {
                    targetChar.stats.hp.max = max;
                    targetChar.stats.hp.current = Math.min(current, max);
                } else {
                    targetChar.stats.hp.current = Math.min(current, targetChar.stats.hp.max);
                }

                if (debug) {
                    if (max !== null) {
                        console.log(`${MODULE_NAME}: ${targetChar.id || target} HP set to ${targetChar.stats.hp.current}/${targetChar.stats.hp.max} (was ${oldCurrent}/${oldMax})`);
                    } else {
                        console.log(`${MODULE_NAME}: ${targetChar.id || target} current HP set to ${targetChar.stats.hp.current} (was ${oldCurrent})`);
                    }
                }

                // Save target
                GameState.save(target, targetChar);
                return 'executed';
            },

            revive: function(params) {
                const [targetName, reviveHP] = params;

                if (!targetName) return 'malformed';

                const target = String(targetName).toLowerCase();

                // Validate revive HP (optional, defaults to 50% of max)
                let hp = null;
                if (reviveHP !== undefined) {
                    const hpStr = String(reviveHP).trim();
                    if (!/^\d+$/.test(hpStr)) {
                        if (debug) console.log(`${MODULE_NAME}: Invalid revive HP format: ${reviveHP}`);
                        return 'malformed';
                    }
                    hp = parseInt(hpStr);

                    if (isNaN(hp) || hp <= 0) {
                        if (debug) console.log(`${MODULE_NAME}: Invalid revive HP: ${hp}`);
                        return 'malformed';
                    }
                }

                // Get target character
                const targetChar = GameState.get(target);
                if (!targetChar) {
                    if (debug) console.log(`${MODULE_NAME}: Target ${target} not found`);
                    return 'executed';
                }

                // Ensure stats component exists
                if (!targetChar.stats) targetChar.stats = {};
                if (!targetChar.stats.hp) {
                    targetChar.stats.hp = { current: 100, max: 100 };
                }

                const maxHP = targetChar.stats.hp.max;
                const wasAlive = targetChar.stats.hp.current > 0;

                // Set revival HP (default to 50% of max)
                const revivalHP = hp !== null ? Math.min(hp, maxHP) : Math.floor(maxHP / 2);
                targetChar.stats.hp.current = revivalHP;

                if (debug) {
                    if (wasAlive) {
                        console.log(`${MODULE_NAME}: ${targetChar.id || target} wasn't defeated but HP set to ${revivalHP}/${maxHP}`);
                    } else {
                        console.log(`${MODULE_NAME}: ${targetChar.id || target} revived with ${revivalHP}/${maxHP} HP!`);
                    }
                }

                // Save target
                GameState.save(target, targetChar);
                return 'executed';
            },

            death: function(params) {
                const [characterName] = params;

                if (!characterName) return 'malformed';

                const charName = String(characterName).toLowerCase();

                // Get character
                const character = GameState.get(charName);
                if (!character) {
                    if (debug) console.log(`${MODULE_NAME}: Character ${charName} not found`);
                    return 'executed';
                }

                // Set HP to 0
                if (!character.stats) character.stats = {};
                if (!character.stats.hp) character.stats.hp = { current: 0, max: 100 };
                character.stats.hp.current = 0;

                // Mark as dead if there's a state component
                if (character.state) {
                    character.state.alive = false;
                }

                // Save character
                GameState.save(charName, character);

                if (debug) {
                    console.log(`${MODULE_NAME}: Death recorded for: ${character.id || charName}`);
                }

                return 'executed';
            }
        },

        // Module initialization
        init: function(api) {
            GameState = api;
        }
    };
}

// Mark as SANE module for auto-discovery
CombatModule.isSANEModule = true;

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CombatModule;
}