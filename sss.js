// Скрипт для админ‑панели.
//
// В этом файле реализована простая аутентификация и базовые операции
// CRUD для тарифов, а также каркас для отображения клиентов, аренд и
// платежей. Для работы с реальной базой требуется Supabase.

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const loginSection = document.getElementById('login-section');
    const dashboardSection = document.getElementById('dashboard-section');
    const loginForm = document.getElementById('login-form');
    const loginEmail = document.getElementById('login-email');
    const loginPassword = document.getElementById('login-password');
    const adminNav = document.getElementById('admin-nav');

    const dashboardMainSection = document.getElementById('dashboard-main-section');

    const tariffsSection = document.getElementById('tariffs-section');
    const clientsSection = document.getElementById('clients-section');
    const rentalsSection = document.getElementById('rentals-section');
    const paymentsSection = document.getElementById('payments-section');
    const bikesSection = document.getElementById('bikes-section');
    const assignmentsSection = document.getElementById('assignments-section');
    const templatesSection = document.getElementById('templates-section');

    // Rentals elements
    const rentalsTableBody = document.querySelector('#rentals-table tbody');

    // Tariff elements
    const tariffTableBody = document.querySelector('#tariffs-table tbody');
    const tariffForm = document.getElementById('tariff-form');
    const tariffFormTitle = document.getElementById('tariff-form-title');
    const tariffIdInput = document.getElementById('tariff-id');
    const tariffTitleInput = document.getElementById('tariff-title');
    const tariffShortDescriptionInput = document.getElementById('tariff-short-description');
    const tariffDescriptionInput = document.getElementById('tariff-description');
    const tariffActiveCheckbox = document.getElementById('tariff-active');
    const tariffCancelBtn = document.getElementById('tariff-cancel-btn');
    const extensionsList = document.getElementById('extensions-list');
    const addExtensionBtn = document.getElementById('add-extension-btn');
    const contractTemplateSelect = document.getElementById('contract-template-select');

    // Client elements
    const clientsTableBody = document.querySelector('#clients-table tbody');
    const clientEditOverlay = document.getElementById('client-edit-overlay');
    const clientEditForm = document.getElementById('client-edit-form');
    const clientEditCancelBtn = document.getElementById('client-edit-cancel');
    const clientEditSaveBtn = document.getElementById('client-edit-save');
    const clientInfoOverlay = document.getElementById('client-info-overlay');
    const clientInfoContent = document.getElementById('client-info-content');
    const clientInfoCloseBtn = document.getElementById('client-info-close');
    const clientInfoCloseBtn2 = document.getElementById('client-info-close-2');
    const clientInfoEditToggle = document.getElementById('client-info-edit-toggle');
    const clientInfoSaveBtn = document.getElementById('client-info-save');
    const recognizedDisplay = document.getElementById('recognized-display');
    const recognizedEditForm = document.getElementById('recognized-edit-form');
    const imageViewerOverlay = document.getElementById('image-viewer-overlay');
    const imageViewerImg = document.getElementById('image-viewer-img');
    const imageViewerClose = document.getElementById('image-viewer-close');
    const imageViewerPrev = document.getElementById('image-viewer-prev');
    const imageViewerNext = document.getElementById('image-viewer-next');
    let viewerImages = [];
    let viewerIndex = 0;
    // keep last caret position inside template editor
    let lastSelRange = null;
    const exportBtn = document.getElementById('export-clients-btn');

    // Bike elements
    const bikesTableBody = document.querySelector('#bikes-table tbody');
    const bikeAddBtn = document.getElementById('bike-add-btn');
    const bikeForm = document.getElementById('bike-form');
    const bikeFormTitle = document.getElementById('bike-form-title');
    const bikeIdInput = document.getElementById('bike-id');
    const bikeCodeInput = document.getElementById('bike-code');
    const bikeModelInput = document.getElementById('bike-model');
    const bikeCitySelect = document.getElementById('bike-city');
    const bikeStatusSelect = document.getElementById('bike-status');
    const bikeFrameNumberInput = document.getElementById('bike-frame-number');
    const bikeBatteryNumbersInput = document.getElementById('bike-battery-numbers');
    const bikeRegistrationNumberInput = document.getElementById('bike-registration-number');
    const bikeIotDeviceIdInput = document.getElementById('bike-iot-device-id');
    const bikeAdditionalEquipmentInput = document.getElementById('bike-additional-equipment');
    const bikeCancelBtn = document.getElementById('bike-cancel-btn');

    // Assignment elements
    const assignmentsTableBody = document.querySelector('#assignments-table tbody');
    const assignBikeModal = document.getElementById('assign-bike-modal');
    const assignRentalIdInput = document.getElementById('assign-rental-id');
    const bikeSelect = document.getElementById('bike-select');
    const assignBikeCancelBtn = document.getElementById('assign-bike-cancel-btn');
    const assignBikeSubmitBtn = document.getElementById('assign-bike-submit-btn');
    const assignBikeFrameNumberInput = document.getElementById('assign-bike-frame-number');
    const assignBikeBatteryNumbersInput = document.getElementById('assign-bike-battery-numbers');
    const assignBikeRegistrationNumberInput = document.getElementById('assign-bike-registration-number');
    const assignBikeIotDeviceIdInput = document.getElementById('assign-bike-iot-device-id');
    const assignBikeAdditionalEquipmentInput = document.getElementById('assign-bike-additional-equipment');
    const bikeDetailsDiv = document.getElementById('bike-details');

    // Invoice elements
    const invoiceCreateBtn = document.getElementById('invoice-create-btn');
    const invoiceModal = document.getElementById('invoice-modal');
    const invoiceCancelBtn = document.getElementById('invoice-cancel-btn');
    const invoiceSubmitBtn = document.getElementById('invoice-submit-btn');
    const invoiceClientIdInput = document.getElementById('invoice-client-id');
    const invoiceAmountInput = document.getElementById('invoice-amount');
    const invoiceDescriptionInput = document.getElementById('invoice-description');

    // Templates elements
    const templatesTableBody = document.querySelector('#templates-table tbody');
    const templateNewBtn = document.getElementById('template-new-btn');
    const templateSaveBtn = document.getElementById('template-save-btn');
    const templateIdInput = document.getElementById('template-id');
    const templateNameInput = document.getElementById('template-name');
    const templateActiveCheckbox = document.getElementById('template-active');
    const templateEditor = document.getElementById('template-editor');
    const chipsClient = document.getElementById('chips-client');
    const chipsTariff = document.getElementById('chips-tariff');
    const chipsRental = document.getElementById('chips-rental');
    const chipsAux = document.getElementById('chips-aux');
    const editorToolbar = document.querySelector('.editor-toolbar');

    // --- State Variables ---
    let clientsData = []; // Кэш данных клиентов для просмотра/редактирования
    let currentEditingId = null;
    let currentEditingExtra = null;
    let templateEditorInstance = null; // TipTap editor instance

    // --- Map Logic (НОВЫЙ БЛОК) ---
    const adminMapSection = document.getElementById('admin-map-section');
    let myMap = null;
    let objectManager = null;
    let mapInitialized = false;
    let mapClientsData = []; // Храним данные клиентов для поиска на карте

    // Инициализация карты (вызывается один раз)
    function initAdminMap() {
        if (mapInitialized || !document.getElementById('admin-map-container')) {
            return;
        }
        mapInitialized = true; // Ставим флаг, что карта создана

        ymaps.ready(() => {
            myMap = new ymaps.Map("admin-map-container", {
                center: [55.76, 37.64], // Москва
                zoom: 10,
                controls: [] // Отключаем все стандартные элементы управления
            });

            objectManager = new ymaps.ObjectManager({ clusterize: true, gridSize: 64 });
            myMap.geoObjects.add(objectManager);

            // Загружаем данные сразу после инициализации
            loadAndDrawMapData();
            // Устанавливаем интервал обновления
            setInterval(loadAndDrawMapData, 20000);

            // Вешаем обработчики на поле поиска курьеров
            const courierSearchInput = document.getElementById('courier-search-input');
            const searchResults = document.getElementById('courier-search-results');

            if (courierSearchInput && searchResults) {
                let selectedIndex = -1;

                courierSearchInput.addEventListener('input', (e) => {
                    const query = e.target.value.toLowerCase().trim();
                    selectedIndex = -1;

                    if (query.length === 0) {
                        searchResults.style.display = 'none';
                        return;
                    }

                    const filteredClients = mapClientsData.filter(client =>
                        client.name.toLowerCase().includes(query)
                    );

                    if (filteredClients.length === 0) {
                        searchResults.style.display = 'none';
                        return;
                    }

                    searchResults.innerHTML = '';
                    filteredClients.forEach((client, index) => {
                        const resultItem = document.createElement('div');
                        resultItem.className = 'search-result-item';
                        resultItem.textContent = client.name;
                        resultItem.dataset.clientId = client.id;
                        resultItem.dataset.coords = `${client.location_geojson.coordinates[1]},${client.location_geojson.coordinates[0]}`;
                        resultItem.addEventListener('click', () => selectCourier(client));
                        searchResults.appendChild(resultItem);
                    });

                    searchResults.style.display = 'block';
                });

                courierSearchInput.addEventListener('keydown', (e) => {
                    const items = searchResults.querySelectorAll('.search-result-item');

                    if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
                        updateSelection(items);
                    } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        selectedIndex = Math.max(selectedIndex - 1, -1);
                        updateSelection(items);
                    } else if (e.key === 'Enter') {
                        e.preventDefault();
                        if (selectedIndex >= 0 && items[selectedIndex]) {
                            const client = mapClientsData.find(c => c.id == items[selectedIndex].dataset.clientId);
                            if (client) selectCourier(client);
                        }
                    } else if (e.key === 'Escape') {
                        searchResults.style.display = 'none';
                        courierSearchInput.blur();
                    }
                });

                // Скрываем результаты при клике вне поля поиска
                document.addEventListener('click', (e) => {
                    if (!courierSearchInput.contains(e.target) && !searchResults.contains(e.target)) {
                        searchResults.style.display = 'none';
                    }
                });

                function updateSelection(items) {
                    items.forEach((item, index) => {
                        item.classList.toggle('active', index === selectedIndex);
                    });
                }

                function selectCourier(client) {
                    if (!myMap) return;

                    const coords = [client.location_geojson.coordinates[1], client.location_geojson.coordinates[0]];
                    myMap.panTo(coords, { flying: true, duration: 1500 }).then(() => {
                        myMap.setZoom(15, { duration: 500 });
                    });

                    courierSearchInput.value = client.name;
                    searchResults.style.display = 'none';
                    courierSearchInput.blur();
                }
            }
        });
    }

    // Загрузка и отрисовка данных на карте
    async function loadAndDrawMapData() {
        if (!objectManager) {
            console.warn("ObjectManager не инициализирован. Загрузка данных отложена.");
            return;
        }

        try {
            const [bikesRes, clientsRes] = await Promise.all([
                supabase.rpc('get_bikes_with_locations'),
                supabase.rpc('get_clients_with_locations')
            ]);

            if (bikesRes.error) throw bikesRes.error;
            if (clientsRes.error) throw clientsRes.error;

            // Сохраняем данные клиентов для поиска
            mapClientsData = clientsRes.data.filter(c => c.location_geojson && c.location_geojson.coordinates);

            // Формирование объектов для карты
            const bikeFeatures = bikesRes.data.filter(b => b.location_geojson).map(bike => ({
                type: 'Feature',
                id: `bike_${bike.id}`,
                geometry: { type: 'Point', coordinates: [bike.location_geojson.coordinates[1], bike.location_geojson.coordinates[0]] },
                properties: {
                    hintContent: `${bike.model_name || 'Велосипед'} (${bike.bike_code})`,
                    balloonContent: `<strong>${bike.model_name}</strong><br>Код: ${bike.bike_code}<br>Статус: ${bike.status}`
                },
                options: { preset: 'islands#dotIcon', iconColor: getBikeIconColor(bike.status) }
            }));

            const clientFeatures = clientsRes.data.filter(c => c.location_geojson).map(client => ({
                type: 'Feature',
                id: `client_${client.id}`,
                geometry: { type: 'Point', coordinates: [client.location_geojson.coordinates[1], client.location_geojson.coordinates[0]] },
                properties: {
                    hintContent: `Курьер: ${client.name}`,
                    balloonContent: `<strong>${client.name}</strong><br>ID: ${client.id}`
                },
                options: { preset: 'islands#userIcon', iconColor: '#ff0000' }
            }));

            objectManager.removeAll();
            objectManager.add({ type: 'FeatureCollection', features: [...bikeFeatures, ...clientFeatures] });

        } catch (err) {
            console.error("Ошибка загрузки данных для карты:", err);
        }
    }

    function getBikeIconColor(status) {
        switch (status) {
            case 'available': return '#26b999';
            case 'rented': return '#1e98ff';
            case 'in_service': return '#f5a623';
            default: return '#777777';
        }
    }
    // --- Конец блока для карты ---

    // --- Supabase Initialization ---
    const SUPABASE_URL = 'https://avamqfmuhiwtlumjkzmv.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2YW1xZm11aGl3dGx1bWprem12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NjMyODcsImV4cCI6MjA3MjIzOTI4N30.EwEPM0pObAd3v_NXI89DLcgKVYrUiOn7iHuCXXaqU4I';
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // +++ ВСТАВЬТЕ ЭТОТ БЛОК КОДА ЗДЕСЬ +++
    // Вспомогательная функция для выполнения fetch-запросов с аутентификацией
    async function authedFetch(url, options = {}) {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            alert('Ваша сессия истекла. Пожалуйста, войдите заново.');
            // Можно добавить перезагрузку страницы для возврата на логин
            // window.location.reload();
            throw new Error('Нет активной сессии для выполнения запроса.');
        }

        const headers = {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY, // Наш публичный ключ
            'Authorization': `Bearer ${session.access_token}` // Токен текущего пользователя
        };

        const config = {
            ...options,
            headers: {
                ...headers,
                ...options.headers,
            },
        };

        return fetch(url, config);
    }
    // +++ КОНЕЦ БЛОКА ДЛЯ ВСТАВКИ +++

    function toggleButtonLoading(btn, isLoading, textIdle, textBusy) {
        if (!btn) return;
        btn.disabled = !!isLoading;
        btn.textContent = isLoading ? textBusy : textIdle;
    }

    // --- Tariff Extensions Logic ---

    // Helper: render client info modal (view + edit + photos + lightbox)
    async function renderClientInfo(clientId) {
        try {
            const { data: client, error } = await supabase.from('clients').select('*').eq('id', clientId).single();
            if (error) throw error;

            const rec = client?.recognized_passport_data || client?.extra?.recognized_data || {};
            if (recognizedDisplay) {
                recognizedDisplay.innerHTML = '';
                const keys = Object.keys(rec);
                if (keys.length === 0) {
                    recognizedDisplay.innerHTML = '<p>Данных распознавания нет.</p>';
                } else {
                    keys.forEach(k => {
                        const row = document.createElement('div');
                        row.className = 'info-row';
                        row.innerHTML = `<strong>${k}:</strong><span>${rec[k] ?? ''}</span>`;
                        recognizedDisplay.appendChild(row);
                    });
                }
            }
            if (recognizedEditForm) {
                recognizedEditForm.innerHTML = '';
                Object.keys(rec).forEach(k => {
                    const item = document.createElement('div');
                    item.className = 'form-group';
                    const val = (rec[k] ?? '').toString().replace(/"/g, '&quot;');
                    item.innerHTML = `<label>${k}</label><input type="text" name="${k}" value="${val}">`;
                    recognizedEditForm.appendChild(item);
                });
                recognizedEditForm.classList.add('hidden');
                if (clientInfoEditToggle) clientInfoEditToggle.textContent = 'Редактировать';
                if (clientInfoSaveBtn) clientInfoSaveBtn.classList.add('hidden');
            }

            // ---> ИСПРАВЛЕНИЕ №2: Используем Telegram ID для поиска фото <---
            const photosDiv = document.getElementById('photo-links');
            if (photosDiv) {
                photosDiv.innerHTML = 'Загрузка...';
                try {
                    // 1. Извлекаем Telegram ID из колонки extra
                    const telegramId = client?.extra?.telegram_user_id;

                    if (!telegramId) {
                        throw new Error('Telegram ID не найден в данных клиента.');
                    }

                    // 2. Ищем папку в Storage по Telegram ID
                    const { data: files, error: fErr } = await supabase.storage.from('passports').list(String(telegramId));
                    if (fErr) throw fErr;

                    if (!files || files.length === 0) {
                        photosDiv.innerHTML = '<p>Фото не найдены.</p>';
                        viewerImages = [];
                    } else {
                        photosDiv.innerHTML = '';
                        // 3. Строим публичные URL, используя Telegram ID
                        viewerImages = files.map(f => supabase.storage.from('passports').getPublicUrl(`${telegramId}/${f.name}`).data.publicUrl);

                        viewerIndex = 0;
                        viewerImages.forEach(u => {
                            const img = document.createElement('img');
                            img.src = u;
                            img.className = 'client-photo-thumb';
                            img.addEventListener('click', () => {
                                if (imageViewerOverlay && imageViewerImg) {
                                    imageViewerImg.src = u;
                                    viewerIndex = viewerImages.indexOf(u);
                                    imageViewerOverlay.classList.remove('hidden');
                                }
                            });
                            photosDiv.appendChild(img);
                        });

                        // Add video if exists
                        if (client?.extra?.video_selfie_storage_path) {
                            const videoUrl = supabase.storage.from('passports').getPublicUrl(client.extra.video_selfie_storage_path).data.publicUrl;
                            const video = document.createElement('video');
                            video.src = videoUrl;
                            video.controls = true;
                            video.className = 'client-video-thumb';
                            video.style.maxWidth = '200px';
                            video.style.marginTop = '10px';
                            photosDiv.appendChild(video);
                        }
                    }
                } catch (e) {
                    photosDiv.innerHTML = `<p style="color:red;">Ошибка загрузки фото: ${e.message}</p>`;
                }
            }

            // Toggle edit/view
            currentEditingId = client.id;
            currentEditingExtra = client.extra || {};
            if (clientInfoSaveBtn) {
                clientInfoSaveBtn.onclick = async () => {
                    const formData = new FormData(recognizedEditForm);
                    const updated = {};
                    for (const [k, v] of formData.entries()) updated[k] = String(v);
                    const { error: uerr } = await supabase.from('clients').update({ recognized_passport_data: updated }).eq('id', currentEditingId);
                    if (uerr) { alert('Ошибка сохранения: ' + uerr.message); return; }
                    // refresh view
                    recognizedDisplay.innerHTML = '';
                    Object.keys(updated).forEach(k => {
                        const r = document.createElement('div');
                        r.className = 'info-row';
                        r.innerHTML = `<strong>${k}:</strong><span>${updated[k]}</span>`;
                        recognizedDisplay.appendChild(r);
                    });
                    clientInfoEditToggle.click();
                };
            }

            // Toggle edit/view functionality
            if (clientInfoEditToggle) {
                clientInfoEditToggle.onclick = () => {
                    const editing = !recognizedEditForm.classList.contains('hidden');
                    if (editing) {
                        recognizedEditForm.classList.add('hidden');
                        recognizedDisplay.classList.remove('hidden');
                        clientInfoEditToggle.textContent = 'Редактировать';
                        if (clientInfoSaveBtn) clientInfoSaveBtn.classList.add('hidden');
                    } else {
                        recognizedEditForm.classList.remove('hidden');
                        recognizedDisplay.classList.add('hidden');
                        clientInfoEditToggle.textContent = 'Просмотр';
                        if (clientInfoSaveBtn) clientInfoSaveBtn.classList.remove('hidden');
                    }
                };
            }

            // lightbox arrows
            if (imageViewerPrev) imageViewerPrev.onclick = () => {
                if (!viewerImages.length) return;
                viewerIndex = (viewerIndex - 1 + viewerImages.length) % viewerImages.length;
                imageViewerImg.src = viewerImages[viewerIndex];
            };
            if (imageViewerNext) imageViewerNext.onclick = () => {
                if (!viewerImages.length) return;
                viewerIndex = (viewerIndex + 1) % viewerImages.length;
                imageViewerImg.src = viewerImages[viewerIndex];
            };
        } catch (e) {
            console.error('Ошибка подготовки карточки клиента:', e);
        }
    }

    function addExtensionRow(daysVal = '', priceVal = '') {
        if (!extensionsList) return;
        const row = document.createElement('div');
        row.className = 'extension-row';
        row.innerHTML = `
            <input type="number" placeholder="Дней" value="${daysVal}" class="ext-days">
            <input type="number" placeholder="Стоимость (₽)" value="${priceVal}" class="ext-price">
            <button type="button" class="remove-extension-btn" title="Удалить">×</button>
        `;
        row.querySelector('.remove-extension-btn').addEventListener('click', () => row.remove());
        extensionsList.appendChild(row);
    }

    function renderExtensions(extArr) {
        if (!extensionsList) return;
        extensionsList.innerHTML = '';
        if (Array.isArray(extArr)) {
            extArr.forEach(ext => {
                const d = ext?.days || ext?.duration;
                const c = ext?.cost || ext?.price;
                addExtensionRow(d || '', c || '');
            });
        }
    }

    function getExtensionsFromForm() {
        if (!extensionsList) return [];
        return Array.from(extensionsList.querySelectorAll('.extension-row')).map(row => {
            const days = parseInt(row.querySelector('.ext-days').value, 10);
            const cost = parseInt(row.querySelector('.ext-price').value, 10);
            return { days, cost };
        }).filter(ext => !isNaN(ext.days) && !isNaN(ext.cost) && ext.days > 0 && ext.cost >= 0);
    }

    if (addExtensionBtn) {
        addExtensionBtn.addEventListener('click', () => addExtensionRow());
    }

    // --- Authentication and Navigation ---

    async function checkSession() {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            showDashboard();
        }
    }

    function showDashboard() {
        loginSection.classList.add('hidden');
        dashboardSection.classList.remove('hidden');
        selectSection('dashboard-main');
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = loginEmail.value;
        const password = loginPassword.value;
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            alert('Ошибка входа: ' + error.message);
        } else if (data.user) {
            showDashboard();
        }
    });

    adminNav.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-section]');
        if (!btn) return;
        const target = btn.dataset.section;
        adminNav.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectSection(target);
    });

    function selectSection(name) {
        // Скрываем все секции
        document.querySelectorAll('.admin-section').forEach(sec => sec.classList.add('hidden'));

        const sectionMap = {
            'dashboard-main': { element: dashboardMainSection, loader: loadDashboardData },
            'tariffs': { element: tariffsSection, loader: loadTariffs },
            'clients': { element: clientsSection, loader: loadClients },
            'rentals': { element: rentalsSection, loader: loadRentals },
            'payments': { element: paymentsSection, loader: loadPayments },
            'bikes': { element: bikesSection, loader: loadBikes },
            'assignments': { element: assignmentsSection, loader: loadAssignments },
            'templates': { element: templatesSection, loader: loadTemplates },
            'admin-map': { element: adminMapSection, loader: initAdminMap }, // <-- ИЗМЕНЕНИЕ
        };

        const section = sectionMap[name];
        if (section && section.element) {
            section.element.classList.remove('hidden'); // Показываем нужную секцию
            if (section.loader) {
                section.loader(); // Вызываем её загрузчик/инициализатор
            }
        }
    }

    // --- Tariffs CRUD ---

    function formatExtensionsForDisplay(exts) {
        if (!Array.isArray(exts) || exts.length === 0) return 'Не заданы';
        return exts.map(e => `${e.days} дн. - ${e.cost} ₽`).join('<br>');
    }

    async function loadTariffs() {
        tariffTableBody.innerHTML = '<tr><td colspan="5">Загрузка...</td></tr>';
        try {
            const { data, error } = await supabase.from('tariffs').select('*').order('id', { ascending: true });
            if (error) throw error;
            tariffTableBody.innerHTML = '';
            if (!data || data.length === 0) {
                tariffTableBody.innerHTML = '<tr><td colspan="5">Тарифы еще не созданы.</td></tr>';
                return;
            }
            data.forEach(t => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><a href="#" class="tariff-name-link" data-id="${t.id}" style="color: var(--primary-color); text-decoration: none;">${t.title}</a></td>
                    <td>${t.short_description || ''}</td>
                    <td>${formatExtensionsForDisplay(t.extensions)}</td>
                    <td>${t.is_active ? 'Да' : 'Нет'}</td>
                    <td>
                        <button type="button" class="preview-tariff-btn" data-id="${t.id}">Предпросмотр</button>
                        <button type="button" class="edit-tariff-btn" data-id="${t.id}">Ред.</button>
                        <button type="button" class="delete-tariff-btn" data-id="${t.id}">Удалить</button>
                    </td>`;
                tariffTableBody.appendChild(tr);
            });
        } catch (err) {
            console.error('Ошибка загрузки тарифов:', err);
            tariffTableBody.innerHTML = `<tr><td colspan="5">Ошибка: ${err.message}</td></tr>`;
        }
    }

    tariffForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        let tariffId = tariffIdInput.value;
        const extArr = getExtensionsFromForm();
        if (extArr.length === 0) {
            alert('Необходимо добавить хотя бы одно продление (дни и стоимость).');
            return;
        }
        const newTariffData = {
            title: tariffTitleInput.value,
            description: tariffDescriptionInput.value,
            short_description: tariffShortDescriptionInput.value,
            is_active: tariffActiveCheckbox.checked,
            price_rub: extArr.length > 0 ? extArr[0].cost : 0, // for legacy compatibility
            duration_days: extArr.length > 0 ? extArr[0].days : 0, // for legacy compatibility
            extensions: extArr
        };
        if (!tariffId) {
            newTariffData.slug = tariffTitleInput.value.trim().toLowerCase().replace(/\s+/g, '-');
        }
        try {
            const result = tariffId
                ? await supabase.from('tariffs').update(newTariffData).eq('id', tariffId)
                : await supabase.from('tariffs').insert([newTariffData]);
            if (result.error) throw result.error;
            await loadTariffs();
            resetTariffForm();
        } catch (err) {
            alert('Ошибка сохранения тарифа: ' + err.message);
        }
    });

    tariffTableBody.addEventListener('click', async (e) => {
        const nameLink = e.target.closest('.tariff-name-link');
        if (nameLink) {
            e.preventDefault();
            previewTariffFull(nameLink.dataset.id);
            return;
        }

        const previewBtn = e.target.closest('.preview-tariff-btn');
        if (previewBtn) {
            const tariffId = previewBtn.dataset.id;
            await showClientTariffPreview(tariffId);
            return;
        }

        const editBtn = e.target.closest('.edit-tariff-btn');
        if (editBtn) {
            editTariff(editBtn.dataset.id);
            return;
        }

        const deleteBtn = e.target.closest('.delete-tariff-btn');
        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            if (confirm(`Вы уверены, что хотите удалить тариф с ID ${id}? Это действие необратимо.`)) {
                try {
                    const { error } = await supabase.from('tariffs').delete().eq('id', id);
                    if (error) throw error;
                    alert('Тариф успешно удален.');
                    loadTariffs();
                } catch (err) {
                    alert('Ошибка удаления: ' + err.message);
                }
            }
        }
    });

    async function editTariff(id) {
        try {
            const { data, error } = await supabase.from('tariffs').select('*').eq('id', id).single();
            if (error) throw error;
            tariffIdInput.value = data.id;
            tariffTitleInput.value = data.title;
            document.getElementById('tariff-short-description').value = data.short_description || '';
            tariffDescriptionInput.value = data.description || '';
            tariffActiveCheckbox.checked = data.is_active;
            renderExtensions(data.extensions);
            tariffFormTitle.textContent = 'Редактировать тариф';
            tariffCancelBtn.classList.remove('hidden');
        } catch (err) {
            alert('Ошибка загрузки тарифа для редактирования: ' + err.message);
        }
    }

    function resetTariffForm() {
        tariffForm.reset();
        tariffIdInput.value = '';
        if (extensionsList) extensionsList.innerHTML = '';
        tariffFormTitle.textContent = 'Создать новый тариф';
        tariffCancelBtn.classList.add('hidden');
    }

    tariffCancelBtn.addEventListener('click', resetTariffForm);

    async function previewTariffCard(id) {
        try {
            const { data, error } = await supabase.from('tariffs').select('*').eq('id', id).single();
            if (error) throw error;
            const content = document.getElementById('tariff-preview-content');
            content.innerHTML = `
                <div style="border: 1px solid #ddd; padding: 16px; border-radius: 12px; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <strong style="display: block; font-size: 1.2rem; margin-bottom: 8px;">${data.title}</strong>
                    <span style="display: block; font-size: 1rem; color: #666; margin-bottom: 8px;">${data.price_rub} ₽ / ${data.duration_days} дней</span>
                    <p style="font-size: 0.9rem; color: #888; margin: 0;">${data.short_description || ''}</p>
                </div>
            `;
            document.getElementById('tariff-preview-modal').classList.remove('hidden');
        } catch (err) {
            alert('Ошибка предпросмотра: ' + err.message);
        }
    }

    async function previewTariffFull(id) {
        try {
            const { data, error } = await supabase.from('tariffs').select('*').eq('id', id).single();
            if (error) throw error;
            const content = document.getElementById('tariff-preview-content');
            content.innerHTML = `
                <div style="border: 1px solid var(--progress-bar-bg); padding: 16px; border-radius: 8px; background: var(--card-bg);">
                    <h3>${data.title}</h3>
                    <p><strong>Цена:</strong> ${data.price_rub} ₽</p>
                    <p><strong>Длительность:</strong> ${data.duration_days} дней</p>
                    <p><strong>Описание:</strong></p>
                    <div style="white-space: pre-wrap;">${data.description || ''}</div>
                </div>
            `;
            document.getElementById('tariff-preview-modal').classList.remove('hidden');
        } catch (err) {
            alert('Ошибка предпросмотра: ' + err.message);
        }
    }

    document.getElementById('tariff-preview-close-btn').addEventListener('click', () => {
        document.getElementById('tariff-preview-modal').classList.add('hidden');
    });

    document.getElementById('tariff-preview-modal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('tariff-preview-modal')) {
            document.getElementById('tariff-preview-modal').classList.add('hidden');
        }
    });

    // --- Refund Logic ---
    const refundModal = document.getElementById('refund-modal');
    const refundCancelBtn = document.getElementById('refund-cancel-btn');
    const refundSubmitBtn = document.getElementById('refund-submit-btn');
    const refundPaymentIdInput = document.getElementById('refund-payment-id');
    const refundAmountInput = document.getElementById('refund-amount');
    const refundReasonInput = document.getElementById('refund-reason');
    const paymentsTableBody = document.querySelector('#payments-table tbody');

    if (paymentsTableBody) {
        paymentsTableBody.addEventListener('click', (e) => {
            const refundBtn = e.target.closest('.refund-btn');
            if (refundBtn) {
                const paymentId = refundBtn.dataset.paymentId;
                const amount = refundBtn.dataset.amount;
                refundPaymentIdInput.value = paymentId;
                refundAmountInput.value = amount;
                refundModal.classList.remove('hidden');
            }
        });
    }

    if (refundCancelBtn) {
        refundCancelBtn.addEventListener('click', () => refundModal.classList.add('hidden'));
    }
    if (refundModal) {
        refundModal.addEventListener('click', (e) => {
            if (e.target === refundModal) refundModal.classList.add('hidden');
        });
    }

    if (refundSubmitBtn) {
        refundSubmitBtn.addEventListener('click', async () => {
            const payment_id = refundPaymentIdInput.value;
            const amount = refundAmountInput.value;
            const reason = refundReasonInput.value;

            if (!payment_id || !amount) {
                alert('ID платежа и сумма обязательны.');
                return;
            }

            toggleButtonLoading(refundSubmitBtn, true, 'Выполнить возврат', 'Обработка...');

            try {
                const response = await authedFetch('/api/admin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'create-refund', payment_id, amount, reason })
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || `Ошибка сервера: ${response.status}`);
                }

                alert(result.message || 'Запрос на возврат успешно отправлен.');
                refundModal.classList.add('hidden');
                loadPayments(); // Refresh the payments list

            } catch (err) {
                alert('Ошибка возврата: ' + err.message);
            } finally {
                toggleButtonLoading(refundSubmitBtn, false, 'Выполнить возврат', 'Обработка...');
            }
        });
    }

    // --- Bikes CRUD ---
    async function showBikeForm(bike = null) {
        bikeForm.classList.remove('hidden');
        bikeFormTitle.classList.remove('hidden');

        // Загружаем тарифы в выпадающий список
        const tariffSelect = document.getElementById('bike-tariff-select');
        const { data, error } = await supabase.rpc('get_all_tariffs');
        if (error) {
            console.error('Ошибка загрузки тарифов:', error);
            return;
        }
        tariffSelect.innerHTML = '<option value="">-- Не выбран --</option>';
        data.forEach(tariff => {
            const option = document.createElement('option');
            option.value = tariff.id;
            option.textContent = tariff.title;
            tariffSelect.appendChild(option);
        });

        // Если редактируем, выбираем текущий тариф велосипеда
        if (bike) {
            tariffSelect.value = bike.tariff_id || '';
        }
    }); if (bike) {
        bikeFormTitle.textContent = 'Редактировать велосипед';
        bikeIdInput.value = bike.id;
        bikeCodeInput.value = bike.bike_code;
        bikeModelInput.value = bike.model_name;
        bikeCitySelect.value = bike.city || '';
        bikeStatusSelect.value = bike.status;
        bikeFrameNumberInput.value = bike.frame_number || '';
        bikeBatteryNumbersInput.value = Array.isArray(bike.battery_numbers) ? bike.battery_numbers.join(', ') : (bike.battery_numbers || '');
        bikeRegistrationNumberInput.value = bike.registration_number || '';
        bikeIotDeviceIdInput.value = bike.iot_device_id || '';
        bikeAdditionalEquipmentInput.value = bike.additional_equipment || '';
    } else {
    bikeFormTitle.textContent = 'Новый велосипед';
    bikeForm.reset();
    bikeIdInput.value = '';
    bikeFrameNumberInput.value = '';
    bikeBatteryNumbersInput.value = '';
    bikeRegistrationNumberInput.value = '';
    bikeIotDeviceIdInput.value = '';
    bikeAdditionalEquipmentInput.value = '';
}
    }

function hideBikeForm() {
    bikeForm.classList.add('hidden');
    bikeFormTitle.classList.add('hidden');
    bikeForm.reset();
    bikeIdInput.value = '';
    bikeFrameNumberInput.value = '';
    bikeBatteryNumbersInput.value = '';
    bikeRegistrationNumberInput.value = '';
    bikeIotDeviceIdInput.value = '';
    bikeAdditionalEquipmentInput.value = '';
}

async function loadBikes() {
    if (!bikesTableBody) return;
    bikesTableBody.innerHTML = '<tr><td colspan="7">Загрузка...</td></tr>'; // Увеличили colspan
    try {
        const { data, error } = await supabase.from('bikes').select('*, tariffs(title)').order('id', { ascending: true });
        if (error) throw error;
        bikesTableBody.innerHTML = '';
        if (!data || data.length === 0) {
            bikesTableBody.innerHTML = '<tr><td colspan="7">Велосипеды еще не добавлены.</td></tr>';
            return;
        }
        data.forEach(bike => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                    <td>${bike.id}</td>
                    <td>${bike.bike_code}</td>
                    <td>${bike.model_name || ''}</td>
                    <td>${bike.tariffs?.title || '<em>Не указан</em>'}</td>
                    <td>${bike.city || ''}</td>
                    <td>${bike.status}</td>
                    <td class="table-actions">
                        <button type="button" class="edit-bike-btn" data-id="${bike.id}">Ред.</button>
                        <button type="button" class="delete-bike-btn" data-id="${bike.id}">Удалить</button>
                    </td>`;
            bikesTableBody.appendChild(tr);
        });
    } catch (err) {
        console.error('Ошибка загрузки велосипедов:', err);
        bikesTableBody.innerHTML = `<tr><td colspan="7">Ошибка: ${err.message}</td></tr>`;
    }
}

