function InventoryModule() {
    'use strict';

    const MODULE_NAME = 'InventoryModule';
    const debug = true;

    // Module will receive GameState API during init
    let GameState = null;

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

    return {
        // Component schema definition
        schemas: {
            inventory: {
                id: 'inventory',
                defaults: {
                    display: [
                        {
                            line: "section",
                            priority: 40,
                            format: "**Inventory**\n{*→ • {*} x{*.quantity}}",
                            condition: "Object.keys(inventory).length > 0"
                        }
                    ]
                }
            }
        },

        // Tool definitions
        tools: {
            add_item: function(params) {
                const [characterName, itemName, quantity] = params;

                if (!characterName || !itemName) return 'malformed';

                const charName = String(characterName).toLowerCase();
                const item = String(itemName).toLowerCase().replace(/\s+/g, '_');

                // Validate quantity
                const qtyStr = String(quantity).trim();
                if (!/^-?\d+$/.test(qtyStr)) {
                    if (debug) console.log(`${MODULE_NAME}: Invalid quantity format: ${quantity}`);
                    return 'malformed';
                }
                const qty = parseInt(qtyStr);

                if (isNaN(qty) || qty === 0) {
                    if (debug) console.log(`${MODULE_NAME}: Invalid quantity: ${qty}`);
                    return 'malformed';
                }

                // Get character
                const character = GameState.get(charName);
                if (!character) {
                    if (debug) console.log(`${MODULE_NAME}: Character ${charName} not found`);
                    return 'executed'; // Still executed, just no character
                }

                // Ensure inventory exists
                if (!character.inventory) character.inventory = {};

                // Update quantity
                const currentQty = getItemQuantity(character.inventory, item);
                const newQty = Math.max(0, currentQty + qty);

                setItemQuantity(character.inventory, item, newQty);

                if (debug) {
                    const action = qty > 0 ? 'Added' : 'Removed';
                    console.log(`${MODULE_NAME}: ${action} ${Math.abs(qty)} ${item} ${qty > 0 ? 'to' : 'from'} ${charName}'s inventory (now ${newQty})`);
                }

                // Save character
                GameState.save(charName, character);
                return 'executed';
            },

            remove_item: function(params) {
                const [characterName, itemName, quantity] = params;

                if (!characterName || !itemName) return 'malformed';

                // Validate quantity
                const qtyStr = String(quantity).trim();
                if (!/^-?\d+$/.test(qtyStr)) {
                    if (debug) console.log(`${MODULE_NAME}: Invalid quantity format: ${quantity}`);
                    return 'malformed';
                }
                const qty = parseInt(qtyStr);

                if (isNaN(qty) || qty === 0) {
                    if (debug) console.log(`${MODULE_NAME}: Invalid quantity: ${qty}`);
                    return 'malformed';
                }

                // Call add_item with negative quantity
                return this.add_item([characterName, itemName, -qty]);
            },

            transfer_item: function(params) {
                const [giverName, receiverName, itemName, quantity] = params;

                if (!giverName || !receiverName || !itemName) return 'malformed';

                const giver = String(giverName).toLowerCase();
                const receiver = String(receiverName).toLowerCase();
                const item = String(itemName).toLowerCase().replace(/\s+/g, '_');

                // Validate quantity
                const qtyStr = String(quantity).trim();
                if (!/^\d+$/.test(qtyStr)) {
                    if (debug) console.log(`${MODULE_NAME}: Invalid quantity format: ${quantity}`);
                    return 'malformed';
                }
                const requestedQty = parseInt(qtyStr);

                if (isNaN(requestedQty) || requestedQty <= 0) {
                    if (debug) console.log(`${MODULE_NAME}: Invalid quantity: ${requestedQty}`);
                    return 'malformed';
                }

                // Get both characters
                const giverChar = GameState.get(giver);
                const receiverChar = GameState.get(receiver);

                // Track unknown entities
                if (!giverChar && GameState.trackUnknownEntity) {
                    GameState.trackUnknownEntity(giver, 'transfer_item');
                }
                if (!receiverChar && GameState.trackUnknownEntity) {
                    GameState.trackUnknownEntity(receiver, 'transfer_item');
                }

                let transferQty = requestedQty;
                let anySuccess = false;

                // Remove from giver if exists
                if (giverChar) {
                    if (!giverChar.inventory) giverChar.inventory = {};
                    const availableQty = getItemQuantity(giverChar.inventory, item);
                    transferQty = Math.min(availableQty, requestedQty);

                    if (transferQty > 0) {
                        setItemQuantity(giverChar.inventory, item, availableQty - transferQty);
                        GameState.save(giver, giverChar);
                        anySuccess = true;
                        if (debug) console.log(`${MODULE_NAME}: Removed ${transferQty} ${item} from ${giver}`);
                    }
                }

                // Add to receiver if exists
                if (receiverChar && transferQty > 0) {
                    if (!receiverChar.inventory) receiverChar.inventory = {};
                    const currentQty = getItemQuantity(receiverChar.inventory, item);
                    setItemQuantity(receiverChar.inventory, item, currentQty + transferQty);
                    GameState.save(receiver, receiverChar);
                    anySuccess = true;
                    if (debug) console.log(`${MODULE_NAME}: Added ${transferQty} ${item} to ${receiver}`);
                }

                return anySuccess ? 'executed' : 'permitted';
            },

            use_consumable: function(params) {
                // Alias for remove_item
                return this.remove_item(params);
            }
        },

        // Module initialization
        init: function(api) {
            GameState = api;
        }
    };
}
InventoryModule.isSANEModule = true;
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InventoryModule;
}
