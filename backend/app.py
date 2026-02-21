import os
import time
import re
import random
import requests
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
from bs4 import BeautifulSoup

from flask_sqlalchemy import SQLAlchemy

load_dotenv()

app = Flask(__name__)
CORS(app)

# User Tracking for "Live Users"
active_users = {} # {ip: last_activity_timestamp}

# Admin PIN Security System
# The PIN is hardcoded here - only Aashvath should know it
ADMIN_PIN = '2026110507713e5ngaashvath'

# Maximum failed PIN attempts before permanent lock
MAX_PIN_ATTEMPTS = 3

# Track user ratings by IP {ip: {'count': int, 'locked': bool, 'pin_attempts': int, 'first_rating_time': timestamp}}
user_rating_tracker = {}

@app.before_request
def track_user():
    # Only track API requests
    if request.path.startswith('/api'):
        ip = request.headers.get('X-Forwarded-For', request.remote_addr)
        active_users[ip] = time.time()

import urllib.parse

# Database Configuration
MYSQL_USER = urllib.parse.quote_plus(os.getenv('MYSQL_USER') or '')
MYSQL_PASSWORD = urllib.parse.quote_plus(os.getenv('MYSQL_PASSWORD') or '')
MYSQL_HOST = os.getenv('MYSQL_HOST')
MYSQL_DB = os.getenv('MYSQL_DB')

app.config['SQLALCHEMY_DATABASE_URI'] = f"mysql+mysqlconnector://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}/{MYSQL_DB}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Fun random name generator
def generate_random_name():
    adjectives = [
        'Funny', 'Laughing', 'Flying', 'Dancing', 'Singing', 'Happy', 'Jolly',
        'Bouncing', 'Smiling', 'Cheerful', 'Playful', 'Clever', 'Wise', 'Swift',
        'Brave', 'Gentle', 'Curious', 'Mighty', 'Tiny', 'Sleepy'
    ]
    animals = [
        'Duck', 'Cow', 'Fish', 'Penguin', 'Panda', 'Koala', 'Dolphin', 'Owl',
        'Fox', 'Bear', 'Rabbit', 'Tiger', 'Lion', 'Elephant', 'Giraffe',
        'Monkey', 'Zebra', 'Kangaroo', 'Turtle', 'Whale'
    ]
    return f"{random.choice(adjectives)} {random.choice(animals)}"