if (bikeAddBtn) {
    bikeAddBtn.addEventListener('click', () => showBikeForm());
}
if (bikeCancelBtn) {
    bikeCancelBtn.addEventListener('click', hideBikeForm);
}

if (bikeForm) {
    bikeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = bikeIdInput.value;
        const batteryNumbers = bikeBatteryNumbersInput.value.split(',').map(s => s.trim()).filter(s => s);
        const bikeData = {
            bike_code: bikeCodeInput.value,
            model_name: bikeModelInput.value,
            city: bikeCitySelect.value,
            status: bikeStatusSelect.value,
            tariff_id: document.getElementById('bike-tariff-select').value || null,
            frame_number: bikeFrameNumberInput.value,
            battery_numbers: batteryNumbers,
            registration_number: bikeRegistrationNumberInput.value,
            iot_device_id: bikeIotDeviceIdInput.value,
            additional_equipment: bikeAdditionalEquipmentInput.value,
        };

        try {
            const { error } = id
                ? await supabase.from('bikes').update(bikeData).eq('id', id)
                : await supabase.from('bikes').insert([bikeData]);
            if (error) throw error;
            await loadBikes();
            hideBikeForm();
        } catch (err) {
            alert('Ошибка сохранения велосипеда: ' + err.message);
        }
    });
}

