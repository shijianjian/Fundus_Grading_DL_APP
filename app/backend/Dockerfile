FROM ubuntu:18.04

MAINTAINER Jian_Shi "sj8716643@126.com"

RUN apt-get update -y && apt-get install -y python3-pip python3-dev

WORKDIR /app
COPY . /app

RUN cd frontend && npm i && cd ..
RUN pip3 install -r ./backend/requirements.txt
RUN bash package_up.sh

ENTRYPOINT ["gunicorn", "--bind", "0.0.0.0:5000", "wsgi:app"]
