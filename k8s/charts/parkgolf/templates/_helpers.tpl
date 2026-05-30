{{/* 서비스 image 경로 */}}
{{- define "parkgolf.image" -}}
{{ .Values.global.image.registry }}/{{ .name }}:{{ .Values.global.image.tag }}
{{- end -}}

{{/* 공통 라벨 */}}
{{- define "parkgolf.labels" -}}
app.kubernetes.io/name: {{ .name }}
app.kubernetes.io/managed-by: argocd
{{- end -}}
