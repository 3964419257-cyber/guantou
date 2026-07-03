"""莆仙话拼音与 IPA 辅助转换。

This module captures rules from the old Puxian dictionary tooling. It is
dialect-specific: callers for other dialects should add their own module under
``tools/materials/<dialect>/`` instead of reusing these mappings as defaults.
"""

import re

PINYIN_TONE_TO_IPA_TONE = {
    "1": "533",
    "2": "13",
    "3": "453",
    "4": "42",
    "5": "11",
    "6": "21",
    "7": "4",
}

IPA_TONE_TO_PINYIN_TONE = {
    "533": "1",
    "24": "2",
    "13": "2",
    "453": "3",
    "42": "4",
    "11": "5",
    "2": "6",
    "21": "6",
    "5": "7",
    "4": "7",
}


def _match_puxian_pinyin(value):
    match = re.match(r"([a-z|ⁿ]+)([0-9]*)$", str(value), re.M | re.I)
    if not match:
        raise ValueError(f"invalid Puxian pinyin: {value}")
    return match


def pinyin_to_tone(pinyin):
    return _match_puxian_pinyin(pinyin).group(2)


def pinyin_to_initial(pinyin):
    line = _match_puxian_pinyin(pinyin).group(1)
    match = re.match(r"(ng?|[^aeiouy]?)(.*)$", line, re.M | re.I)
    if not match:
        raise ValueError(f"invalid Puxian pinyin initial: {pinyin}")
    if line == "ng":
        return ""
    return match.group(1)


def pinyin_to_final(pinyin):
    line = _match_puxian_pinyin(pinyin).group(1)
    match = re.match(r"(ng?|[^aeiouy]?)(.*)$", line, re.M | re.I)
    if not match:
        raise ValueError(f"invalid Puxian pinyin final: {pinyin}")
    if line == "ng":
        return "ng"
    return match.group(2)


def pinyin_to_ipa(pinyin):
    initial = pinyin_to_initial(pinyin)
    final = pinyin_to_final(pinyin)
    tone = pinyin_to_tone(pinyin)
    match = re.match(r"(.*?)(ng?|n?|h?|ⁿ?)$", final, re.M | re.I)
    if not match:
        raise ValueError(f"invalid Puxian pinyin final: {pinyin}")
    vowel = match.group(1)
    coda = match.group(2)

    initial = {
        "b": "p",
        "p": "ph",
        "d": "t",
        "t": "th",
        "z": "ts",
        "c": "tsh",
        "g": "k",
        "k": "kh",
        "s": "ɬ",
        "ng": "ŋ",
        "": "",
    }.get(initial, initial)

    if coda in {"", "n"}:
        vowel = {
            "ae": "ɛ",
            "oe": "ø",
            "or": "ɒ",
            "ou": "ɔu",
            "yor": "yɒ",
        }.get(vowel, vowel)

    if coda in {"h", "ng"}:
        vowel = {
            "e": "ɛ",
            "ie": "iɛ",
            "oe": "œ",
            "o": "ɔ",
            "or": "ɒ",
            "yor": "yɒ",
        }.get(vowel, vowel)
        coda = {
            "ng": "ŋ",
            "h": "ʔ",
            "ⁿ": "ⁿ",
        }.get(coda, coda)

    return f"{initial}{vowel}{coda}{PINYIN_TONE_TO_IPA_TONE.get(tone, tone)}"


