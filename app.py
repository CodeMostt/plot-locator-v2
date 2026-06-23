import os
from flask import Flask, render_template, jsonify, request, session, redirect, url_for
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables from .env file for local development
load_dotenv()

app = Flask(__name__)
# Replace with your actual secure secret key
app.secret_key = "techunited_plot_locator_secure_2026"

# Initialize Supabase client
# Ensure SUPABASE_URL and SUPABASE_KEY are set in your local .env 
# AND in your Vercel Environment Variables
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Supabase credentials not found. Check your .env file or Vercel Environment Variables.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- CONFIGURATION ---
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "password123"
EMPLOYEE_USERNAME = "employee_123"
EMPLOYEE_PASSWORD = "employee"

CITIES_CONFIG = {
    "Khandwa": ["muffadal_park", "smart_city", "hi_link"],
    "Mundi": ["mahaveer_nagar"],
    "Jawar": ["shree_ganpati_residency"]
}

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
        # Fetching all plots from the table corresponding to the project name
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
    
    try:
        # Update row in the specific Supabase table
        response = supabase.table(project) \
            .update({
                "status": data.get('status'),
                "owner": data.get('owner'),
                "size": data.get('size'),
                "customer_number": data.get('customer_number'),
                "booking_date": data.get('booking_date'),
                "registry_date": data.get('registry_date'),
                "color": data.get('color')
            }) \
            .eq("plot_id", str(data['plot_id']).strip()) \
            .execute()
            
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)