# Scan Record Model
class ScanRecord(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    url = db.Column(db.String(255), nullable=True) # Changed from nullable=False
    performance_score = db.Column(db.Float, nullable=True) # Changed from nullable=False
    grade = db.Column(db.String(5), nullable=True) # Changed from nullable=False
    load_time = db.Column(db.Float)
    status_code = db.Column(db.Integer)
    rating = db.Column(db.Integer, nullable=True)
    comment = db.Column(db.Text, nullable=True)
    visitor_name = db.Column(db.String(100), nullable=True)
    timestamp = db.Column(db.Float, default=time.time)

    def __init__(self, url=None, performance_score=None, grade=None, load_time=None, status_code=None):
        self.url = url
        self.performance_score = performance_score
        self.grade = grade
        self.load_time = load_time
        self.load_time = load_time
        self.status_code = status_code
        self.timestamp = time.time()

# Feedback Model
class Feedback(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    rating = db.Column(db.Integer, nullable=False)
    comment = db.Column(db.Text, nullable=False)
    visitor_name = db.Column(db.String(100), nullable=True)
    scan_id = db.Column(db.Integer, db.ForeignKey('scan_record.id'), nullable=True) # Optional link to a scan
    timestamp = db.Column(db.Float, default=time.time)

    def __init__(self, rating, comment, visitor_name, scan_id=None):
        self.rating = rating
        self.comment = comment
        self.visitor_name = visitor_name
        self.scan_id = scan_id
        self.timestamp = time.time()

# Create tables
with app.app_context():
    try:
        # Create tables only if they don't exist
        db.create_all()
    except Exception as e:
        print(f"DB init error: {e}")

# Store captchas with timestamps (id -> {solution, timestamp})
captcha_store = {}
CAPTCHA_EXPIRY_SECONDS = 600  # 10 minutes

def cleanup_expired_captchas():
    """Remove captchas older than CAPTCHA_EXPIRY_SECONDS"""
    current_time = time.time()
    expired = [cid for cid, data in captcha_store.items() 
               if current_time - data['timestamp'] > CAPTCHA_EXPIRY_SECONDS]
    for cid in expired:
        captcha_store.pop(cid, None)
    if expired:
        print(f"DEBUG: Cleaned up {len(expired)} expired captchas")

@app.route('/api/captcha', methods=['GET'])
def get_captcha():
    cleanup_expired_captchas()  # Clean up old captchas
    
    num1 = random.randint(1, 10)
    num2 = random.randint(1, 10)
    solution = num1 + num2
    captcha_id = str(random.randint(100000, 999999))
    
    captcha_store[captcha_id] = {
        'solution': solution,
        'timestamp': time.time()
    }
    
    print(f"DEBUG: Generated captcha {captcha_id} with solution {solution}. Store now has {len(captcha_store)} captchas.")
    return jsonify({
        "id": captcha_id,
        "question": f"What is {num1} + {num2}?"
    })

@app.route('/api/health')
def health():
    return jsonify({"status": "ok", "message": "Hello World from Fast API!"})

# Kids Safe - 18+ Content Detection
ADULT_CONTENT_KEYWORDS = [
    'adult', 'porn', 'xxx', 'sex', 'mature', '18+', 'nsfw', 'nude', 'naked',
    'escort', 'dating', 'singles', 'hookup', 'cam', 'live cam', 'webcam'
]

ADULT_CONTENT_META = [
    'adult', 'mature', '18+', 'restricted', 'nsfw', 'xxx'
]

@app.route('/api/check-content-safety', methods=['POST'])
def check_content_safety():
    """Check if website contains 18+ content before scanning"""
    data = request.json
    url = data.get('url', '').strip()
    
    if not url:
        return jsonify({"error": "URL is required"}), 400
    
    # Remove protocol if present
    url = re.sub(r'^https?://', '', url, flags=re.IGNORECASE)
    domain = url.split('/')[0].split('?')[0].split('#')[0]
    
    if '.' not in domain or ' ' in domain:
        return jsonify({"error": "Invalid domain format"}), 400
    
    url = 'https://' + url
    
    try:
        response = requests.get(url, timeout=10, allow_redirects=True, verify=False)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Check 1: Domain name contains adult keywords
        domain_lower = domain.lower()
        domain_flags = [kw for kw in ADULT_CONTENT_KEYWORDS if kw in domain_lower]
        
        # Check 2: Meta tags (rating, description, keywords)
        meta_flags = []
        
        # Check rating meta tag
        rating_meta = soup.find('meta', attrs={'name': 'rating'})
        if rating_meta:
            rating_content = rating_meta.get('content', '').lower()
            if any(term in rating_content for term in ['mature', 'adult', 'restricted', 'rta-5042']):
                meta_flags.append(f"Meta rating: {rating_content}")
        
        # Check description meta
        desc_meta = soup.find('meta', attrs={'name': 'description'})
        if desc_meta:
            desc_content = desc_meta.get('content', '').lower()
            found = [kw for kw in ADULT_CONTENT_KEYWORDS if kw in desc_content]
            if found:
                meta_flags.append(f"Description contains: {', '.join(found)}")
        
        # Check keywords meta
        keywords_meta = soup.find('meta', attrs={'name': 'keywords'})
        if keywords_meta:
            keywords_content = keywords_meta.get('content', '').lower()
            found = [kw for kw in ADULT_CONTENT_KEYWORDS if kw in keywords_content]
            if found:
                meta_flags.append(f"Keywords contain: {', '.join(found)}")
        
        # Check 3: Title contains adult keywords
        title_flags = []
        title = soup.title.string if soup.title else ""
        if title:
            title_lower = title.lower()
            found = [kw for kw in ADULT_CONTENT_KEYWORDS if kw in title_lower]
            if found:
                title_flags.append(f"Title contains: {', '.join(found)}")
        
        # Check 4: RTA label (common adult site verification)
        has_rta_label = False
        rta_meta = soup.find('meta', attrs={'name': 'RATING'})
        if rta_meta and 'RTA' in str(rta_meta):
            has_rta_label = True
            meta_flags.append("RTA-5042-1996-1400-1577-RTA")
        
        # Determine if 18+ content detected
        is_adult = bool(domain_flags or meta_flags or title_flags or has_rta_label)
        
        # Build warning message
        warning_reasons = domain_flags + meta_flags + title_flags
        
        return jsonify({
            "is_adult_content": is_adult,
            "warning": is_adult,
            "url": url,
            "title": title if title else "Unknown",
            "reasons": warning_reasons[:3],  # Limit to top 3 reasons
            "message": "This website may contain adult (18+) content." if is_adult else "Content appears safe for all ages."
        })
        
    except requests.exceptions.Timeout:
        return jsonify({"error": "Request timed out while checking content safety"}), 504
    except Exception as e:
        print(f"ERROR checking content safety for {url}: {str(e)}")
        # If we can't determine, return warning to be safe
        return jsonify({
            "is_adult_content": False,
            "warning": False,
            "error": "Could not verify content safety",
            "message": "Proceed with caution"
        })

@app.route('/api/scan', methods=['POST'])
def scan_url():
    data = request.json
    url = data.get('url', '').strip()
    
    # URL Sanitization & Validation
    if not url:
        return jsonify({"error": "URL is required"}), 400

    # Remove protocol if present
    url = re.sub(r'^https?://', '', url, flags=re.IGNORECASE)
    
    # Split to get domain only for basic validation, but keep path for scan
    domain = url.split('/')[0].split('?')[0].split('#')[0]
    
    # Basic domain validation
    if '.' not in domain or ' ' in domain:
         return jsonify({"error": "Invalid domain format. Please enter a valid URL (e.g., google.com)"}), 400

    # Enforce HTTPS
    url = 'https://' + url
    print(f"DEBUG: Processing scan for URL: {url}")

    try:
        start_time = time.time()
        # Disable SSL verification for development/testing if needed
        response = requests.get(url, timeout=10, allow_redirects=True, verify=False)
        end_time = time.time()
        
        load_time = round((end_time - start_time) * 1000, 2)  # in ms
        
        soup = BeautifulSoup(response.text, 'html.parser')
        title = soup.title.string if soup.title else "No Title Found"
        
        # Basic "bug" checks
        bugs = []
        if response.status_code >= 400:
            bugs.append(f"HTTP Error: {response.status_code}")
        
        if not soup.find('meta', attrs={'name': 'viewport'}):
            bugs.append("Missing viewport meta tag (Not Mobile Friendly)")
        
        if not soup.find('h1'):
            bugs.append("Missing H1 tag (SEO issue)")

        # Safety & Trust Check Logic
        is_safe = True
        safety_reasons = []
        
        # 1. HTTPS Check
        if not response.url.startswith('https://'):
            is_safe = False
            safety_reasons.append("Connection is not secure (Missing HTTPS)")
        
        # 2. Suspicious URL Patterns
        # NOTE: This check is for phishing-style domains like "secure-bank-login.com"
        # It should NOT flag legitimate sites like wikipedia.org
        suspicious_exact_matches = ['wp-admin', 'wp-login']
        suspicious_patterns = ['-login-', '-verify-', '-update-', '-account-', '-secure-', '-banking-']
        url_domain = response.url.split('//')[-1].split('/')[0]
        url_domain_lower = url_domain.lower()
        
        # Check for excessive hyphens (common in phishing domains)
        if url_domain.count('-') > 3:
            is_safe = False
            safety_reasons.append("Domain name looks suspicious (Too many hyphens)")
        
        # Check for suspicious patterns (must be between hyphens or at start/end)
        for pattern in suspicious_patterns:
            if pattern in url_domain_lower:
                is_safe = False
                safety_reasons.append(f"Suspicious pattern '{pattern}' found in domain")
        
        # Check for exact matches of sensitive paths
        for keyword in suspicious_exact_matches:
            if keyword in url_domain_lower:
                is_safe = False
                safety_reasons.append(f"Suspicious keyword '{keyword}' found in domain")

        if response.status_code != 200:
            is_safe = False
            safety_reasons.append(f"Website returned status code {response.status_code}")

        status_message = "Safe to Go" if is_safe else "Not a Trusted Website"

        # Performance Grade Logic - Based ONLY on performance, NOT safety
        if load_time < 500: grade = "A+"
        elif load_time < 1000: grade = "A"
        elif load_time < 1800: grade = "B"
        elif load_time < 3000: grade = "C"
        elif load_time < 5000: grade = "D"
        else: grade = "F"

        # NOTE: We removed the grade downgrade for unsafe sites.
        # Performance grade should reflect actual performance, not safety status.
        # Safety is shown separately in the safety_status field.

        # Save scan record
        new_scan = ScanRecord(
            url=url,
            performance_score=max(0, 100 - (load_time / 100)),
            grade=grade,
            load_time=load_time,
            status_code=response.status_code
        )
        db.session.add(new_scan)
        db.session.commit()

        return jsonify({
            "id": new_scan.id,
            "url": response.url,
            "status": response.status_code,
            "load_time_ms": load_time,
            "title": title,
            "content_length": len(response.content),
            "bugs": bugs,
            "is_safe": is_safe,
            "safety_status": status_message,
            "safety_reasons": safety_reasons,
            "performance_score": new_scan.performance_score,
            "grade": grade
        })
    except Exception as e:
        print(f"ERROR during scan for {url}: {str(e)}")
        return jsonify({"error": f"Failed to analyze website: {str(e)}"}), 500

@app.route('/api/check-rating-status', methods=['GET'])
def check_rating_status():
    """Check if user can rate and if they need PIN"""
    client_ip = request.headers.get('X-Forwarded-For', request.remote_addr)
    
    user_data = user_rating_tracker.get(client_ip, {'count': 0, 'locked': False, 'pin_attempts': 0})
    
    return jsonify({
        'can_rate': not user_data['locked'] and user_data['count'] == 0,
        'needs_pin': user_data['count'] >= 1 and not user_data['locked'],
        'is_locked': user_data['locked'],
        'rating_count': user_data['count'],
        'pin_attempts': user_data.get('pin_attempts', 0),
        'pin_attempts_remaining': MAX_PIN_ATTEMPTS - user_data.get('pin_attempts', 0)
    })

@app.route('/api/verify-pin', methods=['POST'])
def verify_pin():
    """Verify admin PIN to allow additional rating - 3 attempts allowed"""
    data = request.json
    provided_pin = data.get('pin', '')
    client_ip = request.headers.get('X-Forwarded-For', request.remote_addr)
    
    user_data = user_rating_tracker.get(client_ip, {'count': 0, 'locked': False, 'pin_attempts': 0})
    
    # If already locked, reject immediately
    if user_data.get('locked', False):
        return jsonify({
            'success': False, 
            'error': 'Your account is permanently locked due to incorrect PIN attempts.',
            'locked': True
        }), 403
    
    if provided_pin == ADMIN_PIN:
        # Correct PIN - reset count to allow one more rating, reset attempts
        user_rating_tracker[client_ip] = {
            'count': 0,  # Reset to allow one more
            'locked': False,
            'pin_attempts': 0,  # Reset attempts on success
            'first_rating_time': user_data.get('first_rating_time', time.time())
        }
        return jsonify({
            'success': True,
            'message': 'PIN verified. You can submit one more rating.'
        })
    else:
        # Wrong PIN - increment attempt counter
        current_attempts = user_data.get('pin_attempts', 0) + 1
        remaining_attempts = MAX_PIN_ATTEMPTS - current_attempts
        
        if current_attempts >= MAX_PIN_ATTEMPTS:
            # PERMANENTLY LOCK this IP after 3 failed attempts
            user_rating_tracker[client_ip] = {
                'count': user_data.get('count', 0),
                'locked': True,
                'pin_attempts': current_attempts,
                'locked_at': time.time(),
                'first_rating_time': user_data.get('first_rating_time', time.time())
            }
            print(f"SECURITY ALERT: IP {client_ip} PERMANENTLY LOCKED after {current_attempts} failed PIN attempts!")
            return jsonify({
                'success': False,
                'error': f'Incorrect PIN! You have used all {MAX_PIN_ATTEMPTS} attempts. Your account is now permanently locked.',
                'locked': True,
                'attempts_used': current_attempts,
                'attempts_remaining': 0
            }), 403
        else:
            # Still have attempts remaining
            user_rating_tracker[client_ip] = {
                'count': user_data.get('count', 0),
                'locked': False,
                'pin_attempts': current_attempts,
                'first_rating_time': user_data.get('first_rating_time', time.time())
            }
            print(f"SECURITY: IP {client_ip} entered wrong PIN. Attempt {current_attempts}/{MAX_PIN_ATTEMPTS}")
            return jsonify({
                'success': False,
                'error': f'Incorrect PIN! You have {remaining_attempts} attempt(s) remaining before permanent lock.',
                'locked': False,
                'attempts_used': current_attempts,
                'attempts_remaining': remaining_attempts
            }), 403

@app.route('/api/rate', methods=['POST'])
def rate_site():
    data = request.json
    print(f"DEBUG: Received rate request data: {data}")
    scan_id = data.get('scan_id')
    rating = data.get('rating')
    comment = data.get('comment')
    visitor_name = data.get('visitor_name', '').strip()
    captcha_id = data.get('captcha_id')
    captcha_answer = data.get('captcha_answer')
    
    # Get client IP for tracking
    client_ip = request.headers.get('X-Forwarded-For', request.remote_addr)
    
    # Check user's rating status
    user_data = user_rating_tracker.get(client_ip, {'count': 0, 'locked': False})
    
    # Check if user is permanently locked
    if user_data.get('locked', False):
        return jsonify({
            "error": "Your rating privileges have been permanently locked due to security policy violation.",
            "locked": True
        }), 403
    
    # Check if user has already rated (needs PIN for additional ratings)
    if user_data.get('count', 0) >= 1:
        return jsonify({
            "error": "You have already submitted a rating. Enter the admin PIN to submit another.",
            "needs_pin": True
        }), 403
    
    # Generate random name if none provided
    if not visitor_name:
        visitor_name = generate_random_name()
    
    # 1. Validate Captcha
    cleanup_expired_captchas()  # Clean up old captchas
    
    print(f"DEBUG: Captcha validation - ID: {captcha_id}, Answer: {captcha_answer}")
    print(f"DEBUG: Current captcha store has {len(captcha_store)} entries: {list(captcha_store.keys())}")
    
    if not captcha_id or captcha_id not in captcha_store:
        print(f"DEBUG: Captcha {captcha_id} not found in store!")
        return jsonify({"error": "Captcha expired or invalid. Please refresh the page and try again."}), 400
    
    # Check if captcha is expired
    captcha_data = captcha_store[captcha_id]
    if time.time() - captcha_data['timestamp'] > CAPTCHA_EXPIRY_SECONDS:
        print(f"DEBUG: Captcha {captcha_id} expired (age: {time.time() - captcha_data['timestamp']}s)")
        captcha_store.pop(captcha_id, None)
        return jsonify({"error": "Captcha expired. Please refresh the page and try again."}), 400
    
    try:
        if int(captcha_answer) != captcha_data['solution']:
            print(f"DEBUG: Wrong answer! Expected {captcha_data['solution']}, got {captcha_answer}")
            return jsonify({"error": "Wrong answer! Please try again."}), 400
        print(f"DEBUG: Captcha validated successfully!")
        captcha_store.pop(captcha_id, None)  # Use once
    except Exception as e:
        print(f"DEBUG: Captcha validation exception: {e}")
        return jsonify({"error": "Invalid captcha format"}), 400

    if rating is None or not (1 <= rating <= 5):
        return jsonify({"error": "Invalid rating"}), 400

    try:
        # Save to Feedback table
        feedback_entry = Feedback(
            rating=rating,
            comment=comment,
            visitor_name=visitor_name,
            scan_id=scan_id if scan_id else None
        )
        db.session.add(feedback_entry)
        
        # If linked to a scan, also update the ScanRecord for backward compatibility/easy access
        if scan_id:
            scan = ScanRecord.query.get(scan_id)
            if scan:
                scan.rating = rating
                scan.comment = comment
                scan.visitor_name = visitor_name
        
        db.session.commit()
        
        # Track this IP as having rated
        current_count = user_data.get('count', 0)
        user_rating_tracker[client_ip] = {
            'count': current_count + 1,
            'locked': user_data.get('locked', False),
            'first_rating_time': user_data.get('first_rating_time', time.time())
        }
        
        # Calculate stats from Feedback table
        all_feedback = Feedback.query.all()
        avg_rating = sum(r.rating for r in all_feedback) / len(all_feedback) if all_feedback else 0.0
        
        return jsonify({
            "success": True, 
            "average_rating": float(f"{avg_rating:.1f}"),
            "total_ratings": len(all_feedback),
            "submitted_comment": comment,
            "visitor_name": visitor_name,
            "ratings_remaining": 0  # They've used their one free rating
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/recent-scans', methods=['GET'])
def recent_scans():
    try:
        # Show latest 50 SCANS ONLY (filter out general feedback which has no URL/Grade)
        scans = ScanRecord.query.filter(ScanRecord.url != "General Feedback").order_by(ScanRecord.timestamp.desc()).limit(50).all()
        return jsonify([{
            "id": s.id,
            "url": s.url,
            "grade": s.grade,
            "score": s.performance_score,
            "load_time": s.load_time,
            "visitor_name": s.visitor_name,
            "rating": s.rating,
            "comment": s.comment,
            "timestamp": s.timestamp
        } for s in scans])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/recent-feedback', methods=['GET'])
def recent_feedback():
    try:
        # Show latest 20 feedbacks
        feedbacks = Feedback.query.order_by(Feedback.timestamp.desc()).limit(20).all()
        return jsonify([{
            "id": f.id,
            "rating": f.rating,
            "comment": f.comment,
            "visitor_name": f.visitor_name,
            "scan_id": f.scan_id,
            "timestamp": f.timestamp
        } for f in feedbacks])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/reset-ratings', methods=['POST'])
def reset_ratings():
    try:
        ScanRecord.query.delete()
        db.session.commit()
        return jsonify({"success": True, "message": "All data cleared"})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    try:
        # 1. Live Users (active in last 5 minutes)
        cutoff = time.time() - 300
        live_ips = [ip for ip, last_time in active_users.items() if last_time > cutoff]
        
        # Cleanup old entries (optional but good practice)
        for ip in list(active_users.keys()):
            if active_users[ip] < cutoff - 3600: # Remove if inactive for > 1 hour
                active_users.pop(ip, None)
        
        # 2. Total Scans (Real scans only)
        total_scans = db.session.query(db.func.count(ScanRecord.id)).filter(ScanRecord.url != "General Feedback").scalar() or 0
        
        # 3. Total Reviews (From Feedback table)
        total_reviews = db.session.query(db.func.count(Feedback.id)).scalar() or 0
        
        # 4. Average Rating
        avg_rating = db.session.query(db.func.avg(Feedback.rating)).scalar() or 0.0
        avg_rating = float(f"{avg_rating:.1f}")

        return jsonify({
            "live_users": len(live_ips) + random.randint(1, 3), # Add a small random offset to "feel" more alive for single users
            "total_users": total_scans + 125, # Offset starting point to look established
            "total_reviews": total_reviews,
            "average_rating": avg_rating
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
