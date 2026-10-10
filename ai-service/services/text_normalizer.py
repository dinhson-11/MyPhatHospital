"""
Tiện ích chuẩn hóa & so khớp văn bản tiếng Việt cho AI Service.

- normalize_text(): NFC + chữ thường + gộp khoảng trắng (bắt buộc trước khi so khớp regex,
  vì ở dạng NFD các dấu thanh là ký tự tổ hợp và phá vỡ ranh giới từ \\b).
- strip_accents(): bỏ toàn bộ dấu (NFD, loại ký tự Mn, đ -> d).
- phrase_pattern(): regex khớp CỤM TỪ NGUYÊN VẸN (word-boundary), chấp nhận người dùng gõ
  thiếu dấu ("dot quy" khớp "đột quỵ", "dau nguc" khớp "đau ngực") nhưng KHÔNG chấp nhận
  gõ SAI dấu ("ngạt mũi" không khớp "ngất", "họ"/"cho"/"khoa" không khớp "ho").
- exact(): đánh dấu cụm từ chỉ khớp khi gõ đúng dấu (dùng cho từ mà dạng không dấu bị
  nhập nhằng: "tu tu" có thể là "từ từ", "xiu" có thể là "xíu").
"""

import re
import unicodedata
from functools import lru_cache
from typing import Iterable, Optional

# Dấu thanh tiếng Việt (huyền, sắc, ngã, hỏi, nặng) ở dạng ký tự tổ hợp
_TONE_MARKS = {"̀", "́", "̃", "̉", "̣"}

# Tiền tố đánh dấu cụm từ phải khớp đúng dấu
EXACT_PREFIX = "="


def exact(phrase: str) -> str:
    """Đánh dấu cụm từ chỉ được khớp khi gõ đúng dấu tiếng Việt."""
    return EXACT_PREFIX + phrase


def normalize_text(text: Optional[str]) -> str:
    """Chuẩn hóa Unicode NFC, chữ thường, gộp khoảng trắng."""
    if not text:
        return ""
    t = unicodedata.normalize("NFC", text).lower()
    return re.sub(r"\s+", " ", t).strip()


def strip_accents(text: Optional[str]) -> str:
    """Bỏ toàn bộ dấu tiếng Việt: NFD, loại ký tự Mn, đ -> d."""
    if not text:
        return ""
    t = unicodedata.normalize("NFD", text)
    t = "".join(ch for ch in t if unicodedata.category(ch) != "Mn")
    return unicodedata.normalize("NFC", t.replace("đ", "d").replace("Đ", "D"))


def _strip_tone(ch: str) -> str:
    """Bỏ dấu thanh nhưng giữ dấu mũ/móc/trăng: 'ấ' -> 'â', 'ự' -> 'ư'."""
    decomposed = unicodedata.normalize("NFD", ch)
    return unicodedata.normalize("NFC", "".join(c for c in decomposed if c not in _TONE_MARKS))


def _char_class(ch: str) -> str:
    variants = {ch, _strip_tone(ch), strip_accents(ch)}
    if len(variants) == 1:
        return re.escape(ch)
    return "[" + "".join(re.escape(v) for v in sorted(variants)) + "]"


@lru_cache(maxsize=4096)
def phrase_pattern(phrase: str) -> "re.Pattern[str]":
    """Biên dịch cụm từ thành regex khớp nguyên từ, chịu được việc gõ thiếu dấu."""
    strict = phrase.startswith(EXACT_PREFIX)
    p = normalize_text(phrase[1:] if strict else phrase)
    parts = []
    for ch in p:
        if ch == " ":
            parts.append(r"\s+")
        elif strict or not ch.isalpha():
            parts.append(re.escape(ch))
        else:
            parts.append(_char_class(ch))
    return re.compile(r"(?<!\w)" + "".join(parts) + r"(?!\w)")


def contains_phrase(text: str, phrase: str) -> bool:
    """text phải đã được normalize_text()."""
    return phrase_pattern(phrase).search(text) is not None


def contains_any(text: str, phrases: Iterable[str]) -> bool:
    """True nếu text (đã normalize_text) chứa nguyên vẹn ít nhất một cụm từ."""
    return any(phrase_pattern(p).search(text) for p in phrases)


def matched_phrases(text: str, phrases: Iterable[str]) -> list[str]:
    """Danh sách cụm từ khớp trong text (đã normalize_text)."""
    return [p for p in phrases if phrase_pattern(p).search(text)]


def remove_phrases(text: str, phrases: Iterable[str]) -> str:
    """Xóa các cụm từ khớp khỏi text (thay bằng khoảng trắng)."""
    for p in phrases:
        text = phrase_pattern(p).sub(" ", text)
    return re.sub(r"\s+", " ", text).strip()
