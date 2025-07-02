    // estimate AI Instructions and then subtract from info.maxChars if pattern detected so everyone below can be happy
function AINFaker(text) {
    const debug = false;

    function getStoryCard(title) {
        for (const card of storyCards) {
            if (card && card.title === title) {
                return card;
            }
        }
        return null;
    }
    
    function parseConfig(description) {
        const config = {
            estimate: 0,  // Start with 0 - no estimate until we're confident
            manualChars: 1000,
            autoMode: true,
            enabled: true,
            maxSamples: 40,
            safetyBuffer: 100,
            samples: [],
            debugMode: false,
            hasStableEstimate: false  // Track if we have a reliable estimate
        };
        
        if (!description) return config;
        
        const lines = description.split('\n');
        for (const line of lines) {
            if (line.trim().startsWith('#')) continue;
            
            const match = line.match(/^([^:]+):\s*(.+)$/);
            if (!match) continue;
            
            const key = match[1].trim();
            const value = match[2].trim();
            
            switch (key) {
                case 'Enabled':
                    config.enabled = value.toLowerCase() === 'true';
                    break;
                case 'Manual Chars':
                    config.manualChars = parseInt(value) || 1000;
                    break;
                case 'Auto Mode':
                    config.autoMode = value.toLowerCase() === 'true';
                    break;
                case 'Max Samples':
                    config.maxSamples = parseInt(value) || 40;
                    break;
                case 'Safety Buffer':
                    config.safetyBuffer = parseInt(value) || 150;
                    break;
                case 'Debug Mode':
                    config.debugMode = value.toLowerCase() === 'true';
                    break;
                case 'Has Stable Estimate':
                    config.hasStableEstimate = value.toLowerCase() === 'true';
                    break;
                case 'Estimate':
                    config.estimate = parseInt(value) || 0;
                    break;
                case 'Samples':
                    try {
                        config.samples = JSON.parse(value) || [];
                    } catch (e) {
                        config.samples = [];
                    }
                    break;
            }
        }
        
        return config;
    }
    
    function saveConfig(config) {
        const statusText = config.hasStableEstimate ? 
            `Reserving ${config.estimate} chars` :
            config.samples.length < 8 ? 
                `Gathering samples (${config.samples.length}/8 minimum)` :
                `Analyzing pattern...`;
        
        const helpText = (
            `# AIN Detector State\n`+
            `Mode: ${config.autoMode ? 'AUTO' : 'MANUAL'}\n`+
            `Status: ${statusText}\n`+
            `${config.autoMode ? 
                `Samples: ${config.samples.length}/${config.maxSamples}\n` :
                `Manual Setting: ${config.manualChars} characters\n`
            }`+
            `===Alter Config Below===`
        );
        
        const configText = (
            `Enabled: ${config.enabled}\n`+
            `Manual Chars: ${config.manualChars}\n`+
            `Auto Mode: ${config.autoMode}\n`+
            `Max Samples: ${config.maxSamples}\n`+
            `Safety Buffer: ${config.safetyBuffer}\n`+
            `Debug Mode: ${config.debugMode}\n`+
            `=================================\n` +
            `Estimate: ${config.estimate}\n`+
            `Has Stable Estimate: ${config.hasStableEstimate}\n`+
            `Samples: ${JSON.stringify(config.samples)}`
        );
        
        const existingCard = getStoryCard("[AIN] Detector Configuration");
        
        if (existingCard) {
            // Update existing card
            for (let i = 0; i < storyCards.length; i++) {
                if (storyCards[i] && storyCards[i].title === "[AIN] Detector Configuration") {
                    const card = storyCards[i];
                    card.entry = helpText;
                    card.description = configText;
                    updateStoryCard(i, "", helpText, card.type || "system", configText);
                    break;
                }
            }
        } else {
            addStoryCard("%@%");
            
            for (let i = storyCards.length - 1; i >= 0; i--) {
                const card = storyCards[i];
                if (card && card.title === "%@%") {
                    card.type = "system";
                    card.title = "[AIN] Detector Configuration";
                    card.keys = "";
                    card.entry = helpText;
                    card.description = configText;
                    return;
                }
            }
        }
    }
    
    function average(numbers) {
        if (!numbers || numbers.length === 0) return 0;
        return numbers.reduce((a, b) => a + b, 0) / numbers.length;
    }
    
    function standardDeviation(numbers) {
        if (numbers.length < 2) return 0;
        const avg = average(numbers);
        const squareDiffs = numbers.map(value => Math.pow(value - avg, 2));
        return Math.sqrt(average(squareDiffs));
    }
    
    function calculateTrend(samples) {
        if (samples.length < 3) return { slope: 0, strength: 0 };
        
        const recentSamples = samples.slice(-10);
        const n = recentSamples.length;
        
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        
        recentSamples.forEach((sample, index) => {
            sumX += index;
            sumY += sample.gap;
            sumXY += index * sample.gap;
            sumX2 += index * index;
        });
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        
        // Calculate R-squared for trend strength
        const meanY = sumY / n;
        let ssTotal = 0, ssResidual = 0;
        
        recentSamples.forEach((sample, index) => {
            const predicted = (sumY / n) + slope * (index - sumX / n);
            ssTotal += Math.pow(sample.gap - meanY, 2);
            ssResidual += Math.pow(sample.gap - predicted, 2);
        });
        
        const rSquared = 1 - (ssResidual / ssTotal);
        
        return {
            slope: slope,
            strength: rSquared || 0
        };
    }
    
    function detectStability(samples) {
        if (samples.length < 8) return { isStable: false, reason: "Insufficient samples" };
        
        const recentSamples = samples.slice(-8);
        const gaps = recentSamples.map(s => s.gap);
        
        const avg = average(gaps);
        const stdDev = standardDeviation(gaps);
        const coefficientOfVariation = stdDev / avg;
        
        const trend = calculateTrend(recentSamples);
        
        // Stability criteria
        const criteria = {
            lowVariation: coefficientOfVariation < 0.2,  // Less than 20% variation
            smallSlope: Math.abs(trend.slope) < 600,      // Less than 600 chars/turn change
            notStrongTrend: trend.strength < 0.8,          // Not a strong linear trend
            consistentRange: Math.max(...gaps) - Math.min(...gaps) < avg * 0.3  // Range within 30% of average
        };
        
        const isStable = criteria.lowVariation && 
                        criteria.smallSlope && 
                        (criteria.notStrongTrend || criteria.smallSlope);
        
        return {
            isStable: isStable,
            avg: avg,
            stdDev: stdDev,
            cv: coefficientOfVariation,
            trend: trend,
            criteria: criteria,
            reason: !isStable ? 
                !criteria.lowVariation ? "High variation in gaps" :
                !criteria.smallSlope ? `Strong trend: ${Math.round(trend.slope)} chars/turn` :
                !criteria.notStrongTrend ? "Pattern too linear" :
                "Range too wide" : "Stable pattern detected"
        };
    }
    
    // Main Detection Logic
    // ensure config card exists
    const configCard = getStoryCard("[AIN] Detector Configuration");
    const config = parseConfig(configCard ? configCard.description : null);
    if (!configCard) {
        if (debug || config.debugMode) console.log("AIN Detector: Creating initial config card");
        saveConfig(config);
    }
    
    const useDebug = debug || config.debugMode;
    
    // Early return if disabled
    if (!config.enabled) {
        if (useDebug) console.log("AIN Detector: Disabled");
        return;
    }

    const originalMaxChars = info.maxChars;

    // Handle manual mode
    if (!config.autoMode) {
        info.maxChars = originalMaxChars - config.manualChars;
        if (useDebug) {
            console.log((
                `AIN Detector: Manual mode\n`+
                `  Original maxChars: ${originalMaxChars}\n`+
                `  AIN reservation: ${config.manualChars}\n`+
                `  Adjusted maxChars: ${info.maxChars}`
            ));
        }
        return;
    }

    // Early return if context be tiny
    if (text.length < info.maxChars * 0.5) {
        if (useDebug) console.log("AIN Detector: Context too small for detection");
        return;
    }
    
    // Mind the gap
    const currentLength = text.length;
    const observedGap = originalMaxChars - currentLength;
    const actionCount = info.actionCount;
    
    if (typeof observedGap !== 'number' || isNaN(observedGap)) {
        if (useDebug) console.log("AIN Detector: Invalid gap calculation");
        // If we had a stable estimate, keep using it
        if (config.hasStableEstimate && config.estimate > 0) {
            info.maxChars = originalMaxChars - config.estimate;
        }
        return;
    }
    
    if (useDebug) {
        console.log((
            `AIN Detector: Turn ${actionCount}\n`+
            `  Context: ${currentLength}/${originalMaxChars} chars\n`+
            `  Observed gap: ${observedGap} chars${observedGap < 0 ? ' (OVERFLOW!)' : ''}`
        ));
    }
    
    // Sampling
    let samples = config.samples || [];
    
    samples = samples.filter(s => typeof s.gap === 'number' && !isNaN(s.gap));
    samples = samples.filter(s => s.action !== actionCount);
    samples.push({ action: actionCount, gap: observedGap });
    samples.sort((a, b) => a.action - b.action);
    
    if (samples.length > config.maxSamples) {
        samples = samples.slice(-config.maxSamples);
    }
    
    config.samples = samples;
    
    if (useDebug) {
        console.log((
            `AIN Detector: Added sample ${samples.length}/${config.maxSamples}\n`+
            `  Gap: ${observedGap} chars`
        ));
    }

    if (samples.length >= 10) {
        const recentAvg = average(samples.slice(-5).map(s => s.gap));
        const olderAvg = average(samples.slice(-10, -5).map(s => s.gap));
        
        if (Math.abs(recentAvg - olderAvg) > 1600) {
            if (useDebug) {
                console.log((
                    `AIN Detector: Sudden change detected!\n`+
                    `  Recent avg: ${Math.round(recentAvg)}\n`+
                    `  Older avg: ${Math.round(olderAvg)}\n`+
                    `  Keeping only recent samples`
                ));
            }
            samples = samples.slice(-8);
            config.samples = samples;
            config.hasStableEstimate = false;
            config.estimate = 0;
        }
    }

    const stability = detectStability(samples);
    
    if (useDebug) {
        console.log((
            `AIN Detector: Stability Analysis\n`+
            `  Status: ${stability.reason}\n`+
            `  Average gap: ${Math.round(stability.avg || 0)}\n`+
            `  Std deviation: ${Math.round(stability.stdDev || 0)}\n`+
            `  CV: ${((stability.cv || 0) * 100).toFixed(1)}%\n`+
            `  Trend slope: ${Math.round(stability.trend?.slope || 0)} chars/turn`
        ));
    }
    
    if (stability.isStable) {
        const newEstimate = Math.round(stability.avg + config.safetyBuffer);
        
        if (!config.hasStableEstimate || Math.abs(newEstimate - config.estimate) > 100) {
            config.estimate = newEstimate;
            config.hasStableEstimate = true;
            
            if (useDebug) {
                console.log((
                    `AIN Detector: Stable boundary detected!\n`+
                    `  Average gap: ${Math.round(stability.avg)}\n`+
                    `  Estimate: ${config.estimate} (includes ${config.safetyBuffer} buffer)`
                ));
            }
        }
    }
    // update SC
    saveConfig(config);
    
    // Apply if stable
    if (config.hasStableEstimate && config.estimate > 0) {
        info.maxChars = originalMaxChars - config.estimate;
        
        if (useDebug) {
            console.log((
                `AIN Detector: Applied stable estimate\n`+
                `  Original maxChars: ${originalMaxChars}\n`+
                `  AIN estimate: ${config.estimate}\n`+
                `  Adjusted maxChars: ${info.maxChars}`
            ));
        }
    } else {
        // No stable estimate yet - don't modify maxChars
        if (useDebug) {
            console.log((
                `AIN Detector: No stable estimate yet\n`+
                `  Using original maxChars: ${originalMaxChars}`
            ));
        }
    }
}

