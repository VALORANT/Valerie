export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
export const WEEK = 7 * DAY;
export const YEAR = 365 * DAY;

export const humanizeTimeAmount = (time: number): string => {
    let humanizedTime = time;
    let humanizedUnit = 'milisecond';
    const timeUnits: Record<string, number> = {
        second: SECOND,
        minute: MINUTE,
        hour: HOUR,
        day: DAY,
        week: WEEK,
        year: YEAR,
    };

    for (const unit in timeUnits) {
        const nextUnitFactor = timeUnits[unit];
        const nextUnitAmount = humanizedTime / nextUnitFactor;

        if (humanizedTime > nextUnitFactor && Number.isInteger(nextUnitAmount)) {
            humanizedTime /= nextUnitFactor
            humanizedUnit = unit;
        } else {
            break;
        }
    }

    return `${humanizedTime} ${humanizedUnit}${humanizedTime > 1 ? 's' : ''}`;
};

export const sleep = (milliseconds: number): Promise<void> => {
    return new Promise(resolve => {
        setTimeout(resolve, milliseconds);
    })
};

export const stringToTime = (string: string): number | null => {
    const unit = string.match(/\D+/u);
    const amount = string.match(/\d+/u);
    const unitMap: Record<string, number> = {
        'ms': 1,
        's': SECOND,
        'm': MINUTE,
        'h': HOUR,
        'd': DAY,
        'w': WEEK,
        'y': YEAR,
    };

    if (!unit || !amount || !(unit[0].toLowerCase() in unitMap)) {
        return null;
    }

    return Number(amount[0]) * unitMap[unit[0].toLowerCase()];
};
