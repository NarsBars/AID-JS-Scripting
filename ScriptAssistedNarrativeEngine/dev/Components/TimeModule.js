function TimeModule() {
    'use strict';

    const MODULE_NAME = 'TimeModule';
    const debug = true;

    // Module will receive GameState API during init
    let GameState = null;
    let Calendar = null;

    return {
        // Tool definitions
        tools: {
            advance_time: function(params) {
                // Check if Calendar is available
                if (typeof Calendar === 'undefined' || !Calendar) {
                    if (debug) console.log(`${MODULE_NAME}: Calendar module not available`);
                    return 'executed';
                }

                const [hours, minutes] = params;

                if (hours === undefined && minutes === undefined) return 'malformed';

                // Parse time values
                const hoursInt = parseInt(hours) || 0;
                const minutesInt = parseInt(minutes) || 0;

                if (hoursInt < 0 || minutesInt < 0) {
                    if (debug) console.log(`${MODULE_NAME}: Cannot advance negative time`);
                    return 'malformed';
                }

                if (hoursInt === 0 && minutesInt === 0) {
                    if (debug) console.log(`${MODULE_NAME}: No time to advance`);
                    return 'malformed';
                }

                try {
                    // Build time string for Calendar
                    let timeStr = '';
                    if (hoursInt > 0) timeStr += `${hoursInt}h`;
                    if (minutesInt > 0) {
                        if (timeStr) timeStr += ' ';
                        timeStr += `${minutesInt}m`;
                    }

                    // Use Calendar's advance function if available
                    if (Calendar.advanceTime) {
                        const oldTime = Calendar.getCurrentTime ? Calendar.getCurrentTime() : 'unknown';
                        Calendar.advanceTime(timeStr);
                        const newTime = Calendar.getCurrentTime ? Calendar.getCurrentTime() : 'unknown';

                        if (debug) {
                            console.log(`${MODULE_NAME}: Advanced time by ${timeStr} (${oldTime} -> ${newTime})`);
                        }
                    } else {
                        if (debug) console.log(`${MODULE_NAME}: Calendar.advanceTime not available`);
                    }

                    return 'executed';
                } catch (e) {
                    if (debug) console.log(`${MODULE_NAME}: Error advancing time: ${e.message}`);
                    return 'malformed';
                }
            },

            set_time: function(params) {
                // Check if Calendar is available
                if (typeof Calendar === 'undefined' || !Calendar) {
                    if (debug) console.log(`${MODULE_NAME}: Calendar module not available`);
                    return 'executed';
                }

                const [timeStr] = params;

                if (!timeStr) return 'malformed';

                try {
                    // Parse time string (format: "HH:MM" or "H:MM")
                    const timeMatch = String(timeStr).match(/^(\d{1,2}):(\d{2})$/);
                    if (!timeMatch) {
                        if (debug) console.log(`${MODULE_NAME}: Invalid time format: ${timeStr} (expected HH:MM)`);
                        return 'malformed';
                    }

                    const hours = parseInt(timeMatch[1]);
                    const minutes = parseInt(timeMatch[2]);

                    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
                        if (debug) console.log(`${MODULE_NAME}: Invalid time values: ${hours}:${minutes}`);
                        return 'malformed';
                    }

                    // Use Calendar's set function if available
                    if (Calendar.setTime) {
                        const oldTime = Calendar.getCurrentTime ? Calendar.getCurrentTime() : 'unknown';
                        Calendar.setTime(hours, minutes);
                        const newTime = Calendar.getCurrentTime ? Calendar.getCurrentTime() : 'unknown';

                        if (debug) {
                            console.log(`${MODULE_NAME}: Set time to ${timeStr} (was ${oldTime}, now ${newTime})`);
                        }
                    } else {
                        if (debug) console.log(`${MODULE_NAME}: Calendar.setTime not available`);
                    }

                    return 'executed';
                } catch (e) {
                    if (debug) console.log(`${MODULE_NAME}: Error setting time: ${e.message}`);
                    return 'malformed';
                }
            },

            advance_days: function(params) {
                // Check if Calendar is available
                if (typeof Calendar === 'undefined' || !Calendar) {
                    if (debug) console.log(`${MODULE_NAME}: Calendar module not available`);
                    return 'executed';
                }

                const [days] = params;

                if (days === undefined) return 'malformed';

                const daysInt = parseInt(days);
                if (isNaN(daysInt) || daysInt <= 0) {
                    if (debug) console.log(`${MODULE_NAME}: Invalid days value: ${days}`);
                    return 'malformed';
                }

                try {
                    // Use Calendar's advance function with days
                    if (Calendar.advanceTime) {
                        const oldDay = Calendar.getCurrentDay ? Calendar.getCurrentDay() : 'unknown';
                        Calendar.advanceTime(`${daysInt}d`);
                        const newDay = Calendar.getCurrentDay ? Calendar.getCurrentDay() : 'unknown';

                        if (debug) {
                            console.log(`${MODULE_NAME}: Advanced ${daysInt} day(s) (Day ${oldDay} -> Day ${newDay})`);
                        }
                    } else {
                        if (debug) console.log(`${MODULE_NAME}: Calendar.advanceTime not available`);
                    }

                    return 'executed';
                } catch (e) {
                    if (debug) console.log(`${MODULE_NAME}: Error advancing days: ${e.message}`);
                    return 'malformed';
                }
            },

            schedule_event: function(params) {
                // Check if Calendar is available
                if (typeof Calendar === 'undefined' || !Calendar) {
                    if (debug) console.log(`${MODULE_NAME}: Calendar module not available`);
                    return 'executed';
                }

                const [eventName, timeStr, description] = params;

                if (!eventName || !timeStr) return 'malformed';

                const event = String(eventName).toLowerCase();
                const time = String(timeStr);
                const desc = description ? String(description) : null;

                try {
                    // Use Calendar's event scheduling if available
                    if (Calendar.scheduleEvent) {
                        Calendar.scheduleEvent({
                            name: event,
                            time: time,
                            description: desc
                        });

                        if (debug) {
                            console.log(`${MODULE_NAME}: Scheduled event '${event}' for ${time}`);
                        }
                    } else {
                        if (debug) console.log(`${MODULE_NAME}: Calendar.scheduleEvent not available`);
                    }

                    return 'executed';
                } catch (e) {
                    if (debug) console.log(`${MODULE_NAME}: Error scheduling event: ${e.message}`);
                    return 'malformed';
                }
            }
        },

        // Module initialization
        init: function(api) {
            GameState = api;

            // Check if Calendar module is available globally
            if (typeof window !== 'undefined' && window.Calendar) {
                Calendar = window.Calendar;
            } else if (typeof globalThis !== 'undefined' && globalThis.Calendar) {
                Calendar = globalThis.Calendar;
            } else if (typeof global !== 'undefined' && global.Calendar) {
                Calendar = global.Calendar;
            }

            if (debug) {
                if (!Calendar) {
                    console.log(`${MODULE_NAME}: Calendar module not found - time tools will be no-ops`);
                }
            }
        }
    };
}
TimeModule.isSANEModule = true;
