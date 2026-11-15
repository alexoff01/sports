import sys
from pathlib import Path

# Adaugă folderul backend în calea de import
BACKEND_DIR = Path(__file__).resolve().parent / "backend"
sys.path.insert(0, str(BACKEND_DIR))

# Încarcă aplicația FastAPI existentă
from server import app
