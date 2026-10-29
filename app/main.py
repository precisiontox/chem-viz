from flask import Flask, render_template, Response, jsonify, redirect, url_for
import json
import os
from collections import OrderedDict
from datetime import timedelta
try:
    from app.api import DEX_BASE_URL, api_bp, chemical_jsonld, dataset_jsonld, get_chemical
except ImportError:  # running as `python app/main.py`
    from api import DEX_BASE_URL, api_bp, chemical_jsonld, dataset_jsonld, get_chemical
# from app import app
app = Flask(__name__)
app.register_blueprint(api_bp)
APP_BASE_PATH = os.environ.get('APPLICATION_ROOT') or os.environ.get('SCRIPT_NAME')
if APP_BASE_PATH:
    app.config['APPLICATION_ROOT'] = APP_BASE_PATH.rstrip('/') or '/'
STATIC_CACHE_SECONDS = 60 * 60 * 24
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = timedelta(seconds=STATIC_CACHE_SECONDS)


@app.context_processor
def inject_dex_base_url():
    # Used by the shared top navigation bar to link back to the PTox/DEx main app
    return {'dex_base_url': DEX_BASE_URL}


def add_json_cache_headers(response):
    response.cache_control.public = True
    response.cache_control.max_age = STATIC_CACHE_SECONDS
    return response


@app.route('/')
def home():
    return render_template('index.html', selected_tab='network_view', jsonld=dataset_jsonld())


@app.route('/table')
def chemical_table():
    return render_template('index.html', selected_tab='chem_list', jsonld=dataset_jsonld())


@app.route('/about')
def about():
    return render_template('about.html', jsonld=dataset_jsonld())


@app.route('/api')
def api_root():
    # Explicit rule so '/api' is not caught by the '/<ptx_code>' route below
    return redirect(url_for('api.index'))


@app.route('/<ptx_code>')
def single_chem_network(ptx_code):
    # Render your main HTML page but with a specific PTX code pre-selected
    chem = get_chemical(ptx_code)
    return render_template(
        'index.html',
        selected_chem=ptx_code.upper(),
        selected_tab='network_view',
        jsonld=chemical_jsonld(chem) if chem else dataset_jsonld(),
        jsonld_alternate=url_for('api.chemical_detail', ptx_code=chem['ptx_code']) if chem else None
    )


@app.route('/chemical_data/<selected_chem>')
def get_chemical_info(selected_chem):
    # Define the path to your JSON data file
    json_path = os.path.join(
        app.root_path, 'static', 'data', 'single_chem', f'{selected_chem}_data.json'
    )

    if not os.path.isfile(json_path):
        return jsonify({"error": "Chemical not found"}), 404

    # Load the JSON file
    with open(json_path) as f:
        chem_data = json.load(f, object_pairs_hook=OrderedDict) 

    # Check if the chemical data is found
    if chem_data:
        # Convert the data back to JSON string to ensure order and return it
        response = json.dumps(chem_data, indent=4, sort_keys=False)
        # Return a Flask response with the correct content type
        return add_json_cache_headers(Response(response, content_type='application/json'))

    else:
        # If the chemical is not found, return an error response
        return jsonify({"error": "Chemical not found"}), 404


@app.route('/get_chemicals')
def get_chemicals():
    # Load the JSON file
    json_path = os.path.join(app.root_path, 'static', 'data', 'chemical_table.json')
    with open(json_path) as f:
        data = json.load(f, object_pairs_hook=OrderedDict)  # Preserve key order

    # Convert the data back to JSON string to ensure order and return it
    response = json.dumps(data, indent=4, sort_keys=False)

    # Return a Flask response with the correct content type
    return add_json_cache_headers(Response(response, content_type='application/json'))


if __name__ == '__main__':
    app.run()
