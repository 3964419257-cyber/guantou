import unittest

from tools.materials.puxian import romanization


class PuxianRomanizationTest(unittest.TestCase):
    def test_split_puxian_pinyin(self):
        self.assertEqual(romanization.pinyin_to_initial("buai1"), "b")
        self.assertEqual(romanization.pinyin_to_final("buai1"), "uai")
        self.assertEqual(romanization.pinyin_to_tone("buai1"), "1")

    def test_pinyin_to_ipa(self):
        self.assertEqual(romanization.pinyin_to_ipa("buai1"), "puai533")
        self.assertEqual(romanization.pinyin_to_ipa("leh6"), "lɛʔ21")
        self.assertEqual(romanization.pinyin_to_ipa("ng2"), "ŋ13")

    def test_ipa_to_pinyin(self):
        self.assertEqual(romanization.ipa_to_pinyin("puai533"), "buai1")
        self.assertEqual(romanization.ipa_to_pinyin("lɛʔ2"), "leh6")
        self.assertEqual(romanization.ipa_to_pinyin("ŋ24"), "ng2")

    def test_fuzzy_candidates(self):
        self.assertEqual(romanization.fuzzy_pinyin_candidates("xieh"), {"sieh6", "sieh7"})
        self.assertIn("o1", romanization.fuzzy_pinyin_candidates("o"))
        self.assertIn("ou5", romanization.fuzzy_pinyin_candidates("o"))

    def test_invalid_input_raises(self):
        with self.assertRaises(ValueError):
            romanization.pinyin_to_ipa("123")


if __name__ == "__main__":
    unittest.main()
