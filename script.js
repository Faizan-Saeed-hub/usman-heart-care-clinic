// Usman Heart Care Clinic - Frontend Script
// Handles page navigation, search queries, dynamic UI rendering, and booking logic.

document.addEventListener("DOMContentLoaded", () => {
  // Mobile Menu Toggle
  const menuBtn = document.querySelector(".menu-btn");
  const navLinks = document.querySelector(".nav-links");
  if (menuBtn && navLinks) {
    menuBtn.addEventListener("click", () => navLinks.classList.toggle("open"));
  }

  // Render Dynamic Elements across all pages
  renderDynamicContent();

  // Clinic search: opens a Google Maps search with the clinic query
  const searchInput = document.getElementById("clinicSearch");
  const searchButton = document.getElementById("searchClinic");
  const searchResult = document.getElementById("searchResult");
  
  function runClinicSearch() {
    const settings = window.UHC.getSettings();
    const defaultQuery = `${settings.name}, ${settings.location}`;
    const query = (searchInput?.value || defaultQuery).trim();
    if (!query) return;
    const mapsUrl = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(query);
    if (searchResult) {
      searchResult.innerHTML = `Searching for <strong>${escapeHtml(query)}</strong>… <a href="${mapsUrl}" target="_blank" rel="noopener">Open Google Maps ↗</a>`;
    }
    window.open(mapsUrl, "_blank", "noopener");
  }
  searchButton?.addEventListener("click", runClinicSearch);
  searchInput?.addEventListener("keydown", e => { if (e.key === "Enter") runClinicSearch(); });

  // Appointment system configuration
  const form = document.getElementById("appointmentForm");
  const dateInput = document.getElementById("date");
  const timeSelect = document.getElementById("time");
  const message = document.getElementById("bookingMessage");

  function localDateString(date) {
    const y = date.getFullYear(), m = String(date.getMonth() + 1).padStart(2, "0"), d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  
  if (dateInput) {
    dateInput.min = localDateString(new Date());
    dateInput.addEventListener("change", updateTimes);
  }

  function updateTimes() {
    if (!dateInput || !timeSelect) return;
    const selected = new Date(dateInput.value + "T12:00:00");
    const day = selected.getDay();
    timeSelect.innerHTML = "";
    
    const timings = window.UHC.getTimings();
    const slots = timings[day] || [];
    
    if (!slots.length) {
      timeSelect.innerHTML = '<option value="">Clinic is closed on this day</option>';
      return;
    }
    timeSelect.innerHTML = '<option value="">Select time</option>';
    slots.forEach(t => {
      const option = document.createElement("option");
      option.value = t;
      option.textContent = window.UHC.formatTime12h(t) + " (30 min)";
      timeSelect.appendChild(option);
    });
  }

  form?.addEventListener("submit", e => {
    e.preventDefault();
    message.className = "message";
    const data = Object.fromEntries(new FormData(form).entries());
    const phone = data.phone.replace(/\D/g, "");
    
    if (phone.length < 10 || phone.length > 12) {
      showMessage("Please enter a valid phone number (e.g. 03XXXXXXXXX).", false); 
      return;
    }
    
    const chosen = new Date(data.date + "T12:00:00");
    const timings = window.UHC.getTimings();
    if (!timings[chosen.getDay()] || timings[chosen.getDay()].length === 0) {
      showMessage("The selected date is a clinic-closed day. Please choose a day when the clinic is open.", false); 
      return;
    }

    const bookingId = "UHC-" + Date.now().toString().slice(-7);
    const bookings = window.UHC.getBookings();
    const booking = { ...data, phone, bookingId, createdAt: new Date().toISOString(), durationMinutes: 30, status: "pending" };
    bookings.push(booking);
    window.UHC.saveBookings(bookings);

    const prettyDate = new Intl.DateTimeFormat("en-PK", { dateStyle: "full" }).format(chosen);
    const prettyTime = window.UHC.formatTime12h(data.time);
    const waText = [
      "Hello Usman Heart care clinic,",
      `I would like to request an appointment.`,
      `Booking ID: ${bookingId}`,
      `Patient: ${data.name}`,
      `Age: ${data.age}`,
      `Phone: ${data.phone}`,
      `Service: ${data.service}`,
      `Date: ${prettyDate}`,
      `Time: ${prettyTime}`,
      `Duration: 30 minutes`,
      data.notes ? `Notes: ${data.notes}` : ""
    ].filter(Boolean).join("\n");

    const settings = window.UHC.getSettings();
    const cleanWA = settings.whatsapp.replace(/\D/g, "");
    const formattedWA = cleanWA.startsWith("92") ? cleanWA : (cleanWA.startsWith("0") ? "92" + cleanWA.substring(1) : "92" + cleanWA);
    
    showMessage(`Request saved successfully. Booking ID: <strong>${bookingId}</strong><br><br><a class="btn btn-whatsapp" href="https://wa.me/${formattedWA}?text=${encodeURIComponent(waText)}" target="_blank" rel="noopener">Send Request on WhatsApp</a>`, true);
    
    form.reset();
    timeSelect.innerHTML = '<option value="">Select a date first</option>';
    dateInput.min = localDateString(new Date());
  });

  function showMessage(text, ok) {
    message.innerHTML = text;
    message.className = "message " + (ok ? "success" : "error");
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
  }

  // ==========================================================
  // DYNAMIC VIEW RENDERING HANDLER
  // ==========================================================
  function renderDynamicContent() {
    const settings = window.UHC.getSettings();
    const services = window.UHC.getServices();
    const timings = window.UHC.getTimings();

    // 1. Footer Replacement
    const footerName = document.getElementById("footer-clinic-name");
    const footerLoc = document.getElementById("footer-clinic-loc");
    const footerPhone = document.getElementById("footer-phone");
    const footerWa = document.getElementById("footer-wa");
    const footerMaps = document.getElementById("footer-maps");

    if (footerName) footerName.textContent = settings.name;
    if (footerLoc) footerLoc.textContent = settings.location;
    if (footerPhone) {
      footerPhone.textContent = settings.phone;
      footerPhone.setAttribute("href", "tel:" + settings.phone);
    }
    if (footerWa) {
      footerWa.textContent = settings.whatsapp;
      const cleanWA = settings.whatsapp.replace(/\D/g, "");
      const formattedWA = cleanWA.startsWith("92") ? cleanWA : (cleanWA.startsWith("0") ? "92" + cleanWA.substring(1) : "92" + cleanWA);
      footerWa.setAttribute("href", "https://wa.me/" + formattedWA);
    }
    if (footerMaps) footerMaps.setAttribute("href", settings.mapsUrl);

    // 2. Home Page (index.html) Specific Rendering
    const heroPhone = document.getElementById("hero-phone");
    const heroWa = document.getElementById("hero-whatsapp");
    const heroMapsBtn = document.getElementById("hero-maps-btn");
    const heroHeading = document.getElementById("hero-heading");
    const heroSub = document.getElementById("hero-subheading");

    if (heroPhone) heroPhone.textContent = settings.phone;
    if (heroWa) heroWa.textContent = settings.whatsapp;
    if (heroMapsBtn) heroMapsBtn.setAttribute("href", settings.mapsUrl);
    if (heroHeading) heroHeading.innerHTML = `Trusted heart care, <span>close to home.</span>`;
    if (heroSub) heroSub.textContent = `Consultation, ECG and echocardiography services at ${settings.name} in Sharaqpur.`;

    // Services Grid
    const servicesContainer = document.getElementById("services-container");
    if (servicesContainer) {
      servicesContainer.innerHTML = "";
      const icons = ["✚", "↻", "♥", "◉", "+", "+", "✚", "♥"];
      services.forEach((s, idx) => {
        const icon = icons[idx % icons.length];
        const card = document.createElement("article");
        card.className = "service-card";
        card.innerHTML = `
          <div class="service-icon">${icon}</div>
          <h3>${escapeHtml(s.title)}</h3>
          <strong>${escapeHtml(s.price)}</strong>
          <p>${escapeHtml(s.desc)}</p>
        `;
        servicesContainer.appendChild(card);
      });
    }

    // Timings Hours
    const hoursContainer = document.getElementById("hours-container");
    if (hoursContainer) {
      hoursContainer.innerHTML = "";
      const dayOrder = [1, 2, 3, 4, 5, 6, 0]; // Monday to Sunday
      dayOrder.forEach(d => {
        const slots = timings[d] || [];
        const hrsText = getDayHoursString(slots);
        const isClosed = hrsText === "Closed";
        
        const row = document.createElement("div");
        if (isClosed) row.className = "closed";
        row.innerHTML = `<b>${window.UHC.dayNames[d]}</b><span>${hrsText}</span>`;
        hoursContainer.appendChild(row);
      });
    }

    // Clinic Open/Closed Indicator Status Update
    updateClinicOpenStatus();

    // 3. Appointment Page (appointment.html) Specific Rendering
    const sideWaLink = document.getElementById("side-wa-link");
    const apptScheduleContainer = document.getElementById("appt-schedule-container");
    const serviceSelect = document.getElementById("service");

    if (sideWaLink) {
      sideWaLink.textContent = `WhatsApp ${settings.whatsapp}`;
      const cleanWA = settings.whatsapp.replace(/\D/g, "");
      const formattedWA = cleanWA.startsWith("92") ? cleanWA : (cleanWA.startsWith("0") ? "92" + cleanWA.substring(1) : "92" + cleanWA);
      sideWaLink.setAttribute("href", `https://wa.me/${formattedWA}?text=Hello%20${encodeURIComponent(settings.name)}%2C%20I%20would%20like%20to%20book%20an%20appointment.`);
    }

    if (apptScheduleContainer) {
      apptScheduleContainer.innerHTML = "";
      const dayOrder = [1, 2, 3, 4, 5, 6, 0]; // Mon to Sun
      dayOrder.forEach(d => {
        const slots = timings[d] || [];
        const hrsText = getDayHoursString(slots);
        const isClosed = hrsText === "Closed";
        
        const p = document.createElement("p");
        if (isClosed) p.className = "muted";
        p.innerHTML = `<b>${window.UHC.dayNames[d]}</b><br>${hrsText}`;
        apptScheduleContainer.appendChild(p);
      });
    }

    if (serviceSelect) {
      // Keep first default option
      serviceSelect.innerHTML = '<option value="">Select service</option>';
      services.forEach(s => {
        const option = document.createElement("option");
        option.value = `${s.title} — ${s.price}`;
        option.textContent = `${s.title} — ${s.price}`;
        serviceSelect.appendChild(option);
      });
    }

    // 4. Contact Page (contact.html) Specific Rendering
    const contactPhoneLink = document.getElementById("contact-phone-link");
    const contactPhoneBtn = document.getElementById("contact-phone-btn");
    const contactWaLink = document.getElementById("contact-wa-link");
    const contactWaBtn = document.getElementById("contact-wa-btn");
    const contactLocText = document.getElementById("contact-loc-text");
    const contactMapsBtn = document.getElementById("contact-maps-btn");

    const mapClinicName = document.getElementById("map-clinic-name");
    const mapClinicLoc = document.getElementById("map-clinic-loc");
    const mapDirectionsBtn = document.getElementById("map-directions-btn");
    const contactHoursContainer = document.getElementById("contact-hours-container");

    if (contactPhoneLink) {
      contactPhoneLink.textContent = settings.phone;
      contactPhoneLink.setAttribute("href", "tel:" + settings.phone);
    }
    if (contactPhoneBtn) {
      contactPhoneBtn.setAttribute("href", "tel:" + settings.phone);
    }
    if (contactWaLink) {
      contactWaLink.textContent = settings.whatsapp;
      const cleanWA = settings.whatsapp.replace(/\D/g, "");
      const formattedWA = cleanWA.startsWith("92") ? cleanWA : (cleanWA.startsWith("0") ? "92" + cleanWA.substring(1) : "92" + cleanWA);
      contactWaLink.setAttribute("href", "https://wa.me/" + formattedWA);
    }
    if (contactWaBtn) {
      const cleanWA = settings.whatsapp.replace(/\D/g, "");
      const formattedWA = cleanWA.startsWith("92") ? cleanWA : (cleanWA.startsWith("0") ? "92" + cleanWA.substring(1) : "92" + cleanWA);
      contactWaBtn.setAttribute("href", "https://wa.me/" + formattedWA);
    }
    if (contactLocText) {
      contactLocText.innerHTML = `<strong>${escapeHtml(settings.name)}</strong><br>${escapeHtml(settings.location)}`;
    }
    if (contactMapsBtn) {
      contactMapsBtn.setAttribute("href", settings.mapsUrl);
    }
    if (mapClinicName) {
      mapClinicName.textContent = settings.name;
    }
    if (mapClinicLoc) {
      mapClinicLoc.textContent = settings.location;
    }
    if (mapDirectionsBtn) {
      mapDirectionsBtn.setAttribute("href", settings.mapsUrl);
    }

    if (contactHoursContainer) {
      contactHoursContainer.innerHTML = "";
      const dayOrder = [1, 2, 3, 4, 5, 6, 0];
      dayOrder.forEach(d => {
        const slots = timings[d] || [];
        const hrsText = getDayHoursString(slots);
        const isClosed = hrsText === "Closed";
        
        const row = document.createElement("div");
        if (isClosed) row.className = "closed";
        row.innerHTML = `<b>${window.UHC.dayNames[d]}</b><span>${hrsText}</span>`;
        contactHoursContainer.appendChild(row);
      });
    }
  }

  // Helper to format slot array to string
  function getDayHoursString(slots) {
    if (!slots || slots.length === 0) return "Closed";
    const start = window.UHC.formatTime12h(slots[0]);
    
    let duration = 30;
    if (slots.length > 1) {
      const [h1, m1] = slots[0].split(":").map(Number);
      const [h2, m2] = slots[1].split(":").map(Number);
      duration = (h2 * 60 + m2) - (h1 * 60 + m1);
    }
    const [hLast, mLast] = slots[slots.length - 1].split(":").map(Number);
    const endTotal = hLast * 60 + mLast + duration;
    const endH = Math.floor(endTotal / 60);
    const endM = endTotal % 60;
    const endStr = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
    const end = window.UHC.formatTime12h(endStr);
    
    return `${start} – ${end}`;
  }

  // Helper to update home status card
  function updateClinicOpenStatus() {
    const dot = document.getElementById("clinic-status-dot");
    const text = document.getElementById("clinic-status-text");
    if (!dot || !text) return;
    
    const now = new Date();
    const day = now.getDay();
    const timings = window.UHC.getTimings();
    const slots = timings[day] || [];
    
    if (slots.length === 0) {
      dot.style.color = "var(--red)";
      text.textContent = "Clinic Closed Today";
      return;
    }
    
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const [sh, sm] = slots[0].split(":").map(Number);
    const startMins = sh * 60 + sm;
    
    let duration = 30;
    if (slots.length > 1) {
      const [h1, m1] = slots[0].split(":").map(Number);
      const [h2, m2] = slots[1].split(":").map(Number);
      duration = (h2 * 60 + m2) - (h1 * 60 + m1);
    }
    const [eh, em] = slots[slots.length - 1].split(":").map(Number);
    const endMins = eh * 60 + em + duration;
    
    if (currentMins >= startMins && currentMins < endMins) {
      dot.style.color = "#20b66a"; // green
      text.textContent = "Clinic Open Now";
    } else {
      dot.style.color = "#ffa502"; // orange
      text.textContent = "Clinic Closed (Opens at " + window.UHC.formatTime12h(slots[0]) + ")";
    }
  }
});