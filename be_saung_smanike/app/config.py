import os
from dotenv import load_dotenv
from urllib.parse import urlparse

# Muat file .env
load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'default-lewat-saja'
    DATABASE_URL = os.environ.get('DATABASE_URL') or 'mysql+pymysql://root:@localhost/saung_smanike'
    parsed_url = urlparse(DATABASE_URL)
    DB_HOST = parsed_url.hostname or 'localhost'
    DB_USER = parsed_url.username or 'root'
    DB_PASSWORD = parsed_url.password or ''
    DB_NAME = parsed_url.path.lstrip('/') or 'saung_smanike'
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'super-secret-key-smanike-zuha-2026')