if (bikesTableBody) {
    bikesTableBody.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.edit-bike-btn');
        if (editBtn) {
            const id = editBtn.dataset.id;
            const { data, error } = await supabase.from('bikes').select('*').eq('id', id).single();
            if (error) {
                alert('Не удалось загрузить данные велосипеда: ' + error.message);
            } else {
                showBikeForm(data);
            }
            return;
        }

        const deleteBtn = e.target.closest('.delete-bike-btn');
        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            if (confirm(`Вы уверены, что хотите удалить велосипед с ID ${id}?`)) {
                try {
                    const { error } = await supabase.from('bikes').delete().eq('id', id);
                    if (error) throw error;
                    await loadBikes();
                } catch (err) {
                    alert('Ошибка удаления велосипеда: ' + err.message);
                }
            }
        }
    });
}

// --- Clients Logic ---

async function loadClients() {
    clientsTableBody.innerHTML = '<tr><td colspan="8">Загрузка клиентов...</td></tr>';
    try {
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        clientsData = data || [];
        clientsTableBody.innerHTML = '';

        if (clientsData.length === 0) {
            clientsTableBody.innerHTML = '<tr><td colspan="8">Клиенты не найдены.</td></tr>';
            return;
        }

        clientsData.forEach(client => {
            const tr = document.createElement('tr');
            const date = new Date(client.created_at).toLocaleDateString();
            const status = client.verification_status || 'not_set';
            const tags = client.extra?.tags || [];

            let statusBadge = '';
            switch (status) {
                case 'approved': statusBadge = '<span class="status-badge status-approved">Одобрен</span>'; break;
                case 'rejected': statusBadge = '<span class="status-badge status-rejected">Отклонен</span>'; break;
                case 'pending': statusBadge = '<span class="status-badge status-pending">На проверке</span>'; break;
                default: statusBadge = '<span>Не задан</span>';
            }

            const verificationButtons = status === 'pending' || status === 'needs_confirmation'
                ? `<button type="button" class="approve-btn" data-id="${client.id}">Одобрить</button> <button type="button" class="reject-btn" data-id="${client.id}">Отклонить</button>`
                : '';
            const tagsHtml = tags.map(tag => `<span class="chip" style="background-color: #eef7ff; border-color: #cfe6ff; color: #004a80; margin: 2px;">${tag}</span>`).join('');

            tr.innerHTML = `
                <td>${client.name}</td>
                <td>${client.phone || ''}</td>
                <td>${statusBadge}</td>
                <td><div class="chips">${tagsHtml}</div></td>
                <td>${date}</td>
                <td><button type="button" class="view-client-btn" data-id="${client.id}">Инфо/Фото</button></td>
                <td>${verificationButtons}</td>
                <td><button type="button" class="delete-client-btn btn-danger" data-id="${client.id}" style="background-color:#e53e3e;color:white;">Удалить</button></td>`;
            clientsTableBody.appendChild(tr);
        });
    } catch (err) {
        console.error('Ошибка загрузки клиентов:', err);
        clientsTableBody.innerHTML = `<tr><td colspan="9">Ошибка: ${err.message}</td></tr>`;
    }
}

