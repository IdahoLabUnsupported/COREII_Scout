# © 2025 Idaho National Laboratory. All rights reserved.
#uvicorn/fastapi main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
#SDO's
from stix2 import (
Indicator, Malware, Vulnerability, AttackPattern, Campaign, CourseOfAction, 
Grouping, Identity, Infrastructure, IntrusionSet, Location, MalwareAnalysis, 
Note, ObservedData, Opinion, Report, ThreatActor, Tool
)
#SRO's
from stix2 import Relationship, Sighting
#utilities
from stix2 import Bundle, CustomObject, properties

app = FastAPI()

class Item(BaseModel):  #Define expected input JSON using Pydantic model
    entity_text: str
    entity_label: str
    confidence: float
    start_pos: int
    end_pos: int

#Custom stix object to store non-sdo cyner entities in stix format
@CustomObject('scout-non-stix-entity', [
    ('entity', properties.StringProperty(required=True)),
    ('value', properties.StringProperty(required=True)),
])
class ToyNERNonStixEntitiy(object):
    def __init__(self, entity=None, value=None, **kwargs):
        pass

@app.post("/stixconversion") #Stix conversion fastapi route
async def process_json(items: List[Item]):
    try:
        #Dump input JSON objects for iteration
        items_data = [item.dict() for item in items]
        
        SDO_bundle_array = [] #STIX2 Bundle constructor argument for after processing
        for object in items_data:
            entity = object['entity_label'] 
            match entity:
                case 'Malware':
                    malware = Malware(name=object['entity_text'], is_family="false")
                    SDO_bundle_array.append(malware)
                case 'Indicator':
                    indicator = Indicator(name=object['entity_text'],
                            indicator_types=["malicious-activity"], # not required, next two are
                            pattern_type="stix",
                            pattern="[artifact:payload_bin = \'null\']") #TODO: the SCO must eventually be accurately evaluated, most likely by the future model
                    SDO_bundle_array.append(indicator)
                case 'Vulnerability':
                    vulnerability = Vulnerability(name=object['entity_text'])
                    SDO_bundle_array.append(vulnerability)
                case _:
                    nonStixEntity = ToyNERNonStixEntitiy(entity=entity, value=object['entity_text'])
                    SDO_bundle_array.append(nonStixEntity)
        bundle = Bundle(SDO_bundle_array)
        return(bundle)
        #return(bundle.serialize(pretty=False)) #bundle serialization per docs, results in double serialized json slashes
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
        