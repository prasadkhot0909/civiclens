# CivicSense AI: 2-Portal Citizen Grievance & Department Triage System

An autonomous civic intelligence platform featuring a **Two-Portal Authentication Architecture**:
1. **Citizen Portal**: Citizens submit complaints with defect photographs, track SLA countdown timers, and review photo-verified remediations.
2. **Department Representative Portal**: Gated municipal command console where authorized officials inspect AI-triaged issues, decrypt citizen evidence, and submit Before vs After photo proofs for automated AI resolution verification.

---

## 🏛️ Two-Portal Architecture & Access Control

```
                             [ CivicSense AI ]
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           ▼                                                   ▼
┌─────────────────────────────┐             ┌─────────────────────────────────────┐
│    👤 CITIZEN PORTAL        │             │    🏛️ DEPARTMENT OFFICIAL PORTAL     │
├─────────────────────────────┤             ├─────────────────────────────────────┤
│ • File civic grievances     │             │ • Access Department Console (GATED) │
│ • Upload defect photos      │             │ • Filter by Department Queue        │
│ • Instant AI triage & SLA   │             │ • Decrypt citizen evidence with RSA │
│ • "My Grievances" Dashboard │             │ • Dispatch response squads          │
│ • View Before vs After Fix  │             │ • Mandatory Photo Proof of Repair   │
│ ❌ No Dept Console Access   │             │ • AI Before/After Visual Verifier   │
└─────────────────────────────┘             └─────────────────────────────────────┘
```

---

## 🔑 Pre-Configured Demo Accounts for Testing

The platform comes with ready-to-test accounts for both portals (accessible via one-click buttons or login forms):

### 1. Citizen Portal Accounts
| Account | Email | Password | Role |
|---|---|---|---|
| **Aarav Mehta** | `citizen@civic.gov` | `citizen123` | Citizen |
| **Priya Sharma** | `priya.sharma@civic.gov` | `citizen123` | Citizen |

*Citizens can also register a brand new account with their name, email, phone, and password.*

### 2. Department Representative Accounts (Console Access)
| Department | Officer / Supervisor | Email | Password | Jurisdiction |
|---|---|---|---|---|
| **Road Administration** | Er. R. Sharma | `roads@city.gov` | `roads123` | Highways, potholes, asphalt pavements |
| **Municipal Solid Waste** | Dr. A. Verma | `sanitation@city.gov` | `waste123` | Garbage dumps, street sanitization |
| **Water Supply & Sewerage** | Er. K. Nair | `water@city.gov` | `water123` | Pipeline bursts, water leaks, drainage |
| **Electricity & Power** | Inspector M. Patel | `power@city.gov` | `power123` | Live wires, transformers, streetlights |
| **City Commissioner** | Commissioner V. Rao | `admin@city.gov` | `admin123` | Super Admin (All Departments) |

---

## 🔒 Security & Role Enforcement

* **Backend Middleware Enforcement**:
  * Endpoints under `/api/department/*` (`/tickets`, `/decrypt-key`, `/update-status`, `/verify-resolution`) require bearer token authentication and verify that `req.user.role === 'DEPARTMENT'`.
  * If a citizen or unauthenticated guest attempts to access `/api/department/tickets`, the API rejects the request with **HTTP 403 Forbidden** or **HTTP 401 Unauthorized**.
* **Frontend Navigation Gating**:
  * When logged in as a **Citizen**, the **Department Console** tab is **completely hidden and inaccessible**.
  * When logged in as a **Department Representative**, the navigation opens directly to the **Department Console** with queue filters and resolution verification tools.
* **E2EE Architecture Feature Removal**:
  * As requested, the dedicated E2EE Architecture tab and explainer section have been completely removed from the website UI.

---

## 📸 AI Resolution Verification (Before vs After)

Department representatives cannot simply type text notes to mark a problem as solved:
1. Field officers must upload a photograph of the resolved area.
2. The AI Vision Inspector compares the **Before Photo (Original Defect)** vs **After Photo (Field Crew Proof)**.
3. The AI verifies:
   * **Spatial & Location Match**: Confirms background road geometry, curbs, or structures align with the complaint site.
   * **Defect Remediation Quality**: Confirms the pothole is leveled and compacted, garbage cleared, pipeline leak stopped, or electrical line restored.
   * **Fraud / Persistence Detection**: Automatically rejects identical or unrepaired photos.
4. Once verified, the complaint is officially marked `RESOLVED`, and an **Official Certificate of Resolution** with Before vs After photos is published to the citizen.

---

## 🚀 Running the Application

### 1. Install Dependencies (first time only)
```bash
npm install
```

### 2. Reset or Seed Sample Data (Optional)
To populate sample grievances across Road, Waste, Water, and Power departments:
```bash
npm run seed
```

### 3. Start the Web Server
```bash
npm start
```
The server will run at:
**`http://localhost:3000`**

### 4. Share Publicly Online (Cloudflare Tunnel)
In a second terminal window:
```bash
npm run tunnel
```
or run directly:
```bash
.\cloudflared.exe tunnel --url http://localhost:3000
```
This generates a live public HTTPS link (e.g. `https://xxxx.trycloudflare.com`) that you can share with anyone on mobile or desktop anywhere.
