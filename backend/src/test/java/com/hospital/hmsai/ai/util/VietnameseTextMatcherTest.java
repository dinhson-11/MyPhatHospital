package com.hospital.hmsai.ai.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.text.Normalizer;

import static com.hospital.hmsai.ai.util.VietnameseTextMatcher.containsAny;
import static com.hospital.hmsai.ai.util.VietnameseTextMatcher.exact;
import static com.hospital.hmsai.ai.util.VietnameseTextMatcher.normalize;
import static com.hospital.hmsai.ai.util.VietnameseTextMatcher.stripDiacritics;
import static org.assertj.core.api.Assertions.assertThat;

class VietnameseTextMatcherTest {

    @Test
    @DisplayName("Khớp nguyên từ: 'ho' không khớp 'cho', 'khoa', 'họng'")
    void wordBoundary() {
        assertThat(containsAny(normalize("cho tôi hỏi khoa họng"), "ho")).isFalse();
        assertThat(containsAny(normalize("tôi bị ho nhiều"), "ho")).isTrue();
        assertThat(containsAny(normalize("tim mạch trung ương"), "run")).isFalse();
    }

    @Test
    @DisplayName("Chịu được gõ không dấu nhưng không chịu sai dấu")
    void accentTolerance() {
        assertThat(containsAny(normalize("dot quy"), "đột quỵ")).isTrue();
        assertThat(containsAny(normalize("Đột Quỵ"), "đột quỵ")).isTrue();
        assertThat(containsAny(normalize("muon chet"), "muốn chết")).isTrue();
        assertThat(containsAny(normalize("đau ngực du doi"), "đau ngực dữ dội")).isTrue();
        // "ngạt" (mũi) không được khớp "ngất"
        assertThat(containsAny(normalize("ngạt mũi"), "ngất")).isFalse();
        // "đâu" không phải "đau"
        assertThat(containsAny(normalize("bệnh viện ở đâu"), "đau")).isFalse();
    }

    @Test
    @DisplayName("exact(): chỉ khớp khi gõ đúng dấu")
    void exactPhrase() {
        assertThat(containsAny(normalize("tôi định tự tử"), exact("tự tử"))).isTrue();
        assertThat(containsAny(normalize("đau tu tu"), exact("tự tử"))).isFalse();
        assertThat(containsAny(normalize("đau từ từ"), "tự tử")).isFalse();
    }

    @Test
    @DisplayName("Chuẩn hóa NFD → NFC và bỏ dấu")
    void normalization() {
        String nfd = Normalizer.normalize("Tôi Muốn Chết", Normalizer.Form.NFD);
        assertThat(containsAny(normalize(nfd), "muốn chết")).isTrue();
        assertThat(stripDiacritics("Đột quỵ")).isEqualTo("Dot quy");
    }
}
