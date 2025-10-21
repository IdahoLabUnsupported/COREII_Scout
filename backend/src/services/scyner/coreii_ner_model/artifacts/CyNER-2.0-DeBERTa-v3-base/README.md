---
datasets:
- PranavaKailash/CyNER2.0_augmented_dataset
language:
- en
library_name: transformers
license: mit
Tag:
- CyNER
- CyberSecurity
- NLP
- NER
---

# CyNER 2.0: A Domain-Specific Named Entity Recognition Model for Cybersecurity

## Model Overview

CyNER 2.0 is a Named Entity Recognition (NER) model designed explicitly for the cybersecurity domain. It is built upon the DeBERTa transformer model and fine-tuned to recognize cybersecurity-related entities, including indicators, malware, organizations, systems, and vulnerabilities.

## Model Description

The DeBERTa-based CyNER 2.0 model has been fine-tuned using a combination of datasets, including the original CyNER dataset and an augmented dataset with more recent threat patterns and additional entity tags. The fine-tuning process involved training the model on sequence data, which resulted in improved precision, recall, and F1-score compared to other baseline models.

### Key Features:
- **Model Architecture**: DeBERTa (Decoding-enhanced BERT with disentangled attention) V3 base.
- **Primary Use Case**: Named Entity Recognition (NER) for cybersecurity entities.
- **Performance Metrics**: Achieves an F1-score of 91.88% on the augmented dataset.
- **Training Data**: Fine-tuned on the original CyNER dataset and an augmented dataset from various open-source cybersecurity platforms.

## Intended Use

The CyNER 2.0 model is designed to assist cybersecurity analysts in automatically extracting relevant entities from unstructured or structured cybersecurity reports. It can be integrated into tools and applications for threat intelligence, automated report generation, and more.

### Example Entities Recognized:

The CyNER 2.0 model is trained to recognize the following entities in cybersecurity-related texts:

- **Indicator**: Identifies indicators of compromise (IoCs) such as IP addresses, file hashes, URLs, etc.
- **Malware**: Names of malware, ransomware, or other malicious software (e.g., WannaCry, DroidRAT).
- **Organization**: Recognizes the names of organizations involved in cybersecurity or targeted by cyber threats (e.g., Microsoft, FBI).
- **System**: Identifies operating systems, software, and hardware involved in cybersecurity incidents (e.g., Windows 10, Linux Kernel).
- **Vulnerability**: Extracts references to specific vulnerabilities (e.g., CVE-2023-XXXX).
- **Date**: Recognizes dates related to cybersecurity events or incidents.
- **Location**: Identifies geographic locations related to cybersecurity events.
- **Threat Group**: Recognizes the names of threat groups or actors involved in cyber attacks.

These entities allow the model to provide comprehensive and precise information for cybersecurity analysts.

## How to Use

### Installation

To use the CyNER 2.0 model, first install the `transformers` library from Hugging Face:

```bash
pip install transformers
```

### Load the Model

```python
from transformers import AutoModelForTokenClassification, AutoTokenizer

tokenizer = AutoTokenizer.from_pretrained("PranavaKailash/CyNER-2.0-DeBERTa-v3-base")
model = AutoModelForTokenClassification.from_pretrained("PranavaKailash/CyNER-2.0-DeBERTa-v3-base")
```

### Example Inference

```python
from transformers import pipeline

ner_pipeline = pipeline("ner", model=model, tokenizer=tokenizer)
text = "A recent attack by WannaCry ransomware caused significant damage to Windows systems."
entities = ner_pipeline(text)
print(entities)
```

### Output

```json
[
  {"entity": "B-Malware", "score": 0.99, "index": 5, "word": "WannaCry", "start": 19, "end": 28},
  {"entity": "B-System", "score": 0.98, "index": 10, "word": "Windows", "start": 54, "end": 61}
]
```

## Training Details

### Dataset

The model was trained on two datasets:
1. **Original CyNER dataset**: Focused on foundational entities in the cybersecurity domain.
2. **Augmented dataset**: Expanded with new entity types and additional real-world cybersecurity threats.

### Hyperparameters

- **Learning Rate**: 2e-5
- **Epochs**: 3
- **Batch Size**: 8
- **Weight Decay**: 0.01

### Evaluation

- **Precision**: 91.06%
- **Recall**: 92.72%
- **F1-Score**: 91.88%

### GitHub Repo

[Repo Link here](https://github.com/Pranava-Kailash/CyNER_2.0_API)

## Limitations

- **Entity Imbalance**: The model may underperform on less frequent entities such as vulnerabilities.
- **Domain-Specificity**: The model is specifically tuned for the cybersecurity domain and may not generalize well to other NER tasks.

## Citation

If you use this model in your research, please cite the following paper:

```
@misc{yet_to_update,
  title={CyNER 2.0: A Name Entity Recognition Model for Cyber Security},
  author={Pranava Kailash},
  year={2024},
  url={Yet to update}
}
```

## License

This project is licensed under the MIT License