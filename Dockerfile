FROM arm32v6/alpine

COPY ./qemu-arm-static /usr/bin/qemu-arm-static

# we need ca-certificates for any external https communication
RUN ["/usr/bin/qemu-arm-static", "/bin/sh", "-c", "apk --update upgrade && \
    apk add curl ca-certificates && \
    update-ca-certificates && \
    rm -rf /var/cache/apk/*"]

ADD ./backend/build/hashi-ui-linux-arm /hashi-ui
#ADD ./backend/build/hashi-ui-linux-amd64 /hashi-ui
EXPOSE 3000
CMD ["/hashi-ui"]
