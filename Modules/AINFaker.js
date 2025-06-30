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
            hasStableEstimate: false
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
