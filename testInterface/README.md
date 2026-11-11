# Requirements

[docker](https://www.docker.com/)



# Prerequisites

- The database has been setup

- A user account has been created for the webapp

- The configuration file has been setup. See [configuration](#configuration)



# Setup

1. cd into the testInterface directory

2. Run `docker build -t hospital_app_img .` to build the base image.

3. Run `docker run --name=hospital_app --restart on-failure -d hospital_app_img`
to start an instance of the container.



# Configuration
The configuration consists of a `.conf` file residing in the working directory
when running docker build. This file follows a standard key=value convention.
A sample config with all possible keys are as follows.
``` conf
sql_port=33060
sql_host=192.0.0.1
sql_user=hospital_webapp
sql_pass=databaseUserPassword
```