// Usman Heart Care Clinic - Admin Dashboard Control Script

document.addEventListener("DOMContentLoaded", () => {
  // 1. Session Authentication
  const loginOverlay = document.getElementById("admin-login-overlay");
  const loginForm = document.getElementById("admin-login-form");
  const loginPassInput = document.getElementById("admin-password");
  const loginError = document.getElementById("login-error");
  const logoutBtn = document.getElementById("admin-logout-btn");

  function checkAuth() {
    if (sessionStorage.getItem("uhcAdminAuthenticated") === "true") {
      loginOverlay.style.display = "none";
      loadDashboard();
    } else {
      loginOverlay.style.display = "flex";
    }
  }

  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const settings = window.UHC.getSettings();
    if (loginPassInput.value === settings.adminPassword) {
      sessionStorage.setItem("uhcAdminAuthenticated", "true");
      loginOverlay.style.display = "none";
      loginError.style.display = "none";
      loginPassInput.value = "";
      loadDashboard();
    } else {
      loginError.style.display = "block";
    }
  });

  logoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem("uhcAdminAuthenticated");
    window.location.reload();
  });

  // Run Auth Check
  checkAuth();

  // 2. Tab Navigation switching
  const navItems = document.querySelectorAll(".admin-nav-item");
  const panels = document.querySelectorAll(".admin-panel");

  navItems.forEach(item => {
    item.addEventListener("click", () => {
      // Deactivate all
      navItems.forEach(nav => nav.classList.remove("active"));
      panels.forEach(panel => panel.classList.remove("active"));

      // Activate clicked
      item.classList.add("active");
      const tabId = item.getAttribute("data-tab");
      document.getElementById(`tab-${tabId}`).classList.add("active");
    });
  });

  // 3. Load Dashboard Data
  function loadDashboard() {
    renderAppointments();
    renderTimingsForm();
    renderServicesTable();
    populateGeneralSettings();
  }

  // ==========================================
  // APPOINTMENTS TAB LOGIC
  // ==========================================
  const apptsTbody = document.getElementById("appointments-tbody");
  const noApptsMsg = document.getElementById("no-appointments");
  const searchInput = document.getElementById("appt-search");
  const filterStatus = document.getElementById("appt-filter-status");
  const clearCancelledBtn = document.getElementById("btn-clear-cancelled");

  // Stats Counters
  const statTotal = document.getElementById("stat-total");
  const statPending = document.getElementById("stat-pending");
  const statConfirmed = document.getElementById("stat-confirmed");

  function renderAppointments() {
    const bookings = window.UHC.getBookings();
    
    // Update Stats
    const totalCount = bookings.length;
    const pendingCount = bookings.filter(b => b.status === "pending" || !b.status).length;
    const confirmedCount = bookings.filter(b => b.status === "confirmed").length;

    statTotal.textContent = totalCount;
    statPending.textContent = pendingCount;
    statConfirmed.textContent = confirmedCount;

    // Filters
    const query = searchInput.value.toLowerCase().trim();
    const statusVal = filterStatus.value;

    const filtered = bookings.filter(b => {
      const matchStatus = (statusVal === "all") ||
        (statusVal === "pending" && (b.status === "pending" || !b.status)) ||
        (statusVal === b.status);

      const matchSearch = !query ||
        b.bookingId.toLowerCase().includes(query) ||
        b.name.toLowerCase().includes(query) ||
        b.phone.toLowerCase().includes(query);

      return matchStatus && matchSearch;
    });

    // Sort by creation date descending
    filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    apptsTbody.innerHTML = "";
    if (filtered.length === 0) {
      noApptsMsg.style.display = "block";
      return;
    }
    noApptsMsg.style.display = "none";

    filtered.forEach(b => {
      const tr = document.createElement("tr");
      
      const bStatus = b.status || "pending";
      const statusClass = bStatus === "confirmed" ? "status-confirmed" : (bStatus === "cancelled" ? "status-cancelled" : "status-pending");
      
      const rawDate = new Date(b.date + "T12:00:00");
      const prettyDate = isNaN(rawDate) ? b.date : new Intl.DateTimeFormat("en-PK", { dateStyle: "medium" }).format(rawDate);
      const prettyTime = window.UHC.formatTime12h(b.time);

      // WhatsApp share text
      const waText = `Hello ${b.name}, this is Usman Heart Care Clinic. Regarding your appointment request ${b.bookingId} for ${prettyDate} at ${prettyTime}. We are writing to...`;
      const waLink = `https://wa.me/92${b.phone.substring(1)}?text=${encodeURIComponent(waText)}`;

      tr.innerHTML = `
        <td class="td-id"><strong>${b.bookingId}</strong></td>
        <td>
          <div class="patient-name">${escapeHtml(b.name)}</div>
          <div class="patient-meta">Age: ${b.age} • Phone: ${escapeHtml(b.phone)}</div>
        </td>
        <td><span class="service-tag">${escapeHtml(b.service.split(" — ")[0])}</span></td>
        <td>
          <div class="appt-date">${prettyDate}</div>
          <div class="appt-time">${prettyTime} (${b.durationMinutes || 30} mins)</div>
        </td>
        <td><span class="status-badge ${statusClass}">${bStatus.toUpperCase()}</span></td>
        <td>
          <div class="action-buttons">
            ${bStatus !== "confirmed" ? `<button class="btn-action confirm" data-id="${b.bookingId}" title="Confirm Request">✓</button>` : ""}
            ${bStatus !== "cancelled" ? `<button class="btn-action cancel" data-id="${b.bookingId}" title="Cancel Request">✗</button>` : ""}
            <a href="${waLink}" target="_blank" rel="noopener" class="btn-action whatsapp" title="Chat on WhatsApp">💬</a>
            <button class="btn-action delete" data-id="${b.bookingId}" title="Delete Record">🗑</button>
          </div>
        </td>
      `;

      apptsTbody.appendChild(tr);
    });

    // Hook events
    document.querySelectorAll(".btn-action.confirm").forEach(btn => {
      btn.addEventListener("click", () => updateAppointmentStatus(btn.getAttribute("data-id"), "confirmed"));
    });
    document.querySelectorAll(".btn-action.cancel").forEach(btn => {
      btn.addEventListener("click", () => updateAppointmentStatus(btn.getAttribute("data-id"), "cancelled"));
    });
    document.querySelectorAll(".btn-action.delete").forEach(btn => {
      btn.addEventListener("click", () => deleteAppointment(btn.getAttribute("data-id")));
    });
  }

  function updateAppointmentStatus(bookingId, status) {
    const bookings = window.UHC.getBookings();
    const appt = bookings.find(b => b.bookingId === bookingId);
    if (appt) {
      appt.status = status;
      window.UHC.saveBookings(bookings);
      renderAppointments();
    }
  }

  function deleteAppointment(bookingId) {
    if (confirm(`Are you sure you want to permanently delete appointment request ${bookingId}?`)) {
      let bookings = window.UHC.getBookings();
      bookings = bookings.filter(b => b.bookingId !== bookingId);
      window.UHC.saveBookings(bookings);
      renderAppointments();
    }
  }

  searchInput.addEventListener("input", renderAppointments);
  filterStatus.addEventListener("change", renderAppointments);

  clearCancelledBtn.addEventListener("click", () => {
    let bookings = window.UHC.getBookings();
    const beforeCount = bookings.length;
    bookings = bookings.filter(b => b.status !== "cancelled");
    const afterCount = bookings.length;

    if (beforeCount !== afterCount) {
      if (confirm(`Delete all ${beforeCount - afterCount} cancelled bookings permanently?`)) {
        window.UHC.saveBookings(bookings);
        renderAppointments();
      }
    } else {
      alert("No cancelled appointments to clear.");
    }
  });

  // ==========================================
  // TIMINGS TAB LOGIC
  // ==========================================
  const timingsForm = document.getElementById("timings-form");
  const timingsList = document.getElementById("timings-list-container");
  const timingsSuccessMsg = document.getElementById("timings-success-msg");

  function renderTimingsForm() {
    const timings = window.UHC.getTimings();
    timingsList.innerHTML = "";

    window.UHC.dayNames.forEach((dayName, index) => {
      const slots = timings[index] || [];
      const isOpen = slots.length > 0;

      // Deduce start/end hours and interval
      let startStr = "15:00";
      let endStr = "19:00";
      let interval = 30;

      if (isOpen) {
        startStr = slots[0];
        // Deduce interval
        if (slots.length > 1) {
          const [h1, m1] = slots[0].split(":").map(Number);
          const [h2, m2] = slots[1].split(":").map(Number);
          interval = (h2 * 60 + m2) - (h1 * 60 + m1);
        }
        // Deduce end
        const [hLast, mLast] = slots[slots.length - 1].split(":").map(Number);
        const endTotal = hLast * 60 + mLast + interval;
        const endH = Math.floor(endTotal / 60);
        const endM = endTotal % 60;
        endStr = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
      }

      const dayRow = document.createElement("div");
      dayRow.className = "day-config-row";
      dayRow.innerHTML = `
        <div class="day-chk-label">
          <input type="checkbox" id="chk-day-${index}" ${isOpen ? "checked" : ""}>
          <label for="chk-day-${index}"><strong>${dayName}</strong></label>
        </div>
        <div class="day-time-inputs" id="inputs-day-${index}" style="display: ${isOpen ? "flex" : "none"};">
          <div>
            <label>Start</label>
            <input type="time" id="start-day-${index}" value="${startStr}">
          </div>
          <div>
            <label>End</label>
            <input type="time" id="end-day-${index}" value="${endStr}">
          </div>
          <div>
            <label>Duration</label>
            <select id="dur-day-${index}">
              <option value="15" ${interval === 15 ? "selected" : ""}>15m</option>
              <option value="20" ${interval === 20 ? "selected" : ""}>20m</option>
              <option value="30" ${interval === 30 ? "selected" : ""}>30m</option>
              <option value="45" ${interval === 45 ? "selected" : ""}>45m</option>
              <option value="60" ${interval === 60 ? "selected" : ""}>60m</option>
            </select>
          </div>
        </div>
      `;

      timingsList.appendChild(dayRow);

      // Bind checkbox toggle visibility
      const chk = document.getElementById(`chk-day-${index}`);
      const inputs = document.getElementById(`inputs-day-${index}`);
      chk.addEventListener("change", () => {
        inputs.style.display = chk.checked ? "flex" : "none";
      });
    });
  }

  timingsForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const newTimings = {};

    window.UHC.dayNames.forEach((_, index) => {
      const isOpen = document.getElementById(`chk-day-${index}`).checked;
      if (isOpen) {
        const startVal = document.getElementById(`start-day-${index}`).value;
        const endVal = document.getElementById(`end-day-${index}`).value;
        const duration = parseInt(document.getElementById(`dur-day-${index}`).value);

        const slots = [];
        const [sh, sm] = startVal.split(":").map(Number);
        const [eh, em] = endVal.split(":").map(Number);

        let currentMins = sh * 60 + sm;
        const endMins = eh * 60 + em;

        while (currentMins < endMins) {
          const h = Math.floor(currentMins / 60);
          const m = currentMins % 60;
          slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
          currentMins += duration;
        }
        newTimings[index] = slots;
      }
    });

    window.UHC.saveTimings(newTimings);
    timingsSuccessMsg.style.display = "block";
    setTimeout(() => timingsSuccessMsg.style.display = "none", 3000);
  });

  // ==========================================
  // SERVICES TAB LOGIC
  // ==========================================
  const servicesTbody = document.getElementById("services-tbody");
  const addServiceForm = document.getElementById("add-service-form");

  function renderServicesTable() {
    const services = window.UHC.getServices();
    servicesTbody.innerHTML = "";

    services.forEach(s => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <div class="service-title-cell">${escapeHtml(s.title)}</div>
          <div class="service-desc-cell muted">${escapeHtml(s.desc)}</div>
        </td>
        <td><strong>${escapeHtml(s.price)}</strong></td>
        <td>
          <button class="btn btn-light btn-sm btn-delete-service" data-id="${s.id}">Delete</button>
        </td>
      `;
      servicesTbody.appendChild(tr);
    });

    document.querySelectorAll(".btn-delete-service").forEach(btn => {
      btn.addEventListener("click", () => deleteService(btn.getAttribute("data-id")));
    });
  }

  function deleteService(id) {
    let services = window.UHC.getServices();
    if (services.length <= 1) {
      alert("Must maintain at least 1 clinical service.");
      return;
    }
    if (confirm("Delete this service? This will remove it from index and booking pages.")) {
      services = services.filter(s => s.id !== id);
      window.UHC.saveServices(services);
      renderServicesTable();
    }
  }

  addServiceForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = document.getElementById("srv-title").value.trim();
    const price = document.getElementById("srv-price").value.trim();
    const desc = document.getElementById("srv-desc").value.trim();

    const services = window.UHC.getServices();
    const newService = {
      id: "s" + Date.now(),
      title,
      price,
      desc
    };

    services.push(newService);
    window.UHC.saveServices(services);
    
    // Reset Form
    addServiceForm.reset();
    renderServicesTable();
  });

  // ==========================================
  // SETTINGS & BOT TAB LOGIC
  // ==========================================
  const clinicForm = document.getElementById("clinic-info-form");
  const botForm = document.getElementById("chatbot-settings-form");
  const passwordForm = document.getElementById("change-password-form");

  const clinicSuccess = document.getElementById("clinic-success-msg");
  const botSuccess = document.getElementById("bot-success-msg");
  const passwordSuccess = document.getElementById("password-success-msg");
  const passwordError = document.getElementById("password-error-msg");

  const keyInput = document.getElementById("gemini-key");
  const toggleKeyBtn = document.getElementById("btn-toggle-key");

  function populateGeneralSettings() {
    const settings = window.UHC.getSettings();
    const botSettings = window.UHC.getChatbotSettings();

    // Clinic Details
    document.getElementById("clinic-name").value = settings.name;
    document.getElementById("clinic-location").value = settings.location;
    document.getElementById("clinic-maps").value = settings.mapsUrl;
    document.getElementById("clinic-phone").value = settings.phone;
    document.getElementById("clinic-whatsapp").value = settings.whatsapp;

    // Doctor Details
    document.getElementById("doc-name").value = settings.doctorName;
    document.getElementById("doc-title").value = settings.doctorTitle;
    document.getElementById("doc-degree").value = settings.doctorDegree;
    document.getElementById("doc-desc").value = settings.doctorDescription;

    // Bot Details
    keyInput.value = botSettings.geminiApiKey || "";
    document.getElementById("bot-greeting").value = botSettings.greeting;
  }

  clinicForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const settings = window.UHC.getSettings();

    settings.name = document.getElementById("clinic-name").value.trim();
    settings.location = document.getElementById("clinic-location").value.trim();
    settings.mapsUrl = document.getElementById("clinic-maps").value.trim();
    settings.phone = document.getElementById("clinic-phone").value.trim();
    settings.whatsapp = document.getElementById("clinic-whatsapp").value.trim();

    settings.doctorName = document.getElementById("doc-name").value.trim();
    settings.doctorTitle = document.getElementById("doc-title").value.trim();
    settings.doctorDegree = document.getElementById("doc-degree").value.trim();
    settings.doctorDescription = document.getElementById("doc-desc").value.trim();

    window.UHC.saveSettings(settings);
    clinicSuccess.style.display = "block";
    setTimeout(() => clinicSuccess.style.display = "none", 3000);
  });

  botForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const botSettings = window.UHC.getChatbotSettings();

    botSettings.geminiApiKey = keyInput.value.trim();
    botSettings.greeting = document.getElementById("bot-greeting").value.trim();

    window.UHC.saveChatbotSettings(botSettings);
    botSuccess.style.display = "block";
    setTimeout(() => botSuccess.style.display = "none", 3000);
  });

  toggleKeyBtn.addEventListener("click", () => {
    if (keyInput.type === "password") {
      keyInput.type = "text";
      toggleKeyBtn.textContent = "Hide";
    } else {
      keyInput.type = "password";
      toggleKeyBtn.textContent = "Show";
    }
  });

  passwordForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const newPass = document.getElementById("new-password").value;
    const confirmPass = document.getElementById("confirm-password").value;

    if (newPass !== confirmPass) {
      passwordError.style.display = "block";
      passwordSuccess.style.display = "none";
      return;
    }

    passwordError.style.display = "none";
    const settings = window.UHC.getSettings();
    settings.adminPassword = newPass;
    window.UHC.saveSettings(settings);

    passwordSuccess.style.display = "block";
    passwordForm.reset();
    setTimeout(() => passwordSuccess.style.display = "none", 3000);
  });

  // Helpers
  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
  }
});
