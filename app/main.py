from flask import Flask, render_template, Response, jsonify
import json
import os
from collections import OrderedDict
from datetime import timedelta
# from app import app
app = Flask(__name__)
APP_BASE_PATH = os.environ.get('APPLICATION_ROOT') or os.environ.get('SCRIPT_NAME')
if APP_BASE_PATH:
    app.config['APPLICATION_ROOT'] = APP_BASE_PATH.rstrip('/') or '/'
STATIC_CACHE_SECONDS = 60 * 60 * 24
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = timedelta(seconds=STATIC_CACHE_SECONDS)


def add_json_cache_headers(response):
    response.cache_control.public = True
    response.cache_control.max_age = STATIC_CACHE_SECONDS
    return response


@app.route('/')
def home():
    return render_template('index.html', selected_tab='network_view')


@app.route('/table')
def chemical_table():
    return render_template('index.html', selected_tab='chem_list')


@app.route('/<ptx_code>')
def single_chem_network(ptx_code):
    # Render your main HTML page but with a specific PTX code pre-selected
    return render_template(
        'index.html',
        selected_chem=ptx_code.upper(),
        selected_tab='network_view'
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
