from flask import Flask, jsonify
from flask_cors import CORS
import pymysql
from app.config import Config
from flask_jwt_extended import JWTManager  

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    CORS(app)

    # Inisialisasi JWTManager
    jwt = JWTManager(app)

    # ====================================================================
    # 💡 FIX UTAMA ERROR 422: Penangan Identity Berupa Dictionary / Object
    # ====================================================================
    @jwt.user_identity_loader
    def user_identity_lookup(user_data):
        # Jika token kamu berisi dictionary (id_user, role, nama), kembalikan ID-nya saja sebagai string murni
        if isinstance(user_data, dict):
            return str(user_data.get('id_user'))  
        return str(user_data)

    # ====================================================================
    # 💡 BONUS DEBUGGER: Mengubah Error 422 Menjadi Pesan Jelas di React
    # ====================================================================
    @jwt.invalid_token_loader
    def invalid_token_callback(error_string):
        return jsonify({
            "status": "error",
            "message": f"Token tidak valid / Cacat (Pemicu 422): {error_string}"
        }), 422

    @jwt.unauthorized_loader
    def missing_token_callback(error_string):
        return jsonify({
            "status": "error",
            "message": f"Token tidak ditemukan di Header: {error_string}"
        }), 401

    # KONEKSI DATABASE
    def get_db_connection():
        return pymysql.connect(
            host=app.config['DB_HOST'],
            user=app.config['DB_USER'],
            password=app.config['DB_PASSWORD'],
            database=app.config['DB_NAME'],
            cursorclass=pymysql.cursors.DictCursor  
        )
    
    app.get_db_connection = get_db_connection

    # AMBIL BLUEPRINT DARI MODELS
    from app.models.admin_models import admin_bp
    from app.models.auth_models import auth_bp
    from app.models.presensi_models import presensi_bp
    
    # REGISTER BLUEPRINT
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(presensi_bp, url_prefix='/api/presensi')

    @app.route('/')
    def index():
        return {
            "status": "success",
            "message": "Sipres SMANIK Backend dengan Flask & PyMySQL Ready!"
        }

    return app