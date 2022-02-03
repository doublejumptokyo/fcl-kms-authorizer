FROM golang:1.16.12-alpine3.15
RUN apk --update add build-base bash curl wget openssh git --no-cache && \
    echo -e "StrictHostKeyChecking no\n" >> /etc/ssh/ssh_config && \
    git clone https://github.com/onflow/flow-cli.git && \
    cd flow-cli/ && \
    GOOS=linux GOARCH=arm64 make BINARY=./cmd/flow/flow binary && \
    cp ./cmd/flow/flow /usr/local/bin/flow
ENV PATH /usr/local/bin:$PATH

# ENV VERSION v0.29.0
# RUN wget https://storage.googleapis.com/flow-cli/install.sh
# RUN sh ./install.sh $VERSION
# ENV PATH /root/.local/bin:$PATH

WORKDIR /app
CMD ["tail", "-f", "/dev/null"]
