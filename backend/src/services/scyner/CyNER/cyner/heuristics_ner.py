import os, re
from re import finditer

from .entity_extraction import EntityExtraction
from .entity import Entity

ner_data_dir = os.path.dirname(os.path.abspath(__file__))
ner_data_dir = os.path.join(ner_data_dir, 'ner_regex_data')

city_state_short_path = ner_data_dir + "/city_state_short.txt"
city_state_full_path = ner_data_dir + "/city_state_full.txt"
tactic_id_path = ner_data_dir + "/tactic_id.txt"
tactic_name_path = ner_data_dir + "/tactic_name.txt"
techs_id_path = ner_data_dir + "/techs_id.txt"
techs_name_path = ner_data_dir + "/techs_name.txt"

with open(city_state_short_path, 'r', encoding='utf-8') as file:
    city_state_short = file.read()
with open(city_state_full_path, 'r', encoding='utf-8') as file:
    city_state_full = file.read()
with open(tactic_id_path, 'r', encoding='utf-8') as file:
    tactic_id = file.read()
with open(tactic_name_path, 'r', encoding='utf-8') as file:
    tactic_name = file.read()
with open(techs_id_path, 'r', encoding='utf-8') as file:
    techs_id = file.read()
with open(techs_name_path, 'r', encoding='utf-8') as file:
    techs_name = file.read()


