import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Eye, EyeOff, UserCircle, HelpCircle } from 'lucide-react';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const [loginData, setLoginData] = useState({
    username: '',
    password: ''
  });

  const handleChange = (e) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1. Hit API Backend Flask Port 5000
      const response = await axios.post(
        'http://localhost:5000/api/auth/login',
        {
          username: loginData.username, // Diisi Nama Lengkap (Siswa / Guru / Staff)
          password: loginData.password
        }
      );

      if (response.data.status === "success") {
        const { token, user } = response.data;

        // ========================
        // SIMPAN DATA KE LOCALSTORAGE
        // ========================
        localStorage.setItem("token", token);
        localStorage.setItem("user_role", user.role); // 'siswa' atau 'staff'
        localStorage.setItem("user_jabatan", user.jabatan || ""); // Menyimpan jabatan otomatis backend
        localStorage.setItem("user_id", user.id);
        localStorage.setItem("user_nama", user.nama);
        localStorage.setItem("user", JSON.stringify(user));

        // ========================
        // REDIRECT OTOMATIS BERDASARKAN ROLE UTAMA
        // ========================
        const routes = {
          siswa: "/siswa/Dashboard-siswa",
          staff: "/guru_staff/DashboardGuru" // Guru & Staff TU satu pintu masuk rute utama
        };

        const targetRoute = routes[user.role];

        if (!targetRoute) {
          alert("Akses role tidak dikenali sistem!");
          return;
        }

        alert(response.data.message || `Selamat Datang, ${user.nama}!`);

        setTimeout(() => {
          navigate(targetRoute);
        }, 150);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Kredensial salah atau server bermasalah");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#f5e6d3] to-[#e8d2b8] flex flex-col items-center justify-center px-4 font-sans selection:bg-[#E67E22] selection:text-white">
      
      {/* CARD CONTAINER */}
      <div className="bg-white w-full max-w-[480px] p-8 md:p-10 rounded-[24px] shadow-2xl border-b-8 border-[#3e2723] transition-all duration-300 transform hover:scale-[1.01]">
        
        {/* HEADER LOGO & TEXT */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-[#f5e6d3] rounded-full text-[#3e2723] mb-3">
            <UserCircle size={40} className="stroke-[1.5]" />
          </div>
          <h2 className="text-[#3e2723] text-2xl font-black tracking-tight uppercase">
            SAUNG <span className="text-[#E67E22]">SMANIKE</span>
          </h2>
          <p className="text-gray-500 text-xs mt-1 font-medium tracking-wide">
            Sistem Administrasi & Presensi Terintegrasi
          </p>
        </div>

        {/* LOGIN FORM */}
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* USERNAME / IDENTITAS */}
          <div className="space-y-1.5">
            <label className="font-bold text-xs text-[#3e2723] uppercase tracking-wider block">
              Nama Lengkap
            </label>
            <div className="relative flex items-center group">
              <input
                type="text"
                name="username"
                placeholder="Masukkan Nama Lengkap Anda"
                value={loginData.username}
                onChange={handleChange}
                className="w-full h-12 pl-4 pr-11 text-sm bg-gray-50 border-2 border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#E67E22] transition-all duration-200 font-medium placeholder:text-gray-400"
                required
              />
              <UserCircle size={20} className="absolute right-3 text-gray-400 group-focus-within:text-[#E67E22] transition-colors duration-200" />
            </div>
          </div>

          {/* PASSWORD */}
          <div className="space-y-1.5">
            <label className="font-bold text-xs text-[#3e2723] uppercase tracking-wider block">
              Kata Sandi
            </label>
            <div className="relative flex items-center group">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="••••••••"
                value={loginData.password}
                onChange={handleChange}
                className="w-full h-12 pl-4 pr-11 text-sm bg-gray-50 border-2 border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#E67E22] transition-all duration-200 font-medium placeholder:text-gray-400"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 p-1 text-gray-400 hover:text-[#3e2723] focus:outline-none transition-colors duration-200"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* ACTION BUTTON */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-[#3e2723] hover:bg-[#52332e] text-white rounded-xl font-bold text-sm tracking-wide shadow-md active:scale-[0.99] disabled:opacity-70 disabled:pointer-events-none transition-all duration-150 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                "Masuk ke Sistem"
              )}
            </button>
          </div>

        </form>

        {/* SEPARATOR */}
        <hr className="my-6 border-gray-100" />

        {/* FOOTER INFO BOX */}
        <div className="bg-[#f5e6d3]/40 rounded-xl p-3.5 border border-[#e8d2b8]/60 flex items-start gap-2.5">
          <HelpCircle size={18} className="text-[#E67E22] shrink-0 mt-0.5" />
          <p className="text-xs text-[#6d4c41] font-medium leading-relaxed">
            Belum memiliki akun atau lupa kata sandi bawaan? Silakan laporkan langsung ke unit <span className="font-bold text-[#3e2723]">Tata Usaha / Tim IT SMANIKE</span>.
          </p>
        </div>

      </div>

      {/* BACK TO HOME */}
      <button
        type="button"
        onClick={() => navigate('/')}
        className="mt-5 text-sm font-bold text-[#6d4c41] hover:text-[#3e2723] transition-colors duration-200 underline underline-offset-4"
      >
        Kembali ke Beranda
      </button>

    </div>
  );
};

export default Login;