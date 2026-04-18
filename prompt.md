# KWhane — AI Vizyon ve Onboarding Dokümanı

> Bu dosya, KWhane projesinde sana (AI asistan) yardım edebilmen için hazırlanmıştır. Cursor, Claude Code, ChatGPT, Copilot veya başka bir AI aracı kullanıyorsan, **kod yazmadan önce bu dosyayı oku**. Proje sahibi her seferinde aynı vizyonu anlatmaktan kurtulmak için bunu yazdı.

---

## 1. Tek Cümle

**KWhane**, Türk haneleri için 3D ev simülasyonu üzerinden enerji tüketimini ML ile tahmin edip kişiselleştirilmiş tasarruf önerileri veren full-stack web uygulamasıdır (lisans bitirme projesi).

---

## 2. Vizyon ve Hedef Kullanıcı

- **Kullanıcı:** Türkiye'de yaşayan, elektrik faturasını anlamak ve düşürmek isteyen ev sahibi.
- **Değer önerisi:** "Teorik watt × saat" değil, **gerçek aylık kWh** tahmini. Duty cycle, verim sınıfı (A+++ → G), cihaz yaşı, kademeli tarife — hepsi hesaba katılır.
- **Deneyim:** Kullanıcı evini 3D olarak kurar (oda + cihaz), sistem otomatik olarak kWh tahmini, fatura kırılımı, benzer hanelerle karşılaştırma ve **Türkçe konuşan AI danışman** sunar.
- **Lisans projesi olarak amaç:** ML + 3D + LLM + cloud DB entegrasyonunu üretim kalitesinde birleştirmek.

---

## 3. Yüksek Seviye Mimari

```
┌──────────────────────────┐         ┌─────────────────────────────────┐
│ React + Three.js         │  ⇄      │ Supabase                        │
│ Frontend (Vite)          │  axios  │ PostgreSQL + Auth + RLS         │
│  - 3D simülasyon (R3F)   │         │  - homes / rooms / devices      │
│  - Dashboard UI          │         │  - device_calculations          │
│  - AiAssistant chat      │         │  - device_comparisons           │
└────────┬─────────────────┘         │  - recommendations / tickets    │
         │                           └────────────┬────────────────────┘
         │ /chat                                  │ INSERT trigger
         ▼                                        ▼
┌──────────────────────────┐         ┌─────────────────────────────────┐
│ FastAPI ML Backend       │  ←──────│ n8n Workflow                    │
│ (Python)                 │         │  - cihaz eklendiğinde tetiklenir │
│  /calculate              │         │  - /calculate /compare /savings  │
│  /compare                │         │    sırayla çağrılır              │
│  /savings  /chat /health │         │  - sonuçlar Supabase'e yazılır  │
└────┬─────────────┬───────┘         └─────────────────────────────────┘
     │             │
     ▼             ▼
[scikit-learn]  [Ollama Llama 3.2 (lokal)]
 - GBR          - Türkçe enerji danışmanı
 - KMeans       - OpenAI-compatible API
```

---

## 4. Klasör Haritası

| Klasör | İçerik |
|---|---|
| [frontend/](frontend/) | React 19 + Vite + Tailwind 4 + Zustand + R3F |
| [ML-python/](ML-python/) | FastAPI + scikit-learn + Pydantic v2 |
| [ML-python/ml/](ML-python/ml/) | Eğitilen modeller (GBR, KMeans, savings scorer) |
| [ML-python/services/](ML-python/services/) | İş mantığı katmanı (calculate, compare, chat, savings, tariff) |
| [ML-python/data/](ML-python/data/) | Cihaz profilleri + sentetik veri üretici |
| [ML-python/models/](ML-python/models/) | Pydantic API şemaları |
| [supabase/migrations/](supabase/migrations/) | DB şeması + RLS politikaları |

---

## 5. Kritik Dosyalar (önce buraları oku)

