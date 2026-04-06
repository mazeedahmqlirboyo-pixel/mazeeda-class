import React, { useState, useEffect } from 'react';
import { X, Loader2, Calendar, LayoutGrid, ChevronLeft, Trash2, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';

export default function RekapanModal({ isOpen, onClose }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 'list' (daftar kotak Kelas) atau 'detail' (Tabel panjang per kelas)
  const [viewMode, setViewMode] = useState('list');
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setViewMode('list');
      setSelectedItem(null);
      fetchRekapan();
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const fetchRekapan = async () => {
    setLoading(true);
    try {
      const { data: rekapanData, error } = await supabase
        .from('hasil_tugas')
        .select('*')
        .order('bagian', { ascending: true }); // Pengurutan A-Z sesuai Request

      if (error) throw error;
      setData(rekapanData || []);
    } catch (err) {
      console.error('Error fetching rekapan:', err);
      alert('Gagal mengambil data rekapan dari server.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (data.length === 0) {
      alert('Tidak ada data untuk diekspor.');
      return;
    }

    // Ekspor format menurun (vertikal)
    const exportData = [];

    data.forEach(item => {
      const tanggal = item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : '-';

      const JABATAN_ORDER = [
        'ketua_kelas', 'wakil_ketua', 'rois_am', 'wakil_am', 'sekretaris', 'pengabsen',
        'bendahara_1', 'bendahara_2', 'keamanan_1', 'keamanan_2', 
        'kebersihan_1', 'kebersihan_2', 'perlengkapan_1', 'perlengkapan_2', 
        'katib_1', 'katib_2'
      ];

      JABATAN_ORDER.forEach(key => {
        // Selalu render baris excel, jika nama kosong biarkan blank
        exportData.push({
          'Bagian / Ruang': item.bagian,
          'Jabatan': key.replace(/_/g, ' ').toUpperCase(),
          'Nama Siswi': item[key] ? item[key] : '', 
          'Tanggal Input': tanggal
        });
      });
    });

    if (exportData.length === 0) {
      alert('Data terdaftar, tetapi tidak ada nama siswi yang terpilih.');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rekapan Penugasan");

    // Pelebaran Manual agar rapi
    worksheet['!cols'] = [
      { wch: 18 }, // Bagian
      { wch: 20 }, // Jabatan
      { wch: 35 }, // Nama Siswi
      { wch: 15 }  // Tanggal
    ];

    XLSX.writeFile(workbook, "Rekapan_Penugasan_Siswi.xlsx");
  };

  const handleDelete = async (id, bagianName) => {
    if (!window.confirm(`Yakin Hapus Rekapan Ini?\nSemua penugasan untuk bagian ${bagianName} akan dihapus permanen.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('hasil_tugas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Update UI balik ke menu utama
      setData(prev => prev.filter(item => item.id !== id));
      setViewMode('list');
      setSelectedItem(null);
    } catch (err) {
      console.error('Error deleting:', err);
      alert('Gagal menghapus data dari database. Pastikan RLS Policy Supabase mengizinkan Delete operation.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-gray-50 flex flex-col animate-in fade-in zoom-in-95 duration-200">
      
      {/* HEADER UTAMA */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 shadow-sm bg-white shrink-0 border-b border-gray-200">
        <div className="flex items-center">
          {viewMode === 'detail' ? (
            <button 
              onClick={() => { setViewMode('list'); setSelectedItem(null); }}
              className="mr-3 p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors flex items-center shadow-sm border border-gray-100 bg-white"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          ) : (
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl mr-3">
              <LayoutGrid className="w-6 h-6" />
            </div>
          )}
          <h2 className="text-xl font-bold text-gray-800 line-clamp-1">
            {viewMode === 'detail' ? `Meninjau Detail` : 'Rekapan Penugasan'}
          </h2>
        </div>

        <div className="flex items-center space-x-2">
          {viewMode === 'list' && data.length > 0 && (
            <button 
              onClick={handleExportExcel}
              className="flex items-center px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl shadow-md transition-all font-bold text-sm mr-1 active:scale-95"
            >
              <Download className="w-5 h-5 sm:mr-2" />
              <span className="hidden sm:inline">Export Excel (.xlsx)</span>
            </button>
          )}
          <button 
            onClick={onClose}
            className="p-2.5 text-gray-400 bg-gray-100 hover:text-red-500 hover:bg-red-50 font-bold rounded-xl transition-colors"
            title="Keluar (Tutup)"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* KONTEN UTAMA */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 overscroll-contain bg-gray-50 relative">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
            <p className="text-gray-500 font-medium">Memuat rekap data...</p>
          </div>
        ) : (
          <>
            {/* TAMPILAN KOTAK-KOTAK BAGIAN (START SCREEN MENU) */}
            {viewMode === 'list' && (
              <div className="max-w-5xl mx-auto pb-12">
                {data.length === 0 ? (
                  <div className="text-center py-24 px-4">
                    <div className="w-20 h-20 bg-emerald-50 text-emerald-300 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                      <LayoutGrid className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">Belum Tersedia</h3>
                    <p className="text-gray-500 max-w-sm mx-auto">
                      Anda belum memproses penugasan apapun di form depan.
                    </p>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-lg font-bold text-gray-700 mb-6 flex items-center border-b border-gray-200 pb-3">
                      Daftar Bagian Kelas Terisi
                      <div className="ml-3 px-3 py-1 bg-gray-800 text-gray-50 text-sm rounded-lg shadow">
                        {data.length} Total
                      </div>
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                      {data.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => { setSelectedItem(item); setViewMode('detail'); }}
                          className="flex flex-col items-center justify-center px-4 py-8 bg-white border border-gray-200 hover:border-emerald-300 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1.5 transition-all duration-200 active:scale-95 group relative overflow-hidden"
                        >
                          <div className="absolute top-0 w-full h-1.5 bg-gradient-to-r from-emerald-400 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          <span className="text-4xl font-black text-gray-700 group-hover:text-emerald-600 transition-colors uppercase tracking-widest line-clamp-1 mb-2">
                            {item.bagian?.substring(0, 4)}
                          </span>
                          <span className="font-semibold text-gray-500 group-hover:text-emerald-500 text-center w-full truncate px-2 text-xs uppercase tracking-wider">
                            {item.bagian}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAMPILAN TABEL MENURUN (DETAIL VIEW) */}
            {viewMode === 'detail' && selectedItem && (
               <div className="max-w-4xl mx-auto pb-12 pt-2 animate-in slide-in-from-bottom-8 fade-in duration-300">
                 <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden relative">
                   
                   {/* Header Spesifik Detail */}
                   <div className="px-6 py-8 sm:px-10 bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
                     <div className="absolute -right-4 -bottom-10 opacity-10 blur-[2px]">
                       <LayoutGrid className="w-48 h-48" />
                     </div>
                     <div className="relative z-10">
                       <span className="text-emerald-100 text-xs font-bold uppercase tracking-[0.2em] block mb-2">
                         Data Jabatan Terekam
                       </span>
                       <span className="text-4xl font-black">{selectedItem.bagian}</span>
                     </div>
                     <div className="flex items-center space-x-3 relative z-10">
                        <span className="flex items-center text-emerald-50 font-medium text-sm bg-black/20 px-4 py-2 rounded-xl backdrop-blur-sm shadow-inner border border-white/10">
                          <Calendar className="w-4 h-4 mr-2" />
                          {new Date(selectedItem.created_at).toLocaleDateString('id-ID', {
                            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                          })}
                        </span>
                     </div>
                   </div>

                   {/* Badan Tabel Detail Lengkap */}
                   <div className="p-0 sm:p-2 bg-gray-50/50">
                     <table className="w-full text-left bg-transparent">
                       <tbody className="divide-y divide-gray-100/50">
                         {Object.entries(selectedItem)
                           .filter(([key, val]) => !['id', 'created_at', 'bagian'].includes(key) && val) // filter membuang yang kosong
                           .map(([jabatan, nama]) => (
                             <tr key={jabatan} className="hover:bg-white transition-colors group">
                               <td className="px-6 sm:px-10 py-5 font-bold text-gray-500 text-xs tracking-widest uppercase w-2/5 sm:w-1/3 border-r border-gray-100 group-hover:text-emerald-600 transition-colors">
                                 {jabatan.replace(/_/g, ' ')}
                               </td>
                               <td className="px-6 sm:px-10 py-5 text-gray-900 font-bold text-base sm:text-xl">
                                 {nama}
                               </td>
                             </tr>
                         ))}
                         
                         {/* Fallback Jika tidak ada data tersimpan */}
                         {Object.entries(selectedItem).filter(([key, val]) => !['id', 'created_at', 'bagian'].includes(key) && val).length === 0 && (
                           <tr>
                             <td colSpan="2" className="px-6 py-16 text-center text-gray-400 italic font-medium bg-white">
                               ( Bagian ini sudah digenerate namun struktur jabatan tidak memiliki nama terpilih )
                             </td>
                           </tr>
                         )}
                       </tbody>
                     </table>
                   </div>

                   {/* Footer Detail Area Hapus */}
                   <div className="p-6 sm:p-8 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                     <p className="text-sm font-medium text-gray-400 flex-1">
                       Gunakan tombol hapus jika sewaktu-waktu data terdapat kesalahan ketik yang fatal dan perlu diinput ulang.
                     </p>
                     <button
                       onClick={() => handleDelete(selectedItem.id, selectedItem.bagian)}
                       disabled={isDeleting}
                       className="w-full sm:w-auto flex justify-center items-center px-6 py-3.5 bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white hover:border-red-600 font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                     >
                       {isDeleting ? (
                         <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                       ) : (
                         <Trash2 className="w-5 h-5 mr-3" />
                       )}
                       {isDeleting ? 'Menghapus Permanen...' : 'Hapus Rekapan Ini'}
                     </button>
                   </div>
                 </div>
               </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
