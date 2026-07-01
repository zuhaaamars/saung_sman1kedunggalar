import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  Download, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Edit3, 
  Trash2, 
  X, 
  Check 
} from 'lucide-react';

const ImportGuru = () => {
  // --- STATE UNTUK FILE UPLOAD ---
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  // --- STATE DATA GURU (Membaca dari Database) ---
  const [dataGuru, setDataGuru] = useState([]);
  const [loadingTable, setLoadingTable] = useState(false);

  // State Form Modal (Tambah / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formInput, setFormInput] = useState({
    nip_nuptk: '',
    nama_guru: '',
    no_hp_pribadi: '',
    role_akses: 'guru' // default awal
  });

  // --- AMBIL DATA GURU/STAFF DARI DATABASE (GET) ---
  const fetchGuru = async () => {
    setLoadingTable(true);
    const token = localStorage.getItem('token'); 
    const cleanToken = token ? token.replace(/^"(.*)"$/, '$1') : '';
    
    try {
      const response = await axios.get('http://localhost:5000/api/admin/lihat-staff', {
        headers: {
          'Authorization': `Bearer ${cleanToken}`
        }
      });
      if (response.data.status === 'success') {
        setDataGuru(response.data.data);
      }
    } catch (err) {
      console.error("Gagal mengambil data guru/staff:", err);
    } finally {
      setLoadingTable(false);
    }
  };

  useEffect(() => {
    fetchGuru();
  }, []);

  // --- LOGIK HANDLING DRAG & DROP EXCEL ---
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => { setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    validateAndSetFile(e.dataTransfer.files[0]);
  };
  const handleFileChange = (e) => { validateAndSetFile(e.target.files[0]); };

  const validateAndSetFile = (selectedFile) => {
    if (!selectedFile) return;
    const fileExtension = selectedFile.name.split('.').pop().toLowerCase();
    if (fileExtension !== 'xlsx' && fileExtension !== 'xls') {
      setStatus({ type: 'error', message: 'Format file salah! Sistem hanya menerima ekstensi Excel (.xlsx atau .xls)' });
      setFile(null);
      return;
    }
    setFile(selectedFile);
    setStatus({ type: '', message: '' });
  };

  // --- PROSES UPLOAD EXCEL GURU ---
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setStatus({ type: 'error', message: 'Silakan pilih file Excel terlebih dahulu!' });
      return;
    }
    setIsLoading(true);
    setStatus({ type: '', message: '' });

    const token = localStorage.getItem('token'); 
    const cleanToken = token ? token.replace(/^"(.*)"$/, '$1') : '';
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('http://localhost:5000/api/admin/import-guru', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${cleanToken}`
        }
      });
      if (response.data.status === 'success') {
        setStatus({ type: 'success', message: response.data.message });
        setFile(null);
        fetchGuru();
      }
    } catch (err) {
      setStatus({ 
        type: 'error', 
        message: err.response?.data?.message || 'Gagal mengunggah data.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  // --- LOGIK HANDLING CRUD ---
  const openAddModal = () => {
    setIsEditing(false);
    setFormInput({ nip_nuptk: '', nama_guru: '', no_hp_pribadi: '', role_akses: 'guru' });
    setIsModalOpen(true);
  };

  const openEditModal = (guru) => {
    setIsEditing(true);
    setCurrentId(guru.id);
    setFormInput({
      nip_nuptk: guru.nip || '', 
      nama_guru: guru.username || guru.nama_lengkap || '', 
      no_hp_pribadi: guru.no_hp_pribadi || '',
      role_akses: guru.role === 'staff' ? 'staff' : 'guru'
    });
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormInput(prev => ({ ...prev, [name]: value }));
  };

  // --- SIMPAN DATA (TAMBAH / EDIT MANUAL) ---
  const handleSaveData = async (e) => {
    e.preventDefault();
    if (!formInput.nip_nuptk || !formInput.nama_guru) {
      alert("Kolom NIP/NUPTK dan Nama Lengkap wajib diisi!");
      return;
    }

    const token = localStorage.getItem('token'); 
    const cleanToken = token ? token.replace(/^"(.*)"$/, '$1') : '';

    if (!cleanToken || cleanToken === 'null') {
      alert("Sesi Anda berakhir, silakan login ulang.");
      return;
    }

    const configHeaders = {
      headers: { 
        'Authorization': `Bearer ${cleanToken}`,
        'Content-Type': 'application/json'
      }
    };

    // Sinkronisasi penamaan role ke backend Flask ('guru' -> dimasukkan ke tabel 'staff' dengan jabatan Guru)
    // Di backend kamu hanya menerima role: 'siswa' atau 'staff'
    const targetRole = 'staff'; 
    const targetJabatan = formInput.role_akses === 'staff' ? 'Staff Tata Usaha' : 'Guru Mata Pelajaran';

    if (isEditing) {
      // --- LOGIKA EDIT DATA ---
      try {
        const payload = {
          role: targetRole,
          nama_lengkap: formInput.nama_guru,
          nip: formInput.nip_nuptk,
          jabatan: targetJabatan,
          no_hp_pribadi: formInput.no_hp_pribadi || ""
        };
        const response = await axios.put(`http://localhost:5000/api/admin/ubah-staff/${currentId}`, payload, configHeaders);
        if (response.data.status === 'success') {
          alert("Data pendidik berhasil diperbarui.");
          setIsModalOpen(false);
          fetchGuru();
        }
      } catch (err) {
        alert("Gagal memperbarui data: " + (err.response?.data?.message || err.message));
      }
    } else {
      // --- LOGIKA TAMBAH BARU (MENGIKUTI STRUKTUR BACKEND FLASK) ---
      try {
        const payload = {
          role: targetRole,                     // Flask meminta: 'staff' (Mata rantai baris 17 di tes.txt)
          nama_lengkap: formInput.nama_guru,     // Flask meminta: nama_lengkap
          nip: formInput.nip_nuptk,              // Flask meminta: nip (untuk rumus password baris 17)
          jabatan: targetJabatan,               // Flask meminta: jabatan (Wajib diisi atau kena rollback baris 23)
          status_kepegawaian: "aktif"
        };

        const response = await axios.post('http://localhost:5000/api/admin/tambah-user', payload, configHeaders);
        
        if (response.data.status === 'success') {
          alert(`Personil berhasil didaftarkan!\nPassword Default: ${response.data.data_akun.password_default}`);
          setIsModalOpen(false);
          fetchGuru(); 
        }
      } catch (err) {
        // Jika backend mengirim pesan error spesifik, tampilkan agar mudah melacak
        alert("Gagal mendaftarkan personil: " + (err.response?.data?.message || `Error status ${err.response?.status}`));
      }
    }
  };

  // --- HAPUS DATA GURU/STAFF ---
  const handleDeleteGuru = async (id) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus data pendidik ini?")) {
      const token = localStorage.getItem('token'); 
      const cleanToken = token ? token.replace(/^"(.*)"$/, '$1') : '';
      try {
        const response = await axios.delete(`http://localhost:5000/api/admin/hapus-staff/${id}`, {
          headers: { 'Authorization': `Bearer ${cleanToken}` }
        });
        if (response.data.status === 'success') {
          alert("Data pendidik berhasil dihapus dari sistem.");
          fetchGuru(); 
        }
      } catch (err) {
        alert("Gagal menghapus data: " + (err.response?.data?.message || err.message));
      }
    }
  };

  return (
    <div className="max-w-5xl mx-auto font-sans pb-12">
      {/* HEADER JUDUL */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-[#3e2723] uppercase">Manajemen & Import Data Pendidik</h1>
        <p className="text-gray-500 text-sm">Integrasikan file Excel atau kelola data kepegawaian guru mapel/wali kelas secara langsung.</p>
      </div>

      {/* SECTION ATAS: IMPORT UTILITY */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="md:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-[#e8d2b8]/50 flex flex-col justify-between">
          <form onSubmit={handleUpload} className="space-y-5">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-6 text-center flex flex-col items-center justify-center cursor-pointer transition-all duration-200 min-h-[180px] ${
                isDragging ? 'border-[#E67E22] bg-[#f5e6d3]/30' : file ? 'border-[#3e2723] bg-gray-50' : 'border-gray-300 hover:border-[#E67E22] bg-gray-50/50'
              }`}
              onClick={() => document.getElementById('excel-file-guru').click()}
            >
              <input id="excel-file-guru" type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileChange} />
              {file ? (
                <>
                  <FileSpreadsheet size={40} className="text-[#3e2723] mb-2" />
                  <p className="text-sm font-bold text-[#3e2723] break-all px-4">{file.name}</p>
                  <p className="text-xs text-gray-400 mt-1">({(file.size / 1024).toFixed(1)} KB)</p>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }} className="mt-2 text-xs font-bold text-red-500 hover:underline">Ganti file</button>
                </>
              ) : (
                <>
                  <UploadCloud size={40} className="text-gray-400 mb-2" />
                  <p className="text-sm font-bold text-gray-700">Tarik & Jatuhkan file Excel Guru di sini</p>
                  <p className="text-xs text-gray-400 mt-1">atau klik untuk menelusuri dokumen komputer</p>
                </>
              )}
            </div>

            {status.message && (
              <div className={`p-4 rounded-xl flex items-start gap-3 border ${status.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                {status.type === 'error' ? <AlertTriangle size={20} className="shrink-0 mt-0.5" /> : <CheckCircle2 size={20} className="shrink-0 mt-0.5" />}
                <p className="text-sm font-medium leading-relaxed">{status.message}</p>
              </div>
            )}

            <button type="submit" disabled={isLoading || !file} className="w-full h-12 bg-[#3e2723] hover:bg-[#52332e] text-white rounded-xl font-bold text-sm tracking-wide transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-md">
              {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Proses & Simpan Data Guru via Excel"}
            </button>
          </form>
        </div>

        <div className="space-y-4">
          <div className="bg-[#f5e6d3]/40 p-5 rounded-2xl border border-[#e8d2b8]/60 text-center">
            <h3 className="font-bold text-sm text-[#3e2723] mb-1">Butuh Template Excel?</h3>
            <p className="text-xs text-gray-500 mb-3">Gunakan format kolom kepegawaian resmi.</p>
            <button 
              onClick={async () => {
                try {
                  const token = localStorage.getItem('token');
                  const cleanToken = token ? token.replace(/^"(.*)"$/, '$1') : '';
                  const response = await axios.get('http://localhost:5000/api/admin/export-guru', {
                    headers: { 'Authorization': `Bearer ${cleanToken}` },
                    responseType: 'blob' // Wajib agar file excel tidak rusak/corrupt
                  });
                  
                  const url = window.URL.createObjectURL(new Blob([response.data]));
                  const link = document.createElement('a');
                  link.href = url;
                  link.setAttribute('download', 'Master_Data_Pendidik_SMANIKE.xlsx');
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                } catch (err) {
                  alert("Gagal mengunduh data ekspor guru: " + (err.response?.data?.message || err.message));
                }
              }}
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 bg-[#E67E22] hover:bg-[#d35400] text-white font-bold text-xs rounded-xl shadow-sm transition"
            >
              <Download size={14} /> Unduh Template Excel
            </button>
          </div>
        </div>
      </div>

      {/* TABLE DISPLAY */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-black text-[#3e2723]">Daftar Pendidik Terdaftar</h2>
            <p className="text-xs text-gray-400">Total terdata di database: {dataGuru.length} personil</p>
          </div>
          <button 
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#E67E22] hover:bg-[#d35400] text-white text-xs font-bold rounded-xl shadow-sm transition"
          >
            <Plus size={16} /> Tambah Guru Manual
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 font-bold text-xs uppercase tracking-wider border-b border-gray-100">
                <th className="p-4 w-12 text-center">No</th>
                <th className="p-4">NIP / NUPTK</th>
                <th className="p-4">Nama Lengkap</th>
                <th className="p-4">Jabatan</th>
                <th className="p-4 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
              {loadingTable ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-400 text-xs font-medium">Sedang mengambil data staff & guru...</td>
                </tr>
              ) : dataGuru.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-400 text-xs font-medium">Belum ada data guru.</td>
                </tr>
              ) : (
                dataGuru.map((guru, index) => (
                  <tr key={guru.id || index} className="hover:bg-gray-50/70 transition">
                    <td className="p-4 text-center text-xs font-bold text-gray-400">{index + 1}</td>
                    <td className="p-4 font-mono text-xs font-semibold text-gray-600">{guru.nip || '-'}</td>
                    <td className="p-4 font-bold text-[#3e2723]">{guru.username || guru.nama_lengkap}</td>
                    <td className="p-4 text-xs font-medium text-gray-600">{guru.jabatan || 'Staff'}</td>
                    <td className="p-4 text-center flex items-center justify-center gap-2">
                      <button onClick={() => openEditModal(guru)} className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg"><Edit3 size={14} /></button>
                      <button onClick={() => handleDeleteGuru(guru.id)} className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL POPUP FORM */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-[#3e2723] text-sm uppercase">
                {isEditing ? "📝 Edit Data Pendidik" : "✨ Tambah Pendidik Baru"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveData} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">NIP / NUPTK (Wajib untuk Rumus Password)</label>
                <input 
                  type="text" name="nip_nuptk" value={formInput.nip_nuptk} onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#E67E22]" placeholder="Contoh: 19820311..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nama Lengkap beserta Gelar</label>
                <input 
                  type="text" name="nama_guru" value={formInput.nama_guru} onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#E67E22]" placeholder="Contoh: Ahmad, S.Pd."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipe Pegawai</label>
                <select 
                  name="role_akses" value={formInput.role_akses} onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-[#E67E22]"
                >
                  <option value="guru">Guru (Tenaga Pendidik)</option>
                  <option value="staff">Staf (Tata Usaha / Kependidikan)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-200 text-gray-500 text-xs font-bold rounded-xl hover:bg-gray-50">Batal</button>
                <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#3e2723] hover:bg-[#52332e] text-white text-xs font-bold rounded-xl shadow-sm"><Check size={14} /> Simpan Data</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportGuru;