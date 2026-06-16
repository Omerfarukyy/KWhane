# KWhane — Şema / Diyagram Kodları (İngilizce)

Bu dosyadaki kodları ilgili sitelere yapıştırarak görselleri oluşturabilirsin (diyagramların içeriği İngilizce):

- **Mermaid diyagramları** (Architecture, ER, System Flow) → https://mermaid.live
- **Chart.js grafikleri** (Feature Importance, Silhouette Score, Peer Ranking Gauge) → https://quickchart.io/sandbox (kodu yapıştır, anında render eder)

---

## 1. Architecture Diagram

> mermaid.live içine yapıştır

```mermaid
flowchart TB
    subgraph Client["Client (Browser)"]
        UI["React 19 + Vite 7\nFrontend (Netlify)"]
        R3F["React Three Fiber\n3D Home Simulation"]
        Zustand["Zustand Store\n(useSceneStore)"]
        UI --- R3F
        UI --- Zustand
    end

    subgraph Backend["Python Backend (Render.com)"]
        FastAPI["FastAPI Server"]
        EnergyModel["EnergyPredictor\nGradientBoostingRegressor"]
        ClusterModel["HouseholdClusterer\nK-Means (k=5)"]
        Tariff["TariffCalculator"]
        FastAPI --- EnergyModel
        FastAPI --- ClusterModel
        FastAPI --- Tariff
    end

    subgraph Cloud["Cloud Services"]
        Supabase[("Supabase\nPostgreSQL + Auth + RLS")]
        Groq["Groq API\nLlama 3.3 70B Versatile"]
    end

    UI -- "Auth, CRUD\n(homes, rooms, devices)" --> Supabase
    UI -- "POST /calculate\nPOST /compare\nPOST /savings" --> FastAPI
    UI -- "POST /chat\nPOST /home-builder" --> FastAPI
    FastAPI -- "Tariff data" --> Supabase
    FastAPI -- "LLM completion" --> Groq
    FastAPI -- "Results (kWh, cost,\nrecommendations, comparison)" --> UI
    UI -- "Persist results\n(device_calculations,\ndevice_comparisons,\nrecommendations)" --> Supabase

    style Client fill:#0ea5e9,color:#fff,stroke:#0369a1
    style Backend fill:#10b981,color:#fff,stroke:#047857
    style Cloud fill:#f59e0b,color:#fff,stroke:#b45309
```

---

## 2. ER Diagram

> mermaid.live içine yapıştır

```mermaid
erDiagram
    USERS ||--o{ HOMES : "owns"
    USERS ||--o{ TICKETS : "creates"
    USERS ||--o{ RECOMMENDATIONS : "receives"
    USERS ||--o{ ELECTRICITY_BILLS : "submits"
    USERS ||--o{ GOALS : "sets"

    HOMES ||--o{ ROOMS : "contains"
    ROOMS ||--o{ DEVICES : "contains"
    DEVICES ||--o{ DEVICE_CALCULATIONS : "calculated_for"
    DEVICES ||--o{ DEVICE_COMPARISONS : "compared_for"
    DEVICES ||--o{ RECOMMENDATIONS : "generated_for"
    DEVICE_CATALOG ||..o{ DEVICES : "template_for"
    ELECTRICITY_TARIFFS ||..o{ DEVICE_CALCULATIONS : "prices"

    USERS {
        uuid id PK
        string email
    }

    HOMES {
        uuid id PK
        uuid user_id FK
        string name
        string city
        int occupants_count
        float total_area_sqm
    }

    ROOMS {
        uuid id PK
        uuid home_id FK
        string name
        string type
        jsonb dimensions
        float position_x
        float position_z
    }

    DEVICES {
        uuid id PK
        uuid room_id FK
        string name
        string type
        jsonb spatial_config
        int nominal_power_watts
        float daily_usage_hours
        int standby_power_watts
        string efficiency_class
        int year_of_purchase
        float daily_usage_hours_original
        timestamptz usage_hours_calibrated_at
    }

    DEVICE_CATALOG {
        uuid id PK
        string type
        string name
        int nominal_power_watts
        float daily_usage_hours
        int standby_power_watts
        string efficiency_class
        int year_of_purchase
    }

    DEVICE_CALCULATIONS {
        bigint id PK
        uuid device_id FK
        float theoretical_monthly_kwh
        float real_monthly_kwh
        float standby_monthly_kwh
        float total_monthly_kwh
        float total_monthly_cost
        float efficiency_score
        jsonb tariff_breakdown
        timestamptz created_at
    }

    DEVICE_COMPARISONS {
        bigint id PK
        uuid device_id FK
        int cluster_id
        int cluster_size
        float user_monthly_kwh
        float cluster_avg_monthly_kwh
        int percentile
        string comparison_label
        timestamptz created_at
    }

    RECOMMENDATIONS {
        bigint id PK
        uuid user_id FK
        uuid device_id FK
        string slug
        string category
        string title
        string description
        numeric current_monthly_cost
        numeric projected_monthly_cost
        numeric potential_savings_amount
        string status
        timestamptz created_at
    }

    ELECTRICITY_BILLS {
        bigint id PK
        uuid user_id FK
        date period_start
        date period_end
        float total_kwh
        float total_cost_tl
        string provider
        string tariff_type
        string source
        jsonb raw_payload
    }

    GOALS {
        bigint id PK
        uuid user_id FK
        float target_kwh
        date period_start
        date period_end
    }

    TICKETS {
        uuid id PK
        uuid user_id FK
        string subject
        string category
        string message
        string status
    }

    ELECTRICITY_TARIFFS {
        int id PK
        string tier_name
        float kwh_min
        float kwh_max
        float unit_price
        float tax_rate
    }
```

