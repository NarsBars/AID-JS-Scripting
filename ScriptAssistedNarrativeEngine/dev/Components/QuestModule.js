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
                    type: 'Main',
                    status: 'available',
                    stages: {},
                    prerequisites: [],
                    display: [
                        { line: "nameline", priority: 10, format: "## **Quest: $(id)**" },
                        { line: "infoline", priority: 10, format: "Type: $(type)", condition: "$(type)" },
                        { line: "infoline", priority: 20, format: "Status: $(status)", condition: "$(status)" },
                        { line: "section", priority: 30, format: "**Stages**\n$(stages: • Stage $(*): $(*))", condition: "$(Object.keys(stages).length > 0)" }
                    ]
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
                const giver = questGiver ? String(questGiver).toLowerCase() : null;
                const type = questType ? String(questType) : 'Main';

                // Get or create quest
                let questEntity = GameState.get(quest);
                if (!questEntity) {
                    if (debug) console.log(`${MODULE_NAME}: Creating new quest ${quest}`);
                    questEntity = {
                        id: quest,
                        GameplayTags: ['Quest'],
                        components: ['quest', 'objectives', 'rewards']
                    };
                    // Initialize components with defaults
                    if (GameState.initializeEntityComponents) {
                        GameState.initializeEntityComponents(questEntity);
                    }
                }

                // Update quest data
                if (!questEntity.quest) questEntity.quest = {};
                questEntity.quest.giver = giver;
                questEntity.quest.type = type;
                questEntity.quest.status = 'active';

                // Save quest
                GameState.save(quest, questEntity);

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
                const [npcName, questName, questGiver, questType] = params;

                if (!npcName || !questName) return 'malformed';

                const npc = String(npcName).toLowerCase();
                const quest = String(questName).toLowerCase().replace(/\s+/g, '_');
                const giver = questGiver ? String(questGiver).toLowerCase() : npc;
                const type = questType ? String(questType) : 'Side';

                // Create or update quest as available
                let questEntity = GameState.get(quest);
                if (!questEntity) {
                    if (debug) console.log(`${MODULE_NAME}: Creating new quest ${quest}`);
                    questEntity = {
                        id: quest,
                        GameplayTags: ['Quest'],
                        components: ['quest', 'objectives', 'rewards']
                    };
                    // Initialize components with defaults
                    if (GameState.initializeEntityComponents) {
                        GameState.initializeEntityComponents(questEntity);
                    }
                }

                // Update quest data
                if (!questEntity.quest) questEntity.quest = {};
                questEntity.quest.giver = giver;
                questEntity.quest.type = type;
                questEntity.quest.status = 'available';

                // Save quest
                GameState.save(quest, questEntity);

                if (debug) {
                    console.log(`${MODULE_NAME}: ${npc} offers quest ${quest} (${type})`);
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