clientsTableBody.addEventListener('click', async (e) => {
    const target = e.target;
    const clientId = target.dataset.id;

    if (!clientId) return;

    let newStatus = '';
    if (target.classList.contains('approve-btn')) newStatus = 'approved';
    if (target.classList.contains('reject-btn')) newStatus = 'rejected';

    if (newStatus) {
        if (!confirm(`Вы уверены, что хотите изменить статус клиента #${clientId} на "${newStatus}"?`)) return;

        try {
            const { error } = await supabase
                .from('clients')
                .update({ verification_status: newStatus })
                .eq('id', clientId);

            if (error) throw error;

            alert('Статус клиента успешно обновлен!');
            loadClients(); // Перезагружаем список, чтобы увидеть изменения
        } catch (err) {
            alert(`Ошибка обновления статуса: ${err.message}`);
        }
        return;
    }

    if (target.classList.contains('delete-client-btn')) {
        if (confirm(`ВНИМАНИЕ!\n\nВы уверены, что хотите НАВСЕГДА удалить клиента с ID ${clientId}?\n\nЭто действие также удалит всю его историю аренд и платежей. Отменить это будет невозможно.`)) {
            try {
                target.disabled = true;
                target.textContent = 'Удаление...';

                // Сначала удаляем связанные записи, чтобы избежать ошибок внешнего ключа
                await supabase.from('payments').delete().eq('client_id', clientId);
                await supabase.from('rentals').delete().eq('user_id', clientId);

                // Наконец, удаляем самого клиента
                const { error } = await supabase.from('clients').delete().eq('id', clientId);
                if (error) throw error;

                alert('Клиент успешно удален.');
                loadClients(); // Обновляем список
            } catch (err) {
                alert(`Ошибка удаления: ${err.message}`);
                target.disabled = false;
                target.textContent = 'Удалить';
            }
        }
    }
});
// --- Rentals and Payments Loaders ---

async function loadRentals() {
    const tbody = document.querySelector('#rentals-table tbody');
    tbody.innerHTML = '<tr><td colspan="8">Загрузка...</td></tr>';
    try {
        const statusRuMap = {
            'active': 'Активна',
            'awaiting_contract_signing': 'Ожидает подписания',
            'completed_by_admin': 'Завершено админом',
            'pending_assignment': 'Ожидает велосипед',
            'completed': 'Завершена',
            'rejected': 'Отклонена'
        };

        const { data, error } = await supabase
            .from('rentals')
            .select('id, user_id, bike_id, starts_at, current_period_ends_at, total_paid_rub, status, clients (name, phone)')
            .order('starts_at', { ascending: false });

        if (error) throw error;
        tbody.innerHTML = '';
        (data || []).forEach(r => {
            const tr = document.createElement('tr');
            const start = r.starts_at ? new Date(r.starts_at).toLocaleString('ru-RU') : '—';
            const end = r.current_period_ends_at ? new Date(r.current_period_ends_at).toLocaleString('ru-RU') : '—';
            const statusText = statusRuMap[r.status] || r.status;

            // --- НОВАЯ ЛОГИКА ДЛЯ КНОПОК ДЕЙСТВИЙ ---
            let actionsCell = `<button type="button" class="edit-rental-btn" data-id="${r.id}">Ред.</button>`;

            if (r.status === 'active') {
                const signatureUrl = supabase.storage.from('contracts').getPublicUrl(`signatures/${r.user_id}/${r.id}.png`).data.publicUrl;
                actionsCell += `
                        <button type="button" class="end-rental-btn" data-id="${r.id}">Завершить</button>
                        <a href="${signatureUrl}" target="_blank" class="btn btn-secondary" style="padding: 6px 10px; text-decoration: none;">Договор</a>
                    `;
            }

            tr.innerHTML = `
                    <td>${r.clients?.name || 'Н/Д'}</td>
                    <td>${r.clients?.phone || 'Н/Д'}</td>
                    <td>${r.bike_id || '—'}</td>
                    <td>${start}</td>
                    <td>${end}</td>
                    <td>${typeof r.total_paid_rub === 'number' ? r.total_paid_rub : 0}</td>
                    <td>${statusText}</td>
                    <td class="table-actions">${actionsCell}</td>
                `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="8">Ошибка загрузки аренд: ${err.message}</td></tr>`;
    }
}

// --- Логика для редактирования и управления арендой (ОБЪЕДИНЕННЫЙ БЛОК) ---
const rentalEditModal = document.getElementById('rental-edit-modal');
const rentalEditCancelBtn = document.getElementById('rental-edit-cancel-btn');
const rentalEditSaveBtn = document.getElementById('rental-edit-save-btn');
const rentalIdInput = document.getElementById('rental-edit-id');
const rentalBikeSelect = document.getElementById('rental-edit-bike');
const rentalEndDateInput = document.getElementById('rental-edit-end-date');
const rentalStatusSelect = document.getElementById('rental-edit-status');

if (rentalsTableBody) {
    rentalsTableBody.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.edit-rental-btn');
        const endBtn = e.target.closest('.end-rental-btn');

        // --- ОБРАБОТЧИК КНОПКИ "РЕДАКТИРОВАТЬ" ---
        if (editBtn) {
            const rentalId = editBtn.dataset.id;
            try {
                const { data: rentalData, error: rentalError } = await supabase
                    .from('rentals')
                    .select('*, bikes(*)')
                    .eq('id', rentalId)
                    .single();
                if (rentalError) throw rentalError;

                const { data: availableBikes, error: bikesError } = await supabase
                    .from('bikes')
                    .select('*')
                    .eq('status', 'available');
                if (bikesError) throw bikesError;

                rentalBikeSelect.innerHTML = '';
                if (rentalData.bikes) {
                    const currentBikeOption = new Option(`${rentalData.bikes.model_name} (#${rentalData.bikes.bike_code}) - Текущий`, rentalData.bike_id);
                    rentalBikeSelect.add(currentBikeOption);
                }
                availableBikes.forEach(bike => {
                    if (bike.id !== rentalData.bike_id) {
                        const option = new Option(`${bike.model_name} (#${bike.bike_code})`, bike.id);
                        rentalBikeSelect.add(option);
                    }
                });

                rentalIdInput.value = rentalData.id;
                rentalBikeSelect.value = rentalData.bike_id;
                rentalStatusSelect.value = rentalData.status;

                if (rentalData.current_period_ends_at) {
                    const date = new Date(rentalData.current_period_ends_at);
                    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
                    rentalEndDateInput.value = date.toISOString().slice(0, 16);
                }

                rentalEditModal.classList.remove('hidden');
            } catch (err) {
                alert('Ошибка загрузки данных аренды: ' + err.message);
            }
        }

        // --- ОБРАБОТЧИК КНОПКИ "ЗАВЕРШИТЬ" ---
        if (endBtn) {
            const rentalId = endBtn.dataset.id;
            if (confirm(`Вы уверены, что хотите принудительно завершить аренду с ID ${rentalId}?`)) {
                try {
                    const { error } = await supabase
                        .from('rentals').update({ status: 'completed_by_admin' }).eq('id', rentalId);
                    if (error) throw error;
                    alert('Аренда успешно завершена.');
                    loadRentals();
                } catch (err) {
                    alert('Ошибка завершения аренды: ' + err.message);
                }
            }
        }
    });
}

