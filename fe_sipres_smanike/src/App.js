import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';

// Import Komponen
import Navbar from './components/navbar.jsx'; 
import SidebarGuruStaff from './components/Sidebar-gurustaff.jsx';
import SidebarSiswa from './components/Sidebar-siswa.jsx'; 

// Import Pages LOGIN DAN DAFTAR
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';

// Import Pages role SISWA
import DashboardSiswa from './pages/siswa/Dashboard-siswa.jsx'; 
import ScanPresensiHarian from './pages/siswa/PresensiHarian-siswa.jsx';
import ScanPresensiMapel from './pages/siswa/PresensiMapel-siswa.jsx';

// Import Pages
// STAFF
import DashboardStaff from './pages/guru_staff/DashboardStaff.jsx';
import ImportGuru from './pages/guru_staff/ImportGuru.jsx';
import ImportSiswa from './pages/guru_staff/ImportSiswa.jsx';
import MasterAkademik from './pages/guru_staff/MasterAkademik.jsx';
import JadwalPelajaran from './pages/guru_staff/JadwalPelajaran.jsx';

// GURU
import DashboardGuru from './pages/guru_staff/DashboardGuru.jsx';
import GenerateQRMapel from './pages/guru_staff/GenerateBarcodeMapel.jsx';
import RekapMapel from './pages/guru_staff/RekapMapel.jsx';
import RekapHarian from './pages/guru_staff/RekapHarian.jsx';

// NAVBAR UNTUK LOGIN DAN DAFTAR
const MainLayout = ({ children }) => (
  <>
    <Navbar />
    <div className="min-h-screen">
      {children}
    </div>
  </>
);

// SIDEBAR UNTUK SISWA
const DashboardLayout = ({ children }) => (
  <div className="min-h-screen bg-[#f4f4f4]">
    <SidebarSiswa />

    <main className="md:ml-64 p-6">
      {children}
    </main>
  </div>
);

// SIDEBAR GURU DAN STAFF
const GuruStaffLayout = () => {
  return (
    <div className="flex min-h-screen">
      <SidebarGuruStaff />
      <div className="flex-1 bg-[#f4f4f4] md:ml-64 p-6">
        <Outlet />
      </div>
    </div>
  );
};

// ====================================================================
// 🌟 KOMPONEN BARU: PENENTU OTOMATIS BERDASARKAN JABATAN / ROLE SESSION
// ====================================================================
const DashboardSwitch = () => {
  const userJabatan = (localStorage.getItem("user_jabatan") || "").toLowerCase();
  const userRole = (localStorage.getItem("user_role") || "").toLowerCase();

  // Deteksi apakah user adalah guru (melalui pengecekan teks jabatan atau role)
  const isGuru = userJabatan.includes('guru') || userRole === 'guru';

  if (isGuru) {
    return <DashboardGuru />;
  } else {
    return <DashboardStaff />;
  }
};

function App() {
  return (
    <Router>
      <Routes>
        {/* --- PUBLIC ROUTES --- */}
        <Route path="/" element={<MainLayout><LandingPage /></MainLayout>} />
        <Route path="/Login" element={<MainLayout><Login /></MainLayout>} />
        
        {/* --- SISWA ROUTES --- */}
        <Route path="/siswa/Dashboard-siswa" element={<DashboardLayout><DashboardSiswa /></DashboardLayout>} />
        <Route path="/siswa/PresensiHarian-siswa" element={<DashboardLayout><ScanPresensiHarian /></DashboardLayout>} />
        <Route path="/siswa/PresensiMapel-siswa" element={<DashboardLayout><ScanPresensiMapel /></DashboardLayout>} />

        {/* --- GURU STAFF ROUTES --- */}
        <Route element={<GuruStaffLayout />}>
          
          {/* 🌟 JIKA HALAMAN /guru_staff DIAKSES LANGSUNG, JALANKAN PENENTU OTOMATIS */}
          <Route path="/guru_staff" element={<DashboardSwitch />} />

          {/* 🌟 JIKA TERLANJUR MENEMBAK LINK DASHBOARD GURU, DIAKAN MEMFILTER ULANG */}
          <Route path="/guru_staff/DashboardGuru" element={<DashboardSwitch />} />
          
          {/* Eksplisit rute untuk Staff */}
          <Route path="/guru_staff/DashboardStaff" element={<DashboardStaff />} />
          
          {/* Menu Lainnya */}
          <Route path="/guru_staff/ImportGuru" element={<ImportGuru />} />
          <Route path="/guru_staff/ImportSiswa" element={<ImportSiswa />} />
          <Route path="/guru_staff/MasterAkademik" element={<MasterAkademik />} />
          <Route path="/guru_staff/JadwalPelajaran" element={<JadwalPelajaran />} />

          <Route path="/guru_staff/GenerateBarcodeMapel" element={<GenerateQRMapel />} />
          <Route path="/guru_staff/RekapMapel" element={<RekapMapel />} />
          <Route path="/guru_staff/RekapHarian" element={<RekapHarian />} />
        </Route>

      </Routes>
    </Router>
  );
}

export default App;