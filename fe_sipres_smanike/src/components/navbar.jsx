import React from "react";

const Navbar = () => {
  return (
    // Mengubah 'absolute' menjadi 'fixed' agar tetap di posisi atas saat scroll
    <nav className="fixed top-0 left-0 w-full z-50 bg-white/80 backdrop-blur-md shadow-sm">
      <div className="flex items-center px-10 py-5">

        {/* LOGO + TEXT */}
        <div className="flex items-center gap-3">
          <img
            src="/assets/logo_saung.png"
            alt="Logo Saung Smanike"
            className="w-12 h-12 object-contain"
          />

          <div>
            <h1 className="text-lg font-bold text-[#5C4033] leading-tight">
              SAUNG <span className="text-[#E67E22]">SMANIKE</span>
            </h1>
            <p className="text-xs text-gray-600">
              Sistem Administrasi Sekolah
            </p>
          </div>
        </div>

      </div>
    </nav>
  );
};

export default Navbar;