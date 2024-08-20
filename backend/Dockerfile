FROM alpine:latest

RUN apk update && apk add --no-cache openssh-server tmate

RUN mkdir /var/run/sshd && \
    echo 'root:root' | chpasswd && \
    ssh-keygen -A

EXPOSE 22
CMD ["/usr/sbin/sshd", "-D"]
