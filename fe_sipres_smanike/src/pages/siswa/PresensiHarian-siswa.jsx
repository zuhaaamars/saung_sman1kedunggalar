import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Camera, MapPin, Navigation, History, 
  CheckCircle2, Clock, RefreshCw, Map as MapIcon,
  ChevronRight, AlertCircle, Info, FileText, Loader2
} from 'lucide-react';

const TARGET_COORDS = { lat: -7.5073594, lng: 111.1823350 }; // Koordinat Resmi SMAN 1 Kedunggalar
const MAX_RADIUS = 100; // Radius Batas 100 Meter

const ScanPresensiHarian = () => {
  // 💡 LOGIKA BARU: Mengambil ID siswa dari localStorage yang diset saat login (Dinamis)
  const [siswaId, setSiswaId] = useState(() => {
    const userJson = localStorage.getItem('user'); // Sesuaikan key localStorage jika di projectmu berbeda (misal: 'user_logged_in')
    if (userJson) {
      const userObj = JSON.parse(userJson);
      return userObj.id_siswa || userObj.id || null;
    }
    return null; // Jika session kosong/tidak login, set null (bukan angka 2 lagi)
  });

  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  const [isWithinRadius, setIsWithinRadius] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [capturedImage, setCapturedImage] = useState(null);
  const [location, setLocation] = useState({ lat: null, lng: null });
  const [distance, setDistance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  
  // Sinkronisasi status dari DB
  const [statusHariIni, setStatusHariIni] = useState('Belum Absen');
  const [keteranganAdmin, setKeteranganAdmin] = useState('Mengambil status absensi...');
  
  // State Tambahan Opsi Kehadiran & Mode Sinkronisasi Jam
  const [pilihanStatus, setPilihanStatus] = useState('Hadir'); 
  const [modeAbsen, setModeAbsen] = useState('Masuk'); // 'Masuk', 'Pulang', atau 'Selesai'

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // ==========================================
  // 1. LIFECYCLE & EFFECT
  // ==========================================
  useEffect(() => {
    if (siswaId) {
      const timer = setInterval(() => setCurrentTime(new Date()), 1000);
      fetchStatusHariIni();
      fetchRiwayatAbsen();
      return () => clearInterval(timer);
    }
  }, [siswaId]);

  // ==========================================
  // 2. GET: AMBIL STATUS ABSENSI HARI INI
  // ==========================================
  const fetchStatusHariIni = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/presensi/status-hari-ini/${siswaId}`);
      if (response.data.status === 'success' && response.data.data) {
        setStatusHariIni(response.data.data.status_kehadiran);
        setKeteranganAdmin(response.data.data.keterangan);
        setModeAbsen(response.data.data.mode_absen); 
      }
    } catch (error) {
      console.error("Gagal mengambil status hari ini:", error);
      setKeteranganAdmin('Gagal memuat status dari server sekolah.');
    }
  };

  // ==========================================
  // 3. GET: AMBIL RIWAYAT ABSENSI PEKAN INI
  // ==========================================
  const fetchRiwayatAbsen = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/presensi/riwayat/${siswaId}`);
      if (response.data.status === 'success') {
        setHistory(response.data.data);
      }
    } catch (error) {
      console.error("Gagal memuat riwayat absen:", error);
    }
  };

  // ==========================================
  // 4. LOGIKA GPS GEOFENCING
  // ==========================================
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || lat1 === 0 || lon1 === 0) return 0;
    const R = 6371e3;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
  };

  const getRealtimeLocation = () => {
    if (!navigator.geolocation) {
      alert('Perangkat Anda tidak mendukung fitur lokasi (GPS).');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (latitude && longitude) {
          setLocation({ lat: latitude, lng: longitude });
          const d = calculateDistance(latitude, longitude, TARGET_COORDS.lat, TARGET_COORDS.lng);
          setDistance(Math.round(d));
          setIsWithinRadius(d <= MAX_RADIUS);
        }
      },
      (error) => {
        console.error(error);
        alert('Gagal mendeteksi koordinat GPS. Pastikan setelan lokasi perangkat aktif.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    getRealtimeLocation();
    if ("geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          if (latitude && longitude) {
            setLocation({ lat: latitude, lng: longitude });
            const d = calculateDistance(latitude, longitude, TARGET_COORDS.lat, TARGET_COORDS.lng);
            setDistance(Math.round(d));
            setIsWithinRadius(d <= MAX_RADIUS);
          }
        },
        (err) => console.log("Mencari sinyal GPS..."),
        { enableHighAccuracy: true, maximumAge: 0 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  // ==========================================
  // 5. LOGIKA AKSES & AMBIL FOTO KAMERA
  // ==========================================
  const startCamera = async () => {
    try {
      // Meminta izin kamera depan secara eksplisit
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Pastikan video dimainkan setelah stream siap
        videoRef.current.play().catch(e => console.error("Gagal play video otomatik:", e));
      }
    } catch (err) {
      console.error("Detail Error Kamera:", err);
      alert('Gagal membuka kamera. Pastikan Anda memberikan IZIN AKSES KAMERA pada browser Anda (klik ikon gembok di sebelah URL bar).');
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Pengecekan kritis: pastikan kamera aktif dan video sedang berjalan
    if (!video || !video.srcObject) {
      alert('Kamera belum aktif! Silakan klik "Buka Kamera" terlebih dahulu sebelum mengambil foto.');
      return;
    }

    if (canvas) {
      // Ambil ukuran asli dari video stream yang sedang berjalan
      const videoWidth = video.videoWidth || 640;
      const videoHeight = video.videoHeight || 480;

      canvas.width = videoWidth;
      canvas.height = videoHeight;
      
      const ctx = canvas.getContext('2d');
      // Gambar video ke dalam canvas
      ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
      
      // Ubah gambar menjadi format Base64 (JPEG)
      const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImage(imageBase64);

      // Matikan lampu & stream kamera setelah berhasil mengambil foto agar hemat baterai
      const stream = video.srcObject;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    } else {
      alert('Sistem penangkap gambar (Canvas) tidak siap. Hubungi admin.');
    }
  };

  // ==========================================
  // 6. POST: SUBMIT ABSENSI KE BACKEND
  // ==========================================
  const handleKirimPresensi = async () => {
    if (!siswaId) {
      alert('Sesi Anda tidak valid. Silakan login kembali ke akun Anda.');
      return;
    }

    if (pilihanStatus === 'Hadir') {
      if (!isWithinRadius) {
        alert('Anda berada di luar radius sekolah SMAN 1 Kedunggalar!');
        return;
      }
      if (!capturedImage) {
        alert('Ambil foto selfie verifikasi wajah terlebih dahulu.');
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        id_siswa: siswaId, 
        foto_bukti: pilihanStatus === 'Hadir' ? capturedImage : null,
        latitude: location.lat,
        longitude: location.lng,
        status_kehadiran: pilihanStatus 
      };
      
      // 💡 1. AMBIL TOKEN LOGIN DARI LOCALSTORAGE
      const token = localStorage.getItem('token'); 

      // 💡 2. KIRIMKAN PAYLOAD DAN SERTAKAN HEADER AUTHORIZATION JWT
      const response = await axios.post('http://localhost:5000/api/presensi/harian', payload, {
        headers: {
          Authorization: `Bearer ${token}` // Token ini yang dibaca oleh @jwt_required() di Flask
        }
      });

      // Tetap pertahankan logika response sukses bawaan Anda:
      if (response.data.status === 'success') {
        alert(response.data.message);
        setCapturedImage(null);
        fetchStatusHariIni();
        fetchRiwayatAbsen();
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Gagal menyimpan data presensi.');
    } finally {
      setLoading(false);
    }
  };

  // Tampilan penolak jika user belum login sama sekali
  if (!siswaId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center shadow-xs max-w-sm">
          <AlertCircle className="text-rose-500 mx-auto mb-2" size={32} />
          <h3 className="font-black text-slate-800 text-sm uppercase">Sesi Login Tidak Ditemukan</h3>
          <p className="text-xs text-slate-500 mt-1">Silakan logout kemudian login kembali ke akun Anda untuk melakukan absensi mandiri.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <main className="max-w-md mx-auto p-4 pb-24">
        
        {/* CARD WAKTU */}
        <div className="bg-slate-900 rounded-3xl p-6 text-white text-center shadow-xs mb-5 relative overflow-hidden border border-slate-800">
          <p className="text-[10px] uppercase font-black text-indigo-400 tracking-widest flex items-center justify-center gap-1">
            <Clock size={12} /> Waktu Presensi Realtime
          </p>
          <h1 className="text-4xl font-black font-mono mt-1.5 tracking-tight">
            {currentTime.toLocaleTimeString('id-ID')}
          </h1>
          <p className="text-[11px] text-slate-400 font-bold mt-1">
            {currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* STATUS HARI INI */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-2xs mb-5">
          <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">Status Kehadiran Anda Hari Ini:</span>
          <div className="flex items-center gap-2.5 mt-1.5">
            <span className={`text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider ${
              statusHariIni === 'Hadir' || statusHariIni === 'Sudah Absen Masuk' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
              statusHariIni === 'Izin' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
              statusHariIni === 'Sakit' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-rose-50 text-rose-500 border border-rose-200'
            }`}>
              {statusHariIni}
            </span>
            <p className="text-xs font-bold text-slate-600">{keteranganAdmin}</p>
          </div>
        </div>

        {/* UTAMA: FORM OPERASIONAL */}
        {modeAbsen !== 'Selesai' && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xs p-5 mb-5 text-center">
            
            {/* TAB SELEKTOR PILIHAN STATUS */}
            <div className="mb-5 text-left">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">Pilih Opsi Keterangan:</label>
              <div className="grid grid-cols-3 gap-2">
                {['Hadir', 'Sakit', 'Izin'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      setPilihanStatus(st);
                      if (st !== 'Hadir') setCapturedImage(null);
                    }}
                    className={`py-2 px-3 rounded-xl font-black text-xs uppercase tracking-wide transition-all border ${
                      pilihanStatus === st 
                        ? 'bg-slate-950 text-white border-slate-950' 
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* JIKA MEMILIH STATUS HADIR (WAJIB GEOFENCING + SELFIE) */}
            {pilihanStatus === 'Hadir' && (
              <>
                {/* GEOLOCATION DETECTOR */}
                <div className={`p-4 rounded-2xl border text-left flex items-start gap-3 mb-4 ${isWithinRadius ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'}`}>
                  <MapPin className={`mt-0.5 ${isWithinRadius ? 'text-emerald-500' : 'text-rose-500'}`} size={18} />
                  <div>
                    <h4 className="text-xs font-black text-slate-800">Verifikasi Jarak Geofencing</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Jarak Anda: <span className="font-bold text-slate-700">{distance} meter</span> dari Sekolah. 
                      ({isWithinRadius ? 'Dalam Radius Berizin' : 'Diluar Radius Batas 100m'})
                    </p>
                  </div>
                </div>

                {/* AREA KAMERA SELFIE */}
                <div className="mb-4">
                  {!capturedImage ? (
                    <div className="border border-dashed border-slate-200 rounded-2xl p-4 bg-slate-50 flex flex-col items-center justify-center">
                      <video ref={videoRef} autoPlay playsInline className="w-full max-h-48 rounded-xl bg-black object-cover mb-3" />
                      
                      {/* 💡 PASTIKAN TAG CANVAS INI ADA DAN TERSEMBUNYI (hidden) */}
                      <canvas ref={canvasRef} className="hidden" />

                      <div className="flex gap-2">
                        <button type="button" onClick={startCamera} className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5">
                          <RefreshCw size={12} /> Buka Kamera
                        </button>
                        <button type="button" onClick={capturePhoto} className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5">
                          <Camera size={12} /> Ambil Foto
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative rounded-2xl overflow-hidden border border-slate-200">
                      <img src={capturedImage} alt="Bukti Hadir" className="w-full max-h-48 object-cover" />
                      <button type="button" onClick={() => setCapturedImage(null)} className="absolute bottom-2 right-2 bg-rose-600 text-white px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider">
                        Foto Ulang
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* TOMBOL SUBMIT ABSEN */}
            <button
              type="button"
              onClick={handleKirimPresensi}
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={14} /> Memproses...
                </>
              ) : (
                `Kirim Presensi ${pilihanStatus} (${modeAbsen})`
              )}
            </button>
          </div>
        )}

        {/* RIWAYAT ABSENSI */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xs p-5">
          <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
            <History size={14} className="text-indigo-500" /> Riwayat Absen Pekan Ini
          </h2>
          <div className="space-y-3">
            {history.length > 0 ? (
              history.map((item, index) => (
                <div key={index} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${item.status_kehadiran === 'Hadir' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      <div>
                        <p className="text-xs font-black text-slate-800">{item.status_kehadiran}</p>
                        <p className="text-[10px] text-slate-400 font-bold">
                          {item.waktu_scan ? `${item.waktu_scan} WIB` : '--:--'} • {item.tanggal_absen}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center">
                <History size={20} className="text-slate-300 mx-auto mb-1.5" />
                <p className="text-xs text-slate-400">Belum ada riwayat presensi harian.</p>
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
};

export default ScanPresensiHarian;