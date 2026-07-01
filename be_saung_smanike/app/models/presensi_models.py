from flask import Blueprint, request, jsonify, current_app, make_response
from datetime import datetime
from flask_jwt_extended import jwt_required, get_jwt_identity, decode_token
from app.controllers.presensi_controllers import PresensiController # Import controllernya

presensi_bp = Blueprint('presensi_mapel', __name__)

class PresensiModel:

# PRESENSI MAPEL
    @staticmethod
    @presensi_bp.route('/guru/generate-qr', methods=['POST', 'OPTIONS'])
    def generate_qr_guru():
        # 💡 FIX CORS OPTIONS: Jawab preflight request dari browser React secara langsung
        if request.method == 'OPTIONS':
            response = make_response()
            response.headers.add("Access-Control-Allow-Origin", "http://localhost:3000")
            response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
            response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
            return response, 200

        data = request.get_json() or {}
        id_jadwal = data.get('id_jadwal')
        
        if not id_jadwal:
            res = jsonify({"status": "error", "message": "ID Jadwal wajib diisi!"})
            res.headers.add("Access-Control-Allow-Origin", "http://localhost:3000")
            return res, 400
            
        db = current_app.get_db_connection()
        try:
            hasil = PresensiController.generate_qr_logic(db, id_jadwal)
            res = jsonify({
                "status": "success", 
                "message": "Sesi absensi QR berhasil diaktifkan!", 
                "qr_token": hasil["qr_token"]
            })
            # 💡 FIX CORS POST: Izinkan frontend membaca data response token QR
            res.headers.add("Access-Control-Allow-Origin", "http://localhost:3000")
            return res, 200
        except Exception as e:
            res = jsonify({"status": "error", "message": str(e)})
            res.headers.add("Access-Control-Allow-Origin", "http://localhost:3000")
            return res, 500
        finally:
            db.close()
    
    @staticmethod
    @presensi_bp.route('/mapel/scan', methods=['POST', 'OPTIONS'])
    def scan_presensi_siswa():
        # 💡 FIX CORS OPTIONS: Jawab preflight request dari browser siswa (React)
        if request.method == 'OPTIONS':
            response = make_response()
            response.headers.add("Access-Control-Allow-Origin", "http://localhost:3000")
            response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
            response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
            return response, 200

        data = request.get_json() or {}
        db = current_app.get_db_connection()
        try:
            # Panggil fungsi logika scan yang sudah ada di PresensiController Anda
            hasil, status_code = PresensiController.scan_presensi_logic(db, data)
            res = jsonify(hasil)
            
            # 💡 FIX CORS POST: Izinkan frontend port 3000 membaca responnya
            res.headers.add("Access-Control-Allow-Origin", "http://localhost:3000")
            return res, status_code
        except Exception as e:
            res = jsonify({"status": "error", "message": str(e)})
            res.headers.add("Access-Control-Allow-Origin", "http://localhost:3000")
            return res, 500
        finally:
            db.close()
    
    @staticmethod
    @presensi_bp.route('/guru/jurnal-presensi', methods=['GET', 'OPTIONS'])
    def get_jurnal_presensi():
        id_jadwal = request.args.get('id_jadwal')
        tanggal = request.args.get('tanggal')
        
        if not id_jadwal or not tanggal:
            return jsonify({"status": "error", "message": "Parameter id_jadwal dan tanggal wajib diisi!"}), 400
            
        db = current_app.get_db_connection()
        try:
            hasil, status_code = PresensiController.get_jurnal_presensi_logic(db, int(id_jadwal), tanggal)
            return jsonify(hasil), status_code
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500
        finally:
            db.close()

    @presensi_bp.route('/guru/simpan-jurnal', methods=['POST', 'OPTIONS'])
    def simpan_jurnal_presensi():
        # 💡 FIX CORS OPTIONS PERMANEN: Kirim header manual yang disukai browser
        if request.method == 'OPTIONS':
            response = make_response()
            response.headers.add("Access-Control-Allow-Origin", "http://localhost:3000")
            response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
            response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
            return response, 200

        # Proses request POST yang asli setelah lolos preflight OPTIONS
        data = request.get_json() or {}
        id_jadwal = data.get('id_jadwal')
        tanggal = data.get('tanggal')
        data_siswa = data.get('data_siswa', [])
        
        if not id_jadwal or not tanggal:
            res = jsonify({"status": "error", "message": "Data input id_jadwal dan tanggal tidak lengkap."})
            res.headers.add("Access-Control-Allow-Origin", "http://localhost:3000")
            return res, 400
            
        db = current_app.get_db_connection()
        try:
            hasil, status_code = PresensiController.simpan_jurnal_presensi_logic(db, int(id_jadwal), tanggal, data_siswa)
            res = jsonify(hasil)
            # 💡 Tambahkan header akses origin agar browser React di port 3000 diizinkan membaca hasilnya
            res.headers.add("Access-Control-Allow-Origin", "http://localhost:3000")
            return res, status_code
        except Exception as e:
            print(f"🛑 ERROR SIMPAN JURNAL MAPEL: {str(e)}")
            res = jsonify({"status": "error", "message": str(e)})
            res.headers.add("Access-Control-Allow-Origin", "http://localhost:3000")
            return res, 500
        finally:
            db.close()

