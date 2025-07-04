function Calendar(hook, text) {
    'use strict';
    
    const debug = false; 
    
    // Usage in Scripting Sandbox:
    // Input Modifier: 
    //   text = Calendar("input", text);
    //
    // Context Modifier: 
    //   Calendar("context");
    //   Calendar();

    if (typeof hook === 'undefined' || hook === null) {
        hook = 'context';
    }

    // Configuration Cards:
    //   [CALENDAR] Time Configuration - Main time system settings
    //     Note: Leap Year Adjustments must be in a separate ## Leap Year Adjustments section
    //   [CALENDAR] Event Days - Holiday and event definitions
    //   [CALENDAR] Event Days 2, 3... - Additional event cards
    //
    // State Card displays:
    //   Today's Events: All events scheduled for today
    //   Active Events: Only events currently in their time window
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
    //   Calendar.getTodayEvents() - Returns array of today's events with time info
    //   Calendar.getActiveTimeRangeEvents() - Returns only currently active time-range events
    //   Calendar.getUpcomingEvents(days) - Returns events in next N days
    //   Calendar.getAllEvents() - Returns all configured events
    //   Calendar.isEventDay() - Returns true if today has events
    //   Calendar.getMonthWeekdays(offset) - Returns weekday map for a month
    //   Calendar.clearEventCache() - Force reload of event configuration
    //   Calendar.clearConfigCache() - Force reload of time configuration  
    //   Calendar.clearAllCaches() - Clear all cached data
    //
    // Core Methods:
    //   Calendar.getState() - Returns full time state
    //   Calendar.getConfig() - Returns configuration
    //   Calendar.events - Array of time events this turn
    //     Event types: 'dayChanged', 'seasonChanged', 'eventDay', 'timeReversed', 'timeOfDayChanged',
    //                  'timeRangeEventStarted', 'timeRangeEventEnding', 'timeRangeEventEnded'
    //
    // Time Manipulation Methods:
    //   Calendar.advanceTime(timeSpec) - Skip forward/backward in time (e.g., "3d", "-2h")
    //   Calendar.setTime(hour, minute) - Set time on current day
    //   Calendar.setDay(day) - Jump to specific day number
    //   Calendar.setActionsPerDay(number) - Update actions per day config
    //   Calendar.setHoursPerDay(number) - Update hours per day config
    //
    // Time System Notes:
    // - Day number in state can be any value (negative, 0, 200, etc.)
    // - Progress in state determines time of day (0 to actionsPerDay-1)
    // - All configuration must come from [CALENDAR] cards
    // - Leap Year Adjustments must be in a separate section from Leap Year settings
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

    const MODULE_NAME = 'Calendar';
    const CONFIG_CARD = '[CALENDAR] Time Configuration';
    const STATE_CARD = '[CALENDAR] Time State';
    const EVENT_CARD_PREFIX = '[CALENDAR] Event Days';
    
    // Module-level cache for events, config, and state (valid for this turn only)
    let eventCache = null;
    let configCache = null;
    let stateCache = null;
    
    // Configuration Management
    function loadConfiguration() {
        // Return cached config if available
        if (configCache !== null) {
            return configCache;
        }
        
        const configCard = Utilities.storyCard.get(CONFIG_CARD);
        if (!configCard) {
            if (debug) console.log(`[${MODULE_NAME}] No configuration found, creating default`);
            createDefaultConfiguration();
            
            // Also create default event days card if needed
            if (!Utilities.storyCard.exists(EVENT_CARD_PREFIX)) {
                createDefaultEventDays();
            }
            
            // Try to load again after creation
            const newConfigCard = Utilities.storyCard.get(CONFIG_CARD);
            if (!newConfigCard) {
                if (debug) console.log(`[${MODULE_NAME}] ERROR: Failed to create configuration card`);
                return null;
            }
            configCache = parseConfigurationCard(newConfigCard);
            return configCache;
        }
        
        configCache = parseConfigurationCard(configCard);
        return configCache;
    }
    
    function parseConfigurationCard(configCard) {
        // Ensure command documentation is present
        if (!configCard.description || !configCard.description.includes('TIME SYSTEM COMMANDS')) {
            Utilities.storyCard.update(CONFIG_CARD, {
                description: getCommandDocumentation()
            });
        }
        
        const configText = configCard.entry || configCard.value || '';
        if (!configText) {
            if (debug) console.log(`[${MODULE_NAME}] ERROR: Configuration card is empty. Time system requires configuration.`);
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
            if (debug) console.log(`[${MODULE_NAME}] ERROR: Missing required configuration fields`);
            return null;
        }
        
        const sections = Utilities.plainText.parseSections(configText);
        
        // Parse sections - Utilities.plainText.parseSections returns snake_case keys
        const daysSection = sections.days_of_week;
        const monthsSection = sections.months;
        const periodsSection = sections.time_periods;
        const seasonsSection = sections.seasons;
        const leapSection = sections.leap_year;
        const leapAdjustmentsSection = sections.leap_year_adjustments;
        
        // Time Periods - required
        config.timePeriods = parseTimePeriods(periodsSection);
        if (!config.timePeriods || Object.keys(config.timePeriods).length === 0) {
            if (debug) console.log(`[${MODULE_NAME}] ERROR: No time periods defined in configuration`);
            return null;
        }
        
        // Seasons - optional
        config.seasons = parseSeasons(seasonsSection);
        
        // Days of Week - required
        config.daysOfWeek = parseDaysOfWeek(daysSection);
        if (!config.daysOfWeek || config.daysOfWeek.length === 0) {
            if (debug) console.log(`[${MODULE_NAME}] ERROR: No days of week defined in configuration`);
            return null;
        }
        
        // Months - required
        const monthData = parseMonths(monthsSection);
        if (!monthData || monthData.names.length === 0) {
            if (debug) console.log(`[${MODULE_NAME}] ERROR: No months defined in configuration`);
            return null;
        }
        config.months = monthData.names;
        config.daysPerMonth = monthData.days;
        
        // Leap Year - optional but fully defined if present
        if (leapSection) {
            config.leapYear = parseLeapYear(leapSection, config.months);
            
            // Check for separate leap year adjustments section
            if (config.leapYear && leapAdjustmentsSection && Array.isArray(leapAdjustmentsSection)) {
                parseLeapYearAdjustments(config.leapYear, leapAdjustmentsSection, config.months);
            }
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
            if (debug) console.log(`[${MODULE_NAME}] Warning: Time periods data not in expected array format`);
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
            if (debug) console.log(`[${MODULE_NAME}] Warning: Seasons data not in expected array format`);
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
        if (debug) console.log(`[${MODULE_NAME}] Warning: Days data not in expected array format`);
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
            if (debug) console.log(`[${MODULE_NAME}] Warning: Months data not in expected array format`);
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
            
            // Backwards compatibility: Check for old "Month: name" format
            if (leapData.month) {
                const monthName = String(leapData.month);
                const monthIndex = monthNames.findIndex(m => 
                    m.toLowerCase() === monthName.toLowerCase()
                );
                
                if (monthIndex !== -1) {
                    // Default to +1 day for backwards compatibility
                    leap.adjustments[monthIndex] = 1;
                    if (debug) console.log(`[${MODULE_NAME}] Converting legacy leap year format to new format: ${monthName} +1`);
                } else {
                    if (debug) console.log(`[${MODULE_NAME}] WARNING: Unknown month in legacy leap year: ${monthName}`);
                }
            }
        } else {
            if (debug) console.log(`[${MODULE_NAME}] Warning: Leap year data not in expected object format`);
            return null;
        }
        
        // Validate leap year configuration if enabled
        if (leap.enabled && !leap.frequency) {
            if (debug) console.log(`[${MODULE_NAME}] WARNING: Leap year enabled but frequency not specified`);
            return null;
        }
        
        // Set defaults for optional fields
        if (leap.skipFrequency === undefined) leap.skipFrequency = 0;
        if (leap.skipExceptionFrequency === undefined) leap.skipExceptionFrequency = 0;
        if (leap.startYear === undefined) leap.startYear = 0;
        
        return leap;
    }
    
    function parseLeapYearAdjustments(leap, adjustmentsList, monthNames) {
        if (!leap || !adjustmentsList || !Array.isArray(adjustmentsList)) return;
        
        for (const adjustment of adjustmentsList) {
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
                        if (debug) console.log(`[${MODULE_NAME}] WARNING: Unknown month in leap adjustment: ${monthName}`);
                    }
                }
            }
        }
        
        // Must have at least one adjustment if enabled
        if (leap.enabled && Object.keys(leap.adjustments).length === 0) {
            if (debug) console.log(`[${MODULE_NAME}] WARNING: Leap year enabled but no adjustments defined`);
            // Disable leap year if no adjustments
            leap.enabled = false;
        }
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
            if (debug) console.log(`[${MODULE_NAME}] Error loading event days:`, error.message);
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

    function parseEventLine(line) {
        // Remove bullet points if present
        const cleaned = line.replace(/^[-•*]\s*/, '').trim();
        if (!cleaned) return null;
        
        // Extract time range if present (@ HH:MM-HH:MM)
        let timeRanges = null;
        let duration = 1;
        let baseEvent = cleaned;
        
        // Check for @ symbol indicating time ranges
        const timeRangeMatch = cleaned.match(/^(.+?)@\s*(.+)$/);
        if (timeRangeMatch) {
            baseEvent = timeRangeMatch[1].trim();
            const timeSpec = timeRangeMatch[2].trim();
            
            // Parse duration if present
            const durationMatch = baseEvent.match(/^(.+?)\s+lasting\s+(\d+)\s+days?$/i);
            if (durationMatch) {
                baseEvent = durationMatch[1].trim();
                duration = parseInt(durationMatch[2]);
            }
            
            // Parse time ranges
            timeRanges = parseTimeRanges(timeSpec);
        }
        
        // Check for daily format: "Event: daily"
        const dailyMatch = baseEvent.match(/^(.+?):\s*daily\s*$/i);
        if (dailyMatch) {
            const name = dailyMatch[1].trim();
            
            return {
                name: name,
                type: 'daily',
                duration: duration,
                timeRanges: timeRanges
            };
        }
        
        // Check for weekly recurring format: "Event: Monday" or "Event: Mondays"
        const weeklyMatch = baseEvent.match(/^(.+?):\s*(\w+?)s?\s*$/i);
        if (weeklyMatch) {
            const name = weeklyMatch[1].trim();
            const dayName = weeklyMatch[2];
            
            // Find weekday index
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
        
        // First check for nth weekday format: "Event: 4th Thursday of November"
        const nthWeekdayMatch = baseEvent.match(/^(.+?):\s*(1st|2nd|3rd|4th|5th|last)\s+(\w+)\s+of\s+(\w+)\s*(.*)$/i);
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
                if (debug) console.log(`[${MODULE_NAME}] Invalid month in event: ${name} (${monthName})`);
                return null;
            }
            
            // Find weekday index
            const weekdayIndex = config.daysOfWeek.findIndex(d => 
                d.toLowerCase() === weekday.toLowerCase()
            );
            if (weekdayIndex === -1) {
                if (debug) console.log(`[${MODULE_NAME}] Invalid weekday in event: ${name} (${weekday})`);
                return null;
            }
            
            // Convert nth string to number
            let nthNum;
            if (nth === 'last') {
                nthNum = -1;
            } else {
                nthNum = parseInt(nth.replace(/[^\d]/g, ''));
                if (isNaN(nthNum) || nthNum < 1 || nthNum > 5) {
                    if (debug) console.log(`[${MODULE_NAME}] Invalid nth value in event: ${name} (${nth})`);
                    return null;
                }
            }
            
            const event = {
                name: name,
                month: monthIndex,
                type: 'relative',
                nth: nthNum,
                weekday: weekdayIndex,
                duration: duration,
                timeRanges: timeRanges
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
        const match = baseEvent.match(/^(.+?):\s*(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\s*(.*)$/);
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
            if (debug) console.log(`[${MODULE_NAME}] Invalid month in event: ${name} (${match[2]})`);
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
            // Only log for truly invalid days, not leap days
            if (day !== 29 || month !== 1 || !config.leapYear || !config.leapYear.enabled) {
                if (debug) console.log(`[${MODULE_NAME}] Invalid day in event: ${name} (${match[3]} in ${config.months[month]})`);
            }
            return null;
        }
        
        const event = {
            name: name,
            month: month,
            day: day,
            type: 'annual', // default
            duration: duration,
            timeRanges: timeRanges
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
            
            if (event.type === 'daily') {
                // Daily events: name, type, and time ranges
                const timeRangeStr = event.timeRanges ? 
                    JSON.stringify(event.timeRanges) : 'allday';
                key = `${event.name}:daily:${timeRangeStr}`;
            } else if (event.type === 'weekly') {
                // Weekly events: name, weekday, type, and time ranges
                const timeRangeStr = event.timeRanges ? 
                    JSON.stringify(event.timeRanges) : 'allday';
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
            
            // Calculate what day of week this is
            const dayOfWeekIndex = getDayOfWeekForDate(month, day, year, config);
            
            for (const event of eventsList) {
                // Handle daily events - occur every single day
                if (event.type === 'daily') {
                    todayEvents.push(event);
                    continue;
                }
                
                // Handle weekly recurring events
                if (event.type === 'weekly') {
                    if (event.weekday === dayOfWeekIndex) {
                        todayEvents.push(event);
                    }
                    continue;
                }
                
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
            if (debug) console.log(`[${MODULE_NAME}] Error checking events:`, error.message);
        }
        
        return todayEvents;
    }
    
    function checkEventTimeRange(event, dayProgress, hoursPerDay) {
        if (!event.timeRanges) {
            // Legacy event - active all day
            return { active: true, allDay: true };
        }
        
        // Calculate current time from day progress
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
        
        // Check if event is upcoming today
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
        
        const description = getCommandDocumentation();
        
        const card = Utilities.storyCard.add({
            title: CONFIG_CARD,
            entry: configText,
            description: description
        });
        
        if (!card) {
            if (debug) console.log(`[${MODULE_NAME}] Failed to create configuration card`);
        }
    }
    
    function createDefaultEventDays() {
        const eventText = (
            `# Event Days Configuration` +
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
            `\n- Christmas: 12/25 @ 10:00-14:00` +
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
            if (debug) console.log(`[${MODULE_NAME}] Failed to create event days card`);
        }
    }
    
    function getCommandDocumentation() {
        return (
            `TIME SYSTEM COMMANDS` +
            `\n=====================================` +
            `\n/settime [hour]:[minute] [am/pm]` +
            `\n  Set the current time` +
            `\n  Examples: /settime 14:30, /settime 6:30pm, /settime 6pm` +
            `\n  Feedback: "⏰ Time set to 2:30 PM"` +
            `\n  Note: AM/PM based on Hours Per Day / 2` +
            `\n` +
            `\n/wait [number] [minutes/hours/days]` +
            `\n/skip [number] [minutes/hours/days]` +
            `\n/advance [number] [minutes/hours/days]` +
            `\n  Skip forward in time` +
            `\n  Examples: /skip 30 minutes, /wait 3 hours, /skip 2 days` +
            `\n  Short forms: /skip 30m, /wait 3h, /skip 2d` +
            `\n  Combined: /skip 1h30m, /wait 1.5h` +
            `\n  Feedback: "⏩ Skipped 3 hours to 5:30 PM, Tuesday, July 15, 2023"` +
            `\n` +
            `\n/rewind [number] [minutes/hours/days]` +
            `\n  Go back in time` +
            `\n  Examples: /rewind 2 hours, /rewind 1 day` +
            `\n  Short forms: /rewind 2h, /rewind 1d` +
            `\n  Feedback: "⏪ Rewound 2 hours to 11:30 AM, Monday, July 14, 2023"` +
            `\n` +
            `\n/time` +
            `\n/currenttime` +
            `\n  Display the current time and date` +
            `\n  Feedback: "📅 2:30 PM, Tuesday, July 15, 2023, Summer"`
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
    
    function formatEventsForState(day, config, progress = null) {
        const eventsList = loadEventDays();
        if (eventsList.length === 0) return '';
        
        const dateInfo = calculateDateInfo(day, config.startDate, config);
        const todayEvents = checkEventDay(dateInfo.month, dateInfo.day, dateInfo.year, eventsList, config);
        
        if (todayEvents.length === 0) return '';
        
        // If progress not provided, don't show active events
        if (progress === null) {
            const todayEventNames = todayEvents.map(e => e.name).join(', ');
            return `\nToday's Events: [${todayEventNames}]`;
        }
        
        const dayProgress = progress / config.actionsPerDay;
        
        // Separate today's events and active events
        const todayEventNames = todayEvents.map(e => e.name).join(', ');
        
        const activeEvents = todayEvents.filter(event => {
            const timeInfo = checkEventTimeRange(event, dayProgress, config.hoursPerDay);
            return timeInfo.active;
        });
        
        let result = `\nToday's Events: [${todayEventNames}]`;
        
        if (activeEvents.length > 0) {
            const activeEventNames = activeEvents.map(e => e.name).join(', ');
            result += `\nActive Events: [${activeEventNames}]`;
        }
        
        return result;
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
            return ` [Today: ${eventNames}]`;
        }
        
        return '';
    }
    
    function getActiveEventInfo(day, progress, config) {
        const eventsList = loadEventDays();
        if (eventsList.length === 0) return '';
        
        const dateInfo = calculateDateInfo(day, config.startDate, config);
        const todayEvents = checkEventDay(dateInfo.month, dateInfo.day, dateInfo.year, eventsList, config);
        
        if (todayEvents.length === 0) return '';
        
        const dayProgress = progress / config.actionsPerDay;
        const activeEvents = todayEvents.filter(event => {
            const timeInfo = checkEventTimeRange(event, dayProgress, config.hoursPerDay);
            return timeInfo.active;
        });
        
        if (activeEvents.length > 0) {
            const activeNames = activeEvents.map(e => e.name).join(', ');
            return ` [Active: ${activeNames}]`;
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
        // Return cached state if available
        if (stateCache !== null) {
            return stateCache;
        }
        
        const config = loadConfiguration();
        if (!config) {
            if (debug) console.log(`[${MODULE_NAME}] Cannot load state without configuration`);
            return null;
        }
        
        const stateCard = Utilities.storyCard.get(STATE_CARD);
        if (!stateCard) {
            if (debug) console.log(`[${MODULE_NAME}] No state found, creating initial state`);
            stateCache = createInitialState();
            return stateCache;
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
        
        stateCache = state;
        return state;
    }
    
    function createInitialState() {
        const config = loadConfiguration();
        if (!config) {
            if (debug) console.log(`[${MODULE_NAME}] Cannot create initial state without configuration`);
            return null;
        }
        
        // Check if a state card already exists with manual edits
        const existingCard = Utilities.storyCard.get(STATE_CARD);
        if (existingCard && existingCard.entry && existingCard.entry.includes('# Time State')) {
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
            if (debug) console.log(`[${MODULE_NAME}] Cannot save state without configuration`);
            return;
        }
        
        const dayProgress = state.progress / config.actionsPerDay;
        const timeInfo = calculateTimeOfDay(dayProgress, config.timePeriods, config.hoursPerDay);
        const timeStr = progressToTime(dayProgress, config.hoursPerDay);
        
        // Calculate date from day number
        const calculatedDate = calculateDate(state.day, config.startDate, config);
        
        // Use helper functions for season and event strings
        const seasonStr = formatSeasonForState(state.day, config);
        const eventStr = formatEventsForState(state.day, config, state.progress);
        
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
        
        // Clear state cache after saving
        stateCache = null;
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
                    if (debug) console.log(`[${MODULE_NAME}] WARNING: Leap adjustment would make ${config.months[monthIndex]} have ${days} days. Setting to 1.`);
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
            if (debug) console.log(`[${MODULE_NAME}] Cannot process actions without state and configuration`);
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
            if (debug) console.log(`[${MODULE_NAME}] Cannot parse commands without configuration`);
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
        
        const timeState = loadTimeState();
        const config = loadConfiguration();
        
        if (!timeState || !config) {
            if (debug) console.log(`[${MODULE_NAME}] Cannot process commands without state and configuration`);
            return;
        }
        
        let message = '';
        
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
                    day: timeState.day,
                    progress: newProgress,
                    lastProcessedAction: timeState.lastProcessedAction
                };
                
                saveTimeState(newState);
                
                // Get active events at new time
                const activeInfoSet = getActiveEventInfo(timeState.day, newProgress, config);
                
                // Format time for display
                let formattedTime = `${String(command.hour).padStart(2, '0')}:${String(command.minute).padStart(2, '0')}`;
                if (config.hoursPerDay % 2 === 0) {
                    const halfDay = config.hoursPerDay / 2;
                    let displayHour = command.hour;
                    const isPM = displayHour >= halfDay;
                    if (isPM && displayHour > halfDay) displayHour -= halfDay;
                    if (displayHour === 0) displayHour = halfDay;
                    formattedTime = `${displayHour}:${String(command.minute).padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
                }
                
                message = `⏰ Time set to ${formattedTime}${activeInfoSet}`;
                
                if (debug) console.log(`[${MODULE_NAME}] Set time to ${String(command.hour).padStart(2, '0')}:${String(command.minute).padStart(2, '0')}, Day ${timeState.day}${activeInfoSet}`);
                break;
                
            case 'skipTime':
                // Add time to current
                const hoursToAdd = command.hours;
                const progressToAdd = hoursToAdd / config.hoursPerDay;
                const actionsToAdd = Math.round(progressToAdd * config.actionsPerDay);
                
                let skipProgress = timeState.progress + actionsToAdd;
                let skipDay = timeState.day;
                
                // Handle day overflow
                while (skipProgress >= config.actionsPerDay) {
                    skipProgress -= config.actionsPerDay;
                    skipDay++;
                }
                
                const skipState = {
                    day: skipDay,
                    progress: skipProgress,
                    lastProcessedAction: timeState.lastProcessedAction
                };
                
                saveTimeState(skipState);
                
                // Get the new time
                const skipDayProgress = skipProgress / config.actionsPerDay;
                const skipTimeStr = progressToTime(skipDayProgress, config.hoursPerDay);
                let skipDisplayTime = skipTimeStr;
                
                // Format time with AM/PM if applicable
                if (config.hoursPerDay % 2 === 0) {
                    const [hourStr, minuteStr] = skipTimeStr.split(':');
                    let hour = parseInt(hourStr);
                    const halfDay = config.hoursPerDay / 2;
                    const isPM = hour >= halfDay;
                    if (isPM && hour > halfDay) hour -= halfDay;
                    if (hour === 0) hour = halfDay;
                    skipDisplayTime = `${hour}:${minuteStr} ${isPM ? 'PM' : 'AM'}`;
                }
                
                // Check if we changed seasons and get event info
                const seasonChangeInfo = getSeasonChangeInfo(timeState.day, skipDay, config);
                const eventInfoSkip = skipDay !== timeState.day ? getCurrentEventInfo(skipDay, config) : '';
                const activeInfoSkip = getActiveEventInfo(skipDay, skipProgress, config);
                
                // Format the skip duration
                let skipDuration = '';
                if (hoursToAdd >= config.hoursPerDay) {
                    const days = Math.floor(hoursToAdd / config.hoursPerDay);
                    const hours = hoursToAdd % config.hoursPerDay;
                    skipDuration = days > 0 ? `${days} day${days > 1 ? 's' : ''}` : '';
                    if (hours >= 1) {
                        skipDuration += `${skipDuration ? ' and ' : ''}${hours} hour${hours !== 1 ? 's' : ''}`;
                    } else if (hours > 0) {
                        const minutes = Math.round(hours * 60);
                        skipDuration += `${skipDuration ? ' and ' : ''}${minutes} minute${minutes !== 1 ? 's' : ''}`;
                    }
                } else if (hoursToAdd >= 1) {
                    skipDuration = `${hoursToAdd} hour${hoursToAdd !== 1 ? 's' : ''}`;
                } else {
                    const minutes = Math.round(hoursToAdd * 60);
                    skipDuration = `${minutes} minute${minutes !== 1 ? 's' : ''}`;
                }
                
                message = `⏩ Skipped ${skipDuration} to ${skipDisplayTime}, ${calculateDate(skipDay, config.startDate, config)}${seasonChangeInfo}${eventInfoSkip}${activeInfoSkip}`;
                
                if (debug) console.log(`[${MODULE_NAME}] Skipped ${command.hours} hours to ${skipDisplayTime}, Day ${skipDay}${seasonChangeInfo}${eventInfoSkip}${activeInfoSkip}`);
                break;
                
            case 'rewindTime':
                // Subtract time from current
                const hoursToSubtract = command.hours;
                const progressToSubtract = hoursToSubtract / config.hoursPerDay;
                const actionsToSubtract = Math.round(progressToSubtract * config.actionsPerDay);
                
                let rewindProgress = timeState.progress - actionsToSubtract;
                let rewindDay = timeState.day;
                
                // Handle day underflow
                while (rewindProgress < 0) {
                    rewindProgress += config.actionsPerDay;
                    rewindDay--;
                }
                
                const rewindState = {
                    day: rewindDay,
                    progress: rewindProgress,
                    lastProcessedAction: timeState.lastProcessedAction
                };
                
                saveTimeState(rewindState);
                
                // Get the new time
                const rewindDayProgress = rewindProgress / config.actionsPerDay;
                const rewindTimeStr = progressToTime(rewindDayProgress, config.hoursPerDay);
                let rewindDisplayTime = rewindTimeStr;
                
                // Format time with AM/PM if applicable
                if (config.hoursPerDay % 2 === 0) {
                    const [hourStr, minuteStr] = rewindTimeStr.split(':');
                    let hour = parseInt(hourStr);
                    const halfDay = config.hoursPerDay / 2;
                    const isPM = hour >= halfDay;
                    if (isPM && hour > halfDay) hour -= halfDay;
                    if (hour === 0) hour = halfDay;
                    rewindDisplayTime = `${hour}:${minuteStr} ${isPM ? 'PM' : 'AM'}`;
                }
                
                // Check if we changed seasons and get event info
                const rewindSeasonInfo = getSeasonChangeInfo(timeState.day, rewindDay, config);
                const rewindEventInfo = rewindDay !== timeState.day ? getCurrentEventInfo(rewindDay, config) : '';
                const activeInfoRewind = getActiveEventInfo(rewindDay, rewindProgress, config);
                
                // Format the rewind duration
                let rewindDuration = '';
                if (hoursToSubtract >= config.hoursPerDay) {
                    const days = Math.floor(hoursToSubtract / config.hoursPerDay);
                    const hours = hoursToSubtract % config.hoursPerDay;
                    rewindDuration = days > 0 ? `${days} day${days > 1 ? 's' : ''}` : '';
                    if (hours >= 1) {
                        rewindDuration += `${rewindDuration ? ' and ' : ''}${hours} hour${hours !== 1 ? 's' : ''}`;
                    } else if (hours > 0) {
                        const minutes = Math.round(hours * 60);
                        rewindDuration += `${rewindDuration ? ' and ' : ''}${minutes} minute${minutes !== 1 ? 's' : ''}`;
                    }
                } else if (hoursToSubtract >= 1) {
                    rewindDuration = `${hoursToSubtract} hour${hoursToSubtract !== 1 ? 's' : ''}`;
                } else {
                    const minutes = Math.round(hoursToSubtract * 60);
                    rewindDuration = `${minutes} minute${minutes !== 1 ? 's' : ''}`;
                }
                
                message = `⏪ Rewound ${rewindDuration} to ${rewindDisplayTime}, ${calculateDate(rewindDay, config.startDate, config)}${rewindSeasonInfo}${rewindEventInfo}${activeInfoRewind}`;
                
                if (debug) console.log(`[${MODULE_NAME}] Rewound ${command.hours} hours to ${rewindDisplayTime}, Day ${rewindDay}${rewindSeasonInfo}${rewindEventInfo}${activeInfoRewind}`);
                break;
                
            case 'queryTime':
                // Calculate current time from progress
                const dayProgress = timeState.progress / config.actionsPerDay;
                const currentTime = progressToTime(dayProgress, config.hoursPerDay);
                const currentDate = calculateDate(timeState.day, config.startDate, config);
                
                // Get formatted time
                let displayTime = currentTime;
                if (config.hoursPerDay % 2 === 0) {
                    const [hourStr, minuteStr] = currentTime.split(':');
                    let hour = parseInt(hourStr);
                    const halfDay = config.hoursPerDay / 2;
                    const isPM = hour >= halfDay;
                    if (isPM && hour > halfDay) hour -= halfDay;
                    if (hour === 0) hour = halfDay;
                    displayTime = `${hour}:${minuteStr} ${isPM ? 'PM' : 'AM'}`;
                }
                
                // Get season and event info
                const seasonInfo = getCurrentSeasonInfo(timeState.day, config);
                const eventInfoQuery = getCurrentEventInfo(timeState.day, config);
                const activeEventInfo = getActiveEventInfo(timeState.day, timeState.progress, config);
                
                message = `📅 ${displayTime}, ${currentDate}${seasonInfo}${eventInfoQuery}${activeEventInfo}`;
                
                if (debug) console.log(`[${MODULE_NAME}] Current: ${currentTime}, ${currentDate}${seasonInfo}, Day ${timeState.day}${eventInfoQuery}${activeEventInfo}`);
                break;
        }
        
        return message;
    }
    
    // INPUT HOOK: Process commands and provide feedback
    if (hook === 'input') {
        if (debug) console.log(`[${MODULE_NAME}] Input hook called with text:`, text);
        
        const command = parseTimeCommand(text);
        
        if (command) {
            if (debug) console.log(`[${MODULE_NAME}] Command detected:`, command);
            
            const message = processTimeCommand(command);
            
            if (debug) console.log(`[${MODULE_NAME}] Command processed, message:`, message);
            
            // Set message in global state if available
            if (message && typeof state !== 'undefined' && state && typeof state === 'object') {
                state.message = message;
                if (debug) console.log(`[${MODULE_NAME}] Successfully set state.message`);
            }
            
            // Return zero-width space to delete the command
            if (debug) console.log(`[${MODULE_NAME}] Returning zero-width space to delete command`);
            return '\u200B';
        }
        
        if (debug) console.log(`[${MODULE_NAME}] No command found, returning original text`);
        return text;
    }
    
    // CONTEXT HOOK: Process time progression
    if (hook === 'context') {
        const config = loadConfiguration();
        if (!config) {
            if (debug) console.log(`[${MODULE_NAME}] Time system requires configuration to function`);
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
                
                // Check time-range events if time actually progressed
                const prevProgress = previousState ? previousState.progress : 0;
                const currProgress = actionResult.state.progress;
                
                if (currProgress !== prevProgress) {
                    const eventsList = loadEventDays();
                    const dateInfo = calculateDateInfo(actionResult.state.day, config.startDate, config);
                    const todayEvents = checkEventDay(dateInfo.month, dateInfo.day, dateInfo.year, eventsList, config);
                    
                    // Calculate progress for both states
                    const prevDayProgress = prevProgress / config.actionsPerDay;
                    const currDayProgress = currProgress / config.actionsPerDay;
                    
                    for (const event of todayEvents) {
                        if (!event.timeRanges) continue; // Skip all-day events
                        
                        const prevTime = checkEventTimeRange(event, prevDayProgress, config.hoursPerDay);
                        const currTime = checkEventTimeRange(event, currDayProgress, config.hoursPerDay);
                        
                        // Event just started
                        if (!prevTime.active && currTime.active) {
                            eventDispatcher.dispatch('timeRangeEventStarted', {
                                event: event,
                                timeRange: currTime.currentRange,
                                state: actionResult.state
                            });
                        }
                        
                        // Event ending soon (crossed 5-minute threshold)
                        if (currTime.active && currTime.minutesRemaining <= 5 && 
                            prevTime.active && prevTime.minutesRemaining > 5) {
                            eventDispatcher.dispatch('timeRangeEventEnding', {
                                event: event,
                                minutesRemaining: currTime.minutesRemaining,
                                state: actionResult.state
                            });
                        }
                        
                        // Event just ended
                        if (prevTime.active && !currTime.active) {
                            eventDispatcher.dispatch('timeRangeEventEnded', {
                                event: event,
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
            const dayEvents = checkEventDay(dateInfo.month, dateInfo.day, dateInfo.year, eventsList, config);
            
            // Add time range info to each event
            const dayProgress = state.progress / config.actionsPerDay;
            return dayEvents.map(event => {
                const timeInfo = checkEventTimeRange(event, dayProgress, config.hoursPerDay);
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
        
        Calendar.clearConfigCache = () => {
            configCache = null;
            return true;
        };
        
        Calendar.clearAllCaches = () => {
            eventCache = null;
            configCache = null;
            stateCache = null;
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
            
            // Clear config cache after update
            configCache = null;
            
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
            
            // Clear config cache after update
            configCache = null;
            
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
