# © 2025 Idaho National Laboratory. All rights reserved.
import os
from datetime import date, timedelta
import json
import feedparser
import pandas as pd
import pickle
import time
import re
import html
from bs4 import BeautifulSoup
from spellchecker import SpellChecker
from newspaper import Article
from dateutil import parser as date_parser
from urllib.parse import urlparse
from typing import Union, Tuple, Optional


abbreviation_map = {
    # Cybersecurity terms
    "apt": "advanced persistent threat",
    "cisa": "cybersecurity and infrastructure security agency",
    "cve": "common vulnerabilities and exposures",
    "c2": "command and control",
    "c2s": "command and control systems",
    "ttp": "tactics techniques and procedures",
    "mitre": "mitre corporation",
    "tldr": "too long; didn't read",
    "ioc": "indicator of compromise",
    "edr": "endpoint detection and response",
    "xdr": "extended detection and response",
    "siem": "security information and event management",
    "soc": "security operations center",
    "ids": "intrusion detection system",
    "ips": "intrusion prevention system",
    "rbac": "role based access control",
    "mac": "mandatory access control",
    "dac": "discretionary access control",
    "saml": "security assertion markup language",
    "oauth": "open authorization",
    "mfa": "multi factor authentication",
    "tfa": "two factor authentication",
    "pk": "public key",
    "pki": "public key infrastructure",
    "tls": "transport layer security",
    "ssl": "secure sockets layer",
    "ddos": "distributed denial of service",
    "dos": "denial of service",
    "api": "application programming interface",
    "spoof": "spoofing",
    "phish": "phishing",
    "rce": "remote code execution",
    "lpe": "local privilege escalation",
    "sqli": "sql injection",
    "xss": "cross site scripting",
    "mitm": "man in the middle",
    "zero day": "zero day vulnerability",
    "0day": "zero day vulnerability",
    "cvss": "common vulnerability scoring system",

    # DOE / Infrastructure terms
    "doe": "department of energy",
    "inl": "idaho national laboratory",
    "ot": "operational technology",
    "it": "information technology",
    "ics": "industrial control systems",
    "scada": "supervisory control and data acquisition",
    "hmi": "human machine interface",
    "plc": "programmable logic controller",
    "pnnl": "pacific northwest national laboratory",
    "ferc": "federal energy regulatory commission",
    "nrc": "nuclear regulatory commission",
    "nipp": "national infrastructure protection plan",
    "nist": "national institute of standards and technology",
    "nvd": "national vulnerability database",
    "esf": "emergency support function",
    "cps": "cyber physical system",
    "cr": "critical resource",
    "ci": "critical infrastructure",
    "scc": "sector coordinating council",
    "ics-cert": "industrial control systems cyber emergency response team",
    "sltt": "state local tribal and territorial",
    "slttg": "state local tribal and territorial governments",
    "res": "resilience",
    "resiliency": "resilience",
    "r&d": "research and development",

    # Generic tech terms (for cleaning)
    "ai": "artificial intelligence",
    "ml": "machine learning",
    "llm": "large language model",
    "nlp": "natural language processing",
    "gpu": "graphics processing unit",
    "vm": "virtual machine",
    "cli": "command line interface",
    "gui": "graphical user interface",
    "json": "javascript object notation",
    "xml": "extensible markup language",
    "ip": "internet protocol",
    "dns": "domain name system",
}

# Constants
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, "data")
SOURCES_FILE = os.path.join(SCRIPT_DIR, "sources.json")

# -------------------------------
# CLEAN TEXT UTILITIES
# -------------------------------

spell = SpellChecker(distance=1)

def expand_abbreviations(text, abbr_map):
    words = text.split()
    return " ".join([abbr_map.get(word.lower(), word) for word in words])

def clean_text(text, abbr_map=None, spell_check=False, xml_clean=False):
    # Decode HTML/XML entities
    #print ("******** Original: " + text)
    text = html.unescape(text)

    #print ("******** html.unescape: " + text)
   
    # Try to parse HTML/XML content
    try:
        # Use 'lxml-xml' for XML content, otherwise 'html.parser'.
        # Note: 'lxml' needs to be installed (pip install lxml).
        parser = "lxml-xml" if xml_clean else "html.parser"
        soup = BeautifulSoup(text, parser)
        text = soup.get_text(separator=" ", strip=True)
    except Exception:
        # Fallback to the other parser if the first one fails
        try:
            soup = BeautifulSoup(text, "html.parser")
            text = soup.get_text(separator=" ", strip=True)
        except Exception as e:
            # If parsing fails, we proceed with the unescaped text.
            print(f"[!] BeautifulSoup parsing failed: {e}")

    # Whitespace normalize
    text = re.sub(r"\s+", " ", text).strip()

    #print ("Whitespace normalize: " + text)
    # Expand abbreviations
    if abbr_map:
        text = expand_abbreviations(text, abbr_map)
    
    #print ("Expand abbreviations: " + text)

    # Optional spell check (use with care)
    if spell_check:
        corrected = []
        for word in text.split():
            if word.lower() not in spell:
                suggestion = spell.correction(word)
                corrected.append(suggestion if suggestion else word)
            else:
                corrected.append(word)
        text = " ".join(corrected)
    #print ("spell_check: " + text)

    return text


