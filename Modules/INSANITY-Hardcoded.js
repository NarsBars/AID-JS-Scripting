function INSANITY(hook, text) {
    const DURATION = 5 * 60 * 1000; // (first #) determines time in minutes
    const QUERY_INTERVAL = 5 * 60 * 1000; // Query every (first #)) minutes
    // scenario specific
    const MARKER = '<<<INSANITY_MARKER>>>';
    const OPENING = `${MARKER}\n` +
    `You're spit back out onto the cold concrete floor. Again.\n\n` +
    `You don't even try to catch yourself anymore. Your palms know every scratch in this surface, every imperfection in the grey expanse. The fluorescent lights flicker to life overhead - same pattern as always. Two beats, pause, one beat, steady hum.\n\n` +
    `Sector 7. Sublevel 3. Containment Wing B.\n\n` +
    `The emergency lockdown has been active for... you've lost count of how many loops, how many alternate realities.\n\n` +
    `At least Step 1 is always the same: The break room. Third door on the left. Always a key card there somewhere. `;
    const DEBUG_MODE = true; // Set to true to see all outputs
    
    // Initialize state, scenario-specific
    if (!state.insanity) {
        state.insanity = {
            startTime: Date.now(),
 //           lastActionCount: info.actionCount || 0,
 //           lastQueryTurn: 0,
            lastQueryPrompt: '',
            queryPending: false,
 //           currentTurn: 0,
 //           skipNextIncrement: false,
            justQueried: false,
            needsReset: false,
            needsFinalQuery: false,
            lastQueryTime: 0, // Track when we last queried
            // Updated puzzle progress tracking
            currentRoom: 'unknown',
            hasKeycard: false,
            ariaActive: false,
            hasBiometric: false,
            hasSecurityCode: false,
            hasPhysicalKey: false,
            terminalStarted: false,
            escaped: false
        };
    }
    
        // Helper
    const resetAttempt = () => {
        state.insanity.startTime = Date.now();
        state.insanity.queryPending = false;
        state.insanity.justQueried = false;
        state.insanity.lastQueryTime = 0;
        state.insanity.needsFinalQuery = false;
        
        // Reset physical items and room
        state.insanity.currentRoom = 'unknown';
        state.insanity.hasKeycard = false;
        state.insanity.ariaActive = false;
        state.insanity.hasBiometric = false;
        state.insanity.hasPhysicalKey = false;
        state.insanity.terminalStarted = false;

        // don't reset 'knowledge'
    //  state.insanity.hasSecurityCode: false,
        };
    
    // Helper functions
    const getTimeRemaining = () => {
        const elapsed = Date.now() - state.insanity.startTime;
        const remaining = Math.max(0, DURATION - elapsed);
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        return { minutes, seconds, remaining, elapsed };
    };
    
    const shouldQuery = () => {
        if (state.insanity.justQueried) return false;
        
        const { remaining, elapsed } = getTimeRemaining();
        
        // Always query when time is up
        if (remaining === 0 && !state.insanity.needsFinalQuery) {
            if (DEBUG_MODE) console.log("[INSANITY] Query triggered: Time's up");
            state.insanity.needsFinalQuery = true;
            state.insanity.lastQueryTime = elapsed; // Update this to prevent interval query
            return true;
        }
        
        // Skip interval check if we're at time's up (whether we've queried or not)
        if (remaining === 0) {
            return false;
        }
        
        // Query at regular intervals
        const timeSinceLastQuery = elapsed - state.insanity.lastQueryTime;
        if (timeSinceLastQuery >= QUERY_INTERVAL) {
            if (DEBUG_MODE) console.log(`[INSANITY] Query triggered: ${Math.floor(elapsed / 60000)} minute mark`);
            state.insanity.lastQueryTime = elapsed;
            return true;
        }
        
        return false;
    };

    const buildQueryPrompt = () => {
    let questions = ['## Format all answers as KEY:VALUE'];
    
    // Always ask for current room, atm mostly just to make sure its responding to query correctly
    questions.push('- CURRENT_ROOM:What room is the player in now?');
    
    // Only ask about progress that hasn't been made yet
    if (!state.insanity.hasKeycard) {
        questions.push('- HAS_KEYCARD:Has the player found the keycard? (TRUE/FALSE)');
    }
    
    if (!state.insanity.ariaActive) {
        questions.push('- ARIA_ACTIVE:Has the AI companion ARIA been activated? (TRUE/FALSE)');
    }
    
    if (!state.insanity.hasBiometric) {
        questions.push('- HAS_BIOMETRIC:Has the player obtained biometric data? (TRUE/FALSE)');
    }
    
    if (!state.insanity.hasSecurityCode) {
        questions.push('- HAS_SECURITY_CODE:Has the player found the security clearance code? (TRUE/FALSE)');
    }
    
    if (!state.insanity.hasPhysicalKey) {
        questions.push('- HAS_PHYSICAL_KEY:Has the player found the physical security key? (TRUE/FALSE)');
    }
    
    if (!state.insanity.terminalStarted) {
        questions.push('- TERMINAL_STARTED:Has the player begun the security terminal sequence? (TRUE/FALSE)');
    }
    
    // If we're only asking about current room (everything else fulfilled), add a follow-up question
    if (questions.length === 2) {
        questions.push('- TERMINAL_COMPLETE:Has the player completed the full security terminal sequence? (TRUE/FALSE)');
    }
    
    questions.push('- END_TRUE:TRUE (ALWAYS TRUE)');

    return '\n\n<SYSTEM>\n' +
        '# Stop the story and answer based on Recent Story:\n' +
        questions.join('\n') +
        '\n</SYSTEM>';
    };
    
    // nothing needed on input unless we're using action-based instead of time-based
    if (hook === 'input') {
  //      state.insanity.skipNextIncrement = true;
  //      console.log(`[INSANITY] Input detected - will skip next actionCount increment`);
        return text;
    }
    
    // CONTEXT HOOK - Rebuild Story from MARKER and inject queries
    if (hook === 'context') {
        // Track turns based on actionCount changes, unnecessary unless using turn-based
        /*
        if (info.actionCount > state.insanity.lastActionCount) {
            // actionCount increased - something happened
            if (state.insanity.skipNextIncrement) {
                // This is the first increment from an input, skip it
                state.insanity.skipNextIncrement = false;
                console.log(`[INSANITY] Skipping actionCount increment (from input)`);
            } else {
                // This is a real turn (either from continue or second increment from input)
                state.insanity.currentTurn++;
                console.log(`[INSANITY] Turn ${state.insanity.currentTurn}, Time remaining: ${getTimeRemaining().minutes}:${getTimeRemaining().seconds}`);
            }
        } else if (info.actionCount < state.insanity.lastActionCount) {
            console.log(`[INSANITY] Erase detected - actionCount decreased`);
        } else {
            console.log(`[INSANITY] Retry detected - actionCount unchanged`);
        }
        state.insanity.lastActionCount = info.actionCount;
        */
        // Check if we should query (runs on every context modification)
        if (!state.insanity.queryPending && !state.insanity.justQueried && shouldQuery()) {
            if (DEBUG_MODE) console.log("[INSANITY] Context hook: Setting queryPending = true");
            state.insanity.queryPending = true;
        }
        
        // Find the last MARKER in history
        let markerIndex = -1;
        for (let i = history.length - 1; i >= 0; i--) {
            if (history[i].text && history[i].text.includes(MARKER)) {
                markerIndex = i;
                break;
            }
        }
        
        // If no marker found, force a reset. This creates a hard 255 history limit unfortunately. May be unnecessary and can just assume all history is for current run
        if (markerIndex === -1) {
            state.insanity.needsReset = true;
            return text;
        }
        
        // Extract original Recent Story
        const recentStoryMatch = text.match(/Recent\s*Story\s*:\s*([\s\S]*)/i);
        if (!recentStoryMatch) return text; // No Recent Story section found
        
        const originalStoryLength = recentStoryMatch[1].length;
        
        // Extract any existing Author's Note
        const authorNoteMatch = text.match(/\[Author['']s\s*note:\s*([^\]]*)\]/i);
        const authorNote = authorNoteMatch ? authorNoteMatch[0] : '';
        
        // Rebuild Recent Story from marker to present
        let rebuiltStory = '';
        const storyParts = [];
        
        // Collect all history from marker forward
        for (let i = markerIndex; i < history.length; i++) {
            const actionText = history[i].text || '';
            storyParts.push(actionText);
        }
        
        // Build story with proper Author's Note placement
        if (storyParts.length > 0) {
            // Add all entries except the last one
            for (let i = 0; i < storyParts.length - 1; i++) {
                rebuiltStory += storyParts[i] + '\n';
            }
            
            // Add Author's Note before the last entry if it exists
            if (authorNote) {
                rebuiltStory += authorNote + '\n';
            }
            
            // Add the last entry
            rebuiltStory += storyParts[storyParts.length - 1];
        }
        
        // Strip all <<<>>> content from the rebuilt story
        rebuiltStory = rebuiltStory.replace(/<<<[\s\S]*?>>>/g, '').trim();
        
        // Condense multiple newlines (4 or more) to double newlines
        rebuiltStory = rebuiltStory.replace(/\n{4,}/g, '\n\n');
        
        // Replace everything after "Recent Story:"
        const beforeStory = text.substring(0, recentStoryMatch.index);
        text = beforeStory + 'Recent Story:\n' + rebuiltStory;
        
        // Run ASCQ against rebuilt context
        text = ASCQ(text);
        
        // Inject query if pending
        if (state.insanity.queryPending) {
            if (DEBUG_MODE) console.log("[INSANITY] Injecting query prompt into context");
            const queryPrompt = buildQueryPrompt();
            
            text += queryPrompt;
            state.insanity.queryPending = false;
            state.insanity.justQueried = true;
            state.insanity.lastQueryPrompt = queryPrompt; // Store for debug display
            state.insanity.lastQueryTurn = state.insanity.currentTurn;
        }
        
        return text;
    }
    
    // OUTPUT HOOK - Handle query responses and add timer
    if (hook === 'output') {
        const timeInfo = getTimeRemaining();
        
        // Handle forced reset if no marker was found
        if (state.insanity.needsReset) {
            state.insanity.needsReset = false;
            resetAttempt();
            return "<<<INSANITY ENGINE ERROR: No start marker found. Resetting...>>>\n\n" + OPENING;
        }
        
        if (state.insanity.justQueried) {
            // Check if the response contains our expected query format
            const hasQueryResponse = (text.includes("CURRENT_ROOM:") && text.includes("END_TRUE:"));
            
            if (hasQueryResponse) {
                // Parse the response
                const roomMatch = text.match(/CURRENT_ROOM:([^\n]+)/);
                const keycardMatch = text.match(/HAS_KEYCARD:(TRUE|FALSE)/);
                const ariaMatch = text.match(/ARIA_ACTIVE:(TRUE|FALSE)/);
                const biometricMatch = text.match(/HAS_BIOMETRIC:(TRUE|FALSE)/);
                const securityCodeMatch = text.match(/HAS_SECURITY_CODE:(TRUE|FALSE)/);
                const physicalKeyMatch = text.match(/HAS_PHYSICAL_KEY:(TRUE|FALSE)/);
                const terminalMatch = text.match(/TERMINAL_STARTED:(TRUE|FALSE)/);
                
                // Update state with parsed values
                if (roomMatch) state.insanity.currentRoom = roomMatch[1].trim();
                if (keycardMatch) state.insanity.hasKeycard = keycardMatch[1] === "TRUE";
                if (ariaMatch) state.insanity.ariaActive = ariaMatch[1] === "TRUE";
                if (biometricMatch) state.insanity.hasBiometric = biometricMatch[1] === "TRUE";
                if (securityCodeMatch) state.insanity.hasSecurityCode = securityCodeMatch[1] === "TRUE";
                if (physicalKeyMatch) state.insanity.hasPhysicalKey = physicalKeyMatch[1] === "TRUE";
                if (terminalMatch) state.insanity.terminalStarted = terminalMatch[1] === "TRUE";
                
                if (DEBUG_MODE) console.log(`[INSANITY] Query results:
                    Room: ${state.insanity.currentRoom}
                    Keycard: ${state.insanity.hasKeycard}
                    ARIA: ${state.insanity.ariaActive}
                    Biometric: ${state.insanity.hasBiometric}
                    Security Code: ${state.insanity.hasSecurityCode}
                    Physical Key: ${state.insanity.hasPhysicalKey}
                    Terminal Started: ${state.insanity.terminalStarted}`);
                
                state.insanity.justQueried = false;
                
                // Show or hide the query response based on debug mode
                if (DEBUG_MODE) {
                    let debugOutput = '';
                    if (state.insanity.lastQueryPrompt) {
                        debugOutput = '<<<INSANITY DEBUG - QUERY PROMPT:' + state.insanity.lastQueryPrompt + '>>>\n\n';
                    }
                    debugOutput += '<<<INSANITY DEBUG - QUERY RESPONSE:\n' + text + '>>>';
                    return debugOutput;
                } else {
                    return "<<<Insanity Engine Sanity Check Complete. Please Continue.>>>";
                }
            } else {
                // AI ignored our query and continued the story
                if (DEBUG_MODE) console.log("[INSANITY] AI ignored query prompt, retrying...");
                
                // Reset flags to retry the query
                state.insanity.justQueried = false;
                state.insanity.queryPending = true;
                
                // Tell the user to continue for retry
                if (DEBUG_MODE) {
                    let debugOutput = '';
                    if (state.insanity.lastQueryPrompt) {
                        debugOutput = '<<<INSANITY DEBUG - QUERY PROMPT:' + state.insanity.lastQueryPrompt + '>>>\n\n';
                    }
                    debugOutput += '<<<INSANITY DEBUG - QUERY IGNORED:\n' + text + '>>>\n\n';
                    debugOutput += '<<<INSANITY: Query failed. Press Continue to retry.>>>';
                    return debugOutput;
                } else {
                    return "<<<Insanity Engine: Query failed. Press Continue to retry.>>>";
                }
            }
        }
        
        if (timeInfo.remaining === 0 && state.insanity.needsFinalQuery && !state.insanity.justQueried && !state.insanity.escaped) {
            // Check win conditions
            if (state.insanity.hasBiometric && 
                state.insanity.hasSecurityCode && 
                state.insanity.hasPhysicalKey && 
                state.insanity.terminalStarted) {
                state.insanity.escaped = true;
                return "\n\n<<<TIME'S UP! But wait... you've done it! You've escaped! CONGRATULATIONS!>>>\n\n";
            } else {
                // Reset
                resetAttempt();
                return "\n\n<<<TIME'S UP! The world shimmers and distorts... everything is resetting...>>>\n\n" + OPENING;
            }
        }
        
        // Normal output with timer
        return text + `\n\n<<<[Time Remaining: ${String(timeInfo.minutes).padStart(2, '0')}:${String(timeInfo.seconds).padStart(2, '0')}]>>>\n\n`;
    }
    
    return text;
}
