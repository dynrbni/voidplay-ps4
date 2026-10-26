# SPDX-License-Identifier: GPL-3.0-only
import sys
from pathlib import Path
import unittest
from PIL import Image
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tools'))
from prepare_assets import render_hero


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
