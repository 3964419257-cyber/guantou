"""Small dependency-free text helpers for material processing scripts."""


def normalize_text(value):
    """Return a trimmed string, using an empty string for missing values."""
    if value is None:
        return ""
    return str(value).strip()


def split_nonempty(value, separator=" "):
    """Split text and discard empty items."""
    return [item for item in normalize_text(value).split(separator) if item]
