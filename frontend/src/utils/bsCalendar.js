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

// ── All Nepal public holidays — RED only, no type distinction ─────────────────
export const NEPAL_HOLIDAYS = {
    // ── 2081 BS ───────────────────────────────────────────────────────────────
    '2081-01-01': 'Naya Barsha (नयाँ वर्ष)',
    '2081-01-08': 'Ram Nawami (राम नवमी)',
    '2081-02-07': 'Buddha Jayanti (बुद्ध जयन्ती)',
    '2081-03-05': 'Naag Panchami (नाग पञ्चमी)',
    '2081-04-02': 'Janai Purnima (जनै पूर्णिमा)',
    '2081-04-03': 'Gai Jatra (गाई जात्रा)',
    '2081-05-06': 'Teej (तीज)',
    '2081-06-07': 'Ghatasthapana (घटस्थापना)',
    '2081-06-14': 'Fulpati (फूलपाती)',
    '2081-06-15': 'Maha Astami (महा अष्टमी)',
    '2081-06-16': 'Maha Nawami (महा नवमी)',
    '2081-06-17': 'Vijaya Dashami (विजया दशमी)',
    '2081-07-22': 'Lakshmi Puja / Diwali (लक्ष्मीपूजा)',
    '2081-07-23': 'Govardhan Puja',
    '2081-07-24': 'Bhai Tika (भाई टीका)',
    '2081-08-04': 'Chhath Parba (छठ पर्व)',
    '2081-10-01': 'Maghe Sankranti (माघे सङ्क्रान्ति)',
    '2081-10-20': 'Sonam Losar (सोनाम ल्होसार)',
    '2081-11-17': 'Maha Shivaratri (महाशिवरात्री)',
    '2081-11-20': 'Gyalpo Losar (ग्याल्पो ल्होसार)',
    '2081-12-12': 'Fagu Purnima / Holi (फागु पूर्णिमा)',
    '2081-12-28': 'Ghode Jatra (घोडे जात्रा)',

    // ── 2082 BS ───────────────────────────────────────────────────────────────
    '2082-01-01': 'Naya Barsha (नयाँ वर्ष)',
    '2082-01-07': 'Ram Nawami (राम नवमी)',
    '2082-02-01': 'Buddha Jayanti (बुद्ध जयन्ती)',
    '2082-02-15': 'Sithinakha',
    '2082-03-01': 'Naag Panchami (नाग पञ्चमी)',
    '2082-04-01': 'Janai Purnima (जनै पूर्णिमा)',
    '2082-04-02': 'Gai Jatra (गाई जात्रा)',
    '2082-04-29': 'Krishna Astami (कृष्णाष्टमी)',
    '2082-05-01': 'Teej (तीज)',
    '2082-05-08': 'Indra Jatra (इन्द्र जात्रा)',
    '2082-06-04': 'Ghatasthapana (घटस्थापना)',
    '2082-06-11': 'Fulpati (फूलपाती)',
    '2082-06-12': 'Maha Astami (महा अष्टमी)',
    '2082-06-13': 'Maha Nawami (महा नवमी)',
    '2082-06-14': 'Vijaya Dashami (विजया दशमी)',
    '2082-06-25': 'Kojagrat Purnima (कोजाग्रत पूर्णिमा)',
    '2082-07-17': 'Tihar — Kaag Tihar',
    '2082-07-18': 'Tihar — Kukur Tihar',
    '2082-07-19': 'Lakshmi Puja / Diwali (लक्ष्मीपूजा)',
    '2082-07-20': 'Govardhan Puja',
    '2082-07-21': 'Bhai Tika (भाई टीका)',
    '2082-08-01': 'Chhath Parba (छठ पर्व)',
    '2082-08-16': 'Vivah Panchami (विवाह पञ्चमी)',
    '2082-09-01': 'Udhauli Parba',
    '2082-10-01': 'Maghe Sankranti (माघे सङ्क्रान्ति)',
    '2082-10-15': 'Sonam Losar (सोनाम ल्होसार)',
    '2082-11-14': 'Maha Shivaratri (महाशिवरात्री)',
    '2082-11-17': 'Gyalpo Losar (ग्याल्पो ल्होसार)',
    '2082-12-07': 'Fagu Purnima / Holi (फागु पूर्णिमा)',
    '2082-12-25': 'Ghode Jatra (घोडे जात्रा)',
    '2082-12-29': 'Ram Nawami (राम नवमी)',

    // ── 2083 BS ───────────────────────────────────────────────────────────────
    '2083-01-01': 'Naya Barsha (नयाँ वर्ष)',
    '2083-01-18': 'Buddha Jayanti (बुद्ध जयन्ती)',
    '2083-03-06': 'Sithinakha',
    '2083-05-01': 'Naag Panchami (नाग पञ्चमी)',
    '2083-05-12': 'Janai Purnima / Raksha Bandhan (जनै पूर्णिमा)',
    '2083-05-13': 'Gai Jatra (गाई जात्रा)',
    '2083-05-19': 'Krishna Astami / Janmashtami (कृष्णाष्टमी)',
    '2083-05-29': 'Teej (तीज)',
    '2083-06-09': 'Indra Jatra (इन्द्र जात्रा)',
    '2083-06-25': 'Ghatasthapana (घटस्थापना)',
    '2083-06-31': 'Fulpati (फूलपाती)',
    '2083-07-01': 'Maha Astami (महा अष्टमी)',
    '2083-07-02': 'Maha Nawami (महा नवमी)',
    '2083-07-03': 'Vijaya Dashami (विजया दशमी)',
    '2083-07-08': 'Kojagrat Purnima (कोजाग्रत पूर्णिमा)',
    '2083-07-20': 'Tihar — Kaag Tihar',
    '2083-07-21': 'Tihar — Kukur Tihar',
    '2083-07-22': 'Lakshmi Puja / Diwali (लक्ष्मीपूजा)',
    '2083-07-23': 'Govardhan Puja',
    '2083-07-24': 'Bhai Tika (भाई टीका)',
    '2083-07-29': 'Chhath Parba (छठ पर्व)',
    '2083-10-01': 'Maghe Sankranti (माघे सङ्क्रान्ति)',
    '2083-10-24': 'Sonam Losar (सोनाम ल्होसार)',
    '2083-11-22': 'Maha Shivaratri (महाशिवरात्री)',
    '2083-11-25': 'Gyalpo Losar (ग्याल्पो ल्होसार)',
    '2083-12-07': 'Fagu Purnima / Holi (फागु पूर्णिमा)',
    '2083-12-23': 'Ghode Jatra (घोडे जात्रा)',

    // ── 2084 BS ───────────────────────────────────────────────────────────────
    '2084-01-01': 'Naya Barsha (नयाँ वर्ष)',
    '2084-02-06': 'Buddha Jayanti (बुद्ध जयन्ती)',
    '2084-11-21': 'Maha Shivaratri (महाशिवरात्री)',
    '2084-12-16': 'Fagu Purnima / Holi (फागु पूर्णिमा)',
}

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
        const hTitle = NEPAL_HOLIDAYS[bsKey] || null
        const isSat  = dow === 6
        const isSun  = dow === 0
        return {
            bsDay, adDate, adDay: adDate.getDate(), dow,
            isSat, isSun,
            // both Saturday and Sunday now count as weekend holidays
            isHoliday: !!hTitle || isSat || isSun,
            holidayTitle: hTitle,
            bsKey,
            // ISO string of AD date for task due_date matching (local date, not UTC — avoids off-by-one in +UTC timezones)
            adISO: `${adDate.getFullYear()}-${String(adDate.getMonth() + 1).padStart(2, '0')}-${String(adDate.getDate()).padStart(2, '0')}`,
        }
    })
}