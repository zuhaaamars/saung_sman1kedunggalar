import React, { useState, useRef } from 'react';
import { Html5Qrcode } from "html5-qrcode";
import axios from 'axios';
import {
  Camera,
  CheckCircle2,
  Loader2,
  XCircle,
  QrCode,
  Scan,
  CornerUpLeft,
  FileText,
  AlertCircle
} from 'lucide-react';

const PresensiMapelSiswa = () => {
  // =========================
  // STATE MANAGEMENT
  // =========================
  const [isScanning, setIsScanning] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const scannerRef = useRef(null);

  // State Baru untuk Form Izin / Sakit manual
  const [showFormManual, setShowFormManual] = useState(false);
  const [statusManual, setStatusManual] = useState('Sakit'); // 'Sakit' atau 'Izin'
  const [keterangan, setKeterangan] = useState('');

  // =========================
  // START SCANNER
  // =========================
  const handleStartScan = async () => {
    setShowScanner(true);
    setIsScanning(true);
    setErrorMessage('');
    setShowFormManual(false);

    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 15,
            qrbox: { width: 260, height: 260 }
          },
          async (decodedText) => {
            await stopScanner();
            handleSuccessFlow(decodedText, 'Hadir', '');
          }
        );
      } catch (err) {
        console.error("Akses kamera gagal:", err);
        setErrorMessage("Gagal membuka akses kamera perangkat.");
        setIsScanning(false);
        setShowScanner(false);
      }
    }, 300);
  };

  const stopScanner = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
        scannerRef.current = null;
      }
    } catch (err) {
      console.log("Scanner dihentikan:", err);
    }
    setIsScanning(false);
    setShowScanner(false);
  };

  const handleSuccessFlow = async (qrToken, statusKehadiran = 'Hadir', alasanKeterangan = '') => {
    setIsProcessing(true);
    try {
      // 💡 FIX AUTH: Bersihkan token string browser dari pembungkus tanda kutip ganda
      const token = localStorage.getItem('token')?.replace(/^"+|"+$/g, '');
      const userRaw = localStorage.getItem('user');
      
      if (!userRaw) {
        setScanResult({ success: false, message: "Sesi habis, silakan login ulang." });
        return;
      }

      const userData = JSON.parse(userRaw);
      const siswaId = userData.id_siswa || userData.id;
      const kelasId = userData.id_kelas || userData.kelas_id || null;
      const jadwalId = userData.id_jadwal || userData.jadwal_id || null;

      // 💡 FIX URL PATH & HEADERS: Menyesuaikan rumpun blueprint /api/presensi/mapel/scan
      const response = await axios.post('http://localhost:5000/api/presensi/mapel/scan', {
        qr_token: qrToken || 'MANUAL_SUBMIT',
        id_siswa: parseInt(siswaId, 10),
        id_kelas: kelasId ? parseInt(kelasId, 10) : null,
        id_jadwal: jadwalId ? parseInt(jadwalId, 10) : null,
        status_kehadiran: statusKehadiran,
        keterangan: alasanKeterangan
      }, {
        headers: { Authorization: `Bearer ${token}` } // Kirim token verifikasi JWT siswa
      });

      if (response.data.status === "success") {
        setScanResult({
          success: true,
          message: response.data.message
        });
        setShowFormManual(false);
      }
    } catch (err) {
      console.error(err);
      setScanResult({
        success: false,
        message: err.response?.data?.message || "Gagal memproses presensi."
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler Kirim Form Sakit / Izin Tanpa Scan
  const handleSubmitManual = (e) => {
    e.preventDefault();
    if (!keterangan.trim()) {
      alert("Harap isi alasan keterangan dengan jelas!");
      return;
    }
    handleSuccessFlow(null, statusManual, keterangan);
  };

  const resetScan = () => {
    setScanResult(null);
    setErrorMessage('');
    setKeterangan('');
    setShowFormManual(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex items-center justify-center font-sans">
      <div className="w-full max-w-md mx-auto">
        
        {/* HEADER */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Presensi Kelas & Mapel</h1>
          <p className="text-slate-500 text-xs mt-1">Scan QR Code Guru atau ajukan keterangan berhalangan hadir</p>
        </div>

        {/* CONTAINER CARD */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 relative overflow-hidden">
          
          {/* SCREEN MODAL VIEWPORT UNTUK SCANNER */}
          {showScanner && (
            <div className="fixed inset-0 bg-slate-950/95 z-[9999] flex flex-col items-center justify-center p-4">
              <div className="relative w-full max-w-sm aspect-square bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
                <div id="reader" className="w-full h-full"></div>
                <div className="absolute inset-0 border-[30px] border-slate-950/40 pointer-events-none flex items-center justify-center">
                  <div className="w-full h-full border-2 border-dashed border-indigo-400 opacity-70 animate-pulse"></div>
                </div>
              </div>
              <p className="text-slate-300 text-xs font-medium mt-6 flex items-center gap-2">
                <Scan size={14} className="animate-spin text-indigo-400" />
                Posisikan QR tepat di dalam kotak kamera
              </p>
              <button
                onClick={stopScanner}
                className="mt-8 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all border border-white/10"
              >
                Batalkan Pemindaian
              </button>
            </div>
          )}

          {/* LOADING VERIFIKASI */}
          {isProcessing && (
            <div className="flex flex-col items-center py-10">
              <div className="relative flex items-center justify-center">
                <Loader2 size={56} className="animate-spin text-indigo-600" />
                <QrCode size={24} className="absolute text-indigo-400" />
              </div>
              <h3 className="text-slate-900 font-bold text-sm mt-4">Memproses Data...</h3>
              <p className="text-slate-400 text-[11px] mt-0.5">Menyimpan status kehadiran Anda ke sistem kelas</p>
            </div>
          )}

          {/* INTERFACES HASIL RESPON BACKEND */}
          {scanResult && !isProcessing && (
            <div className="flex flex-col items-center text-center py-2">
              {scanResult.success ? (
                <div className="bg-emerald-50 p-3.5 rounded-full text-emerald-600 mb-3">
                  <CheckCircle2 size={52} />
                </div>
              ) : (
                <div className="bg-rose-50 p-3.5 rounded-full text-rose-600 mb-3">
                  <XCircle size={52} />
                </div>
              )}

              <h2 className="text-xl font-black text-slate-900">
                {scanResult.success ? 'Berhasil Terkirim!' : 'Proses Gagal'}
              </h2>
              <p className="mt-1.5 text-xs text-slate-500 max-w-xs leading-relaxed">
                {scanResult.message}
              </p>

              <button
                onClick={resetScan}
                className="mt-6 w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-3.5 rounded-xl transition-all"
              >
                <CornerUpLeft size={14} />
                Kembali ke Beranda
              </button>
            </div>
          )}

          {/* PESAN JIKA TERJADI ERROR AKSES KAMERA */}
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-100 text-rose-600 p-3 rounded-xl mb-4 text-xs font-semibold text-center">
              {errorMessage}
            </div>
          )}

          {/* DASHBOARD UTAMA (TRIGGER SCAN) */}
          {!showScanner && !scanResult && !isProcessing && !showFormManual && (
            <div className="flex flex-col items-center py-4">
              <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 border border-indigo-100 shadow-2xs">
                <QrCode size={36} />
              </div>
              <p className="text-slate-500 text-xs text-center max-w-xs leading-relaxed">
                Silahkan lakukan scan kode QR guru di depan kelas untuk mengisi kehadiran otomatis (**Hadir**).
              </p>

              <button
                onClick={handleStartScan}
                className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-2"
              >
                <Camera size={16} />
                Aktifkan Scanner QR
              </button>

              {/* PEMBATAS SEPARATOR */}
              <div className="relative flex py-5 items-center w-full">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-4 text-slate-400 text-[10px] font-bold uppercase tracking-wider">Atau Berhalangan?</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              {/* TOMBOL UNTUK MEMBUKA FORM BERHALANGAN MASUK (SAKIT / IZIN) */}
              <button
                onClick={() => setShowFormManual(true)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <FileText size={15} />
                Ajukan Sakit / Izin Kelas
              </button>
            </div>
          )}

          {/* =====================================
              FORM SUBMIT MANUAL (SAKIT / IZIN)
          ===================================== */}
          {showFormManual && !isProcessing && !scanResult && (
            <form onSubmit={handleSubmitManual} className="space-y-4 py-2 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 bg-amber-50 text-amber-700 border border-amber-100 p-3 rounded-xl text-[11px] font-medium mb-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>Pengajuan ini akan diverifikasi langsung oleh Guru pengajar kelas hari ini.</span>
              </div>

              {/* MULTI-STATE TOGGLE SELECTION */}
              <div>
                <label className="block text-slate-500 font-bold text-[10px] uppercase tracking-wider mb-2">Pilih Status Halangan</label>
                <div className="relative flex bg-slate-100 p-1 rounded-xl border border-slate-200/60 w-full h-[42px] justify-between items-center">
                  {/* Sliding Effect Background */}
                  <div 
                    className={`absolute top-1 bottom-1 rounded-lg transition-all duration-200 shadow-xs w-[48%] ${
                      statusManual === 'Sakit' ? 'left-1 bg-amber-500' : 'left-[51%] bg-blue-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setStatusManual('Sakit')}
                    className={`relative z-10 w-1/2 text-center text-xs font-black uppercase tracking-wide transition-colors ${
                      statusManual === 'Sakit' ? 'text-white' : 'text-slate-400'
                    }`}
                  >
                    🤒 Sakit
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusManual('Izin')}
                    className={`relative z-10 w-1/2 text-center text-xs font-black uppercase tracking-wide transition-colors ${
                      statusManual === 'Izin' ? 'text-white' : 'text-slate-400'
                    }`}
                  >
                    ✉️ Izin
                  </button>
                </div>
              </div>

              {/* INPUT ALASAN */}
              <div>
                <label className="block text-slate-500 font-bold text-[10px] uppercase tracking-wider mb-1.5">Tulis Keterangan Alasan</label>
                <textarea
                  rows="3"
                  required
                  placeholder="Contoh: Demam tinggi sejak semalam / Keperluan keluarga di luar kota..."
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                ></textarea>
              </div>

              {/* CONTROLS BUTTON */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFormManual(false)}
                  className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold py-3 rounded-xl transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-2/3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider py-3 rounded-xl transition-all shadow-xs"
                >
                  Kirim Pengajuan
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default PresensiMapelSiswa;