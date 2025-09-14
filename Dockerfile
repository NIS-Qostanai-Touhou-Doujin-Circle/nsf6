# Stage 1: build via npm
FROM node:20 AS build
WORKDIR /app
COPY package*.json ./
COPY postcss.config.mjs ./
COPY tsconfig.json ./
RUN npm install
COPY web/src/ web/src/
RUN npm run build

# Stage 2: rust application
FROM rust:latest AS rust-build
WORKDIR /app
COPY Cargo.toml ./

# Workaround to trick rust into caching dependencies
RUN mkdir src && echo 'fn main() { print!("if you see this, the build broke"); }' > src/main.rs && cargo build --release && rm -rf src && rm -rf target/release/deps/indrive*

# Now copy the real source code
COPY --from=build /app/web/out ./web/out
COPY src ./src
RUN cargo build --release

RUN strip target/release/indrive
RUN mv target/release/indrive ./indrive
RUN rm -rf src target
RUN chmod +x ./indrive
EXPOSE 8080
CMD ["./indrive"]