# 🗺️ Techunited — Interactive Colony Plot Locator 2.0

An interactive, responsive web application for exploring real-estate colony master plans, tracking plot availability in real time, inspecting plot metadata, and managing booking/registry statuses.

---

## ✨ Features

- **Interactive Colony Blueprints**: High-resolution vector polygon overlays mapped directly onto master blueprint plans.
- **Real-Time Status Tracking**:
  - 🟢 **Registry Done** (Green)
  - 🟡 **Booked** (Yellow)
  - 🔴 **Vacant** (Red)
  - 📐 **Landowner Plots** (Angled cross-hatch pattern)
- **Smooth Navigation & Controls**:
  - Touch-friendly pinch-to-zoom and drag-to-pan for mobile phones and tablets.
  - Mouse wheel zoom and click-to-drag for desktop.
  - Floating zoom controls with one-click view reset and full-screen toggling.
- **Plot Search & Status Filtering**:
  - Jump directly to any plot ID with search highlighting and toast feedback.
  - Filter plots on the map by status (*All*, *Vacant*, *Booked*, *Registry Done*).
- **Role-Based Access Control**:
  - **Public / Client Mode**: View availability, inspect plot dimensions, and view community park/garden blueprints.
  - **Employee Mode**: Access customer contact information, booking dates, and registry records.
  - **Admin Mode**: Full permissions to edit and update plot statuses, customer details, and pricing in real time.
- **Colonies Covered**:
  - **Khandwa**: Muffadal Park, Smart City, Hi Link City, Mahakali Puram, Keshav Nagar, Shri Ram Setu Puram.
  - **Mundi**: Mahaveer Nagar.
  - **Jawar**: Shree Ganpati Residency.
- **Office Location & Navigation**:
  - Embedded Google Maps with one-click directions to Tech United Khandwa office.

---

## 🛠️ Tech Stack

- **Backend**: Python 3.9+, [Flask](https://flask.palletsprojects.com/)
- **Database & Storage**: [Supabase](https://supabase.com/) (PostgreSQL & Storage CDN for high-resolution colony blueprints)
- **Frontend**: Modular HTML5, CSS3, JavaScript (Vanilla ES6+)
- **Icons & Typography**: FontAwesome 6, Google Fonts (*Outfit*, *Plus Jakarta Sans*)
- **Deployment**: [Vercel](https://vercel.com/) (Serverless Python runtime)

---

## 📁 Project Structure

```text
Plot_Locater/
├── app.py                  # Flask server and Supabase API routes
├── requirements.txt        # Python package dependencies
├── vercel.json             # Vercel deployment configuration
├── .env.example            # Environment variables template
├── .gitignore              # Files and folders excluded from Git tracking
├── templates/
│   └── index.html          # Semantic HTML markup and layout
├── static/
│   ├── css/
│   │   └── style.css       # Design system, layout, and responsive styles
│   ├── js/
│   │   └── app.js          # Interactive map logic, SVG rendering, pan/zoom
│   └── favicon.png         # Website favicon
└── README.md
```

---

## 🚀 Getting Started Locally

### 1. Prerequisites
- Python 3.9 or higher
- Git

### 2. Clone the Repository
```bash
git clone https://github.com/CodeMostt/plot-locator-v2.git
cd plot-locator-v2
```

### 3. Set Up Virtual Environment
```bash
python3 -m venv .venv
source .venv/bin/activate   # On Windows: .venv\Scripts\activate
```

### 4. Install Dependencies
```bash
pip install -r requirements.txt
```

### 5. Configure Environment Variables
Copy `.env.example` to a new file named `.env`:
```bash
cp .env.example .env
```

Fill in your configuration values inside `.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_secret_or_service_key
SECRET_KEY=your_random_secret_key_here

ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_admin_password
EMPLOYEE_USERNAME=employee_123
EMPLOYEE_PASSWORD=your_employee_password
```

### 6. Run the Application
```bash
python app.py
```
Open [http://localhost:5000](http://localhost:5000) in your browser.

---

## ☁️ Deployment (Vercel)

1. Push your repository to GitHub.
2. Import the project into your [Vercel Dashboard](https://vercel.com).
3. In **Project Settings** &rarr; **Environment Variables**, add:
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `SECRET_KEY`
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
   - `EMPLOYEE_USERNAME`
   - `EMPLOYEE_PASSWORD`
4. Click **Deploy**. Vercel will build and host the application automatically via `vercel.json`.

---

## 🔒 Security Best Practices

- Real credentials, API keys, and database tokens are kept in `.env` and are strictly excluded from version control via `.gitignore`.
- Always set strong credentials in your hosting platform's Environment Variables.

---

## 📄 License

Proprietary © 2026 **Tech United Real Estate Management**. All rights reserved.
