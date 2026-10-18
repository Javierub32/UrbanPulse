Table User {
  id uuid [pk]
  nombre varchar
  email varchar
  rol UserRole
  activo boolean
  fechaCreacion timestamp
}

Table Incident {
  id uuid [pk]
  usuarioId uuid [not null]
  titulo varchar
  descripcion text
  categoria IncidentCategory
  ubicacion geometry
  direccionNormalizada varchar
  barrio varchar
  distrito varchar
  prioridad Priority
  estado IncidentStatus
  fechaRegistro timestamp
  fechaActualizacion timestamp
}

Table Attachment {
  id uuid [pk]
  incidentId uuid [not null]
  tipo AttachmentType
  url varchar
  nombre varchar
  tamano bigint
  metadata json
  fechaCreacion timestamp
}

Table UrbanAsset {
  id uuid [pk]
  tipo AssetType
  codigo varchar
  nombre varchar
  fuente varchar
  ubicacion geometry
  metadatos json
}

Table IncidentAssetAssociation {
  id uuid [pk]
  incidentId uuid [not null]
  urbanAssetId uuid [not null]
  distancia decimal
  confianza decimal
  tipoAsociacion AssociationType
}

Table UrbanContext {
  id uuid [pk]
  incidentId uuid [not null]
  tipo ContextType
  clave varchar
  valor varchar
  unidad varchar
  geometria geometry
  fechaObservacion timestamp
  fechaIngesta timestamp
  fuente varchar
  estado varchar [note: 'DataStatus']
  metadatos json
}

Table StatusChange {
  id uuid [pk]
  incidentId uuid [not null]
  assignmentId uuid [not null]
  usuarioId uuid [not null]
  estado IncidentStatus
  fecha timestamp
  motivo varchar
  comentario text
}

Table Assignment {
  id uuid [pk]
  incidentId uuid [not null]
  departamento varchar
  equipo varchar
  tecnicoId uuid [not null]
  estado AssignmentStatus
  fechaAsignacion timestamp
  fechaInicio timestamp
  fechaFin timestamp
}

Table Notification {
  id uuid [pk]
  incidentId uuid [not null]
  usuarioId uuid [not null]
  tipo NotificationType
  canal varchar
  mensaje text
  estado varchar [note: 'DeliveryStatus']
  fechaCreacion timestamp
  fechaEnvio timestamp
  fechaEntrega timestamp
}

Table KnowledgeDocument {
  id uuid [pk]
  titulo varchar
  tipo varchar [note: 'DocumentType']
  version varchar
  contenido text
  url varchar
  fuente varchar
  fechaCreacion timestamp
  metadata json
}

Table IncidentKnowledgeDocument {
  incidentId uuid [not null]
  knowledgeDocumentId uuid [not null]

  indexes {
    (incidentId, knowledgeDocumentId) [pk]
  }
}

Table ExternalObservation {
  id uuid [pk]
  urbanContextId uuid [not null]
  fuente varchar
  tipo varchar
  valor varchar
  unidad varchar
  geometria geometry
  fechaObservacion timestamp
  fechaIngesta timestamp
  calidad varchar [note: 'DataQuality']
  metadatos json
}


// Relaciones principales

Ref: User.id < Incident.usuarioId
Ref: User.id < StatusChange.usuarioId
Ref: User.id < Notification.usuarioId
Ref: User.id < Assignment.tecnicoId

Ref: Incident.id < Attachment.incidentId
Ref: Incident.id < StatusChange.incidentId
Ref: Incident.id < Assignment.incidentId
Ref: Incident.id < Notification.incidentId
Ref: Incident.id < UrbanContext.incidentId

Ref: Assignment.id < StatusChange.assignmentId

Ref: Incident.id < IncidentAssetAssociation.incidentId
Ref: UrbanAsset.id < IncidentAssetAssociation.urbanAssetId

Ref: Incident.id < IncidentKnowledgeDocument.incidentId
Ref: KnowledgeDocument.id < IncidentKnowledgeDocument.knowledgeDocumentId

Ref: UrbanContext.id < ExternalObservation.urbanContextId


// Enumeraciones

Enum IncidentStatus {
  REPORTED
  VALIDATED
  REJECTED
  ASSIGNED
  IN_PROGRESS
  RESOLVED
  REOPENED
  CLOSED
}

Enum IncidentCategory {
  VIA_PUBLICA
  ALUMBRADO
  TRAFICO
  ZONAS_VERDES
  LIMPIEZA
  RESIDUOS
  MOBILIARIO_URBANO
  OTRA
}

Enum Priority {
  BAJA
  MEDIA
  ALTA
  CRITICA
}

Enum UserRole {
  CIUDADANO
  OPERADOR
  TECNICO
  ADMINISTRADOR
  ANALISTA
}

Enum AssetType {
  SEMAFORO
  CONTENEDOR
  FUENTE
  PARADA
  APARCAMIENTO
  ZONA_VERDE
  OTRO
}

Enum ContextType {
  CLIMA
  TRAFICO
  MOVILIDAD
  EVENTO
  AMBIENTE
  DEMOGRAFIA
  ENTORNO_ESPACIAL
  OTRO
}

Enum AttachmentType {
  FOTOGRAFIA
  VIDEO
  DOCUMENTO
  OTRO
}

Enum NotificationType {
  ESTADO_CAMBIADO
  ASIGNACION
  COMENTARIO
  RESOLUCION
  REAPERTURA
  OTRO
}

Enum AssociationType {
  EXPLICITA
  PROXIMIDAD
  OPERADOR
}

Enum AssignmentStatus {
  PENDING
  ACCEPTED
  IN_PROGRESS
  COMPLETED
  REJECTED
  CANCELLED
}