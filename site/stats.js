// Файл: stats.js (ПОЛНОСТЬЮ ИСПРАВЛЕННАЯ ВЕРСИЯ)

document.addEventListener('DOMContentLoaded', () => {
    // --- ИНИЦИАЛИЗАЦИЯ SUPABASE ---
    const SUPABASE_URL = 'https://gbabrtcnegjhherbczuj.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdiYWJydGNuZWdqaGhlcmJjenVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxMzQ0MTAsImV4cCI6MjA3NDcxMDQxMH0.muedJjHjqZsCUv6wtiiGoTao9t1T69lTl6p5G57_otU';
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // --- ЭЛЕМЕНТЫ DOM ---
    const historyContainer = document.getElementById('history-list-container');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const periodDisplayText = document.getElementById('period-text');

    let allOperations = [];
    let currentFilter = 'all';

    // --- ИКОНКИ И НАЗВАНИЯ ТИПОВ ОПЕРАЦИЙ (КАК В ПЕРВОМ ФАЙЛЕ) ---
    const icons = {
        'top-up': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`,
        'balance_debit': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>`,
        'invoice': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`,
        'other': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`
    };
    
    const paymentTypeLabels = {
        'top-up': 'Пополнение баланса',
        'balance_debit': 'Списание с баланса',
        'invoice': 'Списание по счёту',
        'initial': 'Начало аренды',
    };

    /**
     * Рендерит отфильтрованный список операций
     */
    function renderHistory() {
        let operationsToRender = allOperations;
        if (currentFilter === 'rent') { // Фильтр "расходы"
            operationsToRender = allOperations.filter(op => op.amount_rub <= 0);
        } else if (currentFilter === 'topup') { // Фильтр "пополнения"
            operationsToRender = allOperations.filter(op => op.amount_rub > 0);
        }
        
        historyContainer.innerHTML = '';
        if (operationsToRender.length === 0) {
            historyContainer.innerHTML = '<p class="empty-history">Операций за выбранный период нет.</p>';
            return;
        }

        const groupedByDate = operationsToRender.reduce((acc, op) => {
            const date = new Date(op.created_at).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' });
            if (!acc[date]) acc[date] = [];
            acc[date].push(op);
            return acc;
        }, {});

        for (const date in groupedByDate) {
            const dateHeader = document.createElement('h3');
            dateHeader.className = 'history-date-header';
            dateHeader.textContent = date;
            historyContainer.appendChild(dateHeader);

            groupedByDate[date].forEach(item => {
                const isTopup = item.amount_rub > 0;
                const type = item.payment_type || (isTopup ? 'top-up' : 'other');
                const title = paymentTypeLabels[type] || 'Операция';
                const iconHTML = icons[type] || icons['other'];

                const itemHTML = `
                    <div class="history-item">
                        <div class="history-item-left">
                            <div class="history-icon-wrapper ${type}">${iconHTML}</div>
                            <div class="history-details">
                                <span class="history-title">${title}</span>
                                <span class="history-subtitle">${item.description || new Date(item.created_at).toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'})}</span>
                            </div>
                        </div>
                        <div class="history-cost ${isTopup ? 'positive' : 'negative'}">${isTopup ? '+' : ''}${item.amount_rub.toLocaleString('ru-RU')} ₽</div>
                    </div>`;
                historyContainer.insertAdjacentHTML('beforeend', itemHTML);
            });
        }
    }

    /**
     * Загружает историю операций с сервера за указанный период
     */
    async function loadHistory(startDate, endDate) {
        historyContainer.innerHTML = '<p class="empty-history">Загрузка истории...</p>';
        const userId = localStorage.getItem('userId');
        if (!userId) {
            historyContainer.innerHTML = '<p class="empty-history">Не удалось определить пользователя.</p>';
            return;
        }

        try {
            // ИЗМЕНЕНО: Запрашиваем данные из правильной таблицы 'payments'
            let query = supabase
                .from('payments')
                .select('id, created_at, amount_rub, payment_type, description') // ИЗМЕНЕНО: Запрашиваем нужные поля
                .eq('client_id', userId) // ИЗМЕНЕНО: Правильное поле для ID пользователя
                .order('created_at', { ascending: false });

            if (startDate) query = query.gte('created_at', startDate.toISOString());
            if (endDate) query = query.lte('created_at', endDate.toISOString());

            const { data, error } = await query;

            if (error) throw error;
            
            allOperations = data;
            renderHistory();
        } catch (err) {
            console.error('Ошибка загрузки истории:', err);
            historyContainer.innerHTML = '<p class="empty-history">Не удалось загрузить историю платежей.</p>';
        }
    }

    // --- ЛОГИКА ФИЛЬТРОВ (без изменений) ---
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            currentFilter = button.dataset.filter;
            renderHistory();
        });
    });

    // --- ИНИЦИАЛИЗАЦИЯ КАЛЕНДАРЯ (без изменений) ---
    const fp = flatpickr("#period-display", {
        mode: "range",
        dateFormat: "d.m.Y",
        locale: "ru",
        onClose: function(selectedDates) {
            if (selectedDates.length === 2) {
                const [start, end] = selectedDates;
                end.setHours(23, 59, 59, 999); 
                
                const options = { day: 'numeric', month: 'short' };
                periodDisplayText.textContent = `${start.toLocaleDateString('ru-RU', options)} - ${end.toLocaleDateString('ru-RU', options)}`;
                loadHistory(start, end);
            }
        }
    });

    // --- НАЧАЛЬНАЯ ЗАГРУЗКА ДАННЫХ ЗА ТЕКУЩИЙ МЕСЯЦ (без изменений) ---
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
    loadHistory(startOfMonth, endOfMonth);
});