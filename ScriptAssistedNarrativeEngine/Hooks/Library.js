const Utilities = (function() {
    'use strict';
    
    // =====================================
    // UTILITIES API DOCUMENTATION
    // =====================================
    
    /**
     * TABLE OF CONTENTS
     * =================
     * 
     * Core Modules:
     * - expression: Expression parser for evaluating conditional logic
     * - plainText: Parse and format structured plain text data
     * - string: Text manipulation and conversion utilities
     * - math: Mathematical operations including dice rolling
     * - collection: Array and object manipulation utilities
     * 
     * Formatting:
     * - format: Number and string formatting utilities
     * 
     * AI Dungeon Specific:
     * - storyCard: Story Card operations (get, find, add, update, remove, upsert)
     * - history: Access and search action history
     * - context: Extract and parse context information
     * 
     * Data Processing:
     * - parsing: Parse various text formats (pipe/colon delimited, key=value, etc.)
     * - config: Configuration management using Story Cards
     * 
     * Advanced:
     * - functional: Functional programming utilities (compose, memoize, etc.)
     * - regex: Regex compilation and caching system
     * - cache: Turn-based cache storage
     * - patterns: Common precompiled regex patterns
     */
    
    /**
     * EXPRESSION PARSER API
     * =====================
     * General-purpose expression parser for evaluating string expressions
     * with state/info access, text matching, regex, and fuzzy matching.
     * 
     * parse(expression: string) -> Function|null
     *   Parses expression and returns evaluator function
     *   Example: const eval = Utilities.expression.parse('state.health > 50')
     *   Returns: Function that takes optional text parameter
     *   
     * evaluate(expression: string, text?: string) -> any
     *   One-step parse and evaluate
     *   Example: Utilities.expression.evaluate('count("gold") >= 3', recentStory)
     *   
     * compile(expression: string) -> Function
     *   Compiles expression for repeated use
     *   Example: const healthCheck = Utilities.expression.compile('state.health < 20')
     *   
     * EXPRESSION SYNTAX:
     * 
     * Basic Operations:
     *   state.health > 50
     *   info.actionCount >= 100
     *   state.name == "Alice" || state.class == "Warrior"
     *   
     * Boolean Functions:
     *   any("sword", "blade", "weapon")  // True if any word appears
     *   all("quest", "complete")         // True if all words appear
     *   none("fail", "death", "game over") // True if no words appear
     *   
     * Text Matching:
     *   count("gold") >= 3           // Count occurrences
     *   near("sword", "broken", 50)  // Words within distance
     *   sequence("opened", "door")   // Words in order
     *   
     * Fuzzy Matching:
     *   fuzzy("swrod")               // Finds if any word in text fuzzy matches "swrod"
     *   fuzzy("swrod", 0.7)          // With custom threshold (0-1)
     *   fuzzyFind("attck")           // Returns best matching word or null
     *   fuzzyAny(["attck", "defnd"]) // True if any candidate fuzzy matches
     *   
     * RegEx (with ~ syntax):
     *   ~dragon\s+slain~             // Tests regex against text
     *   ~\b(gold|silver)\s+coins?\b~i // With flags
     *   regex("pattern", "flags")    // Explicit function syntax
     *   
     * Array/Object Operations:
     *   state.inventory.includes("key")
     *   state.items.filter(i => i.type == "weapon").length > 0
     *   state.quests.some(q => q.active && q.level <= state.level)
     */
    
    /**
     * PLAIN TEXT PARSER API
     * =====================
     * Parse and format structured plain text data using a custom format:
     * {# Main Header
     * ## Section Name
     * Key: Value
     * - List items
     * | Table | Headers |
     * }
     * 
     * PARSING METHODS:
     * 
     * parseEncapsulated(text: string) -> {name: string, sections: Object}|null
     *   Parses text in {# Header ... } format into structured data
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
     *   Formats an object back into {# Header ... } format
     *   Example: Utilities.plainText.formatEncapsulated({name: 'Config', sections: {...}})
     *   
     * formatList(items: Array) -> string
     *   Formats array into a bullet list with smart object handling
     *   Example: Utilities.plainText.formatList([{name: 'Potion', quantity: 5}])
     *   Returns: '- Potion x5'
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
     * sanitize(str: string, allowedChars?: string) -> string
     *   Removes special characters, keeping only alphanumeric + allowed
     *   Example: Utilities.string.sanitize('Hello@World!', '@') // 'Hello@World'
     *   
     * extractNumbers(str: string) -> number[]
     *   Extracts all numbers from a string
     *   Example: Utilities.string.extractNumbers('Order 66 costs $25.50') // [66, 25.50]
     *   
     * parseBoolean(str: string) -> boolean
     *   Converts string to boolean (defaults to false unless explicitly true)
     *   True values: 'true', 'yes', 'y', '1', 'on', 'enabled'
     *   Example: Utilities.string.parseBoolean('yes') // true
     *   Example: Utilities.string.parseBoolean('maybe') // false
     *   
     * levenshteinDistance(str1: string, str2: string) -> number
     *   Calculates edit distance between two strings
     *   Example: Utilities.string.levenshteinDistance('kitten', 'sitting') // 3
     *   
     * similarity(str1: string, str2: string) -> number
     *   Returns similarity score between 0-1 using Levenshtein distance
     *   Example: Utilities.string.similarity('hello', 'hallo') // 0.8
     *   
     * fuzzyMatch(str: string, pattern: string, threshold?: number) -> boolean
     *   Checks if strings are similar enough (default threshold: 0.8)
     *   Example: Utilities.string.fuzzyMatch('sword', 'swrod') // true
     *   
     * findBestMatch(target: string, candidates: string[]) -> {match: string, score: number}|null
     *   Finds the best matching string from candidates
     *   Example: Utilities.string.findBestMatch('swrd', ['sword', 'shield', 'staff'])
     *   Returns: {match: 'sword', score: 0.75}
     *   
     * wordWrap(text: string, maxWidth: number, indent?: string) -> string
     *   Wraps text to specified width, preserving words
     *   Example: Utilities.string.wordWrap('Long text here', 10) // "Long text\nhere"
     *   
     * tokenize(text: string) -> string[]
     *   Splits text into tokens (words and punctuation)
     *   Example: Utilities.string.tokenize("Hello, world!") // ["Hello", ",", "world", "!"]
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
     *   
     * roll(notation: string, seed?: any) -> {total: number, rolls: number[], notation: string}
     *   Rolls dice using standard notation (e.g., "3d6+2")
     *   Example: Utilities.math.roll('2d20+5', 'seed')
     *   Returns: {total: 27, rolls: [11, 11], notation: '2d20+5'}
     *   
     * bestOf(values: number[], count?: number) -> number
     *   Returns the best (highest) of values
     *   Example: Utilities.math.bestOf([12, 18, 9]) // 18
     *   Example: Utilities.math.bestOf([12, 18, 9, 20], 2) // 18 (2nd best)
     *   
     * worstOf(values: number[], count?: number) -> number
     *   Returns the worst (lowest) of values
     *   Example: Utilities.math.worstOf([12, 18, 9]) // 9
     *   Example: Utilities.math.worstOf([12, 18, 9, 20], 2) // 12 (2nd worst)
     *   
     * averageOf(values: number[], roundToInt?: boolean) -> number
     *   Returns the average of values
     *   Example: Utilities.math.averageOf([12, 18, 9]) // 13
     *   Example: Utilities.math.averageOf([12, 18, 9], false) // 13.0
     *   
     * distance(x1: number, y1: number, x2: number, y2: number) -> number
     *   Calculates Euclidean distance between two points
     *   Example: Utilities.math.distance(0, 0, 3, 4) // 5
     *   
     * manhattanDistance(x1: number, y1: number, x2: number, y2: number) -> number
     *   Calculates Manhattan (grid) distance
     *   Example: Utilities.math.manhattanDistance(0, 0, 3, 4) // 7
     *   
     * normalize(value: number, min: number, max: number) -> number
     *   Normalizes value to 0-1 range
     *   Example: Utilities.math.normalize(75, 0, 100) // 0.75
     *   
     * denormalize(value: number, min: number, max: number) -> number
     *   Converts 0-1 value to specified range
     *   Example: Utilities.math.denormalize(0.75, 0, 100) // 75
     *   
     * inRange(value: number, range: [number, number]) -> boolean
     *   Checks if value is within range (inclusive)
     *   Example: Utilities.math.inRange(5, [1, 10]) // true
     *   
     * modulo(n: number, m: number) -> number
     *   True modulo operation (handles negatives correctly)
     *   Example: Utilities.math.modulo(-1, 4) // 3
     *   
     * factorial(n: number) -> number
     *   Calculates factorial (limited to prevent overflow)
     *   Example: Utilities.math.factorial(5) // 120
     *   
     * combinations(n: number, k: number) -> number
     *   Calculates combinations (n choose k)
     *   Example: Utilities.math.combinations(5, 2) // 10
     *   
     * range(start: number, end: number, step?: number) -> number[]
     *   Generates array of numbers in range
     *   Example: Utilities.math.range(1, 5) // [1, 2, 3, 4]
     *   Example: Utilities.math.range(0, 10, 2) // [0, 2, 4, 6, 8]
     *   Note: More intuitive than Array.from({length: n}, (_, i) => start + i * step)
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
     *   Note: structuredClone() may not be available in isolated-vm, and ours handles Date objects
     *   
     * deepEquals(a: any, b: any) -> boolean
     *   Deep comparison of values including objects and arrays
     *   Example: Utilities.collection.deepEquals({a: [1,2]}, {a: [1,2]}) // true
     *   
     * shuffle(array: any[], seed?: any) -> any[]
     *   Returns deterministically shuffled copy using seed
     *   Example: Utilities.collection.shuffle([1,2,3,4,5], 'seed123')
     *   
     * sample(array: any[], count: number, seed?: any) -> any[]
     *   Returns random sample of items (no duplicates)
     *   Example: Utilities.collection.sample([1,2,3,4,5], 3, 'seed') // [2,5,1]
     *   
     * weightedRandom(items: Array<{value: any, weight: number}>, seed?: any) -> any
     *   Selects item based on weights
     *   Example: Utilities.collection.weightedRandom([
     *     {value: 'common', weight: 70},
     *     {value: 'rare', weight: 25},
     *     {value: 'legendary', weight: 5}
     *   ], 'seed123') // likely 'common'
     *   
     * partition(array: any[], predicate: Function) -> [any[], any[]]
     *   Splits array into two based on predicate
     *   Example: Utilities.collection.partition([1,2,3,4], x => x % 2 === 0)
     *   Returns: [[2,4], [1,3]]
     *   
     * zip(...arrays: any[][]) -> any[][]
     *   Combines arrays element-wise
     *   Example: Utilities.collection.zip([1,2,3], ['a','b','c'])
     *   Returns: [[1,'a'], [2,'b'], [3,'c']]
     *   
     * frequency(array: any[]) -> Object
     *   Counts occurrences of each element
     *   Example: Utilities.collection.frequency(['a','b','a','c','b','a'])
     *   Returns: {a: 3, b: 2, c: 1}
     *   
     * difference(array1: any[], array2: any[]) -> any[]
     *   Returns elements in array1 not in array2
     *   Example: Utilities.collection.difference([1,2,3,4], [2,4]) // [1,3]
     *   
     * intersection(array1: any[], array2: any[]) -> any[]
     *   Returns elements present in both arrays
     *   Example: Utilities.collection.intersection([1,2,3], [2,3,4]) // [2,3]
     *   
     * rotate(array: any[], positions: number) -> any[]
     *   Rotates array elements by specified positions
     *   Example: Utilities.collection.rotate([1,2,3,4,5], 2) // [4,5,1,2,3]
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
     * formatWithSymbol(value: number, symbol?: string, position?: string) -> string
     *   Formats number with a symbol (commonly used for currency)
     *   Example: Utilities.format.formatWithSymbol(1000) // '$ 1,000'
     *   Example: Utilities.format.formatWithSymbol(50, '€', 'append') // '50 €'
     *   
     * formatPercentage(value: number, decimals?: number) -> string
     *   Formats decimal as percentage
     *   Example: Utilities.format.formatPercentage(0.85, 1) // '85.0%'
     *   
     * formatTime(hour: number, minute?: number, second?: number, format?: string) -> string
     *   Formats time with configurable output format
     *   Format options: 'HH:MM' (default), 'HH:MM:SS', 'H:MM', 'H:MM:SS'
     *   Example: Utilities.format.formatTime(9, 5) // '09:05'
     *   Example: Utilities.format.formatTime(14, 30, 45, 'HH:MM:SS') // '14:30:45'
     *   Example: Utilities.format.formatTime(9, 5, 0, 'H:MM') // '9:05'
     *   
     * formatDuration(seconds: number) -> string
     *   Formats seconds as human-readable duration
     *   Example: Utilities.format.formatDuration(3665) // '1h 1m 5s'
     *   
     * formatBar(current: number, max: number, width?: number, char?: string) -> string
     *   Creates ASCII progress bar visualization
     *   Example: Utilities.format.formatBar(30, 100, 10) // '[███-------]'
     *   Example: Utilities.format.formatBar(7, 10, 20, '*') // '[**************------]'
     *   
     * formatList(items: string[], bullet?: string) -> string
     *   Formats array as bullet list (default bullet: '•')
     *   Example: Utilities.format.formatList(['First', 'Second']) // '• First\n• Second'
     */
    
    
    /**
     * PARSING UTILITIES API
     * =====================
     * General-purpose parsing utilities for various text formats
     * 
     * 
     * parseDelimited(text: string, itemDelimiter: string, keyValueDelimiter: string, options?: Object) -> Object
     *   Unified delimiter parser - handles all delimited formats
     *   Options: removeBraces, parseNumbers, skipComments, toLowerCase
     *   Example: Utilities.parsing.parseDelimited('a:1|b:2', '|', ':')
     *   Returns: {a: 1, b: 2}
     *   
     * parsePipeDelimited(text: string) -> Object
     *   Parse pipe-delimited key-value pairs
     *   Example: Utilities.parsing.parsePipeDelimited('VITALITY: 10 | STRENGTH: 9')
     *   Returns: {vitality: 10, strength: 9}
     *   
     * parseBracedList(text: string) -> Object
     *   Parse braced list format
     *   Example: Utilities.parsing.parseBracedList('{gold:500, health_potion:2}')
     *   Returns: {gold: 500, health_potion: 2}
     *   
     * parseEqualsValue(text: string) -> Object
     *   Parse equals-separated values with optional descriptions
     *   Example: Utilities.parsing.parseEqualsValue('john_smith=50 [Friendly merchant]')
     *   Returns: {john_smith: 50}
     *   
     * parseColonKeyValue(text: string) -> Object
     *   Parse colon-separated key-value pairs (one per line)
     *   Example: Utilities.parsing.parseColonKeyValue('name: John\nage: 25')
     *   Returns: {name: 'John', age: 25}
     *   
     * parseLines(text: string, skipEmpty?: boolean, skipComments?: boolean) -> Array<string>
     *   Parse structured text with comment filtering
     *   Example: Utilities.parsing.parseLines('line1\n// comment\nline2')
     *   Returns: ['line1', 'line2']
     *   
     * parseKeyValuePairs(text: string, delimiter?: string) -> Object
     *   Parses key=value pairs from text
     *   Example: Utilities.parsing.parseKeyValuePairs('name=John age=25 active=true')
     *   Returns: {name: 'John', age: 25, active: true}
     *   
     * parseRange(text: string) -> {min: number, max: number}|null
     *   Parses range expressions like "10-20", "5 to 10"
     *   Example: Utilities.parsing.parseRange('10-20')
     *   Returns: {min: 10, max: 20}
     */
    
    /**
     * CONFIGURATION UTILITIES API
     * ===========================
     * Centralized configuration management using Story Cards
     * 
     * load(cardTitle: string, parser?: Function, onCreate?: Function, cacheResult?: boolean) -> Object|null
     *   Load and cache a configuration from a Story Card
     *   Example: Utilities.config.load('[RPG] Config')
     *   Returns: Parsed configuration object or null
     *   
     * loadSectioned(cardTitle: string, sectionSeparator?: string) -> Object
     *   Load configuration with sections (like [RPG_RUNTIME] Variables format)
     *   Example: Utilities.config.loadSectioned('[RPG_RUNTIME] Variables', '# ')
     *   Returns: {section1: content, section2: content, ...}
     *   
     * getValue(cardTitle: string, key: string, defaultValue?: any) -> any
     *   Get a value from a configuration card (supports dot notation)
     *   Example: Utilities.config.getValue('[RPG] Config', 'player.health', 100)
     *   Returns: The configuration value or default
     *   
     * setValue(cardTitle: string, key: string, value: any) -> boolean
     *   Update a configuration value and save to Story Card
     *   Example: Utilities.config.setValue('[RPG] Config', 'player.level', 5)
     *   Returns: Success status
     *   
     * clearCache(cardTitle?: string) -> void
     *   Clear configuration cache (specific card or all)
     *   Example: Utilities.config.clearCache('[RPG] Config')
     *   
     * exists(cardTitle: string) -> boolean
     *   Check if a configuration exists
     *   Example: Utilities.config.exists('[RPG] Config')
     *   Returns: true if the Story Card exists
     */
    
    /**
     * CACHE MANAGEMENT API
     * ====================
     * Cache systems for performance optimization
     * 
     * clearAll() -> void
     *   Clear all caches (regex and turn-based)
     *   Useful for memory management or testing
     *   Example: Utilities.clearAll()
     *   
     * regex - RegEx cache system
     * cache - Turn-based cache system
     * patterns - Common regex patterns
     */
    
    /**
     * FUNCTIONAL UTILITIES API
     * ========================
     * Functional programming utilities
     * 
     * compose(...fns: Function[]) -> Function
     *   Composes functions right to left
     *   Example: const process = Utilities.functional.compose(capitalize, trim, toLowerCase);
     *   process('  HELLO  ') // 'Hello'
     *   
     * pipe(...fns: Function[]) -> Function
     *   Pipes functions left to right
     *   Example: const process = Utilities.functional.pipe(trim, toLowerCase, capitalize);
     *   process('  HELLO  ') // 'Hello'
     *   
     * memoize(fn: Function, keyFn?: Function) -> Function
     *   Returns memoized version of function
     *   Example: const expensiveCalc = Utilities.functional.memoize(calculate);
     *   
     * curry(fn: Function) -> Function
     *   Returns curried version of function
     *   Example: const add = Utilities.functional.curry((a, b, c) => a + b + c);
     *   add(1)(2)(3) // 6
     *   
     * once(fn: Function) -> Function
     *   Ensures function is called only once
     *   Example: const init = Utilities.functional.once(initialize);
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
     */
    
    /**
     * HISTORY UTILITIES API
     * =====================
     * Access and search AI Dungeon action history
     * Note: AI Dungeon limits history to maximum 100 actions
     * 
     * readPastAction(lookBack: number) -> {text: string, type: string}
     *   Reads action from history (0 = most recent, max 99)
     *   Example: Utilities.history.readPastAction(0) // {text: 'Open the door', type: 'do'}
     *   
     * searchHistory(pattern: string|RegExp, maxLookBack?: number) -> Array
     *   Searches history for pattern matches (maxLookBack capped at 100)
     *   @param pattern - String (case-insensitive) or RegExp to search for
     *   @param maxLookBack - How many actions to search (default: 10, max: 100)
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
     *   Example: Utilities.cache.set('combat', 'lastTarget', 'Goblin A')
     *   Example: Utilities.cache.get('cards', 'playerCard') // cached card lookup
     *   
     * patterns -> Object
     *   Common precompiled regex patterns ready to use
     *   Example: Utilities.patterns.entityTitle.test('[USER] John') // true
     *   Available patterns: entityTitle, integer, decimal, percentage, etc.
     */
    
    // =====================================
    // EXPRESSION PARSER
    // =====================================
    const ExpressionParser = {
        // Token types
        TokenType: {
            // Literals
            NUMBER: 'NUMBER',
            STRING: 'STRING',
            BOOLEAN: 'BOOLEAN',
            NULL: 'NULL',
            UNDEFINED: 'UNDEFINED',
            IDENTIFIER: 'IDENTIFIER',
            
            // Operators
            PLUS: 'PLUS',
            MINUS: 'MINUS',
            MULTIPLY: 'MULTIPLY',
            DIVIDE: 'DIVIDE',
            MODULO: 'MODULO',
            
            // Comparison
            EQUALS: 'EQUALS',
            NOT_EQUALS: 'NOT_EQUALS',
            STRICT_EQUALS: 'STRICT_EQUALS',
            STRICT_NOT_EQUALS: 'STRICT_NOT_EQUALS',
            LESS_THAN: 'LESS_THAN',
            LESS_THAN_EQUALS: 'LESS_THAN_EQUALS',
            GREATER_THAN: 'GREATER_THAN',
            GREATER_THAN_EQUALS: 'GREATER_THAN_EQUALS',
            
            // Logical
            AND: 'AND',
            OR: 'OR',
            NOT: 'NOT',
            
            // Structural
            LPAREN: 'LPAREN',
            RPAREN: 'RPAREN',
            LBRACKET: 'LBRACKET',
            RBRACKET: 'RBRACKET',
            DOT: 'DOT',
            COMMA: 'COMMA',
            ARROW: 'ARROW',
            COLON: 'COLON',
            
            // Special
            OPERATOR_FUNC: 'OPERATOR_FUNC',
            EOF: 'EOF'
        },
        
        // Built-in functions (for text expressions)
        builtinFunctions: {
            // RegEx testing
            regex(text, pattern, flags = '') {
                try {
                    const re = new RegExp(pattern, flags);
                    return re.test(text);
                } catch (e) {
                    console.log('[Expression] Invalid regex:', e.message);
                    return false;
                }
            },
            
            // Fuzzy word matching
            fuzzy(text, pattern, threshold = 0.8) {
                const words = text.match(/\b\w+\b/g) || [];
                const patternLower = pattern.toLowerCase();
                const patternLen = pattern.length;
                
                const minLen = Math.max(1, patternLen - 2);
                const maxLen = patternLen + 2;
                
                for (const word of words) {
                    if (word.length >= minLen && word.length <= maxLen) {
                        if (StringUtils.fuzzyMatch(word, pattern, threshold)) {
                            return true;
                        }
                    }
                }
                
                return false;
            },
            
            // Find best fuzzy match word in text
            fuzzyFind(text, pattern, threshold = 0.8) {
                const words = text.match(/\b\w+\b/g) || [];
                const patternLen = pattern.length;
                const minLen = Math.max(1, patternLen - 2);
                const maxLen = patternLen + 2;
                
                let bestMatch = null;
                let bestScore = threshold;
                
                for (const word of words) {
                    if (word.length >= minLen && word.length <= maxLen) {
                        const score = StringUtils.similarity(word, pattern);
                        if (score >= threshold && score > bestScore) {
                            bestScore = score;
                            bestMatch = word;
                        }
                    }
                }
                
                return bestMatch;
            },
            
            // Check if any of the candidate words appear in text (fuzzy)
            fuzzyAny(text, candidates, threshold = 0.8) {
                if (!Array.isArray(candidates)) return false;
                
                for (const candidate of candidates) {
                    if (this.fuzzy(text, candidate, threshold)) {
                        return true;
                    }
                }
                
                return false;
            },
            
            // Words within distance
            near(text, word1, word2, maxDistance = 50) {
                const regex1 = new RegExp('\\b' + this.escapeRegex(word1) + '\\b', 'gi');
                const regex2 = new RegExp('\\b' + this.escapeRegex(word2) + '\\b', 'gi');
                
                let match1, match2;
                while ((match1 = regex1.exec(text)) !== null) {
                    regex2.lastIndex = 0;
                    while ((match2 = regex2.exec(text)) !== null) {
                        if (Math.abs(match2.index - match1.index) <= maxDistance) {
                            return true;
                        }
                    }
                }
                return false;
            },
            
            // Words in sequence
            sequence(text, ...words) {
                let lastIndex = -1;
                for (const word of words) {
                    const regex = new RegExp('\\b' + this.escapeRegex(word) + '\\b', 'i');
                    const match = text.substring(lastIndex + 1).match(regex);
                    if (!match) return false;
                    lastIndex = lastIndex + 1 + match.index;
                }
                return true;
            },
            
            seq(text, ...words) {
                return this.sequence(text, ...words);
            },
            
            // Count occurrences
            count(text, pattern) {
                if (pattern instanceof RegExp) {
                    const matches = text.match(new RegExp(pattern.source, pattern.flags + 'g'));
                    return matches ? matches.length : 0;
                }
                const regex = new RegExp('\\b' + this.escapeRegex(pattern) + '\\b', 'gi');
                const matches = text.match(regex);
                return matches ? matches.length : 0;
            },
            
            // Check if all patterns exist
            all(text, ...patterns) {
                return patterns.every(p => {
                    if (p instanceof RegExp) {
                        return p.test(text);
                    }
                    return text.toLowerCase().includes(p.toLowerCase());
                });
            },
            
            // Check if any pattern exists
            any(text, ...patterns) {
                return patterns.some(p => {
                    if (p instanceof RegExp) {
                        return p.test(text);
                    }
                    return text.toLowerCase().includes(p.toLowerCase());
                });
            },
            
            // Check if no patterns exist
            none(text, ...patterns) {
                return !patterns.some(p => {
                    if (p instanceof RegExp) {
                        return p.test(text);
                    }
                    return text.toLowerCase().includes(p.toLowerCase());
                });
            },
            
            // Helper to escape regex special chars
            escapeRegex(str) {
                return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            }
        },
        
        // Cache for compiled expressions
        _cache: new Map(),
        
        // Main parse method with context options
        parse(expression, options = {}) {
            const context = options.context || 'text';
            const target = options.target || null;
            
            // Check cache with context-aware key
            const cacheKey = `${expression}::${context}::${target}`;
            if (this._cache.has(cacheKey)) {
                return this._cache.get(cacheKey);
            }
            
            try {
                const tokens = this.tokenize(expression);
                const ast = this.parseExpression(tokens);
                const evaluator = this.compileAST(ast, { context, target });
                
                this._cache.set(cacheKey, evaluator);
                
                return evaluator;
            } catch (error) {
                console.log('[Expression] Parse error:', error.message);
                console.log('[Expression] Failed expression:', expression);
                // Log stack trace to find where this is being called from
                if (typeof Error !== 'undefined') {
                    const stack = new Error().stack;
                    if (stack) {
                        const lines = stack.split('\n').slice(1, 4); // Skip first line and get next 3
                        console.log('[Expression] Called from:', lines.join('\n'));
                    }
                }
                return null;
            }
        },
        
        // Convenience methods for specific contexts
        parseTextExpression(expression) {
            return this.parse(expression, { context: 'text' });
        },
        
        parseObjectQuery(expression, targetType = 'card') {
            return this.parse(expression, { context: 'object', target: targetType });
        },
        
        // One-step evaluate
        evaluate(expression, data) {
            const evaluator = this.parse(expression);
            return evaluator ? evaluator(data) : null;
        },
        
        // Evaluate convenience methods
        evaluateText(expression, text) {
            const evaluator = this.parseTextExpression(expression);
            return evaluator ? evaluator(text) : null;
        },
        
        evaluateObject(expression, obj, targetType = 'card') {
            const evaluator = this.parseObjectQuery(expression, targetType);
            return evaluator ? evaluator(obj) : null;
        },
        
        // Clear expression cache
        clearCache() {
            this._cache.clear();
        },
        
        // Tokenize expression
        tokenize(expr) {
            const tokens = [];
            let pos = 0;
            
            const peek = (offset = 0) => expr[pos + offset] || '';
            const advance = (count = 1) => { pos += count; };
            const isDigit = (ch) => /\d/.test(ch);
            const isAlpha = (ch) => /[a-zA-Z_$]/.test(ch);
            const isAlphaNum = (ch) => /[a-zA-Z0-9_$]/.test(ch);
            
            while (pos < expr.length) {
                // Skip whitespace
                if (/\s/.test(peek())) {
                    advance();
                    continue;
                }
                
                // RegEx literals with ~ delimiter
                if (peek() === '~') {
                    advance(); // Skip opening ~
                    let pattern = '';
                    let escaped = false;
                    
                    while (pos < expr.length && (peek() !== '~' || escaped)) {
                        if (escaped) {
                            pattern += peek();
                            escaped = false;
                        } else if (peek() === '\\') {
                            pattern += peek();
                            escaped = true;
                        } else {
                            pattern += peek();
                        }
                        advance();
                    }
                    
                    if (pos >= expr.length) {
                        throw new Error('Unterminated regex literal');
                    }
                    
                    advance(); // Skip closing ~
                    
                    // Collect flags
                    let flags = '';
                    while (pos < expr.length && /[gimsuvy]/.test(peek())) {
                        flags += peek();
                        advance();
                    }
                    
                    // Convert to regex function call
                    tokens.push({ type: this.TokenType.IDENTIFIER, value: 'regex' });
                    tokens.push({ type: this.TokenType.LPAREN });
                    tokens.push({ type: this.TokenType.STRING, value: pattern });
                    if (flags) {
                        tokens.push({ type: this.TokenType.COMMA });
                        tokens.push({ type: this.TokenType.STRING, value: flags });
                    }
                    tokens.push({ type: this.TokenType.RPAREN });
                    continue;
                }
                
                const threeChar = peek() + peek(1) + peek(2);
                if (threeChar === '===' || threeChar === '!==') {
                    tokens.push({ 
                        type: threeChar === '===' ? 
                            this.TokenType.STRICT_EQUALS : 
                            this.TokenType.STRICT_NOT_EQUALS 
                    });
                    advance(3);
                    continue;
                }

                const twoChar = peek() + peek(1);
                const twoCharOps = {
                    '&&': this.TokenType.AND,
                    '||': this.TokenType.OR,
                    '==': this.TokenType.EQUALS,
                    '!=': this.TokenType.NOT_EQUALS,
                    '<=': this.TokenType.LESS_THAN_EQUALS,
                    '>=': this.TokenType.GREATER_THAN_EQUALS,
                    '=>': this.TokenType.ARROW
                };

                if (twoCharOps[twoChar]) {
                    tokens.push({ type: twoCharOps[twoChar] });
                    advance(2);
                    continue;
                }

                const singleCharOps = {
                    '+': this.TokenType.PLUS,
                    '-': this.TokenType.MINUS,
                    '*': this.TokenType.MULTIPLY,
                    '/': this.TokenType.DIVIDE,
                    '%': this.TokenType.MODULO,
                    '<': this.TokenType.LESS_THAN,
                    '>': this.TokenType.GREATER_THAN,
                    '!': this.TokenType.NOT,
                    '(': this.TokenType.LPAREN,
                    ')': this.TokenType.RPAREN,
                    '[': this.TokenType.LBRACKET,
                    ']': this.TokenType.RBRACKET,
                    '.': this.TokenType.DOT,
                    ',': this.TokenType.COMMA,
                    ':': this.TokenType.COLON,
                    '=': this.TokenType.EQUALS
                };
                
                if (singleCharOps[peek()]) {
                    tokens.push({ type: singleCharOps[peek()] });
                    advance();
                    continue;
                }
                
                // Numbers
                if (isDigit(peek()) || (peek() === '.' && isDigit(peek(1)))) {
                    let num = '';
                    
                    while (isDigit(peek()) || peek() === '.') {
                        num += peek();
                        advance();
                    }
                    
                    tokens.push({
                        type: this.TokenType.NUMBER,
                        value: parseFloat(num)
                    });
                    continue;
                }
                
                // Strings
                if (peek() === '"' || peek() === "'") {
                    const quote = peek();
                    advance();
                    let str = '';
                    let escaped = false;
                    
                    while (pos < expr.length && (peek() !== quote || escaped)) {
                        if (escaped) {
                            const escapeMap = {
                                'n': '\n',
                                'r': '\r',
                                't': '\t',
                                '\\': '\\',
                                '"': '"',
                                "'": "'"
                            };
                            str += escapeMap[peek()] || peek();
                            escaped = false;
                        } else if (peek() === '\\') {
                            escaped = true;
                        } else {
                            str += peek();
                        }
                        advance();
                    }
                    
                    if (pos >= expr.length) {
                        throw new Error('Unterminated string');
                    }
                    
                    advance(); // Skip closing quote
                    tokens.push({
                        type: this.TokenType.STRING,
                        value: str
                    });
                    continue;
                }
                
                // Identifiers and keywords
                if (isAlpha(peek())) {
                    let ident = '';
                    
                    while (isAlphaNum(peek())) {
                        ident += peek();
                        advance();
                    }
                    
                    // Check for keywords
                    const keywords = {
                        'true': { type: this.TokenType.BOOLEAN, value: true },
                        'false': { type: this.TokenType.BOOLEAN, value: false },
                        'null': { type: this.TokenType.NULL, value: null },
                        'undefined': { type: this.TokenType.UNDEFINED, value: undefined },
                        'AND': { type: this.TokenType.AND },
                        'OR': { type: this.TokenType.OR },
                        'NOT': { type: this.TokenType.NOT },
                        'contains': { type: this.TokenType.OPERATOR_FUNC, value: 'contains' },
                        'includes': { type: this.TokenType.OPERATOR_FUNC, value: 'includes' },
                        'startsWith': { type: this.TokenType.OPERATOR_FUNC, value: 'startsWith' },
                        'endsWith': { type: this.TokenType.OPERATOR_FUNC, value: 'endsWith' },
                        'match': { type: this.TokenType.OPERATOR_FUNC, value: 'match' },
                        'regex': { type: this.TokenType.OPERATOR_FUNC, value: 'regex' },
                        'starts': { type: this.TokenType.OPERATOR_FUNC, value: 'startsWith' },
                        'ends': { type: this.TokenType.OPERATOR_FUNC, value: 'endsWith' },
                        'gt': { type: this.TokenType.OPERATOR_FUNC, value: 'gt' },
                        'lt': { type: this.TokenType.OPERATOR_FUNC, value: 'lt' },
                        'gte': { type: this.TokenType.OPERATOR_FUNC, value: 'gte' },
                        'lte': { type: this.TokenType.OPERATOR_FUNC, value: 'lte' }
                    };
                    
                    if (keywords[ident]) {
                        tokens.push(keywords[ident]);
                    } else {
                        tokens.push({
                            type: this.TokenType.IDENTIFIER,
                            value: ident
                        });
                    }
                    continue;
                }
                
                throw new Error(`Unexpected character '${peek()}' at position ${pos}`);
            }
            
            tokens.push({ type: this.TokenType.EOF });
            return tokens;
        },
        
        // Parse tokens into AST
        parseExpression(tokens) {
            let current = 0;
            
            const peek = (offset = 0) => tokens[current + offset] || { type: this.TokenType.EOF };
            const consume = (type) => {
                if (peek().type !== type) {
                    throw new Error(`Expected ${type} but got ${peek().type}`);
                }
                return tokens[current++];
            };
            const match = (...types) => types.includes(peek().type);
            
            // Expression parsing with precedence
            const parseOr = () => {
                let left = parseAnd();
                
                while (match(this.TokenType.OR)) {
                    consume(this.TokenType.OR);
                    const right = parseAnd();
                    left = { type: 'LogicalExpression', operator: '||', left, right };
                }
                
                return left;
            };
            
            const parseAnd = () => {
                let left = parseEquality();
                
                while (match(this.TokenType.AND)) {
                    consume(this.TokenType.AND);
                    const right = parseEquality();
                    left = { type: 'LogicalExpression', operator: '&&', left, right };
                }
                
                return left;
            };
            
            const parseEquality = () => {
                let left = parseRelational();
                
                while (match(
                    this.TokenType.EQUALS,
                    this.TokenType.NOT_EQUALS,
                    this.TokenType.STRICT_EQUALS,
                    this.TokenType.STRICT_NOT_EQUALS
                )) {
                    const op = tokens[current++];
                    const right = parseRelational();
                    left = {
                        type: 'BinaryExpression',
                        operator: op.type === this.TokenType.EQUALS ? '==' :
                                  op.type === this.TokenType.NOT_EQUALS ? '!=' :
                                  op.type === this.TokenType.STRICT_EQUALS ? '===' : '!==',
                        left,
                        right
                    };
                }
                
                return left;
            };
            
            const parseRelational = () => {
                let left = parseAdditive();
                
                while (match(
                    this.TokenType.LESS_THAN,
                    this.TokenType.LESS_THAN_EQUALS,
                    this.TokenType.GREATER_THAN,
                    this.TokenType.GREATER_THAN_EQUALS
                )) {
                    const op = tokens[current++];
                    const right = parseAdditive();
                    left = {
                        type: 'BinaryExpression',
                        operator: op.type === this.TokenType.LESS_THAN ? '<' :
                                  op.type === this.TokenType.LESS_THAN_EQUALS ? '<=' :
                                  op.type === this.TokenType.GREATER_THAN ? '>' : '>=',
                        left,
                        right
                    };
                }
                
                return left;
            };
            
            const parseAdditive = () => {
                let left = parseMultiplicative();
                
                while (match(this.TokenType.PLUS, this.TokenType.MINUS)) {
                    const op = tokens[current++];
                    const right = parseMultiplicative();
                    left = {
                        type: 'BinaryExpression',
                        operator: op.type === this.TokenType.PLUS ? '+' : '-',
                        left,
                        right
                    };
                }
                
                return left;
            };
            
            const parseMultiplicative = () => {
                let left = parseUnary();
                
                while (match(this.TokenType.MULTIPLY, this.TokenType.DIVIDE, this.TokenType.MODULO)) {
                    const op = tokens[current++];
                    const right = parseUnary();
                    left = {
                        type: 'BinaryExpression',
                        operator: op.type === this.TokenType.MULTIPLY ? '*' :
                                  op.type === this.TokenType.DIVIDE ? '/' : '%',
                        left,
                        right
                    };
                }
                
                return left;
            };
            
            const parseUnary = () => {
                if (match(this.TokenType.NOT, this.TokenType.MINUS, this.TokenType.PLUS)) {
                    const op = tokens[current++];
                    const operand = parseUnary();
                    return {
                        type: 'UnaryExpression',
                        operator: op.type === this.TokenType.NOT ? '!' :
                                  op.type === this.TokenType.MINUS ? '-' : '+',
                        operand
                    };
                }
                
                return parsePostfix();
            };
            
            const parsePostfix = () => {
                let left = parsePrimary();
                
                while (true) {
                    // Check for object query syntax (field: value)
                    if (match(this.TokenType.COLON)) {
                        consume(this.TokenType.COLON);
                        
                        // Handle operator functions after colon
                        if (match(this.TokenType.OPERATOR_FUNC)) {
                            const op = consume(this.TokenType.OPERATOR_FUNC);
                            const value = parseUnary();
                            left = {
                                type: 'ObjectQuery',
                                field: left.type === 'Identifier' ? left.name : 
                                      left.type === 'MemberExpression' ? this.memberExprToPath(left) : 
                                      String(left),
                                operator: op.value,
                                value: value
                            };
                        } else {
                            // Simple equality
                            const value = parseUnary();
                            left = {
                                type: 'ObjectQuery',
                                field: left.type === 'Identifier' ? left.name : 
                                      left.type === 'MemberExpression' ? this.memberExprToPath(left) : 
                                      String(left),
                                operator: 'equals',
                                value: value
                            };
                        }
                        continue;
                    }
                    
                    // Property access
                    if (match(this.TokenType.DOT)) {
                        consume(this.TokenType.DOT);
                        
                        // Check for operator function
                        if (match(this.TokenType.OPERATOR_FUNC)) {
                            const op = consume(this.TokenType.OPERATOR_FUNC);
                            consume(this.TokenType.COLON);
                            const value = parseUnary();
                            left = {
                                type: 'ObjectQuery',
                                field: left.type === 'Identifier' ? left.name : 
                                      left.type === 'MemberExpression' ? this.memberExprToPath(left) : 
                                      String(left),
                                operator: op.value,
                                value: value
                            };
                        } else {
                            const property = consume(this.TokenType.IDENTIFIER);
                            
                            // Check for method call
                            if (match(this.TokenType.LPAREN)) {
                                consume(this.TokenType.LPAREN);
                                const args = [];
                                
                                while (!match(this.TokenType.RPAREN)) {
                                    // Parse arrow functions in method calls
                                    if (match(this.TokenType.IDENTIFIER) && peek(1).type === this.TokenType.ARROW) {
                                        const param = consume(this.TokenType.IDENTIFIER);
                                        consume(this.TokenType.ARROW);
                                        const body = parseOr();
                                        args.push({
                                            type: 'ArrowFunctionExpression',
                                            params: [param.value],
                                            body
                                        });
                                    } else {
                                        args.push(parseOr());
                                    }
                                    
                                    if (match(this.TokenType.COMMA)) {
                                        consume(this.TokenType.COMMA);
                                    }
                                }
                                
                                consume(this.TokenType.RPAREN);
                                left = {
                                    type: 'CallExpression',
                                    callee: {
                                        type: 'MemberExpression',
                                        object: left,
                                        property: property.value
                                    },
                                    arguments: args
                                };
                            } else {
                                left = {
                                    type: 'MemberExpression',
                                    object: left,
                                    property: property.value
                                };
                            }
                        }
                    } else if (match(this.TokenType.LBRACKET)) {
                        consume(this.TokenType.LBRACKET);
                        const index = parseOr();
                        consume(this.TokenType.RBRACKET);
                        left = {
                            type: 'MemberExpression',
                            object: left,
                            property: index,
                            computed: true
                        };
                    } else if (match(this.TokenType.LPAREN) && left.type === 'Identifier') {
                        // Function call
                        consume(this.TokenType.LPAREN);
                        const args = [];
                        
                        while (!match(this.TokenType.RPAREN)) {
                            args.push(parseOr());
                            if (match(this.TokenType.COMMA)) {
                                consume(this.TokenType.COMMA);
                            }
                        }
                        
                        consume(this.TokenType.RPAREN);
                        left = {
                            type: 'CallExpression',
                            callee: left,
                            arguments: args
                        };
                    } else {
                        break;
                    }
                }
                
                return left;
            };
            
            const parsePrimary = () => {
                // Literals
                if (match(this.TokenType.NUMBER, this.TokenType.STRING, 
                        this.TokenType.BOOLEAN, this.TokenType.NULL, 
                        this.TokenType.UNDEFINED)) {
                    const token = tokens[current++];
                    return { type: 'Literal', value: token.value };
                }
                
                // Identifiers
                if (match(this.TokenType.IDENTIFIER)) {
                    const token = tokens[current++];
                    return { type: 'Identifier', name: token.value };
                }
                
                // Parentheses
                if (match(this.TokenType.LPAREN)) {
                    consume(this.TokenType.LPAREN);
                    const expr = parseOr();
                    consume(this.TokenType.RPAREN);
                    return expr;
                }
                
                throw new Error(`Unexpected token ${peek().type}`);
            };
            
            const ast = parseOr();
            
            if (peek().type !== this.TokenType.EOF) {
                throw new Error(`Unexpected token after expression: ${peek().type}`);
            }
            
            return ast;
        },
        
        // Helper to convert member expression to path string
        memberExprToPath(node) {
            if (node.type === 'Identifier') {
                return node.name;
            }
            if (node.type === 'MemberExpression') {
                const objectPath = this.memberExprToPath(node.object);
                return objectPath + '.' + node.property;
            }
            return String(node);
        },
        
        // Compile AST to executable function
        compileAST(ast, options = {}) {
            const self = this;
            const context = options.context || 'text';
            
            const evaluate = (node, evalContext) => {
                switch (node.type) {
                    case 'Literal':
                        return node.value;
                        
                    case 'Identifier':
                        // For object context, look in the object
                        if (context === 'object' && evalContext._object) {
                            return evalContext._object[node.name];
                        }

                        // Check for builtin functions
                        if (self.builtinFunctions[node.name]) {
                            return self.builtinFunctions[node.name].bind(self.builtinFunctions);
                        }

                        // Check context (state, info, etc.)
                        if (evalContext.hasOwnProperty(node.name)) {
                            return evalContext[node.name];
                        }

                        // Check global objects
                        if (node.name === 'state' && typeof state !== 'undefined') {
                            return state;
                        }
                        if (node.name === 'info' && typeof info !== 'undefined') {
                            return info;
                        }

                        if (typeof global !== 'undefined' && global[node.name] !== undefined) {
                            return global[node.name];
                        }
                        
                    case 'MemberExpression':
                        const obj = evaluate(node.object, evalContext);
                        if (obj == null) return undefined;
                        
                        if (node.computed) {
                            const prop = evaluate(node.property, evalContext);
                            return obj[prop];
                        }
                        
                        return obj[node.property];
                        
                    case 'CallExpression':
                        const callee = evaluate(node.callee, evalContext);
                        if (typeof callee !== 'function') {
                            throw new Error(`${node.callee.name || 'Expression'} is not a function`);
                        }
                        
                        const args = node.arguments.map(arg => {
                            // Handle arrow functions specially
                            if (arg.type === 'ArrowFunctionExpression') {
                                return (...params) => {
                                    const localContext = { ...evalContext };
                                    arg.params.forEach((param, i) => {
                                        localContext[param] = params[i];
                                    });
                                    return evaluate(arg.body, localContext);
                                };
                            }
                            return evaluate(arg, evalContext);
                        });
                        
                        // Special handling for builtin functions that need text
                        if (node.callee.type === 'Identifier' && self.builtinFunctions[node.callee.name]) {
                            // For builtin functions, always pass text as first argument
                            return callee(evalContext._text, ...args);
                        }
                        
                        // Handle method calls
                        if (node.callee.type === 'MemberExpression') {
                            const obj = evaluate(node.callee.object, evalContext);
                            return callee.apply(obj, args);
                        }
                        
                        return callee(...args);
                        
                    case 'UnaryExpression':
                        const operand = evaluate(node.operand, evalContext);
                        switch (node.operator) {
                            case '!': return !operand;
                            case '-': return -operand;
                            case '+': return +operand;
                        }
                        break;
                        
                    case 'BinaryExpression':
                        const left = evaluate(node.left, evalContext);
                        const right = evaluate(node.right, evalContext);
                        
                        switch (node.operator) {
                            case '+': return left + right;
                            case '-': return left - right;
                            case '*': return left * right;
                            case '/': return left / right;
                            case '%': return left % right;
                            case '<': return left < right;
                            case '<=': return left <= right;
                            case '>': return left > right;
                            case '>=': return left >= right;
                            case '==': return left == right;
                            case '!=': return left != right;
                            case '===': return left === right;
                            case '!==': return left !== right;
                        }
                        break;
                        
                    case 'LogicalExpression':
                        switch (node.operator) {
                            case '&&':
                                return evaluate(node.left, evalContext) && evaluate(node.right, evalContext);
                            case '||':
                                return evaluate(node.left, evalContext) || evaluate(node.right, evalContext);
                        }
                        break;
                        
                    case 'ArrowFunctionExpression':
                        return (...args) => {
                            const localContext = { ...evalContext };
                            node.params.forEach((param, i) => {
                                localContext[param] = args[i];
                            });
                            return evaluate(node.body, localContext);
                        };
                        
                    case 'ObjectQuery':
                        // For object queries
                        const field = node.field;
                        const operator = node.operator || 'equals';
                        const value = evaluate(node.value, evalContext);
                        
                        return (obj) => {
                            if (!obj || typeof obj !== 'object') return false;
                            
                            const fieldValue = this.getFieldValue(obj, field);
                            
                            switch (operator) {
                                case 'equals':
                                    return fieldValue == value;
                                case 'contains':
                                case 'includes':
                                    if (fieldValue == null) return false;
                                    return String(fieldValue).includes(value);
                                case 'startsWith':
                                    if (fieldValue == null) return false;
                                    return String(fieldValue).startsWith(value);
                                case 'endsWith':
                                    if (fieldValue == null) return false;
                                    return String(fieldValue).endsWith(value);
                                case 'match':
                                case 'regex':
                                    if (fieldValue == null) return false;
                                    try {
                                        return new RegExp(value).test(String(fieldValue));
                                    } catch (e) {
                                        return false;
                                    }
                                case 'gt':
                                    return Number(fieldValue) > Number(value);
                                case 'lt':
                                    return Number(fieldValue) < Number(value);
                                case 'gte':
                                    return Number(fieldValue) >= Number(value);
                                case 'lte':
                                    return Number(fieldValue) <= Number(value);
                                default:
                                    return false;
                            }
                        };
                }
                
                throw new Error(`Unknown node type: ${node.type}`);
            };
            
            // Return appropriate evaluator based on context
            if (context === 'object') {
                return (obj) => {
                    const evalContext = { _object: obj };
                    try {
                        const result = evaluate(ast, evalContext);
                        // If the result is a function (from ObjectQuery), apply it to the object
                        if (typeof result === 'function') {
                            return result(obj);
                        }
                        return result;
                    } catch (error) {
                        console.log('[Expression] Evaluation error:', error.message);
                        return false;
                    }
                };
            } else {
                // Original text-based evaluator
                return (text) => {
                    const evalContext = { _text: text || '' };
                    try {
                        return evaluate(ast, evalContext);
                    } catch (error) {
                        console.log('[Expression] Evaluation error:', error.message);
                        return false;
                    }
                };
            }
        },
        
        // Helper to get nested field values
        getFieldValue(obj, path) {
            const parts = path.split('.');
            let value = obj;
            
            for (const part of parts) {
                if (value == null) return undefined;
                value = value[part];
            }
            
            return value;
        },
        
        // Extract recent story text (for text expressions)
        extractRecentStory(fullText) {
            const recentStoryPattern = /Recent\s*Story\s*:\s*([\s\S]*?)(?=%@GEN@%|%@COM@%|$)/i;
            const match = fullText.match(recentStoryPattern);
            
            if (!match) return '';
            
            let storyText = match[1];
            
            // Remove author's notes
            storyText = storyText.replace(/\[Author['']s\s*note:[^\]]*\]/gi, ' ');
            
            return storyText.trim();
        }
    };

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
                return this.parseUnencapsulated(text);
            }
            
            const content = text.slice(1, -1).trim();
            
            const nameMatch = content.match(/^#\s+(.+)$/m);
            if (!nameMatch) {
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
                            sections[currentSection] = this.parseSectionContent(content);
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
                    sections[currentSection] = this.parseSectionContent(content);
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
                    const key = match[1].trim();
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
                        headers = cells;
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
                    lines.push(`## ${sectionName}`);
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
                    const formattedValue = this.formatValue(value);
                    return `${key}: ${formattedValue}`;
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
            const headerRow = headers;
            
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
        
        sanitize(str, allowedChars = '') {
            const pattern = new RegExp(`[^a-zA-Z0-9\\s${allowedChars}]`, 'g');
            return str.replace(pattern, '');
        },
        
        extractNumbers(str) {
            const matches = str.match(/-?\d+\.?\d*/g);
            return matches ? matches.map(Number) : [];
        },
        
        parseBoolean(str) {
            if (typeof str === 'boolean') return str;
            if (str == null) return false;
            const s = String(str).toLowerCase().trim();
            return ['true', '1', 'yes', 'y', 'on', 'enabled'].includes(s);
        },
        
        levenshteinDistance(str1, str2) {
            if (!str1) return str2.length;
            if (!str2) return str1.length;
            
            const matrix = [];
            
            for (let i = 0; i <= str2.length; i++) {
                matrix[i] = [i];
            }
            
            for (let j = 0; j <= str1.length; j++) {
                matrix[0][j] = j;
            }
            
            for (let i = 1; i <= str2.length; i++) {
                for (let j = 1; j <= str1.length; j++) {
                    if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                        matrix[i][j] = matrix[i - 1][j - 1];
                    } else {
                        matrix[i][j] = Math.min(
                            matrix[i - 1][j - 1] + 1,
                            matrix[i][j - 1] + 1,
                            matrix[i - 1][j] + 1
                        );
                    }
                }
            }
            
            return matrix[str2.length][str1.length];
        },
        
        similarity(str1, str2) {
            const maxLen = Math.max(str1.length, str2.length);
            if (maxLen === 0) return 1.0;
            
            const distance = this.levenshteinDistance(str1, str2);
            return 1.0 - (distance / maxLen);
        },
        
        fuzzyMatch(str, pattern, threshold = 0.8) {
            return this.similarity(str.toLowerCase(), pattern.toLowerCase()) >= threshold;
        },
        
        findBestMatch(target, candidates) {
            if (!candidates || candidates.length === 0) return null;
            
            let bestMatch = null;
            let bestScore = 0;
            
            for (const candidate of candidates) {
                const score = this.similarity(target, candidate);
                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = candidate;
                }
            }
            
            return bestMatch ? { match: bestMatch, score: bestScore } : null;
        },
        
        wordWrap(text, maxWidth, indent = '') {
            const words = text.split(/\s+/);
            const lines = [];
            let currentLine = indent;
            
            for (const word of words) {
                if (currentLine.length + word.length + 1 > maxWidth && currentLine.length > indent.length) {
                    lines.push(currentLine.trim());
                    currentLine = indent + word;
                } else {
                    currentLine += (currentLine.length > indent.length ? ' ' : '') + word;
                }
            }
            
            if (currentLine.length > indent.length) {
                lines.push(currentLine.trim());
            }
            
            return lines.join('\n');
        },
        
        tokenize(text) {
            return text.match(/\w+|[^\w\s]/g) || [];
        },

        splitBySentences(text) {
            const sentencePattern = /[.!?]+(?:\s+|$)/g;
            const sentences = [];
            let lastIndex = 0;
            let match;
        
            while ((match = sentencePattern.exec(text)) !== null) {
                const sentence = text.substring(lastIndex, match.index + match[0].length);
                if (sentence.trim()) {
                    sentences.push(sentence);
                }
                lastIndex = match.index + match[0].length;
            }
        
            if (lastIndex < text.length) {
                const remaining = text.substring(lastIndex).trim();
                if (remaining) {
                    sentences.push(remaining);
                }
            }
        
            return sentences;
        },
        };
    
    const ContextUtils = {
        extractPlotEssentials(context) {
            // Everything from start to World Lore, Memories, or Recent Story (whichever comes first)
            const worldLoreMatch = context.match(/#?\s*World\s*Lore\s*:\s*/i);
            const memoriesMatch = context.match(/#?\s*Memories\s*:\s*/i);
            const recentStoryMatch = context.match(/#?\s*Recent\s*Story\s*:\s*/i);
            
            let endIndex = context.length;
            
            // Find the earliest section marker
            if (worldLoreMatch && worldLoreMatch.index < endIndex) {
                endIndex = worldLoreMatch.index;
            }
            if (memoriesMatch && memoriesMatch.index < endIndex) {
                endIndex = memoriesMatch.index;
            }
            if (recentStoryMatch && recentStoryMatch.index < endIndex) {
                endIndex = recentStoryMatch.index;
            }
            
            // If no sections found, entire text is plot essentials
            if (endIndex === context.length) {
                return context;
            }
            
            return context.substring(0, endIndex).trim();
        },
        
        extractWorldLore(context) {
            // Everything from World Lore: to Memories: or Recent Story: (whichever comes first)
            const worldLoreMatch = context.match(/#?\s*World\s*Lore:\s*/i);
            if (!worldLoreMatch) return '';
            
            const memoriesMatch = context.match(/#?\s*Memories:\s*/i);
            const recentStoryMatch = context.match(/#?\s*Recent\s*Story:\s*/i);
            
            const startIndex = worldLoreMatch.index + worldLoreMatch[0].length;
            let endIndex = context.length;
            
            // Find the next section after World Lore
            if (memoriesMatch && memoriesMatch.index > startIndex) {
                endIndex = memoriesMatch.index;
            }
            if (recentStoryMatch && recentStoryMatch.index > startIndex && recentStoryMatch.index < endIndex) {
                endIndex = recentStoryMatch.index;
            }
            
            return context.substring(startIndex, endIndex).trim();
        },
        
        extractMemories(context) {
            // Everything from Memories: to Recent Story:
            const memoriesMatch = context.match(/#?\s*Memories\s*:\s*/i);
            if (!memoriesMatch) return '';
            
            const recentStoryMatch = context.match(/#?\s*Recent\s*Story\s*:\s*/i);
            const startIndex = memoriesMatch.index + memoriesMatch[0].length;
            const endIndex = recentStoryMatch ? recentStoryMatch.index : context.length;
            
            return context.substring(startIndex, endIndex).trim();
        },
        
        extractRecentStory(context, removeAuthorNotes = false) {
            const recentStoryPattern = /#?\s*Recent\s*Story\s*:\s*([\s\S]*?)(?=%@GEN@%|%@COM@%|$)/i;
            const match = context.match(recentStoryPattern);
            
            if (!match) return '';
            
            const storyText = match[1].trim();
            
            // Only remove author's notes if explicitly requested
            return removeAuthorNotes ? this.removeAuthorsNotes(storyText) : storyText;
        },
        
        // Helper functions that remain the same
        extractAuthorsNotes(context) {
            // All [Author's note: ...] content
            const notes = [];
            const notePattern = /\[Author['']s\s*note:\s*([^\]]*)\]/gi;
            let match;
            
            while ((match = notePattern.exec(context)) !== null) {
                notes.push(match[1].trim());
            }
            
            return notes;
        },
        
        removeAuthorsNotes(context) {
            // Remove all author's notes from text
            return context.replace(/\[Author['']s\s*note:[^\]]*\]/gi, '').trim();
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
        },
        
        roll(notation, seed = null) {
            const match = notation.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
            if (!match) {
                throw new Error(`Invalid dice notation: ${notation}`);
            }
            
            const count = parseInt(match[1]);
            const sides = parseInt(match[2]);
            const modifier = match[3] ? parseInt(match[3]) : 0;
            
            const rolls = [];
            let seedCounter = seed;
            
            for (let i = 0; i < count; i++) {
                const roll = seed !== null ? 
                    Math.floor(this.seededRandom(seedCounter + '_' + i, 1, sides + 1)) :
                    Math.floor(Math.random() * sides) + 1;
                rolls.push(roll);
            }
            
            const total = rolls.reduce((sum, roll) => sum + roll, 0) + modifier;
            
            return {
                total: total,
                rolls: rolls,
                notation: notation,
                modifier: modifier
            };
        },
        
        bestOf(values, count = 1) {
            return [...values].sort((a, b) => b - a)[count - 1] || values[0];
        },
        
        worstOf(values, count = 1) {
            return [...values].sort((a, b) => a - b)[count - 1] || values[0];
        },
        
        averageOf(values, roundToInt = true) {
            if (!values || values.length === 0) return 0;
            const sum = values.reduce((a, b) => a + b, 0);
            const avg = sum / values.length;
            return roundToInt ? Math.round(avg) : avg;
        },
        
        distance(x1, y1, x2, y2) {
            const dx = x2 - x1;
            const dy = y2 - y1;
            return Math.sqrt(dx * dx + dy * dy);
        },
        
        manhattanDistance(x1, y1, x2, y2) {
            return Math.abs(x2 - x1) + Math.abs(y2 - y1);
        },
        
        normalize(value, min, max) {
            if (max === min) return 0;
            return (value - min) / (max - min);
        },
        
        denormalize(value, min, max) {
            return min + value * (max - min);
        },
        
        inRange(value, range) {
            return value >= range[0] && value <= range[1];
        },
        
        modulo(n, m) {
            return ((n % m) + m) % m;
        },
        
        factorial(n) {
            if (n < 0) return NaN;
            if (n > 170) return Infinity;
            if (n === 0 || n === 1) return 1;
            
            let result = 1;
            for (let i = 2; i <= n; i++) {
                result *= i;
            }
            return result;
        },
        
        combinations(n, k) {
            if (k > n) return 0;
            if (k === 0 || k === n) return 1;
            
            k = Math.min(k, n - k);
            
            let result = 1;
            for (let i = 0; i < k; i++) {
                result *= (n - i);
                result /= (i + 1);
            }
            
            return Math.round(result);
        },
        
        range(start, end, step = 1) {
            const result = [];
            if (step === 0) return result;
            
            if (step > 0) {
                for (let i = start; i < end; i += step) {
                    result.push(i);
                }
            } else {
                for (let i = start; i > end; i += step) {
                    result.push(i);
                }
            }
            
            return result;
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
            // Use native flat() which is available in ES2019+
            return array.flat(depth);
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
        },
        
        deepEquals(a, b) {
            if (a === b) return true;
            
            if (a === null || b === null) return false;
            if (typeof a !== typeof b) return false;
            
            if (typeof a !== 'object') return a === b;
            
            if (Array.isArray(a)) {
                if (!Array.isArray(b) || a.length !== b.length) return false;
                return a.every((item, i) => this.deepEquals(item, b[i]));
            }
            
            const keysA = Object.keys(a);
            const keysB = Object.keys(b);
            
            if (keysA.length !== keysB.length) return false;
            
            return keysA.every(key => this.deepEquals(a[key], b[key]));
        },
        
        shuffle(array, seed = null) {
            const arr = [...array];
            const rng = seed !== null ? 
                () => MathUtils.seededRandom(seed + arr.length) : 
                () => Math.random();
            
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(rng() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            
            return arr;
        },
        
        sample(array, count, seed = null) {
            if (count >= array.length) return this.shuffle(array, seed);
            
            const shuffled = this.shuffle(array, seed);
            return shuffled.slice(0, count);
        },
        
        weightedRandom(items, seed = null) {
            if (!items || items.length === 0) return null;
            
            const totalWeight = items.reduce((sum, item) => sum + (item.weight || 0), 0);
            if (totalWeight <= 0) return null;
            
            const random = seed !== null ? 
                MathUtils.seededRandom(seed, 0, totalWeight) : 
                Math.random() * totalWeight;
            
            let cumulative = 0;
            for (const item of items) {
                cumulative += item.weight || 0;
                if (random < cumulative) {
                    return item.value;
                }
            }
            
            return items[items.length - 1].value;
        },
        
        partition(array, predicate) {
            const pass = [];
            const fail = [];
            
            for (const item of array) {
                if (predicate(item)) {
                    pass.push(item);
                } else {
                    fail.push(item);
                }
            }
            
            return [pass, fail];
        },
        
        zip(...arrays) {
            const minLength = Math.min(...arrays.map(arr => arr.length));
            const result = [];
            
            for (let i = 0; i < minLength; i++) {
                result.push(arrays.map(arr => arr[i]));
            }
            
            return result;
        },
        
        frequency(array) {
            return array.reduce((freq, item) => {
                freq[item] = (freq[item] || 0) + 1;
                return freq;
            }, {});
        },
        
        difference(array1, array2) {
            const set2 = new Set(array2);
            return array1.filter(item => !set2.has(item));
        },
        
        intersection(array1, array2) {
            const set2 = new Set(array2);
            return array1.filter(item => set2.has(item));
        },
        
        rotate(array, positions) {
            if (array.length === 0) return [];
            
            const n = positions % array.length;
            if (n === 0) return [...array];
            
            if (n > 0) {
                return [...array.slice(-n), ...array.slice(0, -n)];
            } else {
                return [...array.slice(-n), ...array.slice(0, -n)];
            }
        }
    };
    
    // =====================================
    // FORMAT UTILITIES
    // =====================================
    const FormatUtils = {
        formatNumber(num, decimals = 0) {
            return num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        },
        
        formatWithSymbol(value, symbol = '$', position = 'prepend', includeSpace = true) {
            const formattedValue = this.formatNumber(value);
            const space = includeSpace ? ' ' : '';
            
            if (position === 'append' || position === 'after') {
                return `${formattedValue}${space}${symbol}`;
            } else {
                // Default to prepend
                return `${symbol}${space}${formattedValue}`;
            }
        },
        
        formatPercentage(value, decimals = 0) {
            return `${(value * 100).toFixed(decimals)}%`;
        },
        
        formatTime(hour, minute = 0, second = null, format = 'HH:MM') {
            const padHour = format.startsWith('HH');
            const includeSeconds = format.includes(':SS');
            
            const h = padHour ? String(hour).padStart(2, '0') : String(hour);
            const m = String(minute).padStart(2, '0');
            
            let result = `${h}:${m}`;
            
            if (includeSeconds) {
                const s = String(second || 0).padStart(2, '0');
                result += `:${s}`;
            }
            
            return result;
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
        
        formatBar(current, max, width = 20, char = '\u2588') {
            const percentage = Math.max(0, Math.min(1, current / max));
            const filled = Math.round(width * percentage);
            const empty = width - filled;
            
            return `[${char.repeat(filled)}${'-'.repeat(empty)}]`;
        },
        
        formatList(items, bullet = '•') {
            return items.map(item => `${bullet} ${item}`).join('\n');
        },
        
        formatNumberedList(items) {
            return items.map((item, i) => `${i + 1}. ${item}`).join('\n');
        }
    };
    
    // =====================================
    // PARSING UTILITIES
    // =====================================
    const ParsingUtils = {
        parseKeyValuePairs(text, delimiter = '=') {
            const pairs = {};
            const tokens = text.match(/\S+/g) || [];
            
            for (const token of tokens) {
                const parts = token.split(delimiter);
                if (parts.length === 2) {
                    const key = parts[0];
                    let value = parts[1];
                    
                    // Auto-convert types
                    if (value === 'true') value = true;
                    else if (value === 'false') value = false;
                    else if (/^\d+$/.test(value)) value = parseInt(value);
                    else if (/^\d*\.\d+$/.test(value)) value = parseFloat(value);
                    
                    pairs[key] = value;
                }
            }
            
            return pairs;
        },
        
        parseRange(text) {
            // Handle various range formats
            const patterns = [
                /^(\d+)\s*-\s*(\d+)$/,        // 10-20
                /^(\d+)\s*to\s*(\d+)$/i,      // 10 to 20
                /^(\d+)\s*\.\.\.?\s*(\d+)$/,  // 10..20 or 10...20
            ];
            
            for (const pattern of patterns) {
                const match = text.match(pattern);
                if (match) {
                    return {
                        min: parseInt(match[1]),
                        max: parseInt(match[2])
                    };
                }
            }
            
            return null;
        },
        
        parseDelimited(text, itemDelimiter, keyValueDelimiter, options = {}) {
            const result = {};
            const { 
                removeBraces = false, 
                parseNumbers = true,
                skipComments = false,
                toLowerCase = true 
            } = options;
            
            // Remove braces if needed
            let content = removeBraces ? text.replace(/^\{|\}$/g, '').trim() : text;
            if (!content) return result;
            
            // Split by item delimiter
            const items = itemDelimiter === '\n' ? 
                content.split('\n') : 
                content.split(itemDelimiter).map(i => i.trim());
            
            for (const item of items) {
                const trimmed = item.trim();
                if (!trimmed) continue;
                if (skipComments && (trimmed.startsWith('//') || trimmed.startsWith('#'))) continue;
                
                // Parse key-value pair
                const parts = trimmed.split(keyValueDelimiter);
                if (parts.length >= 2) {
                    let key = parts[0].trim();
                    if (toLowerCase) {
                        key = key.toLowerCase().replace(/\s+/g, '_');
                    }
                    
                    let value = parts.slice(1).join(keyValueDelimiter).trim();
                    
                    // Remove optional descriptions in brackets
                    value = value.replace(/\s*\[.*\]$/, '');
                    
                    // Parse numbers if enabled
                    if (parseNumbers) {
                        const numValue = parseFloat(value);
                        value = isNaN(numValue) ? value : numValue;
                    }
                    
                    result[key] = value;
                }
            }
            
            return result;
        },
        
        parsePipeDelimited(text) {
            return this.parseDelimited(text, '|', ':');
        },
        
        parseBracedList(text) {
            return this.parseDelimited(text, ',', ':', { removeBraces: true, toLowerCase: false });
        },
        
        parseEqualsValue(text) {
            return this.parseDelimited(text, '\n', '=');
        },
        
        parseColonKeyValue(text) {
            return this.parseDelimited(text, '\n', ':', { skipComments: true });
        },
        
        parseLines(text, skipEmpty = true, skipComments = true) {
            const lines = text.split('\n');
            const result = [];
            
            for (const line of lines) {
                const trimmed = line.trim();
                
                if (skipEmpty && !trimmed) continue;
                if (skipComments && (trimmed.startsWith('//') || trimmed.startsWith('#'))) continue;
                
                result.push(trimmed);
            }
            
            return result;
        }
    };
    
    // =====================================
    // CONFIGURATION MANAGEMENT
    // =====================================
    const ConfigUtils = {
        // Cache for loaded configurations
        cache: new Map(),
        
        load(cardTitle, parser = null, onCreate = null, cacheResult = true) {
            // Check cache first
            if (cacheResult && this.cache.has(cardTitle)) {
                return this.cache.get(cardTitle);
            }
            
            // Load the card
            let card = StoryCardOps.get(cardTitle);
            
            // Create default if needed and card doesn't exist
            if (!card && onCreate) {
                onCreate();
                card = StoryCardOps.get(cardTitle);
            }
            
            // Return null if still no card
            if (!card) {
                return null;
            }
            
            // Parse the configuration
            const fullText = (card.entry || '') + '\n' + (card.description || '');
            const config = parser ? parser(fullText) : ParsingUtils.parseColonKeyValue(fullText);
            
            // Cache if requested
            if (cacheResult) {
                this.cache.set(cardTitle, config);
            }
            
            return config;
        },
        
        loadSectioned(cardTitle, sectionSeparator = '# ') {
            const cacheKey = `${cardTitle}:sectioned`;
            
            // Check cache
            if (this.cache.has(cacheKey)) {
                return this.cache.get(cacheKey);
            }
            
            const card = StoryCardOps.get(cardTitle);
            if (!card) return {};
            
            const fullText = (card.entry || '') + '\n' + (card.description || '');
            const lines = fullText.split('\n');
            const config = {};
            let currentSection = null;
            let sectionContent = [];
            
            for (const line of lines) {
                const trimmed = line.trim();
                
                // Skip comments
                if (trimmed.startsWith('//')) continue;
                
                // Check for section header
                if (trimmed.startsWith(sectionSeparator)) {
                    // Save previous section
                    if (currentSection) {
                        config[currentSection] = sectionContent.join('\n').trim();
                    }
                    
                    // Start new section
                    currentSection = trimmed.substring(sectionSeparator.length).trim();
                    sectionContent = [];
                } else if (currentSection) {
                    sectionContent.push(line);
                }
            }
            
            // Save last section
            if (currentSection) {
                config[currentSection] = sectionContent.join('\n').trim();
            }
            
            this.cache.set(cacheKey, config);
            return config;
        },
        
        getValue(cardTitle, key, defaultValue = null) {
            const config = this.load(cardTitle);
            if (!config) return defaultValue;
            
            // Support nested keys with dot notation
            const keys = key.split('.');
            let value = config;
            
            for (const k of keys) {
                if (value && typeof value === 'object' && k in value) {
                    value = value[k];
                } else {
                    return defaultValue;
                }
            }
            
            return value;
        },
        
        setValue(cardTitle, key, value) {
            const card = StoryCardOps.get(cardTitle);
            if (!card) return false;
            
            // Load current config
            const config = this.load(cardTitle, null, null, false) || {};
            
            // Update value (support dot notation)
            const keys = key.split('.');
            let target = config;
            
            for (let i = 0; i < keys.length - 1; i++) {
                const k = keys[i];
                if (!(k in target) || typeof target[k] !== 'object') {
                    target[k] = {};
                }
                target = target[k];
            }
            
            target[keys[keys.length - 1]] = value;
            
            // Convert back to text format
            const lines = [];
            const formatConfig = (obj, prefix = '') => {
                for (const [k, v] of Object.entries(obj)) {
                    if (typeof v === 'object' && !Array.isArray(v)) {
                        formatConfig(v, prefix + k + '.');
                    } else {
                        lines.push(`${prefix}${k}: ${JSON.stringify(v)}`);
                    }
                }
            };
            
            formatConfig(config);
            
            // Update card
            StoryCardOps.update(cardTitle, { entry: lines.join('\n') });
            
            // Clear cache
            this.cache.delete(cardTitle);
            
            return true;
        },
        
        clearCache(cardTitle = null) {
            if (cardTitle) {
                this.cache.delete(cardTitle);
                this.cache.delete(`${cardTitle}:sectioned`);
            } else {
                this.cache.clear();
            }
        },
        
        exists(cardTitle) {
            return StoryCardOps.get(cardTitle) !== null;
        }
    };
    
    // =====================================
    // FUNCTIONAL UTILITIES
    // =====================================
    const FunctionalUtils = {
        compose(...fns) {
            return (arg) => fns.reduceRight((result, fn) => fn(result), arg);
        },
        
        pipe(...fns) {
            return (arg) => fns.reduce((result, fn) => fn(result), arg);
        },
        
        memoize(fn, keyFn = null) {
            const cache = new Map();
            
            return function(...args) {
                const key = keyFn ? keyFn(...args) : JSON.stringify(args);
                
                if (cache.has(key)) {
                    return cache.get(key);
                }
                
                const result = fn.apply(this, args);
                cache.set(key, result);
                return result;
            };
        },
        
        curry(fn) {
            const arity = fn.length;
            
            return function curried(...args) {
                if (args.length >= arity) {
                    return fn.apply(this, args);
                }
                return function(...nextArgs) {
                    return curried.apply(this, args.concat(nextArgs));
                };
            };
        },
        
        once(fn) {
            let called = false;
            let result;
            
            return function(...args) {
                if (!called) {
                    called = true;
                    result = fn.apply(this, args);
                }
                return result;
            };
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
            
            // Check cache first
            const cached = turnCache.get('storyCards', title);
            if (cached !== null) {
                // Verify it's still valid
                if (storyCards.includes(cached) && cached.title === title) {
                    return cached;
                }
                // Invalid - just clear this one entry
                turnCache.delete('storyCards', title);
            }
            
            // Linear search with opportunistic caching
            for (const card of storyCards) {
                if (!card) continue;
                
                // Cache every card we see during iteration!
                const existingCache = turnCache.get('storyCards', card.title);
                if (existingCache === null) {
                    turnCache.set('storyCards', card.title, card);
                }
                
                // Check if this is what we're looking for
                if (card.title === title) {
                    return card;
                }
            }
            
            return null;
        },
        
        find(query, getAll = false) {
            // Backwards compatibility - if it's a function, use it directly
            if (typeof query === 'function') {
                return this._findByPredicate(query, getAll);
            }
            
            // Check if it's a simple title string (not an expression)
            // Titles starting with '[' should be treated as literals, not expressions
            if (typeof query === 'string' && !query.includes(' && ') && !query.includes(' || ') && 
                !query.includes('.') && !query.includes('==') && !query.includes('!=')) {
                // Simple title match
                const titlePredicate = (card) => card && card.title === query;
                return this._findByPredicateWithCaching(titlePredicate, getAll);
            }
            
            // Parse complex expression queries
            const predicate = ExpressionParser.parseObjectQuery(query, 'card');
            if (!predicate) {
                const titlePredicate = (card) => card && card.title === query;
                return this._findByPredicateWithCaching(titlePredicate, getAll);
            }
            
            return this._findByPredicate(predicate, getAll);
        },
        
        remove(query, removeAll = false) {
            // If it's a function, use it directly
            if (typeof query === 'function') {
                return this._removeByPredicate(query, removeAll);
            }
            
            // Handle object with title (backwards compatibility)
            if (typeof query === 'object' && query !== null && query.title) {
                const titlePredicate = (card) => card && card.title === query.title;
                return this._removeByPredicate(titlePredicate, removeAll);
            }
            
            // Check if it's a simple title string (not an expression)
            // Titles starting with '[' should be treated as literals, not expressions
            if (typeof query === 'string' && !query.includes(' && ') && !query.includes(' || ') && 
                !query.includes('.') && !query.includes('==') && !query.includes('!=')) {
                // Simple title match
                const titlePredicate = (card) => card && card.title === query;
                return this._removeByPredicate(titlePredicate, removeAll);
            }
            
            // Parse complex expression queries
            const predicate = ExpressionParser.parseObjectQuery(query, 'card');
            if (!predicate) {
                // Fallback: treat as simple title match
                const titlePredicate = (card) => card && card.title === query;
                return this._removeByPredicate(titlePredicate, removeAll);
            }
            
            return this._removeByPredicate(predicate, removeAll);
        },
        
        // Internal predicate-based find
        _findByPredicate(predicate, getAll) {
          try {
              if (typeof storyCards === 'undefined' || !Array.isArray(storyCards)) {
                  return getAll ? [] : null;
              }
              
              const matches = [];
              
              for (const card of storyCards) {
                  // Opportunistic caching while we iterate
                  if (card && card.title) {
                      const existingCache = turnCache.get('storyCards', card.title);
                      if (existingCache === null) {
                          turnCache.set('storyCards', card.title, card);
                      }
                  }
                  
                  if (predicate(card)) {
                      if (!getAll) {
                          return card;
                      }
                      matches.push(card);
                  }
              }
                
                return getAll ? matches : null;
            } catch (error) {
                console.log('[StoryCard] Error in find:', error.message);
                return getAll ? [] : null;
            }
        },
        
        // Internal predicate-based remove
        _removeByPredicate(predicate, removeAll) {
            try {
                if (typeof removeStoryCard !== 'function') {
                    return removeAll ? 0 : false;
                }
                
                if (typeof storyCards === 'undefined' || !Array.isArray(storyCards)) {
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
                console.log('[StoryCard] Error in remove:', error.message);
                return removeAll ? 0 : false;
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
                
                return null;
            } catch (error) {
                console.log('[StoryCard] Error in add:', error.message);
                return null;
            }
        },
        
        update(title, updates) {
            try {
                const card = this.get(title);
                if (!card) {
                    return false;
                }
                
                if (updates.entry !== undefined) card.entry = updates.entry;
                if (updates.keys !== undefined) card.keys = updates.keys;
                if (updates.description !== undefined) card.description = updates.description;
                if (updates.type !== undefined) card.type = updates.type;
                
                turnCache.delete('storyCards', title);
                
                return true;
            } catch (error) {
                console.log('[StoryCard] Error updating card:', error.message);
                return false;
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
                    // Check if lookBack exceeds available history
                    if (lookBack >= history.length) {
                        return null;
                    }
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
            
            // Cap at actual history length
            const searchLimit = Array.isArray(history) ? 
                Math.min(maxLookBack, history.length) : 0;
            
            for (let i = 0; i < searchLimit; i++) {
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
        // Number patterns
        integer: /-?\d+/g,
        decimal: /-?\d+\.?\d*/g,
        percentage: /(\d+(?:\.\d+)?)\s*%/g,
        range: /(\d+)\s*[-\/]\s*(\d+)/,
        
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
    const UtilitiesAPI = Object.freeze({
        // Core APIs
        expression: ExpressionParser,
        plainText: PlainTextParser,
        string: StringUtils,
        context: ContextUtils,
        math: MathUtils,
        collection: CollectionUtils,
        format: FormatUtils,
        parsing: ParsingUtils,
        config: ConfigUtils,
        functional: FunctionalUtils,
        storyCard: StoryCardOps,
        history: HistoryUtils,
        
        // Cache systems
        regex: regexCache,
        cache: turnCache,
        patterns: CommonPatterns,
        
        clearAll() {
            this.regex.clear();
            this.cache.clear();
            ExpressionParser.clearCache();
        }
    });
    
    // Export for Node.js
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = UtilitiesAPI;
    }
    
    return UtilitiesAPI;
})();

// optional but built in functionality
function Calendar(hook, text) {
    'use strict';
    
    const debug = false;
    const MODULE_NAME = 'Calendar';
    
    // =====================================
    // CALENDAR MODULE v2.0
    // =====================================
    // A complete time and event system for AI Dungeon
    //
    // USAGE:
    //   Context Modifier: Calendar("context");
    //   API Only: Calendar();
    //
    // CONFIGURATION CARDS:
    //   [CALENDAR] Time Configuration
    //     - Actions Per Day: How many actions = 1 full day
    //     - Start Date: MM/DD/YYYY format
    //     - Starting Time: HH:MM (applied once on first creation)
    //     - Hours Per Day: Default 24
    //     - Sections: Time Periods, Seasons, Days of Week, Months, Leap Year
    //
    //   [CALENDAR] Event Days (1, 2, 3...)
    //     - Annual: Event Name: MM/DD
    //     - Weekly: Event Name: Weekday
    //     - Daily: Event Name: daily
    //     - Relative: Event Name: Nth Weekday of Month
    //     - Time ranges: @ HH:MM-HH:MM
    //     - Multi-day: lasting N days
    //
    // TIME SYSTEM:
    //   - Uses dayProgress (0.0 to 1.0) for position in day
    //   - Tracks lastProcessedAction to detect repeated/reversed turns
    //   - Handles negative action counts and time reversals
    //   - Normalizes floating point errors on day boundaries
    //   - Adjustments are tracked and reversible
    //
    // =====================================
    // API REFERENCE
    // =====================================
    //
    // TIME METHODS:
    //   getCurrentTime()        Returns "HH:MM" format
    //   getFormattedTime()      Returns "H:MM AM/PM" format  
    //   getTimeOfDay()          Returns period name (e.g., "Morning")
    //   getDayProgress()        Returns 0.0-1.0 position in day
    //
    // DATE METHODS:
    //   getCurrentDate()        Returns "Weekday, Month DD, YYYY"
    //   getDayNumber()          Returns absolute day number (can be negative)
    //   getDayOfWeek()          Returns weekday name
    //   getDayOfMonth()         Returns day number in month (1-31)
    //   getMonth()              Returns month name
    //   getYear()               Returns year number
    //   getDayOfYear()          Returns day within year (1-365/366)
    //
    // SEASON METHODS:
    //   getCurrentSeason()      Returns season name or null
    //   getYearProgress()       Returns 0.0-1.0 position in year
    //
    // EVENT METHODS:
    //   getTodayEvents()        Returns array of events for today
    //   getActiveTimeRangeEvents()  Returns currently active time-range events
    //   getUpcomingEvents(days) Returns events in next N days
    //   getAllEvents()          Returns all configured events
    //   isEventDay()            Returns true if today has events
    //
    // TIME MANIPULATION:
    //   advanceTime(spec)       Skip time forward/backward
    //                          Examples: "3h", "2d", "-4h", "2d, 3h, 30m"
    //   setTime(hour, minute)   Set time on current day
    //   setDay(dayNumber)       Jump to specific day
    //   setActionsPerDay(n)     Update actions per day config
    //   setHoursPerDay(n)       Update hours per day config
    //
    // STATE METHODS:
    //   getState()              Returns current time state object
    //   getConfig()             Returns configuration object
    //
    // CACHE METHODS:
    //   clearEventCache()       Force reload event configuration
    //   clearConfigCache()      Force reload time configuration
    //   clearAllCaches()        Clear all cached data
    //
    // EVENT PROPERTIES:
    //   Calendar.events         Array of events that occurred this turn
    //                          Types: 'dayChanged', 'seasonChanged', 'timeOfDayChanged',
    //                                 'eventDay', 'timeReversed', 'timeRangeEventStarted',
    //                                 'timeRangeEventEnding', 'timeRangeEventEnded'
    //
    // =====================================
    // EXAMPLES
    // =====================================
    //
    // Basic Usage:
    //   const time = Calendar.getCurrentTime();           // "14:30"
    //   const date = Calendar.getCurrentDate();           // "Tuesday, July 15, 2023"
    //   const events = Calendar.getTodayEvents();         // [{name: "Market Day", ...}]
    //
    // Time Manipulation:
    //   Calendar.advanceTime("3h");                       // Skip 3 hours
    //   Calendar.advanceTime("2d, 3h, 30m");             // Skip 2 days, 3.5 hours
    //   Calendar.advanceTime("-1d");                      // Go back 1 day
    //   Calendar.setTime(14, 30);                        // Set to 2:30 PM
    //   Calendar.setDay(100);                            // Jump to day 100
    //
    // Event Checking:
    //   if (Calendar.isEventDay()) {
    //     const active = Calendar.getActiveTimeRangeEvents();
    //     // Handle active events
    //   }
    //
    //   // Check for state changes
    //   for (const event of Calendar.events) {
    //     if (event.type === 'dayChanged') {
    //       // New day logic
    //     }
    //   }
    //
    // =====================================
    
    // Configuration Card Names
    const CONFIG_CARD = '[CALENDAR] Time Configuration';
    const STATE_CARD = '[CALENDAR] Time State';
    const EVENT_CARD_PREFIX = '[CALENDAR] Event Days';
    
    // Module-level cache (valid for this turn only)
    let eventCache = null;
    let configCache = null;
    let timeDataCache = null;
    
    // ==========================
    // Core Functions
    // ==========================
    
    function loadConfiguration() {
        if (configCache !== null) return configCache;
        
        // Use centralized config loader with custom parser
        configCache = Utilities.config.load(
            CONFIG_CARD,
            parseConfigurationCard,  // Custom parser for Calendar format
            null,  // No auto-create function
            false  // Don't cache in Utilities (we cache locally)
        );
        
        if (!configCache && debug) {
            console.log(`${MODULE_NAME}: No configuration found`);
        }
        
        return configCache;
    }
    
    function parseConfigurationCard(fullText) {
        if (!fullText) return null;
        
        const lines = fullText.split('\n');
        const config = {};
        
        // Parse basic configuration values
        for (const line of lines) {
            if (line.includes('Actions Per Day:')) {
                config.actionsPerDay = parseInt(line.split(':')[1].trim());
            } else if (line.includes('Start Date:')) {
                config.startDate = line.split(':')[1].trim();
            } else if (line.includes('Starting Time:')) {
                // Parse starting time from config
                const timeStr = line.split(':').slice(1).join(':').trim();
                const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
                if (timeMatch) {
                    config.startingTime = {
                        hour: parseInt(timeMatch[1]),
                        minute: parseInt(timeMatch[2])
                    };
                }
            } else if (line.includes('Hours Per Day:')) {
                config.hoursPerDay = parseInt(line.split(':')[1].trim());
            }
        }
        
        // Validate required fields
        if (!config.actionsPerDay || !config.startDate || !config.hoursPerDay) {
            return null;
        }
        
        // Parse sections using Utilities
        const sections = Utilities.plainText.parseSections(fullText);
        
        config.timePeriods = parseTimePeriods(sections['Time Periods'] || sections['time periods']);
        config.seasons = parseSeasons(sections['Seasons'] || sections['seasons']);
        config.daysOfWeek = parseDaysOfWeek(sections['Days of Week'] || sections['days of week']);
        
        const monthData = parseMonths(sections['Months'] || sections['months']);
        if (monthData) {
            config.months = monthData.names;
            config.daysPerMonth = monthData.days;
        }
        
        // Parse leap year if present
        const leapSection = sections['Leap Year'] || sections['leap year'];
        if (leapSection) {
            config.leapYear = parseLeapYear(leapSection, config.months);
            
            const leapAdjustmentsSection = sections['Leap Year Adjustments'] || sections['leap year adjustments'];
            if (config.leapYear && leapAdjustmentsSection) {
                parseLeapYearAdjustments(config.leapYear, leapAdjustmentsSection, config.months);
            }
        }
        
        return config;
    }
    
    function parseTimePeriods(periodsData) {
        if (!periodsData || !Array.isArray(periodsData)) return null;
        
        const periods = {};
        periodsData.forEach(item => {
            const match = String(item).match(/^(.+?):\s*([\d.]+)-([\d.]+)$/);
            if (match) {
                const name = match[1].trim();
                const start = parseFloat(match[2]);
                const end = parseFloat(match[3]);
                const key = Utilities.string.toCamelCase(name);
                
                periods[key] = {
                    name: name,
                    start: start,
                    end: end,
                    wrapsAround: start > end
                };
            }
        });
        
        return Object.keys(periods).length > 0 ? periods : null;
    }
    
    function parseSeasons(seasonsData) {
        if (!seasonsData || !Array.isArray(seasonsData)) return null;
        
        const seasons = {};
        seasonsData.forEach(item => {
            const match = String(item).match(/^(.+?):\s*([\d.]+)-([\d.]+)$/);
            if (match) {
                const name = match[1].trim();
                const start = parseFloat(match[2]);
                const end = parseFloat(match[3]);
                const key = Utilities.string.toCamelCase(name);
                
                seasons[key] = {
                    name: name,
                    start: start,
                    end: end,
                    wrapsAround: start > end
                };
            }
        });
        
        return Object.keys(seasons).length > 0 ? seasons : null;
    }
    
    function parseDaysOfWeek(daysData) {
        return Array.isArray(daysData) && daysData.length > 0 ? daysData : null;
    }
    
    function parseMonths(monthsData) {
        if (!monthsData || !Array.isArray(monthsData)) return null;
        
        const names = [];
        const days = [];
        
        monthsData.forEach(item => {
            const match = String(item).match(/^(.+?)(?:\s*:\s*(\d+))?$/);
            if (match) {
                const monthName = match[1].trim();
                const monthDays = match[2] ? parseInt(match[2]) : 30;
                if (monthName) {
                    names.push(monthName);
                    days.push(monthDays);
                }
            }
        });
        
        return names.length > 0 ? { names, days } : null;
    }
    
    function parseLeapYear(leapData, monthNames) {
        if (!leapData || !monthNames || typeof leapData !== 'object') return null;
        
        const leap = {
            enabled: leapData.enabled === true,
            frequency: leapData.frequency || 0,
            skipFrequency: leapData.skip_frequency || 0,
            skipExceptionFrequency: leapData.skip_exception || 0,
            startYear: leapData.start_year || 0,
            adjustments: {}
        };
        
        // Legacy format support
        if (leapData.month) {
            const monthIndex = monthNames.findIndex(m => 
                m.toLowerCase() === String(leapData.month).toLowerCase()
            );
            if (monthIndex !== -1) {
                leap.adjustments[monthIndex] = 1;
            }
        }
        
        return leap.enabled && leap.frequency ? leap : null;
    }
    
    function parseLeapYearAdjustments(leap, adjustmentsList, monthNames) {
        if (!leap || !Array.isArray(adjustmentsList)) return;
        
        for (const adjustment of adjustmentsList) {
            const match = String(adjustment).match(/^(.+?):\s*([+-]?\d+)$/);
            if (match) {
                const monthName = match[1].trim();
                const dayAdjustment = parseInt(match[2]);
                const monthIndex = monthNames.findIndex(m => 
                    m.toLowerCase() === monthName.toLowerCase()
                );
                
                if (monthIndex !== -1) {
                    leap.adjustments[monthIndex] = dayAdjustment;
                }
            }
        }
        
        if (leap.enabled && Object.keys(leap.adjustments).length === 0) {
            leap.enabled = false;
        }
    }
    
    function loadTimeState() {
        if (timeDataCache !== null) return timeDataCache;
        
        const config = loadConfiguration();
        if (!config) return null;
        
        const stateCard = Utilities.storyCard.get(STATE_CARD);
        if (!stateCard) {
            timeDataCache = createInitialTimeState();
            return timeDataCache;
        }
        
        const lines = stateCard.entry.split('\n');
        const timeData = {
            day: 0,
            dayProgress: 0.0,
            lastProcessedAction: -1
        };
        
        for (const line of lines) {
            if (line.startsWith('Day:')) {
                timeData.day = parseInt(line.split(':')[1].trim()) || 0;
            } else if (line.startsWith('Day Progress:')) {
                const progressMatch = line.match(/Day Progress:\s*([\d.]+)/);
                if (progressMatch) timeData.dayProgress = parseFloat(progressMatch[1]);
            } else if (line.startsWith('Progress:')) {
                // Legacy support - convert old integer progress to dayProgress
                const match = line.match(/Progress:\s*(\d+)\/\[?(\d+)\]?/);
                if (match && !lines.some(l => l.startsWith('Day Progress:'))) {
                    const progress = parseInt(match[1]);
                    const actionsPerDay = parseInt(match[2]) || config.actionsPerDay;
                    timeData.dayProgress = progress / actionsPerDay;
                }
            } else if (line.startsWith('Last Processed Action:')) {
                timeData.lastProcessedAction = parseInt(line.split(':')[1].trim());
            }
        }
        
        // Parse adjustments from description
        timeData.adjustments = parseAdjustments(stateCard.description || '');
        
        // Ensure dayProgress is within valid range
        timeData.dayProgress = Math.max(0, Math.min(0.999999, timeData.dayProgress));
        
        timeDataCache = timeData;
        return timeData;
    }
    
    function parseAdjustments(description) {
        const adjustments = [];
        const lines = description.split('\n');
        let inAdjustmentSection = false;
        
        for (const line of lines) {
            if (line.includes('## Time Adjustments')) {
                inAdjustmentSection = true;
                continue;
            }
            
            if (inAdjustmentSection) {
                // Stop at next section
                if (line.startsWith('##') && !line.includes('Time Adjustments')) {
                    break;
                }
                
                // Parse adjustment lines: "- Turn X: type amount (±Y)"
                const match = line.match(/^-\s*Turn\s*(\d+):\s*(\w+)\s*(.+?)\s*\(([+-][\d.]+)\)/);
                if (match) {
                    adjustments.push({
                        turn: parseInt(match[1]),
                        type: match[2],
                        description: match[3].trim(),
                        amount: parseFloat(match[4])
                    });
                }
            }
        }
        
        return adjustments;
    }
    
    function createInitialTimeState() {
        const config = loadConfiguration();
        
        let initialDayProgress = 0.0;
        
        // Check if starting time was already applied (one-time only)
        if (config && config.startingTime && 
            (typeof state === 'undefined' || !state.startingTimeApplied)) {
            const { hour, minute } = config.startingTime;
            if (hour >= 0 && hour < config.hoursPerDay && minute >= 0 && minute < 60) {
                const totalMinutes = hour * 60 + minute;
                initialDayProgress = totalMinutes / (config.hoursPerDay * 60);
                
                // Mark starting time as applied
                if (typeof state !== 'undefined') {
                    state.startingTimeApplied = true;
                }
                
                if (debug) console.log(`${MODULE_NAME}: Starting at ${hour}:${String(minute).padStart(2, '0')} (one-time only)`);
            }
        }
        
        const timeData = {
            day: 0,
            dayProgress: initialDayProgress,
            lastProcessedAction: -1,
            adjustments: []
        };
        
        saveTimeState(timeData);
        return timeData;
    }
    
    function saveTimeState(timeData) {
        if (!timeData) return;
        
        const config = loadConfiguration();
        if (!config) return;
        
        const timeInfo = calculateTimeOfDay(timeData.dayProgress, config.timePeriods, config.hoursPerDay);
        const timeStr = progressToTime(timeData.dayProgress, config.hoursPerDay);
        const calculatedDate = calculateDate(timeData.day, config.startDate, config);
        
        let entry = (
            `# Time State` +
            `\nTime: [${timeStr} ${timeInfo.period}]` +
            `\nDate: [${calculatedDate}]`
        );
        
        // Add season if configured
        if (config.seasons) {
            const yearInfo = getDayOfYear(timeData.day, config.startDate, config);
            const yearProgress = calculateYearProgress(yearInfo.dayOfYear, yearInfo.year, config);
            const season = calculateSeason(yearProgress, config.seasons);
            if (season !== 'Unknown') {
                entry += `\nSeason: [${season}]`;
            }
        }
        
        // Add technical/persistent values at the bottom
        entry += (
            `\nDay: ${timeData.day}` +
            `\nDay Progress: ${timeData.dayProgress.toFixed(6)}` +
            `\nLast Processed Action: ${timeData.lastProcessedAction}`
        );
        
        // Build description with adjustments
        let description = '';
        if (timeData.adjustments && timeData.adjustments.length > 0) {
            description = `## Time Adjustments (Last 50)\n`;
            // Keep only last 50 adjustments
            const recentAdjustments = timeData.adjustments.slice(-50);
            for (const adj of recentAdjustments) {
                description += `- Turn ${adj.turn}: ${adj.type} ${adj.description} (${adj.amount >= 0 ? '+' : ''}${adj.amount.toFixed(6)})\n`;
            }
        }
        
        Utilities.storyCard.upsert({
            title: STATE_CARD,
            entry: entry,
            description: description
        });
        
        timeDataCache = null;
    }
    
    // ==========================
    // Time Calculations
    // ==========================
    
    function calculateTimeOfDay(dayProgress, timePeriods, hoursPerDay = 24) {
        let currentPeriod = 'Unknown';
        
        if (timePeriods) {
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
        }
        
        return { period: currentPeriod };
    }
    
    function progressToTime(progress, hoursPerDay) {
        progress = Math.max(0, Math.min(1, progress));
        const totalMinutes = Math.floor(progress * hoursPerDay * 60);
        const hour = Math.floor(totalMinutes / 60) % hoursPerDay;
        const minute = totalMinutes % 60;
        return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }
    
    function calculateDate(totalDays, startDateStr, config) {
        const dateInfo = calculateDateInfo(totalDays, startDateStr, config);
        const dayOfWeekIndex = ((totalDays % config.daysOfWeek.length) + config.daysOfWeek.length) % config.daysOfWeek.length;
        const dayOfWeek = config.daysOfWeek[dayOfWeekIndex];
        const monthName = config.months[dateInfo.month % config.months.length];
        return `${dayOfWeek}, ${monthName} ${dateInfo.day}, ${dateInfo.year}`;
    }
    
    function calculateDateInfo(totalDays, startDateStr, config) {
        const parts = startDateStr.split('/');
        let currentMonth = parseInt(parts[0]) - 1;
        let currentDay = parseInt(parts[1]);
        let currentYear = parseInt(parts[2]);
        
        let remainingDays = Math.abs(totalDays);
        const isNegative = totalDays < 0;
        
        if (isNegative) {
            while (remainingDays > 0) {
                if (remainingDays >= currentDay) {
                    remainingDays -= currentDay;
                    currentMonth--;
                    if (currentMonth < 0) {
                        currentMonth = config.months.length - 1;
                        currentYear--;
                    }
                    currentDay = getDaysInMonth(currentMonth, currentYear, config);
                } else {
                    currentDay -= remainingDays;
                    remainingDays = 0;
                }
            }
        } else {
            remainingDays = totalDays;
            while (remainingDays > 0) {
                const daysInCurrentMonth = getDaysInMonth(currentMonth, currentYear, config);
                const daysLeftInMonth = daysInCurrentMonth - currentDay + 1;
                
                if (remainingDays >= daysLeftInMonth) {
                    remainingDays -= daysLeftInMonth;
                    currentDay = 1;
                    currentMonth++;
                    if (currentMonth >= config.months.length) {
                        currentMonth = 0;
                        currentYear++;
                    }
                } else {
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
    
    function getDaysInMonth(monthIndex, year, config) {
        if (monthIndex >= config.daysPerMonth.length) {
            monthIndex = monthIndex % config.daysPerMonth.length;
        }
        
        let days = config.daysPerMonth[monthIndex];
        
        if (config.leapYear && config.leapYear.enabled && isLeapYear(year, config.leapYear)) {
            const adjustment = config.leapYear.adjustments[monthIndex];
            if (adjustment !== undefined) {
                days = Math.max(1, days + adjustment);
            }
        }
        
        return days;
    }
    
    function isLeapYear(year, leapConfig) {
        if (!leapConfig || !leapConfig.enabled) return false;
        
        const yearsSinceStart = year - leapConfig.startYear;
        
        if (yearsSinceStart % leapConfig.frequency !== 0) return false;
        
        if (leapConfig.skipFrequency > 0) {
            if (yearsSinceStart % leapConfig.skipFrequency === 0) {
                if (leapConfig.skipExceptionFrequency > 0 && 
                    yearsSinceStart % leapConfig.skipExceptionFrequency === 0) {
                    return true;
                }
                return false;
            }
        }
        
        return true;
    }
    
    function getDayOfYear(totalDays, startDateStr, config) {
        const dateInfo = calculateDateInfo(totalDays, startDateStr, config);
        let dayOfYear = 0;
        
        for (let m = 0; m < dateInfo.month; m++) {
            dayOfYear += getDaysInMonth(m, dateInfo.year, config);
        }
        
        dayOfYear += dateInfo.day - 1;
        
        return { 
            dayOfYear: dayOfYear,
            year: dateInfo.year 
        };
    }
    
    function calculateYearProgress(daysSinceStartOfYear, year, config) {
        let totalDaysInYear = 0;
        for (let month = 0; month < config.months.length; month++) {
            totalDaysInYear += getDaysInMonth(month, year, config);
        }
        return daysSinceStartOfYear / totalDaysInYear;
    }
    
    function calculateSeason(yearProgress, seasons) {
        if (!seasons) return 'Unknown';
        
        for (const [key, season] of Object.entries(seasons)) {
            if (season.wrapsAround) {
                if (yearProgress >= season.start || yearProgress < season.end) {
                    return season.name;
                }
            } else {
                if (yearProgress >= season.start && yearProgress < season.end) {
                    return season.name;
                }
                if (season.end === 1.0 && yearProgress >= season.start) {
                    return season.name;
                }
            }
        }
        
        return 'Unknown';
    }
    
    // ==========================
    // Initialize API Methods
    // ==========================
    
    function initializeAPI() {
        // Time Methods
        Calendar.getCurrentTime = () => {
            const timeData = loadTimeState();
            const config = loadConfiguration();
            if (!timeData || !config) return null;
            return progressToTime(timeData.dayProgress, config.hoursPerDay);
        };
        
        Calendar.getFormattedTime = () => {
            const timeData = loadTimeState();
            const config = loadConfiguration();
            if (!timeData || !config) return null;
            
            const timeStr = progressToTime(timeData.dayProgress, config.hoursPerDay);
            
            if (config.hoursPerDay % 2 !== 0) return timeStr;
            
            const [hourStr, minuteStr] = timeStr.split(':');
            let hour = parseInt(hourStr);
            const halfDay = config.hoursPerDay / 2;
            const isPM = hour >= halfDay;
            if (isPM && hour > halfDay) hour -= halfDay;
            if (hour === 0) hour = halfDay;
            
            return `${hour}:${minuteStr} ${isPM ? 'PM' : 'AM'}`;
        };
        
        Calendar.getTimeOfDay = () => {
            const timeData = loadTimeState();
            const config = loadConfiguration();
            if (!timeData || !config) return null;
            const timeInfo = calculateTimeOfDay(timeData.dayProgress, config.timePeriods, config.hoursPerDay);
            return timeInfo.period;
        };
        
        Calendar.getDayProgress = () => {
            const timeData = loadTimeState();
            return timeData ? timeData.dayProgress : null;
        };
        
        // Date Methods
        Calendar.getCurrentDate = () => {
            const timeData = loadTimeState();
            const config = loadConfiguration();
            if (!timeData || !config) return null;
            return calculateDate(timeData.day, config.startDate, config);
        };
        
        Calendar.getDayNumber = () => {
            const timeData = loadTimeState();
            return timeData ? timeData.day : null;
        };
        
        Calendar.getDayOfWeek = () => {
            const timeData = loadTimeState();
            const config = loadConfiguration();
            if (!timeData || !config) return null;
            const dayOfWeekIndex = ((timeData.day % config.daysOfWeek.length) + config.daysOfWeek.length) % config.daysOfWeek.length;
            return config.daysOfWeek[dayOfWeekIndex];
        };
        
        Calendar.getDayOfMonth = () => {
            const timeData = loadTimeState();
            const config = loadConfiguration();
            if (!timeData || !config) return null;
            const dateInfo = calculateDateInfo(timeData.day, config.startDate, config);
            return dateInfo.day;
        };
        
        Calendar.getMonth = () => {
            const timeData = loadTimeState();
            const config = loadConfiguration();
            if (!timeData || !config) return null;
            const dateInfo = calculateDateInfo(timeData.day, config.startDate, config);
            return config.months[dateInfo.month];
        };
        
        Calendar.getYear = () => {
            const timeData = loadTimeState();
            const config = loadConfiguration();
            if (!timeData || !config) return null;
            const dateInfo = calculateDateInfo(timeData.day, config.startDate, config);
            return dateInfo.year;
        };
        
        Calendar.getDayOfYear = () => {
            const timeData = loadTimeState();
            const config = loadConfiguration();
            if (!timeData || !config) return null;
            const yearInfo = getDayOfYear(timeData.day, config.startDate, config);
            return yearInfo.dayOfYear + 1;
        };
        
        // Season Methods
        Calendar.getCurrentSeason = () => {
            const timeData = loadTimeState();
            const config = loadConfiguration();
            if (!timeData || !config || !config.seasons) return null;
            const yearInfo = getDayOfYear(timeData.day, config.startDate, config);
            const yearProgress = calculateYearProgress(yearInfo.dayOfYear, yearInfo.year, config);
            return calculateSeason(yearProgress, config.seasons);
        };
        
        Calendar.getYearProgress = () => {
            const timeData = loadTimeState();
            const config = loadConfiguration();
            if (!timeData || !config) return null;
            const yearInfo = getDayOfYear(timeData.day, config.startDate, config);
            return calculateYearProgress(yearInfo.dayOfYear, yearInfo.year, config);
        };
        
        // Event Methods
        Calendar.getTodayEvents = () => {
            const timeData = loadTimeState();
            const config = loadConfiguration();
            if (!timeData || !config) return [];
            
            const eventsList = loadEventDays();
            if (eventsList.length === 0) return [];
            
            const dateInfo = calculateDateInfo(timeData.day, config.startDate, config);
            const dayEvents = checkEventDay(dateInfo.month, dateInfo.day, dateInfo.year, eventsList, config);
            
            return dayEvents.map(event => {
                const timeInfo = checkEventTimeRange(event, timeData.dayProgress, config.hoursPerDay);
                return {
                    ...event,
                    timeInfo: timeInfo
                };
            });
        };
        
        Calendar.getActiveTimeRangeEvents = () => {
            const todayEvents = Calendar.getTodayEvents();
            return todayEvents.filter(event => event.timeInfo && event.timeInfo.active);
        };
        
        Calendar.getUpcomingEvents = (daysAhead = 30) => {
            const timeData = loadTimeState();
            const config = loadConfiguration();
            if (!timeData || !config) return [];
            
            const eventsList = loadEventDays();
            if (eventsList.length === 0) return [];
            
            const upcoming = [];
            
            for (let i = 1; i <= daysAhead; i++) {
                const futureDay = timeData.day + i;
                const dateInfo = calculateDateInfo(futureDay, config.startDate, config);
                
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
        
        Calendar.getAllEvents = () => loadEventDays();
        Calendar.isEventDay = () => Calendar.getTodayEvents().length > 0;
        
        // Time Manipulation Methods
        Calendar.advanceTime = (timeSpec) => {
            const timeData = loadTimeState();
            const config = loadConfiguration();
            if (!timeData || !config || typeof timeSpec !== 'string') return false;
            
            // Get current action count for recording adjustment
            const currentAction = getActionCount();
            
            let totalHours = 0;
            const parts = timeSpec.split(',').map(p => p.trim());
            
            for (const part of parts) {
                const combinedMatch = part.match(/^(-?\d+)h(\d+)m$/i);
                if (combinedMatch) {
                    const hours = parseInt(combinedMatch[1]);
                    const minutes = parseInt(combinedMatch[2]);
                    totalHours += hours + (hours < 0 ? -minutes/60 : minutes/60);
                    continue;
                }
                
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
            
            // Convert hours to day progress
            const progressToAdd = totalHours / config.hoursPerDay;
            let newDayProgress = timeData.dayProgress + progressToAdd;
            let newDay = timeData.day;
            
            // Handle day rollovers
            while (newDayProgress >= 1.0) {
                newDayProgress -= 1.0;
                newDay++;
            }
            while (newDayProgress < 0) {
                newDayProgress += 1.0;
                newDay--;
            }
            
            // Record adjustment
            const adjustments = timeData.adjustments || [];
            adjustments.push({
                turn: currentAction !== null ? currentAction : timeData.lastProcessedAction,
                type: 'advanceTime',
                description: timeSpec,
                amount: progressToAdd
            });
            
            const newTimeData = {
                day: newDay,
                dayProgress: newDayProgress,
                lastProcessedAction: timeData.lastProcessedAction,
                adjustments: adjustments
            };
            
            saveTimeState(newTimeData);
            if (debug) console.log(`${MODULE_NAME}: Advanced time by ${timeSpec}`);
            return true;
        };
        
        Calendar.setTime = (hour, minute = 0) => {
            const timeData = loadTimeState();
            const config = loadConfiguration();
            if (!timeData || !config) return false;
            
            if (typeof hour !== 'number' || hour < 0 || hour >= config.hoursPerDay) return false;
            if (typeof minute !== 'number' || minute < 0 || minute >= 60) return false;
            
            const totalMinutes = hour * 60 + minute;
            const newDayProgress = totalMinutes / (config.hoursPerDay * 60);
            
            // Get current action count for recording adjustment
            const currentAction = getActionCount();
            
            // Record adjustment
            const progressDiff = newDayProgress - timeData.dayProgress;
            const adjustments = timeData.adjustments || [];
            adjustments.push({
                turn: currentAction !== null ? currentAction : timeData.lastProcessedAction,
                type: 'setTime',
                description: `${hour}:${String(minute).padStart(2, '0')}`,
                amount: progressDiff
            });
            
            const newTimeData = {
                day: timeData.day,
                dayProgress: newDayProgress,
                lastProcessedAction: timeData.lastProcessedAction,
                adjustments: adjustments
            };
            
            saveTimeState(newTimeData);
            return true;
        };
        
        Calendar.setDay = (newDay) => {
            const timeData = loadTimeState();
            if (!timeData || typeof newDay !== 'number') return false;
            
            const dayDiff = Math.floor(newDay) - timeData.day;
            
            // Get current action count for recording adjustment
            const currentAction = getActionCount();
            
            // Record adjustment if day changed
            const adjustments = timeData.adjustments || [];
            if (dayDiff !== 0) {
                adjustments.push({
                    turn: currentAction !== null ? currentAction : timeData.lastProcessedAction,
                    type: 'setDay',
                    description: `day ${Math.floor(newDay)}`,
                    amount: dayDiff  // Store as day difference
                });
            }
            
            const newTimeData = {
                day: Math.floor(newDay),
                dayProgress: timeData.dayProgress,
                lastProcessedAction: timeData.lastProcessedAction,
                adjustments: adjustments
            };
            
            saveTimeState(newTimeData);
            return true;
        };
        
        Calendar.setActionsPerDay = (newActionsPerDay) => {
            const config = loadConfiguration();
            const timeData = loadTimeState();
            if (!config || !timeData) return false;
            
            if (typeof newActionsPerDay !== 'number' || newActionsPerDay < 1) return false;
            
            const configCard = Utilities.storyCard.get(CONFIG_CARD);
            if (!configCard) return false;
            
            let configText = configCard.entry || '';
            configText = configText.replace(
                /Actions Per Day:\s*\d+/,
                `Actions Per Day: ${Math.floor(newActionsPerDay)}`
            );
            
            Utilities.storyCard.update(CONFIG_CARD, { entry: configText });
            configCache = null;
            
            // No need to adjust dayProgress - it stays the same
            saveTimeState(timeData);
            return true;
        };
        
        Calendar.setHoursPerDay = (newHoursPerDay) => {
            const config = loadConfiguration();
            const timeData = loadTimeState();
            if (!config || !timeData) return false;
            
            if (typeof newHoursPerDay !== 'number' || newHoursPerDay < 1) return false;
            
            const configCard = Utilities.storyCard.get(CONFIG_CARD);
            if (!configCard) return false;
            
            let configText = configCard.entry || '';
            configText = configText.replace(
                /Hours Per Day:\s*\d+/,
                `Hours Per Day: ${Math.floor(newHoursPerDay)}`
            );
            
            Utilities.storyCard.update(CONFIG_CARD, { entry: configText });
            configCache = null;
            
            saveTimeState(timeData);
            return true;
        };
        
        // State Methods
        Calendar.getState = () => loadTimeState();
        Calendar.getConfig = () => loadConfiguration();
        
        // Cache Methods
        Calendar.clearEventCache = () => {
            eventCache = null;
            return true;
        };
        
        Calendar.clearConfigCache = () => {
            configCache = null;
            return true;
        };
        
        Calendar.clearAllCaches = () => {
            eventCache = null;
            configCache = null;
            timeDataCache = null;
            return true;
        };
    }
    
    // ==========================
    // Event Processing
    // ==========================
    
    function loadEventDays() {
        if (eventCache !== null) return eventCache;
        
        try {
            const eventsList = [];
            let cardNumber = 1;
            let cardTitle = EVENT_CARD_PREFIX;
            
            while (true) {
                if (cardNumber > 1) {
                    cardTitle = `${EVENT_CARD_PREFIX} ${cardNumber}`;
                }
                
                const eventCard = Utilities.storyCard.get(cardTitle);
                if (!eventCard) break;
                
                const entryEvents = parseEventList(eventCard.entry || '');
                const descEvents = parseEventList(eventCard.description || '');
                
                eventsList.push(...entryEvents, ...descEvents);
                
                cardNumber++;
                if (cardNumber > 10) break;
            }
            
            const uniqueEvents = removeDuplicateEvents(eventsList);
            eventCache = uniqueEvents;
            return uniqueEvents;
        } catch (error) {
            if (debug) console.log(`${MODULE_NAME}: Error loading event days:`, error.message);
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
            if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) continue;
            if (trimmed.startsWith('##')) continue;
            
            const event = parseEventLine(trimmed);
            if (event) eventsList.push(event);
        }
        
        return eventsList;
    }
    
    function parseEventLine(line) {
        const cleaned = line.replace(/^[-•*]\s*/, '').trim();
        if (!cleaned) return null;
        
        let timeRanges = null;
        let duration = 1;
        let baseEvent = cleaned;
        
        const timeRangeMatch = cleaned.match(/^(.+?)@\s*(.+)$/);
        if (timeRangeMatch) {
            baseEvent = timeRangeMatch[1].trim();
            const timeSpec = timeRangeMatch[2].trim();
            
            const durationMatch = baseEvent.match(/^(.+?)\s+lasting\s+(\d+)\s+days?$/i);
            if (durationMatch) {
                baseEvent = durationMatch[1].trim();
                duration = parseInt(durationMatch[2]);
            }
            
            timeRanges = parseTimeRanges(timeSpec);
        }
        
        const dailyMatch = baseEvent.match(/^(.+?):\s*daily\s*$/i);
        if (dailyMatch) {
            return {
                name: dailyMatch[1].trim(),
                type: 'daily',
                duration: duration,
                timeRanges: timeRanges
            };
        }
        
        const weeklyMatch = baseEvent.match(/^(.+?):\s*(\w+?)s?\s*$/i);
        if (weeklyMatch) {
            const name = weeklyMatch[1].trim();
            const dayName = weeklyMatch[2];
            const config = loadConfiguration();
            if (!config) return null;
            
            const weekdayIndex = config.daysOfWeek.findIndex(d => 
                d.toLowerCase() === dayName.toLowerCase()
            );
            
            if (weekdayIndex !== -1) {
                return {
                    name: name,
                    type: 'weekly',
                    weekday: weekdayIndex,
                    duration: duration,
                    timeRanges: timeRanges
                };
            }
        }
        
        const nthWeekdayMatch = baseEvent.match(/^(.+?):\s*(1st|2nd|3rd|4th|5th|last)\s+(\w+)\s+of\s+(\w+)\s*(.*)$/i);
        if (nthWeekdayMatch) {
            const name = nthWeekdayMatch[1].trim();
            const nth = nthWeekdayMatch[2].toLowerCase();
            const weekday = nthWeekdayMatch[3];
            const monthName = nthWeekdayMatch[4];
            const modifiers = nthWeekdayMatch[5].trim().toLowerCase();
            
            const config = loadConfiguration();
            if (!config) return null;
            
            const monthIndex = config.months.findIndex(m => 
                m.toLowerCase() === monthName.toLowerCase()
            );
            if (monthIndex === -1) return null;
            
            const weekdayIndex = config.daysOfWeek.findIndex(d => 
                d.toLowerCase() === weekday.toLowerCase()
            );
            if (weekdayIndex === -1) return null;
            
            let nthNum = nth === 'last' ? -1 : parseInt(nth.replace(/[^\d]/g, ''));
            if (isNaN(nthNum) || nthNum < 1 || nthNum > 5) return null;
            
            const event = {
                name: name,
                month: monthIndex,
                type: 'relative',
                nth: nthNum,
                weekday: weekdayIndex,
                duration: duration,
                timeRanges: timeRanges
            };
            
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
        
        const match = baseEvent.match(/^(.+?):\s*(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\s*(.*)$/);
        if (!match) return null;
        
        const name = match[1].trim();
        const month = parseInt(match[2]) - 1;
        const day = parseInt(match[3]);
        const year = match[4] ? parseInt(match[4]) : null;
        const modifiers = match[5].trim().toLowerCase();
        
        const config = loadConfiguration();
        if (!config) return null;
        
        if (month < 0 || month >= config.months.length) return null;
        
        const maxDaysInMonth = config.daysPerMonth[month];
        let leapMonthDays = maxDaysInMonth;
        
        if (config.leapYear && config.leapYear.enabled && config.leapYear.adjustments) {
            const adjustment = config.leapYear.adjustments[month];
            if (adjustment && adjustment > 0) {
                leapMonthDays = maxDaysInMonth + adjustment;
            }
        }
        
        if (day < 1 || day > leapMonthDays) return null;
        
        const event = {
            name: name,
            month: month,
            day: day,
            type: 'annual',
            duration: duration,
            timeRanges: timeRanges
        };
        
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
                event.type = 'once';
            }
        }
        
        if (modifiers.includes('annual') || modifiers.includes('yearly')) {
            event.type = 'annual';
            delete event.year;
        }
        
        return event;
    }
    
    function parseTimeRanges(timePattern) {
        const ranges = [];
        const rangeParts = timePattern.split(',').map(s => s.trim());
        
        for (const rangePart of rangeParts) {
            const match = rangePart.match(/(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/);
            if (!match) continue;
            
            ranges.push({
                start: {
                    hour: parseInt(match[1]),
                    minute: parseInt(match[2])
                },
                end: {
                    hour: parseInt(match[3]),
                    minute: parseInt(match[4])
                }
            });
        }
        
        return ranges.length > 0 ? ranges : null;
    }
    
    function removeDuplicateEvents(eventsList) {
        const seen = new Set();
        const unique = [];
        
        for (const event of eventsList) {
            let key;
            
            if (event.type === 'daily') {
                const timeRangeStr = event.timeRanges ? JSON.stringify(event.timeRanges) : 'allday';
                key = `${event.name}:daily:${timeRangeStr}`;
            } else if (event.type === 'weekly') {
                const timeRangeStr = event.timeRanges ? JSON.stringify(event.timeRanges) : 'allday';
                key = `${event.name}:weekly:${event.weekday}:${timeRangeStr}`;
            } else if (event.type === 'relative') {
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
            if (!config) {
                config = loadConfiguration();
                if (!config) return todayEvents;
            }
            
            const daysInMonth = getDaysInMonth(month, year, config);
            if (day > daysInMonth) return todayEvents;
            
            const dayOfWeekIndex = getDayOfWeekForDate(month, day, year, config);
            
            for (const event of eventsList) {
                if (event.type === 'daily') {
                    todayEvents.push(event);
                    continue;
                }
                
                if (event.type === 'weekly') {
                    if (event.weekday === dayOfWeekIndex) {
                        todayEvents.push(event);
                    }
                    continue;
                }
                
                if (event.type === 'relative') {
                    if (event.month !== month) continue;
                    
                    if (event.onlyYear && event.onlyYear !== year) continue;
                    if (event.startYear && event.frequency) {
                        const yearsSince = year - event.startYear;
                        if (yearsSince < 0 || yearsSince % event.frequency !== 0) continue;
                    }
                    
                    const eventDay = calculateNthWeekdayOfMonth(event.nth, event.weekday, month, year, config);
                    
                    if (eventDay === day) {
                        todayEvents.push(event);
                    }
                    continue;
                }
                
                if (event.month !== month || event.day !== day) continue;
                
                switch (event.type) {
                    case 'annual':
                        todayEvents.push(event);
                        break;
                        
                    case 'once':
                        if (event.year === year) {
                            todayEvents.push(event);
                        }
                        break;
                        
                    case 'periodic':
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
            if (debug) console.log(`${MODULE_NAME}: Error checking events:`, error.message);
        }
        
        return todayEvents;
    }
    
    function checkEventTimeRange(event, dayProgress, hoursPerDay) {
        if (!event.timeRanges) {
            return { active: true, allDay: true };
        }
        
        const totalMinutes = Math.floor(dayProgress * hoursPerDay * 60);
        const currentHour = Math.floor(totalMinutes / 60) % hoursPerDay;
        const currentMinute = totalMinutes % 60;
        const currentMinutes = currentHour * 60 + currentMinute;
        
        for (const range of event.timeRanges) {
            const startMinutes = range.start.hour * 60 + range.start.minute;
            const endMinutes = range.end.hour * 60 + range.end.minute;
            
            if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
                return {
                    active: true,
                    currentRange: range,
                    progress: (currentMinutes - startMinutes) / (endMinutes - startMinutes),
                    minutesRemaining: endMinutes - currentMinutes
                };
            }
        }
        
        const nextRange = event.timeRanges.find(range => {
            const startMinutes = range.start.hour * 60 + range.start.minute;
            return startMinutes > currentMinutes;
        });
        
        if (nextRange) {
            const startMinutes = nextRange.start.hour * 60 + nextRange.start.minute;
            return {
                active: false,
                upcoming: true,
                nextRange: nextRange,
                minutesUntil: startMinutes - currentMinutes
            };
        }
        
        return { active: false, upcoming: false, completed: true };
    }
    
    function calculateNthWeekdayOfMonth(nth, weekday, month, year, config) {
        const firstDayWeekday = getDayOfWeekForDate(month, 1, year, config);
        
        let daysUntilFirst = weekday - firstDayWeekday;
        if (daysUntilFirst < 0) daysUntilFirst += config.daysOfWeek.length;
        
        if (nth === -1) {
            const daysInMonth = getDaysInMonth(month, year, config);
            const lastDayWeekday = getDayOfWeekForDate(month, daysInMonth, year, config);
            
            let daysFromLast = lastDayWeekday - weekday;
            if (daysFromLast < 0) daysFromLast += config.daysOfWeek.length;
            
            return daysInMonth - daysFromLast;
        } else {
            const targetDay = 1 + daysUntilFirst + (nth - 1) * config.daysOfWeek.length;
            
            const daysInMonth = getDaysInMonth(month, year, config);
            if (targetDay > daysInMonth) return null;
            
            return targetDay;
        }
    }
    
    function getDayOfWeekForDate(month, day, year, config) {
        const startParts = config.startDate.split('/');
        const startMonth = parseInt(startParts[0]) - 1;
        const startDay = parseInt(startParts[1]);
        const startYear = parseInt(startParts[2]);
        
        const targetInfo = { month, day, year };
        const startInfo = { month: startMonth, day: startDay, year: startYear };
        
        const daysBetween = calculateDaysBetweenDates(startInfo, targetInfo, config);
        
        const dayOfWeekIndex = ((daysBetween % config.daysOfWeek.length) + config.daysOfWeek.length) % config.daysOfWeek.length;
        return dayOfWeekIndex;
    }
    
    function calculateDaysBetweenDates(startDate, endDate, config) {
        let totalDays = 0;
        
        if (endDate.year < startDate.year ||
            (endDate.year === startDate.year && endDate.month < startDate.month) ||
            (endDate.year === startDate.year && endDate.month === startDate.month && endDate.day < startDate.day)) {
            return -calculateDaysBetweenDates(endDate, startDate, config);
        }
        
        if (endDate.year === startDate.year && endDate.month === startDate.month && endDate.day === startDate.day) {
            return 0;
        }
        
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
    
    // ==========================
    // Default Configuration
    // ==========================
    
    function createDefaultConfiguration() {
        const configText = (
            `# Time Configuration` +
            `\nActions Per Day: 200` +
            `\nStart Date: 11/06/2022` +
            `\nStarting Time: 09:00` +
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
            `\n` +
            `\n## Leap Year Adjustments` +
            `\n// List of months to adjust in leap years` +
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
        
        const card = Utilities.storyCard.add({
            title: CONFIG_CARD,
            entry: configText,
            description: ''
        });
        
        if (!card) {
            if (debug) console.log(`${MODULE_NAME}: Failed to create configuration card`);
        }
    }
    
    function createDefaultEventDays() {
        const eventText = (
            `\n// Format: Event Name: MM/DD [modifiers]` +
            `\n// Format: Event Name: Nth Weekday of Month` +
            `\n// Format: Event Name: Weekday (for weekly)` +
            `\n// Format: Event Name: daily (for every day)` +
            `\n// Add @ HH:MM-HH:MM for time ranges` +
            `\n// Add "lasting N days" for multi-day events` +
            `\n//` +
            `\n// State card will show:` +
            `\n// Today's Events: All events scheduled for today` +
            `\n// Active Events: Only events currently in progress` +
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
            `\n- Mother's Day: 2nd Sunday of May @ 11:00-14:00` +
            `\n- Memorial Day: last Monday of May` +
            `\n- Father's Day: 3rd Sunday of June` +
            `\n- Labor Day: 1st Monday of September` +
            `\n- Columbus Day: 2nd Monday of October` +
            `\n- Thanksgiving: 4th Thursday of November @ 12:00-20:00` +
            `\n` +
            `\n## Daily Events` +
            `\n- Sunrise: daily @ 6:00-6:30` +
            `\n- Lunch Break: daily @ 12:00-13:00` +
            `\n- Sunset: daily @ 18:00-18:30` +
            `\n- Shop Hours: daily @ 9:00-17:00` +
            `\n` +
            `\n## Weekly Events` +
            `\n- Monday Meeting: Monday @ 9:00-10:00` +
            `\n- Trash Pickup: Tuesday @ 8:00-8:30` +
            `\n- Market Day: Wednesday @ 8:00-14:00` +
            `\n- Happy Hour: Friday @ 17:00-19:00` +
            `\n- Boss Raid: Sunday @ 20:00-22:00` +
            `\n` +
            `\n## Multi-Day Events` +
            `\n- Spring Conference: 3/15 lasting 3 days @ 9:00-17:00` +
            `\n- Summer Festival: 2nd Friday of July lasting 3 days @ 10:00-22:00` +
            `\n` +
            `\n## Periodic Events` +
            `\n- Summer Olympics: 7/15/2024 every 4 years @ 9:00-23:00` +
            `\n- Winter Olympics: 2/1/2026 every 4 years @ 8:00-22:00` +
            `\n- World Cup: 6/1/2026 every 4 years` +
            `\n- Leap Day: 2/29 annual` +
            `\n// Invalid dates will not trigger` +
            `\n` +
            `\n## One-Time Events` +
            `\n- Solar Eclipse: 4/8/2024 @ 14:00-14:30 once`
        );
        
        const description = `// You can continue in the description.`;

        const card = Utilities.storyCard.add({
            title: EVENT_CARD_PREFIX,
            entry: eventText,
            description: description
        });
        
        if (!card) {
            if (debug) console.log(`${MODULE_NAME}: Failed to create event days card`);
        }
    }
    
    // ==========================
    // Action Processing
    // ==========================
    
    function getActionCount() {
        // Use info.actionCount - the standard source in AI Dungeon
        if (typeof info !== 'undefined' && info.actionCount !== undefined) {
            const count = info.actionCount;
            // Validate it's a finite number
            if (typeof count === 'number' && isFinite(count)) {
                return count;
            }
        }
        
        return null;
    }
    
    function processCurrentAction() {
        const actionCount = getActionCount();
        if (actionCount === null) return null;
        
        const timeData = loadTimeState();
        const config = loadConfiguration();
        
        if (!timeData || !config) {
            if (debug) console.log(`${MODULE_NAME}: Cannot process actions without time data and configuration`);
            return null;
        }
        
        // Check if this action was already processed (repeated turn)
        if (actionCount === timeData.lastProcessedAction) {
            if (debug) console.log(`${MODULE_NAME}: Turn ${actionCount} is repeating, reverting adjustments`);
            
            // Find and revert any adjustments made at this turn
            const adjustments = timeData.adjustments || [];
            const adjustmentsAtThisTurn = adjustments.filter(adj => adj.turn === actionCount);
            
            if (adjustmentsAtThisTurn.length > 0) {
                // Start from current time data
                let revertedDayProgress = timeData.dayProgress;
                let revertedDay = timeData.day;
                
                // Revert each adjustment
                for (const adj of adjustmentsAtThisTurn) {
                    if (adj.type === 'setDay') {
                        revertedDay -= adj.amount;
                    } else {
                        revertedDayProgress -= adj.amount;
                    }
                }
                
                // Handle day boundaries after reverting
                while (revertedDayProgress < 0) {
                    revertedDayProgress += 1.0;
                    revertedDay--;
                }
                while (revertedDayProgress >= 1.0) {
                    revertedDayProgress -= 1.0;
                    revertedDay++;
                }
                
                // Remove the adjustments at this turn
                const cleanedAdjustments = adjustments.filter(adj => adj.turn !== actionCount);
                
                // Save the reverted state
                const revertedTimeData = {
                    day: revertedDay,
                    dayProgress: revertedDayProgress,
                    lastProcessedAction: actionCount, // Keep it marked as processed
                    adjustments: cleanedAdjustments
                };
                
                saveTimeState(revertedTimeData);
                
                return {
                    timeData: revertedTimeData,
                    repeated: true,
                    adjustmentsReverted: true
                };
            }
            
            // No adjustments to revert, just return current state
            return {
                timeData: timeData,
                repeated: true,
                adjustmentsReverted: false
            };
        }
        
        // Calculate action difference (works with negative action counts)
        const actionDiff = actionCount - timeData.lastProcessedAction;
        
        // Check for time reversal (going backwards)
        if (actionDiff < 0) {
            return handleTimeReversal(actionCount, timeData, config);
        }
        
        // Normal forward progress
        const progressPerAction = 1.0 / config.actionsPerDay;
        const progressToAdd = progressPerAction * actionDiff;
        
        let newDayProgress = timeData.dayProgress + progressToAdd;
        let newDay = timeData.day;
        let dayChanged = false;
        
        // Handle day rollovers
        while (newDayProgress >= 1.0) {
            newDayProgress -= 1.0;
            newDay++;
            dayChanged = true;
        }
        
        // Normalize dayProgress to prevent floating point accumulation
        // when we've crossed a day boundary
        if (dayChanged) {
            // Round to 6 decimal places to clean up floating point errors
            newDayProgress = Math.round(newDayProgress * 1000000) / 1000000;
            
            // Ensure it's within valid range
            if (newDayProgress >= 1.0) {
                newDayProgress = 0.999999;
            } else if (newDayProgress < 0.0) {
                newDayProgress = 0.0;
            }
        }
        
        const newTimeData = {
            day: newDay,
            dayProgress: newDayProgress,
            lastProcessedAction: actionCount,
            adjustments: timeData.adjustments || []
        };
        
        saveTimeState(newTimeData);
        
        return {
            timeData: newTimeData,
            dayChanged: newDay !== timeData.day
        };
    }
    
    function handleTimeReversal(targetAction, currentTimeData, config) {
        if (!config || !currentTimeData) return null;
        
        // Calculate the action difference (will be negative)
        const actionDiff = targetAction - currentTimeData.lastProcessedAction;
        const progressPerAction = 1.0 / config.actionsPerDay;
        const progressDiff = progressPerAction * actionDiff;
        
        // Apply the negative progress
        let newDayProgress = currentTimeData.dayProgress + progressDiff;
        let newDay = currentTimeData.day;
        
        // Also revert any adjustments that happened after the target action
        const adjustments = currentTimeData.adjustments || [];
        const cleanedAdjustments = adjustments.filter(adj => adj.turn <= targetAction);
        
        // Revert adjustments between target and current
        const adjustmentsToRevert = adjustments.filter(
            adj => adj.turn > targetAction && adj.turn <= currentTimeData.lastProcessedAction
        );
        
        for (const adj of adjustmentsToRevert) {
            if (adj.type === 'setDay') {
                newDay -= adj.amount;
            } else {
                newDayProgress -= adj.amount;
            }
        }
        
        // Handle day boundaries
        let dayChanged = false;
        while (newDayProgress < 0) {
            newDayProgress += 1.0;
            newDay--;
            dayChanged = true;
        }
        while (newDayProgress >= 1.0) {
            newDayProgress -= 1.0;
            newDay++;
            dayChanged = true;
        }
        
        // Normalize dayProgress when day changed
        if (dayChanged) {
            newDayProgress = Math.round(newDayProgress * 1000000) / 1000000;
            
            if (newDayProgress >= 1.0) {
                newDayProgress = 0.999999;
            } else if (newDayProgress < 0.0) {
                newDayProgress = 0.0;
            }
        }
        
        const newTimeData = {
            day: newDay,
            dayProgress: newDayProgress,
            lastProcessedAction: targetAction,
            adjustments: cleanedAdjustments
        };
        
        saveTimeState(newTimeData);
        
        return {
            timeData: newTimeData,
            reversed: true
        };
    }
    
    // ==========================
    // Event Dispatching
    // ==========================
    
    const eventDispatcher = {
        events: [],
        dispatchedDays: new Set(),
        
        dispatch(eventType, data) {
            this.events.push({
                type: eventType,
                data: data
            });
            
            if (eventType === 'eventDay' && data.timeData) {
                this.dispatchedDays.add(data.timeData.day);
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
    
    // ==========================
    // Hook Processing
    // ==========================
    
    switch(hook) {
        case 'context':
            // Full context processing
            const config = loadConfiguration();
            if (!config) {
                if (debug) console.log(`${MODULE_NAME}: Time system requires configuration to function`);
                createDefaultConfiguration();
                
                if (!Utilities.storyCard.exists(EVENT_CARD_PREFIX)) {
                    createDefaultEventDays();
                }
                
                // Try to load again after creation
                const newConfig = loadConfiguration();
                if (!newConfig) {
                    initializeAPI();
                    return;
                }
            }
            
            // Get previous time of day before processing
            const previousTimeData = loadTimeState();
            const prevTimeOfDay = previousTimeData ? 
                calculateTimeOfDay(previousTimeData.dayProgress, config.timePeriods, config.hoursPerDay).period :
                'Unknown';
            
            const actionResult = processCurrentAction();
            
            // Dispatch events
            if (actionResult) {
                if (actionResult.reversed) {
                    eventDispatcher.dispatch('timeReversed', actionResult);
                } else {
                    // Check for time of day change
                    const currTimeOfDay = calculateTimeOfDay(actionResult.timeData.dayProgress, config.timePeriods, config.hoursPerDay).period;
                    
                    if (prevTimeOfDay !== currTimeOfDay && prevTimeOfDay !== 'Unknown' && currTimeOfDay !== 'Unknown') {
                        eventDispatcher.dispatch('timeOfDayChanged', {
                            previousPeriod: prevTimeOfDay,
                            currentPeriod: currTimeOfDay,
                            timeData: actionResult.timeData
                        });
                    }
                    
                    if (actionResult.dayChanged) {
                        eventDispatcher.dispatch('dayChanged', {
                            previousDay: previousTimeData.day,
                            currentDay: actionResult.timeData.day,
                            timeData: actionResult.timeData
                        });
                        
                        // Check for season change
                        if (config.seasons) {
                            const timeData = actionResult.timeData;
                            const prevYearInfo = getDayOfYear(timeData.day - 1, config.startDate, config);
                            const currYearInfo = getDayOfYear(timeData.day, config.startDate, config);
                            
                            const prevYearProgress = calculateYearProgress(prevYearInfo.dayOfYear, prevYearInfo.year, config);
                            const currYearProgress = calculateYearProgress(currYearInfo.dayOfYear, currYearInfo.year, config);
                            
                            const prevSeason = calculateSeason(prevYearProgress, config.seasons);
                            const currSeason = calculateSeason(currYearProgress, config.seasons);
                            
                            if (prevSeason !== currSeason) {
                                eventDispatcher.dispatch('seasonChanged', {
                                    previousSeason: prevSeason,
                                    currentSeason: currSeason,
                                    timeData: actionResult.timeData
                                });
                            }
                        }
                    }
                    
                    // Check time-range events
                    const prevProgress = previousTimeData ? previousTimeData.dayProgress : 0;
                    const currProgress = actionResult.timeData.dayProgress;
                    
                    if (currProgress !== prevProgress) {
                        const eventsList = loadEventDays();
                        const dateInfo = calculateDateInfo(actionResult.timeData.day, config.startDate, config);
                        const todayEvents = checkEventDay(dateInfo.month, dateInfo.day, dateInfo.year, eventsList, config);
                        
                        for (const event of todayEvents) {
                            if (!event.timeRanges) continue;
                            
                            const prevTime = checkEventTimeRange(event, prevProgress, config.hoursPerDay);
                            const currTime = checkEventTimeRange(event, currProgress, config.hoursPerDay);
                            
                            if (!prevTime.active && currTime.active) {
                                eventDispatcher.dispatch('timeRangeEventStarted', {
                                    event: event,
                                    timeRange: currTime.currentRange,
                                    timeData: actionResult.timeData
                                });
                            }
                            
                            if (currTime.active && currTime.minutesRemaining <= 5 && 
                                prevTime.active && prevTime.minutesRemaining > 5) {
                                eventDispatcher.dispatch('timeRangeEventEnding', {
                                    event: event,
                                    minutesRemaining: currTime.minutesRemaining,
                                    timeData: actionResult.timeData
                                });
                            }
                            
                            if (prevTime.active && !currTime.active) {
                                eventDispatcher.dispatch('timeRangeEventEnded', {
                                    event: event,
                                    timeData: actionResult.timeData
                                });
                            }
                        }
                    }
                }
            }
            
            // Check for events on current day
            const currentTimeData = loadTimeState();
            if (currentTimeData && !eventDispatcher.hasDispatchedForDay(currentTimeData.day)) {
                const eventsList = loadEventDays();
                if (eventsList.length > 0) {
                    const dateInfo = calculateDateInfo(currentTimeData.day, config.startDate, config);
                    const todayEvents = checkEventDay(dateInfo.month, dateInfo.day, dateInfo.year, eventsList, config);
                    
                    if (todayEvents.length > 0) {
                        eventDispatcher.dispatch('eventDay', {
                            events: todayEvents,
                            date: calculateDate(currentTimeData.day, config.startDate, config),
                            timeData: currentTimeData
                        });
                    }
                }
            }
            
            // Store events and initialize API
            Calendar.events = eventDispatcher.getEvents();
            
            initializeAPI();
            
            return;
            
        default:
            // Default to API-only mode
            initializeAPI();
            return Calendar;
    }
}

// optional but defaults use atm
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
            `-5: Quests\n` +
            `100: Custom\n` +
            `\n` +
            `## Level 2 Headers\n` +
            `// Sections within World Lore\n` +
            `10: Characters\n` +
            `20: Locations\n` +
            `30: Items\n` +
            `40: Factions\n` +
            `50: Lore\n` +
            `60: History\n` +
            `70: Rules\n` +
            `\n` +
            `### Level 3 Headers\n` +
            `// Subsections within Level 2 sections\n` +
            `// Add specific priorities here if needed:\n` +
            `// 10: Important NPCs\n` +
            `// 20: Town of Beginnings\n` +
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
            uncategorizedPriority: 80,
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
        result = result.replace(/Recent\s*Story:/i, '# Recent Story');
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

function GenerationWizard(hook, text) {
    'use strict';
    
    const debug = false;
    const MODULE_NAME = 'GenerationWizard';
    
    // ==========================
    // Constants
    // ==========================
    const PROGRESS_CARD = '[ENTITY_GEN] In Progress';
    const TEMPLATE_PREFIX = '[GW Template]';
    const CONFIG_AND_PROMPTS_CARD = '[GENERATION_CONFIG]';
    const HIDDEN_OUTPUT = '\n<<<The GM is thinking, please hit continue... (Use `/GW abort` if needed, this prompting is still being worked on)>>>\n';
    const COMPLETION_MESSAGE = '\n<<<Generation Completed, returning to story>>>\n';
    
    // Helper to wrap debug output in markers to hide from LLM
    function wrapDebugOutput(text) {
        return `\n<<<[DEBUG OUTPUT]\n${text}\n>>>\n`;
    }
    // ==========================
    // Runtime Configuration
    // ==========================
    
    function loadConfig() {
        // Use centralized config with custom parser
        return Utilities.config.load(
            CONFIG_AND_PROMPTS_CARD,
            parseConfigSection,  // Custom parser for config section only
            createDefaultConfigAndPrompts,  // Auto-create if missing
            true  // Cache the result
        );
    }
    
    function parseConfigSection(fullText) {
        const config = {
            debug: false
        };
        
        // Parse config section from entry
        const lines = fullText.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            
            // Stop at first section header
            if (trimmed.startsWith('##')) break;
            
            if (trimmed.startsWith('debug:')) {
                config.debug = trimmed.substring(6).trim().toLowerCase() === 'true';
            }
        }
        
        return config;
    }
    
    function createDefaultConfigAndPrompts() {
        Utilities.storyCard.add({
            title: CONFIG_AND_PROMPTS_CARD,
            type: 'data',
            entry: (
                `# Generation Configuration & Prompts\n` +
                `debug: false\n` +
                `\n` +
                `// Set debug to true to see AI responses during generation\n` +
                `// Set debug to false to hide intermediate responses\n` +
                `\n` +
                `## About This Card\n` +
                `Edit the description below to customize generation prompts.\n` +
                `Each ## Section in the description is a different prompt template.\n` +
                `Use {{VARIABLE}} syntax for replacements.`
            ),
            description: (
                `## Entity Selection\n` +
                `<s>\nCARDINAL SYSTEM - Entity Generation Override\n\n` +
                `**What type of entity would you like to create?**\n\n` +
                `Valid options: NPC, Monster, Boss, Item, Location, Quest\n` +
                `Respond with exactly one of the above options.\n` +
                `Do not add any narrative. Only provide the entity type.\n</s>\n\n` +
                `CARDINAL RESPONSE:\n\n` +
                
                `## Field Collection\n` +
                `<s>\nCARDINAL SYSTEM - Entity Generation Override\n\n` +
                `Creating new {{ENTITY_TYPE}}.\n\n` +
                `==== REQUIRED INFORMATION ====\n` +
                `{{FIELD_LIST}}\n\n` +
                `Provide responses in the exact format shown. Do not add narrative.\n</s>\n\n` +
                `CARDINAL RESPONSE:\n\n` +
                
                `## Quest Combined\n` +
                `<s>\nCARDINAL SYSTEM - Quest Generation Override\n\n` +
                `Creating new Quest.\n\n` +
                `{{CONTEXT_SECTION}}\n` +
                `==== REQUIRED INFORMATION ====\n` +
                `{{QUERY_SECTION}}\n` +
                `Provide responses in the exact format shown. Do not add narrative.\n</s>\n\n` +
                `CARDINAL RESPONSE:\n\n` +
                
                `## Quest Stages\n` +
                `<s>\nCARDINAL SYSTEM - Quest Generation Override\n\n` +
                `**What are the objectives for this quest?**\n\n` +
                `{{STAGE_LIST}}\n\n` +
                `Provide clear quest objectives.\n</s>\n\n` +
                `CARDINAL RESPONSE:\n\n` +
                
                `## Quest Rewards\n` +
                `<s>\nCARDINAL SYSTEM - Quest Generation Override\n\n` +
                `**What are the rewards for completing this {{QUEST_TYPE}} quest?**\n\n` +
                `Experience: [XP amount]\n` +
                `Col: [currency amount]\n` +
                `Items: [item rewards or "None"]\n\n` +
                `Provide appropriate rewards for a {{QUEST_TYPE}} quest.\n</s>\n\n` +
                `CARDINAL RESPONSE:\n\n` +
                
                `## Entity Classification\n` +
                `<s>\nCARDINAL SYSTEM - Entity Classification Override\n\n` +
                `{{CLASSIFICATION_QUERY}}\n</s>\n\n` +
                `CARDINAL RESPONSE:\n\n` +
                
                `## Entity Details\n` +
                `<s>\nCARDINAL SYSTEM - Entity Details Override\n\n` +
                `{{DETAILS_QUERY}}\n</s>\n\n` +
                `CARDINAL RESPONSE:\n\n` +
                
                `## NPC Batch\n` +
                `<s>\nCARDINAL SYSTEM - NPC Generation Override\n\n` +
                `The entity "{{NAME}}" was referenced and needs to be created as an NPC.\n\n` +
                `{{CONTEXT}}` +
                `==== REQUIRED INFORMATION ====\n` +
                `Provide the following details:\n\n` +
                `{{FIELD_LIST}}\n\n` +
                `Format: KEY: value\n` +
                `One field per line. Be creative and consistent with the game world.\n` +
                `Respond ONLY with the requested fields. No narrative or additional text.\n</s>\n\n` +
                `CARDINAL RESPONSE:`
            )
        });
        
        if (debug) console.log(`${MODULE_NAME}: Created default configuration and prompts card`);
    }
    
    const config = loadConfig();
    
    // ==========================
    // Template Field Types
    // ==========================
    const FieldTypes = {
        TEXT: 'text',
        CHOICE: 'choice',
        RANGE: 'range',
        NUMBER: 'number',
        BOOLEAN: 'boolean',
        LIST: 'list',
        FORMULA: 'formula',
        GAMESTATE: 'gamestate'
    };
    
    // ==========================
    // Generation Control
    // ==========================
    
    function isGenerationActive() {
        const progressCard = Utilities.storyCard.get(PROGRESS_CARD);
        return progressCard !== null;
    }
    
    function shouldTakeControl() {
        if (!isGenerationActive()) return false;
        
        const progress = loadProgress();
        return progress && !progress.completed;
    }
    
    // ==========================
    // Prompt Template Management
    // ==========================
    
    function loadPromptTemplate(section) {
        const card = Utilities.storyCard.get(CONFIG_AND_PROMPTS_CARD);
        if (!card) {
            createDefaultConfigAndPrompts();
            return Utilities.storyCard.get(CONFIG_AND_PROMPTS_CARD)?.description || '';
        }
        
        // Extract the specific section from description
        const description = card.description || '';
        const sectionRegex = new RegExp(`## ${section}\\s*\\n([^#]+)`, 's');
        const match = description.match(sectionRegex);
        
        return match ? match[1].trim() : '';
    }
    
    function generatePrompt(section, replacements = {}) {
        let prompt = loadPromptTemplate(section);
        
        // Replace all {{VARIABLE}} placeholders
        for (const [key, value] of Object.entries(replacements)) {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            prompt = prompt.replace(regex, value);
        }
        
        return prompt;
    }
    
    // ==========================
    // Location Data Transformation
    // ==========================
    function createLocationFromData(collectedData, metadata) {
        const name = collectedData.NAME || 'Unknown_Location';
        const formattedName = name.replace(/\s+/g, '_');
        
        // Build type string from fields
        let typeString = '';
        if (collectedData.LOCATION_TYPE) typeString += `Type: ${collectedData.LOCATION_TYPE}`;
        if (collectedData.TERRAIN) typeString += ` | Terrain: ${collectedData.TERRAIN}`;
        
        // TODO: Could add implicit danger tags based on LOCATION_TYPE
        // Settlement/Safezone = Safe
        // Wilderness/Landmark = Medium
        // Dungeon/Ruins = Dangerous
        
        // Build pathways section (no header here, added in locationEntry)
        let pathwaysSection = '';
        
        // Add return path if we know where we came from
        if (metadata && metadata.from && metadata.direction) {
            const oppositeDir = getOppositeDirection(metadata.direction);
            pathwaysSection += `- ${oppositeDir}: ${metadata.from}\n`;
        }
        
        // Add unexplored paths for other directions
        const allDirections = ['North', 'South', 'East', 'West'];
        for (const dir of allDirections) {
            if (!metadata || !metadata.direction || dir !== getOppositeDirection(metadata.direction)) {
                pathwaysSection += `- ${dir}: (unexplored)\n`;
            }
        }
        
        // Dynamically determine location header based on player's floor
        let locationHeaders = '<$# Locations>';
        if (typeof GameState !== 'undefined' && GameState.getPlayerName && GameState.loadCharacter) {
            const playerName = GameState.getPlayerName();
            if (playerName) {
                const player = GameState.loadCharacter(playerName);
                if (player && player.location) {
                    // Try to extract floor from player's location (e.g., "Floor_2_Town" or check runtime)
                    const currentFloor = GameState.getRuntimeValue ? 
                        (GameState.getRuntimeValue('current_floor') || 1) : 1;
                    
                    // Convert floor number to words for header
                    const floorWords = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
                    let floorName;
                    if (currentFloor >= 0 && currentFloor < floorWords.length) {
                        floorName = 'Floor ' + floorWords[currentFloor];
                    } else {
                        floorName = 'Floor ' + currentFloor;
                    }
                    locationHeaders = '<$# Locations>\n<$## ' + floorName + '>';
                }
            }
            
            // Allow override via runtime variable if set
            const customHeader = GameState.getRuntimeValue ? GameState.getRuntimeValue('location_header') : null;
            if (customHeader) {
                locationHeaders = customHeader; // User override takes precedence
            }
        }
        
        // Build the location entry
        const locationEntry = (
            locationHeaders + '\n' +
            '## **' + formattedName + '**\n' +
            typeString + '\n' +
            '### Description\n' +
            (collectedData.DESCRIPTION || 'An unexplored location.') + '\n' +
            '### Pathways\n' +
            pathwaysSection
        );
        
        // Create the card
        const snakeCased = formattedName.toLowerCase();  // Already has underscores
        const spacedName = formattedName.replace(/_/g, ' ');
        
        const card = {
            title: `[LOCATION] ${formattedName}`,
            type: 'Location',
            keys: `${snakeCased}, ${spacedName}`,  // Keys as comma-separated string
            entry: locationEntry,
            description: `Generated on turn ${info?.actionCount || 0}`
        };
        
        Utilities.storyCard.add(card);
        
        // Update the connecting location's pathways if needed
        if (metadata && metadata.from && metadata.direction) {
            updateLocationPathway(metadata.from, metadata.direction, formattedName);
        }
        
        if (debug) console.log(`${MODULE_NAME}: Created location ${formattedName}`);
        
        // Signal completion if GameState has a handler
        if (typeof GameState !== 'undefined' && GameState.completeLocationGeneration) {
            GameState.completeLocationGeneration(formattedName, metadata);
        }
    }
    
    function getOppositeDirection(direction) {
        const opposites = {
            'north': 'South',
            'south': 'North',
            'east': 'West',
            'west': 'East'
        };
        return opposites[direction.toLowerCase()] || direction;
    }
    
    function updateLocationPathway(locationName, direction, destinationName) {
        const card = Utilities.storyCard.get(`[LOCATION] ${locationName}`);
        if (!card) return;
        
        // Parse current entry
        let entry = card.entry || '';
        
        // Find and update the pathway line
        const dirCapitalized = direction.charAt(0).toUpperCase() + direction.slice(1).toLowerCase();
        const pathwayRegex = new RegExp(`^- ${dirCapitalized}: .*$`, 'm');
        
        if (entry.match(pathwayRegex)) {
            entry = entry.replace(pathwayRegex, `- ${dirCapitalized}: ${destinationName}`);
        }
        
        Utilities.storyCard.update(card.title, { entry: entry });
        
        if (debug) console.log(`${MODULE_NAME}: Updated ${locationName} pathway ${direction} to ${destinationName}`);
    }
    
    // ==========================
    // Character Data Transformation
    // ==========================
    function transformToCharacterData(collectedData, triggerName) {
        const characterData = {
            name: collectedData.NAME,
            fullName: collectedData.FULL_NAME || null,
            gender: collectedData.GENDER || '???',
            dob: collectedData.DOB || null,
            level: parseInt(collectedData.LEVEL) || 1,
            location: collectedData.DEFAULT_LOCATION || collectedData.LOCATION || 'unknown',
            isPlayer: false,  // NPCs are not players
            triggerName: triggerName || null,  // Store original trigger name
            attributes: {},
            skills: {},
            inventory: {},
            relationships: {}
        };
        
        // Combine appearance fields into single field for GameState
        if (collectedData.HAIR || collectedData.EYES || collectedData.BUILD) {
            const appearanceParts = [];
            if (collectedData.HAIR) appearanceParts.push(`Hair: ${collectedData.HAIR}`);
            if (collectedData.EYES) appearanceParts.push(`Eyes: ${collectedData.EYES}`);
            if (collectedData.BUILD) appearanceParts.push(`Build: ${collectedData.BUILD}`);
            characterData.appearance = appearanceParts.join(' | ');
        } else if (collectedData.APPEARANCE) {
            // Fallback to old APPEARANCE field if present
            characterData.appearance = collectedData.APPEARANCE;
        }
        
        // Map personality and background
        if (collectedData.PERSONALITY) {
            characterData.personality = collectedData.PERSONALITY;
        }
        if (collectedData.BACKGROUND) {
            characterData.background = collectedData.BACKGROUND;
        }
        
        // Map HP if provided
        if (collectedData.HP || collectedData.MAX_HP) {
            characterData.hp = {
                current: parseInt(collectedData.HP) || parseInt(collectedData.MAX_HP) || 100,
                max: parseInt(collectedData.MAX_HP) || parseInt(collectedData.HP) || 100
            };
        }
        
        // Map attributes
        const attributeNames = ['VITALITY', 'STRENGTH', 'DEXTERITY', 'AGILITY', 'INTELLIGENCE', 'WISDOM', 'CHARISMA', 'LUCK'];
        for (const attr of attributeNames) {
            if (collectedData[attr]) {
                characterData.attributes[attr.toLowerCase()] = parseInt(collectedData[attr]) || 10;
            }
        }
        
        // Parse skills if provided (format: "skill_name: Level X")
        if (collectedData.SKILLS) {
            const skillLines = collectedData.SKILLS.split('\n');
            for (const line of skillLines) {
                const match = line.match(/(.+?):\s*Level\s+(\d+)/i);
                if (match) {
                    const skillName = match[1].trim().toLowerCase().replace(/\s+/g, '_');
                    characterData.skills[skillName] = parseInt(match[2]) || 1;
                }
            }
        }
        
        // Parse inventory if provided
        if (collectedData.INVENTORY) {
            // Handle both {item:qty} format and plain list
            const invText = collectedData.INVENTORY.replace(/[{}]/g, '').trim();
            if (invText) {
                const items = invText.split(',').map(i => i.trim());
                for (const item of items) {
                    const parts = item.split(':');
                    if (parts.length === 2) {
                        const itemName = parts[0].trim().toLowerCase().replace(/\s+/g, '_');
                        const qty = parseInt(parts[1]) || 1;
                        characterData.inventory[itemName] = qty;
                    }
                }
            }
        }
        
        // Add narrative sections
        if (collectedData.APPEARANCE) {
            characterData.appearance = collectedData.APPEARANCE;
        }
        if (collectedData.PERSONALITY) {
            characterData.personality = collectedData.PERSONALITY;
        }
        if (collectedData.BACKGROUND) {
            characterData.background = collectedData.BACKGROUND;
        }
        
        // Add any shop inventory as a custom section
        if (collectedData.SHOP_INVENTORY) {
            characterData.shop_inventory = collectedData.SHOP_INVENTORY;
        }
        
        // Add quest giver info as a custom section
        if (collectedData.QUEST_GIVER) {
            characterData.available_quests = collectedData.QUEST_GIVER;
        }
        
        return characterData;
    }
    
    // ==========================
    // Template Management
    // ==========================
    
    function loadTemplate(entityType) {
        const cardTitle = `${TEMPLATE_PREFIX} ${entityType}`;
        const templateCard = Utilities.storyCard.get(cardTitle);
        
        if (!templateCard) {
            if (debug) console.log(`${MODULE_NAME}: Template not found: ${cardTitle}`);
            createDefaultTemplates();
            return Utilities.storyCard.get(cardTitle);
        }
        
        return templateCard;
    }
    
    function parseTemplateFields(description) {
        const fields = [];
        const lines = description.split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            // Skip comments and empty lines
            if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) continue;
            
            // Parse: FIELD_NAME: requirement, type[params], prompt
            const match = trimmed.match(/^([A-Z_]+):\s*([^,]+),\s*([^,]+)(?:,\s*(.+))?$/);
            if (!match) continue;
            
            const field = {
                name: match[1],
                requirement: match[2].trim(),
                type: null,
                params: null,
                prompt: match[4] ? match[4].trim() : null
            };
            
            // Parse type and params
            const typeMatch = match[3].trim().match(/^([a-z]+)(?:\[([^\]]+)\])?$/);
            if (typeMatch) {
                field.type = typeMatch[1];
                field.params = typeMatch[2] || null;
            }
            
            // Skip formula and gamestate fields from queries
            if (field.type === FieldTypes.FORMULA || field.type === FieldTypes.GAMESTATE) {
                continue;
            }
            
            fields.push(field);
        }
        
        return fields;
    }
    
    // ==========================
    // Generation State Management
    // ==========================
    
    function loadProgress() {
        const progressCard = Utilities.storyCard.get(PROGRESS_CARD);
        if (!progressCard) return null;
        
        try {
            const progress = JSON.parse(progressCard.description || '{}');
            
            // Load template fields if not cached
            if (!progress.templateFields && progress.entityType) {
                const template = loadTemplate(progress.entityType);
                if (template) {
                    progress.templateFields = parseTemplateFields(template.description);
                }
            }
            
            return progress;
        } catch (e) {
            if (debug) console.log(`${MODULE_NAME}: Error loading progress: ${e}`);
            return null;
        }
    }
    
    function saveProgress(progress) {
        // Build a preview in the entry
        let entry = `# Generating ${progress.entityType}\n\n`;
        
        const activeFields = progress.templateFields || [];
        const completedCount = Object.keys(progress.collectedData).filter(key => 
            key !== 'name' && key !== 'QUEST_TYPE' && key !== 'QUEST_GIVER' && key !== 'STAGE_COUNT' && key !== 'REWARDS_PARSED'
        ).length;
        
        // Calculate total fields based on entity type
        let totalFields;
        if (progress.entityType === 'Quest') {
            // For quests, add 2 for STAGES and REWARDS which are handled specially
            totalFields = activeFields.filter(f => f.name !== 'STAGES' && f.name !== 'REWARDS').length + 2;
        } else {
            // For other entities, just count the template fields
            totalFields = activeFields.length;
        }
        
        entry += `**Progress:** ${completedCount} of ~${totalFields} fields collected\n\n`;
        
        // Show collected data
        if (completedCount > 0) {
            entry += `## Collected Data\n`;
            for (const [key, value] of Object.entries(progress.collectedData)) {
                if (key === 'STAGES' || key === 'REWARDS') {
                    entry += `**${key}:**\n${value}\n\n`;
                } else if (key !== 'REWARDS_PARSED') {
                    entry += `**${key}:** ${value}\n`;
                }
            }
        }
        
        // Show what we're waiting for
        if (progress.currentBatch && progress.currentBatch.length > 0) {
            entry += `\n## Waiting For\n`;
            entry += progress.currentBatch.join(', ');
        }
        
        Utilities.storyCard.upsert({
            title: PROGRESS_CARD,
            entry: entry,
            description: JSON.stringify(progress)
        });
    }
    
    function clearProgress() {
        Utilities.storyCard.remove(PROGRESS_CARD);
        if (debug) console.log(`${MODULE_NAME}: Progress cleared`);
    }
    
    // ==========================
    // Quest Batch Collection
    // ==========================
    
    function generateQuestBatchPrompt(fields, stageCount, existingStages, questType, collectedData, validationErrors) {
        // Build the CONTEXT section - what we already know
        let contextSection = '==== CONTEXT (Already Provided) ====\n';
        contextSection += '**Quest Information:**\n';
        contextSection += `Name: ${collectedData.NAME}\n`;
        contextSection += `Giver: ${collectedData.QUEST_GIVER}\n`;
        contextSection += `Type: ${questType}\n`;
        contextSection += `Stages: ${stageCount}\n`;
        
        // Add collected fields to context
        if (collectedData.DESCRIPTION) {
            contextSection += `\nDescription: ${collectedData.DESCRIPTION}\n`;
        }
        
        // Show completed stages in context if any
        const completedStages = Object.keys(existingStages);
        if (completedStages.length > 0) {
            contextSection += '\n**Completed Stages:**\n';
            for (let i = 1; i <= stageCount; i++) {
                if (existingStages[i]) {
                    contextSection += `Stage ${i}: ${existingStages[i]}\n`;
                }
            }
        }
        
        // Show rewards in context if collected
        if (collectedData.REWARDS_PARSED) {
            const rewards = collectedData.REWARDS_PARSED;
            contextSection += '\n**Rewards:**\n';
            contextSection += `Experience: ${rewards.xp} XP\n`;
            contextSection += `Col: ${rewards.col}\n`;
            if (rewards.items) {
                contextSection += `Items: ${rewards.items}\n`;
            }
        }
        
        // Build the QUERY section - what we still need (ALWAYS at bottom)
        let querySection = '**Please provide the following information:**\n\n';
        let queryItems = [];
        
        // Collect all uncompleted items
        for (const field of fields) {
            if (!collectedData.hasOwnProperty(field.name)) {
                const fieldPrompt = field.prompt || field.name.replace(/_/g, ' ').toLowerCase();
                
                // Check if there's a validation error for this field
                const validationError = validationErrors && validationErrors[field.name];
                
                let typeHint = '';
                switch(field.type) {
                    case FieldTypes.CHOICE:
                        typeHint = field.params ? ` (${field.params.replace(/\|/g, '/')})` : '';
                        break;
                    case FieldTypes.RANGE:
                        if (field.params) {
                            const [min, max] = field.params.split('-');
                            typeHint = ` (${min}-${max})`;
                        }
                        break;
                    case FieldTypes.NUMBER:
                        typeHint = ' (number)';
                        break;
                    case FieldTypes.BOOLEAN:
                        typeHint = ' (yes/no)';
                        break;
                    case FieldTypes.LIST:
                        typeHint = ' (comma-separated)';
                        break;
                }
                
                let fieldText = `${field.name}: [${fieldPrompt}${typeHint}]`;
                if (validationError) {
                    fieldText += `\n  ⚠️ ${validationError}`;
                }
                
                queryItems.push({
                    type: 'field',
                    text: fieldText
                });
            }
        }
        
        // Check if we need stages
        const allStagesCollected = Object.keys(existingStages).length === stageCount;
        if (!allStagesCollected) {
            for (let i = 1; i <= stageCount; i++) {
                if (!existingStages[i]) {
                    queryItems.push({
                        type: 'stage',
                        text: `Stage ${i}: [objective]`
                    });
                }
            }
        }
        
        // Check if we need rewards
        if (!collectedData.REWARDS_PARSED) {
            queryItems.push({
                type: 'rewards',
                text: 'Experience: [XP amount]\nCol: [currency amount]\nItems: [item rewards or "None"]'
            });
        }
        
        // Build query section with proper grouping
        let lastType = null;
        for (const item of queryItems) {
            // Add spacing between different types
            if (lastType && lastType !== item.type) {
                querySection += '\n';
            }
            querySection += item.text + '\n';
            lastType = item.type;
        }
        
        // Use the template from config card
        return generatePrompt('Quest Combined', {
            CONTEXT_SECTION: contextSection,
            QUERY_SECTION: querySection
        });
    }
    
    // ==========================
    // Batched Field Collection
    // ==========================
    
    function parseBatchedResponse(response, fields) {
        const collected = {};
        const lines = response.split('\n');
        
        if (debug) {
            console.log(`${MODULE_NAME}: parseBatchedResponse called with ${lines.length} lines`);
            console.log(`${MODULE_NAME}: Raw response: "${response}"`);
            console.log(`${MODULE_NAME}: Fields to parse: ${fields.map(f => f.name).join(', ')}`);
        }
        
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            
            if (debug && line.trim()) {
                console.log(`${MODULE_NAME}: Line ${lineIndex}: "${line}"`);
                console.log(`${MODULE_NAME}: Line length: ${line.length}, trimmed length: ${line.trim().length}`);
            }
            
            // Trim the line before matching to handle leading/trailing spaces
            const trimmedLine = line.trim();
            
            for (const field of fields) {
                // Look for "FIELD_NAME: value" pattern
                const regex = new RegExp(`^${field.name}:\\s*(.+)`, 'i');
                
                if (debug) {
                    console.log(`${MODULE_NAME}: Testing regex /${regex.source}/${regex.flags} against trimmed line`);
                }
                
                const match = trimmedLine.match(regex);
                
                if (match) {
                    collected[field.name] = match[1].trim();
                    if (debug) {
                        console.log(`${MODULE_NAME}: MATCHED ${field.name} = "${match[1].trim()}"`);
                    }
                    break;
                } else if (debug && field.name === 'DESCRIPTION') {
                    // Extra debugging for DESCRIPTION specifically
                    console.log(`${MODULE_NAME}: DESCRIPTION regex failed. Trimmed line starts with: "${trimmedLine.substring(0, 20)}"`);
                    console.log(`${MODULE_NAME}: Original line had leading space: ${line[0] === ' '}`);
                }
            }
        }
        
        if (debug) {
            console.log(`${MODULE_NAME}: Collected fields: ${JSON.stringify(collected)}`);
        }
        
        return collected;
    }
    
    // ==========================
    // Field Validation
    // ==========================
    
    function validateField(field, value) {
        if (!value || value.trim() === '') {
            return { valid: false, error: 'Empty response' };
        }
        
        const trimmedValue = value.trim();
        
        // Special handling for specific fields
        if (field.name === 'NAME') {
            // Check for duplicate usernames in existing characters
            const existingCharacters = Utilities.storyCard.find((card) => {
                return card.type === 'character' || 
                       (card.title && card.title.startsWith('[CHARACTER]'));
            }, true); // true = return all matches
            
            for (const character of existingCharacters) {
                // Extract username from character header (## **Username**)
                const headerMatch = character.entry.match(/^##\s+\*\*([^*]+)\*\*/);
                if (headerMatch && headerMatch[1].toLowerCase() === trimmedValue.toLowerCase()) {
                    return { 
                        valid: false, 
                        error: `Username "${trimmedValue}" already exists. Please provide a different username.` 
                    };
                }
            }
        }
        
        if (field.name === 'GENDER') {
            const normalized = trimmedValue.toLowerCase();
            // Accept various gender formats
            if (normalized === 'm' || normalized === 'male' || normalized === 'man' || normalized === 'boy') {
                return { valid: true, value: 'Male' };
            }
            if (normalized === 'f' || normalized === 'female' || normalized === 'woman' || normalized === 'girl') {
                return { valid: true, value: 'Female' };
            }
            if (normalized === 'other' || normalized === 'non-binary' || normalized === 'nb') {
                return { valid: true, value: 'Other' };
            }
            return { valid: false, error: 'Must be Male, Female, or Other' };
        }
        
        if (field.name === 'DOB') {
            // Accept various date formats and normalize to YYYY-MM-DD
            // Try to parse common formats
            const datePatterns = [
                /^(\d{4})-(\d{1,2})-(\d{1,2})$/,  // YYYY-MM-DD
                /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,  // MM/DD/YYYY
                /^(\w+)\s+(\d{1,2}),?\s+(\d{4})$/,  // Month DD, YYYY
                /^(\d{1,2})\s+(\w+)\s+(\d{4})$/,  // DD Month YYYY
            ];
            
            for (const pattern of datePatterns) {
                if (pattern.test(trimmedValue)) {
                    // For now, just accept the value as-is if it matches a pattern
                    // Could add more sophisticated date parsing if needed
                    return { valid: true, value: trimmedValue };
                }
            }
            
            // If no pattern matches, still accept it if it contains numbers
            if (/\d/.test(trimmedValue)) {
                return { valid: true, value: trimmedValue };
            }
            return { valid: false, error: 'Invalid date format' };
        }
        
        switch(field.type) {
            case FieldTypes.CHOICE:
                if (field.params) {
                    const options = field.params.split('|').map(o => o.trim().toLowerCase());
                    const normalized = trimmedValue.toLowerCase();
                    
                    if (options.includes(normalized)) {
                        // Return the properly cased version
                        const index = options.indexOf(normalized);
                        const properCase = field.params.split('|')[index].trim();
                        return { valid: true, value: properCase };
                    }
                    return { valid: false, error: 'Not a valid option' };
                }
                break;
                
            case FieldTypes.RANGE:
                if (field.params) {
                    const [min, max] = field.params.split('-').map(n => parseInt(n.trim()));
                    const num = parseInt(trimmedValue);
                    
                    if (isNaN(num)) {
                        return { valid: false, error: 'Not a number' };
                    }
                    if (num < min || num > max) {
                        return { valid: false, error: `Out of range ${min}-${max}` };
                    }
                    return { valid: true, value: num };
                }
                break;
                
            case FieldTypes.NUMBER:
                const num = parseFloat(trimmedValue);
                if (isNaN(num)) {
                    return { valid: false, error: 'Not a number' };
                }
                return { valid: true, value: num };
                
            case FieldTypes.BOOLEAN:
                const lower = trimmedValue.toLowerCase();
                if (lower === 'true' || lower === 'yes') {
                    return { valid: true, value: true };
                }
                if (lower === 'false' || lower === 'no') {
                    return { valid: true, value: false };
                }
                return { valid: false, error: 'Must be yes or no' };
                
            case FieldTypes.LIST:
                const items = trimmedValue.split(',')
                    .map(item => item.trim())
                    .filter(item => item.length > 0);
                
                if (items.length === 0) {
                    return { valid: false, error: 'Empty list' };
                }
                return { valid: true, value: items.join(', ') };
                
            case FieldTypes.TEXT:
            default:
                return { valid: true, value: trimmedValue };
        }
        
        return { valid: true, value: trimmedValue };
    }
    
    // ==========================
    // Quest Stage Collection
    // ==========================
    
    function parseStageResponse(response, stageCount, existingStages = {}) {
        const stages = { ...existingStages };
        const lines = response.split('\n');
        
        for (const line of lines) {
            const match = line.match(/Stage\s+(\d+):\s*(.+)/i);
            if (match) {
                const stageNum = parseInt(match[1]);
                const objective = match[2].trim();
                
                if (stageNum >= 1 && stageNum <= stageCount && !stages[stageNum]) {
                    stages[stageNum] = objective;
                }
            }
        }
        
        return stages;
    }
    
    function validateStages(stages, stageCount) {
        // Check which stages are missing or too short
        const missingStages = [];
        
        for (let i = 1; i <= stageCount; i++) {
            if (!stages[i] || stages[i].split(' ').length < 2) {  // Changed to 2 words minimum
                missingStages.push(i);
                // Remove this stage and all subsequent ones
                for (let j = i; j <= stageCount; j++) {
                    delete stages[j];
                }
                break;
            }
        }
        
        return missingStages.length === 0;
    }
    
    function formatStagesForCard(stages, stageCount) {
        let formatted = '';
        for (let i = 1; i <= stageCount; i++) {
            if (stages[i]) {
                formatted += `${i}. ${stages[i]}\n`;
            }
        }
        return formatted.trim();
    }
    
    // ==========================
    // Quest Rewards Collection
    // ==========================
    
    function parseRewardsResponse(response) {
        const rewards = {
            xp: null,
            col: null,
            items: null
        };
        
        const lines = response.split('\n');
        
        for (const line of lines) {
            // Match Experience/XP
            let match = line.match(/(?:Experience|XP):\s*(\d+)/i);
            if (match) {
                rewards.xp = parseInt(match[1]);
                continue;
            }
            
            // Match Col/Currency
            match = line.match(/(?:Col|Currency):\s*(\d+)/i);
            if (match) {
                rewards.col = parseInt(match[1]);
                continue;
            }
            
            // Match Items
            match = line.match(/Items?:\s*(.+)/i);
            if (match) {
                const itemText = match[1].trim();
                if (itemText.toLowerCase() !== 'none' && itemText.length > 0) {
                    rewards.items = itemText;
                }
            }
        }
        
        return rewards;
    }
    
    function formatRewardsForCard(rewards) {
        let formatted = '';
        
        if (rewards.xp) {
            formatted += `- Experience: ${rewards.xp} XP\n`;
        }
        if (rewards.col) {
            formatted += `- Col: ${rewards.col}\n`;
        }
        if (rewards.items) {
            formatted += `- Items: ${rewards.items}`;
        }
        
        return formatted.trim();
    }
    
    // ==========================
    // Main Processing
    // ==========================
    
    function processGeneration(hook, text) {
        const progress = loadProgress();
        if (!progress) return { active: false };
        
        switch(hook) {
            case 'context':
                // First check if all fields are already collected but not marked complete
                if (!progress.completed && progress.templateFields) {
                    const activeFields = progress.templateFields.filter(field => 
                        !progress.collectedData.hasOwnProperty(field.name)
                    );
                    if (activeFields.length === 0) {
                        // All fields collected - mark as complete
                        progress.completed = true;
                        saveProgress(progress);
                        if (debug) console.log(`${MODULE_NAME}: Context: All fields collected - marked as complete`);
                    }
                }
                
                if (progress.completed) {
                    return { active: true, text: text };
                }
                
                // For quests, NPCs, and Locations, use batched collection
                if (progress.entityType === 'Quest' || progress.entityType === 'NPC' || progress.entityType === 'Location') {
                    // Get fields that need to be collected
                    const activeFields = progress.templateFields.filter(field => 
                        !progress.collectedData.hasOwnProperty(field.name)
                    );
                    
                    // If no more fields to collect, mark as completed
                    if (activeFields.length === 0) {
                        progress.completed = true;
                        saveProgress(progress);
                        return { active: true, text: text };
                    }
                    
                    let batchPrompt;
                    if (progress.entityType === 'NPC') {
                        // Build field list for NPC with descriptions
                        let fieldList = '';
                        for (const field of activeFields) {
                            // Include the field name and its prompt/description
                            if (field.prompt) {
                                fieldList += `${field.name}: [${field.prompt}]\n`;
                            } else {
                                // Fallback to just field name if no prompt
                                fieldList += `${field.name}:\n`;
                            }
                        }
                        
                        // Build context of already collected data
                        let context = '';
                        if (Object.keys(progress.collectedData).length > 0) {
                            context = '==== CONTEXT (Already Provided) ====\n';
                            for (const [key, value] of Object.entries(progress.collectedData)) {
                                context += `${key}: ${value}\n`;
                            }
                            context += '\n';
                        }
                        
                        batchPrompt = generatePrompt('NPC Batch', {
                            NAME: progress.triggerName || progress.collectedData.NAME || 'Unknown',
                            FIELD_LIST: fieldList.trim(),
                            CONTEXT: context
                        });
                        
                        progress.expectingBatch = true;
                    } else if (progress.entityType === 'Quest') {
                        // Quest logic - ensure stageCollection is initialized
                        if (!progress.stageCollection) {
                            progress.stageCollection = {
                                stageCount: progress.collectedData?.STAGE_COUNT || 3,
                                stages: {}
                            };
                        }
                        batchPrompt = generateQuestBatchPrompt(
                            activeFields,
                            progress.stageCollection.stageCount,
                            progress.stageCollection.stages,
                            progress.collectedData.QUEST_TYPE,
                            progress.collectedData,
                            progress.validationErrors
                        );
                        progress.expectingQuestBatch = true;
                    } else {
                        // Other entity types (like Location) - just use field list
                        let fieldList = '';
                        for (const field of activeFields) {
                            let fieldDescription = field.prompt || field.type;
                            
                            // If it's a choice field, show the options
                            if (field.type === 'choice' && field.params) {
                                fieldDescription = `(${field.params})`;
                            }
                            
                            fieldList += `${field.name}: ${fieldDescription}\n`;
                        }
                        
                        batchPrompt = generatePrompt('Field Collection', {
                            ENTITY_TYPE: progress.entityType,
                            FIELD_LIST: fieldList
                        });
                        progress.expectingBatch = true;
                    }
                    
                    // Store which fields we're asking about
                    progress.currentBatch = activeFields.map(f => f.name);
                    saveProgress(progress);
                    
                    return {
                        active: true,
                        text: text + batchPrompt
                    };
                }
                
                // Entity classification logic
                if (progress.entityType === 'EntityClassification') {
                    const classificationPrompt = generateEntityClassificationPrompt(progress);
                    return {
                        active: true,
                        text: text + classificationPrompt
                    };
                }
                
                // Handle 'Entity' type - needs to select what kind of entity to create
                if (progress.entityType === 'Entity' && !progress.branchResolved) {
                    const entitySelectionPrompt = generatePrompt('Entity Selection', {});
                    return {
                        active: true,
                        text: text + entitySelectionPrompt
                    };
                }
                
                // Non-quest entities - generate prompts for missing fields
                const activeFields = getActiveFields(progress.templateFields, progress.collectedData);
                
                if (activeFields.length > 0) {
                    // Build field list for the prompt template
                    let fieldList = '';
                    for (const field of activeFields) {
                        fieldList += `**${field.name}**: ${field.description || `Please provide the ${field.name.toLowerCase().replace(/_/g, ' ')} for this ${progress.entityType}`}\n`;
                    }
                    
                    // Use the Field Collection template
                    const prompt = generatePrompt('Field Collection', {
                        ENTITY_TYPE: progress.entityType,
                        FIELD_LIST: fieldList.trim()
                    });
                    
                    if (debug) console.log(`${MODULE_NAME}: Adding prompt for ${activeFields.length} fields`);
                    return { active: true, text: text + '\n\n' + prompt };
                }
                
                // All fields collected, mark as completed
                progress.completed = true;
                saveProgress(progress);
                return { active: true, text: text };
                
            case 'output':
                // Check if already completed
                if (progress.completed) {
                    clearProgress();
                    return { active: false };
                }
                
                // Handle batch response for Quest, NPC, or Location
                if ((progress.entityType === 'Quest' && progress.expectingQuestBatch) || 
                    (progress.entityType === 'NPC' && progress.expectingBatch) ||
                    (progress.entityType === 'Location' && progress.expectingBatch)) {
                    let allFieldsCollected = true;
                    
                    if (debug) {
                        console.log(`${MODULE_NAME}: Processing Quest batch response`);
                        console.log(`${MODULE_NAME}: Output text: "${text}"`);
                        console.log(`${MODULE_NAME}: currentBatch: ${JSON.stringify(progress.currentBatch)}`);
                    }
                    
                    // Parse regular fields - use ALL template fields, not just currentBatch
                    const responses = parseBatchedResponse(text, progress.templateFields);
                    
                    if (debug) {
                        console.log(`${MODULE_NAME}: Parsed responses: ${JSON.stringify(responses)}`);
                    }
                    
                    // Process each field
                    for (const field of progress.templateFields) {
                        if (!progress.collectedData.hasOwnProperty(field.name)) {
                            const response = responses[field.name];
                            if (response) {
                                const validation = validateField(field, response);
                                if (validation.valid) {
                                    progress.collectedData[field.name] = validation.value;
                                    // Clear any previous validation errors for this field
                                    if (progress.validationErrors && progress.validationErrors[field.name]) {
                                        delete progress.validationErrors[field.name];
                                    }
                                    if (debug) console.log(`${MODULE_NAME}: Collected ${field.name}: ${validation.value}`);
                                } else {
                                    if (debug) console.log(`${MODULE_NAME}: Validation failed for ${field.name}: ${validation.error}`);
                                    // Store validation error for display in next prompt
                                    if (!progress.validationErrors) progress.validationErrors = {};
                                    progress.validationErrors[field.name] = validation.error;
                                    if (field.requirement === 'required') {
                                        allFieldsCollected = false;
                                    }
                                }
                            } else {
                                if (debug) console.log(`${MODULE_NAME}: No response found for ${field.name}`);
                                if (field.requirement === 'required') {
                                    allFieldsCollected = false;
                                }
                            }
                        }
                    }
                    
                    // Parse stages (Quest only)
                    if (progress.entityType === 'Quest' && !progress.collectedData.STAGES) {
                        // Ensure stageCollection is initialized
                        if (!progress.stageCollection) {
                            progress.stageCollection = {
                                stageCount: progress.collectedData?.STAGE_COUNT || 3,
                                stages: {}
                            };
                        }
                        
                        const stages = parseStageResponse(
                            text,
                            progress.stageCollection.stageCount,
                            progress.stageCollection.stages
                        );
                        
                        // Validate stages
                        const allValid = validateStages(stages, progress.stageCollection.stageCount);
                        
                        progress.stageCollection.stages = stages;
                        
                        if (allValid) {
                            progress.collectedData.STAGES = formatStagesForCard(
                                stages,
                                progress.stageCollection.stageCount
                            );
                            if (debug) console.log(`${MODULE_NAME}: All ${progress.stageCollection.stageCount} stages collected`);
                        } else {
                            allFieldsCollected = false;
                            if (debug) console.log(`${MODULE_NAME}: Stage validation failed, will retry`);
                        }
                    }
                    
                    // Parse rewards (Quest only)
                    if (progress.entityType === 'Quest' && !progress.collectedData.REWARDS) {
                        const rewards = parseRewardsResponse(text);
                        
                        if (rewards.xp && rewards.col) {
                            progress.collectedData.REWARDS = formatRewardsForCard(rewards);
                            progress.collectedData.REWARDS_PARSED = rewards;
                            if (debug) console.log(`${MODULE_NAME}: Rewards collected: ${rewards.xp} XP, ${rewards.col} Col`);
                        } else {
                            allFieldsCollected = false;
                            if (debug) console.log(`${MODULE_NAME}: Rewards incomplete`);
                        }
                    }
                    
                    // Check if we have everything
                    const requiredFields = progress.templateFields.filter(f => f.requirement === 'required');
                    for (const field of requiredFields) {
                        if (!progress.collectedData.hasOwnProperty(field.name)) {
                            allFieldsCollected = false;
                            if (debug) console.log(`${MODULE_NAME}: Missing required field: ${field.name}`);
                        }
                    }
                    
                    // Check for stages and rewards specifically
                    if (!progress.collectedData.STAGES) {
                        allFieldsCollected = false;
                        if (debug) console.log(`${MODULE_NAME}: Missing STAGES`);
                    }
                    if (!progress.collectedData.REWARDS) {
                        allFieldsCollected = false;
                        if (debug) console.log(`${MODULE_NAME}: Missing REWARDS`);
                    }
                    
                    // Check if ALL fields are now collected (not just from this response)
                    const remainingFields = getActiveFields(progress.templateFields, progress.collectedData);
                    console.log(`${MODULE_NAME}: After batch processing - Remaining fields: ${remainingFields.length}`);
                    console.log(`${MODULE_NAME}: Collected so far: ${JSON.stringify(Object.keys(progress.collectedData))}`);
                    
                    if (remainingFields.length === 0) {
                        progress.completed = true;
                        progress.expectingQuestBatch = false;
                        progress.expectingBatch = false;
                        if (debug) console.log(`${MODULE_NAME}: Quest generation completed!`);
                        
                        // Create the entity card immediately
                        const template = loadTemplate(progress.entityType);
                        if (template) {
                            const finalText = processTemplate(template, progress.collectedData);
                            const dataWithTrigger = { ...progress.collectedData };
                            if (progress.triggerName) {
                                dataWithTrigger.triggerName = progress.triggerName;
                            }
                            if (progress.metadata) {
                                dataWithTrigger.metadata = progress.metadata;
                            }
                            createEntityCard(progress.entityType, finalText, dataWithTrigger);
                        }
                        
                        // Clear and return completion message
                        clearProgress();
                        return { active: true, text: config.debug ? wrapDebugOutput(text) : COMPLETION_MESSAGE };
                    }
                    
                    progress.currentBatch = null;
                    saveProgress(progress);
                    return { active: true, text: config.debug ? wrapDebugOutput(text) : HIDDEN_OUTPUT };
                }
                
                // Handle entity classification response
                if (progress.entityType === 'EntityClassification') {
                    return handleEntityClassification(progress, text, config);
                }
                
                // Handle Entity type selection response
                if (progress.entityType === 'Entity' && !progress.branchResolved) {
                    const branchTo = handleEntityBranching(text);
                    if (branchTo) {
                        if (debug) console.log(`${MODULE_NAME}: Entity branched to ${branchTo}`);
                        
                        // Load the template for the new entity type
                        const template = loadTemplate(branchTo);
                        if (!template) {
                            if (debug) console.log(`${MODULE_NAME}: No template for ${branchTo}`);
                            clearProgress();
                            return { active: true, text: 'Failed to find template for ' + branchTo };
                        }
                        
                        // Parse template fields
                        const templateFields = parseTemplateFields(template.description);
                        
                        // Update progress with the actual entity type
                        progress.entityType = branchTo;
                        progress.templateFields = templateFields;
                        progress.branchResolved = true;
                        
                        // Initialize Quest-specific fields if branching to Quest
                        if (branchTo === 'Quest') {
                            progress.stageCollection = {
                                stageCount: progress.collectedData?.STAGE_COUNT || 3,
                                stages: {}
                            };
                            progress.expectingQuestBatch = true;
                        } else if (branchTo === 'NPC' || branchTo === 'Location') {
                            progress.expectingBatch = true;
                        }
                        
                        saveProgress(progress);
                        return { active: true, text: config.debug ? wrapDebugOutput(text) : HIDDEN_OUTPUT };
                    } else {
                        if (debug) console.log(`${MODULE_NAME}: Invalid entity type in response: ${text}`);
                        // Stay in Entity state and will re-prompt on next context
                        return { active: true, text: config.debug ? wrapDebugOutput(text) : HIDDEN_OUTPUT };
                    }
                }
                
                return { active: true, text: config.debug ? wrapDebugOutput(text) : HIDDEN_OUTPUT };
        }
        
        return { active: false };
    }
    
    // ==========================
    // Field Management
    // ==========================
    function getActiveFields(templateFields, collectedData) {
        // Return all fields that aren't already collected
        if (!templateFields) return [];
        
        return templateFields.filter(field => {
            // Skip if already collected
            if (collectedData.hasOwnProperty(field.name)) {
                return false;
            }
            
            // Include all non-conditional fields
            return field.requirement === 'required' || field.requirement === 'optional';
        });
    }
    
    // ==========================
    // Entity Branching (for 'Entity' type)
    // ==========================
    function handleEntityBranching(response) {
        // Valid entity types for branching
        const validTypes = ['npc', 'monster', 'boss', 'item', 'location', 'quest'];
        const normalized = response.trim().toLowerCase();
        
        if (validTypes.includes(normalized)) {
            // Capitalize first letter for proper entity type
            const properCase = normalized.charAt(0).toUpperCase() + normalized.slice(1);
            
            // Special case: NPC should be all caps
            if (normalized === 'npc') {
                return 'NPC';
            }
            
            return properCase;
        }
        
        return null;
    }
    
    // ==========================
    // Skill Generation
    // ==========================
    function generateRandomSkills(level = 1) {
        // Parse skill sections from [RPG_SCHEMA] Skills card
        const skillsCard = Utilities.storyCard.get('[RPG_SCHEMA] Skills');
        if (!skillsCard || !skillsCard.entry) return '';
        
        const skillsBySection = {};
        let currentSection = null;
        
        const lines = skillsCard.entry.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            
            // Check for section headers
            if (trimmed.startsWith('## ')) {
                currentSection = trimmed.substring(3);
                skillsBySection[currentSection] = [];
                continue;
            }
            
            // Parse skill definitions
            if (trimmed.startsWith('* ') && currentSection) {
                const skillMatch = trimmed.match(/^\* ([a-z_]+):/);
                if (skillMatch) {
                    skillsBySection[currentSection].push(skillMatch[1]);
                }
            }
        }
        
        // Select 2 random skills (max 1 from Combat)
        const selectedSkills = [];
        const sections = Object.keys(skillsBySection);
        
        // First, decide if we're picking from Combat
        const combatSkills = skillsBySection['Combat'] || [];
        const nonCombatSections = sections.filter(s => s !== 'Combat' && s !== 'XP Categories');
        
        if (combatSkills.length > 0 && Math.random() < 0.5) {
            // Pick one combat skill
            const randomCombat = combatSkills[Math.floor(Math.random() * combatSkills.length)];
            selectedSkills.push(randomCombat);
        }
        
        // Fill remaining slots with non-combat skills
        while (selectedSkills.length < 2 && nonCombatSections.length > 0) {
            const randomSection = nonCombatSections[Math.floor(Math.random() * nonCombatSections.length)];
            const sectionSkills = skillsBySection[randomSection] || [];
            
            if (sectionSkills.length > 0) {
                const randomSkill = sectionSkills[Math.floor(Math.random() * sectionSkills.length)];
                selectedSkills.push(randomSkill);
            }
        }
        
        // Format skills with XP values (always start at Level 1)
        const formattedSkills = selectedSkills.map(skill => {
            const xpMax = 100; // Level 1 XP requirement
            const currentXp = Math.floor(Math.random() * 30); // Random progress up to 30 XP
            return `${skill}: Level 1 (${currentXp}/${xpMax} XP)`;
        });
        
        return formattedSkills.join('\n');
    }
    
    // ==========================
    // Helper Functions
    // ==========================
    function normalizeDateFormat(dateStr) {
        if (!dateStr) return '';
        
        // If already in YYYY-MM-DD format, return as is
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            return dateStr;
        }
        
        // Try to parse various date formats
        const months = {
            'january': '01', 'jan': '01',
            'february': '02', 'feb': '02',
            'march': '03', 'mar': '03',
            'april': '04', 'apr': '04',
            'may': '05',
            'june': '06', 'jun': '06',
            'july': '07', 'jul': '07',
            'august': '08', 'aug': '08',
            'september': '09', 'sep': '09', 'sept': '09',
            'october': '10', 'oct': '10',
            'november': '11', 'nov': '11',
            'december': '12', 'dec': '12'
        };
        
        // Try "Month DD, YYYY" or "Month DD YYYY"
        const match1 = dateStr.match(/^(\w+)\s+(\d{1,2}),?\s+(\d{4})$/i);
        if (match1) {
            const month = months[match1[1].toLowerCase()];
            if (month) {
                const day = match1[2].padStart(2, '0');
                return `${match1[3]}-${month}-${day}`;
            }
        }
        
        // Try "DD Month YYYY"
        const match2 = dateStr.match(/^(\d{1,2})\s+(\w+)\s+(\d{4})$/i);
        if (match2) {
            const month = months[match2[2].toLowerCase()];
            if (month) {
                const day = match2[1].padStart(2, '0');
                return `${match2[3]}-${month}-${day}`;
            }
        }
        
        // Try MM/DD/YYYY or MM-DD-YYYY
        const match3 = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (match3) {
            const month = match3[1].padStart(2, '0');
            const day = match3[2].padStart(2, '0');
            return `${match3[3]}-${month}-${day}`;
        }
        
        // Try DD/MM/YYYY (assume day first if day > 12)
        const match4 = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (match4) {
            const first = parseInt(match4[1]);
            const second = parseInt(match4[2]);
            if (first > 12 && second <= 12) {
                // First number must be day
                const month = match4[2].padStart(2, '0');
                const day = match4[1].padStart(2, '0');
                return `${match4[3]}-${month}-${day}`;
            }
        }
        
        // Return original if we can't parse it
        return dateStr;
    }
    
    // ==========================
    // Final Template Processing
    // ==========================
    function processTemplate(template, collectedData) {
        let finalText = template.entry;
        
        // Flatten nested properties for template processing
        const flatData = {...collectedData};
        
        // Handle hp object specially
        if (collectedData.hp && typeof collectedData.hp === 'object') {
            flatData['hp.current'] = collectedData.hp.current || 100;
            flatData['hp.max'] = collectedData.hp.max || 100;
            // Remove the nested object to avoid confusion
            delete flatData.hp;
        } else if (collectedData.HP || collectedData.MAX_HP) {
            // Fallback if HP/MAX_HP are provided as flat fields
            flatData['hp.current'] = collectedData.HP || collectedData.MAX_HP || 100;
            flatData['hp.max'] = collectedData.MAX_HP || collectedData.HP || 100;
        } else {
            // Default HP values for NPCs
            flatData['hp.current'] = 100;
            flatData['hp.max'] = 100;
        }
        
        // Normalize DOB to YYYY-MM-DD format
        if (flatData.DOB) {
            flatData.DOB = normalizeDateFormat(flatData.DOB);
        }
        
        // Generate random skills for NPCs if not provided
        if (!flatData.SKILLS) {
            flatData.SKILLS = generateRandomSkills(1); // Always level 1
        }
        
        // Get location from first [PLAYER] if not provided
        if (!flatData.LOCATION) {
            const players = Utilities.storyCard.find(c => c.title && c.title.startsWith('[PLAYER]'), true);
            if (players && players.length > 0) {
                const match = players[0].entry.match(/Current Location:\s*([^\n]+)/);
                if (match) {
                    flatData.LOCATION = match[1].trim();
                }
            }
            // Default if no player found
            if (!flatData.LOCATION) {
                flatData.LOCATION = 'Town_Of_Beginnings';
            }
        }
        
        // Replace all {{FIELD_NAME}} placeholders that exist in flatData
        for (const [field, value] of Object.entries(flatData)) {
            // Escape dots in field names for regex
            const escapedField = field.replace(/\./g, '\\.');
            const placeholder = new RegExp(`\\{\\{${escapedField}\\}\\}`, 'gi');
            finalText = finalText.replace(placeholder, value || '');
        }
        
        // Process formulas from the description
        const descFields = parseTemplateDescription(template.description);
        for (const field of descFields) {
            if (field.type === FieldTypes.FORMULA && field.params) {
                const placeholder = new RegExp(`\\{\\{${field.name}\\}\\}`, 'gi');
                const result = calculateFormula(field.params, collectedData);
                finalText = finalText.replace(placeholder, result);
            }
            else if (field.type === FieldTypes.GAMESTATE && field.params) {
                const placeholder = new RegExp(`\\{\\{${field.name}\\}\\}`, 'gi');
                // This will be processed by GameState's processGetters
                finalText = finalText.replace(placeholder, `get_${field.params}`);
            }
        }
        
        // Handle optional sections {{#FIELD}}...{{/FIELD}}
        const optionalPattern = /\{\{#([A-Z_]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
        finalText = finalText.replace(optionalPattern, (match, fieldName, content) => {
            if (collectedData[fieldName]) {
                return content;
            }
            return '';
        });
        
        // Clean up any remaining placeholders for optional fields
        finalText = finalText.replace(/\{\{[A-Z_]+\}\}/g, '');
        
        return finalText;
    }
    
    function parseTemplateDescription(description) {
        // Parse ALL fields including formulas and gamestate
        const fields = [];
        const lines = description.split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) continue;
            
            const match = trimmed.match(/^([A-Z_]+):\s*([^,]+),\s*([^,]+)(?:,\s*(.+))?$/);
            if (!match) continue;
            
            const field = {
                name: match[1],
                requirement: match[2].trim(),
                type: null,
                params: null
            };
            
            const typeMatch = match[3].trim().match(/^([a-z]+)(?:\[([^\]]+)\])?$/);
            if (typeMatch) {
                field.type = typeMatch[1];
                field.params = typeMatch[2] || null;
            }
            
            fields.push(field);
        }
        
        return fields;
    }
    
    function calculateFormula(formula, data) {
        try {
            let calcFormula = formula;
            
            // Replace field references
            for (const [field, value] of Object.entries(data)) {
                const pattern = new RegExp(`\\b${field}\\b`, 'gi');
                calcFormula = calcFormula.replace(pattern, value);
            }
            
            // Safely evaluate
            const result = eval(calcFormula);
            return Math.round(result);
        } catch (e) {
            if (debug) console.log(`${MODULE_NAME}: Formula error: ${e}`);
            return 0;
        }
    }
    
    function createEntityCard(entityType, finalText, collectedData) {
        // Determine card title based on entity type
        let cardTitle = '';
        let cardType = '';
        const name = collectedData.NAME || 'Unknown';
        
        // Special handling for NPCs - use GameState's character creation
        if (entityType.toUpperCase() === 'NPC') {
            // Get trigger name from collectedData if it was passed
            const triggerName = collectedData.triggerName || null;
            
            // Transform collected data to character format
            const characterData = transformToCharacterData(collectedData, triggerName);
            
            // Use GameState to create the character if available
            if (typeof GameState !== 'undefined' && GameState.createCharacter) {
                const character = GameState.createCharacter(characterData);
                if (character) {
                    if (debug) console.log(`${MODULE_NAME}: Created NPC ${name} using GameState`);
                    return; // Character was created successfully
                }
            }
            
            // Fallback to manual creation if GameState not available
            cardTitle = `[CHARACTER] ${name}`;
            cardType = 'character';
        }
        
        switch(entityType.toUpperCase()) {
            case 'NPC':
                // Already handled above
                break;
            case 'MONSTER':
                cardTitle = `[MONSTER] ${name}`;
                cardType = 'monster';
                break;
            case 'BOSS':
                cardTitle = `[BOSS] ${name}`;
                cardType = 'boss';
                break;
            case 'LOCATION':
                // Create location card using collectedData (not progress which isn't available here)
                return createLocationFromData(collectedData, collectedData.metadata);
                break;
            case 'ITEM':
                cardTitle = `[ITEM] ${name}`;
                cardType = 'item';
                break;
            case 'QUEST':
                cardTitle = `[QUEST] ${name}`;
                cardType = 'quest';
                break;
            default:
                cardTitle = `[${entityType.toUpperCase()}] ${name}`;
                cardType = entityType.toLowerCase();
        }
        
        // Create keys - username, real name, and trigger name if available
        let keysList = [name];
        if (collectedData.FULL_NAME && collectedData.FULL_NAME !== name) {
            keysList.push(collectedData.FULL_NAME);
        }
        // Ensure triggerName is a string before adding to keys
        const triggerNameStr = typeof collectedData.triggerName === 'string' 
            ? collectedData.triggerName 
            : (collectedData.triggerName?.name || null);
        if (triggerNameStr && triggerNameStr !== name) {
            keysList.push(triggerNameStr);
        }
        const keys = keysList.join(', ') + ' ';
        
        // Create the story card
        let description = `Generated by GenerationWizard on turn ${info?.actionCount || 0}`;
        if (triggerNameStr && triggerNameStr !== name) {
            description += `\nTrigger Name: ${triggerNameStr}`;
        }
        
        Utilities.storyCard.add({
            title: cardTitle,
            entry: finalText,
            type: cardType,
            keys: keys,
            description: description
        });
        
        if (debug) console.log(`${MODULE_NAME}: Created entity card: ${cardTitle} with type: ${cardType}, keys: ${keys}`);
        return cardTitle;
    }
    
    // ==========================
    // Default Template Creation
    // ==========================
    function createDefaultTemplates() {
        // NPC Template (creates [CHARACTER] cards)
        Utilities.storyCard.add({
            title: '[GW Template] NPC',
            type: 'data',
            entry: (
                `## **{{NAME}}**{{#FULL_NAME}} [{{FULL_NAME}}]{{/FULL_NAME}}\n` +
                `DOB: {{DOB}} | Gender: {{GENDER}} | HP: {{hp.current}}/{{hp.max}} | Level {{LEVEL}} (0/{{XP_MAX}} XP) | Current Location: {{LOCATION}}\n` +
                `### Appearance\n` +
                `Hair: {{HAIR}} | Eyes: {{EYES}} | Build: {{BUILD}}\n` +
                `### Personality\n` +
                `{{PERSONALITY}}\n` +
                `### Background\n` +
                `{{BACKGROUND}}\n` +
                `### Attributes\n` +
                `VITALITY: {{VITALITY}} | STRENGTH: {{STRENGTH}} | DEXTERITY: {{DEXTERITY}} | AGILITY: {{AGILITY}}\n` +
                `### Skills\n` +
                `{{SKILLS}}\n` +
                `### Inventory\n` +
                `{}\n` +
                `### Relationships\n`
            ),
            description: (
                `// NPC Generation\n` +
                `NAME: required, text, Username/Gamertag (e.g., xXShadowKillerXx, DragonSlayer42, CrimsonBlade)\n` +
                `FULL_NAME: optional, text, Real name (if known)\n` +
                `GENDER: required, text, Gender (Male/Female/Other)\n` +
                `DOB: required, text, Birth date\n` +
                `HAIR: required, text, Hair color and style\n` +
                `EYES: required, text, Eye color\n` +
                `BUILD: required, text, Body build/physique\n` +
                `PERSONALITY: required, text, Core traits and behavior patterns\n` +
                `BACKGROUND: required, text, Their history and who they are\n` +
                `// Auto-calculated fields (Level 1)\n` +
                `LEVEL: formula, formula[1], Character level\n` +
                `HP: formula, formula[100], Current health\n` +
                `MAX_HP: formula, formula[100], Maximum health\n` +
                `XP_MAX: formula, formula[400], Experience required for Level 2\n` +
                `VITALITY: formula, formula[8+Math.floor(Math.random()*6)], Vitality\n` +
                `STRENGTH: formula, formula[8+Math.floor(Math.random()*6)], Strength\n` +
                `DEXTERITY: formula, formula[8+Math.floor(Math.random()*6)], Dexterity\n` +
                `AGILITY: formula, formula[8+Math.floor(Math.random()*6)], Agility`
            ),
        });
        
        // Location Template
        Utilities.storyCard.add({
            title: '[GW Template] Location',
            type: 'data',
            entry: (
                `<$# Locations>\n` +
                `## **{{NAME}}**\n` +
                `Type: {{LOCATION_TYPE}} | Terrain: {{TERRAIN}}\n` +
                `### Description\n` +
                `{{DESCRIPTION}}\n` +
                `### Pathways\n` +
                `{{PATHWAYS}}`
            ),
            description: (
                `// Location Generation\n` +
                `NAME: required, text, Location name (e.g., Dark_Forest, Mountain_Pass)\n` +
                `LOCATION_TYPE: required, choice[Settlement|Safezone|Wilderness|Dungeon|Landmark|Ruins], Primary location type\n` +
                `TERRAIN: required, text, Terrain type (e.g., Plains, Forest, Cobblestone Plaza, etc.)\n` +
                `ATMOSPHERE: required, text, 2-3 words for inherent mood/vibe (e.g., "dark and ominous", "bustling and lively" - NOT current events/scene)\n` +
                `DESCRIPTION: required, text, 2-3 sentences about the location's permanent characteristics (NOT current scene/events/people present)`
            )
        });
        
        // Quest Template
        Utilities.storyCard.add({
            title: '[GW Template] Quest',
            type: 'data',
            entry: (
                `<\$# Quests><\$## Active Quests>\n` +
                `## **{{NAME}}**\n` +
                `Type: {{QUEST_TYPE}} | Giver: {{QUEST_GIVER}} | Current Stage: 0\n` +
                `### Description\n` +
                `{{DESCRIPTION}}\n` +
                `### Stages\n` +
                `{{STAGES}}\n` +
                `### Rewards\n` +
                `{{REWARDS}}`
            ),
            description: (
                `// Quest Generation\n` +
                `NAME: predefined, text, Quest name from accept_quest\n` +
                `QUEST_TYPE: predefined, text, Quest type from accept_quest\n` +
                `QUEST_GIVER: predefined, text, Quest giver from accept_quest\n` +
                `STAGE_COUNT: predefined, number, Number of stages from accept_quest\n` +
                `DESCRIPTION: required, text, Quest story and context\n` +
                `STAGES: batched, text, Quest objectives (collected separately)\n` +
                `REWARDS: batched, text, Quest rewards (XP, Col, Items - collected together)`
            )
        });
        
        // Add other templates as needed...
        
        if (debug) console.log(`${MODULE_NAME}: Created default templates`);
    }
    
    // ==========================
    // Entity Classification Functions
    // ==========================
    
    function generateEntityClassificationPrompt(progress) {
        // Load entity tracker templates
        const templatesCard = Utilities.storyCard.get('[RPG_RUNTIME] Entity Templates');
        if (!templatesCard) {
            return ''; // No templates configured
        }
        
        // Get the appropriate query based on stage
        const templates = parseEntityTemplates(templatesCard.entry);
        const prompts = loadPrompts();
        
        if (progress.stage === 'classification') {
            // First stage - classify the entity
            const query = templates.CLASSIFICATION_QUERY || 
                `Classify the entity "${progress.entityName}" that was just referenced:\n` +
                `ENTITY_TYPE: [CHARACTER/MONSTER/BOSS/GROUP]\n` +
                `FULL_NAME: [Complete name if different from "${progress.entityName}"]\n` +
                `GENDER: [Male/Female/Other/Unknown]\n` +
                `DESCRIPTION: [2-3 sentences about who/what this is]`;
            
            const prompt = prompts['Entity Classification'] || '';
            return prompt.replace('{{CLASSIFICATION_QUERY}}', query.replace('{name}', progress.entityName));
        } else if (progress.stage === 'details') {
            // Second stage - get type-specific details
            const entityType = progress.collectedData.ENTITY_TYPE;
            const queryKey = `${entityType}_QUERY`;
            const query = templates[queryKey] || '';
            
            const prompt = prompts['Entity Details'] || '';
            return prompt.replace('{{DETAILS_QUERY}}', query.replace('{name}', progress.entityName));
        } else if (progress.stage === 'player_specifics') {
            // Third stage - for NPC_PLAYER only
            const query = templates.PLAYER_SPECIFICS_QUERY || '';
            const prompt = prompts['Entity Details'] || '';
            return prompt.replace('{{DETAILS_QUERY}}', query.replace('{name}', progress.entityName));
        }
        
        return '';
    }
    
    function parseEntityTemplates(text) {
        const templates = {};
        const sections = text.split(/^#\s+/m).filter(s => s.trim());
        
        for (const section of sections) {
            const lines = section.split('\n');
            const key = lines[0].trim().replace(/\s+/g, '_').toUpperCase();
            const content = lines.slice(1).join('\n').trim();
            templates[key] = content;
        }
        
        return templates;
    }
    
    function handleEntityClassification(progress, text, config) {
        const debug = config.debug;
        
        if (progress.stage === 'classification') {
            // Parse classification response
            const parsed = parseEntityClassificationResponse(text);
            
            if (parsed.ENTITY_TYPE) {
                progress.collectedData = parsed;
                progress.stage = 'details';
                saveProgress(progress);
                
                if (debug) console.log(`${MODULE_NAME}: Entity classified as ${parsed.ENTITY_TYPE}`);
                return { active: true, text: config.debug ? wrapDebugOutput(text) : HIDDEN_OUTPUT };
            } else {
                if (debug) console.log(`${MODULE_NAME}: Failed to parse entity classification`);
                return { active: true, text: config.debug ? wrapDebugOutput(text) : HIDDEN_OUTPUT };
            }
        } else if (progress.stage === 'details') {
            // Parse type-specific details
            const entityType = progress.collectedData.ENTITY_TYPE;
            const parsed = parseEntityDetailsResponse(text, entityType);
            
            // Merge with existing data
            Object.assign(progress.collectedData, parsed);
            
            // Check if we need player specifics (for NPC_PLAYER)
            if (entityType === 'CHARACTER' && parsed.TYPE === 'NPC_PLAYER') {
                progress.stage = 'player_specifics';
                saveProgress(progress);
                
                if (debug) console.log(`${MODULE_NAME}: Character is NPC_PLAYER, getting additional details`);
                return { active: true, text: config.debug ? wrapDebugOutput(text) : HIDDEN_OUTPUT };
            } else {
                // We have everything, create the entity
                progress.completed = true;
                saveProgress(progress);
                
                // Create the character using GameState
                if (typeof GameState !== 'undefined' && GameState.createCharacter) {
                    const characterData = transformEntityToCharacter(progress.collectedData, progress.entityName);
                    GameState.createCharacter(characterData);
                    
                    // Signal completion to GameState
                    if (GameState.completeEntityGeneration) {
                        GameState.completeEntityGeneration(progress.entityName);
                    }
                }
                
                if (debug) console.log(`${MODULE_NAME}: Entity generation completed for ${progress.entityName}`);
                return { active: true, text: config.debug ? wrapDebugOutput(text) : COMPLETION_MESSAGE };
            }
        } else if (progress.stage === 'player_specifics') {
            // Parse player-specific details
            const parsed = parsePlayerSpecificsResponse(text);
            
            // Merge with existing data
            Object.assign(progress.collectedData, parsed);
            
            // Create the entity
            progress.completed = true;
            saveProgress(progress);
            
            // Create the character using GameState
            if (typeof GameState !== 'undefined' && GameState.createCharacter) {
                const characterData = transformEntityToCharacter(progress.collectedData);
                GameState.createCharacter(characterData);
                
                // Signal completion to GameState
                if (GameState.completeEntityGeneration) {
                    GameState.completeEntityGeneration(progress.entityName);
                }
            }
            
            if (debug) console.log(`${MODULE_NAME}: Player character generation completed for ${progress.entityName}`);
            return { active: true, text: config.debug ? wrapDebugOutput(text) : COMPLETION_MESSAGE };
        }
        
        return { active: true, text: config.debug ? wrapDebugOutput(text) : HIDDEN_OUTPUT };
    }
    
    function parseEntityClassificationResponse(text) {
        const result = {};
        
        // Parse each expected field
        const typeMatch = text.match(/ENTITY_TYPE:\s*([A-Z_]+)/i);
        if (typeMatch) result.ENTITY_TYPE = typeMatch[1].toUpperCase();
        
        const nameMatch = text.match(/FULL_NAME:\s*([^\n]+)/i);
        if (nameMatch) result.FULL_NAME = nameMatch[1].trim();
        
        const genderMatch = text.match(/GENDER:\s*([^\n]+)/i);
        if (genderMatch) result.GENDER = genderMatch[1].trim();
        
        const descMatch = text.match(/DESCRIPTION:\s*([^\n]+(?:\n[^\n]+)?)/i);
        if (descMatch) result.DESCRIPTION = descMatch[1].trim();
        
        return result;
    }
    
    function parseEntityDetailsResponse(text, entityType) {
        const result = {};
        
        // Common fields
        const levelMatch = text.match(/LEVEL:\s*(\d+)/i);
        if (levelMatch) result.LEVEL = parseInt(levelMatch[1]);
        
        const locationMatch = text.match(/LOCATION:\s*([^\n]+)/i);
        if (locationMatch) result.LOCATION = locationMatch[1].trim();
        
        const appearanceMatch = text.match(/APPEARANCE:\s*([^\n]+(?:\n[^\n]+)?)/i);
        if (appearanceMatch) result.APPEARANCE = appearanceMatch[1].trim();
        
        // Type-specific parsing
        if (entityType === 'CHARACTER') {
            const typeMatch = text.match(/TYPE:\s*(NPC|NPC_PLAYER)/i);
            if (typeMatch) result.TYPE = typeMatch[1].toUpperCase();
            
            const personalityMatch = text.match(/PERSONALITY:\s*([^\n]+(?:\n[^\n]+)?)/i);
            if (personalityMatch) result.PERSONALITY = personalityMatch[1].trim();
            
            const backgroundMatch = text.match(/BACKGROUND:\s*([^\n]+(?:\n[^\n]+)?)/i);
            if (backgroundMatch) result.BACKGROUND = backgroundMatch[1].trim();
            
            const skillsMatch = text.match(/PRIMARY_SKILLS:\s*([^\n]+)/i);
            if (skillsMatch) result.PRIMARY_SKILLS = skillsMatch[1].trim();
            
            const itemsMatch = text.match(/STARTING_ITEMS:\s*([^\n]+)/i);
            if (itemsMatch) result.STARTING_ITEMS = itemsMatch[1].trim();
            
            const relMatch = text.match(/RELATIONSHIPS:\s*([^\n]+)/i);
            if (relMatch) result.RELATIONSHIPS = relMatch[1].trim();
        } else if (entityType === 'MONSTER' || entityType === 'BOSS') {
            const abilitiesMatch = text.match(/ABILITIES:\s*([^\n]+(?:\n[^\n]+)?)/i);
            if (abilitiesMatch) result.ABILITIES = abilitiesMatch[1].trim();
            
            const lootMatch = text.match(/LOOT:\s*([^\n]+)/i);
            if (lootMatch) result.LOOT = lootMatch[1].trim();
            
            const weakMatch = text.match(/WEAKNESSES:\s*([^\n]+)/i);
            if (weakMatch) result.WEAKNESSES = weakMatch[1].trim();
            
            if (entityType === 'BOSS') {
                const phasesMatch = text.match(/PHASES:\s*(\d+)/i);
                if (phasesMatch) result.PHASES = parseInt(phasesMatch[1]);
                
                const legendaryMatch = text.match(/LEGENDARY_ACTIONS:\s*([^\n]+)/i);
                if (legendaryMatch) result.LEGENDARY_ACTIONS = legendaryMatch[1].trim();
            }
        }
        
        return result;
    }
    
    function parsePlayerSpecificsResponse(text) {
        const result = {};
        
        const dobMatch = text.match(/DOB:\s*(\d{4}-\d{2}-\d{2})/i);
        if (dobMatch) result.DOB = dobMatch[1];
        
        const classMatch = text.match(/STARTING_CLASS:\s*([^\n]+)/i);
        if (classMatch) result.STARTING_CLASS = classMatch[1].trim();
        
        const attrMatch = text.match(/ATTRIBUTE_FOCUS:\s*([^\n]+)/i);
        if (attrMatch) result.ATTRIBUTE_FOCUS = attrMatch[1].trim();
        
        const skillMatch = text.match(/SKILL_SPECIALIZATION:\s*([^\n]+)/i);
        if (skillMatch) result.SKILL_SPECIALIZATION = skillMatch[1].trim();
        
        const hooksMatch = text.match(/BACKSTORY_HOOKS:\s*([^\n]+(?:\n[^\n]+)?)/i);
        if (hooksMatch) result.BACKSTORY_HOOKS = hooksMatch[1].trim();
        
        return result;
    }
    
    function transformEntityToCharacter(entityData, entityName) {
        // Transform collected entity data into character format for GameState
        const characterData = {
            name: entityData.FULL_NAME || entityName,
            gender: entityData.GENDER || 'Unknown',
            level: entityData.LEVEL || 1,
            location: entityData.LOCATION || 'unknown',
            appearance: entityData.APPEARANCE || '',
            personality: entityData.PERSONALITY || '',
            background: entityData.BACKGROUND || ''
        };
        
        // Add DOB for player characters
        if (entityData.TYPE === 'NPC_PLAYER' && entityData.DOB) {
            characterData.dob = entityData.DOB;
            characterData.isPlayer = true;
        } else {
            characterData.isNPC = true;
        }
        
        // Parse skills
        if (entityData.PRIMARY_SKILLS) {
            characterData.skills = {};
            const skills = entityData.PRIMARY_SKILLS.split(',').map(s => s.trim());
            for (const skill of skills) {
                const skillKey = skill.toLowerCase().replace(/\s+/g, '_');
                characterData.skills[skillKey] = { level: 1 };
            }
        }
        
        // Parse items
        if (entityData.STARTING_ITEMS) {
            characterData.inventory = {};
            const items = entityData.STARTING_ITEMS.split(',').map(s => s.trim());
            for (const item of items) {
                const itemKey = item.toLowerCase().replace(/\s+/g, '_');
                characterData.inventory[itemKey] = 1;
            }
        }
        
        // Parse relationships
        if (entityData.RELATIONSHIPS) {
            characterData.relationships = {};
            // Simple parsing - could be enhanced
            const rels = entityData.RELATIONSHIPS.split(',').map(s => s.trim());
            for (const rel of rels) {
                if (rel && rel !== 'None') {
                    const relKey = rel.toLowerCase().replace(/\s+/g, '_');
                    characterData.relationships[relKey] = 50; // Default neutral
                }
            }
        }
        
        return characterData;
    }
    
    // ==========================
    // Hook Processing / API Mode
    // ==========================
    
    // Auto-initialize API methods on first call
    if (!GenerationWizard.isActive) {
        // Set up all public API methods
        GenerationWizard.isActive = isGenerationActive;
        GenerationWizard.shouldTakeControl = shouldTakeControl;
        
        GenerationWizard.startGeneration = function(entityType, initialData = {}) {
            if (isGenerationActive()) {
                if (debug) console.log(`${MODULE_NAME}: Generation already in progress`);
                return false;
            }
            
            // Special handling for 'Entity' - it's a branching path
            if (entityType === 'Entity') {
                const progress = {
                    entityType: 'Entity',
                    collectedData: {},
                    templateFields: null,
                    completed: false,
                    currentBatch: null,
                    branchResolved: false,
                    startTurn: info?.actionCount || 0
                };
                
                saveProgress(progress);
                if (debug) console.log(`${MODULE_NAME}: Started Entity branching generation`);
                return true;
            }
            
            // Load the specific template
            const template = loadTemplate(entityType);
            if (!template) {
                if (debug) console.log(`${MODULE_NAME}: No template for ${entityType}`);
                return false;
            }
            
            let templateFields = parseTemplateFields(template.description);
            
            // For quests, handle predefined fields from initialData
            if (entityType === 'Quest' && initialData) {
                // Remove predefined fields from the fields to ask
                templateFields = templateFields.filter(field => {
                    if (field.requirement === 'predefined') {
                        return false;
                    }
                    return true;
                });
            }
            
            if (templateFields.length === 0 && entityType !== 'Quest') {
                if (debug) console.log(`${MODULE_NAME}: Empty template for ${entityType}`);
                return false;
            }
            
            // Store trigger name separately if it exists
            const collectedData = { ...initialData };
            let triggerName = null;
            if (collectedData.name) {
                triggerName = collectedData.name;
                delete collectedData.name; // Remove from collected data to avoid confusion
            }
            
            // Pre-fill default values for optional fields
            for (const field of templateFields) {
                if (field.requirement === 'optional' && field.type === 'default' && field.params) {
                    if (!collectedData.hasOwnProperty(field.name)) {
                        collectedData[field.name] = field.params;
                        if (debug) console.log(`${MODULE_NAME}: Set default for ${field.name}: ${field.params}`);
                    }
                }
            }
            
            // Initialize progress - initialData already contains the predefined values
            const progress = {
                entityType: entityType,
                triggerName: triggerName, // Store the original trigger name
                collectedData: collectedData,
                templateFields: templateFields,
                completed: false,
                currentBatch: null,
                branchResolved: true,
                startTurn: info?.actionCount || 0,
                // Quest-specific fields
                stageCollection: entityType === 'Quest' ? {
                    stageCount: initialData?.STAGE_COUNT || 3,
                    stages: {}
                } : null,
                expectingQuestBatch: entityType === 'Quest'
            };
            
            saveProgress(progress);
            if (debug) console.log(`${MODULE_NAME}: Started ${entityType} generation`);
            return true;
        };
        
        GenerationWizard.cancelGeneration = function() {
            if (!isGenerationActive()) return false;
            clearProgress();
            return true;
        };
        
        GenerationWizard.process = function(hook, text) {
            if (!isGenerationActive()) return { active: false };
            return processGeneration(hook, text);
        };
        
        GenerationWizard.startQuestGeneration = function(questName, questGiver, questType, stageCount) {
            if (!questName || !questGiver || !questType || !stageCount) {
                if (debug) console.log(`${MODULE_NAME}: Invalid quest parameters - missing required fields`);
                return false;
            }
            
            // Validate stage count (minimum 2)
            stageCount = parseInt(stageCount);
            if (isNaN(stageCount) || stageCount < 2) {
                if (debug) console.log(`${MODULE_NAME}: Invalid stage count: ${stageCount} (minimum 2 required)`);
                return false;
            }
            
            // Load valid quest types from schema
            let validTypes = ['story', 'side', 'hidden', 'raid']; // Default fallback
            
            if (typeof Utilities !== 'undefined') {
                const questSchema = Utilities.storyCard.get('[RPG_SCHEMA] Quest Types');
                if (questSchema && questSchema.value) {
                    const parsed = Utilities.config.load('[RPG_SCHEMA] Quest Types');
                    validTypes = Object.keys(parsed).map(type => type.toLowerCase());
                }
            }
            
            // Validate quest type - expect lowercase
            if (!validTypes.includes(questType)) {
                if (debug) console.log(`${MODULE_NAME}: Invalid quest type: ${questType}. Valid types: ${validTypes.join(', ')}`);
                return false;
            }
            
            // Start generation with predefined values
            return GenerationWizard.startGeneration('Quest', {
                NAME: questName,
                QUEST_TYPE: questType,  // Pass through as lowercase
                QUEST_GIVER: questGiver,
                STAGE_COUNT: stageCount
            });
        };
        
        GenerationWizard.startEntityGeneration = function(entityData) {
            if (!entityData || !entityData.name) {
                if (debug) console.log(`${MODULE_NAME}: Invalid entity data - missing name`);
                return false;
            }
            
            if (isGenerationActive()) {
                if (debug) console.log(`${MODULE_NAME}: Generation already in progress`);
                return false;
            }
            
            // Start with entity classification stage
            const progress = {
                entityType: 'EntityClassification',
                entityName: entityData.name,
                stage: entityData.stage || 'classification',
                collectedData: entityData.collectedData || {},
                templateFields: null,
                completed: false,
                currentBatch: null,
                branchResolved: false,
                startTurn: info?.actionCount || 0
            };
            
            saveProgress(progress);
            if (debug) console.log(`${MODULE_NAME}: Started entity classification for ${entityData.name}`);
            return true;
        };
        
        // Generic start generation method for any entity type
        GenerationWizard.startGeneration = function(entityType, triggerName, initialData) {
            if (!entityType) {
                if (debug) console.log(`${MODULE_NAME}: Invalid entity type`);
                return false;
            }
            
            if (isGenerationActive()) {
                if (debug) console.log(`${MODULE_NAME}: Generation already in progress`);
                return false;
            }
            
            // Check if template exists
            const template = loadTemplate(entityType);
            if (!template) {
                if (debug) console.log(`${MODULE_NAME}: Template not found for ${entityType}`);
                return false;
            }
            
            // Parse template fields
            let templateFields = parseTemplateFields(template.description);
            
            // Create progress object
            const progress = {
                entityType: entityType,
                entityName: initialData?.NAME || triggerName || 'Unknown',
                triggerName: triggerName,
                stage: 'generation',
                collectedData: initialData || {},
                templateFields: templateFields,
                metadata: initialData?.metadata || {},
                completed: false,
                currentBatch: null,
                branchResolved: true,
                startTurn: info?.actionCount || 0,
                expectingBatch: entityType === 'NPC' || entityType === 'Location'
            };
            
            saveProgress(progress);
            if (debug) console.log(`${MODULE_NAME}: Started ${entityType} generation`);
            return true;
        };
    }
    
    // Handle hook-based initialization
    if (hook === 'api') {
        return GenerationWizard;
    }
    
    // Create default templates on first run
    if (!Utilities.storyCard.get('[GW Template] NPC')) {
        createDefaultTemplates();
    }
    
    // Create combined config/prompts card on first run
    if (!Utilities.storyCard.get(CONFIG_AND_PROMPTS_CARD)) {
        createDefaultConfigAndPrompts();
    }
    
    return GenerationWizard;
}

function GameState(hook, text) {
    'use strict';
    
    const debug = true;
    const MODULE_NAME = 'GameState';
    
    // Entity generation tracking 
    let currentEntityGeneration = null;
    
    // Tool pattern: standard function calls like tool_name(param1, param2, param3)
    const TOOL_PATTERN = /([a-z_]+)\s*\(([^)]*)\)/gi;
    
    // Getter pattern: get_something(parameters)
    const GETTER_PATTERN = /get_[a-z_]+\s*\([^)]*\)/gi;
    
    // ==========================
    // Location Helper Functions
    // ==========================
    function getOppositeDirection(direction) {
        const opposites = {
            'north': 'South',
            'south': 'North',
            'east': 'West',
            'west': 'East',
            'inside': 'Outside',
            'outside': 'Inside'
        };
        return opposites[direction.toLowerCase()] || direction;
    }
    
    function updateLocationPathway(locationName, direction, destinationName) {
        const card = Utilities.storyCard.get(`[LOCATION] ${locationName}`);
        if (!card) {
            if (debug) console.log(`${MODULE_NAME}: Location card not found: ${locationName}`);
            return;
        }
        
        // Parse current entry
        let entry = card.entry || '';
        
        // Find and update the pathway line
        const dirCapitalized = direction.charAt(0).toUpperCase() + direction.slice(1).toLowerCase();
        const pathwayRegex = new RegExp(`^- ${dirCapitalized}: .*$`, 'm');
        
        if (entry.match(pathwayRegex)) {
            entry = entry.replace(pathwayRegex, `- ${dirCapitalized}: ${destinationName}`);
        } else {
            // TODO: Add pathway if it doesn't exist in the expected format
            if (debug) console.log(`${MODULE_NAME}: Could not find pathway line for ${dirCapitalized}`);
        }
        
        Utilities.storyCard.update(card.title, { entry: entry });
        
        if (debug) console.log(`${MODULE_NAME}: Updated ${locationName} pathway ${direction} to ${destinationName}`);
    }
    
    // ==========================
    // Runtime Variables System
    // ==========================
    let runtimeVariablesCache = null;
    
    function loadRuntimeVariables() {
        if (runtimeVariablesCache !== null) return runtimeVariablesCache;
        
        // Use centralized config with custom parser
        runtimeVariablesCache = Utilities.config.load(
            '[RPG_RUNTIME] Variables',
            parseRuntimeVariables,
            createSampleRuntimeCards,
            false  // Don't cache in Utilities (we cache locally)
        ) || {};
        
        if (debug) console.log(`${MODULE_NAME}: Loaded ${Object.keys(runtimeVariablesCache).length} runtime variables`);
        return runtimeVariablesCache;
    }
    
    function parseRuntimeVariables(fullText) {
        const variables = {};
        const lines = fullText.split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            // Skip comments and empty lines
            if (!trimmed || trimmed.startsWith('//')) continue;
            
            const match = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.+)$/);
            if (match) {
                variables[match[1]] = match[2].trim(); // varName: type
            }
        }
        
        return variables;
    }
    
    function getRuntimeValue(varName) {
        // Ensure cache is loaded
        const variables = loadRuntimeVariables();
        
        // Check if variable is declared
        if (!variables[varName]) {
            if (debug) console.log(`${MODULE_NAME}: Runtime variable ${varName} not declared`);
            return null;
        }
        
        const dataCards = Utilities.storyCard.find(
            card => card.title && card.title.startsWith('[RPG_RUNTIME] DATA'),
            true
        );
        
        if (!dataCards || dataCards.length === 0) return null;
        
        // More flexible regex that handles multiline values
        const regex = new RegExp(`^# ${varName}\\s*\\n([^#]*?)(?=\\n# |\\n//|$)`, 'ms');
        
        for (const card of dataCards) {
            // Check both entry and description
            const fullText = (card.entry || '') + '\n' + (card.description || '');
            const match = fullText.match(regex);
            
            if (match) {
                // Filter out comment lines from the value
                const valueLines = match[1].trim().split('\n')
                    .filter(line => !line.trim().startsWith('//'))
                    .join('\n')
                    .trim();
                
                if (debug) console.log(`${MODULE_NAME}: Got runtime value ${varName} = ${valueLines}`);
                return parseRuntimeValue(valueLines, variables[varName]);
            }
        }
        
        if (debug) console.log(`${MODULE_NAME}: Runtime value ${varName} not found`);
        return null;
    }
    
    function setRuntimeValue(varName, value) {
        const variables = loadRuntimeVariables();
        
        // Fail if variable not declared
        if (!variables[varName]) {
            if (debug) console.log(`${MODULE_NAME}: Undefined runtime variable: ${varName}`);
            return false;
        }
        
        const dataCards = Utilities.storyCard.find(
            card => card.title && card.title.startsWith('[RPG_RUNTIME] DATA'),
            true
        );
        
        if (!dataCards || dataCards.length === 0) {
            if (debug) console.log(`${MODULE_NAME}: No DATA cards found`);
            return false;
        }
        
        // More robust regex that captures the entire value section
        const regex = new RegExp(`(# ${varName}\\s*\\n)([^#]*?)(?=\\n# |\\n//|$)`, 'ms');
        const newValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        
        // Try to update existing value
        for (const card of dataCards) {
            let updated = false;
            
            // Check entry first
            if (card.entry && card.entry.includes(`# ${varName}`)) {
                const newEntry = card.entry.replace(regex, `$1${newValue}\n`);
                
                if (newEntry !== card.entry) {
                    Utilities.storyCard.update(card.title, {entry: newEntry});
                    updated = true;
                    if (debug) console.log(`${MODULE_NAME}: Updated ${varName} to ${newValue} in ${card.title} entry`);
                } else {
                    if (debug) console.log(`${MODULE_NAME}: Failed to replace ${varName} in entry`);
                }
            }
            
            // Check description
            if (!updated && card.description && card.description.includes(`# ${varName}`)) {
                const newDesc = card.description.replace(regex, `$1${newValue}\n`);
                
                if (newDesc !== card.description) {
                    Utilities.storyCard.update(card.title, {description: newDesc});
                    updated = true;
                    if (debug) console.log(`${MODULE_NAME}: Updated ${varName} to ${newValue} in ${card.title} description`);
                } else {
                    if (debug) console.log(`${MODULE_NAME}: Failed to replace ${varName} in description`);
                }
            }
            
            if (updated) {
                // Clear the cache to force reload on next access
                runtimeVariablesCache = null;
                return true;
            }
        }
        
        if (debug) console.log(`${MODULE_NAME}: Runtime variable ${varName} not found in any DATA card`);
        return false;
    }
    
    function parseRuntimeValue(valueStr, type) {
        try {
            if (type === 'integer') return parseInt(valueStr);
            if (type === 'float') return parseFloat(valueStr);
            if (type === 'boolean') return valueStr === 'true';
            if (type === 'array' || type === 'object') return Utilities.parsing.parseJSON(valueStr, valueStr);
            return valueStr; // string or unknown type
        } catch(e) {
            if (debug) console.log(`${MODULE_NAME}: Error parsing runtime value: ${e}`);
            return valueStr;
        }
    }
    
    function initializeRuntimeVariables() {
        const variables = loadRuntimeVariables();
        if (Object.keys(variables).length === 0) return;
        
        // Get all DATA cards
        const dataCards = Utilities.storyCard.find(
            card => card.title && card.title.startsWith('[RPG_RUNTIME] DATA'),
            true
        ) || [];
        
        // Check which variables exist (in both entry and description)
        const existingVars = new Set();
        const regex = /^# ([a-zA-Z_][a-zA-Z0-9_]*)\s*$/gm;
        
        for (const card of dataCards) {
            const fullText = (card.entry || '') + '\n' + (card.description || '');
            const matches = [...(fullText.matchAll(regex) || [])];
            matches.forEach(m => existingVars.add(m[1]));
        }
        
        // Initialize missing variables
        const missingVars = [];
        for (const [varName, type] of Object.entries(variables)) {
            if (!existingVars.has(varName)) {
                missingVars.push({name: varName, type: type});
            }
        }
        
        if (missingVars.length === 0) return;
        
        // Find or create DATA 1 card
        let dataCard = Utilities.storyCard.get('[RPG_RUNTIME] DATA 1');
        if (!dataCard) {
            dataCard = Utilities.storyCard.add({
                title: '[RPG_RUNTIME] DATA 1',
                entry: '',
                type: 'data',
                description: '// Runtime variable storage\n// Format: # variableName\nvalue'
            });
        }
        
        // Add missing variables with default values
        let newEntries = [];
        for (const {name, type} of missingVars) {
            let defaultValue = '';
            switch(type) {
                case 'integer': defaultValue = '0'; break;
                case 'float': defaultValue = '0.0'; break;
                case 'boolean': defaultValue = 'false'; break;
                case 'array': defaultValue = '[]'; break;
                case 'object': defaultValue = '{}'; break;
                default: defaultValue = '""'; break;
            }
            newEntries.push(`# ${name}\n${defaultValue}`);
        }
        
        // Check space in entry vs description
        const currentEntryLength = dataCard.entry.length;
        const currentDescLength = dataCard.description.length;
        
        // Use entry first until ~1500 chars, then use description up to 10000
        if (currentEntryLength < 1500) {
            const updatedEntry = dataCard.entry + (dataCard.entry ? '\n\n' : '') + newEntries.join('\n\n');
            Utilities.storyCard.update('[RPG_RUNTIME] DATA 1', {entry: updatedEntry});
        } else if (currentDescLength < 10000) {
            const updatedDesc = dataCard.description + '\n\n' + newEntries.join('\n\n');
            Utilities.storyCard.update('[RPG_RUNTIME] DATA 1', {description: updatedDesc});
        } else {
            // Both entry and description are full, need DATA 2
            // TODO: Auto-create DATA 2 card and add variables there
            if (debug) console.log(`${MODULE_NAME}: DATA 1 card is full, need to implement DATA 2 creation`);
        }
        
        if (debug) console.log(`${MODULE_NAME}: Initialized ${missingVars.length} runtime variables`);
    }
    
    function loadRuntimeTools() {
        // Load all TOOLS cards (TOOLS, TOOLS 2, TOOLS 3, etc.)
        const toolsCards = [];
        
        // Check for base TOOLS card (no number)
        const baseCard = Utilities.storyCard.get('[RPG_RUNTIME] TOOLS');
        if (baseCard) toolsCards.push(baseCard);
        
        // Check for additional TOOLS cards (2 through 10)
        for (let i = 2; i <= 10; i++) {
            const numberedCard = Utilities.storyCard.get('[RPG_RUNTIME] TOOLS ' + i);
            if (numberedCard) toolsCards.push(numberedCard);
        }
        
        if (toolsCards.length === 0) {
            if (debug) console.log(`${MODULE_NAME}: No runtime tools cards found`);
            return;
        }
        
        try {
            // Combine all cards' entries and descriptions
            let fullCode = '';
            for (const card of toolsCards) {
                fullCode += (card.entry || '') + '\n' + (card.description || '') + ',\n';
            }
            
            // Remove trailing comma and wrap in object literal
            fullCode = fullCode.replace(/,\s*$/, '');
            const code = `({${fullCode}})`;
            const customTools = eval(code);
            
            // Wrap each tool in try/catch with proper context binding
            for (const [name, func] of Object.entries(customTools)) {
                if (typeof func !== 'function') continue;
                
                // Create closure to capture the functions
                (function(toolName, toolFunc) {
                    toolProcessors[toolName] = function(...args) {
                        try {
                            // Create context object with all helper functions
                            const context = {
                                getRuntimeValue: getRuntimeValue,
                                setRuntimeValue: setRuntimeValue,
                                loadAllCharacters: loadAllCharacters,
                                loadCharacter: function(name) {
                                    const chars = loadAllCharacters();
                                    return chars[name.toLowerCase()];
                                },
                                saveCharacter: saveCharacter,
                                // Field accessor methods
                                getField: function(characterName, fieldPath) {
                                    const character = this.loadCharacter(characterName);
                                    if (!character) return null;
                                    return getCharacterField(character, fieldPath);
                                },
                                setField: function(characterName, fieldPath, value) {
                                    const character = this.loadCharacter(characterName);
                                    if (!character) return false;
                                    
                                    setCharacterField(character, fieldPath, value);
                                    return this.saveCharacter(character);
                                },
                                modifyField: function(characterName, fieldPath, delta) {
                                    const current = this.getField(characterName, fieldPath);
                                    if (current === null || typeof current !== 'number') return false;
                                    
                                    return this.setField(characterName, fieldPath, current + delta);
                                },
                                getFields: function(characterName, fieldPaths) {
                                    const character = this.loadCharacter(characterName);
                                    if (!character) return {};
                                    
                                    const result = {};
                                    for (const path of fieldPaths) {
                                        result[path] = getCharacterField(character, path);
                                    }
                                    return result;
                                },
                                Utilities: Utilities,
                                Calendar: typeof Calendar !== 'undefined' ? Calendar : null,
                                debug: debug,
                                MODULE_NAME: MODULE_NAME
                            };
                            
                            if (debug) console.log(`${MODULE_NAME}: Executing runtime tool ${toolName} with args:`, args);
                            
                            // Apply the function with the context
                            const result = toolFunc.apply(context, args);
                            
                            if (debug) console.log(`${MODULE_NAME}: Runtime tool ${toolName} returned: ${result}`);
                            return result;
                        } catch(e) {
                            if (debug) console.log(`${MODULE_NAME}: Error in runtime tool ${toolName}: ${e.toString()}`);
                            if (debug && e.stack) console.log(`${MODULE_NAME}: Stack: ${e.stack}`);
                            return false;
                        }
                    };
                })(name, func);
            }
            
            if (debug) console.log(`${MODULE_NAME}: Loaded ${Object.keys(customTools).length} runtime tools`);
        } catch(e) {
            if (debug) console.log(`${MODULE_NAME}: Failed to load runtime tools: ${e}`);
        }
    }
    
    // ==========================
    // Input Commands System
    // ==========================
    const inputCommands = {};
    
    function loadInputCommands() {
        const commandsCard = Utilities.storyCard.get('[RPG_RUNTIME] INPUT_COMMANDS');
        if (!commandsCard) {
            if (debug) console.log(`${MODULE_NAME}: No input commands card found`);
            return;
        }
        
        try {
            // Combine entry and description for more space
            const fullCode = (commandsCard.entry || '') + '\n' + (commandsCard.description || '');
            
            // Check if only comments (no actual code)
            const codeWithoutComments = fullCode.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
            if (!codeWithoutComments) {
                if (debug) console.log(`${MODULE_NAME}: No commands defined (only comments)`);
                return;
            }
            
            // Wrap in object literal and eval
            const code = `({${fullCode}})`;
            let commands;
            try {
                commands = eval(code);
            } catch (e) {
                if (debug) console.log(`${MODULE_NAME}: Failed to parse commands, using empty object: ${e}`);
                commands = {};
            }
            
            // Register each command with proper context binding
            for (const [name, func] of Object.entries(commands)) {
                if (typeof func !== 'function') continue;
                
                inputCommands[name] = createCommandHandler(name, func);
            }
            
            if (debug) console.log(`${MODULE_NAME}: Loaded ${Object.keys(commands).length} input commands`);
        } catch(e) {
            if (debug) console.log(`${MODULE_NAME}: Failed to load input commands: ${e}`);
        }
        
    }
    
    function createCommandHandler(name, func, isDebugCommand = false) {
        return function(args) {
            try {
                // Create context object
                const context = {
                    getRuntimeValue: getRuntimeValue,
                    setRuntimeValue: setRuntimeValue,
                    loadAllCharacters: loadAllCharacters,
                    loadCharacter: function(name) {
                        const chars = loadAllCharacters();
                        return chars[name.toLowerCase()];
                    },
                    saveCharacter: saveCharacter,
                    createCharacter: createCharacter,
                    getField: function(characterName, fieldPath) {
                        const character = this.loadCharacter(characterName);
                        if (!character) return null;
                        return getCharacterField(character, fieldPath);
                    },
                    setField: function(characterName, fieldPath, value) {
                        const character = this.loadCharacter(characterName);
                        if (!character) return false;
                        setCharacterField(character, fieldPath, value);
                        return this.saveCharacter(character);
                    },
                    Utilities: Utilities,
                    Calendar: typeof Calendar !== 'undefined' ? Calendar : null,
                    GenerationWizard: typeof GenerationWizard !== 'undefined' ? GenerationWizard : null,
                    RewindSystem: RewindSystem,  // Add RewindSystem access
                    debug: debug,
                    // Debug-only functions
                    trackUnknownEntity: isDebugCommand ? trackUnknownEntity : undefined,
                    loadEntityTrackerConfig: isDebugCommand ? loadEntityTrackerConfig : undefined,
                    loadRuntimeVariables: isDebugCommand ? loadRuntimeVariables : undefined
                };
                
                if (debug) console.log(`${MODULE_NAME}: Executing command /${name} with args:`, args);
                const result = func.apply(context, [args]);
                return result;
            } catch(e) {
                if (debug) console.log(`${MODULE_NAME}: Error in command ${name}: ${e.toString()}`);
                return null;
            }
        };
    }
    
    // ==========================
    // Context Modifier System
    // ==========================
    let contextModifier = null;
    
    function loadContextModifier() {
        const modifierCard = Utilities.storyCard.get('[RPG_RUNTIME] CONTEXT_MODIFIER');
        if (!modifierCard) {
            if (debug) console.log(`${MODULE_NAME}: No context modifier card found`);
            return;
        }
        
        try {
            // Combine entry and description
            const fullCode = (modifierCard.entry || '') + '\n' + (modifierCard.description || '');
            
            // Skip if only comments
            const codeWithoutComments = fullCode.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
            if (!codeWithoutComments) {
                if (debug) console.log(`${MODULE_NAME}: Context modifier is empty (only comments), using pass-through`);
                contextModifier = (text) => text;
                return;
            }
            
            // Create function from code - auto-append return if not present
            const codeWithReturn = fullCode.includes('return ') ? fullCode : fullCode + '\nreturn text;';
            const funcCode = `(function(text) { ${codeWithReturn} })`;
            contextModifier = eval(funcCode);
            
            if (debug) console.log(`${MODULE_NAME}: Loaded context modifier`);
        } catch(e) {
            if (debug) console.log(`${MODULE_NAME}: Failed to load context modifier: ${e}`);
            contextModifier = null;
        }
    }
    
    // ==========================
    // Input/Output Modifiers (Pure JavaScript Sandboxes)
    // ==========================
    let inputModifier = null;
    let outputModifier = null;
    
    function loadInputModifier() {
        const modifierCard = Utilities.storyCard.get('[RPG_RUNTIME] INPUT_MODIFIER');
        if (!modifierCard) {
            if (debug) console.log(`${MODULE_NAME}: No input modifier card found`);
            return;
        }
        
        try {
            // Combine entry and description
            const fullCode = (modifierCard.entry || '') + '\n' + (modifierCard.description || '');
            
            // Skip if only comments
            const codeWithoutComments = fullCode.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
            if (!codeWithoutComments) {
                if (debug) console.log(`${MODULE_NAME}: Input modifier is empty (only comments), using pass-through`);
                inputModifier = (text) => text;
                return;
            }
            
            // Create function from code - auto-append return if not present
            const codeWithReturn = fullCode.includes('return ') ? fullCode : fullCode + '\nreturn text;';
            const funcCode = `(function(text) { ${codeWithReturn} })`;
            inputModifier = eval(funcCode);
            
            if (debug) console.log(`${MODULE_NAME}: Loaded input modifier`);
        } catch(e) {
            if (debug) console.log(`${MODULE_NAME}: Failed to load input modifier: ${e}`);
            if (debug) console.log(`${MODULE_NAME}: Input modifier code was: ${modifierCard.entry}`);
            inputModifier = null;
        }
    }
    
    function loadOutputModifier() {
        const modifierCard = Utilities.storyCard.get('[RPG_RUNTIME] OUTPUT_MODIFIER');
        if (!modifierCard) {
            if (debug) console.log(`${MODULE_NAME}: No output modifier card found`);
            return;
        }
        
        try {
            // Combine entry and description
            const fullCode = (modifierCard.entry || '') + '\n' + (modifierCard.description || '');
            
            // Skip if only comments
            const codeWithoutComments = fullCode.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
            if (!codeWithoutComments) {
                if (debug) console.log(`${MODULE_NAME}: Output modifier is empty (only comments), using pass-through`);
                outputModifier = (text) => text;
                return;
            }
            
            // Create function from code - auto-append return if not present
            const codeWithReturn = fullCode.includes('return ') ? fullCode : fullCode + '\nreturn text;';
            const funcCode = `(function(text) { ${codeWithReturn} })`;
            outputModifier = eval(funcCode);
            
            if (debug) console.log(`${MODULE_NAME}: Loaded output modifier`);
        } catch(e) {
            if (debug) console.log(`${MODULE_NAME}: Failed to load output modifier: ${e}`);
            if (debug) console.log(`${MODULE_NAME}: Output modifier code was: ${modifierCard.entry}`);
            outputModifier = null;
        }
    }
    
    // ==========================
    // Rewind System
    // ==========================
    const RewindSystem = {
        STORAGE_CARD_PREFIX: '[GS_REWIND] History',
        MAX_HISTORY: 100,  // Store all 100 entries
        MAX_REWIND: 99,    // Can rewind 99 (need 1 for verification)
        MAX_CARD_SIZE: 9000, // Max characters per card
        
        // Get all rewind cards
        getAllCards: function() {
            const cards = [];
            let cardNum = 1;
            
            while (true) {
                const cardTitle = cardNum === 1 
                    ? RewindSystem.STORAGE_CARD_PREFIX 
                    : `${RewindSystem.STORAGE_CARD_PREFIX} ${cardNum}`;
                
                const card = Utilities.storyCard.get(cardTitle);
                if (!card) break;
                
                try {
                    cards.push({
                        title: cardTitle,
                        data: JSON.parse(card.description || '{"entries":[]}')
                    });
                } catch(e) {
                    if (debug) console.log(`${MODULE_NAME}: Failed to parse card ${cardTitle}: ${e}`);
                }
                cardNum++;
            }
            
            return cards;
        },
        
        // Get merged storage from all cards
        getStorage: function() {
            const cards = RewindSystem.getAllCards();
            
            if (cards.length === 0) {
                // Create first card
                const firstTitle = RewindSystem.STORAGE_CARD_PREFIX;
                Utilities.storyCard.add({
                    title: firstTitle,
                    value: '# Rewind System Data\nTracks tool execution history for state consistency.',
                    description: JSON.stringify({
                        entries: [],
                        position: -1
                    }),
                    type: 'data'
                });
                return { entries: [], position: -1 };
            }
            
            // Merge all entries from all cards
            let allEntries = [];
            let position = -1;
            
            for (const card of cards) {
                allEntries = allEntries.concat(card.data.entries || []);
                if (card.data.position !== undefined && card.data.position > position) {
                    position = card.data.position;
                }
            }
            
            return { entries: allEntries, position: position };
        },
        
        // Save storage across multiple cards
        saveStorage: function(data) {
            // Ensure we don't exceed max history
            if (data.entries.length > RewindSystem.MAX_HISTORY) {
                data.entries = data.entries.slice(-RewindSystem.MAX_HISTORY);
            }
            
            // Clear existing cards first
            let cardNum = 1;
            while (true) {
                const cardTitle = cardNum === 1 
                    ? RewindSystem.STORAGE_CARD_PREFIX 
                    : `${RewindSystem.STORAGE_CARD_PREFIX} ${cardNum}`;
                
                const card = Utilities.storyCard.get(cardTitle);
                if (!card) break;
                
                Utilities.storyCard.remove(cardTitle);
                cardNum++;
            }
            
            // Split entries into cards
            const cards = [];
            let currentCard = { entries: [], position: data.position };
            let currentSize = 50; // Account for JSON structure overhead
            
            for (let i = 0; i < data.entries.length; i++) {
                const entry = data.entries[i];
                const entryStr = JSON.stringify(entry);
                const entrySize = entryStr.length + 2; // +2 for comma and spacing
                
                if (currentSize + entrySize > RewindSystem.MAX_CARD_SIZE && currentCard.entries.length > 0) {
                    // Save current card and start new one
                    cards.push({...currentCard});
                    currentCard = { entries: [], position: data.position };
                    currentSize = 50;
                }
                
                currentCard.entries.push(entry);
                currentSize += entrySize;
            }
            
            // Save last card if it has entries
            if (currentCard.entries.length > 0) {
                cards.push(currentCard);
            }
            
            // Create/update story cards
            for (let i = 0; i < cards.length; i++) {
                const cardTitle = i === 0 
                    ? RewindSystem.STORAGE_CARD_PREFIX 
                    : `${RewindSystem.STORAGE_CARD_PREFIX} ${i + 1}`;
                
                const cardData = cards[i];
                const existing = Utilities.storyCard.get(cardTitle);
                
                if (existing) {
                    Utilities.storyCard.update(cardTitle, {
                        description: JSON.stringify(cardData)
                    });
                } else {
                    Utilities.storyCard.add({
                        title: cardTitle,
                        value: `# Rewind System Data (Part ${i + 1})\nTracks tool execution history for state consistency.`,
                        description: JSON.stringify(cardData),
                        type: 'data'
                    });
                }
            }
            
            if (debug) console.log(`${MODULE_NAME}: Saved ${data.entries.length} entries across ${cards.length} cards`);
        },
        
        // Quick hash function for text comparison
        quickHash: function(text) {
            if (!text) return '';
            let hash = 0;
            // Hash the entire text to detect any changes
            for (let i = 0; i < text.length; i++) {
                const char = text.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32bit integer
            }
            return hash.toString(36);
        },
        
        // Store action at specific position
        recordAction: function(text, tools, position = null) {
            const data = RewindSystem.getStorage();
            const hash = RewindSystem.quickHash(text);
            
            // If no position specified, append at end
            if (position === null) {
                position = data.entries.length;
            }
            
            // If we're recording at a position that's less than the current array length,
            // and the hash is different, we're creating a new timeline branch
            if (position < data.entries.length && data.entries[position]) {
                const existingHash = data.entries[position].h;
                if (existingHash !== hash) {
                    // Different content at this position - truncate everything after it
                    data.entries = data.entries.slice(0, position);
                    if (debug) console.log(`${MODULE_NAME}: New timeline branch at position ${position}, truncated future entries`);
                }
            }
            
            // Store tools with their revert data at the specified position
            data.entries[position] = {
                h: hash,
                t: tools.map(t => [t.tool, t.params, t.revertData || {}])
            };
            
            // Update position
            data.position = position;
            
            // Maintain max history - align with AI Dungeon's behavior
            // When we exceed max, remove oldest entry (index 0)
            while (data.entries.length > RewindSystem.MAX_HISTORY) {
                data.entries.shift();
                // All positions shift down by 1
                data.position = Math.max(0, data.position - 1);
            }
            
            RewindSystem.saveStorage(data);
            if (debug) console.log(`${MODULE_NAME}: Recorded action at position ${position} with ${tools.length} tools`);
        },
        
        // Find current position by matching history
        findCurrentPosition: function() {
            const data = RewindSystem.getStorage();
            if (!history || history.length === 0) {
                if (debug) console.log(`${MODULE_NAME}: No history available`);
                return { matched: false, position: -1 };
            }
            
            if (data.entries.length === 0) {
                if (debug) console.log(`${MODULE_NAME}: No stored entries yet`);
                return { matched: false, position: -1 };
            }
            
            // The current history length tells us where we are
            // If history has 1 entry, we're at position 0
            // If history has 2 entries, we're at position 1, etc.
            const historyLength = history.length;
            const expectedPosition = historyLength - 1;
            
            // Verify this matches our stored data
            if (expectedPosition >= 0 && expectedPosition < data.entries.length) {
                // Quick verification: check if the last few entries match
                let verified = true;
                const checkCount = Math.min(3, historyLength, data.entries.length);
                
                for (let i = 0; i < checkCount; i++) {
                    const historyIndex = historyLength - 1 - i;
                    const dataIndex = expectedPosition - i;
                    
                    if (historyIndex >= 0 && dataIndex >= 0) {
                        const historyHash = RewindSystem.quickHash(history[historyIndex].text);
                        const storedHash = data.entries[dataIndex].h;
                        
                        if (historyHash !== storedHash) {
                            verified = false;
                            break;
                        }
                    }
                }
                
                if (verified) {
                    if (debug) console.log(`${MODULE_NAME}: Current position: ${expectedPosition} (history length: ${historyLength})`);
                    return { matched: true, position: expectedPosition };
                } else {
                    if (debug) console.log(`${MODULE_NAME}: Position mismatch - history doesn't match stored data`);
                }
            }
            
            return { matched: false, position: -1 };
        },
        
        // Detect if history was edited
        detectEdit: function() {
            const data = RewindSystem.getStorage();
            const position = RewindSystem.findCurrentPosition();
            
            if (!position.matched) {
                // Can't determine position - possible major edit
                return { edited: true, position: 0, confidence: 'low' };
            }
            
            // Check if all hashes match up to current position
            const currentHashes = history.map(h => RewindSystem.quickHash(h.text));
            
            for (let i = 0; i < Math.min(currentHashes.length, data.entries.length); i++) {
                if (currentHashes[i] !== data.entries[i].h) {
                    return { edited: true, position: i, confidence: 'high' };
                }
            }
            
            return { edited: false };
        },
        
        // Rehash from a certain position forward (after edit)
        rehashFrom: function(position) {
            const data = RewindSystem.getStorage();
            
            // When an edit is detected, everything after the edit point is invalid
            // We should discard those entries and start fresh from the edit point
            if (position < data.entries.length) {
                // Keep entries up to AND including the edit position
                data.entries = data.entries.slice(0, position + 1);
                
                // Update position to match current history length
                data.position = Math.min(position, history.length - 1);
                
                if (debug) console.log(`${MODULE_NAME}: Discarded entries after position ${position}, keeping ${data.entries.length} entries`);
            }
            
            // Now rehash the current history entries from the edit point forward
            for (let i = position; i < history.length; i++) {
                const newHash = RewindSystem.quickHash(history[i].text);
                
                // If this position exists in our data, update its hash
                if (i < data.entries.length) {
                    data.entries[i].h = newHash;
                }
                // Otherwise we'll add new entries as they come in during output processing
            }
            
            RewindSystem.saveStorage(data);
            if (debug) console.log(`${MODULE_NAME}: Rehashed from position ${position}`);
        },
        
        // Get tool reversions for rewinding
        getReversions: function() {
            // TODO: Implement tool-specific reversions
            return {
                'deal_damage': (params) => ['heal', params],
                'heal': (params) => ['deal_damage', params],
                'add_tag': (params) => ['remove_tag', params],
                'remove_tag': (params) => ['add_tag', params],
                'transfer_item': (params) => ['transfer_item', [params[1], params[0], params[2], params[3]]],
                'add_levelxp': (params) => ['add_levelxp', [params[0], -params[1]]],
                'add_skillxp': (params) => ['add_skillxp', [params[0], params[1], -params[2]]],
                'update_relationship': (params) => ['update_relationship', [params[0], params[1], -params[2]]],
                // Non-reversible tools return null
                'offer_quest': () => null,
                'check_threshold': () => null
            };
        },
        
        // Rewind to a specific position
        rewindTo: function(targetPosition) {
            const data = RewindSystem.getStorage();
            const currentPos = data.position;
            
            if (targetPosition >= currentPos) {
                if (debug) console.log(`${MODULE_NAME}: Cannot rewind forward`);
                return false;
            }
            
            // Revert tools from current back to target
            for (let i = currentPos; i > targetPosition; i--) {
                const entry = data.entries[i];
                if (!entry) continue;
                
                // Process tools in reverse order
                for (let j = entry.t.length - 1; j >= 0; j--) {
                    const toolData = entry.t[j];
                    const [tool, params, revertData] = toolData;
                    
                    // Use the captured revert data if available
                    if (revertData && Object.keys(revertData).length > 0) {
                        // Apply the captured revert data directly
                        if (debug) console.log(`${MODULE_NAME}: Reverting ${tool} using captured data:`, revertData);
                        
                        // Different tools need different reversion approaches
                        switch(tool) {
                            case 'update_location':
                                if (revertData.previousLocation) {
                                    const result = processToolCall('update_location', [params[0], revertData.previousLocation]);
                                    if (debug) console.log(`${MODULE_NAME}: Reverted location for ${params[0]} to ${revertData.previousLocation}: ${result}`);
                                }
                                break;
                                
                            case 'transfer_item':
                                // Reverse the transfer
                                if (revertData.amount > 0) {
                                    const result = processToolCall('transfer_item', [params[1], params[0], params[2], revertData.amount]);
                                    if (debug) console.log(`${MODULE_NAME}: Reverted item transfer: ${params[2]} x${revertData.amount} from ${params[1]} to ${params[0]}: ${result}`);
                                }
                                break;
                                
                            case 'update_relationship':
                                // Reverse the relationship change by negating it
                                const relationshipChange = parseInt(params[2]) || 0;
                                if (relationshipChange !== 0) {
                                    const result = processToolCall('update_relationship', [params[0], params[1], -relationshipChange]);
                                    if (debug) console.log(`${MODULE_NAME}: Reverted relationship ${params[0]}->${params[1]} by ${-relationshipChange}: ${result}`);
                                }
                                break;
                                
                            case 'unlock_newskill':
                                // Skip reverting skill unlocks
                                break;
                                
                            case 'add_levelxp':
                                // Subtract the XP that was added
                                const xpToRemove = parseInt(params[1]) || 0;
                                if (xpToRemove > 0) {
                                    const result = processToolCall('add_levelxp', [params[0], -xpToRemove]);
                                    if (debug) console.log(`${MODULE_NAME}: Reverted level XP for ${params[0]} by ${-xpToRemove}: ${result}`);
                                }
                                break;
                                
                            case 'add_skillxp':
                                // Subtract the skill XP that was added
                                const skillXpToRemove = parseInt(params[2]) || 0;
                                if (skillXpToRemove > 0) {
                                    const result = processToolCall('add_skillxp', [params[0], params[1], -skillXpToRemove]);
                                    if (debug) console.log(`${MODULE_NAME}: Reverted skill XP for ${params[0]}'s ${params[1]} by ${-skillXpToRemove}: ${result}`);
                                }
                                break;
                                
                            case 'add_item':
                                // Remove the item that was added
                                const itemsToRemove = parseInt(params[2]) || 1;
                                if (itemsToRemove > 0) {
                                    const result = processToolCall('remove_item', [params[0], params[1], itemsToRemove]);
                                    if (debug) console.log(`${MODULE_NAME}: Reverted add_item for ${params[0]}: removed ${params[1]} x${itemsToRemove}: ${result}`);
                                }
                                break;
                                
                            case 'remove_item':
                                // Add back the item that was removed
                                const itemsToAdd = parseInt(params[2]) || 1;
                                if (itemsToAdd > 0) {
                                    const result = processToolCall('add_item', [params[0], params[1], itemsToAdd]);
                                    if (debug) console.log(`${MODULE_NAME}: Reverted remove_item for ${params[0]}: added ${params[1]} x${itemsToAdd}: ${result}`);
                                }
                                break;
                                
                            default:
                                if (debug) console.log(`${MODULE_NAME}: No reversion logic for ${tool}`);
                        }
                    } else {
                        // Fallback to old reversion system if no revert data captured
                        const reversions = RewindSystem.getReversions();
                        const reverter = reversions[tool];
                        
                        if (reverter) {
                            const reversion = reverter(params);
                            if (reversion) {
                                const [revertTool, revertParams] = reversion;
                                const result = processToolCall(revertTool, revertParams);
                                if (debug) console.log(`${MODULE_NAME}: Reverted (fallback): ${tool}(${params.join(',')}) -> ${revertTool}(${revertParams.join(',')}): ${result}`);
                            }
                        }
                    }
                }
            }
            
            data.position = targetPosition;
            RewindSystem.saveStorage(data);
            return true;
        },
        
        // Extract and execute tools from text
        extractAndExecuteTools: function(text) {
            const executedTools = [];
            if (!text) return executedTools;
            
            // Find all tool calls in the text using the same pattern as processTools
            let match;
            while ((match = TOOL_PATTERN.exec(text)) !== null) {
                const [fullMatch, toolName, paramString] = match;
                
                // Use the same parameter parser as processTools
                const params = parseParameters(paramString);
                
                // Skip if this is a getter function (get_*)
                if (toolName.startsWith('get_')) continue;
                
                // Capture revert data BEFORE executing
                const revertData = captureRevertData(toolName.toLowerCase(), params);
                
                // Execute the tool
                const result = processToolCall(toolName, params);
                
                // Only track if successfully executed (ignore malformed/unknown)
                if (result === 'executed') {
                    executedTools.push({
                        tool: toolName.toLowerCase(),
                        params: params,
                        executed: true,
                        revertData: revertData
                    });
                    
                    if (debug) console.log(`${MODULE_NAME}: Executed tool from history: ${toolName}(${params.join(', ')})`);
                }
            }
            
            return executedTools;
        },
        
        // Process tools and add to history (called from processTools)
        trackTools: function(text, executedTools) {
            if (!executedTools || executedTools.length === 0) return;
            
            RewindSystem.recordAction(text, executedTools);
        },
        
        // Handle context updates (check for edits and rewinds)
        handleContext: function() {
            // Check if history is available
            if (typeof history === 'undefined' || !history) {
                if (debug) console.log(`${MODULE_NAME}: History not available in context`);
                return;
            }
            
            const data = RewindSystem.getStorage();
            const historyLength = history.length;
            const oldLength = data.entries.length;
            const oldPosition = data.position || -1;  // Track our last known position
            
            // Detect if history array has shifted (when at max capacity)
            let shifted = false;
            if (historyLength === 100 && oldLength >= 100) {
                // Check if the entries have shifted by comparing a few positions
                // If history[0] doesn't match our entries[0], we've shifted
                if (history[0] && data.entries[0]) {
                    const historyHash = RewindSystem.quickHash(history[0].text);
                    if (data.entries[0].h !== historyHash) {
                        shifted = true;
                        if (debug) console.log(`${MODULE_NAME}: History array shifted - realigning entries`);
                    }
                }
            }
            
            // If shifted, remove the oldest entry from our data
            if (shifted) {
                data.entries.shift();
            }
            
            // Track new entries but DON'T execute tools (assume already executed)
            // Only truly new entries at the very end should execute
            
            for (let i = data.entries.length; i < historyLength; i++) {
                const historyEntry = history[i];
                if (!historyEntry || !historyEntry.text) {
                    data.entries[i] = null;
                    continue;
                }
                
                const hash = RewindSystem.quickHash(historyEntry.text);
                
                // Check if this is the LAST entry in the history (genuinely new)
                // All other entries are assumed to be restored/already executed
                if (i === historyLength - 1 && i > oldPosition) {
                    // This is the newest entry and it's beyond our last position - execute tools
                    if (debug) console.log(`${MODULE_NAME}: Processing genuinely new entry at position ${i}`);
                    const tools = RewindSystem.extractAndExecuteTools(historyEntry.text);
                    data.entries[i] = {
                        h: hash,
                        t: tools.map(t => [t.tool, t.params, t.revertData || {}])
                    };
                } else {
                    // This is either:
                    // 1. A restored entry from history (middle entries)
                    // 2. Not beyond our last known position
                    // Just track hash, don't execute tools
                    if (debug) console.log(`${MODULE_NAME}: Tracking entry at position ${i} without execution (restored or old)`);
                    
                    // Extract tools without executing them (for tracking purposes)
                    const toolMatches = [];
                    const TOOL_PATTERN = /([a-z_]+)\s*\(([^)]*)\)/g;
                    let match;
                    while ((match = TOOL_PATTERN.exec(historyEntry.text)) !== null) {
                        const toolName = match[1];
                        const paramString = match[2];
                        const params = paramString ? paramString.split(',').map(p => p.trim()) : [];
                        toolMatches.push([toolName, params, {}]);
                    }
                    
                    data.entries[i] = {
                        h: hash,
                        t: toolMatches  // Tools that were in the text but we're not executing
                    };
                }
            }
            
            // Verify existing entries haven't been edited
            const checkLength = Math.min(data.entries.length, historyLength);
            for (let i = 0; i < checkLength; i++) {
                if (!history[i] || !data.entries[i]) continue;
                
                const historyHash = RewindSystem.quickHash(history[i].text);
                
                if (data.entries[i].h !== historyHash) {
                    // This entry was edited - reprocess it
                    if (debug) console.log(`${MODULE_NAME}: History entry ${i} was edited - reprocessing`);
                    
                    const tools = RewindSystem.extractAndExecuteTools(history[i].text);
                    data.entries[i] = {
                        h: historyHash,
                        t: tools.map(t => [t.tool, t.params, t.revertData || {}])
                    };
                }
            }
            
            // Update position
            data.position = historyLength - 1;
            RewindSystem.saveStorage(data);
            
            if (debug) console.log(`${MODULE_NAME}: History check complete - ${data.entries.length} entries tracked`);
        }
    };
    
    function createSampleRuntimeCards() {
        let created = false;
        
        // Create runtime variable declarations if doesn't exist
        if (!Utilities.storyCard.get('[RPG_RUNTIME] Variables')) {
            Utilities.storyCard.add({
                title: '[RPG_RUNTIME] Variables',
            type: 'data',
            entry: (
                `// Declare additional runtime variables here\n` +
                `// Format: variableName: type\n` +
                `// Types: integer, float, boolean, string, array, object\n` +
                `// \n` +
                `// Examples:\n` +
                `// player_karma: integer\n` +
                `// spawn_rate: float\n` +
                `// curses: array\n` +
                `// boss_flags: object\n` +
                `// discovered_locations: array\n` +
                `// quest_progress: object`
            ),
            description: (
                `// Additional variables can be declared here too\n` +
                `// Both entry and description are parsed for variables\n` +
                `// \n` +
                `// More examples:\n` +
                `// weather_state: string\n` +
                `// moon_phase: float\n` +
                `// damage_multiplier: float\n` +
                `// active_events: array\n` +
                `// npc_states: object`
            )
            });
            created = true;
        }
        
        if (!Utilities.storyCard.get('[RPG_RUNTIME] DATA 1')) {
            Utilities.storyCard.add({
                title: '[RPG_RUNTIME] DATA 1',
            type: 'data',
            entry: (
                `// Additional runtime data\n` +
                `// Format: # variableName\n` +
                `// value\n` +
                `// \n` +
                `// Examples:\n` +
                `// # player_karma\n` +
                `// 0\n` +
                `// \n` +
                `// # curses\n` +
                `// []\n` +
                `// \n` 
            ),
            description: (
                `// Additional data storage (both entry and description work)\n` +
                `// Create DATA 2, DATA 3 cards as needed for more space\n` 
            )
            });
            created = true;
        }
        
        if (!Utilities.storyCard.get('[RPG_RUNTIME] TOOLS')) {
            Utilities.storyCard.add({
                title: '[RPG_RUNTIME] TOOLS',
            type: 'data',
            entry: (
                `// Custom tools using standard function syntax\n` +
                `// Available via 'this' context:\n` +
                `// - getRuntimeValue(varName)\n` +
                `// - setRuntimeValue(varName, value)\n` +
                `// - loadAllCharacters()\n` +
                `// - saveCharacter(character)\n` +
                `// - Utilities (all utilities)\n` +
                `// - Calendar (if available)\n` +
                `// - debug (boolean flag)\n` +
                `// \n` +
                `// Tool functions receive parsed arguments\n`
            ),
            description: (
                `// Example custom tool (comma between functions!)\n` +
                `// \n` +
                `/*\n` +
                `,\n` +
                `set_weather: function(weatherType) {\n` +
                `    const validWeather = ['sunny', 'cloudy', 'rainy', 'stormy', 'snowy'];\n` +
                `    if (validWeather.includes(weatherType)) {\n` +
                `        this.setRuntimeValue('weather_state', weatherType);\n` +
                `        return true;\n` +
                `    }\n` +
                `    return false;\n` +
                `}\n` +
                `*/`
            )
            });
            created = true;
        }
        
        // Create INPUT_COMMANDS card if doesn't exist
        if (!Utilities.storyCard.get('[RPG_RUNTIME] INPUT_COMMANDS')) {
            Utilities.storyCard.add({
                title: '[RPG_RUNTIME] INPUT_COMMANDS',
            type: 'data',
            entry: `// Empty - add commands here`,
            description: (
                `// Example commands - copy to entry field and uncomment:\n` +
                `/*\n` +
                `stats: function(args) {\n` +
                `    const player = this.loadCharacter('player');\n` +
                `    if (!player) return "No player character found";\n` +
                `    return \`HP: \${player.hp.current}/\${player.hp.max}\`;\n` +
                `},\n` +
                `\n` +
                `give: function(args) {\n` +
                `    const item = args[0];\n` +
                `    const qty = parseInt(args[1] || 1);\n` +
                `    const player = this.loadCharacter('player');\n` +
                `    if (!player) return "No player character found";\n` +
                `    player.inventory[item] = (player.inventory[item] || 0) + qty;\n` +
                `    this.saveCharacter(player);\n` +
                `    return \`Gave \${qty} \${item}(s)\`;\n` +
                `}\n` +
                `*/`
            )
            });
            created = true;
        }
        
        // Create CONTEXT_MODIFIER card
        if (!Utilities.storyCard.get('[RPG_RUNTIME] CONTEXT_MODIFIER')) {
            Utilities.storyCard.add({
            title: '[RPG_RUNTIME] CONTEXT_MODIFIER', 
            type: 'data',
            entry: `// Context modifier - modify text before LLM sees it`,
            description: (
                `// This function runs in the context hook\n` +
                `// It receives the full context text as 'text'\n` +
                `// 'return text' is automatically added if not present`
            )
            });
            created = true;
        }
        
        // Create INPUT_MODIFIER card
        if (!Utilities.storyCard.get('[RPG_RUNTIME] INPUT_MODIFIER')) {
            Utilities.storyCard.add({
            title: '[RPG_RUNTIME] INPUT_MODIFIER',
            type: 'data', 
            entry: `// Input modifier - modify text before processing`,
            description: (
                `// Runs BEFORE commands are processed\n` +
                `// Pure JavaScript only - no game API access\n` +
                `// 'return text' is automatically added if not present`
            )
            });
            created = true;
        }
        
        // Create OUTPUT_MODIFIER card
        if (!Utilities.storyCard.get('[RPG_RUNTIME] OUTPUT_MODIFIER')) {
            Utilities.storyCard.add({
            title: '[RPG_RUNTIME] OUTPUT_MODIFIER',
            type: 'data',
            entry: `// Output modifier - modify text after processing`,
            description: (
                `// Runs AFTER tool processing\n` +
                `// Pure JavaScript only - no game API access\n` +
                `// 'return text' is automatically added if not present`
            )
            });
            created = true;
        }
        
        if (debug && created) console.log(`${MODULE_NAME}: Created runtime cards with defaults`);
        return created;
    }
    
    function createEntityTrackerCards() {
        // Create entity tracker config
        if (!Utilities.storyCard.get('[RPG_RUNTIME] Entity Tracker Config')) {
            Utilities.storyCard.add({
                title: '[RPG_RUNTIME] Entity Tracker Config',
                type: 'data',
                entry: (
                    `# entity_threshold\n` +
                    `3\n` +
                    `\n` +
                    `# auto_generate\n` +
                    `true\n` +
                    `\n` +
                    `# entity_blacklist\n` +
                    `player, self, me, you, unknown`
                ),
                description: `// Entity tracking data\n`
            });
        }
        
        // Entity templates are now handled by GenerationWizard
        // Remove old template card if it exists
        if (Utilities.storyCard.get('[RPG_RUNTIME] Entity Templates')) {
            Utilities.storyCard.remove('[RPG_RUNTIME] Entity Templates');
            if (debug) console.log(`${MODULE_NAME}: Removed deprecated [RPG_RUNTIME] Entity Templates - now using GenerationWizard`);
        }
        
        // Skip creating entity templates (deprecated)
        if (false) {
            Utilities.storyCard.add({
                title: '[RPG_RUNTIME] Entity Templates',
                type: 'data',
                entry: (
                    `# CLASSIFICATION_QUERY\n` +
                    `Classify the entity "{name}" that was just referenced:\n` +
                    `ENTITY_TYPE: [CHARACTER/MONSTER/BOSS/GROUP]\n` +
                    `FULL_NAME: [Complete name if different from "{name}"]\n` +
                    `GENDER: [Male/Female/Other/Unknown]\n` +
                    `DESCRIPTION: [2-3 sentences about who/what this is]\n` +
                    `\n` +
                    `# CHARACTER_QUERY\n` +
                    `For the character "{name}":\n` +
                    `TYPE: [NPC/NPC_PLAYER]\n` +
                    `APPEARANCE: [Physical description, build, clothing, distinguishing features]\n` +
                    `PERSONALITY: [Key traits, mannerisms, how they interact with others]\n` +
                    `BACKGROUND: [Brief history, role in world, motivations]\n` +
                    `LEVEL: [1-100 based on experience/competence]\n` +
                    `LOCATION: [Where they're typically found]\n` +
                    `PRIMARY_SKILLS: [2-4 relevant skills they would have]\n` +
                    `STARTING_ITEMS: [Key items they would carry]\n` +
                    `RELATIONSHIPS: [Any important connections to other characters]\n` +
                    `\n` +
                    `# MONSTER_QUERY\n` +
                    `For the monster "{name}":\n` +
                    `APPEARANCE: [Physical description, size, features]\n` +
                    `PERSONALITY: [Behavior patterns, intelligence level, temperament]\n` +
                    `BACKGROUND: [Origin, purpose, habitat]\n` +
                    `LEVEL: [1-100 based on danger]\n` +
                    `LOCATION: [Where encountered]\n` +
                    `ABILITIES: [3-5 combat abilities or special powers]\n` +
                    `LOOT: [Items dropped when defeated]\n` +
                    `WEAKNESSES: [Any vulnerabilities]\n` +
                    `\n` +
                    `# BOSS_QUERY\n` +
                    `For the boss "{name}":\n` +
                    `APPEARANCE: [Physical description, size, imposing features]\n` +
                    `PERSONALITY: [Behavior patterns, intelligence, motivations]\n` +
                    `BACKGROUND: [Origin story, rise to power, goals]\n` +
                    `LEVEL: [1-100 based on challenge]\n` +
                    `LOCATION: [Lair or domain]\n` +
                    `ABILITIES: [3-5 combat abilities or special powers]\n` +
                    `PHASES: [Number of combat phases]\n` +
                    `LEGENDARY_ACTIONS: [Special boss abilities]\n` +
                    `LOOT: [Unique items or rewards]\n` +
                    `WEAKNESSES: [Hidden vulnerabilities]\n` +
                    `\n` +
                    `# GROUP_QUERY\n` +
                    `For the group "{name}":\n` +
                    `GROUP_SIZE: [Specific number or range]\n` +
                    `MEMBER_TYPES: [Types of individuals in group]\n` +
                    `APPEARANCE: [How they look as a group, uniforms, etc.]\n` +
                    `ORGANIZATION: [Leadership structure, how they operate]\n` +
                    `PURPOSE: [Why they exist as a group]\n` +
                    `LOCATION: [Where they operate]\n` +
                    `RESOURCES: [What the group possesses collectively]\n` +
                    `REPUTATION: [How they're viewed by others]\n` +
                    `\n` +
                    `# PLAYER_SPECIFICS_QUERY\n` +
                    `For the player character "{name}":\n` +
                    `DOB: [YYYY-MM-DD format]\n` +
                    `STARTING_CLASS: [Fighter/Mage/Rogue/etc.]\n` +
                    `ATTRIBUTE_FOCUS: [Which attributes are highest]\n` +
                    `SKILL_SPECIALIZATION: [Main skill focus areas]\n` +
                    `BACKSTORY_HOOKS: [Plot hooks or quests related to them]`
                ),
                description: (
                    `Query templates for entity classification and generation.\n` +
                    `These templates are used to gather information about unknown entities.\n` +
                    `Edit to customize the questions asked when generating new entities.`
                )
            });
        }
        
        if (debug) console.log(`${MODULE_NAME}: Created entity tracker cards`);
    }
    
    // ==========================
    // RPG Schema Management
    // ==========================
    let schemaCache = null;
    
    function loadRPGSchema() {
        if (schemaCache !== null) return schemaCache;
        
        schemaCache = {
            attributes: { master: [], additional: [] },
            coreStats: {},
            skills: { categories: {}, definitions: {} },
            levelProgression: { formula: 'level * 100', overrides: {} }
        };
        
        // Load or create Attributes Schema
        let attrCard = Utilities.storyCard.get('[RPG_SCHEMA] Attributes');
        if (!attrCard) {
            createDefaultAttributesSchema();
            attrCard = Utilities.storyCard.get('[RPG_SCHEMA] Attributes');
        }
        if (attrCard) {
            parseAttributesSchema(attrCard.entry, schemaCache.attributes);
        }
        
        // Load or create Core Stats Schema
        let statsCard = Utilities.storyCard.get('[RPG_SCHEMA] Core Stats');
        if (!statsCard) {
            createDefaultCoreStatsSchema();
            statsCard = Utilities.storyCard.get('[RPG_SCHEMA] Core Stats');
        }
        if (statsCard) {
            parseCoreStatsSchema(statsCard.entry, schemaCache.coreStats);
        }
        
        // Load or create Skills Schema
        let skillsCard = Utilities.storyCard.get('[RPG_SCHEMA] Skills');
        if (!skillsCard) {
            createDefaultSkillsSchema();
            skillsCard = Utilities.storyCard.get('[RPG_SCHEMA] Skills');
        }
        if (skillsCard) {
            parseSkillsSchema(skillsCard.entry, schemaCache.skills);
        }
        
        // Load or create Level Progression Schema
        let levelCard = Utilities.storyCard.get('[RPG_SCHEMA] Level Progression');
        if (!levelCard) {
            createDefaultLevelProgressionSchema();
            levelCard = Utilities.storyCard.get('[RPG_SCHEMA] Level Progression');
        }
        if (levelCard) {
            parseLevelProgressionSchema(levelCard.entry, schemaCache.levelProgression);
        }
        
        if (debug) console.log(`${MODULE_NAME}: Loaded RPG schema`);
        return schemaCache;
    }
    
    function createDefaultAttributesSchema() {
        const defaultText = (
            `# Master Attributes\n` +
            `* VITALITY\n` +
            `* STRENGTH\n` +
            `* DEXTERITY\n` +
            `* AGILITY\n` +
            `\n` +
            `## Additional Attributes\n` +
            `* LUCK\n` +
            `* CHARISMA`
        );
        
        Utilities.storyCard.add({
            title: '[RPG_SCHEMA] Attributes',
            type: 'data',
            entry: defaultText,
            description: 'Edit master attributes (required for all characters) and additional attributes (optional)'
        });
        
        if (debug) console.log(`${MODULE_NAME}: Created default Attributes schema`);
    }
    
    function createDefaultCoreStatsSchema() {
        const defaultText = (
            `# HP\n` +
            `default: 100\n` +
            `per_level_formula: 10\n` +
            `\n` +
            `# MP\n` +
            `default: 50\n` +
            `per_level_formula: 5\n` +
            `\n` +
            `# STAMINA\n` +
            `default: 100\n` +
            `per_level_formula: 5`
        );
        
        Utilities.storyCard.add({
            title: '[RPG_SCHEMA] Core Stats',
            type: 'data',
            entry: defaultText,
            description: 'Core stats with X/MAX format. per_level_formula is added to max when leveling up'
        });
        
        if (debug) console.log(`${MODULE_NAME}: Created default Core Stats schema`);
    }
    
    function createDefaultSkillsSchema() {
        const defaultText = (
            `# XP Categories (per level formula)\n` +
            `default: level * 100\n` +
            `combat: level * 80\n` +
            `crafting: level * 150\n` +
            `social: level * 120\n` +
            `\n` +
            `## Skill Definitions\n` +
            `* one_handed_sword: combat\n` +
            `* two_handed_sword: combat\n` +
            `* rapier: combat\n` +
            `* cooking: crafting\n` +
            `* blacksmithing: crafting\n` +
            `* fishing: level * 200\n` +
            `* first_aid: default\n` +
            `* tracking: level * 120\n` +
            `* persuasion: social\n` +
            `* intimidation: social\n` +
            `* bartering: social`
        );
        
        Utilities.storyCard.add({
            title: '[RPG_SCHEMA] Skills',
            type: 'data',
            entry: defaultText,
            description: 'Define skill categories and individual skills. Skills can use category or custom formula'
        });
        
        if (debug) console.log(`${MODULE_NAME}: Created default Skills schema`);
    }
    
    function createDefaultLevelProgressionSchema() {
        const defaultText = (
            `# Level XP Formula\n` +
            `formula: level * level * 100\n` +
            `\n` +
            `# Custom Level Overrides\n` +
            `5: 2000\n` +
            `10: 8000\n` +
            `20: 35000\n` +
            `50: 200000\n` +
            `75: 500000`
        );
        
        Utilities.storyCard.add({
            title: '[RPG_SCHEMA] Level Progression',
            type: 'data',
            entry: defaultText,
            description: 'XP required for each level. Use formula for scaling, overrides for specific levels'
        });
        
        if (debug) console.log(`${MODULE_NAME}: Created default Level Progression schema`);
    }
    
    function parseAttributesSchema(text, attributes) {
        const lines = text.split('\n');
        let currentSection = null;
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            if (trimmed.startsWith('# Master Attributes')) {
                currentSection = 'master';
            } else if (trimmed.startsWith('## Additional Attributes')) {
                currentSection = 'additional';
            } else if (trimmed.startsWith('*') && currentSection) {
                const attr = trimmed.substring(1).trim();
                if (attr) {
                    attributes[currentSection].push(attr);
                }
            }
        }
    }
    
    function parseCoreStatsSchema(text, coreStats) {
        const lines = text.split('\n');
        let currentStat = null;
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            if (trimmed.startsWith('#') && !trimmed.startsWith('##')) {
                // New stat section
                currentStat = trimmed.substring(1).trim().toUpperCase();
                if (currentStat) {
                    coreStats[currentStat] = {};
                }
            } else if (currentStat && trimmed.includes(':')) {
                const [key, value] = trimmed.split(':').map(s => s.trim());
                if (key === 'default') {
                    coreStats[currentStat].default = parseInt(value) || 50;
                } else if (key === 'per_level_formula') {
                    coreStats[currentStat].perLevelFormula = value;
                }
            }
        }
    }
    
    function parseSkillsSchema(text, skills) {
        const lines = text.split('\n');
        let inCategories = false;
        let inDefinitions = false;
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            if (trimmed === '# XP Categories' || trimmed.includes('XP Categories')) {
                inCategories = true;
                inDefinitions = false;
            } else if (trimmed === '## Skill Definitions' || trimmed.includes('Skill Definitions')) {
                inCategories = false;
                inDefinitions = true;
            } else if (trimmed.startsWith('*') && inDefinitions) {
                const content = trimmed.substring(1).trim();
                const [skillName, category] = content.split(':').map(s => s.trim());
                if (skillName) {
                    skills.definitions[skillName.toLowerCase()] = category || 'default';
                }
            } else if (inCategories && trimmed.includes(':')) {
                const [category, formula] = trimmed.split(':').map(s => s.trim());
                if (category && formula) {
                    skills.categories[category] = formula;
                }
            }
        }
    }
    
    function parseLevelProgressionSchema(text, progression) {
        const lines = text.split('\n');
        let inOverrides = false;
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            if (trimmed.includes('Level XP Formula')) {
                inOverrides = false;
            } else if (trimmed.includes('Custom Level Overrides')) {
                inOverrides = true;
            } else if (trimmed.startsWith('formula:')) {
                progression.formula = trimmed.substring(8).trim();
            } else if (inOverrides && trimmed.match(/^\d+:/)) {
                const [level, xp] = trimmed.split(':').map(s => s.trim());
                progression.overrides[parseInt(level)] = parseInt(xp);
            }
        }
    }
    
    function calculateXPRequirement(level, formula, overrides) {
        // Check for override first
        if (overrides && overrides[level]) {
            return overrides[level];
        }
        
        // Use formula
        try {
            // Safe eval - only allows basic math operations
            const safeFormula = formula.replace(/level/gi, level);
            return Math.round(eval(safeFormula));
        } catch (e) {
            if (debug) console.log(`${MODULE_NAME}: Error calculating XP for level ${level}: ${e}`);
            return level * 100; // Fallback
        }
    }
    
    function calculateSkillXPRequirement(skillName, level, schema) {
        const definition = schema.skills.definitions[skillName.toLowerCase()];
        if (!definition) return level * 100; // Default if skill not in schema
        
        // Check if it's a number or a category
        const numValue = parseInt(definition);
        if (!isNaN(numValue)) {
            return numValue;
        }
        
        // It's a category or formula
        const formula = schema.skills.categories[definition] || definition;
        
        try {
            const safeFormula = formula.replace(/level/gi, level);
            return Math.round(eval(safeFormula));
        } catch (e) {
            if (debug) console.log(`${MODULE_NAME}: Error calculating skill XP: ${e}`);
            return level * 100;
        }
    }
    
    // ==========================
    // Relationship System
    // ==========================
    function loadRelationshipThresholds() {
        const thresholdCard = Utilities.storyCard.get('[RPG_SCHEMA] Relationship Thresholds');
        if (!thresholdCard) {
            createDefaultRelationshipThresholds();
            return loadRelationshipThresholds();
        }
        
        const thresholds = [];
        const lines = (thresholdCard.entry || '').split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            // Skip comments and headers
            if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) continue;
            
            // Parse: min to max: "flavor text"
            const match = trimmed.match(/^(-?\d+)\s+to\s+(-?\d+):\s*"([^"]+)"/);
            if (match) {
                thresholds.push({
                    min: parseInt(match[1]),
                    max: parseInt(match[2]),
                    flavor: match[3]
                });
            }
        }
        
        // Sort by min value for efficient lookup
        thresholds.sort((a, b) => a.min - b.min);
        return thresholds;
    }
    
    function getRelationshipFlavor(value, fromName, toName) {
        const thresholds = loadRelationshipThresholds();
        
        // Find matching threshold
        for (const threshold of thresholds) {
            if (value >= threshold.min && value <= threshold.max) {
                // Replace placeholders in flavor text
                return threshold.flavor
                    .replace(/\{from\}/g, fromName)
                    .replace(/\{to\}/g, toName)
                    .replace(/\{value\}/g, value);
            }
        }
        
        // Default if no threshold matches
        return `${value} points`;
    }
    
    function createDefaultRelationshipThresholds() {
        const defaultText = (
            `# Relationship Thresholds\n` +
            `// Format: min to max: "flavor text"\n` +
            `// Use {from} for source character, {to} for target, {value} for the number\n` +
            `// Thresholds are checked in order from lowest to highest\n` +
            `\n` +
            `-100 to -80: "Mortal Enemy"\n` +
            `-79 to -60: "Despised"\n` +
            `-59 to -40: "Hostile"\n` +
            `-39 to -20: "Disliked"\n` +
            `-19 to -5: "Unfriendly"\n` +
            `-4 to 4: "Neutral"\n` +
            `5 to 19: "Friendly"\n` +
            `20 to 39: "Liked"\n` +
            `40 to 59: "Trusted"\n` +
            `60 to 79: "Close Friend"\n` +
            `80 to 99: "Best Friend"\n` +
            `100 to 200: "Inseparable"\n` +
            `\n` +
            `// Extended ranges for special cases\n` +
            `201 to 500: "Soul Bonded"\n` +
            `501 to 999: "Legendary Bond"\n` +
            `1000 to 9999: "{from} would die for {to}"\n` +
            `\n` +
            `// Negative extremes\n` +
            `-200 to -101: "Would kill on sight"\n` +
            `-500 to -201: "Vendetta"\n` +
            `-9999 to -501: "Eternal Hatred"`
        );
        
        Utilities.storyCard.add({
            title: '[RPG_SCHEMA] Relationship Thresholds',
            type: 'data',
            entry: defaultText,
            description: 'Configure relationship value ranges and their descriptions. These appear in character sheets and logs.'
        });
        
        if (debug) console.log(`${MODULE_NAME}: Created default Relationship Thresholds schema`);
    }
    
    // ==========================
    // Initialize APIs
    // ==========================
    if (typeof Calendar !== 'undefined' && typeof Calendar === 'function') {
        Calendar('api', null);
    }

    if (typeof GenerationWizard !== 'undefined' && typeof GenerationWizard === 'function') {
        GenerationWizard('api', null);
    }
    
    // ==========================
    // Character Format Schema
    // ==========================
    let characterFormatCache = null;
    
    function loadCharacterFormat() {
        if (characterFormatCache !== null) return characterFormatCache;
        
        const formatCard = Utilities.storyCard.get('[RPG_SCHEMA] Character Format');
        if (!formatCard) {
            createDefaultCharacterFormat();
            characterFormatCache = parseCharacterFormatSchema(getDefaultFormatText());
            return characterFormatCache;
        }
        
        characterFormatCache = parseCharacterFormatSchema(formatCard.entry);
        return characterFormatCache;
    }
    
    function parseCharacterFormatSchema(text) {
        const format = {
            sections: [],
            sectionFormats: {},
            sectionOrder: [],
            prefixTemplate: '',
            headerFormat: '## **{name}**{fullName? [{fullName}]}',
            infoLineFormat: 'Gender: {gender} | HP: {hp.current}/{hp.max} | Level {level} ({xp.current}/{xp.max} XP) | Current Location: {location}',
            customFields: {}
        };
        
        if (!text) return getDefaultCharacterFormat();
        
        const lines = text.split('\n');
        let currentSection = null;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Skip empty lines and comments
            if (!line || line.startsWith('//')) continue;
            
            // Section headers
            if (line.startsWith('## ')) {
                currentSection = line.substring(3).trim().toLowerCase();
                continue;
            }
            
            // Parse based on current section
            switch (currentSection) {
                case 'section definitions':
                    // Parse: id -> Display Name (Alt1, Alt2)
                    const defMatch = line.match(/^([a-z_]+)\s*->\s*([^(]+)(?:\(([^)]*)\))?/);
                    if (defMatch) {
                        const id = defMatch[1].trim();
                        const displayName = defMatch[2].trim();
                        const alternates = defMatch[3] ? 
                            defMatch[3].split(',').map(s => s.trim()) : [];
                        
                        format.sections.push({
                            id: id,
                            displayName: displayName,
                            alternateNames: alternates,
                            format: 'plain_text' // default, will be overridden
                        });
                    }
                    break;
                    
                case 'section formats':
                    // Parse: section_id: format_type
                    const formatMatch = line.match(/^([a-z_]+):\s*(.+)/);
                    if (formatMatch) {
                        format.sectionFormats[formatMatch[1]] = formatMatch[2].trim();
                    }
                    break;
                    
                case 'section order':
                    // Each line is a section id
                    if (line && !line.startsWith('#')) {
                        format.sectionOrder.push(line);
                    }
                    break;
                    
                case 'prefix template':
                    // Accumulate lines until next section
                    if (!line.startsWith('#')) {
                        let template = line;
                        while (i + 1 < lines.length) {
                            const nextLine = lines[i + 1].trim();
                            if (!nextLine || nextLine.startsWith('##') || nextLine.startsWith('//')) {
                                break;
                            }
                            i++;
                            template += '\n' + lines[i];
                        }
                        format.prefixTemplate = template;
                    }
                    break;
                    
                case 'header template':
                    // Next non-comment line is the template
                    if (!line.startsWith('#')) {
                        format.headerFormat = line;
                    }
                    break;
                    
                case 'info line template':
                    // Accumulate lines until next section
                    if (!line.startsWith('#')) {
                        // Check if next line is also part of template
                        let template = line;
                        while (i + 1 < lines.length) {
                            const nextLine = lines[i + 1].trim();
                            if (!nextLine || nextLine.startsWith('##') || nextLine.startsWith('//')) {
                                break;
                            }
                            i++;
                            template += ' ' + nextLine;
                        }
                        format.infoLineFormat = template;
                    }
                    break;
                    
                case 'custom field mappings':
                    // Parse: alias -> field.path
                    const fieldMatch = line.match(/^([a-z_]+)\s*->\s*(.+)/);
                    if (fieldMatch) {
                        format.customFields[fieldMatch[1]] = fieldMatch[2].trim();
                    }
                    break;
            }
        }
        
        // Apply formats to sections
        for (const section of format.sections) {
            if (format.sectionFormats[section.id]) {
                section.format = format.sectionFormats[section.id];
            }
        }
        
        // If no section order specified, use section definition order
        if (format.sectionOrder.length === 0) {
            format.sectionOrder = format.sections.map(s => s.id);
        }
        
        return format;
    }
    
    function getDefaultCharacterFormat() {
        return {
            sections: [
                {
                    id: "attributes",
                    displayName: "Attributes",
                    alternateNames: [],
                    format: "pipe_delimited"
                },
                {
                    id: "skills",
                    displayName: "Skills",
                    alternateNames: [],
                    format: "skill_levels"
                },
                {
                    id: "inventory",
                    displayName: "Inventory",
                    alternateNames: [],
                    format: "braced_list"
                },
                {
                    id: "relationships",
                    displayName: "Relationships",
                    alternateNames: [],
                    format: "equals_value"
                },
                {
                    id: "appearance",
                    displayName: "Appearance",
                    alternateNames: [],
                    format: "plain_text"
                },
                {
                    id: "personality",
                    displayName: "Personality",
                    alternateNames: [],
                    format: "plain_text"
                },
                {
                    id: "background",
                    displayName: "Background",
                    alternateNames: [],
                    format: "plain_text"
                }
            ],
            headerFormat: "## **{name}**{fullName}",
            infoLineFormat: "{dob|DOB: $ | }Gender: {gender} | HP: {hp.current}/{hp.max}{coreStats} | Level {level} ({xp.current}/{xp.max} XP) | Current Location: {location}",
            sectionOrder: ["appearance", "personality", "background", "attributes", "skills", "inventory", "relationships"],
            customFields: {}
        };
    }
    
    function getDefaultFormatText() {
        return (
            `# Character Format Configuration\n` +
            `\n` +
            `## Section Definitions\n` +
            `// Format: SectionID -> Display Name (Alternate Names)\n` +
            `// The SectionID is used internally, Display Name shows in character cards\n` +
            `\n` +
            `attributes -> Attributes (Stats, Ability Scores)\n` +
            `skills -> Skills (Abilities, Proficiencies)\n` +
            `inventory -> Inventory (Items, Equipment, Gear)\n` +
            `relationships -> Relationships (Bonds, Connections)\n` +
            `appearance -> Appearance (Description, Physical, Looks)\n` +
            `personality -> Personality (Traits, Nature, Demeanor)\n` +
            `background -> Background (History, Story, Bio, Backstory)\n` +
            `\n` +
            `## Section Formats\n` +
            `// How each section's data should be formatted\n` +
            `// Options: pipe_delimited, skill_levels, braced_list, equals_value, plain_text, key_value, single_value\n` +
            `\n` +
            `attributes: pipe_delimited\n` +
            `skills: skill_levels\n` +
            `inventory: braced_list\n` +
            `relationships: equals_value\n` +
            `appearance: plain_text\n` +
            `personality: plain_text\n` +
            `background: plain_text\n` +
            `\n` +
            `## Section Order\n` +
            `// The order sections appear when saving (one per line)\n` +
            `\n` +
            `appearance\n` +
            `personality\n` +
            `background\n` +
            `attributes\n` +
            `skills\n` +
            `inventory\n` +
            `relationships\n` +
            `\n` +
            `## Prefix Template\n` +
            `// Text to add before the character sheet (for compatibility with other scripts)\n` +
            `// Use conditionals: {isPlayer?<$# User>} or {isNPC?<$# Characters>}\n` +
            `// Leave blank if not needed\n` +
            `{isPlayer?<$# User>}{isNPC?<$# Characters>}\n` +
            `\n` +
            `## Header Template\n` +
            `// Use {fieldname} for values, **text** for bold\n` +
            `// Use {fullName?[{fullName}]} to wrap fullName in brackets only if it exists\n` +
            `\n` +
            `## **{name}**{fullName? [{fullName}]}\n` +
            `\n` +
            `## Info Line Template\n` +
            `// Use {field} for simple values\n` +
            `// Use {field?text with {field}} for optional fields (only shows if field exists)\n` +
            `// Special: {coreStats} inserts all core stats automatically\n` +
            `\n` +
            `{dob?DOB: {dob} | }Gender: {gender} | HP: {hp.current}/{hp.max}{coreStats} | Level {level} ({xp.current}/{xp.max} XP) | Current Location: {location}\n` +
            `\n` +
            `## Custom Field Mappings\n` +
            `// Create shortcuts for commonly accessed fields\n` +
            `// Format: alias -> field.path\n` +
            `\n` +
            `health -> hp.current\n` +
            `max_health -> hp.max\n` +
            `hp -> hp.current\n` +
            `hp_max -> hp.max`
        );
    }
    
    function createDefaultCharacterFormat() {
        Utilities.storyCard.add({
            title: '[RPG_SCHEMA] Character Format',
            type: 'data',
            entry: getDefaultFormatText(),
            description: (
                'Defines how character cards are formatted and parsed. Edit the sections above to customize:\n\n' +
                '• Section Definitions: Define section IDs, display names, and alternate names\n' +
                '• Section Formats: Choose how each section\'s data is formatted\n' +
                '• Section Order: Control the order sections appear\n' +
                '• Header/Info Templates: Customize character header and info line\n' +
                '• Custom Fields: Create aliases for nested field paths\n\n' +
                'Format types:\n' +
                '- pipe_delimited: KEY: VALUE | KEY: VALUE\n' +
                '- skill_levels: skill: Level X (Y/Z XP)\n' +
                '- braced_list: {item:qty, item:qty}\n' +
                '- equals_value: name=value [flavor]\n' +
                '- plain_text: Free-form text\n' +
                '- key_value: key: value (one per line)\n' +
                '- single_value: A single value'
            )
        });
        
        if (debug) console.log(`${MODULE_NAME}: Created default Character Format schema`);
    }
    
    // ==========================
    // Character Field Accessors
    // ==========================
    function getCharacterField(character, fieldPath) {
        if (!character || !fieldPath) return null;
        
        // Check custom field mappings first
        const format = loadCharacterFormat();
        if (format.customFields && format.customFields[fieldPath]) {
            fieldPath = format.customFields[fieldPath];
        }
        
        // Handle nested paths
        return getNestedValue(character, fieldPath);
    }
    
    function setCharacterField(character, fieldPath, value) {
        if (!character || !fieldPath) return false;
        
        // Check custom field mappings
        const format = loadCharacterFormat();
        if (format.customFields && format.customFields[fieldPath]) {
            fieldPath = format.customFields[fieldPath];
        }
        
        return setNestedValue(character, fieldPath, value);
    }
    
    function getNestedValue(obj, path) {
        const parts = path.split('.');
        let current = obj;
        
        for (const part of parts) {
            if (current === null || current === undefined) {
                return null;
            }
            current = current[part];
        }
        
        return current;
    }
    
    function setNestedValue(obj, path, value) {
        const parts = path.split('.');
        let current = obj;
        
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (!current[part]) {
                current[part] = {};
            }
            current = current[part];
        }
        
        current[parts[parts.length - 1]] = value;
        return true;
    }
    
    // ==========================
    // Character Management
    // ==========================
    let characterCache = null;
    
    function loadAllCharacters() {
        if (characterCache !== null) return characterCache;
        
        characterCache = {};
        
        // Load all [CHARACTER] and [PLAYER] cards using find with predicate
        const cards = Utilities.storyCard.find(
            card => card.title && (card.title.startsWith('[CHARACTER]') || card.title.startsWith('[PLAYER]')),
            true // Get all matches
        );
        
        if (!cards || cards.length === 0) return characterCache;
        
        for (const card of cards) {
            const parsed = parseCharacterCard(card);
            if (parsed && parsed.name) {
                // Store with lowercase name as key
                characterCache[parsed.name.toLowerCase()] = parsed;
            }
        }
        
        if (debug) console.log(`${MODULE_NAME}: Loaded ${Object.keys(characterCache).length} characters`);
        return characterCache;
    }
    
    function parseCharacterCard(card) {
        const schema = loadRPGSchema();
        const format = loadCharacterFormat();
        
        const character = {
            title: card.title,
            name: null,
            fullName: null,
            dob: null,
            gender: null,
            hp: { current: 10, max: 10 },
            level: 1,
            xp: { current: 0, max: 100 },
            location: '???',
            coreStats: {},
            attributes: {},
            skills: {},
            inventory: {},
            relationships: {},
            rawSections: {},
            prefixText: ''
        };
        
        // Extract name from title - just [CHARACTER] Name or [PLAYER] Name
        const titleMatch = card.title.match(/\[(CHARACTER|PLAYER)\]\s+(.+)/);
        if (titleMatch) {
            character.name = titleMatch[2].trim();
        }
        
        // Parse the entry text
        const text = card.entry || '';
        const lines = text.split('\n');
        
        // Extract all sections from the text
        const sections = {};
        let currentSection = null;
        let sectionContent = [];
        let foundMainHeader = false;
        let prefixLines = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Check for main character header - try multiple patterns
            if (line.startsWith('## ')) {
                // Try the configured header patterns
                const headerMatch = line.match(/## \*\*(.+?)\*\*(?:\s+(.+))?/) || 
                                  line.match(/## (.+)/);
                if (headerMatch) {
                    foundMainHeader = true;
                    character.name = headerMatch[1].trim().replace(/\*\*/g, '');
                    
                    // If there's text after the name, that's the full name
                    if (headerMatch[2]) {
                        let fullName = headerMatch[2].trim();
                        // Strip any surrounding brackets to prevent accumulation
                        while (fullName.startsWith('[') && fullName.endsWith(']')) {
                            fullName = fullName.slice(1, -1).trim();
                        }
                        if (fullName) {
                            character.fullName = fullName;
                        }
                    }
                    
                    // Store any prefix text (but ignore template-generated prefixes)
                    if (prefixLines.length > 0) {
                        const prefixText = prefixLines.join('\n').trim();
                        // Don't store template-generated prefixes like <$# User> or <$# Characters>
                        if (!prefixText.match(/^<\$#\s+[^>]+>$/)) {
                            character.prefixText = prefixText;
                        }
                    }
                    
                    // Parse the info line (next line after header)
                    if (i + 1 < lines.length) {
                        const infoLine = lines[i + 1];
                        parseCharacterInfoLine(infoLine, character);
                    }
                    i++; // Skip the info line
                }
            }
            // If we haven't found the main header yet, accumulate prefix lines
            else if (!foundMainHeader) {
                prefixLines.push(line);
            }
            // Check for section headers (###)
            else if (line.startsWith('### ')) {
                // Save previous section if exists
                if (currentSection) {
                    sections[currentSection] = sectionContent.join('\n').trim();
                }
                
                currentSection = line.substring(4).trim().toLowerCase();
                sectionContent = [];
            }
            // Accumulate section content
            else if (currentSection) {
                sectionContent.push(line);
            }
        }
        
        // Save last section
        if (currentSection) {
            sections[currentSection] = sectionContent.join('\n').trim();
        }
        
        // Store raw sections for preservation
        character.rawSections = sections;
        
        // Map sections to character properties using schema
        for (const sectionDef of format.sections) {
            // Check display name and all alternate names
            const possibleNames = [sectionDef.displayName, ...sectionDef.alternateNames];
            
            for (const name of possibleNames) {
                const normalizedName = name.toLowerCase();
                if (sections[normalizedName]) {
                    const content = sections[normalizedName];
                    character[sectionDef.id] = parseSectionByFormat(content, sectionDef.format);
                    break;
                }
            }
        }
        
        // Initialize missing master attributes with defaults
        for (const attr of schema.attributes.master) {
            if (!character.attributes[attr.toLowerCase()]) {
                character.attributes[attr.toLowerCase()] = 10; // Default value
            }
        }
        
        // Initialize core stats if missing
        initializeCoreStats(character, schema);
        
        // Set XP requirement for current level
        character.xp.max = calculateXPRequirement(character.level + 1, schema.levelProgression.formula, schema.levelProgression.overrides);
        
        return character;
    }
    
    function initializeCoreStats(character, schema) {
        // HP is stored in the old location for backward compatibility
        if (!character.hp.max || character.hp.max === 10) {
            // Use default from schema
            const hpSchema = schema.coreStats.HP || schema.coreStats.hp;
            if (hpSchema && hpSchema.default) {
                character.hp.max = hpSchema.default;
                character.hp.current = hpSchema.default;
            }
        }
        
        // Initialize other core stats from schema
        for (const [statName, statSchema] of Object.entries(schema.coreStats)) {
            const statKey = statName.toLowerCase();
            if (statKey !== 'hp' && !character.coreStats[statKey]) {
                character.coreStats[statKey] = {
                    current: statSchema.default,
                    max: statSchema.default
                };
            }
        }
    }
    
    function parseCharacterInfoLine(line, character) {
        // Parse: DOB: YYYY-MM-DD | Gender: Female | HP: 10/10 | MP: 50/50 | Level 1 (0/100 XP) | Current Location: Town_of_Beginnings
        // OR the older format without DOB
        
        const parts = line.split('|').map(p => p.trim());
        
        for (const part of parts) {
            if (part.startsWith('DOB:')) {
                character.dob = part.substring(4).trim();
            }
            else if (part.startsWith('Gender:')) {
                character.gender = part.substring(7).trim();
            }
            else if (part.startsWith('HP:')) {
                const hpMatch = part.match(/HP:\s*(\d+)\/(\d+)/);
                if (hpMatch) {
                    character.hp.current = parseInt(hpMatch[1]);
                    character.hp.max = parseInt(hpMatch[2]);
                }
            }
            else if (part.includes('Level')) {
                const levelMatch = part.match(/Level\s+(\d+)\s*\((\d+)\/(\d+)\s*XP\)/);
                if (levelMatch) {
                    character.level = parseInt(levelMatch[1]);
                    character.xp.current = parseInt(levelMatch[2]);
                    character.xp.max = parseInt(levelMatch[3]);
                }
            }
            else if (part.startsWith('Current Location:')) {
                character.location = part.substring(17).trim() || '???';
            }
            // Parse other core stats (MP, STAMINA, etc.)
            else {
                const statMatch = part.match(/^([A-Z]+):\s*(\d+)\/(\d+)$/);
                if (statMatch) {
                    const statName = statMatch[1].toLowerCase();
                    if (statName !== 'hp') {
                        character.coreStats[statName] = {
                            current: parseInt(statMatch[2]),
                            max: parseInt(statMatch[3])
                        };
                    }
                }
            }
        }
    }
    
    function parseSectionByFormat(content, format) {
        switch (format) {
            case 'pipe_delimited':
                return Utilities.parsing.parsePipeDelimited(content);
            case 'skill_levels':
                return parseSkillLevels(content);  // Keep specialized
            case 'braced_list':
                return Utilities.parsing.parseBracedList(content);
            case 'equals_value':
                return Utilities.parsing.parseEqualsValue(content);
            case 'plain_text':
                return content;
            case 'key_value':
                return Utilities.parsing.parseColonKeyValue(content);
            case 'single_value':
                return parseSingleValue(content);
            default:
                return content;
        }
    }
    
    // parsePipeDelimited - moved to Utilities.parsing.parsePipeDelimited
    
    function parseSkillLevels(text) {
        // Parse: skill_name: Level X (current/max XP)
        const skills = {};
        const lines = text.split('\n');
        
        for (const line of lines) {
            const match = line.match(/(.+?):\s*Level\s+(\d+)\s*\((\d+)\/(\d+)\s*XP\)/);
            if (match) {
                const skillName = match[1].trim().toLowerCase();
                skills[skillName] = {
                    level: parseInt(match[2]),
                    xp: {
                        current: parseInt(match[3]),
                        max: parseInt(match[4])
                    }
                };
            }
        }
        
        return skills;
    }
    
    // parseBracedList - moved to Utilities.parsing.parseBracedList
    
    // parseEqualsValue - moved to Utilities.parsing.parseEqualsValue
    
    // parseKeyValue - moved to Utilities.parsing.parseColonKeyValue
    
    function parseSingleValue(text) {
        // Parse a single value (number or string)
        const trimmed = text.trim();
        const numValue = parseFloat(trimmed);
        return isNaN(numValue) ? trimmed : numValue;
    }
    
    function saveCharacter(character) {
        if (!character || !character.name) return false;
        
        const format = loadCharacterFormat();
        let entry = '';
        
        // Add prefix from template (for script compatibility headers)
        if (format.prefixTemplate) {
            const prefix = formatTemplate(format.prefixTemplate, character);
            if (prefix.trim()) {
                entry += prefix + '\n';
            }
        }
        // Legacy support: if character has old prefixText and no template is defined
        else if (character.prefixText) {
            entry += character.prefixText + '\n';
        }
        
        // Format header using template
        entry += formatString(format.headerFormat, character) + '\n';
        
        // Format info line using template
        entry += formatTemplate(format.infoLineFormat, character) + '\n';
        
        // Add sections in configured order
        for (const sectionId of format.sectionOrder) {
            const sectionDef = format.sections.find(s => s.id === sectionId);
            if (!sectionDef) continue;
            
            const data = character[sectionId];
            if (!data || (typeof data === 'object' && Object.keys(data).length === 0 && sectionDef.format !== 'plain_text')) continue;
            if (sectionDef.format === 'plain_text' && !data) continue;
            
            entry += `### ${sectionDef.displayName}\n`;
            entry += formatSectionData(data, sectionDef.format, character) + '\n';
        }
        
        // Build keys array - include all names the character might be known by
        const keys = [character.name];
        if (character.fullName && character.fullName !== character.name) {
            keys.push(character.fullName);
        }
        if (character.triggerName && character.triggerName !== character.name) {
            keys.push(character.triggerName);
        }
        
        // Save the card with multiple keys
        Utilities.storyCard.upsert({
            title: character.title,
            entry: entry,
            keys: keys.join(',')
        });
        
        if (debug) console.log(`${MODULE_NAME}: Saved character ${character.name} with keys: ${keys.join(', ')}`);
        return true;
    }
    
    function formatString(template, data) {
        // First handle conditional formatting like {field?text with {field}}
        let result = template;
        
        // Handle conditional blocks
        result = result.replace(/\{([^?}]+)\?([^}]*\{[^}]+\}[^}]*)\}/g, (match, fieldPath, conditionalText) => {
            const value = getNestedValue(data, fieldPath.trim());
            if (value !== null && value !== undefined && value !== '') {
                // Replace nested field references within the conditional text
                return conditionalText.replace(/\{([^}]+)\}/g, (innerMatch, innerPath) => {
                    const innerValue = getNestedValue(data, innerPath.trim());
                    return innerValue !== null && innerValue !== undefined ? innerValue : '';
                });
            }
            return '';
        });
        
        // Then handle simple field replacements
        result = result.replace(/\{([^}]+)\}/g, (match, path) => {
            const fieldPath = path.trim();
            const value = getNestedValue(data, fieldPath);
            return value !== null && value !== undefined ? value : '';
        });
        
        return result;
    }
    
    function formatTemplate(template, character) {
        // Handle conditional fields with the format {field?text with {field}}
        // Use a more complex regex to handle nested braces
        let result = template;
        
        // First, find and replace all conditional blocks
        // This regex matches {field?...} including nested {} inside
        const conditionalRegex = /\{([^?{}]+)\?([^{}]*(?:\{[^}]*\}[^{}]*)*)\}/g;
        result = result.replace(conditionalRegex, (match, fieldPath, conditionalText) => {
            fieldPath = fieldPath.trim();
            
            // Special check for isPlayer and isNPC
            if (fieldPath === 'isPlayer') {
                const isPlayer = character.title && character.title.startsWith('[PLAYER]');
                return isPlayer ? conditionalText : '';
            }
            if (fieldPath === 'isNPC') {
                const isNPC = character.title && character.title.startsWith('[CHARACTER]');
                return isNPC ? conditionalText : '';
            }
            
            const value = getNestedValue(character, fieldPath);
            
            // If field has no value, remove the entire conditional block
            if (value === null || value === undefined || value === '') {
                return '';
            }
            
            // Replace nested {field} references within the conditional text
            return conditionalText.replace(/\{([^}]+)\}/g, (m, field) => {
                if (field === fieldPath) {
                    return value; // Replace with the main field value
                }
                return getNestedValue(character, field) || '';
            });
        });
        
        // Handle simple field replacements {field}
        result = result.replace(/\{([^}]+)\}/g, (match, fieldPath) => {
            fieldPath = fieldPath.trim();
            
            // Special handling for coreStats
            if (fieldPath === 'coreStats') {
                let statsText = '';
                if (character.coreStats) {
                    for (const [statName, statData] of Object.entries(character.coreStats)) {
                        statsText += ` | ${statName.toUpperCase()}: ${statData.current}/${statData.max}`;
                    }
                }
                return statsText;
            }
            
            const value = getNestedValue(character, fieldPath);
            return value !== null && value !== undefined ? value : '???';
        });
        
        return result;
    }
    
    // Keep formatInfoLine as an alias for backwards compatibility
    function formatInfoLine(template, character) {
        return formatTemplate(template, character);
    }
    
    function formatSectionData(data, format, character) {
        switch (format) {
            case 'pipe_delimited':
                return Object.entries(data)
                    .map(([key, value]) => `${key.toUpperCase()}: ${value}`)
                    .join(' | ');
                
            case 'skill_levels':
                return Object.entries(data)
                    .map(([skill, info]) => 
                        `${skill}: Level ${info.level} (${info.xp.current}/${info.xp.max} XP)`)
                    .join('\n');
                
            case 'braced_list':
                const items = Object.entries(data)
                    .filter(([_, qty]) => qty > 0)
                    .map(([item, qty]) => `${item}:${qty}`);
                return items.length > 0 ? `{${items.join(', ')}}` : '{}';
                
            case 'equals_value':
                return Object.entries(data)
                    .map(([name, value]) => {
                        const flavor = getRelationshipFlavor(value, character.name, name);
                        return `${name}=${value} [${flavor}]`;
                    })
                    .join('\n');
                
            case 'plain_text':
                return data || '';
                
            case 'key_value':
                return Object.entries(data)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join('\n');
                
            case 'single_value':
                return data.toString();
                
            default:
                return typeof data === 'object' ? JSON.stringify(data, null, 2) : data;
        }
    }
    
    function processLevelUp(character, schema) {
        const nextLevel = character.level + 1;
        const requiredXP = calculateXPRequirement(nextLevel, schema.levelProgression.formula, schema.levelProgression.overrides);
        
        if (character.xp.current >= requiredXP) {
            // Level up!
            const overflow = character.xp.current - requiredXP;
            character.level = nextLevel;
            
            // Calculate XP for next level
            const nextRequirement = calculateXPRequirement(nextLevel + 1, schema.levelProgression.formula, schema.levelProgression.overrides);
            character.xp.current = overflow;
            character.xp.max = nextRequirement;
            
            // Calculate HP gain
            const hpSchema = schema.coreStats.HP || schema.coreStats.hp;
            if (hpSchema && hpSchema.perLevelFormula) {
                const hpGain = calculateStatGain(hpSchema.perLevelFormula, character, schema);
                character.hp.max += hpGain;
                character.hp.current = character.hp.max; // Heal to full on level up
            }
            
            // Calculate other stat gains
            for (const [statName, statSchema] of Object.entries(schema.coreStats)) {
                if (statName.toLowerCase() !== 'hp' && statSchema.perLevelFormula) {
                    const statKey = statName.toLowerCase();
                    if (!character.coreStats[statKey]) {
                        character.coreStats[statKey] = {
                            current: statSchema.default || 0,
                            max: statSchema.default || 0
                        };
                    }
                    const gain = calculateStatGain(statSchema.perLevelFormula, character, schema);
                    character.coreStats[statKey].max += gain;
                    character.coreStats[statKey].current = character.coreStats[statKey].max;
                }
            }
            
            if (debug) console.log(`${MODULE_NAME}: ${character.name} leveled up to ${nextLevel}!`);
            
            // Check if we can level up again
            processLevelUp(character, schema);
        }
    }
    
    function calculateStatGain(formula, character, schema) {
        try {
            // Replace attribute references
            let safeFormula = formula;
            for (const [attr, value] of Object.entries(character.attributes || {})) {
                const regex = new RegExp(attr.toUpperCase(), 'g');
                safeFormula = safeFormula.replace(regex, value);
            }
            
            // Replace MaxHP reference if present
            safeFormula = safeFormula.replace(/MaxHP/gi, character.hp.max);
            
            // Replace level reference
            safeFormula = safeFormula.replace(/level/gi, character.level);
            
            // Evaluate and round
            return Math.round(eval(safeFormula));
        } catch (e) {
            if (debug) console.log(`${MODULE_NAME}: Error calculating stat gain: ${e}`);
            return 5; // Default gain
        }
    }
    
    function processSkillLevelUp(skill, skillName, schema) {
        const nextLevel = skill.level + 1;
        const requiredXP = calculateSkillXPRequirement(skillName, nextLevel, schema);
        
        if (skill.xp.current >= requiredXP) {
            const overflow = skill.xp.current - requiredXP;
            skill.level = nextLevel;
            
            // Calculate XP for next level
            const nextRequirement = calculateSkillXPRequirement(skillName, nextLevel + 1, schema);
            skill.xp.current = overflow;
            skill.xp.max = nextRequirement;
            
            if (debug) console.log(`${MODULE_NAME}: Skill ${skillName} leveled up to ${nextLevel}!`);
            
            // Check if we can level up again
            processSkillLevelUp(skill, skillName, schema);
        }
    }
    
    // ==========================
    // Character Creation
    // ==========================
    function createCharacter(characterData) {
        const schema = loadRPGSchema();
        const format = loadCharacterFormat();
        
        // Determine character type (PLAYER or CHARACTER/NPC)
        const isPlayer = characterData.isPlayer || false;
        const cardPrefix = isPlayer ? '[PLAYER]' : '[CHARACTER]';
        
        // Required fields
        if (!characterData.name) {
            if (debug) console.log(`${MODULE_NAME}: Cannot create character without name`);
            return null;
        }
        
        // Build character object with defaults
        const character = {
            title: `${cardPrefix} ${characterData.name}`,
            name: characterData.name,
            fullName: characterData.fullName || null,
            triggerName: characterData.triggerName || null,  // Preserve trigger name if provided
            dob: characterData.dob || null,
            gender: characterData.gender || '???',
            hp: {
                current: characterData.hp?.current || characterData.hp || schema.coreStats.HP?.default || schema.coreStats.hp?.default || 100,
                max: characterData.hp?.max || characterData.hp || schema.coreStats.HP?.default || schema.coreStats.hp?.default || 100
            },
            level: characterData.level || 1,
            xp: {
                current: characterData.xp?.current || 0,
                max: calculateXPRequirement((characterData.level || 1) + 1, schema.levelProgression.formula, schema.levelProgression.overrides)
            },
            location: characterData.location || 'unknown',
            coreStats: {},
            attributes: {},
            skills: {},
            inventory: {},
            relationships: {},
            rawSections: {}
        };
        
        // Initialize attributes from schema
        for (const attr of schema.attributes.master) {
            const attrKey = attr.toLowerCase();
            character.attributes[attrKey] = characterData.attributes?.[attrKey] || 10;
        }
        
        // Add any additional attributes provided
        if (characterData.attributes) {
            for (const [key, value] of Object.entries(characterData.attributes)) {
                character.attributes[key.toLowerCase()] = value;
            }
        }
        
        // Initialize core stats from schema
        for (const [statName, statSchema] of Object.entries(schema.coreStats)) {
            const statKey = statName.toLowerCase();
            if (statKey !== 'hp') {
                const providedStat = characterData.coreStats?.[statKey];
                character.coreStats[statKey] = {
                    current: providedStat?.current || providedStat || statSchema.default || 0,
                    max: providedStat?.max || providedStat || statSchema.default || 0
                };
            }
        }
        
        // Add skills if provided
        if (characterData.skills) {
            for (const [skillName, skillData] of Object.entries(characterData.skills)) {
                const skillKey = skillName.toLowerCase().replace(/\s+/g, '_');
                if (typeof skillData === 'object') {
                    character.skills[skillKey] = {
                        level: skillData.level || 1,
                        xp: {
                            current: skillData.xp?.current || 0,
                            max: skillData.xp?.max || calculateSkillXPRequirement(skillKey, (skillData.level || 1) + 1, schema)
                        }
                    };
                } else {
                    // If just a number, treat as level
                    character.skills[skillKey] = {
                        level: skillData,
                        xp: {
                            current: 0,
                            max: calculateSkillXPRequirement(skillKey, skillData + 1, schema)
                        }
                    };
                }
            }
        }
        
        // Add inventory if provided
        if (characterData.inventory) {
            for (const [item, qty] of Object.entries(characterData.inventory)) {
                const itemKey = item.toLowerCase().replace(/\s+/g, '_');
                character.inventory[itemKey] = qty;
            }
        }
        
        // Add relationships if provided
        if (characterData.relationships) {
            for (const [target, value] of Object.entries(characterData.relationships)) {
                const targetKey = target.toLowerCase().replace(/\s+/g, '_');
                character.relationships[targetKey] = value;
            }
        }
        
        // Add custom sections based on format
        for (const section of format.sections) {
            // Skip standard sections we've already handled
            if (['attributes', 'skills', 'inventory', 'relationships'].includes(section.id)) {
                continue;
            }
            
            // Check if data was provided for this custom section
            if (characterData[section.id]) {
                character[section.id] = characterData[section.id];
            }
        }
        
        // Save the character
        if (saveCharacter(character)) {
            // Clear cache to include new character
            characterCache = null;
            if (debug) console.log(`${MODULE_NAME}: Created character ${character.name}`);
            return character;
        }
        
        return null;
    }
    
    // ==========================
    // Player Command Processing
    // ==========================
    function processPlayerCommand(text) {
        const command = text.toLowerCase().trim();
        
        // Handle /GW abort command
        if (command === '/gw abort' || command === '/gw cancel') {
            if (typeof GenerationWizard !== 'undefined' && GenerationWizard.isActive()) {
                GenerationWizard.cancelGeneration();
                if (debug) console.log(`${MODULE_NAME}: Generation aborted by player`);
                // Show message to player but hide from LLM
                return {
                    handled: true,
                    output: '\n<<<Generation cancelled>>>\n'
                };
            }
            // If no generation active, show message to player
            return {
                handled: true,
                output: '\n<<<No generation in progress>>>\n'
            };
        }
        
        // Add other player commands here in the future
        
        return { handled: false };
    }
    
    // ==========================
    // Parse Function Parameters
    // ==========================
    function parseParameters(paramString) {
        if (!paramString || !paramString.trim()) return [];
        
        const params = [];
        let current = '';
        let inQuotes = false;
        let quoteChar = null;
        let depth = 0;
        
        for (let i = 0; i < paramString.length; i++) {
            const char = paramString[i];
            const nextChar = paramString[i + 1];
            
            // Handle quotes
            if ((char === '"' || char === "'") && !inQuotes) {
                inQuotes = true;
                quoteChar = char;
                // Don't include the quote in the parameter
            } else if (char === quoteChar && inQuotes) {
                inQuotes = false;
                quoteChar = null;
                // Don't include the quote in the parameter
            }
            // Handle nested parentheses (for complex expressions)
            else if (char === '(' && !inQuotes) {
                depth++;
                current += char;
            } else if (char === ')' && !inQuotes) {
                depth--;
                current += char;
            }
            // Handle parameter separation
            else if (char === ',' && !inQuotes && depth === 0) {
                params.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        // Add the last parameter
        if (current.trim()) {
            params.push(current.trim());
        }
        
        // Process parameters to handle types
        return params.map(param => {
            // Remove outer quotes if present
            if ((param.startsWith('"') && param.endsWith('"')) ||
                (param.startsWith("'") && param.endsWith("'"))) {
                return param.slice(1, -1);
            }
            
            // Check for numbers
            if (/^-?\d+$/.test(param)) {
                return parseInt(param);
            }
            if (/^-?\d*\.\d+$/.test(param)) {
                return parseFloat(param);
            }
            
            // Check for booleans
            if (param === 'true') return true;
            if (param === 'false') return false;
            
            // Check for fractions (e.g., "3/10")
            if (/^\d+\/\d+$/.test(param)) {
                return param; // Keep as string for special parsing
            }
            
            return param;
        });
    }
    
    // ==========================
    // Getter System - Process Dynamic Placeholders
    // ==========================
    function processGetters(text) {
        if (!text) return text;
        
        // Load runtime variables once for this pass
        const runtimeVars = loadRuntimeVariables();
        
        return text.replace(GETTER_PATTERN, function(match) {
            // Parse the getter: get_something(parameters)
            const innerMatch = match.match(/get_([a-z_]+)\s*\(([^)]*)\)/i);
            if (!innerMatch) return match;
            
            const getterType = innerMatch[1];
            const paramString = innerMatch[2];
            const params = parseParameters(paramString);
            
            // Process different getter types
            switch(getterType) {
                // Character getters
                case 'location':
                    return getCharacterLocation(params[0]) || '???';
                    
                case 'hp':
                    return getCharacterHP(params[0]) || '0/0';
                    
                case 'level':
                    return getCharacterLevel(params[0]) || '1';
                    
                case 'xp':
                    return getCharacterXP(params[0]) || '0/100';
                    
                case 'name':
                    return getCharacterName(params[0]) || 'Unknown';
                    
                case 'attribute':
                    return getCharacterAttribute(params[0], params[1]) || '0';
                    
                case 'skill':
                    return getCharacterSkill(params[0], params[1]) || 'Not learned';
                    
                case 'inventory':
                    return getCharacterInventory(params[0]) || '{}';
                    
                case 'stat':
                    return getCharacterStat(params[0], params[1]) || '0/0';
                    
                // Time getters (Calendar API)
                case 'time':
                case 'currenttime':
                    return getCurrentTime() || '00:00';
                    
                case 'formattedtime':
                    return getFormattedTime() || '12:00 AM';
                    
                case 'timeofday':
                    return getTimeOfDay() || 'Unknown';
                    
                case 'date':
                case 'currentdate':
                    return getCurrentDate() || 'Unknown Date';
                    
                case 'formatteddate':
                    return getFormattedDate() || 'Unknown';
                    
                case 'daynumber':
                    return getDayNumber() || '0';
                    
                case 'season':
                    return getSeason() || 'Unknown';
                    
                // World state getters
                case 'frontline':
                case 'playersalive':
                case 'playerstotal':
                    // Fall through to default handler
                    
                default:
                    // CHECK RUNTIME VARIABLES using exact getter name (snake_case)
                    const varName = getterType; // Use exact name, no conversion!
                    
                    if (runtimeVars[varName]) {
                        const value = getRuntimeValue(varName);
                        if (value !== null) {
                            return typeof value === 'object' ? JSON.stringify(value) : String(value);
                        }
                    }
                    
                    if (debug) console.log(`${MODULE_NAME}: Unknown getter type: ${getterType}`);
                    return match;
            }
        });
    }
    
    // Character getter functions
    function getCharacterLocation(name) {
        if (!name) return null;
        const characters = loadAllCharacters();
        const character = characters[String(name).toLowerCase()];
        return character ? character.location : null;
    }
    
    function getCharacterHP(name) {
        if (!name) return null;
        const characters = loadAllCharacters();
        const character = characters[String(name).toLowerCase()];
        return character ? `${character.hp.current}/${character.hp.max}` : null;
    }
    
    function getCharacterLevel(name) {
        if (!name) return null;
        const characters = loadAllCharacters();
        const character = characters[String(name).toLowerCase()];
        return character ? character.level.toString() : null;
    }
    
    function getCharacterXP(name) {
        if (!name) return null;
        const characters = loadAllCharacters();
        const character = characters[String(name).toLowerCase()];
        return character ? `${character.xp.current}/${character.xp.max}` : null;
    }
    
    function getCharacterName(name) {
        if (!name) return null;
        const characters = loadAllCharacters();
        const character = characters[String(name).toLowerCase()];
        return character ? character.name : null;
    }
    
    function getCharacterAttribute(characterName, attrName) {
        if (!characterName || !attrName) return null;
        
        const characters = loadAllCharacters();
        const character = characters[String(characterName).toLowerCase()];
        if (!character) return null;
        
        const attrKey = String(attrName).toLowerCase();
        return character.attributes[attrKey] ? character.attributes[attrKey].toString() : null;
    }
    
    function getCharacterSkill(characterName, skillName) {
        if (!characterName || !skillName) return null;
        
        const characters = loadAllCharacters();
        const character = characters[String(characterName).toLowerCase()];
        if (!character) return null;
        
        const skillKey = String(skillName).toLowerCase();
        const skill = character.skills[skillKey];
        return skill ? `Level ${skill.level} (${skill.xp.current}/${skill.xp.max} XP)` : null;
    }
    
    function getCharacterInventory(name) {
        if (!name) return null;
        const characters = loadAllCharacters();
        const character = characters[String(name).toLowerCase()];
        if (!character) return null;
        
        const items = Object.entries(character.inventory || {})
            .filter(([item, qty]) => qty !== 0)
            .map(([item, qty]) => `${item}:${qty}`);
        
        return items.length > 0 ? `{${items.join(', ')}}` : '{}';
    }
    
    function getCharacterStat(characterName, statName) {
        if (!characterName || !statName) return null;
        
        const characters = loadAllCharacters();
        const character = characters[String(characterName).toLowerCase()];
        if (!character) return null;
        
        const statKey = String(statName).toLowerCase();
        
        // Check if it's HP (special case)
        if (statKey === 'hp') {
            return `${character.hp.current}/${character.hp.max}`;
        }
        
        // Check other core stats
        const stat = character.coreStats[statKey];
        return stat ? `${stat.current}/${stat.max}` : null;
    }
    
    // Time getter functions (Calendar API)
    function getCurrentTime() {
        if (typeof Calendar === 'undefined' || !Calendar.getCurrentTime) return null;
        return Calendar.getCurrentTime();
    }
    
    function getFormattedTime() {
        if (typeof Calendar === 'undefined' || !Calendar.getFormattedTime) return null;
        return Calendar.getFormattedTime();
    }
    
    function getTimeOfDay() {
        if (typeof Calendar === 'undefined' || !Calendar.getTimeOfDay) return null;
        return Calendar.getTimeOfDay();
    }
    
    function getCurrentDate() {
        if (typeof Calendar === 'undefined' || !Calendar.getCurrentDate) return null;
        return Calendar.getCurrentDate();
    }
    
    function getFormattedDate() {
        if (typeof Calendar === 'undefined' || !Calendar.getDayNumber) return null;
        
        const dayNumber = Calendar.getDayNumber();
        const startDate = new Date(2022, 10, 6); // Nov 6, 2022
        const currentDateObj = new Date(startDate);
        currentDateObj.setDate(startDate.getDate() + dayNumber);
        
        const year = currentDateObj.getFullYear();
        const month = String(currentDateObj.getMonth() + 1).padStart(2, '0');
        const day = String(currentDateObj.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    }
    
    function getDayNumber() {
        if (typeof Calendar === 'undefined' || !Calendar.getDayNumber) return null;
        return Calendar.getDayNumber().toString();
    }
    
    function getSeason() {
        if (typeof Calendar === 'undefined' || !Calendar.getCurrentSeason) return null;
        return Calendar.getCurrentSeason();
    }
    
    // ==========================
    // Scene Injection into Context
    // ==========================
    function createDefaultCurrentScene() {
        // Find the first [PLAYER] card to use as default
        const playerCard = Utilities.storyCard.find(
            card => card.title && card.title.startsWith('[PLAYER]'),
            false // Just get the first one
        );
        
        // Extract player name from card title or default to 'player'
        let playerName = 'player';
        if (playerCard) {
            const titleMatch = playerCard.title.match(/\[PLAYER\]\s+(.+)/);
            if (titleMatch) {
                playerName = titleMatch[1].trim().toLowerCase();
            }
        }
        
        const defaultText = (
            `[**Current Scene** Floor get_current_floor() | get_location(${playerName}) | get_formattedtime() (get_timeofday())\n` +
            `**Available Tools:**\n` +
            `• Location: update_location(name, place) discover_location(character, place, direction) connect_locations(placeA, placeB, direction)\n` +
            `  - Directions: north, south, east, west, inside (enter), outside (exit)\n` +
            `• SAO: advance_to_floor(character, floor) set_current_floor(floor) complete_floor(floor)\n` +
            `• Time: advance_time(hours, minutes)\n` +
            `• Inventory: add_item(name, item, qty) remove_item(name, item, qty) transfer_item(giver, receiver, item, qty)\n` +
            `• Relations: update_relationship(name1, name2, points)\n` +
            `• Quests: offer_quest(npc, quest, type) update_quest(player, quest, stage) complete_quest(player, quest)\n` +
            `• Progression: add_levelxp(name, amount) add_skillxp(name, skill, amount) unlock_newskill(name, skill)\n` +
            `• Stats: update_attribute(name, attribute, value) update_health(name, current, max)\n` +
            `• Combat: deal_damage(source, target, amount) death(name)]`
        );
        
        Utilities.storyCard.add({
            title: '[CURRENT SCENE]',
            type: 'data',
            entry: defaultText,
            description: 'Edit this card to customize what appears in the scene block. Use get_*(params) for dynamic values.'
        });
        
        if (debug) console.log(`${MODULE_NAME}: Created default Current Scene template with player: ${playerName}`);
        return defaultText;
    }
    
    function injectCurrentScene(contextText) {
        // If no history or very early in adventure, don't inject scene yet
        if (!history || history.length < 3) {
            return contextText;
        }
        
        // Get or create the Current Scene card
        let sceneCard = Utilities.storyCard.get('[CURRENT SCENE]');
        if (!sceneCard) {
            createDefaultCurrentScene();
            sceneCard = Utilities.storyCard.get('[CURRENT SCENE]');
        }
        
        // Just use the raw entry text - getters will be processed later
        const sceneText = sceneCard.entry;
        
        // Use -3 to give more breathing room for the actual scene
        const targetIndex = history.length - 3;
        const historyEntry = history[targetIndex];
        
        if (!historyEntry || !historyEntry.text) {
            return contextText;
        }
        
        const lastEntry = historyEntry.text;
        
        // Find where this history entry appears in the context
        const entryIndex = contextText.indexOf(lastEntry);
        if (entryIndex === -1) {
            return sceneText + '\n\n' + contextText;
        }
        
        // Find end of first sentence within that entry
        const firstSentenceMatch = lastEntry.match(/^[^.!?]+[.!?]/);
        if (!firstSentenceMatch) {
            return sceneText + '\n\n' + contextText;
        }
        
        const firstSentence = firstSentenceMatch[0];
        const insertPosition = entryIndex + firstSentence.length;
        
        // Check what comes after the first sentence
        const afterSentence = contextText.substring(insertPosition);
        let separator = '\n\n';
        if (afterSentence.startsWith('\n')) {
            separator = afterSentence.match(/^\n+/)[0].length >= 2 ? '' : '\n';
        }
        
        // Build the new context with scene inserted
        const beforeInsert = contextText.substring(0, insertPosition);
        const afterInsert = contextText.substring(insertPosition).trimStart();
        
        return beforeInsert + separator + sceneText + '\n\n' + afterInsert;
    }
    
    // ==========================
    // Tool Processors (converted to standard syntax)
    // ==========================
    const toolProcessors = {
        advance_time: function(hours, minutes) {
            hours = parseInt(hours) || 0;
            minutes = parseInt(minutes) || 0;
            
            // Both being 0 is malformed
            if (hours === 0 && minutes === 0) {
                if (debug) console.log(`${MODULE_NAME}: Invalid advance_time (0h 0m) - removing`);
                return 'malformed';
            }
            
            if (debug) console.log(`${MODULE_NAME}: Advancing time by ${hours}h ${minutes}m`);
            
            if (typeof Calendar !== 'undefined' && Calendar.advanceTime) {
                let timeStr = '';
                if (hours > 0) timeStr += hours + 'h';
                if (minutes > 0) timeStr += (timeStr ? ', ' : '') + minutes + 'm';
                
                const result = Calendar.advanceTime(timeStr);
                return result ? 'executed' : 'malformed';
            }
            return 'executed';
        },
        
        update_location: function(characterName, location) {
            if (!characterName || !location) return 'malformed';
            
            characterName = String(characterName).toLowerCase();
            location = String(location).toLowerCase().replace(/\s+/g, '_');
            
            const characters = loadAllCharacters();
            const character = characters[characterName];
            
            if (!character) {
                trackUnknownEntity(characterName, 'update_location', info?.actionCount);
                if (shouldTriggerGeneration(characterName)) {
                    addToEntityQueue(characterName);
                }
                if (debug) console.log(`${MODULE_NAME}: Unknown character ${characterName} referenced in update_location`);
            } else {
                character.location = location;
                saveCharacter(character);
                if (debug) console.log(`${MODULE_NAME}: ${character.name} moved to ${location}`);
            }
            
            return 'executed';
        },
        
        add_item: function(characterName, itemName, quantity) {
            if (!characterName || !itemName) return 'malformed';
            
            characterName = String(characterName).toLowerCase();
            itemName = String(itemName).toLowerCase().replace(/\s+/g, '_');
            quantity = parseInt(quantity);
            
            // 0 or invalid quantity is malformed
            if (isNaN(quantity) || quantity === 0) {
                if (debug) console.log(`${MODULE_NAME}: Invalid quantity for add_item: ${quantity}`);
                return 'malformed';
            }
            
            const characters = loadAllCharacters();
            const character = characters[characterName];
            
            if (!character) {
                if (debug) console.log(`${MODULE_NAME}: Character ${characterName} not found`);
                return 'executed'; // Still executed, just no character
            }
            
            const currentQty = character.inventory[itemName] || 0;
            const newQty = Math.max(0, currentQty + quantity);
            
            character.inventory[itemName] = newQty;
            if (debug) console.log(`${MODULE_NAME}: ${character.name}'s ${itemName}: ${currentQty} → ${newQty}`);
            
            saveCharacter(character);
            return 'executed';
        },
        
        remove_item: function(characterName, itemName, quantity) {
            if (!characterName || !itemName) return 'malformed';
            
            characterName = String(characterName).toLowerCase();
            itemName = String(itemName).toLowerCase().replace(/\s+/g, '_');
            quantity = parseInt(quantity);
            
            // 0 or invalid quantity is malformed
            if (isNaN(quantity) || quantity <= 0) {
                if (debug) console.log(`${MODULE_NAME}: Invalid quantity for remove_item: ${quantity}`);
                return 'malformed';
            }
            
            const characters = loadAllCharacters();
            const character = characters[characterName];
            
            if (!character) return 'executed';
            
            const currentQty = character.inventory[itemName] || 0;
            const removeQty = Math.min(currentQty, quantity);
            const newQty = currentQty - removeQty;
            
            if (newQty === 0) {
                delete character.inventory[itemName];
                if (debug) console.log(`${MODULE_NAME}: Removed all ${itemName} from ${character.name}`);
            } else {
                character.inventory[itemName] = newQty;
                if (debug) console.log(`${MODULE_NAME}: Removed ${removeQty} ${itemName} from ${character.name} (${currentQty} → ${newQty})`);
            }
            
            saveCharacter(character);
            return 'executed';
        },
        
        use_consumable: function(characterName, itemName, quantity) {
            // Identical validation to remove_item
            return toolProcessors.remove_item(characterName, itemName, quantity);
        },
        
        transfer_item: function(giverName, receiverName, itemName, quantity) {
            if (!giverName || !receiverName || !itemName) return 'malformed';
            
            giverName = String(giverName).toLowerCase();
            receiverName = String(receiverName).toLowerCase();
            itemName = String(itemName).toLowerCase().replace(/\s+/g, '_');
            const requestedQty = parseInt(quantity);
            
            // 0 or invalid quantity is malformed
            if (isNaN(requestedQty) || requestedQty <= 0) {
                if (debug) console.log(`${MODULE_NAME}: Invalid quantity for transfer_item: ${quantity}`);
                return 'malformed';
            }
            
            const characters = loadAllCharacters();
            const giver = characters[giverName];
            const receiver = characters[receiverName];
            
            // Track unknown entities
            if (!giver) {
                trackUnknownEntity(giverName, 'transfer_item', info?.actionCount);
                if (shouldTriggerGeneration(giverName)) {
                    addToEntityQueue(giverName);
                }
            }
            if (!receiver) {
                trackUnknownEntity(receiverName, 'transfer_item', info?.actionCount);
                if (shouldTriggerGeneration(receiverName)) {
                    addToEntityQueue(receiverName);
                }
            }
            
            let anySuccess = false;
            let transferQty = requestedQty;
            
            if (giver) {
                const availableQty = giver.inventory[itemName] || 0;
                transferQty = Math.min(availableQty, requestedQty);
                
                if (transferQty > 0) {
                    const newGiverQty = availableQty - transferQty;
                    if (newGiverQty === 0) {
                        delete giver.inventory[itemName];
                    } else {
                        giver.inventory[itemName] = newGiverQty;
                    }
                    
                    saveCharacter(giver);
                    anySuccess = true;
                    
                    if (debug) console.log(`${MODULE_NAME}: Removed ${transferQty} ${itemName} from ${giver.name}`);
                } else {
                    if (debug) console.log(`${MODULE_NAME}: ${giver.name} has no ${itemName} to transfer`);
                    return 'executed'; // Valid attempt, just no items
                }
            }
            
            if (receiver) {
                const currentReceiverQty = receiver.inventory[itemName] || 0;
                receiver.inventory[itemName] = currentReceiverQty + transferQty;
                
                saveCharacter(receiver);
                anySuccess = true;
                
                if (debug) console.log(`${MODULE_NAME}: Added ${transferQty} ${itemName} to ${receiver.name}`);
            }
            
            return anySuccess ? 'executed' : 'executed';
        },
        
        deal_damage: function(sourceName, targetName, damageAmount) {
            if (!targetName) return 'malformed';
            
            sourceName = sourceName ? String(sourceName).toLowerCase() : 'unknown';
            targetName = String(targetName).toLowerCase();
            damageAmount = parseInt(damageAmount);
            
            // 0 or negative damage is malformed
            if (isNaN(damageAmount) || damageAmount <= 0) {
                if (debug) console.log(`${MODULE_NAME}: Invalid damage amount: ${damageAmount}`);
                return 'malformed';
            }
            
            const characters = loadAllCharacters();
            const target = characters[targetName];
            const source = characters[sourceName];
            
            // Don't track for deal_damage - could be environmental/trap damage
            if (!target) {
                if (debug) console.log(`${MODULE_NAME}: Target ${targetName} not found`);
                return 'executed';
            }
            
            const sourceDisplay = source ? source.name : sourceName;
            
            const oldHP = target.hp.current;
            target.hp.current = Math.max(0, target.hp.current - damageAmount);
            const actualDamage = oldHP - target.hp.current;
            
            if (debug) {
                console.log(`${MODULE_NAME}: ${sourceDisplay} dealt ${actualDamage} damage to ${target.name} (${oldHP} → ${target.hp.current}/${target.hp.max})`);
            }
            
            saveCharacter(target);
            return 'executed';
        },
        
        add_levelxp: function(characterName, xpAmount) {
            if (!characterName) return 'malformed';
            
            characterName = String(characterName).toLowerCase();
            xpAmount = parseInt(xpAmount);
            
            // 0 or invalid XP is malformed
            if (isNaN(xpAmount) || xpAmount <= 0) {
                if (debug) console.log(`${MODULE_NAME}: Invalid XP amount: ${xpAmount}`);
                return 'malformed';
            }
            
            const characters = loadAllCharacters();
            const character = characters[characterName];
            
            if (!character) {
                trackUnknownEntity(characterName, 'add_levelxp', info?.actionCount);
                if (shouldTriggerGeneration(characterName)) {
                    addToEntityQueue(characterName);
                }
                return 'executed';
            }
            
            const schema = loadRPGSchema();
            character.xp.current += xpAmount;
            
            if (debug) console.log(`${MODULE_NAME}: Added ${xpAmount} XP to ${character.name} (${character.xp.current}/${character.xp.max})`);
            
            processLevelUp(character, schema);
            saveCharacter(character);
            return 'executed';
        },
        
        add_skillxp: function(characterName, skillName, xpAmount) {
            if (!characterName || !skillName) return 'malformed';
            
            characterName = String(characterName).toLowerCase();
            skillName = String(skillName).toLowerCase().replace(/\s+/g, '_');
            xpAmount = parseInt(xpAmount);
            
            // 0 or invalid XP is malformed
            if (isNaN(xpAmount) || xpAmount <= 0) {
                if (debug) console.log(`${MODULE_NAME}: Invalid skill XP amount: ${xpAmount}`);
                return 'malformed';
            }
            
            const characters = loadAllCharacters();
            const character = characters[characterName];
            
            if (!character) {
                trackUnknownEntity(characterName, 'add_skillxp', info?.actionCount);
                if (shouldTriggerGeneration(characterName)) {
                    addToEntityQueue(characterName);
                }
                return 'executed';
            }
            
            if (!character.skills[skillName]) {
                if (debug) console.log(`${MODULE_NAME}: Skill ${skillName} not found on ${character.name}`);
                return 'executed';
            }
            
            const schema = loadRPGSchema();
            const skill = character.skills[skillName];
            skill.xp.current += xpAmount;
            
            if (debug) console.log(`${MODULE_NAME}: Added ${xpAmount} XP to ${character.name}'s ${skillName} (${skill.xp.current}/${skill.xp.max})`);
            
            processSkillLevelUp(skill, skillName, schema);
            saveCharacter(character);
            return 'executed';
        },
        
        unlock_newskill: function(characterName, skillName) {
            if (!characterName || !skillName) return 'malformed';
            
            characterName = String(characterName).toLowerCase();
            skillName = String(skillName).toLowerCase().replace(/\s+/g, '_');
            
            const characters = loadAllCharacters();
            const character = characters[characterName];
            
            if (!character) {
                trackUnknownEntity(characterName, 'unlock_newskill', info?.actionCount);
                if (shouldTriggerGeneration(characterName)) {
                    addToEntityQueue(characterName);
                }
                return 'executed';
            }
            
            const schema = loadRPGSchema();
            
            if (!schema.skills.definitions[skillName]) {
                if (debug) console.log(`${MODULE_NAME}: Skill ${skillName} not in schema`);
                return 'executed';
            }
            
            if (character.skills[skillName]) {
                if (debug) console.log(`${MODULE_NAME}: ${character.name} already has ${skillName}`);
                return 'executed';
            }
            
            const maxXP = calculateSkillXPRequirement(skillName, 2, schema);
            character.skills[skillName] = {
                level: 1,
                xp: {
                    current: 0,
                    max: maxXP
                }
            };
            
            if (debug) console.log(`${MODULE_NAME}: ${character.name} learned ${skillName}!`);
            
            saveCharacter(character);
            return 'executed';
        },
        
        update_attribute: function(characterName, attrName, value) {
            if (!characterName || !attrName) return 'malformed';
            
            characterName = String(characterName).toLowerCase();
            attrName = String(attrName).toLowerCase();
            value = parseInt(value);
            
            if (isNaN(value) || value <= 0) {
                if (debug) console.log(`${MODULE_NAME}: Invalid attribute value: ${value}`);
                return 'malformed';
            }
            
            // ONLY validate against schema - data-driven!
            const schema = loadRPGSchema();
            
            if (!schema.attributes || Object.keys(schema.attributes).length === 0) {
                if (debug) console.log(`${MODULE_NAME}: No attributes defined in [RPG_SCHEMA] Attributes card`);
                return 'malformed';
            }
            
            const schemaAttrs = Object.keys(schema.attributes).map(a => a.toLowerCase());
            if (!schemaAttrs.includes(attrName)) {
                if (debug) console.log(`${MODULE_NAME}: Invalid attribute '${attrName}' - must be one of: ${schemaAttrs.join(', ')}`);
                return 'malformed';
            }
            
            const characters = loadAllCharacters();
            const character = characters[characterName];
            
            if (!character) return 'executed';
            
            character.attributes[attrName] = value;
            
            if (debug) console.log(`${MODULE_NAME}: Set ${character.name}'s ${attrName} to ${value}`);
            
            saveCharacter(character);
            return 'executed';
        },
        
        update_relationship: function(name1, name2, changeAmount) {
            if (!name1 || !name2) return 'malformed';
            
            name1 = String(name1).toLowerCase();
            name2 = String(name2).toLowerCase();
            changeAmount = parseInt(changeAmount);
            
            // 0 change is malformed (why call it?)
            if (isNaN(changeAmount) || changeAmount === 0) {
                if (debug) console.log(`${MODULE_NAME}: Invalid relationship change: ${changeAmount}`);
                return 'malformed';
            }
            
            const characters = loadAllCharacters();
            const char1 = characters[name1];
            const char2 = characters[name2];
            
            // Track unknown entities
            if (!char1) {
                trackUnknownEntity(name1, 'update_relationship', info?.actionCount);
                if (shouldTriggerGeneration(name1)) {
                    addToEntityQueue(name1);
                }
            }
            if (!char2) {
                trackUnknownEntity(name2, 'update_relationship', info?.actionCount);
                if (shouldTriggerGeneration(name2)) {
                    addToEntityQueue(name2);
                }
            }
            
            if (!char1 || !char2) {
                if (debug) console.log(`${MODULE_NAME}: One or both characters not found: ${name1}, ${name2}`);
                return 'executed';
            }
            
            // Update bidirectional relationships
            if (!char1.relationships[name2]) char1.relationships[name2] = 0;
            if (!char2.relationships[name1]) char2.relationships[name1] = 0;
            
            char1.relationships[name2] += changeAmount;
            char2.relationships[name1] += changeAmount;
            
            const flavorText1 = getRelationshipFlavor(char1.relationships[name2], char1.name, char2.name);
            const flavorText2 = getRelationshipFlavor(char2.relationships[name1], char2.name, char1.name);
            
            saveCharacter(char1);
            saveCharacter(char2);
            
            if (debug) {
                console.log(`${MODULE_NAME}: ${char1.name}→${char2.name}: ${flavorText1}`);
                console.log(`${MODULE_NAME}: ${char2.name}→${char1.name}: ${flavorText2}`);
            }
            
            return 'executed';
        },
        
        discover_location: function(characterName, locationName, direction) {
            // Validate inputs
            if (!characterName || !locationName || !direction) return 'malformed';
            
            characterName = String(characterName).toLowerCase();
            locationName = String(locationName).replace(/\s+/g, '_');
            direction = String(direction).toLowerCase();
            
            // Validate direction (cardinal directions + inside/outside for nested locations)
            const validDirections = ['north', 'south', 'east', 'west', 'inside', 'outside'];
            if (!validDirections.includes(direction)) {
                if (debug) console.log(`${MODULE_NAME}: Invalid direction: ${direction}. Valid: ${validDirections.join(', ')}`);
                return 'malformed';
            }
            
            // Get character's current location
            const characters = loadAllCharacters();
            const character = characters[characterName];
            
            if (!character) {
                if (debug) console.log(`${MODULE_NAME}: Character ${characterName} not found`);
                return 'malformed';
            }
            
            const currentLocation = character.location;
            
            // Check if location already exists
            const existingLocation = Utilities.storyCard.get(`[LOCATION] ${locationName}`);
            if (existingLocation) {
                if (debug) console.log(`${MODULE_NAME}: Location ${locationName} already exists - use connect_locations instead`);
                return 'malformed';
            }
            
            // Dynamically determine location header based on player's floor
            let locationHeaders = '<$# Locations>';
            
            // First, check the player's current floor
            // Find the first [PLAYER] card
            const playerCard = Utilities.storyCard.find(card => {
                return card.title && card.title.startsWith('[PLAYER]');
            }, false);
            
            let playerName = null;
            if (playerCard) {
                const match = playerCard.title.match(/\[PLAYER\]\s+(.+)/);
                if (match) {
                    playerName = match[1].trim();
                }
            }
            
            if (playerName) {
                const allChars = loadAllCharacters();
                const player = allChars[playerName.toLowerCase()];
                if (player) {
                    // Get current floor from runtime or default to 1
                    const currentFloor = getRuntimeValue('current_floor') || 1;
                    
                    // Convert floor number to words for header
                    const floorWords = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
                    let floorName;
                    if (currentFloor >= 0 && currentFloor < floorWords.length) {
                        floorName = 'Floor ' + floorWords[currentFloor];
                    } else {
                        floorName = 'Floor ' + currentFloor;
                    }
                    locationHeaders = '<$# Locations>\n<$## ' + floorName + '>';
                }
            }
            
            // Allow override via runtime variable if set
            const customHeader = getRuntimeValue('location_header');
            if (customHeader) {
                locationHeaders = customHeader; // User override takes precedence
            }
            
            // Create basic location card (will be enhanced by generation)
            // For inside/outside locations, adjust pathways accordingly
            let pathwaysList;
            if (direction === 'inside') {
                // Interior location - minimal pathways
                pathwaysList = (
                    '- Outside: ' + currentLocation + '\n' +
                    '- Inside: (unexplored)'  // For buildings with multiple rooms
                );
            } else if (direction === 'outside') {
                // Exterior location from interior - include all directions
                pathwaysList = (
                    '- Inside: ' + currentLocation + '\n' +
                    '- North: (unexplored)\n' +
                    '- South: (unexplored)\n' +
                    '- East: (unexplored)\n' +
                    '- West: (unexplored)'
                );
            } else {
                // Standard cardinal direction - include all options
                pathwaysList = (
                    '- ' + getOppositeDirection(direction) + ': ' + currentLocation + '\n' +
                    '- North: (unexplored)\n' +
                    '- South: (unexplored)\n' +
                    '- East: (unexplored)\n' +
                    '- West: (unexplored)\n' +
                    '- Inside: (unexplored)'  // Buildings can have interiors
                );
            }
            
            const locationEntry = (
                locationHeaders + '\n' +
                '## **' + locationName + '**\n' +
                'Type: Unknown | Terrain: Unexplored\n' +
                '### Description\n' +
                'An unexplored location. Details will be revealed upon first visit.\n' +
                '### Pathways\n' +
                pathwaysList
            );
            
            const snakeCased = locationName.toLowerCase();
            const spacedName = locationName.replace(/_/g, ' ');
            
            const locationCard = {
                title: `[LOCATION] ${locationName}`,
                type: 'Location',
                keys: `${snakeCased}, ${spacedName}`,  // Keys as comma-separated string
                entry: locationEntry,
                description: `Discovered by ${character.name} on turn ${info?.actionCount || 0}`
            };
            
            Utilities.storyCard.add(locationCard);
            
            // Update current location's pathway
            updateLocationPathway(currentLocation, direction, locationName);
            
            // Queue for generation if GenerationWizard is available
            if (typeof GenerationWizard !== 'undefined' && GenerationWizard.startGeneration) {
                GenerationWizard.startGeneration('Location', null, {
                    NAME: locationName,
                    metadata: {
                        from: currentLocation,
                        direction: direction,
                        discoveredBy: character.name
                    }
                });
            }
            
            if (debug) console.log(`${MODULE_NAME}: ${character.name} discovered ${locationName} to the ${direction}`);
            return 'executed';
        },
        
        connect_locations: function(locationA, locationB, directionFromA) {
            if (!locationA || !locationB || !directionFromA) return 'malformed';
            
            locationA = String(locationA).replace(/\s+/g, '_');
            locationB = String(locationB).replace(/\s+/g, '_');
            directionFromA = String(directionFromA).toLowerCase();
            
            // Validate direction (cardinal directions + inside/outside for nested locations)
            const validDirections = ['north', 'south', 'east', 'west', 'inside', 'outside'];
            if (!validDirections.includes(directionFromA)) {
                if (debug) console.log(`${MODULE_NAME}: Invalid direction: ${directionFromA}. Valid: ${validDirections.join(', ')}`);
                return 'malformed';
            }
            
            // Check both locations exist
            const cardA = Utilities.storyCard.get(`[LOCATION] ${locationA}`);
            const cardB = Utilities.storyCard.get(`[LOCATION] ${locationB}`);
            
            if (!cardA || !cardB) {
                if (debug) console.log(`${MODULE_NAME}: One or both locations not found`);
                return 'malformed';
            }
            
            // Update pathways bidirectionally
            updateLocationPathway(locationA, directionFromA, locationB);
            updateLocationPathway(locationB, getOppositeDirection(directionFromA), locationA);
            
            if (debug) console.log(`${MODULE_NAME}: Connected ${locationA} ${directionFromA} to ${locationB}`);
            return 'executed';
        },
        
        // TODO: Future resident management tools
        // add_resident: function(characterName, locationName, role) { }
        // remove_resident: function(characterName, locationName) { }
        
        accept_quest: function(playerName, questName, questGiver, questType) {
            // Must have all 4 parameters
            if (!playerName || !questName || !questGiver || !questType) return 'malformed';
            
            // Normalize quest type to lowercase - handle both "story" and "story_quest" formats
            let normalizedType = String(questType).toLowerCase();
            
            // Strip "_quest" suffix if present
            if (normalizedType.endsWith('_quest')) {
                normalizedType = normalizedType.substring(0, normalizedType.length - 6);
            }
            
            // Load quest types from schema
            const questSchema = Utilities.storyCard.get('[RPG_SCHEMA] Quest Types');
            let validTypes = ['story', 'side', 'hidden', 'raid']; // Default fallback
            let stageRanges = {};
            
            if (questSchema && questSchema.value) {
                const parsed = Utilities.config.load('[RPG_SCHEMA] Quest Types');
                validTypes = [];
                
                // Parse quest types and their stage counts
                for (const [type, stages] of Object.entries(parsed)) {
                    const typeLower = type.toLowerCase();
                    validTypes.push(typeLower);
                    
                    // Parse stage count - can be "min-max" or single number
                    const stageStr = String(stages);
                    if (stageStr.includes('-')) {
                        const [min, max] = stageStr.split('-').map(s => parseInt(s.trim()));
                        stageRanges[typeLower] = { min, max };
                    } else {
                        const exact = parseInt(stageStr);
                        stageRanges[typeLower] = { min: exact, max: exact };
                    }
                }
            } else {
                // Fallback to defaults if schema not found
                stageRanges = {
                    'story': { min: 3, max: 7 },
                    'side': { min: 2, max: 5 },
                    'hidden': { min: 3, max: 7 },
                    'raid': { min: 3, max: 7 }
                };
            }
            
            if (!validTypes.includes(normalizedType)) {
                if (debug) console.log(`${MODULE_NAME}: Invalid quest type: ${questType} (normalized: ${normalizedType}). Valid types: ${validTypes.join(', ')}`);
                return 'malformed';
            }
            
            // Check GenerationWizard availability
            if (typeof GenerationWizard === 'undefined') {
                if (debug) console.log(`${MODULE_NAME}: GenerationWizard not available`);
                return 'executed';
            }
            
            // Check if already generating
            if (GenerationWizard.isActive()) {
                if (debug) console.log(`${MODULE_NAME}: Generation already in progress`);
                return 'executed';
            }
            
            // Determine stage count based on type (using lowercase)
            const range = stageRanges[normalizedType];
            const stageCount = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
            
            if (debug) console.log(`${MODULE_NAME}: Starting quest generation - Name: ${questName}, Type: ${normalizedType}, Stages: ${stageCount}`);
            
            // Start generation with normalized lowercase type
            const started = GenerationWizard.startQuestGeneration(
                questName,
                questGiver,
                normalizedType,  // Pass lowercase version
                stageCount
            );
            
            if (debug) console.log(`${MODULE_NAME}: Quest generation ${started ? 'started' : 'failed to start'}`);
            
            return started ? 'executed' : 'malformed';
        },
        
        offer_quest: function(npcName, questName, questGiver, questType) {
            // Dummy tool - does nothing but is recognized as valid
            // TODO: Future implementation for NPC offering quests
            if (!npcName || !questName) return 'malformed';
            
            if (debug) console.log(`${MODULE_NAME}: TODO - offer_quest: ${npcName} offers ${questName}`);
            return 'executed';
        },
        
        update_quest: function(characterName, questName, objective, progress, total) {
            if (!questName) return 'malformed';
            
            questName = String(questName).toLowerCase().replace(/\s+/g, '_');
            
            // Get the quest card
            const questCard = Utilities.storyCard.get(`[QUEST] ${questName}`);
            if (!questCard) {
                if (debug) console.log(`${MODULE_NAME}: Quest ${questName} not found`);
                return 'unknown';  // Return unknown so it gets removed
            }
            
            // Parse the new stage number
            let newStage = 1;
            if (objective && !isNaN(parseInt(objective))) {
                newStage = parseInt(objective);
            } else if (progress && !isNaN(parseInt(progress))) {
                newStage = parseInt(progress);
            }
            
            // Replace "Current Stage: X" with the new value
            let entry = questCard.entry;
            entry = entry.replace(/Current Stage:\s*\d+/i, `Current Stage: ${newStage}`);
            
            // Update the card
            Utilities.storyCard.update(questCard.title, { entry: entry });
            
            if (debug) console.log(`${MODULE_NAME}: Updated ${questName} to stage ${newStage}`);
            return 'executed';
        },
        
        complete_quest: function(characterName, questName) {
            if (!characterName || !questName) return 'malformed';
            
            characterName = String(characterName).toLowerCase();
            questName = String(questName).toLowerCase().replace(/\s+/g, '_');
            
            // Find the quest card
            const questCard = Utilities.storyCard.get(`[QUEST] ${questName}`);
            if (!questCard) {
                if (debug) console.log(`${MODULE_NAME}: Quest ${questName} not found`);
                return 'executed';
            }
            
            // Replace the first line to mark as completed
            let entry = questCard.entry;
            entry = entry.replace(
                '<\$# Quests><\$## Active Quests>',
                '<\$# Quests><\$## Completed Quests>'
            );
            
            // Update the card
            Utilities.storyCard.update(questCard.title, { entry: entry });
            
            if (debug) console.log(`${MODULE_NAME}: Completed quest: ${questName}`);
            return 'executed';
        },

        abandon_quest: function(characterName, questName) {
            if (!characterName || !questName) return 'malformed';
            
            characterName = String(characterName).toLowerCase();
            questName = String(questName).toLowerCase().replace(/\s+/g, '_');
            
            // Find the quest card
            const questCard = Utilities.storyCard.get(`[QUEST] ${questName}`);
            if (!questCard) {
                if (debug) console.log(`${MODULE_NAME}: Quest ${questName} not found`);
                return 'executed';
            }
            
            // Replace the first line to mark as abandoned
            let entry = questCard.entry;
            entry = entry.replace(
                '<\$# Quests><\$## Active Quests>',
                '<\$# Quests><\$## Abandoned Quests>'
            );
            
            // Update the card
            Utilities.storyCard.update(questCard.title, { entry: entry });
            
            if (debug) console.log(`${MODULE_NAME}: Abandoned quest: ${questName}`);
            return 'executed';
        },
        
        death: function(characterName) {
            if (!characterName) return 'malformed';
            
            characterName = String(characterName).toLowerCase();
            if (debug) console.log(`${MODULE_NAME}: Death recorded for: ${characterName}`);
            return 'executed';
        },
        
        get_player_name: function() {
            // Find the first [PLAYER] card
            const playerCard = Utilities.storyCard.find(card => {
                return card.title && card.title.startsWith('[PLAYER]');
            }, false);
            
            let playerName = null;
            if (playerCard) {
                const match = playerCard.title.match(/\[PLAYER\]\s+(.+)/);
                if (match) {
                    playerName = match[1].trim();
                }
            }
            
            if (debug) console.log(`${MODULE_NAME}: Player name is: ${playerName}`);
            return playerName || 'unknown';
        },
        
        update_character_format: function(section, newTemplate) {
            if (!section || !newTemplate) return 'malformed';
            
            // Get current character format
            const formatCard = Utilities.storyCard.get('[RPG_SCHEMA] Character Format');
            if (!formatCard) {
                if (debug) console.log(`${MODULE_NAME}: Character Format card not found`);
                return 'malformed';
            }
            
            // Parse the current format
            const lines = formatCard.entry.split('\n');
            let inSection = null;
            let updatedLines = [];
            let sectionUpdated = false;
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const trimmed = line.trim();
                
                // Check for section headers
                if (trimmed.startsWith('# ')) {
                    inSection = trimmed.substring(2).toLowerCase().replace(/\s+/g, '_');
                    updatedLines.push(line);
                } else if (inSection === section.toLowerCase().replace(/\s+/g, '_')) {
                    // We're in the target section - replace the template line
                    if (!sectionUpdated && trimmed !== '' && !trimmed.startsWith('#')) {
                        updatedLines.push(newTemplate);
                        sectionUpdated = true;
                        // Skip the original line
                    } else {
                        updatedLines.push(line);
                    }
                } else {
                    updatedLines.push(line);
                }
            }
            
            if (!sectionUpdated) {
                if (debug) console.log(`${MODULE_NAME}: Section ${section} not found in Character Format`);
                return 'malformed';
            }
            
            // Update the card
            Utilities.storyCard.update('[RPG_SCHEMA] Character Format', {
                entry: updatedLines.join('\n')
            });
            
            if (debug) console.log(`${MODULE_NAME}: Updated character format section: ${section}`);
            return 'executed';
        }
    };
    
    // ==========================
    // Entity Tracking System
    // ==========================
    function loadEntityTrackerConfig() {
        // Use centralized sectioned config loader
        const sections = Utilities.config.loadSectioned('[RPG_RUNTIME] Entity Tracker Config', '# ');
        
        if (Object.keys(sections).length === 0) {
            createEntityTrackerCards();
            return {
                threshold: 5,
                autoGenerate: true,
                blacklist: ['player', 'self', 'me', 'you', 'unknown']
            };
        }
        
        return {
            threshold: parseInt(sections.entity_threshold) || 5,
            autoGenerate: (sections.auto_generate || 'true').toLowerCase() === 'true',
            blacklist: sections.entity_blacklist ? 
                sections.entity_blacklist.split(',').map(s => s.trim().toLowerCase()) : 
                ['player', 'self', 'me', 'you', 'unknown']
        };
    }
    
    function trackUnknownEntity(entityName, toolName, turnNumber) {
        if (!entityName) return;
        
        // Normalize entity name to lowercase for consistent tracking
        entityName = entityName.toLowerCase();
        
        // Check if this character already exists in story cards
        const characterCards = Utilities.storyCard.find(card => {
            if (!card.title.startsWith('[CHARACTER]') && !card.title.startsWith('[PLAYER]')) {
                return false;
            }
            
            // Check if title matches
            const titleMatch = card.title.match(/\[(CHARACTER|PLAYER)\]\s+(.+)/);
            if (titleMatch && titleMatch[2] && titleMatch[2].toLowerCase() === entityName) {
                return true;
            }
            
            // Check if any key matches
            const keyMatch = card.entry.match(/Keys:\s*([^\n]+)/i);
            if (keyMatch) {
                const keys = keyMatch[1].split(',').map(k => k.trim().toLowerCase());
                if (keys.includes(entityName)) {
                    return true;
                }
            }
            
            return false;
        }, true);
        
        // If character already exists, don't track
        if (characterCards && characterCards.length > 0) {
            if (debug) console.log(`${MODULE_NAME}: Skipping tracking for existing character: ${entityName}`);
            return;
        }
        
        // Load and check blacklist from config
        const config = loadEntityTrackerConfig();
        if (config.blacklist && config.blacklist.includes(entityName)) return;
        
        // Load tracker from config card's description field
        const configCard = Utilities.storyCard.get('[RPG_RUNTIME] Entity Tracker Config');
        if (!configCard) {
            createEntityTrackerCards();
            return;
        }
        
        let tracker = {};
        if (configCard.description) {
            try {
                // Parse tracker data from description
                const lines = configCard.description.split('\n');
                let currentEntity = null;
                
                for (const line of lines) {
                    if (line.startsWith('# ')) {
                        currentEntity = line.substring(2).trim();
                        tracker[currentEntity] = { count: 0, uniqueTurns: [], lastTool: '' };
                    } else if (currentEntity && line.includes(':')) {
                        const [key, value] = line.split(':').map(s => s.trim());
                        if (key === 'turns') {
                            tracker[currentEntity].uniqueTurns = value ? value.split(',').map(Number) : [];
                            tracker[currentEntity].count = tracker[currentEntity].uniqueTurns.length;
                        } else if (key === 'tool') {
                            tracker[currentEntity].lastTool = value || '';
                        }
                    }
                }
            } catch (e) {
                tracker = {};
            }
        }
        
        // Use provided turn number or default to 0
        const currentTurn = turnNumber || 0;
        
        // Initialize entity tracking if needed
        if (!tracker[entityName]) {
            tracker[entityName] = {
                count: 0,
                uniqueTurns: [],
                lastTool: ''
            };
        }
        
        // Only track if this is a new turn for this entity
        if (!tracker[entityName].uniqueTurns.includes(currentTurn)) {
            tracker[entityName].uniqueTurns.push(currentTurn);
            tracker[entityName].count++;
        }
        
        tracker[entityName].lastTool = toolName;
        
        // Save updated tracker to config card's description
        let description = '// Entity tracking data\n';
        for (const [name, data] of Object.entries(tracker)) {
            description += `# ${name}\n`;
            description += `turns: ${data.uniqueTurns.join(',')}\n`;
            description += `tool: ${data.lastTool}\n`;
        }
        
        Utilities.storyCard.update('[RPG_RUNTIME] Entity Tracker Config', {
            description: description
        });
        
        if (debug) console.log(`${MODULE_NAME}: Tracked unknown entity ${entityName} (unique turns: ${tracker[entityName].uniqueTurns.length})`);
    }
    
    function shouldTriggerGeneration(entityName) {
        const config = loadEntityTrackerConfig();
        if (!config.autoGenerate) return false;
        
        // Normalize entity name
        entityName = entityName.toLowerCase();
        
        // Load tracker from config card's description
        const configCard = Utilities.storyCard.get('[RPG_RUNTIME] Entity Tracker Config');
        if (!configCard || !configCard.description) return false;
        
        let tracker = {};
        try {
            // Parse tracker data from description
            const lines = configCard.description.split('\n');
            let currentEntity = null;
            
            for (const line of lines) {
                if (line.startsWith('# ')) {
                    currentEntity = line.substring(2).trim();
                    tracker[currentEntity] = { count: 0, uniqueTurns: [], lastTool: '' };
                } else if (currentEntity && line.includes(':')) {
                    const [key, value] = line.split(':').map(s => s.trim());
                    if (key === 'turns') {
                        tracker[currentEntity].uniqueTurns = value ? value.split(',').map(Number) : [];
                        tracker[currentEntity].count = tracker[currentEntity].uniqueTurns.length;
                    } else if (key === 'tool') {
                        tracker[currentEntity].lastTool = value || '';
                    }
                }
            }
        } catch (e) {
            return false;
        }
        
        const entityData = tracker[entityName];
        if (!entityData) return false;
        
        // Check if already in queue or being generated
        const queueCard = Utilities.storyCard.get('[RPG_RUNTIME] Entity Queue');
        let queue = [];
        if (queueCard) {
            try {
                queue = JSON.parse(queueCard.entry || '[]');
            } catch (e) {
                queue = [];
            }
        }
        
        if (queue.includes(entityName) || currentEntityGeneration === entityName) {
            return false;
        }
        
        // Check that we have enough unique turns (not total references)
        const hasEnoughUniqueTurns = entityData.uniqueTurns && entityData.uniqueTurns.length >= config.threshold;
        
        return hasEnoughUniqueTurns;
    }
    
    function addToEntityQueue(entityName) {
        // Normalize entity name
        entityName = entityName.toLowerCase();
        
        // Instead of queuing, directly trigger GenerationWizard if available
        if (typeof GenerationWizard !== 'undefined' && GenerationWizard.startGeneration) {
            if (debug) console.log(`${MODULE_NAME}: Triggering GenerationWizard for entity: ${entityName}`);
            // Start NPC generation for the unknown entity
            GenerationWizard.startGeneration('NPC', {name: entityName});
            return;
        }
        
        // Fallback to queue system if GenerationWizard not available
        const queueCard = Utilities.storyCard.get('[RPG_RUNTIME] Entity Queue');
        let queue = [];
        if (queueCard) {
            try {
                queue = JSON.parse(queueCard.entry || '[]');
            } catch (e) {
                queue = [];
            }
        }
        
        // Avoid duplicates
        if (!queue.includes(entityName)) {
            queue.push(entityName);
            
            // Save queue to Story Card
            Utilities.storyCard.update('[RPG_RUNTIME] Entity Queue', {
                entry: JSON.stringify(queue, null, 2),
                type: 'data'
            });
            
            if (debug) console.log(`${MODULE_NAME}: Added ${entityName} to entity generation queue`);
        }
    }
    
    function queuePendingEntities() {
        // Load queue from Story Card
        const queueCard = Utilities.storyCard.get('[RPG_RUNTIME] Entity Queue');
        if (!queueCard) return false;
        
        let queue = [];
        try {
            queue = JSON.parse(queueCard.entry || '[]');
        } catch (e) {
            return false;
        }
        
        // If already generating something, wait
        if (currentEntityGeneration) {
            if (debug) console.log(`${MODULE_NAME}: Already generating ${currentEntityGeneration}, waiting...`);
            return false;
        }
        
        // If queue is empty, nothing to do
        if (queue.length === 0) {
            return false;
        }
        
        // Pop the first entity from queue
        const nextEntity = queue.shift();
        
        // Save updated queue
        Utilities.storyCard.update('[RPG_RUNTIME] Entity Queue', {
            entry: JSON.stringify(queue, null, 2),
            type: 'data'
        });
        
        // Mark as currently generating
        currentEntityGeneration = nextEntity;
        
        if (debug) console.log(`${MODULE_NAME}: Starting generation for ${nextEntity}`);
        
        // Trigger GenerationWizard if available
        if (typeof GenerationWizard !== 'undefined' && GenerationWizard.startEntityGeneration) {
            // Start the classification query process
            const classificationData = {
                name: nextEntity,
                stage: 'classification'
            };
            GenerationWizard.startEntityGeneration(classificationData);
            return true;
        } else {
            if (debug) console.log(`${MODULE_NAME}: GenerationWizard not available for entity generation`);
            // Clear the current generation flag since we can't proceed
            currentEntityGeneration = null;
            return false;
        }
    }
    
    function completeEntityGeneration(entityName) {
        // Normalize entity name
        entityName = entityName.toLowerCase();
        
        // Clear from tracker in config card's description
        const configCard = Utilities.storyCard.get('[RPG_RUNTIME] Entity Tracker Config');
        if (configCard && configCard.description) {
            try {
                // Parse tracker data from description
                const lines = configCard.description.split('\n');
                let tracker = {};
                let currentEntity = null;
                
                for (const line of lines) {
                    if (line.startsWith('# ')) {
                        currentEntity = line.substring(2).trim();
                        if (currentEntity !== entityName) {
                            tracker[currentEntity] = { uniqueTurns: [], lastTool: '' };
                        }
                    } else if (currentEntity && currentEntity !== entityName && line.includes(':')) {
                        const [key, value] = line.split(':').map(s => s.trim());
                        if (key === 'turns') {
                            tracker[currentEntity].uniqueTurns = value ? value.split(',').map(Number) : [];
                        } else if (key === 'tool') {
                            tracker[currentEntity].lastTool = value || '';
                        }
                    }
                }
                
                // Rebuild description without the completed entity
                let description = '// Entity tracking data\n';
                for (const [name, data] of Object.entries(tracker)) {
                    description += `# ${name}\n`;
                    description += `turns: ${data.uniqueTurns.join(',')}\n`;
                    description += `tool: ${data.lastTool}\n`;
                }
                
                Utilities.storyCard.update('[RPG_RUNTIME] Entity Tracker Config', {
                    description: description
                });
            } catch (e) {
                // Ignore parse errors
            }
        }
        
        // Clear current generation flag
        currentEntityGeneration = null;
        
        if (debug) console.log(`${MODULE_NAME}: Completed generation for ${entityName}`);
        
        // Process next in queue if any
        queuePendingEntities();
    }
    
    // ==========================
    // Process Tools in Text
    // ==========================
    function processTools(text) {
        if (!text) return text;
        
        let modifiedText = text;
        let toolsToRemove = [];
        let toolsToModify = [];
        let executedTools = [];  // Track for RewindSystem
        
        // First pass: find and execute all tools, track malformed ones and ones to modify
        let match;
        TOOL_PATTERN.lastIndex = 0;
        
        while ((match = TOOL_PATTERN.exec(text)) !== null) {
            const fullMatch = match[0];
            const toolName = match[1];
            const paramString = match[2];
            const matchIndex = match.index;
            
            // Skip getter functions (they're not tools)
            if (toolName.startsWith('get_')) {
                continue;
            }
            
            if (debug) console.log(`${MODULE_NAME}: Found tool: ${toolName}(${paramString})`);
            
            // Parse parameters
            const params = parseParameters(paramString);
            
            // Capture revert data BEFORE executing the tool
            const revertData = captureRevertData(toolName.toLowerCase(), params);
            
            let result = processToolCall(toolName, params);
            
            // Track executed tools for RewindSystem
            if (result === 'executed') {
                executedTools.push({
                    tool: toolName.toLowerCase(),
                    params: params,
                    executed: true,
                    revertData: revertData
                });
            }
            
            // Check if this is accept_quest and needs parameter normalization
            if (toolName === 'accept_quest' && result === 'executed') {
                // Normalize the quest type parameter in the visible text
                const normalizedParams = [...params];
                if (normalizedParams[3]) {
                    let questType = String(normalizedParams[3]).toLowerCase();
                    // Remove _quest suffix if present
                    if (questType.endsWith('_quest')) {
                        questType = questType.substring(0, questType.length - 6);
                    }
                    normalizedParams[3] = questType;
                }
                
                // Build the normalized tool string
                const normalizedTool = `${toolName}(${normalizedParams.join(', ')})`;
                
                if (normalizedTool !== fullMatch) {
                    toolsToModify.push({
                        match: fullMatch,
                        replacement: normalizedTool,
                        index: matchIndex,
                        length: fullMatch.length
                    });
                    if (debug) console.log(`${MODULE_NAME}: Normalizing: ${fullMatch} -> ${normalizedTool}`);
                }
            }
            
            // Only remove if malformed or unknown tool
            if (result === 'malformed' || result === 'unknown') {
                toolsToRemove.push({
                    match: fullMatch,
                    index: matchIndex,
                    length: fullMatch.length,
                    reason: result
                });
                if (debug) console.log(`${MODULE_NAME}: Marking for removal (${result}): ${fullMatch}`);
            }
        }
        
        // Apply modifications and removals from end to beginning
        const allChanges = [...toolsToModify, ...toolsToRemove].sort((a, b) => b.index - a.index);
        
        for (const change of allChanges) {
            const before = modifiedText.substring(0, change.index);
            const after = modifiedText.substring(change.index + change.length);
            
            if (change.replacement) {
                // Modification (normalize parameters)
                modifiedText = before + change.replacement + after;
            } else {
                // Removal (malformed/unknown)
                let cleanedBefore = before;
                let cleanedAfter = after;
                
                // Handle spacing issues
                if (before.endsWith(' ') && after.startsWith(' ')) {
                    cleanedAfter = after.substring(1);
                } else if (before.endsWith(' ') && after.startsWith('.')) {
                    cleanedBefore = before.trimEnd();
                }
                
                modifiedText = cleanedBefore + cleanedAfter;
            }
        }
        
        // Final cleanup: fix any double spaces or weird punctuation spacing
        modifiedText = modifiedText
            .replace(/  +/g, ' ')           // Multiple spaces to single space
            .replace(/ \./g, '.')            // Space before period
            .replace(/ ,/g, ',')             // Space before comma
            .replace(/ !/g, '!')             // Space before exclamation
            .replace(/ \?/g, '?')            // Space before question mark
            .replace(/\( /g, '(')            // Space after opening paren
            .replace(/ \)/g, ')')            // Space before closing paren
            .replace(/\n\n\n+/g, '\n\n');   // Multiple newlines to double newline
        
        // Return both the modified text and executed tools
        // We'll record them in the main output hook
        return { modifiedText, executedTools };
    }
    
    // Capture revert data for specific tools
    function captureRevertData(toolName, params) {
        const characters = loadAllCharacters();
        const revertData = {};
        
        switch(toolName) {
            case 'update_location':
                const char = characters[String(params[0]).toLowerCase()];
                if (char) revertData.oldLocation = char.location;
                break;
                
            case 'add_item':
                // No revert data needed - we just remove it on revert
                revertData.added = true;
                break;
                
            case 'remove_item':
                // Store that we removed it so we can add it back
                revertData.removed = true;
                break;
                
            case 'transfer_item':
                // Store the original transfer direction
                revertData.from = params[0];
                revertData.to = params[1];
                break;
                
            case 'deal_damage':
                const target = characters[String(params[1]).toLowerCase()];
                if (target && target.hp) {
                    revertData.oldHp = target.hp.current;
                }
                break;
                
            case 'update_relationship':
                const char1 = characters[String(params[0]).toLowerCase()];
                if (char1 && char1.relationships) {
                    const char2Name = String(params[1]).toLowerCase();
                    revertData.oldValue = char1.relationships[char2Name] || 0;
                }
                break;
                
            // Add more as needed
        }
        
        return revertData;
    }
    
    function processToolCall(toolName, params) {
        // Normalize tool name to lowercase for lookup
        const normalizedToolName = toolName.toLowerCase();
        
        // Check if it's a known tool
        if (toolProcessors[normalizedToolName]) {
            // Execute the tool
            const result = toolProcessors[normalizedToolName](...params);
            return result;
        }
        
        // Check for dynamic core stat tools (update_hp, update_mp, etc from schema)
        if (normalizedToolName.startsWith('update_')) {
            const schema = loadRPGSchema();
            const format = loadCharacterFormat();
            
            // Special handling for update_max_* pattern
            if (normalizedToolName.startsWith('update_max_')) {
                let statName = normalizedToolName.substring(11);
                
                // Check custom field mappings first (e.g., max_health -> hp.max)
                const customMapping = format.customFields[`max_${statName}`];
                if (customMapping && customMapping.includes('.')) {
                    // Extract the base stat name from mapping (e.g., hp.max -> hp)
                    statName = customMapping.split('.')[0];
                }
                
                // Check if it's a valid core stat from schema (case-insensitive)
                const upperStatName = statName.toUpperCase();
                const coreStatKeys = Object.keys(schema.coreStats).map(k => k.toUpperCase());
                if (coreStatKeys.includes(upperStatName)) {
                    processCoreStatTool(normalizedToolName, params);
                    return 'executed';
                }
            } else {
                // Check for update_[stat] pattern
                let statName = normalizedToolName.substring(7);
                
                // Check custom field mappings first (e.g., health -> hp.current)
                const customMapping = format.customFields[statName];
                if (customMapping && customMapping.includes('.')) {
                    // Extract the base stat name from mapping (e.g., hp.current -> hp)
                    statName = customMapping.split('.')[0];
                }
                
                // Check if it's a valid core stat from schema (case-insensitive)
                const upperStatName = statName.toUpperCase();
                const coreStatKeys = Object.keys(schema.coreStats).map(k => k.toUpperCase());
                if (coreStatKeys.includes(upperStatName)) {
                    processCoreStatTool(normalizedToolName, params);
                    return 'executed';
                }
            }
        }
        
        // Unknown tool
        if (debug) console.log(`${MODULE_NAME}: Unknown tool: ${toolName}`);
        return 'unknown';
    }
    
    function processCoreStatTool(toolName, params) {
        const schema = loadRPGSchema();
        const characterName = String(params[0]).toLowerCase();
        
        // Check for update_max_[stat] pattern
        if (toolName.startsWith('update_max_')) {
            let statName = toolName.substring(11);
            const format = loadCharacterFormat();
            
            // Check custom field mappings first
            const customMapping = format.customFields[`max_${statName}`];
            if (customMapping && customMapping.includes('.')) {
                // Extract the base stat name from mapping
                statName = customMapping.split('.')[0];
            }
            
            // Find the matching core stat (case-insensitive)
            const upperStatName = statName.toUpperCase();
            const matchingStatKey = Object.keys(schema.coreStats).find(k => k.toUpperCase() === upperStatName);
            
            if (!matchingStatKey) {
                if (debug) console.log(`${MODULE_NAME}: Unknown core stat: ${statName}`);
                return false;
            }
            
            const characters = loadAllCharacters();
            const character = characters[characterName];
            if (!character) {
                if (debug) console.log(`${MODULE_NAME}: Character ${characterName} not found`);
                return false;
            }
            
            const newMax = parseInt(params[1]);
            if (isNaN(newMax)) {
                if (debug) console.log(`${MODULE_NAME}: Invalid max value: ${params[1]}`);
                return false;
            }
            
            // Update max value
            if (matchingStatKey.toUpperCase() === 'HP') {
                character.hp.max = newMax;
                if (character.hp.current > newMax) {
                    character.hp.current = newMax;
                }
            } else {
                const statKey = matchingStatKey.toLowerCase();
                if (!character.coreStats[statKey]) {
                    character.coreStats[statKey] = { current: newMax, max: newMax };
                } else {
                    character.coreStats[statKey].max = newMax;
                    if (character.coreStats[statKey].current > newMax) {
                        character.coreStats[statKey].current = newMax;
                    }
                }
            }
            
            saveCharacter(character);
            if (debug) console.log(`${MODULE_NAME}: Set ${character.name}'s max ${statName} to ${newMax}`);
            return true;
        }
        
        // Check for update_[stat] pattern (current/max format)
        let statName = toolName.substring(7);
        const format = loadCharacterFormat();
        
        // Check custom field mappings first
        const customMapping = format.customFields[statName];
        if (customMapping && customMapping.includes('.')) {
            // Extract the base stat name from mapping
            statName = customMapping.split('.')[0];
        }
        
        // Find the matching core stat (case-insensitive)
        const upperStatName = statName.toUpperCase();
        const matchingStatKey = Object.keys(schema.coreStats).find(k => k.toUpperCase() === upperStatName);
        
        if (!matchingStatKey) {
            if (debug) console.log(`${MODULE_NAME}: Unknown core stat: ${statName}`);
            return false;
        }
        
        const characters = loadAllCharacters();
        const character = characters[characterName];
        if (!character) {
            if (debug) console.log(`${MODULE_NAME}: Character ${characterName} not found`);
            return false;
        }
        
        // Parse current/max - can be two params or one "current/max" string
        let current, max;
        if (params[1] && String(params[1]).includes('/')) {
            const parts = String(params[1]).split('/');
            current = parseInt(parts[0]);
            max = parseInt(parts[1]);
        } else {
            current = parseInt(params[1]);
            max = parseInt(params[2]);
        }
        
        if (isNaN(current) || isNaN(max)) {
            if (debug) console.log(`${MODULE_NAME}: Invalid format for ${statName}`);
            return false;
        }
        
        if (matchingStatKey.toUpperCase() === 'HP') {
            character.hp.current = current;
            character.hp.max = max;
        } else {
            const statKey = matchingStatKey.toLowerCase();
            if (!character.coreStats[statKey]) {
                character.coreStats[statKey] = {};
            }
            character.coreStats[statKey].current = current;
            character.coreStats[statKey].max = max;
        }
        
        saveCharacter(character);
        if (debug) console.log(`${MODULE_NAME}: Set ${character.name}'s ${statName} to ${current}/${max}`);
        return true;
    }
    
    // ==========================
    // Debug Helper Functions (only work when debug = true)
    // ==========================
    
    function debugTest(testName) {
        if (!debug) return "Debug mode disabled - set debug = true on line 4";
        
        const tests = {
            // Test GenerationWizard activation
            gw_activate: () => {
                if (typeof GenerationWizard === 'undefined') return "<<<GenerationWizard not available>>>";
                GenerationWizard.activate();
                return "\n<<<GenerationWizard activated - next input triggers selection>>>\n";
            },
            
            // Test entity generation for NPC
            gw_npc: () => {
                if (typeof GenerationWizard === 'undefined') return "<<<GenerationWizard not available>>>";
                const result = GenerationWizard.startGeneration('NPC', {name: 'Debug_Test_NPC'});
                const progressCard = Utilities.storyCard.get('[ENTITY_GEN] In Progress');
                const isActive = GenerationWizard.isActive();
                console.log(`[DEBUG] Started NPC generation for Debug_Test_NPC\nResult: ${result}\nActive: ${isActive}\nProgress card exists: ${progressCard ? 'yes' : 'no'}`);
                return "\n<<<Started NPC generation for Debug_Test_NPC>>>\n";
            },
            
            // Test entity generation for Monster  
            gw_monster: () => {
                if (typeof GenerationWizard === 'undefined') return "<<<GenerationWizard not available>>>";
                GenerationWizard.startGeneration('Monster', {name: 'Debug_Test_Monster'});
                return "\n<<<Started Monster generation for Debug_Test_Monster>>>\n";
            },
            
            // Test entity generation for Boss
            gw_boss: () => {
                if (typeof GenerationWizard === 'undefined') return "<<<GenerationWizard not available>>>";
                GenerationWizard.startGeneration('Boss', {name: 'Debug_Test_Boss'});
                return "\n<<<Started Boss generation for Debug_Test_Boss>>>\n";
            },
            
            // Test entity generation for Item
            gw_item: () => {
                if (typeof GenerationWizard === 'undefined') return "<<<GenerationWizard not available>>>";
                GenerationWizard.startGeneration('Item', {name: 'Debug_Test_Item'});
                return "\n<<<Started Item generation for Debug_Test_Item>>>\n";
            },
            
            // Test entity generation for Location
            gw_location: () => {
                if (typeof GenerationWizard === 'undefined') return "<<<GenerationWizard not available>>>";
                GenerationWizard.startGeneration('Location', null, {NAME: 'Debug_Test_Location'});
                return "\n<<<Started Location generation for Debug_Test_Location>>>\n";
            },
            
            // Test entity generation for Quest
            gw_quest: () => {
                if (typeof GenerationWizard === 'undefined') return "<<<GenerationWizard not available>>>";
                GenerationWizard.startGeneration('Quest', {name: 'Debug_Test_Quest'});
                return "\n<<<Started Quest generation for Debug_Test_Quest>>>\n";
            },
            
            // Force entity tracker trigger
            entity_trigger: () => {
                const testEntity = 'debug_goblin';
                for (let turn = 1; turn <= 5; turn++) {
                    trackUnknownEntity(testEntity, 'deal_damage', turn * 100);
                }
                return `Triggered entity tracking for '${testEntity}' - should queue for generation`;
            },
            
            // Test character creation
            char_create: () => {
                const char = createCharacter({
                    name: 'Debug_Character',
                    type: 'NPC',
                    level: 10,
                    attributes: { vitality: 15, strength: 12, dexterity: 10, agility: 8 },
                    hp: { current: 150, max: 150 },
                    location: 'debug_zone'
                });
                saveCharacter(char);
                return `Created Debug_Character: ${JSON.stringify(char, null, 2)}`;
            },
            
            // List all characters
            char_list: () => {
                const chars = loadAllCharacters();
                const names = Object.keys(chars);
                return `Characters (${names.length}): ${names.join(', ')}`;
            },
            
            // Show entity tracker status
            entity_status: () => {
                const config = loadEntityTrackerConfig();
                const configCard = Utilities.storyCard.get('[RPG_RUNTIME] Entity Tracker Config');
                const queueCard = Utilities.storyCard.get('[RPG_RUNTIME] Entity Queue');
                
                let status = `Entity Tracker Status:\n`;
                status += `- Threshold: ${config.threshold}\n`;
                status += `- Auto Generate: ${config.autoGenerate}\n`;
                status += `- Blacklist: ${config.blacklist.join(', ')}\n`;
                
                if (configCard && configCard.description) {
                    const lines = configCard.description.split('\n').filter(l => l.startsWith('# '));
                    status += `- Tracking ${lines.length} entities\n`;
                }
                
                if (queueCard && queueCard.entry) {
                    const queued = queueCard.entry.split('\n').filter(l => l.trim()).length;
                    status += `- ${queued} entities in queue`;
                }
                
                return status;
            },
            
            // Test runtime variable operations
            runtime_test: () => {
                const vars = loadRuntimeVariables();
                const testVar = 'debug_test_var';
                
                // Try to set a test variable
                if (!vars[testVar]) {
                    return `Variable '${testVar}' not declared. Add '${testVar}: string' to [RPG_RUNTIME] Variables`;
                }
                
                setRuntimeValue(testVar, 'test_value_' + Date.now());
                const value = getRuntimeValue(testVar);
                return `Set ${testVar} = ${value}`;
            },
            
            // Test update_health tool recognition
            health_tool: () => {
                let results = [];
                
                // Create test character if needed
                const testChar = createCharacter({
                    name: 'Debug_Character',
                    isPlayer: false,
                    attributes: { STR: 10 }
                });
                results.push(`Created test character: ${testChar.name}`);
                
                // Test various health tool formats
                const tools = [
                    'update_health',
                    'update_HEALTH',
                    'update_Health',
                    'update_hp',
                    'update_HP',
                    'update_max_health',
                    'update_max_hp'
                ];
                
                for (const tool of tools) {
                    const result = processToolCall(tool, ['debug_character', '50/100']);
                    results.push(`${tool}: ${result}`);
                }
                
                // Check the character's health
                const char = loadCharacter('Debug_Character');
                if (char) {
                    results.push(`Final HP: ${char.hp.current}/${char.hp.max}`);
                }
                
                return results.join('\n');
            },
            
            // Show all schemas
            schema_all: () => {
                const schemas = [
                    '[RPG_SCHEMA] Attributes',
                    '[RPG_SCHEMA] Core Stats', 
                    '[RPG_SCHEMA] Skills',
                    '[RPG_SCHEMA] Character Format',
                    '[RPG_SCHEMA] Level Progression'
                ];
                
                let result = "=== All Schemas ===\n";
                for (const title of schemas) {
                    const card = Utilities.storyCard.get(title);
                    if (card) {
                        result += `\n${title}:\n${card.entry.substring(0, 200)}...\n`;
                    }
                }
                return result;
            },
            
            // Clear all test entities
            cleanup: () => {
                const testNames = ['Debug_Test_NPC', 'Debug_Test_Monster', 'Debug_Test_Boss', 
                                 'Debug_Test_Item', 'Debug_Test_Location', 'Debug_Test_Quest',
                                 'Debug_Character'];
                let removed = 0;
                
                for (const name of testNames) {
                    if (Utilities.storyCard.remove(`[CHARACTER] ${name}`)) removed++;
                    if (Utilities.storyCard.remove(`[PLAYER] ${name}`)) removed++;
                    if (Utilities.storyCard.remove(`[ENTITY_GEN] ${name}`)) removed++;
                }
                
                // Clear entity tracker data
                Utilities.storyCard.update('[RPG_RUNTIME] Entity Tracker Data', {
                    entry: '// Entity tracking data\n// Format: # entity_name\n// tool_name:turn1,turn2,...'
                });
                
                // Clear entity queue
                Utilities.storyCard.update('[RPG_RUNTIME] Entity Queue', {
                    entry: ''
                });
                
                return `Cleanup complete - removed ${removed} test entities, cleared tracker and queue`;
            }
        };
        
        if (!tests[testName]) {
            return `Unknown test: ${testName}\nAvailable tests:\n${Object.keys(tests).join('\n')}`;
        }
        
        try {
            return tests[testName]();
        } catch (e) {
            return `Test failed: ${e.toString()}`;
        }
    }
    
    // Handle debug commands directly
    function handleDebugCommand(commandName, args) {
        const debugCommands = [
            'gw_activate', 'gw_npc', 'gw_monster', 'gw_boss', 
            'gw_item', 'gw_location', 'gw_quest',
            'entity_trigger', 'entity_status', 
            'char_create', 'char_list',
            'runtime_test', 'schema_all', 'cleanup', 'debug_help'
        ];
        
        // Check if it's a debug command
        if (debugCommands.includes(commandName)) {
            if (commandName === 'debug_help') {
                return `\n<<<[DEBUG COMMANDS]\n${debugCommands.filter(c => c !== 'debug_help').map(c => `/${c}`).join('\n')}>>>\n`;
            }
            
            const result = debugTest(commandName);
            // Return the result as-is (already has hidden markers)
            return result;
        }
        
        return null;
    }
    
    // Expose debug function to global API if debug mode is on
    if (debug) {
        GameState.debugTest = debugTest;
        console.log(`${MODULE_NAME}: Debug test functions available - use GameState.debugTest('test_name')`);
        console.log(`${MODULE_NAME}: Available tests: gw_activate, gw_npc, gw_monster, gw_boss, gw_item, gw_location, gw_quest`);
        console.log(`${MODULE_NAME}: Also: entity_trigger, entity_status, char_create, char_list, runtime_test, health_tool, schema_all, cleanup`);
    }
    
    // ==========================
    // Hook Processing
    // ==========================

    // Auto-initialize runtime cards on first run
    if (!Utilities.storyCard.get('[RPG_RUNTIME] Variables') || 
        !Utilities.storyCard.get('[RPG_RUNTIME] INPUT_COMMANDS')) {
        createSampleRuntimeCards();
    }
    
    // Auto-initialize entity tracker cards
    if (!Utilities.storyCard.get('[RPG_RUNTIME] Entity Tracker Config')) {
        createEntityTrackerCards();
    }

    // Auto-initialize schema cards on first run
    if (!Utilities.storyCard.get('[RPG_SCHEMA] Attributes')) {
        createDefaultAttributesSchema();
    }
    if (!Utilities.storyCard.get('[RPG_SCHEMA] Core Stats')) {
        createDefaultCoreStatsSchema();
    }
    if (!Utilities.storyCard.get('[RPG_SCHEMA] Skills')) {
        createDefaultSkillsSchema();
    }
    if (!Utilities.storyCard.get('[RPG_SCHEMA] Level Progression')) {
        createDefaultLevelProgressionSchema();
    }
    if (!Utilities.storyCard.get('[RPG_SCHEMA] Relationship Thresholds')) {
        createDefaultRelationshipThresholds();
    }

    switch(hook) {
        case 'input':
            if (debug) console.log(`${MODULE_NAME}: Input received: "${text}"`);
            
            // Load input systems
            loadInputCommands();
            loadInputModifier();
            
            // Apply INPUT_MODIFIER first (pure JavaScript sandbox)
            if (inputModifier) {
                try {
                    text = inputModifier(text);
                    if (debug) console.log(`${MODULE_NAME}: Applied input modifier`);
                } catch(e) {
                    if (debug) console.log(`${MODULE_NAME}: Input modifier error: ${e}`);
                }
            }
            
            // Check for INPUT_COMMANDS anywhere in the text
            // Pattern: /commandname or /commandname args
            const commandPattern = /\/([a-z_]+)(?:\s+([^\n/]*))?/gi;
            let commandResults = [];
            let match;
            
            while ((match = commandPattern.exec(text)) !== null) {
                const commandName = match[1].toLowerCase();
                const argsString = match[2] || '';
                const args = argsString.trim().split(/\s+/).filter(arg => arg);
                
                if (debug) console.log(`${MODULE_NAME}: Found command: /${commandName} with args: [${args.join(', ')}]`);
                
                // Check debug commands first (only when debug mode is on)
                if (debug) {
                    const debugResult = handleDebugCommand(commandName, args);
                    if (debugResult) {
                        console.log(`${MODULE_NAME}: Debug command handled: ${commandName}`);
                        console.log(`${MODULE_NAME}: Debug command result: ${debugResult}`);
                        commandResults.push(debugResult);
                        continue;
                    }
                }
                
                // Check custom commands
                if (inputCommands[commandName]) {
                    const result = inputCommands[commandName](args);
                    if (result !== null && result !== undefined) {
                        if (debug) console.log(`${MODULE_NAME}: Command /${commandName} returned: ${result}`);
                        commandResults.push(result);
                        continue;
                    }
                }
                
                // Check built-in commands
                const processed = processPlayerCommand(`/${commandName} ${args.join(' ')}`);
                if (processed.handled) {
                    commandResults.push(processed.output);
                }
            }
            
            // If any commands were processed, return their combined results
            if (commandResults.length > 0) {
                return commandResults.join('\n');
            }
            
            // If GenerationWizard is active, delegate to it
            if (typeof GenerationWizard !== 'undefined' && GenerationWizard.isActive()) {
                const result = GenerationWizard.process('input', text);
                return result.active ? '\n' : text;  // Block input if wizard is active
            }
            
            return text;
            
        case 'context':
            // Clear caches for fresh load (before initialization)
            runtimeVariablesCache = null;
            characterCache = null;
            schemaCache = null;
            
            // Initialize runtime system
            initializeRuntimeVariables();
            
            // Check for edits in history (RewindSystem)
            RewindSystem.handleContext();
            
            // Load context modifier
            loadContextModifier();
            
            // Remove any hidden message markers from previous turns (including surrounding newlines)
            let modifiedText = text.replace(/\n*<<<[^>]*>>>\n*/g, '');
            
            // Inject current scene into the context text
            modifiedText = injectCurrentScene(modifiedText);
            
            // Process all getters in the entire context
            modifiedText = processGetters(modifiedText);
            
            // Build trigger name to username mapping and replace in tool usages
            const triggerNameMap = {};
            const charactersWithTriggers = Utilities.storyCard.find((card) => {
                return (card.type === 'character' || card.title?.startsWith('[CHARACTER]')) &&
                       card.description?.includes('Trigger Name:');
            }, true); // true = return all matches
            
            // Get current action count for cleanup check
            const currentTurn = info?.actionCount || 0;
            
            // Build the mapping and clean up old trigger names
            for (const charCard of charactersWithTriggers) {
                const triggerMatch = charCard.description.match(/Trigger Name: ([^\n]+)/);
                const usernameMatch = charCard.entry.match(/^##\s+\*\*([^*]+)\*\*/);
                const turnMatch = charCard.description.match(/Generated by GenerationWizard on turn (\d+)/);
                
                if (triggerMatch && usernameMatch) {
                    const triggerName = triggerMatch[1];
                    const username = usernameMatch[1];
                    const generatedTurn = turnMatch ? parseInt(turnMatch[1]) : 0;
                    
                    // Check if trigger name should be cleaned up (10+ turns old and not in context)
                    if (currentTurn - generatedTurn >= 10) {
                        // Check if trigger name still exists in the context
                        const triggerPattern = new RegExp(`\\b${triggerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
                        if (!triggerPattern.test(modifiedText)) {
                            // Remove trigger name from description
                            const newDescription = charCard.description.replace(/\nTrigger Name: [^\n]+/, '');
                            Utilities.storyCard.update(charCard.title, { description: newDescription });
                            
                            if (debug) {
                                console.log(`${MODULE_NAME}: Cleaned up trigger name "${triggerName}" from ${charCard.title} (${currentTurn - generatedTurn} turns old)`);
                            }
                            continue; // Skip adding to map since we cleaned it up
                        }
                    }
                    
                    if (triggerName !== username) {
                        triggerNameMap[triggerName] = username;
                    }
                }
            }
            
            // Single pass replacement of all trigger names in tool usages
            if (Object.keys(triggerNameMap).length > 0) {
                // Build regex pattern for all trigger names
                const triggerNames = Object.keys(triggerNameMap).map(name => 
                    name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                ).join('|');
                
                const toolPattern = new RegExp(
                    `(\\w+\\()\\s*(${triggerNames})\\s*(,|\\))`,
                    'gi'
                );
                
                modifiedText = modifiedText.replace(toolPattern, (match, func, triggerName, delimiter) => {
                    const username = triggerNameMap[triggerName] || triggerName;
                    if (debug && username !== triggerName) {
                        console.log(`${MODULE_NAME}: Replaced trigger name "${triggerName}" with "${username}" in tool usage`);
                    }
                    return `${func}${username}${delimiter}`;
                });
            }
            
            // Check if GenerationWizard needs to append prompts
            if (typeof GenerationWizard !== 'undefined') {
                const isActive = GenerationWizard.isActive();
                if (debug) console.log(`${MODULE_NAME}: GenerationWizard active check: ${isActive}`);
                
                if (isActive) {
                    const result = GenerationWizard.process('context', modifiedText);
                    if (debug) console.log(`${MODULE_NAME}: GenerationWizard.process result: active=${result.active}, text length before=${modifiedText.length}, after=${result.text ? result.text.length : 'null'}`);
                    if (result.active) {
                        modifiedText = result.text;  // Use wizard's modified context (with prompts appended)
                    }
                }
            } else {
                if (debug) console.log(`${MODULE_NAME}: GenerationWizard not available`);
            }
            
            // Apply CONTEXT_MODIFIER if available
            if (contextModifier) {
                try {
                    // Create context for the modifier
                    const context = {
                        getRuntimeValue: getRuntimeValue,
                        setRuntimeValue: setRuntimeValue,
                        loadCharacter: function(name) {
                            const chars = loadAllCharacters();
                            return chars[name.toLowerCase()];
                        },
                        Utilities: Utilities,
                        Calendar: typeof Calendar !== 'undefined' ? Calendar : null
                    };
                    
                    // Apply modifier with context
                    // If it's already a function, just call it with context
                    if (typeof contextModifier === 'function') {
                        modifiedText = contextModifier.call(context, modifiedText);
                    }
                    
                    if (debug) console.log(`${MODULE_NAME}: Applied context modifier`);
                } catch(e) {
                    if (debug) console.log(`${MODULE_NAME}: Context modifier error: ${e}`);
                }
            }
            
            return modifiedText;  // Return the fully modified text
            
        case 'output':
            // Log raw output in debug mode
            if (debug) {
                console.log(`${MODULE_NAME}: Raw output from AI:`);
                console.log(text);
            }
            
            // Load output modifier
            loadOutputModifier();
            
            // Check if GenerationWizard is processing
            if (typeof GenerationWizard !== 'undefined' && GenerationWizard.isActive()) {
                const result = GenerationWizard.process('output', text);
                if (result.active) {
                    return result.text;  // Return wizard's output (hidden message)
                }
            }

            loadRuntimeTools();
            
            // Process tools in LLM's output
            if (text) {
                const result = processTools(text);
                let modifiedText = result.modifiedText;
                const executedTools = result.executedTools || [];
                
                // Record this output immediately - it will become history next turn
                // Use the current data position + 1 if we're tracking, otherwise use history length
                const data = RewindSystem.getStorage();
                const futurePosition = data.position !== undefined ? data.position + 1 : (history ? history.length : 0);
                RewindSystem.recordAction(text, executedTools, futurePosition);
                // Log message removed - recordAction logs internally
                
                // Check if any entities need generation
                const entityQueued = queuePendingEntities();
                
                // Check if GenerationWizard was triggered by any tool or entity generation
                if (typeof GenerationWizard !== 'undefined' && GenerationWizard.isActive()) {
                    // Add warning that GM will take control next turn
                    modifiedText += '\n\n<<<The GM will use the next turn to think. Use `/GW abort` if undesired.>>>';
                    if (debug) console.log(`${MODULE_NAME}: GenerationWizard activated, adding warning to output`);
                } else if (entityQueued) {
                    // Entity generation was triggered
                    modifiedText += '\n\n<<<The GM will generate a new entity next turn. Use `/GW abort` if undesired.>>>';
                    if (debug) console.log(`${MODULE_NAME}: Entity generation triggered, adding warning to output`);
                }
                
                // Apply OUTPUT_MODIFIER if available (pure JavaScript sandbox)
                if (outputModifier) {
                    try {
                        modifiedText = outputModifier(modifiedText);
                        if (debug) console.log(`${MODULE_NAME}: Applied output modifier`);
                    } catch(e) {
                        if (debug) console.log(`${MODULE_NAME}: Output modifier error: ${e}`);
                    }
                }
                
                // Clear caches after processing
                characterCache = null;
                // Clear runtime cache to force refresh on next access
                runtimeVariablesCache = null;
                
                return modifiedText;
            }
            break;
    }
    
    // Public API
    GameState.injectCurrentScene = injectCurrentScene;
    GameState.processTools = processTools;
    GameState.processGetters = processGetters;
    GameState.getRuntimeValue = getRuntimeValue;
    GameState.setRuntimeValue = setRuntimeValue;
    GameState.loadAllCharacters = loadAllCharacters;
    GameState.loadCharacter = function(name) {
        const chars = loadAllCharacters();
        return chars[name.toLowerCase()];
    };
    GameState.saveCharacter = saveCharacter;
    GameState.createCharacter = createCharacter;
    GameState.getPlayerName = function() {
        // Find the first [PLAYER] card
        const playerCard = Utilities.storyCard.find(card => {
            return card.title && card.title.startsWith('[PLAYER]');
        }, false); // false = return first match only
        
        if (playerCard) {
            // Extract name from title: [PLAYER] Name
            const match = playerCard.title.match(/\[PLAYER\]\s+(.+)/);
            if (match) {
                return match[1].trim();
            }
        }
        
        if (debug) console.log(`${MODULE_NAME}: No [PLAYER] card found`);
        return null;
    };
    
    // Entity tracking API
    GameState.completeEntityGeneration = completeEntityGeneration;
    GameState.loadEntityTrackerConfig = loadEntityTrackerConfig;
    
    // Rewind System API
    GameState.RewindSystem = RewindSystem;
    
    // Field accessor methods
    GameState.getCharacterField = getCharacterField;
    GameState.setCharacterField = setCharacterField;
    GameState.getField = function(characterName, fieldPath) {
        const character = GameState.loadCharacter(characterName);
        if (!character) return null;
        return getCharacterField(character, fieldPath);
    };
    GameState.setField = function(characterName, fieldPath, value) {
        const character = GameState.loadCharacter(characterName);
        if (!character) return false;
        
        setCharacterField(character, fieldPath, value);
        return saveCharacter(character);
    };
    GameState.modifyField = function(characterName, fieldPath, delta) {
        const current = GameState.getField(characterName, fieldPath);
        if (current === null || typeof current !== 'number') return false;
        
        return GameState.setField(characterName, fieldPath, current + delta);
    };
    
    return GameState;
}
