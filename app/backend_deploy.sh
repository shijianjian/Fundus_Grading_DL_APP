#!/bin/bash
gcloud compute instances create fundus-dl-app-backend\
     --image-family=debian-9\
     --image-project=debian-cloud\
     --machine-type=f1-micro\
     --scopes userinfo-email,cloud-platform\
     --metadata-from-file startup-script=gce/backend-startup-script.sh\
     --hostname=fundus-dl-app.demo.com\
     --zone us-west1-a\
     --tags http-server,https-server