FROM redis:5

EXPOSE 26379
ADD sentinel.conf /etc/redis/sentinel.conf
RUN chown redis:redis /etc/redis/sentinel.conf
ENTRYPOINT ["docker-entrypoint.sh", "redis-server", "/etc/redis/sentinel.conf", "--sentinel"]
