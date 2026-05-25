from nepali_datetime import date as nepali_date
from datetime import date as ad_date


def ad_to_bs(ad):
    """Convert a Python date (AD) to a Nepali date (BS)."""
    if not ad:
        return None
    nd = nepali_date.from_datetime_date(ad)
    return {
        "year": nd.year,
        "month": nd.month,
        "day": nd.day,
        "str": str(nd)  # e.g. "2081-03-15"
    }


def bs_to_ad(year, month, day):
    """Convert BS year/month/day to a Python date (AD)."""
    nd = nepali_date(year, month, day)
    return nd.to_datetime_date()


def today_bs():
    """Return today's date in BS."""
    nd = nepali_date.today()
    return {
        "year": nd.year,
        "month": nd.month,
        "day": nd.day,
        "str": str(nd)
    }