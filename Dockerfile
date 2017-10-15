FROM node
WORKDIR /app
COPY ./*.js* ./
RUN npm install
EXPOSE 6667
ENTRYPOINT [ "node", "index" ]