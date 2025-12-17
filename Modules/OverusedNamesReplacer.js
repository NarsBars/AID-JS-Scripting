function replaceOverusedNames(text) {
    // Header text constant
    const headerText = "# Overused Names Configuration\n" +
        "# Usage: Add names separated by commas under each category\n" +
        "# You can add custom categories: {ANYTHING OVERUSED:} paired with {ANYTHING REPLACER:}\n" +
        "# Categories may also be placed within the description";
    
    // Helper function from LewdLeah
    function buildCard(title = "", entry = "", type = "character", keys = title, description = "", insertionIndex = 0) {
        if (![type, title, keys, entry, description].every(arg => (typeof arg === "string"))) {
            throw new Error("buildCard must be called with strings for title, entry, type, keys, and description");
        } else if (!Number.isInteger(insertionIndex)) {
            throw new Error("buildCard must be called with an integer for insertionIndex");
        } else {
            insertionIndex = Math.min(Math.max(0, insertionIndex), storyCards.length);
        }
        addStoryCard("%@%");
        for (const [index, card] of storyCards.entries()) {
            if (card.title !== "%@%") {
                continue;
            }
            card.type = type;
            card.title = title;
            card.keys = keys;
            card.entry = entry;
            card.description = description;
            if (index !== insertionIndex) {
                // Remove from the current position and reinsert at the desired index
                storyCards.splice(index, 1);
                storyCards.splice(insertionIndex, 0, card);
            }
            return Object.seal(card);
        }
        throw new Error("An unexpected error occurred with buildCard");
    }
    
    // find the config card
    const configCard = storyCards.find(card => card.title === "[CONFIG] Overused Names Replacer");
    
    if (!configCard) {
        // create default config card if doesn't exist
        const configEntry = headerText + "\n\n" +
            "{FEMALE OVERUSED:}\n" +
            "Chen, Elara, Lira\n\n" +
            "{FEMALE REPLACER:}\n" +
            "Aria, Phoebe, Sophie, Sakura, Morgana, Kiara, Olivia, Scarlett, Amanda, Taani, Ivy, Sylvie, Amber, Evie, Suri, Laura\n\n" +
            "{MALE OVERUSED:}\n" +
            "Marcus, Karos, Thorne\n\n" +
            "{MALE REPLACER:}\n" +
            "Dante, Gideon, Milo, Oscar, Zane, Karim, Ezra, Cassian, Darius, Anton, Lucien, Emir, Caleb, Ivar, Jace";
        
        buildCard(
            "[CONFIG] Overused Names Replacer",
            configEntry,
            "CONFIG",
            "",
            "",
            storyCards.length
        );
        
        return text;
    }
    
    function parseConfigFromText(textContent) {
        if (!textContent) return new Map();
        
        const lines = textContent.split('\n');
        const categories = new Map();
        
        let currentCategory = null;
        let currentType = null;
        
        lines.forEach(line => {
            // check for categories
            const headerMatch = line.match(/\{(.+?)\s+(OVERUSED|REPLACER):\}/);
            if (headerMatch) {
                currentCategory = headerMatch[1];
                currentType = headerMatch[2].toLowerCase();
                
                if (!categories.has(currentCategory)) {
                    categories.set(currentCategory, {
                        overused: [],
                        replacer: []
                    });
                }
            }
            // Parse names from the current section
            else if (currentCategory && currentType && line.trim() && !line.startsWith('#')) {
                const names = line.split(',').map(n => n.trim()).filter(n => n);
                categories.get(currentCategory)[currentType].push(...names);
            }
        });
        
        return categories;
    }
    
    function mergeCategories(categories1, categories2) {
        const merged = new Map(categories1);
        
        categories2.forEach((category, name) => {
            if (!merged.has(name)) {
                merged.set(name, {
                    overused: [...category.overused],
                    replacer: [...category.replacer]
                });
            } else {
                // Merge arrays and remove duplicates
                const existing = merged.get(name);
                existing.overused = [...new Set([...existing.overused, ...category.overused])];
                existing.replacer = [...new Set([...existing.replacer, ...category.replacer])];
            }
        });
        
        return merged;
    }
    
    // check if config header is present and add if needed
    function repairConfigIfNeeded(configCard, categories) {
        if (!configCard.entry.startsWith("# Overused Names Configuration")) {
            // Rebuild the entry with header at top
            let repairedEntry = headerText + "\n\n";
            
            // Add existing entry categories
            const entryCategories = parseConfigFromText(configCard.entry);
            entryCategories.forEach((category, name) => {
                if (category.overused.length > 0 || category.replacer.length > 0) {
                    repairedEntry += "{" + name + " OVERUSED:}\n" + 
                        category.overused.join(', ') + "\n\n{" + name + " REPLACER:}\n" + 
                        category.replacer.join(', ') + "\n\n";
                }
            });
            
            // Remove trailing newlines
            configCard.entry = repairedEntry.trim();
        }
        
        return categories;
    }
    
    // parse config
    const entryCategories = parseConfigFromText(configCard.entry);
    const descriptionCategories = parseConfigFromText(configCard.description);
    
    // merge categories
    let categories = mergeCategories(entryCategories, descriptionCategories);
    
    // repair header if missing
    categories = repairConfigIfNeeded(configCard, categories);
    
    if (categories.size === 0) {
        return text; // return unchanged if no categories
    }
    
    // map all overused names to their replacement pool
    const overusedNameToPool = new Map();
    
    // Process each category
    categories.forEach((category, categoryName) => {
        if (category.overused.length > 0 && category.replacer.length > 0) {
            category.overused.forEach(name => 
                overusedNameToPool.set(name.toLowerCase(), category.replacer)
            );
        }
    });
    
    // if nothing to replace, return
    if (overusedNameToPool.size === 0) return text;
    
    // Shuffle helper
    function shuffle(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }
    
    // Name generator that returns unique names
    function createNameGenerator(nameList) {
        let shuffledList = shuffle(nameList);
        let index = 0;
        
        return () => {
            if (index >= shuffledList.length) {
                shuffledList = shuffle(nameList);
                index = 0;
            }
            return shuffledList[index++];
        };
    }
    
    // Track replacements for consistency
    const usedNames = new Set();
    const nameMap = new Map();
    const nameGenerators = new Map();
    
    // Create pattern from all overused names
    const overusedNames = Array.from(overusedNameToPool.keys());
    const pattern = new RegExp(
        "\\b(" + overusedNames.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join("|") + ")\\b", 
        "gi"
    );
    
    // Replace names consistently throughout the text
    const newText = text.replace(pattern, function(match) {
        const lowerMatch = match.toLowerCase();
        
        // Check if we've already mapped this name
        if (!nameMap.has(lowerMatch)) {
            const replacementPool = overusedNameToPool.get(lowerMatch);
            
            // Get or create generator for this pool
            const poolKey = replacementPool.join(',');
            if (!nameGenerators.has(poolKey)) {
                nameGenerators.set(poolKey, createNameGenerator(replacementPool));
            }
            const getName = nameGenerators.get(poolKey);
            
            // Get a unique replacement name
            let newName;
            let attempts = 0;
            do {
                newName = getName();
                attempts++;
                // Prevent infinite loop if all names are used
                if (attempts > replacementPool.length * 2) {
                    newName = replacementPool[Math.floor(Math.random() * replacementPool.length)];
                    break;
                }
            } while (usedNames.has(newName));
            
            nameMap.set(lowerMatch, newName);
            usedNames.add(newName);
        }
        
        // Preserve original capitalization style
        const replacement = nameMap.get(lowerMatch);
        if (match === match.toUpperCase()) {
            return replacement.toUpperCase();
        } else if (match === match.toLowerCase()) {
            return replacement.toLowerCase();
        } else if (match[0] === match[0].toUpperCase()) {
            return replacement[0].toUpperCase() + replacement.slice(1);
        }
        return replacement;
    });
    
    return newText;
}