function QualityAssurance(hook, text) {
    'use strict';
    
    // Usage in Scripting Sandbox:
    // Context Modifier: 
    //   QualityAssurance("context", text);
    // Output Modifier:
    //   text = QualityAssurance("output", text);
    //
    // Configuration Cards:
    //   [QA] Settings - Main configuration settings
    //   [QA] Cliché Rules - Cliché patterns to remove/replace
    //   [QA] Cliché Rules 2, 3, etc. - Additional cliché rules
    //   [QA] Filler Rules - Filler words to reduce
    //   [QA] Name Replacer - Name replacement groups
    //   [QA] Name Replacer 2, 3, etc. - Additional name groups
    //
    // Rule Format:
    //   ## Rule Name
    //   Type: pattern|word|phrase
    //   Match: pattern or word to match
    //   Action: remove|replace|reduce
    //   Replacements: (for replace action, one per line)
    //   - replacement 1
    //   - replacement 2
    //   Max Count: 2 (for reduce action)
    //
    //   ## Name Replacer Name
    //   Names: Chen, Elara, Lysandra
    //   Replacements:
    //   - Phoebe
    //   - Sophie
    //   - Sakura
    
    // Module constants
    const debug = false;
    const MODULE_NAME = 'QualityAssurance';
    const CONFIG_CARD = '[QA] Settings';
    const CLICHE_PREFIX = '[QA] Cliché Rules';
    const FILLER_PREFIX = '[QA] Filler Rules';
    const NAME_PREFIX = '[QA] Name Replacer';
    
    // Module-level cache
    let configCache = null;
    let rulesCache = null;
    let nameGroupsCache = null;
    let statsCache = {
        clichesRemoved: 0,
        fillersRemoved: 0,
        phrasesRemoved: 0,
        namesReplaced: 0,
        hangingFixed: 0,
        totalReplacements: 0
    };
    
    // Temporary processing caches (cleared each output)
    let nameMapCache = new Map();
    let usedNamesCache = new Set();
    let usedReplacements = {};
    
    // Helper to find all cards with a prefix
    function findAllCardsWithPrefix(prefix) {
        const cards = [];
        
        // Check base card
        const baseCard = Utilities.storyCard.get(prefix);
        if (baseCard) cards.push(baseCard);
        
        // Check numbered cards
        for (let i = 2; i <= 10; i++) {
            const numberedCard = Utilities.storyCard.get(`${prefix} ${i}`);
            if (numberedCard) {
                cards.push(numberedCard);
            } else {
                break; // Stop when we don't find a card
            }
        }
        
        return cards;
    }
    
    // Configuration Management
    function loadConfiguration() {
        if (configCache) return configCache;
        
        const configCard = Utilities.storyCard.get(CONFIG_CARD);
        if (!configCard) {
            createDefaultConfiguration();
            return loadConfiguration();
        }
        
        // Parse settings from entry only
        const entrySections = Utilities.plainText.parseSections(configCard.entry);
        const settings = (entrySections && entrySections.settings) || {};
        
        const config = {
            removeRepeated: Utilities.string.parseBoolean(settings.remove_repeated || 'true'),
            minPhraseLength: parseInt(settings.min_phrase_length) || 6,
            minOccurrences: parseInt(settings.min_occurrences) || 2,
            removeCliches: Utilities.string.parseBoolean(settings.remove_cliches || 'true'),
            reduceFillers: Utilities.string.parseBoolean(settings.reduce_fillers || 'true'),
            separateDialogue: Utilities.string.parseBoolean(settings.separate_dialogue || 'true'),
            enforceParagraphs: Utilities.string.parseBoolean(settings.enforce_paragraphs || 'true'),
            replaceNames: Utilities.string.parseBoolean(settings.replace_names || 'true'),
            ensureSpacing: Utilities.string.parseBoolean(settings.ensure_spacing || 'true'),
            fixHangingPunctuation: Utilities.string.parseBoolean(settings.fix_hanging_punctuation || 'true')
        };
        
        configCache = config;
        return config;
    }
    
    function createDefaultConfiguration() {
        const defaultSettings = {
            remove_repeated: true,
            min_phrase_length: 6,
            min_occurrences: 2,
            remove_cliches: true,
            reduce_fillers: true,
            separate_dialogue: true,
            enforce_paragraphs: true,
            replace_names: true,
            ensure_spacing: true,
            fix_hanging_punctuation: true
        };
        
                const entryText = (
            `# Quality Assurance System\n`+
            `## Settings\n`+
            `Remove Repeated: ${defaultSettings.remove_repeated}\n`+
            `Min Phrase Length: ${defaultSettings.min_phrase_length}\n`+
            `Min Occurrences: ${defaultSettings.min_occurrences}\n`+
            `Remove Cliches: ${defaultSettings.remove_cliches}\n`+
            `Reduce Fillers: ${defaultSettings.reduce_fillers}\n`+
            `Separate Dialogue: ${defaultSettings.separate_dialogue}\n`+
            `Enforce Paragraphs: ${defaultSettings.enforce_paragraphs}\n`+
            `Replace Names: ${defaultSettings.replace_names}\n`+
            `Ensure Spacing: ${defaultSettings.ensure_spacing}\n`+
            `Fix Hanging Punctuation: ${defaultSettings.fix_hanging_punctuation}`
        );
        
        const descriptionText = ``;
        
        Utilities.storyCard.add({
            title: CONFIG_CARD,
            entry: entryText,
            type: 'system',
            keys: '============SAFETYMEASURE==================',
            description: descriptionText
        });
        
        // Create default rule cards
        createDefaultClicheRules();
        createDefaultFillerRules();
        createDefaultNameGroups();
    }
    
    function createDefaultClicheRules() {
        const entryText = (
            `# Cliché Pattern Rules\n`+
            `Common overused phrases detected and replaced.\n`+
            `\n`+
            `## White Knuckles\n`+
            `Type: pattern\n`+
            `Match: knuckles (go|turn|are|have turned) (stark )?white\n`+
            `Action: replace\n`+
            `Replacements:\n`+
            `- hands tighten\n`+
            `- grip strengthens\n`+
            `- fists clench\n`+
            `\n`+
            `## Thick Air\n`+
            `Type: pattern\n`+
            `Match: the air is thick( with)?\n`+
            `Action: replace\n`+
            `Replacements:\n`+
            `- tension fills the room\n`+
            `- the atmosphere feels heavy\n`+
            `- everyone senses\n`+
            `\n`+
            `## Smile Playing\n`+
            `Type: pattern\n`+
            `Match: smile play(ing|s|ed) at the corners of (his|her|their) lips\n`+
            `Action: replace\n`+
            `Replacements:\n`+
            `- $2 smiles slightly\n`+
            `- a faint smile appears\n`+
            `- $2 almost smiles\n`+
            `\n`+
            `## Well Well Well\n`+
            `Type: phrase\n`+
            `Match: Well, well, well\n`+
            `Action: remove\n`+
            `\n`+
            `## This Changes Everything\n`+
            `Type: phrase\n`+
            `Match: This changes everything\n`+
            `Action: remove`
        );
        
        const descriptionText = ``;
        
        Utilities.storyCard.add({
            title: CLICHE_PREFIX,
            entry: entryText,
            type: 'rules',
            keys: '============SAFETYMEASURE==================',
            description: descriptionText
        });
    }
    
    function createDefaultFillerRules() {
        const entryText = (
            `# Filler Word Reduction\n`+
            `Limits frequency of overused filler words.\n`+
            `Words beyond the limit are removed from the text.\n`+
            `\n`+
            `## Just\n`+
            `Type: word\n`+
            `Match: just\n`+
            `Action: reduce\n`+
            `Max Count: 2\n`+
            `\n`+
            `## Really\n`+
            `Type: word\n`+
            `Match: really\n`+
            `Action: reduce\n`+
            `Max Count: 2\n`+
            `\n`+
            `## Very\n`+
            `Type: word\n`+
            `Match: very\n`+
            `Action: reduce\n`+
            `Max Count: 2\n`+
            `\n`+
            `## Actually\n`+
            `Type: word\n`+
            `Match: actually\n`+
            `Action: reduce\n`+
            `Max Count: 1\n`+
            `\n`+
            `## Simply\n`+
            `Type: word\n`+
            `Match: simply\n`+
            `Action: reduce\n`+
            `Max Count: 1`
        );
        
        const descriptionText = ``;
        
        Utilities.storyCard.add({
            title: FILLER_PREFIX,
            entry: entryText,
            type: 'rules',
            keys: '============SAFETYMEASURE==================',
            description: descriptionText
        });
    }
    
    function createDefaultNameGroups() {
        const entryText = (
            `# Name Replacement Groups\n`+
            `Replaces AI-overused character names with alternatives.\n`+
            `\n`+
            `## Female Fantasy Names\n`+
            `Names: Chen, Elara, Lysandra, Seraphina, Kaida\n`+
            `Replacements:\n`+
            `- Phoebe\n`+
            `- Sophie\n`+
            `- Sakura\n`+
            `- Morgana\n`+
            `- Kiara\n`+
            `- Olivia\n`+
            `- Scarlett\n`+
            `- Luna\n`+
            `- Aria\n`+
            `- Celeste\n`+
            `- Violet\n`+
            `- Ember\n`+
            `\n`+
            `## Male Fantasy Names\n`+
            `Names: Kael, Thorne, Zephyr, Darius, Ezra\n`+
            `Replacements:\n`+
            `- Gideon\n`+
            `- Milo\n`+
            `- Oscar\n`+
            `- Jasper\n`+
            `- Rowan\n`+
            `- Felix\n`+
            `- Adrian`
        );
        
        const descriptionText = ``;
        
        Utilities.storyCard.add({
            title: NAME_PREFIX,
            entry: entryText,
            type: 'rules',
            keys: '============SAFETYMEASURE==================',
            description: descriptionText
        });
    }
    
    // Load cliché and filler rules from all cards
    function loadTextRules() {
        if (rulesCache) return rulesCache;
        
        const rules = {
            pattern: [],
            word: [],
            phrase: []
        };
        
        // Load cliché rules from all cliché cards
        const clicheCards = findAllCardsWithPrefix(CLICHE_PREFIX);
        clicheCards.forEach(card => {
            if (!card) {
                if (debug) console.log('[QA] Skipping null card');
                return;
            }
            
            // Parse rules from both entry and description
            const sources = [];
            if (card.entry && card.entry.includes('##')) {
                sources.push(card.entry);
            }
            if (card.description && !card.description.startsWith('//')) {
                sources.push(card.description);
            }
            
            sources.forEach(source => {
                const sections = Utilities.plainText.parseSections(source);
                if (!sections || typeof sections !== 'object') {
                    if (debug) console.log('[QA] Failed to parse sections from source');
                    return;
                }
                
                Object.entries(sections).forEach(([sectionName, content]) => {
                    // Skip meta sections
                    if (sectionName.toLowerCase() === 'settings' || 
                        sectionName.toLowerCase() === 'configuration' ||
                        sectionName.toLowerCase().includes('active')) {
                        return;
                    }
                    
                    // Add defensive checks
                    if (!content || typeof content !== 'object') {
                        if (debug) console.log(`[QA] Skipping invalid section: ${sectionName}`);
                        return;
                    }
                    
                    // Ensure content has required properties
                    if (content.type && content.match && rules[content.type]) {
                        const rule = { ...content, name: sectionName };
                        
                        // Parse replacements if they exist
                        if (rule.replacements && Array.isArray(rule.replacements)) {
                            // Already parsed as array
                        } else if (rule.replacements) {
                            // Parse from string
                            rule.replacements = rule.replacements
                                .split('\n')
                                .map(r => r.trim())
                                .filter(r => r && r !== '-');
                        }
                        
                        rules[rule.type].push(rule);
                    } else if (debug) {
                        console.log(`[QA] Invalid rule format in section: ${sectionName}`, content);
                    }
                });
            });
        });
        
        // Load filler rules
        const fillerCards = findAllCardsWithPrefix(FILLER_PREFIX);
        fillerCards.forEach(card => {
            if (!card) {
                if (debug) console.log('[QA] Skipping null filler card');
                return;
            }
            
            // Parse rules from both entry and description
            const sources = [];
            if (card.entry && card.entry.includes('##')) {
                sources.push(card.entry);
            }
            if (card.description && !card.description.startsWith('//')) {
                sources.push(card.description);
            }
            
            sources.forEach(source => {
                const sections = Utilities.plainText.parseSections(source);
                if (!sections || typeof sections !== 'object') {
                    if (debug) console.log('[QA] Failed to parse sections from filler source');
                    return;
                }
                
                Object.entries(sections).forEach(([sectionName, content]) => {
                    // Skip meta sections
                    if (sectionName.toLowerCase() === 'settings' || 
                        sectionName.toLowerCase() === 'configuration' ||
                        sectionName.toLowerCase().includes('active')) {
                        return;
                    }
                    
                    // Add defensive checks
                    if (!content || typeof content !== 'object') {
                        if (debug) console.log(`[QA] Skipping invalid filler section: ${sectionName}`);
                        return;
                    }
                    
                    if (content.type === 'word' && content.action === 'reduce' && content.match) {
                        rules.word.push({
                            ...content,
                            name: sectionName,
                            max_count: parseInt(content.max_count) || 2
                        });
                    } else if (debug && content.type) {
                        console.log(`[QA] Invalid filler rule format in section: ${sectionName}`, content);
                    }
                });
            });
        });
        
        rulesCache = rules;
        return rules;
    }
    
    // Load name replacement groups from all cards
    function loadNameGroups() {
        if (nameGroupsCache) return nameGroupsCache;
        
        const groups = new Map();
        
        const nameCards = findAllCardsWithPrefix(NAME_PREFIX);
        nameCards.forEach(card => {
            if (!card) {
                if (debug) console.log('[QA] Skipping null name card');
                return;
            }
            
            // Parse rules from both entry and description
            const sources = [];
            if (card.entry && card.entry.includes('##')) {
                sources.push(card.entry);
            }
            if (card.description && !card.description.startsWith('//')) {
                sources.push(card.description);
            }
            
            sources.forEach(source => {
                const sections = Utilities.plainText.parseSections(source);
                if (!sections || typeof sections !== 'object') {
                    if (debug) console.log('[QA] Failed to parse sections from name source');
                    return;
                }
                
                Object.entries(sections).forEach(([groupName, content]) => {
                    // Skip meta sections
                    if (groupName.toLowerCase() === 'settings' || 
                        groupName.toLowerCase() === 'configuration' ||
                        groupName.toLowerCase().includes('active') ||
                        groupName.toLowerCase().includes('purpose')) {
                        return;
                    }
                    
                    // Add defensive checks
                    if (!content || typeof content !== 'object') {
                        if (debug) console.log(`[QA] Skipping invalid name group section: ${groupName}`);
                        return;
                    }
                    
                    // Check if this section has names and replacements
                    if (!content.names || !content.replacements) {
                        if (debug) console.log(`[QA] Name group missing required fields: ${groupName}`, content);
                        return;
                    }
                    
                    // Parse names list
                    let names = [];
                    if (Array.isArray(content.names)) {
                        names = content.names;
                    } else if (typeof content.names === 'string') {
                        names = content.names.split(',').map(n => n.trim()).filter(n => n);
                    }
                    
                    if (names.length === 0) {
                        if (debug) console.log(`[QA] No valid names in group: ${groupName}`);
                        return;
                    }
                    
                    // Parse replacements
                    let replacements = [];
                    if (Array.isArray(content.replacements)) {
                        replacements = content.replacements;
                    } else if (content.replacements) {
                        replacements = content.replacements
                            .split('\n')
                            .map(r => r.trim())
                            .filter(r => r && r !== '-');
                    }
                    
                    if (replacements.length === 0) {
                        if (debug) console.log(`[QA] No valid replacements in group: ${groupName}`);
                        return;
                    }
                    
                    const group = {
                        groupName: groupName,
                        replacements: replacements
                    };
                    
                    // Map each name to this group
                    names.forEach(name => {
                        if (name) {
                            groups.set(name.toLowerCase(), group);
                        }
                    });
                });
            });
        });
        
        nameGroupsCache = groups;
        return groups;
    }
    
    // Process text with rules
    function processTextRules(text, rules) {
        let processedText = text;
        
        // Process pattern-based rules (regex)
        rules.pattern.forEach(rule => {
            if (rule.action === 'remove') {
                processedText = processedText.replace(
                    new RegExp(rule.match, 'gi'),
                    () => {
                        statsCache.clichesRemoved++;
                        statsCache.totalReplacements++;
                        return '';
                    }
                );
            } else if (rule.action === 'replace' && rule.replacements) {
                const key = rule.match;
                if (!usedReplacements[key]) {
                    usedReplacements[key] = 0;
                }
                
                processedText = processedText.replace(
                    new RegExp(rule.match, 'gi'),
                    (match, ...groups) => {
                        const index = usedReplacements[key] % rule.replacements.length;
                        usedReplacements[key]++;
                        
                        let replacement = rule.replacements[index];
                        
                        // Handle capture groups
                        if (groups.length > 0) {
                            groups.forEach((group, i) => {
                                if (group) {
                                    replacement = replacement.replace(
                                        new RegExp('\\$' + (i + 1), 'g'), 
                                        group
                                    );
                                }
                            });
                        }
                        
                        statsCache.clichesRemoved++;
                        statsCache.totalReplacements++;
                        return replacement;
                    }
                );
            }
        });
        
        // Process phrase-based rules (exact match)
        rules.phrase.forEach(rule => {
            if (rule.action === 'remove') {
                const regex = new RegExp('\\b' + rule.match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
                processedText = processedText.replace(regex, () => {
                    statsCache.clichesRemoved++;
                    statsCache.totalReplacements++;
                    return '';
                });
            }
        });
        
        // Process word-based rules (fillers)
        const wordCounts = {};
        rules.word.forEach(rule => {
            if (rule.action === 'reduce' && typeof rule.max_count === 'number') {
                wordCounts[rule.match] = 0;
                const regex = new RegExp('\\b' + rule.match + '\\b', 'gi');
                
                processedText = processedText.replace(regex, match => {
                    wordCounts[rule.match]++;
                    if (wordCounts[rule.match] > rule.max_count) {
                        statsCache.fillersRemoved++;
                        statsCache.totalReplacements++;
                        return '';
                    }
                    return match;
                });
            }
        });
        
        // Clean up spacing
        processedText = processedText
            .replace(/\s+/g, ' ')
            .replace(/\s+([.,!?;:])/g, '$1')
            .replace(/\.\s*\./g, '.')
            .replace(/^\s*[a-z]/gm, match => match.toUpperCase())
            .trim();
        
        return processedText;
    }
    
    // Process name replacements using groups
    function processNames(text, nameGroups) {
        if (nameGroups.size === 0) return text;
        
        // Process text sentence by sentence
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
        
        const processedSentences = sentences.map(sentence => {
            const words = sentence.match(/\S+|\s+/g) || [];
            
            return words.map((word, index) => {
                if (/^\s+$/.test(word)) return word;
                
                const wordMatch = word.match(/^(\W*)([\w'-]+)(\W*)$/);
                if (!wordMatch) return word;
                
                const [, prePunct, actualWord, postPunct] = wordMatch;
                const lowerWord = actualWord.toLowerCase();
                
                const group = nameGroups.get(lowerWord);
                if (!group) return word;
                
                // Proper noun detection
                const isCapitalized = actualWord[0] === actualWord[0].toUpperCase();
                if (!isCapitalized) return word;
                
                const isStartOfSentence = index === 0 || (index === 1 && /^\s+$/.test(words[0]));
                if (isStartOfSentence) {
                    const nextWords = words.slice(index + 1, index + 4).join('');
                    const nameIndicators = /^(\s+(said|says|asked|asks|replied|replies|walked|ran|stood|sat|is|was|has|had|'s|,))/i;
                    if (!nameIndicators.test(nextWords)) return word;
                }
                
                // Get or create replacement for this name
                const cacheKey = `${group.groupName}:${lowerWord}`;
                if (!nameMapCache.has(cacheKey)) {
                    const replacements = group.replacements;
                    let newName;
                    let attempts = 0;
                    
                    do {
                        const idx = Math.floor(
                            Utilities.math.seededRandom(lowerWord + attempts + text, 0, replacements.length)
                        );
                        newName = replacements[idx];
                        attempts++;
                        if (attempts > replacements.length * 2) break;
                    } while (usedNamesCache.has(newName));
                    
                    nameMapCache.set(cacheKey, newName);
                    usedNamesCache.add(newName);
                    statsCache.namesReplaced++;
                    statsCache.totalReplacements++;
                }
                
                // Preserve capitalization
                const replacement = nameMapCache.get(cacheKey);
                let finalReplacement = replacement;
                
                if (actualWord === actualWord.toUpperCase()) {
                    finalReplacement = replacement.toUpperCase();
                } else if (actualWord[0] === actualWord[0].toUpperCase()) {
                    finalReplacement = replacement[0].toUpperCase() + replacement.slice(1);
                }
                
                return prePunct + finalReplacement + postPunct;
            }).join('');
        });
        
        return processedSentences.join('');
    }
    
    // Fix hanging punctuation
    function fixHangingPunctuation(text) {
        if (!text) return text;
        
        let processedText = text;
        let modified = false;
        
        // Count open quotes vs closed quotes
        const doubleQuoteCount = (text.match(/"/g) || []).length;
        const singleQuoteCount = (text.match(/'/g) || []).length;
        
        // Fix unclosed double quotes
        if (doubleQuoteCount % 2 !== 0) {
            // Check if last quote is opening (after any non-quote character)
            if (text.match(/[^"]\s*"[^"]*$/)) {
                // This is likely incomplete dialogue - add em-dash and close
                processedText = processedText.trimEnd() + '—"';
                modified = true;
                statsCache.hangingFixed++;
            }
        }
        
        // Fix unclosed single quotes (but be careful of contractions)
        if (singleQuoteCount % 2 !== 0) {
            // Check if it's likely dialogue (not a contraction)
            const lastSingleQuote = text.lastIndexOf("'");
            if (lastSingleQuote > 0) {
                const beforeQuote = text.substring(Math.max(0, lastSingleQuote - 10), lastSingleQuote);
                // If there's whitespace before the quote, it's likely dialogue
                if (beforeQuote.match(/\s'$/)) {
                    processedText = processedText.trimEnd() + '—\'';
                    modified = true;
                    statsCache.hangingFixed++;
                }
            }
        }
        
        // Fix unclosed parentheses
        const openParen = (text.match(/\(/g) || []).length;
        const closeParen = (text.match(/\)/g) || []).length;
        if (openParen > closeParen) {
            processedText = processedText.trimEnd() + ')';
            modified = true;
            statsCache.hangingFixed++;
        }
        
        // Fix unclosed brackets
        const openBracket = (text.match(/\[/g) || []).length;
        const closeBracket = (text.match(/\]/g) || []).length;
        if (openBracket > closeBracket) {
            processedText = processedText.trimEnd() + ']';
            modified = true;
            statsCache.hangingFixed++;
        }
        
        // Fix unclosed curly braces
        const openBrace = (text.match(/\{/g) || []).length;
        const closeBrace = (text.match(/\}/g) || []).length;
        if (openBrace > closeBrace) {
            processedText = processedText.trimEnd() + '}';
            modified = true;
            statsCache.hangingFixed++;
        }
        
        if (modified) {
            statsCache.totalReplacements++;
        }
        
        return processedText;
    }
    
    // Other processing functions remain the same
    function removeRepeatedPhrases(text, context, minPhraseLength, minOccurrences) {
        if (!context) return text;
        
        const cleanText = (str) => {
            return str
                .trim()
                .replace(/\s+/g, ' ')
                .replace(/\n+/g, ' ')
                .replace(/[""]/g, '"')
                .replace(/['']/g, "'")
                .replace(/…/g, '...');
        };
        
        const cleanedOutput = cleanText(text);
        const cleanedContext = cleanText(context);
        
        const normalizeWord = (word) => {
            return word
                .toLowerCase()
                .replace(/[0-9]/g, "")
                .replace(/[.,!?;:]+$/, "")
                .replace(/^["'`]+|["'`]+$/g, "");
        };
        
        const originalOutputWords = cleanedOutput.split(" ");
        const normalizedOutputWords = originalOutputWords.map(normalizeWord);
        const normalizedContextWords = cleanedContext.split(" ").map(normalizeWord);
        
        if (originalOutputWords.length < minPhraseLength) {
            return text;
        }
        
        const phrasesToRemove = [];
        const foundPhrases = new Set();
        const normalizedContextString = normalizedContextWords.join(" ");
        
        for (let i = 0; i <= normalizedOutputWords.length - minPhraseLength; i++) {
            if (phrasesToRemove.some(p => p.start <= i && i < p.end)) {
                continue;
            }
            
            for (let length = normalizedOutputWords.length - i; length >= minPhraseLength; length--) {
                const phraseWords = normalizedOutputWords.slice(i, i + length);
                const phraseText = phraseWords.join(" ");
                
                if (foundPhrases.has(phraseText)) {
                    continue;
                }
                
                let count = 0;
                let searchStart = 0;
                
                while (searchStart < normalizedContextString.length) {
                    const index = normalizedContextString.indexOf(phraseText, searchStart);
                    if (index === -1) break;
                    
                    const isStartBoundary = index === 0 || normalizedContextString[index - 1] === " ";
                    const endIndex = index + phraseText.length;
                    const isEndBoundary = endIndex === normalizedContextString.length || 
                                         normalizedContextString[endIndex] === " ";
                    
                    if (isStartBoundary && isEndBoundary) {
                        count++;
                        if (count >= minOccurrences) break;
                    }
                    
                    searchStart = index + 1;
                }
                
                if (count >= minOccurrences) {
                    phrasesToRemove.push({
                        start: i,
                        end: i + length,
                        length: length
                    });
                    foundPhrases.add(phraseText);
                    statsCache.phrasesRemoved++;
                    statsCache.totalReplacements++;
                    break;
                }
            }
        }
        
        if (phrasesToRemove.length === 0) return text;
        
        const resultWords = originalOutputWords.slice();
        phrasesToRemove.sort((a, b) => b.start - a.start);
        
        phrasesToRemove.forEach(phrase => {
            resultWords.splice(phrase.start, phrase.length);
        });
        
        return resultWords.join(" ").trim();
    }
    
    function separateDialogue(text) {
        // Add newline before dialogue after sentence endings
        text = text.replace(/([.!?])\s+"([^"]+)"/g, 
            '$1\n"$2"'
        );
        
        // Add newline after dialogue + attribution before new sentences
        text = text.replace(/"([^"]+)"([^.!?]*[.!?])\s+([A-Z])/g, 
            '"$1"$2\n$3'
        );
        
        return text;
    }
    
    function enforceParagraphBreaks(text) {
        if (!text || typeof text !== 'string') return '';
        
        text = text.replace(/\s*\n\s*/g, '\n');
        text = text.replace(/\n{3,}/g, '\n\n');
        text = text.replace(/\s{2,}/g, ' ');
        text = text.replace(/([.!?])\s*\n\s*([A-Z])/g, '$1\n\n$2');
        
        return text.trim();
    }
    
    function resetStats() {
        statsCache = {
            clichesRemoved: 0,
            fillersRemoved: 0,
            phrasesRemoved: 0,
            namesReplaced: 0,
            hangingFixed: 0,
            totalReplacements: 0
        };
        nameMapCache.clear();
        usedNamesCache.clear();
        usedReplacements = {};
    }
    
    // CONTEXT HOOK: Store context for repeated phrase detection
    if (hook === 'context') {
        const config = loadConfiguration();
        
        if (config.removeRepeated) {
            const recentStoryRegex = /^[\s\S]*?Recent Story:?\s*/i;
            const contextText = text.replace(recentStoryRegex, '');
            Utilities.cache.set('quality', 'context', contextText);
        }
        
        // Context hook returns nothing
        return;
    }
    
    // OUTPUT HOOK: Process text quality improvements
    if (hook === 'output') {
        try {
            resetStats();
            const config = loadConfiguration();
            let processedText = text;
            
            // Step 1: Apply text rules (clichés and fillers)
            if (config.removeCliches || config.reduceFillers) {
                try {
                    const rules = loadTextRules();
                    processedText = processTextRules(processedText, rules);
                } catch (error) {
                    if (debug) console.log('[QA] Error processing text rules:', error.message);
                }
            }
            
            // Step 2: Replace names using groups
            if (config.replaceNames) {
                try {
                    const nameGroups = loadNameGroups();
                    processedText = processNames(processedText, nameGroups);
                } catch (error) {
                    if (debug) console.log('[QA] Error processing names:', error.message);
                }
            }
            
            // Step 3: Remove repeated phrases from context
            if (config.removeRepeated) {
                try {
                    const storedContext = Utilities.cache.get('quality', 'context');
                    if (storedContext) {
                        processedText = removeRepeatedPhrases(
                            processedText, 
                            storedContext, 
                            config.minPhraseLength, 
                            config.minOccurrences
                        );
                    }
                } catch (error) {
                    if (debug) console.log('[QA] Error removing repeated phrases:', error.message);
                }
            }
            
            // Step 4: Fix hanging punctuation BEFORE dialogue separation
            if (config.fixHangingPunctuation) {
                try {
                    processedText = fixHangingPunctuation(processedText);
                } catch (error) {
                    if (debug) console.log('[QA] Error fixing hanging punctuation:', error.message);
                }
            }
            
            // Step 5: Separate dialogue
            if (config.separateDialogue) {
                try {
                    processedText = separateDialogue(processedText);
                } catch (error) {
                    if (debug) console.log('[QA] Error separating dialogue:', error.message);
                }
            }
            
            // Step 6: Enforce paragraph breaks
            if (config.enforceParagraphs) {
                try {
                    processedText = enforceParagraphBreaks(processedText);
                } catch (error) {
                    if (debug) console.log('[QA] Error enforcing paragraphs:', error.message);
                }
            }
            
            // Always ensure output ends with space
            processedText = processedText.trim() + ' ';
        
            if (debug) {
                console.log(`[QA] Stats:`, statsCache);
            }
            
            return processedText;
            
        } catch (error) {
            if (debug) console.log('[QA] Critical error in output processing:', error.message);
            // Return original text if processing fails completely
            return text;
        }
    }
    
    // Default: no processing for other hooks
    return text;
}
