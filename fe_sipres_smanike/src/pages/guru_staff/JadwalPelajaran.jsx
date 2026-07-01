import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Plus, Edit2, Trash2, Calendar, 
  Layers, Clock, RefreshCcw, AlertTriangle, X, User, BookOpen 
} from 'lucide-react';

const JadwalPelajaran = () => {
  // =========================
  // STATE MANAGEMENT DINAMIS
  // =========================
  const [jadwalList, setJadwalList] = useState([]);
  const [kelasOptions, setKelasOptions] = useState([]); // Sekarang dinamis dari DB
  const [guruOptions, setGuruOptions] = useState([]);   // Mengambil data staff guru
  const [mapelOptions, setMapelOptions] = useState([]);   // Mengambil data master mapel
  
  const [selectedKelasFilter, setSelectedKelasFilter] = useState('Semua');
  const [loading, setLoading] = useState(false);

  // State Modal Form (Tambah / Edit)
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const [formData, setFormData] = useState({
    id_kelas: '',
    id_staff: '',    // Disesuaikan dengan relasi tabel staff kamu
    id_mapel: '',    // Disesuaikan dengan relasi tabel mata_pelajaran
    hari: 'Senin',
    jam_mulai: '',
    jam_selesai: ''
  });

  // =========================
  // FETCH DATA DARI API (PORT 5000)
  // =========================
  const fetchSemuaDataAkademik = async () => {
    setLoading(true);
    try {
      // 1. Ambil data master jadwal pelajaran
      const resJadwal = await axios.get('http://localhost:5000/api/admin/jadwal');
      if (resJadwal.data.status === 'success') setJadwalList(resJadwal.data.data || []);

      // 2. Ambil data master kelas aktif (untuk dropdown & filter)
      const resKelas = await axios.get('http://localhost:5000/api/admin/kelas');
      if (resKelas.data.status === 'success') setKelasOptions(resKelas.data.data || []);

      // 3. Ambil data guru pengampu (dari tabel staff)
      const resGuru = await axios.get('http://localhost:5000/api/admin/get-guru-pilihan');
      if (resGuru.data.status === 'success') setGuruOptions(resGuru.data.data || []);

      // 4. Ambil data master mata pelajaran kurikulum
      const resMapel = await axios.get('http://localhost:5000/api/admin/mapel');
      if (resMapel.data.status === 'success') setMapelOptions(resMapel.data.data || []);

    } catch (err) {
      console.error("Gagal melakukan sinkronisasi data akademik:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSemuaDataAkademik();
  }, []);

  // =========================
  // HANDLER CRUD ACTIONS
  // =========================
  const handleOpenCreate = () => {
    setIsEditMode(false);
    setFormData({
      id_kelas: '', 
      id_staff: '', 
      id_mapel: '',
      hari: 'Senin', 
      jam_mulai: '', 
      jam_selesai: ''
    });
    setShowModal(true);
  };

  const handleOpenEdit = (item) => {
    setIsEditMode(true);
    setSelectedId(item.id_jadwal); // 

    // Fungsi pembantu untuk merapikan jam ganjil (misal "0:00:00" -> "00:00")
    const paksaFormatJam = (teksJam) => {
      if (!teksJam) return "00:00";
      const bagian = String(teksJam).split(':');
      if (bagian.length >= 2) {
        const jam = bagian[0].trim().padStart(2, '0');
        const menit = bagian[1].trim().padStart(2, '0');
        return `${jam}:${menit}`;
      }
      return "00:00";
    };

    setFormData({
      id_kelas: item.id_kelas, // 
      id_staff: item.id_staff, // 
      id_mapel: item.id_mapel, // 
      hari: item.hari, // 
      jam_mulai: paksaFormatJam(item.jam_mulai),
      jam_selesai: paksaFormatJam(item.jam_selesai)
    });
    setShowModal(true); // [cite: 21]
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.id_kelas || !formData.id_staff || !formData.id_mapel) {
      return alert("Harap tentukan Kelas, Guru, dan Mata Pelajaran terlebih dahulu!");
    }

    try {
      if (isEditMode) {
        // 🔥 Menembak ke endpoint PUT untuk melakukan update data berdasarkan selectedId
        const res = await axios.put(`http://localhost:5000/api/admin/jadwal/${selectedId}`, formData);
        if (res.data.status === 'success') {
          alert("Jadwal pelajaran berhasil diperbarui!");
        }
      } else {
        await axios.post('http://localhost:5000/api/admin/jadwal', formData);
        alert("Jadwal pelajaran baru berhasil didaftarkan ke MySQL!");
      }
      setShowModal(false);
      fetchSemuaDataAkademik(); // Memperbarui tabel secara otomatis
    } catch (err) {
      alert("Gagal menyimpan data jadwal: " + (err.response?.data?.message || "Error server"));
    }
  };

  const handleDeleteSingle = async (idJadwal) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus jadwal mengajar ini?")) {
      try {
        await axios.delete(`http://localhost:5000/api/admin/jadwal/${idJadwal}`);
        fetchSemuaDataAkademik();
      } catch (err) {
        alert("Gagal menghapus jadwal.");
      }
    }
  };

  // Filter List Data berdasarkan Dropdown Kelas pilihan Staff
  const filteredJadwal = selectedKelasFilter === 'Semua' 
    ? jadwalList 
    : jadwalList.filter(item => String(item.id_kelas) === String(selectedKelasFilter) || item.nama_kelas === selectedKelasFilter);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
      
      {/* HEADER SECTION */}
      <div className="max-w-6xl mx-auto mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Calendar className="text-[#E67E22]" /> Panel Management Jadwal
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">Otoritas Admin untuk menyusun, mendistribusikan, dan menghapus plotting jadwal mengajar guru.</p>
        </div>
   
        <div className="flex gap-2.5">
          <button 
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-black shadow-xs transition-all active:scale-95"
          >
            <Plus size={16} />
            Tambah Plotting Jadwal
          </button>
        </div>
      </div>

      {/* FILTER PANEL */}
      <div className="max-w-6xl mx-auto bg-white p-4 rounded-xl border border-slate-100 shadow-2xs mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3 w-full max-w-sm">
          <Layers size={14} className="text-slate-400" />
          <label className="text-xs font-bold text-slate-500 uppercase whitespace-nowrap">Filter Tampilan Kelas:</label>
          <select 
            value={selectedKelasFilter}
            onChange={(e) => setSelectedKelasFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg p-2 font-semibold text-slate-700 focus:outline-none"
          >
            <option value="Semua">Tampilkan Seluruh Kelas</option>
            {kelasOptions.map((k) => (
              <option key={k.id_kelas} value={k.id_kelas}>{k.nama_kelas}</option>
            ))}
          </select>
        </div>
        <div className="text-[11px] font-bold text-slate-400">Total Terdaftar: {filteredJadwal.length} Sesi Mengajar</div>
      </div>

      {/* TABEL DATA UTAMA */}
      <div className="max-w-6xl mx-auto bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100 uppercase tracking-wider">
                <th className="p-4">Hari / Waktu Sesi</th>
                <th className="p-4">Ruang Kelas</th>
                <th className="p-4">Mata Pelajaran</th>
                <th className="p-4">Guru Pengajar (Staff)</th>
                <th className="p-4 text-center">Tindakan Manajerial</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-400 font-medium">
                    <RefreshCcw size={20} className="animate-spin mx-auto mb-2 text-indigo-500" /> Sinkronisasi master database sekolah...
                  </td>
                </tr>
              ) : filteredJadwal.length > 0 ? (
                filteredJadwal.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-semibold">
                      <span className="block text-slate-900 font-bold text-[#E67E22]">{item.hari}</span>
                      <span className="text-slate-400 font-mono text-[11px] flex items-center gap-1 mt-0.5">
                        <Clock size={11}/> {item.jam_mulai ? item.jam_mulai.substring(0,5) : ''} - {item.jam_selesai ? item.jam_selesai.substring(0,5) : ''}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-indigo-600">
                      <span className="bg-indigo-50 px-2 py-1 rounded text-indigo-700">{item.nama_kelas}</span>
                    </td>
                    <td className="p-4 font-bold text-slate-900">{item.nama_mapel}</td>
                    <td className="p-4 text-slate-600 font-semibold">{item.nama_guru}</td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors"
                          title="Lihat Detail"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button 
                          onClick={() => handleDeleteSingle(item.id_jadwal)}
                          className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors"
                          title="Hapus Jadwal"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-slate-400">
                    <Calendar size={28} className="mx-auto mb-2 text-slate-300" />
                    Belum ada plotting mengajar guru pada kelompok kelas ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================
          MODAL FORM PLOTTING DINAMIS (MUTASI DATA)
      ========================= */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-black text-slate-900 text-sm uppercase tracking-wide">
                {isEditMode ? 'Detail Plotting Mengajar' : 'Plotting Guru & Jam Pelajaran Baru'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSubmitForm} className="p-5 space-y-4 text-xs">
              
              {/* SELECT KELAS DINAMIS */}
              <div>
                <label className="block font-bold text-slate-500 uppercase mb-1">Ruang Kelas Target</label>
                <select 
                  required
                  value={formData.id_kelas}
                  onChange={(e) => setFormData({...formData, id_kelas: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="">-- Pilih Rumpun Kelas --</option>
                  {kelasOptions.map((k) => <option key={k.id_kelas} value={k.id_kelas}>{k.nama_kelas}</option>)}
                </select>
              </div>

              {/* SELECT MATA PELAJARAN DINAMIS */}
              <div>
                <label className="block font-bold text-slate-500 uppercase mb-1">Mata Pelajaran</label>
                <select 
                  required
                  value={formData.id_mapel}
                  onChange={(e) => setFormData({...formData, id_mapel: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="">-- Pilih Mata Pelajaran --</option>
                  {mapelOptions.map((m) => <option key={m.id_mapel} value={m.id_mapel}>[{m.kode_mapel}] {m.nama_mapel}</option>)}
                </select>
              </div>

              {/* SELECT GURU DINAMIS */}
              <div>
                <label className="block font-bold text-slate-500 uppercase mb-1">Guru Pengajar (Staff)</label>
                <select 
                  required
                  value={formData.id_staff}
                  onChange={(e) => setFormData({...formData, id_staff: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="">-- Pilih Guru Pengampu --</option>
                  {guruOptions.map((g) => <option key={g.id_staff} value={g.id_staff}>{g.nama_lengkap}</option>)}
                </select>
              </div>

              {/* HARI & JAM WAKTU */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-slate-500 uppercase mb-1">Hari</label>
                  <select 
                    value={formData.hari}
                    onChange={(e) => setFormData({...formData, hari: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-semibold text-slate-700 focus:outline-none"
                  >
                    <option value="Senin">Senin</option>
                    <option value="Selasa">Selasa</option>
                    <option value="Rabu">Rabu</option>
                    <option value="Kamis">Kamis</option>
                    <option value="Jumat">Jumat</option>
                    <option value="Sabtu">Sabtu</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-500 uppercase mb-1">Jam Mulai</label>
                  <input 
                    type="time" required
                    value={formData.jam_mulai ? formData.jam_mulai.substring(0, 5) : "00:00"} 
                    onChange={(e) => setFormData({...formData, jam_mulai: e.target.value})} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-semibold text-slate-700 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 uppercase mb-1">Jam Selesai</label>
                  <input 
                    type="time" required
                    value={formData.jam_selesai ? formData.jam_selesai.substring(0, 5) : "00:00"} 
                    onChange={(e) => setFormData({...formData, jam_selesai: e.target.value})} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-semibold text-slate-700 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-4 py-2.5 rounded-lg"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-5 py-2.5 rounded-lg shadow-xs"
                >
                  {isEditMode ? 'Simpan Perubahan' : 'Simpan Jadwal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default JadwalPelajaran;