"""
Kids Safety Checker module.
Evaluates websites for child safety using multiple data sources.
"""
import os
import re
import requests
from typing import Dict, Any, List, Optional
from bs4 import BeautifulSoup
from urllib.parse import urlparse

# Google Safe Browsing API endpoint
SAFE_BROWSING_API_URL = "https://safebrowsing.googleapis.com/v4/threatMatches:find"

# Content rating keywords and patterns
ADULT_CONTENT_KEYWORDS = [
    'adult', 'porn', 'xxx', 'sex', 'mature', '18+', 'nsfw', 'nude', 'naked',
    'escort', 'hookup', 'cam', 'live cam', 'webcam', 'dating site',
    'sugar daddy', 'sugar baby', 'onlyfans', 'fansly',
]

SUSPICIOUS_KEYWORDS = [
    'gambling', 'casino', 'betting', 'poker', 'lottery',
    'drugs', 'cannabis', 'marijuana', 'cbd oil',
    'alcohol', 'tobacco', 'vape', 'e-cigarette',
    'violence', 'gore', 'horror', 'terror',
    'hate', 'racist', 'extremist',
    'weapon', 'gun', 'firearm',
]

# Meta tag ratings mapping
META_RATINGS = {
    'safe for kids': 'SAFE_FOR_ALL',
    'general': 'SAFE_FOR_ALL',
    'safe for all': 'SAFE_FOR_ALL',
    'everyone': 'SAFE_FOR_ALL',
    'pg': 'PARENTAL_GUIDANCE',
    'parental guidance': 'PARENTAL_GUIDANCE',
    'pg-13': 'TEEN',
    'teen': 'TEEN',
    'mature': 'MATURE',
    'adult': 'MATURE',
    'restricted': 'MATURE',
    'r': 'MATURE',
    'nc-17': 'MATURE',
    'xxx': 'BLOCKED',
    'rtn': 'BLOCKED',
    'blocked': 'BLOCKED',
}

# RTA label pattern
RTA_LABEL_PATTERN = re.compile(r'rta-\d{4}-\d{4}-\d{4}-\d{4}-rta', re.IGNORECASE)


