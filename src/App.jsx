import React, { useState, useEffect } from 'react';
import { Loader2, Users, Save, CheckCircle2, AlertCircle, LayoutGrid } from 'lucide-react';
import { supabase } from './lib/supabase';
import SearchableSelect from './components/SearchableSelect';
import RekapanModal from './components/RekapanModal';

const JABATAN_LIST = [
  { id: 'ketua_kelas', label: 'Ketua Kelas' },
  { id: 'wakil_ketua', label: 'Wakil Ketua' },
  { id: 'rois_am', label: 'Ro’is ‘Am' },
  { id: 'wakil_am', label: 'Wakil ‘Am' },
  { id: 'sekretaris', label: 'Sekretaris' },
  { id: 'pengabsen', label: 'Pengabsen' },
  { id: 'bendahara_1', label: 'Bendahara I' },
  { id: 'bendahara_2', label: 'Bendahara II' },
  { id: 'keamanan_1', label: 'Keamanan I' },
  { id: 'keamanan_2', label: 'Keamanan II' },
  { id: 'kebersihan_1', label: 'Kebersihan I' },
  { id: 'kebersihan_2', label: 'Kebersihan II' },
  { id: 'perlengkapan_1', label: 'Perlengkapan I' },
  { id: 'perlengkapan_2', label: 'Perlengkapan II' },
  { id: 'katib_1', label: 'Katib I' },
  { id: 'katib_2', label: 'Katib II' }
];

