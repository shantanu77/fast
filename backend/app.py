import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

app.config['MYSQL_HOST'] = os.getenv('MYSQL_HOST', '10.0.0.3')
app.config['MYSQL_USER'] = os.getenv('MYSQL_USER', 'fast_app')
app.config['MYSQL_PASSWORD'] = os.getenv('MYSQL_PASSWORD', '')
app.config['MYSQL_DB'] = os.getenv('MYSQL_DB', 'fast_app')


@app.route('/api/health')
def health():
    return jsonify({"status": "ok", "message": "Hello World from Fast API!"})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
