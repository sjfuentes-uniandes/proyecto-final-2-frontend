package com.solventa.feature.siniestros.datos

import com.solventa.core.network.ErrorSiniestros
import com.solventa.core.network.ResultadoSiniestros as ResultadoRed
import com.solventa.core.network.SiniestrosCliente
import com.solventa.core.network.modelo.BorradorDetalleDto
import com.solventa.core.network.modelo.BorradorResumenDto
import com.solventa.core.network.modelo.CargaDto
import com.solventa.core.network.modelo.EvidenciaBorradorDto
import com.solventa.core.network.modelo.EvidenciaDto
import com.solventa.core.network.modelo.LimitesSiniestrosDto
import com.solventa.core.network.modelo.SolicitudBorradorDto
import com.solventa.core.network.modelo.SolicitudFotoEvidenciaDto
import com.solventa.core.network.modelo.SolicitudVideoEvidenciaDto
import com.solventa.feature.siniestros.dominio.Borrador
import com.solventa.feature.siniestros.dominio.BorradorDetalle
import com.solventa.feature.siniestros.dominio.BorradorResumen
import com.solventa.feature.siniestros.dominio.EstadoCarga
import com.solventa.feature.siniestros.dominio.Evidencia
import com.solventa.feature.siniestros.dominio.EvidenciaTemporal
import com.solventa.feature.siniestros.dominio.FalloSiniestros
import com.solventa.feature.siniestros.dominio.LimitesSiniestros
import com.solventa.feature.siniestros.dominio.RepositorioSiniestros
import com.solventa.feature.siniestros.dominio.Resultado
import com.solventa.feature.siniestros.dominio.TipoEvidencia

