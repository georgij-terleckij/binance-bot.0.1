# Dockerfile
FROM python:3.12

WORKDIR /app

COPY backend/ /app
RUN pip install --upgrade pip && pip install -r requirements.txt

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
