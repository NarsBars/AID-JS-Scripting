function EntityScoring(hook, text) {
	'use strict';
	if (text === undefined || text === null) return '';
const debug = false;
const MODULE_NAME = 'EntityScoring';

// Configuration
const ENTITY_REGISTRY_CARD = '[ENTITIES] Registry';
const ENTITY_ASSOCIATIONS_CARD = '[ENTITIES] Associations';
const CONFIDENCE_THRESHOLD = 0.4;
const SIMILARITY_THRESHOLD = 0.85;
const MAX_LOOKBACK = 10;
const WORD_ASSOCIATION_WINDOW = 30;
const MIN_ASSOCIATION_OCCURRENCES = 3;
const MIN_ASSOCIATION_STRENGTH = 0.3;

// =====================================
// ASSOCIATION TRACKING SYSTEM
// =====================================

const AssociationTracker = {
	// Track word associations for an entity
	trackAssociations(text, entity, matchIndex) {
		// Guard against invalid inputs
		if (!text || !entity || !entity.name) return;
		
		// Get window of text around the entity
		const start = Math.max(0, matchIndex - WORD_ASSOCIATION_WINDOW);
		const end = Math.min(text.length, matchIndex + entity.name.length + WORD_ASSOCIATION_WINDOW);
		const contextWindow = text.substring(start, end);
		
		// Extract meaningful words from context
		const words = contextWindow.match(/\b[a-z]+\b/gi) || [];
		const meaningfulWords = words.filter(word => {
			const wordLower = word.toLowerCase();
			// Skip the entity name itself
			if (entity.name.toLowerCase().includes(wordLower)) return false;
			// Skip common words
			if (COMMON_WORDS.has(wordLower) || MINOR_WORDS.has(wordLower)) return false;
			// Skip very short words
			if (word.length < 3) return false;
			// Skip blacklisted words
			if (PatternDatabase.isBlacklisted(word)) return false;
			return true;
		});
		
		// Update associations
		this.updateAssociations(entity.name, entity.type, meaningfulWords);
	},
	
	// Update association data
	updateAssociations(entityName, entityType, associatedWords) {
		if (!associatedWords || associatedWords.length === 0) return;
		
		let card = Utilities.storyCard.get(ENTITY_ASSOCIATIONS_CARD);
		let data;
		
		if (card) {
			data = Utilities.plainText.parseEncapsulated(card.description);
		} else {
			data = {
				name: 'Entity Associations',
				sections: {
					metadata: {
						last_update: 0,
						total_associations: 0
					}
				}
			};
		}
		
		// Create section for entity type if needed
		const typeSection = entityType.toLowerCase() + '_associations';
		if (!data.sections[typeSection]) {
			data.sections[typeSection] = {};
		}
		
		// Get or create entity entry
		if (!data.sections[typeSection][entityName]) {
			data.sections[typeSection][entityName] = {};
		}
		
		// Update word associations
		const entityAssoc = data.sections[typeSection][entityName];
		for (const word of associatedWords) {
			const wordLower = word.toLowerCase();
			if (!entityAssoc[wordLower]) {
				entityAssoc[wordLower] = { count: 0, contexts: 0 };
			}
			entityAssoc[wordLower].count++;
			entityAssoc[wordLower].contexts++;
		}
		
		// Update metadata
		data.sections.metadata.last_update = info.actionCount || 0;
		data.sections.metadata.total_associations = Object.values(data.sections)
			.filter(s => typeof s === 'object' && s !== data.sections.metadata)
			.reduce((sum, section) => sum + Object.keys(section).length, 0);
		
		// Format for storage
		const formattedData = this.formatAssociationsForStorage(data);
		
		if (card) {
			Utilities.storyCard.update(ENTITY_ASSOCIATIONS_CARD, { 
				description: formattedData 
			});
		} else {
			Utilities.storyCard.add({
				title: ENTITY_ASSOCIATIONS_CARD,
				entry: 'Entity word associations for improved detection',
				type: 'data',
				keys: '',
				description: formattedData
			});
		}
	},
	
	// Format associations for plain text storage
	formatAssociationsForStorage(data) {
		const lines = [`{# ${data.name}`];
		
		for (const [section, content] of Object.entries(data.sections)) {
			if (section === 'metadata') {
				lines.push('');
				lines.push('## Metadata');
				for (const [key, value] of Object.entries(content)) {
					const formattedKey = Utilities.string.toTitleCase(key.replace(/_/g, ' '));
					lines.push(`${formattedKey}: ${value}`);
				}
			} else if (typeof content === 'object') {
				lines.push('');
				lines.push(`## ${Utilities.string.toTitleCase(section.replace(/_/g, ' '))}`);
				
				// Format each entity's associations
				for (const [entityName, associations] of Object.entries(content)) {
					const strongAssoc = Object.entries(associations)
						.filter(([word, data]) => {
							const strength = data.count / data.contexts;
							return data.count >= MIN_ASSOCIATION_OCCURRENCES && 
								   strength >= MIN_ASSOCIATION_STRENGTH;
						})
						.sort(([,a], [,b]) => b.count - a.count)
						.slice(0, 10); // Top 10 associations
					
					if (strongAssoc.length > 0) {
						const assocStr = strongAssoc
							.map(([word, data]) => `${word}(${data.count})`)
							.join(', ');
						lines.push(`${entityName}: ${assocStr}`);
					}
				}
			}
		}
		
		lines.push('}');
		return lines.join('\n');
	},
	
	// Get associations for an entity
	getAssociations(entityName, entityType) {
		const card = Utilities.storyCard.get(ENTITY_ASSOCIATIONS_CARD);
		if (!card) return [];
		
		try {
			const data = Utilities.plainText.parseEncapsulated(card.description);
			const typeSection = entityType.toLowerCase() + '_associations';
			
			if (!data.sections[typeSection] || !data.sections[typeSection][entityName]) {
				return [];
			}
			
			// Parse stored associations
			const stored = data.sections[typeSection][entityName];
			if (typeof stored === 'string') {
				// Parse format: "word1(5), word2(3), word3(2)"
				const associations = [];
				const parts = stored.split(', ');
				
				for (const part of parts) {
					const match = part.match(/^(\w+)\((\d+)\)$/);
					if (match) {
						associations.push({
							word: match[1],
							count: parseInt(match[2])
						});
					}
				}
				
				return associations;
			}
			
			// If it's already an object (shouldn't happen with plain text storage)
			return Object.entries(stored)
				.map(([word, data]) => ({ word, count: data.count || data }))
				.filter(a => a.count >= MIN_ASSOCIATION_OCCURRENCES)
				.sort((a, b) => b.count - a.count);
				
		} catch (error) {
			if (debug) {
				console.log(`[${MODULE_NAME}] Error getting associations:`, error.message);
			}
			return [];
		}
	},
	
	// Calculate association score boost
	calculateAssociationBoost(text, entity) {
		const associations = this.getAssociations(entity.name, entity.type);
		if (associations.length === 0) return 0;
		
		// Check how many associated words appear in the text
		let matchedAssociations = 0;
		let totalWeight = 0;
		
		for (const assoc of associations) {
			const regex = new RegExp(`\\b${assoc.word}\\b`, 'gi');
			if (regex.test(text)) {
				matchedAssociations++;
				totalWeight += assoc.count;
			}
		}
		
		// Calculate boost based on matched associations
		if (matchedAssociations === 0) return 0;
		
		const avgWeight = totalWeight / matchedAssociations;
		const boost = Math.min(0.2, (matchedAssociations / associations.length) * 0.2);
		
		if (debug && boost > 0) {
			console.log(`[${MODULE_NAME}] Association boost for ${entity.name}: +${(boost * 100).toFixed(1)}%`);
		}
		
		return boost;
	},
	
	// Find similar entities using Levenshtein distance
	findSimilarEntities(entityName) {
		const registryCard = Utilities.storyCard.get(ENTITY_REGISTRY_CARD);
		if (!registryCard) return [];
		
		try {
			const registry = Utilities.plainText.parseEncapsulated(registryCard.description);
			const similar = [];
			
			for (const [type, entities] of Object.entries(registry.sections)) {
				if (type === 'metadata' || typeof entities !== 'object') continue;
				
				for (const existingName of Object.keys(entities)) {
					const similarity = Utilities.string.similarity(
						entityName.toLowerCase(), 
						existingName.toLowerCase()
					);
					
					if (similarity >= SIMILARITY_THRESHOLD && existingName !== entityName) {
						similar.push({
							name: existingName,
							type: type.toUpperCase(),
							similarity: similarity
						});
					}
				}
			}
			
			return similar.sort((a, b) => b.similarity - a.similarity);
		} catch (error) {
			if (debug) {
				console.log(`[${MODULE_NAME}] Error finding similar entities:`, error.message);
			}
			return [];
		}
	},
	
	// Merge associations from similar entities
	mergeAssociations(primaryEntity, similarEntities) {
		if (!similarEntities || similarEntities.length === 0) return;
		
		// Get all associations from similar entities
		const mergedAssociations = new Map();
		
		// Start with primary entity's associations
		const primaryAssoc = this.getAssociations(primaryEntity.name, primaryEntity.type);
		for (const assoc of primaryAssoc) {
			mergedAssociations.set(assoc.word, assoc.count);
		}
		
		// Merge in similar entities' associations (with reduced weight)
		for (const similar of similarEntities) {
			const simAssoc = this.getAssociations(similar.name, similar.type);
			for (const assoc of simAssoc) {
				const current = mergedAssociations.get(assoc.word) || 0;
				// Weight by similarity
				const weightedCount = Math.floor(assoc.count * similar.similarity);
				mergedAssociations.set(assoc.word, current + weightedCount);
			}
		}
		
		// Update primary entity with merged associations
		const mergedWords = [];
		for (const [word, count] of mergedAssociations.entries()) {
			// Add word multiple times based on count for updateAssociations
			for (let i = 0; i < Math.min(count, 5); i++) {
				mergedWords.push(word);
			}
		}
		
		if (mergedWords.length > 0) {
			this.updateAssociations(primaryEntity.name, primaryEntity.type, mergedWords);
		}
	},
	
	// Get contextual clues from recent history
	getHistoricalContext() {
		const contextClues = new Map();
		
		try {
			// Look back through recent actions
			for (let i = 0; i < MAX_LOOKBACK; i++) {
				const action = Utilities.history.readPastAction(i);
				if (!action || !action.text) continue;
				
				// Extract entities mentioned in history
				const entities = [];
				const registryCard = Utilities.storyCard.get(ENTITY_REGISTRY_CARD);
				if (registryCard) {
					const registry = Utilities.plainText.parseEncapsulated(registryCard.description);
					
					for (const [type, entityList] of Object.entries(registry.sections)) {
						if (type === 'metadata' || typeof entityList !== 'object') continue;
						
						for (const entityName of Object.keys(entityList)) {
							if (action.text.includes(entityName)) {
								entities.push({ name: entityName, type: type.toUpperCase() });
							}
						}
					}
				}
				
				// Track entity appearances
				for (const entity of entities) {
					const key = `${entity.type}:${entity.name}`;
					contextClues.set(key, (contextClues.get(key) || 0) + 1);
				}
			}
			
			return contextClues;
		} catch (error) {
			if (debug) {
				console.log(`[${MODULE_NAME}] Error getting historical context:`, error.message);
			}
			return contextClues;
		}
	}
};

// =====================================
// SENTENCE BOUNDARY DETECTION
// =====================================

// Detect if a position is at the start of a sentence
function isAtSentenceStart(text, position) {
	if (position === 0) return true;
	
	// Look backwards for sentence ending punctuation
	const beforeText = text.substring(Math.max(0, position - 20), position);
	
	// Pattern for sentence boundaries: period/exclamation/question mark followed by space(s)
	// Also handles quotes: ." or !" or ?"
	const sentenceBoundaryPattern = /[.!?]["']?\s*$/;
	
	// Check if we're after a sentence boundary
	if (sentenceBoundaryPattern.test(beforeText)) {
		return true;
	}
	
	// Check for paragraph boundaries (double newline)
	if (/\n\s*\n\s*$/.test(beforeText)) {
		return true;
	}
	
	// Check if we're at the start after only whitespace
	if (/^\s*$/.test(beforeText)) {
		return true;
	}
	
	return false;
}

// Common sentence starters that are rarely entities
const COMMON_SENTENCE_STARTERS = new Set([
	'the', 'a', 'an', 'this', 'that', 'these', 'those',
	'he', 'she', 'it', 'they', 'we', 'you', 'i',
	'but', 'and', 'or', 'so', 'yet', 'for', 'nor',
	'when', 'where', 'what', 'who', 'why', 'how',
	'if', 'then', 'as', 'because', 'since', 'while',
	'after', 'before', 'during', 'upon', 'with', 'without',
	'however', 'therefore', 'meanwhile', 'suddenly',
	'perhaps', 'maybe', 'certainly', 'indeed', 'finally'
]);

// Check if a word is likely just capitalized due to sentence position
function isSentenceCapitalization(word, text, matchIndex) {
	// Check if at sentence start
	if (!isAtSentenceStart(text, matchIndex)) {
		return false;
	}
	
	// Check if it's a common sentence starter
	const wordLower = word.toLowerCase();
	if (COMMON_SENTENCE_STARTERS.has(wordLower)) {
		return true;
	}
	
	// Check if the word appears elsewhere in lowercase
	const lowercasePattern = new RegExp(`\\b${wordLower}\\b`, 'gi');
	const allMatches = text.match(lowercasePattern) || [];
	const lowercaseCount = allMatches.filter(m => m !== word).length;
	
	// If it appears multiple times in lowercase, it's probably not a proper noun
	if (lowercaseCount >= 2) {
		return true;
	}
	
	return false;
}

// =====================================
// PATTERN DATABASE (SIMPLIFIED)
// =====================================
// Only stores word lists, blacklists, roles, and aliases.
// Patterns are hardcoded and built from word lists.

const PatternDatabase = (function() {
	// Database card identifiers
	const CARDS = {
		LISTS: '[DATABASE] Lists',
		ALIASES: '[DATABASE] Aliases',
		BLACKLISTS: '[DATABASE] Blacklists',
		ROLE_DEFINITIONS: '[DATABASE] Role Definitions',
		CANDIDATES: '[DATABASE] Candidates'
	};
	
	// === CANDIDATE OPERATIONS ===
	
	const Candidates = {
		// Track a candidate word
		track(category, word, context, confidence = 0.5) {
			const card = Utilities.storyCard.get(CARDS.CANDIDATES);
			if (!card) return false;
			
			const data = Utilities.plainText.parseEncapsulated(card.description);
			const sectionKey = Utilities.string.toSnakeCase(category + '_candidates');
			
			if (!data.sections[sectionKey]) {
				data.sections[sectionKey] = {};
			}
			
			// Get or create candidate entry
			const existing = this.get(category, word);
			if (existing) {
				// Update existing candidate
				const newOccurrences = existing.occurrences + 1;
				const newContexts = existing.contexts + (context ? 1 : 0);
				const newConfidence = Math.max(existing.confidence, confidence);
				
				data.sections[sectionKey][word.toLowerCase()] = 
					`confidence=${newConfidence.toFixed(2)}, occurrences=${newOccurrences}, contexts=${newContexts}`;
			} else {
				// New candidate
				data.sections[sectionKey][word.toLowerCase()] = 
					`confidence=${confidence.toFixed(2)}, occurrences=1, contexts=${context ? 1 : 0}`;
			}
			
			// Check for promotion
			const updated = this.get(category, word);
			const metadata = data.sections.metadata || {};
			const threshold = parseFloat(metadata.promotion_threshold) || 0.75;
			const minOccurrences = parseInt(metadata.min_occurrences) || 4;
			const minContexts = parseInt(metadata.min_contexts) || 3;
			
			if (updated && 
				updated.confidence >= threshold && 
				updated.occurrences >= minOccurrences &&
				updated.contexts >= minContexts) {
				// Promote to main list
				if (this.promote(category, word)) {
					// Remove from candidates
					delete data.sections[sectionKey][word.toLowerCase()];
					
					if (debug) {
						console.log(`[${MODULE_NAME}] Promoted ${word} to ${category} list`);
					}
				}
			}
			
			// Update metadata
			if (!data.sections.metadata) {
				data.sections.metadata = {};
			}
			data.sections.metadata.last_update = info.actionCount || 0;
			
			const updatedText = Utilities.plainText.formatEncapsulated(data);
			return Utilities.storyCard.update(card.title, { description: updatedText });
		},
		
		// Get candidate info
		get(category, word) {
			const card = Utilities.storyCard.get(CARDS.CANDIDATES);
			if (!card) return null;
			
			const data = Utilities.plainText.parseEncapsulated(card.description);
			const sectionKey = Utilities.string.toSnakeCase(category + '_candidates');
			
			if (!data.sections[sectionKey] || !data.sections[sectionKey][word.toLowerCase()]) {
				return null;
			}
			
			// Parse the formatted string
			const value = data.sections[sectionKey][word.toLowerCase()];
			const result = { word: word };
			
			const parts = value.split(', ');
			for (const part of parts) {
				const [k, v] = part.split('=');
				if (k === 'confidence') {
					result.confidence = parseFloat(v);
				} else if (k === 'occurrences' || k === 'contexts') {
					result[k] = parseInt(v);
				}
			}
			
			return result;
		},
		
		// Promote candidate to main list
		promote(category, word) {
			// Map category to list name
			const categoryToList = {
				'dialogue_verb': 'dialogue_verbs',
				'action_verb': 'action_verbs',
				'place_type': 'place_types',
				'object_type': 'object_types',
				'noble_title': 'noble_titles',
				'arrival_verb': 'arrival_verbs',
				'departure_verb': 'departure_verbs'
			};
			
			const listName = categoryToList[category];
			if (!listName) return false;
			
			// Add to main list
			return Lists.add(listName, [word]);
		},
		
		// Get all candidates for a category
		getAll(category) {
			const card = Utilities.storyCard.get(CARDS.CANDIDATES);
			if (!card) return [];
			
			const data = Utilities.plainText.parseEncapsulated(card.description);
			const sectionKey = Utilities.string.toSnakeCase(category + '_candidates');
			
			if (!data.sections[sectionKey]) return [];
			
			const candidates = [];
			for (const [word, value] of Object.entries(data.sections[sectionKey])) {
				const parsed = this.get(category, word);
				if (parsed) {
					candidates.push(parsed);
				}
			}
			
			return candidates.sort((a, b) => b.confidence - a.confidence);
		}
	};
	
	// === INITIALIZATION ===
	
	function initialize() {
		// Ensure all database cards exist
		for (const [key, cardTitle] of Object.entries(CARDS)) {
			if (!Utilities.storyCard.exists(cardTitle)) {
				createDatabaseCard(key, cardTitle);
			}
		}
		
		if (debug) console.log(`[${MODULE_NAME}] Pattern Database initialized`);
	}
	
	function createDatabaseCard(type, title) {
		const templates = {
			LISTS: {
				description: (
					`{# List Database\n`+
					`// Central storage for all word/phrase lists\n`+
					`// These lists are used to build entity detection patterns\n`+
					`\n`+
					`## Common Words\n`+
					`- the\n`+
					`- a\n`+
					`- an\n`+
					`- and\n`+
					`- or\n`+
					`- but\n`+
					`- in\n`+
					`- on\n`+
					`- at\n`+
					`- to\n`+
					`- for\n`+
					`\n`+
					`## Minor Words\n`+
					`- of\n`+
					`- with\n`+
					`- by\n`+
					`- from\n`+
					`- as\n`+
					`- up\n`+
					`\n`+
					`## Non-Role Words\n`+
					`- thing\n`+
					`- way\n`+
					`- time\n`+
					`- place\n`+
					`- person\n`+
					`\n`+
					`## Dialogue Verbs\n`+
					`- said\n`+
					`- spoke\n`+
					`- replied\n`+
					`- answered\n`+
					`- asked\n`+
					`- exclaimed\n`+
					`- whispered\n`+
					`- shouted\n`+
					`- muttered\n`+
					`- declared\n`+
					`- announced\n`+
					`- questioned\n`+
					`\n`+
					`## Action Verbs\n`+
					`- walked\n`+
					`- ran\n`+
					`- stood\n`+
					`- sat\n`+
					`- smiled\n`+
					`- frowned\n`+
					`- laughed\n`+
					`- cried\n`+
					`- jumped\n`+
					`- turned\n`+
					`- looked\n`+
					`- nodded\n`+
					`\n`+
					`## Arrival Verbs\n`+
					`- arrived\n`+
					`- reached\n`+
					`- entered\n`+
					`- approached\n`+
					`- came to\n`+
					`\n`+
					`## Departure Verbs\n`+
					`- left\n`+
					`- departed\n`+
					`- exited\n`+
					`- fled\n`+
					`- escaped\n`+
					`\n`+
					`## Place Types\n`+
					`- City\n`+
					`- Town\n`+
					`- Village\n`+
					`- Kingdom\n`+
					`- Empire\n`+
					`- Province\n`+
					`- Castle\n`+
					`- Tower\n`+
					`- Temple\n`+
					`- Forest\n`+
					`- Mountain\n`+
					`- River\n`+
					`- Lake\n`+
					`- Dungeon\n`+
					`- Cave\n`+
					`- Valley\n`+
					`\n`+
					`## Object Types\n`+
					`- Sword\n`+
					`- Blade\n`+
					`- Axe\n`+
					`- Bow\n`+
					`- Staff\n`+
					`- Shield\n`+
					`- Ring\n`+
					`- Amulet\n`+
					`- Armor\n`+
					`- Crystal\n`+
					`- Potion\n`+
					`- Scroll\n`+
					`- Book\n`+
					`- Key\n`+
					`\n`+
					`## Noble Titles\n`+
					`- Lord\n`+
					`- Lady\n`+
					`- Sir\n`+
					`- King\n`+
					`- Queen\n`+
					`- Prince\n`+
					`- Princess\n`+
					`- Duke\n`+
					`- Duchess\n`+
					`- Baron\n`+
					`- Baroness\n`+
					`- Count\n`+
					`- Countess\n`+
					`\n`+
					`## Metadata\n`+
					`Last Update: 0\n`+
					`Total Words: 108\n`+
					`}`
				)
			},
			
			BLACKLISTS: {
				description: (
					`{# Blacklist Database\n`+
					`// Dynamically learned non-entities and common words\n`+
					`// These lists are populated automatically as the system learns\n`+
					`\n`+
					`## Static Blacklist\n`+
					`// Always considered non-entities\n`+
					`the: category=article\n`+
					`a: category=article\n`+
					`an: category=article\n`+
					`and: category=conjunction\n`+
					`or: category=conjunction\n`+
					`but: category=conjunction\n`+
					`it: category=pronoun\n`+
					`he: category=pronoun\n`+
					`she: category=pronoun\n`+
					`they: category=pronoun\n`+
					`\n`+
					`## Learned Non-Entities\n`+
					`// Populated by the learning system\n`+
					`\n`+
					`## Learned Non-Roles\n`+
					`// Populated by the learning system\n`+
					`\n`+
					`## Metadata\n`+
					`Last Update: 0\n`+
					`Total Entries: 10\n`+
					`}`
				)
			},
			
			ROLE_DEFINITIONS: {
				description: (
					`{# Role Definitions\n`+
					`// Valid roles and their synonyms\n`+
					`\n`+
					`## Combat Roles\n`+
					`warrior: fighter, soldier, combatant, champion\n`+
					`mage: wizard, sorcerer, magician, enchanter, spellcaster\n`+
					`healer: cleric, priest, medic, doctor\n`+
					`knight: paladin, cavalier, templar\n`+
					`\n`+
					`## Social Roles\n`+
					`leader: commander, captain, chief, boss, head\n`+
					`merchant: trader, vendor, seller, shopkeeper, dealer\n`+
					`noble: lord, lady, duke, duchess, baron, baroness\n`+
					`\n`+
					`## Rogue Roles\n`+
					`thief: rogue, burglar, pickpocket, bandit\n`+
					`assassin: killer, slayer, shadow, blade\n`+
					`scout: ranger, tracker, explorer, pathfinder\n`+
					`\n`+
					`## Metadata\n`+
					`Last Update: 0\n`+
					`Total Roles: 10\n`+
					`}`
				)
			},
			
			ALIASES: {
				description: (
					`{# Alias Database\n`+
					`// Known aliases and equivalences\n`+
					`\n`+
					`## Character Aliases\n`+
					`Kirito: The Black Swordsman, Black Swordsman\n`+
					`Asuna: Lightning Flash, The Flash\n`+
					`Klein: Fuurinkazan Leader\n`+
					`\n`+
					`## Location Aliases\n`+
					`Town of Beginnings: Starting City, First Town\n`+
					`Aincrad: The Floating Castle, Steel Castle\n`+
					`\n`+
					`## Item Aliases\n`+
					`Elucidator: The Black Sword\n`+
					`Dark Repulser: The White Sword\n`+
					`\n`+
					`## Metadata\n`+
					`Last Update: 0\n`+
					`Total Aliases: 7\n`+
					`}`
				)
			},
			
			CANDIDATES: {
				description: (
					`{# Candidate Database\n`+
					`// Tracks potential new words for each list\n`+
					`// Words are promoted to lists when confidence threshold is met\n`+
					`\n`+
					`## Dialogue Verb Candidates\n`+
					`murmured: confidence=0.65, occurrences=3, contexts=2\n`+
					`bellowed: confidence=0.55, occurrences=2, contexts=1\n`+
					`\n`+
					`## Action Verb Candidates\n`+
					`sprinted: confidence=0.70, occurrences=4, contexts=3\n`+
					`glanced: confidence=0.60, occurrences=3, contexts=2\n`+
					`\n`+
					`## Place Type Candidates\n`+
					`Fortress: confidence=0.75, occurrences=5, contexts=4\n`+
					`Citadel: confidence=0.65, occurrences=3, contexts=2\n`+
					`\n`+
					`## Object Type Candidates\n`+
					`Dagger: confidence=0.80, occurrences=6, contexts=5\n`+
					`Orb: confidence=0.60, occurrences=3, contexts=2\n`+
					`\n`+
					`## Metadata\n`+
					`Last Update: 0\n`+
					`Promotion Threshold: 0.75\n`+
					`Min Occurrences: 4\n`+
					`Min Contexts: 3\n`+
					`}`
				)
			}
		};
		
		const template = templates[type] || { description: `{# ${title}\n## Data\n// Empty database\n}` };
		
		Utilities.storyCard.add({
			title: title,
			entry: `Database: ${type}`,
			type: 'system',
			keys: '',
			description: template.description
		});
	}
	
	// === LIST OPERATIONS ===
	
	const Lists = {
		// Get a list by name
		get(listName) {
			const card = Utilities.storyCard.get(CARDS.LISTS);
			if (!card) return [];
			
			const data = Utilities.plainText.parseEncapsulated(card.description);
			const section = data.sections[Utilities.string.toSnakeCase(listName)];
			
			// Lists are stored as arrays
			return Array.isArray(section) ? section : [];
		},
		
		// Get as Set for faster lookups
		getSet(listName) {
			const list = this.get(listName);
			return new Set(Array.isArray(list) ? list : []);
		},
		
		// Add items to a list
		add(listName, items) {
			const card = Utilities.storyCard.get(CARDS.LISTS);
			if (!card) return false;
			
			const data = Utilities.plainText.parseEncapsulated(card.description);
			const sectionKey = Utilities.string.toSnakeCase(listName);
			
			if (!data.sections[sectionKey]) {
				data.sections[sectionKey] = [];
			}
			
			// Ensure its an array
			if (!Array.isArray(data.sections[sectionKey])) {
				data.sections[sectionKey] = [];
			}
			
			// Add items (avoid duplicates)
			const itemsToAdd = Array.isArray(items) ? items : [items];
			const existingSet = new Set(data.sections[sectionKey]);
			
			for (const item of itemsToAdd) {
				if (!existingSet.has(item)) {
					data.sections[sectionKey].push(item);
				}
			}
			
			// Update metadata
			if (!data.sections.metadata) {
				data.sections.metadata = {};
			}
			data.sections.metadata.last_update = info.actionCount || 0;
			data.sections.metadata.total_words = Object.values(data.sections)
				.filter(s => Array.isArray(s))
				.reduce((sum, list) => sum + list.length, 0);
			
			const updated = Utilities.plainText.formatEncapsulated(data);
			return Utilities.storyCard.update(card.title, { description: updated });
		},
		
		// Remove items from a list
		remove(listName, items) {
			const card = Utilities.storyCard.get(CARDS.LISTS);
			if (!card) return false;
			
			const data = Utilities.plainText.parseEncapsulated(card.description);
			const sectionKey = Utilities.string.toSnakeCase(listName);
			
			if (!data.sections[sectionKey] || !Array.isArray(data.sections[sectionKey])) {
				return false;
			}
			
			const itemsToRemove = new Set(Array.isArray(items) ? items : [items]);
			data.sections[sectionKey] = data.sections[sectionKey].filter(
				item => !itemsToRemove.has(item)
			);
			
			// Update metadata
			if (!data.sections.metadata) {
				data.sections.metadata = {};
			}
			data.sections.metadata.last_update = info.actionCount || 0;
			data.sections.metadata.total_words = Object.values(data.sections)
				.filter(s => Array.isArray(s))
				.reduce((sum, list) => sum + list.length, 0);
			
			const updated = Utilities.plainText.formatEncapsulated(data);
			return Utilities.storyCard.update(card.title, { description: updated });
		}
	};
	
	// === BLACKLIST OPERATIONS ===
	
	const Blacklists = {
		// Add/update blacklist entry
		add(section, key, data) {
			const card = Utilities.storyCard.get(CARDS.BLACKLISTS);
			if (!card) return false;
			
			const parsed = Utilities.plainText.parseEncapsulated(card.description);
			const sectionKey = Utilities.string.toSnakeCase(section);
			
			if (!parsed.sections[sectionKey]) {
				parsed.sections[sectionKey] = {};
			}
			
			// Format: key: confidence=X, occurrences=Y, category=Z
			const parts = [];
			if (data.confidence !== undefined) parts.push(`confidence=${data.confidence}`);
			if (data.occurrences !== undefined) parts.push(`occurrences=${data.occurrences}`);
			if (data.category) parts.push(`category=${data.category}`);
			if (data.examples) parts.push(`examples=${data.examples}`);
			
			parsed.sections[sectionKey][key] = parts.join(', ');
			
			// Update metadata
			if (!parsed.sections.metadata) {
				parsed.sections.metadata = {};
			}
			parsed.sections.metadata.last_update = info.actionCount || 0;
			parsed.sections.metadata.total_entries = Object.keys(parsed.sections)
				.filter(k => k !== 'metadata')
				.reduce((sum, k) => {
					const section = parsed.sections[k];
					return sum + (typeof section === 'object' && !Array.isArray(section) ? 
						Object.keys(section).length : 0);
				}, 0);
			
			const updated = Utilities.plainText.formatEncapsulated(parsed);
			return Utilities.storyCard.update(card.title, { description: updated });
		},
		
		// Get blacklist entry
		get(section, key) {
			const card = Utilities.storyCard.get(CARDS.BLACKLISTS);
			if (!card) return null;
			
			const data = Utilities.plainText.parseEncapsulated(card.description);
			const sectionKey = Utilities.string.toSnakeCase(section);
			
			if (!data.sections[sectionKey] || !data.sections[sectionKey][key]) {
				return null;
			}
			
			// Parse the formatted string
			const value = data.sections[sectionKey][key];
			const result = { key };
			
			// Handle static blacklist format: "category=article"
			if (section === 'static_blacklist') {
				if (value.includes('=')) {
					const [k, v] = value.split('=');
					result.category = v.trim();
					result.confidence = 1.0; // Static entries are always 100% confident
					result.occurrences = Infinity; // Treat as always present
				}
				return result;
			}
			
			// Handle learned format: "confidence=0.8, occurrences=5, category=noun"
			const parts = value.split(', ');
			for (const part of parts) {
				const [k, v] = part.split('=');
				if (k === 'confidence' || k === 'occurrences') {
					result[k] = parseFloat(v);
				} else {
					result[k] = v;
				}
			}
			
			return result;
		},
		
		// Check if blacklisted
		isBlacklisted(word, minConfidence = 0.7) {
			// Check static blacklist first (always blacklisted)
			const staticEntry = this.get('static_blacklist', word.toLowerCase());
			if (staticEntry) return true;
			
			// Check learned sections
			const sections = ['learned_non_entities', 'learned_non_roles'];
			
			for (const section of sections) {
				const entry = this.get(section, word.toLowerCase());
				if (entry && entry.confidence >= minConfidence) {
					return true;
				}
			}
			
			// Check common suffixes that indicate non-entities
			const nonEntitySuffixes = ['ness', 'ment', 'tion', 'ity', 'ance', 'ence'];
			const wordLower = word.toLowerCase();
			for (const suffix of nonEntitySuffixes) {
				if (wordLower.endsWith(suffix) && wordLower.length > suffix.length + 3) {
					return true;
				}
			}
			
			return false;
		}
	};
	
	// === ROLE OPERATIONS ===
	
	const Roles = {
		// Get all synonyms for a role
		getSynonyms(role) {
			const card = Utilities.storyCard.get(CARDS.ROLE_DEFINITIONS);
			if (!card) return [];
			
			const data = Utilities.plainText.parseEncapsulated(card.description);
			
			// Search all sections for the role
			for (const section of Object.values(data.sections)) {
				if (typeof section === 'object' && !Array.isArray(section)) {
					for (const [baseRole, synonyms] of Object.entries(section)) {
						const synonymList = typeof synonyms === 'string' ? synonyms.split(', ') : [];
						const allRoles = [baseRole, ...synonymList];
						if (allRoles.includes(role.toLowerCase())) {
							return allRoles;
						}
					}
				}
			}
			
			return [role];
		},
		
		// Check if a word is a valid role
		isValidRole(word) {
			const card = Utilities.storyCard.get(CARDS.ROLE_DEFINITIONS);
			if (!card) return false;
			
			const data = Utilities.plainText.parseEncapsulated(card.description);
			const wordLower = word.toLowerCase();
			
			// Check all sections
			for (const section of Object.values(data.sections)) {
				if (typeof section === 'object' && !Array.isArray(section)) {
					for (const [baseRole, synonyms] of Object.entries(section)) {
						if (baseRole === wordLower) return true;
						const synonymList = typeof synonyms === 'string' ? synonyms.split(', ') : [];
						if (synonymList.includes(wordLower)) return true;
					}
				}
			}
			
			return false;
		},
		
		// Add a new role with synonyms
		add(category, role, synonyms = []) {
			const card = Utilities.storyCard.get(CARDS.ROLE_DEFINITIONS);
			if (!card) return false;
			
			const data = Utilities.plainText.parseEncapsulated(card.description);
			const sectionKey = Utilities.string.toSnakeCase(category);
			
			if (!data.sections[sectionKey]) {
				data.sections[sectionKey] = {};
			}
			
			data.sections[sectionKey][role.toLowerCase()] = synonyms.join(', ');
			
			// Update metadata
			if (!data.sections.metadata) {
				data.sections.metadata = {};
			}
			data.sections.metadata.last_update = info.actionCount || 0;
			data.sections.metadata.total_roles = Object.values(data.sections)
				.filter(s => typeof s === 'object' && s !== data.sections.metadata)
				.reduce((sum, section) => sum + Object.keys(section).length, 0);
			
			const updated = Utilities.plainText.formatEncapsulated(data);
			return Utilities.storyCard.update(card.title, { description: updated });
		}
	};
	
	// === ALIAS OPERATIONS ===
	
	const Aliases = {
		// Get all aliases for an entity
		get(entityName) {
			const card = Utilities.storyCard.get(CARDS.ALIASES);
			if (!card) return [entityName];
			
			const data = Utilities.plainText.parseEncapsulated(card.description);
			
			// Search all sections
			for (const section of Object.values(data.sections)) {
				if (typeof section === 'object' && !Array.isArray(section)) {
					for (const [primary, aliases] of Object.entries(section)) {
						const aliasList = typeof aliases === 'string' ? aliases.split(', ') : [];
						const allNames = [primary, ...aliasList];
						if (allNames.some(name => 
							name.toLowerCase() === entityName.toLowerCase()
						)) {
							return allNames;
						}
					}
				}
			}
			
			return [entityName];
		},
		
		// Add aliases for an entity
		add(category, primaryName, aliases) {
			const card = Utilities.storyCard.get(CARDS.ALIASES);
			if (!card) return false;
			
			const data = Utilities.plainText.parseEncapsulated(card.description);
			const sectionKey = Utilities.string.toSnakeCase(category);
			
			if (!data.sections[sectionKey]) {
				data.sections[sectionKey] = {};
			}
			
			// Merge with existing aliases
			const existing = data.sections[sectionKey][primaryName];
			const existingAliases = existing && typeof existing === 'string' ? 
				existing.split(', ') : [];
			const allAliases = [...new Set([...existingAliases, ...aliases])];
			
			data.sections[sectionKey][primaryName] = allAliases.join(', ');
			
			// Update metadata
			if (!data.sections.metadata) {
				data.sections.metadata = {};
			}
			data.sections.metadata.last_update = info.actionCount || 0;
			data.sections.metadata.total_aliases = Object.values(data.sections)
				.filter(s => typeof s === 'object' && s !== data.sections.metadata)
				.reduce((sum, section) => sum + Object.keys(section).length, 0);
			
			const updated = Utilities.plainText.formatEncapsulated(data);
			return Utilities.storyCard.update(card.title, { description: updated });
		}
	};
	
	// Return public API
	return {
		initialize,
		lists: Lists,
		blacklists: Blacklists,
		roles: Roles,
		aliases: Aliases,
		candidates: Candidates,
		
		// Quick access methods
		isBlacklisted: (word, confidence) => Blacklists.isBlacklisted(word, confidence),
		isValidRole: (word) => Roles.isValidRole(word),
		getAliases: (name) => Aliases.get(name)
	};
})();

// Initialize Pattern Database
PatternDatabase.initialize();

// Command handling for input hook
if (hook === 'input') {
	// Guard against empty strings
	if (!text || text.trim() === '') return text;
	
	// Help command
	if (text === '/help entity' || text === '/entity help') {
		state.message = (
			`Entity Scoring Module Commands:\n\n`+
			`Word Lists:\n`+
			`  /list - Show all word lists\n`+
			`  /list show <name> - Show specific list contents\n`+
			`  /list add <name> word1, word2 - Add words to list\n`+
			`  /list remove <name> word1, word2 - Remove words\n\n`+
			`Patterns:\n`+
			`  /patterns - Show pattern info and word counts\n\n`+
			`Candidates:\n`+
			`  /candidates - Show words being tracked for promotion\n`+
			`  /candidates promote <category> <word> - Force promotion\n\n`+
			`Entity Management:\n`+
			`  /entities - List all detected entities\n`+
			`  /entities clear - Clear entity registry\n\n`+
			`Associations:\n`+
			`  /associations - Show entity word associations\n`+
			`  /associations <entity> - Show associations for specific entity\n\n`+
			`Other:\n`+
			`  /blacklist - List all blacklisted words\n`+
			`  /blacklist add <word> - Add to blacklist\n`+
			`  /blacklist check <word> - Check if blacklisted\n`+
			`  /role add <category> <role> "synonyms" - Add role\n`+
			`  /role check <word> - Check if valid role`
		);
		return '\u200B';
	}
	
	// Association commands
	const associationMatch = text.match(/^\/associations?\s*(.*)$/i);
	if (associationMatch) {
		const subCommand = associationMatch[1].trim();
		
		// Show all associations
		if (!subCommand) {
			const card = Utilities.storyCard.get(ENTITY_ASSOCIATIONS_CARD);
			if (!card) {
				state.message = 'No entity associations tracked yet.';
				return '\u200B';
			}
			
			const data = Utilities.plainText.parseEncapsulated(card.description);
			let msg = 'Entity Word Associations:\n\n';
			
			for (const [section, content] of Object.entries(data.sections)) {
				if (section === 'metadata' || typeof content !== 'object') continue;
				
				msg += `${Utilities.string.toTitleCase(section.replace(/_/g, ' '))}:\n`;
				
				for (const [entity, assocStr] of Object.entries(content)) {
					if (typeof assocStr === 'string' && assocStr.length > 0) {
						msg += `  ${entity}: ${assocStr}\n`;
					}
				}
				msg += '\n';
			}
			
			state.message = msg;
			return '\u200B';
		}
		
		// Show specific entity associations
		const registryCard = Utilities.storyCard.get(ENTITY_REGISTRY_CARD);
		if (!registryCard) {
			state.message = 'No entities registered yet.';
			return '\u200B';
		}
		
		const registry = Utilities.plainText.parseEncapsulated(registryCard.description);
		let entityType = null;
		
		// Find the entity type
		for (const [type, entities] of Object.entries(registry.sections)) {
			if (type === 'metadata' || typeof entities !== 'object') continue;
			if (entities[subCommand]) {
				entityType = type.toUpperCase();
				break;
			}
		}
		
		if (!entityType) {
			state.message = `Entity "${subCommand}" not found in registry.`;
			return '\u200B';
		}
		
		const associations = AssociationTracker.getAssociations(subCommand, entityType);
		if (associations.length === 0) {
			state.message = `No associations tracked for "${subCommand}" yet.`;
		} else {
			state.message = `Associations for ${subCommand} (${entityType}):\n\n`;
			for (const assoc of associations) {
				state.message += `  ${assoc.word}: ${assoc.count} occurrences\n`;
			}
			
			// Show similar entities
			const similar = AssociationTracker.findSimilarEntities(subCommand);
			if (similar.length > 0) {
				state.message += `\nSimilar entities:\n`;
				for (const sim of similar) {
					state.message += `  ${sim.name} (${sim.type}) - ${(sim.similarity * 100).toFixed(1)}% similar\n`;
				}
			}
		}
		return '\u200B';
	}
	
	// Word list management commands
	const listMatch = text.match(/^\/list\s+(.*)$/i);
	if (listMatch) {
		const subCommand = listMatch[1].trim();
		
		// Show available lists
		if (subCommand === 'show' || !subCommand) {
			let msg = 'Available Word Lists:\n\n';
			const lists = [
				'common_words', 'minor_words', 'non_role_words',
				'dialogue_verbs', 'action_verbs', 'place_types', 'object_types',
				'noble_titles', 'arrival_verbs', 'departure_verbs'
			];
			
			for (const listName of lists) {
				const items = PatternDatabase.lists.get(listName);
				msg += `${Utilities.string.toTitleCase(listName.replace(/_/g, ' '))} (${items.length} items)\n`;
			}
			
			msg += '\nUse /list show <name> to see items';
			msg += '\nUse /list add <name> word1, word2, ...';
			msg += '\nUse /list remove <name> word1, word2, ...';
			state.message = msg;
			return '\u200B';
		}
		
		// Show specific list
		const showMatch = subCommand.match(/^show\s+(\w+)/);
		if (showMatch) {
			const listName = Utilities.string.toSnakeCase(showMatch[1]);
			const items = PatternDatabase.lists.get(listName);
			
			if (items.length === 0) {
				state.message = `List "${listName}" is empty or doesn't exist`;
			} else {
				state.message = `${Utilities.string.toTitleCase(listName.replace(/_/g, ' '))}:\n`;
				state.message += items.map(item => `- ${item}`).join('\n');
			}
			return '\u200B';
		}
		
		// Add to list
		const addMatch = subCommand.match(/^add\s+(\w+)\s+(.+)/);
		if (addMatch) {
			const listName = Utilities.string.toSnakeCase(addMatch[1]);
			const items = addMatch[2].split(',').map(s => s.trim());
			
			PatternDatabase.lists.add(listName, items);
			state.message = `Added ${items.length} item(s) to ${listName}`;
			return '\u200B';
		}
		
		// Remove from list
		const removeMatch = subCommand.match(/^remove\s+(\w+)\s+(.+)/);
		if (removeMatch) {
			const listName = Utilities.string.toSnakeCase(removeMatch[1]);
			const items = removeMatch[2].split(',').map(s => s.trim());
			
			PatternDatabase.lists.remove(listName, items);
			state.message = `Removed ${items.length} item(s) from ${listName}`;
			return '\u200B';
		}
	}
	
	// Pattern info command
	const patternMatch = text.match(/^\/patterns?\s*(.*)$/i);
	if (patternMatch) {
		const subCommand = patternMatch[1].trim();
		
		// List patterns
		if (subCommand === 'list' || !subCommand) {
			let msg = 'Entity Detection Patterns:\n\n';
			msg += 'Patterns are built dynamically from word lists.\n\n';
			
			const patternInfo = {
				'person_dialogue': { list: 'dialogue_verbs', desc: 'Detects speakers in dialogue' },
				'person_action': { list: 'action_verbs', desc: 'Detects actors performing actions' },
				'person_titled': { list: 'noble_titles', desc: 'Detects titled individuals' },
				'place_with_type': { list: 'place_types', desc: 'Detects named locations' },
				'place_arrival': { list: 'arrival_verbs', desc: 'Detects arrival destinations' },
				'object_with_type': { list: 'object_types', desc: 'Detects named objects' },
				'faction_guild': { list: 'hardcoded', desc: 'Detects organizations' }
			};
			
			for (const [name, info] of Object.entries(patternInfo)) {
				const count = info.list === 'hardcoded' ? 
					'N/A' : 
					PatternDatabase.lists.get(info.list).length;
				msg += `${name}: ${info.desc}\n`;
				msg += `  Words: ${count} from ${info.list}\n\n`;
			}
			
			msg += 'Use: /list add <list_name> word1, word2, ...';
			state.message = msg;
			return '\u200B';
		}
	}
	
	// Blacklist management
	const blacklistMatch = text.match(/^\/blacklist\s+(.*)$/i);
	if (blacklistMatch) {
		const subCommand = blacklistMatch[1].trim();
		
		// Add to blacklist
		const addMatch = subCommand.match(/^add\s+(\w+)(?:\s+(\w+))?/);
		if (addMatch) {
			const [, word, category = 'generic_noun'] = addMatch;
			
			updateBlacklist(word, category, 0.9);
			state.message = `Added "${word}" to blacklist`;
			return '\u200B';
		}
		
		// Check blacklist
		const checkMatch = subCommand.match(/^check\s+(\w+)/);
		if (checkMatch) {
			const word = checkMatch[1];
			const wordLower = word.toLowerCase();
			const isBlack = PatternDatabase.isBlacklisted(word);
			
			// Check all sections for the entry
			let entry = PatternDatabase.blacklists.get('static_blacklist', wordLower);
			let section = 'static_blacklist';
			
			if (!entry) {
				entry = PatternDatabase.blacklists.get('learned_non_entities', wordLower);
				section = 'learned_non_entities';
			}
			
			if (!entry) {
				entry = PatternDatabase.blacklists.get('learned_non_roles', wordLower);
				section = 'learned_non_roles';
			}
			
			state.message = `"${word}" is ${isBlack ? 'BLACKLISTED' : 'NOT blacklisted'}\n`;
			if (entry) {
				state.message += `Section: ${section}\n`;
				state.message += `Category: ${entry.category}\n`;
				state.message += `Confidence: ${entry.confidence}\n`;
				state.message += `Occurrences: ${entry.occurrences}`;
			}
			return '\u200B';
		}
		
		// List blacklist
		if (subCommand === 'list' || !subCommand) {
			const card = Utilities.storyCard.get('[DATABASE] Blacklists');
			if (!card) {
				state.message = 'Blacklist database not found';
				return '\u200B';
			}
			
			const data = Utilities.plainText.parseEncapsulated(card.description);
			let msg = 'Blacklisted Words:\n\n';
			
			// Show static blacklist
			const staticSection = data.sections.static_blacklist;
			if (staticSection && Object.keys(staticSection).length > 0) {
				msg += '=== Static (Built-in) ===\n';
				const entries = Object.entries(staticSection).slice(0, 20);
				for (const [word, info] of entries) {
					// Parse category from "category=type" format
					const category = info.includes('=') ? info.split('=')[1] : info;
					msg += `${word}: ${category}\n`;
				}
				if (Object.keys(staticSection).length > 20) {
					msg += `... and ${Object.keys(staticSection).length - 20} more\n`;
				}
				msg += '\n';
			}
			
			// Show learned entries
			const sections = ['learned_non_entities', 'learned_non_roles'];
			for (const sectionName of sections) {
				const section = data.sections[Utilities.string.toSnakeCase(sectionName)];
				if (section && Object.keys(section).length > 0) {
					msg += `=== ${Utilities.string.toTitleCase(sectionName.replace(/_/g, ' '))} ===\n`;
					const entries = Object.entries(section)
						.map(([word, info]) => {
							const parsed = PatternDatabase.blacklists.get(sectionName, word);
							return parsed ? { word, ...parsed } : null;
						})
						.filter(entry => entry !== null)
						.sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
						.slice(0, 10); // Show top 10 per section
					
					for (const entry of entries) {
						msg += `${entry.word}: ${entry.category} (conf=${entry.confidence.toFixed(2)}, seen=${entry.occurrences}x)\n`;
					}
					
					if (Object.keys(section).length > 10) {
						msg += `... and ${Object.keys(section).length - 10} more\n`;
					}
					msg += '\n';
				}
			}
			
			if (!data.sections.learned_non_entities && !data.sections.learned_non_roles) {
				msg += 'No learned entries yet.\n';
			}
			
			state.message = msg;
			return '\u200B';
		}
	}
	
	// Role management
	const roleMatch = text.match(/^\/roles?\s+(.*)$/i);
	if (roleMatch) {
		const subCommand = roleMatch[1].trim();
		
		// Add role
		const addMatch = subCommand.match(/^add\s+(\w+)\s+(\w+)\s+"([^"]+)"/);
		if (addMatch) {
			const [, category, role, synonyms] = addMatch;
			
			PatternDatabase.roles.add(category, role, synonyms.split(',').map(s => s.trim()));
			state.message = `Added role: ${role}`;
			return '\u200B';
		}
		
		// Check role
		const checkMatch = subCommand.match(/^check\s+(\w+)/);
		if (checkMatch) {
			const word = checkMatch[1];
			const isValid = PatternDatabase.isValidRole(word);
			const synonyms = PatternDatabase.roles.getSynonyms(word);
			
			state.message = `"${word}" is ${isValid ? 'a VALID role' : 'NOT a valid role'}\n`;
			if (synonyms.length > 1) {
				state.message += `Synonyms: ${synonyms.join(', ')}`;
			}
			return '\u200B';
		}
	}
	
	// Entity management commands
	const entityMatch = text.match(/^\/entities?\s+(.*)$/i);
	if (entityMatch) {
		const subCommand = entityMatch[1].trim();
		
		// List entities
		if (subCommand === 'list' || !subCommand) {
			const registryCard = Utilities.storyCard.get(ENTITY_REGISTRY_CARD);
			if (!registryCard) {
				state.message = 'No entities registered yet.';
				return '\u200B';
			}
			
			const registry = Utilities.plainText.parseEncapsulated(registryCard.description);
			let msg = 'Registered Entities:\n\n';
			
			for (const [type, entities] of Object.entries(registry.sections)) {
				if (type === 'metadata') continue;
				msg += `${Utilities.string.toTitleCase(type)}:\n`;
				for (const [name, data] of Object.entries(entities)) {
					msg += `  ${name}: ${data}\n`;
				}
				msg += '\n';
			}
			
			state.message = msg;
			return '\u200B';
		}
		
		// Clear entities
		if (subCommand === 'clear') {
			Utilities.storyCard.remove(ENTITY_REGISTRY_CARD);
			Utilities.storyCard.remove(ENTITY_ASSOCIATIONS_CARD);
			state.message = 'Entity registry cleared.';
			return '\u200B';
		}
	}
	
	// Handle candidate commands
	const candidateMatch = text.match(/^\/candidates?\s+(.*)$/i);
	if (candidateMatch) {
		const subCommand = candidateMatch[1].trim();
		
		// List candidates
		if (subCommand === 'list' || !subCommand) {
			let msg = 'Word Candidates (awaiting promotion):\n\n';
			
			const categories = [
				'dialogue_verb', 'action_verb', 'place_type', 
				'object_type', 'noble_title', 'arrival_verb', 'departure_verb'
			];
			
			for (const category of categories) {
				const candidates = PatternDatabase.candidates.getAll(category);
				if (candidates.length > 0) {
					msg += `${Utilities.string.toTitleCase(category.replace(/_/g, ' '))}s:\n`;
					for (const cand of candidates.slice(0, 5)) {  // Show top 5
						msg += `  ${cand.word}: conf=${cand.confidence.toFixed(2)}, seen=${cand.occurrences}x, contexts=${cand.contexts}\n`;
					}
					if (candidates.length > 5) {
						msg += `  ... and ${candidates.length - 5} more\n`;
					}
					msg += '\n';
				}
			}
			
			const candidateCard = Utilities.storyCard.get('[DATABASE] Candidates');
			if (candidateCard) {
				const candidateData = Utilities.plainText.parseEncapsulated(candidateCard.description);
				const metadata = candidateData.sections.metadata || {};
				msg += `\nPromotion Requirements:\n`;
				msg += `  Confidence >= ${metadata.promotion_threshold || 0.75}\n`;
				msg += `  Occurrences >= ${metadata.min_occurrences || 4}\n`;
				msg += `  Contexts >= ${metadata.min_contexts || 3}\n`;
			}
			
			state.message = msg || 'No candidates currently tracked.';
			return '\u200B';
		}
		
		// Force promote a candidate
		const promoteMatch = subCommand.match(/^promote\s+(\w+)\s+(\w+)/);
		if (promoteMatch) {
			const [, category, word] = promoteMatch;
			if (PatternDatabase.candidates.promote(category, word)) {
				state.message = `Promoted "${word}" to ${category} list`;
			} else {
				state.message = `Failed to promote "${word}"`;
			}
			return '\u200B';
		}
	}
}

// =====================================
// HARDCODED PATTERN TEMPLATES
// =====================================
// These templates are filled with words from the database lists

function buildEntityPatterns() {
	// Load word lists
	const dialogueVerbs = PatternDatabase.lists.get('dialogue_verbs');
	const actionVerbs = PatternDatabase.lists.get('action_verbs');
	const placeTypes = PatternDatabase.lists.get('place_types');
	const objectTypes = PatternDatabase.lists.get('object_types');
	const nobleTitles = PatternDatabase.lists.get('noble_titles');
	const arrivalVerbs = PatternDatabase.lists.get('arrival_verbs');
	const departureVerbs = PatternDatabase.lists.get('departure_verbs');
	
	// Helper to build alternation pattern from word list
	const buildAlternation = (words) => {
		if (!words || !Array.isArray(words) || words.length === 0) return 'NOMATCH';
		return words.join('|');
	};
	
	// Build patterns dynamically from lists
	const patterns = {
		// Person patterns
		person_dialogue: {
			patterns: [
				// "Hello," said John
				new RegExp(`"[^"]+",?\\s+(?:${buildAlternation(dialogueVerbs)})\\s+([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*)`, 'g'),
				// John replied, "Hello"
				new RegExp(`\\b([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*)\\s+(?:${buildAlternation(dialogueVerbs)}),?\\s*"`, 'g')
			],
			possibleTypes: { PERSON: 0.95, FACTION: 0.05 },
			baseConfidence: 0.85,
			complexity: 'dialogue_attribution'
		},
		
		person_action: {
			patterns: [
				// John walked/ran/stood...
				new RegExp(`\\b([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*)\\s+(?:${buildAlternation(actionVerbs)})\\b`, 'g')
			],
			possibleTypes: { PERSON: 0.9, FACTION: 0.1 },
			baseConfidence: 0.8,
			complexity: 'simple_action'
		},
		
		person_titled: {
			patterns: nobleTitles.length > 0 ? [
				// Lord John, King Arthur
				new RegExp(`\\b(?:${buildAlternation(nobleTitles)})\\s+([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*)`, 'g')
			] : [],
			possibleTypes: { PERSON: 0.95, FACTION: 0.05 },
			baseConfidence: 0.9,
			complexity: 'titled_introduction'
		},
		
		// Place patterns
		place_with_type: {
			patterns: [
				// Elven Forest, Tokyo City
				new RegExp(`\\b([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*)\\s+(?:${buildAlternation(placeTypes)})\\b`, 'g'),
				// City of Tokyo
				new RegExp(`\\b(?:${buildAlternation(placeTypes)})\\s+of\\s+([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*)`, 'g')
			],
			possibleTypes: { PLACE: 0.9, FACTION: 0.1 },
			baseConfidence: 0.85,
			complexity: 'with_context'
		},
		
		place_arrival: {
			patterns: arrivalVerbs.length > 0 ? [
				// arrived at/in Tokyo
				new RegExp(`(?:${buildAlternation(arrivalVerbs)})\\s+(?:at|in|to)\\s+([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*)`, 'g')
			] : [],
			possibleTypes: { PLACE: 0.85, FACTION: 0.15 },
			baseConfidence: 0.75,
			complexity: 'with_context'
		},
		
		// Object patterns
		object_with_type: {
			patterns: [
				// Elven Sword, Crystal of Power
				new RegExp(`\\b(?:the\\s+)?([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*)\\s+(?:${buildAlternation(objectTypes)})\\b`, 'g'),
				// Sword of Legends
				new RegExp(`\\b(?:${buildAlternation(objectTypes)})\\s+of\\s+([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*)`, 'g')
			],
			possibleTypes: { OBJECT: 0.9, PERSON: 0.1 },
			baseConfidence: 0.8,
			complexity: 'with_context'
		},
		
		// Faction patterns
		faction_guild: {
			patterns: [
				// Knights of the Round Table
				/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:Guild|Order|Brotherhood|Clan|House|Family|Company|Corporation|Syndicate)\b/g,
				// Guild of Merchants
				/\b(?:Guild|Order|Brotherhood|Clan|House|Family|Company|Corporation|Syndicate)\s+of\s+(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g
			],
			possibleTypes: { FACTION: 0.9, PLACE: 0.1 },
			baseConfidence: 0.85,
			complexity: 'with_context'
		}
	};
	
	// Filter out patterns with empty word lists
	const activePatterns = {};
	for (const [key, config] of Object.entries(patterns)) {
		if (config.patterns.length > 0) {
			activePatterns[key] = config;
		}
	}
	
	return activePatterns;
}

// =====================================
// ENTITY SCORING CORE
// =====================================

function determineComplexity(patternKey) {
	// Map pattern keys to complexity levels
	const complexityMap = {
		'person_dialogue': 'dialogue_attribution',
		'person_action': 'simple_action',
		'person_titled': 'titled_introduction',
		'place_with_type': 'with_context',
		'object_with_type': 'with_context',
		'faction_guild': 'with_context'
	};
	
	return complexityMap[patternKey] || 'simple_action';
}

// Load word lists from database
function loadWordLists() {
	try {
		return {
			MINOR_WORDS: PatternDatabase.lists.getSet('minor_words') || new Set(),
			COMMON_WORDS: PatternDatabase.lists.getSet('common_words') || new Set(),
			NON_ROLE_WORDS: PatternDatabase.lists.getSet('non_role_words') || new Set()
		};
	} catch (error) {
		if (debug) {
			console.log(`[${MODULE_NAME}] Error loading word lists:`, error.message);
		}
		// Return empty sets as fallback
		return {
			MINOR_WORDS: new Set(),
			COMMON_WORDS: new Set(),
			NON_ROLE_WORDS: new Set()
		};
	}
}

// Check if word is blacklisted using database
function isBlacklisted(text) {
	return PatternDatabase.isBlacklisted(text);
}

// Check if word is a valid role using database
function isValidRole(word) {
	// Quick validation
	if (word.length < 3) return false;
	if (/^\d+$/.test(word)) return false;
	
	// Check blacklist first
	if (isBlacklisted(word)) return false;
	
	// Common generic words that aren't roles
	const genericWords = ['person', 'people', 'thing', 'things', 'someone', 'something', 'anyone', 'everyone'];
	if (genericWords.includes(word.toLowerCase())) {
		// Track these as non-roles
		updateBlacklist(word, 'generic_role_word', 0.9);
		return false;
	}
	
	// Check role definitions
	return PatternDatabase.isValidRole(word);
}

// =====================================
// BLACKLIST LEARNING SYSTEM
// =====================================

// Update blacklist with new discoveries
function updateBlacklist(word, category, confidence) {
	const currentTurn = info.actionCount || 0;
	const wordLower = word.toLowerCase();
	
	// Check both sections for existing entry
	let existing = PatternDatabase.blacklists.get('learned_non_entities', wordLower);
	let existingSection = 'learned_non_entities';
	
	if (!existing) {
		existing = PatternDatabase.blacklists.get('learned_non_roles', wordLower);
		existingSection = 'learned_non_roles';
	}
	
	const data = {
		confidence: existing ? Math.max(existing.confidence, confidence) : confidence,
		occurrences: (existing?.occurrences || 0) + 1,
		category: category,
		last_seen: currentTurn
	};
	
	// Only add to blacklist if we've seen it enough times or confidence is high
	if (data.occurrences >= 3 || data.confidence >= 0.7) {
		// Determine which section based on category
		const targetSection = category.includes('role') ? 'learned_non_roles' : 'learned_non_entities';
		
		PatternDatabase.blacklists.add(targetSection, wordLower, data);
		
		if (debug && (!existing || existing.occurrences === 1)) {
			console.log(`[${MODULE_NAME}] Blacklisted "${word}" in ${targetSection} as ${category}`);
		}
	}
}

// Get aliases for an entity from database
function getEntityAliases(name) {
	return PatternDatabase.getAliases(name);
}

// =====================================
// ENTITY DETECTION & SCORING
// =====================================

// Build patterns dynamically at start of processing
const ENTITY_PATTERNS = buildEntityPatterns();
const wordLists = loadWordLists();
const MINOR_WORDS = wordLists.MINOR_WORDS || new Set();
const COMMON_WORDS = wordLists.COMMON_WORDS || new Set();
const NON_ROLE_WORDS = wordLists.NON_ROLE_WORDS || new Set();

// Process detected entities with dynamic patterns
function processDetectedEntities(text, actionType = 'continue') {
	// Guard against invalid text
	if (!text || typeof text !== 'string') return [];
	
	const detectedEntities = [];
	const failedCandidates = [];
	
	// Process patterns
	for (const [patternKey, patternConfig] of Object.entries(ENTITY_PATTERNS)) {
		for (const pattern of patternConfig.patterns) {
			try {
				let match;
				pattern.lastIndex = 0;
				
				while ((match = pattern.exec(text)) !== null) {
					// Extract matched entity name
					const fullMatch = match[0];
					const entityName = match[1] || match[0];
					const matchIndex = match.index;
					
					// Validate entity
					if (!entityName || entityName.length < 2) continue;
					
					// Check if this is just sentence capitalization
					if (isSentenceCapitalization(entityName, text, matchIndex)) {
						failedCandidates.push({
							name: entityName,
							failureReason: 'sentence_capitalization'
						});
						continue;
					}
					
					// Check blacklist
					if (isBlacklisted(entityName)) {
						failedCandidates.push({
							name: entityName,
							failureReason: 'blacklisted'
						});
						continue;
					}
					
					// Calculate confidence
					let confidence = patternConfig.baseConfidence;
					
					// Reduce confidence if at sentence start and is a common word
					if (isAtSentenceStart(text, matchIndex)) {
						if (COMMON_WORDS.has(entityName.toLowerCase()) || 
							COMMON_SENTENCE_STARTERS.has(entityName.toLowerCase())) {
							confidence *= 0.3;
						} else {
							// Even if not a common word, sentence-initial reduces confidence slightly
							confidence *= 0.9;
						}
					}
					
					// Adjust confidence based on various factors
					if (entityName.split(' ').length > 3) {
						confidence *= 0.8; // Long names less likely
					}
					
					if (COMMON_WORDS.has(entityName.toLowerCase())) {
						confidence *= 0.5;
						failedCandidates.push({
							name: entityName,
							failureReason: 'too_common'
						});
						continue;
					}
					
					// Get association boost
					const entityType = determineEntityType(entityName, patternConfig.possibleTypes);
					const assocBoost = AssociationTracker.calculateAssociationBoost(
						text,
						{ name: entityName, type: entityType }
					);
					confidence = Math.min(1.0, confidence + assocBoost);
					
					// Check historical context
					const historicalContext = AssociationTracker.getHistoricalContext();
					const entityKey = `${entityType}:${entityName}`;
					if (historicalContext.has(entityKey)) {
						const appearances = historicalContext.get(entityKey);
						// Boost confidence based on recent appearances
						confidence = Math.min(1.0, confidence + (appearances * 0.05));
					}
					
					// Skip if confidence too low after adjustments
					if (confidence < CONFIDENCE_THRESHOLD) {
						failedCandidates.push({
							name: entityName,
							failureReason: 'low_confidence',
							confidence: confidence
						});
						continue;
					}
					
					// Check if already detected
					const existing = detectedEntities.find(e => 
						e.name.toLowerCase() === entityName.toLowerCase()
					);
					
					if (existing) {
						existing.confidence = Math.max(existing.confidence, confidence);
						existing.occurrences++;
					} else {
						detectedEntities.push({
							name: entityName,
							type: entityType,
							confidence: confidence,
							occurrences: 1,
							isNew: true,
							matchedPattern: patternKey,
							context: fullMatch
						});
						
						// Track associations
						AssociationTracker.trackAssociations(text, {
							name: entityName,
							type: entityType
						}, matchIndex);
						
						// Learn from this detection
						learnFromDetection(text, {
							name: entityName,
							confidence: confidence,
							type: entityType
						}, patternKey, fullMatch);
					}
				}
			} catch (error) {
				if (debug) {
					console.log(`[${MODULE_NAME}] Pattern error in ${patternKey}:`, error.message);
				}
			}
		}
	}
	
	// Check for similar entities and merge associations
	for (const entity of detectedEntities) {
		const similar = AssociationTracker.findSimilarEntities(entity.name);
		if (similar.length > 0) {
			AssociationTracker.mergeAssociations(entity, similar);
		}
	}
	
	// Update blacklist with failed candidates
	for (const candidate of failedCandidates) {
		if (candidate.failureReason === 'too_common') {
			updateBlacklist(candidate.name, 'common_word', 0.8);
		} else if (candidate.failureReason === 'sentence_capitalization') {
			updateBlacklist(candidate.name, 'sentence_starter', 0.6);
		} else if (candidate.failureReason === 'blacklisted') {
			// Increment occurrence count for already blacklisted items
			const wordLower = candidate.name.toLowerCase();
			let existing = PatternDatabase.blacklists.get('learned_non_entities', wordLower);
			if (!existing) {
				existing = PatternDatabase.blacklists.get('learned_non_roles', wordLower);
			}
			if (existing) {
				updateBlacklist(candidate.name, existing.category || 'unknown', 
					Math.min(0.99, existing.confidence + 0.02));
			}
		}
	}
	
	// Also check for frequently appearing capitalized words that never match patterns
	try {
		const allCapitalizedWords = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
		const detectedNames = new Set(detectedEntities.map(e => e.name.toLowerCase()));
		
		for (const word of allCapitalizedWords) {
			// Skip if it was detected as an entity
			if (detectedNames.has(word.toLowerCase())) continue;
			
			// Skip if it's a known entity from registry
			const registryCard = Utilities.storyCard.get(ENTITY_REGISTRY_CARD);
			if (registryCard) {
				const registry = Utilities.plainText.parseEncapsulated(registryCard.description);
				let isKnownEntity = false;
				for (const [type, entities] of Object.entries(registry.sections)) {
					if (type === 'metadata') continue;
					if (entities && typeof entities === 'object' && entities[word]) {
						isKnownEntity = true;
						break;
					}
				}
				if (isKnownEntity) continue;
			}
			
			// Find where this word appears in the text
			const wordIndex = text.indexOf(word);
			
			// Check if it's sentence capitalization
			if (isSentenceCapitalization(word, text, wordIndex)) {
				// Track as potential sentence starter
				updateBlacklist(word, 'frequent_sentence_starter', 0.4);
				continue;
			}
			
			// Track as potential non-entity
			const wordLower = word.toLowerCase();
			let existing = PatternDatabase.blacklists.get('learned_non_entities', wordLower);
			if (!existing) {
				existing = PatternDatabase.blacklists.get('learned_non_roles', wordLower);
			}
			
			if (existing && existing.occurrences > 10 && existing.confidence < 0.6) {
				// This word appears often but never as an entity - increase confidence it's not one
				updateBlacklist(word, existing.category || 'frequent_non_entity', 
					Math.min(0.9, existing.confidence + 0.05));
			} else if (!existing) {
				// First time seeing this non-entity candidate
				updateBlacklist(word, 'potential_non_entity', 0.3);
			}
		}
	} catch (error) {
		if (debug) {
			console.log(`[${MODULE_NAME}] Error in non-entity learning:`, error.message);
		}
	}
	
	return detectedEntities;
}

// =====================================
// LEARNING SYSTEM
// =====================================
// Tracks new words from successful detections and promotes them to lists

// Learn from detected patterns
function learnFromDetection(text, entity, patternKey, fullMatch) {
	// Guard against invalid inputs
	if (!text || !entity || !patternKey || !fullMatch) return;
	
	// Skip if confidence too low
	if (entity.confidence < 0.6) return;
	
	// Extract potential new words based on pattern type
	if (patternKey === 'person_dialogue') {
		// Extract the verb used: "Hello," said John -> "said"
		const verbMatch = fullMatch.match(/"[^"]+",?\s+(\w+)\s+/);
		if (verbMatch && verbMatch[1]) {
			const verb = verbMatch[1].toLowerCase();
			const dialogueVerbs = PatternDatabase.lists.get('dialogue_verbs');
			if (dialogueVerbs && !dialogueVerbs.includes(verb)) {
				PatternDatabase.candidates.track('dialogue_verb', verb, fullMatch, entity.confidence);
			}
		}
	} else if (patternKey === 'person_action') {
		// Extract the action verb: John walked -> "walked"
		const actionMatch = fullMatch.match(/\s+(\w+)(?:\s|$)/);
		if (actionMatch && actionMatch[1]) {
			const verb = actionMatch[1].toLowerCase();
			const actionVerbs = PatternDatabase.lists.get('action_verbs');
			if (actionVerbs && !actionVerbs.includes(verb)) {
				PatternDatabase.candidates.track('action_verb', verb, fullMatch, entity.confidence);
			}
		}
	} else if (patternKey === 'place_with_type') {
		// Extract place type: Elven Forest -> "Forest"
		const typeMatch = fullMatch.match(/\s+([A-Z][a-z]+)$/);
		if (typeMatch && typeMatch[1]) {
			const placeType = typeMatch[1];
			const placeTypes = PatternDatabase.lists.get('place_types');
			if (placeTypes && !placeTypes.includes(placeType)) {
				PatternDatabase.candidates.track('place_type', placeType, fullMatch, entity.confidence);
			}
		}
	} else if (patternKey === 'object_with_type') {
		// Extract object type: Elven Sword -> "Sword"
		const typeMatch = fullMatch.match(/\s+([A-Z][a-z]+)$/);
		if (typeMatch && typeMatch[1]) {
			const objectType = typeMatch[1];
			const objectTypes = PatternDatabase.lists.get('object_types');
			if (objectTypes && !objectTypes.includes(objectType)) {
				PatternDatabase.candidates.track('object_type', objectType, fullMatch, entity.confidence);
			}
		}
	}
	
	// Also check for new patterns in unmatched capitalized words
	try {
		const capitalizedWords = text.match(/\b[A-Z][a-z]+\b/g) || [];
		for (const word of capitalizedWords) {
			// Skip if already detected as entity
			if (word === entity.name || entity.name.includes(word)) continue;
			
			// Look for context clues
			const wordIndex = text.indexOf(word);
			const contextBefore = text.substring(Math.max(0, wordIndex - 30), wordIndex);
			const contextAfter = text.substring(wordIndex + word.length, wordIndex + word.length + 30);
			
			// Check for title patterns
			const titlePattern = /\b(Lord|Lady|Sir|King|Queen|Prince|Princess|Duke|Duchess|Baron|Count)\s*$/i;
			if (titlePattern.test(contextBefore)) {
				const titleMatch = contextBefore.match(titlePattern);
				if (titleMatch) {
					const title = titleMatch[1];
					if (!PatternDatabase.lists.get('noble_titles').includes(title)) {
						PatternDatabase.candidates.track('noble_title', title, contextBefore + word, 0.7);
					}
				}
			}
		}
	} catch (error) {
		if (debug) {
			console.log(`[${MODULE_NAME}] Error in capitalized word detection:`, error.message);
		}
	}
}

// Determine entity type based on pattern weights
function determineEntityType(name, typeWeights) {
	// Guard against invalid input
	if (!typeWeights || typeof typeWeights !== 'object') {
		return 'UNKNOWN';
	}
	
	// Sort by weight and return highest
	const sorted = Object.entries(typeWeights)
		.sort(([,a], [,b]) => b - a);
	
	return sorted[0] ? sorted[0][0] : 'UNKNOWN';
}

// Update entity registry
function updateEntityRegistry(entities) {
	// Guard against invalid input
	if (!entities || !Array.isArray(entities) || entities.length === 0) return;
	
	try {
		// Get or create registry card
		let registryCard = Utilities.storyCard.get(ENTITY_REGISTRY_CARD);
		let registry;
		
		if (registryCard) {
			registry = Utilities.plainText.parseEncapsulated(registryCard.description);
		} else {
			registry = {
				name: 'Entity Registry',
				sections: {
					metadata: {
						last_update: 0,
						total_entities: 0
					}
				}
			};
		}
		
		// Update entities
		for (const entity of entities) {
			// Validate entity
			if (!entity || !entity.name || !entity.type) continue;
			
			const typeSection = entity.type.toLowerCase();
			if (!registry.sections[typeSection]) {
				registry.sections[typeSection] = {};
			}
			
			// Update entity data
			const existing = registry.sections[typeSection][entity.name];
			if (existing) {
				// Parse existing data
				const parts = existing.split(', ');
				let confidence = 0.5;
				let occurrences = 1;
				
				for (const part of parts) {
					if (part.startsWith('confidence=')) {
						confidence = parseFloat(part.split('=')[1]) || 0.5;
					} else if (part.startsWith('occurrences=')) {
						occurrences = parseInt(part.split('=')[1]) || 1;
					}
				}
				
				// Update values
				confidence = Math.max(confidence, entity.confidence);
				occurrences += entity.occurrences;
				
				registry.sections[typeSection][entity.name] = 
					`confidence=${confidence.toFixed(2)}, occurrences=${occurrences}`;
			} else {
				registry.sections[typeSection][entity.name] = 
					`confidence=${entity.confidence.toFixed(2)}, occurrences=${entity.occurrences}`;
			}
		}
		
		// Update metadata
		registry.sections.metadata.last_update = info.actionCount || 0;
		registry.sections.metadata.total_entities = Object.values(registry.sections)
			.filter(s => typeof s === 'object' && s !== registry.sections.metadata)
			.reduce((sum, section) => sum + Object.keys(section).length, 0);
		
		// Save registry
		const description = Utilities.plainText.formatEncapsulated(registry);
		
		if (registryCard) {
			Utilities.storyCard.update(ENTITY_REGISTRY_CARD, { description });
		} else {
			Utilities.storyCard.add({
				title: ENTITY_REGISTRY_CARD,
				entry: 'Entity detection registry',
				type: 'data',
				keys: '',
				description: description
			});
		}
	} catch (error) {
		if (debug) {
			console.log(`[${MODULE_NAME}] Error updating entity registry:`, error.message);
		}
	}
}

// =====================================
// MAIN PROCESSING
// =====================================

// Context hook - build context from entity data
if (hook === 'context') {
	// Guard against missing text (shouldn't happen but be safe)
	if (!text) return text || '';
	
	// Add relevant entity information to context
	const registryCard = Utilities.storyCard.get(ENTITY_REGISTRY_CARD);
	if (registryCard) {
		try {
			const registry = Utilities.plainText.parseEncapsulated(registryCard.description);
			let contextAddition = '\n[Known Entities:';
			
			// Add high-confidence entities
			for (const [type, entities] of Object.entries(registry.sections)) {
				if (type === 'metadata') continue;
				if (typeof entities !== 'object') continue;
				
				const highConfidence = Object.entries(entities)
					.filter(([name, data]) => {
						if (typeof data !== 'string') return false;
						const match = data.match(/confidence=([0-9.]+)/);
						const confidence = match ? parseFloat(match[1]) : 0;
						return confidence > 0.7;
					})
					.map(([name]) => name);
				
				if (highConfidence.length > 0) {
					contextAddition += ` ${type.toUpperCase()}: ${highConfidence.join(', ')}.`;
				}
			}
			
			contextAddition += ']\n';
			
			if (contextAddition.length > 30) {
				text = text + contextAddition;
			}
		} catch (error) {
			if (debug) {
				console.log(`[${MODULE_NAME}] Error building context:`, error.message);
			}
		}
	}
	
	return text;
}

// Output hook - detect and score entities in AI's new output only
if (hook === 'output') {
	// Guard against undefined/null/empty text
	if (!text || text.length < 10) return text;
	
	// Detect entities in the new output
	const detectedEntities = processDetectedEntities(text);
	
	// Update registry
	if (detectedEntities.length > 0) {
		updateEntityRegistry(detectedEntities);
		
		if (debug) {
			console.log(`[${MODULE_NAME}] Detected ${detectedEntities.length} entities in new output`);
			for (const entity of detectedEntities) {
				console.log(`  ${entity.name} (${entity.type}) - confidence: ${entity.confidence.toFixed(2)}`);
			}
			
			// Show learning progress
			const categories = ['dialogue_verb', 'action_verb', 'place_type', 'object_type'];
			let hasLearning = false;
			for (const category of categories) {
				const candidates = PatternDatabase.candidates.getAll(category);
				if (candidates.length > 0) {
					if (!hasLearning) {
						console.log(`[${MODULE_NAME}] Learning progress:`);
						hasLearning = true;
					}
					console.log(`  ${category} candidates: ${candidates.length}`);
				}
			}
			
			// Show blacklist growth
			const blacklistCard = Utilities.storyCard.get('[DATABASE] Blacklists');
			if (blacklistCard) {
				const data = Utilities.plainText.parseEncapsulated(blacklistCard.description);
				const learnedCount = 
					Object.keys(data.sections.learned_non_entities || {}).length +
					Object.keys(data.sections.learned_non_roles || {}).length;
				if (learnedCount > 0) {
					console.log(`  Blacklisted words: ${learnedCount} learned`);
				}
			}
		}
	}
	
	return text;
}

// Return text for other hooks or unknown cases
return text || '';
}
