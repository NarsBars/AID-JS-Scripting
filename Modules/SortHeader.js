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
    const UNCATEGORIZED_HEADER = 'General'; // Can be changed to 'Miscellaneous', 'Other', etc.
    
    // Find World Lore and Recent Story sections
    const worldLoreMatch = text.match(/#?\s*World\s*Lore:\s*/i);

    if (!worldLoreMatch) {
        return text;
    }

    const memoriesMatch = text.match(/#?\s*Memories:\s*/i);
    // Find the next section after World Lore
    const recentStoryMatch = text.match(/#?\s*Recent\s*Story:\s*/i);

    
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
    
    // Build the reorganized World Lore content
    const organizedLore = buildOrganizedWorldLore(organized);
    
    // Reconstruct the full text with organized World Lore
    const beforeLore = text.substring(0, startIndex);
    const afterLore = text.substring(endIndex);
    
    // Ensure clean spacing and reconstruct
    let result = beforeLore.trimEnd() + '\n' + organizedLore + (afterLore ? '\n\n' + afterLore.trimStart() : '');
    
    // Add # to World Lore: and Recent Story:
    if (!result.match(/#\s*World\s*Lore:/i)) {
        result = result.replace(/World\s*Lore:/i, '# World Lore:');
    }
    if (!result.match(/#\s*Recent\s*Story:/i)) {
        result = result.replace(/Recent\s*Story:/i, '# Recent Story:');
    }
    
    return result;
    
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
                // Extract all headers  matching any number of # symbols
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
    
    // Build the reorganized World Lore content
    function buildOrganizedWorldLore(organized) {
        const sections = [];
        
        // Add uncategorized cards under General header (if any)
        if (organized.uncategorized.length > 0) {
            const generalSection = `## ${UNCATEGORIZED_HEADER}\n${organized.uncategorized.join('\n\n')}`;
            sections.push(generalSection);
        }
        
        // Recursively build sections
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
            
            // Add subsections
            if (Object.keys(sectionData.subsections).length > 0) {
                const sortedKeys = Object.keys(sectionData.subsections).sort();
                
                for (let i = 0; i < sortedKeys.length; i++) {
                    const key = sortedKeys[i];
                    const subsection = sectionData.subsections[key];
                    
                    // First subsection: single newline if no content, double if there is content
                    // Subsequent subsections: always double newline
                    const spacing = (i === 0 && !hasContent) ? '\n' : '\n\n';
                    sectionText += spacing + buildSection(subsection);
                }
            }
            
            return sectionText;
        }
        
        // Build all root sections
        const sortedRootKeys = Object.keys(organized.sections).sort();
        for (const key of sortedRootKeys) {
            const section = organized.sections[key];
            sections.push(buildSection(section));
        }
        
        // Join major sections with double newlines
        return sections.join('\n\n');
    }
}
