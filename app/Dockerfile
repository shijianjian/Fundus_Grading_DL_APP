FROM ubuntu:18.04

MAINTAINER Jian_Shi "sj8716643@126.com"

RUN apt-get update -y && apt-get install -y python3-pip python3-dev curl 
RUN curl -sL https://deb.nodesource.com/setup_10.x | bash -
RUN apt-get update -y && apt-get install -y build-essential nodejs

RUN npm install -g npm

WORKDIR /app
COPY . /app

RUN cd frontend && npm i && cd ..
RUN pip3 install -r ./backend/requirements.txt && bash package_up.sh

COPY ./packaging /app

ENTRYPOINT ["gunicorn", "--bind", "0.0.0.0:5000", "wsgi:app"]
