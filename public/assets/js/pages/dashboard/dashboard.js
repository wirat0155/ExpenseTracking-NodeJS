/**
 * dashboard.js — Logic for dashboard.html
 */

(function () {
    const { fmt, escapeHtml, showToast, formatDate } = window.Utils;
    const { getDashboardSummary } = window.API;

    const CATEGORY_ICONS = {
        'อาหารและเครื่องดื่ม': '<i class="bi bi-egg-fried"></i>',
        'การเดินทาง': '<i class="bi bi-car-front"></i>',
        'สาธารณูปโภค': '<i class="bi bi-lightbulb"></i>',
        'การศึกษา': '<i class="bi bi-book"></i>',
        'สุขภาพ': '<i class="bi bi-heart-pulse"></i>',
        'ความบันเทิง': '<i class="bi bi-controller"></i>',
    };

    function categoryIcon(cat) { return CATEGORY_ICONS[cat] || '<i class="bi bi-box-seam"></i>'; }

    function renderBudgetBar(spent, total) {
        const percent = total > 0 ? (spent / total * 100) : 0;
        const bar = document.getElementById('budgetProgressBar');
        const percentText = document.getElementById('budgetPercentText');
        const spentText = document.getElementById('budgetSpent');
        const totalText = document.getElementById('budgetTotal');
        const remainingText = document.getElementById('budgetRemainingText');

        if (!bar) return;

        spentText.textContent = fmt(spent);
        totalText.textContent = fmt(total);
        percentText.textContent = `${percent.toFixed(0)}%`;
        bar.style.width = `${Math.min(percent, 100)}%`;

        if (percent >= 100) {
            bar.className = 'h-full rounded-full transition-all duration-1000 ease-out shadow-sm bg-gradient-to-r from-red-500 to-rose-600';
            percentText.className = 'text-sm font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-lg';
        } else if (percent >= 80) {
            bar.className = 'h-full rounded-full transition-all duration-1000 ease-out shadow-sm bg-gradient-to-r from-amber-400 to-orange-500';
            percentText.className = 'text-sm font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg';
        } else {
            bar.className = 'h-full rounded-full transition-all duration-1000 ease-out shadow-sm bg-gradient-to-r from-emerald-400 to-teal-500';
            percentText.className = 'text-sm font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg';
        }

        const remaining = total - spent;
        remainingText.textContent = remaining >= 0 ? `คงเหลือ: ${fmt(remaining)}` : `เกินงบ: ${fmt(Math.abs(remaining))}`;
        if (remaining < 0) remainingText.classList.add('text-red-500');
        else remainingText.classList.remove('text-red-500');
    }


    async function loadDashboard() {
        // Show Skeletons in cards
        ['totalExpense', 'currentMonthTotal', 'categoryCount', 'monthCount'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = `<div class="skeleton skeleton-text w-24 h-8 mt-2"></div>`;
        });
        document.getElementById('categoryList').innerHTML = Array(3).fill(0).map(() => `
            <div class="mb-4">
                <div class="flex justify-between mb-1"><div class="skeleton skeleton-text w-24"></div><div class="skeleton skeleton-text w-16"></div></div>
                <div class="skeleton h-2 w-full"></div>
            </div>
        `).join('');
        document.getElementById('latestList').innerHTML = Array(3).fill(0).map(() => `
            <div class="flex justify-between py-2"><div class="skeleton skeleton-text w-32"></div><div class="skeleton skeleton-text w-16"></div></div>
        `).join('');

        try {
            const [data] = await Promise.all([
                getDashboardSummary(),
                new Promise(r => setTimeout(r, 500))
            ]);

            // Summary cards
            document.getElementById('totalExpense').textContent = fmt(data.totalExpense);
            document.getElementById('currentMonthTotal').textContent = fmt(data.currentMonthTotal);

            const now = new Date();
            document.getElementById('currentMonthLabel').textContent = `${window.MONTHS_TH_SHORT[now.getMonth() + 1]} ${now.getFullYear() + 543}`;

            document.getElementById('categoryCount').textContent = data.categorySummary.length;
            document.getElementById('monthCount').textContent = data.monthlySummary.length;

            renderBudgetBar(data.currentMonthTotal, data.currentMonthBudget);


            // Category bars
            const maxCat = Math.max(...data.categorySummary.map(c => c.total), 1);
            document.getElementById('categoryList').innerHTML = data.categorySummary.length
                ? data.categorySummary.map(c => `
                    <div>
                        <div class="flex justify-between text-sm mb-1">
                            <span data-theme-heading>${categoryIcon(c.category)} ${escapeHtml(c.category)}</span>
                            <span class="font-semibold" text-blue-600>${fmt(c.total)}</span>
                        </div>
                        <div class="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden shadow-inner">
                            <div class="bar h-2 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full"
                                 style="width: ${(c.total / maxCat * 100).toFixed(1)}%"></div>
                        </div>
                    </div>
                `).join('')
                : '<p class="text-sm">ยังไม่มีข้อมูล</p>';

            // Latest expenses
            document.getElementById('latestList').innerHTML = data.latestExpenses.length
                ? data.latestExpenses.map(e => `
                    <div class="flex items-center justify-between py-2 border-b border-inherit last:border-0">
                        <div class="min-w-0">
                            <p class="font-medium text-sm truncate" data-theme-heading>${escapeHtml(e.Title)}</p>
                            <p class="text-xs text-slate-500">${formatDate(e.ExpenseDate)} · ${escapeHtml(e.Category)}</p>
                        </div>
                        <span class="font-semibold text-sm ml-4 shrink-0" text-blue-600>${fmt(e.Amount)}</span>
                    </div>
                `).join('')
                : '<p class="text-sm">ยังไม่มีข้อมูล</p>';

            // Monthly table
            document.getElementById('monthlyTableBody').innerHTML = data.monthlySummary.length
                ? data.monthlySummary.map(m => `
                    <tr class="transition-colors">
                        <td class="px-6 py-4 text-slate-500">${m.year}</td>
                        <td class="px-6 py-4 font-medium" data-theme-heading>${window.MONTHS_TH_SHORT[m.month]}</td>
                        <td class="px-6 py-4 text-slate-500">${m.count.toLocaleString()} รายการ</td>
                        <td class="px-6 py-4 text-right font-bold text-blue-600">${fmt(m.total)}</td>
                    </tr>
                `).join('')
                : '<tr><td colspan="4" class="px-6 py-8 text-center text-slate-400">ยังไม่มีข้อมูล</td></tr>';

        } catch (err) {
            showToast('โหลดข้อมูลล้มเหลว: ' + err.message, true);
        }
    }

    window.openBudgetModal = async () => {
        const modal = document.getElementById('budgetModal');
        const content = document.getElementById('budgetModalContent');
        const monthSelect = document.getElementById('budgetMonth');
        if (monthSelect.options.length === 0) {
            window.MONTHS_TH.forEach((m, i) => {
                if (i === 0) return;
                const opt = document.createElement('option');
                opt.value = i;
                opt.textContent = m;
                monthSelect.appendChild(opt);
            });
        }
        const now = new Date();
        document.getElementById('budgetYear').value = now.getFullYear();
        monthSelect.value = now.getMonth() + 1;
        try {
            const master = await API.getMasterBudget();
            document.getElementById('masterBudgetInput').value = master.amount;
            const current = await API.getBudget(now.getFullYear(), now.getMonth() + 1);
            document.getElementById('monthlyBudgetInput').value = current.isCustom ? current.amount : '';
        } catch (e) { console.error(e); }
        modal.classList.remove('invisible', 'opacity-0');
        content.classList.remove('scale-95');
    };

    window.closeBudgetModal = () => {
        const modal = document.getElementById('budgetModal');
        const content = document.getElementById('budgetModalContent');
        modal.classList.add('invisible', 'opacity-0');
        content.classList.add('scale-95');
    };

    window.saveMasterBudget = async () => {
        const amount = parseFloat(document.getElementById('masterBudgetInput').value);
        if (isNaN(amount) || amount < 0) return Utils.error('กรุณาระบุจำนวนเงินที่ถูกต้อง');
        try {
            await API.updateMasterBudget(amount);
            Utils.success('บันทึกงบประมาณเริ่มต้นสำเร็จ');
            loadDashboard();
        } catch (e) { Utils.error(e.message); }
    };

    window.saveMonthlyBudget = async () => {
        const year = parseInt(document.getElementById('budgetYear').value);
        const month = parseInt(document.getElementById('budgetMonth').value);
        const amount = parseFloat(document.getElementById('monthlyBudgetInput').value);
        if (isNaN(amount) || amount < 0) return Utils.error('กรุณาระบุจำนวนเงินที่ถูกต้อง');
        try {
            await API.setBudget(year, month, amount);
            Utils.success('บันทึกงบประมาณรายเดือนสำเร็จ');
            loadDashboard();
        } catch (e) { Utils.error(e.message); }
    };

    document.addEventListener('DOMContentLoaded', () => {
        Components.load('sidebar-container', '/expense/partials/sidebar.html');
        Components.load('budget-modal-container', '/expense/partials/budget-modal.html');
        loadDashboard();
        Components.load('footer-container', '/expense/partials/footer.html');
    });

})();

