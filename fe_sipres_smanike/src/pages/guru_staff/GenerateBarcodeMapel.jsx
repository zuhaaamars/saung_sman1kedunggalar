import React, { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import axios from 'axios';
import { QrCode, Play, RefreshCw, BookOpen, Layers, Clock, AlertCircle } from 'lucide-react';

const GenerateQRMapel = () => {
  // ==========================================
  // STATE MANAGEMENT DATA DARI BACKEND
  // ==========================================
  const [listJadwalHariIni, setListJadwalHariIni] = useState([]);
  const [selectedJadwalId, setSelectedJadwalId] = useState('');
  
  // State informasi detail jadwal yang dipilih
  const [detailJadwal, setDetailJadwal] = useState({ mapel: '', kelas: '', jam: '' });
  const [qrToken, setQrToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorBackend, setErrorBackend] = useState('');

  // =====================================================================
  // AMBIL DATA PLOTTING JADWAL HARI INI BERDASARKAN GURU YANG LOGIN
  // =====================================================================
  useEffect(() => {
    const fetchJadwalGuru = async () => {
      try {
        // 💡 FIX AUTH: Bersihkan token dari tanda kutip ganda bawaan string browser
        const token = localStorage.getItem('token')?.replace(/^"+|"+$/g, '');
        const userRaw = localStorage.getItem('user');
        if (!userRaw) return;

        // HIT API untuk mengambil daftar jadwal mengajar milik guru tersebut
        const response = await axios.get('http://localhost:5000/api/admin/jadwal', {
          headers: { Authorization: `Bearer ${token}` }
        });

        // Filter jadwal berdasarkan hari ini secara dinamis
        const hariInggrisKeIndo = {
          'Monday': 'Senin', 'Tuesday': 'Selasa', 'Wednesday': 'Rabu',
          'Thursday': 'Kamis', 'Friday': 'Jumat', 'Saturday': 'Sabtu', 'Sunday': 'Minggu'
        };
        const hariIni = hariInggrisKeIndo[new Date().toLocaleDateString('en-US', { weekday: 'long' })];

        if (Array.isArray(response.data)) {
          const jadwalHariIni = response.data.filter(item => item.hari === hariIni);
          setListJadwalHariIni(jadwalHariIni);
        } else if (response.data.data && Array.isArray(response.data.data)) {
          const jadwalHariIni = response.data.data.filter(item => item.hari === hariIni);
          setListJadwalHariIni(jadwalHariIni);
        }
      } catch (err) {
        console.error("Gagal memuat jadwal guru:", err);
      }
    };

    fetchJadwalGuru();
  }, []);

  // Handler ketika guru memilih salah satu opsi jadwal di dropdown
  const handleJadwalChange = (e) => {
    const id = e.target.value;
    setSelectedJadwalId(id);
    setErrorBackend('');

    if (!id) {
      setDetailJadwal({ mapel: '', kelas: '', jam: '' });
      return;
    }

    const opsiTerpilih = listJadwalHariIni.find(item => String(item.id_jadwal) === String(id));
    if (opsiTerpilih) {
      setDetailJadwal({
        kelas: opsiTerpilih.nama_kelas || `Kelas ${opsiTerpilih.id_kelas}`,
        mapel: opsiTerpilih.nama_mapel || `Mapel ${opsiTerpilih.id_mapel}`,
        jam: `${opsiTerpilih.jam_mulai} - ${opsiTerpilih.jam_selesai}`
      });
    }
  };

  // ==========================================
  // HIT API BACKEND: GENERATE QR SECARA NYATA
  // ==========================================
  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!selectedJadwalId) {
      alert('Silakan pilih jadwal mengajar yang aktif terlebih dahulu!');
      return;
    }

    setLoading(true);
    setErrorBackend('');
    try {
      // 💡 FIX AUTH: Bersihkan pembungkus string pada token JWT
      const token = localStorage.getItem('token')?.replace(/^"+|"+$/g, '');
      
      // 💡 FIX URL PATH: Ditambahkan sub-folder /presensi agar sinkron dengan register_blueprint Flask
      const response = await axios.post(
        'http://localhost:5000/api/presensi/guru/generate-qr',
        { id_jadwal: parseInt(selectedJadwalId, 10) },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.status === "success") {
        setQrToken(response.data.qr_token);
      }
    } catch (err) {
      console.error(err);
      setErrorBackend(err.response?.data?.message || "Gagal mengaktifkan sesi presensi QR.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setQrToken(null);
    setSelectedJadwalId('');
    setDetailJadwal({ mapel: '', kelas: '', jam: '' });
    setErrorBackend('');
  };

  return (
    <div className="max-w-4xl mx-auto font-sans pb-12 p-4">
      {/* HEADER UTAMA */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-[#3e2723] uppercase">Mulai Sesi Mengajar & QR Presensi</h1>
        <p className="text-gray-500 text-sm">Buka jam pelajaran hari ini untuk mengaktifkan QR Code kehadiran bagi siswa.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* PANEL KIRI: FORM SELEKSI JADWAL AKTIF */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-xs font-black text-[#3e2723] uppercase mb-4 tracking-wider">Konfigurasi Kelas</h2>
            
            <form onSubmit={handleGenerate} className="space-y-4">
              {/* SELECT JADWAL MENGAJAR */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pilih Jadwal Mengajar Anda</label>
                <div className="relative">
                  <select
                    value={selectedJadwalId}
                    onChange={handleJadwalChange}
                    disabled={!!qrToken}
                    className="w-full px-3 py-2.5 pl-9 border border-gray-200 rounded-xl text-xs font-bold bg-white focus:outline-none focus:border-[#E67E22] disabled:bg-gray-50 disabled:text-gray-400 appearance-none"
                  >
                    <option value="">-- Pilih Jadwal Aktif Hari Ini --</option>
                    {listJadwalHariIni.map((item) => (
                      <option key={item.id_jadwal} value={item.id_jadwal}>
                        {item.nama_kelas || `Kelas ${item.id_kelas}`} - {item.nama_mapel || `Mapel ${item.id_mapel}`} ({item.jam_mulai} - {item.jam_selesai})
                      </option>
                    ))}
                  </select>
                  <BookOpen size={14} className="absolute left-3 top-3.5 text-gray-400" />
                </div>
              </div>

              {/* TAMPILKAN PREVIEW DATA JADWAL JIKA SUDAH DIPILIH */}
              {selectedJadwalId && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 text-xs font-medium text-slate-600">
                  <div className="flex justify-between"><span>Kelas:</span> <strong className="text-slate-800">{detailJadwal.kelas}</strong></div>
                  <div className="flex justify-between"><span>Mata Pelajaran:</span> <strong className="text-slate-800">{detailJadwal.mapel}</strong></div>
                  <div className="flex justify-between"><span>Alokasi Jam:</span> <strong className="text-slate-800">{detailJadwal.jam}</strong></div>
                </div>
              )}

              {/* ACTION BUTTON */}
              {!qrToken ? (
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-[#E67E22] hover:bg-[#d35400] text-white text-xs font-bold rounded-xl shadow-md transition disabled:bg-gray-300 cursor-pointer"
                >
                  {loading ? (
                    <><RefreshCw size={14} className="animate-spin" /> Menghubungkan...</>
                  ) : (
                    <><Play size={14} /> Buka Kelas & Generate QR</>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
                >
                  Tutup Sesi Mengajar
                </button>
              )}
            </form>
          </div>

          {/* ERROR HANDLER DARI SERVER */}
          {errorBackend && (
            <div className="p-3 bg-red-50 text-red-700 rounded-xl border border-red-100 text-xs font-bold">
              ⚠️ Error: {errorBackend}
            </div>
          )}

          {/* BOX STATUS CONTEXT */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-start gap-3">
            <AlertCircle className={`shrink-0 mt-0.5 ${qrToken ? 'text-emerald-500' : 'text-amber-500'}`} size={18} />
            <div>
              <h4 className={`text-xs font-bold uppercase ${qrToken ? 'text-emerald-700' : 'text-amber-700'}`}>
                {qrToken ? 'Sesi Presensi Aktif' : 'Menunggu Aktivasi'}
              </h4>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {qrToken 
                  ? `Siswa kelas ${detailJadwal.kelas} sekarang bisa memindai QR Code ini untuk mencatat kehadiran.`
                  : 'Silakan pilih kombinasi mengajar lalu aktifkan QR Code untuk dipajang di proyektor kelas.'}
              </p>
            </div>
          </div>
        </div>

        {/* PANEL KANAN: DISPLAY QR CODE CANVAS */}
        <div className="md:col-span-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center justify-center min-h-[380px] relative text-center">
            {qrToken ? (
              <div className="space-y-5 w-full flex flex-col items-center">
                <div className="space-y-1">
                  <span className="bg-[#f5e6d3] text-[#3e2723] text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">{detailJadwal.kelas}</span>
                  <h3 className="text-lg font-black text-[#3e2723] mt-1">{detailJadwal.mapel}</h3>
                  <p className="text-xs text-gray-400 font-medium">Jam Pelajaran: {detailJadwal.jam}</p>
                </div>

                {/* CONTAINER REAL QR CANVAS */}
                <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-md relative group my-1">
                  <QRCodeCanvas 
                    value={qrToken} 
                    size={190}
                    bgColor={"#ffffff"}
                    fgColor={"#3e2723"} 
                    level={"H"}
                    includeMargin={true}
                  />
                </div>

                <div className="flex items-center gap-2 text-[11px] text-gray-400 font-medium bg-gray-50 px-3 py-1.5 rounded-lg">
                  <RefreshCw size={12} className="text-emerald-500" />
                  <span className="text-emerald-600 font-bold">Token Resmi Terenkripsi Server</span>
                </div>

                <div className="text-[9px] bg-gray-50 font-mono px-3 py-2 rounded-lg text-gray-400 max-w-xs truncate border border-gray-100">
                  Secure Token: {qrToken}
                </div>
              </div>
            ) : (
              <div className="text-gray-300 flex flex-col items-center py-12">
                <QrCode size={80} className="stroke-1 mb-3 text-gray-200 animate-pulse" />
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Layar QR Presensi</h3>
                <p className="text-xs text-gray-400 max-w-xs mt-1">
                  QR Code dinamis akan dirender di area ini setelah tombol aktivasi ditekan.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GenerateQRMapel;