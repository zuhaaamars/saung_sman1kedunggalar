from flask import Blueprint, request, jsonify, current_app
from app.controllers.auth_controllers import AuthController

auth_bp = Blueprint('auth', __name__)

class AuthModel:
    @staticmethod
    @auth_bp.route('/login', methods=['GET', 'POST'])
    def login():
        # Jika diakses langsung via browser (GET)
        if request.method == 'GET':
            return jsonify({
                "status": "success",
                "message": "Endpoint Login Aktif! Silakan gunakan Postman/Thunder Client dengan metode POST untuk masuk."
            }), 200

        # Jika diakses via POST (Mengirim Data Akun)
        data = request.get_json() or {}
        username_input = data.get('username') 
        password_input = data.get('password') 
        
        if not username_input or not password_input:
            return jsonify({"status": "error", "message": "Username dan password wajib diisi!"}), 400
            
        db = current_app.get_db_connection()
        cursor = db.cursor()
        
        try:
            # LEFT JOIN ke tabel siswa dan staff untuk mendapatkan ID relasional
            query = """
                SELECT 
                    u.id, u.username, u.password, u.role, u.nama_lengkap, 
                    s.jabatan,
                    sw.id AS id_siswa
                FROM users u
                LEFT JOIN staff s ON u.id = s.user_id
                LEFT JOIN siswa sw ON u.id = sw.user_id
                WHERE u.username = %s
            """
            cursor.execute(query, (username_input,))
            daftar_user = cursor.fetchall()
            
            if not daftar_user:
                return jsonify({"status": "error", "message": "Akun tidak ditemukan!"}), 404
            
            # Jalankan taktik Loop Matching
            user_terverifikasi = AuthController.verify_login_loop(daftar_user, password_input)
            
            if not user_terverifikasi:
                return jsonify({"status": "error", "message": "Password salah!"}), 401
                
            id_siswa_terdeteksi = user_terverifikasi.get('id_siswa')

            token = AuthController.generate_jwt_token(
                user_id=user_terverifikasi['id'],
                role=user_terverifikasi['role'],
                nama_lengkap=user_terverifikasi['nama_lengkap'],
                id_siswa=id_siswa_terdeteksi
            )
            
            return jsonify({
                "status": "success",
                "message": "Login berhasil!",
                "token": token,
                "user": {
                    "id": user_terverifikasi['id'],
                    "id_siswa": id_siswa_terdeteksi, # Ditambahkan agar React bisa menyimpan ke localStorage
                    "nama": user_terverifikasi['nama_lengkap'],
                    "role": user_terverifikasi['role'],
                    "jabatan": user_terverifikasi.get('jabatan') 
                }
            }), 200
            
        except Exception as e:
            return jsonify({"status": "error", "message": f"Server error: {str(e)}"}), 500
        finally:
            cursor.close()
            db.close()