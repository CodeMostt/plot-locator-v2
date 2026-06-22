from flask import Flask, render_template, jsonify, request, session, redirect, url_for
import csv
import os
import shutil
from datetime import datetime

app = Flask(__name__)
app.secret_key = "techunited_plot_locator_secure_2026"

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

# CRITICAL: Use absolute paths for PythonAnywhere
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
BACKUP_DIR = os.path.join(BASE_DIR, 'backups')

# Ensure directories exist immediately on startup
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(BACKUP_DIR, exist_ok=True)

def get_csv_path(city, project):
    # Ensure the city subfolder exists in data/
    city_path = os.path.join(DATA_DIR, city)
    os.makedirs(city_path, exist_ok=True)
    return os.path.join(city_path, f"{project}.csv")

def backup_csv(city, project, csv_path):
    """Creates a timestamped backup of the CSV before editing."""
    try:
        # Create city-specific backup folder
        city_backup_path = os.path.join(BACKUP_DIR, city)
        os.makedirs(city_backup_path, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = os.path.join(city_backup_path, f"{project}_{timestamp}.csv")
        
        if os.path.exists(csv_path):
            shutil.copy2(csv_path, backup_file)
            return True
    except Exception as e:
        print(f"Backup Error: {e}")
    return False

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
    city = request.args.get('city')
    project = request.args.get('project')
    csv_path = get_csv_path(city, project)
    plots = []
    if os.path.exists(csv_path):
        with open(csv_path, mode='r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                plots.append({str(k).strip(): str(v).strip() for k, v in row.items() if k})
        return jsonify(plots)
    return jsonify({"error": "File not found"}), 404

@app.route('/save_plot_details', methods=['POST'])
def save_plot_details():
    if not session.get('is_admin'):
        return jsonify({"error": "Unauthorized"}), 403

    data = request.json
    city, project, plot_id = data['city'], data['project'], str(data['plot_id']).strip()
    csv_path = get_csv_path(city, project)

    if not os.path.exists(csv_path):
        return jsonify({"error": "CSV Missing"}), 404

    # Run backup
    backup_csv(city, project, csv_path)

    updated_rows = []
    fieldnames = []
    try:
        with open(csv_path, mode='r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            fieldnames = reader.fieldnames
            for row in reader:
                if str(row['plot_id']).strip() == plot_id:
                    row.update({
                        'status': data.get('status', row['status']),
                        'owner': data.get('owner', row['owner']),
                        'size': data.get('size', row['size']),
                        'customer_number': data.get('customer_number', row['customer_number']),
                        'booking_date': data.get('booking_date', row.get('booking_date', '')),
                        'registry_date': data.get('registry_date', row.get('registry_date', '')),
                        'color': data.get('color', row.get('color', ''))
                    })
                updated_rows.append(row)

        with open(csv_path, mode='w', encoding='utf-8', newline='') as file:
            writer = csv.DictWriter(file, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(updated_rows)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)