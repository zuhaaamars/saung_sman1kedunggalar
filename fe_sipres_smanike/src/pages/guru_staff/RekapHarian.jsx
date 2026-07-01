import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Layers, FileSpreadsheet, CheckCircle, AlertTriangle, XCircle, Info, Loader2, Clock, Camera } from 'lucide-react';

const RekapHarian = () => {
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  const [listKelas, setListKelas] = useState([]);
  const hariIni = new Date().toISOString().split('T')[0];

  const [selectedKelas, setSelectedKelas] = useState('');
  const [selectedTanggal, setSelectedTanggal] = useState(hariIni);
  const [dataSiswaHarian, setDataSiswaHarian] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alertMsg, setAlertMsg] = useState({ type: '', text: '' });

  // ==========================================
  // 1. AMBIL DATA MASTER KELAS DARI DB
  // ==========================================
  const loadMasterKelas = async () => {
    try {
      const token = localStorage.getItem('token')?.replace(/^"+|"+$/g, '');
      // 💡 SINKRONISASI URL: Sesuaikan dengan rumpun prefix presensi_bp backend
      const res = await axios.get('http://localhost:5000/api/presensi/master-kelas', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.status === 'success' && res.data.data.length > 0) {
        setListKelas(res.data.data);
        setSelectedKelas(res.data.data[0]); 
      }
    } catch (err) {
      console.error("Gagal memuat master kelas:", err);
    }
  };

  // ==========================================
  // 2. AMBIL DATA REKAP HARIAN DARI DATABASE
  // ==========================================
  const loadDataHarian = async () => {
    // Kunci Pengaman: Mencegah request jika kelas belum terisi dari database
    if (!selectedKelas || selectedKelas.trim() === "") {
      return;
    }

    setLoading(true);
    setAlertMsg({ type: '', text: '' });
    try {
      const token = localStorage.getItem('token')?.replace(/^"+|"+$/g, '');
      const res = await axios.get('http://localhost:5000/api/presensi/jurnal-harian', {
        params: { kelas: selectedKelas, tanggal: selectedTanggal },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.status === 'success') {
        const mappedData = res.data.data.map(itemSiswa => ({
          id_siswa: itemSiswa.id_siswa, 
          nama: itemSiswa.nama,
          nis: itemSiswa.nis || '-',
          status_kehadiran: itemSiswa.status_kehadiran || 'Alpa',
          keterangan: itemSiswa.keterangan || 'Belum Melakukan Absen',
          jam_masuk: itemSiswa.jam_masuk || '-', 
          metode_presensi: itemSiswa.metode_presensi || '-', 
          foto_bukti: itemSiswa.foto_bukti || null 
        }));
        setDataSiswaHarian(mappedData);
      }
    } catch (err) {
      console.error(err);
      setAlertMsg({
        type: 'error', 
        text: err.response?.data?.message || 'Gagal memuat rekap harian dari database.'
      });
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // EFFECT TRIGGERS
  // ==========================================
  // Memuat master kelas sekali saja saat halaman pertama kali dibuka
  useEffect(() => {
    loadMasterKelas();
  }, []);

  // Memuat data siswa harian hanya jika filter kelas sudah terisi valid
  useEffect(() => {
    if (selectedKelas && selectedKelas.trim() !== "") {
      loadDataHarian();
    }
  }, [selectedKelas, selectedTanggal]);

  // ==========================================
  // LOGIKA AKSI KOREKSI STATUS GURU PIKET
  // ==========================================
  const handleKoreksiStatusHarian = (idSiswa, statusBaru) => {
    setDataSiswaHarian(prevData =>
      prevData.map(itemSiswa => {
        if (itemSiswa.id_siswa === idSiswa) {
          const waktuSekarangLog = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
          let ket = 'Koreksi Guru Piket';
          
          if (statusBaru === 'Hadir') ket = `Hadir Manual (${waktuSekarangLog})`;
          if (statusBaru === 'Izin') ket = 'Izin (Ada Surat)';
          if (statusBaru === 'Sakit') ket = 'Sakit (Ada Surat/Kabar)';
          if (statusBaru === 'Alpa') ket = 'Tanpa Keterangan';

          return { 
            ...itemSiswa, 
            status_kehadiran: statusBaru, 
            keterangan: ket,
            metode_presensi: 'Koreksi Piket',
            jam_masuk: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          };
        }
        return itemSiswa;
      })
    );
  };

  // ==========================================
  // SIMPAN PERUBAHAN MASSAL KE DATABASE
  // ==========================================
  const handleSimpanKeDatabase = async () => {
    setSaving(true);
    setAlertMsg({ type: '', text: '' });
    try {
      const token = localStorage.getItem('token')?.replace(/^"+|"+$/g, '');
      const res = await axios.post('http://localhost:5000/api/presensi/simpan-harian', {
        kelas: selectedKelas,
        tanggal: selectedTanggal,
        data_siswa: dataSiswaHarian.map(s => ({ 
          id_siswa: s.id_siswa, 
          status_kehadiran: s.status_kehadiran 
        }))
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.status === 'success') {
        setAlertMsg({ type: 'success', text: res.data.message });
        loadDataHarian();
      }
    } catch (err) {
      console.error(err);
      setAlertMsg({
        type: 'error', 
        text: err.response?.data?.message || 'Gagal menyimpan perubahan presensi harian.'
      });
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // PERHITUNGAN STATISTIK HARIAN
  // ==========================================
  const totalSiswa = dataSiswaHarian.length;
  const jumlahHadir = dataSiswaHarian.filter(s => s.status_kehadiran === 'Hadir').length;
  const jumlahIzin = dataSiswaHarian.filter(s => s.status_kehadiran === 'Izin').length;
  const jumlahSakit = dataSiswaHarian.filter(s => s.status_kehadiran === 'Sakit').length;
  const jumlahAlpa = dataSiswaHarian.filter(s => s.status_kehadiran === 'Alpa').length;

  return (
    <div className="max-w-6xl mx-auto font-sans pb-12 p-4">
      
      {/* HEADER HALAMAN */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-[#3e2723] uppercase tracking-tight">Rekap Presensi Harian Sekolah</h1>
        <p className="text-gray-500 text-sm">Dashboard Guru Piket / Wali Kelas untuk memantau status kehadiran siswa per hari.</p>
      </div>

      {/* FILTER PANEL */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pilih Tanggal</label>
          <input
            type="date"
            value={selectedTanggal}
            onChange={(e) => setSelectedTanggal(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold bg-white text-gray-700 focus:outline-none focus:border-[#E67E22]"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Rumpun Kelas</label>
          <div className="relative">
            <select
              value={selectedKelas}
              onChange={(e) => setSelectedKelas(e.target.value)}
              className="w-full px-3 py-2.5 pl-9 border border-gray-200 rounded-xl text-xs font-bold bg-white text-gray-700 focus:outline-none focus:border-[#E67E22] appearance-none"
            >
              {listKelas.length === 0 ? (
                <option value="">Memuat data master kelas...</option>
              ) : (
                listKelas.map((k, i) => <option key={i} value={k}>{k}</option>)
              )}
            </select>
            <Layers size={14} className="absolute left-3 top-3.5 text-gray-400" />
          </div>
        </div>
      </div>

      {/* BOX ALERT STATUS */}
      {alertMsg.text && (
        <div className={`p-4 rounded-xl text-xs font-bold mb-4 ${alertMsg.type === 'success' ?
          'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'} border`}>
          {alertMsg.text}
        </div>
      )}

      {/* RINGKASAN ANGKA STATISTIK */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-gray-100 text-center">
          <p className="text-[10px] text-gray-400 font-bold uppercase">Total Siswa</p>
          <p className="text-xl font-black text-[#3e2723]">{totalSiswa}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 text-center border-b-2 border-b-emerald-500">
          <p className="text-[10px] text-emerald-600 font-bold uppercase">Total Hadir</p>
          <p className="text-xl font-black text-emerald-600">{jumlahHadir}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 text-center border-b-2 border-b-amber-500">
          <p className="text-[10px] text-amber-600 font-bold uppercase">Total Izin</p>
          <p className="text-xl font-black text-amber-600">{jumlahIzin}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 text-center border-b-2 border-b-blue-500">
          <p className="text-[10px] text-blue-600 font-bold uppercase">Total Sakit</p>
          <p className="text-xl font-black text-blue-600">{jumlahSakit}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 text-center border-b-2 border-b-red-500 col-span-2 sm:col-span-1">
          <p className="text-[10px] text-red-500 font-bold uppercase">Total Alpa</p>
          <p className="text-xl font-black text-red-500">{jumlahAlpa}</p>
        </div>
      </div>

      {/* TABEL DATA PRESENSI HARIAN */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-black text-[#3e2723] uppercase tracking-wider flex items-center gap-2">
            <FileSpreadsheet size={16} className="text-[#E67E22]" /> Lembar Kehadiran Harian Kelas
          </h2>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-100 mb-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 font-bold text-xs uppercase tracking-wider border-b border-gray-100">
                <th className="p-4 w-24 text-center">NISN</th>
                <th className="p-4">Nama Lengkap Siswa</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Jam & Metode</th>
                <th className="p-4">Keterangan Log</th>
                <th className="p-4 text-center w-48">Aksi Koreksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-400 font-bold">Menghubungkan ke database...</td>
                </tr>
              ) : dataSiswaHarian.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-400 font-bold">Tidak ada data kehadiran siswa.</td>
                </tr>
              ) : (
                dataSiswaHarian.map((siswa) => (
                  <tr key={siswa.id_siswa} className="hover:bg-gray-50/40 transition-all">
                    <td className="p-4 text-center font-mono text-xs font-bold text-gray-400">{siswa.nis}</td>
                    <td className="p-4 font-bold text-[#3e2723]">{siswa.nama}</td>
                    
                    {/* STATUS BADGE */}
                    <td className="p-4 text-center">
                      <span className={`text-[9px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider inline-flex items-center gap-1 ${
                        siswa.status_kehadiran === 'Hadir' ? 'bg-emerald-50 text-emerald-600' :
                        siswa.status_kehadiran === 'Izin' ? 'bg-amber-50 text-amber-600' :
                        siswa.status_kehadiran === 'Sakit' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-500'
                      }`}>
                        {siswa.status_kehadiran === 'Hadir' && <CheckCircle size={10} />}
                        {siswa.status_kehadiran === 'Izin' && <Info size={10} />}
                        {siswa.status_kehadiran === 'Sakit' && <AlertTriangle size={10} />}
                        {siswa.status_kehadiran === 'Alpa' && <XCircle size={10} />}
                        {siswa.status_kehadiran}
                      </span>
                    </td>

                    {/* JAM MASUK & METODE BUKTI */}
                    <td className="p-4 text-center text-xs">
                      <div className="flex flex-col items-center justify-center gap-0.5 font-bold text-gray-600">
                        <span className="flex items-center gap-1 text-[11px]">
                          <Clock size={11} className="text-gray-400" /> {siswa.jam_masuk}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium">
                          {siswa.metode_presensi}
                        </span>
                        {siswa.foto_bukti && (
                          <a 
                            href={`http://localhost:5000/uploads/foto_presensi/${siswa.foto_bukti}`} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="mt-1 inline-flex items-center gap-1 text-[9px] text-[#E67E22] hover:underline"
                          >
                            <Camera size={10} /> Lihat Bukti
                          </a>
                        )}
                      </div>
                    </td>

                    {/* LOG KETERANGAN */}
                    <td className="p-4 text-xs font-medium text-gray-500 italic">{siswa.keterangan}</td>
                    
                    {/* BUTTONS AKSI GURU PIKET */}
                    <td className="p-4 text-center">
                      <div className="inline-flex rounded-xl border border-gray-200 p-1 bg-gray-50 gap-1.5">
                        <button
                          onClick={() => handleKoreksiStatusHarian(siswa.id_siswa, 'Hadir')}
                          className={`w-7 h-7 text-[11px] font-black rounded-lg transition-all cursor-pointer ${siswa.status_kehadiran === 'Hadir' ?
                            'bg-emerald-500 text-white shadow-xs' : 'text-gray-400 hover:bg-gray-200 hover:text-gray-700'}`}
                        >
                          H
                        </button>
                        <button
                          onClick={() => handleKoreksiStatusHarian(siswa.id_siswa, 'Izin')}
                          className={`w-7 h-7 text-[11px] font-black rounded-lg transition-all cursor-pointer ${siswa.status_kehadiran === 'Izin' ?
                            'bg-amber-500 text-white shadow-xs' : 'text-gray-400 hover:bg-gray-200 hover:text-gray-700'}`}
                        >
                          I
                        </button>
                        <button
                          onClick={() => handleKoreksiStatusHarian(siswa.id_siswa, 'Sakit')}
                          className={`w-7 h-7 text-[11px] font-black rounded-lg transition-all cursor-pointer ${siswa.status_kehadiran === 'Sakit' ?
                            'bg-blue-500 text-white shadow-xs' : 'text-gray-400 hover:bg-gray-200 hover:text-gray-700'}`}
                        >
                          S
                        </button>
                        <button
                          onClick={() => handleKoreksiStatusHarian(siswa.id_siswa, 'Alpa')}
                          className={`w-7 h-7 text-[11px] font-black rounded-lg transition-all cursor-pointer ${siswa.status_kehadiran === 'Alpa' ?
                            'bg-red-500 text-white shadow-xs' : 'text-gray-400 hover:bg-gray-200 hover:text-gray-700'}`}
                        >
                          A
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* TOMBOL AKSI SIMPAN KE DATABASE */}
        <div className="flex justify-end pt-4 border-t border-gray-100">
          <button
            onClick={handleSimpanKeDatabase}
            disabled={saving || loading || dataSiswaHarian.length === 0}
            className="flex items-center gap-2 bg-slate-950 hover:bg-slate-800 disabled:bg-gray-300 text-white text-xs font-black uppercase tracking-wider px-6 py-3.5 rounded-xl transition-all shadow-md cursor-pointer"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : null}
            {saving ? 'Menyimpan...' : 'Simpan Presensi Harian'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default RekapHarian;