---

## 3. Feature Importance Bar Chart

> Veri kaynağı: `ML-python/trained_models/energy_regressor_metadata.json`
> (GradientBoostingRegressor — `feature_importances_`)

### Chart.js (quickchart.io/sandbox)

```json
{
  "type": "bar",
  "data": {
    "labels": [
      "device_type",
      "nominal_power_watts",
      "daily_usage_hours",
      "efficiency_class",
      "device_age_years",
      "standby_power_watts"
    ],
    "datasets": [
      {
        "label": "Feature Importance",
        "data": [0.5669, 0.2211, 0.1555, 0.0458, 0.0103, 0.0004],
        "backgroundColor": [
          "#10b981",
          "#3b82f6",
          "#6366f1",
          "#f59e0b",
          "#ef4444",
          "#94a3b8"
        ]
      }
    ]
  },
  "options": {
    "indexAxis": "y",
    "plugins": {
      "title": {
        "display": true,
        "text": "GradientBoostingRegressor — Feature Importance (energy_regressor_v1)"
      },
      "legend": { "display": false }
    },
    "scales": {
      "x": {
        "title": { "display": true, "text": "Importance Score" },
        "max": 0.6
      }
    }
  }
}
```

**Not:** quickchart.io/sandbox sayfasına bu JSON'u yapıştır → anında PNG/SVG çıktısı alırsın. İndirme linki için aynı JSON'u şu URL'ye query param olarak da gönderebilirsin: `https://quickchart.io/chart?c=<json>`

---

## 4. Silhouette Score Chart

> Kaynak: `ML-python/ml/clustering_model.py` — `HouseholdClusterer.train()`
> K-Means, k=5 cluster, `silhouette_score()` ile hesaplanıyor.
> Farklı k değerleri için elbow/silhouette eğrisi istiyorsan aşağıdaki yapıyı kullan (gerçek değerleri `train()` çıktısından alıp güncelle).

### Chart.js — Silhouette Score vs. k

```json
{
  "type": "line",
  "data": {
    "labels": ["k=2", "k=3", "k=4", "k=5", "k=6", "k=7", "k=8"],
    "datasets": [
      {
        "label": "Silhouette Score",
        "data": [0.42, 0.48, 0.51, 0.55, 0.50, 0.46, 0.43],
        "borderColor": "#10b981",
        "backgroundColor": "rgba(16,185,129,0.15)",
        "fill": true,
        "tension": 0.3,
        "pointRadius": 6,
        "pointBackgroundColor": "#10b981"
      }
    ]
  },
  "options": {
    "plugins": {
      "title": {
        "display": true,
        "text": "K-Means Silhouette Score by Cluster Count (Selected: k=5)"
      }
    },
    "scales": {
      "y": {
        "title": { "display": true, "text": "Silhouette Score" },
        "min": 0,
        "max": 1
      },
      "x": {
        "title": { "display": true, "text": "Number of Clusters (k)" }
      }
    }
  }
}
```

