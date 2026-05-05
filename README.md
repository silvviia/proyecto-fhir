# FhirUi

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.7.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

---

## ELK Stack – Monitoring & Log Analysis (Option B)

This project ships with a full **ELK Stack** setup (Elasticsearch + Logstash + Kibana) alongside an Nginx reverse proxy that serves the Angular app and captures access logs. Logs are shipped via **Filebeat** and the Angular **LoggerService**.

### Architecture

```
Browser
  │
  ▼
Nginx :4200          ← serves Angular SPA, proxies /fhir → HAPI FHIR :8080
  │ (access logs)
  ▼
Filebeat             ← reads /var/log/nginx/access.log + Docker container logs
  │
  ▼
Logstash :5044       ← Beats input (Filebeat)
Logstash :5000       ← HTTP input  (Angular LoggerService JSON POSTs)
  │
  ▼
Elasticsearch :9200  ← index: fhir-logs-YYYY.MM.dd
  │
  ▼
Kibana :5601         ← dashboards, Data Views, Discover
```

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- HAPI FHIR server running on **host port 8080**
- Keycloak running on **host port 8081**

> **Note:** On Linux hosts replace `host.docker.internal` in `infra/elk/nginx/nginx.conf` with the actual IP of your FHIR server.

### Start the full stack

```bash
docker compose up -d
```

This builds the Angular app, starts Nginx, Elasticsearch, Kibana, Logstash, and Filebeat.  
First startup takes a few minutes while Elasticsearch and Kibana initialise.

| Service           | URL                         |
|-------------------|-----------------------------|
| Angular app       | <http://localhost:4200>     |
| Kibana            | <http://localhost:5601>     |
| Elasticsearch     | <http://localhost:9200>     |
| Logstash HTTP     | <http://localhost:5000>     |

To stop everything:

```bash
docker compose down
```

To stop and **remove all data volumes** (clean slate):

```bash
docker compose down -v
```

### Create a Kibana Data View

1. Open Kibana at <http://localhost:5601>
2. Navigate to **Management → Stack Management → Data Views**
3. Click **Create data view**
4. Set **Index pattern** to `fhir-logs-*`
5. Set **Timestamp field** to `@timestamp`
6. Click **Save data view to Kibana**

### Suggested Discover queries

Open **Analytics → Discover** and select the `fhir-logs-*` data view.

#### Filter errors only

```
level: ERROR
```

or using tags:

```
tags: error
```

#### API traffic by HTTP method and path

```
tags: nginx_access AND method: GET
```

Add columns: `method`, `path`, `status_code`, `response_time_s`, `client_ip`

#### High-latency requests (> 1 s)

```
tags: nginx_access AND response_time_s > 1
```

#### Angular frontend errors

```
tags: angular_log AND level: ERROR
```

#### 4xx / 5xx HTTP errors

```
tags: nginx_access AND (status_code >= 400)
```

---

## End-to-End Request Traceability

Every HTTP request originating from the Angular frontend carries a `trace_id`
(UUID v4) that flows through the entire pipeline:

```
Browser (Angular)
  │  generates X-Trace-Id header
  ▼
Nginx (proxy)
  │  forwards X-Trace-Id to HAPI FHIR, echoes it in the response header,
  │  and logs it in the access log as trace=<id>
  ▼
HAPI FHIR :8080
  │  receives X-Trace-Id from Nginx proxy header
  ▼
Logstash / Elasticsearch
  │  both Angular JSON log and Nginx access log share the same trace_id
  ▼
Kibana Discover – filter by trace_id to see correlated events
```

### Fields present in every Angular log entry

| Field          | Example value                           | Description                                   |
|----------------|-----------------------------------------|-----------------------------------------------|
| `timestamp`    | `2024-03-15T10:23:45.123Z`              | ISO-8601 log time                             |
| `level`        | `INFO` / `ERROR`                        | Severity                                      |
| `service.name` | `frontend`                              | Originating service layer (ECS field)         |
| `action`       | `GET /fhir/Patient`                     | HTTP method + path                            |
| `user`         | `john.doe`                              | Keycloak `preferred_username`                 |
| `trace_id`     | `550e8400-e29b-41d4-a716-446655440000`  | UUID shared across all log events             |
| `log_message`  | `HTTP Request`                          | Human-readable description (renamed by Logstash) |
| `module`       | `HTTP`                                  | Angular module that emitted the log           |