class RepositorioSiniestrosRed(
    private val cliente: SiniestrosCliente,
    private val cargaS3: CargaS3,
) : RepositorioSiniestros {
    private val calcularMetadata = CalcularMetadataEvidencia()

    override suspend fun limites(): Resultado<LimitesSiniestros> =
        cliente.limites().mapear { it.aDominio() }

    override suspend fun listar(): Resultado<List<BorradorResumen>> =
        cliente.listar().mapear { lista -> lista.items.map { it.aDominio() } }

    override suspend fun detalle(borradorId: String): Resultado<BorradorDetalle> =
        cliente.detalle(borradorId).mapear { it.aDominio() }

    override suspend fun crearBorrador(
        polizaId: String,
        descripcion: String,
        claveIdempotencia: String,
    ): Resultado<Borrador> =
        cliente.crearBorrador(
            claveIdempotencia,
            SolicitudBorradorDto(polizaId, descripcion),
        ).mapear { Borrador(it.borradorId, it.polizaId, it.estado) }

    override suspend fun agregarEvidencia(
        borradorId: String,
        evidencia: EvidenciaTemporal,
        limites: LimitesSiniestros,
    ): Resultado<Evidencia> {
        val metadata = when (val resultado = calcularMetadata(evidencia, limites)) {
            is Resultado.Exito -> resultado.valor
            is Resultado.Fallo -> return resultado
        }

        return when (val detalle = cliente.detalle(borradorId)) {
            is ResultadoRed.Fallo -> Resultado.Fallo(detalle.error.aDominio())
            is ResultadoRed.Exito -> {
                if (detalle.valor.evidencias.size >= limites.maxEvidencias &&
                    detalle.valor.evidencias.none { it.sha256 == metadata.sha256 }
                ) {
                    return Resultado.Fallo(FalloSiniestros.LimiteEvidenciasAlcanzado)
                }
                val existente = detalle.valor.evidencias.firstOrNull {
                    it.sha256 == metadata.sha256 &&
                        it.nombreArchivo == metadata.nombreArchivo &&
                        it.tamanoBytes == metadata.tamanoBytes
                }
                if (existente?.estadoCarga == ESTADO_CARGADA) {
                    return Resultado.Exito(existente.aDominio())
                }
                val registro = if (existente != null) {
                    cliente.renovar(borradorId, existente.evidenciaId).mapear { renovada ->
                        CargaPendiente(
                            existente.evidenciaId,
                            existente.nombreArchivo,
                            existente.tipo,
                            existente.tipoContenido,
                            existente.tamanoBytes,
                            existente.capturadaEn,
                            existente.duracionSegundos,
                            existente.sha256,
                            renovada.carga,
                        )
                    }
                } else {
                    registrar(borradorId, metadata)
                }
                when (registro) {
                    is Resultado.Fallo -> registro
                    is Resultado.Exito -> cargarYConfirmar(borradorId, evidencia, registro.valor)
                }
            }
        }
    }

    private suspend fun registrar(borradorId: String, metadata: MetadataEvidencia): Resultado<CargaPendiente> {
        val respuesta = when (metadata.tipo) {
            TipoEvidencia.FOTOGRAFIA -> cliente.agregarFoto(
                borradorId,
                SolicitudFotoEvidenciaDto(
                    metadata.nombreArchivo,
                    tipoContenido = metadata.tipoContenido,
                    tamanoBytes = metadata.tamanoBytes,
                    sha256 = metadata.sha256,
                    capturadaEn = metadata.capturadaEn,
                ),
            )
            TipoEvidencia.VIDEO -> {
                val duracion = metadata.duracionSegundos
                    ?: return Resultado.Fallo(FalloSiniestros.EvidenciaNoAdmitida)
                cliente.agregarVideo(
                    borradorId,
                    SolicitudVideoEvidenciaDto(
                        metadata.nombreArchivo,
                        tipoContenido = metadata.tipoContenido,
                        tamanoBytes = metadata.tamanoBytes,
                        sha256 = metadata.sha256,
                        capturadaEn = metadata.capturadaEn,
                        duracionSegundos = duracion,
                    ),
                )
            }
            TipoEvidencia.DESCONOCIDO -> return Resultado.Fallo(FalloSiniestros.EvidenciaNoAdmitida)
        }
        return respuesta.mapear {
            CargaPendiente(
                id = it.evidenciaId,
                nombreArchivo = it.nombreArchivo,
                tipo = it.tipo,
                tipoContenido = it.tipoContenido,
                tamanoBytes = it.tamanoBytes,
                capturadaEn = it.capturadaEn,
                duracionSegundos = it.duracionSegundos,
                sha256 = it.sha256,
                carga = it.carga,
            )
        }
    }

    private suspend fun cargarYConfirmar(
        borradorId: String,
        temporal: EvidenciaTemporal,
        pendiente: CargaPendiente,
    ): Resultado<Evidencia> {
        var carga = pendiente.carga
        when (cargaS3.subir(temporal.archivo, pendiente.tipoContenido, carga)) {
            ResultadoCargaS3.Exito -> Unit
            ResultadoCargaS3.Fallo -> return Resultado.Fallo(FalloSiniestros.CargaS3Fallida)
            ResultadoCargaS3.FirmaExpirada -> {
                when (val renovacion = cliente.renovar(borradorId, pendiente.id)) {
                    is ResultadoRed.Fallo -> return Resultado.Fallo(renovacion.error.aDominio())
                    is ResultadoRed.Exito -> carga = renovacion.valor.carga
                }
                if (cargaS3.subir(temporal.archivo, pendiente.tipoContenido, carga) != ResultadoCargaS3.Exito) {
                    return Resultado.Fallo(FalloSiniestros.CargaS3Fallida)
                }
            }
        }
        return cliente.confirmar(borradorId, pendiente.id).mapear {
            Evidencia(
                id = it.evidenciaId,
                nombreArchivo = pendiente.nombreArchivo,
                tipo = TipoEvidencia.entries.firstOrNull { tipo -> tipo.name == pendiente.tipo }
                    ?: TipoEvidencia.DESCONOCIDO,
                tipoContenido = pendiente.tipoContenido,
                tamanoBytes = pendiente.tamanoBytes,
                estadoCarga = EstadoCarga.CARGADA,
                capturadaEn = pendiente.capturadaEn,
                duracionSegundos = pendiente.duracionSegundos,
            )
        }
    }

    private data class CargaPendiente(
        val id: String,
        val nombreArchivo: String,
        val tipo: String,
        val tipoContenido: String,
        val tamanoBytes: Long,
        val capturadaEn: String?,
        val duracionSegundos: Int?,
        val sha256: String,
        val carga: CargaDto,
    )

    private companion object {
        const val ESTADO_CARGADA = "CARGADA"
    }
}

