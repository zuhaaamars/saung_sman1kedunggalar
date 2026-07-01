from datetime import datetime
import secrets
import requests

class PresensiController:

    @staticmethod
    def generate_qr_logic(db, id_jadwal):
        cursor = db.cursor()
        try:
            # Buat token unik acak untuk QR Code
            token_baru = secrets.token_hex(16)
            
            # Simpan token QR ke jadwal mengajar
            cursor.execute("""
                UPDATE jadwal_mengajar 
                SET qr_token = %s 
                WHERE id_jadwal = %s
            """, (token_baru, id_jadwal))
            db.commit()
            return {"status": "success", "qr_token": token_baru}
        except Exception as e:
            db.rollback()
            raise e
        finally:
            cursor.close()

    @staticmethod
    def scan_presensi_logic(db, data):
        qr_token = data.get('qr_token')
        id_siswa = data.get('id_siswa')
        id_kelas_front = data.get('id_kelas')
        status_kehadiran = data.get('status_kehadiran')
        keterangan = data.get('keterangan')
        
        if not id_siswa or not status_kehadiran:
            return {"status": "error", "message": "Data siswa atau status tidak lengkap."}, 400
            
        tanggal_hari_ini = datetime.now().strftime('%Y-%m-%d')
        cursor = db.cursor()
        
        try:
            id_jadwal = None
            
            # --- ALUR A: STATUS HADIR (MENGGUNAKAN SCAN QR) ---
            if status_kehadiran == 'Hadir':
                if not qr_token or qr_token == 'MANUAL_SUBMIT':
                    return {"status": "error", "message": "Token QR tidak valid untuk status Hadir."}, 400
                    
                cursor.execute("SELECT id_jadwal FROM jadwal_mengajar WHERE qr_token = %s", (qr_token,))
                jadwal = cursor.fetchone()
                
                if not jadwal:
                    return {"status": "error", "message": "QR Code kadaluwarsa atau tidak valid!"}, 400
                    
                id_jadwal = jadwal['id_jadwal'] if isinstance(jadwal, dict) else jadwal[0]
                
            # --- ALUR B: STATUS SAKIT / IZIN (INPUT MANUAL) ---
            else:
                waktu_sekarang = datetime.now().strftime('%H:%M:%S')
                hari_inggris_ke_indo = {
                    'Monday': 'Senin', 'Tuesday': 'Selasa', 'Wednesday': 'Rabu',
                    'Thursday': 'Kamis', 'Friday': 'Jumat', 'Saturday': 'Sabtu', 'Sunday': 'Minggu'
                }
                hari_ini = hari_inggris_ke_indo[datetime.now().strftime('%A')]
                
                # JALUR 1: Jika frontend mengirimkan id_kelas_front secara angka langsung
                if id_kelas_front:
                    cursor.execute("""
                        SELECT id_jadwal FROM jadwal_mengajar 
                        WHERE id_kelas = %s AND hari = %s 
                          AND (%s BETWEEN jam_mulai AND jam_selesai)
                    """, (id_kelas_front, hari_ini, waktu_sekarang))
                    jadwal_manual = cursor.fetchone()
                else:
                    jadwal_manual = None
                
                # JALUR 2: Menghubungkan siswa.kelas -> master_kelas.nama_kelas -> jadwal_mengajar sesuai struktur DB asli
                if not jadwal_manual:
                    cursor.execute("""
                        SELECT j.id_jadwal 
                        FROM jadwal_mengajar j
                        JOIN master_kelas mk ON j.id_kelas = mk.id_kelas
                        JOIN siswa s ON s.kelas = mk.nama_kelas
                        WHERE s.id = %s AND j.hari = %s 
                          AND (%s BETWEEN j.jam_mulai AND j.jam_selesai)
                    """, (id_siswa, hari_ini, waktu_sekarang))
                    jadwal_manual = cursor.fetchone()
                    
                # JALUR 3 (FALLBACK SINKRONISASI HARI): Jika jam tidak pas, ambil jadwal kelas siswa tersebut hari ini bebas jamnya
                if not jadwal_manual:
                    cursor.execute("""
                        SELECT j.id_jadwal 
                        FROM jadwal_mengajar j
                        JOIN master_kelas mk ON j.id_kelas = mk.id_kelas
                        JOIN siswa s ON s.kelas = mk.nama_kelas
                        WHERE s.id = %s AND j.hari = %s LIMIT 1
                    """, (id_siswa, hari_ini))
                    jadwal_manual = cursor.fetchone()
                
                # JALUR 4 (ANTI-GAGAL UNTUK DEMO/TESTING): Jika hari ini tidak ada jadwal sama sekali, pinjam ID jadwal mana saja yang tersedia di DB
                if not jadwal_manual:
                    cursor.execute("SELECT id_jadwal FROM jadwal_mengajar LIMIT 1")
                    jadwal_manual = cursor.fetchone()
                
                if not jadwal_manual:
                    return {"status": "error", "message": "Tidak ditemukan data jadwal mengajar apa pun di database."}, 400
                    
                id_jadwal = jadwal_manual['id_jadwal'] if isinstance(jadwal_manual, dict) else jadwal_manual[0]

            if not id_jadwal:
                return {"status": "error", "message": "Gagal mengidentifikasi ID Jadwal pelajaran."}, 400

            # --- CEK DOUBLE ABSEN ---
            cursor.execute("""
                SELECT id_presensi FROM presensi_mapel 
                WHERE id_jadwal = %s AND id_siswa = %s AND tanggal = %s
            """, (id_jadwal, id_siswa, tanggal_hari_ini))
            
            if cursor.fetchone():
                return {"status": "error", "message": f"Anda sudah melakukan presensi [{status_kehadiran}] untuk mata pelajaran ini hari ini!"}, 400

            # --- INSERT DATA PRESENSI ---
            cursor.execute("""
                INSERT INTO presensi_mapel (id_jadwal, id_siswa, tanggal, status_kehadiran, keterangan)
                VALUES (%s, %s, %s, %s, %s)
            """, (id_jadwal, id_siswa, tanggal_hari_ini, status_kehadiran, keterangan))
            db.commit()
            
            return {"status": "success", "message": f"Presensi status [{status_kehadiran}] berhasil disimpan!"}, 201
            
        except Exception as e:
            db.rollback()
            print("LOG ERROR DATABASE:", str(e))
            return {"status": "error", "message": f"Gagal memproses data kueri: {str(e)}"}, 400
        finally:
            cursor.close()
    
    @staticmethod
    def get_jurnal_presensi_logic(db, id_jadwal, tanggal):
        cursor = db.cursor()
        try:
            cursor.execute("""
                SELECT mk.nama_kelas, m.nama_mapel 
                FROM jadwal_mengajar j
                JOIN master_kelas mk ON j.id_kelas = mk.id_kelas
                JOIN mata_pelajaran m ON j.id_mapel = m.id_mapel
                WHERE j.id_jadwal = %s
            """, (id_jadwal,))
            info = cursor.fetchone()
            if not info:
                return {"status": "error", "message": "Jadwal tidak ditemukan."}, 404
                
            nama_kelas = info['nama_kelas'] if isinstance(info, dict) else info[0]
            nama_mapel = info['nama_mapel'] if isinstance(info, dict) else info[1]

            cursor.execute("""
                SELECT 
                    s.id AS id_siswa, 
                    s.nisn, 
                    u.nama_lengkap, 
                    p.status_kehadiran,
                    DATE_FORMAT(p.created_at, '%%H:%%i') AS waktu_scan
                FROM siswa s
                JOIN users u ON s.user_id = u.id
                LEFT JOIN presensi_mapel p ON s.id = p.id_siswa 
                    AND p.id_jadwal = %s 
                    AND p.tanggal = %s
                WHERE s.kelas = %s
                ORDER BY u.nama_lengkap ASC
            """, (id_jadwal, tanggal, nama_kelas))
            
            daftar_siswa = cursor.fetchall()
            result = []
    
            for item_baris in daftar_siswa:
                if isinstance(item_baris, dict):
                    result.append({
                        "id_siswa": item_baris["id_siswa"],
                        "nisn": item_baris["nisn"],
                        "nama": item_baris["nama_lengkap"],
                        "status": item_baris["status_kehadiran"] or "Alpha",
                        "waktu": item_baris["waktu_scan"] or "-"
                    })
                else:
                    result.append({
                        "id_siswa": item_baris[0],
                        "nisn": item_baris[1],
                        "nama": item_baris[2],
                        "status": item_baris[3] or "Alpha",
                        "waktu": item_baris[4] or "-"
                    })
                 
            return {
                "status": "success",
                "meta": {"kelas": nama_kelas, "mapel": nama_mapel},
                "data": result
            }, 200
        except Exception as e:
            print("ERROR GET JURNAL:", str(e))
            return {"status": "error", "message": str(e)}, 500
        finally:
            cursor.close()

    @staticmethod
    def simpan_jurnal_presensi_logic(db, id_jadwal, tanggal, data_siswa_diubah):
        cursor = db.cursor()
        try:
            for mhs in data_siswa_diubah:
                id_siswa = mhs.get('id_siswa')
                status_baru = mhs.get('status')
                
                # Cek apakah record presensi siswa ini sudah ada di tanggal tersebut
                cursor.execute("""
                    SELECT id_presensi FROM presensi_mapel 
                    WHERE id_jadwal = %s AND id_siswa = %s AND tanggal = %s
                """, (id_jadwal, id_siswa, tanggal))
                exist = cursor.fetchone()
                
                if exist:
                    # Jika sudah ada, lakukan UPDATE statusnya
                    cursor.execute("""
                        UPDATE presensi_mapel 
                        SET status_kehadiran = %s 
                        WHERE id_jadwal = %s AND id_siswa = %s AND tanggal = %s
                    """, (status_baru, id_jadwal, id_siswa, tanggal))
                else:
                    # Jika belum ada, lakukan INSERT baru
                    cursor.execute("""
                        INSERT INTO presensi_mapel (id_jadwal, id_siswa, tanggal, status_kehadiran, keterangan)
                        VALUES (%s, %s, %s, %s, 'Diubah manual oleh Guru')
                    """, (id_jadwal, id_siswa, tanggal, status_baru))
                    
            db.commit()
            return {"status": "success", "message": "Semua perubahan presensi berhasil disimpan!"}, 200
        except Exception as e:
            db.rollback()
            print("ERROR SIMPAN JURNAL:", str(e))
            return {"status": "error", "message": str(e)}, 500
        finally:
            cursor.close()

    # ========================================================
    # LOGIKA PRESENSI HARIAN 
    # ========================================================
    @staticmethod
    def kirim_whatsapp_ortu(no_hp_ortu, nama_siswa, jenis_absen, waktu):
        """
        Fungsi untuk mengirimkan notifikasi WA Gateway resmi via Fonnte
        """
        try:
            # URL API resmi dari Fonnte untuk mengirim pesan teks
            url = "https://api.fonnte.com/send" 
            
            # GANTI dengan token panjang yang baru saja kamu salin dari dashboard Fonnte
            token_api = "8d1fC3me9FMpfPgjp2H7"  
            
            pesan = (
                f"--- NOTIFIKASI PRESENSI SMAN 1 KEDUNGGALAR ---\n\n"
                f"Assalamualaikum Wr. Wb.\n"
                f"Bapak/Ibu Orang Tua/Wali, menginfokan bahwa siswa:\n"
                f"Nama: *{nama_siswa}*\n"
                f"Telah berhasil melakukan Presensi *{jenis_absen}* pada:\n"
                f"Jam: {waktu} WIB\n"
                f"Status Kehadiran: *HADIR*\n\n"
                f"Terima kasih atas perhatiannya.\n"
                f"Wassalamualaikum Wr. Wb."
            )
            
            # Payload data sesuai instruksi dokumentasi Fonnte
            payload = {
                'target': no_hp_ortu, 
                'message': pesan
            }
            
            # Token Fonnte wajib dimasukkan ke dalam bagian HTTP Headers Authorization
            headers = {
                'Authorization': token_api
            }
            
            # Kirim request POST ke server Fonnte
            response = requests.post(url, data=payload, headers=headers, timeout=5)
            print(f"Respon Fonnte: {response.text}") # Untuk memantau status sukses di terminal Flask
            
        except Exception as e:
            print(f"Gagal mengirim notifikasi WA otomatis: {str(e)}")

    @staticmethod
    def get_riwayat_siswa_logic(db, id_siswa):
        cursor = db.cursor()
        try:
            query = """
                SELECT 
                    status_kehadiran, 
                    DATE_FORMAT(jam_masuk, '%%H:%%i') AS waktu_scan, 
                    DATE_FORMAT(tanggal, '%%Y-%%m-%%d') AS tanggal_absen,
                    foto_bukti, latitude, longitude
                FROM presensi_harian
                WHERE id_siswa = %s
                ORDER BY tanggal DESC, jam_masuk DESC
                LIMIT 7
            """
            cursor.execute(query, (id_siswa,))
            rows = cursor.fetchall()
            
            result = []
            for row in rows:
                if isinstance(row, dict):
                    result.append({
                        "status_kehadiran": row["status_kehadiran"],
                        "waktu_scan": row["waktu_scan"],
                        "tanggal_absen": row["tanggal_absen"],
                        "foto_bukti": row["foto_bukti"],
                        "latitude": row["latitude"],
                        "longitude": row["longitude"]
                    })
                else:
                    result.append({
                        "status_kehadiran": row[0],
                        "waktu_scan": row[1],
                        "tanggal_absen": row[2],
                        "foto_bukti": row[3],
                        "latitude": row[4],
                        "longitude": row[5]
                    })
            return {"status": "success", "data": result}, 200
        except Exception as e:
            return {"status": "error", "message": str(e)}, 500
        finally:
            cursor.close()

    @staticmethod
    def submit_presensi_harian_logic(db, data):
        cursor = db.cursor()
        try:
            id_dari_frontend = data.get('id_siswa')
            foto_bukti = data.get('foto_bukti')
            lat_raw = data.get('latitude')
            lng_raw = data.get('longitude')
            
            latitude = float(lat_raw) if lat_raw is not None and str(lat_raw).strip() != '' else None
            longitude = float(lng_raw) if lng_raw is not None and str(lng_raw).strip() != '' else None
            status_kehadiran = data.get('status_kehadiran', 'Hadir')
            
            if not id_dari_frontend:
                return {"status": "error", "message": "ID Siswa tidak lengkap atau Anda belum login."}, 400
                
            tanggal_hari_ini = datetime.now().strftime('%Y-%m-%d')
            jam_sekarang = datetime.now().strftime('%H:%M:%S')

            # ====================================================================
            # 🛡️ PROTEKSI SMART-LOOKUP: Cari id_siswa asli dari database
            # ====================================================================
            # Cek pertama: Apakah ID dari frontend ini memang id asli di tabel siswa?
            cursor.execute("SELECT id FROM siswa WHERE id = %s", (id_dari_frontend,))
            cek_siswa = cursor.fetchone()
            
            if cek_siswa:
                # Jika ketemu, berarti ID dari frontend sudah benar id_siswa asli
                id_siswa = id_dari_frontend
            else:
                # Jika tidak ketemu, kemungkinan frontend mengirimkan user_id (ID akun login)
                # Mari cari id_siswa berdasarkan user_id tersebut
                cursor.execute("SELECT id FROM siswa WHERE user_id = %s", (id_dari_frontend,))
                cek_user = cursor.fetchone()
                if cek_user:
                    if isinstance(cek_user, dict):
                        id_siswa = cek_user['id']
                    else:
                        id_siswa = cek_user[0]
                else:
                    # Jika di kedua tempat tetap tidak ada, berarti ID ini fiktif/tidak terdaftar
                    return {
                        "status": "error", 
                        "message": f"Gagal Presensi! Data kesiswaan untuk ID {id_dari_frontend} tidak ditemukan di database."
                    }, 400

            # ====================================================================
            # 1. Menggunakan JOIN ke tabel users untuk mengambil nama_lengkap siswa yang asli
            # ====================================================================
            cursor.execute("""
                SELECT u.nama_lengkap, s.no_hp_orang_tua 
                FROM siswa s
                JOIN users u ON s.user_id = u.id
                WHERE s.id = %s
            """, (id_siswa,))
            siswa_info = cursor.fetchone()
            
            if siswa_info:
                if isinstance(siswa_info, dict):
                    nama_siswa = siswa_info.get('nama_lengkap', 'Siswa')
                    no_hp_ortu = siswa_info.get('no_hp_orang_tua')
                else:
                    nama_siswa = siswa_info[0] if siswa_info[0] else "Siswa"
                    no_hp_ortu = siswa_info[1]
            else:
                nama_siswa = "Siswa"
                no_hp_ortu = None

            # ====================================================================
            # 2. Cek riwayat presensi hari ini menggunakan id_siswa yang sudah valid
            # ====================================================================
            cursor.execute("SELECT status_kehadiran FROM presensi_harian WHERE id_siswa = %s AND tanggal = %s", (id_siswa, tanggal_hari_ini))
            rows_exist = cursor.fetchall()
            
            jenis_absen = "Masuk"
            teks_keterangan = "Hadir Masuk Mandiri via Geofencing"

            if len(rows_exist) == 1:
                baris_pertama = rows_exist[0]
                if isinstance(baris_pertama, dict):
                    status_pertama = baris_pertama['status_kehadiran']
                else:
                    status_pertama = baris_pertama[0]
                    
                if status_pertama in ['Sakit', 'Izin', 'Alfa', 'Alpa']:
                    return {"status": "error", "message": f"Hari ini status Anda sudah dinyatakan {status_pertama}."}, 400
                
                jenis_absen = "Pulang"
                teks_keterangan = "Hadir Pulang Mandiri via Geofencing"
                
            elif len(rows_exist) >= 2:
                return {"status": "error", "message": "Anda sudah melakukan presensi masuk & pulang untuk hari ini!"}, 400

            if status_kehadiran in ['Sakit', 'Izin']:
                teks_keterangan = f"Siswa menyatakan {status_kehadiran} pada jam {jam_sekarang}"
            
            # ====================================================================
            # 3. Eksekusi kueri INSERT dengan id_siswa yang dijamin valid & lolos Foreign Key
            # ====================================================================
            cursor.execute("""
                INSERT INTO presensi_harian (id_siswa, tanggal, jam_masuk, status_kehadiran, keterangan, metode_presensi, foto_bukti, latitude, longitude)
                VALUES (%s, %s, %s, %s, %s, 'Geofencing', %s, %s, %s)
            """, (id_siswa, tanggal_hari_ini, jam_sekarang, status_kehadiran, teks_keterangan, foto_bukti, latitude, longitude))

            db.commit()

            # ====================================================================
            # 4. Kirim WhatsApp jika status Hadir
            # ====================================================================
            if status_kehadiran == 'Hadir' and no_hp_ortu:
                try:
                    PresensiController.kirim_whatsapp_ortu(no_hp_ortu, nama_siswa, jenis_absen, jam_sekarang)
                except Exception as wa_err:
                    print(f"⚠️ Gagal kirim WA tapi absen tetap sukses: {str(wa_err)}")

            return {"status": "success", "message": f"Presensi {status_kehadiran} ({jenis_absen}) berhasil disimpan!"}, 200
            
        except Exception as e:
            db.rollback()
            print(f"❌ LOG ERROR UTAMA BACKEND HARIAN: {str(e)}")
            return {"status": "error", "message": f"Internal Server Error: {str(e)}"}, 500
        finally:
            cursor.close()
    
    @staticmethod
    def get_status_hari_ini_logic(db, id_siswa):
        cursor = db.cursor()
        try:
            tanggal_hari_ini = datetime.now().strftime('%Y-%m-%d')
            
            # Cek ke tabel presensi_harian apakah siswa sudah absen hari ini
            cursor.execute("""
                SELECT status_kehadiran, keterangan 
                FROM presensi_harian 
                WHERE id_siswa = %s AND tanggal = %s
                ORDER BY jam_masuk DESC
            """, (id_siswa, tanggal_hari_ini))
            rows = cursor.fetchall()
            
            if not rows:
                return {
                    "status": "success",
                    "data": {
                        "status_kehadiran": "Belum Absen",
                        "keterangan": "Anda belum melakukan presensi hari ini.",
                        "mode_absen": "Masuk"
                    }
                }, 200
                
            total_absen = len(rows)
            baris_terakhir = rows[0]
            
            if isinstance(baris_terakhir, dict):
                status_terakhir = baris_terakhir["status_kehadiran"]
                ket_terakhir = baris_terakhir["keterangan"]
            else:
                status_terakhir = baris_terakhir[0]
                ket_terakhir = baris_terakhir[1]
                
            if total_absen == 1:
                if status_terakhir in ['Sakit', 'Izin']:
                    return {
                        "status": "success",
                        "data": {
                            "status_kehadiran": status_terakhir,
                            "keterangan": ket_terakhir,
                            "mode_absen": "Selesai"
                        }
                    }, 200
                else:
                    return {
                        "status": "success",
                        "data": {
                            "status_kehadiran": "Sudah Absen Masuk",
                            "keterangan": "Silakan lakukan absen pulang saat jam sekolah berakhir.",
                            "mode_absen": "Pulang"
                        }
                    }, 200
            else:
                return {
                    "status": "success",
                    "data": {
                        "status_kehadiran": "Sudah Absen Pulang",
                        "keterangan": "Presensi harian Anda hari ini telah lengkap.",
                        "mode_absen": "Selesai"
                    }
                }, 200
                
        except Exception as e:
            return {"status": "error", "message": f"Gagal memuat status harian: {str(e)}"}, 500
        finally:
            cursor.close()

    @staticmethod
    def get_jurnal_harian_logic(db, kelas, tanggal):
        cursor = db.cursor()
        try:
            # Query mengambil semua kolom presensi harian siswa sesuai kelas & tanggal
            query = """
                SELECT 
                    s.id AS id_siswa, 
                    s.nisn AS nisn_siswa, 
                    u.nama_lengkap AS nama_siswa, 
                    ph.id_presensi_harian,
                    ph.jam_masuk,
                    ph.metode_presensi,
                    ph.foto_bukti,
                    COALESCE(ph.status_kehadiran, 'Alpa') AS status_sekarang,
                    COALESCE(ph.keterangan, 'Belum Melakukan Absen') AS keterangan_log
                FROM siswa s
                JOIN users u ON s.user_id = u.id
                LEFT JOIN presensi_harian ph ON s.id = ph.id_siswa AND ph.tanggal = %s
                WHERE s.kelas = %s
                ORDER BY u.nama_lengkap ASC
            """
            cursor.execute(query, (tanggal, kelas))
            rows = cursor.fetchall()
            
            result = []
            for row in rows:
                # Murni menggunakan pemanggilan nama kolom (dictionary) agar tidak error
                result.append({
                    "id_siswa": row.get("id_siswa"),
                    "nis": row.get("nisn_siswa"),
                    "nama": row.get("nama_siswa"),
                    "id_presensi_harian": row.get("id_presensi_harian"),
                    "jam_masuk": str(row.get("jam_masuk")) if row.get("jam_masuk") else "-",
                    "metode_presensi": row.get("metode_presensi") or "-",
                    "foto_bukti": row.get("foto_bukti") or None,
                    "status_kehadiran": row.get("status_sekarang"),
                    "keterangan": row.get("keterangan_log")
                })
            
            return {"status": "success", "data": result}, 200
        except Exception as e:
            return {"status": "error", "message": f"Gagal mengambil jurnal harian: {str(e)}"}, 500
        finally:
            cursor.close()

    @staticmethod
    def simpan_jurnal_harian_logic(db, kelas, tanggal, data_siswa_diubah):
        cursor = db.cursor()
        try:
            if not data_siswa_diubah:
                return {"status": "error", "message": "Tidak ada data siswa yang dikirim untuk disimpan."}, 400
                
            jam_sekarang = datetime.now().strftime('%H:%M:%S')
            
            for item_siswa in data_siswa_diubah:
                id_siswa = item_siswa.get('id_siswa')
                status_baru = item_siswa.get('status_kehadiran')
                
                if not id_siswa or not status_baru:
                    continue
                
                # Menentukan keterangan log otomatis berdasarkan perubahan status guru
                ket_log = "Koreksi Guru Piket"
                if status_baru == 'Hadir':
                    ket_log = f"Hadir Manual ({datetime.now().strftime('%H:%M')})"
                elif status_baru == 'Izin':
                    ket_log = "Izin (Ada Surat)"
                elif status_baru == 'Sakit':
                    ket_log = "Sakit (Ada Surat/Kabar)"
                elif status_baru in ['Alpa', 'Alpha']:
                    status_baru = 'Alpa'
                    ket_log = "Tanpa Keterangan"

                # Jalankan pengecekan data di database berdasarkan id_siswa dan tanggal
                cursor.execute("""
                    SELECT id_presensi_harian FROM presensi_harian 
                    WHERE id_siswa = %s AND tanggal = %s
                """, (id_siswa, tanggal))
                exist = cursor.fetchone()
                
                if exist:
                    # UPDATE jika data presensi hari tersebut sudah ada sebelumnya
                    cursor.execute("""
                        UPDATE presensi_harian 
                        SET status_kehadiran = %s, keterangan = %s, jam_masuk = %s, metode_presensi = 'Koreksi Piket'
                        WHERE id_siswa = %s AND tanggal = %s
                    """, (status_baru, ket_log, jam_sekarang, id_siswa, tanggal))
                else:
                    # INSERT jika siswa belum memiliki record absen di tanggal tersebut
                    cursor.execute("""
                        INSERT INTO presensi_harian 
                        (id_siswa, tanggal, jam_masuk, status_kehadiran, keterangan, metode_presensi, foto_bukti)
                        VALUES (%s, %s, %s, %s, %s, 'Koreksi Piket', NULL)
                    """, (id_siswa, tanggal, jam_sekarang, status_baru, ket_log))
                    
            db.commit()
            return {"status": "success", "message": f"Berhasil memperbarui data presensi kelas {kelas}!"}, 200
        except Exception as e:
            db.rollback()
            # Mencetak pesan error SQL asli ke terminal Flask Anda (misal: kolom kurang, nama tabel salah)
            print(f"❌ ERROR DATABASE SQL: {str(e)}")
            return {"status": "error", "message": f"Gagal memproses data SQL: {str(e)}"}, 500
        finally:
            cursor.close()