# 서울메이트 서버 이미지 (Render·Railway·Fly 등 어디서나 같은 방법으로 실행)
# 빌드:  docker build -t seoulmate-server .
# 실행:  docker run -p 8080:8080 --env-file .env seoulmate-server

# 1단계: 빌드 (테스트는 PR 단계에서 돌리므로 여기서는 건너뛴다)
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY gradlew settings.gradle build.gradle ./
COPY gradle gradle
RUN chmod +x gradlew && ./gradlew --no-daemon dependencies > /dev/null
COPY src src
RUN ./gradlew --no-daemon bootJar -x test && cp build/libs/*.jar /app/app.jar

# 2단계: 실행 (JRE만, root 가 아닌 사용자로)
FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd --system --no-create-home seoulmate
COPY --from=build /app/app.jar app.jar
USER seoulmate
ENV TZ=Asia/Seoul JAVA_OPTS="-XX:MaxRAMPercentage=75"
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
