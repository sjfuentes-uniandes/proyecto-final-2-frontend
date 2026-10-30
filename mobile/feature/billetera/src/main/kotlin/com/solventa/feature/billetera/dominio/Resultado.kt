package com.solventa.feature.billetera.dominio

sealed interface Resultado<out T> {
    data class Exito<T>(val valor: T) : Resultado<T>

    data class Fallo(val fallo: FalloPolizas) : Resultado<Nothing>
}

/** Por qué no se pudo consultar. Sin mensajes del servidor ni datos de pólizas: la UI elige el texto. */
sealed interface FalloPolizas {
    /** Sin red o servicio caído: se puede reintentar. */
    data object SinConexion : FalloPolizas

    data object ServicioNoDisponible : FalloPolizas

    /** 401, 403 ROL_NO_AUTORIZADO o 404 CLIENTE_NO_ENCONTRADO: hay que cerrar la sesión. */
    data object SesionInvalida : FalloPolizas

    /** 403 POLIZA_NO_AUTORIZADA (AC3). */
    data object NoAutorizada : FalloPolizas

    data object NoEncontrada : FalloPolizas

    /** 422, respuesta fuera del contrato o valores que no se pueden convertir. */
    data object ErrorGenerico : FalloPolizas
}

interface RepositorioPolizas {
    suspend fun listar(): Resultado<List<PolizaResumen>>

    suspend fun detalle(polizaId: String): Resultado<PolizaDetalle>
}
