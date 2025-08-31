function GiveMeHeaders(text) {
    'use strict';
    // Usage in context modifier:
    // text = GiveMeHeaders(text)
    //  
    // Place above AC for compatibility (probably idk)
    //
    // Example Story Card entries
    // Standard format (organizes within World Lore):
    // "<$## Locations><$### Academy>
    // The Academy's limestone towers..."
    //
    // With title line (for compatibility with other scripts):
    // "{title: Academy Description}
    // <$## Locations><$### Academy>
    // The Academy's limestone towers..."
    //
    // Top-level sections (creates new # sections parallel to World Lore) if you need it idk:
    // "<$# Quests>
    // Uh idk go stab something."
    //
    // Cards with the same headers will be grouped together automatically
    //
    const CONFIG_CARD_TITLE = '[HEADERS CONFIG]';
    
    // Load priority configuration from story card
    function loadPriorityConfig() {
        const configCard = Utilities.storyCard.get(CONFIG_CARD_TITLE);
        if (!configCard) {
            createDefaultConfigCard();
            // Try loading again after creation
            const newCard = Utilities.storyCard.get(CONFIG_CARD_TITLE);
            if (!newCard) return null;
            return parsePriorityConfig(newCard.entry);
        }
        return parsePriorityConfig(configCard.entry);
    }
    
    // Create default configuration card
    function createDefaultConfigCard() {
        const defaultConfig = (
            `# Header Priority Configuration\n` +
            `// Format: Priority: Header Name\n` +
            `// Lower numbers = higher priority (appear first)\n` +
            `// Negative numbers = appear BEFORE World Lore\n` +
            `// Sections not listed will appear alphabetically after listed ones\n` +
            `// Header names with spaces are supported (e.g., "Town of Beginnings")\n` +
            `\n` +
            `# Level 1 Headers\n` +
            `// Sections parallel to World Lore\n` +
            `-10: System\n` +
            `100: Custom\n` +
            `\n` +
            `## Level 2 Headers\n` +
            `// Sections within World Lore\n` +
            `10: Characters\n` +
            `20: Locations\n` +
            `30: Items\n` +
            `40: Factions\n` +
            `\n` +
            `### Level 3 Headers\n` +
            `// Subsections within Level 2 sections\n` +
            `// Add specific priorities here if needed:\n` +
            `\n` +
            `#### Level 4 Headers\n` +
            `// Sub-subsections\n` +
            `// Usually left to natural ordering\n` +
            `\n` +
            `##### Level 5 Headers\n` +
            `// Deep subsections\n` +
            `// Rarely needs priority configuration\n` +
            `\n` +
            `## Special Settings\n` +
            `uncategorized_header: General\n` +
            `uncategorized_priority: 0\n` +
            `sort_unlisted: true`
        );
        
        Utilities.storyCard.add({
            title: CONFIG_CARD_TITLE,
            entry: defaultConfig,
            description: 'Configure the priority order of header sections. Lower numbers appear first. Negative numbers appear before World Lore.'
        });
    }
    
    // Parse the priority configuration
    function parsePriorityConfig(configText) {
        const config = {
            level1: {},  // # headers
            level2: {},  // ## headers
            level3: {},  // ### headers
            level4: {},  // #### headers
            level5: {},  // ##### headers
            uncategorizedHeader: 'General',  // Default
            uncategorizedPriority: 0,
            sortUnlisted: true
        };
        
        if (!configText) return config;
        
        const lines = configText.split('\n');
        let currentLevel = null;
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            // Skip comments and empty lines
            if (!trimmed || trimmed.startsWith('//')) continue;
            
            // Detect section headers by counting # symbols at start
            if (trimmed.match(/^#{1,5}\s+Level\s+\d+\s+Headers?/i)) {
                const headerMatch = trimmed.match(/^(#{1,5})\s+Level\s+(\d+)/i);
                if (headerMatch) {
                    const levelNum = parseInt(headerMatch[2]);
                    currentLevel = `level${levelNum}`;
                }
                continue;
            }
            
            // Also check for just the header format without "Level X Headers"
            if (trimmed === '# Level 1 Headers') currentLevel = 'level1';
            else if (trimmed === '## Level 2 Headers') currentLevel = 'level2';
            else if (trimmed === '### Level 3 Headers') currentLevel = 'level3';
            else if (trimmed === '#### Level 4 Headers') currentLevel = 'level4';
            else if (trimmed === '##### Level 5 Headers') currentLevel = 'level5';
            else if (trimmed === '## Special Settings') currentLevel = 'special';
            
            // Parse priority entries - handle header names with spaces
            const priorityMatch = trimmed.match(/^(-?\d+):\s*(.+)$/);
            if (priorityMatch && currentLevel && currentLevel !== 'special') {
                const priority = parseInt(priorityMatch[1]);
                const headerName = priorityMatch[2].trim();
                // Store with lowercase key for case-insensitive matching
                config[currentLevel][headerName.toLowerCase()] = priority;
            }
            
            // Parse special settings
            if (currentLevel === 'special') {
                if (trimmed.includes('uncategorized_header:')) {
                    const match = trimmed.match(/uncategorized_header:\s*(.+)$/);
                    if (match) config.uncategorizedHeader = match[1].trim();
                }
                if (trimmed.includes('uncategorized_priority:')) {
                    const match = trimmed.match(/uncategorized_priority:\s*(\d+)/);
                    if (match) config.uncategorizedPriority = parseInt(match[1]);
                }
                if (trimmed.includes('sort_unlisted:')) {
                    const match = trimmed.match(/sort_unlisted:\s*(true|false)/);
                    if (match) config.sortUnlisted = match[1] === 'true';
                }
            }
        }
        
        return config;
    }
    
    // Get priority for a section
    function getSectionPriority(sectionData, config) {
        const levelConfig = config[`level${sectionData.level}`];
        const sectionKey = sectionData.text.toLowerCase();
        
        // Check for configured priority
        if (levelConfig && levelConfig[sectionKey] !== undefined) {
            return levelConfig[sectionKey];
        }
        
        // Check if this is the uncategorized section
        if (sectionData.text === config.uncategorizedHeader) {
            return config.uncategorizedPriority;
        }
        
        // Default priority for unlisted sections (high number = low priority)
        return 1000;
    }
    
    // Find World Lore and Recent Story sections
    const worldLoreMatch = text.match(/#?\s*World\s*Lore:\s*/i);

    if (!worldLoreMatch) {
        return text;
    }

    const memoriesMatch = text.match(/#?\s*Memories:\s*/i);
    const recentStoryMatch = text.match(/#?\s*Recent\s*Story:\s*/i);

    // Load priority configuration
    const priorityConfig = loadPriorityConfig();
    
    // Define boundaries for World Lore content
    const startIndex = worldLoreMatch.index + worldLoreMatch[0].length;
    let endIndex = text.length;
    if (recentStoryMatch && recentStoryMatch.index > startIndex) {
        endIndex = recentStoryMatch.index;
    }
    if (memoriesMatch && memoriesMatch.index > startIndex) {
        endIndex = memoriesMatch.index;
    }
    
    // Extract the World Lore content
    const worldLore = text.substring(startIndex, endIndex).trim();
    
    // Parse cards based on header delimiters
    const cards = parseWorldLoreCards(worldLore);
    
    // Organize cards by their header hierarchy
    const organized = organizeCardsByHeaders(cards);
    
    // Separate sections that should go before World Lore
    const beforeWorldLore = [];
    const inWorldLore = [];
    
    // Sort and categorize sections based on priority
    const sortedSections = sortSectionsByPriority(organized, priorityConfig);
    
    for (const section of sortedSections) {
        if (section.priority < 0) {
            beforeWorldLore.push(section);
        } else {
            inWorldLore.push(section);
        }
    }
    
    // Build content
    let result = '';
    
    // Add content before World Lore
    if (beforeWorldLore.length > 0) {
        const beforeContent = beforeWorldLore.map(s => buildSection(s)).join('\n\n');
        result = text.substring(0, worldLoreMatch.index) + beforeContent + '\n\n';
    } else {
        result = text.substring(0, startIndex);
    }
    
    // Add World Lore header and content
    result += '# World Lore:\n';
    
    // Add uncategorized content
    if (organized.uncategorized.length > 0) {
        result += `## ${priorityConfig.uncategorizedHeader}\n${organized.uncategorized.join('\n\n')}\n\n`;
    }
    
    // Add organized sections within World Lore
    if (inWorldLore.length > 0) {
        result += inWorldLore.map(s => buildSection(s)).join('\n\n');
    }
    
    // Add content after World Lore
    const afterLore = text.substring(endIndex);
    if (afterLore) {
        result += '\n\n' + afterLore.trimStart();
    }
    
    // Ensure Recent Story has # if present
    if (!result.match(/#\s*Recent\s*Story:/i)) {
        result = result.replace(/Recent\s*Story:/i, '# Recent Story:');
    }
    
    return result;
    
    // Sort sections by priority configuration
    function sortSectionsByPriority(organized, config) {
        const sections = [];
        
        // Convert sections object to array with priority
        for (const key in organized.sections) {
            const section = organized.sections[key];
            section.priority = getSectionPriority(section, config);
            sections.push(section);
        }
        
        // Sort by priority (lower number = higher priority)
        sections.sort((a, b) => {
            const priorityDiff = a.priority - b.priority;
            if (priorityDiff !== 0) return priorityDiff;
            
            // If same priority and sortUnlisted is true, sort alphabetically
            if (config.sortUnlisted) {
                return a.text.localeCompare(b.text);
            }
            
            return 0;
        });
        
        // Recursively sort subsections
        for (const section of sections) {
            if (Object.keys(section.subsections).length > 0) {
                section.sortedSubsections = sortSubsections(section.subsections, config);
            }
        }
        
        return sections;
    }
    
    // Sort subsections
    function sortSubsections(subsections, config) {
        const sorted = [];
        
        for (const key in subsections) {
            const subsection = subsections[key];
            subsection.priority = getSectionPriority(subsection, config);
            sorted.push(subsection);
        }
        
        sorted.sort((a, b) => {
            const priorityDiff = a.priority - b.priority;
            if (priorityDiff !== 0) return priorityDiff;
            
            if (config.sortUnlisted) {
                return a.text.localeCompare(b.text);
            }
            
            return 0;
        });
        
        // Recursively sort deeper subsections
        for (const subsection of sorted) {
            if (Object.keys(subsection.subsections).length > 0) {
                subsection.sortedSubsections = sortSubsections(subsection.subsections, config);
            }
        }
        
        return sorted;
    }
    
    // Parse World Lore into cards based on header delimiters
    function parseWorldLoreCards(worldLore) {
        const cards = [];
        
        // Split by double newlines to get individual chunks
        const chunks = worldLore.split(/\n\n/).filter(chunk => {
            const trimmed = chunk.trim();
            // Filter out empty chunks and standalone # characters
            return trimmed && trimmed !== '#';
        });
        
        for (const chunk of chunks) {
            const lines = chunk.split('\n');
            let headerLineIndex = 0;
            let content = chunk;
            
            // Check if first line is a {title:...} format
            if (lines[0] && lines[0].trim().match(/^\{title:[^}]+\}$/)) {
                // Skip the title line and check the next line for headers
                headerLineIndex = 1;
            }
            
            // Get the line that should contain header delimiters
            const headerLine = lines[headerLineIndex] ? lines[headerLineIndex].trim() : '';
            
            // Parse headers from the delimiter line
            const headerPath = [];  // Array of {level, text} objects
            
            if (headerLine.includes('<$')) {
                // Extract all headers matching any number of # symbols
                const headerPattern = /<\$(#{1,})\s*([^>]+)>/g;
                let match;
                
                while ((match = headerPattern.exec(headerLine)) !== null) {
                    const level = match[1].length;  // # = 1, ## = 2, ### = 3, etc.
                    const headerText = match[2].trim();
                    headerPath.push({ level, text: headerText });
                }
                
                // Sort by level to ensure proper hierarchy
                headerPath.sort((a, b) => a.level - b.level);
                
                // Content is everything after the header delimiter line
                content = lines.slice(headerLineIndex + 1).join('\n').trim();
            }
            
            // Only add if there's actual content
            if (content) {
                cards.push({
                    headerPath: headerPath,
                    content: content
                });
            }
        }
        
        return cards;
    }
    
    // Organize cards by their header hierarchy
    function organizeCardsByHeaders(cards) {
        const organized = {
            uncategorized: [],
            sections: {}  // Will store hierarchical structure with level info
        };
        
        for (const card of cards) {
            if (card.headerPath.length === 0) {
                // No headers, add to uncategorized
                organized.uncategorized.push(card.content);
            } else {
                // Build the hierarchical path
                let current = organized.sections;
                
                for (let i = 0; i < card.headerPath.length; i++) {
                    const { level, text } = card.headerPath[i];
                    const key = `${level}:${text}`;  // Include level in the key
                    
                    if (!current[key]) {
                        current[key] = {
                            level: level,
                            text: text,
                            content: [],
                            subsections: {}
                        };
                    }
                    
                    // If this is the last header in path, add content here
                    if (i === card.headerPath.length - 1) {
                        current[key].content.push(card.content);
                    } else {
                        // Navigate deeper
                        current = current[key].subsections;
                    }
                }
            }
        }
        return organized;
    }
    
    // Build section with sorted subsections
    function buildSection(sectionData) {
        let sectionText = '';
        
        // Add header
        sectionText = '#'.repeat(sectionData.level) + ' ' + sectionData.text;
        
        // Track if we have content
        const hasContent = sectionData.content.length > 0;
        
        // Add content (single newline after header if content exists)
        if (hasContent) {
            sectionText += '\n' + sectionData.content.join('\n\n');
        }
        
        // Add sorted subsections if they exist
        if (sectionData.sortedSubsections && sectionData.sortedSubsections.length > 0) {
            for (let i = 0; i < sectionData.sortedSubsections.length; i++) {
                const subsection = sectionData.sortedSubsections[i];
                
                // First subsection: single newline if no content, double if there is content
                // Subsequent subsections: always double newline
                const spacing = (i === 0 && !hasContent) ? '\n' : '\n\n';
                sectionText += spacing + buildSection(subsection);
            }
        }
        // Fallback to original subsections if not sorted
        else if (Object.keys(sectionData.subsections).length > 0) {
            const sortedKeys = Object.keys(sectionData.subsections).sort();
            
            for (let i = 0; i < sortedKeys.length; i++) {
                const key = sortedKeys[i];
                const subsection = sectionData.subsections[key];
                
                const spacing = (i === 0 && !hasContent) ? '\n' : '\n\n';
                sectionText += spacing + buildSection(subsection);
            }
        }
        
        return sectionText;
    }
}
