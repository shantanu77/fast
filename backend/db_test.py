import os
import urllib.parse
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import sys

def test_connection():
    load_dotenv()
    user = os.getenv('MYSQL_USER')
    password = os.getenv('MYSQL_PASSWORD')
    host = os.getenv('MYSQL_HOST')
    db_name = os.getenv('MYSQL_DB')

    if not all([user, password, host, db_name]):
        print(f"Missing environment variables. User: {bool(user)}, Pass: {bool(password)}, Host: {bool(host)}, DB: {bool(db_name)}")
        return

    u = urllib.parse.quote_plus(user)
    p = urllib.parse.quote_plus(password)
    
    uri = f"mysql+mysqlconnector://{u}:{p}@{host}/{db_name}"
    print(f"Testing URI: mysql+mysqlconnector://{u}:****@{host}/{db_name}")

    try:
        engine = create_engine(uri, connect_args={'connect_timeout': 5})
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("Success: Connection established!")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    test_connection()
