from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required
from datetime import datetime
import io
import traceback
import pandas as pd
import pymysql
from app.controllers.admin_controllers import AdminController

admin_bp = Blueprint('admin', __name__)

class AdminModel:
    @admin_bp.route('/tambah-user', methods=['POST'])
    @jwt_required()  # Melindungi endpoint tambah user 
    def tambah_user(): 
        data = request.get_json() or {} 
        role = data.get('role')  # Wajib: 'siswa' atau 'staff' 
        nama_lengkap = data.get('nama_lengkap')
        
        if not role or not nama_lengkap:
            return jsonify({"status": "error", "message": "Role dan Nama Lengkap wajib diisi!"}), 400
            
        if role not in ['siswa', 'staff']:
            return jsonify({"status": "error", "message": "Role harus berupa 'siswa' atau 'staff'!"}), 400

        nomor_induk_rumus = data.get('nisn') if role == 'siswa' else data.get('nip')
        if not nomor_induk_rumus:
            return jsonify({"status": "error", "message": f"Untuk {role}, {'NISN' if role == 'siswa' else 'NIP'} wajib diisi untuk rumus password!"}), 400

        password_polos, password_terenkripsi = AdminController.generate_password_rumus(nama_lengkap, nomor_induk_rumus)
        
        db = current_app.get_db_connection()
        cursor = db.cursor()
        try:
            query_user = "INSERT INTO users (username, password, role, nama_lengkap) VALUES (%s, %s, %s, %s)"
            cursor.execute(query_user, (nama_lengkap, password_terenkripsi, role, nama_lengkap))
            user_id_baru = cursor.lastrowid
            
            if role == 'siswa':
                nisn = data.get('nisn')
                kelas = data.get('kelas')
                nomor_hp_orang_tua = data.get('nomor_hp_orang_tua')
                
                if not nisn or not kelas:
                    db.rollback()
                    return jsonify({"status": "error", "message": "NISN dan Kelas siswa wajib diisi!"}), 400
                    
                query_siswa = "INSERT INTO siswa (user_id, nisn, kelas, no_hp_orang_tua) VALUES (%s, %s, %s, %s)"
                cursor.execute(query_siswa, (user_id_baru, nisn, kelas, nomor_hp_orang_tua))
                
            elif role == 'staff':
                nip = data.get('nip')
                jabatan = data.get('jabatan')
                status_kepegawaian = data.get('status_kepegawaian', 'aktif')
                
                if not jabatan:
                    db.rollback()
                    return jsonify({"status": "error", "message": "Jabatan guru/staff wajib diisi!"}), 400
                    
                query_staff = "INSERT INTO staff (user_id, nip, jabatan, status_kepegawaian) VALUES (%s, %s, %s, %s)"
                cursor.execute(query_staff, (user_id_baru, nip, jabatan, status_kepegawaian))
                
            db.commit()
            return jsonify({
                "status": "success",
                "message": f"Data {role} berhasil didaftarkan!",
                "data_akun": {
                    "username": nama_lengkap,
                    "password_default": password_polos,
                    "role": role
                }
            }), 201
        except Exception as e:
            db.rollback()
            return jsonify({"status": "error", "message": f"Gagal menyimpan data: {str(e)}"}), 500
        finally:
            cursor.close()
            db.close()

    @staticmethod
    @admin_bp.route('/lihat-siswa', methods=['GET'])
    def lihat_siswa():
        db = current_app.get_db_connection()
        cursor = db.cursor()
        try:
            # Query mengambil data gabungan users dan detail siswa
            query = """
                SELECT users.id, users.username, users.role, siswa.nisn, siswa.kelas, siswa.no_hp_orang_tua 
                FROM users 
                JOIN siswa ON users.id = siswa.user_id
            """
            cursor.execute(query)
            daftar_siswa = cursor.fetchall()
            
            # Memetakan data mentah (Tuple) menjadi Dictionary agar dibaca dengan benar di Frontend React
            data_bersih = []
            for row in daftar_siswa:
                # Jika konfigurasi MySQL DB kamu otomatis mengembalikan object/dict
                if isinstance(row, dict):
                    data_bersih.append({
                        "id": row.get('id'),
                        "username": row.get('username'),
                        "role": row.get('role'),
                        "nisn": row.get('nisn'),
                        "kelas": row.get('kelas'),
                        "no_hp_orang_tua": row.get('no_hp_orang_tua')
                    })
                # Jika konfigurasi MySQL DB mengembalikan Tuple biasa (indeks angka)
                else:
                    data_bersih.append({
                        "id": row[0],
                        "username": row[1],
                        "role": row[2],
                        "nisn": row[3],
                        "kelas": row[4],
                        "no_hp_orang_tua": row[5]
                    })
            
            return jsonify({
                "status": "success", 
                "total_data": len(data_bersih), 
                "data": data_bersih
            }), 200
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500
        finally:
            cursor.close()
            db.close()

    @staticmethod
    @admin_bp.route('/lihat-staff', methods=['GET'])
    def lihat_staff():
        db = current_app.get_db_connection()
        cursor = db.cursor()
        try:
            query = """
                SELECT users.id, users.username, users.role, staff.nip, staff.jabatan, staff.status_kepegawaian
                FROM users 
                JOIN staff ON users.id = staff.user_id
            """
            cursor.execute(query)
            daftar_staff = cursor.fetchall()
            return jsonify({"status": "success", "total_data": len(daftar_staff), "data": daftar_staff}), 200
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500
        finally:
            cursor.close()
            db.close()
    
    @staticmethod
    @admin_bp.route('/ubah-staff/<int:user_id>', methods=['PUT'])
    def ubah_staff(user_id):
        data = request.get_json() or {}
        nama_lengkap = data.get('nama_lengkap')
        role = data.get('role')
        nip = data.get('nip')
        
        if not nama_lengkap or not role:
            return jsonify({"status": "error", "message": "Nama Lengkap and Role wajib diisi!"}), 400

        db = current_app.get_db_connection()
        cursor = db.cursor()
        try:
            query_user = "UPDATE users SET username = %s, nama_lengkap = %s, role = %s WHERE id = %s"
            cursor.execute(query_user, (nama_lengkap, nama_lengkap, role, user_id))
            
            query_staff = "UPDATE staff SET nip = %s, jabatan = %s WHERE user_id = %s"
            jabatan = 'Staff Tata Usaha' if role == 'staff' else 'Guru Mata Pelajaran'
            cursor.execute(query_staff, (nip, jabatan, user_id))
            
            db.commit()
            return jsonify({"status": "success", "message": "Data staff berhasil diperbarui!"}), 200
        except Exception as e:
            db.rollback()
            return jsonify({"status": "error", "message": str(e)}), 500
        finally:
            cursor.close()
            db.close()

    @staticmethod
    @admin_bp.route('/hapus-staff/<int:user_id>', methods=['DELETE'])
    def hapus_staff(user_id):
        db = current_app.get_db_connection()
        cursor = db.cursor()
        try:
            cursor.execute("DELETE FROM staff WHERE user_id = %s", (user_id,))
            cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
            db.commit()
            return jsonify({"status": "success", "message": "Data staff berhasil dihapus dari sistem!"}), 200
        except Exception as e:
            db.rollback()
            return jsonify({"status": "error", "message": str(e)}), 500
        finally:
            cursor.close()
            db.close()
    
    @staticmethod
    @admin_bp.route('/ubah-siswa/<int:user_id>', methods=['PUT'])
    def ubah_siswa(user_id):
        data = request.get_json() or {}
        nama_lengkap = data.get('nama_lengkap')
        nisn = data.get('nisn')
        kelas = data.get('kelas')
        no_hp_orang_tua = data.get('no_hp_orang_tua')
        
        if not nama_lengkap or not nisn or not kelas:
            return jsonify({"status": "error", "message": "Nama, NISN, dan Kelas wajib diisi!"}), 400

        db = current_app.get_db_connection()
        cursor = db.cursor()
        try:
            query_user = "UPDATE users SET username = %s, nama_lengkap = %s WHERE id = %s"
            cursor.execute(query_user, (nama_lengkap, nama_lengkap, user_id))
            
            query_siswa = "UPDATE siswa SET nisn = %s, kelas = %s, no_hp_orang_tua = %s WHERE user_id = %s"
            cursor.execute(query_siswa, (nisn, kelas, no_hp_orang_tua, user_id))
            db.commit()
            return jsonify({"status": "success", "message": "Data siswa berhasil diperbarui!"}), 200
        except Exception as e:
            db.rollback()
            return jsonify({"status": "error", "message": str(e)}), 500
        finally:
            cursor.close()
            db.close()

    @staticmethod
    @admin_bp.route('/hapus-siswa/<int:user_id>', methods=['DELETE'])
    def hapus_siswa(user_id):
        db = current_app.get_db_connection()
        cursor = db.cursor()
        try:
            cursor.execute("DELETE FROM siswa WHERE user_id = %s", (user_id,))
            cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
            db.commit()
            return jsonify({"status": "success", "message": "Data siswa berhasil dihapus dari sistem!"}), 200
        except Exception as e:
            db.rollback()
            return jsonify({"status": "error", "message": str(e)}), 500
        finally:
            cursor.close()
            db.close()
    
    @admin_bp.route('/import-guru', methods=['POST'])
    @jwt_required()
    def import_guru():
        """
        Mengambil file Excel dari frontend, membaca data NIP dan Nama,
        membuat akun di tabel users dengan role 'staff', lalu menyimpan ke tabel staff
        sesuai dengan kolom asli database: id, user_id, nip, jabatan, status_kepegawaian.
        """
        if 'file' not in request.files:
            return jsonify({"status": "error", "message": "File tidak ditemukan!"}), 400
            
        file = request.files['file']
        if file.filename == '':
            return jsonify({"status": "error", "message": "Tidak ada file yang dipilih!"}), 400

        if file and (file.filename.endswith('.xlsx') or file.filename.endswith('.xls')):
            db = current_app.get_db_connection()
            cursor = db.cursor(pymysql.cursors.Cursor)
        
            try:
                df = pd.read_excel(file)
                
                # Membersihkan spasi pada header kolom excel jika ada
                df.columns = df.columns.str.strip()
                df.dropna(how='all', inplace=True)
                
                sukses_count = 0
                for index, row in df.iterrows():
                    # Membaca kolom NIP dari Excel (mengakomodasi nama header yang bervariasi)
                    nip = str(row.get('nip', row.get('nip_nuptk', ''))).strip().split('.')[0] if pd.notnull(row.get('nip', row.get('nip_nuptk'))) else ''
                    
                    # Membaca nama lengkap dari Excel
                    nama_lengkap = str(row.get('nama_guru', row.get('nama_lengkap', ''))).strip()
                    
                    # Membaca kolom tipe/role di excel untuk menentukan jabatan
                    role_input = str(row.get('role_akses', 'guru')).strip().lower()
                    
                    # 🌟 SOLUSI UTAMA: Paksa menjadi 'staff' karena ENUM di tabel users hanya menerima 'staff'/'admin'/'siswa'
                    role_db = 'staff'
                    
                    # Lewati jika baris data krusial kosong
                    if not nip or nip == 'nan' or not nama_lengkap or nama_lengkap == 'nan':
                        continue
                    
                    # Cek apakah NIP ini sudah terdaftar di tabel staff Anda
                    cursor.execute("SELECT id, user_id FROM staff WHERE nip = %s", (nip,))
                    staff_ada = cursor.fetchone()
                    
                    if staff_ada:
                        # Jika data sudah ada, perbarui info login di tabel users
                        user_id_existing = staff_ada[1]
                        cursor.execute(
                            "UPDATE users SET username = %s, nama_lengkap = %s, role = %s WHERE id = %s",
                            (nama_lengkap, nama_lengkap, role_db, user_id_existing)
                        )
                    else:
                        # Jika belum ada, buat enkripsi password otomatis menggunakan rumus bawaan Anda
                        password_polos, password_terenkripsi = AdminController.generate_password_rumus(nama_lengkap, nip)
                        
                        cursor.execute(
                            "INSERT INTO users (username, password, role, nama_lengkap) VALUES (%s, %s, %s, %s)",
                            (nama_lengkap, password_terenkripsi, role_db, nama_lengkap)
                        )
                        user_id_baru = cursor.lastrowid
                        
                        # Tentukan string jabatan berdasarkan input excel
                        if role_input in ['staff', 'staf', 'tata usaha', 'kependidikan']:
                            jabatan = 'Staff Tata Usaha'
                        else:
                            jabatan = 'Guru Mata Pelajaran'
                        
                        # Masukkan ke tabel staff menggunakan nama-nama kolom asli database Anda
                        cursor.execute(
                            "INSERT INTO staff (user_id, nip, jabatan, status_kepegawaian) VALUES (%s, %s, %s, %s)",
                            (user_id_baru, nip, jabatan, "aktif")
                        )
                    sukses_count += 1
                
                db.commit()
                return jsonify({"status": "success", "message": f"Berhasil mengimport {sukses_count} data guru ke database!"}), 200
                
            except Exception as e:
                db.rollback()
                print("❌ ERROR PADA PROSES IMPORT GURU:")
                traceback.print_exc()
                return jsonify({"status": "error", "message": f"Gagal memproses file Excel: {str(e)}"}), 500
            finally:
                cursor.close()
                db.close()
                
        return jsonify({"status": "error", "message": "Format file wajib Excel!"}), 400


    @admin_bp.route('/export-guru', methods=['GET'])
    @jwt_required()
    def export_guru():
        """
        Mengambil data staf/guru aktif dari gabungan tabel staff dan users 
        untuk dijadikan file Excel yang siap diunduh.
        """
        import io
        from flask import send_file  # 🌟 TAMBAHKAN IMPORT INI DI SINI
        
        db = current_app.get_db_connection()
        cursor = db.cursor() 
        try:
            query = """
                SELECT staff.nip, users.nama_lengkap, staff.jabatan, staff.status_kepegawaian
                FROM staff
                JOIN users ON staff.user_id = users.id
                ORDER BY users.nama_lengkap ASC
            """
            cursor.execute(query)
            daftar_staff = cursor.fetchall()
            
            data_bersih = []
            for row in daftar_staff:
                data_bersih.append({
                    "nip": row.get('nip'),
                    "nama_lengkap": row.get('nama_lengkap'),
                    "role_akses": "staff", 
                    "jabatan": row.get('jabatan'),
                    "status_kepegawaian": row.get('status_kepegawaian')
                })
        
            if not data_bersih:
                data_bersih = [{
                    "nip": "198801022015031001", 
                    "nama_lengkap": "Ahmad Fauzi, S.Pd.", 
                    "role_akses": "guru", 
                    "jabatan": "Guru Mata Pelajaran", 
                    "status_kepegawaian": "aktif"
                }]
                
            df = pd.DataFrame(data_bersih)
            
            output = io.BytesIO()
            # Menggunakan engine openpyxl (bawaan pandas) agar aman tanpa install library tambahan
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                df.to_excel(writer, index=False, sheet_name='Data Pendidik')
            output.seek(0)
            
            return send_file(
                output,
                mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                as_attachment=True,
                download_name="Master_Data_Pendidik_SMANIKE.xlsx"
            )
            
        except Exception as e:
            print("❌ ERROR EXPORT GURU:", str(e))
            return jsonify({"status": "error", "message": f"Gagal export data: {str(e)}"}), 500
        finally:
            cursor.close()
            db.close()

    @admin_bp.route('/import-siswa', methods=['POST'])
    @jwt_required()
    def import_siswa():
        """
        Mengambil file Excel dari frontend, membaca datanya via Pandas,
        membuat user login otomatis beserta password terenkripsi,
        lalu menyimpannya ke tabel users dan siswa menggunakan PyMySQL.
        """
        if 'file' not in request.files:
            return jsonify({"status": "error", "message": "File Excel tidak ditemukan dalam request"}), 400
            
        file = request.files['file']
        if file.filename == '':
            return jsonify({"status": "error", "message": "Nama file kosong"}), 400

        connection = None
        try:
            # Membaca berkas Excel dengan engine openpyxl
            df = pd.read_excel(file, engine='openpyxl')
            
            # Membersihkan nama kolom header dari spasi liar tak terlihat
            df.columns = df.columns.str.strip()
            
            # Hapus baris yang kosong total di Excel
            df.dropna(how='all', inplace=True)
            
            print("--- DEBUG DATA SISWA YANG TERBACA ---")
            print(df)
            
            if df.empty:
                return jsonify({
                    "status": "error", 
                    "message": "Gagal mengimport! File Excel terbaca kosong. Pastikan data diisi langsung di bawah baris header."
                }), 400

            # Menggunakan fungsi koneksi bawaan dari aplikasi Flask Anda
            connection = current_app.get_db_connection()
            
            # Gunakan cursor standar khusus untuk eksekusi query dengan tuple params
            cursor = connection.cursor(pymysql.cursors.Cursor)
            sukses_count = 0
            
            # Perulangan baris demi baris data dari berkas Excel
            for index, row in df.iterrows():
                # Membersihkan format float desimal (.0) jika NISN dibaca sebagai angka oleh Pandas
                nisn_val = str(row.get('nisn', '')).split('.')[0].strip()
                nama_val = str(row.get('nama_lengkap', '')).strip()
                kelas_val = str(row.get('kelas', '')).strip()
                hp_val = str(row.get('no_hp_orang_tua', '')).strip()

                # Validasi baris kosong/tidak valid
                if not nisn_val or nisn_val == 'nan' or not nama_val or nama_val == 'nan':
                    continue

                # 🌟 CEK DUPLIKASI NISN TERLEBIH DAHULU 🌟
                cursor.execute("SELECT id, user_id FROM siswa WHERE nisn = %s", (nisn_val,))
                siswa_ada = cursor.fetchone()

                if siswa_ada:
                    # Jika siswa sudah terdaftar, lakukan UPDATE data profilnya
                    id_siswa_existing = siswa_ada[0]
                    user_id_existing = siswa_ada[1]
                    
                    # 1. Update nama lengkap di tabel users
                    query_update_user = "UPDATE users SET username = %s, nama_lengkap = %s WHERE id = %s"
                    cursor.execute(query_update_user, (nama_val, nama_val, user_id_existing))
                    
                    # 2. Update kelas dan no hp di tabel siswa (Sesuai kolom asli database)
                    query_update_siswa = """
                        UPDATE siswa 
                        SET kelas = %s, no_hp_orang_tua = %s 
                        WHERE id = %s
                    """
                    cursor.execute(query_update_siswa, (kelas_val, hp_val, id_siswa_existing))
                else:
                    # Jika siswa belum ada, lakukan INSERT data baru (Tabel Users & Siswa)
                    # 1. Generate password terenkripsi menggunakan rumus sistem Anda
                    password_polos, password_terenkripsi = AdminController.generate_password_rumus(nama_val, nisn_val)
                    
                    # 2. Simpan akun login ke tabel users
                    query_user = "INSERT INTO users (username, password, role, nama_lengkap) VALUES (%s, %s, %s, %s)"
                    cursor.execute(query_user, (nama_val, password_terenkripsi, 'siswa', nama_val))
                    user_id_baru = cursor.lastrowid
                    
                    # 3. Simpan detail data ke tabel siswa (TANPA KOLOM PASSWORD)
                    query_siswa = """
                        INSERT INTO siswa (user_id, nisn, kelas, no_hp_orang_tua) 
                        VALUES (%s, %s, %s, %s)
                    """
                    cursor.execute(query_siswa, (user_id_baru, nisn_val, kelas_val, hp_val))
                
                sukses_count += 1

            # Commit seluruh transaksi data ke database agar tersimpan permanen
            connection.commit()
            cursor.close()

            return jsonify({
                "status": "success", 
                "message": f"Berhasil mengimport {sukses_count} data siswa ke database!"
            }), 200

        except Exception as e:
            print("❌ ERROR PADA PROSES IMPORT FLASK:")
            traceback.print_exc()
            if connection:
                connection.rollback()
            return jsonify({"status": "error", "message": f"Gagal memproses file Excel: {str(e)}"}), 500
        finally:
            if connection:
                connection.close()
    
    @staticmethod
    @admin_bp.route('/export-siswa', methods=['GET'])
    def export_siswa():
        db = current_app.get_db_connection()
        cursor = db.cursor()
        try:
            # Query mengambil data gabungan users dan detail siswa
            query = """
                SELECT users.id, users.nama_lengkap, users.role, siswa.nisn, siswa.kelas, siswa.no_hp_orang_tua 
                FROM users 
                JOIN siswa ON users.id = siswa.user_id
            """
            cursor.execute(query)
            daftar_siswa = cursor.fetchall()
            
            data_bersih = []
            for row in daftar_siswa:
                # Jika konfigurasi MySQL DB mengembalikan objek Dictionary
                if isinstance(row, dict):
                    data_bersih.append({
                        "ID User": row.get('id'),
                        "Nama Siswa": row.get('nama_lengkap'),
                        "Role": row.get('role'),
                        "NISN": row.get('nisn'),
                        "Kelas": row.get('kelas'),
                        "No HP Orang Tua": row.get('no_hp_orang_tua')
                    })
                # Jika konfigurasi MySQL DB mengembalikan objek Tuple biasa
                else:
                    data_bersih.append({
                        "ID User": row[0],
                        "Nama Siswa": row[1],
                        "Role": row[2],
                        "NISN": row[3],
                        "Kelas": row[4],
                        "No HP Orang Tua": row[5]
                    })
            
            if not data_bersih:
                return jsonify({"status": "error", "message": "Tidak ada data siswa untuk diexport!"}), 400
                
            # Konversi array data bersih ke DataFrame Pandas
            df = pd.DataFrame(data_bersih)
            
            import io
            from flask import send_file
            
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
                df.to_excel(writer, index=False, sheet_name='Data Siswa')
            output.seek(0)
            
            return send_file(
                output,
                mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                as_attachment=True,
                download_name="Data_Siswa_SMAN1Kedunggalar.xlsx"
            )
            
        except Exception as e:
            print("❌ ERROR EXPORT SISWA:", str(e))
            return jsonify({"status": "error", "message": f"Gagal export data: {str(e)}"}), 500
        finally:
            cursor.close()
            db.close()
    
    # ------------------ 1. AMBIL DAFTAR GURU (UNTUK DROPDOWN WALI KELAS) ------------------
    @staticmethod
    @admin_bp.route('/get-guru-pilihan', methods=['GET'])
    def get_guru_pilihan():
        db = current_app.get_db_connection()
        cursor = db.cursor()
        try:
            # Mengambil data dari tabel staff yang di-join ke tabel users
            cursor.execute("""
                SELECT s.id AS id_staff, u.nama_lengkap 
                FROM staff s 
                JOIN users u ON s.user_id = u.id
                WHERE u.role = 'guru' OR u.role = 'staff'
            """)
            guru = cursor.fetchall()
            return jsonify({"status": "success", "data": guru}), 200
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500
        finally:
            cursor.close()
            db.close()

    # ------------------ 2. CRUD MASTER KELAS ------------------
    @staticmethod
    @admin_bp.route('/kelas', methods=['GET', 'POST'])
    def kelola_kelas():
        db = current_app.get_db_connection()
        cursor = db.cursor()
        
        if request.method == 'GET':
            try:
                cursor.execute("""
                    SELECT mk.*, u.nama_lengkap AS nama_wali 
                    FROM master_kelas mk
                    LEFT JOIN staff s ON mk.id_wali_kelas = s.id
                    LEFT JOIN users u ON s.user_id = u.id
                """)
                data = cursor.fetchall()
                return jsonify({"status": "success", "data": data}), 200
            except Exception as e:
                return jsonify({"status": "error", "message": str(e)}), 500
            finally:
                cursor.close()
                db.close()
                
        elif request.method == 'POST':
            data = request.get_json() or {}
            nama_kelas = data.get('nama_kelas')
            tingkat = data.get('tingkat')
            id_wali = data.get('id_wali_kelas')
            
            if not nama_kelas or not tingkat:
                return jsonify({"status": "error", "message": "Nama kelas dan tingkatan wajib diisi"}), 400
            try:
                cursor.execute(
                    "INSERT INTO master_kelas (nama_kelas, tingkat, id_wali_kelas) VALUES (%s, %s, %s)",
                    (nama_kelas, tingkat, id_wali if id_wali != '' else None)
                )
                db.commit()
                return jsonify({"status": "success", "message": "Kelas berhasil ditambahkan"}), 201
            except Exception as e:
                return jsonify({"status": "error", "message": f"Gagal simpan: {str(e)}"}), 500
            finally:
                cursor.close()
                db.close()

    @staticmethod
    @admin_bp.route('/kelas/<int:id_kelas>', methods=['PUT', 'DELETE'])
    def ubah_hapus_kelas(id_kelas):
        db = current_app.get_db_connection()
        cursor = db.cursor()
        
        if request.method == 'PUT':
            data = request.get_json()
            nama_kelas = data.get('nama_kelas')
            tingkat = data.get('tingkat')
            id_wali = data.get('id_wali_kelas')
            
            try:
                cursor.execute(
                    "UPDATE master_kelas SET nama_kelas=%s, tingkat=%s, id_wali_kelas=%s WHERE id_kelas=%s",
                    (nama_kelas, tingkat, id_wali if id_wali != '' else None, id_kelas)
                )
                db.commit()
                return jsonify({"status": "success", "message": "Kelas berhasil diubah"}), 200
            except Exception as e:
                return jsonify({"status": "error", "message": str(e)}), 500
            finally:
                cursor.close()
                db.close()
                
        elif request.method == 'DELETE':
            try:
                cursor.execute("DELETE FROM master_kelas WHERE id_kelas = %s", (id_kelas,))
                db.commit()
                return jsonify({"status": "success", "message": "Kelas berhasil dihapus"}), 200
            except Exception as e:
                return jsonify({"status": "error", "message": str(e)}), 500
            finally:
                cursor.close()
                db.close()

    # ------------------ 3. CRUD MASTER MAPEL ------------------
    @staticmethod
    @admin_bp.route('/mapel', methods=['GET', 'POST'])
    def kelola_mapel():
        db = current_app.get_db_connection()
        cursor = db.cursor()
        
        if request.method == 'GET':
            try:
                cursor.execute("SELECT * FROM mata_pelajaran")
                data = cursor.fetchall()
                return jsonify({"status": "success", "data": data}), 200
            except Exception as e:
                return jsonify({"status": "error", "message": str(e)}), 500
            finally:
                cursor.close()
                db.close()
                
        elif request.method == 'POST':
            data = request.get_json()
            kode_mapel = data.get('kode_mapel')
            nama_mapel = data.get('nama_mapel')
            jml_jam = data.get('jml_jam')
            kategori = data.get('kategori')
            
            if not kode_mapel or not nama_mapel:
                return jsonify({"status": "error", "message": "Kode dan nama mapel wajib diisi"}), 400
                
            try:
                cursor.execute(
                    "INSERT INTO mata_pelajaran (kode_mapel, nama_mapel, jml_jam, kategori) VALUES (%s, %s, %s, %s)",
                    (kode_mapel, nama_mapel, jml_jam, kategori)
                )
                db.commit()
                return jsonify({"status": "success", "message": "Mata pelajaran berhasil didaftarkan"}), 201
            except Exception as e:
                return jsonify({"status": "error", "message": f"Gagal simpan/Kode mapel duplikat: {str(e)}"}), 500
            finally:
                cursor.close()
                db.close()

    @staticmethod
    @admin_bp.route('/mapel/<int:id_mapel>', methods=['PUT', 'DELETE'])
    def ubah_hapus_mapel(id_mapel):
        db = current_app.get_db_connection()
        cursor = db.cursor()
        
        if request.method == 'PUT':
            data = request.get_json()
            kode_mapel = data.get('kode_mapel')
            nama_mapel = data.get('nama_mapel')
            jml_jam = data.get('jml_jam')
            kategori = data.get('kategori')
            
            try:
                cursor.execute(
                    "UPDATE mata_pelajaran SET kode_mapel=%s, nama_mapel=%s, jml_jam=%s, kategori=%s WHERE id_mapel=%s",
                    (kode_mapel, nama_mapel, jml_jam, kategori, id_mapel)
                )
                db.commit()
                return jsonify({"status": "success", "message": "Mapel berhasil diperbarui"}), 200
            except Exception as e:
                return jsonify({"status": "error", "message": str(e)}), 500
            finally:
                cursor.close()
                db.close()
                
        elif request.method == 'DELETE':
            try:
                cursor.execute("DELETE FROM mata_pelajaran WHERE id_mapel = %s", (id_mapel,))
                db.commit()
                return jsonify({"status": "success", "message": "Mapel berhasil dihapus"}), 200
            except Exception as e:
                return jsonify({"status": "error", "message": str(e)}), 500
            finally:
                cursor.close()
                db.close()

    # ------------------ 4. CRUD JADWAL PELAJARAN / PLOTTING GURU ------------------
    @staticmethod
    @admin_bp.route('/jadwal', methods=['GET', 'POST'])
    def kelola_jadwal():
        db = current_app.get_db_connection()
        cursor = db.cursor()
        
        if request.method == 'GET':
            try:
                # Menggunakan TIME_FORMAT agar jam_mulai dan jam_selesai keluar sebagai "00:00" bukan "0:00:00"
                cursor.execute("""
                    SELECT j.id_jadwal, j.id_staff, j.id_mapel, j.id_kelas, j.hari, 
                           TIME_FORMAT(j.jam_mulai, '%H:%i') AS jam_mulai, 
                           TIME_FORMAT(j.jam_selesai, '%H:%i') AS jam_selesai,
                           u.nama_lengkap AS nama_guru, mk.nama_kelas, mp.nama_mapel
                    FROM jadwal_mengajar j
                    JOIN staff s ON j.id_staff = s.id
                    JOIN users u ON s.user_id = u.id
                    JOIN master_kelas mk ON j.id_kelas = mk.id_kelas
                    JOIN mata_pelajaran mp ON j.id_mapel = mp.id_mapel
                    ORDER BY j.id_jadwal DESC
                """)
                rows = cursor.fetchall()
                
                jadwal = []
                for row in rows:
                    if isinstance(row, dict):
                        item = row
                        item['jam_mulai'] = str(item['jam_mulai'])
                        item['jam_selesai'] = str(item['jam_selesai'])
                        jadwal.append(item)
                    else:
                        jadwal.append({
                            "id_jadwal": row[0], 
                            "id_staff": row[1], 
                            "id_mapel": row[2], 
                            "id_kelas": row[3],
                            "hari": row[4], 
                            "jam_mulai": str(row[5]), 
                            "jam_selesai": str(row[6]),
                            "nama_guru": row[7], 
                            "nama_kelas": row[8], 
                            "nama_mapel": row[9]
                        })
                return jsonify({"status": "success", "data": jadwal}), 200
            except Exception as e:
                return jsonify({"status": "error", "message": str(e)}), 500
            finally:
                cursor.close()
                db.close()
                
        elif request.method == 'POST':
            data = request.get_json() or {}
            id_staff = data.get('id_staff')
            id_mapel = data.get('id_mapel')
            id_kelas = data.get('id_kelas')
            hari = data.get('hari')
            jam_mulai = data.get('jam_mulai')
            jam_selesai = data.get('jam_selesai')
            
            if not all([id_staff, id_mapel, id_kelas, hari, jam_mulai, jam_selesai]):
                return jsonify({"status": "error", "message": "Semua kolom plotting wajib diisi!"}), 400
                
            try:
                # 1. CEK BENTROK GURU
                cursor.execute("""
                    SELECT j.id_jadwal, u.nama_lengkap, mk.nama_kelas
                    FROM jadwal_mengajar j
                    JOIN staff s ON j.id_staff = s.id
                    JOIN users u ON s.user_id = u.id
                    JOIN master_kelas mk ON j.id_kelas = mk.id_kelas
                    WHERE j.id_staff = %s AND j.hari = %s
                      AND (%s < j.jam_selesai AND %s > j.jam_mulai)
                """, (id_staff, hari, jam_mulai, jam_selesai))
                bentrok_guru = cursor.fetchone()
                
                if bentrok_guru:
                    nama_guru = bentrok_guru['nama_lengkap'] if isinstance(bentrok_guru, dict) else bentrok_guru[1]
                    nama_kelas = bentrok_guru['nama_kelas'] if isinstance(bentrok_guru, dict) else bentrok_guru[2]
                    return jsonify({
                        "status": "error", 
                        "message": f"Gagal! Guru {nama_guru} sudah mengajar di kelas {nama_kelas} pada jam tersebut."
                    }), 400

                # 2. CEK BENTROK KELAS
                cursor.execute("""
                    SELECT j.id_jadwal, mp.nama_mapel
                    FROM jadwal_mengajar j
                    JOIN mata_pelajaran mp ON j.id_mapel = mp.id_mapel
                    WHERE j.id_kelas = %s AND j.hari = %s
                      AND (%s < j.jam_selesai AND %s > j.jam_mulai)
                """, (id_kelas, hari, jam_mulai, jam_selesai))
                bentrok_kelas = cursor.fetchone()
                
                if bentrok_kelas:
                    nama_mapel = bentrok_kelas['nama_mapel'] if isinstance(bentrok_kelas, dict) else bentrok_kelas[1]
                    return jsonify({
                        "status": "error", 
                        "message": f"Gagal! Kelas sudah terisi mata pelajaran '{nama_mapel}' pada jam tersebut."
                    }), 400

                # JIKA LOLOS KEDUA CEK DI ATAS (TIDAK BENTROK), MAKA JALANKAN INSERT
                cursor.execute("""
                    INSERT INTO jadwal_mengajar (id_staff, id_mapel, id_kelas, hari, jam_mulai, jam_selesai)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (id_staff, id_mapel, id_kelas, hari, jam_mulai, jam_selesai))
                db.commit()
                return jsonify({"status": "success", "message": "Jadwal mengajar berhasil di-plot!"}), 201
            except Exception as e:
                db.rollback()
                return jsonify({"status": "error", "message": str(e)}), 500
            finally:
                cursor.close()
                db.close()

    @staticmethod
    @admin_bp.route('/jadwal/<int:id_jadwal>', methods=['DELETE'])
    def hapus_jadwal(id_jadwal):
        db = current_app.get_db_connection()
        cursor = db.cursor()
        try:
            cursor.execute("DELETE FROM jadwal_mengajar WHERE id_jadwal = %s", (id_jadwal,))
            db.commit()
            return jsonify({"status": "success", "message": "Jadwal berhasil dihapus"}), 200
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500
        finally:
            cursor.close()
            db.close()

    @staticmethod
    @admin_bp.route('/jadwal/<int:id_jadwal>', methods=['PUT'])
    def ubah_jadwal_api(id_jadwal):
        data = request.get_json() or {}
        id_staff = data.get('id_staff')
        id_mapel = data.get('id_mapel')
        id_kelas = data.get('id_kelas')
        hari = data.get('hari')
        jam_mulai = data.get('jam_mulai')
        jam_selesai = data.get('jam_selesai')
        
        if not all([id_staff, id_mapel, id_kelas, hari, jam_mulai, jam_selesai]):
            return jsonify({"status": "error", "message": "Semua kolom plotting wajib diisi!"}), 400
            
        db = current_app.get_db_connection()
        cursor = db.cursor()
        try:
            # ---------------------------------------------------------
            # VALIDASI A: Cek bentrok Guru (Kecuali id_jadwal yang sedang diedit ini)
            # ---------------------------------------------------------
            cursor.execute("""
                SELECT j.id_jadwal, u.nama_lengkap, mk.nama_kelas
                FROM jadwal_mengajar j
                JOIN staff s ON j.id_staff = s.id
                JOIN users u ON s.user_id = u.id
                JOIN master_kelas mk ON j.id_kelas = mk.id_kelas
                WHERE j.id_staff = %s AND j.hari = %s AND j.id_jadwal != %s
                  AND (%s < j.jam_selesai AND %s > j.jam_mulai)
            """, (id_staff, hari, id_jadwal, jam_mulai, jam_selesai))
            bentrok_guru = cursor.fetchone()
            
            if bentrok_guru:
                nama_guru = bentrok_guru[1] if isinstance(bentrok_guru, tuple) else bentrok_guru.get('nama_lengkap')
                nama_kelas = bentrok_guru[2] if isinstance(bentrok_guru, tuple) else bentrok_guru.get('nama_kelas')
                return jsonify({
                    "status": "error", 
                    "message": f"Gagal Update! Guru {nama_guru} sudah ada jadwal mengajar di {nama_kelas} pada hari & jam tersebut."
                }), 400

            # ---------------------------------------------------------
            # VALIDASI B: Cek bentrok Kelas (Kecuali id_jadwal yang sedang diedit ini)
            # ---------------------------------------------------------
            cursor.execute("""
                SELECT j.id_jadwal, mp.nama_mapel
                FROM jadwal_mengajar j
                JOIN mata_pelajaran mp ON j.id_mapel = mp.id_mapel
                WHERE j.id_kelas = %s AND j.hari = %s AND j.id_jadwal != %s
                  AND (%s < j.jam_selesai AND %s > j.jam_mulai)
            """, (id_kelas, hari, id_jadwal, jam_mulai, jam_selesai))
            bentrok_kelas = cursor.fetchone()
            
            if bentrok_kelas:
                nama_mapel = bentrok_kelas[1] if isinstance(bentrok_kelas, tuple) else bentrok_kelas.get('nama_mapel')
                return jsonify({
                    "status": "error", 
                    "message": f"Gagal Update! Kelas ini sudah terisi oleh mata pelajaran '{nama_mapel}' pada jam tersebut."
                }), 400

            # Jika aman dan tidak ada bentrok sama sekali, baru lakukan UPDATE ke MySQL
            cursor.execute("""
                UPDATE jadwal_mengajar 
                SET id_staff=%s, id_mapel=%s, id_kelas=%s, hari=%s, jam_mulai=%s, jam_selesai=%s
                WHERE id_jadwal=%s
            """, (id_staff, id_mapel, id_kelas, hari, jam_mulai, jam_selesai, id_jadwal))
            db.commit()
            return jsonify({"status": "success", "message": "Jadwal pelajaran berhasil diperbarui!"}), 200
        except Exception as e:
            db.rollback()
            return jsonify({"status": "error", "message": str(e)}), 500
        finally:
            cursor.close()
            db.close()

    @admin_bp.route('/dashboard/stats', methods=['GET'])
    def get_dashboard_stats():
        # Mengambil koneksi database pymysql yang sudah didaftarkan di app.py
        db = current_app.get_db_connection()
        
        # 🌟 JANGAN masukkan dictionary=True di sini, karena app.py Anda 
        # sudah otomatis menggunakan pymysql.cursors.DictCursor
        cursor = db.cursor()
        
        try:
            # 1. Hitung total siswa terdaftar
            cursor.execute("SELECT COUNT(*) as total FROM siswa")
            res_siswa = cursor.fetchone()
            # Karena menggunakan DictCursor, kita ambil lewat key ['total']
            total_siswa = res_siswa['total'] if res_siswa else 0

            # 2. Hitung total staff / guru terdaftar
            cursor.execute("SELECT COUNT(*) as total FROM staff")
            res_staff = cursor.fetchone()
            total_guru = res_staff['total'] if res_staff else 0

            # 3. Hitung total siswa yang sudah melakukan presensi HADIR hari ini
            hari_ini = datetime.now().strftime('%Y-%m-%d')
            cursor.execute("""
                SELECT COUNT(DISTINCT id_siswa) as total_absen 
                FROM presensi_harian 
                WHERE tanggal = %s AND (status_kehadiran = 'Hadir' OR status_kehadiran = 'Masuk')
            """, (hari_ini,))
            res_absen = cursor.fetchone()
            total_absen = res_absen['total_absen'] if res_absen else 0

            # 4. Hitung rumus persentase kehadiran hari ini
            persen_absen = "0%"
            if total_siswa > 0:
                persen = (total_absen / total_siswa) * 100
                persen_absen = f"{round(persen)}%"

            # Return data dengan format yang dinanti oleh DashboardStaff.jsx
            return jsonify({
                "status": "success",
                "stats": {
                    "totalSiswa": int(total_siswa),
                    "totalGuru": int(total_guru),
                    "presensiHariIni": persen_absen
                }
            }), 200

        except Exception as e:
            # 🌟 Menggunakan traceback agar jika ada error nama kolom/tabel salah, 
            # detail errornya akan langsung tercetak di terminal Flask
            print("❌ LOG ERROR SQL STATS SECARA DETAIL:")
            traceback.print_exc()
            
            return jsonify({
                "status": "error", 
                "message": "Gagal mengambil data statistik internal server."
            }), 500
            
        finally:
            cursor.close()
            db.close()
    
    @admin_bp.route('/guru/dashboard/stats', methods=['GET'])
    def get_guru_dashboard_stats():
        """Endpoint terpisah khusus untuk Dashboard Guru"""
        user_id = request.args.get('user_id')
        
        if not user_id:
            return jsonify({
                "status": "error", 
                "message": "User ID tidak ditemukan atau sesi login tidak sah"
            }), 400
            
        return AdminController.get_guru_dashboard_logic(user_id)
    
    @admin_bp.route('/siswa/dashboard/stats', methods=['GET'])
    def get_siswa_dashboard_stats():
        """Endpoint terpisah khusus untuk Dashboard Siswa"""
        user_id = request.args.get('user_id')
        
        if not user_id:
            return jsonify({
                "status": "error", 
                "message": "User ID tidak ditemukan atau sesi login tidak sah"
            }), 400
            
        return AdminController.get_siswa_dashboard_logic(user_id)