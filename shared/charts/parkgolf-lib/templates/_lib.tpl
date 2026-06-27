{{/*
  parkgolf-lib — 제품 차트 공유 템플릿 단일 소스 (UNI-112 chunk4).
  각 제품 차트(marketplace·manager·platform)는 templates/main.yaml에서 필요한 define만 include.
  per-service define은 .Values.services(해당 차트 부분집합)를 루프 → 합집합 = 분할 전 단일 차트와 동일.
  singleton(nats·postgres·redis·ingress·config·externalSecretsShared)은 소유 차트에서만 include.
*/}}

{{/* ===== 공통 헬퍼 (원본 _helpers.tpl) ===== */}}
{{- define "parkgolf.image" -}}
{{ .Values.global.image.registry }}/{{ .name }}:{{ .Values.global.image.tag }}
{{- end -}}

{{- define "parkgolf.labels" -}}
app.kubernetes.io/name: {{ .name }}
app.kubernetes.io/managed-by: argocd
{{- end -}}

{{/* ===== per-service: Deployment ===== */}}
{{- define "parkgolf-lib.deployments" -}}
{{- $defaults := .Values.defaults -}}
{{- $registry := .Values.global.image.registry -}}
{{- $tag := .Values.global.image.tag -}}
{{- $pullPolicy := .Values.global.image.pullPolicy -}}
{{- $namespace := .Values.global.namespace -}}
{{- range .Values.services }}
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .name }}
  namespace: {{ $namespace }}
  labels:
    app: {{ .name }}
spec:
  replicas: {{ .replicas | default 1 }}
  selector:
    matchLabels:
      app: {{ .name }}
{{- with .strategy }}
  strategy:
{{ toYaml . | indent 4 }}
{{- end }}
  template:
    metadata:
      labels:
        app: {{ .name }}
    spec:
      # prisma migrate는 ArgoCD PreSync Job(templates/migrate-job.yaml)로 분리.
      containers:
        - name: {{ .name }}
          # service별 tag override 우선, 없으면 global.image.tag fallback
          image: {{ $registry }}/{{ .name }}:{{ index $.Values.serviceImageTags .name | default $tag }}
          imagePullPolicy: {{ $pullPolicy }}
          ports:
            - containerPort: 8080
          env:
            - name: PORT
              value: "8080"
            - name: NODE_ENV
              valueFrom: { configMapKeyRef: { name: parkgolf-config, key: NODE_ENV } }
            - name: NATS_URL
              valueFrom: { configMapKeyRef: { name: parkgolf-config, key: NATS_URL } }
            # OpenTelemetry — Cloud Trace 자동 식별
            - name: OTEL_SERVICE_NAME
              value: {{ .name | quote }}
            - name: JWT_SECRET
              valueFrom: { secretKeyRef: { name: parkgolf-secrets, key: JWT_SECRET } }
            - name: JWT_REFRESH_SECRET
              valueFrom: { secretKeyRef: { name: parkgolf-secrets, key: JWT_REFRESH_SECRET } }
{{- if .db }}
            - name: DATABASE_URL
              valueFrom: { secretKeyRef: { name: {{ .name }}-db-secret, key: DATABASE_URL } }
{{- end }}
{{- range .extraEnv }}
            - name: {{ .name }}
{{- if .secretRef }}
              valueFrom: { secretKeyRef: { name: {{ .secretRef.name }}, key: {{ .secretRef.key }} } }
{{- else if .configRef }}
              valueFrom: { configMapKeyRef: { name: {{ .configRef.name }}, key: {{ .configRef.key }} } }
{{- else }}
              value: {{ .value | quote }}
{{- end }}
{{- end }}
          resources:
{{ toYaml (.resources | default $defaults.resources) | indent 12 }}
          startupProbe:
{{ toYaml $defaults.startupProbe | indent 12 }}
          readinessProbe:
{{ toYaml $defaults.readinessProbe | indent 12 }}
          livenessProbe:
{{ toYaml $defaults.livenessProbe | indent 12 }}
{{- end }}
{{- end -}}

{{/* ===== per-service: Service ===== */}}
{{- define "parkgolf-lib.services" -}}
{{- range .Values.services }}
---
apiVersion: v1
kind: Service
metadata:
  name: {{ .name }}
  namespace: {{ $.Values.global.namespace }}
  labels:
    app: {{ .name }}
{{- if .backendConfig }}
  annotations:
    cloud.google.com/backend-config: '{"default": "{{ .backendConfig }}-backend-config"}'
{{- end }}
spec:
  type: ClusterIP
  ports:
    - port: 8080
      targetPort: 8080
  selector:
    app: {{ .name }}
{{- end }}
{{- end -}}