if (rentalEditCancelBtn) {
    rentalEditCancelBtn.addEventListener('click', () => rentalEditModal.classList.add('hidden'));
}

if (rentalEditSaveBtn) {
    rentalEditSaveBtn.addEventListener('click', async () => {
        const id = rentalIdInput.value;
        const endDateISO = rentalEndDateInput.value
            ? new Date(rentalEndDateInput.value).toISOString()
            : null;

        const updateData = {
            bike_id: rentalBikeSelect.value,
            current_period_ends_at: endDateISO,
            status: rentalStatusSelect.value
        };

        toggleButtonLoading(rentalEditSaveBtn, true, 'Сохранить', 'Сохранение...');
        try {
            const { error } = await supabase.from('rentals').update(updateData).eq('id', id);
            if (error) throw error;
            alert('Аренда успешно обновлена!');
            rentalEditModal.classList.add('hidden');
            loadRentals();
        } catch (err) {
            alert('Ошибка сохранения: ' + err.message);
        } finally {
            toggleButtonLoading(rentalEditSaveBtn, false, 'Сохранить', '...');
        }
    });
}

function renderPaymentsChart(paymentsData) {
    const chartCanvas = document.getElementById('payments-chart');
    if (!chartCanvas) return; // Don't do anything if canvas isn't on the page

    if (window.paymentsChart instanceof Chart) {
        window.paymentsChart.destroy();
    }

    // --- ИЗМЕНЕНИЕ №1: Правильный подсчет дохода (учитываем списания) ---
    // Убираем фильтр "p.amount_rub > 0", чтобы суммировались все успешные транзакции.
    const successfulPayments = (paymentsData || []).filter(p => p.status === 'succeeded');

    const paymentsByDay = successfulPayments.reduce((acc, p) => {
        const day = new Date(p.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
        acc[day] = (acc[day] || 0) + p.amount_rub;
        return acc;
    }, {});

    const labels = Object.keys(paymentsByDay).reverse();
    const chartData = Object.values(paymentsByDay).reverse();
    const today = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });

    window.paymentsChart = new Chart(chartCanvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Доход по дням, ₽',
                data: chartData,
                // --- ИЗМЕНЕНИЕ №2: Замена красного цвета на темно-зеленый для "сегодня" ---
                backgroundColor: (context) => {
                    const label = labels[context.dataIndex];
                    // Если сегодня - используем темно-зеленый, в остальные дни - обычный зеленый.
                    return label === today ? 'rgba(8, 56, 48, 0.8)' : 'rgba(38, 185, 153, 0.6)';
                },
                borderColor: (context) => {
                    const label = labels[context.dataIndex];
                    return label === today ? 'rgba(8, 56, 48, 1)' : 'rgba(38, 185, 153, 1)';
                },
                borderWidth: 1,
                borderRadius: 4,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true },
                x: { grid: { display: false } }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#083830',
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 12 },
                    padding: 10,
                    cornerRadius: 8,
                    displayColors: false,
                }
            }
        }
    });
}

async function loadPayments() {
    const tbody = document.querySelector('#payments-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7">Загрузка...</td></tr>';
    try {
        const { data, error } = await supabase
            .from('payments')
            .select('id, yookassa_payment_id, amount_rub, payment_method_title, payment_type, status, created_at, description, clients (name)')
            .order('created_at', { ascending: false });
        if (error) throw error;
        tbody.innerHTML = '';
        (data || []).forEach(p => {
            const statusRuMap = { succeeded: 'Успешно', pending: 'Ожидает', canceled: 'Отменён', failed: 'Ошибка', refunded: 'Возвращено' };

            // Получаем данные для каждой колонки
            let method = p.payment_method_title || '—';
            const description = p.description || '—';           // Это "Начало аренды"
            const status = statusRuMap[p.status] || p.status || '';

            // Улучшенная логика отображения метода оплаты
            if (p.payment_type === 'balance') {
                method = 'С баланса приложения';
            } else if (p.payment_method_title === 'Saved method') {
                method = 'Карта/SBP клиента';
            } else if (p.payment_method_title && p.payment_method_title !== '—') {
                method = p.payment_method_title; // Оставляем как есть для других случаев
            } else {
                method = '—';
            }

            const actionsCell = (p.status === 'succeeded' && p.status !== 'refunded' && p.yookassa_payment_id && !p.yookassa_payment_id.startsWith('manual'))
                ? `<button type="button" class="refund-btn" data-payment-id="${p.yookassa_payment_id}" data-amount="${p.amount_rub}">Вернуть</button>`
                : '';

            const tr = document.createElement('tr');
            const dateObj = p.created_at ? new Date(p.created_at) : null;
            const dateStr = dateObj ? dateObj.toLocaleDateString('ru-RU') : '—';
            const timeStr = dateObj ? dateObj.toLocaleTimeString('ru-RU') : '';

            // Собираем строку таблицы с новой колонкой
            tr.innerHTML = `
                    <td>${p.clients?.name || 'Н/Д'}</td>
                    <td>${p.amount_rub ?? 0}</td>
                    <td>${method}</td>
                    <td>${description}</td> <!-- ВОТ НОВАЯ ЯЧЕЙКА С ОПИСАНИЕМ -->
                    <td>${status}</td>
                    <td>
                        <div>${dateStr}</div>
                        <small style="font-size: 0.8em; color: #666;">${timeStr}</small>
                    </td>
                    <td>${actionsCell}</td>`;
            tbody.appendChild(tr);
        });
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7">Ошибка загрузки платежей: ${err.message}</td></tr>`;
        console.error('Ошибка загрузки платежей:', err);
    }
}
async function loadDashboardData() {
    // 1. Load Bike Stats
    const metricsContainer = document.getElementById('dashboard-metrics');
    if (metricsContainer) {
        metricsContainer.innerHTML = '<p>Загрузка метрик...</p>';
        try {
            const { data, error } = await supabase.from('bikes').select('status');
            if (error) throw error;

            const stats = data.reduce((acc, bike) => {
                acc[bike.status] = (acc[bike.status] || 0) + 1;
                return acc;
            }, {});

            const total = data.length;
            const available = stats.available || 0;
            const rented = stats.rented || 0;
            const in_service = stats.in_service || 0;

            metricsContainer.innerHTML = `
                    <div class="card"><div class="text-content"><span>Всего велосипедов</span><strong>${total}</strong></div></div>
                    <div class="card"><div class="text-content"><span>Свободно</span><strong>${available}</strong></div></div>
                    <div class="card"><div class="text-content"><span>В аренде</span><strong>${rented}</strong></div></div>
                    <div class="card"><div class="text-content"><span>В ремонте</span><strong>${in_service}</strong></div></div>
                `;
        } catch (err) {
            metricsContainer.innerHTML = `<p>Ошибка загрузки статистики велосипедов: ${err.message}</p>`;
        }
    }

    // 2. Load Payments for Chart
    try {
        const { data, error } = await supabase
            .from('payments')
            .select('created_at, amount_rub, status')
            .order('created_at', { ascending: false });
        if (error) throw error;
        renderPaymentsChart(data);
    } catch (err) {
        console.error('Ошибка загрузки данных для графика платежей:', err);
    }

    // 3. Load Weekly Income
    try {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const { data, error } = await supabase
            .from('payments')
            .select('amount_rub, status')
            .gte('created_at', weekAgo.toISOString())
            .eq('status', 'succeeded');
        if (error) throw error;
        const total = (data || []).reduce((sum, p) => sum + (p.amount_rub || 0), 0);
        const weeklyIncomeDiv = document.getElementById('weekly-income');
        if (weeklyIncomeDiv) {
            weeklyIncomeDiv.textContent = `Общий доход: ${total} ₽`;
        }
    } catch (err) {
        console.error('Ошибка загрузки недельного дохода:', err);
        const weeklyIncomeDiv = document.getElementById('weekly-income');
        if (weeklyIncomeDiv) {
            weeklyIncomeDiv.textContent = 'Ошибка загрузки';
        }
    }
}

// --- Client Info/Edit Modals Logic ---
// --- Client Info/Edit Modals Logic ---
// --- Client Info/Edit Modals Logic ---

if (clientsSection) {
    clientsSection.addEventListener('click', async (e) => {
        const viewBtn = e.target.closest('.view-client-btn');
        if (viewBtn) {
            const clientId = viewBtn.dataset.id;
            await renderClientInfo(clientId);
            clientInfoOverlay.classList.remove('hidden');
        }
    });
}

if (clientInfoCloseBtn) {
    clientInfoCloseBtn.addEventListener('click', () => clientInfoOverlay.classList.add('hidden'));
}
if (typeof clientInfoCloseBtn2 !== 'undefined' && clientInfoCloseBtn2) {
    clientInfoCloseBtn2.addEventListener('click', () => clientInfoOverlay.classList.add('hidden'));
}
if (typeof imageViewerOverlay !== 'undefined' && imageViewerOverlay) {
    const closer = document.getElementById('image-viewer-close');
    if (closer) closer.addEventListener('click', () => imageViewerOverlay.classList.add('hidden'));
    imageViewerOverlay.addEventListener('click', (e) => { if (e.target === imageViewerOverlay) imageViewerOverlay.classList.add('hidden'); });
}

if (clientEditCancelBtn) {
    clientEditCancelBtn.addEventListener('click', () => clientEditOverlay.classList.add('hidden'));
}

if (clientEditSaveBtn) {
    clientEditSaveBtn.addEventListener('click', async () => {
        if (!currentEditingId) return;

        const updatedRec = {};
        clientEditForm.querySelectorAll('input, textarea').forEach(inp => {
            updatedRec[inp.name] = inp.value.trim();
        });

        // Создаем новый объект `extra` на основе старого, но с обновленными данными
        const extraObj = JSON.parse(JSON.stringify(currentEditingExtra || {}));
        extraObj.recognized_data = updatedRec;

        try {
            const { error } = await supabase
                .from('clients')
                .update({ extra: extraObj })
                .eq('id', currentEditingId);
            if (error) throw error;

            alert('Данные клиента успешно обновлены.');
            clientEditOverlay.classList.add('hidden');
            await loadClients(); // Перезагружаем список клиентов для отображения изменений
        } catch (err) {
            alert('Ошибка сохранения данных: ' + err.message);
        }
    });
}


// --- Balance Adjustment Logic ---
const balanceModal = document.getElementById('balance-modal');
const balanceAdjustBtn = document.getElementById('balance-adjust-btn');
const balanceCancelBtn = document.getElementById('balance-cancel-btn');
const balanceSubmitBtn = document.getElementById('balance-submit-btn');
const balanceClientIdInput = document.getElementById('balance-client-id');
const balanceAmountInput = document.getElementById('balance-amount');
const balanceReasonInput = document.getElementById('balance-reason');

// Token Generation Button
const generateTokenBtn = document.getElementById('generate-token-btn');

if (balanceAdjustBtn) {
    balanceAdjustBtn.addEventListener('click', () => {
        if (currentEditingId && balanceModal) {
            balanceClientIdInput.value = currentEditingId;
            if (clientInfoOverlay) clientInfoOverlay.classList.add('hidden');
            balanceModal.classList.remove('hidden');
        } else {
            alert('Сначала выберите клиента.');
        }
    });
}

if (balanceCancelBtn) {
    balanceCancelBtn.addEventListener('click', () => {
        if (balanceModal) balanceModal.classList.add('hidden');
    });
}

if (balanceModal) {
    balanceModal.addEventListener('click', (e) => {
        if (e.target === balanceModal) {
            balanceModal.classList.add('hidden');
        }
    });
}

if (balanceSubmitBtn) {
    balanceSubmitBtn.addEventListener('click', async () => {
        const userId = balanceClientIdInput.value;
        const amount = balanceAmountInput.value;
        const reason = balanceReasonInput.value;

        if (!userId || !amount || !reason) {
            alert('Пожалуйста, заполните все поля: сумма и причина.');
            return;
        }

        toggleButtonLoading(balanceSubmitBtn, true, 'Применить', 'Применяем...');

        try {
            const response = await authedFetch('/api/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'adjust-balance', userId, amount, reason })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `Ошибка сервера: ${response.status}`);
            }

            alert(result.message || 'Баланс успешно скорректирован.');
            balanceModal.classList.add('hidden');
            balanceAmountInput.value = '';
            balanceReasonInput.value = '';

        } catch (err) {
            alert('Ошибка: ' + err.message);
        } finally {
            toggleButtonLoading(balanceSubmitBtn, false, 'Применить', 'Применяем...');
        }
    });
}

// --- Token Generation Logic ---
if (generateTokenBtn) {
    generateTokenBtn.addEventListener('click', async () => {
        if (!currentEditingId) {
            alert('Клиент не выбран.');
            return;
        }

        if (!confirm(`Сгенерировать новый токен доступа для клиента ID: ${currentEditingId}? Старый токен перестанет работать.`)) {
            return;
        }

        toggleButtonLoading(generateTokenBtn, true, 'Сгенерировать токен', 'Генерация...');

        try {
            const response = await authedFetch('/api/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reset-auth-token', userId: currentEditingId })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Ошибка сервера');

            // Показываем токен администратору, чтобы он мог его скопировать и передать клиенту
            prompt("Скопируйте этот токен и отправьте клиенту:", result.newToken);

        } catch (err) {
            alert('Ошибка генерации токена: ' + err.message);
        } finally {
            toggleButtonLoading(generateTokenBtn, false, 'Сгенерировать токен', 'Генерация...');
        }
    });
}

