FROM python:3.12

WORKDIR /app

ENV PIP_TRUSTED_HOST="pypi.org files.pythonhosted.org pypi.python.org"

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