function ASCQ(text) {
    const debug = false;

    if (!info || !info.maxChars) {
        if (debug) console.log("ASCQ: ERROR - info.maxChars is missing!");
        return text;
    }
    
    const maxChars = info.maxChars;

    // Configuration Management
    function parseConfigDescription(description) {
        const config = {
            nonStoryAllocation: 0.6,     // 60% for all non-story content
            debugLogging: false,
            clearDebugCards: false,
        };
        
        if (!description) return config;
        
        const parsed = Utilities.plainText.parseKeyValues(description, true);
        
        // Map parsed values to config
        if (parsed.non_story_allocation !== undefined) {
            let value = parsed.non_story_allocation;
            
            // Handle "60%" format
            if (typeof value === 'string' && value.includes('%')) {
                value = parseFloat(value.replace('%', ''));
            } else {
                value = parseFloat(value);
            }
            
            if (!isNaN(value)) {
                // If value is > 1, it's a percentage (60), convert to decimal (0.6)
                config.nonStoryAllocation = value > 1 ? value / 100 : value;
            }
        }
        
        config.debugLogging = Utilities.string.parseBoolean(parsed.debug_logging || 'false');
        config.clearDebugCards = Utilities.string.parseBoolean(parsed.clear_debug_cards || 'false');
        
        return config;
    }
    
    function loadConfig() {
        const systemCard = Utilities.storyCard.get("[ASCQ] Help & Configuration");
        return systemCard ? parseConfigDescription(systemCard.description) : parseConfigDescription(null);
    }
    
    function saveConfig(config) {
        const helpEntry = (
            `# ASCQ - Advanced Story Card Query System\n`+
            `## Overview\n`+
            `ASCQ triggers story cards based on query expressions.\n`+
            `Prefix triggers with $Q: to create a query trigger.\n`+
            `Can place complex triggers in description if encapsulated like {$Q: Expression}\n` +
            `\n`+
            `### Text Pattern Functions\n`+
            `near("word1", "word2", distance) - Words within N characters\n`+
            `Example: $Q:near("sword", "broken", 50)\n`+
            `\n`+
            `sequence("word1", "word2", ...) or seq(...) - Words in order\n`+
            `Example: $Q:seq("opened", "gate")\n`+
            `\n`+
            `count("word") >= number - Word frequency\n`+
            `Example: $Q:count("Beetlejuice") >= 3\n`+
            `\n`+
            `### State/Info Access\n`+
            `Access state, info, and other scripting properties:\n`+
            `info.actionCount - Turn counter\n`+
            `state.propertyName - State properties\n`+
            `state.array.includes("value") - Array methods\n`+
            `\n`+
            `Examples:\n`+
            `$Q:info.actionCount > 50\n`+
            `$Q:state.level >= 10 && state.class == "warrior"\n`+
            `$Q:state.inventory.includes("sword")\n`+
            `$Q:!state.questCompleted.includes("tutorial")\n`+
            `$Q:Calendar.getDayOfWeek() === "Sunday"\n` +
            `\n`+
            `### Boolean Functions\n`+
            `any("word1", "word2") - At least one word present\n`+
            `all("word1", "word2") - All words present\n`+
            `none("word1", "word2") - No words present\n`+
            `\n`+
            `### Boolean Operators\n`+
            `&& or AND - Both conditions true\n`+
            `|| or OR - Either condition true\n`+
            `! or NOT - Negates condition\n`+
            `( ) - Groups expressions\n`+
            `\n`+
            `### RegEx Support\n`+
            `~pattern~flags - Regular expression matching\n`+
            `Example: $Q:~(crystal|gem|jewel)\\s+(glows?|shines?|pulses?)~i\n`+
            `\n`+
            `### Complex Examples\n`+
            `$Q:(info.actionCount > 100) && near("dragon", "slain", 50)\n`+
            `$Q:state.hp < 20 || state.status.includes("poisoned")\n`+
            `$Q:all("quest", "complete") && state.level >= 5\n`+
            `$Q:fuzzy("probdont") || fuzzy("usethis")\n`+
            `$Q:(info.actionCount > 50 && near("portal", "opened", 75)) || state.keyFragments >= 3\n`+
            `\n`+
            `## Priority System\n`+
            `Add $priority: N to card description (default: 0).\n`+
            `Higher values trigger first when space is limited.\n`+
            `\n`+
            `## Configuration\n`+
            `Settings stored in this card's description field:\n`+
            `Non-Story Allocation: % of context for all non-story content (default: 60%)`
        );
        
        const configText = Utilities.format.formatList([
            `Non-Story Allocation: ${Math.round((config.nonStoryAllocation || 0.6) * 100)}%`,
            `Debug Logging: ${config.debugLogging}`,
            `Clear Debug Cards: ${config.clearDebugCards}`
        ], '');
        
        Utilities.storyCard.upsert({
            title: "[ASCQ] Help & Configuration",
            entry: helpEntry,
            type: "SYSTEM",
            keys: "",
            description: configText
        });
    }
    
    const config = loadConfig();
    
    // Diagnostic logging
    if (debug) {
        console.log((
            `ASCQ: Configuration loaded:\n`+
            `  debugLogging: ${config.debugLogging}\n`+
            `  clearDebugCards: ${config.clearDebugCards}\n`+
            `  nonStoryAllocation: ${config.nonStoryAllocation}\n`+
            `  Local debug flag: ${debug}`
        ));
        
        // Also check if the config card exists
        const configCard = Utilities.storyCard.get("[ASCQ] Help & Configuration");
        if (configCard) {
            console.log(`ASCQ: Config card description: "${configCard.description}"`);
        } else {
            console.log(`ASCQ: Config card not found!`);
        }
    }

    // Clear debug cards if requested
    if (config.clearDebugCards) {
        const removed = Utilities.storyCard.remove(
            card => card.title && card.title.startsWith("[DEBUG] ASCQ"), 
            true
        );
        
        config.clearDebugCards = false;
        saveConfig(config);
        
        if (config.debugLogging) {
            console.log(`ASCQ: Cleared ${removed} debug cards`);
        }
    }
    
    ensureSystemCards();
    
    function calculateASCQAllocation(context = text) {
        const plotEssentials = Utilities.context.extractPlotEssentials(context);
        const worldLore = Utilities.context.extractWorldLore(context);
        
        const nonStoryAllocation = Math.floor(maxChars * (config.nonStoryAllocation || 0.6));
        
        const nonStoryUsed = plotEssentials.length + worldLore.length;
        
        const ascqAllocation = Math.max(0, nonStoryAllocation - nonStoryUsed);
        
        if (config.debugLogging || debug) {
            console.log((
                `ASCQ: Allocation calculation:\n`+
                `  Total context: ${maxChars}\n`+
                `  Non-story allocation: ${nonStoryAllocation} (${Math.round(config.nonStoryAllocation * 100)}%)\n`+
                `  Plot essentials: ${plotEssentials.length}\n`+
                `  World lore: ${worldLore.length}\n`+
                `  ASCQ Available: ${ascqAllocation}`
            ));
        }
        
        return ascqAllocation;
    }
    
    function saveDebugInfo(triggeredCards, finalContext, spaceUsed, allocation) {
        if (!config.debugLogging) return;
        
        const actionCount = (info && info.actionCount) || 0;
        const debugTitle = `[DEBUG] ASCQ Turn ${actionCount}`;
        
        let debugEntry = `# ASCQ Debug - Turn ${actionCount}\n\n`;
        
        debugEntry += `## Triggered Cards (${triggeredCards.length} total)\n`;
        if (triggeredCards.length > 0) {
            triggeredCards.forEach((data, index) => {
                debugEntry += `${index + 1}. ${data.card.title}\n`;
                debugEntry += `   Query: ${data.query}\n`;
                debugEntry += `   Priority: ${data.priority}\n`;
            });
        } else {
            debugEntry += "No cards triggered this turn.\n";
        }
        
        debugEntry += `\n## Space Usage\n`;
        debugEntry += `ASCQ Used: ${spaceUsed} / ${allocation} chars `;
        debugEntry += `(${Math.round((spaceUsed / allocation) * 100)}%)\n`;
        
        const actualGap = maxChars - finalContext.length;
        
        debugEntry += `\n## Context Distribution\n`;
        debugEntry += `Total Context Limit: ${maxChars} chars\n`;
        debugEntry += `Visible Context: ${finalContext.length} chars\n`;
        debugEntry += `Actual Gap: ${actualGap} chars`;
        
        Utilities.storyCard.upsert({
            title: debugTitle,
            entry: debugEntry,
            type: "DEBUG",
            keys: "",
            description: finalContext.replace(/\{title:[^}]+\}/g, '%ACtitleDebugOnly%')
        });
    }
    
    function processQueryCards() {
        const recentStory = Utilities.context.extractRecentStory(text, true);
        const triggeredCards = [];
        
        // Find all cards that have $Q: in either keys or description
        const queryCards = Utilities.storyCard.find(
            card => (card.keys && card.keys.startsWith('$Q:')) || 
                    (card.description && card.description.includes('$Q:')) ||
                    (card.description && card.description.includes('{$Q:')),
            true
        );
        
        // Process each query card
        for (const card of queryCards) {
            let query = null;
            
            // Check keys first (primary location)
            if (card.keys && card.keys.startsWith('$Q:')) {
                query = card.keys.substring(3).trim();
            } 
            // Otherwise check description
            else if (card.description) {
                // First try the new delimited format {$Q: expression}
                const delimitedMatch = card.description.match(/\{\$Q:\s*([^}]+)\}/);
                if (delimitedMatch) {
                    query = delimitedMatch[1].trim();
                } else {
                    // Fall back to old format for backwards compatibility
                    const match = card.description.match(/\$Q:\s*([^\n]+)/);
                    if (match) {
                        query = match[1].trim();
                    }
                }
            }
            
            if (!query) continue;
            
            // Check if query is cached
            let evaluator = Utilities.cache.get('ascq_queries', query);
            if (!evaluator) {
                // Parse and cache the query
                evaluator = Utilities.expression.parse(query);
                if (evaluator) {
                    Utilities.cache.set('ascq_queries', query, evaluator);
                }
            }
            
            if (evaluator && evaluator(recentStory)) {
                let priority = 0;
                if (card.description) {
                    const priorityMatch = card.description.match(/\$priority:\s*(-?\d+)/i);
                    if (priorityMatch) {
                        priority = parseInt(priorityMatch[1]);
                    }
                }
                
                triggeredCards.push({
                    card: card,
                    query: query,
                    priority: priority
                });
            }
        }
        
        // Calculate allocation for debug purposes
        const ascqAllocation = calculateASCQAllocation();
        
        // Handle no triggered cards - but save debug info FIRST
        if (triggeredCards.length === 0) {
            if (config.debugLogging || debug) {
                saveDebugInfo([], text, 0, ascqAllocation);
                console.log("ASCQ: No cards triggered, returning original text");
            }
            return text;
        }
        
        // Sort by priority
        triggeredCards.sort((a, b) => b.priority - a.priority);
        
        // Insert cards
        const result = insertCardsWithSmartTruncation(text, triggeredCards, ascqAllocation);
        
        if (config.debugLogging || debug) {
            const spaceUsed = Math.max(0, result.length - text.length);
            saveDebugInfo(triggeredCards, result, spaceUsed, ascqAllocation);
        }
        
        return result;
    }
    
    function insertCardsWithSmartTruncation(context, cardData, ascqAllocation) {
        if (!cardData || cardData.length === 0 || ascqAllocation <= 0) {
            return context;
        }
        
        let workingContext = context;
        let insertText = "";
        let spaceUsed = 0;
        
        const storyAllocation = Math.floor(maxChars * (1 - (config.nonStoryAllocation || 0.6)));
        
        for (let i = 0; i < cardData.length; i++) {
            const separator = i > 0 ? "\n\n" : "";
            const cardText = separator + cardData[i].card.entry;
            const cardSize = cardText.length;
            
            if (spaceUsed + cardSize > ascqAllocation) {
                if (config.debugLogging || debug) {
                    console.log(`ASCQ: Card ${i + 1} would exceed allocation. Checking story truncation...`);
                }
                
                // Get current story length directly
                const recentStory = Utilities.context.extractRecentStory(workingContext, false);
                const storyOverage = Math.max(0, recentStory.length - storyAllocation);
                
                if (storyOverage > 0) {
                    const spaceNeeded = (spaceUsed + cardSize) - ascqAllocation;
                    const canTruncate = Math.min(storyOverage, spaceNeeded);
                    
                    if (canTruncate > 0) {
                        workingContext = truncateRecentStory(workingContext, canTruncate);
                        
                        // Recalculate allocation with new context
                        const newAllocation = calculateASCQAllocation(workingContext);
                        if (spaceUsed + cardSize <= newAllocation) {
                            insertText += cardText;
                            spaceUsed += cardSize;
                            continue;
                        }
                    }
                }
                
                if (config.debugLogging || debug) {
                    console.log(`ASCQ: Cannot fit card ${i + 1} without exceeding allocations`);
                }
                break;
            }
            
            insertText += cardText;
            spaceUsed += cardSize;
        }
        
        if (insertText.trim().length === 0) {
            return context;
        }
        
        return Utilities.context.insertIntoWorldLore(workingContext, insertText);
    }
    
    function truncateRecentStory(context, spaceNeeded) {
        const recentStory = Utilities.context.extractRecentStory(context, false);
        if (!recentStory) return context;
        
        const sentences = Utilities.string.splitBySentences(recentStory);
        
        const storyAllocation = Math.floor(maxChars * (1 - (config.nonStoryAllocation || 0.6)));
        const avgCharsPerSentence = Math.max(1, recentStory.length) / Math.max(1, sentences.length);
        const sentencesMinimum = Math.max(5, Math.ceil(storyAllocation * 0.5 / avgCharsPerSentence));
        
        if (sentences.length <= sentencesMinimum) {
            if (config.debugLogging || debug) {
                console.log(`ASCQ: Already at minimum sentences (${sentencesMinimum}), cannot truncate`);
            }
            return context;
        }
        
        let removedChars = 0;
        let sentencesToRemove = 0;
        
        for (let i = 0; i < sentences.length - sentencesMinimum; i++) {
            removedChars += sentences[i].length;
            sentencesToRemove++;
            
            if (removedChars >= spaceNeeded) {
                break;
            }
        }
        
        if (sentencesToRemove === 0) {
            return context;
        }
        
        const remainingSentences = sentences.slice(sentencesToRemove);
        const newRecentStory = remainingSentences.join("");
        
        if (config.debugLogging || debug) {
            console.log(`ASCQ: Truncated ${sentencesToRemove} sentences (${removedChars} chars)`);
        }
        
        return Utilities.context.replaceRecentStory(context, newRecentStory);
    }
    
    function ensureSystemCards() {
        if (!Utilities.storyCard.exists("[ASCQ] Help & Configuration")) {
            const defaultConfig = {
                nonStoryAllocation: 0.6,
                debugLogging: false,
                clearDebugCards: false
            };
            saveConfig(defaultConfig);
        }
    }
    
    return processQueryCards();
}
