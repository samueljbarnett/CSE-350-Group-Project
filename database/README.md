# Requirements

[docker](https://www.docker.com/)



# First time setup

1. cd into the database directory.

2. Run `docker build -t hospital_db_img .` to build the base image.

3. Run the following command, replacing `/path/on/host` with the name of a
directory to store the database in. At this point, a new container will be
running, but has not been set up yet. The name `hospital_db` can also be
changed, but make sure to change it for following commands.
``` bash
docker run --name=hospital_db \
    --mount type=bind,src=/path/on/host,dst=/var/lib/mysql \
    --restart on-failure -d hospital_db_img
```

4. Run `docker logs hospital_db | grep GENERATED` to get the root password of
the mysql instance running in the container.

5. Run `docker exec -it hospital_db mysql -uroot -p`. Then type in the generated
password from step 4 to log in as root.

6. Create a new password for the root user using
`ALTER USER 'root'@'localhost' IDENTIFIED BY 'password';`, replacing password
with a new strong password.

7. Run `source setup.sql` to run the setup script.

8. *NOTE* After running this script, a user account will be created in the
database with the username `admin`, and password `password`. This user is added
to the admin group to create other privileged users. Remember to change this
password before making the webapp publicly available.

9. Create a user for the webapp to use with the following command. Make sure to
keep track of the newly generated password, or specify your own method of
authentication in the command.
``` SQL
CREATE USER IF NOT EXISTS 'hospital_webapp' IDENTIFIED BY RANDOM PASSWORD DEFAULT ROLE 'hospital_webapp_role';
```



# Recommendations

- Keep this database protected from the public facing network

- Keep all passwords safe and store them securely

- Make sure to change all default passwords

- When creating staff accounts, adhere to the rule of least privilege

- Create a replica of this database, set to backup all of its information