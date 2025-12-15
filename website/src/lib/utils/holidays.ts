export type Holiday = {
    date: string; // YYYY-MM-DD
    name: string;
};

// Calculate Easter date using Anonymous Gregorian algorithm
function getEasterDate(year: number): Date {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);

    const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-indexed month
    const day = ((h + l - 7 * m + 114) % 31) + 1;

    return new Date(year, month, day);
}

function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function getPolishHolidays(year: number): Holiday[] {
    const easter = getEasterDate(year);
    const easterMonday = addDays(easter, 1);
    const pentecost = addDays(easter, 49); // Whit Sunday
    const corpusChristi = addDays(easter, 60);

    const holidays: Holiday[] = [
        { date: `${year}-01-01`, name: "New Year's Day" },
        { date: `${year}-01-06`, name: 'Epiphany' },
        { date: formatDate(easter), name: 'Easter Sunday' },
        { date: formatDate(easterMonday), name: 'Easter Monday' },
        { date: `${year}-05-01`, name: 'Labor Day' },
        { date: `${year}-05-03`, name: 'Constitution Day' },
        { date: formatDate(pentecost), name: 'Pentecost Sunday' },
        { date: formatDate(corpusChristi), name: 'Corpus Christi' },
        { date: `${year}-08-15`, name: 'Assumption of Mary' },
        { date: `${year}-11-01`, name: "All Saints' Day" },
        { date: `${year}-11-11`, name: 'Independence Day' },
        { date: `${year}-12-25`, name: 'Christmas Day' },
        { date: `${year}-12-26`, name: 'Second Day of Christmas' },
    ];

    return holidays.sort((a, b) => a.date.localeCompare(b.date));
}
