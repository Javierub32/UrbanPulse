FROM golang:1.24.8 AS minio-build
RUN CGO_ENABLED=0 GOBIN=/out go install github.com/minio/minio@RELEASE.2025-10-15T17-29-55Z

FROM alpine:3.22 AS minio
RUN apk add --no-cache ca-certificates curl \
    && addgroup -S minio && adduser -S -G minio minio \
    && mkdir /data && chown minio:minio /data
COPY --from=minio-build /out/minio /usr/local/bin/minio
USER minio
EXPOSE 9000
ENTRYPOINT ["minio"]

FROM maven:3.9-eclipse-temurin-17 AS api-build
WORKDIR /workspace
COPY pom.xml .
COPY src ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:17-jre AS api
WORKDIR /app
COPY --from=api-build /workspace/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
