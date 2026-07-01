import bcrypt
import traceback
from flask import Blueprint, request, jsonify, current_app
from datetime import datetime

class AdminController:
    @staticmethod
    def generate_password_rumus(nama_lengkap, nomor_induk):
        """
        Rumus: nama depan (lowercase) + 3 digit terakhir nomor induk (NISN/NIP)
        """
        # 1. Ambil nama depan dan ubah ke huruf kecil semua
        nama_depan = nama_lengkap.split()[0].lower()
        
        # 2. Ambil 3 angka terakhir dari nomor induk
        tiga_angka_terakhir = nomor_induk[-3:] if len(nomor_induk) >= 3 else nomor_induk
        
        # 3. Gabungkan menjadi password plain-text
        password_plain = f"{nama_depan}{tiga_angka_terakhir}"
        
        # 4. Enkripsi dengan bcrypt
        salt = bcrypt.gensalt()
        password_hashed = bcrypt.hashpw(password_plain.encode('utf-8'), salt)
        
        return password_plain, password_hashed.decode('utf-8')
    
    @staticmethod
    def get_dashboard_stats_logic(db):
        cursor = db.cursor(dictionary=True)
        try:
            # 1. Total Siswa
            cursor.execute("SELECT COUNT(*) as total FROM siswa")
            res_siswa = cursor.fetchone()
            total_siswa = res_siswa['total'] if res_siswa else 0

            # 2. Total Staff / Guru
            cursor.execute("SELECT COUNT(*) as total FROM staff")
            res_staff = cursor.fetchone()
            total_guru = res_staff['total'] if res_staff else 0

            # 3. Persentase Presensi Masuk Hari Ini
            hari_ini = datetime.now().strftime('%Y-%m-%d')
            cursor.execute("""
                SELECT COUNT(DISTINCT id_siswa) as total_absen 
                FROM presensi_harian 
                WHERE tanggal = %s AND status_kehadiran = 'Hadir'
            """, (hari_ini,))
            res_absen = cursor.fetchone()
            total_absen = res_absen['total_absen'] if res_absen else 0

            persen_absen = "0%"
            if total_siswa > 0:
                persen = (total_absen / total_siswa) * 100
                persen_absen = f"{round(persen)}%"

            return {
                "status": "success",
                "stats": {
                    "totalSiswa": total_siswa,
                    "totalGuru": total_guru,
                    "presensiHariIni": persen_absen
                }
            }, 200
        except Exception as e:
            print(f"❌ ERROR DASHBOARD STATS: {str(e)}")
            return {"status": "error", "message": str(e)}, 500
        finally:
            cursor.close()
    
    @staticmethod
    def get_guru_dashboard_logic(user_id):
        """Logika hitung statistik kelas mandiri & real-time untuk Guru (Skema Database Resmi)"""
        db = current_app.get_db_connection()
        cursor = db.cursor()
        
        try:
            # 1. Ambil nama hari real-time bahasa Indonesia
            hari_eng = datetime.now().strftime('%A')
            kamus_hari = {
                'Monday': 'Senin', 'Tuesday': 'Selasa', 'Wednesday': 'Rabu',
                'Thursday': 'Kamis', 'Friday': 'Jumat', 'Saturday': 'Sabtu', 'Sunday': 'Minggu'
            }
            hari_ini = kamus_hari.get(hari_eng, 'Senin')
            tanggal_sekarang = datetime.now().strftime('%Y-%m-%d')

            # 2. Dapatkan nama guru dari tabel users
            cursor.execute("SELECT nama_lengkap FROM users WHERE id = %s", (user_id,))
            user_data = cursor.fetchone()
            nama_guru = user_data['nama_lengkap'] if user_data else "Guru SMANIKE"

            # 3. 🌟 LANGKAH PENGAMAN: Ambil id_staff berdasarkan user_id login
            cursor.execute("SELECT id FROM staff WHERE user_id = %s", (user_id,))
            staff_data = cursor.fetchone()
            
            if not staff_data:
                # Jika user_id ini ternyata tidak terdaftar di tabel staff, kembalikan array kosong agar frontend tidak crash
                return jsonify({
                    "status": "success",
                    "guruLogin": nama_guru,
                    "hariIni": hari_ini,
                    "stats": {"totalPlottingSesi": 0, "kelasHariIni": 0, "totalJamMinggu": 0},
                    "masterJadwal": []
                }), 200

            id_staff_asli = staff_data['id']

            # 4. Query Jadwal Mengajar menggunakan id_staff murni yang sudah pasti valid
            query_jadwal = """
                SELECT j.id_jadwal, j.hari, j.jam_mulai, j.jam_selesai, k.nama_kelas, m.nama_mapel
                FROM `jadwal_mengajar` j
                JOIN `master_kelas` k ON j.id_kelas = k.id_kelas
                JOIN `mata_pelajaran` m ON j.id_mapel = m.id_mapel
                WHERE j.id_staff = %s
            """
            cursor.execute(query_jadwal, (id_staff_asli,))
            semua_jadwal_raw = cursor.fetchall()

            master_jadwal_output = []
            jumlah_kelas_hari_ini = 0

            # 5. Iterasi hitung statistik riil tiap kelas mengajar
            for jw in semua_jadwal_raw:
                string_jam = f"{str(jw['jam_mulai'])[:5]} - {str(jw['jam_selesai'])[:5]}"
                
                if jw['hari'] == hari_ini:
                    jumlah_kelas_hari_ini += 1

                # Hitung total siswa terdaftar di kelas ini (Tabel siswa kolom kelas menyimpan string nama_kelas)
                cursor.execute("SELECT COUNT(*) as total FROM siswa WHERE kelas = %s", (jw['nama_kelas'],))
                res_total_siswa = cursor.fetchone()
                total_siswa_kelas = res_total_siswa['total'] if res_total_siswa else 0

                # Hitung jumlah siswa yang masuk kelas mapel ini hari ini
                cursor.execute("""
                    SELECT COUNT(*) as hadir FROM presensi_mapel 
                    WHERE id_jadwal = %s AND tanggal = %s AND status_kehadiran IN ('Hadir', 'Masuk')
                """, (jw['id_jadwal'], tanggal_sekarang))
                res_hadir = cursor.fetchone()
                siswa_hadir = res_hadir['hadir'] if res_hadir else 0

                master_jadwal_output.append({
                    "id": jw['id_jadwal'],
                    "namaGuru": nama_guru,
                    "hari": jw['hari'],
                    "jam": string_jam,
                    "kelas": jw['nama_kelas'],
                    "mapel": jw['nama_mapel'],
                    "siswaHadir": int(siswa_hadir),
                    "totalSiswa": int(total_siswa_kelas)
                })

            return jsonify({
                "status": "success",
                "guruLogin": nama_guru,
                "hariIni": hari_ini,
                "stats": {
                    "totalPlottingSesi": len(master_jadwal_output),
                    "kelasHariIni": jumlah_kelas_hari_ini,
                    "totalJamMinggu": len(master_jadwal_output) * 2
                },
                "masterJadwal": master_jadwal_output
            }), 200

        except Exception as e:
            print("❌ LOG ERROR SQL DASHBOARD GURU:")
            traceback.print_exc()
            return jsonify({
                "status": "error", 
                "message": "Gagal memuat data statistik internal server guru."
            }), 500
            
        finally:
            cursor.close()
            db.close()

    @staticmethod
    def get_siswa_dashboard_logic(user_id):
        """Logika hitung statistik kehadiran & jadwal kelas khusus untuk Dashboard Siswa"""
        db = current_app.get_db_connection()
        cursor = db.cursor()
        
        try:
            # 1. Ambil nama lengkap siswa dari tabel users
            cursor.execute("SELECT nama_lengkap FROM users WHERE id = %s", (user_id,))
            user_data = cursor.fetchone()
            nama_siswa = user_data['nama_lengkap'] if user_data else "Siswa SMANIKE"

            # 2. Ambil ID Siswa asli dan nama kelasnya (dari tabel siswa)
            cursor.execute("SELECT id as id_siswa_asli, kelas FROM siswa WHERE user_id = %s", (user_id,))
            siswa_data = cursor.fetchone()
            
            # Pengaman jika user_id ini belum terelasi di tabel siswa
            if not siswa_data:
                return jsonify({
                    "status": "success",
                    "siswaLogin": nama_siswa,
                    "kelas": "-",
                    "stats": {"hadirHarian": 0, "sakit": 0, "izin": 0, "alfa": 0},
                    "jadwalHariIni": []
                }), 200

            id_siswa = siswa_data['id_siswa_asli']
            nama_kelas_siswa = siswa_data['kelas']  # Contoh menyimpan string: 'XII-MIPA 1'

            # 3. Hitung Akumulasi Presensi Harian Siswa (Sakit, Izin, Alfa, Hadir)
            cursor.execute("""
                SELECT 
                    COUNT(CASE WHEN status_kehadiran IN ('Hadir', 'Masuk') THEN 1 END) as hadir,
                    COUNT(CASE WHEN status_kehadiran = 'Sakit' THEN 1 END) as sakit,
                    COUNT(CASE WHEN status_kehadiran = 'Izin' THEN 1 END) as izin,
                    COUNT(CASE WHEN status_kehadiran = 'Alfa' THEN 1 END) as alfa
                FROM presensi_harian 
                WHERE id_siswa = %s
            """, (id_siswa,))
            res_presensi = cursor.fetchone()

            # 4. Deteksi Nama Hari Real-Time Bahasa Indonesia
            hari_eng = datetime.now().strftime('%A')
            kamus_hari = {
                'Monday': 'Senin', 'Tuesday': 'Selasa', 'Wednesday': 'Rabu',
                'Thursday': 'Kamis', 'Friday': 'Jumat', 'Saturday': 'Sabtu', 'Sunday': 'Minggu'
            }
            hari_ini = kamus_hari.get(hari_eng, 'Senin')
            tanggal_sekarang = datetime.now().strftime('%Y-%m-%d')

            # 5. Query Jadwal Pelajaran Kelas Siswa tersebut Khusus Hari Ini
            query_jadwal = """
                SELECT j.id_jadwal, j.jam_mulai, j.jam_selesai, m.nama_mapel, u.nama_lengkap as nama_guru, j.qr_token
                FROM `jadwal_mengajar` j
                JOIN `master_kelas` k ON j.id_kelas = k.id_kelas
                JOIN `mata_pelajaran` m ON j.id_mapel = m.id_mapel
                JOIN `staff` s ON j.id_staff = s.id
                JOIN `users` u ON s.user_id = u.id
                WHERE k.nama_kelas = %s AND j.hari = %s
            """
            cursor.execute(query_jadwal, (nama_kelas_siswa, hari_ini))
            jadwal_raw = cursor.fetchall()

            jadwal_hari_ini_output = []
            
            # 6. Iterasi Cek Status Absen Mapel Siswa Mandiri
            for jd in jadwal_raw:
                string_jam = f"{str(jd['jam_mulai'])[:5]} - {str(jd['jam_selesai'])[:5]}"
                
                # Cek apakah siswa sudah melakukan absen masuk di mapel ini pada tanggal hari ini
                cursor.execute("""
                    SELECT status_kehadiran FROM presensi_mapel 
                    WHERE id_siswa = %s AND id_jadwal = %s AND tanggal = %s
                """, (id_siswa, jd['id_jadwal'], tanggal_sekarang))
                status_mapel = cursor.fetchone()
                status_absen_mapel = status_mapel['status_kehadiran'] if status_mapel else "Belum Absen"

                jadwal_hari_ini_output.append({
                    "idJadwal": jd['id_jadwal'],
                    "jam": string_jam,
                    "mapel": jd['nama_mapel'],
                    "guru": jd['nama_guru'],
                    "statusAbsen": status_absen_mapel,
                    "qrTersedia": True if jd['qr_token'] else False  # Tombol scan aktif jika token QR guru ada
                })

            return jsonify({
                "status": "success",
                "siswaLogin": nama_siswa,
                "kelas": nama_kelas_siswa,
                "stats": {
                    "hadirHarian": int(res_presensi['hadir']) if res_presensi and res_presensi['hadir'] else 0,
                    "sakit": int(res_presensi['sakit']) if res_presensi and res_presensi['sakit'] else 0,
                    "izin": int(res_presensi['izin']) if res_presensi and res_presensi['izin'] else 0,
                    "alfa": int(res_presensi['alfa']) if res_presensi and res_presensi['alfa'] else 0
                },
                "jadwalHariIni": jadwal_hari_ini_output
            }), 200

        except Exception as e:
            print("❌ LOG ERROR SQL DASHBOARD SISWA:")
            traceback.print_exc()
            return jsonify({"status": "error", "message": "Gagal memuat data statistik internal server siswa."}), 500
        finally:
            cursor.close()
            db.close()