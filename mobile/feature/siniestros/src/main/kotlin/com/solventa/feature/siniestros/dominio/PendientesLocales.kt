package com.solventa.feature.siniestros.dominio

data class PendienteLocal(
    val id: String,
    val polizaId: String,
    val descripcion: String,
    val causa: String?,
    val fechaEvento: String,
    val borradorId: String?,
    val claveCreacion: String,
    val evidencias: List<EvidenciaTemporal>,
    val ubicacion: UbicacionReporte?,
    val ubicacionPendiente: UbicacionCapturada?,
) {
    override fun toString() = "PendienteLocal(id=$id)"
}

data class ResumenPendienteLocal(
    val id: String,
    val descripcion: String,
    val cantidadEvidencias: Int,
    val borradorId: String?,
) {
    override fun toString() = "ResumenPendienteLocal(id=$id)"
}

interface AlmacenPendientes {
    suspend fun guardar(pendiente: PendienteLocal): Resultado<Unit>
    suspend fun listar(): Resultado<List<ResumenPendienteLocal>>
    suspend fun abrir(id: String): Resultado<PendienteLocal>
    suspend fun eliminar(id: String): Resultado<Unit>
}
