package com.hospital.hmsai.clinical.safety;

import java.text.Normalizer;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.function.Predicate;

/**
 * Đối chiếu dị ứng đã ghi nhận của bệnh nhân với tên thuốc sắp kê (kiểm tra an toàn trước khi lưu đơn).
 * <ul>
 *   <li>Chuẩn hóa: bỏ dấu tiếng Việt (kể cả đ/Đ), chữ thường, ký tự đặc biệt thành khoảng trắng.</li>
 *   <li>Đối chiếu hai chiều: tên dị ứng nằm trong tên thuốc, hoặc hoạt chất (từ) của tên thuốc nằm trong tên dị ứng.
 *       Chuỗi từ 5 ký tự trở lên so khớp chuỗi con (VD "penicillin" trong "benzylpenicillin"); chuỗi 3–4 ký tự
 *       chỉ so khớp nguyên từ để tránh khớp nhầm (VD "ace" không khớp "paracetamol").</li>
 *   <li>Bỏ qua dị ứng rỗng hoặc ngắn hơn 3 ký tự.</li>
 *   <li>Đối chiếu theo nhóm thuốc: penicillin, cephalosporin, NSAID, sulfonamide (dị ứng một thuốc/nhóm
 *       cảnh báo các thuốc cùng nhóm).</li>
 * </ul>
 */
public final class AllergyDrugMatcher {

    private static final int MIN_LENGTH = 3;
    private static final int SUBSTRING_MIN_LENGTH = 5;

    /** Từ chung chung trong tên thuốc, không coi là hoạt chất khi đối chiếu ngược. */
    private static final Set<String> STOP_WORDS = Set.of(
            "thuoc", "vien", "nang", "nen", "goi", "ong", "siro", "dung", "dich", "tiem", "uong", "kem", "bot",
            "tablet", "tablets", "tab", "capsule", "capsules", "cap", "syrup", "injection", "cream",
            "forte", "plus", "extra", "retard", "sodium", "natri", "kali", "potassium", "hydrochloride", "hcl",
            "acid", "and", "with", "mg", "ml", "mcg");

    private record DrugClass(String label, List<String> aliases, Predicate<String> member) {
    }

    private static final List<DrugClass> DRUG_CLASSES = List.of(
            new DrugClass("penicillin",
                    List.of("penicillin", "penicilin", "penicilline", "penicillins"),
                    t -> t.contains("cillin") || t.contains("cilin") || t.equals("augmentin")),
            new DrugClass("cephalosporin",
                    List.of("cephalosporin", "cephalosporine", "cephalosporins", "cefalosporin"),
                    t -> t.startsWith("cef") || t.startsWith("ceph")),
            new DrugClass("NSAID (kháng viêm không steroid)",
                    List.of("nsaid", "nsaids", "ains", "khang viem khong steroid", "chong viem khong steroid",
                            "khang viem non steroid"),
                    t -> Set.of("ibuprofen", "diclofenac", "aspirin", "acetylsalicylic", "naproxen", "meloxicam",
                            "ketorolac", "piroxicam", "celecoxib", "etoricoxib", "indomethacin", "ketoprofen").contains(t)),
            new DrugClass("sulfonamide (sulfa)",
                    List.of("sulfa", "sulfonamide", "sulfonamid", "sulphonamide", "sulfamid", "sulfamide"),
                    t -> t.startsWith("sulfa") || t.startsWith("sulpha")
                            || Set.of("cotrimoxazole", "trimoxazole", "bactrim", "biseptol").contains(t))
    );

    private AllergyDrugMatcher() {
    }

    /**
     * Chuẩn hóa chuỗi để so khớp: bỏ dấu, chữ thường, chỉ giữ [a-z0-9] và khoảng trắng đơn.
     */
    public static String normalize(String text) {
        if (text == null) {
            return "";
        }
        String s = text.replace('đ', 'd').replace('Đ', 'D');
        s = Normalizer.normalize(s, Normalizer.Form.NFD).replaceAll("\\p{M}+", "");
        return s.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", " ").trim();
    }

    /**
     * Tìm lý do thuốc khớp với dị ứng.
     *
     * @return mô tả lý do khớp (tiếng Việt) hoặc rỗng nếu không khớp
     */
    public static Optional<String> findMatch(String allergen, String drugName) {
        String a = normalize(allergen);
        String d = normalize(drugName);
        if (a.length() < MIN_LENGTH || d.isEmpty()) {
            return Optional.empty();
        }

        // 1. Tên dị ứng nằm trong tên thuốc
        if (containsTerm(d, a)) {
            return Optional.of("trùng tên/hoạt chất với dị ứng đã ghi nhận");
        }

        // 2. Hoạt chất trong tên thuốc nằm trong mô tả dị ứng
        List<String> drugTokens = activeTokens(d);
        for (String token : drugTokens) {
            if (containsTerm(a, token)) {
                return Optional.of("chứa hoạt chất '" + token + "' trùng với dị ứng đã ghi nhận");
            }
        }

        // 3. Cùng nhóm thuốc (dị ứng chéo)
        List<String> allergenTokens = activeTokens(a);
        for (DrugClass drugClass : DRUG_CLASSES) {
            boolean allergenInClass = drugClass.aliases().stream().anyMatch(alias -> containsTerm(a, alias))
                    || allergenTokens.stream().anyMatch(drugClass.member());
            boolean drugInClass = drugTokens.stream().anyMatch(drugClass.member());
            if (allergenInClass && drugInClass) {
                return Optional.of("thuộc nhóm " + drugClass.label() + " – nguy cơ dị ứng chéo");
            }
        }
        return Optional.empty();
    }

    private static List<String> activeTokens(String normalized) {
        return Arrays.stream(normalized.split(" "))
                .filter(t -> t.length() >= MIN_LENGTH)
                .filter(t -> t.chars().allMatch(Character::isLetter))
                .filter(t -> !STOP_WORDS.contains(t))
                .toList();
    }

    /** {@code term} xuất hiện trong {@code text}: chuỗi con nếu đủ dài, ngược lại phải là nguyên từ. */
    private static boolean containsTerm(String text, String term) {
        if (term.length() < MIN_LENGTH) {
            return false;
        }
        if (term.length() >= SUBSTRING_MIN_LENGTH) {
            return text.contains(term);
        }
        return (" " + text + " ").contains(" " + term + " ");
    }
}
