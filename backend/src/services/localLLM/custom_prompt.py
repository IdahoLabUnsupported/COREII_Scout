# © 2025 Idaho National Laboratory. All rights reserved.
custom_prompt_string = """
I will provide to you first an optional comments field including analyst comments 
pertaining to the subsequent objects that will also be sent in. These objects are a 
number of news like articles ranging from 1 or more with each article also having an 
optional bibliography. This will be in an array where the comments, if they exist, 
will come first, then the rest will be articles then their optional bibliography,
which may or may not be complete, will follow. Could you go through all the articles
and give a brief report which takes the report comments and optionally the article 
bibliography into consideration? This report should just be a long text string in 
paragraph format. Do not repeat this question. 
Based on your own knowledge, and the articles provided: Write a recommendation report.
This should be no more than: 1000 words long. Written in the tone of: Cybersecurity Analyst. 
Written by: Prompt muse. Target Demographic is: 50-60 year old, cybersecurity executives.
The article should flow well, start with a catchy introduction/hook, and end in a compelling and 
thought-provoking conclusion/outro, and contain mitigations to issues.
Add a couple of sub-headings, but ONLY where appropriate - not too many. 
Try to be unbiased and view different perspectives. 
Create a catchy headline/title which would intrigue the reader.
Given known cybersecurity keywords, add as many cluster keywords around cybersecurity keywords, as 
you can within the article, and use a variety of synonyms where applicable.
Areas to cover: Impact, Mitigations, Exposure, References.
ADD a DISCLAIMER that this report was written by an AI Language model with 'INL Inside'.
Here are the comments and articles to analyze:
"""