### How to test traceability end-to-end

1. Start the full stack:
   ```bash
   docker compose up -d
   ```
2. Open the Angular app at <http://localhost:4200> and log in via Keycloak.
3. Perform any action that triggers an API call (e.g. open the **Patients** page).
4. Open your browser's DevTools **Network** tab and note the `X-Trace-Id` header
   on any `/fhir/*` request.  Copy the UUID.
5. Open Kibana at <http://localhost:5601> → **Analytics → Discover**.
6. Select the `fhir-logs-*` data view.
7. Paste the UUID into the KQL search bar:

   ```
   trace_id: "550e8400-e29b-41d4-a716-446655440000"
   ```

   You should see **at least two events** with the same `trace_id`:
   - An Angular frontend log (`tags: angular_http_log`, `service.name: frontend`)
   - An Nginx access log (`tags: nginx_access`, `service.name: nginx`)

### KQL queries for Kibana

#### All logs for a specific trace

```
trace_id: "<your-uuid-here>"
```

#### Frontend errors for a specific user

```
service.name: "frontend" AND level: ERROR AND user: "john.doe"
```

#### Backend (Nginx) 4xx/5xx for a trace

```
trace_id: "<your-uuid-here>" AND status_code >= 400
```

#### All frontend INFO logs today

```
service.name: "frontend" AND level: INFO
```

#### All ERROR logs (any service)

```
level: ERROR
```

or via the tag:

```
tags: error
```

#### Requests that took longer than 500 ms

```
duration > 500
```

#### Correlate frontend + Nginx events for a user

```
user: "john.doe" OR (tags: nginx_access AND trace_id: *)
```

---

### Suggested Dashboard panels

Create a **Dashboard** (Analytics → Dashboards → Create dashboard) and add:

| Panel type        | Field / config                                   | Purpose                          |
|-------------------|--------------------------------------------------|----------------------------------|
| Metric            | `count()` filtered by `tags: error`              | Total errors today               |
| Bar chart         | X: `path.keyword`, Y: `count()`                  | Top requested API paths          |
| Line chart        | X: `@timestamp`, Y: `avg(response_time_s)`       | Average response time over time  |
| Data table        | `status_code`, `count()` grouped by status       | HTTP status breakdown            |
| Pie chart         | `level.keyword`, `count()`                       | Log level distribution           |
| Percentile metric | `percentile(response_time_s, 95)`                | p95 latency                      |

### Log sources

| Source                  | How it gets to Logstash                        | Logstash tag       |
|-------------------------|------------------------------------------------|--------------------|
| Nginx access log        | Filebeat reads `/var/log/nginx/access.log`     | `nginx_access`     |
| Nginx error log         | Filebeat reads `/var/log/nginx/error.log`      | `nginx`, `error`   |
| Docker container stdout | Filebeat Docker autodiscovery                  | varies             |
| Angular app (HTTP/WARN/ERROR) | `LoggerService.sendToServer` → HTTP POST to `:5000` | `angular_http_log` |

### Logstash pipeline overview

File: `infra/elk/logstash/pipeline/logstash.conf`

- **Input beats** (5044): receives structured events from Filebeat
- **Input HTTP** (5000): receives JSON bodies posted by Angular `LoggerService`
- **Filter Grok**: parses Nginx `combined_plus` log format into `method`, `path`, `status_code`, `bytes_sent`, `response_time_s`, `client_ip`, `user_agent`, `referrer`
- **Filter JSON**: parses inline JSON in container stdout messages
- **Filter Mutate**: adds `service.name`, `environment`, and appropriate tags; renames Angular log fields
- **Output Elasticsearch**: writes to daily index `fhir-logs-YYYY.MM.dd`

### Directory structure

```
infra/elk/
├── elasticsearch/config/elasticsearch.yml   # single-node, security disabled
├── filebeat/filebeat.yml                    # Filebeat inputs + autodiscovery
├── kibana/config/kibana.yml                 # Kibana → Elasticsearch connection
├── logstash/
│   ├── config/logstash.yml                  # Logstash settings
│   └── pipeline/logstash.conf               # Full pipeline definition
└── nginx/nginx.conf                         # Nginx reverse proxy + access logging
Dockerfile                                   # Multi-stage Angular build
docker-compose.yml                           # Orchestrates all services
```
