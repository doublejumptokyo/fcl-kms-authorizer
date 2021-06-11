FROM alpine:3.12.4
RUN apk --update add build-base bash curl wget --no-cache
ENV VERSION v0.21.0
RUN wget https://storage.googleapis.com/flow-cli/install.sh
RUN sh ./install.sh $VERSION
ENV PATH /root/.local/bin:$PATH
WORKDIR /app
CMD ["tail", "-f", "/dev/null"]
