function QuestModule() {
    'use strict';

    const MODULE_NAME = 'QuestModule';
    const debug = true;

    // Module will receive GameState API during init
    let GameState = null;

    return {
        // Component schema definitions
        schemas: {
            quest: {
                id: 'quest',
                defaults: {
                    giver: null,
                    type: null,
                    stages: {},
                    prerequisites: []
                }
            }
        },

        // Tool definitions
        tools: {
            accept_quest: function(params) {
                const [playerName, questName, questGiver, questType] = params;

                if (!playerName || !questName) return 'malformed';

                const player = String(playerName).toLowerCase();
                const quest = String(questName).toLowerCase().replace(/\s+/g, '_');
                const giver = questGiver ? String(questGiver) : 'Unknown';
                const type = questType ? String(questType) : 'Main';

                // Check if quest already exists - if it does, we can't accept a new quest with same name
                let questEntity = GameState.get(quest);
                if (questEntity) {
                    if (debug) console.log(`${MODULE_NAME}: Quest ${quest} already exists - cannot create duplicate`);
                    return 'malformed';
                }

                // Create new quest
                if (!questEntity) {
                    if (debug) console.log(`${MODULE_NAME}: Creating new quest ${quest} using blueprint`);

                    // Use instantiateBlueprint to create quest with GenerationWizard support
                    if (GameState.instantiateBlueprint) {
                        const questData = {
                            info: {
                                displayname: quest,
                                trigger_name: quest
                            },
                            quest: {
                                giver: giver,
                                type: type
                            },
                            objectives: {
                                total: 3  // Default to 3 stages, can be adjusted
                            }
                        };

                        const newQuestId = GameState.instantiateBlueprint('Quest', questData);
                        if (newQuestId) {
                            questEntity = GameState.get(newQuestId);
                        }
                    }

                    // Fallback if blueprint system not available
                    if (!questEntity) {
                        questEntity = {
                            id: quest,
                            GameplayTags: ['Quest'],
                            components: ['info', 'quest', 'objectives', 'rewards', 'display']
                        };
                        // Initialize components with defaults
                        if (GameState.initializeEntityComponents) {
                            GameState.initializeEntityComponents(questEntity);
                        }
                        // Update quest data
                        if (!questEntity.quest) questEntity.quest = {};
                        questEntity.quest.giver = giver;
                        questEntity.quest.type = type;

                        // Save quest
                        GameState.save(quest, questEntity);
                    }
                }

                // Update player's active quests if player exists
                const playerEntity = GameState.get(player);
                if (playerEntity) {
                    if (!playerEntity.quests) playerEntity.quests = {};
                    if (!playerEntity.quests.active) playerEntity.quests.active = [];
                    if (!playerEntity.quests.active.includes(quest)) {
                        playerEntity.quests.active.push(quest);
                    }
                    GameState.save(player, playerEntity);
                }

                if (debug) {
                    console.log(`${MODULE_NAME}: ${player} accepted quest ${quest} from ${giver || 'unknown'} (${type})`);
                }

                return 'executed';
            },

            offer_quest: function(params) {
                // This tool does nothing - it's just a notification that an NPC has a quest
                // The actual quest creation happens with accept_quest
                if (debug) {
                    const [npcName, questName] = params;
                    console.log(`${MODULE_NAME}: ${npcName} offers quest ${questName} (notification only)`);
                }
                return 'executed';
            },

            update_quest: function(params) {
                const [playerName, questName, stage] = params;

                if (!questName || stage === undefined) return 'malformed';

                const quest = String(questName).toLowerCase().replace(/\s+/g, '_');

                // Get quest
                const questEntity = GameState.get(quest);
                if (!questEntity || !GameState.hasGameplayTag(questEntity, 'Quest')) {
                    if (debug) console.log(`${MODULE_NAME}: Quest ${quest} not found`);
                    return 'executed';
                }

                // Parse the new stage number
                const newStage = parseInt(stage) || 1;

                // Update quest stage
                if (!questEntity.objectives) questEntity.objectives = {};
                if (!questEntity.objectives.stages) questEntity.objectives.stages = {};
                questEntity.objectives.stages.current = newStage;

                GameState.save(quest, questEntity);

                if (debug) {
                    console.log(`${MODULE_NAME}: Updated ${quest} to stage ${newStage}`);
                }

                return 'executed';
            },

            complete_quest: function(params) {
                const [characterName, questName] = params;

                if (!characterName || !questName) return 'malformed';

                const character = String(characterName).toLowerCase();
                const quest = String(questName).toLowerCase().replace(/\s+/g, '_');

                // Find the quest
                const questEntity = GameState.get(quest);
                if (!questEntity || !GameState.hasGameplayTag(questEntity, 'Quest')) {
                    if (debug) console.log(`${MODULE_NAME}: Quest ${quest} not found`);
                    return 'executed';
                }

                // Update quest status to completed
                if (!questEntity.quest) questEntity.quest = {};
                questEntity.quest.status = 'completed';

                // Save the updated quest
                GameState.save(quest, questEntity);

                // Update player's quest lists if player exists
                const playerEntity = GameState.get(character);
                if (playerEntity) {
                    if (!playerEntity.quests) playerEntity.quests = {};

                    // Remove from active
                    if (playerEntity.quests.active) {
                        const idx = playerEntity.quests.active.indexOf(quest);
                        if (idx > -1) {
                            playerEntity.quests.active.splice(idx, 1);
                        }
                    }

                    // Add to completed
                    if (!playerEntity.quests.completed) playerEntity.quests.completed = [];
                    if (!playerEntity.quests.completed.includes(quest)) {
                        playerEntity.quests.completed.push(quest);
                    }

                    GameState.save(character, playerEntity);
                }

                if (debug) {
                    console.log(`${MODULE_NAME}: Completed quest: ${quest}`);
                }

                return 'executed';
            },

            abandon_quest: function(params) {
                const [characterName, questName] = params;

                if (!characterName || !questName) return 'malformed';

                const character = String(characterName).toLowerCase();
                const quest = String(questName).toLowerCase().replace(/\s+/g, '_');

                // Find the quest
                const questEntity = GameState.get(quest);
                if (!questEntity || !GameState.hasGameplayTag(questEntity, 'Quest')) {
                    if (debug) console.log(`${MODULE_NAME}: Quest ${quest} not found`);
                    return 'executed';
                }

                // Update quest status to abandoned
                if (!questEntity.quest) questEntity.quest = {};
                questEntity.quest.status = 'abandoned';

                // Save the updated quest
                GameState.save(quest, questEntity);

                // Update player's quest lists if player exists
                const playerEntity = GameState.get(character);
                if (playerEntity && playerEntity.quests && playerEntity.quests.active) {
                    const idx = playerEntity.quests.active.indexOf(quest);
                    if (idx > -1) {
                        playerEntity.quests.active.splice(idx, 1);
                    }
                    GameState.save(character, playerEntity);
                }

                if (debug) {
                    console.log(`${MODULE_NAME}: Abandoned quest: ${quest}`);
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
QuestModule.isSANEModule = true;
