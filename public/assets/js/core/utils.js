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
    }
};

window.MONTHS_TH = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

window.MONTHS_TH_SHORT = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
