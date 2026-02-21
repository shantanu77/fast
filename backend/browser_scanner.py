"""
Browser-based website scanner using Playwright.
Simulates real browser behavior for accurate website analysis.
"""
import asyncio
import time
import re
from typing import Dict, Any, Optional
from urllib.parse import urlparse

try:
    from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout
except ImportError:
    async_playwright = None
    PlaywrightTimeout = Exception

import requests
from bs4 import BeautifulSoup


# Real browser headers to mimic Chrome
BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0',
}


class BrowserScanner:
    """Scanner that uses real browser automation for accurate results."""
    
    def __init__(self):
        self.use_playwright = async_playwright is not None
        
    async def scan(self, url: str) -> Dict[str, Any]:
        """
        Scan a website using browser automation.
        Falls back to legacy requests if Playwright fails.
        """
        if self.use_playwright:
            try:
                return await self._playwright_scan(url)
            except Exception as e:
                print(f"Playwright scan failed for {url}: {e}")
                return self._legacy_scan(url)
        else:
            return self._legacy_scan(url)
    
    async def _playwright_scan(self, url: str) -> Dict[str, Any]:
        """Perform browser-based scan using Playwright."""
        start_time = time.time()
        
        async with async_playwright() as p:
            # Launch browser with realistic settings
            browser = await p.chromium.launch(
                headless=True,
                args=[
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--single-process',
                    '--disable-gpu'
                ]
            )
            
            # Create context with real browser fingerprint
            context = await browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent=BROWSER_HEADERS['User-Agent'],
                extra_http_headers={
                    'Accept': BROWSER_HEADERS['Accept'],
                    'Accept-Language': BROWSER_HEADERS['Accept-Language'],
                    'Accept-Encoding': BROWSER_HEADERS['Accept-Encoding'],
                    'Sec-Fetch-Dest': BROWSER_HEADERS['Sec-Fetch-Dest'],
                    'Sec-Fetch-Mode': BROWSER_HEADERS['Sec-Fetch-Mode'],
                    'Sec-Fetch-Site': BROWSER_HEADERS['Sec-Fetch-Site'],
                    'Sec-Fetch-User': BROWSER_HEADERS['Sec-Fetch-User'],
                    'Upgrade-Insecure-Requests': BROWSER_HEADERS['Upgrade-Insecure-Requests'],
                }
            )
            
            # Block unnecessary resources to speed up scanning
            await context.route(
                "**/*",
                lambda route, request: (
                    route.abort() if request.resource_type in ['image', 'media', 'font'] 
                    else route.continue_()
                )
            )
            
            page = await context.new_page()
            
            # Capture navigation timing
            navigation_start = time.time()
            
            try:
                response = await page.goto(
                    url, 
                    wait_until='networkidle',
                    timeout=30000
                )
                
                # Wait a bit for JavaScript to execute
                await page.wait_for_timeout(2000)
                
                navigation_end = time.time()
                
                # Get page metrics
                metrics = await page.evaluate('''() => {
                    const perf = performance.timing;
                    const nav = performance.getEntriesByType('navigation')[0];
                    return {
                        domContentLoaded: perf.domContentLoadedEventEnd - perf.navigationStart,
                        loadComplete: perf.loadEventEnd - perf.navigationStart,
                        firstPaint: performance.getEntriesByType('paint').find(p => p.name === 'first-paint')?.startTime || 0,
                        firstContentfulPaint: performance.getEntriesByType('paint').find(p => p.name === 'first-contentful-paint')?.startTime || 0,
                        totalRequests: performance.getEntriesByType('resource').length,
                        transferSize: nav ? nav.transferSize : 0,
                        encodedBodySize: nav ? nav.encodedBodySize : 0,
                    };
                }''')
                
                # Get page content
                content = await page.content()
                title = await page.title()
                final_url = page.url
                
                # Get console errors
                console_errors = []
                # Note: Console messages would need event listener setup before navigation
                
                # Get all links
                links = await page.eval_on_selector_all('a[href]', 'elements => elements.map(e => e.href)')
                
                # Count elements
                element_counts = await page.evaluate('''() => {
                    return {
                        images: document.images.length,
                        scripts: document.scripts.length,
                        stylesheets: document.styleSheets.length,
                        iframes: document.querySelectorAll('iframe').length,
                        forms: document.querySelectorAll('form').length,
                        inputs: document.querySelectorAll('input').length,
                    };
                }''')
                
                await browser.close()
                
                # Calculate load time in ms
                load_time_ms = round((navigation_end - navigation_start) * 1000, 2)
                
                # Parse content with BeautifulSoup for additional analysis
                soup = BeautifulSoup(content, 'html.parser')
                
                # Analyze bugs/issues
                bugs = self._analyze_bugs(soup, response.status if response else 0, metrics)
                
                return {
                    'success': True,
                    'scan_method': 'browser',
                    'url': final_url,
                    'original_url': url,
                    'status_code': response.status if response else 0,
                    'title': title,
                    'load_time_ms': load_time_ms,
                    'content_length': len(content),
                    'metrics': {
                        'dom_content_loaded': metrics.get('domContentLoaded', 0),
                        'load_complete': metrics.get('loadComplete', 0),
                        'first_paint': round(metrics.get('firstPaint', 0), 2),
                        'first_contentful_paint': round(metrics.get('firstContentfulPaint', 0), 2),
                        'total_requests': metrics.get('totalRequests', 0),
                        'transfer_size_bytes': metrics.get('transferSize', 0),
                        'encoded_body_size_bytes': metrics.get('encodedBodySize', 0),
                    },
                    'element_counts': element_counts,
                    'links_found': len(links),
                    'bugs': bugs,
                    'html_content': content[:50000],  # Limit content size
                    'headers': dict(response.headers) if response else {},
                }
                
            except PlaywrightTimeout:
                await browser.close()
                raise Exception("Page load timeout - website may be slow or blocking automation")
            except Exception as e:
                await browser.close()
                raise e
    
    def _legacy_scan(self, url: str) -> Dict[str, Any]:
        """Fallback legacy scan using requests."""
        start_time = time.time()
        
        try:
            response = requests.get(
                url, 
                timeout=10, 
                allow_redirects=True, 
                verify=False,
                headers=BROWSER_HEADERS
            )
            end_time = time.time()
            
            load_time_ms = round((end_time - start_time) * 1000, 2)
            soup = BeautifulSoup(response.text, 'html.parser')
            
            bugs = self._analyze_bugs(soup, response.status_code, {})
            
            return {
                'success': True,
                'scan_method': 'legacy',
                'url': response.url,
                'original_url': url,
                'status_code': response.status_code,
                'title': soup.title.string if soup.title else "No Title Found",
                'load_time_ms': load_time_ms,
                'content_length': len(response.content),
                'metrics': {
                    'dom_content_loaded': 0,
                    'load_complete': load_time_ms,
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
                'html_content': response.text[:50000],
                'headers': dict(response.headers),
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'scan_method': 'legacy',
            }
    
    def _analyze_bugs(self, soup: BeautifulSoup, status_code: int, metrics: Dict) -> list:
        """Analyze page for bugs and issues."""
        bugs = []
        
        # HTTP errors
        if status_code >= 400:
            bugs.append(f"HTTP Error: {status_code}")
        
        # Missing viewport meta tag
        if not soup.find('meta', attrs={'name': 'viewport'}):
            bugs.append("Missing viewport meta tag (Not Mobile Friendly)")
        
        # Missing H1 tag
        if not soup.find('h1'):
            bugs.append("Missing H1 tag (SEO issue)")
        
        # Missing description
        if not soup.find('meta', attrs={'name': 'description'}):
            bugs.append("Missing meta description (SEO issue)")
        
        # Missing charset
        if not soup.find('meta', charset=True) and not soup.find('meta', attrs={'http-equiv': 'Content-Type'}):
            bugs.append("Missing charset declaration")
        
        # No alt text on images
        images_without_alt = soup.find_all('img', alt=False)
        if images_without_alt:
            bugs.append(f"{len(images_without_alt)} images missing alt text (Accessibility issue)")
        
        # Inline styles (performance issue)
        inline_styles = soup.find_all(style=True)
        if len(inline_styles) > 10:
            bugs.append(f"{len(inline_styles)} elements with inline styles (Consider using CSS classes)")
        
        # Slow load time warning
        load_time = metrics.get('load_complete', 0)
        if load_time > 5000:
            bugs.append(f"Very slow load time ({load_time/1000:.1f}s) - Consider optimization")
        elif load_time > 3000:
            bugs.append(f"Slow load time ({load_time/1000:.1f}s) - Could be faster")
        
        return bugs


# Synchronous wrapper for Flask
def scan_website(url: str) -> Dict[str, Any]:
    """Synchronous wrapper for browser scan."""
    scanner = BrowserScanner()
    try:
        return asyncio.run(scanner.scan(url))
    except Exception as e:
        print(f"Async scan failed: {e}")
        # Final fallback
        return scanner._legacy_scan(url)