{{/* ===== per-service: HPA ===== */}}
{{- define "parkgolf-lib.hpa" -}}
{{- $namespace := .Values.global.namespace -}}
{{- range .Values.services }}
{{- if and .hpa .hpa.enabled }}
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: {{ .name }}
  namespace: {{ $namespace }}
  labels:
    app: {{ .name }}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: {{ .name }}
  minReplicas: {{ .hpa.min | default 2 }}
  maxReplicas: {{ .hpa.max | default 10 }}
  metrics:
{{- if .hpa.cpu }}
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: {{ .hpa.cpu }}
{{- end }}
{{- if .hpa.memory }}
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: {{ .hpa.memory }}
{{- end }}
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - { type: Pods, value: 2, periodSeconds: 60 }
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - { type: Pods, value: 1, periodSeconds: 120 }
{{- end }}
{{- end }}
{{- end -}}

{{/* ===== per-service: PDB ===== */}}
{{- define "parkgolf-lib.pdb" -}}
{{- range .Values.services }}
{{- if .pdb }}
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: {{ .name }}-pdb
  namespace: {{ $.Values.global.namespace }}
spec:
{{ toYaml .pdb | indent 2 }}
  selector:
    matchLabels:
      app: {{ .name }}
{{- end }}
{{- end }}
{{- end -}}

{{/* ===== per-service: DATABASE_URL ExternalSecret ===== */}}
{{- define "parkgolf-lib.dbSecrets" -}}
{{- if .Values.externalSecrets.enabled }}
{{- range .Values.services }}
{{- if .db }}
---
apiVersion: external-secrets.io/v1
kind: ExternalSecret
metadata:
  name: {{ .name }}-db
  namespace: {{ $.Values.global.namespace }}
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: {{ $.Values.externalSecrets.secretStoreName }}
    kind: ClusterSecretStore
  target:
    name: {{ .name }}-db-secret
    creationPolicy: Owner
    template:
      data:
        DATABASE_URL: "postgresql://{{ "{{ .user }}" }}:{{ "{{ .password }}" }}@postgres:5432/{{ .db }}"
  data:
    - secretKey: user
      remoteRef: { key: parkgolf-dev-POSTGRES_USER }
    - secretKey: password
      remoteRef: { key: parkgolf-dev-POSTGRES_PASSWORD }
{{- end }}
{{- end }}
{{- end }}
{{- end -}}

{{/* ===== singleton: ConfigMap (parkgolf-config) ===== */}}
{{- define "parkgolf-lib.configmap" -}}
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: parkgolf-config
  namespace: {{ .Values.global.namespace }}
data:
{{- range $k, $v := .Values.config }}
  {{ $k }}: {{ $v | quote }}
{{- end }}
{{- end -}}

{{/* ===== singleton: ClusterSecretStore + parkgolf-secrets ExternalSecret ===== */}}
{{- define "parkgolf-lib.externalSecretsShared" -}}
{{- if .Values.externalSecrets.enabled }}
---
apiVersion: external-secrets.io/v1
kind: ClusterSecretStore
metadata:
  name: {{ .Values.externalSecrets.secretStoreName }}
spec:
  provider:
    gcpsm:
      projectID: {{ .Values.externalSecrets.gcpProjectId }}
      auth:
        workloadIdentity:
          clusterLocation: {{ .Values.externalSecrets.clusterLocation }}
          clusterName: {{ .Values.externalSecrets.clusterName }}
          serviceAccountRef:
            name: external-secrets
            namespace: external-secrets
---
# parkgolf-secrets — 모든 키를 한 번에 동기화
apiVersion: external-secrets.io/v1
kind: ExternalSecret
metadata:
  name: parkgolf-secrets
  namespace: {{ .Values.global.namespace }}
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: {{ .Values.externalSecrets.secretStoreName }}
    kind: ClusterSecretStore
  target:
    name: parkgolf-secrets
    creationPolicy: Owner
  data:
{{- range .Values.externalSecrets.keys }}
    - secretKey: {{ . }}
      remoteRef:
        key: parkgolf-dev-{{ . }}
{{- end }}
{{- end }}
{{- end -}}

{{/* ===== singleton: NATS ===== */}}
{{- define "parkgolf-lib.nats" -}}
{{- if .Values.nats.enabled }}
---
apiVersion: v1
kind: Service
metadata:
  name: nats
  namespace: {{ .Values.global.namespace }}
spec:
  clusterIP: None
  ports:
    - { port: 4222, name: client }
    - { port: 8222, name: monitor }
  selector:
    app: nats
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: nats
  namespace: {{ .Values.global.namespace }}
spec:
  serviceName: nats
  replicas: 1
  selector:
    matchLabels: { app: nats }
  template:
    metadata:
      labels: { app: nats }
    spec:
      containers:
        - name: nats
          image: {{ .Values.nats.image }}
          args: ["-js", "-m", "8222"]
          ports:
            - { containerPort: 4222 }
            - { containerPort: 8222 }
          resources:
{{ toYaml .Values.nats.resources | indent 12 }}
{{- end }}
{{- end -}}

