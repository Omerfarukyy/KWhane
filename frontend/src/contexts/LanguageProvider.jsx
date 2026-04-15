import React, { createContext, useContext, useState } from "react";

const translations = {
    tr: {
        dashboard: "Panel",
        consumption: "Aylık Tüketim Durumu",
        settings: "Ayarlar",
        efficiency: "Verimlilik",
        recommendations: "AI Önerileri",
        logout: "Çıkış Yap",
        login: "Giriş",
        register: "Kayıt Ol",
        overview: "Genel Bakış",
        addDevice: "Cihaz Ekle",
        support: "Destek Merkezi",
        estimatedBill: "Tahmini Fatura",
        seeDetails: "Detayları Gör",
        selectNewDevice: "Yeni Cihaz Seç",
        cancel: "Vazgeç",
        airConditioner: "Klima",
        television: "Televizyon",
        fridge: "Buzdolabı",
        washingMachine: "Çamaşır Mk.",
        back: "Geri",
        updateEmail: "E-posta Güncelle",
        newEmail: "Yeni E-posta Adresi",
        currentPassword: "Mevcut Şifre",
        save: "Kaydet",
        changePassword: "Şifre Değiştir",
        newPassword: "Yeni Şifre",
        newPasswordConfirm: "Yeni Şifre (Tekrar)",
        updatePassword: "Şifreyi Güncelle",
        accountInfo: "Hesap Bilgileri",
        changeEmail: "E-posta Değiştir",
        profileSettings: "Profil Ayarları",
        systemSettings: "Sistem Ayarları",
        unitsAndRegion: "Birimler ve Bölge",
        defaultTariff: "Varsayılan Tarife",
        dataPrivacy: "Veri Gizliliği",
        performance: "Performans",
        deviceIntegration: "Cihaz Entegrasyonu",
        unitsDesc: "Uygulama genelinde kullanılacak ölçü birimleri ve bölgesel ayarlar.",
        energyUnit: "Enerji Birimi",
        currency: "Para Birimi",
        timezone: "Zaman Dilimi",
        dateFormat: "Tarih Formatı",
        saveChanges: "Değişiklikleri Kaydet",
        supportCenter: "Destek ve Bildirim Merkezi",
        goBack: "Geri Dön",
        kwhaneAi: "KWhane AI",
        aiRecommendationEx: "Buzdolabınız standartların <strong>%25</strong> üzerinde enerji harcıyor. A+++ model ile ayda 120₺ tasarruf edilebilir.",
        monthlyConsumptionStatus: "Aylık Tüketim Durumu",
        kwh: "KWH",
        addRoomFirst: "Lütfen önce bir oda ekleyin!",
    },
    en: {
        dashboard: "Dashboard",
        consumption: "Monthly Consumption",
        settings: "Settings",
        efficiency: "Efficiency",
        recommendations: "AI Recommendations",
        logout: "Logout",
        login: "Login",
        register: "Register",
        overview: "Overview",
        addDevice: "Add Device",
        support: "Support Center",
        estimatedBill: "Estimated Bill",
        seeDetails: "See Details",
        selectNewDevice: "Select New Device",
        cancel: "Cancel",
        airConditioner: "Air Conditioner",
        television: "Television",
        fridge: "Fridge",
        washingMachine: "Washing Mach.",
        back: "Back",
        updateEmail: "Update Email",
        newEmail: "New Email Address",
        currentPassword: "Current Password",
        save: "Save",
        changePassword: "Change Password",
        newPassword: "New Password",
        newPasswordConfirm: "New Password (Confirm)",
        updatePassword: "Update Password",
        accountInfo: "Account Info",
        changeEmail: "Change Email",
        profileSettings: "Profile Settings",
        systemSettings: "System Settings",
        unitsAndRegion: "Units & Region",
        defaultTariff: "Default Tariff",
        dataPrivacy: "Data Privacy",
        performance: "Performance",
        deviceIntegration: "Device Integration",
        unitsDesc: "Unit and regional settings used throughout the application.",
        energyUnit: "Energy Unit",
        currency: "Currency",
        timezone: "Timezone",
        dateFormat: "Date Format",
        saveChanges: "Save Changes",
        supportCenter: "Support & Ticket Center",
        goBack: "Go Back",
        kwhaneAi: "KWhane AI",
        aiRecommendationEx: "Your fridge uses <strong>25%</strong> more energy than average. Switching to an A+++ model could save ₺120/month.",
        monthlyConsumptionStatus: "Monthly Consumption",
        kwh: "KWH",
        addRoomFirst: "Please add a room first!",
    },
};

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const [lang, setLang] = useState(() => {
        return localStorage.getItem("kwhane-lang") || "tr";
    });

    const t = (key, fallback) => translations[lang][key] || fallback || key;

    const toggleLanguage = () => {
        const newLang = lang === "tr" ? "en" : "tr";
        setLang(newLang);
        localStorage.setItem("kwhane-lang", newLang);
    };

    return (
        <LanguageContext.Provider value={{ lang, setLang, toggleLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) throw new Error("useLanguage must be used within a LanguageProvider");
    return context;
};