# -------------------------------
# ARTICLE FETCHING
# -------------------------------

def fetch_full_article(
    url: str,
    abbr_map=None,
    spell_check=False,
    xml_clean=False,
    verbose: bool = False,
    return_raw: bool = False
) -> Union[str, Tuple[str, str]]:
    try:
        article = Article(url)
        article.download()
        article.parse()
        raw_text = article.text.strip()

        # print(raw_text)
        
        if len(raw_text) < 200:
            raise ValueError("Too short or failed to extract main content.")
        cleaned = clean_text(raw_text, abbr_map=abbr_map, spell_check=spell_check, xml_clean=xml_clean)

        return (cleaned, raw_text) if return_raw else cleaned
    except Exception as e:
        if verbose:
            print(f"    [!] Failed to fetch article at {url}: {e}")
        return ("", "") if return_raw else ""

def extract_published_date(entry, verbose: bool = False) -> date:
    possible_fields = ["published", "updated", "pubDate", "dc:date"]
    for field in possible_fields:
        raw = entry.get(field)
        if raw:
            try:
                return date_parser.parse(raw).date()
            except Exception as e:
                if verbose:
                    print(f"    [!] Failed to parse {field}: {e}")
                continue
    if verbose:
        print("    [!] Could not parse publish date; defaulting to today.")
    return date.today()

# -------------------------------
# MAIN SCRAPER (LOOP BY DAY)
# -------------------------------

def scrape_rss_articles(
    sources_file: str = "sources.json",
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    save_pickle: bool = True,
    data_dir: str = "data",
    delay_between_requests: float = 1.0,
    verbose: bool = False,
    recollect: bool = False,
    abbr_map: Optional[dict] = None,
    spell_check: bool = False,
    xml_clean: bool = True
) -> pd.DataFrame:
    today = date.today()
    start_date = start_date or today
    end_date = end_date or today

    os.makedirs(data_dir, exist_ok=True)
    all_dfs = []

    with open(sources_file, "r") as f:
        sources = json.load(f)

    day = start_date
    while day <= end_date:
        date_str = day.strftime("%Y%m%d")
        pickle_path = os.path.join(data_dir, f"news_{date_str}.pkl")

        if not recollect and os.path.exists(pickle_path):
            if verbose:
                print(f"[✓] Found existing data for {day}. Loading...")
            with open(pickle_path, "rb") as f:
                df_day = pickle.load(f)
            all_dfs.append(df_day)
            day += timedelta(days=1)
            continue

        if verbose:
            print(f"[ ] Scraping RSS for {day}...")

        daily_articles = []

        for source_name, source_data in sources.items():
            for rss_url in source_data.get("rss", []):
                if verbose:
                    print(f"  → Fetching from {source_name}: {rss_url}")
                feed = feedparser.parse(rss_url)

                for entry in feed.entries:
                    published_date = extract_published_date(entry, verbose)
                    if published_date != day:
                        continue

                    # Use link, fallback to guid
                    url = entry.get("link") or entry.get("guid") or entry.get("id", "")
                    if not url.startswith("http"):
                        continue

                    # Fetch full article text from the link
                    article_text = ""
                    if url:
                        article_text = fetch_full_article(
                            url,
                            abbr_map=abbr_map,
                            spell_check=spell_check,
                            xml_clean=xml_clean,
                            verbose=verbose,
                            return_raw=False
                        )
                        time.sleep(delay_between_requests)

                    # Combine description and summary if both exist
                    summary_parts = []
                    if "description" in entry:
                        summary_parts.append(entry["description"])
                    if "summary" in entry and entry["summary"] != entry.get("description"):
                        summary_parts.append(entry["summary"])

                    summary_raw = "\n".join(summary_parts)
                    summary_clean = clean_text(
                        summary_raw,
                        abbr_map=abbr_map,
                        spell_check=spell_check,
                        xml_clean=xml_clean
                    )

                    article = {
                        "source": source_name,
                        "title": entry.get("title", ""),
                        "link": url,
                        "published": published_date,
                        "summary": summary_clean,
                        "article": article_text,
                    }

                    daily_articles.append(article)

        df_day = pd.DataFrame(daily_articles)
        if save_pickle:
            with open(pickle_path, "wb") as f:
                pickle.dump(df_day, f)
            if verbose:
                print(f"[→] Saved {len(df_day)} articles to {pickle_path}")

        all_dfs.append(df_day)
        day += timedelta(days=1)

    final_df = pd.concat(all_dfs, ignore_index=True)
    if verbose:
        print(f"\n[✓] Final dataset: {len(final_df)} articles from {start_date} to {end_date}")
    return final_df

def daily_news_scrape():
    yesterday = date.today() - timedelta(days=1)
    start_date = yesterday
    end_date = yesterday

    print(f"Scraping and loading data for dates: {start_date} to {end_date}...")
    df = scrape_rss_articles(
        sources_file=SOURCES_FILE,
        start_date=start_date,
        end_date=end_date,
        save_pickle=True,
        data_dir=DATA_DIR,
        verbose=True,
        recollect=False,
        abbr_map=abbreviation_map,
        spell_check=False,
        xml_clean=True
    )

    print(f"Scraped {len(df)} articles.")

if __name__ == "__main__":
    daily_news_scrape()
