# ⚡ NOVA SmartStock
### Intelligent Inventory Monitoring & Stock-Out Prediction Platform for Quick-Commerce
**PromptWars – Business Rescue Challenge Entry for NOVA CART**

---

## 📌 Executive Summary

**NOVA CART** is a fast-growing quick-commerce retail aggregator connecting customers with **620 local grocery stores, pharmacies, bakeries, and stationery shops across 3 Indian metropolitan cities** (Bengaluru, Mumbai, Hyderabad).

Despite strong scale (**1,20,000 registered users**, **46,000 MAU**, **38,500 monthly orders**, **₹26.1 Lakh monthly revenue**), NOVA CART is facing a severe retention and operational crisis:
* **Repeat purchase rate collapsed from 41% to 27%** (-14 percentage points).
* **Average delivery time climbed from 29 minutes to 37 minutes** (+8 minutes delay).
* **Order cancellation rate surged from 6% to 11%** (nearly doubling).
* **35% of all cancellations happen because the product is unavailable** on the merchant shelf.
* **29% of surveyed customers** reported that products shown as "Available" in the app turned out to be out of stock after placing their order.

**NOVA SmartStock** is a purpose-built, intelligent inventory monitoring and risk prediction dashboard designed to solve this crisis at its root: **stopping ghost inventory before orders are placed, cutting cancellations, and rebuilding customer trust.**

---

## 🩺 The Underlying Problem & Failure Cascade

Conventional diagnosis often misattributes quick-commerce delays to rider shortages or app bugs. However, the data reveals that the crisis originates inside partner retail stores:

1. **High Store Friction:** **39% of partner stores** state that maintaining online inventory requires too much effort.
2. **Infrequent Updates:** Stores audit or update stock only once every **1–3 days**.
3. **Ghost Inventory:** In fast-turn items (milk, bread, eggs), shelves deplete during physical walk-in hours while remaining listed as "In Stock" on NOVA CART.
4. **The Failure Chain:**
   ```
   Inaccurate Store Inventory
          ↓
   Product Listed as Available on Customer App
          ↓
   Customer Places 15-Minute Order
          ↓
   Store Discovers Empty Shelf (Stock-out)
          ↓
   Order Cancelled / Item Substitution Attempted (+8 min delay)
          ↓
   Rider Compensation & Payment Gateway Refund Overhead
          ↓
   Customer Frustration & Trust Erosion
          ↓
   Repeat Purchase Rate Collapses (41% → 27%)
   ```

**Intervention:** NOVA SmartStock intercepts this failure chain at **Step 1** by predicting depletion velocity and prompting store managers with a high-priority 3-item daily verification queue with 1-click updates.

---

## 🚀 Key Features

| Feature | Description |
| :--- | :--- |
| **1. Executive Dashboard** | Real-time KPIs (Total catalog, Available, Low-stock, High-risk, Out-of-stock, Accuracy %, Orders at risk, Cancellations prevented) with interactive trend charts. |
| **2. Inventory Management** | Comprehensive 52-product catalog across 10 categories with search, category filtering, risk-level filtering, availability toggles, and inline quick-stock actions. |
| **3. Inventory Risk Engine** | Fully transparent, weighted scoring engine ($0–100$) combining Stock Buffer Risk, Sales Velocity, Audit Staleness, and Stock-out History. |
| **4. Quick Stock Update** | Modal with real-time before-and-after score recalculation simulation, updating dashboard metrics and store accuracy live. |
| **5. Today's Priority Actions** | Algorithmic 3-item focus queue displaying urgent items with plain-language diagnostic reasons and 1-click restock buttons. |
| **6. Operations Alert Feed** | Real-time operational exception stream flagging immediate stock-outs, stale inventory (&gt;24h), and rush-hour store order rejection spikes. |
| **7. Business Impact Simulator** | Interactive ROI calculator with parameter sliders (Cancellation target, Store adoption %, AOV, Monthly orders) estimating prevented cancellations and annual GMV saved. |
| **8. Product Search & Filters** | Instant text search across name/SKU/category with multi-dimensional filtering by risk level, stock count, and availability. |
| **9. Store Profile & Multi-Store Switcher** | Store performance scorecards across 10 partner stores in Bengaluru, Mumbai, and Hyderabad with individual sync states. |
| **10. Operations HQ Multi-Store View** | Central operations supervisory dashboard for NOVA CART city managers tracking network-wide risk rankings and store compliance. |

