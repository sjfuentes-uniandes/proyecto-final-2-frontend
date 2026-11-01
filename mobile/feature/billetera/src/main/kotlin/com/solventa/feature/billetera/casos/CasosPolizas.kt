package com.solventa.feature.billetera.casos

import com.solventa.feature.billetera.dominio.PolizaDetalle
import com.solventa.feature.billetera.dominio.PolizaResumen
import com.solventa.feature.billetera.dominio.RepositorioPolizas
import com.solventa.feature.billetera.dominio.Resultado

/** Pólizas del cliente autenticado, incluidas las vencidas (AC1). */
class ListarPolizas(private val repositorio: RepositorioPolizas) {
    suspend operator fun invoke(): Resultado<List<PolizaResumen>> = repositorio.listar()
}

/** Detalle de una póliza (AC2). Una ajena responde como no autorizada (AC3). */
class ConsultarPoliza(private val repositorio: RepositorioPolizas) {
    suspend operator fun invoke(polizaId: String): Resultado<PolizaDetalle> = repositorio.detalle(polizaId)
}
