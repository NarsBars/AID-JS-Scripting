/**
 * XML Context Builder for SANE
 *
 * Replaces SortHeader.js - takes jumbled Story Card entries and organizes
 * them into a properly nested XML hierarchy for LLM context.
 *
 * Handles three types of content:
 * 1. Hint-marked XML: <$characters><character>...</character></$characters>
 * 2. Hint-marked prose: <$lore><$currency id="x">text</$currency></$lore>
 * 3. Pure prose: No markers, double-line-break separated (legacy support)
 *
 * Usage in context modifier:
 *   text = BuildXmlContext(text);
 */

function BuildXmlContext(text) {
    'use strict';

    const CONFIG_CARD_TITLE = '[XML CONTEXT CONFIG]';

    // ========================================
    // Configuration Loading
    // ========================================

    function loadConfig() {
        const configCard = typeof Utilities !== 'undefined'
            ? Utilities.storyCard.get(CONFIG_CARD_TITLE)
            : null;

        if (!configCard) {
            createDefaultConfigCard();
            const newCard = typeof Utilities !== 'undefined'
                ? Utilities.storyCard.get(CONFIG_CARD_TITLE)
                : null;
            if (!newCard) return getDefaultConfig();
            return parseConfig(newCard.entry);
        }
        return parseConfig(configCard.entry);
    }

    function getDefaultConfig() {
        return {
            priorities: {                   // Top-level section priorities
                scene: -10, characters: 10, locations: 20, items: 30, factions: 40, lore: 50, quests: 60
            },
            nestedPriorities: {             // "parent.child" or "parent.child.grandchild"
                'lore.currency': 10, 'lore.crime': 20, 'lore.currency.basics': 1, 'lore.currency.trading': 2
            },
            rootElement: 'world', uncategorizedElement: 'general', uncategorizedPriority: 100,
            sortUnlisted: true, addComments: false, commentMinDepth: 2
        };
    }

    function createDefaultConfigCard() {
        if (typeof Utilities === 'undefined') return;

        const defaultConfig = '# XML Context Configuration\n' +
            '// Priority determines order (lower = first, negative = before root)\n\n' +
            '## Section Priorities\n' +
            'scene: -10\ncharacters: 10\nlocations: 20\nitems: 30\nfactions: 40\nlore: 50\nquests: 60\n\n' +
            '## Nested Priorities\n' +
            '// Format: parent.child: priority\n// Example: characters.player: 1\n// Example: lore.currency: 10\n\n' +
            '## Settings\n' +
            'root_element: world\nuncategorized_element: general\nuncategorized_priority: 100\n' +
            'sort_unlisted: true\nadd_comments: false\ncomment_min_depth: 2';

        Utilities.storyCard.add({
            title: CONFIG_CARD_TITLE,
            entry: defaultConfig,
            description: 'Configure XML context hierarchy and ordering.'
        });
    }

    function parseConfig(configText) {
        const config = getDefaultConfig();
        if (!configText) return config;

        const lines = configText.split('\n');
        let currentSection = null; // 'priorities', 'nested', 'settings'

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('//')) continue;

            // Detect section headers
            if (trimmed === '## Section Priorities') {
                currentSection = 'priorities';
                continue;
            }
            if (trimmed === '## Nested Priorities') {
                currentSection = 'nested';
                continue;
            }
            if (trimmed === '## Settings') {
                currentSection = 'settings';
                continue;
            }
            if (trimmed.startsWith('#')) {
                currentSection = null;
                continue;
            }

            const match = trimmed.match(/^([^:]+):\s*(.+)$/);
            if (!match) continue;

            const key = match[1].trim().toLowerCase();
            const value = match[2].trim();

            if (currentSection === 'priorities') {
                config.priorities[key] = parseInt(value) || 0;
            } else if (currentSection === 'nested') {
                // Nested priorities use dot notation: "parent.child: priority"
                config.nestedPriorities[key] = parseInt(value) || 0;
            } else if (currentSection === 'settings') {
                switch (key) {
                    case 'root_element':
                        config.rootElement = value;
                        break;
                    case 'uncategorized_element':
                        config.uncategorizedElement = value;
                        break;
                    case 'uncategorized_priority':
                        config.uncategorizedPriority = parseInt(value) || 100;
                        break;
                    case 'sort_unlisted':
                        config.sortUnlisted = value === 'true';
                        break;
                    case 'add_comments':
                        config.addComments = value === 'true';
                        break;
                    case 'comment_min_depth':
                        config.commentMinDepth = parseInt(value) || 2;
                        break;
                }
            }
        }

        return config;
    }

    // ========================================
    // XML Utilities
    // ========================================

    function escapeXml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function escapeAttribute(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function toValidTagName(name) {
        if (!name || typeof name !== 'string') return '_invalid';
        let tag = name.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
        if (/^[0-9\-\.]/.test(tag)) {
            tag = '_' + tag;
        }
        return tag.replace(/_+/g, '_') || '_empty';
    }

    // ========================================
    // Hint Marker Parser
    // ========================================

    /**
     * Parse hint markers from text
     * Returns array of { path: [...], id: string|null, attributes: {}, content: string, isXml: boolean }
     */
    function parseHintMarkers(text) {
        const results = [];
        let remaining = text;

        // Pattern to match hint-marked sections
        // <$tag> or <$tag id="x" attr="y"> ... </$tag>
        const markerPattern = /<\$([a-zA-Z_][a-zA-Z0-9_\-]*)([^>]*)>([\s\S]*?)<\/\$\1>/g;

        let match;
        let lastIndex = 0;
        const unmarkedChunks = [];

        // First pass: extract all top-level hint-marked sections
        while ((match = markerPattern.exec(text)) !== null) {
            // Capture any unmarked text before this match
            if (match.index > lastIndex) {
                const unmarked = text.substring(lastIndex, match.index).trim();
                if (unmarked) {
                    unmarkedChunks.push(unmarked);
                }
            }
            lastIndex = match.index + match[0].length;

            const tagName = match[1];
            const attrString = match[2].trim();
            const innerContent = match[3];

            // Parse attributes from the opening tag
            const attributes = parseAttributes(attrString);
            const id = attributes.id || null;
            delete attributes.id; // id is handled separately

            // Recursively parse nested hint markers
            const parsed = parseNestedHints(tagName, innerContent, attributes, id);
            results.push(...parsed);
        }

        // Capture any remaining unmarked text
        if (lastIndex < text.length) {
            const unmarked = text.substring(lastIndex).trim();
            if (unmarked) {
                unmarkedChunks.push(unmarked);
            }
        }

        // Parse unmarked chunks as pure prose
        for (const chunk of unmarkedChunks) {
            const proseItems = parsePureProse(chunk);
            results.push(...proseItems);
        }

        return results;
    }

    /**
     * Parse nested hint markers recursively
     */
    function parseNestedHints(parentTag, content, parentAttrs, parentId) {
        const results = [];

        // Check for nested hint markers
        const nestedPattern = /<\$([a-zA-Z_][a-zA-Z0-9_\-]*)([^>]*)>([\s\S]*?)<\/\$\1>/g;
        let match;
        let lastIndex = 0;
        let hasNested = false;
        const directContent = [];

        while ((match = nestedPattern.exec(content)) !== null) {
            hasNested = true;

            // Capture content before nested marker
            if (match.index > lastIndex) {
                const before = content.substring(lastIndex, match.index).trim();
                if (before) {
                    directContent.push(before);
                }
            }
            lastIndex = match.index + match[0].length;

            const tagName = match[1];
            const attrString = match[2].trim();
            const innerContent = match[3];

            const attributes = parseAttributes(attrString);
            const id = attributes.id || null;
            delete attributes.id;

            // Recurse with extended path
            const nested = parseNestedHints(tagName, innerContent, attributes, id);
            for (const item of nested) {
                item.path = [parentTag, ...item.path];
                results.push(item);
            }
        }

        // Capture remaining content after last nested marker
        if (lastIndex < content.length) {
            const after = content.substring(lastIndex).trim();
            if (after) {
                directContent.push(after);
            }
        }

        // If no nested markers, or there's direct content at this level
        if (!hasNested || directContent.length > 0) {
            const finalContent = hasNested ? directContent.join('\n') : content.trim();
            if (finalContent) {
                const isXml = finalContent.trimStart().startsWith('<') &&
                              !finalContent.trimStart().startsWith('<$');

                results.push({
                    path: [parentTag],
                    id: parentId,
                    attributes: parentAttrs,
                    content: finalContent,
                    isXml: isXml
                });
            }
        }

        return results;
    }

    /**
     * Parse attributes from a tag's attribute string
     */
    function parseAttributes(attrString) {
        const attrs = {};
        if (!attrString) return attrs;

        // Match key="value" or key='value' patterns
        const attrPattern = /([a-zA-Z_][a-zA-Z0-9_\-]*)\s*=\s*["']([^"']*)["']/g;
        let match;
        while ((match = attrPattern.exec(attrString)) !== null) {
            attrs[match[1]] = match[2];
        }
        return attrs;
    }

    /**
     * Parse pure prose content (no hint markers)
     * Uses double-line-break separation like legacy SortHeader
     */
    function parsePureProse(text) {
        const results = [];
        const chunks = text.split(/\n\n+/).filter(c => c.trim());

        for (const chunk of chunks) {
            const trimmed = chunk.trim();
            if (!trimmed) continue;

            results.push({
                path: [],  // No path = uncategorized
                id: null,
                attributes: {},
                content: trimmed,
                isXml: false
            });
        }

        return results;
    }

    // ========================================
    // Hierarchy Builder
    // ========================================

    /**
     * Build a hierarchical tree from parsed items
     */
    function buildHierarchy(items, config) {
        const root = {
            tag: config.rootElement,
            children: {},      // Named child elements
            content: [],       // Direct content at this level
            attributes: {},
            priority: 0
        };

        for (const item of items) {
            if (item.path.length === 0) {
                // Uncategorized content
                insertAtPath(root, [config.uncategorizedElement], item, config);
            } else {
                insertAtPath(root, item.path, item, config);
            }
        }

        return root;
    }

    /**
     * Insert an item at a specific path in the hierarchy
     */
    /**
     * Get priority for an element at a given path
     * Checks nested priorities first (e.g., "characters.player"),
     * then falls back to top-level (e.g., "characters")
     */
    function getPriority(pathSegments, config) {
        // Build the full dot-notation path and check from most specific to least
        // e.g., for ["characters", "player", "main"], check:
        //   1. "characters.player.main"
        //   2. "characters.player"
        //   3. "characters"
        for (let i = pathSegments.length; i > 0; i--) {
            const partialPath = pathSegments.slice(0, i).join('.').toLowerCase();

            // Check nested priorities first
            if (config.nestedPriorities[partialPath] !== undefined) {
                return config.nestedPriorities[partialPath];
            }

            // For single segment, also check top-level priorities
            if (i === 1 && config.priorities[partialPath] !== undefined) {
                return config.priorities[partialPath];
            }
        }

        return config.uncategorizedPriority;
    }

    /**
     * Insert an item at a specific path in the hierarchy
     */
    function insertAtPath(root, path, item, config) {
        let current = root;
        const builtPath = [];

        for (let i = 0; i < path.length; i++) {
            const segment = path[i];
            const tagName = toValidTagName(segment);
            builtPath.push(segment);

            if (!current.children[tagName]) {
                current.children[tagName] = {
                    tag: tagName,
                    children: {},
                    content: [],
                    attributes: {},
                    priority: getPriority(builtPath, config)
                };
            }

            current = current.children[tagName];
        }

        // At the final path location, add the content
        if (item.id) {
            // Content with an ID becomes a named child element
            const idTag = toValidTagName(item.id);
            const idPath = [...builtPath, item.id];

            if (!current.children[idTag]) {
                current.children[idTag] = {
                    tag: idTag,
                    children: {},
                    content: [],
                    attributes: item.attributes,
                    priority: getPriority(idPath, config)
                };
            }
            current.children[idTag].content.push({
                text: item.content,
                isXml: item.isXml
            });
        } else {
            // Content without ID is direct content of the element
            current.content.push({
                text: item.content,
                isXml: item.isXml
            });
        }
    }

    // ========================================
    // XML Serializer
    // ========================================

    /**
     * Serialize hierarchy to XML string with guaranteed proper nesting
     */
    function serializeToXml(node, config, depth = 0) {
        const indent = '  '.repeat(depth);
        const innerIndent = '  '.repeat(depth + 1);

        // Sort children by priority, then alphabetically
        const sortedChildren = Object.values(node.children).sort((a, b) => {
            const priorityDiff = a.priority - b.priority;
            if (priorityDiff !== 0) return priorityDiff;
            if (config.sortUnlisted) {
                return a.tag.localeCompare(b.tag);
            }
            return 0;
        });

        // Build attribute string
        const attrs = Object.entries(node.attributes || {})
            .map(([k, v]) => `${toValidTagName(k)}="${escapeAttribute(v)}"`)
            .join(' ');
        const attrStr = attrs ? ' ' + attrs : '';

        // Check if we have any content
        const hasContent = node.content.length > 0;
        const hasChildren = sortedChildren.length > 0;

        // Empty element
        if (!hasContent && !hasChildren) {
            return `${indent}<${node.tag}${attrStr}/>`;
        }

        // Build opening tag
        let result = `${indent}<${node.tag}${attrStr}>`;

        // Add optional hierarchy comment
        if (config.addComments && depth >= config.commentMinDepth) {
            result += ` <!-- depth: ${depth} -->`;
        }

        result += '\n';

        // Add direct content
        for (const contentItem of node.content) {
            if (contentItem.isXml) {
                // XML content - indent each line and insert directly
                const indentedXml = contentItem.text
                    .split('\n')
                    .map(line => innerIndent + line)
                    .join('\n');
                result += indentedXml + '\n';
            } else {
                // Prose content - escape and wrap if needed
                const escaped = escapeXml(contentItem.text);
                result += innerIndent + escaped + '\n';
            }
        }

        // Add children recursively
        for (const child of sortedChildren) {
            result += serializeToXml(child, config, depth + 1) + '\n';
        }

        // Closing tag
        result += `${indent}</${node.tag}>`;

        return result;
    }

    // ========================================
    // Main Processing
    // ========================================

    // Find World Lore section boundaries (for compatibility)
    const worldLoreMatch = text.match(/#?\s*World\s*Lore:\s*/i);

    if (!worldLoreMatch) {
        // No World Lore section, return unchanged
        return text;
    }

    const memoriesMatch = text.match(/#?\s*Memories:\s*/i);
    const recentStoryMatch = text.match(/#?\s*Recent\s*Story:\s*/i);

    // Load configuration
    const config = loadConfig();

    // Define boundaries
    const startIndex = worldLoreMatch.index + worldLoreMatch[0].length;
    let endIndex = text.length;

    if (recentStoryMatch && recentStoryMatch.index > startIndex) {
        endIndex = recentStoryMatch.index;
    }
    if (memoriesMatch && memoriesMatch.index > startIndex && memoriesMatch.index < endIndex) {
        endIndex = memoriesMatch.index;
    }

    // Extract content to process
    const worldLoreContent = text.substring(startIndex, endIndex).trim();

    // Parse hint markers and prose
    const parsedItems = parseHintMarkers(worldLoreContent);

    // Build hierarchy
    const hierarchy = buildHierarchy(parsedItems, config);

    // Separate items that should appear before the root element
    const beforeRoot = [];
    const inRoot = [];

    for (const [key, child] of Object.entries(hierarchy.children)) {
        if (child.priority < 0) {
            beforeRoot.push(child);
        } else {
            inRoot.push(child);
        }
    }

    // Sort each group
    beforeRoot.sort((a, b) => a.priority - b.priority);
    inRoot.sort((a, b) => {
        const priorityDiff = a.priority - b.priority;
        if (priorityDiff !== 0) return priorityDiff;
        return config.sortUnlisted ? a.tag.localeCompare(b.tag) : 0;
    });

    // Build result
    let result = text.substring(0, worldLoreMatch.index);

    // Add sections that come before root
    for (const section of beforeRoot) {
        result += serializeToXml(section, config, 0) + '\n\n';
    }

    // Build root element with remaining children
    const rootForOutput = {
        tag: config.rootElement,
        children: {},
        content: hierarchy.content,
        attributes: {},
        priority: 0
    };

    for (const child of inRoot) {
        rootForOutput.children[child.tag] = child;
    }

    // Only add root if there's content
    if (inRoot.length > 0 || hierarchy.content.length > 0) {
        result += serializeToXml(rootForOutput, config, 0);
    }

    // Add content after World Lore
    const afterLore = text.substring(endIndex);
    if (afterLore.trim()) {
        result += '\n\n' + afterLore.trimStart();
    }

    return result;
}

// Export for use in SANE
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BuildXmlContext };
}