**Backend:**
- [ML-python/main.py](ML-python/main.py) — FastAPI giriş, 5 endpoint
- [ML-python/models/schemas.py](ML-python/models/schemas.py) — Tüm API kontratları (DeviceInput, ChatRequest, …)
- [ML-python/ml/energy_model.py](ML-python/ml/energy_model.py) — GradientBoostingRegressor (200 estimator, max_depth=5)
- [ML-python/ml/clustering_model.py](ML-python/ml/clustering_model.py) — KMeans k=5 hane benzerliği
- [ML-python/ml/savings_scorer.py](ML-python/ml/savings_scorer.py) — Kural tabanlı tasarruf skoru
- [ML-python/services/chat_service.py](ML-python/services/chat_service.py) — Llama context builder + Ollama çağrısı
- [ML-python/services/tariff_service.py](ML-python/services/tariff_service.py) — Kademeli tarife hesaplayıcı
- [ML-python/data/device_profiles.py](ML-python/data/device_profiles.py) — 10 cihaz tipi referans verisi
- [ML-python/data/synthetic.py](ML-python/data/synthetic.py) — 5000 örnek physics-informed sentetik dataset

**Frontend:**
- [frontend/src/App.jsx](frontend/src/App.jsx) — Router + Auth guard
- [frontend/src/pages/Dashboard.jsx](frontend/src/pages/Dashboard.jsx) — Ana UI orkestratörü
- [frontend/src/store/useSceneStore.js](frontend/src/store/useSceneStore.js) — Zustand 3D sahne state
- [frontend/src/services/mlService.js](frontend/src/services/mlService.js) — Backend API çağrıları
- [frontend/src/services/houseService.js](frontend/src/services/houseService.js) — Supabase CRUD
- [frontend/src/components/Simulation3D/](frontend/src/components/Simulation3D/) — 3D sahne bileşenleri
- [frontend/src/components/Dashboard/](frontend/src/components/Dashboard/) — Dashboard panelleri (AiAssistant, TicketSystem, SuggestionCards, …)

**DB / Otomasyon:**
- [supabase/migrations/001_alter_schema.sql](supabase/migrations/001_alter_schema.sql) — Şema + RLS
- [supabase/migrations/002_tickets.sql](supabase/migrations/002_tickets.sql) — Destek bileti tablosu
- [ML-python/n8n-workflow.json](ML-python/n8n-workflow.json) — n8n otomasyon akışı

---

## 6. Veri Modeli (Supabase)

**Sahiplik zinciri:**
```
auth.users (Supabase Auth)
    └─ homes (user_id UNIQUE — kullanıcı başına 1 ev)
        └─ rooms (home_id, position_x, position_z)
            └─ devices (room_id, type, nominal_power_watts, …)
                ├─ device_calculations (n8n yazar)
                ├─ device_comparisons  (n8n yazar)
                └─ recommendations     (user_id + device_id)
```

**Public tablolar (auth gerektirmez):**
- `device_catalog` — ürün kataloğu (upgrade önerileri için)
- `electricity_tariffs` — Türkiye kademeli tarife verisi

**RLS (Row Level Security):**
Tüm kullanıcı verisi `auth.uid()` üzerinden zincirlenir. Kullanıcı sadece kendi `homes → rooms → devices → calculations` zincirini görür. Yeni kullanıcı tablosu eklerken **mutlaka aynı migration'da RLS politikası yaz**.

---

## 7. Cihaz Tipleri (sabit liste)

Backend ve frontend bu 10 tip üzerine kuruludur:

```
fridge, washing_machine, dishwasher, oven, ac,
tv, computer, lighting, water_heater, dryer
```