# PRESENSI HARIAN
    @presensi_bp.route('/status-hari-ini/<int:id_siswa>', methods=['GET', 'OPTIONS'])
    def get_status_hari_ini_siswa(id_siswa):
        if request.method == 'OPTIONS':
            response = make_response()
            response.headers.add("Access-Control-Allow-Origin", "http://localhost:3000")
            response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
            response.headers.add('Access-Control-Allow-Methods', 'GET,OPTIONS')
            return response, 200

        db = current_app.get_db_connection()
        try:
            # Panggil logika tanpa unpacking paksa tuple
            hasil = PresensiController.get_status_hari_ini_logic(db, id_siswa)
            
            # Jika hasil bertipe tuple (jika controller-mu mengembalikan dua nilai)
            if isinstance(hasil, tuple):
                res = jsonify(hasil[0])
                status_code = hasil[1]
            else:
                res = jsonify(hasil)
                status_code = 200 if hasil.get('status') != 'error' else 400

            res.headers.add("Access-Control-Allow-Origin", "http://localhost:3000")
            return res, status_code
        except Exception as e:
            print(f"❌ CRASH STATUS HARI INI: {str(e)}") # Intip error asli di terminal Flask
            res = jsonify({"status": "error", "message": str(e)})
            res.headers.add("Access-Control-Allow-Origin", "http://localhost:3000")
            return res, 500
        finally:
            db.close()

    @presensi_bp.route('/riwayat/<int:id_siswa>', methods=['GET', 'OPTIONS'])
    def get_riwayat_siswa(id_siswa):
        if request.method == 'OPTIONS':
            response = make_response()
            response.headers.add("Access-Control-Allow-Origin", "http://localhost:3000")
            response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
            response.headers.add('Access-Control-Allow-Methods', 'GET,OPTIONS')
            return response, 200

        db = current_app.get_db_connection()
        try:
            hasil = PresensiController.get_riwayat_siswa_logic(db, id_siswa)
            
            if isinstance(hasil, tuple):
                res = jsonify(hasil[0])
                status_code = hasil[1]
            else:
                res = jsonify(hasil)
                status_code = 200 if hasil.get('status') != 'error' else 400

            res.headers.add("Access-Control-Allow-Origin", "http://localhost:3000")
            return res, status_code
        except Exception as e:
            print(f"❌ CRASH RIWAYAT: {str(e)}") # Intip error asli di terminal Flask
            res = jsonify({"status": "error", "message": str(e)})
            res.headers.add("Access-Control-Allow-Origin", "http://localhost:3000")
            return res, 500
        finally:
            db.close()

    @presensi_bp.route('/harian', methods=['POST', 'OPTIONS'])
    def submit_presensi_harian():
        if request.method == 'OPTIONS':
            response = make_response()
            response.headers.add("Access-Control-Allow-Origin", "http://localhost:3000")
            response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
            response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
            return response, 200

        data = request.get_json() or {}
        id_siswa = data.get('id_siswa')
        
        if not id_siswa:
            res = jsonify({
                "status": "error", 
                "message": "Data siswa (id_siswa) tidak terdeteksi oleh sistem backend."
            })
            res.headers.add("Access-Control-Allow-Origin", "http://localhost:3000")
            return res, 400 

        db = current_app.get_db_connection() 
        try:
            # Menggunakan nama fungsi sesuai berkas tes.txt bawaan Anda
            hasil = PresensiController.submit_presensi_harian_logic(db, data) 
            
            if isinstance(hasil, tuple):
                res = jsonify(hasil[0])
                status_code = hasil[1]
            else:
                res = jsonify(hasil)
                status_code = 200 if hasil.get('status') != 'error' else 400

            res.headers.add("Access-Control-Allow-Origin", "http://localhost:3000")
            return res, status_code
        except Exception as e:
            print(f"❌ CRASH SUBMIT HARIAN: {str(e)}") # Intip error asli di terminal Flask
            res = jsonify({"status": "error", "message": str(e)})
            res.headers.add("Access-Control-Allow-Origin", "http://localhost:3000")
            return res, 500
        finally:
            db.close()

    @presensi_bp.route('/jurnal-harian', methods=['GET'])
    def get_jurnal_harian():
        kelas = request.args.get('kelas')
        tanggal = request.args.get('tanggal')
        
        if not kelas or not tanggal:
            return jsonify({"status": "error", "message": "Parameter kelas dan tanggal wajib diisi!"}), 400
            
        db = current_app.get_db_connection()
        try:
            hasil, status_code = PresensiController.get_jurnal_harian_logic(db, kelas, tanggal)
            return jsonify(hasil), status_code
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500
        finally:
            db.close()

    # 💡 PERBAIKAN: Cukup tulis '/simpan-harian'
    @presensi_bp.route('/simpan-harian', methods=['POST'])
    def simpan_jurnal_harian():
        data = request.get_json() or {}
        kelas = data.get('kelas')
        tanggal = data.get('tanggal')
        data_siswa = data.get('data_siswa', [])
        
        if not kelas or not tanggal:
            return jsonify({"status": "error", "message": "Data input kelas dan tanggal tidak lengkap."}), 400
            
        db = current_app.get_db_connection()
        try:
            # Memanggil fungsi logika penyimpanan data utama
            hasil, status_code = PresensiController.simpan_jurnal_harian_logic(db, kelas, tanggal, data_siswa)
            return jsonify(hasil), status_code
        except Exception as e:
            # Menampilkan detail kesalahan pada terminal konsol Flask untuk pelacakan
            print(f"🛑 CRASH ROUTER SIMPAN HARIAN: {str(e)}")
            return jsonify({"status": "error", "message": f"Kesalahan Sistem internal: {str(e)}"}), 500
        finally:
            db.close()
    
    # Pastikan menggunakan presensi_bp (atau nama blueprint Anda yang sesuai)
    @presensi_bp.route('/master-kelas', methods=['GET', 'OPTIONS'])
    def get_master_kelas():
        db = current_app.get_db_connection()
        cursor = db.cursor()
        try:
            query = "SELECT nama_kelas FROM master_kelas ORDER BY tingkat ASC, nama_kelas ASC"
            cursor.execute(query)
            rows = cursor.fetchall()
            
            daftar_kelas = []
            for item_kelas in rows:
                if isinstance(item_kelas, dict):
                    nama_kelas_string = item_kelas.get("nama_kelas")
                else:
                    nama_kelas_string = item_kelas[0]
                    
                if nama_kelas_string:
                    daftar_kelas.append(nama_kelas_string)
                
            return jsonify({"status": "success", "data": daftar_kelas}), 200
        except Exception as e:
            return jsonify({"status": "error", "message": f"Gagal memuat master kelas: {str(e)}"}), 500
        finally:
            cursor.close()
            db.close()