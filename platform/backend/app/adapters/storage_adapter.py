from pathlib import Path


class LocalStorageAdapter:
    def __init__(self, root_dir: str):
        self.root_dir = Path(root_dir)
        self.root_dir.mkdir(parents=True, exist_ok=True)

    def save_bytes(self, relative_path: str, content: bytes) -> str:
        destination = self.root_dir / relative_path
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(content)
        return str(destination)
