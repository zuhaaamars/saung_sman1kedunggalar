import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit3, Trash2, X, Check, Layers, BookOpen } from 'lucide-react';

const MasterAkademik = () => {
  const [activeTab, setActiveTab] = useState('kelas');
  
  // --- STATE DATA ASLI DARI DATABASE ---
  const [dataGuru, setDataGuru] = useState([]);
  const [dataKelas, setDataKelas] = useState([]);
  const [dataMapel, setDataMapel] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- STATE MODAL GLOBAL ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);

  // Form Input Gabungan
  const [formKelas, setFormKelas] = useState({ nama_kelas: '', tingkat: '10', id_wali_kelas: '' });
  const [formMapel, setFormMapel] = useState({ kode_mapel: '', nama_mapel: '', jml_jam: 2, kategori: 'A (Muatan Nasional)' });

  // --- FUNGSI AMBIL DATA DARI BACKEND FLASK ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const resGuru = await axios.get('http://localhost:5000/api/admin/get-guru-pilihan');
      if (resGuru.data.status === 'success') setDataGuru(resGuru.data.data);

      const resKelas = await axios.get('http://localhost:5000/api/admin/kelas');
      if (resKelas.data.status === 'success') setDataKelas(resKelas.data.data);

      const resMapel = await axios.get('http://localhost:5000/api/admin/mapel');
      if (resMapel.data.status === 'success') setDataMapel(resMapel.data.data);
    } catch (err) {
      console.error("Gagal memuat data akademik:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- HANDLER MODAL KELAS ---
  const openKelasModal = (kelas = null) => {
    if (kelas) {
      setIsEditing(true);
      setCurrentId(kelas.id_kelas);
      setFormKelas({ 
        nama_kelas: kelas.nama_kelas, 
        tingkat: kelas.tingkat, 
        id_wali_kelas: kelas.id_wali_kelas || '' 
      });
    } else {
      setIsEditing(false);
      setFormKelas({ 
        nama_kelas: '', 
        tingkat: '10', 
        id_wali_kelas: dataGuru[0]?.id_staff || '' 
      });
    }
    setIsModalOpen(true);
  };

  // --- HANDLER MODAL MAPEL ---
  const openMapelModal = (mapel = null) => {
    if (mapel) {
      setIsEditing(true);
      setCurrentId(mapel.id_mapel);
      setFormMapel({ 
        kode_mapel: mapel.kode_mapel, 
        nama_mapel: mapel.nama_mapel, 
        jml_jam: mapel.jml_jam, 
        kategori: mapel.kategori 
      });
    } else {
      setIsEditing(false);
      setFormMapel({ kode_mapel: '', nama_mapel: '', jml_jam: 2, kategori: 'A (Muatan Nasional)' });
    }
    setIsModalOpen(true);
  };

  // --- SAVE DATA HANDLER KE DB ---
  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (activeTab === 'kelas') {
        if (!formKelas.nama_kelas) return alert('Nama kelas wajib diisi!');
        if (isEditing) {
          await axios.put(`http://localhost:5000/api/admin/kelas/${currentId}`, formKelas);
        } else {
          await axios.post('http://localhost:5000/api/admin/kelas', formKelas);
        }
      } else {
        if (!formMapel.kode_mapel || !formMapel.nama_mapel) return alert('Kode dan Nama Mapel wajib diisi!');
        if (isEditing) {
          await axios.put(`http://localhost:5000/api/admin/mapel/${currentId}`, formMapel);
        } else {
          await axios.post('http://localhost:5000/api/admin/mapel', formMapel);
        }
      }
      setIsModalOpen(false);
      fetchData(); // Reload data segar dari DB setelah tersimpan
    } catch (err) {
      alert(err.response?.data?.message || "Terjadi kesalahan sistem saat menyimpan.");
    }
  };

  // --- DELETE HANDLER DARI DB ---
  const handleDelete = async (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus data ini?')) {
      try {
        if (activeTab === 'kelas') {
          await axios.delete(`http://localhost:5000/api/admin/kelas/${id}`);
        } else {
          await axios.delete(`http://localhost:5000/api/admin/mapel/${id}`);
        }
        fetchData();
      } catch (err) {
        alert("Gagal menghapus data.");
      }
    }
  };

  return (
    <div className="max-w-5xl mx-auto font-sans pb-12">
      {/* HEADER UTAMA */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-[#3e2723] uppercase">Data Master Akademik</h1>
        <p className="text-gray-500 text-sm">Kelola data rumpun kelas dan standarisasi mata pelajaran sekolah di sini.</p>
      </div>

      {/* STRIP TAB NAVIGASI */}
      <div className="flex border-b border-gray-200 mb-6 gap-2">
        <button
          type="button"
          onClick={() => { setActiveTab('kelas'); setIsModalOpen(false); }}
          className={`flex items-center gap-2 px-5 py-3 font-bold text-sm transition-all border-b-2 rounded-t-xl ${
            activeTab === 'kelas' ? 'border-[#E67E22] text-[#E67E22] bg-[#f5e6d3]/20' : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <Layers size={16} /> Data Master Kelas
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('mapel'); setIsModalOpen(false); }}
          className={`flex items-center gap-2 px-5 py-3 font-bold text-sm transition-all border-b-2 rounded-t-xl ${
            activeTab === 'mapel' ? 'border-[#E67E22] text-[#E67E22] bg-[#f5e6d3]/20' : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <BookOpen size={16} /> Data Mata Pelajaran (Mapel)
        </button>
      </div>

      {/* CONTAINER UTAMA KONTEN */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        {loading && <p className="text-center text-sm text-gray-400 py-4">Memuat data dari database...</p>}
        
        {/* VIEW 1: MANAGEMENT KELAS */}
        {!loading && activeTab === 'kelas' && (
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-black text-[#3e2723]">Daftar Kelas Aktif</h2>
                <p className="text-xs text-gray-400">Total terdata: {dataKelas.length} Rumpun Kelas</p>
              </div>
              <button onClick={() => openKelasModal()} className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#E67E22] hover:bg-[#d35400] text-white text-xs font-bold rounded-xl shadow-sm transition">
                <Plus size={16} /> Tambah Kelas Manual
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 font-bold text-xs uppercase tracking-wider border-b border-gray-100">
                    <th className="p-4 w-12 text-center">No</th>
                    <th className="p-4">Nama Kelas</th>
                    <th className="p-4 text-center">Tingkatan</th>
                    <th className="p-4">Wali Kelas Assigned</th>
                    <th className="p-4 text-center w-28">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                  {dataKelas.map((kelas, idx) => (
                    <tr key={kelas.id_kelas} className="hover:bg-gray-50/70 transition">
                      <td className="p-4 text-center font-bold text-gray-400 text-xs">{idx + 1}</td>
                      <td className="p-4 font-bold text-[#3e2723]">{kelas.nama_kelas}</td>
                      <td className="p-4 text-center"><span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-bold">Kelas {kelas.tingkat}</span></td>
                      <td className="p-4 font-medium text-gray-600">{kelas.nama_wali || 'Belum Ditentukan'}</td>
                      <td className="p-4 text-center flex items-center justify-center gap-2">
                        <button onClick={() => openKelasModal(kelas)} className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition"><Edit3 size={14} /></button>
                        <button onClick={() => handleDelete(kelas.id_kelas)} className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW 2: MANAGEMENT MAPEL */}
        {!loading && activeTab === 'mapel' && (
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-black text-[#3e2723]">Kurikulum Mata Pelajaran</h2>
                <p className="text-xs text-gray-400">Total terdata: {dataMapel.length} Mata Pelajaran</p>
              </div>
              <button onClick={() => openMapelModal()} className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#3e2723] hover:bg-[#52332e] text-white text-xs font-bold rounded-xl shadow-sm transition">
                <Plus size={16} /> Tambah Mapel Baru
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 font-bold text-xs uppercase tracking-wider border-b border-gray-100">
                    <th className="p-4 w-12 text-center">No</th>
                    <th className="p-4">Kode Mapel</th>
                    <th className="p-4">Nama Mata Pelajaran</th>
                    <th className="p-4 text-center">Beban Jam / Minggu</th>
                    <th className="p-4">Kelompok Kategori</th>
                    <th className="p-4 text-center w-28">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                  {dataMapel.map((mapel, idx) => (
                    <tr key={mapel.id_mapel} className="hover:bg-gray-50/70 transition">
                      <td className="p-4 text-center font-bold text-gray-400 text-xs">{idx + 1}</td>
                      <td className="p-4 font-mono text-xs font-bold text-gray-500">{mapel.kode_mapel}</td>
                      <td className="p-4 font-bold text-[#3e2723]">{mapel.nama_mapel}</td>
                      <td className="p-4 text-center font-bold text-[#E67E22]">{mapel.jml_jam} JP</td>
                      <td className="p-4 text-xs font-medium text-gray-500">{mapel.kategori}</td>
                      <td className="p-4 text-center flex items-center justify-center gap-2">
                        <button onClick={() => openMapelModal(mapel)} className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition"><Edit3 size={14} /></button>
                        <button onClick={() => handleDelete(mapel.id_mapel)} className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* POPUP MODAL DYNAMIC GABUNGAN */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-[#3e2723] text-sm uppercase">
                {activeTab === 'kelas' 
                  ? (isEditing ? '📝 Edit Form Kelas' : '✨ Buat Kelas Baru')
                  : (isEditing ? '📝 Edit Struktur Mapel' : '✨ Registrasi Mapel Baru')
                }
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {activeTab === 'kelas' ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nama Rumpun Kelas</label>
                    <input 
                      type="text" value={formKelas.nama_kelas} onChange={(e) => setFormKelas({...formKelas, nama_kelas: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#E67E22]" placeholder="Contoh: XI-RPL 1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tingkat Pendidikan</label>
                    <select value={formKelas.tingkat} onChange={(e) => setFormKelas({...formKelas, tingkat: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-[#E67E22]">
                      <option value="10">Kelas 10 (Sepuluh)</option>
                      <option value="11">Kelas 11 (Sebelas)</option>
                      <option value="12">Kelas 12 (Dua Belas)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pilih Wali Kelas (Data Guru)</label>
                    <select value={formKelas.id_wali_kelas} onChange={(e) => setFormKelas({...formKelas, id_wali_kelas: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-[#E67E22]">
                      <option value="">-- Tanpa Wali Kelas --</option>
                      {dataGuru.map(g => <option key={g.id_staff} value={g.id_staff}>{g.nama_lengkap}</option>)}
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Kode Kodefikasi Mapel</label>
                    <input 
                      type="text" value={formMapel.kode_mapel} onChange={(e) => setFormMapel({...formMapel, kode_mapel: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#3e2723] font-mono" placeholder="Contoh: MP001"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nama Lengkap Mata Pelajaran</label>
                    <input 
                      type="text" value={formMapel.nama_mapel} onChange={(e) => setFormMapel({...formMapel, nama_mapel: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#3e2723]" placeholder="Contoh: Pemrograman Web"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Durasi JP (Jam Pelajaran / Minggu)</label>
                    <input 
                      type="number" min="1" max="8" value={formMapel.jml_jam} onChange={(e) => setFormMapel({...formMapel, jml_jam: parseInt(e.target.value, 10) || 0})}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#3e2723]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Kelompok Kompetensi</label>
                    <select value={formMapel.kategori} onChange={(e) => setFormMapel({...formMapel, kategori: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-[#3e2723]">
                      <option value="A (Muatan Nasional)">Kelompok A (Muatan Nasional)</option>
                      <option value="B (Muatan Kewilayahan)">Kelompok B (Muatan Kewilayahan)</option>
                      <option value="C (Muatan Kejuruan)">Kelompok C (Muatan Peminatan Kejuruan)</option>
                    </select>
                  </div>
                </>
              )}

              {/* ACTION FOOTER */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-200 text-gray-500 text-xs font-bold rounded-xl hover:bg-gray-50 transition">Batal</button>
                <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#3e2723] hover:bg-[#52332e] text-white text-xs font-bold rounded-xl shadow-sm transition">
                  <Check size={14} /> Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterAkademik;