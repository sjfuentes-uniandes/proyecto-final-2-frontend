package com.solventa.feature.privacidad.datos

import com.solventa.core.network.ConsentimientosCliente
import com.solventa.core.network.ErrorConsentimiento
import com.solventa.core.network.ResultadoConsentimiento
import com.solventa.core.network.modelo.ConsentimientoDto
import com.solventa.core.network.modelo.SolicitudOtorgarDto
import com.solventa.core.network.modelo.TextoVigenteDto
import com.solventa.feature.privacidad.dominio.Consentimiento
import com.solventa.feature.privacidad.dominio.EstadoConsentimiento
import com.solventa.feature.privacidad.dominio.FalloConsentimiento
import com.solventa.feature.privacidad.dominio.Otorgamiento
import com.solventa.feature.privacidad.dominio.PROPOSITO_PERFILAMIENTO
import com.solventa.feature.privacidad.dominio.RepositorioConsentimientos
import com.solventa.feature.privacidad.dominio.Resultado
import com.solventa.feature.privacidad.dominio.SolicitudOtorgamiento
import com.solventa.feature.privacidad.dominio.TextoVigente
import java.time.Instant
import java.time.OffsetDateTime
import java.time.format.DateTimeParseException

/** [RepositorioConsentimientos] sobre bff-movil. Traduce el contrato al dominio y nunca reintenta. */
class RepositorioConsentimientosRed(private val cliente: ConsentimientosCliente) : RepositorioConsentimientos {

    override suspend fun listar(): Resultado<List<Consentimiento>> =
        traducir(cliente.listar()) { lista -> lista.map(::aDominio) }

    override suspend fun detalle(id: String): Resultado<Consentimiento> =
        traducir(cliente.detalle(id), ::aDominio)

    override suspend fun textoVigente(proposito: String, idioma: String): Resultado<TextoVigente> =
        traducir(cliente.textoVigente(proposito, idioma), ::aDominio)

    override suspend fun otorgar(solicitud: SolicitudOtorgamiento, clave: String): Resultado<Otorgamiento> {
        val cuerpo = SolicitudOtorgarDto(
            proposito = PROPOSITO_PERFILAMIENTO,
            // Orden estable: el mismo intento envía siempre el mismo cuerpo con la misma clave.
            alcances = solicitud.alcances.sortedBy { it.ordinal }.map { it.name },
            vigenciaMeses = solicitud.vigenciaMeses,
            versionTexto = solicitud.versionTexto,
            idioma = solicitud.idioma,
        )
        return when (val resultado = cliente.otorgar(clave, cuerpo)) {
            is ResultadoConsentimiento.Exito ->
                convertir { Otorgamiento(aDominio(resultado.valor), resultado.repeticion) }
            is ResultadoConsentimiento.Fallo -> Resultado.Fallo(aFallo(resultado.error))
        }
    }

    private fun <D, T> traducir(resultado: ResultadoConsentimiento<D>, mapear: (D) -> T): Resultado<T> =
        when (resultado) {
            is ResultadoConsentimiento.Exito -> convertir { mapear(resultado.valor) }
            is ResultadoConsentimiento.Fallo -> Resultado.Fallo(aFallo(resultado.error))
        }

    /** Una fecha ilegible viola el contrato: es una respuesta inválida, no un dato a adivinar. */
    private fun <T> convertir(bloque: () -> T): Resultado<T> = try {
        Resultado.Exito(bloque())
    } catch (e: DateTimeParseException) {
        Resultado.Fallo(FalloConsentimiento.RespuestaInvalida)
    }

    private fun aDominio(dto: ConsentimientoDto) = Consentimiento(
        id = dto.consentimientoId,
        estado = EstadoConsentimiento.entries.firstOrNull { it.name == dto.estado } ?: EstadoConsentimiento.DESCONOCIDO,
        proposito = dto.proposito,
        alcances = dto.alcances,
        versionTexto = dto.versionTexto,
        idioma = dto.idioma,
        otorgadoEn = instante(dto.otorgadoEn),
        vigenteHasta = instante(dto.vigenteHasta),
        revocadoEn = dto.revocadoEn?.let(::instante),
    )

    private fun aDominio(dto: TextoVigenteDto) = TextoVigente(
        proposito = dto.proposito,
        idioma = dto.idioma,
        versionTexto = dto.versionTexto,
        titulo = dto.titulo,
        cuerpo = dto.cuerpo,
        aviso = dto.aviso,
        vigenciasMeses = dto.vigenciasMeses,
        vigenciaDefectoMeses = dto.vigenciaDefectoMeses,
    )

    /** Acepta `Z` y `+00:00`; el resultado es siempre un instante UTC. */
    private fun instante(texto: String): Instant = OffsetDateTime.parse(texto).toInstant()

    private fun aFallo(error: ErrorConsentimiento): FalloConsentimiento = when (error) {
        ErrorConsentimiento.SinConexion -> FalloConsentimiento.SinConexion
        ErrorConsentimiento.ServicioNoDisponible -> FalloConsentimiento.ServicioNoDisponible
        is ErrorConsentimiento.Desconocido -> FalloConsentimiento.RespuestaInvalida
        ErrorConsentimiento.NoAutenticado -> FalloConsentimiento.SesionVencida
        ErrorConsentimiento.RolNoAutorizado -> FalloConsentimiento.NoAutorizado
        ErrorConsentimiento.IdentidadNoVerificada -> FalloConsentimiento.IdentidadNoVerificada
        ErrorConsentimiento.ClienteNoEncontrado -> FalloConsentimiento.ClienteNoEncontrado
        ErrorConsentimiento.ConsentimientoNoEncontrado -> FalloConsentimiento.NoEncontrado
        is ErrorConsentimiento.ConsentimientoYaVigente -> FalloConsentimiento.YaVigente(error.consentimientoId)
        is ErrorConsentimiento.SolicitudInvalida -> FalloConsentimiento.SolicitudInvalida(error.campos)
        ErrorConsentimiento.VigenciaInvalida -> FalloConsentimiento.VigenciaInvalida
        ErrorConsentimiento.TextoNoVigente -> FalloConsentimiento.TextoNoVigente
        ErrorConsentimiento.IdempotenciaConflicto -> FalloConsentimiento.IdempotenciaConflicto
    }
}
