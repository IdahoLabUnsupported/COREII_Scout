# CyNER: Python Library for Cybersecurity Named Entity Recognition

CyNER is a python library for extracting cybersecurity named entities. We combine different models with a priority based merging for extracting cybersecurity entities: transformer models trained on cybersecurity corpus for cybersecurity-specific entities, regular expression matching for identifying indicators, and NER models from Flair and SpaCy for generic entity types.  

This modified version differs from the original CyNER repository in that it incorporates more cyber specific regular expressions to capture additional entities.  In addition, we adopted CyNER 2.0 (`PranavaKailash/CyNER-2.0-DeBERTa-v3-base`), an upgraded version of the original `xlm-roberta-large` model. To learn more about the the `CyNER-2.0-DeBERTa-v3-base`, please visit https://huggingface.co/PranavaKailash/CyNER-2.0-DeBERTa-v3-base.

### Getting Started
clone the repo and then in the main repo directory use "pip install ."

`~/CyNER/pip install .`

#### Installation Hints:
It's recommended to use Python version >= 3.12.    


### Prediction
To get prediction with pretrained NER model  

```
import cyner

model = cyner.CyNER(transformer_model='PranavaKailash/CyNER-2.0-DeBERTa-v3-base', use_heuristic=False, flair_model=None)

text = 'Proofpoint report mentions that the German-language messages were turned off once the UK messages were established, indicating a conscious effort to spread FluBot 446833e3f8b04d4c3c2d2288e456328266524e396adbfeba3769d00727481e80 in Android phones.'

entities = model.get_entities(text)

for e in entities:
    print(e)
```

## Training 
To finetune the model, please see notebook "cyner_2.0_mlflow_heur.ipynb"  

