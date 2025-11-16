function DisplayModule() {
    'use strict';

    const MODULE_NAME = 'DisplayModule';
    const debug = true;

    // Module will receive GameState API during init
    let GameState = null;
    let Utilities = null;

    // TemplateParser class for processing display templates
    class TemplateParser {
        constructor(data) {
            this.data = data;
            this.loopContext = null;
        }

        parse(template) {
            if (!template) {
                return '';
            }

            // Process templates - use regex for simplicity
            let result = template;

            // Process loops BEFORE escaping braces: {field.*→ template} or {field.*| template}
            result = this.processLoops(result);

            // Handle escaped braces AFTER processing loops
            result = result.replace(/\{\{/g, '\u0001').replace(/\}\}/g, '\u0002');

            // Process conditionals: {condition ? true : false}
            result = this.processConditionals(result);

            // Process $() dynamic resolution
            result = this.processDollarExpressions(result);

            // Process functions before simple fields (functions may contain field refs)
            result = this.processFunctions(result);

            // Process simple field references
            result = this.processFields(result);

            // Restore escaped braces
            result = result.replace(/\u0001/g, '{').replace(/\u0002/g, '}');

            return result;
        }

        processLoops(template) {
            // Match loop patterns: {field.*→ template} or {field.*| template}
            let result = template;
            let changed = true;

            while (changed) {
                changed = false;

                // Find loop patterns manually to handle nested braces correctly
                const loopStart = /\{([^{}.*]+)\.\*(→|:|\|)/;
                const match = result.match(loopStart);

                if (match) {
                    const startIndex = match.index;
                    const field = match[1];
                    const delimiter = match[2];

                    // Find the matching closing brace, accounting for nesting
                    let braceCount = 1;  // We already found the opening brace
                    let endIndex = startIndex + match[0].length;

                    for (let i = endIndex; i < result.length; i++) {
                        if (result[i] === '{') {
                            braceCount++;
                        } else if (result[i] === '}') {
                            braceCount--;
                            if (braceCount === 0) {
                                endIndex = i;
                                break;
                            }
                        }
                    }

                    // Extract the full match and loop template
                    const fullMatch = result.substring(startIndex, endIndex + 1);
                    const loopTemplate = result.substring(startIndex + match[0].length, endIndex);

                    changed = true;
                    const obj = this.getValue(field);

                    if (!obj || typeof obj !== 'object') {
                        result = result.substring(0, startIndex) + '' + result.substring(endIndex + 1);
                        continue;
                    }

                    const results = [];
                    for (const [key, value] of Object.entries(obj)) {
                        // Skip display property itself when iterating
                        if (key === 'display') continue;

                        // Create sub-parser with loop context
                        const subParser = new TemplateParser(this.data);
                        subParser.loopContext = {
                            key: key,
                            value: value,
                            field: field
                        };

                        const processed = subParser.parse(loopTemplate);
                        if (processed && processed.trim()) {
                            results.push(processed);
                        }
                    }

                    // Determine separator based on delimiter
                    let separator = '\n';
                    if (delimiter === '|') separator = ' | ';
                    else if (delimiter === ':') separator = ': ';

                    // Replace the loop with results
                    result = result.substring(0, startIndex) +
                             (results.length > 0 ? results.join(separator) : 'N/A') +
                             result.substring(endIndex + 1);
                }
            }

            return result;
        }

        processConditionals(template) {
            // Process ternary conditionals: {condition ? true : false}
            const conditionalRegex = /\{([^?{}]+)\s*\?\s*([^:{}]+)\s*:\s*([^}]+)\}/g;
            return template.replace(conditionalRegex, (match, condition, trueVal, falseVal) => {
                const condResult = this.evaluateCondition(condition);
                return condResult ? trueVal : falseVal;
            });
        }

        processDollarExpressions(template) {
            // Process $() expressions for dynamic resolution
            const dollarRegex = /\$\(([^)]+)\)/g;
            return template.replace(dollarRegex, (match, expr) => {
                const value = this.getValue(expr);
                return value !== undefined && value !== null ? String(value) : '';
            });
        }

        processFunctions(template) {
            // Process function calls: {functionName(args)}
            const functionRegex = /\{([a-zA-Z_]\w*)\(([^)]*)\)\}/g;
            return template.replace(functionRegex, (match, funcName, args) => {
                // Parse arguments
                const argList = args ? args.split(',').map(arg => {
                    arg = arg.trim();
                    // If arg is a field reference in {}, evaluate it
                    if (arg.startsWith('{') && arg.endsWith('}')) {
                        const fieldName = arg.slice(1, -1);
                        return this.getValue(fieldName);
                    }
                    // If arg is quoted, return as string
                    if ((arg.startsWith('"') && arg.endsWith('"')) ||
                        (arg.startsWith("'") && arg.endsWith("'"))) {
                        return arg.slice(1, -1);
                    }
                    // Otherwise evaluate as field
                    return this.getValue(arg);
                }) : [];

                // Call the function if it exists
                if (typeof GameState[funcName] === 'function') {
                    const result = GameState[funcName](...argList);
                    return result !== undefined && result !== null ? String(result) : '';
                }

                return match; // Return unchanged if function not found
            });
        }

        processFields(template) {
            // Process simple field references: {fieldname} or {field.subfield}
            // Skip if it looks like a loop pattern or conditional
            const fieldRegex = /\{([^{}*?:→|]+)\}/g;
            return template.replace(fieldRegex, (match, fieldPath) => {
                // Skip if this looks like it's part of a more complex expression
                if (fieldPath.includes('(') || fieldPath.includes('$')) {
                    return match;
                }

                const value = this.getValue(fieldPath);
                return value !== undefined && value !== null ? String(value) : '';
            });
        }

        getValue(path) {
            // Handle special loop context variables
            if (this.loopContext) {
                if (path === '*') {
                    return this.loopContext.key;
                }
                if (path.startsWith('*.')) {
                    const subPath = path.substring(2);
                    return this.getValueFromObject(this.loopContext.value, subPath);
                }
                // In loop context, check both the loop value and main data
                if (path.startsWith(this.loopContext.field + '.')) {
                    // This is a reference to the parent field, use main data
                    return this.getValueFromObject(this.data, path);
                }
            }

            // Normal path resolution
            return this.getValueFromObject(this.data, path);
        }

        getValueFromObject(obj, path) {
            if (!obj) return undefined;

            const parts = path.split('.');
            let current = obj;

            for (const part of parts) {
                if (current === undefined || current === null) return undefined;
                current = current[part];
            }

            return current;
        }

        evaluateCondition(condition) {
            // Simple condition evaluation
            // Check for field existence: {fieldname}
            const fieldValue = this.getValue(condition);

            // Convert to boolean
            if (fieldValue === undefined || fieldValue === null || fieldValue === '' || fieldValue === 0) {
                return false;
            }
            if (typeof fieldValue === 'object' && Object.keys(fieldValue).length === 0) {
                return false;
            }
            return true;
        }
    }

    // Build the display for an entity using component-embedded display rules
    function buildEntityDisplay(entity) {
        if (!entity || typeof entity !== 'object') {
            if (debug) console.log(`${MODULE_NAME}: buildEntityDisplay: Invalid entity`);
            return '';
        }

        // Check if entity is wrapped (i.e., has only one key that matches an entity ID pattern)
        const topKeys = Object.keys(entity);
        if (topKeys.length === 1 && !entity.id) {
            // Entity might be wrapped - unwrap it
            const possibleEntityId = topKeys[0];
            const possibleEntity = entity[possibleEntityId];
            if (possibleEntity && possibleEntity.id) {
                console.log(`${MODULE_NAME}: WARNING - buildEntityDisplay received wrapped entity, unwrapping ${possibleEntityId}`);
                entity = possibleEntity;
            }
        }

        // Collect all display rules from the display component
        const displayRules = [];
        const displayComponent = entity.display || {};

        // Gather display rules from display component for each component
        for (const componentName of Object.keys(displayComponent)) {
            // Skip non-component fields in display
            if (['active', 'separators', 'order', 'prefixline', 'footer'].includes(componentName)) {
                continue;
            }

            const componentRules = displayComponent[componentName];
            if (!componentRules) continue;

            // Handle both single rule and array of rules
            const rules = Array.isArray(componentRules) ? componentRules : [componentRules];
            for (const rule of rules) {
                displayRules.push({
                    component: componentName,
                    ...rule
                });
            }
        }

        // Sort rules by priority
        displayRules.sort((a, b) => (a.priority || 100) - (b.priority || 100));

        // Initialize display sections
        const sections = {
            prefixline: [],
            nameline: [],
            infoline: [],
            section: [],
            footer: []
        };

        // Get display component configuration
        const displayConfig = entity.display || {};
        const separators = displayConfig.separators || {
            nameline: ' ',
            infoline: ' | ',
            section: '\n',
            footer: '\n'
        };
        const order = displayConfig.order || ['prefixline', 'nameline', 'infoline', 'section', 'footer'];

        // 1. Handle prefixline from display component
        if (displayConfig.prefixline) {
            sections.prefixline.push(displayConfig.prefixline);
        } else {
            // Auto-generate prefix from GameplayTags if not specified
            if (entity.GameplayTags && entity.GameplayTags.length > 0) {
                for (const tag of entity.GameplayTags) {
                    if (tag.startsWith('Character')) {
                        sections.prefixline.push('<$# Characters>');
                        break;
                    } else if (tag.startsWith('User')) {
                        sections.prefixline.push('<$# Users>');
                        break;
                    } else if (tag === 'Location') {
                        sections.prefixline.push('<$# Locations>');
                        break;
                    } else if (tag === 'Quest') {
                        sections.prefixline.push('<$# Quests>');
                        break;
                    }
                }
            }
        }

        // 2. Process all display rules
        for (const rule of displayRules) {
            // Check condition if present
            if (rule.condition) {
                if (!evaluateTemplateCondition(rule.condition, entity)) {
                    continue;
                }
            }

            // Format the display text using the new template system
            const formatted = formatTemplateString(rule.format, entity);
            if (formatted && formatted.trim()) {
                const targetSection = sections[rule.line] || sections.section;
                targetSection.push(formatted);
            }
        }

        // 3. Compile final output using display component's order and separators
        const output = [];

        for (const sectionName of order) {
            const section = sections[sectionName];
            if (!section || section.length === 0) continue;

            const separator = separators[sectionName] || '\n';

            if (sectionName === 'infoline' || sectionName === 'nameline') {
                // Infoline and nameline sections are joined with their separator
                output.push(section.join(separator));
            } else {
                // Other sections are added as individual lines
                output.push(...section);
            }
        }

        // Handle custom footer if specified
        if (displayConfig.footer) {
            output.push(displayConfig.footer);
        }

        return output.join('\n');
    }

    // Evaluate template conditions with enhanced syntax support
    function evaluateTemplateCondition(condition, entity) {
        if (!condition) return true;

        try {
            // Replace field references with actual values
            const evaluable = condition.replace(/\{([^}]+)\}/g, (match, path) => {
                // Navigate the path starting from entity
                const parts = path.split('.');
                let value = entity;

                for (const part of parts) {
                    value = value?.[part];
                    if (value === undefined) return 'undefined';
                }

                return JSON.stringify(value);
            });

            // Handle Object.keys().length checks
            if (evaluable.includes('Object.keys')) {
                const match = evaluable.match(/Object\.keys\((\w+)\)\.length\s*>\s*(\d+)/);
                if (match) {
                    const fieldName = match[1];
                    const threshold = parseInt(match[2]);
                    const field = entity[fieldName];
                    if (!field || typeof field !== 'object') return false;

                    // Filter out display property when counting keys
                    const keys = Object.keys(field).filter(k => k !== 'display');
                    return keys.length > threshold;
                }
            }

            // Evaluate the condition
            return new Function('return ' + evaluable)();
        } catch (e) {
            if (debug) console.log(`${MODULE_NAME}: Error evaluating condition: ${condition}`, e);
            return true;
        }
    }

    // Format template strings with enhanced wildcard and function support
    function formatTemplateString(format, entity) {
        if (!format) return '';

        // Simply pass the entire entity as templateData
        const parser = new TemplateParser(entity || {});
        return parser.parse(format);
    }

    return {
        // Component schema definition
        schemas: {
            display: {
                id: 'display',
                defaults: {
                    active: false,
                    prefixline: null,
                    footer: null,
                    separators: {
                        nameline: " ",
                        infoline: " | ",
                        section: "\n\n"
                    }
                }
            }
        },

        // Display formatting functions exposed to GameState
        api: {
            buildEntityDisplay: buildEntityDisplay,
            formatTemplateString: formatTemplateString,
            evaluateTemplateCondition: evaluateTemplateCondition,
            TemplateParser: TemplateParser
        },

        // Module initialization
        init: function(api) {
            GameState = api;

            // Get Utilities reference
            if (typeof Utilities !== 'undefined') {
                Utilities = api.Utilities || Utilities;
            }

            if (debug) console.log(`${MODULE_NAME}: Initialized with display formatting functions`);
        }
    };
}
DisplayModule.isSANEModule = true;
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DisplayModule;
}