function App() {
  const [bagianList, setBagianList] = useState([]);
  const [selectedBagian, setSelectedBagian] = useState('');
  const [siswiList, setSiswiList] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingSiswi, setLoadingSiswi] = useState(false);
  
  const [formValues, setFormValues] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);
  
  const [isRekapanOpen, setIsRekapanOpen] = useState(false);

  useEffect(() => {
    fetchBagianList();
  }, []);

  useEffect(() => {
    if (selectedBagian) {
      fetchSiswiByBagian(selectedBagian);
      // Reset form when bagian changes
      setFormValues({});
    } else {
      setSiswiList([]);
      setFormValues({});
    }
  }, [selectedBagian]);

  const fetchBagianList = async () => {
    try {
      // Optimasi: Gunakan rpc atau cukup select distinct jika jumlah data mendukung. 
      // Supabase tidak native support DISTINCT tanpa RPC, 
      // jadi kita tarik lalu filter di client (asumsi datanya tak lebih dari max row).
      const { data, error } = await supabase
        .from('siswi')
        .select('bagian');
        
      if (error) throw error;
      
      const uniqueBagian = [...new Set(data.map(item => item.bagian).filter(Boolean))].sort();
      setBagianList(uniqueBagian.map(b => ({ label: b, value: b })));
    } catch (err) {
      console.error('Error fetching bagian:', err);
      // Fallback pesan error tanpa blokir full render
    } finally {
      setLoadingData(false);
    }
  };

  const fetchSiswiByBagian = async (bagian) => {
    setLoadingSiswi(true);
    try {
      const { data, error } = await supabase
        .from('siswi')
        .select('nama_siswi, status')
        .eq('bagian', bagian)
        .order('nama_siswi');
        
      if (error) throw error;
      setSiswiList(data.map(item => ({ 
        label: item.nama_siswi, 
        value: item.nama_siswi,
        status: item.status
      })));
    } catch (err) {
      console.error('Error fetching siswi:', err);
    } finally {
      setLoadingSiswi(false);
    }
  };

  const handleJabatanChange = (id, value) => {
    setFormValues(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handleSubmit = async () => {
    if (!selectedBagian) {
      showNotification('error', 'Silakan pilih Bagian terlebih dahulu.');
      return;
    }
    
    // Validasi basic
    const hasAnyValue = Object.values(formValues).some(v => !!v);
    if (!hasAnyValue) {
      showNotification('error', 'Belum ada jabatan yang diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        bagian: selectedBagian,
        ...formValues,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('hasil_tugas')
        .insert([payload]);

      if (error) {
        // Cek error tabel tidak ada
        if (error.code === '42P01') {
          throw new Error('Tabel hasil_tugas belum dibuat di Supabase!');
        }
        throw error;
      }

      showNotification('success', 'Data penugasan berhasil disimpan!');
      setFormValues({}); // Reset form
      setSelectedBagian(''); // Reset bagian
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Submit error:', err);
      showNotification('error', err.message || 'Gagal menyimpan data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const getOptionsForJabatan = (jabatanId) => {
    // Ambil daftar nama siswi yang sudah terpilih di JABATAN LAIN
    const selectedInOtherRoles = Object.entries(formValues)
      .filter(([key, val]) => key !== jabatanId && val)
      .map(([, val]) => val);
      
    return siswiList
      // ANTI-GANDA: Jangan filter keluar, biarkan semua tampil, tapi ganti label & disabled!
      .map(siswi => {
        const isPPKPMK = siswi.status === 'PPK' || siswi.status === 'PMK';
        const isSelectedElsewhere = selectedInOtherRoles.includes(siswi.value);
        
        let label = siswi.label;
        if (isPPKPMK) {
          label = `${siswi.label} (${siswi.status})`;
        } else if (isSelectedElsewhere) {
          label = `${siswi.label} (Terpilih)`;
        }

        return {
          ...siswi,
          label,
          isDisabled: isPPKPMK || isSelectedElsewhere,
          isPPKPMK: isPPKPMK,
          isSelectedElsewhere: !isPPKPMK && isSelectedElsewhere
        };
      });
  };

  if (loadingData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Menyiapkan Aplikasi...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28 sm:pb-32 font-sans selection:bg-emerald-200">
      
      {/* Header Notification */}
      {notification && (
        <div className={`fixed top-4 left-4 right-4 z-50 p-4 rounded-xl shadow-lg border flex items-center animate-in slide-in-from-top-4 sm:max-w-md sm:left-1/2 sm:-translate-x-1/2 ${
          notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-6 h-6 mr-3 shrink-0" /> : <AlertCircle className="w-6 h-6 mr-3 shrink-0" />}
          <p className="font-medium text-sm">{notification.message}</p>
        </div>
      )}

      {/* Main Form Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 pb-12">
        
        {/* Header Title */}
        <div className="mb-10 text-center space-y-3">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl mx-auto flex items-center justify-center shadow-inner">
            <Users className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Penugasan Siswi</h1>
          <p className="text-gray-500 max-w-sm mx-auto">Atur pembagian jabatan kelas dengan mudah dan cepat.</p>
        </div>

        {/* Filter Bagian (Sangat Mencolok - Fokus Utama) */}
        <section className="bg-white p-6 rounded-3xl shadow-sm border border-emerald-100 mb-8 relative">
          <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500 rounded-l-3xl"></div>
          <label className="block text-emerald-800 font-bold mb-3 text-lg">Pilih Bagian / Ruang</label>
          <div className="relative">
            {bagianList.length > 0 ? (
              <SearchableSelect
                options={bagianList}
                value={selectedBagian}
                onChange={setSelectedBagian}
                placeholder="Ketuk untuk memilih bagian..."
              />
            ) : (
              <div className="p-4 bg-orange-50 border border-orange-200 text-orange-700 rounded-xl text-sm flex items-start">
                <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
                <p>Tidak ada data "bagian" di tabel siswi. Pastikan tabel siswi sudah terisi.</p>
              </div>
            )}
          </div>
        </section>

        {/* Form List Jabatan */}
        {selectedBagian && (
          <section className="bg-white p-6 sm:p-8 rounded-3xl shadow-lg border border-gray-100 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h2 className="text-xl font-bold text-gray-800">Assign Jabatan</h2>
              {loadingSiswi && (
                <div className="flex items-center text-emerald-500 text-sm font-medium px-3 py-1 bg-emerald-50 rounded-full">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Updating...
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-7">
              {JABATAN_LIST.map((jabatan) => (
                <div key={jabatan.id} className="group">
                  <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide group-hover:text-emerald-600 transition-colors">
                    {jabatan.label}
                  </label>
                  <SearchableSelect
                    options={getOptionsForJabatan(jabatan.id)}
                    value={formValues[jabatan.id] || ''}
                    onChange={(val) => handleJabatanChange(jabatan.id, val)}
                    placeholder="Pilih siswi..."
                    disabled={loadingSiswi}
                  />
                </div>
              ))}
            </div>

            {/* Submit Button Area */}
            <div className="pt-8 border-t border-gray-100 mt-8">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || loadingSiswi}
                className="w-full flex items-center justify-center min-h-[56px] bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-[0.98] text-white text-lg font-bold rounded-2xl shadow-emerald-500/30 shadow-lg border border-emerald-400 transition-all disabled:opacity-70 disabled:pointer-events-none"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="w-6 h-6 mr-2" />
                    Kirim Penugasan
                  </>
                )}
              </button>
            </div>
          </section>
        )}
      </main>

      {/* Floating Bottom Nav for "Rekapan" */}
      <div className="fixed bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent flex justify-center pointer-events-none">
        <button
          onClick={() => setIsRekapanOpen(true)}
          className="pointer-events-auto flex items-center justify-center w-full max-w-md h-16 bg-gray-900 hover:bg-black text-white rounded-2xl shadow-xl shadow-gray-900/20 font-bold text-lg border border-gray-700 active:scale-95 transition-all"
        >
          <LayoutGrid className="w-6 h-6 mr-3 text-emerald-400" />
          Lihat Rekapan Tugas
        </button>
      </div>

      {/* Rekapan Modal */}
      <RekapanModal isOpen={isRekapanOpen} onClose={() => setIsRekapanOpen(false)} />
    </div>
  );
}

export default App;
