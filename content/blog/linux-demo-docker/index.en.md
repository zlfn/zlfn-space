+++
title = "Building a Linux Lab Environment with Docker"
date = 2023-08-29
description = "My experience building a Linux seminar lab environment with Docker for junior club members"

[taxonomies]
tags = ["linux", "docker"]
+++

I was tasked with giving a Linux seminar to junior members of our club. That means I need to set up a lab environment.

Two years ago, the seniors told everyone to install VirtualBox. Last year, I ran the seminar myself and gave each junior an account on my Linux server.

This year, my Linux and virtualization knowledge has grown a lot, and I've [cleanly rebuilt my server](https://zlfn.space/blog/rocky-linux), so I decided to use virtualization to give everyone their own server.

### Googling
Originally I was trying to open multiple containers and set up SSH reverse proxies or jump forwarding, but it was harder than expected. While struggling, I found this post:

[Replicate and Isolating user environments on the fly](https://unix.stackexchange.com/questions/126426/replicate-and-isolating-user-environments-on-the-fly)

This was exactly what I wanted, so I decided to modify it to fit my environment.

### Creating the Image
The post above went through the process of modifying a container and turning it back into an image, but that's too tedious, so I decided to use a Dockerfile.

``` dockerfile
# Dockerfile
FROM ubuntu:latest

RUN apt-get update
RUN apt-get install -y vim sudo man-db gcc
RUN yes | unminimize

RUN useradd -ms /bin/bash guest
RUN echo 'guest:password' | chpasswd
RUN usermod -a -G sudo guest

USER guest
WORKDIR /home/guest
```

Install the packages needed for the lab: `vim`, `sudo`, `man-db`, `gcc`, and run `unminimize` to make `man` work.

Then create a user called guest so that when you connect to the container, you log in as a user rather than root. This gives a more similar feel to SSH-ing directly into a server.

```bash
docker build --tag sandbox .
```

Build the image with this command.

### Creating the User
Now create a user so that when they connect via SSH, they enter a fake shell.
```bash
mkdir /home/guest

cat > /home/guest/sandbox <<EOF
#!/bin/sh
exec docker run -t -i --rm=true sandbox /bin/bash
EOF

chmod +x /home/guest/sandbox

# useradd guest -g docker -s /home/guest/sandbox 
useradd guest -s /home/guest/sandbox

chown guest /home/guest

passwd guest
```

Since I'm using Podman rather than Docker, I didn't need to give the user the `docker` group to run [Rootless Podman](https://access.redhat.com/documentation/ko-kr/red_hat_enterprise_linux/8/html/building_running_and_managing_containers/proc_setting-up-rootless-containers_assembly_starting-with-containers). If you're using Docker, you'll need to add the `docker` group.

The `--rm=true` argument on the `docker` command ensures the container is deleted immediately when you exit, and the fake shell launches Docker when the user logs in.

### Complete
With the above setup, when you SSH in as the `guest` user, you get trapped in a temporarily created container.

![Screenshot_20230829_113449](Screenshot_20230829_113449.png "Screenshot_20230829_113449")

(The username differs from what's shown on the blog.)

In this environment, you can install as many packages as you want or modify the system (as long as it's not kernel-related), and even running `sudo rm -rf /` won't affect the host system running the container.

When you log out and log back in, everything is reset and a new container is created — a great environment for practice.

```
sudo rm -rf --no-preserve-root /
```
Try running this and see that the system doesn't break.

### 2024.07.15 Update

With the container setup above, there are issues where the container sometimes doesn't get properly deleted on logout, and a Refreshing Error occurs on login.
```
ERRO[0001] Refreshing container 2e3d121a75ec00add6a35694cdc26e6442bb98a7e993b918569dd7584597bca6: acquiring lock 0 for container 2e3d121a75ec00add6a35694cdc26e6442bb98a7e993b918569dd7584597bca6: file exists
```

For the container not being deleted on logout, I added `docker stop sandbox` to the `guest` account's `.bash_logout` file — I'm not 100% sure but it seems to have fixed it.
The error seems to be resolved by enabling lingering mode for the account with `loginctl enable-linger guest`.