> **Önemli:** Bu grafikteki sayılar örnek/placeholder. Gerçek silhouette skorunu almak için backend'de şu komutu çalıştır:
> ```
> python -c "from ml.clustering_model import HouseholdClusterer; c = HouseholdClusterer('trained_models'); print(c.train())"
> ```
> Çıktıdaki `silhouette_score` değerini k=5 noktasına yaz, diğer k değerleri için `n_clusters` parametresini değiştirip tekrar çalıştır.

---

## 5. System Flow (Add Device → Analysis Flow)

> mermaid.live içine yapıştır

```mermaid
sequenceDiagram
    actor U as User
    participant UI as Frontend (React)
    participant Store as Zustand Store
    participant SB as Supabase
    participant API as FastAPI (ML Backend)
    participant EM as EnergyPredictor
    participant CM as HouseholdClusterer
    participant LLM as Groq (Llama 3.3 70B)

    U->>UI: Select device (e.g. AC)
    UI->>Store: addDevice(spec)
    Store->>SB: INSERT devices
    Store-->>UI: returns deviceId

    par Parallel ML calls
        UI->>API: POST /calculate
        API->>EM: predict(features)
        EM-->>API: total_monthly_kwh
        API-->>UI: CalculateResponse
    and
        UI->>API: POST /compare
        API->>CM: predict_cluster(profile)
        CM-->>API: cluster_id, percentile
        API-->>UI: CompareResponse
    and
        UI->>API: POST /savings
        API->>EM: compute alternative scenarios
        API-->>UI: SavingsResponse (recommendations)
    end

    UI->>SB: INSERT device_calculations
    UI->>SB: INSERT device_comparisons
    UI->>SB: INSERT recommendations

    UI-->>U: 3D scene shows energy badge +\nranking + recommendations

    opt User asks the AI assistant
        U->>UI: Sends a question
        UI->>API: POST /chat
        API->>LLM: prompt + context (devices, recommendations)
        LLM-->>API: response
        API-->>UI: ChatResponse
        UI-->>U: Response displayed
    end
```

---

## 6. Peer Ranking Gauge

> Kullanıcının `/compare` veya `/compare/home` sonucundaki `percentile` değerini gösteren gauge.
> Chart.js'de native gauge yok, bu yüzden `doughnut` (yarım halka) ile simüle ediyoruz.

### Chart.js — Half-Doughnut Gauge (örnek: percentile = 35, yani kullanıcı eşdeğer evlerin %35'inden daha az tüketiyor → iyi)

```json
{
  "type": "doughnut",
  "data": {
    "labels": ["Your Consumption (Percentile)", "Remaining"],
    "datasets": [
      {
        "data": [35, 65],
        "backgroundColor": ["#10b981", "#1e293b"],
        "borderWidth": 0,
        "circumference": 180,
        "rotation": 270
      }
    ]
  },
  "options": {
    "plugins": {
      "title": {
        "display": true,
        "text": "Your Ranking vs. Similar Homes: 35th Percentile (Low Consumption — Good!)"
      },
      "legend": { "display": false },
      "tooltip": { "enabled": false }
    },
    "cutout": "75%"
  }
}
```

**Renk eşiği önerisi (HomeRanking.jsx mantığına paralel):**
- `percentile <= 33` → yeşil `#10b981` ("Low consumption — good")
- `34 <= percentile <= 66` → sarı `#f59e0b` ("Average")
- `percentile >= 67` → kırmızı `#ef4444` ("High consumption — attention needed")

İstersen `data.datasets[0].backgroundColor[0]` değerini gerçek `percentile` ve renk eşiğine göre dinamik doldurabilirsin.

---

## Kullanım İpuçları

1. **mermaid.live**: Sol panele kodu yapıştır → sağda canlı önizleme. "Actions" menüsünden PNG/SVG/PDF indirebilirsin.
2. **quickchart.io/sandbox**: JSON config'i yapıştır → "Update Chart" → sağ üstten indir.
3. Sunum dosyana (PowerPoint/Canva) bu görselleri PNG olarak aktarabilirsin.
4. ER diyagramındaki tablo/kolon isimleri `supabase/migrations/*.sql` dosyalarından alınmıştır — gerçek DB ile birebir eşleşir.
5. Feature importance değerleri `ML-python/trained_models/energy_regressor_metadata.json` dosyasından alınmıştır (model versiyonu: `energy_regressor_2026-06-06T12:52:12Z`, R²=0.989, MAE=7.23 kWh).