class KidsSafetyChecker:
    """Checks website safety for children."""
    
    def __init__(self):
        self.api_key = os.getenv('GOOGLE_SAFE_BROWSING_API_KEY')
    
    def check(self, url: str, html_content: str = None, headers: dict = None) -> Dict[str, Any]:
        """
        Comprehensive kids safety check.
        Returns safety rating and confidence score.
        """
        results = {
            'rating': 'UNKNOWN',
            'score': 50,
            'confidence': 'low',
            'sources': [],
            'warnings': [],
            'details': {}
        }
        
        domain = urlparse(url).netloc.lower()
        
        # 1. Check Google Safe Browsing API
        safe_browsing_result = self._check_safe_browsing_api(url)
        results['details']['safe_browsing'] = safe_browsing_result
        if safe_browsing_result.get('threats_found'):
            results['rating'] = 'BLOCKED'
            results['score'] = 0
            results['confidence'] = 'high'
            results['sources'].append('google_safe_browsing')
            results['warnings'].extend(safe_browsing_result.get('threats', []))
            return results
        elif safe_browsing_result.get('checked'):
            results['sources'].append('google_safe_browsing')
            results['score'] += 20
        
        # 2. Check domain name for adult keywords
        domain_check = self._check_domain_name(domain)
        results['details']['domain_check'] = domain_check
        if domain_check.get('adult_keywords_found'):
            results['rating'] = 'MATURE'
            results['score'] -= 30
            results['sources'].append('domain_analysis')
            results['warnings'].append(f"Adult keywords in domain: {', '.join(domain_check['keywords'])}")
        
        # 3. Analyze meta tags if HTML content provided
        if html_content:
            meta_analysis = self._analyze_meta_tags(html_content)
            results['details']['meta_tags'] = meta_analysis
            
            if meta_analysis.get('rating'):
                results['rating'] = meta_analysis['rating']
                results['sources'].append('meta_tags')
                results['score'] = self._rating_to_score(meta_analysis['rating'])
            
            if meta_analysis.get('rta_label'):
                results['rating'] = 'MATURE'
                results['score'] = min(results['score'], 25)
                results['sources'].append('rta_label')
                results['warnings'].append('RTA (Restricted to Adults) label detected')
            
            # 4. Content keyword analysis
            content_analysis = self._analyze_content(html_content)
            results['details']['content_analysis'] = content_analysis
            
            if content_analysis.get('adult_keywords_count', 0) > 3:
                results['rating'] = 'MATURE'
                results['score'] -= 20
                results['sources'].append('content_analysis')
                results['warnings'].append('Adult content keywords detected in page')
            elif content_analysis.get('suspicious_keywords_count', 0) > 5:
                results['rating'] = 'TEEN'
                results['score'] -= 10
                results['sources'].append('content_analysis')
                results['warnings'].append('Potentially inappropriate content detected')
        
        # 5. Determine final rating if not set
        if results['rating'] == 'UNKNOWN':
            results['rating'] = self._score_to_rating(results['score'])
        
        # Set confidence based on number of sources
        if len(results['sources']) >= 3:
            results['confidence'] = 'high'
        elif len(results['sources']) >= 2:
            results['confidence'] = 'medium'
        else:
            results['confidence'] = 'low'
        
        # Clamp score
        results['score'] = max(0, min(100, results['score']))
        
        return results
    
    def _check_safe_browsing_api(self, url: str) -> Dict[str, Any]:
        """Check URL against Google Safe Browsing API."""
        if not self.api_key:
            return {'checked': False, 'reason': 'No API key configured'}
        
        try:
            payload = {
                "client": {
                    "clientId": "fast-scanner",
                    "clientVersion": "2.0.0"
                },
                "threatInfo": {
                    "threatTypes": [
                        "MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE",
                        "POTENTIALLY_HARMFUL_APPLICATION", "THREAT_TYPE_UNSPECIFIED"
                    ],
                    "platformTypes": ["ANY_PLATFORM"],
                    "threatEntryTypes": ["URL"],
                    "threatEntries": [{"url": url}]
                }
            }
            
            api_url = f"{SAFE_BROWSING_API_URL}?key={self.api_key}"
            response = requests.post(api_url, json=payload, timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                matches = data.get('matches', [])
                
                if matches:
                    threats = [m.get('threatType', 'Unknown') for m in matches]
                    return {
                        'checked': True,
                        'threats_found': True,
                        'threats': threats
                    }
                else:
                    return {
                        'checked': True,
                        'threats_found': False
                    }
            else:
                return {
                    'checked': False,
                    'reason': f'API error: {response.status_code}'
                }
                
        except Exception as e:
            return {
                'checked': False,
                'reason': str(e)
            }
    
    def _check_domain_name(self, domain: str) -> Dict[str, Any]:
        """Check domain name for suspicious keywords."""
        domain_lower = domain.lower()
        found_keywords = []
        
        for keyword in ADULT_CONTENT_KEYWORDS:
            if keyword in domain_lower:
                found_keywords.append(keyword)
        
        return {
            'adult_keywords_found': len(found_keywords) > 0,
            'keywords': found_keywords
        }
    
    def _analyze_meta_tags(self, html_content: str) -> Dict[str, Any]:
        """Analyze meta tags for content rating information."""
        soup = BeautifulSoup(html_content, 'html.parser')
        result = {
            'rating': None,
            'rta_label': False,
            'description': '',
            'keywords': []
        }
        
        # Check rating meta tag
        rating_meta = soup.find('meta', attrs={'name': 'rating'})
        if rating_meta:
            content = rating_meta.get('content', '').lower()
            result['rating'] = META_RATINGS.get(content)
        
        # Check RTA label
        rta_meta = soup.find('meta', attrs={'name': 'RATING'})
        if rta_meta:
            content = str(rta_meta)
            if RTA_LABEL_PATTERN.search(content):
                result['rta_label'] = True
        
        # Check for RTA in any meta
        for meta in soup.find_all('meta'):
            content = str(meta.get('content', ''))
            if RTA_LABEL_PATTERN.search(content):
                result['rta_label'] = True
                break
        
        # Check description for keywords
        desc_meta = soup.find('meta', attrs={'name': 'description'})
        if desc_meta:
            result['description'] = desc_meta.get('content', '')
        
        # Check keywords
        keywords_meta = soup.find('meta', attrs={'name': 'keywords'})
        if keywords_meta:
            keywords = keywords_meta.get('content', '').lower().split(',')
            result['keywords'] = [k.strip() for k in keywords]
        
        return result
    
    def _analyze_content(self, html_content: str) -> Dict[str, Any]:
        """Analyze page content for inappropriate keywords."""
        text = BeautifulSoup(html_content, 'html.parser').get_text().lower()
        
        adult_count = 0
        for keyword in ADULT_CONTENT_KEYWORDS:
            adult_count += len(re.findall(r'\b' + re.escape(keyword) + r'\b', text))
        
        suspicious_count = 0
        for keyword in SUSPICIOUS_KEYWORDS:
            suspicious_count += len(re.findall(r'\b' + re.escape(keyword) + r'\b', text))
        
        return {
            'adult_keywords_count': adult_count,
            'suspicious_keywords_count': suspicious_count,
        }
    
    def _rating_to_score(self, rating: str) -> int:
        """Convert rating to numeric score."""
        scores = {
            'SAFE_FOR_ALL': 95,
            'PARENTAL_GUIDANCE': 75,
            'TEEN': 50,
            'MATURE': 20,
            'BLOCKED': 0,
            'UNKNOWN': 50
        }
        return scores.get(rating, 50)
    
    def _score_to_rating(self, score: int) -> str:
        """Convert numeric score to rating."""
        if score >= 90:
            return 'SAFE_FOR_ALL'
        elif score >= 70:
            return 'PARENTAL_GUIDANCE'
        elif score >= 40:
            return 'TEEN'
        elif score >= 10:
            return 'MATURE'
        else:
            return 'BLOCKED'
    
    def get_rating_display(self, rating: str) -> Dict[str, str]:
        """Get display information for a rating."""
        displays = {
            'SAFE_FOR_ALL': {
                'label': 'Safe for All Ages',
                'emoji': '👶',
                'color': '#22c55e',
                'description': 'Appropriate for all ages'
            },
            'PARENTAL_GUIDANCE': {
                'label': 'Parental Guidance',
                'emoji': '👪',
                'color': '#84cc16',
                'description': 'Recommended with supervision'
            },
            'TEEN': {
                'label': 'Teen (13+)',
                'emoji': '🧑',
                'color': '#eab308',
                'description': 'Suitable for teenagers'
            },
            'MATURE': {
                'label': 'Mature (17+)',
                'emoji': '🔞',
                'color': '#f97316',
                'description': 'Adult content, not for children'
            },
            'BLOCKED': {
                'label': 'Blocked',
                'emoji': '🚫',
                'color': '#ef4444',
                'description': 'Known harmful/illegal content'
            },
            'UNKNOWN': {
                'label': 'Unknown',
                'emoji': '❓',
                'color': '#6b7280',
                'description': 'Safety rating unavailable'
            }
        }
        return displays.get(rating, displays['UNKNOWN'])


# Convenience function
def check_kids_safety(url: str, html_content: str = None, headers: dict = None) -> Dict[str, Any]:
    """Quick check function for kids safety."""
    checker = KidsSafetyChecker()
    return checker.check(url, html_content, headers)
