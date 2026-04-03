/**
 * index.js — Main integration and controller for index.html (Modular)
 */

(function () {
    const { fmt, confirm: swalConfirm, success, error } = window.Utils;
    const { getExpenses, getSummary, addExpense, deleteExpense: apiDeleteExpense, getBudget, getDashboardSummary, getCategories } = window.API;
    const state = window.IndexState;
    const ui = window.IndexUI;

    let expenseForm, expenseDate, enableSplit, splitMonthsContainer, splitPreview, previewList;
    let filterTimeout;

    function showTableSkeletons() {
        const tbody = document.getElementById('expenseTableBody');
        if (!tbody) return;
        tbody.innerHTML = Array(5).fill(0).map((_, i) => `
            <tr class="transition-colors duration-150 even:bg-slate-50/50">
                <td class="px-4 py-3 text-center"><div class="skeleton w-5 h-4 mx-auto"></div></td>
                <td class="px-4 py-3"><div class="skeleton skeleton-text w-28 h-4"></div></td>
                <td class="px-4 py-3"><div class="skeleton skeleton-text w-20 h-4"></div></td>
                <td class="px-4 py-3"><div class="skeleton w-16 h-5 rounded-full"></div></td>
                <td class="px-4 py-3"><div class="skeleton skeleton-text w-24 h-4"></div></td>
                <td class="px-4 py-3 text-center"><div class="skeleton w-8 h-6 rounded-md mx-auto"></div></td>
            </tr>
        `).join('');
        document.getElementById('emptyState').classList.add('hidden');
    }

    async function loadExpenses() {
        ui.setLoadingState(true);
        showTableSkeletons();
        try {
            const [res] = await Promise.all([
                getExpenses(state),
                new Promise(r => setTimeout(r, 500))
            ]);
            state.totalPages = res.totalPages;
            state.totalItems = res.totalCount;

            const startIdx = (state.page - 1) * state.limit;
            ui.renderTable(res.data, startIdx, res.totalCount);
            ui.renderPagination(state);
            ui.updateSortIcons(state);
        } catch (err) {
            error('โหลดข้อมูลล้มเหลว: ' + err.message);
        } finally {
            ui.setLoadingState(false);
        }
    }

    function showSummarySkeletons() {
        ['totalCount', 'totalAmount'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = `<div class="skeleton skeleton-text w-24 h-8 mx-auto mt-1"></div>`;
        });
    }

    async function loadSummaryData() {
        showSummarySkeletons();
        try {
            const [data] = await Promise.all([
                getSummary(),
                new Promise(r => setTimeout(r, 500))
            ]);
            document.getElementById('totalCount').textContent = data.totalCount.toLocaleString();
            document.getElementById('totalAmount').textContent = fmt(data.totalAmount);

            const systemMax = Math.max(10000, Math.ceil(data.totalAmount / 100) * 100);
            updateSliderMax(systemMax);

            // Fetch Budget specifically for current month
            const now = new Date();
            const [budget, dash] = await Promise.all([
                getBudget(now.getFullYear(), now.getMonth() + 1),
                getDashboardSummary()
            ]);

            const budgetInfo = document.getElementById('budgetInfo');
            const usageText = document.getElementById('budgetUsageText');
            if (budgetInfo && usageText) {
                budgetInfo.classList.remove('hidden');
                const spent = dash.currentMonthTotal;
                const total = budget.amount;
                const remaining = total - spent;
                usageText.innerHTML = `${fmt(spent)} / ${fmt(total)} (คงเหลือ: <span class="${remaining < 0 ? 'text-red-500' : 'text-emerald-500'}">${fmt(remaining)}</span>)`;
            }

        } catch (err) {
            console.error('Summary error:', err);
        }
    }

    function updateSliderMax(max) {
        ['filterMinAmount', 'filterMaxAmount'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.max = max;
        });
        if (state.maxAmount > max) state.maxAmount = max;
    }

    // Window Exports
    window.handleFilterChange = (key, val) => {
        clearTimeout(filterTimeout);
        filterTimeout = setTimeout(() => {
            state[key] = val;
            state.page = 1;
            loadExpenses();
        }, 400);
    };

    window.handleMinAmountSlider = (val) => {
        state.minAmount = parseFloat(val);
        // Ensure min doesn't cross max
        if (state.minAmount > state.maxAmount) {
            state.minAmount = state.maxAmount;
            document.getElementById('filterMinAmount').value = state.minAmount;
        }
        document.getElementById('minAmountLabel').textContent = fmt(state.minAmount);

        clearTimeout(filterTimeout);
        filterTimeout = setTimeout(() => {
            state.page = 1;
            loadExpenses();
        }, 300);
    };

    window.handleMaxAmountSlider = (val) => {
        state.maxAmount = parseFloat(val);
        // Ensure max doesn't cross min
        if (state.maxAmount < state.minAmount) {
            state.maxAmount = state.minAmount;
            document.getElementById('filterMaxAmount').value = state.maxAmount;
        }
        document.getElementById('maxAmountLabel').textContent = fmt(state.maxAmount);

        clearTimeout(filterTimeout);
        filterTimeout = setTimeout(() => {
            state.page = 1;
            loadExpenses();
        }, 300);
    };

    window.toggleCategoryPopover = (e) => {
        e.stopPropagation();
        const popover = document.getElementById('categoryPopover');
        popover.classList.toggle('hidden');

        if (!popover.classList.contains('hidden')) {
            // Close when clicking outside
            const clickHandler = () => {
                popover.classList.add('hidden');
                document.removeEventListener('click', clickHandler);
            };
            document.addEventListener('click', clickHandler);
        }
    };

    window.toggleCategoryFilter = (cat) => {
        if (state.categories.includes(cat)) {
            state.categories = state.categories.filter(c => c !== cat);
        } else {
            state.categories.push(cat);
        }
        ui.renderCategoryList(state);
        state.page = 1;
        loadExpenses();
    };

    window.bulkSelectCategories = (selectAll) => {
        state.categories = selectAll ? [...state.ALL_CATEGORIES] : [];
        ui.renderCategoryList(state);
        state.page = 1;
        loadExpenses();
    };

    window.resetFilters = () => {
        state.search = '';
        state.minAmount = 0;
        state.maxAmount = parseInt(document.getElementById('filterMaxAmount').max) || 10000;
        state.categories = [];
        state.startDate = '';
        state.endDate = '';
        state.page = 1;

        // Reset UI
        document.getElementById('filterTitle').value = '';
        document.getElementById('filterMinAmount').value = 0;
        document.getElementById('filterMaxAmount').value = state.maxAmount;
        document.getElementById('minAmountLabel').textContent = fmt(0);
        document.getElementById('maxAmountLabel').textContent = fmt(state.maxAmount);
        document.getElementById('filterStartDate').value = '';
        document.getElementById('filterEndDate').value = '';

        ui.renderCategoryList(state);
        loadExpenses();
    };

    window.changeSort = (col) => {
        if (state.sortBy === col) {
            state.sortDir = state.sortDir === 'ASC' ? 'DESC' : 'ASC';
        } else {
            state.sortBy = col;
            state.sortDir = 'DESC';
        }
        state.page = 1;
        loadExpenses();
    };

    window.setPage = (p) => {
        state.page = p;
        loadExpenses();
    };

    window.deleteExpenseItem = async (id) => {
        const result = await swalConfirm('คุณต้องการลบรายการนี้ใช่หรือไม่?', 'ยืนยันการลบ');
        if (!result.isConfirmed) return;

        try {
            await apiDeleteExpense(id);
            await success('🗑️ ลบรายการสำเร็จ');
            window.dispatchEvent(new Event('expense:changed'));
            loadExpenses();
            loadSummaryData();
        } catch (err) {
            error('ลบรายการล้มเหลว: ' + err.message);
        }
    };

    function updateSplitPreview() {
        if (!enableSplit.checked) {
            splitPreview.classList.add('hidden');
            return;
        }

        const amount = parseFloat(document.getElementById('amount').value) || 0;
        const months = parseInt(document.getElementById('splitMonths').value) || 1;
        const baseDate = new Date(expenseDate.value || new Date());
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
                <div class="bg-white/60 p-2.5 rounded-lg border border-blue-100 flex items-center justify-between">
                    <div>
                        <div class="text-[10px] uppercase font-bold text-slate-400">งวดที่ ${i}/${months}</div>
                        <div class="text-xs font-bold text-slate-700">${displayDate}</div>
                    </div>
                    <div class="text-xs font-black text-blue-600">${fmt(perMonth)}</div>
                </div>
            `;
        }
        previewList.innerHTML = html;
    }

    function initForm() {
        expenseForm = document.getElementById('expenseForm');
        expenseDate = document.getElementById('expenseDate');
        
        // Handle category selection from datalist
        const categoryInput = document.getElementById('category');
        const categoryIdInput = document.getElementById('categoryId');
        if (categoryInput) {
            categoryInput.addEventListener('input', function() {
                // When user types, clear the categoryId
                categoryIdInput.value = '';
            });
            categoryInput.addEventListener('change', function() {
                const selectedValue = this.value;
                // Find matching category from ALL_CATEGORIES to get its ID
                const categories = state.ALL_CATEGORIES || [];
                // The ALL_CATEGORIES is now an array of objects with Id and Name
                const categoryObj = window.CATEGORIES_DATA?.find(c => c.Name === selectedValue);
                if (categoryObj) {
                    categoryIdInput.value = categoryObj.Id;
                }
            });
        }
        enableSplit = document.getElementById('enableSplit');
        splitMonthsContainer = document.getElementById('splitMonthsContainer');
        splitPreview = document.getElementById('splitPreview');
        previewList = document.getElementById('previewList');

        if (expenseDate) expenseDate.valueAsDate = new Date();

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

        if (expenseForm) {
            window.Utils.setupTitleAutocomplete('#title', '#amount', '#category', '#categoryId');
            
            expenseForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const title = document.getElementById('title').value.trim();
                const amount = parseFloat(document.getElementById('amount').value);
                const category = document.getElementById('category').value;
                const expenseDateVal = document.getElementById('expenseDate').value;

                if (!title || !amount || !category || !expenseDateVal) {
                    error('กรุณากรอกข้อมูลให้ครบทุกช่อง');
                    return;
                }

                const splitMonths = (enableSplit && enableSplit.checked) ? parseInt(document.getElementById('splitMonths').value) : 1;

                const confirmResult = await swalConfirm(`ยืนยันบันทึก "${title}" ใช่หรือไม่?`, 'บันทึกรายจ่าย');
                if (!confirmResult.isConfirmed) return;

                const btn = document.getElementById('submitBtn');
                btn.disabled = true;
                btn.innerHTML = '<i class="bi bi-hourglass-split animate-spin"></i> กำลังบันทึก...';

                try {
                    const categoryId = document.getElementById('categoryId').value;
                    await addExpense({ title, amount, categoryId, category, expenseDate: expenseDateVal, splitMonths });
                    await success('✅ บันทึกสำเร็จ');
                    expenseForm.reset();
                    if (splitMonthsContainer) splitMonthsContainer.classList.add('hidden');
                    if (splitPreview) splitPreview.classList.add('hidden');
                    if (expenseDate) expenseDate.valueAsDate = new Date();

                    window.dispatchEvent(new Event('expense:changed'));
                    loadExpenses();
                    loadSummaryData();
                } catch (err) {
                    error('บันทึกไม่สำเร็จ: ' + err.message);
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="bi bi-save"></i> บันทึกรายจ่าย';
                }
            });
        }
    }

    // Load categories from API
    async function loadCategories() {
        try {
            const categories = await getCategories();
            // Sort alphabetically
            categories.sort((a, b) => a.Name.localeCompare(b.Name, 'th'));
            // Store full category objects for lookup
            window.CATEGORIES_DATA = categories;
            state.ALL_CATEGORIES = categories.map(c => c.Name);
            
            // Update datalist for searchable dropdown (form)
            const dataList = document.getElementById('categoryDatalist');
            if (dataList) {
                dataList.innerHTML = '';
                categories.forEach(cat => {
                    const opt = document.createElement('option');
                    opt.value = cat.Name;
                    dataList.appendChild(opt);
                });
            }
            // Also update the category filter list
            ui.renderCategoryList(state);
        } catch (err) {
            console.error('Failed to load categories:', err);
        }
    }

    // Init page
    document.addEventListener('DOMContentLoaded', () => {
        initForm();
        Components.load('sidebar-container', '/expense/partials/sidebar.html');
        loadCategories();
        loadExpenses();
        loadSummaryData();
        Components.load('footer-container', '/expense/partials/footer.html');
    });
})();
