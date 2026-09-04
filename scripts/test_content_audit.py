"""Regression tests for the content audit; snippets are parsed, never executed."""
import contextlib
import importlib.util
import io
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("content_audit", Path(__file__).with_name("content-audit.py"))
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)


class ContentAuditTests(unittest.TestCase):
    def test_bash_is_parsed_without_execution_and_supports_unicode(self):
        with tempfile.TemporaryDirectory() as directory:
            marker = Path(directory) / "must-not-exist"
            self.assertIsNone(audit.check_bash(f'echo "blåbær"\ntouch "{marker.as_posix()}"'))
            self.assertFalse(marker.exists())
        self.assertIsNotNone(audit.check_bash('if true; then\necho unfinished'))

    def test_content_links_use_url_slashes_on_every_platform(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            docs = root / "src" / "content" / "docs"
            section = docs / "da" / "guides"
            section.mkdir(parents=True)
            (section / "index.mdx").write_text('[Article](/da/guides/example/)\n', encoding="utf-8")
            (section / "example.mdx").write_text('[Index](/da/guides/)\n', encoding="utf-8")
            with patch.multiple(audit, ROOT=root, DOCS=docs, PUBLIC=root / "public"):
                with contextlib.redirect_stdout(io.StringIO()) as output:
                    self.assertEqual(audit.main(), 0, output.getvalue())

    def test_javascript_accepts_node_red_return_but_rejects_invalid_code(self):
        self.assertIsNone(audit.check_javascript('msg.payload = "blåbær";\nreturn msg;'))
        self.assertIsNotNone(audit.check_javascript('const x = ;'))


if __name__ == "__main__":
    unittest.main()
