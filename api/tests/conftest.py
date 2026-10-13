# pytest loads conftest.py before it imports any test file, so anything set
# here is in place before a test does `from main import app`.
import os
import sys
from pathlib import Path

# db.py reads DATABASE_URL when it is imported and fails if it is missing.
# setdefault only fills it in when it is not already set. The value is a
# placeholder: no test connects to a database.
os.environ.setdefault("DATABASE_URL", "postgresql://unused")

# The app modules (main.py, rules.py, ...) live in api/, one folder up from
# this file. Adding api/ to Python's import path makes `import main` work
# whether pytest is run from api/ or from the repo root.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
