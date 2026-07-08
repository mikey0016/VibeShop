FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN mkdir -p data/uploads

ENV API_HOST=0.0.0.0
ENV WEBAPP_URL=https://vibe-shop.netlify.app

EXPOSE 8080

CMD ["python", "main.py"]
