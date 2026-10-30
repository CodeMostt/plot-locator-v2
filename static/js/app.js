const VIEW_MODE = (!IS_ADMIN && !IS_EMPLOYEE);

        const citySel = document.getElementById('city-select');
        const projSel = document.getElementById('project-select');
        const mapImg = document.getElementById('map-image');
        const svgOverlay = document.getElementById('svg-overlay');
        const drawer = document.getElementById('plot-drawer');
        const overlay = document.getElementById('modal-overlay');
        const mapLayer = document.getElementById('map-transform-layer');
        const viewport = document.getElementById('viewport-container');

        let currentPlotData = null;
        let activePoly = null;
        let lastFetchedPlots = [];
        let currentStatusFilter = 'all';

        // --- PAN & ZOOM STATE ---
        let scale = 1;
        let panX = 0;
        let panY = 0;
        let isPanning = false;
        let startX = 0;
        let startY = 0;

        function updateTransform() {
            mapLayer.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
        }

        function zoomMap(factor) {
            const minScale = Math.min(scale * 0.4, 0.05);
            const newScale = Math.min(Math.max(minScale, scale * factor), 5.0);
            const rect = viewport.getBoundingClientRect();
            const cx = rect.width / 2;
            const cy = rect.height / 2;
            panX = cx - (cx - panX) * (newScale / scale);
            panY = cy - (cy - panY) * (newScale / scale);
            scale = newScale;
            updateTransform();
        }

        function resetMapView(customW, customH) {
            const iWidth = customW || mapImg.naturalWidth;
            const iHeight = customH || mapImg.naturalHeight;
            if (!iWidth || !iHeight) return;

            const vRect = viewport.getBoundingClientRect();
            if (!vRect.width || !vRect.height) return;

            const scaleX = vRect.width / iWidth;
            const scaleY = vRect.height / iHeight;
            scale = Math.min(scaleX, scaleY, 1.0);
            
            panX = (vRect.width - (iWidth * scale)) / 2;
            panY = (vRect.height - (iHeight * scale)) / 2;
            updateTransform();
        }

        function toggleFullscreen() {
            if (!document.fullscreenElement) {
                viewport.requestFullscreen().catch(err => console.log(err));
            } else {
                document.exitFullscreen();
            }
        }

        // Viewport Mouse Pan Listeners
        viewport.addEventListener('mousedown', (e) => {
            if (e.target.tagName.toLowerCase() === 'polygon' || e.target.closest('.map-controls-floating') || e.target.closest('.map-legend-floating')) {
                return;
            }
            isPanning = true;
            startX = e.clientX - panX;
            startY = e.clientY - panY;
        });

        window.addEventListener('mousemove', (e) => {
            if (!isPanning) return;
            panX = e.clientX - startX;
            panY = e.clientY - startY;
            updateTransform();
        });

        window.addEventListener('mouseup', () => { isPanning = false; });

        viewport.addEventListener('wheel', (e) => {
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.15 : 0.85;
            const rect = viewport.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const newScale = Math.min(Math.max(0.3, scale * factor), 5.0);
            panX = mouseX - (mouseX - panX) * (newScale / scale);
            panY = mouseY - (mouseY - panY) * (newScale / scale);
            scale = newScale;
            updateTransform();
        }, { passive: false });

        // Touch gestures for mobile
        let initialTouchDist = null;
        viewport.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                isPanning = true;
                startX = e.touches[0].clientX - panX;
                startY = e.touches[0].clientY - panY;
            } else if (e.touches.length === 2) {
                isPanning = false;
                initialTouchDist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
            }
        }, { passive: true });

        viewport.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1 && isPanning) {
                panX = e.touches[0].clientX - startX;
                panY = e.touches[0].clientY - startY;
                updateTransform();
            } else if (e.touches.length === 2 && initialTouchDist) {
                const currentDist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                const factor = currentDist / initialTouchDist;
                if (Math.abs(factor - 1) > 0.02) {
                    zoomMap(factor);
                    initialTouchDist = currentDist;
                }
            }
        }, { passive: true });

        viewport.addEventListener('touchend', () => {
            isPanning = false;
            initialTouchDist = null;
        });

        // --- CITY FILTER ON LANDING ---
        function filterProjectsByCity(cityName, btn) {
            document.querySelectorAll('.city-tab-btn').forEach(b => b.classList.remove('active'));
            if(btn) btn.classList.add('active');

            const cards = document.querySelectorAll('.project-card');
            cards.forEach(card => {
                if (cityName === 'ALL' || card.dataset.city === cityName) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        }

        // --- NAVIGATION & VIEWS ---
        function showLoginPrompt() {
            document.getElementById('login-modal').style.display = 'block';
            overlay.style.display = 'block';
            setTimeout(() => overlay.classList.add('active'), 10);
        }

        function closeAllModals() {
            document.getElementById('login-modal').style.display = 'none';
            document.getElementById('image-modal').style.display = 'none';
            closeDrawer();
            overlay.classList.remove('active');
            setTimeout(() => { overlay.style.display = 'none'; }, 200);
        }

        function submitLogin() {
            const user = document.getElementById('login-user').value.trim();
            const pass = document.getElementById('login-pass').value.trim();
            if (!user || !pass) {
                showToast("Please enter username and password");
                return;
            }

            fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user, password: pass })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    showToast("Login Successful!");
                    setTimeout(() => location.reload(), 600);
                } else {
                    showToast("Invalid credentials. Try again.");
                }
            })
            .catch(() => showToast("Connection error during sign-in."));
        }

        function goHome() {
            document.getElementById('landing-view').style.display = 'block';
            document.getElementById('workspace-view').style.display = 'none';
            citySel.value = "";
            projSel.disabled = true;
            mapImg.src = "";
            mapImg.removeAttribute('style');
            mapLayer.removeAttribute('style');
            mapLayer.style.opacity = '0';
            svgOverlay.removeAttribute('style');
            svgOverlay.innerHTML = "";
            const spinner = document.getElementById('map-loading-spinner');
            if (spinner) spinner.style.display = 'none';
            closeAllModals();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        function updateProjects(autoSelect = null) {
            fetch(`/get_projects?city=${citySel.value}`)
            .then(res => res.json())
            .then(projects => {
                projSel.innerHTML = '<option value="">Select Colony</option>';
                projects.forEach(p => {
                    let opt = document.createElement('option');
                    opt.value = p;
                    opt.innerHTML = p.replace(/_/g, ' ').toUpperCase();
                    projSel.appendChild(opt);
                });
                projSel.disabled = false;
                if (autoSelect) {
                    projSel.value = autoSelect;
                    loadMap();
                }
            });
        }

        function quickLoad(city, project) {
            citySel.value = city;
            updateProjects(project);
        }

        function loadMap() {
            if (!projSel.value) return;

            document.getElementById('landing-view').style.display = 'none';
            document.getElementById('workspace-view').style.display = 'block';
            
            document.getElementById('display-project-name').innerText = projSel.value.replace(/_/g, ' ').toUpperCase();
            document.getElementById('display-city-name').innerText = citySel.value;

            // Clear previous plots, hide stale image immediately, and show clean loader
            svgOverlay.innerHTML = '';
            activePoly = null;
            lastFetchedPlots = [];

            mapLayer.style.opacity = '0';
            mapImg.src = '';
            mapImg.removeAttribute('style');

            const spinner = document.getElementById('map-loading-spinner');
            if (spinner) spinner.style.display = 'flex';

            const currentCity = citySel.value;
            const currentProj = projSel.value;
            const targetSrc = `https://jpeezqoinwzrruknbsmy.supabase.co/storage/v1/object/public/project-maps/${currentCity}/${currentProj}/map.png`;

            fetch(`/get_all_plots?city=${currentCity}&project=${currentProj}`)
            .then(res => res.json())
            .then(plots => {
                if (Array.isArray(plots)) {
                    lastFetchedPlots = plots;
                    updateSummary(plots);

                    // Preload via a fresh Image object to guarantee accurate natural dimensions
                    const imgLoader = new Image();
                    imgLoader.crossOrigin = "anonymous";
                    imgLoader.onload = () => {
                        // Ensure user hasn't switched to a different colony in the meantime
                        if (projSel.value !== currentProj) return;

                        const w = imgLoader.naturalWidth;
                        const h = imgLoader.naturalHeight;
                        if (!w || !h) return;

                        mapImg.src = targetSrc;
                        renderPlots(plots, w, h);

                        if (spinner) spinner.style.display = 'none';

                        // Allow mobile browser layout pass to finish before positioning
                        requestAnimationFrame(() => {
                            resetMapView(w, h);
                            mapLayer.style.opacity = '1';
                        });
                    };
                    imgLoader.onerror = () => {
                        if (spinner) spinner.style.display = 'none';
                        showToast("Could not load colony map image.");
                    };
                    imgLoader.src = targetSrc;
                } else {
                    console.error("Data error:", plots);
                    if (spinner) spinner.style.display = 'none';
                    showToast("Error loading colony plot layout data.");
                }
            })
            .catch(() => {
                if (spinner) spinner.style.display = 'none';
                showToast("Network error loading colony data.");
            });
        }

        // --- COLOR MAPPING (Vacant -> Red, Registry -> Green, Booked -> Yellow) ---
        function getColor(status, manualColor) {
            const colorType = manualColor ? String(manualColor).trim().toLowerCase() : "";
            if (colorType === 'blue') return { color: "#1E293B", fill: "url(#owner-pattern)" };
            if (colorType === 'green') return { color: "transparent", fill: "transparent" };

            const s = status ? status.toLowerCase() : "";
            
            // Registry done -> Green
            if (s.includes('reg')) {
                return { color: "#059669", fill: "rgba(16, 185, 129, 0.45)" };
            }
            // Booked -> Yellow
            if (s.includes('book')) {
                return { color: "#CA8A04", fill: "rgba(234, 179, 8, 0.5)" };
            }
            // Vacant -> Red
            return { color: "#DC2626", fill: "rgba(239, 68, 68, 0.4)" };
        }

        function highlightPolygon(poly, status, manualColor) {
            if (activePoly && activePoly !== poly) resetPolygon(activePoly);
            activePoly = poly;
            const colors = getColor(status, manualColor);
            const colorType = manualColor ? String(manualColor).trim().toLowerCase() : "";

            if (colorType === 'blue') {
                poly.setAttribute("fill", colors.fill);
            } else if (colorType === 'green') {
                poly.setAttribute("fill", "rgba(56, 189, 248, 0.5)");
            } else {
                poly.setAttribute("fill", colors.fill.replace(/0\.\d+/, "0.8"));
            }

            poly.setAttribute("stroke", colorType === 'green' ? "transparent" : "#0F172A");
            poly.setAttribute("stroke-width", "3.5");
        }

        function resetPolygon(poly) {
            if (poly) {
                const id = poly.id.replace('poly-', '');
                const plot = lastFetchedPlots.find(p => String(p.plot_id).trim() === id);
                if (plot) {
                    const colors = getColor(plot.status, plot.color);
                    poly.setAttribute("fill", colors.fill);
                    poly.setAttribute("stroke", colors.color);
                    poly.setAttribute("stroke-width", "1");
                }
            }
        }

        // --- RENDER PLOT OVERLAYS ---
        function renderPlots(plots, customW, customH) {
            const w = customW || mapImg.naturalWidth;
            const h = customH || mapImg.naturalHeight;
            if (!w || !h) return;

            // Lock container, image, and SVG overlay to the exact same pixel dimensions
            mapLayer.style.width = w + 'px';
            mapLayer.style.height = h + 'px';

            mapImg.style.width = w + 'px';
            mapImg.style.height = h + 'px';
            mapImg.setAttribute('width', w);
            mapImg.setAttribute('height', h);

            svgOverlay.style.width = w + 'px';
            svgOverlay.style.height = h + 'px';
            svgOverlay.setAttribute('width', w);
            svgOverlay.setAttribute('height', h);
            svgOverlay.setAttribute('viewBox', `0 0 ${w} ${h}`);
            svgOverlay.setAttribute('preserveAspectRatio', 'none');

            svgOverlay.innerHTML = '';

            plots.forEach(plot => {
                if (!plot.coords) return;
                const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
                poly.setAttribute("points", plot.coords);
                const colors = getColor(plot.status, plot.color);
                poly.setAttribute("fill", colors.fill);
                poly.setAttribute("stroke", colors.color);
                poly.setAttribute("stroke-width", "1");
                poly.id = "poly-" + String(plot.plot_id).trim();

                const isBlue = plot.color === 'blue';
                const isVacant = plot.status && plot.status.toLowerCase().includes('vac') && !isBlue;
                const isGarden = String(plot.plot_id).toLowerCase().includes('garden');
                const canInteract = !VIEW_MODE || isVacant || isGarden;

                if (canInteract) {
                    poly.onclick = (e) => {
                        e.stopPropagation();
                        highlightPolygon(poly, plot.status, plot.color);
                        if (isGarden) {
                            showGardenImage(plot.plot_id);
                        } else {
                            showPlotDetails(plot);
                        }
                    };

                    if (IS_ADMIN) {
                        poly.oncontextmenu = (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            highlightPolygon(poly, plot.status, plot.color);
                            startEdit(plot);
                        };
                    }
                }
                svgOverlay.appendChild(poly);
            });
        }

        // --- STATUS FILTER CHIPS ---
        function applyStatusFilter(filterType, btn) {
            currentStatusFilter = filterType;
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            if(btn) btn.classList.add('active');

            lastFetchedPlots.forEach(plot => {
                const poly = document.getElementById("poly-" + String(plot.plot_id).trim());
                if (!poly) return;

                const isBlue = plot.color === 'blue';
                const s = (plot.status || '').toLowerCase();

                let shouldHighlight = true;
                if (filterType === 'vacant') {
                    shouldHighlight = s.includes('vac') && !isBlue;
                } else if (filterType === 'booked') {
                    shouldHighlight = s.includes('book') && !isBlue;
                } else if (filterType === 'registry') {
                    shouldHighlight = s.includes('reg') && !isBlue;
                }

                if (shouldHighlight) {
                    poly.style.opacity = '1';
                    poly.style.pointerEvents = 'auto';
                } else {
                    poly.style.opacity = '0.12';
                    poly.style.pointerEvents = 'none';
                }
            });
        }

        // --- PLOT DETAILS DRAWER ---
        function showPlotDetails(data) {
            currentPlotData = data;
            const isBlue = data.color === 'blue';
            const colors = getColor(data.status, data.color);

            document.getElementById('drawer-plot-id').innerText = `Plot #${data.plot_id}`;
            
            const pill = document.getElementById('drawer-status-pill');
            if (isBlue) {
                pill.innerText = "Land Owner";
                pill.style.background = "#F1F5F9";
                pill.style.color = "#475569";
            } else {
                const st = data.status || 'Vacant';
                pill.innerText = st;
                if (st.toLowerCase().includes('reg')) {
                    pill.style.background = "var(--registry-bg)";
                    pill.style.color = "var(--registry)";
                } else if (st.toLowerCase().includes('book')) {
                    pill.style.background = "var(--booked-bg)";
                    pill.style.color = "var(--booked)";
                } else {
                    pill.style.background = "var(--vacant-bg)";
                    pill.style.color = "var(--vacant)";
                }
            }

            let html = `
                <div class="detail-card-grid">
                    <div class="detail-item-box">
                        <span class="detail-item-label"><i class="fa-solid fa-ruler-combined"></i> Plot Size</span>
                        <span class="detail-item-value">${data.size ? data.size + ' sq.ft' : 'Standard'}</span>
                    </div>
                    <div class="detail-item-box">
                        <span class="detail-item-label"><i class="fa-solid fa-building-user"></i> Plot Type</span>
                        <span class="detail-item-value">${isBlue ? 'Landowner' : 'Developer'}</span>
                    </div>
                </div>
            `;

            if (!VIEW_MODE) {
                html += `
                    <div class="detail-item-box" style="margin-bottom:12px;">
                        <span class="detail-item-label"><i class="fa-solid fa-user"></i> Allotted Owner</span>
                        <span class="detail-item-value">${data.owner || 'Not Assigned / Vacant'}</span>
                    </div>
                `;

                if (data.status && !String(data.status).toLowerCase().includes('vac')) {
                    const rawPhone = data.customer_number != null ? String(data.customer_number).trim() : '';
                    const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
                    const displayPhone = (rawPhone && rawPhone.toLowerCase() !== 'nan' && rawPhone.toLowerCase() !== 'null') ? rawPhone : 'N/A';
                    
                    html += `
                        <div class="detail-item-box" style="margin-bottom:12px;">
                            <span class="detail-item-label"><i class="fa-solid fa-phone"></i> Contact Phone</span>
                            <span class="detail-item-value">${displayPhone}</span>
                        </div>
                    `;

                    if (cleanPhone.length >= 7) {
                        html += `
                            <div class="contact-action-buttons">
                                <a href="tel:${cleanPhone}" class="btn-contact btn-call">
                                    <i class="fa-solid fa-phone"></i> Direct Call
                                </a>
                                <a href="https://wa.me/${cleanPhone}?text=Inquiry regarding Plot %23${data.plot_id} at ${projSel.value}" target="_blank" class="btn-contact btn-whatsapp">
                                    <i class="fa-brands fa-whatsapp"></i> WhatsApp
                                </a>
                            </div>
                        `;
                    }

                    if (data.booking_date) {
                        html += `
                            <div class="detail-item-box" style="margin-top:12px;">
                                <span class="detail-item-label"><i class="fa-solid fa-calendar-day"></i> Booking Date</span>
                                <span class="detail-item-value">${data.booking_date}</span>
                            </div>
                        `;
                    }
                }

                if (data.registry_date) {
                    html += `
                        <div class="detail-item-box" style="margin-top:12px;">
                            <span class="detail-item-label"><i class="fa-solid fa-certificate"></i> Registry Date</span>
                            <span class="detail-item-value">${data.registry_date}</span>
                        </div>
                    `;
                }

                if (IS_ADMIN) {
                    html += `
                        <button class="btn-admin-edit" onclick="startEdit(currentPlotData)">
                            <i class="fa-solid fa-pen-to-square"></i> Edit Plot Details
                        </button>
                    `;
                }
            } else {
                html += `
                    <div style="background:#FEF2F2; border:1px solid #FECACA; border-radius:12px; padding:14px; text-align:center; margin-top:12px;">
                        <span style="color:#DC2626; font-size:0.85rem; font-weight:700; display:block;">
                            <i class="fa-solid fa-circle-check"></i> Available for Immediate Booking
                        </span>
                        <span style="color:#B91C1C; font-size:0.75rem;">Contact Techunited sales desk to reserve this prime plot.</span>
                    </div>
                `;
            }

            document.getElementById('drawer-content-body').innerHTML = html;
            drawer.style.display = 'block';
            overlay.style.display = 'block';
            setTimeout(() => {
                drawer.classList.add('active');
                overlay.classList.add('active');
            }, 10);
        }

        function closeDrawer() {
            if (activePoly) resetPolygon(activePoly);
            drawer.classList.remove('active');
            overlay.classList.remove('active');
            setTimeout(() => {
                drawer.style.display = 'none';
                overlay.style.display = 'none';
            }, 200);
        }

        // --- ADMIN EDIT FORM ---
        function startEdit(data) {
            currentPlotData = data;
            const currentStatus = data.status || '';
            const statusReg = currentStatus.toLowerCase().includes('reg') ? 'selected' : '';
            const statusBook = currentStatus.toLowerCase().includes('book') ? 'selected' : '';
            const statusVac = currentStatus.toLowerCase().includes('vac') ? 'selected' : '';

            document.getElementById('drawer-plot-id').innerText = `Edit Plot #${data.plot_id}`;
            document.getElementById('drawer-status-pill').innerText = "Editing";
            document.getElementById('drawer-status-pill').style.background = "#FEF3C7";
            document.getElementById('drawer-status-pill').style.color = "#D97706";

            let formHtml = `
                <div class="form-group">
                    <label>Plot Size (sq.ft)</label>
                    <input type="text" id="edit-size" value="${data.size || ''}" class="form-control" placeholder="e.g. 1191.6">
                </div>
                <div class="form-group">
                    <label>Current Status</label>
                    <select id="edit-status" class="form-control">
                        <option value="Vacant" ${statusVac}>Vacant (Red)</option>
                        <option value="Booked" ${statusBook}>Booked (Yellow)</option>
                        <option value="Registry done" ${statusReg}>Registry done (Green)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Plot Category / Pattern</label>
                    <select id="edit-color" class="form-control">
                        <option value="">Standard Developer Plot</option>
                        <option value="blue" ${data.color === 'blue' ? 'selected' : ''}>Land Owner (Stripe Hatching)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Allotted Owner Name</label>
                    <input type="text" id="edit-owner" value="${data.owner || ''}" class="form-control" placeholder="Full name">
                </div>
                <div class="form-group">
                    <label>Customer Phone Number</label>
                    <input type="text" id="edit-num" value="${data.customer_number || ''}" class="form-control" placeholder="10-digit mobile number">
                </div>
                <div class="form-group">
                    <label>Booking Date</label>
                    <input type="date" id="edit-book" value="${data.booking_date || ''}" class="form-control">
                </div>
                <div class="form-group">
                    <label>Registry Date</label>
                    <input type="date" id="edit-reg" value="${data.registry_date || ''}" class="form-control">
                </div>
                <button class="btn-save-plot" onclick="saveDetails()">
                    <i class="fa-solid fa-floppy-disk"></i> Save Plot Changes
                </button>
            `;

            document.getElementById('drawer-content-body').innerHTML = formHtml;
            drawer.style.display = 'block';
            overlay.style.display = 'block';
            setTimeout(() => {
                drawer.classList.add('active');
                overlay.classList.add('active');
            }, 10);
        }

        function saveDetails() {
            const body = {
                project: projSel.value,
                plot_id: currentPlotData.plot_id,
                size: document.getElementById('edit-size').value,
                status: document.getElementById('edit-status').value,
                color: document.getElementById('edit-color').value,
                owner: document.getElementById('edit-owner').value,
                customer_number: document.getElementById('edit-num').value,
                booking_date: document.getElementById('edit-book').value,
                registry_date: document.getElementById('edit-reg').value
            };

            fetch('/save_plot_details', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })
            .then(res => res.json())
            .then(res => {
                if (res.success) {
                    showToast("Plot details saved successfully!");
                    closeDrawer();
                    loadMap();
                } else {
                    showToast("Error updating plot details.");
                }
            })
            .catch(() => showToast("Network error while saving."));
        }

        // --- KPI SUMMARY (Vacant -> Red, Booked -> Yellow, Registry -> Green) ---
        function updateSummary(plots) {
            if (!Array.isArray(plots)) return;
            const validPlots = plots.filter(p => p.color !== 'blue');
            const total = validPlots.length;
            const reg = plots.filter(p => p.status && p.status.toLowerCase().includes('reg')).length;
            const book = plots.filter(p => p.status && p.status.toLowerCase().includes('book')).length;
            const vacant = plots.filter(p => p.status && p.status.toLowerCase().includes('vac') && p.color !== 'blue').length;

            document.getElementById('count-total').innerText = total;
            document.getElementById('count-reg').innerText = reg;
            document.getElementById('count-book').innerText = book;
            document.getElementById('count-vacant').innerText = vacant;
        }

        // --- PLOT SEARCH & JUMP ---
        function searchPlot() {
            const searchId = document.getElementById('plot-search').value.trim();
            if (!searchId) return;

            const match = lastFetchedPlots.find(p => String(p.plot_id).trim() === searchId);
            if (match) {
                const poly = document.getElementById("poly-" + searchId);
                if (poly) {
                    highlightPolygon(poly, match.status, match.color);
                    showToast(`Plot #${searchId} found!`);
                    showPlotDetails(match);
                }
            } else {
                showToast(`Plot #${searchId} not found in this colony.`);
            }
        }

        function showGardenImage(gardenId) {
            document.getElementById('garden-title').innerText = gardenId.replace(/_/g, ' ').toUpperCase();
            const imgUrl = `https://jpeezqoinwzrruknbsmy.supabase.co/storage/v1/object/public/project-maps/${citySel.value}/${projSel.value}/${gardenId}.jpeg`;
            document.getElementById('garden-img').src = imgUrl;

            closeDrawer();
            document.getElementById('image-modal').style.display = 'block';
            overlay.style.display = 'block';
            setTimeout(() => overlay.classList.add('active'), 10);
        }

        // --- TOAST HELPER ---
        function showToast(msg) {
            const container = document.getElementById('toast-container');
            const toast = document.createElement('div');
            toast.className = 'toast-msg';
            toast.innerHTML = `<i class="fa-solid fa-circle-info"></i> ${msg}`;
            container.appendChild(toast);
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(10px)';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }
