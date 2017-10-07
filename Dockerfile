FROM node
WORKDIR /app
COPY . .
EXPOSE 6667
ENTRYPOINT [ "node", "index" ]