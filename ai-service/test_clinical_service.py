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


if __name__ == "__main__":
    unittest.main()
