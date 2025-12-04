function Calendar(hook, text) {
    // time system bc idek what day it is every day i wake up
    'use strict';
    const debug = true;
    const MODULE_NAME = 'Calendar';
    
    // =====================================
    // CALENDAR MODULE
    // =====================================
    //
    // USAGE:
    //   Context Modifier: text = Calendar("context", text);
    //   Input Modifier: text = Calendar("input", text);
    //   API Only: Calendar();
    //
    // INPUT COMMANDS:
    //   /advancetime("3h")         - Advance time by 3 hours
    //   /advancetime("2d, 3h")     - Advance time by 2 days and 3 hours
    //   /settime(14, 30)           - Set time to 2:30 PM
    //   /settime(9)                - Set time to 9:00 AM
    //   /setday(100)               - Jump to day 100
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
    //     - Card modifications:
    //       titles: {"Card Title 1", "Card Title 2"}
    //       keys: {"Card Title 1": "key1, key2", "Card Title 2": override "key3"}
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
    // CARD MODIFICATION METHODS:
    //   getModifiedCardsState() Returns current modified cards state
    //   clearModifiedCards()    Revert all modified cards to original
    //   applyEventCards(name)   Manually apply event's card modifications
    //   revertEventCards(name)  Manually revert event's card modifications
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
    // Card Modifications:
    //   // In [CALENDAR] Event Days card:
    //   // Market Day: Wednesday @ 8:00-14:00
    //   // titles: {"Town Square", "Merchant"}
    //   // keys: {"Town Square": "busy, crowded", "Merchant": override "available"}
    //
    //   // The Town Square card's keys will be temporarily changed during market hours
    //   // The Merchant card's keys will be permanently set to "available"
    //
    //   // Manual control:
    //   Calendar.applyEventCards("Market Day");   // Apply modifications
    //   Calendar.revertEventCards("Market Day");  // Revert (except overrides)
    //   Calendar.clearModifiedCards();            // Revert all modifications
    //
    // =====================================
    
    // Configuration Card Names
    const CONFIG_CARD = '[CALENDAR] Time Configuration';
    const STATE_CARD = '[CALENDAR] Time State';
    const EVENT_CARD_PREFIX = '[CALENDAR] Event Days';
    const MODIFIED_CARDS_STATE = '[CALENDAR] Modified Cards State';
    const DEFAULT_INJECTION_CARD = '[CALENDAR] Default Injection';

    // Module-level cache (valid for this turn only)
    let eventCache = null;
    let configCache = null;
    let timeDataCache = null;
    let modifiedCardsCache = null;
    
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
            } else if (line.includes('Enable Default Injection:')) {
                const value = line.split(':')[1].trim().toLowerCase();
                config.enableDefaultInjection = (value === 'true' || value === 'yes' || value === '1');
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
            modifiedCardsCache = null;
            return true;
        };

        // Refresh events from all sources (including story cards)
        Calendar.refreshEvents = () => {
            eventCache = null;
            const events = loadEventDays();
            if (debug) {
                console.log(`${MODULE_NAME}: Events refreshed - found ${events.length} total events`);
            }
            return events;
        };

        // Card Modification Methods
        Calendar.getModifiedCardsState = () => loadModifiedCardsState();

        Calendar.clearModifiedCards = () => {
            clearAllModifiedCards();
            return true;
        };

        Calendar.applyEventCards = (eventName) => {
            const events = Calendar.getAllEvents();
            const event = events.find(e => e.name === eventName);
            if (event) {
                applyEventCardModifications(event);
                return true;
            }
            return false;
        };

        Calendar.revertEventCards = (eventName) => {
            const events = Calendar.getAllEvents();
            const event = events.find(e => e.name === eventName);
            if (event) {
                revertEventCardModifications(event);
                return true;
            }
            return false;
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

            // Load events from dedicated event cards
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
            if (debug) {
                console.log(`${MODULE_NAME}: Loaded ${uniqueEvents.length} unique events from ${cardNumber - 1} card(s)`);
            }
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

        for (let i = 0; i < lines.length; i++) {
            const trimmed = lines[i].trim();
            if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) continue;
            if (trimmed.startsWith('##')) continue;

            const event = parseEventLine(trimmed);
            if (event) {
                // Check for titles and keys on following lines
                let titlesFound = false;
                let keysFound = false;

                for (let j = i + 1; j < lines.length; j++) {
                    const nextLine = lines[j].trim();

                    // Stop if we hit another event or section
                    if (nextLine && !nextLine.startsWith('titles:') && !nextLine.startsWith('keys:') &&
                        !nextLine.startsWith('//')) {
                        // Check if it's another event line
                        const possibleEvent = parseEventLine(nextLine);
                        if (possibleEvent) break;
                    }

                    if (nextLine.startsWith('titles:')) {
                        const titlesStr = nextLine.substring(7).trim();
                        event.cardTitles = parseTitlesArray(titlesStr);
                        titlesFound = true;
                    } else if (nextLine.startsWith('keys:')) {
                        const keysStr = nextLine.substring(5).trim();
                        event.cardKeys = parseKeysObject(keysStr);
                        keysFound = true;
                    }

                    // If we found both, we can stop looking
                    if (titlesFound && keysFound) break;
                }

                eventsList.push(event);
            }
        }

        return eventsList;
    }

    function parseTitlesArray(titlesStr) {
        // Parse format: {"Title 1", "Title 2", "Title 3"}
        try {
            // Remove curly braces and split by comma
            const cleaned = titlesStr.replace(/^\{|\}$/g, '').trim();
            if (!cleaned) return [];

            // Split by comma and clean up quotes
            const titles = cleaned.split(',').map(t => {
                return t.trim().replace(/^["']|["']$/g, '');
            }).filter(t => t.length > 0);

            return titles;
        } catch (e) {
            if (debug) console.log(`${MODULE_NAME}: Error parsing titles: ${e.message}`);
            return [];
        }
    }

    function parseKeysObject(keysStr) {
        // Parse format: {"Title": "key1, key2", "Title2": override "key3, key4"}
        try {
            const keysObj = {};

            // Remove outer curly braces
            const cleaned = keysStr.replace(/^\{|\}$/g, '').trim();
            if (!cleaned) return keysObj;

            // Match pattern: "Title": "keys" or "Title": override "keys"
            const regex = /["']([^"']+)["']\s*:\s*(override\s+)?["']([^"']+)["']/g;
            let match;

            while ((match = regex.exec(cleaned)) !== null) {
                const title = match[1];
                const isOverride = !!match[2];
                const keys = match[3];

                keysObj[title] = {
                    keys: keys,
                    override: isOverride
                };
            }

            return keysObj;
        } catch (e) {
            if (debug) console.log(`${MODULE_NAME}: Error parsing keys: ${e.message}`);
            return {};
        }
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

            if (debug) {
                const monthName = config.months[month];
                console.log(`${MODULE_NAME}: Checking events for ${monthName} ${day}, ${year} (${config.daysOfWeek[dayOfWeekIndex]})`);
            }
            
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

        if (debug && todayEvents.length > 0) {
            console.log(`${MODULE_NAME}: Found ${todayEvents.length} event(s) for today:`, todayEvents.map(e => e.name).join(', '));
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
    // Card Modification System
    // ==========================

    function loadModifiedCardsState() {
        if (modifiedCardsCache !== null) return modifiedCardsCache;

        const stateCard = Utilities.storyCard.get(MODIFIED_CARDS_STATE);
        if (!stateCard) {
            modifiedCardsCache = {};
            return modifiedCardsCache;
        }

        try {
            // Parse the JSON from the card entry
            const state = JSON.parse(stateCard.entry);
            modifiedCardsCache = state;
            return state;
        } catch (e) {
            if (debug) console.log(`${MODULE_NAME}: Error loading modified cards state: ${e.message}`);
            modifiedCardsCache = {};
            return {};
        }
    }

    function saveModifiedCardsState(state) {
        const stateJson = JSON.stringify(state, null, 2);

        Utilities.storyCard.upsert({
            title: MODIFIED_CARDS_STATE,
            entry: stateJson,
            description: `Tracks original card keys for active Calendar events. Do not modify manually.`
        });

        modifiedCardsCache = state;
    }

    function generateDefaultKeys() {
        // Default keys: a-z plus common punctuation
        return 'a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u,v,w,x,y,z,!,?,.';
    }

    function applyEventCardModifications(event) {
        if (!event.cardTitles || event.cardTitles.length === 0) {
            if (debug) console.log(`${MODULE_NAME}: No card titles defined for event "${event.name}"`);
            return;
        }

        if (debug) {
            console.log(`${MODULE_NAME}: Applying card modifications for event "${event.name}" (${event.cardTitles.length} card(s))`);
        }

        const modifiedState = loadModifiedCardsState();
        const eventKey = `${event.name}_${event.type}`;

        if (!modifiedState[eventKey]) {
            modifiedState[eventKey] = {
                originalKeys: {},
                modifiedTitles: []
            };
        }

        for (const title of event.cardTitles) {
            const card = Utilities.storyCard.get(title);
            if (!card) {
                if (debug) console.log(`${MODULE_NAME}: Card "${title}" not found for event "${event.name}"`);
                continue;
            }

            // Check if we need to apply keys
            let newKeys = null;
            let isOverride = false;

            if (event.cardKeys && event.cardKeys[title]) {
                newKeys = event.cardKeys[title].keys;
                isOverride = event.cardKeys[title].override;
            } else {
                // Use default alphanumeric keys for titles not specified
                newKeys = generateDefaultKeys();
                if (debug) console.log(`${MODULE_NAME}: Using default keys for "${title}"`);
            }

            // Save original keys only if not override and not already saved
            if (!isOverride && !modifiedState[eventKey].originalKeys[title]) {
                modifiedState[eventKey].originalKeys[title] = card.keys || '';
                if (debug) console.log(`${MODULE_NAME}: Saved original keys for "${title}": "${card.keys || '(empty)'}"`);
            }

            // Apply new keys
            Utilities.storyCard.update(title, { keys: newKeys });

            // Track this title was modified
            if (!modifiedState[eventKey].modifiedTitles.includes(title)) {
                modifiedState[eventKey].modifiedTitles.push(title);
            }

            if (debug) {
                console.log(`${MODULE_NAME}: Applied keys to "${title}" for event "${event.name}"${isOverride ? ' (permanent)' : ''}: "${newKeys}"`);
            }
        }

        saveModifiedCardsState(modifiedState);
    }

    function revertEventCardModifications(event) {
        if (!event.cardTitles || event.cardTitles.length === 0) return;

        const modifiedState = loadModifiedCardsState();
        const eventKey = `${event.name}_${event.type}`;

        if (!modifiedState[eventKey]) {
            if (debug) console.log(`${MODULE_NAME}: No modifications to revert for event "${event.name}"`);
            return;
        }

        const eventState = modifiedState[eventKey];

        for (const title of eventState.modifiedTitles) {
            // Skip if this was an override (permanent change)
            if (event.cardKeys && event.cardKeys[title] && event.cardKeys[title].override) {
                if (debug) console.log(`${MODULE_NAME}: Skipping revert for "${title}" (permanent override)`);
                continue;
            }

            // Restore original keys if we have them
            if (eventState.originalKeys[title] !== undefined) {
                const card = Utilities.storyCard.get(title);
                if (card) {
                    Utilities.storyCard.update(title, { keys: eventState.originalKeys[title] });
                    if (debug) {
                        console.log(`${MODULE_NAME}: Restored original keys for "${title}"`);
                    }
                }
            }
        }

        // Clean up the event from state
        delete modifiedState[eventKey];
        saveModifiedCardsState(modifiedState);
    }

    function clearAllModifiedCards() {
        const modifiedState = loadModifiedCardsState();

        // Revert all active modifications
        for (const [eventKey, eventState] of Object.entries(modifiedState)) {
            for (const [title, originalKeys] of Object.entries(eventState.originalKeys)) {
                const card = Utilities.storyCard.get(title);
                if (card) {
                    Utilities.storyCard.update(title, { keys: originalKeys });
                }
            }
        }

        // Clear the state
        saveModifiedCardsState({});
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
            `\nEnable Default Injection: true` +
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
            `// Format: Event Name: MM/DD [modifiers]` +
            `\n// Format: Event Name: Nth Weekday of Month` +
            `\n// Format: Event Name: Weekday (for weekly)` +
            `\n// Format: Event Name: daily (for every day)` +
            `\n// Add @ HH:MM-HH:MM for time ranges` +
            `\n// Add "lasting N days" for multi-day events` +
            `\n//` +
            `\n// Card Modifications:` +
            `\n// titles: {"Card Title 1", "Card Title 2"}` +
            `\n// keys: {"Card Title 1": "key1, key2", "Card Title 2": override "permanent keys"}` +
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
            `\n- Market Day: Wednesday @ 8:00-14:00` +
            `\ntitles: {"Town Square", "Merchant", "Guard Post"}` +
            `\nkeys: {"Town Square": "bustling, crowded, merchants", "Merchant": override "available, eager"}` +
            `\n// Town Square and Guard Post keys revert after market closes` +
            `\n// Merchant keys are permanently changed` +
            `\n- Happy Hour: Friday @ 17:00-19:00` +
            `\ntitles: {"Tavern"}` +
            `\n// Tavern gets default alphabetic keys during happy hour` +

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

    // Keys that trigger card injection (all letters + common punctuation)
    const INJECTION_KEYS_ENABLED = '.,a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u,v,w,x,y,z,"';
    const INJECTION_KEYS_DISABLED = '';

    function createDefaultInjectionCard(enabled = true) {
        const injectionText = `[**Current Time** get(Calendar.getFormattedTime) (get(Calendar.getTimeOfDay)) | get(Calendar.getCurrentDate)]`;

        const description = (
            `// This card is injected into context when "Enable Default Injection: true" is set in Time Configuration.\n` +
            `// Available methods:\n` +
            `//   get(Calendar.getCurrentTime)     - "14:30"\n` +
            `//   get(Calendar.getFormattedTime)   - "2:30 PM"\n` +
            `//   get(Calendar.getTimeOfDay)       - "Afternoon"\n` +
            `//   get(Calendar.getCurrentDate)     - "Tuesday, July 15, 2023"\n` +
            `//   get(Calendar.getCurrentSeason)   - "Summer"\n` +
            `//   get(Calendar.getDayOfWeek)       - "Tuesday"\n` +
            `//   get(Calendar.getMonth)           - "July"\n` +
            `//   get(Calendar.getYear)            - "2023"\n` +
            `//   get(Calendar.getDayNumber)       - "42"`
        );

        const card = Utilities.storyCard.add({
            title: DEFAULT_INJECTION_CARD,
            entry: injectionText,
            description: description,
            keys: enabled ? INJECTION_KEYS_ENABLED : INJECTION_KEYS_DISABLED
        });

        if (debug) {
            if (card) {
                console.log(`${MODULE_NAME}: Created default injection card (enabled: ${enabled})`);
            } else {
                console.log(`${MODULE_NAME}: Failed to create default injection card`);
            }
        }

        return card;
    }

    function updateInjectionCardKeys(enabled) {
        const card = Utilities.storyCard.get(DEFAULT_INJECTION_CARD);
        if (!card) return;

        const newKeys = enabled ? INJECTION_KEYS_ENABLED : INJECTION_KEYS_DISABLED;

        // Only update if keys changed
        if (card.keys !== newKeys) {
            Utilities.storyCard.upsert({
                title: DEFAULT_INJECTION_CARD,
                keys: newKeys
            });
            if (debug) console.log(`${MODULE_NAME}: Updated injection card keys (enabled: ${enabled})`);
        }
    }

    function resolveCalendarGetters(text) {
        const pattern = /get\(Calendar\.(\w+)\)/g;

        if (debug) {
            console.log(`${MODULE_NAME}: resolveCalendarGetters called with: ${text.substring(0, 100)}...`);
            console.log(`${MODULE_NAME}: Calendar.getFormattedTime exists: ${typeof Calendar.getFormattedTime}`);
        }

        return text.replace(pattern, (match, methodName) => {
            if (debug) console.log(`${MODULE_NAME}: Trying to resolve: ${methodName}, type: ${typeof Calendar[methodName]}`);
            // Check if the method exists on Calendar
            if (typeof Calendar[methodName] === 'function') {
                try {
                    const result = Calendar[methodName]();
                    // Handle null/undefined gracefully
                    if (result === null || result === undefined) {
                        return '';
                    }
                    // Handle arrays (like getTodayEvents)
                    if (Array.isArray(result)) {
                        if (result.length === 0) return '';
                        // For events, extract names
                        if (result[0] && result[0].name) {
                            return result.map(e => e.name).join(', ');
                        }
                        return result.join(', ');
                    }
                    return String(result);
                } catch (e) {
                    if (debug) console.log(`${MODULE_NAME}: Error calling Calendar.${methodName}: ${e.message}`);
                    return '';
                }
            }
            // Method doesn't exist, leave unchanged
            if (debug) console.log(`${MODULE_NAME}: Unknown Calendar method: ${methodName}`);
            return match;
        });
    }

    function processDefaultInjection(contextText) {
        const config = loadConfiguration();
        const enabled = config && config.enableDefaultInjection;

        // Get or create the injection card
        let injectionCard = Utilities.storyCard.get(DEFAULT_INJECTION_CARD);
        if (!injectionCard) {
            createDefaultInjectionCard(enabled);
            injectionCard = Utilities.storyCard.get(DEFAULT_INJECTION_CARD);
        } else {
            // Update keys based on current enabled state
            updateInjectionCardKeys(enabled);
        }

        // If disabled, just return context as-is (card won't be injected due to empty keys)
        if (!enabled) {
            return contextText;
        }

        if (!injectionCard || !injectionCard.entry) {
            if (debug) console.log(`${MODULE_NAME}: No injection content available`);
            return contextText;
        }

        const cardContent = injectionCard.entry;

        // Find the card content in context (AI Dungeon auto-injects it)
        let contentIndex = contextText.indexOf(cardContent);
        let contentToRemove = cardContent;

        if (contentIndex === -1) {
            // Exact match not found - try to find by first/last line
            const contentLines = cardContent.split('\n');
            const firstLine = contentLines[0];
            const lastLine = contentLines[contentLines.length - 1];

            contentIndex = contextText.indexOf(firstLine);

            if (contentIndex === -1) {
                if (debug) console.log(`${MODULE_NAME}: Injection card not found in context`);
                return contextText;
            }

            // Find where the content ends
            const endIndex = contextText.indexOf(lastLine, contentIndex);
            if (endIndex === -1) {
                if (debug) console.log(`${MODULE_NAME}: Injection card end not found`);
                return contextText;
            }

            contentToRemove = contextText.substring(contentIndex, endIndex + lastLine.length);
        }

        // Remove the card content from its current position
        let modifiedContext = contextText.substring(0, contentIndex) +
                             contextText.substring(contentIndex + contentToRemove.length);
        // Clean up excessive newlines only where content was removed
        modifiedContext = modifiedContext.replace(/\n{4,}/g, '\n\n\n');

        // Resolve Calendar getters in the template
        const resolvedContent = resolveCalendarGetters(cardContent);

        if (debug) console.log(`${MODULE_NAME}: Resolved content: ${resolvedContent}`);

        if (!resolvedContent || resolvedContent.trim() === '') {
            return modifiedContext;
        }

        // Find insertion point by counting sentences from end (non-destructive)
        // Match sentence endings and track their positions
        const sentenceEndPattern = /[.!?]\s+/g;
        const sentenceEndings = [];
        let match;
        while ((match = sentenceEndPattern.exec(modifiedContext)) !== null) {
            sentenceEndings.push(match.index + match[0].length);
        }

        const sentencesFromEnd = 6;

        if (sentenceEndings.length <= sentencesFromEnd) {
            if (debug) console.log(`${MODULE_NAME}: Not enough sentences (${sentenceEndings.length}), putting injection at start`);
            return resolvedContent + '\n\n' + modifiedContext;
        }

        // Find the character position to insert at (after the Nth sentence from end)
        const insertPosition = sentenceEndings[sentenceEndings.length - sentencesFromEnd];

        // Insert resolved content at position, preserving all original whitespace
        const beforeText = modifiedContext.substring(0, insertPosition);
        const afterText = modifiedContext.substring(insertPosition);

        const result = beforeText + '\n\n' + resolvedContent + '\n\n' + afterText;

        if (debug) console.log(`${MODULE_NAME}: Positioned injection 6 sentences from end`);
        return result;
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

            if (debug) {
                const eventName = data.event ? data.event.name : '';
                console.log(`${MODULE_NAME}: Event dispatched: ${eventType}${eventName ? ` for "${eventName}"` : ''}`);
            }

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
                                if (debug) {
                                    console.log(`${MODULE_NAME}: Time range started for "${event.name}" @ ${currTime.currentRange.start.hour}:${String(currTime.currentRange.start.minute).padStart(2, '0')}-${currTime.currentRange.end.hour}:${String(currTime.currentRange.end.minute).padStart(2, '0')}`);
                                }

                                // Check story cards before applying modifications
                                if (event.cardTitles && event.cardTitles.length > 0) {
                                    if (debug) {
                                        console.log(`${MODULE_NAME}: Time-range event "${event.name}" declares cards: ${event.cardTitles.join(', ')}`);
                                    }

                                    // Check existence
                                    for (const cardTitle of event.cardTitles) {
                                        if (Utilities && Utilities.storyCard) {
                                            const card = Utilities.storyCard.get(cardTitle);
                                            if (card) {
                                                if (debug) {
                                                    console.log(`${MODULE_NAME}: Story card "${cardTitle}" exists and will be activated`);
                                                }
                                            } else {
                                                if (debug) {
                                                    console.log(`${MODULE_NAME}: WARNING: Story card "${cardTitle}" not found`);
                                                }
                                            }
                                        }
                                    }
                                }

                                // Apply card modifications when time range starts
                                applyEventCardModifications(event);
                                eventDispatcher.dispatch('timeRangeEventStarted', {
                                    event: event,
                                    timeRange: currTime.currentRange,
                                    timeData: actionResult.timeData
                                });
                            }

                            if (currTime.active && currTime.minutesRemaining <= 5 &&
                                prevTime.active && prevTime.minutesRemaining > 5) {
                                if (debug) {
                                    console.log(`${MODULE_NAME}: Time range ending soon for "${event.name}" (${currTime.minutesRemaining} minutes remaining)`);
                                }
                                eventDispatcher.dispatch('timeRangeEventEnding', {
                                    event: event,
                                    minutesRemaining: currTime.minutesRemaining,
                                    timeData: actionResult.timeData
                                });
                            }

                            if (prevTime.active && !currTime.active) {
                                if (debug) {
                                    console.log(`${MODULE_NAME}: Time range ended for "${event.name}"`);
                                }
                                // Revert card modifications when time range ends
                                revertEventCardModifications(event);
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
                let todayEvents = [];

                if (eventsList.length > 0) {
                    const dateInfo = calculateDateInfo(currentTimeData.day, config.startDate, config);
                    todayEvents = checkEventDay(dateInfo.month, dateInfo.day, dateInfo.year, eventsList, config);

                    if (todayEvents.length > 0) {
                        if (debug) {
                            console.log(`${MODULE_NAME}: Processing ${todayEvents.length} event(s) for day ${currentTimeData.day}`);
                        }

                        // Check story cards for ALL today's events (both all-day and time-range)
                        const eventsWithStoryCards = [];

                        for (const event of todayEvents) {
                            // Check which story cards this event declares
                            if (event.cardTitles && event.cardTitles.length > 0) {
                                if (debug) {
                                    console.log(`${MODULE_NAME}: Event "${event.name}" declares cards: ${event.cardTitles.join(', ')}`);
                                }

                                // Check if these story cards actually exist
                                for (const cardTitle of event.cardTitles) {
                                    if (Utilities && Utilities.storyCard) {
                                        const card = Utilities.storyCard.get(cardTitle);
                                        if (card) {
                                            if (debug) {
                                                console.log(`${MODULE_NAME}: Story card "${cardTitle}" exists for event "${event.name}"`);
                                            }
                                            eventsWithStoryCards.push({
                                                event: event,
                                                cardTitle: cardTitle,
                                                card: card
                                            });
                                        } else {
                                            if (debug) {
                                                console.log(`${MODULE_NAME}: WARNING: Story card "${cardTitle}" not found for event "${event.name}"`);
                                            }
                                        }
                                    }
                                }
                            } else {
                                if (debug) {
                                    console.log(`${MODULE_NAME}: Event "${event.name}" has no cards declared`);
                                }
                            }

                            // Apply modifications for all-day events (events without time ranges)
                            if (!event.timeRanges) {
                                if (debug) {
                                    console.log(`${MODULE_NAME}: Applying all-day event "${event.name}"`);
                                }
                                applyEventCardModifications(event);
                            } else {
                                // For time-range events, check if they're currently active
                                const timeRange = checkEventTimeRange(event, currentTimeData.dayProgress, config.hoursPerDay);
                                if (timeRange.active) {
                                    if (debug) {
                                        if (timeRange.currentRange) {
                                            console.log(`${MODULE_NAME}: Event "${event.name}" is currently active (${timeRange.currentRange.start.hour}:${String(timeRange.currentRange.start.minute).padStart(2, '0')}-${timeRange.currentRange.end.hour}:${String(timeRange.currentRange.end.minute).padStart(2, '0')})`);
                                        } else {
                                            console.log(`${MODULE_NAME}: Event "${event.name}" is currently active`);
                                        }
                                    }
                                    // Apply modifications for currently active time-range events
                                    applyEventCardModifications(event);
                                } else if (debug) {
                                    console.log(`${MODULE_NAME}: Event "${event.name}" is not currently active`);
                                }
                            }
                        }

                        eventDispatcher.dispatch('eventDay', {
                            events: todayEvents,
                            eventsWithStoryCards: eventsWithStoryCards,
                            date: calculateDate(currentTimeData.day, config.startDate, config),
                            timeData: currentTimeData
                        });
                    }
                }

                // Also check for events from previous day to revert
                if (currentTimeData.day > 0) {
                    const prevDateInfo = calculateDateInfo(currentTimeData.day - 1, config.startDate, config);
                    const prevDayEvents = checkEventDay(prevDateInfo.month, prevDateInfo.day, prevDateInfo.year, eventsList, config);

                    if (prevDayEvents.length > 0) {
                        if (debug) {
                            console.log(`${MODULE_NAME}: Checking ${prevDayEvents.length} event(s) from previous day to revert`);
                        }

                        // Check ALL previous day's events for active modifications
                        const modifiedState = loadModifiedCardsState();

                        for (const event of prevDayEvents) {
                            const eventKey = `${event.name}_${event.type}`;

                            // Check if this event has any active modifications
                            if (modifiedState[eventKey] && modifiedState[eventKey].modifiedTitles &&
                                modifiedState[eventKey].modifiedTitles.length > 0) {

                                if (!event.timeRanges) {
                                    // All-day event from yesterday
                                    if (debug) {
                                        console.log(`${MODULE_NAME}: Reverting all-day event "${event.name}" from previous day`);
                                    }
                                    revertEventCardModifications(event);
                                } else {
                                    // Time-range event from yesterday - check if it's still active today
                                    const todayEvent = todayEvents.find(e => e.name === event.name);
                                    if (!todayEvent) {
                                        // Event doesn't occur today, safe to revert
                                        if (debug) {
                                            console.log(`${MODULE_NAME}: Reverting time-range event "${event.name}" from previous day (not active today)`);
                                        }
                                        revertEventCardModifications(event);
                                    } else {
                                        // Event occurs today too - check if it's currently active
                                        const timeRange = checkEventTimeRange(todayEvent, currentTimeData.dayProgress, config.hoursPerDay);
                                        if (!timeRange.active) {
                                            // Not currently active, revert the modifications
                                            if (debug) {
                                                console.log(`${MODULE_NAME}: Reverting time-range event "${event.name}" from previous day (not currently active)`);
                                            }
                                            revertEventCardModifications(event);
                                        } else if (debug) {
                                            console.log(`${MODULE_NAME}: Keeping modifications for "${event.name}" (still active today)`);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            
            // Store events and initialize API
            Calendar.events = eventDispatcher.getEvents();

            initializeAPI();

            // Process default injection if enabled
            if (text && typeof text === 'string') {
                return processDefaultInjection(text);
            }
            return;

        case 'input':
            // Process input commands
            initializeAPI();

            if (!text || typeof text !== 'string') {
                return text;
            }

            let processedText = text;

            // Match /advancetime("spec") or /advancetime(spec) anywhere in text
            const advanceTimePattern = /\/advancetime\(["']?([^"')]+)["']?\)/gi;
            let advanceMatch;
            while ((advanceMatch = advanceTimePattern.exec(text)) !== null) {
                const timeSpec = advanceMatch[1].trim();
                const success = Calendar.advanceTime(timeSpec);

                if (debug) {
                    if (success) {
                        console.log(`${MODULE_NAME}: Advanced time by "${timeSpec}"`);
                    } else {
                        console.log(`${MODULE_NAME}: Failed to advance time by "${timeSpec}"`);
                    }
                }
            }
            // Remove all advancetime commands from text
            processedText = processedText.replace(/\/advancetime\(["']?[^"')]+["']?\)/gi, '');

            // Match /settime(hour, minute) or /settime(hour) anywhere in text
            const setTimePattern = /\/settime\((\d+)(?:\s*,\s*(\d+))?\)/gi;
            let timeMatch;
            while ((timeMatch = setTimePattern.exec(text)) !== null) {
                const hour = parseInt(timeMatch[1]);
                const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
                const success = Calendar.setTime(hour, minute);

                if (debug) {
                    if (success) {
                        console.log(`${MODULE_NAME}: Set time to ${hour}:${String(minute).padStart(2, '0')}`);
                    } else {
                        console.log(`${MODULE_NAME}: Failed to set time to ${hour}:${String(minute).padStart(2, '0')}`);
                    }
                }
            }
            // Remove all settime commands from text
            processedText = processedText.replace(/\/settime\(\d+(?:\s*,\s*\d+)?\)/gi, '');

            // Match /setday(dayNumber) anywhere in text
            const setDayPattern = /\/setday\((-?\d+)\)/gi;
            let dayMatch;
            while ((dayMatch = setDayPattern.exec(text)) !== null) {
                const dayNumber = parseInt(dayMatch[1]);
                const success = Calendar.setDay(dayNumber);

                if (debug) {
                    if (success) {
                        console.log(`${MODULE_NAME}: Set day to ${dayNumber}`);
                    } else {
                        console.log(`${MODULE_NAME}: Failed to set day to ${dayNumber}`);
                    }
                }
            }
            // Remove all setday commands from text
            processedText = processedText.replace(/\/setday\(-?\d+\)/gi, '');

            // Only return modified text if commands were found, otherwise return original
            if (processedText !== text) {
                // Clean up multiple spaces (but preserve newlines)
                processedText = processedText.replace(/  +/g, ' ').trim();
                // Return zero-width space if text is empty (AI Dungeon requires non-empty input)
                return processedText || '\u200B';
            }

            return text;

        default:
            // Default to API-only mode
            initializeAPI();
            return Calendar;
    }
}