---

## 🧮 Inventory Risk Engine Specification

NOVA SmartStock implements a **transparent, deterministic, weighted scoring algorithm** rather than an opaque black box:

$$\text{Risk Score (0–100)} = (0.40 \times \text{Stock Risk}) + (0.30 \times \text{Sales Velocity}) + (0.20 \times \text{Audit Staleness}) + (0.10 \times \text{Stock-out History})$$

### Factor Breakdown:
1. **Stock Buffer Risk (40% Weight):**
   * Computes Days of Inventory Remaining: $\text{DIR} = \frac{\text{Current Stock}}{\max(0.5, \text{Avg Daily Sales})}$.
   * $\text{DIR} \le 0.4\text{ days}$ (&lt;10 hours): Score = $95/100$.
   * $\text{DIR} \le 0.75\text{ days}$ (&lt;18 hours): Score = $80/100$.
   * $\text{DIR} \ge 3.0\text{ days}$: Score = $5/100$.
   * Physically $0\text{ stock}$: Score = $100/100$ (Out of Stock).
2. **Sales Velocity Risk (30% Weight):**
   * High-velocity items ($\ge 15\text{ units/day}$) deplete abruptly during peak evening rushes (7–9 PM).
3. **Audit Staleness Risk (20% Weight):**
   * Hours since physical verification. $\ge 48\text{ hours}$ (2 days) triggers high penalty ($90/100$) due to phantom shelf loss.
4. **Historical Stock-out Frequency (10% Weight):**
   * Location-specific vulnerability score based on past store stock-outs.

### Risk Classifications:
* **0–30: LOW RISK** (Green) — Optimal stock buffer; normal daily replenishment.
* **31–60: MEDIUM RISK** (Yellow) — Adequate for ~1.5–2 days; monitor before evening rush.
* **61–80: HIGH RISK** (Amber) — Buffer below 24 hours; verify shelf inventory.
* **81–100: CRITICAL RISK** (Rose) — Buffer under 12 hours or unverified for &gt;2 days; urgent restock required.

---

## 🎬 10-Step Guided Demo Walkthrough (Milk 1L Scenario)

The application features a built-in **"🎬 Run Guided Demo"** walkthrough that tests the end-to-end data flow required by the challenge:

```
INPUT → PROCESSING/LOGIC → ACTION → OUTPUT → BUSINESS VALUE
```

1. **Step 1 — Open Dashboard:** Displays store overview for *Apex Fresh Mart (Koramangala, Bengaluru)*.
2. **Step 2 — Highlight Inventory Problems:** Dashboard highlights 8 products at high/critical risk and network cancellation rate at 11%.
3. **Step 3 — Open Risk Monitor:** Inspects the multi-factor risk algorithm and weight distribution.
4. **Step 4 — Select Critical Product:** Selects sample product **"Amul Taaza Milk 1L"** (Current stock: 4, Avg daily sales: 12, Unverified: 2 days, Past stockouts: High).
5. **Step 5 — Explain Risk Reason:** Engine diagnostics clearly explain: *"Critical Risk — Current stock (4 units) covers only 8h against daily velocity (12 units/day). Unverified for 2 days with high past stock-out frequency."* (Score: 88/100).
6. **Step 6 — Quick Stock Update:** Manager enters **30 units** into the quick stock update modal. Modal displays a live preview showing risk dropping to 28 (LOW RISK).
7. **Step 7 — Save & Recalculate:** Submits update. System recalculates score immediately.
8. **Step 8 — Instant Notifications:** Toasts appear: *"Inventory updated successfully."* followed by *"Stock-out risk reduced."* with celebratory confetti.
9. **Step 9 — Dashboard Reflects Change:** Dashboard immediately updates: High-risk count drops, inventory accuracy rises, and item moves to "Resolved Today".
10. **Step 10 — Business Impact Displayed:** View switches to the Business Impact page showing GMV protected and cancellations prevented.

---

## 📈 Modelled Business Impact Simulation

Grounded on NOVA CART case benchmarks:
* **Monthly Orders:** 38,500
* **Average Order Value (AOV):** ₹486
* **Baseline Cancellation Rate:** 11% (4,235 cancelled orders/month)
* **Stock-out Share:** 35% of cancellations caused by out-of-stock items (1,482 orders/month)

