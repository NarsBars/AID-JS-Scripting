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
                
                if (debug) console.log(`${MODULE_NAME}: Starting at ${Utilities.format.formatTime(hour, minute)} (one-time only)`);
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
        return Utilities.format.formatTime(hour, minute);
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
                description: Utilities.format.formatTime(hour, minute),
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
            let config = loadConfiguration();
            if (!config) {
                if (debug) console.log(`${MODULE_NAME}: Time system requires configuration to function`);
                createDefaultConfiguration();
                
                if (!Utilities.storyCard.exists(EVENT_CARD_PREFIX)) {
                    createDefaultEventDays();
                }
                
                // Try to load again after creation
                config = loadConfiguration();
                if (!config) {
                    if (debug) console.log(`${MODULE_NAME}: Failed to load configuration after creation`);
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
    const PROGRESS_CARD = '[GW] In Progress';
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
        
        // Create location data with component structure
        const locationData = {
            name: formattedName,
            
            // Info component
            info: {
                type: collectedData.LOCATION_TYPE || 'Unknown',
                terrain: collectedData.TERRAIN || null,
                description: collectedData.DESCRIPTION || 'An unexplored location.',
                features: collectedData.FEATURES || null,
                floor: collectedData.FLOOR || 1,
                district: collectedData.DISTRICT || null
            },
            
            // Pathways for connections
            pathways: {}
        };
        
        // Add return path if we know where we came from
        if (metadata && metadata.from && metadata.direction) {
            const oppositeDir = getOppositeDirection(metadata.direction).toLowerCase();
            locationData.pathways[oppositeDir] = metadata.from;
        }
        
        // Add unexplored paths for other directions
        const allDirections = ['north', 'south', 'east', 'west'];
        for (const dir of allDirections) {
            if (!locationData.pathways[dir]) {
                locationData.pathways[dir] = '(unexplored)';
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
        
        // Use GameState to save the location if available
        if (typeof GameState !== 'undefined' && GameState.save) {
            if (GameState.save('Location', locationData)) {
                if (debug) console.log(`${MODULE_NAME}: Created location ${formattedName} using GameState`);
                
                // Update the connecting location's pathways if needed
                if (metadata && metadata.from && metadata.direction) {
                    updateLocationPathway(metadata.from, metadata.direction, formattedName);
                }
                
                // Signal completion if GameState has a handler
                if (GameState.completeLocationGeneration) {
                    GameState.completeLocationGeneration(formattedName);
                }
                return;
            }
        }
        
        // Fallback to manual creation if GameState not available
        // Build display value
        let displayValue = `<$# Locations>\n## **${name}**\n`;
        displayValue += `Floor: ${locationData.info.floor || 'Floor One'} | Type: ${locationData.info.type || 'Unknown'}\n`;
        if (locationData.info.safe_zone) {
            displayValue += `**Safe Zone** - No damage can occur\n`;
        }
        displayValue += `**Description**\n${locationData.info.description}`;
        
        // Add connections if any
        if (locationData.pathways && Object.keys(locationData.pathways).length > 0) {
            displayValue += '\n**Connections**';
            for (const [dir, dest] of Object.entries(locationData.pathways)) {
                if (dest && dest !== '(unexplored)') {
                    displayValue += `\n• ${dir.charAt(0).toUpperCase() + dir.slice(1)}: ${dest.replace(/_/g, ' ')}`;
                }
            }
        }
        
        // Build proper JSON data structure
        const jsonData = {
            name: formattedName,
            type: 'Location',
            info: locationData.info,
            pathways: locationData.pathways || {},
            features: []
        };
        
        const card = {
            title: `[LOCATION] ${formattedName}`,
            type: 'location',
            value: displayValue,
            description: `<== REAL DATA ==>\n${JSON.stringify(jsonData, null, 2)}\n<== END DATA ==>`
        };
        
        Utilities.storyCard.add(card);
        
        if (debug) console.log(`${MODULE_NAME}: Created location ${formattedName} (fallback method)`);
        
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
        // Try to update using GameState first
        if (typeof GameState !== 'undefined' && GameState.load && GameState.save) {
            const location = GameState.load('Location', locationName);
            if (location) {
                // Update pathways (not connections - matching the JSON structure)
                if (!location.pathways) location.pathways = {};
                location.pathways[direction.toLowerCase()] = destinationName;
                
                // Save the updated location
                if (GameState.save('Location', location)) {
                    if (debug) console.log(`${MODULE_NAME}: Updated ${locationName} pathway ${direction} to ${destinationName}`);
                    return;
                }
            }
        }
        
        // Fallback to manual update
        const card = Utilities.storyCard.get(`[LOCATION] ${locationName}`);
        if (!card) return;
        
        // Update the REAL DATA in description field
        if (card.description && card.description.includes('<== REAL DATA ==>')) {
            try {
                const data = parseEntityData(card.description);
                if (data) {
                    if (!data.pathways) data.pathways = {};
                    data.pathways[direction.toLowerCase()] = destinationName;
                    
                    // Rebuild the description with updated data
                    const newDescription = buildEntityData('Location', data);
                    Utilities.storyCard.update(card.title, { description: newDescription });
                    
                    if (debug) console.log(`${MODULE_NAME}: Updated ${locationName} pathway ${direction} to ${destinationName} (fallback)`);
                }
            } catch (e) {
                if (debug) console.log(`${MODULE_NAME}: Failed to update pathway: ${e}`);
            }
        }
    }
    
    // Helper function to parse entity data from description
    function parseEntityData(description) {
        if (!description) return null;
        
        const startMarker = '<== REAL DATA ==>';
        const endMarker = '<== END DATA ==>';
        
        const startIdx = description.indexOf(startMarker);
        const endIdx = description.indexOf(endMarker);
        
        if (startIdx === -1 || endIdx === -1) return null;
        
        const dataSection = description.substring(startIdx + startMarker.length, endIdx).trim();
        
        // Try to parse as JSON first (new format)
        try {
            return JSON.parse(dataSection);
        } catch (e) {
            // Fallback to old format parsing if JSON fails
            const data = {};
            let currentSection = null;
            
            const lines = dataSection.split('\n');
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                
                if (trimmed.startsWith('## ')) {
                    currentSection = trimmed.substring(3).toLowerCase();
                    if (currentSection === 'identifier') {
                        currentSection = null; // Parse identifier fields at root level
                    }
                } else if (trimmed.includes(':')) {
                    const colonIdx = trimmed.indexOf(':');
                    const key = trimmed.substring(0, colonIdx).trim();
                    const value = trimmed.substring(colonIdx + 1).trim();
                    
                    if (currentSection) {
                        if (!data[currentSection]) data[currentSection] = {};
                        // Try to parse JSON for objects
                        if (value.startsWith('{') || value.startsWith('[')) {
                            try {
                                data[currentSection] = JSON.parse(value);
                            } catch {
                                data[currentSection][key] = value.replace(/^"|"$/g, '');
                            }
                        } else {
                            data[currentSection][key] = value.replace(/^"|"$/g, '');
                        }
                    } else {
                        data[key] = value.replace(/^"|"$/g, '');
                    }
                }
            }
            
            return data;
        }
    }
    
    // Helper function to build entity data for description
    function buildEntityData(type, data) {
        // Use JSON format for all new data
        const jsonData = {
            name: data.name,
            type: type,
            ...data
        };
        return `<== REAL DATA ==>\n${JSON.stringify(jsonData, null, 2)}\n<== END DATA ==>`;
    }
    
    // ==========================
    // Character Data Transformation
    // ==========================
    function transformToCharacterData(collectedData, triggerName) {
        // Create character data with proper component structure
        const characterData = {
            name: collectedData.NAME,
            
            // Stats component with nested level/xp structure
            stats: {
                level: {
                    value: parseInt(collectedData.LEVEL) || 1,
                    xp: {
                        current: 0,
                        max: parseInt(collectedData.XP_MAX) || 1000
                    }
                },
                hp: {
                    current: parseInt(collectedData.HP) || parseInt(collectedData.MAX_HP) || 100,
                    max: parseInt(collectedData.MAX_HP) || parseInt(collectedData.HP) || 100
                }
            },
            
            // Info component
            info: {
                full_name: collectedData.FULL_NAME || null,
                gender: collectedData.GENDER || '???',
                race: collectedData.RACE || null,
                class: collectedData.CLASS || null,
                location: collectedData.DEFAULT_LOCATION || collectedData.LOCATION || getPlayerLocation() || 'unknown',
                faction: collectedData.FACTION || null
            },
            
            // Other components (empty by default)
            attributes: {},
            skills: {},
            inventory: {},
            relationships: {}
        };
        
        // Store trigger name and generation turn in info component if provided
        if (triggerName) {
            characterData.info.trigger_name = triggerName;
            characterData.info.generation_turn = info?.actionCount || 0;
        }
        
        // Combine appearance fields into single field in info component
        if (collectedData.HAIR || collectedData.EYES || collectedData.BUILD) {
            const appearanceParts = [];
            if (collectedData.HAIR) appearanceParts.push(`Hair: ${collectedData.HAIR}`);
            if (collectedData.EYES) appearanceParts.push(`Eyes: ${collectedData.EYES}`);
            if (collectedData.BUILD) appearanceParts.push(`Build: ${collectedData.BUILD}`);
            characterData.info.appearance = appearanceParts.join(' | ');
        } else if (collectedData.APPEARANCE) {
            // Fallback to old APPEARANCE field if present
            characterData.info.appearance = collectedData.APPEARANCE;
        }
        
        // Map personality and background to info component
        if (collectedData.PERSONALITY) {
            characterData.info.personality = collectedData.PERSONALITY;
        }
        if (collectedData.BACKGROUND || collectedData.BACKSTORY) {
            characterData.info.background = collectedData.BACKGROUND || collectedData.BACKSTORY;
        }
        
        // HP is now handled via stats.hp.current and stats.hp.max above
        // No separate hp object needed
        
        // Map attributes
        const attributeNames = ['VITALITY', 'STRENGTH', 'DEXTERITY', 'AGILITY', 'INTELLIGENCE', 'WISDOM', 'CHARISMA', 'LUCK'];
        for (const attr of attributeNames) {
            if (collectedData[attr]) {
                // Use uppercase keys for attributes with proper value structure
                characterData.attributes[attr] = { value: parseInt(collectedData[attr]) || 10 };
            }
        }
        
        // If no attributes were provided, set defaults
        if (Object.keys(characterData.attributes).length === 0) {
            characterData.attributes = {
                VITALITY: { value: 10 },
                STRENGTH: { value: 10 },
                DEXTERITY: { value: 10 },
                AGILITY: { value: 10 }
            };
        }
        
        // Parse skills if provided (format: "skill_name: Level X")
        if (collectedData.SKILLS) {
            const skillLines = collectedData.SKILLS.split('\n');
            for (const line of skillLines) {
                const match = line.match(/(.+?):\s*Level\s+(\d+)/i);
                if (match) {
                    const skillName = match[1].trim().toLowerCase().replace(/\s+/g, '_');
                    // Skills need level and xp structure
                    characterData.skills[skillName] = {
                        level: parseInt(match[2]) || 1,
                        xp: { current: 0, max: 100 }
                    };
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
                        // Use proper {quantity: n} format
                        characterData.inventory[itemName] = { quantity: qty };
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
        
        // For quests, we need to count differently since some fields are predefined
        let completedCount;
        let totalFields;
        
        if (progress.entityType === 'Quest') {
            // Count only the non-predefined fields that we actually ask for
            const fieldsToCount = ['DESCRIPTION', 'STAGES', 'REWARDS'];
            completedCount = fieldsToCount.filter(field => progress.collectedData[field]).length;
            totalFields = fieldsToCount.length;
        } else {
            // For other entities, count all fields except internal ones
            completedCount = Object.keys(progress.collectedData).filter(key => 
                key !== 'name' && key !== 'REWARDS_PARSED'
            ).length;
            totalFields = activeFields.length;
        }
        
        entry += `**Progress:** ${completedCount} of ${totalFields} fields collected\n\n`;
        
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
        contextSection += `Name: ${collectedData.NAME || 'Not specified'}\n`;
        contextSection += `Giver: ${collectedData.QUEST_GIVER || 'Not specified'}\n`;
        contextSection += `Type: ${questType || 'Not specified'}\n`;
        contextSection += `Stages: ${stageCount || 'Not specified'}\n`;
        
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
            log(`${MODULE_NAME}: parseBatchedResponse called with ${lines.length} lines`);
            log(`${MODULE_NAME}: Raw response: "${response}"`);
            log(`${MODULE_NAME}: Fields to parse: ${fields.map(f => f.name).join(', ')}`);
        }
        
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            
            if (debug && line.trim()) {
                log(`${MODULE_NAME}: Line ${lineIndex}: "${line}"`);
                log(`${MODULE_NAME}: Line length: ${line.length}, trimmed length: ${line.trim().length}`);
            }
            
            // Trim the line before matching to handle leading/trailing spaces
            const trimmedLine = line.trim();
            
            for (const field of fields) {
                // Look for "FIELD_NAME: value" pattern
                const regex = new RegExp(`^${field.name}:\\s*(.+)`, 'i');
                
                if (debug) {
                    log(`${MODULE_NAME}: Testing regex /${regex.source}/${regex.flags} against trimmed line`);
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
            // CRITICAL: Enforce snake_case for all names to prevent system breakage
            const snakeCased = trimmedValue.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
            
            if (snakeCased !== trimmedValue.toLowerCase().replace(/[^a-z0-9_]/g, '')) {
                if (debug) console.log(`${MODULE_NAME}: Converting NAME to snake_case: "${trimmedValue}" -> "${snakeCased}"`);
            }
            
            // Check for duplicate usernames using GameState
            if (typeof GameState !== 'undefined' && GameState.load) {
                const existingCharacter = GameState.load('Character', snakeCased);
                if (existingCharacter) {
                    if (debug) console.log(`${MODULE_NAME}: Name "${snakeCased}" already exists, silently rejecting`);
                    // Return invalid without error message - AI will just retry
                    return { 
                        valid: false
                    };
                }
            } else {
                // Fallback: check story cards directly
                const existingCard = Utilities.storyCard.get(`[CHARACTER] ${snakeCased}`) || 
                                     Utilities.storyCard.get(`[PLAYER] ${snakeCased}`);
                if (existingCard) {
                    if (debug) console.log(`${MODULE_NAME}: Name "${snakeCased}" already exists, silently rejecting`);
                    // Return invalid without error message - AI will just retry
                    return { 
                        valid: false
                    };
                }
            }
            
            // Return the snake_cased version
            return { valid: true, value: snakeCased };
        }
        
        // Enforce snake_case for quest givers too
        if (field.name === 'QUEST_GIVER') {
            const snakeCased = trimmedValue.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
            if (debug && snakeCased !== trimmedValue.toLowerCase().replace(/[^a-z0-9_]/g, '')) {
                console.log(`${MODULE_NAME}: Converting QUEST_GIVER to snake_case: "${trimmedValue}" -> "${snakeCased}"`);
            }
            return { valid: true, value: snakeCased };
        }
        
        // Validate DESCRIPTION has meaningful content (more than 2 words)
        if (field.name === 'DESCRIPTION') {
            const wordCount = trimmedValue.split(/\s+/).filter(word => word.length > 0).length;
            if (wordCount < 3) {
                return { valid: false, error: 'Description must be at least 3 words (got "' + trimmedValue + '")' };
            }
            return { valid: true, value: trimmedValue };
        }
        
        // Validate STAGES is not just a number or too short
        if (field.name === 'STAGES') {
            // Check if it's just a number
            if (/^\d+$/.test(trimmedValue)) {
                return { valid: false, error: 'STAGES cannot be just a number (got "' + trimmedValue + '")' };
            }
            // Check if it has actual stage content (should have numbered items)
            const hasStageContent = /\d+[\.\:\-\)]\s*.+/i.test(trimmedValue);
            if (!hasStageContent) {
                return { valid: false, error: 'STAGES must contain numbered objectives (got "' + trimmedValue + '")' };
            }
            return { valid: true, value: trimmedValue };
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
                    
                    if (debug) {
                        console.log(`${MODULE_NAME}: Adding batch prompt to context for fields: ${activeFields.map(f => f.name).join(', ')}`);
                        console.log(`${MODULE_NAME}: Full prompt injection:\n${batchPrompt}`);
                    }
                    
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
                    
                    // Parse stages (Quest only) - Special handling to avoid false matches
                    if (progress.entityType === 'Quest' && !progress.collectedData.STAGES) {
                        // Ensure stageCollection is initialized
                        if (!progress.stageCollection) {
                            progress.stageCollection = {
                                stageCount: progress.collectedData?.STAGE_COUNT || 3,
                                stages: {}
                            };
                        }
                        
                        // Look for the actual STAGES section, not summary lines
                        // Find where "STAGES:" appears on its own line (not "Stages: 3")
                        const stagesIndex = text.search(/^STAGES:\s*$/m);
                        let stageText = text;
                        
                        if (stagesIndex !== -1) {
                            // Extract everything after "STAGES:" line
                            stageText = text.substring(stagesIndex);
                            // Stop at "REWARDS:" if present
                            const rewardsIndex = stageText.search(/^REWARDS:\s*$/m);
                            if (rewardsIndex > 0) {
                                stageText = stageText.substring(0, rewardsIndex);
                            }
                            if (debug) console.log(`${MODULE_NAME}: Extracted stage section for parsing`);
                        }
                        
                        const stages = parseStageResponse(
                            stageText,
                            progress.stageCollection.stageCount,
                            progress.stageCollection.stages
                        );
                        
                        // Validate stages
                        const allValid = validateStages(stages, progress.stageCollection.stageCount);
                        
                        progress.stageCollection.stages = stages;
                        
                        if (allValid) {
                            const formattedStages = formatStagesForCard(
                                stages,
                                progress.stageCollection.stageCount
                            );
                            progress.collectedData.STAGES = formattedStages;
                            if (debug) {
                                console.log(`${MODULE_NAME}: All ${progress.stageCollection.stageCount} stages collected`);
                                console.log(`${MODULE_NAME}: Formatted stages:\n${formattedStages}`);
                            }
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
                    // For quests, we need to check DESCRIPTION, STAGES, and REWARDS specifically
                    let remainingFields = [];
                    let remainingFieldNames = '';
                    
                    if (progress.entityType === 'Quest') {
                        // Check the three required quest fields
                        const requiredQuestFields = ['DESCRIPTION', 'STAGES', 'REWARDS'];
                        const missingQuestFields = requiredQuestFields.filter(f => !progress.collectedData[f]);
                        remainingFields = missingQuestFields.map(name => ({ name }));
                        remainingFieldNames = missingQuestFields.join(', ');
                    } else {
                        remainingFields = getActiveFields(progress.templateFields, progress.collectedData);
                        remainingFieldNames = remainingFields.map(f => f.name).join(', ');
                    }
                    
                    console.log(`${MODULE_NAME}: After batch processing - Remaining fields: ${remainingFields.length}${remainingFields.length > 0 ? ` (${remainingFieldNames})` : ''}`);
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
        
        if (debug && flatData.STAGES !== undefined) {
            console.log(`${MODULE_NAME}: processTemplate - STAGES value: "${flatData.STAGES}"`);
            console.log(`${MODULE_NAME}: processTemplate - STAGES type: ${typeof flatData.STAGES}`);
        }
        
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
            keysList.push(' ' + triggerNameStr);
            keysList.push('(' + triggerNameStr);
        }
        const keys = keysList.join(', ');
        
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
                `## **{{NAME}}** {{#FULL_NAME}} [{{FULL_NAME}}]{{/FULL_NAME}}\n` +
                `DOB: {{DOB}} | Gender: {{GENDER}} | HP: {{hp.current}}/{{hp.max}} | Level {{LEVEL}} (0/{{XP_MAX}} XP) | Current Location: {{LOCATION}}\n` +
                `**Appearance**\n` +
                `Hair: {{HAIR}} | Eyes: {{EYES}} | Build: {{BUILD}}\n` +
                `**Personality**\n` +
                `{{PERSONALITY}}\n` +
                `**Background**\n` +
                `{{BACKGROUND}}\n` +
                `**Attributes**\n` +
                `VITALITY: {{VITALITY}} | STRENGTH: {{STRENGTH}} | DEXTERITY: {{DEXTERITY}} | AGILITY: {{AGILITY}}\n` +
                `**Skills**\n` +
                `{{SKILLS}}\n` +
                `**Inventory**\n` +
                `{}\n` +
                `**Relationships**\n`
            ),
            description: (
                `// NPC Generation\n` +
                `NAME: required, text, Username/Gamertag (e.g. Nixara, LewdLeah, xXNyaXx, Pixel_Prowl; snake_case)\n` +
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
                `**Description**\n` +
                `{{DESCRIPTION}}\n` +
                `**Pathways**\n` +
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
                `**Description**\n` +
                `{{DESCRIPTION}}\n` +
                `**Stages**\n` +
                `{{STAGES}}\n` +
                `**Rewards**\n` +
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
                    const characterData = transformEntityToCharacter(progress.collectedData, progress.triggerName || progress.entityName);
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
                const characterData = transformEntityToCharacter(progress.collectedData, progress.triggerName || progress.entityName);
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
    
    function getPlayerLocation() {
        // Use GameState's existing functions to get player location
        if (typeof GameState !== 'undefined' && GameState.getPlayerName && GameState.get) {
            const playerName = GameState.getPlayerName();
            if (playerName) {
                const location = GameState.get(`Character.${playerName}.info.location`);
                return location || null;
            }
        }
        return null;
    }
    
    function transformEntityToCharacter(entityData, entityName) {
        // Transform collected entity data into ECS component format for GameState
        const characterData = {
            name: entityData.FULL_NAME || entityName,
            
            // Display fields
            gender: entityData.GENDER || 'Unknown',
            appearance: entityData.APPEARANCE || '',
            personality: entityData.PERSONALITY || '',
            backstory: entityData.BACKGROUND || entityData.BACKSTORY || '',
            
            // Stats component with dot notation
            'stats.level': parseInt(entityData.LEVEL) || 1,
            'stats.hp.current': 100,
            'stats.hp.max': 100,
            'stats.xp.current': 0,
            'stats.xp.max': 1000,
            
            // Info component
            'info.location': entityData.LOCATION || getPlayerLocation() || 'unknown',
            'info.faction': entityData.FACTION || null,
            'info.trigger_name': entityName,  // Store the trigger name that caused generation
            'info.generation_turn': info?.actionCount || 0,
            
            // Attributes component - set defaults with proper structure
            attributes: {
                VITALITY: { value: 10 },
                STRENGTH: { value: 10 },
                DEXTERITY: { value: 10 },
                AGILITY: { value: 10 }
            },
            
            // Initialize empty components
            skills: {},
            inventory: {},
            relationships: {}
        };
        
        // Add DOB and class for player characters
        if (entityData.TYPE === 'NPC_PLAYER') {
            if (entityData.DOB) characterData.dob = entityData.DOB;
            if (entityData.STARTING_CLASS) characterData.class = entityData.STARTING_CLASS;
            characterData.isPlayer = true;
        } else {
            characterData.isPlayer = false;
        }
        
        // Parse skills
        if (entityData.PRIMARY_SKILLS) {
            characterData.skills = {};
            const skills = entityData.PRIMARY_SKILLS.split(',').map(s => s.trim());
            for (const skill of skills) {
                const skillKey = skill.toLowerCase().replace(/\s+/g, '_');
                characterData.skills[skillKey] = {
                    level: 1,
                    xp: { current: 0, max: 100 }
                };
            }
        }
        
        // Parse items
        if (entityData.STARTING_ITEMS) {
            characterData.inventory = {};
            const items = entityData.STARTING_ITEMS.split(',').map(s => s.trim());
            for (const item of items) {
                const itemKey = item.toLowerCase().replace(/\s+/g, '_');
                characterData.inventory[itemKey] = { quantity: 1 };
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
                    characterData.relationships[relKey] = 'neutral';
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
            
            // Handle predefined fields from initialData for any entity type
            if (initialData && Object.keys(initialData).length > 0) {
                // Remove fields we already have values for
                templateFields = templateFields.filter(field => {
                    // Skip if this field was predefined
                    if (field.requirement === 'predefined') {
                        return false;
                    }
                    // Skip if we already have a value for this field
                    if (initialData.hasOwnProperty(field.name)) {
                        if (debug) console.log(`${MODULE_NAME}: Skipping ${field.name} - already provided`);
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
                triggerName: entityData.name,  // Store the trigger name from entity tracker
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
    const begin = Date.now(); // Start timing execution
    
    // Variable to track current hash
    let currentHash = null;
    
    // Entity cache - stores all loaded entities for the current turn
    // Uses entity type + name as cache key
    let entityCache = {};
    
    // Helper to get all cached entities of a type
    function getCachedEntitiesOfType(type) {
        const result = {};
        const prefix = type + '.';
        for (const [key, entity] of Object.entries(entityCache)) {
            if (key.startsWith(prefix)) {
                const name = key.substring(prefix.length);
                result[name] = entity;
            }
        }
        return result;
    }
    
    // Debug-only: Initialize execution times array if needed  
    if (debug && !state.times) {
        state.times = []; // Array of {hash, hook, duration}
    }

    const logTime = () => {
        const duration = Date.now() - begin;
        
        if (debug) {
            // Only track times in debug mode
            if (state.times) {
                const timeEntry = {
                    hash: currentHash || 'pending',
                    hook: hook,
                    duration: duration
                };
                
                state.times.push(timeEntry);
            }
            
            // Associate pending CONTEXT entries with current output hash
            // (Input entries keep their own hash from the modified input text)
            if (hook === 'output' && currentHash && state.times) {
            // Only update pending CONTEXT entries, not input entries
            for (let i = state.times.length - 2; i >= 0; i--) {
                if (state.times[i].hash === 'pending' && state.times[i].hook === 'context') {
                    state.times[i].hash = currentHash;
                } else if (state.times[i].hash !== 'pending') {
                    break; // Stop when we hit a non-pending entry
                }
            }
            
            // Clean up timing entries for hashes no longer in history
            // Get all valid hashes from RewindSystem
            const validHashes = new Set();
            validHashes.add('pending'); // Keep pending entries
            
            try {
                const rewindCards = RewindSystem.getAllCards();
                rewindCards.forEach(card => {
                    if (card.data && card.data.entries) {
                        card.data.entries.forEach(entry => {
                            if (entry && entry.h) {
                                validHashes.add(entry.h);
                            }
                        });
                    }
                });
            } catch (e) {
                // If we can't get RewindSystem data, keep all times for safety
                return;
            }
            
            // Filter to keep only times with valid hashes
            state.times = state.times.filter(t => validHashes.has(t.hash));
            }
            
            console.log(`${MODULE_NAME} [${hook}]: Execution time: ${duration} ms`);
        }
    };
    
    // Debug-only state usage
    if (debug) {
        // Check for automatic cleanup FIRST before any processing
        const stateSize = JSON.stringify(state).length;
        if (stateSize > 50000) {
            console.log(`${MODULE_NAME}: State size ${Math.round(stateSize/1000)}KB exceeds 50KB limit - performing automatic cleanup`);
            
            // Reset debug logs
            if (state.debugLog) {
                state.debugLog = {
                    turns: [],
                    allErrors: state.debugLog.allErrors ? state.debugLog.allErrors.slice(-10) : [], // Keep last X errors
                    lastRewindData: null // Clear rewind data backup too
                };
            }
            
            // Clear rewind backups
            if (state.rewindBackups) {
                delete state.rewindBackups;
            }
            
            // Clear execution times
            if (state.times) {
                state.times = [];
            }
        }
    }
    
    // Entity generation tracking 
    let currentEntityGeneration = null;
    
    // Tool pattern: standard function calls like tool_name(param1, param2, param3)
    const TOOL_PATTERN = /([a-z_]+)\s*\(([^)]*)\)/gi;
    
    // Universal getter pattern for object data: get[objectType.entityName.field]
    // Examples: get[character.Bob.level], get[location.Somewhere_Over_There.type]
    const UNIVERSAL_GETTER_PATTERN = /get\[([^\]]+)\]/gi;
    
    // Function getter pattern for dynamic/computed values: get_function(parameters)
    // Examples: get_currentdate(), get_formattedtime(), get_daynumber()
    const FUNCTION_GETTER_PATTERN = /get_[a-z]+\s*\([^)]*\)/gi;
    
    // ==========================
    // Debug Logging System
    // ==========================
    const MAX_DEBUG_TURNS = 5; // Keep only last 5 turns to save state space
    
    function initDebugLogging() {
        if (!debug) return;
        
        // Initialize debug log structure in state if needed
        if (!state.debugLog) {
            state.debugLog = {
                turns: [],  // Array of turn data
                allErrors: []  // Track ALL errors throughout the entire adventure
            };
        }
        
        // Ensure allErrors exists even for existing debug logs
        if (!state.debugLog.allErrors) {
            state.debugLog.allErrors = [];
        }
    }
    
    function logError(error, context = '') {
        if (!debug) return;
        
        if (!state.debugLog) {
            initDebugLogging();
        }
        
        const errorEntry = {
            actionCount: state.actionCount || 0,
            error: error.toString(),
            stack: error.stack || '',
            context: context,
            timestamp: new Date().toISOString()
        };
        
        state.debugLog.allErrors.push(errorEntry);
        
        // When we exceed X errors, keep only the last Y
        if (state.debugLog.allErrors.length > 40) {
            state.debugLog.allErrors = state.debugLog.allErrors.slice(-10);
        }
    }
    
    // Track processing events for this turn
    let currentTurnEvents = [];
    
    // Intercept console.log to capture all debug messages
    const originalConsoleLog = console.log;
    console.log = function(...args) {
        // Call the original console.log
        originalConsoleLog.apply(console, args);
        
        // If in debug mode and message contains MODULE_NAME, capture it
        if (debug && args.length > 0) {
            const message = args.join(' ');
            if (message.includes(MODULE_NAME)) {
                currentTurnEvents.push(message);
            }
        }
    };
    
    function logDebugTurn(hook, inputText, outputText, extraData = {}) {
        if (!debug) return;
        
        initDebugLogging();
        
        const turnData = {
            hook: hook,
            actionCount: info?.actionCount || state.actionCount || 0,
            events: [...currentTurnEvents], // Capture all events for this turn
            ...extraData // Include all extra data passed in
        };
        
        // Clear events after capturing
        currentTurnEvents = [];
        
        // Store hook-specific data
        if (hook === 'input') {
            // Track any commands processed
            if (inputText && inputText.includes('/')) {
                turnData.commandDetected = true;
                // Extract command names
                const commandMatches = inputText.match(/\/([a-z_]+)/gi);
                if (commandMatches) {
                    turnData.commands = commandMatches;
                }
            }
        } else if (hook === 'context') {
            // Track context size
            turnData.contextSize = inputText ? inputText.length : 0;
        } else if (hook === 'output') {
            // Check for tools in output
            const toolMatches = outputText ? outputText.match(/([a-z_]+)\s*\([^)]*\)/gi) : [];
            if (toolMatches && toolMatches.length > 0) {
                turnData.toolsInOutput = toolMatches;
            }
            
            // Capture RewindSystem data - store only essential info to prevent memory issues
            let rewindData = {
                cards: [],
                totalEntries: 0,
                position: -1
            };
            
            try {
                const rewindCards = RewindSystem.getAllCards();
                rewindCards.forEach(card => {
                    // For each entry, store only hash and tools (not full text)
                    const compactEntries = (card.data?.entries || []).map(entry => {
                        if (!entry) return null;
                        // Keep only essential fields
                        return {
                            h: entry.h,  // hash
                            t: entry.t   // tools (if any)
                        };
                    }).filter(e => e !== null);
                    
                    const cardData = {
                        title: card.title,
                        entries: compactEntries,
                        position: card.data ? card.data.position : -1
                    };
                    rewindData.cards.push(cardData);
                    rewindData.totalEntries += compactEntries.length;
                    if (cardData.position > rewindData.position) {
                        rewindData.position = cardData.position;
                    }
                });
            } catch (e) {
                // If cards are deleted or corrupted, at least we tried
                rewindData.error = e.toString();
                logError(e, 'Failed to read RewindSystem cards');
            }
            
            // Store the compact RewindSystem data in state as backup
            turnData.rewindData = rewindData;
            
            // Track state size at this point
            turnData.stateSizeAtTurn = JSON.stringify(state).length;
        }
        
        // Only store turns that have meaningful data
        const hasEvents = turnData.events && turnData.events.length > 0;
        const hasTools = turnData.toolsExecuted && turnData.toolsExecuted.length > 0;
        const hasInput = turnData.hook === 'input' && (turnData.commandDetected || turnData.inputSummary?.startsWith('/'));
        const hasEntityQueued = turnData.entityQueued;
        const hasGenerationWizard = turnData.generationWizardActive;
        
        // Skip storing empty context hooks and output hooks with only "Loaded 1 runtime tools"
        const isEmptyContext = turnData.hook === 'context' && !hasEvents;
        const isBoringOutput = turnData.hook === 'output' && 
            !hasTools && !hasEntityQueued && !hasGenerationWizard &&
            (!hasEvents || (turnData.events.length === 1 && turnData.events[0].includes('Loaded 1 runtime tools')));
        
        if (!isEmptyContext && !isBoringOutput) {
            // This turn has meaningful data, store it
            state.debugLog.turns.push(turnData);
            
            // Keep only last MAX_DEBUG_TURNS
            if (state.debugLog.turns.length > MAX_DEBUG_TURNS) {
                state.debugLog.turns = state.debugLog.turns.slice(-MAX_DEBUG_TURNS);
            }
        }
        
        // Store complete RewindSystem data as backup (includes position info)
        state.debugLog.lastRewindData = turnData.rewindData;
    }
    
    function outputDebugLog() {
        if (!debug) {
            return "Debug mode is not enabled. Set debug = true in GameState.js to enable debug logging.";
        }
        
        if (!state.debugLog || !state.debugLog.turns || state.debugLog.turns.length === 0) {
            return "No debug logs available yet.";
        }
        
        // Build comprehensive debug output
        let output = `# Debug Log Report\n`;
        output += `Generated: ${new Date().toISOString()}\n\n`;
        
        output += `## Recent Actions\n\n`;
        
        state.debugLog.turns.forEach((turn, index) => {
            // Skip input hooks entirely
            if (turn.hook === 'input') {
                return; // Skip all input hooks
            }
            
            // Skip context hooks that have no events or useful info
            if (turn.hook === 'context' && (!turn.events || turn.events.length === 0)) {
                return; // Skip this turn entirely
            }
            
            // Skip output hooks that only loaded runtime tools and nothing else
            if (turn.hook === 'output' && turn.events && turn.events.length === 1 && 
                turn.events[0].includes('Loaded 1 runtime tools') &&
                !turn.entityQueued && !turn.generationWizardActive) {
                return; // Skip this turn entirely
            }
            
            output += `### Action ${turn.actionCount} - ${turn.hook.toUpperCase()} Hook\n`;
            
            // Show hook-specific debug info
            if (turn.hook === 'input') {
                if (turn.commands) output += `Commands: ${turn.commands.join(', ')}\n`;
            } else if (turn.hook === 'context') {
                if (turn.contextSize) output += `Context Size: ${turn.contextSize} chars\n`;
                if (turn.triggerNamesReplaced) output += `Trigger Names Replaced: ${turn.triggerNamesReplaced}\n`;
                if (turn.gettersReplaced && Object.keys(turn.gettersReplaced).length > 0) {
                    const getterList = Object.entries(turn.gettersReplaced)
                        .map(([name, count]) => count > 1 ? `${name}(${count})` : name)
                        .join(', ');
                    output += `Getters Replaced: ${getterList}\n`;
                }
                if (turn.variablesReplaced) output += `Variables Replaced: ${turn.variablesReplaced}\n`;
            } else if (turn.hook === 'output') {
                if (turn.toolsInOutput) output += `Tools in Output: ${turn.toolsInOutput.length}\n`;
                if (turn.entityQueued) output += `Entity Queued: ${turn.entityQueued}\n`;
                if (turn.generationWizardActive) output += `GenerationWizard Active: ${turn.generationWizardActive}\n`;
            }
            
            // Show processing events for this turn
            if (turn.events && turn.events.length > 0) {
                output += `\n#### Processing Events:\n`;
                turn.events.forEach(event => {
                    output += `${event}\n`;
                });
            }
            
            output += `\n---\n`;
        });
        
        // Get COMPLETE RewindSystem data from the separate storage
        let latestRewindData = state.debugLog.lastRewindData;
        
        // Build hash to execution times mapping
        const hashToTimes = {};
        if (state.times && state.times.length > 0) {
            state.times.forEach(entry => {
                if (entry.hash && entry.hash !== 'pending') {
                    if (!hashToTimes[entry.hash]) {
                        hashToTimes[entry.hash] = [];
                    }
                    hashToTimes[entry.hash].push({
                        hook: entry.hook,
                        duration: entry.duration
                    });
                }
            });
        }
        
        // Add RewindSystem data with execution times
        output += `## Rewind System Data (with Execution Times)\n\n`;
        
        if (latestRewindData) {
            if (latestRewindData.error) {
                output += `ERROR: ${latestRewindData.error}\n\n`;
            }
            
            // Show each card and ALL its entries
            latestRewindData.cards.forEach((card, cardIndex) => {
                output += `### ${card.title} (${card.entries.length} entries, position: ${card.position})\n`;
                
                if (card.entries.length > 0) {
                    card.entries.forEach((entry, entryIndex) => {
                        output += `[${entryIndex}]: `;
                        if (entry) {
                            if (entry.h) output += `hash:${entry.h.substring(0, 8)} `;
                            
                            // Check if this is an input entry (has input timing)
                            const hasInputTiming = entry.h && hashToTimes[entry.h] && 
                                                  hashToTimes[entry.h].some(t => t.hook === 'input');
                            
                            if (hasInputTiming) {
                                // Input entries show commands instead of tools
                                output += `(player input)`;
                            } else if (entry.t && entry.t.length > 0) {
                                // Output entries show tools
                                const toolList = entry.t.map(t => {
                                    if (Array.isArray(t)) {
                                        return `${t[0]}(${t[1] ? t[1].join(',') : ''})`;
                                    }
                                    return String(t);
                                }).join(', ');
                                output += `tools:[${toolList}]`;
                            } else {
                                output += `no tools`;
                            }
                            
                            // Add execution times if available
                            if (entry.h && hashToTimes[entry.h]) {
                                const times = hashToTimes[entry.h];
                                const timesStr = times.map(t => `${t.hook}:${t.duration}ms`).join(', ');
                                output += ` | times:[${timesStr}]`;
                            }
                        } else {
                            output += `null entry`;
                        }
                        output += `\n`;
                    });
                } else {
                    output += `(no entries)\n`;
                }
                output += `\n`;
            });
        } else {
            output += `No rewind data found in stored turns.\n\n`;
        }
        
        // Add ALL ERRORS from the entire adventure
        if (state.debugLog.allErrors && state.debugLog.allErrors.length > 0) {
            output += `## Recent Errors (Rolling History)\n\n`;
            output += `Showing: ${state.debugLog.allErrors.length} errors\n\n`;
            
            state.debugLog.allErrors.forEach((err, index) => {
                output += `### Error ${index + 1} (Action ${err.actionCount})\n`;
                output += `Time: ${err.timestamp}\n`;
                output += `Context: ${err.context}\n`;
                output += `Error: ${err.error}\n`;
                if (err.stack) {
                    output += `Stack:\n\`\`\`\n${err.stack}\n\`\`\`\n`;
                }
                output += `\n`;
            });
            output += `---\n`;
        }
        
        // Add execution time averages and context info
        if (state.times && state.times.length > 0) {
            output += `## Execution Time Summary\n\n`;
            
            const byHook = {
                input: state.times.filter(t => t.hook === 'input'),
                context: state.times.filter(t => t.hook === 'context'),  
                output: state.times.filter(t => t.hook === 'output')
            };
            
            ['input', 'context', 'output'].forEach(hookType => {
                const entries = byHook[hookType];
                if (entries && entries.length > 0) {
                    const average = Math.round(entries.reduce((sum, e) => sum + e.duration, 0) / entries.length);
                    const max = Math.max(...entries.map(e => e.duration));
                    const min = Math.min(...entries.map(e => e.duration));
                    output += `${hookType.toUpperCase()}: avg ${average}ms (min ${min}ms, max ${max}ms) from ${entries.length} samples\n`;
                }
            });
            
            // Add context length
            if (state.lastContextLength !== undefined) {
                output += `\nLast Context Length: ${state.lastContextLength} characters\n`;
            }
        }
        
        // Save to Story Card using upsert
        const debugCard = {
            title: '[DEBUG] Debug Log',
            type: 'data',
            description: output,
            entry: `Debug log generated at ${new Date().toISOString()}\nUse /debug_log to update this card.`
        };
        
        Utilities.storyCard.upsert(debugCard);
        
        // Pin debug card after player cards for easy access
        try {
            const debugCardObj = Utilities.storyCard.get('[DEBUG] Debug Log');
            if (debugCardObj && typeof storyCards !== 'undefined' && storyCards.length > 1) {
                // Sort by update time (newest first)
                storyCards.sort((a, b) => {
                    const timeA = a.updatedAt ? Date.parse(a.updatedAt) : 0;
                    const timeB = b.updatedAt ? Date.parse(b.updatedAt) : 0;
                    return timeB - timeA;
                });
                
                // Count player cards at top
                let playerCount = 0;
                for (const card of storyCards) {
                    if (card && card.title && card.title.startsWith('[PLAYER]')) {
                        playerCount++;
                    } else {
                        break; // Stop when we hit non-player cards
                    }
                }
                
                // Move debug card after player cards
                const debugIndex = storyCards.findIndex(card => card.title === '[DEBUG] Debug Log');
                if (debugIndex >= 0 && debugIndex !== playerCount) {
                    const [debugEntry] = storyCards.splice(debugIndex, 1);
                    storyCards.splice(playerCount, 0, debugEntry);
                }
            }
        } catch (e) {
            // Ignore pinning errors - not critical
        }
        
        return `Debug log saved to [DEBUG] Debug Log story card.`;
    }
    
    // ==========================
    // Universal Data System
    // ==========================
    
    // Cache for discovered schemas
    let schemaRegistry = null;
    
    // Cache for field configurations  
    // REMOVED: fieldConfigCache - part of removed SANE_FIELDS system
    
    // Pre-built alias mapping for efficient lookups
    // Maps lowercase aliases -> canonical schema name
    let schemaAliasMap = null;
    
    // Removed - now combined with entityCardMap for single-lookup efficiency
    
    // Discover all available schemas and build registry
    function initializeSchemaRegistry() {
        if (schemaRegistry !== null) return schemaRegistry;
        
        schemaRegistry = {};
        const componentRegistry = {}; // Store component schemas separately
        
        // First, load component definitions from [SANE_COMP] cards
        const compCards = Utilities.storyCard.find(
            card => card.title && card.title.startsWith('[SANE_COMP]'),
            true // Get all matches
        );
        
        for (const card of compCards || []) {
            const match = card.title.match(/\[SANE_COMP\]\s+(.+)/);
            if (!match) continue;
            
            const compName = match[1].trim();
            try {
                // Parse component definition from description field
                const compDef = JSON.parse(card.description || '{}');
                componentRegistry[compName] = {
                    name: compName,
                    fields: compDef.fields || {},
                    defaults: compDef.defaults || {}
                };
            } catch (e) {
                if (debug) console.log(`${MODULE_NAME}: Failed to parse component ${compName}: ${e.message}`);
            }
        }
        
        // Then load entity types from [SANE_ENTITY] cards
        const entityCards = Utilities.storyCard.find(
            card => card.title && card.title.startsWith('[SANE_ENTITY]'),
            true // Get all matches
        );
        
        for (const card of entityCards || []) {
            const match = card.title.match(/\[SANE_ENTITY\]\s+(.+)/);
            if (!match) continue;
            
            const entityType = match[1].trim();
            try {
                // Parse entity definition from description field
                const entityDef = JSON.parse(card.description || '{}');
                schemaRegistry[entityType] = {
                    name: entityType,
                    type: entityType,
                    components: entityDef.components || [],
                    prefixes: entityDef.prefixes || [entityType.toUpperCase()],
                    dataOnly: entityDef.dataOnly || false,
                    singleton: entityDef.singleton || false
                };
            } catch (e) {
                if (debug) console.log(`${MODULE_NAME}: Failed to parse entity type ${entityType}: ${e.message}`);
            }
        }
        
        // Store component registry globally for access
        schemaRegistry._components = componentRegistry;
        
        // Build aliases map for quick lookup
        const aliasMap = {};
        for (const [name, schema] of Object.entries(schemaRegistry)) {
            if (schema.aliases) {
                for (const alias of schema.aliases) {
                    aliasMap[alias] = name;
                }
            }
        }
        schemaRegistry._aliases = aliasMap;
        
        if (debug) {
            log(`${MODULE_NAME}: Registered ${Object.keys(schemaRegistry).length} entity schemas`);
            log(`${MODULE_NAME}: Registered ${Object.keys(componentRegistry).length} component schemas`);
        }
        
        // Ensure Runtime is always available even without explicit schema
        if (!schemaRegistry['Global']) {
            schemaRegistry['Global'] = {
                name: 'Global',
                prefixes: [],
                storageType: 'global'
            };
        }
        
        // Build the complete alias map for O(1) lookups
        schemaAliasMap = {};
        for (const [schemaName, schema] of Object.entries(schemaRegistry)) {
            // Add the schema name itself (normalized)
            schemaAliasMap[schemaName.toLowerCase()] = schemaName;
            
            // Add all defined aliases
            if (schema.aliases) {
                for (const alias of schema.aliases) {
                    schemaAliasMap[alias.toLowerCase()] = schemaName;
                }
            }
            
            // Add all prefixes as aliases
            if (schema.prefixes) {
                for (const prefix of schema.prefixes) {
                    schemaAliasMap[prefix.toLowerCase()] = schemaName;
                }
            }
        }
        
        if (debug) log(`${MODULE_NAME}: Built alias map with ${Object.keys(schemaAliasMap).length} entries`);
        
        // Create default components and entities if they don't exist
        initializeDefaultComponents();
        
        // Create default FORMAT cards if they don't exist
        initializeDefaultFormatCards();
        
        return schemaRegistry;
    }
    
    // Create default component and entity cards if they don't exist
    function initializeDefaultComponents() {
        // Stats component with level containing xp
        if (!Utilities.storyCard.get('[SANE_COMP] stats')) {
            const statsComponent = {
                title: '[SANE_COMP] stats',
                type: 'component',
                description: JSON.stringify({
                    defaults: {
                        level: {
                            value: 1,
                            xp: { current: 0, max: 500 }
                        },
                        hp: { current: 100, max: 100 }
                    }
                }, null, 2)
            };
            Utilities.storyCard.add(statsComponent);
            if (debug) console.log(`${MODULE_NAME}: Created stats component`);
        }
        
        // Info component
        if (!Utilities.storyCard.get('[SANE_COMP] info')) {
            const infoComponent = {
                title: '[SANE_COMP] info',
                type: 'component',
                description: JSON.stringify({
                    defaults: {
                        gender: 'Unknown',
                        race: 'Human',
                        class: 'Adventurer',
                        location: 'Unknown'
                    }
                }, null, 2)
            };
            Utilities.storyCard.add(infoComponent);
            if (debug) console.log(`${MODULE_NAME}: Created info component`);
        }
        
        // Skills component with registry and formulas
        if (!Utilities.storyCard.get('[SANE_COMP] skills')) {
            const skillsComponent = {
                title: '[SANE_COMP] skills',
                type: 'component', 
                description: JSON.stringify({
                    defaults: {},
                    categories: {
                        "combat": { "xp_formula": "level * 80" },
                        "crafting": { "xp_formula": "level * 150" },
                        "social": { "xp_formula": "level * 120" },
                        "gathering": { "xp_formula": "level * 130" },
                        "support": { "xp_formula": "level * 90" }
                    },
                    registry: {
                        "one_handed_sword": { "category": "combat" },
                        "katana": { "category": "combat", "xp_formula": "level * 200" },
                        "two_handed_sword": { "category": "combat" },
                        "rapier": { "category": "combat" },
                        "dagger": { "category": "combat" },
                        "spear": { "category": "combat" },
                        "shield": { "category": "combat" },
                        "parry": { "category": "combat" },
                        "meditation": { "category": "support" },
                        "detection": { "category": "support" },
                        "hiding": { "category": "support" },
                        "alchemy": { "category": "crafting" },
                        "blacksmithing": { "category": "crafting" },
                        "tailoring": { "category": "crafting" },
                        "cooking": { "category": "crafting" },
                        "fishing": { "category": "gathering" },
                        "herbalism": { "category": "gathering" },
                        "mining": { "category": "gathering" },
                        "woodcutting": { "category": "gathering" },
                        "negotiation": { "category": "social" },
                        "intimidation": { "category": "social" },
                        "persuasion": { "category": "social" },
                        "deception": { "category": "social" },
                        "insight": { "category": "social" },
                        "leadership": { "category": "social" },
                        "first_aid": { "category": "support" },
                        "tracking": { "category": "support" },
                        "stealth": { "category": "support" },
                        "lockpicking": { "category": "support" },
                        "acrobatics": { "category": "support" },
                        "night_vision": { "category": "support" },
                        "battle_healing": { "category": "support" },
                        "emergency_recovery": { "category": "support" },
                        "sprint": { "category": "support" },
                        "extended_weight_limit": { "category": "support" },
                        "martial_arts": { "category": "combat" },
                        "throwing": { "category": "combat" },
                        "archery": { "category": "combat" }
                    }
                }, null, 2)
            };
            Utilities.storyCard.add(skillsComponent);
            if (debug) console.log(`${MODULE_NAME}: Created skills component with registry`);
        }
        
        // Attributes component
        if (!Utilities.storyCard.get('[SANE_COMP] attributes')) {
            const attributesComponent = {
                title: '[SANE_COMP] attributes',
                type: 'component',
                description: JSON.stringify({
                    defaults: {},
                    registry: {
                        "VITALITY": { 
                            "formula": "10 + (level - 1) * 2",
                            "description": "Increases max HP"
                        },
                        "STRENGTH": {
                            "formula": "10 + (level - 1) * 2",
                            "description": "Increases physical damage"
                        },
                        "DEXTERITY": {
                            "formula": "10 + (level - 1) * 2",
                            "description": "Increases accuracy and crit chance"
                        },
                        "AGILITY": {
                            "formula": "10 + (level - 1) * 2",
                            "description": "Increases evasion and speed"
                        }
                    }
                }, null, 2)
            };
            Utilities.storyCard.add(attributesComponent);
            if (debug) console.log(`${MODULE_NAME}: Created attributes component`);
        }
        
        // Inventory component
        if (!Utilities.storyCard.get('[SANE_COMP] inventory')) {
            const inventoryComponent = {
                title: '[SANE_COMP] inventory',
                type: 'component',
                description: JSON.stringify({
                    defaults: {}
                }, null, 2)
            };
            Utilities.storyCard.add(inventoryComponent);
            if (debug) console.log(`${MODULE_NAME}: Created inventory component`);
        }
        
        // Relationships component with thresholds
        if (!Utilities.storyCard.get('[SANE_COMP] relationships')) {
            const relationshipsComponent = {
                title: '[SANE_COMP] relationships',
                type: 'component',
                description: JSON.stringify({
                    defaults: {},
                    thresholds: {
                        "Stranger": 0,
                        "Acquaintance": 10,
                        "Friend": 30,
                        "Close Friend": 60,
                        "Best Friend": 100,
                        "Trusted Ally": 150,
                        "Rival": -10,
                        "Enemy": -30,
                        "Nemesis": -60,
                        "Arch-Enemy": -100
                    }
                }, null, 2)
            };
            Utilities.storyCard.add(relationshipsComponent);
            if (debug) console.log(`${MODULE_NAME}: Created relationships component`);
        }
        
        // Character entity type
        if (!Utilities.storyCard.get('[SANE_ENTITY] Character')) {
            const characterEntity = {
                title: '[SANE_ENTITY] Character',
                type: 'entity',
                description: JSON.stringify({
                    components: ['info', 'stats', 'skills', 'attributes', 'inventory', 'relationships'],
                    prefixes: ['CHARACTER', 'PLAYER'],
                    aliases: ['char', 'c'],
                    dataOnly: false
                }, null, 2)
            };
            Utilities.storyCard.add(characterEntity);
            if (debug) console.log(`${MODULE_NAME}: Created Character entity type`);
        }
        
        // Location entity type
        if (!Utilities.storyCard.get('[SANE_ENTITY] Location')) {
            const locationEntity = {
                title: '[SANE_ENTITY] Location',
                type: 'entity',
                description: JSON.stringify({
                    components: [],
                    prefixes: ['LOCATION'],
                    aliases: ['loc', 'l'],
                    dataOnly: false
                }, null, 2)
            };
            Utilities.storyCard.add(locationEntity);
            if (debug) console.log(`${MODULE_NAME}: Created Location entity type`);
        }
        
        // Global entity type (singleton)
        if (!Utilities.storyCard.get('[SANE_ENTITY] Global')) {
            const globalEntity = {
                title: '[SANE_ENTITY] Global',
                type: 'entity',
                description: JSON.stringify({
                    components: [],
                    prefixes: [],
                    aliases: ['runtime', 'global'],
                    singleton: true,
                    dataOnly: true
                }, null, 2)
            };
            Utilities.storyCard.add(globalEntity);
            if (debug) console.log(`${MODULE_NAME}: Created Global entity type`);
        }
    }
    
    // Create default FORMAT cards for entities that need them
    function initializeDefaultFormatCards() {
        // Default CHARACTER FORMAT (for NPCs)
        if (!Utilities.storyCard.get('[SANE_FORMAT] CHARACTER')) {
            const characterFormat = {
                title: '[SANE_FORMAT] CHARACTER',
                type: 'schema',
                entry: '// Computed fields\n' +
                    'info_line: {info.dob?DOB\\: $(info.dob) | }Gender: $(info.gender) | Level: $(stats.level.value) ($(stats.level.xp.current)/$(stats.level.xp.max)) | HP: $(stats.hp.current)/$(stats.hp.max) | Location: $(info.location)\n',
                description: '<$# Character>\n' +
                    '## **{name}**{info.full_name? [{info.full_name}]}\n' +
                    '{info_line}\n' +
                    '{info.appearance?**Appearance**\n{info.appearance}\n}' +
                    '{info.personality?**Personality**\n{info.personality}\n}' +
                    '{info.background?**Background**\n{info.background}\n}' +
                    '{attributes?**Attributes**\n{attributes.*|{*}: {*.value}}\n}' +
                    '{skills?**Skills**\n{skills.*:• {*}: Level {*.level} ({*.xp.current}/{*.xp.max} XP)}\n}' +
                    '{inventory?**Inventory**\n{inventory.*:• {*} x{*.quantity}}\n}' +
                    '{relationships?**Relationships**\n{relationships.*:• {*}: {*.}}}' +
                    '{misc?{misc}}'
            };
            Utilities.storyCard.add(characterFormat);
            if (debug) console.log(`${MODULE_NAME}: Created default FORMAT card for CHARACTER`);
        }
        
        // Default PLAYER FORMAT
        if (!Utilities.storyCard.get('[SANE_FORMAT] PLAYER')) {
            const playerFormat = {
                title: '[SANE_FORMAT] PLAYER',
                type: 'schema',
                entry: '// Computed fields\n' +
                    'info_line: {info.dob?DOB\\: $(info.dob) | }Gender: $(info.gender) | Level: $(stats.level.value) ($(stats.level.xp.current)/$(stats.level.xp.max)) | HP: $(stats.hp.current)/$(stats.hp.max) | Location: $(info.location)\n',
                description: '<$# User>\n' +
                    '## **{name}**{info.full_name? [{info.full_name}]}\n' +
                    '{info_line}\n' +
                    '{info.appearance?**Appearance**\n{info.appearance}\n}' +
                    '{info.personality?**Personality**\n{info.personality}\n}' +
                    '{info.background?**Background**\n{info.background}\n}' +
                    '**Attributes**\n{attributes.*|{*}: {*.value}}\n' +
                    '**Skills**\n{skills.*:• {*}\\: Level {*.level} ({*.xp.current}/{*.xp.max} XP)}\n' +
                    '**Inventory**\n{inventory.*:• {*} x{*.quantity}}\n' +
                    '==={name} is a USER. Do not act or speak for them.==='
            };
            
            Utilities.storyCard.add(playerFormat);
            if (debug) console.log(`${MODULE_NAME}: Created default FORMAT card for PLAYER`);
        }
        
        // Default Location FORMAT  
        if (!Utilities.storyCard.get('[SANE_FORMAT] Location')) {
            const locationFormat = {
                title: '[SANE_FORMAT] Location',
                type: 'schema',
                entry: '// Computed fields\n' +
                    'info_line: {info.type?Type: {info.type}}{info.floor? | Floor: {info.floor}}{info.district? | District: {info.district}}\n' +
                    '\n' +
                    '// Format hints\n' +
                    'format:connections: directional\n' +
                    'format:inhabitants: bullets',
                description: '<$# Location>\n' +
                    '## **{name}**\n' +
                    '{info_line}\n' +
                    '{info.description?**Description**\n' +
                    '{info.description}}\n' +
                    '{connections?**Connections**\n' +
                    '{connections_formatted}}\n' +
                    '{info.features?**Notable Features**\n' +
                    '{info.features}}'
            };
            Utilities.storyCard.add(locationFormat);
            if (debug) console.log(`${MODULE_NAME}: Created default FORMAT card for Location`);
        }
    }
    
    // Universal getter function - access any data via path
    // Resolve dynamic expressions in paths
    // Examples:
    // "Character.$(player).level" -> "Character.Bob.level" (if player = "Bob")
    // "Location.$(Character.Bob.location).type" -> "Location.Somewhere_Over_There.type"
    function resolve(path) {
        if (!path || typeof path !== 'string') return path;
        
        // Replace all $(expression) with their evaluated results
        return path.replace(/\$\((.*?)\)/g, function(match, expression) {
            // Recursively resolve the expression
            const resolved = resolve(expression);
            // Get the value at that path
            const value = get(resolved);
            // Return the value as a string for path construction
            return value !== undefined && value !== null ? String(value) : match;
        });
    }
    
    function get(path) {
        if (!path) return undefined;
        
        // First resolve any dynamic expressions in the path
        const resolvedPath = resolve(path);
        if (resolvedPath !== path) {
            path = resolvedPath;
        }
        
        // Parse path: "Character.Bob.level" or "Global.currentPlayer"
        const parts = path.split('.');
        if (parts.length < 2) return undefined;
        
        const objectType = parts[0];
        const entityName = parts[1];
        const fieldPath = parts.slice(2).join('.');
        
        // Special case for Global variables
        if (objectType === 'Global') {
            const value = getGlobalValue(entityName);
            if (value === null) return undefined;
            return fieldPath ? getNestedField(value, fieldPath) : value;
        }
        
        // Load the entity using our simplified load function
        const entity = load(objectType, entityName);
        if (!entity) return undefined;
        return fieldPath ? getNestedField(entity, fieldPath) : entity;
    }
    
    // Universal setter function - set any data via path
    function set(path, value) {
        if (!path) return false;
        
        // First resolve any dynamic expressions in the path
        const resolvedPath = resolve(path);
        if (resolvedPath !== path) {
            path = resolvedPath;
        }
        
        // Parse path: "Character.Bob.level" or "Global.currentPlayer"
        const parts = path.split('.');
        if (parts.length < 2) return false;
        
        const objectType = parts[0];
        const entityName = parts[1];
        const fieldPath = parts.slice(2).join('.');
        
        // Special case for Global variables
        if (objectType === 'Global') {
            if (fieldPath) {
                // Get current value, modify nested field, save back
                let currentValue = getGlobalValue(entityName) || {};
                setNestedField(currentValue, fieldPath, value);
                return setGlobalValue(entityName, currentValue);
            } else {
                return setGlobalValue(entityName, value);
            }
        }
        
        // Load the entity
        const entity = load(objectType, entityName);
        if (!entity) {
            if (debug) console.log(`${MODULE_NAME}: Entity not found: ${objectType}.${entityName}`);
            return false;
        }
        
        // Modify the field
        if (fieldPath) {
            setNestedField(entity, fieldPath, value);
        } else {
            Object.assign(entity, value);
        }
        
        // Save the entity back
        return save(objectType, entity);
    }
    
    // Helper to get nested field from any object
    function getNestedField(obj, path) {
        if (!obj || !path) return obj;
        
        const parts = path.split('.');
        let current = obj;
        
        for (const part of parts) {
            if (current === null || current === undefined) return undefined;
            
            // Handle array index notation [0]
            const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
            if (arrayMatch) {
                current = current[arrayMatch[1]];
                if (Array.isArray(current)) {
                    current = current[parseInt(arrayMatch[2])];
                }
            } else {
                // Try exact match first
                if (current[part] !== undefined) {
                    current = current[part];
                } else if (typeof current === 'object') {
                    // Try case-insensitive match
                    const lowerPart = part.toLowerCase();
                    const key = Object.keys(current).find(k => k.toLowerCase() === lowerPart);
                    current = key ? current[key] : undefined;
                } else {
                    current = undefined;
                }
            }
        }
        
        return current;
    }
    
    // Helper to set nested field in any object
    function setNestedField(obj, path, value) {
        if (!obj || !path) return false;
        
        const parts = path.split('.');
        let current = obj;
        
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            
            // Handle array index notation
            const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
            if (arrayMatch) {
                const fieldName = arrayMatch[1];
                const index = parseInt(arrayMatch[2]);
                
                if (!current[fieldName]) current[fieldName] = [];
                if (!current[fieldName][index]) current[fieldName][index] = {};
                current = current[fieldName][index];
            } else {
                if (!current[part]) current[part] = {};
                current = current[part];
            }
        }
        
        // Set the final value
        const lastPart = parts[parts.length - 1];
        const arrayMatch = lastPart.match(/^(.+)\[(\d+)\]$/);
        if (arrayMatch) {
            if (!current[arrayMatch[1]]) current[arrayMatch[1]] = [];
            current[arrayMatch[1]][parseInt(arrayMatch[2])] = value;
        } else {
            current[lastPart] = value;
        }
        
        return true;
    }
    
    // Aliases for compatibility with old code that used getNestedValue/setNestedValue
    const getNestedValue = getNestedField;
    const setNestedValue = setNestedField;
    
    // ==========================
    // Location Helper Functions
    // ==========================
    function getOppositeDirection(direction) {
        // Simple hardcoded opposites - could be moved to a component if needed
        const opposites = {
            'north': 'south',
            'south': 'north',
            'east': 'west',
            'west': 'east',
            'northeast': 'southwest',
            'northwest': 'southeast',
            'southeast': 'northwest',
            'southwest': 'northeast',
            'up': 'down',
            'down': 'up',
            'in': 'out',
            'out': 'in',
            'inside': 'outside',
            'outside': 'inside',
            'forward': 'back',
            'back': 'forward',
            'left': 'right',
            'right': 'left'
        };
        
        const lower = direction.toLowerCase();
        const opposite = opposites[lower];
        
        // Return with same capitalization as input
        if (opposite) {
            if (direction[0] === direction[0].toUpperCase()) {
                return opposite.charAt(0).toUpperCase() + opposite.slice(1);
            }
            return opposite;
        }
        
        // No opposite found - return original
        return direction;
    }
    
    function getLocationPathways(locationName) {
        // Get all pathways for a location
        const location = load('Location', locationName);
        if (!location) return {};
        
        return location.pathways || {};
    }
    
    function removeLocationPathway(locationName, direction, removeBidirectional = true) {
        // Remove a pathway from a location
        const location = load('Location', locationName);
        if (!location || !location.pathways) {
            return false;
        }
        
        const dirLower = direction.toLowerCase();
        const destinationName = location.pathways[dirLower];
        
        if (!destinationName) {
            return false; // Pathway doesn't exist
        }
        
        // Remove the pathway
        delete location.pathways[dirLower];
        
        // Save the updated location
        const saved = save('Location', location);
        
        if (saved && removeBidirectional && destinationName) {
            // Also remove reverse pathway
            const destination = load('Location', destinationName);
            if (destination && destination.pathways) {
                const oppositeDir = getOppositeDirection(direction).toLowerCase();
                delete destination.pathways[oppositeDir];
                save('Location', destination);
                
                if (debug) {
                    console.log(`${MODULE_NAME}: Removed bidirectional pathway: ${locationName} -X- ${destinationName}`);
                }
            }
        }
        
        return saved;
    }
    
    function updateLocationPathway(locationName, direction, destinationName, bidirectional = true) {
        // Use universal load function
        const location = load('Location', locationName);
        if (!location) {
            if (debug) console.log(`${MODULE_NAME}: Location not found: ${locationName}`);
            return false;
        }
        
        // Normalize direction
        const dirLower = direction.toLowerCase();
        
        // Update pathways - works with both component and direct property
        if (!location.pathways || typeof location.pathways !== 'object') {
            location.pathways = {};
        }
        location.pathways[dirLower] = destinationName;
        
        // Save the updated location using universal save
        const saved = save('Location', location);
        
        if (saved && bidirectional) {
            // Also update the destination location with reverse pathway
            const destination = load('Location', destinationName);
            if (destination) {
                const oppositeDir = getOppositeDirection(direction).toLowerCase();
                
                if (!destination.pathways || typeof destination.pathways !== 'object') {
                    destination.pathways = {};
                }
                destination.pathways[oppositeDir] = locationName;
                save('Location', destination);
                
                if (debug) {
                    console.log(`${MODULE_NAME}: Created bidirectional pathway: ${locationName} <-${direction}/${oppositeDir}-> ${destinationName}`);
                }
            }
        } else if (saved) {
            if (debug) {
                console.log(`${MODULE_NAME}: Updated ${locationName} pathway ${direction} -> ${destinationName}`);
            }
        }
        
        return saved;
    }
    
    // ==========================
    // Global Variables System (Universal Data Integration)
    // ==========================
    // Global variables now use the universal load/save system
    // They are stored as a special 'Global' entity type
    
    function loadGlobalVariables() {
        // Global variables use [GLOBAL] Global card for singleton storage
        const card = Utilities.storyCard.get('[GLOBAL] Global');
        if (!card || !card.description) return {};
        
        try {
            // Try to parse as JSON first for complex data
            return JSON.parse(card.description);
        } catch (e) {
            // Fall back to key:value format
            const globalVars = {};
            const lines = card.description.split('\n');
            for (const line of lines) {
                const colonIndex = line.indexOf(':');
                if (colonIndex > 0) {
                    const key = line.substring(0, colonIndex).trim();
                    const value = line.substring(colonIndex + 1).trim();
                    try {
                        globalVars[key] = JSON.parse(value);
                    } catch {
                        globalVars[key] = value;
                    }
                }
            }
            return globalVars;
        }
    }
    
    function getGlobalValue(varName) {
        const globalVars = loadGlobalVariables();
        return globalVars[varName] !== undefined ? globalVars[varName] : null;
    }
    
    function setGlobalValue(varName, value) {
        const globalVars = loadGlobalVariables();
        globalVars[varName] = value;
        
        // Save back as JSON for complex data support
        return Utilities.storyCard.upsert('[GLOBAL] Global', {
            entry: 'Global variable storage',
            description: JSON.stringify(globalVars, null, 2)
        });
    }
    
    function deleteGlobalValue(varName) {
        const globalVars = loadGlobalVariables();
        if (!globalVars[varName]) return false;
        
        delete globalVars[varName];
        
        // Save back as JSON
        return Utilities.storyCard.upsert('[GLOBAL] Data', {
            entry: 'Global variable storage',
            description: JSON.stringify(globalVars, null, 2)
        });
    }
    
    // ==========================
    // Custom Tools Loading
    // ==========================
    
    // Store for runtime-loaded tools
    const runtimeTools = {};
    
    function loadRuntimeTools() {
        // Load runtime tools from [SANE_RUNTIME] TOOLS card
        const toolsCard = Utilities.storyCard.get('[SANE_RUNTIME] TOOLS');
        if (!toolsCard) return;
        
        try {
            // Parse the tools from the card (check both entry and description)
            const toolsCode = toolsCard.description || toolsCard.entry || '';
            if (!toolsCode.trim()) return;
            
            // Create context for the tools with proper binding
            const toolContext = {
                GameState: GameState,
                Utilities: Utilities,
                Calendar: typeof Calendar !== 'undefined' ? Calendar : null,
                state: state,
                info: info,
                history: history,
                console: console,
                log: log,
                debug: debug,
                get: get,
                set: set,
                load: load,
                save: save,
                loadAll: loadAll
            };
            
            // Use a simpler approach - just eval the whole tools definition
            // The format should be: toolname: function(...) { ... }, toolname2: function(...) { ... }
            try {
                // Wrap in object literal to make it valid JavaScript
                const wrappedCode = `({${toolsCode}})`;
                const toolDefinitions = eval(wrappedCode);
                
                // Register each tool
                for (const [name, func] of Object.entries(toolDefinitions)) {
                    if (typeof func === 'function') {
                        runtimeTools[name] = (function(toolName, toolFunc) {
                            return function(...args) {
                                try {
                                    // Apply the function with the tool context
                                    const result = toolFunc.apply(toolContext, args);
                                    
                                    if (debug) console.log(`${MODULE_NAME}: Runtime tool ${toolName} returned: ${result}`);
                                    return result;
                                } catch(e) {
                                    if (debug) console.log(`${MODULE_NAME}: Error in runtime tool ${toolName}: ${e.toString()}`);
                                    if (debug && e.stack) console.log(`${MODULE_NAME}: Stack: ${e.stack}`);
                                    return 'malformed';
                                }
                            };
                        })(name, func);
                    }
                }
                
                if (debug) {
                    console.log(`${MODULE_NAME}: Loaded ${Object.keys(runtimeTools).length} runtime tools`);
                }
            } catch(evalError) {
                if (debug) console.log(`${MODULE_NAME}: Failed to eval runtime tools: ${evalError}`);
            }
        } catch(e) {
            if (debug) console.log(`${MODULE_NAME}: Failed to load runtime tools: ${e}`);
        }
    }
    
    // ==========================
    // Input Commands System
    // ==========================
    const inputCommands = {};
    
    function loadInputCommands() {
        const commandsCard = Utilities.storyCard.get('[SANE_RUNTIME] INPUT_COMMANDS');
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
                logError(e, 'Failed to parse INPUT_COMMANDS');
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
                    getGlobalValue: getGlobalValue,
                    setGlobalValue: setGlobalValue,
                    loadAllCharacters: () => loadAll('Character'),
                    loadCharacter: function(name) {
                        const chars = loadAll('Character');
                        return chars[name.toLowerCase()];
                    },
                    saveCharacter: saveCharacter,
                    createCharacter: createCharacter,
                    getField: function(characterName, fieldPath) {
                        const character = loadCharacter(characterName);
                        if (!character) return null;
                        return getCharacterField(character, fieldPath);
                    },
                    setField: function(characterName, fieldPath, value) {
                        const character = loadCharacter(characterName);
                        if (!character) return false;
                        setCharacterField(character, fieldPath, value);
                        return save('Character', character);
                    },
                    Utilities: Utilities,
                    Calendar: typeof Calendar !== 'undefined' ? Calendar : null,
                    GenerationWizard: typeof GenerationWizard !== 'undefined' ? GenerationWizard : null,
                    RewindSystem: RewindSystem,  // Add RewindSystem access
                    debug: debug,
                    // Debug-only functions
                    trackUnknownEntity: isDebugCommand ? trackUnknownEntity : undefined,
                    loadEntityTrackerConfig: isDebugCommand ? loadEntityTrackerConfig : undefined,
                    loadGlobalVariables: isDebugCommand ? loadGlobalVariables : undefined
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
        const modifierCard = Utilities.storyCard.get('[SANE_RUNTIME] CONTEXT_MODIFIER');
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
    // Input/Output Modifiers
    // ==========================
    let inputModifier = null;
    let outputModifier = null;
    
    function loadInputModifier() {
        const modifierCard = Utilities.storyCard.get('[SANE_RUNTIME] INPUT_MODIFIER');
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
        const modifierCard = Utilities.storyCard.get('[SANE_RUNTIME] OUTPUT_MODIFIER');
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
            
            // Check for suspicious data loss or hash mismatches
            const existingData = RewindSystem.getStorage();
            let shouldBackup = false;
            let backupReason = '';
            
            // Check for significant data loss
            if (existingData.entries.length > 20 && data.entries.length < existingData.entries.length / 2) {
                shouldBackup = true;
                backupReason = `Data loss: ${data.entries.length} entries replacing ${existingData.entries.length}`;
            }
            
            // Check for hash mismatches (over 30% different)
            if (!shouldBackup && existingData.entries.length > 10 && data.entries.length > 10) {
                let mismatchCount = 0;
                const checkLength = Math.min(existingData.entries.length, data.entries.length);
                
                for (let i = 0; i < checkLength; i++) {
                    if (existingData.entries[i]?.h !== data.entries[i]?.h) {
                        mismatchCount++;
                    }
                }
                
                if (mismatchCount > checkLength * 0.3) {
                    shouldBackup = true;
                    backupReason = `Hash mismatch: ${mismatchCount}/${checkLength} entries differ`;
                }
            }
            
            if (shouldBackup) {
                if (debug) {
                    console.log(`${MODULE_NAME}: WARNING: ${backupReason} - creating backup in state`);
                }
                
                // Store backup in state with turn number
                if (!state.rewindBackups) {
                    state.rewindBackups = [];
                }
                
                state.rewindBackups.push({
                    turn: info?.actionCount || state.actionCount || 0,
                    entries: existingData.entries,
                    position: existingData.position,
                    reason: backupReason
                });
                
                // Keep only last 3 backups to prevent state bloat
                if (state.rewindBackups.length > 3) {
                    state.rewindBackups = state.rewindBackups.slice(-3);
                }
                
                // Log the issue
                logError(new Error('RewindSystem anomaly detected'), backupReason);
            }
            
            // Clean up old backups (older than 20 turns)
            if (state.rewindBackups && state.rewindBackups.length > 0) {
                const currentTurn = info?.actionCount || state.actionCount || 0;
                state.rewindBackups = state.rewindBackups.filter(backup => 
                    currentTurn - backup.turn < 20
                );
                
                if (state.rewindBackups.length === 0) {
                    delete state.rewindBackups; // Clean up empty array
                }
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
            
            // Position is ALWAYS bounded to 0-99 (for MAX_HISTORY of 100)
            // If no position specified, use current entries length
            if (position === null) {
                position = Math.min(data.entries.length, RewindSystem.MAX_HISTORY - 1);
            }
            
            // Ensure position is within bounds
            position = Math.min(position, RewindSystem.MAX_HISTORY - 1);
            
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
            
            // Update position to match where we just stored
            data.position = position;
            
            // Maintain max history - when we exceed max, remove oldest entry
            while (data.entries.length > RewindSystem.MAX_HISTORY) {
                data.entries.shift();
                // Adjust position since we removed an entry
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
            // Tool-specific reversions
            return {
                'add_item': (params) => ['add_item', [params[0], params[1], -params[2]]],  // Negate quantity
                'remove_item': (params) => ['remove_item', [params[0], params[1], -params[2]]],  // Negate quantity
                'deal_damage': (params) => ['heal', params],
                'heal': (params) => ['deal_damage', params],
                'add_tag': (params) => ['remove_tag', params],
                'remove_tag': (params) => ['add_tag', params],
                'transfer_item': (params) => ['transfer_item', [params[1], params[0], params[2], params[3]]],
                'add_levelxp': (params) => ['add_levelxp', [params[0], -params[1]]],
                'add_skillxp': (params) => ['add_skillxp', [params[0], params[1], -params[2]]],
                'update_relationship': (params) => ['update_relationship', [params[0], params[1], -params[2]]],
                'update_location': () => null,  // Can't revert without stored old location
                // Non-reversible tools return null
                'offer_quest': () => null,
                'check_threshold': () => null
            };
        },
        
        // Get revert info for a specific tool
        getRevertInfo: function(toolName, params) {
            const reversions = RewindSystem.getReversions();
            const reverter = reversions[toolName];
            if (reverter) {
                return reverter(params);
            }
            return null;
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
                                if (revertData.oldLocation) {
                                    const result = processToolCall('update_location', [params[0], revertData.oldLocation]);
                                    if (debug) console.log(`${MODULE_NAME}: Reverted location for ${params[0]} to ${revertData.oldLocation}: ${result}`);
                                }
                                break;
                                
                            case 'add_item':
                                if (revertData.oldQuantity !== undefined) {
                                    // Set the item quantity back to what it was
                                    const charName = String(params[0]).toLowerCase();
                                    const itemName = String(params[1]).toLowerCase().replace(/\s+/g, '_');
                                    const quantity = revertData.oldQuantity;
                                    
                                    if (quantity === 0) {
                                        // Remove the item entirely
                                        const result = processToolCall('remove_item', [params[0], params[1], params[2]]);
                                        if (debug) console.log(`${MODULE_NAME}: Reverted add_item by removing ${itemName} from ${charName}: ${result}`);
                                    } else {
                                        // Set to old quantity
                                        const char = load('Character', charName);
                                        if (char && char.inventory) {
                                            if (!char.inventory[itemName]) char.inventory[itemName] = {};
                                            char.inventory[itemName].quantity = quantity;
                                            save('Character', char);
                                            if (debug) console.log(`${MODULE_NAME}: Reverted add_item by setting ${itemName} quantity to ${quantity} for ${charName}`);
                                        }
                                    }
                                }
                                break;
                                
                            case 'remove_item':
                                if (revertData.oldQuantity !== undefined) {
                                    // Restore the item to its old quantity
                                    const result = processToolCall('add_item', [params[0], params[1], revertData.oldQuantity]);
                                    if (debug) console.log(`${MODULE_NAME}: Reverted remove_item by adding ${params[1]} x${revertData.oldQuantity} to ${params[0]}: ${result}`);
                                }
                                break;
                                
                            case 'transfer_item':
                                // Restore both characters to their old quantities
                                if (revertData.fromOldQuantity !== undefined && revertData.toOldQuantity !== undefined) {
                                    const fromChar = load('Character', String(params[0]).toLowerCase());
                                    const toChar = load('Character', String(params[1]).toLowerCase());
                                    const itemName = String(params[2]).toLowerCase().replace(/\s+/g, '_');
                                    
                                    if (fromChar && fromChar.inventory) {
                                        if (!fromChar.inventory[itemName]) fromChar.inventory[itemName] = {};
                                        fromChar.inventory[itemName].quantity = revertData.fromOldQuantity;
                                        save('Character', fromChar);
                                    }
                                    
                                    if (toChar && toChar.inventory) {
                                        if (revertData.toOldQuantity === 0) {
                                            delete toChar.inventory[itemName];
                                        } else {
                                            if (!toChar.inventory[itemName]) toChar.inventory[itemName] = {};
                                            toChar.inventory[itemName].quantity = revertData.toOldQuantity;
                                        }
                                        save('Character', toChar);
                                    }
                                    
                                    if (debug) console.log(`${MODULE_NAME}: Reverted transfer_item: restored ${itemName} quantities`);
                                }
                                break;
                                
                            case 'deal_damage':
                                if (revertData.oldHp !== undefined) {
                                    const targetName = params[1];
                                    const char = load('Character', String(targetName).toLowerCase());
                                    if (char && char.stats && char.stats.hp) {
                                        char.stats.hp.current = revertData.oldHp;
                                        save('Character', char);
                                        if (debug) console.log(`${MODULE_NAME}: Reverted deal_damage for ${targetName}, restored HP to ${revertData.oldHp}`);
                                    }
                                }
                                break;
                                
                            case 'update_relationship':
                                if (revertData.oldValue !== undefined) {
                                    const char = load('Character', String(params[0]).toLowerCase());
                                    if (char && char.relationships) {
                                        const char2Name = String(params[1]).toLowerCase();
                                        char.relationships[char2Name] = revertData.oldValue;
                                        save('Character', char);
                                        if (debug) console.log(`${MODULE_NAME}: Reverted relationship ${params[0]}->${params[1]} to ${revertData.oldValue}`);
                                    }
                                }
                                break;
                                
                            case 'add_levelxp':
                                if (revertData.oldLevel !== undefined && revertData.oldXp !== undefined) {
                                    const char = load('Character', String(params[0]).toLowerCase());
                                    if (char && char.stats && char.stats.level) {
                                        char.stats.level.value = revertData.oldLevel;
                                        if (!char.stats.level.xp) char.stats.level.xp = {};
                                        char.stats.level.xp.current = revertData.oldXp;
                                        save('Character', char);
                                        if (debug) console.log(`${MODULE_NAME}: Reverted level/XP for ${params[0]} to level ${revertData.oldLevel}, XP ${revertData.oldXp}`);
                                    }
                                }
                                break;
                                
                            case 'add_skillxp':
                                if (revertData.oldLevel !== undefined && revertData.oldXp !== undefined) {
                                    const char = load('Character', String(params[0]).toLowerCase());
                                    const skillName = String(params[1]).toLowerCase().replace(/\s+/g, '_');
                                    if (char && char.skills && char.skills[skillName]) {
                                        char.skills[skillName].level = revertData.oldLevel;
                                        if (!char.skills[skillName].xp) char.skills[skillName].xp = {};
                                        char.skills[skillName].xp.current = revertData.oldXp;
                                        save('Character', char);
                                        if (debug) console.log(`${MODULE_NAME}: Reverted skill ${skillName} for ${params[0]} to level ${revertData.oldLevel}, XP ${revertData.oldXp}`);
                                    }
                                }
                                break;
                                
                            case 'unlock_newskill':
                                // Skip reverting skill unlocks for now - would need to track if it was truly new
                                break;
                                
                            default:
                                // Check if this is an update_[stat] tool
                                if (tool.startsWith('update_') && revertData.statName && revertData.oldValue !== undefined) {
                                    const char = load('Character', String(params[0]).toLowerCase());
                                    if (char && char.attributes && char.attributes[revertData.statName]) {
                                        char.attributes[revertData.statName].value = revertData.oldValue;
                                        save('Character', char);
                                        if (debug) console.log(`${MODULE_NAME}: Reverted ${tool} for ${params[0]}, restored ${revertData.statName} to ${revertData.oldValue}`);
                                    }
                                } else {
                                    // For unknown tools
                                    if (debug) console.log(`${MODULE_NAME}: No specific revert handler for ${tool}`);
                                }
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
                if (toolName.startsWith('get')) continue;
                
                // Capture revert data BEFORE executing
                // Skip revert data capture here since captureRevertData is not accessible
                // This is called from RewindSystem which doesn't have access to the main scope
                const revertData = null;
                
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
            let editedPosition = -1;
            
            // First, find if any entry was edited
            for (let i = 0; i < checkLength; i++) {
                if (!history[i] || !data.entries[i]) continue;
                
                const historyHash = RewindSystem.quickHash(history[i].text);
                
                if (data.entries[i].h !== historyHash) {
                    editedPosition = i;
                    if (debug) console.log(`${MODULE_NAME}: History entry ${i} was edited - will revert from current back to ${i}, then replay`);
                    break;
                }
            }
            
            // If an edit was found, revert everything from current position back to the edit
            if (editedPosition >= 0) {
                // Step 1: Revert ALL tools from current position back to edited position (reverse order)
                for (let i = checkLength - 1; i >= editedPosition; i--) {
                    if (!data.entries[i]) continue;
                    
                    const oldTools = data.entries[i].t || [];
                    for (let j = oldTools.length - 1; j >= 0; j--) {
                        const [toolName, params, storedRevertData] = oldTools[j];
                        
                        // Use stored revert data for precise reversions
                        if (toolName === 'add_item' && storedRevertData && storedRevertData.oldQuantity !== undefined) {
                            const addedQty = parseInt(params[2]);
                            const revertQty = -(addedQty);
                            const revertText = `add_item(${params[0]}, ${params[1]}, ${revertQty})`;
                            RewindSystem.extractAndExecuteTools(revertText);
                            if (debug) console.log(`${MODULE_NAME}: Reverting entry ${i}: add_item via ${revertText}`);
                        } else if (toolName === 'update_location' && storedRevertData && storedRevertData.oldLocation) {
                            const revertText = `update_location(${params[0]}, ${storedRevertData.oldLocation})`;
                            RewindSystem.extractAndExecuteTools(revertText);
                            if (debug) console.log(`${MODULE_NAME}: Reverting entry ${i}: location via ${revertText}`);
                        } else {
                            const revertInfo = RewindSystem.getRevertInfo(toolName, params);
                            if (revertInfo) {
                                const [revertTool, revertParams] = revertInfo;
                                const revertText = `${revertTool}(${revertParams.join(',')})`;
                                RewindSystem.extractAndExecuteTools(revertText);
                                if (debug) console.log(`${MODULE_NAME}: Reverting entry ${i}: ${toolName} via ${revertText}`);
                            }
                        }
                    }
                }
                
                // Step 2: Re-execute ALL tools from edited position to current position (forward order)
                for (let i = editedPosition; i < checkLength; i++) {
                    if (!history[i]) continue;
                    
                    const historyHash = RewindSystem.quickHash(history[i].text);
                    const tools = RewindSystem.extractAndExecuteTools(history[i].text);
                    
                    // Update the stored entry with new hash and tool data
                    data.entries[i] = {
                        h: historyHash,
                        t: tools.map(t => [t.tool, t.params, t.revertData || {}])
                    };
                    
                    if (debug && tools.length > 0) {
                        console.log(`${MODULE_NAME}: Re-executed entry ${i} with ${tools.length} tools`);
                    }
                }
            }
            
            // Update position
            data.position = historyLength - 1;
            RewindSystem.saveStorage(data);
            
            if (debug) console.log(`${MODULE_NAME}: History check complete - ${data.entries.length} entries tracked`);
        }
    };
    
    
    function createEntityTrackerCards() {
        // Create entity tracker config
        if (!Utilities.storyCard.get('[SANE_CONFIG] Entity Tracker')) {
            Utilities.storyCard.add({
                title: '[SANE_CONFIG] Entity Tracker',
                type: 'data',
                entry: (
                    `# entity_threshold\n` +
                    `3\n` +
                    `# auto_generate\n` +
                    `true\n` +
                    `# entity_blacklist\n` +
                    `player, self, me, you, unknown`
                ),
                description: `// Entity tracking data\n`
            });
        }
        

        
        if (debug) console.log(`${MODULE_NAME}: Created entity tracker cards`);
    }
    
    // ==========================
    // RPG Schema Management
    // ==========================
    // schemaCache already declared at top of file
    
    function calculateLevelXPRequirement(level) {
        // Get stats component for level progression formula
        const statsComp = Utilities.storyCard.get('[SANE_COMP] stats');
        if (statsComp && statsComp.description) {
            try {
                const schema = JSON.parse(statsComp.description);
                if (schema.level_progression) {
                    // Check for level override first
                    if (schema.level_progression.xp_overrides && schema.level_progression.xp_overrides[String(level)]) {
                        return schema.level_progression.xp_overrides[String(level)];
                    }
                    // Use formula: level * (level - 1) * 500
                    if (schema.level_progression.xp_formula) {
                        // Simple eval replacement for safety
                        if (schema.level_progression.xp_formula === "level * (level - 1) * 500") {
                            return level * (level - 1) * 500;
                        }
                    }
                }
            } catch (e) {
                if (debug) console.log(`${MODULE_NAME}: Failed to parse stats schema`);
            }
        }
        // Fallback formula
        return level * 500;
    }
    
    function calculateMaxHP(level) {
        // Get stats component for HP progression
        const statsComp = Utilities.storyCard.get('[SANE_COMP] stats');
        if (statsComp && statsComp.description) {
            try {
                const schema = JSON.parse(statsComp.description);
                if (schema.hp_progression) {
                    const base = schema.hp_progression.base || 100;
                    const perLevel = schema.hp_progression.per_level || 20;
                    return base + ((level - 1) * perLevel);
                }
            } catch (e) {
                if (debug) console.log(`${MODULE_NAME}: Failed to parse stats schema`);
            }
        }
        // Fallback: 100 + 20 per level
        return 100 + ((level - 1) * 20);
    }
    
    function calculateSkillXPRequirement(skillName, level) {
        // Check skills component for formula
        const skillsComp = Utilities.storyCard.get('[SANE_COMP] skills');
        if (skillsComp && skillsComp.description) {
            try {
                const schema = JSON.parse(skillsComp.description);
                if (schema.registry && schema.registry[skillName]) {
                    const skillDef = schema.registry[skillName];
                    
                    // Check for skill-specific formula first
                    if (skillDef.xp_formula) {
                        const match = skillDef.xp_formula.match(/level\s*\*\s*(\d+)/);
                        if (match) {
                            return level * parseInt(match[1]);
                        }
                    }
                    
                    // Check category formula
                    if (skillDef.category && schema.categories && schema.categories[skillDef.category]) {
                        const categoryDef = schema.categories[skillDef.category];
                        if (categoryDef.xp_formula) {
                            const match = categoryDef.xp_formula.match(/level\s*\*\s*(\d+)/);
                            if (match) {
                                return level * parseInt(match[1]);
                            }
                        }
                    }
                }
                
                // Use default category if exists
                if (schema.categories && schema.categories.default && schema.categories.default.xp_formula) {
                    const match = schema.categories.default.xp_formula.match(/level\s*\*\s*(\d+)/);
                    if (match) {
                        return level * parseInt(match[1]);
                    }
                }
            } catch (e) {
                if (debug) console.log(`${MODULE_NAME}: Failed to parse skill registry`);
            }
        }
        // Fallback formula
        return level * 100;
    }
    
    function getSkillRegistry() {
        // Get the list of valid skills from component schema
        const skillsComp = Utilities.storyCard.get('[SANE_COMP] skills');
        if (skillsComp && skillsComp.description) {
            try {
                const schema = JSON.parse(skillsComp.description);
                return schema.registry || {};
            } catch (e) {
                if (debug) console.log(`${MODULE_NAME}: Failed to parse skill registry`);
            }
        }
        return {};
    }
    
    // ==========================
    // Relationship System
    // ==========================
    function loadRelationshipThresholds() {
        // Load from relationships component schema
        const relationshipSchema = Utilities.storyCard.get('[SANE_COMP] relationships');
        if (!relationshipSchema || !relationshipSchema.description) {
            // No component = no relationship system
            if (debug) console.log(`${MODULE_NAME}: Relationships component not found - relationship system disabled`);
            return [];
        }
        
        try {
            const schema = JSON.parse(relationshipSchema.description);
            if (schema.thresholds && Array.isArray(schema.thresholds)) {
                return schema.thresholds;
            }
            // Component exists but no thresholds defined
            if (debug) console.log(`${MODULE_NAME}: Relationships component has no thresholds defined`);
            return [];
        } catch (e) {
            if (debug) console.log(`${MODULE_NAME}: Failed to parse relationship schema`);
            return [];
        }
    }
    
    function getRelationshipFlavor(value, fromName, toName) {
        const thresholds = loadRelationshipThresholds();
        
        // Find matching threshold
        for (const threshold of thresholds) {
            if (value >= threshold.min && value <= threshold.max) {
                // Replace placeholders in flavor text if present
                return threshold.flavor
                    .replace(/\{from\}/g, fromName || '')
                    .replace(/\{to\}/g, toName || '')
                    .replace(/\{value\}/g, value);
            }
        }
        
        // Default if no threshold matches
        return `${value} points`;
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
    // Universal Format System
    // ==========================
    
    const formatCaches = {}; // Cache for all object formats
    
    // Resolve object type aliases using schema definitions
    function resolveObjectAlias(objectType) {
        if (!objectType) return objectType;
        
        // Initialize schemas and alias map if needed
        if (!schemaAliasMap) initializeSchemaRegistry();
        
        // Simple O(1) lookup in pre-built map
        const lowerType = objectType.toLowerCase();
        const resolved = schemaAliasMap[lowerType];
        
        // Return resolved name or original if not found
        return resolved || objectType;
    }
    
    // REMOVED loadObjectFormat - redundant with direct FORMAT card loading in saveEntityCard
    
    function parseFormatCard(card) {
        const format = {
            template: '',      // The template from description
            fields: {},        // Field parsing patterns from entry (for reading existing cards)
            computed: {},      // Computed field templates from entry (for building new cards)
            formats: {}        // Format hints for how to display specific fields
        };
        
        // Description IS the template
        format.template = card.description || '';
        
        // Entry contains computed fields and format hints
        // Two formats supported:
        // 1. fieldname: template_expression (for computed fields like prefix, info_line)
        // 2. format:fieldname: format_type (for display format hints)
        if (card.entry) {
            const lines = card.entry.split('\n');
            
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) continue;
                
                // Parse field definition - find the first colon
                const colonIdx = trimmed.indexOf(':');
                if (colonIdx === -1) continue;
                
                const fieldName = trimmed.substring(0, colonIdx).trim();
                const rest = trimmed.substring(colonIdx + 1).trim();
                
                // Check if this is a format hint
                if (fieldName.startsWith('format:')) {
                    // format:fieldname: format_type
                    const actualField = fieldName.substring(7); // Remove 'format:'
                    format.formats[actualField] = rest;
                }
                // Check if this looks like a template expression (contains { } or $())
                else if ((rest.includes('{') && rest.includes('}')) || (rest.includes('$(') && rest.includes(')'))) {
                    // This is a computed field template
                    // Keep the original template as-is
                    format.computed[fieldName] = rest;
                } else {
                    // Deprecated: regex patterns for parsing
                    // We now use JSON data storage, so these patterns are no longer used
                    // Skip storing them to avoid confusion
                    if (debug) console.log(`${MODULE_NAME}: Skipping deprecated parsing pattern: ${fieldName}`);
                }
            }
        }
        
        return format;
    }
    
    
    // ==========================
    // Entity Data Parsing
    // ==========================
    
    // Build structured data for DESCRIPTION field
    function buildEntityData(entity) {
        // Build clean entity with proper field order
        const cleanEntity = {};
        
        // Add primary fields first (in order)
        if (entity.name) cleanEntity.name = entity.name;
        if (entity._type) cleanEntity.type = entity._type;
        if (entity._subtype) cleanEntity.subtype = entity._subtype;  // e.g., 'Player' for PLAYER cards
        if (entity.aliases) cleanEntity.aliases = entity.aliases;
        
        // Skip these fields entirely
        const skipFields = ['name', '_type', '_subtype', 'aliases', '_cardTitle', '_isPlayer', '_title', 
                           'info_line', 'attributes_formatted', 'skills_formatted', 
                           'inventory_formatted', 'relationships_formatted'];
        
        // Add all other fields
        for (const [key, value] of Object.entries(entity)) {
            // Skip internal fields, already-added fields, and computed fields
            if (skipFields.includes(key) || key.startsWith('_') || key.endsWith('_formatted')) continue;
            
            // Skip empty objects and null values
            if (value !== null && value !== undefined && 
                !(typeof value === 'object' && Object.keys(value).length === 0)) {
                cleanEntity[key] = value;
            }
        }
        
        // Build the JSON data with markers
        let data = '<== REAL DATA ==>\n';
        data += JSON.stringify(cleanEntity, null, 2);
        data += '\n<== END DATA ==>';
        return data;
    }
    
    
    // Parse structured data from DESCRIPTION field
    function parseEntityData(description) {
        // Extract data between markers
        const dataMatch = description.match(/<== REAL DATA ==>([\s\S]*?)<== END DATA ==>/);
        if (!dataMatch) {
            console.log(`${MODULE_NAME}: WARNING - No data section found in card description`);
            return {}; // No data section - return empty entity
        }
        
        const dataSection = dataMatch[1].trim();
        
        try {
            // Simply parse the entire JSON object
            const entity = JSON.parse(dataSection);
            
            // Convert 'type' back to '_type' for internal use
            if (entity.type) {
                entity._type = entity.type;
                delete entity.type;
            }
            
            return entity;
        } catch (e) {
            console.log(`${MODULE_NAME}: ERROR - Failed to parse entity JSON: ${e.message}`);
            console.log(`${MODULE_NAME}: Data section: ${dataSection.substring(0, 200)}...`);
            return {}; // Return empty entity if parsing fails
        }
    }
    
    // ==========================
    // Display Card Building from Template
    // ==========================
    
    function formatFieldValue(value, formatType) {
        if (!value || !formatType) return value;
        
        switch(formatType.toLowerCase()) {
            case 'braced':
            case 'inventory':
                // Always format inventory as bulleted list for consistency
                if (typeof value === 'object') {
                    const items = [];
                    
                    for (const [key, val] of Object.entries(value)) {
                        const itemName = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                        
                        if (typeof val === 'object') {
                            const qty = val.quantity || 1;
                            const props = [];
                            if (val.equipped) props.push('equipped');
                            if (val.enhancement) props.push(`+${val.enhancement}`);
                            if (val.durability) props.push(`durability: ${val.durability}`);
                            if (val.bound_to) props.push(`bound: ${val.bound_to}`);
                            
                            if (props.length > 0) {
                                items.push(`• ${itemName} x${qty} (${props.join(', ')})`);
                            } else {
                                items.push(`• ${itemName} x${qty}`);
                            }
                        } else if (typeof val === 'number') {
                            items.push(`• ${itemName} x${val}`);
                        } else {
                            items.push(`• ${itemName}: ${val}`);
                        }
                    }
                    
                    return items.join('\n');
                }
                return value;
                
            case 'json':
                // Format as JSON
                return JSON.stringify(value);
                
            case 'bullets':
            case 'bulleted':
                // Format as bulleted list
                if (typeof value === 'object') {
                    const items = [];
                    for (const [key, val] of Object.entries(value)) {
                        if (typeof val === 'object' && val.name) {
                            items.push(`• ${val.name}: ${val.status || val.value || JSON.stringify(val)}`);
                        } else {
                            items.push(`• ${key}: ${val}`);
                        }
                    }
                    return items.join('\n');
                }
                return value;
                
            case 'pipe':
                // Format as pipe-delimited
                if (typeof value === 'object') {
                    const items = [];
                    for (const [key, val] of Object.entries(value)) {
                        if (typeof val === 'object' && val.name) {
                            items.push(`${val.name}: ${val.status || val.value}`);
                        } else {
                            items.push(`${key}: ${val}`);
                        }
                    }
                    return items.join(' | ');
                }
                return value;
                
            case 'multiline':
                // Format as one per line
                if (typeof value === 'object') {
                    const items = [];
                    for (const [key, val] of Object.entries(value)) {
                        if (typeof val === 'object') {
                            items.push(`${key}: ${JSON.stringify(val)}`);
                        } else {
                            items.push(`${key}: ${val}`);
                        }
                    }
                    return items.join('\n');
                }
                return value;
                
            case 'comma':
                // Format as comma-separated list
                if (Array.isArray(value)) {
                    return value.join(', ');
                } else if (typeof value === 'object') {
                    return Object.keys(value).join(', ');
                }
                return value;
                
            case 'skills_with_xp':
                // Format skills with XP progress
                if (typeof value === 'object') {
                    const formatted = [];
                    for (const [skillName, skillData] of Object.entries(value)) {
                        // Format skill names nicely (one_handed_sword -> One Handed Sword)
                        const displayName = skillName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                        if (typeof skillData === 'object' && skillData.level) {
                            const xp = skillData.xp || 0;
                            const maxXp = skillData.max_xp || 100;
                            formatted.push(`• ${displayName}: Level ${skillData.level} (${xp}/${maxXp} XP)`);
                        } else {
                            formatted.push(`• ${displayName}: ${JSON.stringify(skillData)}`);
                        }
                    }
                    return formatted.join('\n');
                }
                return value;
                
            case 'inline_pipes':
                // Format attributes as pipe-separated (VITALITY: 10 | STRENGTH: 10)
                if (typeof value === 'object') {
                    const items = [];
                    for (const [key, val] of Object.entries(value)) {
                        // Keep attributes uppercase
                        const displayKey = key.toUpperCase();
                        items.push(`${displayKey}: ${val}`);
                    }
                    return items.join(' | ');
                }
                return value;
                
            default:
                return value;
        }
    }
    
    function buildDisplayCard(data, template, cardTitle) {
        // The template IS the description field - just parse it directly
        // Debug logging removed for cleaner output
        
        const parser = new TemplateParser(data);
        return parser.parse(template);
    }
    
    // Process the ENTRY field to extract and evaluate computed fields
    // The DESCRIPTION field IS the template, used directly by buildDisplayCard
    
    // Template Parser Class
    class TemplateParser {
        constructor(data) {
            this.data = data;
            this.pos = 0;
            this.template = '';
        }
        
        // Check if value is truthy for conditionals
        isTruthy(value) {
            if (value === undefined || value === null || value === '') return false;
            if (value === false || value === 0) return false;
            if (typeof value === 'object' && Object.keys(value).length === 0) return false;
            return true;
        }
        
        // Main parse function
        parse(template) {
            this.template = template;
            this.pos = 0;
            return this.parseTemplate();
        }
        
        // Parse the entire template
        parseTemplate() {
            let result = '';
            
            while (this.pos < this.template.length) {
                const char = this.template[this.pos];
                
                // Handle $() syntax ONLY at the top level, not inside {}
                if (char === '$' && this.pos + 1 < this.template.length && this.template[this.pos + 1] === '(') {
                    const dollarResult = this.parseDollarExpression();
                    if (dollarResult !== null) {
                        result += dollarResult;
                    } else {
                        result += char;
                        this.pos++;
                    }
                } else if (char === '{') {
                    // Check for escaped braces {{
                    if (this.template[this.pos + 1] === '{') {
                        result += '{';
                        this.pos += 2;
                        continue;
                    }
                    
                    // Parse template expression
                    const expr = this.parseExpression();
                    if (expr !== null) {
                        result += expr;
                    } else {
                        // Failed to parse, treat as literal
                        result += char;
                        this.pos++;
                    }
                } else if (char === '}' && this.template[this.pos + 1] === '}') {
                    // Escaped closing braces
                    result += '}';
                    this.pos += 2;
                } else {
                    result += char;
                    this.pos++;
                }
            }
            
            return result;
        }
        
        // Parse a $() expression
        parseDollarExpression() {
            const start = this.pos;
            
            if (this.template.substring(this.pos, this.pos + 2) !== '$(') {
                return null;
            }
            
            this.pos += 2; // Skip $(
            
            // Find the closing )
            let parenDepth = 1;
            let exprEnd = this.pos;
            
            while (exprEnd < this.template.length && parenDepth > 0) {
                if (this.template[exprEnd] === '(') {
                    parenDepth++;
                } else if (this.template[exprEnd] === ')') {
                    parenDepth--;
                }
                exprEnd++;
            }
            
            if (parenDepth !== 0) {
                // Unmatched parentheses
                this.pos = start;
                return null;
            }
            
            const fieldPath = this.template.substring(this.pos, exprEnd - 1);
            this.pos = exprEnd; // Move past the closing )
            
            // Process as a simple field reference
            return this.processField(fieldPath);
        }
        
        // Parse a template expression {...}
        parseExpression() {
            const start = this.pos;
            
            if (this.template[this.pos] !== '{') {
                return null;
            }
            
            this.pos++; // Skip opening brace
            
            // Find the matching closing brace, accounting for nesting
            let braceDepth = 1;
            let exprEnd = this.pos;
            
            while (exprEnd < this.template.length && braceDepth > 0) {
                if (this.template[exprEnd] === '{') {
                    braceDepth++;
                } else if (this.template[exprEnd] === '}') {
                    braceDepth--;
                }
                exprEnd++;
            }
            
            if (braceDepth !== 0) {
                // Unmatched braces
                this.pos = start;
                return null;
            }
            
            const content = this.template.substring(this.pos, exprEnd - 1);
            this.pos = exprEnd; // Move past the closing brace
            
            
            // Parse the expression content
            return this.parseExpressionContent(content);
        }
        
        // Parse the content inside {...}
        parseExpressionContent(content) {
            
            // Check for loop syntax: field.*:template or field.*|template
            const loopMatch = content.match(/^([^.*]+)\.\*([:|])(.+)$/s);
            if (loopMatch) {
                // Pass the delimiter as part of the template only if it's a pipe
                const template = loopMatch[2] === '|' ? loopMatch[2] + loopMatch[3] : loopMatch[3];
                return this.processLoop(loopMatch[1], template);
            }
            
            // Check for conditional/ternary: field?content or field?true:false
            const condMatch = content.match(/^([^?]+)\?(.+)$/s);
            if (condMatch) {
                return this.processConditional(condMatch[1], condMatch[2]);
            }
            
            // Simple field replacement
            return this.processField(content);
        }
        
        // Process a loop expression
        processLoop(objectPath, template) {
            const obj = getNestedValue(this.data, objectPath);
            if (!obj || typeof obj !== 'object') return '';
            
            // Check for pipe delimiter at start of template
            let delimiter = '\n';
            let actualTemplate = template;
            if (template.startsWith('|')) {
                delimiter = ' | ';
                actualTemplate = template.substring(1);
            }
            
            const results = [];
            
            for (const [key, value] of Object.entries(obj)) {
                // Create a new parser with loop context
                const loopData = { ...this.data };
                
                // Process template with loop replacements
                let processed = actualTemplate;
                
                // Replace {*} with key (format nicely)
                processed = processed.replace(/\{\*\}/g, () => {
                    // Format snake_case to Title Case, or just capitalize single words
                    if (key.includes('_')) {
                        return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    }
                    // Capitalize first letter of single words
                    return key.charAt(0).toUpperCase() + key.slice(1);
                });
                
                // Replace {*.prop} with value properties
                processed = processed.replace(/\{\*\.([^}]*)\}/g, (m, prop) => {
                    // Special case: {*.} means the value itself
                    if (prop === '') {
                        return typeof value === 'object' ? JSON.stringify(value) : String(value);
                    }
                    
                    // Special handling for inventory items
                    if (prop === 'quantity') {
                        // For inventory, the value itself IS the quantity
                        if (typeof value === 'number') {
                            return String(value);
                        } else if (typeof value === 'object' && value !== null && value.hasOwnProperty('quantity')) {
                            // If it's an object with quantity property
                            return String(value.quantity);
                        }
                        // Default to the value itself if it's not an object
                        return String(value);
                    }
                    
                    // For other properties, use normal nested access
                    const propValue = getNestedValue(value, prop);
                    return propValue !== undefined ? String(propValue) : '';
                });
                
                // Handle nested conditionals within the loop
                processed = processed.replace(/\{([^?}]+)\?([^}]*)\}/g, (m, condition, condContent) => {
                    const condValue = condition.startsWith('*.') 
                        ? getNestedValue(value, condition.slice(2))
                        : getNestedValue(this.data, condition);
                    return this.isTruthy(condValue) ? condContent : '';
                });
                
                // Process any remaining field references
                const subParser = new TemplateParser(loopData);
                processed = subParser.parse(processed);
                
                if (processed.trim()) {
                    results.push(processed);
                }
            }
            
            // Join results with the chosen delimiter
            return results.join(delimiter);
        }
        
        // Process a conditional expression
        processConditional(fieldPath, content) {
            const value = getNestedValue(this.data, fieldPath.trim());
            const truthy = this.isTruthy(value);
            
            
            // Check for ternary operator
            // Need to find the : that's not inside nested braces and not escaped with \
            let braceDepth = 0;
            let colonIndex = -1;
            
            for (let i = 0; i < content.length; i++) {
                if (content[i] === '{') {
                    braceDepth++;
                } else if (content[i] === '}') {
                    braceDepth--;
                } else if (content[i] === ':' && braceDepth === 0) {
                    // Check if this colon is escaped with a backslash
                    if (i > 0 && content[i - 1] === '\\') {
                        // This is an escaped colon, not a ternary separator
                        continue;
                    }
                    colonIndex = i;
                    break;
                }
            }
            
            if (colonIndex !== -1) {
                // Ternary operator
                const trueContent = content.substring(0, colonIndex);
                const falseContent = content.substring(colonIndex + 1);
                
                
                const selectedContent = truthy ? trueContent : falseContent;
                
                // Process the selected content for nested templates
                const subParser = new TemplateParser(this.data);
                return subParser.parse(selectedContent);
            }
            
            // Simple conditional
            if (truthy) {
                // Remove escaped colons before parsing
                const unescapedContent = content.replace(/\\:/g, ':');
                // Parse the content, which may contain $() or {} expressions
                const subParser = new TemplateParser(this.data);
                return subParser.parse(unescapedContent);
            }
            
            return '';
        }
        
        // Process a simple field reference
        processField(fieldPath) {
            // Handle nested resolution like {character.{name}.location}
            if (fieldPath.includes('{') && fieldPath.includes('}')) {
                const innerPattern = /\{([^}]+)\}/;
                const resolved = fieldPath.replace(innerPattern, (m, innerField) => {
                    const innerValue = getNestedValue(this.data, innerField);
                    return innerValue || '';
                });
                
                // Now get the value from the resolved path
                // Check if it's an entity reference (character.Name, Location.Name, etc.)
                const parts = resolved.split('.');
                if (parts.length >= 2) {
                    // Initialize schema registry if needed
                    if (!schemaRegistry) schemaRegistry = initializeSchemaRegistry();
                    
                    // Check if first part might be an entity type
                    const possibleType = parts[0];
                    const capitalizedType = possibleType.charAt(0).toUpperCase() + possibleType.slice(1).toLowerCase();
                    
                    // Check if this is a valid entity type in the schema registry
                    if (schemaRegistry[capitalizedType]) {
                        const entityName = parts[1];
                        const field = parts.slice(2).join('.');
                        const entity = load(capitalizedType, entityName);
                        if (entity) {
                            return field ? getNestedValue(entity, field) || '' : JSON.stringify(entity);
                        }
                    }
                }
                return getNestedValue(this.data, resolved) || '';
            }
            
            // Handle direct entity references (character.Name.field, Location.Name.field, etc.)
            const parts = fieldPath.split('.');
            if (parts.length >= 2) {
                // Initialize schema registry if needed
                if (!schemaRegistry) schemaRegistry = initializeSchemaRegistry();
                
                const possibleType = parts[0];
                const capitalizedType = possibleType.charAt(0).toUpperCase() + possibleType.slice(1).toLowerCase();
                
                // Check if this is a valid entity type in the schema registry
                if (schemaRegistry[capitalizedType]) {
                    const entityName = parts[1];
                    const field = parts.slice(2).join('.');
                    const entity = load(capitalizedType, entityName);
                    if (entity) {
                        return field ? getNestedValue(entity, field) || '' : JSON.stringify(entity);
                    }
                }
            }
            
            // Simple field reference
            const value = getNestedValue(this.data, fieldPath);
            
            // Debug logging removed
            
            if (value === undefined || value === null) {
                if (debug && (fieldPath.includes('gender') || fieldPath.includes('level'))) {
                    console.log(`  Returning empty (undefined/null)`);
                }
                return '';
            }
            
            if (typeof value === 'object') {
                // Don't output raw objects unless it's intentional
                if (debug && (fieldPath.includes('gender') || fieldPath.includes('level'))) {
                    console.log(`  Returning empty (object)`);
                }
                return '';
            }
            
            const result = String(value);
            // Debug logging removed
            return result;
        }
    }
    
    // ==========================
    // Universal Entity Saving
    // ==========================
    
    function saveEntityCard(entity, objectType) {
        // Normalize object type
        objectType = resolveObjectAlias(objectType || entity._type);
        
        // Get schema for prefixes
        if (!schemaRegistry) schemaRegistry = initializeSchemaRegistry();
        const schema = schemaRegistry[objectType];
        if (!schema || !schema.prefixes || schema.prefixes.length === 0) {
            if (debug) console.log(`${MODULE_NAME}: No schema found for ${objectType}`);
            return false;
        }
        
        // Check if this entity type is data-only (no display cards)
        if (schema.dataOnly) {
            // This entity type doesn't use display cards
            if (debug) console.log(`${MODULE_NAME}: ${objectType} is data-only, no display card needed`);
            return true; // Successfully "saved" (no display card needed)
        }
        
        // Determine card title - check for existing card first
        let title = null;
        let prefix = null;
        
        // Check all possible prefixes for an existing card
        for (const checkPrefix of schema.prefixes) {
            const checkTitle = `[${checkPrefix}] ${entity.name}`;
            if (Utilities.storyCard.get(checkTitle)) {
                prefix = checkPrefix;
                title = checkTitle;
                break;
            }
        }
        
        // If no existing card, we should NOT create one automatically for PLAYER prefix
        // PLAYER cards are only created manually by users
        if (!title) {
            // Use the first non-PLAYER prefix, or just the first prefix if that's all we have
            prefix = schema.prefixes.find(p => p !== 'PLAYER') || schema.prefixes[0];
            title = `[${prefix}] ${entity.name}`;
        }
        
        // Set subtype based on the prefix we're using
        if (prefix === 'PLAYER') {
            entity._subtype = 'Player';
        } else if (prefix !== schema.prefixes[0]) {
            // If using a non-default prefix, store it as subtype
            entity._subtype = prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase();
        }
        
        
        // Load FORMAT card - try prefix-specific first, then fall back to type
        let formatCard = Utilities.storyCard.get(`[SANE_FORMAT] ${prefix}`);
        if (!formatCard) {
            // Try object type as fallback
            formatCard = Utilities.storyCard.get(`[SANE_FORMAT] ${objectType}`);
            if (!formatCard) {
                // No FORMAT card - cannot save display card
                if (debug) console.log(`${MODULE_NAME}: No FORMAT card for ${prefix} or ${objectType} - cannot save display card`);
                return false;
            }
        }
        
        // Parse FORMAT card
        const formatConfig = parseFormatCard(formatCard);
        
        // Always rebuild - no surgical updates in new system
        const existingCard = Utilities.storyCard.get(title);
        
        // Start with entity data
        const mergedData = { ...entity };
        
        // Ensure name is set
        mergedData.name = entity.name;
        
        // Apply format hints to data fields before computing
        if (formatConfig.formats && Object.keys(formatConfig.formats).length > 0) {
            if (debug) {
                console.log(`${MODULE_NAME}: Applying ${Object.keys(formatConfig.formats).length} format hints`);
                console.log(`${MODULE_NAME}: Format config entries:`, Object.entries(formatConfig.formats));
                console.log(`${MODULE_NAME}: MergedData keys:`, Object.keys(mergedData));
            }
            for (const [fieldPath, formatType] of Object.entries(formatConfig.formats)) {
                const value = getNestedField(mergedData, fieldPath);
                if (debug) {
                    console.log(`${MODULE_NAME}: Looking for field '${fieldPath}', found:`, value !== undefined ? 'YES' : 'NO');
                    if (value !== undefined) {
                        console.log(`${MODULE_NAME}: Field value:`, JSON.stringify(value));
                    }
                }
                if (value !== undefined) {
                    const formatted = formatFieldValue(value, formatType);
                    setNestedField(mergedData, fieldPath + '_formatted', formatted);
                    if (debug) {
                        const preview = typeof formatted === 'string' ? formatted.substring(0, 50) : JSON.stringify(formatted);
                        console.log(`${MODULE_NAME}: Formatted ${fieldPath} as ${formatType}: ${preview}...`);
                    }
                } else {
                    if (debug) console.log(`${MODULE_NAME}: Field '${fieldPath}' not found in entity data`);
                }
            }
        }
        
        // Compute fields from ENTRY before building display
        if (formatConfig.computed && Object.keys(formatConfig.computed).length > 0) {
            for (const [fieldName, templateExpr] of Object.entries(formatConfig.computed)) {
                // Evaluate the template expression with current data
                const parser = new TemplateParser(mergedData);
                const computedValue = parser.parse(templateExpr);
                // Add computed field to data
                mergedData[fieldName] = computedValue;
            }
        }
        
        
        // Build new display card from template
        const newCardContent = buildDisplayCard(mergedData, formatConfig.template, title);
        
        // Build structured data for DESCRIPTION field
        const structuredData = buildEntityData(mergedData);
        
        // Generate keys for character cards
        let keys = null;
        if (objectType === 'Character') {
            // Format: " name,(name, trigger_name,(trigger_name" for characters
            // Space before names WITHOUT parenthesis, no space before names WITH parenthesis
            const name = entity.name || '';
            const triggerName = entity.info?.trigger_name || '';
            if (triggerName && triggerName.toLowerCase() !== name.toLowerCase()) {
                keys = ` ${name.toLowerCase()},(${name.toLowerCase()}, ${triggerName.toLowerCase()},(${triggerName.toLowerCase()}`;
            } else {
                keys = ` ${name.toLowerCase()},(${name.toLowerCase()}`;
            }
        } else if (objectType === 'Location') {
            // Format: "Snake_Case, Normal Case" for locations
            const snakeCased = entity.name.replace(/\s+/g, '_');
            const normalCased = entity.name.replace(/_/g, ' ');
            keys = `${snakeCased}, ${normalCased}`;
        }
        
        // Save or update the card
        if (existingCard) {
            // Preserve existing description content outside data markers
            let updatedDescription = existingCard.description || '';
            
            // Check if there's existing data section to replace
            if (updatedDescription.includes('<== REAL DATA ==>')) {
                // Replace just the data section
                updatedDescription = updatedDescription.replace(
                    /<== REAL DATA ==>([\s\S]*?)<== END DATA ==>/,
                    structuredData
                );
            } else {
                // No data section yet - append it
                if (updatedDescription && !updatedDescription.endsWith('\n')) {
                    updatedDescription += '\n';
                }
                updatedDescription += structuredData;
            }
            
            const updateData = { 
                entry: newCardContent.trim(),
                description: updatedDescription
            };
            if (keys) updateData.keys = keys;
            
            Utilities.storyCard.update(title, updateData);
        } else {
            const cardData = {
                title: title,
                type: 'data',
                entry: newCardContent.trim(),
                description: structuredData
            };
            if (keys) cardData.keys = keys;
            
            Utilities.storyCard.add(cardData);
        }
        
        // Update the entity card map
        if (!entityCardMap) entityCardMap = {};
        if (!entityCardMap[objectType]) entityCardMap[objectType] = {};
        entityCardMap[objectType][entity.name.toLowerCase()] = title;
        
        if (debug) console.log(`${MODULE_NAME}: Saved ${objectType} display card for ${entity.name}`);
        return true;
    }
    
    // ==========================
    // Inventory Management
    // ==========================
    
    function normalizeInventory(inventory) {
        // Convert old format to new format if needed
        // Old: { "sword": 1, "potion": 3 }
        // New: { "sword": { "quantity": 1 }, "potion": { "quantity": 3 } }
        
        if (!inventory || typeof inventory !== 'object') return {};
        
        const normalized = {};
        for (const [item, value] of Object.entries(inventory)) {
            if (typeof value === 'number') {
                // Old format - convert to new
                normalized[item] = { quantity: value };
            } else if (typeof value === 'object' && value !== null) {
                // Already new format
                normalized[item] = value;
            }
        }
        return normalized;
    }
    
    function getItemQuantity(inventory, itemName) {
        if (!inventory || !inventory[itemName]) return 0;
        const item = inventory[itemName];
        return typeof item === 'number' ? item : (item.quantity || 0);
    }
    
    function setItemQuantity(inventory, itemName, quantity) {
        if (!inventory) inventory = {};
        
        if (quantity <= 0) {
            delete inventory[itemName];
        } else {
            // Preserve other properties if they exist
            if (typeof inventory[itemName] === 'object') {
                inventory[itemName].quantity = quantity;
            } else {
                inventory[itemName] = { quantity: quantity };
            }
        }
        return inventory;
    }
    
    // ==========================
    // Character Field Accessors
    // ==========================
    
    // Simple wrappers for component-based field access
    function getCharacterField(character, fieldPath) {
        if (!character || !fieldPath) return null;
        return getNestedField(character, fieldPath);
    }
    
    function setCharacterField(character, fieldPath, value) {
        if (!character || !fieldPath) return false;
        setNestedField(character, fieldPath, value);
        return true;
    }
    
    
    // ==========================
    // Faction Helper Functions
    // ==========================
    function getFactionMembers(factionName) {
        const faction = load('Faction', factionName);
        return faction?.members || [];
    }
    
    function getCharacterFaction(characterName) {
        // Search all factions for this character
        const factions = loadAll('Faction');
        for (const [name, faction] of Object.entries(factions || {})) {
            if (faction.members && faction.members.includes(characterName)) {
                return name;
            }
        }
        return null;
    }
    
    function getFactionRelations(factionName) {
        const faction = load('Faction', factionName);
        if (!faction) return { allies: [], enemies: [] };
        return {
            allies: faction.allied_factions || faction.allies || [],
            enemies: faction.enemy_factions || faction.enemies || []
        };
    }

    
    // ==========================
    // Unified Entity Creation System
    // ==========================
    
    // Initialize entity with default component values
    function initializeEntityComponents(entityType, data = {}) {
        // Initialize schema registry if needed
        if (!schemaRegistry) {
            initializeSchemaRegistry();
        }
        
        const schema = schemaRegistry[entityType];
        if (!schema) return null;
        
        const entity = {
            name: data.name || 'Unknown',
            type: entityType
        };
        
        // Initialize each component
        if (schema.components && schemaRegistry._components) {
            for (const compName of schema.components) {
                const compSchema = schemaRegistry._components[compName];
                if (!compSchema) continue;
                
                // Initialize component with defaults
                entity[compName] = {};
                
                // Apply defaults from component schema
                if (compSchema.defaults) {
                    entity[compName] = JSON.parse(JSON.stringify(compSchema.defaults));
                }
                
                // Apply data for this component if provided
                if (data[compName]) {
                    // Deep merge data into component
                    entity[compName] = mergeDeep(entity[compName], data[compName]);
                }
            }
        }
        
        // Don't apply root-level data that should be in components
        // Only apply special fields like _triggerName
        for (const [key, value] of Object.entries(data)) {
            if (key.startsWith('_') && !entity[key]) {
                entity[key] = value;
            }
        }
        
        return entity;
    }
    
    // Deep merge helper
    function mergeDeep(target, source) {
        if (!source) return target;
        if (!target) return source;
        
        // If target is not an object, just return source
        if (typeof target !== 'object' || Array.isArray(target)) {
            return source;
        }
        
        // If source is not an object, just return it
        if (typeof source !== 'object' || Array.isArray(source)) {
            return source;
        }
        
        const output = Object.assign({}, target);
        
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                if (target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
                    output[key] = mergeDeep(target[key], source[key]);
                } else {
                    output[key] = source[key];
                }
            } else {
                output[key] = source[key];
            }
        }
        
        return output;
    }
    
    /**
     * Create any entity type with initial data
     * @param {string} entityType - Type of entity (Character, Location, Item, Faction, etc.)
     * @param {object} data - Initial data for the entity (can use flat, component, or dot notation)
     * @returns {object|null} The created entity or null if failed
     */
    function create(entityType, data = {}) {
        // Normalize entity type
        entityType = String(entityType).charAt(0).toUpperCase() + String(entityType).slice(1).toLowerCase();
        const singularType = entityType.replace(/s$/, '');
        
        // Initialize entity with components
        const entity = initializeEntityComponents(singularType, data);
        if (!entity) {
            if (debug) console.log(`${MODULE_NAME}: Failed to initialize entity of type ${singularType}`);
            return null;
        }
        
        // Apply entity-specific initialization
        switch (singularType) {
            case 'Character':
                // Ensure info component exists
                if (!entity.info) entity.info = {};
                
                // Set isPlayer flag if provided
                const isPlayer = data.isPlayer || data['info.isPlayer'] || false;
                entity.info.isPlayer = isPlayer;
                
                // Merge info component fields for backward compatibility
                const infoFields = ['full_name', 'gender', 'race', 'class', 'appearance', 'personality', 'background', 'goals'];
                for (const field of infoFields) {
                    // Check both root level (backward compat) and info.field
                    if (data[field] !== undefined) {
                        entity.info[field] = data[field];
                    } else if (data[`info.${field}`] !== undefined) {
                        entity.info[field] = data[`info.${field}`];
                    }
                }
                break;
                
            case 'Location':
                // Location-specific initialization
                if (!entity.info) entity.info = {};
                
                // Handle location type
                if (data.type !== undefined) {
                    entity.info.type = data.type;
                } else if (data['info.type'] !== undefined) {
                    entity.info.type = data['info.type'];
                }
                break;
                
            case 'Item':
                // Item-specific initialization
                if (!entity.info) entity.info = {};
                
                // Handle item type and properties
                const itemFields = ['type', 'rarity', 'damage', 'defense', 'value'];
                for (const field of itemFields) {
                    if (data[field] !== undefined) {
                        entity.info[field] = data[field];
                    } else if (data[`info.${field}`] !== undefined) {
                        entity.info[field] = data[`info.${field}`];
                    }
                }
                break;
                
            case 'Faction':
                // Faction-specific initialization
                if (!entity.info) entity.info = {};
                
                // Handle faction properties
                const factionFields = ['leader', 'type', 'alignment', 'headquarters'];
                for (const field of factionFields) {
                    if (data[field] !== undefined) {
                        entity.info[field] = data[field];
                    } else if (data[`info.${field}`] !== undefined) {
                        entity.info[field] = data[`info.${field}`];
                    }
                }
                break;
        }
        
        // Save the entity using universal system
        if (save(singularType, entity)) {
            // Clear cached version of this entity
            delete entityCache[`${singularType}.${entity.name}`];
            
            if (debug) console.log(`${MODULE_NAME}: Created ${singularType} '${entity.name}' with components`);
            return entity;
        }
        
        if (debug) console.log(`${MODULE_NAME}: Failed to save ${singularType} '${entity.name}'`);
        return null;
    }
    
    function createCharacter(characterData) {
        // Redirect to unified create function
        return create('Character', characterData);
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
    // Helper function to navigate nested object paths
    function navigatePath(obj, path) {
        if (!obj || !path) return obj;
        
        const parts = path.split('.');
        let current = obj;
        
        for (const part of parts) {
            // Handle array notation [0]
            const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
            if (arrayMatch) {
                const field = arrayMatch[1];
                const index = parseInt(arrayMatch[2]);
                current = current?.[field]?.[index];
            } else {
                current = current?.[part];
            }
            
            if (current === undefined || current === null) {
                return null;
            }
        }
        
        return current;
    }
    
    // Helper to find first [PLAYER] card
    function loadFirstPlayer() {
        const playerCard = Utilities.storyCard.find(
            card => card.title && card.title.startsWith('[PLAYER]')
        );
        
        if (!playerCard) return null;
        
        const nameMatch = playerCard.title.match(/\[PLAYER\]\s+(.+)/);
        if (!nameMatch) return null;
        
        return loadCharacter(nameMatch[1]);
    }
    
    // New flexible getter system with $() syntax
    function processFlexibleGetters(text) {
        if (!text) return text;
        
        let recursionDepth = 0;
        const MAX_RECURSION = 10;
        
        function resolveGetters(str) {
            if (recursionDepth++ > MAX_RECURSION) {
                console.log(`${MODULE_NAME}: Max recursion depth reached in getter resolution`);
                return str;
            }
            
            // First, resolve any $() expressions
            str = str.replace(/\$\(([^)]+)\)/g, (match, expr) => {
                // Resolve the inner expression as a getter
                const resolved = resolveGetters(`get[${expr}]`);
                // Extract just the value (remove get[] wrapper if present)
                return resolved.replace(/^get\[|\]$/g, '');
            });
            
            // Pattern: get[type.key] or get[key] followed by optional .path.to.field
            const FLEX_GETTER = /get\[([^\]]+)\](?:\.([\w\d_.\[\]]+))?/g;
            
            return str.replace(FLEX_GETTER, (match, selector, pathAfterBracket) => {
                // Parse selector (e.g., "character.Bob.level" or "character.Bob")
                const parts = selector.split('.');
                let entity = null;
                let fieldPath = null;
                
                // Determine the type and entity name
                if (parts[0] === 'character' || parts[0] === 'char') {
                    // For character.NAME.FIELD or character.NAME
                    // Try loading with just the name first
                    entity = loadCharacter(parts[1]);
                    // If there are more parts, they're the field path
                    if (parts.length > 2) {
                        fieldPath = parts.slice(2).join('.');
                    }
                } else if (parts[0] === 'location' || parts[0] === 'loc') {
                    // For location.NAME.FIELD or location.NAME
                    // Use universal load function instead of quick cache
                    entity = load('Location', parts[1]);
                    if (parts.length > 2) {
                        fieldPath = parts.slice(2).join('.');
                    }
                } else if (parts[0] === 'faction') {
                    // For faction.NAME.FIELD or faction.NAME
                    // Use universal load function instead of quick cache
                    entity = load('Faction', parts[1]);
                    if (parts.length > 2) {
                        fieldPath = parts.slice(2).join('.');
                    }
                } else if (parts[0] === 'player') {
                    // Special case: player.FIELD or just player
                    entity = loadFirstPlayer();
                    if (parts.length > 1) {
                        fieldPath = parts.slice(1).join('.');
                    }
                } else if (parts[0] === 'global' || parts[0] === 'var') {
                    // Access global variables: runtime.VAR_NAME or runtime.VAR_NAME.FIELD
                    const varName = parts[1];
                    entity = getGlobalValue(varName);
                    if (parts.length > 2) {
                        fieldPath = parts.slice(2).join('.');
                    }
                } else {
                    // Auto-detect type by trying each loader
                    const name = parts[0];
                    entity = loadCharacter(name);
                    
                    if (!entity) {
                        // Try loading as location
                        entity = load('Location', name);
                    }
                    
                    if (!entity) {
                        // Try loading as faction
                        entity = load('Faction', name);
                    }
                    
                    // If there are more parts, they're the field path
                    if (parts.length > 1) {
                        fieldPath = parts.slice(1).join('.');
                    }
                }
                
                // Combine internal field path with any path after the bracket
                if (pathAfterBracket) {
                    fieldPath = fieldPath ? `${fieldPath}.${pathAfterBracket}` : pathAfterBracket;
                }
                
                // Navigate to the field if specified
                if (fieldPath && entity) {
                    const value = navigatePath(entity, fieldPath);
                    // Convert objects/arrays to JSON, primitives to string
                    if (value !== null && typeof value === 'object') {
                        return JSON.stringify(value);
                    }
                    return value !== null && value !== undefined ? String(value) : '???';
                }
                
                // Return the entity or ??? if not found
                if (entity !== null && entity !== undefined) {
                    if (typeof entity === 'object') {
                        return JSON.stringify(entity);
                    }
                    return String(entity);
                }
                
                return '???';
            });
        }
        
        return resolveGetters(text);
    }
    
    function processGetters(text) {
        if (!text) return text;
        
        // First try the new flexible getter system
        text = processFlexibleGetters(text);
        
        // Then handle legacy function-style getters for Calendar API only
        return text.replace(FUNCTION_GETTER_PATTERN, function(match) {
            // Parse the function getter: get_something(parameters)
            const innerMatch = match.match(/get_([a-z_]+)\s*\(([^)]*)\)/i);
            if (!innerMatch) return match;
            
            const getterType = innerMatch[1];
            const paramString = innerMatch[2];
            const params = parseParameters(paramString);
            
            // Process different getter types
            switch(getterType) {
                // Character getters - redirect to flexible getter system
                case 'location':
                case 'hp':
                case 'level':
                case 'xp':
                case 'name':
                case 'attribute':
                case 'skill':
                case 'inventory':
                case 'stat':
                    // These should use get[character.NAME.field] syntax instead
                    // But keep for backward compatibility
                    let charName = params[0];
                    if (!charName) return match;
                    
                    // Special case: resolve "player" to actual player name
                    if (charName.toLowerCase() === 'player') {
                        // Find the first [PLAYER] card
                        const playerCard = Utilities.storyCard.find(card => {
                            return card.title && card.title.startsWith('[PLAYER]');
                        }, false);
                        
                        if (playerCard) {
                            const titleMatch = playerCard.title.match(/\[PLAYER\]\s+(.+)/);
                            if (titleMatch) {
                                charName = titleMatch[1].trim();
                            }
                        }
                    }
                    
                    // Convert to new syntax and process
                    let newGetter;
                    if (getterType === 'attribute' || getterType === 'skill') {
                        newGetter = `get[character.${charName}.${getterType}s.${params[1]}]`;
                    } else if (getterType === 'stat') {
                        newGetter = `get[character.${charName}.stats.${params[1]}]`;
                    } else {
                        // Map to component paths
                        const fieldMap = {
                            'location': 'info.location',
                            'hp': 'stats.hp',
                            'level': 'stats.level', 
                            'xp': 'stats.xp',
                            'name': 'name',
                            'inventory': 'inventory'
                        };
                        newGetter = `get[character.${charName}.${fieldMap[getterType]}]`;
                    }
                    return processFlexibleGetters(newGetter);
                    
                // Time getters (Calendar API) - keep these as they interface with Calendar module
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
                    
                default:
                    // For any unknown getter, try to resolve it as a runtime variable
                    // This allows custom getters defined in [SANE_RUNTIME] Variables
                    const value = getGlobalValue(getterType);
                    if (value !== null) {
                        return typeof value === 'object' ? JSON.stringify(value) : String(value);
                    }
                    
                    if (debug) console.log(`${MODULE_NAME}: Unknown getter type: ${getterType}`);
                    return match;
            }
        });
    }
    
    // Character getter functions
    // Helper function to get a character from cache efficiently
    function getCharacterLocation(name) {
        const character = load('Character', name);
        return character?.info?.location || null;
    }
    
    function getCharacterHP(name) {
        const character = load('Character', name);
        if (!character) return null;
        const hp = character.stats?.hp;
        return hp ? `${hp.current}/${hp.max}` : null;
    }
    
    function getCharacterLevel(name) {
        const character = load('Character', name);
        if (!character) return null;
        const level = character.stats?.level?.value;
        return level ? level.toString() : null;
    }
    
    function getCharacterXP(name) {
        const character = load('Character', name);
        if (!character) return null;
        const xp = character.stats?.level?.xp;
        return xp ? `${xp.current}/${xp.max}` : null;
    }
    
    function getCharacterName(name) {
        const character = load('Character', name);
        return character ? character.name : null;
    }
    
    function getCharacterAttribute(characterName, attrName) {
        if (!attrName) return null;
        
        const character = load('Character', characterName);
        if (!character) return null;
        
        const attrKey = String(attrName).toLowerCase();
        const attributes = character.attributes || {};
        const value = attributes[attrKey];
        if (typeof value === 'object' && value.value !== undefined) {
            return value.value.toString();
        }
        return value ? value.toString() : null;
    }
    
    function getCharacterSkill(characterName, skillName) {
        if (!skillName) return null;
        
        const character = load('Character', characterName);
        if (!character) return null;
        
        const skillKey = String(skillName).toLowerCase();
        const skills = character.skills || {};
        const skill = skills[skillKey];
        if (!skill) return null;
        if (typeof skill === 'object' && skill.level !== undefined) {
            return skill.xp ? `Level ${skill.level} (${skill.xp.current}/${skill.xp.max} XP)` : `Level ${skill.level}`;
        }
        return skill.toString();
    }
    
    function getCharacterInventory(name) {
        const character = load('Character', name);
        if (!character) return null;
        
        const items = Object.entries(character.inventory || {})
            .filter(([item, qty]) => qty !== 0)
            .map(([item, qty]) => `${item}:${qty}`);
        
        return items.length > 0 ? `{${items.join(', ')}}` : '{}';
    }
    
    function getCharacterStat(characterName, statName) {
        if (!statName) return null;
        
        const character = load('Character', characterName);
        if (!character) return null;
        
        const statKey = String(statName).toLowerCase();
        
        // Check if it's HP (special case)
        if (statKey === 'hp') {
            const hp = character.stats?.hp;
            return hp ? `${hp.current}/${hp.max}` : null;
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
            `[**Current Scene** Location: get_location(${playerName}) | get_formattedtime() (get_timeofday())\n` +
            `**Available Tools:**\n` +
            `• Location: update_location(name, place) discover_location(character, place, direction) connect_locations(placeA, placeB, direction)\n` +
            `  - Directions: north, south, east, west, inside (enter), outside (exit)\n` +
            `• Time: advance_time(hours, minutes)\n` +
            `• Inventory: add_item(name, item, qty) remove_item(name, item, qty) transfer_item(giver, receiver, item, qty)\n` +
            `• Relations: update_relationship(name1, name2, points)\n` +
            `• Quests: offer_quest(npc, quest, type) update_quest(player, quest, stage) complete_quest(player, quest)\n` +
            `• Progression: add_levelxp(name, amount) add_skillxp(name, skill, amount) unlock_newskill(name, skill)\n` +
            `• Stats: update_attribute(name, attribute, value) update_hp(name, current, max)\n` +
            `• Combat: deal_damage(source, target, amount)]`
        );
        
        Utilities.storyCard.add({
            title: '[CURRENT SCENE]',
            type: 'data',
            entry: defaultText,
            description: 'Edit this card to customize what appears in the scene block. Use get_*(params) for dynamic values.',
            keys: '.,a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u,v,w,x,y,z,"'
        });
        
        if (debug) console.log(`${MODULE_NAME}: Created default Current Scene template with player: ${playerName}`);
        return defaultText;
    }
    
    function moveCurrentSceneCard(contextText) {
        // Get or create the Current Scene card
        let sceneCard = Utilities.storyCard.get('[CURRENT SCENE]');
        if (!sceneCard) {
            // Create the default scene card
            createDefaultCurrentScene();
            sceneCard = Utilities.storyCard.get('[CURRENT SCENE]');
        }
        
        // Get the scene content
        const sceneContent = sceneCard.entry;
        if (!sceneContent) {
            return contextText;
        }
        
        // Find where the scene starts in context (look for the pattern)
        const sceneStartPattern = /\[\*\*Current Scene\*\*/;
        const startMatch = contextText.match(sceneStartPattern);
        
        if (!startMatch) {
            // Scene not found in context
            return contextText;
        }
        
        const startIdx = startMatch.index;
        
        // Find the end by looking for the closing bracket and newlines
        // The scene ends with ")] followed by newlines
        let endIdx = contextText.indexOf(')]', startIdx);
        if (endIdx === -1) {
            // Fallback: just remove from start to next double newline
            endIdx = contextText.indexOf('\n\n', startIdx);
            if (endIdx === -1) {
                endIdx = contextText.length;
            }
        } else {
            endIdx += 2; // Include the )]
            // Skip any trailing whitespace/newlines
            while (endIdx < contextText.length && /\s/.test(contextText[endIdx])) {
                endIdx++;
            }
        }
        
        // Remove the scene from context
        let modifiedContext = contextText.substring(0, startIdx) + contextText.substring(endIdx);
        
        // Clean up any resulting double/triple newlines
        modifiedContext = modifiedContext.replace(/\n\n\n+/g, '\n\n');
        
        // If no history or very early in adventure, just return without the scene
        if (!history || history.length < 3) {
            return modifiedContext;
        }
        
        // Now find where to reinsert it (after first sentence of entry at -3)
        const targetIndex = history.length - 3;
        const historyEntry = history[targetIndex];
        
        if (!historyEntry || !historyEntry.text) {
            // If we can't find the target, put it back at the start
            return sceneContent + '\n\n' + modifiedContext;
        }
        
        const lastEntry = historyEntry.text;
        
        // Find where this history entry appears in the modified context
        const entryIndex = modifiedContext.indexOf(lastEntry);
        if (entryIndex === -1) {
            // If we can't find the entry, put scene at the start
            return sceneContent + '\n\n' + modifiedContext;
        }
        
        // Find end of first sentence within that entry
        const firstSentenceMatch = lastEntry.match(/^[^.!?]+[.!?]/);
        if (!firstSentenceMatch) {
            // No sentence found, put scene at start
            return sceneContent + '\n\n' + modifiedContext;
        }
        
        const firstSentence = firstSentenceMatch[0];
        const insertPosition = entryIndex + firstSentence.length;
        
        // Build the new context with scene at new position
        const beforeInsert = modifiedContext.substring(0, insertPosition);
        const afterInsert = modifiedContext.substring(insertPosition);
        
        // Ensure proper spacing (entries should be separated by double \n)
        let separator = '\n\n';
        if (afterInsert.startsWith('\n')) {
            // Already has at least one newline
            separator = afterInsert.startsWith('\n\n') ? '' : '\n';
        }
        
        return beforeInsert + separator + sceneContent + '\n\n' + afterInsert.trimStart();
    }
    
    // ==========================
    // Character Name Validation
    // ==========================
    const INVALID_CHARACTER_NAMES = [
        // Generic references
        'player', 'self', 'me', 'you', 'user', 'myself', 'yourself', 
        'him', 'her', 'them', 'they', 'it', 'this', 'that',
    ];
    
    function isValidCharacterName(name) {
        if (!name || typeof name !== 'string') return false;
        
        // Convert to lowercase for checking
        const normalized = name.toLowerCase().trim();
        
        // Check if empty or just whitespace
        if (!normalized) return false;
        
        // Check against blacklist of generic terms (but allow compound names like "player_unknown")
        if (INVALID_CHARACTER_NAMES.includes(normalized)) {
            if (debug) console.log(`${MODULE_NAME}: Invalid character name detected: "${name}" (blacklisted)`);
            return false;
        }
        
        // Valid syntax - doesn't need to exist yet (allows hallucinated names)
        return true;
    }
    
    // ========================================
    // Universal Data System
    // ========================================
    
    // Entity card mapping - maps entity names AND aliases directly to card titles
    // Both real names and aliases point to the same card title for single-lookup efficiency
    let entityCardMap = null;
    
    function buildEntityCardMap() {
        const map = {};
        
        // Initialize schema registry if needed
        if (!schemaRegistry) schemaRegistry = initializeSchemaRegistry();
        
        // Build map for each entity type
        for (const [entityType, schema] of Object.entries(schemaRegistry)) {
            if (!schema.prefixes || schema.prefixes.length === 0) continue;
            
            map[entityType] = {};
            
            // Check ALL prefixes for this entity type
            for (const prefix of schema.prefixes) {
                const cards = Utilities.storyCard.find(
                    c => c.title && c.title.startsWith(`[${prefix}] `),
                    true // return all matches
                );
                
                for (const card of cards) {
                    // Parse DESCRIPTION to get actual entity ID
                    if (card.description && card.description.includes('<== REAL DATA ==>')) {
                        const data = parseEntityData(card.description);
                        if (data.name) {
                            // Map the entity ID to the card title
                            const normalizedName = data.name.toLowerCase();
                            map[entityType][normalizedName] = card.title;
                            
                            // Also map any aliases directly to the card title
                            if (data.aliases) {
                                const aliases = Array.isArray(data.aliases) ? data.aliases : 
                                               typeof data.aliases === 'string' ? data.aliases.split(',').map(a => a.trim()) :
                                               [];
                                
                                for (const alias of aliases) {
                                    if (alias) {
                                        const normalizedAlias = alias.toLowerCase();
                                        // Map alias directly to card title (not to real name)
                                        map[entityType][normalizedAlias] = card.title;
                                        
                                        if (debug) console.log(`${MODULE_NAME}: Mapped alias '${alias}' directly to card '${card.title}' for ${entityType}`);
                                    }
                                }
                            }
                        } else {
                            console.log(`${MODULE_NAME}: WARNING - Card ${card.title} has no name in data, using fallback`);
                            
                            // Fallback: try to use title without prefix
                            let fallbackId = card.title.replace(/^\[.*?\]\s*/, '').trim().toLowerCase();
                            
                            // If that ID is taken, generate random suffixes until unique
                            let attempts = 0;
                            while (map[entityType][fallbackId] && attempts < 100) {
                                const randomSuffix = Math.random().toString(36).substring(2, 8);
                                fallbackId = `${fallbackId}_${randomSuffix}`;
                                attempts++;
                            }
                            
                            if (attempts >= 100) {
                                console.log(`${MODULE_NAME}: ERROR - Could not generate unique ID for ${card.title}`);
                                continue;
                            }
                            
                            map[entityType][fallbackId] = card.title;
                            console.log(`${MODULE_NAME}: Mapped ${card.title} to fallback ID: ${fallbackId}`);
                        }
                    } else {
                        // Card doesn't have structured data yet - skip it
                        if (debug) console.log(`${MODULE_NAME}: Card ${card.title} has no structured data`);
                    }
                }
            }
        }
        
        entityCardMap = map;
        return map;
    }
    
    function getEntityCardTitle(entityType, entityId) {
        // Build map if not exists
        if (!entityCardMap) buildEntityCardMap();
        
        const normalizedId = entityId.toLowerCase();
        const typeMap = entityCardMap[entityType];
        if (!typeMap) return null;
        
        // Direct lookup - both real names and aliases are in the same map
        return typeMap[normalizedId] || null;
    }
    
    // Unified load function for ANY object type
    function load(objectType, name) {
        if (!objectType || !name) return null;
        
        // Normalize the entity type (Character, Location, etc.)
        const entityType = String(objectType).charAt(0).toUpperCase() + String(objectType).slice(1).toLowerCase();
        const singularType = entityType.replace(/s$/, '');
        
        // Build cache key: "Character.Bob"
        const cacheKey = `${singularType}.${name}`;
        
        // Check entity cache
        if (entityCache[cacheKey]) {
            return entityCache[cacheKey];
        }
        
        // Check if this is a data-only entity type
        if (!schemaRegistry) schemaRegistry = initializeSchemaRegistry();
        const schema = schemaRegistry[singularType];
        if (schema && schema.dataOnly) {
            // Load from [SANE_DATA] card
            const dataCard = Utilities.storyCard.get(`[SANE_DATA] ${singularType}`);
            if (dataCard) {
                try {
                    const allData = JSON.parse(dataCard.description || '{}');
                    const entity = allData[name];
                    if (entity) {
                        entityCache[cacheKey] = entity;
                        return entity;
                    }
                } catch (e) {
                    if (debug) console.log(`${MODULE_NAME}: Failed to parse data-only entity ${singularType}.${name}`);
                }
            }
            return null;
        }
        
        // Get card title from mapping for display entities
        const cardTitle = getEntityCardTitle(singularType, name);
        if (!cardTitle) {
            // Entity not found in mapping
            return null;
        }
        
        // Load the specific card
        const displayCard = Utilities.storyCard.get(cardTitle);
        if (!displayCard) {
            // Card disappeared? Rebuild map
            entityCardMap = null;
            return null;
        }
        
        // Parse structured data from DESCRIPTION field
        let entity = null;
        
        if (displayCard.description && displayCard.description.includes('<== REAL DATA ==>')) {
            entity = parseEntityData(displayCard.description);
        } else {
            // No structured data - this shouldn't happen in new system
            if (debug) console.log(`${MODULE_NAME}: Card missing structured data for ${name}`);
            return null;
        }
        
        // Set metadata
        entity._type = singularType;
        entity._cardTitle = cardTitle; // Store for updates
        
        // For Characters, set subtype based on card prefix
        if (singularType === 'Character') {
            if (!entity.info) entity.info = {};
            entity.info.isPlayer = cardTitle.startsWith('[PLAYER]');
            // Set subtype for special prefixes
            if (cardTitle.startsWith('[PLAYER]')) {
                entity._subtype = 'Player';
            }
        }
        
        // Data comes from JSON.parse() so already in object format
        // No text parsing needed
        
        // Store in cache
        entityCache[cacheKey] = entity;
        return entity;
    }
    
    // Unified save function for ANY object type
    function save(objectType, entity) {
        if (!objectType || !entity) {
            console.log(`${MODULE_NAME}: ERROR - save() called with invalid parameters`);
            return false;
        }
        
        if (!entity.name) {
            console.log(`${MODULE_NAME}: ERROR - Cannot save entity without name field!`);
            console.log('Entity:', JSON.stringify(entity));
            return false;
        }
        
        // Ensure name is a string and not empty
        entity.name = String(entity.name).trim();
        if (!entity.name) {
            console.log(`${MODULE_NAME}: ERROR - Entity name cannot be empty!`);
            return false;
        }
        
        // Normalize entity type
        const entityType = String(objectType).charAt(0).toUpperCase() + String(objectType).slice(1).toLowerCase();
        const singularType = entityType.replace(/s$/, '');
        
        // Check if this is a data-only entity type
        if (!schemaRegistry) schemaRegistry = initializeSchemaRegistry();
        const schema = schemaRegistry[singularType];
        if (schema && schema.dataOnly) {
            // Save to [SANE_DATA] card
            const dataCardTitle = `[SANE_DATA] ${singularType}`;
            let dataCard = Utilities.storyCard.get(dataCardTitle);
            let allData = {};
            
            if (dataCard) {
                try {
                    allData = JSON.parse(dataCard.description || '{}');
                } catch (e) {
                    if (debug) console.log(`${MODULE_NAME}: Failed to parse existing data card ${dataCardTitle}`);
                }
            }
            
            // Update or add the entity
            allData[entity.name] = entity;
            
            // Save back to card
            if (dataCard) {
                Utilities.storyCard.update(dataCardTitle, {
                    description: JSON.stringify(allData, null, 2)
                });
            } else {
                Utilities.storyCard.add({
                    title: dataCardTitle,
                    description: JSON.stringify(allData, null, 2),
                    type: 'data'
                });
            }
            
            // Update cache
            const cacheKey = `${singularType}.${entity.name}`;
            entityCache[cacheKey] = entity;
            
            return true;
        }
        
        // Continue with display entity saving (CHARACTER, LOCATION, etc.)
        
        // Validation removed - components are flexible now
        // const validation = validateEntityComponents(singularType, entity);
        // if (!validation.valid) {
        //     if (debug) {
        //         console.log(`${MODULE_NAME}: Entity validation failed for ${entity.name}:`);
        //         validation.errors.forEach(err => console.log(`  - ${err}`));
        //     }
        //     // Still save but log validation errors
        // }
        
        // Build cache key
        const cacheKey = `${singularType}.${entity.name}`;
        
        // Update cache
        entityCache[cacheKey] = entity;
        
        // Save to display card (the ONLY source of truth)
        return saveEntityCard(entity, singularType);
    }
    
    // Unified loadAll function for ANY object type
    function loadAll(objectType) {
        // Normalize the entity type
        const entityType = String(objectType).charAt(0).toUpperCase() + String(objectType).slice(1).toLowerCase();
        const singularType = entityType.replace(/s$/, '');
        
        // Check if this is a data-only entity type
        if (!schemaRegistry) schemaRegistry = initializeSchemaRegistry();
        const schema = schemaRegistry[singularType];
        if (schema && schema.dataOnly) {
            // Load from [SANE_DATA] card
            const dataCard = Utilities.storyCard.get(`[SANE_DATA] ${singularType}`);
            if (dataCard) {
                try {
                    const allData = JSON.parse(dataCard.description || '{}');
                    // Cache all entities
                    for (const [name, entity] of Object.entries(allData)) {
                        const cacheKey = `${singularType}.${name}`;
                        entityCache[cacheKey] = entity;
                    }
                    return allData;
                } catch (e) {
                    if (debug) console.log(`${MODULE_NAME}: Failed to parse data-only entities for ${singularType}`);
                }
            }
            return {};
        }
        
        // Build map if not exists for display entities
        if (!entityCardMap) buildEntityCardMap();
        
        // Get all entities of this type from the map
        const typeMap = entityCardMap[singularType];
        if (!typeMap) {
            if (debug) console.log(`${MODULE_NAME}: No entities found for type ${singularType}`);
            return {};
        }
        
        // Load all entities
        const entities = {};
        
        for (const [entityId, cardTitle] of Object.entries(typeMap)) {
            // Load each entity using the mapping
            const entity = load(singularType, entityId);
            if (entity) {
                entities[entityId] = entity;
            }
        }
        
        return entities;
    }
    
    function loadCharacter(name) {
        // Delegate to unified load function
        return load('Character', name);
    }
    
    // Queue entity for generation wizard
    function queueEntityGeneration(entity) {
        // This would interface with GenerationWizard
        // For now, just log that it needs generation
        if (debug) console.log(`${MODULE_NAME}: Queued ${entity.name} for display card generation`);
        
        // Could add to [SANE_CONFIG] Entity Queue card
        const queueCard = Utilities.storyCard.get('[SANE_CONFIG] Entity Queue');
        if (queueCard) {
            const lines = (queueCard.description || '').split('\n').filter(l => l.trim());
            lines.push(`${entity.type}:${entity.name}`);
            Utilities.storyCard.update('[SANE_CONFIG] Entity Queue', {
                description: lines.join('\n')
            });
        }
    }
    
    // ==========================
    // Helper Functions for Tools
    // ==========================
    
    // Process level ups using nested level.xp structure
    function processLevelUp(character, schema) {
        // Check for level up with nested level.xp structure
        if (!character.stats || !character.stats.level || !character.stats.level.xp) return;
        
        while (character.stats.level.xp.current >= character.stats.level.xp.max) {
            // Subtract XP for this level
            character.stats.level.xp.current -= character.stats.level.xp.max;
            
            // Level up!
            character.stats.level.value = (character.stats.level.value || 1) + 1;
            console.log(character.name + ' reached level ' + character.stats.level.value + '!');
            
            // Calculate new max XP for next level
            const nextLevelXP = calculateLevelXPRequirement(character.stats.level.value + 1);
            character.stats.level.xp.max = nextLevelXP;
            
            // Increase max HP based on level
            const newMaxHP = calculateMaxHP(character.stats.level.value);
            if (!character.stats.hp) character.stats.hp = { current: 100, max: 100 };
            
            // Increase current HP by the difference (heal on level up)
            const hpGain = newMaxHP - character.stats.hp.max;
            character.stats.hp.max = newMaxHP;
            character.stats.hp.current = Math.min(character.stats.hp.max, character.stats.hp.current + hpGain);
            
            console.log(`  HP increased to ${character.stats.hp.current}/${character.stats.hp.max}`);
            
            // TODO: Process attribute gains if configured
            
            // Continue checking for multiple level ups
        }
    }
    
    // Process skill level ups
    function processSkillLevelUp(skill, skillName, schema) {
        // Simple skill level up processing
        // Calculate XP needed for next level
        let xpNeeded = calculateSkillXPRequirement(skillName, (skill.level || 1) + 1);
        
        // Initialize skill XP if needed
        if (!skill.xp) {
            skill.xp = { current: 0, max: xpNeeded };
        }
        
        // Check for level up
        while (skill.xp.current >= skill.xp.max) {
            skill.xp.current -= skill.xp.max;
            skill.level = (skill.level || 1) + 1;
            
            console.log('  Skill leveled up to ' + skill.level);
            
            // Recalculate XP needed for next level
            xpNeeded = calculateSkillXPRequirement(skillName, skill.level + 1);
            skill.xp.max = xpNeeded;
        }
    }
    
    // ==========================
    // Tool Processors
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
            
            // Validate character name before processing
            if (!isValidCharacterName(characterName)) {
                return 'malformed';
            }
            
            characterName = String(characterName).toLowerCase();
            location = String(location).toLowerCase().replace(/\s+/g, '_');
            
            // Check if character exists using universal system
            const character = loadCharacter(characterName);
            if (character) {
                // Character exists, update location using component structure
                if (!character.info) {
                    if (debug) console.log(`${MODULE_NAME}: Character ${character.name} missing info component`);
                    return 'malformed';
                }
                character.info.location = location;
                save('Character', character);
                if (debug) console.log(`${MODULE_NAME}: ${character.name} moved to ${location}`);
                return 'executed';
            }
            
            // Character not found - do a full check
            const fullCheckCharacter = loadCharacter(characterName);
            
            if (!fullCheckCharacter) {
                // Character doesn't exist
                trackUnknownEntity(characterName, 'update_location', info?.actionCount);
                if (shouldTriggerGeneration(characterName)) {
                    addToEntityQueue(characterName);
                }
                if (debug) {
                    console.log(`${MODULE_NAME}: Unknown character ${characterName} referenced in update_location`);
                }
            } else {
                // Found character - update location
                if (fullCheckCharacter.info) {
                    fullCheckCharacter.info.location = location;
                } else {
                    fullCheckCharacter.location = location;
                }
                save('Character', fullCheckCharacter);
                if (debug) console.log(`${MODULE_NAME}: ${fullCheckCharacter.name} moved to ${location}`);
            }
            
            return 'executed';
        },
        
        add_item: function(characterName, itemName, quantity) {
            if (!characterName || !itemName) return 'malformed';
            
            // Validate character name before processing
            if (!isValidCharacterName(characterName)) {
                return 'malformed';
            }
            
            characterName = String(characterName).toLowerCase();
            itemName = String(itemName).toLowerCase().replace(/\s+/g, '_');
            
            // Strict number validation
            const qtyStr = String(quantity).trim();
            if (!/^-?\d+$/.test(qtyStr)) {
                if (debug) console.log(`${MODULE_NAME}: Invalid quantity format for add_item: ${quantity}`);
                return 'malformed';
            }
            quantity = parseInt(qtyStr);
            
            // 0 or invalid quantity is malformed
            if (isNaN(quantity) || quantity === 0) {
                if (debug) console.log(`${MODULE_NAME}: Invalid quantity for add_item: ${quantity}`);
                return 'malformed';
            }
            
            // Selectively load only the character needed
            const character = loadCharacter(characterName);
            
            if (!character) {
                if (debug) {
                    console.log(`${MODULE_NAME}: Character ${characterName} not found`);
                }
                return 'executed'; // Still executed, just no character
            }
            
            // Access inventory through component or fallback to direct access
            if (!character.inventory) character.inventory = {};
            const inventory = character.inventory;
            
            // Always convert to object format
            let currentQty = 0;
            if (typeof inventory[itemName] === 'object') {
                currentQty = inventory[itemName].quantity || 0;
            } else if (typeof inventory[itemName] === 'number') {
                currentQty = inventory[itemName];
            }
            
            const newQty = Math.max(0, currentQty + quantity);
            
            // Always store as object with quantity
            inventory[itemName] = { quantity: newQty };
            
            if (debug) {
                console.log(`${MODULE_NAME}: ${character.name}'s ${itemName}: ${currentQty} → ${newQty}`);
            }
            
            save('Character', character);
            return 'executed';
        },
        
        remove_item: function(characterName, itemName, quantity) {
            if (!characterName || !itemName) return 'malformed';
            
            // Validate character name before processing
            if (!isValidCharacterName(characterName)) {
                return 'malformed';
            }
            
            characterName = String(characterName).toLowerCase();
            itemName = String(itemName).toLowerCase().replace(/\s+/g, '_');
            
            // Strict number validation
            const qtyStr = String(quantity).trim();
            if (!/^\d+$/.test(qtyStr)) {
                if (debug) console.log(`${MODULE_NAME}: Invalid quantity format for remove_item: ${quantity}`);
                return 'malformed';
            }
            quantity = parseInt(qtyStr);
            
            // 0 or invalid quantity is malformed
            if (isNaN(quantity) || quantity <= 0) {
                if (debug) console.log(`${MODULE_NAME}: Invalid quantity for remove_item: ${quantity}`);
                return 'malformed';
            }
            
            // Selectively load only the character needed
            const character = loadCharacter(characterName);
            
            if (!character) return 'executed';
            
            // Access inventory through component or fallback to direct access
            const inventory = character.inventory || {};
            
            // Always convert to object format for reading
            let currentQty = 0;
            if (typeof inventory[itemName] === 'object') {
                currentQty = inventory[itemName].quantity || 0;
            } else if (typeof inventory[itemName] === 'number') {
                currentQty = inventory[itemName];
            }
            
            const removeQty = Math.min(currentQty, quantity);
            const newQty = currentQty - removeQty;
            
            if (newQty === 0) {
                delete inventory[itemName];
                if (debug) console.log(`${MODULE_NAME}: Removed all ${itemName} from ${character.name}`);
            } else {
                // Always store as object with quantity
                inventory[itemName] = { quantity: newQty };
                if (debug) console.log(`${MODULE_NAME}: Removed ${removeQty} ${itemName} from ${character.name} (${currentQty} → ${newQty})`);
            }
            
            // Ensure inventory is set back on character
            character.inventory = inventory;
            
            save('Character', character);
            return 'executed';
        },
        
        use_consumable: function(characterName, itemName, quantity) {
            // Identical validation to remove_item
            return toolProcessors.remove_item(characterName, itemName, quantity);
        },
        
        transfer_item: function(giverName, receiverName, itemName, quantity) {
            if (!giverName || !receiverName || !itemName) return 'malformed';
            
            // Validate both character names before processing
            if (!isValidCharacterName(giverName) || !isValidCharacterName(receiverName)) {
                return 'malformed';
            }
            
            giverName = String(giverName).toLowerCase();
            receiverName = String(receiverName).toLowerCase();
            itemName = String(itemName).toLowerCase().replace(/\s+/g, '_');
            
            // Strict number validation
            const qtyStr = String(quantity).trim();
            if (!/^\d+$/.test(qtyStr)) {
                if (debug) console.log(`${MODULE_NAME}: Invalid quantity format for transfer_item: ${quantity}`);
                return 'malformed';
            }
            const requestedQty = parseInt(qtyStr);
            
            // 0 or invalid quantity is malformed
            if (isNaN(requestedQty) || requestedQty <= 0) {
                if (debug) console.log(`${MODULE_NAME}: Invalid quantity for transfer_item: ${quantity}`);
                return 'malformed';
            }
            
            const characters = loadAll('Character');
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
                // Normalize inventory to new format if needed
                giver.inventory = normalizeInventory(giver.inventory);
                
                const availableQty = getItemQuantity(giver.inventory, itemName);
                transferQty = Math.min(availableQty, requestedQty);
                
                if (transferQty > 0) {
                    setItemQuantity(giver.inventory, itemName, availableQty - transferQty);
                    
                    save('Character', giver);
                    anySuccess = true;
                    
                    if (debug) console.log(`${MODULE_NAME}: Removed ${transferQty} ${itemName} from ${giver.name}`);
                } else {
                    if (debug) console.log(`${MODULE_NAME}: ${giver.name} has no ${itemName} to transfer`);
                    return 'executed'; // Valid attempt, just no items
                }
            }
            
            if (receiver) {
                // Normalize inventory to new format if needed
                receiver.inventory = normalizeInventory(receiver.inventory);
                
                const currentReceiverQty = getItemQuantity(receiver.inventory, itemName);
                setItemQuantity(receiver.inventory, itemName, currentReceiverQty + transferQty);
                
                save('Character', receiver);
                anySuccess = true;
                
                if (debug) console.log(`${MODULE_NAME}: Added ${transferQty} ${itemName} to ${receiver.name}`);
            }
            
            return anySuccess ? 'executed' : 'executed';
        },
        
        deal_damage: function(sourceName, targetName, damageAmount) {
            if (!targetName) return 'malformed';
            
            // Validate target name syntax (but allow non-existent/hallucinated names)
            if (!isValidCharacterName(targetName)) {
                return 'malformed';
            }
            
            sourceName = sourceName ? String(sourceName).toLowerCase() : 'unknown';
            targetName = String(targetName).toLowerCase();
            
            // Strict number validation - must be a clean integer
            const damageStr = String(damageAmount).trim();
            if (!/^\d+$/.test(damageStr)) {
                if (debug) console.log(`${MODULE_NAME}: Invalid damage amount format: ${damageAmount}`);
                return 'malformed';
            }
            damageAmount = parseInt(damageStr);
            
            // 0 or negative damage is malformed
            if (isNaN(damageAmount) || damageAmount <= 0) {
                if (debug) console.log(`${MODULE_NAME}: Invalid damage amount: ${damageAmount}`);
                return 'malformed';
            }
            
            // Load the target character directly
            const target = loadCharacter(targetName);
            if (!target) {
                if (debug) {
                    console.log(`${MODULE_NAME}: Target ${targetName} not found`);
                }
                return 'executed';
            }
            
            // Only load source if needed and exists
            const source = (sourceName !== 'unknown') 
                ? loadCharacter(sourceName) : null;
            
            const sourceDisplay = source ? source.name : sourceName;
            
            // Support both old (hp) and new (stats.hp) structures
            let currentHP, maxHP;
            if (target.stats && target.stats.hp) {
                currentHP = target.stats.hp.current;
                maxHP = target.stats.hp.max;
            } else if (target.hp) {
                // Migrate from old structure
                currentHP = target.hp.current;
                maxHP = target.hp.max;
                // Initialize new structure
                if (!target.stats) target.stats = {};
                target.stats.hp = { current: currentHP, max: maxHP };
            } else {
                // Initialize if missing
                if (!target.stats) target.stats = {};
                target.stats.hp = { current: 100, max: 100 };
                currentHP = 100;
                maxHP = 100;
            }
            
            const oldHP = currentHP;
            const newHP = Math.max(0, currentHP - damageAmount);
            const actualDamage = oldHP - newHP;
            
            // Update in new structure
            target.stats.hp.current = newHP;
            
            // Also update old structure for backward compatibility
            if (target.hp) {
                target.hp.current = newHP;
            }
            
            if (debug) {
                console.log(`${MODULE_NAME}: ${sourceDisplay} dealt ${actualDamage} damage to ${target.name} (${oldHP} → ${newHP}/${maxHP})`);
            }
            
            save('Character', target);
            return 'executed';
        },
        
        add_levelxp: function(characterName, xpAmount) {
            if (!characterName) return 'malformed';
            
            // Validate character name before processing
            if (!isValidCharacterName(characterName)) {
                return 'malformed';
            }
            
            characterName = String(characterName).toLowerCase();
            
            // Allow negative numbers for XP removal
            const xpStr = String(xpAmount).trim();
            if (!/^-?\d+$/.test(xpStr)) {
                if (debug) console.log(`${MODULE_NAME}: Invalid XP format for add_levelxp: ${xpAmount}`);
                return 'malformed';
            }
            xpAmount = parseInt(xpStr);
            
            // 0 is malformed (use positive/negative for actual changes)
            if (isNaN(xpAmount) || xpAmount === 0) {
                if (debug) console.log(`${MODULE_NAME}: Invalid XP amount: ${xpAmount}`);
                return 'malformed';
            }
            
            // Selectively load only the character needed
            const character = loadCharacter(characterName);
            
            if (!character) {
                trackUnknownEntity(characterName, 'add_levelxp', info?.actionCount);
                if (shouldTriggerGeneration(characterName)) {
                    addToEntityQueue(characterName);
                }
                return 'executed';
            }
            
            // Update XP using nested level.xp structure
            if (!character.stats || !character.stats.level || !character.stats.level.xp) {
                if (debug) console.log(`${MODULE_NAME}: Character ${character.name} missing stats.level.xp component`);
                return 'malformed';
            }
            character.stats.level.xp.current += xpAmount;
            
            // Ensure XP doesn't go below 0
            if (character.stats.level.xp.current < 0) {
                character.stats.level.xp.current = 0;
            }
            
            const action = xpAmount > 0 ? 'Added' : 'Removed';
            if (debug) console.log(`${MODULE_NAME}: ${action} ${Math.abs(xpAmount)} XP ${xpAmount > 0 ? 'to' : 'from'} ${character.name} (${character.stats.level.xp.current}/${character.stats.level.xp.max})`);
            
            processLevelUp(character);
            save('Character', character);
            return 'executed';
        },
        
        add_skillxp: function(characterName, skillName, xpAmount) {
            if (!characterName || !skillName) return 'malformed';
            
            // Validate character name before processing
            if (!isValidCharacterName(characterName)) {
                return 'malformed';
            }
            
            characterName = String(characterName).toLowerCase();
            skillName = String(skillName).toLowerCase().replace(/\s+/g, '_');
            
            // Strict number validation
            const xpStr = String(xpAmount).trim();
            if (!/^\d+$/.test(xpStr)) {
                if (debug) console.log(`${MODULE_NAME}: Invalid XP format for add_skillxp: ${xpAmount}`);
                return 'malformed';
            }
            xpAmount = parseInt(xpStr);
            
            // 0 or invalid XP is malformed
            if (isNaN(xpAmount) || xpAmount <= 0) {
                if (debug) console.log(`${MODULE_NAME}: Invalid skill XP amount: ${xpAmount}`);
                return 'malformed';
            }
            
            // Selectively load only the character needed
            const character = loadCharacter(characterName);
            
            if (!character) {
                trackUnknownEntity(characterName, 'add_skillxp', info?.actionCount);
                if (shouldTriggerGeneration(characterName)) {
                    addToEntityQueue(characterName);
                }
                return 'executed';
            }
            
            // Initialize skills component if needed
            if (!character.skills) {
                character.skills = {};
            }
            
            if (!character.skills[skillName]) {
                if (debug) console.log(`${MODULE_NAME}: Skill ${skillName} not found on ${character.name}`);
                return 'malformed';
            }
            
            const skill = character.skills[skillName];
            skill.xp.current += xpAmount;
            
            if (debug) console.log(`${MODULE_NAME}: Added ${xpAmount} XP to ${character.name}'s ${skillName} (${skill.xp.current}/${skill.xp.max})`);
            
            processSkillLevelUp(skill, skillName);
            save('Character', character);
            return 'executed';
        },
        
        unlock_newskill: function(characterName, skillName) {
            if (!characterName || !skillName) return 'malformed';
            
            // Validate character name before processing
            if (!isValidCharacterName(characterName)) {
                return 'malformed';
            }
            
            characterName = String(characterName).toLowerCase();
            skillName = String(skillName).toLowerCase().replace(/\s+/g, '_');
            
            // Check if skill exists in registry
            const skillRegistry = getSkillRegistry();
            if (!skillRegistry[skillName]) {
                if (debug) console.log(`${MODULE_NAME}: Unknown skill: ${skillName}. Valid skills: ${Object.keys(skillRegistry).join(', ')}`);
                return 'malformed';
            }
            
            // Selectively load only the character needed
            const character = loadCharacter(characterName);
            
            if (!character) {
                trackUnknownEntity(characterName, 'unlock_newskill', info?.actionCount);
                if (shouldTriggerGeneration(characterName)) {
                    addToEntityQueue(characterName);
                }
                return 'executed';
            }
            
            // Initialize skills component if needed
            if (!character.skills) {
                character.skills = {};
            }
            
            // Check if character already has this skill
            if (character.skills[skillName]) {
                if (debug) console.log(`${MODULE_NAME}: ${character.name} already has ${skillName}`);
                return 'malformed';
            }
            
            const maxXP = calculateSkillXPRequirement(skillName, 2);
            character.skills[skillName] = {
                level: 1,
                xp: {
                    current: 0,
                    max: maxXP
                }
            };
            
            if (debug) console.log(`${MODULE_NAME}: ${character.name} learned ${skillName}!`);
            
            save('Character', character);
            return 'executed';
        },
        
        update_attribute: function(characterName, attrName, value) {
            if (!characterName || !attrName) return 'malformed';
            
            // Validate character name before processing
            if (!isValidCharacterName(characterName)) {
                return 'malformed';
            }
            
            characterName = String(characterName).toLowerCase();
            attrName = String(attrName).toLowerCase();
            value = parseInt(value);
            
            if (isNaN(value) || value <= 0) {
                if (debug) console.log(`${MODULE_NAME}: Invalid attribute value: ${value}`);
                return 'malformed';
            }
            
            // Validate against field config
            const attrConfig = null; // Attributes handled by component system
            if (attrConfig && attrConfig.required) {
                const requiredAttrs = attrConfig.required.split(',').map(a => a.trim().toLowerCase());
                const optionalAttrs = attrConfig.optional ? attrConfig.optional.split(',').map(a => a.trim().toLowerCase()) : [];
                const allAttrs = [...requiredAttrs, ...optionalAttrs];
                
                if (!allAttrs.includes(attrName)) {
                    if (debug) console.log(`${MODULE_NAME}: Invalid attribute '${attrName}' - must be one of: ${allAttrs.join(', ')}`);
                    return 'malformed';
                }
            }
            
            // Selectively load only the character needed
            const character = loadCharacter(characterName);
            
            if (!character) return 'executed';
            
            character.attributes[attrName] = value;
            
            if (debug) console.log(`${MODULE_NAME}: Set ${character.name}'s ${attrName} to ${value}`);
            
            save('Character', character);
            return 'executed';
        },
        
        update_relationship: function(name1, name2, changeAmount) {
            if (!name1 || !name2) return 'malformed';
            
            // Validate both character names before processing
            if (!isValidCharacterName(name1) || !isValidCharacterName(name2)) {
                return 'malformed';
            }
            
            name1 = String(name1).toLowerCase();
            name2 = String(name2).toLowerCase();
            
            // Strict number validation (can be negative)
            const changeStr = String(changeAmount).trim();
            if (!/^-?\d+$/.test(changeStr)) {
                if (debug) console.log(`${MODULE_NAME}: Invalid change amount format: ${changeAmount}`);
                return 'malformed';
            }
            changeAmount = parseInt(changeStr);
            
            // 0 change is malformed (why call it?)
            if (isNaN(changeAmount) || changeAmount === 0) {
                if (debug) console.log(`${MODULE_NAME}: Invalid relationship change: ${changeAmount}`);
                return 'malformed';
            }
            
            const characters = loadAll('Character');
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
                if (debug) {
                    console.log(`${MODULE_NAME}: One or both characters not found: ${name1}, ${name2}`);
                }
                return 'executed';
            }
            
            // Ensure relationships is an object (not a string or undefined)
            if (typeof char1.relationships !== 'object' || char1.relationships === null) {
                char1.relationships = {};
                if (debug) {
                    console.log(`${MODULE_NAME}: Fixed relationships for ${char1.name} - was type: ${typeof char1.relationships}`);
                }
            }
            if (typeof char2.relationships !== 'object' || char2.relationships === null) {
                char2.relationships = {};
                if (debug) {
                    console.log(`${MODULE_NAME}: Fixed relationships for ${char2.name} - was type: ${typeof char2.relationships}`);
                }
            }
            
            // Update bidirectional relationships
            if (!char1.relationships[name2]) char1.relationships[name2] = 0;
            if (!char2.relationships[name1]) char2.relationships[name1] = 0;
            
            char1.relationships[name2] += changeAmount;
            char2.relationships[name1] += changeAmount;
            
            const flavorText1 = getRelationshipFlavor(char1.relationships[name2], char1.name, char2.name);
            const flavorText2 = getRelationshipFlavor(char2.relationships[name1], char2.name, char1.name);
            
            save('Character', char1);
            save('Character', char2);
            
            if (debug) {
                console.log(`${MODULE_NAME}: ${char1.name}→${char2.name}: ${flavorText1}`);
                console.log(`${MODULE_NAME}: ${char2.name}→${char1.name}: ${flavorText2}`);
            }
            
            return 'executed';
        },
        
        discover_location: function(characterName, locationName, direction) {
            // Validate inputs
            if (!characterName || !locationName || !direction) return 'malformed';
            
            // Validate character name before processing
            if (!isValidCharacterName(characterName)) {
                return 'malformed';
            }
            
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
            // Selectively load only the character needed
            const character = loadCharacter(characterName);
            
            if (!character) {
                if (debug) {
                    console.log(`${MODULE_NAME}: Character ${characterName} not found`);
                }
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
            
            // Allow override via global variable if set
            const customHeader = getGlobalValue('location_header');
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
            
            // Create basic location data
            const locationData = {
                name: locationName,
                type: 'Unknown',
                terrain: 'Unexplored'
            };
            
            // Use default header and info line since we removed formatTemplate
            let headerLine = `## **${locationName}**`;
            let infoLine = 'Type: Unknown | Terrain: Unexplored';
            
            const locationEntry = (
                locationHeaders + '\n' +
                headerLine + '\n' +
                infoLine + '\n' +
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
        
        accept_quest: function(playerName, questName, questGiver, questType) {
            // Must have all 4 parameters
            if (!playerName || !questName || !questGiver || !questType) return 'malformed';
            
            // CRITICAL: Convert quest name and giver to snake_case to prevent system breakage
            questName = String(questName).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
            questGiver = String(questGiver).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
            
            // Normalize quest type to lowercase - handle both "story" and "story_quest" formats
            let normalizedType = String(questType).toLowerCase();
            
            // Strip "_quest" suffix if present
            if (normalizedType.endsWith('_quest')) {
                normalizedType = normalizedType.substring(0, normalizedType.length - 6);
            }
            
            // Load quest types from schema
            const questSchema = null; // Quest types handled by scenario
            let validTypes = ['story', 'side', 'hidden', 'raid']; // Default fallback
            let stageRanges = {};
            
            if (questSchema && questSchema.value) {
                try {
                    const parsed = null; // Quest types handled by scenario
                    if (parsed && typeof parsed === 'object') {
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
                    }
                } catch (e) {
                    if (debug) console.log(`${MODULE_NAME}: Error parsing quest types schema: ${e.message}`);
                    // Keep default fallback values
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
            // NPC quest offering not yet implemented
            if (!npcName || !questName) return 'malformed';
            
            if (debug) console.log(`${MODULE_NAME}: offer_quest not yet implemented: ${npcName} offers ${questName}`);
            return 'executed';
        },
        
        update_quest: function(characterName, questName, objective, progress, total) {
            if (!questName) return 'malformed';
            
            // If characterName is provided, validate it
            if (characterName && !isValidCharacterName(characterName)) {
                return 'malformed';
            }
            
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
            
            try {
                // Validate character name before processing
                if (!isValidCharacterName(characterName)) {
                    return 'malformed';
                }
                
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
            } catch (e) {
                if (debug) console.log(`${MODULE_NAME}: Error in complete_quest: ${e.message}`);
                return 'malformed';
            }
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
            
            // Validate character name before processing
            if (!isValidCharacterName(characterName)) {
                return 'malformed';
            }
            
            characterName = String(characterName).toLowerCase();
            if (debug) console.log(`${MODULE_NAME}: Death recorded for: ${characterName}`);
            return 'executed';
        }
    };
    
    // ==========================
    // Entity Tracking System
    // ==========================
    function loadEntityTrackerConfig() {
        // Use centralized sectioned config loader
        const sections = Utilities.config.loadSectioned('[SANE_CONFIG] Entity Tracker', '# ');
        
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
        
        // First check if character exists in the loaded character cache
        // This is the most reliable way to check for existing characters
        const allCharacters = loadAll('Character');
        if (allCharacters[entityName]) {
            if (debug) console.log(`${MODULE_NAME}: Skipping tracking for existing character in cache: ${entityName}`);
            return;
        }
        
        // Check if any character has this as a trigger_name
        for (const charName in allCharacters) {
            const character = allCharacters[charName];
            if (character.info && character.info.trigger_name) {
                // Check if trigger_name matches (could be string or array)
                const triggers = Array.isArray(character.info.trigger_name) 
                    ? character.info.trigger_name 
                    : [character.info.trigger_name];
                
                const normalizedTriggers = triggers.map(t => String(t).toLowerCase());
                if (normalizedTriggers.includes(entityName)) {
                    if (debug) console.log(`${MODULE_NAME}: Skipping tracking - ${entityName} is trigger_name for character: ${character.name}`);
                    // Clean up any existing tracking data for this entity
                    removeFromTracker(entityName);
                    return;
                }
            }
        }
        
        // Also check story cards directly as a fallback
        const characterCards = Utilities.storyCard.find(card => {
            if (!card.title.startsWith('[CHARACTER]') && !card.title.startsWith('[PLAYER]')) {
                return false;
            }
            
            // Check if title matches (case-insensitive)
            const titleMatch = card.title.match(/\[(CHARACTER|PLAYER)\]\s+(.+)/);
            if (titleMatch && titleMatch[2] && titleMatch[2].toLowerCase() === entityName) {
                return true;
            }
            
            // Don't try to parse - just check title
            // (parsing without FORMAT card would fail anyway)
            
            return false;
        }, true);
        
        // If character already exists, don't track
        if (characterCards && characterCards.length > 0) {
            if (debug) console.log(`${MODULE_NAME}: Skipping tracking for existing character card: ${entityName}`);
            return;
        }
        
        // Load and check blacklist from config
        const config = loadEntityTrackerConfig();
        if (config.blacklist && config.blacklist.includes(entityName)) return;
        
        // Load tracker from config card's description field
        const configCard = Utilities.storyCard.get('[SANE_CONFIG] Entity Tracker');
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
        
        // Clean up old entries (older than 100 turns)
        const cutoffTurn = currentTurn - 100;
        for (const [name, data] of Object.entries(tracker)) {
            // Filter out turns older than cutoff
            const recentTurns = data.uniqueTurns.filter(turn => turn > cutoffTurn);
            
            // If no recent turns remain, remove the entity from tracking
            if (recentTurns.length === 0) {
                delete tracker[name];
                if (debug) console.log(`${MODULE_NAME}: Removed stale entity from tracker: ${name} (all turns older than ${cutoffTurn})`);
            } else if (recentTurns.length < data.uniqueTurns.length) {
                // Update with only recent turns
                tracker[name].uniqueTurns = recentTurns;
                tracker[name].count = recentTurns.length;
                if (debug) console.log(`${MODULE_NAME}: Cleaned up old turns for ${name}: kept ${recentTurns.length} recent turns`);
            }
        }
        
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
        
        Utilities.storyCard.update('[SANE_CONFIG] Entity Tracker', {
            description: description
        });
        
        if (debug) {
            console.log(`${MODULE_NAME}: Tracked unknown entity ${entityName} (unique turns: ${tracker[entityName].uniqueTurns.length})`);
        }
    }
    
    function removeFromTracker(entityName) {
        // Load tracker from config card's description field
        const configCard = Utilities.storyCard.get('[SANE_CONFIG] Entity Tracker');
        if (!configCard || !configCard.description) return;
        
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
            return;
        }
        
        // Remove the entity from tracker
        if (tracker[entityName]) {
            delete tracker[entityName];
            
            // Save updated tracker to config card's description
            let description = '// Entity tracking data\n';
            for (const [name, data] of Object.entries(tracker)) {
                description += `# ${name}\n`;
                description += `turns: ${data.uniqueTurns.join(',')}\n`;
                description += `tool: ${data.lastTool}\n`;
            }
            
            Utilities.storyCard.update('[SANE_CONFIG] Entity Tracker', {
                description: description
            });
            
            if (debug) console.log(`${MODULE_NAME}: Removed ${entityName} from entity tracker`);
        }
    }
    
    function shouldTriggerGeneration(entityName) {
        const config = loadEntityTrackerConfig();
        if (!config.autoGenerate) return false;
        
        // Normalize entity name
        entityName = entityName.toLowerCase();
        
        // Check if any existing character has this as a trigger_name
        const allCharacters = loadAll('Character');
        for (const charName in allCharacters) {
            const character = allCharacters[charName];
            if (character.info && character.info.trigger_name) {
                const triggers = Array.isArray(character.info.trigger_name) 
                    ? character.info.trigger_name 
                    : [character.info.trigger_name];
                
                const normalizedTriggers = triggers.map(t => String(t).toLowerCase());
                if (normalizedTriggers.includes(entityName)) {
                    if (debug) console.log(`${MODULE_NAME}: Not triggering generation - ${entityName} already exists as trigger_name for: ${character.name}`);
                    removeFromTracker(entityName);
                    return false;
                }
            }
        }
        
        // Load tracker from config card's description
        const configCard = Utilities.storyCard.get('[SANE_CONFIG] Entity Tracker');
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
        const queueCard = Utilities.storyCard.get('[SANE_CONFIG] Entity Queue');
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
        
        // Get entity tracker data to see what tool referenced this entity
        const configCard = Utilities.storyCard.get('[SANE_CONFIG] Entity Tracker');
        let lastTool = null;
        if (configCard && configCard.description) {
            try {
                const lines = configCard.description.split('\n');
                let currentEntity = null;
                for (const line of lines) {
                    if (line.startsWith('# ')) {
                        currentEntity = line.substring(2).trim();
                    } else if (currentEntity === entityName && line.startsWith('tool:')) {
                        lastTool = line.substring(5).trim();
                        break;
                    }
                }
            } catch (e) {
                // Continue without tool context
            }
        }
        
        // Instead of queuing, directly trigger GenerationWizard if available
        if (typeof GenerationWizard !== 'undefined' && GenerationWizard.startGeneration) {
            if (debug) console.log(`${MODULE_NAME}: Triggering GenerationWizard for entity: ${entityName}`);
            // Start NPC generation with just the name
            GenerationWizard.startGeneration('NPC', { name: entityName });
            return;
        }
        
        // Fallback to queue system if GenerationWizard not available
        const queueCard = Utilities.storyCard.get('[SANE_CONFIG] Entity Queue');
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
            Utilities.storyCard.update('[SANE_CONFIG] Entity Queue', {
                entry: JSON.stringify(queue, null, 2),
                type: 'data'
            });
            
            if (debug) console.log(`${MODULE_NAME}: Added ${entityName} to entity generation queue`);
        }
    }
    
    function queuePendingEntities() {
        // Load queue from Story Card
        const queueCard = Utilities.storyCard.get('[SANE_CONFIG] Entity Queue');
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
        Utilities.storyCard.update('[SANE_CONFIG] Entity Queue', {
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
    
    function completeLocationGeneration(locationName, metadata) {
        // Location generation complete
        if (debug) console.log(`${MODULE_NAME}: Location generation complete for ${locationName}`);
        
        // Could add any location-specific completion logic here
        // For now, just log completion
        return true;
    }
    
    function completeEntityGeneration(entityName) {
        // Normalize entity name
        entityName = entityName.toLowerCase();
        
        // Clear from tracker in config card's description
        const configCard = Utilities.storyCard.get('[SANE_CONFIG] Entity Tracker');
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
                
                Utilities.storyCard.update('[SANE_CONFIG] Entity Tracker', {
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
        
        // Only load characters if there are actually tools to process
        let charactersLoaded = false;
        
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
            
            // Tool found - will log execution result below
            
            // Parse parameters
            const params = parseParameters(paramString);
            
            // Load characters on first tool that needs them
            if (!charactersLoaded) {
                // Set cache for all tools to use
                // Load all characters into entity cache
                try {
                    const allChars = loadAll('Character');
                    for (const [name, char] of Object.entries(allChars || {})) {
                        entityCache[`Character.${name}`] = char;
                    }
                } catch(e) {
                    // Fall back to GameState.loadAll if available
                    if (GameState && GameState.loadAll) {
                        const allChars = GameState.loadAll('Character');
                        for (const [name, char] of Object.entries(allChars || {})) {
                            entityCache[`Character.${name}`] = char;
                        }
                    } else {
                        if (debug) console.log(`${MODULE_NAME}: Unable to load characters: ${e}`);
                    }
                }
                charactersLoaded = true;
            }
            
            // Capture revert data BEFORE executing the tool
            const revertData = captureRevertData(toolName.toLowerCase(), params, getCachedEntitiesOfType('Character'));
            
            let result = processToolCall(toolName, params, getCachedEntitiesOfType('Character'));
            
            // Log tool result
            if (debug) {
                const toolCall = `${toolName}(${params.join(',')})`;
                if (result === 'executed') {
                    console.log(`${MODULE_NAME}: Tool EXECUTED: ${toolCall}`);
                } else if (result === 'malformed') {
                    console.log(`${MODULE_NAME}: Tool MALFORMED: ${toolCall}`);
                } else if (result === 'unknown') {
                    console.log(`${MODULE_NAME}: Tool UNKNOWN: ${toolCall}`);
                }
            }
            
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
                // Normalize ALL parameters in the visible text to teach the LLM proper format
                const normalizedParams = [...params];
                
                // Normalize quest name (param 1)
                if (normalizedParams[1]) {
                    normalizedParams[1] = String(normalizedParams[1]).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
                }
                
                // Normalize quest giver (param 2)
                if (normalizedParams[2]) {
                    normalizedParams[2] = String(normalizedParams[2]).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
                }
                
                // Normalize quest type (param 3)
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
                if (debug) {
                    console.log(`${MODULE_NAME}: Marking for removal (${result}): ${fullMatch}`);
                }
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
                if (debug) {
                    console.log(`${MODULE_NAME}: Removed ${change.reason} tool: ${change.match}`);
                }
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
    function captureRevertData(toolName, params, characters) {
        if (!characters) characters = loadAll('Character');
        const revertData = {};
        
        switch(toolName) {
            case 'update_location':
                const char = characters[String(params[0]).toLowerCase()];
                if (char && char.info) {
                    revertData.oldLocation = char.info.location;
                }
                break;
                
            case 'add_item':
                // Store current quantity so we can revert to it
                const addChar = characters[String(params[0]).toLowerCase()];
                if (addChar && addChar.inventory) {
                    const itemName = String(params[1]).toLowerCase().replace(/\s+/g, '_');
                    const currentItem = addChar.inventory[itemName];
                    revertData.oldQuantity = currentItem ? currentItem.quantity : 0;
                }
                break;
                
            case 'remove_item':
                // Store current quantity so we can restore it
                const removeChar = characters[String(params[0]).toLowerCase()];
                if (removeChar && removeChar.inventory) {
                    const itemName = String(params[1]).toLowerCase().replace(/\s+/g, '_');
                    const currentItem = removeChar.inventory[itemName];
                    revertData.oldQuantity = currentItem ? currentItem.quantity : 0;
                }
                break;
                
            case 'transfer_item':
                // Store current quantities for both characters
                const fromChar = characters[String(params[0]).toLowerCase()];
                const toChar = characters[String(params[1]).toLowerCase()];
                const transferItem = String(params[2]).toLowerCase().replace(/\s+/g, '_');
                
                if (fromChar && fromChar.inventory) {
                    const fromItem = fromChar.inventory[transferItem];
                    revertData.fromOldQuantity = fromItem ? fromItem.quantity : 0;
                }
                if (toChar && toChar.inventory) {
                    const toItem = toChar.inventory[transferItem];
                    revertData.toOldQuantity = toItem ? toItem.quantity : 0;
                }
                break;
                
            case 'deal_damage':
                const target = characters[String(params[1]).toLowerCase()];
                if (target && target.stats && target.stats.hp) {
                    revertData.oldHp = target.stats.hp.current;
                }
                break;
                
            case 'update_relationship':
                const char1 = characters[String(params[0]).toLowerCase()];
                if (char1 && char1.relationships) {
                    const char2Name = String(params[1]).toLowerCase();
                    revertData.oldValue = char1.relationships[char2Name] || 0;
                }
                break;
                
            case 'add_levelxp':
                const xpChar = characters[String(params[0]).toLowerCase()];
                if (xpChar && xpChar.stats && xpChar.stats.level) {
                    revertData.oldLevel = xpChar.stats.level.value;
                    revertData.oldXp = xpChar.stats.level.xp ? xpChar.stats.level.xp.current : 0;
                }
                break;
                
            case 'add_skillxp':
                const skillChar = characters[String(params[0]).toLowerCase()];
                const skillName = String(params[1]).toLowerCase().replace(/\s+/g, '_');
                if (skillChar && skillChar.skills && skillChar.skills[skillName]) {
                    const skill = skillChar.skills[skillName];
                    revertData.oldLevel = skill.level || 1;
                    revertData.oldXp = skill.xp ? skill.xp.current : 0;
                }
                break;
                
            default:
                // Check if this is an update_[stat] tool
                if (toolName.startsWith('update_')) {
                    const statName = toolName.substring(7); // Remove 'update_'
                    const statChar = characters[String(params[0]).toLowerCase()];
                    if (statChar && statChar.attributes && statChar.attributes[statName]) {
                        // Store old attribute value
                        revertData.oldValue = statChar.attributes[statName].value;
                        revertData.statName = statName;
                    }
                }
                break;
        }
        
        return revertData;
    }
    
    function processToolCall(toolName, params, characters) {
        // Normalize tool name to lowercase for lookup
        const normalizedToolName = toolName.toLowerCase();
        
        // Characters are already in entityCache, set by processTools
        
        // Check if it's a known tool
        if (toolProcessors[normalizedToolName]) {
            try {
                // Execute the tool (it will use the cached characters)
                const result = toolProcessors[normalizedToolName](...params);
                return result;
            } catch (e) {
                if (debug) {
                    console.log(`${MODULE_NAME}: Error in ${normalizedToolName}: ${e.message}`);
                }
                logError(e, `Tool execution: ${normalizedToolName}(${params.join(', ')})`);
                return 'malformed';
            }
        }
        
        // Check for dynamic core stat tools (update_hp, update_mp, etc)
        if (normalizedToolName.startsWith('update_')) {
            // Just try to process it as a core stat tool
            // The function will handle validation
            if (processCoreStatTool(normalizedToolName, params)) {
                return 'executed';
            }
        }
        
        // Check runtime tools
        if (runtimeTools[normalizedToolName]) {
            try {
                const result = runtimeTools[normalizedToolName](...params);
                return result;
            } catch (e) {
                if (debug) {
                    console.log(`${MODULE_NAME}: Error in runtime tool ${normalizedToolName}: ${e.message}`);
                }
                return 'malformed';
            }
        }
        
        // Unknown tool
        if (debug) console.log(`${MODULE_NAME}: Unknown tool: ${toolName}`);
        return 'unknown';
    }
    
    function processCoreStatTool(toolName, params) {
        const characterName = String(params[0]).toLowerCase();
        
        // Check for update_max_[stat] pattern
        if (toolName.startsWith('update_max_')) {
            const statName = toolName.substring(11).toLowerCase();
            
            // Load the character
            const character = load('Character', characterName);
            if (!character) {
                if (debug) console.log(`${MODULE_NAME}: Character ${characterName} not found`);
                return false;
            }
            
            const newMax = parseInt(params[1]);
            if (isNaN(newMax)) {
                if (debug) console.log(`${MODULE_NAME}: Invalid max value: ${params[1]}`);
                return false;
            }
            
            // Update max value using component paths only
            if (!character.stats || !character.stats[statName] || typeof character.stats[statName] !== 'object') {
                if (debug) console.log(`${MODULE_NAME}: Stat ${statName} not found in character.stats component`);
                return false;
            }
            
            character.stats[statName].max = newMax;
            if (character.stats[statName].current > newMax) {
                character.stats[statName].current = newMax;
            }
            
            save('Character', character);
            if (debug) console.log(`${MODULE_NAME}: Set ${character.name}'s max ${statName} to ${newMax}`);
            return true;
        }
        
        // Check for update_[stat] pattern (current value)
        const statName = toolName.substring(7).toLowerCase();
        
        // Load the character
        const character = load('Character', characterName);
        if (!character) {
            if (debug) console.log(`${MODULE_NAME}: Character ${characterName} not found`);
            return false;
        }
        
        const current = parseInt(params[1]);
        if (isNaN(current)) {
            if (debug) console.log(`${MODULE_NAME}: Invalid value for ${statName}: ${params[1]}`);
            return false;
        }
        
        // Update current value using component paths
        // First check stats component
        if (character.stats && character.stats[statName]) {
            if (typeof character.stats[statName] === 'object') {
                character.stats[statName].current = current;
            }
        }
        // Fallback to legacy paths
        else if (character[statName] && typeof character[statName] === 'object') {
            character[statName].current = current;
        }
        // Try coreStats for very old format
        else if (character.coreStats && character.coreStats[statName]) {
            character.coreStats[statName].current = current;
        }
        else {
            if (debug) console.log(`${MODULE_NAME}: Stat ${statName} not found on character`);
            return false;
        }
        
        save('Character', character);
        if (debug) console.log(`${MODULE_NAME}: Set ${character.name}'s current ${statName} to ${current}`);
        return true;
    }
    
    // ==========================
    // Debug Helper Functions (only work when debug = true)
    // ==========================
    
    // Handle debug commands directly
    function handleDebugCommand(commandName, args) {
        const debugCommands = [
            // GenerationWizard tests
            'gw_activate', 'gw_npc', 'gw_quest', 'gw_location',
            // Status and listing commands
            'entity_status', 'char_list', 'schema_all',
            // System tests
            'runtime_test', 'test_footer', 'test_info', 'test_template', 'test_inventory', 'test_all',
            // Maintenance
            'cleanup', 'fix_format',
            // Debug utilities
            'debug_log', 'debug_help'
        ];
        
        // Check if it's a debug command
        if (debugCommands.includes(commandName)) {
            if (commandName === 'debug_help') {
                return `\n<<<[DEBUG COMMANDS]\n${debugCommands.filter(c => c !== 'debug_help').map(c => `/${c}`).join('\n')}>>>\n`;
            }
            
            if (commandName === 'debug_log') {
                const result = outputDebugLog();
                return `\n<<<${result}>>>\n`;
            }
            
            // GenerationWizard tests
            if (commandName === 'gw_activate') {
                if (typeof GenerationWizard === 'undefined') return "<<<GenerationWizard not available>>>";
                GenerationWizard('activate', null);
                return "\n<<<GenerationWizard activated for next turn>>>\n";
            }
            
            if (commandName === 'gw_npc') {
                if (typeof GenerationWizard === 'undefined') return "<<<GenerationWizard not available>>>";
                const result = GenerationWizard.startGeneration('NPC', {name: 'Debug_Test_NPC'});
                const progressCard = Utilities.storyCard.get('[ENTITY_GEN] In Progress');
                const isActive = GenerationWizard.isActive();
                console.log(`[DEBUG] Started NPC generation for Debug_Test_NPC\nResult: ${result}\nActive: ${isActive}\nProgress card exists: ${progressCard ? 'yes' : 'no'}`);
                return "\n<<<Started NPC generation for Debug_Test_NPC>>>\n";
            }
            
            if (commandName === 'gw_quest') {
                if (typeof GenerationWizard === 'undefined') return "<<<GenerationWizard not available>>>";
                GenerationWizard.startGeneration('Quest', {
                    NAME: 'Debug_Test_Quest',
                    QUEST_GIVER: 'Debug_NPC',
                    QUEST_TYPE: 'side',
                    STAGE_COUNT: 3
                });
                return "\n<<<Started Quest generation for Debug_Test_Quest>>>\n";
            }
            
            if (commandName === 'gw_location') {
                if (typeof GenerationWizard === 'undefined') return "<<<GenerationWizard not available>>>";
                GenerationWizard.startGeneration('Location', null, {NAME: 'Debug_Test_Location'});
                return "\n<<<Started Location generation for Debug_Test_Location>>>\n";
            }
            
            // Status and listing commands
            if (commandName === 'entity_status') {
                const config = Utilities.storyCard.get('[SANE_CONFIG] Entity Tracker');
                const queueCard = Utilities.storyCard.get('[SANE_CONFIG] Entity Queue');
                
                let status = `Entity Tracker Status:\n`;
                if (config) {
                    const parsed = parseConfigEntry(config.entry || '');
                    status += `- Threshold: ${parsed.threshold || 3}\n`;
                    status += `- Auto Generate: ${parsed.auto_generate || 'true'}\n`;
                    status += `- Blacklist: ${parsed.blacklist || 'none'}\n`;
                }
                
                if (queueCard && queueCard.entry) {
                    const lines = queueCard.entry.split('\n').filter(l => l.trim());
                    status += `- Queue has ${lines.length} entities\n`;
                }
                
                return status;
            }
            
            if (commandName === 'char_list') {
                const chars = loadAll('Character');
                const names = Object.keys(chars);
                return `Characters (${names.length}): ${names.join(', ')}`;
            }
            
            if (commandName === 'schema_all') {
                const entities = [
                    '[SANE_ENTITY] Character',
                    '[SANE_ENTITY] Location', 
                    '[SANE_ENTITY] Item',
                    '[SANE_ENTITY] Faction',
                    '[SANE_ENTITY] Global'
                ];
                
                let result = "=== All Entity Types ===\n";
                for (const title of entities) {
                    const card = Utilities.storyCard.get(title);
                    if (card) {
                        result += `\n${title}:\n${(card.description || '').substring(0, 200)}...\n`;
                    }
                }
                return result;
            }
            
            // System tests
            if (commandName === 'runtime_test') {
                // Test runtime variables
                const testVar = 'debug_test_var';
                set(`Global.${testVar}`, 'test_value_' + Date.now());
                const value = get(`Global.${testVar}`);
                return `Set Global.${testVar} = ${value}`;
            }
            
            // Maintenance
            if (commandName === 'cleanup') {
                const testNames = ['Debug_Test_NPC', 'Debug_Test_Monster', 'Debug_Test_Boss', 
                                 'Debug_Test_Item', 'Debug_Test_Location', 'Debug_Test_Quest',
                                 'DebugFooterTest', 'QuickTest', 'TemplateTest'];
                let removed = 0;
                
                for (const name of testNames) {
                    // Try both CHARACTER and PLAYER prefixes
                    const titles = [`[CHARACTER] ${name}`, `[PLAYER] ${name}`];
                    for (const title of titles) {
                        if (Utilities.storyCard.get(title)) {
                            Utilities.storyCard.remove(title);
                            removed++;
                        }
                    }
                }
                
                return `Cleanup complete. Removed ${removed} debug cards.`;
            }
            
            
            if (commandName === 'test_datastorage') {
                let result = '=== Testing Data Storage System ===\n\n';
                
                // Create test character with various info fields
                const testChar = {
                    name: 'DataTest',
                    info: {
                        isPlayer: false,
                        gender: 'Male',
                        race: 'Human',
                        class: 'Warrior',
                        location: 'Test_Zone',
                        // Test arbitrary info fields
                        favorite_color: 'blue',
                        secret_fear: 'spiders',
                        battle_cry: 'For glory!',
                        hometown: 'Village_of_Testing'
                    },
                    stats: {
                        level: {
                            value: 5,
                            xp: { current: 2500, max: 3000 }
                        },
                        hp: { current: 85, max: 100 }
                    },
                    inventory: {
                        iron_sword: 1,
                        health_potion: 3
                    }
                };
                
                // Save the character
                save('Character', testChar);
                result += '1. Character saved with arbitrary info fields\n';
                
                // Check the card's DESCRIPTION field
                const card = Utilities.storyCard.get('[CHARACTER] DataTest');
                if (card && card.description) {
                    result += '\n2. DESCRIPTION field contains:\n';
                    if (card.description.includes('<== REAL DATA ==>')) {
                        result += '   ✓ Data markers found\n';
                        if (card.description.includes('favorite_color: blue')) {
                            result += '   ✓ Arbitrary info field saved\n';
                        }
                        if (card.description.includes('secret_fear: spiders')) {
                            result += '   ✓ Another arbitrary field saved\n';
                        }
                    } else {
                        result += '   ✗ No data markers - using old format\n';
                    }
                }
                
                // Load the character back
                const loaded = load('Character', 'DataTest');
                result += '\n3. Loading character back:\n';
                result += `   Level: ${get('Character.DataTest.stats.level')}\n`;
                result += `   Location: ${get('Character.DataTest.info.location')}\n`;
                result += `   Favorite Color: ${get('Character.DataTest.info.favorite_color') || 'undefined'}\n`;
                result += `   Secret Fear: ${get('Character.DataTest.info.secret_fear') || 'undefined'}\n`;
                result += `   Battle Cry: ${get('Character.DataTest.info.battle_cry') || 'undefined'}\n`;
                
                // Test setting a new arbitrary field
                set('Character.DataTest.info.lucky_number', 7);
                result += '\n4. Added new info field via set()\n';
                result += `   Lucky Number: ${get('Character.DataTest.info.lucky_number')}\n`;
                
                // Clean up
                Utilities.storyCard.remove('[CHARACTER] DataTest');
                result += '\n5. Test complete - card cleaned up\n';
                
                return result;
            }
            
            
            return null;
        }
        
        return null;
    }
    
    
    // ==========================
    // Hook Processing
    // ==========================

    // Auto-initialize runtime cards on first run
    
    // Auto-initialize entity tracker cards
    if (!Utilities.storyCard.get('[SANE_CONFIG] Entity Tracker')) {
        createEntityTrackerCards();
    }

    // Test dynamic resolution functionality
    
    // Initialize SANE schemas if they don't exist
    function createSANESchemas() {
        // Create new SANE_ENTITY cards
        if (!Utilities.storyCard.get('[SANE_ENTITY] Character')) {
            Utilities.storyCard.add({
                title: '[SANE_ENTITY] Character',
                description: JSON.stringify({
                    components: ['info', 'stats', 'attributes', 'skills', 'inventory', 'relationships'],
                    prefixes: ['CHARACTER', 'PLAYER'],
                    dataOnly: false
                }, null, 2),
                type: 'schema'
            });
            if (debug) console.log(MODULE_NAME + ': Created [SANE_ENTITY] Character');
        }
    }
    
    // Initialize component definitions using new SANE_COMP cards
    function createComponentSchemas() {
        // Info component
        if (!Utilities.storyCard.get('[SANE_COMP] info')) {
            Utilities.storyCard.add({
                title: '[SANE_COMP] info',
                description: JSON.stringify({
                    fields: {
                        gender: "string",
                        race: "string", 
                        class: "string",
                        location: "reference:Location",
                        faction: "reference:Faction",
                        appearance: "string",
                        personality: "string",
                        background: "string"
                    }
                }, null, 2),
                type: 'schema'
            });
            if (debug) console.log(MODULE_NAME + ': Created [SANE_COMP] info');
        }
        
        // Stats component with progression formulas
        if (!Utilities.storyCard.get('[SANE_COMP] stats')) {
            Utilities.storyCard.add({
                title: '[SANE_COMP] stats',
                description: JSON.stringify({
                    defaults: {
                        level: {
                            value: 1,
                            xp: { current: 0, max: 500 }
                        },
                        hp: { current: 100, max: 100 }
                    },
                    level_progression: {
                        xp_formula: "level * (level - 1) * 500",
                        xp_overrides: {
                            "1": 500,
                            "2": 1000
                        }
                    },
                    hp_progression: {
                        base: 100,
                        per_level: 20
                    }
                }, null, 2),
                type: 'schema'
            });
            if (debug) console.log(MODULE_NAME + ': Created [SANE_COMP] stats with progression formulas');
        }
        
        // Attributes component with master attributes
        if (!Utilities.storyCard.get('[SANE_COMP] attributes')) {
            Utilities.storyCard.add({
                title: '[SANE_COMP] attributes',
                description: JSON.stringify({
                    defaults: {
                        "VITALITY": { "value": 10 },
                        "STRENGTH": { "value": 10 },
                        "DEXTERITY": { "value": 10 },
                        "AGILITY": { "value": 10 }
                    },
                    registry: {
                        "VITALITY": {
                            "description": "Determines max HP and resistance to status effects",
                            "abbreviation": "VIT"
                        },
                        "STRENGTH": {
                            "description": "Physical power for melee damage and carry capacity",
                            "abbreviation": "STR"
                        },
                        "DEXTERITY": {
                            "description": "Precision and accuracy for critical hits",
                            "abbreviation": "DEX"
                        },
                        "AGILITY": {
                            "description": "Speed and evasion capabilities",
                            "abbreviation": "AGI"
                        }
                    }
                }, null, 2),
                type: 'schema'
            });
            if (debug) console.log(MODULE_NAME + ': Created [SANE_COMP] attributes with master attributes');
        }
        
        // Skills component with comprehensive registry and formulas
        if (!Utilities.storyCard.get('[SANE_COMP] skills')) {
            Utilities.storyCard.add({
                title: '[SANE_COMP] skills',
                description: JSON.stringify({
                    defaults: {},  // Skills are dynamic, added as needed
                    categories: {
                        "default": { "xp_formula": "level * 100", "description": "Standard progression" },
                        "combat": { "xp_formula": "level * 80", "description": "Fighting and weapon skills" },
                        "crafting": { "xp_formula": "level * 150", "description": "Creating items and equipment" },
                        "social": { "xp_formula": "level * 120", "description": "Interpersonal abilities" },
                        "gathering": { "xp_formula": "level * 130", "description": "Resource collection" },
                        "support": { "xp_formula": "level * 90", "description": "Combat support abilities" }
                    },
                    registry: {
                        // Combat skills
                        "one_handed_sword": { "category": "combat" },
                        "two_handed_sword": { "category": "combat" },
                        "rapier": { "category": "combat" },
                        "one_handed_curved_sword": { "category": "combat" },
                        "dagger": { "category": "combat" },
                        "blade_throwing": { "xp_formula": "level * 110" },
                        "spear": { "category": "combat" },
                        "mace": { "category": "combat" },
                        "katana": { "xp_formula": "level * 200" },
                        "martial_arts": { "category": "combat" },
                        "scimitar": { "xp_formula": "level * 150" },
                        
                        // Combat Support
                        "parrying": { "category": "support" },
                        "battle_healing": { "category": "support" },
                        "searching": { "category": "support" },
                        "tracking": { "xp_formula": "level * 120" },
                        "hiding": { "category": "support" },
                        "night_vision": { "category": "support" },
                        "extended_weight_limit": { "category": "support" },
                        "straining": { "category": "support" },
                        
                        // Crafting
                        "blacksmithing": { "category": "crafting" },
                        "tailoring": { "category": "crafting" },
                        "cooking": { "category": "crafting" },
                        "alchemy": { "category": "crafting" },
                        "woodcrafting": { "category": "crafting" },
                        
                        // Gathering
                        "fishing": { "xp_formula": "level * 200" },
                        "herbalism": { "category": "gathering" },
                        "mining": { "category": "gathering" },
                        
                        // Social
                        "trading": { "category": "social" },
                        "negotiation": { "category": "social" },
                        "persuasion": { "category": "social" },
                        "intimidation": { "category": "social" },
                        "bartering": { "category": "social" },
                        "leadership": { "xp_formula": "level * 140" },
                        "performing": { "category": "social" }
                    }
                }, null, 2),
                type: 'schema'
            });
            if (debug) console.log(MODULE_NAME + ': Created [SANE_COMP] skills with full registry');
        }
        
        // Inventory component with quantity tracking
        if (!Utilities.storyCard.get('[SANE_COMP] inventory')) {
            Utilities.storyCard.add({
                title: '[SANE_COMP] inventory',
                description: JSON.stringify({
                    defaults: {},  // Items added dynamically
                    structure: {
                        // Each item stored as: "item_name": { "quantity": number }
                        example: {
                            "health_potion": { "quantity": 5 },
                            "iron_sword": { "quantity": 1 },
                            "bread": { "quantity": 10 }
                        }
                    },
                    // Note: Item registry could be added here for validation
                    // registry: { "health_potion": { "max_stack": 99, "type": "consumable" } }
                }, null, 2),
                type: 'schema'
            });
            if (debug) console.log(MODULE_NAME + ': Created [SANE_COMP] inventory with quantity tracking');
        }
        
        // Relationships component with detailed thresholds
        if (!Utilities.storyCard.get('[SANE_COMP] relationships')) {
            Utilities.storyCard.add({
                title: '[SANE_COMP] relationships',
                description: JSON.stringify({
                    defaults: {},  // Relationships are dynamic
                    thresholds: [
                        { min: -9999, max: -2000, flavor: "{from}'s hatred for {to} consumes their every thought" },
                        { min: -1999, max: -1000, flavor: "{from} would sacrifice everything to see {to} destroyed" },
                        { min: -999, max: -500, flavor: "{from} actively wishes harm upon {to}" },
                        { min: -499, max: -200, flavor: "{from} feels genuine hostility toward {to}" },
                        { min: -199, max: -100, flavor: "{from} strongly dislikes {to}" },
                        { min: -99, max: -50, flavor: "{from} finds {to} irritating and unpleasant" },
                        { min: -49, max: -25, flavor: "{from} feels mild annoyance toward {to}" },
                        { min: -24, max: 24, flavor: "{from} feels neutral about {to}" },
                        { min: 25, max: 49, flavor: "{from} has slightly positive feelings toward {to}" },
                        { min: 50, max: 99, flavor: "{from} enjoys {to}'s company" },
                        { min: 100, max: 199, flavor: "{from} considers {to} a friend" },
                        { min: 200, max: 499, flavor: "{from} cares deeply about {to}'s wellbeing" },
                        { min: 500, max: 999, flavor: "{from} has strong affection and loyalty toward {to}" },
                        { min: 1000, max: 1999, flavor: "{from} loves {to} deeply" },
                        { min: 2000, max: 9999, flavor: "{from} would do absolutely anything for {to}" }
                    ]
                }, null, 2),
                type: 'schema'
            });
            if (debug) console.log(MODULE_NAME + ': Created [SANE_COMP] relationships with detailed thresholds');
        }
        
        // Pathways component (for locations)
        if (!Utilities.storyCard.get('[SANE_COMP] pathways')) {
            Utilities.storyCard.add({
                title: '[SANE_COMP] pathways',
                description: JSON.stringify({
                    fields: {
                        north: "reference:Location",
                        south: "reference:Location",
                        east: "reference:Location",
                        west: "reference:Location",
                        up: "reference:Location",
                        down: "reference:Location",
                        inside: "reference:Location",
                        outside: "reference:Location"
                    }
                }, null, 2),
                type: 'schema'
            });
            if (debug) console.log(MODULE_NAME + ': Created [SANE_COMP] pathways');
        }
    }
    
    // Auto-initialize SANE schemas on first run
    createSANESchemas();
    createComponentSchemas();
    

    // Public API
    
    // Universal Data System - NEW PRIMARY API
    GameState.load = load;
    GameState.save = save;
    GameState.loadAll = loadAll;
    GameState.get = get;
    GameState.set = set;
    GameState.resolve = resolve;  // Dynamic path resolution
    GameState.create = create;  // Unified entity creator

    GameState.processTools = processTools;
    GameState.processGetters = processGetters;
    GameState.getGlobalValue = getGlobalValue;
    GameState.setGlobalValue = setGlobalValue;
    
    // Character API - redirects to universal functions
    GameState.loadCharacter = (name) => load('Character', name);
    GameState.saveCharacter = (character) => save('Character', character);
    GameState.createCharacter = createCharacter;  // Legacy, redirects to create()
    
    // Location API - redirects to universal functions  
    GameState.loadLocation = (name) => load('Location', name);
    GameState.saveLocation = (location) => save('Location', location);
    
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
    GameState.completeLocationGeneration = completeLocationGeneration;
    GameState.loadEntityTrackerConfig = loadEntityTrackerConfig;
    
    // Tool processing API (for testing)
    GameState.processToolCall = processToolCall;
    
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
        return save('Character', character);
    };
    GameState.modifyField = function(characterName, fieldPath, delta) {
        const current = GameState.getField(characterName, fieldPath);
        if (current === null || typeof current !== 'number') return false;
        
        return GameState.setField(characterName, fieldPath, current + delta);
    };
    
    // Testing functions
    GameState.testComponentTools = function() {
        console.log(`${MODULE_NAME}: Testing component-aware tools...`);
        
        // Create test character with components
        const testChar = createCharacter({
            name: 'ToolTestHero',
            isPlayer: false
        });
        
        if (!testChar) {
            console.log('ERROR: Failed to create test character');
            return false;
        }
        
        console.log('1. Testing HP modification (stats.hp)...');
        // Test damage tool
        const damageResult = toolProcessors.deal_damage('unknown', 'ToolTestHero', 20);
        console.log(`  - deal_damage result: ${damageResult}`);
        console.log(`  - HP after damage: ${get('Character.ToolTestHero.stats.hp.current')}/${get('Character.ToolTestHero.stats.hp.max')}`);
        
        console.log('2. Testing XP addition (stats.level.xp)...');
        const xpResult = toolProcessors.add_levelxp('ToolTestHero', 250);
        console.log(`  - add_levelxp result: ${xpResult}`);
        console.log(`  - XP after: ${get('Character.ToolTestHero.stats.level.xp.current')}/${get('Character.ToolTestHero.stats.level.xp.max')}`);
        
        console.log('3. Testing inventory (component)...');
        const addItemResult = toolProcessors.add_item('ToolTestHero', 'test_sword', 1);
        console.log(`  - add_item result: ${addItemResult}`);
        const inventory = get('Character.ToolTestHero.inventory');
        console.log(`  - Inventory: ${JSON.stringify(inventory)}`);
        
        console.log('4. Testing location update (info.location)...');
        const locResult = toolProcessors.update_location('ToolTestHero', 'Test_Dungeon');
        console.log(`  - update_location result: ${locResult}`);
        console.log(`  - Location: ${get('Character.ToolTestHero.info.location')}`);
        
        console.log('5. Testing attribute update...');
        const attrResult = toolProcessors.update_attribute('ToolTestHero', 'strength', 15);
        console.log(`  - update_attribute result: ${attrResult}`);
        const attributes = get('Character.ToolTestHero.attributes');
        console.log(`  - Attributes: ${JSON.stringify(attributes)}`);
        
        console.log(`${MODULE_NAME}: Component tools test complete!`);
        return true;
    };
    GameState.testComponentSystem = function() {
        console.log(`${MODULE_NAME}: Starting component system test...`);
        
        // 1. Create a new character with components
        console.log('1. Creating character with components...');
        const testChar = createCharacter({
            name: 'TestHero',
            isPlayer: false
        });
        
        if (!testChar) {
            console.log('ERROR: Failed to create character');
            return false;
        }
        
        // 2. Verify components were initialized
        console.log('2. Verifying components...');
        if (!testChar.stats || !testChar.info) {
            console.log('ERROR: Required components missing');
            return false;
        }
        
        console.log(`  - stats.level: ${testChar.stats.level}`);
        console.log(`  - stats.hp: ${JSON.stringify(testChar.stats.hp)}`);
        console.log(`  - info.location: ${testChar.info.location}`);
        
        // 3. Modify using component paths
        console.log('3. Modifying via component paths...');
        set('Character.TestHero.stats.level', 5);
        set('Character.TestHero.info.location', 'Test_Town');
        set('Character.TestHero.stats.hp.current', 150);
        
        // 4. Load and verify changes
        console.log('4. Loading and verifying changes...');
        const loaded = load('Character', 'TestHero');
        
        if (!loaded) {
            console.log('ERROR: Failed to load character');
            return false;
        }
        
        console.log(`  - Loaded level: ${get('Character.TestHero.stats.level')}`);
        console.log(`  - Loaded location: ${get('Character.TestHero.info.location')}`);
        console.log(`  - Loaded HP: ${get('Character.TestHero.stats.hp.current')}`);
        
        // 5. Component check (validation removed)
        console.log('5. Component check...');
        console.log('  - Has stats: ' + !!loaded.stats);
        console.log('  - Has info: ' + !!loaded.info);
        console.log('  - Has inventory: ' + !!loaded.inventory);
        console.log('  - Has skills: ' + !!loaded.skills);
        
        // Migration test removed - no longer needed
        
        console.log(`${MODULE_NAME}: Component system test complete!`);
        return true;
    };
    
    // Test dynamic resolution with components
    GameState.testDynamicResolution = function() {
        console.log(`${MODULE_NAME}: Testing dynamic resolution with components...`);
        
        // 1. Test basic component path access
        console.log('1. Testing basic component paths:');
        const hero = load('Character', 'TestHero');
        if (hero) {
            console.log(`  - Direct: hero.stats.level = ${hero.stats?.level}`);
            console.log(`  - get('Character.TestHero.stats.level') = ${get('Character.TestHero.stats.level')}`);
            console.log(`  - get('Character.TestHero.stats.hp.current') = ${get('Character.TestHero.stats.hp.current')}`);
            console.log(`  - get('Character.TestHero.info.location') = ${get('Character.TestHero.info.location')}`);
        }
        
        // 2. Test dynamic resolution
        console.log('2. Testing dynamic resolution:');
        set('Global.currentPlayer', 'TestHero');
        console.log(`  - Set Global.currentPlayer = 'TestHero'`);
        console.log(`  - get('Character.$(Global.currentPlayer).stats.level') = ${get('Character.$(Global.currentPlayer).stats.level')}`);
        console.log(`  - get('Character.$(Global.currentPlayer).stats.hp.current') = ${get('Character.$(Global.currentPlayer).stats.hp.current')}`);
        
        // 3. Test nested dynamic resolution
        console.log('3. Testing nested dynamic resolution:');
        const playerLocation = get('Character.$(Global.currentPlayer).info.location');
        console.log(`  - Player location: ${playerLocation}`);
        
        // Create a test location if needed
        const testLoc = {
            name: 'Test_Town',
            type: 'town',
            description: 'A test location'
        };
        save('Location', testLoc);
        
        console.log(`  - get('Location.$(Character.$(Global.currentPlayer).info.location).type') = ${get('Location.$(Character.$(Global.currentPlayer).info.location).type')}`);
        
        // 4. Test setting component values via paths
        console.log('4. Testing set() with component paths:');
        set('Character.TestHero.stats.level', 10);
        set('Character.TestHero.stats.hp.current', 200);
        set('Character.TestHero.info.location', 'New_Location');
        
        console.log(`  - After set, level = ${get('Character.TestHero.stats.level')}`);
        console.log(`  - After set, HP = ${get('Character.TestHero.stats.hp.current')}`);
        console.log(`  - After set, location = ${get('Character.TestHero.info.location')}`);
        
        console.log(`${MODULE_NAME}: Dynamic resolution test complete!`);
        return true;
    };
    
    // Test runtime variable functions
    GameState.testRuntimeVariables = function() {
        console.log(`${MODULE_NAME}: Testing runtime variable functions with components...`);
        
        // Create test character if needed
        const testChar = createCharacter({
            name: 'RuntimeTestHero',
            isPlayer: false
        });
        
        if (testChar) {
            // Set some component values
            set('Character.RuntimeTestHero.stats.level', 7);
            set('Character.RuntimeTestHero.stats.hp.current', 140);
            set('Character.RuntimeTestHero.stats.hp.max', 200);
            set('Character.RuntimeTestHero.info.location', 'Test_Village');
            set('Character.RuntimeTestHero.attributes.strength', 18);
            set('Character.RuntimeTestHero.skills.swordsmanship', { level: 5, xp: { current: 250, max: 400 } });
        }
        
        console.log('1. Testing function-style getters:');
        console.log(`  - getCharacterHP('RuntimeTestHero') = ${getCharacterHP('RuntimeTestHero')}`);
        console.log(`  - getCharacterLevel('RuntimeTestHero') = ${getCharacterLevel('RuntimeTestHero')}`);
        console.log(`  - getCharacterLocation('RuntimeTestHero') = ${getCharacterLocation('RuntimeTestHero')}`);
        console.log(`  - getCharacterAttribute('RuntimeTestHero', 'strength') = ${getCharacterAttribute('RuntimeTestHero', 'strength')}`);
        console.log(`  - getCharacterSkill('RuntimeTestHero', 'swordsmanship') = ${getCharacterSkill('RuntimeTestHero', 'swordsmanship')}`);
        
        console.log('2. Testing processGetters with both styles:');
        const testText = '\n' +
            'Current Status:\n' +
            '- HP: get_hp(RuntimeTestHero)\n' +
            '- Level: get_level(RuntimeTestHero)\n' +
            '- Location: get_location(RuntimeTestHero)\n' +
            '- Using new syntax: get[Character.RuntimeTestHero.stats.hp.current]\n' +
            '- Mixed: HP is get_hp(RuntimeTestHero) and level is get[Character.RuntimeTestHero.stats.level]\n' +
            '        ';
        
        const processed = processGetters(testText);
        console.log('Processed text:', processed);
        
        console.log('3. Testing with dynamic resolution:');
        set('Global.testHero', 'RuntimeTestHero');
        const dynamicText = '\n' +
            'Hero: get[Global.testHero]\n' +
            'Hero HP: get[Character.$(Global.testHero).stats.hp.current]/get[Character.$(Global.testHero).stats.hp.max]\n' +
            'Hero Location: get[Character.$(Global.testHero).info.location]\n' +
            '        ';
        
        const dynamicProcessed = processGetters(dynamicText);
        console.log('Dynamic processed:', dynamicProcessed);
        
        console.log(`${MODULE_NAME}: Runtime variables test complete!`);
        return true;
    };
    
    // test of universal get/set system
    GameState.testUniversalSystem = function() {
        console.log(`${MODULE_NAME}: Testing universal get/set system comprehensively...`);
        
        // 1. Test basic get/set
        console.log('1. Testing basic get/set:');
        set('Global.testValue', 42);
        console.log(`  - set('Global.testValue', 42) -> get = ${get('Global.testValue')}`);
        
        // 2. Test nested object creation
        console.log('2. Testing nested object creation:');
        set('Global.nested.deep.value', 'deep value');
        console.log(`  - set('Global.nested.deep.value', 'deep value') -> get = ${get('Global.nested.deep.value')}`);
        
        // 3. Test entity loading and modification
        console.log('3. Testing entity operations:');
        const testChar = createCharacter({ name: 'UniversalTestHero' });
        if (testChar) {
            set('Character.UniversalTestHero.stats.level', 99);
            set('Character.UniversalTestHero.stats.hp.current', 9999);
            set('Character.UniversalTestHero.info.location', 'Test_Zone');
            console.log(`  - Level: ${get('Character.UniversalTestHero.stats.level')}`);
            console.log(`  - HP: ${get('Character.UniversalTestHero.stats.hp.current')}`);
            console.log(`  - Location: ${get('Character.UniversalTestHero.info.location')}`);
        }
        
        // 4. Test dynamic resolution
        console.log('4. Testing dynamic resolution:');
        set('Global.targetChar', 'UniversalTestHero');
        set('Global.targetField', 'stats.level');
        console.log(`  - Single $(): ${get('Character.$(Global.targetChar).stats.level')}`);
        console.log(`  - Nested $(): ${get('Character.$(Global.targetChar).$(Global.targetField)')}`);
        
        // 5. Test error cases
        console.log('5. Testing error handling:');
        console.log(`  - Invalid path 'NoType': ${get('NoType')}`);
        console.log(`  - Missing entity: ${get('Character.DoesNotExist.level')}`);
        console.log(`  - Missing field: ${get('Character.UniversalTestHero.nonexistent.field')}`);
        
        // 6. Test array notation
        console.log('6. Testing array notation:');
        set('Global.testArray[0]', 'first');
        set('Global.testArray[1]', 'second');
        set('Global.nested.array[0].name', 'item1');
        console.log(`  - Array[0]: ${get('Global.testArray[0]')}`);
        console.log(`  - Array[1]: ${get('Global.testArray[1]')}`);
        console.log(`  - Nested array: ${get('Global.nested.array[0].name')}`);
        
        // 7. Test cache behavior
        console.log('7. Testing cache:');
        const before = get('Character.UniversalTestHero.stats.level');
        set('Character.UniversalTestHero.stats.level', 100);
        const after = get('Character.UniversalTestHero.stats.level');
        console.log(`  - Before: ${before}, After: ${after}, Cache updated: ${after === '100'}`);
        
        // 8. Test component paths with missing components
        console.log('8. Testing missing component paths:');
        const noComponents = { name: 'FlatHero', level: 5, hp: 100 };
        save('Character', noComponents);
        console.log(`  - Flat hero level: ${get('Character.FlatHero.level')}`);
        console.log(`  - Flat hero stats.level (missing): ${get('Character.FlatHero.stats.level')}`);
        
        // 9. Test Global special handling
        console.log('9. Testing Global special handling:');
        set('Global.complex', { a: 1, b: { c: 2 } });
        console.log(`  - Complex global: ${JSON.stringify(get('Global.complex'))}`);
        set('Global.complex.b.c', 3);
        console.log(`  - After nested set: ${get('Global.complex.b.c')}`);
        
        // 10. Test resolution edge cases
        console.log('10. Testing resolution edge cases:');
        set('Global.circular', 'Global.circular');
        console.log(`  - Circular reference: ${get('$(Global.circular)')}`);
        set('Global.undefined', undefined);
        console.log(`  - Undefined value: ${get('Global.undefined')}`);
        set('Global.null', null);
        console.log(`  - Null value: ${get('Global.null')}`);
        
        console.log(`${MODULE_NAME}: Universal system test complete!`);
        return true;
    };
    
    // Master test 
    GameState.runAllTests = function() {
        console.log('\n' + '='.repeat(60));
        console.log('SANE COMPREHENSIVE TEST SUITE');
        console.log('='.repeat(60) + '\n');
        
        const tests = [
            { name: 'Component System', fn: GameState.testComponentSystem },
            { name: 'Component Tools', fn: GameState.testComponentTools },
            { name: 'Dynamic Resolution', fn: GameState.testDynamicResolution },
            { name: 'Runtime Variables', fn: GameState.testRuntimeVariables },
            { name: 'Universal System', fn: GameState.testUniversalSystem },
            { name: 'Tool Processing', fn: testToolProcessing },
            { name: 'Entity Validation', fn: testEntityValidation },
            { name: 'Template Processing', fn: testTemplateProcessing }
        ];
        
        let passed = 0;
        let failed = 0;
        
        for (const test of tests) {
            console.log(`\n${'*'.repeat(40)}`);
            console.log(`Running: ${test.name}`);
            console.log('*'.repeat(40));
            
            try {
                const result = test.fn();
                if (result) {
                    console.log(`✓ ${test.name} PASSED`);
                    passed++;
                } else {
                    console.log(`✗ ${test.name} FAILED`);
                    failed++;
                }
            } catch (e) {
                console.log(`✗ ${test.name} ERRORED: ${e.message}`);
                console.log(e.stack);
                failed++;
            }
        }
        
        console.log('\n' + '='.repeat(60));
        console.log(`TEST RESULTS: ${passed} passed, ${failed} failed`);
        console.log('='.repeat(60));
        
        return failed === 0;
    };
    
    // Test tool processing
    function testToolProcessing() {
        console.log(`${MODULE_NAME}: Testing tool processing...`);
        
        // Create test character
        const testChar = createCharacter({ 
            name: 'ToolTestChar',
            isPlayer: false
        });
        
        if (testChar) {
            // Initialize with component values
            set('Character.ToolTestChar.stats.level', 1);
            set('Character.ToolTestChar.stats.hp.current', 100);
            set('Character.ToolTestChar.stats.hp.max', 100);
            set('Character.ToolTestChar.inventory.sword', { quantity: 1 });
        }
        
        // 1. Test damage tool
        console.log('1. Testing deal_damage:');
        const damageResult = processTool('deal_damage', ['Monster', 'ToolTestChar', '30']);
        console.log(`  - Result: ${damageResult}`);
        const afterDamage = get('Character.ToolTestChar.stats.hp.current');
        console.log(`  - HP after damage: ${afterDamage}`);
        
        // 2. Test healing
        console.log('2. Testing heal:');
        const healResult = processTool('heal', ['ToolTestChar', '20']);
        console.log(`  - Result: ${healResult}`);
        const afterHeal = get('Character.ToolTestChar.stats.hp.current');
        console.log(`  - HP after heal: ${afterHeal}`);
        
        // 3. Test item management
        console.log('3. Testing add_item:');
        const addResult = processTool('add_item', ['ToolTestChar', 'potion', '5']);
        console.log(`  - Result: ${addResult}`);
        const potions = get('Character.ToolTestChar.inventory.potion');
        console.log(`  - Potions: ${potions?.quantity || potions}`);
        
        // 4. Test XP addition
        console.log('4. Testing add_levelxp:');
        set('Character.ToolTestChar.stats.level.xp', { current: 0, max: 500 });
        const xpResult = processTool('add_levelxp', ['ToolTestChar', '250']);
        console.log(`  - Result: ${xpResult}`);
        const xp = get('Character.ToolTestChar.stats.level.xp.current');
        console.log(`  - XP: ${xp}`);
        
        console.log(`${MODULE_NAME}: Tool processing test complete!`);
        return true;
    }
    
    // Test entity validation
    function testEntityValidation() {
        console.log(`${MODULE_NAME}: Testing entity validation...`);
        
        // 1. Test valid entity
        console.log('1. Testing valid entity:');
        const validEntity = {
            name: 'ValidHero',
            stats: { 
                level: {
                    value: 5,
                    xp: { current: 2000, max: 2500 }
                },
                hp: { current: 100, max: 100 } 
            },
            info: { location: 'Town' }
        };
        const validResult = validateEntityComponents('Character', validEntity);
        console.log(`  - Valid: ${validResult.valid}`);
        console.log(`  - Errors: ${validResult.errors?.length || 0}`);
        
        // 2. Test missing required component
        console.log('2. Testing missing required component:');
        const missingEntity = {
            name: 'IncompleteHero',
            stats: { 
                level: {
                    value: 1,
                    xp: { current: 0, max: 500 }
                }
            }
            // Missing info component
        };
        const missingResult = validateEntityComponents('Character', missingEntity);
        console.log(`  - Valid: ${missingResult.valid}`);
        console.log(`  - Errors: ${missingResult.errors?.join(', ')}`);
        
        // 3. Test component initialization
        console.log('3. Testing component initialization:');
        const newEntity = initializeEntityComponents('Character', { name: 'NewHero' });
        console.log(`  - Has stats: ${!!newEntity.stats}`);
        console.log(`  - Has info: ${!!newEntity.info}`);
        console.log(`  - Stats.level.value: ${newEntity.stats?.level?.value}`);
        console.log(`  - Info.location: ${newEntity.info?.location}`);
        
        console.log(`${MODULE_NAME}: Entity validation test complete!`);
        return true;
    }
    
    // Test template processing
    function testTemplateProcessing() {
        console.log(`${MODULE_NAME}: Testing template processing...`);
        
        // Create test data
        const testData = {
            name: 'Template Hero',
            stats: {
                level: {
                    value: 10,
                    xp: { current: 4500, max: 5000 }
                },
                hp: { current: 150, max: 200 }
            },
            skills: {
                sword: { level: 5, unlocked: true },
                magic: { level: 3, unlocked: true },
                stealth: { level: 1, unlocked: false }
            },
            isPlayer: false
        };
        
        // 1. Test simple replacements
        console.log('1. Testing simple replacements:');
        let template = 'Name: {name}, Level: {stats.level}';
        let result = processTemplateLine(template, testData);
        console.log(`  - Result: ${result}`);
        
        // 2. Test conditionals
        console.log('2. Testing conditionals:');
        template = '{info.isPlayer?Player Character:NPC Character}';
        result = processTemplateLine(template, testData);
        console.log(`  - Result: ${result}`);
        
        // 3. Test loops
        console.log('3. Testing loops:');
        template = 'Skills: {skills.*:{*.unlocked?{*} (Level {*.level})}}';
        result = processTemplateLine(template, testData);
        console.log(`  - Result: ${result}`);
        
        // 4. Test entity references
        console.log('4. Testing entity references:');
        // Save test character for reference
        save('Character', testData);
        set('Global.currentHero', 'Template Hero');
        
        template = 'Hero Level: {Character.Template Hero.stats.level}';
        result = processTemplateLine(template, {});
        console.log(`  - Direct reference: ${result}`);
        
        template = 'Current Hero Level: {Character.{Global.currentHero}.stats.level}';
        result = processTemplateLine(template, { Global: { currentHero: 'Template Hero' } });
        console.log(`  - Dynamic reference: ${result}`);
        
        console.log(`${MODULE_NAME}: Template processing test complete!`);
        return true;
    }
    
    // Test schema registry
    GameState.testSchemaRegistry = function() {
        console.log(`${MODULE_NAME}: Testing schema registry...`);
        
        // Initialize if needed
        if (!schemaRegistry) schemaRegistry = initializeSchemaRegistry();
        
        console.log('1. Registered entity types:');
        for (const [type, schema] of Object.entries(schemaRegistry)) {
            if (!type.startsWith('_')) {
                console.log(`  - ${type}: ${schema.prefixes?.join(', ')}`);
            }
        }
        
        console.log('2. Component schemas:');
        const components = schemaRegistry._components || {};
        for (const [name, schema] of Object.entries(components)) {
            console.log(`  - ${name}: ${schema.component_of}`);
        }
        
        console.log('3. Schema aliases:');
        const aliases = schemaAliasMap || {};
        console.log(`  - Total aliases: ${Object.keys(aliases).length}`);
        
        console.log(`${MODULE_NAME}: Schema registry test complete!`);
        return true;
    };
    

    switch(hook) {
        case 'input':
            // Initialize debug logging for this turn
            if (debug) initDebugLogging();
            
            
            // Store original input for logging
            const originalInput = text;
            
            // Load input systems
            loadInputCommands();
            loadInputModifier();
            
            // Apply INPUT_MODIFIER first
            if (inputModifier) {
                try {
                    text = inputModifier(text);
                    if (debug) console.log(`${MODULE_NAME}: Applied input modifier`);
                } catch(e) {
                    if (debug) console.log(`${MODULE_NAME}: Input modifier error: ${e}`);
                }
            }
            
            // Check for INPUT_COMMANDS in the text
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
                logTime();
                const result = commandResults.join('\n');
                // Calculate hash of the result
                currentHash = RewindSystem.quickHash(result);
                logTime();
                return result;
            }
            
            // If GenerationWizard is active, delegate to it
            if (typeof GenerationWizard !== 'undefined' && GenerationWizard.isActive()) {
                const result = GenerationWizard.process('input', text);
                const finalResult = result.active ? '\n' : text;
                
                // Log the input turn
                logDebugTurn('input', originalInput, finalResult, {
                    commandsProcessed: commandResults.length > 0
                });
                
                // Calculate hash of the final result
                currentHash = RewindSystem.quickHash(finalResult);
                logTime();
                return finalResult;  // Block input if wizard is active
            }
            
            // Log the input turn
            logDebugTurn('input', originalInput, text, {
                commandsProcessed: commandResults.length > 0
            });
            
            // Calculate hash of the modified input text (what will be stored in history)
            currentHash = RewindSystem.quickHash(text);
            
            logTime();
            return text;
            
        case 'context':
            // Initialize debug logging for this turn
            if (debug) initDebugLogging();
            
            // Store original context for logging
            const originalContext = text;
            
            // Store context length for debug output
            if (!state.lastContextLength) {
                state.lastContextLength = 0;
            }
            state.lastContextLength = text ? text.length : 0;
            
            // Cache cards are no longer needed with the universal data system
            // All data is loaded on-demand through load()/loadAll() functions
            
            // Check for edits in history (RewindSystem)
            RewindSystem.handleContext();
            
            // Load context modifier
            loadContextModifier();
            
            // Remove any hidden message markers from previous turns (including surrounding newlines)
            let modifiedText = text.replace(/\n*<<<[^>]*>>>\n*/g, '');
            
            // Move current scene card if it exists (before getters)
            modifiedText = moveCurrentSceneCard(modifiedText);
            
            // Process all getters in the entire context (if getters exist)
            let gettersReplaced = {};
            // Check both universal object getters and function getters
            const hasUniversalGetters = UNIVERSAL_GETTER_PATTERN.test(modifiedText);
            const hasFunctionGetters = FUNCTION_GETTER_PATTERN.test(modifiedText);
            
            if (hasUniversalGetters || hasFunctionGetters) {
                // Track which getters are being replaced (count only, not every instance)
                const universalMatches = hasUniversalGetters ? modifiedText.match(UNIVERSAL_GETTER_PATTERN) : [];
                const functionMatches = hasFunctionGetters ? modifiedText.match(FUNCTION_GETTER_PATTERN) : [];
                const getterMatches = [...(universalMatches || []), ...(functionMatches || [])];
                
                if (getterMatches.length > 0) {
                    // Check if any getters need character data
                    let needsCharacters = false;
                    getterMatches.forEach(match => {
                        // Check universal getter format
                        if (match.startsWith('get[')) {
                            const path = match.match(/get\[([^\]]+)\]/)?.[1];
                            if (path && path.toLowerCase().includes('character')) {
                                needsCharacters = true;
                            }
                        }
                        // Check function getter format
                        const innerMatch = match.match(/get_([a-z]+)/i);
                        if (innerMatch) {
                            const getterName = innerMatch[1];
                            gettersReplaced[getterName] = (gettersReplaced[getterName] || 0) + 1;
                            
                            // These getters need character data
                            if (['location', 'hp', 'level', 'xp', 'name', 'attribute', 'skill', 'inventory', 'stat'].includes(getterName)) {
                                needsCharacters = true;
                            }
                        }
                    });
                    
                    // Pre-load characters if needed
                    if (needsCharacters) {
                        const allChars = loadAll('Character');
                        for (const [name, char] of Object.entries(allChars || {})) {
                            entityCache[`Character.${name}`] = char;
                        }
                    }
                }
                modifiedText = processGetters(modifiedText);
            }
            
            // Build trigger name to username mapping and replace in tool usages
            const triggerNameMap = {};
            const allCharacters = loadAll('Character');
            
            // Get current action count for cleanup check
            const currentTurn = info?.actionCount || 0;
            
            // Build the mapping from character data (info.trigger_name)
            for (const [charName, character] of Object.entries(allCharacters || {})) {
                if (character.info?.trigger_name) {
                    const triggerName = character.info.trigger_name;
                    const username = character.name.toLowerCase();
                    
                    // Get generation turn if available
                    const generatedTurn = character.info.generation_turn || 0;
                    
                    // Check if trigger name should be cleaned up (10+ turns old and not in context)
                    if (generatedTurn > 0 && currentTurn - generatedTurn >= 10) {
                        // Check if trigger name still exists in the context
                        const triggerPattern = new RegExp(`\\b${triggerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
                        if (!triggerPattern.test(modifiedText)) {
                            // Remove trigger name from character info
                            delete character.info.trigger_name;
                            delete character.info.generation_turn;
                            
                            // When saving, the keys will be regenerated without the trigger_name
                            // since it's no longer in character.info.trigger_name
                            save('Character', character);
                            
                            // Also need to update the card's keys directly since save() might not regenerate them
                            const cardTitle = `[CHARACTER] ${character.name}`;
                            const card = Utilities.storyCard.get(cardTitle);
                            if (card) {
                                // Regenerate keys without trigger name
                                const newKeys = ` ${character.name.toLowerCase()},(${character.name.toLowerCase()}`;
                                Utilities.storyCard.update(cardTitle, { keys: newKeys });
                            }
                            
                            if (debug) {
                                console.log(`${MODULE_NAME}: Cleaned up trigger name "${triggerName}" for ${username} (${currentTurn - generatedTurn} turns old)`);
                            }
                            continue; // Skip adding to map since we cleaned it up
                        }
                    }
                    
                    // Add to mapping if trigger name differs from character name
                    if (triggerName.toLowerCase() !== username) {
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
                    `(\\w+\\()(\\s*)(${triggerNames})(\\s*)(,|\\))`,
                    'gi'
                );
                
                modifiedText = modifiedText.replace(toolPattern, (match, func, space1, triggerName, space2, delimiter) => {
                    const username = triggerNameMap[triggerName] || triggerName;
                    if (debug && username !== triggerName) {
                        console.log(`${MODULE_NAME}: Replaced trigger name "${triggerName}" with "${username}" in tool usage`);
                    }
                    return `${func}${space1}${username}${space2}${delimiter}`;
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
                        getGlobalValue: getGlobalValue,
                        setGlobalValue: setGlobalValue,
                        loadCharacter: function(name) {
                            const chars = loadAll('Character');
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
            
            // Log the context turn
            logDebugTurn('context', originalContext, modifiedText, {
                // Don't include actual context text to save state space
                triggerNamesReplaced: Object.keys(triggerNameMap).length,
                gettersReplaced: gettersReplaced
            });
            
            logTime();
            return modifiedText;  // Return the fully modified text
            
        case 'output':
            // Initialize debug logging for this turn
            if (debug) initDebugLogging();
            
            // Store original output for logging
            const originalOutput = text;
            
            
            // Load output modifier
            loadOutputModifier();
            
            // Check if GenerationWizard is processing
            if (typeof GenerationWizard !== 'undefined' && GenerationWizard.isActive()) {
                const result = GenerationWizard.process('output', text);
                if (result.active) {
                    // Log early return
                    logDebugTurn('output', null, null, {
                        generationWizardActive: true
                    });
                    return result.text;  // Return wizard's output (hidden message)
                }
            }

            // Process tools in LLM's output
            if (text) {
                // Check if there are any tool patterns first
                const hasToolPatterns = TOOL_PATTERN.test(text);
                TOOL_PATTERN.lastIndex = 0; // Reset regex state
                
                if (hasToolPatterns) {
                    loadRuntimeTools();
                }
                
                const result = processTools(text);
                let modifiedText = result.modifiedText;
                const executedTools = result.executedTools || [];
                
                // Calculate hash AFTER tool removal so it matches what gets stored
                currentHash = RewindSystem.quickHash(modifiedText);
                
                // Position should be current history.length
                const futurePosition = history ? Math.min(history.length, RewindSystem.MAX_HISTORY - 1) : 0;
                RewindSystem.recordAction(text, executedTools, futurePosition);
                
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
                
                // Apply OUTPUT_MODIFIER if available
                if (outputModifier) {
                    try {
                        modifiedText = outputModifier(modifiedText);
                        if (debug) console.log(`${MODULE_NAME}: Applied output modifier`);
                    } catch(e) {
                        if (debug) console.log(`${MODULE_NAME}: Output modifier error: ${e}`);
                    }
                }
                
                // Log the output turn with tools executed
                logDebugTurn('output', null, null, {
                    toolsExecuted: executedTools,
                    entityQueued: entityQueued,
                    generationWizardActive: typeof GenerationWizard !== 'undefined' && GenerationWizard.isActive()
                });
                
                // Clear entity cache after processing
                entityCache = {};
                
                // Pin important cards to top for fast access
                // [PLAYER] cards go at the very top
                if (typeof storyCards !== 'undefined' && storyCards.length > 0) {
                    const playerCards = [];
                    
                    // Extract all special cards in one pass (backwards to avoid index issues)
                    for (let i = storyCards.length - 1; i >= 0; i--) {
                        const card = storyCards[i];
                        if (!card || !card.title) continue;
                        
                        if (card.title.startsWith('[PLAYER]')) {
                            playerCards.unshift(storyCards.splice(i, 1)[0]);
                        }
                        // Cache cards are obsolete - no longer pinned
                    }
                    
                    // Re-insert in optimal order at the top
                    let insertPos = 0;
                    
                    // Insert player cards at the very top
                    if (playerCards.length > 0) {
                        storyCards.splice(insertPos, 0, ...playerCards);
                        if (debug) console.log(`${MODULE_NAME}: Pinned ${playerCards.length} player card(s) to top`);
                    }

                }
                
                logTime();
                return modifiedText;
            }
            break;
    }
    
    // Log execution time before returning
    logTime();
    return GameState;
}