// --- Client Tags Logic ---
const clientTagsContainer = document.getElementById('client-tags-container');
const clientTagInput = document.getElementById('client-tag-input');
const addTagBtn = document.getElementById('add-tag-btn');

function renderTags(tags = []) {
    if (!clientTagsContainer) return;
    clientTagsContainer.innerHTML = '';
    if (!tags || tags.length === 0) {
        clientTagsContainer.innerHTML = '<p style="color: #6b6b6b;">Тегов нет.</p>';
        return;
    }
    tags.forEach(tag => {
        const tagEl = document.createElement('span');
        tagEl.className = 'chip'; // Re-using chip style for tags
        tagEl.style.cursor = 'pointer';
        tagEl.style.backgroundColor = '#e0f8f1';
        tagEl.style.borderColor = '#26b999';
        tagEl.style.color = '#083830';
        tagEl.textContent = tag;
        const removeBtn = document.createElement('span');
        removeBtn.textContent = ' ×';
        removeBtn.style.fontWeight = 'bold';
        removeBtn.style.marginLeft = '4px';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            removeTag(tag);
        };
        tagEl.appendChild(removeBtn);
        clientTagsContainer.appendChild(tagEl);
    });
}

async function updateClientTags(newTags) {
    try {
        const { data: client, error: fetchError } = await supabase
            .from('clients')
            .select('extra')
            .eq('id', currentEditingId)
            .single();
        if (fetchError) throw fetchError;

        const extra = client.extra || {};
        extra.tags = newTags;

        const { error: updateError } = await supabase
            .from('clients')
            .update({ extra: extra })
            .eq('id', currentEditingId);
        if (updateError) throw updateError;

        return newTags;
    } catch (err) {
        alert('Не удалось обновить теги: ' + err.message);
        return null;
    }
}

async function addTag() {
    const tagText = clientTagInput.value.trim();
    if (!tagText || !currentEditingId) return;

    toggleButtonLoading(addTagBtn, true, 'Добавить', '...');
    const { data: client, error } = await supabase.from('clients').select('extra').eq('id', currentEditingId).single();
    const currentTags = client.extra?.tags || [];
    if (currentTags.includes(tagText)) {
        alert('Такой тег уже существует.');
        toggleButtonLoading(addTagBtn, false, 'Добавить', '...');
        return;
    }
    const newTags = [...currentTags, tagText];
    const updatedTags = await updateClientTags(newTags);
    if (updatedTags !== null) {
        renderTags(updatedTags);
        clientTagInput.value = '';
        loadClients(); // Refresh the main table to show new tags
    }
    toggleButtonLoading(addTagBtn, false, 'Добавить', '...');
}

async function removeTag(tagToRemove) {
    const { data: client, error } = await supabase.from('clients').select('extra').eq('id', currentEditingId).single();
    const currentTags = client.extra?.tags || [];
    const newTags = currentTags.filter(t => t !== tagToRemove);
    const updatedTags = await updateClientTags(newTags);
    if (updatedTags !== null) {
        renderTags(updatedTags);
        loadClients(); // Refresh the main table
    }
}

if (addTagBtn) {
    addTagBtn.addEventListener('click', addTag);
}
if (clientTagInput) {
    clientTagInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTag();
        }
    });
}

// --- Assignments Logic ---
async function loadAssignments() {
    if (!assignmentsTableBody) return;
    assignmentsTableBody.innerHTML = '<tr><td colspan="4">Загрузка...</td></tr>';
    try {
        const { data, error } = await supabase
            .from('rentals')
            .select('id, created_at, user_id, tariff_id, clients(name), tariffs(title)')
            .eq('status', 'pending_assignment')
            .order('created_at', { ascending: true });

        if (error) throw error;

        if (!data || data.length === 0) {
            assignmentsTableBody.innerHTML = '<tr><td colspan="4">Нет активных заявок на аренду.</td></tr>';
            return;
        }

        assignmentsTableBody.innerHTML = '';
        data.forEach(assignment => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                    <td>${assignment.clients?.name || `ID: ${assignment.user_id.slice(0, 8)}...`}</td>
                    <td>${assignment.tariffs?.title || `ID: ${assignment.tariff_id}`}</td>
                    <td>${new Date(assignment.created_at).toLocaleString('ru-RU')}</td>
                    <td class="table-actions">
                        <button class="btn btn-primary assign-bike-btn" data-rental-id="${assignment.id}">Привязать</button>
                        <button class="btn btn-secondary reject-rental-btn" data-rental-id="${assignment.id}" style="background-color: #fff1f2; color: #e53e3e;">Отклонить</button>
                    </td>
                `;
            assignmentsTableBody.appendChild(tr);
        });
    } catch (err) {
        console.error('Ошибка загрузки заявок:', err);
        assignmentsTableBody.innerHTML = `<tr><td colspan="4">Ошибка: ${err.message}</td></tr>`;
    }
}

if (assignmentsTableBody) {
    assignmentsTableBody.addEventListener('click', async (e) => {
        const assignBtn = e.target.closest('.assign-bike-btn');
        const rejectBtn = e.target.closest('.reject-rental-btn');

        if (assignBtn) {
            const rentalId = assignBtn.dataset.rentalId;
            assignRentalIdInput.value = rentalId;

            // Load available bikes
            try {
                const { data, error } = await supabase
                    .from('bikes')
                    .select('*')
                    .eq('status', 'available');
                if (error) throw error;

                bikeSelect.innerHTML = '<option value="">-- Выберите велосипед --</option>';
                data.forEach(bike => {
                    const option = document.createElement('option');
                    option.value = bike.id;
                    option.textContent = `${bike.model_name} (#${bike.bike_code})`;
                    bikeSelect.appendChild(option);
                });

                // Add change listener to populate bike details
                bikeSelect.addEventListener('change', async () => {
                    const selectedId = bikeSelect.value;
                    if (selectedId) {
                        const selectedBike = data.find(b => b.id == selectedId);
                        if (selectedBike) {
                            assignBikeFrameNumberInput.value = selectedBike.frame_number || '';
                            assignBikeBatteryNumbersInput.value = Array.isArray(selectedBike.battery_numbers) ? selectedBike.battery_numbers.join(', ') : (selectedBike.battery_numbers || '');
                            assignBikeRegistrationNumberInput.value = selectedBike.registration_number || '';
                            assignBikeIotDeviceIdInput.value = selectedBike.iot_device_id || '';
                            assignBikeAdditionalEquipmentInput.value = selectedBike.additional_equipment || '';
                            bikeDetailsDiv.style.display = 'block';
                        }
                    } else {
                        bikeDetailsDiv.style.display = 'none';
                    }
                });

                assignBikeModal.classList.remove('hidden');
            } catch (err) {
                alert('Не удалось загрузить список свободных велосипедов: ' + err.message);
            }
        }

        if (rejectBtn) {
            const rentalId = rejectBtn.dataset.rentalId;
            if (confirm(`Вы уверены, что хотите отклонить заявку #${rentalId} и вернуть средства клиенту?`)) {
                toggleButtonLoading(rejectBtn, true, 'Отклонить', '...');
                try {
                    const response = await authedFetch('/api/admin', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'reject-rental', rental_id: rentalId })
                    });
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.error || 'Ошибка сервера');

                    alert(result.message);
                    loadAssignments(); // Refresh the list

                } catch (err) {
                    alert('Ошибка отклонения заявки: ' + err.message);
                } finally {
                    toggleButtonLoading(rejectBtn, false, 'Отклонить', '...');
                }
            }
        }
    });
}

if (assignBikeCancelBtn) {
    assignBikeCancelBtn.addEventListener('click', () => assignBikeModal.classList.add('hidden'));
}

