# About

This software to help with managing hospital resources and patients. It is
designed primarily to help staff keep track of patients and available assets. It
has separate front end panels and dashboards for staff members to access the
things they need and a dashboard for patients to manage personal information.

## Main Features:
- Patient Check in and Bed Assignments
- Asset tracking for medicines and equipment
- Symptom and Diagnosis Lookup Database
- Medical History Tracking

## Technical information
The software consists of 2 parts; a mysql database, and a node.js web app. Both
of these parts are designed to run in docker containers.



# Setup

Setup instructions for the database and the web app are linked below. Set up the
database prior to setting up the webapp. Both portions are containerized using
docker, so any dependencies should be installed into the containers
automatically. These steps are for running docker directly through the CLI, so
you may need to modify these steps depending on the environment.

1. [Database setup](database/README.md)

2. [Webapp setup](testInterface/README.md)