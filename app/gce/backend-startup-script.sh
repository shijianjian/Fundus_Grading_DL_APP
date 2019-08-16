# Code built on top of https://github.com/GoogleCloudPlatform/getting-started-python/blob/master/7-gce/gce/startup-script.sh

# NOTE: Angular Application has to be built to prod first, and copy to backend folder.

set -v

REPO_NAME=github_shijianjian_fundus_grading_dl_app
# Talk to the metadata server to get the project id
PROJECTID=$(curl -s "http://metadata.google.internal/computeMetadata/v1/project/project-id" -H "Metadata-Flavor: Google")

# Install logging monitor. The monitor will automatically pickup logs sent to
# syslog.
curl -s "https://storage.googleapis.com/signals-agents/logging/google-fluentd-install.sh" | bash
service google-fluentd restart &

# Install dependencies from apt
apt-get update
apt-get install -yq \
    git build-essential supervisor python python-dev python-pip libffi-dev \
    libssl-dev

# Create a pythonapp user. The application will run as this user.
useradd -m -d /home/pythonapp pythonapp

# pip from apt is out of date, so make it update itself and install virtualenv.
pip install --upgrade pip virtualenv

# Get the source code from the Google Cloud Repository
# git requires $HOME and it's not set during the startup script.
export HOME=/root
git config --global credential.helper gcloud.sh
git clone https://source.developers.google.com/p/$PROJECTID/r/$REPO_NAME /opt/app

# Install app dependencies
virtualenv -p python3 /opt/app/env
source /opt/app/env/bin/activate
/opt/app/env/bin/pip --no-cache-dir install -r /opt/app/app/backend/requirements.txt

# Make sure the pythonapp user owns the application code
chown -R pythonapp:pythonapp /opt/app

# Configure supervisor to start gunicorn inside of our virtualenv and run the
# application.
cat >/etc/supervisor/conf.d/python-app.conf << EOF
[program:pythonapp]
directory=/opt/app/app
command=gunicorn --certifile cert.pem --keyfile key.pem --bind 0.0.0.0:5000 /opt/app/app/backend/wsgi:app
autostart=true
autorestart=true
user=pythonapp
# Environment variables ensure that the application runs inside of the
# configured virtualenv.
environment=VIRTUAL_ENV="/opt/app/env",PATH="/opt/app/env/bin",\
    HOME="/home/pythonapp",USER="pythonapp"
stdout_logfile=syslog
stderr_logfile=syslog
EOF

supervisorctl reread
supervisorctl update

# Application should now be running under supervisor