if (assignBikeSubmitBtn) {
    assignBikeSubmitBtn.addEventListener('click', async () => {
        const rentalId = assignRentalIdInput.value;
        const bikeId = bikeSelect.value;

        if (!rentalId || !bikeId) {
            alert('Пожалуйста, выберите велосипед.');
            return;
        }

        toggleButtonLoading(assignBikeSubmitBtn, true, 'Привязать и активировать', 'Активация...');

        try {
            // Update bike data
            const batteryNumbers = assignBikeBatteryNumbersInput.value.split(',').map(s => s.trim()).filter(s => s);
            const bikeData = {
                frame_number: assignBikeFrameNumberInput.value,
                battery_numbers: batteryNumbers,
                registration_number: assignBikeRegistrationNumberInput.value,
                iot_device_id: assignBikeIotDeviceIdInput.value,
                additional_equipment: assignBikeAdditionalEquipmentInput.value,
            };
            const { error: bikeError } = await supabase.from('bikes').update(bikeData).eq('id', bikeId);
            if (bikeError) throw new Error('Ошибка обновления данных велосипеда: ' + bikeError.message);

            const response = await authedFetch('/api/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'assign-bike', rental_id: rentalId, bike_id: bikeId })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Ошибка сервера');

            alert('Аренда успешно активирована!');
            assignBikeModal.classList.add('hidden');
            loadAssignments();

        } catch (err) {
            alert('Ошибка активации аренды: ' + err.message);
        } finally {
            toggleButtonLoading(assignBikeSubmitBtn, false, 'Привязать и активировать', 'Активация...');
        }
    });
}

// --- Client Notes Logic ---
const clientNotesList = document.getElementById('client-notes-list');
const clientNoteInput = document.getElementById('client-note-input');
const addNoteBtn = document.getElementById('add-note-btn');

function renderNotes(notes = []) {
    if (!clientNotesList) return;
    if (!notes || notes.length === 0) {
        clientNotesList.innerHTML = '<p style="color: #6b6b6b; text-align: center;">Заметок пока нет.</p>';
        return;
    }
    clientNotesList.innerHTML = '';
    notes.slice().reverse().forEach(note => {
        const noteEl = document.createElement('div');
        noteEl.style.borderBottom = '1px solid var(--progress-bar-bg)';
        noteEl.style.padding = '8px 0';
        noteEl.style.marginBottom = '8px';
        const author = note.author || 'Неизвестный автор';
        const date = note.timestamp ? new Date(note.timestamp).toLocaleString('ru-RU') : '';
        noteEl.innerHTML = `
                <p style="margin:0; white-space: pre-wrap; word-wrap: break-word;">${note.text}</p>
                <small style="color: #6b6b6b;">- ${author} (${date})</small>
            `;
        clientNotesList.appendChild(noteEl);
    });
}

if (addNoteBtn) {
    addNoteBtn.addEventListener('click', async () => {
        const noteText = clientNoteInput.value.trim();
        if (!noteText || !currentEditingId) return;

        toggleButtonLoading(addNoteBtn, true, 'Добавить заметку', 'Добавление...');

        try {
            const { data: { user } } = await supabase.auth.getUser();
            const authorEmail = user ? user.email : 'admin';

            const newNote = {
                text: noteText,
                author: authorEmail,
                timestamp: new Date().toISOString()
            };

            // Fetch the latest extra data to avoid overwriting other changes
            const { data: client, error: fetchError } = await supabase
                .from('clients')
                .select('extra')
                .eq('id', currentEditingId)
                .single();

            if (fetchError) throw fetchError;

            const extra = client.extra || {};
            const notes = extra.notes || [];
            notes.push(newNote);
            extra.notes = notes;

            const { error: updateError } = await supabase
                .from('clients')
                .update({ extra: extra })
                .eq('id', currentEditingId);

            if (updateError) throw updateError;

            clientNoteInput.value = '';
            renderNotes(notes); // Re-render the notes list

        } catch (err) {
            alert('Не удалось добавить заметку: ' + err.message);
        } finally {
            toggleButtonLoading(addNoteBtn, false, 'Добавить заметку', 'Добавление...');
        }
    });
}

// --- Invoice Logic ---
if (invoiceCreateBtn) {
    invoiceCreateBtn.addEventListener('click', () => {
        // currentEditingId is set when the client info modal is opened
        if (currentEditingId && invoiceModal) {
            invoiceClientIdInput.value = currentEditingId;
            // It's better to hide the info overlay before showing the invoice one
            if (clientInfoOverlay) clientInfoOverlay.classList.add('hidden');
            invoiceModal.classList.remove('hidden');
        } else {
            alert('Сначала выберите клиента для выставления счета.');
        }
    });
}

if (invoiceCancelBtn) {
    invoiceCancelBtn.addEventListener('click', () => {
        if (invoiceModal) {
            invoiceModal.classList.add('hidden');
        }
    });
}

// Also close on overlay click
if (invoiceModal) {
    invoiceModal.addEventListener('click', (e) => {
        if (e.target === invoiceModal) {
            invoiceModal.classList.add('hidden');
        }
    });
}

if (invoiceSubmitBtn) {
    invoiceSubmitBtn.addEventListener('click', async () => {
        const userId = invoiceClientIdInput.value;
        const amount = invoiceAmountInput.value;
        const description = invoiceDescriptionInput.value;

        if (!userId || !amount || !description) {
            alert('Пожалуйста, заполните все поля: сумма и описание.');
            return;
        }

        toggleButtonLoading(invoiceSubmitBtn, true, 'Выставить и списать', 'Отправка...');

        try {
            const response = await authedFetch('/api/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'create-invoice', userId, amount, description })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `Ошибка сервера: ${response.status}`);
            }

            const responseText = await response.text();

            // Если ответ пустой, считаем, что все прошло успешно
            if (!responseText) {
                alert('Счет успешно создан и отправлен на списание.');
            } else {
                // Иначе, пытаемся парсить JSON
                const result = JSON.parse(responseText);
                alert(result.message || 'Счет успешно создан и отправлен на списание.');
            }

            invoiceModal.classList.add('hidden');
            invoiceAmountInput.value = '';
            invoiceDescriptionInput.value = '';

        } catch (err) {
            // Умное сообщение об ошибке
            if (err.message.includes('Unexpected token')) {
                alert('Ошибка: получен некорректный ответ от сервера. Возможно, он временно недоступен.');
            } else {
                alert('Ошибка: ' + err.message);
            }
        } finally {
            toggleButtonLoading(invoiceSubmitBtn, false, 'Выставить и списать', 'Отправка...');
        }
    });
}

// --- Export Logic ---
if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
        try {
            const { data, error } = await supabase.from('clients').select('*');
            if (error) throw error;

            const headers = ['id', 'name', 'phone', 'city', 'tg_user_id', 'created_at'];
            const csvRows = [headers.join(',')];
            data.forEach(c => {
                const row = headers.map(header => JSON.stringify(c[header] || ''));
                csvRows.push(row.join(','));
            });

            const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `clients_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            alert('Ошибка экспорта: ' + err.message);
        }
    });
}

// --- Initial Load ---
checkSession();

// ==== Templates Manager (Шаблоны договоров) ====

const PLACEHOLDERS = {
    client: [
        ['client.full_name', 'ФИО'], ['client.first_name', 'Имя'], ['client.last_name', 'Фамилия'], ['client.middle_name', 'Отчество'],
        ['client.passport_series', 'Серия паспорта'], ['client.passport_number', 'Номер паспорта'], ['client.issued_by', 'Кем выдан'],
        ['client.issued_at', 'Дата выдачи'], ['client.birth_date', 'Дата рождения'], ['client.city', 'Город'], ['client.address', 'Адрес'],
        ['client.phone', 'Телефон'], ['client.inn', 'ИНН'], ['client.emergency_phone', 'Экстренный телефон'], ['client.citizenship', 'Гражданство']
    ],
    bike: [
        ['bike.name', 'Наименование'], ['bike.code', 'Код'], ['bike.frame_number', 'Номер рамы'], ['bike.battery_numbers', 'Номера аккумуляторов'],
        ['bike.registration_number', 'Рег. номер'], ['bike.iot_device_id', 'Номер IOT'], ['bike.additional_equipment', 'Доп. оборудование']
    ],
    tariff: [['tariff.title', 'Тариф'], ['tariff.duration_days', 'Дней'], ['tariff.price_rub', 'Сумма ₽']],
    rental: [['rental.id', '№ аренды'], ['rental.starts_at', 'Начало'], ['rental.ends_at', 'Конец'], ['rental.bike_id', 'ID велосипеда']],
    aux: [['now.date', 'Дата'], ['now.time', 'Время'], ['contract.city', 'Город акта']]
};

function mountChips(container, items) {
    if (!container) return;
    container.innerHTML = '';
    items.forEach(([value, label]) => {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.textContent = label;
        chip.title = `Вставить {{${value}}}`;
        chip.addEventListener('click', () => insertAtCaret(`{{${value}}}`));
        container.appendChild(chip);
    });
}

function insertAtCaret(text) {
    if (!templateEditor) return;
    templateEditor.focus();
    document.execCommand('insertText', false, text);
}

function toolbarAction(e) {
    const btn = e.target.closest('button[data-cmd]');
    if (!btn || !templateEditorInstance) return;
    const cmd = btn.dataset.cmd;
    if (cmd === 'bold') {
        templateEditorInstance.chain().focus().toggleBold().run();
    } else if (cmd === 'italic') {
        templateEditorInstance.chain().focus().toggleItalic().run();
    } else if (cmd === 'underline') {
        // Underline not in StarterKit, need to add extension
        // For now, skip or add later
    } else if (cmd === 'insertParagraph') {
        templateEditorInstance.chain().focus().setParagraph().run();
    }
}

// selection tracking inside editor
function isWithinEditor(node) { return templateEditor && node && (node === templateEditor || templateEditor.contains(node)); }
document.addEventListener('selectionchange', () => {
    const sel = window.getSelection ? window.getSelection() : null;
    if (!sel || sel.rangeCount === 0) return;
    const r = sel.getRangeAt(0);
    if (isWithinEditor(r.startContainer)) {
        lastSelRange = r.cloneRange();
    }
});

function insertAtSavedRange(token) {
    if (!templateEditor) return;
    templateEditor.focus();
    const sel = window.getSelection();
    try {
        if (lastSelRange && isWithinEditor(lastSelRange.startContainer)) {
            sel.removeAllRanges();
            sel.addRange(lastSelRange);
        }
        const range = sel.rangeCount ? sel.getRangeAt(0) : null;
        if (range) {
            range.deleteContents();
            const span = document.createElement('span');
            span.className = 'ph';
            span.textContent = token;
            range.insertNode(span);
            // move caret after inserted
            range.setStartAfter(span);
            range.collapse(true);
            sel.removeAllRanges(); sel.addRange(range);
        } else {
            document.execCommand('insertText', false, token);
        }
    } catch {
        document.execCommand('insertText', false, token);
    }
    // highlight
    highlightPlaceholdersInEditor();
}

// --- Drag&Drop и подсветка плейсхолдеров ---
function enableDnDForChips() {
    document.querySelectorAll('.chips .chip').forEach(chip => {
        if (chip.dataset.dnd === '1') return;
        chip.dataset.dnd = '1';
        chip.setAttribute('draggable', 'true');
        chip.addEventListener('dragstart', (e) => {
            const token = `{{${chip.title.replace('Вставить ', '').replace(/[{}]/g, '').trim()}}}`;
            e.dataTransfer.setData('text/plain', token);
            chip.classList.add('dragging');
        });
        chip.addEventListener('dragend', () => chip.classList.remove('dragging'));
        // после клика (вставки) подсветить
        chip.addEventListener('click', () => setTimeout(highlightPlaceholdersInEditor, 0));
    });
    if (templateEditor) {
        templateEditor.addEventListener('dragover', (e) => { e.preventDefault(); templateEditor.classList.add('drag-over'); });
        templateEditor.addEventListener('dragleave', () => templateEditor.classList.remove('drag-over'));
        templateEditor.addEventListener('drop', (e) => {
            e.preventDefault();
            templateEditor.classList.remove('drag-over');
            const text = e.dataTransfer.getData('text/plain');
            if (text) {
                templateEditor.focus();
                document.execCommand('insertText', false, text);
                highlightPlaceholdersInEditor();
                templateEditor.classList.add('drop-anim');
                setTimeout(() => templateEditor.classList.remove('drop-anim'), 300);
            }
        });
        templateEditor.addEventListener('blur', highlightPlaceholdersInEditor);
    }
}

function highlightPlaceholdersInEditor() {
    if (!templateEditor) return;
    try {
        let html = templateEditor.innerHTML;
        html = html.replace(/<span class=\"ph\">(.*?)<\/span>/g, '$1');
        html = html.replace(/(\{\{\s*[\w\.\-]+\s*\}\})/g, '<span class="ph">$1<\/span>');
        templateEditor.innerHTML = html;
    } catch { }
}

// Навешиваем кликовую вставку, которая сохраняет позицию курсора
function addChipClickHandlers() {
    document.querySelectorAll('.chips .chip').forEach(chip => {
        if (chip.dataset.clickBound === '1') return;
        chip.dataset.clickBound = '1';
        chip.addEventListener('mousedown', (e) => e.preventDefault());
        chip.addEventListener('click', () => {
            const m = /\{\{.*?\}\}/.exec(chip.title || '');
            const token = m ? m[0] : `{{${chip.textContent.trim()}}}`;
            insertAtSavedRange(token);
        });
    });
}

// --- Предпросмотр шаблона ---
const templatePreviewBtn = document.getElementById('template-preview-btn');
const templatePreviewOverlay = document.getElementById('template-preview-overlay');
const templatePreviewContent = document.getElementById('template-preview-content');
const templatePreviewClose = document.getElementById('template-preview-close');

function pathGet(obj, path) { try { return path.split('.').reduce((o, k) => (o && o[k] != null) ? o[k] : '', obj); } catch { return '' } }
function buildPreviewHTML() {
    const ctx = {
        client: { full_name: 'Иванов Иван Иванович', first_name: 'Иван', last_name: 'Иванов', middle_name: 'Иванович', passport_series: '12 34', passport_number: '567890', issued_by: 'ОВД г. Москва', issued_at: '01.01.2020', birth_date: '02.02.1990', city: 'Москва', address: 'ул. Пушкина, д.1' },
        tariff: { title: 'Золотой', duration_days: 7, price_rub: 3750 },
        rental: { id: 12345, starts_at: '2025-09-01', ends_at: '2025-09-08', bike_id: '00001' },
        now: { date: new Date().toLocaleDateString('ru-RU'), time: new Date().toLocaleTimeString('ru-RU') }
    };
    let html = templateEditor ? templateEditor.innerHTML : '';
    html = html.replace(/\{\{\s*([\w\.\-]+)\s*\}\}/g, (_, k) => { const v = pathGet(ctx, k); return v === undefined ? '' : String(v) });
    return html;
}
function openTemplatePreview() { if (!templatePreviewOverlay || !templatePreviewContent) return; templatePreviewContent.innerHTML = buildPreviewHTML(); templatePreviewOverlay.classList.remove('hidden'); }
function closeTemplatePreview() { if (templatePreviewOverlay) templatePreviewOverlay.classList.add('hidden'); }
if (templatePreviewBtn) templatePreviewBtn.addEventListener('click', openTemplatePreview);
if (templatePreviewClose) templatePreviewClose.addEventListener('click', closeTemplatePreview);
if (templatePreviewOverlay) templatePreviewOverlay.addEventListener('click', (e) => { if (e.target === templatePreviewOverlay) closeTemplatePreview(); });

function initTemplateEditor() {
    if (templateEditorInstance) {
        templateEditorInstance.destroy();
    }
    const editorElement = document.getElementById('template-editor');
    if (editorElement) {
        templateEditorInstance = new TipTap.Editor({
            element: editorElement,
            extensions: [
                TipTap.StarterKit,
            ],
            content: '',
            onUpdate: ({ editor }) => {
                // Optional: handle updates
            },
        });
    }
}

async function loadTemplates() {
    try {
        // chips
        mountChips(chipsClient, PLACEHOLDERS.client);
        mountChips(chipsTariff, PLACEHOLDERS.tariff);
        mountChips(chipsRental, PLACEHOLDERS.rental);
        mountChips(chipsAux, PLACEHOLDERS.aux);
        addChipClickHandlers();

        // включаем перетаскивание и постподсветку
        enableDnDForChips();

        // Initialize TipTap editor
        initTemplateEditor();

        const { data, error } = await supabase.from('contract_templates').select('*').order('id', { ascending: true });
        if (error) throw error;
        if (templatesTableBody) {
            templatesTableBody.innerHTML = '';
            (data || []).forEach(t => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
              <td>${t.name}</td>
              <td>${t.is_active ? 'Да' : 'Нет'}</td>
              <td class="table-actions">
                <button type="button" class="template-edit-btn" data-id="${t.id}">Ред.</button>
                <button type="button" class="template-delete-btn" data-id="${t.id}">Удалить</button>
              </td>`;
                templatesTableBody.appendChild(tr);
            });
        }
        if (contractTemplateSelect) {
            const selected = contractTemplateSelect.value;
            contractTemplateSelect.innerHTML = '<option value="">— Не выбран —</option>' + (data || []).map(t => `<option value="${t.id}">${t.name}</option>`).join('');
            if (selected) contractTemplateSelect.value = selected;
        }
    } catch (err) {
        console.error('Ошибка загрузки шаблонов:', err);
    }
}

