export const BS_MONTH_NAMES = [
    { en:'Baisakh', ne:'बैशाख' }, { en:'Jestha',  ne:'जेठ'     },
    { en:'Ashadh',  ne:'असार'  }, { en:'Shrawan', ne:'साउन'    },
    { en:'Bhadra',  ne:'भदौ'   }, { en:'Ashwin',  ne:'असोज'    },
    { en:'Kartik',  ne:'कार्तिक'},{ en:'Mangsir', ne:'मंसिर'   },
    { en:'Poush',   ne:'पुष'   }, { en:'Magh',    ne:'माघ'     },
    { en:'Falgun',  ne:'फाल्गुन'},{ en:'Chaitra', ne:'चैत'     },
]

export const AD_MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// ── Verified GON month-length table ───────────────────────────────────────────
export const BS_DAYS = {
  2077:    [ 31,  32,  31,  32,  31,  30,  30,  30,  29,  30,  29,  31 ], // 366
  2078:    [ 31,  31,  31,  32,  31,  31,  30,  29,  30,  29,  30,  30 ], // 365
  2079:    [ 31,  31,  32,  31,  31,  31,  30,  29,  30,  29,  30,  30 ], // 365
  2080:    [ 31,  32,  31,  32,  31,  30,  30,  30,  29,  29,  30,  30 ], // 365
  2081:    [ 31,  32,  31,  32,  31,  30,  30,  30,  29,  30,  29,  31 ], // 366
  2082:    [ 31,  31,  32,  31,  31,  31,  30,  29,  30,  29,  30,  30 ], // 365
  2083:    [ 31,  31,  32,  31,  31,  31,  30,  29,  30,  29,  30,  30 ], // 365
  2084:    [ 31,  31,  32,  31,  31,  30,  30,  30,  29,  30,  30,  30 ], // 365
  2085:    [ 31,  32,  31,  32,  30,  31,  30,  30,  29,  30,  30,  30 ], // 366
  2086:    [ 30,  32,  31,  32,  31,  30,  30,  30,  29,  30,  30,  30 ], // 365
  2087:    [ 31,  31,  32,  31,  31,  31,  30,  29,  30,  30,  30,  30 ], // 366
}

// NOTE: Holidays are not hardcoded here. The backend Holiday table is the
// single source of truth for all non-weekend holidays; this file only
// computes Saturday/Sunday, which are locale-fixed and never change.

// ── Conversion engine ─────────────────────────────────────────────────────────
const EPOCH_YEAR = 2077
const BS_EPOCH   = new Date(2020, 3, 13)

function yearTotal(y) {
    return (BS_DAYS[y] || Array(12).fill(365 / 12)).reduce((a, b) => a + b, 0)
}

export function adToBS(adDate) {
    const noon = new Date(adDate.getFullYear(), adDate.getMonth(), adDate.getDate())
    let diff = Math.round((noon - BS_EPOCH) / 86400000)
    let y = EPOCH_YEAR
    if (diff >= 0) {
        while (diff >= yearTotal(y)) { diff -= yearTotal(y); y++ }
    } else {
        while (diff < 0) { y--; diff += yearTotal(y) }
    }
    const months = BS_DAYS[y] || Array(12).fill(30)
    let m = 0
    while (m < 12 && diff >= months[m]) { diff -= months[m]; m++ }
    return { year: y, month: m + 1, day: diff + 1 }
}

export function bsMonthStartAD(bsYear, bsMonth) {
    let days = 0
    if (bsYear >= EPOCH_YEAR) {
        for (let y = EPOCH_YEAR; y < bsYear; y++) days += yearTotal(y)
    } else {
        for (let y = bsYear; y < EPOCH_YEAR; y++) days -= yearTotal(y)
    }
    const months = BS_DAYS[bsYear] || Array(12).fill(30)
    for (let m = 0; m < bsMonth - 1; m++) days += months[m]
    return new Date(BS_EPOCH.getTime() + days * 86400000)
}

export function daysInBSMonth(year, month) {
    return (BS_DAYS[year] || Array(12).fill(30))[month - 1] ?? 30
}

// Build the array of day objects for a given BS month
export function buildMonthDays(bsYear, bsMonth) {
    const total   = daysInBSMonth(bsYear, bsMonth)
    const startAD = bsMonthStartAD(bsYear, bsMonth)
    return Array.from({ length: total }, (_, i) => {
        const adDate = new Date(startAD.getTime() + i * 86400000)
        const dow    = adDate.getDay() // 0=Sun … 6=Sat
        const bsDay  = i + 1
        const bsKey  = `${bsYear}-${String(bsMonth).padStart(2,'0')}-${String(bsDay).padStart(2,'0')}`
        const isSat  = dow === 6
        const isSun  = dow === 0
        return {
            bsDay, adDate, adDay: adDate.getDate(), dow,
            isSat, isSun,
            // Saturday and Sunday are the only holidays known before the
            // backend responds. Real holidays are merged in from the
            // backend by each page — see the `days` useMemo in
            // CalendarPage.jsx / AdminCalendarPage.jsx / the dashboards.
            isHoliday: isSat || isSun,
            holidayTitle: null,
            bsKey,
            // ISO string of AD date for task due_date matching (local date, not UTC — avoids off-by-one in +UTC timezones)
            adISO: `${adDate.getFullYear()}-${String(adDate.getMonth() + 1).padStart(2, '0')}-${String(adDate.getDate()).padStart(2, '0')}`,
        }
    })
}