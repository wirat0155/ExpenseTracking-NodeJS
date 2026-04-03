/**
 * utils.js — Shared utility functions
 */

window.Utils = {
    // Format number to THB currency
    fmt: (n) => {
        return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(n);
    },

    // Format number to compact THB (e.g. ฿1.2k)
    fmtShort: (n) => {
        if (n >= 1000) return '฿' + (n / 1000).toFixed(1) + 'k';
        return '฿' + n.toFixed(0);
    },

    // Format ISO date to Thai short date
    formatDate: (dateStr) => {
        return new Date(dateStr).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
    },

    // Escape HTML to prevent XSS
    escapeHtml: (str) => {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    // Show Success Alert (SweetAlert2)
    success: (msg) => {
        return Swal.fire({
            icon: 'success',
            title: 'สำเร็จ',
            text: msg,
            timer: 2000,
            showConfirmButton: false,
            timerProgressBar: true,
            confirmButtonColor: '#2563eb'
        });
    },

    // Show Error Alert (SweetAlert2)
    error: (msg) => {
        return Swal.fire({
            icon: 'error',
            title: 'ผิดพลาด',
            text: msg,
            confirmButtonColor: '#ef4444'
        });
    },

    // Show Confirmation Dialog (SweetAlert2)
    confirm: (msg, confirmText = 'ตกลง', cancelText = 'ยกเลิก') => {
        return Swal.fire({
            title: 'ยืนยันการดำเนินการ',
            text: msg,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#2563eb',
            cancelButtonColor: '#94a3b8',
            confirmButtonText: confirmText,
            cancelButtonText: cancelText,
            reverseButtons: true
        });
    },

    // Show toast notification
    showToast: (msg, isError = false) => {
        const t = document.getElementById('toast');
        if (!t) return;
        t.innerText = msg;
        t.classList.remove('bg-emerald-600', 'bg-red-600', 'bg-blue-600');
        t.classList.add(isError ? 'bg-red-600' : 'bg-emerald-600');
        t.classList.remove('translate-y-20', 'opacity-0');
        setTimeout(() => t.classList.add('translate-y-20', 'opacity-0'), 3000);
    },

    // Setup Autocomplete for Title input
    setupTitleAutocomplete: (titleSelector, amountSelector, categorySelector, categoryIdSelector) => {
        const titleInput = document.querySelector(titleSelector);
        if (!titleInput) return;

        // Create a wrapper for relative positioning if not exists
        if (titleInput.parentElement.style.position !== 'relative') {
            titleInput.parentElement.style.position = 'relative';
        }

        let suggestionBox = titleInput.parentElement.querySelector('.autocomplete-box');
        if (!suggestionBox) {
            suggestionBox = document.createElement('div');
            suggestionBox.className = 'autocomplete-box absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg z-50 hidden overflow-hidden';
            titleInput.parentElement.appendChild(suggestionBox);
        }

        let debounceTimer;
        let currentSuggestions = [];
        let highlightedIndex = -1;

        const closeBox = () => {
            suggestionBox.classList.add('hidden');
            highlightedIndex = -1;
        };

        const renderSuggestions = () => {
            if (currentSuggestions.length === 0) {
                closeBox();
                return;
            }
            suggestionBox.innerHTML = currentSuggestions.map((item, i) => `
                <div class="px-3 py-2 cursor-pointer hover:bg-blue-50 text-sm flex justify-between items-center transition-colors ${i === highlightedIndex ? 'bg-blue-50' : ''}" data-idx="${i}">
                    <span class="font-medium text-slate-700">${window.Utils.escapeHtml(item.Title)}</span>
                    <span class="text-xs font-bold text-blue-600">${window.Utils.fmtShort(item.Amount)}</span>
                </div>
            `).join('');
            suggestionBox.classList.remove('hidden');

            suggestionBox.querySelectorAll('div').forEach(div => {
                div.addEventListener('click', (e) => {
                    e.preventDefault();
                    selectSuggestion(parseInt(div.getAttribute('data-idx')));
                });
            });
        };

        const selectSuggestion = (index) => {
            if (index < 0 || index >= currentSuggestions.length) return;
            const item = currentSuggestions[index];
            
            titleInput.value = item.Title;
            
            const amountInput = document.querySelector(amountSelector);
            if (amountInput) {
                amountInput.value = item.Amount;
                // Dispatch input event for any dependent UI like split preview
                amountInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
            
            const categoryInput = document.querySelector(categorySelector);
            const categoryIdInput = document.querySelector(categoryIdSelector);
            if (categoryInput && item.Category) {
                categoryInput.value = item.Category;
                if (categoryIdInput) categoryIdInput.value = item.CategoryId || '';
            }
            
            titleInput.focus();
            closeBox();
        };

        titleInput.addEventListener('input', (e) => {
            const val = e.target.value.trim();
            clearTimeout(debounceTimer);
            if (val.length < 3) {
                closeBox();
                return;
            }

            debounceTimer = setTimeout(async () => {
                try {
                    const results = await window.API.getExpenseSuggestions(val);
                    currentSuggestions = results;
                    highlightedIndex = -1;
                    renderSuggestions();
                } catch (err) {
                    console.error('Autocomplete fetch error:', err);
                }
            }, 300);
        });

        titleInput.addEventListener('keydown', (e) => {
            if (suggestionBox.classList.contains('hidden')) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                highlightedIndex = (highlightedIndex + 1) % currentSuggestions.length;
                renderSuggestions();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                highlightedIndex = highlightedIndex <= 0 ? currentSuggestions.length - 1 : highlightedIndex - 1;
                renderSuggestions();
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                if (currentSuggestions.length > 0) {
                    e.preventDefault();
                    selectSuggestion(highlightedIndex >= 0 ? highlightedIndex : 0);
                }
            } else if (e.key === 'Escape') {
                closeBox();
            }
        });

        document.addEventListener('click', (e) => {
            if (!titleInput.contains(e.target) && !suggestionBox.contains(e.target)) {
                closeBox();
            }
        });
    }
};

window.MONTHS_TH = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

window.MONTHS_TH_SHORT = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
