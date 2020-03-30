FROM tensorflow/tensorflow:1.14.0-py3

MAINTAINER Jian_Shi "sj8716643@126.com"

WORKDIR /app
COPY . /app

RUN pip install -r ./requirements.txt

ENTRYPOINT ["gunicorn", "--bind", "0.0.0.0:5000", "wsgi:app"]
