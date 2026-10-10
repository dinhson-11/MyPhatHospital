"""
Unit test cho ClinicalAlertService (FastAPI).
Chạy: python -m unittest test_clinical_service.py
"""

import unittest
from models.clinical import DrugItem, PatientAllergyItem
from services.clinical_alert_service import ClinicalAlertService


class TestClinicalAlertService(unittest.TestCase):

    def test_aspirin_warfarin_critical_interaction(self):
        drugs = [
            DrugItem(id=3, code="DRUG-ASP-81", name="Aspirin 81mg"),
            DrugItem(id=4, code="DRUG-WAR-5", name="Warfarin 5mg"),
        ]
        res = ClinicalAlertService.check_drug_interactions(drugs)
        self.assertTrue(res.has_interaction)
        self.assertTrue(res.has_critical)
        self.assertEqual(res.total_interactions, 1)
        self.assertEqual(res.interactions[0].severity, "CRITICAL")
        self.assertIn("xuất huyết", res.interactions[0].description)
        self.assertIn("tham khảo", res.disclaimer)

    def test_safe_drugs_no_interaction(self):
        drugs = [
            DrugItem(id=1, code="DRUG-PARA-500", name="Paracetamol 500mg"),
            DrugItem(id=5, code="DRUG-AMOX-500", name="Amoxicillin 500mg"),
        ]
        res = ClinicalAlertService.check_drug_interactions(drugs)
        self.assertFalse(res.has_interaction)
        self.assertFalse(res.has_critical)
        self.assertEqual(res.total_interactions, 0)
        self.assertIn("tham khảo", res.disclaimer)

    def test_direct_allergy_match(self):
        allergies = [
            PatientAllergyItem(allergen="Paracetamol", severity="SEVERE", note="Nổi mề đay toàn thân"),
        ]
        drugs = [
            DrugItem(id=1, code="DRUG-PARA-500", name="Paracetamol 500mg"),
        ]
        res = ClinicalAlertService.check_patient_allergies(allergies, drugs)
        self.assertTrue(res.has_allergy_conflict)
        self.assertTrue(res.has_critical)
        self.assertEqual(res.total_alerts, 1)
        self.assertEqual(res.alerts[0].reaction_type, "DIRECT_MATCH")

    def test_cross_allergy_penicillin_and_amoxicillin(self):
        allergies = [
            PatientAllergyItem(allergen="Penicillin", severity="SEVERE", note="Sốc phản vệ năm 2020"),
        ]
        drugs = [
            DrugItem(id=5, code="DRUG-AMOX-500", name="Amoxicillin 500mg"),
        ]
        res = ClinicalAlertService.check_patient_allergies(allergies, drugs)
        self.assertTrue(res.has_allergy_conflict)
        self.assertTrue(res.has_critical)
        self.assertEqual(res.alerts[0].reaction_type, "DIRECT_MATCH")

    def test_cross_allergy_penicillin_and_ceftriaxone(self):
        allergies = [
            PatientAllergyItem(allergen="Penicillin", severity="MODERATE"),
        ]
        drugs = [
            DrugItem(id=12, code="DRUG-CEFT-1G", name="Ceftriaxone 1g (Lọ tiêm)"),
        ]
        res = ClinicalAlertService.check_patient_allergies(allergies, drugs)
        self.assertTrue(res.has_allergy_conflict)
        self.assertEqual(res.alerts[0].reaction_type, "CROSS_REACTIVITY")
        self.assertEqual(res.alerts[0].severity, "WARNING")

    def test_prescription_safety_combined(self):
        allergies = [
            PatientAllergyItem(allergen="Aspirin", severity="SEVERE"),
        ]
        drugs = [
            DrugItem(id=3, code="DRUG-ASP-81", name="Aspirin 81mg"),
            DrugItem(id=4, code="DRUG-WAR-5", name="Warfarin 5mg"),
        ]
        res = ClinicalAlertService.check_prescription_safety(drugs, allergies)
        self.assertFalse(res.is_safe)
        self.assertTrue(res.has_warning)
        self.assertTrue(res.has_critical)
        self.assertEqual(res.interaction_count, 1)
        self.assertEqual(res.allergy_count, 1)
        self.assertIn("tham khảo", res.disclaimer)


def _drug(i, name, ingredient=None):
    return DrugItem(id=i, name=name, active_ingredient=ingredient)