Yeni tip eklemek için **iki yer güncellenmeli:**
1. [ML-python/data/device_profiles.py](ML-python/data/device_profiles.py) — `DEVICE_PROFILES` dict'ine ekle (nominal_watts_range, duty_cycle, efficiency_classes)
2. Frontend katalog (Supabase'deki `device_catalog` tablosu üzerinden geliyor — yeni tip için seed gerekli)

> ⚠️ Tip isimleri **kısa İngilizce snake_case** (örn. `fridge`, `ac`) — `refrigerator` veya `air_conditioner` DEĞİL.

---

## 8. ML / Veri Akışı (özet)

1. Kullanıcı 3D sahneye cihaz ekler → frontend Supabase'e `devices` INSERT.
2. n8n trigger yakalar → sırayla:
   - `POST /calculate` → `device_calculations` tablosuna yazar
   - `POST /compare` → `device_comparisons` tablosuna yazar
   - `POST /savings` → `recommendations` tablosuna yazar
3. Frontend Supabase Realtime ile bu tabloları dinler ve Dashboard'da gösterir.
4. Kullanıcı `AiAssistant`'a yazınca → frontend `/chat`'e cihazlar + öneriler + toplam tüketim contextiyle birlikte mesajı yollar.
5. Backend [chat_service.py](ML-python/services/chat_service.py) içinde Türkçe system prompt oluşturur, Ollama'ya yollar, yanıtı döner.

---

## 9. Verim Sınıfı, Yaş ve Tarife Modeli

**Verim sınıfı israfı** ([device_profiles.py](ML-python/data/device_profiles.py) `EFFICIENCY_CLASS_MAP`):
```
A+++  =  0%   (referans)
A++   =  5%
A+    = 10%
A     = 15%
B     = 25%
C     = 35%
D     = 50%
E     = 60%
F     = 70%
G     = 80%
```

**Yaş degradasyonu:** Yıl başına `+1.5%` israf (`AGE_DEGRADATION_RATE`).

**Türkiye kademeli tarife (yaklaşık):**
- Alt kademe: ~1.50 ₺/kWh
- Üst kademe: ~2.30 ₺/kWh

Tarife verisi `electricity_tariffs` tablosundan gelir, [tariff_service.py](ML-python/services/tariff_service.py) ile hesaplanır. **Hard-code etme**, mutlaka servis üzerinden geç.

---

## 10. Kod Konvansiyonları (BUNLARA UY!)

| Konu | Kural |
|---|---|
| **UI dili** | Tüm kullanıcı görür stringler **Türkçe**. Hata mesajları, butonlar, mesajlar — hepsi TR. |
| **Kod yorumu** | Çoğunlukla İngilizce. Az yorum yaz; sadece "neden" gerekiyorsa. |
| **Naming** | Python `snake_case`, JavaScript `camelCase`, DB `snake_case`. |
| **Para birimi** | `₺` (UTF-8 lira sembolü). `TL` veya `TRY` **kullanma**. |
| **Birim** | `kWh` (büyük W, küçük h). |
| **Frontend dil** | TypeScript **YOK**. Sadece JSX. |
| **CSS** | Tailwind v4 syntax (`@import "tailwindcss"`). Inline style sadece dinamik değerler için. |
| **State** | Zustand ([useSceneStore.js](frontend/src/store/useSceneStore.js)) — Redux yok, Context sadece auth/theme/language için. |
| **3D** | React Three Fiber (R3F) + Drei. **Three.js doğrudan kullanma**. |
| **Backend validation** | Pydantic v2 syntax (`model_config = ConfigDict(...)`). |
| **FastAPI** | Dependency injection değil, modülden direkt import (bkz. [main.py](ML-python/main.py)). |
| **Test** | Şu an test suite yok. Yeni özellik eklerken test eklemek bonus. |

---

## 11. Çevre Değişkenleri

**Frontend** (`frontend/.env`):
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

**Backend** ([ML-python/.env.example](ML-python/.env.example)):
```
supabase_url=https://xxx.supabase.co
supabase_service_key=eyJ...        # service_role anahtarı
model_dir=./trained_models
retrain_on_startup=false
ollama_base_url=http://localhost:11434/v1
llama_model=llama3.2
```

---

## 12. Çalıştırma

```bash
# 1. Backend (FastAPI)
cd ML-python
pip install -r requirements.txt
uvicorn main:app --reload          # http://localhost:8000

# 2. Frontend (Vite)
cd frontend
npm install
npm run dev                         # http://localhost:5173

# 3. Lokal LLM (AiAssistant için zorunlu)
ollama serve
ollama pull llama3.2

# 4. Supabase migration'ları
# Supabase Dashboard → SQL Editor → migrations/*.sql sırayla çalıştır
```

---

## 13. Bilinen Eksikler / Boşluklar (AI'a uyarı)

- ❌ **Test suite yok** — ne backend pytest ne frontend vitest. Yeni özellik eklerken test eklemek değer katar.
- ❌ **Kök README minimal** — bu `prompt.md` onun yerine kullanılıyor.
- ❌ **TypeScript yok** — eklemek için tüm frontend migration gerekir, küçük talep değil.
- ❌ **CI/CD yok, Docker yok** — manual deploy.
- ⚠️ **ML modelleri sentetik veriyle eğitiliyor** — gerçek meter datasıyla retrain planlı ama henüz veri yok.
- ⚠️ **n8n workflow JSON elle import edilmeli** — otomatik provision yok.

---

## 14. AI Çalışma Kuralları

Yeni bir görev aldığında:

1. **Türkçe yanıtla.** Proje sahibi Türkçe konuşuyor.
2. **Yeni dosya açma dürtüsünden kaçın** — varolan dosyayı düzenle. Yeni soyutlamalar ekleme.
3. **3D sahnede değişiklik:** [useSceneStore.js](frontend/src/store/useSceneStore.js) state şemasını koru, kırma.
4. **Yeni endpoint:** Önce [schemas.py](ML-python/models/schemas.py)'ye Pydantic modelini ekle, sonra service yaz, en son [main.py](ML-python/main.py)'ye route bağla.
5. **Yeni Supabase tablosu:** RLS politikasını **aynı migration**'da yaz. Yoksa kullanıcı verileri sızar.
6. **Para/birim:** `₺` ve `kWh` dışında kullanma. Tarife hesabını [tariff_service.py](ML-python/services/tariff_service.py) üzerinden geç.
7. **AiAssistant'a yeni context alanı:** Hem [ChatRequest](ML-python/models/schemas.py) Pydantic şemasını hem [_build_system_prompt](ML-python/services/chat_service.py) Türkçe template'ini güncelle.
8. **Cihaz tipi:** Yeni tip eklerken hem [device_profiles.py](ML-python/data/device_profiles.py) hem `device_catalog` tablosu seed'i.
9. **Migration sırası:** `001_*` → `002_*` → … . Var olanı değiştirme, yeni numara ekle.
10. **Hard-code etme:** Tarife oranları, verim katsayıları, cihaz tipleri — hepsi referans dosyalarından gelmeli.

---

## 15. Hızlı Soru-Cevap

> **"Cihaz eklendiğinde ne oluyor?"**
> Frontend Supabase'e `devices` INSERT atar → n8n trigger yakalar → 3 endpoint sırayla çağrılır → 3 tabloya yazılır → frontend Realtime ile gösterir.

> **"AI cevabı neden bazen yanlış?"**
> Llama 3.2 lokal model — küçük (3B parametre civarı), hata yapabilir. System prompt'ta "yalnızca verilere dayanarak yanıtla" var ama 100% garanti değil.

> **"Yeni bir oda nasıl ekleniyor?"**
> [useSceneStore.js](frontend/src/store/useSceneStore.js) → `addRoom` action → [houseService.js](frontend/src/services/houseService.js) → Supabase `rooms` INSERT.

> **"ML modeli ne tahmin ediyor?"**
> `real_monthly_kwh` — bir cihazın aylık gerçek kWh tüketimi. Inputlar: nominal watt, günlük saat, standby watt, verim sınıfı, yaş, cihaz tipi.

---

*Bu doküman kullanıcının (proje sahibi) tarafından AI asistanlara verilmek üzere hazırlandı. Proje değiştikçe güncellenmeli.*
