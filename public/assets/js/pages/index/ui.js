/**
 * ui.js — Responsible for rendering logic on the index page
 */
window.IndexUI = (function () {
    const { fmt, formatDate, escapeHtml } = window.Utils;

    function renderTable(expenses, startIdx, totalItems) {
        const tbody = document.getElementById('expenseTableBody');
        const empty = document.getElementById('emptyState');

        if (!expenses.length) {
            tbody.innerHTML = '';
            empty.classList.remove('hidden');
            updatePaginationInfo(0, 0, 0);
            return;
        }

        empty.classList.add('hidden');

        tbody.innerHTML = expenses.map((e, i) => `
            <tr class="transition-colors duration-150 even:bg-slate-50/50 hover:bg-blue-50/30 group">
                <td class="px-4 py-3 text-center text-slate-400 font-medium text-[10px]">${startIdx + i + 1}</td>
                <td class="px-4 py-3 font-semibold text-slate-700 text-xs truncate max-w-[200px]" title="${escapeHtml(e.Title)}">
                    ${escapeHtml(e.Title)}
                </td>
                <td class="px-4 py-3 font-black text-blue-600 text-xs">${fmt(e.Amount)}</td>
                <td class="px-4 py-3">
                    <span class="bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tight group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all">
                        ${escapeHtml(e.Category)}
                    </span>
                </td>
                <td class="px-4 py-3 text-slate-500 font-medium text-[10px] whitespace-nowrap">${formatDate(e.ExpenseDate)}</td>
                <td class="px-4 py-3 text-center">
                    <button onclick="window.deleteExpenseItem('${e.Id}')"
                        class="bg-white border border-red-200 text-red-500 hover:bg-red-500 hover:text-white px-2 py-1 rounded-md text-[10px] font-bold transition-all duration-200 shadow-sm">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        const pageEnd = startIdx + expenses.length;
        updatePaginationInfo(startIdx + 1, pageEnd, totalItems);
    }

    function updatePaginationInfo(start, end, total) {
        document.getElementById('pageStart').textContent = start.toLocaleString();
        document.getElementById('pageEnd').textContent = end.toLocaleString();
        document.getElementById('totalItems').textContent = total.toLocaleString();
    }

    function renderPagination(state) {
        const container = document.getElementById('pageNumbers');
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');

        if (!container) return;

        prevBtn.disabled = state.page === 1;
        nextBtn.disabled = state.page >= state.totalPages || state.totalPages === 0;

        let html = '';
        const maxVisible = 5;
        let startPage = Math.max(1, state.page - 2);
        let endPage = Math.min(state.totalPages, startPage + maxVisible - 1);

        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            const activeClass = i === state.page
                ? 'bg-blue-600 text-white border-blue-600 font-black shadow-md'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300 font-bold';

            html += `
                <button onclick="window.setPage(${i})" 
                    class="w-8 h-8 flex items-center justify-center rounded-lg border text-[10px] transition-all ${activeClass}">
                    ${i}
                </button>
            `;
        }
        container.innerHTML = html;
    }

    function renderCategoryList(state) {
        const container = document.getElementById('categoryList');
        const selectedText = document.getElementById('selectedCatText');
        if (!container) return;

        container.innerHTML = state.ALL_CATEGORIES.map(cat => {
            const isSelected = state.categories.includes(cat);
            const activeClass = isSelected ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-white text-slate-600 hover:bg-slate-50';
            const checkIcon = isSelected ? '<i class="bi bi-check-circle-fill text-blue-600"></i>' : '<i class="bi bi-circle text-slate-300"></i>';

            return `
                <button onclick="window.toggleCategoryFilter('${cat}')" 
                    class="flex items-center justify-between px-3 py-2 rounded-lg border border-transparent text-[11px] font-bold transition-all w-full text-left ${activeClass}">
                    <span>${cat}</span>
                    ${checkIcon}
                </button>
            `;
        }).join('');

        // Update Button Text
        if (state.categories.length === 0) {
            selectedText.textContent = "เลือกหมวดหมู่";
            selectedText.className = "text-slate-400";
        } else if (state.categories.length === state.ALL_CATEGORIES.length) {
            selectedText.textContent = "ทั้งหมด";
            selectedText.className = "text-blue-600";
        } else {
            selectedText.textContent = `${state.categories.length} หมวดหมู่`;
            selectedText.className = "text-blue-600";
        }
    }

    function updateSortIcons(state) {
        ['Title', 'Amount', 'Category', 'ExpenseDate'].forEach(col => {
            const el = document.getElementById(`sort-${col}`);
            if (el) {
                el.className = 'bi bi-arrow-down-up ml-1 text-slate-300';
            }
        });

        const activeIcon = document.getElementById(`sort-${state.sortBy}`);
        if (activeIcon) {
            activeIcon.className = `bi bi-sort-alpha-${state.sortDir === 'ASC' ? 'down' : 'up'} ml-1 text-blue-600 font-bold`;
            if (state.sortBy === 'Amount') {
                activeIcon.className = `bi bi-sort-numeric-${state.sortDir === 'ASC' ? 'down' : 'up'} ml-1 text-blue-600 font-bold`;
            }
        }
    }

    function setLoadingState(isLoading) {
        const tbody = document.getElementById('expenseTableBody');
        const bar = document.getElementById('tableLoadingBar');

        if (isLoading) {
            tbody.classList.add('opacity-40', 'pointer-events-none');
            bar.classList.remove('opacity-0');
            bar.classList.add('w-full');
        } else {
            tbody.classList.remove('opacity-40', 'pointer-events-none');
            bar.classList.add('opacity-0');
            // Delayed reset of width to avoid jump back
            setTimeout(() => {
                if (bar.classList.contains('opacity-0')) {
                    bar.classList.remove('w-full');
                    bar.style.width = '0';
                }
            }, 300);
        }
    }

    return {
        renderTable,
        renderPagination,
        renderCategoryList,
        updateSortIcons,
        setLoadingState
    };
})();