class TestDrugInteractionRules(unittest.TestCase):
    """C3 / M3 / LOW: luật tương tác theo nhóm thuốc, đối xứng, không phân biệt hoa thường & dấu."""

    def _check(self, *names):
        return ClinicalAlertService.check_drug_interactions([_drug(i, n) for i, n in enumerate(names, 1)])

    def test_nsaid_plus_warfarin_is_critical_for_every_nsaid(self):
        for nsaid in ["Ibuprofen 400mg", "Diclofenac 50mg", "Meloxicam 7.5mg", "Naproxen 250mg",
                      "Ketorolac 10mg", "Piroxicam 20mg", "Celecoxib 200mg"]:
            res = self._check(nsaid, "Warfarin 5mg")
            self.assertTrue(res.has_critical, nsaid)
            self.assertEqual(res.interactions[0].severity, "CRITICAL", nsaid)
            self.assertIn("xuất huyết", res.interactions[0].description)

    def test_lookup_is_symmetric_and_case_insensitive(self):
        forward = self._check("NAPROXEN 500MG", "warfarin")
        reverse = self._check("Warfarin", "naproxen")
        self.assertEqual(forward.total_interactions, 1)
        self.assertEqual(reverse.total_interactions, 1)
        self.assertEqual(forward.interactions[0].severity, reverse.interactions[0].severity)

    def test_active_ingredient_is_used_for_brand_names(self):
        res = ClinicalAlertService.check_drug_interactions([
            _drug(1, "Klacid 500mg", "Clarithromycin"),
            _drug(2, "Lanoxin 0.25mg", "Digoxin"),
        ])
        self.assertTrue(res.has_critical)

    def test_clarithromycin_digoxin_critical(self):
        res = self._check("Clarithromycin 500mg", "Digoxin 0.25mg")
        self.assertEqual(res.interactions[0].severity, "CRITICAL")

    def test_clarithromycin_warfarin_warning_inr(self):
        res = self._check("Warfarin 2mg", "Clarithromycin 250mg")
        self.assertEqual(res.total_interactions, 1)
        self.assertEqual(res.interactions[0].severity, "WARNING")
        self.assertIn("INR", res.interactions[0].description)

    def test_nsaid_with_antihypertensives_warning(self):
        for antihtn in ["Enalapril 5mg", "Losartan 50mg", "Furosemid 40mg", "Hydroclorothiazid 25mg"]:
            res = self._check("Diclofenac 50mg", antihtn)
            self.assertEqual(res.total_interactions, 1, antihtn)
            self.assertEqual(res.interactions[0].severity, "WARNING", antihtn)

    def test_duplicate_nsaid_therapy_warning(self):
        res = self._check("Ibuprofen 400mg", "Meloxicam 15mg")
        self.assertEqual(res.total_interactions, 1)
        self.assertEqual(res.interactions[0].severity, "WARNING")
        self.assertIn("MỘT thuốc NSAID", res.interactions[0].recommendation)

    def test_statin_clarithromycin_split_by_statin(self):
        simva = self._check("Simvastatin 20mg", "Clarithromycin 500mg")
        self.assertEqual(simva.interactions[0].severity, "CRITICAL")
        self.assertIn("CHỐNG CHỈ ĐỊNH", simva.interactions[0].recommendation)
        lova = self._check("Lovastatin 20mg", "Clarithromycin 500mg")
        self.assertEqual(lova.interactions[0].severity, "CRITICAL")
        atorva = self._check("Atorvastatin 40mg", "Clarithromycin 500mg")
        self.assertEqual(atorva.interactions[0].severity, "WARNING")
        self.assertIn("20 mg", atorva.interactions[0].recommendation)
        self.assertNotIn("CHỐNG CHỈ ĐỊNH", atorva.interactions[0].recommendation)

    def test_interactions_sorted_by_severity(self):
        res = self._check("Paracetamol 500mg", "Warfarin 5mg", "Clarithromycin 500mg", "Ibuprofen 400mg")
        ranks = {"CRITICAL": 3, "WARNING": 2, "INFO": 1}
        severities = [ranks[i.severity] for i in res.interactions]
        self.assertEqual(severities, sorted(severities, reverse=True))
        self.assertEqual(res.interactions[0].severity, "CRITICAL")
        self.assertEqual(res.interactions[-1].severity, "INFO")

    def test_info_only_prescription_is_still_safe(self):
        res = ClinicalAlertService.check_prescription_safety(
            [_drug(1, "Paracetamol 500mg"), _drug(2, "Warfarin 5mg")], [])
        self.assertEqual(res.interaction_count, 1)
        self.assertEqual(res.interactions[0].severity, "INFO")
        self.assertTrue(res.is_safe)
        self.assertFalse(res.has_warning)
        self.assertFalse(res.has_critical)


