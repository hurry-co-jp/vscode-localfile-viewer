"""
Local File Viewer - Python シンタックスハイライト確認用サンプル

このファイルはシンタックスハイライトの表示確認用です。
実行を意図したものではありません。
"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional
import json


@dataclass
class FileInfo:
    """ファイル情報を保持するデータクラス"""
    path: Path
    size: int
    group: str
    tags: list[str] = field(default_factory=list)

    @property
    def extension(self) -> str:
        return self.path.suffix.lower()

    @property
    def is_markdown(self) -> bool:
        return self.extension in ('.md', '.markdown')

    def to_dict(self) -> dict:
        return {
            'path': str(self.path),
            'size': self.size,
            'group': self.group,
            'tags': self.tags,
        }


class FileScanner:
    """指定ディレクトリ内のファイルをスキャンする"""

    GROUP_MAP: dict[str, tuple[str, ...]] = {
        'markdown': ('.md', '.markdown'),
        'image': ('.png', '.jpg', '.jpeg', '.gif', '.svg'),
        'code': ('.js', '.ts', '.py', '.sh', '.json'),
    }

    def __init__(self, root: Path):
        self.root = root
        self._files: list[FileInfo] = []

    def scan(self) -> list[FileInfo]:
        """ファイルをスキャンしてグループ分類する"""
        self._files = []
        for path in self.root.rglob('*'):
            if path.is_file():
                group = self._classify(path)
                info = FileInfo(
                    path=path.relative_to(self.root),
                    size=path.stat().st_size,
                    group=group,
                )
                self._files.append(info)
        return self._files

    def _classify(self, path: Path) -> str:
        ext = path.suffix.lower()
        for group, extensions in self.GROUP_MAP.items():
            if ext in extensions:
                return group
        return 'other'

    def export_json(self, output: Optional[Path] = None) -> str:
        data = [f.to_dict() for f in self._files]
        result = json.dumps(data, ensure_ascii=False, indent=2)
        if output:
            output.write_text(result, encoding='utf-8')
        return result


# デコレータの例
def log_call(func):
    def wrapper(*args, **kwargs):
        print(f"Calling {func.__name__}")
        result = func(*args, **kwargs)
        print(f"Finished {func.__name__}")
        return result
    return wrapper


@log_call
def main():
    scanner = FileScanner(Path('.'))
    files = scanner.scan()

    # リスト内包表記とf-string
    markdown_files = [f for f in files if f.is_markdown]
    print(f"Found {len(markdown_files)} markdown files")

    # walrus演算子
    if (count := len(files)) > 0:
        print(f"Total: {count} files scanned")


if __name__ == '__main__':
    main()
