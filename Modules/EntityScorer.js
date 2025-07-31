function EntityScoring(hook, text) {
	'use strict';
	
	const debug = false;
	const MODULE_NAME = 'EntityScoring';
	
	// Configuration
	const ENTITY_REGISTRY_CARD = '[ENTITIES] Registry';
	const ENTITY_ASSOCIATIONS_CARD = '[ENTITIES] Associations';
	const ENTITY_RELATIONSHIPS_CARD = '[ENTITIES] Relationships';
	const ENTITY_TURN_TRACKER_CARD = '[ENTITIES] Turn Tracker';
	const CONFIDENCE_THRESHOLD = 0.4;
	const SIMILARITY_THRESHOLD = 0.85;
	const MAX_LOOKBACK = 10;
	const WORD_ASSOCIATION_WINDOW = 30;
	const MIN_ASSOCIATION_OCCURRENCES = 3;
	const MIN_ASSOCIATION_STRENGTH = 0.3;
	
	// Entity connectors for multi-word detection
	const ENTITY_CONNECTORS = new Set([
		'of', 'the', 'in', 'at', 'on', 'and', 'or', 'for', 'to', 
		'from', 'with', 'by', 'des', 'der', 'de', 'la', 'le', 'du', 
		'von', 'van'
	]);
	
	// =====================================
	// MULTI-WORD ENTITY PATTERNS
	// =====================================
	const MultiWordEntityDetector = {
		// Pattern to match multi-word entities with connectors
		multiWordPattern: /\b([A-Z][a-z]+(?:\s+(?:of|the|in|at|on|and|or|for|to|from|with|by|des|der|de|la|le|du|von|van)\s+[A-Z][a-z]+)*(?:\s+[A-Z][a-z]+)*)\b/g,
		
		// Extended pattern for entities that might end with a type word
		typeBasedPattern: /\b([A-Z][a-z]+(?:\s+(?:of|the|in|at|on|and|or|for|to|from|with|by)\s+)?(?:[A-Z][a-z]+\s+)*(?:City|Town|Village|Kingdom|Empire|Province|Castle|Tower|Temple|Forest|Mountain|River|Lake|Dungeon|Cave|Valley|Guild|Order|Brotherhood|Clan|House|Family|Company|Corporation|Syndicate))\b/g,
		
		// Pattern for "The X of Y" style names
		theXofYPattern: /\b(?:The\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+of\s+(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g,
		
		detectMultiWordEntities(text) {
			const detectedEntities = new Map();
			
			// First pass: Find all potential multi-word entities
			let match;
			
			// Check for "X of Y" patterns
			this.theXofYPattern.lastIndex = 0;
			while ((match = this.theXofYPattern.exec(text)) !== null) {
				const fullEntity = match[0];
				detectedEntities.set(fullEntity, {
					name: fullEntity,
					position: match.index,
					confidence: 0.85,
					pattern: 'the_x_of_y'
				});
			}
			
			// Check for type-based patterns
			this.typeBasedPattern.lastIndex = 0;
			while ((match = this.typeBasedPattern.exec(text)) !== null) {
				const fullEntity = match[0];
				if (!detectedEntities.has(fullEntity)) {
					detectedEntities.set(fullEntity, {
						name: fullEntity,
						position: match.index,
						confidence: 0.8,
						pattern: 'type_based'
					});
				}
			}
			
			// General multi-word pattern
			this.multiWordPattern.lastIndex = 0;
			while ((match = this.multiWordPattern.exec(text)) !== null) {
				const fullEntity = match[0];
				if (!detectedEntities.has(fullEntity) && this.isValidMultiWordEntity(fullEntity)) {
					detectedEntities.set(fullEntity, {
						name: fullEntity,
						position: match.index,
						confidence: 0.75,
						pattern: 'multi_word'
					});
				}
			}
			
			return Array.from(detectedEntities.values());
		},
		
		isValidMultiWordEntity(entityName) {
			const words = entityName.split(/\s+/);
			
			// Must have at least 2 words
			if (words.length < 2) return false;
			
			// Count capitalized vs connector words
			let capitalizedCount = 0;
			let connectorCount = 0;
			
			for (const word of words) {
				if (word[0] === word[0].toUpperCase() && /^[A-Z]/.test(word)) {
					capitalizedCount++;
				} else if (ENTITY_CONNECTORS.has(word.toLowerCase())) {
					connectorCount++;
				} else {
					// Unknown lowercase word - might not be valid
					return false;
				}
			}
			
			// Must have at least 2 capitalized words
			if (capitalizedCount < 2) return false;
			
			// Connectors should be less than half the words
			if (connectorCount > words.length / 2) return false;
			
			return true;
		},
		
		normalizeEntityName(name) {
			// Normalize spacing and capitalization of connectors
			return name.replace(/\s+/g, ' ')
				.replace(/\b(of|the|in|at|on|and|or|for|to|from|with|by)\b/gi, (match) => match.toLowerCase())
				.trim();
		}
	};

	// =====================================
	// PRONOUN RESOLUTION SYSTEM
	// =====================================
	const PronounResolver = {
		pronounMap: new Map([
			['he', { gender: 'male', number: 'singular', person: 3 }],
			['him', { gender: 'male', number: 'singular', person: 3 }],
			['his', { gender: 'male', number: 'singular', person: 3 }],
			['she', { gender: 'female', number: 'singular', person: 3 }],
			['her', { gender: 'female', number: 'singular', person: 3 }],
			['hers', { gender: 'female', number: 'singular', person: 3 }],
			['it', { gender: 'neutral', number: 'singular', person: 3 }],
			['its', { gender: 'neutral', number: 'singular', person: 3 }],
			['they', { gender: 'any', number: 'plural', person: 3 }],
			['them', { gender: 'any', number: 'plural', person: 3 }],
			['their', { gender: 'any', number: 'plural', person: 3 }]
		]),
		
		recentEntities: [],
		maxRecent: 10,
		
		updateRecentEntities(entities) {
			for (const entity of entities) {
				this.recentEntities = this.recentEntities.filter(e => 
					e.name.toLowerCase() !== entity.name.toLowerCase()
				);
				this.recentEntities.unshift({
					...entity,
					lastMentioned: Utilities.turn.getCurrentTurn()
				});
			}
			this.recentEntities = this.recentEntities.slice(0, this.maxRecent);
		},
		
		resolvePronoun(pronoun, text, position) {
			const pronounInfo = this.pronounMap.get(pronoun.toLowerCase());
			if (!pronounInfo) return null;
			
			const candidates = this.recentEntities.filter(entity => {
				if (pronounInfo.gender !== 'neutral' && entity.type !== 'PERSON') {
					return false;
				}
				if (pronounInfo.gender === 'neutral' && entity.type === 'PERSON') {
					return false;
				}
				if (entity.gender && pronounInfo.gender !== 'any') {
					if (entity.gender !== pronounInfo.gender) return false;
				}
				return true;
			});
			
			if (candidates.length === 0) return null;
			
			const scoredCandidates = candidates.map(candidate => {
				let score = 0;
				
				const turnsSince = Utilities.turn.getCurrentTurn() - candidate.lastMentioned;
				score += Math.exp(-turnsSince * 0.3) * 10;
				
				const candidatePos = text.lastIndexOf(candidate.name, position);
				if (candidatePos !== -1 && candidatePos < position) {
					const distance = position - candidatePos;
					score += Math.max(0, 5 - distance / 50);
				}
				
				if (candidate.type === 'PERSON' && pronounInfo.gender !== 'neutral') {
					score += 3;
				}
				
				return { candidate, score };
			});
			
			return Utilities.collection.sortBy(scoredCandidates, c => -c.score)[0]?.candidate || null;
		},
		
		detectPronouns(text) {
			const pronouns = [];
			const pronounPattern = /\b(he|him|his|she|her|hers|it|its|they|them|their)\b/gi;
			let match;
			
			while ((match = pronounPattern.exec(text)) !== null) {
				const resolved = this.resolvePronoun(match[1], text, match.index);
				if (resolved) {
					pronouns.push({
						pronoun: match[1],
						position: match.index,
						resolved: resolved.name,
						confidence: 0.7
					});
				}
			}
			
			return pronouns;
		}
	};
	
	// =====================================
	// N-GRAM BASED UNKNOWN ENTITY DETECTOR
	// =====================================
	const NGramDetector = {
		ngramSize: 3,
		entityPatterns: new Map(),
		threshold: 0.6,
		
		generateNGrams(text, n = this.ngramSize) {
			const ngrams = [];
			const padded = ' '.repeat(n - 1) + text.toLowerCase() + ' '.repeat(n - 1);
			for (let i = 0; i < padded.length - n + 1; i++) {
				ngrams.push(padded.substring(i, i + n));
			}
			return ngrams;
		},
		
		trainEntity(entityName, entityType) {
			if (!this.entityPatterns.has(entityType)) {
				this.entityPatterns.set(entityType, new Map());
			}
			
			const typePatterns = this.entityPatterns.get(entityType);
			const ngrams = this.generateNGrams(entityName);
			
			for (const ngram of ngrams) {
				const count = typePatterns.get(ngram) || 0;
				typePatterns.set(ngram, count + 1);
			}
		},
		
		detectEntityType(word) {
			const wordNGrams = this.generateNGrams(word);
			const scores = new Map();
			
			for (const [entityType, patterns] of this.entityPatterns) {
				let score = 0;
				let matchCount = 0;
				
				for (const ngram of wordNGrams) {
					if (patterns.has(ngram)) {
						score += patterns.get(ngram);
						matchCount++;
					}
				}
				
				if (matchCount > 0) {
					const normalizedScore = (matchCount / wordNGrams.length) * 
						(score / matchCount);
					scores.set(entityType, normalizedScore);
				}
			}
			
			let bestType = null;
			let bestScore = 0;
			
			for (const [type, score] of scores) {
				if (score > bestScore && score >= this.threshold) {
					bestType = type;
					bestScore = score;
				}
			}
			
			return { type: bestType, confidence: bestScore };
		},
		
		initialize() {
			const registryCard = Utilities.storyCard.get(ENTITY_REGISTRY_CARD);
			if (!registryCard) return;
			
			try {
				const registry = Utilities.plainText.parseSections(registryCard.description);
				
				for (const [type, entities] of Object.entries(registry)) {
					if (type === 'metadata' || typeof entities !== 'object') continue;
					
					for (const entityName of Object.keys(entities)) {
						this.trainEntity(entityName, type.toUpperCase());
					}
				}
			} catch (error) {
				if (debug) {
					console.log(`[${MODULE_NAME}] Error initializing N-gram detector:`, error.message);
				}
			}
		}
	};
	
	// =====================================
	// ENTITY RELATIONSHIP EXTRACTOR
	// =====================================
	const RelationshipExtractor = {
		patterns: {
			spatial: [
				/\b(\w+)\s+(?:is|was|are|were)\s+(?:in|at|on|near|beside|behind|above|below)\s+(\w+)/gi,
				/\b(\w+)\s+(?:entered|left|departed|arrived at)\s+(\w+)/gi
			],
			possession: [
				/\b(\w+)\s+(?:has|have|had|owns?|possessed?|carries?|wields?)\s+(?:the\s+)?(\w+)/gi,
				/\b(\w+)'s\s+(\w+)/gi,
				/\b(\w+)\s+(?:belongs?|belonged)\s+to\s+(\w+)/gi
			],
			action: [
				/\b(\w+)\s+(?:attacks?|attacked|strikes?|struck|hits?|hit)\s+(\w+)/gi,
				/\b(\w+)\s+(?:helps?|helped|saves?|saved|protects?|protected)\s+(\w+)/gi,
				/\b(\w+)\s+(?:follows?|followed|leads?|led)\s+(\w+)/gi
			],
			social: [
				/\b(\w+)\s+(?:knows?|knew|meets?|met)\s+(\w+)/gi,
				/\b(\w+)\s+(?:loves?|loved|hates?|hated|fears?|feared)\s+(\w+)/gi,
				/\b(\w+)\s+(?:serves?|served|obeys?|obeyed)\s+(\w+)/gi
			]
		},
		
		extractRelationships(text, knownEntities) {
			const relationships = [];
			const entityNames = new Set(knownEntities.map(e => e.name.toLowerCase()));
			
			for (const [relType, patterns] of Object.entries(this.patterns)) {
				for (const pattern of patterns) {
					let match;
					pattern.lastIndex = 0;
					
					while ((match = pattern.exec(text)) !== null) {
						const subject = match[1];
						const object = match[2];
						
						if (entityNames.has(subject.toLowerCase()) && 
							entityNames.has(object.toLowerCase())) {
							relationships.push({
								subject: subject,
								relation: relType,
								object: object,
								confidence: 0.8,
								context: match[0]
							});
						}
					}
				}
			}
			
			return relationships;
		},
		
		updateRelationships(relationships) {
			if (relationships.length === 0) return;
			
			let card = Utilities.storyCard.get(ENTITY_RELATIONSHIPS_CARD);
			let data;
			
			if (card) {
				data = Utilities.plainText.parseSections(card.description);
			} else {
				data = {
					metadata: { last_update: 0, total_relationships: 0 }
				};
			}
			
			for (const rel of relationships) {
				const sectionKey = rel.relation + '_relations';
				if (!data[sectionKey]) {
					data[sectionKey] = {};
				}
				
				const key = `${rel.subject}->${rel.object}`;
				const existing = data[sectionKey][key];
				
				if (existing) {
					const parts = existing.split(', ');
					let count = 1;
					for (const part of parts) {
						if (part.startsWith('count=')) {
							count = parseInt(part.split('=')[1]) || 1;
						}
					}
					count++;
					data[sectionKey][key] = `count=${count}, confidence=${rel.confidence}`;
				} else {
					data[sectionKey][key] = `count=1, confidence=${rel.confidence}`;
				}
			}
			
			data.metadata.last_update = Utilities.turn.getCurrentTurn();
			data.metadata.total_relationships = Object.values(data)
				.filter(s => typeof s === 'object' && s !== data.metadata)
				.reduce((sum, section) => sum + Object.keys(section).length, 0);
			
			const formatted = this.formatData(data);
			
			if (card) {
				Utilities.storyCard.update(ENTITY_RELATIONSHIPS_CARD, { description: formatted });
			} else {
				Utilities.storyCard.add({
					title: ENTITY_RELATIONSHIPS_CARD,
					entry: '',
					type: 'data',
					keys: '',
					description: formatted
				});
			}
		},
		
		formatData(data) {
			const lines = [];
			
			for (const [section, content] of Object.entries(data)) {
				lines.push(`## ${Utilities.string.toTitleCase(section.replace(/_/g, ' '))}`);
				
				if (Array.isArray(content)) {
					for (const item of content) {
						lines.push(`- ${item}`);
					}
				} else if (typeof content === 'object') {
					for (const [key, value] of Object.entries(content)) {
						lines.push(`${key}: ${value}`);
					}
				} else {
					lines.push(content);
				}
				
				lines.push('');
			}
			
			return lines.join('\n').trim();
		}
	};
	
	// =====================================
	// CROSS-TURN ENTITY TRACKER
	// =====================================
	const CrossTurnTracker = {
		maxTurns: 20,
		
		trackTurn(entities, turnNumber) {
			let card = Utilities.storyCard.get(ENTITY_TURN_TRACKER_CARD);
			let data;
			
			if (card) {
				data = Utilities.plainText.parseSections(card.description);
			} else {
				data = {
					metadata: { current_turn: 0, max_turns: this.maxTurns },
					turns: {}
				};
			}
			
			const turnKey = `turn_${turnNumber}`;
			data.turns[turnKey] = entities.map(e => 
				`${e.name}:${e.type}:${e.confidence.toFixed(2)}`
			).join(', ');
			
			const turnKeys = Object.keys(data.turns)
				.filter(k => k.startsWith('turn_'))
				.sort((a, b) => {
					const aNum = parseInt(a.split('_')[1]);
					const bNum = parseInt(b.split('_')[1]);
					return aNum - bNum;
				});
			
			while (turnKeys.length > this.maxTurns) {
				delete data.turns[turnKeys.shift()];
			}
			
			data.metadata.current_turn = turnNumber;
			
			const formatted = RelationshipExtractor.formatData(data);
			
			if (card) {
				Utilities.storyCard.update(ENTITY_TURN_TRACKER_CARD, { description: formatted });
			} else {
				Utilities.storyCard.add({
					title: ENTITY_TURN_TRACKER_CARD,
					entry: '',
					type: 'data',
					keys: '',
					description: formatted
				});
			}
		},
		
		getEntityHistory(entityName, lookbackTurns = 10) {
			const card = Utilities.storyCard.get(ENTITY_TURN_TRACKER_CARD);
			if (!card) return [];
			
			try {
				const data = Utilities.plainText.parseSections(card.description);
				const currentTurn = data.metadata.current_turn || 0;
				const entityLower = entityName.toLowerCase();
				
				return Utilities.math.range(0, lookbackTurns)
					.map(i => currentTurn - i)
					.filter(turn => turn >= 0 && data.turns[`turn_${turn}`])
					.flatMap(turn => {
						const entities = data.turns[`turn_${turn}`].split(', ');
						return entities
							.map(e => e.split(':'))
							.filter(([name]) => name.toLowerCase() === entityLower)
							.map(([, type, conf]) => ({
								turn,
								type,
								confidence: parseFloat(conf)
							}));
					});
			} catch (error) {
				if (debug) console.log(`[${MODULE_NAME}] Error:`, error.message);
				return [];
			}
		}
	};
	
	// =====================================
	// ENSEMBLE SCORING SYSTEM
	// =====================================
	const EnsembleScorer = {
		scoreEntity(entity, text, position) {
			const scores = [];
			
			scores.push({
				method: 'pattern',
				score: entity.confidence,
				weight: 0.4
			});
			
			const ngramResult = NGramDetector.detectEntityType(entity.name);
			if (ngramResult.type === entity.type) {
				scores.push({
					method: 'ngram',
					score: ngramResult.confidence,
					weight: 0.2
				});
			}
			
			const assocBoost = AssociationTracker.calculateAssociationBoost(text, entity);
			if (assocBoost > 0) {
				scores.push({
					method: 'association',
					score: assocBoost / 0.2,
					weight: 0.2
				});
			}
			
			const history = CrossTurnTracker.getEntityHistory(entity.name, 10);
			if (history.length > 0) {
				const frequency = history.length / 10;
				scores.push({
					method: 'history',
					score: Math.min(1.0, frequency * 2),
					weight: 0.1
				});
			}
			
			const contextScore = this.calculateContextCoherence(entity, text, position);
			scores.push({
				method: 'context',
				score: contextScore,
				weight: 0.1
			});
			
			let totalScore = 0;
			let totalWeight = 0;
			
			for (const scoreData of scores) {
				totalScore += scoreData.score * scoreData.weight;
				totalWeight += scoreData.weight;
			}
			
			return totalWeight > 0 ? totalScore / totalWeight : entity.confidence;
		},
		
		calculateContextCoherence(entity, text, position) {
			let score = 0.5;
			
			const windowSize = 50;
			const start = Math.max(0, position - windowSize);
			const end = Math.min(text.length, position + entity.name.length + windowSize);
			const context = text.substring(start, end).toLowerCase();
			
			if (entity.type === 'PERSON') {
				if (/\b(he|she|they|him|her|them)\b/.test(context)) score += 0.2;
				if (/\b(said|spoke|asked|replied)\b/.test(context)) score += 0.2;
			} else if (entity.type === 'PLACE') {
				if (/\b(in|at|to|from|near)\b/.test(context)) score += 0.2;
				if (/\b(arrived|left|entered|exited)\b/.test(context)) score += 0.2;
			} else if (entity.type === 'OBJECT') {
				if (/\b(the|a|an)\b\s*\w*\s*/.test(context.substring(0, 20))) score += 0.2;
				if (/\b(picked up|found|used|wielded)\b/.test(context)) score += 0.2;
			}
			
			return Math.min(1.0, score);
		}
	};
	
	// =====================================
	// ASSOCIATION TRACKING SYSTEM
	// =====================================
	const AssociationTracker = {
		trackAssociations(text, entity, matchIndex) {
			if (!text || !entity || !entity.name) return;
			
			const start = Math.max(0, matchIndex - WORD_ASSOCIATION_WINDOW);
			const end = Math.min(text.length, matchIndex + entity.name.length + WORD_ASSOCIATION_WINDOW);
			const contextWindow = text.substring(start, end);
			
			const words = contextWindow.match(/\b[a-z]+\b/gi) || [];
			const { COMMON_WORDS, MINOR_WORDS } = loadWordLists();
			
			const meaningfulWords = words.filter(word => {
				const wordLower = word.toLowerCase();
				if (entity.name.toLowerCase().includes(wordLower)) return false;
				if (COMMON_WORDS.has(wordLower) || MINOR_WORDS.has(wordLower)) return false;
				if (word.length < 3) return false;
				if (PatternDatabase.isBlacklisted(word)) return false;
				return true;
			});
			
			this.updateAssociations(entity.name, entity.type, meaningfulWords);
		},
		
		updateAssociations(entityName, entityType, associatedWords) {
			if (!associatedWords || associatedWords.length === 0) return;
			
			let card = Utilities.storyCard.get(ENTITY_ASSOCIATIONS_CARD);
			let data;
			
			if (card) {
				data = Utilities.plainText.parseSections(card.description);
			} else {
				data = {
					metadata: {
						last_update: 0,
						total_associations: 0
					}
				};
			}
			
			const typeSection = Utilities.string.toSnakeCase(entityType) + '_associations';
			if (!data[typeSection]) {
				data[typeSection] = {};
			}
			
			if (!data[typeSection][entityName]) {
				data[typeSection][entityName] = {};
			}
			
			const entityAssoc = data[typeSection][entityName];
			for (const word of associatedWords) {
				const wordLower = word.toLowerCase();
				if (!entityAssoc[wordLower]) {
					entityAssoc[wordLower] = { count: 0, contexts: 0 };
				}
				entityAssoc[wordLower].count++;
				entityAssoc[wordLower].contexts++;
			}
			
			data.metadata.last_update = Utilities.turn.getCurrentTurn();
			data.metadata.total_associations = Object.values(data)
				.filter(s => typeof s === 'object' && s !== data.metadata)
				.reduce((sum, section) => sum + Object.keys(section).length, 0);
			
			const formattedData = this.formatAssociationsForStorage(data);
			
			if (card) {
				Utilities.storyCard.update(ENTITY_ASSOCIATIONS_CARD, { 
					description: formattedData 
				});
			} else {
				Utilities.storyCard.add({
					title: ENTITY_ASSOCIATIONS_CARD,
					entry: '',
					type: 'data',
					keys: '',
					description: formattedData
				});
			}
		},
		
		formatAssociationsForStorage(data) {
			const lines = [];
			
			for (const [section, content] of Object.entries(data)) {
				if (section === 'metadata') {
					lines.push('## Metadata');
					for (const [key, value] of Object.entries(content)) {
						const formattedKey = Utilities.string.toTitleCase(key.replace(/_/g, ' '));
						lines.push(`${formattedKey}: ${value}`);
					}
				} else if (typeof content === 'object') {
					lines.push(`## ${Utilities.string.toTitleCase(section.replace(/_/g, ' '))}`);
					
					for (const [entityName, associations] of Object.entries(content)) {
						const strongAssoc = Object.entries(associations)
							.filter(([word, data]) => {
								const strength = data.count / data.contexts;
								return data.count >= MIN_ASSOCIATION_OCCURRENCES && 
									   strength >= MIN_ASSOCIATION_STRENGTH;
							})
							.sort(([,a], [,b]) => b.count - a.count)
							.slice(0, 10);
						
						if (strongAssoc.length > 0) {
							const assocStr = strongAssoc
								.map(([word, data]) => `${word}(${data.count})`)
								.join(', ');
							lines.push(`${entityName}: ${assocStr}`);
						}
					}
				}
				lines.push('');
			}
			
			return lines.join('\n').trim();
		},
		
		getAssociations(entityName, entityType) {
			const card = Utilities.storyCard.get(ENTITY_ASSOCIATIONS_CARD);
			if (!card) return [];
			
			try {
				const data = Utilities.plainText.parseSections(card.description);
				const typeSection = Utilities.string.toSnakeCase(entityType) + '_associations';
				
				if (!data[typeSection] || !data[typeSection][entityName]) {
					return [];
				}
				
				const stored = data[typeSection][entityName];
				if (typeof stored === 'string') {
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
		
		calculateAssociationBoost(text, entity) {
			const associations = this.getAssociations(entity.name, entity.type);
			if (associations.length === 0) return 0;
			
			let matchedAssociations = 0;
			let totalWeight = 0;
			
			for (const assoc of associations) {
				const regex = new RegExp(`\\b${assoc.word}\\b`, 'gi');
				if (regex.test(text)) {
					matchedAssociations++;
					totalWeight += assoc.count;
				}
			}
			
			if (matchedAssociations === 0) return 0;
			
			const avgWeight = totalWeight / matchedAssociations;
			const boost = Math.min(0.2, (matchedAssociations / associations.length) * 0.2);
			
			if (debug && boost > 0) {
				console.log(`[${MODULE_NAME}] Association boost for ${entity.name}: +${(boost * 100).toFixed(1)}%`);
			}
			
			return boost;
		},
		
		findSimilarEntities(entityName) {
			const registryCard = Utilities.storyCard.get(ENTITY_REGISTRY_CARD);
			if (!registryCard) return [];
			
			try {
				const registry = Utilities.plainText.parseSections(registryCard.description);
				const similar = [];
				
				for (const [type, entities] of Object.entries(registry)) {
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
				
				return Utilities.collection.sortBy(similar, s => -s.similarity);
			} catch (error) {
				if (debug) {
					console.log(`[${MODULE_NAME}] Error finding similar entities:`, error.message);
				}
				return [];
			}
		},
		
		mergeAssociations(primaryEntity, similarEntities) {
			if (!similarEntities || similarEntities.length === 0) return;
			
			const mergedAssociations = new Map();
			
			const primaryAssoc = this.getAssociations(primaryEntity.name, primaryEntity.type);
			for (const assoc of primaryAssoc) {
				mergedAssociations.set(assoc.word, assoc.count);
			}
			
			for (const similar of similarEntities) {
				const simAssoc = this.getAssociations(similar.name, similar.type);
				for (const assoc of simAssoc) {
					const current = mergedAssociations.get(assoc.word) || 0;
					const weightedCount = Math.floor(assoc.count * similar.similarity);
					mergedAssociations.set(assoc.word, current + weightedCount);
				}
			}
			
			const mergedWords = [];
			for (const [word, count] of mergedAssociations.entries()) {
				for (let i = 0; i < Math.min(count, 5); i++) {
					mergedWords.push(word);
				}
			}
			
			if (mergedWords.length > 0) {
				this.updateAssociations(primaryEntity.name, primaryEntity.type, mergedWords);
			}
		},
		
		getHistoricalContext() {
			const contextClues = new Map();
			
			try {
				for (let i = 0; i < MAX_LOOKBACK; i++) {
					const action = Utilities.history.readPastAction(i);
					if (!action || !action.text) continue;
					
					const entities = [];
					const registryCard = Utilities.storyCard.get(ENTITY_REGISTRY_CARD);
					if (registryCard) {
						const registry = Utilities.plainText.parseSections(registryCard.description);
						
						for (const [type, entityList] of Object.entries(registry)) {
							if (type === 'metadata' || typeof entityList !== 'object') continue;
							
							for (const entityName of Object.keys(entityList)) {
								if (action.text.includes(entityName)) {
									entities.push({ name: entityName, type: type.toUpperCase() });
								}
							}
						}
					}
					
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
	function isAtSentenceStart(text, position) {
		if (position === 0) return true;
		
		const beforeText = text.substring(Math.max(0, position - 20), position);
		const sentenceBoundaryPattern = /[.!?]["']?\s*$/;
		
		if (sentenceBoundaryPattern.test(beforeText)) {
			return true;
		}
		
		if (/\n\s*\n\s*$/.test(beforeText)) {
			return true;
		}
		
		if (/^\s*$/.test(beforeText)) {
			return true;
		}
		
		return false;
	}
	
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
	
	function isSentenceCapitalization(word, text, matchIndex) {
		if (!isAtSentenceStart(text, matchIndex)) {
			return false;
		}
		
		const wordLower = word.toLowerCase();
		if (COMMON_SENTENCE_STARTERS.has(wordLower)) {
			return true;
		}
		
		const lowercasePattern = new RegExp(`\\b${wordLower}\\b`, 'gi');
		const allMatches = text.match(lowercasePattern) || [];
		const lowercaseCount = allMatches.filter(m => m !== word).length;
		
		if (lowercaseCount >= 2) {
			return true;
		}
		
		return false;
	}
	
	// =====================================
	// PATTERN DATABASE
	// =====================================
	const PatternDatabase = (function() {
		const CARDS = {
			LISTS: '[DATABASE] Lists',
			ALIASES: '[DATABASE] Aliases',
			BLACKLISTS: '[DATABASE] Blacklists',
			ROLE_DEFINITIONS: '[DATABASE] Role Definitions',
			CANDIDATES: '[DATABASE] Candidates'
		};
		
		const Candidates = {
			track(category, word, context, confidence = 0.5) {
				const card = Utilities.storyCard.get(CARDS.CANDIDATES);
				if (!card) return false;
				
				const data = Utilities.plainText.parseSections(card.description);
				const sectionKey = Utilities.string.toSnakeCase(category + '_candidates');
				
				if (!data[sectionKey]) {
					data[sectionKey] = {};
				}
				
				const existing = this.get(category, word);
				if (existing) {
					const newOccurrences = existing.occurrences + 1;
					const newContexts = existing.contexts + (context ? 1 : 0);
					const newConfidence = Math.max(existing.confidence, confidence);
					
					data[sectionKey][word.toLowerCase()] = 
						`confidence=${newConfidence.toFixed(2)}, occurrences=${newOccurrences}, contexts=${newContexts}`;
				} else {
					data[sectionKey][word.toLowerCase()] = 
						`confidence=${confidence.toFixed(2)}, occurrences=1, contexts=${context ? 1 : 0}`;
				}
				
				const updated = this.get(category, word);
				const metadata = data.metadata || {};
				const threshold = parseFloat(metadata.promotion_threshold) || 0.75;
				const minOccurrences = parseInt(metadata.min_occurrences) || 4;
				const minContexts = parseInt(metadata.min_contexts) || 3;
				
				if (updated && 
					updated.confidence >= threshold && 
					updated.occurrences >= minOccurrences &&
					updated.contexts >= minContexts) {
					if (this.promote(category, word)) {
						delete data[sectionKey][word.toLowerCase()];
						
						if (debug) {
							console.log(`[${MODULE_NAME}] Promoted ${word} to ${category} list`);
						}
					}
				}
				
				if (!data.metadata) {
					data.metadata = {};
				}
				data.metadata.last_update = Utilities.turn.getCurrentTurn();
				
				const updatedText = RelationshipExtractor.formatData(data);
				return Utilities.storyCard.update(card.title, { description: updatedText });
			},
			
			get(category, word) {
				const card = Utilities.storyCard.get(CARDS.CANDIDATES);
				if (!card) return null;
				
				const data = Utilities.plainText.parseSections(card.description);
				const sectionKey = Utilities.string.toSnakeCase(category + '_candidates');
				
				if (!data[sectionKey] || !data[sectionKey][word.toLowerCase()]) {
					return null;
				}
				
				const value = data[sectionKey][word.toLowerCase()];
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
			
			promote(category, word) {
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
				
				return Lists.add(listName, [word]);
			},
			
			getAll(category) {
				const card = Utilities.storyCard.get(CARDS.CANDIDATES);
				if (!card) return [];
				
				const data = Utilities.plainText.parseSections(card.description);
				const sectionKey = Utilities.string.toSnakeCase(category + '_candidates');
				
				if (!data[sectionKey]) return [];
				
				const candidates = [];
				for (const [word, value] of Object.entries(data[sectionKey])) {
					const parsed = this.get(category, word);
					if (parsed) {
						candidates.push(parsed);
					}
				}
				
				return Utilities.collection.sortBy(candidates, c => -c.confidence);
			}
		};
		
		function initialize() {
			for (const [key, cardTitle] of Object.entries(CARDS)) {
				if (!Utilities.storyCard.exists(cardTitle)) {
					createDatabaseCard(key, cardTitle);
				}
			}
			
			// Check if this is first-time initialization
			const listsCard = Utilities.storyCard.get(CARDS.LISTS);
			if (listsCard) {
				const data = Utilities.plainText.parseSections(listsCard.description);
				const totalWords = parseInt(data.metadata?.total_words) || 0;
				
				// Only initialize essential data if cards are empty
				if (totalWords === 0) {
					initializeEssentialData();
				}
			}
			
			if (debug) console.log(`[${MODULE_NAME}] Pattern Database initialized`);
		}
		
		function initializeEssentialData() {
			// Only add the most critical data that's needed for basic functionality
			const essentialData = {
				common_words: ['the', 'a', 'an', 'and', 'or', 'but'],
				dialogue_verbs: ['said', 'asked', 'replied'],
				action_verbs: ['walked', 'ran', 'looked'],
				place_types: ['City', 'Town', 'Village'],
				object_types: ['Sword', 'Shield', 'Potion']
			};
			
			// Add essential data to the LISTS card after creation
			for (const [listName, items] of Object.entries(essentialData)) {
				Lists.add(listName, items);
			}
			
			// Add minimal blacklist entries
			const minimalBlacklist = {
				'the': 'article',
				'a': 'article', 
				'an': 'article',
				'it': 'pronoun',
				'he': 'pronoun',
				'she': 'pronoun'
			};
			
			for (const [word, category] of Object.entries(minimalBlacklist)) {
				Blacklists.add('static_blacklist', word, { category });
			}
			
			if (debug) {
				console.log(`[${MODULE_NAME}] Essential data initialized`);
			}
		}

		function createDatabaseCard(type, title) {
			const templates = {
				LISTS: {
					description: [
						'// Central storage for all word/phrase lists',
						'// These lists are used to build entity detection patterns',
						'',
						'## Common Words',
						'',
						'## Minor Words',
						'',
						'## Non-Role Words',
						'',
						'## Dialogue Verbs',
						'',
						'## Action Verbs',
						'',
						'## Arrival Verbs',
						'',
						'## Departure Verbs',
						'',
						'## Place Types',
						'',
						'## Object Types',
						'',
						'## Noble Titles',
						'',
						'## Metadata',
						'Last Update: 0',
						'Total Words: 0'
					].join('\n')
				},
				
				BLACKLISTS: {
					description: [
						'// Dynamically learned non-entities and common words',
						'// These lists are populated automatically as the system learns',
						'',
						'## Static Blacklist',
						'// Always considered non-entities',
						'',
						'## Learned Non-Entities',
						'// Populated by the learning system',
						'',
						'## Learned Non-Roles',
						'// Populated by the learning system',
						'',
						'## Metadata',
						'Last Update: 0',
						'Total Entries: 0'
					].join('\n')
				},
				
				ROLE_DEFINITIONS: {
					description: [
						'// Valid roles and their synonyms',
						'',
						'## Combat Roles',
						'',
						'## Social Roles',
						'',
						'## Rogue Roles',
						'',
						'## Metadata',
						'Last Update: 0',
						'Total Roles: 0'
					].join('\n')
				},
				
				ALIASES: {
					description: [
						'// Known aliases and equivalences',
						'',
						'## Character Aliases',
						'',
						'## Location Aliases',
						'',
						'## Item Aliases',
						'',
						'## Metadata',
						'Last Update: 0',
						'Total Aliases: 0'
					].join('\n')
				},
				
				CANDIDATES: {
					description: [
						'// Tracks potential new words for each list',
						'// Words are promoted to lists when confidence threshold is met',
						'',
						'## Dialogue Verb Candidates',
						'',
						'## Action Verb Candidates',
						'',
						'## Place Type Candidates',
						'',
						'## Object Type Candidates',
						'',
						'## Noble Title Candidates',
						'',
						'## Arrival Verb Candidates',
						'',
						'## Departure Verb Candidates',
						'',
						'## Metadata',
						'Last Update: 0',
						'Promotion Threshold: 0.75',
						'Min Occurrences: 4',
						'Min Contexts: 3'
					].join('\n')
				}
			};
			
			const template = templates[type] || { description: '// Empty database\n## Data' };
			
			Utilities.storyCard.add({
				title: title,
				entry: ``,
				type: 'system',
				keys: '',
				description: template.description
			});
		}
		
		const Lists = {
			get(listName) {
				const card = Utilities.storyCard.get(CARDS.LISTS);
				if (!card) return [];
				
				const data = Utilities.plainText.parseSections(card.description);
				const section = data[Utilities.string.toSnakeCase(listName)];
				
				return Array.isArray(section) ? section : [];
			},
			
			getSet(listName) {
				return new Set(this.get(listName));
			},
			
			add(listName, items) {
				const card = Utilities.storyCard.get(CARDS.LISTS);
				if (!card) return false;
				
				const data = Utilities.plainText.parseSections(card.description);
				const sectionKey = Utilities.string.toSnakeCase(listName);
				
				if (!data[sectionKey]) {
					data[sectionKey] = [];
				}
				
				if (!Array.isArray(data[sectionKey])) {
					data[sectionKey] = [];
				}
				
				const itemsToAdd = Array.isArray(items) ? items : [items];
				const existingSet = new Set(data[sectionKey]);
				
				for (const item of itemsToAdd) {
					if (!existingSet.has(item)) {
						data[sectionKey].push(item);
					}
				}
				
				if (!data.metadata) {
					data.metadata = {};
				}
				data.metadata.last_update = Utilities.turn.getCurrentTurn();
				data.metadata.total_words = Object.values(data)
					.filter(s => Array.isArray(s))
					.reduce((sum, list) => sum + list.length, 0);
				
				const updated = RelationshipExtractor.formatData(data);
				return Utilities.storyCard.update(card.title, { description: updated });
			},
			
			remove(listName, items) {
				const card = Utilities.storyCard.get(CARDS.LISTS);
				if (!card) return false;
				
				const data = Utilities.plainText.parseSections(card.description);
				const sectionKey = Utilities.string.toSnakeCase(listName);
				
				if (!data[sectionKey] || !Array.isArray(data[sectionKey])) {
					return false;
				}
				
				const itemsToRemove = new Set(Array.isArray(items) ? items : [items]);
				data[sectionKey] = data[sectionKey].filter(
					item => !itemsToRemove.has(item)
				);
				
				if (!data.metadata) {
					data.metadata = {};
				}
				data.metadata.last_update = Utilities.turn.getCurrentTurn();
				data.metadata.total_words = Object.values(data)
					.filter(s => Array.isArray(s))
					.reduce((sum, list) => sum + list.length, 0);
				
				const updated = RelationshipExtractor.formatData(data);
				return Utilities.storyCard.update(card.title, { description: updated });
			}
		};
		
		const Blacklists = {
			add(section, key, data) {
				const card = Utilities.storyCard.get(CARDS.BLACKLISTS);
				if (!card) return false;
				
				const parsed = Utilities.plainText.parseSections(card.description);
				const sectionKey = Utilities.string.toSnakeCase(section);
				
				if (!parsed[sectionKey]) {
					parsed[sectionKey] = {};
				}
				
				const parts = [];
				if (data.confidence !== undefined) parts.push(`confidence=${data.confidence}`);
				if (data.occurrences !== undefined) parts.push(`occurrences=${data.occurrences}`);
				if (data.category) parts.push(`category=${data.category}`);
				if (data.examples) parts.push(`examples=${data.examples}`);
				
				parsed[sectionKey][key] = parts.join(', ');
				
				if (!parsed.metadata) {
					parsed.metadata = {};
				}
				parsed.metadata.last_update = Utilities.turn.getCurrentTurn();
				parsed.metadata.total_entries = Object.keys(parsed)
					.filter(k => k !== 'metadata' && !k.startsWith('//'))
					.reduce((sum, k) => {
						const section = parsed[k];
						return sum + (typeof section === 'object' && !Array.isArray(section) ? 
							Object.keys(section).length : 0);
					}, 0);
				
				const updated = RelationshipExtractor.formatData(parsed);
				return Utilities.storyCard.update(card.title, { description: updated });
			},
			
			get(section, key) {
				const card = Utilities.storyCard.get(CARDS.BLACKLISTS);
				if (!card) return null;
				
				const data = Utilities.plainText.parseSections(card.description);
				const sectionKey = Utilities.string.toSnakeCase(section);
				
				if (!data[sectionKey] || !data[sectionKey][key]) {
					return null;
				}
				
				const value = data[sectionKey][key];
				const result = { key };
				
				if (section === 'static_blacklist') {
					if (value.includes('=')) {
						const [k, v] = value.split('=');
						result.category = v.trim();
						result.confidence = 1.0;
						result.occurrences = Infinity;
					}
					return result;
				}
				
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
			
			isBlacklisted(word, minConfidence = 0.7) {
				const staticEntry = this.get('static_blacklist', word.toLowerCase());
				if (staticEntry) return true;
				
				const sections = ['learned_non_entities', 'learned_non_roles'];
				
				for (const section of sections) {
					const entry = this.get(section, word.toLowerCase());
					if (entry && entry.confidence >= minConfidence) {
						return true;
					}
				}
				
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
		
		const Roles = {
			getSynonyms(role) {
				const card = Utilities.storyCard.get(CARDS.ROLE_DEFINITIONS);
				if (!card) return [];
				
				const data = Utilities.plainText.parseSections(card.description);
				
				for (const section of Object.values(data)) {
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
			
			isValidRole(word) {
				const card = Utilities.storyCard.get(CARDS.ROLE_DEFINITIONS);
				if (!card) return false;
				
				const data = Utilities.plainText.parseSections(card.description);
				const wordLower = word.toLowerCase();
				
				for (const section of Object.values(data)) {
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
			
			add(category, role, synonyms = []) {
				const card = Utilities.storyCard.get(CARDS.ROLE_DEFINITIONS);
				if (!card) return false;
				
				const data = Utilities.plainText.parseSections(card.description);
				const sectionKey = Utilities.string.toSnakeCase(category);
				
				if (!data[sectionKey]) {
					data[sectionKey] = {};
				}
				
				data[sectionKey][role.toLowerCase()] = synonyms.join(', ');
				
				if (!data.metadata) {
					data.metadata = {};
				}
				data.metadata.last_update = Utilities.turn.getCurrentTurn();
				data.metadata.total_roles = Object.values(data)
					.filter(s => typeof s === 'object' && s !== data.metadata)
					.reduce((sum, section) => sum + Object.keys(section).length, 0);
				
				const updated = RelationshipExtractor.formatData(data);
				return Utilities.storyCard.update(card.title, { description: updated });
			}
		};
		
		const Aliases = {
			get(entityName) {
				const card = Utilities.storyCard.get(CARDS.ALIASES);
				if (!card) return [entityName];
				
				const data = Utilities.plainText.parseSections(card.description);
				
				for (const section of Object.values(data)) {
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
			
			add(category, primaryName, aliases) {
				const card = Utilities.storyCard.get(CARDS.ALIASES);
				if (!card) return false;
				
				const data = Utilities.plainText.parseSections(card.description);
				const sectionKey = Utilities.string.toSnakeCase(category);
				
				if (!data[sectionKey]) {
					data[sectionKey] = {};
				}
				
				const existing = data[sectionKey][primaryName];
				const existingAliases = existing && typeof existing === 'string' ? 
					existing.split(', ') : [];
				const allAliases = [...new Set([...existingAliases, ...aliases])];
				
				data[sectionKey][primaryName] = allAliases.join(', ');
				
				if (!data.metadata) {
					data.metadata = {};
				}
				data.metadata.last_update = Utilities.turn.getCurrentTurn();
				data.metadata.total_aliases = Object.values(data)
					.filter(s => typeof s === 'object' && s !== data.metadata)
					.reduce((sum, section) => sum + Object.keys(section).length, 0);
				
				const updated = RelationshipExtractor.formatData(data);
				return Utilities.storyCard.update(card.title, { description: updated });
			}
		};
		
		return {
			initialize,
			lists: Lists,
			blacklists: Blacklists,
			roles: Roles,
			aliases: Aliases,
			candidates: Candidates,
			
			isBlacklisted: (word, confidence) => Blacklists.isBlacklisted(word, confidence),
			isValidRole: (word) => Roles.isValidRole(word),
			getAliases: (name) => Aliases.get(name)
		};
	})();
	
	PatternDatabase.initialize();
	
	// =====================================
	// COMMAND HANDLING
	// =====================================
	if (hook === 'input') {
		const cmd = Utilities.command.parseCommand(text);
		if (!cmd) return text;
		
		const commands = {
			'help': () => {
				if (cmd.args[0] === 'entity') {
					state.message = getHelpText();
					return '';
				}
			},
			
			'entity': () => handleEntityCommand(cmd),
			'entities': () => handleEntityCommand(cmd),
			'pronouns': () => handlePronounCommand(),
			'relationships': () => handleRelationshipCommand(cmd),
			'association': () => handleAssociationCommand(cmd),
			'associations': () => handleAssociationCommand(cmd),
			'list': () => handleListCommand(cmd),
			'patterns': () => handlePatternCommand(cmd),
			'blacklist': () => handleBlacklistCommand(cmd),
			'role': () => handleRoleCommand(cmd),
			'roles': () => handleRoleCommand(cmd),
			'candidate': () => handleCandidateCommand(cmd),
			'candidates': () => handleCandidateCommand(cmd)
		};
		
		const handler = commands[cmd.command];
		if (handler) {
			return handler() || '';
		}
		
		return text;
	}
	
	function getHelpText() {
		return `Enhanced Entity Scoring Module Commands:

    Word Lists:
  /list - Show all word lists
  /list show <name> - Show specific list contents
  /list add <name> word1, word2 - Add words to list
  /list remove <name> word1, word2 - Remove words

    Patterns:
  /patterns - Show pattern info and word counts

    Candidates:
  /candidates - Show words being tracked for promotion
  /candidates promote <category> <word> - Force promotion

    Entity Management:
  /entities - List all detected entities
  /entities clear - Clear entity registry
  /entities history <name> - Show entity detection history

    Associations:
  /associations - Show entity word associations
  /associations <entity> - Show associations for specific entity

    Relationships:
  /relationships - Show all entity relationships
  /relationships <entity> - Show relationships for specific entity

    Pronouns:
  /pronouns - Show recent pronoun resolutions

    Other:
  /blacklist - List all blacklisted words
  /blacklist add <word> - Add to blacklist
  /blacklist check <word> - Check if blacklisted
  /role add <category> <role> "synonyms" - Add role
  /role check <word> - Check if valid role`;
	}
	
	function handleEntityCommand(cmd) {
		const subCommand = cmd.args[0] || 'list';
		
		if (subCommand === 'list' || !cmd.args.length) {
			const registryCard = Utilities.storyCard.get(ENTITY_REGISTRY_CARD);
			if (!registryCard) {
				state.message = 'No entities registered yet.';
				return '';
			}
			
			const registry = Utilities.plainText.parseSections(registryCard.description);
			let msg = 'Registered Entities:\n\n';
			
			for (const [type, entities] of Object.entries(registry)) {
				if (type === 'metadata') continue;
				msg += `${Utilities.string.toTitleCase(type)}:\n`;
				for (const [name, data] of Object.entries(entities)) {
					msg += `  ${name}: ${data}\n`;
				}
				msg += '\n';
			}
			
			state.message = msg;
			return '';
		}
		
		if (subCommand === 'clear') {
			Utilities.storyCard.remove(ENTITY_REGISTRY_CARD);
			Utilities.storyCard.remove(ENTITY_ASSOCIATIONS_CARD);
			Utilities.storyCard.remove(ENTITY_RELATIONSHIPS_CARD);
			Utilities.storyCard.remove(ENTITY_TURN_TRACKER_CARD);
			state.message = 'Entity registry and all tracking data cleared.';
			return '';
		}
		
		if (subCommand === 'history' && cmd.args[1]) {
			const entityName = cmd.args.slice(1).join(' ');
			const history = CrossTurnTracker.getEntityHistory(entityName, 20);
			
			if (history.length === 0) {
				state.message = `No detection history found for "${entityName}"`;
			} else {
				state.message = `Detection History for ${entityName}:\n\n`;
				for (const record of history) {
					const turnsAgo = Utilities.turn.since(record.turn);
					state.message += `Turn ${record.turn} (${turnsAgo} turns ago): ${record.type}, confidence ${record.confidence.toFixed(2)}\n`;
				}
			}
			return '';
		}
	}
	
	function handlePronounCommand() {
		if (PronounResolver.recentEntities.length === 0) {
			state.message = 'No entities tracked for pronoun resolution yet.';
		} else {
			state.message = 'Recent Entities for Pronoun Resolution:\n\n';
			for (let i = 0; i < PronounResolver.recentEntities.length; i++) {
				const entity = PronounResolver.recentEntities[i];
				const turnsSince = Utilities.turn.since(entity.lastMentioned);
				state.message += `${i + 1}. ${entity.name} (${entity.type}) - ${turnsSince} turns ago\n`;
			}
		}
	}
	
	function handleRelationshipCommand(cmd) {
		const subCommand = cmd.args.join(' ').trim();
		
		if (!subCommand) {
			const card = Utilities.storyCard.get(ENTITY_RELATIONSHIPS_CARD);
			if (!card) {
				state.message = 'No entity relationships tracked yet.';
				return '';
			}
			
			const data = Utilities.plainText.parseSections(card.description);
			let msg = 'Entity Relationships:\n\n';
			
			for (const [section, content] of Object.entries(data)) {
				if (section === 'metadata' || typeof content !== 'object') continue;
				
				msg += `${Utilities.string.toTitleCase(section.replace(/_/g, ' '))}:\n`;
				for (const [rel, info] of Object.entries(content)) {
					msg += `  ${rel}: ${info}\n`;
				}
				msg += '\n';
			}
			
			state.message = msg;
			return '';
		}
		
		// Show relationships for specific entity
		const card = Utilities.storyCard.get(ENTITY_RELATIONSHIPS_CARD);
		if (!card) {
			state.message = 'No entity relationships tracked yet.';
			return '';
		}
		
		const data = Utilities.plainText.parseSections(card.description);
		let found = false;
		let msg = `Relationships for ${subCommand}:\n\n`;
		
		for (const [section, content] of Object.entries(data)) {
			if (section === 'metadata' || typeof content !== 'object') continue;
			
			const relevant = [];
			for (const [rel, info] of Object.entries(content)) {
				if (rel.toLowerCase().includes(subCommand.toLowerCase())) {
					relevant.push(`${rel}: ${info}`);
					found = true;
				}
			}
			
			if (relevant.length > 0) {
				msg += `${Utilities.string.toTitleCase(section.replace(/_/g, ' '))}:\n`;
				for (const rel of relevant) {
					msg += `  ${rel}\n`;
				}
				msg += '\n';
			}
		}
		
		state.message = found ? msg : `No relationships found for "${subCommand}"`;
	}
	
	function handleAssociationCommand(cmd) {
		const subCommand = cmd.args.join(' ').trim();
		
		if (!subCommand) {
			const card = Utilities.storyCard.get(ENTITY_ASSOCIATIONS_CARD);
			if (!card) {
				state.message = 'No entity associations tracked yet.';
				return '';
			}
			
			const data = Utilities.plainText.parseSections(card.description);
			let msg = 'Entity Word Associations:\n\n';
			
			for (const [section, content] of Object.entries(data)) {
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
			return '';
		}
		
		const registryCard = Utilities.storyCard.get(ENTITY_REGISTRY_CARD);
		if (!registryCard) {
			state.message = 'No entities registered yet.';
			return '';
		}
		
		const registry = Utilities.plainText.parseSections(registryCard.description);
		let entityType = null;
		
		for (const [type, entities] of Object.entries(registry)) {
			if (type === 'metadata' || typeof entities !== 'object') continue;
			if (entities[subCommand]) {
				entityType = type.toUpperCase();
				break;
			}
		}
		
		if (!entityType) {
			state.message = `Entity "${subCommand}" not found in registry.`;
			return '';
		}
		
		const associations = AssociationTracker.getAssociations(subCommand, entityType);
		if (associations.length === 0) {
			state.message = `No associations tracked for "${subCommand}" yet.`;
		} else {
			state.message = `Associations for ${subCommand} (${entityType}):\n\n`;
			for (const assoc of associations) {
				state.message += `  ${assoc.word}: ${assoc.count} occurrences\n`;
			}
			
			const similar = AssociationTracker.findSimilarEntities(subCommand);
			if (similar.length > 0) {
				state.message += `\nSimilar entities:\n`;
				for (const sim of similar) {
					state.message += `  ${sim.name} (${sim.type}) - ${(sim.similarity * 100).toFixed(1)}% similar\n`;
				}
			}
		}
	}
	
	function handleListCommand(cmd) {
		const subCommand = cmd.args[0] || 'show';
		
		if (subCommand === 'show') {
			if (cmd.args[1]) {
				const listName = Utilities.string.toSnakeCase(cmd.args[1]);
				const items = PatternDatabase.lists.get(listName);
				
				if (items.length === 0) {
					state.message = `List "${listName}" is empty or doesn't exist`;
				} else {
					state.message = `${Utilities.string.toTitleCase(listName.replace(/_/g, ' '))}:\n`;
					state.message += items.map(item => `- ${item}`).join('\n');
				}
			} else {
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
			}
			return '';
		}
		
		if (subCommand === 'add' && cmd.args[1] && cmd.args[2]) {
			const listName = Utilities.string.toSnakeCase(cmd.args[1]);
			const items = cmd.args.slice(2).join(' ').split(',').map(s => s.trim());
			
			PatternDatabase.lists.add(listName, items);
			state.message = `Added ${items.length} item(s) to ${listName}`;
			return '';
		}
		
		if (subCommand === 'remove' && cmd.args[1] && cmd.args[2]) {
			const listName = Utilities.string.toSnakeCase(cmd.args[1]);
			const items = cmd.args.slice(2).join(' ').split(',').map(s => s.trim());
			
			PatternDatabase.lists.remove(listName, items);
			state.message = `Removed ${items.length} item(s) from ${listName}`;
			return '';
		}
	}
	
	function handlePatternCommand(cmd) {
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
	}
	
	function handleBlacklistCommand(cmd) {
		const subCommand = cmd.args[0] || 'list';
		
		if (subCommand === 'add' && cmd.args[1]) {
			const word = cmd.args[1];
			const category = cmd.args[2] || 'generic_noun';
			
			updateBlacklist(word, category, 0.9);
			state.message = `Added "${word}" to blacklist`;
			return '';
		}
		
		if (subCommand === 'check' && cmd.args[1]) {
			const word = cmd.args[1];
			const wordLower = word.toLowerCase();
			const isBlack = PatternDatabase.isBlacklisted(word);
			
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
			return '';
		}
		
		if (subCommand === 'list' || !cmd.args.length) {
			const card = Utilities.storyCard.get('[DATABASE] Blacklists');
			if (!card) {
				state.message = 'Blacklist database not found';
				return '';
			}
			
			const data = Utilities.plainText.parseSections(card.description);
			let msg = 'Blacklisted Words:\n\n';
			
			const staticSection = data.static_blacklist;
			if (staticSection && Object.keys(staticSection).length > 0) {
				msg += '=== Static (Built-in) ===\n';
				const entries = Object.entries(staticSection).slice(0, 20);
				for (const [word, info] of entries) {
					const category = info.includes('=') ? info.split('=')[1] : info;
					msg += `${word}: ${category}\n`;
				}
				if (Object.keys(staticSection).length > 20) {
					msg += `... and ${Object.keys(staticSection).length - 20} more\n`;
				}
				msg += '\n';
			}
			
			const sections = ['learned_non_entities', 'learned_non_roles'];
			for (const sectionName of sections) {
				const section = data[Utilities.string.toSnakeCase(sectionName)];
				if (section && Object.keys(section).length > 0) {
					msg += `=== ${Utilities.string.toTitleCase(sectionName.replace(/_/g, ' '))} ===\n`;
					const entries = Object.entries(section)
						.map(([word, info]) => {
							const parsed = PatternDatabase.blacklists.get(sectionName, word);
							return parsed ? { word, ...parsed } : null;
						})
						.filter(entry => entry !== null)
						.sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
						.slice(0, 10);
					
					for (const entry of entries) {
						msg += `${entry.word}: ${entry.category} (conf=${entry.confidence.toFixed(2)}, seen=${entry.occurrences}x)\n`;
					}
					
					if (Object.keys(section).length > 10) {
						msg += `... and ${Object.keys(section).length - 10} more\n`;
					}
					msg += '\n';
				}
			}
			
			if (!data.learned_non_entities && !data.learned_non_roles) {
				msg += 'No learned entries yet.\n';
			}
			
			state.message = msg;
			return '';
		}
	}
	
	function handleRoleCommand(cmd) {
		const subCommand = cmd.args[0];
		
		if (subCommand === 'add' && cmd.args[1] && cmd.args[2]) {
			const match = cmd.args.join(' ').match(/^add\s+(\w+)\s+(\w+)\s+"([^"]+)"/);
			if (match) {
				const [, category, role, synonyms] = match;
				PatternDatabase.roles.add(category, role, synonyms.split(',').map(s => s.trim()));
				state.message = `Added role: ${role}`;
			}
			return '';
		}
		
		if (subCommand === 'check' && cmd.args[1]) {
			const word = cmd.args[1];
			const isValid = PatternDatabase.isValidRole(word);
			const synonyms = PatternDatabase.roles.getSynonyms(word);
			
			state.message = `"${word}" is ${isValid ? 'a VALID role' : 'NOT a valid role'}\n`;
			if (synonyms.length > 1) {
				state.message += `Synonyms: ${synonyms.join(', ')}`;
			}
			return '';
		}
	}
	
	function handleCandidateCommand(cmd) {
		const subCommand = cmd.args[0] || 'list';
		
		if (subCommand === 'list' || !cmd.args.length) {
			let msg = 'Word Candidates (awaiting promotion):\n\n';
			
			const categories = [
				'dialogue_verb', 'action_verb', 'place_type', 
				'object_type', 'noble_title', 'arrival_verb', 'departure_verb'
			];
			
			for (const category of categories) {
				const candidates = PatternDatabase.candidates.getAll(category);
				if (candidates.length > 0) {
					msg += `${Utilities.string.toTitleCase(category.replace(/_/g, ' '))}s:\n`;
					for (const cand of candidates.slice(0, 5)) {
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
				const candidateData = Utilities.plainText.parseSections(candidateCard.description);
				const metadata = candidateData.metadata || {};
				msg += `\nPromotion Requirements:\n`;
				msg += `  Confidence >= ${metadata.promotion_threshold || 0.75}\n`;
				msg += `  Occurrences >= ${metadata.min_occurrences || 4}\n`;
				msg += `  Contexts >= ${metadata.min_contexts || 3}\n`;
			}
			
			state.message = msg || 'No candidates currently tracked.';
			return '';
		}
		
		if (subCommand === 'promote' && cmd.args[1] && cmd.args[2]) {
			const category = cmd.args[1];
			const word = cmd.args[2];
			if (PatternDatabase.candidates.promote(category, word)) {
				state.message = `Promoted "${word}" to ${category} list`;
			} else {
				state.message = `Failed to promote "${word}"`;
			}
			return '';
		}
	}
	
	// =====================================
	// HARDCODED PATTERN TEMPLATES
	// =====================================
	function buildEntityPatterns() {
		const dialogueVerbs = PatternDatabase.lists.get('dialogue_verbs');
		const actionVerbs = PatternDatabase.lists.get('action_verbs');
		const placeTypes = PatternDatabase.lists.get('place_types');
		const objectTypes = PatternDatabase.lists.get('object_types');
		const nobleTitles = PatternDatabase.lists.get('noble_titles');
		const arrivalVerbs = PatternDatabase.lists.get('arrival_verbs');
		const departureVerbs = PatternDatabase.lists.get('departure_verbs');
		
		const buildAlternation = (words) => {
			if (!words || !Array.isArray(words) || words.length === 0) return 'NOMATCH';
			return words.join('|');
		};
		
		// Helper to create entity name pattern that captures multi-word entities
		const entityNamePattern = `[A-Z][a-z]+(?:(?:\\s+(?:${Array.from(ENTITY_CONNECTORS).join('|')}))?\\s+[A-Z][a-z]+)*`;
		
		const patterns = {
			person_dialogue: {
				patterns: [
					new RegExp(`"[^"]+",?\\s+(?:${buildAlternation(dialogueVerbs)})\\s+(${entityNamePattern})`, 'g'),
					new RegExp(`\\b(${entityNamePattern})\\s+(?:${buildAlternation(dialogueVerbs)}),?\\s*"`, 'g')
				],
				possibleTypes: { PERSON: 0.95, FACTION: 0.05 },
				baseConfidence: 0.85,
				complexity: 'dialogue_attribution'
			},
			
			person_action: {
				patterns: [
					new RegExp(`\\b(${entityNamePattern})\\s+(?:${buildAlternation(actionVerbs)})\\b`, 'g')
				],
				possibleTypes: { PERSON: 0.9, FACTION: 0.1 },
				baseConfidence: 0.8,
				complexity: 'simple_action'
			},
			
			person_titled: {
				patterns: nobleTitles.length > 0 ? [
					new RegExp(`\\b(?:${buildAlternation(nobleTitles)})\\s+(${entityNamePattern})`, 'g')
				] : [],
				possibleTypes: { PERSON: 0.95, FACTION: 0.05 },
				baseConfidence: 0.9,
				complexity: 'titled_introduction'
			},
			
			place_with_type: {
				patterns: [
					// "Town of Beginnings" style
					new RegExp(`\\b((?:[A-Z][a-z]+\\s+)?(?:${buildAlternation(placeTypes)})(?:\\s+of(?:\\s+the)?\\s+${entityNamePattern})?)\\b`, 'g'),
					// "Beginnings Town" style
					new RegExp(`\\b(${entityNamePattern}\\s+(?:${buildAlternation(placeTypes)}))\\b`, 'g'),
					// "The X Kingdom" style
					new RegExp(`\\b(?:The\\s+)?(${entityNamePattern}\\s+(?:${buildAlternation(placeTypes)}))\\b`, 'g')
				],
				possibleTypes: { PLACE: 0.9, FACTION: 0.1 },
				baseConfidence: 0.85,
				complexity: 'with_context'
			},
			
			place_arrival: {
				patterns: arrivalVerbs.length > 0 ? [
					new RegExp(`(?:${buildAlternation(arrivalVerbs)})\\s+(?:at|in|to)\\s+(?:the\\s+)?(${entityNamePattern})`, 'g')
				] : [],
				possibleTypes: { PLACE: 0.85, FACTION: 0.15 },
				baseConfidence: 0.75,
				complexity: 'with_context'
			},
			
			object_with_type: {
				patterns: [
					// "Sword of Fire" style
					new RegExp(`\\b(?:the\\s+)?((?:[A-Z][a-z]+\\s+)?(?:${buildAlternation(objectTypes)})(?:\\s+of(?:\\s+the)?\\s+${entityNamePattern})?)\\b`, 'g'),
					// "Fire Sword" style
					new RegExp(`\\b(?:the\\s+)?(${entityNamePattern}\\s+(?:${buildAlternation(objectTypes)}))\\b`, 'g')
				],
				possibleTypes: { OBJECT: 0.9, PERSON: 0.1 },
				baseConfidence: 0.8,
				complexity: 'with_context'
			},
			
			faction_guild: {
				patterns: [
					// "Guild of Merchants" style
					new RegExp(`\\b((?:Guild|Order|Brotherhood|Clan|House|Family|Company|Corporation|Syndicate)(?:\\s+of(?:\\s+the)?\\s+${entityNamePattern})?)\\b`, 'g'),
					// "Merchants Guild" style
					new RegExp(`\\b(${entityNamePattern}\\s+(?:Guild|Order|Brotherhood|Clan|House|Family|Company|Corporation|Syndicate))\\b`, 'g')
				],
				possibleTypes: { FACTION: 0.9, PLACE: 0.1 },
				baseConfidence: 0.85,
				complexity: 'with_context'
			}
		};
		
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
	
	function loadWordLists() {
		try {
			return {
				MINOR_WORDS: PatternDatabase.lists.getSet('minor_words'),
				COMMON_WORDS: PatternDatabase.lists.getSet('common_words'),
				NON_ROLE_WORDS: PatternDatabase.lists.getSet('non_role_words')
			};
		} catch (error) {
			if (debug) {
				console.log(`[${MODULE_NAME}] Error loading word lists:`, error.message);
			}
			return {
				MINOR_WORDS: new Set(),
				COMMON_WORDS: new Set(),
				NON_ROLE_WORDS: new Set()
			};
		}
	}
	
	function isBlacklisted(text) {
		return PatternDatabase.isBlacklisted(text);
	}
	
	function isValidRole(word) {
		if (word.length < 3) return false;
		if (/^\d+$/.test(word)) return false;
		
		if (isBlacklisted(word)) return false;
		
		const genericWords = ['person', 'people', 'thing', 'things', 'someone', 'something', 'anyone', 'everyone'];
		if (genericWords.includes(word.toLowerCase())) {
			updateBlacklist(word, 'generic_role_word', 0.9);
			return false;
		}
		
		return PatternDatabase.isValidRole(word);
	}
	
	// =====================================
	// BLACKLIST LEARNING SYSTEM
	// =====================================
	function updateBlacklist(word, category, confidence) {
		const currentTurn = Utilities.turn.getCurrentTurn();
		const wordLower = word.toLowerCase();
		
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
		
		if (data.occurrences >= 3 || data.confidence >= 0.7) {
			const targetSection = category.includes('role') ? 'learned_non_roles' : 'learned_non_entities';
			
			PatternDatabase.blacklists.add(targetSection, wordLower, data);
			
			if (debug && (!existing || existing.occurrences === 1)) {
				console.log(`[${MODULE_NAME}] Blacklisted "${word}" in ${targetSection} as ${category}`);
			}
		}
	}
	
	function getEntityAliases(name) {
		return PatternDatabase.getAliases(name);
	}
	
	// =====================================
	// ENTITY DETECTION & SCORING
	// =====================================
	const ENTITY_PATTERNS = buildEntityPatterns();
	const wordLists = loadWordLists();
	const MINOR_WORDS = wordLists.MINOR_WORDS || new Set();
	const COMMON_WORDS = wordLists.COMMON_WORDS || new Set();
	const NON_ROLE_WORDS = wordLists.NON_ROLE_WORDS || new Set();
	
	function processDetectedEntities(text, actionType = 'continue') {
		if (!text || typeof text !== 'string') return [];
		
		const detectedEntities = [];
		const failedCandidates = [];
		const processedSpans = new Map();
		
		// Initialize N-gram detector if needed
		if (NGramDetector.entityPatterns.size === 0) {
			NGramDetector.initialize();
		}
		
		// First, detect multi-word entities
		const multiWordEntities = MultiWordEntityDetector.detectMultiWordEntities(text);
		
		// Mark the spans of multi-word entities to avoid duplicate detection
		for (const mwEntity of multiWordEntities) {
			const start = mwEntity.position;
			const end = start + mwEntity.name.length;
			
			// Check if this span overlaps with any already processed
			let overlaps = false;
			for (const [existingStart, existingEnd] of processedSpans) {
				if ((start >= existingStart && start < existingEnd) || 
					(end > existingStart && end <= existingEnd)) {
					overlaps = true;
					break;
				}
			}
			
			if (!overlaps) {
				processedSpans.set(start, end);
				
				// Determine type based on the entity name
				let entityType = 'UNKNOWN';
				const nameLower = mwEntity.name.toLowerCase();
				
				if (nameLower.includes('town') || nameLower.includes('city') || 
					nameLower.includes('village') || nameLower.includes('kingdom')) {
					entityType = 'PLACE';
				} else if (nameLower.includes('guild') || nameLower.includes('order') || 
						   nameLower.includes('clan') || nameLower.includes('house')) {
					entityType = 'FACTION';
				} else if (nameLower.includes('sword') || nameLower.includes('blade') || 
						   nameLower.includes('armor') || nameLower.includes('shield')) {
					entityType = 'OBJECT';
				}
				
				detectedEntities.push({
					name: MultiWordEntityDetector.normalizeEntityName(mwEntity.name),
					type: entityType,
					confidence: mwEntity.confidence,
					occurrences: 1,
					isNew: true,
					matchedPattern: 'multi_word_' + mwEntity.pattern,
					context: mwEntity.name,
					position: mwEntity.position
				});
			}
		}
		
		// Then process with standard patterns, avoiding already detected spans
		for (const [patternKey, patternConfig] of Object.entries(ENTITY_PATTERNS)) {
			for (const pattern of patternConfig.patterns) {
				try {
					let match;
					pattern.lastIndex = 0;
					
					while ((match = pattern.exec(text)) !== null) {
						const fullMatch = match[0];
						const entityName = match[1] || match[0];
						const matchIndex = match.index;
						const matchEnd = matchIndex + fullMatch.length;
						
						// Check if this match overlaps with already processed multi-word entities
						let overlaps = false;
						for (const [start, end] of processedSpans) {
							if ((matchIndex >= start && matchIndex < end) || 
								(matchEnd > start && matchEnd <= end)) {
								overlaps = true;
								break;
							}
						}
						
						if (overlaps) continue;
						
						if (!entityName || entityName.length < 2) continue;
						
						// Normalize the entity name
						const normalizedName = MultiWordEntityDetector.normalizeEntityName(entityName);
						
						if (isSentenceCapitalization(normalizedName, text, matchIndex)) {
							failedCandidates.push({
								name: normalizedName,
								failureReason: 'sentence_capitalization'
							});
							continue;
						}
						
						if (isBlacklisted(normalizedName)) {
							failedCandidates.push({
								name: normalizedName,
								failureReason: 'blacklisted'
							});
							continue;
						}
						
						let confidence = patternConfig.baseConfidence;
						
						if (isAtSentenceStart(text, matchIndex)) {
							if (COMMON_WORDS.has(normalizedName.toLowerCase()) || 
								COMMON_SENTENCE_STARTERS.has(normalizedName.toLowerCase())) {
								confidence *= 0.3;
							} else {
								confidence *= 0.9;
							}
						}
						
						if (normalizedName.split(' ').length > 3) {
							confidence *= 0.8;
						}
						
						if (COMMON_WORDS.has(normalizedName.toLowerCase())) {
							confidence *= 0.5;
							failedCandidates.push({
								name: normalizedName,
								failureReason: 'too_common'
							});
							continue;
						}
						
						const entityType = determineEntityType(normalizedName, patternConfig.possibleTypes);
						const assocBoost = AssociationTracker.calculateAssociationBoost(
							text,
							{ name: normalizedName, type: entityType }
						);
						confidence = Math.min(1.0, confidence + assocBoost);
						
						const historicalContext = AssociationTracker.getHistoricalContext();
						const entityKey = `${entityType}:${normalizedName}`;
						if (historicalContext.has(entityKey)) {
							const appearances = historicalContext.get(entityKey);
							confidence = Math.min(1.0, confidence + (appearances * 0.05));
						}
						
						if (confidence < CONFIDENCE_THRESHOLD) {
							failedCandidates.push({
								name: normalizedName,
								failureReason: 'low_confidence',
								confidence: confidence
							});
							continue;
						}
						
						const existing = detectedEntities.find(e => 
							e.name.toLowerCase() === normalizedName.toLowerCase()
						);
						
						if (existing) {
							existing.confidence = Math.max(existing.confidence, confidence);
							existing.occurrences++;
						} else {
							detectedEntities.push({
								name: normalizedName,
								type: entityType,
								confidence: confidence,
								occurrences: 1,
								isNew: true,
								matchedPattern: patternKey,
								context: fullMatch,
								position: matchIndex
							});
							
							AssociationTracker.trackAssociations(text, {
								name: normalizedName,
								type: entityType
							}, matchIndex);
							
							learnFromDetection(text, {
								name: normalizedName,
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
		
		// Apply ensemble scoring
		for (const entity of detectedEntities) {
			entity.ensembleScore = EnsembleScorer.scoreEntity(
				entity,
				text,
				entity.position || text.indexOf(entity.name)
			);
			
			// Check for similar entities and merge associations
			const similar = AssociationTracker.findSimilarEntities(entity.name);
			if (similar.length > 0) {
				AssociationTracker.mergeAssociations(entity, similar);
			}
		}
		
		// Update pronoun resolver
		PronounResolver.updateRecentEntities(detectedEntities);
		
		// Detect and resolve pronouns
		const pronounResolutions = PronounResolver.detectPronouns(text);
		if (debug && pronounResolutions.length > 0) {
			console.log(`[${MODULE_NAME}] Resolved ${pronounResolutions.length} pronouns`);
			for (const resolution of pronounResolutions) {
				console.log(`  "${resolution.pronoun}" -> ${resolution.resolved}`);
			}
		}
		
		// Extract relationships
		const relationships = RelationshipExtractor.extractRelationships(text, detectedEntities);
		if (relationships.length > 0) {
			RelationshipExtractor.updateRelationships(relationships);
			if (debug) {
				console.log(`[${MODULE_NAME}] Extracted ${relationships.length} relationships`);
			}
		}
		
		// Track entities across turns
		CrossTurnTracker.trackTurn(detectedEntities, Utilities.turn.getCurrentTurn());
		
		// Sort by ensemble score
		detectedEntities.sort((a, b) => b.ensembleScore - a.ensembleScore);
		
		// Update blacklist with failed candidates
		for (const candidate of failedCandidates) {
			if (candidate.failureReason === 'too_common') {
				updateBlacklist(candidate.name, 'common_word', 0.8);
			} else if (candidate.failureReason === 'sentence_capitalization') {
				updateBlacklist(candidate.name, 'sentence_starter', 0.6);
			} else if (candidate.failureReason === 'blacklisted') {
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
		
		return detectedEntities;
	}
	
	// =====================================
	// LEARNING SYSTEM
	// =====================================
	function learnFromDetection(text, entity, patternKey, fullMatch) {
		if (!text || !entity || !patternKey || !fullMatch) return;
		
		if (entity.confidence < 0.6) return;
		
		if (patternKey === 'person_dialogue') {
			const verbMatch = fullMatch.match(/"[^"]+",?\s+(\w+)\s+/);
			if (verbMatch && verbMatch[1]) {
				const verb = verbMatch[1].toLowerCase();
				const dialogueVerbs = PatternDatabase.lists.get('dialogue_verbs');
				if (dialogueVerbs && !dialogueVerbs.includes(verb)) {
					PatternDatabase.candidates.track('dialogue_verb', verb, fullMatch, entity.confidence);
				}
			}
		} else if (patternKey === 'person_action') {
			const actionMatch = fullMatch.match(/\s+(\w+)(?:\s|$)/);
			if (actionMatch && actionMatch[1]) {
				const verb = actionMatch[1].toLowerCase();
				const actionVerbs = PatternDatabase.lists.get('action_verbs');
				if (actionVerbs && !actionVerbs.includes(verb)) {
					PatternDatabase.candidates.track('action_verb', verb, fullMatch, entity.confidence);
				}
			}
		} else if (patternKey === 'place_with_type') {
			const typeMatch = fullMatch.match(/\s+([A-Z][a-z]+)$/);
			if (typeMatch && typeMatch[1]) {
				const placeType = typeMatch[1];
				const placeTypes = PatternDatabase.lists.get('place_types');
				if (placeTypes && !placeTypes.includes(placeType)) {
					PatternDatabase.candidates.track('place_type', placeType, fullMatch, entity.confidence);
				}
			}
		} else if (patternKey === 'object_with_type') {
			const typeMatch = fullMatch.match(/\s+([A-Z][a-z]+)$/);
			if (typeMatch && typeMatch[1]) {
				const objectType = typeMatch[1];
				const objectTypes = PatternDatabase.lists.get('object_types');
				if (objectTypes && !objectTypes.includes(objectType)) {
					PatternDatabase.candidates.track('object_type', objectType, fullMatch, entity.confidence);
				}
			}
		}
		
		// Train N-gram detector with new entity
		NGramDetector.trainEntity(entity.name, entity.type);
		
		try {
			const capitalizedWords = text.match(/\b[A-Z][a-z]+\b/g) || [];
			for (const word of capitalizedWords) {
				if (word === entity.name || entity.name.includes(word)) continue;
				
				const wordIndex = text.indexOf(word);
				const contextBefore = text.substring(Math.max(0, wordIndex - 30), wordIndex);
				const contextAfter = text.substring(wordIndex + word.length, wordIndex + word.length + 30);
				
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
	
	function determineEntityType(name, typeWeights) {
		if (!typeWeights || typeof typeWeights !== 'object') {
			return 'UNKNOWN';
		}
		
		const sorted = Object.entries(typeWeights)
			.sort(([,a], [,b]) => b - a);
		
		return sorted[0] ? sorted[0][0] : 'UNKNOWN';
	}
	
	function updateEntityRegistry(entities) {
		if (!entities || !Array.isArray(entities) || entities.length === 0) return;
		
		try {
			let registryCard = Utilities.storyCard.get(ENTITY_REGISTRY_CARD);
			let registry;
			
			if (registryCard) {
				registry = Utilities.plainText.parseSections(registryCard.description);
			} else {
				registry = {
					metadata: {
						last_update: 0,
						total_entities: 0
					}
				};
			}
			
			for (const entity of entities) {
				if (!entity || !entity.name || !entity.type) continue;
				
				const typeSection = entity.type.toLowerCase();
				if (!registry[typeSection]) {
					registry[typeSection] = {};
				}
				
				const existing = registry[typeSection][entity.name];
				if (existing) {
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
					
					confidence = Math.max(confidence, entity.ensembleScore || entity.confidence);
					occurrences += entity.occurrences;
					
					registry[typeSection][entity.name] = 
						`confidence=${confidence.toFixed(2)}, occurrences=${occurrences}`;
				} else {
					registry[typeSection][entity.name] = 
						`confidence=${(entity.ensembleScore || entity.confidence).toFixed(2)}, occurrences=${entity.occurrences}`;
				}
			}
			
			registry.metadata.last_update = Utilities.turn.getCurrentTurn();
			registry.metadata.total_entities = Object.values(registry)
				.filter(s => typeof s === 'object' && s !== registry.metadata)
				.reduce((sum, section) => sum + Object.keys(section).length, 0);
			
			const description = RelationshipExtractor.formatData(registry);
			
			if (registryCard) {
				Utilities.storyCard.update(ENTITY_REGISTRY_CARD, { description });
			} else {
				Utilities.storyCard.add({
					title: ENTITY_REGISTRY_CARD,
					entry: '',
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

	if (hook === 'output') {
		if (!text || text.length < 10) return text;
		
		const detectedEntities = processDetectedEntities(text);
		
		if (detectedEntities.length > 0) {
			updateEntityRegistry(detectedEntities);
			
			if (debug) {
				console.log(`[${MODULE_NAME}] Detected ${detectedEntities.length} entities in new output`);
				for (const entity of detectedEntities) {
					console.log(`  ${entity.name} (${entity.type}) - confidence: ${entity.confidence.toFixed(2)}, ensemble: ${entity.ensembleScore.toFixed(2)}`);
				}
				
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
				
				const blacklistCard = Utilities.storyCard.get('[DATABASE] Blacklists');
				if (blacklistCard) {
					const data = Utilities.plainText.parseSections(blacklistCard.description);
					const learnedCount = 
						Object.keys(data.learned_non_entities || {}).length +
						Object.keys(data.learned_non_roles || {}).length;
					if (learnedCount > 0) {
						console.log(`  Blacklisted words: ${learnedCount} learned`);
					}
				}
			}
		}
		
		return text;
	}
	
	return text;
}
