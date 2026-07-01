import bcrypt
import datetime
from flask_jwt_extended import create_access_token 

class AuthController:
    @staticmethod
    def verify_login_loop(daftar_user, password_input):
        """
        Logika Loop Matching untuk mengantisipasi nama kembar.
        Mengecek password_input ke setiap user yang namanya cocok.
        """
        user_lolos = None
        for user in daftar_user:
            password_hashed = user['password']
            # Bcrypt butuh format bytes, jadi kita .encode() dulu
            if bcrypt.checkpw(password_input.encode('utf-8'), password_hashed.encode('utf-8')):
                user_lolos = user
                break # Jika ketemu yang cocok, langsung hentikan perulangan!
        return user_lolos

    @staticmethod
    def generate_jwt_token(user_id, role, nama_lengkap, id_siswa=None):
        """
        Membuat token JWT dengan aman memanfaatkan additional_claims 
        agar tidak memicu error 422 di versi Flask-JWT-Extended baru.
        """
        # Masukkan data tambahan ke dalam claims, JANGAN di dalam identity!
        data_tambahan = {
            'id_siswa': id_siswa,
            'role': role,
            'nama': nama_lengkap
        }
        
        # identity HANYA diisi string ID User murni (Sangat disarankan oleh library JWT)
        token = create_access_token(
            identity=str(user_id), 
            additional_claims=data_tambahan, 
            expires_delta=datetime.timedelta(days=1)
        )
        return token