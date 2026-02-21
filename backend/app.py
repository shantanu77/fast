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

# Import V2 modules
try:
    from browser_scanner import scan_website
    BROWSER_SCAN_AVAILABLE = True
except ImportError as e:
    print(f"Browser scanner not available: {e}")
    BROWSER_SCAN_AVAILABLE = False
    scan_website = None

try:
    from kids_safety_checker import check_kids_safety, KidsSafetyChecker
    KIDS_SAFETY_AVAILABLE = True
except ImportError as e:
    print(f"Kids safety checker not available: {e}")
    KIDS_SAFETY_AVAILABLE = False
    check_kids_safety = None

load_dotenv()

app = Flask(__name__)
CORS(app)

# User Tracking for "Live Users"
active_users = {} # {ip: last_activity_timestamp}

# Admin PIN Security System
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

# Scan Record Model - V2 with new fields
class ScanRecord(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    url = db.Column(db.String(255), nullable=True)
    performance_score = db.Column(db.Float, nullable=True)
    grade = db.Column(db.String(5), nullable=True)
    load_time = db.Column(db.Float)
    status_code = db.Column(db.Integer)
    rating = db.Column(db.Integer, nullable=True)
    comment = db.Column(db.Text, nullable=True)
    visitor_name = db.Column(db.String(100), nullable=True)
    timestamp = db.Column(db.Float, default=time.time)
    
    # V2 fields
    scan_method = db.Column(db.String(20), default='legacy')  # 'browser' or 'legacy'
    kids_safety_rating = db.Column(db.String(20))
    kids_safety_score = db.Column(db.Integer)
    kids_safety_sources = db.Column(db.Text)  # JSON string
    kids_safety_warnings = db.Column(db.Text)  # JSON string
    dom_content_loaded = db.Column(db.Float)
    first_contentful_paint = db.Column(db.Float)
    total_requests = db.Column(db.Integer)
    page_weight_bytes = db.Column(db.Integer)

    def __init__(self, url=None, performance_score=None, grade=None, load_time=None, status_code=None,
                 scan_method='legacy', kids_safety_rating=None, kids_safety_score=None,
                 kids_safety_sources=None, kids_safety_warnings=None, **kwargs):
        self.url = url
        self.performance_score = performance_score
        self.grade = grade
        self.load_time = load_time
        self.status_code = status_code
        self.timestamp = time.time()
        self.scan_method = scan_method
        self.kids_safety_rating = kids_safety_rating
        self.kids_safety_score = kids_safety_score
        self.kids_safety_sources = kids_safety_sources
        self.kids_safety_warnings = kids_safety_warnings

# Feedback Model
class Feedback(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    rating = db.Column(db.Integer, nullable=False)
    comment = db.Column(db.Text, nullable=False)
    visitor_name = db.Column(db.String(100), nullable=True)
    scan_id = db.Column(db.Integer, db.ForeignKey('scan_record.id'), nullable=True)
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
        db.create_all()
    except Exception as e:
        print(f"DB init error: {e}")

# Store captchas with timestamps (id -> {solution, timestamp})
captcha_store = {}
CAPTCHA_EXPIRY_SECONDS = 600

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
    cleanup_expired_captchas()
    
    num1 = random.randint(1, 10)
    num2 = random.randint(1, 10)
    solution = num1 + num2
    captcha_id = str(random.randint(100000, 999999))
    
    captcha_store[captcha_id] = {
        'solution': solution,
        'timestamp': time.time()
    }
    
    return jsonify({
        "id": captcha_id,
        "question": f"What is {num1} + {num2}?"
    })

@app.route('/api/health')
def health():
    return jsonify({
        "status": "ok", 
        "message": "Fast Scanner API V2",
        "browser_scan_available": BROWSER_SCAN_AVAILABLE,
        "kids_safety_available": KIDS_SAFETY_AVAILABLE
    })

# ==================== V2: KIDS SAFETY ENDPOINTS ====================

@app.route('/api/kids-safety-check', methods=['POST'])
def kids_safety_check():
    """Check if website is safe for kids using comprehensive analysis."""
    data = request.json
    url = data.get('url', '').strip()
    
    if not url:
        return jsonify({"error": "URL is required"}), 400
    
    # Normalize URL
    url = re.sub(r'^https?://', '', url, flags=re.IGNORECASE)
    if '.' not in url or ' ' in url:
        return jsonify({"error": "Invalid URL format"}), 400
    url = 'https://' + url
    
    if not KIDS_SAFETY_AVAILABLE:
        return jsonify({"error": "Kids safety checker not available"}), 503
    
    try:
        # First try to get HTML content for better analysis
        html_content = None
        try:
            response = requests.get(url, timeout=10, allow_redirects=True, verify=False,
                                    headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'})
            html_content = response.text
        except:
            pass
        
        # Run kids safety check
        result = check_kids_safety(url, html_content)
        
        # Add display info
        checker = KidsSafetyChecker()
        result['display'] = checker.get_rating_display(result['rating'])
        
        return jsonify(result)
        
    except Exception as e:
        print(f"ERROR in kids safety check for {url}: {str(e)}")
        return jsonify({
            "rating": "UNKNOWN",
            "score": 50,
            "confidence": "low",
            "error": str(e),
            "display": {
                "label": "Unknown",
                "emoji": "❓",
                "color": "#6b7280",
                "description": "Could not determine safety rating"
            }
        }), 500


# ==================== V2: BROWSER-BASED SCAN ====================

@app.route('/api/scan-v2', methods=['POST'])
def scan_url_v2():
    """V2 Scan endpoint using browser automation for accurate results."""
    data = request.json
    url = data.get('url', '').strip()
    
    if not url:
        return jsonify({"error": "URL is required"}), 400

    # Normalize URL
    url = re.sub(r'^https?://', '', url, flags=re.IGNORECASE)
    domain = url.split('/')[0].split('?')[0].split('#')[0]
    
    if '.' not in domain or ' ' in domain:
        return jsonify({"error": "Invalid domain format. Please enter a valid URL (e.g., google.com)"}), 400

    url = 'https://' + url
    print(f"DEBUG: Processing V2 scan for URL: {url}")

    try:
        # Use browser-based scan if available
        if BROWSER_SCAN_AVAILABLE and scan_website:
            scan_result = scan_website(url)
        else:
            # Fallback to legacy scan
            scan_result = legacy_scan(url)
        
        if not scan_result.get('success'):
            return jsonify({"error": scan_result.get('error', 'Scan failed')}), 500
        
        # Run kids safety check
        kids_safety = None
        if KIDS_SAFETY_AVAILABLE and check_kids_safety:
            try:
                kids_safety = check_kids_safety(
                    url, 
                    scan_result.get('html_content'),
                    scan_result.get('headers')
                )
            except Exception as e:
                print(f"Kids safety check failed: {e}")
                kids_safety = {
                    'rating': 'UNKNOWN',
                    'score': 50,
                    'confidence': 'low',
                    'warnings': [],
                    'sources': []
                }
        
        # Safety & Trust Check
        is_safe, safety_reasons = check_safety(scan_result['url'], scan_result)
        
        # Performance Grade based on browser metrics
        metrics = scan_result.get('metrics', {})
        load_time = scan_result.get('load_time_ms', 0)
        
        # V2: Use First Contentful Paint for better performance measurement
        fcp = metrics.get('first_contentful_paint', 0)
        if fcp > 0:
            # Use FCP if available
            if fcp < 1000: grade = "A+"
            elif fcp < 1800: grade = "A"
            elif fcp < 3000: grade = "B"
            elif fcp < 4500: grade = "C"
            elif fcp < 6000: grade = "D"
            else: grade = "F"
        else:
            # Fallback to load time
            if load_time < 500: grade = "A+"
            elif load_time < 1000: grade = "A"
            elif load_time < 1800: grade = "B"
            elif load_time < 3000: grade = "C"
            elif load_time < 5000: grade = "D"
            else: grade = "F"
        
        # Calculate performance score
        if fcp > 0:
            performance_score = max(0, 100 - (fcp / 50))
        else:
            performance_score = max(0, 100 - (load_time / 100))
        
        # Save scan record with V2 fields
        import json
        new_scan = ScanRecord(
            url=scan_result['url'],
            performance_score=performance_score,
            grade=grade,
            load_time=load_time,
            status_code=scan_result['status_code'],
            scan_method=scan_result.get('scan_method', 'legacy'),
            kids_safety_rating=kids_safety.get('rating') if kids_safety else 'UNKNOWN',
            kids_safety_score=kids_safety.get('score') if kids_safety else 50,
            kids_safety_sources=json.dumps(kids_safety.get('sources', [])) if kids_safety else '[]',
            kids_safety_warnings=json.dumps(kids_safety.get('warnings', [])) if kids_safety else '[]',
            dom_content_loaded=metrics.get('dom_content_loaded'),
            first_contentful_paint=metrics.get('first_contentful_paint'),
            total_requests=metrics.get('total_requests'),
            page_weight_bytes=metrics.get('transfer_size_bytes')
        )
        db.session.add(new_scan)
        db.session.commit()
        
        # Build response
        response_data = {
            "id": new_scan.id,
            "url": scan_result['url'],
            "original_url": scan_result.get('original_url', url),
            "status": scan_result['status_code'],
            "load_time_ms": load_time,
            "title": scan_result['title'],
            "content_length": scan_result['content_length'],
            "bugs": scan_result['bugs'],
            "is_safe": is_safe,
            "safety_status": "Safe to Go" if is_safe else "Not a Trusted Website",
            "safety_reasons": safety_reasons,
            "performance_score": performance_score,
            "grade": grade,
            "scan_method": scan_result.get('scan_method', 'legacy'),
            "metrics": {
                "dom_content_loaded_ms": metrics.get('dom_content_loaded'),
                "load_complete_ms": metrics.get('load_complete'),
                "first_paint_ms": metrics.get('first_paint'),
                "first_contentful_paint_ms": metrics.get('first_contentful_paint'),
                "total_requests": metrics.get('total_requests'),
                "transfer_size_bytes": metrics.get('transfer_size_bytes'),
                "encoded_body_size_bytes": metrics.get('encoded_body_size_bytes'),
            },
            "element_counts": scan_result.get('element_counts', {}),
            "links_found": scan_result.get('links_found', 0),
        }
        
        # Add kids safety info
        if kids_safety:
            checker = KidsSafetyChecker()
            response_data['kids_safety'] = {
                "rating": kids_safety.get('rating', 'UNKNOWN'),
                "score": kids_safety.get('score', 50),
                "confidence": kids_safety.get('confidence', 'low'),
                "warnings": kids_safety.get('warnings', []),
                "sources": kids_safety.get('sources', []),
                "display": checker.get_rating_display(kids_safety.get('rating', 'UNKNOWN'))
            }
        
        return jsonify(response_data)
        
    except Exception as e:
        print(f"ERROR during V2 scan for {url}: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to analyze website: {str(e)}"}), 500


def legacy_scan(url: str):
    """Legacy scan fallback using requests."""
    import time
    start_time = time.time()
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    
    response = requests.get(url, timeout=10, allow_redirects=True, verify=False, headers=headers)
    end_time = time.time()
    
    load_time = round((end_time - start_time) * 1000, 2)
    soup = BeautifulSoup(response.text, 'html.parser')
    
    bugs = []
    if response.status_code >= 400:
        bugs.append(f"HTTP Error: {response.status_code}")
    if not soup.find('meta', attrs={'name': 'viewport'}):
        bugs.append("Missing viewport meta tag (Not Mobile Friendly)")
    if not soup.find('h1'):
        bugs.append("Missing H1 tag (SEO issue)")
    
    return {
        'success': True,
        'scan_method': 'legacy',
        'url': response.url,
        'original_url': url,
        'status_code': response.status_code,
        'title': soup.title.string if soup.title else "No Title Found",
        'load_time_ms': load_time,
        'content_length': len(response.content),
        'metrics': {
            'dom_content_loaded': load_time,
            'load_complete': load_time,
            'first_paint': 0,
            'first_contentful_paint': 0,
            'total_requests': 0,
            'transfer_size_bytes': len(response.content),
            'encoded_body_size_bytes': len(response.content),
        },
        'element_counts': {
            'images': len(soup.find_all('img')),
            'scripts': len(soup.find_all('script')),
            'stylesheets': len(soup.find_all('link', rel='stylesheet')),
            'iframes': len(soup.find_all('iframe')),
            'forms': len(soup.find_all('form')),
            'inputs': len(soup.find_all('input')),
        },
        'links_found': len(soup.find_all('a', href=True)),
        'bugs': bugs,
        'html_content': response.text,
        'headers': dict(response.headers),
    }


def check_safety(url: str, scan_result: dict) -> tuple:
    """Check website safety."""
    is_safe = True
    safety_reasons = []
    
    # HTTPS Check
    if not url.startswith('https://'):
        is_safe = False
        safety_reasons.append("Connection is not secure (Missing HTTPS)")
    
    # Status code check
    status = scan_result.get('status_code', 200)
    if status >= 400:
        is_safe = False
        safety_reasons.append(f"Website returned error code {status}")
    
    # Suspicious patterns
    url_domain = url.split('//')[-1].split('/')[0]
    if url_domain.count('-') > 3:
        is_safe = False
        safety_reasons.append("Domain name looks suspicious (Too many hyphens)")
    
    suspicious_patterns = ['-login-', '-verify-', '-update-', '-account-', '-secure-', '-banking-']
    for pattern in suspicious_patterns:
        if pattern in url_domain.lower():
            is_safe = False
            safety_reasons.append(f"Suspicious pattern '{pattern}' found in domain")
    
    return is_safe, safety_reasons


# ==================== V2: WEBSITE SEARCH ====================

@app.route('/api/websites/search', methods=['GET'])
def search_websites():
    """Search for websites in the database."""
    query = request.args.get('q', '').strip().lower()
    filter_by = request.args.get('filter', 'all')  # all, safe, unsafe, recent
    sort_by = request.args.get('sort', 'recent')  # recent, score, name
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 20))
    
    try:
        # Build query
        base_query = ScanRecord.query.filter(ScanRecord.url != None)
        
        # Apply search filter
        if query:
            base_query = base_query.filter(ScanRecord.url.ilike(f'%{query}%'))
        
        # Apply safety filter
        if filter_by == 'safe':
            base_query = base_query.filter(ScanRecord.kids_safety_rating.in_(['SAFE_FOR_ALL', 'PARENTAL_GUIDANCE']))
        elif filter_by == 'unsafe':
            base_query = base_query.filter(ScanRecord.kids_safety_rating.in_(['MATURE', 'BLOCKED']))
        
        # Apply sorting
        if sort_by == 'recent':
            base_query = base_query.order_by(ScanRecord.timestamp.desc())
        elif sort_by == 'score':
            base_query = base_query.order_by(ScanRecord.performance_score.desc())
        elif sort_by == 'name':
            base_query = base_query.order_by(ScanRecord.url)
        
        # Paginate
        total = base_query.count()
        scans = base_query.offset((page - 1) * per_page).limit(per_page).all()
        
        import json
        results = []
        for scan in scans:
            result = {
                "id": scan.id,
                "url": scan.url,
                "grade": scan.grade,
                "performance_score": scan.performance_score,
                "load_time": scan.load_time,
                "status_code": scan.status_code,
                "scan_method": scan.scan_method,
                "timestamp": scan.timestamp,
                "kids_safety": {
                    "rating": scan.kids_safety_rating or 'UNKNOWN',
                    "score": scan.kids_safety_score or 50,
                } if scan.kids_safety_rating else None
            }
            results.append(result)
        
        return jsonify({
            "results": results,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": (total + per_page - 1) // per_page,
            "query": query
        })
        
    except Exception as e:
        print(f"ERROR in search: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/websites/scan-new', methods=['POST'])
def scan_new_website():
    """Scan a new website and add it to the database."""
    data = request.json
    url = data.get('url', '').strip()
    
    if not url:
        return jsonify({"error": "URL is required"}), 400
    
    # Check if already exists
    existing = ScanRecord.query.filter(ScanRecord.url.ilike(f'%{url}%')).first()
    if existing:
        return jsonify({
            "exists": True,
            "message": "Website already in database",
            "scan_id": existing.id
        }), 200
    
    # Run V2 scan
    return scan_url_v2()


# ==================== LEGACY ENDPOINTS (Deprecated) ====================

@app.route('/api/scan', methods=['POST'])
def scan_url():
    """Legacy scan endpoint - redirects to V2."""
    return scan_url_v2()


@app.route('/api/check-content-safety', methods=['POST'])
def check_content_safety():
    """Legacy content safety check - redirects to kids-safety-check."""
    return kids_safety_check()


# ==================== EXISTING ENDPOINTS (Unchanged) ====================

@app.route('/api/check-rating-status', methods=['GET'])
def check_rating_status():
    """Check if user can rate and if they need PIN."""
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
    """Verify admin PIN to allow additional rating."""
    data = request.json
    provided_pin = data.get('pin', '')
    client_ip = request.headers.get('X-Forwarded-For', request.remote_addr)
    
    user_data = user_rating_tracker.get(client_ip, {'count': 0, 'locked': False, 'pin_attempts': 0})
    
    if user_data.get('locked', False):
        return jsonify({
            'success': False, 
            'error': 'Your account is permanently locked due to incorrect PIN attempts.',
            'locked': True
        }), 403
    
    if provided_pin == ADMIN_PIN:
        user_rating_tracker[client_ip] = {
            'count': 0,
            'locked': False,
            'pin_attempts': 0,
            'first_rating_time': user_data.get('first_rating_time', time.time())
        }
        return jsonify({
            'success': True,
            'message': 'PIN verified. You can submit one more rating.'
        })
    else:
        current_attempts = user_data.get('pin_attempts', 0) + 1
        remaining_attempts = MAX_PIN_ATTEMPTS - current_attempts
        
        if current_attempts >= MAX_PIN_ATTEMPTS:
            user_rating_tracker[client_ip] = {
                'count': user_data.get('count', 0),
                'locked': True,
                'pin_attempts': current_attempts,
                'locked_at': time.time(),
                'first_rating_time': user_data.get('first_rating_time', time.time())
            }
            return jsonify({
                'success': False,
                'error': f'Incorrect PIN! You have used all {MAX_PIN_ATTEMPTS} attempts. Your account is now permanently locked.',
                'locked': True,
                'attempts_used': current_attempts,
                'attempts_remaining': 0
            }), 403
        else:
            user_rating_tracker[client_ip] = {
                'count': user_data.get('count', 0),
                'locked': False,
                'pin_attempts': current_attempts,
                'first_rating_time': user_data.get('first_rating_time', time.time())
            }
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
    scan_id = data.get('scan_id')
    rating = data.get('rating')
    comment = data.get('comment')
    visitor_name = data.get('visitor_name', '').strip()
    captcha_id = data.get('captcha_id')
    captcha_answer = data.get('captcha_answer')
    
    client_ip = request.headers.get('X-Forwarded-For', request.remote_addr)
    
    user_data = user_rating_tracker.get(client_ip, {'count': 0, 'locked': False})
    
    if user_data.get('locked', False):
        return jsonify({
            "error": "Your rating privileges have been permanently locked due to security policy violation.",
            "locked": True
        }), 403
    
    if user_data.get('count', 0) >= 1:
        return jsonify({
            "error": "You have already submitted a rating. Enter the admin PIN to submit another.",
            "needs_pin": True
        }), 403
    
    if not visitor_name:
        visitor_name = generate_random_name()
    
    cleanup_expired_captchas()
    
    if not captcha_id or captcha_id not in captcha_store:
        return jsonify({"error": "Captcha expired or invalid. Please refresh the page and try again."}), 400
    
    captcha_data = captcha_store[captcha_id]
    if time.time() - captcha_data['timestamp'] > CAPTCHA_EXPIRY_SECONDS:
        captcha_store.pop(captcha_id, None)
        return jsonify({"error": "Captcha expired. Please refresh the page and try again."}), 400
    
    try:
        if int(captcha_answer) != captcha_data['solution']:
            return jsonify({"error": "Wrong answer! Please try again."}), 400
        captcha_store.pop(captcha_id, None)
    except Exception as e:
        return jsonify({"error": "Invalid captcha format"}), 400

    if rating is None or not (1 <= rating <= 5):
        return jsonify({"error": "Invalid rating"}), 400

    try:
        feedback_entry = Feedback(
            rating=rating,
            comment=comment,
            visitor_name=visitor_name,
            scan_id=scan_id if scan_id else None
        )
        db.session.add(feedback_entry)
        
        if scan_id:
            scan = ScanRecord.query.get(scan_id)
            if scan:
                scan.rating = rating
                scan.comment = comment
                scan.visitor_name = visitor_name
        
        db.session.commit()
        
        current_count = user_data.get('count', 0)
        user_rating_tracker[client_ip] = {
            'count': current_count + 1,
            'locked': user_data.get('locked', False),
            'first_rating_time': user_data.get('first_rating_time', time.time())
        }
        
        all_feedback = Feedback.query.all()
        avg_rating = sum(r.rating for r in all_feedback) / len(all_feedback) if all_feedback else 0.0
        
        return jsonify({
            "success": True, 
            "average_rating": float(f"{avg_rating:.1f}"),
            "total_ratings": len(all_feedback),
            "submitted_comment": comment,
            "visitor_name": visitor_name,
            "ratings_remaining": 0
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/recent-scans', methods=['GET'])
def recent_scans():
    try:
        scans = ScanRecord.query.filter(ScanRecord.url != "General Feedback").order_by(ScanRecord.timestamp.desc()).limit(50).all()
        
        import json
        return jsonify([{
            "id": s.id,
            "url": s.url,
            "grade": s.grade,
            "score": s.performance_score,
            "load_time": s.load_time,
            "visitor_name": s.visitor_name,
            "rating": s.rating,
            "comment": s.comment,
            "timestamp": s.timestamp,
            "scan_method": s.scan_method,
            "kids_safety_rating": s.kids_safety_rating,
            "kids_safety_score": s.kids_safety_score
        } for s in scans])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/recent-feedback', methods=['GET'])
def recent_feedback():
    try:
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
        cutoff = time.time() - 300
        live_ips = [ip for ip, last_time in active_users.items() if last_time > cutoff]
        
        for ip in list(active_users.keys()):
            if active_users[ip] < cutoff - 3600:
                active_users.pop(ip, None)
        
        total_scans = db.session.query(db.func.count(ScanRecord.id)).filter(ScanRecord.url != "General Feedback").scalar() or 0
        total_reviews = db.session.query(db.func.count(Feedback.id)).scalar() or 0
        avg_rating = db.session.query(db.func.avg(Feedback.rating)).scalar() or 0.0
        avg_rating = float(f"{avg_rating:.1f}")

        return jsonify({
            "live_users": len(live_ips) + random.randint(1, 3),
            "total_users": total_scans + 125,
            "total_reviews": total_reviews,
            "average_rating": avg_rating,
            "v2_features": {
                "browser_scan": BROWSER_SCAN_AVAILABLE,
                "kids_safety": KIDS_SAFETY_AVAILABLE
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
