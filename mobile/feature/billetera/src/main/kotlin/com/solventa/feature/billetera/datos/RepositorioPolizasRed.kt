package com.solventa.feature.billetera.datos

import com.solventa.core.network.BffMovilCliente
import com.solventa.core.network.ResultadoPoliza
import com.solventa.core.network.ResultadoPolizas
import com.solventa.core.network.modelo.CoberturaDto
import com.solventa.core.network.modelo.CredencialDto
import com.solventa.core.network.modelo.PolizaDetalleDto
import com.solventa.core.network.modelo.PolizaResumenDto
import com.solventa.core.network.modelo.ResumenCoberturaDto
import com.solventa.core.network.modelo.VigenciaDto
import com.solventa.feature.billetera.dominio.Cobertura
import com.solventa.feature.billetera.dominio.Credencial
import com.solventa.feature.billetera.dominio.FalloPolizas
import com.solventa.feature.billetera.dominio.PolizaDetalle
import com.solventa.feature.billetera.dominio.PolizaResumen
import com.solventa.feature.billetera.dominio.RepositorioPolizas
import com.solventa.feature.billetera.dominio.Resultado
import com.solventa.feature.billetera.dominio.ResumenCobertura
import com.solventa.feature.billetera.dominio.Vigencia
import java.math.BigDecimal
import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.format.DateTimeParseException

/** [RepositorioPolizas] sobre bff-movil. Nunca reintenta ni registra datos de la póliza. */
class RepositorioPolizasRed(private val cliente: BffMovilCliente) : RepositorioPolizas {

    override suspend fun listar(): Resultado<List<PolizaResumen>> = when (val r = cliente.consultarPolizas()) {
        is ResultadoPolizas.Exito -> convertir { r.polizas.map { it.aDominio() } }
        is ResultadoPolizas.NoAutenticado, is ResultadoPolizas.ClienteNoEncontrado -> fallo(FalloPolizas.SesionInvalida)
        ResultadoPolizas.PolizaNoAutorizada -> fallo(FalloPolizas.NoAutorizada)
        is ResultadoPolizas.PolizaNoEncontrada -> fallo(FalloPolizas.NoEncontrada)
        is ResultadoPolizas.ServicioNoDisponible -> fallo(FalloPolizas.ServicioNoDisponible)
        is ResultadoPolizas.SinConexion -> fallo(FalloPolizas.SinConexion)
        is ResultadoPolizas.SolicitudInvalida, is ResultadoPolizas.ErrorDesconocido -> fallo(FalloPolizas.ErrorGenerico)
    }

    override suspend fun detalle(polizaId: String): Resultado<PolizaDetalle> =
        when (val r = cliente.consultarPoliza(polizaId)) {
            is ResultadoPoliza.Exito -> convertir { r.poliza.aDominio() }
            is ResultadoPoliza.NoAutenticado, is ResultadoPoliza.ClienteNoEncontrado -> fallo(FalloPolizas.SesionInvalida)
            ResultadoPoliza.PolizaNoAutorizada -> fallo(FalloPolizas.NoAutorizada)
            is ResultadoPoliza.PolizaNoEncontrada -> fallo(FalloPolizas.NoEncontrada)
            is ResultadoPoliza.ServicioNoDisponible -> fallo(FalloPolizas.ServicioNoDisponible)
            is ResultadoPoliza.SinConexion -> fallo(FalloPolizas.SinConexion)
            is ResultadoPoliza.SolicitudInvalida, is ResultadoPoliza.ErrorDesconocido -> fallo(FalloPolizas.ErrorGenerico)
        }

    private fun fallo(fallo: FalloPolizas): Resultado<Nothing> = Resultado.Fallo(fallo)

    /** Un monto o una fecha ilegibles violan el contrato: respuesta inválida, no un dato a adivinar. */
    private fun <T> convertir(bloque: () -> T): Resultado<T> = try {
        Resultado.Exito(bloque())
    } catch (e: DateTimeParseException) {
        Resultado.Fallo(FalloPolizas.ErrorGenerico)
    } catch (e: NumberFormatException) {
        Resultado.Fallo(FalloPolizas.ErrorGenerico)
    }
}

internal fun PolizaResumenDto.aDominio() = PolizaResumen(
    polizaId = polizaId,
    numero = numero,
    estado = estado,
    producto = producto,
    ramo = ramo,
    vigencia = vigencia.aDominio(),
    vigente = vigente,
    resumenCobertura = resumenCobertura.aDominio(),
)

internal fun PolizaDetalleDto.aDominio() = PolizaDetalle(
    numero = numero,
    estado = estado,
    producto = producto,
    ramo = ramo,
    vigencia = vigencia.aDominio(),
    vigente = vigente,
    prima = BigDecimal(prima),
    sumaAsegurada = BigDecimal(sumaAsegurada),
    moneda = moneda,
    periodicidad = periodicidad,
    emitidaEn = OffsetDateTime.parse(emitidaEn),
    coberturas = coberturas.map { it.aDominio() },
    credencial = credencial.aDominio(),
)

private fun VigenciaDto.aDominio() = Vigencia(LocalDate.parse(desde), LocalDate.parse(hasta))

private fun ResumenCoberturaDto.aDominio() = ResumenCobertura(BigDecimal(sumaAsegurada), moneda, totalCoberturas)

private fun CoberturaDto.aDominio() = Cobertura(codigo, nombre, obligatoria)

private fun CredencialDto.aDominio() = Credencial(numero, huella, firmaId, vigencia.aDominio())