private fun BorradorResumenDto.aDominio() = BorradorResumen(
    id = borradorId,
    polizaId = polizaId,
    descripcion = descripcion,
    estado = estado,
    creadoEn = creadoEn,
    cantidadEvidencias = cantidadEvidencias,
    evidenciasPendientes = evidenciasPendientes,
)

private fun BorradorDetalleDto.aDominio() = BorradorDetalle(
    id = borradorId,
    polizaId = polizaId,
    descripcion = descripcion,
    estado = estado,
    creadoEn = creadoEn,
    cantidadEvidencias = cantidadEvidencias,
    evidenciasPendientes = evidenciasPendientes,
    evidencias = evidencias.map { it.aDominio() },
)

private fun EvidenciaBorradorDto.aDominio() = Evidencia(
    id = evidenciaId,
    nombreArchivo = nombreArchivo,
    tipo = TipoEvidencia.entries.firstOrNull { it.name == tipo } ?: TipoEvidencia.DESCONOCIDO,
    tipoContenido = tipoContenido,
    tamanoBytes = tamanoBytes,
    estadoCarga = EstadoCarga.entries.firstOrNull { it.name == estadoCarga } ?: EstadoCarga.DESCONOCIDO,
    capturadaEn = capturadaEn,
    duracionSegundos = duracionSegundos,
)

private fun LimitesSiniestrosDto.aDominio() = LimitesSiniestros(
    maxEvidencias = maxEvidencias,
    formatosFoto = formatosFoto,
    formatosVideo = formatosVideo,
    tamanoMaximoFotoBytes = tamanoMaximoFotoBytes,
    tamanoMaximoVideoBytes = tamanoMaximoVideoBytes,
    duracionMaximaVideoSegundos = duracionMaximaVideoSegundos,
    urlCargaExpiraSegundos = urlCargaExpiraSegundos,
)

private fun ErrorSiniestros.aDominio(): FalloSiniestros = when (this) {
    ErrorSiniestros.SinConexion -> FalloSiniestros.SinConexion
    ErrorSiniestros.NoAutenticado, ErrorSiniestros.ClienteNoEncontrado -> FalloSiniestros.SesionVencida
    ErrorSiniestros.RolNoAutorizado -> FalloSiniestros.NoAutorizado
    ErrorSiniestros.PolizaNoAutorizada -> FalloSiniestros.PolizaNoAutorizada
    ErrorSiniestros.PolizaNoEncontrada -> FalloSiniestros.PolizaNoEncontrada
    ErrorSiniestros.BorradorNoEncontrado -> FalloSiniestros.BorradorNoEncontrado
    ErrorSiniestros.PolizaNoVigente -> FalloSiniestros.PolizaNoVigente
    ErrorSiniestros.SolicitudInvalida -> FalloSiniestros.SolicitudInvalida
    ErrorSiniestros.IdempotenciaConflicto -> FalloSiniestros.IdempotenciaConflicto
    ErrorSiniestros.TipoEvidenciaNoAdmitido -> FalloSiniestros.TipoEvidenciaNoAdmitido
    ErrorSiniestros.TamanoEvidenciaExcedido -> FalloSiniestros.TamanoEvidenciaExcedido
    ErrorSiniestros.DuracionVideoExcedida -> FalloSiniestros.DuracionVideoExcedida
    ErrorSiniestros.LimiteEvidenciasAlcanzado -> FalloSiniestros.LimiteEvidenciasAlcanzado
    ErrorSiniestros.EvidenciaNoCargada -> FalloSiniestros.CargaS3Fallida
    ErrorSiniestros.EvidenciaYaConfirmada -> FalloSiniestros.RespuestaInvalida
    ErrorSiniestros.IntegridadEvidenciaInvalida -> FalloSiniestros.IntegridadEvidenciaInvalida
    ErrorSiniestros.ServicioNoDisponible -> FalloSiniestros.ServicioNoDisponible
    is ErrorSiniestros.Desconocido -> FalloSiniestros.RespuestaInvalida
}

private inline fun <A, B> ResultadoRed<A>.mapear(mapear: (A) -> B): Resultado<B> = when (this) {
    is ResultadoRed.Exito -> Resultado.Exito(mapear(valor))
    is ResultadoRed.Fallo -> Resultado.Fallo(error.aDominio())
}
