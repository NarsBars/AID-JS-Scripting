/**
 * JSON Context Builder for SANE
 *
 * Alternative to XmlContextBuilder - outputs JSON instead of XML for LLM context.
 * Used to compare comprehension efficiency between formats.
 *
 * Handles three types of content:
 * 1. Hint-marked JSON: <$characters>{"id": "Diavel", ...}</$characters>
 * 2. Hint-marked prose: <$lore><$currency id="x">text</$currency></$lore>
 * 3. Pure prose: No markers, double-line-break separated (legacy support)
 *
 * Usage in context modifier:
 *   text = BuildJsonContext(text);
 */

function BuildJsonContext(text) {
    'use strict';

    const CONFIG_CARD_TITLE = '[JSON CONTEXT CONFIG]';

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
            rootKey: 'world', uncategorizedKey: 'general', uncategorizedPriority: 100,
            sortUnlisted: true, prettyPrint: true, indentSize: 2
        };
    }

    function createDefaultConfigCard() {
        if (typeof Utilities === 'undefined') return;

        const defaultConfig = '# JSON Context Configuration\n' +
            '// Priority determines order (lower = first, negative = before root)\n\n' +
            '## Section Priorities\n' +
            'scene: -10\ncharacters: 10\nlocations: 20\nitems: 30\nfactions: 40\nlore: 50\nquests: 60\n\n' +
            '## Nested Priorities\n' +
            '// Format: parent.child: priority\n// Example: characters.player: 1\n// Example: lore.currency: 10\n\n' +
            '## Settings\n' +
            'root_key: world\nuncategorized_key: general\nuncategorized_priority: 100\n' +
            'sort_unlisted: true\npretty_print: true\nindent_size: 2';

        Utilities.storyCard.add({
            title: CONFIG_CARD_TITLE,
            entry: defaultConfig,
            description: 'Configure JSON context hierarchy and ordering.'
        });
    }

    function parseConfig(configText) {
        const config = getDefaultConfig();
        if (!configText) return config;

        const lines = configText.split('\n');
        let currentSection = null;

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('//')) continue;

            if (trimmed === '## Section Priorities') { currentSection = 'priorities'; continue; }
            if (trimmed === '## Nested Priorities') { currentSection = 'nested'; continue; }
            if (trimmed === '## Settings') { currentSection = 'settings'; continue; }
            if (trimmed.startsWith('#')) { currentSection = null; continue; }

            const match = trimmed.match(/^([^:]+):\s*(.+)$/);
            if (!match) continue;

            const key = match[1].trim().toLowerCase();
            const value = match[2].trim();

            if (currentSection === 'priorities') {
                config.priorities[key] = parseInt(value) || 0;
            } else if (currentSection === 'nested') {
                config.nestedPriorities[key] = parseInt(value) || 0;
            } else if (currentSection === 'settings') {
                switch (key) {
                    case 'root_key': config.rootKey = value; break;
                    case 'uncategorized_key': config.uncategorizedKey = value; break;
                    case 'uncategorized_priority': config.uncategorizedPriority = parseInt(value) || 100; break;
                    case 'sort_unlisted': config.sortUnlisted = value === 'true'; break;
                    case 'pretty_print': config.prettyPrint = value === 'true'; break;
                    case 'indent_size': config.indentSize = parseInt(value) || 2; break;
                }
            }
        }
        return config;
    }

    // ========================================
    // Key Utilities
    // ========================================

    function toValidKey(name) {
        if (!name || typeof name !== 'string') return '_invalid';
        // JSON keys can be any string, but we'll normalize for consistency
        return name.replace(/\s+/g, '_').toLowerCase();
    }

    // ========================================
    // Hint Marker Parser (same as XML version)
    // ========================================

    function parseHintMarkers(text) {
        const results = [];
        const markerPattern = /<\$([a-zA-Z_][a-zA-Z0-9_\-]*)([^>]*)>([\s\S]*?)<\/\$\1>/g;

        let match;
        let lastIndex = 0;
        const unmarkedChunks = [];

        while ((match = markerPattern.exec(text)) !== null) {
            if (match.index > lastIndex) {
                const unmarked = text.substring(lastIndex, match.index).trim();
                if (unmarked) unmarkedChunks.push(unmarked);
            }
            lastIndex = match.index + match[0].length;

            const tagName = match[1];
            const attrString = match[2].trim();
            const innerContent = match[3];

            const attributes = parseAttributes(attrString);
            const id = attributes.id || null;
            delete attributes.id;

            const parsed = parseNestedHints(tagName, innerContent, attributes, id);
            results.push(...parsed);
        }

        if (lastIndex < text.length) {
            const unmarked = text.substring(lastIndex).trim();
            if (unmarked) unmarkedChunks.push(unmarked);
        }

        for (const chunk of unmarkedChunks) {
            const proseItems = parsePureProse(chunk);
            results.push(...proseItems);
        }

        return results;
    }

    function parseNestedHints(parentTag, content, parentAttrs, parentId) {
        const results = [];
        const nestedPattern = /<\$([a-zA-Z_][a-zA-Z0-9_\-]*)([^>]*)>([\s\S]*?)<\/\$\1>/g;

        let match;
        let lastIndex = 0;
        let hasNested = false;
        const directContent = [];

        while ((match = nestedPattern.exec(content)) !== null) {
            hasNested = true;
            if (match.index > lastIndex) {
                const before = content.substring(lastIndex, match.index).trim();
                if (before) directContent.push(before);
            }
            lastIndex = match.index + match[0].length;

            const tagName = match[1];
            const attrString = match[2].trim();
            const innerContent = match[3];

            const attributes = parseAttributes(attrString);
            const id = attributes.id || null;
            delete attributes.id;

            const nested = parseNestedHints(tagName, innerContent, attributes, id);
            for (const item of nested) {
                item.path = [parentTag, ...item.path];
                results.push(item);
            }
        }

        if (lastIndex < content.length) {
            const after = content.substring(lastIndex).trim();
            if (after) directContent.push(after);
        }

        if (!hasNested || directContent.length > 0) {
            const finalContent = hasNested ? directContent.join('\n') : content.trim();
            if (finalContent) {
                // Check if content is JSON
                const isJson = finalContent.trimStart().startsWith('{') ||
                               finalContent.trimStart().startsWith('[');

                results.push({
                    path: [parentTag],
                    id: parentId,
                    attributes: parentAttrs,
                    content: finalContent,
                    isJson: isJson
                });
            }
        }

        return results;
    }

    function parseAttributes(attrString) {
        const attrs = {};
        if (!attrString) return attrs;
        const attrPattern = /([a-zA-Z_][a-zA-Z0-9_\-]*)\s*=\s*["']([^"']*)["']/g;
        let match;
        while ((match = attrPattern.exec(attrString)) !== null) {
            attrs[match[1]] = match[2];
        }
        return attrs;
    }

    function parsePureProse(text) {
        const results = [];
        const chunks = text.split(/\n\n+/).filter(c => c.trim());

        for (const chunk of chunks) {
            const trimmed = chunk.trim();
            if (!trimmed) continue;

            results.push({
                path: [],
                id: null,
                attributes: {},
                content: trimmed,
                isJson: false
            });
        }
        return results;
    }

    // ========================================
    // Hierarchy Builder
    // ========================================

    function getPriority(pathSegments, config) {
        for (let i = pathSegments.length; i > 0; i--) {
            const partialPath = pathSegments.slice(0, i).join('.').toLowerCase();
            if (config.nestedPriorities[partialPath] !== undefined) {
                return config.nestedPriorities[partialPath];
            }
            if (i === 1 && config.priorities[partialPath] !== undefined) {
                return config.priorities[partialPath];
            }
        }
        return config.uncategorizedPriority;
    }

    function buildHierarchy(items, config) {
        const root = {
            key: config.rootKey,
            children: {},
            content: [],
            priority: 0
        };

        for (const item of items) {
            if (item.path.length === 0) {
                insertAtPath(root, [config.uncategorizedKey], item, config);
            } else {
                insertAtPath(root, item.path, item, config);
            }
        }

        return root;
    }

    function insertAtPath(root, path, item, config) {
        let current = root;
        const builtPath = [];

        for (let i = 0; i < path.length; i++) {
            const segment = path[i];
            const key = toValidKey(segment);
            builtPath.push(segment);

            if (!current.children[key]) {
                current.children[key] = {
                    key: key,
                    children: {},
                    content: [],
                    priority: getPriority(builtPath, config)
                };
            }

            current = current.children[key];
        }

        if (item.id) {
            const idKey = toValidKey(item.id);
            const idPath = [...builtPath, item.id];

            if (!current.children[idKey]) {
                current.children[idKey] = {
                    key: idKey,
                    children: {},
                    content: [],
                    attributes: item.attributes,
                    priority: getPriority(idPath, config)
                };
            }
            current.children[idKey].content.push({
                text: item.content,
                isJson: item.isJson
            });
        } else {
            current.content.push({
                text: item.content,
                isJson: item.isJson
            });
        }
    }

    // ========================================
    // JSON Serializer
    // ========================================

    function hierarchyToObject(node, config) {
        const result = {};

        // Sort children by priority
        const sortedChildren = Object.values(node.children).sort((a, b) => {
            const priorityDiff = a.priority - b.priority;
            if (priorityDiff !== 0) return priorityDiff;
            if (config.sortUnlisted) return a.key.localeCompare(b.key);
            return 0;
        });

        // Add direct content
        if (node.content.length > 0) {
            const contents = node.content.map(c => {
                if (c.isJson) {
                    try { return JSON.parse(c.text); }
                    catch (e) { return c.text; }
                }
                return c.text;
            });

            if (contents.length === 1) {
                // Single content item - if it's an object, merge it
                if (typeof contents[0] === 'object' && !Array.isArray(contents[0])) {
                    Object.assign(result, contents[0]);
                } else {
                    result._content = contents[0];
                }
            } else {
                result._content = contents;
            }
        }

        // Add children recursively
        for (const child of sortedChildren) {
            const childObj = hierarchyToObject(child, config);

            // If child only has content and no nested children, simplify
            if (Object.keys(childObj).length === 1 && childObj._content !== undefined) {
                result[child.key] = childObj._content;
            } else {
                result[child.key] = childObj;
            }
        }

        return result;
    }

    // ========================================
    // Main Processing
    // ========================================

    const worldLoreMatch = text.match(/#?\s*World\s*Lore:\s*/i);

    if (!worldLoreMatch) {
        return text;
    }

    const memoriesMatch = text.match(/#?\s*Memories:\s*/i);
    const recentStoryMatch = text.match(/#?\s*Recent\s*Story:\s*/i);

    const config = loadConfig();

    const startIndex = worldLoreMatch.index + worldLoreMatch[0].length;
    let endIndex = text.length;

    if (recentStoryMatch && recentStoryMatch.index > startIndex) {
        endIndex = recentStoryMatch.index;
    }
    if (memoriesMatch && memoriesMatch.index > startIndex && memoriesMatch.index < endIndex) {
        endIndex = memoriesMatch.index;
    }

    const worldLoreContent = text.substring(startIndex, endIndex).trim();
    const parsedItems = parseHintMarkers(worldLoreContent);
    const hierarchy = buildHierarchy(parsedItems, config);

    // Separate before-root and in-root items
    const beforeRoot = [];
    const inRoot = [];

    for (const [key, child] of Object.entries(hierarchy.children)) {
        if (child.priority < 0) {
            beforeRoot.push(child);
        } else {
            inRoot.push(child);
        }
    }

    beforeRoot.sort((a, b) => a.priority - b.priority);
    inRoot.sort((a, b) => {
        const priorityDiff = a.priority - b.priority;
        if (priorityDiff !== 0) return priorityDiff;
        return config.sortUnlisted ? a.key.localeCompare(b.key) : 0;
    });

    // Build result
    let result = text.substring(0, worldLoreMatch.index);

    // Add sections before root as separate JSON blocks
    for (const section of beforeRoot) {
        const sectionObj = {};
        sectionObj[section.key] = hierarchyToObject(section, config);
        const jsonStr = JSON.stringify(sectionObj, null, config.prettyPrint ? config.indentSize : 0);
        result += jsonStr + '\n\n';
    }

    // Build root object with remaining children
    const rootForOutput = {
        key: config.rootKey,
        children: {},
        content: hierarchy.content,
        priority: 0
    };

    for (const child of inRoot) {
        rootForOutput.children[child.key] = child;
    }

    if (inRoot.length > 0 || hierarchy.content.length > 0) {
        const rootObj = {};
        rootObj[config.rootKey] = hierarchyToObject(rootForOutput, config);
        result += JSON.stringify(rootObj, null, config.prettyPrint ? config.indentSize : 0);
    }

    const afterLore = text.substring(endIndex);
    if (afterLore.trim()) {
        result += '\n\n' + afterLore.trimStart();
    }

    return result;
}

// Export for use in SANE
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BuildJsonContext };
}
