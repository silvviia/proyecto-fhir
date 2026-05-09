FROM docker.elastic.co/beats/filebeat:8.13.4

USER root
COPY filebeat.yml /usr/share/filebeat/filebeat.yml
RUN chmod 0644 /usr/share/filebeat/filebeat.yml && chown root:filebeat /usr/share/filebeat/filebeat.yml

USER filebeat