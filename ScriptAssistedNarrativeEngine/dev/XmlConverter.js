/**
 * JSON to XML Converter for SANE
 *
 * Converts entity JSON data to XML format for LLM context.
 * Designed with guaranteed proper nesting and configurable output.
 *
 * Usage:
 *   const converter = createXmlConverter({ addHierarchyComments: true });
 *   const xml = converter.toXml(entityData, 'character');
 */

function createXmlConverter(options = {}) {
    'use strict';

    const defaults = {
        // Keys that should become attributes (if value is primitive)
        attributeKeys: new Set([
            'id', 'name', 'type', 'value', 'current', 'max', 'qty', 'quantity',
            'level', 'gender', 'xp', 'hp', 'floor', 'location'
        ]),
        // Force these keys to always be elements (even if primitive)
        forceElementKeys: new Set([
            'description', 'personality', 'background', 'appearance', 'notes'
        ]),
        // Skip these keys entirely from output
        skipKeys: new Set([
            'display', 'components', 'GameplayTags'  // Internal SANE data
        ]),
        // Add comments showing hierarchy path for deeply nested elements
        addHierarchyComments: false,
        // Minimum depth to add comments (0 = all, 2 = only depth 2+)
        commentMinDepth: 2,
        // Indent string
        indent: '  ',
        // How to handle arrays: 'repeat' or 'wrap'
        arrayStyle: 'repeat',
        // Compact attributes on same line threshold (chars)
        compactAttributeThreshold: 80
    };

    const config = { ...defaults, ...options };

    /**
     * Escape special XML characters in text content
     */
    function escapeXml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    /**
     * Escape special characters in attribute values
     */
    function escapeAttribute(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /**
     * Convert a key to a valid XML tag name
     * - Must start with letter or underscore
     * - Can contain letters, digits, hyphens, underscores, periods
     * - No spaces or special characters
     */
    function toValidTagName(key) {
        if (!key || typeof key !== 'string') return '_invalid';

        // Replace spaces and invalid chars with underscores
        let name = key.replace(/[^a-zA-Z0-9_\-\.]/g, '_');

        // Ensure starts with letter or underscore
        if (/^[0-9\-\.]/.test(name)) {
            name = '_' + name;
        }

        // Collapse multiple underscores
        name = name.replace(/_+/g, '_');

        return name || '_empty';
    }

    /**
     * Check if a value should be rendered as an attribute
     */
    function shouldBeAttribute(key, value, depth) {
        // Forced elements are never attributes
        if (config.forceElementKeys.has(key)) return false;

        // Only primitives can be attributes
        if (typeof value === 'object' && value !== null) return false;

        // Check if key is in attribute list
        if (config.attributeKeys.has(key)) return true;

        // Short primitive values default to attributes at shallow depth
        if (depth <= 1 && typeof value !== 'object') {
            const strVal = String(value);
            return strVal.length < 50 && !strVal.includes('\n');
        }

        return false;
    }

    /**
     * Build XML tree node (intermediate representation)
     * This ensures we have complete structure before serialization
     */
    function buildNode(key, value, depth = 0, path = []) {
        const tagName = toValidTagName(key);
        const currentPath = [...path, tagName];

        const node = {
            tag: tagName,
            attributes: {},
            children: [],
            text: null,
            path: currentPath,
            depth: depth
        };

        // Handle null/undefined
        if (value === null || value === undefined) {
            return node; // Empty element
        }

        // Handle primitives
        if (typeof value !== 'object') {
            node.text = String(value);
            return node;
        }

        // Handle arrays
        if (Array.isArray(value)) {
            // Return multiple nodes for array items
            return value.map((item, index) => {
                const itemKey = key.replace(/s$/, ''); // 'items' -> 'item'
                return buildNode(itemKey, item, depth, path);
            });
        }

        // Handle objects - separate attributes from child elements
        const childElements = [];

        for (const [k, v] of Object.entries(value)) {
            // Skip internal keys
            if (config.skipKeys.has(k)) continue;

            // Skip null/undefined
            if (v === null || v === undefined) continue;

            if (shouldBeAttribute(k, v, depth)) {
                node.attributes[k] = String(v);
            } else {
                const childNode = buildNode(k, v, depth + 1, currentPath);
                if (Array.isArray(childNode)) {
                    childElements.push(...childNode);
                } else {
                    childElements.push(childNode);
                }
            }
        }

        node.children = childElements;
        return node;
    }

    /**
     * Serialize a node tree to XML string
     * This is where we guarantee proper nesting
     */
    function serializeNode(node, depth = 0) {
        const indent = config.indent.repeat(depth);
        const tag = node.tag;

        // Build attribute string
        const attrs = Object.entries(node.attributes)
            .map(([k, v]) => `${toValidTagName(k)}="${escapeAttribute(v)}"`)
            .join(' ');

        const attrStr = attrs ? ' ' + attrs : '';

        // Add hierarchy comment if enabled
        let comment = '';
        if (config.addHierarchyComments && depth >= config.commentMinDepth) {
            comment = `${indent}<!-- ${node.path.join(' > ')} -->\n`;
        }

        // Self-closing tag for empty elements
        if (!node.text && node.children.length === 0) {
            return `${comment}${indent}<${tag}${attrStr}/>`;
        }

        // Text-only element (single line)
        if (node.text && node.children.length === 0) {
            const escapedText = escapeXml(node.text);
            // Multi-line text gets its own formatting
            if (escapedText.includes('\n') || escapedText.length > 60) {
                return `${comment}${indent}<${tag}${attrStr}>\n${indent}${config.indent}${escapedText.replace(/\n/g, '\n' + indent + config.indent)}\n${indent}</${tag}>`;
            }
            return `${comment}${indent}<${tag}${attrStr}>${escapedText}</${tag}>`;
        }

        // Element with children
        const childrenXml = node.children
            .map(child => serializeNode(child, depth + 1))
            .join('\n');

        return `${comment}${indent}<${tag}${attrStr}>\n${childrenXml}\n${indent}</${tag}>`;
    }

    /**
     * Convert JSON object to XML string
     * @param {Object} data - The JSON data to convert
     * @param {string} rootTag - The root element tag name
     * @returns {string} XML string
     */
    function toXml(data, rootTag = 'root') {
        // Build complete tree first (guarantees structure)
        const tree = buildNode(rootTag, data, 0, []);

        // Serialize to string (guaranteed proper nesting)
        if (Array.isArray(tree)) {
            // Multiple root elements - wrap them
            return tree.map(node => serializeNode(node, 0)).join('\n');
        }

        return serializeNode(tree, 0);
    }

    /**
     * Convert a single SANE entity to XML
     * @param {Object} entity - Entity object with id, components, etc.
     * @returns {string} XML string
     */
    function entityToXml(entity) {
        if (!entity || !entity.id) {
            return '<!-- Invalid entity -->';
        }

        const tagName = toValidTagName(entity.id);
        return toXml(entity, tagName);
    }

    /**
     * Convert multiple entities grouped by type
     * @param {Object} entities - Object with entity IDs as keys
     * @param {Function} groupFn - Function to determine group (receives entity, returns group name)
     * @returns {string} XML string with grouped entities
     */
    function entitiesToXml(entities, groupFn = null) {
        if (!groupFn) {
            // Default grouping: by first GameplayTag or 'entities'
            groupFn = (entity) => {
                if (entity.GameplayTags && entity.GameplayTags.length > 0) {
                    // Extract top-level category from tag like "Character.NPC" -> "characters"
                    const firstTag = entity.GameplayTags[0];
                    const category = firstTag.split('.')[0].toLowerCase();
                    return category + 's'; // pluralize
                }
                return 'entities';
            };
        }

        // Group entities
        const groups = {};
        for (const [id, entity] of Object.entries(entities)) {
            const group = groupFn(entity);
            if (!groups[group]) groups[group] = {};
            groups[group][id] = entity;
        }

        // Build XML for each group
        const groupsXml = Object.entries(groups)
            .map(([groupName, groupEntities]) => {
                const entitiesXml = Object.values(groupEntities)
                    .map(entity => entityToXml(entity))
                    .join('\n');

                const indent = config.indent;
                // Indent all entity XML by one level
                const indentedEntities = entitiesXml
                    .split('\n')
                    .map(line => indent + line)
                    .join('\n');

                return `<${toValidTagName(groupName)}>\n${indentedEntities}\n</${toValidTagName(groupName)}>`;
            })
            .join('\n');

        return `<world>\n${groupsXml.split('\n').map(l => config.indent + l).join('\n')}\n</world>`;
    }

    // Return public API
    return {
        toXml,
        entityToXml,
        entitiesToXml,
        // Expose utilities for testing/extension
        utils: {
            escapeXml,
            escapeAttribute,
            toValidTagName,
            buildNode,
            serializeNode
        },
        // Allow runtime config changes
        config
    };
}

// Export for use in SANE
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createXmlConverter };
}