class TestAllergyCrossReactivity(unittest.TestCase):
    """H4 / H5 / H6: chính tả tiếng Việt, gốc từ, họ thuốc mới, nâng mức khi dị ứng nặng, không khớp chuỗi con."""

    def _check(self, allergen, drug_name, severity="MODERATE"):
        return ClinicalAlertService.check_patient_allergies(
            [PatientAllergyItem(allergen=allergen, severity=severity)], [_drug(1, drug_name)])

    def test_vietnamese_spellings(self):
        cases = [
            ("Penicilin", "Amoxicilin 500mg", "CRITICAL"),
            ("penicillin", "Ampicilin 1g", "CRITICAL"),
            ("Penicilin", "Ceftriaxon 1g", "WARNING"),
            ("Penicillin", "Cefalexin 500mg", "WARNING"),
            ("Amoxicilin", "Amoxicillin 250mg", "CRITICAL"),
        ]
        for allergen, drug_name, severity in cases:
            res = self._check(allergen, drug_name)
            self.assertTrue(res.has_allergy_conflict, f"{allergen} -> {drug_name}")
            self.assertEqual(res.alerts[0].severity, severity, f"{allergen} -> {drug_name}")

    def test_cephalosporin_family(self):
        direct = self._check("Cephalosporin", "Cefuroxime 500mg")
        self.assertEqual(direct.alerts[0].severity, "CRITICAL")
        cross = self._check("Ceftriaxone", "Amoxicillin 500mg")
        self.assertEqual(cross.alerts[0].reaction_type, "CROSS_REACTIVITY")

    def test_carbapenem_family(self):
        res = self._check("Penicillin", "Meropenem 1g")
        self.assertEqual(res.alerts[0].reaction_type, "CROSS_REACTIVITY")
        res = self._check("Imipenem", "Meropenem 1g")
        self.assertEqual(res.alerts[0].severity, "CRITICAL")

    def test_sulfonamide_family(self):
        for drug_name in ["Sulfamethoxazol + Trimethoprim", "Cotrimoxazol 480mg", "Bactrim"]:
            res = self._check("Sulfa", drug_name)
            self.assertTrue(res.has_critical, drug_name)

    def test_sulfa_does_not_match_sulfate_salts(self):
        for drug_name in ["Magnesium sulfate 15%", "Ferrous sulfate 325mg"]:
            res = self._check("Sulfa", drug_name, severity="SEVERE")
            self.assertFalse(res.has_allergy_conflict, drug_name)

    def test_nsaid_allergy_covers_naproxen_and_ketorolac(self):
        for drug_name in ["Naproxen 250mg", "Ketorolac 30mg"]:
            res = self._check("Ibuprofen", drug_name)
            self.assertTrue(res.has_critical, drug_name)

    def test_severe_allergy_escalates_cross_reactivity_to_critical(self):
        moderate = self._check("Penicillin", "Ceftriaxone 1g", severity="MODERATE")
        self.assertEqual(moderate.alerts[0].severity, "WARNING")
        severe = self._check("Penicillin", "Ceftriaxone 1g", severity="SEVERE")
        self.assertEqual(severe.alerts[0].severity, "CRITICAL")
        self.assertEqual(severe.alerts[0].reaction_type, "CROSS_REACTIVITY")
        self.assertTrue(severe.has_critical)

    def test_blank_or_too_short_allergen_is_skipped(self):
        res = ClinicalAlertService.check_patient_allergies(
            [PatientAllergyItem(allergen="   "), PatientAllergyItem(allergen="a"), PatientAllergyItem(allergen="ab")],
            [_drug(1, "Paracetamol 500mg"), _drug(2, "Amoxicillin 500mg")],
        )
        self.assertFalse(res.has_allergy_conflict)
        self.assertEqual(res.total_alerts, 0)

    def test_one_alert_per_drug_allergen_pair(self):
        res = self._check("Beta-lactam", "Ceftriaxone 1g")
        self.assertEqual(res.total_alerts, 1)
        self.assertEqual(res.alerts[0].severity, "CRITICAL")

    def test_composite_allergen_matches_component(self):
        res = self._check("Amoxicillin/Clavulanate", "Amoxicillin 500mg")
        self.assertEqual(res.alerts[0].reaction_type, "DIRECT_MATCH")


if __name__ == "__main__":
    unittest.main()
