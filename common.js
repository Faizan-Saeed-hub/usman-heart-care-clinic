// Usman Heart Care Clinic - Common Data Utilities
// Manages clinic settings, timings, services, and chatbot configuration dynamically.

(function () {
  const STORAGE_KEYS = {
    settings: "uhcClinicSettings",
    services: "uhcServices",
    timings: "uhcTimings",
    chatbot: "uhcChatbotSettings",
    bookings: "uhcBookings"
  };

  const defaultSettings = {
    name: "Usman Heart care clinic",
    location: "Sharaqpur, Sheikhupura, Punjab, Pakistan",
    phone: "0334-4192623",
    whatsapp: "0341-4114536",
    mapsUrl: "https://www.google.com/maps/place/Usman+Heart+Care+Clinic,+Sharaqpur",
    doctorName: "Dr. Rasheed Ahmad",
    doctorTitle: "Consultant Cardiologist",
    doctorDegree: "MBBS, FCPS (Cardiology)",
    doctorDescription: "Dr. Rasheed Ahmad is a highly experienced Consultant Cardiologist dedicated to providing comprehensive cardiac care. He specializes in clinical consultations, electrocardiography (ECG), and echocardiography, ensuring patient-centered treatment and state-of-the-art heart diagnosis in Sharaqpur.",
    adminPassword: "admin123"
  };

  const defaultServices = [
    { id: "s1", title: "Consultation / Check-up", price: "Rs. 1,500", desc: "Initial consultation and clinical check-up." },
    { id: "s2", title: "Follow-up Visit", price: "Rs. 500", desc: "Repeat visit within one month." },
    { id: "s3", title: "ECG Test", price: "Rs. 400", desc: "Electrocardiogram testing available at the clinic." },
    { id: "s4", title: "Echocardiography", price: "Rs. 3,000", desc: "Echo cardiac imaging service." },
    { id: "s5", title: "Angiography", price: "Facility available", desc: "Ask the clinic for current arrangements and charges." },
    { id: "s6", title: "Angioplasty", price: "Facility available", desc: "Ask the clinic for current arrangements and charges." }
  ];

  const defaultTimings = {
    1: ["16:00", "16:30", "17:00", "17:30", "18:00", "18:30"], // Monday
    4: ["15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30"], // Thursday
    6: ["09:00", "09:30", "10:00", "10:30"], // Saturday
    0: ["15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30"] // Sunday
  };

  const configApiKey = (window.UHC_CONFIG && window.UHC_CONFIG.geminiApiKey) || "";

  const defaultChatbotSettings = {
    geminiApiKey: configApiKey,
    greeting: "Hello! I am UHC-Bot, the virtual assistant for Usman Heart Care Clinic. How can I help you today?"
  };

  // Helper to safely get from localStorage
  function getLocalData(key, fallback) {
    const val = localStorage.getItem(key);
    if (!val) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    try {
      return JSON.parse(val);
    } catch (e) {
      console.error("Error parsing local storage key: " + key, e);
      return fallback;
    }
  }

  // Helper to save to localStorage
  function saveLocalData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // Initialize data if not present
  const settings = getLocalData(STORAGE_KEYS.settings, defaultSettings);
  if (settings.doctorName === "Dr. Muhammad Usman") {
    settings.doctorName = defaultSettings.doctorName;
    settings.name = defaultSettings.name;
    settings.doctorDescription = defaultSettings.doctorDescription;
    saveLocalData(STORAGE_KEYS.settings, settings);
  }
  getLocalData(STORAGE_KEYS.services, defaultServices);
  getLocalData(STORAGE_KEYS.timings, defaultTimings);
  
  const botSettings = getLocalData(STORAGE_KEYS.chatbot, defaultChatbotSettings);
  const lastConfigKey = localStorage.getItem("uhcLastConfigApiKey") || "";
  if (configApiKey !== "" && configApiKey !== lastConfigKey) {
    botSettings.geminiApiKey = configApiKey;
    saveLocalData(STORAGE_KEYS.chatbot, botSettings);
    localStorage.setItem("uhcLastConfigApiKey", configApiKey);
  } else if ((!botSettings.geminiApiKey || botSettings.geminiApiKey === "") && configApiKey !== "") {
    botSettings.geminiApiKey = configApiKey;
    saveLocalData(STORAGE_KEYS.chatbot, botSettings);
  }
  
  getLocalData(STORAGE_KEYS.bookings, []);

  // Global namespace definitions
  window.UHC = {
    getSettings: () => getLocalData(STORAGE_KEYS.settings, defaultSettings),
    saveSettings: (settings) => saveLocalData(STORAGE_KEYS.settings, settings),

    getServices: () => getLocalData(STORAGE_KEYS.services, defaultServices),
    saveServices: (services) => saveLocalData(STORAGE_KEYS.services, services),

    getTimings: () => getLocalData(STORAGE_KEYS.timings, defaultTimings),
    saveTimings: (timings) => saveLocalData(STORAGE_KEYS.timings, timings),

    getChatbotSettings: () => getLocalData(STORAGE_KEYS.chatbot, defaultChatbotSettings),
    saveChatbotSettings: (settings) => saveLocalData(STORAGE_KEYS.chatbot, settings),

    getBookings: () => getLocalData(STORAGE_KEYS.bookings, []),
    saveBookings: (bookings) => saveLocalData(STORAGE_KEYS.bookings, bookings),

    // Common Day of Week helper
    dayNames: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],

    // Helper to format 24h time to 12h (AM/PM)
    formatTime12h: function (t) {
      if (!t) return "";
      let [h, m] = t.split(":").map(Number);
      const ap = h >= 12 ? "PM" : "AM";
      h = h % 12 || 12;
      return `${h}:${String(m).padStart(2, "0")} ${ap}`;
    }
  };
})();
