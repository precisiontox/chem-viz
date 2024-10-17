from flask import Flask, render_template, Response, jsonify
import pandas as pd
import json
import os

app = Flask(__name__)


@app.route('/')
def home():
    return render_template('index.html')


@app.route('/get_chemicals')
def get_chemicals():
    # Load the JSON file
    json_path = os.path.join(app.root_path, 'static', 'data', 'chemical_table.json')
    df = pd.read_json(json_path)  # Use read_json instead of read_csv for JSON files

    # Convert DataFrame to a list of dictionaries
    data = df.to_dict(orient='records')

    # Return JSON response
    return jsonify(data)


if __name__ == '__main__':
    app.run(debug=True)
