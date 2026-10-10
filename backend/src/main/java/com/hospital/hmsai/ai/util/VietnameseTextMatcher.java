package com.hospital.hmsai.ai.util;

import java.text.Normalizer;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

/**
 * Chuẩn hóa & so khớp văn bản tiếng Việt cho các fallback AI (đồng bộ với ai-service/services/text_normalizer.py).
 * <ul>
 *   <li>{@link #normalize(String)}: Unicode NFC + chữ thường + gộp khoảng trắng.</li>
 *   <li>{@link #stripDiacritics(String)}: bỏ toàn bộ dấu (NFD, loại ký tự Mn, đ → d).</li>
 *   <li>{@link #containsAny(String, String...)}: khớp NGUYÊN TỪ (word-boundary), chấp nhận gõ thiếu dấu
 *       ("dot quy" khớp "đột quỵ") nhưng không chấp nhận sai dấu ("ngạt mũi" không khớp "ngất",
 *       "cho"/"khoa" không khớp "ho").</li>
 *   <li>Cụm từ bắt đầu bằng {@link #EXACT_PREFIX} chỉ khớp khi gõ đúng dấu (dạng không dấu nhập nhằng,
 *       vd "xiu" ~ "xíu", "tu tu" ~ "từ từ").</li>
 * </ul>
 */
public final class VietnameseTextMatcher {

    public static final String EXACT_PREFIX = "=";

    /** Dấu thanh dạng tổ hợp: huyền, sắc, ngã, hỏi, nặng. */
    private static final String TONE_MARKS = "̣̀́̃̉";

    private static final Pattern COMBINING_MARKS = Pattern.compile("\\p{M}+");
    private static final Pattern WHITESPACE = Pattern.compile("\\s+");
    private static final Map<String, Pattern> CACHE = new ConcurrentHashMap<>();

    private VietnameseTextMatcher() {
    }

    /** Đánh dấu cụm từ chỉ được khớp khi gõ đúng dấu. */
    public static String exact(String phrase) {
        return EXACT_PREFIX + phrase;
    }

    public static String normalize(String text) {
        if (text == null) {
            return "";
        }
        String nfc = Normalizer.normalize(text, Normalizer.Form.NFC).toLowerCase(Locale.ROOT);
        return WHITESPACE.matcher(nfc).replaceAll(" ").trim();
    }

    public static String stripDiacritics(String text) {
        if (text == null) {
            return "";
        }
        String nfd = Normalizer.normalize(text, Normalizer.Form.NFD);
        String stripped = COMBINING_MARKS.matcher(nfd).replaceAll("").replace('đ', 'd').replace('Đ', 'D');
        return Normalizer.normalize(stripped, Normalizer.Form.NFC);
    }

    private static String stripTone(String ch) {
        String nfd = Normalizer.normalize(ch, Normalizer.Form.NFD);
        StringBuilder sb = new StringBuilder();
        for (char c : nfd.toCharArray()) {
            if (TONE_MARKS.indexOf(c) < 0) {
                sb.append(c);
            }
        }
        return Normalizer.normalize(sb.toString(), Normalizer.Form.NFC);
    }

    /** Biên dịch (có cache) cụm từ thành regex khớp nguyên từ, chịu được gõ thiếu dấu. */
    public static Pattern phrasePattern(String phrase) {
        return CACHE.computeIfAbsent(phrase, VietnameseTextMatcher::compile);
    }

    private static Pattern compile(String phrase) {
        boolean strict = phrase.startsWith(EXACT_PREFIX);
        String p = normalize(strict ? phrase.substring(EXACT_PREFIX.length()) : phrase);
        StringBuilder regex = new StringBuilder("(?<![\\p{L}\\p{N}_])");
        p.codePoints().forEach(cp -> {
            String ch = new String(Character.toChars(cp));
            if (cp == ' ') {
                regex.append("\\s+");
            } else if (strict || !Character.isLetter(cp)) {
                regex.append(Pattern.quote(ch));
            } else {
                Set<String> variants = new LinkedHashSet<>();
                variants.add(ch);
                variants.add(stripTone(ch));
                variants.add(stripDiacritics(ch));
                if (variants.size() == 1) {
                    regex.append(Pattern.quote(ch));
                } else {
                    regex.append("(?:");
                    regex.append(String.join("|", variants.stream().map(Pattern::quote).toList()));
                    regex.append(")");
                }
            }
        });
        regex.append("(?![\\p{L}\\p{N}_])");
        return Pattern.compile(regex.toString());
    }

    /** {@code normalizedText} phải đã qua {@link #normalize(String)}. */
    public static boolean containsAny(String normalizedText, String... phrases) {
        for (String phrase : phrases) {
            if (phrasePattern(phrase).matcher(normalizedText).find()) {
                return true;
            }
        }
        return false;
    }
}
