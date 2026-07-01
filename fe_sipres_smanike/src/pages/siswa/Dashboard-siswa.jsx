import React, { useState, useEffect } from 'react';
import { 
  User, Calendar, Clock, BookOpen, 
  CheckCircle, AlertCircle, Info, QrCode,
  ShieldAlert
} from 'lucide-react';

const DashboardSiswa = () => {
  const [siswaData, setSiswaData] = useState({
    siswaLogin: "Memuat...",
    kelas: "-",
    stats: { hadirHarian: 0, sakit: 0, izin: 0, alfa: 0 },
    jadwalHariIni: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSiswaDashboard = async () => {
      try {
        const userId = localStorage.getItem('user_id') || 9; 
        const response = await fetch(`http://localhost:5000/api/admin/siswa/dashboard/stats?user_id=${userId}`);
        const data = await response.json();
        
        if (data.status === "success") {
          setSiswaData(data);
        }
      } catch (error) {
        console.error("Gagal mengambil data dashboard siswa:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSiswaDashboard();
  }, []);

  const handleScanQR = (idJadwal) => {
    alert(`Membuka Kamera Scanner untuk ID Jadwal: ${idJadwal}.`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#F4A261] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm font-semibold text-gray-500">Memuat Dashboard Siswa...</p>
        </div>
      </div>
    );
  }

  return (
    // 🌟 PERBAIKAN UTAMA: Menggunakan w-full h-full p-6 tanpa flex-sidebar jika ini halaman mandiri
    <div className="min-h-screen bg-slate-50/50 w-full">
      <div className="max-w-7xl mx-auto w-full space-y-6">
        
        {/* WELCOME BANNER */}
        <div className="relative bg-gradient-to-r from-[#2B2D42] via-[#3E2723] to-[#1A1C29] rounded-3xl p-6 md:p-8 text-white overflow-hidden shadow-xl shadow-slate-200/50 w-full">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-2xl translate-x-10 -translate-y-10"></div>
          <div className="relative z-10 space-y-2">
            <span className="bg-white/10 text-[#F4A261] font-bold px-3 py-1 rounded-full text-[10px] uppercase tracking-widest border border-white/5">
              Portal Kehadiran Siswa
            </span>
            <h2 className="text-xl md:text-2xl font-black tracking-tight pt-1">
              {siswaData.siswaLogin}
            </h2>
            <p className="text-xs text-slate-300 font-medium max-w-xl">
              Pantau rekapitulasi kehadiran harian serta lakukan pemindaian presensi mata pelajaran kelas secara real-time.
            </p>
            <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 text-xs font-bold text-[#F4A261] mt-3">
              <BookOpen size={14} /> Kelas Aktif: {siswaData.kelas}
            </div>
          </div>
        </div>

        {/* STATISTIK CARDS SECTION */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          {/* CARD HADIR */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Hadir</p>
              <h3 className="text-xl font-black text-gray-900 mt-1">{siswaData.stats.hadirHarian}</h3>
            </div>
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 font-bold">H</div>
          </div>

          {/* CARD SAKIT */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sakit</p>
              <h3 className="text-xl font-black text-gray-900 mt-1">{siswaData.stats.sakit}</h3>
            </div>
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 font-bold">S</div>
          </div>

          {/* CARD IZIN */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Izin Resmi</p>
              <h3 className="text-xl font-black text-gray-900 mt-1">{siswaData.stats.izin}</h3>
            </div>
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 font-bold">I</div>
          </div>

          {/* CARD ALFA */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tanpa Keterangan</p>
              <h3 className="text-xl font-black text-red-600 mt-1">{siswaData.stats.alfa}</h3>
            </div>
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-600 font-bold">A</div>
          </div>
        </section>

        {/* TABEL JADWAL HARI INI */}
        <section className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden w-full">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#F4A261]" />
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">Jadwal Kelas & Presensi Hari Ini</h3>
            </div>
            <span className="bg-slate-100 text-slate-600 font-bold px-3 py-1 rounded-lg text-[10px]">Siswa</span>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-gray-100">
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider w-16">No</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Jam Belajar</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Mata Pelajaran</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Guru Pengajar</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status Absen</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center w-44">Aksi Absensi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {siswaData.jadwalHariIni && siswaData.jadwalHariIni.length > 0 ? (
                  siswaData.jadwalHariIni.map((jadwal, index) => (
                    <tr key={jadwal.idJadwal || index} className="hover:bg-slate-50/40 transition-colors">
                      <td className="px-6 py-4 text-xs font-semibold text-gray-500">{index + 1}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          {jadwal.jam}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-black text-[#3e2723]">{jadwal.mapel}</td>
                      <td className="px-6 py-4 text-xs font-medium text-gray-600">{jadwal.guru}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide inline-flex items-center gap-1.5 ${
                          jadwal.statusAbsen === 'Belum Absen' 
                            ? 'bg-slate-100 text-slate-500' 
                            : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {jadwal.statusAbsen === 'Belum Absen' ? <AlertCircle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                          {jadwal.statusAbsen}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {jadwal.statusAbsen !== 'Belum Absen' ? (
                          <button disabled className="w-full bg-slate-100 text-slate-400 px-4 py-2 rounded-xl text-[11px] font-bold cursor-not-allowed">
                            Selesai Absen
                          </button>
                        ) : jadwal.qrTersedia ? (
                          <button 
                            onClick={() => handleScanQR(jadwal.idJadwal)}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-100 transition-colors"
                          >
                            <QrCode className="w-3.5 h-3.5" /> Scan QR Guru
                          </button>
                        ) : (
                          <button disabled className="w-full bg-amber-50 text-amber-600/70 border border-amber-100/50 px-4 py-2 rounded-xl text-[10px] font-bold cursor-not-allowed flex items-center justify-center gap-1">
                            <Info className="w-3 h-3" /> QR Belum Siap
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center py-16 text-xs font-bold text-gray-400 uppercase tracking-wider bg-slate-50/20">
                      Tidak ada jadwal pelajaran untuk kelas Anda hari ini
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* FOOTER PEMBERITAHUAN */}
        <div className="bg-slate-100/70 border border-slate-200/60 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
          <div className="flex items-start gap-3">
            <ShieldAlert className="text-slate-500 shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wide">Pemberitahuan Sistem Otomasi</h4>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Tombol pemindaian QR mata pelajaran di atas hanya akan terbuka secara otomatis apabila guru pengajar telah mengaktifkan token QR pendaftaran di dalam ruang kelas.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DashboardSiswa;