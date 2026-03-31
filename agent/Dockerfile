FROM python:3.12-slim

WORKDIR /agent

RUN pip install --no-cache-dir psutil httpx pyyaml

COPY collector.py config.yaml ./

CMD ["python", "collector.py"]
