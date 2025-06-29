const Utilities = (function() {
    'use strict';
    
    // Usage in other modules:
    // const data = Utilities.plainText.parseEncapsulated(text);
    // const hash = Utilities.math.hash(input);
    // const card = Utilities.storyCard.get(title);
    
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
            // Handle actual boolean values
            if (str === true) return true;
            if (str === false) return false;
            if (str == null) return false;
            
            const normalized = String(str).toLowerCase().trim();
            
            // Include common abbreviations
            return ['true', 't', 'yes', 'y', '1', 'on', 'enabled', 'enable'].includes(normalized);
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
