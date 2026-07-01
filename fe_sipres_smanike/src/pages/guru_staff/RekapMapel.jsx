import React, { useState, useEffect } from 'react';
import axios from 'axios'; // Koreksi: pastikan import axios from 'axios'
import { Layers, BookOpen, FileText, CheckCircle2, AlertCircle, HelpCircle, XCircle, Save, Loader2, RefreshCw } from 'lucide-react';

const RekapMapel = () => {
  const [listJadwal, setListJadwal] = useState([]); 
  const [selectedMapel, setSelectedMapel] = useState(''); // Tambah state untuk Mapel yang dipilih
  const [idJadwal, setIdJadwal] = useState('');     
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);

  const [metaInfo, setMetaInfo] = useState({ kelas: '-', mapel: '-' });
  const [dataSiswa, setDataSiswa] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alertMsg, setAlertMsg] = useState({ type: '', text: '' });

  // 1. Ambil daftar jadwal guru saat pertama kali page di-load
  useEffect(() => {
    const fetchDaftarJadwalGuru = async () => {
      try {
        const token = localStorage.getItem('token')?.replace(/^"+|\"+$/g, '');
        const response = await axios.get('http://localhost:5000/api/admin/jadwal', {
          headers: { Authorization: `Bearer ${token}` }
        });

        let dataJadwal = [];
        if (Array.isArray(response.data)) {
          dataJadwal = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          dataJadwal = response.data.data;
        }

        setListJadwal(dataJadwal);
      } catch (err) {
        console.error(err);
        setAlertMsg({ type: 'error', text: 'Gagal memuat daftar Kelas & Mata Pelajaran.' });
      }
    };

    fetchDaftarJadwalGuru();
  }, []);

  // 2. Extract daftar MAPEL UNIK yang diampu oleh guru tersebut (untuk Dropdown 1)
  const daftarMapelUnik = Array.from(
    new Set(listJadwal.map(j => j.nama_mapel || `Mapel ${j.id_mapel}`))
  );

  // 3. Filter data jadwal berdasarkan Mapel yang dipilih (untuk Dropdown 2)
  const listJadwalTerfilter = listJadwal.filter(j => {
    const namaMapel = j.nama_mapel || `Mapel ${j.id_mapel}`;
    return namaMapel === selectedMapel;
  });

  // Handler saat Mapel berubah -> Reset Dropdown Kelas & Sesi
  const handleMapelChange = (e) => {
    setSelectedMapel(e.target.value);
    setIdJadwal(''); // Kosongkan idJadwal agar guru dipaksa memilih kelas lagi
    setDataSiswa([]); // Bersihkan tabel siswa sebelumnya
  };

  const loadJurnalData = async () => {
    if (!idJadwal) return; 

    setLoading(true);
    setAlertMsg({ type: '', text: '' });

    try {
      const token = localStorage.getItem('token')?.replace(/^"+|\"+$/g, '');
      const res = await axios.get(`http://localhost:5000/api/presensi/guru/jurnal-presensi`, {
        params: { id_jadwal: idJadwal, tanggal: tanggal },
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.status === 'success') {
        setDataSiswa(res.data.data);
        setMetaInfo(res.data.meta || { 
          kelas: listJadwal.find(j => String(j.id_jadwal) === String(idJadwal))?.nama_kelas || '-', 
          mapel: listJadwal.find(j => String(j.id_jadwal) === String(idJadwal))?.nama_mapel || '-' 
        });
      }
    } catch (err) {
      console.error(err);
      setDataSiswa([]);
      setAlertMsg({ 
        type: 'error', 
        text: err.response?.data?.message || 'Belum ada data presensi atau sesi kelas belum dibuka pada tanggal ini.' 
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJurnalData();
  }, [idJadwal, tanggal]);

  const handleKoreksiStatus = (idSiswa, statusBaru) => {
    const waktuSekarang = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    setDataSiswa(prevData =>
      prevData.map(siswa => {
        if (siswa.id_siswa === idSiswa) {
          return {
            ...siswa,
            status: statusBaru,
            waktu: statusBaru === 'Hadir' ? `${waktuSekarang}` : '-'
          };
        }
        return siswa;
      })
    );
  };

  const handleSimpanKeDatabase = async () => {
    setSaving(true);
    setAlertMsg({ type: '', text: '' });

    try {
      const token = localStorage.getItem('token')?.replace(/^"+|\"+$/g, '');
      const res = await axios.post(`http://localhost:5000/api/presensi/guru/simpan-jurnal`, {
        id_jadwal: parseInt(idJadwal, 10),
        tanggal: tanggal,
        data_siswa: dataSiswa.map(s => ({ id_siswa: s.id_siswa, status: s.status }))
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.status === 'success') {
        setAlertMsg({ type: 'success', text: res.data.message });
        loadJurnalData();
      }
    } catch (err) {
      console.error(err);
      setAlertMsg({ 
        type: 'error', 
        text: err.response?.data?.message || 'Gagal menyimpan perubahan jurnal.' 
      });
    } finally {
      setSaving(false);
    }
  };

  const totalSiswa = dataSiswa.length;
  const jumlahHadir = dataSiswa.filter(s => s.status === 'Hadir').length;
  const jumlahIzin = dataSiswa.filter(s => s.status === 'Izin').length;
  const jumlahSakit = dataSiswa.filter(s => s.status === 'Sakit').length;
  const jumlahAlpa = dataSiswa.filter(s => s.status === 'Alpha' || s.status === 'Alpa').length;

  return (
    <div className="max-w-5xl mx-auto font-sans pb-12 p-4">
      
      <div className="mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs">
        <div>
          <h1 className="text-xl font-black text-[#3e2723] uppercase">Jurnal Presensi Mapel</h1>
          <p className="text-gray-500 text-xs mt-0.5">Pilih Mata Pelajaran, Kelas, dan tanggal untuk merekap status kehadiran siswa.</p>
        </div>
     
        <div className="flex flex-wrap items-center gap-3">
          
          {/* DROPDOWN 1: PILIH MATA PELAJARAN */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 border border-gray-200 rounded-xl">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Mapel:</span>
            <select
              value={selectedMapel}
              onChange={handleMapelChange}
              className="text-xs font-bold text-gray-700 bg-transparent focus:outline-none border-none max-w-xs cursor-pointer"
            >
              <option value="">-- Pilih Mapel --</option>
              {daftarMapelUnik.map((mapel, index) => (
                <option key={index} value={mapel}>{mapel}</option>
              ))}
            </select>
          </div>

          {/* DROPDOWN 2: PILIH KELAS & JADWAL HARI */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 border border-gray-200 rounded-xl">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Kelas & Waktu:</span>
            <select
              value={idJadwal}
              onChange={(e) => setIdJadwal(e.target.value)}
              disabled={!selectedMapel} // Terkunci sebelum Mapel dipilih
              className="text-xs font-bold text-gray-700 bg-transparent focus:outline-none border-none max-w-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">-- Pilih Kelas --</option>
              {listJadwalTerfilter.map((jadwal) => (
                <option key={jadwal.id_jadwal} value={jadwal.id_jadwal}>
                  {jadwal.nama_kelas || `Kelas ${jadwal.id_kelas}`} ({jadwal.hari})
                </option>
              ))}
            </select>
          </div>

          {/* INPUT TANGGAL */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 border border-gray-200 rounded-xl">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Tanggal:</span>
            <input 
              type="date" 
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="text-xs font-bold text-gray-700 bg-transparent focus:outline-none cursor-pointer"
            />
          </div>
      
        </div>
      </div>

      {alertMsg.text && (
        <div className={`p-4 rounded-xl text-xs font-bold mb-5 shadow-2xs border ${
          alertMsg.type === 'success' ?
          'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {alertMsg.text}
        </div>
      )}

      {/* Bagian Statistik Ringkasan Card */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs text-center">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Murid</p>
          <p className="text-xl font-black text-[#3e2723] mt-1">{loading ? '...' : totalSiswa}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs text-center border-b-2 border-b-emerald-500">
          <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Hadir</p>
          <p className="text-xl font-black text-emerald-600 mt-1">{loading ? '...' : jumlahHadir}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs text-center border-b-2 border-b-amber-500">
          <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">Izin</p>
          <p className="text-xl font-black text-amber-600 mt-1">{loading ? '...' : jumlahIzin}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs text-center border-b-2 border-b-blue-500">
          <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Sakit</p>
          <p className="text-xl font-black text-blue-600 mt-1">{loading ? '...' : jumlahSakit}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs text-center border-b-2 border-b-red-500 col-span-2 sm:col-span-1">
          <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider">Alpa</p>
          <p className="text-xl font-black text-red-500 mt-1">{loading ? '...' : jumlahAlpa}</p>
        </div>
      </div>

      {/* Tabel Jurnal Presensi */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex justify-between items-center gap-2 mb-5">
          <h2 className="text-sm font-black text-[#3e2723] uppercase tracking-wider flex items-center gap-2">
            <FileText size={16} className="text-[#E67E22]" /> Jurnal Presensi Kelas
          </h2>
 
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-right">
            <span className="text-[10px] text-gray-500 font-bold uppercase block">Kelas: <strong className="text-slate-800">{metaInfo.kelas}</strong></span>
            <span className="text-[10px] text-indigo-600 font-black uppercase mt-0.5 block tracking-tight">Mapel: {metaInfo.mapel}</span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-100 mb-5">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-400 font-black text-[10px] uppercase tracking-wider border-b border-gray-100">
                <th className="p-4 w-28 text-center">NISN</th>
                <th className="p-4">Nama Lengkap Siswa</th>
                <th className="p-4 text-center w-28">Jam Scan</th>
                <th className="p-4 text-center w-28">Status</th>
                <th className="p-4 text-center w-56">Koreksi Guru</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs font-semibold text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-10 text-center text-gray-400 font-bold flex items-center justify-center gap-2">
                    <RefreshCw size={14} className="animate-spin text-indigo-600" /> Memuat data lembar absensi...
                  </td>
                </tr>
              ) : dataSiswa.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-10 text-center text-gray-400 font-bold">
                    Tidak ada riwayat presensi siswa pada jadwal & tanggal terpilih.
                  </td>
                </tr>
              ) : (
                dataSiswa.map((siswa) => (
                  <tr key={siswa.id_siswa} className="hover:bg-gray-50/50 transition-all">
                    <td className="p-4 text-center font-mono font-bold text-gray-400">{siswa.nisn || '-'}</td>
                    <td className="p-4 font-bold text-[#3e2723] text-sm">{siswa.nama}</td>
                    <td className="p-4 text-center font-mono text-gray-400">{siswa.waktu || '-'}</td>
                    
                    <td className="p-4 text-center">
                      <span className={`text-[9px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider inline-flex items-center gap-1 border ${
                        siswa.status === 'Hadir' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' :
                        siswa.status === 'Izin' ? 'bg-amber-50 border-amber-200 text-amber-600' :
                        siswa.status === 'Sakit' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-red-50 border-red-200 text-red-500'
                      }`}>
                        {siswa.status === 'Hadir' && <CheckCircle2 size={10} />}
                        {siswa.status === 'Izin' && <HelpCircle size={10} />}
                        {siswa.status === 'Sakit' && <AlertCircle size={10} />}
                        {(siswa.status === 'Alpha' || siswa.status === 'Alpa') && <XCircle size={10} />}
                        {siswa.status}
                      </span>
                    </td>

                    <td className="p-4 text-center">
                      <div className="inline-flex rounded-xl border border-gray-200 p-1 bg-gray-50 gap-1">
                        <button
                          type="button"
                          onClick={() => handleKoreksiStatus(siswa.id_siswa, 'Hadir')}
                          title="Set Hadir"
                          className={`w-7 h-7 text-[11px] font-black rounded-lg transition-all cursor-pointer ${siswa.status === 'Hadir' ? 'bg-emerald-500 text-white shadow-xs' : 'text-gray-400 hover:bg-gray-200'}`}
                        >
                          H
                        </button>
                        <button
                          type="button"
                          onClick={() => handleKoreksiStatus(siswa.id_siswa, 'Izin')}
                          title="Set Izin"
                          className={`w-7 h-7 text-[11px] font-black rounded-lg transition-all cursor-pointer ${siswa.status === 'Izin' ? 'bg-amber-500 text-white shadow-xs' : 'text-gray-400 hover:bg-gray-200'}`}
                        >
                          I
                        </button>
                        <button
                          type="button"
                          onClick={() => handleKoreksiStatus(siswa.id_siswa, 'Sakit')}
                          title="Set Sakit"
                          className={`w-7 h-7 text-[11px] font-black rounded-lg transition-all cursor-pointer ${siswa.status === 'Sakit' ? 'bg-blue-500 text-white shadow-xs' : 'text-gray-400 hover:bg-gray-200'}`}
                        >
                          S
                        </button>
                        <button
                          type="button"
                          onClick={() => handleKoreksiStatus(siswa.id_siswa, 'Alpha')}
                          title="Set Alpa"
                          className={`w-7 h-7 text-[11px] font-black rounded-lg transition-all cursor-pointer ${(siswa.status === 'Alpha' || siswa.status === 'Alpa') ? 'bg-red-500 text-white shadow-xs' : 'text-gray-400 hover:bg-gray-200'}`}
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

        <div className="flex justify-end pt-3 border-t border-gray-100">
          <button
            onClick={handleSimpanKeDatabase}
            disabled={saving || loading || dataSiswa.length === 0}
            className="flex items-center gap-2 bg-slate-950 hover:bg-slate-800 disabled:bg-gray-300 text-white text-[10px] font-black uppercase tracking-wider px-6 py-3.5 rounded-xl transition-all shadow-md cursor-pointer disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Sedang Menyimpan...
              </>
            ) : (
              <>
                <Save size={14} />
                Simpan Perubahan Jurnal
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default RekapMapel;