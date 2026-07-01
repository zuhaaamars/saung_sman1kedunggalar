import React, { useState } from 'react';
import { 
  ScanBarcode, MapPin, ArrowRight, CheckCircle2, 
  Sparkles, ShieldAlert, MessageSquare, Camera,
  Mail, Phone, MapPinIcon, Globe, FileText, ChevronDown
} from 'lucide-react';

// 1. SILAKAN IMPORT LOGO ASLI SEKOLAHMU DI SINI
// Contoh: import logoSekolah from './assets/logo-sman1kedunggalar.png';
// Untuk sementara, saya buat placeholder variabel. Ganti isi string di bawah dengan path logo atau link URL logo aslimu.
const LOGO_SEKOLAH = "/assets/logo_saung.png"; // <-- Ganti dengan path logo aslimu

const LandingPage = () => {
  const [showDropdown, setShowDropdown] = useState(false);

  // 🔗 LINK KE MASING-MASING SISTEM (Sesuaikan URL ini dengan hosting sistemmu)
  const URL_PRESENSI = "/Login"; 
  const URL_PERSURATAN = "http://persuratan.tifpsdku.com/";   

  const testimonials = [
    {
      text: "SAUNG SMANIKE sangat membantu kami dalam memantau kehadiran siswa secara real-time. Orang tua juga merasa lebih tenang karena mendapat notifikasi langsung.",
      name: "Ibu Rina Wulandari",
      role: "Wakil Kepala Sekolah",
    },
    {
      text: "Sistemnya mudah digunakan dan fiturnya lengkap. Titip absen hampir tidak mungkin terjadi lagi.",
      name: "Bapak Andi Pratama",
      role: "Guru Kelas XI",
    }
  ];

  return (
    <div className="min-h-screen bg-[#FDFDFD] font-sans text-[#4A3728] selection:bg-amber-200 selection:text-amber-900 overflow-x-hidden">
      
      {/* --- FIXED NAVBAR --- */}
      <nav className="fixed top-0 inset-x-0 bg-white/90 backdrop-blur-md border-b border-stone-100 z-50 px-6 lg:px-20 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          {/* LOGO ASLI SEKOLAH */}
          <img 
            src={LOGO_SEKOLAH} 
            alt="Logo SMA N 1 KEDUNGGALAR" 
            className="w-9 h-9 object-contain"
          />
          <div>
            <span className="font-black text-sm tracking-tight block text-[#4A3728]">SAUNG SMANIKE</span>
            <span className="text-[9px] font-bold tracking-wider text-amber-600 block -mt-1">SMA N 1 KEDUNGGALAR</span>
          </div>
        </div>
        
        {/* Menu Tengah */}
        <div className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-wider text-[#7C6A5B]">
          {['Beranda', 'Fitur', 'Alur Sistem', 'Tentang', 'Kontak'].map((item) => (
            <a key={item} href={`#${item.toLowerCase().replace(' ', '-')}`} className="hover:text-amber-600 transition-colors">
              {item}
            </a>
          ))}
        </div>

        {/* Dropdown Akses Login Sistem */}
        <div className="relative">
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-1.5 bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-amber-600/10"
          >
            Akses Layanan <ChevronDown size={14} />
          </button>
          
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-stone-100 rounded-xl shadow-xl py-2 z-50">
              <a href={URL_PRESENSI} className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-[#7C6A5B] hover:bg-amber-50 hover:text-amber-600 transition-colors">
                <MapPin size={14} /> Sistem Presensi
              </a>
              <a href={URL_PERSURATAN} className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-[#7C6A5B] hover:bg-amber-50 hover:text-amber-600 transition-colors">
                <FileText size={14} /> Sistem Persuratan
              </a>
            </div>
          )}
        </div>
      </nav>

      <main className="w-full pt-16">
        
        {/* --- HERO SECTION --- */}
        <section id="beranda" className="relative max-w-7xl mx-auto px-6 lg:px-20 py-12 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Teks Kiri */}
          <div className="lg:col-span-7 relative z-10 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200/40 rounded-full px-4 py-1 text-xs font-bold text-[#D97706] shadow-sm">
              <Sparkles size={14} /> Portal Layanan Administrasi Terpadu
            </div>
            
            <h1 className="text-4xl lg:text-5xl font-black text-[#4A3728] leading-tight tracking-tight">
              Satu Pintu untuk <span className="text-[#D97706]">Presensi & Persuratan</span> Sekolah
            </h1>
            
            <p className="text-sm lg:text-base text-[#7C6A5B] max-w-xl leading-relaxed font-normal">
              Selamat datang di SAUNG SMANIKE. Silakan pilih layanan administrasi digital resmi SMA N 1 Kedunggalar di bawah ini untuk memulai aktivitasmu.
            </p>

            {/* Tombol Pilihan Sistem Utama */}
            <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
              <a 
                href={URL_PRESENSI}
                className="group flex flex-col justify-between p-5 bg-gradient-to-br from-amber-50 to-white hover:from-amber-100/50 border border-amber-200/60 rounded-2xl transition-all shadow-sm hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-amber-600/10">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-[#4A3728]">Sistem Presensi</h3>
                    <p className="text-[11px] text-[#7C6A5B]">Geofencing, Barcode & Face AI</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 mt-4 self-end">
                  Masuk Presensi <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </a>

              <a 
                href={URL_PERSURATAN}
                className="group flex flex-col justify-between p-5 bg-gradient-to-br from-stone-50 to-white hover:from-stone-100/50 border border-stone-200 rounded-2xl transition-all shadow-sm hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#4A3728] rounded-xl flex items-center justify-center text-white shadow-md">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-[#4A3728]">Sistem Persuratan</h3>
                    <p className="text-[11px] text-[#7C6A5B]">Disposisi & Arsip Surat Digital</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#4A3728] mt-4 self-end">
                  Masuk Persuratan <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </a>
            </div>

            <div className="text-xs text-stone-400 flex items-center gap-1.5 pt-2">
              <CheckCircle2 size={14} className="text-emerald-500" /> Akses aman dan terenkripsi menggunakan akun masing-masing sistem.
            </div>
          </div>

          {/* Visual Kanan - Mockup HP */}
          <div className="lg:col-span-5 relative flex justify-center lg:justify-end">
            <div className="absolute inset-0 bg-gradient-to-tr from-amber-200 to-emerald-200 rounded-full filter blur-3xl opacity-20 -z-10 transform scale-75"></div>
            <div className="relative border-[6px] border-stone-900 rounded-[2.5rem] overflow-hidden shadow-2xl w-full max-w-[310px] aspect-[9/18] bg-stone-50 p-4 flex flex-col justify-between text-xs">
              
              <div className="space-y-4">
                <div className="text-center font-bold text-[10px] border-b pb-2 text-stone-400 uppercase tracking-wider">SAUNG SMANIKE</div>
                
                <div className="bg-white p-3 rounded-xl border border-stone-200/60 space-y-1">
                  <span className="text-[10px] text-stone-400 font-bold uppercase block">📍 Lokasi Terdeteksi</span>
                  <div className="font-bold text-stone-800">SMA N 1 Kedunggalar</div>
                  <div className="text-emerald-600 font-bold text-[10px]">🟢 Dalam Area Geofence</div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-stone-200/60 space-y-3 flex flex-col items-center">
                  <span className="text-[10px] text-stone-400 font-bold uppercase self-start">📸 Verifikasi Selfie</span>
                  <div className="w-20 h-20 rounded-full bg-stone-100 border-2 border-emerald-500 flex items-center justify-center relative">
                    <span className="text-stone-400 text-[10px]">Siswa Foto</span>
                    <div className="absolute bottom-0 right-0 bg-emerald-500 text-white p-0.5 rounded-full"><CheckCircle2 size={12} /></div>
                  </div>
                </div>
              </div>

              <div className="bg-[#D97706] text-white p-3 rounded-xl text-center font-bold">
                Layanan Terintegrasi ✓
              </div>
            </div>
          </div>
        </section>

        {/* --- 4 VALUE METRICS SECTION --- */}
        <section className="bg-white border-y border-stone-100 max-w-7xl mx-auto px-6 lg:px-20 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { val: '100%', title: 'Real-time Data', desc: 'Data hadir langsung tersinkron secara real-time.' },
              { val: '0%', title: 'Manipulasi Lokasi', desc: 'Geofencing akurat mencegah siswa titip absen.' },
              { val: 'Langsung', title: 'WhatsApp Alert', desc: 'Orang tua menerima notifikasi kehadiran otomatis.' },
              { val: 'Efisien', title: 'Arsip Digital', desc: 'Sistem persuratan memangkas birokrasi kertas.' },
            ].map((metric, i) => (
              <div key={i} className="text-center space-y-1 border-r last:border-r-0 border-stone-100 px-2">
                <p className="text-2xl lg:text-3xl font-black text-[#D97706]">{metric.val}</p>
                <p className="text-sm font-bold text-[#4A3728]">{metric.title}</p>
                <p className="text-xs text-[#7C6A5B] leading-relaxed">{metric.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* --- 4 FITUR UNGGULAN --- */}
        <section id="fitur" className="max-w-7xl mx-auto px-6 lg:px-20 py-20 space-y-12">
          <div className="text-center space-y-2">
            <span className="text-xs uppercase font-extrabold tracking-widest text-[#D97706]">Fitur Utama</span>
            <h2 className="text-2xl lg:text-3xl font-black text-[#4A3728]">Teknologi Cerdas untuk Administrasi yang Adil dan Akurat</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: <MapPin size={20} className="text-amber-600" />,
                title: 'Geofencing & Selfie AI',
                desc: 'Siswa wajib berada di area sekolah dan melakukan verifikasi selfie untuk memastikan kehadiran fisik.',
                bg: 'bg-amber-50/20'
              },
              {
                icon: <ScanBarcode size={20} className="text-emerald-600" />,
                title: 'Dynamic Barcode',
                desc: 'Guru membuat barcode dinamis yang berubah otomatis untuk setiap kelas dan sesi mengajar.',
                bg: 'bg-emerald-50/10'
              },
              {
                icon: <FileText size={20} className="text-blue-600" />,
                title: 'E-Surat & Disposisi',
                desc: 'Kelola surat masuk, keluar, dan disposisi pimpinan secara instan dalam satu platform terpisah.',
                bg: 'bg-blue-50/20'
              },
              {
                icon: <ShieldAlert size={20} className="text-purple-600" />,
                title: 'Anti-GPS & Security',
                desc: 'Sistem mendeteksi penggunaan fake GPS, perangkat di-root, dan aktivitas kecurangan lainnya.',
                bg: 'bg-purple-50/10'
              }
            ].map((card, idx) => (
              <div key={idx} className={`p-6 rounded-2xl border border-stone-100 flex flex-col justify-between space-y-4 hover:shadow-xl hover:-translate-y-1 transition-all ${card.bg}`}>
                <div className="space-y-3">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-stone-50">
                    {card.icon}
                  </div>
                  <h3 className="text-sm font-bold text-[#4A3728]">{card.title}</h3>
                  <p className="text-xs text-[#7C6A5B] leading-relaxed">{card.desc}</p>
                </div>
                <button className="text-xs font-bold text-stone-500 hover:text-amber-600 flex items-center gap-1 mt-2 self-start transition-colors">
                  Pelajari lebih lanjut <ArrowRight size={12} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* --- LINEAR WORKFLOW (HOW IT WORKS) --- */}
        <section id="alur-sistem" className="bg-[#FBF9F6] border-y border-stone-100 py-20">
          <div className="max-w-7xl mx-auto px-6 lg:px-20 space-y-16">
            <div className="text-center space-y-2">
              <span className="text-xs uppercase font-extrabold tracking-widest text-[#D97706]">Alur Sistem</span>
              <h2 className="text-2xl lg:text-3xl font-black text-[#4A3728]">Bagaimana SAUNG SMANIKE Bekerja?</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
              {[
                { step: '1', icon: <MapPin size={18} />, title: 'Pilih Portal Layanan', desc: 'Buka landing page lalu pilih sistem Presensi atau Persuratan sesuai kebutuhan.' },
                { step: '2', icon: <ScanBarcode size={18} />, title: 'Autentikasi Akun', desc: 'Login menggunakan kredensial akun khusus yang terdaftar di sistem tersebut.' },
                { step: '3', icon: <Camera size={18} />, title: 'Aktivitas Digital', desc: 'Lakukan presensi kelas pintar atau kelola pengarsipan surat secara mandiri.' },
                { step: '4', icon: <CheckCircle2 size={18} />, title: 'Data Terproses', desc: 'Setiap aksi sukses langsung tercatat pada database sistem masing-masing.' },
              ].map((flow, index) => (
                <div key={index} className="flex flex-col items-center text-center space-y-2 relative group">
                  <div className="w-12 h-12 bg-white border border-stone-200 rounded-full flex items-center justify-center text-[#D97706] font-bold shadow-sm z-10">
                    {flow.icon}
                  </div>
                  <div className="absolute top-6 left-1/2 w-full h-[1px] border-t border-dashed border-stone-300 hidden lg:block -z-0 group-last:hidden"></div>
                  
                  <h3 className="text-sm font-bold text-[#4A3728] pt-2">{flow.step}. {flow.title}</h3>
                  <p className="text-xs text-[#7C6A5B] max-w-xs leading-relaxed">{flow.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- STATISTICS & TESTIMONIALS --- */}
        <section id="tentang" className="max-w-7xl mx-auto px-6 lg:px-20 py-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-5 space-y-6">
            <span className="text-xs uppercase font-extrabold tracking-widest text-[#D97706]">Dipercaya Oleh Sekolah</span>
            <h2 className="text-2xl lg:text-3xl font-black text-[#4A3728] leading-tight">Kehadiran Transparan, Kepercayaan Terbangun</h2>
            <p className="text-xs lg:text-sm text-[#7C6A5B] leading-relaxed">
              SAUNG SMANIKE membantu sekolah meningkatkan kedisiplinan ekosistem belajar siswa secara transparan sekaligus mempermudah monitoring berkala.
            </p>
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-stone-100">
              <div>
                <p className="text-xl lg:text-2xl font-black text-[#D97706]">500+</p>
                <p className="text-[10px] font-bold text-[#7C6A5B] uppercase tracking-wider">Siswa Aktif</p>
              </div>
              <div>
                <p className="text-xl lg:text-2xl font-black text-[#D97706]">20+</p>
                <p className="text-[10px] font-bold text-[#7C6A5B] uppercase tracking-wider">Guru Aktif</p>
              </div>
              <div>
                <p className="text-xl lg:text-2xl font-black text-[#D97706]">10+</p>
                <p className="text-[10px] font-bold text-[#7C6A5B] uppercase tracking-wider">Kelas Terintegrasi</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {testimonials.map((testi, idx) => (
              <div key={idx} className="bg-[#FDF8F1] p-6 rounded-2xl border border-amber-100/40 space-y-4 flex flex-col justify-between shadow-sm">
                <p className="text-xs italic text-[#7C6A5B] leading-relaxed">“{testi.text}”</p>
                <div className="flex items-center gap-3 pt-2">
                  <div className="w-8 h-8 rounded-full bg-stone-200" />
                  <div>
                    <h4 className="text-xs font-bold text-[#4A3728]">{testi.name}</h4>
                    <p className="text-[10px] text-stone-400 font-medium">{testi.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* --- BOTTOM CTA BANNER --- */}
        <section className="max-w-7xl mx-auto px-6 lg:px-20 pb-16">
          <div className="bg-[#FDF8F1] border border-amber-100/50 rounded-[2rem] p-8 lg:p-12 flex flex-col lg:flex-row justify-between items-center gap-6 shadow-sm">
            <div className="space-y-2 text-center lg:text-left">
              <h2 className="text-xl lg:text-2xl font-black text-[#4A3728]">Siap Mewujudkan Layanan Administrasi Cerdas?</h2>
              <p className="text-xs lg:text-sm text-[#7C6A5B]">Gunakan platform terintegrasi kami untuk efisiensi sekolah yang lebih baik.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a href={URL_PRESENSI} className="flex items-center gap-2 bg-[#D97706] hover:bg-[#B45309] text-white font-bold text-xs px-5 py-3 rounded-xl transition-all shadow-md">
                Buka Presensi <ArrowRight size={14} />
              </a>
              <a href={URL_PERSURATAN} className="bg-white border border-stone-200 text-[#7C6A5B] font-bold text-xs px-5 py-3 rounded-xl transition-all hover:bg-stone-50">
                Buka Persuratan
              </a>
            </div>
          </div>
        </section>

      </main>

      {/* --- FOUR-COLUMN FOOTER --- */}
      <footer id="kontak" className="bg-white border-t border-stone-100 pt-16 pb-8 px-6 lg:px-20 text-xs text-[#7C6A5B]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 pb-12 border-b border-stone-100">
          
          <div className="md:col-span-4 space-y-4">
            <div className="flex items-center gap-3">
              <img 
                src={LOGO_SEKOLAH} 
                alt="Logo SMA N 1 KEDUNGGALAR" 
                className="w-7 h-7 object-contain"
              />
              <span className="font-black text-sm text-[#4A3728]">SAUNG SMANIKE</span>
            </div>
            <p className="leading-relaxed opacity-80 max-w-sm">Solusi portal satu pintu administrasi modern untuk sekolah yang lebih disiplin, transparan, dan teratur.</p>
          </div>

          <div className="md:col-span-2 space-y-3">
            <h4 className="font-bold text-[#4A3728] uppercase text-[10px] tracking-wider">Menu</h4>
            <ul className="space-y-2 font-medium">
              {['Beranda', 'Fitur', 'Alur Sistem', 'Tentang', 'Kontak'].map((m) => (
                <li key={m}><a href={`#${m.toLowerCase().replace(' ', '-')}`} className="hover:text-amber-600">{m}</a></li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-3 space-y-3">
            <h4 className="font-bold text-[#4A3728] uppercase text-[10px] tracking-wider">Kontak</h4>
            <ul className="space-y-2 font-medium">
              <li className="flex items-center gap-2"><Mail size={12} className="text-amber-600" /> admin@sman1kedunggalar.sch.id</li>
              <li className="flex items-center gap-2"><Phone size={12} className="text-amber-600" /> 0812-3456-7890</li>
              <li className="flex items-center gap-2"><MapPinIcon size={12} className="text-amber-600 flex-shrink-0" /> SMA N 1 Kedunggalar<br />Jl. Raya Kedunggalar, Ngawi</li>
            </ul>
          </div>

          <div className="md:col-span-3 space-y-3">
            <h4 className="font-bold text-[#4A3728] uppercase text-[10px] tracking-wider">Ikuti Kami</h4>
            <div className="flex items-center gap-3 text-stone-400">
              <Globe size={16} className="hover:text-[#D97706] cursor-pointer" />
              <MessageSquare size={16} className="hover:text-[#D97706] cursor-pointer" />
            </div>
          </div>

        </div>

        <div className="max-w-7xl mx-auto pt-6 text-center opacity-60 font-semibold">
          &copy; 2026 SMA N 1 KEDUNGGALAR. All Rights Reserved.
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;