class HeuristicsNER(EntityExtraction):
    """
    Cybersecurity entity extraction using Heuristics
    Most are based on the paper "Cybersecurity Named Entity Recognition Using Multi-Modal Ensemble Learning"
    https://ieeexplore.ieee.org/document/9051704
    URL - https://stackoverflow.com/a/17773849/5131287
    IPv4 - https://stackoverflow.com/a/36760050/5131287
    IPv6 - https://stackoverflow.com/a/17871737/5131287
    """
    def __init__(self, config):
        super().__init__(config)

        self.patterns = {
            
            'item':[# Email
                    r'[a-zA-Z][_a-zA-Z0-9-.]+@[a-zA-Z0-9-]+\.[a-zA-Z]{2,}',
                    # Filename
                    r'[A-Za-z0-9-_\.]+\.(txt|php|exe|dll|bat|sys|htm|html|js|jar|jpg|png|vb|scr|pif|chm|zip|rar|cab|pds|doc|docx|ppt|pptx|xls|xlsx|swf|gif)',
                      r'^[a-zA-Z0-9](?:[a-zA-Z0-9 ._-]*[a-zA-Z0-9])?\.[a-zA-Z0-9_-]+$',
                      r'^([A-Za-z]{1}[A-Za-z\\d_]*\\.)+[A-Za-z][A-Za-z\\d_]*$',
                    # SHA256 
                    r'[a-f0-9]{64}|[A-F0-9]{64}',
                    # SHA1 
                    r'[a-f0-9]{40}|[A-F0-9]{40}',
                    #'Hash 
                    r'([a-fA-F\d]{32})',
                    #CVE 
                    r'CVE—[0-9]{4}—[0-9]{4,6}',
                    #URL
                    r'(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})', r"https?:[a-zA-Z0-9_.+-/#~]+ ",
                    #Protocol
                    r'HTTP|SMS|HTTPS|AES'],
            'location': [# Filepath
                         r'[a-zA-Z]:\\([0-9a-zA-Z]+)', r'(\/[^\s\n]+)+',
                         # Domain
                         r'^(((([A-Za-z0-9]+){1,63}\.)|(([A-Za-z0-9]+(\-)+[A-Za-z0-9]+){1,63}\.))+){1,255}$',
                         r'(//|\s+|^)(\w\.|\w[A-Za-z0-9-]{0,61}\w\.){1,3}[A-Za-z]{2,6}',
                         # IPv4
                         r'^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)(\.(?!$)|$)){4}$',
                         # IPv6
                         r'(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))',
                         # IPAddress
                         r'^\d{1,3}\[.]\d{1,3}\.\d{1,3}\.\d{1,3}$',
                         # city, state in US
                         city_state_short, 
                         city_state_full],
            'date': [# !!! Regex not picking up dates with characters beside them, e.g., "|April 2024|", "April 2024."
                     # Regex also picked up "60870-5-104". 
                     # Revisit some of the regex that Scott came up with
                     # M/d/yy, MM/dd/yy, dd/MM/yyyy, etc.
                     r'\d+/\d+/\d+',
                     # M/d/yy h:mm a, etc.
                     r'\d+/\d+/\d+ \d+:\d+ [AaPp][Mm]',
                     # dd/MM/yyyy h:mm:ss a
                     r'\d+/\d+/\d+ \d+:\d+:\d+ [AaPp][Mm]',
                     # dd/MM/yyyy h:mm:ss 
                     r'\d+/\d+/\d+ \d+:\d+:\d+',
                     # d/MMM/yyyy H:mm:ss Z
                     # Not sure if Z is always going to be 4 digits
                     r'\d{1,2}/(Jan|Feb|Mar|Apr|May|June|July|Aug|Sept|Oct|Nov|Dec)/\d{4} \d+:\d+:\d+ [+-]\d+',
                     # dd/MMM/yy h:mm a
                     r'\d{1,2}/(Jan|Feb|Mar|Apr|May|June|July|Aug|Sept|Oct|Nov|Dec)/\d{2} \d+:\d+ [AaPp][Mm]',
                     # M-d-yy, MM-dd-yy, dd-MM-yyyy, etc.
                     r'\d+-\d+-\d+',
                     # yyyy-MM-ddXXX
                     r'\d+-\d+-\d+[+-]\d+:\d+',
                     # MM-dd-yy h:mm a, etc.
                     r'\d+-\d+-\d+ \d+:\d+ [AaPp][Mm]',
                     # MM-dd-yyyy h:mm:ss a
                     r'\d+-\d+-\d+ \d+:\d+:\d+ [AaPp][Mm]',
                     # yyyy-MM-dd HH:mm:ss.S
                     r'\d+-\d+-\d+ \d+:\d+:\d+.\d+',
                     # MMM dd, yyyy
                     r'(Jan|Feb|Mar|Apr|May|June|July|Aug|Sept|Oct|Nov|Dec) \d{1,2}, \d{4}',
                     # MMM d, yyyy h:mm:ss a, etc.
                     r'(Jan|Feb|Mar|Apr|May|June|July|Aug|Sept|Oct|Nov|Dec) \d{1,2}, \d{4} \d+:\d+:\d+ AM|PM|am|pm',
                     # MMM dd yyyy
                     r'(Jan|Feb|Mar|Apr|May|June|July|Aug|Sept|Oct|Nov|Dec) \d{1,2} \d{4}',
                     # Month dd, yyyy
                     r'(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}',
                     # Month yyyy
                     r'(January|February|March|April|May|June|July|August|September|October|November|December) \d{4}',
                     # Month dd yyyy
                     r'(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2} \d{4}',
                     # Day MMM dd
                     r'(Mon|Tues|Wed|Thurs|Fri|Sat|Sun) (Jan|Feb|Mar|Apr|May|June|July|Aug|Sept|Oct|Nov|Dec) \d{1,2}',
                     # Day, Month dd, yyyy
                     r'(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), (January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}',
                     # EEEE, MMMM d, yyyy h:mm:ss a z, etc
                     r'(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), (January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4} \d+:\d+:\d+ [aApP][mM] [A-Z]+',
                     # EEE MMM dd HH:mm:ss z yyyy
                     r'(Mon|Tues|Wed|Thurs|Fri|Sat|Sun) (Jan|Feb|Mar|Apr|May|June|July|Aug|Sept|Oct|Nov|Dec) \d{1,2} \d+:\d+:\d+ [A-Z]+ \d{4}',
                     # EEE, d MMM yyyy HH:mm:ss Z
                     r'(Mon|Tues|Wed|Thurs|Fri|Sat|Sun), \d{1,2} (Jan|Feb|Mar|Apr|May|June|July|Aug|Sept|Oct|Nov|Dec) \d{4} \d+:\d+:\d+ [+-]\d+',
                     # d MMM yyyy HH:mm:ss Z
                     r'\d{1,2} (Jan|Feb|Mar|Apr|May|June|July|Aug|Sept|Oct|Nov|Dec) \d{4} \d+:\d+:\d+ [+-]\d+',
                     # MMM.dd.yyyy
                     r'(Jan|Feb|Mar|Apr|May|June|July|Aug|Sept|Oct|Nov|Dec).\d{1,2}.\d{4}',
                     # Day MMM dd timestamp
                     r'(Mon|Tues|Wed|Thurs|Fri|Sat|Sun) (Jan|Feb|Mar|Apr|May|June|July|Aug|Sept|Oct|Nov|Dec) \d{1,2}',
                     # dd MMM
                     r'\d{1,2} (January|February|March|April|May|June|July|August|September|October|November|December)',
                     # dd MMM yyyy
                     r'\d{1,2} (January|February|March|April|May|June|July|August|September|October|November|December) \d{4}',
                     # times at AM/PM
                     r'\d{1,2}:\d{1,2} [AaPp][Mm]',
                     r'Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday',
                     r'yesterday|tomorrow|today'],
            'technique': [r'(T[0-9]{4})',
                          r'(t[0-9]{4})',
                            techs_id,
                            techs_name],
            # Need to ask Scott about attack tactics and phases
            'tactic': [r'(TA[0-9]{4})',
                      r'(tA[0-9]{4})',
                      tactic_id,
                      tactic_name],
            'org': [# company names
                    #r"[A-Z][a-zA-Z]+(?:\\s[A-Z][a-zA-Z]+)*(?:\\s(?:LLC|Inc|Corporation|Corp|Company|Co|Ltd|Group|Partners|Consulting|Systems))",
                    r'\b(?:[A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*)\s+(?:Inc\.?|LLC|Ltd\.?|Company|Corporation|Corp\.?|Co\.?|LLC|Group|Partners|Consulting|Systems)',
                    # government entities
                    r"(?:Department of|Ministry of|Federal|State|City|County|Office of|Bureau of|Agency of)\\s(?:[A-Z][a-zA-Z]+(?:\\s[A-Z][a-zA-Z]+)*)",
                    # ngos
                    r"(?:World Health Organization|Red Cross|Amnesty International|UNICEF|Doctors Without Borders|Oxfam|Human Rights Watch)",
                    # universities
                    r"(?:University of\\s[A-Z][a-zA-Z]+|[A-Z][a-zA-Z]+ University|MIT|Harvard|Stanford|Yale)"
                    # cybersecurity specific patterns
                    # victim organizations
                    r"(?:Company|Organization|Agency|Firm|Enterprise|Network|Institution|Utility)\\s[A-Z][a-zA-Z]+(?:\\s[A-Z][a-zA-Z]+)*",
                    # criminal organizations
                    r"(?:APT\\s\\d+|Lazarus Group|Fancy Bear|Cozy Bear|Conti|Ryuk|DarkSide|REvil|Clop|LockBit|Anonymous|Lapsus\\$)",
                    # security companies
                    r"(?:FireEye|CrowdStrike|Palo Alto Networks|Symantec|Check Point|Fortinet|Trend Micro|Kaspersky|McAfee)",
                    # nation state entities
                    r"(?:CIA|NSA|FBI|FSB|MI6|GCHQ|PLA Unit \\d+|MSS|GRU|North Korean Reconnaissance General Bureau)"
                    # combined patterns
                    # comprehensive organization pattern
                    r"(?:[A-Z][a-zA-Z]+(?:\\s[A-Z][a-zA-Z]+)*(?:\\s(?:LLC|Inc|Corp|Corporation|Co|Ltd|Group|Partners|Consulting|Systems))|(?:Department of|Ministry of|Federal|State|City|County|Office of|Bureau of|Agency of)\\s(?:[A-Z][a-zA-Z]+(?:\\s[A-Z][a-zA-Z]+)*)|(?:World Health Organization|Red Cross|Amnesty International|UNICEF|Doctors Without Borders|Oxfam|Human Rights Watch)|(?:University of\\s[A-Z][a-zA-Z]+|[A-Z][a-zA-Z]+ University|MIT|Harvard|Stanford|Yale)|(?:Company|Organization|Agency|Firm|Enterprise|Network|Institution|Utility)\\s[A-Z][a-zA-Z]+(?:\\s[A-Z][a-zA-Z]+)*|(?:APT\\s\\d+|Lazarus Group|Fancy Bear|Cozy Bear|Conti|Ryuk|DarkSide|REvil|Clop|LockBit|Anonymous|Lapsus\\$)|(?:FireEye|CrowdStrike|Palo Alto Networks|Symantec|Check Point|Fortinet|Trend Micro|Kaspersky|McAfee)|(?:CIA|NSA|FBI|FSB|MI6|GCHQ|PLA Unit \\d+|MSS|GRU|North Korean Reconnaissance General Bureau))",
                    # stock_ticker_symbols"
                    r"[A-Z][1,5]", 
                    # icann_identifiers
                    r"[A-Z][1,5]-(?:[A-Z0-9][1,5])",
                    # campaign_ids
                    r"(?:CAMP|OP)[A-Za-z0-9-_]+",
                    # actor_aliases
                    r"(?:APT|ThreatGroup|TG|UNC)[A-Za-z0-9-_]+"],
            'event': [# general_events
                      # time_specific_events
                      r"(?:Meeting|Conference|Webinar|Seminar|Workshop|Training|Summit|Forum|Hackathon|Keynote|Presentation|Expo|Symposium)",
                      # action_specific_events
                      r"(?:Launch|Update|Release|Announcement|Merger|Acquisition|Partnership|Collaboration|Shutdown|Investigation|Scandal|Strike|Outage|Protest|Demonstration|Sale|Transaction)",
                      # cybersecurity_specific_events
                      # incident_types
                      r"(?:Breach|Ransomware Attack|Phishing Scam|Spearphishing|Data Leak|Denial of Service|DDoS|Intrusion|Malware Outbreak|Supply Chain Attack|Credential Stuffing|Zero-Day Exploit|APT Attack|Compromise|Privilege Escalation|Exfiltration|Post-Exploitation)",
                      # detection_and_response
                      r"(?:Incident Response|Threat Detection|Patch Deployment|Vulnerability Disclosure|Penetration Test|Forensic Analysis|Threat Hunting|Security Audit|Risk Assessment|SOC Investigation|Red Team Exercise|Bug Bounty)",
                      # host_events
                      # file_operations
                      r"(?:File Creation|File Deletion|File Modification|File Execution|File Transfer|File Download|File Upload|File Access)",
                      # process_activity
                      r"(?:Process Start|Process Termination|Process Injection|Process Privilege Escalation|Process Monitoring)",
                      # authentication_events
                      r"(?:Logon Attempt|Successful Logon|Failed Logon|Logoff|Password Reset|Account Lockout|Credential Dumping)",
                      # network_events
                      # traffic_activity
                      r"(?:Network Connection|Network Scanning|Packet Capture|Data Exfiltration|Malicious Traffic|Beaconing|Command and Control Traffic|HTTP Request|DNS Query|SSH Login|VPN Connection|FTP Transfer)",
                      # attack_activity
                      r"(?:DDoS Attack|MITM Attack|Spoofing|Session Hijacking|Protocol Exploitation|Port Scanning|IP Spoofing|ARP Poisoning)",
                      # device_events
                      r"(?:Firewall Rule Modification|Router Configuration Change|Switch Port Flapping|Proxy Configuration Change)",
                      # control_system_events
                      # ics_specific_activity
                      # "(?:PLC Programming|HMI Interaction|SCADA Data Modification|Control Logic Change|Parameter Adjustment|Setpoint Change|Actuator Command|Sensor Manipulation|Alarm Suppression|Device Restart|System Shutdown)",
                      # field_device_activity
                      r"(?:Sensor Failure|Actuator Failure|I/O Module Failure|Device Firmware Update|Field Device Communication Loss)",
                      # safety_system_events
                      r"(?:Safety Instrumented Function Trigger|Emergency Shutdown|Override Activated|Safety System Failure|Safety Alarm)"]
        }

    def train(self):
        pass

    def get_entities(self, text):
        entities = []
        for label, pattern in self.patterns.items():
            for p in pattern:
                for match in finditer(p, text):
                    entities.append(Entity(match.span()[0], match.span()[1], match.group(), label))
        return entities
