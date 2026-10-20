FROM golang:1.23-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/chaincode .

FROM alpine:3.18

WORKDIR /app
COPY --from=builder /app/chaincode /app/chaincode

USER 1000:1000

ENV CHAINCODE_SERVER_ADDRESS=0.0.0.0:9999
EXPOSE 9999

ENTRYPOINT ["/app/chaincode"]
