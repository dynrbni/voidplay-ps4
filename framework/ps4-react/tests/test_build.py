# SPDX-License-Identifier: GPL-3.0-only
import json
from pathlib import Path
import tempfile
import struct
import unittest
from unittest.mock import patch
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tools'))
import build
class BuildTests(unittest.TestCase):
 def test_package_rejects_missing_bootstrap_modules_before_extraction(self):
  with tempfile.TemporaryDirectory() as directory:
   root=Path(directory)
   with patch.object(build,'run') as command:
    with self.assertRaisesRegex(ValueError,'required bootstrap'):
     build.verify_extracted('unused',root/'old-01.00.pkg',root,['eboot.bin','sce_sys/param.sfo'])
    command.assert_not_called()
 def test_bootstrap_must_be_a_dynamic_prx_not_an_eboot(self):
  with tempfile.TemporaryDirectory() as directory:
   root=Path(directory);(root/'sce_module').mkdir()
   data=bytearray(160);data[:4]=b'\x4f\x15\x3d\x1d'
   struct.pack_into('<HHQ',data,12,128,0,len(data));struct.pack_into('<H',data,24,1)
   struct.pack_into('<QQQQ',data,32,0,128,32,32)
   data[64:70]=b'\x7fELF\x02\x01';struct.pack_into('<HH',data,80,0xfe18,62)
   for name in build.RUNTIME_MODULES:(root/name).write_bytes(data)
   build.require_runtime_modules(root,build.RUNTIME_MODULES)
   struct.pack_into('<H',data,80,0xfe10);(root/build.RUNTIME_MODULES[0]).write_bytes(data)
   with self.assertRaisesRegex(ValueError,'dynamic PRX'):build.require_runtime_modules(root,build.RUNTIME_MODULES)
 def test_bootstrap_toolchain_input_hash_is_checked(self):
  with tempfile.TemporaryDirectory() as directory:
   root=Path(directory)
   with self.assertRaisesRegex(ValueError,'bootstrap input'):build.bootstrap_inputs(root)
   (root/'lib').mkdir();(root/'lib/crtlib.o').write_bytes(b'altered')
   with self.assertRaisesRegex(ValueError,'bootstrap input'):build.bootstrap_inputs(root)
 def test_bundler_rejects_broken_jsx_with_diagnostic(self):
  with tempfile.TemporaryDirectory() as directory:
   root=Path(directory);(root/'index.jsx').write_text('const broken = <View>')
   path=root/'app.json';path.write_text(json.dumps({'name':'broken','entry':'index.jsx'}))
   with self.assertRaisesRegex(RuntimeError,'ERROR'):
    build.run(['node',build.ROOT/'tools/bundle.mjs',path])
 def test_manifest_rejects_missing_unsafe_and_invalid_metadata(self):
  with tempfile.TemporaryDirectory() as directory:
   root=Path(directory);(root/'index.jsx').write_text('export default 1')
   good={'name':'hello','title':'Hello','titleId':'RCTX00001','version':'01.00','entry':'index.jsx'}
   path=root/'app.json';path.write_text(json.dumps(good));self.assertEqual(build.manifest(path)[0],good)
   for patch in [{'titleId':'../x'},{'version':'1.0'},{'entry':'../outside.jsx'},{'entry':'missing.jsx'},{'title':''},{'name':'Bad Name'},{'extra':'unsupported'}]:
    path.write_text(json.dumps({**good,**patch}))
    with self.assertRaises(ValueError):build.manifest(path)
 def test_missing_tools_and_command_failures_explain_the_problem(self):
  with patch.object(build.shutil,'which',return_value=None):
   with self.assertRaisesRegex(ValueError,'Missing tool'):build.tool('missing-example')
  with self.assertRaisesRegex(RuntimeError,'Command failed'):build.run([sys.executable,'-c','raise SystemExit(2)'])
 def test_missing_asset_fails_before_compilation(self):
  with tempfile.TemporaryDirectory() as directory:
   root=Path(directory)
   with patch.object(build,'DIST',root/'dist'),patch.object(build,'REPO',root),patch.object(build,'compile_target') as compiler:
    with self.assertRaisesRegex(ValueError,'Missing package icon'):build.package()
    compiler.assert_not_called()
 def test_failed_package_invalidates_previous_receipt(self):
  with tempfile.TemporaryDirectory() as directory:
   dist=Path(directory);receipt=dist/'receipt.json';receipt.write_text('{}')
   with patch.object(build,'DIST',dist),patch.object(build,'compile_target',side_effect=ValueError('missing SDK')):
    with self.assertRaisesRegex(ValueError,'missing SDK'):build.package()
   self.assertFalse(receipt.exists())
if __name__=='__main__':unittest.main()
