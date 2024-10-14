from flask import Flask, render_template, Response
import pandas as pd
import json
import os

app = Flask(__name__)


@app.route('/')
def home():
    return render_template('index.html')


@app.route('/get_chemicals')
def get_chemicals():
    # Load the CSV file
    csv_path = os.path.join(app.root_path, 'static', 'data', 'chemical_table.csv')
    df = pd.read_csv(csv_path)

    # Convert DataFrame to a list of dictionaries with column order preserved
    data = df.to_dict(orient='records')

    # Convert the list of dictionaries to JSON, ensuring the order is preserved
    json_data = json.dumps(data, indent=2)

    json_out = os.path.join(app.root_path, 'static', 'data', 'chemical_table.json')
    with open(json_out, 'wt') as file_out:
        json.dump(data, file_out, indent=6)

    return Response(json_data, mimetype='application/json')


if __name__ == '__main__':
    app.run(debug=True)
