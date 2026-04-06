import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

export default function SearchableSelect({ options, value, onChange, placeholder, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt =>
    (opt.label || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full min-h-[48px] px-4 py-3 bg-white border rounded-xl shadow-sm text-base cursor-pointer select-none transition-colors ${
          disabled ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200'
        }`}
      >
        <span className={`${selectedOption ? 'text-gray-900 font-medium' : 'text-gray-500'} line-clamp-1`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        {value && !disabled ? (
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
              setSearchTerm('');
            }}
            className="p-1.5 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5 text-gray-400 hover:text-red-500" />
          </button>
        ) : (
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          <div className="flex items-center px-4 py-3 border-b border-gray-100 bg-gray-50/50">
            <Search className="w-5 h-5 text-gray-400 mr-2 shrink-0" />
            <input
              type="text"
              className="w-full text-base bg-transparent outline-none placeholder-gray-400"
              placeholder="Cari nama siswi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <ul className="max-h-60 overflow-y-auto overscroll-contain">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <li
                  key={opt.value}
                  className={`px-4 py-3 min-h-[48px] text-base transition-colors flex items-center border-b border-gray-50 last:border-0 ${
                    opt.isDisabled 
                      ? (opt.isPPKPMK ? 'text-red-600 font-semibold cursor-not-allowed bg-red-50/50' 
                        : (opt.isSelectedElsewhere ? 'text-orange-500 font-semibold cursor-not-allowed bg-orange-50/30' 
                          : 'text-gray-300 cursor-not-allowed'))
                      : value === opt.value 
                        ? 'bg-blue-50 text-blue-700 font-medium cursor-pointer' 
                        : 'hover:bg-gray-100 text-gray-700 cursor-pointer'
                  }`}
                  onClick={(e) => {
                    if (!opt.isDisabled) {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearchTerm('');
                    } else {
                      e.preventDefault();
                    }
                  }}
                >
                  {opt.label}
                </li>
              ))
            ) : (
              <li className="px-4 py-4 min-h-[48px] text-base text-gray-500 text-center flex items-center justify-center">
                Nama tidak ditemukan
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
