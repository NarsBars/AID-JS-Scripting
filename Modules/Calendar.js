function Calendar(hook, text) {
    'use strict';
    
    const debug = false;
    const MODULE_NAME = 'Calendar';
    
    // Usage in Scripting Sandbox:
    // Context Modifier: 
    //   Calendar("context");
    //
    // API Initialization:
    //   Calendar();
    
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
    
    // Configuration Card Names
    const CONFIG_CARD = '[CALENDAR] Time Configuration';
    const STATE_CARD = '[CALENDAR] Time State';
    const EVENT_CARD_PREFIX = '[CALENDAR] Event Days';
    
    // Module-level cache (valid for this turn only)
    let eventCache = null;
    let configCache = null;
    let stateCache = null;
    
    // ==========================
    // Core Functions
    // ==========================
    
    function loadConfiguration() {
        if (configCache !== null) return configCache;
        
        const configCard = Utilities.storyCard.get(CONFIG_CARD);
        if (!configCard) {
            if (debug) console.log(`${MODULE_NAME}: No configuration found`);
            return null;
        }
        
        configCache = parseConfigurationCard(configCard);
        return configCache;
    }
    
    function parseConfigurationCard(configCard) {
        const configText = configCard.entry || '';
        if (!configText) return null;
        
        const lines = configText.split('\n');
        const config = {};
        
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
            return null;
        }
        
        // Parse sections using Utilities
        const sections = Utilities.plainText.parseSections(configText);
        
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
        if (stateCache !== null) return stateCache;
        
        const config = loadConfiguration();
        if (!config) return null;
        
        const stateCard = Utilities.storyCard.get(STATE_CARD);
        if (!stateCard) {
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
                state.day = parseInt(line.split(':')[1].trim()) || 0;
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
        const state = {
            day: 0,
            progress: 0,
            lastProcessedAction: -1
        };
        saveTimeState(state);
        return state;
    }
    
    function saveTimeState(state) {
        if (!state) return;
        
        const config = loadConfiguration();
        if (!config) return;
        
        const dayProgress = state.progress / config.actionsPerDay;
        const timeInfo = calculateTimeOfDay(dayProgress, config.timePeriods, config.hoursPerDay);
        const timeStr = progressToTime(dayProgress, config.hoursPerDay);
        const calculatedDate = calculateDate(state.day, config.startDate, config);
        
        let entry = (
            `# Time State` +
            `\nProgress: ${state.progress}/[${config.actionsPerDay}]` +
            `\nTime: [${timeStr} ${timeInfo.period}]` +
            `\nDay: ${state.day}` +
            `\nDate: [${calculatedDate}]`
        );
        
        // Add season if configured
        if (config.seasons) {
            const yearInfo = getDayOfYear(state.day, config.startDate, config);
            const yearProgress = calculateYearProgress(yearInfo.dayOfYear, yearInfo.year, config);
            const season = calculateSeason(yearProgress, config.seasons);
            if (season !== 'Unknown') {
                entry += `\nSeason: [${season}]`;
            }
        }
        
        entry += `\n\nLast Processed Action: ${state.lastProcessedAction}`;
        
        Utilities.storyCard.upsert({
            title: STATE_CARD,
            entry: entry
        });
        
        stateCache = null;
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
        
        // Date Methods
        Calendar.getCurrentDate = () => {
            const state = loadTimeState();
            const config = loadConfiguration();
            if (!state || !config) return null;
            return calculateDate(state.day, config.startDate, config);
        };
        
        Calendar.getDayNumber = () => {
            const state = loadTimeState();
            return state ? state.day : null;
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
        
        Calendar.getDayOfYear = () => {
            const state = loadTimeState();
            const config = loadConfiguration();
            if (!state || !config) return null;
            const yearInfo = getDayOfYear(state.day, config.startDate, config);
            return yearInfo.dayOfYear + 1;
        };
        
        // Season Methods
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
        
        // Event Methods
        Calendar.getTodayEvents = () => {
            const state = loadTimeState();
            const config = loadConfiguration();
            if (!state || !config) return [];
            
            const eventsList = loadEventDays();
            if (eventsList.length === 0) return [];
            
            const dateInfo = calculateDateInfo(state.day, config.startDate, config);
            const dayEvents = checkEventDay(dateInfo.month, dateInfo.day, dateInfo.year, eventsList, config);
            
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
            const state = loadTimeState();
            const config = loadConfiguration();
            if (!state || !config || typeof timeSpec !== 'string') return false;
            
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
            
            const progressToAdd = totalHours / config.hoursPerDay;
            const actionsToAdd = Math.round(progressToAdd * config.actionsPerDay);
            
            let newProgress = state.progress + actionsToAdd;
            let newDay = state.day;
            
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
            if (debug) console.log(`${MODULE_NAME}: Advanced time by ${timeSpec}`);
            return true;
        };
        
        Calendar.setTime = (hour, minute = 0) => {
            const state = loadTimeState();
            const config = loadConfiguration();
            if (!state || !config) return false;
            
            if (typeof hour !== 'number' || hour < 0 || hour >= config.hoursPerDay) return false;
            if (typeof minute !== 'number' || minute < 0 || minute >= 60) return false;
            
            const totalMinutes = hour * 60 + minute;
            const dayProgress = totalMinutes / (config.hoursPerDay * 60);
            const newProgress = Math.floor(dayProgress * config.actionsPerDay);
            
            const newState = {
                day: state.day,
                progress: newProgress,
                lastProcessedAction: state.lastProcessedAction
            };
            
            saveTimeState(newState);
            return true;
        };
        
        Calendar.setDay = (newDay) => {
            const state = loadTimeState();
            if (!state || typeof newDay !== 'number') return false;
            
            const newState = {
                day: Math.floor(newDay),
                progress: state.progress,
                lastProcessedAction: state.lastProcessedAction
            };
            
            saveTimeState(newState);
            return true;
        };
        
        Calendar.setActionsPerDay = (newActionsPerDay) => {
            const config = loadConfiguration();
            const state = loadTimeState();
            if (!config || !state) return false;
            
            if (typeof newActionsPerDay !== 'number' || newActionsPerDay < 1) return false;
            
            const currentProgress = state.progress / config.actionsPerDay;
            
            const configCard = Utilities.storyCard.get(CONFIG_CARD);
            if (!configCard) return false;
            
            let configText = configCard.entry || '';
            configText = configText.replace(
                /Actions Per Day:\s*\d+/,
                `Actions Per Day: ${Math.floor(newActionsPerDay)}`
            );
            
            Utilities.storyCard.update(CONFIG_CARD, { entry: configText });
            configCache = null;
            
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
            
            saveTimeState(state);
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
            stateCache = null;
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
        if (typeof state !== 'undefined' && state.actionCount !== undefined) {
            return state.actionCount;
        }
        
        if (typeof info !== 'undefined' && info.actionCount !== undefined) {
            return info.actionCount;
        }
        
        return null;
    }
    
    function processCurrentAction() {
        const actionCount = getActionCount();
        if (actionCount === null) return null;
        
        const state = loadTimeState();
        const config = loadConfiguration();
        
        if (!state || !config) {
            if (debug) console.log(`${MODULE_NAME}: Cannot process actions without state and configuration`);
            return null;
        }
        
        if (actionCount === state.lastProcessedAction) {
            return null;
        }
        
        const actionsToProcess = actionCount - state.lastProcessedAction;
        
        if (actionsToProcess < 0) {
            return handleTimeReversal(actionCount, state, config);
        }
        
        let newProgress = state.progress + actionsToProcess;
        let newDay = state.day;
        
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
            const previousState = loadTimeState();
            const prevDayProgress = previousState ? previousState.progress / config.actionsPerDay : 0;
            const prevTimeOfDay = calculateTimeOfDay(prevDayProgress, config.timePeriods, config.hoursPerDay).period;
            
            const actionResult = processCurrentAction();
            
            // Dispatch events
            if (actionResult) {
                if (actionResult.reversed) {
                    eventDispatcher.dispatch('timeReversed', actionResult);
                } else {
                    // Check for time of day change
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
                        
                        // Check for season change
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
                    
                    // Check time-range events
                    const prevProgress = previousState ? previousState.progress : 0;
                    const currProgress = actionResult.state.progress;
                    
                    if (currProgress !== prevProgress) {
                        const eventsList = loadEventDays();
                        const dateInfo = calculateDateInfo(actionResult.state.day, config.startDate, config);
                        const todayEvents = checkEventDay(dateInfo.month, dateInfo.day, dateInfo.year, eventsList, config);
                        
                        const prevDayProgress = prevProgress / config.actionsPerDay;
                        const currDayProgress = currProgress / config.actionsPerDay;
                        
                        for (const event of todayEvents) {
                            if (!event.timeRanges) continue;
                            
                            const prevTime = checkEventTimeRange(event, prevDayProgress, config.hoursPerDay);
                            const currTime = checkEventTimeRange(event, currDayProgress, config.hoursPerDay);
                            
                            if (!prevTime.active && currTime.active) {
                                eventDispatcher.dispatch('timeRangeEventStarted', {
                                    event: event,
                                    timeRange: currTime.currentRange,
                                    state: actionResult.state
                                });
                            }
                            
                            if (currTime.active && currTime.minutesRemaining <= 5 && 
                                prevTime.active && prevTime.minutesRemaining > 5) {
                                eventDispatcher.dispatch('timeRangeEventEnding', {
                                    event: event,
                                    minutesRemaining: currTime.minutesRemaining,
                                    state: actionResult.state
                                });
                            }
                            
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
            
            // Check for events on current day
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
            
            // Store events and initialize API
            Calendar.events = eventDispatcher.getEvents();
            
            initializeAPI();
            
            // Also add event-related API methods
            Calendar.getTodayEvents = () => {
                const state = loadTimeState();
                const config = loadConfiguration();
                if (!state || !config) return [];
                
                const eventsList = loadEventDays();
                if (eventsList.length === 0) return [];
                
                const dateInfo = calculateDateInfo(state.day, config.startDate, config);
                const dayEvents = checkEventDay(dateInfo.month, dateInfo.day, dateInfo.year, eventsList, config);
                
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
            
            return;
            
        default:
            // Default to API-only mode
            initializeAPI();
            return Calendar;
    }
}
