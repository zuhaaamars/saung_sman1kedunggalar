import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, Clock, ArrowRight, BookOpen, RefreshCw } from 'lucide-react';
import axios from 'axios';

const DashboardGuru = () => {
  // State Utama Data dari Backend
  const [stats, setStats] = useState({
    totalPlottingSesi: 0,
    kelasHariIni: 0,
    totalJamMinggu: 0
  });
  const [masterJadwal, setMasterJadwal] = useState([]);
  const [guruLogin, setGuruLogin] = useState("Memuat nama...");
  const [hariIni, setHariIni] = useState("");
  const [loading, setLoading] = useState(true);

  // State Management Filter Manual
  const [filterHari, setFilterHari] = useState("Hari Ini");
  const daftarHari = ["Hari Ini", "Semua Hari", "Senin", "Selasa", "Rabu", "Kamis", "Jumat"];

  // Ambil data tanggal lokal untuk UI Banner
  const opsiTanggal = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const tanggalHariIni = new Date().toLocaleDateString('id-ID', { ...opsiTanggal });

  // Fungsi Fetch Data dari Backend Flask
  const fetchDashboardData = () => {
    setLoading(true);
    
    // Ambil user_id dari localStorage hasil login
    const userJson = localStorage.getItem('user');
    let userId = null;
    if (userJson) {
      const userObj = JSON.parse(userJson);
      userId = userObj.id; 
    }

    let token = localStorage.getItem('token');
    if (token) {
      token = token.replace(/^"+|"+$/g, '');
    }

    if (!userId) {
      console.error("User ID tidak ditemukan, silakan login ulang.");
      setLoading(false);
      return;
    }

    // Tembak API baru yang sudah kita buat di admin_models.py
    axios.get(`http://localhost:5000/api/admin/guru/dashboard/stats`, {
      params: { user_id: userId },
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      if (res.data && res.data.status === "success") {
        setGuruLogin(res.data.guruLogin);
        setHariIni(res.data.hariIni);
        setStats(res.data.stats);
        setMasterJadwal(res.data.masterJadwal);
      }
      setLoading(false);
    })
    .catch(err => {
      console.error("Gagal memuat data dashboard guru:", err);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Logika Penyaringan Data Berdasarkan Filter Hari
  const jadwalTersaring = masterJadwal.filter(item => {
    if (filterHari === "Hari Ini") {
      return item.hari === hariIni;
    }
    if (filterHari === "Semua Hari") {
      return true;
    }
    return item.hari === filterHari;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-500 font-sans">
        <RefreshCw className="animate-spin text-[#E67E22] mb-2" size={32} />
        <p className="text-sm font-bold uppercase tracking-wider">Menyinkronkan Data Kelas...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto font-sans pb-12">
      
      {/* WELCOME & CONTEXT BANNER */}
      <div className="bg-[#3e2723] text-white p-6 rounded-2xl shadow-sm mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#E67E22] bg-[#E67E22]/10 px-2.5 py-1 rounded-md">
            Portal Resmi Guru SMANIKE
          </span>
          <h1 className="text-xl font-black mt-2 text-white">Panel Pemantauan Kelas Mandiri</h1>
          <p className="text-gray-300 text-xs mt-0.5">Selamat Mengajar, <span className="text-[#E67E22] font-bold">{guruLogin}</span></p>
        </div>
        <div className="bg-white/10 px-4 py-2.5 rounded-xl border border-white/5 backdrop-blur-xs shrink-0 text-right">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Hari & Tanggal</p>
          <p className="text-xs font-black text-[#E67E22] mt-0.5">{tanggalHariIni}</p>
        </div>
      </div>

      {/* STATS ROW (RINGKASAN ANGKA REAL-TIME) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex items-center gap-3.5">
          <div className="p-3 bg-amber-50 text-[#E67E22] rounded-xl">
            <BookOpen size={20} />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Jadwal Hari Ini</p>
            <p className="text-base font-black text-[#3e2723]">{stats.kelasHariIni} Kelas Aktif</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex items-center gap-3.5">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Users size={20} />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Plotting Sesi</p>
            <p className="text-base font-black text-[#3e2723]">{stats.totalPlottingSesi} Sesi Seminggu</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex items-center gap-3.5">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Estimasi Jam Kerja</p>
            <p className="text-base font-black text-emerald-600">± {stats.totalJamMinggu} Jam / Minggu</p>
          </div>
        </div>
      </div>

      {/* FILTER PANEL INPUTAN DROPDOWN */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="w-full sm:w-72">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Filter Tampilan Hari</label>
          <div className="relative">
            <select
              value={filterHari}
              onChange={(e) => setFilterHari(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs font-bold bg-white text-gray-700 focus:outline-none focus:border-[#E67E22] appearance-none"
            >
              {daftarHari.map((h, i) => <option key={i} value={h}>{h === 'Hari Ini' ? `Hari Ini (${hariIni})` : h}</option>)}
            </select>
          </div>
        </div>
        <button 
          onClick={fetchDashboardData}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-[#E67E22] bg-gray-50 hover:bg-gray-100 px-4 py-2.5 rounded-xl transition-all border border-gray-200 w-full sm:w-auto justify-center"
        >
          <RefreshCw size={14} /> Refresh Data Live
        </button>
      </div>

      {/* JADWAL MENGAJAR CONTAINER */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="mb-5 flex justify-between items-center">
          <div>
            <h2 className="text-sm font-black text-[#3e2723] uppercase tracking-wider flex items-center gap-2">
              <Calendar size={16} className="text-[#E67E22]" /> Lembar Plotting Kelas Anda
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Pantau absensi kelas dan kelola pendaftaran presensi secara mandiri.</p>
          </div>
          <span className="text-[10px] text-gray-400 font-bold bg-gray-50 px-2.5 py-1 rounded-md uppercase">
            Jumlah Kelas: {jadwalTersaring.length}
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 font-bold text-xs uppercase tracking-wider border-b border-gray-100">
                <th className="p-4 w-24">Hari</th>
                <th className="p-4 w-32">Jam Belajar</th>
                <th className="p-4 w-24 text-center">Kelas</th>
                <th className="p-4">Mata Pelajaran</th>
                <th className="p-4 text-center w-40">Live Absensi Murid</th>
                <th className="p-4 text-center w-32">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
              {jadwalTersaring.length > 0 ? (
                jadwalTersaring.map((item) => {
                  // Hitung persentase bar kehadiran siswa
                  const persenHadir = item.totalSiswa > 0 ? Math.round((item.siswaHadir / item.totalSiswa) * 100) : 0;

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-all">
                      {/* HARI */}
                      <td className="p-4 font-black text-xs uppercase tracking-wide text-gray-500">{item.hari}</td>
                      
                      {/* JAM PELAJARAN */}
                      <td className="p-4 font-mono text-xs text-gray-600 font-semibold flex items-center gap-1.5">
                        <Clock size={12} className="text-[#E67E22]" /> {item.jam}
                      </td>
                      
                      {/* KELAS */}
                      <td className="p-4 text-center font-black text-xs text-gray-700">
                        <span className="bg-[#3e2723]/5 text-[#3e2723] px-2.5 py-1 rounded-md">{item.kelas}</span>
                      </td>

                      {/* MATA PELAJARAN */}
                      <td className="p-4 font-bold text-[#3e2723] text-xs">{item.mapel}</td>
                      
                      {/* LIVE ABSENSI PROGRESS BAR */}
                      <td className="p-4">
                        <div className="flex flex-col gap-1 w-full min-w-[120px]">
                          <div className="flex justify-between items-center text-[10px] font-bold text-gray-500">
                            <span>{item.siswaHadir} / {item.totalSiswa} Siswa</span>
                            <span className={persenHadir === 100 ? 'text-emerald-600' : 'text-[#E67E22]'}>{persenHadir}%</span>
                          </div>
                          <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-500 ${persenHadir === 100 ? 'bg-emerald-500' : 'bg-[#E67E22]'}`}
                              style={{ width: `${persenHadir}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      
                      {/* AKSI TOMBOL GENERATE ABSEN */}
                      <td className="p-4 text-center">
                        <Link 
                          to="/guru_staff/GenerateBarcodeMapel"
                          state={{ id_jadwal: item.id, kelas: item.kelas }}
                          className="inline-flex items-center gap-1 text-[11px] font-black bg-[#E67E22] hover:bg-[#d35400] text-white px-3 py-2 rounded-lg transition-all shadow-xs"
                        >
                          Buka Absen <ArrowRight size={10} />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                    Tidak ada jadwal mengajar pada pilihan hari ini
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default DashboardGuru;