def fuzzy_pinyin_candidates(pinyin):
    result = set()
    initial = pinyin_to_initial(pinyin)
    final = pinyin_to_final(pinyin)
    tone = pinyin_to_tone(pinyin)

    if initial == "j":
        initials = {"z"}
    elif initial == "q":
        initials = {"c"}
    elif initial == "x":
        initials = {"s"}
    else:
        initials = {initial}

    if tone == "":
        if final[-1] == "h":
            tones = {"6", "7"}
        else:
            tones = {"1", "2", "3", "4", "5"}
    else:
        tones = {tone}

    if final == "ie":
        finals = {"ia"}
    elif final == "yoe":
        finals = {"yor"}
    elif final in {"uei", "ua", "uai"}:
        finals = {"ue"}
    elif final in {"iau", "ieo", "iao"}:
        finals = {"ieu"}
    elif final == "uo":
        finals = {"ua"}
    elif final == "ao":
        finals = {"au"}
    elif final in {"ou", "o"}:
        finals = {"o", "ou"}
    elif final == "erh":
        finals = {"oh"}
    elif final in {"ieng", "eng"}:
        finals = {"ieng", "eng"}
    elif final == "erng":
        finals = {"ong", "oeng", "yorng"}
    elif initial in {"z", "c", "s"} and final == "u":
        finals = {"y"}
    elif final == "ei":
        finals = {"e"}
    else:
        finals = {final}

    for item_initial in initials:
        for item_final in finals:
            for item_tone in tones:
                result.add(f"{item_initial}{item_final}{item_tone}")
    return result


def _match_puxian_ipa(value):
    match = re.match(r"([^0-9]+)([0-9]*)$", str(value), re.M | re.I)
    if not match:
        raise ValueError(f"invalid Puxian IPA: {value}")
    return match


def ipa_to_tone(ipa):
    return _match_puxian_ipa(ipa).group(2)


def ipa_to_initial(ipa):
    line = _match_puxian_ipa(ipa).group(1)
    match = re.match(r"([^aeiouyɛøɒɔœ]+)(.*)$", line, re.M | re.I)
    if not match:
        raise ValueError(f"invalid Puxian IPA initial: {ipa}")
    if line == "Ǿŋ":
        return "Ǿ"
    return match.group(1)


def ipa_to_final(ipa):
    line = _match_puxian_ipa(ipa).group(1)
    match = re.match(r"(ng?|[^aeiouyɛøɒɔœ]+)(.*)$", line, re.M | re.I)
    if not match:
        raise ValueError(f"invalid Puxian IPA final: {ipa}")
    if line == "Ǿŋ":
        return "ŋ"
    return match.group(2)


def ipa_to_pinyin(ipa):
    initial = ipa_to_initial(ipa)
    final = ipa_to_final(ipa)
    tone = ipa_to_tone(ipa)
    match = re.match(r"(.*?)(ŋ?|n?|ʔ?)$", final, re.M | re.I)
    if not match:
        raise ValueError(f"invalid Puxian IPA final: {ipa}")
    vowel = match.group(1)
    coda = match.group(2)

    initial = {
        "p": "b",
        "ph": "p",
        "t": "d",
        "th": "t",
        "ts": "z",
        "tsh": "c",
        "k": "g",
        "kh": "k",
        "ɬ": "s",
        "ŋ": "ng",
        "Ǿ": "",
    }.get(initial, initial)

    if coda in {"", "n"}:
        vowel = {
            "ɛ": "ae",
            "ø": "oe",
            "ɒ": "or",
            "ɔu": "ou",
            "yɒ": "yor",
            "ɔ": "or",
            "yɔ": "yor",
        }.get(vowel, vowel)

    if coda in {"ʔ", "ŋ"}:
        vowel = {
            "ɛ": "e",
            "iɛ": "ie",
            "œ": "oe",
            "ø": "oe",
            "ɔ": "or",
            "ɒ": "or",
            "yɒ": "yor",
            "yɔ": "yor",
        }.get(vowel, vowel)
        coda = {
            "ŋ": "ng",
            "ʔ": "h",
        }.get(coda, coda)

    return f"{initial}{vowel}{coda}{IPA_TONE_TO_PINYIN_TONE.get(tone, tone)}"


# Backward-compatible aliases for older notes/scripts.
pinyin_to_shengmu = pinyin_to_initial
pinyin_to_yunmu = pinyin_to_final
pinyin_to_IPA = pinyin_to_ipa
mohuyin = fuzzy_pinyin_candidates
IPA_to_tone = ipa_to_tone
IPA_to_shengmu = ipa_to_initial
IPA_to_yunmu = ipa_to_final
IPA_to_pinyin = ipa_to_pinyin
