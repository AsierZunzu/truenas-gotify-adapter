FROM python:3.16.0a2-alpine3.24

WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY truenas-gotify.py ./

CMD ["python", "-u", "truenas-gotify.py"]
