FROM redis:5

EXPOSE 26379
ADD sentinel.conf /etc/redis/sentinel.conf
RUN chown redis:redis /etc/redis/sentinel.conf
CMD ["redis-server", "/etc/redis/sentinel.conf", "--sentinel"]