### Target Scenario (Reducing Cancellations from 11% to 8% at 75% Store Adoption):
* **Monthly Cancellations Prevented:** **~866 orders / month** (~10,392 / year).
* **Monthly GMV Protected:** **₹4.21 Lakh / month** (**₹50.5 Lakh / year**).
* **Customer Support & Refund Overhead Saved:** **₹98,700 / month** (**₹11.8 Lakh / year**).
* **Total Annual Economic Value Created:** **₹62.3 Lakh / year**.
* **Projected Repeat Purchase Recovery:** Restoration from **27% baseline towards 31.5%–35%**.

*(Note: Clearly marked in the application as MODELLED/PROTOTYPE estimates for strategic evaluation.)*

---

## 🛠️ Technology Stack & Architecture

* **Frontend:** React 18, Tailwind CSS, Lucide Icons, Canvas Confetti.
* **Architecture:** Modular reactive Single Page Application with persistent `localStorage` synchronization and reset-to-seed capabilities.
* **Engines:**
  * `js/engine/riskEngine.js` — Pure mathematical risk evaluation engine.
  * `js/engine/impactEngine.js` — Parametric business ROI simulation engine.
* **Data Layer:**
  * `js/data/products.js` — 52 realistic quick-commerce SKUs spanning 10 retail categories.
  * `js/data/stores.js` — 10 partner stores across Bengaluru, Mumbai, and Hyderabad.
* **Backend Integration:** Lightweight PHP REST endpoint (`api.php`) running locally on Apache / XAMPP (PHP 8.2) supporting status checks and stock updates with zero paid API dependencies.
* **Zero-Build Offline Resilience:** All vendor scripts (`react`, `react-dom`, `tailwind`, `confetti`) are bundled locally inside `vendor/` for instant execution without npm build steps.

---

## 💻 Local Setup & Execution Instructions

### Running via XAMPP (Apache):
1. The project is pre-installed in your XAMPP web root at:
   `c:\xampp\htdocs\Nova Cart`
2. Start the Apache module in the **XAMPP Control Panel**.
3. Open any modern web browser and navigate to:
   ```
   http://localhost/Nova%20Cart/
   ```

### Running via PHP Built-in Server (Alternative):
If XAMPP Apache is not running, run in terminal:
```powershell
cd "c:\xampp\htdocs\Nova Cart"
php -S localhost:8000
```
Then visit `http://localhost:8000`.

### Running Standalone (Direct File Execution):
Simply double-click `index.html` in your file explorer! Because all vendor assets are pre-bundled in `vendor/` and the application is pre-compiled in `js/app.js`, it runs with 100% functionality right from the local disk!

---

## 📁 Project Structure

```
c:\xampp\htdocs\Nova Cart/
├── index.html               # Main SPA entrypoint
├── api.php                  # Lightweight PHP REST API endpoint
├── README.md                # Complete documentation & case brief
├── css/
│   └── custom.css           # Glassmorphism, animations, & design tokens
├── js/
│   ├── app.jsx              # Core React application source code
│   ├── app.js               # Pre-compiled instant-load production bundle
│   ├── data/
│   │   ├── products.js      # 52 realistic products across 10 categories
│   │   └── stores.js        # 10 partner stores across 3 Indian cities
│   └── engine/
│       ├── riskEngine.js    # Transparent 4-factor risk calculation engine
│       └── impactEngine.js  # Business ROI simulation engine
└── vendor/
    ├── react.production.min.js
    ├── react-dom.production.min.js
    ├── tailwind.js
    ├── confetti.browser.min.js
    └── babel.min.js
```

---

## 🔮 Future Roadmap

1. **Hardware Barcode & RFID Integration:** Handheld Bluetooth barcode scanners for 30-second daily shelf inventory audits.
2. **ERP/POS Connectors:** Direct bidirectional webhook sync with local Indian retail software (TallyPrime, Marg ERP, Vyapar).
3. **Demand Spike AI Forecasting:** Incorporating local weather patterns (e.g., sudden monsoon rain driving tea & pakora demand) and festival calendars.
4. **WhatsApp Automated Supplier Orders:** Automatic supplier restock order dispatch via WhatsApp Business API when a product reaches High Risk.

---
*Created for PROMPTWARS – BUSINESS RESCUE CHALLENGE (Fictional Case Study: NOVA CART).*
