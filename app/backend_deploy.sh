#!/bin/bash
gcloud compute instances create fundus-dl-app\
     --image-family=debian-9\
     --image-project=debian-cloud\
     --machine-type=f1-micro\
     --scopes userinfo-email,cloud-platform\
     --metadata-from-file startup-script=gce/backend-startup-script.sh\
     --hostname=fundus-dl-app\
     --zone us-west1-a\
     --tags http-server