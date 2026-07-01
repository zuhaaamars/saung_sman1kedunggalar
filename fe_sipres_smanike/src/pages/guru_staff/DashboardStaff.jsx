import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { 
  Users, 
  UserCheck, 
  ShieldAlert, 
  Clock, 
  ArrowRight, 
  Database,
  Briefcase
} from 'lucide-react';

const DashboardStaff = () => {
  const [staffData, setStaffData] = useState({
    nama: "Staff Administrasi",
    role: "Staff",
    jabatan: "Tata Usaha"
  });

  const [stats, setStats] = useState({
    totalSiswa: 0,
    totalGuru: 0,
    presensiHariIni: "0%"
  });

  const [currentTime, setCurrentTime] = useState(new Date());
  const [loadingStats, setLoadingStats] = useState(true);

  const opsiTanggal = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const tanggalHariIni = currentTime.toLocaleDateString('id-ID', opsiTanggal);

  useEffect(() => {
    // Jalankan jam real-time
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    // Ambil token keamanan
    let token = localStorage.getItem('token');
    if (token) {
      token = token.replace(/^"+|"+$/g, ''); // bersihkan pembungkus kutip jika ada
    }

    // Ambil data user login untuk banner nama
    const userJson = localStorage.getItem('user');
    if (userJson) {
      const userObj = JSON.parse(userJson);
      setStaffData({
        nama: userObj.nama_lengkap || userObj.nama || "Staff Administrasi",
        role: localStorage.getItem("user_role") || "Staff",
        jabatan: localStorage.getItem("user_jabatan") || "Tata Usaha"
      });
    }

    // Ambil data statistik dari backend
    axios.get('http://localhost:5000/api/admin/dashboard/stats', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      if (res.data && res.data.stats) {
        console.log("Data Statistik Berhasil Masuk:", res.data.stats);
        // Memasukkan data objek { totalSiswa, totalGuru, presensiHariIni } ke dalam State
        setStats(res.data.stats);
      }
      setLoadingStats(false);
    })
    .catch(err => {
      console.error("Gagal menarik data stats:", err);
      setLoadingStats(false);
    });

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="max-w-6xl mx-auto font-sans p-4 pb-12">
      
      {/* 1. WELCOME BANNER */}
      <div className="bg-[#3e2723] text-white p-6 rounded-3xl shadow-md mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#F4A261] bg-[#F4A261]/10 px-2.5 py-1 rounded-md">
            Panel Kerja Staff & TU
          </span>
          <h1 className="text-2xl font-black mt-2 text-white">Selamat Datang, {staffData.nama}!</h1>
          <p className="text-gray-300 text-xs mt-1 flex items-center gap-1.5">
            <Briefcase size={12} className="text-[#F4A261]" /> 
            Jabatan Tugas: <span className="text-[#F4A261] font-bold">{staffData.jabatan}</span>
          </p>
        </div>
        <div className="bg-white/10 px-4 py-3 rounded-2xl border border-white/5 backdrop-blur-md shrink-0 text-left md:text-right">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Jam & Hari Kerja</p>
          <p className="text-xs font-black text-[#F4A261] mt-0.5">{tanggalHariIni}</p>
          <p className="text-xs font-mono font-bold text-white mt-0.5">{currentTime.toLocaleTimeString('id-ID')} WIB</p>
        </div>
      </div>

      {/* 2. STATS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4">
          <div className="p-3.5 bg-amber-50 text-[#F4A261] rounded-xl">
            <Users size={22} />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Siswa Terdaftar</p>
            <p className="text-xl font-black text-[#3e2723]">
              {loadingStats ? "..." : `${stats.totalSiswa} Siswa`}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4">
          <div className="p-3.5 bg-blue-50 text-blue-600 rounded-xl">
            <UserCheck size={22} />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Tenaga Pendidik / Guru</p>
            <p className="text-xl font-black text-[#3e2723]">
              {loadingStats ? "..." : `${stats.totalGuru} Staff`}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4">
          <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <Clock size={22} />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Log Presensi Hari Ini</p>
            <p className="text-xl font-black text-emerald-600">
              {loadingStats ? "..." : stats.presensiHariIni} Terisi
            </p>
          </div>
        </div>
      </div>

      {/* 3. NAVIGASI DATA MASTER */}
      <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Navigasi Manajemen Data Master</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs hover:border-[#F4A261]/40 transition-all group flex flex-col justify-between h-40">
          <div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex justify-center items-center text-[#F4A261] mb-3">
              <Users size={20} />
            </div>
            <h4 className="text-sm font-black text-[#3e2723]">Data Profil Siswa</h4>
            <p className="text-[11px] text-gray-400 mt-1">Kelola data induk kesiswaan, NISN, dan wali murid.</p>
          </div>
          <Link to="/guru_staff/ImportSiswa" className="inline-flex items-center gap-1 text-[11px] font-bold text-[#F4A261] group-hover:gap-2 transition-all mt-3">
            Buka Kelola <ArrowRight size={12} />
          </Link>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs hover:border-[#F4A261]/40 transition-all group flex flex-col justify-between h-40">
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex justify-center items-center text-blue-600 mb-3">
              <UserCheck size={20} />
            </div>
            <h4 className="text-sm font-black text-[#3e2723]">Data Profil Guru</h4>
            <p className="text-[11px] text-gray-400 mt-1">Atur data kepegawaian, jabatan struktural, dan NIP.</p>
          </div>
          <Link to="/guru_staff/ImportGuru" className="inline-flex items-center gap-1 text-[11px] font-bold text-[#F4A261] group-hover:gap-2 transition-all mt-3">
            Buka Kelola <ArrowRight size={12} />
          </Link>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs hover:border-[#F4A261]/40 transition-all group flex flex-col justify-between h-40">
          <div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex justify-center items-center text-purple-600 mb-3">
              <Database size={20} />
            </div>
            <h4 className="text-sm font-black text-[#3e2723]">Data Academic</h4>
            <p className="text-[11px] text-gray-400 mt-1">Pengaturan plotting kelas tahun ajaran baru dan semester.</p>
          </div>
          <Link to="/guru_staff/MasterAkademik" className="inline-flex items-center gap-1 text-[11px] font-bold text-[#F4A261] group-hover:gap-2 transition-all mt-3">
            Buka Kelola <ArrowRight size={12} />
          </Link>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs hover:border-[#F4A261]/40 transition-all group flex flex-col justify-between h-40">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex justify-center items-center text-emerald-600 mb-3">
              <Clock size={20} />
            </div>
            <h4 className="text-sm font-black text-[#3e2723]">Data Jadwal Pelajaran</h4>
            <p className="text-[11px] text-gray-400 mt-1">Susun plotting sesi jam mengajar guru kolektif.</p>
          </div>
          <Link to="/guru_staff/JadwalPelajaran" className="inline-flex items-center gap-1 text-[11px] font-bold text-[#F4A261] group-hover:gap-2 transition-all mt-3">
            Buka Kelola <ArrowRight size={12} />
          </Link>
        </div>

      </div>

      {/* FOOTER */}
      <div className="mt-8 bg-slate-50 border border-slate-200/60 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-start gap-3">
          <ShieldAlert className="text-slate-500 shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wide">Pemberitahuan Sistem Otomasi</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">Sebagai penanggung jawab Data Master, seluruh aktivitas log perubahan data kesiswaan dan plotting jadwal akan dicatat demi keamanan database sekolah SMAN 1 Kedunggalar.</p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default DashboardStaff;