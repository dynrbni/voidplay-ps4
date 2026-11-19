# SPDX-License-Identifier: GPL-3.0-only
import sys
from pathlib import Path
import unittest
from PIL import Image
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tools'))
from prepare_assets import render_hero, font_sources, font_plan


class ArtworkQualityTests(unittest.TestCase):
 def test_small_portrait_is_never_enlarged_into_fullscreen_artwork(self):
  cover=Image.new('RGB',(284,351),'#ad5c38');image,quality=render_hero(cover,cover)
  self.assertEqual(image.size,(1920,1080));self.assertFalse(quality['landscape']);self.assertFalse(quality['enlarged'])
  self.assertEqual(quality['region'][2:],[284,351])
 def test_720p_landscape_keeps_its_source_pixel_dimensions(self):
  source=Image.new('RGB',(1280,720),'#aaccee');_,quality=render_hero(source,source)
  self.assertTrue(quality['landscape']);self.assertEqual(quality['region'][2:],[1280,720]);self.assertFalse(quality['enlarged'])
 def test_large_landscape_is_downsampled_to_native_full_hd(self):
  source=Image.new('RGB',(3840,2160),'#ab5632');image,quality=render_hero(source,source)
  self.assertEqual(image.size,(1920,1080));self.assertEqual(quality['region'],[0,0,1920,1080]);self.assertFalse(quality['enlarged'])


class FontAssetTests(unittest.TestCase):
 def test_font_source_is_present_and_supports_every_requested_web_weight(self):
  path=Path(__file__).resolve().parents[1]/'apps/voidplay/assets/Manrope.ttf'
  self.assertEqual(font_sources(path),(200,800))
  self.assertEqual(font_plan()['weights'],[400,500,550,600,650,700,750,800])
 def test_missing_font_fails_before_baking_with_the_actual_path(self):
  with self.assertRaisesRegex(ValueError,'Missing bundled font file'):
   font_sources(Path('/nonexistent/voidplay-font.ttf'))
