FROM node
WORKDIR /app
COPY ./*.js* ./
EXPOSE 6667
ENTRYPOINT [ "node", "index" ]