import os
from flask import Flask, render_template, jsonify, request, session, redirect, url_for
from supabase import create_client, Client
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.secret_key = "techunited_plot_locator_secure_2026"

# Initialize Supabase
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Supabase credentials not found.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- CONFIGURATION ---
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "password123"
EMPLOYEE_USERNAME = "employee_123"
EMPLOYEE_PASSWORD = "employee"

CITIES_CONFIG = {
    "Khandwa": ["muffadal_park", "smart_city", "hi_link", "mahakali_puram"],
    "Mundi": ["mahaveer_nagar"],
    "Jawar": ["shree_ganpati_residency"]
}

# --- HELPERS ---
def clean_text(val):
    if val is None: return None
    val = str(val).strip()
    return None if val == "" or val.lower() == "nan" or val.lower() == "undefined" else val

def clean_float(val):
    if val is None: return None
    val_str = str(val).strip()
    if val_str == "" or val_str.lower() == "nan" or val_str.lower() == "undefined": return None
    try:
        return float(val_str)
    except ValueError:
        return None

def normalize_date(date_str):
    if not date_str or str(date_str).strip() == "":
        return None
    date_str = str(date_str).strip()
    # Try YYYY-MM-DD
    try:
        datetime.strptime(date_str, '%Y-%m-%d')
        return date_str
    except ValueError:
        pass
    # Try DD/MM/YYYY
    try:
        return datetime.strptime(date_str, '%d/%m/%Y').strftime('%Y-%m-%d')
    except ValueError:
        return None 

# --- ROUTES ---

@app.route('/')
def index():
    return render_template('index.html', 
                           cities=CITIES_CONFIG.keys(), 
                           is_admin=session.get('is_admin', False),
                           is_employee=session.get('is_employee', False))

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    if data.get('username') == ADMIN_USERNAME and data.get('password') == ADMIN_PASSWORD:
        session['is_admin'] = True
        return jsonify({"success": True})
    if data.get('username') == EMPLOYEE_USERNAME and data.get('password') == EMPLOYEE_PASSWORD:
        session['is_employee'] = True
        return jsonify({"success": True})
    return jsonify({"success": False})

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index'))

@app.route('/get_projects')
def get_projects():
    city = request.args.get('city')
    return jsonify(CITIES_CONFIG.get(city, []))

@app.route('/get_all_plots')
def get_all_plots():
    project = request.args.get('project')
    try:
        response = supabase.table(project).select("*").execute()
        return jsonify(response.data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/save_plot_details', methods=['POST'])
def save_plot_details():
    if not session.get('is_admin'):
        return jsonify({"error": "Unauthorized"}), 403

    data = request.json
    project = data.get('project')
    
    update_data = {
        "status": clean_text(data.get('status')),
        "owner": clean_text(data.get('owner')),
        "size": clean_float(data.get('size')),
        "customer_number": clean_text(data.get('customer_number')),
        "booking_date": normalize_date(data.get('booking_date')),
        "registry_date": normalize_date(data.get('registry_date')),
        "color": clean_text(data.get('color'))
    }
    
    try:
        supabase.table(project).update(update_data).eq("plot_id", str(data['plot_id']).strip()).execute()
        return jsonify({"success": True})
    except Exception as e:
        print(f"DEBUG ERROR: {e}") 
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)