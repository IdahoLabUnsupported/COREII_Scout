from setuptools import setup, find_packages

with open('README.md', 'r') as f:
    readme = f.read()
version = '0.0.1'
setup(
    name='cyner',
    packages=find_packages(exclude=["tests", "models"]),
    version=version,
    license='MIT',
    description='Cybersecurity Named Entity Recognition',
    keywords=['ner', 'nlp', 'language-model'],
    long_description=readme,
    long_description_content_type="text/markdown",
    author='Tanvirul Alam', # original author
    classifiers=[
        'Development Status :: 4 - Beta',       # Chose either "3 - Alpha", "4 - Beta" or "5 - Production/Stable" as the current state of your package
        'Intended Audience :: Developers',      # Define that your audience are developers
        'Intended Audience :: Science/Research',
        'Topic :: Scientific/Engineering',
        'License :: OSI Approved :: MIT License',   # Again, pick a license
        'Programming Language :: Python :: 3',      #Specify which pyhton versions that you want to support
    ],
    include_package_data=True,
    # test_suite='tests',
    install_requires=[
        'scipy',
        'markupsafe',
        'numpy<2.0',
        'pandas',
        'h11',
        'nltk',
        'flair',
        'spacy>=3.7',
        'ipywidgets',
        'spacy-transformers>=1.3',
        'Pillow>=7.1.0',
        'uvicorn',
        'jinja2',
        'aiofiles',
        'fastapi',
        'matplotlib',
        'toml',
        'tensorboard',
        'torch',
        'transformers',
        'sentencepiece',
        'seqeval',
        'segtok'
    ],
    # this setup.py is for container with updates: rocm/pytorch:rocm6.4_ubuntu24.04_py3.12_pytorch_release_2.6.0
    python_requires='>=3.12',
)
