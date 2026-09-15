{{- define "catalog-eshop.name" -}}
catalog-eshop
{{- end -}}

{{- define "catalog-eshop.labels" -}}
app.kubernetes.io/name: {{ include "catalog-eshop.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
{{- end -}}

{{- define "catalog-eshop.selectorLabels" -}}
app.kubernetes.io/name: {{ include "catalog-eshop.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}