async function saveTemplate() {
    if (!templateEditorInstance) return;
    const id = (document.getElementById('template-id') || {}).value;
    const name = (document.getElementById('template-name') || {}).value || 'Без названия';
    const isActive = (document.getElementById('template-active') || { checked: true }).checked;
    const content = templateEditorInstance.getHTML() || '';
    const rec = { name, content, is_active: isActive, placeholders: PLACEHOLDERS };
    try {
        let resp;
        if (id) resp = await supabase.from('contract_templates').update(rec).eq('id', id).select('id').single();
        else resp = await supabase.from('contract_templates').insert([rec]).select('id').single();
        if (resp.error) throw resp.error;
        document.getElementById('template-id').value = resp.data?.id || id || '';
        await loadTemplates();
        alert('Шаблон сохранён');
    } catch (err) {
        alert('Ошибка сохранения шаблона: ' + err.message);
    }
}

function newTemplate() {
    (document.getElementById('template-id') || {}).value = '';
    (document.getElementById('template-name') || {}).value = '';
    (document.getElementById('template-active') || {}).checked = true;
    if (templateEditor) templateEditor.innerHTML = '';
}

if (editorToolbar) editorToolbar.addEventListener('click', toolbarAction);
document.getElementById('templates-table')?.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('.template-edit-btn');
    const delBtn = e.target.closest('.template-delete-btn');
    if (editBtn) {
        const id = editBtn.dataset.id;
        const { data, error } = await supabase.from('contract_templates').select('*').eq('id', id).single();
        if (!error && data) {
            document.getElementById('template-id').value = data.id;
            document.getElementById('template-name').value = data.name;
            document.getElementById('template-active').checked = !!data.is_active;
            if (templateEditor) templateEditor.innerHTML = data.content || '';
        }
    }
    if (delBtn) {
        const id = delBtn.dataset.id;
        if (!confirm('Удалить шаблон?')) return;
        const { error } = await supabase.from('contract_templates').delete().eq('id', id);
        if (error) alert('Ошибка удаления: ' + error.message);
        await loadTemplates();
    }
});
if (templateSaveBtn) templateSaveBtn.addEventListener('click', saveTemplate);
if (templateNewBtn) templateNewBtn.addEventListener('click', newTemplate);

// Попробуем заранее загрузить шаблоны (для выпадающего списка у тарифов)
loadTemplates().catch(() => { });

// --- НОВЫЙ БЛОК: Логика предпросмотра тарифов как у клиента ---

// Глобальные переменные для предпросмотра
const clientViewTariffListModal = document.getElementById('client-view-tariff-list-modal');
const clientViewTariffDetailModal = document.getElementById('client-view-tariff-detail-modal');
let tariffDataForPreview = {}; // Здесь будем хранить данные всех тарифов

// Функция, которая запускает весь процесс предпросмотра
async function showClientTariffPreview(targetTariffId = null) {
    // 1. Загружаем все активные тарифы
    try {
        const { data, error } = await supabase.from('tariffs').select('*').eq('is_active', true).order('id');
        if (error) throw error;

        tariffDataForPreview = {}; // Очищаем старые данные
        data.forEach(t => {
            const key = t.slug || `tariff-${t.id}`;
            tariffDataForPreview[key] = {
                ...t,
                // Парсим extensions, т.к. они могут быть строкой
                extensions: typeof t.extensions === 'string' ? JSON.parse(t.extensions) : t.extensions,
            };
        });

        // 2. Показываем детальное окно для конкретного тарифа
        const targetTariffKey = Object.keys(tariffDataForPreview).find(key => tariffDataForPreview[key].id == targetTariffId);
        if (targetTariffKey) {
            renderTariffDetailForClientView(targetTariffKey);
        } else {
            alert('Тариф не найден или неактивен.');
        }

    } catch (err) {
        alert('Ошибка загрузки данных для предпросмотра: ' + err.message);
    }
}

// Функция для отрисовки детального окна тарифа
function renderTariffDetailForClientView(tariffKey) {
    const t = tariffDataForPreview[tariffKey];
    if (!t) return;

    // Заполняем элементы модального окна
    document.getElementById('client-view-tariff-detail-title').textContent = t.title;
    document.getElementById('client-view-tariff-detail-description').textContent = t.description || '';
    const optionsContainer = document.getElementById('client-view-tariff-options-list');
    optionsContainer.innerHTML = '';

    const extensions = (t.extensions && Array.isArray(t.extensions) && t.extensions.length > 0)
        ? t.extensions
        : [{ days: t.duration_days, cost: t.price_rub }];

    extensions.forEach((ext, idx) => {
        const isSelectedClass = (idx === 0) ? ' selected' : '';
        const optionHTML = `
                <label class="tariff-option-item${isSelectedClass}">
                    <input type="radio" name="client-view-tariff-option" value="${idx}" ${idx === 0 ? 'checked' : ''}>
                    <div class="option-details">
                        <span class="option-duration">${ext.days} дней</span>
                    </div>
                    <span class="option-price">${ext.cost} ₽</span>
                </label>
            `;
        optionsContainer.insertAdjacentHTML('beforeend', optionHTML);
    });

    // Добавляем интерактивность для выбора (хотя она тут не нужна для логики, но для вида)
    optionsContainer.querySelectorAll('.tariff-option-item').forEach(label => {
        label.addEventListener('click', () => {
            optionsContainer.querySelectorAll('.tariff-option-item').forEach(el => el.classList.remove('selected'));
            label.classList.add('selected');
            label.querySelector('input').checked = true;
        });
    });

    clientViewTariffDetailModal.classList.remove('hidden');
}

// Обработчики закрытия модальных окон
document.getElementById('client-view-tariff-list-close-btn')?.addEventListener('click', () => {
    clientViewTariffListModal.classList.add('hidden');
});
clientViewTariffListModal?.addEventListener('click', (e) => {
    if (e.target === clientViewTariffListModal) clientViewTariffListModal.classList.add('hidden');
});

document.getElementById('client-view-tariff-detail-close-btn')?.addEventListener('click', () => {
    clientViewTariffDetailModal.classList.add('hidden');
});
clientViewTariffDetailModal?.addEventListener('click', (e) => {
    if (e.target === clientViewTariffDetailModal) clientViewTariffDetailModal.classList.add('hidden');
});

});