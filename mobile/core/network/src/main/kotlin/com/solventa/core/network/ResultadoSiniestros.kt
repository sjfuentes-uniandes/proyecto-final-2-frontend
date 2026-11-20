package com.solventa.core.network

sealed interface ResultadoSiniestros<out T> {
    data class Exito<T>(val valor: T) : ResultadoSiniestros<T>

    data class Fallo(val error: ErrorSiniestros) : ResultadoSiniestros<Nothing>
}

sealed interface ErrorSiniestros {
    data object SinConexion : ErrorSiniestros
    data object NoAutenticado : ErrorSiniestros
    data object RolNoAutorizado : ErrorSiniestros
    data object PolizaNoAutorizada : ErrorSiniestros
    data object ClienteNoEncontrado : ErrorSiniestros
    data object PolizaNoEncontrada : ErrorSiniestros
    data object BorradorNoEncontrado : ErrorSiniestros
    data object BorradorModificado : ErrorSiniestros
    data object BorradorConvertido : ErrorSiniestros
    data object SiniestroNoEncontrado : ErrorSiniestros
    data object EvidenciaNoDisponible : ErrorSiniestros
    data object PolizaNoVigente : ErrorSiniestros
    data object SolicitudInvalida : ErrorSiniestros
    data object UbicacionInvalida : ErrorSiniestros
    data object IdempotenciaConflicto : ErrorSiniestros
    data object TipoEvidenciaNoAdmitido : ErrorSiniestros
    data object TamanoEvidenciaExcedido : ErrorSiniestros
    data object DuracionVideoExcedida : ErrorSiniestros
    data object LimiteEvidenciasAlcanzado : ErrorSiniestros
    data object EvidenciaNoCargada : ErrorSiniestros
    data object EvidenciaYaConfirmada : ErrorSiniestros
    data object IntegridadEvidenciaInvalida : ErrorSiniestros
    data object ServicioNoDisponible : ErrorSiniestros
    data class Desconocido(val estadoHttp: Int?) : ErrorSiniestros
}