{{/* ===== singleton: PostgreSQL ===== */}}
{{- define "parkgolf-lib.postgres" -}}
{{- if .Values.postgres.enabled }}
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: {{ .Values.global.namespace }}
  labels: { app: postgres }
spec:
  clusterIP: None
  ports:
    - port: 5432
      targetPort: 5432
  selector:
    app: postgres
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: {{ .Values.global.namespace }}
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels: { app: postgres }
  template:
    metadata:
      labels: { app: postgres }
    spec:
      containers:
        - name: postgres
          image: {{ .Values.postgres.image }}
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_USER
              valueFrom: { secretKeyRef: { name: parkgolf-secrets, key: POSTGRES_USER } }
            - name: POSTGRES_PASSWORD
              valueFrom: { secretKeyRef: { name: parkgolf-secrets, key: POSTGRES_PASSWORD } }
            - name: POSTGRES_DB
              value: parkgolf
            - name: PGDATA
              value: /var/lib/postgresql/data/pgdata
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
            - name: init
              mountPath: /docker-entrypoint-initdb.d
          resources:
{{ toYaml .Values.postgres.resources | indent 12 }}
      volumes:
        - name: init
          configMap:
            name: postgres-init
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: standard-rwo
        resources:
          requests:
            storage: {{ .Values.postgres.storage }}
---
# 부팅 시 도메인 DB 자동 생성
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-init
  namespace: {{ .Values.global.namespace }}
data:
  init.sql: |
{{- range .Values.postgres.databases }}
    SELECT 'CREATE DATABASE {{ . }}' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '{{ . }}')\gexec
{{- end }}
{{- end }}
{{- end -}}

{{/* ===== singleton: Redis ===== */}}
{{- define "parkgolf-lib.redis" -}}
{{- if .Values.redis.enabled }}
---
apiVersion: v1
kind: Service
metadata:
  name: parkgolf-redis
  namespace: {{ .Values.global.namespace }}
spec:
  type: ClusterIP
  ports:
    - { port: 6379, name: redis, targetPort: 6379 }
  selector:
    app: parkgolf-redis
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: parkgolf-redis
  namespace: {{ .Values.global.namespace }}
spec:
  serviceName: parkgolf-redis
  replicas: 1
  selector:
    matchLabels: { app: parkgolf-redis }
  template:
    metadata:
      labels: { app: parkgolf-redis }
    spec:
      containers:
        - name: redis
          image: {{ .Values.redis.image }}
          args:
            - "--maxmemory"
            - {{ .Values.redis.maxmemory | quote }}
            - "--maxmemory-policy"
            - {{ .Values.redis.maxmemoryPolicy | quote }}
            - "--appendonly"
            - "yes"
          ports:
            - { containerPort: 6379 }
          resources:
{{ toYaml .Values.redis.resources | indent 12 }}
          livenessProbe:
            tcpSocket: { port: 6379 }
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            exec:
              command: ["redis-cli", "ping"]
            initialDelaySeconds: 5
            periodSeconds: 5
{{- end }}
{{- end -}}

{{/* ===== singleton: BackendConfig ===== */}}
{{- define "parkgolf-lib.backendConfigs" -}}
{{- range $name, $cfg := .Values.backendConfigs }}
---
apiVersion: cloud.google.com/v1
kind: BackendConfig
metadata:
  name: {{ $name }}-backend-config
  namespace: {{ $.Values.global.namespace }}
spec:
{{ toYaml $cfg | indent 2 }}
{{- end }}
{{- end -}}

{{/* ===== singleton: ManagedCertificate + Ingress ===== */}}
{{- define "parkgolf-lib.ingress" -}}
{{- if .Values.ingress.enabled }}
---
apiVersion: networking.gke.io/v1
kind: ManagedCertificate
metadata:
  name: {{ .Values.ingress.managedCert }}
  namespace: {{ .Values.global.namespace }}
spec:
  domains:
    - {{ .Values.global.domain }}
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: parkgolf-ingress
  namespace: {{ .Values.global.namespace }}
  annotations:
    kubernetes.io/ingress.class: "gce"
    kubernetes.io/ingress.global-static-ip-name: {{ .Values.ingress.staticIpName | quote }}
    networking.gke.io/managed-certificates: {{ .Values.ingress.managedCert | quote }}
spec:
  rules:
    - host: {{ .Values.global.domain }}
      http:
        paths:
{{- range .Values.ingress.rules }}
          - path: {{ .path }}
            pathType: Prefix
            backend:
              service:
                name: {{ .service }}
                port: { number: 8080 }
          - path: {{ .path }}/*
            pathType: ImplementationSpecific
            backend:
              service:
                name: {{ .service }}
                port: { number: 8080 }
{{- end }}
{{- end }}
{{- end -}}
