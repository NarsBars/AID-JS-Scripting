const Utilities = (function() {
    'use strict';
    
    // Usage in other modules:
    // const data = Utilities.plainText.parseEncapsulated(text);
    // const hash = Utilities.math.hash(input);
    // const card = Utilities.storyCard.get(title);
    
    // No need to call as function - direct property access
    
    // =====================================
    // API DOCUMENTATION
    // =====================================
    
    /**
     * PLAIN TEXT PARSER API
     * =====================
     * Parse and format structured plain text data using a custom format:
     * {# Entity Name
     * ## Section Name
     * Key: Value
     * - List items
     * | Table | Headers |
     * }
     * 
     * PARSING METHODS:
     * 
     * parseEncapsulated(text: string) -> {name: string, sections: Object}|null
     *   Parses text in {# Name ... } format into structured data
     *   Example: Utilities.plainText.parseEncapsulated('{# Config\n## Settings\nDebug: true}')
     *   Returns: {name: 'Config', sections: {settings: {debug: true}}}
     *   
     * parseSections(text: string) -> Object
     *   Parses ## section headers into an object with snake_case keys
     *   Example: Utilities.plainText.parseSections('## General\nName: Test\n## Options\n- Feature A')
     *   Returns: {general: {name: 'Test'}, options: ['Feature A']}
     *   
     * parseKeyValues(text: string, parseValues?: boolean) -> Object
     *   Parses "Key: Value" pairs, auto-converting types if parseValues=true
     *   Example: Utilities.plainText.parseKeyValues('Count: 42\nRatio: 3/4')
     *   Returns: {count: 42, ratio: {current: 3, max: 4}}
     *   
     * parseList(text: string) -> Array
     *   Parses bullet (-, •, *) or numbered lists
     *   Example: Utilities.plainText.parseList('- Item A x5\n- Item B (Lv 3)')
     *   Returns: [{name: 'Item A', quantity: 5}, {name: 'Item B', level: 3}]
     *   
     * parseTable(text: string) -> Array
     *   Parses markdown-style tables into array of row objects
     *   Example: Utilities.plainText.parseTable('| Name | Value |\n|------|-------|\n| Alpha | 100 |')
     *   Returns: [{name: 'Alpha', value: 100}]
     * 
     * FORMATTING METHODS:
     * 
     * formatEncapsulated(data: Object) -> string
     *   Formats an object back into {# Name ... } format
     *   Example: Utilities.plainText.formatEncapsulated({name: 'Config', sections: {...}})
     *   
     * formatList(items: Array) -> string
     *   Formats an array into a bullet list
     *   Example: Utilities.plainText.formatList(['First', 'Second'])
     *   Returns: '- First\n- Second'
     *   
     * formatTable(data: Array|Object) -> string
     *   Formats data into a markdown table
     *   Example: Utilities.plainText.formatTable([{id: 1, status: 'active'}])
     *   Returns: '| Id | Status |\n|----|--------|\n| 1  | active |'
     */
    
    /**
     * STRING UTILITIES API
     * ====================
     * Text manipulation and conversion utilities
     * 
     * toSnakeCase(str: string) -> string
     *   Converts any string to snake_case
     *   Example: Utilities.string.toSnakeCase('userName') // 'user_name'
     *   
     * toCamelCase(str: string) -> string
     *   Converts any string to camelCase
     *   Example: Utilities.string.toCamelCase('user_name') // 'userName'
     *   
     * toTitleCase(str: string) -> string
     *   Converts to Title Case (each word capitalized)
     *   Example: Utilities.string.toTitleCase('hello world') // 'Hello World'
     *   
     * capitalize(str: string) -> string
     *   Capitalizes only the first letter
     *   Example: Utilities.string.capitalize('hello world') // 'Hello world'
     *   
     * truncate(str: string, maxLength: number, suffix?: string) -> string
     *   Truncates string to max length with optional suffix (default: '...')
     *   Example: Utilities.string.truncate('Long text here', 8) // 'Long ...'
     *   
     * pad(str: string, length: number, char?: string, direction?: 'left'|'right') -> string
     *   Pads string to specified length (default: space, left)
     *   Example: Utilities.string.pad('5', 3, '0', 'left') // '005'
     *   
     * sanitize(str: string, allowedChars?: string) -> string
     *   Removes special characters, keeping only alphanumeric + allowed
     *   Example: Utilities.string.sanitize('Hello@World!', '@') // 'Hello@World'
     *   
     * extractNumbers(str: string) -> number[]
     *   Extracts all numbers from a string
     *   Example: Utilities.string.extractNumbers('Order 66 costs $25.50') // [66, 25.50]
     *   
     * parseBoolean(str: string) -> boolean
     *   Converts string to boolean ('true', 'yes', '1', 'on', 'enabled' = true)
     *   Example: Utilities.string.parseBoolean('yes') // true
     */
    
    /**
     * MATH UTILITIES API
     * ==================
     * Deterministic math operations and calculations
     * 
     * hash(input: any) -> number
     *   Generates deterministic hash from any input
     *   Returns: Positive integer hash value
     *   Example: Utilities.math.hash('test_123') // 84729384
     *   
     * seededRandom(seed: any, min?: number, max?: number) -> number
     *   Deterministic random number from seed
     *   Returns: Number between min and max (default 0-1)
     *   Example: Utilities.math.seededRandom('seed_5', 1, 100) // 67
     *   
     * clamp(value: number, min: number, max: number) -> number
     *   Restricts value to min/max range
     *   Example: Utilities.math.clamp(150, 0, 100) // 100
     *   
     * lerp(start: number, end: number, t: number) -> number
     *   Linear interpolation between two values (t: 0-1)
     *   Example: Utilities.math.lerp(0, 100, 0.5) // 50
     *   
     * percentage(value: number, total: number) -> number
     *   Calculates percentage (0-100)
     *   Example: Utilities.math.percentage(30, 120) // 25
     *   
     * round(value: number, decimals?: number) -> number
     *   Rounds to specified decimal places
     *   Example: Utilities.math.round(3.14159, 2) // 3.14
     *   
     * average(numbers: number[]) -> number
     *   Calculates arithmetic mean
     *   Example: Utilities.math.average([10, 20, 30]) // 20
     *   
     * standardDeviation(numbers: number[]) -> number
     *   Calculates standard deviation
     *   Example: Utilities.math.standardDeviation([10, 20, 30]) // 8.165
     */
    
    /**
     * COLLECTION UTILITIES API
     * ========================
     * Array and object manipulation utilities
     * 
     * groupBy(array: any[], keyFn: Function) -> Object
     *   Groups array items by the result of keyFn function
     *   @param keyFn - Function that receives an item and returns a grouping key
     *   Example: Utilities.collection.groupBy(items, item => item.category)
     *   Result: {electronics: [...], books: [...], clothing: [...]}
     *   
     * unique(array: any[], keyFn?: Function) -> any[]
     *   Returns array with unique values
     *   @param keyFn - Optional function to determine uniqueness key
     *   Example: Utilities.collection.unique([1, 2, 2, 3]) // [1, 2, 3]
     *   Example: Utilities.collection.unique(items, item => item.id) // unique by id
     *   
     * chunk(array: any[], size: number) -> any[][]
     *   Splits array into chunks of specified size
     *   Example: Utilities.collection.chunk([1,2,3,4,5], 2) // [[1,2], [3,4], [5]]
     *   
     * flatten(array: any[], depth?: number) -> any[]
     *   Flattens nested arrays to specified depth (default: 1)
     *   Example: Utilities.collection.flatten([[1, 2], [3, [4, 5]]], 1) // [1, 2, 3, [4, 5]]
     *   
     * sortBy(array: any[], ...keyFns: Function[]) -> any[]
     *   Sorts by multiple key functions in priority order
     *   @param keyFns - Functions that extract sort values from items
     *   Example: Utilities.collection.sortBy(users, u => u.age, u => u.name)
     *   
     * pick(obj: Object, keys: string[]) -> Object
     *   Creates object with only specified keys
     *   Example: Utilities.collection.pick({a: 1, b: 2, c: 3}, ['a', 'c']) // {a: 1, c: 3}
     *   
     * omit(obj: Object, keys: string[]) -> Object
     *   Creates object without specified keys
     *   Example: Utilities.collection.omit({a: 1, b: 2, c: 3}, ['b']) // {a: 1, c: 3}
     *   
     * deepClone(obj: any) -> any
     *   Creates deep copy of object/array (handles nested structures)
     *   Example: const copy = Utilities.collection.deepClone({a: {b: 1}})
     */
    
    /**
     * VALIDATION UTILITIES API
     * ========================
     * Type checking and validation functions
     * 
     * isString(value: any) -> boolean
     * isNumber(value: any) -> boolean  
     * isArray(value: any) -> boolean
     * isObject(value: any) -> boolean
     *   Basic type checking functions
     *   Note: isObject returns true for objects but false for arrays/null
     *   
     * isEmpty(value: any) -> boolean
     *   Checks if value is empty (null, undefined, [], {}, '')
     *   Example: Utilities.validation.isEmpty([]) // true
     *   Example: Utilities.validation.isEmpty({a: 1}) // false
     *   
     * inRange(value: number, min: number, max: number) -> boolean
     *   Checks if number is within inclusive range
     *   Example: Utilities.validation.inRange(5, 1, 10) // true
     *   
     * matches(str: string, pattern: RegExp) -> boolean
     *   Tests string against regex pattern
     *   Example: Utilities.validation.matches('ABC123', /^[A-Z]+\d+$/) // true
     *   
     * isValidEntity(title: string) -> boolean
     *   Checks if string matches entity format: [TYPE] Name
     *   Example: Utilities.validation.isValidEntity('[USER] John') // true
     *   Example: Utilities.validation.isValidEntity('Just a name') // false
     */
    
    /**
     * FORMAT UTILITIES API
     * ====================
     * Number and string formatting utilities
     * 
     * formatNumber(num: number, decimals?: number) -> string
     *   Formats number with thousands separators
     *   Example: Utilities.format.formatNumber(1234567) // '1,234,567'
     *   
     * formatCurrency(amount: number, symbol?: string) -> string
     *   Formats as currency (default: 'col')
     *   Example: Utilities.format.formatCurrency(1000) // '1,000 col'
     *   Example: Utilities.format.formatCurrency(50, '$') // '50 $'
     *   
     * formatPercentage(value: number, decimals?: number) -> string
     *   Formats decimal as percentage
     *   Example: Utilities.format.formatPercentage(0.85, 1) // '85.0%'
     *   
     * formatTime(hour: number, minute?: number) -> string
     *   Formats as HH:MM time
     *   Example: Utilities.format.formatTime(9, 5) // '09:05'
     *   
     * formatDuration(seconds: number) -> string
     *   Formats seconds as human-readable duration
     *   Example: Utilities.format.formatDuration(3665) // '1h 1m 5s'
     *   
     * formatHealthBar(current: number, max: number, width?: number) -> string
     *   Creates ASCII health bar visualization
     *   Example: Utilities.format.formatHealthBar(30, 100, 10) // '[███-------]'
     *   
     * formatList(items: string[], bullet?: string) -> string
     *   Formats array as bullet list (default bullet: '•')
     *   Example: Utilities.format.formatList(['First', 'Second']) // '• First\n• Second'
     */
    
    /**
     * ENTITY UTILITIES API
     * ====================
     * Entity parsing and management ([TYPE] Name format)
     * 
     * parseEntity(title: string) -> {type: string, name: string, fullTitle: string}|null
     *   Parses entity title into components
     *   Example: Utilities.entity.parseEntity('[ITEM] Golden Key')
     *   Returns: {type: 'ITEM', name: 'Golden Key', fullTitle: '[ITEM] Golden Key'}
     *   
     * formatEntity(type: string, name: string) -> string
     *   Creates properly formatted entity title
     *   Example: Utilities.entity.formatEntity('LOCATION', 'Central Plaza') // '[LOCATION] Central Plaza'
     *   
     * extractEntities(text: string) -> Array
     *   Finds all entity references in text
     *   Returns: Array of {type, name, fullMatch, index}
     *   Example: Utilities.entity.extractEntities('The [USER] Alice found [ITEM] Blue Gem')
     *   
     * isPlayer(entity: string|Object) -> boolean
     * isNPC(entity: string|Object) -> boolean
     * isMonster(entity: string|Object) -> boolean
     * isItem(entity: string|Object) -> boolean
     *   Type checking functions for entities
     *   Example: Utilities.entity.isItem('[ITEM] Map') // true
     *   
     * generateId(type: string, name: string, seed?: string) -> string
     *   Generates deterministic unique ID for entity
     *   Example: Utilities.entity.generateId('USER', 'Alice', 'session1')
     *   Returns: 'user_alice_session1_84729384'
     */
    
    /**
     * STORY CARD OPERATIONS API
     * =========================
     * Direct manipulation of AI Dungeon Story Cards
     * 
     * get(title: string) -> card|null
     *   Gets a story card by exact title match
     *   Example: Utilities.storyCard.get('[CONFIG] Settings')
     *   Returns: Card object or null if not found
     * 
     * find(predicate: Function, getAll?: boolean) -> card|card[]|null
     *   Finds card(s) where predicate function returns true
     *   @param predicate - Function that receives a card and returns boolean
     *   @param getAll - If true, returns all matches; else returns first match
     *   Example: Utilities.storyCard.find(card => card.title === '[CONFIG] Settings')
     *   Example: Utilities.storyCard.find(card => card.type === 'item', true) // all items
     *   
     * add(cardData: Object|string, ...params) -> card
     *   Creates new story card
     *   Object format: {title, entry, type, keys, description, insertionIndex}
     *   String format: add(title, entry, type, keys, description, insertionIndex)
     *   Example: Utilities.storyCard.add({title: '[DATA] User Profile', entry: 'Name: John'})
     *   
     * update(title: string, updates: Object) -> boolean
     *   Updates existing card properties
     *   Updates: {entry?, keys?, description?, type?}
     *   Example: Utilities.storyCard.update('[CONFIG] Settings', {entry: 'Debug: true'})
     *   
     * remove(predicate: string|Object|Function, removeAll?: boolean) -> boolean|number
     *   Removes card(s) by title, card object, or predicate function
     *   @param predicate - Title string, card object, or function returning boolean
     *   @param removeAll - If true with function predicate, removes all matches
     *   Returns: boolean for single removal, number for multiple removals
     *   Example: Utilities.storyCard.remove('[TEMP] Old Data')
     *   Example: Utilities.storyCard.remove(card => card.type === 'temp' && card.title.includes('old'), true)
     *   
     * upsert(cardData: Object) -> boolean
     *   Updates existing card or creates new one if not found
     *   Example: Utilities.storyCard.upsert({title: '[STATE] Current', entry: '90 Volts'})
     *   
     * exists(title: string) -> boolean
     *   Checks if card with exact title exists
     *   Example: Utilities.storyCard.exists('[CONFIG] Main Settings')
     *   
     */
    
    /**
     * HISTORY UTILITIES API
     * =====================
     * Access and search AI Dungeon action history
     * 
     * readPastAction(lookBack: number) -> {text: string, type: string}
     *   Reads action from history (0 = most recent)
     *   Example: Utilities.history.readPastAction(0) // {text: 'Open the door', type: 'do'}
     *   
     * searchHistory(pattern: string|RegExp, maxLookBack?: number) -> Array
     *   Searches history for pattern matches
     *   @param pattern - String (case-insensitive) or RegExp to search for
     *   @param maxLookBack - How many actions to search (default: 10)
     *   Returns: Array of {index, action, match}
     *   Example: Utilities.history.searchHistory('key', 20)
     *   Example: Utilities.history.searchHistory(/found \d+ items/i, 50)
     *   
     * getActionRange(start: number, count: number) -> Array
     *   Gets range of actions from history
     *   Example: Utilities.history.getActionRange(0, 5) // last 5 actions
     *   
     * countActionType(type: string, lookBack?: number) -> number
     *   Counts actions of specific type ('do', 'say', 'story', etc.)
     *   Example: Utilities.history.countActionType('say', 10) // 3
     */
    
    /**
     * CACHE SYSTEMS API
     * =================
     * Performance optimization through caching
     * 
     * regex.get(pattern: string, flags?: string) -> RegExp
     *   Returns cached regex instance
     *   Example: Utilities.regex.get('\\d+', 'g')
     *   
     * regex.compile(name: string, pattern: string, flags?: string) -> RegExp
     *   Precompiles named regex pattern for repeated use
     *   Example: Utilities.regex.compile('emailPattern', '^[\\w.-]+@[\\w.-]+\\.\\w+$')
     *   
     * cache.get(namespace: string, key: string) -> any
     * cache.set(namespace: string, key: string, value: any) -> any
     *   Turn-based cache storage (cleared each turn)
     *   Example: Utilities.cache.set('session', 'userId', 12345)
     *   Example: Utilities.cache.get('session', 'userId') // 12345
     *   
     * patterns -> Object
     *   Common precompiled regex patterns ready to use
     *   Example: Utilities.patterns.entityTitle.test('[USER] John') // true
     *   Available patterns: entityTitle, integer, decimal, percentage, etc.
     */
    
    // =====================================
    // REGEX PATTERN CACHE
    // =====================================
    class RegexCache {
        constructor() {
            this.cache = new Map();
            this.compiledPatterns = new Map();
            this.stats = {
                hits: 0,
                misses: 0,
                compiles: 0
            };
        }
        
        get(pattern, flags = '') {
            const key = `${pattern}:::${flags}`;
            
            if (this.cache.has(key)) {
                this.stats.hits++;
                return this.cache.get(key);
            }
            
            this.stats.misses++;
            const regex = new RegExp(pattern, flags);
            this.cache.set(key, regex);
            return regex;
        }
        
        compile(name, pattern, flags = '') {
            if (this.compiledPatterns.has(name)) {
                return this.compiledPatterns.get(name);
            }
            
            this.stats.compiles++;
            const regex = new RegExp(pattern, flags);
            this.compiledPatterns.set(name, regex);
            return regex;
        }
        
        getCompiled(name) {
            return this.compiledPatterns.get(name) || null;
        }
        
        precompileAll(patterns) {
            Object.entries(patterns).forEach(([name, config]) => {
                if (typeof config === 'string') {
                    this.compile(name, config);
                } else if (config && typeof config.pattern === 'string') {
                    this.compile(name, config.pattern, config.flags || '');
                }
            });
        }
        
        clear() {
            this.cache.clear();
            this.compiledPatterns.clear();
            this.stats = { hits: 0, misses: 0, compiles: 0 };
        }
        
        getStats() {
            return { ...this.stats };
        }
    }
    
    // =====================================
    // PLAIN TEXT PARSER
    // =====================================
    const PlainTextParser = {
        parseEncapsulated(text) {
            if (!text || typeof text !== 'string') return null;
            
            text = text.trim();
            
            if (!text.startsWith('{') || !text.endsWith('}')) {
                // console.log('[PlainText] Warning: Text not properly encapsulated');
                return this.parseUnencapsulated(text);
            }
            
            const content = text.slice(1, -1).trim();
            
            const nameMatch = content.match(/^#\s+(.+)$/m);
            if (!nameMatch) {
                // console.log('[PlainText] Warning: No primary name header found');
                return { name: 'Unknown', sections: this.parseSections(content) };
            }
            
            const name = nameMatch[1].trim();
            
            const bodyText = content.substring(nameMatch.index + nameMatch[0].length).trim();
            const sections = this.parseSections(bodyText);
            
            return {
                name: name,
                sections: sections
            };
        },
        
        parseSections(text) {
            if (!text) return {};
            
            text = this.removeComments(text);
            
            const sections = {};
            const lines = text.split('\n');
            let currentSection = 'default';
            let sectionContent = [];
            
            for (const line of lines) {
                const sectionMatch = line.match(/^##\s+(.+)$/);
                
                if (sectionMatch) {
                    if (sectionContent.length > 0) {
                        const content = sectionContent.join('\n').trim();
                        if (content) {
                            sections[StringUtils.toSnakeCase(currentSection)] = 
                                this.parseSectionContent(content);
                        }
                    }
                    
                    currentSection = sectionMatch[1].trim();
                    sectionContent = [];
                } else {
                    sectionContent.push(line);
                }
            }
            
            if (sectionContent.length > 0) {
                const content = sectionContent.join('\n').trim();
                if (content) {
                    sections[StringUtils.toSnakeCase(currentSection)] = 
                        this.parseSectionContent(content);
                }
            }
            
            return sections;
        },
        
        parseSectionContent(content) {
            if (!content) return {};
            
            if (this.isList(content)) {
                return this.parseList(content);
            }
            
            if (this.isTable(content)) {
                return this.parseTable(content);
            }
            
            return this.parseKeyValues(content);
        },
        
        parseKeyValues(text, parseValues = true) {
            const pairs = {};
            const lines = text.split('\n');
            
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                
                const match = trimmed.match(/^([^:]+):\s*(.+)$/);
                if (match) {
                    const key = StringUtils.toSnakeCase(match[1].trim());
                    let value = match[2].trim();
                    
                    if (parseValues) {
                        value = this.parseValue(value);
                    }
                    
                    pairs[key] = value;
                }
            }
            
            return pairs;
        },
        
        parseValue(value) {
            if (!value || typeof value !== 'string') return value;
            
            if (value.toLowerCase() === 'true') return true;
            if (value.toLowerCase() === 'false') return false;
            
            if (/^-?\d+$/.test(value)) return parseInt(value, 10);
            if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);
            
            const percentMatch = value.match(/^(\d+(?:\.\d+)?)\s*%$/);
            if (percentMatch) return parseFloat(percentMatch[1]) / 100;
            
            const rangeMatch = value.match(/^(\d+)\s*[\/\-]\s*(\d+)$/);
            if (rangeMatch) {
                return {
                    current: parseInt(rangeMatch[1], 10),
                    max: parseInt(rangeMatch[2], 10)
                };
            }
            
            return value;
        },
        
        parseList(text) {
            const items = [];
            const lines = text.split('\n');
            
            for (const line of lines) {
                const trimmed = line.trim();
                
                const bulletMatch = trimmed.match(/^[-•*]\s+(.+)$/);
                if (bulletMatch) {
                    items.push(this.parseListItem(bulletMatch[1]));
                    continue;
                }
                
                const numberedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
                if (numberedMatch) {
                    items.push(this.parseListItem(numberedMatch[1]));
                }
            }
            
            return items;
        },
        
        parseListItem(item) {
            const quantityMatch = item.match(/^(.+?)\s+x(\d+)$/i);
            if (quantityMatch) {
                return {
                    name: quantityMatch[1].trim(),
                    quantity: parseInt(quantityMatch[2], 10)
                };
            }
            
            const levelMatch = item.match(/^(.+?)\s*\(Lv\.?\s*(\d+)\)$/i);
            if (levelMatch) {
                return {
                    name: levelMatch[1].trim(),
                    level: parseInt(levelMatch[2], 10)
                };
            }
            
            return item;
        },
        
        parseTable(text) {
            const rows = [];
            const lines = text.split('\n');
            let headers = null;
            let inTable = false;
            
            for (const line of lines) {
                const trimmed = line.trim();
                
                if (trimmed.match(/^\|(.+)\|$/)) {
                    if (trimmed.match(/^\|[\s\-|]+\|$/)) continue;
                    
                    const cells = trimmed
                        .slice(1, -1)
                        .split('|')
                        .map(cell => cell.trim());
                    
                    if (!headers) {
                        headers = cells.map(h => StringUtils.toSnakeCase(h));
                        inTable = true;
                    } else {
                        const row = {};
                        headers.forEach((header, i) => {
                            row[header] = this.parseValue(cells[i] || '');
                        });
                        rows.push(row);
                    }
                } else if (inTable) {
                    break;
                }
            }
            
            return rows;
        },
        
        formatEncapsulated(data) {
            if (!data || typeof data !== 'object') return '';
            
            const lines = [];
            
            lines.push(`{# ${data.name || 'Unknown'}`);
            
            if (data.sections) {
                Object.entries(data.sections).forEach(([sectionName, content]) => {
                    lines.push('');
                    lines.push(`## ${StringUtils.toTitleCase(sectionName)}`);
                    lines.push(this.formatSectionContent(content));
                });
            }
            
            lines.push('}');
            
            return lines.join('\n');
        },
        
        formatSectionContent(content) {
            if (Array.isArray(content)) {
                return this.formatList(content);
            }
            
            if (typeof content === 'object' && content !== null) {
                const values = Object.values(content);
                if (values.length > 0 && values.every(v => typeof v === 'object' && !Array.isArray(v))) {
                    return this.formatTable(content);
                }
                
                return this.formatKeyValues(content);
            }
            
            return String(content);
        },
        
        formatKeyValues(obj) {
            return Object.entries(obj)
                .map(([key, value]) => {
                    const formattedKey = StringUtils.toTitleCase(key.replace(/_/g, ' '));
                    const formattedValue = this.formatValue(value);
                    return `${formattedKey}: ${formattedValue}`;
                })
                .join('\n');
        },
        
        formatValue(value) {
            if (value === null || value === undefined) return '';
            
            if (typeof value === 'object' && value.current !== undefined && value.max !== undefined) {
                return `${value.current}/${value.max}`;
            }
            
            if (typeof value === 'number' && value < 1 && value > 0) {
                return `${Math.round(value * 100)}%`;
            }
            
            return String(value);
        },
        
        formatList(items) {
            return items.map(item => {
                if (typeof item === 'object' && item.name) {
                    if (item.quantity !== undefined) {
                        return `- ${item.name} x${item.quantity}`;
                    }
                    if (item.level !== undefined) {
                        return `- ${item.name} (Lv ${item.level})`;
                    }
                }
                return `- ${item}`;
            }).join('\n');
        },
        
        formatTable(data) {
            const rows = Array.isArray(data) ? data : Object.values(data);
            if (rows.length === 0) return '';
            
            const headers = Object.keys(rows[0]);
            const headerRow = headers.map(h => StringUtils.toTitleCase(h.replace(/_/g, ' ')));
            
            const widths = headers.map((header, i) => {
                const values = [headerRow[i], ...rows.map(r => String(r[header] || ''))];
                return Math.max(...values.map(v => v.length));
            });
            
            const lines = [];
            
            lines.push('| ' + headerRow.map((h, i) => h.padEnd(widths[i])).join(' | ') + ' |');
            lines.push('|' + widths.map(w => '-'.repeat(w + 2)).join('|') + '|');
            
            rows.forEach(row => {
                const cells = headers.map((h, i) => String(row[h] || '').padEnd(widths[i]));
                lines.push('| ' + cells.join(' | ') + ' |');
            });
            
            return lines.join('\n');
        },
        
        removeComments(text) {
            return text.split('\n')
                .map(line => {
                    const commentIndex = line.indexOf('//');
                    return commentIndex >= 0 ? line.substring(0, commentIndex).trimEnd() : line;
                })
                .join('\n');
        },
        
        isList(text) {
            const lines = text.trim().split('\n');
            return lines.length > 0 && lines.every(line => 
                line.trim() === '' || 
                /^[-•*]\s+/.test(line.trim()) || 
                /^\d+\.\s+/.test(line.trim())
            );
        },
        
        isTable(text) {
            const lines = text.trim().split('\n');
            return lines.length >= 2 && lines[0].trim().startsWith('|') && lines[0].trim().endsWith('|');
        },
        
        parseUnencapsulated(text) {
            if (text.includes('##')) {
                return {
                    name: 'Unknown',
                    sections: this.parseSections(text)
                };
            }
            
            return {
                name: 'Unknown',
                sections: {
                    default: this.parseKeyValues(text)
                }
            };
        }
    };
    
    // =====================================
    // STRING UTILITIES
    // =====================================
    const StringUtils = {
        normalizeWhitespace(str) {
            return str.replace(/\s+/g, ' ').trim();
        },
        
        toSnakeCase(str) {
            return str
                .replace(/([A-Z])/g, '_$1')
                .replace(/[\s\-]+/g, '_')
                .replace(/_+/g, '_')
                .replace(/^_/, '')
                .toLowerCase();
        },
        
        toCamelCase(str) {
            return str
                .replace(/[_\-\s]+(.)/g, (_, char) => char.toUpperCase())
                .replace(/^(.)/, char => char.toLowerCase());
        },
        
        capitalize(str) {
            return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
        },
        
        toTitleCase(str) {
            return str.replace(/\b\w/g, char => char.toUpperCase());
        },
        
        truncate(str, maxLength, suffix = '...') {
            if (str.length <= maxLength) return str;
            return str.substring(0, maxLength - suffix.length) + suffix;
        },
        
        pad(str, length, char = ' ', direction = 'left') {
            const padding = char.repeat(Math.max(0, length - str.length));
            return direction === 'left' ? padding + str : str + padding;
        },
        
        sanitize(str, allowedChars = '') {
            const pattern = new RegExp(`[^a-zA-Z0-9\\s${allowedChars}]`, 'g');
            return str.replace(pattern, '');
        },
        
        extractNumbers(str) {
            const matches = str.match(/-?\d+\.?\d*/g);
            return matches ? matches.map(Number) : [];
        },
        
        parseBoolean(str) {
            const normalized = str.toLowerCase().trim();
            return ['true', 'yes', '1', 'on', 'enabled'].includes(normalized);
        }
    };
    
    // =====================================
    // MATH UTILITIES
    // =====================================
    const MathUtils = {
        hash(input) {
            let hash = 0;
            const str = String(input);
            
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            
            return Math.abs(hash);
        },
        
        seededRandom(seed, min = 0, max = 1) {
            const hash = this.hash(seed);
            const normalized = (hash % 10000) / 10000;
            return min + (normalized * (max - min));
        },
        
        clamp(value, min, max) {
            return Math.max(min, Math.min(max, value));
        },
        
        lerp(start, end, t) {
            return start + (end - start) * this.clamp(t, 0, 1);
        },
        
        percentage(value, total) {
            if (total === 0) return 0;
            return Math.round((value / total) * 100);
        },
        
        round(value, decimals = 0) {
            const factor = Math.pow(10, decimals);
            return Math.round(value * factor) / factor;
        },
        
        average(numbers) {
            if (!numbers || numbers.length === 0) return 0;
            const sum = numbers.reduce((a, b) => a + b, 0);
            return sum / numbers.length;
        },
        
        standardDeviation(numbers) {
            if (!numbers || numbers.length === 0) return 0;
            const avg = this.average(numbers);
            const squareDiffs = numbers.map(value => Math.pow(value - avg, 2));
            return Math.sqrt(this.average(squareDiffs));
        }
    };
    
    // =====================================
    // COLLECTION UTILITIES
    // =====================================
    const CollectionUtils = {
        groupBy(array, keyFn) {
            return array.reduce((groups, item) => {
                const key = keyFn(item);
                (groups[key] = groups[key] || []).push(item);
                return groups;
            }, {});
        },
        
        unique(array, keyFn = null) {
            if (!keyFn) return [...new Set(array)];
            
            const seen = new Set();
            return array.filter(item => {
                const key = keyFn(item);
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
        },
        
        chunk(array, size) {
            const chunks = [];
            for (let i = 0; i < array.length; i += size) {
                chunks.push(array.slice(i, i + size));
            }
            return chunks;
        },
        
        flatten(array, depth = 1) {
            if (depth <= 0) return array;
            return array.reduce((flat, item) => {
                if (Array.isArray(item)) {
                    return flat.concat(this.flatten(item, depth - 1));
                }
                return flat.concat(item);
            }, []);
        },
        
        sortBy(array, ...keyFns) {
            return [...array].sort((a, b) => {
                for (const keyFn of keyFns) {
                    const aVal = keyFn(a);
                    const bVal = keyFn(b);
                    if (aVal < bVal) return -1;
                    if (aVal > bVal) return 1;
                }
                return 0;
            });
        },
        
        pick(obj, keys) {
            return keys.reduce((picked, key) => {
                if (key in obj) picked[key] = obj[key];
                return picked;
            }, {});
        },
        
        omit(obj, keys) {
            const keysSet = new Set(keys);
            return Object.entries(obj).reduce((result, [key, value]) => {
                if (!keysSet.has(key)) result[key] = value;
                return result;
            }, {});
        },
        
        deepClone(obj) {
            if (obj === null || typeof obj !== 'object') return obj;
            if (obj instanceof Date) return new Date(obj.getTime());
            if (Array.isArray(obj)) return obj.map(item => this.deepClone(item));
            
            return Object.entries(obj).reduce((clone, [key, value]) => {
                clone[key] = this.deepClone(value);
                return clone;
            }, {});
        }
    };
    
    // =====================================
    // VALIDATION UTILITIES
    // =====================================
    const ValidationUtils = {
        isString(value) {
            return typeof value === 'string';
        },
        
        isNumber(value) {
            return typeof value === 'number' && !isNaN(value);
        },
        
        isInteger(value) {
            return Number.isInteger(value);
        },
        
        isArray(value) {
            return Array.isArray(value);
        },
        
        isObject(value) {
            return value !== null && typeof value === 'object' && !Array.isArray(value);
        },
        
        isFunction(value) {
            return typeof value === 'function';
        },
        
        isEmpty(value) {
            if (value == null) return true;
            if (Array.isArray(value) || typeof value === 'string') return value.length === 0;
            if (typeof value === 'object') return Object.keys(value).length === 0;
            return false;
        },
        
        inRange(value, min, max) {
            return value >= min && value <= max;
        },
        
        hasMinLength(str, minLength) {
            return str.length >= minLength;
        },
        
        hasMaxLength(str, maxLength) {
            return str.length <= maxLength;
        },
        
        matches(str, pattern) {
            return pattern.test(str);
        },
        
        isValidEntity(title) {
            return /^\[([A-Z]+)\]\s+(.+)$/.test(title);
        },
        
        sanitizeNumber(value, defaultValue = 0) {
            const num = Number(value);
            return isNaN(num) ? defaultValue : num;
        },
        
        sanitizeString(value, defaultValue = '') {
            return typeof value === 'string' ? value : defaultValue;
        }
    };
    
    // =====================================
    // FORMAT UTILITIES
    // =====================================
    const FormatUtils = {
        formatNumber(num, decimals = 0) {
            return num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        },
        
        formatCurrency(amount, symbol = 'col') {
            return `${this.formatNumber(amount)} ${symbol}`;
        },
        
        formatPercentage(value, decimals = 0) {
            return `${(value * 100).toFixed(decimals)}%`;
        },
        
        formatTime(hour, minute = 0) {
            const h = String(hour).padStart(2, '0');
            const m = String(minute).padStart(2, '0');
            return `${h}:${m}`;
        },
        
        formatDuration(seconds) {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;
            
            const parts = [];
            if (hours > 0) parts.push(`${hours}h`);
            if (minutes > 0) parts.push(`${minutes}m`);
            if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
            
            return parts.join(' ');
        },
        
        formatHealthBar(current, max, width = 20) {
            const percentage = Math.max(0, Math.min(1, current / max));
            const filled = Math.round(width * percentage);
            const empty = width - filled;
            
            return `[${'\u2588'.repeat(filled)}${'-'.repeat(empty)}]`;
        },
        
        formatList(items, bullet = '•') {
            return items.map(item => `${bullet} ${item}`).join('\n');
        },
        
        formatNumberedList(items) {
            return items.map((item, i) => `${i + 1}. ${item}`).join('\n');
        }
    };
    
    // =====================================
    // ENTITY UTILITIES
    // =====================================
    const EntityUtils = {
        parseEntity(title) {
            const match = title.match(/^\[([A-Z]+)\]\s+(.+)$/);
            if (!match) return null;
            
            return {
                type: match[1],
                name: match[2],
                fullTitle: title
            };
        },
        
        formatEntity(type, name) {
            return `[${type.toUpperCase()}] ${name}`;
        },
        
        extractEntities(text) {
            const pattern = /\[([A-Z]+)\]\s+([^[\]]+)/g;
            const matches = [];
            let match;
            
            while ((match = pattern.exec(text)) !== null) {
                matches.push({
                    type: match[1],
                    name: match[2],
                    fullMatch: match[0],
                    index: match.index
                });
            }
            
            return matches;
        },
        
        isPlayer(entity) {
            const parsed = typeof entity === 'string' ? this.parseEntity(entity) : entity;
            return parsed && parsed.type === 'PLAYER';
        },
        
        isNPC(entity) {
            const parsed = typeof entity === 'string' ? this.parseEntity(entity) : entity;
            return parsed && parsed.type === 'NPC';
        },
        
        isMonster(entity) {
            const parsed = typeof entity === 'string' ? this.parseEntity(entity) : entity;
            return parsed && parsed.type === 'MONSTER';
        },
        
        isItem(entity) {
            const parsed = typeof entity === 'string' ? this.parseEntity(entity) : entity;
            return parsed && parsed.type === 'ITEM';
        },
        
        generateId(type, name, seed = '') {
            const base = `${type}_${name}_${seed}`.toLowerCase().replace(/\s+/g, '_');
            return `${base}_${MathUtils.hash(base)}`;
        }
    };
    
    // =====================================
    // CACHE UTILITIES
    // =====================================
    class TurnCache {
        constructor() {
            this.caches = new Map();
            this.stats = new Map();
        }
        
        getCache(namespace) {
            if (!this.caches.has(namespace)) {
                this.caches.set(namespace, new Map());
                this.stats.set(namespace, { hits: 0, misses: 0, sets: 0 });
            }
            return this.caches.get(namespace);
        }
        
        get(namespace, key) {
            const cache = this.getCache(namespace);
            const stats = this.stats.get(namespace);
            
            if (cache.has(key)) {
                stats.hits++;
                return cache.get(key);
            }
            
            stats.misses++;
            return null;
        }
        
        set(namespace, key, value) {
            const cache = this.getCache(namespace);
            const stats = this.stats.get(namespace);
            
            cache.set(key, value);
            stats.sets++;
            
            return value;
        }
        
        has(namespace, key) {
            return this.getCache(namespace).has(key);
        }
        
        delete(namespace, key) {
            return this.getCache(namespace).delete(key);
        }
        
        clear(namespace = null) {
            if (namespace) {
                const cache = this.caches.get(namespace);
                if (cache) cache.clear();
            } else {
                this.caches.clear();
                this.stats.clear();
            }
        }
        
        getStats(namespace = null) {
            if (namespace) {
                return this.stats.get(namespace) || { hits: 0, misses: 0, sets: 0 };
            }
            
            const combined = { hits: 0, misses: 0, sets: 0 };
            this.stats.forEach(stats => {
                combined.hits += stats.hits;
                combined.misses += stats.misses;
                combined.sets += stats.sets;
            });
            return combined;
        }
    }
    
    // =====================================
    // STORY CARD OPERATIONS
    // =====================================
    const StoryCardOps = {
        get(title) {
            if (typeof title !== 'string') {
                throw new Error('[StoryCard] get requires a string title');
            }
            
            return this.find(c => c && c.title === title);
        },
        
        find(predicate, getAll = false) {
            if (typeof predicate !== 'function') {
                throw new Error('[StoryCard] find requires a function as first parameter');
            }
            if (typeof getAll !== 'boolean') {
                throw new Error('[StoryCard] find requires a boolean as second parameter');
            }
            
            try {
                if (typeof storyCards === 'undefined' || !Array.isArray(storyCards)) {
                    // console.log('[StoryCard] Warning: storyCards array not accessible');
                    return getAll ? [] : null;
                }
                
                const matches = [];
                
                for (const card of storyCards) {
                    if (predicate(card)) {
                        if (!getAll) {
                            return card;
                        }
                        matches.push(card);
                    }
                }
                
                return getAll ? matches : null;
            } catch (error) {
                // console.log(`[StoryCard] Error in find: ${error.message}`);
                return getAll ? [] : null;
            }
        },
        
        add(cardData, entry = '', type = 'character', keys = undefined, description = '', insertionIndex = 0) {
            try {
                if (typeof cardData === 'object' && cardData !== null) {
                    const title = cardData.title || '';
                    const cardEntry = cardData.entry || '';
                    const cardType = cardData.type || 'character';
                    const cardKeys = cardData.keys || title;
                    const cardDesc = cardData.description || '';
                    const cardIndex = cardData.insertionIndex || 0;
                    
                    return this.buildCard(title, cardEntry, cardType, cardKeys, cardDesc, cardIndex);
                }
                
                if (typeof cardData === 'string') {
                    const title = cardData;
                    keys = keys || title;
                    return this.buildCard(title, entry, type, keys, description, insertionIndex);
                }
                
                // console.log('[StoryCard] Error: Invalid parameters for add');
                return null;
            } catch (error) {
                // console.log(`[StoryCard] Error in add: ${error.message}`);
                return null;
            }
        },
        
        update(title, updates) {
            try {
                const card = this.get(title);
                if (!card) {
                    // console.log(`[StoryCard] Error: Card '${title}' not found`);
                    return false;
                }
                
                if (updates.entry !== undefined) card.entry = updates.entry;
                if (updates.keys !== undefined) card.keys = updates.keys;
                if (updates.description !== undefined) card.description = updates.description;
                if (updates.type !== undefined) card.type = updates.type;
                
                turnCache.delete('storyCards', title);
                
                return true;
            } catch (error) {
                // console.log(`[StoryCard] Error updating card '${title}': ${error.message}`);
                return false;
            }
        },
        
        remove(predicate, removeAll = false) {
            if (typeof predicate === 'string') {
                const title = predicate;
                predicate = card => card && card.title === title;
                removeAll = false;
            }
            
            if (typeof predicate === 'object' && predicate !== null && predicate.title) {
                const title = predicate.title;
                predicate = card => card && card.title === title;
                removeAll = false;
            }
            
            if (typeof predicate !== 'function') {
                throw new Error('[StoryCard] remove requires function, object, or string');
            }
            if (typeof removeAll !== 'boolean') {
                throw new Error('[StoryCard] remove requires boolean as second parameter');
            }
            
            try {
                if (typeof removeStoryCard !== 'function') {
                    // console.log('[StoryCard] Error: removeStoryCard is not available');
                    return removeAll ? 0 : false;
                }
                
                if (typeof storyCards === 'undefined' || !Array.isArray(storyCards)) {
                    // console.log('[StoryCard] Error: storyCards array not available');
                    return removeAll ? 0 : false;
                }
                
                if (!removeAll) {
                    for (let i = 0; i < storyCards.length; i++) {
                        if (storyCards[i] && predicate(storyCards[i])) {
                            removeStoryCard(i);
                            turnCache.clear('storyCards');
                            return true;
                        }
                    }
                    return false;
                } else {
                    let removed = 0;
                    for (let i = storyCards.length - 1; i >= 0; i--) {
                        if (storyCards[i] && predicate(storyCards[i])) {
                            removeStoryCard(i);
                            removed++;
                        }
                    }
                    turnCache.clear('storyCards');
                    return removed;
                }
            } catch (error) {
                // console.log(`[StoryCard] Error in remove: ${error.message}`);
                return removeAll ? 0 : false;
            }
        },
        
        upsert(cardData) {
            const existing = this.get(cardData.title);
            
            if (existing) {
                const updates = {};
                if (cardData.entry !== undefined) updates.entry = cardData.entry;
                if (cardData.keys !== undefined) {
                    updates.keys = Array.isArray(cardData.keys) ? 
                        cardData.keys.join(',') : cardData.keys;
                }
                if (cardData.description !== undefined) updates.description = cardData.description;
                if (cardData.type !== undefined) updates.type = cardData.type;
                
                return this.update(cardData.title, updates);
            } else {
                return this.add(cardData);
            }
        },
        
        exists(title) {
            return this.get(title) !== null;
        },
        
        buildCard(title = '', entry = '', type = 'class', keys = title, description = '', insertionIndex = 0) {
            if (![type, title, keys, entry, description].every(arg => (typeof arg === 'string'))) {
                throw new Error('buildCard must be called with strings for title, entry, type, keys, and description');
            } else if (!Number.isInteger(insertionIndex)) {
                throw new Error('buildCard must be called with an integer for insertionIndex');
            } else {
                insertionIndex = Math.min(Math.max(0, insertionIndex), storyCards.length);
            }
            
            addStoryCard('%@%');
            
            for (const [index, card] of storyCards.entries()) {
                if (card.title !== '%@%') {
                    continue;
                }
                card.type = type;
                card.title = title;
                card.keys = keys;
                card.entry = entry;
                card.description = description;
                if (index !== insertionIndex) {
                    storyCards.splice(index, 1);
                    storyCards.splice(insertionIndex, 0, card);
                }
                
                turnCache.delete('storyCards', title);
                
                return Object.seal(card);
            }
            throw new Error('An unexpected error occurred with buildCard');
        }
    };
    
    // =====================================
    // HISTORY UTILITIES
    // =====================================
    const HistoryUtils = {
        readPastAction(lookBack) {
            const action = (function() {
                if (Array.isArray(history)) {
                    return (history[(function() {
                        const index = history.length - 1 - Math.abs(lookBack);
                        if (index < 0) {
                            return 0;
                        } else {
                            return index;
                        }
                    })()]);
                } else {
                    return Object.freeze({});
                }
            })();
            return Object.freeze({
                text: action?.text ?? (action?.rawText ?? ""),
                type: action?.type ?? "unknown"
            });
        },
        
        searchHistory(pattern, maxLookBack = 10) {
            const matches = [];
            const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern, 'i');
            
            for (let i = 0; i < maxLookBack; i++) {
                const action = this.readPastAction(i);
                if (action.text && regex.test(action.text)) {
                    matches.push({
                        index: i,
                        action: action,
                        match: action.text.match(regex)
                    });
                }
            }
            
            return matches;
        },
        
        getActionRange(start, count) {
            const actions = [];
            
            for (let i = start; i < start + count; i++) {
                const action = this.readPastAction(i);
                if (action.text) {
                    actions.push(action);
                }
            }
            
            return actions;
        },
        
        countActionType(type, lookBack = 20) {
            let count = 0;
            
            for (let i = 0; i < lookBack; i++) {
                const action = this.readPastAction(i);
                if (action.type === type) {
                    count++;
                }
            }
            
            return count;
        }
    };

    // =====================================
    // COMMON PATTERNS
    // =====================================
    const CommonPatterns = {
        // Entity patterns
        entityTitle: /^\[([A-Z]+)\]\s+(.+)$/,
        entityReference: /\[([A-Z]+)\]\s+([^[\]]+)/g,
        capitalizedName: /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g,
        
        // Number patterns
        integer: /-?\d+/g,
        decimal: /-?\d+\.?\d*/g,
        percentage: /(\d+(?:\.\d+)?)\s*%/g,
        range: /(\d+)\s*[-\/]\s*(\d+)/,
        
        // Game/Action patterns
        damage: /(\d+)\s+damage\b/gi,
        healing: /(?:healed?|restored?)\s+(\d+)\s+(?:HP|health)/gi,
        critical: /\b(?:critical|crit)\s+(?:hit|strike)\b/gi,
        
        // Item patterns
        itemQuantity: /(.+?)\s+x(\d+)$/i,
        itemEnhancement: /(.+?)\s*\+(\d+)$/,
        currency: /(\d+)\s*col\b/gi,
        rarity: /\b(Common|Uncommon|Rare|Epic|Legendary)\b/gi,
        
        // Command patterns
        command: /^\/(\w+)(?:\s+(.+))?$/,
        mention: /@(\w+)/g,
        
        // Text structure patterns
        encapsulation: /^\{#\s*(.+?)\s*\n([\s\S]*)\}$/,
        primaryHeader: /^#\s+(.+)$/m,
        sectionHeader: /^##\s+(.+)$/gm,
        subSectionHeader: /^###\s+(.+)$/gm,
        keyValue: /^([^:]+):\s*(.+)$/gm,
        bulletList: /^[-•*]\s+(.+)$/gm,
        numberedList: /^\d+\.\s+(.+)$/gm,
        tableRow: /^\|(.+)\|$/gm,
        comment: /\/\/.*$/gm,
        
        // Time patterns
        timeFormat: /(\d{1,2}):(\d{2})(?::(\d{2}))?/,
        duration: /(\d+)\s*(hours?|minutes?|seconds?|days?)/gi
    };
    
    // =====================================
    // PUBLIC API - Singleton instance
    // =====================================
    const regexCache = new RegexCache();
    regexCache.precompileAll(CommonPatterns);
    
    const turnCache = new TurnCache();
    
    // Freeze the API to prevent modification
    return Object.freeze({
        // Core APIs
        plainText: PlainTextParser,
        string: StringUtils,
        math: MathUtils,
        collection: CollectionUtils,
        validation: ValidationUtils,
        format: FormatUtils,
        entity: EntityUtils,
        storyCard: StoryCardOps,
        history: HistoryUtils,
        
        // Cache systems
        regex: regexCache,
        cache: turnCache,
        patterns: CommonPatterns,
        
        /**
         * Clear all caches (regex and turn-based)
         * Useful for memory management or testing
         */
        clearAll() {
            this.regex.clear();
            this.cache.clear();
            // console.log('[Utilities] All caches cleared');
        }
    });
})();

function Calendar(hook, text) {
    'use strict';
    
    // Usage in Scripting Sandbox:
    // Input Modifier: 
    //   text = Calendar("input", text);
    // Context Modifier: 
    //   Calendar("context");
    //
    // Configuration Cards:
    //   [CALENDAR] Time Configuration - Main time system settings
    //   [CALENDAR] Event Days - Holiday and event definitions
    //   [CALENDAR] Event Days 2, 3... - Additional event cards. Probably unnecessary bc I extended to description but oh well.
    //
    // API Methods:
    // Time Methods:
    //   Calendar.getCurrentTime() - Returns current time as HH:MM
    //   Calendar.getFormattedTime() - Returns time with AM/PM
    //   Calendar.getTimeOfDay() - Returns time period name (e.g., "Morning", "Evening")
    //   Calendar.getDayProgress() - Returns progress through day (0.0-1.0)
    //
    // Date Methods:
    //   Calendar.getCurrentDate() - Returns full formatted date string
    //   Calendar.getDayOfWeek() - Returns day name (e.g., "Monday")
    //   Calendar.getDayOfMonth() - Returns day number in month (1-31)
    //   Calendar.getMonth() - Returns month name (e.g., "January")
    //   Calendar.getYear() - Returns current year number
    //   Calendar.getDayNumber() - Returns current day number (e.g., day 457)
    //   Calendar.getDayOfYear() - Returns day within current year (e.g., Feb 14 = day 45)
    //
    // Season Methods:
    //   Calendar.getCurrentSeason() - Returns current season name
    //   Calendar.getYearProgress() - Returns year completion (0.0-1.0)
    //
    // Event Methods:
    //   Calendar.getTodayEvents() - Returns array of today's events
    //   Calendar.getUpcomingEvents(days) - Returns events in next N days
    //   Calendar.getAllEvents() - Returns all configured events
    //   Calendar.isEventDay() - Returns true if today has events
    //   Calendar.getMonthWeekdays(offset) - Returns weekday map for a month
    //     Returns: {month: "November", year: 2023, weekdays: {Monday: [6,13,20,27], ...}}
    //   Calendar.clearEventCache() - Force reload of event configuration
    //
    // Core Methods:
    //   Calendar.getState() - Returns full time state
    //   Calendar.getConfig() - Returns configuration
    //   Calendar.events - Array of time events this turn
    //     Event types: 'dayChanged', 'seasonChanged', 'eventDay', 'timeReversed', 'timeOfDayChanged'
    //     Event data includes:
    //       - dayChanged: {previousDay, currentDay, state}
    //       - seasonChanged: {previousSeason, currentSeason, state}
    //       - eventDay: {events, date, state}
    //       - timeReversed: {state, reversed: true}
    //       - timeOfDayChanged: {previousPeriod, currentPeriod, state}
    //     State object contains:
    //       - day: Current day number (can be negative, 0, 200, etc.)
    //       - progress: Actions completed in current day (0 to actionsPerDay-1)
    //       - lastProcessedAction: Last action count processed
    //
    // Time Manipulation Methods:
    //   Calendar.advanceTime(timeSpec) - Skip forward/backward in time (e.g., "3d", "-2h"), returns true on success
    //   Calendar.setTime(hour, minute) - Set time on current day, returns true on success
    //   Calendar.setDay(day) - Jump to specific day number, returns true on success
    //   Calendar.setActionsPerDay(number) - Update actions per day config, returns true on success
    //   Calendar.setHoursPerDay(number) - Update hours per day config, returns true on success
    //
    // Time State card is the single source of truth
    // Day number in state can be any value (negative, 0, 200, etc.)
    // Progress in state determines time of day (0 to actionsPerDay-1)
    // All configuration must come from [CALENDAR] cards
    //
    // Example Usage:
    //   const time = Calendar.getCurrentTime();        // "14:30"
    //   const time12 = Calendar.getFormattedTime();    // "2:30 PM"
    //   const period = Calendar.getTimeOfDay();        // "Afternoon"
    //   const day = Calendar.getDayOfWeek();           // "Tuesday"
    //   const month = Calendar.getMonth();             // "July"
    //   const dayNum = Calendar.getDayOfMonth();       // 15
    //   const dayOfYear = Calendar.getDayOfYear();     // 196 (July 15 = 196th day)
    //   const totalDays = Calendar.getDayNumber();     // 621 (current day number)
    //   const season = Calendar.getCurrentSeason();    // "Summer"
    //   const events = Calendar.getTodayEvents();      // [{name: "Festival", ...}]
    //   const upcoming = Calendar.getUpcomingEvents(7); // Events in next week
    //   const monthMap = Calendar.getMonthWeekdays(0); // Current month's weekday map
    //   const fullDate = Calendar.getCurrentDate();    // "Tuesday, July 15, 2023"
    //
    // Time Manipulation Examples:
    //   Calendar.advanceTime("3h");                     // Skip forward 3 hours
    //   Calendar.advanceTime("2d");                     // Skip forward 2 days
    //   Calendar.advanceTime("-4h");                    // Go back 4 hours
    //   Calendar.advanceTime("2d, 3h, 30m");            // Skip 2 days, 3 hours, 30 minutes
    //   Calendar.advanceTime("2h30m");                  // Skip 2 hours 30 minutes
    //   Calendar.setTime(14, 30);                       // Set time to 14:30
    //   Calendar.setDay(200);                           // Jump to day 200
    //   Calendar.setDay(-30);                           // Jump to 30 days before start
    //   Calendar.setActionsPerDay(300);                 // Change to 300 actions per day
    //   Calendar.setHoursPerDay(20);                    // Change to 20-hour days
    //
    // Event Configuration Examples:
    //   - Fixed Annual: "Christmas: 12/25"
    //   - Relative Annual: "Thanksgiving: 4th Thursday of November"
    //   - Periodic: "Olympics: 7/1/2024 every 4 years"
    //   - One-time: "Solar Eclipse: 4/8/2024 once"
    //   - Relative Periodic: "Mages Meeting: 1st Monday of January 2024 every 3 years"
    
    // Module constants
    const debug = false;
    const MODULE_NAME = 'Time';
    const CONFIG_CARD = '[CALENDAR] Time Configuration';
    const STATE_CARD = '[CALENDAR] Time State';
    const EVENT_CARD_PREFIX = '[CALENDAR] Event Days';
    
    // Module-level cache for events (valid for this turn only)
    let eventCache = null;
    
    // Configuration Management
    function loadConfiguration() {
        const configCard = Utilities.storyCard.get(CONFIG_CARD);
        if (!configCard) {
            if (debug) console.log('[Time] No configuration found, creating default');
            createDefaultConfiguration();
            
            // Also create default event days card
            if (!Utilities.storyCard.exists(EVENT_CARD_PREFIX)) {
                createDefaultEventDays();
            }
            
            return loadConfiguration();
        }
        
        // Ensure command documentation is present
        if (!configCard.description || !configCard.description.includes('TIME SYSTEM COMMANDS')) {
            Utilities.storyCard.update(CONFIG_CARD, {
                description: getCommandDocumentation()
            });
        }
        
        const configText = configCard.entry || configCard.value || '';
        if (!configText) {
            if (debug) console.log('[Time] ERROR: Configuration card is empty. Time system requires configuration.');
            return null;
        }
        
        const lines = configText.split('\n');
        const config = {};
        let hasRequiredFields = true;
        
        // Parse basic configuration values
        for (const line of lines) {
            if (line.includes('Actions Per Day:')) {
                config.actionsPerDay = parseInt(line.split(':')[1].trim());
            } else if (line.includes('Start Date:')) {
                config.startDate = line.split(':')[1].trim();
            } else if (line.includes('Hours Per Day:')) {
                config.hoursPerDay = parseInt(line.split(':')[1].trim());
            }
        }
        
        // Validate required fields
        if (!config.actionsPerDay || !config.startDate || !config.hoursPerDay) {
            if (debug) console.log('[Time] ERROR: Missing required configuration fields');
            return null;
        }
        
        const sections = Utilities.plainText.parseSections(configText);
        
        // Parse sections - Utilities.plainText.parseSections returns snake_case keys
        const daysSection = sections.days_of_week;
        const monthsSection = sections.months;
        const periodsSection = sections.time_periods;
        const seasonsSection = sections.seasons;
        const leapSection = sections.leap_year;
        
        // Time Periods - required
        config.timePeriods = parseTimePeriods(periodsSection);
        if (!config.timePeriods || Object.keys(config.timePeriods).length === 0) {
            if (debug) console.log('[Time] ERROR: No time periods defined in configuration');
            return null;
        }
        
        // Seasons - optional
        config.seasons = parseSeasons(seasonsSection);
        
        // Days of Week - required
        config.daysOfWeek = parseDaysOfWeek(daysSection);
        if (!config.daysOfWeek || config.daysOfWeek.length === 0) {
            if (debug) console.log('[Time] ERROR: No days of week defined in configuration');
            return null;
        }
        
        // Months - required
        const monthData = parseMonths(monthsSection);
        if (!monthData || monthData.names.length === 0) {
            if (debug) console.log('[Time] ERROR: No months defined in configuration');
            return null;
        }
        config.months = monthData.names;
        config.daysPerMonth = monthData.days;
        
        // Leap Year - optional but fully defined if present
        if (leapSection) {
            config.leapYear = parseLeapYear(leapSection, config.months);
        }
        
        return config;
    }
    
    function parseTimePeriods(periodsData) {
        if (!periodsData) return null;
        
        const periods = {};
        
        // If it's an array from Utilities.plainText.parseList
        if (Array.isArray(periodsData)) {
            periodsData.forEach(item => {
                const itemStr = typeof item === 'string' ? item : String(item);
                const match = itemStr.match(/^(.+?):\s*([\d.]+)-([\d.]+)$/);
                if (match) {
                    const name = match[1].trim();
                    const start = parseFloat(match[2]);
                    const end = parseFloat(match[3]);
                    const key = Utilities.string.toCamelCase(name);
                    
                    periods[key] = {
                        name: name,
                        start: start,
                        end: end
                    };
                    
                    if (start > end) {
                        periods[key].wrapsAround = true;
                    }
                }
            });
        } else {
            if (debug) console.log('[Time] Warning: Time periods data not in expected array format');
            return null;
        }
        
        return Object.keys(periods).length > 0 ? periods : null;
    }
    
    function parseSeasons(seasonsData) {
        if (!seasonsData) return null;
        
        const seasons = {};
        
        // If it's an array from Utilities.plainText.parseList
        if (Array.isArray(seasonsData)) {
            seasonsData.forEach(item => {
                const itemStr = typeof item === 'string' ? item : String(item);
                const match = itemStr.match(/^(.+?):\s*([\d.]+)-([\d.]+)$/);
                if (match) {
                    const name = match[1].trim();
                    const start = parseFloat(match[2]);
                    const end = parseFloat(match[3]);
                    const key = Utilities.string.toCamelCase(name);
                    
                    seasons[key] = {
                        name: name,
                        start: start,
                        end: end
                    };
                    
                    // Check for wraparound (like Winter 0.95-0.2)
                    if (start > end) {
                        seasons[key].wrapsAround = true;
                    }
                }
            });
        } else {
            if (debug) console.log('[Time] Warning: Seasons data not in expected array format');
            return null;
        }
        
        return Object.keys(seasons).length > 0 ? seasons : null;
    }
    
    function parseDaysOfWeek(daysData) {
        if (!daysData) return null;
        
        // If already an array (from Utilities.plainText.parseList), just return it
        if (Array.isArray(daysData)) {
            return daysData.length > 0 ? daysData : null;
        }
        
        // Shouldn't reach here with proper utilities parsing, but keep as fallback
        if (debug) console.log('[Time] Warning: Days data not in expected array format');
        return null;
    }
    
    function parseMonths(monthsData) {
        if (!monthsData) return null;
        
        const names = [];
        const days = [];
        
        // If it's an array from Utilities.plainText.parseList
        if (Array.isArray(monthsData)) {
            monthsData.forEach(item => {
                // Utilities.parseListItem returns the item as-is if no special format
                const itemStr = typeof item === 'string' ? item : String(item);
                const match = itemStr.match(/^(.+?)(?:\s*:\s*(\d+))?$/);
                if (match) {
                    const monthName = match[1].trim();
                    const monthDays = match[2] ? parseInt(match[2]) : 30;
                    if (monthName) {
                        names.push(monthName);
                        days.push(monthDays);
                    }
                }
            });
        } else {
            if (debug) console.log('[Time] Warning: Months data not in expected array format');
            return null;
        }
        
        if (names.length === 0) return null;
        
        return { names, days };
    }
    
    function parseLeapYear(leapData, monthNames) {
        if (!leapData || !monthNames) return null;
        
        const leap = {};
        
        // leapData should be an object from Utilities.plainText.parseKeyValues
        if (typeof leapData === 'object' && !Array.isArray(leapData)) {
            // Utilities converts to snake_case and parses values
            leap.enabled = leapData.enabled === true;
            
            // Common fields
            if (leapData.frequency) leap.frequency = leapData.frequency;
            if (leapData.skip_frequency !== undefined) leap.skipFrequency = leapData.skip_frequency;
            if (leapData.skip_exception !== undefined) leap.skipExceptionFrequency = leapData.skip_exception;
            if (leapData.start_year !== undefined) leap.startYear = leapData.start_year;
            
            // Initialize adjustments object
            leap.adjustments = {};
            
            // Check for adjustments list
            if (leapData.adjustments && Array.isArray(leapData.adjustments)) {
                for (const adjustment of leapData.adjustments) {
                    if (typeof adjustment === 'string') {
                        // Parse "Month: +/-X" format
                        const match = adjustment.match(/^(.+?):\s*([+-]?\d+)$/);
                        if (match) {
                            const monthName = match[1].trim();
                            const dayAdjustment = parseInt(match[2]);
                            
                            const monthIndex = monthNames.findIndex(m => 
                                m.toLowerCase() === monthName.toLowerCase()
                            );
                            
                            if (monthIndex !== -1) {
                                leap.adjustments[monthIndex] = dayAdjustment;
                            } else {
                                if (debug) console.log(`[Time] WARNING: Unknown month in leap adjustment: ${monthName}`);
                            }
                        }
                    }
                }
            }
            
            // Backwards compatibility: Check for old "Month: name" format
            if (leapData.month && Object.keys(leap.adjustments).length === 0) {
                const monthName = String(leapData.month);
                const monthIndex = monthNames.findIndex(m => 
                    m.toLowerCase() === monthName.toLowerCase()
                );
                
                if (monthIndex !== -1) {
                    // Default to +1 day for backwards compatibility
                    leap.adjustments[monthIndex] = 1;
                    if (debug) console.log(`[Time] Converting legacy leap year format to new format: ${monthName} +1`);
                } else {
                    if (debug) console.log(`[Time] WARNING: Unknown month in legacy leap year: ${monthName}`);
                }
            }
            
            // Must have at least one adjustment
            if (Object.keys(leap.adjustments).length === 0) {
                if (debug) console.log('[Time] WARNING: No leap year adjustments defined');
                return null;
            }
        } else {
            if (debug) console.log('[Time] Warning: Leap year data not in expected object format');
            return null;
        }
        
        // Validate leap year configuration if enabled
        if (leap.enabled && (!leap.adjustments || !leap.frequency)) {
            if (debug) console.log('[Time] WARNING: Leap year enabled but configuration incomplete');
            return null;
        }
        
        // Set defaults for optional fields
        if (leap.skipFrequency === undefined) leap.skipFrequency = 0;
        if (leap.skipExceptionFrequency === undefined) leap.skipExceptionFrequency = 0;
        if (leap.startYear === undefined) leap.startYear = 0;
        
        return leap;
    }
    
    function loadEventDays() {
        // Return cached events if available
        if (eventCache !== null) {
            return eventCache;
        }
        
        try {
            const eventsList = [];
            
            // Check for multiple event cards
            let cardNumber = 1;
            let cardTitle = EVENT_CARD_PREFIX;
            
            while (true) {
                // Build card title
                if (cardNumber > 1) {
                    cardTitle = `${EVENT_CARD_PREFIX} ${cardNumber}`;
                }
                
                const eventCard = Utilities.storyCard.get(cardTitle);
                if (!eventCard) break;
                
                // Parse events from both entry and description
                const entryEvents = parseEventList(eventCard.entry || '');
                const descEvents = parseEventList(eventCard.description || '');
                
                eventsList.push(...entryEvents, ...descEvents);
                
                cardNumber++;
                if (cardNumber > 10) break; // Safety limit
            }
            
            // Remove duplicates and sort by date
            const uniqueEvents = removeDuplicateEvents(eventsList);
            
            // Cache the result
            eventCache = uniqueEvents;
            
            return uniqueEvents;
        } catch (error) {
            if (debug) console.log('[Time] Error loading event days:', error.message);
            eventCache = [];
            return [];
        }
    }
    
    function parseEventList(text) {
        if (!text || typeof text !== 'string') return [];
        
        const eventsList = [];
        const lines = text.split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            // Skip empty lines and comments
            if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) continue;
            
            // Skip section headers
            if (trimmed.startsWith('##')) continue;
            
            // Parse event line
            const event = parseEventLine(trimmed);
            if (event) eventsList.push(event);
        }
        
        return eventsList;
    }
    
    function parseEventLine(line) {
        // Remove bullet points if present
        const cleaned = line.replace(/^[-•*]\s*/, '').trim();
        if (!cleaned) return null;
        
        // First check for nth weekday format: "Event: 4th Thursday of November"
        const nthWeekdayMatch = cleaned.match(/^(.+?):\s*(1st|2nd|3rd|4th|5th|last)\s+(\w+)\s+of\s+(\w+)\s*(.*)$/i);
        if (nthWeekdayMatch) {
            const name = nthWeekdayMatch[1].trim();
            const nth = nthWeekdayMatch[2].toLowerCase();
            const weekday = nthWeekdayMatch[3];
            const monthName = nthWeekdayMatch[4];
            const modifiers = nthWeekdayMatch[5].trim().toLowerCase();
            
            // Find month index
            const config = loadConfiguration();
            if (!config) return null;
            
            const monthIndex = config.months.findIndex(m => 
                m.toLowerCase() === monthName.toLowerCase()
            );
            if (monthIndex === -1) {
                if (debug) console.log(`[Time] Invalid month in event: ${name} (${monthName})`);
                return null;
            }
            
            // Find weekday index
            const weekdayIndex = config.daysOfWeek.findIndex(d => 
                d.toLowerCase() === weekday.toLowerCase()
            );
            if (weekdayIndex === -1) {
                if (debug) console.log(`[Time] Invalid weekday in event: ${name} (${weekday})`);
                return null;
            }
            
            // Convert nth string to number
            let nthNum;
            if (nth === 'last') {
                nthNum = -1;
            } else {
                nthNum = parseInt(nth.replace(/[^\d]/g, ''));
                if (isNaN(nthNum) || nthNum < 1 || nthNum > 5) {
                    if (debug) console.log(`[Time] Invalid nth value in event: ${name} (${nth})`);
                    return null;
                }
            }
            
            const event = {
                name: name,
                month: monthIndex,
                type: 'relative',
                nth: nthNum,
                weekday: weekdayIndex
            };
            
            // Check for year constraints
            if (modifiers) {
                const yearMatch = modifiers.match(/(\d{4})/);
                if (yearMatch) {
                    event.startYear = parseInt(yearMatch[1]);
                    
                    if (modifiers.includes('once') || modifiers.includes('only')) {
                        event.onlyYear = event.startYear;
                        delete event.startYear;
                    } else if (modifiers.includes('every')) {
                        const everyMatch = modifiers.match(/every\s+(\d+)\s+years?/);
                        if (everyMatch) {
                            event.frequency = parseInt(everyMatch[1]);
                        }
                    }
                }
            }
            
            return event;
        }
        
        // Original date format: "Event Name: MM/DD/YYYY every N years" or "Event Name: MM/DD" etc.
        const match = cleaned.match(/^(.+?):\s*(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\s*(.*)$/);
        if (!match) return null;
        
        const name = match[1].trim();
        const month = parseInt(match[2]) - 1; // 0-indexed
        const day = parseInt(match[3]);
        const year = match[4] ? parseInt(match[4]) : null;
        const modifiers = match[5].trim().toLowerCase();
        
        // Get configuration to validate month/day
        const config = loadConfiguration();
        if (!config) return null;
        
        // Validate month
        if (month < 0 || month >= config.months.length) {
            if (debug) console.log(`[Time] Invalid month in event: ${name} (${match[2]})`);
            return null;
        }
        
        // Validate day (but allow days that might only exist in leap years)
        const maxDaysInMonth = config.daysPerMonth[month];
        let leapMonthDays = maxDaysInMonth;
        
        // Check if this month could have extra days in leap years
        if (config.leapYear && config.leapYear.enabled && config.leapYear.adjustments) {
            const adjustment = config.leapYear.adjustments[month];
            if (adjustment && adjustment > 0) {
                leapMonthDays = maxDaysInMonth + adjustment;
            }
        }
                              
        if (day < 1 || day > leapMonthDays) {
            if (debug) console.log(`[Time] Invalid day in event: ${name} (${match[3]} in ${config.months[month]})`);
            return null;
        }
        
        const event = {
            name: name,
            month: month,
            day: day,
            type: 'annual' // default
        };
        
        // Parse modifiers
        if (year) {
            event.year = year;
            
            if (modifiers.includes('once') || modifiers.includes('one-off') || modifiers.includes('only')) {
                event.type = 'once';
            } else if (modifiers.includes('every')) {
                const everyMatch = modifiers.match(/every\s+(\d+)\s+years?/);
                if (everyMatch) {
                    event.type = 'periodic';
                    event.frequency = parseInt(everyMatch[1]);
                }
            } else {
                // If year is specified but no modifier, assume once
                event.type = 'once';
            }
        }
        
        // Parse additional modifiers
        if (modifiers.includes('annual') || modifiers.includes('yearly')) {
            event.type = 'annual';
            delete event.year; // Annual events don't need a year
        }
        
        return event;
    }
    
    function removeDuplicateEvents(eventsList) {
        const seen = new Set();
        const unique = [];
        
        for (const event of eventsList) {
            let key;
            if (event.type === 'relative') {
                key = `${event.name}:${event.month}:${event.nth}:${event.weekday}:relative:${event.onlyYear || ''}:${event.frequency || ''}`;
            } else {
                key = `${event.name}:${event.month}:${event.day}:${event.type}:${event.year || ''}`;
            }
            
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(event);
            }
        }
        
        return unique;
    }
    
    function checkEventDay(month, day, year, eventsList, config = null) {
        const todayEvents = [];
        
        try {
            // Get configuration if not provided
            if (!config) {
                config = loadConfiguration();
                if (!config) return todayEvents;
            }
            
            // Check if this day exists in this month/year (handles leap days)
            const daysInMonth = getDaysInMonth(month, year, config);
            if (day > daysInMonth) {
                return todayEvents; // This day doesn't exist (e.g., Feb 30)
            }
            
            for (const event of eventsList) {
                // Handle relative date events (nth weekday of month)
                if (event.type === 'relative') {
                    if (event.month !== month) continue;
                    
                    // Check year constraints
                    if (event.onlyYear && event.onlyYear !== year) continue;
                    if (event.startYear && event.frequency) {
                        const yearsSince = year - event.startYear;
                        if (yearsSince < 0 || yearsSince % event.frequency !== 0) continue;
                    }
                    
                    // Calculate the actual day for this event
                    const eventDay = calculateNthWeekdayOfMonth(event.nth, event.weekday, month, year, config);
                    
                    if (eventDay === day) {
                        todayEvents.push(event);
                    }
                    continue;
                }
                
                // Handle fixed date events
                if (event.month !== month || event.day !== day) continue;
                
                // For events on days that don't always exist (like Feb 29)
                // They'll only trigger when the day actually exists
                
                switch (event.type) {
                    case 'annual':
                        // Happens every year (when the date exists)
                        todayEvents.push(event);
                        break;
                        
                    case 'once':
                        // Only happens on specific year
                        if (event.year === year) {
                            todayEvents.push(event);
                        }
                        break;
                        
                    case 'periodic':
                        // Happens every N years from start year
                        if (event.year && event.frequency) {
                            const yearsSince = year - event.year;
                            if (yearsSince >= 0 && yearsSince % event.frequency === 0) {
                                todayEvents.push(event);
                            }
                        }
                        break;
                }
            }
        } catch (error) {
            if (debug) console.log('[Time] Error checking events:', error.message);
        }
        
        return todayEvents;
    }
    
    function calculateNthWeekdayOfMonth(nth, weekday, month, year, config) {
        // Calculate what day the nth weekday of the month falls on
        // nth: 1-5 for 1st-5th, -1 for last
        // weekday: 0-6 (index in daysOfWeek array)
        
        // Get what weekday the 1st of the month is
        const firstDayWeekday = getDayOfWeekForDate(month, 1, year, config);
        
        // Calculate offset to first occurrence of target weekday
        let daysUntilFirst = weekday - firstDayWeekday;
        if (daysUntilFirst < 0) daysUntilFirst += config.daysOfWeek.length;
        
        if (nth === -1) {
            // Last occurrence - work backwards from end of month
            const daysInMonth = getDaysInMonth(month, year, config);
            const lastDayWeekday = getDayOfWeekForDate(month, daysInMonth, year, config);
            
            let daysFromLast = lastDayWeekday - weekday;
            if (daysFromLast < 0) daysFromLast += config.daysOfWeek.length;
            
            return daysInMonth - daysFromLast;
        } else {
            // Nth occurrence
            const targetDay = 1 + daysUntilFirst + (nth - 1) * config.daysOfWeek.length;
            
            // Check if this day exists in the month
            const daysInMonth = getDaysInMonth(month, year, config);
            if (targetDay > daysInMonth) {
                return null; // No nth occurrence this month
            }
            
            return targetDay;
        }
    }
    
    function getDayOfWeekForDate(month, day, year, config) {
        // Calculate day of week for a specific date
        // We need to count total days from start date to this date
        
        const startParts = config.startDate.split('/');
        const startMonth = parseInt(startParts[0]) - 1;
        const startDay = parseInt(startParts[1]);
        const startYear = parseInt(startParts[2]);
        
        // Calculate how many days from start to target date
        const targetInfo = { month, day, year };
        const startInfo = { month: startMonth, day: startDay, year: startYear };
        
        // Get the number of days between dates
        const daysBetween = calculateDaysBetweenDates(startInfo, targetInfo, config);
        
        // Calculate day of week
        const dayOfWeekIndex = ((daysBetween % config.daysOfWeek.length) + config.daysOfWeek.length) % config.daysOfWeek.length;
        return dayOfWeekIndex;
    }
    
    function calculateDaysBetweenDates(startDate, endDate, config) {
        let totalDays = 0;
        
        // If end date is before start date, return negative
        if (endDate.year < startDate.year ||
            (endDate.year === startDate.year && endDate.month < startDate.month) ||
            (endDate.year === startDate.year && endDate.month === startDate.month && endDate.day < startDate.day)) {
            return -calculateDaysBetweenDates(endDate, startDate, config);
        }
        
        // Same date
        if (endDate.year === startDate.year && endDate.month === startDate.month && endDate.day === startDate.day) {
            return 0;
        }
        
        // Count days
        let currentYear = startDate.year;
        let currentMonth = startDate.month;
        let currentDay = startDate.day;
        
        while (currentYear < endDate.year || currentMonth < endDate.month || currentDay < endDate.day) {
            currentDay++;
            totalDays++;
            
            const daysInMonth = getDaysInMonth(currentMonth, currentYear, config);
            if (currentDay > daysInMonth) {
                currentDay = 1;
                currentMonth++;
                
                if (currentMonth >= config.months.length) {
                    currentMonth = 0;
                    currentYear++;
                }
            }
        }
        
        return totalDays;
    }
    
    function createDefaultConfiguration() {
        const configText = (
            `# Time Configuration` +
            `\nActions Per Day: 200` +
            `\nStart Date: 11/06/2022` +
            `\nHours Per Day: 24` +
            `\n` +
            `\n## Time Periods` +
            `\n- Late Night: 0.92-0.21` +
            `\n- Dawn: 0.21-0.29` +
            `\n- Morning: 0.29-0.42` +
            `\n- Midday: 0.42-0.58` +
            `\n- Afternoon: 0.58-0.71` +
            `\n- Evening: 0.71-0.79` +
            `\n- Night: 0.79-0.92` +
            `\n` +
            `\n## Seasons` +
            `\n// Based on year progress (0.0 = Jan 1, 1.0 = Dec 31)` +
            `\n// Supports wraparound (e.g., Winter: 0.92-0.25 for Dec-Mar)` +
            `\n// Northern Hemisphere example:` +
            `\n- Winter: 0.92-0.25` +
            `\n- Spring: 0.25-0.5` +
            `\n- Summer: 0.5-0.75` +
            `\n- Autumn: 0.75-0.92` +
            `\n// Alternative examples:` +
            `\n// Tropical: Wet 0.4-0.9, Dry 0.9-0.4` +
            `\n// Fantasy: Frostfall 0.85-0.15, Renewal 0.15-0.45, Highsun 0.45-0.7, Harvest 0.7-0.85` +
            `\n` +
            `\n## Days of Week` +
            `\n// First entry = Start Date's day of week` +
            `\n- Sunday` +
            `\n- Monday` +
            `\n- Tuesday` +
            `\n- Wednesday` +
            `\n- Thursday` +
            `\n- Friday` +
            `\n- Saturday` +
            `\n` +
            `\n## Months` +
            `\n- January: 31` +
            `\n- February: 28` +
            `\n- March: 31` +
            `\n- April: 30` +
            `\n- May: 31` +
            `\n- June: 30` +
            `\n- July: 31` +
            `\n- August: 31` +
            `\n- September: 30` +
            `\n- October: 31` +
            `\n- November: 30` +
            `\n- December: 31` +
            `\n` +
            `\n## Leap Year` +
            `\n// Adjusts month lengths in leap years` +
            `\n// Example: Every 4 years, skip every 100, except every 400` +
            `\n// Invalid dates will not trigger` +
            `\nEnabled: true` +
            `\nFrequency: 4` +
            `\nSkip Frequency: 100` +
            `\nSkip Exception: 400` +
            `\nStart Year: 0` +
            `\nAdjustments:` +
            `\n- February: +1` +
            `\n` +
            `\n// Examples:` +
            `\n// Standard Earth:` +
            `\n// - February: +1` +
            `\n// Multiple months:` +
            `\n// - February: +1` +
            `\n// - June: +1` +
            `\n// Variable days:` +
            `\n// - Spiritmonth: +7` +
            `\n// - Voidmonth: -3` +
            `\n// Complex:` +
            `\n// - Firstmonth: +2` +
            `\n// - Thirdmonth: -1` +
            `\n// - Lastmonth: +1`
        );
        
        const description = getCommandDocumentation();
        
        const card = Utilities.storyCard.add({
            title: CONFIG_CARD,
            entry: configText,
            description: description
        });
        
        if (!card) {
            if (debug) console.log('[Time] Failed to create configuration card');
        }
    }
    
    function createDefaultEventDays() {
        const eventText = (
            `# Event Days Configuration` +
            `\n// Format: Event Name: MM/DD [modifiers]` +
            `\n// Format: Event Name: Nth Weekday of Month` +
            `\n// Modifiers: annual, once, every N years` +
            `\n// Works with custom day/month names` +
            `\n// Example: "Harvest Moon: 3rd Seventhday of Ninthmonth"` +
            `\n// Example: "Council: last Firstday of Firstmonth"` +
            `\n` +
            `\n## Annual Events` +
            `\n- New Year: 1/1` +
            `\n- Valentine's Day: 2/14` +
            `\n- Independence Day: 7/4` +
            `\n- Halloween: 10/31` +
            `\n- Christmas: 12/25` +
            `\n` +
            `\n## Relative Date Events` +
            `\n- Martin Luther King Jr Day: 3rd Monday of January` +
            `\n- Presidents Day: 3rd Monday of February` +
            `\n- Mother's Day: 2nd Sunday of May` +
            `\n- Memorial Day: last Monday of May` +
            `\n- Father's Day: 3rd Sunday of June` +
            `\n- Labor Day: 1st Monday of September` +
            `\n- Columbus Day: 2nd Monday of October` +
            `\n- Thanksgiving: 4th Thursday of November` +
            `\n` +
            `\n## Periodic Events` +
            `\n- Summer Olympics: 7/15/2024 every 4 years` +
            `\n- Winter Olympics: 2/1/2026 every 4 years` +
            `\n- World Cup: 6/1/2026 every 4 years` +
            `\n- Leap Day: 2/29 annual` +
            `\n// Invalid dates will not trigger` +
            `\n` +
            `\n## One-Time Events` +
            `\n- Solar Eclipse: 4/8/2024 once`
        );
        
        const description = `// You can continue in the description.`;
        
        const card = Utilities.storyCard.add({
            title: EVENT_CARD_PREFIX,
            entry: eventText,
            description: description
        });
        
        if (!card) {
            if (debug) console.log('[Time] Failed to create event days card');
        }
    }
    
    function getCommandDocumentation() {
        return (
            `TIME SYSTEM COMMANDS` +
            `\n=====================================` +
            `\n/settime [hour]:[minute] [am/pm]` +
            `\n  Set the current time` +
            `\n  Examples: /settime 14:30, /settime 6:30pm, /settime 6pm` +
            `\n  Note: AM/PM based on Hours Per Day / 2` +
            `\n` +
            `\n/wait [number] [minutes/hours/days]` +
            `\n/skip [number] [minutes/hours/days]` +
            `\n/advance [number] [minutes/hours/days]` +
            `\n  Skip forward in time` +
            `\n  Examples: /skip 30 minutes, /wait 3 hours, /skip 2 days` +
            `\n  Short forms: /skip 30m, /wait 3h, /skip 2d` +
            `\n  Combined: /skip 1h30m, /wait 1.5h` +
            `\n` +
            `\n/rewind [number] [minutes/hours/days]` +
            `\n  Go back in time` +
            `\n  Examples: /rewind 2 hours, /rewind 1 day` +
            `\n  Short forms: /rewind 2h, /rewind 1d` +
            `\n` +
            `\n/time` +
            `\n/currenttime` +
            `\n  Display the current time and date`
        );
    }
    
    // Helper Functions for State and Command Processing
    function formatSeasonForState(day, config) {
        if (!config.seasons) return '';
        
        const yearInfo = getDayOfYear(day, config.startDate, config);
        const yearProgress = calculateYearProgress(yearInfo.dayOfYear, yearInfo.year, config);
        const currentSeason = calculateSeason(yearProgress, config.seasons);
        
        return currentSeason !== 'Unknown' ? `\nSeason: [${currentSeason}]` : '';
    }
    
    function formatEventsForState(day, config) {
        const eventsList = loadEventDays();
        if (eventsList.length === 0) return '';
        
        const dateInfo = calculateDateInfo(day, config.startDate, config);
        const todayEvents = checkEventDay(dateInfo.month, dateInfo.day, dateInfo.year, eventsList, config);
        
        if (todayEvents.length > 0) {
            const eventNames = todayEvents.map(e => e.name).join(', ');
            return `\nEvents: [${eventNames}]`;
        }
        
        return '';
    }
    
    function getCurrentSeasonInfo(day, config) {
        if (!config.seasons) return '';
        
        const yearInfo = getDayOfYear(day, config.startDate, config);
        const yearProgress = calculateYearProgress(yearInfo.dayOfYear, yearInfo.year, config);
        const currentSeason = calculateSeason(yearProgress, config.seasons);
        
        return currentSeason !== 'Unknown' ? `, ${currentSeason}` : '';
    }
    
    function getCurrentEventInfo(day, config) {
        const eventsList = loadEventDays();
        if (eventsList.length === 0) return '';
        
        const dateInfo = calculateDateInfo(day, config.startDate, config);
        const todayEvents = checkEventDay(dateInfo.month, dateInfo.day, dateInfo.year, eventsList, config);
        
        if (todayEvents.length > 0) {
            const eventNames = todayEvents.map(e => e.name).join(', ');
            return ` [${eventNames}]`;
        }
        
        return '';
    }
    
    function getSeasonChangeInfo(previousDay, currentDay, config) {
        if (!config.seasons || currentDay === previousDay) return '';
        
        const prevYearInfo = getDayOfYear(previousDay, config.startDate, config);
        const currYearInfo = getDayOfYear(currentDay, config.startDate, config);
        
        const prevYearProgress = calculateYearProgress(prevYearInfo.dayOfYear, prevYearInfo.year, config);
        const currYearProgress = calculateYearProgress(currYearInfo.dayOfYear, currYearInfo.year, config);
        
        const prevSeason = calculateSeason(prevYearProgress, config.seasons);
        const currSeason = calculateSeason(currYearProgress, config.seasons);
        
        return prevSeason !== currSeason ? ` (entered ${currSeason})` : '';
    }
    
    // State Management
    function loadTimeState() {
        const config = loadConfiguration();
        if (!config) {
            if (debug) console.log('[Time] Cannot load state without configuration');
            return null;
        }
        
        const stateCard = Utilities.storyCard.get(STATE_CARD);
        if (!stateCard) {
            if (debug) console.log('[Time] No state found, creating initial state');
            return createInitialState();
        }
        
        const lines = stateCard.entry.split('\n');
        const state = {
            day: 0,
            progress: 0,
            lastProcessedAction: -1
        };
        
        for (const line of lines) {
            if (line.startsWith('Day:')) {
                const displayedDay = parseInt(line.split(':')[1].trim());
                if (!isNaN(displayedDay)) {
                    state.day = displayedDay;
                }
            } else if (line.startsWith('Progress:')) {
                const match = line.match(/Progress:\s*(\d+)/);
                if (match) state.progress = parseInt(match[1]);
            } else if (line.startsWith('Last Processed Action:')) {
                state.lastProcessedAction = parseInt(line.split(':')[1].trim());
            }
        }
        
        return state;
    }
    
    function createInitialState() {
        const config = loadConfiguration();
        if (!config) {
            if (debug) console.log('[Time] Cannot create initial state without configuration');
            return null;
        }
        
        // Check if a state card already exists with manual edits
        const existingCard = Utilities.storyCard.get(STATE_CARD);
        if (existingCard && existingCard.entry) {
            // Try to parse existing values
            const lines = existingCard.entry.split('\n');
            let day = 0;
            let progress = 0;
            
            for (const line of lines) {
                if (line.startsWith('Day:')) {
                    const parsedDay = parseInt(line.split(':')[1].trim());
                    if (!isNaN(parsedDay)) day = parsedDay;
                } else if (line.startsWith('Progress:')) {
                    const match = line.match(/Progress:\s*(\d+)/);
                    if (match) progress = parseInt(match[1]);
                }
            }
            
            const state = {
                day: day,
                progress: progress,
                lastProcessedAction: -1
            };
            
            // Re-save to ensure proper formatting
            saveTimeState(state);
            return state;
        }
        
        // Create new state with defaults
        const state = {
            day: 0,  // Day number - can be any value including negative
            progress: 0,  // Progress - can be any value from 0 to actionsPerDay-1
            lastProcessedAction: -1
        };
        
        saveTimeState(state);
        return state;
    }
    
    function saveTimeState(state) {
        if (!state) return;
        
        const config = loadConfiguration();
        if (!config) {
            if (debug) console.log('[Time] Cannot save state without configuration');
            return;
        }
        
        const dayProgress = state.progress / config.actionsPerDay;
        const timeInfo = calculateTimeOfDay(dayProgress, config.timePeriods, config.hoursPerDay);
        const timeStr = progressToTime(dayProgress, config.hoursPerDay);
        
        // Calculate date from day number
        const calculatedDate = calculateDate(state.day, config.startDate, config);
        
        // Use helper functions for season and event strings
        const seasonStr = formatSeasonForState(state.day, config);
        const eventStr = formatEventsForState(state.day, config);
        
        const entry = (
            `# Time State` +
            `\nProgress: ${state.progress}/[${config.actionsPerDay}]` +
            `\nTime: [${timeStr} ${timeInfo.period}]` +
            `\nDay: ${state.day}` +
            `\nDate: [${calculatedDate}]` +
            seasonStr +
            eventStr +
            `\n` +
            `\nLast Processed Action: ${state.lastProcessedAction}`
        );
        
        Utilities.storyCard.upsert({
            title: STATE_CARD,
            entry: entry
        });
    }
    
    // Time Calculations
    function calculateTimeOfDay(dayProgress, timePeriods, hoursPerDay = 24) {
        let currentPeriod = 'Unknown';
        
        for (const [key, period] of Object.entries(timePeriods)) {
            if (period.wrapsAround) {
                if (dayProgress >= period.start || dayProgress < period.end) {
                    currentPeriod = period.name;
                    break;
                }
            } else {
                if (dayProgress >= period.start && dayProgress < period.end) {
                    currentPeriod = period.name;
                    break;
                }
            }
        }
        
        return {
            period: currentPeriod
        };
    }
    
    function calculateYearProgress(daysSinceStartOfYear, year, config) {
        // Calculate total days in this year
        let totalDaysInYear = 0;
        for (let month = 0; month < config.months.length; month++) {
            totalDaysInYear += getDaysInMonth(month, year, config);
        }
        
        // Return progress as 0.0 to 1.0
        // daysSinceStartOfYear is 0-based (0 = Jan 1)
        // Last day of year will have progress very close to but not exactly 1.0
        return daysSinceStartOfYear / totalDaysInYear;
    }
    
    function calculateSeason(yearProgress, seasons) {
        if (!seasons) return 'Unknown';
        
        let currentSeason = 'Unknown';
        
        // Find the season that contains this progress value
        for (const [key, season] of Object.entries(seasons)) {
            if (season.wrapsAround) {
                // Handle wraparound (e.g., Winter: 0.95-0.2)
                if (yearProgress >= season.start || yearProgress < season.end) {
                    currentSeason = season.name;
                    break;
                }
            } else {
                // Handle normal ranges
                if (yearProgress >= season.start && yearProgress < season.end) {
                    currentSeason = season.name;
                    break;
                }
                // Handle the last season that goes up to 1.0
                if (season.end === 1.0 && yearProgress >= season.start) {
                    currentSeason = season.name;
                    break;
                }
            }
        }
        
        return currentSeason;
    }
    
    function getDayOfYear(totalDays, startDateStr, config) {
        // Get the current date info
        const dateInfo = calculateDateInfo(totalDays, startDateStr, config);
        
        // Calculate day of year (0-based)
        let dayOfYear = 0;
        
        // Add days from all previous months in the current year
        for (let m = 0; m < dateInfo.month; m++) {
            dayOfYear += getDaysInMonth(m, dateInfo.year, config);
        }
        
        // Add current day (convert to 0-based)
        dayOfYear += dateInfo.day - 1;
        
        return { 
            dayOfYear: dayOfYear,
            year: dateInfo.year 
        };
    }
    
    function parseTimeToProgress(timeStr, hoursPerDay) {
        const parts = timeStr.split(':');
        if (parts.length !== 2) return 0;
        
        const hours = parseInt(parts[0]) || 0;
        const minutes = parseInt(parts[1]) || 0;
        
        return (hours + minutes / 60) / hoursPerDay;
    }
    
    function progressToTime(progress, hoursPerDay) {
        // Ensure progress is within 0-1 range
        progress = Math.max(0, Math.min(1, progress));
        
        const totalMinutes = Math.floor(progress * hoursPerDay * 60);
        const hour = Math.floor(totalMinutes / 60) % hoursPerDay;
        const minute = totalMinutes % 60;
        
        return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }
    
    function isLeapYear(year, leapConfig) {
        if (!leapConfig || !leapConfig.enabled) return false;
        
        const yearsSinceStart = year - leapConfig.startYear;
        
        // Check if it's a leap year based on frequency
        if (yearsSinceStart % leapConfig.frequency !== 0) {
            return false;
        }
        
        // Check skip rules
        if (leapConfig.skipFrequency > 0) {
            if (yearsSinceStart % leapConfig.skipFrequency === 0) {
                // It would normally be skipped, but check for exception
                if (leapConfig.skipExceptionFrequency > 0 && 
                    yearsSinceStart % leapConfig.skipExceptionFrequency === 0) {
                    return true; // Exception to the skip rule
                }
                return false; // Skip this leap year
            }
        }
        
        return true; // It's a leap year
    }
    
    function getDaysInMonth(monthIndex, year, config) {
        // Ensure monthIndex is valid
        if (monthIndex >= config.daysPerMonth.length) {
            monthIndex = monthIndex % config.daysPerMonth.length;
        }
        
        let days = config.daysPerMonth[monthIndex];
        
        // Apply leap year adjustments if applicable
        if (config.leapYear && 
            config.leapYear.enabled && 
            config.leapYear.adjustments &&
            isLeapYear(year, config.leapYear)) {
            
            // Check if this month has an adjustment
            const adjustment = config.leapYear.adjustments[monthIndex];
            if (adjustment !== undefined) {
                days += adjustment; // Can be positive or negative
                
                // Ensure days never goes below 1
                if (days < 1) {
                    if (debug) console.log(`[Time] WARNING: Leap adjustment would make ${config.months[monthIndex]} have ${days} days. Setting to 1.`);
                    days = 1;
                }
            }
        }
        
        return days;
    }
    
    function calculateDateInfo(totalDays, startDateStr, config) {
        // Parse start date
        const parts = startDateStr.split('/');
        let currentMonth = parseInt(parts[0]) - 1; // 0-indexed
        let currentDay = parseInt(parts[1]);
        let currentYear = parseInt(parts[2]);
        
        // Handle negative days (going back in time)
        if (totalDays < 0) {
            let remainingDays = Math.abs(totalDays);
            
            while (remainingDays > 0) {
                if (remainingDays >= currentDay) {
                    // Need to go to previous month
                    remainingDays -= currentDay;
                    currentMonth--;
                    
                    // Handle year underflow
                    if (currentMonth < 0) {
                        currentMonth = config.months.length - 1;
                        currentYear--;
                    }
                    
                    // Set to last day of new month
                    currentDay = getDaysInMonth(currentMonth, currentYear, config);
                } else {
                    // Stay in current month
                    currentDay -= remainingDays;
                    remainingDays = 0;
                }
            }
        } else {
            // Handle positive days (normal case)
            let remainingDays = totalDays;
            
            while (remainingDays > 0) {
                const daysInCurrentMonth = getDaysInMonth(currentMonth, currentYear, config);
                const daysLeftInMonth = daysInCurrentMonth - currentDay + 1;
                
                if (remainingDays >= daysLeftInMonth) {
                    // Move to next month
                    remainingDays -= daysLeftInMonth;
                    currentDay = 1;
                    currentMonth++;
                    
                    // Handle year overflow
                    if (currentMonth >= config.months.length) {
                        currentMonth = 0;
                        currentYear++;
                    }
                } else {
                    // Stay in current month
                    currentDay += remainingDays;
                    remainingDays = 0;
                }
            }
        }
        
        return {
            month: currentMonth,
            day: currentDay,
            year: currentYear
        };
    }
    
    function calculateDate(totalDays, startDateStr, config) {
        // Get date components
        const dateInfo = calculateDateInfo(totalDays, startDateStr, config);
        
        // Calculate day of week
        // First day in daysOfWeek array corresponds to start date's day of week
        const dayOfWeekIndex = ((totalDays % config.daysOfWeek.length) + config.daysOfWeek.length) % config.daysOfWeek.length;
        const dayOfWeek = config.daysOfWeek[dayOfWeekIndex];
        
        // Get month name
        const monthName = config.months[dateInfo.month % config.months.length];
        
        return `${dayOfWeek}, ${monthName} ${dateInfo.day}, ${dateInfo.year}`;
    }
    
    // Action Processing
    function processCurrentAction() {
        const actionCount = getActionCount();
        if (actionCount === null) return null;
        
        const state = loadTimeState();
        const config = loadConfiguration();
        
        if (!state || !config) {
            if (debug) console.log('[Time] Cannot process actions without state and configuration');
            return null;
        }
        
        if (actionCount === state.lastProcessedAction) {
            return null;
        }
        
        const actionsToProcess = actionCount - state.lastProcessedAction;
        
        if (actionsToProcess < 0) {
            return handleTimeReversal(actionCount, state, config);
        }
        
        // Process forward
        let newProgress = state.progress + actionsToProcess;
        let newDay = state.day;
        
        // Handle day overflow
        while (newProgress >= config.actionsPerDay) {
            newProgress -= config.actionsPerDay;
            newDay++;
        }
        
        const newState = {
            day: newDay,
            progress: newProgress,
            lastProcessedAction: actionCount
        };
        
        saveTimeState(newState);
        
        return {
            state: newState,
            dayChanged: newDay !== state.day
        };
    }
    
    function handleTimeReversal(targetAction, currentState, config) {
        if (!config) return null;
        
        targetAction = Math.max(0, targetAction);
        
        // Calculate total days from target action
        const totalDays = Math.floor(targetAction / config.actionsPerDay);
        const progress = targetAction % config.actionsPerDay;
        
        const newState = {
            day: totalDays,
            progress: progress,
            lastProcessedAction: targetAction
        };
        
        saveTimeState(newState);
        
        return {
            state: newState,
            reversed: true
        };
    }
    
    function getActionCount() {
        if (typeof state !== 'undefined' && state.actionCount !== undefined) {
            return state.actionCount;
        }
        
        if (typeof info !== 'undefined' && info.actionCount !== undefined) {
            return info.actionCount;
        }
        
        return null;
    }
    
    // Event Dispatching
    const eventDispatcher = {
        events: [],
        dispatchedDays: new Set(), // Track which days had events dispatched this turn
        
        dispatch(eventType, data) {
            this.events.push({
                type: eventType,
                data: data
            });
            
            // Track eventDay dispatches to avoid duplicates
            if (eventType === 'eventDay' && data.state) {
                this.dispatchedDays.add(data.state.day);
            }
        },
        
        hasDispatchedForDay(day) {
            return this.dispatchedDays.has(day);
        },
        
        getEvents() {
            const currentEvents = [...this.events];
            this.events = [];
            this.dispatchedDays.clear();
            return currentEvents;
        }
    };
    
    // Command Processing
    function parseTimeCommand(inputText) {
        if (!inputText) return null;
        
        const config = loadConfiguration();
        if (!config) {
            if (debug) console.log('[Time] Cannot parse commands without configuration');
            return null;
        }
        
        const hoursPerDay = config.hoursPerDay;
        
        const lines = inputText.split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            
            if (!trimmed.startsWith('/')) continue;
            
            const setTimeMatch = trimmed.match(/^\/settime\s+(?:to\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i) ||
                               trimmed.match(/^\/settime\s+(\d{1,2})(am|pm)$/i);
            
            if (setTimeMatch) {
                let hour = parseInt(setTimeMatch[1]);
                const minute = setTimeMatch[2] ? parseInt(setTimeMatch[2]) : 0;
                const meridiem = (setTimeMatch[3] || setTimeMatch[2])?.toLowerCase();
                
                if (meridiem && hoursPerDay % 2 === 0) {
                    // For even-hour days, use half-day system
                    const halfDay = hoursPerDay / 2;
                    if (meridiem === 'pm' && hour < halfDay) hour += halfDay;
                    if (meridiem === 'am' && hour === halfDay) hour = 0;
                }
                
                if (hour >= 0 && hour < hoursPerDay && minute >= 0 && minute < 60) {
                    return { 
                        type: 'setTime', 
                        hour, 
                        minute,
                        originalText: trimmed
                    };
                }
            }
            
            const skipMatch = trimmed.match(/^\/(?:skip|wait|advance)\s+(?:for\s+)?(.+)$/i);
            
            if (skipMatch) {
                const timeSpec = skipMatch[1].trim();
                const parsed = parseTimeSpecification(timeSpec, hoursPerDay);
                
                if (parsed && parsed.hours > 0) {
                    return {
                        type: 'skipTime',
                        hours: parsed.hours,
                        originalText: trimmed
                    };
                }
            }
            
            const rewindMatch = trimmed.match(/^\/rewind\s+(?:for\s+)?(.+)$/i);
            
            if (rewindMatch) {
                const timeSpec = rewindMatch[1].trim();
                const parsed = parseTimeSpecification(timeSpec, hoursPerDay);
                
                if (parsed && parsed.hours > 0) {
                    return {
                        type: 'rewindTime',
                        hours: parsed.hours,
                        originalText: trimmed
                    };
                }
            }
            
            if (trimmed.match(/^\/(?:current)?time$/i)) {
                return { 
                    type: 'queryTime',
                    originalText: trimmed
                };
            }
        }
        
        return null;
    }
    
    function parseTimeSpecification(spec, hoursPerDay) {
        let match;
        
        match = spec.match(/^(\d+(?:\.\d+)?)\s*(minutes?|mins?|hours?|hrs?|days?)$/i);
        if (match) {
            const amount = parseFloat(match[1]);
            const unit = match[2].toLowerCase();
            
            let hours = amount;
            
            if (unit.startsWith('m')) {
                hours = amount / 60;
            } else if (unit.startsWith('d')) {
                hours = amount * hoursPerDay;
            }
            
            return { hours };
        }
        
        match = spec.match(/^(\d+(?:\.\d+)?)(m|h|d)$/i);
        if (match) {
            const amount = parseFloat(match[1]);
            const unit = match[2].toLowerCase();
            
            let hours = amount;
            
            if (unit === 'm') {
                hours = amount / 60;
            } else if (unit === 'd') {
                hours = amount * hoursPerDay;
            }
            
            return { hours };
        }
        
        match = spec.match(/^(\d+)h(\d+)m$/i);
        if (match) {
            const h = parseInt(match[1]);
            const m = parseInt(match[2]);
            const hours = h + (m / 60);
            
            return { hours };
        }
        
        return null;
    }
    
    function processTimeCommand(command) {
        if (!command) return;
        
        const state = loadTimeState();
        const config = loadConfiguration();
        
        if (!state || !config) {
            if (debug) console.log('[Time] Cannot process commands without state and configuration');
            return;
        }
        
        switch (command.type) {
            case 'setTime':
                // Calculate progress from new time
                const targetProgress = parseTimeToProgress(
                    `${String(command.hour).padStart(2, '0')}:${String(command.minute).padStart(2, '0')}`,
                    config.hoursPerDay
                );
                const newProgress = Math.floor(targetProgress * config.actionsPerDay);
                
                // Set time on current day (allows rewinding within the day)
                const newState = {
                    day: state.day,
                    progress: newProgress,
                    lastProcessedAction: state.lastProcessedAction
                };
                
                saveTimeState(newState);
                if (debug) console.log(`[Time] Set time to ${String(command.hour).padStart(2, '0')}:${String(command.minute).padStart(2, '0')}, Day ${state.day}`);
                break;
                
            case 'skipTime':
                // Add time to current
                const hoursToAdd = command.hours;
                const progressToAdd = hoursToAdd / config.hoursPerDay;
                const actionsToAdd = Math.round(progressToAdd * config.actionsPerDay);
                
                let skipProgress = state.progress + actionsToAdd;
                let skipDay = state.day;
                
                // Handle day overflow
                while (skipProgress >= config.actionsPerDay) {
                    skipProgress -= config.actionsPerDay;
                    skipDay++;
                }
                
                const skipState = {
                    day: skipDay,
                    progress: skipProgress,
                    lastProcessedAction: state.lastProcessedAction
                };
                
                saveTimeState(skipState);
                
                // Check if we changed seasons and get event info
                const seasonChangeInfo = getSeasonChangeInfo(state.day, skipDay, config);
                const eventInfoSkip = skipDay !== state.day ? getCurrentEventInfo(skipDay, config) : '';
                
                if (debug) console.log(`[Time] Skipped ${command.hours} hours to Day ${skipDay}${seasonChangeInfo}${eventInfoSkip}`);
                break;
                
            case 'rewindTime':
                // Subtract time from current
                const hoursToSubtract = command.hours;
                const progressToSubtract = hoursToSubtract / config.hoursPerDay;
                const actionsToSubtract = Math.round(progressToSubtract * config.actionsPerDay);
                
                let rewindProgress = state.progress - actionsToSubtract;
                let rewindDay = state.day;
                
                // Handle day underflow
                while (rewindProgress < 0) {
                    rewindProgress += config.actionsPerDay;
                    rewindDay--;
                }
                
                const rewindState = {
                    day: rewindDay,
                    progress: rewindProgress,
                    lastProcessedAction: state.lastProcessedAction
                };
                
                saveTimeState(rewindState);
                
                // Check if we changed seasons and get event info
                const rewindSeasonInfo = getSeasonChangeInfo(state.day, rewindDay, config);
                const rewindEventInfo = rewindDay !== state.day ? getCurrentEventInfo(rewindDay, config) : '';
                
                if (debug) console.log(`[Time] Rewound ${command.hours} hours to Day ${rewindDay}${rewindSeasonInfo}${rewindEventInfo}`);
                break;
                
            case 'queryTime':
                // Calculate current time from progress
                const dayProgress = state.progress / config.actionsPerDay;
                const currentTime = progressToTime(dayProgress, config.hoursPerDay);
                const currentDate = calculateDate(state.day, config.startDate, config);
                
                // Get season and event info
                const seasonInfo = getCurrentSeasonInfo(state.day, config);
                const eventInfoQuery = getCurrentEventInfo(state.day, config);
                
                if (debug) console.log(`[Time] Current: ${currentTime}, ${currentDate}${seasonInfo}, Day ${state.day}${eventInfoQuery}`);
                break;
        }
    }
    
    // INPUT HOOK: Only remove commands from text
    if (hook === 'input') {
        const command = parseTimeCommand(text);
        
        if (command) {
            processTimeCommand(command);
            return '\u200B';
        }
        
        return text;
    }
    
    // CONTEXT HOOK: Process time progression
    if (hook === 'context') {
        const config = loadConfiguration();
        if (!config) {
            if (debug) console.log('[Time] Time system requires configuration to function');
            return;
        }
        
        // Get previous time of day before processing
        const previousState = loadTimeState();
        const prevDayProgress = previousState ? previousState.progress / config.actionsPerDay : 0;
        const prevTimeOfDay = calculateTimeOfDay(prevDayProgress, config.timePeriods, config.hoursPerDay).period;
        
        const actionResult = processCurrentAction();
        
        // Dispatch events
        if (actionResult) {
            if (actionResult.reversed) {
                eventDispatcher.dispatch('timeReversed', actionResult);
            } else {
                // Check for time of day change (can happen without day change)
                const currDayProgress = actionResult.state.progress / config.actionsPerDay;
                const currTimeOfDay = calculateTimeOfDay(currDayProgress, config.timePeriods, config.hoursPerDay).period;
                
                if (prevTimeOfDay !== currTimeOfDay && prevTimeOfDay !== 'Unknown' && currTimeOfDay !== 'Unknown') {
                    eventDispatcher.dispatch('timeOfDayChanged', {
                        previousPeriod: prevTimeOfDay,
                        currentPeriod: currTimeOfDay,
                        state: actionResult.state
                    });
                }
                
                if (actionResult.dayChanged) {
                    eventDispatcher.dispatch('dayChanged', {
                        previousDay: previousState.day,
                        currentDay: actionResult.state.day,
                        state: actionResult.state
                    });
                    
                    // Check for season change on day change
                    if (config.seasons) {
                        const state = actionResult.state;
                        const prevYearInfo = getDayOfYear(state.day - 1, config.startDate, config);
                        const currYearInfo = getDayOfYear(state.day, config.startDate, config);
                        
                        const prevYearProgress = calculateYearProgress(prevYearInfo.dayOfYear, prevYearInfo.year, config);
                        const currYearProgress = calculateYearProgress(currYearInfo.dayOfYear, currYearInfo.year, config);
                        
                        const prevSeason = calculateSeason(prevYearProgress, config.seasons);
                        const currSeason = calculateSeason(currYearProgress, config.seasons);
                        
                        if (prevSeason !== currSeason) {
                            eventDispatcher.dispatch('seasonChanged', {
                                previousSeason: prevSeason,
                                currentSeason: currSeason,
                                state: actionResult.state
                            });
                        }
                    }
                }
            }
        }
        
        // Always check for events on current day (catches manual edits and time skips)
        const currentState = loadTimeState();
        if (currentState && !eventDispatcher.hasDispatchedForDay(currentState.day)) {
            const eventsList = loadEventDays();
            if (eventsList.length > 0) {
                const dateInfo = calculateDateInfo(currentState.day, config.startDate, config);
                const todayEvents = checkEventDay(dateInfo.month, dateInfo.day, dateInfo.year, eventsList, config);
                
                if (todayEvents.length > 0) {
                    eventDispatcher.dispatch('eventDay', {
                        events: todayEvents,
                        date: calculateDate(currentState.day, config.startDate, config),
                        state: currentState
                    });
                }
            }
        }
        
        // Store API methods
        Calendar.events = eventDispatcher.getEvents();
        
        // Time Methods
        Calendar.getCurrentTime = () => {
            const state = loadTimeState();
            const config = loadConfiguration();
            if (!state || !config) return null;
            const dayProgress = state.progress / config.actionsPerDay;
            return progressToTime(dayProgress, config.hoursPerDay);
        };
        
        Calendar.getFormattedTime = () => {
            const state = loadTimeState();
            const config = loadConfiguration();
            if (!state || !config) return null;
            
            const dayProgress = state.progress / config.actionsPerDay;
            const timeStr = progressToTime(dayProgress, config.hoursPerDay);
            
            if (config.hoursPerDay % 2 !== 0) {
                return timeStr;
            }
            
            // Add AM/PM for even-hour days
            const [hourStr, minuteStr] = timeStr.split(':');
            let hour = parseInt(hourStr);
            const halfDay = config.hoursPerDay / 2;
            
            const isPM = hour >= halfDay;
            if (isPM && hour > halfDay) hour -= halfDay;
            if (hour === 0) hour = halfDay;
            
            return `${hour}:${minuteStr} ${isPM ? 'PM' : 'AM'}`;
        };
        
        Calendar.getTimeOfDay = () => {
            const state = loadTimeState();
            const config = loadConfiguration();
            if (!state || !config) return null;
            const dayProgress = state.progress / config.actionsPerDay;
            const timeInfo = calculateTimeOfDay(dayProgress, config.timePeriods, config.hoursPerDay);
            return timeInfo.period;
        };
        
        Calendar.getDayProgress = () => {
            const state = loadTimeState();
            const config = loadConfiguration();
            if (!state || !config) return null;
            return state.progress / config.actionsPerDay;
        };
        
        // Date-based methods
        Calendar.getCurrentDate = () => {
            const state = loadTimeState();
            const config = loadConfiguration();
            if (!state || !config) return null;
            return calculateDate(state.day, config.startDate, config);
        };
        
        Calendar.getDayOfWeek = () => {
            const state = loadTimeState();
            const config = loadConfiguration();
            if (!state || !config) return null;
            const dayOfWeekIndex = ((state.day % config.daysOfWeek.length) + config.daysOfWeek.length) % config.daysOfWeek.length;
            return config.daysOfWeek[dayOfWeekIndex];
        };
        
        Calendar.getDayOfMonth = () => {
            const state = loadTimeState();
            const config = loadConfiguration();
            if (!state || !config) return null;
            const dateInfo = calculateDateInfo(state.day, config.startDate, config);
            return dateInfo.day;
        };
        
        Calendar.getMonth = () => {
            const state = loadTimeState();
            const config = loadConfiguration();
            if (!state || !config) return null;
            const dateInfo = calculateDateInfo(state.day, config.startDate, config);
            return config.months[dateInfo.month];
        };
        
        Calendar.getYear = () => {
            const state = loadTimeState();
            const config = loadConfiguration();
            if (!state || !config) return null;
            const dateInfo = calculateDateInfo(state.day, config.startDate, config);
            return dateInfo.year;
        };
        
        Calendar.getDayNumber = () => {
            const state = loadTimeState();
            const config = loadConfiguration();
            if (!state || !config) return null;
            return state.day;
        };
        
        // Season-based methods
        Calendar.getCurrentSeason = () => {
            const state = loadTimeState();
            const config = loadConfiguration();
            if (!state || !config || !config.seasons) return null;
            
            const yearInfo = getDayOfYear(state.day, config.startDate, config);
            const yearProgress = calculateYearProgress(yearInfo.dayOfYear, yearInfo.year, config);
            return calculateSeason(yearProgress, config.seasons);
        };
        
        Calendar.getYearProgress = () => {
            const state = loadTimeState();
            const config = loadConfiguration();
            if (!state || !config) return null;
            
            const yearInfo = getDayOfYear(state.day, config.startDate, config);
            return calculateYearProgress(yearInfo.dayOfYear, yearInfo.year, config);
        };
        
        Calendar.getDayOfYear = () => {
            const state = loadTimeState();
            const config = loadConfiguration();
            if (!state || !config) return null;
            
            const yearInfo = getDayOfYear(state.day, config.startDate, config);
            return yearInfo.dayOfYear + 1; // Convert from 0-based to 1-based for user
        };
        
        // Event methods
        Calendar.getTodayEvents = () => {
            const state = loadTimeState();
            const config = loadConfiguration();
            if (!state || !config) return [];
            
            const eventsList = loadEventDays();
            if (eventsList.length === 0) return [];
            
            const dateInfo = calculateDateInfo(state.day, config.startDate, config);
            return checkEventDay(dateInfo.month, dateInfo.day, dateInfo.year, eventsList, config);
        };
        
        Calendar.getUpcomingEvents = (daysAhead = 30) => {
            const state = loadTimeState();
            const config = loadConfiguration();
            if (!state || !config) return [];
            
            const eventsList = loadEventDays();
            if (eventsList.length === 0) return [];
            
            const upcoming = [];
            
            for (let i = 1; i <= daysAhead; i++) {
                const futureDay = state.day + i;
                const dateInfo = calculateDateInfo(futureDay, config.startDate, config);
                
                // Check all events for this date, including relative date events
                const dayEvents = checkEventDay(dateInfo.month, dateInfo.day, dateInfo.year, eventsList, config);
                
                if (dayEvents.length > 0) {
                    upcoming.push({
                        daysUntil: i,
                        date: calculateDate(futureDay, config.startDate, config),
                        events: dayEvents
                    });
                }
            }
            
            return upcoming;
        };
        
        Calendar.getAllEvents = () => {
            return loadEventDays();
        };
        
        Calendar.isEventDay = () => {
            return Calendar.getTodayEvents().length > 0;
        };
        
        Calendar.getMonthWeekdays = (monthOffset = 0) => {
            const state = loadTimeState();
            const config = loadConfiguration();
            if (!state || !config) return null;
            
            // Get target month/year
            const currentDate = calculateDateInfo(state.day, config.startDate, config);
            let targetMonth = currentDate.month + monthOffset;
            let targetYear = currentDate.year;
            
            // Handle month overflow/underflow
            while (targetMonth >= config.months.length) {
                targetMonth -= config.months.length;
                targetYear++;
            }
            while (targetMonth < 0) {
                targetMonth += config.months.length;
                targetYear--;
            }
            
            const monthName = config.months[targetMonth];
            const daysInMonth = getDaysInMonth(targetMonth, targetYear, config);
            const weekdayMap = {};
            
            // Initialize arrays for each weekday
            config.daysOfWeek.forEach(day => {
                weekdayMap[day] = [];
            });
            
            // Map each day to its weekday
            for (let day = 1; day <= daysInMonth; day++) {
                const weekdayIndex = getDayOfWeekForDate(targetMonth, day, targetYear, config);
                const weekdayName = config.daysOfWeek[weekdayIndex];
                weekdayMap[weekdayName].push(day);
            }
            
            return {
                month: monthName,
                year: targetYear,
                weekdays: weekdayMap
            };
        };
        
        Calendar.clearEventCache = () => {
            eventCache = null;
            return true;
        };
        
        // Core methods
        Calendar.getState = () => loadTimeState();
        Calendar.getConfig = () => loadConfiguration();
        
        // Time manipulation methods
        Calendar.advanceTime = (timeSpec) => {
            const state = loadTimeState();
            const config = loadConfiguration();
            if (!state || !config || typeof timeSpec !== 'string') return false;
            
            // Parse time specification like "3d", "-2h30m", "1d, 4h, 30m"
            let totalHours = 0;
            
            // Split by commas for multiple parts
            const parts = timeSpec.split(',').map(p => p.trim());
            
            for (const part of parts) {
                // First try combined format like "2h30m" or "-2h30m"
                const combinedMatch = part.match(/^(-?\d+)h(\d+)m$/i);
                if (combinedMatch) {
                    const hours = parseInt(combinedMatch[1]);
                    const minutes = parseInt(combinedMatch[2]);
                    // For negative hours, minutes should also subtract
                    totalHours += hours + (hours < 0 ? -minutes/60 : minutes/60);
                    continue;
                }
                
                // Then try single unit format like "3d", "-2.5h", "30m"
                const singleMatch = part.match(/^(-?\d+(?:\.\d+)?)\s*([dhm])$/i);
                if (!singleMatch) return false;
                
                const amount = parseFloat(singleMatch[1]);
                const unit = singleMatch[2].toLowerCase();
                
                switch (unit) {
                    case 'd':
                        totalHours += amount * config.hoursPerDay;
                        break;
                    case 'h':
                        totalHours += amount;
                        break;
                    case 'm':
                        totalHours += amount / 60;
                        break;
                }
            }
            
            if (totalHours === 0) return false;
            
            const progressToAdd = totalHours / config.hoursPerDay;
            const actionsToAdd = Math.round(progressToAdd * config.actionsPerDay);
            
            let newProgress = state.progress + actionsToAdd;
            let newDay = state.day;
            
            // Handle day overflow/underflow
            while (newProgress >= config.actionsPerDay) {
                newProgress -= config.actionsPerDay;
                newDay++;
            }
            while (newProgress < 0) {
                newProgress += config.actionsPerDay;
                newDay--;
            }
            
            const newState = {
                day: newDay,
                progress: newProgress,
                lastProcessedAction: state.lastProcessedAction
            };
            
            saveTimeState(newState);
            return true;
        };
        
        Calendar.setTime = (hour, minute = 0) => {
            const state = loadTimeState();
            const config = loadConfiguration();
            if (!state || !config) return false;
            
            // Validate input
            if (typeof hour !== 'number' || hour < 0 || hour >= config.hoursPerDay) return false;
            if (typeof minute !== 'number' || minute < 0 || minute >= 60) return false;
            
            const targetProgress = parseTimeToProgress(
                `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
                config.hoursPerDay
            );
            const newProgress = Math.floor(targetProgress * config.actionsPerDay);
            
            const newState = {
                day: state.day,
                progress: newProgress,
                lastProcessedAction: state.lastProcessedAction
            };
            
            saveTimeState(newState);
            return true;
        };
        
        Calendar.setActionsPerDay = (newActionsPerDay) => {
            const config = loadConfiguration();
            const state = loadTimeState();
            if (!config || !state) return false;
            
            // Validate input
            if (typeof newActionsPerDay !== 'number' || newActionsPerDay < 1) return false;
            
            // Calculate current time progress
            const currentProgress = state.progress / config.actionsPerDay;
            
            // Update configuration
            const configCard = Utilities.storyCard.get(CONFIG_CARD);
            if (!configCard) return false;
            
            let configText = configCard.entry || '';
            configText = configText.replace(
                /Actions Per Day:\s*\d+/,
                `Actions Per Day: ${Math.floor(newActionsPerDay)}`
            );
            
            Utilities.storyCard.update(CONFIG_CARD, { entry: configText });
            
            // Adjust current progress to maintain same time
            const newProgress = Math.floor(currentProgress * newActionsPerDay);
            
            const newState = {
                day: state.day,
                progress: newProgress,
                lastProcessedAction: state.lastProcessedAction
            };
            
            saveTimeState(newState);
            return true;
        };
        
        Calendar.setHoursPerDay = (newHoursPerDay) => {
            const config = loadConfiguration();
            const state = loadTimeState();
            if (!config || !state) return false;
            
            // Validate input
            if (typeof newHoursPerDay !== 'number' || newHoursPerDay < 1) return false;
            
            // Calculate current progress through the day (0.0 to 1.0)
            const dayProgress = state.progress / config.actionsPerDay;
            
            // Update configuration
            const configCard = Utilities.storyCard.get(CONFIG_CARD);
            if (!configCard) return false;
            
            let configText = configCard.entry || '';
            configText = configText.replace(
                /Hours Per Day:\s*\d+/,
                `Hours Per Day: ${Math.floor(newHoursPerDay)}`
            );
            
            Utilities.storyCard.update(CONFIG_CARD, { entry: configText });
            
            // Maintain same progress through the day
            // No need to adjust progress since it's already percentage-based
            // The time display will automatically adjust based on new hours per day
            
            saveTimeState(state);
            return true;
        };
        
        Calendar.setDay = (newDay) => {
            const state = loadTimeState();
            if (!state) return false;
            
            // Validate input
            if (typeof newDay !== 'number') return false;
            
            const newState = {
                day: Math.floor(newDay),
                progress: state.progress,
                lastProcessedAction: state.lastProcessedAction
            };
            
            saveTimeState(newState);
            return true;
        };
        
        // Context hook doesn't need to return anything
        return;
    }
    
    // Default return for other hooks
    return text;
}
