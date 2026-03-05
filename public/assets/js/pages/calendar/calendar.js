/**
 * calendar.js — Logic for calendar.html
 */

(function () {
    const { fmt, fmtShort, escapeHtml, showToast, confirm: swalConfirm, success, error } = window.Utils;
    const { getCalendarData, addExpense, deleteExpense: apiDeleteExpense, getCategories } = window.API;

    let currentYear = new Date().getFullYear();
    let currentMonth = new Date().getMonth() + 1;
    let calendarData = {};  // { 'YYYY-MM-DD': { total, items[] } }
    let openDay = null;

    let enableSplit, splitMonthsContainer, splitPreview, previewList, expenseForm;

    // Load categories into dropdown (datalist for search)
    async function loadCategories() {
        try {
            const categories = await getCategories();
            // Sort alphabetically
            categories.sort((a, b) => a.Name.localeCompare(b.Name, 'th'));
            // Store full category objects for lookup
            window.CATEGORIES_DATA = categories;
            
            const dataList = document.getElementById('categoryDatalist');
            if (dataList) {
                dataList.innerHTML = '';
                categories.forEach(cat => {
                    const opt = document.createElement('option');
                    opt.value = cat.Name;
                    dataList.appendChild(opt);
                });
            }
        } catch (err) {
            console.error('Failed to load categories:', err);
        }
    }

    window.openAddModal = (dateStr = null) => {
        const modal = document.getElementById('addModal');
        const content = document.getElementById('modalContent');
        const dateInput = document.getElementById('expenseDate');

        if (dateStr) {
            dateInput.value = dateStr;
            dateInput.readOnly = true;
            dateInput.classList.add('bg-slate-100', 'cursor-not-allowed', 'text-slate-500');
        } else {
            dateInput.valueAsDate = new Date();
            dateInput.readOnly = false;
            dateInput.classList.remove('bg-slate-100', 'cursor-not-allowed', 'text-slate-500');
        }
        modal.classList.remove('invisible', 'opacity-0');
        content.classList.remove('scale-95');
    };

    window.closeAddModal = () => {
        const modal = document.getElementById('addModal');
        const content = document.getElementById('modalContent');
        if (enableSplit) {
            enableSplit.checked = false;
            if (splitMonthsContainer) splitMonthsContainer.classList.add('hidden');
        }
        if (splitPreview) splitPreview.classList.add('hidden');
        modal.classList.add('invisible', 'opacity-0');
        content.classList.add('scale-95');
        if (expenseForm) expenseForm.reset();
    };

    function initAddForm() {
        expenseForm = document.getElementById('expenseForm');
        
        // Handle category selection from datalist
        const categoryInput = document.getElementById('category');
        const categoryIdInput = document.getElementById('categoryId');
        if (categoryInput) {
            categoryInput.addEventListener('input', function() {
                // When user types, clear the categoryId
                if (categoryIdInput) categoryIdInput.value = '';
            });
            categoryInput.addEventListener('change', function() {
                const selectedValue = this.value;
                // Find matching category from CATEGORIES_DATA to get its ID
                const categoryObj = window.CATEGORIES_DATA?.find(c => c.Name === selectedValue);
                if (categoryObj && categoryIdInput) {
                    categoryIdInput.value = categoryObj.Id;
                }
            });
        }
        
        if (expenseForm) {
            expenseForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const title = document.getElementById('title').value.trim();
                const amount = parseFloat(document.getElementById('amount').value);
                const category = document.getElementById('category').value;
                const categoryId = document.getElementById('categoryId')?.value;
                const expenseDateVal = document.getElementById('expenseDate').value;

                if (!title || !amount || !category || !expenseDateVal) {
                    error('กรุณากรอกข้อมูลให้ครบทุกช่อง');
                    return;
                }

                const splitMonths = (enableSplit && enableSplit.checked) ? parseInt(document.getElementById('splitMonths').value) : 1;

                const confirmMsg = splitMonths > 1
                    ? `ยืนยันบันทึกรายจ่ายชุดนี้ จำนวน ${splitMonths} งวด งวดละ ${fmt(amount / splitMonths)} ใช่หรือไม่?`
                    : `ยืนยันบันทึกรายจ่าย "${title}" จำนวน ${fmt(amount)} ใช่หรือไม่?`;

                const confirmResult = await swalConfirm(confirmMsg, 'บันทึกรายจ่าย');
                if (!confirmResult.isConfirmed) return;

                const btn = document.getElementById('submitBtn');
                btn.disabled = true;
                btn.innerHTML = '<i class="bi bi-hourglass-split animate-spin"></i> กำลังบันทึก...';

                try {
                    await addExpense({ title, amount, categoryId, category, expenseDate: expenseDateVal, splitMonths });
                    await success('✅ บันทึกสำเร็จ');
                    window.dispatchEvent(new Event('expense:changed'));
                    window.closeAddModal();
                    loadCalendar();
                } catch (err) {
                    error('บันทึกไม่สำเร็จ: ' + err.message);
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="bi bi-save"></i> บันทึกรายจ่าย';
                }
            });
        }
    }

    window.deleteExpenseItem = async (id) => {
        const result = await swalConfirm('คุณต้องการลบรายการนี้ใช่หรือไม่? หากมีรายการที่แบ่งชำระเป็นกลุ่ม ระบบจะลบออกทั้งกลุ่ม', 'ยืนยันการลบ');
        if (!result.isConfirmed) return;

        try {
            await apiDeleteExpense(id);
            await success('🗑️ ลบรายการสำเร็จ');
            window.dispatchEvent(new Event('expense:changed'));
            window.closePopover();
            loadCalendar();
        } catch (err) {
            error('ลบรายการไม่สำเร็จ: ' + err.message);
        }
    };

    window.changeMonth = (delta) => {
        currentMonth += delta;
        if (currentMonth > 12) { currentMonth = 1; currentYear++; }
        if (currentMonth < 1) { currentMonth = 12; currentYear--; }
        loadCalendar();
    };

    window.goToday = () => {
        const n = new Date();
        currentYear = n.getFullYear();
        currentMonth = n.getMonth() + 1;
        loadCalendar();
    };

    window.toggleDay = (dateKey, element) => {
        const popover = document.getElementById('dayPopover');
        const content = document.getElementById('popoverContent');

        if (openDay === dateKey) {
            window.closePopover();
            return;
        }

        const dayData = calendarData[dateKey];
        const dateParts = dateKey.split('-');
        const displayDate = `${parseInt(dateParts[2])} ${window.MONTHS_TH[parseInt(dateParts[1])]} ${parseInt(dateParts[0]) + 543}`;

        let html = `
            <div class="px-5 py-4">
                <div class="flex items-center justify-between mb-4 gap-4">
                    <p class="font-bold text-slate-800 truncate">
                         <i class="bi bi-calendar-event"></i> รายการวันที่ ${displayDate} 
                    </p>
                    <button onclick="window.openAddModal('${dateKey}')" class="shrink-0 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm">
                        <i class="bi bi-plus"></i> เพิ่ม
                    </button>
                </div>
        `;

        if (dayData && dayData.items.length > 0) {
            html += `<div class="space-y-2 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
                ${dayData.items.map(item => `
                    <div class="flex items-center justify-between py-2 border-b border-slate-50 last:border-0 hover:bg-slate-50 px-2 rounded-lg transition-colors group/item">
                        <span class="font-medium text-slate-700 truncate mr-2">${escapeHtml(item.title)}</span>
                        <div class="flex items-center gap-2 shrink-0">
                            <span class="font-bold text-blue-600">${fmt(item.amount)}</span>
                            <button onclick="window.deleteExpenseItem('${item.id}')" class="text-red-400 hover:text-red-600 p-1">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>`;
            html += `<div class="mt-4 pt-3 border-t border-slate-100 flex justify-between">
                <span class="text-xs font-bold text-slate-400 uppercase">ยอดรวม:</span>
                <span class="text-sm font-bold text-blue-600">${fmt(dayData.total)}</span>
            </div>`;
        } else {
            html += `<div class="text-center py-6 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs">ยังไม่มีรายการในวันนี้</div>`;
        }
        html += `</div>`;

        content.innerHTML = html;
        openDay = dateKey;

        // Positioning logic
        const popoverInner = popover.firstElementChild;
        popoverInner.style.transform = '';
        popover.style.top = '-9999px';
        popover.style.left = '-9999px';
        popover.classList.remove('invisible');
        popover.style.opacity = '0';

        requestAnimationFrame(() => {
            const rect = element.getBoundingClientRect();
            const popoverRect = popoverInner.getBoundingClientRect();
            const arrowTop = document.getElementById('popoverArrowTop');
            const arrowBottom = document.getElementById('popoverArrowBottom');

            let left = rect.left + (rect.width / 2) - (popoverRect.width / 2);
            const margin = 16;
            if (left < margin) left = margin;
            if (left + popoverRect.width > window.innerWidth - margin) {
                left = window.innerWidth - popoverRect.width - margin;
            }

            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            const popoverHeight = popoverRect.height + 20;
            let top;

            if (spaceBelow < popoverHeight && spaceAbove > spaceBelow) {
                top = rect.top + window.scrollY - popoverRect.height - 12;
                if (arrowTop) arrowTop.classList.add('hidden');
                if (arrowBottom) arrowBottom.classList.remove('hidden');
                popoverInner.style.transform = 'translateY(8px)';
            } else {
                top = rect.bottom + window.scrollY + 12;
                if (arrowTop) arrowTop.classList.remove('hidden');
                if (arrowBottom) arrowBottom.classList.add('hidden');
                popoverInner.style.transform = 'translateY(-8px)';
            }

            popover.style.top = `${top}px`;
            popover.style.left = `${left}px`;
            popover.style.opacity = '';
            popover.classList.remove('opacity-0');

            setTimeout(() => {
                popoverInner.style.transform = 'translateY(0)';
            }, 10);
        });
    };

    window.closePopover = () => {
        const popover = document.getElementById('dayPopover');
        if (!popover) return;
        const popoverInner = popover.firstElementChild;
        popover.classList.add('invisible', 'opacity-0');
        if (popoverInner) popoverInner.style.transform = '';
        openDay = null;
    };

    window.addEventListener('click', (e) => {
        const popover = document.getElementById('dayPopover');
        if (popover && !popover.contains(e.target) && !e.target.closest('.day-cell')) {
            window.closePopover();
        }
    });

    function showCalendarSkeletons() {
        // Skeleton for summary bar stats
        ['barTotal', 'barDays', 'barItems'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = `<div class="skeleton skeleton-text w-24 h-8 mt-1"></div>`;
        });

        // Skeleton for month label
        const monthLabel = document.getElementById('monthLabel');
        if (monthLabel) monthLabel.innerHTML = `<div class="skeleton skeleton-text w-32 h-4"></div>`;

        // Skeleton for calendar grid cells
        const grid = document.getElementById('calendarGrid');
        if (!grid) return;
        grid.innerHTML = '';

        // Show 35 skeleton cells (5 rows × 7 cols)
        for (let i = 0; i < 35; i++) {
            const cell = document.createElement('div');
            cell.className = 'day-cell min-h-[100px] border-b border-r border-inherit p-2 flex flex-col gap-2';
            cell.innerHTML = `
                <div class="skeleton w-7 h-7 rounded-full"></div>
                <div class="skeleton skeleton-text w-16 h-3 mt-auto"></div>
                <div class="skeleton skeleton-text w-12 h-2"></div>
            `;
            grid.appendChild(cell);
        }
    }

    async function loadCalendar() {
        openDay = null;
        const grid = document.getElementById('calendarGrid');
        if (!grid) return;

        // Show skeleton loaders
        showCalendarSkeletons();

        try {
            const [raw] = await Promise.all([
                getCalendarData(currentYear, currentMonth),
                new Promise(r => setTimeout(r, 500))
            ]);
            calendarData = {};
            let monthTotal = 0, itemCount = 0;
            raw.forEach(d => {
                calendarData[d.date] = d;
                monthTotal += d.total;
                itemCount += d.items.length;
            });

            document.getElementById('monthLabel').textContent = `${window.MONTHS_TH[currentMonth]} ${currentYear + 543}`;
            document.getElementById('barTotal').textContent = fmt(monthTotal);
            document.getElementById('barDays').textContent = `${raw.length} วัน`;
            document.getElementById('barItems').textContent = `${itemCount} รายการ`;

            renderCalendar();
        } catch (err) {
            error('โหลดข้อมูลล้มเหลว: ' + err.message);
        }
    }

    function renderCalendar() {
        const grid = document.getElementById('calendarGrid');
        if (!grid) return;
        grid.innerHTML = '';

        const today = new Date();
        const todayKey = today.toISOString().slice(0, 10);
        const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
        const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

        for (let i = 0; i < firstDay; i++) {
            const empty = document.createElement('div');
            empty.className = 'empty-cell min-h-[100px] border-b border-r border-inherit bg-slate-900/20';
            grid.appendChild(empty);
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const mm = String(currentMonth).padStart(2, '0');
            const dd = String(d).padStart(2, '0');
            const dateKey = `${currentYear}-${mm}-${dd}`;
            const dayData = calendarData[dateKey];

            const colDay = (firstDay + d - 1) % 7;
            const isSun = colDay === 0;
            const isSat = colDay === 6;
            const isToday = dateKey === todayKey;

            const cell = document.createElement('div');
            cell.className = `day-cell min-h-[100px] border-b border-r border-inherit p-2 relative flex flex-col group cursor-pointer`;
            cell.onclick = () => window.toggleDay(dateKey, cell);

            let textCol = 'text-slate-400';
            if (isSun) textCol = 'text-red-500';
            else if (isSat) textCol = 'text-blue-500';

            const dayNum = document.createElement('div');
            dayNum.className = `text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full mb-1 ${isToday ? 'bg-indigo-600 text-white shadow-sm' : textCol} group-hover:bg-indigo-100 group-hover:text-indigo-700 transition-colors`;
            dayNum.textContent = d;
            cell.appendChild(dayNum);

            if (dayData) {
                const badge = document.createElement('div');
                badge.className = 'text-sm font-bold mt-auto pb-1 truncate w-full text-blue-600';
                badge.textContent = fmtShort(dayData.total);
                cell.appendChild(badge);

                const countEl = document.createElement('div');
                countEl.className = 'text-[11px] font-medium opacity-70 text-slate-500';
                countEl.textContent = `${dayData.items.length} รายการ`;
                cell.appendChild(countEl);
            } else {
                const hintIcon = document.createElement('div');
                hintIcon.className = 'mt-auto text-xs text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity';
                hintIcon.innerHTML = '<i class="bi bi-plus"></i> เพิ่ม';
                cell.appendChild(hintIcon);
            }
            grid.appendChild(cell);
        }

        const totalCells = firstDay + daysInMonth;
        const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
        for (let i = 0; i < remaining; i++) {
            const empty = document.createElement('div');
            empty.className = 'empty-cell min-h-[100px] border-b border-r border-inherit bg-slate-900/20';
            grid.appendChild(empty);
        }
    }

    function updateSplitPreview() {
        if (!enableSplit || !enableSplit.checked) {
            if (splitPreview) splitPreview.classList.add('hidden');
            return;
        }

        const amount = parseFloat(document.getElementById('amount').value) || 0;
        const months = parseInt(document.getElementById('splitMonths').value) || 1;
        const baseDate = new Date(document.getElementById('expenseDate').value || new Date());
        const baseDay = baseDate.getDate();

        if (amount <= 0) {
            splitPreview.classList.add('hidden');
            return;
        }

        splitPreview.classList.remove('hidden');
        const perMonth = amount / months;
        let html = '';

        for (let i = 1; i <= months; i++) {
            const targetMonth = baseDate.getMonth() + (i - 1);
            const date = new Date(baseDate.getFullYear(), targetMonth, 1);
            const lastDayInMonth = new Date(baseDate.getFullYear(), targetMonth + 1, 0).getDate();
            date.setDate(Math.min(baseDay, lastDayInMonth));

            const displayDate = date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

            html += `
                <div class="bg-white/60 p-2 rounded flex items-center justify-between border border-blue-100 mb-1">
                    <span class="text-[10px] font-bold text-slate-500">${displayDate} (งวดที่ ${i})</span>
                    <span class="text-[11px] font-black text-blue-600">${fmt(perMonth)}</span>
                </div>
            `;
        }
        previewList.innerHTML = html;
    }

    // Init page
    document.addEventListener('DOMContentLoaded', () => {
        enableSplit = document.getElementById('enableSplit');
        splitMonthsContainer = document.getElementById('splitMonthsContainer');
        splitPreview = document.getElementById('splitPreview');
        previewList = document.getElementById('previewList');

        initAddForm();
        loadCategories();

        if (enableSplit) {
            enableSplit.addEventListener('change', (e) => {
                if (splitMonthsContainer) {
                    splitMonthsContainer.classList.toggle('hidden', !e.target.checked);
                }
                updateSplitPreview();
            });
        }

        ['amount', 'splitMonths', 'expenseDate'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', updateSplitPreview);
        });

        Components.load('sidebar-container', '/expense/partials/sidebar.html');
        loadCalendar();
        Components.load('footer-container', '/expense/partials/footer.html');
    });

})();
