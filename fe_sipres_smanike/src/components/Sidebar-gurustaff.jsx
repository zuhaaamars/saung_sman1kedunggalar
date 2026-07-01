import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CalendarCheck, 
  BookOpenCheck, 
  Users,
  GraduationCap,
  LogOut,
  ChevronDown,
  QrCode,
  FileSpreadsheet,
  Menu, // Icon Hamburger
  X     // Icon Close
} from 'lucide-react';

const SidebarGuruStaff = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [userRole, setUserRole] = useState('');
  const [userJabatan, setUserJabatan] = useState('');
  const [isPiket] = useState(true);
  const [isOpenMobile, setIsOpenMobile] = useState(false); // State untuk Hamburger Menu

  const [openMenus, setOpenMenus] = useState({
    presensiMapel: false,
    kelolaData: false
  });

  useEffect(() => {
    const role = localStorage.getItem("user_role");
    const jabatan = localStorage.getItem("user_jabatan") || "";
    
    if (role) setUserRole(role);
    setUserJabatan(jabatan.toLowerCase()); 
  }, []);

  // Tutup sidebar mobile otomatis setiap kali pindah halaman
  useEffect(() => {
    setIsOpenMobile(false);
  }, [location.pathname]);

  const isGuru = userJabatan.includes('guru');
  const isTU = userJabatan.includes('tu') || userJabatan.includes('tata usaha') || userJabatan.includes('staf') || userJabatan.includes('staff');

  const toggleMenu = (menu) => {
    setOpenMenus(prev => ({ ...prev, [menu]: !prev[menu] }));
  };

  const isActive = (path) =>
    location.pathname === path
      ? "bg-[#F4A261] text-white shadow-md font-semibold"
      : "text-[#3E3E3E] hover:bg-[#F4A261]/15 hover:text-[#E67E22] transition-all duration-200";

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  // Komponen Isi Menu (Biar ga nulis code double untuk desktop & mobile)
  const SidebarContent = () => (
    <>
      {/* HEADER LOGO */}
      <div className="flex flex-col items-center py-6 border-b border-[#e8d2b8]/40 bg-white/50 relative">
        {/* Tombol Close khusus di Layar Mobile */}
        <button 
          onClick={() => setIsOpenMobile(false)}
          className="md:hidden absolute top-4 right-4 p-1 text-[#3E3E3E] hover:bg-[#F4A261]/20 rounded-lg"
        >
          <X size={24} />
        </button>

        <img
          src="/assets/logo_saung.png"
          alt="Logo SAUNG SMANIKE"
          className="w-20 h-20 object-contain drop-shadow-sm transition-transform duration-300 hover:scale-105"
        />
        <h2 className="text-[#8D6E63] font-black text-base tracking-wider text-center mt-2">
          SAUNG <span className="text-[#F4A261]">SMANIKE</span>
        </h2>
        <div className="px-3 py-0.5 mt-1 bg-[#3E2723] text-[#FDF8F1] text-[10px] font-bold rounded-full uppercase tracking-widest">
          {isGuru ? 'GURU / PIKET' : 'STAFF TATA USAHA'}
        </div>
      </div>

      {/* NAVIGATION MENU */}
      <div className="flex-1 px-3 mt-5 space-y-1.5 overflow-y-auto">
        {/* DASHBOARD UTAMA */}
        <Link to={isGuru ? "/guru_staff/DashboardGuru" : "/guru_staff/DashboardStaff"}>
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
            location.pathname === "/guru_staff/DashboardGuru" || location.pathname === "/guru_staff/DashboardStaff"
              ? "bg-[#F4A261] text-white shadow-md font-semibold"
              : "text-[#3E3E3E] hover:bg-[#F4A261]/15 hover:text-[#E67E22] transition-all duration-200"
          }`}>
            <LayoutDashboard size={20} className="stroke-[1.75]" />
            <span className="text-sm">Dashboard Utama</span>
          </div>
        </Link>

        {/* MENU KHUSUS GURU */}
        {isGuru && (
        <>
            {isPiket && (
              <Link to="/guru_staff/RekapHarian">
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive('/guru_staff/RekapHarian')}`}>
                  <CalendarCheck size={20} className="stroke-[1.75]" />
                  <span className="text-sm">Rekap Harian</span>
                </div>
              </Link>
            )}

            <div>
              <div
                onClick={() => toggleMenu('presensiMapel')}
                className="flex items-center justify-between px-4 py-3 text-[#3E3E3E] hover:bg-[#F4A261]/15 hover:text-[#E67E22] rounded-xl cursor-pointer transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <BookOpenCheck size={20} className="stroke-[1.75]" />
                  <span className="text-sm font-medium">Presensi Mapel</span>
                </div>
                <ChevronDown size={16} className={`transition-transform duration-200 ${openMenus.presensiMapel ? "rotate-180 text-[#F4A261]" : ""}`} />
              </div>

              {openMenus.presensiMapel && (
                <div className="ml-7 mt-1 pl-2 border-l-2 border-[#F4A261]/30 space-y-1">
                  <Link to="/guru_staff/GenerateBarcodeMapel">
                    <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 ${isActive('/guru_staff/GenerateBarcodeMapel')}`}>
                      <QrCode size={16} className="stroke-[1.75]" /> 
                      <span>Layar QR Presensi</span>
                    </div>
                  </Link>

                  <Link to="/guru_staff/RekapMapel">
                    <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 ${isActive('/guru_staff/RekapMapel')}`}>
                      <FileSpreadsheet size={16} className="stroke-[1.75]" /> 
                      <span>Jurnal & Rekap Siswa</span>
                    </div>
                  </Link>
                </div>
              )}
            </div>
        </>
        )}

        {/* MENU KHUSUS STAF */}
        {isTU && (
        <>
            <div>
              <div
                onClick={() => toggleMenu('kelolaData')}
                className="flex items-center justify-between px-4 py-3 text-[#3E3E3E] hover:bg-[#F4A261]/15 hover:text-[#E67E22] rounded-xl cursor-pointer transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <Users size={20} className="stroke-[1.75]" />
                  <span className="text-sm font-medium">Kelola Data Master</span>
                </div>
                <ChevronDown size={16} className={`transition-transform duration-200 ${openMenus.kelolaData ? "rotate-180 text-[#F4A261]" : ""}`} />
              </div>

              {openMenus.kelolaData && (
                <div className="ml-7 mt-1 pl-2 border-l-2 border-[#F4A261]/30 space-y-1">
                  <Link to="/guru_staff/ImportSiswa">
                    <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium ${isActive('/guru_staff/ImportSiswa')}`}>
                      <GraduationCap size={16} /> Data Profil Siswa
                    </div>
                  </Link>

                  <Link to="/guru_staff/ImportGuru">
                    <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium ${isActive('/guru_staff/ImportGuru')}`}>
                      <Users size={16} /> Data Profil Guru
                    </div>
                  </Link>

                  <Link to="/guru_staff/MasterAkademik">
                    <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium ${isActive('/guru_staff/MasterAkademik')}`}>
                      <Users size={16} /> Data Akademik
                    </div>
                  </Link>

                  <Link to="/guru_staff/JadwalPelajaran">
                    <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium ${isActive('/guru_staff/JadwalPelajaran')}`}>
                      <Users size={16} /> Data Jadwal Pelajaran
                    </div>
                  </Link>
                </div>
              )}
            </div>
        </>
        )}
      </div>

      {/* LOGOUT SYSTEM */}
      <div className="px-3 pb-6 border-t border-[#e8d2b8]/30 pt-4 bg-white/30">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#3E3E3E] hover:bg-red-500 hover:text-white hover:shadow-md transition-all duration-200 cursor-pointer font-bold text-sm"
        >
          <LogOut size={20} className="stroke-[2]" />
          <span>Keluar Aplikasi</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* 1. TOMBOL HAMBURGER (Hanya muncul di HP / Layar < md) */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#FDF8F1] border-b border-[#e8d2b8]/50 px-4 flex items-center justify-between z-40">
        <h2 className="text-[#8D6E63] font-black text-sm tracking-wider">
          SAUNG <span className="text-[#F4A261]">SMANIKE</span>
        </h2>
        <button 
          onClick={() => setIsOpenMobile(true)}
          className="p-2 text-[#3E3E3E] hover:bg-[#F4A261]/15 rounded-xl transition-all"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Spacer atas khusus di layar HP biar konten halaman tidak tertutup Navbar Hamburger */}
      <div className="h-16 md:hidden w-full"></div>

      {/* 2. SIDEBAR VERSI DESKTOP (Normal) */}
      <div className="fixed top-0 left-0 w-64 h-screen bg-[#FDF8F1] flex flex-col border-r border-[#e8d2b8]/50 z-40 hidden md:flex font-sans">
        <SidebarContent />
      </div>

      {/* 3. SIDEBAR VERSI MOBILE DRAWER (Geser dari kiri) */}
      {/* Overlay Gelap dibelakang Sidebar */}
      <div 
        className={`md:hidden fixed inset-0 bg-black/40 z-50 transition-opacity duration-300 ${isOpenMobile ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={() => setIsOpenMobile(false)}
      />
      
      {/* Container Sidebar Mobile */}
      <div className={`md:hidden fixed top-0 left-0 w-64 h-screen bg-[#FDF8F1] flex flex-col border-r border-[#e8d2b8]/50 z-50 transition-transform duration-300 transform font-sans ${isOpenMobile ? "translate-x-0" : "-translate-x-full"}`}>
        <SidebarContent />
      </div>
    </>
  );
};

export default SidebarGuruStaff;