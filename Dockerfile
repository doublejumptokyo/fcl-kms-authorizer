FROM alpine:3.12.4
RUN apk --update add build-base bash curl --no-cache
ENV VERSION v0.21.0
RUN sh -ci "$(curl -fsSL https://storage.googleapis.com/flow-cli/install.sh)"
ENV PATH /root/.local/bin:$PATH
WORKDIR /app
CMD ["tail", "-f", "/dev/null"]
