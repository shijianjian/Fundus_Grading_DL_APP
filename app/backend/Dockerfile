FROM ubuntu:18.04

MAINTAINER Jian_Shi "sj8716643@126.com"

RUN apt-get update -y && apt-get install -y python3-pip python3-dev

COPY ./requirements.txt /app/requirements.txt

WORKDIR /app

RUN pip3 install -r requirements.txt
COPY . /app

ENTRYPOINT ["gunicorn", "--bind", "0.0.0.0:5000", "wsgi:app"]