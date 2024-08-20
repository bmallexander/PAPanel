FROM ubuntu:latest

RUN apt-get update && \
    apt-get install -y openssh-server && \
    mkdir /var/run/sshd

RUN echo 'root:root' | chpasswd

EXPOSE 22
CMD ["/usr/sbin/sshd", "-D"]
