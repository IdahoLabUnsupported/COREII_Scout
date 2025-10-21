import logging
from typing import List
from itertools import groupby
import transformers
import torch
import re
from torch import nn
from torch.utils.tensorboard import SummaryWriter

from .tokenizer import Transforms, Dataset
from .get_dataset import map_to_shared_tag


__all__ = 'TransformersNER'


class TransformersNER:
    """ Named-Entity-Recognition (NER) API for an inference """

    def __init__(self, transformers_model: str, cache_dir: str = None):
        logging.info('*** initialize network ***')
        self.model = transformers.AutoModelForTokenClassification.from_pretrained(transformers_model)
        
        # Pre-normalize the id_to_label mapping:
        raw_id_to_label = {v: str(k) for k, v in self.model.config.label2id.items()}
        self.id_to_label = {idx: map_to_shared_tag(label) for idx, label in raw_id_to_label.items()}
        self.transforms = Transforms(transformers_model, cache_dir=cache_dir)

        # GPU allocation
        self.n_gpu = torch.cuda.device_count()
        self.device = 'cuda' if self.n_gpu > 0 else 'cpu'
        self.device = 'mps' if torch.backends.mps.is_available() else self.device
        print(f"Using device: {self.device}")
        self.model.to(self.device)

    @staticmethod
    def decode_ner_tags(tag_sequence, tag_probability, non_entity: str = 'O'):
        """ take tag sequence, return list of entity
        input:  ["B-LOC", "O", "O", "B-ORG", "I-ORG", "O"]
        return: [['LOC', [0, 1]], ['ORG', [3, 5]]]
        """
        assert len(tag_sequence) == len(tag_probability)
        unique_type = list(set(i.split('-')[-1] for i in tag_sequence if i != non_entity))
        result = []
        for i in unique_type:
            mask = [t.split('-')[-1] == i for t, p in zip(tag_sequence, tag_probability)]

            # find blocks of True in a boolean list
            group = list(map(lambda x: list(x[1]), groupby(mask)))
            length = list(map(lambda x: len(x), group))
            group_length = [[sum(length[:n]), sum(length[:n]) + len(g)] for n, g in enumerate(group) if all(g)]

            # get entity
            for g in group_length:
                result.append([i, g])
        result = sorted(result, key=lambda x: x[1][0])
        return result
    
    # model_prediction.py  (replace the existing predict method)

    @torch.no_grad()
    def predict(self, x: List, max_seq_length: int = 128):
        """ Get prediction

         Parameter
        ----------------
        x: list
            batch of input texts
        max_seq_length: int
            maximum sequence length for running an inference

         Return
        ----------------
        entities: list
            list of dictionary where each consists of
                'type': (str) entity type
                'position': (list) start position and end position
                'mention': (str) mention
        """
        self.model.eval()
        encode_list = self.transforms.encode_plus_all(x, max_length=max_seq_length)
        data_loader = torch.utils.data.DataLoader(Dataset(encode_list), batch_size=len(encode_list))
        encode = list(data_loader)[0]
        
        # Exclude offset_mapping before passing to the model
        model_input = {k: v.to(self.device) for k, v in encode.items() if k != 'offset_mapping'}
        logit = self.model(**model_input, return_dict=True)['logits']
        
        entities = []
        
        for n, e in enumerate(encode['input_ids'].cpu().tolist()):
            original_sentence = x[n]
            
            pred = torch.max(logit[n], dim=-1)[1].cpu().tolist()
            activated = nn.Softmax(dim=-1)(logit[n])
            prob = torch.max(activated, dim=-1)[0].cpu().tolist()
            pred = [self.id_to_label.get(_p, 'O') for _p in pred]
            tag_lists = self.decode_ner_tags(pred, prob)

            _entities = []
            
            # Keep track of the last found position to handle multiple instances of the same entity
            last_found_pos = 0

            for tag, (start_token_idx, end_token_idx) in tag_lists:
                
                mention = self.transforms.tokenizer.decode(
                    e[start_token_idx:end_token_idx],
                    skip_special_tokens=True
                ).strip()

                # If the decoded mention is empty, skip it
                if not mention:
                    continue

                # Search for the mention in the original sentence, starting from the last found position
                try:
                    start_char = original_sentence.index(mention, last_found_pos)
                    end_char = start_char + len(mention)
                    last_found_pos = end_char # Update for the next search
                except ValueError:
                    # If the mention is not found, we'll fall back to a less precise method
                    # This can happen due to tokenization artifacts
                    reconstructed_sentence = self.transforms.tokenizer.decode(e, skip_special_tokens=True)
                    start_char = reconstructed_sentence.find(mention)
                    if start_char != -1:
                        end_char = start_char + len(mention)
                    else:
                        continue # If still not found, we have to skip this entity


                result = {
                    'type': tag,
                    'position': [start_char, end_char],
                    'mention': mention,
                    'probability': sum(prob[start_token_idx:end_token_idx]) / (end_token_idx - start_token_idx) if end_token_idx > start_token_idx else 0
                }
                _entities.append(result)

            entities.append({'entity': _entities, 'sentence': original_sentence})
        return entities
