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

const ImportSiswa = () => {
  // --- STATE UNTUK FILE UPLOAD ---
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  // --- STATE DATA SISWA (Membaca dari Database) ---
  const [dataSiswa, setDataSiswa] = useState([]);
  const [loadingTable, setLoadingTable] = useState(false);

  // State Form Modal (Tambah / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formInput, setFormInput] = useState({
    nisn: '',
    nama_siswa: '',
    kelas: '',
    no_hp_ortu: ''
  });

  // --- 1. AMBIL DATA SISWA DARI DATABASE (GET) ---
  const fetchSiswa = async () => {
    setLoadingTable(true);
    const token = localStorage.getItem('token'); 
    
    try {
      const response = await axios.get('http://localhost:5000/api/admin/lihat-siswa', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.data.status === 'success') {
        setDataSiswa(response.data.data);
      }
    } catch (err) {
      console.error("Gagal mengambil data siswa:", err);
    } finally {
      setLoadingTable(false);
    }
  };

  useEffect(() => {
    fetchSiswa();
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

  // --- 2. FUNGSI IMPORT FILE EXCEL SISWA (POST) ---
  const handleUpload = async (e) => {
  e.preventDefault();
  if (!file) {
    setStatus({ type: 'error', message: 'Silakan pilih file Excel terlebih dahulu!' });
    return;
  }
  setIsLoading(true);
  setStatus({ type: '', message: '' });

  const token = localStorage.getItem('token'); 
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await axios.post('http://localhost:5000/api/admin/import-siswa', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}` 
      }
    });
    
    if (response.data.status === 'success') {
      setStatus({ type: 'success', message: response.data.message });
      setFile(null);
      
      // 🌟 PASTIKAN BARIS INI ADA AGAR TABEL LANGSUNG UPDATE JIKA DATA MASUK
      await fetchSiswa(); 
    }
  } catch (err) {
    setStatus({ 
      type: 'error', 
      message: err.response?.data?.message || 'Gagal mengunggah data siswa.' 
    });
  } finally {
    setIsLoading(false);
  }
};

  // --- 3. FUNGSI EXPORT DATA KE EXCEL (GET BLOB DARI FLASK) ---
  const handleExportExcel = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get('http://localhost:5000/api/admin/export-siswa', {
        headers: { 
          'Authorization': `Bearer ${token}` 
        },
        responseType: 'blob' 
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Data_Siswa_SMAN1Kedunggalar.xlsx');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Gagal export excel:", err);
      alert("Gagal mengeksport data siswa. Pastikan endpoint di backend sudah aktif.");
    }
  };

  // --- LOGIK HANDLING CRUD MANUAL ---
  const openAddModal = () => {
    setIsEditing(false);
    setFormInput({ nisn: '', nama_siswa: '', kelas: '', no_hp_ortu: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (siswa) => {
    setIsEditing(true);
    setCurrentId(siswa.id);
    setFormInput({
      nisn: siswa.nisn || '', 
      nama_siswa: siswa.nama_siswa || siswa.nama_lengkap || siswa.nama || siswa.username || '', 
      kelas: siswa.kelas || '',
      no_hp_ortu: siswa.no_hp_orang_tua || siswa.no_hp_ortu || ''
    });
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormInput(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveData = async (e) => {
    e.preventDefault();
    if (!formInput.nisn || !formInput.nama_siswa || !formInput.kelas) {
      alert("Kolom NISN, Nama Lengkap, dan Kelas wajib diisi!");
      return;
    }

    const token = localStorage.getItem('token'); 
    if (!token) {
      alert("Sesi Anda berakhir, silakan login ulang sebagai admin.");
      return;
    }

    const configHeaders = {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    if (isEditing) {
      try {
        const payload = {
          nama_lengkap: formInput.nama_siswa,
          nisn: formInput.nisn,
          kelas: formInput.kelas,
          no_hp_orang_tua: formInput.no_hp_ortu 
        };
        const response = await axios.put(`http://localhost:5000/api/admin/ubah-siswa/${currentId}`, payload, configHeaders);
        if (response.data.status === 'success') {
          alert("Data siswa berhasil diperbarui.");
          setIsModalOpen(false);
          fetchSiswa();
        }
      } catch (err) {
        alert("Gagal memperbarui data: " + (err.response?.data?.message || err.message));
      }
    } else {
      try {
        const payload = {
          role: 'siswa', 
          nama_lengkap: formInput.nama_siswa,
          nisn: formInput.nisn, 
          kelas: formInput.kelas,
          nomor_hp_orang_tua: formInput.no_hp_ortu 
        };
        
        const response = await axios.post('http://localhost:5000/api/admin/tambah-user', payload, configHeaders);
        if (response.data.status === 'success') {
          alert(`Siswa berhasil didaftarkan!\nPassword Default: ${response.data.data_akun?.password_default || '12345'}`);
          setIsModalOpen(false);
          fetchSiswa(); 
        }
      } catch (err) {
        alert("Gagal mendaftarkan siswa: " + (err.response?.data?.message || err.message));
      }
    }
  };

  const handleDeleteSiswa = async (id) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus data siswa ini?")) {
      const token = localStorage.getItem('token');
      try {
        const response = await axios.delete(`http://localhost:5000/api/admin/hapus-siswa/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` } 
        });
        if (response.data.status === 'success') {
          alert("Data siswa berhasil dihapus dari sistem.");
          fetchSiswa(); 
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
        <h1 className="text-2xl font-black text-[#3e2723] uppercase">Manajemen Data Siswa</h1>
        <p className="text-gray-500 text-sm">Integrasikan file Excel atau kelola data profil siswa SMANIK secara langsung.</p>
      </div>

      {/* SECTION ATAS: IMPORT UTILITY */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* PANEL KIRI: UPLOAD BOX */}
        <div className="md:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-[#e8d2b8]/50 flex flex-col justify-between">
          <form onSubmit={handleUpload} className="space-y-5">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-6 text-center flex flex-col items-center justify-center cursor-pointer transition-all duration-200 min-h-[180px] ${
                isDragging ? 'border-[#E67E22] bg-[#f5e6d3]/30' : file ? 'border-[#3e2723] bg-gray-50' : 'border-gray-300 hover:border-[#E67E22] bg-gray-50/50'
              }`}
              onClick={() => document.getElementById('excel-file-siswa').click()}
            >
              <input id="excel-file-siswa" type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileChange} />
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
                  <p className="text-sm font-bold text-gray-700">Tarik & Jatuhkan file Excel Siswa di sini</p>
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
              {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Proses & Simpan Data Siswa via Excel"}
            </button>
          </form>
        </div>

        {/* PANEL KANAN: KETENTUAN (Kotak Template Sudah Dihilangkan) */}
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-xs text-gray-600">
            <h4 className="font-bold text-[#3e2723] uppercase mb-2">Ketentuan Format Excel:</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>Pastikan file memiliki ekstensi <span className="font-bold">.xlsx</span> atau <span className="font-bold">.xls</span></li>
              <li>Kolom <span className="font-bold">nisn</span> wajib diisi unik sebagai Username login siswa.</li>
              <li>Kolom <span className="font-bold">kelas</span> disesuaikan dengan daftar master kelas database.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* SECTION BAWAH: DATA TABLE CRUD DISPLAY */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-black text-[#3e2723]">Daftar Peserta Didik Aktif</h2>
            <p className="text-xs text-gray-400">Total terdata di database: {dataSiswa.length} siswa</p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 text-xs font-bold rounded-xl shadow-sm hover:bg-gray-50 transition"
            >
              <Download size={14} /> Unduh Data (Excel)
            </button>
            <button 
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#E67E22] hover:bg-[#d35400] text-white text-xs font-bold rounded-xl shadow-sm transition"
            >
              <Plus size={16} /> Tambah Siswa Manual
            </button>
          </div>
        </div>

        {/* TABEL DATA DISPLAY */}
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 font-bold text-xs uppercase tracking-wider border-b border-gray-100">
                <th className="p-4 w-12 text-center">No</th>
                <th className="p-4">NISN</th>
                <th className="p-4">Nama Lengkap</th>
                <th className="p-4">Kelas</th>
                <th className="p-4">No. HP Orang Tua</th>
                <th className="p-4 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
              {loadingTable ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-400 text-xs font-medium">Sedang mengambil data siswa dari server...</td>
                </tr>
              ) : dataSiswa.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-400 text-xs font-medium">Belum ada data siswa. Silakan import excel atau tambah manual.</td>
                </tr>
              ) : (
                dataSiswa.map((siswa, index) => (
                  <tr key={siswa.id || index} className="hover:bg-gray-50/70 transition">
                    <td className="p-4 text-center text-xs font-bold text-gray-400">{index + 1}</td>
                    <td className="p-4 font-mono text-xs font-semibold text-gray-600">{siswa.nisn || 'Tidak ada NISN'}</td>
                    {/* MENAMPILKAN NAMA: Memastikan nama lengkap terbaca dari properti database */}
                    <td className="p-4 font-bold text-[#3e2723]">
                      {siswa.nama_siswa || siswa.nama_lengkap || siswa.nama || siswa.username || 'Nama Tidak Terbaca'}
                    </td>
                    <td className="p-4 text-xs font-bold text-blue-600">{siswa.kelas || '-'}</td>
                    <td className="p-4 text-xs">{siswa.no_hp_orang_tua || siswa.no_hp_ortu || '-'}</td>
                    <td className="p-4 text-center flex items-center justify-center gap-2">
                      <button 
                        onClick={() => openEditModal(siswa)}
                        className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition" 
                        title="Edit Data"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeleteSiswa(siswa.id)}
                        className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition" 
                        title="Hapus Data"
                      >
                        <Trash2 size={14} />
                      </button>
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-[#3e2723] text-sm uppercase">
                {isEditing ? "📝 Edit Profil Siswa" : "✨ Tambah Siswa Baru"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveData} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">NISN Siswa (Username Login)</label>
                <input 
                  type="text" name="nisn" value={formInput.nisn} onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#E67E22]" placeholder="Contoh: 0064213..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nama Lengkap Siswa</label>
                <input 
                  type="text" name="nama_siswa" value={formInput.nama_siswa} onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#E67E22]" placeholder="Contoh: Muhammad Rafli"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Kelas</label>
                <input 
                  type="text" name="kelas" value={formInput.kelas} onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#E67E22]" placeholder="Contoh: XII-RPL 1"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">No. HP Wali / Orang Tua</label>
                <input 
                  type="text" name="no_hp_ortu" value={formInput.no_hp_ortu} onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#E67E22]" placeholder="Contoh: 085721..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100 mt-6">
                <button 
                  type="button" onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-500 text-xs font-bold rounded-xl hover:bg-gray-50 transition"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#3e2723] hover:bg-[#52332e] text-white text-xs font-bold rounded-xl shadow-sm transition"
                >
                  <Check size={14} /> Simpan Data Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportSiswa;